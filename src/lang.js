// Sprachen: automatische Erkennung der Handy-/Browsersprache und Helfer
// zum Auswaehlen des passenden Textes.
//
// Unterstuetzt: Deutsch (DE), Englisch (EN), Franzoesisch (FR), Spanisch (ES).
// Reine Funktionen ohne Abhaengigkeit zu App.js, damit sie testbar sind.

export const SUPPORTED = ['DE', 'EN', 'FR', 'ES'];
export const LANG_KEY = 'fighter_lang';

// Laender, in denen der Standard Deutsch ist, wenn die Handysprache
// nicht unterstuetzt wird (Fighter App zielt auf die DACH-Region).
const DACH = ['DE', 'AT', 'CH', 'LI'];

// 'de-AT' -> 'DE', 'fr_CA' -> 'FR', 'es' -> 'ES', 'tr-TR' -> ''
export function langFromTag(tag) {
  const base = String(tag == null ? '' : tag).toLowerCase().split(/[-_]/)[0];
  const up = base.toUpperCase();
  return SUPPORTED.includes(up) ? up : '';
}

function regionOf(tag) {
  const parts = String(tag == null ? '' : tag).split(/[-_]/);
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
}

// Welche Sprache soll die App zeigen?
//  1. ausdrueckliche Wahl des Nutzers (gespeichert), falls gueltig
//  2. die erste unterstuetzte Sprache aus der Sprachliste des Geraets
//  3. Geraet ohne unterstuetzte Sprache: DACH-Region -> Deutsch, sonst Englisch
export function detectLang({ saved, languages, language } = {}) {
  const s = String(saved == null ? '' : saved).toUpperCase();
  if (SUPPORTED.includes(s)) return s;
  const list = (Array.isArray(languages) && languages.length ? languages : [language])
    .filter(Boolean);
  for (const tag of list) {
    const l = langFromTag(tag);
    if (l) return l;
  }
  if (list.some((tag) => DACH.includes(regionOf(tag)))) return 'DE';
  return list.length ? 'EN' : 'DE';
}

// Liest die Geraetesprache aus dem Browser (WebView). Faellt bei Fehlern auf Deutsch.
export function detectLangFromDevice() {
  try {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    return detectLang({
      saved,
      languages: typeof navigator !== 'undefined' ? navigator.languages : undefined,
      language: typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage) : undefined,
    });
  } catch (e) {
    return 'DE';
  }
}

// Waehlt aus {DE, EN, FR, ES} den Text der Sprache. Fehlt er, wird auf
// Englisch und danach auf Deutsch zurueckgefallen - nie ein leerer Text.
export function pickLang(lang, texts) {
  const v = texts && texts[lang];
  if (v !== undefined && v !== null && v !== '') return v;
  const en = texts && texts.EN;
  if (en !== undefined && en !== null && en !== '') return en;
  return texts ? texts.DE : '';
}

// L('Hallo','Hello','Bonjour','Hola') - waehlt den Text zur aktuellen Sprache.
export function makeL(lang) {
  return (de, en, fr, es) => pickLang(lang, { DE: de, EN: en, FR: fr, ES: es });
}

// Laendernamen in der Sprache der App (aus dem Geraet, ohne eigene Liste).
// Faellt auf den uebergebenen Text zurueck, wenn das Geraet es nicht kann.
const OTHER_NAME = { DE: 'Andere', EN: 'Other', FR: 'Autre', ES: 'Otro' };
export function countryName(code, fallback, lang) {
  const l = SUPPORTED.includes(lang) ? lang : 'DE';
  if (code === 'OTHER') return OTHER_NAME[l];
  try {
    if (code && typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const n = new Intl.DisplayNames([l.toLowerCase()], { type: 'region' }).of(code);
      if (n && n !== code) return n;
    }
  } catch (e) {}
  return fallback;
}
