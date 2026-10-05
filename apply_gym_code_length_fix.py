#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Fighter App: Gym-Codes aus dem Admin-Panel passen nicht ins Eingabefeld
#
# Ursache: Das Eingabefeld im Fenster "GYM VERIFIZIEREN" ist auf maximal
# 6 Zeichen begrenzt (maxLength={6}). Seit der Migration, die allen Gyms
# einen Code gegeben hat (02_gym_codes_fuer_alle.sql), haben aber 302 von
# 326 Gyms 8-stellige Codes (z.B. 3F9A1C2E). Nur die 24 aelteren Gyms mit
# 6-stelligen Codes (z.B. MUKT69) liessen sich eintragen. Bei allen anderen
# schnitt das Feld die letzten 2 Zeichen ab - der Code konnte nie stimmen.
#
# Fix (nur src/GymVerifyModal.js):
#  - Feld nimmt jetzt bis zu 8 Zeichen an (6-stellige Codes gehen weiter).
#  - Leerzeichen/Bindestriche beim Eintippen oder Einfuegen werden
#    automatisch entfernt (Copy&Paste aus WhatsApp o.ae. klappt).
#  - Hinweistext sagt nicht mehr fest "8-stellig".
#
# Ausfuehren mit: python3 apply_gym_code_length_fix.py
# (im Ordner fighter-app, also da wo package.json liegt)

import sys, os

P = 'src/GymVerifyModal.js'
if not os.path.exists(P):
    print("FEHLER: src/GymVerifyModal.js nicht gefunden. Bitte im fighter-app Ordner ausfuehren.")
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
g = read(P)

g = replace_once(g,
"onChange={e=>{setGymCodeInput(e.target.value.toUpperCase());setGymVerifyError('');}}",
"onChange={e=>{setGymCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8));setGymVerifyError('');}}",
"onChange: Sonderzeichen entfernen, max 8")
changed.append("Eingabe: Leerzeichen/Bindestriche werden automatisch entfernt")

g = replace_once(g,
"                  placeholder='z.B. RHKM8B'\n                  maxLength={6}\n",
"                  placeholder='z.B. 3F9A1C2E'\n                  maxLength={8}\n",
"maxLength 6 -> 8")
changed.append("Eingabefeld: maximal 8 statt 6 Zeichen (6-stellige Codes funktionieren weiter)")

g = replace_once(g,
"Der 8-stellige Code wird dir direkt mitgeteilt.",
"Der Code (6 bis 8 Zeichen) wird dir direkt mitgeteilt.",
"Hinweistext")
changed.append("Hinweistext nicht mehr fest auf '8-stellig'")

write(P, g)
print()
print("FERTIG. Aenderungen:")
for c in changed: print(" -", c)
print()
print("Naechste Schritte:")
print("1) npx eslint --no-eslintrc -c .eslintrc-undef.json --ignore-pattern \"**/*.test.js\" src/")
print("2) CI=true npm test    (muss 50/50 gruen zeigen)")
print("3) CI=true npm run build    (muss 'Compiled successfully' zeigen)")
print("4) npm run check:integrity")
print("5) git add -A && git commit -m \"Fix: Gym-Code-Eingabefeld akzeptiert jetzt 8-stellige Codes\"")
print("6) git push")
