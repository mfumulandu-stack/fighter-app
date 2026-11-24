// Lernendes Matching - persoenlich, auf dem Geraet, aus den EIGENEN Swipes.
//
// Idee: Wer gern Leute mit gleichem Stil aus der Naehe liket und andere ueberspringt,
// bekommt solche Karten weiter vorne. Das ist ein einfaches, nachvollziehbares
// Verfahren (geglaettete Like-Raten je Merkmal, "Naive Bayes"), kein Blackbox-Modell.
//
// Sicherheitsgurte:
//  - erst ab MIN_SWIPES Swipes, mit mindestens MIN_EACH Likes UND MIN_EACH Passes
//  - der Einfluss waechst langsam (voll erst bei FULL_AT Swipes)
//  - der Bonus ist auf +-MAX_KM "Kilometer-Aequivalent" gedeckelt: er sortiert
//    innerhalb der Naehe um, kann aber nie jemanden aus 500 km vor die Heimatstadt ziehen
//  - Geschlechter-Regel und Umkreis-Filter bleiben unberuehrt
//  - nichts wird gespeichert oder an andere gesendet; alles wird aus den
//    Swipes der eigenen Sitzung/Datenbank neu berechnet
export const LEARNED_MATCHING_ON = true;
export const MIN_SWIPES = 30;
export const MIN_EACH = 5;
export const FULL_AT = 120;
export const MAX_KM = 40;
const K = 6; // Glaettung: wenig Daten -> Richtung Durchschnitt
const GROUPS = ['style', 'dist', 'weight', 'age', 'exp', 'gym'];

function bucket(v, steps, far, unknown) {
  if (v == null || Number.isNaN(v)) return unknown;
  for (const [limit, name] of steps) if (v <= limit) return name;
  return far;
}

// me: { weight, age, fights, gym }   f: Profil mit weight, age, wins, losses, draws, gym
// ctx: { styleRel: 'same'|'related'|'other', dist: km }
export function featuresOf(me, f, ctx) {
  const fw = parseInt(f.weight) || 0;
  const fa = parseInt(f.age) || 0;
  const ff = (parseInt(f.wins) || 0) + (parseInt(f.losses) || 0) + (parseInt(f.draws) || 0);
  const wd = me.weight && fw ? Math.abs(me.weight - fw) : null;
  const ad = me.age && fa ? Math.abs(me.age - fa) : null;
  const ed = Math.abs((me.fights || 0) - ff);
  const mg = String(me.gym || '').toLowerCase().trim();
  const fg = String(f.gym || '').toLowerCase().trim();
  const d = ctx && ctx.dist != null && ctx.dist < 9999 ? ctx.dist : null;
  return {
    style: (ctx && ctx.styleRel) || 'other',
    dist: bucket(d, [[15, 'd15'], [50, 'd50'], [150, 'd150']], 'dfar', 'dunk'),
    weight: bucket(wd, [[3, 'w3'], [7, 'w7'], [12, 'w12']], 'wfar', 'wunk'),
    age: bucket(ad, [[2, 'a2'], [5, 'a5'], [10, 'a10']], 'afar', 'aunk'),
    exp: bucket(ed, [[2, 'e2'], [5, 'e5'], [10, 'e10']], 'efar', 'eunk'),
    gym: mg && fg && mg === fg ? 'same' : 'diff',
  };
}

const logit = (p) => Math.log(p / (1 - p));

// samples: [{ features, y }]  y = 1 (Like) oder 0 (Pass)  ->  prefs
export function learnPrefs(samples) {
  const list = Array.isArray(samples) ? samples : [];
  const n = list.length;
  const pos = list.reduce((a, s) => a + (s.y ? 1 : 0), 0);
  const neg = n - pos;
  const active = LEARNED_MATCHING_ON && n >= MIN_SWIPES && pos >= MIN_EACH && neg >= MIN_EACH;
  const prefs = { n, pos, neg, active, conf: Math.min(1, n / FULL_AT), z: {} };
  if (!active) return prefs;
  const base = (pos + 1) / (n + 2);
  const lb = logit(base);
  GROUPS.forEach((g) => {
    const t = {};
    list.forEach((s) => {
      const b = s.features && s.features[g];
      if (b == null) return;
      t[b] = t[b] || { pos: 0, tot: 0 };
      t[b].tot += 1;
      if (s.y) t[b].pos += 1;
    });
    prefs.z[g] = {};
    Object.keys(t).forEach((b) => {
      const rate = (t[b].pos + K * base) / (t[b].tot + K);
      prefs.z[g][b] = logit(rate) - lb;
    });
  });
  return prefs;
}

// Bonus in "km-Aequivalent" fuer den Score (NEGATIV = besser, wie beim bisherigen Score)
export function learnedBonusKm(prefs, features) {
  if (!prefs || !prefs.active || !features) return 0;
  let sum = 0;
  let cnt = 0;
  GROUPS.forEach((g) => {
    const zg = prefs.z[g];
    if (!zg) return;
    const v = zg[features[g]];
    sum += v == null ? 0 : v;
    cnt += 1;
  });
  if (!cnt) return 0;
  const z = Math.max(-1, Math.min(1, sum / cnt));
  return -z * MAX_KM * prefs.conf;
}

// swipes: [{ target_id, direction }]  profilesById: { id: profil }
// featuresFor(profil) -> features   (der Aufrufer kennt Stil/Entfernung relativ zu mir)
export function samplesFromSwipes(swipes, profilesById, featuresFor) {
  const out = [];
  (Array.isArray(swipes) ? swipes : []).forEach((s) => {
    if (!s || (s.direction !== 'like' && s.direction !== 'pass')) return;
    const p = profilesById && profilesById[s.target_id];
    if (!p) return;
    out.push({ features: featuresFor(p), y: s.direction === 'like' ? 1 : 0 });
  });
  return out;
}
