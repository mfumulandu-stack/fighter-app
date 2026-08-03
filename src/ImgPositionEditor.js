// Kleiner Editor zum Verschieben des Bildausschnitts eines Profilfotos.
//
// Bewusst als eigene Datei ausgelagert.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben.

import { useState, useRef } from "react";

function ImgPositionEditor({src,onSave,onCancel}){
  const [pos,setPos]=useState({x:50,y:50});
  const drag=useRef(false);
  const last=useRef({x:0,y:0});
  const ref=useRef(null);
  const move=(cx,cy)=>{
    if(!drag.current||!ref.current)return;
    const r=ref.current.getBoundingClientRect();
    const dx=(cx-last.current.x)/r.width*100;
    const dy=(cy-last.current.y)/r.height*100;
    setPos(p=>({x:Math.max(0,Math.min(100,p.x-dx)),y:Math.max(0,Math.min(100,p.y-dy))}));
    last.current={x:cx,y:cy};
  };
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.96)',zIndex:2000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{color:'#fff',fontFamily:'Rajdhani,sans-serif',fontSize:18,fontWeight:700,letterSpacing:2,marginBottom:8}}>BILDAUSSCHNITT WÄHLEN</div>
      <div style={{color:'#aaa',fontSize:12,marginBottom:16,textAlign:'center'}}>Bild verschieben für Ausschnitt</div>
      <div ref={ref} style={{width:260,height:260,borderRadius:'50%',overflow:'hidden',border:'3px solid #c0392b',cursor:'grab',position:'relative',flexShrink:0}}
        onMouseDown={e=>{drag.current=true;last.current={x:e.clientX,y:e.clientY};}}
        onMouseMove={e=>{if(drag.current)move(e.clientX,e.clientY);}}
        onMouseUp={()=>{drag.current=false;}}
        onTouchStart={e=>{drag.current=true;last.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
        onTouchMove={e=>{e.preventDefault();if(drag.current)move(e.touches[0].clientX,e.touches[0].clientY);}}
        onTouchEnd={()=>{drag.current=false;}}
      >
        <img loading="lazy" src={src} style={{width:'150%',height:'150%',objectFit:'cover',objectPosition:pos.x+'% '+pos.y+'%',pointerEvents:'none',transform:'translate(-17%,-17%)'}} alt=''/>
      </div>
      <div style={{display:'flex',gap:12,marginTop:20,width:'100%',maxWidth:260}}>
        <button onClick={onCancel} style={{flex:1,padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>ABBRECHEN</button>
        <button onClick={()=>onSave(pos)} style={{flex:1,padding:'12px',borderRadius:10,background:'#c0392b',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>SPEICHERN ✓</button>
      </div>
    </div>
  );
}

export default ImgPositionEditor;
