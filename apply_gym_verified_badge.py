#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: Voller Haken in der Rangliste NUR mit verifiziertem Kampfrekord
# UND verifizierter Gym-Mitgliedschaft (per Gym-Code)
#
# Bisher stand die Gym-Verifizierung nur im Handy des Nutzers (localStorage).
# Andere konnten sie nicht sehen. Jetzt wird sie serverseitig im Profil
# gespeichert (neue Spalten gym_verified, gym_verified_name, gym_verified_at)
# ueber die neue Supabase-Funktion claim_gym_membership().
#
# WICHTIG - REIHENFOLGE:
#   1) ZUERST die Datei supabase/migrations/03_gym_mitgliedschaft.sql
#      (legt dieses Skript an) im Supabase SQL-Editor ausfuehren.
#   2) DANACH diesen Code deployen (push) und das iOS-Update einreichen.
# Wird der Code vor dem SQL deployt, bleibt alles funktionsfaehig (die App
# faellt auf die alte Pruefung zurueck), nur der volle Haken erscheint noch
# bei niemandem.
#
# Rangliste:
#   - VERIFIZIERT (gruen) = Kampfrekord verifiziert UND Gym-Code
#   - alle anderen werden wie frueher angezeigt, ohne Badge
#   Sortierung: voll verifiziert, dann nur Rekord, dann Rest; danach Punkte.
#
# Aendert src/App.js, src/GymVerifyModal.js und legt die SQL-Datei an.
# Ausfuehren mit: python3 apply_gym_verified_badge.py  (im Ordner fighter-app)

import sys, os

for p in ('src/App.js', 'src/GymVerifyModal.js'):
    if not os.path.exists(p):
        print(f"FEHLER: {p} nicht gefunden. Bitte im fighter-app Ordner ausfuehren.")
        sys.exit(1)

def read(p):
    with open(p, 'r', encoding='utf-8') as f:
        return f.read()

def write(p, c):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

def replace_once(content, old, new, label):
    n = content.count(old)
    if n != 1:
        print(f"FEHLER ({label}): Anker {n}x gefunden statt 1x - Skript passt nicht auf diesen Code-Stand. Bitte melden.")
        sys.exit(1)
    return content.replace(old, new, 1)

changed = []
app = read('src/App.js')
modal = read('src/GymVerifyModal.js')

# ---------------------------------------------------------------- Modal
modal = replace_once(
    modal,
    "function GymVerifyModal({onClose,gymCodeInput,setGymCodeInput,gymVerifyError,setGymVerifyError,gymVerified,setGymVerified,darkMode,showMsg}){",
    "function GymVerifyModal({onClose,gymCodeInput,setGymCodeInput,gymVerifyError,setGymVerifyError,gymVerified,setGymVerified,darkMode,showMsg,authToken,onMembershipChange}){",
    "Modal: neue Props")

old = """      const r=await fetch(SUPA_URL+'/rest/v1/rpc/verify_gym_code',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY},
        body:JSON.stringify({input_code:code})
      });
      const data=await r.json();
      const found=Array.isArray(data)&&data.length>0?data[0]:null;
"""
new = """      // 1) Bevorzugt die neue Funktion: prueft den Code serverseitig UND
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
"""
modal = replace_once(modal, old, new, "Modal: claim_gym_membership vor verify_gym_code")

old = """        localStorage.setItem('fighter_gym_verified',JSON.stringify(verified));
"""
new = """        localStorage.setItem('fighter_gym_verified',JSON.stringify(verified));
        if(claimed&&onMembershipChange)onMembershipChange(true);
"""
modal = replace_once(modal, old, new, "Modal: Profil nach Erfolg aktualisieren")

old = """    setGymVerified(null);
    localStorage.removeItem('fighter_gym_verified');
"""
new = """    setGymVerified(null);
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
"""
modal = replace_once(modal, old, new, "Modal: Verifizierung entfernen auch in der Datenbank")
changed.append("GymVerifyModal: speichert die Gym-Verifizierung jetzt serverseitig im Profil (claim_gym_membership), mit Rueckfall auf die alte Pruefung; 'Verifizierung entfernen' nimmt sie auch in der Datenbank zurueck")

# ---------------------------------------------------------------- App.js
app = replace_once(
    app,
    "darkMode={darkMode} showMsg={showMsg}/></div>}\n",
    "darkMode={darkMode} showMsg={showMsg} authToken={session?.token} onMembershipChange={ok=>setMyProfile(p=>p?{...p,gym_verified:ok}:p)}/></div>}\n",
    "App: Modal bekommt Token und Rueckmeldung") if app.count("darkMode={darkMode} showMsg={showMsg}/></div>}\n") == 1 else (print("FEHLER (App: Modal-Aufruf): Anker nicht eindeutig.") or sys.exit(1))
