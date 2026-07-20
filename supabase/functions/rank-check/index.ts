// Supabase Edge Function: rank-check
// Berechnet die komplette Rangliste neu (Punkte = Siege*3 - Niederlagen*2
// + Unentschieden, absteigend sortiert), vergleicht jeden Rangplatz mit
// dem zuletzt gespeicherten Wert, und schickt eine Push-Benachrichtigung
// an alle Nutzer, die dadurch nach unten gerutscht sind (= ueberholt
// wurden). Wird nach jeder Aenderung an Sieg/Niederlage-Werten aufgerufen.

import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID")!;
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!;
const APNS_HOST = "https://api.push.apple.com";

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function makeAuthToken(): Promise<string> {
  const key = await importPrivateKey(APNS_PRIVATE_KEY);
  return await create(
    { alg: "ES256", kid: APNS_KEY_ID },
    { iss: APNS_TEAM_ID, iat: getNumericDate(0) },
    key,
  );
}

async function sendOne(authToken: string, token: string, title: string, body: string) {
  const payload = { aps: { alert: { title, body }, sound: "default" } };
  try {
    const res = await fetch(`${APNS_HOST}/3/device/${token}`, {
      method: "POST",
      headers: {
        "authorization": `bearer ${authToken}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

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

  try {
    // Alle nicht gesperrten Profile mit Kampfstatistik + letztem Rang holen
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?select=id,name,wins,losses,draws,push_token,last_rank_position&banned=neq.true`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const profiles = await profRes.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, checked: 0, notified: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Punkte berechnen - WICHTIG: nur Nutzer mit mindestens einem Kampf
    // zaehlen mit, genau wie in der App-Rangliste selbst. Vorher wurden
    // hier ALLE Nutzer mitgezaehlt (auch mit 0 Kaempfen), wodurch die
    // errechnete Platzierung nie mit der echten, sichtbaren Rangliste
    // uebereinstimmte.
    const scored = profiles
      .filter((p: any) => ((p.wins || 0) + (p.losses || 0) + (p.draws || 0)) > 0)
      .map((p: any) => ({
        ...p,
        score: (p.wins || 0) * 3 - (p.losses || 0) * 2 + (p.draws || 0),
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .map((p: any, i: number) => ({ ...p, newRank: i + 1 }));

    const authToken = await makeAuthToken();
    let notified = 0;
    const updates: any[] = [];

    for (const p of scored) {
      const hadPreviousRank = typeof p.last_rank_position === "number";
      // Nur benachrichtigen, wenn sich der Rang wirklich verschlechtert hat
      // (neue Platzierungsnummer groesser = weiter unten) UND es einen
      // frueheren Wert zum Vergleichen gibt (nicht beim allerersten Lauf).
      if (hadPreviousRank && p.newRank > p.last_rank_position && p.push_token) {
        const ok = await sendOne(
          authToken,
          p.push_token,
          "📉 Du wurdest überholt!",
          "Du bist jetzt auf Platz " + p.newRank + " in der Rangliste. Zeit für ein Comeback!",
        );
        if (ok) notified++;
      }
      updates.push({ id: p.id, last_rank_position: p.newRank });
    }

    // Alle neuen Rangplaetze speichern (einzeln, PostgREST kennt kein
    // Batch-Update mit unterschiedlichen Werten pro Zeile in einem Call)
    await Promise.all(
      updates.map((u) =>
        fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${u.id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ last_rank_position: u.last_rank_position }),
        })
      ),
    );

    return new Response(
      JSON.stringify({ success: true, checked: scored.length, notified }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
