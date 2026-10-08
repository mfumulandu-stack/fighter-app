// Wachstums-Helfer: Profil-Fortschritt und Teilen-Funktion.
// Reine Funktionen ohne Abhaengigkeit zu App.js, damit sie testbar sind
// und von mehreren Ansichten (App, Gym-Seite) genutzt werden koennen.

// Welche Schritte machen ein Profil "fertig"? Reihenfolge = Wichtigkeit
// (zuerst das, was fuer die Rangliste noetig ist). Summe der Gewichte = 100.
export function profileProgressOf(p,gymVerified){
  if(!p||p.is_brand||p.is_coach)return null;
  const fights=(p.wins||0)+(p.losses||0)+(p.draws||0);
  const steps=[
    {k:'gym',label:'Trage dein Gym ein',w:15,ok:!!(p.gym||'').trim()},
    {k:'country',label:'Wähle dein Land',w:10,ok:!!p.country},
    {k:'record',label:'Trage deine Kämpfe ein oder bestätige „Ich habe noch keine Kämpfe“',w:15,ok:fights>0||p.record_verified==='verified'},
    {k:'avatar',label:'Lade ein Profilfoto hoch',w:15,ok:!!p.avatar_url},
    {k:'style',label:'Wähle deinen Kampfstil',w:10,ok:!!(p.style||'').trim()},
    {k:'weight',label:'Wähle deine Gewichtsklasse',w:10,ok:!!(p.weight_class||'').trim()},
    {k:'bio',label:'Schreibe etwas über dich',w:10,ok:!!(p.bio||'').trim()},
    {k:'gymver',label:'Verifiziere deine Gym-Mitgliedschaft',w:15,ok:p.gym_verified===true||!!gymVerified},
  ];
  const pct=steps.reduce((a,s)=>a+(s.ok?s.w:0),0);
  const next=steps.find(s=>!s.ok)||null;
  return {pct,next,steps};
}

// Teilen: natives Teilen-Menue (Handy), sonst in die Zwischenablage kopieren.
export function shareLink({title,text,url,onCopied}){
  try{
    if(typeof navigator!=='undefined'&&navigator.share){
      const r=navigator.share({title,text,url});
      if(r&&r.catch)r.catch(()=>{});
      return;
    }
  }catch(e){}
  try{
    if(typeof navigator!=='undefined'&&navigator.clipboard)navigator.clipboard.writeText((text?text+' ':'')+url);
  }catch(e){}
  if(onCopied)onCopied();
}

export function inviteUrl(profileId){
  return 'https://fighterapp.de/'+(profileId?'?ref='+profileId:'');
}
