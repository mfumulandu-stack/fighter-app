import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AdminPanel from './AdminPanel';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('Admin-Tab Foto-Pruefung: Faelle laden, anzeigen, freigeben', async () => {
  const calls = [];
  global.fetch = jest.fn(async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/functions/v1/check-photos')) {
      const body = JSON.parse(opts.body);
      calls.push(body);
      if (body.action === 'list') return { ok: true, status: 200, json: async () => ({ moderation: false, items: [
        { id: 7, profile_id: 'b1234567-0000', kind: 'avatar', url: 'https://x/a.jpg', status: 'hold', reasons: ['duplicate'], profile: { id: 'b', name: 'Max Fake', city: 'Berlin' }, dup_profile: { id: 'a', name: 'Echter Fighter', city: 'Köln', avatar_url: 'https://x/o.jpg' } },
        { id: 8, profile_id: 'c1234567-0000', kind: 'gallery', url: 'https://x/g.jpg', status: 'flagged', reasons: ['erotica'], profile: { id: 'c', name: 'Lena', city: '' }, dup_profile: null },
      ] }) };
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '[]' };
  });
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const noop = () => {};
  await act(async () => {
    root.render(React.createElement(AdminPanel, { session: { token: 't', userId: 'u' }, darkMode: false, appLang: 'DE', t: new Proxy({}, { get: () => 'x' }), dbGyms: [], gymLogos: {}, events: [], eventParticipants: [], GYMS: [], setShowAdmin: noop, setViewProfile: noop, setAllProfiles: noop, setGymLogos: noop, showMsg: noop, loadDbGyms: noop, loadEvents: noop, loadGymLogos: noop, compressImage: noop, startAdminChat: noop, openEventEditor: noop, duplicateEvent: noop }));
  });
  const nav = [...el.querySelectorAll('div')].find((d) => d.textContent === '🖼️Foto-Prüfung' && d.style.cursor === 'pointer');
  expect(nav).toBeTruthy();
  await act(async () => { nav.click(); });
  expect(el.textContent).toContain('FOTO-PRÜFUNG');
  const load = [...el.querySelectorAll('button')].find((b) => b.textContent === 'FÄLLE LADEN');
  await act(async () => { load.click(); });
  expect(calls[0].action).toBe('list');
  expect(el.textContent).toContain('Max Fake');
  expect(el.textContent).toContain('AUSGEBLENDET');
  expect(el.textContent).toContain('Gleiches Foto bei anderem Profil');
  expect(el.textContent).toContain('Gleich wie: Echter Fighter');
  expect(el.textContent).toContain('SICHTBAR');
  expect(el.textContent).toContain('Freizügig (prüfen)');
  const keep = [...el.querySelectorAll('button')].find((b) => b.textContent === '✓ Behalten');
  await act(async () => { keep.click(); });
  expect(calls[1]).toMatchObject({ action: 'review', id: 7, decision: 'approve' });
  expect(el.textContent).not.toContain('Max Fake');
  expect(el.textContent).toContain('Lena');
  const sweepBtn = [...el.querySelectorAll('button')].find((b) => b.textContent === 'BESTAND PRÜFEN');
  expect(sweepBtn).toBeTruthy();
});
