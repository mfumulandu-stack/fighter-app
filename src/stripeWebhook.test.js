/**
 * @jest-environment node
 */
// Testet die komplette Zahlungs-Logik des Stripe-Webhooks mit einer
// nachgebauten Datenbank (kein Netzwerk). Pruefte frueher niemand.
import { webcrypto } from 'crypto';
import {
  handleStripeEvent,
  verifyStripeSignature,
  isPaidSession,
} from '../supabase/functions/stripe-webhook/logic.js';

const SUPA = 'https://x.supabase.co';
const KEY = 'service-key';
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);

// ── Mini-Datenbank + fetch ────────────────────────────────────────────────
function makeEnv(seed = {}) {
  const db = {
    event_participants: [],
    event_memberships: [],
    events: [{ id: 'E1', title: 'Sparring Sonntag', price: 20, creator_id: 'ORG' }],
    profiles: [
      { id: 'ORG', user_id: 'U-ORG' },
      { id: 'A', user_id: 'U-A' },
      { id: 'B', user_id: 'U-B' },
    ],
    ...seed,
  };
  let nextId = 100;
  const pushes = [];
  const calls = [];
  const failNext = {}; // z.B. { 'POST event_participants': {status:500} }
  const uniqueSession = true; // wie der echte Index

  const res = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

  function parseFilters(qs) {
    const f = [];
    for (const part of qs.split('&')) {
      if (!part || part.startsWith('select=') || part.startsWith('limit=')) continue;
      if (part.startsWith('or=')) { f.push({ or: true }); continue; }
      const i = part.indexOf('=');
      const col = part.slice(0, i);
      const [op, ...rest] = decodeURIComponent(part.slice(i + 1)).split('.');
      f.push({ col, op, val: rest.join('.') });
    }
    return f;
  }
  function matches(row, filters) {
    return filters.every((f) => {
      if (f.or) return row.baf_unlocked == null || row.baf_unlocked === false; // einziger or-Fall im Code
      const v = row[f.col];
      if (f.op === 'eq') return String(v) === f.val;
      if (f.op === 'gte') return String(v) >= f.val;
      return true;
    });
  }

  const fetchFn = async (url, init = {}) => {
    const method = init.method || 'GET';
    const u = url.replace(SUPA, '');
    calls.push(`${method} ${u}`);
    if (u.startsWith('/functions/v1/send-push')) {
      pushes.push(JSON.parse(init.body));
      return res(200, { success: true });
    }
    const m = u.match(/^\/rest\/v1\/([a-z_]+)\??(.*)$/);
    const table = m[1];
    const filters = parseFilters(m[2] || '');
    const key = `${method} ${table}`;
    if (failNext[key]) {
      const f = failNext[key];
      if (f.once) delete failNext[key];
      return res(f.status, f.body || 'fehler');
    }
    const rows = db[table];
    if (method === 'GET') return res(200, rows.filter((r) => matches(r, filters)));
    if (method === 'POST') {
      const body = JSON.parse(init.body);
      if (
        uniqueSession && body.stripe_session_id &&
        rows.some((r) => r.stripe_session_id === body.stripe_session_id)
      ) return res(409, 'duplicate key');
      if (db.uniqueEventUser && table === 'event_participants' &&
        rows.some((r) => r.event_id === body.event_id && r.user_id === body.user_id)) {
        return res(409, 'duplicate key (event,user)');
      }
      const row = { id: `R${nextId++}`, ...body };
      rows.push(row);
      return res(201, [row]);
    }
    if (method === 'PATCH') {
      const body = JSON.parse(init.body);
      const hit = rows.filter((r) => matches(r, filters));
      hit.forEach((r) => Object.assign(r, body));
      return res(200, hit);
    }
    return res(405, 'x');
  };

  const deps = { supaUrl: SUPA, serviceKey: KEY, fetchFn, now: () => NOW, log: { log() {}, error() {} } };
  return { db, deps, pushes, calls, failNext };
}

const session = (over = {}) => ({
  id: 'cs_1',
  payment_status: 'paid',
  amount_total: 2000,
  metadata: { event_id: 'E1', profile_id: 'A', user_name: 'Anna' },
  ...over,
});
const evt = (type, s) => ({ type, data: { object: s } });

