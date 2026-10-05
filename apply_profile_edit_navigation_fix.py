#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: Profil-Bearbeitung oeffnet sich scheinbar "von selbst" beim
# Antippen des Profil-Reiters
#
# Der eigentliche Bug sitzt im Reiter RANG, nicht im Reiter PROFIL:
#
# Die beiden grünen/gelben Hinweis-Boxen dort ("Vervollständige dein
# Profil" -> JETZT VERVOLLSTÄNDIGEN, und "Kampfrekord verifizieren" ->
# NACHWEIS HOCHLADEN) setzen beim Antippen nur editMode=true - sie
# wechseln aber NICHT auf den Profil-Reiter. Das Bearbeiten-Fenster wird
# aber nur gerendert, wenn man sich GLEICHZEITIG im Reiter "Profil"
# befindet. Tippt man diese Knöpfe also im Reiter Rang an, passiert
# dadurch sichtbar GAR NICHTS (fühlt sich an wie "man kann nicht
# draufdrücken") - der Zustand "Bearbeiten ist offen" bleibt aber im
# Hintergrund gesetzt. Wechselt man später zum Reiter Profil, erscheint
# das Bearbeiten-Fenster dann scheinbar "automatisch", ohne dass man es
# dort angetippt hat.
#
# Fix: Beide Knöpfe wechseln jetzt zusätzlich direkt auf den Profil-
# Reiter, wenn sie das Bearbeiten-Fenster öffnen - so erscheint es sofort
# dort, wo man es erwartet, und taucht nie mehr "von selbst" auf, wenn man
# später nur den Profil-Reiter antippt.
#
# Dieses Skript aendert nur src/App.js.
#
# Ausfuehren mit: python3 apply_profile_edit_navigation_fix.py
# (im Ordner fighter-app, also da wo auch package.json liegt)
#
# Hinweis: Dieses Skript ist unabhaengig von den beiden zuvor gelieferten
# Patches (apply_wholiked_banner_fix.py, apply_no_fights_option.py) -
# die Reihenfolge, in der du die drei ausfuehrst, spielt keine Rolle.

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

def replace_one_of(content, variants, label):
    # Versucht mehrere moegliche Varianten (z.B. wegen unterschiedlicher
    # Einrueckung, je nachdem ob ein anderer Patch vorher schon lief) -
    # nimmt die erste, die genau 1x vorkommt.
    for old, new in variants:
        if content.count(old) == 1:
            return content.replace(old, new, 1)
    print(f"FEHLER ({label}): keine der bekannten Varianten passt genau 1x auf diesen Code-Stand. Bitte melden.")
    sys.exit(1)

changed = []

app = read('src/App.js')

# 1) "Vervollständige dein Profil" -> JETZT VERVOLLSTÄNDIGEN
old = """                <button onClick={()=>{setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                  JETZT VERVOLLSTÄNDIGEN
                </button>"""
new = """                <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                  JETZT VERVOLLSTÄNDIGEN
                </button>"""
app = replace_once(app, old, new, "JETZT VERVOLLSTÄNDIGEN: wechselt jetzt auch auf den Profil-Reiter")
changed.append("Rang-Tab, 'JETZT VERVOLLSTÄNDIGEN': wechselt jetzt direkt auf den Profil-Reiter, statt das Bearbeiten-Fenster unsichtbar im Hintergrund zu oeffnen")

# 2) "Kampfrekord verifizieren" -> NACHWEIS HOCHLADEN
# Zwei moegliche Varianten, je nachdem ob apply_no_fights_option.py auf
# diesem Code-Stand schon gelaufen ist (dadurch aendert sich nur die
# Einrueckung dieses Knopfes, nicht sein Inhalt).
variants = [
    (
        """                  <button onClick={()=>{setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                    NACHWEIS HOCHLADEN
                  </button>""",
        """                  <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                    NACHWEIS HOCHLADEN
                  </button>""",
    ),
    (
        """                    <button onClick={()=>{setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                      NACHWEIS HOCHLADEN
                    </button>""",
        """                    <button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                      NACHWEIS HOCHLADEN
                    </button>""",
    ),
]
app = replace_one_of(app, variants, "NACHWEIS HOCHLADEN: wechselt jetzt auch auf den Profil-Reiter")
changed.append("Rang-Tab, 'NACHWEIS HOCHLADEN': wechselt jetzt direkt auf den Profil-Reiter, statt das Bearbeiten-Fenster unsichtbar im Hintergrund zu oeffnen")

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
print("5) git add -A && git commit -m \"Fix: Rang-Tab Buttons oeffnen Profil-Bearbeitung nicht mehr unsichtbar im Hintergrund\"")
print("6) git push")