changed.append("App: GymVerifyModal bekommt Anmelde-Token und aktualisiert das eigene Profil")

# Sortierung
old = """        const verA=(a.isMe?(profile.record_verified||myProfile?.record_verified):a.record_verified)==='verified'?1:0;
        const verB=(b.isMe?(profile.record_verified||myProfile?.record_verified):b.record_verified)==='verified'?1:0;
"""
new = """        // Stufe 2 = Kampfrekord UND Gym-Code verifiziert, 1 = nur Kampfrekord, 0 = Rest
        const verLevel=f=>{
          const rec=(f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified';
          const gym=f.isMe?(myProfile?.gym_verified===true||!!gymVerified):f.gym_verified===true;
          return rec&&gym?2:rec?1:0;
        };
        const verA=verLevel(a);
        const verB=verLevel(b);
"""
app = replace_once(app, old, new, "Sortierung: volle Verifizierung zuerst")
app = replace_once(app, "  },[userOnly,profile,myProfile,rankMode,rankF,countryFilter]);",
                   "  },[userOnly,profile,myProfile,rankMode,rankF,countryFilter,gymVerified]);",
                   "ranked: Abhaengigkeit gymVerified")

# Badge
old = """                      {(f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified'
                        ?<div style={{background:'#27ae6018',border:'1px solid #27ae6055',borderRadius:3,padding:'1px 4px',color:'#27ae60',fontSize:8,fontWeight:700}}>✓ VERIFIZIERT</div>
                        :<div style={{background:darkMode?'#222':'#f2f2f2',border:'1px solid '+(darkMode?'#333':'#ddd'),borderRadius:3,padding:'1px 4px',color:darkMode?'#777':'#999',fontSize:8,fontWeight:700}}>NICHT VERIFIZIERT</div>}
"""
new = """                      {(()=>{
                        const rec=(f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified';
                        const gym=f.isMe?(myProfile?.gym_verified===true||!!gymVerified):f.gym_verified===true;
                        if(rec&&gym)return <div style={{background:'#27ae6018',border:'1px solid #27ae6055',borderRadius:3,padding:'1px 4px',color:'#27ae60',fontSize:8,fontWeight:700}}>✓ VERIFIZIERT</div>;
                        return null;
                      })()}
"""
app = replace_once(app, old, new, "Badge mit drei Stufen")
changed.append("Rangliste: gruener Haken nur mit Kampfrekord UND Gym-Code; alle anderen ohne Badge wie frueher; Sortierung: voll verifiziert, dann nur Rekord, dann Rest")

# Hinweistext Box
old = "'Du stehst in der Rangliste, aber noch ohne Haken. Verifiziere deinen Kampfrekord, damit er zählt und du vor nicht verifizierten Fightern stehst. Lade einen Nachweis hoch (Urkunde, offizielles Ergebnis).'"
new = "'Du stehst in der Rangliste, aber noch ohne Haken. Den grünen Haken bekommst du mit verifiziertem Kampfrekord UND verifizierter Gym-Mitgliedschaft (Gym-Code). Lade einen Nachweis hoch (Urkunde, offizielles Ergebnis).'"
app = replace_once(app, old, new, "Hinweistext: Kampfrekord + Gym-Code")

# Zusatzbox: Rekord verifiziert, Gym fehlt noch
anchor = "            {rankMode!=='trainer'&&(profile.country||myProfile?.country)&&(profile.record_verified||myProfile?.record_verified)!=='verified'&&(\n"
box = """            {rankMode!=='trainer'&&(profile.record_verified||myProfile?.record_verified)==='verified'&&!(myProfile?.gym_verified===true||gymVerified)&&(
              <div style={{background:darkMode?'#1a1a10':'#fffbe8',borderRadius:12,padding:'16px',border:'1px solid #d4a01755',marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:6}}>🏋️</div>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,marginBottom:4}}>Gym-Mitgliedschaft verifizieren</div>
                <div style={{color:'#888',fontSize:12,lineHeight:1.5,marginBottom:12}}>
                  Dein Kampfrekord ist verifiziert. Den grünen Haken bekommst du, wenn du auch mit dem Code deines Gyms bestätigst, dass du dort wirklich trainierst.
                </div>
                <button onClick={()=>setShowGymVerify(true)} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                  GYM-CODE EINGEBEN
                </button>
              </div>
            )}
"""
app = replace_once(app, anchor, box + anchor, "Zusatzbox: Gym-Code eingeben")
changed.append("Rang-Tab: neue Box 'Gym-Mitgliedschaft verifizieren' fuer alle mit verifiziertem Rekord, aber ohne Gym-Code")

