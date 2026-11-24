/**
 * @jest-environment node
 */
// Testet die Foto-Pruefung (pHash-Duplikate, Moderation, Ausblenden/Loeschen,
// Admin-Entscheidung) mit einer nachgebauten Datenbank - ohne Netzwerk.
import {
  HOLD_HAMMING,
  MAX_HAMMING,
  TH,
  decide,
  findDuplicate,
  grayFromRgba,
  hammingHex,
  interpretModeration,
  isOwnPhotoUrl,
  makeEngine,
  normUrl,
  parseGallery,
  phashFromGray,
  photosOf,
  storagePathFromUrl,
} from '../supabase/functions/check-photos/logic.js';

const BASE = 'https://x.supabase.co/storage/v1/object/public/avatars/';

// ── Kuenstliche "Fotos" ───────────────────────────────────────────────────
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function makeImage(w, h, seed) {
  const rnd = lcg(seed);
  const px = new Uint8ClampedArray(w * h * 4);
  const fx = 1 + rnd() * 3, fy = 1 + rnd() * 3, ph = rnd() * 6;
  const blobs = [];
  for (let i = 0; i < 6; i++) blobs.push({ x: rnd() * w, y: rnd() * h, r: 10 + rnd() * Math.min(w, h) / 3, c: [rnd() * 255, rnd() * 255, rnd() * 255] });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const base = 128 + 90 * Math.sin((x / w) * fx * 6.28 + ph) * Math.cos((y / h) * fy * 6.28);
      let r = base, g = base * 0.9, b = base * 0.8;
      for (const bl of blobs) {
        const d = Math.hypot(x - bl.x, y - bl.y);
        if (d < bl.r) { r = bl.c[0]; g = bl.c[1]; b = bl.c[2]; }
      }
      px[p] = r; px[p + 1] = g; px[p + 2] = b; px[p + 3] = 255;
    }
  }
  return { px, w, h };
}
// Verkleinern/Vergroessern (Flaechenmittel je Kanal) + Helligkeit + Rauschen = "Re-Upload"
function reupload(img, nw, nh, bright, noise, seed) {
  const rnd = lcg(seed);
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(img.w - 1, Math.floor((x * img.w) / nw));
      const sy = Math.min(img.h - 1, Math.floor((y * img.h) / nh));
      const p = (sy * img.w + sx) * 4, q = (y * nw + x) * 4;
      for (let c = 0; c < 3; c++) out[q + c] = img.px[p + c] + bright + (rnd() - 0.5) * 2 * noise;
      out[q + 3] = 255;
    }
  }
  return { px: out, w: nw, h: nh };
}
const hashOfImg = (img) => phashFromGray(grayFromRgba(img.px, img.w, img.h));

// ── Adressen und Fotos eines Profils ──────────────────────────────────────
describe('Adressen', () => {
  test('normUrl entfernt ?t=...', () => {
    expect(normUrl(BASE + 'a.jpg?t=123')).toBe(BASE + 'a.jpg');
    expect(normUrl(null)).toBe('');
  });
  test('storagePathFromUrl und isOwnPhotoUrl', () => {
    expect(storagePathFromUrl(BASE + 'fighter_1.jpg?t=5')).toBe('fighter_1.jpg');
    expect(storagePathFromUrl('https://fremd.de/a.jpg')).toBe(null);
    expect(isOwnPhotoUrl(BASE + 'x.jpg')).toBe(true);
    expect(isOwnPhotoUrl('https://instagram.com/x.jpg')).toBe(false);
  });
  test('parseGallery: Array, JSON-Text, Muell', () => {
    expect(parseGallery(['a', 'b'])).toEqual(['a', 'b']);
    expect(parseGallery('["a","b"]')).toEqual(['a', 'b']);
    expect(parseGallery('kaputt')).toEqual([]);
    expect(parseGallery(null)).toEqual([]);
  });
  test('photosOf: Profil-, Trainer- und Galeriefotos, fremde Adressen werden ignoriert', () => {
    const p = { avatar_url: BASE + 'a.jpg?t=1', coach_avatar_url: BASE + 'c.jpg', gallery: [BASE + 'g1.jpg', 'https://fremd.de/g.jpg'] };
    expect(photosOf(p)).toEqual([
      { kind: 'avatar', url: BASE + 'a.jpg' },
      { kind: 'coach', url: BASE + 'c.jpg' },
      { kind: 'gallery', url: BASE + 'g1.jpg' },
    ]);
    expect(photosOf(null)).toEqual([]);
  });
});

