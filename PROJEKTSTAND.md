# Fighter App — Projektstand (09.08.2026)

Kampfsport-Matching-App für den DACH-Raum · fighterapp.de · iOS 1.12 im App Store
React + Supabase + Vercel + Capacitor · GitHub: mfumulandu-stack/fighter-app

---

## ⚠️ Zuerst lesen: drei wiederkehrende Fallen

**1. App.js wurde schon zweimal durch alte Kopien überschrieben.**
Dabei gingen fertige Fehlerbehebungen verloren, ohne dass Build oder Tests
etwas gemerkt haben. Deshalb gibt es jetzt `npm run check:integrity`
(läuft automatisch vor jedem Commit als Git-Hook). Sie schlägt an bei:
- dem `service_role`-Schlüssel im Client-Code
- zu wenigen Modul-Importen in App.js (< 15, aktuell 25)
- zurückgekehrten Inline-Kopien ausgelagerter Komponenten

**Vor jeder Sitzung prüfen:** `head -25 src/App.js` — dort müssen die
Import-Zeilen stehen. Und vor jedem Commit `git diff --stat src/App.js`:
Tausende geänderte Zeilen bei kleiner Änderung = Warnsignal.

**2. Es gab mehrfach Code ohne Gegenstück.**
Erst fehlten Datenbank-Spalten, dann rief die App eine Server-Funktion auf,
die nie gebaut wurde (`create-revolut-order`). Beides fiel erst auf, als
es jemand benutzen wollte. Bei neuen Funktionen also immer prüfen:
Gibt es die Gegenseite wirklich?

**3. „Erfolg melden, ohne das Ergebnis zu prüfen."**
Das ist der teuerste Fehler dieses Projekts. Er trat am 08.08. an **vier**
Stellen auf: Webhook, Ticketkauf, Anmelden, Abmelden. Überall stand eine
Erfolgsmeldung fest im Code, egal was der Server antwortete. Dadurch sahen
Nutzer „Zahlung erfolgreich" bzw. „Abgemeldet", während in Wahrheit nichts
passierte — und die Fehlersuche dauerte Stunden, weil die App selbst log.

**Regel:** Jede verändernde Anfrage muss ihr Ergebnis ansehen.

**Und eine Tücke dabei:** Der Datenbank-Dienst (PostgREST) meldet bei
DELETE und UPDATE auch dann Erfolg, wenn die Zugriffsregeln die Zeile
ausblenden und **null Zeilen** betroffen waren. Ein blosses `r.ok` reicht
also nicht. Richtig ist `Prefer: return=representation` und danach zählen,
was tatsächlich zurückkam. Vorbilder: `leaveEvent`, `joinEvent`,
`saveEventEdit` in App.js.

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
**Änderungen an der Produktiv-Datenbank immer vorher zeigen und freigeben
lassen** — nicht nebenbei ausführen.
Bei Unsicherheit fragen statt raten. Verhalten nie nebenbei ändern —
gefundene Fehler getrennt melden.

---

## Aufbau

App.js wurde von 8.015 auf ~4.900 Zeilen verkleinert, 26 Module:

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
`src/constants.js` hochsetzen (nicht mehr in App.js). Steht aktuell auf
**1.13** — der zugehörige Store-Build ist noch nicht eingereicht.

**Admin-Zugriffe** laufen über `adminFetch()` → Edge Function `admin-proxy`.
Nie `session.token` direkt für Admin-Aktionen verwenden — RLS blockiert das
stillschweigend.

**Tokens laufen nach 1 Stunde ab.** Vor jeder verändernden Aktion
`getFreshToken()` benutzen, nicht `session.token`.

**Das Event-Formular** dient Anlegen *und* Bearbeiten (`editEventId` steuert
den Modus). Es liegt bewusst auf oberster Ebene und nicht im Events-Tab:
aus dem Admin-Bereich heraus (zIndex 600) wäre es sonst unsichtbar. Es
liegt auf zIndex 700.

---

## 🔑 Zugriffsregeln (RLS) — der Fehler, der sich durchzieht

