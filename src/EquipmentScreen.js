// Die Equipment-/Supplement-Ansicht: Produktliste mit Suche, Kategorie-
// Auswahl und Sortierung, plus die einzelne Produktkarte (EquipCard).
//
// Bewusst als eigene Datei ausgelagert. EquipCard liegt bewusst MIT hier
// drin, weil sie ausschliesslich von EquipmentScreen verwendet wird und
// sonst allein in App.js zurueckbliebe.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben worden.
// Die Ansicht bekommt SUPA_URL/SUPA_KEY als Prop uebergeben - das war
// schon vorher so und wurde bewusst nicht angetastet.

import React from 'react';
// EquipCard (weiter unten) nutzt SUPA_URL/SUPA_KEY beim Klick-Zaehlen, ohne
// sie als Prop zu bekommen. In App.js waren sie dort ueber den Datei-Bereich
// sichtbar - hier muessen sie ausdruecklich importiert werden. Es sind
// dieselben Werte, das Verhalten bleibt also identisch.
// (In EquipmentScreen selbst ueberdecken die gleichnamigen Props diesen
// Import - genau wie vorher in App.js.)
import { SUPA_URL, SUPA_KEY } from './constants';

function EquipmentScreen({darkMode,appLang,SUPA_URL,SUPA_KEY,onSuggest,itemType='equipment'}){
  const [items,setItems]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [activeCategory,setActiveCategory]=React.useState('Alle');
  const [categoryOpen,setCategoryOpen]=React.useState(false);
  const [searchQuery,setSearchQuery]=React.useState('');
  const [sortMode,setSortMode]=React.useState('popular'); // 'popular' | 'newest'
  const RED='#c0392b';

  React.useEffect(()=>{
    // Equipment und Supplements teilen sich dieselbe Tabelle, getrennt
    // ueber das 'item_type' Feld - so kann derselbe Bildschirm fuer beide
    // Bereiche wiederverwendet werden.
    //
    // WICHTIG: cache:'no-store' verhindert, dass iOS/Safari eine VERALTETE
    // Antwort dieser URL zwischenspeichert und beim naechsten Oeffnen
    // wiederverwendet. Ohne das konnte es passieren, dass frisch
    // hinzugefuegte Produkte fuer Nutzer "verschwunden" wirkten, obwohl
    // sie in der Datenbank die ganze Zeit vorhanden waren.
    //
    // NIEMALS einen Zeitstempel (&_ts=...) an diese URL haengen! Supabase
    // deutet JEDEN unbekannten Parameter als Spalten-Filter und bricht die
    // ganze Abfrage ab ("failed to parse filter"). Genau das hatte dazu
    // gefuehrt, dass hier gar keine Produkte mehr angezeigt wurden.
    // cache:'no-store' allein erledigt die Aufgabe zuverlaessig.
    fetch(SUPA_URL+'/rest/v1/equipment?order=featured.desc,sort_order.asc&item_type=eq.'+itemType,{
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
      cache:'no-store'
    }).then(r=>r.json()).then(data=>{
      if(!Array.isArray(data)){
        // Fehlerantwort von Supabase - sichtbar machen, statt still eine
        // leere Liste anzuzeigen. Genau diese Stille hat den Fehler oben
        // lange unentdeckt gelassen.
        console.error('Equipment laden fehlgeschlagen:',data);
      }
      setItems(Array.isArray(data)?data:[]);
      setLoading(false);
    }).catch(e=>{console.error('Equipment laden fehlgeschlagen:',e);setLoading(false);});
  },[]);

  const categories=['Alle',...new Set(items.map(i=>i.category).filter(Boolean))];
  const normSearch=(searchQuery||'').toLowerCase().trim();
  const bySearch=!normSearch?items:items.filter(i=>
    (i.brand||'').toLowerCase().includes(normSearch)||
    (i.product||'').toLowerCase().includes(normSearch)||
    (i.description||'').toLowerCase().includes(normSearch)
  );
  const filtered=activeCategory==='Alle'?bySearch:bySearch.filter(i=>i.category===activeCategory);
  const featured=filtered.filter(i=>i.featured);
  const restUnsorted=filtered.filter(i=>!i.featured);
  const rest=restUnsorted.slice().sort((a,b)=>{
    if(sortMode==='newest') return new Date(b.created_at||0)-new Date(a.created_at||0);
    return (b.click_count||0)-(a.click_count||0); // 'popular' (Standard)
  });

  if(loading)return(
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:32,marginBottom:8}}>⏳</div>
      <div style={{color:'#aaa',fontSize:13}}>Laden...</div>
    </div>
  );

  if(items.length===0)return(
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:64,marginBottom:16}}>🥊</div>
      <div style={{fontFamily:'Rajdhani,sans-serif',color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:3,marginBottom:8}}>COMING SOON</div>
      <div style={{color:'#aaa',fontSize:13,lineHeight:1.7,maxWidth:280,margin:'0 auto'}}>
        {itemType==='supplement'?(appLang==='FR'?'Bientôt disponible — les meilleurs suppléments pour sportifs de combat.':appLang==='EN'?'Coming soon — the best supplements for combat athletes.':'Bald findest du hier die besten Supplements für Kampfsportler.'):(appLang==='FR'?'Bientôt disponible — la meilleure équipement de sport de combat.':appLang==='EN'?'Coming soon — the best combat sports equipment, curated by real athletes.':'Bald findest du hier die beste Kampfsport-Ausrüstung — kuratiert von echten Athleten.')}
      </div>
      <button onClick={onSuggest} style={{marginTop:20,padding:'12px 24px',borderRadius:10,background:'linear-gradient(135deg,#c0392b,#e74c3c)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer'}}>
        ⭐ {appLang==='FR'?'SUGGÉRER':appLang==='EN'?'SUGGEST':'VORSCHLAGEN'}
      </button>
    </div>
  );

  return(
    <div>
      {/* Suche + Kategorie-Auswahl - bleiben beim Scrollen oben sichtbar */}
      <div style={{position:'sticky',top:0,zIndex:5,background:darkMode?'#0d0d0d':'#f5f5f7',paddingBottom:10,marginBottom:6}}>
        <input
          value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)}
          placeholder={appLang==='FR'?'Rechercher un produit...':appLang==='EN'?'Search products...':'Produkt oder Marke suchen...'}
          style={{width:'100%',padding:'6px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#1a1a1a':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box',marginBottom:6}}
        />
        {categories.length>1&&(
          <div style={{position:'relative'}}>
            <div onClick={()=>setCategoryOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:10,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),cursor:'pointer'}}>
              <span style={{fontSize:12}}>🗂️</span>
              <span style={{flex:1,color:darkMode?'#fff':'#1a1a1a',fontSize:12,fontWeight:600}}>{activeCategory}</span>
              <span style={{color:'#aaa',fontSize:10,transform:categoryOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
            </div>
            {categoryOpen&&(
              <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:20,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',maxHeight:280,overflowY:'auto',padding:6}}>
                {categories.map(cat=>(
                  <div key={cat} onClick={()=>{setActiveCategory(cat);setCategoryOpen(false);}}
                    style={{padding:'9px 12px',borderRadius:8,cursor:'pointer',background:activeCategory===cat?(darkMode?'#2a1414':'#fdecea'):'transparent',color:activeCategory===cat?RED:(darkMode?'#e0e0e0':'#333'),fontSize:13,fontWeight:activeCategory===cat?700:500}}>
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Featured */}
      {featured.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{color:'#d4a017',fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:10}}>⭐ EMPFOHLEN</div>
          {featured.map(eq=><EquipCard key={eq.id} eq={eq} darkMode={darkMode} RED={RED}/>)}
        </div>
      )}

      {/* Rest - mit Ueberschrift und Sortier-Umschalter, immer sichtbar sobald Eintraege da sind */}
      {rest.length>0&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{color:'#aaa',fontSize:11,fontWeight:700,letterSpacing:2}}>{sortMode==='popular'?'🔥 BELIEBTESTE':'🆕 NEUESTE'}</div>
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>setSortMode('popular')} style={{padding:'4px 10px',borderRadius:14,border:'1px solid '+(sortMode==='popular'?RED:(darkMode?'#333':'#ddd')),background:sortMode==='popular'?RED:'transparent',color:sortMode==='popular'?'#fff':(darkMode?'#aaa':'#666'),fontSize:10,fontWeight:700,cursor:'pointer'}}>Beliebtheit</button>
              <button onClick={()=>setSortMode('newest')} style={{padding:'4px 10px',borderRadius:14,border:'1px solid '+(sortMode==='newest'?RED:(darkMode?'#333':'#ddd')),background:sortMode==='newest'?RED:'transparent',color:sortMode==='newest'?'#fff':(darkMode?'#aaa':'#666'),fontSize:10,fontWeight:700,cursor:'pointer'}}>Neueste</button>
            </div>
          </div>
          {rest.map(eq=><EquipCard key={eq.id} eq={eq} darkMode={darkMode} RED={RED}/>)}
        </div>
      )}

      {/* Leerer Zustand, wenn Suche/Kategorie nichts findet (aber generell Produkte existieren) */}
      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:'40px 20px',color:'#aaa'}}>
          <div style={{fontSize:32,marginBottom:8}}>🔍</div>
          <div style={{fontSize:13}}>Keine Produkte gefunden{activeCategory!=='Alle'?' in "'+activeCategory+'"':''}{searchQuery?' für "'+searchQuery+'"':''}.</div>
        </div>
      )}

      {/* Suggest button */}
      <button onClick={onSuggest} style={{width:'100%',marginTop:20,padding:'12px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#ddd'),color:darkMode?'#aaa':'#888',fontSize:13,cursor:'pointer'}}>
        ⭐ {appLang==='FR'?'Suggérer un produit':appLang==='EN'?'Suggest a product':'Produkt vorschlagen'}
      </button>
    </div>
  );
}

