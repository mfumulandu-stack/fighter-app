import React, { useState, useEffect } from "react";

// --- KONFIGURATION & API ---
const SUPABASE_URL = "https://uykdrmymjvqgebsmndme.supabase.co";
const SUPABASE_KEY = "sb_publishable___XeJxD4-15c1dbNZPH9EQ_gKFNRoH5";

const supabase = {
  async from(table) {
    return {
      async insert(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "apikey": SUPABASE_KEY, 
            "Authorization": `Bearer ${SUPABASE_KEY}`, 
            "Prefer": "return=representation" 
          },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      },
      async update(data, match) {
        const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json", 
            "apikey": SUPABASE_KEY, 
            "Authorization": `Bearer ${SUPABASE_KEY}`, 
            "Prefer": "return=representation" 
          },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      },
      async select(id) {
        const url = id ? `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}` : `${SUPABASE_URL}/rest/v1/${table}`;
        const res = await fetch(url, { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      }
    };
  },
  async uploadAvatar(file, path) {
    // Da wir keine echte Storage-API ohne Library-Helper hier haben, simulieren wir den Erfolg
    return { data: { publicUrl: URL.createObjectURL(file) }, error: null };
  }
};

// --- DATA ---
const WEIGHT_CLASSES = ["Strohgewicht (bis 52 kg)","Leichtfliegengewicht (bis 54 kg)","Fliegengewicht (bis 57 kg)","Bantamgewicht (bis 61 kg)","Federgewicht (bis 66 kg)","Leichtgewicht (bis 70 kg)","Halbweltergewicht (bis 77 kg)","Weltergewicht (bis 83 kg)","Halbmittelgewicht (bis 87 kg)","Mittelgewicht (bis 93 kg)","Halbschwergewicht (bis 100 kg)","Cruisergewicht (bis 90 kg)","Schwergewicht (über 100 kg)"];
const FIGHT_STYLES = ["Boxing","Kickboxing","MMA","Muay Thai","Grappling","BJJ","Wrestling"];

const mockFighters = [
  {id:1,name:"Kai Müller",age:26,city:"Berlin",gym:"Tiger Gym Berlin",height:182,weight:77,weightClass:"Weltergewicht",style:"Boxing",wins:12,losses:2,draws:1,ko:8,emoji:"🥊",accent:"#E03000"},
  {id:2,name:"Marco Reyes",age:29,city:"München",gym:"Combat Base Munich",height:175,weight:70,weightClass:"Leichtgewicht",style:"MMA",wins:18,losses:4,draws:0,ko:11,emoji:"🥋",accent:"#00B4D8"},
  {id:3,name:"Leon Braun",age:24,city:"Hamburg",gym:"Iron Fist HH",height:190,weight:93,weightClass:"Mittelgewicht",style:"Muay Thai",wins:7,losses:1,draws:0,ko:5,emoji:"🔥",accent:"#d97706"},
  {id:4,name:"Tomas Vega",age:31,city:"Köln",gym:"Warriors Gym Köln",height:178,weight:83,weightClass:"Halbmittelgewicht",style:"Kickboxing",wins:22,losses:6,draws:2,ko:14,emoji:"💥",accent:"#16a34a"},
  {id:5,name:"Sven Koch",age:23,city:"Frankfurt",gym:"Apex Fighting Center",height:185,weight:100,weightClass:"Schwergewicht",style:"Wrestling",wins:5,losses:0,draws:0,ko:2,emoji:"🏆",accent:"#FF1493"},
  {id:6,name:"Darius Stein",age:27,city:"Stuttgart",gym:"Ground Zero Stuttgart",height:172,weight:61,weightClass:"Bantamgewicht",style:"BJJ",wins:14,losses:3,draws:1,ko:6,emoji:"⚡",accent:"#9B59B6"},
];

