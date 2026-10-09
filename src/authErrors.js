// Uebersetzt Fehlerantworten von Supabase Auth in verstaendliche deutsche Texte.
// Supabase liefert je nach Aufruf unterschiedliche Formen:
//   { code: 429, error_code: 'over_email_send_rate_limit', msg: '...' }
//   { error: 'invalid_grant', error_description: 'Invalid login credentials' }
//   { error: { message: '...' } }
// Rein und testbar, ohne Netzwerk.

export function authErrorInfo(r) {
  if (!r || typeof r !== 'object') return { kind: '', text: '' };
  const code = String(r.error_code || r.code || '');
  const raw = String(
    r.msg || r.error_description ||
    (typeof r.error === 'string' ? r.error : (r.error && r.error.message) || '') ||
    r.message || ''
  );
  if (!code && !raw) return { kind: '', text: '' };
  const low = raw.toLowerCase();
  if (code === 'over_email_send_rate_limit' || low.includes('email rate limit')) {
    return { kind: 'rate', text: 'Gerade werden zu viele E-Mails verschickt. Bitte versuche es in ein paar Minuten noch einmal.' };
  }
  if (code === 'over_request_rate_limit' || code === 'over_sms_send_rate_limit' || low.includes('rate limit') || low.includes('security purposes')) {
    return { kind: 'rate', text: 'Zu viele Versuche. Bitte warte kurz und versuche es dann erneut.' };
  }
  if (code === 'email_not_confirmed' || low.includes('not confirmed')) {
    return { kind: 'unconfirmed', text: 'Deine E-Mail ist noch nicht bestätigt. Öffne den Link in der Bestätigungsmail (auch im Spam-Ordner) oder lass dir unten eine neue Mail schicken.' };
  }
  if (code === 'invalid_credentials' || low.includes('invalid login credentials')) {
    return { kind: 'credentials', text: 'E-Mail oder Passwort stimmt nicht.' };
  }
  if (code === 'user_already_exists' || low.includes('already registered') || low.includes('already been registered')) {
    return { kind: 'exists', text: 'Diese E-Mail ist bereits registriert. Bitte einloggen.' };
  }
  if (code === 'weak_password' || low.includes('password should be')) {
    return { kind: 'weak', text: 'Das Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.' };
  }
  if (code === 'email_address_invalid' || low.includes('invalid email') || low.includes('unable to validate email')) {
    return { kind: 'email', text: 'Diese E-Mail-Adresse ist ungültig. Bitte prüfe sie.' };
  }
  if (code === 'signup_disabled') {
    return { kind: 'other', text: 'Registrierungen sind gerade nicht möglich. Bitte versuche es später noch einmal.' };
  }
  return { kind: 'other', text: raw };
}
