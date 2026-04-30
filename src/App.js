import { useState, useEffect, useRef } from 'react';

const SUPA_URL = 'https://uykdrmymjvqgebsmndme.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk';

async function authSignUp(email, password) {
  const r = await fetch(SUPA_URL + '/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
async function authSignIn(email, password) {
  const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
async function authSignOut(token) {
  await fetch(SUPA_URL + '/auth/v1/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + token },
  });
}
function hdr(token) {
  return { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + (token || SUPA_KEY) };
}
async function dbInsert(table, data, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table, {
    method: 'POST', headers: { ...hdr(token), Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return r.json();
}
async function dbUpdate(table, data, query, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + '?' + query, {
    method: 'PATCH', headers: { ...hdr(token), Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return r.json();
}
async function dbSelect(table, query, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + (query ? '?' + query : ''), { headers: hdr(token) });
  return r.json();
}
async function uploadPhoto(file, path, token) {
  const r = await fetch(SUPA_URL + '/storage/v1/object/avatars/' + path, {
    method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token, 'Content-Type': file.type }, body: file,
  });
  if (!r.ok) return null;
  return SUPA_URL + '/storage/v1/object/public/avatars/' + path;
}

const WEIGHT_CLASSES = [
  'Strohgewicht (bis 52 kg)','Leichtfliegengewicht (bis 54 kg)','Fliegengewicht (bis 57 kg)',
  'Bantamgewicht (bis 61 kg)','Federgewicht (bis 66 kg)','Leichtgewicht (bis 70 kg)',
  'Halbweltergewicht (bis 77 kg)','Weltergewicht (bis 83 kg)','Halbmittelgewicht (bis 87 kg)',
  'Mittelgewicht (bis 93 kg)','Halbschwergewicht (bis 100 kg)','Cruisergewicht (bis 90 kg)','Schwergewicht (ueber 100 kg)'
];
const STYLES = ['Boxing','Kickboxing','MMA','Muay Thai','Grappling','BJJ','Wrestling'];
const FIGHTERS = [
  { id:'demo_1',name:'Kai Mueller',age:26,city:'Berlin',gym:'Tiger Gym Berlin',height:182,weight:77,weight_class:'Weltergewicht',style:'Boxing',wins:12,losses:2,draws:1,ko:8,emoji:'🥊',accent:'#c0392b' },
  { id:'demo_2',name:'Marco Reyes',age:29,city:'Muenchen',gym:'Combat Base Munich',height:175,weight:70,weight_class:'Leichtgewicht',style:'MMA',wins:18,losses:4,draws:0,ko:11,emoji:'🥋',accent:'#2980b9' },
  { id:'demo_3',name:'Leon Braun',age:24,city:'Hamburg',gym:'Iron Fist HH',height:190,weight:93,weight_class:'Mittelgewicht',style:'Muay Thai',wins:7,losses:1,draws:0,ko:5,emoji:'🔥',accent:'#d35400' },
  { id:'demo_4',name:'Tomas Vega',age:31,city:'Koeln',gym:'Warriors Gym Koeln',height:178,weight:83,weight_class:'Halbmittelgewicht',style:'Kickboxing',wins:22,losses:6,draws:2,ko:14,emoji:'💥',accent:'#27ae60' },
  { id:'demo_5',name:'Sven Koch',age:23,city:'Frankfurt',gym:'Apex Fighting Center',height:185,weight:100,weight_class:'Schwergewicht',style:'Wrestling',wins:5,losses:0,draws:0,ko:2,emoji:'🏅',accent:'#8e44ad' },
  { id:'demo_6',name:'Darius Stein',age:27,city:'Stuttgart',gym:'Ground Zero Stuttgart',height:172,weight:61,weight_class:'Bantamgewicht',style:'BJJ',wins:14,losses:3,draws:1,ko:6,emoji:'⚡',accent:'#16a085' },
];
const GYMS = {
  'Berlin':[{name:'Tiger Gym Berlin',members:142,styles:['Boxing','Muay Thai','MMA'],rating:4.8,address:'Mitte, Berlin',emoji:'🐯'},{name:'Berserker Boxing Club',members:89,styles:['Boxing'],rating:4.6,address:'Kreuzberg, Berlin',emoji:'👊'},{name:'Berlin Fight Club',members:210,styles:['MMA','BJJ','Wrestling'],rating:4.9,address:'Friedrichshain, Berlin',emoji:'⚔️'}],
  'Muenchen':[{name:'Combat Base Munich',members:175,styles:['MMA','BJJ'],rating:4.7,address:'Schwabing, Muenchen',emoji:'🦁'},{name:'Xtreme Fight Academy',members:130,styles:['MMA','Kickboxing'],rating:4.5,address:'Maxvorstadt, Muenchen',emoji:'💪'}],
  'Hamburg':[{name:'Iron Fist HH',members:95,styles:['Muay Thai','Boxing'],rating:4.6,address:'Altona, Hamburg',emoji:'✊'},{name:'Nordstern MMA',members:118,styles:['MMA','Grappling'],rating:4.4,address:'Barmbek, Hamburg',emoji:'⭐'}],
  'Koeln':[{name:'Warriors Gym Koeln',members:160,styles:['Kickboxing','Boxing'],rating:4.7,address:'Ehrenfeld, Koeln',emoji:'⚡'},{name:'Rhine Valley BJJ',members:70,styles:['BJJ','Grappling'],rating:4.8,address:'Nippes, Koeln',emoji:'🔵'}],
  'Frankfurt':[{name:'Apex Fighting Center',members:200,styles:['MMA','Boxing','Wrestling'],rating:4.9,address:'Sachsenhausen, Frankfurt',emoji:'🔺'}],
  'Stuttgart':[{name:'Ground Zero Stuttgart',members:88,styles:['BJJ','MMA'],rating:4.5,address:'Stuttgart-Mitte',emoji:'💣'},{name:'Swabia Combat Sports',members:112,styles:['Muay Thai','Kickboxing'],rating:4.3,address:'Bad Cannstatt',emoji:'🏋️'}],
};
const TRAINERS = [
  {id:1,name:'Freddie Roach',country:'USA',style:'Boxing',pupils:'Manny Pacquiao, Miguel Cotto',gym:'Wild Card Boxing Club',titles:28,rating:9.8,exp:35,emoji:'🥊',accent:'#d4a017',bio:'Einer der erfolgreichsten Boxing-Trainer aller Zeiten mit 28 Weltmeistern.'},
  {id:2,name:'Firas Zahabi',country:'Kanada',style:'MMA',pupils:'Georges St-Pierre, Rory MacDonald',gym:'Tristar Gym Montreal',titles:12,rating:9.7,exp:22,emoji:'🎯',accent:'#2980b9',bio:'Revolutionierte das MMA-Training mit wissenschaftlichem Ansatz.'},
  {id:3,name:'Rafael Cordeiro',country:'Brasilien',style:'Muay Thai / MMA',pupils:'Anderson Silva, Fabricio Werdum',gym:'Kings MMA',titles:15,rating:9.6,exp:28,emoji:'🔥',accent:'#27ae60',bio:'Weltklasse-Trainer mit ueber 30 Weltmeistern in Muay Thai und MMA.'},
  {id:4,name:'John Kavanagh',country:'Irland',style:'MMA / BJJ',pupils:'Conor McGregor, Gunnar Nelson',gym:'SBG Ireland',titles:10,rating:9.5,exp:20,emoji:'☘️',accent:'#c0392b',bio:'Brachte McGregor zur Weltelite. Gilt als innovativster Trainer Europas.'},
  {id:5,name:'Trevor Wittman',country:'USA',style:'MMA / Striking',pupils:'Justin Gaethje, Nate Diaz',gym:'ONX Sports',titles:8,rating:9.4,exp:18,emoji:'⚡',accent:'#8e44ad',bio:'Bekannt fuer explosive Striking-Entwicklung und mentale Kampfvorbereitung.'},
];
const SPORTS = {
  'Basketball':{color:'#e67e22',emoji:'🏀',games:[{id:1,title:'Pickup Basketball',location:'Tempelhof Courts, Berlin',time:'Sa 15:00',cur:4,max:10,level:'Mittel',host:'Kevin S.'},{id:2,title:'3on3 Tournament',location:'Beach Courts Muenchen',time:'So 12:00',cur:8,max:12,level:'Anfaenger',host:'Lena M.'}]},
  'Tennis':{color:'#27ae60',emoji:'🎾',games:[{id:1,title:'Casual Doubles',location:'TC Rot-Weiss Berlin',time:'So 10:00',cur:2,max:4,level:'Mittel',host:'Anna K.'},{id:2,title:'Singles Sparring',location:'Stadtpark HH',time:'Sa 14:00',cur:1,max:2,level:'Fortgeschritten',host:'Felix R.'}]},
  'Fussball':{color:'#2980b9',emoji:'⚽',games:[{id:1,title:'5vs5 Hallenfussball',location:'Soccerhalle Berlin',time:'Do 20:00',cur:7,max:10,level:'Mittel',host:'Mehmet A.'},{id:2,title:'Sonntagskick',location:'Stadtpark Koeln',time:'So 11:00',cur:12,max:22,level:'Alle',host:'Thomas B.'}]},
  'Kampfsport':{color:'#c0392b',emoji:'🥋',games:[{id:1,title:'Open Mat BJJ',location:'Tiger Gym Berlin',time:'So 11:00',cur:8,max:20,level:'Alle',host:'Kai M.'},{id:2,title:'Boxing Sparring',location:'Berserker BC',time:'Do 19:00',cur:3,max:10,level:'Mittel',host:'Felix W.'}]},
};

const SW=80, RED='#c0392b', LIGHT_RED='#e74c3c';
const css=`
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f5f5f7;font-family:'DM Sans',sans-serif}
.rj{font-family:'Rajdhani',sans-serif!important;font-weight:700}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fadeUp{animation:fadeUp 0.4s ease both}
.spin{animation:spin 0.8s linear infinite}
input,select,textarea{outline:none;font-family:'DM Sans',sans-serif}
input::placeholder,textarea::placeholder{color:#aaa}
::-webkit-scrollbar{display:none}
textarea{resize:none}
`;

function AuthScreen({ onSession }) {
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const [info,setInfo]=useState('');const [privacy,setPrivacy]=useState(false);

  async function submit() {
    if(!email||!password){setErr('E-Mail und Passwort eingeben');return;}
    setLoading(true);setErr('');setInfo('');
    if(mode==='register'){
      const r=await authSignUp(email,password);
      if(r.error)setErr(r.error.message||'Fehler');
      else if(r.session)onSession({token:r.session.access_token,userId:r.user.id});
      else setInfo('Bestätigungs-Email gesendet!');
    }else{
      const r=await authSignIn(email,password);
      if(r.error)setErr(r.error.message||'Login fehlgeschlagen');
      else if(r.access_token)onSession({token:r.access_token,userId:r.user.id,refresh_token:r.refresh_token});
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <style>{css}</style>
      <div className='fadeUp' style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div className='rj' style={{fontSize:64,color:'#1a1a1a',letterSpacing:6,lineHeight:1}}>FIGHTER</div>
          <div style={{color:RED,fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>FINDE DEINEN GEGNER</div>
        </div>
        <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid #eee',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',marginBottom:20,background:'#f5f5f7',borderRadius:8,padding:3,gap:3}}>
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr('');setInfo('');}}
                style={{flex:1,padding:'9px',borderRadius:6,background:mode===m?'#fff':'transparent',border:mode===m?'1px solid #eee':'none',color:mode===m?'#1a1a1a':'#aaa',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.08)':'none',transition:'all 0.2s'}}>
                {m==='login'?'Einloggen':'Registrieren'}
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:11}}>
            <Inp placeholder='E-Mail' value={email} onChange={setEmail} type='email'/>
            <Inp placeholder='Passwort (min. 6 Zeichen)' value={password} onChange={setPassword} type='password' onKeyDown={e=>e.key==='Enter'&&submit()}/>
          </div>
          {err&&<div style={{color:RED,fontSize:12,marginTop:10,textAlign:'center'}}>{err}</div>}
          {info&&<div style={{color:'#27ae60',fontSize:12,marginTop:10,textAlign:'center'}}>{info}</div>}
          <button onClick={submit} disabled={loading}
            style={{width:'100%',marginTop:16,padding:'13px',borderRadius:8,background:loading?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:loading?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'...':mode==='login'?'LOGIN':'REGISTRIEREN'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatOverlay({match,myProfileId,token,onClose}){
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(true);
  const endRef=useRef(null);
  const pollRef=useRef(null);
  const other=match.profile_a_id===myProfileId?match.profile_b:match.profile_a;
  const accent=other?.style==='Boxing'?'#c0392b':other?.style==='MMA'?'#2980b9':other?.style==='Muay Thai'?'#d35400':'#27ae60';

  async function markAsRead(){
    try{
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=eq.'+match.id+'&sender_id=neq.'+myProfileId+'&read_at=is.null',{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
        body:JSON.stringify({read_at:new Date().toISOString()})
      });
    }catch{}
  }
  async function loadMsgs(){
    try{const msgs=await dbSelect('messages','match_id=eq.'+match.id+'&order=created_at.asc',token);if(Array.isArray(msgs)){setMessages(msgs);markAsRead();}}catch{}
    setLoading(false);
  }
  useEffect(()=>{loadMsgs();pollRef.current=setInterval(loadMsgs,3000);return()=>clearInterval(pollRef.current);},[match.id]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  async function send(){
    if(!input.trim())return;
    const text=input.trim();setInput('');
    const tmp={id:'tmp_'+Date.now(),match_id:match.id,sender_id:myProfileId,content:text,created_at:new Date().toISOString()};
    setMessages(m=>[...m,tmp]);
    try{await dbInsert('messages',{match_id:match.id,sender_id:myProfileId,content:text},token);}catch{}
  }

  return(
    <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:200,display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'#fff',borderBottom:'1px solid #eee',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',padding:'0 6px 0 0',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
        {other?.avatar_url?<img src={other.avatar_url} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid '+accent+'55'}} alt=''/>
          :<div style={{width:38,height:38,borderRadius:'50%',background:accent+'18',border:'2px solid '+accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
        <div>
          <div className='rj' style={{color:'#1a1a1a',fontSize:17,letterSpacing:1}}>{other?.name}</div>
          <div style={{color:accent,fontSize:10,fontWeight:700}}>{other?.style} · {other?.city}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
        {loading?<div style={{textAlign:'center',color:'#bbb',marginTop:30}}>Laden…</div>
        :messages.length===0?<div style={{textAlign:'center',color:'#bbb',marginTop:40}}><div style={{fontSize:36,marginBottom:10}}>⚔️</div><div style={{fontWeight:700,fontSize:14}}>Match bestätigt!</div><div style={{fontSize:12,marginTop:4}}>Schreib die erste Nachricht</div></div>
        :messages.map(m=>{
          const isMe=m.sender_id===myProfileId;
          return(
            <div key={m.id} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start'}}>
              <div style={{maxWidth:'74%',padding:'9px 13px',borderRadius:isMe?'14px 14px 3px 14px':'14px 14px 14px 3px',background:isMe?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#fff',color:isMe?'#fff':'#1a1a1a',fontSize:14,boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
                {m.content}
                <div style={{color:isMe?'rgba(255,255,255,0.55)':'#ccc',fontSize:9,marginTop:3,textAlign:'right'}}>
                  {new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})} {isMe&&<span style={{marginLeft:3,color:m.read_at?'#4fc3f7':'rgba(255,255,255,0.7)'}}>{m.id.startsWith('tmp_')?'✓':'✓✓'}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>
      <div style={{padding:'10px 12px',background:'#fff',borderTop:'1px solid #eee',display:'flex',gap:8,alignItems:'flex-end'}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder='Nachricht…' rows={1}
          style={{flex:1,background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:20,padding:'10px 14px',fontSize:14,color:'#1a1a1a',maxHeight:80}}/>
        <button onClick={send} disabled={!input.trim()}
          style={{width:42,height:42,borderRadius:'50%',background:input.trim()?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:input.trim()?'#fff':'#aaa',fontSize:17,cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default function App(){
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [screen,setScreen]=useState('setup');
  const [tab,setTab]=useState('swipe');
  const [step,setStep]=useState(1);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const [myProfile,setMyProfile]=useState(null);
  const [profile,setProfile]=useState({name:'',age:'',city:'',gym:'',height:'',weight:'',weightClass:'',style:'',bio:''});
  const [stats,setStats]=useState({wins:0,losses:0,draws:0,ko:0});
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [avatarPreview,setAvatarPreview]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [cards,setCards]=useState([...FIGHTERS]);
  const [drag,setDrag]=useState(false);
  const [offset,setOffset]=useState({x:0,y:0});
  const [start,setStart]=useState({x:0,y:0});
  const [lastAct,setLastAct]=useState(null);
  const [matched,setMatched]=useState(null);
  const [swStats,setSwStats]=useState({ch:0,de:0});
  const [dbMatches,setDbMatches]=useState([]);
  const [activeChat,setActiveChat]=useState(null);
  const [city,setCity]=useState('Berlin');
  const [rankF,setRankF]=useState('All');
  const [trainerF,setTrainerF]=useState('All');
  const [sport,setSport]=useState('Basketball');
  const [joined,setJoined]=useState({});
  const [darkMode,setDarkMode]=useState(false);
  const [filterStyle,setFilterStyle]=useState('Alle');
  const [filterCity,setFilterCity]=useState('');

  useEffect(()=>{
    ['fid','fighter_sess','fighter_v2','fighter_v3'].forEach(k=>localStorage.removeItem(k));
    localStorage.removeItem('fighter_v2');
    localStorage.removeItem('fighter_sess');
    localStorage.removeItem('fighter_v4');
    localStorage.removeItem('fighter_sess');
    localStorage.removeItem('fighter_sess');
    const saved=localStorage.getItem('fighter_v4');
    if(saved){try{const s=JSON.parse(saved);setSession(s);initProfile(s);}catch{setAuthReady(true);}}
    else setAuthReady(true);
  },[]);

  function showMsg(text){setMsg(text);setTimeout(()=>setMsg(''),3000);}

  async function initProfile(s){
    try{
      const data=await dbSelect('profiles','user_id=eq.'+s.userId,s.token);
      if(Array.isArray(data)&&data[0]){
        const p=data[0];
        setMyProfile(p);
        setProfile({name:p.name||'',age:p.age||'',city:p.city||'',gym:p.gym||'',height:p.height||'',weight:p.weight||'',weightClass:p.weight_class||'',style:p.style||'',bio:p.bio||''});
        setStats({wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0});
        if(p.avatar_url){setAvatarUrl(p.avatar_url);setAvatarPreview(p.avatar_url);}
        setScreen('main');
        loadRealFighters(s,p);
        loadMatches(s,p);
      }else setScreen('setup');
    }catch{setScreen('setup');}
    setAuthReady(true);
  }

  async function loadRealFighters(s,myP){
    try{
      const all=await dbSelect('profiles','user_id=neq.'+s.userId,s.token);
      if(!Array.isArray(all)||all.length===0)return;
      const swiped=await dbSelect('swipes','swiper_id=eq.'+myP.id,s.token);
      const swipedIds=Array.isArray(swiped)?swiped.map(x=>x.target_id):[];
      const fresh=all.filter(f=>!swipedIds.includes(f.id));
      if(fresh.length>0)setCards([...fresh,...FIGHTERS]);
    }catch{}
  }

  async function loadMatches(s,myP){
    try{
      const m=await dbSelect('matches','or=(profile_a_id.eq.'+myP.id+',profile_b_id.eq.'+myP.id+')',s.token);
      if(!Array.isArray(m)||m.length===0)return;
      const allProfiles=await dbSelect('profiles','',s.token);
      const profileMap={};
      if(Array.isArray(allProfiles))allProfiles.forEach(p=>{profileMap[p.id]=p;});
      const enriched=m.map(match=>({
        ...match,
        profile_a:profileMap[match.profile_a_id]||null,
        profile_b:profileMap[match.profile_b_id]||null
      }));
      setDbMatches(enriched);
    }catch(e){console.error('loadMatches error',e);}
  }

  function handleSession(s){
    const sessionData={token:s.token,userId:s.userId,refresh_token:s.refresh_token,expires_at:Date.now()+(3600*1000)};
    setSession(sessionData);
    localStorage.setItem('fighter_v4',JSON.stringify(sessionData));
    initProfile(sessionData);
  }

  async function refreshSession(s){
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      const data=await r.json();
      if(data.access_token){
        const newS={...s,token:data.access_token,refresh_token:data.refresh_token};
        setSession(newS);localStorage.setItem('fighter_v4',JSON.stringify(newS));
      }
    }catch{}
  }

  async function handleLogout(){
    if(session)await authSignOut(session.token);
    localStorage.removeItem('fighter_v4');
    setSession(null);setMyProfile(null);setScreen('setup');setAuthReady(true);
  }

  async function saveProfile(){
    if(!session)return;
    setSaving(true);
    const d={user_id:session.userId,name:profile.name,age:parseInt(profile.age)||null,city:profile.city,gym:profile.gym,height:parseInt(profile.height)||null,weight:parseInt(profile.weight)||null,weight_class:profile.weightClass,style:profile.style,bio:profile.bio,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,avatar_url:avatarUrl};
    try{
      if(myProfile){
        const res=await dbUpdate('profiles',d,'user_id=eq.'+session.userId,session.token);
        if(Array.isArray(res)&&res[0])setMyProfile(res[0]);
        showMsg('Gespeichert! ✓');
      }else{
        const res=await dbInsert('profiles',d,session.token);
        if(Array.isArray(res)&&res[0]){setMyProfile(res[0]);showMsg('Profil erstellt! 🥊');setScreen('main');loadRealFighters(session,res[0]);loadMatches(session,res[0]);}
        else showMsg('Fehler: '+(JSON.stringify(res)||'unbekannt'));
      }
    }catch{showMsg('Netzwerkfehler');}
    setSaving(false);
  }

  async function handlePhoto(e){
    const file=e.target.files[0];if(!file||!session)return;
    setUploading(true);setAvatarPreview(URL.createObjectURL(file));
    const path='fighter_'+session.userId+'_'+Date.now()+'.'+file.name.split('.').pop();
    const url=await uploadPhoto(file,path,session.token);
    if(url){setAvatarUrl(url);showMsg('Foto hochgeladen!');}else showMsg('Upload fehlgeschlagen');
    setUploading(false);
  }

  const filteredCards=cards.filter(f=>filterStyle==='Alle'||f.style===filterStyle).filter(f=>!filterCity||(f.city||'').toLowerCase().includes(filterCity.toLowerCase()));
  const top=filteredCards[filteredCards.length-1];
  function dragStart(e){const p=e.touches?e.touches[0]:e;setStart({x:p.clientX,y:p.clientY});setDrag(true);}
  function dragMove(e){if(!drag)return;const p=e.touches?e.touches[0]:e;setOffset({x:p.clientX-start.x,y:p.clientY-start.y});}
  function dragEnd(){if(!drag)return;setDrag(false);if(offset.x>SW)doSwipe('ch');else if(offset.x<-SW)doSwipe('de');else setOffset({x:0,y:0});}

  async function doSwipe(dir){
    if(!top)return;
    setLastAct(dir);setOffset({x:0,y:0});
    if(dir==='ch'){
      setSwStats(s=>({...s,ch:s.ch+1}));
      if(session&&myProfile&&!String(top.id).startsWith('demo_')){
        try{
          await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'like'},session.token);
          const mutual=await dbSelect('swipes','swiper_id=eq.'+top.id+'&target_id=eq.'+myProfile.id+'&direction=eq.like',session.token);
          if(Array.isArray(mutual)&&mutual.length>0){await dbInsert('matches',{profile_a_id:myProfile.id,profile_b_id:top.id},session.token);setTimeout(()=>{setMatched(top);loadMatches(session,myProfile);},300);}
          else if(Math.random()<0.2)setTimeout(()=>setMatched(top),300);
        }catch{}
      }else{if(Math.random()<0.45)setTimeout(()=>setMatched(top),300);}
    }else{
      setSwStats(s=>({...s,de:s.de+1}));
      if(session&&myProfile&&!String(top.id).startsWith('demo_')){try{await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'pass'},session.token);}catch{}}
    }
    setTimeout(()=>{setCards(prev=>prev.slice(0,-1));setLastAct(null);},260);
  }

  const rot=(offset.x/14).toFixed(1);
  const fop=Math.min(offset.x/SW,1);
  const pop=Math.min(-offset.x/SW,1);
  const cStyle=drag?{transform:`translateX(${offset.x}px) translateY(${offset.y*0.25}px) rotate(${rot}deg)`,transition:'none',cursor:'grabbing'}
    :lastAct==='ch'?{transform:'translateX(140%) rotate(18deg)',transition:'transform 0.26s ease'}
    :lastAct==='de'?{transform:'translateX(-140%) rotate(-18deg)',transition:'transform 0.26s ease'}
    :{transform:'translateX(0) rotate(0deg)',transition:'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)'};

  function canGo(){
    if(step===1)return profile.name&&profile.age&&profile.city;
    if(step===2)return profile.gym&&profile.style;
    if(step===3)return profile.height&&profile.weight&&profile.weightClass;
    return true;
  }
  const tf=stats.wins+stats.losses+stats.draws;
  const wr=tf>0?Math.round((stats.wins/tf)*100):0;
  const kr=stats.wins>0?Math.round((stats.ko/stats.wins)*100):0;
  const allF=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weight_class:profile.weightClass,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'🥊',accent:RED,isMe:true,avatar_url:avatarUrl}].concat(FIGHTERS):FIGHTERS;
  const ranked=[...allF].filter(f=>rankF==='All'||f.style===rankF).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  const trStyles=['All','Boxing','MMA','Muay Thai','BJJ'];
  const filteredT=TRAINERS.filter(t=>trainerF==='All'||t.style.includes(trainerF)).sort((a,b)=>b.rating-a.rating);

  if(!authReady)return(<div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{css}</style><div className='rj' style={{fontSize:32,color:'#1a1a1a',letterSpacing:4}}>FIGHTER</div></div>);
  if(!session)return <AuthScreen onSession={handleSession}/>;
  if(activeChat&&myProfile)return(<><style>{css}</style><ChatOverlay match={activeChat} myProfileId={myProfile.id} token={session.token} onClose={()=>setActiveChat(null)}/></>);

  if(screen==='setup')return(
    <div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 0 40px'}}>
      <style>{css}</style>
      <div style={{width:'100%',maxWidth:420,padding:'32px 24px 0',textAlign:'center'}}>
        <div className='rj fadeUp' style={{fontSize:64,color:'#1a1a1a',letterSpacing:6,lineHeight:1}}>FIGHTER</div>
        <div style={{color:RED,fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>FINDE DEINEN GEGNER</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:22}}>
        {[1,2,3].map(s=><div key={s} style={{width:s===step?32:10,height:8,borderRadius:4,background:s<=step?RED:'#ddd',transition:'all 0.3s'}}/>)}
      </div>
      <div style={{width:'100%',maxWidth:380,padding:'22px 20px 0'}}>
        {step===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:8}}>
              <label style={{cursor:'pointer',textAlign:'center'}}>
                <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                <div style={{width:88,height:88,borderRadius:'50%',background:'#ececec',border:'2px dashed '+(avatarPreview?RED:'#ccc'),display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',margin:'0 auto'}}>
                  {uploading?<div style={{fontSize:24}} className='spin'>⏳</div>
                    :avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='avatar'/>
                    :<div style={{textAlign:'center'}}><div style={{fontSize:28}}>📸</div><div style={{color:'#aaa',fontSize:10,marginTop:4}}>Foto</div></div>}
                </div>
                <div style={{color:RED,fontSize:11,marginTop:6,fontWeight:600}}>Profilbild hochladen</div>
              </label>
            </div>
            <Lbl>Dein Name</Lbl><Inp placeholder='z.B. Max Mueller' value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
            <Lbl>Alter</Lbl><Inp placeholder='z.B. 25' type='number' value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
            <Lbl>Standort</Lbl><Inp placeholder='z.B. Berlin' value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))}/>
          </div>
        )}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <Lbl>Dein Gym</Lbl><Inp placeholder='z.B. Tiger Gym Berlin' value={profile.gym} onChange={v=>setProfile(p=>({...p,gym:v}))}/>
            <Lbl>Ueber dich</Lbl><Inp placeholder='z.B. 5 Jahre Boxing Erfahrung…' value={profile.bio} onChange={v=>setProfile(p=>({...p,bio:v}))}/>
            <Lbl>Kampfstil</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {STYLES.map(s=>(<button key={s} onClick={()=>setProfile(p=>({...p,style:s}))} style={{padding:'7px 13px',borderRadius:4,border:'1px solid '+(profile.style===s?RED:'#ddd'),background:profile.style===s?'#fdf0ef':'#fff',color:profile.style===s?RED:'#666',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>{s}</button>))}
            </div>
          </div>
        )}
        {step===3&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{display:'flex',gap:11}}>
              <div style={{flex:1}}><Lbl>Groesse (cm)</Lbl><Inp placeholder='180' type='number' value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
              <div style={{flex:1}}><Lbl>Kampfgewicht (kg)</Lbl><Inp placeholder='77' type='number' value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
            </div>
            <Lbl>Gewichtsklasse</Lbl>
            <select value={profile.weightClass} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:'#fff',border:'1px solid #ddd',borderRadius:8,padding:'12px 13px',color:profile.weightClass?'#1a1a1a':'#aaa',fontSize:14,width:'100%'}}>
              <option value=''>Gewichtsklasse waehlen</option>
              {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
            <Lbl>Kampfrekord (optional)</Lbl>
            <div style={{display:'flex',gap:7}}>
              {[['wins','SIEGE','#27ae60'],['losses','NIEDER',RED],['draws','UNENTSCH','#d4a017'],['ko','KOs',RED]].map(([key,label,color])=>(
                <div key={key} style={{flex:1,textAlign:'center'}}>
                  <div style={{color:color,fontSize:9,letterSpacing:1,marginBottom:3}}>{label}</div>
                  <input type='number' min='0' value={stats[key]} onChange={e=>setStats(s=>({...s,[key]:parseInt(e.target.value)||0}))} style={{width:'100%',background:'#fff',border:'1px solid #ddd',borderRadius:6,padding:'9px 3px',color:'#1a1a1a',fontSize:20,textAlign:'center',fontFamily:'Rajdhani,sans-serif'}}/>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:9,marginTop:22}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:'13px',borderRadius:8,background:'#fff',border:'1px solid #ddd',color:'#666',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>Zurueck</button>}
          <button onClick={async()=>{if(!canGo())return;if(step<3)setStep(s=>s+1);else await saveProfile();}} style={{flex:2,padding:'13px',borderRadius:8,background:canGo()?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:canGo()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:canGo()?'pointer':'not-allowed',transition:'all 0.2s'}}>
            {saving?'Speichern…':step===3?'Lets Fight':'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );

  const tabs=[['swipe','🥊','FIGHT'],['chat','💬','CHAT'],['stats','📊','PROFIL'],['gyms','🏋️','GYMS'],['ranking','🏆','RANG'],['trainer','🎓','TRAINER'],['sports','🎯','SPORTS']];

  return(
    <div style={{minHeight:'100vh',background:darkMode?'#1a1a1a':'#f5f5f7',fontFamily:'DM Sans,sans-serif',display:'flex',flexDirection:'column'}} onMouseMove={dragMove} onMouseUp={dragEnd} onTouchMove={dragMove} onTouchEnd={dragEnd}>
      <style>{css}</style>
      {msg&&<div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:'#fff',border:'1px solid '+RED,borderRadius:20,padding:'8px 20px',color:'#1a1a1a',fontSize:13,zIndex:200,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.1)',whiteSpace:'nowrap'}}>{msg}</div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px 8px',flexShrink:0,borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),background:darkMode?'#1a1a1a':'#fff'}}>
        <div style={{color:'#999',fontSize:11,fontWeight:600}}>Abgelehnt: {swStats.de}</div>
        <div className='rj' style={{fontSize:28,color:darkMode?'#ff4500':'#1a1a1a',letterSpacing:5}}>FIGHTER</div>
        <button onClick={()=>setDarkMode(d=>!d)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,marginRight:8}}>{darkMode?'☀️':'🌙'}</button><button onClick={()=>setDarkMode(d=>!d)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,marginRight:8}}>{darkMode?'☀️':'🌙'}</button><button onClick={()=>setDarkMode(d=>!d)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,marginRight:4}}>{darkMode?'☀️':'🌙'}</button><button onClick={handleLogout} style={{color:darkMode?'#666':'#aaa',fontSize:11,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Logout</button>
      </div>

      <div style={{flex:1,overflowY:'auto',paddingBottom:65}}>

        {tab==='swipe'&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8}}>
            <div style={{width:'calc(100% - 24px)',maxWidth:380,margin:'0 0 8px',background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {avatarPreview?<img src={avatarPreview} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+RED}} alt='me'/>
                :<div style={{fontSize:20,width:36,height:36,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center'}}>🥊</div>}
              <div style={{flex:1}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{profile.name}, {profile.age} - {profile.city}</div>
                <div style={{color:RED,fontSize:11,marginTop:1}}>{profile.style} - {profile.weightClass?profile.weightClass.split(' (')[0]:''}</div>
              </div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'right'}}>{profile.height}cm<br/>{profile.weight}kg</div>
            </div>
            <div style={{position:'relative',width:330,height:430,flexShrink:0}}>
              {cards.length===0?(
                <div style={{width:'100%',height:'100%',borderRadius:16,background:'#fff',border:'2px dashed #ddd',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:11}}>
                  <div style={{fontSize:46}}>🏆</div>
                  <div className='rj' style={{color:'#1a1a1a',fontSize:24,letterSpacing:2}}>ALLE GESEHEN</div>
                  <button onClick={()=>{setCards([...FIGHTERS]);setSwStats({ch:0,de:0});}} style={{marginTop:6,padding:'9px 22px',borderRadius:6,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>Nochmal</button>
                </div>
              ):cards.map((f,idx)=>{
                const isTop=idx===cards.length-1;const isSec=idx===cards.length-2;const fA=f.accent||'#c0392b';
                return(
                  <div key={f.id} onMouseDown={isTop?dragStart:undefined} onTouchStart={isTop?dragStart:undefined}
                    style={{position:'absolute',inset:0,borderRadius:16,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#333':fA+'33'),boxShadow:isTop?'0 8px 32px rgba(0,0,0,0.12)':'none',cursor:isTop?'grab':'default',zIndex:isTop?10:isSec?5:1,transform:isTop?cStyle.transform:isSec?'scale(0.96) translateY(10px)':'scale(0.92) translateY(20px)',transition:isTop?cStyle.transition:'none',overflow:'hidden',display:'flex',flexDirection:'column',userSelect:'none'}}>
                    <div style={{height:3,background:`linear-gradient(90deg,${fA},transparent)`}}/>
                    {isTop&&(<>
                      <div style={{position:'absolute',top:18,left:16,border:'3px solid #27ae60',borderRadius:5,padding:'2px 8px',color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,letterSpacing:3,transform:'rotate(-18deg)',opacity:fop,transition:drag?'none':'opacity 0.12s'}}>FIGHT</div>
                      <div style={{position:'absolute',top:18,right:16,border:'3px solid '+RED,borderRadius:5,padding:'2px 8px',color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,letterSpacing:3,transform:'rotate(18deg)',opacity:pop,transition:drag?'none':'opacity 0.12s'}}>PASS</div>
                    </>)}
                    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:`radial-gradient(circle at 50% 50%,${fA}0a,transparent 65%)`}}>
                      {f.avatar_url?<img src={f.avatar_url} style={{width:180,height:180,borderRadius:16,objectFit:'cover',border:'3px solid '+fA+'44',marginBottom:8}} alt={f.name}/>:<div style={{fontSize:72}}>{f.emoji||'🥊'}</div>}
                      <div style={{marginTop:9,display:'flex',gap:11}}>
                        {[{v:f.wins||0,l:'SIEGE',c:'#27ae60'},{v:f.losses||0,l:'NIEDER',c:RED},{v:f.draws||0,l:'UNENTSCH',c:'#d4a017'}].map(({v,l,c})=>(
                          <div key={l} style={{textAlign:'center'}}><div className='rj' style={{color:c,fontSize:20}}>{v}</div><div style={{color:'#bbb',fontSize:8,letterSpacing:1}}>{l}</div></div>
                        ))}
                      </div>
                    </div>
                    <div style={{padding:'10px 14px 14px',background:darkMode?'#222':'#fafafa',borderTop:'1px solid '+(darkMode?'#333':'#f0f0f0')}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <div>
                          <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:1.5,lineHeight:1}}>{f.name}</div>
                          <div style={{color:fA,fontSize:11,fontWeight:700,marginTop:1}}>{(f.style||'').toUpperCase()}</div>
                        </div>
                        <div style={{textAlign:'right'}}><div style={{color:'#aaa',fontSize:11}}>{f.height} cm</div><div style={{color:'#aaa',fontSize:11}}>{f.weight} kg</div></div>
                      </div>
                      <div style={{marginTop:6,display:'flex',gap:4,flexWrap:'wrap'}}>
                        <Tag text={'📍 '+(f.city||'')}/><Tag text={'🏋️ '+(f.gym||'')}/><Tag text={f.weight_class||f.weightClass||''} accent={fA}/>
                      </div>
                      {f.bio&&<div style={{color:'#888',fontSize:11,marginTop:5,fontStyle:'italic'}}>'{f.bio}'</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {cards.length>0&&(
              <div style={{display:'flex',gap:16,alignItems:'center',marginTop:10}}>
                <Btn onClick={()=>doSwipe('de')} color={RED} icon='✕' size={54}/>
                <Btn onClick={()=>doSwipe('ch')} color='#27ae60' icon='⚔️' size={64} primary label='FIGHT'/>
                <Btn onClick={()=>doSwipe('de')} color='#d4a017' icon='⭐' size={54}/>
              </div>
            )}
            {dbMatches.length>0&&(
              <div style={{marginTop:11,width:'calc(100% - 24px)',maxWidth:380}}>
                <div style={{color:'#bbb',fontSize:9,letterSpacing:2,marginBottom:6,fontWeight:700}}>FIGHT REQUESTS – tippe für Chat</div>
                <div style={{display:'flex',gap:7,overflowX:'auto'}}>
                  {dbMatches.map(m=>{
                    const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                    if(!other)return null;
                    const ac=other.accent||'#c0392b';
                    return(
                      <div key={m.id} onClick={()=>setActiveChat(m)} style={{textAlign:'center',flexShrink:0,cursor:'pointer'}}>
                        {other.avatar_url?<img src={other.avatar_url} style={{width:42,height:42,borderRadius:6,border:'2px solid '+ac,objectFit:'cover'}} alt={other.name}/>
                          :<div style={{width:42,height:42,borderRadius:6,background:'#fff',border:'2px solid '+ac,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
                        <div style={{color:'#999',fontSize:9,marginTop:2}}>{other.name?.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}


        {tab==='chat'&&(
          <div style={{padding:'14px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:14}}>NACHRICHTEN</div>
            {dbMatches.length===0?(
              <div style={{textAlign:'center',padding:'40px 20px',color:'#bbb'}}>
                <div style={{fontSize:48,marginBottom:12}}>💬</div>
                <div style={{fontWeight:700,fontSize:15}}>Noch keine Matches</div>
                <div style={{fontSize:12,marginTop:6}}>Swipe rechts um Fighter zu matchen!</div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {dbMatches.map(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return null;
                  const ac=other.style==='Boxing'?'#c0392b':other.style==='MMA'?'#2980b9':'#d35400';
                  return(
                    <div key={m.id} onClick={()=>setActiveChat(m)} style={{background:'#fff',borderRadius:13,border:'1px solid '+ac+'33',overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.06)',cursor:'pointer'}}>
                      <div style={{height:3,background:'linear-gradient(90deg,'+ac+',transparent)'}}/>
                      <div style={{padding:'13px',display:'flex',alignItems:'center',gap:12}}>
                        {other.avatar_url?<img src={other.avatar_url} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',border:'2px solid '+ac+'44'}} alt={other.name}/>
                          :<div style={{width:52,height:52,borderRadius:'50%',background:ac+'18',border:'2px solid '+ac+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🥊</div>}
                        <div style={{flex:1}}>
                          <div className='rj' style={{color:'#1a1a1a',fontSize:18,letterSpacing:1}}>{other.name}</div>
                          <div style={{color:ac,fontSize:11,fontWeight:700}}>{other.style} · {other.city}</div>
                        </div>
                        <div style={{padding:'9px 16px',borderRadius:8,background:'linear-gradient(135deg,#c0392b,#e74c3c)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14}}>CHAT →</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab==='stats'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div style={{background:'#fff',borderRadius:14,padding:'16px',border:'1px solid #eee',marginBottom:11,textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{position:'relative',display:'inline-block',marginBottom:10}}>
                <label style={{cursor:'pointer'}}>
                  <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                  <div style={{width:160,height:160,borderRadius:16,background:'#f0f0f0',border:'3px solid '+(avatarPreview?RED:'#ddd'),overflow:'hidden',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {uploading?<div style={{fontSize:24}} className='spin'>⏳</div>:avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='avatar'/>:<div style={{fontSize:32}}>👤</div>}
                  </div>
                  <div style={{position:'absolute',bottom:0,right:0,background:RED,borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📷</div>
                </label>
              </div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>{profile.name}</div>
              <div style={{color:RED,fontSize:13,fontWeight:600,marginTop:2}}>{profile.style} - {profile.weightClass?profile.weightClass.split(' (')[0]:''}</div>
              <div style={{color:darkMode?'#666':'#999',fontSize:11,marginTop:3}}>📍 {profile.city} - 🏋️ {profile.gym}</div>
              {profile.bio&&<div style={{color:'#aaa',fontSize:12,marginTop:6,fontStyle:'italic'}}>'{profile.bio}'</div>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:9}}>
              {[['SIEGE',stats.wins,'#27ae60'],['NIEDERLAGEN',stats.losses,RED],['UNENTSCHIEDEN',stats.draws,'#d4a017']].map(([label,val,color])=>(
                <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:11,padding:'13px 5px',textAlign:'center',border:'1px solid '+color+'33',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div className='rj' style={{color:color,fontSize:36,lineHeight:1}}>{val}</div>
                  <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:9}}>
              {[['KO / TKO',stats.ko,RED,'KO-Rate: '+kr+'%',kr],['SIEGRATE',wr+'%','#27ae60',tf+' Kaempfe',wr]].map(([label,val,color,sub,pct])=>(
                <div key={label} style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{color:'#bbb',fontSize:9,letterSpacing:2}}>{label}</div>
                  <div className='rj' style={{color:color,fontSize:30,marginTop:3}}>{val}</div>
                  <div style={{color:'#ccc',fontSize:10,marginTop:2}}>{sub}</div>
                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:2}}/></div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:9}}>
              <div style={{color:'#ccc',fontSize:9,letterSpacing:2,marginBottom:11}}>REKORD BEARBEITEN</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5}}>
                {[['wins','SIEGE','#27ae60'],['losses','NIEDER',RED],['draws','UNENTSCH','#d4a017'],['ko','KOs',RED]].map(([key,label,color])=>(
                  <div key={key} style={{textAlign:'center'}}>
                    <div style={{color:'#ccc',fontSize:8,marginBottom:3}}>{label}</div>
                    <button onClick={()=>setStats(s=>({...s,[key]:s[key]+1}))} style={{width:'100%',background:'#f5f5f5',border:'1px solid '+color+'22',borderRadius:4,color:color,fontSize:13,cursor:'pointer',padding:'3px 0',marginBottom:3}}>+</button>
                    <div className='rj' style={{color:color,fontSize:20}}>{stats[key]}</div>
                    <button onClick={()=>setStats(s=>({...s,[key]:Math.max(0,s[key]-1)}))} style={{width:'100%',background:'#f5f5f5',border:'1px solid #eee',borderRadius:4,color:'#ccc',fontSize:13,cursor:'pointer',padding:'3px 0',marginTop:3}}>−</button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} style={{width:'100%',padding:'14px',borderRadius:10,background:saving?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:saving?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:saving?'not-allowed':'pointer',transition:'all 0.2s'}}>
              {saving?'Speichern...':'Profil speichern'}
            </button>
            {dbMatches.length>0&&(
              <div style={{marginTop:14}}>
                <div style={{color:'#bbb',fontSize:9,letterSpacing:2,marginBottom:8,fontWeight:700}}>MEINE MATCHES</div>
                {dbMatches.map(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return null;
                  return(<div key={m.id} onClick={()=>setActiveChat(m)} style={{background:'#fff',borderRadius:10,padding:'11px 13px',border:'1px solid #eee',marginBottom:7,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                    {other.avatar_url?<img src={other.avatar_url} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}} alt=''/>:<div style={{width:38,height:38,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
                    <div style={{flex:1}}><div style={{color:'#1a1a1a',fontWeight:700,fontSize:13}}>{other.name}</div><div style={{color:'#aaa',fontSize:11}}>{other.style} · {other.city}</div></div>
                    <div style={{color:RED,fontSize:11,fontWeight:700}}>💬 Chat →</div>
                  </div>);
                })}
              </div>
            )}
          </div>
        )}

        {tab==='gyms'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:11}}>GYMS FINDEN</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {Object.keys(GYMS).map(c=>(<button key={c} onClick={()=>setCity(c)} style={{flexShrink:0,padding:'6px 13px',borderRadius:20,background:city===c?RED:'#fff',border:'1px solid '+(city===c?RED:'#e0e0e0'),color:city===c?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{c}</button>))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {GYMS[city].map((gym,i)=>(
                <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'13px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
                    <div style={{width:46,height:46,borderRadius:9,background:'#f0f0f0',border:'1px solid #e0e0e0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{gym.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{gym.name}</div>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,marginTop:1}}>📍 {gym.address}</div>
                      <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>{gym.styles.map(s=><Tag key={s} text={s} accent={RED}/>)}</div>
                    </div>
                  </div>
                  <div style={{marginTop:9,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{color:'#888',fontSize:12}}>👥 {gym.members} Mitglieder</div>
                    <div style={{display:'flex',alignItems:'center',gap:3}}><span style={{color:'#d4a017'}}>★</span><span style={{color:'#1a1a1a',fontWeight:700,fontSize:14}}>{gym.rating}</span></div>
                  </div>
                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:((gym.rating-4)/1*100)+'%',background:`linear-gradient(90deg,${RED},#e67e22)`,borderRadius:2}}/></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='ranking'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:11}}>WELTRANGLISTE</div>
            <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {['All',...STYLES].map(s=>(<button key={s} onClick={()=>setRankF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:rankF===s?RED:'#fff',border:'1px solid '+(rankF===s?RED:'#e0e0e0'),color:rankF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
            </div>
            {ranked.length>=3&&(
              <div style={{display:'flex',alignItems:'flex-end',gap:5,marginBottom:13,justifyContent:'center'}}>
                {[ranked[1],ranked[0],ranked[2]].map((f,i)=>{
                  const heights=[96,118,80];const places=[2,1,3];const colors=['#95a5a6','#d4a017','#cd7f32'];const isFirst=i===1;
                  return(<div key={f.id} style={{flex:1,maxWidth:105,display:'flex',flexDirection:'column',alignItems:'center'}}>
                    {isFirst&&<div style={{fontSize:26,marginBottom:2}}>🏆</div>}
                    {f.avatar_url?<img src={f.avatar_url} style={{width:isFirst?44:36,height:isFirst?44:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+colors[i],marginBottom:3}} alt={f.name}/>:<div style={{fontSize:isFirst?28:22,marginBottom:3}}>{f.emoji||'🥊'}</div>}
                    <div style={{color:f.isMe?RED:'#1a1a1a',fontSize:11,fontWeight:700,textAlign:'center'}}>{f.name?.split(' ')[0]}</div>
                    <div style={{color:'#aaa',fontSize:9}}>{f.wins}W-{f.losses}L</div>
                    <div style={{width:'100%',height:heights[i],background:colors[i]+'18',border:'1px solid '+colors[i]+'44',borderRadius:'5px 5px 0 0',marginTop:5,display:'flex',alignItems:'center',justifyContent:'center'}}><div className='rj' style={{color:colors[i],fontSize:28}}>#{places[i]}</div></div>
                  </div>);
                })}
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {ranked.map((f,i)=>{
                const score=f.wins*3-f.losses*2+f.draws;const rc=['#d4a017','#95a5a6','#cd7f32'];
                return(<div key={f.id} style={{background:f.isMe?(darkMode?'#2a1510':'#fdf0ef'):(darkMode?'#1a1a1a':'#fff'),borderRadius:9,padding:'10px 12px',border:'1px solid '+(f.isMe?RED+'33':i<3?rc[i]+'33':'#eee'),display:'flex',alignItems:'center',gap:9,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                  <div className='rj' style={{color:i<3?rc[i]:'#bbb',fontSize:18,width:24,textAlign:'center'}}>#{i+1}</div>
                  {f.avatar_url?<img src={f.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}} alt={f.name}/>:<div style={{fontSize:22}}>{f.emoji||'🥊'}</div>}
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{color:f.isMe?RED:'#1a1a1a',fontWeight:700,fontSize:13}}>{f.name}</div>
                      {f.isMe&&<div style={{background:'#fdf0ef',border:'1px solid '+RED+'44',borderRadius:3,padding:'1px 4px',color:RED,fontSize:8,fontWeight:700}}>ICH</div>}
                    </div>
                    <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginTop:1}}>{f.style} - {f.city}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{display:'flex',gap:4,fontSize:11,justifyContent:'flex-end',fontWeight:700}}><span style={{color:'#27ae60'}}>{f.wins}W</span><span style={{color:RED}}>{f.losses}L</span><span style={{color:'#d4a017'}}>{f.draws}D</span></div>
                    <div style={{color:RED,fontSize:10,marginTop:1}}>{score} Pkt</div>
                  </div>
                </div>);
              })}
            </div>
            <div style={{color:'#ddd',fontSize:9,textAlign:'center',marginTop:11,letterSpacing:1}}>SIEG +3 - UNENTSCH +1 - NIEDERLAGE -2</div>
          </div>
        )}

        {tab==='trainer'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>TOP TRAINER</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>Die besten Coaches der Welt</div>
            <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {trStyles.map(s=>(<button key={s} onClick={()=>setTrainerF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:trainerF===s?'#d4a017':'#fff',border:'1px solid '+(trainerF===s?'#d4a017':'#e0e0e0'),color:trainerF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {filteredT.map((t,i)=>(
                <div key={t.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,border:'1px solid '+t.accent+(darkMode?'55':'33'),overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                  <div style={{height:3,background:`linear-gradient(90deg,${t.accent},transparent)`}}/>
                  <div style={{padding:'14px'}}>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:56,height:56,borderRadius:12,background:t.accent+'18',border:'2px solid '+t.accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{t.emoji}</div>
                        <div style={{position:'absolute',bottom:-5,right:-5,background:i===0?'#d4a017':i===1?'#95a5a6':i===2?'#cd7f32':'#eee',borderRadius:10,padding:'1px 5px'}}><div className='rj' style={{color:i<3?'#fff':'#aaa',fontSize:10}}>#{i+1}</div></div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{t.name}</div><div style={{color:t.accent,fontSize:11,fontWeight:700,marginTop:1}}>{t.style.toUpperCase()}</div></div>
                          <div style={{textAlign:'right'}}><div style={{display:'flex',alignItems:'center',gap:2}}><span style={{color:'#d4a017'}}>★</span><span style={{color:'#1a1a1a',fontWeight:700,fontSize:14}}>{t.rating}</span></div><div style={{color:'#aaa',fontSize:10}}>{t.exp} Jahre</div></div>
                        </div>
                        <div style={{color:'#888',fontSize:11,marginTop:2}}>{t.country} - {t.gym}</div>
                      </div>
                    </div>
                    <div style={{marginTop:9,color:darkMode?'#aaa':'#666',fontSize:12,borderTop:'1px solid #eee',paddingTop:8}}>{t.bio}</div>
                    <div style={{marginTop:8,background:'#f8f8f8',borderRadius:7,padding:'7px 10px'}}><div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:3}}>BEKANNTE SCHUELER</div><div style={{color:'#666',fontSize:12,fontWeight:600}}>{t.pupils}</div></div>
                    <div style={{marginTop:8,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:(t.rating/10*100)+'%',background:`linear-gradient(90deg,${t.accent},${t.accent}66)`,borderRadius:2}}/></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='sports'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>SPORTARTEN</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>Finde Events in deiner Stadt</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
              {Object.keys(SPORTS).map(s=>{const{color,emoji}=SPORTS[s];const sel=sport===s;return(<button key={s} onClick={()=>setSport(s)} style={{padding:'12px 10px',borderRadius:11,background:sel?color+'25':(darkMode?'#1a1a1a':'#fff'),border:'1px solid '+(sel?color:(darkMode?'#2a2a2a':'#eee')),cursor:'pointer',transition:'all 0.2s',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}><div style={{fontSize:22,marginBottom:4}}>{emoji}</div><div style={{color:sel?color:'#555',fontWeight:700,fontSize:13}}>{s}</div><div style={{color:darkMode?'#666':'#bbb',fontSize:10,marginTop:2}}>{SPORTS[s].games.length} Events</div></button>);})}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {SPORTS[sport].games.map(game=>{
                const{color}=SPORTS[sport];const pct=(game.cur/game.max)*100;const full=game.cur>=game.max;const key=sport+game.id;const isJoined=joined[key];
                return(<div key={game.id} style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
                  <div style={{padding:'13px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{game.title}</div><div style={{color:'#888',fontSize:11}}>📍 {game.location}</div></div>
                      <div style={{background:color+'18',border:'1px solid '+color+'33',borderRadius:6,padding:'3px 8px',height:'fit-content'}}><div style={{color:color,fontSize:11,fontWeight:700}}>{game.level}</div></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{display:'flex',gap:10}}><div style={{color:'#888',fontSize:11}}>🕐 {game.time}</div><div style={{color:'#888',fontSize:11}}>👤 {game.host}</div></div>
                      <div style={{color:full?RED:color,fontSize:11,fontWeight:700}}>{game.cur}/{game.max}</div>
                    </div>
                    <div style={{height:4,background:'#f0f0f0',borderRadius:3,marginBottom:9}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:3}}/></div>
                    <button onClick={()=>setJoined(j=>({...j,[key]:!j[key]}))} style={{width:'100%',padding:'10px',borderRadius:8,background:isJoined?'#f0faf0':full?'#f5f5f5':`linear-gradient(135deg,${color}cc,${color})`,border:isJoined?'1px solid #27ae60':'none',color:isJoined?'#27ae60':full?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1.5,cursor:'pointer',transition:'all 0.2s'}}>
                      {isJoined?'Beigetreten':full?'Ausgebucht':'Mitmachen'}
                    </button>
                  </div>
                </div>);
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:darkMode?'#1a1a1a':'#fff',borderTop:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),display:'flex',height:60,zIndex:50,boxShadow:'0 -2px 12px rgba(0,0,0,0.06)'}}>
        {tabs.map(([id,icon,label])=>(<button key={id} onClick={()=>setTab(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',gap:2,borderTop:tab===id?'2px solid '+RED:'2px solid transparent',transition:'all 0.2s'}}><div style={{fontSize:15,opacity:tab===id?1:0.4}}>{icon}</div><div style={{color:tab===id?RED:(darkMode?'#666':'#aaa'),fontSize:9,fontFamily:'DM Sans,sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div></button>))}
      </div>

      {matched&&(
        <div onClick={()=>setMatched(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:100,gap:12}}>
          <div className='rj' style={{color:RED,fontSize:12,letterSpacing:8}}>FIGHT ACCEPTED</div>
          <div className='rj' style={{fontSize:46,color:'#fff',letterSpacing:4,textAlign:'center',lineHeight:1,animation:'pulse 1.2s infinite'}}>IT'S ON!</div>
          {matched.avatar_url?<img src={matched.avatar_url} style={{width:160,height:160,borderRadius:16,objectFit:'cover',border:'3px solid '+RED}} alt=''/>:<div style={{fontSize:52}}>{matched.emoji||'🥊'}</div>}
          <div className='rj' style={{color:'#fff',fontSize:24,letterSpacing:2}}>{matched.name}</div>
          <div style={{color:matched.accent||RED,fontSize:12,fontWeight:700}}>{matched.style} - {matched.weight_class||matched.weightClass}</div>
          <div style={{color:'#aaa',fontSize:11}}>{matched.gym}, {matched.city}</div>
          <button onClick={()=>{setMatched(null);setTab('chat');}} style={{marginTop:5,padding:'11px 26px',borderRadius:6,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>💬 Chat öffnen</button>
          <div style={{color:'#555',fontSize:10}}>Tippen zum Schliessen</div>
        </div>
      )}
    </div>
  );
}

function Lbl({children}){return <div style={{color:'#555',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase'}}>{children}</div>;}
function Inp({placeholder,value,onChange,type='text',onKeyDown}){
  return(<input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown}
    style={{width:'100%',background:'#fff',border:'1px solid #e0e0e0',borderRadius:8,padding:'12px 13px',color:'#1a1a1a',fontSize:15,fontFamily:'DM Sans,sans-serif',transition:'border-color 0.2s'}}
    onFocus={e=>e.target.style.borderColor=RED} onBlur={e=>e.target.style.borderColor='#e0e0e0'}/>);
}
function Tag({text,accent}){return <div style={{padding:'2px 7px',borderRadius:3,background:accent?accent+'12':'#f5f5f5',color:accent||'#888',fontSize:10,fontWeight:600,border:accent?'1px solid '+accent+'22':'none'}}>{text}</div>;}
function Btn({onClick,color,icon,size,primary,label}){
  const [h,setH]=useState(false);
  return(<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{width:size,height:size,borderRadius:primary?11:'50%',background:primary?`linear-gradient(135deg,${color}cc,${color})`:color+'12',border:primary?'none':'2px solid '+color+'33',fontSize:primary?21:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:1,transform:h?'scale(1.1)':'scale(1)',transition:'all 0.2s',boxShadow:primary?`0 5px 16px ${color}44`:'none'}}>
    {icon}{primary&&<div style={{color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:9,letterSpacing:2}}>{label}</div>}
  </button>);
}
