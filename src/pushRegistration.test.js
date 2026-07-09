import { setupPushRegistration } from './pushRegistration';

// Erstellt eine Fake-Version des Capacitor PushNotifications-Plugins,
// die jeden Aufruf in der Reihenfolge protokolliert, in der er passiert.
function makeMockPushNotifications(permission = 'granted') {
  const callOrder = [];
  return {
    callOrder,
    checkPermissions: async () => {
      callOrder.push('checkPermissions');
      return { receive: permission };
    },
    requestPermissions: async () => {
      callOrder.push('requestPermissions');
      return { receive: permission };
    },
    addListener: (event) => {
      callOrder.push('addListener:' + event);
    },
    register: async () => {
      callOrder.push('register');
    },
  };
}

describe('setupPushRegistration', () => {
  // REGRESSIONSTEST: Genau dieser Fehler ist in Produktion passiert -
  // register() wurde vor den addListener()-Aufrufen ausgefuehrt, wodurch
  // Apples Antwort (der Push-Token) spurlos verloren gehen konnte, wenn
  // sie sehr schnell zurueckkam. Dieser Test waere sofort fehlgeschlagen
  // und haette stundenlange Fehlersuche erspart.
  test('richtet BEIDE Listener ein, BEVOR register() aufgerufen wird', async () => {
    const mock = makeMockPushNotifications('granted');
    await setupPushRegistration(mock, { onToken: () => {}, onError: () => {} });

    const registerIndex = mock.callOrder.indexOf('register');
    const listenerRegIndex = mock.callOrder.indexOf('addListener:registration');
    const listenerErrIndex = mock.callOrder.indexOf('addListener:registrationError');

    expect(registerIndex).toBeGreaterThan(-1);
    expect(listenerRegIndex).toBeGreaterThan(-1);
    expect(listenerErrIndex).toBeGreaterThan(-1);
    expect(listenerRegIndex).toBeLessThan(registerIndex);
    expect(listenerErrIndex).toBeLessThan(registerIndex);
  });

  test('registriert NICHT, wenn die Erlaubnis verweigert wurde', async () => {
    const mock = makeMockPushNotifications('denied');
    const result = await setupPushRegistration(mock, { onToken: () => {}, onError: () => {} });

    expect(result.status).toBe('permission_denied');
    expect(mock.callOrder).not.toContain('register');
  });

  test('fragt Erlaubnis an, wenn Status "prompt" ist', async () => {
    const mock = makeMockPushNotifications('prompt');
    // Nach requestPermissions soll granted zurueckkommen
    mock.requestPermissions = async () => {
      mock.callOrder.push('requestPermissions');
      return { receive: 'granted' };
    };
    const result = await setupPushRegistration(mock, { onToken: () => {}, onError: () => {} });

    expect(mock.callOrder).toContain('requestPermissions');
    expect(result.status).toBe('registered');
  });

  test('ruft onToken auf, sobald die Registrierung Erfolg meldet', async () => {
    const mock = makeMockPushNotifications('granted');
    let receivedToken = null;
    // addListener merkt sich den Callback, damit wir ihn simuliert ausloesen koennen
    const listeners = {};
    mock.addListener = (event, cb) => {
      mock.callOrder.push('addListener:' + event);
      listeners[event] = cb;
    };
    await setupPushRegistration(mock, {
      onToken: (tokenData) => { receivedToken = tokenData.value; },
      onError: () => {},
    });
    // Simuliert Apples Antwort, die nach register() eintrifft
    listeners['registration']({ value: 'fake-device-token-123' });
    expect(receivedToken).toBe('fake-device-token-123');
  });
});
