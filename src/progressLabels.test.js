import { progressLabel, PROGRESS_KEYS } from './progressLabels';
import { profileProgressOf } from './growth';
import { makeL } from './lang';

test('jeder Fortschrittsschritt hat in jeder Sprache einen Text', () => {
  const p = profileProgressOf({});
  const steps = (p && p.steps) || [];
  // Schluessel aus growth.js muessen alle uebersetzt sein
  const keys = steps.length ? steps.map((s) => s.k) : PROGRESS_KEYS;
  keys.forEach((k) => {
    const set = new Set(['DE', 'EN', 'FR', 'ES'].map((l) => progressLabel(k, 'x', makeL(l))));
    expect(set.size).toBe(4);
    expect(set.has('x')).toBe(false);
  });
});

test('unbekannter Schluessel zeigt den Originaltext', () => {
  expect(progressLabel('zzz', 'Original', makeL('FR'))).toBe('Original');
});
