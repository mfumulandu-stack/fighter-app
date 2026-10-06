#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: "Ich habe noch keine Kämpfe"-Option im Reiter Rang
#
# Bisher gab es in der grünen Box "Kampfrekord verifizieren" (Reiter Rang)
# nur einen einzigen Knopf: "NACHWEIS HOCHLADEN" (Urkunde/Medaille
# hochladen -> wird von uns per Hand geprueft). Wer aber noch GAR KEINE
# Kämpfe hat, hat auch keinen Nachweis zum Hochladen - fuer diese Person
# gab es in der Box nichts zum Draufdruecken, und ohne Verifizierung
# blieb sie aus der Rangliste draussen (die Rangliste wirkte dadurch
# "limitiert").
#
# Neu: Wenn das eigene Profil aktuell 0 Siege/Niederlagen/Unentschieden
# hat, erscheint in der Box zusaetzlich ein zweiter, dezenterer Knopf
# "ICH HABE NOCH KEINE KÄMPFE". Ein Tap (mit Sicherheitsabfrage) setzt den
# Rekord direkt und ohne Pruef-Wartezeit auf 0-0-0 "verifiziert" - das ist
# unproblematisch, weil eine Bilanz von 0-0-0 im Ranking-Score ohnehin 0
# Punkte bringt und sich damit nicht faelschen laesst. Danach taucht man
# sofort in der kompletten Rangliste auf (ganz unten, bis zu den ersten
# echten Kaempfen).
#
# Hat man dagegen schon Sieg/Niederlage/Unentschieden-Zahlen eingetragen,
# bleibt es beim bisherigen Weg (Nachweis hochladen) - der zweite Knopf
# erscheint dann nicht.
#
# Dieses Skript aendert nur src/App.js.
#
# Ausfuehren mit: python3 apply_no_fights_option.py
# (im Ordner fighter-app, also da wo auch package.json liegt)

import sys, os

if not os.path.exists('src/App.js'):
    print("FEHLER: src/App.js nicht gefunden. Bitte im fighter-app Ordner ausfuehren.")
    sys.exit(1)

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def replace_once(content, old, new, label):
    count = content.count(old)
    if count != 1:
        print(f"FEHLER ({label}): Anker {count}x gefunden statt 1x - Skript passt nicht auf diesen Code-Stand. Bitte melden.")
        sys.exit(1)
    return content.replace(old, new, 1)

changed = []

app = read('src/App.js')

old = """                {(profile.record_verified||myProfile?.record_verified)!=='pending'&&(
                  <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                    NACHWEIS HOCHLADEN
                  </button>
                )}"""
new = """                {(profile.record_verified||myProfile?.record_verified)!=='pending'&&(
                  <>
                    <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                      NACHWEIS HOCHLADEN
                    </button>
                    {(myProfile?.wins||0)+(myProfile?.losses||0)+(myProfile?.draws||0)===0&&(
                      <button onClick={async()=>{
                        // 0-0-0 laesst sich nicht faelschen (bringt 0 Punkte) - deshalb
                        // hier direkt verifizieren, ohne Warten auf Pruefung durch uns.
                        if(!window.confirm('Du hast noch keine Kämpfe? Dein Rekord wird als 0-0-0 verifiziert und du erscheinst damit in der Rangliste.'))return;
                        try{
                          await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                            method:'PATCH',
                            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                            body:JSON.stringify({wins:0,losses:0,draws:0,ko:0,record_verified:'verified',record_proof_url:null})
                          });
                          setMyProfile(p=>({...p,wins:0,losses:0,draws:0,ko:0,record_verified:'verified'}));
                          setStats({wins:0,losses:0,draws:0,ko:0});
                          showMsg('✅ Als "keine Kämpfe" markiert - du erscheinst jetzt in der Rangliste.');
                        }catch(e){showMsg('Fehler: '+e.message);}
                      }} style={{marginTop:8,padding:'8px 16px',borderRadius:8,background:'none',border:'1px solid #27ae6066',color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                        ICH HABE NOCH KEINE KÄMPFE
                      </button>
                    )}
                  </>
                )}"""
app = replace_once(app, old, new, "Rang-Tab: 'Ich habe noch keine Kämpfe'-Knopf einfuegen")
changed.append("Reiter Rang: in der Box 'Kampfrekord verifizieren' erscheint jetzt (nur bei 0-0-0-Bilanz) zusaetzlich der Knopf 'ICH HABE NOCH KEINE KÄMPFE' - direkt verifiziert ohne Wartezeit, man taucht danach in der Rangliste auf")

write('src/App.js', app)

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
print("5) git add -A && git commit -m \"Feature: 'Ich habe noch keine Kämpfe'-Option im Reiter Rang\"")
print("6) git push")
