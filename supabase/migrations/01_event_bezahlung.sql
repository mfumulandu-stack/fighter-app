-- ============================================================
--  1) EVENT-BEZAHLUNG: fehlende Spalten ergaenzen
-- ============================================================
--
-- WARUM: Der App-Code und der Stripe-Webhook schreiben und lesen vier
-- Spalten, die in der Datenbank nie angelegt wurden. Dadurch:
--   * schlug das ANLEGEN eines Events immer fehl (price wird immer
--     mitgeschickt, auch bei 0 EUR)
--   * schlug der Stripe-Webhook nach erfolgreicher Zahlung fehl - der
--     Teilnehmer wurde NICHT eingetragen, obwohl das Geld eingezogen war
--   * zeigte das Admin-Dashboard beim Ticketing immer 0 EUR
--
-- Geprueft am 07.08.2026: Die Tabelle event_participants war leer, es
-- ist also noch kein Zahlungsfall betroffen gewesen.
--
-- SO FUEHRST DU DAS AUS:
--   Supabase-Dashboard -> SQL Editor -> New query -> alles hier
--   einfuegen -> "Run". IF NOT EXISTS bedeutet: mehrfaches Ausfuehren
--   schadet nicht.
-- ============================================================

-- Preis eines Events in Euro. 0 = kostenlos (Standard).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS price numeric(10,2) NOT NULL DEFAULT 0;

-- Wurde fuer diese Teilnahme bezahlt?
ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

-- Tatsaechlich gezahlter Betrag in Euro (kommt aus Stripe).
ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2);

-- Stripe-Sitzungs-Kennung - dient auch dazu, doppelte Eintraege zu
-- verhindern, falls Stripe denselben Webhook mehrfach schickt.
ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Schutz gegen Doppelbuchung bei wiederholtem Webhook-Aufruf.
CREATE UNIQUE INDEX IF NOT EXISTS event_participants_stripe_session_idx
  ON event_participants (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ── Kontrolle: sollte 4 Zeilen liefern ──
SELECT table_name, column_name
FROM information_schema.columns
WHERE (table_name = 'events' AND column_name = 'price')
   OR (table_name = 'event_participants'
       AND column_name IN ('paid', 'amount_paid', 'stripe_session_id'))
ORDER BY table_name, column_name;
