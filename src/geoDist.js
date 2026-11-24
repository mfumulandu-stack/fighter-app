// Entfernung fuers Matching.
//
// Problem: Die gespeicherten Koordinaten (lat/lon) stammen oft aus der IP-Adresse
// und sind ungenau - Mobilfunk-IPs landen gern in einer ganz anderen Stadt. Ein
// Fighter, der "Muenchen" als Stadt eingetragen hat, konnte so mit Berlin-
// Koordinaten als "in der Naehe" erscheinen, obwohl die Karte "Muenchen" zeigt.
//
// Regel: Die eingetragene Stadt gewinnt, wenn die Koordinaten mehr als
// MAX_DRIFT_KM davon abweichen. Passen beide zusammen (oder ist die Stadt
// unbekannt), zaehlen die genaueren Koordinaten wie bisher.
import { CITY_COORDS } from './appData';

export const MAX_DRIFT_KM = 100;
export const UNKNOWN_KM = 9999;

const LOWER = {};
Object.keys(CITY_COORDS).forEach((k) => { LOWER[k.toLowerCase().trim()] = CITY_COORDS[k]; });

export function cityCoords(city) {
  if (!city) return null;
  return CITY_COORDS[city] || LOWER[String(city).toLowerCase().trim()] || null;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// p: { city, lat, lon }  ->  { lat, lon } oder null
export function effectiveCoords(p) {
  if (!p) return null;
  const c = cityCoords(p.city);
  const has = !!(p.lat && p.lon);
  if (has && c) {
    return haversineKm(p.lat, p.lon, c.lat, c.lon) > MAX_DRIFT_KM ? { lat: c.lat, lon: c.lon } : { lat: p.lat, lon: p.lon };
  }
  if (has) return { lat: p.lat, lon: p.lon };
  if (c) return { lat: c.lat, lon: c.lon };
  return null;
}

// Entfernung in km zwischen zwei Profilen ({city,lat,lon}); 9999 wenn unbekannt
export function matchDistanceKm(a, b) {
  const ca = effectiveCoords(a);
  const cb = effectiveCoords(b);
  if (!ca || !cb) return UNKNOWN_KM;
  return haversineKm(ca.lat, ca.lon, cb.lat, cb.lon);
}
