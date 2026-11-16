import {
  BAF_DISCOUNT,
  participantStatus,
  countsTowardCapacity,
  capacityCount,
  isFullEvent,
  paidAmount,
  revenueOf,
  paidCount,
  activeMembersFor,
  adminStatusLabel,
  userStatusTexts,
  isPastEvent,
  paymentDue,
  unpaidRows,
} from './eventPayment';

const paidEv = { id: 1, price: 20, creator_id: 'ORG', max_participants: 3 };
const freeEv = { id: 2, price: 0, creator_id: 'ORG', max_participants: 2 };

describe('participantStatus', () => {
  test('kostenloses Event', () => {
    expect(participantStatus({ paid: false }, freeEv)).toBe('free');
  });
  test('bezahlt', () => {
    expect(participantStatus({ paid: true }, paidEv)).toBe('paid');
  });
  test('wartet auf Freund', () => {
    expect(participantStatus({ paid: false, brought_friend_id: 'B', baf_unlocked: false }, paidEv)).toBe('waiting_friend');
    expect(participantStatus({ paid: false, brought_friend_id: 'B', baf_unlocked: null }, paidEv)).toBe('waiting_friend');
  });
  test('Rabatt frei', () => {
    expect(participantStatus({ paid: false, brought_friend_id: 'B', baf_unlocked: true }, paidEv)).toBe('discount_open');
  });
  test('einfach unbezahlt', () => {
    expect(participantStatus({ paid: false }, paidEv)).toBe('unpaid');
  });
  test('Preis als Text wird erkannt', () => {
    expect(participantStatus({ paid: true }, { price: '20.00' })).toBe('paid');
  });
});

describe('Platzzaehlung', () => {
  const parts = [
    { paid: true },
    { paid: false, brought_friend_id: 'X', baf_unlocked: false }, // wartet
    { paid: false, brought_friend_id: 'Y', baf_unlocked: true },  // Rabatt frei
    { paid: false },                                                // unbezahlt
  ];
  test('bei bezahltem Event zaehlen nur Bezahlte', () => {
    expect(capacityCount(parts, paidEv)).toBe(1);
    expect(countsTowardCapacity(parts[1], paidEv)).toBe(false);
  });
  test('bei kostenlosem Event zaehlen alle', () => {
    expect(capacityCount(parts, freeEv)).toBe(4);
  });
  test('voll erst, wenn genug bezahlt haben', () => {
    expect(isFullEvent(parts, paidEv)).toBe(false);
    expect(isFullEvent([{ paid: true }, { paid: true }, { paid: true }], paidEv)).toBe(true);
  });
  test('Standard-Maximum 10, leere Liste', () => {
    expect(isFullEvent([], { price: 20 })).toBe(false);
    expect(capacityCount(undefined, paidEv)).toBe(0);
  });
});

describe('Betraege', () => {
  test('amount_paid 0 bleibt 0 (kein Listenpreis)', () => {
    expect(paidAmount({ paid: true, amount_paid: 0 }, paidEv)).toBe(0);
    expect(paidAmount({ paid: true, amount_paid: '0.00' }, paidEv)).toBe(0);
  });
  test('ohne amount_paid der Listenpreis, unbezahlt 0', () => {
    expect(paidAmount({ paid: true }, paidEv)).toBe(20);
    expect(paidAmount({ paid: true, amount_paid: null }, paidEv)).toBe(20);
    expect(paidAmount({ paid: false, amount_paid: 20 }, paidEv)).toBe(0);
  });
  test('Umsatz beruecksichtigt Rabatte', () => {
    const parts = [{ paid: true, amount_paid: 20 }, { paid: true, amount_paid: 10 }, { paid: false }];
    expect(revenueOf(parts, paidEv)).toBe(30);
    expect(paidCount(parts)).toBe(2);
  });
  test('Rabatt-Konstante', () => {
    expect(BAF_DISCOUNT).toBe(10);
  });
});

describe('activeMembersFor', () => {
  const now = Date.UTC(2026, 10, 10);
  const ms = [
    { user_id: 'A', event_creator_id: 'ORG', valid_until: '2026-11-20T00:00:00Z' },
    { user_id: 'B', event_creator_id: 'ORG', valid_until: '2026-11-01T00:00:00Z' }, // abgelaufen
    { user_id: 'C', event_creator_id: 'ANDERER', valid_until: '2026-12-01T00:00:00Z' },
    { user_id: 'D', event_creator_id: null, valid_until: '2026-12-01T00:00:00Z' },
  ];
  test('nur gueltige Mitglieder desselben Erstellers', () => {
    expect(activeMembersFor(ms, paidEv, now).map((m) => m.user_id)).toEqual(['A']);
  });
  test('robust gegen leere Eingaben', () => {
    expect(activeMembersFor(undefined, paidEv, now)).toEqual([]);
    expect(activeMembersFor(ms, null, now)).toEqual([]);
  });
});

