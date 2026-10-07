#!/usr/bin/env python3
"""Doppelte Chats (mehrere Matches mit derselben Person) werden zu EINEM Chat zusammengefasst.
Angezeigt wird der mit der neuesten Aktivitaet. Beim Loeschen werden auch die Duplikate entfernt."""
import sys, os
P='src/App.js'
if not os.path.exists(P): sys.exit('FEHLER: Im Ordner fighter-app ausfuehren.')
s=open(P,encoding='utf-8').read()
if 'dupIds' in s: sys.exit('Schon angewendet. Nichts zu tun.')
def ro(s,old,new,name):
    n=s.count(old)
    if n!=1: sys.exit('FEHLER bei "%s": Anker %d mal (erwartet 1). Nichts geaendert.'%(name,n))
    return s.replace(old,new)

s=ro(s,"""      setDbMatches(sorted);
      // Ungelesene zählen
      const unread=sorted.filter(""","""      // Doppelte Matches mit derselben Person zusammenfassen (neuester bleibt)
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
      const unread=deduped.filter(""","dedupe")

s=ro(s,"""  async function deleteChat(matchId){
    try{
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=eq.'+matchId,{
        method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
      await fetch(SUPA_URL+'/rest/v1/matches?id=eq.'+matchId,{
        method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });""","""  async function deleteChat(matchId){
    try{
      // inkl. zusammengefasster Duplikate, sonst taucht der Chat gleich wieder auf
      const allIds=[matchId,...(((dbMatches.find(x=>x.id===matchId)||{}).dupIds)||[])];
      const idList=allIds.map(encodeURIComponent).join(',');
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=in.('+idList+')',{
        method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
      await fetch(SUPA_URL+'/rest/v1/matches?id=in.('+idList+')',{
        method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });""","delete")
open(P,'w',encoding='utf-8').write(s)
print('OK: Patch angewendet.')
