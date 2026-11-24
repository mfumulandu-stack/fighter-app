import { matchDistanceKm, effectiveCoords, cityCoords } from './geoDist';

const BERLIN = { lat: 52.52, lon: 13.405 };
const me = { city: 'Berlin', ...BERLIN };

test('Muenchen mit Berlin-Koordinaten (IP-Fehler) zaehlt als Muenchen, nicht als nah', () => {
  const d = matchDistanceKm(me, { city: 'München', ...BERLIN });
  expect(d).toBeGreaterThan(450);
  expect(d).toBeLessThan(560);
});
test('Berliner mit passenden Koordinaten: nah', () => {
  expect(matchDistanceKm(me, { city: 'Berlin', lat: 52.5, lon: 13.4 })).toBeLessThan(10);
});
test('GPS im Umland (unter 100 km von der Stadt): Koordinaten zaehlen', () => {
  const potsdam = { city: 'Berlin', lat: 52.39, lon: 13.06 };
  expect(effectiveCoords(potsdam)).toEqual({ lat: 52.39, lon: 13.06 });
  expect(matchDistanceKm(me, potsdam)).toBeLessThan(40);
});
test('eigene Koordinaten falsch (IP in Muenchen), Stadt Berlin: Berlin zaehlt', () => {
  const myWrong = { city: 'Berlin', lat: 48.137, lon: 11.576 };
  expect(matchDistanceKm(myWrong, { city: 'Berlin', ...BERLIN })).toBeLessThan(5);
});
test('nur Stadt, keine Koordinaten: Stadt-Koordinaten', () => {
  const d = matchDistanceKm({ city: 'Berlin' }, { city: 'Hamburg' });
  expect(d).toBeGreaterThan(200);
  expect(d).toBeLessThan(330);
});
test('unbekannte Stadt mit Koordinaten: Koordinaten wie bisher', () => {
  expect(matchDistanceKm(me, { city: 'Kleinstadt-XY', lat: 52.6, lon: 13.5 })).toBeLessThan(20);
});
test('weder Stadt noch Koordinaten: 9999', () => {
  expect(matchDistanceKm(me, { city: 'Kleinstadt-XY' })).toBe(9999);
  expect(matchDistanceKm(me, {})).toBe(9999);
});
test('Gross-/Kleinschreibung der Stadt egal', () => {
  expect(cityCoords('berlin')).toEqual(cityCoords('Berlin'));
});
