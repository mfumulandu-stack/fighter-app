// Foto-Pruefung: reine Funktionen (ohne Netzwerk, ohne Deno), damit sie in
// src/photoCheck.test.js getestet werden koennen - wie bei stripe-webhook/logic.js.
//
// Zwei Pruefungen:
//   1) Dasselbe Foto auf mehreren Profilen (Perceptual Hash, "pHash").
//      Der Hash aendert sich kaum, wenn ein Bild verkleinert, neu komprimiert
//      oder leicht aufgehellt wird. Zwei Hashes mit kleinem Abstand (Hamming)
//      sind also sehr wahrscheinlich dasselbe Bild.
//   2) Inhalts-Pruefung durch einen Moderations-Dienst (Sightengine, EU).
//
// Wichtig fuer eine Kampfsport-App: Oberkoerperfrei ist normal. Deshalb zaehlen
// wir NUR die Klassen "sexual_activity", "sexual_display" und "erotica" -
// nicht "suggestive" oder "male_chest".

export const HASH_SIZE = 32;      // Bild wird auf 32x32 Grauwerte verkleinert
export const MAX_HAMMING = 4;     // bis zu 4 von 64 Bits Unterschied = moegliches Duplikat (wird markiert)
export const HOLD_HAMMING = 2;    // bis zu 2 Bits = praktisch sicher dasselbe Bild (wird ausgeblendet)
export const MIN_STDEV = 10;      // einfarbige/leere Bilder: kein Hash (sonst Fehlalarme)

// Schwellen (0..1). Bewusst hoch: lieber ein Foto zu wenig melden als einen echten Fighter.
export const TH = { explicit: 0.9, erotica: 0.85, gore: 0.9, offensive: 0.85, ai: 0.9 };

// ── Adressen ────────────────────────────────────────────────────────────
export function normUrl(u) {
  return String(u || '').split('?')[0].split('#')[0];
}

const PUBLIC_MARK = '/storage/v1/object/public/avatars/';
export function isOwnPhotoUrl(u) {
  return normUrl(u).indexOf(PUBLIC_MARK) !== -1;
}
// "https://x.supabase.co/storage/v1/object/public/avatars/fighter_1.jpg?t=1" -> "fighter_1.jpg"
export function storagePathFromUrl(u) {
  const n = normUrl(u);
  const i = n.indexOf(PUBLIC_MARK);
  return i === -1 ? null : decodeURIComponent(n.slice(i + PUBLIC_MARK.length));
}

// gallery kommt je nach Spaltentyp als Array oder als JSON-Text
export function parseGallery(g) {
  if (Array.isArray(g)) return g.filter((x) => typeof x === 'string' && x);
  if (typeof g === 'string' && g) {
    try { const a = JSON.parse(g); return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x) : []; } catch (e) { return []; }
  }
  return [];
}

// Alle eigenen Fotos eines Profils: [{kind, url}] (url ohne ?t=...)
export function photosOf(profile) {
  const out = [];
  const add = (kind, u) => { if (u && isOwnPhotoUrl(u)) out.push({ kind, url: normUrl(u) }); };
  if (!profile) return out;
  add('avatar', profile.avatar_url);
  add('coach', profile.coach_avatar_url);
  parseGallery(profile.gallery).forEach((u) => add('gallery', u));
  return out;
}

// ── pHash ───────────────────────────────────────────────────────────────
// RGBA-Pixel (Uint8ClampedArray) -> size x size Grauwerte, per Flaechenmittel verkleinert
export function grayFromRgba(rgba, w, h, size = HASH_SIZE) {
  const out = new Float64Array(size * size);
  for (let j = 0; j < size; j++) {
    const y0 = Math.floor((j * h) / size);
    const y1 = Math.max(y0 + 1, Math.floor(((j + 1) * h) / size));
    for (let i = 0; i < size; i++) {
      const x0 = Math.floor((i * w) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((i + 1) * w) / size));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1 && y < h; y++) {
        for (let x = x0; x < x1 && x < w; x++) {
          const p = (y * w + x) * 4;
          const a = rgba[p + 3] / 255;
          const g = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
          sum += g * a + 255 * (1 - a); // transparente Pixel zaehlen als weiss
          n++;
        }
      }
      out[j * size + i] = n ? sum / n : 255;
    }
  }
  return out;
}

const COS = (() => {
  const t = [];
  for (let u = 0; u < 8; u++) {
    const row = [];
    for (let x = 0; x < HASH_SIZE; x++) row.push(Math.cos(((2 * x + 1) * u * Math.PI) / (2 * HASH_SIZE)));
    t.push(row);
  }
  return t;
})();

