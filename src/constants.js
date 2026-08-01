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
export const CURRENT_APP_VERSION = '1.12';

// ── Darstellung ──
// SW = Schwellwert in Pixeln, ab dem ein Wisch als Swipe zaehlt
export const SW = 60;
export const RED = '#c0392b';
export const LIGHT_RED = '#e74c3c';