describe('Texte', () => {
  test('Admin-Labels', () => {
    expect(adminStatusLabel('paid').text).toContain('Bezahlt');
    expect(adminStatusLabel('waiting_friend').text).toContain('Wartet auf Freund');
    expect(adminStatusLabel('discount_open').text).toContain('Rabatt');
    expect(adminStatusLabel('unpaid').text).toContain('Nicht bezahlt');
    expect(adminStatusLabel('irgendwas').text).toContain('Nicht bezahlt');
  });
  test('Nutzertexte haben alle vier Sprachen', () => {
    for (const s of ['waiting_friend', 'discount_open', 'unpaid', 'paid']) {
      const t = userStatusTexts(s);
      expect(t).toHaveLength(4);
      t.forEach((x) => expect(x.length).toBeGreaterThan(2));
    }
  });
});

describe('Liste hinter OFFEN', () => {
  const now = new Date(2026, 10, 16, 8, 30).getTime(); // 16.11.2026
  const evOld = { id: 'old', title: 'Camp 1', price: 10, event_date: '2026-10-18' };
  const evNew = { id: 'new', title: 'Camp 2', price: 20, event_date: '2026-11-22' };
  const evFree = { id: 'free', title: 'Gratis', price: 0, event_date: '2026-11-23' };
  const parts = {
    old: [
      { id: 1, paid: true, user_id: 'a' },
      { id: 2, paid: false, user_id: 'b' },
    ],
    new: [
      { id: 3, paid: false, user_id: 'c', brought_friend_id: 'x', baf_unlocked: false },
      { id: 4, paid: false, user_id: 'd', brought_friend_id: 'y', baf_unlocked: true },
      { id: 5, paid: false, user_id: 'e' },
    ],
    free: [{ id: 6, paid: false, user_id: 'f' }],
  };
  const events = [evOld, evNew, evFree];

  test('offen = unbezahlt + Rabatt frei, kostenlose Events nie', () => {
    const rows = unpaidRows(events, parts, undefined, now);
    expect(rows.map(r => r.p.id).sort()).toEqual([2, 4, 5]);
    expect(rows.every(r => r.status !== 'free')).toBe(true);
  });
  test('wartend getrennt', () => {
    const rows = unpaidRows(events, parts, ['waiting_friend'], now);
    expect(rows.map(r => r.p.id)).toEqual([3]);
  });
  test('juengstes Event zuerst', () => {
    const rows = unpaidRows(events, parts, undefined, now);
    expect(rows[0].ev.id).toBe('new');
    expect(rows[rows.length - 1].ev.id).toBe('old');
  });
  test('vergangen-Markierung', () => {
    const rows = unpaidRows(events, parts, undefined, now);
    expect(rows.find(r => r.p.id === 2).past).toBe(true);
    expect(rows.find(r => r.p.id === 5).past).toBe(false);
    expect(isPastEvent({ event_date: '2026-11-16' }, now)).toBe(false); // heute zaehlt nicht als vorbei
    expect(isPastEvent({}, now)).toBe(false);
    expect(isPastEvent(null, now)).toBe(false);
  });
  test('offener Betrag', () => {
    expect(paymentDue({ paid: false }, evNew)).toBe(20);
    expect(paymentDue({ paid: false, brought_friend_id: 'y', baf_unlocked: true }, evNew)).toBe(10);
    expect(paymentDue({ paid: false, brought_friend_id: 'x' }, evNew)).toBe(10);
    expect(paymentDue({ paid: false, brought_friend_id: 'y', baf_unlocked: true }, { price: 5 })).toBe(0);
    expect(paymentDue({ paid: true }, evNew)).toBe(0);
    expect(paymentDue({ paid: false }, evFree)).toBe(0);
  });
  test('robust gegen leere Eingaben', () => {
    expect(unpaidRows(undefined, undefined)).toEqual([]);
    expect(unpaidRows(events, {})).toEqual([]);
  });
});
