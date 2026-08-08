// Der komplette Admin-Bereich mit allen Unter-Tabs: Analytics-Dashboard,
// Gym-Verwaltung, Nutzer, Meldungen, Rekord-Antraege, Feedback, Equipment,
// Broadcast, Staedte-Scanner und Echtzeit-Statistiken.
//
// Bewusst als eigene Datei ausgelagert - mit ueber 1300 Zeilen war das der
// groesste zusammenhaengende Block in App.js.
//
// AUFBAU: Die 35 Zustaende, die AUSSCHLIESSLICH der Admin-Bereich braucht
// (adminTab, adminUsers, dashData, ...), leben jetzt hier drin. Alles, was
// auch der Rest der App nutzt (session, dbGyms, showMsg, ...), kommt als
// Prop herein.
//
// BEWUSSTE AENDERUNG: Weil diese Zustaende jetzt hier leben und der
// Admin-Bereich beim Schliessen ausgebaut wird, sind geladene Listen nach
// erneutem Oeffnen wieder leer - man drueckt "Laden" dann nochmal.
// Das betrifft ausschliesslich den Admin, nie die normalen Nutzer.

import React, { useState, useEffect } from 'react';
import { SUPA_URL, SUPA_KEY, RED, APP_STORE_ID } from './constants';
import { adminFetch, uploadPhoto } from './supabaseApi';
import { buildTimeSeries, activeUserCounts, countSince, equipmentRanking, totalEquipmentClicks, eventRevenue, eventParticipationStats, gymStats, rankingActiveCount, DAY_MS } from './adminAnalytics';

