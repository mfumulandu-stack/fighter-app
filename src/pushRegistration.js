// Testbare Kernlogik fuer die Push-Registrierung.
// Bewusst als eigene Datei ausgelagert, weil hier bereits einmal ein
// kritischer Fehler passiert ist: PushNotifications.register() wurde
// AUFGERUFEN, BEVOR die Listener fuer 'registration'/'registrationError'
// eingerichtet waren - Apples Antwort konnte dadurch spurlos verloren
// gehen, falls sie sehr schnell zurueckkam. Ein Test hier haette diesen
// Fehler sofort erkannt, statt dass wir ihn erst live und mit stundenlanger
// Fehlersuche gefunden haben.
//
// WICHTIG FUER KUENFTIGE AENDERUNGEN: Die addListener()-Aufrufe MUESSEN
// vor dem register()-Aufruf stehen. Der Test 'attaches listeners before
// calling register' bewacht genau das.

export async function setupPushRegistration(PushNotifications, { onToken, onError }) {
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') {
    return { status: 'permission_denied', receive: perm.receive };
  }

  // Erst zuhoeren, DANN registrieren - Reihenfolge nicht aendern.
  PushNotifications.addListener('registration', (tokenData) => onToken(tokenData));
  PushNotifications.addListener('registrationError', (err) => onError(err));

  await PushNotifications.register();
  return { status: 'registered' };
}
