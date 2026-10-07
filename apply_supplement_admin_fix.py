#!/usr/bin/env python3
"""Admin: neues Produkt im Supplements-Bereich landet jetzt auch bei Supplements (nicht bei Equipment)."""
import sys, os
P='src/AdminPanel.js'
if not os.path.exists(P): sys.exit('FEHLER: Im Ordner fighter-app ausfuehren.')
s=open(P,encoding='utf-8').read()
if 'equipmentTypeFilter]);' in s and 'item_type:equipmentTypeFilter' in s: sys.exit('Schon angewendet. Nichts zu tun.')
def ro(s,old,new,name):
    n=s.count(old)
    if n!=1: sys.exit('FEHLER bei "%s": Anker %d mal (erwartet 1). Nichts geaendert.'%(name,n))
    return s.replace(old,new)
# 1) Formular folgt dem gewaehlten Bereich (Equipment/Supplements)
s=ro(s,"  const [equipmentTypeFilter,setEquipmentTypeFilter]=useState('equipment');\n","""  const [equipmentTypeFilter,setEquipmentTypeFilter]=useState('equipment');
  // Neues Produkt gehoert in den Bereich, in dem man gerade ist
  useEffect(()=>{
    setNewEquip(p=>({...p,item_type:equipmentTypeFilter,category:equipmentTypeFilter==='supplement'?'Supplements':(p.category==='Supplements'?'Boxen':p.category)}));
  },[equipmentTypeFilter]);
""","effect")
# 2) Nach dem Speichern nicht auf 'kein item_type' zuruecksetzen (DB-Standard = equipment)
s=ro(s,"setNewEquip({brand:'',product:'',description:'',category:'Boxen',url:'',image_url:'',discount_code:'',featured:false});",
"setNewEquip({brand:'',product:'',description:'',category:newEquip.item_type==='supplement'?'Supplements':'Boxen',url:'',image_url:'',discount_code:'',featured:false,item_type:newEquip.item_type||equipmentTypeFilter});","reset")
# 3) Push-Text passend
s=ro(s,"body:JSON.stringify({title:'🥊 Neues Equipment!',body:savedBrand+' '+savedProduct+' ist jetzt im Shop verfügbar',data:{type:'equipment'}})",
"body:JSON.stringify({title:savedType==='supplement'?'💊 Neues Supplement!':'🥊 Neues Equipment!',body:savedBrand+' '+savedProduct+' ist jetzt im Shop verfügbar',data:{type:savedType==='supplement'?'supplement':'equipment'}})","push")
s=ro(s,"const savedBrand=newEquip.brand,savedProduct=newEquip.product;","const savedBrand=newEquip.brand,savedProduct=newEquip.product,savedType=newEquip.item_type||equipmentTypeFilter;","saved")
# 4) Beim Speichern item_type sicher mitsenden
s=ro(s,"body:JSON.stringify({...newEquip,sort_order:Date.now()})","body:JSON.stringify({...newEquip,item_type:newEquip.item_type||equipmentTypeFilter,sort_order:Date.now()})","body")
open(P,'w',encoding='utf-8').write(s)
print('OK: Patch angewendet.')
