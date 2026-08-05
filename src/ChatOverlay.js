// Das Chat-Fenster zwischen zwei gematchten Fightern:
// Nachrichten laden/senden, Tipp-Anzeige ("schreibt gerade"), das
// Profil-Panel des Gegenübers und die Fight-Request-Funktion.
//
// Bewusst als eigene Datei ausgelagert, weil es eine klar abgegrenzte,
// in sich geschlossene Ansicht ist - App.js war mit ueber 7900 Zeilen
// kaum noch ueberschaubar.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben worden.
// Die Komponente bekommt alles Noetige als Prop (match, myProfileId,
// myName, token, ...) und greift NICHT auf App.js zurueck.

import { useState, useEffect, useRef } from 'react';
import { SUPA_URL, SUPA_KEY, RED, LIGHT_RED } from './constants';
import { dbSelect, dbInsert } from './supabaseApi';
import { safeLocalNotification } from './notifications';

function ChatOverlay({match,myProfileId,myName,token,onClose,onViewProfile,darkMode,t,appLang,isAdmin}){
  // Fallback t object if not passed
  if(!t)t={fightRequest:'FIGHT REQUEST',fightType:'FIGHT TYP',date:'DATUM',placeGym:'ORT / GYM',placePlaceholder:'z.B. Tiger Gym Berlin',waitingResponse:'Warte...',sendFightRequest:'⚔️ SENDEN',fightSent:'GESENDET!',waitingFor:'Wartet auf',accept:'✅ ANNEHMEN',decline:'❌ ABLEHNEN',counterDate:'🔄 GEGEN-TERMIN',backToChat:'💬 ZURÜCK',fightAccepted:'ANGENOMMEN',fightDeclined:'ABGELEHNT',counterTerm:'GEGENVORSCHLAG',message:'Nachricht…',send:'➤',block:'🚫 Blockieren',unblock:'🚫 Entsperren',report:'⚠️ Melden',reported:'✓ Gemeldet'};
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(true);
  const [showProfilePanel,setShowProfilePanel]=useState(false);
  const [showFightRequest,setShowFightRequest]=useState(false);
  const [fightDate,setFightDate]=useState('');
  const [fightLocation,setFightLocation]=useState('');
  const [fightType,setFightType]=useState('Sparring');
  const [fightSent,setFightSent]=useState(false);
  const [otherTyping,setOtherTyping]=useState(false);
  const endRef=useRef(null);
  const pollRef=useRef(null);
  const typingRef=useRef(null);
  // WICHTIG: Kein Rueckfall auf das eigene Profil mehr. Vorher stand hier
  // "match.profile_b||match.profile_a" - falls profile_b aus irgendeinem
  // Grund mal nicht korrekt geladen war, fiel der Code faelschlich auf
  // das EIGENE Profil zurueck, wodurch man sich selbst eine Push-
  // Benachrichtigung fuer die eigene, gerade gesendete Nachricht schickte.
  const other=match.profile_a_id===myProfileId?match.profile_b:match.profile_a;
  const accent=other?.style==='Boxing'?'#c0392b':other?.style==='MMA'?'#2980b9':other?.style==='Muay Thai'?'#d35400':'#27ae60';
  // Safety: if other is completely null, show loading
  if(!other)return(<div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}><div style={{fontSize:32}} className='spin'>⏳</div><div style={{color:'#aaa',fontSize:13}}>{appLang==='FR'?'Chargement...':appLang==='EN'?'Loading...':'Laden...'}</div><button onClick={onClose} style={{marginTop:8,background:'#c0392b',border:'none',borderRadius:8,padding:'10px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{t.back}</button></div>);

  async function markAsRead(){
    try{
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=eq.'+match.id+'&sender_id=neq.'+myProfileId+'&read_at=is.null',{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
        body:JSON.stringify({read_at:new Date().toISOString()})
      });
    }catch{}
  }
  const lastMsgTime=useRef(null);

  async function loadMsgs(onlyNew=false){
    try{
      let query='match_id=eq.'+match.id+'&order=created_at.asc';
      if(onlyNew&&lastMsgTime.current){
        query+='&created_at=gt.'+encodeURIComponent(lastMsgTime.current);
      }
      const msgs=await dbSelect('messages',query,token);
      if(Array.isArray(msgs)&&msgs.length>0){
        if(onlyNew){
          setMessages(prev=>{
            const existingIds=new Set(prev.map(m=>m.id));
            const fresh=msgs.filter(m=>!existingIds.has(m.id));
            if(fresh.length>0){
              // Push für neue Nachrichten vom anderen
              const newest=fresh[fresh.length-1];
              if(newest.sender_id!==myProfileId){
                // safeLocalNotification statt sendLocalNotification: Letzteres existiert
                // nur in der Haupt-Komponente — der Aufruf hier warf einen ReferenceError
                // und crashte die App, sobald im offenen Chat eine Nachricht ankam
                safeLocalNotification('💬 Neue Nachricht',other?.name+': '+newest.content?.slice(0,60));
              }
              const updated=[...prev,...fresh];
              lastMsgTime.current=updated[updated.length-1].created_at;
              return updated;
            }
            return prev;
          });
        }else{
          setMessages(msgs);
          lastMsgTime.current=msgs[msgs.length-1]?.created_at||null;
        }
        markAsRead();
      }
    }catch{}
    setLoading(false);
  }

  useEffect(()=>{
    loadMsgs(false);
    // Schnelles Polling: 600ms für sofortige Reaktion
    pollRef.current=setInterval(async()=>{
      await loadMsgs(true);
      // Typing status
      try{
        const r=await fetch(SUPA_URL+'/rest/v1/typing_status?match_id=eq.'+match.id+'&user_id=neq.'+myProfileId,{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
        });
        const data=await r.json();
        if(Array.isArray(data)&&data[0]){
          const age=Date.now()-new Date(data[0].updated_at).getTime();
          setOtherTyping(age<4000&&data[0].is_typing===true);
        }else{setOtherTyping(false);}
      }catch{}
    },600);
    return()=>clearInterval(pollRef.current);
  },[match.id]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  async function sendTypingStatus(isTyping){
    try{
      await fetch(SUPA_URL+'/rest/v1/typing_status',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'resolution=merge-duplicates'},
        body:JSON.stringify({match_id:match.id,user_id:myProfileId,is_typing:isTyping,updated_at:new Date().toISOString()})
      });
    }catch{}
  }

  async function sendPushTo(recipientUserId,title,body){
    if(!recipientUserId){
      console.error('sendPushTo: keine recipientUserId - Push wurde gar nicht erst versucht');
      return;
    }
    try{
      const r=await fetch(SUPA_URL+'/functions/v1/send-push',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
        body:JSON.stringify({recipientUserId,title,body})
      });
      const d=await r.json().catch(()=>({}));
      if(isAdmin&&typeof window!=='undefined'){
        const el=document.createElement('div');
        el.textContent='🔔 Push-Diagnose (Nachricht): '+JSON.stringify(d).slice(0,200);
        el.style.cssText='position:fixed;bottom:90px;left:12px;right:12px;background:#1a1a1a;color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
        document.body.appendChild(el);
        setTimeout(()=>el.remove(),6000);
      }
    }catch(err){
      console.error('sendPushTo Fehler (Nachricht)',err);
      if(isAdmin&&typeof window!=='undefined'){
        const el=document.createElement('div');
        el.textContent='❌ Push-Fehler (Nachricht): '+err.message;
        el.style.cssText='position:fixed;bottom:90px;left:12px;right:12px;background:#c0392b;color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
        document.body.appendChild(el);
        setTimeout(()=>el.remove(),6000);
      }
    }
  }

  async function send(){
    if(!input.trim())return;
    const text=input.trim();setInput('');
    sendTypingStatus(false);
    clearTimeout(typingRef.current);
    // Sofort optimistisch anzeigen
    const tmpId='tmp_'+Date.now();
    const tmp={id:tmpId,match_id:match.id,sender_id:myProfileId,content:text,created_at:new Date().toISOString()};
    setMessages(m=>[...m,tmp]);
    try{
      const saved=await dbInsert('messages',{match_id:match.id,sender_id:myProfileId,content:text},token);
      // tmp durch echte Nachricht ersetzen
      if(Array.isArray(saved)&&saved[0]){
        setMessages(m=>m.map(msg=>msg.id===tmpId?saved[0]:msg));
        lastMsgTime.current=saved[0].created_at;
      }
      // Push an den Empfaenger ausloesen — myName kommt als Prop aus der
      // Haupt-Komponente (myProfile existiert hier im Chat-Overlay nicht)
      sendPushTo(other&&other.user_id,myName||'Jemand',text);
    }catch{}
  }

  const wins=other?.wins||0;const losses=other?.losses||0;const draws=other?.draws||0;const ko=other?.ko||0;
  const totalFights=wins+losses+draws;const winRate=totalFights>0?Math.round((wins/totalFights)*100):0;
  return(
    <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:200,display:'flex',flexDirection:'column'}}>

      {/* PROFIL-PANEL — slide in von oben */}
      {showProfilePanel&&(
        <div style={{position:'absolute',inset:0,zIndex:10,background:'#f5f5f7',overflowY:'auto',display:'flex',flexDirection:'column'}}>
          {/* Hero-Bild */}
          <div style={{position:'relative',height:280,flexShrink:0,background:'#111'}}>
            {other?.avatar_url
              ?<img loading="lazy" src={other.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:0.85}} alt=''/>
              :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:90}}>🥊</div>}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.8) 100%)'}}/>
            <button onClick={()=>setShowProfilePanel(false)}
              style={{position:'absolute',top:'calc(14px + env(safe-area-inset-top))',left:14,background:'rgba(0,0,0,0.5)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,padding:'5px 12px',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>
              ← Chat
            </button>
            <div style={{position:'absolute',bottom:16,left:16,right:16}}>
              <div className='rj' style={{color:'#fff',fontSize:30,letterSpacing:2,lineHeight:1}}>{other?.name}</div>
              {other?.gym_verified&&(
                <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(39,174,96,0.2)',border:'1px solid rgba(39,174,96,0.4)',borderRadius:20,padding:'3px 10px',marginTop:4}}>
                  <span style={{color:'#27ae60',fontSize:11,fontWeight:700}}>✅ Verifiziertes Mitglied</span>
                </div>
              )}
              <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
                {other?.style&&<div style={{background:accent+'33',border:'1px solid '+accent+'66',borderRadius:20,padding:'3px 10px',color:accent,fontSize:11,fontWeight:700}}>{other.style}</div>}
                {other?.city&&<div style={{background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',color:'rgba(255,255,255,0.8)',fontSize:11}}>📍 {other.city}</div>}
                {other?.gym&&<div style={{background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',color:'rgba(255,255,255,0.8)',fontSize:11}}>🏋️ {other.gym}</div>}
              </div>
            </div>
          </div>

          <div style={{padding:'14px 14px 40px',maxWidth:480,margin:'0 auto',width:'100%'}}>

            {/* VIDEOS */}
            {other?.gallery&&(Array.isArray(other.gallery)?other.gallery:[]).length>0&&(
              <div style={{marginBottom:10}}>
                <div style={{color:'#bbb',fontSize:10,letterSpacing:1,marginBottom:6,fontWeight:600}}>📸 FOTOS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
                  {(Array.isArray(other.gallery)?other.gallery:[]).slice(0,3).map((g,i)=>(
                    <div key={i} style={{aspectRatio:'1/1',borderRadius:11,overflow:'hidden',background:'#f0f0f0',border:'1px solid #eee'}}>
                      {/* kein Lightbox-Zoom hier: setLightboxImg existiert nur in der
                          Haupt-Komponente, der Aufruf hätte einen Absturz ausgelöst */}
                      <img loading="lazy" src={g} alt='' style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kampfrekord */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
              {[['SIEGE',wins,'#27ae60'],['NIEDER',losses,RED],['UNENTSCH',draws,'#d4a017'],['KOs',ko,RED]].map(([label,val,color])=>(
                <div key={label} style={{background:'#fff',borderRadius:11,padding:'11px 4px',textAlign:'center',border:'1px solid '+color+'33',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div className='rj' style={{color:color,fontSize:26,lineHeight:1}}>{val}</div>
                  <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Win-Rate Bar */}
            <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                <div style={{color:'#888',fontSize:11,fontWeight:600}}>SIEGRATE</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15}}>{winRate}%</div>
              </div>
              <div style={{height:6,background:'#f0f0f0',borderRadius:3}}>
                <div style={{height:'100%',width:winRate+'%',background:'linear-gradient(90deg,#27ae60,#2ecc71)',borderRadius:3,transition:'width 0.6s ease'}}/>
              </div>
              <div style={{color:'#ccc',fontSize:10,marginTop:5}}>{totalFights} Kämpfe gesamt · {ko} KO/TKO Siege</div>
            </div>

            {/* Infos */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
              {[
                [appLang==='FR'?'CATÉGORIE':appLang==='EN'?'WEIGHT CLASS':'GEWICHTSKLASSE',other?.weight_class||'-','#2980b9'],
                [appLang==='FR'?'SALLE':'GYM',other?.gym||'-','#8e44ad'],
                ['GRÖSSE',other?.height?(other.height+'cm'):'-','#27ae60'],
                ['GEWICHT',other?.weight?(other.weight+'kg'):'-','#e67e22'],
              ].map(([label,val,color])=>(
                <div key={label} style={{background:'#fff',borderRadius:10,padding:'11px 12px',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                  <div style={{color:'#ccc',fontSize:9,letterSpacing:1}}>{label}</div>
                  <div style={{color:color,fontWeight:700,fontSize:13,marginTop:3}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Bio */}
            {other?.bio&&(
              <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:10}}>
                <div style={{color:'#ccc',fontSize:9,letterSpacing:1,marginBottom:6}}>ÜBER MICH</div>
                <div style={{color:'#555',fontSize:13,fontStyle:'italic',lineHeight:1.6}}>"{other.bio}"</div>
              </div>
            )}

            {/* Zurück zum Chat Button */}
            <button onClick={()=>setShowProfilePanel(false)}
              style={{width:'100%',padding:'13px',borderRadius:10,background:`linear-gradient(135deg,${accent},${accent}cc)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:'pointer'}}>
              💬 ZURÜCK ZUM CHAT
            </button>
          </div>
        </div>
      )}

      {/* FIGHT REQUEST PANEL */}
      {showFightRequest&&(
        <div style={{position:'absolute',inset:0,zIndex:11,background:'#f5f5f7',overflowY:'auto',display:'flex',flexDirection:'column'}}>
          <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setShowFightRequest(false)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,padding:'5px 12px',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
            <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2,flex:1}}>{t.fightRequest}</div>
            <div style={{fontSize:22}}>⚔️</div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee',textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:6}}>{other?.emoji||''}</div>
              <div className='rj' style={{color:'#1a1a1a',fontSize:18,letterSpacing:1}}>{other?.name}</div>
              <div style={{color:'#888',fontSize:12,marginTop:2}}>{other?.style} · {other?.weight_class||other?.weightClass||''}</div>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:10}}>{t.fightType}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['Sparring','Amateur Wettkampf','Profi Wettkampf','Freundschaftskampf'].map(t=>(
                  <button key={t} onClick={()=>setFightType(t)} style={{padding:'7px 12px',borderRadius:20,background:fightType===t?'#c0392b':'#f5f5f5',border:'1px solid '+(fightType===t?'#c0392b':'#ddd'),color:fightType===t?'#fff':'#666',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{t.date}</div>
              <input type='date' value={fightDate} onChange={e=>setFightDate(e.target.value)}
                style={{width:'100%',background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:8,padding:'10px 12px',fontSize:14,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif'}}/>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{t.placeGym}</div>
              <input type='text' value={fightLocation} onChange={e=>setFightLocation(e.target.value)} placeholder={t.placePlaceholder}
                style={{width:'100%',background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:8,padding:'10px 12px',fontSize:14,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif'}}/>
            </div>
            {fightSent?(
              <div style={{background:'#f0faf0',border:'1px solid #27ae6044',borderRadius:12,padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:6}}>✅</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18}}>{t.fightSent}</div>
                <div style={{color:'#888',fontSize:12,marginTop:4}}>Warte auf Antwort von {other?.name}</div>
              </div>
            ):(
              <button onClick={async()=>{
                if(!fightDate||!fightLocation){return;}
                const hasIncoming=messages.some(m=>m.content?.startsWith('⚔️ FIGHT REQUEST')&&m.sender_id!==myProfileId);
                const prefix=hasIncoming?'🔄 ALTERNATIVTERMIN':'⚔️ FIGHT REQUEST';
                const msg=`${prefix}

Typ: ${fightType}
Datum: ${new Date(fightDate).toLocaleDateString('de')}
Ort: ${fightLocation}

Bist du dabei?`;
                try{
                  await fetch(SUPA_URL+'/rest/v1/messages',{
                    method:'POST',
                    headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
                    body:JSON.stringify({match_id:match.id,sender_id:myProfileId,content:msg})
                  });
                  setFightSent(true);
                  setTimeout(()=>{setShowFightRequest(false);setFightSent(false);},2000);
                }catch{}
              }} disabled={!fightDate||!fightLocation}
                style={{width:'100%',padding:'14px',borderRadius:10,background:fightDate&&fightLocation?'linear-gradient(135deg,#c0392b,#e74c3c)':'#eee',border:'none',color:fightDate&&fightLocation?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:fightDate&&fightLocation?'pointer':'not-allowed'}}>
                ⚔️ FIGHT REQUEST SENDEN
              </button>
            )}
          </div>
        </div>
      )}

      {/* CHAT HEADER — klickbar für Profil */}
      <div onClick={()=>setShowProfilePanel(true)} style={{display:'flex',alignItems:'center',gap:11,padding:'calc(10px + env(safe-area-inset-top)) 14px 10px',background:'#fff',borderBottom:'1px solid #eee',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:'pointer',userSelect:'none'}}>
        <button onClick={e=>{e.stopPropagation();onClose();}} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',padding:'0 4px 0 0',fontFamily:'Rajdhani,sans-serif',fontWeight:700,flexShrink:0}}>←</button>
        <div style={{position:'relative',flexShrink:0}}>
          {other?.avatar_url
            ?<img loading="lazy" src={other.avatar_url} style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:'2px solid '+accent}} alt=''/>
            :<div style={{width:42,height:42,borderRadius:'50%',background:accent+'22',border:'2px solid '+accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🥊</div>}
          {other?.last_seen&&(Date.now()-new Date(other.last_seen).getTime())<300000&&(
            <div style={{position:'absolute',bottom:0,right:0,width:10,height:10,borderRadius:'50%',background:'#27ae60',border:'2px solid #fff'}}/>
          )}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div className='rj' style={{color:'#1a1a1a',fontSize:18,letterSpacing:1,lineHeight:1}}>{other?.name}</div>
          <div style={{color:accent,fontSize:10,fontWeight:700,marginTop:2}}>
            {other?.last_seen&&(Date.now()-new Date(other.last_seen).getTime())<300000
              ?'🟢 Online'
              :(other?.style+' · '+other?.city)}
          </div>
        </div>
        <div style={{background:accent+'15',border:'1px solid '+accent+'33',borderRadius:8,padding:'5px 10px',flexShrink:0}}>
          <div style={{color:accent,fontSize:10,fontWeight:700}}>Profil</div>
          <div style={{color:accent,fontSize:10,textAlign:'center'}}>ansehen</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
        {loading?<div style={{textAlign:'center',color:'#bbb',marginTop:30}}>Laden…</div>
        :messages.length===0?<div style={{textAlign:'center',color:'#bbb',marginTop:40}}><div style={{fontSize:36,marginBottom:10}}>⚔️</div><div style={{fontWeight:700,fontSize:14}}>Match bestätigt!</div><div style={{fontSize:12,marginTop:4}}>Schreib die erste Nachricht</div></div>
        :messages.map(m=>{
          const isMe=m.sender_id===myProfileId;
          const isFightReq=m.content&&m.content.startsWith('⚔️ FIGHT REQUEST');
          const isAccepted=m.content&&m.content.startsWith('✅ FIGHT ANGENOMMEN');
          const isDeclined=m.content&&m.content.startsWith('❌ FIGHT ABGELEHNT');
          const isCounter=m.content&&m.content.startsWith('🔄 ALTERNATIVTERMIN');

          if(isFightReq){
            const lines=m.content.split('\n').filter(Boolean);
            const typ=lines.find(l=>l.startsWith('Typ:'))?.replace('Typ: ','');
            const datum=lines.find(l=>l.startsWith('Datum:'))?.replace('Datum: ','');
            const ort=lines.find(l=>l.startsWith('Ort:'))?.replace('Ort: ','');
            return(
              <div key={m.id} style={{display:'flex',justifyContent:'center',margin:'6px 0'}}>
                <div style={{width:'90%',maxWidth:320,background:'#fff',borderRadius:14,border:'2px solid #c0392b33',boxShadow:'0 2px 12px rgba(192,57,43,0.1)',overflow:'hidden'}}>
                  <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:20}}>⚔️</span>
                    <div className='rj' style={{color:'#fff',fontSize:16,letterSpacing:2,flex:1}}>FIGHT REQUEST</div>
                    <div style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>{isMe?'Von dir':'Von '+other?.name?.split(' ')[0]}</div>
                  </div>
                  <div style={{padding:'12px 14px'}}>
                    {[['🥊 Typ',typ],['📅 Datum',datum],['📍 Ort',ort]].map(([label,val])=>val&&(
                      <div key={label} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                        <div style={{color:'#aaa',fontSize:11,width:60,flexShrink:0}}>{label}</div>
                        <div style={{color:'#1a1a1a',fontSize:13,fontWeight:600}}>{val}</div>
                      </div>
                    ))}
                    {!isMe&&(
                      <div style={{display:'flex',gap:6,marginTop:10}}>
                        <button onClick={async()=>{
                          const reply=`✅ FIGHT ANGENOMMEN

Typ: ${typ}
Datum: ${datum}
Ort: ${ort}

Bis dann! 🥊`;
                          await fetch(SUPA_URL+'/rest/v1/messages',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},body:JSON.stringify({match_id:match.id,sender_id:myProfileId,content:reply})});
                          try{
                            await fetch(SUPA_URL+'/rest/v1/fight_history',{
                              method:'POST',
                              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
                              body:JSON.stringify({
                                user_id:myProfileId,
                                opponent_id:other?.id||null,
                                opponent_name:other?.name||'Unbekannt',
                                opponent_style:other?.style||'',
                                fight_type:typ||'Sparring',
                                fight_date:datum||'',
                                location:ort||'',
                                status:'angenommen',
                                result:'ausstehend'
                              })
                            });
                          }catch(e){console.error('fight_history',e);}
                        }} style={{flex:1,padding:'9px',borderRadius:9,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                          ✅ ANNEHMEN
                        </button>
                        <button onClick={async()=>{
                          const reply=`❌ FIGHT ABGELEHNT

Leider kann ich diesen Termin nicht wahrnehmen.`;
                          await fetch(SUPA_URL+'/rest/v1/messages',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},body:JSON.stringify({match_id:match.id,sender_id:myProfileId,content:reply})});
                        }} style={{flex:1,padding:'9px',borderRadius:9,background:'#fff',border:'1px solid #e74c3c',color:'#e74c3c',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                          ❌ ABLEHNEN
                        </button>
                        <button onClick={()=>{setShowFightRequest(true);}} style={{flex:1,padding:'9px',borderRadius:9,background:'#fff',border:'1px solid #2980b9',color:'#2980b9',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                          🔄 GEGEN-TERMIN
                        </button>
                      </div>
                    )}
                    {isMe&&<div style={{color:'#aaa',fontSize:11,textAlign:'center',marginTop:6}}>{t.waitingResponse}</div>}
                  </div>
                  <div style={{padding:'4px 14px 8px',textAlign:'right'}}>
                    <span style={{color:'#ccc',fontSize:9}}>{new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                </div>
              </div>
            );
          }

          if(isAccepted||isDeclined||isCounter){
            const isGreen=isAccepted;
            const isBlue=isCounter;
            const bg=isGreen?'#f0faf0':isBlue?'#f0f4ff':'#fff5f5';
            const border=isGreen?'#27ae60':isBlue?'#2980b9':'#e74c3c';
            const icon=isAccepted?'✅':isDeclined?'❌':'🔄';
            const title=isAccepted?'FIGHT ANGENOMMEN':isDeclined?'FIGHT ABGELEHNT':'ALTERNATIVTERMIN';
            return(
              <div key={m.id} style={{display:'flex',justifyContent:'center',margin:'6px 0'}}>
                <div style={{width:'85%',maxWidth:300,background:bg,borderRadius:12,border:'1px solid '+border+'44',padding:'12px 14px'}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                    <span style={{fontSize:18}}>{icon}</span>
                    <div className='rj' style={{color:border,fontSize:14,letterSpacing:1}}>{title}</div>
                  </div>
                  <div style={{color:'#555',fontSize:12,lineHeight:1.5}}>{m.content.split('\n').slice(1).filter(Boolean).join(' · ')}</div>
                  <div style={{color:'#bbb',fontSize:9,marginTop:6,textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            );
          }

          return(
            <div key={m.id} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',alignItems:'flex-end',gap:6}}>
              {!isMe&&(
                <div onClick={()=>setShowProfilePanel(true)} style={{cursor:'pointer',flexShrink:0}}>
                  {other?.avatar_url
                    ?<img loading="lazy" src={other.avatar_url} style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',border:'1px solid '+accent+'44'}} alt=''/>
                    :<div style={{width:26,height:26,borderRadius:'50%',background:accent+'22',border:'1px solid '+accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🥊</div>}
                </div>
              )}
              <div style={{maxWidth:'72%',padding:'9px 13px',borderRadius:isMe?'14px 14px 3px 14px':'14px 14px 14px 3px',background:isMe?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#fff',color:isMe?'#fff':'#1a1a1a',fontSize:14,boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
                {m.content}
                <div style={{color:isMe?'rgba(255,255,255,0.55)':'#ccc',fontSize:9,marginTop:3,textAlign:'right'}}>
                  {new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})} {isMe&&<span style={{marginLeft:3,color:m.read_at?'#4fc3f7':'rgba(255,255,255,0.7)'}}>{m.id.startsWith('tmp_')?'✓':'✓✓'}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping&&(
          <div style={{display:'flex',alignItems:'flex-end',gap:6,marginLeft:4}}>
            <div onClick={()=>setShowProfilePanel(true)} style={{cursor:'pointer',flexShrink:0}}>
              {other?.avatar_url
                ?<img loading="lazy" src={other.avatar_url} style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',border:'1px solid '+accent+'44'}} alt=''/>
                :<div style={{width:26,height:26,borderRadius:'50%',background:accent+'22',border:'1px solid '+accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🥊</div>}
            </div>
            <div style={{padding:'10px 14px',borderRadius:'14px 14px 14px 3px',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',display:'flex',gap:4,alignItems:'center'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#bbb',animation:'pulse 1s ease-in-out infinite'}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#bbb',animation:'pulse 1s ease-in-out 0.2s infinite'}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#bbb',animation:'pulse 1s ease-in-out 0.4s infinite'}}/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{padding:'6px 12px 0',background:'#fff',borderTop:'1px solid #eee'}}> 
        <button onClick={()=>setShowFightRequest(true)} style={{width:'100%',padding:'7px',borderRadius:8,background:'linear-gradient(135deg,#1a1a1a,#c0392b)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,letterSpacing:1.5,cursor:'pointer',marginBottom:6}}>
          ⚔️ FIGHT REQUEST SENDEN
        </button>
      </div>
      <div style={{padding:'6px 12px 10px',background:'#fff',display:'flex',gap:8,alignItems:'flex-end'}}>
        <textarea value={input} onChange={e=>{
                setInput(e.target.value);
                if(e.target.value.length>0){
                  sendTypingStatus(true);
                  clearTimeout(typingRef.current);
                  typingRef.current=setTimeout(()=>sendTypingStatus(false),3000);
                }else{sendTypingStatus(false);}
              }}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder={t.message} rows={1}
          style={{flex:1,background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:20,padding:'10px 14px',fontSize:14,color:'#1a1a1a',maxHeight:80}}/>
        <button onClick={send} disabled={!input.trim()}
          style={{width:42,height:42,borderRadius:'50%',background:input.trim()?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:input.trim()?'#fff':'#aaa',fontSize:17,cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatOverlay;
