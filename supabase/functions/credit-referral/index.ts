// Supabase Edge Function: credit-referral
// Teil des Freunde-einladen-Rabatt-Systems: wird aufgerufen, wenn sich ein
// neuer Nutzer ERFOLGREICH registriert UND sein Profil fertig angelegt hat
// (siehe saveProfile in App.js - genau dieser Moment zaehlt, nicht schon
// die blosse Registrierung). Schreibt dem Einladenden (referrerId, aus dem
// ?ref=<profil-id>-Link) einen gezaehlten Freund gut.
//
// WICHTIG: Alles wird hier serverseitig nachgeprueft, niemals dem Client
// vertraut:
// - der mitgeschickte userToken muss zu genau dem neu angelegten Profil
//   gehoeren (verhindert, dass jemand fuer ein FREMDES Profil Gutschriften
//   anfordert)
// - Selbst-Einladung (referrerId === eigenes Profil) wird ignoriert
// - ein unbekannter referrerId wird ignoriert statt einen Fehler zu werfen
// - die referred_profile_id ist in der Datenbank EINDEUTIG (unique),
//   daher zaehlt jedes Profil hoechstens einmal als "eingeladener Freund",
//   egal wie oft dieser Aufruf wiederholt wird (idempotent)

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    const { referrerId, newProfileId, userToken } = await req.json();
    if (!referrerId || !newProfileId || !userToken) {
      return new Response(JSON.stringify({ error: "referrerId, newProfileId und userToken erforderlich" }), {
        status: 400,
        headers: cors,
      });
    }

    if (referrerId === newProfileId) {
      return new Response(JSON.stringify({ ok: true, skipped: "self-referral" }), { status: 200, headers: cors });
    }

    // Token verifizieren
    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${userToken}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Ungueltiger oder abgelaufener Token" }), {
        status: 401,
        headers: cors,
      });
    }
    const authUser = await userRes.json();

    // Pruefen, dass newProfileId WIRKLICH das Profil dieses Tokens ist
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?user_id=eq.${authUser.id}&select=id`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const profRows = await profRes.json();
    const myProfileId = Array.isArray(profRows) && profRows[0] ? profRows[0].id : null;
    if (!myProfileId || myProfileId !== newProfileId) {
      return new Response(JSON.stringify({ error: "Profil stimmt nicht mit Token ueberein" }), {
        status: 403,
        headers: cors,
      });
    }

    // Pruefen, dass der Einladende wirklich existiert
    const refRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?id=eq.${referrerId}&select=id`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const refRows = await refRes.json();
    if (!Array.isArray(refRows) || !refRows[0]) {
      return new Response(JSON.stringify({ ok: true, skipped: "unknown referrer" }), { status: 200, headers: cors });
    }

    // Einladung eintragen - referred_profile_id ist unique, daher bei
    // Wiederholung (z.B. doppelter Aufruf) einfach keine neue Zeile
    const insRes = await fetch(`${SUPA_URL}/rest/v1/referrals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPA_SERVICE_KEY,
        Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
        Prefer: "return=representation,resolution=ignore-duplicates",
      },
      body: JSON.stringify({ referrer_id: referrerId, referred_profile_id: newProfileId }),
    });
    const insData = await insRes.json().catch(() => null);
    const wasInserted = insRes.ok && Array.isArray(insData) && insData.length > 0;

    if (wasInserted) {
      const incRes = await fetch(`${SUPA_URL}/rest/v1/rpc/increment_referral_count`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPA_SERVICE_KEY,
          Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
        },
        body: JSON.stringify({ p_referrer_id: referrerId }),
      });
      if (!incRes.ok) {
        console.error("increment_referral_count fehlgeschlagen", await incRes.text());
      }
    }

    return new Response(JSON.stringify({ ok: true, credited: wasInserted }), { status: 200, headers: cors });
  } catch (err) {
    console.error("credit-referral error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
