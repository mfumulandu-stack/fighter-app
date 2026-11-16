// Supabase Edge Function: stripe-webhook
// Wird von STRIPE SELBST aufgerufen. Prueft die Echtheit der Anfrage
// (Signatur) und uebergibt das Ereignis an handleStripeEvent() in logic.js.
//
// Dort steht die eigentliche Entscheidung:
//   * checkout.session.completed            -> nur bei WIRKLICH eingegangenem Geld
//                                              (payment_status = paid) eintragen
//   * checkout.session.async_payment_succeeded -> verzoegerte Zahlungen (z.B. SEPA)
//   * checkout.session.async_payment_failed / .expired
//                                            -> Nutzer per Push informieren
//
// In Stripe (Entwickler -> Webhooks -> dieser Endpunkt) muessen alle vier
// Ereignisse angehakt sein.

import { handleStripeEvent, verifyStripeSignature } from "./logic.js";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  try {
    const payload = await req.text();
    const sigHeader = req.headers.get("stripe-signature") || "";

    const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Ungueltige Signatur" }), { status: 400 });
    }

    const event = JSON.parse(payload);
    const result = await handleStripeEvent(event, {
      supaUrl: SUPA_URL,
      serviceKey: SUPA_SERVICE_KEY,
    });
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // 500: Stripe stellt den Webhook spaeter erneut zu.
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
