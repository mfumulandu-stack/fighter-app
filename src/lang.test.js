import { SUPPORTED, langFromTag, detectLang, pickLang, makeL, countryName } from './lang';

test('Sprach-Tags werden erkannt', () => {
  expect(langFromTag('de-AT')).toBe('DE');
  expect(langFromTag('fr_CA')).toBe('FR');
  expect(langFromTag('es')).toBe('ES');
  expect(langFromTag('en-GB')).toBe('EN');
  expect(langFromTag('tr-TR')).toBe('');
  expect(langFromTag(null)).toBe('');
});

test('Gespeicherte Wahl hat Vorrang, aber nur wenn gueltig', () => {
  expect(detectLang({ saved: 'FR', languages: ['de-DE'] })).toBe('FR');
  expect(detectLang({ saved: 'xx', languages: ['es-ES'] })).toBe('ES');
});

test('Geraetesprache: erste unterstuetzte aus der Liste gewinnt', () => {
  expect(detectLang({ languages: ['tr-TR', 'fr-FR', 'en-US'] })).toBe('FR');
  expect(detectLang({ languages: ['es-MX', 'en'] })).toBe('ES');
  expect(detectLang({ languages: ['de-CH'] })).toBe('DE');
  expect(detectLang({ language: 'en-US' })).toBe('EN');
});

test('Nicht unterstuetzte Sprache: DACH -> Deutsch, sonst Englisch', () => {
  expect(detectLang({ languages: ['tr-DE'] })).toBe('DE');
  expect(detectLang({ languages: ['pl-AT'] })).toBe('DE');
  expect(detectLang({ languages: ['pl-PL'] })).toBe('EN');
  expect(detectLang({ languages: ['ja'] })).toBe('EN');
});

test('Keine Angaben: Deutsch', () => {
  expect(detectLang({})).toBe('DE');
  expect(detectLang()).toBe('DE');
});

test('pickLang faellt auf Englisch, dann Deutsch zurueck', () => {
  expect(pickLang('ES', { DE: 'a', EN: 'b', FR: 'c', ES: 'd' })).toBe('d');
  expect(pickLang('ES', { DE: 'a', EN: 'b', FR: 'c' })).toBe('b');
  expect(pickLang('FR', { DE: 'a', EN: '', FR: '' })).toBe('a');
});

test('makeL waehlt je Sprache', () => {
  SUPPORTED.forEach((l, i) => expect(makeL(l)('de', 'en', 'fr', 'es')).toBe(['de', 'en', 'fr', 'es'][i]));
  expect(makeL('ES')('de', 'en', 'fr')).toBe('en');
});

test('Laendernamen in der Sprache der App', () => {
  expect(countryName('DE', 'Deutschland', 'ES')).toBe('Alemania');
  expect(countryName('DE', 'Deutschland', 'FR')).toBe('Allemagne');
  expect(countryName('DE', 'Deutschland', 'EN')).toBe('Germany');
  expect(countryName('OTHER', 'Andere', 'ES')).toBe('Otro');
  expect(countryName('OTHER', 'Andere', 'FR')).toBe('Autre');
  expect(countryName('', 'Fallback', 'EN')).toBe('Fallback');
});
