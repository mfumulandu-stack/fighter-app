// Reine, testbare Berechnungs-Logik fuer das Admin-Analytics-Dashboard.
// Bewusst als eigene Datei ausgelagert (wie matchScore.js / autoFilters.js),
// damit die Zahlen-Logik isoliert getestet werden kann, ohne React oder
// Netzwerk. ALLE Funktionen hier sind pur: gleiche Eingabe -> gleiche
// Ausgabe, keine Seiteneffekte. Zeit wird immer als Parameter (nowMs)
// hereingereicht, damit Tests deterministisch sind.

const DAY_MS = 86400000;
const WEEK_MS = 604800000;

// ── Datums-Schluessel (immer UTC, damit Tests zeitzonen-unabhaengig sind) ──

// Wandelt einen Zeitstempel in einen Tages-Schluessel "YYYY-MM-DD" um.
export function dayKey(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Schluessel der Kalenderwoche = Datum des (UTC-)Montags dieser Woche.
export function weekKey(ms) {
  const d = new Date(ms);
  const dow = (d.getUTCDay() + 6) % 7; // Mo=0 ... So=6
  const mondayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * DAY_MS;
  return dayKey(mondayMs);
}

// Liefert die Schluessel der letzten n Perioden (inkl. jetzt), chronologisch
// aufsteigend. period: 'day' oder 'week'.
export function lastNBucketKeys(nowMs, n, period) {
  const step = period === 'week' ? WEEK_MS : DAY_MS;
  const keyFn = period === 'week' ? weekKey : dayKey;
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(keyFn(nowMs - i * step));
  }
  return keys;
}

// Baut eine Zeitreihe: fuer jede der letzten n Perioden die Anzahl der
// Objekte, deren dateField in diese Periode faellt. Fehlende Datumswerte
// werden ignoriert. Rueckgabe: [{ key, count }] chronologisch aufsteigend.
export function buildTimeSeries(items, dateField, period, nowMs, n) {
  const keyFn = period === 'week' ? weekKey : dayKey;
  const counts = {};
  (items || []).forEach((it) => {
    const raw = it && it[dateField];
    if (!raw) return;
    const ms = new Date(raw).getTime();
    if (Number.isNaN(ms)) return;
    const k = keyFn(ms);
    counts[k] = (counts[k] || 0) + 1;
  });
  return lastNBucketKeys(nowMs, n, period).map((key) => ({ key, count: counts[key] || 0 }));
}

// ── Aktive Nutzer anhand last_seen ──

// Zaehlt Nutzer, die heute / in den letzten 7 / 30 Tagen aktiv waren.
export function activeUserCounts(profiles, nowMs) {
  const res = { today: 0, week: 0, month: 0 };
  (profiles || []).forEach((p) => {
    if (!p || !p.last_seen) return;
    const diff = nowMs - new Date(p.last_seen).getTime();
    if (Number.isNaN(diff) || diff < 0) return;
    if (diff < DAY_MS) res.today++;
    if (diff < 7 * DAY_MS) res.week++;
    if (diff < 30 * DAY_MS) res.month++;
  });
  return res;
}

// Zaehlt neue Objekte seit einem Zeitpunkt (z.B. Registrierungen heute).
export function countSince(items, dateField, sinceMs) {
  let c = 0;
  (items || []).forEach((it) => {
    const raw = it && it[dateField];
    if (!raw) return;
    const ms = new Date(raw).getTime();
    if (!Number.isNaN(ms) && ms >= sinceMs) c++;
  });
  return c;
}

// ── Equipment-Klicks ──

// Sortiert Produkte nach Klickzahl (meiste zuerst). Rueckgabe pro Produkt:
// { brand, product, clicks, category, featured }.
export function equipmentRanking(equipment) {
  return (equipment || [])
    .map((e) => ({
      brand: e.brand || '',
      product: e.product || '',
      clicks: e.click_count || 0,
      category: e.category || '',
      featured: !!e.featured,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

// Summe aller Equipment-Klicks.
export function totalEquipmentClicks(equipment) {
  return (equipment || []).reduce((sum, e) => sum + (e.click_count || 0), 0);
}

// ── Ticketing-Umsatz ──
// Umsatz pro Event = Anzahl bezahlter Teilnehmer * Event-Preis.
// (Es gibt keine amount_paid-Spalte; dieselbe Formel nutzt bereits die
// bestehende Event-Detail-Ansicht.)
// events: [{ id, title, price, event_date }]
// participants: [{ event_id, paid }]
export function eventRevenue(events, participants) {
  const paidByEvent = {};
  (participants || []).forEach((p) => {
    if (p && p.paid && p.event_id != null) {
      paidByEvent[p.event_id] = (paidByEvent[p.event_id] || 0) + 1;
    }
  });
  const perEvent = (events || []).map((ev) => {
    const paidCount = paidByEvent[ev.id] || 0;
    const price = Number(ev.price) || 0;
    return {
      id: ev.id,
      title: ev.title || '',
      price,
      paidCount,
      revenue: paidCount * price,
    };
  });
  const total = perEvent.reduce((sum, e) => sum + e.revenue, 0);
  const ticketsSold = perEvent.reduce((sum, e) => sum + e.paidCount, 0);
  return { perEvent: perEvent.sort((a, b) => b.revenue - a.revenue), total, ticketsSold };
}

// ── Event-Teilnahme ──
// Durchschnittliche Teilnehmerzahl pro Event (alle Teilnehmer, nicht nur bezahlte).
export function eventParticipationStats(events, participants) {
  const countByEvent = {};
  (participants || []).forEach((p) => {
    if (p && p.event_id != null) countByEvent[p.event_id] = (countByEvent[p.event_id] || 0) + 1;
  });
  const totalEvents = (events || []).length;
  const totalParticipants = (participants || []).length;
  const avg = totalEvents > 0 ? totalParticipants / totalEvents : 0;
  return { totalEvents, totalParticipants, avgPerEvent: Math.round(avg * 10) / 10 };
}

// ── Gym-Statistiken ──

// Gesamt, verifiziert, und Verteilung nach Stadt (haeufigste zuerst).
export function gymStats(gyms) {
  const cityCounts = {};
  let verified = 0;
  (gyms || []).forEach((g) => {
    if (!g) return;
    if (g.verified) verified++;
    const city = (g.city || 'Unbekannt').trim() || 'Unbekannt';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });
  const byCity = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
  return { total: (gyms || []).length, verified, byCity };
}

// ── Rangliste-Aktivitaet ──
// Anzahl Nutzer mit mindestens einem eingetragenen Kampf (Sieg/Niederlage/Unentschieden).
export function rankingActiveCount(profiles) {
  return (profiles || []).filter((p) => {
    if (!p) return false;
    return (p.wins || 0) + (p.losses || 0) + (p.draws || 0) > 0;
  }).length;
}

// ── Kleine Helfer fuer die Anzeige ──
export { DAY_MS, WEEK_MS };
