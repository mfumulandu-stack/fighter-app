import { authSignIn, authSignUp, dbSelect, dbInsert, dbUpdate } from './App';

// Ersetzt die echte Netzwerk-Funktion fetch durch eine kontrollierbare
// Fake-Version, damit die Tests ohne echte Internetverbindung laufen
// und wir genau pruefen koennen, WAS die App an Supabase schickt.
beforeEach(() => {
  global.fetch = jest.fn();
});

describe('authSignIn (Login)', () => {
  test('schickt E-Mail und Passwort an den richtigen Login-Endpunkt', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ access_token: 'fake-token-abc', user: { id: 'user-1' } }),
    });

    await authSignIn('test@fighterapp.de', 'geheim123');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/auth/v1/token?grant_type=password');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.email).toBe('test@fighterapp.de');
    expect(body.password).toBe('geheim123');
  });

  test('gibt die Server-Antwort (z.B. access_token) zurueck', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ access_token: 'fake-token-abc' }),
    });
    const result = await authSignIn('test@fighterapp.de', 'geheim123');
    expect(result.access_token).toBe('fake-token-abc');
  });
});

describe('authSignUp (Registrierung)', () => {
  test('schickt E-Mail und Passwort an den richtigen Registrierungs-Endpunkt', async () => {
    global.fetch.mockResolvedValue({ json: async () => ({ id: 'new-user-1' }) });

    await authSignUp('neu@fighterapp.de', 'geheim123');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/auth/v1/signup');
    const body = JSON.parse(options.body);
    expect(body.email).toBe('neu@fighterapp.de');
    // Stellt sicher, dass die Bestaetigungsmail auf die richtige Domain zeigt
    expect(body.options.emailRedirectTo).toBe('https://fighterapp.de');
  });
});

describe('dbSelect / dbInsert / dbUpdate (Datenbankzugriff)', () => {
  test('dbSelect baut die Abfrage-URL korrekt zusammen', async () => {
    global.fetch.mockResolvedValue({ json: async () => ([{ id: 1 }]) });
    await dbSelect('profiles', 'user_id=eq.abc123', 'fake-session-token');
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/rest/v1/profiles?user_id=eq.abc123');
  });

  test('dbInsert schickt POST mit den richtigen Daten', async () => {
    global.fetch.mockResolvedValue({ json: async () => ([{ id: 1 }]) });
    await dbInsert('swipes', { swiper_id: 1, target_id: 2 }, 'fake-token');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/rest/v1/swipes');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ swiper_id: 1, target_id: 2 });
  });

  test('dbUpdate schickt PATCH an die richtige gefilterte Zeile', async () => {
    global.fetch.mockResolvedValue({ json: async () => ([{ id: 1 }]) });
    await dbUpdate('profiles', { wins: 5 }, 'user_id=eq.abc123', 'fake-token');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/rest/v1/profiles?user_id=eq.abc123');
    expect(options.method).toBe('PATCH');
  });
});