`profiles` hat **zwei** IDs, und sie werden ständig verwechselt:

| Spalte | Inhalt |
|---|---|
| `profiles.id` | die **Profil-ID** |
| `profiles.user_id` | die **Anmelde-ID** — das ist, was `auth.uid()` liefert |

Von 591 Profilen ist in **keinem einzigen** `id` gleich `user_id`.

In `event_participants.user_id` und in `events.creator_id` steht die
**Profil-ID**. Mehrere RLS-Regeln verglichen diese Spalten aber mit
`auth.uid()` — sie konnten also nie zutreffen. Folge: Anmelden und
Abmelden wurden lautlos abgewiesen. Nur der Webhook kam durch, weil
`service_role` alle Regeln umgeht — deshalb funktionierte ausgerechnet
der komplizierte Ticketkauf, während das simple Anmelden scheiterte.

**Richtig ist:**
```sql
using (user_id in (select id from profiles where user_id = auth.uid()))
```

Korrigiert für `event_participants` (INSERT + DELETE) und für `events`
(UPDATE + DELETE). Beim Löschen von `event_participants` gilt
zusätzlich `and coalesce(paid,false) = false` — bezahlte Tickets soll
niemand selbst zurückgeben, und der ausgeblendete Knopf allein liesse
sich über die Schnittstelle umgehen.

**Prüfen lässt sich das ohne Anmeldung**, in einer Transaktion mit Rollback:
```sql
begin;
select set_config('request.jwt.claims','{"sub":"<anmelde-id>","role":"authenticated"}', true);
set local role authenticated;
-- hier die Anweisung testen
rollback;
```

**Unvollständig geprüft:** Für `event_participants` wurden alle drei Fälle
durchgespielt (eigenes Profil klappt, fremdes wird mit 42501 abgewiesen,
bezahltes Ticket trifft 0 Zeilen). Für `events` lief nur der erste Fall
(eigenes Event ändern → 1 Zeile). Die Gegenproben „fremdes Event ändern"
und „fremdes Event löschen" brachen wegen einer trägen Datenbank ab und
sind **nicht bestätigt**. Nachholen.

---

## 🔴 Offen — vom Nutzer zu erledigen

1. **Xcode-Build 1.13 einreichen.** `npx cap sync ios` ist am 09.08.
   gelaufen, das frische Bundle liegt im iOS-Projekt. Es fehlen nur noch
   Version auf `1.13` setzen, Build-Nummer hochzählen, archivieren,
   hochladen. Die Store-Version 1.12 vom 6.8. hat **keine** der
   Korrekturen vom 8./9.8.

2. **`service_role`-Schlüssel rotieren — aber nicht unüberlegt.**
   Er war am 3./4.8. rund 14 Stunden im Live-Bundle öffentlich abrufbar
   und liegt in 11 Commits auf GitHub. Aus dem Code entfernt ≠ ungültig.

   **Die Falle:** `anon` und `service_role` sind beide JWTs, signiert mit
   **einem gemeinsamen JWT-Geheimnis** des Projekts. Man kann sie nicht
   einzeln erneuern. Ein Rotieren macht auch den `anon`-Schlüssel ungültig
   — und der steckt seit dem 20.04. unverändert fest gebacken in der
   iPhone-App im Store. Die wäre danach **tot**, bis ein neuer Build durch
   die App-Store-Prüfung ist (1–3 Tage). Zusätzlich fliegen alle
   angemeldeten Nutzer raus.

   **Reihenfolge muss sein:** erst 1.13 im Store, dann rotieren.
   Vorher auf der Seite **JWT Keys** nachsehen, ob eine Rotation mit
   Übergangsfrist angeboten wird — das würde die Sache entschärfen.
   Auf der Seite *API Keys* gibt es bewusst keinen Einzel-Regenerate;
   der Knopf „Disable JWT-based API keys" dort ist gefährlich.

