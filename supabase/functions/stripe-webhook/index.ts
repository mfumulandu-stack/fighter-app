// Supabase Edge Function: stripe-webhook
// Wird von STRIPE SELBST aufgerufen, sobald eine Zahlung erfolgreich war.
// Prueft die Echtheit der Anfrage (Signatur) und traegt den Nutzer danach
// als bezahlten Teilnehmer beim Event ein.

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedHex === signature;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.text();
    const sigHeader = req.headers.get("stripe-signature") || "";

    const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Ungueltige Signatur" }), { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const eventId = session.metadata?.event_id;
      const profileId = session.metadata?.profile_id;
      const bafParticipantId = session.metadata?.baf_participant_id;
      const amountPaid = (session.amount_total || 0) / 100;

      // ── MONATSBEITRAG: komplett eigener Zweig, legt eine Mitgliedschaft
      // statt einer Event-Teilnahme an. 30 Tage ab Zahlungseingang gueltig.
      if (session.metadata?.type === "membership" && eventId && profileId) {
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const insertM = await fetch(`${SUPA_URL}/rest/v1/event_memberships`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: profileId,
            event_creator_id: session.metadata?.creator_id || null,
            valid_until: validUntil,
            amount_paid: amountPaid,
            stripe_session_id: session.id,
          }),
        });
        if (!insertM.ok) {
          const detail = await insertM.text();
          console.error("KRITISCH: Monatsbeitrag bezahlt, aber Mitgliedschaft NICHT eingetragen!", detail);
          return new Response(JSON.stringify({ error: "Mitgliedschaft konnte nicht eingetragen werden", detail }), { status: 500 });
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      if (eventId && profileId) {
        // Falls diese Zahlung ein Freund-mitbringen-Rabatt war, existiert
        // schon eine wartende Zeile (angelegt beim Freund-Auswaehlen) - die
        // wird jetzt aktualisiert statt eine zweite, doppelte Zeile
        // anzulegen.
        let participantRowId = null;
        if (bafParticipantId) {
          const patch = await fetch(
            `${SUPA_URL}/rest/v1/event_participants?id=eq.${bafParticipantId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPA_SERVICE_KEY,
                Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
                Prefer: "return=representation",
              },
              body: JSON.stringify({
                paid: true,
                stripe_session_id: session.id,
                amount_paid: amountPaid,
              }),
            },
          );
          if (patch.ok) {
            const rows = await patch.json();
            participantRowId = Array.isArray(rows) && rows[0] ? rows[0].id : bafParticipantId;
          } else {
            const detail = await patch.text();
            console.error("KRITISCH: BAF-Zahlung erfolgt, aber Eintrag NICHT aktualisiert!", detail);
            return new Response(JSON.stringify({ error: "BAF-Teilnehmer konnte nicht aktualisiert werden", detail }), { status: 500 });
          }
        } else {
          const insert = await fetch(`${SUPA_URL}/rest/v1/event_participants`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPA_SERVICE_KEY,
              Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              event_id: eventId,
              user_id: profileId,
              paid: true,
              stripe_session_id: session.id,
              amount_paid: amountPaid,
            }),
          });

          // WICHTIG: Ergebnis pruefen! Frueher wurde die Antwort ignoriert.
          // Dadurch blieb monatelang unbemerkt, dass die Spalten paid,
          // amount_paid und stripe_session_id in der Datenbank fehlten -
          // der Eintrag schlug jedes Mal still fehl. Jemand haette bezahlen
          // koennen, ohne angemeldet zu werden.
          if (!insert.ok) {
            const detail = await insert.text();
            console.error(
              "KRITISCH: Zahlung erfolgt, aber Teilnehmer NICHT eingetragen!",
              "status:", insert.status,
              "event_id:", eventId,
              "profile_id:", profileId,
              "stripe_session:", session.id,
              "betrag:", amountPaid,
              "antwort:", detail,
            );
            // 500 zurueckgeben, damit Stripe den Webhook erneut zustellt -
            // sonst waere die Zahlung endgueltig verloren.
            return new Response(
              JSON.stringify({ error: "Teilnehmer konnte nicht eingetragen werden", detail }),
              { status: 500 },
            );
          }
          const rows = await insert.json();
          participantRowId = Array.isArray(rows) && rows[0] ? rows[0].id : null;
        }

        // "Freund mitbringen": Falls jemand ANDERES genau diese Person
        // (profileId) als mitgebrachten Freund fuer dasselbe Event
        // eingetragen hat, wird deren wartender Eintrag jetzt freigeschaltet
        // - sie koennen ab sofort zum reduzierten Preis bezahlen.
        const unlockRes = await fetch(
          `${SUPA_URL}/rest/v1/event_participants?event_id=eq.${eventId}&brought_friend_id=eq.${profileId}&paid=eq.false`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPA_SERVICE_KEY,
              Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ baf_unlocked: true }),
          },
        );
        if (!unlockRes.ok) {
          // Nicht kritisch genug fuer einen 500er (die eigentliche Zahlung
          // ist ja bereits sauber eingetragen) - aber fuers Debugging loggen.
          console.error("Freund-Rabatt konnte nicht freigeschaltet werden:", await unlockRes.text());
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
