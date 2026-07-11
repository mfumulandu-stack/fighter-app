// Supabase Edge Function: send-email
// Verschickt eine E-Mail ueber Resend, ohne dass der Resend-API-Schluessel
// jemals im Client-Code auftaucht. Der Schluessel liegt nur noch hier,
// sicher als Server-Secret.
//
// Wie admin-proxy prueft auch diese Funktion, dass wirklich der Admin
// dahinter steht, bevor sie eine E-Mail verschickt - verhindert Missbrauch
// falls die Funktions-Adresse jemals oeffentlich bekannt wuerde.

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_ID = "1a697731-458d-4559-a4cf-a89d3150bfa5";

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
    const { userToken, to, subject, html, from } = await req.json();

    if (!userToken || !to || !subject || !html) {
      return new Response(JSON.stringify({ error: "userToken, to, subject und html erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Aufrufer verifizieren und auf Admin-ID pruefen (gleiche Logik wie admin-proxy)
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

    // E-Mail ueber Resend verschicken
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "Fighter App <noreply@fighterapp.de>",
        to,
        subject,
        html,
      }),
    });

    const resultText = await resendRes.text();
    return new Response(resultText, {
      status: resendRes.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
