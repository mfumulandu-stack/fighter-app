import { isUuid, inviteCodeOf, cleanInviteCode, inviteCodeFilter } from './inviteCode';

const ID = '3f9a1c2e-1234-4abc-9def-0123456789ab';

test('Code ist der Anfang der Profil-ID', () => {
  expect(isUuid(ID)).toBe(true);
  expect(inviteCodeOf(ID)).toBe('3F9A1C2E');
  expect(inviteCodeOf('')).toBe('');
  expect(inviteCodeOf(null)).toBe('');
  expect(inviteCodeOf('abc')).toBe('');
});

test('Eingabe wird gesaeubert', () => {
  expect(cleanInviteCode(' 3f9a-1c2e ')).toBe('3F9A1C2E');
  expect(cleanInviteCode('ZZ3F9A1C2E99')).toBe('3F9A1C2E');
  expect(cleanInviteCode(undefined)).toBe('');
});

test('Filter passt nur mit vollem Code', () => {
  expect(inviteCodeFilter('3F9A1C2E')).toBe('id=gte.3f9a1c2e-0000-0000-0000-000000000000&id=lte.3f9a1c2e-ffff-ffff-ffff-ffffffffffff');
  expect(inviteCodeFilter('3F9A')).toBe('');
  // Die ID selbst liegt immer im Bereich
  const f = inviteCodeFilter(inviteCodeOf(ID));
  const lo = f.match(/gte\.([^&]+)/)[1];
  const hi = f.match(/lte\.(.+)$/)[1];
  expect(ID >= lo && ID <= hi).toBe(true);
});