// ── pHash ─────────────────────────────────────────────────────────────────
describe('pHash', () => {
  test('dasselbe Bild nach Verkleinern, Aufhellen und Rauschen: Abstand klein', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const orig = makeImage(320, 240, seed);
      const copy = reupload(orig, 160, 120, 12, 6, seed + 100);
      const d = hammingHex(hashOfImg(orig).hash, hashOfImg(copy).hash);
      expect(d).toBeLessThanOrEqual(MAX_HAMMING);
    }
  });
  test('verschiedene Bilder: Abstand deutlich ueber der Schwelle', () => {
    const hs = [11, 12, 13, 14, 15, 16].map((s) => hashOfImg(makeImage(320, 240, s)).hash);
    for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
      expect(hammingHex(hs[i], hs[j])).toBeGreaterThan(MAX_HAMMING + 4);
    }
  });
  test('einfarbiges Bild: kein Hash (keine Fehlalarme)', () => {
    const flat = { px: new Uint8ClampedArray(64 * 64 * 4).fill(200), w: 64, h: 64 };
    expect(hashOfImg(flat).hash).toBe(null);
  });
  test('Hash hat 16 Hex-Zeichen; hammingHex-Randfaelle', () => {
    const h = hashOfImg(makeImage(200, 200, 7)).hash;
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(hammingHex(h, h)).toBe(0);
    expect(hammingHex('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hammingHex(null, h)).toBe(64);
    expect(hammingHex('xyz', 'abc')).toBe(64);
  });
  test('findDuplicate: eigenes Profil zaehlt nicht, naechster Treffer gewinnt', () => {
    const h = '00000000000000ff';
    const c = [
      { profile_id: 'me', phash: h },
      { profile_id: 'far', phash: 'ffffffffffffffff' },
      { profile_id: 'near', phash: '00000000000000fc' },
      { profile_id: 'same', phash: h },
    ];
    expect(findDuplicate(h, 'me', c)).toEqual({ profile_id: 'same', dist: 0 });
    expect(findDuplicate(h, 'me', [c[0], c[1]])).toBe(null);
    expect(findDuplicate(null, 'me', c)).toBe(null);
  });
});

