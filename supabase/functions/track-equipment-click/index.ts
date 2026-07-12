// Supabase Edge Function: track-equipment-click
// Erhoeht den Klick-Zaehler eines Equipment-Produkts um 1, jedes Mal
// wenn jemand auf "JETZT ANSEHEN" tippt. Laeuft serverseitig mit dem
// Vollzugriffsschluessel, damit normale Nutzer keine Schreibrechte auf
// die equipment-Tabelle brauchen (vermeidet komplizierte RLS-Regeln).

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { equipmentId } = await req.json();
    if (!equipmentId) {
      return new Response(JSON.stringify({ error: "equipmentId erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Aktuellen Zaehler lesen
    const getRes = await fetch(
      `${SUPA_URL}/rest/v1/equipment?id=eq.${equipmentId}&select=click_count`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const rows = await getRes.json();
    const current = Array.isArray(rows) && rows[0] ? (rows[0].click_count || 0) : 0;

    // Um 1 erhoehen
    await fetch(`${SUPA_URL}/rest/v1/equipment?id=eq.${equipmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPA_SERVICE_KEY,
        Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ click_count: current + 1 }),
    });

    return new Response(JSON.stringify({ success: true, newCount: current + 1 }), {
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
