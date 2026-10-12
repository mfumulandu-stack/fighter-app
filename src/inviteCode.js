// Einladungscode: die ersten 8 Zeichen der Profil-ID (ohne Bindestriche, gross).
// Der Einladungslink (?ref=...) geht verloren, wenn der Freund die App erst aus dem
// App Store laedt - der Code kann stattdessen bei der Registrierung eingetippt werden.
// Reine Funktionen ohne Abhaengigkeit zu App.js, damit sie testbar sind.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s) {
  return typeof s === 'string' && UUID.test(s);
}

// '3f9a1c2e-....' -> '3F9A1C2E'; ohne gueltige ID -> ''
export function inviteCodeOf(profileId) {
  if (!isUuid(profileId)) return '';
  return profileId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

// Eingabe saeubern: nur 0-9 und A-F, gross, hoechstens 8 Zeichen.
export function cleanInviteCode(input) {
  return String(input == null ? '' : input).toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 8);
}

// Filter fuer die Profil-Abfrage: alle IDs, deren erste 8 Zeichen dem Code entsprechen.
export function inviteCodeFilter(code) {
  const c = cleanInviteCode(code).toLowerCase();
  if (c.length !== 8) return '';
  return 'id=gte.' + c + '-0000-0000-0000-000000000000&id=lte.' + c + '-ffff-ffff-ffff-ffffffffffff';
}
