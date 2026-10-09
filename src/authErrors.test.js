import { authErrorInfo } from './authErrors';

test('E-Mail-Limit wird erkannt', () => {
  const r = authErrorInfo({ code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' });
  expect(r.kind).toBe('rate');
  expect(r.text).toMatch(/zu viele E-Mails/);
});

test('E-Mail nicht bestaetigt', () => {
  expect(authErrorInfo({ code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' }).kind).toBe('unconfirmed');
  expect(authErrorInfo({ error: 'invalid_grant', error_description: 'Email not confirmed' }).kind).toBe('unconfirmed');
});

test('falsche Zugangsdaten, alte und neue Form', () => {
  expect(authErrorInfo({ error: 'invalid_grant', error_description: 'Invalid login credentials' }).kind).toBe('credentials');
  expect(authErrorInfo({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }).kind).toBe('credentials');
});

test('schon registriert', () => {
  expect(authErrorInfo({ code: 422, error_code: 'user_already_exists', msg: 'User already registered' }).kind).toBe('exists');
  expect(authErrorInfo({ error: { message: 'User already registered' } }).kind).toBe('exists');
});

test('Passwort zu schwach und ungueltige E-Mail', () => {
  expect(authErrorInfo({ error_code: 'weak_password', msg: 'Password should be at least 6 characters' }).kind).toBe('weak');
  expect(authErrorInfo({ error_code: 'email_address_invalid', msg: 'Email address is invalid' }).kind).toBe('email');
});

test('unbekannter Fehler gibt Originaltext zurueck', () => {
  expect(authErrorInfo({ msg: 'Etwas anderes' })).toEqual({ kind: 'other', text: 'Etwas anderes' });
});

test('Erfolg und leere Antworten sind kein Fehler', () => {
  expect(authErrorInfo({ id: 'x', aud: 'authenticated' }).kind).toBe('');
  expect(authErrorInfo({ access_token: 'a', user: { id: 'u' } }).kind).toBe('');
  expect(authErrorInfo(null).kind).toBe('');
  expect(authErrorInfo({}).kind).toBe('');
});
