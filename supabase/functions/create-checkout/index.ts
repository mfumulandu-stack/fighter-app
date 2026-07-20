// Supabase Edge Function: create-checkout
// Erstellt eine sichere Stripe-Zahlungsseite fuer ein bezahltes Event.
// Der Stripe Secret Key bleibt dabei ausschliesslich hier auf dem
// Server (als Secret), niemals im Client-Code.

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = "https://fighterapp.de";

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
    const { eventId, userToken } = await req.json();
    if (!eventId || !userToken) {
      return new Response(JSON.stringify({ error: "eventId und userToken erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Nutzer verifizieren
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

    // Profil (fuer Namen + Profil-ID) und Event (fuer Preis + Titel) laden
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=id,name`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const profRows = await profRes.json();
    const profile = Array.isArray(profRows) ? profRows[0] : null;
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profil nicht gefunden" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const evRes = await fetch(
      `${SUPA_URL}/rest/v1/events?id=eq.${eventId}&select=id,title,price`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const evRows = await evRes.json();
    const event = Array.isArray(evRows) ? evRows[0] : null;
    if (!event || !event.price || event.price <= 0) {
      return new Response(JSON.stringify({ error: "Event nicht gefunden oder kostenlos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Stripe Checkout Session erstellen (direkter REST-Aufruf, kein SDK noetig)
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${APP_URL}?ticket=success&event=${eventId}`);
    params.append("cancel_url", `${APP_URL}?ticket=cancelled`);
    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][product_data][name]", `Ticket: ${event.title}`);
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(event.price * 100)));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[event_id]", String(eventId));
    params.append("metadata[profile_id]", String(profile.id));
    params.append("metadata[user_name]", profile.name || "");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || "Stripe-Fehler" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
