import raw from './data/dachCities.json';
import { norm, normLoose, buildIndex, searchCities, exactCity, nearestCity, distKm } from './cityIndex';

const idx = buildIndex(raw);
const first = (q) => (searchCities(idx, q)[0] || {}).name;

test('norm: Muenchen = München, Munchen als lockere Eingabe', () => {
  expect(norm('München')).toBe('muenchen');
  expect(normLoose('München')).toBe('munchen');
  expect(norm('  Köln ')).toBe('koeln');
});
test('Daten: DACH-Orte vorhanden, Grossstaedte mit deutschen Namen', () => {
  expect(idx.list.length).toBeGreaterThan(2500);
  ['Berlin', 'Hamburg', 'München', 'Köln', 'Wien', 'Zürich', 'Frankfurt', 'Düsseldorf', 'Mönchengladbach', 'Graz', 'Basel'].forEach((n) => expect(exactCity(idx, n)).toBeTruthy());
  expect(exactCity(idx, 'Munich')).toBeNull();
});
test('Suche: Eingabe in verschiedenen Schreibweisen', () => {
  expect(first('berl')).toBe('Berlin');
  expect(first('muenchen')).toBe('München');
  expect(first('munchen')).toBe('München');
  expect(first('münch')).toBe('München');
  expect(first('koeln')).toBe('Köln');
  expect(first('zuerich')).toBe('Zürich');
  expect(first('frankf')).toBe('Frankfurt');
  expect(first('wien')).toBe('Wien');
  expect(first('moenchengl')).toBe('Mönchengladbach');
});
test('Suche: zu kurz oder leer liefert nichts, Limit gilt', () => {
  expect(searchCities(idx, '')).toEqual([]);
  expect(searchCities(idx, 'b')).toEqual([]);
  expect(searchCities(idx, 'ber', 4).length).toBeLessThanOrEqual(4);
});
test('Treffer haben Koordinaten in der richtigen Gegend', () => {
  const m = exactCity(idx, 'München');
  expect(distKm(m.lat, m.lon, 48.137, 11.575)).toBeLessThan(5);
  const b = exactCity(idx, 'Berlin');
  expect(distKm(b.lat, b.lon, 52.52, 13.405)).toBeLessThan(5);
});
test('naechster Ort: Berlin-Mitte -> Berlin, Koeln-Porz -> Koeln (Grossstadt im Umkreis)', () => {
  expect(nearestCity(idx, 52.52, 13.405).name).toBe('Berlin');
  expect(nearestCity(idx, 50.885, 7.05).name).toBe('Köln');
});
test('naechster Ort: mitten im Atlantik -> null', () => {
  expect(nearestCity(idx, 0, 0)).toBeNull();
});
test('Regionen: gleiche Namen lassen sich unterscheiden', () => {
  const neu = searchCities(idx, 'neustadt', 20);
  expect(neu.length).toBeGreaterThan(1);
  expect(new Set(neu.map((c) => c.region)).size).toBeGreaterThan(1);
});