3. **Events-Regel fürs Anlegen zumachen.** Aktuell gilt
   `events_insert: with check (auth.uid() IS NOT NULL)` — **jeder**
   eingeloggte Nutzer darf über die Schnittstelle Events anlegen. Dass in
   der App kein Knopf sichtbar ist, liegt nur an `isAdmin` in der
   Oberfläche und sichert nichts. Der Nutzer will das zumachen. Vorschlag:
   ```sql
   drop policy if exists events_insert on events;
   create policy events_insert on events for insert to public
     with check (auth.uid() = '1a697731-458d-4559-a4cf-a89d3150bfa5'::uuid);
   ```
   (Dieselbe Kennung wie `ADMIN_ID` in constants.js und in `admin-proxy`.)
   Sauberer wäre langfristig ein `is_admin`-Feld in `profiles` — ob es so
   eines gibt, wurde noch nicht zu Ende geprüft.

4. **Markennamen im Equipment vereinheitlichen.** `GOLDENNATION`
   (1 Produkt) steht getrennt von `Golden Nation` (2 Produkte). Die App
   fasst Gross-/Kleinschreibung und Leerzeichen zusammen, diese Variante
   aber bewusst nicht — das wäre geraten.

---

## ✅ Event-Bezahlung — abgeschlossen

Der Ticketkauf war an **fünf** Stellen unterbrochen. Alle behoben, und am
08.08. erstmals **komplett bestätigt**: Zahlung → Webhook → Datenbank →
Anzeige in „Meine Buchungen".

| Problem | Status |
|---|---|
| Spalten `events.price`, `event_participants.paid/amount_paid/stripe_session_id` fehlten | ✅ per SQL angelegt |
| Webhook prüfte sein Ergebnis nicht | ✅ meldet Fehler + gibt 500 für erneute Zustellung |
| Supabase blockierte Stripes Webhook-Aufruf mit 401 | ✅ `supabase/config.toml` mit `verify_jwt = false` |
| App rief `create-revolut-order` auf — existierte nie | ✅ zurück auf `create-checkout` (Stripe) |
| Anmelde-Token lief nach 1 h ab | ✅ `getFreshToken()` erneuert vor jedem Kauf |

### ⚠️ Die Stripe-Sandbox-Falle — hat den ganzen Abend gekostet

Die Zahlung lief durch, die App meldete Erfolg, **aber es gab null
Webhook-Zustellungen** und keinen Eintrag in der Datenbank.

Ursache: Eine Stripe-**Sandbox** ist eine vollständig abgeschottete
Umgebung mit **eigenen Schlüsseln und eigenen Webhook-Endpunkten** — nicht
dasselbe wie der klassische Testmodus. `STRIPE_SECRET_KEY` gehörte zur
Sandbox „New business Sandbox", der Webhook-Endpunkt lag aber in einer
anderen Umgebung. Stripe hat ihn deshalb **nie aufgerufen**: keine
Zustellung, kein Fehler, nirgends ein Hinweis.

**Woran man es erkennt:** Unter *Ereignisse* in der falschen Umgebung
taucht das `checkout.session.completed` gar nicht erst auf. Ereignisse
entstehen bei Stripe immer, unabhängig von jedem Empfänger — fehlt es
dort, schaut man in die falsche Umgebung (oder die Zahlung war nie
abgeschlossen).

**Beim Wechsel auf Live wiederholt sich das.** Der Live-Modus hat wieder
eigene Schlüssel und einen eigenen Endpunkt. `STRIPE_SECRET_KEY` **und**
`STRIPE_WEBHOOK_SECRET` müssen dann **gemeinsam** umgestellt werden, nie
nur einer, und der Endpunkt muss in der Live-Umgebung neu angelegt werden.

**Erfolgsmeldung ≠ Beweis:** Die Meldung „Zahlung erfolgreich" in App.js
hängt allein am URL-Parameter `?ticket=success`, den Stripe beim Rücksprung
anhängt. Sie sagt nichts darüber aus, ob gebucht wurde. Der echte Beleg ist
der grüne Kasten „Meine Buchungen" bzw. eine Zeile in `event_participants`.

