# Fighter App — Projektstand (08.08.2026)

Kampfsport-Matching-App für den DACH-Raum · fighterapp.de · iOS 1.12 im App Store
React + Supabase + Vercel + Capacitor · GitHub: mfumulandu-stack/fighter-app

---

## ⚠️ Zuerst lesen: zwei wiederkehrende Fallen

**1. App.js wurde schon zweimal durch alte Kopien überschrieben.**
Dabei gingen fertige Fehlerbehebungen verloren, ohne dass Build oder Tests
etwas gemerkt haben. Deshalb gibt es jetzt `npm run check:integrity`
(läuft automatisch vor jedem Commit als Git-Hook). Sie schlägt an bei:
- dem `service_role`-Schlüssel im Client-Code
- zu wenigen Modul-Importen in App.js (< 15, aktuell 21)
- zurückgekehrten Inline-Kopien ausgelagerter Komponenten

**Vor jeder Sitzung prüfen:** `head -25 src/App.js` — dort müssen die
Import-Zeilen stehen. Und vor jedem Commit `git diff --stat src/App.js`:
Tausende geänderte Zeilen bei kleiner Änderung = Warnsignal.

**2. Es gab mehrfach Code ohne Gegenstück.**
Erst fehlten Datenbank-Spalten, dann rief die App eine Server-Funktion auf,
die nie gebaut wurde (`create-revolut-order`). Beides fiel erst auf, als
es jemand benutzen wollte. Bei neuen Funktionen also immer prüfen:
Gibt es die Gegenseite wirklich?

---

## Arbeitsweise (vom Nutzer gewünscht)

Einsteiger-Entwickler, Erklärungen auf Deutsch, Schritt für Schritt.

1. Änderung machen
2. Syntax prüfen (`node -e` mit @babel/parser)
3. `CI=true npm test` — **50 Tests**, müssen grün bleiben
4. `npm run build`
5. `npm run check:undef` und `npm run check:integrity`
6. Commit + Push (löst automatisch Vercel-Deploy aus)
7. Bei nativen Änderungen: `npx cap sync ios` + Xcode-Build

Vor größeren Schritten: Plan vorlegen und Freigabe abwarten.
Bei Unsicherheit fragen statt raten. Verhalten nie nebenbei ändern —
gefundene Fehler getrennt melden.

---

## Aufbau

App.js wurde von 8.015 auf ~4.500 Zeilen verkleinert, 17 Module:

| Datei | Inhalt |
|---|---|
| `App.js` | Haupt-Komponente (Swipe, Chat-Liste, Rangliste, Gyms, Events, Profil) |
| `AdminPanel.js` | Admin-Bereich, 14 Unterbereiche, Seitenleisten-Navigation |
| `ChatOverlay.js` | Chat-Fenster |
| `translations.js` | Texte DE/EN/FR/ES |
| `GymDetailScreen.js`, `EquipmentScreen.js`, `AuthScreen.js`, `UserGlobe.js`, `GymVerifyModal.js`, `ImgPositionEditor.js`, `ErrorBoundary.js` | einzelne Ansichten |
| `appData.js` | Stammdaten (Gyms, Städte, Gewichtsklassen) + Entfernungs-Helfer |
| `supabaseApi.js` | Datenbank, Login, Admin-Schleuse, Foto-Upload |
| `constants.js` | SUPA_URL, SUPA_KEY, ADMIN_ID, APP_STORE_ID, **CURRENT_APP_VERSION** |
| `adminAnalytics.js` | reine Berechnungen fürs Dashboard (+ 16 Tests) |
| `styles.js`, `uiHelpers.js`, `notifications.js` | Stil, UI-Bausteine, Benachrichtigungen |

**Wichtig:** `CURRENT_APP_VERSION` bei jedem neuen iOS-Build in
`src/constants.js` hochsetzen (nicht mehr in App.js).

**Admin-Zugriffe** laufen über `adminFetch()` → Edge Function `admin-proxy`.
Nie `session.token` direkt für Admin-Aktionen verwenden — RLS blockiert das
stillschweigend.

---

## 🔴 Offen — vom Nutzer zu erledigen

1. **`service_role`-Schlüssel in Supabase rotieren.** Er war am 3./4.8. rund
   14 Stunden im Live-Bundle öffentlich abrufbar. Aus dem Code entfernt ≠
   ungültig. Supabase → Project Settings → API → service_role → Regenerate.
   Neuen Wert nur als Edge-Function-Secret hinterlegen.

2. **`npx cap sync ios` + Xcode-Build.** Die iPhone-App bündelt eigenes
   JavaScript und ist auf dem Stand vom 6.8. Sie hat KEINE der Korrekturen
   der letzten Tage. Das ist auch die Erklärung dafür, dass Nutzer etwas
   anderes sehen als auf der Website.

3. **Ticketkauf zu Ende testen.** Siehe nächster Abschnitt.

---

## 🟡 Laufender Vorgang: Event-Bezahlung

Der Ticketkauf war an **fünf** Stellen unterbrochen. Vier sind behoben:

