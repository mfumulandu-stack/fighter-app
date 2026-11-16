// Reine Hilfsfunktionen fuer Event-Anmeldungen und Bezahlstatus.
//
// Frueher stand an mehreren Stellen "parts.length" bzw. "paid ? ... : Nicht
// bezahlt". Dadurch
//   * zaehlten wartende, unbezahlte "Freund mitbringen"-Eintraege als belegter
//     Platz (ein Training wirkte "voll", obwohl Plaetze frei waren),
//   * sah der Veranstalter bei allen Unbezahlten nur "❌ Nicht bezahlt" - egal
//     ob jemand auf seinen Freund wartet, den Rabatt noch einloesen muss oder
//     wirklich nicht gezahlt hat,
//   * waren Monatsmitglieder in der Teilnehmerliste unsichtbar.

export const BAF_DISCOUNT = 10;

// Status einer Teilnahme-Zeile:
//   free           kostenloses Event
//   paid           bezahlt
//   discount_open  Freund hat bezahlt, Rabatt ist frei, eigene Zahlung fehlt
//   waiting_friend wartet darauf, dass der mitgebrachte Freund bezahlt
//   unpaid         angemeldet, aber nicht bezahlt
export function participantStatus(p, ev) {
  const price = Number(ev && ev.price) || 0;
  if (price <= 0) return 'free';
  if (p && p.paid) return 'paid';
  if (p && p.baf_unlocked) return 'discount_open';
  if (p && p.brought_friend_id) return 'waiting_friend';
  return 'unpaid';
}

// Nur Bezahlte (bzw. alle bei kostenlosen Events) belegen einen Platz.
export function countsTowardCapacity(p, ev) {
  const s = participantStatus(p, ev);
  return s === 'free' || s === 'paid';
}

export function capacityCount(parts, ev) {
  return (parts || []).filter(p => countsTowardCapacity(p, ev)).length;
}

export function isFullEvent(parts, ev) {
  return capacityCount(parts, ev) >= ((ev && ev.max_participants) || 10);
}

// Gezahlter Betrag einer Zeile. amount_paid = 0 (Rabatt macht es gratis) ist
// ein gueltiger Wert und darf NICHT durch den Listenpreis ersetzt werden.
export function paidAmount(p, ev) {
  if (!p || !p.paid) return 0;
  if (p.amount_paid != null && p.amount_paid !== '' && !Number.isNaN(Number(p.amount_paid))) {
    return Number(p.amount_paid);
  }
  return Number(ev && ev.price) || 0;
}

export function revenueOf(parts, ev) {
  return (parts || []).reduce((sum, p) => sum + paidAmount(p, ev), 0);
}

export function paidCount(parts) {
  return (parts || []).filter(p => p && p.paid).length;
}

// Aktive Monatsmitglieder, die fuer dieses Event gelten (gleicher Ersteller).
export function activeMembersFor(memberships, ev, now = Date.now()) {
  if (!ev) return [];
  return (memberships || []).filter(m =>
    m && m.event_creator_id != null && m.event_creator_id === ev.creator_id &&
    m.valid_until && new Date(m.valid_until).getTime() > now
  );
}

// Darstellung fuer das Admin-Panel (deutsch, nur der Admin sieht sie).
export function adminStatusLabel(status) {
  switch (status) {
    case 'paid': return { text: '✅ Bezahlt', color: '#27ae60' };
    case 'free': return { text: 'Kostenlos', color: '#888' };
    case 'waiting_friend': return { text: '⏳ Wartet auf Freund', color: '#d4a017' };
    case 'discount_open': return { text: '🎟️ Rabatt frei – Zahlung offen', color: '#2980b9' };
    default: return { text: '❌ Nicht bezahlt', color: '#e74c3c' };
  }
}

// Texte fuer die Nutzer-Ansicht ("Meine Buchungen"). Reihenfolge: de, en, fr, es.
export function userStatusTexts(status) {
  switch (status) {
    case 'waiting_friend':
      return ['⏳ Wartet auf Freund', '⏳ Waiting for friend', '⏳ En attente de l\'ami', '⏳ Esperando al amigo'];
    case 'discount_open':
      return ['🎟️ Rabatt frei – jetzt zahlen', '🎟️ Discount ready – pay now', '🎟️ Remise dispo – payer', '🎟️ Descuento listo – pagar'];
    case 'unpaid':
      return ['Zahlung offen', 'Payment pending', 'Paiement en attente', 'Pago pendiente'];
    default:
      return ['Angemeldet', 'Registered', 'Inscrit', 'Inscrito'];
  }
}