// ── Moderation und Entscheidung ───────────────────────────────────────────
describe('Moderation', () => {
  test('oberkoerperfreier Kaempfer ("suggestive") loest NICHTS aus', () => {
    const mod = interpretModeration({ status: 'success', nudity: { sexual_activity: 0.01, sexual_display: 0.01, erotica: 0.02, very_suggestive: 0.1, suggestive: 0.92, mildly_suggestive: 0.97, none: 0.02 } });
    expect(decide({ mod, dup: null, kind: 'avatar', enforce: true }).status).toBe('ok');
  });
  test('interpretModeration: fehlende Modelle -> null, Werte werden begrenzt', () => {
    expect(interpretModeration({})).toEqual({ explicit: null, erotica: null, gore: null, offensive: null, ai: null });
    const m = interpretModeration({ nudity: { sexual_activity: 0.2, sexual_display: 0.95 }, gore: { prob: 7 }, offensive: { nazi: 0.9, middle_finger: 0.99 }, type: { ai_generated: 0.5 } });
    expect(m.explicit).toBe(0.95);
    expect(m.gore).toBe(1);
    expect(m.offensive).toBe(0.9); // middle_finger zaehlt nicht
    expect(m.ai).toBe(0.5);
  });
  test('explizit: im Pruefmodus nur markiert, sonst geloescht', () => {
    const mod = { explicit: 0.97, erotica: null, gore: null, offensive: null, ai: null };
    expect(decide({ mod, dup: null, kind: 'avatar', enforce: true })).toEqual({ status: 'removed', reasons: ['explicit'] });
    expect(decide({ mod, dup: null, kind: 'avatar', enforce: false })).toEqual({ status: 'flagged', reasons: ['explicit'] });
  });
  test('erotica, gore, offensive, KI: nur ausblenden (hold), nie loeschen', () => {
    const base = { explicit: null, erotica: null, gore: null, offensive: null, ai: null };
    expect(decide({ mod: { ...base, erotica: TH.erotica }, kind: 'gallery', enforce: true }).status).toBe('hold');
    expect(decide({ mod: { ...base, gore: 0.99 }, kind: 'gallery', enforce: true }).status).toBe('hold');
    expect(decide({ mod: { ...base, offensive: 0.9 }, kind: 'gallery', enforce: true }).status).toBe('hold');
    expect(decide({ mod: { ...base, ai: 0.95 }, kind: 'avatar', enforce: true })).toEqual({ status: 'hold', reasons: ['ai_generated'] });
  });
  test('KI-Erkennung nur bei Profil-/Trainerfoto, nicht in der Galerie', () => {
    const mod = { explicit: null, erotica: null, gore: null, offensive: null, ai: 0.99 };
    expect(decide({ mod, kind: 'gallery', enforce: true }).status).toBe('ok');
    expect(decide({ mod, kind: 'coach', enforce: true }).status).toBe('hold');
  });
  test('Duplikat knapp (3-4 Bits): nur markiert, Foto bleibt sichtbar', () => {
    expect(decide({ mod: null, dup: { profile_id: 'x', dist: HOLD_HAMMING + 1 }, kind: 'avatar', enforce: true })).toEqual({ status: 'flagged', reasons: ['duplicate'] });
    expect(decide({ mod: null, dup: { profile_id: 'x', dist: HOLD_HAMMING }, kind: 'avatar', enforce: true }).status).toBe('hold');
  });
  test('Duplikat: hold bzw. flagged; ohne Moderation moeglich', () => {
    expect(decide({ mod: null, dup: { profile_id: 'x', dist: 2 }, kind: 'avatar', enforce: true })).toEqual({ status: 'hold', reasons: ['duplicate'] });
    expect(decide({ mod: null, dup: { profile_id: 'x', dist: 2 }, kind: 'avatar', enforce: false }).status).toBe('flagged');
    expect(decide({ mod: null, dup: null, kind: 'avatar', enforce: true }).status).toBe('ok');
  });
});

// ── Ablauf mit nachgebauter Datenbank ─────────────────────────────────────
function makeEnv({ profiles = [], images = {}, moderation = {}, moderationOn = false } = {}) {
  const db = { profiles: profiles.map((p) => ({ ...p })), photo_checks: [], reports: [] };
  const calls = { hashOf: 0, moderate: 0, deleted: [] };
  let seq = 1;
  const match = (row, key, cond) => {
    const v = row[key];
    if (cond.startsWith('eq.')) return String(v) === cond.slice(3);
    if (cond === 'not.is.null') return v !== null && v !== undefined;
    if (cond.startsWith('gt.')) return String(v) > cond.slice(3);
    if (cond.startsWith('in.(')) return cond.slice(4, -1).split(',').includes(String(v));
    throw new Error('Filter nicht nachgebaut: ' + cond);
  };
  async function rest(path, init = {}) {
    const [table, qs = ''] = path.split('?');
    const q = new URLSearchParams(qs);
    const method = init.method || 'GET';
    const rows = db[table];
    const filters = [...q.entries()].filter(([k]) => !['select', 'order', 'limit', 'on_conflict'].includes(k));
    const sel = () => rows.filter((r) => filters.every(([k, c]) => match(r, k, c)));
    if (method === 'GET') {
      let out = sel();
      const ord = q.get('order');
      if (ord) { const [k, dir] = ord.split('.'); out = [...out].sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : 1) * (dir === 'desc' ? -1 : 1)); }
      if (q.get('limit')) out = out.slice(0, Number(q.get('limit')));
      return { ok: true, status: 200, data: out.map((r) => ({ ...r })) };
    }
    if (method === 'PATCH') { sel().forEach((r) => Object.assign(r, JSON.parse(init.body))); return { ok: true, status: 204, data: null }; }
    if (method === 'POST') {
      const body = JSON.parse(init.body);
      if (table === 'photo_checks') {
        const ex = rows.find((r) => r.profile_id === body.profile_id && r.url === body.url);
        if (ex) Object.assign(ex, body); else rows.push({ id: seq++, created_at: new Date(2026, 0, seq).toISOString(), ...body });
      } else rows.push({ id: seq++, ...body });
      return { ok: true, status: 201, data: null };
    }
    throw new Error('Methode nicht nachgebaut');
  }
  const env = {
    rest,
    deleteFile: async (u) => { calls.deleted.push(u); },
    hashOf: async (u) => { calls.hashOf++; return images[u] ? { hash: images[u] } : null; },
    moderate: async (u) => {
      calls.moderate++;
      if (!moderationOn) return null;
      const m = moderation[u];
      if (m === 'ERROR') throw new Error('Dienst nicht erreichbar');
      return m || { explicit: 0, erotica: 0, gore: null, offensive: 0, ai: 0 };
    },
    moderationOn,
  };
  return { db, calls, engine: makeEngine(env) };
}