| Problem | Status |
|---|---|
| Spalten `events.price`, `event_participants.paid/amount_paid/stripe_session_id` fehlten | ✅ per SQL angelegt |
| Webhook prüfte sein Ergebnis nicht (Zahlung wäre still verloren gegangen) | ✅ behoben, meldet Fehler + gibt 500 für erneute Zustellung |
| Supabase blockierte Stripes Webhook-Aufruf mit 401 | ✅ `supabase/config.toml` mit `verify_jwt = false` |
| App rief `create-revolut-order` auf — existierte nie | ✅ zurück auf `create-checkout` (Stripe) |
| Anmelde-Token lief nach 1 h ab → „Ungültiger Token" beim Kauf | ✅ `getFreshToken()` erneuert vor jedem Kauf |

**Stripe ist eingerichtet** (Testmodus): Schlüssel und Webhook-Secret gesetzt,
Endpunkt `inspiring-excellence` aktiv, `create-checkout` liefert nachweislich
eine Zahlungsseite.

**Noch nicht bestätigt:** Ein kompletter Kauf. Beim letzten Versuch zeigte
Stripe **0 Ereignisübermittlungen** — die Zahlung wurde also vermutlich nicht
zu Ende geführt (Stripe meldet nur bei Abschluss). `event_participants` ist
weiterhin leer.

**Nächster Schritt:** Auf **fighterapp.de** (nicht im Test-Handy, das hat
alten Code) einloggen → Events → Test-Event „TEST — Ticketkauf prüfen" (1 €)
→ Testkarte `4242 4242 4242 4242`, Datum `12/30`, Prüfziffer `123`.
Danach prüfen, ob ein Eintrag in `event_participants` mit `paid=true`
entsteht. Falls nicht: im Stripe-Dashboard unter Webhooks →
Ereignisübermittlungen nachsehen, ob etwas ankam und mit welchem Status.

**Danach aufräumen:** Test-Event löschen.

**PayPal:** Geht über Stripe mit einem Häkchen (Dashboard → Zahlungsmethoden),
weil im Code keine Zahlarten fest hinterlegt sind. Ein *privates* PayPal-Konto
funktioniert nicht — PayPal verlangt ein Geschäftskonto.
Hinweis: Ticketverkauf ist gewerbliche Tätigkeit (Gewerbe/Steuer) — sollte der
Nutzer fachlich klären. Apple verlangt für Tickets zu echten Veranstaltungen
**keine** In-App-Käufe, externe Bezahlung ist erlaubt.

---

## Zuletzt behoben (Auswahl)

- **Admin-Schleuse:** Jede verändernde Aktion scheiterte mit 500
  (`Response with null body status cannot have body` bei HTTP 204).
  Betraf Löschen/Bearbeiten in fast allen Admin-Bereichen.
- **Equipment & Supplements** zeigten keine Produkte: Ein Zeitstempel `&_ts=`
  in der URL wurde von Supabase als Spaltenfilter gedeutet → ganze Abfrage
  brach ab. **Nie unbekannte Parameter an REST-URLs hängen.**
- **Swipe-Statistik** stand auf 0: Abfrage auf `swipes.created_at`, diese
  Spalte existiert nicht (Tabelle hat nur id, swiper_id, target_id, direction).
- **Gym-Codes:** Alle 326 Gyms haben jetzt einen `verify_code` (vorher 24),
  Codes-Bereich mit alphabetischer Sortierung und Suche über Name/Stadt/Code.
- **Gym-Bewertungen:** Wurden nur geladen, wenn man selbst schon bewertet
  hatte → 96 % der Nutzer sahen gar keine. Zusätzlich laden sie jetzt beim
  Öffnen des Gyms-Tabs neu.
- **Knopf „Alle Duplikate löschen"** im Gym-Manager (behält je Gruppe den ersten).
- **Meine Buchungen:** neue Übersicht im Events-Bereich.

## Bekannt, nicht behoben (bewusst)

- **Rangliste filtert nach Geschlecht und Land** — vom Nutzer so gewollt.
  Ein Österreicher sieht dadurch 2 Kämpfer, ein Deutscher 231.
- **Ersteller können ihr eigenes Event nicht buchen** (`isOwner` blendet den
  Kauf-Knopf aus). Für Tests deshalb ein Event mit anderem Ersteller anlegen.
- **24 Gyms stehen fest im Code** (`appData.js`) und werden mit den 321 aus
  der Datenbank gemischt. Das erzeugt Duplikate und unterscheidet sich je
  App-Version. Empfehlung: einmalig in die Datenbank übernehmen und aus dem
  Code entfernen — noch nicht entschieden.
- **KI-Gym-Suche** im Admin (addgym) ruft `api.anthropic.com` ohne Schlüssel
  direkt aus dem Browser auf → funktioniert nicht (CORS + fehlende Anmeldung).
  Bräuchte eine eigene Edge Function.

---

## Nützliche Befehle

```bash
npm run check:integrity   # Schutz gegen überschriebene App.js
npm run check:undef       # findet unbekannte Namen, auch in JSX
CI=true npm test          # 50 Tests
supabase functions deploy <name>
supabase secrets list
```

Projekt-Kennung Supabase: `uykdrmymjvqgebsmndme`
Admin-Profil-ID: `041eb7c4-03ac-4b87-9e22-ec735585ee5a`
