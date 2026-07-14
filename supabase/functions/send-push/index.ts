// Supabase Edge Function: send-push
// Verschickt eine Push-Nachricht ueber Apple APNs an ein Geraet.
// Erwartet POST mit JSON entweder:
//   { token: string, title: string, body: string, data?: object }  (alter Weg)
// ODER:
//   { recipientUserId: string, title: string, body: string, data?: object }
// Beim zweiten Weg sucht die Funktion den Push-Token SELBST serverseitig -
// der Client muss dafuer nie mehr direkt den Push-Token einer anderen
// Person auslesen.
// Nutzt die als Secrets hinterlegten APNS_* Werte.

import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID")!;
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!;
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// APNs Produktions-Host. Fuer Sandbox/TestFlight-Debug ggf. api.sandbox.push.apple.com
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
    const { token: rawToken, recipientUserId, title, body, data } = await req.json();
    let token = rawToken;

    // Neuer, sicherer Weg: Token serverseitig anhand der User-ID nachschlagen
    if (!token && recipientUserId) {
      const profRes = await fetch(
        `${SUPA_URL}/rest/v1/profiles?user_id=eq.${recipientUserId}&select=push_token`,
        { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
      );
      const rows = await profRes.json();
      token = Array.isArray(rows) && rows[0] ? rows[0].push_token : null;
      if (!token) {
        return new Response(JSON.stringify({ success: false, skipped: true, reason: "kein Push-Token fuer diesen Nutzer" }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    if (!token || !title) {
      return new Response(JSON.stringify({ error: "token (oder recipientUserId) und title erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const authToken = await makeAuthToken();
    const payload = { aps: { alert: { title, body }, sound: "default" }, ...(data || {}) };

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

    if (res.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } else {
      const errText = await res.text();
      return new Response(JSON.stringify({ success: false, status: res.status, reason: errText }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
