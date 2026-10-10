// Uebersetzt Fehlerantworten von Supabase Auth in verstaendliche Texte
// (Deutsch, Englisch, Franzoesisch, Spanisch; Standard Deutsch).
// Supabase liefert je nach Aufruf unterschiedliche Formen:
//   { code: 429, error_code: 'over_email_send_rate_limit', msg: '...' }
//   { error: 'invalid_grant', error_description: 'Invalid login credentials' }
//   { error: { message: '...' } }
// Rein und testbar, ohne Netzwerk.

import { makeL } from './lang';

export function authErrorInfo(r, lang = 'DE') {
  if (!r || typeof r !== 'object') return { kind: '', text: '' };
  const L = makeL(lang);
  const code = String(r.error_code || r.code || '');
  const raw = String(
    r.msg || r.error_description ||
    (typeof r.error === 'string' ? r.error : (r.error && r.error.message) || '') ||
    r.message || ''
  );
  if (!code && !raw) return { kind: '', text: '' };
  const low = raw.toLowerCase();
  if (code === 'over_email_send_rate_limit' || low.includes('email rate limit')) {
    return { kind: 'rate', text: L(
      'Gerade werden zu viele E-Mails verschickt. Bitte versuche es in ein paar Minuten noch einmal.',
      'Too many emails are being sent right now. Please try again in a few minutes.',
      "Trop d'e-mails sont envoyés en ce moment. Réessaie dans quelques minutes.",
      'Se están enviando demasiados correos ahora mismo. Inténtalo de nuevo en unos minutos.') };
  }
  if (code === 'over_request_rate_limit' || code === 'over_sms_send_rate_limit' || low.includes('rate limit') || low.includes('security purposes')) {
    return { kind: 'rate', text: L(
      'Zu viele Versuche. Bitte warte kurz und versuche es dann erneut.',
      'Too many attempts. Please wait a moment and try again.',
      'Trop de tentatives. Patiente un instant, puis réessaie.',
      'Demasiados intentos. Espera un momento e inténtalo de nuevo.') };
  }
  if (code === 'email_not_confirmed' || low.includes('not confirmed')) {
    return { kind: 'unconfirmed', text: L(
      'Deine E-Mail ist noch nicht bestätigt. Öffne den Link in der Bestätigungsmail (auch im Spam-Ordner) oder lass dir unten eine neue Mail schicken.',
      'Your email is not confirmed yet. Open the link in the confirmation email (check your spam folder too) or request a new one below.',
      "Ton e-mail n'est pas encore confirmé. Ouvre le lien dans l'e-mail de confirmation (vérifie aussi les spams) ou demande-en un nouveau ci-dessous.",
      'Tu correo aún no está confirmado. Abre el enlace del correo de confirmación (mira también en spam) o pide uno nuevo abajo.') };
  }
  if (code === 'invalid_credentials' || low.includes('invalid login credentials')) {
    return { kind: 'credentials', text: L(
      'E-Mail oder Passwort stimmt nicht.',
      'Email or password is incorrect.',
      'E-mail ou mot de passe incorrect.',
      'Correo o contraseña incorrectos.') };
  }
  if (code === 'user_already_exists' || low.includes('already registered') || low.includes('already been registered')) {
    return { kind: 'exists', text: L(
      'Diese E-Mail ist bereits registriert. Bitte einloggen.',
      'This email is already registered. Please log in.',
      'Cet e-mail est déjà enregistré. Connecte-toi.',
      'Este correo ya está registrado. Inicia sesión.') };
  }
  if (code === 'weak_password' || low.includes('password should be')) {
    return { kind: 'weak', text: L(
      'Das Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.',
      'The password is too weak. Please use at least 6 characters.',
      'Le mot de passe est trop faible. Utilise au moins 6 caractères.',
      'La contraseña es demasiado débil. Usa al menos 6 caracteres.') };
  }
  if (code === 'email_address_invalid' || low.includes('invalid email') || low.includes('unable to validate email')) {
    return { kind: 'email', text: L(
      'Diese E-Mail-Adresse ist ungültig. Bitte prüfe sie.',
      'This email address is invalid. Please check it.',
      'Cette adresse e-mail est invalide. Vérifie-la.',
      'Esta dirección de correo no es válida. Compruébala.') };
  }
  if (code === 'signup_disabled') {
    return { kind: 'other', text: L(
      'Registrierungen sind gerade nicht möglich. Bitte versuche es später noch einmal.',
      'Sign-ups are currently unavailable. Please try again later.',
      'Les inscriptions sont momentanément indisponibles. Réessaie plus tard.',
      'Los registros no están disponibles ahora. Inténtalo más tarde.') };
  }
  return { kind: 'other', text: raw };
}
