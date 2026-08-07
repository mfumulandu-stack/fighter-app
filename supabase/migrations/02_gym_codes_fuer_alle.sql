-- ============================================================
--  2) GYM-CODES: allen Gyms einen Verifizierungs-Code geben
-- ============================================================
--
-- AUSGANGSLAGE (geprueft am 07.08.2026):
--   326 Gyms insgesamt, aber nur 24 haben einen verify_code.
--   Im Admin-Bereich "Codes" erscheinen deshalb 302 Zeilen mit leerem
--   Code-Feld.
--
-- WICHTIG - zwei verschiedene Spalten nicht verwechseln:
--   gyms.code        = interne Kennung, z.B. "BC-HELIOS-9213"
--                      (wird u.a. fuer die Gym-Logos benutzt)
--   gyms.verify_code = der 8-stellige Code, den Mitglieder eingeben,
--                      um ihre Mitgliedschaft zu bestaetigen
--                      (z.B. "XSKBDT7D") -- NUR DIESER wird hier gefuellt.
--
-- Die Pruefung laeuft serverseitig ueber verify_gym_code(); die Codes
-- verlassen die Datenbank nie Richtung App. Deshalb muessen sie
-- eindeutig sein - sonst wuerde ein Code auf mehrere Gyms passen.
--
-- HINWEIS ZUR FRUEHEREN FASSUNG DIESER DATEI:
--   Dort stand die Zufalls-Erzeugung in einer Unterabfrage OHNE Bezug
--   auf die jeweilige Zeile. PostgreSQL berechnet so etwas nur EINMAL
--   und setzt denselben Wert ueberall ein - alle 302 Gyms bekamen den
--   gleichen Code, und das Anlegen des eindeutigen Index scheiterte
--   ("Key (verify_code)=(TQPDVCCE) is duplicated").
--   Jetzt fliesst die Gym-ID in die Berechnung ein, dadurch ist jede
--   Zeile zwangslaeufig verschieden.
--
-- SO FUEHRST DU DAS AUS:
--   Supabase-Dashboard -> SQL Editor -> New query -> alles hier
--   einfuegen -> "Run". Bestehende Codes bleiben unangetastet.
--   Mehrfaches Ausfuehren schadet nicht.
-- ============================================================

-- Schritt 1: Codes erzeugen fuer alle Gyms ohne Code.
-- Die Gym-ID ist Teil der Berechnung -> pro Zeile garantiert ein
-- anderer Wert. Ergebnis: 8 Zeichen aus 0-9 und A-F, z.B. "3F9A1C2E".
-- Dieser Zeichenvorrat enthaelt kein O und kein I, kann also beim
-- Abtippen nicht mit 0 oder 1 verwechselt werden.
UPDATE gyms
SET verify_code = upper(substr(md5(id::text || random()::text || clock_timestamp()::text), 1, 8))
WHERE verify_code IS NULL OR btrim(verify_code) = '';

-- Schritt 2: Sicherheitsnetz. Falls durch Zufall doch zwei gleiche
-- Codes entstanden sind (rechnerisch etwa 1 zu 80.000), werden die
-- Doppelten so lange neu gewuerfelt, bis alle eindeutig sind.
DO $$
DECLARE geaendert int;
BEGIN
  LOOP
    UPDATE gyms
    SET verify_code = upper(substr(md5(id::text || random()::text || clock_timestamp()::text), 1, 8))
    WHERE id IN (
      SELECT id FROM (
        SELECT id, row_number() OVER (PARTITION BY verify_code ORDER BY id) AS rn
        FROM gyms
        WHERE verify_code IS NOT NULL
      ) t WHERE t.rn > 1
    );
    GET DIAGNOSTICS geaendert = ROW_COUNT;
    EXIT WHEN geaendert = 0;
  END LOOP;
END $$;

-- Schritt 3: Kuenftige Doppelungen dauerhaft verhindern.
CREATE UNIQUE INDEX IF NOT EXISTS gyms_verify_code_idx
  ON gyms (verify_code)
  WHERE verify_code IS NOT NULL;

-- ── Kontrolle: erwartet 326 / 326 / 0 ──
SELECT count(*)                                        AS gyms_gesamt,
       count(verify_code)                              AS mit_code,
       count(verify_code) - count(DISTINCT verify_code) AS doppelte_codes
FROM gyms;
