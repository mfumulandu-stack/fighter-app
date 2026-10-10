import React, { useState, useEffect, useRef } from 'react';
import { sortFightersByRank } from './matchScore';
import { setupPushRegistration } from './pushRegistration';
import { cityToCountry, filterCitiesByCountry } from './cityCountry';
import { autoFilterCandidates } from './autoFilters';
import { SUPA_URL, SUPA_KEY, ADMIN_ID, APP_STORE_ID, CURRENT_APP_VERSION, SW, RED, LIGHT_RED } from './constants';
import { computeBrandUnlockOrder } from './rewardBrands';
import { authSignOut, dbInsert, dbUpdate, dbSelect, adminFetch, uploadPhoto } from './supabaseApi';
import { safeLocalNotification } from './notifications';
import ChatOverlay from './ChatOverlay';
import GymDetailScreen from './GymDetailScreen';
import EquipmentScreen from './EquipmentScreen';
import { T } from './translations';
import AdminPanel from './AdminPanel';
import UserGlobe from './UserGlobe';
import { css } from './styles';
import AuthScreen from './AuthScreen';
import { Lbl, Inp, Tag, Btn } from './uiHelpers';
import { profileProgressOf, shareLink, inviteUrl } from './growth';
import GymVerifyModal from './GymVerifyModal';
import { LIST_FIELDS, CARD_FIELDS, mergeProfileDetail, isFresh } from './profileLoad';
import { detectLangFromDevice, makeL, LANG_KEY, countryName } from './lang';
import { progressLabel } from './progressLabels';
import BrandDashboard from './BrandDashboard';
import OnboardingTour from './OnboardingTour';
import SwipeableChatRow from './SwipeableChatRow';
import ErrorBoundary from './ErrorBoundary';
import ImgPositionEditor from './ImgPositionEditor';
import { WEIGHT_CLASSES, normalizeWeightClass, STYLES, BELT_STYLES, BELT_RANKS, FIGHTERS, GYMS, TRAINERS, SPORTS, getDistanceKm, getDistanceKmCoords, getBundesland, getLocationByIP } from './appData';
// Weiterreichen nach aussen: auth.test.js und andere importieren diese
// Funktionen aus './App' - das bleibt dadurch unveraendert gueltig.
export { authSignUp, authSignIn, authSignOut, dbInsert, dbUpdate, dbSelect, adminFetch } from './supabaseApi';

// SUPA_URL, SUPA_KEY, ADMIN_ID, APP_STORE_ID, CURRENT_APP_VERSION stehen
// jetzt in src/constants.js (siehe Import ganz oben).

// Die Supabase-Zugriffe (Login, Datenbank, Admin-Schleuse, Foto-Upload)
// stehen jetzt in src/supabaseApi.js (siehe Import ganz oben).
// Sie werden dort importiert UND weiter nach aussen durchgereicht, damit
// bestehende Importe aus './App' (z.B. in auth.test.js) unveraendert gelten.


// SW, RED, LIGHT_RED stehen jetzt in src/constants.js (Import ganz oben).












// Test-Zugang: /?globetest=1 rendert nur den Globus, ohne Login —
// zum schnellen Testen des Globus im Browser
// Was fehlt einem Profil, damit es in der Rangliste erscheint?
function rankIssuesOf(p,L=(de)=>de){
  if(!p||p.is_brand||p.is_coach)return [];
  const out=[];
  if(!((p.gym||'').trim()))out.push({k:'gym',text:L('Dein Gym ist nicht eingetragen.','Your gym is not set.',"Ta salle n'est pas renseignée.",'Tu gimnasio no está indicado.')});
  if(!p.country)out.push({k:'country',text:L('Dein Land fehlt.','Your country is missing.','Ton pays manque.','Falta tu país.')});
  const fights=(p.wins||0)+(p.losses||0)+(p.draws||0);
  if(fights===0&&p.record_verified!=='verified')out.push({k:'record',text:L('Du hast 0 Kämpfe eingetragen. Trage deine Kämpfe ein und lade einen Nachweis hoch, oder bestätige unter Rangliste „Ich habe noch keine Kämpfe“.','You have entered 0 fights. Enter your fights and upload proof, or confirm "I have no fights yet" under Ranking.',"Tu as saisi 0 combat. Saisis tes combats et charge un justificatif, ou confirme « Je n'ai encore aucun combat » dans Classement.",'Has introducido 0 combates. Introduce tus combates y sube un comprobante, o confirma «Aún no tengo combates» en Ranking.')});
  return out;
}

export default function App(){
  if(typeof window!=='undefined'&&window.location.search.includes('globetest')){
    return <UserGlobe darkMode={true} onClose={()=>{window.location.search='';}} SUPA_URL={SUPA_URL} SUPA_KEY={SUPA_KEY}/>;
  }
  if(typeof window!=='undefined'){
    const params=new URLSearchParams(window.location.search);
    const partnerSlug=params.get('partner');
    if(partnerSlug){
      return <BrandDashboard brandSlug={partnerSlug} SUPA_URL={SUPA_URL} SUPA_KEY={SUPA_KEY}/>;
    }
    // Einladungslink (?ref=<profil-id des Einladenden>): merken, bis sich
    // diese Person registriert UND ihr Profil fertig anlegt - erst dann
    // (in saveProfile) wird der Freund serverseitig gutgeschrieben.
    const refCode=params.get('ref');
    if(refCode){
      try{localStorage.setItem('fighter_ref_code',refCode);}catch{}
      params.delete('ref');
      const rest=params.toString();
      window.history.replaceState(null,'',window.location.pathname+(rest?'?'+rest:''));
    }
  }
  return <MainApp/>;
}
function MainApp(){
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  // Sicherheitsnetz: Egal was beim Start schiefgehen sollte (unerwarteter
  // Fehler, haengender Netzwerk-Aufruf ohne Timeout) - die App bleibt nie
  // laenger als 15 Sekunden auf dem Ladebildschirm haengen. Zeigt danach
  // notfalls den Login-Bildschirm, statt fuer immer zu laden.
  useEffect(()=>{
    const failsafe=setTimeout(()=>{
      setAuthReady(ready=>{
        if(!ready){console.warn('Auth-Sicherheitsnetz ausgeloest nach 15s');}
        return true;
      });
    },15000);
    return()=>clearTimeout(failsafe);
  },[]);

  useEffect(()=>{
    if(!window.Capacitor||!window.Capacitor.isNativePlatform||!window.Capacitor.isNativePlatform())return;
    if(!APP_STORE_ID)return;
    fetch('https://itunes.apple.com/lookup?id='+APP_STORE_ID+'&country=de')
      .then(r=>r.json())
      .then(d=>{
        const storeVersion=d?.results?.[0]?.version;
        if(!storeVersion)return;
        const parse=v=>String(v).split('.').map(n=>parseInt(n)||0);
        const cur=parse(CURRENT_APP_VERSION);
        const store=parse(storeVersion);
        for(let i=0;i<Math.max(cur.length,store.length);i++){
          const c=cur[i]||0,s=store[i]||0;
          if(s>c){setLatestVersion(storeVersion);setUpdateAvailable(true);break;}
          if(s<c)break;
        }
      }).catch(()=>{});
  },[]);
  const [screen,setScreen]=useState('loading');
  // Passwort-Reset: erkennt den Klick auf den Reset-Link aus der E-Mail
  // (Supabase haengt dabei access_token & type=recovery an die URL an)
  const [recoveryToken,setRecoveryToken]=useState(null);
  const [recoveryNewPw,setRecoveryNewPw]=useState('');
  const [recoveryNewPw2,setRecoveryNewPw2]=useState('');
  const [recoverySaving,setRecoverySaving]=useState(false);
  const [recoveryErr,setRecoveryErr]=useState('');
  const [recoveryDone,setRecoveryDone]=useState(false);
  useEffect(()=>{
    try{
      const hash=window.location.hash;
      if(hash&&hash.includes('type=recovery')){
        const params=new URLSearchParams(hash.replace('#','?'));
        const token=params.get('access_token');
        if(token){
          setRecoveryToken(token);
          window.history.replaceState(null,'',window.location.pathname);
        }
      }
      // Rueckkehr von der Stripe-Zahlungsseite erkennen (erfolgreich oder abgebrochen)
      const search=new URLSearchParams(window.location.search);
      if(search.get('ticket')==='success'){
        setTimeout(()=>showMsg(L('✅ Zahlung erfolgreich! Du bist jetzt fürs Event angemeldet 🎟️', '✅ Payment successful! You are now registered for the event 🎟️', '✅ Paiement réussi ! Tu es maintenant inscrit à l\'événement 🎟️', '✅ ¡Pago realizado! Ya estás inscrito en el evento 🎟️')),800);
        window.history.replaceState(null,'',window.location.pathname);
      }else if(search.get('ticket')==='cancelled'){
        setTimeout(()=>showMsg('Zahlung abgebrochen - kein Ticket gekauft'),800);
        window.history.replaceState(null,'',window.location.pathname);
      }
    }catch(e){console.error('recovery detect',e);}
  },[]);
  async function submitNewPassword(){
    if(!recoveryNewPw||recoveryNewPw.length<6){setRecoveryErr(L('Passwort muss mind. 6 Zeichen haben', 'Password must be at least 6 characters', 'Le mot de passe doit contenir au moins 6 caractères', 'La contraseña debe tener al menos 6 caracteres'));return;}
    if(recoveryNewPw!==recoveryNewPw2){setRecoveryErr(L('Passwörter stimmen nicht überein', 'Passwords do not match', 'Les mots de passe ne correspondent pas', 'Las contraseñas no coinciden'));return;}
    setRecoverySaving(true);setRecoveryErr('');
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/user',{
        method:'PUT',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+recoveryToken},
        body:JSON.stringify({password:recoveryNewPw})
      });
      if(r.ok){setRecoveryDone(true);}
      else{const d=await r.json().catch(()=>({}));setRecoveryErr(d.msg||d.error_description||L('Fehler beim Speichern', 'Error saving', 'Erreur lors de l\'enregistrement', 'Error al guardar'));}
    }catch(e){setRecoveryErr('Netzwerkfehler: '+e.message);}
    setRecoverySaving(false);
  }
  const [tabRaw,setTabRaw]=useState(()=>{try{return localStorage.getItem('fighter_tab')||'swipe'}catch{return 'swipe'}});
  const tab=tabRaw;
  const setTab=(t)=>{try{localStorage.setItem('fighter_tab',t)}catch{}setTabRaw(t);};
  const [step,setStep]=useState(1);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const [myProfile,setMyProfile]=useState(null);
  // Freunde-einladen-Rabatt: Freischalt-Reihenfolge der Marken-Rabattcodes
  // bei Equipment und Supplements, fuer die Fortschrittsanzeige in "Mein
  // Profil" (siehe loadRewardBrands weiter unten und rewardBrands.js).
  const [rewardBrands,setRewardBrands]=useState({equipment:{order:[],labelByKey:{}},supplement:{order:[],labelByKey:{}}});
  const [rewardBrandsLoaded,setRewardBrandsLoaded]=useState(false);
  const [profile,setProfile]=useState({name:'',age:'',city:'',gym:'',height:'',weight:'',weightClass:'',style:'',bio:'',isPro:false,country:'DE',gender:'male'});
  const [stats,setStats]=useState({wins:0,losses:0,draws:0,ko:0});
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [avatarPreview,setAvatarPreview]=useState(null);
  const [coachAvatarPreview,setCoachAvatarPreview]=useState(null);
  const [uploadingCoachAvatar,setUploadingCoachAvatar]=useState(false);
  const [myGallery,setMyGallery]=useState([]);
  const [showGlobe,setShowGlobe]=useState(false);
  // Bewertungs-Aufforderung ("Gefällt dir die Fighter App?")
  const [showRating,setShowRating]=useState(false);
  const ratingCheckedRef=useRef(false);
  const swipeStartX=useRef(null);
  const [uploadingGallery,setUploadingGallery]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [cards,setCards]=useState([...FIGHTERS]);
  const [drag,setDrag]=useState(false);
  const [offset,setOffset]=useState({x:0,y:0});
  const [start,setStart]=useState({x:0,y:0});
  const dragVelocityRef=React.useRef({x:0,time:0}); // fuer schnelle, kurze Wisch-Gesten
  const [lastAct,setLastAct]=useState(null);
  const [lastSwiped,setLastSwiped]=useState(null);
  const [lightboxImg,setLightboxImg]=useState(null);
  const [imgEditorSrc,setImgEditorSrc]=useState(null);
  const [imgEditorCallback,setImgEditorCallback]=useState(null);
  const [showImgEditor,setShowImgEditor]=useState(false);
  const [recentSwiped,setRecentSwiped]=useState([]);
  const [whoLikedMe,setWhoLikedMe]=useState([]);
  const [adminMessages,setAdminMessages]=useState([]);
  const [showAdminMsg,setShowAdminMsg]=useState(false);
  const [allProfiles,setAllProfiles]=useState([]);
  const allProfilesAtRef=React.useRef(0);
  const [rankingLoading,setRankingLoading]=useState(false);
  const [whoLikedTab,setWhoLikedTab]=useState(false);
  const [newLikesCount,setNewLikesCount]=useState(0);
  const [lastLikesCheck,setLastLikesCheck]=useState(()=>{try{return localStorage.getItem('fighter_likes_check')||'2000-01-01'}catch{return '2000-01-01'}});
  const [likesBannerSeen,setLikesBannerSeen]=useState(()=>{try{return localStorage.getItem('fighter_banner_seen')||''}catch{return ''}});
  const [matched,setMatched]=useState(null);
  const [swStats,setSwStats]=useState({ch:0,de:0});
  const [dbMatches,setDbMatches]=useState([]);
  const [matchesLoading,setMatchesLoading]=useState(false);
  const [unreadCount,setUnreadCount]=useState(0);
  const [activeChat,setActiveChat]=useState(null);
  const [viewProfile,setViewProfile]=useState(null);
  const [viewGym,setViewGym]=useState(null);
  const [blockedUsers,setBlockedUsers]=useState(()=>{try{return JSON.parse(localStorage.getItem('fighter_blocked')||'[]')}catch{return []}});
  const [gymVerified,setGymVerified]=useState(()=>{try{return JSON.parse(localStorage.getItem('fighter_gym_verified')||'null')}catch{return null}});
  const [showOnboarding,setShowOnboarding]=useState(()=>{try{const done=localStorage.getItem('fighter_onboarding_done');const hasSession=localStorage.getItem('fighter_v5');return !done&&!hasSession;}catch{return true}});
  const [onboardSlide,setOnboardSlide]=useState(0);
  const [gymLogos,setGymLogos]=useState({});
  const [showAdmin,setShowAdmin]=useState(false);
  const [showFeatureTour,setShowFeatureTour]=useState(false);
  const [showRankReminder,setShowRankReminder]=useState(false);
  const isAdmin=session?.userId===ADMIN_ID||myProfile?.id===ADMIN_ID;
  const [fightHistory,setFightHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem('fighter_history')||'[]')}catch{return []}});
  const [historyPublic,setHistoryPublic]=useState(()=>{try{return localStorage.getItem('fighter_history_public')==='true'}catch{return false}});
  const [editMode,setEditMode]=useState(false);
  const [editProfile,setEditProfile]=useState({});
  const [savingEdit,setSavingEdit]=useState(false);
  const [showGymVerify,setShowGymVerify]=useState(false);
  const [gymCodeInput,setGymCodeInput]=useState('');
  const [gymVerifyError,setGymVerifyError]=useState('');
  const [reportSent,setReportSent]=useState({});
  const [viewProfileHistory,setViewProfileHistory]=useState([]);
  const [viewProfileVer,setViewProfileVer]=useState(null);
  const [city,setCity]=useState('Berlin');
  const [citySearchOpen,setCitySearchOpen]=useState(false);
  const [citySearchQuery,setCitySearchQuery]=useState('');
  const [gymCountry,setGymCountry]=useState('DE');
  const [gymCountryOpen,setGymCountryOpen]=useState(false);
  const [rankF,setRankF]=useState('All');
  const [trainerF,setTrainerF]=useState('All');
  const [sport,setSport]=useState('Basketball');
  const [joined,setJoined]=useState({});
  const [gymRatings,setGymRatings]=useState(()=>{try{return JSON.parse(localStorage.getItem('gymRatings')||'{}')}catch{return {}}});
  const [coaches,setCoaches]=useState([]);
  const [coachesLoading,setCoachesLoading]=useState(false);
  const [dbGyms,setDbGyms]=useState([]);
  const [gymRankMode,setGymRankMode]=useState(false);
  const [countryFilter,setCountryFilter]=useState('mine'); // 'mine' | 'world'
  const [myLat,setMyLat]=useState(null);
  const [myLon,setMyLon]=useState(null);
  const [locationSource,setLocationSource]=useState('city'); // 'city' | 'ip' | 'gps'
  const [locationLoading,setLocationLoading]=useState(false);
  const [showMenu,setShowMenu]=useState(false);
  const [showFeedbackModal,setShowFeedbackModal]=useState(false);
  const [feedbackType,setFeedbackType]=useState('feedback'); // 'feedback' | 'wunsch'
  const [showEquipment,setShowEquipment]=useState(false);
  const [coachGymSuggestions,setCoachGymSuggestions]=useState([]);
  const [showCoachGymSuggestions,setShowCoachGymSuggestions]=useState(false);
  const [showPushReminder,setShowPushReminder]=useState(false);
  const [updateAvailable,setUpdateAvailable]=useState(false);
  const [latestVersion,setLatestVersion]=useState('');
  const [showSupplements,setShowSupplements]=useState(false);
  const [showNews,setShowNews]=useState(false);
  const [newsItems,setNewsItems]=useState([]);
  const [newsLoading,setNewsLoading]=useState(false);
  async function loadNews(){
    setNewsLoading(true);
    try{
      const r=await fetch(SUPA_URL+'/functions/v1/fetch-news',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
      });
      const d=await r.json();
      if(Array.isArray(d.items))setNewsItems(d.items);
    }catch(e){console.error('news laden',e);}
    setNewsLoading(false);
  }
  // Beim Öffnen der News: Team-Nachrichten serverseitig als gelesen markieren
  // (nur auf dem Server — das NEU-Badge bleibt während der Ansicht sichtbar,
  // beim nächsten App-Start erscheint dann kein Popup mehr dafür)
  useEffect(()=>{
    if(!showNews||!session)return;
    adminMessages.filter(m=>!m.read).forEach(m=>{
      fetch(SUPA_URL+'/rest/v1/admin_messages?id=eq.'+m.id,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({read:true})
      }).catch(()=>{});
    });
  },[showNews]);
  const [showSettings,setShowSettings]=useState(false);
  // Sprache: ausdrueckliche Wahl des Nutzers, sonst automatisch die Sprache
  // des Handys (Liste der Geraetesprachen), siehe lang.js
  const [appLang,setAppLang]=useState(detectLangFromDevice);

  const t = T[appLang]||T.DE;
  // L('Deutsch','English','Francais','Espanol') waehlt den Text zur Sprache
  const L=makeL(appLang);
  useEffect(()=>{
    try{document.documentElement.lang=appLang.toLowerCase();}catch(e){}
  },[appLang]);
  // Aendert der Nutzer die Handysprache, waehrend die App laeuft, folgt die App -
  // aber nur, solange er keine Sprache selbst gewaehlt hat.
  useEffect(()=>{
    const onChange=()=>{
      try{if(localStorage.getItem(LANG_KEY))return;}catch(e){}
      setAppLang(detectLangFromDevice());
    };
    window.addEventListener('languagechange',onChange);
    return()=>window.removeEventListener('languagechange',onChange);
  },[]);

  const [showFeedback,setShowFeedback]=useState(false);
  const [feedbackText,setFeedbackText]=useState('');
  const [feedbackSent,setFeedbackSent]=useState(false);
  const [events,setEvents]=useState([]);
  const [eventsLoading,setEventsLoading]=useState(false);
  const [showCreateEvent,setShowCreateEvent]=useState(false);
  const [friendPickerEventId,setFriendPickerEventId]=useState(null);
  const [friendSearchQuery,setFriendSearchQuery]=useState('');
  const [myMemberships,setMyMemberships]=useState([]);
  const [eventParticipants,setEventParticipants]=useState({});
  const [newEvent,setNewEvent]=useState({title:'',description:'',event_type:'Sparring',city:'',address:'',event_date:'',event_time:'',max_participants:10,styles:[],price:'',priceMonthly:''});
  // null = Anlegen, sonst die ID des Events, das gerade bearbeitet wird.
  // Dasselbe Formular dient beiden Zwecken, damit Anlegen und Bearbeiten
  // nicht auseinanderlaufen koennen.
  const [editEventId,setEditEventId]=useState(null);
  const [creatingEvent,setCreatingEvent]=useState(false);
  const [gymSuggestions,setGymSuggestions]=useState([]);
  const [showGymSuggestions,setShowGymSuggestions]=useState(false);
  const [showRegisterGym,setShowRegisterGym]=useState(false);
  const [newGymData,setNewGymData]=useState({name:'',city:'',address:'',style:''});
  const [gymRegSent,setGymRegSent]=useState(false);
  // Kombiniert die fest einprogrammierte Gym-Liste MIT den echten,
  // live in der Datenbank gespeicherten Gyms (z.B. ueber das Admin-Panel
  // oder "Gym anmelden" hinzugefuegt) - vorher fehlten Datenbank-Gyms
  // hier komplett, weshalb sie bei der Registrierung nie vorgeschlagen
  // wurden.
  const ALL_GYMS_FLAT=React.useMemo(()=>[
    ...Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct}))),
    ...dbGyms.map(g=>({...g,ct:g.city||g.ct||'',styles:g.styles||(g.style?[g.style]:[])})),
  ],[dbGyms]);
  const [darkMode,setDarkMode]=useState(()=>{
    try{
      const saved=localStorage.getItem('fighter_dark');
      const manual=localStorage.getItem('fighter_dark_manual')==='true';
      if(manual&&saved!==null)return saved==='true';
      return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    }catch{return false}
  });
  useEffect(()=>{
    if(!window.matchMedia)return;
    const mq=window.matchMedia('(prefers-color-scheme: dark)');
    const onChange=(e)=>{
      try{
        if(localStorage.getItem('fighter_dark_manual')==='true')return;
        setDarkMode(e.matches);
      }catch{}
    };
    mq.addEventListener?mq.addEventListener('change',onChange):mq.addListener(onChange);
    return ()=>{mq.removeEventListener?mq.removeEventListener('change',onChange):mq.removeListener(onChange);};
  },[]);
  useEffect(()=>{
    document.body.classList.toggle('dark',darkMode);
    try{localStorage.setItem('fighter_dark',String(darkMode));}catch{}
    try{
      const meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.setAttribute('content',darkMode?'#1a1a1a':'#ffffff');
    }catch{}
  },[darkMode]);

  // Gyms neu laden wenn Gym Tab geöffnet wird
  useEffect(()=>{
    if(tab==='gyms'&&session){
      loadDbGyms(session);
      // Bewertungen mit aktualisieren - sonst waeren sie so alt wie der
      // letzte App-Start, waehrend Gyms und Logos (in loadDbGyms) frisch
      // geladen werden. Ein neues Logo kam dadurch sofort an, eine neue
      // Bewertung eines anderen Nutzers aber erst nach App-Neustart.
      loadGymRatings(session);
    }
    if(tab==='events'&&session){
      loadEvents(session);
    }
    // session MUSS in der Liste stehen. Beim Rueckkehren von der Stripe-
    // Zahlungsseite laedt die Seite komplett neu: der Tab steht sofort auf
    // 'events' (aus localStorage), die Anmeldung wird aber erst Sekunden
    // spaeter wiederhergestellt. Stand hier nur [tab], lief die Pruefung
    // genau einmal - mit session===null - und nie wieder. Ergebnis: dauerhaft
    // "NOCH KEINE EVENTS", obwohl Events da sind.
  },[tab,session]);

  // Admin Änderungen sofort übernehmen — dbGyms reload nach Admin-Aktionen
  useEffect(()=>{
    if(!showAdmin&&session&&dbGyms.length===0){
      loadDbGyms(session);
    }
  },[showAdmin]);

  // Freunde-einladen-Rabatt: Marken-Freischalt-Reihenfolge einmal laden,
  // sobald sie irgendwo gebraucht wird (Mein Profil, Equipment, Supplements)
  // - nicht schon beim App-Start, um keine unnoetige Abfrage zu machen,
  // falls der Nutzer diese Bereiche nie besucht.
  useEffect(()=>{
    if(!rewardBrandsLoaded&&session&&(tab==='stats'||showEquipment||showSupplements)){
      setRewardBrandsLoaded(true);
      loadRewardBrands();
    }
  },[tab,showEquipment,showSupplements,session,rewardBrandsLoaded]);

  // Gym-Verifizierung mit der Datenbank abgleichen: Die Datenbank ist die
  // einzige Wahrheit. Steht dort "verifiziert", wird das uebernommen (z.B. auf
  // einem neuen Handy). Steht dort "nicht verifiziert", wird ein alter,
  // lokal gespeicherter Gym-Code auf diesem Geraet verworfen - er traegt die
  // Mitgliedschaft NICHT mehr heimlich neu ein (sonst kam der Haken zurueck,
  // wenn jemand sie auf einem anderen Geraet entfernt hatte).
  useEffect(()=>{
    if(!session||!myProfile?.id||myProfile.gym_verified!==undefined)return;
    let cancelled=false;
    (async()=>{
      try{
        const r=await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id+'&select=gym_verified',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
        });
        const d=r.ok?await r.json():null;
        if(!Array.isArray(d)||!d[0]||typeof d[0].gym_verified!=='boolean')return;
        if(cancelled)return;
        if(d[0].gym_verified===false){
          try{localStorage.removeItem('fighter_gym_verified');}catch(e){}
          setGymVerified(null);
        }
        setMyProfile(p=>p?{...p,gym_verified:d[0].gym_verified}:p);
      }catch(e){}
    })();
    return()=>{cancelled=true;};
  },[session,myProfile?.id,myProfile?.gym_verified]);

  // fighter_chat_poll: Chat-Liste aktuell halten (neueste Nachricht oben)
  useEffect(()=>{
    if(tab!=='chat'||activeChat||!session||!myProfile)return;
    loadMatches(session,myProfile);
    const iv=setInterval(()=>{
      if(typeof document!=='undefined'&&document.hidden)return;
      loadMatches(session,myProfile);
    },30000);
    return()=>clearInterval(iv);
  },[tab,activeChat,session?.token,myProfile?.id]);

  // Erinnerung: Profil unvollstaendig -> nicht in der Rangliste (max. 1x pro Tag)
  useEffect(()=>{
    if(!session||!myProfile||screen!=='main')return;
    if(rankIssuesOf(myProfile).length===0){setShowRankReminder(false);return;}
    let today='';
    try{today=new Date().toISOString().slice(0,10);if(localStorage.getItem('fighter_rank_reminder')===today)return;}catch{}
    const tm=setTimeout(()=>{
      if(rankIssuesOf(myProfile).length===0)return;
      setShowRankReminder(true);
      try{localStorage.setItem('fighter_rank_reminder',today);}catch{}
    },3500);
    return()=>clearTimeout(tm);
  },[session,myProfile?.id,myProfile?.gym,myProfile?.country,myProfile?.wins,myProfile?.losses,myProfile?.draws,myProfile?.record_verified,screen]);

  // Rangliste neu laden wenn Tab geöffnet wird - mit der schlanken Liste
  // (LIST_FIELDS) statt allen Spalten, und nur wenn die Liste nicht gerade
  // erst (unter 60 Sekunden) geladen wurde.
  useEffect(()=>{
    if(tab==='ranking'&&session){
      if(isFresh(allProfilesAtRef.current,Date.now()))return;
      setRankingLoading(true);
      loadAllProfiles(session).finally(()=>setRankingLoading(false));
    }
    // session gehoert auch hier in die Liste - gleicher Fehler wie beim
    // Events-Tab oben: sonst bleibt die Rangliste leer, wenn die Seite
    // direkt auf diesem Tab startet (Neuladen, Stripe-Rueckkehr).
  },[tab,session]);
  useEffect(()=>{
    if(localStorage.getItem('fighter_dark')==='true')document.body.classList.add('dark');
  },[]);
  const [showImpressum,setShowImpressum]=useState(false);
  const [showDatenschutz,setShowDatenschutz]=useState(false);
  const [showPwChange,setShowPwChange]=useState(false);
  const [oldPassword,setOldPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [newPassword2,setNewPassword2]=useState('');
  const [pwChangeMsg,setPwChangeMsg]=useState('');
  const [showAGB,setShowAGB]=useState(false);
  // 'all' = jeder mit mind. 1 Kampf (Standard, damit garantiert niemand fehlt),
  // 'user' = nur Amateure, 'pro' = nur Profis, 'trainer' = Trainer
  const [rankMode,setRankMode]=useState('user');
  const [filterWeightClass,setFilterWeightClass]=useState(true);
  const [chatSearch,setChatSearch]=useState('');

  // ── AUTOMATISCHER TOKEN-REFRESH ──
  // Ohne dies laeuft das Supabase-Token nach ca. 1 Stunde ab und alle
  // adminFetch-Aufrufe (z.B. Equipment hinzufuegen/bearbeiten im Admin-Panel)
  // schlagen mit "Token abgelaufen" fehl, bis man sich manuell neu einloggt.
  // Erneuert das Token proaktiv alle 45 Minuten im Hintergrund, solange
  // eine Session besteht - ganz unabhaengig davon, was der Nutzer gerade tut.
  useEffect(()=>{
    if(!session?.refresh_token)return;
    let retryTimeout=null;
    async function doRefresh(){
      try{
        const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
          method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
          body:JSON.stringify({refresh_token:session.refresh_token})
        });
        const data=await r.json();
        if(data.access_token){
          const newS={...session,token:data.access_token,refresh_token:data.refresh_token||session.refresh_token};
          setSession(newS);
          try{localStorage.setItem('fighter_v5',JSON.stringify(newS));}catch{}
        }else{
          // Erneuerung fehlgeschlagen - in 2 Minuten nochmal versuchen,
          // statt bis zum naechsten 20-Minuten-Zyklus stumm zu warten.
          retryTimeout=setTimeout(doRefresh,2*60*1000);
        }
      }catch{
        retryTimeout=setTimeout(doRefresh,2*60*1000);
      }
    }
    // Alle 20 statt 45 Minuten - groesserer Sicherheitsabstand, falls der
    // Timer durch einen inaktiven Tab/Standby mal verzoegert ausloest.
    const interval=setInterval(doRefresh,20*60*1000);
    // Zusaetzliche Absicherung: sobald der Tab nach einer Weile im
    // Hintergrund wieder aktiv wird, sofort erneuern statt auf den naechsten
    // Timer zu warten - Browser drosseln setInterval in Hintergrund-Tabs,
    // das war vermutlich der Hauptgrund fuer die Ausloggen-Beschwerden.
    function onVisible(){if(document.visibilityState==='visible')doRefresh();}
    document.addEventListener('visibilitychange',onVisible);
    return ()=>{clearInterval(interval);if(retryTimeout)clearTimeout(retryTimeout);document.removeEventListener('visibilitychange',onVisible);};
  },[session?.refresh_token]);

  useEffect(()=>{
    async function restoreSession(){
      // Schritt 1: localStorage lesen
      let saved=null;
      try{saved=localStorage.getItem('fighter_v5');}catch{
        setAuthReady(true);setScreen('auth');return;
      }
      if(!saved){setAuthReady(true);setScreen('auth');return;}

      let s=null;
      try{s=JSON.parse(saved);}catch{
        try{localStorage.removeItem('fighter_v5');}catch{}
        setAuthReady(true);setScreen('auth');return;
      }
      if(!s||!s.token||!s.userId){
        try{localStorage.removeItem('fighter_v5');}catch{}
        setAuthReady(true);setScreen('auth');return;
      }

      // Schritt 2: Token bei Supabase validieren — immer, kein Vertrauen auf Cache
      try{
        // Versuche Token zu refreshen
        if(s.refresh_token){
          const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
            body:JSON.stringify({refresh_token:s.refresh_token})
          });
          const data=await r.json();
          if(data.access_token){
            // Token gültig → Session erneuern
            s={...s,token:data.access_token,refresh_token:data.refresh_token||s.refresh_token};
            try{localStorage.setItem('fighter_v5',JSON.stringify(s));}catch{}
          }else{
            // Refresh fehlgeschlagen → Token abgelaufen → Login
            try{localStorage.removeItem('fighter_v5');}catch{}
            setAuthReady(true);setScreen('auth');return;
          }
        }else{
          // Kein Refresh Token → Token direkt validieren
          const check=await fetch(SUPA_URL+'/auth/v1/user',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+s.token}
          });
          if(!check.ok){
            try{localStorage.removeItem('fighter_v5');}catch{}
            setAuthReady(true);setScreen('auth');return;
          }
        }
      }catch{
        // Netzwerkfehler → trotzdem versuchen mit altem Token
        // (Offline-Fall — besser App zeigen als leere Seite)
      }

      // Schritt 3: Profil laden
      setSession(s);
      await initProfile(s);
    }

    // Sicherheitsnetz gegen ewigen Splash. WICHTIG: die gespeicherte Session
    // (fighter_v5) hier NICHT löschen! Beim Kaltstart durch einen Push-Tipp
    // ist das Netz oft ein paar Sekunden träge — würden wir die Session
    // löschen, landet ein eingeloggter Nutzer grundlos auf dem (hellen)
    // Login-Screen ("weißer Bildschirm"). 20s statt 6s gibt den Wiederhol-
    // versuchen in initProfile genug Zeit.
    const timeout=setTimeout(()=>{
      setAuthReady(true);
      setScreen(prev=>prev==='loading'?(()=>{try{return localStorage.getItem('fighter_v5')?'main':'auth';}catch{return 'auth';}})():prev);
    },20000);
    restoreSession().finally(()=>clearTimeout(timeout));
  },[]);

  async function getGPSLocation(){
    if(!navigator.geolocation){showMsg(L('GPS nicht verfügbar', 'GPS not available', 'GPS indisponible', 'GPS no disponible'));return;}
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async(pos)=>{
        const lat=pos.coords.latitude;
        const lon=pos.coords.longitude;
        setMyLat(lat);setMyLon(lon);setLocationSource('gps');
        // Reverse geocode to get city name
        try{
          const r=await fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json');
          const d=await r.json();
          const city=d.address?.city||d.address?.town||d.address?.village||d.address?.county||'';
          if(city)setProfile(p=>({...p,city}));
          // Save to DB
          if(session&&myProfile){
            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
              method:'PATCH',
              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
              body:JSON.stringify({lat,lon,location_source:'gps',city:city||myProfile.city||profile.city})
            });
          }
          showMsg((L('📍 Standort gespeichert', '📍 Location saved', '📍 Localisation sauvegardée', '📍 Ubicación guardada'))+(city?' — '+city:'')+'!');
        }catch{
          showMsg(L('📍 GPS Standort gespeichert!', '📍 GPS location saved!', '📍 Position GPS sauvegardée!', '📍 ¡Ubicación GPS guardada!'));
          if(session&&myProfile){
            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
              method:'PATCH',
              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
              body:JSON.stringify({lat,lon,location_source:'gps'})
            });
          }
        }
        setLocationLoading(false);
      },
      (err)=>{
        if(err.code===1){
          showMsg('Standort-Zugriff verweigert');
          try{localStorage.setItem('fighter_gps_denied','1');}catch{}
        }
        else showMsg((L('GPS-Fehler: ', 'GPS error: ', 'Erreur GPS : ', 'Error de GPS: '))+err.message);
        setLocationLoading(false);
      },
      {enableHighAccuracy:true,timeout:10000}
    );
  }

  async function rateGym(gymKey, stars){
    const newRatings={...gymRatings};
    if(!newRatings[gymKey])newRatings[gymKey]={total:0,count:0,userRating:0};
    const old=newRatings[gymKey].userRating||0;
    if(old>0){newRatings[gymKey].total-=old;newRatings[gymKey].count-=1;}
    newRatings[gymKey].total+=stars;
    newRatings[gymKey].count+=1;
    newRatings[gymKey].userRating=stars;
    setGymRatings(newRatings);
    localStorage.setItem('gymRatings',JSON.stringify(newRatings));
    // Meldung bewusst entfernt - Bewertung laeuft still im Hintergrund
    // In Supabase speichern
    if(session){
      try{
        // Upsert: wenn bereits bewertet → update, sonst insert
        const existing=await dbSelect('gym_ratings','user_id=eq.'+session.userId+'&gym_key=eq.'+encodeURIComponent(gymKey),session.token);
        if(Array.isArray(existing)&&existing.length>0){
          await fetch(SUPA_URL+'/rest/v1/gym_ratings?id=eq.'+existing[0].id,{
            method:'PATCH',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
            body:JSON.stringify({stars,updated_at:new Date().toISOString()})
          });
        }else{
          await fetch(SUPA_URL+'/rest/v1/gym_ratings',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
            body:JSON.stringify({user_id:session.userId,gym_key:gymKey,stars})
          });
        }
      }catch(e){console.error('rateGym Supabase error',e);}
      // Reload from DB to sync all ratings
      setTimeout(()=>loadGymRatings(session),500);
    }
  }

  function showMsg(text){setMsg(text);const isError=/Fehler|Error|Erreur|❌/.test(text);setTimeout(()=>setMsg(''),isError?15000:3000);}
  // Freunde einladen (eigener Einladungslink mit ?ref=, wie im Stats-Tab)
  function inviteFriends(){
    shareLink({title:'Fighter App',text:L('🥊 Ich suche Trainingspartner auf Fighter. Komm dazu und melde dich mit meinem Link an:', '🥊 I\'m looking for training partners on Fighter. Join me and sign up with my link:', '🥊 Je cherche des partenaires d\'entraînement sur Fighter. Rejoins-moi et inscris-toi avec mon lien :', '🥊 Busco compañeros de entrenamiento en Fighter. Únete y regístrate con mi enlace:'),url:inviteUrl(myProfile?.id),onCopied:()=>showMsg(L('Einladungslink kopiert! 📋', 'Invite link copied! 📋', 'Lien d\'invitation copié ! 📋', '¡Enlace de invitación copiado! 📋'))});
  }

  async function registerPush(userId,token){
    // Nur in der nativen App (nicht im Web-Browser)
    if(!window.Capacitor||!window.Capacitor.isNativePlatform||!window.Capacitor.isNativePlatform()){return;}
    try{
      const {PushNotifications}=await import('@capacitor/push-notifications');
      const result=await setupPushRegistration(PushNotifications,{
        onToken:async(tokenData)=>{
          try{
            const patchRes=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=eq.'+userId,{
              method:'PATCH',
              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
              body:JSON.stringify({push_token:tokenData.value})
            });
            if(!patchRes.ok){console.error('Push-Token-Speichern fehlgeschlagen',patchRes.status);}
          }catch(err){console.error('Push-Token-Speichern Fehler',err);}
        },
        onError:(err)=>{
          console.error('APNs-Registrierung fehlgeschlagen',err);
        }
      });
      if(result.status==='permission_denied'){
        setShowPushReminder(true); // zeigt eine wiederkehrende Erinnerung, bis Push aktiviert ist
        return;
      }
      setShowPushReminder(false);
      // Reagiert darauf, wenn jemand auf eine Benachrichtigung TIPPT (nicht
      // nur wenn sie ankommt) - leitet je nach Typ zur richtigen Stelle
      // in der App weiter, statt einfach nur die App zu oeffnen.
      PushNotifications.addListener('pushNotificationActionPerformed',(action)=>{
        try{
          const data=action?.notification?.data||{};
          if(data.type==='equipment'){setShowEquipment(true);}
          else if(data.type==='event'){setTab('events');}
          else if(data.type==='news'){setShowNews(true);loadNews();}
          // Tippen auf die Bewertungs-Push = "Ja, ich bewerte" -> direkt zum Store
          else if(data.type==='rate'){openAppStoreReview();}
          // "Jemand interessiert sich für dich" -> Liste öffnen, wer geliked hat
          else if(data.type==='like'){setWhoLikedTab(true);}
        }catch(e){console.error('push tap navigation',e);}
      });
    }catch(err){console.error('registerPush Fehler',err);}
  }

  async function initProfile(s,attempt=0){
    try{
      // Profil mit echter ok-Prüfung laden (nicht nur JSON parsen). So können
      // wir "Server/Netz-Fehler" von "Nutzer hat wirklich noch kein Profil"
      // unterscheiden — sonst landet ein bestehender Nutzer bei einem kurzen
      // Verbindungsproblem fälschlich im (hellen) Setup-Screen.
      const res=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=eq.'+s.userId+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height,videos,gallery,bio,record_verified,history_public,banned,social_url',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+s.token}});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const data=await res.json();
      if(!Array.isArray(data))throw new Error('Unerwartete Antwort');
      if(Array.isArray(data)&&data[0]){
        const p=data[0];
        if(p.banned===true){
          try{localStorage.removeItem('fighter_v5');}catch{}
          setSession(null);
          setAuthReady(true);
          alert(L('Dein Account wurde gesperrt. Kontakt: support@fighterapp.de', 'Your account has been suspended. Contact: support@fighterapp.de', 'Ton compte a été suspendu. Contact : support@fighterapp.de', 'Tu cuenta ha sido suspendida. Contacto: support@fighterapp.de'));
          return;
        }
        setMyProfile(p);
        try{registerPush(s.userId,s.token);}catch(e){}
        setProfile({name:p.name||'',age:p.age||'',city:p.city||'',gym:p.gym||'',height:p.height||'',weight:p.weight||'',weightClass:p.weight_class||'',style:p.style||'',bio:p.bio||'',isPro:p.is_pro===true,country:p.country||'DE',gender:p.gender||'male',socialUrl:p.social_url||''});
        try{setMyGallery(Array.isArray(p.gallery)?p.gallery:(p.gallery?JSON.parse(p.gallery):[]));}catch{setMyGallery([]);}
        if(p.lat&&p.lon){setMyLat(p.lat);setMyLon(p.lon);setLocationSource(p.location_source||'gps');}
        setStats({wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0});
        if(p.avatar_url){setAvatarUrl(p.avatar_url);setAvatarPreview(p.avatar_url);}
        if(p.coach_avatar_url){setCoachAvatarPreview(p.coach_avatar_url);}
        setAuthReady(true);
        setScreen('main');
        // Push Permission anfragen (nach kurzer Verzögerung)
        setTimeout(()=>requestPushPermission(),2000);
        // last_seen updaten
        try{fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+s.userId,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+s.token,Prefer:'return=minimal'},body:JSON.stringify({last_seen:new Date().toISOString()})});}catch{}
        loadRealFighters(s,p,true);
        loadMatches(s,p);
        loadGymRatings(s);
        loadFightHistory(s);
        loadDbGyms(s);
        loadWhoLikedMe(s,p);
        // Erst nach den Swipe-Karten und nur, wenn die Rangliste sie nicht schon geholt hat
        setTimeout(()=>{if(!allProfilesAtRef.current)loadAllProfiles(s);},4000);
        loadAdminMessages(s);
        // Standort: GPS falls bereits gespeichert, sonst IP
        if(p.lat&&p.lon){
          setMyLat(p.lat);setMyLon(p.lon);
          setLocationSource(p.location_source||'gps');
        }else{
          // Einmalige automatische GPS-Abfrage (nur beim allerersten Mal)
          try{
            if(!localStorage.getItem('fighter_gps_asked')){
              localStorage.setItem('fighter_gps_asked','1');
              setTimeout(()=>{try{getGPSLocation();}catch(e){}},3500);
            }
          }catch(e){}
          // IP-basiert automatisch im Hintergrund (als Fallback)
          getLocationByIP().then(loc=>{
            if(loc){
              setMyLat(loc.lat);setMyLon(loc.lon);
              setLocationSource('ip');
              // Stadt auch setzen falls noch leer
              if(!p.city&&loc.city){
                setProfile(prev=>({...prev,city:loc.city}));
              }
              // WICHTIG: IP-Standort auch in DB speichern, damit der Globus
              // und das Matching ihn sehen (nur wenn noch kein Standort da ist,
              // damit ein bereits aktivierter GPS-Standort nicht ueberschrieben wird)
              if(!p.lat||!p.lon){
                fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+s.userId,{
                  method:'PATCH',
                  headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+s.token,Prefer:'return=minimal'},
                  body:JSON.stringify({lat:loc.lat,lon:loc.lon,location_source:'ip'})
                }).catch(()=>{});
              }
            }
          });
        }
      }else{
        // Echt leeres Ergebnis (Anfrage war erfolgreich) -> wirklich neuer
        // Nutzer ohne Profil -> Registrierung.
        setAuthReady(true);
        setScreen('setup');
        loadDbGyms(s); // damit echte Gyms schon waehrend der Registrierung vorgeschlagen werden
      }
    }catch(e){
      // Netz-/Serverfehler (kein "kein Profil"!). Beim Push-Kaltstart ist das
      // Netz oft kurz träge — mehrmals wiederholen und dabei den dunklen
      // Splash-Screen zeigen, statt den Nutzer auf einen weißen Screen zu werfen.
      if(attempt<4){
        setTimeout(()=>initProfile(s,attempt+1),1200);
        return;
      }
      // Nach mehreren Fehlversuchen: Session NICHT löschen, nur informieren.
      // (Der Nutzer kann die App neu starten; die Session bleibt erhalten.)
      setAuthReady(true);
      setScreen('auth');
      showMsg('⚠️ Verbindungsproblem — bitte App neu starten');
    }
  }

  async function requestPushPermission(){
    if(!('Notification' in window))return;
    if(Notification.permission==='default'){
      const perm=await Notification.requestPermission();
      if(perm==='granted')showMsg(L('🔔 Benachrichtigungen aktiviert!', '🔔 Notifications enabled!', '🔔 Notifications activées!', '🔔 ¡Notificaciones activadas!'));
    }
  }

  // Öffnet die App-Store-Bewertungsseite (Sterne-Vergabe). Der Parameter
  // action=write-review öffnet direkt das Bewertungsfenster.
  function openAppStoreReview(){
    if(!APP_STORE_ID){
      showMsg('⚠️ App-Store-ID noch nicht eingetragen (in App.js ganz oben)');
      return;
    }
    try{localStorage.setItem('fighter_rate_done','1');}catch{}
    setShowRating(false);
    const url='https://apps.apple.com/app/id'+APP_STORE_ID+'?action=write-review';
    try{window.open(url,'_blank');}catch(e){window.location.href=url;}
  }
  // "Später" gewählt: Aufforderung für 7 Tage pausieren
  function snoozeRating(){
    try{localStorage.setItem('fighter_rate_snooze',String(Date.now()+7*86400000));}catch{}
    setShowRating(false);
  }
  // Entscheidet beim App-Start, ob die Bewertungs-Aufforderung gezeigt wird:
  // erst ab dem 3. Öffnen, nie wenn schon bewertet, und nicht während der
  // 7-Tage-Pause nach "Später".
  useEffect(()=>{
    if(screen!=='main'||!session||ratingCheckedRef.current)return;
    ratingCheckedRef.current=true;
    try{
      if(localStorage.getItem('fighter_rate_done')==='1')return;
      const snooze=parseInt(localStorage.getItem('fighter_rate_snooze')||'0',10);
      if(snooze&&Date.now()<snooze)return;
      const opens=(parseInt(localStorage.getItem('fighter_open_count')||'0',10)||0)+1;
      localStorage.setItem('fighter_open_count',String(opens));
      if(opens>=3){
        // kurz warten, damit der Dialog nicht mitten in den Ladevorgang platzt
        setTimeout(()=>setShowRating(true),4000);
      }
    }catch(e){}
  },[screen,session]);

  function sendLocalNotification(title,body){
    safeLocalNotification(title,body);
  }

  // Rangliste Profile nachladen — KEINE Karten-Reload
  // Laeuft nur noch, WAEHREND die Rangliste tatsaechlich offen ist, statt
  // permanent im Hintergrund alle 2 Minuten die komplette Nutzerliste zu
  // laden, egal was gerade angezeigt wird (spart Datenverbrauch/Akku/CPU).
  useEffect(()=>{
    if(!session||!myProfile||tab!=='ranking')return;
    const interval=setInterval(async()=>{
      await loadAllProfiles(session);
    },120000); // alle 2 Minuten, nur solange die Rangliste offen ist
    return()=>clearInterval(interval);
  },[session?.userId,myProfile?.id,tab]);

  // Lebenszeichen fuer einen echten Online-Status: aktualisiert last_seen
  // regelmaessig, WAEHREND die App aktiv genutzt wird - vorher wurde das
  // nur einmal beim Login gesetzt, wodurch "online" nach kurzer Zeit
  // schon veraltet war.
  useEffect(()=>{
    if(!session||!myProfile)return;
    const sendHeartbeat=()=>{
      fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({last_seen:new Date().toISOString()})
      }).catch(()=>{});
    };
    sendHeartbeat();
    const interval=setInterval(sendHeartbeat,120000); // alle 2 Minuten
    return()=>clearInterval(interval);
  },[session?.userId,myProfile?.id]);

  // Kleine Verzoegerung noetig: direkt nach dem Zurueckkommen ist der
  // Inhalt (Bilder, Listeneintraege) manchmal noch nicht vollstaendig
  // aufgebaut - dann "klemmt" der Browser die Scroll-Position zurueck,
  // weil noch nicht genug Hoehe zum Scrollen da ist. Mehrere Versuche
  // kurz nacheinander stellen sicher, dass die Position auch dann
  // greift, wenn der Inhalt etwas laenger zum Laden braucht.
  useEffect(()=>{
    if(!viewProfile&&tab==='ranking'&&mainScrollRef.current){
      const el=mainScrollRef.current;
      const target=savedRankScrollRef.current;
      el.scrollTop=target;
      const t1=setTimeout(()=>{if(el)el.scrollTop=target;},50);
      const t2=setTimeout(()=>{if(el)el.scrollTop=target;},200);
      const t3=setTimeout(()=>{if(el)el.scrollTop=target;},500);
      return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
    }
  },[viewProfile,tab]);

  useEffect(()=>{
    if(!viewGym&&tab==='gyms'&&mainScrollRef.current){
      const el=mainScrollRef.current;
      const target=savedGymScrollRef.current;
      el.scrollTop=target;
      const t1=setTimeout(()=>{if(el)el.scrollTop=target;},50);
      const t2=setTimeout(()=>{if(el)el.scrollTop=target;},200);
      const t3=setTimeout(()=>{if(el)el.scrollTop=target;},500);
      return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
    }
  },[viewGym,tab]);

  // Gyms regelmaessig neu laden, damit Aenderungen (neues Gym, geaendertes
  // Logo/Foto, aktualisierte Adresse usw.) fuer alle Nutzer zeitnah
  // ankommen - vorher wurden Gyms nur einmal beim App-Start geladen und
  // blieben danach fuer die ganze Sitzung unveraendert.
  useEffect(()=>{
    if(!session)return;
    const interval=setInterval(()=>{
      loadDbGyms(session);
    },180000); // alle 3 Minuten
    return()=>clearInterval(interval);
  },[session?.userId]);

  async function loadAdminMessages(s){
    try{
      const resp=await fetch(SUPA_URL+'/rest/v1/admin_messages?user_id=eq.'+s.userId+'&order=created_at.desc&limit=20',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+s.token}
      });
      const data=await resp.json();
      if(Array.isArray(data)&&data.length>0){
        setAdminMessages(data);
        const unread=data.filter(m=>!m.read);
        if(unread.length>0){
          setShowAdminMsg(true);
          sendLocalNotification(L('📢 Nachricht vom Fighter Team', '📢 Message from the Fighter team', '📢 Message de l\'équipe Fighter', '📢 Mensaje del equipo de Fighter'),L('Du hast '+unread.length+' neue Nachricht(en)','You have '+unread.length+' new message(s)','Tu as '+unread.length+' nouveau(x) message(s)','Tienes '+unread.length+' mensaje(s) nuevo(s)'));
        }
      }
    }catch{}
  }

  // Markiert alle ungelesenen Team-Nachrichten in EINER Anfrage.
  // Vorher lief dafuer eine Schleife mit einem Aufruf pro Nachricht.
  async function markAdminMessagesRead(){
    const ids=adminMessages.filter(m=>!m.read).map(m=>m.id);
    if(ids.length===0)return;
    // Sofort in der Anzeige umschalten, damit das Abzeichen nicht stehen
    // bleibt, falls die Anfrage haengt.
    setAdminMessages(prev=>prev.map(m=>({...m,read:true})));
    try{
      await fetch(SUPA_URL+'/rest/v1/admin_messages?id=in.('+ids.join(',')+')',{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({read:true})
      });
    }catch(e){console.error('Team-Nachrichten als gelesen markieren fehlgeschlagen',e);}
  }

  async function loadAllProfiles(s){
    try{
      const token=s?.token||session?.token;
      const profileFields=LIST_FIELDS;
      const resp=await fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&is_brand=neq.true&order=created_at.desc&limit=2000&select='+profileFields,{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
      });
      const data=await resp.json();
      if(Array.isArray(data)){
        setAllProfiles(data);
        allProfilesAtRef.current=Date.now();
      }else{
        // Fallback mit anon key
        try{
          const r2=await fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&is_brand=neq.true&order=created_at.desc&limit=500&select='+profileFields,{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
          });
          const d2=await r2.json();
          if(Array.isArray(d2)){setAllProfiles(d2);allProfilesAtRef.current=Date.now();}
        }catch{}
      }
    }catch(e){console.warn('loadAllProfiles Fehler:',e);}
  }

  async function loadWhoLikedMe(s,myP){
    try{
      // Alle die mich geliket haben
      const likes=await dbSelect('swipes','target_id=eq.'+myP.id+'&direction=eq.like',s.token);
      if(!Array.isArray(likes)||likes.length===0){setWhoLikedMe([]);return;}
      // Meine eigenen Swipes laden — damit ich weiss wen ich schon geliket habe
      const mySwipes=await dbSelect('swipes','swiper_id=eq.'+myP.id,s.token);
      const iAlreadyLiked=new Set(Array.isArray(mySwipes)?mySwipes.filter(x=>x.direction==='like').map(x=>x.target_id):[]);
      // Profile dazu laden
      const ids=likes.map(l=>l.swiper_id);
      const profiles=await dbSelect('profiles','id=in.('+ids.join(',')+')'+'&banned=neq.true&is_brand=neq.true&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height,videos,gallery,bio,record_verified,history_public,banned,social_url',s.token);
      if(!Array.isArray(profiles))return;
      // Bereits gematchte UND bereits von mir gelikte rausfiltern
      const matchedIds=new Set(dbMatches.map(m=>m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id));
      // Alle meine Swipes (egal ob like oder pass) — wer bereits von mir gesehen wurde, raus
      const iAlreadySwiped=new Set(Array.isArray(mySwipes)?mySwipes.map(x=>x.target_id):[]);
      // Nur zeigen: hat mich geliket, ich hab sie NOCH NIE geswiped, kein Match
      const notYetMatched=profiles.filter(p=>
        !matchedIds.has(p.id)&&
        !iAlreadySwiped.has(p.id)&&
        p.id!==myP.id
      );
      setWhoLikedMe(notYetMatched);
      // Neue Likes seit letztem Check
      const newLikes=likes.filter(l=>l.created_at&&l.created_at>lastLikesCheck&&!iAlreadyLiked.has(l.swiper_id)&&!matchedIds.has(l.swiper_id));
      if(newLikes.length>0){
        setNewLikesCount(newLikes.length);
        setLikesBannerSeen(''); // Banner wieder zeigen bei neuen Likes
        try{localStorage.removeItem('fighter_banner_seen');}catch{}
        sendLocalNotification('🥊 '+newLikes.length+' neue Fighter interessieren sich für dich!','Schau nach wer dich geliket hat');
      }
    }catch{}
  }

  // IDs die in dieser Session bereits geswiped wurden — verhindert Karten-Reset bei Reload
  const sessionSwipedRef=React.useRef(new Set());
  const [swipeVersion,setSwipeVersion]=React.useState(0);

  async function loadRealFighters(s,myP,isInitial=false){
    try{
      let all = await dbSelect('profiles','user_id=neq.'+s.userId+'&banned=neq.true&is_brand=neq.true&order=created_at.desc&limit=2000&select='+CARD_FIELDS,s.token);
      if(!Array.isArray(all)||all.length===0){
        try{
          const r=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=neq.'+s.userId+'&banned=neq.true&is_brand=neq.true&select='+CARD_FIELDS,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
          all=await r.json();
        }catch{}
      }
      if(!Array.isArray(all))return;
      // Alle Swipes aus DB laden
      const swiped=await dbSelect('swipes','swiper_id=eq.'+myP.id,s.token);
      const swipedIds=new Set(Array.isArray(swiped)?swiped.map(x=>x.target_id):[]);
      // Session-Swipes auch rausfiltern (sofortige Reaktion ohne DB-Runde)
      sessionSwipedRef.current.forEach(id=>swipedIds.add(id));
      // Matches filtern
      const matchedIds=new Set(dbMatches.map(m=>m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id));
      const blockedSet=new Set(blockedUsers||[]);
      const fresh=all.filter(f=>
        f.id&&
        f.name&&f.name.trim()&&  // muss einen Namen haben
        f.avatar_url&&           // muss ein Profilbild haben
        (f.style||'').trim()&&   // muss einen Kampfstil haben
        !swipedIds.has(f.id)&&
        !matchedIds.has(f.id)&&
        !blockedSet.has(f.id)&&
        !f.banned&&
        f.id!==myP.id
      );
      setCards(prev=>{
        if(isInitial||prev.length===0)return fresh;
        // Bei Hintergrund-Reload: nur wirklich neue Profile hinzufügen
        // Bestehende Karten NIEMALS überschreiben
        const existingIds=new Set(prev.map(c=>c.id));
        const brandNew=fresh.filter(f=>!existingIds.has(f.id)&&!swipedIds.has(f.id));
        if(brandNew.length===0)return prev;
        return [...prev,...brandNew];
      });
    }catch{}
  }

  function getLastSeen(dateStr){
    if(!dateStr)return null;
    const diff=Date.now()-new Date(dateStr).getTime();
    const min=Math.floor(diff/60000);
    const h=Math.floor(min/60);
    const d=Math.floor(h/24);
    if(min<2)return L('Gerade online','Online now','En ligne','En línea ahora');
    if(min<60)return L('Vor '+min+' Min',min+' min ago','Il y a '+min+' min','Hace '+min+' min');
    if(h<24)return L('Vor '+h+' Std',h+'h ago','Il y a '+h+'h','Hace '+h+' h');
    if(d<7)return L('Vor '+d+' Tag'+(d>1?'en':''),d+'d ago','Il y a '+d+'j','Hace '+d+(d>1?' días':' día'));
    return L('Vor einer Weile','A while ago','Il y a longtemps','Hace tiempo');
  }

  async function deleteHistoryEntry(f){
    if(!f||!f.id||!session)return;
    try{
      const r=await fetch(SUPA_URL+'/rest/v1/fight_history?id=eq.'+encodeURIComponent(f.id)+'&user_id=eq.'+session.userId,{
        method:'DELETE',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=representation'}
      });
      const rows=r.ok?await r.json():null;
      if(!r.ok||!Array.isArray(rows)||rows.length===0){
        showMsg(L('❌ Löschen nicht möglich. Bitte melde dich bei uns.', '❌ Deleting not possible. Please contact us.', '❌ Suppression impossible. Contacte-nous.', '❌ No se puede eliminar. Contáctanos.'));
        return;
      }
      setFightHistory(prev=>{
        const n=prev.filter(x=>x.id!==f.id);
        try{localStorage.setItem('fighter_history',JSON.stringify(n));}catch{}
        return n;
      });
      showMsg(L('Eintrag gelöscht ✓', 'Entry deleted ✓', 'Entrée supprimée ✓', 'Entrada eliminada ✓'));
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
  }

  async function loadGymLogos(){
    try{
      const r=await fetch(SUPA_URL+'/rest/v1/gym_logos?select=gym_code,logo_url,verified',{
        headers:{apikey:SUPA_KEY}
      });
      const data=await r.json();
      if(Array.isArray(data)){
        const map={};
        data.forEach(g=>{if(g.gym_code)map[g.gym_code]=g;});
        setGymLogos(map);
      }
    }catch{}
  }

  async function loadFightHistory(s){
    try{
      // history_public Status aus Profil laden
      const profileData=await dbSelect('profiles','id=eq.'+s.userId+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height,videos,gallery,bio,record_verified,history_public,banned,social_url',s.token);
      if(Array.isArray(profileData)&&profileData[0]){
        const hp=profileData[0].history_public===true;
        setHistoryPublic(hp);
        try{localStorage.setItem('fighter_history_public',String(hp));}catch{}
      }
      const data=await dbSelect('fight_history','user_id=eq.'+s.userId+'&order=created_at.desc',s.token);
      if(Array.isArray(data)){
        setFightHistory(data);
        localStorage.setItem('fighter_history',JSON.stringify(data));
      }
    }catch(e){console.error('loadFightHistory',e);}
  }

  async function loadDbGyms(s){
    try{
      loadGymLogos();
      const token=(s?.token)||session?.token;
      // Versuche mit Session Token
      let resp=await fetch(SUPA_URL+'/rest/v1/gyms?order=city.asc,name.asc',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+(token||SUPA_KEY)}
      });
      let data=await resp.json();
      // Falls Fehler — versuche ohne Auth
      if(!Array.isArray(data)){
        resp=await fetch(SUPA_URL+'/rest/v1/gyms?order=city.asc,name.asc',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
        });
        data=await resp.json();
      }
      if(Array.isArray(data)){
        setDbGyms(data.map(g=>({...g,city:(g.city||'').trim(),name:(g.name||'').trim()})));
        // Erste Stadt setzen falls noch Berlin
        if(data.length>0){
          setCity(c=>{
            const norm=s=>(s||'').toLowerCase().trim();
            const hasBerlin=data.some(g=>norm(g.city)==='berlin');
            return (c==='Berlin'&&!hasBerlin)?data[0].city:c;
          });
        }
      }
    }catch(e){console.warn('loadDbGyms error',e);}
  }

  // Freunde-einladen-Rabatt: laedt NUR die Produkte mit einem Rabattcode
  // (schlankes select, keine Bilder/Beschreibungen noetig) und berechnet
  // daraus getrennt fuer Equipment und Supplements, in welcher Reihenfolge
  // die Marken-Codes freigeschaltet werden. Dieselbe Berechnung
  // (rewardBrands.js) laeuft auch in EquipmentScreen - nur so zeigen
  // "Mein Profil" und die Equipment-/Supplement-Liste denselben Stand.
  async function loadRewardBrands(){
    try{
      const resp=await fetch(SUPA_URL+'/rest/v1/equipment?select=brand,item_type,discount_code,created_at&discount_code=not.is.null',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
      });
      const data=await resp.json();
      if(!Array.isArray(data))return;
      setRewardBrands({
        equipment:computeBrandUnlockOrder(data.filter(i=>i.item_type==='equipment')),
        supplement:computeBrandUnlockOrder(data.filter(i=>i.item_type==='supplement')),
      });
    }catch(e){console.warn('loadRewardBrands error',e);}
  }

  async function loadEvents(s){
    setEventsLoading(true);
    try{
      // Erst mit User-Token, falls RLS blockiert mit anon key versuchen
      let data=await dbSelect('events','order=event_date.asc,event_time.asc',s?.token||session?.token);
      if(!Array.isArray(data)||data.error){
        const r=await fetch(SUPA_URL+'/rest/v1/events?order=event_date.asc,event_time.asc',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
        });
        data=await r.json();
      }
      if(Array.isArray(data)){
        // Anzeige-Reihenfolge: kommende Events zuerst (das naechste ganz
        // oben), erst danach vergangene Events (am weitesten zurueckliegende
        // ganz unten). So rutscht ein Event automatisch nach unten, sobald
        // sein Termin verstrichen ist - ganz ohne dass irgendwer die Liste
        // von Hand neu sortiert. "isPast" hier bewusst genauso berechnet wie
        // weiter unten beim Rendern (nur das Datum, ohne Uhrzeit), damit
        // Sortierung und die "Vergangen"-Markierung immer zusammenpassen.
        const heute=new Date(new Date().toDateString());
        data=[...data].sort((a,b)=>{
          const aPast=!!(a.event_date&&new Date(a.event_date)<heute);
          const bPast=!!(b.event_date&&new Date(b.event_date)<heute);
          if(aPast!==bPast)return aPast?1:-1;
          const aKey=(a.event_date||'')+' '+(a.event_time||'00:00');
          const bKey=(b.event_date||'')+' '+(b.event_time||'00:00');
          if(aKey===bKey)return 0;
          // Kommende Events: das naechste zuerst (aufsteigend).
          // Vergangene Events: das zuletzt verstrichene zuerst (absteigend).
          return aPast?(aKey<bKey?1:-1):(aKey<bKey?-1:1);
        });
        // Load participants count for each event
        const parts={};
        await Promise.all(data.map(async ev=>{
          try{
            const p=await dbSelect('event_participants','event_id=eq.'+ev.id+'&select=*,profiles(name,avatar_url)',s?.token||session?.token);
            parts[ev.id]=Array.isArray(p)?p:[];
          }catch{parts[ev.id]=[];}
        }));
        setEventParticipants(parts);
        setEvents(data);
      }
      // Eigene aktiven Mitgliedschaften laden (Monatsbeitrag) - unabhaengig
      // von einzelnen Terminen, gilt fuer alle Events desselben Erstellers.
      if(myProfile?.id){
        try{
          const m=await dbSelect('event_memberships','user_id=eq.'+myProfile.id+'&valid_until=gte.'+new Date().toISOString()+'&order=valid_until.desc',s?.token||session?.token);
          setMyMemberships(Array.isArray(m)?m:[]);
        }catch{setMyMemberships([]);}
      }
    }catch(e){console.error('loadEvents',e);}
    setEventsLoading(false);
  }

  // Admin kann jeden Nutzer direkt anschreiben - legt (falls noch nicht
  // vorhanden) ein ganz normales Match zwischen Admin und dieser Person
  // an und oeffnet den Chat, genau wie bei jedem anderen Match auch. Der
  // Nutzer sieht einfach eine ganz normale Chat-Nachricht, keine
  // Sonderbehandlung.
  async function startAdminChat(targetUser){
    if(!myProfile||!targetUser?.id)return;
    try{
      await fetch(SUPA_URL+'/rest/v1/matches',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'resolution=ignore-duplicates,return=minimal'},
        body:JSON.stringify({profile_a_id:myProfile.id,profile_b_id:targetUser.id})
      });
      // Bestehendes (oder gerade erstelltes) Match laden - Profile werden
      // separat nachgeladen und manuell zusammengefuegt (gleiches Muster
      // wie beim normalen Laden aller Matches), statt uns auf genaue
      // Fremdschluessel-Namen in der Datenbank zu verlassen.
      const r=await fetch(SUPA_URL+'/rest/v1/matches?or=(and(profile_a_id.eq.'+myProfile.id+',profile_b_id.eq.'+targetUser.id+'),and(profile_a_id.eq.'+targetUser.id+',profile_b_id.eq.'+myProfile.id+'))&limit=1',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
      const rows=await r.json();
      if(Array.isArray(rows)&&rows[0]){
        const m=rows[0];
        const profRes=await fetch(SUPA_URL+'/rest/v1/profiles?id=in.('+myProfile.id+','+targetUser.id+')&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,wins,losses,draws,ko,last_seen',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
        });
        const profs=await profRes.json();
        const byId=Array.isArray(profs)?Object.fromEntries(profs.map(p=>[p.id,p])):{};
        m.profile_a=byId[m.profile_a_id];
        m.profile_b=byId[m.profile_b_id];
        setShowAdmin(false);
        setActiveChat(m);
      }else{
        showMsg(L('❌ Chat konnte nicht geöffnet werden', '❌ Chat could not be opened', '❌ Impossible d\'ouvrir le chat', '❌ No se pudo abrir el chat'));
      }
    }catch(e){showMsg('❌ Fehler: '+e.message);}
  }

  // Legt eine "wartende" Anmeldung an: erst wenn der ausgewaehlte Freund
  // sich ebenfalls fuer dasselbe Event anmeldet UND bezahlt, wird diese
  // Zeile ueber den stripe-webhook freigeschaltet (baf_unlocked=true) - erst
  // dann kann zum reduzierten Preis bezahlt werden.
  async function bringFriend(eventId,friendProfileId){
    if(!session||!myProfile||!friendProfileId)return;
    try{
      const token=await getFreshToken();
      const r=await fetch(SUPA_URL+'/rest/v1/event_participants',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=representation'},
        body:JSON.stringify({event_id:eventId,user_id:myProfile.id,paid:false,brought_friend_id:friendProfileId})
      });
      if(r.ok){
        showMsg('Angemeldet! Sobald dein Freund auch zahlt, bekommst du 10€ Rabatt.');
        loadEvents(session);
      }else{
        const t=await r.text().catch(()=>'');
        showMsg(L('❌ Fehler (','❌ Error (','❌ Erreur (','❌ Error (')+r.status+'): '+t.slice(0,150));
      }
    }catch(e){showMsg('❌ Fehler: '+e.message);}
  }

  // Analog zu joinEvent, aber fuer den Monatsbeitrag: eigener Stripe-
  // Checkout-Aufruf mit type:'membership' - der Server (create-checkout)
  // erstellt daraus KEINE Event-Teilnahme, sondern eine zeitlich begrenzte
  // Mitgliedschaft, die fuer alle Trainings desselben Erstellers gilt.
  async function joinEventMonthly(eventId){
    if(!session||!myProfile)return;
    try{
      showMsg(L('Zahlungsseite wird geöffnet...', 'Opening payment page...', 'Ouverture de la page de paiement...', 'Abriendo la página de pago...'));
      const token=await getFreshToken();
      const r=await fetch(SUPA_URL+'/functions/v1/create-checkout',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
        body:JSON.stringify({eventId,userToken:token,type:'membership'})
      });
      const d=await r.json();
      if(d.url){window.location.href=d.url;}
      else{showMsg('❌ Fehler: '+(d.error||L('Zahlungsseite konnte nicht erstellt werden', 'Payment page could not be created', 'La page de paiement n\'a pas pu être créée', 'No se pudo crear la página de pago')));}
    }catch(e){showMsg('❌ Fehler: '+e.message);}
  }

  async function joinEvent(eventId,price){
    if(!session||!myProfile)return;
    // Bezahltes Event: zur sicheren Stripe-Zahlungsseite weiterleiten,
    // statt direkt anzumelden - die Anmeldung passiert erst automatisch
    // NACH erfolgreicher Zahlung (ueber den stripe-webhook im Hintergrund).
    //
    // HINWEIS: Hier stand zwischenzeitlich 'create-revolut-order'. Diese
    // Funktion wurde jedoch nie angelegt (weder im Projekt noch auf dem
    // Server) - jeder Kaufversuch lief daher ins Leere. Eingerichtet und
    // getestet ist Stripe, deshalb wieder create-checkout.
    if(price&&price>0){
      try{
        showMsg(L('Zahlungsseite wird geöffnet...', 'Opening payment page...', 'Ouverture de la page de paiement...', 'Abriendo la página de pago...'));
        const token=await getFreshToken();
        const r=await fetch(SUPA_URL+'/functions/v1/create-checkout',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
          body:JSON.stringify({eventId,userToken:token})
        });
        const d=await r.json();
        if(d.url){window.location.href=d.url;}
        else{showMsg('❌ Fehler: '+(d.error||L('Zahlungsseite konnte nicht erstellt werden', 'Payment page could not be created', 'La page de paiement n\'a pas pu être créée', 'No se pudo crear la página de pago')));}
      }catch(e){showMsg('❌ Fehler: '+e.message);}
      return;
    }
    try{
      const token=await getFreshToken();
      // return=representation statt =minimal: nur so sieht man, ob wirklich
      // eine Zeile entstanden ist. Frueher stand hier unabhaengig vom
      // Ergebnis "Du nimmst teil!" - die Zugriffsregeln (RLS) wiesen den
      // Eintrag aber ab, und die Teilnehmerzahl blieb bei 0.
      const r=await fetch(SUPA_URL+'/rest/v1/event_participants',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=representation'},
        body:JSON.stringify({event_id:eventId,user_id:myProfile.id})
      });
      if(!r.ok){
        const d=await r.text();
        console.error('Anmelden fehlgeschlagen',r.status,d);
        showMsg(L('❌ Anmelden fehlgeschlagen (','❌ Registration failed (','❌ Inscription échouée (','❌ Falló la inscripción (')+r.status+')');
        return;
      }
      const angelegt=await r.json().catch(()=>[]);
      if(!Array.isArray(angelegt)||angelegt.length===0){
        console.error('Anmelden: 0 Zeilen angelegt',{eventId,profileId:myProfile.id});
        showMsg(L('❌ Anmelden nicht moeglich - keine Berechtigung', '❌ Registration not possible — no permission', '❌ Inscription impossible — pas d\'autorisation', '❌ No se puede inscribir — sin permiso'));
        return;
      }
      await loadEvents(session);
      showMsg(L('Du nimmst teil! 🥊', 'You\'re in! 🥊', 'Tu participes ! 🥊', '¡Participas! 🥊'));
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
  }

  async function leaveEvent(eventId){
    if(!session||!myProfile)return;
    try{
      // Frisches Token, nicht session.token: das laeuft nach 1 Stunde ab.
      // Genau daran scheiterte schon der Ticketkauf ("Ungueltiger Token").
      const token=await getFreshToken();
      const r=await fetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+eventId+'&user_id=eq.'+myProfile.id,{
        method:'DELETE',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=representation'}
      });
      if(!r.ok){
        const d=await r.text();
        console.error('Abmelden fehlgeschlagen',r.status,d);
        showMsg('❌ Abmelden fehlgeschlagen ('+r.status+')');
        return;
      }
      // WICHTIG: return=representation liefert die tatsaechlich geloeschten
      // Zeilen. Ohne das meldet der Datenbank-Dienst auch dann Erfolg, wenn
      // die Zugriffsregeln (RLS) die Zeile ausblenden und in Wahrheit NICHTS
      // geloescht wurde. Frueher stand hier unabhaengig davon "Abgemeldet" -
      // der Knopf blieb auf "Abmelden" stehen und niemand wusste, warum.
      const geloescht=await r.json().catch(()=>[]);
      if(!Array.isArray(geloescht)||geloescht.length===0){
        console.error('Abmelden: 0 Zeilen geloescht - vermutlich RLS-Regel',{eventId,profileId:myProfile.id});
        showMsg(L('❌ Abmelden nicht moeglich - keine Berechtigung', '❌ Cancelling not possible — no permission', '❌ Désinscription impossible — pas d\'autorisation', '❌ No se puede cancelar — sin permiso'));
        return;
      }
      await loadEvents(session);
      showMsg('Abgemeldet');
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
  }

  async function createEvent(){
    if(!session||!myProfile)return;
    if(!newEvent.title||!newEvent.city||!newEvent.event_date){showMsg(L('Titel, Stadt und Datum sind Pflicht', 'Title, city and date are required', 'Titre, ville et date sont obligatoires', 'Título, ciudad y fecha son obligatorios'));return;}
    setCreatingEvent(true);
    try{
      await fetch(SUPA_URL+'/rest/v1/events',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({
          creator_id:myProfile.id,
          title:newEvent.title,
          description:newEvent.description,
          event_type:newEvent.event_type,
          city:newEvent.city,
          address:newEvent.address,
          event_date:newEvent.event_date,
          event_time:newEvent.event_time,
          max_participants:parseInt(newEvent.max_participants)||10,
          styles:newEvent.styles,
          price:parseFloat(newEvent.price)||0,
          price_monthly:newEvent.priceMonthly?parseFloat(newEvent.priceMonthly):null
        })
      });
      setShowCreateEvent(false);
      const evTitle=newEvent.title,evCity=newEvent.city,evType=newEvent.event_type;
      setNewEvent({title:'',description:'',event_type:'Sparring',city:'',address:'',event_date:'',event_time:'',max_participants:10,styles:[],price:'',priceMonthly:''});
      await loadEvents(session);
      showMsg(L('Event erstellt! 🎉', 'Event created! 🎉', 'Événement créé ! 🎉', '¡Evento creado! 🎉'));
      // Alle Nutzer per Push ueber das neue Event benachrichtigen
      fetch(SUPA_URL+'/functions/v1/broadcast-push',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
        body:JSON.stringify({title:'📅 Neues Event: '+evType,body:evTitle+(evCity?' in '+evCity:'')+' - jetzt anmelden!',data:{type:'event'}})
      }).catch(err=>console.error('event push',err));
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
    setCreatingEvent(false);
  }

  // Oeffnet dasselbe Formular wie zum Anlegen, nur mit den Werten des
  // vorhandenen Events vorbelegt. Wird aus dem Admin-Bereich aufgerufen.
  function openEventEditor(ev){
    setNewEvent({
      title:ev.title||'',
      description:ev.description||'',
      event_type:ev.event_type||'Sparring',
      city:ev.city||'',
      address:ev.address||'',
      event_date:ev.event_date||'',
      event_time:ev.event_time||'',
      max_participants:ev.max_participants||10,
      styles:Array.isArray(ev.styles)?ev.styles:[],
      // 0 EUR ist "kostenlos" und gehoert als leeres Feld angezeigt,
      // sonst stuende dort eine 0, die man erst loeschen muesste.
      price:(ev.price!==null&&ev.price!==undefined&&Number(ev.price)>0)?String(ev.price):'',
      priceMonthly:(ev.price_monthly!==null&&ev.price_monthly!==undefined&&Number(ev.price_monthly)>0)?String(ev.price_monthly):''
    });
    setEditEventId(ev.id);
    setShowCreateEvent(true);
  }

  function closeEventForm(){
    setShowCreateEvent(false);
    setEditEventId(null);
    setNewEvent({title:'',description:'',event_type:'Sparring',city:'',address:'',event_date:'',event_time:'',max_participants:10,styles:[],price:'',priceMonthly:''});
  }

  function duplicateEvent(ev){
    setNewEvent({
      title:ev.title||'',
      description:ev.description||'',
      event_type:ev.event_type||'Sparring',
      city:ev.city||'',
      address:ev.address||'',
      event_date:'',
      event_time:'',
      max_participants:ev.max_participants||10,
      styles:Array.isArray(ev.styles)?ev.styles:[],
      price:(ev.price!==null&&ev.price!==undefined&&Number(ev.price)>0)?String(ev.price):'',
      priceMonthly:(ev.price_monthly!==null&&ev.price_monthly!==undefined&&Number(ev.price_monthly)>0)?String(ev.price_monthly):''
    });
    setEditEventId(null);
    setShowCreateEvent(true);
    showMsg(L('📋 Als Vorlage übernommen — Datum/Uhrzeit bitte neu setzen', '📋 Copied as template — please set date/time again', '📋 Repris comme modèle — redéfinis la date et l\'heure', '📋 Copiado como plantilla — vuelve a poner fecha y hora'));
  }

  async function saveEventEdit(){
    if(!session||!editEventId)return;
    if(!newEvent.title||!newEvent.city||!newEvent.event_date){showMsg(L('Titel, Stadt und Datum sind Pflicht', 'Title, city and date are required', 'Titre, ville et date sont obligatoires', 'Título, ciudad y fecha son obligatorios'));return;}
    setCreatingEvent(true);
    try{
      // Ueber adminFetch, nicht mit dem eigenen Token: die UPDATE-Regel auf
      // events vergleicht auth.uid() mit creator_id, dort steht aber die
      // Profil-ID. Ein normaler Token wird deshalb immer abgewiesen.
      const r=await adminFetch(SUPA_URL+'/rest/v1/events?id=eq.'+editEventId,{
        method:'PATCH',
        headers:{Prefer:'return=representation'},
        body:JSON.stringify({
          title:newEvent.title,
          description:newEvent.description,
          event_type:newEvent.event_type,
          city:newEvent.city,
          address:newEvent.address,
          event_date:newEvent.event_date,
          event_time:newEvent.event_time,
          max_participants:parseInt(newEvent.max_participants)||10,
          styles:newEvent.styles,
          price:parseFloat(newEvent.price)||0,
          price_monthly:newEvent.priceMonthly?parseFloat(newEvent.priceMonthly):null
        })
      },session?.token);
      // Ergebnis pruefen statt Erfolg zu behaupten - genau der Fehler, der
      // uns beim Ticketkauf und beim An-/Abmelden Stunden gekostet hat.
      // adminFetch liefert die rohe Antwort, kein fertiges JSON.
      if(!r.ok){
        const d=await r.text();
        console.error('Event speichern fehlgeschlagen',r.status,d);
        showMsg('❌ Speichern fehlgeschlagen ('+r.status+')');
        setCreatingEvent(false);
        return;
      }
      const geaendert=await r.json().catch(()=>[]);
      if(!Array.isArray(geaendert)||geaendert.length===0){
        console.error('Event speichern: 0 Zeilen geaendert',{editEventId});
        showMsg(L('❌ Speichern fehlgeschlagen - Event nicht gefunden', '❌ Saving failed — event not found', '❌ Échec de l\'enregistrement — événement introuvable', '❌ Error al guardar — evento no encontrado'));
        setCreatingEvent(false);
        return;
      }
      closeEventForm();
      await loadEvents(session);
      showMsg(L('Event gespeichert ✅', 'Event saved ✅', 'Événement enregistré ✅', 'Evento guardado ✅'));
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
    setCreatingEvent(false);
  }

  // Laedt alle echten, registrierten Trainer + ihre Durchschnitts-
  // Bewertung. Ersetzt die vorherige fest einprogrammierte Beispiel-Liste.
  async function loadCoaches(s){
    setCoachesLoading(true);
    try{
      const profs=await dbSelect('profiles','is_coach=eq.true&select=id,user_id,name,city,avatar_url,is_coach,coach_gym,coach_styles,coach_experience,coach_bio,coach_avatar_url',s?.token||session?.token);
      const ratings=await dbSelect('coach_ratings','',s?.token||session?.token);
      const byCoach={};
      if(Array.isArray(ratings))ratings.forEach(r=>{
        if(!byCoach[r.coach_id])byCoach[r.coach_id]={total:0,count:0};
        byCoach[r.coach_id].total+=r.stars;
        byCoach[r.coach_id].count+=1;
      });
      const list=(Array.isArray(profs)?profs:[]).map(c=>{
        const r=byCoach[c.id]||{total:0,count:0};
        const mine=Array.isArray(ratings)?ratings.find(x=>x.coach_id===c.id&&x.user_id===(s?.userId||session?.userId)):null;
        return{...c,avgRating:r.count>0?(r.total/r.count):0,ratingCount:r.count,myRating:mine?mine.stars:0};
      }).sort((a,b)=>b.avgRating-a.avgRating);
      setCoaches(list);
      return list;
    }catch(e){console.error('loadCoaches',e);return [];}
    finally{setCoachesLoading(false);}
  }

  async function deleteChat(matchId){
    try{
      // inkl. zusammengefasster Duplikate, sonst taucht der Chat gleich wieder auf
      const allIds=[matchId,...(((dbMatches.find(x=>x.id===matchId)||{}).dupIds)||[])];
      const idList=allIds.map(encodeURIComponent).join(',');
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=in.('+idList+')',{
        method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
      await fetch(SUPA_URL+'/rest/v1/matches?id=in.('+idList+')',{
        method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
      setDbMatches(prev=>prev.filter(m=>m.id!==matchId));
      showMsg(L('Chat gelöscht', 'Chat deleted', 'Chat supprimé', 'Chat eliminado'));
    }catch(e){showMsg(L('Fehler beim Löschen: ','Error deleting: ','Erreur lors de la suppression : ','Error al eliminar: ')+e.message);}
  }

  async function rateCoach(coachId,stars){
    if(!session)return;
    try{
      const oldIndex=coaches.findIndex(c=>c.id===coachId);
      const target=coaches.find(c=>c.id===coachId);

      const existing=await dbSelect('coach_ratings','coach_id=eq.'+coachId+'&user_id=eq.'+session.userId,session.token);
      if(Array.isArray(existing)&&existing.length>0){
        await fetch(SUPA_URL+'/rest/v1/coach_ratings?id=eq.'+existing[0].id,{
          method:'PATCH',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
          body:JSON.stringify({stars,updated_at:new Date().toISOString()})
        });
      }else{
        await fetch(SUPA_URL+'/rest/v1/coach_ratings',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
          body:JSON.stringify({coach_id:coachId,user_id:session.userId,stars})
        });
      }
      showMsg('⭐ Bewertung gespeichert');
      const newList=await loadCoaches(session);

      if(target?.user_id&&target.user_id!==session.userId){
        const raterName=(myProfile&&myProfile.name)||'Jemand';
        fetch(SUPA_URL+'/functions/v1/send-push',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
          body:JSON.stringify({recipientUserId:target.user_id,title:'⭐ Neue Bewertung!',body:raterName+' hat dich mit '+stars+' Sternen bewertet',data:{type:'coach_rating'}})
        }).catch(err=>console.error('coach rating push',err));

        const newIndex=newList.findIndex(c=>c.id===coachId);
        if(oldIndex!==-1&&newIndex!==-1&&newIndex<oldIndex){
          fetch(SUPA_URL+'/functions/v1/send-push',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
            body:JSON.stringify({recipientUserId:target.user_id,title:'🏆 Du bist aufgestiegen!',body:'Du stehst jetzt auf Platz '+(newIndex+1)+' in der Trainer-Rangliste',data:{type:'coach_rank_up'}})
          }).catch(err=>console.error('coach rank push',err));
        }
      }
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
  }

  async function loadGymRatings(s){
    try{
      // WICHTIG: Die Durchschnitts-Berechnung stand frueher komplett INNERHALB
      // von "if(eigene Bewertungen vorhanden)". Wer selbst noch nie ein Gym
      // bewertet hatte, bekam dadurch GAR KEINE Bewertungen zu sehen - und da
      // die Gym-Liste danach sortiert, sah jeder eine andere Reihenfolge.
      // Betroffen waren 523 von 547 Nutzern (96%).
      // Jetzt werden die Bewertungen IMMER geladen und berechnet; die eigene
      // Bewertung ist nur noch eine Zusatzangabe.
      const allRatings=await dbSelect('gym_ratings','',s.token);
      if(!Array.isArray(allRatings)){
        console.error('loadGymRatings: unerwartete Antwort',allRatings);
        return;
      }
      const data=await dbSelect('gym_ratings','user_id=eq.'+s.userId,s.token);
      const meine=Array.isArray(data)?data:[];

      const gymTotals={};
      allRatings.forEach(r=>{
        if(!gymTotals[r.gym_key])gymTotals[r.gym_key]={total:0,count:0};
        gymTotals[r.gym_key].total+=r.stars;
        gymTotals[r.gym_key].count+=1;
      });
      const final={};
      Object.keys(gymTotals).forEach(k=>{
        const myR=meine.find(r=>r.gym_key===k);
        final[k]={
          total:gymTotals[k].total,
          count:gymTotals[k].count,
          userRating:myR?myR.stars:0
        };
      });
      setGymRatings(final);
      try{localStorage.setItem('gymRatings',JSON.stringify(final));}catch{}
    }catch(e){console.error('loadGymRatings',e);}
  }

  async function loadMatches(s,myP){
    setMatchesLoading(true);
    try{
      const m=await dbSelect('matches','or=(profile_a_id.eq.'+myP.id+',profile_b_id.eq.'+myP.id+')',s.token);
      if(!Array.isArray(m)||m.length===0){setDbMatches([]);return;}
      // Load profiles only for matched users
      const matchIds=[...new Set(m.flatMap(x=>[x.profile_a_id,x.profile_b_id]))].filter(Boolean);
      const matchProfiles=matchIds.length>0?await dbSelect('profiles','id=in.('+matchIds.join(',')+')'+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,wins,losses,draws,ko,last_seen',s.token):[];
      // Fallback mit anon key falls Session-Token RLS blockiert
      let profilesArr=Array.isArray(matchProfiles)?matchProfiles:[];
      if(profilesArr.length===0&&matchIds.length>0){
        try{
          const fb=await fetch(SUPA_URL+'/rest/v1/profiles?id=in.('+matchIds.join(',')+')'+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,wins,losses,draws,ko,last_seen',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
          });
          const fbData=await fb.json();
          if(Array.isArray(fbData))profilesArr=fbData;
        }catch{}
      }
      const profileMap={};
      profilesArr.forEach(p=>{if(p&&p.id)profileMap[p.id]=p;});
      // Letzte Nachricht pro Match laden
      const enrichedRaw=m.map(match=>({
        ...match,
        profile_a:profileMap[match.profile_a_id]||null,
        profile_b:profileMap[match.profile_b_id]||null,
        last_message_at:match.created_at,
        last_message_text:''
      }));
      // Letzte Nachrichten parallel laden
      const withMessages=await Promise.all(enrichedRaw.map(async match=>{
        try{
          const msgs=await dbSelect('messages','match_id=eq.'+match.id+'&order=created_at.desc&limit=1',s.token);
          if(Array.isArray(msgs)&&msgs.length>0){
            return{...match,last_message_at:msgs[0].created_at,last_message_text:msgs[0].content||''};
          }
        }catch{}
        return match;
      }));
      // Nach neuester Nachricht sortieren
      const sorted=withMessages.filter(x=>x&&x.id).sort((a,b)=>{try{return new Date(b.last_message_at||0)-new Date(a.last_message_at||0);}catch{return 0;}});
      // Doppelte Matches mit derselben Person zusammenfassen (neuester bleibt)
      const seenPair=new Map();
      const deduped=[];
      sorted.forEach(m=>{
        const oid=m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id;
        if(!oid){deduped.push({...m,dupIds:[]});return;}
        if(seenPair.has(oid)){seenPair.get(oid).dupIds.push(m.id);return;}
        const mm={...m,dupIds:[]};
        seenPair.set(oid,mm);
        deduped.push(mm);
      });
      setDbMatches(deduped);
      // Ungelesene zählen
      const unread=deduped.filter(m=>m.last_message_at&&m.last_message_at>( localStorage.getItem('fighter_last_read_'+m.id)||'2000-01-01')).length;
      setUnreadCount(unread);
    }catch(e){console.error('loadMatches error',e);}
    finally{setMatchesLoading(false);}
  }

  // Profile-Polling entfernt — zu langsam, nicht nötig

  // Zurück-Button abfangen
  useEffect(()=>{
    const onPop=()=>{
      if(activeChat){setActiveChat(null);return;}
      if(viewGym){setViewGym(null);return;}
      if(viewProfile){setViewProfile(null);return;}
      if(whoLikedTab){setWhoLikedTab(false);return;}
      if(showAdmin){setShowAdmin(false);return;}
      if(showImpressum){setShowImpressum(false);return;}
      if(showDatenschutz){setShowDatenschutz(false);return;}
      if(showAGB){setShowAGB(false);return;}
      if(showGymVerify){setShowGymVerify(false);return;}
      // Nichts zu schließen — bleib in der App
      window.history.pushState(null,'',window.location.href);
    };
    window.history.pushState(null,'',window.location.href);
    window.addEventListener('popstate',onPop);
    return()=>window.removeEventListener('popstate',onPop);
  },[activeChat,viewProfile,viewGym,whoLikedTab,showAdmin,showImpressum,showDatenschutz,showAGB,showGymVerify]);

  function handleSession(s){
    const sessionData={token:s.token,userId:s.userId,refresh_token:s.refresh_token,expires_at:Date.now()+(3600*1000)};
    setSession(sessionData);
    try{localStorage.setItem('fighter_v5',JSON.stringify(sessionData));}catch{}
    initProfile(sessionData);
  }

  // Liefert einen garantiert frischen Anmelde-Token und aktualisiert die
  // gespeicherte Sitzung gleich mit.
  //
  // WARUM: Supabase-Token laufen nach EINER STUNDE ab. Die App erneuert sie
  // sonst nur beim Start. Wer die App laenger offen hatte und dann etwas
  // kaufen wollte, bekam deshalb "Ungueltiger oder abgelaufener Token".
  //
  // refreshSession() reicht dafuer nicht: Es setzt nur den Zustand, und der
  // steht im selben Durchlauf noch nicht zur Verfuegung. Hier wird der neue
  // Token direkt zurueckgegeben.
  async function getFreshToken(){
    if(!session)return null;
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({refresh_token:session.refresh_token})
      });
      const d=await r.json();
      if(d.access_token){
        const neu={...session,token:d.access_token,refresh_token:d.refresh_token||session.refresh_token};
        setSession(neu);
        try{localStorage.setItem('fighter_v5',JSON.stringify(neu));}catch{}
        return d.access_token;
      }
    }catch(e){console.error('Token erneuern fehlgeschlagen',e);}
    return session.token; // Notfalls den bisherigen versuchen
  }

  async function refreshSession(s){
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      const data=await r.json();
      if(data.access_token){
        const newS={...s,token:data.access_token,refresh_token:data.refresh_token};
        setSession(newS);localStorage.setItem('fighter_v5',JSON.stringify(newS));
      }
    }catch{}
  }

  async function handleLogout(){
    if(session)await authSignOut(session.token);
    localStorage.removeItem('fighter_v5');
    setSession(null);setMyProfile(null);setProfile({name:'',age:'',city:'',gym:'',height:'',weight:'',weightClass:'',style:'',bio:''});setStats({wins:0,losses:0,draws:0,ko:0});setAvatarUrl('');setAvatarPreview('');setAuthReady(true);setScreen('auth');
  }

  async function saveEditProfile(){
    if(!session||!myProfile)return;
    setSavingEdit(true);
    const finalIsCoach=!!(editProfile.isCoach!==undefined?editProfile.isCoach:profile.isCoach);
    try{
      const patchRes=await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({
          name:editProfile.name||profile.name,
          city:editProfile.city||profile.city,
          gym:editProfile.gym||profile.gym,
          bio:editProfile.bio!==undefined?editProfile.bio:profile.bio,
          style:editProfile.style||profile.style,
          weight_class:editProfile.weightClass||profile.weightClass,
          belt:editProfile.belt!==undefined?editProfile.belt:profile.belt,
          is_coach:finalIsCoach,
          coach_gym:editProfile.coachGym!==undefined?editProfile.coachGym:profile.coachGym,
          coach_styles:editProfile.coachStyles!==undefined?editProfile.coachStyles:profile.coachStyles,
          coach_experience:parseInt(editProfile.coachExperience!==undefined?editProfile.coachExperience:profile.coachExperience)||null,
          coach_bio:editProfile.coachBio!==undefined?editProfile.coachBio:profile.coachBio,
          coach_avatar_url:editProfile.coachAvatarUrl!==undefined?editProfile.coachAvatarUrl:profile.coachAvatarUrl,
          height:editProfile.height||profile.height,
          weight:editProfile.weight||profile.weight,
          is_pro:editProfile.isPro!==undefined?editProfile.isPro:profile.isPro,
          country:editProfile.country||profile.country||'DE',
          gender:editProfile.gender||profile.gender||'male',
        })
      });
      if(!patchRes.ok){
        const errText=await patchRes.text().catch(()=>'');
        showMsg(L('❌ Fehler beim Speichern (Status ','❌ Error saving (status ','❌ Erreur d\'enregistrement (statut ','❌ Error al guardar (estado ')+patchRes.status+'): '+errText.slice(0,150));
        setSavingEdit(false);
        return;
      }
      setProfile(p=>({...p,...editProfile}));
      setMyProfile(mp=>({...mp,...editProfile,
        name:editProfile.name||mp.name,
        city:editProfile.city||mp.city,
        gym:editProfile.gym||mp.gym,
        bio:editProfile.bio!==undefined?editProfile.bio:mp.bio,
        is_coach:finalIsCoach,
        coach_gym:editProfile.coachGym!==undefined?editProfile.coachGym:mp.coach_gym,
        coach_styles:editProfile.coachStyles!==undefined?editProfile.coachStyles:mp.coach_styles,
        coach_experience:editProfile.coachExperience!==undefined?editProfile.coachExperience:mp.coach_experience,
        coach_bio:editProfile.coachBio!==undefined?editProfile.coachBio:mp.coach_bio,
        coach_avatar_url:editProfile.coachAvatarUrl!==undefined?editProfile.coachAvatarUrl:mp.coach_avatar_url,
        belt:editProfile.belt!==undefined?editProfile.belt:mp.belt,
        gender:editProfile.gender||mp.gender,
      }));
      // Erzwingt zusaetzlich ein frisches Nachladen aller Profile, damit
      // die Rangliste garantiert den neuesten Stand hat (nicht nur ueber
      // die lokale State-Aktualisierung, sondern wirklich frisch aus der
      // Datenbank) - reine Vorsichtsmassnahme fuer maximale Konsistenz.
      loadAllProfiles(session);
      showMsg(L('Profil gespeichert ✓', 'Profile saved ✓', 'Profil enregistré ✓', 'Perfil guardado ✓'));
      setEditMode(false);
    }catch(e){showMsg(L('Fehler beim Speichern: ','Error saving: ','Erreur lors de la sauvegarde : ','Error al guardar: ')+e.message);}
    setSavingEdit(false);
  }

  async function saveProfile(){
    if(!session)return;
    setSaving(true);

    // Marken-Konto: komplett eigener, kurzer Pfad - kein Foto, kein
    // Gewicht/Alter/Stil noetig, landet direkt in der eingeschraenkten
    // Brand-Ansicht statt im normalen Fighter-Setup.
    if(profile.isBrand){
      try{
        const d={user_id:session.userId,name:profile.companyName,is_brand:true,country:profile.country||'DE'};
        let res;
        if(myProfile){
          res=await dbUpdate('profiles',d,'user_id=eq.'+session.userId,session.token);
        }else{
          res=await dbInsert('profiles',d,session.token);
        }
        if(Array.isArray(res)&&res[0])setMyProfile(res[0]);
        setScreen('main');
      }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
      setSaving(false);
      return;
    }

    // Falls Foto nur als Preview vorhanden aber noch nicht hochgeladen → jetzt hochladen
    let finalAvatarUrl = avatarUrl;
    if(avatarPreview&&!avatarUrl){
      try{
        const blob=await (await fetch(avatarPreview)).blob();
        const ext=blob.type.includes('png')?'png':'jpg';
        const path='avatars/'+session.userId+'.'+ext;
        const upRes=await fetch(SUPA_URL+'/storage/v1/object/'+path,{
          method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token,'Content-Type':blob.type,'x-upsert':'true'},body:blob
        });
        if(upRes.ok){
          finalAvatarUrl=SUPA_URL+'/storage/v1/object/public/'+path+'?t='+Date.now();
          setAvatarUrl(finalAvatarUrl);
        }
      }catch(e){console.error('avatar upload error',e);}
    }
    // Build profile data — only include columns that definitely exist
    const d={
      user_id:session.userId,
      name:profile.name,
      age:parseInt(profile.age)||null,
      city:profile.city,
      gym:profile.gym||null,
      height:parseInt(profile.height)||null,
      weight:parseInt(profile.weight)||null,
      weight_class:normalizeWeightClass(profile.weightClass)||null,
      style:profile.style,
      belt:profile.belt||null,
      is_coach:!!profile.isCoach,
      is_brand:false,
      coach_gym:profile.coachGym||null,
      coach_styles:profile.coachStyles||null,
      coach_experience:parseInt(profile.coachExperience)||null,
      coach_bio:profile.coachBio||null,
      coach_avatar_url:profile.coachAvatarUrl||null,
      bio:profile.bio||null,
      wins:parseInt(stats.wins)||0,
      losses:parseInt(stats.losses)||0,
      draws:parseInt(stats.draws)||0,
      ko:parseInt(stats.ko)||0,
      avatar_url:finalAvatarUrl||null,
      is_pro:profile.isPro===true,
      country:profile.country||'DE',
      gender:profile.gender||'male',
      img_pos_x:profile.imgPosX??50,
      img_pos_y:profile.imgPosY??30,
    };
    // Add optional columns only if they exist
    try{if(myLat)d.lat=myLat;}catch{}
    try{if(myLon)d.lon=myLon;}catch{}
    try{if(locationSource)d.location_source=locationSource;}catch{}
    try{if(profile.socialUrl)d.social_url=profile.socialUrl;}catch{}
    try{
      if(myProfile){
        const statsChanged=(myProfile.wins||0)!==d.wins||(myProfile.losses||0)!==d.losses||(myProfile.draws||0)!==d.draws;
        // Wer verifiziert war (z.B. ueber 'keine Kaempfe') und danach Kampfzahlen
        // auf mehr als 0 aendert, muss neu verifizieren - sonst wuerden
        // ungepruefte Bilanzen als verifiziert gelten.
        if(statsChanged&&(d.wins+d.losses+d.draws)>0&&myProfile.record_verified==='verified'){d.record_verified=null;}
        const res=await dbUpdate('profiles',d,'user_id=eq.'+session.userId,session.token);
        const wasRankOk=rankIssuesOf(myProfile).length===0;
        if(Array.isArray(res)&&res[0])setMyProfile(res[0]);
        const nowRankOk=Array.isArray(res)&&res[0]?rankIssuesOf(res[0]).length===0:false;
        showMsg(nowRankOk&&!wasRankOk?L('Gespeichert! ✓ Du erscheinst jetzt in der Rangliste 🏆', 'Saved! ✓ You now appear in the ranking 🏆', 'Enregistré ! ✓ Tu apparais maintenant dans le classement 🏆', '¡Guardado! ✓ Ahora apareces en el ranking 🏆'):'Gespeichert! ✓');
        loadAllProfiles(session);
        // Rangliste neu pruefen, falls sich Sieg/Niederlage-Werte geaendert haben -
        // benachrichtigt alle, die dadurch ueberholt wurden
        if(statsChanged){
          fetch(SUPA_URL+'/functions/v1/rank-check',{
            method:'POST',
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
          }).catch(err=>console.error('rank-check',err));
        }
      }else{
        // Upsert: falls Profil bereits existiert (doppelter user_id), updaten statt Fehler
        const upsertRes=await fetch(SUPA_URL+'/rest/v1/profiles',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=representation,resolution=merge-duplicates'},
          body:JSON.stringify(d)
        });
        const res=await upsertRes.json();
        // Sofort und deutlich melden, falls die Anfrage fehlgeschlagen ist -
        // vorher fiel das erst nach einem zweiten, oft ebenfalls
        // erfolglosen Versuch auf, und wirkte fuer Nutzer wie "der Button
        // tut einfach nichts".
        if(!upsertRes.ok){
          console.error('saveProfile upsert failed',upsertRes.status,res);
          showMsg(L('❌ Profil konnte nicht gespeichert werden: ','❌ Profile could not be saved: ','❌ Le profil n\'a pas pu être enregistré : ','❌ No se pudo guardar el perfil: ')+(res?.message||res?.error||JSON.stringify(res)).toString().slice(0,150));
          setSaving(false);
          return;
        }
        const profile_data=Array.isArray(res)?res[0]:null;
        if(profile_data&&profile_data.id){
          setMyProfile(profile_data);
          showMsg(L('Profil erstellt! 🥊', 'Profile created! 🥊', 'Profil créé! 🥊', '¡Perfil creado! 🥊'));
          // Freunde-einladen-Rabatt: falls diese Person ueber einen
          // Einladungslink kam (?ref=...), jetzt - und erst jetzt, nach
          // erfolgreich ANGELEGTEM Profil, nicht schon bei der blossen
          // Registrierung - den Freund serverseitig gutschreiben. Die
          // Edge Function prueft alles nochmal selbst nach, daher reicht
          // hier ein einfacher Aufruf ohne Warten auf das Ergebnis.
          try{
            const refCode=localStorage.getItem('fighter_ref_code');
            if(refCode&&refCode!==profile_data.id){
              fetch(SUPA_URL+'/functions/v1/credit-referral',{
                method:'POST',
                headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
                body:JSON.stringify({referrerId:refCode,newProfileId:profile_data.id,userToken:session.token})
              }).catch(err=>console.error('credit-referral',err));
            }
            localStorage.removeItem('fighter_ref_code');
          }catch(err){console.error('referral credit',err);}
          fetch(SUPA_URL+'/functions/v1/send-welcome-email',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
            body:JSON.stringify({userToken:session.token,name:profile_data.name})
          }).catch(err=>console.error('send-welcome-email',err));
          setShowFeatureTour(true);
          setScreen('main');
          loadRealFighters(session,profile_data,true);
          loadMatches(session,profile_data);
          loadGymRatings(session);
          loadFightHistory(session);
          loadDbGyms(session);
          loadWhoLikedMe(session,profile_data);
          loadAllProfiles(session);
        }else{
          // Fallback: try to load existing profile
          try{
            const existing=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=eq.'+session.userId,{
              headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
            });
            const ep=await existing.json();
            if(Array.isArray(ep)&&ep[0]){
              setMyProfile(ep[0]);
              setScreen('main');
              loadRealFighters(session,ep[0],true);
              loadMatches(session,ep[0]);
              loadGymRatings(session);loadFightHistory(session);loadDbGyms(session);loadWhoLikedMe(session,ep[0]);loadAllProfiles(session);
            }else{
              showMsg('Fehler: '+(JSON.stringify(res)||'?'));
            }
          }catch{showMsg('Netzwerkfehler');}
        }
      }
    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
    setSaving(false);
  }

  async function compressImage(file,maxSize=800,quality=0.8){
    return new Promise(resolve=>{
      const img=new window.Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>maxSize||h>maxSize){
          if(w>h){h=Math.round(h*(maxSize/w));w=maxSize;}
          else{w=Math.round(w*(maxSize/h));h=maxSize;}
        }
        const canvas=document.createElement('canvas');
        canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,w,h);
        canvas.toBlob(blob=>{
          URL.revokeObjectURL(url);
          resolve(blob||file);
        },'image/jpeg',quality);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
      img.src=url;
    });
  }

  async function handlePhoto(e){
    const file=e.target.files[0];if(!file||!session)return;
    setUploading(true);
    setAvatarPreview(URL.createObjectURL(file));
    showMsg(L('Foto wird komprimiert...', 'Compressing photo...', 'Compression de la photo...', 'Comprimiendo foto...'));
    try{
      const compressed=await compressImage(file,800,0.82);
      const sizeMB=(compressed.size/1024/1024).toFixed(1);
      const path='fighter_'+session.userId+'_'+Date.now()+'.jpg';
      const url=await uploadPhoto(compressed,path,session.token);
      if(url){setAvatarUrl(url);showMsg(L('Foto hochgeladen! (','Photo uploaded! (','Photo chargée ! (','¡Foto subida! (')+sizeMB+'MB)');}
      else showMsg('Upload fehlgeschlagen');
    }catch{showMsg('Upload fehlgeschlagen');}
    setUploading(false);
  }

  async function handleCoachAvatarUpload(e){
    const file=e.target.files[0];if(!file||!session)return;
    setUploadingCoachAvatar(true);
    setCoachAvatarPreview(URL.createObjectURL(file));
    showMsg(L('Trainer-Foto wird komprimiert...', 'Compressing coach photo...', 'Compression de la photo du coach...', 'Comprimiendo foto de entrenador...'));
    try{
      const compressed=await compressImage(file,800,0.82);
      const path='coach_'+session.userId+'_'+Date.now()+'.jpg';
      const url=await uploadPhoto(compressed,path,session.token);
      if(url){
        setCoachAvatarPreview(url);
        setProfile(p=>({...p,coachAvatarUrl:url}));
        setEditProfile(p=>({...p,coachAvatarUrl:url}));
        showMsg(L('Trainer-Foto hochgeladen!', 'Coach photo uploaded!', 'Photo du coach chargée !', '¡Foto de entrenador subida!'));
      }else showMsg('Upload fehlgeschlagen');
    }catch{showMsg('Upload fehlgeschlagen');}
    setUploadingCoachAvatar(false);
  }

  async function handleGalleryUpload(e){
    const file=e.target.files[0];if(!file||!session)return;
    if(myGallery.length>=3){showMsg(L('Maximal 3 Fotos erlaubt. Bitte zuerst eins entfernen.', 'Maximum 3 photos allowed. Please remove one first.', '3 photos maximum. Supprime-en d\'abord une.', 'Máximo 3 fotos. Elimina una primero.'));return;}
    setUploadingGallery(true);
    showMsg(L('Foto wird komprimiert...', 'Compressing photo...', 'Compression de la photo...', 'Comprimiendo foto...'));
    try{
      const compressed=await compressImage(file,1000,0.82);
      const p='gallery_'+session.userId+'_'+Date.now()+'.jpg';
      const url=await uploadPhoto(compressed,p,session.token);
      if(url){
        const updated=[...myGallery,url];
        const patchRes=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=eq.'+session.userId,{
          method:'PATCH',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
          body:JSON.stringify({gallery:updated})
        });
        if(patchRes.ok){setMyGallery(updated);showMsg(L('Foto hinzugefuegt', 'Photo added', 'Photo ajoutée', 'Foto añadida'));}
        else{showMsg(L('Foto gespeichert, aber Profil-Update fehlgeschlagen (','Photo saved, but profile update failed (','Photo enregistrée, mais la mise à jour du profil a échoué (','Foto guardada, pero falló la actualización del perfil (')+patchRes.status+')');}
      }else{showMsg('Upload fehlgeschlagen');}
    }catch(err){console.error('gallery upload',err);showMsg('Upload fehlgeschlagen');}
    setUploadingGallery(false);
  }

  async function removeGalleryPhoto(urlToRemove){
    if(!session)return;
    const updated=myGallery.filter(g=>g!==urlToRemove);
    setMyGallery(updated);
    try{
      await fetch(SUPA_URL+'/rest/v1/profiles?user_id=eq.'+session.userId,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({gallery:updated})
      });
      showMsg(L('Foto entfernt', 'Photo removed', 'Photo supprimée', 'Foto eliminada'));
    }catch(err){console.error('gallery remove',err);}
  }

  const myWeightClass=normalizeWeightClass(myProfile?.weight_class||profile?.weightClass||'');
  const myCity=myProfile?.city||profile?.city||'';
  const myBundesland=getBundesland(myCity);

  // Smart Matching — erst gleiche Stadt + Klasse, dann Bundesland, dann alle
  // SMART MATCHING — Priorität: 1=Stil+Stadt, 2=Stil+Region, 3=Stil+Land, 4=Stil, 5=Stadt, 6=Region, 7=alle
  const myStyles=(profile.style||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  function sameStyle(f){
    if(!myStyles.length)return true;
    const fStyles=(f.style||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    return fStyles.some(s=>myStyles.includes(s));
  }

  function relatedStyle(f){
    if(sameStyle(f))return false; // gleicher Stil ist schon abgedeckt
    if(!myStyles.length)return false;
    // Stil-Gruppen: verwandte Kampfsportarten
    const GROUPS=[
      ['boxing','kickboxing','muay thai','savate'],           // Striking
      ['bjj','grappling','wrestling','judo','sambo'],         // Grappling/Ground
      ['mma','boxing','kickboxing','muay thai','bjj','grappling','wrestling','judo','sambo'], // MMA = alles verwandt
      ['karate','taekwondo','kung fu','kickboxing'],          // Traditionell/Treten
    ];
    const fStyles=(f.style||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    return GROUPS.some(group=>
      myStyles.some(ms=>group.includes(ms)) &&
      fStyles.some(fs=>group.includes(fs))
    );
  }
  function sameGender(f){
    if(!profile.gender||profile.gender==='other')return true;
    if(!f.gender||f.gender==='other')return true;
    return f.gender===profile.gender;
  }
  // ── PERFEKTIONIERTES MATCHING SYSTEM ──
  // In useMemo verpackt: diese aufwendige Berechnung (Distanz, Sportart,
  // Gewicht, Erfahrung fuer jeden Kandidaten) lief bisher bei JEDER
  // einzigen App-Interaktion neu, auch bei voellig unabhaengigen
  // Aenderungen (z.B. eine Nachricht tippen). Jetzt laeuft sie nur noch
  // neu, wenn sich wirklich etwas Relevantes fuers Matching geaendert hat.
  const matchTierRef=useRef('minimal');
  const filteredCards=React.useMemo(()=>{
  const myIsPro=myProfile?.is_pro===true||profile.isPro===true;
  const myWC=normalizeWeightClass(myProfile?.weight_class||profile.weightClass||'').split(' (')[0].trim();

  // ── AUTOMATISCHE PROFIL-FILTER (kein manuelles Einstellen noetig) ──
  // Die App leitet aus dem eigenen Profil ab, was ein sinnvoller Alters-,
  // Gewichts-, Sportart-, Umkreis- und Erfahrungs-Rahmen waere, und
  // lockert automatisch, falls dabei zu wenige Kandidaten uebrig bleiben
  // (Kaskade: erst genau passend, dann breiter, dann nur noch Basis-
  // Anforderungen wie ein vorhandenes Foto).
  const myAgeForFilter=parseInt(myProfile?.age||profile?.age||0);
  const myWeightForFilter=parseInt(myProfile?.weight||profile?.weight||0);

  const candidatesBase=cards
    .filter(f=>!blockedUsers.includes(f.id))
    .filter(f=>!f.banned)
    // Geschlecht: harter Ausschluss, kein "spaeter vielleicht" mehr. Frauen
    // sehen ausschliesslich Frauen, Maenner ausschliesslich Maenner. Wer
    // "other"/kein Geschlecht angegeben hat, wird nicht ausgeschlossen (weder
    // als Betrachter noch als Kandidat), da hier keine sinnvolle Regel
    // existiert.
    .filter(f=>{
      const myGenderFilter=profile.gender||myProfile?.gender||'male';
      const fGenderFilter=f.gender||'male';
      if(myGenderFilter==='other'||fGenderFilter==='other')return true;
      return fGenderFilter===myGenderFilter;
    })
    // Land-Filter bleibt manuell (Mein Land/Weltweit-Umschalter)
    .filter(f=>{
      if(countryFilter==='world')return true;
      if(!f.country||f.country==='OTHER')return true;
      return f.country===(profile.country||myProfile?.country||'DE');
    });

  const candidateFlags=candidatesBase.map(f=>{
    const fAge=parseInt(f.age)||0;
    const fWeight=parseInt(f.weight)||0;
    const fDist=(myLat&&myLon&&f.lat&&f.lon)
      ?getDistanceKmCoords(myLat,myLon,f.lat,f.lon)
      :getDistanceKm(myCity,f.city||'');
    const fSameStyle=sameStyle(f);
    const fRelatedStyle=relatedStyle(f);
    const fActive=f.last_seen&&(Date.now()-new Date(f.last_seen).getTime())<5184000000; // 60 Tage
    const ageOk10=!myAgeForFilter||!fAge||Math.abs(fAge-myAgeForFilter)<=10;
    const ageOk20=!myAgeForFilter||!fAge||Math.abs(fAge-myAgeForFilter)<=20;
    const weightOk15=!myWeightForFilter||!fWeight||Math.abs(fWeight-myWeightForFilter)<=15;
    const weightOk30=!myWeightForFilter||!fWeight||Math.abs(fWeight-myWeightForFilter)<=30;
    const styleOkStrict=fSameStyle||fRelatedStyle||!f.style;
    // Pro/Amateur-Status und verifizierter Rekord sind jetzt reine
    // Score-Bonuspunkte (siehe weiter unten), keine harten Ausschluss-
    // Kriterien mehr - vorher wurde z.B. ein verifizierter Nutzer fast
    // immer in die lockerste Stufe gedraengt, weil es zu wenige andere
    // Verifizierte gab, obwohl sonst gute Treffer verfuegbar waeren.
    return {
      profile:f,
      hasPhoto:!!f.avatar_url,
      passesStrict:ageOk10&&weightOk15&&styleOkStrict&&fDist<=250&&fActive,
      passesRelaxed:ageOk20&&weightOk30&&fDist<=1000,
    };
  });

  const {results:autoFiltered,tier:matchTier}=autoFilterCandidates(candidateFlags);
  matchTierRef.current=matchTier;
  const filteredCardsBase=autoFiltered.map(c=>c.profile);

  const filteredCardsInner=filteredCardsBase
    .map(f=>{
      // ── DISTANZ ──
      // GPS wenn beide haben, sonst Koordinaten-Tabelle, sonst Städte-Name
      const dist=(myLat&&myLon&&f.lat&&f.lon)
        ?getDistanceKmCoords(myLat,myLon,f.lat,f.lon)
        :getDistanceKm(myCity,f.city||'');

      // ── ÜBEREINSTIMMUNGS-FLAGS ──
      const hasGPS=myLat&&myLon&&f.lat&&f.lon;
      const sameCityBool=hasGPS?dist<=15:((f.city||'').toLowerCase().trim()===(myCity||'').toLowerCase().trim()&&myCity!=='');
      const sameStyleBool=sameStyle(f);
      const sameGenderBool=sameGender(f);
      const fWC=normalizeWeightClass(f.weight_class||'').split(' (')[0].trim();
      const sameWCBool=!!myWC&&!!fWC&&myWC===fWC;
      const sameProBool=!!(f.is_pro===true)===myIsPro; // beide Pro oder beide Amateur

      // ── SCORE SYSTEM (niedriger = besser) ──
      const relatedStyleBool=relatedStyle(f);
      // Geschlecht-Priorität: gleiches Geschlecht zuerst
      const myGender=profile.gender||myProfile?.gender||'male';
      const fGender=f.gender||'male';
      const sameGenderPriority=(myGender!=='other'&&fGender!=='other'&&myGender===fGender);
      // Geschlecht-Offset: gleiches Geschlecht bekommt Score 0-14, anderes Geschlecht 15-29
      const genderOffset=sameGenderPriority?0:15;

      // STUFENLOSE ENTFERNUNGS-FORMEL statt fester Stufen: die echte
      // Entfernung in km fliesst DIREKT ein, keine kuenstlichen Spruenge
      // zwischen "Stadt"/"Naehe"/"Region" mehr. Sportart wirkt als
      // Kilometer-Aequivalent-Aufschlag: verwandte Sportart entspricht
      // ca. 20km Nachteil, komplett andere Sportart ca. 65km Nachteil.
      let score=dist;
      if(!sameStyleBool){
        score+=relatedStyleBool?20:65;
      }
      // Geschlecht-Offset: dominiert IMMER ueber Entfernung/Sportart
      score=score+(sameGenderPriority?0:100000);

      // ── BONUS-PUNKTE (verbessern Score) ──
      // Gewicht-Kompatibilität (wichtigster Bonus für echte Kämpfe)
      const myWeight=parseInt(myProfile?.weight||profile?.weight||0);
      const fWeight=parseInt(f.weight||0);
      const weightDiff=myWeight&&fWeight?Math.abs(myWeight-fWeight):999;
      if(weightDiff<=3)       score-=0.5;  // fast gleich (±3kg) — ideal
      else if(weightDiff<=7)  score-=0.35; // sehr nah (±7kg)
      else if(weightDiff<=12) score-=0.2;  // nah (±12kg)
      else if(weightDiff<=20) score-=0.05; // noch ok (±20kg)
      // Erfahrungs-Bonus (Gesamtzahl Kaempfe) - aehnlich erfahrene Fighter
      // werden bevorzugt zusammengebracht (staerker als Alter, schwaecher
      // als Gewicht - Sicherheit/Gewichtsklasse bleibt wichtigstes Kriterium)
      const myTotalFights=(parseInt(myProfile?.wins||profile?.wins||0))+(parseInt(myProfile?.losses||profile?.losses||0))+(parseInt(myProfile?.draws||profile?.draws||0));
      const fTotalFights=(parseInt(f.wins||0))+(parseInt(f.losses||0))+(parseInt(f.draws||0));
      const experienceDiff=Math.abs(myTotalFights-fTotalFights);
      if(experienceDiff<=2)       score-=0.15; // sehr aehnliche Erfahrung
      else if(experienceDiff<=5)  score-=0.1;
      else if(experienceDiff<=10) score-=0.05;
      // Alter-Bonus (schwaecher als Gewicht, damit Gewicht vor Alter zaehlt)
      const myAge=parseInt(myProfile?.age||profile?.age||0);
      const fAge=parseInt(f.age||0);
      const ageDiff=myAge&&fAge?Math.abs(myAge-fAge):999;
      if(ageDiff<=2)       score-=0.04; // fast gleiches Alter
      else if(ageDiff<=5)  score-=0.025;
      else if(ageDiff<=10) score-=0.01;
      // Gleiche Gewichtsklasse (zusätzlich zum Gewicht)
      if(sameWCBool) score-=0.3;
      // Gleicher Pro/Amateur Status: -0.2
      if(sameProBool) score-=0.2;
      // Gleiches Geschlecht: -0.15
      if(sameGenderBool) score-=0.15;
      // Profil vollständig (hat Foto): -0.1
      if(f.avatar_url) score-=0.1;
      // Aktiv in letzten 7 Tagen: -0.2
      if(f.last_seen&&(Date.now()-new Date(f.last_seen).getTime())<604800000) score-=0.2;
      // Gleiches Gym - starkes Signal, da ein Treffen ohne jede Logistik moeglich ist
      const myGym=(myProfile?.gym||profile?.gym||'').toLowerCase().trim();
      const fGym=(f.gym||'').toLowerCase().trim();
      if(myGym&&fGym&&myGym===fGym) score-=25;
      // Verifizierter Kampfrekord - vertrauenswuerdiger Gegner
      if(f.record_verified==='verified') score-=0.3;

      return{
        ...f,
        _score:score,
        _dist:dist,
        _sameStyle:sameStyleBool,
        _sameCity:sameCityBool,
        _sameWC:sameWCBool,
        _sameProStatus:sameProBool,
      };
    })
    .sort((a,b)=>{
      // Primär: Score — ABSTEIGEND sortiert (schlechtester Match zuerst,
      // bester Match zuletzt), da 'top' das LETZTE Element der Liste ist
      // und beim Swipen jeweils von hinten entfernt wird. So wird stets
      // der aktuell beste verbleibende Match angezeigt.
      const scoreDiff=b._score-a._score;
      if(Math.abs(scoreDiff)>0.01)return scoreDiff;
      // Sekundär: Distanz (näher = weiter hinten = wird zuerst gezeigt)
      return (b._dist||9999)-(a._dist||9999);
    });
  return filteredCardsInner;
  },[cards,blockedUsers,countryFilter,profile,myProfile,myLat,myLon,myCity,myBundesland]);
  // Leichte, zusaetzliche Filterung NACH der teuren Berechnung: entfernt
  // bereits in dieser Sitzung geswipte Karten, ohne die aufwendige
  // Distanz-/Sportart-Berechnung erneut laufen zu lassen. Vorher stand
  // swipeVersion in der Abhaengigkeitsliste der teuren Berechnung selbst,
  // wodurch bei JEDEM Swipe die komplette Pipeline neu rechnete - das hat
  // die Swipes spuerbar traege gemacht. Dieser Schritt hier ist dagegen
  // nur ein einfacher Array-Filter, kostet praktisch nichts.
  const visibleCards=React.useMemo(()=>{
    if(sessionSwipedRef.current.size===0)return filteredCards;
    return filteredCards.filter(f=>!sessionSwipedRef.current.has(f.id));
  },[filteredCards,swipeVersion]);
  const top=visibleCards[visibleCards.length-1];
  const lastTapRef=useRef(0);
  function dragStart(e){
    if(e.touches)e.preventDefault();
    const p=e.touches&&e.touches[0]?e.touches[0]:e;
    if(!p||p.clientX===undefined)return;
    setStart({x:p.clientX,y:p.clientY});
    dragVelocityRef.current={x:0,time:Date.now()};
    setDrag(true);
  }
  function dragMove(e){
    if(!drag)return;
    if(e.touches)e.preventDefault();
    const p=e.touches&&e.touches[0]?e.touches[0]:e;
    if(!p||p.clientX===undefined)return;
    const dx=p.clientX-start.x;
    const dy=p.clientY-start.y;
    // Immer horizontal updaten - auch bei leicht schrägen Swipes
    // Keine "Totzone" mehr - die Karte folgt dem Finger sofort ab der
    // ersten Bewegung, statt erst nach 10px ploetzlich "aufzuwachen". Das
    // hatte sich wie ein kurzes Haengenbleiben/Kleben am Anfang angefuehlt.
    setOffset({x:dx,y:dy*0.2});
    dragVelocityRef.current={x:dx,time:Date.now()};
  }
  function dragEnd(e){
    if(!drag)return;
    setDrag(false);
    // Geschwindigkeit der letzten Bewegung berechnen (px pro Millisekunde) -
    // damit auch ein schneller, kurzer "Wisch" zuverlaessig als Swipe zaehlt,
    // nicht nur eine grosse zurueckgelegte Distanz. Ohne das musste man die
    // Karte "brav" bis zur Schwelle ziehen, sonst schnappte sie zurueck -
    // das fuehlte sich unnoetig zoegerlich an.
    const now=Date.now();
    const dt=Math.max(now-dragVelocityRef.current.time,1);
    const velocity=(offset.x-dragVelocityRef.current.x)/dt; // px/ms
    const isFastFlick=Math.abs(velocity)>0.5&&Math.abs(offset.x)>15;
    if(offset.x>SW||(isFastFlick&&offset.x>0))doSwipe('ch');
    else if(offset.x<-SW||(isFastFlick&&offset.x<0))doSwipe('de');
    else setOffset({x:0,y:0});
  }

  async function undoSwipe(){
    if(!lastSwiped||!session||!myProfile)return;
    const {profile} = lastSwiped;
    // Swipe aus DB löschen
    try{
      await fetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+myProfile.id+'&target_id=eq.'+profile.id,{
        method:'DELETE',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
    }catch{}
    // Karte wieder hinzufügen
    setCards(prev=>[...prev, profile]);
    setLastSwiped(null);
    showMsg(L('↩️ Rückgängig!', '↩️ Undone!', '↩️ Annulé !', '↩️ ¡Deshecho!'));
  }

  async function doSwipe(dir){
    if(!top)return;
    setLastAct(dir);setOffset({x:0,y:0});
    if(dir==='ch'){
      setSwStats(s=>({...s,ch:s.ch+1}));
      setLastSwiped({profile:top,dir:'like'});
      setRecentSwiped(prev=>[{profile:top,dir:'like'},...prev].slice(0,4));
      sessionSwipedRef.current.add(top.id);
      setSwipeVersion(v=>v+1);
      // Marken-Konten swipen normal (Animation, naechste Karte bleiben
      // gleich), aber nichts wird gespeichert und es entstehen nie echte
      // Matches.
      if(session&&myProfile&&!myProfile.is_brand&&!String(top.id).startsWith('demo_')){
        try{
          await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'like'},session.token);
          const mutual=await dbSelect('swipes','swiper_id=eq.'+top.id+'&target_id=eq.'+myProfile.id+'&direction=eq.like',session.token);
          if(Array.isArray(mutual)&&mutual.length>0){
            // Echtes Match — in DB speichern und Match-Screen zeigen
            // Match nur einmal anlegen (ON CONFLICT ignorieren)
            try{
              await fetch(SUPA_URL+'/rest/v1/matches',{
                method:'POST',
                headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'resolution=ignore-duplicates,return=minimal'},
                body:JSON.stringify({profile_a_id:myProfile.id,profile_b_id:top.id})
              });
            }catch{}
            sendLocalNotification('🥊 ITS A MATCH!',top.name+' hat dich auch geliket!');
            // Push an den anderen Matching-Partner schicken
            (async()=>{
              try{
                // Token wird jetzt serverseitig in send-push nachgeschlagen -
                // der Client muss den Push-Token der anderen Person nie mehr
                // direkt auslesen
                if(top.user_id){
                  const myName=(myProfile&&myProfile.name)||'Jemand';
                  const r=await fetch(SUPA_URL+'/functions/v1/send-push',{
                    method:'POST',
                    headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
                    body:JSON.stringify({recipientUserId:top.user_id,title:'🥊 Neues Match!',body:myName+' hat dich auch geliket!'})
                  });
                  const d=await r.json().catch(()=>({}));
                  // TEMPORAERE DIAGNOSE: zeigt das echte Ergebnis, damit wir
                  // sehen was bei send-push passiert - kann spaeter wieder raus
                }else{
                }
              }catch(err){console.error('match push',err);}
            })();
            setTimeout(()=>{setMatched(top);loadMatches(session,myProfile);},300);
          }else{
            // Noch kein gegenseitiges Match - trotzdem den anderen benachrichtigen,
            // dass sich jemand fuer ihn interessiert (Name bewusst nicht verraten,
            // das motiviert dazu, in der App nachzuschauen, wer es war)
            (async()=>{
              try{
                if(top.user_id){
                  await fetch(SUPA_URL+'/functions/v1/send-push',{
                    method:'POST',
                    headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
                    body:JSON.stringify({recipientUserId:top.user_id,title:'👀 Jemand interessiert sich für dich!',body:'Schau nach, wer dich geliket hat 🥊',data:{type:'like'}})
                  });
                }
              }catch(err){console.error('like push',err);}
            })();
          }
          // Keine fake Matches mehr
        }catch{}
      }
    }else{
      setSwStats(s=>({...s,de:s.de+1}));
      setLastSwiped({profile:top,dir:'pass'});
      setRecentSwiped(prev=>[{profile:top,dir:'pass'},...prev].slice(0,4));
      sessionSwipedRef.current.add(top.id);
      setSwipeVersion(v=>v+1);
      if(session&&myProfile&&!myProfile.is_brand&&!String(top.id).startsWith('demo_')){try{await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'pass'},session.token);}catch{}}
    }
    setTimeout(()=>{
      const swipedId=top?.id;
      setCards(prev=>swipedId?prev.filter(c=>c.id!==swipedId):prev.slice(0,-1));
      setLastAct(null);
    },260);
  }

  const rot=(offset.x/14).toFixed(1);
  const fop=Math.min(offset.x/SW,1);
  const pop=Math.min(-offset.x/SW,1);
  const cStyle=drag?{transform:`translateX(${offset.x}px) translateY(${offset.y*0.25}px) rotate(${rot}deg)`,transition:'none',cursor:'grabbing'}
    :lastAct==='ch'?{transform:'translateX(140%) rotate(18deg)',transition:'transform 0.26s ease'}
    :lastAct==='de'?{transform:'translateX(-140%) rotate(-18deg)',transition:'transform 0.26s ease'}
    // Vorher eine Kurve, die bewusst ueberschwingt (Bounce-Effekt) - das
    // hatte sich "wabbelig"/unsauber angefuehlt. Jetzt ein sauberes,
    // schnelles Ease-Out ohne Ueberschwingen.
    :{transform:'translateX(0) rotate(0deg)',transition:'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)'};

  function canGo(){
    if(step===1)return !!(profile.name&&profile.age&&profile.city&&(avatarPreview||avatarUrl)); // Profilbild wieder Pflicht
    if(step===2)return !!(profile.style);
    if(step===3)return true; // Alles optional auf Step 3
    if(step===4)return !!(profile.coachGym&&profile.coachStyles); // Trainer-Pflichtfelder
    return true;
  }
  const tf=stats.wins+stats.losses+stats.draws;
  const wr=tf>0?Math.round((stats.wins/tf)*100):0;
  const kr=stats.wins>0?Math.round((stats.ko/stats.wins)*100):0;
  const allF=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weight_class:profile.weightClass,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'',accent:RED,isMe:true,avatar_url:avatarUrl}].concat(FIGHTERS):FIGHTERS;
  // Rangliste: ALLE angemeldeten User aus Datenbank
  // In useMemo verpackt - lief bisher bei jeder App-Interaktion neu,
  // jetzt nur noch wenn sich Rangliste-relevante Daten wirklich aendern.
  // userOnly als EIGENES useMemo auf Komponenten-Ebene: Die Memoisierung hatte
  // diese Liste in die ranked-Berechnung hineinverschoben — die "Mein Platz"-
  // Anzeige weiter unten griff aber von außen darauf zu -> ReferenceError beim
  // Rendern der Rangliste -> schwarzer Bildschirm beim App-Start, wenn die
  // Rangliste der zuletzt geöffnete Tab war.
  const userOnly=React.useMemo(()=>{
    const me=profile.name?[{id:0,name:profile.name,city:profile.city,gym:profile.gym,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'',accent:RED,isMe:true,avatar_url:avatarUrl,is_pro:profile.isPro===true,country:profile.country||'DE',belt:profile.belt||myProfile?.belt||null}]:[];
    if(allProfiles.length>0){
      const others=allProfiles.filter(p=>p.id!==myProfile?.id&&!p.banned).map(p=>({
        ...p,
        wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0,
        accent:p.accent||RED,isMe:false
      }));
      return [...me,...others];
    }
    return me;
  },[profile,stats,avatarUrl,allProfiles,myProfile]);
  const mainScrollRef=React.useRef(null);
  const savedRankScrollRef=React.useRef(0);
  const savedGymScrollRef=React.useRef(0);
  const ranked=React.useMemo(()=>{
  const myGender=profile.gender||myProfile?.gender||'male';
  const myCountry=profile.country||myProfile?.country||null;
  return rankMode==='trainer'
    ?[]
    :[...userOnly]
      .filter(f=>{
        const fGender=f.isMe?myGender:(f.gender||'male');
        if(!fGender||fGender==='other')return true;
        return fGender===myGender;
      })
      .filter(f=>{
        const fCountry=f.isMe?myCountry:(f.country||null);
        if(!fCountry)return false;
        if(countryFilter==='world')return true;
        return myCountry&&fCountry===myCountry;
      })
      .filter(f=>{
        if(rankMode==='pro') return f.isMe?(profile.isPro===true):(f.is_pro===true);
        if(rankMode==='user') return f.isMe?(profile.isPro!==true):(f.is_pro!==true);
        return true;
      })
      // Ohne Gym kein Rang.
      .filter(f=>((f.isMe?(profile.gym||myProfile?.gym):f.gym)||'').trim().length>0)
      // 0 Kaempfe: erst in der Rangliste, wenn der Rekord verifiziert ist
      // (ueber "Ich habe noch keine Kaempfe" oder Nachweis).
      .filter(f=>{
        if((f.wins||0)+(f.losses||0)+(f.draws||0)>0)return true;
        return (f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified';
      })
      // Alle Fighter stehen in der Rangliste. Verifizierte stehen aber immer
      // vor nicht verifizierten (siehe Sortierung unten) - das verhindert,
      // dass erfundene Bilanzen vor geprueften stehen.
      .filter(f=>rankF==='All'||!f.style||(f.style&&(f.style===rankF||f.style.includes(rankF))))
      .sort((a,b)=>{
        // Guertelfarbe (nur bei BJJ/Karate/Taekwondo/Judo relevant) zaehlt
        // als Bonus mit rein - Weiss=0 bis Schwarz=7 Punkte. Bewusst kein
        // Ersatz fuer die Kampf-Bilanz, sondern ein zusaetzlicher Faktor:
        // ein Schwarzgurt mit aehnlicher Bilanz steht leicht vor jemandem
        // ohne Gurt oder mit niedrigerem Rang.
        const beltScore=f=>{const i=BELT_RANKS.indexOf(f.belt);return i>=0?i:0;};
        const scoreA=(a.wins*3-a.losses*2+a.draws)+beltScore(a);
        const scoreB=(b.wins*3-b.losses*2+b.draws)+beltScore(b);
        // Stufe 2 = Kampfrekord UND Gym-Code verifiziert, 1 = nur Kampfrekord, 0 = Rest
        const verLevel=f=>{
          const rec=(f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified';
          const gym=f.isMe?(myProfile?.gym_verified===true||!!gymVerified):f.gym_verified===true;
          return rec&&gym?2:rec?1:0;
        };
        const verA=verLevel(a);
        const verB=verLevel(b);
        if(verA!==verB)return verB-verA;
        return scoreB-scoreA;
      });
  },[userOnly,profile,myProfile,rankMode,rankF,countryFilter,gymVerified]);
  const trStyles=['All','Boxing','MMA','Muay Thai','BJJ'];
  const filteredT=TRAINERS.filter(tr=>trainerF==='All'||tr.style.includes(trainerF)).sort((a,b)=>b.rating-a.rating);





  // Fight history für viewProfile laden (MUSS vor frühen Returns stehen!)
  useEffect(()=>{
    if(!viewProfile||!session)return;
    setViewProfileHistory([]);
    fetch(SUPA_URL+'/rest/v1/fight_history?user_id=eq.'+viewProfile.id+'&order=created_at.desc&limit=10',{
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
    }).then(r=>r.json()).then(data=>{
      if(Array.isArray(data))setViewProfileHistory(data);
    }).catch(()=>{});
  },[viewProfile?.id]);

  // Volles Profil nachladen: Listen und Karten sind schlank (ohne Bio,
  // Galerie, Link ...). Beim Oeffnen eines Profils wird der eine volle
  // Datensatz geholt und eingemischt - egal von wo das Profil geoeffnet wurde.
  useEffect(()=>{
    if(!viewProfile||!session||typeof viewProfile.id!=='string')return;
    const pid=viewProfile.id;
    let cancelled=false;
    fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+pid+'&select=*',{
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
    }).then(r=>r.ok?r.json():null).then(d=>{
      if(cancelled||!Array.isArray(d)||!d[0])return;
      setViewProfile(v=>mergeProfileDetail(v,d[0],pid));
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[viewProfile?.id]);

  // Verifizierungsstatus des angesehenen Profils (eigener Abruf, bricht nichts wenn Spalte fehlt)
  useEffect(()=>{
    setViewProfileVer(null);
    if(!viewProfile||!session)return;
    const pid=viewProfile.id;
    fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+pid+'&select=record_verified,gym_verified,gym_verified_name',{
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
    }).then(r=>r.json()).then(data=>{
      if(Array.isArray(data)&&data[0])setViewProfileVer({id:pid,...data[0]});
    }).catch(()=>{});
  },[viewProfile?.id]);

  function findGymByName(name){
    const nm=(name||'').trim().toLowerCase();
    if(!nm)return null;
    const hard=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(gx=>({...gx,ct}))).find(gx=>(gx.name||'').trim().toLowerCase()===nm);
    const db=dbGyms.find(dg=>(dg.name||'').trim().toLowerCase()===nm);
    return hard||db||null;
  }

  // Gym eines Kaempfers per Name oeffnen (Infos + Rezensionen), Profil bleibt darunter
  function openGymByName(name){
    const base=findGymByName(name);
    if(!base){showMsg(L('Zu diesem Gym gibt es noch keine Seite.', 'There is no page for this gym yet.', 'Il n\'y a pas encore de page pour cette salle.', 'Aún no hay página para este gimnasio.'));return;}
    setViewGym({gym:{styles:[],...base,city:base.city||base.ct||'',members:base.members||0,rating:base.rating||0,styles:base.styles||[base.style||L('Kampfsport', 'Combat sports', 'Sports de combat', 'Deportes de combate')],address:base.address||base.city||'',desc:base.desc||base.description||'',street:base.street||base.address||'',zip:base.zip||'',founded:base.founded||''},key:(base.city||base.ct||'')+'-'+base.name});
  }

  if(viewGym)return(<><style>{css}</style><GymDetailScreen gym={viewGym.gym} gymKey={viewGym.key} gymRatings={gymRatings} gymLogos={gymLogos} isAdmin={isAdmin} session={session} myProfile={myProfile} onGymUpdate={async()=>{await loadDbGyms(session);await loadGymLogos();}} rateGym={(k,s)=>{rateGym(k,s);}} onClose={()=>setViewGym(null)} darkMode={darkMode===true}/></>);

  // "&&!viewProfile": wenn man von dieser Liste aus ein Profil oeffnet,
  // bleibt whoLikedTab bewusst weiter true (siehe die beiden Klicks unten,
  // die es NICHT mehr auf false setzen) - sonst landet man nach dem
  // Schliessen des Profils auf dem normalen Haupt-Tab statt wieder hier.
  if(whoLikedTab&&!viewProfile)return(
    <div style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:darkMode?'#0d0d0d':'#f5f5f7',display:'flex',flexDirection:'column'}}> 
      <style>{css}</style>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
        <button onClick={()=>setWhoLikedTab(false)} style={{background:'none',border:'none',color:darkMode?'#fff':'#1a1a1a',fontSize:20,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
        <div>
          <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>{t.interestTitle}</div>
          <div style={{color:'#aaa',fontSize:11}}>{whoLikedMe.length} {t.interestSub}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
        {whoLikedMe.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:darkMode?'#555':'#bbb'}}>
            <div style={{fontSize:48,marginBottom:12}}>🥊</div>
            <div style={{fontSize:14}}>{t.noOneLiked}</div>
            <div style={{fontSize:12,marginTop:6}}>{t.keepSwiping}</div>
          </div>
        ):whoLikedMe.map((p,i)=>(
          <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px'}}>
              <div onClick={()=>{setViewProfile(p);}} style={{width:54,height:54,borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',border:'2px solid '+RED+'44'}}>
                {p.avatar_url?<img loading="lazy" src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{width:'100%',height:'100%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🥊</div>}
              </div>
              <div style={{flex:1}} onClick={()=>{setViewProfile(p);}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15,cursor:'pointer'}}>{p.name}</div>
                <div style={{color:RED,fontSize:12,marginTop:1}}>{p.style} · {p.city}</div>
                <div style={{color:darkMode?'#666':'#aaa',fontSize:11,marginTop:2}}>{p.wins||0}S {p.losses||0}N {p.draws||0}U</div>
              </div>
              <button onClick={async()=>{
                // Zurücklieken — Match erstellen
                try{
                  await dbInsert('swipes',{swiper_id:myProfile.id,target_id:p.id,direction:'like'},session.token);
                  await fetch(SUPA_URL+'/rest/v1/matches',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({profile_a_id:myProfile.id,profile_b_id:p.id})});
                  setWhoLikedMe(prev=>prev.filter(x=>x.id!==p.id));
                  setMatched(p);
                  setWhoLikedTab(false);
                  loadMatches(session,myProfile);
                  loadWhoLikedMe(session,myProfile);
                  sendLocalNotification('🥊 MATCH!',p.name+L(' — ihr könnt jetzt chatten!',' — you can chat now!',' — vous pouvez discuter maintenant !',' — ¡ya podéis chatear!'));
                }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
              }} style={{background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',borderRadius:10,padding:'10px 14px',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                ⚔️ MATCH
              </button>
              <button onClick={async()=>{
                // Entfernen - kein Match, zaehlt wie ein normales Wegwischen
                try{
                  await dbInsert('swipes',{swiper_id:myProfile.id,target_id:p.id,direction:'pass'},session.token);
                  setWhoLikedMe(prev=>prev.filter(x=>x.id!==p.id));
                }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
              }} style={{background:'none',border:'1px solid '+(darkMode?'#333':'#ddd'),borderRadius:10,padding:'10px 12px',color:darkMode?'#777':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if(viewProfile)return(
    <div style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:darkMode?'#0d0d0d':'#f5f5f7',display:'flex',flexDirection:'column'}}>
      <style>{css}</style>
      <div style={{position:'relative',width:'100%',height:340,overflow:'hidden',flexShrink:0}}>
        {(viewProfile.is_coach&&viewProfile.coach_avatar_url?viewProfile.coach_avatar_url:viewProfile.avatar_url)
          ?<img loading="lazy" src={viewProfile.is_coach&&viewProfile.coach_avatar_url?viewProfile.coach_avatar_url:viewProfile.avatar_url} onClick={()=>setLightboxImg(viewProfile.is_coach&&viewProfile.coach_avatar_url?viewProfile.coach_avatar_url:viewProfile.avatar_url)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:(viewProfile.img_pos_x||50)+'% '+(viewProfile.img_pos_y||30)+'%',cursor:'zoom-in'}} alt=''/>
          :<div style={{width:'100%',height:'100%',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:80}}>🥊</div>}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.75) 100%)'}}/>
        <button onClick={()=>{setViewProfile(null);}} style={{position:'absolute',top:'calc(14px + env(safe-area-inset-top))',left:14,background:'rgba(0,0,0,0.45)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700,borderRadius:8,padding:'4px 12px'}}>{t.back}</button>
        <div style={{position:'absolute',bottom:16,left:16,right:16}}>
          <div className='rj' style={{color:'#fff',fontSize:28,letterSpacing:2,lineHeight:1}}>{viewProfile.name}</div>
          {viewProfileVer&&viewProfileVer.id===viewProfile.id&&viewProfileVer.record_verified==='verified'&&viewProfileVer.gym_verified===true&&(
            <div style={{display:'inline-block',marginTop:6,background:'rgba(39,174,96,0.9)',color:'#fff',fontSize:11,fontWeight:700,letterSpacing:1,borderRadius:6,padding:'3px 8px'}}>✓ VERIFIZIERT{viewProfileVer.gym_verified_name?' · '+viewProfileVer.gym_verified_name:''}</div>
          )}
          {viewProfile.last_seen&&<div style={{color:'rgba(255,255,255,0.65)',fontSize:11,marginTop:3}}>{getLastSeen(viewProfile.last_seen)}</div>}
          <div style={{color:'#ff6b6b',fontSize:12,fontWeight:700,marginTop:4}}>{viewProfile.style} · {viewProfile.city}</div>
          {viewProfile.bio&&<div style={{color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:4,fontStyle:'italic'}}>'{viewProfile.bio}'</div>}
          {viewProfile.social_url&&(
            <div onClick={()=>window.open(viewProfile.social_url.startsWith('http')?viewProfile.social_url:'https://'+viewProfile.social_url,'_blank')} style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',marginTop:4,cursor:'pointer'}}>
              <span style={{fontSize:12}}>{viewProfile.social_url.includes('instagram')?'📸':viewProfile.social_url.includes('youtube')?'▶️':'🔗'}</span>
              <span style={{color:'rgba(255,255,255,0.8)',fontSize:11}}>{viewProfile.social_url.replace('https://','').replace('http://','').split('/')[0]}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{padding:'12px',maxWidth:420,margin:'0 auto',width:'100%'}}>
        {viewProfile.gallery&&(Array.isArray(viewProfile.gallery)?viewProfile.gallery:[]).length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{color:darkMode?'#888':'#999',fontSize:10,letterSpacing:1,marginBottom:6,fontWeight:600}}>{L('📸 FOTOS', '📸 PHOTOS', '📸 PHOTOS', '📸 FOTOS')}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
              {(Array.isArray(viewProfile.gallery)?viewProfile.gallery:[]).slice(0,3).map((g,i)=>(
                <div key={i} style={{aspectRatio:'1/1',borderRadius:11,overflow:'hidden',background:darkMode?'#1a1a1a':'#f0f0f0',border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <img loading="lazy" src={g} alt='' onClick={()=>setLightboxImg(g)} style={{width:'100%',height:'100%',objectFit:'contain',cursor:'zoom-in'}}/>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
          {[[L('SIEGE', 'WINS', 'VICTOIRES', 'VICTORIAS'),viewProfile.wins||0,'#27ae60'],[L('NIEDER', 'LOSSES', 'DÉFAITES', 'DERROTAS'),viewProfile.losses||0,RED],[L('UNENTSCH', 'DRAWS', 'NULS', 'EMPATES'),viewProfile.draws||0,'#d4a017'],['KOs',viewProfile.ko||0,RED]].map(([label,val,color])=>(
            <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 4px',textAlign:'center',border:'1px solid '+color+'33'}}>
              <div className='rj' style={{color:color,fontSize:22}}>{val}</div>
              <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {[[L('GEWICHTSKLASSE', 'WEIGHT CLASS', 'CATÉGORIE DE POIDS', 'CATEGORÍA DE PESO'),viewProfile.weight_class||'-','#2980b9'],[L('GYM', 'GYM', 'SALLE', 'GIMNASIO'),viewProfile.gym||'-','#8e44ad'],[L('GRÖSSE', 'HEIGHT', 'TAILLE', 'ALTURA'),viewProfile.height?(viewProfile.height+'cm'):'-','#27ae60'],[L('GEWICHT', 'WEIGHT', 'POIDS', 'PESO'),viewProfile.weight?(viewProfile.weight+'kg'):'-','#e67e22'],...(viewProfile.belt?[[L('GÜRTELRANG', 'BELT RANK', 'GRADE DE CEINTURE', 'GRADO DE CINTURÓN'),viewProfile.belt,'#d4a017']]:[])].map(([label,val,color])=>(
            <div key={label} onClick={color==='#8e44ad'&&val!=='-'?()=>openGymByName(val):undefined} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 12px',border:'1px solid '+color+(color==='#8e44ad'&&val!=='-'?'88':'22'),cursor:color==='#8e44ad'&&val!=='-'?'pointer':'default'}}>
              <div style={{color:'#bbb',fontSize:9,letterSpacing:1}}>{label}</div>
              {color==='#8e44ad'&&val!=='-'?(()=>{
                const gb=findGymByName(val);
                const logo=gb?((gymLogos&&gymLogos[gb.code]?.logo_url)||gb.logo_url):null;
                return(<div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                  <div style={{width:26,height:26,borderRadius:6,background:darkMode?'#2a2a2a':'#f0f0f0',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
                    {logo?<img loading="lazy" src={logo} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#aaa',fontSize:8,fontWeight:700,textAlign:'center',lineHeight:1.1}}>{(val||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                  </div>
                  <div style={{color:color,fontWeight:700,fontSize:12,minWidth:0,wordBreak:'break-word'}}>{val} ›</div>
                </div>);
              })():<div style={{color:color,fontWeight:700,fontSize:12,marginTop:3}}>{val}</div>}
            </div>
          ))}
        </div>
        {viewProfile.is_coach&&(
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid #8e44ad33',marginTop:10}}>
            <div style={{color:'#8e44ad',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>{L('🎓 TRAINER-PROFIL', '🎓 COACH PROFILE', '🎓 PROFIL DU COACH', '🎓 PERFIL DE ENTRENADOR')}</div>
            {viewProfile.coach_bio&&<div style={{color:darkMode?'#ccc':'#555',fontSize:12,lineHeight:1.5,marginBottom:10}}>{viewProfile.coach_bio}</div>}
            {!myProfile||viewProfile.id!==myProfile.id?(
              <>
                <div style={{color:'#999',fontSize:10,marginBottom:6}}>{L('Bewerte diesen Trainer:', 'Rate this coach:', 'Note ce coach :', 'Valora a este entrenador:')}</div>
                <div style={{display:'flex',gap:6}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>rateCoach(viewProfile.id,n)} style={{background:'none',border:'none',fontSize:26,cursor:'pointer',padding:0,color:(coaches.find(c=>c.id===viewProfile.id)?.myRating||0)>=n?'#d4a017':'#ddd'}}>★</button>
                  ))}
                </div>
              </>
            ):(
              <div style={{color:'#999',fontSize:11}}>{L('Das ist dein eigenes Trainer-Profil.', 'This is your own coach profile.', 'C\'est ton propre profil de coach.', 'Este es tu propio perfil de entrenador.')}</div>
            )}
          </div>
        )}
        {/* BLOCK / MELDEN */}
        {/* TRAININGS-HISTORIE auf fremdem Profil — immer anzeigen */}
        <div style={{padding:'0 12px',marginTop:12}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,letterSpacing:2}}>{L('🤝 TRAININGS-HISTORIE', '🤝 TRAINING HISTORY', '🤝 HISTORIQUE D\'ENTRAÎNEMENT', '🤝 HISTORIAL DE ENTRENAMIENTO')}</div>
            <div style={{background:viewProfile.history_public?'#27ae6018':'#88888818',border:'1px solid '+(viewProfile.history_public?'#27ae6044':'#88888844'),borderRadius:10,padding:'1px 7px',color:viewProfile.history_public?'#27ae60':'#888888',fontSize:9,fontWeight:700}}>
              {viewProfile.history_public?L('ÖFFENTLICH', 'PUBLIC', 'PUBLIC', 'PÚBLICO'):L('PRIVAT', 'PRIVATE', 'PRIVÉ', 'PRIVADO')}
            </div>
          </div>
          {viewProfile.history_public&&viewProfileHistory.length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {viewProfileHistory.map((f,i)=>(
                <div key={f.id||i} style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:8,padding:'9px 11px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:30,height:30,borderRadius:7,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>🥊</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.opponent_name}</div>
                    <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{f.fight_type}{f.fight_type&&f.fight_date?' · ':''}{f.fight_date}</div>
                  </div>
                  {f.location&&<div style={{color:'#ccc',fontSize:9,flexShrink:0}}>📍 {f.location}</div>}
                </div>
              ))}
            </div>
          ):viewProfile.history_public&&viewProfileHistory.length===0?(
            <div style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:8,padding:'12px',textAlign:'center',border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
              <div style={{fontSize:20,marginBottom:4}}>🤝</div>
              <div style={{color:'#aaa',fontSize:12}}>{t.noHistory}</div>
            </div>
          ):(
            /* PRIVAT — ausgeblendet anzeigen */
            <div style={{position:'relative',overflow:'hidden',borderRadius:8}}>
              {/* Verschwommene Vorschau */}
              <div style={{filter:'blur(4px)',pointerEvents:'none',opacity:0.4}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:8,padding:'9px 11px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9,marginBottom:5}}>
                    <div style={{width:30,height:30,borderRadius:7,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>🥊</div>
                    <div style={{flex:1}}>
                      <div style={{background:darkMode?'#333':'#e0e0e0',height:12,borderRadius:4,width:'60%',marginBottom:6}}/>
                      <div style={{background:darkMode?'#2a2a2a':'#eee',height:9,borderRadius:4,width:'40%'}}/>
                    </div>
                  </div>
                ))}
              </div>
              {/* Lock Overlay */}
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,background:'rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:24}}>🔒</div>
                <div style={{color:darkMode?'#aaa':'#888',fontSize:12,fontWeight:700,textAlign:'center'}}>{L('Trainings-Historie ist privat', 'Training history is private', 'L\'historique d\'entraînement est privé', 'El historial de entrenamiento es privado')}</div>
                <div style={{color:darkMode?'#666':'#bbb',fontSize:10,textAlign:'center'}}>{L('Dieser User hat seine Historie nicht öffentlich gemacht', 'This user has not made their history public', 'Cet utilisateur n\'a pas rendu son historique public', 'Este usuario no ha hecho público su historial')}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,padding:'0 12px'}}>
          <button onClick={()=>{
            const isBlocked=blockedUsers.includes(viewProfile.id);
            const updated=isBlocked?blockedUsers.filter(id=>id!==viewProfile.id):[...blockedUsers,viewProfile.id];
            setBlockedUsers(updated);
            localStorage.setItem('fighter_blocked',JSON.stringify(updated));
            showMsg(isBlocked?'Nutzer entsperrt':'Nutzer blockiert 🚫');
            setViewProfile(null);
          }} style={{flex:1,padding:'11px',borderRadius:10,background:darkMode?'#2a1a1a':'#fff5f5',border:'1px solid #c0392b44',color:'#c0392b',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            🚫 {blockedUsers.includes(viewProfile.id)?'Entsperren':'Blockieren'}
          </button>
          <button onClick={()=>{
            if(reportSent[viewProfile.id]){showMsg('Bereits gemeldet');return;}
            setReportSent(r=>({...r,[viewProfile.id]:true}));
            showMsg(L('Profil wurde gemeldet ✓', 'Profile reported ✓', 'Profil signalé ✓', 'Perfil reportado ✓'));
          }} style={{flex:1,padding:'11px',borderRadius:10,background:darkMode?'#1a1a2a':'#f5f5ff',border:'1px solid #2980b944',color:'#2980b9',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            {reportSent[viewProfile.id]?'✓ Gemeldet':'⚠️ Melden'}
          </button>
        </div>
      </div>
      {lightboxImg&&(
        <div onClick={()=>setLightboxImg(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
          <img loading="lazy" src={lightboxImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=''/>
          <button onClick={(e)=>{e.stopPropagation();setLightboxImg(null);}} style={{position:'absolute',top:'calc(16px + env(safe-area-inset-top))',right:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:24,width:44,height:44,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
    </div>
  );

  // PASSWORT-RESET-BILDSCHIRM: hat Vorrang vor allem anderen, sobald ein
  // gueltiger Reset-Link angeklickt wurde
  if(recoveryToken)return(
    <div style={{minHeight:'100vh',background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#fff',borderRadius:16,padding:'28px 22px',width:'100%',maxWidth:360,boxShadow:'0 8px 40px rgba(0,0,0,0.3)'}}>
        {recoveryDone?(
          <>
            <div className='rj' style={{color:'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:10}}>{L('✅ PASSWORT GEÄNDERT', '✅ PASSWORD CHANGED', '✅ MOT DE PASSE MODIFIÉ', '✅ CONTRASEÑA CAMBIADA')}</div>
            <div style={{color:'#666',fontSize:14,marginBottom:18,lineHeight:1.5}}>{L('Dein neues Passwort wurde gespeichert. Du kannst dich jetzt damit einloggen.', 'Your new password has been saved. You can now log in with it.', 'Ton nouveau mot de passe a été enregistré. Tu peux maintenant te connecter avec.', 'Tu nueva contraseña se ha guardado. Ya puedes iniciar sesión con ella.')}</div>
            <button onClick={()=>{setRecoveryToken(null);window.location.reload();}}
              style={{width:'100%',padding:'12px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
              {L('ZUM LOGIN', 'TO LOGIN', 'VERS LA CONNEXION', 'IR AL INICIO DE SESIÓN')}
            </button>
          </>
        ):(
          <>
            <div className='rj' style={{color:'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:6}}>{L('NEUES PASSWORT', 'NEW PASSWORD', 'NOUVEAU MOT DE PASSE', 'NUEVA CONTRASEÑA')}</div>
            <div style={{color:'#888',fontSize:12,marginBottom:16}}>{L('Bitte gib dein neues Passwort ein.', 'Please enter your new password.', 'Saisis ton nouveau mot de passe.', 'Introduce tu nueva contraseña.')}</div>
            <input type='password' placeholder={L('Neues Passwort', 'New password', 'Nouveau mot de passe', 'Nueva contraseña')} value={recoveryNewPw} onChange={e=>setRecoveryNewPw(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:15,boxSizing:'border-box',marginBottom:10}}/>
            <input type='password' placeholder={L('Passwort wiederholen', 'Repeat password', 'Répète le mot de passe', 'Repite la contraseña')} value={recoveryNewPw2} onChange={e=>setRecoveryNewPw2(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:15,boxSizing:'border-box'}}/>
            {recoveryErr&&<div style={{color:RED,fontSize:12,marginTop:8,textAlign:'center'}}>{recoveryErr}</div>}
            <button onClick={submitNewPassword} disabled={recoverySaving}
              style={{width:'100%',marginTop:14,padding:'12px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
              {recoverySaving?'Speichern...':L('PASSWORT SPEICHERN', 'SAVE PASSWORD', 'ENREGISTRER LE MOT DE PASSE', 'GUARDAR CONTRASEÑA')}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if(!authReady||screen==='loading')return(
    <div style={{minHeight:'100vh',background:'#0d0d0d',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:0,position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <style>{`
        @keyframes splashDot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}
        .splash-dot1{animation:splashDot 1.4s ease-in-out infinite}
        .splash-dot2{animation:splashDot 1.4s ease-in-out 0.2s infinite}
        .splash-dot3{animation:splashDot 1.4s ease-in-out 0.4s infinite}
      `}</style>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,#1a0a0a 0%,#0d0d0d 70%)'}}/>
      <div style={{position:'relative',textAlign:'center'}}>
        <div className='rj splash-logo' style={{fontSize:56,color:'#fff',letterSpacing:8,textShadow:'0 0 40px rgba(192,57,43,0.6)'}}>FIGHTER</div>
        <div className='splash-sub' style={{color:'#c0392b',fontSize:11,letterSpacing:5,fontFamily:'DM Sans,sans-serif',fontWeight:700,marginTop:4}}>{L('FINDE DEINEN GEGNER', 'FIND YOUR OPPONENT', 'TROUVE TON ADVERSAIRE', 'ENCUENTRA A TU RIVAL')}</div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'center'}}>
          <div className='splash-dot1' style={{width:7,height:7,borderRadius:'50%',background:'#c0392b'}}/>
          <div className='splash-dot2' style={{width:7,height:7,borderRadius:'50%',background:'#c0392b'}}/>
          <div className='splash-dot3' style={{width:7,height:7,borderRadius:'50%',background:'#c0392b'}}/>
        </div>
      </div>
    </div>
  );
  // ONBOARDING
  const onboardSlides=[
    {icon:'',title:t.ob1title,sub:t.ob1sub,bg:'linear-gradient(160deg,#1a0505 0%,#0d0d0d 100%)',accent:'#c0392b'},
    {icon:'💬',title:t.ob2title,sub:t.ob2sub,bg:'linear-gradient(160deg,#05101a 0%,#0d0d0d 100%)',accent:'#2980b9'},
    {icon:'🏆',title:t.ob3title,sub:t.ob3sub,bg:'linear-gradient(160deg,#0a0a05 0%,#0d0d0d 100%)',accent:'#d4a017'},
  ];

  if(showOnboarding&&authReady)return(
    <div style={{minHeight:'100vh',background:onboardSlides[onboardSlide].bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'60px 24px 50px',position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}.slide-content{animation:slideIn 0.4s ease-out}`}</style>
      <div/>
      <div className='slide-content' key={onboardSlide} style={{textAlign:'center',maxWidth:340}}>
        <div style={{fontSize:80,marginBottom:24,filter:'drop-shadow(0 0 30px '+onboardSlides[onboardSlide].accent+'66)'}}>{onboardSlides[onboardSlide].icon}</div>
        <div className='rj' style={{fontSize:36,color:'#fff',letterSpacing:3,lineHeight:1.15,marginBottom:16,whiteSpace:'pre-line'}}>{onboardSlides[onboardSlide].title}</div>
        <div style={{color:'rgba(255,255,255,0.65)',fontSize:15,lineHeight:1.7,fontFamily:'DM Sans,sans-serif'}}>{onboardSlides[onboardSlide].sub}</div>
      </div>
      <div style={{width:'100%',maxWidth:340}}>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:28}}>
          {onboardSlides.map((_,i)=><div key={i} style={{width:i===onboardSlide?24:7,height:7,borderRadius:4,background:i===onboardSlide?onboardSlides[onboardSlide].accent:'rgba(255,255,255,0.2)',transition:'all 0.3s'}}/>)}
        </div>
        <button onClick={()=>{
          if(onboardSlide<onboardSlides.length-1){setOnboardSlide(s=>s+1);}
          else{try{localStorage.setItem('fighter_onboarding_done','1');}catch{}setShowOnboarding(false);}
        }} style={{width:'100%',padding:'16px',borderRadius:14,background:onboardSlides[onboardSlide].accent,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:20,letterSpacing:3,cursor:'pointer',boxShadow:'0 4px 20px '+onboardSlides[onboardSlide].accent+'55'}}>
          {onboardSlide<onboardSlides.length-1?t.continueBtn:t.startNow}
        </button>
        {onboardSlide===0&&<button onClick={()=>{try{localStorage.setItem('fighter_onboarding_done','1');}catch{}setShowOnboarding(false);}} style={{width:'100%',marginTop:10,padding:'10px',background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:12,cursor:'pointer'}}>{t.skip}</button>}
      </div>
    </div>
  );

  if(!session)return <AuthScreen onSession={handleSession} appLang={appLang}/>;
  // Marken-Konten sehen die App komplett normal (Swipe, Rangliste, Gyms,
  // Chat) - nur echte Matches/Swipes werden fuer sie nie gespeichert (siehe
  // doSwipe). Keine eigene eingeschraenkte Ansicht mehr noetig.
  if(profile.isBrand&&!myProfile)return(
    <div style={{height:'100dvh',overflowY:'auto',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',padding:'40px 20px'}}>
      <div className='rj' style={{fontSize:48,color:'#1a1a1a',letterSpacing:5}}>FIGHTER</div>
      <div style={{color:'#2980b9',fontSize:11,letterSpacing:3,marginTop:5,fontWeight:700,marginBottom:30}}>{L('MARKEN-PARTNER', 'BRAND PARTNER', 'PARTENAIRE DE MARQUE', 'SOCIO DE MARCA')}</div>
      <div style={{width:'100%',maxWidth:340}}>
        <Lbl>{L('Firmenname *', 'Company name *', 'Nom de l\'entreprise *', 'Nombre de la empresa *')}</Lbl>
        <Inp placeholder='z.B. Winnas Nutrition' value={profile.companyName||''} onChange={v=>setProfile(p=>({...p,companyName:v}))}/>
        <button onClick={saveProfile} disabled={!profile.companyName||saving}
          style={{width:'100%',marginTop:14,padding:'13px',borderRadius:8,background:profile.companyName?'linear-gradient(135deg,#2980b9,#5dade2)':'#ddd',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:profile.companyName?'pointer':'default'}}>
          {saving?'...':L('ALS MARKE FORTFAHREN', 'CONTINUE AS BRAND', 'CONTINUER EN TANT QUE MARQUE', 'CONTINUAR COMO MARCA')}
        </button>
      </div>
    </div>
  );
  if(activeChat&&myProfile&&!viewProfile)return(<><style>{css}</style><ChatOverlay match={activeChat} myProfileId={myProfile.id} myName={myProfile.name} token={session.token} onClose={()=>setActiveChat(null)} onViewProfile={(p)=>{setViewProfile(p);}} darkMode={darkMode} t={t} appLang={appLang} isAdmin={isAdmin}/></>);

  if(screen==='setup')return(
    <div style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 0 40px'}}>
      <style>{css}</style>
      {showImgEditor&&imgEditorSrc&&<ImgPositionEditor src={imgEditorSrc} onSave={imgEditorCallback} onCancel={()=>setShowImgEditor(false)}/>}
      <div style={{width:'100%',maxWidth:420,padding:'32px 24px 0',textAlign:'center'}}>
        <div className='rj fadeUp' style={{fontSize:64,color:'#1a1a1a',letterSpacing:6,lineHeight:1}}>FIGHTER</div>
        <div style={{color:RED,fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>{L('FINDE DEINEN GEGNER', 'FIND YOUR OPPONENT', 'TROUVE TON ADVERSAIRE', 'ENCUENTRA A TU RIVAL')}</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:22}}>
        {[1,2,3].map(s=><div key={s} style={{width:s===step?32:10,height:8,borderRadius:4,background:s<=step?RED:'#ddd',transition:'all 0.3s'}}/>)}
      </div>
      <div style={{width:'100%',maxWidth:380,padding:'22px 20px 0'}}>
        {step===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{background:'#f8f4ff',border:'1px solid #e0d4f7',borderRadius:12,padding:'12px 14px'}}>
              <div style={{color:'#1a1a1a',fontSize:12,fontWeight:700,marginBottom:8}}>{L('Was trifft auf dich zu?', 'What applies to you?', 'Qu\'est-ce qui te correspond ?', '¿Qué te describe?')}</div>
              <div style={{display:'flex',gap:8}}>
                <button type='button' onClick={()=>setProfile(p=>({...p,isFighter:!p.isFighter,isBrand:false}))}
                  style={{flex:1,padding:'9px',borderRadius:8,border:'2px solid '+(profile.isFighter!==false&&!profile.isBrand?RED:'#ddd'),background:profile.isFighter!==false&&!profile.isBrand?'#fdf0ef':'#fff',color:profile.isFighter!==false&&!profile.isBrand?RED:'#888',fontWeight:700,fontSize:12,cursor:'pointer'}}>{L('🥊 Kämpfer', '🥊 Fighter', '🥊 Combattant', '🥊 Luchador')}</button>
                <button type='button' onClick={()=>setProfile(p=>({...p,isCoach:!p.isCoach,isBrand:false}))}
                  style={{flex:1,padding:'9px',borderRadius:8,border:'2px solid '+(profile.isCoach&&!profile.isBrand?'#8e44ad':'#ddd'),background:profile.isCoach&&!profile.isBrand?'#f5edfc':'#fff',color:profile.isCoach&&!profile.isBrand?'#8e44ad':'#888',fontWeight:700,fontSize:12,cursor:'pointer'}}>{L('🎓 Trainer', '🎓 Coach', '🎓 Coach', '🎓 Entrenador')}</button>
                <button type='button' onClick={()=>setProfile(p=>({...p,isBrand:!p.isBrand}))}
                  style={{flex:1,padding:'9px',borderRadius:8,border:'2px solid '+(profile.isBrand?'#2980b9':'#ddd'),background:profile.isBrand?'#eaf2fa':'#fff',color:profile.isBrand?'#2980b9':'#888',fontWeight:700,fontSize:12,cursor:'pointer'}}>{L('🏢 Marke', '🏢 Brand', '🏢 Marque', '🏢 Marca')}</button>
              </div>
              <div style={{color:'#999',fontSize:10,marginTop:6}}>{profile.isBrand?L('Als Marken-Partner siehst du die App, kannst aber nicht als Kämpfer teilnehmen.', 'As a brand partner you can see the app but cannot take part as a fighter.', 'En tant que partenaire de marque, tu vois l\'app mais tu ne peux pas participer comme combattant.', 'Como socio de marca ves la app, pero no puedes participar como luchador.'):L('Beides ist möglich — als Trainer kommen am Ende noch ein paar zusätzliche Fragen.', 'Both are possible — as a coach there are a few extra questions at the end.', 'Les deux sont possibles — en tant que coach, quelques questions supplémentaires suivent à la fin.', 'Ambas son posibles: como entrenador hay unas preguntas adicionales al final.')}</div>
            </div>
            {profile.isBrand?(
              <div style={{display:'flex',flexDirection:'column',gap:13}}>
                <div>
                  <Lbl>{L('Firmenname *', 'Company name *', 'Nom de l\'entreprise *', 'Nombre de la empresa *')}</Lbl>
                  <Inp placeholder='z.B. Winnas Nutrition' value={profile.companyName||''} onChange={v=>setProfile(p=>({...p,companyName:v}))}/>
                </div>
                <button onClick={saveProfile} disabled={!profile.companyName||saving}
                  style={{width:'100%',padding:'13px',borderRadius:8,background:profile.companyName?`linear-gradient(135deg,#2980b9,#5dade2)`:'#ddd',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:profile.companyName?'pointer':'default'}}>
                  {saving?'...':L('ALS MARKE FORTFAHREN', 'CONTINUE AS BRAND', 'CONTINUER EN TANT QUE MARQUE', 'CONTINUAR COMO MARCA')}
                </button>
              </div>
            ):(
            <>
            <div style={{display:'flex',justifyContent:'center',marginBottom:8}}> 
              <div style={{textAlign:'center'}}>
                {!avatarPreview&&(
                  <label style={{cursor:'pointer'}}>
                    <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                    <div style={{position:'relative',display:'inline-block'}}>
                      <div style={{width:110,height:110,borderRadius:'50%',background:'#fdf0ef',border:'3px solid #e74c3c',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',margin:'0 auto',animation:'pulse 1.8s infinite',boxShadow:'0 0 0 6px rgba(231,76,60,0.15)'}}>
                        {uploading?<div style={{fontSize:28}} className='spin'>⏳</div>
                          :<div style={{textAlign:'center'}}><div style={{fontSize:36}}>📸</div><div style={{color:RED,fontSize:10,marginTop:4,fontWeight:700}}>{L('FOTO', 'PHOTO', 'PHOTO', 'FOTO')}</div></div>}
                      </div>
                    </div>
                  </label>
                )}
                {avatarPreview&&(
                  <div style={{position:'relative',display:'inline-block'}}>
                    <div
                      onPointerDown={e=>{
                        e.currentTarget.setPointerCapture(e.pointerId);
                        e.currentTarget.dataset.dragging='1';
                        e.currentTarget.dataset.startX=e.clientX;
                        e.currentTarget.dataset.startY=e.clientY;
                        e.currentTarget.dataset.startPosX=profile.imgPosX??50;
                        e.currentTarget.dataset.startPosY=profile.imgPosY??30;
                      }}
                      onPointerMove={e=>{
                        if(e.currentTarget.dataset.dragging!=='1')return;
                        const dx=e.clientX-parseFloat(e.currentTarget.dataset.startX);
                        const dy=e.clientY-parseFloat(e.currentTarget.dataset.startY);
                        const newX=Math.max(0,Math.min(100,parseFloat(e.currentTarget.dataset.startPosX)-(dx/110)*100));
                        const newY=Math.max(0,Math.min(100,parseFloat(e.currentTarget.dataset.startPosY)-(dy/110)*100));
                        setProfile(p=>({...p,imgPosX:newX,imgPosY:newY}));
                      }}
                      onPointerUp={e=>{e.currentTarget.dataset.dragging='0';}}
                      onPointerCancel={e=>{e.currentTarget.dataset.dragging='0';}}
                      style={{width:110,height:110,borderRadius:'50%',background:'#000',border:'3px solid '+RED,overflow:'hidden',margin:'0 auto',boxShadow:'0 4px 16px rgba(192,57,43,0.3)',cursor:'grab',touchAction:'none'}}>
                      <img loading="lazy" src={avatarPreview} draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:(profile.imgPosX??50)+'% '+(profile.imgPosY??30)+'%',pointerEvents:'none'}} alt='avatar'/>
                    </div>
                    <div style={{position:'absolute',bottom:4,right:4,background:'#27ae60',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'2px solid #fff',pointerEvents:'none'}}>✓</div>
                  </div>
                )}
                <div style={{color:avatarPreview?'#27ae60':RED,fontSize:12,marginTop:8,fontWeight:700}}>{avatarPreview?L('Foto hochgeladen ✓', 'Photo uploaded ✓', 'Photo chargée ✓', 'Foto subida ✓'):L('Profilbild hinzufügen (erforderlich)', 'Add profile photo (required)', 'Ajouter une photo de profil (obligatoire)', 'Añadir foto de perfil (obligatoria)')}</div>
                {avatarPreview&&<div style={{color:'#bbb',fontSize:10,marginTop:2}}>{L('Zum Verschieben im Kreis ziehen', 'Drag inside the circle to reposition', 'Fais glisser dans le cercle pour déplacer', 'Arrastra dentro del círculo para mover')}</div>}
                {!avatarPreview&&<div style={{color:'#bbb',fontSize:10,marginTop:2}}>{L('Ein Profilbild ist zum Fortfahren nötig', 'A photo is required to continue', 'Une photo est obligatoire pour continuer', 'Se necesita una foto de perfil para continuar')}</div>}
                {avatarPreview&&(
                  <label style={{display:'inline-block',marginTop:8,cursor:'pointer',color:RED,fontSize:11,fontWeight:700,textDecoration:'underline'}}>
                    <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                    {L('Anderes Foto wählen', 'Choose another photo', 'Choisir une autre photo', 'Elegir otra foto')}
                  </label>
                )}
              </div>
            </div>
            <Lbl>{L('Dein Name', 'Your name', 'Ton nom', 'Tu nombre')}</Lbl><Inp placeholder='z.B. Max Mueller' value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
            <Lbl>{L('Alter', 'Age', 'Âge', 'Edad')}</Lbl><Inp placeholder='z.B. 25' type='number' value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
            <Lbl>{L('Standort', 'Location', 'Localisation', 'Ubicación')}</Lbl><Inp placeholder='z.B. Berlin' value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))}/>
            <Lbl>{L('Ich bin', 'I am', 'Je suis', 'Soy')}</Lbl>
            <div style={{display:'flex',gap:10,marginTop:2,marginBottom:4}}>
              {[['Mann','♂️','male'],['Frau','♀️','female']].map(([label,icon,val])=>(
                <button key={val} onClick={()=>setProfile(p=>({...p,gender:val}))}
                  style={{flex:1,padding:'12px 6px',borderRadius:10,border:'2px solid '+(profile.gender===val?RED:'#e0e0e0'),background:profile.gender===val?'#fdf0ef':'#fff',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                  <div style={{fontSize:22,marginBottom:3}}>{icon}</div>
                  <div style={{color:profile.gender===val?RED:'#555',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1}}>{label}</div>
                </button>
              ))}
            </div>
            <Lbl>{L('Level', 'Level', 'Niveau', 'Nivel')}</Lbl>
            <div style={{display:'flex',gap:10,marginTop:2}}>
              {[['Amateur','🥋',false],['Profi','⭐',true]].map(([label,icon,val])=>(
                <button key={label} onClick={()=>setProfile(p=>({...p,isPro:val}))}
                  style={{flex:1,padding:'14px 10px',borderRadius:10,border:'2px solid '+(profile.isPro===val?RED:'#e0e0e0'),background:profile.isPro===val?'#fdf0ef':'#fff',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                  <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
                  <div style={{color:profile.isPro===val?RED:'#555',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:1}}>{label}</div>
                  <div style={{color:'#aaa',fontSize:10,marginTop:2}}>{val?'Wettkampf-Erfahrung':'Einsteiger / Hobbyist'}</div>
                </button>
              ))}
            </div>
            <Lbl>{L('Land', 'Country', 'Pays', 'País')}</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:2}}>
              {[['🇩🇪','DE','Deutschland'],['🇦🇹','AT','Österreich'],['🇨🇭','CH','Schweiz'],['🇫🇷','FR','Frankreich'],['🇬🇧','GB','UK'],['🇺🇸','US','USA'],['🇳🇱','NL','Niederlande'],['🇧🇪','BE','Belgien'],['🇮🇹','IT','Italien'],['🇪🇸','ES','Spanien'],['🇧🇬','BG','Bulgarien'],['🇭🇷','HR','Kroatien'],['🇨🇾','CY','Zypern'],['🇨🇿','CZ','Tschechien'],['🇩🇰','DK','Dänemark'],['🇪🇪','EE','Estland'],['🇫🇮','FI','Finnland'],['🇬🇷','GR','Griechenland'],['🇭🇺','HU','Ungarn'],['🇮🇪','IE','Irland'],['🇱🇻','LV','Lettland'],['🇱🇹','LT','Litauen'],['🇱🇺','LU','Luxemburg'],['🇲🇹','MT','Malta'],['🇵🇱','PL','Polen'],['🇵🇹','PT','Portugal'],['🇷🇴','RO','Rumänien'],['🇸🇰','SK','Slowakei'],['🇸🇮','SI','Slowenien'],['🇸🇪','SE','Schweden'],['🌍','OTHER','Andere']].map(([flag,code,name])=>(
                <button key={code} onClick={()=>setProfile(p=>({...p,country:code}))}
                  style={{padding:'8px 12px',borderRadius:10,border:'2px solid '+(profile.country===code?RED:'#e0e0e0'),background:profile.country===code?'#fdf0ef':'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'all 0.2s'}}>
                  <span style={{fontSize:18}}>{flag}</span>
                  <span style={{color:profile.country===code?RED:'#555',fontWeight:700,fontSize:12}}>{countryName(code,name,appLang)}</span>
                </button>
              ))}
            </div>
            </>
            )}
          </div>
        )}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <Lbl>{L('Dein Gym', 'Your gym', 'Ta salle', 'Tu gimnasio')}</Lbl>
            <div style={{position:'relative'}}>
              <Inp placeholder={L('Gym suchen…', 'Search gym…', 'Chercher une salle…', 'Buscar gimnasio…')} value={profile.gym} onChange={v=>{
                setProfile(p=>({...p,gym:v}));
                if(v.length>=2){
                  const q=v.toLowerCase();
                  const matches=ALL_GYMS_FLAT.filter(g=>g.name.toLowerCase().includes(q)||g.ct.toLowerCase().includes(q));
                  setGymSuggestions(matches.slice(0,6));
                  setShowGymSuggestions(true);
                }else{
                  setShowGymSuggestions(false);
                }
              }}/>
              {showGymSuggestions&&gymSuggestions.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eee',zIndex:100,overflow:'hidden',marginTop:4}}>
                  {gymSuggestions.map((g,i)=>(
                    <div key={i} onClick={()=>{setProfile(p=>({...p,gym:g.name}));setShowGymSuggestions(false);}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',borderBottom:i<gymSuggestions.length-1?'1px solid #f5f5f5':'none'}} onMouseEnter={e=>e.currentTarget.style.background='#fdf0ef'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <div style={{width:36,height:36,borderRadius:8,flexShrink:0,overflow:'hidden',background:'#f5f5f7',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {(gymLogos[g.code]?.logo_url||g.logo_url)
                          ?<img loading="lazy" src={gymLogos[g.code]?.logo_url||g.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>
                          :g.emoji?<div style={{fontSize:20}}>{g.emoji}</div>
                          :<div style={{color:'#bbb',fontSize:10,fontWeight:700}}>{(g.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:'#1a1a1a',fontWeight:700,fontSize:13}}>{g.name}</div>
                        <div style={{color:'#aaa',fontSize:11}}>📍 {g.ct} · {g.styles?.join(', ')}</div>
                      </div>
                      {g.code&&<div style={{color:'#27ae60',fontSize:10,fontWeight:700}}>{L('✅ Verifizierbar', '✅ Verifiable', '✅ Vérifiable', '✅ Verificable')}</div>}
                    </div>
                  ))}
                  <div onClick={()=>{setShowGymSuggestions(false);setShowRegisterGym(true);setNewGymData(d=>({...d,name:profile.gym}));}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:'#fdf8ff',borderTop:'1px solid #f0e8ff'}} onMouseEnter={e=>e.currentTarget.style.background='#f0e8ff'} onMouseLeave={e=>e.currentTarget.style.background='#fdf8ff'}>
                    <div style={{fontSize:20}}>➕</div>
                    <div style={{color:'#8e44ad',fontWeight:700,fontSize:13}}>{t.myGymNotListed}</div>
                  </div>
                </div>
              )}
              {showGymSuggestions&&gymSuggestions.length===0&&profile.gym.length>=2&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eee',zIndex:100,marginTop:4}}>
                  <div style={{padding:'12px 14px',color:'#aaa',fontSize:13,textAlign:'center'}}>{t.gymNotFound}</div>
                  <div onClick={()=>{setShowGymSuggestions(false);setShowRegisterGym(true);setNewGymData(d=>({...d,name:profile.gym}));}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:'#fdf8ff',borderTop:'1px solid #f0e8ff'}}>
                    <div style={{fontSize:20}}>➕</div>
                    <div style={{color:'#8e44ad',fontWeight:700,fontSize:13}}>"{profile.gym}" zur App anmelden</div>
                  </div>
                </div>
              )}
            </div>

            {/* GYM ANMELDE-MODAL */}
            {showRegisterGym&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
                <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:360,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
                  <div style={{background:'linear-gradient(135deg,#6c3483,#8e44ad)',padding:'18px 20px'}}>
                    <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2}}>{L('GYM ANMELDEN', 'REGISTER GYM', 'ENREGISTRER LA SALLE', 'REGISTRAR GIMNASIO')}</div>
                    <div style={{color:'rgba(255,255,255,0.65)',fontSize:11,marginTop:2}}>{t.gymBeingAdded}</div>
                  </div>
                  <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:10}}>
                    {gymRegSent?(
                      <div style={{textAlign:'center',padding:'20px 0'}}>
                        <div style={{fontSize:48,marginBottom:10}}>✅</div>
                        <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18}}>{L('ANMELDUNG GESENDET!', 'SUBMISSION SENT!', 'DEMANDE ENVOYÉE !', '¡SOLICITUD ENVIADA!')}</div>
                        <div style={{color:'#888',fontSize:12,marginTop:6,lineHeight:1.6}}>{L('Wir prüfen dein Gym und fügen es innerhalb von 48h hinzu. Du bekommst eine E-Mail sobald es live ist.', 'We will review your gym and add it within 48h. You will get an email as soon as it is live.', 'Nous vérifions ta salle et l\'ajoutons sous 48 h. Tu recevras un e-mail dès qu\'elle est en ligne.', 'Revisaremos tu gimnasio y lo añadiremos en 48 h. Recibirás un correo cuando esté activo.')}</div>
                        <button onClick={()=>{setShowRegisterGym(false);setGymRegSent(false);}} style={{marginTop:16,padding:'11px 28px',borderRadius:10,background:'linear-gradient(135deg,#8e44ad,#9b59b6)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>{L('SCHLIESSEN', 'CLOSE', 'FERMER', 'CERRAR')}</button>
                      </div>
                    ):(
                      <>
                        {[
                          [L('GYM NAME *', 'GYM NAME *', 'NOM DE LA SALLE *', 'NOMBRE DEL GIMNASIO *'),newGymData.name,'name','z.B. Tiger Gym Berlin'],
                          [L('STADT *', 'CITY *', 'VILLE *', 'CIUDAD *'),newGymData.city,'city','z.B. Berlin'],
                          [L('ADRESSE', 'ADDRESS', 'ADRESSE', 'DIRECCIÓN'),newGymData.address,'address',L('z.B. Müllerstraße 12', 'e.g. Main Street 12', 'p. ex. 12 rue Principale', 'p. ej. Calle Mayor 12')],
                          [L('KAMPFSTIL', 'FIGHTING STYLE', 'STYLE DE COMBAT', 'ESTILO DE COMBATE'),newGymData.style,'style','z.B. Boxing, MMA'],
                        ].map(([label,val,key,ph])=>(
                          <div key={key}>
                            <div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:4}}>{label}</div>
                            <input value={val} onChange={e=>setNewGymData(d=>({...d,[key]:e.target.value}))} placeholder={ph}
                              style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #e0e0e0',background:'#f5f5f7',color:'#1a1a1a',fontSize:13,fontFamily:'DM Sans,sans-serif'}}/>
                          </div>
                        ))}
                        <div style={{background:'#fdf8ff',borderRadius:8,padding:'10px',border:'1px solid #e8d5f5',marginTop:2}}>
                          <div style={{color:'#8e44ad',fontSize:11,lineHeight:1.6}}>{L('💡 Nach der Prüfung erscheint dein Gym in der App und du kannst dich als Mitglied verifizieren.', '💡 After review your gym appears in the app and you can verify your membership.', '💡 Après vérification, ta salle apparaît dans l\'app et tu peux vérifier ton adhésion.', '💡 Tras la revisión tu gimnasio aparecerá en la app y podrás verificar tu membresía.')}</div>
                        </div>
                        <div style={{display:'flex',gap:8,marginTop:4}}>
                          <button onClick={()=>{setShowRegisterGym(false);setGymRegSent(false);}} style={{flex:1,padding:'11px',borderRadius:10,background:'transparent',border:'1px solid #eee',color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>{t.cancel}</button>
                          <button onClick={async()=>{
                            if(!newGymData.name||!newGymData.city)return;
                            // Gym in DB speichern - taucht danach automatisch im
                            // Admin-Panel unter "neue Gym-Anmeldungen zu pruefen" auf.
                            try{
                              await fetch(SUPA_URL+'/rest/v1/gyms',{
                                method:'POST',
                                headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                                body:JSON.stringify({
                                  name:newGymData.name,
                                  city:newGymData.city,
                                  address:newGymData.address||'',
                                  style:newGymData.style||'',
                                  styles:newGymData.style?[newGymData.style]:[],
                                  code:newGymData.name.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,20)+'-'+Math.floor(Math.random()*9000+1000),
                                  emoji:'',members:0,rating:0,verified:false
                                })
                              });
                              await loadDbGyms(session);
                              showMsg(L('✅ Gym gespeichert!', '✅ Gym saved!', '✅ Salle enregistrée!', '✅ ¡Gimnasio guardado!'));
                            }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
                            setProfile(p=>({...p,gym:newGymData.name}));
                            setGymRegSent(true);
                          }} disabled={!newGymData.name||!newGymData.city}
                            style={{flex:2,padding:'11px',borderRadius:10,background:newGymData.name&&newGymData.city?'linear-gradient(135deg,#8e44ad,#9b59b6)':'#eee',border:'none',color:newGymData.name&&newGymData.city?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:newGymData.name&&newGymData.city?'pointer':'not-allowed'}}>
                            {L('➕ ANMELDEN', '➕ REGISTER', '➕ ENREGISTRER', '➕ REGISTRAR')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <Lbl>{L('Ueber dich', 'About you', 'À propos de toi', 'Sobre ti')}</Lbl><Inp placeholder='z.B. 5 Jahre Boxing Erfahrung…' value={profile.bio} onChange={v=>{setShowGymSuggestions(false);setProfile(p=>({...p,bio:v}));}} onFocus={()=>setShowGymSuggestions(false)}/>
            <Lbl>{t.fightStyle}</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {STYLES.map(s=>{
                const selected=(profile.style||'').split(',').map(x=>x.trim()).filter(Boolean);
                const isSelected=selected.includes(s);
                return(<button key={s} onClick={()=>{
                  const cur=(profile.style||'').split(',').map(x=>x.trim()).filter(Boolean);
                  const next=isSelected?cur.filter(x=>x!==s):[...cur,s];
                  setProfile(p=>({...p,style:next.join(', ')}));
                }} style={{padding:'7px 13px',borderRadius:4,border:'1px solid '+(isSelected?RED:'#ddd'),background:isSelected?'#fdf0ef':'#fff',color:isSelected?RED:'#666',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>{s}</button>);
              })}
            </div>
            {(profile.style||'').split(',').map(x=>x.trim()).some(s=>BELT_STYLES.includes(s))&&(
              <>
                <Lbl>{L('Guertelrang', 'Belt rank', 'Grade de ceinture', 'Grado de cinturón')}</Lbl>
                <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                  {BELT_RANKS.map(b=>(
                    <button key={b} onClick={()=>setProfile(p=>({...p,belt:b}))}
                      style={{padding:'7px 13px',borderRadius:4,border:'1px solid '+(profile.belt===b?RED:'#ddd'),background:profile.belt===b?'#fdf0ef':'#fff',color:profile.belt===b?RED:'#666',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer'}}>{b}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {step===3&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{display:'flex',gap:11}}>
              <div style={{flex:1}}><Lbl>{L('Groesse (cm)', 'Height (cm)', 'Taille (cm)', 'Altura (cm)')}</Lbl><Inp placeholder='180' type='number' value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
              <div style={{flex:1}}><Lbl>{t.fightWeight}</Lbl><Inp placeholder='77' type='number' value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
            </div>
            <Lbl>{L('Gewichtsklasse', 'Weight class', 'Catégorie de poids', 'Categoría de peso')}</Lbl>
            <select value={normalizeWeightClass(profile.weightClass)} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:'#fff',border:'1px solid #ddd',borderRadius:8,padding:'12px 13px',color:profile.weightClass?'#1a1a1a':'#aaa',fontSize:14,width:'100%'}}>
              <option value=''>{L('Gewichtsklasse waehlen', 'Choose weight class', 'Choisir la catégorie de poids', 'Elige la categoría de peso')}</option>
              {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
            <Lbl>{t.fightRecord}</Lbl>
            <div style={{display:'flex',gap:7}}>
              {[['wins',L('SIEGE', 'WINS', 'VICTOIRES', 'VICTORIAS'),'#27ae60'],['losses',L('NIEDER', 'LOSSES', 'DÉFAITES', 'DERROTAS'),RED],['draws',L('UNENTSCH', 'DRAWS', 'NULS', 'EMPATES'),'#d4a017'],['ko','KOs',RED]].map(([key,label,color])=>(
                <div key={key} style={{flex:1,textAlign:'center'}}>
                  <div style={{color:color,fontSize:9,letterSpacing:1,marginBottom:3}}>{label}</div>
                  <input type='number' min='0' value={stats[key]} onChange={e=>setStats(s=>({...s,[key]:parseInt(e.target.value)||0}))} style={{width:'100%',background:'#fff',border:'1px solid #ddd',borderRadius:6,padding:'9px 3px',color:'#1a1a1a',fontSize:20,textAlign:'center',fontFamily:'Rajdhani,sans-serif'}}/>
                </div>
              ))}
            </div>
          </div>
        )}
        {step===4&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{color:'#8e44ad',fontSize:13,fontWeight:700,marginBottom:2}}>{L('🎓 Noch ein paar Fragen als Trainer', '🎓 A few more questions as a coach', '🎓 Quelques questions de plus en tant que coach', '🎓 Unas preguntas más como entrenador')}</div>
            <Lbl>{L('Gym / Verein, wo du unterrichtest', 'Gym / club where you teach', 'Salle / club où tu enseignes', 'Gimnasio / club donde enseñas')}</Lbl>
            <Inp placeholder='z.B. Tiger Gym Berlin' value={profile.coachGym||''} onChange={v=>setProfile(p=>({...p,coachGym:v}))}/>
            <Lbl>{L('Jahre Erfahrung als Trainer', 'Years of experience as a coach', 'Années d\'expérience comme coach', 'Años de experiencia como entrenador')}</Lbl>
            <Inp placeholder='z.B. 8' type='number' value={profile.coachExperience||''} onChange={v=>setProfile(p=>({...p,coachExperience:v}))}/>
            <Lbl>{L('Kampfstile, die du unterrichtest', 'Fighting styles you teach', 'Styles de combat que tu enseignes', 'Estilos de combate que enseñas')}</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {STYLES.map(s=>{
                const selected=(profile.coachStyles||'').split(',').map(x=>x.trim()).filter(Boolean);
                const isSelected=selected.includes(s);
                return(<button key={s} onClick={()=>{
                  const cur=(profile.coachStyles||'').split(',').map(x=>x.trim()).filter(Boolean);
                  const next=isSelected?cur.filter(x=>x!==s):[...cur,s];
                  setProfile(p=>({...p,coachStyles:next.join(', ')}));
                }} style={{padding:'7px 13px',borderRadius:4,border:'1px solid '+(isSelected?'#8e44ad':'#ddd'),background:isSelected?'#f5edfc':'#fff',color:isSelected?'#8e44ad':'#666',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer'}}>{s}</button>);
              })}
            </div>
            <Lbl>{L('Trainer-Bio (Erfolge, dein Ansatz)', 'Coach bio (achievements, your approach)', 'Bio du coach (succès, ton approche)', 'Bio de entrenador (logros, tu enfoque)')}</Lbl>
            <Inp placeholder='z.B. 10 Jahre Erfahrung, spezialisiert auf...' value={profile.coachBio||''} onChange={v=>setProfile(p=>({...p,coachBio:v}))}/>
            <Lbl>{L('Trainer-Profilbild (optional)', 'Coach profile photo (optional)', 'Photo de profil du coach (facultatif)', 'Foto de perfil de entrenador (opcional)')}</Lbl>
            <div style={{color:'#888',fontSize:11,marginBottom:8,lineHeight:1.5}}>{L('Wird in der Trainer-Rangliste und deinem Trainer-Profil gezeigt — kann sich von deinem normalen Profilbild unterscheiden.', 'Shown in the coach ranking and your coach profile — can differ from your normal profile photo.', 'Affichée dans le classement des coachs et ton profil de coach — peut différer de ta photo de profil habituelle.', 'Se muestra en el ranking de entrenadores y en tu perfil de entrenador — puede ser distinta de tu foto de perfil normal.')}</div>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:70,height:70,borderRadius:14,background:coachAvatarPreview?'#000':'#f5edfc',border:'2px solid '+(coachAvatarPreview?'#8e44ad':'#ddd'),overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {coachAvatarPreview
                  ?<img loading="lazy" src={coachAvatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={L('Trainer-Profilbild', 'Coach profile photo', 'Photo de profil du coach', 'Foto de perfil de entrenador')}/>
                  :<div style={{fontSize:24}}>🎓</div>}
              </div>
              <label style={{padding:'10px 16px',borderRadius:8,background:'#8e44ad',color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                {uploadingCoachAvatar?'Lädt...':coachAvatarPreview?'Foto ändern':'Foto auswählen'}
                <input type='file' accept='image/*' onChange={handleCoachAvatarUpload} disabled={uploadingCoachAvatar} style={{display:'none'}}/>
              </label>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:9,marginTop:22}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:'13px',borderRadius:8,background:'#fff',border:'1px solid #ddd',color:'#666',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>{L('Zurueck', 'Back', 'Retour', 'Volver')}</button>}
          <div style={{flex:2,display:'flex',flexDirection:'column',gap:4}}>
            <button onClick={async()=>{
              if(!canGo())return;
              const maxStep=profile.isCoach?4:3;
              if(step<maxStep)setStep(s=>s+1);
              else await saveProfile();
            }} style={{width:'100%',padding:'13px',borderRadius:8,background:canGo()?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:canGo()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:canGo()?'pointer':'not-allowed',transition:'all 0.2s'}}>
              {saving?t.saving:(step===3&&!profile.isCoach)||step===4?t.letsGo:t.next}
            </button>
            {step===1&&!(avatarPreview||avatarUrl)&&<div style={{color:RED,fontSize:10,textAlign:'center',fontWeight:600}}>{L('⬆ Profilbild hochladen um fortzufahren', '⬆ Upload profile photo to continue', '⬆ Télécharger une photo pour continuer', '⬆ Sube una foto de perfil para continuar')}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs=[['swipe','🥊',t.fight],['chat','unread',t.chat],['ranking','🏆',t.rang],['gyms','🏋️',t.gyms],['stats','👤',t.profil]];

  return(
    <ErrorBoundary>
    <div style={{height:'100dvh',background:darkMode?'#1a1a1a':'#f5f5f7',fontFamily:'DM Sans,sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'}} onMouseMove={dragMove} onMouseUp={dragEnd} onTouchMove={dragMove} onTouchEnd={dragEnd}>
      <style>{css}</style>
      {msg&&<div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:'#fff',border:'1px solid '+RED,borderRadius:14,padding:'10px 18px',color:'#1a1a1a',fontSize:13,zIndex:9999,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.1)',whiteSpace:'pre-wrap',wordBreak:'break-word',maxWidth:'92vw',lineHeight:1.4}}>{msg}</div>}

      {/* SLIDE-OUT MENU OVERLAY */}
      {showMenu&&(
        <div style={{position:'fixed',inset:0,zIndex:800,display:'flex'}}>
          <div onClick={()=>setShowMenu(false)} style={{flex:1,background:'rgba(0,0,0,0.45)'}}/>
          <div style={{width:255,background:darkMode?'#141414':'#fafafa',height:'100%',display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.18)',animation:'slideInRight 0.22s ease'}}>
            <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

            {/* Profil Header */}
            <div style={{padding:'calc(22px + env(safe-area-inset-top)) 18px 14px',display:'flex',alignItems:'center',gap:11}}>
              {avatarPreview
                ?<img loading="lazy" src={avatarPreview} style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:'2px solid '+RED}} alt=''/>
                :<div style={{width:42,height:42,borderRadius:'50%',background:RED+'18',border:'2px solid '+RED+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:darkMode?'#fff':'#111',fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile.name||'Fighter'}</div>
                <div style={{color:RED,fontSize:10,marginTop:1}}>{profile.style||''}</div>
              </div>
              <button onClick={()=>setShowMenu(false)} style={{background:'none',border:'none',color:darkMode?'#555':'#bbb',fontSize:16,cursor:'pointer',padding:4}}>✕</button>
            </div>

            <div style={{height:1,background:darkMode?'#222':'#efefef',margin:'0 18px'}}/>

            {/* Menu Items */}
            <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>

              {/* Navigations-Items */}
              {[
                {icon:'',label:L('Events','Events','Événements','Eventos'),action:()=>{setTab('events');setShowMenu(false);loadEvents(session);}},
                {icon:'',label:L('News','News','Actualités','Noticias'),action:()=>{setShowNews(true);setShowMenu(false);loadNews();}},
                {icon:'',label:L('Mein Profil','My profile','Mon profil','Mi perfil'),action:()=>{setTab('stats');setShowMenu(false);}},
                {icon:'',label:L('Equipment','Equipment','Équipement','Equipamiento'),action:()=>{setShowEquipment(true);setShowMenu(false);}},
                {icon:'',label:L('Supplements','Supplements','Compléments','Suplementos'),action:()=>{setShowSupplements(true);setShowMenu(false);}},
              ].map(item=>(
                <div key={item.label} onClick={item.action}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontSize:17,width:24,textAlign:'center',opacity:0.85}}>{item.icon}</div>
                  <div style={{color:darkMode?'#e0e0e0':'#222',fontSize:13,fontWeight:600}}>{item.label}</div>
                </div>
              ))}

              <div style={{height:1,background:darkMode?'#222':'#efefef',margin:'8px 18px'}}/>

              {/* BENACHRICHTIGUNGEN */}
              <div onClick={async()=>{
                if(!('Notification' in window)){showMsg(L('Nicht unterstützt', 'Not supported', 'Non pris en charge', 'No compatible'));return;}
                if(Notification.permission==='granted'){showMsg('Benachrichtigungen aktiv 🔔');}
                else if(Notification.permission==='denied'){showMsg('In Browser-Einstellungen erlauben');}
                else{const p=await Notification.requestPermission();showMsg(p==='granted'?'Aktiviert! 🔔':'Abgelehnt');}
              }} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:17,width:24,textAlign:'center',opacity:0.85}}></div>
                  <div>
                    <div style={{color:darkMode?'#e0e0e0':'#222',fontSize:13,fontWeight:600}}>{L('Benachrichtigungen', 'Notifications', 'Notifications', 'Notificaciones')}</div>
                    <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{typeof Notification!=='undefined'&&Notification.permission==='granted'?'Aktiv':'Nicht aktiv'}</div>
                  </div>
                </div>
                <div style={{width:34,height:19,borderRadius:10,background:typeof Notification!=='undefined'&&Notification.permission==='granted'?'#27ae60':'#ccc',position:'relative',flexShrink:0}}>
                  <div style={{position:'absolute',top:2.5,left:typeof Notification!=='undefined'&&Notification.permission==='granted'?17:2.5,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </div>
              </div>

              {/* DARK MODE */}
              <div onClick={()=>{try{localStorage.setItem('fighter_dark_manual','true');}catch{}setDarkMode(d=>!d);}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:17,width:24,textAlign:'center',opacity:0.85}}></div>
                  <div style={{color:darkMode?'#e0e0e0':'#222',fontSize:13,fontWeight:600}}>{L('Dark Mode', 'Dark mode', 'Mode sombre', 'Modo oscuro')}</div>
                </div>
                <div style={{width:34,height:19,borderRadius:10,background:darkMode?RED:'#ccc',position:'relative',flexShrink:0}}>
                  <div style={{position:'absolute',top:2.5,left:darkMode?17:2.5,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </div>
              </div>

              {isAdmin&&(
                <div onClick={()=>{setShowAdmin(true);setShowMenu(false);}} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                  onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontSize:17,width:24,textAlign:'center'}}>⚙️</div>
                  <div style={{color:RED,fontSize:13,fontWeight:700}}>Admin Panel</div>
                </div>
              )}
            </div>
            {/* EINSTELLUNGEN IN SLIDEBAR */}
            <div style={{height:1,background:darkMode?'#222':'#efefef',margin:'8px 18px'}}/>
            <div onClick={()=>setShowSettings(s=>!s)}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
              onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:15,width:24,textAlign:'center',opacity:0.7}}></div>
                <div style={{color:darkMode?'#e0e0e0':'#444',fontSize:13,fontWeight:600}}>{t.settings}</div>
              </div>
              <div style={{color:'#aaa',fontSize:12,transform:showSettings?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s'}}>›</div>
            </div>
            {showSettings&&(
              <div style={{marginLeft:16}}>
                {[
                  {icon:'📋',label:t.impressum,action:()=>{setShowImpressum(true);setShowMenu(false);}},
                  {icon:'🔐',label:t.privacy,action:()=>{setShowDatenschutz(true);setShowMenu(false);}},
                  {icon:'📜',label:t.agb,action:()=>{setShowAGB(true);setShowMenu(false);}},
                  {icon:'🔑',label:t.changePw,action:()=>{setShowPwChange(true);setShowMenu(false);}},
                ].map(item=>(
                  <div key={item.label} onClick={item.action}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'9px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                    onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{fontSize:14,width:24,textAlign:'center',opacity:0.6}}>{item.icon}</div>
                    <div style={{color:darkMode?'#ccc':'#555',fontSize:12,fontWeight:500}}>{item.label}</div>
                  </div>
                ))}
                <div onClick={()=>{
                  if(!window.confirm(L('Account wirklich löschen?', 'Really delete account?', 'Supprimer vraiment le compte ?', '¿Eliminar realmente la cuenta?')))return;
                  if(!window.confirm(L('Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden!', 'Are you sure? This action cannot be undone!', 'Es-tu sûr ? Cette action est irréversible !', '¿Seguro? ¡Esta acción no se puede deshacer!')))return;
                  (async()=>{
                    try{
                      await fetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      await fetch(SUPA_URL+'/rest/v1/matches?profile_a_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      await fetch(SUPA_URL+'/rest/v1/matches?profile_b_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      try{localStorage.clear();}catch{}
                      setSession(null);setMyProfile(null);setShowMenu(false);
                    }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
                  })();
                }}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'9px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                  onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontSize:14,width:24,textAlign:'center',opacity:0.6}}></div>
                  <div style={{color:'#e74c3c',fontSize:12,fontWeight:500}}>{t.deleteAccount}</div>
                </div>
              </div>
            )}

            {/* SPRACHE */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',borderTop:'1px solid '+(darkMode?'#222':'#efefef')}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:15,width:24,textAlign:'center',opacity:0.7}}></div>
                <div style={{color:darkMode?'#aaa':'#666',fontSize:12,fontWeight:600}}>{L('Sprache','Language','Langue','Idioma')}</div>
              </div>
              <div style={{display:'flex',gap:3,background:darkMode?'#222':'#ebebeb',borderRadius:16,padding:3}}>
                {(()=>{
                  let auto=true;try{auto=!localStorage.getItem(LANG_KEY);}catch(e){}
                  return <button onClick={()=>{try{localStorage.removeItem(LANG_KEY);}catch(e){}const dl=detectLangFromDevice();setAppLang(dl);showMsg(makeL(dl)('Automatisch (Gerätesprache) 🌐','Automatic (device language) 🌐',"Automatique (langue de l'appareil) 🌐",'Automático (idioma del dispositivo) 🌐'));}}
                    style={{padding:'3px 9px',borderRadius:13,background:auto?(darkMode?'#333':'#fff'):'transparent',border:'none',color:auto?(darkMode?'#fff':'#111'):(darkMode?'#555':'#999'),fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s',boxShadow:auto?'0 1px 3px rgba(0,0,0,0.12)':'none'}}>🌐 AUTO</button>;
                })()}
                {[['DE','🇩🇪'],['EN','🇬🇧'],['FR','🇫🇷'],['ES','🇪🇸']].map(([lang,flag])=>(
                  <button key={lang} onClick={()=>{setAppLang(lang);try{localStorage.setItem('fighter_lang',lang);}catch{}showMsg(lang==='DE'?'Deutsch 🇩🇪':lang==='FR'?'Français 🇫🇷':lang==='ES'?'Español 🇪🇸':'English 🇬🇧');}}
                    style={{padding:'3px 9px',borderRadius:13,background:appLang===lang?(darkMode?'#333':'#fff'):'transparent',border:'none',color:appLang===lang?(darkMode?'#fff':'#111'):(darkMode?'#555':'#999'),fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s',boxShadow:appLang===lang?'0 1px 3px rgba(0,0,0,0.12)':'none'}}>
                    {flag} {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* FEEDBACK */}
            <div onClick={()=>{setShowFeedback(true);setShowMenu(false);}} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',cursor:'pointer',borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}
              onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#2a2a2a':'#f9f9f9'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontSize:20,width:28,textAlign:'center'}}>📩</div>
              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:15,fontWeight:600}}>{L('Feedback senden', 'Send Feedback', 'Envoyer un retour', 'Enviar comentarios')}</div>
            </div>

            {/* Logout */}
            <div onClick={handleLogout} style={{padding:'10px 18px',borderTop:'1px solid '+(darkMode?'#222':'#efefef'),display:'flex',alignItems:'center',gap:12,cursor:'pointer',borderRadius:8,margin:'4px 8px calc(8px + env(safe-area-inset-bottom))'}}
              onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{color:'#e74c3c',fontSize:13,fontWeight:600}}>{t.logout}</div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedback&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:900,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'24px 20px 40px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>{L('FEEDBACK SENDEN', 'SEND FEEDBACK', 'ENVOYER UN RETOUR', 'ENVIAR COMENTARIOS')}</div>
                <div style={{color:'#aaa',fontSize:11,marginTop:2}}>{L('Hilf uns FighterApp besser zu machen', 'Help us improve FighterApp', 'Aide-nous à améliorer FighterApp', 'Ayúdanos a mejorar FighterApp')}</div>
              </div>
              <button onClick={()=>{setShowFeedback(false);setFeedbackSent(false);setFeedbackText('');}} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#aaa'}}>✕</button>
            </div>
            {feedbackSent?(
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:48,marginBottom:12}}>🙏</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:6}}>{L('DANKE!', 'THANK YOU!', 'MERCI !', '¡GRACIAS!')}</div>
                <div style={{color:'#aaa',fontSize:13}}>{L('Dein Feedback hilft uns die App zu verbessern.', 'Your feedback helps us improve.', 'Ton retour nous aide à améliorer l\'app.', 'Tus comentarios nos ayudan a mejorar la app.')}</div>
                <button onClick={()=>{setShowFeedback(false);setFeedbackSent(false);setFeedbackText('');}}
                  style={{marginTop:20,padding:'12px 32px',borderRadius:10,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                  {L('SCHLIESSEN', 'CLOSE', 'FERMER', 'CERRAR')}
                </button>
              </div>
            ):(
              <>
                <textarea
                  value={feedbackText}
                  onChange={e=>setFeedbackText(e.target.value)}
                  placeholder={L('Was gefällt dir? Was sollen wir verbessern? Ideen für neue Features...', 'What do you like? What should we improve? Ideas for new features...', 'Qu\'est-ce qui te plaît ? Que devrions-nous améliorer ? Des idées de nouvelles fonctionnalités...', '¿Qué te gusta? ¿Qué deberíamos mejorar? Ideas para nuevas funciones...')}
                  rows={5}
                  style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif',resize:'none',boxSizing:'border-box',marginBottom:12}}
                />
                <button onClick={async()=>{
                  if(!feedbackText.trim()){showMsg(L('Bitte Feedback eingeben', 'Please enter feedback', 'Merci de saisir ton retour', 'Escribe tus comentarios'));return;}
                  try{
                    await fetch(SUPA_URL+'/rest/v1/feedback',{
                      method:'POST',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                      body:JSON.stringify({user_id:myProfile?.id,user_name:profile.name,message:feedbackText.trim(),lang:appLang,created_at:new Date().toISOString()})
                    });
                  }catch{}
                  setFeedbackSent(true);
                }} disabled={!feedbackText.trim()}
                  style={{width:'100%',padding:'14px',borderRadius:10,background:feedbackText.trim()?`linear-gradient(135deg,${RED},#e74c3c)`:'#eee',border:'none',color:feedbackText.trim()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:feedbackText.trim()?'pointer':'not-allowed'}}>
                  {L('SENDEN 📩', 'SEND 📩', 'ENVOYER 📩', 'ENVIAR 📩')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FEEDBACK & WÜNSCHE MODAL ── */}
      {showFeedbackModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:900,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'24px 20px 44px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:2}}>{L('FEEDBACK & WÜNSCHE', 'FEEDBACK & WISHES', 'RETOURS & SOUHAITS', 'COMENTARIOS Y DESEOS')}</div>
                <div style={{color:'#aaa',fontSize:11,marginTop:2}}>{L('Hilf uns Fighter App besser zu machen', 'Help us make Fighter App better', 'Aide-nous à améliorer Fighter App', 'Ayúdanos a mejorar Fighter App')}</div>
              </div>
              <button onClick={()=>setShowFeedbackModal(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#aaa'}}>✕</button>
            </div>
            {feedbackSent?(
              <div style={{textAlign:'center',padding:'24px 0'}}>
                <div style={{fontSize:52,marginBottom:12}}>🙏</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:2,marginBottom:6}}>DANKE!</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.7}}>Dein {feedbackType==='wunsch'?'Wunsch':'Feedback'} wurde gesendet. Wir lesen alles!</div>
                <button onClick={()=>{setShowFeedbackModal(false);setFeedbackSent(false);setFeedbackText('');}}
                  style={{marginTop:20,padding:'12px 32px',borderRadius:10,background:`linear-gradient(135deg,#c0392b,#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                  {L('SCHLIESSEN', 'CLOSE', 'FERMER', 'CERRAR')}
                </button>
              </div>
            ):(
              <div>
                {/* Type Toggle */}
                <div style={{display:'flex',gap:8,marginBottom:16,background:darkMode?'#2a2a2a':'#f0f0f0',borderRadius:12,padding:4}}>
                  {[['feedback','💬 Feedback'],['wunsch','⭐ Wunsch / Idee']].map(([type,label])=>(
                    <button key={type} onClick={()=>setFeedbackType(type)}
                      style={{flex:1,padding:'10px',borderRadius:9,background:feedbackType===type?(darkMode?'#1a1a1a':'#fff'):'transparent',border:'none',color:feedbackType===type?(darkMode?'#fff':'#1a1a1a'):(darkMode?'#666':'#aaa'),fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s',boxShadow:feedbackType===type?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{color:'#aaa',fontSize:11,marginBottom:8}}>
                  {feedbackType==='wunsch'?L('Was wünschst du dir für die App? Neue Features, Verbesserungen...', 'What do you wish for in the app? New features, improvements...', 'Que souhaites-tu pour l\'app ? Nouvelles fonctions, améliorations...', '¿Qué deseas para la app? Nuevas funciones, mejoras...'):L('Was läuft gut? Was soll besser werden?', 'What\'s going well? What should be better?', 'Qu\'est-ce qui marche bien ? Qu\'est-ce qui doit être amélioré ?', '¿Qué funciona bien? ¿Qué debería mejorar?')}
                </div>
                <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)}
                  placeholder={feedbackType==='wunsch'?L('z.B. Ich wünsche mir eine Funktion für...', 'e.g. I would like a feature for...', 'p. ex. J\'aimerais une fonction pour...', 'p. ej. Me gustaría una función para...'):L('z.B. Das Matching könnte...', 'e.g. The matching could...', 'p. ex. Le matching pourrait...', 'p. ej. El matching podría...')}
                  rows={5} style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif',resize:'none',boxSizing:'border-box',marginBottom:12}}/>
                <button onClick={async()=>{
                  if(!feedbackText.trim()){showMsg(L('Bitte Text eingeben', 'Please enter some text', 'Saisis un texte', 'Escribe un texto'));return;}
                  try{
                    await fetch(SUPA_URL+'/rest/v1/feedback',{
                      method:'POST',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+(session?.token||SUPA_KEY),Prefer:'return=minimal'},
                      body:JSON.stringify({user_id:myProfile?.id||null,user_name:profile.name||'Unbekannt',message:feedbackText.trim(),type:feedbackType,lang:appLang,read:false,created_at:new Date().toISOString()})
                    });
                  }catch(e){console.error('feedback',e);}
                  setFeedbackSent(true);
                }} disabled={!feedbackText.trim()}
                  style={{width:'100%',padding:'14px',borderRadius:10,background:feedbackText.trim()?`linear-gradient(135deg,#c0392b,#e74c3c)`:'#eee',border:'none',color:feedbackText.trim()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:feedbackText.trim()?'pointer':'not-allowed'}}>
                  {feedbackType==='wunsch'?'⭐ WUNSCH SENDEN':'💬 FEEDBACK SENDEN'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EQUIPMENT MODAL ── */}
      {showEquipment&&(
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f5f5f7',zIndex:900,display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee'),position:'sticky',top:0,zIndex:10}}>
            <button onClick={()=>setShowEquipment(false)} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
            <div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:3}}>{L('EQUIPMENT', 'EQUIPMENT', 'ÉQUIPEMENT', 'EQUIPAMIENTO')}</div>
              <div style={{color:'#aaa',fontSize:11}}>{L('Top Kampfsport-Ausrüstung', 'Top Combat Sports Equipment', 'Équipement arts martiaux', 'Equipamiento top de deportes de combate')}</div>
            </div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%'}}>
            <EquipmentScreen darkMode={darkMode} appLang={appLang} SUPA_URL={SUPA_URL} SUPA_KEY={SUPA_KEY} itemType='equipment'
              referralCount={myProfile?.referral_count||0} onInvite={()=>{setShowEquipment(false);setTab('stats');}}
              onSuggest={()=>{setFeedbackType('wunsch');setFeedbackText('Equipment Empfehlung: ');setShowEquipment(false);setShowFeedbackModal(true);setFeedbackSent(false);}}/>
          </div>
        </div>
      )}

      {showSupplements&&(
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f5f5f7',zIndex:900,display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee'),position:'sticky',top:0,zIndex:10}}>
            <button onClick={()=>setShowSupplements(false)} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
            <div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:3}}>{L('SUPPLEMENTS', 'SUPPLEMENTS', 'COMPLÉMENTS', 'SUPLEMENTOS')}</div>
              <div style={{color:'#aaa',fontSize:11}}>{L('Supplements für Kampfsportler', 'Supplements for Combat Athletes', 'Compléments pour sportifs de combat', 'Suplementos para deportistas de combate')}</div>
            </div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%'}}>
            <EquipmentScreen darkMode={darkMode} appLang={appLang} SUPA_URL={SUPA_URL} SUPA_KEY={SUPA_KEY} itemType='supplement'
              referralCount={myProfile?.referral_count||0} onInvite={()=>{setShowSupplements(false);setTab('stats');}}
              onSuggest={()=>{setFeedbackType('wunsch');setFeedbackText('Supplement Empfehlung: ');setShowSupplements(false);setShowFeedbackModal(true);setFeedbackSent(false);}}/>
          </div>
        </div>
      )}

      {showNews&&(
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f5f5f7',zIndex:900,display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee'),position:'sticky',top:0,zIndex:10}}>
            <button onClick={()=>setShowNews(false)} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
            <div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:3}}>{L('NEWS', 'NEWS', 'ACTUALITÉS', 'NOTICIAS')}</div>
              <div style={{color:'#aaa',fontSize:11}}>{L('Aktuelle Kampfsport-News von Sherdog &amp; BoxingScene', 'Latest combat sports news from Sherdog & BoxingScene', 'Actualités des sports de combat de Sherdog & BoxingScene', 'Últimas noticias de deportes de combate de Sherdog y BoxingScene')}</div>
            </div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%'}}>
            {/* Nachrichten vom Fighter Team (Admin-Broadcasts) zuerst — hier kann
                die komplette Nachricht aus der Push-Benachrichtigung nachgelesen werden */}
            {adminMessages.slice(0,5).map(am=>(
              <div key={am.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1.5px solid '+RED+'66'}}>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
                  <span style={{background:RED,borderRadius:20,padding:'1px 8px',color:'#fff',fontSize:10,fontWeight:700}}>📢 FIGHTER TEAM</span>
                  {am.created_at&&<span style={{color:'#999',fontSize:10}}>{new Date(am.created_at).toLocaleDateString('de-DE')}</span>}
                  {!am.read&&<span style={{background:'#27ae60',borderRadius:20,padding:'1px 8px',color:'#fff',fontSize:9,fontWeight:700}}>{L('NEU', 'NEW', 'NOUVEAU', 'NUEVO')}</span>}
                </div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{am.message}</div>
              </div>
            ))}
            {newsLoading?(
              <div style={{textAlign:'center',padding:'40px 0',color:'#aaa'}}>Lädt...</div>
            ):newsItems.length===0?(
              <div style={{textAlign:'center',padding:'40px 0',color:'#aaa'}}>{L('Keine News gefunden. Später nochmal versuchen.', 'No news found. Try again later.', 'Aucune actualité trouvée. Réessaie plus tard.', 'No se encontraron noticias. Inténtalo más tarde.')}</div>
            ):(
              newsItems.map((item,i)=>(
                <a key={i} href={item.link} target='_blank' rel='noopener noreferrer'
                  style={{display:'block',background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),textDecoration:'none'}}>
                  <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
                    <span style={{background:RED+'18',borderRadius:20,padding:'1px 8px',color:RED,fontSize:10,fontWeight:700}}>{item.source}</span>
                    {item.pubDate&&<span style={{color:'#999',fontSize:10}}>{new Date(item.pubDate).toLocaleDateString('de-DE')}</span>}
                  </div>
                  <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,lineHeight:1.4}}>{item.title}</div>
                  {item.description&&<div style={{color:'#999',fontSize:12,marginTop:5,lineHeight:1.5}}>{item.description}</div>}
                  <div style={{color:RED,fontSize:11,fontWeight:700,marginTop:8}}>{L('Weiterlesen →', 'Read more →', 'Lire la suite →', 'Leer más →')}</div>
                </a>
              ))
            )}
          </div>
        </div>
      )}

      {showGlobe&&(
        <UserGlobe darkMode={darkMode} onClose={()=>setShowGlobe(false)} SUPA_URL={SUPA_URL} SUPA_KEY={SUPA_KEY}/>
      )}

      {/* BEWERTUNGS-AUFFORDERUNG */}
      {showRating&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1500,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={snoozeRating}>
          <div onClick={e=>e.stopPropagation()} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:20,padding:'28px 24px',maxWidth:340,width:'100%',textAlign:'center',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
            <div style={{fontSize:44,marginBottom:8}}>⭐</div>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:1,marginBottom:8}}>
              {L('Gefällt dir die Fighter App?', 'Do you like Fighter?', 'Tu aimes Fighter ?', '¿Te gusta Fighter?')}
            </div>
            <div style={{color:darkMode?'#aaa':'#888',fontSize:14,lineHeight:1.6,marginBottom:22}}>
              {L('Deine Bewertung hilft uns riesig weiter. Vergib ein paar Sterne im App Store!', 'Your rating helps us a lot. Rate us on the App Store!', 'Ton avis nous aide énormément. Note-nous sur l\'App Store !', 'Tu valoración nos ayuda muchísimo. ¡Puntúanos en la App Store!')}
            </div>
            <button onClick={openAppStoreReview} style={{width:'100%',padding:'14px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:1,cursor:'pointer',marginBottom:10,boxShadow:'0 4px 16px rgba(192,57,43,0.3)'}}>
              {L('⭐ JA, BEWERTEN', '⭐ YES, RATE', '⭐ OUI, NOTER', '⭐ SÍ, VALORAR')}
            </button>
            <button onClick={snoozeRating} style={{width:'100%',padding:'10px',borderRadius:12,background:'none',border:'none',color:darkMode?'#888':'#aaa',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {L('Vielleicht später', 'Maybe later', 'Plus tard', 'Quizás más tarde')}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'calc(10px + env(safe-area-inset-top)) 16px 8px',flexShrink:0,borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),background:darkMode?'#1a1a1a':'#fff'}}>
        <div style={{width:36,height:36}}/>
        <div className='rj' style={{fontSize:28,color:darkMode?'#ff4500':'#1a1a1a',letterSpacing:5,position:'absolute',left:'50%',transform:'translateX(-50%)'}}>FIGHTER</div>
        <button onClick={()=>setShowMenu(true)} style={{background:'none',border:'none',cursor:'pointer',width:36,height:36,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,borderRadius:8,marginLeft:'auto'}}>
          <div style={{width:20,height:2,background:darkMode?'#fff':'#1a1a1a',borderRadius:2}}/>
          <div style={{width:20,height:2,background:darkMode?'#fff':'#1a1a1a',borderRadius:2}}/>
          <div style={{width:20,height:2,background:darkMode?'#fff':'#1a1a1a',borderRadius:2}}/>
        </button>
      </div>

      {updateAvailable&&(
        <div style={{background:'linear-gradient(135deg,#16a085,#27ae60)',padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>⬆️</span>
          <div style={{flex:1}}>
            <div style={{color:'#fff',fontSize:12,fontWeight:700}}>Neue Version verfügbar ({latestVersion})</div>
            <div style={{color:'rgba(255,255,255,0.85)',fontSize:10,marginTop:2,lineHeight:1.4}}>{L('Aktualisiere jetzt für die neuesten Funktionen & Fixes', 'Update now for the latest features & fixes', 'Mets à jour pour les dernières fonctions et corrections', 'Actualiza ahora para las últimas funciones y correcciones')}</div>
          </div>
          <button onClick={()=>{try{window.open('https://apps.apple.com/app/id'+APP_STORE_ID,'_blank');}catch{window.location.href='https://apps.apple.com/app/id'+APP_STORE_ID;}}} style={{background:'rgba(255,255,255,0.25)',border:'none',borderRadius:8,color:'#fff',fontSize:11,fontWeight:700,padding:'6px 12px',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>{L('UPDATE', 'UPDATE', 'METTRE À JOUR', 'ACTUALIZAR')}</button>
          <button onClick={()=>setUpdateAvailable(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:6,color:'#fff',fontSize:16,padding:'4px 8px',cursor:'pointer',flexShrink:0}}>✕</button>
        </div>
      )}
      {showPushReminder&&(
        <div style={{background:'linear-gradient(135deg,#c0392b,#e74c3c)',padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{color:'#fff',fontSize:12,fontWeight:700}}>{L('Verpasse keine Matches & Nachrichten!', 'Don\'t miss any matches & messages!', 'Ne rate aucun match ni message !', '¡No te pierdas ningún match ni mensaje!')}</div>
            <div style={{color:'rgba(255,255,255,0.85)',fontSize:10,marginTop:2,lineHeight:1.4}}>{L('iPhone-Einstellungen → Fighter → Mitteilungen → Erlauben', 'iPhone Settings → Fighter → Notifications → Allow', 'Réglages iPhone → Fighter → Notifications → Autoriser', 'Ajustes del iPhone → Fighter → Notificaciones → Permitir')}</div>
          </div>
          <button onClick={()=>setShowPushReminder(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:6,color:'#fff',fontSize:16,padding:'4px 10px',cursor:'pointer',flexShrink:0}}>✕</button>
        </div>
      )}
      <div ref={mainScrollRef} style={{flex:1,overflowY:tab==='swipe'?'hidden':'auto',overscrollBehavior:'contain',paddingBottom:tab==='swipe'?0:'calc(68px + env(safe-area-inset-bottom))'}}>

        {myProfile&&!myProfile.avatar_url&&(
          <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(13,13,13,0.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center'}}>
            <div style={{fontSize:54,marginBottom:18}}>📸</div>
            <div className='rj' style={{fontSize:28,color:'#fff',letterSpacing:2,marginBottom:14}}>{L('PROFILBILD FEHLT', 'PHOTO REQUIRED', 'PHOTO REQUISE', 'FALTA LA FOTO')}</div>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:15,lineHeight:1.6,maxWidth:320,marginBottom:24,fontFamily:'DM Sans,sans-serif'}}>{L('Lade ein Profilbild hoch. Ohne Foto wirst du NICHT in den Swipe-Karten angezeigt.', 'Add a profile photo. Without one you will NOT appear in the swipe cards.', 'Ajoute une photo de profil. Sans photo, tu n\'apparais PAS dans les cartes de swipe.', 'Sube una foto de perfil. Sin foto NO aparecerás en las tarjetas de swipe.')}</div>
            {avatarPreview&&<img loading="lazy" src={avatarPreview} alt='' style={{width:120,height:120,borderRadius:'50%',objectFit:'cover',border:'3px solid '+RED,marginBottom:20}}/>}
            <label style={{display:'inline-block',padding:'14px 28px',borderRadius:12,background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.25)',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:1,cursor:'pointer',marginBottom:14}}>
              {uploading?(L('Lädt...', 'Uploading...', 'Chargement...', 'Subiendo...')):avatarPreview?(L('Foto ändern', 'Change photo', 'Changer la photo', 'Cambiar foto')):(L('Foto auswählen', 'Choose photo', 'Choisir une photo', 'Elegir foto'))}
              <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
            </label>
            {avatarUrl&&<button onClick={saveProfile} disabled={saving} style={{display:'block',width:'100%',maxWidth:280,padding:'14px',borderRadius:12,background:saving?'#444':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:saving?'not-allowed':'pointer'}}>{saving?(L('Speichert...', 'Saving...', 'Enregistrement...', 'Guardando...')):(L('SPEICHERN', 'SAVE', 'ENREGISTRER', 'GUARDAR'))}</button>}
          </div>
        )}
        {tab==='swipe'&&(
          <div onTouchMove={(e)=>{if(!drag)e.preventDefault();}} style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8,touchAction:'none'}}>
            {/* GPS-HINWEIS BANNER */}
            {/* LAND FILTER */}
            <div style={{display:'flex',gap:4,marginBottom:6,width:'calc(100% - 24px)',maxWidth:420,justifyContent:'center'}}>
              <button onClick={()=>setCountryFilter('mine')} style={{padding:'3px 12px',borderRadius:20,background:'transparent',border:'none',color:countryFilter==='mine'?(darkMode?'#fff':'#1a1a1a'):(darkMode?'#444':'#ccc'),fontSize:11,fontWeight:countryFilter==='mine'?700:400,cursor:'pointer',transition:'all 0.2s'}}>
                {({'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[profile.country||'DE']||'🌍')} {t.myCountry}
              </button>
              <div style={{width:1,background:darkMode?'#333':'#e0e0e0',margin:'4px 0'}}/>
              <button onClick={()=>setCountryFilter('world')} style={{padding:'3px 12px',borderRadius:20,background:'transparent',border:'none',color:countryFilter==='world'?(darkMode?'#fff':'#1a1a1a'):(darkMode?'#444':'#ccc'),fontSize:11,fontWeight:countryFilter==='world'?700:400,cursor:'pointer',transition:'all 0.2s'}}>
                {t.worldwide}
              </button>
            </div>
            {/* WER HAT MICH GELIKET Banner */}
            {/* Banner bleibt sichtbar, bis die Liste wirklich leer ist -
                nicht nur bis er einmal angetippt wurde */}
            {whoLikedMe.length>0&&(
              <div onClick={()=>{
                setWhoLikedTab(true);
                setNewLikesCount(0);
                const now=new Date().toISOString();
                setLikesBannerSeen(now);
                try{localStorage.setItem('fighter_likes_check',now);setLastLikesCheck(now);localStorage.setItem('fighter_banner_seen',now);}catch{}
              }} style={{width:'calc(100% - 24px)',maxWidth:420,marginBottom:6,background:'transparent',border:'1px solid '+RED+'33',borderRadius:8,padding:'6px 12px',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <div style={{fontSize:14}}>❤️</div>
                <div style={{flex:1,color:darkMode?'#aaa':'#888',fontSize:11}}>{whoLikedMe.length} {t.interestBanner}</div>
                {newLikesCount>0&&<div style={{background:RED,color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{newLikesCount}</div>}
              </div>
            )}
            <div style={{width:'calc(100% - 24px)',maxWidth:380,margin:'0 0 8px',background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {avatarPreview?<img loading="lazy" src={avatarPreview} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+RED}} alt='me'/>
                :<div style={{fontSize:20,width:36,height:36,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center'}}>🥊</div>}
              <div style={{flex:1}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{profile.name}, {profile.age} - {profile.city}</div>
                <div style={{color:RED,fontSize:11,marginTop:1}}>{profile.style} - {profile.weightClass?profile.weightClass.split(' (')[0]:''}</div>
              </div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'right'}}>{profile.height}cm<br/>{profile.weight}kg</div>
            </div>
            {/* FILTER LEISTE - leer, kein Stil-Filter in Swipe Tab */}
            {matchTierRef.current==='minimal'&&visibleCards.length>0&&(
              <div style={{width:'calc(100% - 24px)',maxWidth:380,margin:'0 0 8px',background:'#8e44ad15',border:'1px solid #8e44ad33',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>💡</span>
                <div style={{color:darkMode?'#ccc':'#666',fontSize:11,lineHeight:1.4}}>{L('Noch wenige Kämpfer in deiner Nähe — wir zeigen dir daher einen größeren Umkreis. Lad Freunde ein, um die Auswahl zu vergrößern!', 'Still few fighters near you — so we show a wider area. Invite friends to grow the selection!', 'Encore peu de combattants près de toi — nous élargissons donc le périmètre. Invite des amis pour agrandir le choix !', 'Aún hay pocos luchadores cerca de ti, por eso mostramos un área mayor. ¡Invita a amigos para ampliar la selección!')}</div>
              </div>
            )}
            <div style={{position:'relative',width:'min(330px, calc(100vw - 40px))',height:'min(430px, 58dvh)',flexShrink:0,touchAction:'none'}}>
              {visibleCards.length===0?(
                <div style={{width:'100%',height:'100%',borderRadius:20,background:'linear-gradient(160deg,#1a1a1a 0%,#2d1a1a 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'30px 24px',textAlign:'center'}}>
                  <div style={{fontSize:64,marginBottom:4}}>🏆</div>
                  <div className='rj' style={{color:'#fff',fontSize:26,letterSpacing:3,lineHeight:1}}>{t.allFightersSeen}</div>
                  <div className='rj' style={{color:RED,fontSize:26,letterSpacing:3,lineHeight:1}}>{t.allFightersSeen2}</div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:6,lineHeight:1.6}}>{filterWeightClass&&myWeightClass?`Keine Fighter in deiner Nähe gefunden. Lade Trainingspartner ein, damit es hier voller wird.`:`Alle Fighter wurden gesehen! Neue kommen täglich dazu. Je mehr Kämpfer aus deiner Stadt dabei sind, desto mehr Matches – lade Trainingspartner ein.`}</div>
                  <div style={{display:'flex',gap:12,marginTop:8,width:'100%'}}>
                    <button onClick={async()=>{setSwStats({ch:0,de:0});if(session&&myProfile){await loadRealFighters(session,myProfile);}}} style={{flex:1,padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer'}}>
                      {L('🔄 NEUE FIGHTER', '🔄 NEW FIGHTERS', '🔄 NOUVEAUX COMBATTANTS', '🔄 NUEVOS LUCHADORES')}
                    </button>
                    <button onClick={()=>setTab('chat')} style={{flex:1,padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer'}}>
                      💬 CHATS
                    </button>
                  </div>
                  <button onClick={inviteFriends} style={{marginTop:2,width:'100%',padding:'12px',borderRadius:10,background:'transparent',color:'#fff',border:'1px dashed rgba(255,255,255,0.35)',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer'}}>
                    {L('👥 TRAININGSPARTNER EINLADEN', '👥 INVITE TRAINING PARTNERS', '👥 INVITER DES PARTENAIRES D\'ENTRAÎNEMENT', '👥 INVITAR COMPAÑEROS DE ENTRENAMIENTO')}
                  </button>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:4}}>{L('Tipp: Doppel-Tap auf eine Karte = Profil ansehen', 'Tip: Double-tap a card = view profile', 'Conseil: Double-tap sur une carte = voir le profil', 'Consejo: toca dos veces una tarjeta = ver perfil')}</div>
                </div>
              ):visibleCards.slice(-3).map((f,idx,arr)=>{
                // NUR die obersten 3 Karten rendern (nicht alle 150-370)!
                // Vorher lag jede Karte als <img> position:absolute inset:0
                // GESTAPELT im DOM - dadurch galten ALLE Bilder als "sichtbar",
                // loading="lazy" griff nicht, und die iOS-WebView dekodierte
                // hunderte Fotos gleichzeitig -> Speicher-Absturz -> App startet
                // bei jedem Swipe neu. 3 Karten reichen für den Stapel-Effekt.
                if(!f||!f.id||!f.name)return null;
                const isTop=idx===arr.length-1;const isSec=idx===arr.length-2;const fA=f.accent||'#c0392b';
                return(
                  <div key={f.id} onMouseDown={isTop?(e)=>{e.preventDefault();dragStart(e);}:undefined} onTouchStart={e=>{
                      if(isTop){
                        if(!e.touches||!e.touches[0])return;
                        const now=Date.now();
                        if(now-lastTapRef.current<300){setViewProfile(f);lastTapRef.current=0;}
                        else{lastTapRef.current=now;dragStart(e);}
                      }
                    }}
                    style={{position:'absolute',inset:0,borderRadius:16,background:'#111',boxShadow:isTop?'0 8px 32px rgba(0,0,0,0.2)':'none',cursor:isTop?'grab':'default',zIndex:isTop?10:isSec?5:1,transform:isTop?cStyle.transform:isSec?'scale(0.96) translateY(10px)':'scale(0.92) translateY(20px)',
                      // Karten dahinter ruecken jetzt sanft nach vorne, statt
                      // beim Wegswipen ruckartig zu "springen" - nur waehrend
                      // des aktiven Ziehens bleibt es uebergangslos, damit die
                      // Karten nicht seltsam mitwackeln.
                      transition:isTop?cStyle.transition:(drag?'none':'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)'),
                      overflow:'hidden',userSelect:'none'}}>
                    {f.avatar_url
                      // Bewusst KEIN loading="lazy" hier - bei den gestapelten
                      // Karten (position:absolute) bringt das nichts (siehe
                      // Kommentar oben), koennte den Bild-Download aber sogar
                      // unnoetig verzoegern. Die oberste Karte bekommt zudem
                      // hohe Ladepriorisierung, damit sie so schnell wie
                      // moeglich erscheint.
                      ?<img src={f.avatar_url} fetchpriority={isTop?'high':'auto'} decoding="async" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:(f.img_pos_x||50)+'% '+(f.img_pos_y||30)+'%',filter:isTop?'none':'blur(14px) brightness(0.6)'}} alt={f.name}/>
                      :<div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,${fA}55 0%,#111 100%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:120}}>{f.emoji||''}</div>
                    }
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.95) 100%)'}}/>
                    {isTop&&(<>
                      <div style={{position:'absolute',top:22,left:18,border:'3px solid #27ae60',borderRadius:6,padding:'3px 12px',color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,letterSpacing:3,transform:'rotate(-18deg)',opacity:fop,transition:drag?'none':'opacity 0.12s'}}>FIGHT</div>
                      <div style={{position:'absolute',top:22,right:18,border:'3px solid '+RED,borderRadius:6,padding:'3px 12px',color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,letterSpacing:3,transform:'rotate(18deg)',opacity:pop,transition:drag?'none':'opacity 0.12s'}}>PASS</div>
                      <div onClick={e=>{e.stopPropagation();setViewProfile(f);}} style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.45)',borderRadius:20,padding:'4px 12px',display:'flex',alignItems:'center',gap:5,cursor:'pointer',backdropFilter:'blur(4px)'}}>
                        <span style={{fontSize:12}}>👁</span>
                        <span style={{color:'rgba(255,255,255,0.85)',fontSize:10,fontWeight:600,letterSpacing:0.5}}>{t.profileSeen}</span>
                      </div>
                    </>)}
                    <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'12px 16px 16px'}}> 
                      <div style={{display:'flex',gap:8,marginBottom:8}}>
                        {[{v:f.wins||0,l:L('SIEGE', 'WINS', 'VICTOIRES', 'VICTORIAS'),c:'#27ae60'},{v:f.losses||0,l:L('NIEDER', 'LOSSES', 'DÉFAITES', 'DERROTAS'),c:'#e74c3c'},{v:f.draws||0,l:L('UNENTSCH', 'DRAWS', 'NULS', 'EMPATES'),c:'#d4a017'},{v:f.ko||0,l:'KOs',c:'#e74c3c'}].map(({v,l,c})=>(
                          <div key={l} style={{textAlign:'center',background:'rgba(0,0,0,0.5)',borderRadius:8,padding:'4px 8px'}}>
                            <div className='rj' style={{color:c,fontSize:18,lineHeight:1}}>{v}</div>
                            <div style={{color:'rgba(255,255,255,0.55)',fontSize:7,letterSpacing:1}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div className='rj' style={{color:'#fff',fontSize:26,letterSpacing:1.5,lineHeight:1}}>
                            {f.name}{f.age?<span style={{fontSize:19,opacity:0.75}}>, {f.age}</span>:null}
                          </div>
                          <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap'}}>
                            {f.style&&<div style={{background:fA,borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>{f.style}</div>}
                            {(f.weight_class||f.weightClass)&&<div style={{background:normalizeWeightClass(f.weight_class||f.weightClass)===myWeightClass?'rgba(211,84,0,0.7)':'rgba(255,255,255,0.2)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:normalizeWeightClass(f.weight_class||f.weightClass)===myWeightClass?700:400}}>⚖️ {(f.weight_class||f.weightClass||'').split(' (')[0]}{normalizeWeightClass(f.weight_class||f.weightClass)===myWeightClass?' ✓':''}</div>}
                            {f.is_pro&&<div style={{background:'#d4a01733',borderRadius:20,padding:'2px 10px',color:'#d4a017',fontSize:11,fontWeight:700}}>{L('⭐ PROFI', '⭐ PRO', '⭐ PRO', '⭐ PRO')}</div>}
                          {f.country&&f.country!=='DE'&&f.country!=='OTHER'&&<div style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'2px 8px',color:'#fff',fontSize:13}}>{{'AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[f.country]||'🌍'}</div>}
                          {f.city&&<div style={{background:f._sameCity?'rgba(39,174,96,0.3)':'rgba(255,255,255,0.2)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11}}>📍 {f.city}{f._dist&&f._dist<500&&!f._sameCity?' · '+f._dist+'km':''}{f._sameCity?' · Deine Stadt':''}</div>}
                          {f._sameStyle&&<div style={{background:'rgba(192,57,43,0.5)',border:'1px solid rgba(192,57,43,0.7)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>{L('🥊 Gleicher Stil', '🥊 Same style', '🥊 Même style', '🥊 Mismo estilo')}</div>}
                       {f._sameWC&&<div style={{background:'rgba(212,160,23,0.5)',border:'1px solid rgba(212,160,23,0.7)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>{L('⚖️ Gleiche Klasse', '⚖️ Same class', '⚖️ Même catégorie', '⚖️ Misma categoría')}</div>}
                       {f._sameCity&&!f._sameStyle&&<div style={{background:'rgba(39,174,96,0.5)',border:'1px solid rgba(39,174,96,0.7)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>{L('📍 In deiner Nähe', '📍 Near you', '📍 Près de toi', '📍 Cerca de ti')}</div>}
                          </div>
                          {f.bio&&<div style={{color:'rgba(255,255,255,0.5)',fontSize:10,marginTop:5,fontStyle:'italic'}}>"{f.bio}"</div>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0,marginLeft:10}}>
                          {f.height&&<div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{f.height} cm</div>}
                          {f.weight&&<div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{f.weight} kg</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cards.length>0&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginTop:10}}>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  <Btn onClick={()=>doSwipe('de')} color={RED} icon='✕' size={54}/>
                  {lastSwiped&&<Btn onClick={undoSwipe} color='rgba(255,255,255,0.2)' icon='↩️' size={46}/>}
                  <Btn onClick={()=>doSwipe('ch')} color='#27ae60' icon='⚔️' size={64} primary label='FIGHT'/>
                  <Btn onClick={()=>doSwipe('ch')} color='#d4a017' icon='⭐' size={54}/>
                </div>
                {recentSwiped.length>0&&(
                  <div style={{padding:'4px 16px 0',width:'100%',maxWidth:420}}>
                    <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:2,marginBottom:6,textAlign:'center',fontWeight:700}}>{t.recentlySeen}</div>
                    <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                      {recentSwiped.map((s,i)=>(
                        <div key={i} onClick={()=>setViewProfile(s.profile)} style={{position:'relative',cursor:'pointer'}}>
                          <div style={{width:44,height:44,borderRadius:10,overflow:'hidden',border:'2px solid '+(s.dir==='like'?'#27ae60':RED)}}>
                            {s.profile.avatar_url?<img loading="lazy" src={s.profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='' onError={e=>{e.target.style.display='none'}}/>:<div style={{width:'100%',height:'100%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🥊</div>}
                          </div>
                          <div style={{position:'absolute',bottom:-2,right:-2,fontSize:8,background:s.dir==='like'?'#27ae60':RED,borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700}}>{s.dir==='like'?'✓':'✕'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}


        {tab==='chat'&&(
          <div style={{padding:'14px',maxWidth:420,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3}}>{t.messages}</div>
              {dbMatches.length>0&&<div style={{color:'#aaa',fontSize:11}}>{dbMatches.length} Match{dbMatches.length!==1?'es':''}</div>}
            </div>
            {/* Nachrichten vom Fighter Team — stehen wie ein normaler Chat
                ganz oben, aber optisch abgesetzt. Der Tipp oeffnet die
                News-Ansicht, wo die vollstaendigen Nachrichten schon
                dargestellt werden - bewusst keine zweite Anzeige dafuer. */}
            {adminMessages.length>0&&(()=>{
              const ungelesen=adminMessages.filter(m=>!m.read).length;
              const neueste=adminMessages[0];
              return(
                <div onClick={async()=>{setShowNews(true);await markAdminMessagesRead();}}
                  style={{display:'flex',alignItems:'center',gap:12,background:darkMode?'#2a1414':'#fdecea',borderRadius:13,padding:'13px',marginBottom:8,border:'1px solid '+RED+'44',cursor:'pointer'}}>
                  <div style={{width:54,height:54,borderRadius:'50%',background:RED,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>📢</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>Fighter App Team</span>
                      <span style={{background:RED,borderRadius:20,padding:'1px 6px',color:'#fff',fontSize:9,fontWeight:700}}>SYSTEM</span>
                    </div>
                    <div style={{color:darkMode?'#aaa':'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {neueste?.message||''}
                    </div>
                  </div>
                  {ungelesen>0&&(
                    <div style={{flexShrink:0,minWidth:22,height:22,borderRadius:11,background:'#27ae60',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>
                      {ungelesen}
                    </div>
                  )}
                </div>
              );
            })()}
            {dbMatches.length>3&&(
              <div style={{position:'relative',marginBottom:10}}>
                <input
                  value={chatSearch}
                  onChange={e=>setChatSearch(e.target.value)}
                  placeholder={t.searchFighter}
                  style={{width:'100%',padding:'9px 12px 9px 36px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#1a1a1a':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}
                />
                <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#aaa',fontSize:14}}>🔍</div>
                {chatSearch&&<div onClick={()=>setChatSearch('')} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#aaa',cursor:'pointer',fontSize:14}}>✕</div>}
              </div>
            )}
            {matchesLoading&&dbMatches.length===0?(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,padding:'13px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:12,opacity:1-i*0.2}}>
                    <div style={{width:54,height:54,borderRadius:'50%',background:darkMode?'#2a2a2a':'#f0f0f0',flexShrink:0,animation:'pulse 1.5s infinite'}}/>
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
                      <div style={{height:14,borderRadius:7,background:darkMode?'#2a2a2a':'#f0f0f0',width:'60%',animation:'pulse 1.5s infinite'}}/>
                      <div style={{height:10,borderRadius:5,background:darkMode?'#222':'#f5f5f5',width:'40%',animation:'pulse 1.5s infinite'}}/>
                    </div>
                  </div>
                ))}
              </div>
            ):dbMatches.length===0?(
              <div style={{textAlign:'center',padding:'48px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                <div style={{fontSize:70,marginBottom:4}}>🥊</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>{t.noMatches}</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.8,maxWidth:260,textAlign:'center'}}>{t.noMatchesSub}</div>
                <button onClick={()=>setTab('swipe')} style={{marginTop:10,padding:'14px 32px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:'pointer',boxShadow:'0 4px 16px rgba(192,57,43,0.3)'}}>
                  {L('⚔️ JETZT SWIPEN', '⚔️ SWIPE NOW', '⚔️ SWIPER MAINTENANT', '⚔️ HAZ SWIPE YA')}
                </button>
                <button onClick={inviteFriends} style={{padding:'12px 28px',borderRadius:12,background:'transparent',color:darkMode?'#ddd':'#555',border:'1px dashed '+(darkMode?'#555':'#bbb'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1.5,cursor:'pointer'}}>
                  {L('👥 TRAININGSPARTNER EINLADEN', '👥 INVITE TRAINING PARTNERS', '👥 INVITER DES PARTENAIRES D\'ENTRAÎNEMENT', '👥 INVITAR COMPAÑEROS DE ENTRENAMIENTO')}
                </button>
                <div style={{color:'#ddd',fontSize:11,marginTop:2}}>{t.newFightersDaily}</div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[...dbMatches].sort((a,b)=>{
                  // chatSortByOnline: Status-Stufe (gruen > blau > orange), dann zuletzt online, dann letzte Nachricht
                  const oa=a.profile_a_id===myProfile?.id?a.profile_b:a.profile_a;
                  const ob=b.profile_a_id===myProfile?.id?b.profile_b:b.profile_a;
                  const ta=oa?.last_seen?new Date(oa.last_seen).getTime():0;
                  const tb=ob?.last_seen?new Date(ob.last_seen).getTime():0;
                  const now=Date.now();
                  const tier=t=>t&&now-t<300000?0:t&&now-t<86400000?1:2;
                  if(tier(ta)!==tier(tb))return tier(ta)-tier(tb);
                  if(ta!==tb)return tb-ta;
                  return new Date(b.last_message_at||b.created_at||0)-new Date(a.last_message_at||a.created_at||0);
                }).filter(m=>{
                  if(!chatSearch)return true;
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return false;
                  const q=chatSearch.toLowerCase();
                  return (other.name||'').toLowerCase().includes(q)||(other.city||'').toLowerCase().includes(q)||(other.style||'').toLowerCase().includes(q);
                }).map(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return null;
                  const ageMs=other?.last_seen?(Date.now()-new Date(other.last_seen).getTime()):Infinity;
                  // gruen = online, blau = vor kurzem, orange = laenger nicht da
                  const statusColor=ageMs<300000?'#27ae60':ageMs<86400000?'#2980b9':'#e67e22';
                  const isOnline=ageMs<300000;
                  const ac=statusColor;
                  if(!m.id)return null;
                  return(
                    <SwipeableChatRow key={m.id} darkMode={darkMode} onDelete={()=>deleteChat(m.id)}>
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,border:'1px solid '+ac+'33',overflow:'hidden',boxShadow:isOnline?'0 0 14px '+ac+'66':'0 1px 6px rgba(0,0,0,0.06)',width:'100%',boxSizing:'border-box'}}>
                      <div style={{height:3,background:'linear-gradient(90deg,'+ac+',transparent)'}}/>
                      <div style={{padding:'13px',display:'flex',alignItems:'center',gap:10,minHeight:84,boxSizing:'border-box'}}>
                        <div onClick={()=>setViewProfile(other)} style={{cursor:'pointer',flexShrink:0,position:'relative'}}>
                          {other.avatar_url?<img loading="lazy" src={other.avatar_url} style={{width:54,height:54,borderRadius:'50%',objectFit:'cover',border:'2px solid '+ac+'44'}} alt={other.name}/>
                          :<div style={{width:54,height:54,borderRadius:'50%',background:ac+'18',border:'2px solid '+ac+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🥊</div>}
                          {/* grüner Punkt am Avatar: online = in den letzten 5 Minuten aktiv
                              (gleiche Schwelle wie der Status im offenen Chat-Fenster) */}
                        </div>
                        <div style={{flex:1,minWidth:0}} onClick={()=>setViewProfile(other)} >
                          <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{other.name}</div>
                          </div>
                          <div style={{color:ac,fontSize:11,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{other.style} · {other.city}</div>
                          {m.last_message_text?(
                            <div style={{color:darkMode?'#555':'#aaa',fontSize:11,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                              {m.last_message_text.startsWith('⚔️')?'⚔️ Fight Request':m.last_message_text.startsWith('✅')?'✅ Angenommen':m.last_message_text.startsWith('❌')?'❌ Abgelehnt':m.last_message_text}
                            </div>
                          ):(
                            <div style={{color:'#ccc',fontSize:11,marginTop:2,fontStyle:'italic'}}>{L('Noch keine Nachrichten', 'No messages yet', 'Pas encore de messages', 'Aún no hay mensajes')}</div>
                          )}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0,width:64,minWidth:0}}>
                          <div style={{color:'#ccc',fontSize:10}}>{m.last_message_at?new Date(m.last_message_at).toLocaleDateString('de',{day:'2-digit',month:'2-digit'}):''}</div>
                          {other.last_seen&&<div style={{color:ac,fontSize:9,marginTop:3,lineHeight:1.25,whiteSpace:'normal',wordBreak:'break-word',overflowWrap:'anywhere'}}>{getLastSeen(other.last_seen)}</div>}
                        </div>
                        <div onClick={()=>setActiveChat(m)} style={{padding:'9px 12px',borderRadius:8,background:'linear-gradient(135deg,#c0392b,#e74c3c)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>CHAT →</div>
                      </div>
                    </div>
                    </SwipeableChatRow>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab==='stats'&&(
          <div
            onTouchStart={(e)=>{swipeStartX.current=e.touches[0].clientX;}}
            onTouchEnd={(e)=>{
              if(swipeStartX.current==null)return;
              const dx=e.changedTouches[0].clientX-swipeStartX.current;
              if(dx<-80){setShowGlobe(true);}
              swipeStartX.current=null;
            }}
            style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            {/* EDIT MODAL */}
            {editMode&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 40px',maxHeight:'85vh',overflowY:'auto'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                    <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>{L('PROFIL BEARBEITEN', 'EDIT PROFILE', 'MODIFIER LE PROFIL', 'EDITAR PERFIL')}</div>
                    <button onClick={()=>setEditMode(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#aaa'}}>✕</button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {/* FOTO ÄNDERN */}
                    <div style={{textAlign:'center',marginBottom:4}}>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{L('PROFILBILD', 'PROFILE PHOTO', 'PHOTO DE PROFIL', 'FOTO DE PERFIL')}</div>
                      <label style={{cursor:'pointer',display:'inline-block',position:'relative'}}>
                        <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                          const file=e.target.files[0];if(!file||!session)return;
                          showMsg(L('Foto wird hochgeladen...', 'Uploading photo...', 'Chargement de la photo...', 'Subiendo foto...'));
                          const compressed=await compressImage(file,800,0.82);
                          const path='fighter_'+session.userId+'_'+Date.now()+'.jpg';
                          const url=await uploadPhoto(compressed,path,session.token);
                          if(url){
                            setAvatarUrl(url);setAvatarPreview(url);
                            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                              method:'PATCH',
                              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                              body:JSON.stringify({avatar_url:url})
                            });
                            showMsg(L('Foto geändert ✓', 'Photo changed ✓', 'Photo modifiée ✓', 'Foto cambiada ✓'));
                          }
                        }}/>
                        <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',border:'3px solid '+RED,background:'#f0f0f0',margin:'0 auto',position:'relative'}}>
                          {avatarPreview?<img loading="lazy" src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>👤</div>}
                          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:18}}>📷</span>
                          </div>
                        </div>
                        <div style={{color:RED,fontSize:11,marginTop:5,fontWeight:700}}>Foto ändern</div>
                      </label>
                    </div>
                    {[[L('NAME *', 'NAME *', 'NOM *', 'NOMBRE *'),'name','text',profile.name],[L('STADT *', 'CITY *', 'VILLE *', 'CIUDAD *'),'city','text',profile.city],['GYM','gym','text',profile.gym],[L('GRÖSSE (cm)', 'HEIGHT (cm)', 'TAILLE (cm)', 'ALTURA (cm)'),'height','number',profile.height],['GEWICHT (kg)','weight','number',profile.weight],['BIO','bio','text',profile.bio],['INSTAGRAM / YOUTUBE','socialUrl','text',profile.socialUrl]].map(([label,key,type,current])=>(
                      <div key={key}>
                        <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{label}</div>
                        <input type={type} defaultValue={current||''} onChange={e=>setEditProfile(p=>({...p,[key]:e.target.value}))}
                          style={{width:'100%',padding:'11px 13px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}/>
                      </div>
                    ))}
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{L('KAMPFSTIL (mehrere möglich)', 'FIGHTING STYLE (multiple allowed)', 'STYLE DE COMBAT (plusieurs possibles)', 'ESTILO DE COMBATE (varios posibles)')}</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {STYLES.map(s=>{
                          const currentStyles=(editProfile.style!==undefined?editProfile.style:profile.style)||'';
                          const selected=currentStyles.split(',').map(x=>x.trim()).filter(Boolean);
                          const isSelected=selected.includes(s);
                          return(<button key={s} onClick={()=>{
                            const cur=currentStyles.split(',').map(x=>x.trim()).filter(Boolean);
                            const next=isSelected?cur.filter(x=>x!==s):[...cur,s];
                            setEditProfile(p=>({...p,style:next.join(', ')}));
                          }} style={{padding:'7px 13px',borderRadius:20,background:isSelected?RED:'transparent',border:'1px solid '+(isSelected?RED:(darkMode?'#333':'#ddd')),color:isSelected?'#fff':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:700,cursor:'pointer'}}>
                            {s}
                          </button>);
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('GEWICHTSKLASSE', 'WEIGHT CLASS', 'CATÉGORIE DE POIDS', 'CATEGORÍA DE PESO')}</div>
                      <select defaultValue={normalizeWeightClass(profile.weightClass)||''} onChange={e=>setEditProfile(p=>({...p,weightClass:e.target.value}))}
                        style={{width:'100%',padding:'11px 13px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif'}}>
                        <option value=''>{L('Bitte wählen', 'Please select', 'Choisir', 'Selecciona')}</option>
                        {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{L('GESCHLECHT', 'GENDER', 'GENRE', 'GÉNERO')}</div>
                      <div style={{display:'flex',gap:8,marginBottom:12}}>
                        {[['Mann','♂️','male'],['Frau','♀️','female']].map(([label,icon,val])=>(
                          <button key={val} onClick={()=>setEditProfile(p=>({...p,gender:val}))}
                            style={{flex:1,padding:'8px 4px',borderRadius:10,border:'2px solid '+((editProfile.gender!==undefined?editProfile.gender:(profile.gender||'male'))===val?RED:(darkMode?'#333':'#e0e0e0')),background:(editProfile.gender!==undefined?editProfile.gender:(profile.gender||'male'))===val?'#fdf0ef':'transparent',cursor:'pointer',textAlign:'center'}}>
                            <div style={{fontSize:18}}>{icon}</div>
                            <div style={{color:(editProfile.gender!==undefined?editProfile.gender:(profile.gender||'male'))===val?RED:(darkMode?'#aaa':'#555'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12}}>{label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{L('LEVEL', 'LEVEL', 'NIVEAU', 'NIVEL')}</div>
                      <div style={{display:'flex',gap:8}}>
                        {[['Amateur','🥋',false],['Profi','⭐',true]].map(([label,icon,val])=>(
                          <button key={label} onClick={()=>setEditProfile(p=>({...p,isPro:val}))}
                            style={{flex:1,padding:'10px',borderRadius:10,border:'2px solid '+((editProfile.isPro!==undefined?editProfile.isPro:profile.isPro)===val?RED:(darkMode?'#333':'#e0e0e0')),background:(editProfile.isPro!==undefined?editProfile.isPro:profile.isPro)===val?'#fdf0ef':'transparent',cursor:'pointer'}}>
                            <div style={{fontSize:18}}>{icon}</div>
                            <div style={{color:(editProfile.isPro!==undefined?editProfile.isPro:profile.isPro)===val?RED:(darkMode?'#aaa':'#555'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13}}>{label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{L('LAND', 'COUNTRY', 'PAYS', 'PAÍS')}</div>
                      <select defaultValue={profile.country||'DE'} onChange={e=>setEditProfile(p=>({...p,country:e.target.value}))}
                        style={{width:'100%',padding:'11px 13px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif'}}>
                        {[['DE','🇩🇪 Deutschland'],['AT','🇦🇹 Österreich'],['CH','🇨🇭 Schweiz'],['FR','🇫🇷 Frankreich'],['GB','🇬🇧 UK'],['US','🇺🇸 USA'],['NL','🇳🇱 Niederlande'],['BE','🇧🇪 Belgien'],['IT','🇮🇹 Italien'],['ES','🇪🇸 Spanien'],['BG','🇧🇬 Bulgarien'],['HR','🇭🇷 Kroatien'],['CY','🇨🇾 Zypern'],['CZ','🇨🇿 Tschechien'],['DK','🇩🇰 Dänemark'],['EE','🇪🇪 Estland'],['FI','🇫🇮 Finnland'],['GR','🇬🇷 Griechenland'],['HU','🇭🇺 Ungarn'],['IE','🇮🇪 Irland'],['LV','🇱🇻 Lettland'],['LT','🇱🇹 Litauen'],['LU','🇱🇺 Luxemburg'],['MT','🇲🇹 Malta'],['PL','🇵🇱 Polen'],['PT','🇵🇹 Portugal'],['RO','🇷🇴 Rumänien'],['SK','🇸🇰 Slowakei'],['SI','🇸🇮 Slowenien'],['SE','🇸🇪 Schweden'],['OTHER','🌍 Andere']].map(([code,label])=>(
                          <option key={code} value={code}>{label.slice(0,label.indexOf(' ')+1)+countryName(code,label.slice(label.indexOf(' ')+1),appLang)}</option>
                        ))}
                      </select>
                      <div style={{color:'#999',fontSize:11,marginTop:5,lineHeight:1.4}}>{L('Wirkt sich sofort auf dein Matching aus (z.B. Land-Filter und Rangliste).', 'Takes effect on your matching immediately (e.g. country filter and ranking).', 'Prend effet immédiatement sur ton matching (p. ex. filtre pays et classement).', 'Afecta de inmediato a tu matching (p. ej., filtro de país y ranking).')}</div>
                    </div>
                    {(editProfile.style||profile.style||'').split(',').map(x=>x.trim()).some(s=>BELT_STYLES.includes(s))&&(
                      <div>
                        <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{L('GUERTELRANG', 'BELT RANK', 'GRADE DE CEINTURE', 'GRADO DE CINTURÓN')}</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                          {BELT_RANKS.map(b=>{
                            const currentBelt=editProfile.belt!==undefined?editProfile.belt:profile.belt;
                            return(<button key={b} onClick={()=>setEditProfile(p=>({...p,belt:b}))}
                              style={{padding:'7px 13px',borderRadius:8,border:'1px solid '+(currentBelt===b?RED:(darkMode?'#333':'#ddd')),background:currentBelt===b?'#fdf0ef':'transparent',color:currentBelt===b?RED:(darkMode?'#aaa':'#666'),fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer'}}>{b}</button>);
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{background:'#f8f4ff',border:'1px solid #e0d4f7',borderRadius:12,padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{color:'#1a1a1a',fontSize:12,fontWeight:700}}>{L('🎓 Bist du auch Trainer?', '🎓 Are you also a coach?', '🎓 Es-tu aussi coach ?', '🎓 ¿Eres también entrenador?')}</div>
                        <button onClick={()=>setEditProfile(p=>({...p,isCoach:!(p.isCoach!==undefined?p.isCoach:profile.isCoach)}))}
                          style={{padding:'6px 14px',borderRadius:8,border:'2px solid '+((editProfile.isCoach!==undefined?editProfile.isCoach:profile.isCoach)?'#8e44ad':'#ddd'),background:(editProfile.isCoach!==undefined?editProfile.isCoach:profile.isCoach)?'#8e44ad':'#fff',color:(editProfile.isCoach!==undefined?editProfile.isCoach:profile.isCoach)?'#fff':'#888',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                          {(editProfile.isCoach!==undefined?editProfile.isCoach:profile.isCoach)?'Ja ✓':'Nein'}
                        </button>
                      </div>
                      {(editProfile.isCoach!==undefined?editProfile.isCoach:profile.isCoach)&&(
                        <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:10}}>
                          <div style={{position:'relative'}}>
                            <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('GYM / VEREIN', 'GYM / CLUB', 'SALLE / CLUB', 'GIMNASIO / CLUB')}</div>
                            <input value={editProfile.coachGym!==undefined?editProfile.coachGym:(profile.coachGym||'')} onChange={e=>{
                                const v=e.target.value;
                                setEditProfile(p=>({...p,coachGym:v}));
                                if(v.length>=2){
                                  const q=v.toLowerCase();
                                  const matches=ALL_GYMS_FLAT.filter(g=>g.name.toLowerCase().includes(q)||g.ct.toLowerCase().includes(q));
                                  setCoachGymSuggestions(matches.slice(0,6));
                                  setShowCoachGymSuggestions(true);
                                }else{
                                  setShowCoachGymSuggestions(false);
                                }
                              }} placeholder='z.B. Tiger Gym Berlin'
                              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                            {showCoachGymSuggestions&&coachGymSuggestions.length>0&&(
                              <div style={{position:'absolute',top:'100%',left:0,right:0,background:darkMode?'#1a1a1a':'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),zIndex:100,overflow:'hidden',marginTop:4}}>
                                {coachGymSuggestions.map((g,i)=>(
                                  <div key={i} onClick={()=>{setEditProfile(p=>({...p,coachGym:g.name}));setShowCoachGymSuggestions(false);}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',borderBottom:i<coachGymSuggestions.length-1?'1px solid '+(darkMode?'#2a2a2a':'#f5f5f5'):'none'}}>
                                    <div style={{width:32,height:32,borderRadius:8,flexShrink:0,overflow:'hidden',background:darkMode?'#111':'#f5f5f7',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                      {(gymLogos[g.code]?.logo_url||g.logo_url)
                                        ?<img loading="lazy" src={gymLogos[g.code]?.logo_url||g.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>
                                        :g.emoji?<div style={{fontSize:18}}>{g.emoji}</div>
                                        :<div style={{color:'#bbb',fontSize:9,fontWeight:700}}>{(g.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                                    </div>
                                    <div style={{flex:1}}>
                                      <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{g.name}</div>
                                      <div style={{color:'#aaa',fontSize:11}}>📍 {g.ct}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('JAHRE ERFAHRUNG ALS TRAINER', 'YEARS OF EXPERIENCE AS A COACH', 'ANNÉES D\'EXPÉRIENCE COMME COACH', 'AÑOS DE EXPERIENCIA COMO ENTRENADOR')}</div>
                            <input type='number' value={editProfile.coachExperience!==undefined?editProfile.coachExperience:(profile.coachExperience||'')} onChange={e=>setEditProfile(p=>({...p,coachExperience:e.target.value}))} placeholder='z.B. 8'
                              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                          </div>
                          <div>
                            <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('UNTERRICHTETE KAMPFSTILE', 'STYLES YOU TEACH', 'STYLES ENSEIGNÉS', 'ESTILOS QUE ENSEÑAS')}</div>
                            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                              {STYLES.map(s=>{
                                const currentStyles=editProfile.coachStyles!==undefined?editProfile.coachStyles:(profile.coachStyles||'');
                                const selected=currentStyles.split(',').map(x=>x.trim()).filter(Boolean);
                                const isSelected=selected.includes(s);
                                return(<button key={s} onClick={()=>{
                                  const next=isSelected?selected.filter(x=>x!==s):[...selected,s];
                                  setEditProfile(p=>({...p,coachStyles:next.join(', ')}));
                                }} style={{padding:'6px 11px',borderRadius:4,border:'1px solid '+(isSelected?'#8e44ad':'#ddd'),background:isSelected?'#f5edfc':'transparent',color:isSelected?'#8e44ad':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:700,cursor:'pointer'}}>{s}</button>);
                              })}
                            </div>
                          </div>
                          <div>
                            <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('TRAINER-BIO', 'COACH BIO', 'BIO DU COACH', 'BIO DE ENTRENADOR')}</div>
                            <input value={editProfile.coachBio!==undefined?editProfile.coachBio:(profile.coachBio||'')} onChange={e=>setEditProfile(p=>({...p,coachBio:e.target.value}))} placeholder='Erfolge, dein Ansatz...'
                              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                          </div>
                          <div>
                            <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('TRAINER-PROFILBILD', 'COACH PROFILE PHOTO', 'PHOTO DE PROFIL DU COACH', 'FOTO DE PERFIL DE ENTRENADOR')}</div>
                            <div style={{color:'#888',fontSize:11,marginBottom:8,lineHeight:1.5}}>{L('Wird in der Trainer-Rangliste gezeigt — kann sich von deinem normalen Profilbild unterscheiden.', 'Shown in the coach ranking — can differ from your normal profile photo.', 'Affichée dans le classement des coachs — peut différer de ta photo de profil habituelle.', 'Se muestra en el ranking de entrenadores — puede ser distinta de tu foto de perfil normal.')}</div>
                            <div style={{display:'flex',alignItems:'center',gap:14}}>
                              <div style={{width:60,height:60,borderRadius:12,background:coachAvatarPreview?'#000':(darkMode?'#111':'#f5edfc'),border:'2px solid '+(coachAvatarPreview?'#8e44ad':(darkMode?'#333':'#ddd')),overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                {coachAvatarPreview
                                  ?<img loading="lazy" src={coachAvatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={L('Trainer-Profilbild', 'Coach profile photo', 'Photo de profil du coach', 'Foto de perfil de entrenador')}/>
                                  :<div style={{fontSize:20}}>🎓</div>}
                              </div>
                              <label style={{padding:'9px 14px',borderRadius:8,background:'#8e44ad',color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                                {uploadingCoachAvatar?'Lädt...':coachAvatarPreview?'Foto ändern':'Foto auswählen'}
                                <input type='file' accept='image/*' onChange={handleCoachAvatarUpload} disabled={uploadingCoachAvatar} style={{display:'none'}}/>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={saveEditProfile} disabled={savingEdit}
                      style={{width:'100%',marginTop:6,padding:'14px',borderRadius:12,background:savingEdit?'#eee':`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:savingEdit?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:savingEdit?'not-allowed':'pointer'}}>
                      {savingEdit?'Speichern...':'SPEICHERN'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {(()=>{
              const prog=profileProgressOf(myProfile,gymVerified);
              if(!prog||prog.pct>=100||!prog.next)return null;
              const nk=prog.next.k;
              return(
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+RED+'33',marginBottom:11,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:16,letterSpacing:1.5,marginBottom:8}}>{L('DEIN PROFIL IST '+prog.pct+' % VOLLSTÄNDIG','YOUR PROFILE IS '+prog.pct+' % COMPLETE','TON PROFIL EST COMPLET À '+prog.pct+' %','TU PERFIL ESTÁ COMPLETO AL '+prog.pct+' %')}</div>
                  <div style={{height:8,borderRadius:4,background:darkMode?'#2a2a2a':'#eee',overflow:'hidden',marginBottom:10}}>
                    <div style={{width:prog.pct+'%',height:'100%',borderRadius:4,background:`linear-gradient(90deg,${RED},${LIGHT_RED})`,transition:'width 0.4s'}}/>
                  </div>
                  <div style={{color:darkMode?'#bbb':'#555',fontSize:13,lineHeight:1.5,marginBottom:10}}>{L('Nächster Schritt: ','Next step: ','Prochaine étape : ','Siguiente paso: ')}{progressLabel(prog.next.k,prog.next.label,L)}</div>
                  <button onClick={()=>{
                    if(nk==='record')setTab('ranking');
                    else if(nk==='gymver')setShowGymVerify(true);
                    else{setEditProfile({});setEditMode(true);}
                  }} style={{width:'100%',padding:'11px',borderRadius:10,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer'}}>{L('JETZT ERLEDIGEN', 'DO IT NOW', 'FAIS-LE MAINTENANT', 'HAZLO AHORA')}</button>
                </div>
              );
            })()}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:11,textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',position:'relative'}}>
              <div style={{position:'absolute',top:12,right:12,display:'flex',gap:6,alignItems:'center'}}>
                <button onClick={()=>{
                  const shareText=`⚔️ ${profile.name} ${L('auf Fighter','on Fighter','sur Fighter','en Fighter')}\n${profile.style} · ${profile.weightClass?profile.weightClass.split(' (')[0]:''}\n📍 ${profile.city}\n\n${L('Finde mich und andere Kämpfer in deiner Nähe auf Fighter:','Find me and other fighters near you on Fighter:','Trouve-moi et d\'autres combattants près de chez toi sur Fighter :','Encuéntrame a mí y a otros luchadores cerca de ti en Fighter:')}`;
                  shareLink({title:'Fighter — '+profile.name,text:shareText,url:inviteUrl(myProfile?.id),onCopied:()=>showMsg(L('Profil-Link kopiert! 📋', 'Profile link copied! 📋', 'Lien du profil copié ! 📋', '¡Enlace del perfil copiado! 📋'))});
                }} style={{background:'none',border:'none',color:darkMode?'#666':'#aaa',fontSize:16,cursor:'pointer',padding:'4px'}}>
                  🔗
                </button>
                <button onClick={()=>{setEditProfile({});setEditMode(true);}} style={{background:'none',border:'none',color:darkMode?'#666':'#aaa',fontSize:20,cursor:'pointer',padding:'4px 4px',letterSpacing:2}}>
                  ···
                </button>
              </div>
              <div style={{position:'relative',display:'inline-block',marginBottom:10}}>
                <label style={{cursor:'pointer'}}>
                  <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                  <div style={{width:160,height:160,borderRadius:16,background:'#f0f0f0',border:'3px solid '+(avatarPreview?RED:'#ddd'),overflow:'hidden',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {uploading?<div style={{fontSize:24}} className='spin'>⏳</div>:avatarPreview?<img loading="lazy" src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='avatar'/>:<div style={{fontSize:32}}>👤</div>}
                  </div>
                  <div style={{position:'absolute',bottom:0,right:0,background:RED,borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📷</div>
                </label>
              </div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>{profile.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2,justifyContent:'center',flexWrap:'wrap'}}><span style={{color:RED,fontSize:13,fontWeight:600}}>{profile.style}</span>{profile.style&&profile.weightClass&&<span style={{color:'#aaa',fontSize:13}}>·</span>}<span style={{color:RED,fontSize:13,fontWeight:600}}>{profile.weightClass?profile.weightClass.split(' (')[0]:''}</span>{profile.gender&&profile.gender!=='male'&&<span style={{background:profile.gender==='female'?'#e8197818':'#8e44ad18',borderRadius:20,padding:'2px 8px',color:profile.gender==='female'?'#e81978':'#8e44ad',fontSize:11,fontWeight:700}}>{profile.gender==='female'?'♀️ Frau':'⚧️ Divers'}</span>}</div>
              <div style={{color:darkMode?'#666':'#999',fontSize:11,marginTop:3}}>📍 {profile.city} - 🏋️ {profile.gym} · {({'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[profile.country||'DE']||'🌍')}</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:5,background:profile.isPro?'#d4a01718':'#2980b918',border:'1px solid '+(profile.isPro?'#d4a01744':'#2980b944'),borderRadius:20,padding:'3px 10px',marginTop:6,marginRight:4}}>
                <span style={{color:profile.isPro?'#d4a017':'#2980b9',fontSize:11,fontWeight:700}}>{profile.isPro?'⭐ PROFI':'🥋 AMATEUR'}</span>
              </div>
              {gymVerified&&(
                <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#27ae6018',border:'1px solid #27ae6044',borderRadius:20,padding:'3px 10px',marginTop:6}}>
                  <span style={{fontSize:13}}>{gymVerified.gymEmoji}</span>
                  <span style={{color:'#27ae60',fontSize:11,fontWeight:700}}>✅ Verifiziertes Mitglied · {gymVerified.gymName}</span>
                </div>
              )}
              {profile.bio&&<div style={{color:'#aaa',fontSize:12,marginTop:6,fontStyle:'italic'}}>'{profile.bio}'</div>}
            </div>

            {/* FREUNDE EINLADEN / REWARD-SYSTEM */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:11,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:15,letterSpacing:1}}>{L('🎁 FREUNDE EINLADEN', '🎁 INVITE FRIENDS', '🎁 INVITER DES AMIS', '🎁 INVITA A AMIGOS')}</div>
                <div style={{color:RED,fontSize:13,fontWeight:700}}>{myProfile?.referral_count||0} {(myProfile?.referral_count||0)===1?'Freund':'Freunde'}</div>
              </div>
              <div style={{color:darkMode?'#999':'#666',fontSize:12,marginBottom:12,lineHeight:1.4}}>
                {L('Lade Freunde mit deinem Link ein. Jeder, der sich registriert und sein Profil fertig anlegt, schaltet dir den nächsten Marken-Rabattcode bei Equipment und Supplements frei.','Invite friends with your link. Everyone who signs up and completes their profile unlocks your next brand discount code in Equipment and Supplements.',"Invite des amis avec ton lien. Chaque personne qui s'inscrit et termine son profil débloque pour toi le prochain code de remise de marque dans Équipement et Compléments.",'Invita a amigos con tu enlace. Cada persona que se registre y complete su perfil te desbloquea el siguiente código de descuento de marca en Equipamiento y Suplementos.')}
              </div>
              <button onClick={()=>{
                const inviteLink='https://fighterapp.de/?ref='+(myProfile?.id||'');
                const shareText=L('🥊 Komm zu Fighter! Melde dich mit meinem Link an: ', '🥊 Join me on Fighter! Sign up with my link: ', '🥊 Rejoins-moi sur Fighter ! Inscris-toi avec mon lien : ', '🥊 ¡Ven a Fighter! Regístrate con mi enlace: ')+inviteLink;
                if(navigator.share){navigator.share({title:'Fighter App',text:shareText,url:inviteLink}).catch(()=>{});}
                else{navigator.clipboard?.writeText(inviteLink);showMsg(L('Einladungslink kopiert! 📋', 'Invite link copied! 📋', 'Lien d\'invitation copié ! 📋', '¡Enlace de invitación copiado! 📋'));}
              }} style={{width:'100%',padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer',marginBottom:12}}>
                {L('🔗 EINLADUNGSLINK TEILEN', '🔗 SHARE INVITE LINK', '🔗 PARTAGER LE LIEN D\'INVITATION', '🔗 COMPARTIR ENLACE DE INVITACIÓN')}
              </button>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[['🛒 Equipment','equipment',()=>{setShowEquipment(true);}],['💊 Supplements','supplement',()=>{setShowSupplements(true);}]].map(([label,key,openScreen])=>{
                  const refCount=myProfile?.referral_count||0;
                  const cat=rewardBrands[key]||{order:[],labelByKey:{}};
                  const total=cat.order.length;
                  const unlockedN=Math.min(refCount,total);
                  const nextBrandKey=unlockedN<total?cat.order[unlockedN]:null;
                  const nextBrandLabel=nextBrandKey?cat.labelByKey[nextBrandKey]:null;
                  return (
                    <div key={key} onClick={openScreen} role='button' style={{padding:'10px 12px',borderRadius:10,background:darkMode?'#111':'#f5f5f7',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:700}}>{label}</span>
                        <span style={{color:total>0&&unlockedN===total?'#27ae60':RED,fontSize:12,fontWeight:700}}>{unlockedN}/{total} Marken</span>
                      </div>
                      {total===0&&<div style={{color:darkMode?'#777':'#999',fontSize:11,marginTop:3}}>{L('Noch keine Marken-Rabatte hier', 'No brand discounts here yet', 'Pas encore de remises de marques ici', 'Aún no hay descuentos de marcas aquí')}</div>}
                      {total>0&&nextBrandLabel&&<div style={{color:darkMode?'#777':'#999',fontSize:11,marginTop:3}}>🔒 Nächster Code: {nextBrandLabel} (ab {unlockedN+1} {unlockedN+1===1?'Freund':'Freunden'})</div>}
                      {total>0&&!nextBrandLabel&&<div style={{color:'#27ae60',fontSize:11,marginTop:3}}>{L('✅ Alle Marken-Codes freigeschaltet!', '✅ All brand codes unlocked!', '✅ Tous les codes de marque sont débloqués !', '✅ ¡Todos los códigos de marca desbloqueados!')}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GALERIE */}
            <div style={{marginBottom:9}}>
              <div style={{color:darkMode?'#888':'#999',fontSize:10,letterSpacing:1,marginBottom:6,fontWeight:600}}>📸 FOTOS ({myGallery.length}/3)</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
                {[0,1,2].map(i=>{
                  const g=myGallery[i];
                  return (
                    <div key={i} style={{position:'relative',aspectRatio:'1/1',borderRadius:11,overflow:'hidden',background:darkMode?'#1a1a1a':'#f0f0f0',border:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8')}}>
                      {g?(
                        <>
                          <img loading="lazy" src={g} alt='' onClick={()=>setLightboxImg(g)} style={{width:'100%',height:'100%',objectFit:'contain',cursor:'zoom-in'}}/>
                          <button onClick={()=>removeGalleryPhoto(g)} style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:11,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                        </>
                      ):(
                        <label style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',cursor:uploadingGallery?'not-allowed':'pointer'}}>
                          <span style={{fontSize:22,color:darkMode?'#555':'#bbb'}}>{uploadingGallery?'⏳':'+'}</span>
                          <input type='file' accept='image/*' onChange={handleGalleryUpload} disabled={uploadingGallery} style={{display:'none'}}/>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:9}}>
              {[[L('SIEGE', 'WINS', 'VICTOIRES', 'VICTORIAS'),stats.wins,'#27ae60'],[L('NIEDERLAGEN', 'LOSSES', 'DÉFAITES', 'DERROTAS'),stats.losses,RED],[L('UNENTSCHIEDEN', 'DRAWS', 'NULS', 'EMPATES'),stats.draws,'#d4a017']].map(([label,val,color])=>(
                <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:11,padding:'13px 5px',textAlign:'center',border:'1px solid '+color+'33',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div className='rj' style={{color:color,fontSize:36,lineHeight:1}}>{val}</div>
                  <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:9}}>
              {[['KO / TKO',stats.ko,RED,'KO-Rate: '+kr+'%',kr],['SIEGRATE',wr+'%','#27ae60',tf+' Kaempfe',wr]].map(([label,val,color,sub,pct])=>(
                <div key={label} style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{color:'#bbb',fontSize:9,letterSpacing:2}}>{label}</div>
                  <div className='rj' style={{color:color,fontSize:30,marginTop:3}}>{val}</div>
                  <div style={{color:'#ccc',fontSize:10,marginTop:2}}>{sub}</div>
                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:2}}/></div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:9}}>
              <div style={{color:'#ccc',fontSize:9,letterSpacing:2,marginBottom:11}}>{L('REKORD BEARBEITEN', 'EDIT RECORD', 'MODIFIER LE PALMARÈS', 'EDITAR RÉCORD')}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5}}>
                {[['wins',L('SIEGE', 'WINS', 'VICTOIRES', 'VICTORIAS'),'#27ae60'],['losses',L('NIEDER', 'LOSSES', 'DÉFAITES', 'DERROTAS'),RED],['draws',L('UNENTSCH', 'DRAWS', 'NULS', 'EMPATES'),'#d4a017'],['ko','KOs',RED]].map(([key,label,color])=>(
                  <div key={key} style={{textAlign:'center'}}>
                    <div style={{color:'#ccc',fontSize:8,marginBottom:3}}>{label}</div>
                    <button onClick={()=>setStats(s=>({...s,[key]:s[key]+1}))} style={{width:'100%',background:'#f5f5f5',border:'1px solid '+color+'22',borderRadius:4,color:color,fontSize:13,cursor:'pointer',padding:'3px 0',marginBottom:3}}>+</button>
                    <div className='rj' style={{color:color,fontSize:20}}>{stats[key]}</div>
                    <button onClick={()=>setStats(s=>({...s,[key]:Math.max(0,s[key]-1)}))} style={{width:'100%',background:'#f5f5f5',border:'1px solid #eee',borderRadius:4,color:'#ccc',fontSize:13,cursor:'pointer',padding:'3px 0',marginTop:3}}>−</button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} style={{width:'100%',padding:'14px',borderRadius:10,background:saving?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:saving?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:saving?'not-allowed':'pointer',transition:'all 0.2s'}}>
              {saving?t.saving:t.saveProfil}
            </button>
            {/* VERIFIZIERTER KAMPFREKORD */}
            <div id='record-verify-box' style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginTop:8,marginBottom:8}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:10}}>{L('🏅 KAMPFREKORD VERIFIZIEREN', '🏅 VERIFY FIGHT RECORD', '🏅 VÉRIFIER LE PALMARÈS', '🏅 VERIFICAR RÉCORD DE COMBATE')}</div>
              <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>{L('Lade ein Foto deiner Urkunde, Medaille oder eines offiziellen Kampfergebnisses hoch. Dein Rekord bekommt dann ein ✅ Verifiziert-Badge.', 'Upload a photo of your certificate, medal or an official fight result. Your record then gets a ✅ Verified badge.', 'Charge une photo de ton diplôme, de ta médaille ou d\'un résultat officiel. Ton palmarès reçoit alors un badge ✅ Vérifié.', 'Sube una foto de tu diploma, medalla o un resultado oficial. Tu récord recibirá entonces una insignia ✅ Verificado.')}</div>
              <label style={{cursor:'pointer',display:'block'}}>
                <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                  const file=e.target.files[0];if(!file||!session)return;
                  showMsg('Wird hochgeladen...');
                  const compressed=await compressImage(file,1200,0.85);
                  const path='record_'+session.userId+'_'+Date.now()+'.jpg';
                  const url=await uploadPhoto(compressed,path,session.token);
                  if(url){
                    await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                      method:'PATCH',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                      body:JSON.stringify({record_proof_url:url,record_verified:'pending'})
                    });
                    showMsg(L('✅ Nachweis hochgeladen! Wird innerhalb 48h geprüft.', '✅ Proof uploaded! It will be reviewed within 48h.', '✅ Justificatif chargé ! Vérification sous 48 h.', '✅ ¡Comprobante subido! Se revisará en 48 h.'));
                  }else showMsg('Upload fehlgeschlagen');
                }}/>
                <div style={{background:darkMode?'#111':'#f5f5f5',border:'1.5px dashed '+(myProfile?.record_verified==='verified'?'#27ae60':myProfile?.record_verified==='pending'?'#d4a017':'#ccc'),borderRadius:10,padding:'14px',textAlign:'center'}}>
                  {myProfile?.record_verified==='verified'?(
                    <div><div style={{fontSize:24}}>✅</div><div style={{color:'#27ae60',fontWeight:700,fontSize:12,marginTop:4}}>{L('REKORD VERIFIZIERT', 'RECORD VERIFIED', 'PALMARÈS VÉRIFIÉ', 'RÉCORD VERIFICADO')}</div></div>
                  ):myProfile?.record_verified==='pending'?(
                    <div><div style={{fontSize:24}}>⏳</div><div style={{color:'#d4a017',fontWeight:700,fontSize:12,marginTop:4}}>{L('WIRD GEPRÜFT', 'UNDER REVIEW', 'EN COURS DE VÉRIFICATION', 'EN REVISIÓN')}</div><div style={{color:'#aaa',fontSize:10,marginTop:2}}>{L('Bis zu 48 Stunden', 'Up to 48 hours', 'Jusqu\'à 48 heures', 'Hasta 48 horas')}</div></div>
                  ):(
                    <div><div style={{fontSize:24}}>📄</div><div style={{color:darkMode?'#aaa':'#888',fontSize:12,marginTop:4}}>{L('Urkunde / Medaille hochladen', 'Upload certificate / medal', 'Charger un diplôme / une médaille', 'Subir diploma / medalla')}</div><div style={{color:'#ccc',fontSize:10,marginTop:2}}>JPG, PNG · max 5MB</div></div>
                  )}
                </div>
              </label>
            </div>
            {/* STANDORT */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(locationSource==='gps'?'#27ae6044':locationSource==='ip'?'#2980b944':(darkMode?'#2a2a2a':'#eee')),marginTop:10}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:locationSource==='gps'?'#27ae6018':locationSource==='ip'?'#2980b918':'#f5f5f5',border:'1px solid '+(locationSource==='gps'?'#27ae6044':locationSource==='ip'?'#2980b944':'#eee'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                  📍
                </div>
                <div style={{flex:1}}>
                  <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>
                    {locationSource==='gps'?'GPS Standort aktiv ✅':locationSource==='ip'?'Standort via IP 🌐':'Kein Standort'}
                  </div>
                  <div style={{color:locationSource==='gps'?'#27ae60':locationSource==='ip'?'#2980b9':'#aaa',fontSize:11,marginTop:1}}>
                    {locationSource==='gps'?'Genauer Standort — beste Matching-Ergebnisse':locationSource==='ip'?L('Ungefährer Standort — GPS für bessere Ergebnisse aktivieren', 'Approximate location — enable GPS for better results', 'Position approximative — active le GPS pour de meilleurs résultats', 'Ubicación aproximada: activa el GPS para mejores resultados'):L('GPS aktivieren für besseres Matching', 'Enable GPS for better matching', 'Active le GPS pour un meilleur matching', 'Activa el GPS para un mejor matching')}
                  </div>
                  {myLat&&myLon&&<div style={{color:'#ccc',fontSize:10,marginTop:2}}>{myLat.toFixed(4)}, {myLon.toFixed(4)}</div>}
                </div>
              </div>
              {locationSource!=='gps'&&(
                <button onClick={getGPSLocation} disabled={locationLoading}
                  style={{width:'100%',marginTop:12,padding:'11px',borderRadius:10,background:locationLoading?'#eee':'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:locationLoading?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:locationLoading?'not-allowed':'pointer'}}>
                  {locationLoading?L('GPS wird ermittelt...', 'Getting GPS location...', 'Localisation GPS en cours...', 'Obteniendo ubicación GPS...'):L('📍 PRÄZISEN STANDORT AKTIVIEREN', '📍 ENABLE PRECISE LOCATION', '📍 ACTIVER LA POSITION PRÉCISE', '📍 ACTIVAR UBICACIÓN PRECISA')}
                </button>
              )}
              {locationSource==='gps'&&(
                <button onClick={()=>{
                  setLocationSource('city');setMyLat(null);setMyLon(null);
                  if(session&&myProfile){
                    fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({lat:null,lon:null,location_source:'city'})});
                  }
                  showMsg('GPS Standort entfernt');
                }} style={{width:'100%',marginTop:12,padding:'9px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c44',color:'#e74c3c',fontFamily:'DM Sans,sans-serif',fontSize:12,cursor:'pointer'}}>
                  {L('GPS zurücksetzen', 'Reset GPS', 'Réinitialiser le GPS', 'Restablecer GPS')}
                </button>
              )}
            </div>

            {/* GYM VERIFIZIERUNG */}
            <div onClick={()=>setShowGymVerify(true)} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(gymVerified?'#27ae6044':(darkMode?'#2a2a2a':'#eee')),marginTop:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,borderRadius:10,background:gymVerified?'#27ae6018':'#f5f5f5',border:'1px solid '+(gymVerified?'#27ae6044':'#eee'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                {gymVerified?gymVerified.gymEmoji:'🏅'}
              </div>
              <div style={{flex:1}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{gymVerified?t.gymVerified2:t.gymVerify}</div>
                <div style={{color:gymVerified?'#27ae60':'#aaa',fontSize:11,marginTop:1}}>{gymVerified?gymVerified.gymName+' · '+gymVerified.gymCity:t.gymCodeEnter}</div>
              </div>
              <div style={{color:'#bbb',fontSize:18}}>›</div>
            </div>
            {/* TRAININGS-HISTORIE */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2}}>{t.trainingHistory}</div>
                  <div style={{color:'#aaa',fontSize:10,marginTop:2}}>{t.trainingWith}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <div style={{color:'#aaa',fontSize:9,textAlign:'right'}}>{historyPublic?L('Öffentlich', 'Public', 'Public', 'Público'):L('Privat', 'Private', 'Privé', 'Privado')}</div>
                  <div onClick={async()=>{
                    const next=!historyPublic;
                    setHistoryPublic(next);
                    try{localStorage.setItem('fighter_history_public',String(next));}catch{}
                    // In Supabase speichern
                    if(session&&myProfile){
                      try{
                        await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                          method:'PATCH',
                          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                          body:JSON.stringify({history_public:next})
                        });
                      }catch(e){console.error('history_public save error',e);}
                    }
                    showMsg(next?L('Trainings-Historie ist jetzt öffentlich 👁', 'Training history is now public 👁', 'L\'historique d\'entraînement est maintenant public 👁', 'El historial de entrenamiento ahora es público 👁'):L('Trainings-Historie ist jetzt privat 🔒', 'Training history is now private 🔒', 'L\'historique d\'entraînement est maintenant privé 🔒', 'El historial de entrenamiento ahora es privado 🔒'));
                  }} style={{width:38,height:22,borderRadius:11,background:historyPublic?'#27ae60':'#ccc',position:'relative',cursor:'pointer',flexShrink:0}}>
                    <div style={{position:'absolute',top:3,left:historyPublic?19:3,width:16,height:16,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>
              </div>
              {!historyPublic&&(
                <div style={{background:darkMode?'#111':'#f5f5f7',borderRadius:8,padding:'8px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:14}}>🔒</span>
                  <div style={{color:'#aaa',fontSize:11}}>{L('Nur du siehst deine Trainings-Historie. Aktiviere den Toggle um sie öffentlich zu machen.', 'Only you can see your training history. Turn on the toggle to make it public.', 'Toi seul vois ton historique d\'entraînement. Active l\'interrupteur pour le rendre public.', 'Solo tú ves tu historial de entrenamiento. Activa el interruptor para hacerlo público.')}</div>
                </div>
              )}
              {fightHistory.length===0?(
                <div style={{textAlign:'center',padding:'12px 0'}}>
                  <div style={{fontSize:28,marginBottom:6}}>🤝</div>
                  <div style={{color:'#bbb',fontSize:12}}>{t.noHistory}</div>
                  <div style={{color:'#ccc',fontSize:10,marginTop:3}}>{t.historyHint}</div>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {fightHistory.slice(0,15).map((f,i)=>{
                    const histRow=(
                    <div style={{background:darkMode?'#111':'#f9f9f9',borderRadius:10,padding:'10px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:8,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>🥊</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.opponent_name}</div>
                        <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{f.opponent_style||''}{f.opponent_style&&f.fight_type?' · ':''}{f.fight_type||''}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{color:'#aaa',fontSize:10}}>{f.fight_date||''}</div>
                        {f.location&&<div style={{color:'#ccc',fontSize:9,marginTop:1}}>📍 {f.location}</div>}
                      </div>
                    </div>
                    );
                    return f.id
                      ?<SwipeableChatRow key={f.id} darkMode={darkMode} radius={10} bg={darkMode?'#111':'#f9f9f9'} confirmText={L('Diesen Eintrag aus deiner Trainingshistorie löschen?', 'Delete this entry from your training history?', 'Supprimer cette entrée de ton historique d\'entraînement ?', '¿Eliminar esta entrada de tu historial de entrenamiento?')} onDelete={()=>deleteHistoryEntry(f)}>{histRow}</SwipeableChatRow>
                      :<div key={i}>{histRow}</div>;
                  })}
                </div>
              )}
            </div>
            {dbMatches.length>3&&(
              <div style={{marginTop:14}}>
                <div style={{color:'#bbb',fontSize:9,letterSpacing:2,marginBottom:8,fontWeight:700}}>{L('MEINE MATCHES', 'MY MATCHES', 'MES MATCHS', 'MIS MATCHES')}</div>
                {dbMatches.map(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return null;
                  return(<div key={m.id} onClick={()=>setActiveChat(m)} style={{background:'#fff',borderRadius:10,padding:'11px 13px',border:'1px solid #eee',marginBottom:7,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                    {other.avatar_url?<img loading="lazy" src={other.avatar_url} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}} alt=''/>:<div style={{width:38,height:38,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
                    <div style={{flex:1}}><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{other.name}</div><div style={{color:'#aaa',fontSize:11}}>{other.style} · {other.city}</div></div>
                    <div style={{color:RED,fontSize:11,fontWeight:700}}>💬 Chat →</div>
                  </div>);
                })}
              </div>
            )}
          </div>
        )}

        {tab==='gyms'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:11}}>{t.findGyms}</div>
            {(()=>{
              // Unified ranked list - no duplicates
              const hardcoded=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct,city:ct})));
              const dbOnly=dbGyms.filter(dg=>!hardcoded.some(h=>h.name.toLowerCase()===dg.name.toLowerCase()));
              const allGyms=[...hardcoded,...dbOnly];
              const norm=s=>(s||'').replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
              const allRanked=allGyms.map(g=>{
                const k=(g.city||g.ct||'')+'-'+g.name;
                const kn=norm(g.city||g.ct||'')+'-'+norm(g.name||'');
                const r=gymRatings[k]||gymRatings[kn]||{};
                const avg=r.count>0?r.total/r.count:(g.rating||0);
                const cnt=r.count||0;
                return{...g,k,avg,cnt};
              }).sort((a,b)=>{
                if(b.cnt!==a.cnt)return b.cnt-a.cnt;
                return b.avg-a.avg;
              });
              const top5=allRanked.slice(0,5);
              const rest=allRanked.slice(5);
              const medal=['🥇','🥈','🥉'];
              const openGym=(g)=>{
                savedGymScrollRef.current=mainScrollRef.current?mainScrollRef.current.scrollTop:0;
                const hard=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(gx=>({...gx,ct}))).find(gx=>gx.name===g.name);
                const db=dbGyms.find(dg=>dg.name===g.name);
                const base=hard||db||g;
                setViewGym({gym:{styles:[],...base,city:base.city||base.ct||'',members:base.members||0,rating:base.rating||0,styles:base.styles||[base.style||L('Kampfsport', 'Combat sports', 'Sports de combat', 'Deportes de combate')],address:base.address||base.city||'',desc:base.desc||base.description||'',street:base.street||base.address||'',zip:base.zip||'',founded:base.founded||''},key:g.k});
              };
              return(<>
                {/* TOP 5 */}
                <div style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div className='rj' style={{color:'#d4a017',fontSize:15,letterSpacing:2}}>{L('🏆 GYM RANKING', '🏆 GYM RANKING', '🏆 CLASSEMENT DES SALLES', '🏆 RANKING DE GIMNASIOS')}</div>
                    <div style={{color:'#aaa',fontSize:10}}>{t.sortedByRatings}</div>
                  </div>
                  {top5.map((g,i)=>{
                    const isTop3=i<3;
                    return(
                      <div key={g.k} onClick={()=>openGym(g)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:isTop3?(darkMode?'#1f1a10':'#fffbf0'):(darkMode?'#1a1a1a':'#fff'),borderRadius:12,marginBottom:6,border:'1px solid '+(isTop3?'#d4a01744':(darkMode?'#2a2a2a':'#eee')),boxShadow:isTop3?'0 2px 8px rgba(212,160,23,0.12)':'none',cursor:'pointer'}}>
                        <div style={{fontSize:isTop3?26:18,width:32,textAlign:'center',flexShrink:0}}>{isTop3?medal[i]:<span className='rj' style={{color:'#bbb'}}>#{i+1}</span>}</div>
                        <div style={{width:38,height:38,borderRadius:8,background:darkMode?'#2a2a2a':'#f5f5f5',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                          {(gymLogos[g.code]?.logo_url||g.logo_url)?<img loading="lazy" src={gymLogos[g.code]?.logo_url||g.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#bbb',fontSize:9,textAlign:'center',fontWeight:700,lineHeight:1.2}}>{(g.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:isTop3?(darkMode?'#ffd700':'#b8860b'):(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.name}</div>
                          <div style={{color:'#888',fontSize:10,marginTop:1}}>📍 {g.city||g.ct} · {g.members||0} Mitglieder</div>
                          <div style={{display:'flex',gap:1,marginTop:3}}>
                            {[1,2,3,4,5].map(s=>(<button key={s} onClick={e=>{e.stopPropagation();rateGym(g.k,s);}} style={{background:'none',border:'none',cursor:'pointer',padding:'0 1px',fontSize:14,color:s<=Math.round(g.avg)?'#d4a017':'#ddd',lineHeight:1}}>{s<=Math.round(g.avg)?'★':'☆'}</button>))}
                            <span style={{color:'#aaa',fontSize:10,marginLeft:3,alignSelf:'center'}}>{g.cnt>0?g.cnt+' Bew.':'bewerten →'}</span>
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}><span style={{color:'#d4a017',fontSize:14}}>★</span><span style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:16}}>{g.avg>0?g.avg.toFixed(1):'–'}</span></div>
                          <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{g.cnt>0?'User-Rating':'Basis'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Toggle Städte / TOP GYMS */}
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <button onClick={()=>setGymRankMode(false)} style={{flex:1,padding:'7px',borderRadius:20,background:!gymRankMode?RED:'transparent',border:'1px solid '+(gymRankMode?'#ddd':RED),color:gymRankMode?'#888':'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>{t.cities}</button>
                  <button onClick={()=>setGymRankMode(true)} style={{flex:1,padding:'7px',borderRadius:20,background:gymRankMode?RED:'transparent',border:'1px solid '+(gymRankMode?RED:'#ddd'),color:gymRankMode?'#fff':'#888',fontSize:13,fontWeight:600,cursor:'pointer'}}>{t.topGyms}</button>
                </div>

                {gymRankMode?(
                  /* REST DES RANKINGS ab #6 */
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{color:'#aaa',fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:4}}>{L('PLÄTZE #6 UND WEITER', 'PLACES #6 AND BELOW', 'PLACES N°6 ET SUIVANTES', 'PUESTOS DEL 6 EN ADELANTE')}</div>
                    {rest.map((gym,i)=>(
                      <div key={gym.k} onClick={()=>openGym(gym)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:darkMode?'#1a1a1a':'#fff',borderRadius:12,border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),cursor:'pointer'}}>
                        <div style={{fontSize:i+6>=100?13:18,width:32,textAlign:'center',flexShrink:0}}><span className='rj' style={{color:'#bbb'}}>#{i+6}</span></div>
                        <div style={{width:38,height:38,borderRadius:8,background:darkMode?'#2a2a2a':'#f5f5f5',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                          {(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img loading="lazy" src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#bbb',fontSize:9,textAlign:'center',fontWeight:700,lineHeight:1.2}}>{(gym.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{gym.name||''}</div>
                          <div style={{color:'#888',fontSize:10,marginTop:1}}>📍 {gym.city||gym.ct} · {gym.members||0} Mitglieder</div>
                          <div style={{display:'flex',gap:1,marginTop:3}}>
                            {[1,2,3,4,5].map(s=>(<button key={s} onClick={e=>{e.stopPropagation();rateGym(gym.k,s);}} style={{background:'none',border:'none',cursor:'pointer',padding:'0 1px',fontSize:14,color:s<=Math.round(gym.avg)?'#d4a017':'#ddd',lineHeight:1}}>{s<=Math.round(gym.avg)?'★':'☆'}</button>))}
                            <span style={{color:'#aaa',fontSize:10,marginLeft:3,alignSelf:'center'}}>{gym.cnt>0?gym.cnt+' Bew.':'bewerten →'}</span>
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}><span style={{color:'#d4a017',fontSize:14}}>★</span><span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:16}}>{gym.avg>0?gym.avg.toFixed(1):'–'}</span></div>
                          <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{gym.cnt>0?'User-Rating':'Basis'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ):(
                  /* STÄDTE ANSICHT */
                  <>
                  <div style={{display:'flex',gap:8,marginBottom:11}}>
                  <div style={{position:'relative',flexShrink:0,width:110}}>
                    <div onClick={()=>{setGymCountryOpen(o=>!o);setCitySearchOpen(false);}} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 10px',borderRadius:12,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),cursor:'pointer'}}>
                      <span style={{fontSize:14}}>{({DE:'🇩🇪',AT:'🇦🇹',CH:'🇨🇭',ALL:'🌍'})[gymCountry]}</span>
                      <span style={{flex:1,color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{gymCountry==='ALL'?L('Alle','All','Tous','Todos'):gymCountry}</span>
                      <span style={{color:'#aaa',fontSize:10,transform:gymCountryOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
                    </div>
                    {gymCountryOpen&&(
                      <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:21,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',padding:6}}>
                        {[['DE','🇩🇪','DE'],['AT','🇦🇹','AT'],['CH','🇨🇭','CH'],['ALL','🌍',L('Alle','All','Tous','Todos')]].map(([code,flag,label])=>(
                          <div key={code} onClick={()=>{
                            setGymCountry(code);
                            setGymCountryOpen(false);
                            // Falls die aktuell gewaehlte Stadt nicht zum neuen Land passt,
                            // automatisch die erste passende Stadt auswaehlen
                            if(code!=='ALL'&&cityToCountry(city)!==code){
                              const normC=s=>(s||'').toLowerCase().trim().replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
                              const seen=new Set();const allCities=[];
                              [...dbGyms.map(g=>g.city).filter(Boolean),...Object.keys(GYMS)].forEach(c=>{
                                const k=normC(c);if(!seen.has(k)){seen.add(k);allCities.push(c);}
                              });
                              const matching=filterCitiesByCountry(allCities.sort((a,b)=>a.localeCompare(b,'de')),code);
                              if(matching.length>0)setCity(matching[0]);
                            }
                          }} style={{padding:'8px 10px',borderRadius:8,cursor:'pointer',background:gymCountry===code?(darkMode?'#2a1414':'#fdecea'):'transparent',color:gymCountry===code?RED:(darkMode?'#e0e0e0':'#333'),fontSize:13,fontWeight:gymCountry===code?700:500,display:'flex',alignItems:'center',gap:8}}>
                            <span>{flag}</span><span>{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{position:'relative',flex:1}}>
                    <div onClick={()=>{setCitySearchOpen(o=>!o);setGymCountryOpen(false);}} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:12,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),cursor:'pointer'}}>
                      <span style={{fontSize:14}}>📍</span>
                      <span style={{flex:1,color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontWeight:600}}>{city||L('Stadt wählen', 'Choose city', 'Choisir une ville', 'Elige ciudad')}</span>
                      <span style={{color:'#aaa',fontSize:11,transform:citySearchOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
                    </div>
                    {citySearchOpen&&(
                      <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:20,background:darkMode?'#1a1a1a':'#fff',border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',maxHeight:320,display:'flex',flexDirection:'column'}}>
                        <div style={{padding:'10px 12px',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                          <input autoFocus value={citySearchQuery} onChange={e=>setCitySearchQuery(e.target.value)} placeholder={L('Stadt suchen...', 'Search city...', 'Chercher une ville...', 'Buscar ciudad...')} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#f7f7f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        <div style={{overflowY:'auto',padding:'6px'}}>
                          {(()=>{
                            const normC=s=>(s||'').toLowerCase().trim().replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
                            const seen=new Set();const result=[];
                            [...dbGyms.map(g=>g.city).filter(Boolean),...Object.keys(GYMS)].forEach(c=>{
                              const k=normC(c);
                              if(!seen.has(k)){seen.add(k);result.push(c);}
                            });
                            return filterCitiesByCountry(result.sort((a,b)=>a.localeCompare(b,'de')),gymCountry)
                              .filter(c=>!citySearchQuery||normC(c).includes(normC(citySearchQuery)));
                          })().map(c=>(
                            <div key={c} onClick={()=>{setCity(c);setCitySearchOpen(false);setCitySearchQuery('');}} style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',background:city===c?(darkMode?'#2a1414':'#fdecea'):'transparent',color:city===c?RED:(darkMode?'#e0e0e0':'#333'),fontSize:14,fontWeight:city===c?700:500}}>{c}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {(dbGyms.filter(g=>g.city===city).length>0?dbGyms.filter(g=>g.city===city):(GYMS[city]||[]))
                      .slice()
                      .sort((a,b)=>{
                        const aHasLogo=!!(gymLogos[a.code]?.logo_url||a.logo_url);
                        const bHasLogo=!!(gymLogos[b.code]?.logo_url||b.logo_url);
                        return (bHasLogo?1:0)-(aHasLogo?1:0);
                      })
                      .map((gym,i)=>(
                      <div key={i} onClick={()=>openGym(gym)} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'13px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),boxShadow:'0 1px 4px rgba(0,0,0,0.05)',cursor:'pointer'}}>
                        <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
                          <div style={{width:46,height:46,borderRadius:9,background:darkMode?'#2a2a2a':'#f0f0f0',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>{(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img loading="lazy" src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#aaa',fontSize:10,fontWeight:700,textAlign:'center',lineHeight:1.2}}>{(gym.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}</div>
                          <div style={{flex:1}}>
                            <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{gym.name||''}</div>
                            <div style={{color:darkMode?'#aaa':'#888',fontSize:11,marginTop:1}}>📍 {gym.address||gym.city||''}</div>
                            <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>{(gym.styles||[gym.style||L('Kampfsport', 'Combat sports', 'Sports de combat', 'Deportes de combate')]).filter(Boolean).map(s=><Tag key={s} text={s} accent={RED}/>)}</div>
                          </div>
                        </div>
                        <div style={{marginTop:9,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div style={{color:'#888',fontSize:12}}>👥 {gym.members||0} Mitglieder</div>
                          <div style={{display:'flex',alignItems:'center',gap:3}}><span style={{color:'#d4a017'}}>★</span><span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{gym.rating||0}</span></div>
                        </div>
                        <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                          <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginBottom:4}}>{L('Gym bewerten:', 'Rate gym:', 'Noter la salle :', 'Valorar gimnasio:')}</div>
                          <div style={{display:'flex',gap:2,alignItems:'center'}}>
                            {[1,2,3,4,5].map(star=>{
                              const k=(city||gym.city)+'-'+gym.name;
                              const mine=gymRatings[k]?.userRating||0;
                              return <button key={star} onClick={e=>{e.stopPropagation();rateGym(k,star);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:star<=mine?'#d4a017':'#ddd',padding:'0 1px'}}>{star<=mine?'★':'☆'}</button>;
                            })}
                            {gymRatings[(city||gym.city)+'-'+gym.name]?.count>0&&<span style={{color:'#aaa',fontSize:10,marginLeft:4}}>{gymRatings[(city||gym.city)+'-'+gym.name].count} Bew.</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </>);
            })()}
          </div>
        )}


        {tab==='events'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>


            {/* HEADER */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3}}>EVENTS</div>
                <div style={{color:'#aaa',fontSize:11,marginTop:2}}>{L('Community Sparrings & Trainings', 'Community sparring & training sessions', 'Sparrings et entraînements communautaires', 'Sparrings y entrenamientos de la comunidad')}</div>
              </div>
              {isAdmin&&(
                <button onClick={()=>{setEditEventId(null);setShowCreateEvent(true);}}
                  style={{padding:'9px 16px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,letterSpacing:1,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                  ➕ EVENT
                </button>
              )}
            </div>

            {/* MEINE BUCHUNGEN — Uebersicht der Events, fuer die ich angemeldet bin.
                Zeigt bei bezahlten Tickets auch den gezahlten Betrag an. */}
            {(()=>{
              if(!myProfile)return null;
              const meine=events.filter(ev=>(eventParticipants[ev.id]||[]).some(p=>p.user_id===myProfile.id));
              if(meine.length===0)return null;
              return(
                <div style={{background:darkMode?'#12210f':'#f0faf0',border:'1px solid #27ae6044',borderRadius:12,padding:'12px',marginBottom:14}}>
                  <div style={{color:'#27ae60',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>
                    🎟️ MEINE BUCHUNGEN ({meine.length})
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {meine.map(ev=>{
                      const mein=(eventParticipants[ev.id]||[]).find(p=>p.user_id===myProfile.id);
                      const bezahlt=mein&&mein.paid;
                      const datum=ev.event_date?new Date(ev.event_date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
                      const vorbei=ev.event_date&&new Date(ev.event_date)<new Date(new Date().toDateString());
                      return(
                        <div key={ev.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:9,padding:'9px 11px',display:'flex',alignItems:'center',gap:9,opacity:vorbei?0.55:1}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                            <div style={{color:darkMode?'#888':'#999',fontSize:11,marginTop:1}}>
                              📅 {datum}{ev.event_time?' · '+ev.event_time:''}{ev.city?' · 📍 '+ev.city:''}
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            {bezahlt
                              ?<div style={{color:'#27ae60',fontSize:11,fontWeight:700}}>✅ Bezahlt{mein.amount_paid?' · '+Number(mein.amount_paid).toFixed(2)+'€':''}</div>
                              :<div style={{color:darkMode?'#888':'#999',fontSize:11,fontWeight:700}}>{L('Angemeldet', 'Registered', 'Inscrit', 'Inscrito')}</div>}
                            {vorbei&&<div style={{color:'#aaa',fontSize:10,marginTop:1}}>{L('vorbei', 'over', 'terminé', 'terminado')}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {eventsLoading?(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),opacity:1-i*0.25}}>
                    <div style={{height:14,background:darkMode?'#2a2a2a':'#f0f0f0',borderRadius:7,width:'60%',marginBottom:8}}/>
                    <div style={{height:10,background:darkMode?'#222':'#f5f5f5',borderRadius:5,width:'40%'}}/>
                  </div>
                ))}
              </div>
            ):events.length===0?(
              <div style={{textAlign:'center',padding:'50px 20px'}}>
                <div style={{fontSize:56,marginBottom:12}}>📅</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:2,marginBottom:8}}>{L('NOCH KEINE EVENTS', 'NO EVENTS YET', 'PAS ENCORE D\'ÉVÉNEMENTS', 'AÚN NO HAY EVENTOS')}</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.7,maxWidth:260,margin:'0 auto'}}>
                  {isAdmin?'Erstelle das erste Community Sparring!':L('Bald gibt es hier Events in deiner Stadt. Schau später nochmal rein 🥊', 'Events in your city are coming soon. Check back later 🥊', 'Bientôt des événements dans ta ville. Reviens plus tard 🥊', 'Pronto habrá eventos en tu ciudad. Vuelve más tarde 🥊')}
                </div>
                {isAdmin&&(
                  <button onClick={()=>{setEditEventId(null);setShowCreateEvent(true);}}
                    style={{marginTop:16,padding:'13px 28px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
                    {L('➕ ERSTES EVENT ERSTELLEN', '➕ CREATE FIRST EVENT', '➕ CRÉER LE PREMIER ÉVÉNEMENT', '➕ CREAR EL PRIMER EVENTO')}
                  </button>
                )}
                {!isAdmin&&(
                  <button onClick={inviteFriends}
                    style={{marginTop:16,padding:'13px 28px',borderRadius:12,background:'transparent',border:'1px dashed '+(darkMode?'#555':'#bbb'),color:darkMode?'#ddd':'#555',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1.5,cursor:'pointer'}}>
                    {L('👥 FIGHTER AUS DEINER STADT EINLADEN', '👥 INVITE FIGHTERS FROM YOUR CITY', '👥 INVITER DES COMBATTANTS DE TA VILLE', '👥 INVITA A LUCHADORES DE TU CIUDAD')}
                  </button>
                )}
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {events.map(ev=>{
                  const parts=eventParticipants[ev.id]||[];
                  const meineTeilnahme=parts.find(p=>p.user_id===myProfile?.id);
                  const isJoined=!!meineTeilnahme;
                  const wartetAufFreund=isJoined&&!meineTeilnahme.paid&&meineTeilnahme.brought_friend_id&&!meineTeilnahme.baf_unlocked;
                  const freundHatBezahlt=isJoined&&!meineTeilnahme.paid&&meineTeilnahme.baf_unlocked;
                  const mitgebrachterFreundName=wartetAufFreund?(allProfiles.find(p=>p.id===meineTeilnahme.brought_friend_id)?.name||'deinem Freund'):null;
                  // Bezahlte Tickets kann man nicht selbst zurueckgeben: das
                  // Loeschen der Zeile wuerde den Zahlungsnachweis vernichten,
                  // ohne dass Geld zurueckfliesst. Erstattung laeuft ueber den
                  // Veranstalter.
                  const istBezahlt=!!meineTeilnahme?.paid;
                  // Aktive Mitgliedschaft desselben Erstellers deckt dieses
                  // Training automatisch ab - unabhaengig davon, ob es eine
                  // Einzel-Teilnahme-Zeile dafuer gibt.
                  const aktiveMitgliedschaft=myMemberships.find(m=>m.event_creator_id===ev.creator_id);
                  const hatMonatsbeitrag=ev.price_monthly&&Number(ev.price_monthly)>0;
                  const isFull=parts.length>=(ev.max_participants||10);
                  const isOwner=ev.creator_id===myProfile?.id;
                  const typeColors={'Sparring':RED,'Community Training':'#27ae60','Wettkampf':'#d4a017','Open Mat':'#2980b9','Seminar':'#8e44ad'};
                  const color=typeColors[ev.event_type]||RED;
                  const isPast=ev.event_date&&new Date(ev.event_date)<new Date(new Date().toDateString());
                  return(
                    <div key={ev.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,border:'1px solid '+(isPast?(darkMode?'#2a2a2a':'#eee'):(isJoined?color+'44':(darkMode?'#2a2a2a':'#eee'))),overflow:'hidden',opacity:isPast?0.6:1,boxShadow:isJoined&&!isPast?'0 2px 12px '+color+'22':'none'}}>
                      <div style={{height:3,background:isPast?'#555':color}}/>
                      <div style={{padding:'13px 14px'}}>
                        {/* TYPE + DATE */}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                            <div style={{background:color+'18',border:'1px solid '+color+'44',borderRadius:20,padding:'2px 9px',color:color,fontSize:10,fontWeight:700}}>{ev.event_type}</div>
                            {isJoined&&!isPast&&<div style={{background:'#27ae6018',border:'1px solid #27ae6044',borderRadius:20,padding:'2px 9px',color:'#27ae60',fontSize:10,fontWeight:700}}>{L('✓ Angemeldet', '✓ Registered', '✓ Inscrit', '✓ Inscrito')}</div>}
                            {isPast&&<div style={{background:'#88888818',borderRadius:20,padding:'2px 9px',color:'#888',fontSize:10,fontWeight:700}}>{L('Vergangen', 'Past', 'Passé', 'Pasado')}</div>}
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:700}}>
                              {ev.event_date?new Date(ev.event_date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'}):''}
                            </div>
                            {ev.event_time&&<div style={{color:'#aaa',fontSize:11,marginTop:1}}>🕐 {ev.event_time} Uhr</div>}
                          </div>
                        </div>
                        {/* TITLE */}
                        <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:1,marginBottom:4}}>{ev.title}</div>
                        {/* LOCATION - antippbar, oeffnet Apple Maps (faellt im Browser
                            automatisch auf eine normale Kartenansicht zurueck) */}
                        <div onClick={(e)=>{
                          e.stopPropagation();
                          const query=encodeURIComponent(ev.address||ev.city||'');
                          if(!query)return;
                          window.open('https://maps.apple.com/?q='+query,'_blank');
                        }} style={{color:'#aaa',fontSize:12,marginBottom:6,textDecoration:'underline',cursor:'pointer'}}>📍 {ev.address||ev.city}</div>
                        {/* STYLES */}
                        {ev.styles&&ev.styles.length>0&&(
                          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                            {ev.styles.map(s=><div key={s} style={{background:darkMode?'#2a2a2a':'#f5f5f5',borderRadius:20,padding:'2px 8px',color:darkMode?'#aaa':'#666',fontSize:10,fontWeight:600}}>{s}</div>)}
                          </div>
                        )}
                        {/* DESCRIPTION */}
                        {ev.description&&<div style={{color:darkMode?'#888':'#666',fontSize:12,lineHeight:1.6,marginBottom:8}}>{ev.description}</div>}
                        {/* TICKET-EINNAHMEN (nur fuer den Ersteller sichtbar) */}
                        {isOwner&&ev.price>0&&(
                          <div style={{background:darkMode?'#1a2a1a':'#f0f9f0',borderRadius:8,padding:'8px 10px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div style={{color:'#27ae60',fontSize:11,fontWeight:700}}>💰 {parts.filter(p=>p.paid).length} Tickets verkauft</div>
                            <div style={{color:'#27ae60',fontSize:13,fontWeight:700}}>{(parts.filter(p=>p.paid).length*ev.price).toFixed(2)}€</div>
                          </div>
                        )}
                        {/* PARTICIPANTS BAR */}
                        <div style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                            <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:600}}>{L('👥 Teilnehmer', '👥 Participants', '👥 Participants', '👥 Participantes')}</div>
                            <div style={{color:isFull?RED:color,fontSize:11,fontWeight:700}}>{parts.length}/{ev.max_participants||10}{isFull?' · Voll':''}</div>
                          </div>
                          <div style={{height:4,background:darkMode?'#2a2a2a':'#f0f0f0',borderRadius:2}}>
                            <div style={{height:'100%',width:Math.min(100,(parts.length/(ev.max_participants||10))*100)+'%',background:isFull?RED:color,borderRadius:2,transition:'width 0.4s'}}/>
                          </div>
                        </div>
                        {/* ACTION BUTTONS */}
                        {!isPast&&(
                          <>
                          <div style={{display:'flex',gap:8}}>
                            {isOwner?(
                              <button onClick={async()=>{
                                if(!window.confirm(L('Event löschen?', 'Delete event?', 'Supprimer l\'événement ?', '¿Eliminar evento?')))return;
                                try{
                                  // Teilnehmer zuerst löschen, dann Event
                                  if(isAdmin){
                                    await adminFetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+ev.id,{method:'DELETE'},session?.token);
                                    await adminFetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{method:'DELETE'},session?.token);
                                  }else{
                                    await fetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+ev.id,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                                    await fetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                                  }
                                  await loadEvents(session);showMsg(L('Event gelöscht ✅', 'Event deleted ✅', 'Événement supprimé ✅', 'Evento eliminado ✅'));
                                }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
                              }} style={{flex:1,padding:'10px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c44',color:'#e74c3c',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                                {L('🗑️ Löschen', '🗑️ Delete', '🗑️ Supprimer', '🗑️ Eliminar')}
                              </button>
                            ):aktiveMitgliedschaft?(
                              <div style={{flex:1,padding:'10px',borderRadius:10,background:darkMode?'#12210f':'#f0faf0',border:'1px solid #27ae6044',textAlign:'center'}}>
                                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13}}>
                                  {L('📅 Mitgliedschaft aktiv', '📅 Membership active', '📅 Adhésion active', '📅 Membresía activa')}
                                </div>
                                <div style={{color:darkMode?'#888':'#999',fontSize:11,marginTop:2}}>
                                  Gültig bis {new Date(aktiveMitgliedschaft.valid_until).toLocaleDateString('de')}
                                </div>
                              </div>
                            ):wartetAufFreund?(
                              <div style={{flex:1,padding:'10px',borderRadius:10,background:darkMode?'#2a1f10':'#fff8e8',border:'1px solid #d4a01755',textAlign:'center'}}>
                                <div style={{color:'#d4a017',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13}}>
                                  ⏳ Warte auf {mitgebrachterFreundName}
                                </div>
                                <div style={{color:darkMode?'#888':'#999',fontSize:11,marginTop:2}}>
                                  {L('Sobald dein Freund zahlt, bekommst du 10€ Rabatt', 'As soon as your friend pays, you get €10 off', 'Dès que ton ami paie, tu obtiens 10 € de remise', 'En cuanto tu amigo pague, recibirás 10 € de descuento')}
                                </div>
                              </div>
                            ):freundHatBezahlt?(
                              <button onClick={()=>joinEvent(ev.id,ev.price)}
                                style={{flex:1,padding:'10px',borderRadius:10,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,letterSpacing:1,cursor:'pointer'}}>
                                ✅ Freund hat gezahlt — jetzt für {Math.max(0,ev.price-10)}€ zahlen
                              </button>
                            ):isJoined&&istBezahlt?(
                              <div style={{flex:1,padding:'10px',borderRadius:10,background:darkMode?'#12210f':'#f0faf0',border:'1px solid #27ae6044',textAlign:'center'}}>
                                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13}}>
                                  {L('🎟️ Ticket bezahlt', '🎟️ Ticket paid', '🎟️ Billet payé', '🎟️ Entrada pagada')}
                                </div>
                                <div style={{color:darkMode?'#888':'#999',fontSize:11,marginTop:2}}>
                                  {L('Erstattung nur über den Veranstalter', 'Refunds only via the organizer', 'Remboursement uniquement via l\'organisateur', 'Reembolso solo a través del organizador')}
                                </div>
                              </div>
                            ):isJoined?(
                              <button onClick={()=>leaveEvent(ev.id)}
                                style={{flex:1,padding:'10px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#ddd'),color:darkMode?'#aaa':'#888',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                                {L('Abmelden', 'Leave', 'Se désinscrire', 'Darse de baja')}
                              </button>
                            ):(
                              <>
                              <button onClick={()=>joinEvent(ev.id,ev.price)} disabled={isFull}
                                style={{flex:1,padding:'10px',borderRadius:10,background:isFull?'#eee':`linear-gradient(135deg,${color},${color}cc)`,border:'none',color:isFull?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:isFull?'not-allowed':'pointer'}}>
                                {isFull?'Ausgebucht':(ev.price>0?'🎟️ TICKET KAUFEN ('+ev.price+'€)':'🥊 ANMELDEN')}
                              </button>
                              {ev.price>0&&!isFull&&(
                                <button onClick={()=>{setFriendPickerEventId(ev.id);setFriendSearchQuery('');}}
                                  style={{padding:'10px 14px',borderRadius:10,background:'transparent',border:'1px solid #d4a017',color:'#d4a017',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>
                                  BAF
                                </button>
                              )}
                              </>
                            )}
                          </div>
                          {!isJoined&&!aktiveMitgliedschaft&&hatMonatsbeitrag&&!isFull&&(
                            <button onClick={()=>joinEventMonthly(ev.id)}
                              style={{width:'100%',marginTop:8,padding:'9px',borderRadius:10,background:'transparent',border:'1px solid #2980b955',color:'#2980b9',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                              📅 Stattdessen Monatsbeitrag ({ev.price_monthly}€ — alle Sessions diesen Monat)
                            </button>
                          )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab==='ranking'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:8}}>{t.worldRanking}</div>
            <div style={{display:'flex',gap:5,marginBottom:11}}>
              <button onClick={()=>setRankMode('user')} style={{flex:1,padding:'7px 4px',borderRadius:8,background:rankMode==='user'?'#2980b9':'transparent',border:'1px solid '+(rankMode==='user'?'#2980b9':(darkMode?'#333':'#ddd')),color:rankMode==='user'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>{L('🏅 AMATEURE', '🏅 AMATEURS', '🏅 AMATEURS', '🏅 AMATEURS')}</button>
              <button onClick={()=>setRankMode('pro')} style={{flex:1,padding:'7px 4px',borderRadius:8,background:rankMode==='pro'?'#d4a017':'transparent',border:'1px solid '+(rankMode==='pro'?'#d4a017':(darkMode?'#333':'#ddd')),color:rankMode==='pro'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>{L('⭐ PROFIS', '⭐ PROS', '⭐ PROS', '⭐ PROFESIONALES')}</button>
              <button onClick={()=>{setRankMode('trainer');loadCoaches(session);}} style={{flex:1,padding:'7px 4px',borderRadius:8,background:rankMode==='trainer'?'#8e44ad':'transparent',border:'1px solid '+(rankMode==='trainer'?'#8e44ad':(darkMode?'#333':'#ddd')),color:rankMode==='trainer'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:11,cursor:'pointer'}}>{t.trainer}</button>
            </div>
            {rankMode!=='trainer'&&(
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <button onClick={()=>setCountryFilter('mine')} style={{flex:1,padding:'6px',borderRadius:20,background:countryFilter==='mine'?RED:'transparent',border:'1px solid '+(countryFilter==='mine'?RED:(darkMode?'#333':'#ddd')),color:countryFilter==='mine'?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  {({'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[profile.country||'DE']||'🌍')} Mein Land
                </button>
                <button onClick={()=>setCountryFilter('world')} style={{flex:1,padding:'6px',borderRadius:20,background:countryFilter==='world'?'#2980b9':'transparent',border:'1px solid '+(countryFilter==='world'?'#2980b9':(darkMode?'#333':'#ddd')),color:countryFilter==='world'?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  {L('🌍 Weltweit', '🌍 Worldwide', '🌍 Monde entier', '🌍 En todo el mundo')}
                </button>
              </div>
            )}
            {rankMode!=='trainer'&&(
              <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
                {['All',...STYLES].map(s=>(<button key={s} onClick={()=>setRankF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:rankF===s?RED:'#fff',border:'1px solid '+(rankF===s?RED:'#e0e0e0'),color:rankF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
              </div>
            )}
            {rankMode==='trainer'&&(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {coachesLoading?(
                  <div style={{textAlign:'center',padding:'40px 0',color:'#aaa'}}>Lädt...</div>
                ):coaches.length===0?(
                  <div style={{textAlign:'center',padding:'40px 20px',color:'#aaa'}}>
                    <div style={{fontSize:32,marginBottom:8}}>🎓</div>
                    <div style={{fontSize:13}}>{L('Noch keine registrierten Trainer. Wer sich bei der Registrierung als Trainer einträgt, erscheint hier.', 'No registered coaches yet. Anyone who signs up as a coach appears here.', 'Pas encore de coachs inscrits. Ceux qui s\'inscrivent comme coach apparaissent ici.', 'Aún no hay entrenadores registrados. Quien se registre como entrenador aparecerá aquí.')}</div>
                  </div>
                ):coaches.map((c,i)=>{
                  const medal=['🥇','🥈','🥉'];
                  const isTop3=i<3;
                  const isMe=myProfile&&c.id===myProfile.id;
                  return(
                    <div key={c.id} style={{background:isTop3?(darkMode?'#1f1a10':'#fffbf0'):(darkMode?'#1a1a1a':'#fff'),borderRadius:13,border:'1px solid '+(isTop3?'#d4a01733':(darkMode?'#2a2a2a':'#eee')),boxShadow:isTop3?'0 2px 8px rgba(212,160,23,0.1)':'none'}}>
                    <div onClick={()=>{
                      if(!isMe)setViewProfile(c);
                    }} style={{padding:'12px 13px',display:'flex',alignItems:'center',gap:11,cursor:isMe?'default':'pointer'}}>
                      <div style={{fontSize:isTop3?26:18,width:32,textAlign:'center',flexShrink:0}}>
                        {isTop3?medal[i]:<span className='rj' style={{color:'#bbb'}}>#{i+1}</span>}
                      </div>
                      {(c.coach_avatar_url||c.avatar_url)?<img loading="lazy" src={c.coach_avatar_url||c.avatar_url} style={{width:46,height:46,borderRadius:10,objectFit:'cover',flexShrink:0}} alt=''/>:<div style={{width:46,height:46,borderRadius:10,background:'#8e44ad22',border:'2px solid #8e44ad44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🎓</div>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div className='rj' style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontSize:15,letterSpacing:0.5}}>{c.name}</div>
                          <div style={{background:'#8e44ad22',border:'1px solid #8e44ad44',borderRadius:10,padding:'1px 6px',color:'#8e44ad',fontSize:9,fontWeight:700,flexShrink:0}}>{L('🎓 TRAINER', '🎓 COACHES', '🎓 COACHS', '🎓 ENTRENADORES')}</div>
                        </div>
                        <div style={{color:'#8e44ad',fontSize:11,fontWeight:700,marginTop:1}}>{c.coach_styles||'-'}</div>
                        <div style={{color:darkMode?'#555':'#bbb',fontSize:10,marginTop:1}}>🏋️ {c.coach_gym||'-'} · {c.city||'-'}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}>
                          <span style={{color:'#d4a017',fontSize:13}}>★</span>
                          <span className='rj' style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontSize:18}}>{c.avgRating>0?c.avgRating.toFixed(1):'-'}</span>
                        </div>
                        <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{c.ratingCount} Bew.</div>
                        {c.coach_experience&&<div style={{color:'#d4a017',fontSize:9}}>{c.coach_experience} Jahre</div>}
                      </div>
                    </div>
                    {/* Direkte Bewertung ohne erst ins Profil zu muessen. */}
                    {!isMe&&(
                      <div style={{display:'flex',alignItems:'center',gap:4,padding:'0 13px 12px'}}>
                        <span style={{color:'#999',fontSize:10,marginRight:2}}>{L('Bewerten:', 'Rate:', 'Noter :', 'Valorar:')}</span>
                        {[1,2,3,4,5].map(n=>(
                          <button key={n} onClick={()=>rateCoach(c.id,n)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',padding:0,color:(c.myRating||0)>=n?'#d4a017':'#ddd'}}>★</button>
                        ))}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* EIGENER PLATZ */}
            {rankMode!=='trainer'&&myProfile&&(()=>{
              const myScore=(myProfile.wins||0)*3-(myProfile.losses||0)*2+(myProfile.draws||0);
              const allScored=sortFightersByRank(userOnly);
              const myRank=allScored.findIndex(f=>f.id===0)+1;
              if(myRank<=0)return null;
              return(
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'12px 14px',border:'2px solid '+RED+'44',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
                  <div className='rj' style={{color:RED,fontSize:22,width:36,textAlign:'center',flexShrink:0}}>#{myRank}</div>
                  <div style={{width:38,height:38,borderRadius:8,overflow:'hidden',flexShrink:0,background:'#f0f0f0'}}>
                    {avatarPreview?<img loading="lazy" src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>Du · {profile.name}</div>
                    <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{profile.style} · {myBundesland||profile.city}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16}}>{myScore} Pkt</div>
                    <div style={{color:'#bbb',fontSize:9}}>{myProfile.wins||0}S · {myProfile.losses||0}N</div>
                  </div>
                </div>
              );
            })()}
            {ranked.length>=3&&rankMode!=='trainer'&&(
              <div style={{display:'flex',alignItems:'flex-end',gap:5,marginBottom:13,justifyContent:'center'}}>
                {[ranked[1],ranked[0],ranked[2]].map((f,i)=>{
                  const heights=[96,118,80];const places=[2,1,3];const colors=['#95a5a6','#d4a017','#cd7f32'];const isFirst=i===1;
                  return(<div key={f.id} onClick={()=>{if(!f.isMe&&f.id)setViewProfile(f);}} style={{flex:1,maxWidth:105,display:'flex',flexDirection:'column',alignItems:'center',cursor:f.isMe?'default':'pointer'}}>
                    {isFirst&&<div style={{fontSize:26,marginBottom:2}}>🏆</div>}
                    {f.avatar_url?<img loading="lazy" src={f.avatar_url} style={{width:isFirst?44:36,height:isFirst?44:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+colors[i],marginBottom:3}} alt={f.name}/>:<div style={{fontSize:isFirst?28:22,marginBottom:3}}>{f.emoji||''}</div>}
                    <div style={{color:f.isMe?RED:(darkMode?'#fff':'#1a1a1a'),fontSize:11,fontWeight:700,textAlign:'center'}}>{f.name?.split(' ')[0]}</div>
                    <div style={{color:'#aaa',fontSize:9}}>{f.wins}W-{f.losses}L</div>
                    <div style={{width:'100%',height:heights[i],background:colors[i]+'18',border:'1px solid '+colors[i]+'44',borderRadius:'5px 5px 0 0',marginTop:5,display:'flex',alignItems:'center',justifyContent:'center'}}><div className='rj' style={{color:colors[i],fontSize:28}}>#{places[i]}</div></div>
                  </div>);
                })}
              </div>
            )}
            {rankMode!=='trainer'&&!(profile.country||myProfile?.country)&&(
              <div style={{background:darkMode?'#2a1f10':'#fff8e8',borderRadius:12,padding:'16px',border:'1px solid #d4a01755',marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>🌍</div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,marginBottom:4}}>{L('Vervollständige dein Profil', 'Complete your profile', 'Complète ton profil', 'Completa tu perfil')}</div>
                <div style={{color:'#888',fontSize:12,lineHeight:1.5,marginBottom:12}}>{L('Um in der Rangliste aufzutauchen, musst du dein Land angeben.', 'To appear in the ranking you need to set your country.', 'Pour apparaître dans le classement, tu dois indiquer ton pays.', 'Para aparecer en el ranking debes indicar tu país.')}</div>
                <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                  {L('JETZT VERVOLLSTÄNDIGEN', 'COMPLETE NOW', 'COMPLÈTE MAINTENANT', 'COMPLÉTALO AHORA')}
                </button>
              </div>
            )}
            {rankMode!=='trainer'&&(profile.record_verified||myProfile?.record_verified)==='verified'&&!(myProfile?.gym_verified===true||gymVerified)&&(
              <div style={{background:darkMode?'#1a1a10':'#fffbe8',borderRadius:12,padding:'16px',border:'1px solid #d4a01755',marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>🏋️</div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,marginBottom:4}}>{L('Gym-Mitgliedschaft verifizieren', 'Verify gym membership', 'Vérifier l\'adhésion à la salle', 'Verificar membresía del gimnasio')}</div>
                <div style={{color:'#888',fontSize:12,lineHeight:1.5,marginBottom:12}}>
                  {L('Dein Kampfrekord ist verifiziert. Den grünen Haken bekommst du, wenn du auch mit dem Code deines Gyms bestätigst, dass du dort wirklich trainierst.', 'Your fight record is verified. You get the green check when you also confirm with your gym\'s code that you really train there.', 'Ton palmarès est vérifié. Tu obtiens la coche verte quand tu confirmes aussi avec le code de ta salle que tu t\'y entraînes vraiment.', 'Tu récord está verificado. Recibes la marca verde cuando confirmas también con el código de tu gimnasio que entrenas allí de verdad.')}
                </div>
                <button onClick={()=>setShowGymVerify(true)} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                  {L('GYM-CODE EINGEBEN', 'ENTER GYM CODE', 'SAISIR LE CODE DE LA SALLE', 'INTRODUCIR CÓDIGO DEL GIMNASIO')}
                </button>
              </div>
            )}
            {rankMode!=='trainer'&&!((profile.gym||myProfile?.gym)||'').trim()&&(
              <div style={{background:darkMode?'#1a1a1a':'#fff5f4',borderRadius:12,padding:'16px',border:'1px solid '+RED+'44',marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>🥋</div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,marginBottom:4}}>{L('Gym eintragen', 'Add your gym', 'Renseigne ta salle', 'Añade tu gimnasio')}</div>
                <div style={{color:'#888',fontSize:12,lineHeight:1.5,marginBottom:12}}>{L('Ohne Gym kannst du nicht in der Rangliste erscheinen. Trage dein Gym in deinem Profil ein.', 'Without a gym you cannot appear in the ranking. Add your gym in your profile.', 'Sans salle, tu ne peux pas apparaître dans le classement. Renseigne ta salle dans ton profil.', 'Sin gimnasio no puedes aparecer en el ranking. Añade tu gimnasio en tu perfil.')}</div>
                <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>{L('GYM EINTRAGEN', 'ADD GYM', 'RENSEIGNER LA SALLE', 'AÑADIR GIMNASIO')}</button>
              </div>
            )}
            {rankMode!=='trainer'&&(profile.country||myProfile?.country)&&(profile.record_verified||myProfile?.record_verified)!=='verified'&&(
              <div style={{background:darkMode?'#1a2510':'#f0f8e8',borderRadius:12,padding:'16px',border:'1px solid #27ae6055',marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>🏅</div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,marginBottom:4}}>{L('Kampfrekord verifizieren', 'Verify fight record', 'Vérifier le palmarès', 'Verificar récord de combate')}</div>
                <div style={{color:'#888',fontSize:12,lineHeight:1.5,marginBottom:12}}>
                  {(profile.record_verified||myProfile?.record_verified)==='pending'
                    ?L('Dein Nachweis wird geprüft — sobald bestätigt, bekommst du den Haken und stehst vor allen nicht verifizierten Fightern.', 'Your proof is being reviewed — once confirmed you get the check and rank above all unverified fighters.', 'Ton justificatif est en cours de vérification — une fois validé, tu obtiens la coche et tu passes devant tous les combattants non vérifiés.', 'Tu comprobante está en revisión: una vez confirmado recibirás la marca y estarás por delante de todos los luchadores no verificados.')
                    :(myProfile?.wins||0)+(myProfile?.losses||0)+(myProfile?.draws||0)===0
                    ?L('Ohne Kämpfe erscheinst du erst in der Rangliste, wenn dein Rekord verifiziert ist. Hast du noch keine Kämpfe, tippe unten auf "Ich habe noch keine Kämpfe". Sonst lade einen Nachweis hoch.', 'Without fights you only appear in the ranking once your record is verified. If you have no fights yet, tap "I have no fights yet" below. Otherwise upload proof.', 'Sans combats, tu n\'apparais dans le classement qu\'une fois ton palmarès vérifié. Si tu n\'as pas encore de combats, appuie sur « Je n\'ai encore aucun combat » ci-dessous. Sinon, charge un justificatif.', 'Sin combates solo apareces en el ranking cuando tu récord esté verificado. Si aún no tienes combates, toca «Aún no tengo combates» abajo. Si no, sube un comprobante.')
                    :'Du stehst in der Rangliste, aber noch ohne Haken. Den grünen Haken bekommst du mit verifiziertem Kampfrekord UND verifizierter Gym-Mitgliedschaft (Gym-Code). Lade einen Nachweis hoch (Urkunde, offizielles Ergebnis).'}
                </div>
                {(profile.record_verified||myProfile?.record_verified)!=='pending'&&(
                  <>
                    <button onClick={()=>{setTab('stats');setTimeout(()=>{const el=document.getElementById('record-verify-box');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},200);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                      {L('NACHWEIS HOCHLADEN', 'UPLOAD PROOF', 'CHARGER UN JUSTIFICATIF', 'SUBIR COMPROBANTE')}
                    </button>
                    {(myProfile?.wins||0)+(myProfile?.losses||0)+(myProfile?.draws||0)===0&&(
                      <button onClick={async()=>{
                        // 0-0-0 laesst sich nicht faelschen (bringt 0 Punkte) - deshalb
                        // hier direkt verifizieren, ohne Warten auf Pruefung durch uns.
                        if(!window.confirm(L('Du hast noch keine Kämpfe? Dein Rekord wird als 0-0-0 verifiziert und du bekommst damit den Haken in der Rangliste.', 'No fights yet? Your record is verified as 0-0-0 and you get the check in the ranking.', 'Pas encore de combats ? Ton palmarès est vérifié à 0-0-0 et tu obtiens la coche dans le classement.', '¿Aún no tienes combates? Tu récord se verifica como 0-0-0 y recibes la marca en el ranking.')))return;
                        try{
                          await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                            method:'PATCH',
                            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                            body:JSON.stringify({wins:0,losses:0,draws:0,ko:0,record_verified:'verified',record_proof_url:null})
                          });
                          setMyProfile(p=>({...p,wins:0,losses:0,draws:0,ko:0,record_verified:'verified'}));
                          setStats({wins:0,losses:0,draws:0,ko:0});
                          showMsg('✅ Als "keine Kämpfe" markiert - du hast jetzt den Haken in der Rangliste.');
                        }catch(e){showMsg(L('Fehler: ','Error: ','Erreur : ','Error: ')+e.message);}
                      }} style={{marginTop:8,padding:'8px 16px',borderRadius:8,background:'none',border:'1px solid #27ae6066',color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                        {L('ICH HABE NOCH KEINE KÄMPFE', 'I HAVE NO FIGHTS YET', 'JE N\'AI ENCORE AUCUN COMBAT', 'AÚN NO TENGO COMBATES')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {ranked.map((f,i)=>{
                const score=f.wins*3-f.losses*2+f.draws;const rc=['#d4a017','#95a5a6','#cd7f32'];
                return(<div key={f.id} onClick={()=>{if(!f.isMe&&f.id&&typeof f.id==='string'){savedRankScrollRef.current=mainScrollRef.current?mainScrollRef.current.scrollTop:0;setViewProfile(f);}}} style={{background:f.isMe?(darkMode?'#2a1510':'#fdf0ef'):(darkMode?'#1a1a1a':'#fff'),borderRadius:9,padding:'10px 12px',border:'1px solid '+(f.isMe?RED+'33':i<3?rc[i]+'33':'#eee'),display:'flex',alignItems:'center',gap:9,boxShadow:'0 1px 4px rgba(0,0,0,0.04)',cursor:f.isMe?'default':'pointer'}}>
                  <div className='rj' style={{color:i<3?rc[i]:'#bbb',fontSize:i>=999?11:i>=99?14:18,width:38,flexShrink:0,textAlign:'center',whiteSpace:'nowrap'}}>#{i+1}</div>
                  {f.avatar_url?<img loading="lazy" src={f.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt={f.name}/>:<div style={{fontSize:22}}>{f.emoji||''}</div>}
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{color:f.isMe?RED:(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:13}}>{f.name}</div>
                      {f.isMe&&<div style={{background:'#fdf0ef',border:'1px solid '+RED+'44',borderRadius:3,padding:'1px 4px',color:RED,fontSize:8,fontWeight:700}}>ICH</div>}
                      {(()=>{
                        const rec=(f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified';
                        const gym=f.isMe?(myProfile?.gym_verified===true||!!gymVerified):f.gym_verified===true;
                        if(rec&&gym)return <div style={{background:'#27ae6018',border:'1px solid #27ae6055',borderRadius:3,padding:'1px 4px',color:'#27ae60',fontSize:8,fontWeight:700}}>{L('✓ VERIFIZIERT', '✓ VERIFIED', '✓ VÉRIFIÉ', '✓ VERIFICADO')}</div>;
                        return null;
                      })()}
                    </div>
                    <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginTop:1}}>{f.style} - {f.city}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{display:'flex',gap:4,fontSize:11,justifyContent:'flex-end',fontWeight:700}}><span style={{color:'#27ae60'}}>{f.wins}W</span><span style={{color:RED}}>{f.losses}L</span><span style={{color:'#d4a017'}}>{f.draws}D</span></div>
                    <div style={{color:RED,fontSize:10,marginTop:1}}>{score} Pkt</div>
                  </div>
                </div>);
              })}
            </div>
            <div style={{color:'#ddd',fontSize:9,textAlign:'center',marginTop:11,letterSpacing:1}}>{t.rankFormula}</div>
          </div>
        )}

        {tab==='trainer'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>{L('TOP TRAINER', 'TOP COACHES', 'TOP COACHS', 'MEJORES ENTRENADORES')}</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>{L('Die besten Coaches der Welt', 'The best coaches in the world', 'Les meilleurs coachs du monde', 'Los mejores entrenadores del mundo')}</div>
            <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {trStyles.map(s=>(<button key={s} onClick={()=>setTrainerF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:trainerF===s?'#d4a017':'#fff',border:'1px solid '+(trainerF===s?'#d4a017':'#e0e0e0'),color:trainerF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {filteredT.map((tr,i)=>(
                <div key={tr.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,border:'1px solid '+tr.accent+(darkMode?'55':'33'),overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                  <div style={{height:3,background:`linear-gradient(90deg,${tr.accent},transparent)`}}/>
                  <div style={{padding:'14px'}}>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:56,height:56,borderRadius:12,background:tr.accent+'18',border:'2px solid '+tr.accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{tr.emoji}</div>
                        <div style={{position:'absolute',bottom:-5,right:-5,background:i===0?'#d4a017':i===1?'#95a5a6':i===2?'#cd7f32':'#eee',borderRadius:10,padding:'1px 5px'}}><div className='rj' style={{color:i<3?'#fff':'#aaa',fontSize:10}}>#{i+1}</div></div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{tr.name}</div><div style={{color:tr.accent,fontSize:11,fontWeight:700,marginTop:1}}>{tr.style.toUpperCase()}</div></div>
                          <div style={{textAlign:'right'}}><div style={{display:'flex',alignItems:'center',gap:2}}><span style={{color:'#d4a017'}}>★</span><span style={{color:'#1a1a1a',fontWeight:700,fontSize:14}}>{tr.rating}</span></div><div style={{color:'#aaa',fontSize:10}}>{tr.exp} Jahre</div></div>
                        </div>
                        <div style={{color:'#888',fontSize:11,marginTop:2}}>{tr.country} - {tr.gym}</div>
                      </div>
                    </div>
                    <div style={{marginTop:9,color:darkMode?'#ccc':'#666',fontSize:12,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee'),paddingTop:8}}>{tr.bio}</div>
                    <div style={{marginTop:8,background:darkMode?'#2a2a2a':'#f8f8f8',borderRadius:7,padding:'7px 10px'}}><div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:3}}>{L('BEKANNTE SCHUELER', 'KNOWN STUDENTS', 'ÉLÈVES CONNUS', 'ALUMNOS CONOCIDOS')}</div><div style={{color:darkMode?'#ccc':'#666',fontSize:12,fontWeight:600}}>{tr.pupils}</div></div>
                    <div style={{marginTop:8,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:(tr.rating/10*100)+'%',background:`linear-gradient(90deg,${tr.accent},${tr.accent}66)`,borderRadius:2}}/></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='sports'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>{L('SPORTARTEN', 'SPORTS', 'SPORTS', 'DEPORTES')}</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>{t.findEventsCity}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
              {Object.keys(SPORTS).map(s=>{const{color,emoji}=SPORTS[s];const sel=sport===s;return(<button key={s} onClick={()=>setSport(s)} style={{padding:'12px 10px',borderRadius:11,background:sel?color+'25':(darkMode?'#1a1a1a':'#fff'),border:'1px solid '+(sel?color:(darkMode?'#2a2a2a':'#eee')),cursor:'pointer',transition:'all 0.2s',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}><div style={{fontSize:22,marginBottom:4}}>{emoji}</div><div style={{color:sel?color:'#555',fontWeight:700,fontSize:13}}>{s}</div><div style={{color:darkMode?'#666':'#bbb',fontSize:10,marginTop:2}}>{SPORTS[s].games.length} Events</div></button>);})}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {SPORTS[sport].games.map(game=>{
                const{color}=SPORTS[sport];const pct=(game.cur/game.max)*100;const full=game.cur>=game.max;const key=sport+game.id;const isJoined=joined[key];
                return(<div key={game.id} style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
                  <div style={{padding:'13px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{game.title}</div><div style={{color:'#888',fontSize:11}}>📍 {game.location}</div></div>
                      <div style={{background:color+'18',border:'1px solid '+color+'33',borderRadius:6,padding:'3px 8px',height:'fit-content'}}><div style={{color:color,fontSize:11,fontWeight:700}}>{game.level}</div></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{display:'flex',gap:10}}><div style={{color:'#888',fontSize:11}}>🕐 {game.time}</div><div style={{color:'#888',fontSize:11}}>👤 {game.host}</div></div>
                      <div style={{color:full?RED:color,fontSize:11,fontWeight:700}}>{game.cur}/{game.max}</div>
                    </div>
                    <div style={{height:4,background:'#f0f0f0',borderRadius:3,marginBottom:9}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:3}}/></div>
                    <button onClick={()=>setJoined(j=>({...j,[key]:!j[key]}))} style={{width:'100%',padding:'10px',borderRadius:8,background:isJoined?'#f0faf0':full?'#f5f5f5':`linear-gradient(135deg,${color}cc,${color})`,border:isJoined?'1px solid #27ae60':'none',color:isJoined?'#27ae60':full?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1.5,cursor:'pointer',transition:'all 0.2s'}}>
                      {isJoined?'Beigetreten':full?'Ausgebucht':'Mitmachen'}
                    </button>
                  </div>
                </div>);
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:darkMode?'#1a1a1a':'#fff',borderTop:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),display:'flex',height:'calc(60px + env(safe-area-inset-bottom))',paddingBottom:'env(safe-area-inset-bottom)',zIndex:50,boxShadow:'0 -2px 12px rgba(0,0,0,0.06)'}}>
        {tabs.map(([id,iconOrKey,label])=>{const icon=iconOrKey==='unread'?'💬':iconOrKey;const showBadge=iconOrKey==='unread'&&unreadCount>0&&tab!=='chat';return(<button key={id} onClick={()=>{setTab(id);if(id==='chat'){dbMatches.forEach(m=>localStorage.setItem('fighter_last_read_'+m.id,new Date().toISOString()));setUnreadCount(0);}}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',gap:2,borderTop:tab===id?'2px solid '+RED:'2px solid transparent',transition:'all 0.2s',position:'relative'}}><div style={{position:'relative',display:'inline-block'}}><div style={{fontSize:15,opacity:tab===id?1:0.4}}>{icon}</div>{showBadge&&<div style={{position:'absolute',top:-3,right:-5,width:14,height:14,borderRadius:'50%',background:RED,border:'1.5px solid '+(darkMode?'#0d0d0d':'#f5f5f7'),display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:7,fontWeight:700}}>{unreadCount>9?'9+':unreadCount}</span></div>}</div><div style={{color:tab===id?RED:(darkMode?'#666':'#aaa'),fontSize:9,fontFamily:'DM Sans,sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div></button>);})}
      </div>

      {/* GYM VERIFY OVERLAY */}
      {showAdminMsg&&adminMessages.length>0&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:16,padding:20,maxWidth:360,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{fontSize:28}}>📢</div>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:16,letterSpacing:1}}>{L('NACHRICHT VOM TEAM', 'MESSAGE FROM THE TEAM', 'MESSAGE DE L\'ÉQUIPE', 'MENSAJE DEL EQUIPO')}</div>
                <div style={{color:'#aaa',fontSize:11}}>Fighter Support</div>
              </div>
            </div>
            {adminMessages.filter(m=>!m.read).map((m,i)=>(
              <div key={i} style={{background:darkMode?'#111':'#f9f9f9',borderRadius:10,padding:'12px 14px',marginBottom:8,borderLeft:'3px solid '+RED}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,lineHeight:1.6}}>{m.message}</div>
                <div style={{color:'#aaa',fontSize:10,marginTop:4}}>{m.created_at?new Date(m.created_at).toLocaleDateString('de-DE'):''}</div>
              </div>
            ))}
            <button onClick={async()=>{
              setShowAdminMsg(false);
              await markAdminMessagesRead();
            }} style={{width:'100%',padding:'12px',borderRadius:10,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginTop:4}}>
              {L('VERSTANDEN ✓', 'GOT IT ✓', 'COMPRIS ✓', 'ENTENDIDO ✓')}
            </button>
          </div>
        </div>
      )}
      {showPwChange&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:16,padding:24,width:'100%',maxWidth:360,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,color:darkMode?'#fff':'#1a1a1a',letterSpacing:2,marginBottom:4}}>{t.pwChangeTitle}</div>
            <div style={{color:'#aaa',fontSize:12,marginBottom:16}}>{t.pwChangeSub}</div>
            <input
              type='password'
              placeholder={L('Aktuelles Passwort', 'Current password', 'Mot de passe actuel', 'Contraseña actual')}
              value={oldPassword}
              onChange={e=>setOldPassword(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',marginBottom:8,outline:'none'}}
            />
            <input
              type='password'
              placeholder={t.newPw}
              value={newPassword}
              onChange={e=>setNewPassword(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',marginBottom:8,outline:'none'}}
            />
            <input
              type='password'
              placeholder={L('Neues Passwort wiederholen', 'Repeat new password', 'Répète le nouveau mot de passe', 'Repite la nueva contraseña')}
              value={newPassword2}
              onChange={e=>setNewPassword2(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',marginBottom:8,outline:'none'}}
            />
            {pwChangeMsg&&<div style={{color:pwChangeMsg.includes('✅')?'#27ae60':'#e74c3c',fontSize:12,marginBottom:8}}>{pwChangeMsg}</div>}
            <div style={{display:'flex',gap:10,marginTop:8}}>
              <button onClick={()=>{setShowPwChange(false);setOldPassword('');setNewPassword('');setNewPassword2('');setPwChangeMsg('');}} style={{flex:1,padding:'12px',borderRadius:10,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>{L('ABBRECHEN', 'CANCEL', 'ANNULER', 'CANCELAR')}</button>
              <button onClick={async()=>{
                if(!oldPassword){setPwChangeMsg(L('Bitte aktuelles Passwort eingeben', 'Please enter your current password', 'Saisis ton mot de passe actuel', 'Introduce tu contraseña actual'));return;}
                if(!newPassword||newPassword.length<6){setPwChangeMsg(L('Neues Passwort: mindestens 6 Zeichen!', 'New password: at least 6 characters!', 'Nouveau mot de passe : au moins 6 caractères !', 'Nueva contraseña: ¡al menos 6 caracteres!'));return;}
                if(newPassword!==newPassword2){setPwChangeMsg(L('Die neuen Passwörter stimmen nicht überein', 'The new passwords do not match', 'Les nouveaux mots de passe ne correspondent pas', 'Las nuevas contraseñas no coinciden'));return;}
                if(newPassword===oldPassword){setPwChangeMsg(L('Neues Passwort muss sich vom alten unterscheiden', 'The new password must differ from the old one', 'Le nouveau mot de passe doit être différent de l\'ancien', 'La nueva contraseña debe ser distinta de la anterior'));return;}
                setPwChangeMsg(L('Wird geprüft...', 'Checking...', 'Vérification...', 'Comprobando...'));
                try{
                  // E-Mail des Nutzers von Supabase holen
                  const ures=await fetch(SUPA_URL+'/auth/v1/user',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                  const udata=await ures.json();
                  const email=udata.email;
                  if(!email){setPwChangeMsg(L('Fehler: E-Mail nicht gefunden', 'Error: email not found', 'Erreur : e-mail introuvable', 'Error: correo no encontrado'));return;}
                  // Altes Passwort per Test-Login verifizieren
                  const verify=await fetch(SUPA_URL+'/auth/v1/token?grant_type=password',{
                    method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
                    body:JSON.stringify({email,password:oldPassword})
                  });
                  const vdata=await verify.json();
                  if(!vdata.access_token){setPwChangeMsg(L('Aktuelles Passwort ist falsch', 'Current password is incorrect', 'Le mot de passe actuel est incorrect', 'La contraseña actual es incorrecta'));return;}
                  // Neues Passwort setzen (mit frischem Token aus der Verifikation)
                  const resp=await fetch(SUPA_URL+'/auth/v1/user',{
                    method:'PUT',
                    headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+vdata.access_token},
                    body:JSON.stringify({password:newPassword})
                  });
                  const data=await resp.json();
                  if(data.id){
                    setPwChangeMsg(L('✅ Passwort geändert!', '✅ Password changed!', '✅ Mot de passe modifié !', '✅ ¡Contraseña cambiada!'));
                    setTimeout(()=>{setShowPwChange(false);setOldPassword('');setNewPassword('');setNewPassword2('');setPwChangeMsg('');},1500);
                  } else {
                    setPwChangeMsg('Fehler: '+(data.message||data.msg||'Unbekannt'));
                  }
                }catch(e){setPwChangeMsg('Fehler: '+e.message);}
              }} style={{flex:1,padding:'12px',borderRadius:10,background:'#c0392b',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>{L('SPEICHERN', 'SAVE', 'ENREGISTRER', 'GUARDAR')}</button>
            </div>
          </div>
        </div>
      )}
      {showGymVerify&&<div style={{position:'fixed',inset:0,zIndex:500}}><style>{css}</style><GymVerifyModal onClose={()=>{setShowGymVerify(false);setGymCodeInput('');setGymVerifyError('');}} gymCodeInput={gymCodeInput} setGymCodeInput={setGymCodeInput} gymVerifyError={gymVerifyError} setGymVerifyError={setGymVerifyError} gymVerified={gymVerified} setGymVerified={setGymVerified} darkMode={darkMode} showMsg={showMsg} authToken={session?.token} onMembershipChange={ok=>setMyProfile(p=>p?{...p,gym_verified:ok}:p)}/></div>}
      {/* IMPRESSUM MODAL */}
      {showImpressum&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowImpressum(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>{t.back}</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>IMPRESSUM</div>
              <div style={{color:'#c0392b',fontSize:10,letterSpacing:2,marginBottom:20}}>Angaben gemäß § 5 TMG</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Betreiber</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Junior Landu Mfumu, Ottostraße 43, 52070 Aachen, Deutschland</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Kontakt</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>E-Mail: mfumulandu@gmail.com</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Haftungsausschluss</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Inhalte mit größter Sorgfalt erstellt. Nach §§ 8-10 TMG keine Pflicht zur Überwachung übermittelter Informationen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Urheberrecht</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Inhalte unterliegen dem deutschen Urheberrecht. Vervielfältigung bedarf der Zustimmung.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Streitbeilegung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>EU-Plattform: ec.europa.eu/consumers/odr</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {/* DATENSCHUTZ MODAL */}
      {showDatenschutz&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowDatenschutz(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>{t.back}</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>DATENSCHUTZ</div>
              <div style={{color:'#c0392b',fontSize:10,letterSpacing:2,marginBottom:20}}>Datenschutzerklärung gemäß DSGVO</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>1. Verantwortlicher</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Junior Landu Mfumu, Ottostraße 43, 52070 Aachen. E-Mail: mfumulandu@gmail.com</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>2. Erhobene Daten</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>E-Mail, Name, Alter, Stadt, Gym, Kampfstil, Profilbild, Nachrichten, Swipes und Matches.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>3. Zweck</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Bereitstellung der App, Matching, Chat, Gym-Verzeichnis und Ranglisten.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>4. Datenweitergabe</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Keine Weitergabe an Dritte. Dienste: Supabase (EU), Vercel, Resend.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>5. Deine Rechte</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Auskunft, Berichtigung, Löschung. Account löschen: Profil → Einstellungen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>6. Kontakt</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>mfumulandu@gmail.com</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {/* AGB MODAL */}
      {showAGB&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowAGB(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>{t.back}</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>AGB</div>
              <div style={{color:'#c0392b',fontSize:10,letterSpacing:2,marginBottom:20}}>Allgemeine Geschäftsbedingungen</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>1. Leistungsumfang</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Kampfsport-Profil, Matching, Chat, Gym-Suche und Ranglisten. Kein Anspruch auf dauerhaften Betrieb.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>2. Nutzung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Ab 18 Jahren. Beleidigungen oder illegale Inhalte führen zur Sperrung.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>3. Haftung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Keine Haftung für Schäden aus der Nutzung oder Treffen zwischen Nutzern.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>4. Kündigung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Account jederzeit löschbar: Profil → Einstellungen → Account löschen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>5. Geltendes Recht</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Deutsches Recht. Gerichtsstand: Aachen.</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {showRankReminder&&!showFeatureTour&&rankIssuesOf(myProfile).length>0&&(
        <div style={{position:'fixed',inset:0,zIndex:450,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setShowRankReminder(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:16,padding:'22px 20px',maxWidth:360,width:'100%',textAlign:'center',border:'1px solid '+RED+'44'}}>
            <div style={{fontSize:34,marginBottom:6}}>🏆</div>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:8}}>{L('DEIN RANG FEHLT NOCH', 'YOUR RANK IS STILL MISSING', 'TON RANG MANQUE ENCORE', 'AÚN FALTA TU PUESTO')}</div>
            <div style={{color:'#888',fontSize:13,lineHeight:1.5,marginBottom:12}}>{L('Damit du in der Rangliste angezeigt wirst, fehlt noch etwas in deinem Profil:', 'To appear in the ranking, something is still missing in your profile:', 'Pour apparaître dans le classement, il manque encore quelque chose dans ton profil :', 'Para aparecer en el ranking, aún falta algo en tu perfil:')}</div>
            <div style={{textAlign:'left',marginBottom:16}}>
              {rankIssuesOf(myProfile,L).map(it=>(
                <div key={it.k} style={{display:'flex',gap:8,color:darkMode?'#ddd':'#333',fontSize:13,lineHeight:1.4,marginBottom:6}}><span style={{color:RED}}>•</span><span>{it.text}</span></div>
              ))}
            </div>
            <button onClick={()=>{
              const only=rankIssuesOf(myProfile).every(it=>it.k==='record');
              setShowRankReminder(false);
              if(only){setTab('ranking');}
              else{setTab('stats');setEditProfile({});setEditMode(true);}
            }} style={{width:'100%',padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:8}}>{L('PROFIL VERVOLLSTÄNDIGEN', 'COMPLETE PROFILE', 'COMPLÉTER LE PROFIL', 'COMPLETAR PERFIL')}</button>
            <button onClick={()=>setShowRankReminder(false)} style={{background:'none',border:'none',color:'#999',fontSize:12,cursor:'pointer'}}>{L('Später', 'Later', 'Plus tard', 'Más tarde')}</button>
          </div>
        </div>
      )}
      {showFeatureTour&&<OnboardingTour darkMode={darkMode} onFinish={()=>setShowFeatureTour(false)}/>}
      {/* ADMIN PANEL */}
      {showAdmin&&isAdmin&&(
        <AdminPanel
          session={session} darkMode={darkMode} appLang={appLang} t={t}
          dbGyms={dbGyms} gymLogos={gymLogos} events={events} eventParticipants={eventParticipants} GYMS={GYMS}
          setShowAdmin={setShowAdmin} setViewProfile={setViewProfile} setAllProfiles={setAllProfiles} setGymLogos={setGymLogos}
          showMsg={showMsg} loadDbGyms={loadDbGyms} loadEvents={loadEvents} loadGymLogos={loadGymLogos}
          compressImage={compressImage} startAdminChat={startAdminChat}
          openEventEditor={openEventEditor}
          duplicateEvent={duplicateEvent}
        />
      )}
      {/* EVENT ERSTELLEN / BEARBEITEN — bewusst auf oberster Ebene und nicht
          im Events-Tab: aus dem Admin-Bereich heraus (zIndex 600) waere es
          sonst weder sichtbar noch ueberhaupt gerendert. */}
      {showCreateEvent&&isAdmin&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:700,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 40px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>{editEventId?L('EVENT BEARBEITEN', 'EDIT EVENT', 'MODIFIER L\'ÉVÉNEMENT', 'EDITAR EVENTO'):L('EVENT ERSTELLEN', 'CREATE EVENT', 'CRÉER UN ÉVÉNEMENT', 'CREAR EVENTO')}</div>
              <button onClick={closeEventForm} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#aaa'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('TYP', 'TYPE', 'TYPE', 'TIPO')}</div>
                <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                  {['Sparring','Community Training','Wettkampf','Open Mat','Seminar'].map(t=>(
                    <button key={t} onClick={()=>setNewEvent(e=>({...e,event_type:t}))}
                      style={{padding:'7px 12px',borderRadius:20,background:newEvent.event_type===t?RED:'transparent',border:'1px solid '+(newEvent.event_type===t?RED:(darkMode?'#333':'#ddd')),color:newEvent.event_type===t?'#fff':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {[
                [L('TITEL *', 'TITLE *', 'TITRE *', 'TÍTULO *'),'title','text',L('z.B. Community Sparring Düsseldorf', 'e.g. Community Sparring Berlin', 'p. ex. Sparring communautaire Paris', 'p. ej. Sparring comunitario Madrid')],
                [L('STADT *', 'CITY *', 'VILLE *', 'CIUDAD *'),'city','text',L('z.B. Düsseldorf', 'e.g. Berlin', 'p. ex. Paris', 'p. ej. Madrid')],
                [L('ADRESSE', 'ADDRESS', 'ADRESSE', 'DIRECCIÓN'),'address','text',L('z.B. Tiger Gym, Fichtenstraße 12', 'e.g. Tiger Gym, Main Street 12', 'p. ex. Tiger Gym, 12 rue Principale', 'p. ej. Tiger Gym, Calle Mayor 12')],
              ].map(([lbl,key,type,ph])=>(
                <div key={key}>
                  <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{lbl}</div>
                  <input type={type} value={newEvent[key]} onChange={e=>setNewEvent(ev=>({...ev,[key]:e.target.value}))} placeholder={ph}
                    style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('DATUM *', 'DATE *', 'DATE *', 'FECHA *')}</div>
                  <input type='date' value={newEvent.event_date} onChange={e=>setNewEvent(ev=>({...ev,event_date:e.target.value}))}
                    style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('UHRZEIT', 'TIME', 'HEURE', 'HORA')}</div>
                  <input type='time' value={newEvent.event_time} onChange={e=>setNewEvent(ev=>({...ev,event_time:e.target.value}))}
                    style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                </div>
              </div>
              <div>
                <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('MAX. TEILNEHMER', 'MAX. PARTICIPANTS', 'PARTICIPANTS MAX.', 'MÁX. PARTICIPANTES')}</div>
                <input type='number' min='2' max='100' value={newEvent.max_participants} onChange={e=>setNewEvent(ev=>({...ev,max_participants:e.target.value}))}
                  style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('PREIS PRO SESSION (€) — leer lassen für kostenlos', 'PRICE PER SESSION (€) — leave empty for free', 'PRIX PAR SÉANCE (€) — laisser vide si gratuit', 'PRECIO POR SESIÓN (€) — dejar vacío si es gratis')}</div>
                <input type='number' min='0' step='0.5' placeholder='z.B. 10' value={newEvent.price} onChange={e=>setNewEvent(ev=>({...ev,price:e.target.value}))}
                  style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('MONATSBEITRAG (€) — leer lassen, falls es keinen gibt', 'MONTHLY FEE (€) — leave empty if there is none', 'ABONNEMENT MENSUEL (€) — laisser vide s\'il n\'y en a pas', 'CUOTA MENSUAL (€) — dejar vacío si no hay')}</div>
                <div style={{color:'#888',fontSize:10,marginBottom:5,lineHeight:1.4}}>{L('Wer den Monatsbeitrag zahlt, kann alle Sessions diesen Monat besuchen — unabhängig davon, wie viele einzelne Termine du anlegst.', 'Anyone who pays the monthly fee can attend all sessions this month — regardless of how many individual dates you create.', 'Celui qui paie l\'abonnement mensuel peut assister à toutes les séances du mois — quel que soit le nombre de dates créées.', 'Quien pague la cuota mensual puede asistir a todas las sesiones de este mes, sin importar cuántas fechas individuales crees.')}</div>
                <input type='number' min='0' step='0.5' placeholder='z.B. 35' value={newEvent.priceMonthly} onChange={e=>setNewEvent(ev=>({...ev,priceMonthly:e.target.value}))}
                  style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('KAMPFSTILE', 'FIGHTING STYLES', 'STYLES DE COMBAT', 'ESTILOS DE COMBATE')}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['Boxing','MMA','Muay Thai','BJJ','Kickboxing','Grappling','Wrestling','Karate','Alle'].map(s=>(
                    <button key={s} onClick={()=>setNewEvent(ev=>({...ev,styles:ev.styles.includes(s)?ev.styles.filter(x=>x!==s):[...ev.styles,s]}))}
                      style={{padding:'5px 10px',borderRadius:20,background:newEvent.styles.includes(s)?RED:'transparent',border:'1px solid '+(newEvent.styles.includes(s)?RED:(darkMode?'#333':'#ddd')),color:newEvent.styles.includes(s)?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{L('BESCHREIBUNG', 'DESCRIPTION', 'DESCRIPTION', 'DESCRIPCIÓN')}</div>
                <textarea value={newEvent.description} onChange={e=>setNewEvent(ev=>({...ev,description:e.target.value}))} placeholder={L('Was erwartet die Teilnehmer? Level, Ausrüstung, Besonderheiten...', 'What can participants expect? Level, equipment, special notes...', 'À quoi les participants peuvent-ils s\'attendre ? Niveau, équipement, particularités...', '¿Qué pueden esperar los participantes? Nivel, equipo, particularidades...')} rows={3}
                  style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box',resize:'none'}}/>
              </div>
              <button onClick={editEventId?saveEventEdit:createEvent} disabled={creatingEvent}
                style={{width:'100%',padding:'14px',borderRadius:12,background:creatingEvent?'#eee':`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:creatingEvent?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:creatingEvent?'not-allowed':'pointer',marginTop:4}}>
                {creatingEvent?(editEventId?'SPEICHERT...':'ERSTELLT...'):(editEventId?L('ÄNDERUNGEN SPEICHERN 💾', 'SAVE CHANGES 💾', 'ENREGISTRER LES MODIFICATIONS 💾', 'GUARDAR CAMBIOS 💾'):'EVENT ERSTELLEN 🥊')}
              </button>
            </div>
          </div>
        </div>
      )}
      {friendPickerEventId&&(
        <div onClick={()=>setFriendPickerEventId(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:900,display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:darkMode?'#0d0d0d':'#fff',borderRadius:'20px 20px 0 0',padding:'20px',maxHeight:'70vh',display:'flex',flexDirection:'column'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:16,letterSpacing:1,marginBottom:4}}>{L('Freund mitbringen', 'Bring a friend', 'Amener un ami', 'Traer a un amigo')}</div>
            <div style={{color:'#888',fontSize:12,marginBottom:14,lineHeight:1.5}}>{L('Wähle deinen Trainingspartner aus. Sobald er/sie sich auch anmeldet und bezahlt, bekommst du 10€ Rabatt.', 'Choose your training partner. As soon as they also register and pay, you get €10 off.', 'Choisis ton partenaire d\'entraînement. Dès qu\'il/elle s\'inscrit et paie aussi, tu obtiens 10 € de remise.', 'Elige a tu compañero de entrenamiento. En cuanto también se inscriba y pague, recibirás 10 € de descuento.')}</div>
            <input placeholder='Namen suchen...' value={friendSearchQuery} onChange={e=>setFriendSearchQuery(e.target.value)}
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#1a1a1a':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',marginBottom:10}}/>
            <div style={{overflowY:'auto',flex:1}}>
              {allProfiles.filter(p=>p.id!==myProfile?.id&&!p.is_brand&&(!friendSearchQuery||(p.name||'').toLowerCase().includes(friendSearchQuery.toLowerCase()))).slice(0,30).map(p=>(
                <div key={p.id} onClick={()=>{bringFriend(friendPickerEventId,p.id);setFriendPickerEventId(null);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'9px 6px',cursor:'pointer',borderBottom:'1px solid '+(darkMode?'#1a1a1a':'#f5f5f5')}}>
                  {p.avatar_url?<img loading="lazy" src={p.avatar_url} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}} alt=''/>:<div style={{width:36,height:36,borderRadius:'50%',background:darkMode?'#2a2a2a':'#eee',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>}
                  <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{p.name}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setFriendPickerEventId(null)} style={{width:'100%',padding:'12px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#ddd'),color:darkMode?'#999':'#666',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginTop:10}}>{L('Abbrechen', 'Cancel', 'Annuler', 'Cancelar')}</button>
          </div>
        </div>
      )}
      {lightboxImg&&(
        <div onClick={()=>setLightboxImg(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
          <img loading="lazy" src={lightboxImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=''/>
          <button onClick={()=>setLightboxImg(null)} style={{position:'absolute',top:'calc(16px + env(safe-area-inset-top))',right:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:24,width:44,height:44,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
      {matched&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:100,gap:12}}>
          <div className='rj' style={{color:RED,fontSize:12,letterSpacing:8}}>{L('⚡ NEUES MATCH', '⚡ NEW MATCH', '⚡ NOUVEAU MATCH', '⚡ NUEVO MATCH')}</div>
          <div className='rj' style={{fontSize:46,color:'#fff',letterSpacing:4,textAlign:'center',lineHeight:1,animation:'pulse 1.2s infinite'}}>IT'S A MATCH!</div>
          <div style={{fontSize:14,color:'rgba(255,255,255,0.6)',textAlign:'center'}}>{L('Ihr habt beide geswipt — jetzt chatten!', 'You both swiped — start chatting!', 'Vous avez tous les deux swipé — discutez maintenant !', '¡Los dos habéis hecho swipe — a chatear!')}</div>
          {matched.avatar_url?<img loading="lazy" src={matched.avatar_url} style={{width:140,height:140,borderRadius:'50%',objectFit:'cover',border:'3px solid '+RED}} alt=''/>:<div style={{fontSize:52}}>{matched.emoji||''}</div>}
          <div className='rj' style={{color:'#fff',fontSize:24,letterSpacing:2}}>{matched.name}</div>
          <div style={{color:matched.accent||RED,fontSize:12,fontWeight:700}}>{matched.style} · {matched.city}</div>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={()=>{setMatched(null);setTab('chat');}} style={{padding:'13px 28px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>{L('💬 JETZT CHATTEN', '💬 CHAT NOW', '💬 DISCUTER MAINTENANT', '💬 CHATEA AHORA')}</button>
            <button onClick={()=>setMatched(null)} style={{padding:'13px 20px',borderRadius:12,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>{t.weiterSwipen}</button>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}