// ── isPaidSession ─────────────────────────────────────────────────────────
describe('isPaidSession', () => {
  test('paid und no_payment_required zaehlen als bezahlt', () => {
    expect(isPaidSession({ payment_status: 'paid' })).toBe(true);
    expect(isPaidSession({ payment_status: 'no_payment_required' })).toBe(true);
  });
  test('unpaid, fehlend und null nicht', () => {
    expect(isPaidSession({ payment_status: 'unpaid' })).toBe(false);
    expect(isPaidSession({})).toBe(false);
    expect(isPaidSession(null)).toBe(false);
  });
});

// ── Normales Ticket ───────────────────────────────────────────────────────
describe('Ticket bezahlt', () => {
  test('traegt bezahlten Teilnehmer ein, 200', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(evt('checkout.session.completed', session()), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.db.event_participants[0]).toMatchObject({
      event_id: 'E1', user_id: 'A', paid: true, amount_paid: 20, stripe_session_id: 'cs_1',
    });
  });

  test('schickt Bestaetigung an Kaeufer und Meldung an Veranstalter', async () => {
    const e = makeEnv();
    await handleStripeEvent(evt('checkout.session.completed', session()), e.deps);
    const to = e.pushes.map((p) => p.recipientUserId).sort();
    expect(to).toEqual(['U-A', 'U-ORG']);
    const buyer = e.pushes.find((p) => p.recipientUserId === 'U-A');
    expect(buyer.title).toMatch(/dabei/i);
    expect(buyer.body).toContain('Sparring Sonntag');
    const org = e.pushes.find((p) => p.recipientUserId === 'U-ORG');
    expect(org.body).toContain('Anna');
    expect(org.body).toContain('20,00 €');
  });

  test('Veranstalter kauft selbst: keine Meldung an sich selbst', async () => {
    const e = makeEnv();
    await handleStripeEvent(
      evt('checkout.session.completed', session({ metadata: { event_id: 'E1', profile_id: 'ORG' } })),
      e.deps,
    );
    expect(e.pushes.map((p) => p.recipientUserId)).toEqual(['U-ORG']);
  });

  test('Webhook doppelt zugestellt: keine zweite Zeile, keine zweite Nachricht, 200', async () => {
    const e = makeEnv();
    await handleStripeEvent(evt('checkout.session.completed', session()), e.deps);
    const pushesBefore = e.pushes.length;
    const r = await handleStripeEvent(evt('checkout.session.completed', session()), e.deps);
    expect(r.status).toBe(200);
    expect(r.body.duplicate).toBe(true);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.pushes).toHaveLength(pushesBefore);
  });

  test('Datenbankfehler beim Eintragen: 500, damit Stripe es wiederholt', async () => {
    const e = makeEnv();
    e.failNext['POST event_participants'] = { status: 500, body: 'kaputt' };
    const r = await handleStripeEvent(evt('checkout.session.completed', session()), e.deps);
    expect(r.status).toBe(500);
    expect(e.db.event_participants).toHaveLength(0);
    expect(e.pushes).toHaveLength(0);
  });

  test('Push-Fehler macht die Buchung nicht kaputt', async () => {
    const e = makeEnv();
    const orig = e.deps.fetchFn;
    e.deps.fetchFn = async (url, init) => {
      if (url.includes('/functions/v1/send-push')) throw new Error('apns down');
      return orig(url, init);
    };
    const r = await handleStripeEvent(evt('checkout.session.completed', session()), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_participants[0].paid).toBe(true);
  });

  test('ohne Metadaten: ignoriert, 200', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(evt('checkout.session.completed', session({ metadata: {} })), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(0);
  });
});

