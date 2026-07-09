import { calculateFightScore, sortFightersByRank } from './matchScore';

describe('calculateFightScore', () => {
  test('berechnet Siege*3 - Niederlagen*2 + Unentschieden', () => {
    expect(calculateFightScore(5, 2, 1)).toBe(5 * 3 - 2 * 2 + 1); // 12
  });

  test('behandelt fehlende Werte als 0', () => {
    expect(calculateFightScore(undefined, undefined, undefined)).toBe(0);
    expect(calculateFightScore(null, null, null)).toBe(0);
  });

  test('reiner Sieg-Rekord ergibt positiven Score', () => {
    expect(calculateFightScore(10, 0, 0)).toBe(30);
  });

  test('reiner Niederlagen-Rekord ergibt negativen Score', () => {
    expect(calculateFightScore(0, 10, 0)).toBe(-20);
  });
});

describe('sortFightersByRank', () => {
  // REGRESSIONSTEST: Genau dieser Fall ist in Produktion schiefgelaufen -
  // die App zeigte die SCHLECHTESTEN statt besten Fighter oben an, weil
  // die Sortierrichtung vertauscht war. Dieser Test waere sofort
  // fehlgeschlagen und haette den Fehler vor dem Live-Gang gefunden.
  test('sortiert den BESTEN Fighter an Position 0, nicht den schlechtesten', () => {
    const fighters = [
      { name: 'Schlechtester', wins: 1, losses: 8, draws: 0 },
      { name: 'Bester', wins: 15, losses: 1, draws: 0 },
      { name: 'Mittelmaessig', wins: 5, losses: 5, draws: 0 },
    ];
    const sorted = sortFightersByRank(fighters);
    expect(sorted[0].name).toBe('Bester');
    expect(sorted[sorted.length - 1].name).toBe('Schlechtester');
  });

  test('sortiert absteigend nach Score ueber mehrere Fighter', () => {
    const fighters = [
      { name: 'A', wins: 3, losses: 0, draws: 0 }, // 9
      { name: 'B', wins: 1, losses: 0, draws: 0 }, // 3
      { name: 'C', wins: 5, losses: 0, draws: 0 }, // 15
    ];
    const sorted = sortFightersByRank(fighters);
    expect(sorted.map((f) => f.name)).toEqual(['C', 'A', 'B']);
  });

  test('veraendert das Original-Array nicht (keine Seiteneffekte)', () => {
    const fighters = [
      { name: 'A', wins: 1, losses: 0, draws: 0 },
      { name: 'B', wins: 5, losses: 0, draws: 0 },
    ];
    const original = [...fighters];
    sortFightersByRank(fighters);
    expect(fighters).toEqual(original);
  });

  test('funktioniert mit leerer Liste', () => {
    expect(sortFightersByRank([])).toEqual([]);
  });
});
