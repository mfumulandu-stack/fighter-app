// Geschaeftslogik des Stripe-Webhooks (ohne Deno-Besonderheiten).
//
// WARUM ausgelagert: index.ts kann nur auf dem Server laufen und war damit
// nicht testbar. Hier liegt alles, was entscheidet "ist jemand wirklich
// bezahlt, und was passiert danach" - mit einem austauschbaren fetch, damit
// Jest jeden Fall (bezahlt, nicht bezahlt, doppelt, Freund-Rabatt, ...)
// durchspielen kann. index.ts prueft nur noch die Signatur und ruft
// handleStripeEvent() auf.

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Signatur ──────────────────────────────────────────────────────────────

// Stripe schickt im Header "t=<zeit>,v1=<signatur>[,v1=<signatur2>]".
// Waehrend einer Schluessel-Rotation stehen ZWEI v1-Signaturen darin - frueher
// wurde nur die letzte beachtet. Ausserdem: Zeitfenster (Schutz gegen
// erneutes Abspielen alter Anfragen) und Vergleich ohne Abkuerzung.
export async function verifyStripeSignature(payload, sigHeader, secret, opts = {}) {
  const subtle = opts.subtle || globalThis.crypto.subtle;
  const nowSec = Math.floor((opts.now ? opts.now() : Date.now()) / 1000);
  const tolerance = opts.toleranceSec == null ? 300 : opts.toleranceSec;
  if (!payload || !sigHeader || !secret) return false;

  let timestamp = null;
  const signatures = [];
  for (const part of String(sigHeader).split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") timestamp = v;
    if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (tolerance > 0 && Math.abs(nowSec - ts) > tolerance) return false;

  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expectedHex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((s) => timingSafeEqual(s, expectedHex));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────

// Stripe meldet "Zahlung eingegangen" ueber payment_status. Bei SEPA-Lastschrift
// & Co. ist der Checkout "completed", das Geld aber noch NICHT da
// (payment_status = "unpaid") - dann darf noch nichts als bezahlt gelten.
export function isPaidSession(session) {
  const s = session && session.payment_status;
  return s === "paid" || s === "no_payment_required";
}

function euro(n) {
  return Number(n || 0).toFixed(2).replace(".", ",") + " €";
}

function dateDe(iso) {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  } catch {
    return "";
  }
}

const ok = (body) => ({ status: 200, body: { received: true, ...(body || {}) } });
const fail = (error, detail) => ({ status: 500, body: { error, detail } });

// ── Hauptlogik ────────────────────────────────────────────────────────────
//
// deps: { supaUrl, serviceKey, fetchFn?, now?, log? }
// Rueckgabe: { status, body } - index.ts macht daraus die HTTP-Antwort.
// Status 500 bedeutet: Stripe soll es spaeter nochmal versuchen.
export async function handleStripeEvent(event, deps) {
  const supaUrl = deps.supaUrl;
  const serviceKey = deps.serviceKey;
  const fetchFn = deps.fetchFn || globalThis.fetch;
  const now = deps.now || (() => Date.now());
  const log = deps.log || console;

  const enc = encodeURIComponent;
  const headers = (extra) => ({
    "Content-Type": "application/json",
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(extra || {}),
  });
  const rest = (path, init) =>
    fetchFn(`${supaUrl}/rest/v1/${path}`, { ...(init || {}), headers: headers(init && init.headers) });
  const readJson = async (res) => {
    try {
      const j = await res.json();
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  };

  // Push an eine Profil-ID. Nie kritisch: scheitert der Push, bleibt die
  // Buchung trotzdem gueltig.
  async function notify(profileId, title, body, type) {
    if (!profileId) return;
    try {
      const pr = await rest(`profiles?id=eq.${enc(profileId)}&select=user_id`);
      if (!pr.ok) return;
      const rows = await readJson(pr);
      const userId = rows[0] && rows[0].user_id;
      if (!userId) return;
      await fetchFn(`${supaUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ recipientUserId: userId, title, body, data: { type } }),
      });
    } catch (e) {
      log.error("Push fehlgeschlagen (unkritisch):", String(e));
    }
  }

  async function existsBySession(table, sessionId) {
    try {
      const res = await rest(`${table}?stripe_session_id=eq.${enc(sessionId)}&select=id&limit=1`);
      if (!res.ok) return false;
      return (await readJson(res)).length > 0;
    } catch {
      return false;
    }
  }

  async function loadEvent(eventId) {
    try {
      const res = await rest(`events?id=eq.${enc(eventId)}&select=title,price,creator_id&limit=1`);
      if (!res.ok) return null;
      return (await readJson(res))[0] || null;
    } catch {
      return null;
    }
  }

  // ── Bezahlt: Anmeldung bzw. Mitgliedschaft eintragen ──
  async function fulfilMembership(session, meta, amountPaid) {
    if (await existsBySession("event_memberships", session.id)) {
      return ok({ duplicate: true });
    }
    const validUntil = new Date(now() + 30 * DAY_MS).toISOString();
    const ins = await rest("event_memberships", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: meta.profile_id,
        event_creator_id: meta.creator_id || null,
        valid_until: validUntil,
        amount_paid: amountPaid,
        stripe_session_id: session.id,
      }),
    });
    if (!ins.ok) {
      const detail = await ins.text();
      if (await existsBySession("event_memberships", session.id)) return ok({ duplicate: true });
      log.error("KRITISCH: Monatsbeitrag bezahlt, aber Mitgliedschaft NICHT eingetragen!", detail);
      return fail("Mitgliedschaft konnte nicht eingetragen werden", detail);
    }
    await notify(
      meta.profile_id,
      "📅 Mitgliedschaft aktiv",
      `Dein Monatsbeitrag ist angekommen – gültig bis ${dateDe(validUntil)}.`,
      "membership_paid",
    );
    return ok();
  }

  async function fulfilTicket(session, meta, amountPaid) {
    const eventId = meta.event_id;
    const profileId = meta.profile_id;
    const bafId = meta.baf_participant_id;
    const paidFields = { paid: true, stripe_session_id: session.id, amount_paid: amountPaid };
    let written = false;

    if (bafId) {
      // Freund-Rabatt: die wartende Zeile wird bezahlt gesetzt. Der Filter
      // paid=false sorgt dafuer, dass ein wiederholter Webhook nichts mehr
      // aendert (und keine zweite Nachricht ausloest).
      const patch = await rest(`event_participants?id=eq.${enc(bafId)}&paid=eq.false`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(paidFields),
      });
      if (patch.ok) {
        const rows = await readJson(patch);
        if (rows.length > 0) written = true;
        else if (await existsBySession("event_participants", session.id)) return ok({ duplicate: true });
        // 0 Zeilen und keine bekannte Sitzung: die wartende Zeile gibt es
        // nicht mehr (z.B. abgemeldet) - dann unten normal eintragen, damit
        // die Zahlung nicht verloren geht.
      } else {
        const detail = await patch.text();
        if (await existsBySession("event_participants", session.id)) return ok({ duplicate: true });
        log.error("KRITISCH: BAF-Zahlung erfolgt, aber Eintrag NICHT aktualisiert!", detail);
        return fail("BAF-Teilnehmer konnte nicht aktualisiert werden", detail);
      }
    }

    if (!written) {
      const insert = await rest("event_participants", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ event_id: eventId, user_id: profileId, ...paidFields }),
      });
      if (insert.ok) {
        written = true;
      } else {
        const detail = await insert.text();
        // Stripe hat denselben Webhook schon einmal erfolgreich zugestellt.
        if (await existsBySession("event_participants", session.id)) return ok({ duplicate: true });
        if (insert.status === 409) {
          // Es gibt schon eine Zeile dieser Person fuer dieses Event (z.B. ein
          // wartender Freund-Eintrag): diese bezahlt setzen statt die Zahlung
          // zu verlieren.
          const adopt = await rest(
            `event_participants?event_id=eq.${enc(eventId)}&user_id=eq.${enc(profileId)}&paid=eq.false`,
            { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(paidFields) },
          );
          const adopted = adopt.ok ? await readJson(adopt) : [];
          if (adopted.length > 0) {
            written = true;
          } else {
            // Die Person war bereits als bezahlt eingetragen: Doppelzahlung.
            // 200, damit Stripe nicht endlos wiederholt - aber laut melden.
            log.error(
              "DOPPELZAHLUNG: bitte in Stripe erstatten.",
              "stripe_session:", session.id, "event_id:", eventId, "profile_id:", profileId, "betrag:", amountPaid,
            );
            const ev = await loadEvent(eventId);
            if (ev && ev.creator_id) {
              await notify(
                ev.creator_id,
                "⚠️ Doppelzahlung",
                `${meta.user_name || "Jemand"} hat „${ev.title}“ zweimal bezahlt (${euro(amountPaid)}). Bitte in Stripe erstatten.`,
                "double_payment",
              );
            }
            return ok({ doublePayment: true });
          }
        } else {
          log.error(
            "KRITISCH: Zahlung erfolgt, aber Teilnehmer NICHT eingetragen!",
            "status:", insert.status, "event_id:", eventId, "profile_id:", profileId,
            "stripe_session:", session.id, "betrag:", amountPaid, "antwort:", detail,
          );
          return fail("Teilnehmer konnte nicht eingetragen werden", detail);
        }
      }
    }

    // "Freund mitbringen": Wer diese Person als Freund eingetragen hat, wird
    // jetzt freigeschaltet und per Push informiert - bisher erfuhr das niemand.
    const ev = await loadEvent(eventId);
    const title = (ev && ev.title) || "dein Training";
    let unlockedRows = [];
    try {
      const unlock = await rest(
        `event_participants?event_id=eq.${enc(eventId)}&brought_friend_id=eq.${enc(profileId)}&paid=eq.false` +
          `&or=(baf_unlocked.is.null,baf_unlocked.eq.false)`,
        { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ baf_unlocked: true }) },
      );
      if (unlock.ok) unlockedRows = await readJson(unlock);
      else log.error("Freund-Rabatt konnte nicht freigeschaltet werden:", await unlock.text());
    } catch (e) {
      log.error("Freund-Rabatt konnte nicht freigeschaltet werden:", String(e));
    }

    // Nachrichten - alle unkritisch.
    await notify(profileId, "🎟️ Du bist dabei!", `Deine Zahlung für „${title}“ ist angekommen.`, "ticket_paid");
    const discountPrice = ev && ev.price != null ? Math.max(0, Number(ev.price) - 10) : null;
    for (const row of unlockedRows) {
      await notify(
        row.user_id,
        "🤝 Dein Freund hat bezahlt",
        discountPrice == null
          ? `Du bekommst jetzt 10 € Rabatt auf „${title}“ – sichere dir dein Ticket.`
          : `Du bekommst 10 € Rabatt auf „${title}“ – jetzt für ${euro(discountPrice)} buchen.`,
        "friend_paid",
      );
    }
    if (ev && ev.creator_id && ev.creator_id !== profileId) {
      await notify(
        ev.creator_id,
        "💰 Neues Ticket",
        `${meta.user_name || "Jemand"} hat ${euro(amountPaid)} für „${title}“ bezahlt.`,
        "ticket_sold",
      );
    }
    return ok();
  }

  async function fulfil(session) {
    const meta = session.metadata || {};
    if (!meta.event_id || !meta.profile_id) {
      return ok({ ignored: "keine event_id/profile_id in den Metadaten" });
    }
    const amountPaid = (session.amount_total || 0) / 100;
    return meta.type === "membership"
      ? fulfilMembership(session, meta, amountPaid)
      : fulfilTicket(session, meta, amountPaid);
  }

  // ── Nicht bezahlt: abgelaufen oder fehlgeschlagen ──
  // Der Person eine Nachricht schicken, damit sie es nochmal versuchen kann -
  // ausser sie hat es inzwischen erfolgreich getan.
  async function alreadyCovered(meta) {
    try {
      if (meta.type === "membership") {
        const res = await rest(
          `event_memberships?user_id=eq.${enc(meta.profile_id)}&valid_until=gte.${enc(new Date(now()).toISOString())}&select=id&limit=1`,
        );
        return res.ok && (await readJson(res)).length > 0;
      }
      const paid = await rest(
        `event_participants?event_id=eq.${enc(meta.event_id)}&user_id=eq.${enc(meta.profile_id)}&paid=eq.true&select=id&limit=1`,
      );
      if (paid.ok && (await readJson(paid)).length > 0) return true;
      const ev = await loadEvent(meta.event_id);
      if (ev && ev.creator_id) {
        const mem = await rest(
          `event_memberships?user_id=eq.${enc(meta.profile_id)}&event_creator_id=eq.${enc(ev.creator_id)}&valid_until=gte.${enc(new Date(now()).toISOString())}&select=id&limit=1`,
        );
        if (mem.ok && (await readJson(mem)).length > 0) return true;
      }
    } catch {
      /* im Zweifel lieber eine Nachricht zu viel */
    }
    return false;
  }

  async function paymentNotCompleted(session, kind) {
    const meta = session.metadata || {};
    if (!meta.event_id || !meta.profile_id) return ok({ ignored: "keine event_id/profile_id in den Metadaten" });
    if (await alreadyCovered(meta)) return ok({ skipped: "bereits bezahlt" });
    const ev = await loadEvent(meta.event_id);
    const title = (ev && ev.title) || "dein Training";
    if (meta.type === "membership") {
      await notify(
        meta.profile_id,
        "⚠️ Zahlung nicht abgeschlossen",
        "Dein Monatsbeitrag wurde nicht bezahlt. Öffne die App und versuche es nochmal.",
        "payment_incomplete",
      );
    } else if (kind === "failed") {
      await notify(
        meta.profile_id,
        "⚠️ Zahlung fehlgeschlagen",
        `Deine Zahlung für „${title}“ ist fehlgeschlagen. Versuche es in der App mit einer anderen Zahlungsart.`,
        "payment_failed",
      );
    } else {
      await notify(
        meta.profile_id,
        "⚠️ Zahlung nicht abgeschlossen",
        `Dein Ticket für „${title}“ wurde nicht gebucht. Öffne die App und versuche es nochmal.`,
        "payment_incomplete",
      );
    }
    return ok({ notified: true });
  }

  // ── Verteilung ──
  const type = event && event.type;
  const session = event && event.data && event.data.object;
  if (!session) return ok({ ignored: "kein Objekt im Event" });

  if (type === "checkout.session.completed") {
    if (!isPaidSession(session)) {
      // Geld noch nicht da (z.B. SEPA): abwarten, async_payment_succeeded folgt.
      log.log("Checkout abgeschlossen, Zahlung noch offen:", session.id, session.payment_status);
      return ok({ pending: true });
    }
    return fulfil(session);
  }
  if (type === "checkout.session.async_payment_succeeded") return fulfil(session);
  if (type === "checkout.session.async_payment_failed") return paymentNotCompleted(session, "failed");
  if (type === "checkout.session.expired") return paymentNotCompleted(session, "expired");
  return ok();
}
