import { rankTier, rankCompare } from './rankOrder';

const F = (name, fights, ver, score) => ({ name, fights, ver, score });
const order = (list) => [...list].sort(rankCompare).map((x) => x.name);

describe('rankTier', () => {
  test('ohne Kaempfe immer ganz unten', () => {
    expect(rankTier(0, 2)).toBe(-1);
    expect(rankTier(0, 0)).toBe(-1);
  });
  test('mit Kaempfen zaehlt die Stufe', () => {
    expect(rankTier(3, 2)).toBe(2);
    expect(rankTier(3, 1)).toBe(1);
    expect(rankTier(3, 0)).toBe(0);
  });
});

describe('rankCompare', () => {
  test('Neuling mit Gym-Code (0-0-0, Stufe 2) steht NICHT vor geprueftem Kaempfer ohne Gym-Code', () => {
    const real = F('Kaempfer', 12, 1, 24);
    const newbie = F('Neuling', 0, 2, 0);
    expect(order([newbie, real])).toEqual(['Kaempfer', 'Neuling']);
  });
  test('Neuling steht auch hinter unverifiziertem Kaempfer mit Bilanz', () => {
    expect(order([F('Neuling', 0, 1, 0), F('Unverifiziert', 2, 0, 3)])).toEqual(['Unverifiziert', 'Neuling']);
  });
  test('mit Kaempfen: Stufe vor Punkten (bisheriges Verhalten)', () => {
    const list = [F('A', 20, 0, 60), F('B', 2, 1, 6), F('C', 1, 2, 3)];
    expect(order(list)).toEqual(['C', 'B', 'A']);
  });
  test('gleiche Stufe: mehr Punkte zuerst', () => {
    expect(order([F('klein', 2, 2, 6), F('gross', 9, 2, 27)])).toEqual(['gross', 'klein']);
  });
  test('Neulinge untereinander: Gym-verifiziert zuerst, dann Gurt-Bonus', () => {
    const list = [F('ohneGym', 0, 1, 5), F('mitGym', 0, 2, 0), F('mitGym+Gurt', 0, 2, 4)];
    expect(order(list)).toEqual(['mitGym+Gurt', 'mitGym', 'ohneGym']);
  });
  test('Beispiel Rangliste komplett', () => {
    const list = [
      F('Neu1', 0, 2, 0),
      F('Profi', 30, 2, 80),
      F('NurRekord', 15, 1, 40),
      F('Neu2', 0, 1, 0),
      F('Ohne Haken', 5, 0, 10),
    ];
    expect(order(list)).toEqual(['Profi', 'NurRekord', 'Ohne Haken', 'Neu1', 'Neu2']);
  });
});
