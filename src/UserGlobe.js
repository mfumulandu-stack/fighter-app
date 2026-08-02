// Der 3D-Globus, der zeigt, wo auf der Welt Fighter unterwegs sind.
//
// Bewusst als eigene Datei ausgelagert - eine in sich geschlossene Ansicht
// samt ihrer Hilfsteile: dem nachgeladenen Globe-Baustein, der Geraete-
// Erkennung fuer die Texturgroesse und der eigenen Fehler-Schutzhuelle.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben worden.
// SUPA_URL/SUPA_KEY bekommt die Komponente als Prop uebergeben - das war
// schon vorher so.
//
// WICHTIG FUER KUENFTIGE AENDERUNGEN: Auf Mobilgeraeten wird bewusst die
// kleinere 4K-Textur geladen und die Aufloesung NICHT hochgesetzt. Beides
// hatte schon einmal dazu gefuehrt, dass iPhones den Speicher ueberliefen
// und die App abstuerzte.

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { CITY_COORDS } from './appData';

const Globe=lazy(()=>import('react-globe.gl'));

// Mobile Geräte (iPhone/Android) haben strenge GPU-Speicherlimits im Browser/WebView —
// sie bekommen die 4K-Textur, Desktop die scharfe 8K-Version
const IS_MOBILE_DEVICE=typeof navigator!=='undefined'&&/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// safeLocalNotification steht jetzt in src/notifications.js (Import ganz oben).

