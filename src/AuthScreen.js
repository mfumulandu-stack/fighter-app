// Der Anmelde-Bildschirm: Login, Registrierung und Passwort-vergessen.
//
// Bewusst als eigene Datei ausgelagert - eine in sich geschlossene Ansicht,
// die nur zwei Dinge von aussen bekommt: onSession (wird nach erfolgreicher
// Anmeldung mit den Zugangsdaten aufgerufen) und appLang (Sprache).
//
// Die eigenen Uebersetzungen (T_AUTH) liegen bewusst hier in der Datei -
// sie werden nur von diesem Bildschirm gebraucht. Die uebrigen Texte der
// App stehen in translations.js.

import { useState, useEffect } from 'react';
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
  const [showAGB,setShowAGB]=useState(false);
  const [showDatenschutz,setShowDatenschutz]=useState(false);
  const [showForgot,setShowForgot]=useState(false);
  const [oauthLoading,setOauthLoading]=useState(false);

  useEffect(()=>{
    let removeListener=null;
    (async()=>{
      try{
        const {Capacitor}=await import('@capacitor/core');
        if(!Capacitor.isNativePlatform())return;
        const {App}=await import('@capacitor/app');
        const sub=await App.addListener('appUrlOpen',async({url})=>{
          if(!url||!url.includes('access_token'))return;
          const hash=url.split('#')[1]||url.split('?')[1]||'';
          const params=new URLSearchParams(hash);
          const access_token=params.get('access_token');
          const refresh_token=params.get('refresh_token');
          if(access_token){
            try{
              const {Browser}=await import('@capacitor/browser');
              Browser.close().catch(()=>{});
            }catch{}
            const userRes=await fetch(SUPA_URL+'/auth/v1/user',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+access_token}});
            const user=await userRes.json();
            if(user&&user.id){onSession({token:access_token,userId:user.id,refresh_token});}
          }
          setOauthLoading(false);
        });
        removeListener=()=>sub.remove();
      }catch{}
    })();
    return ()=>{if(removeListener)removeListener();};
  },[]);

  useEffect(()=>{
    if(!window.location.hash||!window.location.hash.includes('access_token'))return;
    (async()=>{
      const params=new URLSearchParams(window.location.hash.slice(1));
      const access_token=params.get('access_token');
      const refresh_token=params.get('refresh_token');
      if(access_token){
        setOauthLoading(true);
        try{
          const userRes=await fetch(SUPA_URL+'/auth/v1/user',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+access_token}});
          const user=await userRes.json();
          if(user&&user.id){
            window.history.replaceState(null,'',window.location.pathname);
            onSession({token:access_token,userId:user.id,refresh_token});
          }
        }catch{}
        setOauthLoading(false);
      }
    })();
  },[]);

  async function signInWithProvider(provider){
    setOauthLoading(true);setErr('');
    try{
      const {Capacitor}=await import('@capacitor/core');
      if(Capacitor.isNativePlatform()){
        const redirectTo='de.fighterapp.app://auth-callback';
        const authUrl=SUPA_URL+'/auth/v1/authorize?provider='+provider+'&redirect_to='+encodeURIComponent(redirectTo);
        const {Browser}=await import('@capacitor/browser');
        await Browser.open({url:authUrl});
      }else{
        const redirectTo=window.location.origin+window.location.pathname;
        const authUrl=SUPA_URL+'/auth/v1/authorize?provider='+provider+'&redirect_to='+encodeURIComponent(redirectTo);
        window.location.href=authUrl;
      }
    }catch{
      setOauthLoading(false);
      setErr('Weiterleitung fehlgeschlagen — bitte erneut versuchen.');
    }
  }
  const [showOtp,setShowOtp]=useState(false);
  const [otpStep,setOtpStep]=useState('email');
  const [otpCode,setOtpCode]=useState('');

  async function sendOtpCode(){
    if(!email){setErr('Bitte E-Mail eingeben');return;}
    setLoading(true);setErr('');
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/otp',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({email,create_user:true})
      });
      if(r.ok){setOtpStep('code');setInfo('');}
      else{const d=await r.json().catch(()=>({}));setErr(d.msg||d.error_description||'Code konnte nicht gesendet werden');}
    }catch{setErr('Netzwerkfehler');}
    setLoading(false);
  }

  async function verifyOtpCode(){
    if(!otpCode||otpCode.length<6){setErr('Bitte den 6-stelligen Code eingeben');return;}
    setLoading(true);setErr('');
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/verify',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({type:'email',email,token:otpCode})
      });
      const d=await r.json();
      if(d.access_token){
        onSession({token:d.access_token,userId:d.user.id,refresh_token:d.refresh_token});
      }else{
        setErr(d.msg||d.error_description||'Code ungültig oder abgelaufen');
      }
    }catch{setErr('Netzwerkfehler');}
    setLoading(false);
  }

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
        onSession({token:r.session.access_token,userId:r.user.id,refresh_token:r.session.refresh_token||null,expires_at:Date.now()+(3600*1000)});
      }else if(r.access_token){
        onSession({token:r.access_token,userId:r.user?.id});
      }else if(r.user&&r.user.id){
        setInfo('✅ Fast fertig! Wir haben eine Bestätigungsmail an '+email+' gesendet. Bitte öffne sie und klicke auf den Link, dann kannst du dich hier einloggen.');
        setMode('login');
      }else if(r.id&&r.aud==='authenticated'){
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

          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
            <button onClick={()=>signInWithProvider('apple')} disabled={oauthLoading}
              style={{width:'100%',padding:'11px',borderRadius:8,background:'#000',border:'none',color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:oauthLoading?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
              <svg width="16" height="18" viewBox="0 0 384 512" style={{flexShrink:0}}>
                <path fill="#fff" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              {oauthLoading?'Weiterleiten...':'Mit Apple fortfahren'}
            </button>
            <button onClick={()=>signInWithProvider('google')} disabled={oauthLoading}
              style={{width:'100%',padding:'11px',borderRadius:8,background:'#fff',border:'1px solid #ddd',color:'#1a1a1a',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:oauthLoading?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
                <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.4-4.6 2.3-7.7 2.3-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.6C41.5 36.1 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
              </svg>
              {oauthLoading?'Weiterleiten...':'Mit Google fortfahren'}
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{flex:1,height:1,background:'#eee'}}/>
            <div style={{color:'#bbb',fontSize:11}}>ODER</div>
            <div style={{flex:1,height:1,background:'#eee'}}/>
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
                <label htmlFor='privacy' style={{color:'#888',fontSize:11,lineHeight:1.5,cursor:'pointer'}}>Ich stimme der <span onClick={(e)=>{e.preventDefault();e.stopPropagation();setShowDatenschutz(true);}} style={{color:RED,textDecoration:'underline',cursor:'pointer'}}>Datenschutzerklärung</span> zu</label>
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' id='agb' checked={agbAccepted} onChange={e=>setAgbAccepted(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <label htmlFor='agb' style={{color:'#888',fontSize:11,lineHeight:1.5,cursor:'pointer'}}>Ich akzeptiere die <span onClick={(e)=>{e.preventDefault();e.stopPropagation();setShowAGB(true);}} style={{color:RED,textDecoration:'underline',cursor:'pointer'}}>AGB</span></label>
              </div>
            </div>
          )}
          {info&&<div style={{color:'#27ae60',fontSize:12,marginTop:10,textAlign:'center'}}>{info}</div>}
          <button onClick={submit} disabled={loading}
            style={{width:'100%',marginTop:16,padding:'13px',borderRadius:8,background:loading?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:loading?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'...':(mode==='login'?t.loginBtn:t.registerBtn)}
          </button>
          {mode==='login'&&<div onClick={()=>{setShowForgot(true);setErr('');setInfo('');}} style={{textAlign:'center',marginTop:12,color:'#aaa',fontSize:12,cursor:'pointer',textDecoration:'underline'}}>{t.forgotPw}</div>}
          {mode==='login'&&<div onClick={()=>{setShowOtp(true);setOtpStep('email');setOtpCode('');setErr('');setInfo('');}} style={{textAlign:'center',marginTop:8,color:RED,fontSize:12,cursor:'pointer',fontWeight:700}}>Stattdessen mit Code einloggen</div>}
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
      {showOtp&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:'20px'}}>
          <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',width:'100%',maxWidth:340,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
            <div className='rj' style={{color:'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:6}}>MIT CODE EINLOGGEN</div>
            {otpStep==='email'?(
              <>
                <div style={{color:'#888',fontSize:12,marginBottom:16}}>Wir senden dir einen 6-stelligen Code per E-Mail — kein Passwort nötig.</div>
                <Inp placeholder='Deine E-Mail' value={email} onChange={setEmail} type='email' autoComplete='email' onKeyDown={e=>e.key==='Enter'&&sendOtpCode()}/>
                {err&&<div style={{color:RED,fontSize:12,marginTop:8,textAlign:'center'}}>{err}</div>}
                <button onClick={sendOtpCode} disabled={loading}
                  style={{width:'100%',marginTop:14,padding:'12px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
                  {loading?'Senden...':'CODE SENDEN'}
                </button>
              </>
            ):(
              <>
                <div style={{color:'#888',fontSize:12,marginBottom:16}}>Code wurde an {email} gesendet. Trag ihn hier ein:</div>
                <input
                  value={otpCode}
                  onChange={e=>{setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6));setErr('');}}
                  onKeyDown={e=>e.key==='Enter'&&verifyOtpCode()}
                  placeholder='000000'
                  maxLength={6}
                  inputMode='numeric'
                  style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'2px solid '+(err?'#e74c3c':'#e0e0e0'),background:'#f5f5f7',color:'#1a1a1a',fontSize:22,fontFamily:'Rajdhani,sans-serif',fontWeight:700,letterSpacing:6,textAlign:'center',boxSizing:'border-box'}}
                />
                {err&&<div style={{color:RED,fontSize:12,marginTop:8,textAlign:'center'}}>{err}</div>}
                <button onClick={verifyOtpCode} disabled={loading||otpCode.length<6}
                  style={{width:'100%',marginTop:14,padding:'12px',borderRadius:8,background:(otpCode.length>=6&&!loading)?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:(otpCode.length>=6&&!loading)?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:(otpCode.length>=6&&!loading)?'pointer':'not-allowed'}}>
                  {loading?'Prüfe...':'BESTÄTIGEN'}
                </button>
                <div onClick={()=>{setOtpStep('email');setOtpCode('');setErr('');}} style={{textAlign:'center',marginTop:10,color:'#aaa',fontSize:12,cursor:'pointer',textDecoration:'underline'}}>Andere E-Mail / neuer Code</div>
              </>
            )}
            <button onClick={()=>{setShowOtp(false);setErr('');setOtpCode('');setOtpStep('email');}}
              style={{width:'100%',marginTop:8,padding:'10px',borderRadius:8,background:'transparent',border:'1px solid #eee',color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {showDatenschutz&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:500,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowDatenschutz(false)} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>← Zurück</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>DATENSCHUTZ</div>
              <div style={{color:RED,fontSize:10,letterSpacing:2,marginBottom:20}}>Datenschutzerklärung gemäß DSGVO</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>1. Verantwortlicher</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Junior Landu Mfumu, Ottostraße 43, 52070 Aachen. E-Mail: mfumulandu@gmail.com</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>2. Erhobene Daten</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>E-Mail, Name, Alter, Stadt, Gym, Kampfstil, Profilbild, Nachrichten, Swipes und Matches.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>3. Zweck</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Bereitstellung der App, Matching, Chat, Gym-Verzeichnis und Ranglisten.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>4. Datenweitergabe</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Keine Weitergabe an Dritte. Dienste: Supabase (EU), Vercel, Resend.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>5. Deine Rechte</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Auskunft, Berichtigung, Löschung. Account löschen: Profil → Einstellungen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>6. Kontakt</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>mfumulandu@gmail.com</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {showAGB&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:500,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowAGB(false)} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>← Zurück</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>AGB</div>
              <div style={{color:RED,fontSize:10,letterSpacing:2,marginBottom:20}}>Allgemeine Geschäftsbedingungen</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>1. Leistungsumfang</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Kampfsport-Profil, Matching, Chat, Gym-Suche und Ranglisten. Kein Anspruch auf dauerhaften Betrieb.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>2. Nutzung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Ab 18 Jahren. Beleidigungen oder illegale Inhalte führen zur Sperrung.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>3. Haftung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Keine Haftung für Schäden aus der Nutzung oder Treffen zwischen Nutzern.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>4. Kündigung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Account jederzeit löschbar: Profil → Einstellungen → Account löschen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid '+RED,paddingLeft:8}}>5. Geltendes Recht</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Deutsches Recht. Gerichtsstand: Aachen.</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthScreen;