function EquipCard({eq,darkMode,RED}){
  const [pressed,setPressed]=React.useState(false);
  const [shareMsg,setShareMsg]=React.useState('');

  async function shareEquip(e){
    e.stopPropagation();
    const shareText=eq.brand+' — '+eq.product+' 🥊 Gesehen in der Fighter App: https://fighterapp.de';
    if(navigator.share){
      try{
        await navigator.share({title:eq.brand+' - '+eq.product,text:shareText,url:'https://fighterapp.de'});
      }catch{/* Nutzer hat Teilen-Dialog abgebrochen - kein Fehler */}
    }else{
      try{
        await navigator.clipboard.writeText(shareText);
        setShareMsg('Link kopiert!');
        setTimeout(()=>setShareMsg(''),1800);
      }catch{}
    }
  }

  return(
    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid '+(eq.featured?'#d4a01733':(darkMode?'#2a2a2a':'#eee')),boxShadow:eq.featured?'0 2px 12px rgba(212,160,23,0.08)':'none',position:'relative'}}>
      <button onClick={shareEquip} aria-label='Teilen' style={{position:'absolute',top:10,right:10,background:darkMode?'#2a2a2a':'#f5f5f7',border:'none',borderRadius:8,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,zIndex:1}}>
        📤
      </button>
      {shareMsg&&<div style={{position:'absolute',top:44,right:10,background:'#27ae60',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 8px',borderRadius:6,zIndex:2}}>{shareMsg}</div>}
      <div style={{display:'flex',gap:12,alignItems:'flex-start',paddingRight:36}}>
        {eq.image_url&&<img loading="lazy" src={eq.image_url} style={{width:64,height:64,borderRadius:10,objectFit:'cover',flexShrink:0}} alt={eq.product} onError={e=>e.target.style.display='none'}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4}}>
            <span style={{background:RED+'18',borderRadius:20,padding:'1px 8px',color:RED,fontSize:10,fontWeight:700}}>{eq.category}</span>
            {eq.featured&&!eq.sponsored&&<span style={{background:'#d4a01718',borderRadius:20,padding:'1px 8px',color:'#d4a017',fontSize:10,fontWeight:700}}>⭐</span>}
            {eq.sponsored&&<span style={{background:'#88888822',borderRadius:20,padding:'1px 8px',color:'#888',fontSize:10,fontWeight:700}}>ANZEIGE</span>}
          </div>
          <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{eq.brand}</div>
          <div style={{color:darkMode?'#ddd':'#444',fontSize:13,marginTop:1}}>{eq.product}</div>
          {eq.description&&<div style={{color:'#aaa',fontSize:11,marginTop:4,lineHeight:1.5}}>{eq.description}</div>}
          {eq.discount_code&&(
            <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#27ae6018',border:'1px solid #27ae6033',borderRadius:8,padding:'3px 8px',marginTop:6}}>
              <span style={{color:'#27ae60',fontSize:11,fontWeight:700}}>🏷️ Code: {eq.discount_code}</span>
            </div>
          )}
        </div>
      </div>
      {eq.url&&(
        <a href={eq.url} target='_blank' rel='noopener noreferrer'
          onClick={()=>{
            // Klick zaehlen (still im Hintergrund, blockiert das Oeffnen nicht)
            fetch(SUPA_URL+'/functions/v1/track-equipment-click',{
              method:'POST',
              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
              body:JSON.stringify({equipmentId:eq.id})
            }).catch(()=>{});
          }}
          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',marginTop:10,padding:'10px',borderRadius:10,background:pressed?RED+'dd':'linear-gradient(135deg,'+RED+',#e74c3c)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer',textDecoration:'none',boxSizing:'border-box'}}
          onMouseEnter={()=>setPressed(true)} onMouseLeave={()=>setPressed(false)}>
          🔗 JETZT ANSEHEN →
        </a>
      )}
    </div>
  );
}

export default EquipmentScreen;
