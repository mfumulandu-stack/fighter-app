// Supabase Edge Function: broadcast-push
// Verschickt eine Push-Nachricht an ALLE Nutzer mit registriertem push_token.
// Erwartet POST mit JSON: { title: string, body: string, data?: object }
// Nutzt dieselben APNS_* Secrets wie send-push.

import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID")!;
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!;
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APNS_HOST = "https://api.push.apple.com";

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8", der.buffer, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
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

async function sendOne(authToken: string, token: string, title: string, body: string, data: any) {
  const payload = { aps: { alert: { title, body }, sound: "default" }, ...(data || {}) };
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
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { title, body, data } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title und body erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Alle Nutzer mit push_token holen
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?push_token=not.is.null&select=push_token`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const profiles = await profRes.json();
    const tokens: string[] = Array.isArray(profiles)
      ? profiles.map((p: any) => p.push_token).filter(Boolean)
      : [];

    const authToken = await makeAuthToken();

    let success = 0, failed = 0;
    // In kleinen Batches versenden, um APNs nicht zu ueberlasten
    const batchSize = 20;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((t) => sendOne(authToken, t, title, body, data)),
      );
      results.forEach((ok) => (ok ? success++ : failed++));
    }

    return new Response(
      JSON.stringify({ success: true, totalTokens: tokens.length, sent: success, failed }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
