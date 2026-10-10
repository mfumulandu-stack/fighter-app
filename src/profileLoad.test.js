import { LIST_FIELDS, CARD_FIELDS, mergeProfileDetail, isFresh } from './profileLoad';

const list = LIST_FIELDS.split(',');
const card = CARD_FIELDS.split(',');

test('Ranglisten-Spalten enthalten alles, was die Rangliste braucht', () => {
  ['id','name','avatar_url','wins','losses','draws','style','gym','city','country','is_pro','gender','belt','record_verified','gym_verified'].forEach(k => expect(list).toContain(k));
});

test('Listen und Karten laden keine Schwergewichte', () => {
  ['bio','gallery','videos','email','coach_bio'].forEach(k => { expect(list).not.toContain(k); expect(card).not.toContain(k); });
});

test('Spalten sind nicht doppelt', () => {
  expect(new Set(list).size).toBe(list.length);
  expect(new Set(card).size).toBe(card.length);
});

test('Detaildaten werden ins geoeffnete Profil gemischt, Berechnetes bleibt', () => {
  const cur = { id: 'a', name: 'X', isMe: false, accent: '#c00' };
  const r = mergeProfileDetail(cur, { id: 'a', bio: 'Hallo', gallery: [1] }, 'a');
  expect(r.bio).toBe('Hallo');
  expect(r.accent).toBe('#c00');
  expect(r.isMe).toBe(false);
});

test('anderes Profil oder ungueltige Antwort aendert nichts', () => {
  const cur = { id: 'a', name: 'X' };
  expect(mergeProfileDetail(cur, { bio: 'x' }, 'b')).toBe(cur);
  expect(mergeProfileDetail(cur, null, 'a')).toBe(cur);
  expect(mergeProfileDetail(cur, [], 'a')).toBe(cur);
  expect(mergeProfileDetail(null, { bio: 'x' }, 'a')).toBe(null);
});

test('Frische-Pruefung', () => {
  expect(isFresh(0, 1000)).toBe(false);
  expect(isFresh(1000, 30000)).toBe(true);
  expect(isFresh(1000, 61001)).toBe(false);
  expect(isFresh(5000, 1000)).toBe(false);
});
