// Supabase Edge Function: admin-proxy
// Zentrale, sichere Schleuse fuer ALLE Admin-Operationen, die bisher den
// Vollzugriffs-Schluessel (Service Role Key) direkt im Client-Code
// genutzt haben. Der Schluessel selbst bleibt jetzt ausschliesslich hier
// auf dem Server (als Supabase Secret), niemals im Code der App sichtbar.
//
// Sicherheitsablauf bei jeder Anfrage:
// 1) Der aufrufende Nutzer-Token wird gegen Supabase geprueft (echte
//    eingeloggte Person?)
// 2) Die User-ID wird mit der bekannten Admin-ID verglichen (nur DU
//    darfst durch diese Schleuse)
// 3) Nur bekannte, erlaubte Datenbank-Pfade werden durchgelassen
//    (Sicherheitsnetz gegen Missbrauch, falls der Token doch mal
//    kompromittiert wird)
// 4) Erst DANN wird die eigentliche Anfrage mit dem Vollzugriffs-
//    schluessel ausgefuehrt

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_ID = "1a697731-458d-4559-a4cf-a89d3150bfa5";

const ALLOWED_PREFIXES = [
  "/rest/v1/profiles",
  "/rest/v1/gyms",
  "/rest/v1/events",
  "/rest/v1/event_participants",
  "/rest/v1/equipment",
  "/rest/v1/reports",
  "/rest/v1/admin_messages",
  "/rest/v1/feedback",
  "/rest/v1/messages",
  "/rest/v1/swipes",
  "/rest/v1/matches",
  "/auth/v1/admin/users",
];

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
    const { userToken, path, method, body, extraHeaders } = await req.json();

    if (!userToken || !path) {
      return new Response(JSON.stringify({ error: "userToken und path erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 1) + 2) Aufrufer verifizieren und auf Admin-ID pruefen
    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${userToken}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Ungueltiger oder abgelaufener Token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    const user = await userRes.json();
    if (user.id !== ADMIN_ID) {
      return new Response(JSON.stringify({ error: "Kein Admin-Zugriff" }), {
        status: 403,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 3) Nur bekannte Pfade erlauben
    if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
      return new Response(JSON.stringify({ error: "Pfad nicht erlaubt: " + path }), {
        status: 403,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 4) Eigentliche Anfrage mit dem Vollzugriffsschluessel ausfuehren
    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: SUPA_SERVICE_KEY,
      Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
    };
    if (extraHeaders?.Prefer) forwardHeaders["Prefer"] = extraHeaders.Prefer;

    const targetRes = await fetch(`${SUPA_URL}${path}`, {
      method: method || "GET",
      headers: forwardHeaders,
      body: body || undefined,
    });

    const resultText = await targetRes.text();
    return new Response(resultText, {
      status: targetRes.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
