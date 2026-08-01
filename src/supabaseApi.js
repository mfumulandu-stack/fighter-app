// Alle direkten Zugriffe auf Supabase an einer Stelle: Login/Registrierung,
// Datenbank-Lesen/Schreiben, die sichere Admin-Schleuse und Foto-Upload.
//
// Bewusst als eigene Datei ausgelagert (wie matchScore.js / cityCountry.js),
// damit andere Module (z.B. ChatOverlay) mit der Datenbank sprechen koennen,
// ohne die grosse App.js importieren zu muessen.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben worden -
// gleiche Funktionsnamen, gleiches Verhalten. App.js reicht die Funktionen
// weiterhin nach aussen durch, damit auth.test.js unveraendert weiterlaeuft.

import { SUPA_URL, SUPA_KEY } from './constants';

// ── Login / Registrierung ──

export async function authSignUp(email, password) {
  const r = await fetch(SUPA_URL + '/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ email, password, options: { emailRedirectTo: 'https://fighterapp.de' } }),
  });
  return r.json();
}
export async function authSignIn(email, password) {
  const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
export async function authSignOut(token) {
  await fetch(SUPA_URL + '/auth/v1/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + token },
  });
}

// ── Datenbank ──
// hdr baut die Standard-Kopfzeilen; nur intern von den db-Funktionen genutzt.
function hdr(token) {
  return { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + (token || SUPA_KEY) };
}
export async function dbInsert(table, data, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table, {
    method: 'POST', headers: { ...hdr(token), Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return r.json();
}
export async function dbUpdate(table, data, query, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + '?' + query, {
    method: 'PATCH', headers: { ...hdr(token), Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return r.json();
}
export async function dbSelect(table, query, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + (query ? '?' + query : ''), { headers: hdr(token) });
  return r.json();
}

// ── Admin ──
// Sichere Admin-Schleuse: ersetzt direkte Aufrufe mit dem Vollzugriffs-
// schluessel. Der Schluessel selbst liegt nur noch serverseitig in der
// admin-proxy Edge Function - hier wird nur der eigene, normale Nutzer-
// Token mitgeschickt, den der Server dann selbst gegen die Admin-ID prueft.
export async function adminFetch(url, options = {}, userToken) {
  const path = url.replace(SUPA_URL, '');
  const extraHeaders = { ...(options.headers || {}) };
  delete extraHeaders.apikey;
  delete extraHeaders.Authorization;
  delete extraHeaders['Content-Type'];
  return fetch(SUPA_URL + '/functions/v1/admin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY },
    body: JSON.stringify({
      userToken,
      path,
      method: options.method || 'GET',
      body: options.body,
      extraHeaders,
    }),
  });
}

// ── Foto-Upload (Supabase Storage) ──

export async function uploadPhoto(file, path, token) {
  const r = await fetch(SUPA_URL + '/storage/v1/object/avatars/' + path, {
    method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token, 'Content-Type': file.type }, body: file,
  });
  if (!r.ok) return null;
  return SUPA_URL + '/storage/v1/object/public/avatars/' + path;
}
