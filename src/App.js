import { useState, useEffect } from "react";

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
        const res = await fetch(url, { 
          headers: { 
            "apikey": SUPABASE_KEY, 
            "Authorization": `Bearer ${SUPABASE_KEY}` 
          } 
        });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      }
    };
  },
  async uploadAvatar(file, path) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
      method: "POST",
      headers: { 
        "apikey": SUPABASE_KEY, 
        "Authorization": `Bearer ${SUPABASE_KEY}`, 
        "Content-Type": file.type 
      },
      body: file
    });
    const json = await res.json();
    if (!res.ok) return { error: json };
    return { data: { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}` } };
  }
};

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

const css = `@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} body{background:#f5f5f7;font-family:'DM Sans',sans-serif;} .fr{font-family:'Rajdhani',sans-serif!important;font-weight:700;} @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}} @keyframes slideIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .fade-up{animation:fadeUp 0.4s ease both;} .spin{animation:spin 0.8s linear infinite;} input,select{outline:none;font-family:'DM Sans',sans-serif;} input::placeholder{color:#aaa;} ::-webkit-scrollbar{display:none;}`;

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
      setSaveMsg("❌ Fehler beim Speichern");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    const path = `fighter_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.uploadAvatar(file, path);
    if (!error && data) {
      setAvatarUrl(data.publicUrl);
      setSaveMsg("📸 Foto hochgeladen!");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      setSaveMsg("❌ Foto-Upload fehlgeschlagen");
    }
    setUploadingPhoto(false);
  };

  const topCard = cards[cards.length - 1];
  const handleDragStart=(e)=>{const p=e.touches?e.touches[0]:e;setStartPos({x:p.clientX,y:p.clientY});setDragging(true);};
  const handleDragMove=(e)=>{if(!dragging)return;const p=e.touches?e.touches[0]:e;setOffset({x:p.clientX-startPos.x,y:p.clientY-startPos.y});};
  const handleDragEnd=()=>{if(!dragging)return;setDragging(false);if(offset.x>SWIPE_THRESHOLD)swipe("challenge");else if(offset.x<-SWIPE_THRESHOLD)swipe("decline");else setOffset({x:0,y:0});};
  const swipe=(dir)=>{if(!topCard)return;setLastAction(dir);setOffset({x:0,y:0});if(dir==="challenge"){setSwipeStats(s=>({...s,challenges:s.challenges+1}));if(Math.random()<0.45){setTimeout(()=>{setMatchedFighter(topCard);setMatches(m=>[...m,topCard]);},300);}}else setSwipeStats(s=>({...s,declines:s.declines+1}));setTimeout(()=>{setCards(prev=>prev.slice(0,-1));setLastAction(null);},260);};

  const rot=(offset.x/14).toFixed(1);
  const fightOp=Math.min(offset.x/SWIPE_THRESHOLD,1);
  const passOp=Math.min(-offset.x/SWIPE_THRESHOLD,1);
  const cardStyle=dragging?{transform:`translateX(${offset.x}px) translateY(${offset.y*0.25}px) rotate(${rot}deg)`,transition:"none",cursor:"grabbing"}:lastAction==="challenge"?{transform:"translateX(140%) rotate(18deg)",transition:"transform 0.26s ease"}:lastAction==="decline"?{transform:"translateX(-140%) rotate(-18deg)",transition:"transform 0.26s ease"}:{transform:"translateX(0) rotate(0deg)",transition:"transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)"};

  const canProceed=()=>{if(step===1)return profile.name&&profile.age&&profile.city;if(step===2)return profile.gym&&profile.style;if(step===3)return profile.height&&profile.weight&&profile.weightClass;return true;};
  const totalFights=myStats.wins+myStats.losses+myStats.draws;
  const winRate=totalFights>0?Math.round((myStats.wins/totalFights)*100):0;
  const koRate=myStats.wins>0?Math.round((myStats.ko/myStats.wins)*100):0;
  const allFighters=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weightClass:profile.weightClass,style:profile.style,wins:myStats.wins,losses:myStats.losses,draws:myStats.draws,ko:myStats.ko,emoji:"🥊",accent:"#E03000",isMe:true,avatarUrl},...mockFighters]:mockFighters;
  const rankedFighters=[...allFighters].filter(f=>rankFilter==="All"||f.style===rankFilter).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  const trainerStyles=["All","Boxing","MMA","Muay Thai","BJJ","Conditioning"];
  const filteredTrainers=trainersData.filter(t=>trainerFilter==="All"||t.style.includes(trainerFilter)).sort((a,b)=>b.rating-a.rating);

  if(screen==="setup") return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center",padding:"0 0 40px"}}>
      <style>{css}</style>
      <div style={{width:"100%",maxWidth:420,padding:"32px 24px 0",textAlign:"center"}}>
        <div className="fr fade-up" style={{fontSize:64,color:"#1a1a1a",letterSpacing:6,lineHeight:1,textShadow:"none"}}>FIGHTER</div>
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
                : <div style={{textAlign:"center"}}><div style={{fontSize:28}}>📸</div><div style={{color:"#888",fontSize:10,marginTop:4}}>Foto hinzufügen</div></div>}
              </div>
              {!uploadingPhoto && <div style={{color:"#E03000",fontSize:11,marginTop:6,fontWeight:600}}>Profilbild hochladen</div>}
            </label>
          </div>
          <FLabel>Dein Name</FLabel><FInput placeholder="z.B. Max Müller" value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
          <FLabel>Alter</FLabel><FInput placeholder="z.B. 25" type="number" value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
          <FLabel>Standort</FLabel><FInput placeholder="z.B. Berlin" value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))} icon="📍"/>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <FLabel>Dein Gym</FLabel><FInput placeholder="z.B. Tiger Gym Berlin" value={profile.gym} onChange={v=>setProfile(p=>({...p,gym:v}))} icon="🏋️"/>
          <FLabel>Über dich</FLabel><FInput placeholder="z.B. 5 Jahre Boxing Erfahrung..." value={profile.bio} onChange={v=>setProfile(p=>({...p,bio:v}))}/>
          <FLabel>Kampfstil</FLabel>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:4}}>
            {FIGHT_STYLES.map(s=><button key={s} onClick={()=>setProfile(p=>({...p,style:s}))} style={{padding:"7px 13px",borderRadius:4,border:`1px solid ${profile.style===s?"#E03000":"#ddd"}`,background:profile.style===s?"#E0300012":"#fff",color:profile.style===s?"#E03000":"#555",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>{s}</button>)}
          </div>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <div style={{display:"flex",gap:11}}>
            <div style={{flex:1}}><FLabel>Größe (cm)</FLabel><FInput placeholder="180" type="number" value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
            <div style={{flex:1}}><FLabel>Kampfgewicht (kg)</FLabel><FInput placeholder="77" type="number" value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
          </div>
          <FLabel>Gewichtsklasse</FLabel>
          <select value={profile.weightClass} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:"#fff",border:"1px solid #ddd",borderRadius:8,padding:"12px 13px",color:profile.weightClass?"#1a1a1a":"#aaa",fontSize:14,width:"100%"}}>
            <option value="">Gewichtsklasse wählen</option>
            {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
          <FLabel>Kampfrekord (optional)</FLabel>
          <div style={{display:"flex",gap:7}}>
            {[["wins","SIEGE","#16a34a"],["losses","NIEDER","#E03000"],["draws","UNENTSCH","#d97706"],["ko","KOs","#FF5500"]].map(([key,label,color])=>(
              <div key={key} style={{flex:1,textAlign:"center"}}>
                <div style={{color,fontSize:9,letterSpacing:1,marginBottom:3}}>{label}</div>
                <input type="number" min="0" value={myStats[key]} onChange={e=>setMyStats(s=>({...s,[key]:parseInt(e.target.value)||0}))} style={{width:"100%",background:"#fff",border:"1px solid #ddd",borderRadius:6,padding:"9px 3px",color:"#1a1a1a",fontSize:20,textAlign:"center",fontFamily:"'Rajdhani',sans-serif"}}/>
              </div>
            ))}
          </div>
        </div>}
        <div style={{display:"flex",gap:9,marginTop:22}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px",borderRadius:8,background:"#fff",border:"1px solid #ddd",color:"#666",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Zurück</button>}
          <button onClick={async()=>{if(!canProceed())return;if(step<3){setStep(s=>s+1);}else{await saveProfile();setScreen("main");}}}
            style={{flex:2,padding:"13px",borderRadius:8,background:canProceed()?"linear-gradient(135deg,#E03000,#FF5500)":"#eee",border:"none",color:canProceed()?"#fff":"#aaa",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,letterSpacing:2,cursor:canProceed()?"pointer":"not-allowed",boxShadow:canProceed()?"0 4px 20px #E0300022":"none",transition:"all 0.2s"}}>
            {saving?"Speichern...":step===3?"Let's Fight →":"Weiter →"}
          </button>
        </div>
      </div>
    </div>
  );

  const tabs=[["swipe","🔥","FIGHT"],["stats","📊","STATS"],["gyms","🏋️","GYMS"],["ranking","🏆","RANG"],["trainer","🎓","TRAINER"],["sports","🎯","SPORTS"]];

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}
    onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
      <style>{css}</style>
      {saveMsg&&<div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",background:"#fff",border:"1px solid #E03000",borderRadius:20,padding:"8px 20px",color:"#1a1a1a",fontSize:13,zIndex:200,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>{saveMsg}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px 8px",flexShrink:0,borderBottom:"1px solid #e8e8e8",background:"#fff"}}>
        <div style={{color:"#999",fontSize:11,fontWeight:600}}>✕ {swipeStats.declines}</div>
        <div className="fr" style={{fontSize:28,color:"#1a1a1a",letterSpacing:5}}>FIGHTER</div>
        <div style={{color:"#E03000",fontSize:11,fontWeight:600}}>⚔ {swipeStats.challenges}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:65}}>
        {tab==="swipe"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:8}}>
            <div style={{width:"calc(100% - 24px)",maxWidth:380,margin:"0 0 8px",background:"#fff",borderRadius:10,padding:"9px 12px",border:"1px solid #eee",display:"flex",alignItems:"center",gap:9,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              {avatarPreview ? <img src={avatarPreview} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:"2px solid #E03000"}} alt="me"/> : <div style={{fontSize:20,width:36,height:36,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center"}}>🥊</div>}
              <div style={{flex:1}}>
                <div style={{color:"#1a1a1a",fontWeight:700,fontSize:13}}>{profile.name}, {profile.age} · {profile.city}</div>
                <div style={{color:"#E03000",fontSize:11,marginTop:1}}>{profile.style} · {profile.weightClass?.split(" (")[0]}</div>
              </div>
              <div style={{color:"#888",fontSize:10,textAlign:"right"}}>{profile.height}cm<br/>{profile.weight}kg</div>
            </div>
            <div style={{position:"relative",width:330,height:430,flexShrink:0}}>
              {cards.length===0?(
                <div style={{width:"100%",height:"100%",borderRadius:16,background:"#fff",border:"2px dashed #ddd",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:11}}>
                  <div style={{fontSize:46}}>🏆</div>
                  <div className="fr" style={{color:"#1a1a1a",fontSize:24,letterSpacing:2}}>ALLE GESEHEN</div>
                  <button onClick={()=>{setCards([...mockFighters]);setSwipeStats({challenges:0,declines:0});setMatches([]);}} style={{marginTop:6,padding:"9px 22px",borderRadius:6,background:"linear-gradient(135deg,#E03000,#FF5500)",color:"#1a1a1a",border:"none",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>Nochmal</button>
                </div>
              ):cards.map((f,idx)=>{
                const isTop=idx===cards.length-1,isSecond=idx===cards.length-2;
                return(
                  <div key={f.id} onMouseDown={isTop?handleDragStart:undefined} onTouchStart={isTop?handleDragStart:undefined}
                    style={{position:"absolute",inset:0,borderRadius:16,background:"#fff",border:`1px solid ${f.accent}22`,boxShadow:isTop?"0 8px 32px rgba(0,0,0,0.12)":"none",cursor:isTop?"grab":"default",zIndex:isTop?10:isSecond?5:1,transform:isTop?cardStyle.transform:isSecond?"scale(0.96) translateY(10px)":"scale(0.92) translateY(20px)",transition:isTop?cardStyle.transition:"none",overflow:"hidden",display:"flex",flexDirection:"column",userSelect:"none"}}>
                    <div style={{height:3,background:`linear-gradient(90deg,${f.accent},transparent)`}}/>
                    {isTop&&<>
                      <div style={{position:"absolute",top:18,left:16,border:"3px solid #39FF14",borderRadius:5,padding:"2px 8px",color:"#16a34a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,letterSpacing:3,transform:"rotate(-18deg)",opacity:fightOp,transition:dragging?"none":"opacity 0.12s"}}>FIGHT</div>
                      <div style={{position:"absolute",top:18,right:16,border:"3px solid #FF4500",borderRadius:5,padding:"2px 8px",color:"#E03000",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,letterSpacing:3,transform:"rotate(18deg)",opacity:passOp,transition:dragging?"none":"opacity 0.12s"}}>PASS</div>
                    </>}
                    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`radial-gradient(circle at 50% 50%,${f.accent}08,transparent 65%)`}}>
                      <div style={{fontSize:72,filter:`drop-shadow(0 0 14px ${f.accent}33)`}}>{f.emoji}</div>
                      <div style={{marginTop:9,display:"flex",gap:11}}>
                        {[{v:f.wins,l:"SIEGE",c:"#16a34a"},{v:f.losses,l:"NIEDER",c:"#E03000"},{v:f.draws,l:"UNENTSCH",c:"#b45309"}].map(({v,l,c})=>(
                          <div key={l} style={{textAlign:"center"}}><div className="fr" style={{color:c,fontSize:20}}>{v}</div><div style={{color:"#bbb",fontSize:8,letterSpacing:1}}>{l}</div></div>
                        ))}
                      </div>
                    </div>
                    <div style={{padding:"10px 14px 14px",background:"#fafafa",borderTop:`1px solid #f0f0f0`}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div><div className="fr" style={{color:"#1a1a1a",fontSize:24,letterSpacing:1.5,lineHeight:1}}>{f.name}</div><div style={{color:f.accent,fontSize:11,fontWeight:700,marginTop:1}}>{f.style?.toUpperCase()}</div></div>
                        <div style={{textAlign:"right"}}><div style={{color:"#888",fontSize:11}}>{f.height} cm</div><div style={{color:"#888",fontSize:11}}>{f.weight} kg</div></div>
                      </div>
                      <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                        <FTag color="#f5f5f5" text={`📍 ${f.city}`}/><FTag color="#f5f5f5" text={`🏋️ ${f.gym}`}/><FTag color={`${f.accent}12`} text={f.weightClass} accent={f.accent}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cards.length>0&&(
              <div style={{display:"flex",gap:16,alignItems:"center",marginTop:10}}>
                <RoundBtn onClick={()=>swipe("decline")} color="#E03000" icon="✕" size={54}/>
                <RoundBtn onClick={()=>swipe("challenge")} color="#16a34a" icon="⚔️" size={64} primary label="FIGHT"/>
                <RoundBtn onClick={()=>swipe("decline")} color="#d97706" icon="⭐" size={54}/>
              </div>
            )}
          </div>
        )}
        {tab==="stats"&& (
          <div style={{padding:"10px 13px 16px",maxWidth:420,margin:"0 auto"}}>
            <div style={{background:"#fff",borderRadius:14,padding:"16px",border:"1px solid #eee",marginBottom:11,textAlign:"center"}}>
              <div style={{position:"relative",display:"inline-block",marginBottom:10}}>
                <label style={{cursor:"pointer"}}>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}}/>
                  <div style={{width:80,height:80,borderRadius:"50%",background:"#f0f0f0",border:`3px solid ${avatarPreview?"#E03000":"#333"}`,overflow:"hidden",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {uploadingPhoto?<div style={{fontSize:24}} className="spin">⏳</div> :avatarPreview?<img src={avatarPreview} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/> :<div style={{fontSize:32}}>👤</div>}
                  </div>
                  <div style={{position:"absolute",bottom:0,right:0,background:"#E03000",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>📷</div>
                </label>
              </div>
              <div className="fr" style={{color:"#1a1a1a",fontSize:24,letterSpacing:2}}>{profile.name}</div>
              <div style={{color:"#E03000",fontSize:13,fontWeight:600,marginTop:2}}>{profile.style} · {profile.weightClass?.split(" (")[0]}</div>
              <div style={{color:"#888",fontSize:11,marginTop:3}}>📍 {profile.city} · 🏋️ {profile.gym}</div>
              {profile.bio&&<div style={{color:"#666",fontSize:12,marginTop:6,fontStyle:"italic"}}>"{profile.bio}"</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:9}}>
              {[["SIEGE",myStats.wins,"#16a34a"],["NIEDERLAGEN",myStats.losses,"#E03000"],["UNENTSCHIEDEN",myStats.draws,"#d97706"]].map(([label,val,color])=>(
                <div key={label} style={{background:"#fff",borderRadius:11,padding:"13px 5px",textAlign:"center",border:`1px solid ${color}15`}}>
                  <div className="fr" style={{color,fontSize:36,lineHeight:1}}>{val}</div>
                  <div style={{color:"#bbb",fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            <button onClick={saveProfile} disabled={saving} style={{width:"100%",padding:"14px",borderRadius:10,background:saving?"#222":"linear-gradient(135deg,#FF4500,#FF6B35)",border:"none",color:saving?"#555":"#fff",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,letterSpacing:2,cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":"0 4px 18px #FF450044",transition:"all 0.2s"}}>
              {saving?"⏳ Speichern...":"💾 Profil speichern"}
            </button>
          </div>
        )}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e8e8e8",display:"flex",height:58,zIndex:50}}>
        {tabs.map(([id,icon,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",gap:1,borderTop:tab===id?"2px solid #FF4500":"2px solid transparent",transition:"all 0.2s"}}>
            <div style={{fontSize:16}}>{icon}</div>
            <div style={{color:tab===id?"#E03000":"#222",fontSize:9,fontFamily:"'DM Sans',sans-serif",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FLabel({children}){return <div style={{color:"#666",fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase"}}>{children}</div>;}
function FInput({placeholder,value,onChange,type="text",icon}){
  return(<div style={{position:"relative"}}>
    {icon&&<span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13}}>{icon}</span>}
    <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",background:"#fff",border:"1px solid #eee",borderRadius:8,padding:`12px ${icon?"12px 12px 34px":"13px"}`,color:"#1a1a1a",fontSize:15,fontFamily:"'DM Sans',sans-serif",transition:"border-color 0.2s"}}
    onFocus={e=>e.target.style.borderColor="#E03000"} onBlur={e=>e.target.style.borderColor="#eee"}/>
  </div>);
}
function FTag({text,color,accent}){return <div style={{padding:"2px 7px",borderRadius:3,background:color,color:accent||"#444",fontSize:10,fontWeight:600,border:accent?`1px solid ${accent}18`:"none"}}>{text}</div>;}
function RoundBtn({onClick,color,icon,size,primary,label}){
  return(<button onClick={onClick}
    style={{width:size,height:size,borderRadius:primary?11:"50%",background:primary?`linear-gradient(135deg,${color}cc,${color})`:`${color}10`,border:primary?"none":`2px solid ${color}22`,fontSize:primary?21:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:1,transition:"all 0.2s",boxShadow:primary?`0 5px 16px ${color}33`:"none"}}>
    {icon}
    {primary&&<div style={{color:"#000",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:9,letterSpacing:2}}>{label}</div>}
  </button>);
}
