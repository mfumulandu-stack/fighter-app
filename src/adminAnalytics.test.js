import {
  dayKey,
  weekKey,
  lastNBucketKeys,
  buildTimeSeries,
  activeUserCounts,
  countSince,
  equipmentRanking,
  totalEquipmentClicks,
  eventRevenue,
  eventParticipationStats,
  gymStats,
  rankingActiveCount,
} from './adminAnalytics';

// Fester Bezugspunkt fuer deterministische Tests: 2026-07-15 12:00 UTC (ein Mittwoch)
const NOW = Date.UTC(2026, 6, 15, 12, 0, 0);
const DAY = 86400000;

describe('dayKey / weekKey', () => {
  test('dayKey liefert UTC-Datum YYYY-MM-DD', () => {
    expect(dayKey(Date.UTC(2026, 6, 15, 23, 30))).toBe('2026-07-15');
    expect(dayKey(Date.UTC(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  test('weekKey liefert den Montag der Woche', () => {
    // 2026-07-15 ist ein Mittwoch -> Montag ist der 13.
    expect(weekKey(Date.UTC(2026, 6, 15))).toBe('2026-07-13');
    // Montag selbst bleibt Montag
    expect(weekKey(Date.UTC(2026, 6, 13))).toBe('2026-07-13');
    // Sonntag gehoert noch zur selben Woche
    expect(weekKey(Date.UTC(2026, 6, 19))).toBe('2026-07-13');
  });
});

describe('lastNBucketKeys', () => {
  test('liefert n aufsteigende Tages-Schluessel inkl. heute', () => {
    expect(lastNBucketKeys(NOW, 3, 'day')).toEqual(['2026-07-13', '2026-07-14', '2026-07-15']);
  });

  test('liefert Wochen-Schluessel im 7-Tage-Abstand', () => {
    expect(lastNBucketKeys(NOW, 2, 'week')).toEqual(['2026-07-06', '2026-07-13']);
  });
});

describe('buildTimeSeries', () => {
  test('zaehlt Objekte pro Tag und fuellt leere Tage mit 0', () => {
    const items = [
      { created_at: '2026-07-15T08:00:00Z' },
      { created_at: '2026-07-15T20:00:00Z' },
      { created_at: '2026-07-13T10:00:00Z' },
    ];
    const series = buildTimeSeries(items, 'created_at', 'day', NOW, 3);
    expect(series).toEqual([
      { key: '2026-07-13', count: 1 },
      { key: '2026-07-14', count: 0 },
      { key: '2026-07-15', count: 2 },
    ]);
  });

  test('ignoriert fehlende und ungueltige Datumswerte', () => {
    const items = [{ created_at: null }, { created_at: 'kaputt' }, {}];
    const series = buildTimeSeries(items, 'created_at', 'day', NOW, 2);
    expect(series.every((b) => b.count === 0)).toBe(true);
  });

  test('leere Eingabe ergibt lauter Null-Buckets', () => {
    expect(buildTimeSeries([], 'created_at', 'day', NOW, 2)).toEqual([
      { key: '2026-07-14', count: 0 },
      { key: '2026-07-15', count: 0 },
    ]);
  });
});

describe('activeUserCounts', () => {
  test('zaehlt heute / Woche / Monat kumulativ', () => {
    const profiles = [
      { last_seen: new Date(NOW - 1 * 3600000).toISOString() }, // vor 1h -> alle drei
      { last_seen: new Date(NOW - 3 * DAY).toISOString() }, // 3 Tage -> Woche+Monat
      { last_seen: new Date(NOW - 10 * DAY).toISOString() }, // 10 Tage -> nur Monat
      { last_seen: new Date(NOW - 40 * DAY).toISOString() }, // 40 Tage -> nichts
      { last_seen: null }, // ignoriert
    ];
    expect(activeUserCounts(profiles, NOW)).toEqual({ today: 1, week: 2, month: 3 });
  });
});

describe('countSince', () => {
  test('zaehlt Objekte ab Zeitpunkt', () => {
    const items = [
      { created_at: new Date(NOW - 2 * DAY).toISOString() },
      { created_at: new Date(NOW - 12 * 3600000).toISOString() },
    ];
    expect(countSince(items, 'created_at', NOW - DAY)).toBe(1);
  });
});

describe('equipmentRanking / totalEquipmentClicks', () => {
  const equip = [
    { brand: 'Venum', product: 'Handschuhe', click_count: 5, category: 'Boxen' },
    { brand: 'Fairtex', product: 'Shinguards', click_count: 12, category: 'Muay Thai' },
    { brand: 'RDX', product: 'Sandsack', category: 'Zubehör' }, // kein click_count
  ];

  test('sortiert nach Klicks absteigend', () => {
    const r = equipmentRanking(equip);
    expect(r[0].product).toBe('Shinguards');
    expect(r[0].clicks).toBe(12);
    expect(r[2].clicks).toBe(0); // fehlend -> 0
  });

  test('summiert alle Klicks', () => {
    expect(totalEquipmentClicks(equip)).toBe(17);
  });
});

describe('eventRevenue', () => {
  const events = [
    { id: 1, title: 'Fight Night', price: 10 },
    { id: 2, title: 'Gratis Sparring', price: 0 },
    { id: 3, title: 'Seminar', price: 25 },
  ];
  const participants = [
    { event_id: 1, paid: true },
    { event_id: 1, paid: true },
    { event_id: 1, paid: false }, // nicht bezahlt -> zaehlt nicht
    { event_id: 3, paid: true },
    { event_id: 2, paid: true }, // Preis 0 -> 0 Umsatz
  ];

  test('berechnet Umsatz pro Event = bezahlte * Preis', () => {
    const { perEvent, total, ticketsSold } = eventRevenue(events, participants);
    // Seminar (25) vor Fight Night (20)
    expect(perEvent[0]).toMatchObject({ id: 3, revenue: 25, paidCount: 1 });
    expect(perEvent[1]).toMatchObject({ id: 1, revenue: 20, paidCount: 2 });
    expect(total).toBe(45);
    expect(ticketsSold).toBe(4);
  });
});

describe('eventParticipationStats', () => {
  test('Durchschnitt pro Event auf eine Nachkommastelle', () => {
    const events = [{ id: 1 }, { id: 2 }];
    const parts = [{ event_id: 1 }, { event_id: 1 }, { event_id: 2 }];
    expect(eventParticipationStats(events, parts)).toEqual({
      totalEvents: 2,
      totalParticipants: 3,
      avgPerEvent: 1.5,
    });
  });

  test('keine Events -> Durchschnitt 0 (keine Division durch 0)', () => {
    expect(eventParticipationStats([], []).avgPerEvent).toBe(0);
  });
});

describe('gymStats', () => {
  test('zaehlt gesamt, verifiziert und Stadt-Verteilung', () => {
    const gyms = [
      { city: 'Köln', verified: true },
      { city: 'Köln', verified: false },
      { city: 'Berlin', verified: true },
      { city: '', verified: false },
    ];
    const s = gymStats(gyms);
    expect(s.total).toBe(4);
    expect(s.verified).toBe(2);
    expect(s.byCity[0]).toEqual({ city: 'Köln', count: 2 });
    expect(s.byCity.find((c) => c.city === 'Unbekannt').count).toBe(1);
  });
});

describe('rankingActiveCount', () => {
  test('zaehlt Nutzer mit mindestens einem Kampf', () => {
    const profiles = [
      { wins: 3, losses: 1, draws: 0 },
      { wins: 0, losses: 0, draws: 1 },
      { wins: 0, losses: 0, draws: 0 },
      {},
    ];
    expect(rankingActiveCount(profiles)).toBe(2);
  });
});
