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
    const { eventId, userToken, type } = await req.json();
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
      `${SUPA_URL}/rest/v1/events?id=eq.${eventId}&select=id,title,price,price_monthly,creator_id`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const evRows = await evRes.json();
    const event = Array.isArray(evRows) ? evRows[0] : null;
    if (!event) {
      return new Response(JSON.stringify({ error: "Event nicht gefunden" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ── MONATSBEITRAG: komplett eigener, einfacherer Zweig - keine BAF-
    // Rabatt-Logik dafuer, kein event_participants-Eintrag. Erstellt eine
    // Mitgliedschaft, die unabhaengig von einzelnen Terminen 30 Tage gilt.
    if (type === "membership") {
      if (!event.price_monthly || event.price_monthly <= 0) {
        return new Response(JSON.stringify({ error: "Kein Monatsbeitrag fuer dieses Event hinterlegt" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      const mParams = new URLSearchParams();
      mParams.append("mode", "payment");
      mParams.append("success_url", `${APP_URL}?ticket=success&event=${eventId}&membership=1`);
      mParams.append("cancel_url", `${APP_URL}?ticket=cancelled`);
      mParams.append("line_items[0][price_data][currency]", "eur");
      mParams.append("line_items[0][price_data][product_data][name]", `Monatsbeitrag: ${event.title}`);
      mParams.append("line_items[0][price_data][unit_amount]", String(Math.round(event.price_monthly * 100)));
      mParams.append("line_items[0][quantity]", "1");
      mParams.append("metadata[type]", "membership");
      mParams.append("metadata[event_id]", String(eventId));
      mParams.append("metadata[profile_id]", String(profile.id));
      mParams.append("metadata[creator_id]", String(event.creator_id || ""));

      const mStripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: mParams.toString(),
      });
      const mSession = await mStripeRes.json();
      if (!mStripeRes.ok) {
        return new Response(JSON.stringify({ error: mSession.error?.message || "Stripe-Fehler" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      return new Response(JSON.stringify({ url: mSession.url }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!event.price || event.price <= 0) {
      return new Response(JSON.stringify({ error: "Event nicht gefunden oder kostenlos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // "Freund mitbringen"-Rabatt: NIEMALS vom Client vertrauen, sondern hier
    // serverseitig selbst pruefen, ob wirklich ein freigeschalteter (der
    // mitgebrachte Freund hat bereits bezahlt) Eintrag existiert. Nur dann
    // wird der Preis reduziert - sonst koennte jeder sich den Rabatt einfach
    // erschwindeln.
    let finalPrice = event.price;
    const bafRes = await fetch(
      `${SUPA_URL}/rest/v1/event_participants?event_id=eq.${eventId}&user_id=eq.${profile.id}&baf_unlocked=eq.true&paid=eq.false&select=id`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const bafRows = await bafRes.json();
    const bafDiscountRow = Array.isArray(bafRows) ? bafRows[0] : null;
    if (bafDiscountRow) {
      finalPrice = Math.max(0, event.price - 10);
    }

    // Falls der Rabatt das Training komplett kostenlos macht, braucht es
    // gar keine Stripe-Zahlungsseite (Stripe erlaubt ohnehin keine 0-Euro-
    // Zahlungen) - direkt als bezahlt eintragen und fertig.
    if (finalPrice <= 0) {
      const patchRes = await fetch(
        `${SUPA_URL}/rest/v1/event_participants?id=eq.${bafDiscountRow.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ paid: true, amount_paid: 0 }),
        },
      );
      if (!patchRes.ok) {
        const detail = await patchRes.text();
        return new Response(JSON.stringify({ error: "Kostenlose Anmeldung fehlgeschlagen", detail }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      return new Response(JSON.stringify({ free: true, url: `${APP_URL}?ticket=success&event=${eventId}` }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Stripe Checkout Session erstellen (direkter REST-Aufruf, kein SDK noetig)
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${APP_URL}?ticket=success&event=${eventId}`);
    params.append("cancel_url", `${APP_URL}?ticket=cancelled`);
    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][product_data][name]", bafDiscountRow ? `Ticket: ${event.title} (Freund-mitbringen-Rabatt)` : `Ticket: ${event.title}`);
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(finalPrice * 100)));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[event_id]", String(eventId));
    params.append("metadata[profile_id]", String(profile.id));
    params.append("metadata[user_name]", profile.name || "");
    if (bafDiscountRow) params.append("metadata[baf_participant_id]", String(bafDiscountRow.id));

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
