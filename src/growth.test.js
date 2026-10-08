import { profileProgressOf, shareLink, inviteUrl } from './growth';

const full={gym:'Team X',country:'DE',wins:3,losses:1,draws:0,avatar_url:'u',style:'Boxing',weight_class:'Weltergewicht (bis 66,7 kg)',bio:'hi',gym_verified:true};

test('vollstaendiges Profil ist 100 Prozent', () => {
  const r=profileProgressOf(full);
  expect(r.pct).toBe(100);
  expect(r.next).toBeNull();
});

test('leeres Profil ist 0 Prozent, naechster Schritt ist das Gym', () => {
  const r=profileProgressOf({});
  expect(r.pct).toBe(0);
  expect(r.next.k).toBe('gym');
});

test('Gewichte ergeben zusammen 100', () => {
  const r=profileProgressOf({});
  expect(r.steps.reduce((a,s)=>a+s.w,0)).toBe(100);
});

test('Kampfrekord zaehlt auch bei verifizierten 0 Kaempfen', () => {
  const r=profileProgressOf({...full,wins:0,losses:0,draws:0,record_verified:'verified'});
  expect(r.steps.find(s=>s.k==='record').ok).toBe(true);
  const r2=profileProgressOf({...full,wins:0,losses:0,draws:0});
  expect(r2.next.k).toBe('record');
});

test('Gym-Verifizierung auch ueber lokalen Marker', () => {
  const r=profileProgressOf({...full,gym_verified:false},{gymName:'X'});
  expect(r.pct).toBe(100);
});

test('Marken und Trainer bekommen keinen Fortschritt', () => {
  expect(profileProgressOf({is_brand:true})).toBeNull();
  expect(profileProgressOf({is_coach:true})).toBeNull();
  expect(profileProgressOf(null)).toBeNull();
});

test('inviteUrl mit und ohne Profil-ID', () => {
  expect(inviteUrl('abc')).toBe('https://fighterapp.de/?ref=abc');
  expect(inviteUrl('')).toBe('https://fighterapp.de/');
});

test('shareLink kopiert, wenn kein natives Teilen da ist', () => {
  const copied=jest.fn();
  const write=jest.fn();
  Object.defineProperty(global.navigator,'clipboard',{value:{writeText:write},configurable:true});
  Object.defineProperty(global.navigator,'share',{value:undefined,configurable:true});
  shareLink({title:'t',text:'Hallo',url:'https://x.de',onCopied:copied});
  expect(write).toHaveBeenCalledWith('Hallo https://x.de');
  expect(copied).toHaveBeenCalled();
});

test('shareLink nutzt natives Teilen, wenn vorhanden', () => {
  const share=jest.fn(()=>Promise.reject(new Error('abgebrochen')));
  const copied=jest.fn();
  Object.defineProperty(global.navigator,'share',{value:share,configurable:true});
  shareLink({title:'t',text:'Hallo',url:'https://x.de',onCopied:copied});
  expect(share).toHaveBeenCalledWith({title:'t',text:'Hallo',url:'https://x.de'});
  expect(copied).not.toHaveBeenCalled();
});
