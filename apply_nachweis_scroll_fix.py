#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: "NACHWEIS HOCHLADEN" (Reiter Rang) oeffnete "Profil bearbeiten"
#
# Der Nachweis-Upload (Urkunde/Medaille) ist NICHT im Bearbeiten-Fenster,
# sondern eine eigene Box "KAMPFREKORD VERIFIZIEREN" weiter unten auf der
# Profil-Seite. Der Knopf oeffnete trotzdem das Bearbeiten-Fenster - dort
# gibt es keinen Upload.
# Fix: Der Knopf wechselt auf den Profil-Reiter und scrollt direkt zur
# Upload-Box. Das Bearbeiten-Fenster geht nicht mehr auf.
# ("JETZT VERVOLLSTAENDIGEN" fuer das Land bleibt unveraendert - das Land
# stellt man tatsaechlich im Bearbeiten-Fenster ein.)
#
# Voraussetzung: apply_profile_edit_navigation_fix.py ist schon gelaufen.
# Ausfuehren mit: python3 apply_nachweis_scroll_fix.py   (im fighter-app Ordner)
import sys, os
if not os.path.exists('src/App.js'):
    print("FEHLER: src/App.js nicht gefunden. Bitte im fighter-app Ordner ausfuehren."); sys.exit(1)
def read(p):
    with open(p,'r',encoding='utf-8') as f: return f.read()
def write(p,c):
    with open(p,'w',encoding='utf-8') as f: f.write(c)
def replace_once(c,old,new,label):
    n=c.count(old)
    if n!=1:
        print(f"FEHLER ({label}): Anker {n}x gefunden statt 1x - Skript passt nicht auf diesen Code-Stand. Bitte melden."); sys.exit(1)
    return c.replace(old,new,1)

app=read('src/App.js')
app=replace_once(app,
"<button onClick={()=>{setTab('stats');setEditProfile({});setEditMode(true);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)'",
"<button onClick={()=>{setTab('stats');setTimeout(()=>{const el=document.getElementById('record-verify-box');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},200);}} style={{padding:'9px 20px',borderRadius:8,background:'linear-gradient(135deg,#27ae60,#2ecc71)'",
"NACHWEIS-Knopf: nur Reiter wechseln + scrollen")
app=replace_once(app,
"            {/* VERIFIZIERTER KAMPFREKORD */}\n            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px'",
"            {/* VERIFIZIERTER KAMPFREKORD */}\n            <div id='record-verify-box' style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px'",
"Upload-Box: id fuer Scroll-Ziel")
write('src/App.js',app)
print("\nFERTIG. Aenderungen:\n - NACHWEIS HOCHLADEN wechselt auf den Profil-Reiter und scrollt zur Upload-Box (kein Bearbeiten-Fenster mehr)\n")
print("Naechste Schritte:\n1) npx eslint --no-eslintrc -c .eslintrc-undef.json --ignore-pattern \"**/*.test.js\" src/\n2) CI=true npm test\n3) CI=true npm run build\n4) npm run check:integrity\n5) git add -A && git commit -m \"Fix: Nachweis-Knopf scrollt zur Upload-Box statt Profil-Bearbeitung zu oeffnen\"\n6) git push")
