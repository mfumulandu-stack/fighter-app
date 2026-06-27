// Supabase Edge Function: send-push
// Verschickt eine Push-Nachricht ueber Apple APNs an ein Geraet.
// Erwartet POST mit JSON: { token: string, title: string, body: string, data?: object }
// Nutzt die als Secrets hinterlegten APNS_* Werte.

import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID")!;
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!;

// APNs Produktions-Host. Fuer Sandbox/TestFlight-Debug ggf. api.sandbox.push.apple.com
const APNS_HOST = "https://api.push.apple.com";

// .p8 PEM -> CryptoKey fuer ES256 Signierung
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
  // CORS preflight
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
    const { token, title, body, data } = await req.json();
    if (!token || !title) {
      return new Response(JSON.stringify({ error: "token und title erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const authToken = await makeAuthToken();

    const payload = {
      aps: {
        alert: { title, body: body || "" },
        sound: "default",
        badge: 1,
      },
      ...(data || {}),
    };

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

    const respText = await res.text();
    return new Response(
      JSON.stringify({ success: res.ok, status: res.status, apns: respText }),
      {
        status: res.ok ? 200 : 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
