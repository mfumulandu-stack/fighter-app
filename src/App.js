import { useState } from "react";

const WEIGHT_CLASSES = ["Strohgewicht (bis 52 kg)","Leichtfliegengewicht (bis 54 kg)","Fliegengewicht (bis 57 kg)","Bantamgewicht (bis 61 kg)","Federgewicht (bis 66 kg)","Leichtgewicht (bis 70 kg)","Halbweltergewicht (bis 77 kg)","Weltergewicht (bis 83 kg)","Halbmittelgewicht (bis 87 kg)","Mittelgewicht (bis 93 kg)","Halbschwergewicht (bis 100 kg)","Cruisergewicht (bis 90 kg)","Schwergewicht (über 100 kg)"];
const FIGHT_STYLES = ["Boxing","Kickboxing","MMA","Muay Thai","Grappling","BJJ","Wrestling"];

const mockFighters = [
  {id:1,name:"Kai Müller",age:26,city:"Berlin",gym:"Tiger Gym Berlin",height:182,weight:77,weightClass:"Weltergewicht",style:"Boxing",wins:12,losses:2,draws:1,ko:8,emoji:"🥊",accent:"#FF4500"},
  {id:2,name:"Marco Reyes",age:29,city:"München",gym:"Combat Base Munich",height:175,weight:70,weightClass:"Leichtgewicht",style:"MMA",wins:18,losses:4,draws:0,ko:11,emoji:"🥋",accent:"#00B4D8"},
  {id:3,name:"Leon Braun",age:24,city:"Hamburg",gym:"Iron Fist HH",height:190,weight:93,weightClass:"Mittelgewicht",style:"Muay Thai",wins:7,losses:1,draws:0,ko:5,emoji:"🔥",accent:"#FFD700"},
  {id:4,name:"Tomas Vega",age:31,city:"Köln",gym:"Warriors Gym Köln",height:178,weight:83,weightClass:"Halbmittelgewicht",style:"Kickboxing",wins:22,losses:6,draws:2,ko:14,emoji:"💥",accent:"#39FF14"},
  {id:5,name:"Sven Koch",age:23,city:"Frankfurt",gym:"Apex Fighting Center",height:185,weight:100,weightClass:"Schwergewicht",style:"Wrestling",wins:5,losses:0,draws:0,ko:2,emoji:"🏆",accent:"#FF1493"},
  {id:6,name:"Darius Stein",age:27,city:"Stuttgart",gym:"Ground Zero Stuttgart",height:172,weight:61,weightClass:"Bantamgewicht",style:"BJJ",wins:14,losses:3,draws:1,ko:6,emoji:"⚡",accent:"#9B59B6"},
  {id:7,name:"Felix Wagner",age:25,city:"Berlin",gym:"Berserker Boxing Club",height:179,weight:66,weightClass:"Federgewicht",style:"Boxing",wins:9,losses:3,draws:0,ko:7,emoji:"👊",accent:"#FF6B35"},
  {id:8,name:"Nico Hartmann",age:28,city:"München",gym:"Xtreme Fight Academy",height:183,weight:83,weightClass:"Halbmittelgewicht",style:"MMA",wins:15,losses:5,draws:1,ko:9,emoji:"🦅",accent:"#00FFD1"},
  {id:9,name:"Ahmed Kaya",age:30,city:"Berlin",gym:"Tiger Gym Berlin",height:176,weight:70,weightClass:"Leichtgewicht",style:"Muay Thai",wins:20,losses:3,draws:2,ko:13,emoji:"🐯",accent:"#FFA500"},
  {id:10,name:"Jan Richter",age:22,city:"Hamburg",gym:"Nordstern MMA",height:188,weight:93,weightClass:"Mittelgewicht",style:"Grappling",wins:4,losses:2,draws:0,ko:1,emoji:"🌊",accent:"#4FC3F7"},
];

const gymsData = {
  "Berlin":[{name:"Tiger Gym Berlin",members:142,styles:["Boxing","Muay Thai","MMA"],rating:4.8,address:"Mitte, Berlin",emoji:"🐯"},{name:"Berserker Boxing Club",members:89,styles:["Boxing"],rating:4.6,address:"Kreuzberg, Berlin",emoji:"👊"},{name:"Berlin Fight Club",members:210,styles:["MMA","BJJ","Wrestling"],rating:4.9,address:"Friedrichshain, Berlin",emoji:"⚔️"}],
  "München":[{name:"Combat Base Munich",members:175,styles:["MMA","BJJ"],rating:4.7,address:"Schwabing, München",emoji:"🦁"},{name:"Xtreme Fight Academy",members:130,styles:["MMA","Kickboxing"],rating:4.5,address:"Maxvorstadt, München",emoji:"💪"}],
  "Hamburg":[{name:"Iron Fist HH",members:95,styles:["Muay Thai","Boxing"],rating:4.6,address:"Altona, Hamburg",emoji:"✊"},{name:"Nordstern MMA",members:118,styles:["MMA","Grappling","Wrestling"],rating:4.4,address:"Barmbek, Hamburg",emoji:"⭐"}],
  "Köln":[{name:"Warriors Gym Köln",members:160,styles:["Kickboxing","Boxing"],rating:4.7,address:"Ehrenfeld, Köln",emoji:"⚡"},{name:"Rhine Valley BJJ",members:70,styles:["BJJ","Grappling"],rating:4.8,address:"Nippes, Köln",emoji:"🔵"}],
  "Frankfurt":[{name:"Apex Fighting Center",members:200,styles:["MMA","Boxing","Wrestling"],rating:4.9,address:"Sachsenhausen, Frankfurt",emoji:"🔺"},{name:"Mainhattan Boxing",members:88,styles:["Boxing"],rating:4.3,address:"Nordend, Frankfurt",emoji:"🥊"}],
  "Stuttgart":[{name:"Ground Zero Stuttgart",members:88,styles:["BJJ","MMA"],rating:4.5,address:"Stuttgart-Mitte",emoji:"💣"},{name:"Swabia Combat Sports",members:112,styles:["Muay Thai","Kickboxing"],rating:4.3,address:"Bad Cannstatt",emoji:"🏋️"}],
};

