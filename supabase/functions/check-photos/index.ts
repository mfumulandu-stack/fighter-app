// Supabase Edge Function: check-photos
// Prueft Profilfotos auf (1) dasselbe Foto bei mehreren Profilen (Perceptual
// Hash) und (2) unzulaessige Inhalte (Sightengine, optional). Der eigentliche
// Ablauf steht in logic.js (getestet in src/photoCheck.test.js); diese Datei
// stellt nur die Anbindung her.
//
// Aktionen (JSON-Body {action: ...}, Header Authorization: Bearer <Nutzer-Token>):
//   check   Nutzer     prueft die eigenen Fotos; auffaellige werden ausgeblendet,
//                      eindeutig unzulaessige (explizite Nacktheit) geloescht
//   report  Nutzer     speichert eine Meldung ueber ein Profil (Tabelle reports)
//   sweep   nur Admin  Bestandspruefung in Portionen; mode "report" (Standard)
//                      blendet NICHTS aus, sondern markiert nur ("flagged")
//   list    nur Admin  offene Faelle (flagged/hold)
//   review  nur Admin  {id, decision: "approve" | "reject"}
//
// Secrets:
//   PHOTO_ENFORCE=on   erst damit werden Fotos wirklich ausgeblendet/geloescht.
//                      Ohne den Wert (Probephase) wird nur markiert ("flagged"),
//                      alle Fotos bleiben sichtbar und du siehst die Faelle im Admin.
//   SIGHTENGINE_USER, SIGHTENGINE_SECRET   (optional - ohne sie laeuft nur die Duplikat-Pruefung)
//   SIGHTENGINE_MODELS                     (optional, Standard: nudity-2.1,offensive-2.0,genai)

import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { grayFromRgba, interpretModeration, makeEngine, phashFromGray, storagePathFromUrl } from "./logic.js";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_ID = "1a697731-458d-4559-a4cf-a89d3150bfa5";
const SE_USER = Deno.env.get("SIGHTENGINE_USER") || "";
const SE_SECRET = Deno.env.get("SIGHTENGINE_SECRET") || "";
const SE_MODELS = Deno.env.get("SIGHTENGINE_MODELS") || "nudity-2.1,offensive-2.0,genai";
const MODERATION_ON = !!(SE_USER && SE_SECRET);
const ENFORCE = Deno.env.get("PHOTO_ENFORCE") === "on";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

const svcHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...svcHeaders, "Content-Type": "application/json", ...((init.headers as Record<string, string>) || {}) },
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

async function deleteFile(nurl: string) {
  const p = storagePathFromUrl(nurl);
  if (!p) return;
  await fetch(`${SUPA_URL}/storage/v1/object/avatars/${p.split("/").map(encodeURIComponent).join("/")}`, {
    method: "DELETE",
    headers: svcHeaders,
  });
}

async function hashOf(url: string): Promise<{ hash: string | null } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 12_000_000) return null;
    const img: any = await Image.decode(bytes);
    if (!img || !img.bitmap) return null; // z.B. animierte GIFs
    return { hash: phashFromGray(grayFromRgba(img.bitmap, img.width, img.height)).hash };
  } catch {
    return null;
  }
}

// null = nicht eingerichtet; wirft bei Fehlern (dann wird beim naechsten Lauf erneut versucht)
async function moderate(url: string) {
  if (!MODERATION_ON) return null;
  const q = new URLSearchParams({ url, models: SE_MODELS, api_user: SE_USER, api_secret: SE_SECRET });
  const r = await fetch(`https://api.sightengine.com/1.0/check.json?${q}`);
  const body = await r.json();
  if (!r.ok || body.status !== "success") throw new Error("moderation: " + JSON.stringify(body.error || body).slice(0, 200));
  return interpretModeration(body);
}

const engine = makeEngine({ rest, deleteFile, hashOf, moderate, moderationOn: MODERATION_ON });

async function userOf(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const user = await userOf(req);
    if (!user) return json({ error: "Nicht angemeldet" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "check";

    if (action === "check") {
      const { data } = await rest(`profiles?user_id=eq.${user.id}&select=id,avatar_url,coach_avatar_url,gallery&limit=1`);
      const profile = Array.isArray(data) ? data[0] : null;
      if (!profile) return json({ analyzed: 0, flagged: 0, removed: 0, hidden: [] });
      return json(await engine.checkProfile(profile, ENFORCE, await engine.loadHashes()));
    }

    if (action === "report") {
      const r = await engine.report(user.id, body);
      return json(r.body, r.status);
    }

    // ab hier nur Admin
    if (user.id !== ADMIN_ID) return json({ error: "Kein Admin-Zugriff" }, 403);

    if (action === "sweep") return json({ ...(await engine.sweep({ cursor: body.cursor, mode: body.mode === "enforce" && ENFORCE ? "enforce" : "report" })), moderation: MODERATION_ON, enforce: ENFORCE });
    if (action === "list") return json({ moderation: MODERATION_ON, enforce: ENFORCE, items: await engine.list() });
    if (action === "review") {
      const r = await engine.review(body.id, body.decision);
      return json(r.body, r.status);
    }
    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
