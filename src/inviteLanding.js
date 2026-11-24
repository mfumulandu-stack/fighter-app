// Einladungslink (https://fighterapp.de/?ref=<profil-id>), geoeffnet im Safari
// auf dem iPhone: Statt die Web-App zu zeigen, geht es zum App Store. Der Code
// des Einladenden geht beim App-Store-Download verloren, deshalb zeigen wir ihn
// vorher an und kopieren ihn beim Antippen in die Zwischenablage.
// Reine Funktionen (testbar) + eine kleine Seite ohne Abhaengigkeit zu App.js.
import React from 'react';
import { isUuid, inviteCodeOf } from './inviteCode';
import { makeL, detectLangFromDevice } from './lang';

export const APP_STORE_URL = 'https://apps.apple.com/app/id6779692192?ct=invite&pt=129030837&mt=8';

// true nur fuer: iPhone/iPad im normalen Browser (nicht in der App, nicht als
// Home-Bildschirm-Web-App), mit gueltigem ?ref=, und ohne ?web=1 ("im Browser bleiben").
export function shouldShowInviteLanding({ ua, platform, maxTouchPoints, native, standalone, search }) {
  if (native || standalone) return false;
  const iPhoneLike = /iPhone|iPad|iPod/i.test(ua || '');
  const iPadOs = platform === 'MacIntel' && (maxTouchPoints || 0) > 1;
  if (!iPhoneLike && !iPadOs) return false;
  const p = new URLSearchParams(search || '');
  if (p.get('web') === '1') return false;
  return isUuid(p.get('ref'));
}

export function InviteLanding({ refId }) {
  const L = makeL(detectLangFromDevice());
  const code = inviteCodeOf(refId);
  const [copied, setCopied] = React.useState(false);
  const go = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(code); setCopied(true); } catch (e) {}
    window.location.href = APP_STORE_URL;
  };
  const wrap = { minHeight: '100vh', background: '#0d0d0d', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif' };
  return (
    <div style={wrap}>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 8, marginBottom: 6 }}>FIGHTER</div>
      <div style={{ color: '#bbb', fontSize: 16, marginBottom: 28, maxWidth: 320, lineHeight: 1.4 }}>
        {L('Ein Freund hat dich zu Fighter eingeladen. Lade die App und gib bei der Registrierung seinen Code ein.', 'A friend invited you to Fighter. Get the app and enter their code when you sign up.', 'Un ami t\'a invité sur Fighter. Télécharge l\'app et saisis son code à l\'inscription.', 'Un amigo te ha invitado a Fighter. Descarga la app e introduce su código al registrarte.')}
      </div>
      <div style={{ color: '#888', fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>{L('EINLADUNGSCODE', 'INVITE CODE', 'CODE D\'INVITATION', 'CÓDIGO DE INVITACIÓN')}</div>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 6, border: '1px dashed #555', borderRadius: 12, padding: '10px 22px', marginBottom: 28 }}>{code}</div>
      <button onClick={go} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 14, padding: '16px 34px', fontFamily: 'inherit', fontWeight: 700, fontSize: 20, letterSpacing: 1, cursor: 'pointer' }}>
        {L('Im App Store laden', 'Get it on the App Store', 'Télécharger sur l\'App Store', 'Descargar en App Store')}
      </button>
      <div style={{ color: '#777', fontSize: 12, marginTop: 10, minHeight: 16 }}>
        {copied ? L('Code kopiert – in der App unter „Einladungscode“ einfügen.', 'Code copied – paste it in the app under “Invite code”.', 'Code copié – colle-le dans l\'app sous « Code d\'invitation ».', 'Código copiado: pégalo en la app en «Código de invitación».') : ''}
      </div>
      <a href={'/?ref=' + refId + '&web=1'} style={{ color: '#888', fontSize: 13, marginTop: 28 }}>
        {L('Lieber im Browser weitermachen', 'Continue in the browser instead', 'Continuer dans le navigateur', 'Continuar en el navegador')}
      </a>
    </div>
  );
}