// Fängt Fehler beim Globus-Rendern ab, damit NIE wieder die ganze App
// schwarz wird — stattdessen erscheint eine Meldung und man kann schließen
class GlobeErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={hasError:false};}
  static getDerivedStateFromError(){return{hasError:true};}
  componentDidCatch(err){console.error('Globus-Fehler abgefangen:',err);}
  render(){
    if(this.state.hasError){
      return(
        <div style={{color:'rgba(255,255,255,0.7)',fontFamily:'Rajdhani,sans-serif',fontSize:16,textAlign:'center',padding:24}}>
          Der Globus konnte auf diesem Gerät nicht geladen werden.<br/>
          <span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Tippe oben rechts auf ✕ zum Schließen.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

function UserGlobe({darkMode,onClose,SUPA_URL,SUPA_KEY}){
  const globeRef=useRef();
  const [points,setPoints]=useState([]);
  const [totalCount,setTotalCount]=useState(0);
  const [loading,setLoading]=useState(true);
  // Skalierungsfaktor für Punkte/Beschriftung: 1 = ganz rausgezoomt, schrumpft beim Reinzoomen,
  // damit nah beieinanderliegende Städte (z.B. NRW) nicht zu einem Klumpen verschmelzen
  const [ptScale,setPtScale]=useState(1);
  function handleZoom(pov){
    const s=Math.min(1,Math.max(0.03,pov.altitude/1.6));
    // nur neu rendern, wenn sich die Skala spürbar geändert hat (>15%)
    setPtScale(prev=>Math.abs(prev-s)/prev>0.15?s:prev);
  }

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        // Alle nicht gesperrten Profile seitenweise laden — Supabase liefert
        // max. 1000 Zeilen pro Anfrage, deshalb Range-Header + Schleife.
        // Prefer:count=exact liefert im content-range-Header die echte Gesamtzahl.
        const all=[];
        let from=0,total=0;
        while(true){
          const res=await fetch(SUPA_URL+'/rest/v1/profiles?select=lat,lon,city&banned=eq.false',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,Range:from+'-'+(from+999),Prefer:'count=exact'}
          });
          const data=await res.json();
          if(!Array.isArray(data))break;
          all.push(...data);
          const range=res.headers.get('content-range'); // z.B. "0-999/1234"
          total=parseInt((range||'').split('/')[1],10)||all.length;
          if(data.length===0||all.length>=total)break;
          from+=1000;
        }
        if(active){
          // Fallback: Nutzer ohne GPS-Freigabe über ihre Profil-Stadt verorten
          const cityLookup={};
          Object.keys(CITY_COORDS).forEach(k=>{cityLookup[k.toLowerCase()]=CITY_COORDS[k];});
          // Nutzer PRO STADT zu einem Punkt zusammenfassen (nicht pro Rasterzelle),
          // sonst überlappen sich in dichten Regionen wie NRW die Nachbarpunkte.
          // Koordinaten-Rundung (~5km Raster) — bewusst KEINE exakten Koordinaten,
          // damit kein einzelner Nutzer auf seine genaue Adresse zurückverfolgbar ist.
          const CITY_GRID=0.05; // ca. 5km bei mittleren Breitengraden
          const seen={};
          const pts=[];
          all.forEach(d=>{
            const cityKey=(d.city||'').trim().toLowerCase();
            let lat=d.lat,lon=d.lon;
            if(!lat||!lon){
              const cc=cityLookup[cityKey];
              if(!cc)return; // weder GPS noch bekannte Stadt — zählt im Gesamtzähler, aber kein Punkt
              lat=cc.lat;lon=cc.lon;
            }
            const roundedLat=Math.round(lat/CITY_GRID)*CITY_GRID;
            const roundedLon=Math.round(lon/CITY_GRID)*CITY_GRID;
            const key=cityKey||roundedLat+'_'+roundedLon;
            if(seen[key]){seen[key].count++;}
            else{const p={lat:roundedLat,lng:roundedLon,city:(d.city||'').trim(),count:1};seen[key]=p;pts.push(p);}
          });
          setPoints(pts);
          setTotalCount(total);
        }
      }catch(e){console.error('Globe-Daten laden fehlgeschlagen',e);}
      if(active)setLoading(false);
    })();
    return()=>{active=false;};
  },[SUPA_URL,SUPA_KEY]);

  // Läuft über onGlobeReady — also garantiert NACH der internen Kalibrierung
  // der Bibliothek, die sonst unsere Werte wieder überschreiben würde
  function setupGlobe(){
    const g=globeRef.current;
    if(!g)return;
    // Kamera auf Mitteleuropa ausrichten, damit Nutzer direkt sichtbar sind
    g.pointOfView({lat:48,lng:9,altitude:1.6},0);
    const renderer=g.renderer&&g.renderer();
    const controls=g.controls&&g.controls();
    if(controls){
      controls.autoRotate=false;
      controls.enableZoom=true;
      controls.maxDistance=800;
      // globe.gl setzt bei JEDER Kamerabewegung zoomSpeed=sqrt(Höhe)*0.5 —
      // nahe der Oberfläche friert der Zoom dadurch gefühlt ein. Dieser Listener
      // ist nach dem der Bibliothek registriert, läuft also danach und hebt
      // die Drossel wieder an (mit Unter-/Obergrenze für angenehmes Tempo).
      controls.addEventListener('change',()=>{
        controls.zoomSpeed=Math.min(2,Math.max(0.3,controls.zoomSpeed*3));
      });
    }
    // WICHTIG: KEINE 3x-Retina-Auflösung erzwingen! Framebuffer bei 3x + Kantenglättung
    // sprengt das GPU-Speicherlimit von iOS-WebViews -> schwarzer Bildschirm / Tab-Crash.
    // Die 2x-Begrenzung der Bibliothek ist auf iPhones die sichere Wahl.
    // anisotropes Filtern schärft die Erd-Textur bei Zoom und Schrägsicht;
    // die Textur lädt asynchron, deshalb warten bis sie da ist
    let tries=0;
    (function sharpen(){
      let done=false;
      const scene=g.scene&&g.scene();
      scene&&scene.traverse(o=>{
        if(!done&&o.material&&o.material.map){
          o.material.map.anisotropy=renderer?renderer.capabilities.getMaxAnisotropy():8;
          o.material.map.needsUpdate=true;
          done=true;
        }
      });
      if(!done&&tries++<50)setTimeout(sharpen,200);
    })();
  }

  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:600,display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',top:'calc(16px + env(safe-area-inset-top))',right:16,zIndex:10}}>
        <button onClick={onClose} style={{width:38,height:38,borderRadius:19,background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',fontSize:18,cursor:'pointer'}}>✕</button>
      </div>
      <div style={{position:'absolute',top:'calc(16px + env(safe-area-inset-top))',left:16,zIndex:10,color:'#fff',fontFamily:'Rajdhani,sans-serif'}}>
        <div style={{fontSize:13,letterSpacing:2,color:'rgba(255,255,255,0.6)'}}>FIGHTER WELTWEIT</div>
        <div style={{fontSize:22,fontWeight:700,color:'#f5a623'}}>{totalCount} FIGHTER</div>
        {(()=>{const located=points.reduce((s,p)=>s+p.count,0);return located<totalCount?(
          <div style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>{located} auf der Karte verortet</div>
        ):null;})()}
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {loading?(
          <div style={{color:'rgba(255,255,255,0.5)',fontFamily:'Rajdhani,sans-serif',fontSize:16}}>Lädt Globus...</div>
        ):(
          <GlobeErrorBoundary>
          <Suspense fallback={<div style={{color:'rgba(255,255,255,0.5)'}}>Lädt...</div>}>
            <Globe
              ref={globeRef}
              onGlobeReady={setupGlobe}
              width={window.innerWidth}
              height={window.innerHeight}
              backgroundColor='#000000'
              globeImageUrl={IS_MOBILE_DEVICE?'/earth-night-4k.jpg':'/earth-night-8k.jpg'}
              bumpImageUrl='//unpkg.com/three-globe/example/img/earth-topology.png'
              onZoom={handleZoom}
              labelsData={points}
              labelLat='lat'
              labelLng='lng'
              labelColor={()=>'#f5a623'}
              labelAltitude={0.008}
              labelResolution={2}
              labelDotRadius={d=>(0.05+Math.min(d.count*0.015,0.1))*ptScale}
              labelText={d=>ptScale<0.5?(d.city?d.city+(d.count>1?' · '+d.count:''):String(d.count)):''}
              labelSize={()=>Math.max(0.1,0.4*ptScale)}
              labelLabel={d=>`${d.city||'Unbekannt'} · ${d.count} Fighter`}
              atmosphereColor='#f5a623'
              atmosphereAltitude={0.18}
            />
          </Suspense>
          </GlobeErrorBoundary>
        )}
      </div>
      {/* Pflicht-Namensnennung: 8K-Erdtextur von Solar System Scope, Lizenz CC BY 4.0 */}
      <div style={{position:'absolute',bottom:'calc(8px + env(safe-area-inset-bottom))',right:12,zIndex:10,fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'sans-serif'}}>
        Textur: Solar System Scope · CC BY 4.0
      </div>
    </div>
  );
}

export default UserGlobe;
