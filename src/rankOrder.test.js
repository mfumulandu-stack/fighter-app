import { rankTier, rankCompare } from './rankOrder';

const F = (name, fights, ver, score) => ({ name, fights, ver, score });
const order = (list) => [...list].sort(rankCompare).map((x) => x.name);

describe('rankTier', () => {
  test('ohne Kaempfe immer ganz unten', () => {
    expect(rankTier(0, 2)).toBe(-1);
    expect(rankTier(0, 0)).toBe(-1);
  });
  test('mit Kaempfen: verifizierter Rekord (Stufe 1 oder 2) vor unverifiziert', () => {
    expect(rankTier(3, 2)).toBe(1);
    expect(rankTier(3, 1)).toBe(1);
    expect(rankTier(3, 0)).toBe(0);
  });
});

describe('rankCompare', () => {
  test('Neuling mit Gym-Code (0-0-0) steht NICHT vor geprueftem Kaempfer', () => {
    expect(order([F('Neuling', 0, 2, 0), F('Kaempfer', 12, 1, 24)])).toEqual(['Kaempfer', 'Neuling']);
  });
  test('Neuling steht auch hinter unverifiziertem Kaempfer mit Bilanz', () => {
    expect(order([F('Neuling', 0, 1, 0), F('Unverifiziert', 2, 0, 3)])).toEqual(['Unverifiziert', 'Neuling']);
  });
  test('echter Kaempfer ohne Gym-Code steht vor Neuling mit 1 Sieg UND Gym-Code', () => {
    expect(order([F('Neuling 1-0 +Gym', 1, 2, 3), F('Profi 20 Kaempfe', 20, 1, 50)])).toEqual(['Profi 20 Kaempfe', 'Neuling 1-0 +Gym']);
  });
  test('unverifizierter Rekord steht immer hinter verifiziertem', () => {
    expect(order([F('erfunden', 30, 0, 90), F('geprueft', 2, 1, 6)])).toEqual(['geprueft', 'erfunden']);
  });
  test('gleiche Punkte: Gym-Code entscheidet', () => {
    expect(order([F('ohneGym', 5, 1, 15), F('mitGym', 5, 2, 15)])).toEqual(['mitGym', 'ohneGym']);
  });
  test('mehr Punkte zuerst', () => {
    expect(order([F('klein', 2, 2, 6), F('gross', 9, 1, 27)])).toEqual(['gross', 'klein']);
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
      F('Neuling 1-0 +Gym', 1, 2, 3),
    ];
    expect(order(list)).toEqual(['Profi', 'NurRekord', 'Neuling 1-0 +Gym', 'Ohne Haken', 'Neu1', 'Neu2']);
  });
});
