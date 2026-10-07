#!/usr/bin/env python3
"""Trainingshistorie: Eintrag nach links wischen zum Loeschen (wie bei den Chats), kein Papierkorb-Button mehr."""
import sys, os
for p in ('src/App.js','src/SwipeableChatRow.js'):
    if not os.path.exists(p): sys.exit('FEHLER: Im Ordner fighter-app ausfuehren.')
A=open('src/App.js',encoding='utf-8').read()
S=open('src/SwipeableChatRow.js',encoding='utf-8').read()
if 'confirmText' in S: sys.exit('Schon angewendet. Nichts zu tun.')
if 'deleteHistoryEntry' not in A: sys.exit('FEHLER: apply_history_delete.py fehlt noch. Erst den ausfuehren.')
def ro(s,old,new,name):
    n=s.count(old)
    if n!=1: sys.exit('FEHLER bei "%s": Anker %d mal (erwartet 1). Nichts geaendert.'%(name,n))
    return s.replace(old,new)

# SwipeableChatRow: Text, Radius, Hintergrund einstellbar (Standard = wie bisher fuer Chats)
S=ro(S,"function SwipeableChatRow({ children, onDelete, darkMode }) {","function SwipeableChatRow({ children, onDelete, darkMode, confirmText, radius, bg }) {","props")
S=ro(S,"window.confirm('Chat löschen? Das kann nicht rückgängig gemacht werden.')","window.confirm(confirmText || 'Chat löschen? Das kann nicht rückgängig gemacht werden.')","confirm")
S=ro(S,"overflow: 'hidden', borderRadius: 13 }}","overflow: 'hidden', borderRadius: radius || 13 }}","radius")
S=ro(S,"background: darkMode ? '#0d0d0d' : '#f5f5f7',","background: bg || (darkMode ? '#0d0d0d' : '#f5f5f7'),","bg")

# deleteHistoryEntry: Rueckfrage kommt jetzt vom Wisch-Feld
A=ro(A,"    if(!window.confirm('Diesen Eintrag aus deiner Trainingshistorie löschen?'))return;\n","","confirm-fn")

# Zeile in SwipeableChatRow packen, Papierkorb-Button raus
A=ro(A,"""                  {fightHistory.slice(0,15).map((f,i)=>(
                    <div key={f.id||i} style={{""","""                  {fightHistory.slice(0,15).map((f,i)=>{
                    const histRow=(
                    <div style={{""","open")
A=ro(A,"""                      {f.id&&(
                        <button onClick={e=>{e.stopPropagation();deleteHistoryEntry(f);}} aria-label='Eintrag löschen' style={{background:'none',border:'none',cursor:'pointer',fontSize:16,padding:'4px 2px',flexShrink:0,opacity:0.7}}>🗑️</button>
                      )}
                    </div>
                  ))}""","""                    </div>
                    );
                    return f.id
                      ?<SwipeableChatRow key={f.id} darkMode={darkMode} radius={10} bg={darkMode?'#111':'#f9f9f9'} confirmText='Diesen Eintrag aus deiner Trainingshistorie löschen?' onDelete={()=>deleteHistoryEntry(f)}>{histRow}</SwipeableChatRow>
                      :<div key={i}>{histRow}</div>;
                  })}""","close")
open('src/App.js','w',encoding='utf-8').write(A)
open('src/SwipeableChatRow.js','w',encoding='utf-8').write(S)
print('OK: Patch angewendet.')
