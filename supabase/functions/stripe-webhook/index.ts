// Supabase Edge Function: stripe-webhook
// Wird von STRIPE SELBST aufgerufen, sobald eine Zahlung erfolgreich war.
// Prueft die Echtheit der Anfrage (Signatur) und traegt den Nutzer danach
// als bezahlten Teilnehmer beim Event ein.

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedHex === signature;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.text();
    const sigHeader = req.headers.get("stripe-signature") || "";

    const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Ungueltige Signatur" }), { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const eventId = session.metadata?.event_id;
      const profileId = session.metadata?.profile_id;
      const amountPaid = (session.amount_total || 0) / 100;

      if (eventId && profileId) {
        await fetch(`${SUPA_URL}/rest/v1/event_participants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            event_id: eventId,
            user_id: profileId,
            paid: true,
            stripe_session_id: session.id,
            amount_paid: amountPaid,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