// ── Der eigentliche Fehlerfall: Geld noch nicht da ────────────────────────
describe('verzoegerte Zahlung (z.B. SEPA)', () => {
  test('completed mit payment_status unpaid traegt NICHTS als bezahlt ein', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(
      evt('checkout.session.completed', session({ payment_status: 'unpaid' })),
      e.deps,
    );
    expect(r.status).toBe(200);
    expect(r.body.pending).toBe(true);
    expect(e.db.event_participants).toHaveLength(0);
    expect(e.pushes).toHaveLength(0);
  });

  test('async_payment_succeeded tragt dann ein', async () => {
    const e = makeEnv();
    await handleStripeEvent(evt('checkout.session.completed', session({ payment_status: 'unpaid' })), e.deps);
    const r = await handleStripeEvent(evt('checkout.session.async_payment_succeeded', session()), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.db.event_participants[0].paid).toBe(true);
  });

  test('async_payment_failed: Nachricht an die Person, kein Eintrag', async () => {
    const e = makeEnv();
    await handleStripeEvent(evt('checkout.session.async_payment_failed', session({ payment_status: 'unpaid' })), e.deps);
    expect(e.db.event_participants).toHaveLength(0);
    expect(e.pushes).toHaveLength(1);
    expect(e.pushes[0].recipientUserId).toBe('U-A');
    expect(e.pushes[0].title).toMatch(/fehlgeschlagen/i);
  });
});

// ── Abgelaufene Sitzung ───────────────────────────────────────────────────
describe('expired', () => {
  test('schickt der Person eine Erinnerung', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(evt('checkout.session.expired', session({ payment_status: 'unpaid' })), e.deps);
    expect(r.status).toBe(200);
    expect(e.pushes).toHaveLength(1);
    expect(e.pushes[0].recipientUserId).toBe('U-A');
    expect(e.pushes[0].body).toContain('Sparring Sonntag');
    expect(e.db.event_participants).toHaveLength(0);
  });

  test('keine Erinnerung, wenn die Person inzwischen bezahlt hat', async () => {
    const e = makeEnv({
      event_participants: [{ id: 'R1', event_id: 'E1', user_id: 'A', paid: true, stripe_session_id: 'cs_other' }],
    });
    const r = await handleStripeEvent(evt('checkout.session.expired', session({ payment_status: 'unpaid' })), e.deps);
    expect(r.body.skipped).toBeTruthy();
    expect(e.pushes).toHaveLength(0);
  });

  test('keine Erinnerung, wenn eine aktive Mitgliedschaft des Veranstalters besteht', async () => {
    const e = makeEnv({
      event_memberships: [{ id: 'M1', user_id: 'A', event_creator_id: 'ORG', valid_until: '2026-12-01T00:00:00Z' }],
    });
    const r = await handleStripeEvent(evt('checkout.session.expired', session({ payment_status: 'unpaid' })), e.deps);
    expect(r.body.skipped).toBeTruthy();
    expect(e.pushes).toHaveLength(0);
  });

  test('abgelaufener Monatsbeitrag: eigener Text', async () => {
    const e = makeEnv();
    await handleStripeEvent(
      evt('checkout.session.expired', session({ payment_status: 'unpaid', metadata: { event_id: 'E1', profile_id: 'A', type: 'membership' } })),
      e.deps,
    );
    expect(e.pushes[0].body).toMatch(/Monatsbeitrag/);
  });
});

// ── Monatsbeitrag ─────────────────────────────────────────────────────────
describe('Monatsbeitrag', () => {
  const mSession = (over = {}) => session({
    id: 'cs_m', amount_total: 3000,
    metadata: { event_id: 'E1', profile_id: 'A', type: 'membership', creator_id: 'ORG' }, ...over,
  });

  test('legt 30 Tage Mitgliedschaft an', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(evt('checkout.session.completed', mSession()), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_memberships).toHaveLength(1);
    const m = e.db.event_memberships[0];
    expect(m).toMatchObject({ user_id: 'A', event_creator_id: 'ORG', amount_paid: 30, stripe_session_id: 'cs_m' });
    expect(new Date(m.valid_until).getTime()).toBe(NOW + 30 * 24 * 3600 * 1000);
    expect(e.db.event_participants).toHaveLength(0);
    expect(e.pushes.map((p) => p.title)).toEqual(['📅 Mitgliedschaft aktiv']);
  });

  test('zweimal zugestellt: nur eine Mitgliedschaft', async () => {
    const e = makeEnv();
    await handleStripeEvent(evt('checkout.session.completed', mSession()), e.deps);
    const r = await handleStripeEvent(evt('checkout.session.completed', mSession()), e.deps);
    expect(r.body.duplicate).toBe(true);
    expect(e.db.event_memberships).toHaveLength(1);
  });

  test('nicht bezahlt: keine Mitgliedschaft', async () => {
    const e = makeEnv();
    await handleStripeEvent(evt('checkout.session.completed', mSession({ payment_status: 'unpaid' })), e.deps);
    expect(e.db.event_memberships).toHaveLength(0);
  });

  test('Datenbankfehler: 500', async () => {
    const e = makeEnv();
    e.failNext['POST event_memberships'] = { status: 500 };
    const r = await handleStripeEvent(evt('checkout.session.completed', mSession()), e.deps);
    expect(r.status).toBe(500);
  });
});