const gymsData = {
  "Berlin":[{name:"Tiger Gym Berlin",members:142,styles:["Boxing","Muay Thai","MMA"],rating:4.8,address:"Mitte, Berlin",emoji:"🐯"},{name:"Berserker Boxing Club",members:89,styles:["Boxing"],rating:4.6,address:"Kreuzberg, Berlin",emoji:"👊"},{name:"Berlin Fight Club",members:210,styles:["MMA","BJJ","Wrestling"],rating:4.9,address:"Friedrichshain, Berlin",emoji:"⚔️"}],
  "München":[{name:"Combat Base Munich",members:175,styles:["MMA","BJJ"],rating:4.7,address:"Schwabing, München",emoji:"🦁"},{name:"Xtreme Fight Academy",members:130,styles:["MMA","Kickboxing"],rating:4.5,address:"Maxvorstadt, München",emoji:"💪"}],
  "Hamburg":[{name:"Iron Fist HH",members:95,styles:["Muay Thai","Boxing"],rating:4.6,address:"Altona, Hamburg",emoji:"✊"},{name:"Nordstern MMA",members:118,styles:["MMA","Grappling","Wrestling"],rating:4.4,address:"Barmbek, Hamburg",emoji:"⭐"}],
  "Köln":[{name:"Warriors Gym Köln",members:160,styles:["Kickboxing","Boxing"],rating:4.7,address:"Ehrenfeld, Köln",emoji:"⚡"},{name:"Rhine Valley BJJ",members:70,styles:["BJJ","Grappling"],rating:4.8,address:"Nippes, Köln",emoji:"🔵"}],
  "Frankfurt":[{name:"Apex Fighting Center",members:200,styles:["MMA","Boxing","Wrestling"],rating:4.9,address:"Sachsenhausen, Frankfurt",emoji:"🔺"}],
  "Stuttgart":[{name:"Ground Zero Stuttgart",members:88,styles:["BJJ","MMA"],rating:4.5,address:"Stuttgart-Mitte",emoji:"💣"},{name:"Swabia Combat Sports",members:112,styles:["Muay Thai","Kickboxing"],rating:4.3,address:"Bad Cannstatt",emoji:"🏋️"}],
};

const trainersData = [
  {id:1,name:"Freddie Roach",country:"🇺🇸 USA",style:"Boxing",pupils:"Manny Pacquiao, Miguel Cotto",gym:"Wild Card Boxing Club",titles:28,rating:9.8,exp:35,emoji:"🥊",accent:"#d97706",bio:"Einer der erfolgreichsten Boxing-Trainer aller Zeiten."},
  {id:2,name:"Firas Zahabi",country:"🇨🇦 Kanada",style:"MMA",pupils:"Georges St-Pierre, Rory MacDonald",gym:"Tristar Gym Montreal",titles:12,rating:9.7,exp:22,emoji:"🎯",accent:"#00B4D8",bio:"Revolutionierte das MMA-Training mit wissenschaftlichem Ansatz."},
  {id:3,name:"Rafael Cordeiro",country:"🇧🇷 Brasilien",style:"Muay Thai / MMA",pupils:"Anderson Silva, Fabricio Werdum",gym:"Kings MMA",titles:15,rating:9.6,exp:28,emoji:"🔥",accent:"#16a34a",bio:"Weltklasse-Trainer mit über 30 Weltmeistern."},
  {id:4,name:"John Kavanagh",country:"🇮🇪 Irland",style:"MMA / BJJ",pupils:"Conor McGregor, Gunnar Nelson",gym:"SBG Ireland",titles:10,rating:9.5,exp:20,emoji:"☘️",accent:"#E03000",bio:"Brachte McGregor zur Weltelite."},
];

const sportsData = {
  "🏀 Basketball":{color:"#FF5500",games:[{id:1,title:"Pickup Basketball",location:"Tempelhof Courts, Berlin",time:"Sa 15:00",players:"4/10",level:"Mittel",host:"Kevin S.",emoji:"🏀"},{id:2,title:"3on3 Tournament",location:"Beach Courts München",time:"So 12:00",players:"8/12",level:"Anfänger",host:"Lena M.",emoji:"🏆"}]},
  "🎾 Tennis":{color:"#16a34a",games:[{id:1,title:"Casual Doubles",location:"TC Rot-Weiß Berlin",time:"So 10:00",players:"2/4",level:"Mittel",host:"Anna K.",emoji:"🎾"},{id:2,title:"Singles Sparring",location:"Stadtpark Courts HH",time:"Sa 14:00",players:"1/2",level:"Fortgeschritten",host:"Felix R.",emoji:"⚡"}]},
  "⚽ Fußball":{color:"#00B4D8",games:[{id:1,title:"5vs5 Hallenfußball",location:"Soccerhalle Berlin",time:"Do 20:00",players:"7/10",level:"Mittel",host:"Mehmet A.",emoji:"⚽"},{id:2,title:"Sonntagskick",location:"Stadtpark Köln",time:"So 11:00",players:"12/22",level:"Alle",host:"Thomas B.",emoji:"🌞"}]},
  "🥋 Kampfsport":{color:"#E03000",games:[{id:1,title:"Open Mat BJJ",location:"Tiger Gym Berlin",time:"So 11:00",players:"8/20",level:"Alle",host:"Kai M.",emoji:"🥋"},{id:2,title:"Boxing Sparring",location:"Berserker BC",time:"Do 19:00",players:"3/10",level:"Mittel",host:"Felix W.",emoji:"🥊"}]},
};

