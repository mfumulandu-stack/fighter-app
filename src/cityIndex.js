// Stadt-Auswahl (Autovervollstaendigung) fuer DACH - komplett OFFLINE.
// Daten: GeoNames (CC BY 4.0), Orte ab 5.000 Einwohnern in DE/AT/CH/LI, als
// eigene Datei (src/data/dachCities.json), die erst beim ersten Bedarf geladen
// wird. Es werden keine Eingaben an Dritte gesendet.
// Reine Funktionen (testbar); die Oberflaeche steht in CityPicker.js.

// Eingabe vereinfachen: klein, ae/oe/ue/ss, Akzente weg. "Muenchen" und "München" werden gleich.
export function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// Locker: Umlaute nur ohne Pünktchen ("Munchen", "Koln", "Zurich")
export function normLoose(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// raw: { regions: [...], cities: [[name, cc, lat, lon, pop, regionIdx], ...] }
export function buildIndex(raw) {
  const regions = (raw && raw.regions) || [];
  const list = ((raw && raw.cities) || []).map(([name, cc, lat, lon, pop, ri]) => ({
    name, cc, lat, lon, pop, region: regions[ri] || '', k1: norm(name), k2: normLoose(name),
  }));
  return { list };
}

// Treffer: erst Anfang des Namens (beliebiges Wort), dann "enthaelt"; innerhalb nach Einwohnern
export function searchCities(index, query, limit = 6) {
  const q1 = norm(query);
  const q2 = normLoose(query);
  if (q1.length < 2 || !index) return [];
  const starts = [];
  const contains = [];
  for (const c of index.list) {
    const s = c.k1.startsWith(q1) || c.k2.startsWith(q2);
    if (s) { starts.push(c); continue; }
    if (c.k1.includes(' ' + q1) || c.k2.includes(' ' + q2)) starts.push(c);
    else if (q1.length >= 3 && (c.k1.includes(q1) || c.k2.includes(q2))) contains.push(c);
  }
  const byPop = (a, b) => b.pop - a.pop;
  // exakter Treffer ganz nach vorn
  const exact = (c) => (c.k1 === q1 || c.k2 === q2 ? 1 : 0);
  starts.sort((a, b) => exact(b) - exact(a) || byPop(a, b));
  contains.sort(byPop);
  return starts.concat(contains).slice(0, limit);
}

// Genau passender Ortsname (groesster zuerst), sonst null
export function exactCity(index, name) {
  const q1 = norm(name);
  if (!q1 || !index) return null;
  let best = null;
  for (const c of index.list) if (c.k1 === q1 && (!best || c.pop > best.pop)) best = c;
  return best;
}

// Naechster Ort zu GPS-Koordinaten. Gibt es in 12 km eine Grossstadt (200.000+), gewinnt die.
export function nearestCity(index, lat, lon, maxKm = 40) {
  if (!index || lat == null || lon == null) return null;
  let best = null;
  let bestD = Infinity;
  let big = null;
  let bigPop = 0;
  for (const c of index.list) {
    const d = distKm(lat, lon, c.lat, c.lon);
    if (d < bestD) { bestD = d; best = c; }
    if (d <= 12 && c.pop >= 200000 && c.pop > bigPop) { big = c; bigPop = c.pop; }
  }
  if (big) return big;
  return best && bestD <= maxKm ? best : null;
}

let cache = null;
export function loadCityIndex() {
  if (!cache) {
    cache = import('./data/dachCities.json').then((m) => buildIndex(m.default || m)).catch((e) => { cache = null; throw e; });
  }
  return cache;
}