// ── Freund mitbringen ─────────────────────────────────────────────────────
describe('Freund mitbringen', () => {
  const waiting = () => ({
    id: 'W1', event_id: 'E1', user_id: 'A', paid: false, brought_friend_id: 'B', baf_unlocked: false,
  });

  test('Freund bezahlt: wartende Zeile wird freigeschaltet und Person bekommt Nachricht', async () => {
    const e = makeEnv({ event_participants: [waiting()] });
    const r = await handleStripeEvent(
      evt('checkout.session.completed', session({ id: 'cs_b', metadata: { event_id: 'E1', profile_id: 'B', user_name: 'Ben' } })),
      e.deps,
    );
    expect(r.status).toBe(200);
    expect(e.db.event_participants.find((p) => p.id === 'W1').baf_unlocked).toBe(true);
    expect(e.db.event_participants.find((p) => p.id === 'W1').paid).toBe(false);
    const friendPush = e.pushes.find((p) => p.recipientUserId === 'U-A');
    expect(friendPush.title).toMatch(/Freund hat bezahlt/);
    expect(friendPush.body).toContain('10,00 €'); // 20 - 10
  });

  test('wiederholter Webhook benachrichtigt den Freund nicht nochmal', async () => {
    const e = makeEnv({ event_participants: [waiting()] });
    const s = session({ id: 'cs_b', metadata: { event_id: 'E1', profile_id: 'B' } });
    await handleStripeEvent(evt('checkout.session.completed', s), e.deps);
    const n = e.pushes.filter((p) => p.recipientUserId === 'U-A').length;
    await handleStripeEvent(evt('checkout.session.completed', s), e.deps);
    expect(e.pushes.filter((p) => p.recipientUserId === 'U-A')).toHaveLength(n);
  });

  test('Rabatt-Zahlung: wartende Zeile wird bezahlt gesetzt, KEINE zweite Zeile', async () => {
    const unlocked = { ...waiting(), baf_unlocked: true };
    const e = makeEnv({ event_participants: [unlocked] });
    const r = await handleStripeEvent(
      evt('checkout.session.completed', session({
        id: 'cs_a', amount_total: 1000,
        metadata: { event_id: 'E1', profile_id: 'A', baf_participant_id: 'W1' },
      })),
      e.deps,
    );
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.db.event_participants[0]).toMatchObject({ paid: true, amount_paid: 10, stripe_session_id: 'cs_a' });
  });

  test('Rabatt-Zahlung doppelt zugestellt: bleibt eine Zeile, 200, keine neue Nachricht', async () => {
    const e = makeEnv({ event_participants: [{ ...waiting(), baf_unlocked: true }] });
    const s = session({ id: 'cs_a', amount_total: 1000, metadata: { event_id: 'E1', profile_id: 'A', baf_participant_id: 'W1' } });
    await handleStripeEvent(evt('checkout.session.completed', s), e.deps);
    const n = e.pushes.length;
    const r = await handleStripeEvent(evt('checkout.session.completed', s), e.deps);
    expect(r.status).toBe(200);
    expect(r.body.duplicate).toBe(true);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.pushes).toHaveLength(n);
  });

  test('wartende Zeile inzwischen geloescht: Zahlung geht trotzdem nicht verloren', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(
      evt('checkout.session.completed', session({
        id: 'cs_a', amount_total: 1000,
        metadata: { event_id: 'E1', profile_id: 'A', baf_participant_id: 'GONE' },
      })),
      e.deps,
    );
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.db.event_participants[0]).toMatchObject({ user_id: 'A', paid: true, amount_paid: 10 });
  });

  test('voller Preis gezahlt, obwohl wartende Zeile existiert (eindeutiger Index): Zeile wird bezahlt statt Fehler', async () => {
    const e = makeEnv({ event_participants: [waiting()], uniqueEventUser: true });
    const r = await handleStripeEvent(evt('checkout.session.completed', session({ id: 'cs_full' })), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(1);
    expect(e.db.event_participants[0]).toMatchObject({ id: 'W1', paid: true, amount_paid: 20, stripe_session_id: 'cs_full' });
  });

  test('echte Doppelzahlung (eindeutiger Index, schon bezahlt): 200 und Veranstalter wird gewarnt', async () => {
    const e = makeEnv({
      event_participants: [{ id: 'P1', event_id: 'E1', user_id: 'A', paid: true, stripe_session_id: 'cs_first' }],
      uniqueEventUser: true,
    });
    const r = await handleStripeEvent(evt('checkout.session.completed', session({ id: 'cs_second' })), e.deps);
    expect(r.status).toBe(200);
    expect(r.body.doublePayment).toBe(true);
    expect(e.db.event_participants).toHaveLength(1);
    const warn = e.pushes.find((p) => p.recipientUserId === 'U-ORG');
    expect(warn.title).toMatch(/Doppelzahlung/);
  });
});

