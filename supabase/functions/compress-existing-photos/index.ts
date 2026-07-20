// Supabase Edge Function: compress-existing-photos
// Komprimiert nachtraeglich bereits hochgeladene Profilfotos, die VOR
// der automatischen Komprimierung beim Upload entstanden sind. Laeuft
// in kleinen Portionen (Batches), damit eine einzelne Ausfuehrung nicht
// zu lange dauert oder zu viel Speicher braucht.
//
// Nutzt ImageScript (reine JS/WASM-Bildbearbeitung, funktioniert in
// Deno Edge Functions ohne native Abhaengigkeiten).

import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_SIZE = 8;
const MAX_DIMENSION = 800;

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
    // Naechste Portion Profile mit unkomprimiertem Foto holen
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?avatar_url=not.is.null&avatar_compressed=eq.false&select=id,avatar_url&limit=${BATCH_SIZE}`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const profiles = await profRes.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, remaining: 0, done: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const p of profiles) {
      try {
        // Bild herunterladen
        const imgRes = await fetch(p.avatar_url);
        if (!imgRes.ok) throw new Error("Download fehlgeschlagen: " + imgRes.status);
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

        // Bereits klein genug? Trotzdem als erledigt markieren, aber nicht neu hochladen
        if (imgBytes.length < 150_000) {
          await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${p.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPA_SERVICE_KEY,
              Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ avatar_compressed: true }),
          });
          processed++;
          continue;
        }

        // Verkleinern (laengere Seite auf MAX_DIMENSION, Seitenverhaeltnis bleibt erhalten)
        const image = await Image.decode(imgBytes);
        const scale = MAX_DIMENSION / Math.max(image.width, image.height);
        if (scale < 1) {
          image.resize(Math.round(image.width * scale), Math.round(image.height * scale));
        }
        const compressed = await image.encodeJPEG(80);

        // Pfad aus der bestehenden URL extrahieren, an gleicher Stelle ueberschreiben
        const urlParts = p.avatar_url.split("/avatars/");
        const path = urlParts[1];
        if (!path) throw new Error("Pfad konnte nicht aus URL gelesen werden");

        const upRes = await fetch(`${SUPA_URL}/storage/v1/object/avatars/${path}`, {
          method: "PUT",
          headers: {
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
          },
          body: compressed,
        });
        if (!upRes.ok) throw new Error("Upload fehlgeschlagen: " + upRes.status);

        await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${p.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ avatar_compressed: true }),
        });
        processed++;
      } catch (e) {
        failed++;
        errors.push(`Profil ${p.id}: ${String(e)}`);
        // Trotzdem als "erledigt" markieren, damit ein einzelnes kaputtes
        // Bild den Prozess nicht endlos blockiert
        await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${p.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPA_SERVICE_KEY,
            Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ avatar_compressed: true }),
        }).catch(() => {});
      }
    }

    // Wie viele bleiben noch uebrig? (fuer die Fortschrittsanzeige, bis 1000 gezaehlt)
    const remRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?avatar_url=not.is.null&avatar_compressed=eq.false&select=id&limit=1000`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } },
    );
    const remRows = await remRes.json();
    const remaining = Array.isArray(remRows) ? remRows.length : 0;

    return new Response(
      JSON.stringify({ success: true, processed, failed, errors: errors.slice(0, 3), remaining, done: remaining === 0 }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