const SWIPE_THRESHOLD = 80;

// --- CSS ---
const css = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f5f5f7;font-family:'DM Sans',sans-serif; overflow-x: hidden;}
.fr{font-family:'Rajdhani',sans-serif!important;font-weight:700;}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes slideIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp 0.4s ease both;}
.spin{animation:spin 0.8s linear infinite;}
input,select{outline:none;font-family:'DM Sans',sans-serif;}
input::placeholder{color:#aaa;}
::-webkit-scrollbar{display:none;}
`;

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [tab, setTab] = useState("swipe");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [profileId, setProfileId] = useState(null);

  const [profile, setProfile] = useState({name:"",age:"",city:"",gym:"",height:"",weight:"",weightClass:"",style:"",bio:""});
  const [myStats, setMyStats] = useState({wins:0,losses:0,draws:0,ko:0});
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [cards, setCards] = useState([...mockFighters]);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({x:0,y:0});
  const [startPos, setStartPos] = useState({x:0,y:0});
  const [lastAction, setLastAction] = useState(null);
  const [matchedFighter, setMatchedFighter] = useState(null);
  const [matches, setMatches] = useState([]);
  const [swipeStats, setSwipeStats] = useState({challenges:0,declines:0});
  const [selectedCity, setSelectedCity] = useState("Berlin");
  const [rankFilter, setRankFilter] = useState("All");
  const [trainerFilter, setTrainerFilter] = useState("All");
  const [selectedSport, setSelectedSport] = useState("🏀 Basketball");
  const [joinedGames, setJoinedGames] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("fighter_profile_id");
    if (saved) {
      setProfileId(saved);
      loadProfile(saved);
    }
  }, []);

  const loadProfile = async (id) => {
    const db = await supabase.from("profiles");
    const { data } = await db.select(id);
    if (data && data[0]) {
      const p = data[0];
      setProfile({ name: p.name||"", age: p.age||"", city: p.city||"", gym: p.gym||"", height: p.height||"", weight: p.weight||"", weightClass: p.weight_class||"", style: p.style||"", bio: p.bio||"" });
      setMyStats({ wins: p.wins||0, losses: p.losses||0, draws: p.draws||0, ko: p.ko||0 });
      if (p.avatar_url) { setAvatarUrl(p.avatar_url); setAvatarPreview(p.avatar_url); }
      setScreen("main");
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const data = { name: profile.name, age: parseInt(profile.age)||null, city: profile.city, gym: profile.gym, height: parseInt(profile.height)||null, weight: parseInt(profile.weight)||null, weight_class: profile.weightClass, style: profile.style, bio: profile.bio, wins: myStats.wins, losses: myStats.losses, draws: myStats.draws, ko: myStats.ko, avatar_url: avatarUrl };
      const db = await supabase.from("profiles");
      if (profileId) {
        await db.update(data, { id: profileId });
        setSaveMsg("✅ Gespeichert!");
      } else {
        const { data: result } = await db.insert(data);
        if (result && result[0]) {
          setProfileId(result[0].id);
          localStorage.setItem("fighter_profile_id", result[0].id);
          setSaveMsg("✅ Profil erstellt!");
        }
      }
    } catch(e) {
      setSaveMsg("❌ Fehler");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { data, error } = await supabase.uploadAvatar(file, `fighter_${Date.now()}`);
    if (!error && data) {
      setAvatarUrl(data.publicUrl);
      setAvatarPreview(data.publicUrl);
      setSaveMsg("📸 Foto bereit!");
    }
    setUploadingPhoto(false);
  };

  const topCard = cards[cards.length - 1];
  const handleDragStart=(e)=>{
    const p=e.touches?e.touches[0]:e;
    setStartPos({x:p.clientX,y:p.clientY});
    setDragging(true);
  };
  const handleDragMove=(e)=>{
    if(!dragging)return;
    const p=e.touches?e.touches[0]:e;
    setOffset({x:p.clientX-startPos.x,y:p.clientY-startPos.y});
  };
  const handleDragEnd=()=>{
    if(!dragging)return;
    setDragging(false);
    if(offset.x>SWIPE_THRESHOLD) swipe("challenge");
    else if(offset.x<-SWIPE_THRESHOLD) swipe("decline");
    else setOffset({x:0,y:0});
  };
  
  const swipe=(dir)=>{
    if(!topCard)return;
    setLastAction(dir);
    setOffset({x:0,y:0});
    if(dir==="challenge"){
      setSwipeStats(s=>({...s,challenges:s.challenges+1}));
      if(Math.random()<0.45){
        setTimeout(()=>{
          setMatchedFighter(topCard);
          setMatches(m=>[...m,topCard]);
        },300);
      }
    } else {
      setSwipeStats(s=>({...s,declines:s.declines+1}));
    }
    setTimeout(()=>{
      setCards(prev=>prev.slice(0,-1));
      setLastAction(null);
    },260);
  };

  const rot=(offset.x/14).toFixed(1);
  const fightOp=Math.min(offset.x/SWIPE_THRESHOLD,1);
  const passOp=Math.min(-offset.x/SWIPE_THRESHOLD,1);
  const cardStyle=dragging?{transform:`translateX(${offset.x}px) translateY(${offset.y*0.25}px) rotate(${rot}deg)`,transition:"none",cursor:"grabbing"}:lastAction==="challenge"?{transform:"translateX(140%) rotate(18deg)",transition:"transform 0.26s ease"}:lastAction==="decline"?{transform:"translateX(-140%) rotate(-18deg)",transition:"transform 0.26s ease"}:{transform:"translateX(0) rotate(0deg)",transition:"transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)"};

  const canProceed=()=>{
    if(step===1)return profile.name&&profile.age&&profile.city;
    if(step===2)return profile.gym&&profile.style;
    if(step===3)return profile.height&&profile.weight&&profile.weightClass;
    return true;
  };

  const totalFights=myStats.wins+myStats.losses+myStats.draws;
  const winRate=totalFights>0?Math.round((myStats.wins/totalFights)*100):0;
  const koRate=myStats.wins>0?Math.round((myStats.ko/myStats.wins)*100):0;
  
  const allFighters = [{id:"me", name: profile.name || "Du", age: profile.age, city: profile.city, gym: profile.gym, style: profile.style, wins: myStats.wins, losses: myStats.losses, draws: myStats.draws, ko: myStats.ko, emoji: "👤", accent: "#E03000", isMe: true, avatarUrl: avatarPreview}, ...mockFighters];
  const rankedFighters=[...allFighters].sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  const filteredTrainers=trainersData.filter(t=>trainerFilter==="All"||t.style.includes(trainerFilter));

  if(screen==="setup") return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center",padding:"0 0 40px"}}>
      <style>{css}</style>
      <div style={{width:"100%",maxWidth:420,padding:"32px 24px 0",textAlign:"center"}}>
        <div className="fr" style={{fontSize:64,color:"#1a1a1a",letterSpacing:6,lineHeight:1}}>FIGHTER</div>
        <div style={{color:"#E03000",fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>FINDE DEINEN GEGNER</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:22}}>
        {[1,2,3].map(s=><div key={s} style={{width:s===step?32:10,height:8,borderRadius:4,background:s<=step?"#E03000":"#ddd",transition:"all 0.3s"}}/>)}
      </div>
      <div style={{width:"100%",maxWidth:380,padding:"22px 20px 0"}}>
        {step===1&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
            <label style={{cursor:"pointer",textAlign:"center"}}>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}}/>
              <div style={{width:90,height:90,borderRadius:"50%",background:"#ececec",border:`2px dashed ${avatarPreview?"#E03000":"#ccc"}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",margin:"0 auto"}}>
                {uploadingPhoto ? <div style={{fontSize:24}} className="spin">⏳</div>
                : avatarPreview ? <img src={avatarPreview} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>
                : <div style={{textAlign:"center"}}><div style={{fontSize:28}}>📸</div><div style={{color:"#888",fontSize:10}}>Foto</div></div>}
              </div>
            </label>
          </div>
          <FLabel>Dein Name</FLabel><FInput placeholder="Name" value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
          <FLabel>Alter</FLabel><FInput placeholder="Alter" type="number" value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
          <FLabel>Stadt</FLabel><FInput placeholder="Berlin" value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))}/>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <FLabel>Gym</FLabel><FInput placeholder="z.B. Tiger Gym" value={profile.gym} onChange={v=>setProfile(p=>({...p,gym:v}))}/>
          <FLabel>Kampfstil</FLabel>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{FIGHT_STYLES.map(s=><button key={s} onClick={()=>setProfile(p=>({...p,style:s}))} style={{padding:"8px 12px",borderRadius:6,border:`1px solid ${profile.style===s?"#E03000":"#ddd"}`,background:profile.style===s?"#E0300012":"#fff",color:profile.style===s?"#E03000":"#555",fontWeight:700,cursor:"pointer"}}>{s}</button>)}</div>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <div style={{display:"flex",gap:11}}>
            <div style={{flex:1}}><FLabel>cm</FLabel><FInput placeholder="180" type="number" value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
            <div style={{flex:1}}><FLabel>kg</FLabel><FInput placeholder="77" type="number" value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
          </div>
          <FLabel>Gewichtsklasse</FLabel>
          <select value={profile.weightClass} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:"#fff",border:"1px solid #ddd",borderRadius:8,padding:"12px",width:"100%"}}>
            <option value="">Wählen...</option>
            {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
        </div>}
        <div style={{display:"flex",gap:9,marginTop:22}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:13,borderRadius:8,background:"#fff",border:"1px solid #ddd",fontWeight:700}}>Zurück</button>}
          <button onClick={async()=>{if(!canProceed())return;if(step<3)setStep(s=>s+1);else{await saveProfile();setScreen("main");}}}
            style={{flex:2,padding:13,borderRadius:8,background:canProceed()?"#E03000":"#eee",color:"#fff",fontWeight:700}}>
            {saving?"...":step===3?"Starten":"Weiter"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column"}} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
      <style>{css}</style>
      <div style={{display:"flex",justifyContent:"space-between",padding:"12px 18px",background:"#fff",borderBottom:"1px solid #eee"}}>
        <div style={{color:"#999",fontSize:11}}>✕ {swipeStats.declines}</div>
        <div className="fr" style={{fontSize:28,letterSpacing:5}}>FIGHTER</div>
        <div style={{color:"#E03000",fontSize:11}}>⚔ {swipeStats.challenges}</div>
      </div>

      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {tab==="swipe"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:20}}>
            <div style={{position:"relative",width:330,height:430}}>
              {cards.length===0?(
                <div style={{width:"100%",height:"100%",borderRadius:16,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:40}}>🏆</div>
                  <div className="fr">ALLE DURCHGESWIPT</div>
                  <button onClick={()=>setCards([...mockFighters])} style={{marginTop:10,padding:"10px 20px",background:"#E03000",color:"#fff",border:"none",borderRadius:6}}>Reset</button>
                </div>
              ):cards.map((f,idx)=>{
                const isTop=idx===cards.length-1;
                return(
                  <div key={f.id} onMouseDown={isTop?handleDragStart:null} onTouchStart={isTop?handleDragStart:null}
                    style={{position:"absolute",inset:0,borderRadius:16,background:"#fff",boxShadow:"0 8px 30px rgba(0,0,0,0.1)",transform:isTop?cardStyle.transform:"scale(0.95)",transition:isTop?cardStyle.transition:"none",overflow:"hidden",display:idx<cards.length-2?"none":"flex",flexDirection:"column"}}>
                    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:80}}>{f.emoji}</div>
                      <div className="fr" style={{fontSize:24,marginTop:10}}>{f.name}</div>
                      <div style={{color:"#888"}}>{f.style} · {f.city}</div>
                    </div>
                    <div style={{padding:20,background:"#fafafa",borderTop:"1px solid #eee"}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div style={{color:"#16a34a",fontWeight:700}}>{f.wins}W - {f.losses}L</div>
                        <div style={{color:"#888"}}>{f.weightClass}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cards.length>0 && (
              <div style={{display:"flex",gap:20,marginTop:30}}>
                <button onClick={()=>swipe("decline")} style={{width:60,height:60,borderRadius:"50%",background:"#fff",border:"2px solid #eee",fontSize:24}}>✕</button>
                <button onClick={()=>swipe("challenge")} style={{width:70,height:70,borderRadius:"50%",background:"#E03000",color:"#fff",border:"none",fontSize:30}}>⚔️</button>
              </div>
            )}
          </div>
        )}

        {tab==="stats"&&(
          <div style={{padding:20}}>
            <div style={{background:"#fff",padding:20,borderRadius:16,textAlign:"center"}}>
              <div style={{width:80,height:80,background:"#eee",borderRadius:"50%",margin:"0 auto 10px",overflow:"hidden"}}>
                {avatarPreview ? <img src={avatarPreview} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "👤"}
              </div>
              <div className="fr" style={{fontSize:24}}>{profile.name}</div>
              <div style={{color:"#E03000"}}>{profile.style}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:20}}>
              <div style={{background:"#fff",padding:15,borderRadius:12,textAlign:"center"}}><div className="fr" style={{fontSize:24,color:"#16a34a"}}>{myStats.wins}</div><div>Wins</div></div>
              <div style={{background:"#fff",padding:15,borderRadius:12,textAlign:"center"}}><div className="fr" style={{fontSize:24,color:"#E03000"}}>{myStats.losses}</div><div>Loss</div></div>
              <div style={{background:"#fff",padding:15,borderRadius:12,textAlign:"center"}}><div className="fr" style={{fontSize:24,color:"#d97706"}}>{myStats.draws}</div><div>Draw</div></div>
            </div>
          </div>
        )}

        {tab==="ranking"&&(
          <div style={{padding:20}}>
            <div className="fr" style={{fontSize:22,marginBottom:15}}>WELTRANGLISTE</div>
            {rankedFighters.map((f,i)=>(
              <div key={i} style={{background:f.isMe?"#E0300010":"#fff",padding:12,borderRadius:10,marginBottom:8,display:"flex",alignItems:"center",gap:15,border:f.isMe?"1px solid #E03000":"1px solid #eee"}}>
                <div className="fr" style={{width:30}}>#{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{f.name} {f.isMe?"(Du)":""}</div>
                  <div style={{fontSize:11,color:"#888"}}>{f.style} · {f.city}</div>
                </div>
                <div className="fr" style={{color:"#16a34a"}}>{f.wins}W</div>
              </div>
            ))}
          </div>
        )}
        
        {/* Platzhalter für die anderen Tabs - Design bleibt wie im Original */}
        {["gyms", "trainer", "sports"].includes(tab) && (
          <div style={{padding:20, textAlign:"center", color:"#aaa"}}>Inhalte für {tab.toUpperCase()} werden geladen...</div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",height:65,display:"flex",borderTop:"1px solid #eee"}}>
        {[["swipe","🔥"],["stats","📊"],["gyms","🏋️"],["ranking","🏆"],["trainer","🎓"],["sports","🎯"]].map(([t,icon])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,border:"none",background:"none",fontSize:20,color:tab===t?"#E03000":"#ccc"}}>{icon}</button>
        ))}
      </div>

      {matchedFighter&&(
        <div onClick={()=>setMatchedFighter(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff"}}>
          <div className="fr" style={{fontSize:40,color:"#E03000"}}>MATCH!</div>
          <div style={{fontSize:100,margin:"20px 0"}}>{matchedFighter.emoji}</div>
          <div className="fr" style={{fontSize:24}}>{matchedFighter.name}</div>
          <button style={{marginTop:30,padding:"15px 30px",background:"#E03000",color:"#fff",border:"none",borderRadius:8,fontWeight:700}}>HERAUSFORDERN</button>
        </div>
      )}
    </div>
  );
}

function FLabel({children}){return <div style={{color:"#666",fontSize:11,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>{children}</div>;}
function FInput({placeholder,value,onChange,type="text"}){
  return <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",background:"#fff",border:"1px solid #ddd",borderRadius:8,padding:12,fontSize:15,marginBottom:5}}/>;
}
