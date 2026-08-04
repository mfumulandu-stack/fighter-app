#!/usr/bin/env node
/*
 * Schutzpruefung gegen zwei Fehler, die in diesem Projekt bereits ZWEIMAL
 * passiert sind und die weder Build noch Tests bemerkt haben:
 *
 *   1) Der Vollzugriffs-Schluessel (service_role) landet im Client-Code.
 *      Er umgeht alle Datenbank-Sicherheitsregeln. Steht er in src/,
 *      wird er ins ausgelieferte JavaScript gebaut und ist fuer jeden
 *      Besucher der Seite auslesbar.
 *
 *   2) src/App.js wird versehentlich durch eine ALTE Fassung ersetzt
 *      (z.B. weil in einer Sitzung auf einer veralteten Kopie gearbeitet
 *      wurde). Erkennbar daran, dass die Modul-Importe fehlen und die
 *      alten Inline-Kopien der ausgelagerten Komponenten zurueck sind.
 *
 * Aufruf:  npm run check:integrity
 * Laeuft zusaetzlich automatisch vor jedem Commit (Git-Hook).
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const APP = path.join(SRC, 'App.js');

// Charakteristischer Abschnitt des service_role-JWT (base64-kodierte Nutzlast).
// Nach dem Klartext "service_role" zu suchen reicht NICHT - im JWT ist er kodiert.
const SERVICE_KEY_MARKER = 'cm9sZSI6InNlcnZpY2Vfcm9sZS';

// Komponenten, die ausgelagert wurden. Taucht eine davon wieder als
// Definition in App.js auf, ist eine alte Fassung eingespielt worden.
const EXTRACTED = [
  'ChatOverlay', 'AuthScreen', 'UserGlobe', 'GymDetailScreen',
  'EquipmentScreen', 'GymVerifyModal', 'ImgPositionEditor',
];

// Untergrenze fuer Modul-Importe in App.js. Aktuell sind es 21; faellt der
// Wert deutlich darunter, wurde die Datei sehr wahrscheinlich ersetzt.
const MIN_IMPORTS = 15;

const problems = [];

// ── Pruefung 1: Vollzugriffs-Schluessel im Client-Code? ──
for (const file of fs.readdirSync(SRC)) {
  if (!file.endsWith('.js') || file.endsWith('.test.js')) continue;
  const content = fs.readFileSync(path.join(SRC, file), 'utf8');
  if (content.includes(SERVICE_KEY_MARKER)) {
    problems.push(
      `🚨 VOLLZUGRIFFS-SCHLUESSEL in src/${file}\n` +
      `   Der service_role-Schluessel darf NIEMALS im App-Code stehen - er\n` +
      `   umgeht alle Sicherheitsregeln und waere fuer jeden Besucher lesbar.\n` +
      `   Admin-Zugriffe laufen ueber adminFetch() / die admin-proxy Edge Function.`
    );
  }
}

// ── Pruefung 2: Wurde App.js durch eine alte Fassung ersetzt? ──
if (fs.existsSync(APP)) {
  const app = fs.readFileSync(APP, 'utf8');

  const importCount = (app.match(/^import .* from '\.\//gm) || []).length;
  if (importCount < MIN_IMPORTS) {
    problems.push(
      `🚨 src/App.js hat nur ${importCount} Modul-Importe (erwartet: mindestens ${MIN_IMPORTS})\n` +
      `   Sehr wahrscheinlich wurde eine ALTE Fassung von App.js eingespielt.\n` +
      `   Pruefe mit:  head -25 src/App.js`
    );
  }

  const backInline = EXTRACTED.filter((name) =>
    new RegExp(`^(function|class) ${name}\\b`, 'm').test(app)
  );
  if (backInline.length > 0) {
    problems.push(
      `🚨 Alte Inline-Kopien in src/App.js: ${backInline.join(', ')}\n` +
      `   Diese Komponenten liegen in eigenen Dateien. Stehen sie wieder in\n` +
      `   App.js, wurde eine alte Fassung eingespielt - die ausgelagerten\n` +
      `   Dateien werden dann gar nicht mehr benutzt.`
    );
  }
}

// ── Ergebnis ──
if (problems.length > 0) {
  console.error('\n' + '='.repeat(66));
  console.error('  PRUEFUNG FEHLGESCHLAGEN - Commit gestoppt');
  console.error('='.repeat(66) + '\n');
  problems.forEach((p) => console.error(p + '\n'));
  console.error('-'.repeat(66));
  console.error('Wenn du sicher bist, dass das so gewollt ist:');
  console.error('  git commit --no-verify');
  console.error('-'.repeat(66) + '\n');
  process.exit(1);
}

console.log('✅ Integritaets-Pruefung bestanden (Schluessel & App.js-Struktur in Ordnung)');