// Grauwerte (32x32) -> { hash: '16 Hex-Zeichen', stdev } ; hash = null bei fast einfarbigen Bildern
export function phashFromGray(gray) {
  const n = HASH_SIZE * HASH_SIZE;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += gray[i];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (gray[i] - mean) * (gray[i] - mean);
  const stdev = Math.sqrt(v / n);
  if (stdev < MIN_STDEV) return { hash: null, stdev };

  // 8x8 niedrige Frequenzen der DCT
  const coef = [];
  for (let u = 0; u < 8; u++) {
    for (let w = 0; w < 8; w++) {
      let s = 0;
      for (let y = 0; y < HASH_SIZE; y++) {
        const cy = COS[u][y];
        for (let x = 0; x < HASH_SIZE; x++) s += gray[y * HASH_SIZE + x] * cy * COS[w][x];
      }
      coef.push(s);
    }
  }
  const rest = coef.slice(1).sort((a, b) => a - b);
  const median = rest[Math.floor(rest.length / 2)];
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    let nib = 0;
    for (let b = 0; b < 4; b++) nib = (nib << 1) | (coef[i + b] > median ? 1 : 0);
    hex += nib.toString(16);
  }
  return { hash: hex, stdev };
}

const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
export function hammingHex(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    const pa = parseInt(a[i], 16);
    const pb = parseInt(b[i], 16);
    if (Number.isNaN(pa) || Number.isNaN(pb)) return 64; // kein gueltiger Hash
    d += POP[pa ^ pb];
  }
  return d;
}

// candidates: [{profile_id, phash}] ; eigene Profile vorher aussortieren
export function findDuplicate(hash, profileId, candidates, maxDist = MAX_HAMMING) {
  if (!hash) return null;
  let best = null;
  for (const c of candidates || []) {
    if (!c.phash || String(c.profile_id) === String(profileId)) continue;
    const d = hammingHex(hash, c.phash);
    if (d <= maxDist && (!best || d < best.dist)) best = { profile_id: c.profile_id, dist: d };
  }
  return best;
}

// ── Moderation ──────────────────────────────────────────────────────────
const num = (x) => (typeof x === 'number' && isFinite(x) ? Math.max(0, Math.min(1, x)) : null);
const maxOf = (arr) => {
  const v = arr.filter((x) => x !== null);
  return v.length ? Math.max(...v) : null;
};

// Antwort von Sightengine (check.json) -> flache Werte 0..1 oder null (Modell nicht angefragt)
export function interpretModeration(res) {
  const r = res || {};
  const n = r.nudity || {};
  const off = r.offensive || {};
  return {
    explicit: maxOf([num(n.sexual_activity), num(n.sexual_display)]),
    erotica: num(n.erotica),
    gore: num(r.gore && r.gore.prob),
    offensive: maxOf(['nazi', 'supremacist', 'terrorist', 'confederate', 'asian_swastika'].map((k) => num(off[k]))),
    ai: num(r.type && r.type.ai_generated),
  };
}

// Ergebnis -> Status.
//   ok       nichts auffaellig
//   flagged  auffaellig, Foto bleibt sichtbar bis du entscheidest (Bestandspruefung / "nur melden")
//   hold     auffaellig, Foto ist ausgeblendet bis du entscheidest
//   removed  eindeutig unzulaessig (explizite Nacktheit): sofort geloescht
export function decide({ mod, dup, kind, enforce }) {
  const reasons = [];
  let severe = false;
  let hide = false;
  if (mod) {
    if (mod.explicit !== null && mod.explicit >= TH.explicit) { reasons.push('explicit'); severe = true; }
    else if (mod.erotica !== null && mod.erotica >= TH.erotica) { reasons.push('erotica'); hide = true; }
    if (mod.gore !== null && mod.gore >= TH.gore) { reasons.push('gore'); hide = true; }
    if (mod.offensive !== null && mod.offensive >= TH.offensive) { reasons.push('offensive'); hide = true; }
    if ((kind === 'avatar' || kind === 'coach') && mod.ai !== null && mod.ai >= TH.ai) { reasons.push('ai_generated'); hide = true; }
  }
  if (dup) {
    reasons.push('duplicate');
    // knapper Treffer (3-4 Bits): nur markieren, Foto bleibt sichtbar - ein echter Fighter soll nicht wegen Aehnlichkeit verschwinden
    if (dup.dist <= HOLD_HAMMING) hide = true;
  }
  if (!reasons.length) return { status: 'ok', reasons };
  if (!enforce) return { status: 'flagged', reasons };
  return { status: severe ? 'removed' : hide ? 'hold' : 'flagged', reasons };
}