export default function AdminPanel({
  session, darkMode, appLang, t,
  dbGyms, gymLogos, events, eventParticipants, GYMS,
  setShowAdmin, setViewProfile, setAllProfiles, setGymLogos,
  showMsg, loadDbGyms, loadEvents, loadGymLogos, compressImage, startAdminChat,
}) {
  const [scanResult,setScanResult]=useState(null);
  const [editGymId,setEditGymId]=useState(null);
  const [gymSearchLoading,setGymSearchLoading]=useState(false);
  const [gymSearchQuery,setGymSearchQuery]=useState('');
  const [gymShowUnverifiedOnly,setGymShowUnverifiedOnly]=useState(false);
  const [templates,setTemplates]=useState([]);
  const [templatesLoaded,setTemplatesLoaded]=useState(false);
  const [messagingUserId,setMessagingUserId]=useState(null);
  const [messagingText,setMessagingText]=useState('');

  async function loadTemplates(){
    try{
      const r=await adminFetch(SUPA_URL+'/rest/v1/admin_message_templates?order=created_at.desc',{},session?.token);
      const data=await r.json();
      setTemplates(Array.isArray(data)?data:[]);
      setTemplatesLoaded(true);
    }catch(e){console.error('loadTemplates',e);}
  }

  async function saveAsTemplate(text){
    if(!text||!text.trim())return;
    const name=window.prompt('Name für diese Vorlage:');
    if(!name||!name.trim())return;
    try{
      await adminFetch(SUPA_URL+'/rest/v1/admin_message_templates',{
        method:'POST',headers:{Prefer:'return=minimal'},
        body:JSON.stringify({name:name.trim(),text:text.trim()})
      },session?.token);
      showMsg('✅ Vorlage gespeichert');
      await loadTemplates();
    }catch(e){showMsg('Fehler: '+e.message);}
  }

  async function deleteTemplate(id){
    if(!window.confirm('Vorlage löschen?'))return;
    try{
      await adminFetch(SUPA_URL+'/rest/v1/admin_message_templates?id=eq.'+id,{method:'DELETE'},session?.token);
      await loadTemplates();
    }catch(e){showMsg('Fehler: '+e.message);}
  }

  function renderTemplateChips(onPick){
    if(templates.length===0)return null;
    return(
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {templates.map(t=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 4px 4px 10px',borderRadius:14,background:darkMode?'#1a1a1a':'#f0f0f0',border:'1px solid '+(darkMode?'#2a2a2a':'#ddd')}}>
            <span onClick={()=>onPick(t.text)} style={{color:darkMode?'#ccc':'#333',fontSize:11,cursor:'pointer'}}>{t.name}</span>
            <span onClick={()=>deleteTemplate(t.id)} style={{color:'#e74c3c',fontSize:11,cursor:'pointer',padding:'0 4px'}}>×</span>
          </div>
        ))}
      </div>
    );
  }
  const [adminTab,setAdminTab]=useState('gyms');
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminReports,setAdminReports]=useState([]);
  const [adminRecords,setAdminRecords]=useState([]);
  const [adminGymName,setAdminGymName]=useState('');
  const [adminGymCity,setAdminGymCity]=useState('');
  const [adminGymStyles,setAdminGymStyles]=useState('');
  const [adminGymPhone,setAdminGymPhone]=useState('');
  const [adminGymHours,setAdminGymHours]=useState('');
  const [adminGymDesc,setAdminGymDesc]=useState('');
  const [adminGymAddress,setAdminGymAddress]=useState('');
  const [adminCityGymName,setAdminCityGymName]=useState('');
  const [adminBroadcast,setAdminBroadcast]=useState('');
  const [adminCityName,setAdminCityName]=useState('');
  const [adminSaving,setAdminSaving]=useState(false);
  const [adminFeedback,setAdminFeedback]=useState([]);
  const [feedbackFilter,setFeedbackFilter]=useState('alle');
  const [equipmentList,setEquipmentList]=useState([]);
  const [equipLoading,setEquipLoading]=useState(false);
  const [newEquip,setNewEquip]=useState({brand:'',product:'',description:'',category:'Boxen',url:'',image_url:'',discount_code:'',featured:false,item_type:'equipment'});
  const [equipmentTypeFilter,setEquipmentTypeFilter]=useState('equipment');
  const [gymCodesList,setGymCodesList]=useState(null);
  const [gymCodesLoading,setGymCodesLoading]=useState(false);
  const [gymCodeSearch,setGymCodeSearch]=useState('');
  const [dupeCleanRunning,setDupeCleanRunning]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [editingEquip,setEditingEquip]=useState(null);
  const [editEquipForm,setEditEquipForm]=useState(null);
  const [equipLoadedOnce,setEquipLoadedOnce]=useState(false);

  async function loadEquipmentList(){
    setEquipLoading(true);
    try{
      const res=await adminFetch(SUPA_URL+'/rest/v1/equipment?order=featured.desc,sort_order.asc',{},session?.token);
      const data=await res.json();
      setEquipmentList(Array.isArray(data)?data:[]);
    }catch(e){showMsg('Fehler: '+e.message);}
    setEquipLoading(false);
    setEquipLoadedOnce(true);
  }

  useEffect(()=>{
    if(adminTab==='equipment'&&!equipLoadedOnce&&!equipLoading){
      loadEquipmentList();
    }
    if((adminTab==='users'||adminTab==='broadcast')&&!templatesLoaded){
      loadTemplates();
    }
  },[adminTab]);
  const [adminUsersLoaded,setAdminUsersLoaded]=useState(false);
  const [adminSwipes,setAdminSwipes]=useState([]);
  const [adminMatches,setAdminMatches]=useState([]);
  const [adminChatMsgs,setAdminChatMsgs]=useState([]);
  const [adminMatchStatsLoaded,setAdminMatchStatsLoaded]=useState(false);
  const [adminUserSearch,setAdminUserSearch]=useState('');
  // Analytics-Dashboard: alle Rohdaten in einem State, damit die
  // useMemo-Berechnungen weiter unten nur bei echter Datenaenderung neu laufen
  const [dashData,setDashData]=useState(null);
  const [dashLoading,setDashLoading]=useState(false);
  const [adminCityFilter,setAdminCityFilter]=useState('');
  // Laedt alle Dashboard-Rohdaten NUR ueber die sichere Admin-Schleuse
  // (adminFetch). Jede Abfrage nutzt eine explizite select=-Spaltenliste und
  // ein Limit, damit bei wachsender Nutzerzahl nicht unnoetig grosse
  // Datenmengen uebertragen werden (Vorbild: loadAllProfiles).
  async function loadDashboard(){
    if(!session?.token)return;
    setDashLoading(true);
    try{
      const q=(path)=>adminFetch(SUPA_URL+path,{},session.token).then(r=>r.json()).then(d=>Array.isArray(d)?d:[]).catch(()=>[]);
      const [profiles,equipment,events,participants,gyms,matches,messages]=await Promise.all([
        q('/rest/v1/profiles?select=id,created_at,last_seen,wins,losses,draws,banned&order=created_at.desc&limit=5000'),
        q('/rest/v1/equipment?select=brand,product,click_count,category,featured&order=click_count.desc&limit=200'),
        q('/rest/v1/events?select=id,title,price,event_date&limit=500'),
        q('/rest/v1/event_participants?select=event_id,paid&limit=5000'),
        q('/rest/v1/gyms?select=city,verified&limit=2000'),
        q('/rest/v1/matches?select=id,created_at&order=created_at.desc&limit=5000'),
        q('/rest/v1/messages?select=id,created_at&order=created_at.desc&limit=5000'),
      ]);
      setDashData({profiles,equipment,events,participants,gyms,matches,messages,loadedAt:Date.now()});
    }catch(e){showMsg('Dashboard-Fehler: '+e.message);}
    setDashLoading(false);
  }
  // Aufwendige Kennzahl-Berechnungen: laufen nur neu, wenn frische Rohdaten
  // geladen wurden - nicht bei jeder App-Interaktion (useMemo, wie im Rest der App).
  const dashStats=React.useMemo(()=>{
    if(!dashData)return null;
    const now=Date.now();
    const {profiles,equipment,events,participants,gyms,matches,messages}=dashData;
    return {
      totalUsers:profiles.length,
      bannedUsers:profiles.filter(p=>p.banned).length,
      active:activeUserCounts(profiles,now),
      newToday:countSince(profiles,'created_at',now-DAY_MS),
      newWeek:countSince(profiles,'created_at',now-7*DAY_MS),
      regSeries:buildTimeSeries(profiles,'created_at','day',now,14),
      regWeekSeries:buildTimeSeries(profiles,'created_at','week',now,8),
      matchSeries:buildTimeSeries(matches,'created_at','day',now,14),
      msgSeries:buildTimeSeries(messages,'created_at','day',now,14),
      totalMatches:matches.length,
      totalMessages:messages.length,
      equipRanking:equipmentRanking(equipment),
      totalClicks:totalEquipmentClicks(equipment),
      revenue:eventRevenue(events,participants),
      participation:eventParticipationStats(events,participants),
      gyms:gymStats(gyms),
      rankingActive:rankingActiveCount(profiles),
    };
  },[dashData]);
  return (
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f5f5f7',zIndex:600,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{background:RED,padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div className='rj' style={{color:'#fff',fontSize:18,letterSpacing:3}}>⚙️ ADMIN</div>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <button onClick={()=>setSidebarCollapsed(v=>!v)} title='Seitenleiste ein-/ausklappen' style={{background:'none',border:'none',color:'#fff',fontSize:19,cursor:'pointer',opacity:0.9}}>⚙️</button>
              <button onClick={()=>setShowAdmin(false)} style={{background:'none',border:'none',color:'#fff',fontSize:22,cursor:'pointer'}}>✕</button>
            </div>
          </div>
          <div style={{flex:1,display:'flex',overflow:'hidden'}}>
            <div style={{width:sidebarCollapsed?0:150,flexShrink:0,background:darkMode?'#141414':'#fff',borderRight:sidebarCollapsed?'none':'1px solid '+(darkMode?'#262626':'#eee'),overflowY:'auto',overflowX:'hidden',padding:sidebarCollapsed?0:'12px 0',transition:'width 0.2s ease, padding 0.2s ease'}}>
              {[
                {label:'ÜBERSICHT',items:[['dashboard','📈','Dashboard']]},
                {label:'GYMS',items:[['gyms','🏋️','Gyms verwalten'],['gymcodes','🔑','Codes'],['addcity','🌍','Neue Stadt']]},
                {label:'COMMUNITY',items:[['users','👤','Nutzer'],['broadcast','📢','Push & Broadcast'],['reports','🚨','Meldungen'],['records','🏅','Rekorde'],['feedback','💬','Feedback']]},
                {label:'PARTNER',items:[['equipment','🥊','Equipment'],['supplements','💊','Supplements']]},
                {label:'SONSTIGES',items:[['events','📅','Events'],['stats','📊','Statistiken'],['scanner','🔍','Scanner']]},
              ].map(group=>(
                <div key={group.label} style={{marginBottom:14}}>
                  <div style={{color:darkMode?'#555':'#999',fontSize:9,letterSpacing:1,padding:'0 12px',marginBottom:4,whiteSpace:'nowrap'}}>{group.label}</div>
                  {group.items.map(([id,icon,name])=>{
                    // "Supplements" nutzt denselben Tab wie Equipment, nur mit
                    // anderem Filter - so wird kein Code dupliziert.
                    const targetTab=id==='supplements'?'equipment':id;
                    const isActive=id==='supplements'?(adminTab==='equipment'&&equipmentTypeFilter==='supplement'):(id==='equipment'?(adminTab==='equipment'&&equipmentTypeFilter==='equipment'):adminTab===id);
                    return(
                      <div key={id} onClick={()=>{
                        setAdminTab(targetTab);
                        if(id==='supplements')setEquipmentTypeFilter('supplement');
                        if(id==='equipment')setEquipmentTypeFilter('equipment');
                      }} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 12px',cursor:'pointer',background:isActive?RED+'18':'transparent',borderLeft:'2px solid '+(isActive?RED:'transparent'),color:isActive?RED:(darkMode?'#999':'#666'),fontSize:12,fontWeight:isActive?700:400}}>
                        <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
                        <span>{name}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{flex:1,padding:'16px',overflowY:'auto'}}>

            {/* ── ANALYTICS DASHBOARD ── */}
            {adminTab==='dashboard'&&(()=>{
              const cardBg=darkMode?'#1a1a1a':'#fff';
              const cardBorder='1px solid '+(darkMode?'#2a2a2a':'#eee');
              const subCol=darkMode?'#aaa':'#888';
              const SectionTitle=({children})=>(<div style={{color:subCol,fontSize:11,fontWeight:700,letterSpacing:1.5,margin:'18px 0 8px'}}>{children}</div>);
              const StatCard=({icon,label,val})=>(
                <div style={{background:cardBg,borderRadius:12,padding:'12px 10px',border:cardBorder,textAlign:'center'}}>
                  <div style={{fontSize:18}}>{icon}</div>
                  <div style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,lineHeight:1.1}}>{val}</div>
                  <div style={{color:subCol,fontSize:9,marginTop:2}}>{label}</div>
                </div>
              );
              // Mini-Balkendiagramm fuer eine Zeitreihe [{key,count}]
              const MiniBars=({series,accent})=>{
                const max=Math.max(1,...series.map(s=>s.count));
                return(
                  <div style={{background:cardBg,borderRadius:12,padding:'12px',border:cardBorder}}>
                    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:70}}>
                      {series.map((s,i)=>(
                        <div key={s.key} title={s.key+': '+s.count} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',height:'100%'}}>
                          <div style={{height:Math.round((s.count/max)*100)+'%',minHeight:s.count>0?3:1,background:i===series.length-1?(accent||RED):(accent||RED)+'66',borderRadius:'3px 3px 0 0'}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:6,color:subCol,fontSize:9}}>
                      <span>{series[0]?.key?.slice(5)}</span>
                      <span>heute: {series[series.length-1]?.count||0}</span>
                    </div>
                  </div>
                );
              };
              return(
                <div>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:16,letterSpacing:2,marginBottom:4}}>📈 ANALYTICS DASHBOARD</div>
                  <button onClick={loadDashboard} disabled={dashLoading} style={{width:'100%',padding:'10px',borderRadius:8,background:dashLoading?'#888':RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:dashLoading?'default':'pointer',marginBottom:4}}>
                    {dashLoading?'⏳ LÄDT…':(dashData?'🔄 AKTUALISIEREN':'📊 DATEN LADEN')}
                  </button>
                  {dashData&&<div style={{color:subCol,fontSize:10,textAlign:'center',marginBottom:4}}>Stand: {new Date(dashData.loadedAt).toLocaleTimeString('de-DE')}</div>}
                  {!dashStats&&!dashLoading&&<div style={{color:subCol,fontSize:12,textAlign:'center',padding:'30px 0'}}>Noch keine Daten geladen. Tippe auf „Daten laden".</div>}
                  {dashStats&&(<>
                    <SectionTitle>👥 NUTZER</SectionTitle>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
                      <StatCard icon='👥' label='Gesamt' val={dashStats.totalUsers}/>
                      <StatCard icon='🟢' label='Heute aktiv' val={dashStats.active.today}/>
                      <StatCard icon='⚡' label='7 Tage aktiv' val={dashStats.active.week}/>
                      <StatCard icon='📆' label='30 Tage aktiv' val={dashStats.active.month}/>
                      <StatCard icon='✨' label='Neu heute' val={dashStats.newToday}/>
                      <StatCard icon='🗓️' label='Neu (7T)' val={dashStats.newWeek}/>
                      <StatCard icon='🥊' label='Mit Kampf' val={dashStats.rankingActive}/>
                      <StatCard icon='🚫' label='Gesperrt' val={dashStats.bannedUsers}/>
                    </div>

                    <SectionTitle>📈 NEUE REGISTRIERUNGEN — LETZTE 14 TAGE</SectionTitle>
                    <MiniBars series={dashStats.regSeries}/>
                    <SectionTitle>📅 REGISTRIERUNGEN PRO WOCHE — LETZTE 8 WOCHEN</SectionTitle>
                    <MiniBars series={dashStats.regWeekSeries} accent='#2980b9'/>

                    <SectionTitle>💕 MATCHES — LETZTE 14 TAGE (gesamt {dashStats.totalMatches})</SectionTitle>
                    <MiniBars series={dashStats.matchSeries} accent='#27ae60'/>
                    <SectionTitle>💬 NACHRICHTEN — LETZTE 14 TAGE (gesamt {dashStats.totalMessages})</SectionTitle>
                    <MiniBars series={dashStats.msgSeries} accent='#d4a017'/>

                    <SectionTitle>🛒 EQUIPMENT-KLICKS ({dashStats.totalClicks} gesamt)</SectionTitle>
                    <div style={{background:cardBg,borderRadius:12,padding:'8px',border:cardBorder}}>
                      {dashStats.equipRanking.length===0&&<div style={{color:subCol,fontSize:12,textAlign:'center',padding:'12px'}}>Noch keine Produkte.</div>}
                      {dashStats.equipRanking.slice(0,15).map((e,i)=>{
                        const max=Math.max(1,dashStats.equipRanking[0].clicks);
                        return(
                          <div key={i} style={{padding:'7px 6px',borderBottom:i<Math.min(14,dashStats.equipRanking.length-1)?('1px solid '+(darkMode?'#242424':'#f2f2f2')):'none'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                              <span style={{color:i<3?RED:subCol,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,width:20,flexShrink:0}}>{i+1}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.brand} {e.product}</div>
                                {e.category&&<div style={{color:subCol,fontSize:10}}>{e.category}{e.featured?' · ⭐ Featured':''}</div>}
                              </div>
                              <span style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,flexShrink:0}}>{e.clicks}</span>
                            </div>
                            <div style={{height:5,borderRadius:3,background:darkMode?'#242424':'#f0f0f0',overflow:'hidden'}}>
                              <div style={{height:'100%',width:Math.round((e.clicks/max)*100)+'%',background:RED,borderRadius:3}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <SectionTitle>🎟️ TICKETING</SectionTitle>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
                      <StatCard icon='💰' label='Umsatz gesamt' val={dashStats.revenue.total.toFixed(0)+'€'}/>
                      <StatCard icon='🎫' label='Tickets verkauft' val={dashStats.revenue.ticketsSold}/>
                      <StatCard icon='📊' label='Ø Teiln./Event' val={dashStats.participation.avgPerEvent}/>
                    </div>
                    <div style={{background:cardBg,borderRadius:12,padding:'8px',border:cardBorder}}>
                      {dashStats.revenue.perEvent.filter(e=>e.paidCount>0).length===0&&<div style={{color:subCol,fontSize:12,textAlign:'center',padding:'12px'}}>Noch keine verkauften Tickets.</div>}
                      {dashStats.revenue.perEvent.filter(e=>e.paidCount>0).slice(0,10).map((e,i)=>(
                        <div key={e.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px',borderBottom:i<9?('1px solid '+(darkMode?'#242424':'#f2f2f2')):'none'}}>
                          <div style={{flex:1,minWidth:0,color:darkMode?'#fff':'#1a1a1a',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.title||'(ohne Titel)'}</div>
                          <div style={{color:subCol,fontSize:11}}>{e.paidCount}× · {e.price}€</div>
                          <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15}}>{e.revenue.toFixed(0)}€</div>
                        </div>
                      ))}
                    </div>

                    <SectionTitle>🏋️ GYMS ({dashStats.gyms.total} gesamt · {dashStats.gyms.verified} verifiziert)</SectionTitle>
                    <div style={{background:cardBg,borderRadius:12,padding:'8px',border:cardBorder}}>
                      {dashStats.gyms.byCity.slice(0,12).map((c,i)=>{
                        const max=Math.max(1,dashStats.gyms.byCity[0].count);
                        return(
                          <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 6px'}}>
                            <div style={{width:90,flexShrink:0,color:darkMode?'#fff':'#1a1a1a',fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.city}</div>
                            <div style={{flex:1,height:8,borderRadius:4,background:darkMode?'#242424':'#f0f0f0',overflow:'hidden'}}>
                              <div style={{height:'100%',width:Math.round((c.count/max)*100)+'%',background:'#2980b9',borderRadius:4}}/>
                            </div>
                            <div style={{color:subCol,fontSize:11,width:22,textAlign:'right'}}>{c.count}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{height:20}}/>
                  </>)}
                </div>
              );
            })()}

            {/* ── GYM LOGOS ── */}
            {adminTab==='gyms'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:8}}>🏋️ GYM MANAGER</div>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <button style={{flex:1,padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}} onClick={()=>setAdminTab('addgym')}>➕ NEUES GYM</button>
                  <button style={{flex:1,padding:'10px',borderRadius:8,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#1a1a1a',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}} onClick={()=>loadDbGyms(session)}>🔄 NEU LADEN</button>
                </div>

                {/* DUPLIKATE ERKENNEN */}
                {(()=>{
                  const nameCount={};
                  dbGyms.forEach(g=>{const k=(g.name||'').trim().toLowerCase();if(k)nameCount[k]=(nameCount[k]||[]); nameCount[k].push(g);});
                  const dupes=Object.values(nameCount).filter(arr=>arr.length>1);
                  const invalid=dbGyms.filter(g=>!g.name||g.name.trim().length<=1);
                  if(dupes.length===0&&invalid.length===0)return null;
                  return(
                    <div style={{background:'#2a1010',borderRadius:10,padding:'12px',marginBottom:12,border:'1px solid #c0392b44'}}>
                      <div style={{color:'#e74c3c',fontWeight:700,fontSize:13,marginBottom:8}}>⚠️ {dupes.length} Duplikate · {invalid.length} ungültige Namen</div>
                      {dupes.length>0&&(()=>{
                        // Aus jeder Gruppe wird der ERSTE behalten - genau der,
                        // den die Liste darunter mit "✓ Behalten" markiert.
                        // Alle weiteren werden geloescht.
                        const zuLoeschen=dupes.flatMap(arr=>arr.slice(1));
                        return(
                          <button disabled={dupeCleanRunning} onClick={async()=>{
                            const anzahl=zuLoeschen.length;
                            if(!window.confirm(
                              anzahl+' doppelte Gym-Eintraege loeschen?\n\n'+
                              'Aus jeder Gruppe bleibt der erste Eintrag erhalten ("✓ Behalten"), '+
                              'alle weiteren werden entfernt.\n\nDas laesst sich nicht rueckgaengig machen.'
                            ))return;
                            setDupeCleanRunning(true);
                            let ok=0; const fehler=[];
                            for(const gym of zuLoeschen){
                              try{
                                const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE'},session?.token);
                                if(r.ok)ok++; else fehler.push(gym.name+' ('+r.status+')');
                              }catch(e){fehler.push(gym.name+' ('+e.message+')');}
                            }
                            await loadDbGyms(session);
                            setDupeCleanRunning(false);
                            showMsg(fehler.length===0
                              ? '✅ '+ok+' Duplikate geloescht'
                              : '⚠️ '+ok+' geloescht, '+fehler.length+' fehlgeschlagen: '+fehler.slice(0,3).join(', '));
                          }} style={{width:'100%',marginBottom:10,padding:'9px',borderRadius:8,background:dupeCleanRunning?'#555':'#e74c3c',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,letterSpacing:1,cursor:dupeCleanRunning?'default':'pointer'}}>
                            {dupeCleanRunning?'⏳ LÖSCHE…':'🧹 ALLE '+zuLoeschen.length+' DUPLIKATE LÖSCHEN'}
                          </button>
                        );
                      })()}
                      {invalid.map(gym=>(
                        <div key={gym.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'#1a1a1a',borderRadius:8,marginBottom:5,border:'1px solid #e74c3c44'}}>
                          <div style={{flex:1}}>
                            <span style={{color:'#e74c3c',fontSize:12,fontWeight:700}}>"{gym.name||'(leer)'}"</span>
                            <span style={{color:'#666',fontSize:11}}> · {gym.city}</span>
                          </div>
                          <button onClick={async()=>{
                            if(!window.confirm('Löschen: "'+gym.name+'"?'))return;
                            try{
                              const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE'},session?.token);
                              if(!r.ok){const t=await r.text().catch(()=>'');showMsg('❌ Löschen fehlgeschlagen ('+r.status+'): '+t.slice(0,150));return;}
                              await loadDbGyms(session);showMsg('✅ Gelöscht');
                            }catch(e){showMsg('Fehler: '+e.message);}
                          }} style={{padding:'4px 10px',borderRadius:6,background:'#e74c3c',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{t.deleteBtn}</button>
                        </div>
                      ))}
                      {dupes.map(arr=>(
                        <div key={arr[0].name} style={{marginBottom:8}}>
                          <div style={{color:'#d4a017',fontSize:11,fontWeight:700,marginBottom:4}}>📋 Duplikat: "{arr[0].name}" ({arr.length}x)</div>
                          {arr.map((gym,i)=>(
                            <div key={gym.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'#1a1a1a',borderRadius:8,marginBottom:4,border:'1px solid '+(i===0?'#27ae6044':'#e74c3c44')}}>
                              <div style={{width:16,height:16,borderRadius:'50%',background:i===0?'#27ae60':'#e74c3c',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span style={{color:'#fff',fontSize:9,fontWeight:700}}>{i===0?'✓':'×'}</span>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <span style={{color:i===0?'#27ae60':'#aaa',fontSize:12,fontWeight:700}}>{gym.name}</span>
                                <span style={{color:'#555',fontSize:11}}> · {gym.city} · {gym.style||'kein Stil'}</span>
                              </div>
                              {i>0&&<button onClick={async()=>{
                                if(!window.confirm('Duplikat löschen: "'+gym.name+'" ('+gym.city+')?'))return;
                                try{
                                  const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE'},session?.token);
                                  if(!r.ok){const t=await r.text().catch(()=>'');showMsg('❌ Löschen fehlgeschlagen ('+r.status+'): '+t.slice(0,150));return;}
                                  await loadDbGyms(session);showMsg('✅ Duplikat gelöscht');
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }} style={{padding:'4px 10px',borderRadius:6,background:'#e74c3c',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>{t.deleteBtn}</button>}
                              {i===0&&<span style={{color:'#27ae60',fontSize:10,flexShrink:0}}>✓ Behalten</span>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* SUCHE */}
                <div style={{position:'relative',marginBottom:8}}>
                  <input placeholder='🔍 Gym suchen...' onChange={e=>setGymSearchQuery(e.target.value)} value={gymSearchQuery||''}
                    style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                </div>

                {dbGyms.filter(g=>g.verified===false).length>0&&(
                  <button onClick={()=>setGymShowUnverifiedOnly(v=>!v)} style={{width:'100%',marginBottom:8,padding:'9px',borderRadius:8,background:gymShowUnverifiedOnly?'#d4a017':(darkMode?'#2a2a2a':'#fdf3d9'),border:'1px solid #d4a017',color:gymShowUnverifiedOnly?'#fff':'#d4a017',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                    ⚠️ {dbGyms.filter(g=>g.verified===false).length} neue Gym-Anmeldung(en) zu prüfen {gymShowUnverifiedOnly?'— alle anzeigen':'— nur diese anzeigen'}
                  </button>
                )}

                <div style={{color:'#aaa',fontSize:11,marginBottom:8}}>{dbGyms.filter(g=>(!gymSearchQuery||(g.name||'').toLowerCase().includes(gymSearchQuery.toLowerCase())||(g.city||'').toLowerCase().includes(gymSearchQuery.toLowerCase()))&&(!gymShowUnverifiedOnly||g.verified===false)).length} / {dbGyms.length} Gyms</div>
                {dbGyms.filter(g=>(!gymSearchQuery||(g.name||'').toLowerCase().includes(gymSearchQuery.toLowerCase())||(g.city||'').toLowerCase().includes(gymSearchQuery.toLowerCase()))&&(!gymShowUnverifiedOnly||g.verified===false)).map((gym,i)=>(
                  <div key={gym.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 12px',marginBottom:8,border:'1px solid '+(gym.verified===false?'#d4a017':(darkMode?'#2a2a2a':'#eee'))}}>
                    {gym.verified===false&&(
                      <div style={{display:'inline-block',background:'#d4a01722',color:'#d4a017',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,marginBottom:6}}>⚠️ NEU — VON NUTZER ANGEMELDET, NOCH NICHT GEPRÜFT</div>
                    )}
                    {editGymId===gym.id?(
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <input defaultValue={gym.name} id={'gn'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #c0392b',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Name'/>
                        <input defaultValue={gym.city} id={'gc'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #ddd',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Stadt'/>
                        <input defaultValue={gym.address||''} id={'ga'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #ddd',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Adresse'/>
                        <input defaultValue={gym.style||''} id={'gs'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #ddd',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Stil z.B. MMA, Boxing'/>
                        {/* Logo Upload */}
                        <div style={{marginBottom:6}}>
                          <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>LOGO</div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {(gymLogos[gym.code]?.logo_url||gym.logo_url)&&<img loading="lazy" src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:36,height:36,borderRadius:6,objectFit:'cover',border:'1px solid #ddd'}} alt=''/>}
                            <label style={{flex:1,padding:'6px 10px',borderRadius:8,border:'2px dashed '+(darkMode?'#333':'#ddd'),color:'#aaa',fontSize:11,cursor:'pointer',textAlign:'center'}}>
                              📷 Logo hochladen
                              <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                                const file=e.target.files?.[0];if(!file)return;
                                showMsg('Logo wird hochgeladen...');
                                try{
                                  const compressed=await compressImage(file,400,0.85);
                                  const path='gyms/logo_'+gym.code+'_'+Date.now()+'.png';
                                  const url=await uploadPhoto(compressed,path,session.token);
                                  if(url){
                                    // Altes Logo löschen, dann neues anlegen — über die sichere Admin-Schleuse
                                    await adminFetch(SUPA_URL+'/rest/v1/gym_logos?gym_code=eq.'+gym.code,{method:'DELETE'},session?.token);
                                    const insRes=await adminFetch(SUPA_URL+'/rest/v1/gym_logos',{
                                      method:'POST',
                                      headers:{Prefer:'return=minimal'},
                                      body:JSON.stringify({gym_code:gym.code,logo_url:url,verified:true})
                                    },session?.token);
                                    if(!insRes.ok){showMsg('❌ Logo speichern fehlgeschlagen ('+insRes.status+')');return;}
                                    setGymLogos(prev=>({...prev,[gym.code]:{logo_url:url,verified:true}}));
                                    await loadGymLogos();
                                    showMsg('✅ Logo gespeichert!');
                                  }
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }}/>
                            </label>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={async()=>{
                            const name=document.getElementById('gn'+gym.id)?.value?.trim();
                            const city=document.getElementById('gc'+gym.id)?.value?.trim();
                            const address=document.getElementById('ga'+gym.id)?.value?.trim();
                            const style=document.getElementById('gs'+gym.id)?.value?.trim();
                            if(!name||!city)return;
                            try{
                              const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({name,city,address,style})},session?.token);
                              if(!r.ok){const t=await r.text().catch(()=>'');showMsg('❌ Speichern fehlgeschlagen ('+r.status+'): '+t.slice(0,150));return;}
                              await loadDbGyms(session);
                              await loadGymLogos();
                              setEditGymId(null);
                              showMsg('✅ Gespeichert — sofort in App aktiv');
                            }catch(e){showMsg('Fehler: '+e.message);}
                          }} style={{flex:1,padding:'7px',borderRadius:8,background:'#27ae60',border:'none',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>✓ SPEICHERN</button>
                          <button onClick={()=>setEditGymId(null)} style={{flex:1,padding:'7px',borderRadius:8,background:darkMode?'#2a2a2a':'#eee',border:'none',color:darkMode?'#fff':'#666',fontWeight:700,fontSize:12,cursor:'pointer'}}>✕ ABBRECHEN</button>
                          <button onClick={async()=>{
                            if(!window.confirm('Gym löschen?'))return;
                            try{
                              const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE'},session?.token);
                              if(!r.ok){const t=await r.text().catch(()=>'');showMsg('❌ Löschen fehlgeschlagen ('+r.status+'): '+t.slice(0,150));return;}
                              await loadDbGyms(session);
                              setEditGymId(null);
                              showMsg('✅ Gelöscht');
                            }catch(e){showMsg('Fehler: '+e.message);}
                          }} style={{padding:'7px 10px',borderRadius:8,background:'#e74c3c',border:'none',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>🗑️</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:36,height:36,borderRadius:8,background:darkMode?'#2a2a2a':'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',fontSize:14}}>
                          {(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img loading="lazy" src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:(gym.name||'?').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:darkMode?'#fff':'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{gym.name||'(kein Name)'}</div>
                          <div style={{fontSize:11,color:'#888'}}>{gym.city}{gym.style?' · '+gym.style:''}</div>
                        </div>
                        {gym.verified===false&&(
                          <button onClick={async()=>{
                            try{
                              const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({verified:true})},session?.token);
                              if(!r.ok){const t=await r.text().catch(()=>'');showMsg('❌ Fehler ('+r.status+'): '+t.slice(0,150));return;}
                              await loadDbGyms(session);showMsg('✅ Gym als geprüft markiert');
                            }catch(e){showMsg('Fehler: '+e.message);}
                          }} style={{padding:'5px 8px',borderRadius:6,background:'#27ae6022',border:'1px solid #27ae6044',color:'#27ae60',fontSize:11,cursor:'pointer'}}>✅ Geprüft</button>
                        )}
                        <button onClick={()=>setEditGymId(gym.id)} style={{padding:'5px 8px',borderRadius:6,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontSize:11,cursor:'pointer'}}>✏️</button>
                        <button onClick={async()=>{
                          if(!window.confirm('Gym löschen: "'+gym.name+'"?'))return;
                          try{
                            const r=await adminFetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE'},session?.token);
                            if(!r.ok){const t=await r.text().catch(()=>'');showMsg('❌ Löschen fehlgeschlagen ('+r.status+'): '+t.slice(0,150));return;}
                            await loadDbGyms(session);showMsg('✅ Gelöscht');
                          }catch(e){showMsg('Fehler: '+e.message);}
                        }} style={{padding:'5px 8px',borderRadius:6,background:'#e74c3c22',border:'1px solid #e74c3c44',color:'#e74c3c',fontSize:11,cursor:'pointer'}}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

                        {adminTab==='addgym'&&(
              <div>
                <button onClick={()=>setAdminTab('gyms')} style={{background:'none',border:'none',color:darkMode?'#999':'#666',fontSize:12,cursor:'pointer',marginBottom:10,padding:0}}>← Zurück zu Gyms</button>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:8}}>➕ NEUES GYM</div>
                {/* KI Suche */}
                <div style={{background:darkMode?'#111d2a':'#e8f4fd',borderRadius:10,padding:'12px',marginBottom:12,border:'1px solid #2980b944'}}>
                  <div style={{color:'#2980b9',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>🤖 KI SUCHE — Gym-Infos automatisch laden</div>
                  <div style={{display:'flex',gap:8}}>
                    <input value={gymSearchQuery||''} onChange={e=>setGymSearchQuery(e.target.value)} placeholder='z.B. Triple One Gym Düsseldorf' style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,outline:'none'}} onKeyDown={e=>{if(e.key==='Enter')document.getElementById('gymAIBtn')?.click();}}/>
                    <button id='gymAIBtn' onClick={async()=>{
                      if(!gymSearchQuery?.trim())return;
                      setGymSearchLoading(true);
                      try{
                        const r=await fetch('https://api.anthropic.com/v1/messages',{
                          method:'POST',
                          headers:{'Content-Type':'application/json'},
                          body:JSON.stringify({
                            model:'claude-sonnet-4-20250514',
                            max_tokens:800,
                            tools:[{type:'web_search_20250305',name:'web_search'}],
                            messages:[{role:'user',content:'Suche im Internet nach dem Kampfsport-Gym: "'+gymSearchQuery.trim()+'". Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text) mit diesen Feldern: name (vollständiger Name), city (nur Stadtname), address (Straße + Hausnummer + PLZ + Stadt), style (Hauptkampfstil), phone, hours (Öffnungszeiten), website, description (kurze Beschreibung auf Deutsch, max 80 Wörter). Falls ein Feld unbekannt ist, leerer String.'}]
                          })
                        });
                        const d=await r.json();
                        const txt=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
                        const clean=txt.replace(/```json|```/g,'').trim();
                        const start=clean.indexOf('{');
                        const end=clean.lastIndexOf('}');
                        if(start>=0&&end>start){
                          const gym=JSON.parse(clean.slice(start,end+1));
                          if(gym.name)setAdminGymName(gym.name);
                          if(gym.city)setAdminGymCity(gym.city);
                          if(gym.address)setAdminGymAddress(gym.address);
                          if(gym.style)setAdminGymStyles(gym.style);
                          if(gym.phone)setAdminGymPhone(gym.phone);
                          if(gym.hours)setAdminGymHours(gym.hours);
                          if(gym.description)setAdminGymDesc(gym.description);
                          showMsg('✅ Infos geladen — bitte prüfen und speichern');
                        }else{showMsg('Keine Infos gefunden');}
                      }catch(e){showMsg('Fehler: '+e.message);}
                      setGymSearchLoading(false);
                    }} style={{padding:'8px 14px',borderRadius:8,background:'#2980b9',border:'none',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                      {gymSearchLoading?'⏳':'🔍 Suchen'}
                    </button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[['GYM NAME *',adminGymName,setAdminGymName,'z.B. Tiger Gym Berlin'],['STADT *',adminGymCity,setAdminGymCity,'z.B. Berlin'],['ADRESSE',adminGymAddress||'',setAdminGymAddress,'z.B. Hauptstr. 1, 40000 Düsseldorf'],['KAMPFSTILE',adminGymStyles,setAdminGymStyles,'z.B. Boxing, MMA, BJJ'],['TELEFON',adminGymPhone,setAdminGymPhone,'+49 ...'],['ÖFFNUNGSZEITEN',adminGymHours,setAdminGymHours,'Mo-Fr 17:00-22:00']].map(([lbl,val,set,ph])=>(
                    <div key={lbl}><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>{lbl}</div>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/></div>
                  ))}
                  <div><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>BESCHREIBUNG</div>
                  <textarea value={adminGymDesc} onChange={e=>setAdminGymDesc(e.target.value)} placeholder="Kurze Beschreibung des Gyms..." rows={3} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box',resize:'none'}}/></div>
                  <button onClick={async()=>{
                    if(!adminGymName||!adminGymCity){showMsg('Name + Stadt eingeben');return;}
                    const code=adminGymName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,3)+'-'+Math.floor(1000+Math.random()*9000);
                    setAdminSaving(true);
                    try{
                      const trimmedName=adminGymName.trim();
                      const trimmedCity=adminGymCity.trim();
                      const gymRes=await adminFetch(SUPA_URL+'/rest/v1/gyms',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:trimmedName,city:trimmedCity,address:(adminGymAddress||'').trim(),style:adminGymStyles,styles:adminGymStyles?[adminGymStyles]:[],phone:adminGymPhone,hours:adminGymHours,description:adminGymDesc,code,verified:false,members:0,rating:0})},session?.token);
                      if(!gymRes.ok){const errText=await gymRes.text();showMsg('❌ Fehler beim Speichern: '+errText.slice(0,150));setAdminSaving(false);return;}
                      await loadDbGyms(session);
                      showMsg('✅ '+trimmedName+' in '+trimmedCity+' hinzugefügt!');
                      setAdminGymName('');setAdminGymCity('');setAdminGymStyles('');setAdminGymPhone('');setAdminGymHours('');setAdminGymDesc('');
                      setAdminTab('gyms');
                    }catch(e){showMsg('Fehler: '+e.message);}
                    setAdminSaving(false);
                  }} style={{padding:'11px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer',letterSpacing:2}}>GYM HINZUFÜGEN</button>
                </div>
              </div>
            )}

            {/* ── STADT HINZUFÜGEN ── */}
            {/* ── GYM VERIFIZIERUNGS-CODES (nur fuer Junior sichtbar) ── */}
            {adminTab==='gymcodes'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:4}}>🔑 GYM-VERIFIZIERUNGSCODES</div>
                <div style={{color:darkMode?'#aaa':'#888',fontSize:12,marginBottom:12,lineHeight:1.5}}>Diese Codes gibst du persönlich an die Gyms weiter (z.B. an der Rezeption). Nutzer geben den Code in der App ein, um sich als Mitglied zu verifizieren.</div>
                <button style={{width:'100%',marginBottom:14,padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}} onClick={async()=>{
                  setGymCodesLoading(true);
                  try{
                    const r=await fetch(SUPA_URL+'/rest/v1/rpc/admin_list_gym_codes',{
                      method:'POST',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token},
                      body:JSON.stringify({})
                    });
                    const data=await r.json();
                    setGymCodesList(Array.isArray(data)?data:[]);
                  }catch(e){showMsg('Fehler: '+e.message);}
                  setGymCodesLoading(false);
                }}>{gymCodesLoading?'Lade...':'🔄 CODES LADEN'}</button>
                {gymCodesList===null&&!gymCodesLoading&&(
                  <div style={{color:darkMode?'#666':'#aaa',fontSize:13,textAlign:'center',padding:'20px'}}>Klick auf "Codes laden", um die Liste anzuzeigen.</div>
                )}
                {gymCodesList!==null&&gymCodesList.length===0&&(
                  <div style={{color:darkMode?'#666':'#aaa',fontSize:13,textAlign:'center',padding:'20px'}}>Keine Codes gefunden.</div>
                )}
                {gymCodesList!==null&&gymCodesList.length>0&&(()=>{
                  // Alphabetisch nach Gym-Name sortieren. localeCompare mit 'de'
                  // sorgt dafuer, dass Umlaute richtig einsortiert werden
                  // (Ä bei A, Ö bei O statt ganz ans Ende).
                  const sortiert=[...gymCodesList].sort((a,b)=>
                    (a.gym_name||'').localeCompare(b.gym_name||'','de',{sensitivity:'base'})
                  );
                  // Suche ueber Gym-Name, Stadt UND Code - so findet man ein Gym
                  // ueber den Namen, aber auch umgekehrt den Code einem Gym zu.
                  const suche=gymCodeSearch.trim().toLowerCase();
                  const gefiltert=suche
                    ? sortiert.filter(g=>
                        (g.gym_name||'').toLowerCase().includes(suche)||
                        (g.gym_city||'').toLowerCase().includes(suche)||
                        (g.gym_code||'').toLowerCase().includes(suche))
                    : sortiert;
                  return(
                  <div>
                    <div style={{position:'relative',marginBottom:8}}>
                      <input placeholder='🔍 Gym, Stadt oder Code suchen...' value={gymCodeSearch}
                        onChange={e=>setGymCodeSearch(e.target.value)}
                        style={{width:'100%',padding:'8px 12px',paddingRight:gymCodeSearch?32:12,borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                      {gymCodeSearch&&(
                        <div onClick={()=>setGymCodeSearch('')}
                          style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'#aaa',cursor:'pointer',fontSize:14}}>✕</div>
                      )}
                    </div>
                    <div style={{color:darkMode?'#888':'#999',fontSize:11,marginBottom:8}}>
                      {gefiltert.length} von {sortiert.length} Gyms
                    </div>
                    {gefiltert.length===0&&(
                      <div style={{color:darkMode?'#666':'#aaa',fontSize:13,textAlign:'center',padding:'20px'}}>Kein Gym gefunden für „{gymCodeSearch}".</div>
                    )}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {gefiltert.map((g,i)=>(
                      <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{g.gym_name}</div>
                          <div style={{color:darkMode?'#888':'#999',fontSize:11}}>{g.gym_city}</div>
                        </div>
                        <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,color:RED,background:darkMode?'#2a1515':'#fdf0ef',padding:'6px 10px',borderRadius:6}}>{g.gym_code}</div>
                      </div>
                    ))}
                  </div>
                  </div>
                  );
                })()}
              </div>
            )}

            {adminTab==='addcity'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:8}}>🌍 NEUE STADT + GYM</div>
                <div style={{color:'#aaa',fontSize:11,marginBottom:12}}>{appLang==='FR'?'La ville sera visible immédiatement.':appLang==='EN'?'City will be immediately visible.':'Stadt wird sofort im Gym-Reiter sichtbar.'}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
                  <div><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>STADTNAME *</div>
                  <input value={adminCityName||''} onChange={e=>setAdminCityName(e.target.value)} placeholder='z.B. Neuss' style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box'}}/></div>
                  <div><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>GYM NAME (optional)</div>
                  <input value={adminCityGymName||''} onChange={e=>setAdminCityGymName(e.target.value)} placeholder='z.B. Kampfsport Neuss' style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box'}}/></div>
                </div>
                <button onClick={async()=>{
                  const city=(adminCityName||'').trim();
                  if(!city){showMsg('Stadtname eingeben');return;}
                  const gymName=(adminCityGymName||('Kampfsport '+city)).trim();
                  try{
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/gyms',{
                      method:'POST',
                      headers:{Prefer:'return=minimal'},
                      body:JSON.stringify({name:gymName,city,code:gymName.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,15)+'-'+Date.now().toString().slice(-4),emoji:'',members:0,rating:0,style:'Kampfsport',styles:['Kampfsport']})
                    },session?.token);
                    if(resp.ok||resp.status===201){
                      await loadDbGyms(session);
                      showMsg('✅ '+city+' hinzugefügt!');
                      setAdminCityName('');setAdminCityGymName('');
                    } else {
                      const err=await resp.text();
                      showMsg('Fehler: '+err);
                    }
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer',letterSpacing:2}}>STADT HINZUFÜGEN</button>
              </div>
            )}


            {adminTab==='events'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>📅 EVENTS VERWALTEN</div>
                <button onClick={()=>loadEvents(session)} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12}}>🔄 EVENTS LADEN</button>
                {events.length===0?(
                  <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noEvents}</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {[...events].sort((a,b)=>new Date(a.event_date)-new Date(b.event_date)).map(ev=>{
                      const parts=eventParticipants[ev.id]||[];
                      const typeColors={'Sparring':RED,'Community Training':'#27ae60','Wettkampf':'#d4a017','Open Mat':'#2980b9','Seminar':'#8e44ad'};
                      const color=typeColors[ev.event_type]||RED;
                      const isPast=ev.event_date&&new Date(ev.event_date)<new Date(new Date().toDateString());
                      return(
                        <div key={ev.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,border:'1px solid '+(isPast?(darkMode?'#2a2a2a':'#eee'):color+'33'),padding:'12px',opacity:isPast?0.6:1}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                                <div style={{background:color+'18',border:'1px solid '+color+'33',borderRadius:20,padding:'1px 7px',color:color,fontSize:9,fontWeight:700}}>{ev.event_type}</div>
                                {isPast&&<div style={{background:'#88888818',borderRadius:20,padding:'1px 7px',color:'#888',fontSize:9,fontWeight:700}}>VERGANGEN</div>}
                              </div>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                              <div style={{color:'#aaa',fontSize:11,marginTop:2}}>📍 {ev.city}{ev.address?' · '+ev.address:''}</div>
                              <div style={{color:'#aaa',fontSize:11,marginTop:1}}>
                                📅 {ev.event_date?new Date(ev.event_date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):''}{ev.event_time?' · 🕐 '+ev.event_time+' Uhr':''}
                              </div>
                              <div style={{color:'#888',fontSize:11,marginTop:2}}>👥 {parts.length}/{ev.max_participants||10} Teilnehmer</div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
                              <button onClick={async()=>{
                                if(!window.confirm('Event "'+ev.title+'" wirklich löschen?'))return;
                                try{
                                  await adminFetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+ev.id,{method:'DELETE'},session?.token);
                                  await adminFetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{method:'DELETE'},session?.token);
                                  await loadEvents(session);
                                  showMsg('Event gelöscht ✅');
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }} style={{padding:'5px 10px',borderRadius:6,background:'#e74c3c22',border:'1px solid #e74c3c44',color:'#e74c3c',fontSize:11,fontWeight:700,cursor:'pointer'}}>{t.deleteBtn}</button>
                              <button onClick={async()=>{
                                const newTitle=window.prompt('Neuer Titel:',ev.title);
                                if(!newTitle||!newTitle.trim())return;
                                try{
                                  await adminFetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{
                                    method:'PATCH',
                                    headers:{Prefer:'return=minimal'},
                                    body:JSON.stringify({title:newTitle.trim()})
                                  },session?.token);
                                  await loadEvents(session);
                                  showMsg('Titel geändert ✅');
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }} style={{padding:'5px 10px',borderRadius:6,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontSize:11,cursor:'pointer'}}>✏️ Bearbeiten</button>
                            </div>
                          </div>
                          {parts.length>0&&(
                            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                              <div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:5}}>ANGEMELDETE TEILNEHMER</div>
                              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                                {parts.map((p,i)=>(
                                  <div key={i} style={{background:darkMode?'#2a2a2a':'#f5f5f5',borderRadius:6,padding:'3px 8px',fontSize:10,color:darkMode?'#aaa':'#555'}}>{p.profiles?.name||p.user_id?.slice(0,8)+'...'}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

                        {/* ── USER VERWALTEN ── */}
            {adminTab==='users'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>👤 USER ({adminUsers.length})</div>
                <button onClick={async()=>{
                  const log=[];
                  log.push('Klick erkannt, session='+!!session+', token='+!!session?.token);
                  try{
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/profiles?order=created_at.desc&limit=1000',{},session?.token);
                    log.push('Antwort Status='+resp.status);
                    const data=await resp.json();
                    if(Array.isArray(data)){
                      setAdminUsers(data);setAdminUsersLoaded(true);
                      log.push(data.length+' User geladen ✅');
                    }else{
                      log.push('Keine Liste: '+JSON.stringify(data).slice(0,150));
                    }
                  }catch(e){log.push('FEHLER: '+e.message);}
                  // Alles auf einmal anzeigen (nicht mehrere Meldungen, die
                  // sich gegenseitig ueberschreiben wuerden, bevor man sie
                  // lesen kann) und laenger stehen lassen.
                  showMsg('🔧 '+log.join(' → '));
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>{adminUsersLoaded?'🔄 AKTUALISIEREN':'USER LADEN'}</button>
                {adminUsersLoaded&&(
                  <input
                    type='text'
                    value={adminUserSearch}
                    onChange={e=>setAdminUserSearch(e.target.value)}
                    placeholder='🔍 Suche nach Name oder Stadt...'
                    style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#1a1a1a':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,marginBottom:12,boxSizing:'border-box'}}
                  />
                )}
                {adminUsers.filter(u=>{
                  const q=adminUserSearch.trim().toLowerCase();
                  if(!q)return true;
                  return (u.name||'').toLowerCase().includes(q)||(u.city||'').toLowerCase().includes(q);
                }).map(u=>(
                  <React.Fragment key={u.id}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,border:'1px solid '+(u.banned?'#e74c3c44':(darkMode?'#2a2a2a':'#eee')),marginBottom:5}}>
                    {u.avatar_url?<img loading="lazy" src={u.avatar_url} style={{width:34,height:34,borderRadius:'50%',objectFit:'cover',opacity:u.banned?0.4:1}} alt=''/>:<div style={{width:34,height:34,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:u.banned?'#e74c3c':(darkMode?'#fff':'#1a1a1a'),fontSize:12,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.name||'?'} {u.banned&&'🚫'}</div>
                      <div style={{color:'#aaa',fontSize:10}}>{u.city} · {u.style} · {new Date(u.created_at).toLocaleDateString('de')}</div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={async()=>{
                        const ban=!u.banned;
                        await adminFetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({banned:ban})},session?.token);
                        setAdminUsers(prev=>prev.map(x=>x.id===u.id?{...x,banned:ban}:x));
                        if(ban) setAllProfiles(prev=>prev.filter(x=>x.id!==u.id));
                        showMsg(ban?'User gesperrt 🚫':'User entsperrt ✅');
                      }} style={{background:u.banned?'#27ae60':'#e74c3c',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>{u.banned?'Freig.':'Sperren'}</button>
                      <button onClick={()=>{
                        setMessagingUserId(prev=>prev===u.id?null:u.id);
                        setMessagingText('');
                      }} style={{background:'#2980b9',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✉️</button>
                      <button onClick={async()=>{
                        if(!window.confirm('User '+u.name+' wirklich löschen? Das kann nicht rückgängig gemacht werden.'))return;
                        try{
                          // 1. Alle Daten löschen
                          await adminFetch(SUPA_URL+'/rest/v1/messages?sender_id=eq.'+u.id,{method:'DELETE'},session?.token);
                          await adminFetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+u.id,{method:'DELETE'},session?.token);
                          await adminFetch(SUPA_URL+'/rest/v1/swipes?target_id=eq.'+u.id,{method:'DELETE'},session?.token);
                          await adminFetch(SUPA_URL+'/rest/v1/matches?profile_a_id=eq.'+u.id,{method:'DELETE'},session?.token);
                          await adminFetch(SUPA_URL+'/rest/v1/matches?profile_b_id=eq.'+u.id,{method:'DELETE'},session?.token);
                          // 2. Profile löschen + banned setzen damit Login fehlschlägt
                          await adminFetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({banned:true,name:'[Gelöscht]',avatar_url:null,bio:null})},session?.token);
                          // 3. Auth User löschen
                          const authResp=await adminFetch(SUPA_URL+'/auth/v1/admin/users/'+u.id,{method:'DELETE'},session?.token);
                          if(authResp.ok){
                            await adminFetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'DELETE'},session?.token);
                            showMsg('✅ User vollständig gelöscht');
                          }else{
                            showMsg('✅ User gesperrt + Daten gelöscht (Auth-Account bleibt)');
                          }
                          setAdminUsers(prev=>prev.filter(x=>x.id!==u.id));
                          setAllProfiles(prev=>prev.filter(x=>x.id!==u.id));
                        }catch(e){
                          showMsg('Fehler: '+e.message);
                        }
                      }} style={{background:'none',border:'1px solid #e74c3c',borderRadius:6,padding:'4px 6px',color:'#e74c3c',fontSize:10,cursor:'pointer'}}>🗑️</button>
                    </div>
                  </div>
                  {messagingUserId===u.id&&(
                    <div style={{background:darkMode?'#111':'#f5f5f7',borderRadius:8,padding:'10px',marginTop:-3,marginBottom:5,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd')}}>
                      {renderTemplateChips(text=>setMessagingText(text))}
                      <textarea value={messagingText} onChange={e=>setMessagingText(e.target.value)} placeholder={'Nachricht an '+(u.name||'User')+'...'} rows={2}
                        style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#1a1a1a':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:12,boxSizing:'border-box',resize:'none',marginBottom:6}}/>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>saveAsTemplate(messagingText)} style={{flex:1,padding:'7px',borderRadius:6,background:'none',border:'1px solid '+(darkMode?'#333':'#ccc'),color:darkMode?'#999':'#666',fontSize:11,fontWeight:700,cursor:'pointer'}}>💾 Als Vorlage</button>
                        <button onClick={async()=>{
                          if(!messagingText.trim())return;
                          try{
                            await adminFetch(SUPA_URL+'/rest/v1/admin_messages',{
                              method:'POST',headers:{Prefer:'return=minimal'},
                              body:JSON.stringify({user_id:u.id,message:messagingText,from_admin:true,read:false})
                            },session?.token);
                            showMsg('✅ Nachricht gesendet an '+(u.name||'User'));
                            setMessagingUserId(null);setMessagingText('');
                          }catch(e){showMsg('Fehler: '+e.message);}
                        }} style={{flex:1,padding:'7px',borderRadius:6,background:'#2980b9',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Senden</button>
                      </div>
                    </div>
                  )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* ── GEMELDETE USER ── */}
            {adminTab==='reports'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🚨 MELDUNGEN</div>
                <button onClick={async()=>{
                  try{
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/reports?order=created_at.desc&limit=50',{},session?.token);
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminReports(data);showMsg('✅ '+data.length+' Meldung(en) geladen');}
                    else{setAdminReports([]);showMsg('❌ Fehler: '+((data&&data.error)||'unerwartete Antwort'));}
                  }catch(e){setAdminReports([]);showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>MELDUNGEN LADEN</button>
                {adminReports.length===0&&<div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noReports}</div>}
                {adminReports.map((r,i)=>(
                  <div key={r.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px',border:'1px solid #e74c3c44',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <div style={{color:RED,fontSize:11,fontWeight:700}}>🚨 {r.reason||'Kein Grund angegeben'}</div>
                      <div style={{color:'#bbb',fontSize:10}}>{new Date(r.created_at).toLocaleDateString('de')}</div>
                    </div>
                    <div style={{color:darkMode?'#aaa':'#666',fontSize:11}}>Gemeldet: <strong>{r.reported_name||r.reported_id}</strong></div>
                    <div style={{color:'#bbb',fontSize:10,marginTop:2}}>Von: {r.reporter_id?.slice(0,8)}...</div>
                    <div style={{display:'flex',gap:6,marginTop:8}}>
                      <button onClick={async()=>{
                        await adminFetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+r.reported_id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({banned:true})},session?.token);
                        showMsg('User gesperrt 🚫');
                        setAdminReports(prev=>prev.filter(x=>x.id!==r.id));
                      }} style={{flex:1,padding:'7px',borderRadius:7,background:'#e74c3c',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🚫 Sperren</button>
                      <button onClick={async()=>{
                        await adminFetch(SUPA_URL+'/rest/v1/reports?id=eq.'+r.id,{method:'DELETE'},session?.token);
                        setAdminReports(prev=>prev.filter(x=>x.id!==r.id));
                        showMsg('Meldung ignoriert');
                      }} style={{flex:1,padding:'7px',borderRadius:7,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#aaa':'#666',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Ignorieren</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── KAMPFREKORD VERIFIZIEREN ── */}
            {adminTab==='records'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🏅 REKORD-ANTRÄGE</div>
                <button onClick={async()=>{
                  try{
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/profiles?record_verified=eq.pending&select=id,name,city,style,record_proof_url,created_at&limit=30',{},session?.token);
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminRecords(data);showMsg('✅ '+data.length+' Antrag/Anträge geladen');}
                    else{setAdminRecords([]);showMsg('❌ Fehler: '+((data&&data.error)||'unerwartete Antwort'));}
                  }catch(e){setAdminRecords([]);showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>ANTRÄGE LADEN</button>
                {adminRecords.length===0&&<div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noRequests}</div>}
                {adminRecords.map((u,i)=>(
                  <div key={u.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px',border:'1px solid #d4a01744',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <div style={{flex:1}}>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:700}}>{u.name}</div>
                        <div style={{color:'#aaa',fontSize:10}}>{u.city} · {u.style}</div>
                      </div>
                      <div style={{background:'#d4a01722',borderRadius:6,padding:'2px 7px',color:'#d4a017',fontSize:10,fontWeight:700}}>⏳ WARTEND</div>
                    </div>
                    {u.record_proof_url&&<img loading="lazy" src={u.record_proof_url} style={{width:'100%',borderRadius:8,marginBottom:8,maxHeight:200,objectFit:'contain',background:'#f0f0f0'}} alt='Nachweis'/>}
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={async()=>{
                        await adminFetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({record_verified:'verified'})},session?.token);
                        setAdminRecords(prev=>prev.filter(x=>x.id!==u.id));
                        showMsg('✅ Rekord verifiziert!');
                      }} style={{flex:1,padding:'8px',borderRadius:7,background:'#27ae60',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Bestätigen</button>
                      <button onClick={async()=>{
                        await adminFetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({record_verified:'rejected'})},session?.token);
                        setAdminRecords(prev=>prev.filter(x=>x.id!==u.id));
                        showMsg('❌ Abgelehnt');
                      }} style={{flex:1,padding:'8px',borderRadius:7,background:'#e74c3c',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>❌ Ablehnen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── BROADCAST ── */}
            {adminTab==='feedback'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>💬 FEEDBACK & WÜNSCHE</div>
                <button onClick={async()=>{
                  try{
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/feedback?order=created_at.desc&limit=100',{},session?.token);
                    const data=await resp.json();
                    if(Array.isArray(data))setAdminFeedback(data);
                    else setAdminFeedback([]);
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>
                  🔄 FEEDBACK LADEN
                </button>
                {/* Filter Tabs */}
                <div style={{display:'flex',gap:6,marginBottom:12}}>
                  {[['alle','Alle'],['feedback','💬 Feedback'],['wunsch','⭐ Wünsche']].map(([type,label])=>(
                    <button key={type} onClick={()=>setFeedbackFilter(type)}
                      style={{flex:1,padding:'7px',borderRadius:8,background:feedbackFilter===type?RED:'transparent',border:'1px solid '+(feedbackFilter===type?RED:(darkMode?'#333':'#ddd')),color:feedbackFilter===type?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      {label}
                    </button>
                  ))}
                </div>
                {adminFeedback.length===0?(
                  <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noFeedbackYet}</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {adminFeedback.filter(f=>feedbackFilter==='alle'||f.type===feedbackFilter).map((fb,i)=>(
                      <div key={fb.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px 14px',border:'1px solid '+(fb.type==='wunsch'?'#d4a01744':(darkMode?'#2a2a2a':'#eee')),position:'relative'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <div style={{background:fb.type==='wunsch'?'#d4a01722':'#2980b922',border:'1px solid '+(fb.type==='wunsch'?'#d4a01744':'#2980b944'),borderRadius:20,padding:'2px 8px',color:fb.type==='wunsch'?'#d4a017':'#2980b9',fontSize:10,fontWeight:700}}>
                              {fb.type==='wunsch'?'⭐ WUNSCH':'💬 FEEDBACK'}
                            </div>
                            {!fb.read&&<div style={{background:RED,borderRadius:20,padding:'2px 8px',color:'#fff',fontSize:9,fontWeight:700}}>NEU</div>}
                          </div>
                          <div style={{color:'#aaa',fontSize:10}}>
                            {fb.created_at?new Date(fb.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):''}
                          </div>
                        </div>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,lineHeight:1.6,marginBottom:6}}>{fb.message}</div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div style={{color:'#aaa',fontSize:11}}>👤 {fb.user_name||'Anonym'}</div>
                          <button onClick={async()=>{
                            try{
                              await adminFetch(SUPA_URL+'/rest/v1/feedback?id=eq.'+fb.id,{
                                method:'PATCH',
                                headers:{Prefer:'return=minimal'},
                                body:JSON.stringify({read:true})
                              },session?.token);
                              setAdminFeedback(prev=>prev.map(f=>f.id===fb.id?{...f,read:true}:f));
                            }catch{}
                          }} style={{background:'none',border:'1px solid '+(darkMode?'#333':'#ddd'),borderRadius:6,padding:'3px 8px',color:darkMode?'#666':'#aaa',fontSize:10,cursor:'pointer'}}>
                            {fb.read?'✓ Gelesen':'Als gelesen markieren'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminTab==='equipment'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>{equipmentTypeFilter==='supplement'?'💊 SUPPLEMENTS VERWALTEN':'🥊 EQUIPMENT VERWALTEN'}</div>

                {/* NEUES PRODUKT HINZUFÜGEN */}
                <div style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:12,padding:'14px',marginBottom:16,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div style={{color:RED,fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:10}}>➕ NEUES PRODUKT</div>
                  {[
                    ['Marke *','brand','z.B. Paffen Sport'],
                    ['Produkt *','product','z.B. Pro Mexican Boxing Gloves'],
                    ['Beschreibung','description','z.B. Professionelle Boxhandschuhe für Training & Wettkampf'],
                    ['Link / URL','url','z.B. https://paffen-sport.com/...'],
                    ['Bild URL','image_url','z.B. https://... (optional)'],
                    ['Rabattcode','discount_code','z.B. FIGHTER10 (optional)'],
                  ].map(([label,key,ph])=>(
                    <div key={key} style={{marginBottom:8}}>
                      <div style={{color:'#aaa',fontSize:10,marginBottom:3}}>{label}</div>
                      <input value={newEquip[key]} onChange={e=>setNewEquip(p=>({...p,[key]:e.target.value}))}
                        placeholder={ph}
                        style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                    </div>
                  ))}
                  <div style={{marginBottom:8}}>
                    <div style={{color:'#aaa',fontSize:10,marginBottom:3}}>Kategorie</div>
                    <select value={newEquip.category} onChange={e=>setNewEquip(p=>({...p,category:e.target.value}))}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>
                      {['Boxen','Kickboxing','MMA','BJJ','Muay Thai','Grappling','Allgemein','Schutzausrüstung','Bekleidung','Supplements'].map(cat=>(
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>BEREICH</div>
                    <div style={{display:'flex',gap:8}}>
                      {[['equipment','🥊 Equipment'],['supplement','💊 Supplement']].map(([val,lbl])=>(
                        <button key={val} onClick={()=>setNewEquip(p=>({...p,item_type:val}))}
                          style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid '+(newEquip.item_type===val?RED:(darkMode?'#333':'#ddd')),background:newEquip.item_type===val?RED:'transparent',color:newEquip.item_type===val?'#fff':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:700,cursor:'pointer'}}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <input type='checkbox' checked={newEquip.featured} onChange={e=>setNewEquip(p=>({...p,featured:e.target.checked}))} id='featured_cb'/>
                    <label htmlFor='featured_cb' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,cursor:'pointer'}}>⭐ Featured (oben anzeigen)</label>
                  </div>
                  <button onClick={async()=>{
                    if(!newEquip.brand||!newEquip.product){showMsg('Marke und Produkt sind Pflicht');return;}
                    try{
                      const res=await adminFetch(SUPA_URL+'/rest/v1/equipment',{
                        method:'POST',
                        headers:{Prefer:'return=representation'},
                        body:JSON.stringify({...newEquip,sort_order:Date.now()})
                      },session?.token);
                      const data=await res.json();
                      console.log('Equipment save response:', res.status, data);
                      if(Array.isArray(data)&&data[0]){
                        setEquipmentList(prev=>[data[0],...prev]);
                        const savedBrand=newEquip.brand,savedProduct=newEquip.product;
                        setNewEquip({brand:'',product:'',description:'',category:'Boxen',url:'',image_url:'',discount_code:'',featured:false});
                        showMsg('✅ Produkt hinzugefügt!');
                        // Alle Nutzer per Push benachrichtigen
                        fetch(SUPA_URL+'/functions/v1/broadcast-push',{
                          method:'POST',
                          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
                          body:JSON.stringify({title:'🥊 Neues Equipment!',body:savedBrand+' '+savedProduct+' ist jetzt im Shop verfügbar',data:{type:'equipment'}})
                        }).catch(err=>console.error('broadcast push',err));
                      }else if(data&&data.code==='42P01'){
                        showMsg('❌ Tabelle fehlt — SQL im Supabase Editor ausführen!');
                      }else if(data&&data.message){
                        showMsg('❌ '+data.message);
                      }else{
                        showMsg('Fehler: '+JSON.stringify(data).slice(0,100));
                      }
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                    ➕ PRODUKT SPEICHERN
                  </button>
                </div>

                {/* LISTE LADEN */}
                <button onClick={loadEquipmentList} style={{width:'100%',padding:'9px',borderRadius:8,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12}}>
                  {equipLoading?'Laden...':'🔄 ALLE PRODUKTE NEU LADEN'}
                </button>

                {/* PRODUKT LISTE */}
                {equipmentList.filter(eq=>(eq.item_type||'equipment')===equipmentTypeFilter).map(eq=>(
                  <div key={eq.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px',marginBottom:8,border:'1px solid '+(eq.featured?'#d4a01744':(darkMode?'#2a2a2a':'#eee'))}}>
                    {editingEquip===eq.id?(
                      <div>
                        {[
                          ['Marke','brand'],['Produkt','product'],['Beschreibung','description'],
                          ['Link / URL','url'],['Bild URL','image_url'],['Rabattcode','discount_code'],
                        ].map(([label,key])=>(
                          <div key={key} style={{marginBottom:6}}>
                            <div style={{color:'#aaa',fontSize:10,marginBottom:2}}>{label}</div>
                            <input value={editEquipForm[key]||''} onChange={e=>setEditEquipForm(p=>({...p,[key]:e.target.value}))}
                              style={{width:'100%',padding:'7px 9px',borderRadius:7,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:12,boxSizing:'border-box'}}/>
                          </div>
                        ))}
                        <div style={{marginBottom:8}}>
                          <div style={{color:'#aaa',fontSize:10,marginBottom:2}}>Kategorie</div>
                          <select value={editEquipForm.category} onChange={e=>setEditEquipForm(p=>({...p,category:e.target.value}))}
                            style={{width:'100%',padding:'7px 9px',borderRadius:7,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:12}}>
                            {['Boxen','Kickboxing','MMA','BJJ','Muay Thai','Grappling','Allgemein','Schutzausrüstung','Bekleidung','Supplements'].map(cat=>(
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <input type='checkbox' checked={!!editEquipForm.featured} onChange={e=>setEditEquipForm(p=>({...p,featured:e.target.checked}))} id={'feat_'+eq.id}/>
                          <label htmlFor={'feat_'+eq.id} style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,cursor:'pointer'}}>⭐ Featured</label>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                          <input type='checkbox' checked={!!editEquipForm.sponsored} onChange={e=>setEditEquipForm(p=>({...p,sponsored:e.target.checked}))} id={'spon_'+eq.id}/>
                          <label htmlFor={'spon_'+eq.id} style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,cursor:'pointer'}}>💰 Bezahlte Platzierung (zeigt "ANZEIGE")</label>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={()=>{setEditingEquip(null);setEditEquipForm(null);}} style={{flex:1,padding:'8px',borderRadius:7,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontWeight:700,fontSize:12,cursor:'pointer'}}>ABBRECHEN</button>
                          <button onClick={async()=>{
                            try{
                              const resp=await adminFetch(SUPA_URL+'/rest/v1/equipment?id=eq.'+eq.id,{
                                method:'PATCH',
                                headers:{Prefer:'return=representation'},
                                body:JSON.stringify(editEquipForm)
                              },session?.token);
                              const data=await resp.json();
                              if(Array.isArray(data)&&data[0]){
                                setEquipmentList(prev=>prev.map(e=>e.id===eq.id?data[0]:e));
                                setEditingEquip(null);setEditEquipForm(null);
                                showMsg('✅ Aktualisiert!');
                              }else{
                                showMsg('❌ Fehler: '+JSON.stringify(data).slice(0,100));
                              }
                            }catch(err){showMsg('Fehler: '+err.message);}
                          }} style={{flex:1,padding:'8px',borderRadius:7,background:'#27ae60',border:'none',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>✓ SPEICHERN</button>
                        </div>
                      </div>
                    ):(
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                          {eq.featured&&<span style={{background:'#d4a01722',border:'1px solid #d4a01744',borderRadius:20,padding:'1px 7px',color:'#d4a017',fontSize:10,fontWeight:700}}>⭐ FEATURED</span>}
                          <span style={{background:RED+'22',border:'1px solid '+RED+'44',borderRadius:20,padding:'1px 7px',color:RED,fontSize:10,fontWeight:700}}>{eq.category}</span>
                        </div>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{eq.brand} — {eq.product}</div>
                        {eq.description&&<div style={{color:'#aaa',fontSize:11,marginTop:2}}>{eq.description}</div>}
                        {eq.url&&<div style={{color:'#2980b9',fontSize:11,marginTop:2}}>🔗 {eq.url.replace('https://','').slice(0,50)}</div>}
                        {eq.discount_code&&<div style={{color:'#27ae60',fontSize:11,marginTop:2}}>🏷️ Code: {eq.discount_code}</div>}
                      </div>
                      <div style={{display:'flex',gap:6,flexShrink:0,marginLeft:8}}>
                        <button onClick={()=>{setEditingEquip(eq.id);setEditEquipForm({brand:eq.brand||'',product:eq.product||'',description:eq.description||'',url:eq.url||'',image_url:eq.image_url||'',discount_code:eq.discount_code||'',category:eq.category||'Boxen',featured:!!eq.featured,sponsored:!!eq.sponsored});}} style={{background:'none',border:'1px solid #2980b944',borderRadius:6,padding:'4px 8px',color:'#2980b9',fontSize:11,cursor:'pointer'}}>
                          ✏️
                        </button>
                        <button onClick={async()=>{
                          if(!window.confirm('Löschen?'))return;
                          try{
                            const delRes=await adminFetch(SUPA_URL+'/rest/v1/equipment?id=eq.'+eq.id,{method:'DELETE'},session?.token);
                            if(delRes.ok){
                              setEquipmentList(prev=>prev.filter(e=>e.id!==eq.id));
                              showMsg('✅ Gelöscht');
                            }else{
                              showMsg('❌ Löschen fehlgeschlagen ('+delRes.status+')');
                            }
                          }catch(err){showMsg('Fehler: '+err.message);}
                        }} style={{background:'none',border:'1px solid #e74c3c44',borderRadius:6,padding:'4px 8px',color:'#e74c3c',fontSize:11,cursor:'pointer'}}>
                          🗑️
                        </button>
                      </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {adminTab==='broadcast'&&(
              <div>
                {/* BEWERTUNGS-PUSH */}
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',marginBottom:16,border:'1px solid '+RED+'44'}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:6}}>⭐ BEWERTUNGS-PUSH</div>
                  <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Schickt allen die Frage „Gefällt dir die Fighter App?". Ein Tipp auf die Benachrichtigung öffnet direkt die App-Store-Bewertung.{!APP_STORE_ID&&<span style={{color:'#e74c3c'}}> ⚠️ App-Store-ID fehlt noch — Push kommt an, öffnet aber noch nicht den Store.</span>}</div>
                  <button onClick={async()=>{
                    if(!window.confirm('Bewertungs-Push an ALLE Nutzer senden?'))return;
                    setAdminSaving(true);
                    try{
                      const pushResp=await fetch(SUPA_URL+'/functions/v1/broadcast-push',{
                        method:'POST',
                        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
                        body:JSON.stringify({title:'⭐ Gefällt dir Fighter?',body:'Tippe hier und bewerte uns im App Store 🥊',data:{type:'rate'}})
                      });
                      const pd=await pushResp.json().catch(()=>({}));
                      if(pd&&typeof pd.sent==='number')showMsg('✅ Bewertungs-Push: '+pd.sent+'/'+pd.totalTokens+' zugestellt');
                      else showMsg('Antwort: '+JSON.stringify(pd).slice(0,120));
                    }catch(e){showMsg('Fehler: '+e.message);}
                    setAdminSaving(false);
                  }} disabled={adminSaving} style={{width:'100%',padding:'11px',borderRadius:8,background:adminSaving?'#888':RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:adminSaving?'default':'pointer'}}>⭐ BEWERTUNGS-PUSH SENDEN</button>
                </div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>📢 NACHRICHT AN ALLE</div>
                <div style={{color:'#aaa',fontSize:11,marginBottom:12,lineHeight:1.6}}>Sende eine Systemnachricht die alle User beim nächsten Öffnen der App sehen.</div>
                {renderTemplateChips(text=>setAdminBroadcast(text))}
                <textarea value={adminBroadcast} onChange={e=>setAdminBroadcast(e.target.value)} placeholder="z.B. Neues Feature: Jetzt Gym-Seiten besuchen! 🏋️" rows={4} style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',resize:'none',marginBottom:10}}/>
                <button onClick={()=>saveAsTemplate(adminBroadcast)} style={{width:'100%',padding:'9px',borderRadius:8,background:'none',border:'1px solid '+(darkMode?'#333':'#ccc'),color:darkMode?'#999':'#666',fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:10}}>💾 ALS VORLAGE SPEICHERN</button>
                <button onClick={async()=>{
                  if(!adminBroadcast.trim()){showMsg('Nachricht eingeben');return;}
                  setAdminSaving(true);
                  try{
                    // Alle User laden
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/profiles?select=id&banned=neq.true&limit=500',{},session?.token);
                    const users=await resp.json();
                    if(!Array.isArray(users)||users.length===0){showMsg('Keine User gefunden');setAdminSaving(false);return;}
                    // Für jeden User eine admin_message anlegen - in Gruppen von 50
                    // GLEICHZEITIG statt einzeln nacheinander (viel schneller)
                    let sent=0;
                    const broadcastBatchSize=50;
                    for(let i=0;i<users.length;i+=broadcastBatchSize){
                      const batch=users.slice(i,i+broadcastBatchSize);
                      const results=await Promise.all(batch.map(u=>
                        adminFetch(SUPA_URL+'/rest/v1/admin_messages',{
                          method:'POST',
                          headers:{Prefer:'return=minimal'},
                          body:JSON.stringify({user_id:u.id,message:adminBroadcast,from_admin:true,read:false})
                        },session?.token).then(()=>true).catch(()=>false)
                      ));
                      sent+=results.filter(Boolean).length;
                    }
                    // Echte Push-Benachrichtigung an alle senden (zusätzlich zur In-App-Nachricht)
                    let pushInfo='';
                    try{
                      const pushResp=await fetch(SUPA_URL+'/functions/v1/broadcast-push',{
                        method:'POST',
                        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
                        // type:'news' sorgt dafür, dass ein Tipp auf die Push-
                        // Benachrichtigung direkt die News-Ansicht öffnet,
                        // wo die komplette Nachricht nochmal lesbar ist
                        body:JSON.stringify({title:'🥊 Fighter News',body:adminBroadcast.slice(0,150),data:{type:'news'}})
                      });
                      const pushData=await pushResp.json();
                      if(pushData&&typeof pushData.sent==='number'){
                        pushInfo=' | Push: '+pushData.sent+'/'+pushData.totalTokens+' zugestellt';
                        if(pushData.failed>0){
                          pushInfo+=', '+pushData.failed+' fehlgeschlagen';
                          if(Array.isArray(pushData.errors)&&pushData.errors[0]){
                            pushInfo+=' (Grund: '+JSON.stringify(pushData.errors[0]).slice(0,500)+')';
                          }
                        }
                      }else{
                        pushInfo=' | Push-Antwort: '+JSON.stringify(pushData).slice(0,100);
                      }
                    }catch(err){pushInfo=' | Push-Fehler: '+err.message;}
                    showMsg('✅ Nachricht an '+sent+' User'+pushInfo);
                    setAdminBroadcast('');
                  }catch(e){showMsg('Fehler: '+e.message);}
                  setAdminSaving(false);
                }} style={{width:'100%',padding:'12px',borderRadius:10,background:adminSaving?'#aaa':`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,cursor:adminSaving?'not-allowed':'pointer',letterSpacing:2}}>{adminSaving?'Sende...':'📢 AN ALLE SENDEN'}</button>

                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:6}}>✉️ BESTÄTIGUNGS-MAILS ERNEUT SENDEN</div>
                  <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Verschickt den ECHTEN Bestätigungslink erneut an alle User, die sich noch nicht bestätigt haben (prüft wirklich ALLE User, nicht nur die ersten 100).</div>
                  <button onClick={async()=>{
                    if(!window.confirm('Echten Bestätigungslink erneut an alle unbestätigten User senden?'))return;
                    showMsg('Lade alle User...');
                    try{
                      // Alle Auth-User laden (alle Seiten durchlaufen, nicht nur die erste)
                      let allUsers=[];
                      let page=1;
                      while(true){
                        const resp=await adminFetch(SUPA_URL+'/auth/v1/admin/users?page='+page+'&per_page=1000',{},session?.token);
                        const data=await resp.json();
                        const batch=data.users||[];
                        allUsers=allUsers.concat(batch);
                        if(batch.length<1000)break;
                        page++;
                        if(page>20)break; // Sicherheitsgrenze
                      }
                      const unconfirmed=allUsers.filter(u=>!u.email_confirmed_at);
                      const estMinutes=Math.ceil(unconfirmed.length*4/60);
                      showMsg('Sende '+unconfirmed.length+' Bestätigungslinks - dauert ca. '+estMinutes+' Min, bitte Tab offen lassen...');
                      let sent=0;
                      let firstError=null;
                      // EINZELN mit 4s Pause - passend zu Supabases Nachfuellrate
                      // bei 1000 E-Mails/Stunde (~1 Token alle 3,6s). Schnelleres
                      // Senden fuehrt zu over_email_send_rate_limit Fehlern.
                      let processed=0;
                      for(const u of unconfirmed){
                        try{
                          const r=await fetch(SUPA_URL+'/auth/v1/resend',{
                            method:'POST',
                            headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
                            body:JSON.stringify({type:'signup',email:u.email})
                          });
                          if(r.ok)sent++;
                          else if(!firstError){
                            const errText=await r.text();
                            firstError='Status '+r.status+': '+errText.slice(0,200);
                          }
                        }catch(err){
                          if(!firstError)firstError='Netzwerkfehler: '+err.message;
                        }
                        processed++;
                        showMsg('⏳ '+processed+'/'+unconfirmed.length+' verarbeitet ('+sent+' erfolgreich)...');
                        await new Promise(res=>setTimeout(res,4000));
                      }
                      showMsg('✅ '+sent+'/'+unconfirmed.length+' gesendet.'+(firstError?' Fehler: '+firstError:''));
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'12px',borderRadius:10,background:'#2980b9',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>✉️ BESTÄTIGUNGSLINK ERNEUT SENDEN</button>
                </div>

                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:6}}>📋 PROFIL-EINRICHTUNG ERINNERN</div>
                  <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Erinnert User, die zwar bestätigt sind, aber ihr Profil (Foto, Gewicht, Stil) nie fertig eingerichtet haben, per E-Mail daran, die Registrierung abzuschließen.</div>
                  <button onClick={async()=>{
                    if(!window.confirm('Erinnerungs-Mail an alle User mit unvollständiger Registrierung senden?'))return;
                    showMsg('Lade alle User...');
                    try{
                      let allUsers=[];
                      let page=1;
                      while(true){
                        const resp=await adminFetch(SUPA_URL+'/auth/v1/admin/users?page='+page+'&per_page=1000',{},session?.token);
                        const data=await resp.json();
                        const batch=data.users||[];
                        allUsers=allUsers.concat(batch);
                        if(batch.length<1000)break;
                        page++;
                        if(page>20)break;
                      }
                      const confirmedUsers=allUsers.filter(u=>u.email_confirmed_at);
                      const profRes=await adminFetch(SUPA_URL+'/rest/v1/profiles?select=user_id',{},session?.token);
                      const existingProfiles=await profRes.json();
                      const profiledIds=new Set((Array.isArray(existingProfiles)?existingProfiles:[]).map(p=>p.user_id));
                      const incomplete=confirmedUsers.filter(u=>!profiledIds.has(u.id));
                      const estMinutesR=Math.ceil(incomplete.length*4/60);
                      showMsg('Sende '+incomplete.length+' Erinnerungen - dauert ca. '+estMinutesR+' Min, bitte Tab offen lassen...');
                      let sent=0;
                      let firstError=null;
                      // EINZELN mit 4s Pause - siehe Erklaerung bei Bestaetigungslinks oben
                      let processedR=0;
                      for(const u of incomplete){
                        try{
                          const r=await fetch(SUPA_URL+'/functions/v1/send-email',{
                            method:'POST',
                            headers:{'Content-Type':'application/json'},
                            body:JSON.stringify({
                              userToken:session?.token,
                              to:u.email,
                              subject:'Fast geschafft — schließ dein Fighter-Profil ab 🥊',
                              html:'<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0d0d0d;color:#fff;border-radius:12px"><h1 style="color:#c0392b;font-size:28px;letter-spacing:4px;margin:0 0 16px">FIGHTER</h1><p style="font-size:15px;line-height:1.6">Hey,<br><br>du hast dich bei Fighter registriert, aber dein Profil noch nicht fertig eingerichtet. Nur noch ein paar Schritte (Foto, Gewichtsklasse, Kampfstil) und du kannst loslegen!</p><a href="https://fighterapp.de" style="display:inline-block;background:#c0392b;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">👊 Jetzt fertig einrichten</a><p style="color:#888;font-size:13px;margin-top:16px">Finde Sparringpartner & Gegner in deiner Nähe.<br>Swipe. Match. Fight.</p><p style="color:#444;font-size:11px;margin-top:24px;border-top:1px solid #222;padding-top:12px">© 2026 Fighter App · fighterapp.de</p></div>'
                            })
                          });
                          if(r.ok)sent++;
                          else if(!firstError){
                            const errText=await r.text();
                            firstError='Status '+r.status+': '+errText.slice(0,200);
                          }
                        }catch(err){
                          if(!firstError)firstError='Netzwerkfehler: '+err.message;
                        }
                        processedR++;
                        showMsg('⏳ '+processedR+'/'+incomplete.length+' verarbeitet ('+sent+' erfolgreich)...');
                        await new Promise(res=>setTimeout(res,4000));
                      }
                      showMsg('✅ '+sent+'/'+incomplete.length+' Erinnerungs-Mails.'+(firstError?' Fehler: '+firstError:''));
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'12px',borderRadius:10,background:'#8e44ad',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>📋 ERINNERUNG SENDEN</button>
                </div>

                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:6}}>🛍️ EQUIPMENT-BEREICH BEWERBEN</div>
                  <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Verschickt eine E-Mail an ALLE bestätigten Nutzer, die auf den Equipment-Bereich und echte Rabattcodes hinweist. Der Link erkennt automatisch, ob jemand vom Handy (→ öffnet direkt die App) oder vom Computer (→ öffnet die Website) aus klickt.</div>
                  <button onClick={async()=>{
                    if(!window.confirm('Equipment-Werbe-Mail an ALLE bestätigten Nutzer senden? Das kann nicht rückgängig gemacht werden.'))return;
                    showMsg('Lade alle User...');
                    try{
                      let allUsers=[];
                      let page=1;
                      while(true){
                        const resp=await adminFetch(SUPA_URL+'/auth/v1/admin/users?page='+page+'&per_page=1000',{},session?.token);
                        const data=await resp.json();
                        const batch=data.users||[];
                        allUsers=allUsers.concat(batch);
                        if(batch.length<1000)break;
                        page++;
                        if(page>20)break;
                      }
                      const confirmedUsers=allUsers.filter(u=>u.email_confirmed_at);
                      const estMinutesE=Math.ceil(confirmedUsers.length*4/60);
                      showMsg('Sende '+confirmedUsers.length+' Equipment-Mails - dauert ca. '+estMinutesE+' Min, bitte Tab offen lassen...');
                      let sent=0;
                      let firstError=null;
                      let processedE=0;
                      const smartLink='https://uykdrmymjvqgebsmndme.supabase.co/functions/v1/smart-redirect?to=equipment';
                      for(const u of confirmedUsers){
                        try{
                          const r=await fetch(SUPA_URL+'/functions/v1/send-email',{
                            method:'POST',
                            headers:{'Content-Type':'application/json'},
                            body:JSON.stringify({
                              userToken:session?.token,
                              to:u.email,
                              subject:'🥊 Exklusive Rabatte auf Kampfsport-Equipment warten auf dich',
                              html:'<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0d0d0d;color:#fff;border-radius:12px"><h1 style="color:#c0392b;font-size:28px;letter-spacing:4px;margin:0 0 16px">FIGHTER</h1><p style="font-size:15px;line-height:1.6">Hey,<br><br>im Equipment-Bereich von Fighter warten <strong style="color:#d4a017">echte Rabattcodes</strong> von unseren Partnermarken auf dich — Handschuhe, Schutzausrüstung und mehr, ausgewählt für Kampfsportler.</p><a href="'+smartLink+'" style="display:inline-block;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">🛍️ Jetzt Rabatte entdecken</a><p style="color:#888;font-size:13px;margin-top:16px">Öffnet sich automatisch in der App, falls du gerade auf dem Handy bist.</p><p style="color:#444;font-size:11px;margin-top:24px;border-top:1px solid #222;padding-top:12px">© 2026 Fighter App · fighterapp.de</p></div>'
                            })
                          });
                          if(r.ok)sent++;
                          else if(!firstError){
                            const errText=await r.text();
                            firstError='Status '+r.status+': '+errText.slice(0,200);
                          }
                        }catch(err){
                          if(!firstError)firstError='Netzwerkfehler: '+err.message;
                        }
                        processedE++;
                        showMsg('⏳ '+processedE+'/'+confirmedUsers.length+' verarbeitet ('+sent+' erfolgreich)...');
                        await new Promise(res=>setTimeout(res,4000));
                      }
                      showMsg('✅ '+sent+'/'+confirmedUsers.length+' Equipment-Mails versendet.'+(firstError?' Fehler: '+firstError:''));
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'12px',borderRadius:10,background:'linear-gradient(135deg,#c0392b,#e74c3c)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>🛍️ EQUIPMENT-MAIL AN ALLE SENDEN</button>
                </div>

                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:6}}>🖼️ ALTE FOTOS KOMPRIMIEREN</div>
                  <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Verkleinert nachträglich alle Profilfotos, die vor der automatischen Komprimierung hochgeladen wurden. Läuft in kleinen Portionen (8 auf einmal) und zeigt den Fortschritt live an - kann jederzeit erneut gestartet werden, macht dann einfach dort weiter, wo es aufgehört hat.</div>
                  <button onClick={async()=>{
                    if(!window.confirm('Alte Profilfotos jetzt komprimieren? Läuft im Hintergrund in mehreren Schritten.'))return;
                    let totalProcessed=0,totalFailed=0,round=0;
                    showMsg('Starte Foto-Komprimierung...');
                    try{
                      while(true){
                        round++;
                        const r=await fetch(SUPA_URL+'/functions/v1/compress-existing-photos',{
                          method:'POST',
                          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
                        });
                        const d=await r.json();
                        if(d.error){showMsg('❌ Fehler: '+d.error);break;}
                        totalProcessed+=d.processed||0;
                        totalFailed+=d.failed||0;
                        showMsg('⏳ Runde '+round+': '+totalProcessed+' komprimiert, noch ~'+(d.remaining||0)+' übrig...');
                        if(d.done||((d.processed||0)===0&&(d.remaining||0)===0))break;
                        if(round>150)break; // Sicherheitsgrenze
                        await new Promise(res=>setTimeout(res,500));
                      }
                      showMsg('✅ Fertig! '+totalProcessed+' Fotos komprimiert'+(totalFailed>0?', '+totalFailed+' übersprungen (fehlerhaft)':''));
                    }catch(e){showMsg('❌ Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'12px',borderRadius:10,background:'#16a085',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>🖼️ FOTOS JETZT KOMPRIMIEREN</button>
                </div>
              </div>
            )}

            {/* ── STATISTIKEN ── */}
            {adminTab==='scanner'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🔍 STÄDTE & GYMS SCANNER</div>
                <button onClick={async()=>{
                  showMsg('Scanne alle Profile...');
                  try{
                    // Alle Profile laden — über die sichere Admin-Schleuse
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/profiles?select=city,gym&limit=500',{},session?.token);
                    const profiles=await resp.json();
                    // Bekannte Gyms aus DB
                    const gymResp=await adminFetch(SUPA_URL+'/rest/v1/gyms?select=city,name',{},session?.token);
                    const existingGyms=await gymResp.json();
                    const existingCities=new Set((Array.isArray(existingGyms)?existingGyms:[]).map(g=>g.city?.toLowerCase().trim()));
                    const existingGymNames=new Set((Array.isArray(existingGyms)?existingGyms:[]).map(g=>g.name?.toLowerCase().trim()));
                    // Hardcoded Städte auch
                    Object.keys(GYMS).forEach(c=>existingCities.add(c.toLowerCase()));
                    // Neue Städte finden
                    const newCities={};
                    const newGyms={};
                    if(Array.isArray(profiles)){
                      profiles.forEach(p=>{
                        if(p.city&&!existingCities.has(p.city.toLowerCase().trim())){
                          newCities[p.city]=(newCities[p.city]||0)+1;
                        }
                        if(p.gym&&!existingGymNames.has(p.gym.toLowerCase().trim())){
                          newGyms[p.gym]={city:p.city,count:(newGyms[p.gym]?.count||0)+1};
                        }
                      });
                    }
                    setScanResult({cities:Object.entries(newCities).sort((a,b)=>b[1]-a[1]),gyms:Object.entries(newGyms).sort((a,b)=>b[1].count-a[1].count)});
                    showMsg('Scan abgeschlossen!');
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:16}}>
                  🔍 JETZT SCANNEN
                </button>
                {scanResult&&(
                  <>
                    {/* Fehlende Städte */}
                    {scanResult.cities.length>0&&(
                      <div style={{marginBottom:16}}>
                        <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>FEHLENDE STÄDTE ({scanResult.cities.length})</div>
                        {scanResult.cities.map(([city,count])=>(
                          <div key={city} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                            <div style={{flex:1}}>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{city}</div>
                              <div style={{color:'#aaa',fontSize:11}}>{count} User</div>
                            </div>
                            <button onClick={async()=>{
                              try{
                                // Nur Stadt hinzufügen — User kann danach Gym Namen eingeben
                                const gymName=window.prompt('Gym Name für '+city+' (oder leer lassen):');
                                const name=gymName&&gymName.trim()?gymName.trim():'Kampfsport '+city;
                                await adminFetch(SUPA_URL+'/rest/v1/gyms',{
                                  method:'POST',
                                  headers:{Prefer:'return=minimal'},
                                  body:JSON.stringify({name,city,code:name.toUpperCase().replace(/[^A-Z0-9]/g,'-').slice(0,20)+'-'+Date.now().toString().slice(-4),emoji:'',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})
                                },session?.token);
                                setScanResult(prev=>({...prev,cities:prev.cities.filter(([c])=>c!==city)}));
                                await loadDbGyms(session);
                                showMsg('✅ '+city+' hinzugefügt');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }} style={{background:'#27ae60',border:'none',borderRadius:6,padding:'6px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Hinzufügen</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Fehlende Gyms */}
                    {scanResult.gyms.length>0&&(
                      <div>
                        <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>FEHLENDE GYMS ({scanResult.gyms.length})</div>
                        {scanResult.gyms.map(([gym,data])=>(
                          <div key={gym} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                            <div style={{flex:1}}>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{gym}</div>
                              <div style={{color:'#aaa',fontSize:11}}>{data.city||'?'} · {data.count} User</div>
                            </div>
                            <button onClick={async()=>{
                              try{
                                const r=await adminFetch(SUPA_URL+'/rest/v1/gyms',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:gym,city:data.city||'Unbekannt',code:gym.toUpperCase().replace(/\s/g,'-').slice(0,20),emoji:'',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})},session?.token);
                                if(!r.ok){showMsg('❌ Hinzufügen fehlgeschlagen ('+r.status+')');return;}
                                setScanResult(prev=>({...prev,gyms:prev.gyms.filter(([g])=>g!==gym)}));
                                await loadDbGyms(session);
                                showMsg('✅ '+gym+' hinzugefügt');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }} style={{background:'#27ae60',border:'none',borderRadius:6,padding:'6px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Hinzufügen</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {scanResult.cities.length===0&&scanResult.gyms.length===0&&(
                      <div style={{textAlign:'center',padding:'30px',color:darkMode?'#555':'#bbb'}}>
                        <div style={{fontSize:32,marginBottom:8}}>✅</div>
                        <div style={{fontSize:14}}>{appLang==='FR'?'Toutes les villes et salles sont déjà enregistrées!':appLang==='EN'?'All cities and gyms are already registered!':'Alle Städte und Gyms sind bereits erfasst!'}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {adminTab==='stats'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>📊 ECHTZEIT STATISTIKEN</div>
                <button onClick={async()=>{
                  try{
                    const resp=await adminFetch(SUPA_URL+'/rest/v1/profiles?order=created_at.desc&limit=1000',{},session?.token);
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminUsers(data);setAdminUsersLoaded(true);}
                    const [sRes,mRes,msgRes]=await Promise.all([
                      // WICHTIG: Die swipes-Tabelle hat KEINE created_at-Spalte
                      // (nur id, swiper_id, target_id, direction). Wird sie hier
                      // abgefragt oder sortiert, antwortet Supabase mit
                      // "column swipes.created_at does not exist" (HTTP 400) und
                      // die Swipe-Zahlen blieben leer. Ausgewertet wird ohnehin
                      // nur 'direction' (Likes/Passes zaehlen).
                      adminFetch(SUPA_URL+'/rest/v1/swipes?select=direction&limit=5000',{},session?.token),
                      adminFetch(SUPA_URL+'/rest/v1/matches?select=id,created_at&order=created_at.desc&limit=2000',{},session?.token),
                      adminFetch(SUPA_URL+'/rest/v1/messages?select=id,match_id,created_at&order=created_at.desc&limit=5000',{},session?.token),
                    ]);
                    const [sData,mData,msgData]=await Promise.all([sRes.json(),mRes.json(),msgRes.json()]);
                    // Fehlerantworten sichtbar machen, statt still eine leere Liste
                    // zu behalten - genau diese Stille hatte den fehlenden
                    // created_at-Fehler oben lange verborgen.
                    [['Swipes',sData],['Matches',mData],['Nachrichten',msgData]].forEach(([n,d])=>{
                      if(!Array.isArray(d))console.error('Statistik '+n+' laden fehlgeschlagen:',d);
                    });
                    if(Array.isArray(sData))setAdminSwipes(sData);
                    if(Array.isArray(mData))setAdminMatches(mData);
                    if(Array.isArray(msgData))setAdminChatMsgs(msgData);
                    setAdminMatchStatsLoaded(true);
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12}}>
                  🔄 STATS AKTUALISIEREN
                </button>
                {adminMatchStatsLoaded&&(()=>{
                  const now=Date.now();
                  const day=86400000,week=604800000;
                  const likes=adminSwipes.filter(s=>s.direction==='like').length;
                  const passes=adminSwipes.filter(s=>s.direction==='pass').length;
                  const totalSwipes=adminSwipes.length;
                  const matchesToday=adminMatches.filter(m=>m.created_at&&(now-new Date(m.created_at).getTime())<day).length;
                  const matchesWeek=adminMatches.filter(m=>m.created_at&&(now-new Date(m.created_at).getTime())<week).length;
                  const matchRate=likes>0?((adminMatches.length/likes)*100).toFixed(1):'0.0';
                  const msgsToday=adminChatMsgs.filter(m=>m.created_at&&(now-new Date(m.created_at).getTime())<day).length;
                  const msgPerMatch=adminMatches.length>0?(adminChatMsgs.length/adminMatches.length).toFixed(1):'0.0';
                  return(
                    <div style={{marginBottom:12}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>🥊 MATCHING & ENGAGEMENT</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                        {[
                          ['💕','Matches gesamt',adminMatches.length],
                          ['🔥','Matches heute',matchesToday],
                          ['📅','Matches Woche',matchesWeek],
                          ['🎯','Match-Rate',matchRate+'%'],
                          ['👍','Likes gesamt',likes],
                          ['👎','Passes gesamt',passes],
                          ['💬','Nachrichten gesamt',adminChatMsgs.length],
                          ['✉️','Nachrichten heute',msgsToday],
                        ].map(([icon,label,val])=>(
                          <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'12px 10px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),textAlign:'center'}}>
                            <div style={{fontSize:18}}>{icon}</div>
                            <div style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,lineHeight:1}}>{val}</div>
                            <div style={{color:darkMode?'#aaa':'#888',fontSize:9,marginTop:2}}>{label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'10px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),fontSize:11,color:darkMode?'#888':'#999'}}>
                        Ø {msgPerMatch} Nachrichten pro Match · {totalSwipes} Swipes insgesamt erfasst
                      </div>
                    </div>
                  );
                })()}
                {adminUsersLoaded&&(
                  <>
                    {/* Haupt-Stats */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                      {[
                        ['','Gesamt User',adminUsers.length],
                        ['🟢','Heute aktiv',adminUsers.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<86400000).length],
                        ['⚡','Diese Woche',adminUsers.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<604800000).length],
                        ['🚫','Gesperrt',adminUsers.filter(u=>u.banned).length],
                      ].map(([icon,label,val])=>(
                        <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),textAlign:'center'}}>
                          <div style={{fontSize:22}}>{icon}</div>
                          <div style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:28,lineHeight:1}}>{val}</div>
                          <div style={{color:darkMode?'#aaa':'#888',fontSize:10,marginTop:2}}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Neue User heute */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:8}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>NEUE USER HEUTE</div>
                      {adminUsers.filter(u=>u.created_at&&(Date.now()-new Date(u.created_at).getTime())<86400000).length===0
                        ?<div style={{color:darkMode?'#555':'#bbb',fontSize:12,textAlign:'center',padding:'8px 0'}}>{appLang==='FR'?"Pas encore de nouveaux utilisateurs aujourd'hui":appLang==='EN'?'No new users today':'Noch keine neuen User heute'}</div>
                        :adminUsers.filter(u=>u.created_at&&(Date.now()-new Date(u.created_at).getTime())<86400000).map((u,i)=>(
                          <div key={i} onClick={()=>{setShowAdmin(false);setViewProfile(u);}} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                            {u.avatar_url?<img loading="lazy" src={u.avatar_url} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt=''/>:<div style={{width:28,height:28,borderRadius:'50%',background:RED,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',fontWeight:700,flexShrink:0}}>{u.name?u.name[0].toUpperCase():'?'}</div>}
                            <div style={{flex:1}}>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,fontWeight:600}}>{u.name||'Unbekannt'}</div>
                              <div style={{color:darkMode?'#666':'#aaa',fontSize:10}}>{u.style||'?'} · {u.city||'?'}</div>
                            </div>
                            <div style={{color:darkMode?'#555':'#bbb',fontSize:10}}>{u.created_at?new Date(u.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'?'}</div>
                          </div>
                        ))
                      }
                    </div>
                    {/* Alle User */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:8}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>ALLE USER ({adminUsers.length})</div>
                      <input value={adminCityFilter} onChange={e=>setAdminCityFilter(e.target.value)} placeholder='🔍 Nach Stadt filtern...'
                        style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:12,boxSizing:'border-box',marginBottom:10}}/>
                      {adminCityFilter.trim()&&(
                        <div style={{color:'#8e44ad',fontSize:11,fontWeight:700,marginBottom:8}}>{adminUsers.filter(u=>(u.city||'').toLowerCase().includes(adminCityFilter.trim().toLowerCase())).length} Kämpfer in "{adminCityFilter.trim()}"</div>
                      )}
                      {adminUsers.filter(u=>!adminCityFilter.trim()||(u.city||'').toLowerCase().includes(adminCityFilter.trim().toLowerCase())).map((u,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                          <div onClick={()=>{setShowAdmin(false);setViewProfile(u);}} style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0,cursor:'pointer'}}>
                            {u.avatar_url?<img loading="lazy" src={u.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0,opacity:u.banned?0.4:1}} alt=''/>:<div style={{width:32,height:32,borderRadius:'50%',background:u.banned?'#555':RED,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700,flexShrink:0}}>{u.name?u.name[0].toUpperCase():'?'}</div>}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:u.banned?'#e74c3c':(darkMode?'#fff':'#1a1a1a'),fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name||'Unbekannt'} {u.banned&&'🚫'}</div>
                              <div style={{color:darkMode?'#666':'#aaa',fontSize:10}}>{u.style||'?'} · {u.city||'?'}</div>
                            </div>
                          </div>
                          <button onClick={()=>startAdminChat(u)} title='Chat starten' style={{background:RED,border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>🗨️ CHAT</button>
                          <div style={{color:darkMode?'#555':'#888',fontSize:10,flexShrink:0}}>{u.created_at?new Date(u.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'?'}</div>
                        </div>
                      ))}
                    </div>
                    {/* Top Städte */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:8}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>TOP STÄDTE</div>
                      {(()=>{const cnt={};const norm=s=>(s||'').trim().toLowerCase().replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ä/g,'ae').replace(/ß/g,'ss');const normMap={};adminUsers.forEach(u=>{if(u.city){const k=norm(u.city);if(!normMap[k])normMap[k]=u.city.trim();cnt[normMap[k]]=(cnt[normMap[k]]||0)+1;}});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([city,count],i)=>(
                        <div key={city} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f5f5f5')}}>
                          <span style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '} {city}</span>
                          <span style={{color:RED,fontWeight:700,fontSize:13}}>{count}</span>
                        </div>
                      ))})()}
                    </div>
                    {/* Top Kampfstile */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>TOP KAMPFSTILE</div>
                      {(()=>{const cnt={};adminUsers.forEach(u=>{if(u.style)cnt[u.style]=(cnt[u.style]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([style,count],i)=>(
                        <div key={style} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f5f5f5')}}>
                          <span style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>{style}</span>
                          <span style={{color:RED,fontWeight:700,fontSize:13}}>{count}</span>
                        </div>
                      ))})()}
                    </div>
                  </>
                )}
                {!adminUsersLoaded&&<div style={{color:darkMode?'#555':'#bbb',fontSize:13,textAlign:'center',padding:'20px 0'}}>Klicke auf "Stats aktualisieren" um die Daten zu laden</div>}
              </div>
            )}

          </div>
          </div>
        </div>  );
}