const U = (n) => BASE + n + '.jpg';
const HA = hashOfImg(makeImage(320, 240, 21)).hash;
const HB = hashOfImg(makeImage(320, 240, 22)).hash;
const HA_COPY = hashOfImg(reupload(makeImage(320, 240, 21), 160, 120, 8, 5, 9)).hash;
const prof = (id, extra) => ({ id, avatar_url: null, coach_avatar_url: null, gallery: [], ...extra });

describe('Ablauf', () => {
  test('neues, sauberes Foto: Zeile mit Status ok, nichts wird ausgeblendet', async () => {
    const { db, engine } = makeEnv({ profiles: [prof('a', { avatar_url: U('a') + '?t=1' })], images: { [U('a')]: HA } });
    const r = await engine.checkProfile(db.profiles[0], true, await engine.loadHashes());
    expect(r).toMatchObject({ analyzed: 1, flagged: 0, hidden: [], removed: 0 });
    expect(db.photo_checks).toHaveLength(1);
    expect(db.photo_checks[0]).toMatchObject({ profile_id: 'a', url: U('a'), status: 'ok', phash: HA });
    expect(db.profiles[0].avatar_url).toBe(U('a') + '?t=1');
  });

  test('zweites Profil mit demselben Foto (neu komprimiert): ausgeblendet, Original bleibt', async () => {
    const { db, engine } = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b') })],
      images: { [U('a')]: HA, [U('b')]: HA_COPY },
    });
    const hashes = await engine.loadHashes();
    await engine.checkProfile(db.profiles[0], true, hashes);
    const r = await engine.checkProfile(db.profiles[1], true, hashes);
    expect(r.hidden).toEqual([{ kind: 'avatar', url: U('b') }]);
    expect(db.profiles[1].avatar_url).toBe(null);
    expect(db.profiles[0].avatar_url).toBe(U('a'));
    const row = db.photo_checks.find((x) => x.profile_id === 'b');
    expect(row).toMatchObject({ status: 'hold', reasons: ['duplicate'], dup_profile_id: 'a' });
  });

  test('Admin gibt frei: Foto kommt zurueck; Admin lehnt ab: Datei geloescht', async () => {
    const mk = () => makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b') })],
      images: { [U('a')]: HA, [U('b')]: HA_COPY },
    });
    let t = mk();
    let hashes = await t.engine.loadHashes();
    await t.engine.checkProfile(t.db.profiles[0], true, hashes);
    await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    const id = t.db.photo_checks.find((x) => x.profile_id === 'b').id;
    expect((await t.engine.list()).map((i) => i.id)).toEqual([id]);
    expect((await t.engine.list())[0].dup_profile.id).toBe('a');
    expect(await t.engine.review(id, 'approve')).toEqual({ status: 200, body: { ok: true } });
    expect(t.db.profiles[1].avatar_url).toBe(U('b'));
    expect(t.db.photo_checks.find((x) => x.id === id).status).toBe('approved');
    expect(t.calls.deleted).toEqual([]);

    t = mk();
    hashes = await t.engine.loadHashes();
    await t.engine.checkProfile(t.db.profiles[0], true, hashes);
    await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    const id2 = t.db.photo_checks.find((x) => x.profile_id === 'b').id;
    await t.engine.review(id2, 'reject');
    expect(t.calls.deleted).toEqual([U('b')]);
    expect(t.db.profiles[1].avatar_url).toBe(null);
    expect(t.db.photo_checks.find((x) => x.id === id2).status).toBe('removed');
  });

  test('Freigabe ueberschreibt kein neues Foto', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b') })],
      images: { [U('a')]: HA, [U('b')]: HA_COPY },
    });
    const hashes = await t.engine.loadHashes();
    await t.engine.checkProfile(t.db.profiles[0], true, hashes);
    await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    t.db.profiles[1].avatar_url = U('neu'); // Nutzer hat inzwischen ein anderes Foto hochgeladen
    await t.engine.review(t.db.photo_checks.find((x) => x.profile_id === 'b').id, 'approve');
    expect(t.db.profiles[1].avatar_url).toBe(U('neu'));
  });

  test('Bestandspruefung (Modus report): markiert nur, Foto bleibt sichtbar', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b') })],
      images: { [U('a')]: HA, [U('b')]: HA_COPY },
    });
    const r = await t.engine.sweep({ mode: 'report' });
    expect(r).toMatchObject({ analyzed: 2, flagged: 1, removed: 0, done: true });
    expect(t.db.profiles[1].avatar_url).toBe(U('b'));
    expect(t.db.photo_checks.find((x) => x.profile_id === 'b').status).toBe('flagged');
  });

  test('Bestandspruefung in Portionen: Cursor laeuft durch, am Ende done', async () => {
    const t = makeEnv({
      profiles: ['p1', 'p2', 'p3'].map((id, i) => prof(id, { avatar_url: U(id) })),
      images: { [U('p1')]: HA, [U('p2')]: HB, [U('p3')]: hashOfImg(makeImage(320, 240, 33)).hash },
    });
    const r1 = await t.engine.sweep({ mode: 'report', maxAnalyzed: 2 });
    expect(r1).toMatchObject({ analyzed: 2, cursor: 'p2', done: false });
    const r2 = await t.engine.sweep({ mode: 'report', cursor: r1.cursor, maxAnalyzed: 2 });
    expect(r2).toMatchObject({ analyzed: 1, done: true });
    const r3 = await t.engine.sweep({ mode: 'report', maxAnalyzed: 2 }); // alles schon geprueft
    expect(r3.analyzed).toBe(0);
  });

  test('explizites Foto: sofort entfernt und Datei geloescht', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') })],
      images: { [U('a')]: HA },
      moderationOn: true,
      moderation: { [U('a')]: { explicit: 0.98, erotica: 0.9, gore: null, offensive: 0, ai: 0 } },
    });
    const r = await t.engine.checkProfile(t.db.profiles[0], true, []);
    expect(r).toMatchObject({ removed: 1, hidden: [{ kind: 'avatar', url: U('a') }] });
    expect(t.calls.deleted).toEqual([U('a')]);
    expect(t.db.profiles[0].avatar_url).toBe(null);
    expect(t.db.photo_checks[0]).toMatchObject({ status: 'removed', reasons: ['explicit'], moderated: true });
  });

  test('Moderations-Dienst faellt aus: keine Zeile, Foto bleibt, naechster Lauf versucht es erneut', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') })],
      images: { [U('a')]: HA },
      moderationOn: true,
      moderation: { [U('a')]: 'ERROR' },
    });
    const r = await t.engine.checkProfile(t.db.profiles[0], true, []);
    expect(r).toMatchObject({ errors: 1, analyzed: 1, hidden: [] });
    expect(t.db.photo_checks).toHaveLength(0);
    expect(t.db.profiles[0].avatar_url).toBe(U('a'));
  });

  test('ohne Moderation geprueftes Foto wird nachgeholt, sobald sie eingerichtet ist', async () => {
    const t = makeEnv({ profiles: [prof('a', { avatar_url: U('a') })], images: { [U('a')]: HA } });
    await t.engine.checkProfile(t.db.profiles[0], true, []);
    expect(t.db.photo_checks[0].moderated).toBe(false);
    const t2 = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') })],
      images: { [U('a')]: HA },
      moderationOn: true,
      moderation: { [U('a')]: { explicit: 0.99, erotica: 0, gore: null, offensive: 0, ai: 0 } },
    });
    t2.db.photo_checks.push({ id: 99, profile_id: 'a', kind: 'avatar', url: U('a'), phash: HA, status: 'ok', moderated: false });
    const r = await t2.engine.checkProfile(t2.db.profiles[0], true, []);
    expect(r.removed).toBe(1);
    expect(t2.calls.hashOf).toBe(0); // Hash war schon da
    expect(t2.db.photo_checks).toHaveLength(1);
  });

  test('gleiches Foto als Profilbild und in der eigenen Galerie ist kein Duplikat', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a'), gallery: [U('g')] })],
      images: { [U('a')]: HA, [U('g')]: HA_COPY },
    });
    const r = await t.engine.checkProfile(t.db.profiles[0], true, await t.engine.loadHashes());
    expect(r).toMatchObject({ analyzed: 2, flagged: 0, hidden: [] });
  });

  test('Galerie: nur das auffaellige Foto wird entfernt', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b'), gallery: [U('g1'), U('g2')] })],
      images: { [U('a')]: HA, [U('b')]: HB, [U('g1')]: hashOfImg(makeImage(320, 240, 44)).hash, [U('g2')]: HA_COPY },
    });
    const hashes = await t.engine.loadHashes();
    await t.engine.checkProfile(t.db.profiles[0], true, hashes);
    const r = await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    expect(r.hidden).toEqual([{ kind: 'gallery', url: U('g2') }]);
    expect(t.db.profiles[1].gallery).toEqual([U('g1')]);
    expect(t.db.profiles[1].avatar_url).toBe(U('b'));
  });

  test('App spielt ein ausgeblendetes Foto erneut ein: wird ohne neue Analyse wieder ausgeblendet', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b') })],
      images: { [U('a')]: HA, [U('b')]: HA_COPY },
    });
    const hashes = await t.engine.loadHashes();
    await t.engine.checkProfile(t.db.profiles[0], true, hashes);
    await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    t.db.profiles[1].avatar_url = U('b') + '?t=999'; // alter Stand aus der App wird zurueckgeschrieben
    const before = t.calls.hashOf;
    const r = await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    expect(r.hidden).toEqual([{ kind: 'avatar', url: U('b') }]);
    expect(r.analyzed).toBe(0);
    expect(t.calls.hashOf).toBe(before);
    expect(t.db.profiles[1].avatar_url).toBe(null);
  });

  test('fast einfarbiges Foto: kein Hash, kein Duplikat-Alarm', async () => {
    const t = makeEnv({
      profiles: [prof('a', { avatar_url: U('a') }), prof('b', { avatar_url: U('b') })],
      images: { [U('a')]: null, [U('b')]: null },
    });
    const hashes = await t.engine.loadHashes();
    await t.engine.checkProfile(t.db.profiles[0], true, hashes);
    const r = await t.engine.checkProfile(t.db.profiles[1], true, hashes);
    expect(r.flagged).toBe(0);
  });

  test('review: unbekannte ID und falsche Entscheidung', async () => {
    const t = makeEnv({});
    expect((await t.engine.review(5, 'approve')).status).toBe(404);
    t.db.photo_checks.push({ id: 5, profile_id: 'a', kind: 'avatar', url: U('a'), status: 'hold' });
    expect((await t.engine.review(5, 'vielleicht')).status).toBe(400);
  });

  test('Meldung wird gespeichert, doppelt melden legt nichts neu an', async () => {
    const t = makeEnv({});
    const r1 = await t.engine.report('u1', { reported_id: 'p9', reported_name: 'Max', reason: 'Fake-Foto' });
    expect(r1).toEqual({ status: 200, body: { ok: true } });
    expect(t.db.reports).toHaveLength(1);
    expect(t.db.reports[0]).toMatchObject({ reporter_id: 'u1', reported_id: 'p9', reported_name: 'Max', reason: 'Fake-Foto' });
    const r2 = await t.engine.report('u1', { reported_id: 'p9' });
    expect(r2.body.already).toBe(true);
    expect(t.db.reports).toHaveLength(1);
    expect((await t.engine.report('u1', {})).status).toBe(400);
  });
});
