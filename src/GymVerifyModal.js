// Das Fenster zum Verifizieren der Gym-Mitgliedschaft per Code.
//
// Bewusst als eigene Datei ausgelagert. Die Komponente ist rein
// darstellend - sie bekommt ALLES ueber Props und greift auf nichts
// ausserhalb zu.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben.

function GymVerifyModal({onClose,gymCodeInput,setGymCodeInput,gymVerifyError,setGymVerifyError,gymVerified,setGymVerified,gymCodes,darkMode,showMsg}){
  const bg=darkMode?'rgba(0,0,0,0.85)':'rgba(0,0,0,0.6)';
  const card='#fff';
  const text='#1a1a1a';
  const sub=darkMode?'#aaa':'#666';

  function verify(){
    const code=gymCodeInput.trim().toUpperCase();
    const found=gymCodes.find(g=>g.code===code);
    if(found){
      const verified={gymName:found.name,gymCity:found.ct,gymEmoji:found.emoji,code,verifiedAt:new Date().toISOString()};
      setGymVerified(verified);
      localStorage.setItem('fighter_gym_verified',JSON.stringify(verified));
      showMsg('✅ Gym verifiziert! Du bist jetzt '+found.emoji+' '+found.name+' Mitglied');
      onClose();
    }else{
      setGymVerifyError('Ungültiger Code. Bitte frage dein Gym nach dem Fighter-Code.');
    }
  }

  function removeVerification(){
    setGymVerified(null);
    localStorage.removeItem('fighter_gym_verified');
    showMsg('Gym-Verifizierung entfernt');
    onClose();
  }

  return(
    <div style={{position:'fixed',inset:0,background:bg,zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:card,borderRadius:20,width:'100%',maxWidth:360,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'20px 20px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2}}>GYM VERIFIZIEREN</div>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:11,marginTop:2}}>Bestätige deine Gym-Mitgliedschaft</div>
            </div>
            <div style={{fontSize:32}}>🏅</div>
          </div>
        </div>

        <div style={{padding:'20px'}}>
          {gymVerified?(
            /* Bereits verifiziert */
            <div>
              <div style={{background:darkMode?'#0a1f0a':'#f0faf0',borderRadius:12,padding:'16px',border:'1px solid #27ae6044',textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:40,marginBottom:8}}>{gymVerified.gymEmoji}</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:1}}>✅ VERIFIZIERTES MITGLIED</div>
                <div style={{color:text,fontWeight:700,fontSize:14,marginTop:4}}>{gymVerified.gymName}</div>
                <div style={{color:sub,fontSize:12,marginTop:2}}>📍 {gymVerified.gymCity}</div>
                <div style={{color:'#bbb',fontSize:10,marginTop:6}}>Seit: {new Date(gymVerified.verifiedAt).toLocaleDateString('de')}</div>
              </div>
              <div style={{color:sub,fontSize:12,textAlign:'center',marginBottom:14}}>Dein Profil zeigt jetzt das ✅ Verifiziert-Badge</div>
              <button onClick={removeVerification} style={{width:'100%',padding:'11px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c',color:'#e74c3c',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8}}>
                Verifizierung entfernen
              </button>
              <button onClick={onClose} style={{width:'100%',padding:'11px',borderRadius:10,background:`linear-gradient(135deg,#c0392b,#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                SCHLIESSEN
              </button>
            </div>
          ):(
            /* Code eingeben */
            <div>
              <div style={{background:darkMode?'#1f1f1f':'#f8f8f8',borderRadius:10,padding:'12px',marginBottom:16,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                <div style={{color:'#d4a017',fontSize:12,fontWeight:700,marginBottom:6}}>💡 WIE BEKOMME ICH DEN CODE?</div>
                <div style={{color:sub,fontSize:12,lineHeight:1.6}}>
                  Frage an der Rezeption deines Gyms nach dem <strong>Fighter-App Code</strong>. Der 8-stellige Code (z.B. TGB-2847) wird dir direkt mitgeteilt.
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:6}}>GYM-CODE EINGEBEN</div>
                <input
                  value={gymCodeInput}
                  onChange={e=>{setGymCodeInput(e.target.value.toUpperCase());setGymVerifyError('');}}
                  onKeyDown={e=>e.key==='Enter'&&verify()}
                  placeholder='z.B. TGB-2847'
                  maxLength={8}
                  style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'2px solid '+(gymVerifyError?'#e74c3c':darkMode?'#333':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:text,fontSize:18,fontFamily:'Rajdhani,sans-serif',fontWeight:700,letterSpacing:3,textAlign:'center',boxSizing:'border-box'}}
                />
                {gymVerifyError&&<div style={{color:'#e74c3c',fontSize:11,marginTop:6,textAlign:'center'}}>{gymVerifyError}</div>}
              </div>

              <button onClick={verify} disabled={gymCodeInput.length<6}
                style={{width:'100%',padding:'13px',borderRadius:10,background:gymCodeInput.length>=6?'linear-gradient(135deg,#27ae60,#2ecc71)':'#eee',border:'none',color:gymCodeInput.length>=6?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:gymCodeInput.length>=6?'pointer':'not-allowed',marginBottom:8}}>
                ✅ VERIFIZIEREN
              </button>
              <button onClick={onClose} style={{width:'100%',padding:'10px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#eee'),color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GymVerifyModal;
