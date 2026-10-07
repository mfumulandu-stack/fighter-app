#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: Rangliste zeigt wieder ALLE an - Verifizierung bleibt Pflicht
#
# Bisher stand nur in der Rangliste, wer 'verifiziert' war. Wer Kaempfe
# eingetragen hatte, aber nicht verifiziert war, tauchte nicht auf - die
# Rangliste wirkte "begrenzt".
#
# Neu:
# 1) Alle Fighter stehen in der Rangliste (auch ohne Verifizierung).
# 2) Verifizierte Fighter stehen immer VOR nicht verifizierten (danach nach
#    Punkten). So lohnt sich die Verifizierung, und erfundene Bilanzen
#    stehen nie vor geprueften.
# 3) Jede Zeile zeigt "VERIFIZIERT" (gruen) oder "NICHT VERIFIZIERT" (grau).
# 4) Die Hinweisbox "Kampfrekord verifizieren" erklaert das neu.
# 5) Luecke geschlossen: Wer verifiziert ist und danach Siege/Niederlagen/
#    Unentschieden im Profil AENDERT (auf mehr als 0 Kaempfe), verliert die
#    Verifizierung und muss einen Nachweis hochladen. Vorher blieb man
#    nach "Ich habe noch keine Kaempfe" verifiziert, auch wenn man danach
#    beliebige Siege eintrug.
#
# Aendert nur src/App.js.
# Ausfuehren mit: python3 apply_ranking_show_all.py  (im Ordner fighter-app)

import sys, os

if not os.path.exists('src/App.js'):
    print("FEHLER: src/App.js nicht gefunden. Bitte im fighter-app Ordner ausfuehren.")
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

app = read('src/App.js')
changed = []

# 1) Filter auf "verified" entfernen
old = """      // Nur mit verifiziertem Kampfrekord in der Rangliste - verhindert
      // erfundene Bilanzen. Eigenes Profil zaehlt hier genauso wie alle
      // anderen, kein Sonderfall.
      .filter(f=>{
        const rv=f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified;
        return rv==='verified';
      })
"""
new = """      // Alle Fighter stehen in der Rangliste. Verifizierte stehen aber immer
      // vor nicht verifizierten (siehe Sortierung unten) - das verhindert,
      // dass erfundene Bilanzen vor geprueften stehen.
"""
app = replace_once(app, old, new, "Verifiziert-Filter entfernen")
changed.append("Rangliste zeigt jetzt alle Fighter, nicht nur verifizierte")

# 2) Sortierung: verifizierte zuerst
old = "        return scoreB-scoreA;\n"
new = """        const verA=(a.isMe?(profile.record_verified||myProfile?.record_verified):a.record_verified)==='verified'?1:0;
        const verB=(b.isMe?(profile.record_verified||myProfile?.record_verified):b.record_verified)==='verified'?1:0;
        if(verA!==verB)return verB-verA;
        return scoreB-scoreA;
"""
app = replace_once(app, old, new, "Sortierung: verifizierte zuerst")
changed.append("Verifizierte Fighter stehen vor nicht verifizierten, danach nach Punkten")

# 3) Badge in jeder Zeile
old = """{f.isMe&&<div style={{background:'#fdf0ef',border:'1px solid '+RED+'44',borderRadius:3,padding:'1px 4px',color:RED,fontSize:8,fontWeight:700}}>ICH</div>}
"""
new = """{f.isMe&&<div style={{background:'#fdf0ef',border:'1px solid '+RED+'44',borderRadius:3,padding:'1px 4px',color:RED,fontSize:8,fontWeight:700}}>ICH</div>}
                      {(f.isMe?(profile.record_verified||myProfile?.record_verified):f.record_verified)==='verified'
                        ?<div style={{background:'#27ae6018',border:'1px solid #27ae6055',borderRadius:3,padding:'1px 4px',color:'#27ae60',fontSize:8,fontWeight:700}}>✓ VERIFIZIERT</div>
                        :<div style={{background:darkMode?'#222':'#f2f2f2',border:'1px solid '+(darkMode?'#333':'#ddd'),borderRadius:3,padding:'1px 4px',color:darkMode?'#777':'#999',fontSize:8,fontWeight:700}}>NICHT VERIFIZIERT</div>}
"""
app = replace_once(app, old, new, "Verifiziert-Badge in der Zeile")
changed.append("Jede Zeile zeigt VERIFIZIERT bzw. NICHT VERIFIZIERT")

# 4) Texte der Hinweisbox
old = "?'Dein Nachweis wird geprüft — sobald bestätigt, tauchst du in der Rangliste auf.'"
new = "?'Dein Nachweis wird geprüft — sobald bestätigt, bekommst du den Haken und stehst vor allen nicht verifizierten Fightern.'"
app = replace_once(app, old, new, "Text pending")
old = "'Um in der Rangliste aufzutauchen, muss dein Kampfrekord verifiziert werden. Lade einen Nachweis hoch (Urkunde, offizielles Ergebnis).'"
new = "'Du stehst in der Rangliste, aber noch ohne Haken. Verifiziere deinen Kampfrekord, damit er zählt und du vor nicht verifizierten Fightern stehst. Lade einen Nachweis hoch (Urkunde, offizielles Ergebnis).'"
app = replace_once(app, old, new, "Text Hinweisbox")
changed.append("Hinweisbox 'Kampfrekord verifizieren' erklaert jetzt Haken und Reihenfolge")

# 5) Keine-Kaempfe-Texte
old = "'Du hast noch keine Kämpfe? Dein Rekord wird als 0-0-0 verifiziert und du erscheinst damit in der Rangliste.'"
new = "'Du hast noch keine Kämpfe? Dein Rekord wird als 0-0-0 verifiziert und du bekommst damit den Haken in der Rangliste.'"
app = replace_once(app, old, new, "Text Keine-Kaempfe Rueckfrage")
old = """showMsg('✅ Als "keine Kämpfe" markiert - du erscheinst jetzt in der Rangliste.');"""
new = """showMsg('✅ Als "keine Kämpfe" markiert - du hast jetzt den Haken in der Rangliste.');"""
app = replace_once(app, old, new, "Text Keine-Kaempfe Meldung")

# 6) Luecke schliessen: Aenderung der Kampfzahlen hebt Verifizierung auf
old = """        const statsChanged=(myProfile.wins||0)!==d.wins||(myProfile.losses||0)!==d.losses||(myProfile.draws||0)!==d.draws;
"""
new = """        const statsChanged=(myProfile.wins||0)!==d.wins||(myProfile.losses||0)!==d.losses||(myProfile.draws||0)!==d.draws;
        // Wer verifiziert war (z.B. ueber 'keine Kaempfe') und danach Kampfzahlen
        // auf mehr als 0 aendert, muss neu verifizieren - sonst wuerden
        // ungepruefte Bilanzen als verifiziert gelten.
        if(statsChanged&&(d.wins+d.losses+d.draws)>0&&myProfile.record_verified==='verified'){d.record_verified=null;}
"""
app = replace_once(app, old, new, "Verifizierung bei geaenderten Kampfzahlen aufheben")
changed.append("Aenderung der Kampfzahlen (auf mehr als 0) hebt die Verifizierung auf")

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
print("5) git add -A && git commit -m \"Rangliste zeigt alle an, Verifizierte zuerst, Haken-Anzeige\"")
print("6) git push")
