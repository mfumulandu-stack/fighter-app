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
-- SO FUEHRST DU DAS AUS:
--   Supabase-Dashboard -> SQL Editor -> New query -> alles hier
--   einfuegen -> "Run". Bestehende Codes bleiben unangetastet.
-- ============================================================

-- Schritt 1: Codes erzeugen fuer alle Gyms, die noch keinen haben.
-- Zeichenvorrat bewusst ohne 0/O und 1/I - die werden beim Abtippen
-- oder Vorlesen sonst leicht verwechselt.
UPDATE gyms
SET verify_code = (
  SELECT string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                  floor(random() * 32)::int + 1, 1),
           '')
  FROM generate_series(1, 8)
)
WHERE verify_code IS NULL OR btrim(verify_code) = '';

-- Schritt 2: Eindeutigkeit sicherstellen. Falls durch Zufall zwei
-- gleiche Codes entstanden sind, bekommen die Doppelten neue.
-- (Bei 32^8 Moeglichkeiten sehr unwahrscheinlich, aber sicher ist sicher.)
UPDATE gyms
SET verify_code = (
  SELECT string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                  floor(random() * 32)::int + 1, 1),
           '')
  FROM generate_series(1, 8)
)
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY verify_code ORDER BY created_at) AS n
    FROM gyms
    WHERE verify_code IS NOT NULL
  ) t WHERE t.n > 1
);

-- Schritt 3: Kuenftige Doppelungen dauerhaft verhindern.
CREATE UNIQUE INDEX IF NOT EXISTS gyms_verify_code_idx
  ON gyms (verify_code)
  WHERE verify_code IS NOT NULL;

-- ── Kontrolle: sollte 326 / 326 / 0 zeigen ──
SELECT count(*) AS gyms_gesamt,
       count(verify_code) AS mit_code,
       count(*) - count(DISTINCT verify_code) AS doppelte_codes
FROM gyms;