// ── Ablauf (mit eingesteckten Abhaengigkeiten, damit er ohne Netzwerk testbar ist) ──
// env: {
//   rest(path, init) -> {ok, status, data}   Zugriff auf die Datenbank (Service-Schluessel)
//   deleteFile(normUrl)                      Datei aus dem Storage loeschen
//   hashOf(url) -> {hash} | null             pHash des Bildes
//   moderate(url) -> Werte | null            Moderation (null = nicht eingerichtet; wirft bei Fehlern)
//   moderationOn: boolean
// }
export function makeEngine(env) {
  const { rest, deleteFile, hashOf, moderate, moderationOn } = env;
  const PATCH_MIN = { method: 'PATCH', headers: { Prefer: 'return=minimal' } };
  const profileSel = 'id,avatar_url,coach_avatar_url,gallery';

  async function getProfile(profileId) {
    const { data } = await rest('profiles?id=eq.' + profileId + '&select=' + profileSel);
    return Array.isArray(data) ? data[0] : null;
  }

  // Foto aus dem Profil nehmen (Spalte leeren bzw. aus gallery entfernen). -> [{kind,url}] wenn etwas geaendert wurde
  async function hide(profileId, kind, nurl) {
    const p = await getProfile(profileId);
    if (!p) return [];
    const patch = {};
    if (kind === 'avatar' && p.avatar_url && normUrl(p.avatar_url) === nurl) patch.avatar_url = null;
    if (kind === 'coach' && p.coach_avatar_url && normUrl(p.coach_avatar_url) === nurl) patch.coach_avatar_url = null;
    if (kind === 'gallery') {
      const g = parseGallery(p.gallery);
      const ng = g.filter((u) => normUrl(u) !== nurl);
      if (ng.length !== g.length) patch.gallery = ng;
    }
    if (!Object.keys(patch).length) return [];
    await rest('profiles?id=eq.' + profileId, { ...PATCH_MIN, body: JSON.stringify(patch) });
    return [{ kind, url: nurl }];
  }

  // Ausgeblendetes Foto wieder einsetzen (nur wenn der Platz noch frei ist)
  async function restore(profileId, kind, nurl) {
    const p = await getProfile(profileId);
    if (!p) return;
    const patch = {};
    if (kind === 'avatar' && !p.avatar_url) patch.avatar_url = nurl;
    if (kind === 'coach' && !p.coach_avatar_url) patch.coach_avatar_url = nurl;
    if (kind === 'gallery') {
      const g = parseGallery(p.gallery);
      if (g.length < 3 && !g.some((u) => normUrl(u) === nurl)) patch.gallery = [...g, nurl];
    }
    if (Object.keys(patch).length) await rest('profiles?id=eq.' + profileId, { ...PATCH_MIN, body: JSON.stringify(patch) });
  }

  async function loadHashes() {
    const { data } = await rest('photo_checks?phash=not.is.null&select=profile_id,phash&limit=50000');
    return Array.isArray(data) ? data : [];
  }

  // Alle Fotos EINES Profils pruefen
  async function checkProfile(profile, enforce, hashes) {
    const res = { analyzed: 0, flagged: 0, hidden: [], removed: 0, errors: 0 };
    const photos = photosOf(profile);
    if (!photos.length) return res;
    const { data: rows } = await rest('photo_checks?profile_id=eq.' + profile.id + '&select=id,url,status,phash,moderated');
    const known = {};
    (Array.isArray(rows) ? rows : []).forEach((r) => { known[r.url] = r; });

    for (const ph of photos) {
      const ex = known[ph.url];
      if (ex) {
        // schon geprueft: ausgeblendete/geloeschte Fotos bleiben weg, auch wenn die App sie erneut einspielt
        if (enforce && (ex.status === 'hold' || ex.status === 'removed')) {
          res.hidden.push(...(await hide(profile.id, ph.kind, ph.url)));
        }
        if (!(moderationOn && ex.moderated === false && ex.status === 'ok')) continue;
      }
      res.analyzed++;
      try {
        const h = ex && ex.phash ? { hash: ex.phash } : await hashOf(ph.url);
        const dup = h && h.hash ? findDuplicate(h.hash, profile.id, hashes) : null;
        const mod = await moderate(ph.url);
        const d = decide({ mod, dup, kind: ph.kind, enforce });
        await rest('photo_checks?on_conflict=profile_id,url', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            profile_id: profile.id,
            kind: ph.kind,
            url: ph.url,
            phash: h ? h.hash : null,
            status: d.status,
            reasons: d.reasons,
            dup_profile_id: dup ? dup.profile_id : null,
            scores: mod || dup ? { ...(mod || {}), ...(dup ? { dup_dist: dup.dist } : {}) } : null,
            moderated: !!mod,
          }),
        });
        if (h && h.hash) hashes.push({ profile_id: profile.id, phash: h.hash });
        if (d.status === 'flagged') res.flagged++;
        if (d.status === 'hold') { res.flagged++; res.hidden.push(...(await hide(profile.id, ph.kind, ph.url))); }
        if (d.status === 'removed') {
          res.removed++;
          res.hidden.push(...(await hide(profile.id, ph.kind, ph.url)));
          await deleteFile(ph.url);
        }
      } catch (e) {
        res.errors++; // z.B. Moderations-Dienst nicht erreichbar: keine Zeile, der naechste Lauf versucht es erneut
      }
    }
    return res;
  }

  // Bestandspruefung in Portionen. mode "enforce" blendet aus/loescht, sonst nur Markierung "flagged".
  async function sweep({ cursor, mode, profilesPerCall = 40, maxAnalyzed = 8 }) {
    const enforce = mode === 'enforce';
    const cur = cursor ? '&id=gt.' + encodeURIComponent(cursor) : '';
    const { data } = await rest('profiles?avatar_url=not.is.null' + cur + '&order=id.asc&limit=' + profilesPerCall + '&select=' + profileSel);
    const list = Array.isArray(data) ? data : [];
    const hashes = await loadHashes();
    const total = { analyzed: 0, flagged: 0, removed: 0, errors: 0 };
    let last = cursor || null;
    let heavyStop = false;
    for (const p of list) {
      if (total.analyzed >= maxAnalyzed) { heavyStop = true; break; }
      const r = await checkProfile(p, enforce, hashes);
      total.analyzed += r.analyzed; total.flagged += r.flagged; total.removed += r.removed; total.errors += r.errors;
      last = p.id;
    }
    return { ...total, cursor: last, done: !heavyStop && list.length < profilesPerCall };
  }

  // offene Faelle mit Profil und Original-Profil
  async function list() {
    const { data } = await rest('photo_checks?status=in.(flagged,hold)&order=created_at.asc&limit=100&select=*');
    const items = Array.isArray(data) ? data : [];
    const ids = Array.from(new Set(items.flatMap((i) => [i.profile_id, i.dup_profile_id]).filter(Boolean)));
    const profs = {};
    if (ids.length) {
      const pr = await rest('profiles?id=in.(' + ids.join(',') + ')&select=id,name,city,avatar_url,banned');
      (Array.isArray(pr.data) ? pr.data : []).forEach((p) => { profs[p.id] = p; });
    }
    return items.map((i) => ({ ...i, profile: profs[i.profile_id] || null, dup_profile: profs[i.dup_profile_id] || null }));
  }

  // Entscheidung des Admins: approve = behalten (ggf. wieder einblenden), reject = loeschen
  async function review(id, decision) {
    const { data } = await rest('photo_checks?id=eq.' + Number(id) + '&select=*');
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return { status: 404, body: { error: 'Eintrag nicht gefunden' } };
    const now = new Date().toISOString();
    if (decision === 'approve') {
      if (row.status === 'hold') await restore(row.profile_id, row.kind, row.url);
      await rest('photo_checks?id=eq.' + row.id, { ...PATCH_MIN, body: JSON.stringify({ status: 'approved', reviewed_at: now }) });
      return { status: 200, body: { ok: true } };
    }
    if (decision === 'reject') {
      await hide(row.profile_id, row.kind, row.url);
      await deleteFile(row.url);
      await rest('photo_checks?id=eq.' + row.id, { ...PATCH_MIN, body: JSON.stringify({ status: 'removed', reviewed_at: now }) });
      return { status: 200, body: { ok: true } };
    }
    return { status: 400, body: { error: 'decision muss approve oder reject sein' } };
  }

  // Meldung ueber ein Profil speichern (einmal je Melder und Profil)
  async function report(reporterId, { reported_id, reported_name, reason }) {
    const rid = String(reported_id || '');
    if (!rid) return { status: 400, body: { error: 'reported_id fehlt' } };
    const ex = await rest('reports?reporter_id=eq.' + reporterId + '&reported_id=eq.' + encodeURIComponent(rid) + '&select=id&limit=1');
    if (ex.ok && Array.isArray(ex.data) && ex.data.length) return { status: 200, body: { ok: true, already: true } };
    const ins = await rest('reports', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        reporter_id: reporterId,
        reported_id: rid,
        reported_name: String(reported_name || '').slice(0, 120),
        reason: String(reason || 'Gemeldet aus Profil').slice(0, 300),
      }),
    });
    if (!ins.ok) return { status: 500, body: { ok: false, error: 'Meldung konnte nicht gespeichert werden', detail: ins.data } };
    return { status: 200, body: { ok: true } };
  }

  return { hide, restore, loadHashes, checkProfile, sweep, list, review, report };
}