# Abgleich beim App-Start
anchor = "  // Rangliste neu laden wenn Tab geöffnet wird\n"
eff = """  // Gym-Verifizierung abgleichen: Steht sie schon in der Datenbank, wird sie
  // uebernommen (z.B. auf einem neuen Handy). Wer sich frueher schon per
  // Code verifiziert hat (nur lokal gespeichert), wird einmalig auch in der
  // Datenbank eingetragen. Fehlt die Spalte/Funktion noch, passiert nichts.
  useEffect(()=>{
    if(!session||!myProfile?.id||myProfile.gym_verified===true)return;
    let cancelled=false;
    (async()=>{
      try{
        const r=await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id+'&select=gym_verified',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
        });
        const d=r.ok?await r.json():null;
        if(!Array.isArray(d))return;
        if(d[0]&&d[0].gym_verified===true){
          if(!cancelled)setMyProfile(p=>p?{...p,gym_verified:true}:p);
          return;
        }
        if(!gymVerified||!gymVerified.code)return;
        const rc=await fetch(SUPA_URL+'/rest/v1/rpc/claim_gym_membership',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token},
          body:JSON.stringify({input_code:gymVerified.code})
        });
        const dc=rc.ok?await rc.json():null;
        if(!cancelled&&Array.isArray(dc)&&dc.length>0)setMyProfile(p=>p?{...p,gym_verified:true}:p);
      }catch(e){}
    })();
    return()=>{cancelled=true;};
  },[session,myProfile?.id,myProfile?.gym_verified,gymVerified]);

"""
app = replace_once(app, anchor, eff + anchor, "Abgleich der Gym-Verifizierung")
changed.append("Beim Start wird die Gym-Verifizierung mit der Datenbank abgeglichen (alte lokale Verifizierungen werden einmalig nachgetragen)")

write('src/App.js', app)
write('src/GymVerifyModal.js', modal)

# ---------------------------------------------------------------- SQL-Datei
sql = """-- ============================================================
--  3) GYM-MITGLIEDSCHAFT serverseitig speichern
-- ============================================================
--
-- Bisher stand die Gym-Verifizierung nur im Handy des Nutzers
-- (localStorage). Damit die Rangliste den vollen Haken nur bei
-- Kampfrekord UND Gym-Code zeigen kann, wird sie jetzt im Profil
-- gespeichert.
--
-- Die Pruefung des Codes bleibt serverseitig. Die Spalten werden
-- NUR von den beiden Funktionen unten gesetzt (security definer).
-- Die bisherige Funktion verify_gym_code() bleibt unveraendert.
--
-- SO FUEHRST DU DAS AUS:
--   Supabase-Dashboard -> SQL Editor -> New query -> alles hier
--   einfuegen -> "Run". Mehrfaches Ausfuehren schadet nicht.
--
-- HINWEIS: Das Sperren der Spalten gegen direktes Setzen durch Nutzer
-- (record_verified, gym_verified) ist ein eigener, spaeterer Schritt.
-- ============================================================

alter table public.profiles
  add column if not exists gym_verified boolean not null default false,
  add column if not exists gym_verified_name text,
  add column if not exists gym_verified_at timestamptz;

create or replace function public.claim_gym_membership(input_code text)
returns table(gym_name text, gym_city text)
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  select id, name, city into g from public.gyms
   where upper(btrim(verify_code)) = upper(btrim(input_code))
   limit 1;
  if not found then return; end if;
  update public.profiles
     set gym_verified = true,
         gym_verified_name = g.name,
         gym_verified_at = now()
   where user_id = auth.uid();
  return query select g.name::text, g.city::text;
end $$;

create or replace function public.release_gym_membership()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  update public.profiles
     set gym_verified = false, gym_verified_name = null, gym_verified_at = null
   where user_id = auth.uid();
end $$;

revoke all on function public.claim_gym_membership(text) from public, anon;
revoke all on function public.release_gym_membership() from public, anon;
grant execute on function public.claim_gym_membership(text) to authenticated;
grant execute on function public.release_gym_membership() to authenticated;
"""
os.makedirs('supabase/migrations', exist_ok=True)
write('supabase/migrations/03_gym_mitgliedschaft.sql', sql)
changed.append("Neue Datei supabase/migrations/03_gym_mitgliedschaft.sql (im Supabase SQL-Editor ausfuehren)")

print()
print("FERTIG. Aenderungen:")
for c in changed:
    print(" -", c)
print()
print("Naechste Schritte:")
print("1) npx eslint --no-eslintrc -c .eslintrc-undef.json --ignore-pattern \"**/*.test.js\" src/")
print("2) CI=true npm test    (muss 50/50 gruen zeigen)")
print("3) CI=true npm run build    (muss 'Compiled successfully' zeigen)")
print("4) npm run check:integrity")
print("5) ERST: Inhalt von supabase/migrations/03_gym_mitgliedschaft.sql im Supabase SQL-Editor ausfuehren")
print("6) git add -A && git commit -m \"Voller Haken nur mit Kampfrekord + Gym-Code\" && git push")
