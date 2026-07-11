// Ordnet eine Stadt einem Land zu (DE/AT/CH), damit das Laender-Dropdown
// im Gyms-Tab die Staedte-Liste passend filtern kann. Staedte werden in
// der App nicht mit einem eigenen Land-Feld gespeichert, deshalb ist das
// eine feste Zuordnungsliste der bekanntesten Staedte pro Land.
// Unbekannte Staedte gelten als Deutschland (DE) - der weit ueberwiegende
// Hauptmarkt der App, passend zum Standard-Land bei der Profil-Einrichtung.

const AT_CITIES = new Set([
  'wien', 'graz', 'linz', 'salzburg', 'innsbruck', 'klagenfurt', 'villach',
  'wels', 'sankt poelten', 'st poelten', 'dornbirn', 'steyr', 'wiener neustadt',
]);

const CH_CITIES = new Set([
  'zuerich', 'zurich', 'genf', 'geneve', 'geneva', 'basel', 'bern', 'lausanne',
  'winterthur', 'luzern', 'lucerne', 'st gallen', 'sankt gallen', 'lugano',
  'biel', 'thun', 'koeniz', 'schaffhausen', 'fribourg', 'chur', 'neuenburg',
]);

function normalizeCity(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[.-]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function cityToCountry(city) {
  const norm = normalizeCity(city);
  if (AT_CITIES.has(norm)) return 'AT';
  if (CH_CITIES.has(norm)) return 'CH';
  return 'DE';
}

export function filterCitiesByCountry(cities, countryCode) {
  if (!countryCode || countryCode === 'ALL') return cities;
  return cities.filter((c) => cityToCountry(c) === countryCode);
}
