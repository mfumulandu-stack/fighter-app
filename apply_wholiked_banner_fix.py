#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: "Wer hat dich gemocht" wieder zurueck auf den Banner,
# Banner bleibt sichtbar bis alle bearbeitet sind, Liste bekommt einen
# "Entfernen"-Knopf
#
# Korrektur zur letzten Auslieferung: Der Menüpunkt "Wer hat dich gemocht"
# im Seitenmenü wird wieder entfernt - stattdessen bleibt der rote Banner
# oben ("X Fighter interessieren sich für dich") der einzige Einstiegspunkt.
#
# Der Banner wurde bisher ausgeblendet, sobald man ihn einmal angetippt
# hatte ("gesehen"), auch wenn in der Liste noch unbearbeitete Interessenten
# standen. Jetzt gilt: der Banner bleibt sichtbar, SOLANGE es noch
# unbearbeitete Interessenten gibt - unabhaengig davon, ob er schon
# angetippt wurde. Er verschwindet erst, wenn die Liste leer ist.
#
# Damit die Liste ueberhaupt leer werden kann (ohne dass man jeden
# einzelnen matchen muss), bekommt jeder Eintrag in der Liste jetzt einen
# zweiten Knopf "✕ Entfernen" neben "⚔️ MATCH". Entfernen trägt einen
# normalen "pass"-Swipe ein (genau wie ein Wegwischen beim normalen
# Swipen) und nimmt die Person aus der Liste - ohne zu matchen.
#
# Benachrichtigungen: Wenn jemand dich liked, bekommst du bereits jetzt
# eine Push-Benachrichtigung ("👀 Jemand interessiert sich für dich!").
# Das ist unveraendert und bleibt so bestehen.
#
# Dieses Skript aendert nur src/App.js.
#
# Ausfuehren mit: python3 apply_wholiked_banner_fix.py
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

# 1) Menüpunkt "Wer hat dich gemocht" wieder entfernen
old = """                {icon:'',label:'Mein Profil',action:()=>{setTab('stats');setShowMenu(false);}},
                {icon:'',label:'Wer hat dich gemocht',action:()=>{setWhoLikedTab(true);setShowMenu(false);loadWhoLikedMe(session,myProfile);}},
                {icon:'',label:'Equipment',action:()=>{setShowEquipment(true);setShowMenu(false);}},"""
new = """                {icon:'',label:'Mein Profil',action:()=>{setTab('stats');setShowMenu(false);}},
                {icon:'',label:'Equipment',action:()=>{setShowEquipment(true);setShowMenu(false);}},"""
app = replace_once(app, old, new, "Menüpunkt 'Wer hat dich gemocht' entfernen")
changed.append("Menüpunkt 'Wer hat dich gemocht' aus dem Seitenmenü wieder entfernt - Banner ist wieder der einzige Einstiegspunkt")

# 2) Banner bleibt sichtbar, solange die Liste nicht leer ist (nicht nur
#    bis er einmal angetippt wurde)
old = "            {whoLikedMe.length>0&&(newLikesCount>0||!likesBannerSeen)&&("
new = """            {/* Banner bleibt sichtbar, bis die Liste wirklich leer ist -
                nicht nur bis er einmal angetippt wurde */}
            {whoLikedMe.length>0&&("""
app = replace_once(app, old, new, "Banner-Bedingung: bleibt sichtbar bis Liste leer ist")
changed.append("Banner 'X Fighter interessieren sich für dich' bleibt jetzt sichtbar, solange noch unbearbeitete Interessenten in der Liste sind - verschwindet erst, wenn die Liste leer ist")

# 3) "Entfernen"-Knopf neben "⚔️ MATCH" in der Liste
old = """              }} style={{background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',borderRadius:10,padding:'10px 14px',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                ⚔️ MATCH
              </button>
            </div>
          </div>
        ))}"""
new = """              }} style={{background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',borderRadius:10,padding:'10px 14px',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                ⚔️ MATCH
              </button>
              <button onClick={async()=>{
                // Entfernen - kein Match, zaehlt wie ein normales Wegwischen
                try{
                  await dbInsert('swipes',{swiper_id:myProfile.id,target_id:p.id,direction:'pass'},session.token);
                  setWhoLikedMe(prev=>prev.filter(x=>x.id!==p.id));
                }catch(e){showMsg('Fehler: '+e.message);}
              }} style={{background:'none',border:'1px solid '+(darkMode?'#333':'#ddd'),borderRadius:10,padding:'10px 12px',color:darkMode?'#777':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                ✕
              </button>
            </div>
          </div>
        ))}"""
app = replace_once(app, old, new, "Entfernen-Knopf in der Liste einfuegen")
changed.append("Neuer 'Entfernen'-Knopf (✕) in der 'Wer hat dich gemocht'-Liste - trägt einen pass-Swipe ein und nimmt die Person aus der Liste, ohne zu matchen")

write('src/App.js', app)

print()
print("FERTIG. Aenderungen:")
for c in changed:
    print(" -", c)
print()
print("Hinweis Benachrichtigungen: Wenn jemand dich liked, geht bereits jetzt")
print("eine Push-Benachrichtigung ('Jemand interessiert sich für dich!') an")
print("diese Person raus - das war schon vorher so und bleibt unveraendert.")
print()
print("Naechste Schritte:")
print("1) npx eslint --no-eslintrc -c .eslintrc-undef.json --ignore-pattern \"**/*.test.js\" src/")
print("2) CI=true npm test    (muss 50/50 gruen zeigen)")
print("3) CI=true npm run build    (muss 'Compiled successfully' zeigen)")
print("4) npm run check:integrity")
print("5) git add -A && git commit -m \"Fix: 'Wer hat dich gemocht' wieder nur ueber Banner, Banner bleibt bis Liste leer, Entfernen-Knopf\"")
print("6) git push")
