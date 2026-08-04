// Der Anmelde-Bildschirm: Login, Registrierung und Passwort-vergessen.
//
// Bewusst als eigene Datei ausgelagert - eine in sich geschlossene Ansicht,
// die nur zwei Dinge von aussen bekommt: onSession (wird nach erfolgreicher
// Anmeldung mit den Zugangsdaten aufgerufen) und appLang (Sprache).
//
// Die eigenen Uebersetzungen (T_AUTH) liegen bewusst hier in der Datei -
// sie werden nur von diesem Bildschirm gebraucht. Die uebrigen Texte der
// App stehen in translations.js.
//
// HINWEIS: Der Code ist unveraendert aus App.js hierher verschoben worden.

import { useState } from 'react';
import { SUPA_URL, SUPA_KEY, RED, LIGHT_RED } from './constants';
import { authSignIn, authSignUp } from './supabaseApi';
import { css } from './styles';
import { Inp } from './uiHelpers';

function AuthScreen({ onSession, appLang }) {
  const T_AUTH = {
    DE: {login:'Einloggen',register:'Registrieren',loginBtn:'LOGIN',registerBtn:'REGISTRIEREN',forgotPw:'Passwort vergessen?',sendLink:'LINK SENDEN',cancel:'Abbrechen',pwReset:'PASSWORT RESET',pwResetSub:'Wir senden dir einen Reset-Link per E-Mail.'},
    EN: {login:'Log in',register:'Register',loginBtn:'LOGIN',registerBtn:'REGISTER',forgotPw:'Forgot password?',sendLink:'SEND LINK',cancel:'Cancel',pwReset:'PASSWORD RESET',pwResetSub:'We will send you a reset link by email.'},
  };
  const t = T_AUTH[appLang]||T_AUTH.DE;
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const [info,setInfo]=useState('');const [privacy,setPrivacy]=useState(false);
  const [agbAccepted,setAgbAccepted]=useState(false);
  const [showForgot,setShowForgot]=useState(false);

  async function sendPasswordReset(){
    if(!email){setErr('Bitte E-Mail eingeben');return;}
    setLoading(true);setErr('');
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/recover',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({email})
      });
      if(r.ok){setInfo('Reset-Link wurde an '+email+' gesendet!');setShowForgot(false);}
      else setErr('Fehler beim Senden');
    }catch{setErr('Netzwerkfehler');}
    setLoading(false);
  }

  async function submit() {
    if(!email||!password){setErr('E-Mail und Passwort eingeben');return;}
    if(mode==='register'&&!privacy){setErr('Bitte Datenschutz akzeptieren');return;}
    if(mode==='register'&&!agbAccepted){setErr('Bitte AGB akzeptieren');return;}
    setLoading(true);setErr('');setInfo('');
    if(mode==='register'){
      const r=await authSignUp(email,password);
      if(r.error){
        if(r.error.message?.includes('already registered')||r.error.message?.includes('already been registered')){
          setErr('Diese E-Mail ist bereits registriert. Bitte einloggen.');setMode('login');
        }else{
          setErr(r.error.message||'Registrierung fehlgeschlagen');
        }
      }else if(r.session&&r.session.access_token){
        // Direkt einloggen (E-Mail Bestätigung deaktiviert)
        onSession({token:r.session.access_token,userId:r.user.id,refresh_token:r.session.refresh_token||null,expires_at:Date.now()+(3600*1000)});
      }else if(r.access_token){
        onSession({token:r.access_token,userId:r.user?.id});
      }else if(r.user&&r.user.id){
        // E-Mail Bestätigung aktiv → Hinweis zeigen
        setInfo('✅ Fast fertig! Wir haben eine Bestätigungsmail an '+email+' gesendet. Bitte öffne sie und klicke auf den Link, dann kannst du dich hier einloggen.');
        setMode('login');
      }else if(r.id&&r.aud==='authenticated'){
        // Supabase gibt User direkt zurück — E-Mail Bestätigung nötig
        setInfo('✅ Fast fertig! Wir haben eine Bestätigungsmail an '+email+' gesendet. Bitte öffne sie und klicke auf den Link, dann kannst du dich hier einloggen.');
        setMode('login');
      }else if(r.error){
        setErr(r.error.message||'Registrierung fehlgeschlagen');
      }else{
        setInfo('✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail und logge dich dann ein.');
        setMode('login');
      }
    }else{
      try{
        const r=await authSignIn(email,password);
        if(r.error)setErr(r.error.message||'Login fehlgeschlagen');
        else if(r.access_token)onSession({token:r.access_token,userId:r.user.id,refresh_token:r.refresh_token});
        else setErr('Login fehlgeschlagen — bitte erneut versuchen');
      }catch(e){
        setErr('Netzwerkfehler — bitte Verbindung prüfen');
      }
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <style>{css}</style>
      <div className='fadeUp' style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div className='rj' style={{fontSize:64,color:'#1a1a1a',letterSpacing:6,lineHeight:1}}>FIGHTER</div>
          <div style={{color:RED,fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>FINDE DEINEN GEGNER</div>
        </div>
        <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid #eee',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',marginBottom:20,background:'#f5f5f7',borderRadius:8,padding:3,gap:3}}>
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr('');setInfo('');}}
                style={{flex:1,padding:'9px',borderRadius:6,background:mode===m?'#fff':'transparent',border:mode===m?'1px solid #eee':'none',color:mode===m?'#1a1a1a':'#aaa',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.08)':'none',transition:'all 0.2s'}}>
                {m==='login'?t.login:t.register}
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:11}}>
            <Inp placeholder='E-Mail' value={email} onChange={setEmail} type='email' autoComplete='email'/>
            <Inp placeholder='Passwort (min. 6 Zeichen)' value={password} onChange={setPassword} type='password' autoComplete={mode==='register'?'new-password':'current-password'} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          </div>
          {err&&<div style={{color:RED,fontSize:12,marginTop:10,textAlign:'center'}}>{err}</div>}
          {mode==='register'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' id='privacy' checked={privacy} onChange={e=>setPrivacy(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <label htmlFor='privacy' style={{color:'#888',fontSize:11,lineHeight:1.5,cursor:'pointer'}}>Ich stimme der <a href='/datenschutz.html' target='_blank' rel='noopener noreferrer' onClick={(e)=>e.stopPropagation()} style={{color:RED,textDecoration:'underline'}}>Datenschutzerklärung</a> zu</label>
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' id='agb' checked={agbAccepted} onChange={e=>setAgbAccepted(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <label htmlFor='agb' style={{color:'#888',fontSize:11,lineHeight:1.5,cursor:'pointer'}}>Ich akzeptiere die <a href='/agb.html' target='_blank' rel='noopener noreferrer' onClick={(e)=>e.stopPropagation()} style={{color:RED,textDecoration:'underline'}}>AGB</a></label>
              </div>
            </div>
          )}
          {info&&<div style={{color:'#27ae60',fontSize:12,marginTop:10,textAlign:'center'}}>{info}</div>}
          <button onClick={submit} disabled={loading}
            style={{width:'100%',marginTop:16,padding:'13px',borderRadius:8,background:loading?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:loading?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'...':(mode==='login'?t.loginBtn:t.registerBtn)}
          </button>
          {mode==='login'&&<div onClick={()=>{setShowForgot(true);setErr('');setInfo('');}} style={{textAlign:'center',marginTop:12,color:'#aaa',fontSize:12,cursor:'pointer',textDecoration:'underline'}}>{t.forgotPw}</div>}
        </div>
      </div>
      {showForgot&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:'20px'}}>
          <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',width:'100%',maxWidth:340,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
            <div className='rj' style={{color:'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:6}}>PASSWORT RESET</div>
            <div style={{color:'#888',fontSize:12,marginBottom:16}}>Wir senden dir einen Reset-Link per E-Mail.</div>
            <Inp placeholder='Deine E-Mail' value={email} onChange={setEmail} type='email' autoComplete='email'/>
            {err&&<div style={{color:RED,fontSize:12,marginTop:8,textAlign:'center'}}>{err}</div>}
            {info&&<div style={{color:'#27ae60',fontSize:12,marginTop:8,textAlign:'center'}}>{info}</div>}
            <button onClick={sendPasswordReset} disabled={loading}
              style={{width:'100%',marginTop:14,padding:'12px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
              {loading?'Senden...':'LINK SENDEN'}
            </button>
            <button onClick={()=>{setShowForgot(false);setErr('');}}
              style={{width:'100%',marginTop:8,padding:'10px',borderRadius:8,background:'transparent',border:'1px solid #eee',color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthScreen;
