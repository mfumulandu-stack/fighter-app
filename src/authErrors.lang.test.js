import { authErrorInfo } from './authErrors';

const samples = [
  { error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' },
  { error_code: 'over_request_rate_limit', msg: 'x' },
  { error_code: 'email_not_confirmed', msg: 'Email not confirmed' },
  { error: 'invalid_grant', error_description: 'Invalid login credentials' },
  { error_code: 'user_already_exists', msg: 'User already registered' },
  { error_code: 'weak_password', msg: 'Password should be at least 6 characters' },
  { error_code: 'email_address_invalid', msg: 'Email address is invalid' },
  { error_code: 'signup_disabled', msg: 'Signups not allowed' },
];

test('jede Fehlerart hat in allen vier Sprachen einen eigenen Text', () => {
  samples.forEach((r) => {
    const de = authErrorInfo(r, 'DE').text;
    const en = authErrorInfo(r, 'EN').text;
    const fr = authErrorInfo(r, 'FR').text;
    const es = authErrorInfo(r, 'ES').text;
    [de, en, fr, es].forEach((t) => expect(t.length).toBeGreaterThan(10));
    expect(new Set([de, en, fr, es]).size).toBe(4);
  });
});

test('Standardsprache bleibt Deutsch', () => {
  const r = { error: 'invalid_grant', error_description: 'Invalid login credentials' };
  expect(authErrorInfo(r).text).toBe(authErrorInfo(r, 'DE').text);
  expect(authErrorInfo(r).kind).toBe('credentials');
});

test('Unbekannte Fehler geben den Originaltext weiter', () => {
  expect(authErrorInfo({ msg: 'Something odd' }, 'FR').text).toBe('Something odd');
});
