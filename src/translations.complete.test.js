import fs from 'fs';
import path from 'path';
import { T } from './translations';

const LANGS = ['EN', 'FR', 'ES'];

test('translations.js: EN, FR und ES haben exakt die Schluessel von DE', () => {
  const de = Object.keys(T.DE);
  for (const l of LANGS) {
    expect(de.filter((k) => !(k in T[l]))).toEqual([]);
    expect(Object.keys(T[l]).filter((k) => !(k in T.DE))).toEqual([]);
  }
});

// Diese Schluessel sind absichtlich leer (Wortendungen, die nur in manchen Sprachen noetig sind).
const ALLOWED_EMPTY = ['minAgo', 'hoursAgo', 'daysAgo', 'days'];

test('translations.js: keine leeren Texte', () => {
  for (const l of ['DE', ...LANGS]) {
    const empty = Object.entries(T[l]).filter(([k, v]) => !ALLOWED_EMPTY.includes(k) && typeof v === 'string' && v.trim() === '');
    expect(empty).toEqual([]);
  }
});

test('App.js: keine alten Zweisprachen-Ternaries mehr (alles laeuft ueber L())', () => {
  const src = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
  expect(src.match(/appLang\s*===\s*'(FR|ES)'\s*\?/g)).toBeNull();
});

test('Info.plist: App meldet de, en, fr, es als unterstuetzte Sprachen', () => {
  const p = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
  if (!fs.existsSync(p)) return;
  const x = fs.readFileSync(p, 'utf8');
  expect(x).toContain('CFBundleLocalizations');
  for (const l of ['de', 'en', 'fr', 'es']) expect(x).toContain('<string>' + l + '</string>');
});
