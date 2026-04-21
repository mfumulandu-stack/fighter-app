import { useState, useEffect } from "react";

// --- KONFIGURATION & API ---
const SUPABASE_URL = "https://uykdrmymjvqgebsmndme.supabase.co";
const SUPABASE_KEY = "sb_publishable___XeJxD4-15c1dbNZPH9EQ_gKFNRoH5";

const supabase = {
  async from(table) {
    return {
      async insert(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=representation" },
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
  }
};

// --- VOLLSTÄNDIGE DATEN ---
const WEIGHT_CLASSES = ["Strohgewicht (bis 52 kg)","Bantamgewicht (bis 61 kg)","Federgewicht (bis 66 kg)","Leichtgewicht (bis 70 kg)","Weltergewicht (bis 83 kg)","Mittelgewicht (bis 93 kg)","Schwergewicht (über 100 kg)"];
const FIGHT_STYLES = ["Boxing","Kickboxing","MMA","Muay Thai","Grappling","BJJ","Wrestling"];

const mockFighters = [
  {id:1,name:"Kai Müller",age:26,city:"Berlin",gym:"Tiger Gym Berlin",height:182,weight:77,weightClass:"Weltergewicht",style:"Boxing",wins:12,losses:2,draws:1,ko:8,emoji:"🥊",accent:"#E03000"},
  {id:2,name:"Marco Reyes",age:29,city:"München",gym:"Combat Base Munich",height:175,weight:70,weightClass:"Leichtgewicht",style:"MMA",wins:18,losses:4,draws:0,ko:11,emoji:"🥋",accent:"#00B4D8"},
  {id:3,name:"Leon Braun",age:24,city:"Hamburg",gym:"Iron Fist HH",height:190,weight:93,weightClass:"Mittelgewicht",style:"Muay Thai",wins:7,losses:1,draws:0,ko:5,emoji:"🔥",accent:"#d97706"},
  {id:4,name:"Tomas Vega",age:31,city:"Köln",gym:"Warriors Gym Köln",height:178,weight:83,weightClass:"Halbmittelgewicht",style:"Kickboxing",wins:22,losses:6,draws:2,ko:14,emoji:"💥",accent:"#16a34a"},
  {id:5,name:"Sven Koch",age:23,city:"Frankfurt",gym:"Apex Center",height:185,weight:100,weightClass:"Schwergewicht",style:"Wrestling",wins:5,losses:0,draws:0,ko:2,emoji:"🏆",accent:"#FF1493"}
];

const gymsData = {
  "Berlin":[{name:"Tiger Gym Berlin",members:142,styles:["Boxing","MMA"],rating:4.8,emoji:"🐯"},{name:"Berlin Fight Club",members:210,styles:["MMA","BJJ"],rating:4.9,emoji:"⚔️"}],
  "München":[{name:"Combat Base Munich",members:175,styles:["MMA","BJJ"],rating:4.7,emoji:"🦁"}],
  "Hamburg":[{name:"Iron Fist HH",members:95,styles:["Muay Thai"],rating:4.6,emoji:"✊"}],
  "Köln":[{name:"Warriors Gym Köln",members:160,styles:["Kickboxing"],rating:4.7,emoji:"⚡"}],
  "Frankfurt":[{name:"Apex Fighting Center",members:200,styles:["MMA"],rating:4.9,emoji:"🔺"}]
};

const trainersData = [
  {id:1,name:"Freddie Roach",style:"Boxing",gym:"Wild Card",rating:9.8,emoji:"🥊",accent:"#d97706"},
  {id:2,name:"Firas Zahabi",style:"MMA",gym:"Tristar Gym",rating:9.7,emoji:"🎯",accent:"#00B4D8"},
  {id:3,name:"Rafael Cordeiro",style:"Muay Thai",gym:"Kings MMA",rating:9.6,emoji:"🔥",accent:"#16a34a"}
];

const sportsData = [
  {title:"Open Mat BJJ",location:"Tiger Gym Berlin",time:"So 11:00",players:"8/20",emoji:"🥋",color:"#E03000"},
  {title:"Boxing Sparring",location:"Berserker BC",time:"Do 19:00",players:"3/10",emoji:"🥊",color:"#00B4D8"},
  {title:"Sunday Grappling",location:"Stadtpark",time:"So 14:00",players:"12/22",emoji:"🌞",color:"#16a34a"}
];

const SWIPE_THRESHOLD = 80;
const css = `@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} body{background:#f5f5f7;font-family:'DM Sans',sans-serif;} .fr{font-family:'Rajdhani',sans-serif!important;font-weight:700;} .fade-up{animation:fadeUp 0.4s ease both;} @keyframes fadeUp{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}} .card-glow{box-shadow: 0 10px 30px rgba(0,0,0,0.12);}`;

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [tab, setTab] = useState("swipe");
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({name:"",age:"",city:"Berlin",gym:"",height:"",weight:"",weightClass:"",style:""});
  const [myStats, setMyStats] = useState({wins:0,losses:0,draws:0,ko:0});
  const [cards, setCards] = useState([...mockFighters]);
  const [offset, setOffset] = useState({x:0,y:0});
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({x:0,y:0});
  const [swipeStats, setSwipeStats] = useState({challenges:0,declines:0});

  useEffect(() => {
    const saved = localStorage.getItem("fighter_profile");
    if (saved) { setProfile(JSON.parse(saved)); setScreen("main"); }
  }, []);

  const finishSetup = () => {
    localStorage.setItem("fighter_profile", JSON.stringify(profile));
    setScreen("main");
  };

  const handleDragStart=(e)=>{const p=e.touches?e.touches[0]:e;setStartPos({x:p.clientX,y:p.clientY});setDragging(true);};
  const handleDragMove=(e)=>{if(!dragging)return;const p=e.touches?e.touches[0]:e;setOffset({x:p.clientX-startPos.x,y:p.clientY-startPos.y});};
  const handleDragEnd=()=>{if(!dragging)return;setDragging(false);if(offset.x>SWIPE_THRESHOLD)swipe("challenge");else if(offset.x<-SWIPE_THRESHOLD)swipe("decline");else setOffset({x:0,y:0});};
  const swipe=(dir)=>{setOffset({x:0,y:0});if(dir==="challenge")setSwipeStats(s=>({...s,challenges:s.challenges+1}));else setSwipeStats(s=>({...s,declines:s.declines+1}));setTimeout(()=>setCards(p=>p.slice(0,-1)),200);};

  const topCard = cards[cards.length-1];

  if(screen==="setup") return (
    <div style={{minHeight:"100vh",padding:"40px 20px",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <style>{css}</style>
      <div className="fr" style={{fontSize:48,letterSpacing:5,marginBottom:10}}>FIGHTER</div>
      <div style={{color:"#E03000",fontSize:11,letterSpacing:4,fontWeight:700,marginBottom:30}}>PROFILE SETUP</div>
      
      <div style={{width:"100%",maxWidth:350,background:"#fff",padding:25,borderRadius:20,boxShadow:"0 10px 25px rgba(0,0,0,0.05)"}}>
        {step===1 && (
          <div className="fade-up">
            <FLabel>Name</FLabel><input style={fInput} value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/>
            <FLabel style={{marginTop:15}}>Stadt</FLabel>
            <select style={fInput} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}>
              {Object.keys(gymsData).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button style={btnMain} onClick={()=>setStep(2)}>WEITER</button>
          </div>
        )}
        {step===2 && (
          <div className="fade-up">
            <FLabel>Stil</FLabel>
            <select style={fInput} value={profile.style} onChange={e=>setProfile({...profile,style:e.target.value})}>
              <option>Wähle Stil</option>
              {FIGHT_STYLES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <FLabel style={{marginTop:15}}>Gewichtsklasse</FLabel>
            <select style={fInput} value={profile.weightClass} onChange={e=>setProfile({...profile,weightClass:e.target.value})}>
              <option>Wähle Klasse</option>
              {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
            <button style={btnMain} onClick={finishSetup}>FERTIGSTELLEN</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column"}} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
      <style>{css}</style>
      
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 20px",background:"#fff",borderBottom:"1px solid #eee"}}>
        <div style={{color:"#999",fontSize:11,fontWeight:700}}>✕ {swipeStats.declines}</div>
        <div className="fr" style={{fontSize:28,letterSpacing:4}}>FIGHTER</div>
        <div style={{color:"#E03000",fontSize:11,fontWeight:700}}>⚔ {swipeStats.challenges}</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"15px"}}>
        {tab==="swipe" && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginTop:20}}>
            {topCard ? (
              <div className="card-glow" style={{position:"relative",width:320,height:420,background:"#fff",borderRadius:25,transform:`translateX(${offset.x}px) rotate(${offset.x/15}deg)`,transition:dragging?"none":"transform 0.3s",overflow:"hidden"}}>
                <div style={{height:"55%",background:`radial-gradient(circle, ${topCard.accent}15, transparent)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:90}}>{topCard.emoji}</div>
                <div style={{padding:"20px"}}>
                   <div className="fr" style={{fontSize:26}}>{topCard.name}, {topCard.age}</div>
                   <div style={{color:topCard.accent,fontWeight:700,fontSize:13,marginTop:2}}>{topCard.style.toUpperCase()}</div>
                   <div style={{display:"flex",gap:10,marginTop:15}}>
                      <div style={{textAlign:"center",flex:1}}><div className="fr" style={{fontSize:18,color:"#16a34a"}}>{topCard.wins}</div><div style={{fontSize:8,color:"#aaa"}}>WINS</div></div>
                      <div style={{textAlign:"center",flex:1}}><div className="fr" style={{fontSize:18,color:"#E03000"}}>{topCard.losses}</div><div style={{fontSize:8,color:"#aaa"}}>LOSS</div></div>
                      <div style={{textAlign:"center",flex:1}}><div className="fr" style={{fontSize:18,color:"#d97706"}}>{topCard.ko}</div><div style={{fontSize:8,color:"#aaa"}}>KOs</div></div>
                   </div>
                </div>
              </div>
            ) : <div className="fr" style={{marginTop:100,fontSize:20,color:"#888"}}>ALLE KÄMPFER GESEHEN</div>}
            {topCard && (
               <div style={{display:"flex",gap:25,marginTop:30}}>
                 <button onClick={()=>swipe("decline")} style={{width:60,height:60,borderRadius:"50%",background:"#fff",border:"none",fontSize:22,boxShadow:"0 5px 15px rgba(0,0,0,0.1)"}}>✕</button>
                 <button onClick={()=>swipe("challenge")} style={{width:75,height:75,borderRadius:"50%",background:"#E03000",border:"none",color:"#fff",fontSize:28,boxShadow:"0 8px 20px rgba(224,48,0,0.3)"}}>⚔️</button>
                 <button onClick={()=>swipe("decline")} style={{width:60,height:60,borderRadius:"50%",background:"#fff",border:"none",fontSize:22,boxShadow:"0 5px 15px rgba(0,0,0,0.1)"}}>⭐</button>
               </div>
            )}
          </div>
        )}

        {tab==="gyms" && (
          <div className="fade-up">
            <h2 className="fr" style={{fontSize:22,marginBottom:20}}>GYMS IN {profile.city}</h2>
            {gymsData[profile.city]?.map(g=>(
              <div key={g.name} className="card-glow" style={{background:"#fff",padding:15,borderRadius:15,marginBottom:12,display:"flex",alignItems:"center",gap:15}}>
                <div style={{fontSize:32}}>{g.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15}}>{g.name}</div>
                  <div style={{fontSize:11,color:"#888"}}>{g.styles.join(" • ")}</div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:"#16a34a"}}>⭐ {g.rating}</div><div style={{fontSize:9,color:"#aaa"}}>{g.members} Mbr</div></div>
              </div>
            ))}
          </div>
        )}

        {tab==="ranking" && (
          <div className="fade-up">
            <h2 className="fr" style={{fontSize:22,marginBottom:20}}>GLOBAL RANKING</h2>
            {[...mockFighters].sort((a,b)=>b.wins-a.wins).map((f,i)=>(
              <div key={f.id} style={{background:"#fff",padding:15,borderRadius:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #eee"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div className="fr" style={{color:i<3?"#E03000":"#ccc",fontSize:18}}>#{i+1}</div>
                  <div style={{fontWeight:500}}>{f.name}</div>
                </div>
                <div className="fr" style={{fontSize:14}}>{f.wins}W - {f.losses}L</div>
              </div>
            ))}
          </div>
        )}

        {tab==="trainer" && (
          <div className="fade-up">
            <h2 className="fr" style={{fontSize:22,marginBottom:20}}>PRO COACHES</h2>
            {trainersData.map(t=>(
              <div key={t.name} className="card-glow" style={{background:"#fff",padding:18,borderRadius:18,marginBottom:12,display:"flex",justifyContent:"space-between",borderLeft:`5px solid ${t.accent}`}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16}}>{t.name}</div>
                  <div style={{fontSize:11,color:t.accent,fontWeight:700}}>{t.style} • {t.gym}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:24}}>{t.emoji}</div>
                  <div style={{fontSize:10,fontWeight:700,color:"#16a34a"}}>⭐ {t.rating}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="sports" && (
          <div className="fade-up">
            <h2 className="fr" style={{fontSize:22,marginBottom:20}}>UPCOMING EVENTS</h2>
            {sportsData.map((ev,i)=>(
              <div key={i} className="card-glow" style={{background:"#fff",padding:15,borderRadius:15,marginBottom:12,display:"flex",gap:15,alignItems:"center"}}>
                <div style={{width:50,height:50,borderRadius:12,background:`${ev.color}10`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{ev.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{ev.title}</div>
                  <div style={{fontSize:11,color:"#888"}}>{ev.location} • {ev.time}</div>
                </div>
                <button style={{padding:"6px 12px",borderRadius:6,border:"none",background:ev.color,color:"#fff",fontSize:10,fontWeight:700}}>JOIN</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div style={{height:75,background:"#fff",borderTop:"1px solid #eee",display:"flex",justifyContent:"space-around",alignItems:"center",paddingBottom:10}}>
        {[["swipe","FIGHT","🔥"],["gyms","GYMS","🏋️"],["ranking","RANG","🏆"],["trainer","COACH","🎓"],["sports","EVENT","🎯"]].map(([id,label,icon])=>(
          <div key={id} onClick={()=>setTab(id)} style={{textAlign:"center",cursor:"pointer",opacity:tab===id?1:0.3,transition:"0.2s"}}>
            <div style={{fontSize:22}}>{icon}</div>
            <div style={{fontSize:9,fontWeight:700,marginTop:2}}>{label}</div>
            {tab===id && <div style={{width:4,height:4,borderRadius:"50%",background:"#E03000",margin:"2px auto 0"}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hilfskomponenten & Styles
function FLabel({children, style}){ return <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1.5,marginBottom:5, ...style}}>{children}</div>; }
const fInput = {width:"100%",padding:12,background:"#f9f9f9",border:"1px solid #eee",borderRadius:10,fontSize:15,outline:"none"};
const btnMain = {width:"100%",marginTop:25,padding:14,background:"#E03000",color:"#fff",border:"none",borderRadius:10,fontWeight:700,letterSpacing:1,cursor:"pointer",boxShadow:"0 5px 15px rgba(224,48,0,0.2)"};