// ── Sonstiges ─────────────────────────────────────────────────────────────
describe('andere Ereignisse', () => {
  test('unbekannter Typ: 200, nichts passiert', async () => {
    const e = makeEnv();
    const r = await handleStripeEvent(evt('charge.refunded', session()), e.deps);
    expect(r.status).toBe(200);
    expect(e.db.event_participants).toHaveLength(0);
    expect(e.calls).toHaveLength(0);
  });
  test('Event ohne Objekt: 200', async () => {
    const e = makeEnv();
    expect((await handleStripeEvent({ type: 'x' }, e.deps)).status).toBe(200);
  });
});

// ── Signatur ──────────────────────────────────────────────────────────────
describe('verifyStripeSignature', () => {
  const secret = 'whsec_test';
  const payload = '{"id":"evt_1"}';
  async function sign(ts, body = payload, sec = secret) {
    const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(sec), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${body}`));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const opts = { subtle: webcrypto.subtle, now: () => NOW };
  const ts = Math.floor(NOW / 1000);

  test('gueltige Signatur', async () => {
    const h = `t=${ts},v1=${await sign(ts)}`;
    expect(await verifyStripeSignature(payload, h, secret, opts)).toBe(true);
  });
  test('falsches Geheimnis', async () => {
    const h = `t=${ts},v1=${await sign(ts, payload, 'anderes')}`;
    expect(await verifyStripeSignature(payload, h, secret, opts)).toBe(false);
  });
  test('veraenderter Inhalt', async () => {
    const h = `t=${ts},v1=${await sign(ts)}`;
    expect(await verifyStripeSignature('{"id":"evt_2"}', h, secret, opts)).toBe(false);
  });
  test('zwei v1-Signaturen (Schluessel-Rotation): irgendeine passt', async () => {
    const h = `t=${ts},v1=${'0'.repeat(64)},v1=${await sign(ts)}`;
    expect(await verifyStripeSignature(payload, h, secret, opts)).toBe(true);
  });
  test('zu alter Zeitstempel (Replay)', async () => {
    const old = ts - 3600;
    const h = `t=${old},v1=${await sign(old)}`;
    expect(await verifyStripeSignature(payload, h, secret, opts)).toBe(false);
  });
  test('leerer oder kaputter Header', async () => {
    expect(await verifyStripeSignature(payload, '', secret, opts)).toBe(false);
    expect(await verifyStripeSignature(payload, 'quatsch', secret, opts)).toBe(false);
    expect(await verifyStripeSignature(payload, `t=abc,v1=${'0'.repeat(64)}`, secret, opts)).toBe(false);
  });
});
