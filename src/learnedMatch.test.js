import { featuresOf, learnPrefs, learnedBonusKm, samplesFromSwipes, MAX_KM, MIN_SWIPES } from './learnedMatch';

const me = { weight: 75, age: 28, fights: 6, gym: 'Bujin Gym' };
const F = (over) => ({ weight: 75, age: 28, wins: 3, losses: 3, draws: 0, gym: 'Anderes Gym', ...over });
const feat = (f, ctx) => featuresOf(me, f, ctx);

// Nutzer mag gleichen Stil aus der Naehe, ueberspringt den Rest
function history(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const good = i % 2 === 0;
    out.push({
      features: feat(F({ weight: good ? 75 : 95, age: good ? 27 : 45 }), { styleRel: good ? 'same' : 'other', dist: good ? 8 : 300 }),
      y: good ? 1 : 0,
    });
  }
  return out;
}

const GOOD = () => feat(F({ weight: 75, age: 27 }), { styleRel: 'same', dist: 8 });
const BAD = () => feat(F({ weight: 95, age: 45 }), { styleRel: 'other', dist: 300 });

test('zu wenige Swipes: aus, Bonus 0', () => {
  const p = learnPrefs(history(MIN_SWIPES - 2));
  expect(p.active).toBe(false);
  expect(learnedBonusKm(p, GOOD())).toBe(0);
});
test('nur Likes (keine Passes): aus', () => {
  const only = history(60).map((s) => ({ ...s, y: 1 }));
  expect(learnPrefs(only).active).toBe(false);
});
test('genug Swipes: Wunschtyp bekommt Bonus (negativ = besser), Gegenteil Malus', () => {
  const p = learnPrefs(history(80));
  expect(p.active).toBe(true);
  expect(learnedBonusKm(p, GOOD())).toBeLessThan(-5);
  expect(learnedBonusKm(p, BAD())).toBeGreaterThan(5);
});
test('Bonus ist immer auf +-MAX_KM gedeckelt', () => {
  const p = learnPrefs(history(400));
  [GOOD(), BAD()].forEach((f) => expect(Math.abs(learnedBonusKm(p, f))).toBeLessThanOrEqual(MAX_KM));
});
test('Einfluss waechst mit der Zahl der Swipes', () => {
  const a = Math.abs(learnedBonusKm(learnPrefs(history(40)), GOOD()));
  const b = Math.abs(learnedBonusKm(learnPrefs(history(160)), GOOD()));
  expect(b).toBeGreaterThan(a);
});
test('Bonus kann keinen 500-km-Unterschied ausgleichen', () => {
  const p = learnPrefs(history(400));
  const nearBad = learnedBonusKm(p, BAD());
  const farGood = learnedBonusKm(p, GOOD());
  // Score = km + Bonus: Berlin (0 km, Malus) bleibt vor Muenchen (500 km, Bonus)
  expect(0 + nearBad).toBeLessThan(500 + farGood);
});
test('kein Muster (50/50 zufaellig): Bonus nahe 0', () => {
  const mixed = [];
  for (let i = 0; i < 80; i++) mixed.push({ features: feat(F({}), { styleRel: i % 4 < 2 ? 'same' : 'other', dist: 8 }), y: (i * 7) % 2 });
  const p = learnPrefs(mixed);
  expect(Math.abs(learnedBonusKm(p, GOOD()))).toBeLessThan(10);
});
test('unbekannte Merkmale (kein Gewicht/Alter/Entfernung): kein Absturz', () => {
  const p = learnPrefs(history(80));
  const f = featuresOf({}, {}, { styleRel: 'other', dist: 9999 });
  expect(Number.isFinite(learnedBonusKm(p, f))).toBe(true);
});
test('samplesFromSwipes: like=1, pass=0, unbekannte Profile werden uebersprungen', () => {
  const swipes = [
    { target_id: 'a', direction: 'like' },
    { target_id: 'b', direction: 'pass' },
    { target_id: 'x', direction: 'like' },
    { target_id: 'a', direction: 'seen' },
  ];
  const byId = { a: F({}), b: F({}) };
  const s = samplesFromSwipes(swipes, byId, (p) => feat(p, { styleRel: 'same', dist: 5 }));
  expect(s.map((x) => x.y)).toEqual([1, 0]);
});
test('featuresOf: Gleiches Gym und Entfernungsstufen', () => {
  expect(feat(F({ gym: 'bujin gym' }), { styleRel: 'same', dist: 3 }).gym).toBe('same');
  expect(feat(F({}), { styleRel: 'same', dist: 3 }).dist).toBe('d15');
  expect(feat(F({}), { styleRel: 'same', dist: 120 }).dist).toBe('d150');
  expect(feat(F({}), { styleRel: 'same', dist: 9999 }).dist).toBe('dunk');
});
