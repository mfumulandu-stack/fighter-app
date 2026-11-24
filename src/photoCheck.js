// Foto-Pruefung: Aufrufe der Edge Function check-photos und die Hinweis-Abfrage.
// Die Pruefung selbst laeuft auf dem Server (supabase/functions/check-photos).
import { SUPA_URL, SUPA_KEY } from './constants';

export async function photoFn(action, payload, token) {
  const r = await fetch(SUPA_URL + '/functions/v1/check-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action, ...(payload || {}) }),
  });
  let data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  return { ok: r.ok, status: r.status, data };
}

// Eigene Fotos pruefen lassen. Gibt die ausgeblendeten Fotos zurueck: [{kind, url}]
export async function checkMyPhotos(token) {
  try {
    const r = await photoFn('check', {}, token);
    return r.ok && r.data && Array.isArray(r.data.hidden) ? r.data.hidden : [];
  } catch (e) {
    return [];
  }
}

// Profil melden (wird in der Tabelle reports gespeichert). -> true bei Erfolg
export async function reportProfile(token, { reportedId, reportedName, reason }) {
  try {
    const r = await photoFn('report', { reported_id: reportedId, reported_name: reportedName, reason }, token);
    return !!(r.ok && r.data && r.data.ok);
  } catch (e) {
    return false;
  }
}

// Hinweis fuer den Nutzer, wenn sein Foto fehlt, weil es geprueft wird / entfernt wurde.
// -> 'hold' | 'removed' | null
export async function fetchPhotoNotice(token, profileId) {
  try {
    const q = '/rest/v1/photo_checks?profile_id=eq.' + encodeURIComponent(profileId) + '&status=in.(hold,removed)&order=created_at.desc&limit=1&select=status';
    const r = await fetch(SUPA_URL + q, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0].status : null;
  } catch (e) {
    return null;
  }
}

// Anzeige-Namen der Gruende (Admin-Prueflist)
export const REASON_LABEL = {
  explicit: 'Explizite Inhalte',
  erotica: 'Freizügig (prüfen)',
  gore: 'Gewalt/Blut',
  offensive: 'Hass-Symbole',
  ai_generated: 'Vermutlich KI-generiert',
  duplicate: 'Gleiches Foto bei anderem Profil',
};
