// Zentrale Konfigurations-Werte und Basis-Farben der App.
// Bewusst als eigene Datei ausgelagert (wie matchScore.js / cityCountry.js),
// damit andere Module (z.B. ChatOverlay) diese Werte nutzen koennen, ohne
// dafuer die grosse App.js importieren zu muessen.
//
// WICHTIG: Hier stehen NUR feste Werte - keine Logik, keine Funktionen.
// Dadurch kann diese Datei von ueberall gefahrlos eingebunden werden.

// ── Supabase (Datenbank) ──
export const SUPA_URL = 'https://uykdrmymjvqgebsmndme.supabase.co';
// SUPA_SERVICE_KEY wurde entfernt - der Vollzugriffsschluessel liegt jetzt
// ausschliesslich sicher auf dem Server (admin-proxy Edge Function Secret),
// nicht mehr im Client-Code.
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk';

// ── Admin ──
export const ADMIN_ID = '1a697731-458d-4559-a4cf-a89d3150bfa5';

// ── App Store ──
// Das ist NUR die Zahl aus der App-Store-Adresse: apps.apple.com/app/id123456789
export const APP_STORE_ID = '6779692192';
// WICHTIG: Diese Zahl bei JEDEM neuen nativen Build (Xcode-Version)
// manuell mit hochsetzen, exakt passend zur "Version" in Xcode
// (General-Tab). Sonst erkennt die App neue Updates nicht richtig.
export const CURRENT_APP_VERSION = '1.13';

// ── Darstellung ──
// SW = Schwellwert in Pixeln, ab dem ein Wisch als Swipe zaehlt
export const SW = 60;
export const RED = '#c0392b';
export const LIGHT_RED = '#e74c3c';

// ── Freunde-einladen-Rabatt ──
// Je mehr Freunde ein Nutzer einlaedt, die sich registrieren UND ein
// Profil erstellen (gezaehlt wird serverseitig in der referrals-Tabelle,
// siehe credit-referral Edge Function), desto mehr Rabattcodes werden
// hier freigeschaltet. "code" ist nur die Anzeige - der tatsaechliche
// Rabatt beim Ticketkauf wird in create-checkout NICHT anhand dieses
// Codes, sondern anhand des echten referral_count des Nutzers berechnet.
// WICHTIG: Diese Liste muss 1:1 mit der Kopie in
// supabase/functions/create-checkout/index.ts uebereinstimmen.
export const REFERRAL_TIERS = [
  { count: 1, code: 'FIGHTER-1', percent: 10 },
  { count: 3, code: 'FIGHTER-3', percent: 15 },
  { count: 5, code: 'FIGHTER-5', percent: 20 },
  { count: 10, code: 'FIGHTER-10', percent: 30 },
];
