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
