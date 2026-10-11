// Das Fenster zum Verifizieren der Gym-Mitgliedschaft per Code.
//
// SICHERHEIT: Der Abgleich der Codes passiert serverseitig ueber die
// Supabase-Funktion verify_gym_code(). Die Codes selbst werden NIE an
// das Geraet des Nutzers geschickt - nur bei Treffer kommen Name+Stadt
// des Gyms zurueck. So kann niemand die Codes aus der App auslesen.

import { useState } from 'react';
import { SUPA_URL, SUPA_KEY } from './constants';
import { makeL } from './lang';

function GymVerifyModal({appLang,onClose,gymCodeInput,setGymCodeInput,gymVerifyError,setGymVerifyError,gymVerified,setGymVerified,darkMode,showMsg,authToken,onMembershipChange}){
  const [verifying,setVerifying]=useState(false);
  const L=makeL(appLang||'DE');
  const bg=darkMode?'rgba(0,0,0,0.85)':'rgba(0,0,0,0.6)';
  const card='#fff';
  const text='#1a1a1a';
  const sub=darkMode?'#aaa':'#666';

  async function verify(){
    const code=gymCodeInput.trim().toUpperCase();
    if(!code)return;
    setVerifying(true);
    setGymVerifyError('');
    try{
      // 1) Bevorzugt die neue Funktion: prueft den Code serverseitig UND
      //    speichert die Mitgliedschaft im Profil (fuer die Rangliste).
      let data=null;
      let claimed=false;
      if(authToken){
        try{
          const rc=await fetch(SUPA_URL+'/rest/v1/rpc/claim_gym_membership',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+authToken},
            body:JSON.stringify({input_code:code})
          });
          const dc=rc.ok?await rc.json():null;
          if(Array.isArray(dc)&&dc.length>0){data=dc;claimed=true;}
        }catch(e){}
      }
      // 2) Fallback auf die bisherige Pruefung (z.B. wenn die neue Funktion
      //    in Supabase noch nicht angelegt ist): Gym wird erkannt, aber nur
      //    lokal gespeichert - noch ohne Haken in der Rangliste.
      if(!claimed){
        const r=await fetch(SUPA_URL+'/rest/v1/rpc/verify_gym_code',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
          body:JSON.stringify({input_code:code})
        });
        data=await r.json();
      }
      const found=Array.isArray(data)&&data.length>0?data[0]:null;
      if(found&&found.gym_name){
        const verified={gymName:found.gym_name,gymCity:found.gym_city,gymEmoji:'🏅',code,verifiedAt:new Date().toISOString()};
        setGymVerified(verified);
        localStorage.setItem('fighter_gym_verified',JSON.stringify(verified));
        if(claimed&&onMembershipChange)onMembershipChange(true);
        showMsg(L('✅ Gym verifiziert! Du bist jetzt '+found.gym_name+' Mitglied', '✅ Gym verified! You are now a member of '+found.gym_name, '✅ Salle vérifiée ! Tu es maintenant membre de '+found.gym_name, '✅ ¡Gimnasio verificado! Ahora eres miembro de '+found.gym_name));
        onClose();
      }else{
        setGymVerifyError(L('Ungültiger Code. Bitte frage dein Gym nach dem Fighter-Code.', 'Invalid code. Please ask your gym for the Fighter code.', 'Code invalide. Demande le code Fighter à ta salle.', 'Código no válido. Pide el código de Fighter a tu gimnasio.'));
      }
    }catch(e){
      setGymVerifyError(L('Netzwerkfehler — bitte erneut versuchen.', 'Network error — please try again.', 'Erreur réseau — réessaie.', 'Error de red — inténtalo de nuevo.'));
    }
    setVerifying(false);
  }

  function removeVerification(){
    setGymVerified(null);
    localStorage.removeItem('fighter_gym_verified');
    // Auch in der Datenbank zuruecknehmen (best effort - ohne die neue
    // Funktion passiert hier einfach nichts).
    if(authToken){
      fetch(SUPA_URL+'/rest/v1/rpc/release_gym_membership',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+authToken},
        body:'{}'
      }).catch(()=>{});
    }
    if(onMembershipChange)onMembershipChange(false);
    showMsg(L('Gym-Verifizierung entfernt', 'Gym verification removed', 'Vérification de la salle supprimée', 'Verificación del gimnasio eliminada'));
    onClose();
  }

  return(
    <div style={{position:'fixed',inset:0,background:bg,zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:card,borderRadius:20,width:'100%',maxWidth:360,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'20px 20px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2}}>{L('GYM VERIFIZIEREN', 'VERIFY GYM', 'VÉRIFIER LA SALLE', 'VERIFICAR GIMNASIO')}</div>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:11,marginTop:2}}>{L('Bestätige deine Gym-Mitgliedschaft', 'Confirm your gym membership', 'Confirme ton abonnement à la salle', 'Confirma tu membresía del gimnasio')}</div>
            </div>
            <div style={{fontSize:32}}>🏅</div>
          </div>
        </div>

        <div style={{padding:'20px'}}>
          {gymVerified?(
            <div>
              <div style={{background:darkMode?'#0a1f0a':'#f0faf0',borderRadius:12,padding:'16px',border:'1px solid #27ae6044',textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:40,marginBottom:8}}>{gymVerified.gymEmoji}</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:1}}>{L('✅ VERIFIZIERTES MITGLIED', '✅ VERIFIED MEMBER', '✅ MEMBRE VÉRIFIÉ', '✅ MIEMBRO VERIFICADO')}</div>
                <div style={{color:text,fontWeight:700,fontSize:14,marginTop:4}}>{gymVerified.gymName}</div>
                <div style={{color:sub,fontSize:12,marginTop:2}}>📍 {gymVerified.gymCity}</div>
                <div style={{color:'#bbb',fontSize:10,marginTop:6}}>{L('Seit', 'Since', 'Depuis', 'Desde')}: {new Date(gymVerified.verifiedAt).toLocaleDateString(L('de','en','fr','es'))}</div>
              </div>
              <div style={{color:sub,fontSize:12,textAlign:'center',marginBottom:14}}>{L('Dein Profil zeigt jetzt das ✅ Verifiziert-Badge', 'Your profile now shows the ✅ Verified badge', 'Ton profil affiche maintenant le badge ✅ Vérifié', 'Tu perfil ahora muestra la insignia ✅ Verificado')}</div>
              <button onClick={removeVerification} style={{width:'100%',padding:'11px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c',color:'#e74c3c',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8}}>
                {L('Verifizierung entfernen', 'Remove verification', 'Supprimer la vérification', 'Quitar verificación')}
              </button>
              <button onClick={onClose} style={{width:'100%',padding:'11px',borderRadius:10,background:`linear-gradient(135deg,#c0392b,#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                {L('SCHLIESSEN', 'CLOSE', 'FERMER', 'CERRAR')}
              </button>
            </div>
          ):(
            <div>
              <div style={{background:darkMode?'#1f1f1f':'#f8f8f8',borderRadius:10,padding:'12px',marginBottom:16,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                <div style={{color:'#d4a017',fontSize:12,fontWeight:700,marginBottom:6}}>{L('💡 WIE BEKOMME ICH DEN CODE?', '💡 HOW DO I GET THE CODE?', '💡 COMMENT OBTENIR LE CODE ?', '💡 ¿CÓMO CONSIGO EL CÓDIGO?')}</div>
                <div style={{color:sub,fontSize:12,lineHeight:1.6}}>
                  {L('Frage an der Rezeption deines Gyms nach dem ', 'Ask at your gym\'s front desk for the ', 'Demande à l\'accueil de ta salle le ', 'Pregunta en la recepción de tu gimnasio por el ')}<strong>{L('Fighter-App Code', 'Fighter App code', 'code Fighter App', 'código de Fighter App')}</strong>{L('. Der Code (6 bis 8 Zeichen) wird dir direkt mitgeteilt.', '. The code (6 to 8 characters) is given to you in person.', '. Le code (6 à 8 caractères) t\'est communiqué directement.', '. El código (de 6 a 8 caracteres) te lo dan directamente.')}
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:6}}>{L('GYM-CODE EINGEBEN', 'ENTER GYM CODE', 'SAISIR LE CODE DE LA SALLE', 'INTRODUCE EL CÓDIGO DEL GIMNASIO')}</div>
                <input
                  value={gymCodeInput}
                  onChange={e=>{setGymCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8));setGymVerifyError('');}}
                  onKeyDown={e=>e.key==='Enter'&&verify()}
                  placeholder={L('z.B. 3F9A1C2E', 'e.g. 3F9A1C2E', 'ex. 3F9A1C2E', 'p. ej. 3F9A1C2E')}
                  maxLength={8}
                  style={{width:'100%',padding:'12px 10px',borderRadius:10,border:'2px solid '+(gymVerifyError?'#e74c3c':darkMode?'#333':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:text,fontSize:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700,letterSpacing:1.5,textAlign:'center',boxSizing:'border-box'}}
                />
                {gymVerifyError&&<div style={{color:'#e74c3c',fontSize:11,marginTop:6,textAlign:'center'}}>{gymVerifyError}</div>}
              </div>

              <button onClick={verify} disabled={gymCodeInput.length<6||verifying}
                style={{width:'100%',padding:'13px',borderRadius:10,background:(gymCodeInput.length>=6&&!verifying)?'linear-gradient(135deg,#27ae60,#2ecc71)':'#eee',border:'none',color:(gymCodeInput.length>=6&&!verifying)?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:(gymCodeInput.length>=6&&!verifying)?'pointer':'not-allowed',marginBottom:8}}>
                {verifying?L('Prüfe...', 'Checking...', 'Vérification...', 'Comprobando...'):L('✅ VERIFIZIEREN', '✅ VERIFY', '✅ VÉRIFIER', '✅ VERIFICAR')}
              </button>
              <button onClick={onClose} style={{width:'100%',padding:'10px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#eee'),color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>
                {L('Abbrechen', 'Cancel', 'Annuler', 'Cancelar')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GymVerifyModal;
