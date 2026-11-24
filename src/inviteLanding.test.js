import { shouldShowInviteLanding } from './inviteLanding';

const ID = '3f9a1c2e-1111-4222-8333-444455556666';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const base = { ua: IPHONE, platform: 'iPhone', maxTouchPoints: 5, native: false, standalone: false, search: '?ref=' + ID };

test('iPhone-Safari mit Einladungslink: App-Store-Seite', () => {
  expect(shouldShowInviteLanding(base)).toBe(true);
});
test('iPad (meldet sich als Mac) mit Touch: auch App-Store-Seite', () => {
  expect(shouldShowInviteLanding({ ...base, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
});
test('Mac-Desktop: nicht', () => {
  expect(shouldShowInviteLanding({ ...base, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
});
test('Android und Desktop: nicht', () => {
  expect(shouldShowInviteLanding({ ...base, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', platform: 'Linux armv8l' })).toBe(false);
});
test('in der installierten App oder als Home-Bildschirm-Web-App: nicht', () => {
  expect(shouldShowInviteLanding({ ...base, native: true })).toBe(false);
  expect(shouldShowInviteLanding({ ...base, standalone: true })).toBe(false);
});
test('ohne oder mit ungueltigem ref: nicht', () => {
  expect(shouldShowInviteLanding({ ...base, search: '' })).toBe(false);
  expect(shouldShowInviteLanding({ ...base, search: '?ref=abc' })).toBe(false);
});
test('web=1: Nutzer will im Browser bleiben', () => {
  expect(shouldShowInviteLanding({ ...base, search: '?ref=' + ID + '&web=1' })).toBe(false);
});
