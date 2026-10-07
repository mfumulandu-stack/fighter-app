#!/usr/bin/env python3
"""1) Gym-Logo neben Gym-Name im Kaempfer-Profil
2) Rangliste: nur mit Gym; 0 Kaempfe nur wenn Rekord verifiziert
3) Rangnummer ueberlappt Bild nicht mehr bei 3-4 stelligen Zahlen"""
import sys, os
P='src/App.js'
if not os.path.exists(P): sys.exit('FEHLER: Im Ordner fighter-app ausfuehren.')
s=open(P,encoding='utf-8').read()
if 'findGymByName' in s: sys.exit('Schon angewendet. Nichts zu tun.')
def ro(s,old,new,name):
    n=s.count(old)
    if n!=1: sys.exit('FEHLER bei "%s": Anker %d mal (erwartet 1). Nichts geaendert.'%(name,n))
    return s.replace(old,new)

# --- 1) Logo
s=ro(s,"""    const nm=(name||'').trim().toLowerCase();
    if(!nm)return;
    const hard=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(gx=>({...gx,ct}))).find(gx=>(gx.name||'').trim().toLowerCase()===nm);
    const db=dbGyms.find(dg=>(dg.name||'').trim().toLowerCase()===nm);
    const base=hard||db;
    if(!base){""","""    const base=findGymByName(name);
    if(!base){""","helper-refactor")
s=ro(s,"""  // Gym eines Kaempfers per Name oeffnen (Infos + Rezensionen), Profil bleibt darunter
""","""  function findGymByName(name){
    const nm=(name||'').trim().toLowerCase();
    if(!nm)return null;
    const hard=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(gx=>({...gx,ct}))).find(gx=>(gx.name||'').trim().toLowerCase()===nm);
    const db=dbGyms.find(dg=>(dg.name||'').trim().toLowerCase()===nm);
    return hard||db||null;
  }

  // Gym eines Kaempfers per Name oeffnen (Infos + Rezensionen), Profil bleibt darunter
""","helper-find")
s=ro(s,"""              <div style={{color:color,fontWeight:700,fontSize:12,marginTop:3}}>{val}{color==='#8e44ad'&&val!=='-'?' ›':''}</div>""",
"""              {color==='#8e44ad'&&val!=='-'?(()=>{
                const gb=findGymByName(val);
                const logo=gb?((gymLogos&&gymLogos[gb.code]?.logo_url)||gb.logo_url):null;
                return(<div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                  <div style={{width:26,height:26,borderRadius:6,background:darkMode?'#2a2a2a':'#f0f0f0',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
                    {logo?<img loading="lazy" src={logo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#aaa',fontSize:8,fontWeight:700,textAlign:'center',lineHeight:1.1}}>{(val||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                  </div>
                  <div style={{color:color,fontWeight:700,fontSize:12,minWidth:0,wordBreak:'break-word'}}>{val} ›</div>
                </div>);
              })():<div style={{color:color,fontWeight:700,fontSize:12,marginTop:3}}>{val}</div>}""","logo-tile")

# --- 2) Regeln
s=ro(s,"""      // Bewusst KEIN Filter auf "mindestens 1 Kampf" mehr - auch wer noch
      // keine Kaempfe hat (0-0-0), soll in der kompletten Rangliste zu
      // sehen sein, nicht nur Fighter mit bestehender Bilanz.
""","""      // Ohne Gym kein Rang.
      .filter(f=>((f.isMe?(profile.gym||myProfile?.gym):f.gym)||'').trim().length>0)
      // 0 Kaempfe: erst in der Rangliste, wenn der Rekord verifiziert ist
      // (ueber "Ich habe noch keine Kaempfe" oder Nachweis).
      .filter(f=>{
        if((f.wins||0)+(f.losses||0)+(f.draws||0)>0)return true;
        return (f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified';
      })
""","filters")
s=ro(s,"""                    ?'Dein Nachweis wird geprüft — sobald bestätigt, bekommst du den Haken und stehst vor allen nicht verifizierten Fightern.'
                    :'Du stehst in der Rangliste, aber noch ohne Haken.""","""                    ?'Dein Nachweis wird geprüft — sobald bestätigt, bekommst du den Haken und stehst vor allen nicht verifizierten Fightern.'
                    :(myProfile?.wins||0)+(myProfile?.losses||0)+(myProfile?.draws||0)===0
                    ?'Ohne Kämpfe erscheinst du erst in der Rangliste, wenn dein Rekord verifiziert ist. Hast du noch keine Kämpfe, tippe unten auf "Ich habe noch keine Kämpfe". Sonst lade einen Nachweis hoch.'
                    :'Du stehst in der Rangliste, aber noch ohne Haken.""","hint")
s=ro(s,"""            {rankMode!=='trainer'&&(profile.country||myProfile?.country)&&(profile.record_verified||myProfile?.record_verified)!=='verified'&&(""",
"""            {rankMode!=='trainer'&&!((profile.gym||myProfile?.gym)||'').trim()&&(
              <div style={{background:darkMode?'#1a1a1a':'#fff5f4',borderRadius:12,padding:'16px',border:'1px solid '+RED+'44',marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>🥋</div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,marginBottom:4}}>Gym eintragen</div>
                <div style={{color:'#888',fontSize:12,lineHeight:1.5,marginBottom:12}}>Ohne Gym kannst du nicht in der Rangliste erscheinen. Trage dein Gym in deinem Profil ein.</div>
                <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>GYM EINTRAGEN</button>
              </div>
            )}
            {rankMode!=='trainer'&&(profile.country||myProfile?.country)&&(profile.record_verified||myProfile?.record_verified)!=='verified'&&(""","gym-box")

# --- 3) Rangnummer
s=ro(s,"""<div className='rj' style={{color:i<3?rc[i]:'#bbb',fontSize:18,width:24,textAlign:'center'}}>#{i+1}</div>
                  {f.avatar_url?<img loading="lazy" src={f.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}} alt={f.name}/>""",
"""<div className='rj' style={{color:i<3?rc[i]:'#bbb',fontSize:i>=999?11:i>=99?14:18,width:38,flexShrink:0,textAlign:'center',whiteSpace:'nowrap'}}>#{i+1}</div>
                  {f.avatar_url?<img loading="lazy" src={f.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt={f.name}/>""","rank-num")
open(P,'w',encoding='utf-8').write(s)
print('OK: Patch angewendet.')