**PayPal:** Geht über Stripe mit einem Häkchen (Dashboard → Zahlungsmethoden),
weil im Code keine Zahlarten fest hinterlegt sind. Apple Pay, Klarna und Link
sind bereits aktiv. Ein *privates* PayPal-Konto funktioniert nicht — PayPal
verlangt ein Geschäftskonto.
Hinweis: Ticketverkauf ist gewerbliche Tätigkeit (Gewerbe/Steuer) — sollte der
Nutzer fachlich klären. Apple verlangt für Tickets zu echten Veranstaltungen
**keine** In-App-Käufe, externe Bezahlung ist erlaubt.

---

## Zuletzt behoben (Auswahl)

**08./09.08.:**
- **Events und Rangliste blieben nach jedem Seitenneuladen leer.** Die
  `useEffect`-Abhängigkeiten enthielten nur `[tab]`. Beim Seitenaufbau steht
  der Tab sofort fest (aus localStorage), die Anmeldung wird aber asynchron
  wiederhergestellt — die Prüfung `tab==='events' && session` lief also genau
  einmal mit `session===null` und nie wieder. Fiel beim Rücksprung von der
  Stripe-Zahlungsseite auf. Jetzt `[tab,session]`.
- **Anmelden und Abmelden bei Events** scheiterten lautlos (siehe RLS oben).
- **Events im Admin-Bereich vollständig bearbeitbar** — vorher nur der Titel
  über ein `window.prompt`.
- **Equipment nach Marken filtern**, mit Zusammenfassung uneinheitlicher
  Schreibweisen (14 rohe Werte → 9 Marken).
- **Weiterleiten-Symbol** auf der Produktkarte: 🔗 statt 📤.

**Davor:**
- **Admin-Schleuse:** Jede verändernde Aktion scheiterte mit 500
  (`Response with null body status cannot have body` bei HTTP 204).
- **Equipment & Supplements** zeigten keine Produkte: Ein Zeitstempel `&_ts=`
  in der URL wurde von Supabase als Spaltenfilter gedeutet → ganze Abfrage
  brach ab. **Nie unbekannte Parameter an REST-URLs hängen.**
- **Swipe-Statistik** stand auf 0: Abfrage auf `swipes.created_at`, diese
  Spalte existiert nicht (Tabelle hat nur id, swiper_id, target_id, direction).
- **Gym-Codes:** Alle 326 Gyms haben jetzt einen `verify_code` (vorher 24).
- **Gym-Bewertungen:** Wurden nur geladen, wenn man selbst schon bewertet
  hatte → 96 % der Nutzer sahen gar keine.
- **Meine Buchungen:** Übersicht im Events-Bereich.

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
- **Beim Laden schickt die App auch ohne Anmeldung eine Token-Erneuerung
  los**, die mit 400 abgewiesen wird. Harmlos, aber unsauber.
- **`createEvent` und mehrere Admin-Löschaktionen prüfen ihr Ergebnis nicht**
  — dasselbe Muster wie oben unter Falle 3. Noch nicht angefasst.
- **Capacitor-Versionen weichen ab:** `@capacitor/core` 8.5.0 gegen
  `@capacitor/ios` 8.4.0. Bisher ohne Auswirkung.

---

## Nützliche Befehle

```bash
npm run check:integrity   # Schutz gegen überschriebene App.js
npm run check:undef       # findet unbekannte Namen, auch in JSX
CI=true npm test          # 50 Tests
supabase db query --linked "select 1"        # SQL gegen die Produktiv-DB
supabase functions deploy <name>
supabase secrets list     # zeigt nur Fingerabdrücke, keine Werte
npx cap sync ios          # frischen Build ins iOS-Projekt kopieren
```

Projekt-Kennung Supabase: `uykdrmymjvqgebsmndme`
Admin-Anmelde-ID (`auth.uid()`): `1a697731-458d-4559-a4cf-a89d3150bfa5`
Admin-Profil-ID (`profiles.id`): `041eb7c4-03ac-4b87-9e22-ec735585ee5a`
