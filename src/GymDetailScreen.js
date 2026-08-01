// Die Detail-Ansicht eines Gyms: Infos, Bewertung abgeben, Kontakt,
// und fuer Admins der Bearbeiten-Modus.
//
// Bewusst als eigene Datei ausgelagert - eine klar abgegrenzte Ansicht,
// die alles Noetige als Prop bekommt (gym, gymRatings, session, ...).
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben worden.
// Die Komponente definiert SUPA_URL/SUPA_KEY weiterhin intern selbst -
// das war schon vorher so und wurde bewusst nicht angetastet, damit sich
// beim Verschieben garantiert nichts am Verhalten aendert.

import { useState } from 'react';

function GymDetailScreen({gym,gymKey,gymRatings,gymLogos,isAdmin,session,onGymUpdate,rateGym,onClose,darkMode}){
  if(!gym)return(<div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:250,display:'flex',alignItems:'center',justifyContent:'center'}}><button onClick={onClose} style={{padding:'12px 24px',background:'#c0392b',color:'#fff',border:'none',borderRadius:10,fontSize:16,cursor:'pointer'}}>Zurück</button></div>);
  // Normalize gym data to avoid crashes with DB gyms missing fields
  gym={styles:[],members:0,rating:0,founded:'',street:'',zip:'',phone:'',website:'',hours:'',desc:'',code:'',...gym,styles:gym.styles&&gym.styles.length>0?gym.styles:[gym.style||'Kampfsport'],desc:gym.desc||gym.description||''};
  const isDark=darkMode===true;
  const bg=isDark?'#0d0d0d':'#f5f5f7';
  const card=isDark?'#1a1a1a':'#fff';
  const text=isDark?'#fff':'#1a1a1a';
  const sub=isDark?'#aaa':'#666';
  const border=isDark?'#2a2a2a':'#eee';
  const [editMode,setEditMode]=useState(false);
  const [editName,setEditName]=useState(gym.name||'');
  const [editCity,setEditCity]=useState(gym.city||'');
  const [editAddress,setEditAddress]=useState(gym.address||'');
  const [editStyle,setEditStyle]=useState(gym.style||'');
  const [editDesc,setEditDesc]=useState(gym.desc||gym.description||'');
  const [editPhone,setEditPhone]=useState(gym.phone||'');
  const [editHours,setEditHours]=useState(gym.hours||'');
  const [saving,setSaving]=useState(false);
  const SUPA_URL='https://uykdrmymjvqgebsmndme.supabase.co';
  const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk';
  const r=gymRatings[gymKey];
  const userRating=r?.userRating||0;
  const avgRating=r&&r.count>0?(r.total/r.count):gym.rating;
  const ratingCount=r?.count||0;
  const styleColors={'Boxing':'#c0392b','Muay Thai':'#d35400','MMA':'#2980b9','BJJ':'#8e44ad','Kickboxing':'#e67e22','Wrestling':'#27ae60','Grappling':'#16a085'};
  return(
    <div style={{position:'fixed',inset:0,background:bg,zIndex:250,overflowY:'auto',display:'flex',flexDirection:'column'}}>
      {/* HEADER */}
      <div style={{background:`linear-gradient(135deg,#1a1a1a,#2d2d2d)`,padding:'0 0 20px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',padding:'calc(14px + env(safe-area-inset-top)) 16px 0',gap:10}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,padding:'6px 12px',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
          <div style={{flex:1}}/>
          {isAdmin&&<button onClick={()=>setEditMode(e=>!e)} style={{background:editMode?'#27ae60':'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:8,padding:'6px 12px',fontFamily:'Rajdhani,sans-serif',letterSpacing:1}}>{editMode?'✓ MODUS':'✏️ BEARBEITEN'}</button>}
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:8,padding:'4px 10px'}}>
            <div style={{color:'#d4a017',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:16}}>★</span>
              <span style={{fontSize:16}}>{avgRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:'16px 20px 0',textAlign:'center'}}>
          <div style={{width:72,height:72,borderRadius:14,background:'rgba(255,255,255,0.15)',border:'2px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8,overflow:'hidden'}}>
            {(gymLogos&&gymLogos[gym.code]?.logo_url)||gym.logo_url
              ?<img loading="lazy" src={(gymLogos&&gymLogos[gym.code]?.logo_url)||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>
              :<div style={{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,textAlign:'center',lineHeight:1.3}}>{(gym.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
          </div>
          {editMode?(
            <div style={{width:'100%',padding:'12px 16px 0',display:'flex',flexDirection:'column',gap:8}}>
              {[['Name',editName,setEditName],['Stadt',editCity,setEditCity],['Adresse',editAddress,setEditAddress],['Stil',editStyle,setEditStyle],['Telefon',editPhone,setEditPhone],['Öffnungszeiten',editHours,setEditHours]].map(([lbl,val,set])=>(
                <div key={lbl} style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:10,width:70,flexShrink:0}}>{lbl}</div>
                  <input value={val} onChange={e=>set(e.target.value)} style={{flex:1,padding:'6px 8px',borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:12,outline:'none'}}/>
                </div>
              ))}
              <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={3} placeholder='Beschreibung' style={{padding:'6px 8px',borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:12,outline:'none',resize:'none',marginTop:4}}/>
              {/* Logo Upload */}
              <label style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,border:'2px dashed rgba(255,255,255,0.3)',cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:12}}>
                📷 Logo hochladen
                <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                  const file=e.target.files?.[0];if(!file||!session)return;
                  try{
                    const path='gyms/'+gym.code+'_logo_'+Date.now()+'.png';
                    const up=await fetch(SUPA_URL+'/storage/v1/object/avatars/'+path,{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token,'Content-Type':file.type,'x-upsert':'true'},body:file});
                    if(!up.ok){alert('Logo-Upload fehlgeschlagen ('+up.status+'). Bitte erneut versuchen.');return;}
                    const url=SUPA_URL+'/storage/v1/object/public/avatars/'+path;
                    await fetch(SUPA_URL+'/rest/v1/gym_logos?gym_code=eq.'+gym.code,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const ins=await fetch(SUPA_URL+'/rest/v1/gym_logos',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({gym_code:gym.code,logo_url:url,verified:true})});
                    if(!ins.ok){alert('Logo gespeichert, aber Eintrag fehlgeschlagen ('+ins.status+').');return;}
                    if(onGymUpdate)await onGymUpdate();
                    alert('✅ Logo gespeichert!');
                  }catch(err){alert('Fehler: '+err.message);}
                }}/>
              </label>
              <button disabled={saving} onClick={async()=>{
                if(!gym.id)return;
                setSaving(true);
                try{
                  await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name:editName,city:editCity,address:editAddress,style:editStyle,phone:editPhone,hours:editHours,description:editDesc})});
                  if(onGymUpdate)await onGymUpdate();
                  setEditMode(false);
                  alert('✅ Gespeichert!');
                }catch(e){alert('Fehler: '+e.message);}
                setSaving(false);
              }} style={{padding:'10px',borderRadius:10,background:saving?'#888':'#27ae60',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>
                {saving?'SPEICHERT...':'✓ ÄNDERUNGEN SPEICHERN'}
              </button>
            </div>
          ):(<>
          <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,color:'#fff',letterSpacing:1,lineHeight:1.2}}>{editName||gym.name}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:6}}>📍 {editCity||gym.city} · gegründet {gym.founded||''}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginTop:10}}>
            {(gym.styles||[gym.style||'Kampfsport']).filter(Boolean).map(s=>(
              <div key={s} style={{padding:'4px 10px',borderRadius:20,background:(styleColors[s]||'#555')+'33',border:'1px solid '+(styleColors[s]||'#555')+'66',color:styleColors[s]||'#fff',fontSize:11,fontWeight:700}}>{s}</div>
            ))}
          </div>
          </>)}
        </div>
      </div>

      <div style={{padding:'14px 16px 40px',maxWidth:480,margin:'0 auto',width:'100%'}}>

        {/* BEWERTUNG */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border,marginBottom:12,textAlign:'center'}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:10}}>BEWERTE DIESES GYM</div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:8}}>
            {[1,2,3,4,5].map(star=>(
              <button key={star} onClick={()=>rateGym(gymKey,star)}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:36,
                  color:star<=userRating?'#d4a017':'#ddd',
                  transition:'transform 0.15s',padding:'0 2px'}}
                onMouseEnter={e=>e.target.style.transform='scale(1.2)'}
                onMouseLeave={e=>e.target.style.transform='scale(1)'}>
                {star<=userRating?'★':'☆'}
              </button>
            ))}
          </div>
          <div style={{color:sub,fontSize:11}}>
            {userRating>0?`Deine Bewertung: ${userRating} Stern${userRating>1?'e':''} · `:'Noch nicht bewertet · '}
            {ratingCount>0?`${ratingCount} Bewertung${ratingCount>1?'en':''} · Ø ${avgRating.toFixed(1)}`:'Sei der Erste!'}
          </div>
        </div>

        {/* ÜBER DAS GYM */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border,marginBottom:12}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:10}}>ÜBER DAS GYM</div>
          <div style={{color:sub,fontSize:13,lineHeight:1.7}}>{gym.desc||gym.description||''}</div>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <div style={{background:card,borderRadius:12,padding:'12px',border:'1px solid '+border,textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:4}}>👥</div>
            <div style={{fontFamily:'Rajdhani,sans-serif',color:'#2980b9',fontSize:24}}>{gym.members}</div>
            <div style={{color:sub,fontSize:10,letterSpacing:1}}>MITGLIEDER</div>
          </div>
          <div style={{background:card,borderRadius:12,padding:'12px',border:'1px solid '+border,textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:4}}>🏆</div>
            <div style={{fontFamily:'Rajdhani,sans-serif',color:'#d4a017',fontSize:24}}>{gym.founded}</div>
            <div style={{color:sub,fontSize:10,letterSpacing:1}}>GEGRÜNDET</div>
          </div>
        </div>

        {/* KONTAKT & ADRESSE */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border,marginBottom:12}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:12}}>KONTAKT & ADRESSE</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:'#c0392b18',border:'1px solid #c0392b33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📍</div>
              <div>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>ADRESSE</div>
                <div style={{color:text,fontSize:13,fontWeight:600}}>{gym.street}</div>
                <div style={{color:sub,fontSize:12}}>{gym.zip} {gym.city}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:'#27ae6018',border:'1px solid #27ae6033',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📞</div>
              <div>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>TELEFON</div>
                <div style={{color:text,fontSize:13,fontWeight:600}}>{gym.phone||''}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🌐</div>
              <div>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>WEBSITE</div>
                <div style={{color:'#2980b9',fontSize:13,fontWeight:600}}>{gym.website}</div>
              </div>
            </div>
            {gym.code&&(
              <div style={{display:'flex',alignItems:'center',gap:12,background:isDark?'#1f1f10':'#fffbf0',borderRadius:10,padding:'10px 12px',border:'1px solid #d4a01733'}}>
                <div style={{width:34,height:34,borderRadius:8,background:'#d4a01718',border:'1px solid #d4a01733',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔑</div>
                <div style={{flex:1}}>
                  <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>FIGHTER-APP CODE</div>
                  <div style={{color:'#d4a017',fontSize:18,fontWeight:700,fontFamily:'Rajdhani,sans-serif',letterSpacing:3}}>{gym.code}</div>
                  <div style={{color:'#bbb',fontSize:10,marginTop:1}}>Diesen Code beim Gym erfragen → Profil verifizieren</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ÖFFNUNGSZEITEN */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:12}}>ÖFFNUNGSZEITEN</div>
          {(gym.hours||'').split(', ').filter(Boolean).map((h,i)=>{
            const [days,time]=h.split(' ').reduce((acc,w,idx)=>{
              if(idx===0||w.includes('-')&&!w.includes(':'))acc[0]+=(acc[0]?' ':'')+w;
              else acc[1]+=(acc[1]?' ':'')+w;
              return acc;
            },['','']);
            return(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<(gym.hours||'').split(', ').length-1?'1px solid '+border:'none'}}>
                <div style={{color:sub,fontSize:12}}>{h.split(' ')[0]}</div>
                <div style={{color:text,fontSize:12,fontWeight:600}}>{h.split(' ').slice(1).join(' ')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GymDetailScreen;