const trainersData = [
  {id:1,name:"Freddie Roach",country:"🇺🇸 USA",style:"Boxing",pupils:"Manny Pacquiao, Miguel Cotto",gym:"Wild Card Boxing Club",titles:28,rating:9.8,exp:35,emoji:"🥊",accent:"#FFD700",bio:"Einer der erfolgreichsten Boxing-Trainer aller Zeiten. 28 Weltmeister gecoacht."},
  {id:2,name:"Firas Zahabi",country:"🇨🇦 Kanada",style:"MMA",pupils:"Georges St-Pierre, Rory MacDonald",gym:"Tristar Gym Montreal",titles:12,rating:9.7,exp:22,emoji:"🎯",accent:"#00B4D8",bio:"Revolutionierte das MMA-Training mit wissenschaftlichem Ansatz und Phasenwellen-Methode."},
  {id:3,name:"Rafael Cordeiro",country:"🇧🇷 Brasilien",style:"Muay Thai / MMA",pupils:"Anderson Silva, Fabricio Werdum",gym:"Kings MMA",titles:15,rating:9.6,exp:28,emoji:"🔥",accent:"#39FF14",bio:"Weltklasse-Trainer mit über 30 Weltmeistern in Muay Thai und MMA."},
  {id:4,name:"John Kavanagh",country:"🇮🇪 Irland",style:"MMA / BJJ",pupils:"Conor McGregor, Gunnar Nelson",gym:"SBG Ireland",titles:10,rating:9.5,exp:20,emoji:"☘️",accent:"#FF4500",bio:"Brachte McGregor zur Weltelite. Gilt als einer der innovativsten Trainer Europas."},
  {id:5,name:"Trevor Wittman",country:"🇺🇸 USA",style:"MMA / Striking",pupils:"Justin Gaethje, Nate Diaz",gym:"ONX Sports",titles:8,rating:9.4,exp:18,emoji:"⚡",accent:"#9B59B6",bio:"Bekannt für explosive Striking-Entwicklung und mentale Kampfvorbereitung."},
  {id:6,name:"Genki Sudo",country:"🇯🇵 Japan",style:"Grappling / MMA",pupils:"Zarah Fairn, Yuta Nakamura",gym:"World Order Dojo",titles:6,rating:9.2,exp:16,emoji:"🌊",accent:"#00FFD1",bio:"Legendärer Kämpfer und innovativer Trainer mit einzigartigem philosophischen Ansatz."},
  {id:7,name:"Martin Rooney",country:"🇺🇸 USA",style:"Conditioning",pupils:"Rashad Evans, Frank Mir",gym:"Training for Warriors",titles:20,rating:9.3,exp:25,emoji:"💪",accent:"#FF6B35",bio:"Fitness-Guru der MMA-Welt. Spezialist für kampfsportspezifische Konditionierung."},
  {id:8,name:"Virgil Hunter",country:"🇺🇸 USA",style:"Boxing",pupils:"Andre Ward, Amir Khan",gym:"Richmond Gyms",titles:9,rating:9.1,exp:30,emoji:"🏆",accent:"#FF1493",bio:"Gilt als einer der taktisch brillantesten Boxing-Trainer der Neuzeit."},
];

const sportsData = {
  "🏀 Basketball": {
    color: "#FF6B35", games: [
      {id:1,title:"Pickup Basketball",location:"Tempelhof Courts, Berlin",time:"Sa 15:00",players:"4/10",level:"Mittel",host:"Kevin S.",emoji:"🏀"},
      {id:2,title:"3on3 Tournament",location:"Beach Courts München",time:"So 12:00",players:"8/12",level:"Anfänger",host:"Lena M.",emoji:"🏆"},
      {id:3,title:"Abendrun Pickup",location:"Maschpark Hannover",time:"Fr 19:00",players:"2/10",level:"Profi",host:"Nico P.",emoji:"🌙"},
      {id:4,title:"Samstagskickoff",location:"Sportpark HH-Nord",time:"Sa 10:00",players:"6/10",level:"Mittel",host:"Jan T.",emoji:"☀️"},
    ]
  },
  "🎾 Tennis": {
    color: "#39FF14", games: [
      {id:1,title:"Casual Doubles",location:"TC Rot-Weiß Berlin",time:"So 10:00",players:"2/4",level:"Mittel",host:"Anna K.",emoji:"🎾"},
      {id:2,title:"Singles Sparring",location:"Stadtpark Courts HH",time:"Sa 14:00",players:"1/2",level:"Fortgeschritten",host:"Felix R.",emoji:"⚡"},
      {id:3,title:"Aufschlag-Training",location:"TC München-Süd",time:"Mo 18:00",players:"3/6",level:"Anfänger",host:"Maria S.",emoji:"🏅"},
    ]
  },
  "⚽ Fußball": {
    color: "#00B4D8", games: [
      {id:1,title:"5vs5 Hallenfußball",location:"Soccerhalle Berlin",time:"Do 20:00",players:"7/10",level:"Mittel",host:"Mehmet A.",emoji:"⚽"},
      {id:2,title:"Sonntagskick",location:"Stadtpark Köln",time:"So 11:00",players:"12/22",level:"Alle",host:"Thomas B.",emoji:"🌞"},
      {id:3,title:"Street Soccer Cup",location:"Tempelhofer Feld",time:"Sa 16:00",players:"16/20",level:"Fortgeschritten",host:"Diego R.",emoji:"🏙️"},
      {id:4,title:"Frauenfußball",location:"Sportanlage HH-Mitte",time:"Mi 19:00",players:"6/14",level:"Alle",host:"Sarah M.",emoji:"💪"},
    ]
  },
  "🏊 Schwimmen": {
    color: "#4FC3F7", games: [
      {id:1,title:"Masters Swim",location:"Stadtbad Mitte Berlin",time:"Mo 07:00",players:"4/8",level:"Fortgeschritten",host:"Petra L.",emoji:"🏊"},
      {id:2,title:"Freistil Training",location:"Olympiabad München",time:"Mi 18:30",players:"3/6",level:"Mittel",host:"Klaus H.",emoji:"🌊"},
    ]
  },
  "🏋️ Fitness": {
    color: "#FF1493", games: [
      {id:1,title:"Crossfit Session",location:"CrossFit Berlin Central",time:"Sa 09:00",players:"5/12",level:"Mittel",host:"Tom W.",emoji:"🔥"},
      {id:2,title:"Outdoor Workout",location:"Mauerpark Berlin",time:"So 10:00",players:"8/20",level:"Alle",host:"Lisa F.",emoji:"🌳"},
      {id:3,title:"Calisthenics",location:"Sportpark Frankfurt",time:"Sa 14:00",players:"4/10",level:"Fortgeschritten",host:"Ben S.",emoji:"💪"},
    ]
  },
  "🏐 Volleyball": {
    color: "#9B59B6", games: [
      {id:1,title:"Beach Volleyball",location:"Wannsee Berlin",time:"Sa 13:00",players:"4/12",level:"Mittel",host:"Chris B.",emoji:"🏖️"},
      {id:2,title:"Hallenvolleyball",location:"Sporthalle München-West",time:"Fr 20:00",players:"6/12",level:"Anfänger",host:"Nina G.",emoji:"⭐"},
    ]
  },
  "🥋 Kampfsport": {
    color: "#FF4500", games: [
      {id:1,title:"Open Mat BJJ",location:"Tiger Gym Berlin",time:"So 11:00",players:"8/20",level:"Alle",host:"Kai M.",emoji:"🥋"},
      {id:2,title:"Boxing Sparring",location:"Berserker BC",time:"Do 19:00",players:"3/10",level:"Mittel",host:"Felix W.",emoji:"🥊"},
      {id:3,title:"MMA Drilling",location:"Combat Base Munich",time:"Sa 15:00",players:"6/12",level:"Fortgeschritten",host:"Marco R.",emoji:"🔥"},
    ]
  },
};

