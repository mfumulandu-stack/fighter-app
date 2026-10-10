// Profil-Ladungen: welche Spalten fuer Listen gebraucht werden und wie
// nachgeladene Detaildaten in ein geoeffnetes Profil einfliessen.
// Reine Funktionen ohne Abhaengigkeit zu App.js, damit sie testbar sind.

// Schlanke Liste fuer Rangliste, Freundesuche usw. (KEIN bio, gallery, videos ...).
export const LIST_FIELDS = 'id,user_id,name,age,city,gym,style,avatar_url,weight,weight_class,is_pro,country,gender,belt,wins,losses,draws,ko,last_seen,lat,lon,record_verified,gym_verified,banned';

// Swipe-Karten: wie bisher, nur ohne videos und gallery (werden in der Karte nie angezeigt).
export const CARD_FIELDS = 'id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height';

// Fuehrt die vollen Profildaten in das gerade geoeffnete Profil zusammen,
// aber nur, wenn es noch dasselbe Profil ist (sonst bleibt es unveraendert).
export function mergeProfileDetail(current, detail, id) {
  if (!current || current.id !== id) return current;
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return current;
  return { ...current, ...detail };
}

// War die Liste zuletzt vor weniger als maxAgeMs geladen?
export function isFresh(loadedAt, now, maxAgeMs = 60000) {
  return !!loadedAt && now - loadedAt >= 0 && now - loadedAt < maxAgeMs;
}