const SWIPE_THRESHOLD = 80;

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0a0a0a;font-family:'DM Sans',sans-serif;}
  .fa{font-family:'Oswald',sans-serif!important;font-weight:600;letter-spacing:0.04em;}
  .fr{font-family:'Rajdhani',sans-serif!important;font-weight:700;}
  .fd{font-family:'DM Sans',sans-serif!important;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes slideIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
  .fade-up{animation:fadeUp 0.4s ease both;}
  input,select{outline:none;font-family:'DM Sans',sans-serif;}
  input::placeholder{color:#444;}
  ::-webkit-scrollbar{display:none;}
`;

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [tab, setTab] = useState("swipe");
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({name:"",age:"",city:"",gym:"",height:"",weight:"",weightClass:"",style:""});
  const [myStats, setMyStats] = useState({wins:0,losses:0,draws:0,ko:0});

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

  const allFighters=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weightClass:profile.weightClass,style:profile.style,wins:myStats.wins,losses:myStats.losses,draws:myStats.draws,ko:myStats.ko,emoji:"🥊",accent:"#FF4500",isMe:true},...mockFighters]:mockFighters;
  const rankedFighters=[...allFighters].filter(f=>rankFilter==="All"||f.style===rankFilter).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  const trainerStyles=["All","Boxing","MMA","Muay Thai","BJJ","Conditioning","Grappling"];
  const filteredTrainers=trainersData.filter(t=>trainerFilter==="All"||t.style.includes(trainerFilter)).sort((a,b)=>b.rating-a.rating);

  // ── SETUP ──
  if(screen==="setup") return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",flexDirection:"column",alignItems:"center",padding:"0 0 40px",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{css}</style>
      <div style={{width:"100%",maxWidth:420,padding:"32px 24px 0",textAlign:"center"}}>
        <div className="fr fade-up" style={{fontSize:68,color:"#fff",letterSpacing:6,lineHeight:1,textShadow:"0 0 40px #FF450088",textTransform:"uppercase"}}>FIGHTER</div>
        <div className="fade-up" style={{color:"#FF4500",fontSize:11,letterSpacing:8,marginTop:6,fontFamily:"'DM Sans',sans-serif",fontWeight:500,textTransform:"uppercase"}}>Finde deinen Gegner</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:22}}>
        {[1,2,3].map(s=><div key={s} style={{width:s===step?32:10,height:8,borderRadius:4,background:s<=step?"#FF4500":"#222",transition:"all 0.3s"}}/>)}
      </div>
      <div style={{width:"100%",maxWidth:380,padding:"22px 20px 0"}}>
        {step===1&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <FLabel>Dein Name</FLabel><FInput placeholder="z.B. Max Müller" value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
          <FLabel>Alter</FLabel><FInput placeholder="z.B. 25" type="number" value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
          <FLabel>Standort</FLabel><FInput placeholder="z.B. Berlin" value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))} icon="📍"/>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <FLabel>Dein Gym</FLabel><FInput placeholder="z.B. Tiger Gym Berlin" value={profile.gym} onChange={v=>setProfile(p=>({...p,gym:v}))} icon="🏋️"/>
          <FLabel>Kampfstil</FLabel>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:4}}>
            {FIGHT_STYLES.map(s=><button key={s} onClick={()=>setProfile(p=>({...p,style:s}))} style={{padding:"7px 13px",borderRadius:4,border:`1px solid ${profile.style===s?"#FF4500":"#2a2a2a"}`,background:profile.style===s?"#FF450022":"#111",color:profile.style===s?"#FF4500":"#666",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>{s}</button>)}
          </div>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:13}}>
          <div style={{display:"flex",gap:11}}>
            <div style={{flex:1}}><FLabel>Größe (cm)</FLabel><FInput placeholder="180" type="number" value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
            <div style={{flex:1}}><FLabel>Kampfgewicht (kg)</FLabel><FInput placeholder="77" type="number" value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
          </div>
          <FLabel>Gewichtsklasse</FLabel>
          <select value={profile.weightClass} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:8,padding:"12px 13px",color:profile.weightClass?"#fff":"#444",fontSize:14,width:"100%"}}>
            <option value="">Gewichtsklasse wählen</option>
            {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
          <FLabel>Dein Rekord (optional)</FLabel>
          <div style={{display:"flex",gap:7}}>
            {[["wins","SIEGE","#39FF14"],["losses","NIEDER","#FF4500"],["draws","UNENTSCH","#FFD700"],["ko","KOs","#FF4500"]].map(([key,label,color])=>(
              <div key={key} style={{flex:1,textAlign:"center"}}>
                <div style={{color,fontSize:9,letterSpacing:1,marginBottom:3}}>{label}</div>
                <input type="number" min="0" value={myStats[key]} onChange={e=>setMyStats(s=>({...s,[key]:parseInt(e.target.value)||0}))} style={{width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:6,padding:"9px 3px",color:"#fff",fontSize:20,textAlign:"center",fontFamily:"'Bebas Neue',cursive"}}/>
              </div>
            ))}
          </div>
        </div>}
        <div style={{display:"flex",gap:9,marginTop:22}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px",borderRadius:8,background:"transparent",border:"1px solid #2a2a2a",color:"#555",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,letterSpacing:2,cursor:"pointer",textTransform:"uppercase"}}>Zurück</button>}
          <button onClick={()=>{if(!canProceed())return;step<3?setStep(s=>s+1):setScreen("main");}} style={{flex:2,padding:"13px",borderRadius:8,background:canProceed()?"linear-gradient(135deg,#FF4500,#FF6B35)":"#1a1a1a",border:"none",color:canProceed()?"#fff":"#333",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,letterSpacing:3,cursor:canProceed()?"pointer":"not-allowed",boxShadow:canProceed()?"0 4px 20px #FF450044":"none",transition:"all 0.2s",textTransform:"uppercase"}}>
            {step===3?"Let's Fight":"Weiter →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  const tabs=[["swipe","🔥","FIGHT"],["stats","📊","STATS"],["gyms","🏋️","GYMS"],["ranking","🏆","RANG"],["trainer","🎓","TRAINER"],["sports","🎯","SPORTS"]];

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"'Barlow Condensed',sans-serif",display:"flex",flexDirection:"column"}}
      onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
      <style>{css}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px 5px",flexShrink:0,borderBottom:"1px solid #111"}}>
        <div style={{color:"#333",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>❌ {swipeStats.declines}</div>
        <div className="fr" style={{fontSize:30,color:"#fff",letterSpacing:6,textShadow:"0 0 14px #FF450055",textTransform:"uppercase"}}>FIGHTER</div>
        <div style={{color:"#FF4500",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>⚔️ {swipeStats.challenges}</div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:65}}>

        {/* ══ SWIPE ══ */}
        {tab==="swipe"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:8}}>
            <div style={{width:"calc(100% - 24px)",maxWidth:380,margin:"0 0 8px",background:"#111",borderRadius:10,padding:"9px 12px",border:"1px solid #1a1a1a",display:"flex",alignItems:"center",gap:9}}>
              <div style={{fontSize:20}}>🥊</div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:13}}>{profile.name}, {profile.age} · {profile.city}</div>
                <div style={{color:"#FF4500",fontSize:11,marginTop:1}}>{profile.style} · {profile.weightClass?.split(" (")[0]} · {profile.gym}</div>
              </div>
              <div style={{color:"#333",fontSize:10,textAlign:"right"}}>{profile.height}cm<br/>{profile.weight}kg</div>
            </div>
            <div style={{position:"relative",width:330,height:430,flexShrink:0}}>
              {cards.length===0?(
                <div style={{width:"100%",height:"100%",borderRadius:16,background:"#111",border:"2px dashed #1a1a1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:11}}>
                  <div style={{fontSize:46}}>🏆</div>
                  <div className="fr" style={{color:"#fff",fontSize:24,letterSpacing:2}}>ALLE GESEHEN</div>
                  <div style={{color:"#444",fontSize:12}}>{matches.length} Fight Requests</div>
                  <button onClick={()=>{setCards([...mockFighters]);setSwipeStats({challenges:0,declines:0});setMatches([]);}} style={{marginTop:6,padding:"9px 22px",borderRadius:6,background:"linear-gradient(135deg,#FF4500,#FF6B35)",color:"#fff",border:"none",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,letterSpacing:2,cursor:"pointer",textTransform:"uppercase"}}>Nochmal</button>
                </div>
              ):cards.map((f,idx)=>{
                const isTop=idx===cards.length-1,isSecond=idx===cards.length-2;
                return(
                  <div key={f.id} onMouseDown={isTop?handleDragStart:undefined} onTouchStart={isTop?handleDragStart:undefined}
                    style={{position:"absolute",inset:0,borderRadius:16,background:"#0e0e0e",border:`1px solid ${f.accent}22`,boxShadow:isTop?"0 14px 44px rgba(0,0,0,0.55)":"none",cursor:isTop?"grab":"default",zIndex:isTop?10:isSecond?5:1,transform:isTop?cardStyle.transform:isSecond?"scale(0.96) translateY(10px)":"scale(0.92) translateY(20px)",transition:isTop?cardStyle.transition:"none",overflow:"hidden",display:"flex",flexDirection:"column",userSelect:"none"}}>
                    <div style={{height:3,background:`linear-gradient(90deg,${f.accent},transparent)`}}/>
                    {isTop&&<>
                      <div style={{position:"absolute",top:18,left:16,border:"3px solid #39FF14",borderRadius:5,padding:"2px 8px",color:"#39FF14",fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3,transform:"rotate(-18deg)",opacity:fightOp,transition:dragging?"none":"opacity 0.12s"}}>FIGHT</div>
                      <div style={{position:"absolute",top:18,right:16,border:"3px solid #FF4500",borderRadius:5,padding:"2px 8px",color:"#FF4500",fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3,transform:"rotate(18deg)",opacity:passOp,transition:dragging?"none":"opacity 0.12s"}}>PASS</div>
                    </>}
                    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`radial-gradient(circle at 50% 50%,${f.accent}09,transparent 65%)`}}>
                      <div style={{fontSize:72,filter:`drop-shadow(0 0 14px ${f.accent}44)`}}>{f.emoji}</div>
                      <div style={{marginTop:9,display:"flex",gap:11}}>
                        {[{v:f.wins,l:"SIEGE",c:"#39FF14"},{v:f.losses,l:"NIEDER",c:"#FF4500"},{v:f.draws,l:"UNENTSCH",c:"#FFD700"}].map(({v,l,c})=>(
                          <div key={l} style={{textAlign:"center"}}><div className="fr" style={{color:c,fontSize:20}}>{v}</div><div style={{color:"#2a2a2a",fontSize:8,letterSpacing:1}}>{l}</div></div>
                        ))}
                      </div>
                    </div>
                    <div style={{padding:"10px 14px 14px",background:"rgba(0,0,0,0.55)",borderTop:`1px solid ${f.accent}18`}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div><div className="fr" style={{color:"#fff",fontSize:24,letterSpacing:1.5,lineHeight:1}}>{f.name}</div><div style={{color:f.accent,fontSize:11,fontWeight:700,marginTop:1,letterSpacing:1}}>{f.style.toUpperCase()}</div></div>
                        <div style={{textAlign:"right"}}><div style={{color:"#444",fontSize:11}}>{f.height} cm</div><div style={{color:"#444",fontSize:11}}>{f.weight} kg</div></div>
                      </div>
                      <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                        <FTag color="#161616" text={`📍 ${f.city}`}/><FTag color="#121212" text={`🏋️ ${f.gym}`}/><FTag color={`${f.accent}12`} text={f.weightClass} accent={f.accent}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cards.length>0&&(
              <div style={{display:"flex",gap:16,alignItems:"center",marginTop:10}}>
                <RoundBtn onClick={()=>swipe("decline")} color="#FF4500" icon="✕" size={54}/>
                <RoundBtn onClick={()=>swipe("challenge")} color="#39FF14" icon="⚔️" size={64} primary label="FIGHT"/>
                <RoundBtn onClick={()=>swipe("decline")} color="#FFD700" icon="⭐" size={54}/>
              </div>
            )}
            {matches.length>0&&(
              <div style={{marginTop:11,width:"calc(100% - 24px)",maxWidth:380}}>
                <div style={{color:"#222",fontSize:9,letterSpacing:2,marginBottom:6}}>FIGHT REQUESTS</div>
                <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:2}}>
                  {matches.map(f=>(
                    <div key={f.id} style={{textAlign:"center",flexShrink:0}}>
                      <div style={{width:42,height:42,borderRadius:6,background:"#111",border:`2px solid ${f.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:`0 0 7px ${f.accent}33`}}>{f.emoji}</div>
                      <div style={{color:"#666",fontSize:9,marginTop:2}}>{f.name.split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STATS ══ */}
        {tab==="stats"&&(
          <div style={{padding:"10px 13px 16px",maxWidth:420,margin:"0 auto"}}>
            <div style={{background:"#111",borderRadius:14,padding:"16px",border:"1px solid #1a1a1a",marginBottom:11,textAlign:"center"}}>
              <div style={{fontSize:44,marginBottom:5}}>🥊</div>
              <div className="fr" style={{color:"#fff",fontSize:26,letterSpacing:2,textTransform:"uppercase"}}>{profile.name}</div>
              <div style={{color:"#FF4500",fontSize:13,fontWeight:600,marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>{profile.style} · {profile.weightClass?.split(" (")[0]}</div>
              <div style={{color:"#444",fontSize:11,marginTop:3,fontFamily:"'DM Sans',sans-serif"}}>📍 {profile.city} · 🏋️ {profile.gym}</div>
              <div style={{color:"#2a2a2a",fontSize:11,marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>{profile.height} cm · {profile.weight} kg</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:9}}>
              {[["SIEGE",myStats.wins,"#39FF14"],["NIEDERLAGEN",myStats.losses,"#FF4500"],["UNENTSCHIEDEN",myStats.draws,"#FFD700"]].map(([label,val,color])=>(
                <div key={label} style={{background:"#111",borderRadius:11,padding:"13px 5px",textAlign:"center",border:`1px solid ${color}15`}}>
                  <div className="fr" style={{color,fontSize:38,lineHeight:1}}>{val}</div>
                  <div style={{color:"#2a2a2a",fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:9}}>
              {[["KO / TKO",myStats.ko,"#FF4500",`KO-Rate: ${koRate}%`,koRate],["SIEGRATE",`${winRate}%`,"#39FF14",`${totalFights} Kämpfe`,winRate]].map(([label,val,color,sub,pct])=>(
                <div key={label} style={{background:"#111",borderRadius:11,padding:"13px",border:`1px solid ${color}15`}}>
                  <div style={{color:"#333",fontSize:9,letterSpacing:2}}>{label}</div>
                  <div className="fr" style={{color,fontSize:32,marginTop:3}}>{val}</div>
                  <div style={{color:"#2a2a2a",fontSize:10,marginTop:2}}>{sub}</div>
                  <div style={{marginTop:6,height:3,background:"#1a1a1a",borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}77)`,borderRadius:2,transition:"width 0.8s ease"}}/></div>
                </div>
              ))}
            </div>
            <div style={{background:"#111",borderRadius:11,padding:"13px",border:"1px solid #1a1a1a",marginBottom:9}}>
              <div style={{color:"#2a2a2a",fontSize:9,letterSpacing:2,marginBottom:11}}>REKORD BEARBEITEN</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5}}>
                {[["wins","SIEGE","#39FF14"],["losses","NIEDER","#FF4500"],["draws","UNENTSCH","#FFD700"],["ko","KOs","#FF6B35"]].map(([key,label,color])=>(
                  <div key={key} style={{textAlign:"center"}}>
                    <div style={{color:"#2a2a2a",fontSize:8,letterSpacing:1,marginBottom:3}}>{label}</div>
                    <button onClick={()=>setMyStats(s=>({...s,[key]:s[key]+1}))} style={{width:"100%",background:"#1a1a1a",border:`1px solid ${color}18`,borderRadius:4,color,fontSize:13,cursor:"pointer",padding:"3px 0",marginBottom:3}}>+</button>
                    <div className="fr" style={{color,fontSize:20}}>{myStats[key]}</div>
                    <button onClick={()=>setMyStats(s=>({...s,[key]:Math.max(0,s[key]-1)}))} style={{width:"100%",background:"#1a1a1a",border:"1px solid #1e1e1e",borderRadius:4,color:"#333",fontSize:13,cursor:"pointer",padding:"3px 0",marginTop:3}}>−</button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#111",borderRadius:11,padding:"13px",border:"1px solid #1a1a1a"}}>
              <div style={{color:"#2a2a2a",fontSize:9,letterSpacing:2,marginBottom:9}}>SESSION</div>
              <div style={{display:"flex",justifyContent:"space-around"}}>
                {[["⚔️",swipeStats.challenges,"CHALLENGES","#39FF14"],["❌",swipeStats.declines,"SKIPS","#FF4500"],["🔥",matches.length,"MATCHES","#FFD700"]].map(([icon,val,label,color])=>(
                  <div key={label} style={{textAlign:"center"}}><div style={{fontSize:20}}>{icon}</div><div className="fr" style={{color,fontSize:26}}>{val}</div><div style={{color:"#2a2a2a",fontSize:8,letterSpacing:1}}>{label}</div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ GYMS ══ */}
        {tab==="gyms"&&(
          <div style={{padding:"10px 13px 16px",maxWidth:420,margin:"0 auto"}}>
            <div className="fr" style={{color:"#fff",fontSize:22,letterSpacing:3,marginBottom:11}}>GYMS FINDEN</div>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:7,marginBottom:11}}>
              {Object.keys(gymsData).map(city=><button key={city} onClick={()=>setSelectedCity(city)} style={{flexShrink:0,padding:"6px 13px",borderRadius:20,background:selectedCity===city?"#FF4500":"#111",border:`1px solid ${selectedCity===city?"#FF4500":"#222"}`,color:selectedCity===city?"#fff":"#555",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>{city}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {gymsData[selectedCity].map((gym,i)=>(
                <div key={i} style={{background:"#111",borderRadius:12,padding:"13px",border:"1px solid #1a1a1a"}}>
                  <div style={{display:"flex",gap:11,alignItems:"flex-start"}}>
                    <div style={{width:46,height:46,borderRadius:9,background:"#1a1a1a",border:"1px solid #222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{gym.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{gym.name}</div>
                      <div style={{color:"#444",fontSize:11,marginTop:1}}>📍 {gym.address}</div>
                      <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                        {gym.styles.map(s=><FTag key={s} color="#FF450012" text={s} accent="#FF4500"/>)}
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{color:"#444",fontSize:12}}>👥 {gym.members} Mitglieder</div>
                    <div style={{display:"flex",alignItems:"center",gap:3}}><span style={{color:"#FFD700"}}>★</span><span style={{color:"#fff",fontWeight:700,fontSize:14}}>{gym.rating}</span></div>
                  </div>
                  <div style={{marginTop:6,height:3,background:"#1a1a1a",borderRadius:2}}><div style={{height:"100%",width:`${((gym.rating-4)/1)*100}%`,background:"linear-gradient(90deg,#FF4500,#FFD700)",borderRadius:2}}/></div>
                </div>
              ))}
            </div>
            <div style={{marginTop:11,background:"#0e0e0e",borderRadius:10,padding:"11px",border:"1px solid #161616",display:"flex",justifyContent:"space-around"}}>
              {[[gymsData[selectedCity].length,"GYMS","#FF4500"],[gymsData[selectedCity].reduce((a,g)=>a+g.members,0),"MITGLIEDER","#39FF14"],[(gymsData[selectedCity].reduce((a,g)=>a+g.rating,0)/gymsData[selectedCity].length).toFixed(1),"Ø WERTUNG","#FFD700"]].map(([val,label,color])=>(
                <div key={label} style={{textAlign:"center"}}><div className="fr" style={{color,fontSize:24}}>{val}</div><div style={{color:"#2a2a2a",fontSize:8,letterSpacing:1}}>{label}</div></div>
              ))}
            </div>
          </div>
        )}

        {/* ══ RANKING ══ */}
        {tab==="ranking"&&(
          <div style={{padding:"10px 13px 16px",maxWidth:420,margin:"0 auto"}}>
            <div className="fr" style={{color:"#fff",fontSize:22,letterSpacing:3,marginBottom:11}}>WELTRANGLISTE</div>
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:7,marginBottom:11}}>
              {["All",...FIGHT_STYLES].map(s=><button key={s} onClick={()=>setRankFilter(s)} style={{flexShrink:0,padding:"5px 11px",borderRadius:16,background:rankFilter===s?"#FF4500":"#111",border:`1px solid ${rankFilter===s?"#FF4500":"#222"}`,color:rankFilter===s?"#fff":"#555",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>{s==="All"?"Alle":s}</button>)}
            </div>
            {rankedFighters.length>=3&&(
              <div style={{display:"flex",alignItems:"flex-end",gap:5,marginBottom:13,justifyContent:"center"}}>
                {[rankedFighters[1],rankedFighters[0],rankedFighters[2]].map((f,i)=>{
                  const heights=[96,118,80],places=[2,1,3],colors=["#C0C0C0","#FFD700","#CD7F32"];
                  return(<div key={f.id} style={{flex:1,maxWidth:105,display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <div style={{fontSize:26,marginBottom:2}}>{f.emoji}</div>
                    <div style={{color:f.isMe?"#FF4500":"#ccc",fontSize:11,fontWeight:700,textAlign:"center",lineHeight:1.2}}>{f.name.split(" ")[0]}</div>
                    <div style={{color:"#333",fontSize:9}}>{f.wins}W-{f.losses}L</div>
                    <div style={{width:"100%",height:heights[i],background:`${colors[i]}12`,border:`1px solid ${colors[i]}2a`,borderRadius:"5px 5px 0 0",marginTop:5,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <div className="fr" style={{color:colors[i],fontSize:28}}>#{places[i]}</div>
                    </div>
                  </div>);
                })}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {rankedFighters.map((f,i)=>{
                const score=f.wins*3-f.losses*2+f.draws,rankColors=["#FFD700","#C0C0C0","#CD7F32"];
                return(<div key={f.id} style={{background:f.isMe?"#FF450010":"#111",borderRadius:9,padding:"10px 12px",border:`1px solid ${f.isMe?"#FF450033":i<3?`${rankColors[i]}1a`:"#1a1a1a"}`,display:"flex",alignItems:"center",gap:9}}>
                  <div className="fr" style={{color:i<3?rankColors[i]:"#222",fontSize:18,width:24,textAlign:"center"}}>#{i+1}</div>
                  <div style={{fontSize:22}}>{f.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{color:f.isMe?"#FF4500":"#fff",fontWeight:700,fontSize:13}}>{f.name}</div>
                      {f.isMe&&<div style={{background:"#FF450018",border:"1px solid #FF450033",borderRadius:3,padding:"1px 4px",color:"#FF4500",fontSize:8,fontWeight:700,letterSpacing:1}}>ICH</div>}
                    </div>
                    <div style={{color:"#333",fontSize:10,marginTop:1}}>{f.style} · {f.city}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{display:"flex",gap:4,fontSize:11,justifyContent:"flex-end",fontWeight:700}}>
                      <span style={{color:"#39FF14"}}>{f.wins}W</span><span style={{color:"#FF4500"}}>{f.losses}L</span><span style={{color:"#FFD700"}}>{f.draws}D</span>
                    </div>
                    <div style={{color:"#FF4500",fontSize:10,marginTop:1}}>{score} Pkt</div>
                  </div>
                </div>);
              })}
            </div>
            <div style={{color:"#1e1e1e",fontSize:9,textAlign:"center",marginTop:11,letterSpacing:1}}>SIEG +3 · UNENTSCH +1 · NIEDERLAGE -2</div>
          </div>
        )}

        {/* ══ TRAINER ══ */}
        {tab==="trainer"&&(
          <div style={{padding:"10px 13px 16px",maxWidth:420,margin:"0 auto"}}>
            <div className="fr" style={{color:"#fff",fontSize:22,letterSpacing:3,marginBottom:4}}>TOP TRAINER</div>
            <div style={{color:"#444",fontSize:12,marginBottom:11}}>Die besten Coaches der Welt</div>
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:7,marginBottom:11}}>
              {trainerStyles.map(s=><button key={s} onClick={()=>setTrainerFilter(s)} style={{flexShrink:0,padding:"5px 11px",borderRadius:16,background:trainerFilter===s?"#FFD700":"#111",border:`1px solid ${trainerFilter===s?"#FFD700":"#222"}`,color:trainerFilter===s?"#000":"#555",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>{s==="All"?"Alle":s}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredTrainers.map((t,i)=>(
                <div key={t.id} style={{background:"#111",borderRadius:13,border:`1px solid ${t.accent}22`,overflow:"hidden"}}>
                  <div style={{height:3,background:`linear-gradient(90deg,${t.accent},transparent)`}}/>
                  <div style={{padding:"14px"}}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{position:"relative",flexShrink:0}}>
                        <div style={{width:58,height:58,borderRadius:12,background:`${t.accent}18`,border:`2px solid ${t.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{t.emoji}</div>
                        <div style={{position:"absolute",bottom:-6,right:-6,background:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#1a1a1a",border:"1px solid #0a0a0a",borderRadius:10,padding:"1px 5px"}}>
                          <div className="fr" style={{color:i<3?["#000","#000","#fff"][i]:"#555",fontSize:11}}>#{i+1}</div>
                        </div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div>
                            <div style={{color:"#fff",fontWeight:700,fontSize:16,lineHeight:1}}>{t.name}</div>
                            <div style={{color:t.accent,fontSize:11,fontWeight:700,marginTop:2,letterSpacing:1}}>{t.style.toUpperCase()}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                              <span style={{color:"#FFD700",fontSize:14}}>★</span>
                              <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{t.rating}</span>
                            </div>
                            <div style={{color:"#333",fontSize:10}}>{t.exp} Jahre</div>
                          </div>
                        </div>
                        <div style={{color:"#555",fontSize:11,marginTop:3}}>{t.country}</div>
                        <div style={{color:"#444",fontSize:11,marginTop:1}}>🏋️ {t.gym}</div>
                      </div>
                    </div>
                    <div style={{marginTop:10,color:"#555",fontSize:12,lineHeight:1.5,borderTop:"1px solid #1a1a1a",paddingTop:9}}>{t.bio}</div>
                    <div style={{marginTop:9,background:"#0e0e0e",borderRadius:8,padding:"8px 10px"}}>
                      <div style={{color:"#333",fontSize:9,letterSpacing:2,marginBottom:5}}>BEKANNTE SCHÜLER</div>
                      <div style={{color:"#666",fontSize:12,fontWeight:600}}>{t.pupils}</div>
                    </div>
                    <div style={{marginTop:9,display:"flex",gap:10}}>
                      <div style={{flex:1,textAlign:"center",background:"#0e0e0e",borderRadius:7,padding:"8px 4px"}}>
                        <div className="fr" style={{color:t.accent,fontSize:22}}>{t.titles}</div>
                        <div style={{color:"#333",fontSize:8,letterSpacing:1}}>WELTMEISTER</div>
                      </div>
                      <div style={{flex:1,textAlign:"center",background:"#0e0e0e",borderRadius:7,padding:"8px 4px"}}>
                        <div className="fr" style={{color:"#FFD700",fontSize:22}}>{t.exp}J</div>
                        <div style={{color:"#333",fontSize:8,letterSpacing:1}}>ERFAHRUNG</div>
                      </div>
                      <div style={{flex:1,textAlign:"center",background:"#0e0e0e",borderRadius:7,padding:"8px 4px"}}>
                        <div className="fr" style={{color:"#39FF14",fontSize:22}}>{t.rating}</div>
                        <div style={{color:"#333",fontSize:8,letterSpacing:1}}>BEWERTUNG</div>
                      </div>
                    </div>
                    <div style={{marginTop:8,height:3,background:"#1a1a1a",borderRadius:2}}>
                      <div style={{height:"100%",width:`${(t.rating/10)*100}%`,background:`linear-gradient(90deg,${t.accent},${t.accent}66)`,borderRadius:2}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SPORTS ══ */}
        {tab==="sports"&&(
          <div style={{padding:"10px 13px 16px",maxWidth:420,margin:"0 auto"}}>
            <div className="fr" style={{color:"#fff",fontSize:22,letterSpacing:3,marginBottom:4}}>SPORTARTEN</div>
            <div style={{color:"#444",fontSize:12,marginBottom:11}}>Finde Events & Pickup-Games in deiner Stadt</div>

            {/* Sport selector */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:14}}>
              {Object.keys(sportsData).map(sport=>{
                const {color}=sportsData[sport];
                const isSelected=selectedSport===sport;
                return(
                  <button key={sport} onClick={()=>setSelectedSport(sport)} style={{padding:"12px 10px",borderRadius:11,background:isSelected?`${color}22`:"#111",border:`1px solid ${isSelected?color:"#1e1e1e"}`,cursor:"pointer",transition:"all 0.2s",textAlign:"left"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{sport.split(" ")[0]}</div>
                    <div style={{color:isSelected?color:"#555",fontWeight:700,fontSize:13,fontFamily:"'Barlow Condensed',sans-serif"}}>{sport.split(" ").slice(1).join(" ")}</div>
                    <div style={{color:"#333",fontSize:10,marginTop:2}}>{sportsData[sport].games.length} Events</div>
                  </button>
                );
              })}
            </div>

            {/* Games list */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{height:1,flex:1,background:"#1a1a1a"}}/>
              <div className="fr" style={{color:sportsData[selectedSport].color,fontSize:14,letterSpacing:3}}>{selectedSport}</div>
              <div style={{height:1,flex:1,background:"#1a1a1a"}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {sportsData[selectedSport].games.map(game=>{
                const {color}=sportsData[selectedSport];
                const [cur,max]=game.players.split("/").map(Number);
                const pct=(cur/max)*100;
                const full=cur>=max;
                const joined=joinedGames[`${selectedSport}-${game.id}`];
                return(
                  <div key={game.id} style={{background:"#111",borderRadius:12,overflow:"hidden",border:`1px solid ${color}1a`}}>
                    <div style={{height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
                    <div style={{padding:"13px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div style={{display:"flex",gap:10,alignItems:"center"}}>
                          <div style={{fontSize:28}}>{game.emoji}</div>
                          <div>
                            <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{game.title}</div>
                            <div style={{color:"#444",fontSize:11,marginTop:1}}>📍 {game.location}</div>
                          </div>
                        </div>
                        <div style={{background:`${color}18`,border:`1px solid ${color}33`,borderRadius:6,padding:"3px 8px",textAlign:"center",flexShrink:0}}>
                          <div style={{color,fontSize:11,fontWeight:700}}>{game.level}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{display:"flex",gap:12}}>
                          <div style={{color:"#555",fontSize:12}}>🕐 {game.time}</div>
                          <div style={{color:"#555",fontSize:12}}>👤 {game.host}</div>
                        </div>
                        <div style={{color:full?"#FF4500":color,fontSize:12,fontWeight:700}}>{game.players} Spieler</div>
                      </div>
                      <div style={{height:4,background:"#1a1a1a",borderRadius:3,marginBottom:9}}>
                        <div style={{height:"100%",width:`${pct}%`,background:full?`linear-gradient(90deg,#FF4500,#FF6B35)`:`linear-gradient(90deg,${color},${color}77)`,borderRadius:3,transition:"width 0.6s ease"}}/>
                      </div>
                      <button
                        onClick={()=>setJoinedGames(j=>({...j,[`${selectedSport}-${game.id}`]:!j[`${selectedSport}-${game.id}`]}))}
                        disabled={full&&!joined}
                        style={{width:"100%",padding:"10px",borderRadius:8,background:joined?"#1a2a1a":full?"#1a1a1a":`linear-gradient(135deg,${color}cc,${color})`,border:joined?`1px solid ${color}44`:"none",color:joined?color:full?"#333":"#000",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:1.5,cursor:full&&!joined?"not-allowed":"pointer",transition:"all 0.2s",textTransform:"uppercase"}}>
                        {joined?"✓ Beigetreten":full?"Ausgebucht":"Mitmachen"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button style={{width:"100%",marginTop:12,padding:"12px",borderRadius:10,background:"transparent",border:`2px dashed ${sportsData[selectedSport].color}44`,color:sportsData[selectedSport].color,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:2,cursor:"pointer",textTransform:"uppercase"}}>
              + Eigenes Event erstellen
            </button>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0d0d0d",borderTop:"1px solid #161616",display:"flex",height:58,zIndex:50}}>
        {tabs.map(([id,icon,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",gap:1,borderTop:tab===id?"2px solid #FF4500":"2px solid transparent",transition:"all 0.2s"}}>
            <div style={{fontSize:16}}>{icon}</div>
            <div style={{color:tab===id?"#FF4500":"#222",fontSize:9,letterSpacing:0.5,fontFamily:"'DM Sans',sans-serif",fontWeight:700,textTransform:"uppercase"}}>{label}</div>
          </button>
        ))}
      </div>

      {/* Match Modal */}
      {matchedFighter&&(
        <div onClick={()=>setMatchedFighter(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:100,gap:12,animation:"slideIn 0.3s ease"}}>
          <div className="fr" style={{color:"#FF4500",fontSize:12,letterSpacing:8}}>FIGHT ACCEPTED</div>
          <div className="fr" style={{fontSize:46,color:"#fff",letterSpacing:4,textAlign:"center",lineHeight:1,animation:"pulse 1.2s infinite"}}>IT'S ON!</div>
          <div style={{fontSize:50,filter:`drop-shadow(0 0 16px ${matchedFighter.accent})`}}>{matchedFighter.emoji}</div>
          <div className="fr" style={{color:"#fff",fontSize:23,letterSpacing:2}}>{matchedFighter.name}</div>
          <div style={{color:matchedFighter.accent,fontSize:12,fontWeight:700}}>{matchedFighter.style} · {matchedFighter.weightClass}</div>
          <div style={{color:"#444",fontSize:11}}>{matchedFighter.gym}, {matchedFighter.city}</div>
          <button style={{marginTop:5,padding:"10px 24px",borderRadius:6,background:"linear-gradient(135deg,#FF4500,#FF6B35)",color:"#fff",border:"none",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,letterSpacing:2,cursor:"pointer",textTransform:"uppercase"}}>Fight anfordern 🥊</button>
          <div style={{color:"#2a2a2a",fontSize:10}}>Tippen zum Schließen</div>
        </div>
      )}
    </div>
  );
}

function FLabel({children}){return <div style={{color:"#555",fontSize:11,fontWeight:600,letterSpacing:1.5,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase"}}>{children}</div>;}
function FInput({placeholder,value,onChange,type="text",icon}){
  return(<div style={{position:"relative"}}>
    {icon&&<span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13}}>{icon}</span>}
    <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",background:"#111",border:"1px solid #1e1e1e",borderRadius:8,padding:`12px ${icon?"12px 12px 34px":"13px"}`,color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif",fontWeight:400,transition:"border-color 0.2s"}}
      onFocus={e=>e.target.style.borderColor="#FF4500"} onBlur={e=>e.target.style.borderColor="#1e1e1e"}/>
  </div>);
}
function FTag({text,color,accent}){return <div style={{padding:"2px 7px",borderRadius:3,background:color,color:accent||"#444",fontSize:10,fontWeight:600,border:accent?`1px solid ${accent}18`:"none",fontFamily:"'DM Sans',sans-serif"}}>{text}</div>;}
function RoundBtn({onClick,color,icon,size,primary,label}){
  const [h,setH]=useState(false);
  return(<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{width:size,height:size,borderRadius:primary?11:"50%",background:primary?`linear-gradient(135deg,${color}cc,${color})`:`${color}10`,border:primary?"none":`2px solid ${color}22`,fontSize:primary?21:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:1,transform:h?"scale(1.1)":"scale(1)",transition:"all 0.2s",boxShadow:primary?`0 5px 16px ${color}33`:"none"}}>
    {icon}
    {primary&&<div style={{color:"#000",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>{label}</div>}
  </button>);
}
