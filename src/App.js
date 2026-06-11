import React, { useState, useEffect, useRef } from 'react';

const SUPA_URL = 'https://uykdrmymjvqgebsmndme.supabase.co';
const ADMIN_ID = '1a697731-458d-4559-a4cf-a89d3150bfa5';
const SUPA_SERVICE_KEY = process.env.REACT_APP_SUPA_SERVICE_KEY||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY3ODM0MywiZXhwIjoyMDkyMjU0MzQzfQ.o-Q8hM53Kp2O5HKSlsyygjQ8bCAEVOXkaW-TQhVYcT4';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk';

async function authSignUp(email, password) {
  const r = await fetch(SUPA_URL + '/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ email, password, options: { emailRedirectTo: 'https://fighterapp.de' } }),
  });
  return r.json();
}
async function authSignIn(email, password) {
  const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
async function authSignOut(token) {
  await fetch(SUPA_URL + '/auth/v1/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + token },
  });
}
function hdr(token) {
  return { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + (token || SUPA_KEY) };
}
async function dbInsert(table, data, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table, {
    method: 'POST', headers: { ...hdr(token), Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return r.json();
}
async function dbUpdate(table, data, query, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + '?' + query, {
    method: 'PATCH', headers: { ...hdr(token), Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return r.json();
}
async function dbSelect(table, query, token) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + (query ? '?' + query : ''), { headers: hdr(token) });
  return r.json();
}
async function uploadPhoto(file, path, token) {
  const r = await fetch(SUPA_URL + '/storage/v1/object/avatars/' + path, {
    method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token, 'Content-Type': file.type }, body: file,
  });
  if (!r.ok) return null;
  return SUPA_URL + '/storage/v1/object/public/avatars/' + path;
}

const WEIGHT_CLASSES = [
  'Strohgewicht (bis 52 kg)','Leichtfliegengewicht (bis 54 kg)','Fliegengewicht (bis 57 kg)',
  'Bantamgewicht (bis 61 kg)','Federgewicht (bis 66 kg)','Leichtgewicht (bis 70 kg)',
  'Halbweltergewicht (bis 77 kg)','Weltergewicht (bis 83 kg)','Halbmittelgewicht (bis 87 kg)',
  'Mittelgewicht (bis 93 kg)','Halbschwergewicht (bis 100 kg)','Cruisergewicht (bis 90 kg)','Schwergewicht (ueber 100 kg)'
];
const STYLES = ['Boxing','Kickboxing','MMA','Muay Thai','Grappling','BJJ','Wrestling','Kung Fu','Karate','Taekwondo','Judo','Sambo'];
const PRO_FIGHTERS = [];

const FIGHTERS=[];

const CITY_COORDS={
  'Berlin':{lat:52.52,lon:13.405},
  'Hamburg':{lat:53.55,lon:9.993},
  'München':{lat:48.137,lon:11.576},
  'Muenchen':{lat:48.137,lon:11.576},
  'Köln':{lat:50.938,lon:6.96},
  'Koeln':{lat:50.938,lon:6.96},
  'Frankfurt':{lat:50.11,lon:8.682},
  'Stuttgart':{lat:48.775,lon:9.182},
  'Düsseldorf':{lat:51.227,lon:6.773},
  'Duesseldorf':{lat:51.227,lon:6.773},
  'Krefeld':{lat:51.333,lon:6.562},
  'Mönchengladbach':{lat:51.196,lon:6.437},
  'Dortmund':{lat:51.514,lon:7.468},
  'Aachen':{lat:50.776,lon:6.084},
  'Leipzig':{lat:51.34,lon:12.374},
  'Dresden':{lat:51.05,lon:13.738},
  'Hannover':{lat:52.374,lon:9.738},
  'Nürnberg':{lat:49.452,lon:11.077},
  'Bremen':{lat:53.079,lon:8.801},
  'Bochum':{lat:51.481,lon:7.216},
  'Essen':{lat:51.456,lon:7.012},
  'Duisburg':{lat:51.435,lon:6.762},
  'Mannheim':{lat:49.487,lon:8.466},
  'Augsburg':{lat:48.371,lon:10.898},
  'Wiesbaden':{lat:50.082,lon:8.243},
  'Münster':{lat:51.962,lon:7.626},
  'Bonn':{lat:50.735,lon:7.1},
  'Wien':{lat:48.208,lon:16.373},
  'Graz':{lat:47.07,lon:15.44},
  'Salzburg':{lat:47.8,lon:13.045},
  'Zürich':{lat:47.377,lon:8.541},
  'Basel':{lat:47.559,lon:7.588},
  'Bern':{lat:46.948,lon:7.447},
  'Genf':{lat:46.204,lon:6.143},
  'Karlsruhe':{lat:49.006,lon:8.404},
  'Freiburg':{lat:47.997,lon:7.842},
  'Kiel':{lat:54.323,lon:10.133},
  'Rostock':{lat:54.093,lon:12.099},
};
function getDistanceKm(city1,city2){
  const c1=CITY_COORDS[city1];const c2=CITY_COORDS[city2];
  if(!c1||!c2)return 9999;
  const R=6371;
  const dLat=(c2.lat-c1.lat)*Math.PI/180;
  const dLon=(c2.lon-c1.lon)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(c1.lat*Math.PI/180)*Math.cos(c2.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
const CITY_BUNDESLAND={
  'Berlin':'Berlin','Hamburg':'Hamburg','Bremen':'Bremen',
  'München':'Bayern','Muenchen':'Bayern','Augsburg':'Bayern','Nürnberg':'Bayern','Würzburg':'Bayern',
  'Hamburg':'Hamburg',
  'Köln':'Nordrhein-Westfalen','Koeln':'Nordrhein-Westfalen',
  'Düsseldorf':'Nordrhein-Westfalen','Duesseldorf':'Nordrhein-Westfalen',
  'Dortmund':'Nordrhein-Westfalen','Essen':'Nordrhein-Westfalen',
  'Bochum':'Nordrhein-Westfalen','Duisburg':'Nordrhein-Westfalen',
  'Krefeld':'Nordrhein-Westfalen','Aachen':'Nordrhein-Westfalen','Mönchengladbach':'Nordrhein-Westfalen',
  'Münster':'Nordrhein-Westfalen','Bonn':'Nordrhein-Westfalen',
  'Wuppertal':'Nordrhein-Westfalen','Bielefeld':'Nordrhein-Westfalen',
  'Frankfurt':'Hessen','Wiesbaden':'Hessen','Kassel':'Hessen','Darmstadt':'Hessen',
  'Stuttgart':'Baden-Württemberg','Karlsruhe':'Baden-Württemberg','Freiburg':'Baden-Württemberg','Mannheim':'Baden-Württemberg','Heidelberg':'Baden-Württemberg',
  'Hamburg':'Hamburg',
  'Hannover':'Niedersachsen','Braunschweig':'Niedersachsen','Osnabrück':'Niedersachsen',
  'Leipzig':'Sachsen','Dresden':'Sachsen','Chemnitz':'Sachsen',
  'Kiel':'Schleswig-Holstein','Lübeck':'Schleswig-Holstein',
  'Rostock':'Mecklenburg-Vorpommern','Schwerin':'Mecklenburg-Vorpommern',
  'Erfurt':'Thüringen','Jena':'Thüringen',
  'Halle':'Sachsen-Anhalt','Magdeburg':'Sachsen-Anhalt',
  'Potsdam':'Brandenburg','Brandenburg':'Brandenburg',
  'Mainz':'Rheinland-Pfalz','Koblenz':'Rheinland-Pfalz','Trier':'Rheinland-Pfalz',
  'Saarbrücken':'Saarland',
  'Wien':'Wien','Graz':'Steiermark','Linz':'Oberösterreich','Salzburg':'Salzburg','Innsbruck':'Tirol',
  'Zürich':'Zürich','Basel':'Basel','Bern':'Bern','Genf':'Genf','Lausanne':'Waadt',
};
// ── STANDORT FUNKTIONEN ──
async function getLocationByIP(){
  try{
    const r=await fetch('https://ipapi.co/json/');
    const d=await r.json();
    if(d.city&&d.latitude&&d.longitude){
      return{city:d.city,lat:d.latitude,lon:d.longitude,source:'ip'};
    }
  }catch{}
  try{
    const r2=await fetch('https://ip-api.com/json/?fields=city,lat,lon,status');
    const d2=await r2.json();
    if(d2.status==='success'&&d2.city){
      return{city:d2.city,lat:d2.lat,lon:d2.lon,source:'ip'};
    }
  }catch{}
  return null;
}

function getDistanceKmCoords(lat1,lon1,lat2,lon2){
  if(!lat1||!lon1||!lat2||!lon2)return 9999;
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

function getBundesland(city){
  if(!city)return null;
  for(const [k,v] of Object.entries(CITY_BUNDESLAND)){
    if(city.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(city.toLowerCase()))return v;
  }
  return null;
}
const GYMS = {
  'Berlin':[
    {name:'Tiger Gym Berlin',members:142,styles:['Boxing','Muay Thai','MMA'],rating:4.8,address:'Müllerstraße 12, 13353 Berlin-Mitte',street:'Müllerstraße 12',zip:'13353',city:'Berlin',emoji:'🐯',code:'TGB-2847',phone:'+49 30 12345678',hours:'Mo-Fr 07:00-22:00, Sa-So 09:00-18:00',desc:'Eines der ältesten und renommiertesten Kampfsportgyms Berlins. Professionelle Trainer, modernste Ausstattung und eine starke Community. Hier trainieren Anfänger und Profis Seite an Seite.',founded:2003,website:'tigergym-berlin.de'},
    {name:'Berserker Boxing Club',members:89,styles:['Boxing'],rating:4.6,address:'Oranienstraße 44, 10969 Berlin-Kreuzberg',street:'Oranienstraße 44',zip:'10969',city:'Berlin',emoji:'👊',code:'BBC-5391',phone:'+49 30 98765432',hours:'Mo-Fr 08:00-21:00, Sa 10:00-16:00',desc:'Der Berserker Boxing Club steht für traditionelles Boxen auf höchstem Niveau. Kleine Gruppen, persönliche Betreuung und ein unschlagbares Gemeinschaftsgefühl im Herzen Kreuzbergs.',founded:2008,website:'berserker-boxing.de'},
    {name:'Berlin Fight Club',members:210,styles:['MMA','BJJ','Wrestling'],rating:4.9,address:'Warschauer Str. 78, 10243 Berlin-Friedrichshain',street:'Warschauer Str. 78',zip:'10243',city:'Berlin',emoji:'⚔️',code:'BFC-1204',phone:'+49 30 55544433',hours:'Mo-So 06:00-23:00',desc:'Berlins größtes MMA-Gym mit über 200 aktiven Mitgliedern. State-of-the-art Octagon, zwei vollausgestattete Trainingsräume und ein Team aus ehemaligen Profis als Coaches.',founded:2011,website:'berlinfightclub.de'},
  ],
  'Muenchen':[
    {name:'Combat Base Munich',members:175,styles:['MMA','BJJ'],rating:4.7,address:'Leopoldstraße 91, 80802 München-Schwabing',street:'Leopoldstraße 91',zip:'80802',city:'München',emoji:'🦁',code:'CBM-7730',phone:'+49 89 22334455',hours:'Mo-Fr 07:00-22:00, Sa-So 09:00-17:00',desc:'Münchens führendes BJJ- und MMA-Gym. Enge Partnerschaft mit internationalen Spitzenteams und regelmäßige Gastseminare von Weltklasse-Athleten. Mehrfacher Bayerischer Meister.',founded:2009,website:'combatbase-munich.de'},
    {name:'Xtreme Fight Academy',members:130,styles:['MMA','Kickboxing'],rating:4.5,address:'Maximilianstraße 22, 80333 München-Maxvorstadt',street:'Maximilianstraße 22',zip:'80333',city:'München',emoji:'💪',code:'XFA-4462',phone:'+49 89 66778899',hours:'Mo-Fr 09:00-21:00, Sa 10:00-15:00',desc:'Die Xtreme Fight Academy verbindet Kickboxen und MMA auf einem modernen Campus. Intensives Wettkampftraining für Fortgeschrittene, aber auch strukturierte Anfängerkurse.',founded:2014,website:'xtreme-fight-munich.de'},
  ],
  'Hamburg':[
    {name:'Iron Fist HH',members:95,styles:['Muay Thai','Boxing'],rating:4.6,address:'Große Bergstraße 210, 22767 Hamburg-Altona',street:'Große Bergstraße 210',zip:'22767',city:'Hamburg',emoji:'✊',code:'IFH-8819',phone:'+49 40 33221100',hours:'Mo-Fr 08:00-21:30, Sa-So 10:00-16:00',desc:'Iron Fist ist Hamburgs bekanntestes Muay Thai Gym. Mit direkten Verbindungen nach Thailand und regelmäßigen Trainingslagern in Bangkok bieten wir authentisches Thai-Boxing auf höchstem Niveau.',founded:2007,website:'ironfist-hamburg.de'},
    {name:'Nordstern MMA',members:118,styles:['MMA','Grappling'],rating:4.4,address:'Barmbeker Straße 65, 22303 Hamburg-Barmbek',street:'Barmbeker Straße 65',zip:'22303',city:'Hamburg',emoji:'⭐',code:'NMM-3375',phone:'+49 40 99887766',hours:'Mo-Fr 07:30-22:00, Sa 09:00-14:00',desc:'Nordstern MMA ist die Heimat der Hamburger Grappling-Szene. Tägliche Open Mat Sessions, Wettkampfvorbereitung und eine familiäre Atmosphäre machen dieses Gym einzigartig.',founded:2012,website:'nordstern-mma.de'},
  ],
  'Koeln':[
    {name:'Warriors Gym Koeln',members:160,styles:['Kickboxing','Boxing'],rating:4.7,address:'Venloer Straße 419, 50825 Köln-Ehrenfeld',street:'Venloer Straße 419',zip:'50825',city:'Köln',emoji:'⚡',code:'WGK-6641',phone:'+49 221 44556677',hours:'Mo-Fr 07:00-22:00, Sa-So 09:00-17:00',desc:'Das Warriors Gym ist das Epizentrum des Kölner Kampfsports. Über 160 aktive Mitglieder, 15 erfahrene Trainer und eine Erfolgsgeschichte von mehr als 30 Deutschen Meistern.',founded:2005,website:'warriors-gym-koeln.de'},
    {name:'Rhine Valley BJJ',members:70,styles:['BJJ','Grappling'],rating:4.8,address:'Niehler Straße 90, 50733 Köln-Nippes',street:'Niehler Straße 90',zip:'50733',city:'Köln',emoji:'🔵',code:'RVB-9923',phone:'+49 221 11223344',hours:'Mo-Fr 18:00-21:30, Sa 10:00-13:00',desc:'Spezialisiertes BJJ-Gym mit IBJJF-zertifizierten Schwarzgurten. Fokus auf technische Perfektion, Wettkampf-Grappling und Selbstverteidigung. Mehrere Mitglieder in der Deutschen Top 10.',founded:2016,website:'rhinevalley-bjj.de'},
  ],
  'Frankfurt':[
    {name:'Apex Fighting Center',members:200,styles:['MMA','Boxing','Wrestling'],rating:4.9,address:'Darmstädter Landstraße 125, 60598 Frankfurt-Sachsenhausen',street:'Darmstädter Landstraße 125',zip:'60598',city:'Frankfurt',emoji:'🔺',code:'AFC-1188',phone:'+49 69 55443322',hours:'Mo-So 06:30-23:00',desc:'Das Apex Fighting Center ist Frankfurts absolute Nummer 1 im Kampfsport. Auf 1.200 qm bieten wir MMA, Boxing, Wrestling und Konditionstraining — ausgestattet auf internationalem Profiniveau. Heimat mehrerer UFC-Fighter.',founded:2010,website:'apex-frankfurt.de'},
  ],
  'Stuttgart':[
    {name:'Ground Zero Stuttgart',members:88,styles:['BJJ','MMA'],rating:4.5,address:'Hauptstätter Str. 65, 70178 Stuttgart-Mitte',street:'Hauptstätter Str. 65',zip:'70178',city:'Stuttgart',emoji:'💣',code:'GZS-5547',phone:'+49 711 22334455',hours:'Mo-Fr 18:00-22:00, Sa 10:00-14:00',desc:'Ground Zero ist Stuttgarts führendes BJJ und MMA Gym. Gegründet von Ex-Profi Rafael Santos bringt das Team regelmäßig Athleten zu deutschen und europäischen Meisterschaften.',founded:2013,website:'groundzero-stuttgart.de'},
    {name:'Swabia Combat Sports',members:112,styles:['Muay Thai','Kickboxing'],rating:4.3,address:'Cannstatter Str. 88, 70190 Stuttgart-Bad Cannstatt',street:'Cannstatter Str. 88',zip:'70190',city:'Stuttgart',emoji:'🏋️',code:'SCS-2203',phone:'+49 711 66778899',hours:'Mo-Fr 08:00-21:00, Sa 10:00-16:00',desc:'Swabia Combat Sports verbindet schwäbische Disziplin mit asiatischen Kampfkünsten. Eines der wenigen Gyms in der Region mit echtem Muay Thai Camp-Feeling und regelmäßigen Thailand-Trips.',founded:2010,website:'swabia-combat.de'},
  ],
  'Mönchengladbach':[
    {name:'Faustkämpfer Mönchengladbach',members:95,styles:['Boxing','Kickboxing'],rating:4.6,address:'Lüpertzender Str. 30, 41061 Mönchengladbach',street:'Lüpertzender Str. 30',zip:'41061',city:'Mönchengladbach',emoji:'👊',code:'FKM-3317',phone:'+49 2161 112233',hours:'Mo-Fr 17:00-21:00, Sa 10:00-14:00',desc:'Faustkämpfer Mönchengladbach ist das bekannteste Boxgym der Stadt. Traditionelles Boxing mit modernem Training — für Anfänger und erfahrene Kämpfer.',founded:2006,website:'faustkämpfer-mg.de'},
    {name:'NFT Mönchengladbach',members:120,styles:['MMA','BJJ','Grappling'],rating:4.7,address:'Rheydter Str. 55, 41065 Mönchengladbach',street:'Rheydter Str. 55',zip:'41065',city:'Mönchengladbach',emoji:'⚔️',code:'NFT-7761',phone:'+49 2161 445566',hours:'Mo-Fr 17:30-22:00, Sa 10:00-15:00',desc:'NFT Mönchengladbach — Kampfsport auf höchstem Niveau. Spezialisiert auf MMA, BJJ und Grappling mit erfahrenen Trainern und starker Wettkampftruppe.',founded:2014,website:'nft-mg.de'},
  ],
  'Duesseldorf':[
    {name:'UFD Düsseldorf',members:165,styles:['MMA','Boxing','Kickboxing'],rating:4.7,address:'Fichtenstraße 12, 40233 Düsseldorf',street:'Fichtenstraße 12',zip:'40233',city:'Düsseldorf',emoji:'🔥',code:'UFD-7714',phone:'+49 211 33445566',hours:'Mo-Fr 07:00-22:00, Sa-So 09:00-17:00',desc:'UFD Düsseldorf ist eines der bekanntesten Kampfsportgyms der Rheinmetropole. Mit einem starken Fokus auf MMA, Boxing und Kickboxing bietet UFD Trainingseinheiten für alle Levels — vom Anfänger bis zum Profi.',founded:2008,website:'ufd-duesseldorf.de'},
  ],
  'Krefeld':[
    {name:'NFT Gymnasium Krefeld',members:130,styles:['MMA','Grappling','BJJ'],rating:4.6,address:'Uerdinger Str. 55, 47799 Krefeld',street:'Uerdinger Str. 55',zip:'47799',city:'Krefeld',emoji:'⚔️',code:'NFT-8830',phone:'+49 2151 44556677',hours:'Mo-Fr 17:00-22:00, Sa 10:00-15:00',desc:'Das NFT Gymnasium Krefeld ist die erste Adresse für Kampfsport am Niederrhein. Spezialisiert auf MMA, Grappling und BJJ bringt das NFT regelmäßig Athleten zu regionalen und nationalen Meisterschaften.',founded:2011,website:'nft-krefeld.de'},
  ],
  'Wien':[
    {name:'Vienna Fight Club',members:190,styles:['MMA','Boxing','BJJ'],rating:4.8,address:'Mariahilfer Str. 88, 1070 Wien',street:'Mariahilfer Str. 88',zip:'1070',city:'Wien',emoji:'🦅',code:'VFC-3311',phone:'+43 1 5234567',hours:'Mo-Fr 08:00-22:00, Sa-So 10:00-18:00',desc:'Österreichs führendes MMA-Gym in der Hauptstadt. State-of-the-art Ausstattung auf 800qm, internationale Toptrainer und eine wachsende Community von über 190 Mitgliedern.',founded:2012,website:'vienna-fightclub.at'},
    {name:'Kick & Box Austria',members:145,styles:['Kickboxing','Muay Thai'],rating:4.6,address:'Ottakringer Str. 120, 1160 Wien',street:'Ottakringer Str. 120',zip:'1160',city:'Wien',emoji:'',code:'KBA-7792',phone:'+43 1 4567890',hours:'Mo-Fr 09:00-21:00, Sa 10:00-15:00',desc:'Das älteste Kickboxing-Gym Wiens mit Tradition seit 1998. Heimat zahlreicher österreichischer Meister und internationaler Nachwuchstalente.',founded:1998,website:'kickbox-austria.at'},
  ],
  'Graz':[
    {name:'Steiermark Combat Center',members:110,styles:['MMA','Grappling','Wrestling'],rating:4.5,address:'Annenstraße 45, 8020 Graz',street:'Annenstraße 45',zip:'8020',city:'Graz',emoji:'🐆',code:'SCC-4481',phone:'+43 316 789012',hours:'Mo-Fr 17:00-22:00, Sa 10:00-14:00',desc:'Das Steiermark Combat Center ist die Kampfsport-Heimat der steirischen Metropole. Regionale Meister in MMA, Grappling und Wrestling trainieren hier täglich.',founded:2015,website:'scc-graz.at'},
  ],
  'Zürich':[
    {name:'Swiss Fighting Academy',members:220,styles:['MMA','Boxing','BJJ','Muay Thai'],rating:4.9,address:'Langstrasse 180, 8004 Zürich',street:'Langstrasse 180',zip:'8004',city:'Zürich',emoji:'🇨🇭',code:'SFA-6621',phone:'+41 44 2345678',hours:'Mo-Fr 07:00-22:00, Sa-So 09:00-17:00',desc:'Die Swiss Fighting Academy ist die erste Adresse für Kampfsport in der Schweiz. Auf 1.000qm bieten wir alle Disziplinen an — von Anfänger bis Profi, mit direkten Verbindungen zur UFC Europe.',founded:2009,website:'swiss-fighting.ch'},
    {name:'Zürich Boxing Club',members:95,styles:['Boxing'],rating:4.7,address:'Hardstrasse 219, 8005 Zürich',street:'Hardstrasse 219',zip:'8005',city:'Zürich',emoji:'👊',code:'ZBC-1155',phone:'+41 44 3456789',hours:'Mo-Fr 18:00-22:00, Sa 10:00-13:00',desc:'Traditionelles Boxing-Gym mit 30-jähriger Geschichte. Mehrere Schweizer Meister wurden hier geformt.',founded:1994,website:'zurich-boxing.ch'},
  ],
  'Basel':[
    {name:'Basel Martial Arts Center',members:160,styles:['MMA','Kickboxing','BJJ'],rating:4.6,address:'Gundeldingerstraße 210, 4053 Basel',street:'Gundeldingerstraße 210',zip:'4053',city:'Basel',emoji:'🔴',code:'BMC-9934',phone:'+41 61 4567890',hours:'Mo-Fr 17:00-21:30, Sa 10:00-14:00',desc:'Das BMAC verbindet schweizerische Präzision mit internationaler Kampfsport-Kultur. Dreisprachiges Gym (DE/FR/EN) an der Grenze zu Deutschland und Frankreich.',founded:2014,website:'basel-martialarts.ch'},
  ],
  'Leipzig':[
    {name:'East Side Fight Club',members:135,styles:['MMA','Boxing','Kickboxing'],rating:4.6,address:'Karl-Liebknecht-Str. 93, 04107 Leipzig',street:'Karl-Liebknecht-Str. 93',zip:'04107',city:'Leipzig',emoji:'⭐',code:'ESF-2244',phone:'+49 341 2345678',hours:'Mo-Fr 08:00-22:00, Sa 10:00-17:00',desc:'Der East Side Fight Club ist Sachsens bekanntestes Kampfsport-Gym. Mehrfacher sächsischer Meister in MMA und Boxing.',founded:2007,website:'eastside-fightclub.de'},
  ],
  'Dresden':[
    {name:'Elbe Warriors Gym',members:100,styles:['MMA','Grappling','BJJ'],rating:4.5,address:'Königsbrücker Str. 68, 01099 Dresden',street:'Königsbrücker Str. 68',zip:'01099',city:'Dresden',emoji:'🏰',code:'EWG-5567',phone:'+49 351 3456789',hours:'Mo-Fr 17:00-22:00, Sa 10:00-15:00',desc:'Die Elbe Warriors stehen für technisch hochwertiges MMA-Training in der Barockstadt. Enge Gemeinschaft mit starkem Fokus auf Grappling und Submission Wrestling.',founded:2013,website:'elbe-warriors.de'},
  ],
};
const TRAINERS = [
  { id: 1, name: "Freddie Roach", country: "USA", style: "Boxing", pupils: "Manny Pacquiao, Miguel Cotto", gym: "Wild Card Boxing Club", titles: 28, rating: 9.8, exp: 35, emoji: "🥊", accent: "#d4a017", bio: "Einer der erfolgreichsten Boxing-Trainer aller Zeiten mit 28 Weltmeistern gecoacht." },
  { id: 2, name: "Firas Zahabi", country: "Kanada", style: "MMA", pupils: "Georges St-Pierre, Rory MacDonald", gym: "Tristar Gym Montreal", titles: 12, rating: 9.7, exp: 22, emoji: "🎯", accent: "#2980b9", bio: "Revolutionierte das MMA-Training mit wissenschaftlichem Ansatz und Phasenwellen-Methode." },
  { id: 3, name: "Rafael Cordeiro", country: "Brasilien", style: "Muay Thai / MMA", pupils: "Anderson Silva, Fabricio Werdum", gym: "Kings MMA", titles: 15, rating: 9.6, exp: 28, emoji: "🔥", accent: "#27ae60", bio: "Weltklasse-Trainer mit ueber 30 Weltmeistern in Muay Thai und MMA." },
  { id: 4, name: "John Kavanagh", country: "Irland", style: "MMA / BJJ", pupils: "Conor McGregor, Gunnar Nelson", gym: "SBG Ireland", titles: 10, rating: 9.5, exp: 20, emoji: "☘️", accent: "#c0392b", bio: "Brachte McGregor zur Weltelite. Gilt als innovativster Trainer Europas." },
  { id: 5, name: "Trevor Wittman", country: "USA", style: "MMA / Striking", pupils: "Justin Gaethje, Nate Diaz", gym: "ONX Sports", titles: 8, rating: 9.4, exp: 18, emoji: "⚡", accent: "#8e44ad", bio: "Bekannt fuer explosive Striking-Entwicklung und mentale Kampfvorbereitung." },
  { id: 6, name: "Eugene Bareman", country: "Neuseeland", style: "MMA / Kickboxing", pupils: "Israel Adesanya, Alex Volkanovski", gym: "City Kickboxing Auckland", titles: 14, rating: 9.4, exp: 16, emoji: "🥋", accent: "#e67e22", bio: "Formte zwei gleichzeitige UFC-Champions und gilt als bester Striking-Coach der Welt." },
  { id: 7, name: "Javier Mendez", country: "USA", style: "MMA", pupils: "Islam Makhachev, Khabib Nurmagomedov", gym: "AKA San Jose", titles: 18, rating: 9.3, exp: 25, emoji: "🦅", accent: "#2980b9", bio: "Trainer hinter dem Dagestan-Dominanz-System. Formte Khabib und Islam zu Weltchampions." },
  { id: 8, name: "Mark Henry", country: "USA", style: "MMA / Striking", pupils: "Max Holloway, Edson Barboza", gym: "Jackson-Wink MMA", titles: 9, rating: 9.2, exp: 20, emoji: "🦁", accent: "#c0392b", bio: "Revolutionaerer Striking-Coach, bekannt fuer kreative Kampfplaene und technische Prazision." },
  { id: 9, name: "Edmond Tarverdyan", country: "USA", style: "Boxing / MMA", pupils: "Ronda Rousey, Gasan Umalatov", gym: "Glendale Fighting Club", titles: 6, rating: 9.0, exp: 15, emoji: "👊", accent: "#d4a017", bio: "Spezialist fuer Striking-Entwicklung von Ringsport-Athleten aller Stilrichtungen." },
  { id: 10, name: "Greg Jackson", country: "USA", style: "MMA", pupils: "Jon Jones, Carlos Condit", gym: "Jackson-Wink MMA", titles: 20, rating: 9.3, exp: 30, emoji: "🧠", accent: "#16a085", bio: "MMA-Strategie-Genie. Sein Gym produzierte mehr UFC-Champions als jedes andere Team." },
];
const SPORTS = {
  'Basketball':{color:'#e67e22',emoji:'🏀',games:[{id:1,title:'Pickup Basketball',location:'Tempelhof Courts, Berlin',time:'Sa 15:00',cur:4,max:10,level:'Mittel',host:'Kevin S.'},{id:2,title:'3on3 Tournament',location:'Beach Courts Muenchen',time:'So 12:00',cur:8,max:12,level:'Anfaenger',host:'Lena M.'}]},
  'Tennis':{color:'#27ae60',emoji:'🎾',games:[{id:1,title:'Casual Doubles',location:'TC Rot-Weiss Berlin',time:'So 10:00',cur:2,max:4,level:'Mittel',host:'Anna K.'},{id:2,title:'Singles Sparring',location:'Stadtpark HH',time:'Sa 14:00',cur:1,max:2,level:'Fortgeschritten',host:'Felix R.'}]},
  'Fussball':{color:'#2980b9',emoji:'⚽',games:[{id:1,title:'5vs5 Hallenfussball',location:'Soccerhalle Berlin',time:'Do 20:00',cur:7,max:10,level:'Mittel',host:'Mehmet A.'},{id:2,title:'Sonntagskick',location:'Stadtpark Koeln',time:'So 11:00',cur:12,max:22,level:'Alle',host:'Thomas B.'}]},
  'Kampfsport':{color:'#c0392b',emoji:'🥋',games:[{id:1,title:'Open Mat BJJ',location:'Tiger Gym Berlin',time:'So 11:00',cur:8,max:20,level:'Alle',host:'Kai M.'},{id:2,title:'Boxing Sparring',location:'Berserker BC',time:'Do 19:00',cur:3,max:10,level:'Mittel',host:'Felix W.'}]},
};

const SW=60, RED='#c0392b', LIGHT_RED='#e74c3c';
const css=`
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f5f5f7;font-family:'DM Sans',sans-serif}
.rj{font-family:'Rajdhani',sans-serif!important;font-weight:700}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fadeUp{animation:fadeUp 0.4s ease both}
.spin{animation:spin 0.8s linear infinite}
input,select,textarea{outline:none;font-family:'DM Sans',sans-serif}
input::placeholder,textarea::placeholder{color:#aaa}
body.dark{background:#0d0d0d!important;color:#fff}
body.dark .dm-bg{background:#0d0d0d!important}
body.dark .dm-card{background:#1a1a1a!important;border-color:#2a2a2a!important}
body.dark .dm-text{color:#fff!important}
body.dark .dm-sub{color:#aaa!important}
body.dark input,body.dark select,body.dark textarea{background:#111!important;color:#fff!important;border-color:#333!important}
body.dark input::placeholder{color:#555!important}
::-webkit-scrollbar{display:none}
textarea{resize:none}
`;


function GymDetailScreen({gym,gymKey,gymRatings,gymLogos,isAdmin,session,onGymUpdate,rateGym,onClose,darkMode}){
  if(!gym)return(<div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:250,display:'flex',alignItems:'center',justifyContent:'center'}}><button onClick={onClose} style={{padding:'12px 24px',background:'#c0392b',color:'#fff',border:'none',borderRadius:10,fontSize:16,cursor:'pointer'}}>{t.back}</button></div>);
  // Normalize gym data to avoid crashes with DB gyms missing fields
  gym={styles:[],members:0,rating:0,founded:'',street:'',zip:'',phone:'',website:'',hours:'',desc:'',code:'',...gym,styles:gym.styles&&gym.styles.length>0?gym.styles:[gym.style||'Kampfsport'],desc:gym.desc||gym.description||''};
  const isDark=darkMode===true;
  const bg=isDark?'#0d0d0d':'#f5f5f7';
  const card=isDark?'#1a1a1a':'#fff';
  const text=isDark?'#fff':'#1a1a1a';
  const sub=isDark?'#aaa':'#666';
  const border=isDark?'#2a2a2a':'#eee';
  const [editMode,setEditMode]=useState(false);
  const [editName,setEditName]=useState(gym.name||'');
  const [editCity,setEditCity]=useState(gym.city||'');
  const [editAddress,setEditAddress]=useState(gym.address||'');
  const [editStyle,setEditStyle]=useState(gym.style||'');
  const [editDesc,setEditDesc]=useState(gym.desc||gym.description||'');
  const [editPhone,setEditPhone]=useState(gym.phone||'');
  const [editHours,setEditHours]=useState(gym.hours||'');
  const [saving,setSaving]=useState(false);
  const SUPA_URL='https://uykdrmymjvqgebsmndme.supabase.co';
  const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk';
  const r=gymRatings[gymKey];
  const userRating=r?.userRating||0;
  const avgRating=r&&r.count>0?(r.total/r.count):gym.rating;
  const ratingCount=r?.count||0;
  const styleColors={'Boxing':'#c0392b','Muay Thai':'#d35400','MMA':'#2980b9','BJJ':'#8e44ad','Kickboxing':'#e67e22','Wrestling':'#27ae60','Grappling':'#16a085'};
  return(
    <div style={{position:'fixed',inset:0,background:bg,zIndex:250,overflowY:'auto',display:'flex',flexDirection:'column'}}>
      {/* HEADER */}
      <div style={{background:`linear-gradient(135deg,#1a1a1a,#2d2d2d)`,padding:'0 0 20px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',padding:'14px 16px 0',gap:10}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,padding:'6px 12px',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
          <div style={{flex:1}}/>
          {isAdmin&&<button onClick={()=>setEditMode(e=>!e)} style={{background:editMode?'#27ae60':'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:8,padding:'6px 12px',fontFamily:'Rajdhani,sans-serif',letterSpacing:1}}>{editMode?'✓ MODUS':'✏️ BEARBEITEN'}</button>}
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:8,padding:'4px 10px'}}>
            <div style={{color:'#d4a017',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:16}}>★</span>
              <span style={{fontSize:16}}>{avgRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:'16px 20px 0',textAlign:'center'}}>
          <div style={{width:72,height:72,borderRadius:14,background:'rgba(255,255,255,0.15)',border:'2px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8,overflow:'hidden'}}>
            {(gymLogos&&gymLogos[gym.code]?.logo_url)||gym.logo_url
              ?<img src={(gymLogos&&gymLogos[gym.code]?.logo_url)||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>
              :<div style={{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,textAlign:'center',lineHeight:1.3}}>{(gym.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
          </div>
          {editMode?(
            <div style={{width:'100%',padding:'12px 16px 0',display:'flex',flexDirection:'column',gap:8}}>
              {[['Name',editName,setEditName],['Stadt',editCity,setEditCity],['Adresse',editAddress,setEditAddress],['Stil',editStyle,setEditStyle],['Telefon',editPhone,setEditPhone],['Öffnungszeiten',editHours,setEditHours]].map(([lbl,val,set])=>(
                <div key={lbl} style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:10,width:70,flexShrink:0}}>{lbl}</div>
                  <input value={val} onChange={e=>set(e.target.value)} style={{flex:1,padding:'6px 8px',borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:12,outline:'none'}}/>
                </div>
              ))}
              <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={3} placeholder='Beschreibung' style={{padding:'6px 8px',borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:12,outline:'none',resize:'none',marginTop:4}}/>
              {/* Logo Upload */}
              <label style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,border:'2px dashed rgba(255,255,255,0.3)',cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:12}}>
                📷 Logo hochladen
                <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                  const file=e.target.files?.[0];if(!file||!session)return;
                  try{
                    const reader=new FileReader();
                    reader.onload=async ev=>{
                      const resp=await fetch('https://uykdrmymjvqgebsmndme.supabase.co/storage/v1/object/avatars/gyms/'+gym.code+'_'+Date.now()+'.png',{method:'POST',headers:{'Content-Type':file.type,Authorization:'Bearer '+session.token},body:file}).catch(()=>null);
                      // Use uploadPhoto via Supabase storage
                      const formData=new FormData();formData.append('file',file);
                      const path='gyms/'+gym.code+'_logo.png';
                      const up=await fetch(SUPA_URL+'/storage/v1/object/avatars/'+path,{method:'POST',headers:{Authorization:'Bearer '+session.token,'x-upsert':'true'},body:file});
                      if(up.ok){
                        const url=SUPA_URL+'/storage/v1/object/public/avatars/'+path;
                        await fetch(SUPA_URL+'/rest/v1/gym_logos?gym_code=eq.'+gym.code,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                        await fetch(SUPA_URL+'/rest/v1/gym_logos',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({gym_code:gym.code,logo_url:url,verified:true})});
                        if(onGymUpdate)await onGymUpdate();
                        alert('✅ Logo gespeichert!');
                      }
                    };reader.readAsDataURL(file);
                  }catch(err){alert('Fehler: '+err.message);}
                }}/>
              </label>
              <button disabled={saving} onClick={async()=>{
                if(!gym.id)return;
                setSaving(true);
                try{
                  await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name:editName,city:editCity,address:editAddress,style:editStyle,phone:editPhone,hours:editHours,description:editDesc})});
                  if(onGymUpdate)await onGymUpdate();
                  setEditMode(false);
                  alert('✅ Gespeichert!');
                }catch(e){alert('Fehler: '+e.message);}
                setSaving(false);
              }} style={{padding:'10px',borderRadius:10,background:saving?'#888':'#27ae60',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>
                {saving?'SPEICHERT...':'✓ ÄNDERUNGEN SPEICHERN'}
              </button>
            </div>
          ):(<>
          <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,color:'#fff',letterSpacing:1,lineHeight:1.2}}>{editName||gym.name}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:6}}>📍 {editCity||gym.city} · gegründet {gym.founded||''}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginTop:10}}>
            {(gym.styles||[gym.style||'Kampfsport']).filter(Boolean).map(s=>(
              <div key={s} style={{padding:'4px 10px',borderRadius:20,background:(styleColors[s]||'#555')+'33',border:'1px solid '+(styleColors[s]||'#555')+'66',color:styleColors[s]||'#fff',fontSize:11,fontWeight:700}}>{s}</div>
            ))}
          </div>
          </>)}
        </div>
      </div>

      <div style={{padding:'14px 16px 40px',maxWidth:480,margin:'0 auto',width:'100%'}}>

        {/* BEWERTUNG */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border,marginBottom:12,textAlign:'center'}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:10}}>BEWERTE DIESES GYM</div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:8}}>
            {[1,2,3,4,5].map(star=>(
              <button key={star} onClick={()=>rateGym(gymKey,star)}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:36,
                  color:star<=userRating?'#d4a017':'#ddd',
                  transition:'transform 0.15s',padding:'0 2px'}}
                onMouseEnter={e=>e.target.style.transform='scale(1.2)'}
                onMouseLeave={e=>e.target.style.transform='scale(1)'}>
                {star<=userRating?'★':'☆'}
              </button>
            ))}
          </div>
          <div style={{color:sub,fontSize:11}}>
            {userRating>0?`Deine Bewertung: ${userRating} Stern${userRating>1?'e':''} · `:'Noch nicht bewertet · '}
            {ratingCount>0?`${ratingCount} Bewertung${ratingCount>1?'en':''} · Ø ${avgRating.toFixed(1)}`:'Sei der Erste!'}
          </div>
        </div>

        {/* ÜBER DAS GYM */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border,marginBottom:12}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:10}}>ÜBER DAS GYM</div>
          <div style={{color:sub,fontSize:13,lineHeight:1.7}}>{gym.desc||gym.description||''}</div>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <div style={{background:card,borderRadius:12,padding:'12px',border:'1px solid '+border,textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:4}}>👥</div>
            <div style={{fontFamily:'Rajdhani,sans-serif',color:'#2980b9',fontSize:24}}>{gym.members}</div>
            <div style={{color:sub,fontSize:10,letterSpacing:1}}>MITGLIEDER</div>
          </div>
          <div style={{background:card,borderRadius:12,padding:'12px',border:'1px solid '+border,textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:4}}>🏆</div>
            <div style={{fontFamily:'Rajdhani,sans-serif',color:'#d4a017',fontSize:24}}>{gym.founded}</div>
            <div style={{color:sub,fontSize:10,letterSpacing:1}}>GEGRÜNDET</div>
          </div>
        </div>

        {/* KONTAKT & ADRESSE */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border,marginBottom:12}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:12}}>KONTAKT & ADRESSE</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:'#c0392b18',border:'1px solid #c0392b33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📍</div>
              <div>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>ADRESSE</div>
                <div style={{color:text,fontSize:13,fontWeight:600}}>{gym.street}</div>
                <div style={{color:sub,fontSize:12}}>{gym.zip} {gym.city}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:'#27ae6018',border:'1px solid #27ae6033',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📞</div>
              <div>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>TELEFON</div>
                <div style={{color:text,fontSize:13,fontWeight:600}}>{gym.phone||''}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🌐</div>
              <div>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>WEBSITE</div>
                <div style={{color:'#2980b9',fontSize:13,fontWeight:600}}>{gym.website}</div>
              </div>
            </div>
            {gym.code&&(
              <div style={{display:'flex',alignItems:'center',gap:12,background:isDark?'#1f1f10':'#fffbf0',borderRadius:10,padding:'10px 12px',border:'1px solid #d4a01733'}}>
                <div style={{width:34,height:34,borderRadius:8,background:'#d4a01718',border:'1px solid #d4a01733',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔑</div>
                <div style={{flex:1}}>
                  <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:2}}>FIGHTER-APP CODE</div>
                  <div style={{color:'#d4a017',fontSize:18,fontWeight:700,fontFamily:'Rajdhani,sans-serif',letterSpacing:3}}>{gym.code}</div>
                  <div style={{color:'#bbb',fontSize:10,marginTop:1}}>Diesen Code beim Gym erfragen → Profil verifizieren</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ÖFFNUNGSZEITEN */}
        <div style={{background:card,borderRadius:14,padding:'16px',border:'1px solid '+border}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:text,fontSize:13,letterSpacing:2,marginBottom:12}}>ÖFFNUNGSZEITEN</div>
          {(gym.hours||'').split(', ').filter(Boolean).map((h,i)=>{
            const [days,time]=h.split(' ').reduce((acc,w,idx)=>{
              if(idx===0||w.includes('-')&&!w.includes(':'))acc[0]+=(acc[0]?' ':'')+w;
              else acc[1]+=(acc[1]?' ':'')+w;
              return acc;
            },['','']);
            return(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<(gym.hours||'').split(', ').length-1?'1px solid '+border:'none'}}>
                <div style={{color:sub,fontSize:12}}>{h.split(' ')[0]}</div>
                <div style={{color:text,fontSize:12,fontWeight:600}}>{h.split(' ').slice(1).join(' ')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function GymVerifyModal({onClose,gymCodeInput,setGymCodeInput,gymVerifyError,setGymVerifyError,gymVerified,setGymVerified,gymCodes,darkMode,showMsg}){
  const bg=darkMode?'rgba(0,0,0,0.85)':'rgba(0,0,0,0.6)';
  const card='#fff';
  const text='#1a1a1a';
  const sub=darkMode?'#aaa':'#666';

  function verify(){
    const code=gymCodeInput.trim().toUpperCase();
    const found=gymCodes.find(g=>g.code===code);
    if(found){
      const verified={gymName:found.name,gymCity:found.ct,gymEmoji:found.emoji,code,verifiedAt:new Date().toISOString()};
      setGymVerified(verified);
      localStorage.setItem('fighter_gym_verified',JSON.stringify(verified));
      showMsg('✅ Gym verifiziert! Du bist jetzt '+found.emoji+' '+found.name+' Mitglied');
      onClose();
    }else{
      setGymVerifyError('Ungültiger Code. Bitte frage dein Gym nach dem Fighter-Code.');
    }
  }

  function removeVerification(){
    setGymVerified(null);
    localStorage.removeItem('fighter_gym_verified');
    showMsg('Gym-Verifizierung entfernt');
    onClose();
  }

  return(
    <div style={{position:'fixed',inset:0,background:bg,zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:card,borderRadius:20,width:'100%',maxWidth:360,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'20px 20px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2}}>GYM VERIFIZIEREN</div>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:11,marginTop:2}}>Bestätige deine Gym-Mitgliedschaft</div>
            </div>
            <div style={{fontSize:32}}>🏅</div>
          </div>
        </div>

        <div style={{padding:'20px'}}>
          {gymVerified?(
            /* Bereits verifiziert */
            <div>
              <div style={{background:darkMode?'#0a1f0a':'#f0faf0',borderRadius:12,padding:'16px',border:'1px solid #27ae6044',textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:40,marginBottom:8}}>{gymVerified.gymEmoji}</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:1}}>✅ VERIFIZIERTES MITGLIED</div>
                <div style={{color:text,fontWeight:700,fontSize:14,marginTop:4}}>{gymVerified.gymName}</div>
                <div style={{color:sub,fontSize:12,marginTop:2}}>📍 {gymVerified.gymCity}</div>
                <div style={{color:'#bbb',fontSize:10,marginTop:6}}>Seit: {new Date(gymVerified.verifiedAt).toLocaleDateString('de')}</div>
              </div>
              <div style={{color:sub,fontSize:12,textAlign:'center',marginBottom:14}}>Dein Profil zeigt jetzt das ✅ Verifiziert-Badge</div>
              <button onClick={removeVerification} style={{width:'100%',padding:'11px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c',color:'#e74c3c',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:8}}>
                Verifizierung entfernen
              </button>
              <button onClick={onClose} style={{width:'100%',padding:'11px',borderRadius:10,background:`linear-gradient(135deg,#c0392b,#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                SCHLIESSEN
              </button>
            </div>
          ):(
            /* Code eingeben */
            <div>
              <div style={{background:darkMode?'#1f1f1f':'#f8f8f8',borderRadius:10,padding:'12px',marginBottom:16,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                <div style={{color:'#d4a017',fontSize:12,fontWeight:700,marginBottom:6}}>💡 WIE BEKOMME ICH DEN CODE?</div>
                <div style={{color:sub,fontSize:12,lineHeight:1.6}}>
                  Frage an der Rezeption deines Gyms nach dem <strong>Fighter-App Code</strong>. Der 8-stellige Code (z.B. TGB-2847) wird dir direkt mitgeteilt.
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{color:sub,fontSize:10,letterSpacing:1,marginBottom:6}}>GYM-CODE EINGEBEN</div>
                <input
                  value={gymCodeInput}
                  onChange={e=>{setGymCodeInput(e.target.value.toUpperCase());setGymVerifyError('');}}
                  onKeyDown={e=>e.key==='Enter'&&verify()}
                  placeholder='z.B. TGB-2847'
                  maxLength={8}
                  style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'2px solid '+(gymVerifyError?'#e74c3c':darkMode?'#333':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:text,fontSize:18,fontFamily:'Rajdhani,sans-serif',fontWeight:700,letterSpacing:3,textAlign:'center',boxSizing:'border-box'}}
                />
                {gymVerifyError&&<div style={{color:'#e74c3c',fontSize:11,marginTop:6,textAlign:'center'}}>{gymVerifyError}</div>}
              </div>

              <button onClick={verify} disabled={gymCodeInput.length<6}
                style={{width:'100%',padding:'13px',borderRadius:10,background:gymCodeInput.length>=6?'linear-gradient(135deg,#27ae60,#2ecc71)':'#eee',border:'none',color:gymCodeInput.length>=6?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:gymCodeInput.length>=6?'pointer':'not-allowed',marginBottom:8}}>
                ✅ VERIFIZIEREN
              </button>
              <button onClick={onClose} style={{width:'100%',padding:'10px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#eee'),color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state={hasError:false,error:null};
  }
  static getDerivedStateFromError(error){
    return {hasError:true,error};
  }
  componentDidCatch(error,info){
    console.error('FighterApp Error:',error,info);
  }
  render(){
    if(this.state.hasError){
      return(
        <div style={{minHeight:'100vh',background:'#0d0d0d',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:'DM Sans,sans-serif'}}>
          <div style={{fontSize:48,marginBottom:16}}>🥊</div>
          <div style={{fontFamily:'Rajdhani,sans-serif',color:'#fff',fontSize:24,letterSpacing:3,marginBottom:8}}>KURZE PAUSE</div>
          <div style={{color:'#aaa',fontSize:13,textAlign:'center',marginBottom:24,lineHeight:1.6}}>{appLang==='FR'?'Quelque chose a mal tourné. Rechargez l\'application.':appLang==='EN'?'Something went wrong. Please reload the app.':'Etwas ist schiefgelaufen. Bitte lade die App neu.'}</div>
          <button onClick={()=>{this.setState({hasError:false,error:null});window.location.reload();}}
            style={{background:'#c0392b',border:'none',borderRadius:10,padding:'14px 32px',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
            APP NEU LADEN 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


function EquipmentScreen({darkMode,appLang,SUPA_URL,SUPA_KEY,onSuggest}){
  const [items,setItems]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [activeCategory,setActiveCategory]=React.useState('Alle');
  const RED='#c0392b';

  React.useEffect(()=>{
    fetch(SUPA_URL+'/rest/v1/equipment?order=featured.desc,sort_order.asc',{
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
    }).then(r=>r.json()).then(data=>{
      setItems(Array.isArray(data)?data:[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const categories=['Alle',...new Set(items.map(i=>i.category).filter(Boolean))];
  const filtered=activeCategory==='Alle'?items:items.filter(i=>i.category===activeCategory);
  const featured=filtered.filter(i=>i.featured);
  const rest=filtered.filter(i=>!i.featured);

  if(loading)return(
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:32,marginBottom:8}}>⏳</div>
      <div style={{color:'#aaa',fontSize:13}}>Laden...</div>
    </div>
  );

  if(items.length===0)return(
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:64,marginBottom:16}}>🥊</div>
      <div style={{fontFamily:'Rajdhani,sans-serif',color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:3,marginBottom:8}}>COMING SOON</div>
      <div style={{color:'#aaa',fontSize:13,lineHeight:1.7,maxWidth:280,margin:'0 auto'}}>
        {appLang==='FR'?'Bientôt disponible — la meilleure équipement de sport de combat.':appLang==='EN'?'Coming soon — the best combat sports equipment, curated by real athletes.':'Bald findest du hier die beste Kampfsport-Ausrüstung — kuratiert von echten Athleten.'}
      </div>
      <button onClick={onSuggest} style={{marginTop:20,padding:'12px 24px',borderRadius:10,background:'linear-gradient(135deg,#c0392b,#e74c3c)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer'}}>
        ⭐ {appLang==='FR'?'SUGGÉRER':appLang==='EN'?'SUGGEST':'VORSCHLAGEN'}
      </button>
    </div>
  );

  return(
    <div>
      {/* Category Filter */}
      {categories.length>1&&(
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:16}}>
          {categories.map(cat=>(
            <button key={cat} onClick={()=>setActiveCategory(cat)}
              style={{flexShrink:0,padding:'5px 12px',borderRadius:16,background:activeCategory===cat?RED:'transparent',border:'1px solid '+(activeCategory===cat?RED:(darkMode?'#333':'#ddd')),color:activeCategory===cat?'#fff':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Featured */}
      {featured.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{color:'#d4a017',fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:10}}>⭐ EMPFOHLEN</div>
          {featured.map(eq=><EquipCard key={eq.id} eq={eq} darkMode={darkMode} RED={RED}/>)}
        </div>
      )}

      {/* Rest */}
      {rest.length>0&&(
        <div>
          {featured.length>0&&<div style={{color:'#aaa',fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:10}}>WEITERE PRODUKTE</div>}
          {rest.map(eq=><EquipCard key={eq.id} eq={eq} darkMode={darkMode} RED={RED}/>)}
        </div>
      )}

      {/* Suggest button */}
      <button onClick={onSuggest} style={{width:'100%',marginTop:20,padding:'12px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#ddd'),color:darkMode?'#aaa':'#888',fontSize:13,cursor:'pointer'}}>
        ⭐ {appLang==='FR'?'Suggérer un produit':appLang==='EN'?'Suggest a product':'Produkt vorschlagen'}
      </button>
    </div>
  );
}

function EquipCard({eq,darkMode,RED}){
  const [pressed,setPressed]=React.useState(false);
  return(
    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',marginBottom:10,border:'1px solid '+(eq.featured?'#d4a01733':(darkMode?'#2a2a2a':'#eee')),boxShadow:eq.featured?'0 2px 12px rgba(212,160,23,0.08)':'none'}}>
      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
        {eq.image_url&&<img src={eq.image_url} style={{width:64,height:64,borderRadius:10,objectFit:'cover',flexShrink:0}} alt={eq.product} onError={e=>e.target.style.display='none'}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4}}>
            <span style={{background:RED+'18',borderRadius:20,padding:'1px 8px',color:RED,fontSize:10,fontWeight:700}}>{eq.category}</span>
            {eq.featured&&<span style={{background:'#d4a01718',borderRadius:20,padding:'1px 8px',color:'#d4a017',fontSize:10,fontWeight:700}}>⭐</span>}
          </div>
          <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{eq.brand}</div>
          <div style={{color:darkMode?'#ddd':'#444',fontSize:13,marginTop:1}}>{eq.product}</div>
          {eq.description&&<div style={{color:'#aaa',fontSize:11,marginTop:4,lineHeight:1.5}}>{eq.description}</div>}
          {eq.discount_code&&(
            <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#27ae6018',border:'1px solid #27ae6033',borderRadius:8,padding:'3px 8px',marginTop:6}}>
              <span style={{color:'#27ae60',fontSize:11,fontWeight:700}}>🏷️ Code: {eq.discount_code}</span>
            </div>
          )}
        </div>
      </div>
      {eq.url&&(
        <a href={eq.url} target='_blank' rel='noopener noreferrer'
          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',marginTop:10,padding:'10px',borderRadius:10,background:pressed?RED+'dd':'linear-gradient(135deg,'+RED+',#e74c3c)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:'pointer',textDecoration:'none',boxSizing:'border-box'}}
          onMouseEnter={()=>setPressed(true)} onMouseLeave={()=>setPressed(false)}>
          🔗 JETZT ANSEHEN →
        </a>
      )}
    </div>
  );
}


function AuthScreen({ onSession, appLang }) {
  const T_AUTH = {
    DE: {login:'Einloggen',register:'Registrieren',loginBtn:'LOGIN',registerBtn:'REGISTRIEREN',forgotPw:'Passwort vergessen?',sendLink:'LINK SENDEN',cancel:'Abbrechen',pwReset:'PASSWORT RESET',pwResetSub:'Wir senden dir einen Reset-Link per E-Mail.'},
    EN: {login:'Log in',register:'Register',loginBtn:'LOGIN',registerBtn:'REGISTER',forgotPw:'Forgot password?',sendLink:'SEND LINK',cancel:'Cancel',pwReset:'PASSWORD RESET',pwResetSub:'We will send you a reset link by email.'},
  };
  const t = T_AUTH[appLang]||T_AUTH.DE;
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const [info,setInfo]=useState('');const [privacy,setPrivacy]=useState(false);
  const [agbAccepted,setAgbAccepted]=useState(false);
  const [showForgot,setShowForgot]=useState(false);

  async function sendPasswordReset(){
    if(!email){setErr('Bitte E-Mail eingeben');return;}
    setLoading(true);setErr('');
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/recover',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({email})
      });
      if(r.ok){setInfo('Reset-Link wurde an '+email+' gesendet!');setShowForgot(false);}
      else setErr('Fehler beim Senden');
    }catch{setErr('Netzwerkfehler');}
    setLoading(false);
  }

  async function submit() {
    if(!email||!password){setErr('E-Mail und Passwort eingeben');return;}
    if(mode==='register'&&!privacy){setErr('Bitte Datenschutz akzeptieren');return;}
    if(mode==='register'&&!agbAccepted){setErr('Bitte AGB akzeptieren');return;}
    setLoading(true);setErr('');setInfo('');
    if(mode==='register'){
      const r=await authSignUp(email,password);
      if(r.error){
        if(r.error.message?.includes('already registered')||r.error.message?.includes('already been registered')){
          setErr('Diese E-Mail ist bereits registriert. Bitte einloggen.');setMode('login');
        }else{
          setErr(r.error.message||'Registrierung fehlgeschlagen');
        }
      }else if(r.session&&r.session.access_token){
        // Direkt einloggen (E-Mail Bestätigung deaktiviert)
        onSession({token:r.session.access_token,userId:r.user.id,refresh_token:r.session.refresh_token||null,expires_at:Date.now()+(3600*1000)});
      }else if(r.access_token){
        onSession({token:r.access_token,userId:r.user?.id});
      }else if(r.user&&r.user.id){
        // E-Mail Bestätigung aktiv → Hinweis zeigen
        setInfo('✅ Fast fertig! Wir haben eine Bestätigungsmail an '+email+' gesendet. Bitte öffne sie und klicke auf den Link, dann kannst du dich hier einloggen.');
        setMode('login');
      }else if(r.id&&r.aud==='authenticated'){
        // Supabase gibt User direkt zurück — E-Mail Bestätigung nötig
        setInfo('✅ Fast fertig! Wir haben eine Bestätigungsmail an '+email+' gesendet. Bitte öffne sie und klicke auf den Link, dann kannst du dich hier einloggen.');
        setMode('login');
      }else if(r.error){
        setErr(r.error.message||'Registrierung fehlgeschlagen');
      }else{
        setInfo('✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail und logge dich dann ein.');
        setMode('login');
      }
    }else{
      try{
        const r=await authSignIn(email,password);
        if(r.error)setErr(r.error.message||'Login fehlgeschlagen');
        else if(r.access_token)onSession({token:r.access_token,userId:r.user.id,refresh_token:r.refresh_token});
        else setErr('Login fehlgeschlagen — bitte erneut versuchen');
      }catch(e){
        setErr('Netzwerkfehler — bitte Verbindung prüfen');
      }
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <style>{css}</style>
      <div className='fadeUp' style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div className='rj' style={{fontSize:64,color:'#1a1a1a',letterSpacing:6,lineHeight:1}}>FIGHTER</div>
          <div style={{color:RED,fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>FINDE DEINEN GEGNER</div>
        </div>
        <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid #eee',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',marginBottom:20,background:'#f5f5f7',borderRadius:8,padding:3,gap:3}}>
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr('');setInfo('');}}
                style={{flex:1,padding:'9px',borderRadius:6,background:mode===m?'#fff':'transparent',border:mode===m?'1px solid #eee':'none',color:mode===m?'#1a1a1a':'#aaa',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.08)':'none',transition:'all 0.2s'}}>
                {m==='login'?t.login:t.register}
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:11}}>
            <Inp placeholder='E-Mail' value={email} onChange={setEmail} type='email'/>
            <Inp placeholder='Passwort (min. 6 Zeichen)' value={password} onChange={setPassword} type='password' onKeyDown={e=>e.key==='Enter'&&submit()}/>
          </div>
          {err&&<div style={{color:RED,fontSize:12,marginTop:10,textAlign:'center'}}>{err}</div>}
          {mode==='register'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' id='privacy' checked={privacy} onChange={e=>setPrivacy(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <label htmlFor='privacy' style={{color:'#888',fontSize:11,lineHeight:1.5,cursor:'pointer'}}>Ich stimme der <span style={{color:RED,textDecoration:'underline'}} onClick={()=>setShowDatenschutz&&setShowDatenschutz(true)}>Datenschutzerklärung</span> zu</label>
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' id='agb' checked={agbAccepted} onChange={e=>setAgbAccepted(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <label htmlFor='agb' style={{color:'#888',fontSize:11,lineHeight:1.5,cursor:'pointer'}}>Ich akzeptiere die <span style={{color:RED,textDecoration:'underline'}} onClick={()=>setShowAGB&&setShowAGB(true)}>AGB</span></label>
              </div>
            </div>
          )}
          {info&&<div style={{color:'#27ae60',fontSize:12,marginTop:10,textAlign:'center'}}>{info}</div>}
          <button onClick={submit} disabled={loading}
            style={{width:'100%',marginTop:16,padding:'13px',borderRadius:8,background:loading?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:loading?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'...':(mode==='login'?t.loginBtn:t.registerBtn)}
          </button>
          {mode==='login'&&<div onClick={()=>{setShowForgot(true);setErr('');setInfo('');}} style={{textAlign:'center',marginTop:12,color:'#aaa',fontSize:12,cursor:'pointer',textDecoration:'underline'}}>{t.forgotPw}</div>}
        </div>
      </div>
      {showForgot&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:'20px'}}>
          <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',width:'100%',maxWidth:340,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
            <div className='rj' style={{color:'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:6}}>PASSWORT RESET</div>
            <div style={{color:'#888',fontSize:12,marginBottom:16}}>Wir senden dir einen Reset-Link per E-Mail.</div>
            <Inp placeholder='Deine E-Mail' value={email} onChange={setEmail} type='email'/>
            {err&&<div style={{color:RED,fontSize:12,marginTop:8,textAlign:'center'}}>{err}</div>}
            {info&&<div style={{color:'#27ae60',fontSize:12,marginTop:8,textAlign:'center'}}>{info}</div>}
            <button onClick={sendPasswordReset} disabled={loading}
              style={{width:'100%',marginTop:14,padding:'12px',borderRadius:8,background:`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
              {loading?'Senden...':'LINK SENDEN'}
            </button>
            <button onClick={()=>{setShowForgot(false);setErr('');}}
              style={{width:'100%',marginTop:8,padding:'10px',borderRadius:8,background:'transparent',border:'1px solid #eee',color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatOverlay({match,myProfileId,token,onClose,onViewProfile,darkMode,t,appLang}){
  // Fallback t object if not passed
  if(!t)t={fightRequest:'FIGHT REQUEST',fightType:'FIGHT TYP',date:'DATUM',placeGym:'ORT / GYM',placePlaceholder:'z.B. Tiger Gym Berlin',waitingResponse:'Warte...',sendFightRequest:'⚔️ SENDEN',fightSent:'GESENDET!',waitingFor:'Wartet auf',accept:'✅ ANNEHMEN',decline:'❌ ABLEHNEN',counterDate:'🔄 GEGEN-TERMIN',backToChat:'💬 ZURÜCK',fightAccepted:'ANGENOMMEN',fightDeclined:'ABGELEHNT',counterTerm:'GEGENVORSCHLAG',message:'Nachricht…',send:'➤',block:'🚫 Blockieren',unblock:'🚫 Entsperren',report:'⚠️ Melden',reported:'✓ Gemeldet'};
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(true);
  const [showProfilePanel,setShowProfilePanel]=useState(false);
  const [showFightRequest,setShowFightRequest]=useState(false);
  const [fightDate,setFightDate]=useState('');
  const [fightLocation,setFightLocation]=useState('');
  const [fightType,setFightType]=useState('Sparring');
  const [fightSent,setFightSent]=useState(false);
  const [otherTyping,setOtherTyping]=useState(false);
  const endRef=useRef(null);
  const pollRef=useRef(null);
  const typingRef=useRef(null);
  const other=match.profile_a_id===myProfileId?(match.profile_b||match.profile_a):(match.profile_a||match.profile_b);
  const accent=other?.style==='Boxing'?'#c0392b':other?.style==='MMA'?'#2980b9':other?.style==='Muay Thai'?'#d35400':'#27ae60';
  // Safety: if other is completely null, show loading
  if(!other)return(<div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}><div style={{fontSize:32}} className='spin'>⏳</div><div style={{color:'#aaa',fontSize:13}}>{appLang==='FR'?'Chargement...':appLang==='EN'?'Loading...':'Laden...'}</div><button onClick={onClose} style={{marginTop:8,background:'#c0392b',border:'none',borderRadius:8,padding:'10px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{t.back}</button></div>);

  async function markAsRead(){
    try{
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=eq.'+match.id+'&sender_id=neq.'+myProfileId+'&read_at=is.null',{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
        body:JSON.stringify({read_at:new Date().toISOString()})
      });
    }catch{}
  }
  const lastMsgTime=useRef(null);

  async function loadMsgs(onlyNew=false){
    try{
      let query='match_id=eq.'+match.id+'&order=created_at.asc';
      if(onlyNew&&lastMsgTime.current){
        query+='&created_at=gt.'+encodeURIComponent(lastMsgTime.current);
      }
      const msgs=await dbSelect('messages',query,token);
      if(Array.isArray(msgs)&&msgs.length>0){
        if(onlyNew){
          setMessages(prev=>{
            const existingIds=new Set(prev.map(m=>m.id));
            const fresh=msgs.filter(m=>!existingIds.has(m.id));
            if(fresh.length>0){
              // Push für neue Nachrichten vom anderen
              const newest=fresh[fresh.length-1];
              if(newest.sender_id!==myProfileId){
                sendLocalNotification('💬 Neue Nachricht',other?.name+': '+newest.content?.slice(0,60));
              }
              const updated=[...prev,...fresh];
              lastMsgTime.current=updated[updated.length-1].created_at;
              return updated;
            }
            return prev;
          });
        }else{
          setMessages(msgs);
          lastMsgTime.current=msgs[msgs.length-1]?.created_at||null;
        }
        markAsRead();
      }
    }catch{}
    setLoading(false);
  }

  useEffect(()=>{
    loadMsgs(false);
    // Schnelles Polling: 600ms für sofortige Reaktion
    pollRef.current=setInterval(async()=>{
      await loadMsgs(true);
      // Typing status
      try{
        const r=await fetch(SUPA_URL+'/rest/v1/typing_status?match_id=eq.'+match.id+'&user_id=neq.'+myProfileId,{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
        });
        const data=await r.json();
        if(Array.isArray(data)&&data[0]){
          const age=Date.now()-new Date(data[0].updated_at).getTime();
          setOtherTyping(age<4000&&data[0].is_typing===true);
        }else{setOtherTyping(false);}
      }catch{}
    },600);
    return()=>clearInterval(pollRef.current);
  },[match.id]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  async function sendTypingStatus(isTyping){
    try{
      await fetch(SUPA_URL+'/rest/v1/typing_status',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'resolution=merge-duplicates'},
        body:JSON.stringify({match_id:match.id,user_id:myProfileId,is_typing:isTyping,updated_at:new Date().toISOString()})
      });
    }catch{}
  }

  async function send(){
    if(!input.trim())return;
    const text=input.trim();setInput('');
    sendTypingStatus(false);
    clearTimeout(typingRef.current);
    // Sofort optimistisch anzeigen
    const tmpId='tmp_'+Date.now();
    const tmp={id:tmpId,match_id:match.id,sender_id:myProfileId,content:text,created_at:new Date().toISOString()};
    setMessages(m=>[...m,tmp]);
    try{
      const saved=await dbInsert('messages',{match_id:match.id,sender_id:myProfileId,content:text},token);
      // tmp durch echte Nachricht ersetzen
      if(Array.isArray(saved)&&saved[0]){
        setMessages(m=>m.map(msg=>msg.id===tmpId?saved[0]:msg));
        lastMsgTime.current=saved[0].created_at;
      }
    }catch{}
  }

  const wins=other?.wins||0;const losses=other?.losses||0;const draws=other?.draws||0;const ko=other?.ko||0;
  const totalFights=wins+losses+draws;const winRate=totalFights>0?Math.round((wins/totalFights)*100):0;
  return(
    <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:200,display:'flex',flexDirection:'column'}}>

      {/* PROFIL-PANEL — slide in von oben */}
      {showProfilePanel&&(
        <div style={{position:'absolute',inset:0,zIndex:10,background:'#f5f5f7',overflowY:'auto',display:'flex',flexDirection:'column'}}>
          {/* Hero-Bild */}
          <div style={{position:'relative',height:280,flexShrink:0,background:'#111'}}>
            {other?.avatar_url
              ?<img src={other.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:0.85}} alt=''/>
              :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:90}}>🥊</div>}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.8) 100%)'}}/>
            <button onClick={()=>setShowProfilePanel(false)}
              style={{position:'absolute',top:14,left:14,background:'rgba(0,0,0,0.5)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,padding:'5px 12px',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>
              ← Chat
            </button>
            <div style={{position:'absolute',bottom:16,left:16,right:16}}>
              <div className='rj' style={{color:'#fff',fontSize:30,letterSpacing:2,lineHeight:1}}>{other?.name}</div>
              {other?.gym_verified&&(
                <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(39,174,96,0.2)',border:'1px solid rgba(39,174,96,0.4)',borderRadius:20,padding:'3px 10px',marginTop:4}}>
                  <span style={{color:'#27ae60',fontSize:11,fontWeight:700}}>✅ Verifiziertes Mitglied</span>
                </div>
              )}
              <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
                {other?.style&&<div style={{background:accent+'33',border:'1px solid '+accent+'66',borderRadius:20,padding:'3px 10px',color:accent,fontSize:11,fontWeight:700}}>{other.style}</div>}
                {other?.city&&<div style={{background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',color:'rgba(255,255,255,0.8)',fontSize:11}}>📍 {other.city}</div>}
                {other?.gym&&<div style={{background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',color:'rgba(255,255,255,0.8)',fontSize:11}}>🏋️ {other.gym}</div>}
              </div>
            </div>
          </div>

          <div style={{padding:'14px 14px 40px',maxWidth:480,margin:'0 auto',width:'100%'}}>

            {/* Kampfrekord */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
              {[['SIEGE',wins,'#27ae60'],['NIEDER',losses,RED],['UNENTSCH',draws,'#d4a017'],['KOs',ko,RED]].map(([label,val,color])=>(
                <div key={label} style={{background:'#fff',borderRadius:11,padding:'11px 4px',textAlign:'center',border:'1px solid '+color+'33',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div className='rj' style={{color:color,fontSize:26,lineHeight:1}}>{val}</div>
                  <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Win-Rate Bar */}
            <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                <div style={{color:'#888',fontSize:11,fontWeight:600}}>SIEGRATE</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15}}>{winRate}%</div>
              </div>
              <div style={{height:6,background:'#f0f0f0',borderRadius:3}}>
                <div style={{height:'100%',width:winRate+'%',background:'linear-gradient(90deg,#27ae60,#2ecc71)',borderRadius:3,transition:'width 0.6s ease'}}/>
              </div>
              <div style={{color:'#ccc',fontSize:10,marginTop:5}}>{totalFights} Kämpfe gesamt · {ko} KO/TKO Siege</div>
            </div>

            {/* Infos */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
              {[
                [appLang==='FR'?'CATÉGORIE':appLang==='EN'?'WEIGHT CLASS':'GEWICHTSKLASSE',other?.weight_class||'-','#2980b9'],
                [appLang==='FR'?'SALLE':'GYM',other?.gym||'-','#8e44ad'],
                ['GRÖSSE',other?.height?(other.height+'cm'):'-','#27ae60'],
                ['GEWICHT',other?.weight?(other.weight+'kg'):'-','#e67e22'],
              ].map(([label,val,color])=>(
                <div key={label} style={{background:'#fff',borderRadius:10,padding:'11px 12px',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                  <div style={{color:'#ccc',fontSize:9,letterSpacing:1}}>{label}</div>
                  <div style={{color:color,fontWeight:700,fontSize:13,marginTop:3}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Bio */}
            {other?.bio&&(
              <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:10}}>
                <div style={{color:'#ccc',fontSize:9,letterSpacing:1,marginBottom:6}}>ÜBER MICH</div>
                <div style={{color:'#555',fontSize:13,fontStyle:'italic',lineHeight:1.6}}>"{other.bio}"</div>
              </div>
            )}

            {/* Zurück zum Chat Button */}
            <button onClick={()=>setShowProfilePanel(false)}
              style={{width:'100%',padding:'13px',borderRadius:10,background:`linear-gradient(135deg,${accent},${accent}cc)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:'pointer'}}>
              💬 ZURÜCK ZUM CHAT
            </button>
          </div>
        </div>
      )}

      {/* FIGHT REQUEST PANEL */}
      {showFightRequest&&(
        <div style={{position:'absolute',inset:0,zIndex:11,background:'#f5f5f7',overflowY:'auto',display:'flex',flexDirection:'column'}}>
          <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'14px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setShowFightRequest(false)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',borderRadius:8,padding:'5px 12px',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
            <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2,flex:1}}>{t.fightRequest}</div>
            <div style={{fontSize:22}}>⚔️</div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee',textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:6}}>{other?.emoji||''}</div>
              <div className='rj' style={{color:'#1a1a1a',fontSize:18,letterSpacing:1}}>{other?.name}</div>
              <div style={{color:'#888',fontSize:12,marginTop:2}}>{other?.style} · {other?.weight_class||other?.weightClass||''}</div>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:10}}>{t.fightType}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['Sparring','Amateur Wettkampf','Profi Wettkampf','Freundschaftskampf'].map(t=>(
                  <button key={t} onClick={()=>setFightType(t)} style={{padding:'7px 12px',borderRadius:20,background:fightType===t?'#c0392b':'#f5f5f5',border:'1px solid '+(fightType===t?'#c0392b':'#ddd'),color:fightType===t?'#fff':'#666',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{t.date}</div>
              <input type='date' value={fightDate} onChange={e=>setFightDate(e.target.value)}
                style={{width:'100%',background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:8,padding:'10px 12px',fontSize:14,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif'}}/>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>{t.placeGym}</div>
              <input type='text' value={fightLocation} onChange={e=>setFightLocation(e.target.value)} placeholder={t.placePlaceholder}
                style={{width:'100%',background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:8,padding:'10px 12px',fontSize:14,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif'}}/>
            </div>
            {fightSent?(
              <div style={{background:'#f0faf0',border:'1px solid #27ae6044',borderRadius:12,padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:6}}>✅</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18}}>{t.fightSent}</div>
                <div style={{color:'#888',fontSize:12,marginTop:4}}>Warte auf Antwort von {other?.name}</div>
              </div>
            ):(
              <button onClick={async()=>{
                if(!fightDate||!fightLocation){return;}
                const hasIncoming=messages.some(m=>m.content?.startsWith('⚔️ FIGHT REQUEST')&&m.sender_id!==myProfileId);
                const prefix=hasIncoming?'🔄 ALTERNATIVTERMIN':'⚔️ FIGHT REQUEST';
                const msg=`${prefix}

Typ: ${fightType}
Datum: ${new Date(fightDate).toLocaleDateString('de')}
Ort: ${fightLocation}

Bist du dabei?`;
                try{
                  await fetch(SUPA_URL+'/rest/v1/messages',{
                    method:'POST',
                    headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
                    body:JSON.stringify({match_id:match.id,sender_id:myProfileId,content:msg})
                  });
                  setFightSent(true);
                  setTimeout(()=>{setShowFightRequest(false);setFightSent(false);},2000);
                }catch{}
              }} disabled={!fightDate||!fightLocation}
                style={{width:'100%',padding:'14px',borderRadius:10,background:fightDate&&fightLocation?'linear-gradient(135deg,#c0392b,#e74c3c)':'#eee',border:'none',color:fightDate&&fightLocation?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:fightDate&&fightLocation?'pointer':'not-allowed'}}>
                ⚔️ FIGHT REQUEST SENDEN
              </button>
            )}
          </div>
        </div>
      )}

      {/* CHAT HEADER — klickbar für Profil */}
      <div onClick={()=>setShowProfilePanel(true)} style={{display:'flex',alignItems:'center',gap:11,padding:'10px 14px',background:'#fff',borderBottom:'1px solid #eee',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:'pointer',userSelect:'none'}}>
        <button onClick={e=>{e.stopPropagation();onClose();}} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',padding:'0 4px 0 0',fontFamily:'Rajdhani,sans-serif',fontWeight:700,flexShrink:0}}>←</button>
        <div style={{position:'relative',flexShrink:0}}>
          {other?.avatar_url
            ?<img src={other.avatar_url} style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:'2px solid '+accent}} alt=''/>
            :<div style={{width:42,height:42,borderRadius:'50%',background:accent+'22',border:'2px solid '+accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🥊</div>}
          <div style={{position:'absolute',bottom:0,right:0,width:10,height:10,borderRadius:'50%',background:'#27ae60',border:'2px solid #fff'}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div className='rj' style={{color:'#1a1a1a',fontSize:18,letterSpacing:1,lineHeight:1}}>{other?.name}</div>
          <div style={{color:accent,fontSize:10,fontWeight:700,marginTop:2}}>{other?.style} · {other?.city}</div>
        </div>
        <div style={{background:accent+'15',border:'1px solid '+accent+'33',borderRadius:8,padding:'5px 10px',flexShrink:0}}>
          <div style={{color:accent,fontSize:10,fontWeight:700}}>Profil</div>
          <div style={{color:accent,fontSize:10,textAlign:'center'}}>ansehen</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
        {loading?<div style={{textAlign:'center',color:'#bbb',marginTop:30}}>Laden…</div>
        :messages.length===0?<div style={{textAlign:'center',color:'#bbb',marginTop:40}}><div style={{fontSize:36,marginBottom:10}}>⚔️</div><div style={{fontWeight:700,fontSize:14}}>Match bestätigt!</div><div style={{fontSize:12,marginTop:4}}>Schreib die erste Nachricht</div></div>
        :messages.map(m=>{
          const isMe=m.sender_id===myProfileId;
          const isFightReq=m.content&&m.content.startsWith('⚔️ FIGHT REQUEST');
          const isAccepted=m.content&&m.content.startsWith('✅ FIGHT ANGENOMMEN');
          const isDeclined=m.content&&m.content.startsWith('❌ FIGHT ABGELEHNT');
          const isCounter=m.content&&m.content.startsWith('🔄 ALTERNATIVTERMIN');

          if(isFightReq){
            const lines=m.content.split('\n').filter(Boolean);
            const typ=lines.find(l=>l.startsWith('Typ:'))?.replace('Typ: ','');
            const datum=lines.find(l=>l.startsWith('Datum:'))?.replace('Datum: ','');
            const ort=lines.find(l=>l.startsWith('Ort:'))?.replace('Ort: ','');
            return(
              <div key={m.id} style={{display:'flex',justifyContent:'center',margin:'6px 0'}}>
                <div style={{width:'90%',maxWidth:320,background:'#fff',borderRadius:14,border:'2px solid #c0392b33',boxShadow:'0 2px 12px rgba(192,57,43,0.1)',overflow:'hidden'}}>
                  <div style={{background:'linear-gradient(135deg,#1a1a1a,#c0392b)',padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:20}}>⚔️</span>
                    <div className='rj' style={{color:'#fff',fontSize:16,letterSpacing:2,flex:1}}>FIGHT REQUEST</div>
                    <div style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>{isMe?'Von dir':'Von '+other?.name?.split(' ')[0]}</div>
                  </div>
                  <div style={{padding:'12px 14px'}}>
                    {[['🥊 Typ',typ],['📅 Datum',datum],['📍 Ort',ort]].map(([label,val])=>val&&(
                      <div key={label} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                        <div style={{color:'#aaa',fontSize:11,width:60,flexShrink:0}}>{label}</div>
                        <div style={{color:'#1a1a1a',fontSize:13,fontWeight:600}}>{val}</div>
                      </div>
                    ))}
                    {!isMe&&(
                      <div style={{display:'flex',gap:6,marginTop:10}}>
                        <button onClick={async()=>{
                          const reply=`✅ FIGHT ANGENOMMEN

Typ: ${typ}
Datum: ${datum}
Ort: ${ort}

Bis dann! 🥊`;
                          await fetch(SUPA_URL+'/rest/v1/messages',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},body:JSON.stringify({match_id:match.id,sender_id:myProfileId,content:reply})});
                          try{
                            await fetch(SUPA_URL+'/rest/v1/fight_history',{
                              method:'POST',
                              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
                              body:JSON.stringify({
                                user_id:myProfileId,
                                opponent_id:other?.id||null,
                                opponent_name:other?.name||'Unbekannt',
                                opponent_style:other?.style||'',
                                fight_type:typ||'Sparring',
                                fight_date:datum||'',
                                location:ort||'',
                                status:'angenommen',
                                result:'ausstehend'
                              })
                            });
                          }catch(e){console.error('fight_history',e);}
                        }} style={{flex:1,padding:'9px',borderRadius:9,background:'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                          ✅ ANNEHMEN
                        </button>
                        <button onClick={async()=>{
                          const reply=`❌ FIGHT ABGELEHNT

Leider kann ich diesen Termin nicht wahrnehmen.`;
                          await fetch(SUPA_URL+'/rest/v1/messages',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},body:JSON.stringify({match_id:match.id,sender_id:myProfileId,content:reply})});
                        }} style={{flex:1,padding:'9px',borderRadius:9,background:'#fff',border:'1px solid #e74c3c',color:'#e74c3c',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                          ❌ ABLEHNEN
                        </button>
                        <button onClick={()=>{setShowFightRequest(true);}} style={{flex:1,padding:'9px',borderRadius:9,background:'#fff',border:'1px solid #2980b9',color:'#2980b9',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                          🔄 GEGEN-TERMIN
                        </button>
                      </div>
                    )}
                    {isMe&&<div style={{color:'#aaa',fontSize:11,textAlign:'center',marginTop:6}}>{t.waitingResponse}</div>}
                  </div>
                  <div style={{padding:'4px 14px 8px',textAlign:'right'}}>
                    <span style={{color:'#ccc',fontSize:9}}>{new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                </div>
              </div>
            );
          }

          if(isAccepted||isDeclined||isCounter){
            const isGreen=isAccepted;
            const isBlue=isCounter;
            const bg=isGreen?'#f0faf0':isBlue?'#f0f4ff':'#fff5f5';
            const border=isGreen?'#27ae60':isBlue?'#2980b9':'#e74c3c';
            const icon=isAccepted?'✅':isDeclined?'❌':'🔄';
            const title=isAccepted?'FIGHT ANGENOMMEN':isDeclined?'FIGHT ABGELEHNT':'ALTERNATIVTERMIN';
            return(
              <div key={m.id} style={{display:'flex',justifyContent:'center',margin:'6px 0'}}>
                <div style={{width:'85%',maxWidth:300,background:bg,borderRadius:12,border:'1px solid '+border+'44',padding:'12px 14px'}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                    <span style={{fontSize:18}}>{icon}</span>
                    <div className='rj' style={{color:border,fontSize:14,letterSpacing:1}}>{title}</div>
                  </div>
                  <div style={{color:'#555',fontSize:12,lineHeight:1.5}}>{m.content.split('\n').slice(1).filter(Boolean).join(' · ')}</div>
                  <div style={{color:'#bbb',fontSize:9,marginTop:6,textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            );
          }

          return(
            <div key={m.id} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',alignItems:'flex-end',gap:6}}>
              {!isMe&&(
                <div onClick={()=>setShowProfilePanel(true)} style={{cursor:'pointer',flexShrink:0}}>
                  {other?.avatar_url
                    ?<img src={other.avatar_url} style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',border:'1px solid '+accent+'44'}} alt=''/>
                    :<div style={{width:26,height:26,borderRadius:'50%',background:accent+'22',border:'1px solid '+accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🥊</div>}
                </div>
              )}
              <div style={{maxWidth:'72%',padding:'9px 13px',borderRadius:isMe?'14px 14px 3px 14px':'14px 14px 14px 3px',background:isMe?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#fff',color:isMe?'#fff':'#1a1a1a',fontSize:14,boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
                {m.content}
                <div style={{color:isMe?'rgba(255,255,255,0.55)':'#ccc',fontSize:9,marginTop:3,textAlign:'right'}}>
                  {new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})} {isMe&&<span style={{marginLeft:3,color:m.read_at?'#4fc3f7':'rgba(255,255,255,0.7)'}}>{m.id.startsWith('tmp_')?'✓':'✓✓'}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping&&(
          <div style={{display:'flex',alignItems:'flex-end',gap:6,marginLeft:4}}>
            <div onClick={()=>setShowProfilePanel(true)} style={{cursor:'pointer',flexShrink:0}}>
              {other?.avatar_url
                ?<img src={other.avatar_url} style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',border:'1px solid '+accent+'44'}} alt=''/>
                :<div style={{width:26,height:26,borderRadius:'50%',background:accent+'22',border:'1px solid '+accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🥊</div>}
            </div>
            <div style={{padding:'10px 14px',borderRadius:'14px 14px 14px 3px',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',display:'flex',gap:4,alignItems:'center'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#bbb',animation:'pulse 1s ease-in-out infinite'}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#bbb',animation:'pulse 1s ease-in-out 0.2s infinite'}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#bbb',animation:'pulse 1s ease-in-out 0.4s infinite'}}/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{padding:'6px 12px 0',background:'#fff',borderTop:'1px solid #eee'}}> 
        <button onClick={()=>setShowFightRequest(true)} style={{width:'100%',padding:'7px',borderRadius:8,background:'linear-gradient(135deg,#1a1a1a,#c0392b)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,letterSpacing:1.5,cursor:'pointer',marginBottom:6}}>
          ⚔️ FIGHT REQUEST SENDEN
        </button>
      </div>
      <div style={{padding:'6px 12px 10px',background:'#fff',display:'flex',gap:8,alignItems:'flex-end'}}>
        <textarea value={input} onChange={e=>{
                setInput(e.target.value);
                if(e.target.value.length>0){
                  sendTypingStatus(true);
                  clearTimeout(typingRef.current);
                  typingRef.current=setTimeout(()=>sendTypingStatus(false),3000);
                }else{sendTypingStatus(false);}
              }}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder={t.message} rows={1}
          style={{flex:1,background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:20,padding:'10px 14px',fontSize:14,color:'#1a1a1a',maxHeight:80}}/>
        <button onClick={send} disabled={!input.trim()}
          style={{width:42,height:42,borderRadius:'50%',background:input.trim()?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:input.trim()?'#fff':'#aaa',fontSize:17,cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          ➤
        </button>
      </div>
    </div>
  );
}


export default function App(){
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [screen,setScreen]=useState('loading');
  const [tabRaw,setTabRaw]=useState(()=>{try{return localStorage.getItem('fighter_tab')||'swipe'}catch{return 'swipe'}});
  const tab=tabRaw;
  const setTab=(t)=>{try{localStorage.setItem('fighter_tab',t)}catch{}setTabRaw(t);};
  const [step,setStep]=useState(1);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const [myProfile,setMyProfile]=useState(null);
  const [profile,setProfile]=useState({name:'',age:'',city:'',gym:'',height:'',weight:'',weightClass:'',style:'',bio:'',isPro:false,country:'DE',gender:'male'});
  const [stats,setStats]=useState({wins:0,losses:0,draws:0,ko:0});
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [avatarPreview,setAvatarPreview]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [cards,setCards]=useState([...FIGHTERS]);
  const [drag,setDrag]=useState(false);
  const [offset,setOffset]=useState({x:0,y:0});
  const [start,setStart]=useState({x:0,y:0});
  const [lastAct,setLastAct]=useState(null);
  const [lastSwiped,setLastSwiped]=useState(null);
  const [lightboxImg,setLightboxImg]=useState(null);
  const [imgEditorSrc,setImgEditorSrc]=useState(null);
  const [imgEditorPos,setImgEditorPos]=useState({x:50,y:50});
  const [imgEditorCallback,setImgEditorCallback]=useState(null);
  const [showImgEditor,setShowImgEditor]=useState(false);
  const [recentSwiped,setRecentSwiped]=useState([]);
  const [whoLikedMe,setWhoLikedMe]=useState([]);
  const [adminMessages,setAdminMessages]=useState([]);
  const [showAdminMsg,setShowAdminMsg]=useState(false);
  const [allProfiles,setAllProfiles]=useState([]);
  const [rankingLoading,setRankingLoading]=useState(false);
  const [scanResult,setScanResult]=useState(null);
  const [editGymId,setEditGymId]=useState(null);
  const [adminGymWebsite,setAdminGymWebsite]=useState('');
  const [gymSearchLoading,setGymSearchLoading]=useState(false);
  const [gymSearchQuery,setGymSearchQuery]=useState('');
  const [whoLikedTab,setWhoLikedTab]=useState(false);
  const [newLikesCount,setNewLikesCount]=useState(0);
  const [lastLikesCheck,setLastLikesCheck]=useState(()=>{try{return localStorage.getItem('fighter_likes_check')||'2000-01-01'}catch{return '2000-01-01'}});
  const [likesBannerSeen,setLikesBannerSeen]=useState(()=>{try{return localStorage.getItem('fighter_banner_seen')||''}catch{return ''}});
  const [matched,setMatched]=useState(null);
  const [swStats,setSwStats]=useState({ch:0,de:0});
  const [dbMatches,setDbMatches]=useState([]);
  const [matchesLoading,setMatchesLoading]=useState(false);
  const [unreadCount,setUnreadCount]=useState(0);
  const [activeChat,setActiveChat]=useState(null);
  const [viewProfile,setViewProfile]=useState(null);
  const [viewGym,setViewGym]=useState(null);
  const [blockedUsers,setBlockedUsers]=useState(()=>{try{return JSON.parse(localStorage.getItem('fighter_blocked')||'[]')}catch{return []}});
  const [gymVerified,setGymVerified]=useState(()=>{try{return JSON.parse(localStorage.getItem('fighter_gym_verified')||'null')}catch{return null}});
  const [showOnboarding,setShowOnboarding]=useState(()=>{try{const done=localStorage.getItem('fighter_onboarding_done');const hasSession=localStorage.getItem('fighter_v5');return !done&&!hasSession;}catch{return true}});
  const [onboardSlide,setOnboardSlide]=useState(0);
  const [gymLogos,setGymLogos]=useState({});
  const [showAdmin,setShowAdmin]=useState(false);
  const [adminTab,setAdminTab]=useState('gyms');
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminReports,setAdminReports]=useState([]);
  const [adminRecords,setAdminRecords]=useState([]);
  const [adminGymCode,setAdminGymCode]=useState('');
  const [adminGymLogoUrl,setAdminGymLogoUrl]=useState('');
  const [adminGymName,setAdminGymName]=useState('');
  const [adminGymCity,setAdminGymCity]=useState('');
  const [adminGymStyles,setAdminGymStyles]=useState('');
  const [adminGymPhone,setAdminGymPhone]=useState('');
  const [adminGymHours,setAdminGymHours]=useState('');
  const [adminGymDesc,setAdminGymDesc]=useState('');
  const [adminGymAddress,setAdminGymAddress]=useState('');
  const [adminCityGymName,setAdminCityGymName]=useState('');
  const [adminBroadcast,setAdminBroadcast]=useState('');
  const [adminCityName,setAdminCityName]=useState('');
  const [adminCityLat,setAdminCityLat]=useState('');
  const [adminCityLon,setAdminCityLon]=useState('');
  const [adminCityBL,setAdminCityBL]=useState('');
  const [adminSaving,setAdminSaving]=useState(false);
  const [adminFeedback,setAdminFeedback]=useState([]);
  const [feedbackFilter,setFeedbackFilter]=useState('alle');
  const [equipmentList,setEquipmentList]=useState([]);
  const [equipLoading,setEquipLoading]=useState(false);
  const [newEquip,setNewEquip]=useState({brand:'',product:'',description:'',category:'Boxen',url:'',image_url:'',discount_code:'',featured:false});
  const [adminUsersLoaded,setAdminUsersLoaded]=useState(false);
  const isAdmin=session?.userId===ADMIN_ID||myProfile?.id===ADMIN_ID;
  const [fightHistory,setFightHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem('fighter_history')||'[]')}catch{return []}});
  const [historyPublic,setHistoryPublic]=useState(()=>{try{return localStorage.getItem('fighter_history_public')==='true'}catch{return false}});
  const [editMode,setEditMode]=useState(false);
  const [editProfile,setEditProfile]=useState({});
  const [savingEdit,setSavingEdit]=useState(false);
  const [showGymVerify,setShowGymVerify]=useState(false);
  const [gymCodeInput,setGymCodeInput]=useState('');
  const [gymVerifyError,setGymVerifyError]=useState('');
  const GYM_CODES=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct,key:ct+'-'+g.name})));
  const [reportSent,setReportSent]=useState({});
  const [viewProfileHistory,setViewProfileHistory]=useState([]);
  const [city,setCity]=useState('Berlin');
  const [rankF,setRankF]=useState('All');
  const [trainerF,setTrainerF]=useState('All');
  const [sport,setSport]=useState('Basketball');
  const [joined,setJoined]=useState({});
  const [gymRatings,setGymRatings]=useState(()=>{try{return JSON.parse(localStorage.getItem('gymRatings')||'{}')}catch{return {}}});
  const [dbGyms,setDbGyms]=useState([]);
  const [gymRankMode,setGymRankMode]=useState(false);
  const [countryFilter,setCountryFilter]=useState('mine'); // 'mine' | 'world'
  const [gymRatingInput,setGymRatingInput]=useState({});
  const [myLat,setMyLat]=useState(null);
  const [myLon,setMyLon]=useState(null);
  const [locationSource,setLocationSource]=useState('city'); // 'city' | 'ip' | 'gps'
  const [locationLoading,setLocationLoading]=useState(false);
  const [showMenu,setShowMenu]=useState(false);
  const [showFeedbackModal,setShowFeedbackModal]=useState(false);
  const [feedbackType,setFeedbackType]=useState('feedback'); // 'feedback' | 'wunsch'
  const [showEquipment,setShowEquipment]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [appLang,setAppLang]=useState(()=>{
    try{
      const saved=localStorage.getItem('fighter_lang');
      if(saved)return saved;
      // Auto-detect from browser language
      const bl=(navigator.language||navigator.userLanguage||'de').toLowerCase();
      if(bl.startsWith('fr'))return 'FR';
      if(bl.startsWith('en'))return 'EN';
      return 'DE'; // Default für DACH
    }catch{return 'DE';}
  });
  const T = {
    DE: {
      // Navigation
      fight:'FIGHT', chat:'CHAT', rang:'RANG', gyms:'GYMS', profil:'PROFIL',
      // Additional UI strings
      noOneLiked:'Noch niemand hat dich geliket',
      keepSwiping:'Swipe weiter — dein Match kommt!',
      notifications:'Benachrichtigungen',
      noEvents:'Keine Events vorhanden',
      findEventsCity:'Finde Events in deiner Stadt',
      deleteBtn:'🗑️ Löschen',
      gymNotFound:'Kein Gym gefunden',
      gymBeingAdded:'Dein Gym wird geprüft und hinzugefügt',
      myGymNotListed:'Mein Gym ist nicht dabei → anmelden',
      noReports:'Keine Meldungen — oder "Laden" drücken',
      noRequests:'Keine offenen Anträge',
      noFeedbackYet:'Noch kein Feedback — Laden drücken',
      weiterSwipen:'Weiter swipen',
      // Auth
      login:'Einloggen', register:'Registrieren', email:'E-Mail', password:'Passwort (min. 6 Zeichen)',
      loginBtn:'LOGIN', registerBtn:'REGISTRIEREN', forgotPw:'Passwort vergessen?',
      privacyAgree:'Ich stimme der', agbAgree:'Ich akzeptiere die',
      pwReset:'PASSWORT RESET', pwResetSub:'Wir senden dir einen Reset-Link per E-Mail.',
      sendLink:'LINK SENDEN', cancel:'Abbrechen',
      // Setup
      yourName:'Dein Name', age:'Alter', location:'Standort', photo:'FOTO',
      photoRequired:'Profilbild hochladen (Pflicht)', photoUploaded:'Foto hochgeladen ✓',
      yourGym:'Dein Gym', aboutYou:'Über dich', fightStyle:'Kampfstil (mehrere möglich)',
      height:'Größe (cm)', fightWeight:'Kampfgewicht (kg)', weightClass:'Gewichtsklasse',
      chooseWeightClass:'Gewichtsklasse wählen', fightRecord:'Kampfrekord (optional)',
      back:'Zurück', next:'Weiter', letsGo:'Lets Fight', saving:'Speichern…',
      // Swipe/Fight Tab
      profileSeen:'Profil ansehen', justNow:'🟢 Gerade online', minAgo:'Vor', min:'Min',
      hoursAgo:'Vor', hour:'Std', daysAgo:'Vor', day:'Tag', days:'Tagen', aWhileAgo:'⚪ Vor einer Weile',
      allFightersSeen:'ALLE FIGHTER', allFightersSeen2:'GESEHEN',
      noFightersNearby:'Keine Fighter in deiner Nähe gefunden.',
      allFightersSwiped:'Alle Fighter wurden gesehen! Neue kommen täglich dazu.',
      newFighters:'🔄 NEUE FIGHTER', goToChats:'💬 CHATS',
      recentlySeen:'ZULETZT GESEHEN', fightRequests:'FIGHT REQUESTS – tippe für Chat',
      interestedIn:'Fighter interessieren sich für dich',
      myCountry:'Mein Land', worldwide:'Weltweit',
      // Chat Tab
      messages:'NACHRICHTEN', matches:'Match', matchPlural:'es',
      noMatches:'NOCH KEINE MATCHES',
      noMatchesSub:'Swipe rechts auf Fighter die du herausfordern möchtest — bei gegenseitigem Match könnt ihr direkt chatten!',
      swipeNow:'⚔️ JETZT SWIPEN', newFightersDaily:'Neue Fighter kommen täglich hinzu',
      noFighterFound:'Kein Fighter gefunden', noMatchesFor:'Keine Matches für',
      searchFighter:'Fighter suchen...', chatBtn:'CHAT →',
      // Fight Request
      fightRequest:'FIGHT REQUEST', fightType:'FIGHT TYP', date:'DATUM', placeGym:'ORT / GYM',
      placePlaceholder:'z.B. Tiger Gym Berlin, Mitte', waitingResponse:'Warte auf Antwort…',
      sendFightRequest:'⚔️ FIGHT REQUEST SENDEN', fightSent:'FIGHT REQUEST GESENDET!',
      waitingFor:'Warte auf Antwort von', accept:'✅ ANNEHMEN', decline:'❌ ABLEHNEN',
      counterDate:'🔄 GEGEN-TERMIN', backToChat:'💬 ZURÜCK ZUM CHAT',
      fightAccepted:'FIGHT ANGENOMMEN', fightDeclined:'FIGHT ABGELEHNT', counterTerm:'ALTERNATIVTERMIN',
      // Ranking
      worldRanking:'WELTRANGLISTE', amateurs:'🏅 AMATEURE', pros:'🌍 PROFIS', trainer:'🎓 TRAINER',
      all:'Alle', wins:'SIEGE', losses:'NIEDER', draws:'UNENTSCH', kos:'KOs',
      points:'Pkt', winRate:'SIEGRATE', fights:'Kämpfe gesamt',
      rankFormula:'SIEG +3 · UNENTSCH +1 · NIEDERLAGE -2',
      // Gyms
      findGyms:'GYMS FINDEN', cities:'🏙️ Städte', topGyms:'🏆 TOP GYMS',
      gymRanking:'🏆 GYM RANKING', sortedByRatings:'Nach Bewertungen sortiert',
      rateThisGym:'BEWERTE DIESES GYM', notRatedYet:'Noch nicht bewertet · ',
      firstToRate:'Sei der Erste!', myRating:'Deine Bewertung:', star:'Stern', stars:'Sterne',
      ratings:'Bewertung', ratingsPlural:'en', members:'Mitglieder', founded:'Gegründet',
      contact:'KONTAKT & ADRESSE', address:'ADRESSE', phone:'TELEFON',
      website:'WEBSITE', fighterCode:'FIGHTER-APP CODE', gymCode:'Diesen Code beim Gym erfragen → Profil verifizieren',
      openingHours:'ÖFFNUNGSZEITEN', aboutGym:'ÜBER DAS GYM',
      // Profile/Stats
      profileView:'PROFIL', editProfile:'PROFIL BEARBEITEN', changePhoto:'Foto ändern',
      editSave:'SPEICHERN', fightRecordEdit:'REKORD BEARBEITEN', saveProfil:'Profil speichern',
      verifyRecord:'🏅 KAMPFREKORD VERIFIZIEREN', verifyRecordSub:'Lade ein Foto deiner Urkunde, Medaille oder eines offiziellen Kampfergebnisses hoch. Dein Rekord bekommt dann ein ✅ Verifiziert-Badge.',
      verified:'REKORD VERIFIZIERT', pending:'WIRD GEPRÜFT', upTo48h:'Bis zu 48 Stunden',
      uploadProof:'Urkunde / Medaille hochladen', maxSize:'JPG, PNG · max 5MB',
      gymVerify:'Gym-Mitgliedschaft verifizieren', gymVerified2:'Gym verifiziert ✅',
      gymCodeEnter:'Gym-Code eingeben → Badge erhalten',
      trainingHistory:'🤝 TRAININGS-HISTORIE', trainingWith:'Mit wem hast du trainiert?',
      noHistory:'Noch keine Trainings-Einträge', historyHint:'Nimm einen Fight Request an → wird hier gespeichert',
      public2:'Öffentlich', private2:'Privat',
      // Settings
      settings:'EINSTELLUNGEN', darkMode:'Dark Mode', impressum:'Impressum',
      privacy:'Datenschutz', agb:'AGB', deleteAccount:'Account löschen',
      changePw:'Passwort ändern', logout:'Ausloggen',
      // Misc
      undone:'↩️ Rückgängig!', photoUploading:'Foto wird hochgeladen...',
      matchConfirmed:'Match bestätigt!', writeFirst:'Schreib die erste Nachricht',
      message:'Nachricht…', send:'➤',
      block:'🚫 Blockieren', unblock:'🚫 Entsperren', report:'⚠️ Melden', reported:'✓ Gemeldet',
      trainingPublic:'Trainings-Historie ist jetzt öffentlich 👁', trainingPrivate:'Trainings-Historie ist jetzt privat 🔒',
      profileLink:'Profil-Link kopiert! 📋',
      // Onboarding
      ob1title:'FINDE DEINEN GEGNER', ob1sub:'Entdecke Kampfsportler in deiner Nähe — egal ob Sparring, Techniktraining oder offizieller Kampf.',
      ob2title:'MATCH & CHAT', ob2sub:'Wenn beide geliket haben habt ihr ein Match. Schreibt euch, vereinbart Trainings und baut euren Rekord auf.',
      ob3title:'BAUE DEINEN REKORD AUF', ob3sub:'Trainings-Historie, verifizierter Kampfrekord, Gym-Mitgliedschaft. Zeig der Community wer du bist.',
      skip:'Überspringen', continueBtn:'WEITER →', startNow:'JETZT STARTEN 🥊',
      // Interest banner
      interestBanner:'Fighter interessieren sich für dich',
      interestTitle:'INTERESSE AN DIR', interestSub:'Fighter haben dich geliket',
      matchBtn:'⚔️ MATCH',
      // Gym verify
      gymVerifyTitle:'GYM VERIFIZIEREN', gymVerifyConfirm:'Bestätige deine Gym-Mitgliedschaft',
      howToCode:'💡 WIE BEKOMME ICH DEN CODE?',
      howToCodeText:'Frage an der Rezeption deines Gyms nach dem Fighter-App Code. Der 8-stellige Code (z.B. TGB-2847) wird dir direkt mitgeteilt.',
      gymCodeLabel:'GYM-CODE EINGEBEN', verifyBtn:'✅ VERIFIZIEREN', invalidCode:'Ungültiger Code. Bitte frage dein Gym nach dem Fighter-Code.',
      alreadyVerified:'✅ VERIFIZIERTES MITGLIED', verifiedSince:'Seit:', removeVerification:'Verifizierung entfernen',
      // Gym register
      gymRegisterTitle:'GYM ANMELDEN', gymRegisterSub:'Dein Gym wird geprüft und hinzugefügt',
      gymName:'GYM NAME *', city2:'STADT *', gymAddress:'ADRESSE', fightStyleLabel:'KAMPFSTIL',
      gymRegSentTitle:'ANMELDUNG GESENDET!', gymRegSentSub:'Wir prüfen dein Gym und fügen es innerhalb von 48h hinzu.',
      close:'SCHLIESSEN', registerGym:'➕ ANMELDEN',
      // Password change
      pwChangeTitle:'🔑 PASSWORT ÄNDERN', pwChangeSub:'Mindestens 6 Zeichen', newPw:'Neues Passwort',
      pwSave:'SPEICHERN', pwError:'Mindestens 6 Zeichen!', pwSuccess:'✅ Passwort geändert!',
    },
    EN: {
      // Navigation
      fight:'FIGHT', chat:'CHAT', rang:'RANK', gyms:'GYMS', profil:'PROFILE',
      // Additional UI strings
      noOneLiked:'Nobody liked you yet',
      keepSwiping:'Keep swiping — your match is coming!',
      notifications:'Notifications',
      noEvents:'No events available',
      findEventsCity:'Find events in your city',
      deleteBtn:'🗑️ Delete',
      gymNotFound:'No gym found',
      gymBeingAdded:'Your gym is being reviewed and added',
      myGymNotListed:'My gym is not listed → register',
      noReports:'No reports — or press "Load"',
      noRequests:'No open requests',
      noFeedbackYet:'No feedback yet — press Load',
      weiterSwipen:'Keep swiping',
      // Auth
      login:'Log in', register:'Register', email:'E-Mail', password:'Password (min. 6 chars)',
      loginBtn:'LOGIN', registerBtn:'REGISTER', forgotPw:'Forgot password?',
      privacyAgree:'I agree to the', agbAgree:'I accept the',
      pwReset:'PASSWORD RESET', pwResetSub:'We will send you a reset link by email.',
      sendLink:'SEND LINK', cancel:'Cancel',
      // Setup
      yourName:'Your name', age:'Age', location:'Location', photo:'PHOTO',
      photoRequired:'Upload profile photo (required)', photoUploaded:'Photo uploaded ✓',
      yourGym:'Your gym', aboutYou:'About you', fightStyle:'Fighting style (multiple possible)',
      height:'Height (cm)', fightWeight:'Fight weight (kg)', weightClass:'Weight class',
      chooseWeightClass:'Choose weight class', fightRecord:'Fight record (optional)',
      back:'Back', next:'Next', letsGo:'Lets Fight', saving:'Saving…',
      // Swipe/Fight Tab
      profileSeen:'View profile', justNow:'🟢 Online now', minAgo:'', min:'min ago',
      hoursAgo:'', hour:'h ago', daysAgo:'', day:'d ago', days:'', aWhileAgo:'⚪ A while ago',
      allFightersSeen:'ALL FIGHTERS', allFightersSeen2:'SEEN',
      noFightersNearby:'No fighters found near you.',
      allFightersSwiped:'All fighters seen! New ones added daily.',
      newFighters:'🔄 NEW FIGHTERS', goToChats:'💬 CHATS',
      recentlySeen:'RECENTLY SEEN', fightRequests:'FIGHT REQUESTS – tap to chat',
      interestedIn:'Fighters are interested in you',
      myCountry:'My Country', worldwide:'Worldwide',
      // Chat Tab
      messages:'MESSAGES', matches:'Match', matchPlural:'es',
      noMatches:'NO MATCHES YET',
      noMatchesSub:'Swipe right on fighters you want to challenge — when both match you can chat directly!',
      swipeNow:'⚔️ SWIPE NOW', newFightersDaily:'New fighters added daily',
      noFighterFound:'No fighter found', noMatchesFor:'No matches for',
      searchFighter:'Search fighter...', chatBtn:'CHAT →',
      // Fight Request
      fightRequest:'FIGHT REQUEST', fightType:'FIGHT TYPE', date:'DATE', placeGym:'LOCATION / GYM',
      placePlaceholder:'e.g. Tiger Gym Berlin, Mitte', waitingResponse:'Waiting for reply…',
      sendFightRequest:'⚔️ SEND FIGHT REQUEST', fightSent:'FIGHT REQUEST SENT!',
      waitingFor:'Waiting for reply from', accept:'✅ ACCEPT', decline:'❌ DECLINE',
      counterDate:'🔄 COUNTER-OFFER', backToChat:'💬 BACK TO CHAT',
      fightAccepted:'FIGHT ACCEPTED', fightDeclined:'FIGHT DECLINED', counterTerm:'COUNTER-OFFER',
      // Ranking
      worldRanking:'WORLD RANKINGS', amateurs:'🏅 AMATEURS', pros:'🌍 PROS', trainer:'🎓 TRAINERS',
      all:'All', wins:'WINS', losses:'LOSSES', draws:'DRAWS', kos:'KOs',
      points:'Pts', winRate:'WIN RATE', fights:'fights total',
      rankFormula:'WIN +3 · DRAW +1 · LOSS -2',
      // Gyms
      findGyms:'FIND GYMS', cities:'🏙️ Cities', topGyms:'🏆 TOP GYMS',
      gymRanking:'🏆 GYM RANKING', sortedByRatings:'Sorted by ratings',
      rateThisGym:'RATE THIS GYM', notRatedYet:'Not rated yet · ',
      firstToRate:'Be the first!', myRating:'Your rating:', star:'star', stars:'stars',
      ratings:'rating', ratingsPlural:'s', members:'Members', founded:'Founded',
      contact:'CONTACT & ADDRESS', address:'ADDRESS', phone:'PHONE',
      website:'WEBSITE', fighterCode:'FIGHTER APP CODE', gymCode:'Ask your gym for this code → verify profile',
      openingHours:'OPENING HOURS', aboutGym:'ABOUT THE GYM',
      // Profile/Stats
      profileView:'PROFILE', editProfile:'EDIT PROFILE', changePhoto:'Change photo',
      editSave:'SAVE', fightRecordEdit:'EDIT RECORD', saveProfil:'Save profile',
      verifyRecord:'🏅 VERIFY FIGHT RECORD', verifyRecordSub:'Upload a photo of your certificate, medal or official fight result. Your record will then get a ✅ Verified badge.',
      verified:'RECORD VERIFIED', pending:'BEING REVIEWED', upTo48h:'Up to 48 hours',
      uploadProof:'Upload certificate / medal', maxSize:'JPG, PNG · max 5MB',
      gymVerify:'Verify gym membership', gymVerified2:'Gym verified ✅',
      gymCodeEnter:'Enter gym code → get badge',
      trainingHistory:'🤝 TRAINING HISTORY', trainingWith:'Who did you train with?',
      noHistory:'No training entries yet', historyHint:'Accept a Fight Request → saved here',
      public2:'Public', private2:'Private',
      // Settings
      settings:'SETTINGS', darkMode:'Dark Mode', impressum:'Imprint',
      privacy:'Privacy Policy', agb:'Terms', deleteAccount:'Delete account',
      changePw:'Change password', logout:'Log out',
      // Misc
      undone:'↩️ Undone!', photoUploading:'Uploading photo...',
      matchConfirmed:'Match confirmed!', writeFirst:'Write the first message',
      message:'Message…', send:'➤',
      block:'🚫 Block', unblock:'🚫 Unblock', report:'⚠️ Report', reported:'✓ Reported',
      trainingPublic:'Training history is now public 👁', trainingPrivate:'Training history is now private 🔒',
      profileLink:'Profile link copied! 📋',
      // Onboarding
      ob1title:'FIND YOUR OPPONENT', ob1sub:'Discover combat sports athletes near you — whether sparring, technical training or official fight.',
      ob2title:'MATCH & CHAT', ob2sub:'When both swipe right you have a match. Message each other, arrange training and build your record.',
      ob3title:'BUILD YOUR RECORD', ob3sub:'Training history, verified fight record, gym membership. Show the community who you are.',
      skip:'Skip', continueBtn:'CONTINUE →', startNow:'START NOW 🥊',
      // Interest banner
      interestBanner:'Fighters are interested in you',
      interestTitle:'INTEREST IN YOU', interestSub:'Fighters liked you',
      matchBtn:'⚔️ MATCH',
      // Gym verify
      gymVerifyTitle:'VERIFY GYM', gymVerifyConfirm:'Confirm your gym membership',
      howToCode:'💡 HOW DO I GET THE CODE?',
      howToCodeText:'Ask at your gym reception for the Fighter App Code. The 8-digit code (e.g. TGB-2847) will be given to you directly.',
      gymCodeLabel:'ENTER GYM CODE', verifyBtn:'✅ VERIFY', invalidCode:'Invalid code. Please ask your gym for the Fighter Code.',
      alreadyVerified:'✅ VERIFIED MEMBER', verifiedSince:'Since:', removeVerification:'Remove verification',
      // Gym register
      gymRegisterTitle:'REGISTER GYM', gymRegisterSub:'Your gym will be reviewed and added',
      gymName:'GYM NAME *', city2:'CITY *', gymAddress:'ADDRESS', fightStyleLabel:'FIGHTING STYLE',
      gymRegSentTitle:'REGISTRATION SENT!', gymRegSentSub:'We will review your gym and add it within 48h.',
      close:'CLOSE', registerGym:'➕ REGISTER',
      // Password change
      pwChangeTitle:'🔑 CHANGE PASSWORD', pwChangeSub:'At least 6 characters', newPw:'New password',
      pwSave:'SAVE', pwError:'At least 6 characters!', pwSuccess:'✅ Password changed!',
    }
  };
  T.FR = {
      // Navigation
      fight:'COMBAT', chat:'CHAT', rang:'CLASSEMENT', gyms:'SALLES', profil:'PROFIL',
      // Additional UI strings
      noOneLiked:"Personne ne vous a encore liké",
      keepSwiping:'Continuez à swiper — votre match arrive!',
      notifications:'Notifications',
      noEvents:'Aucun événement disponible',
      findEventsCity:'Trouvez des événements dans votre ville',
      deleteBtn:'🗑️ Supprimer',
      gymNotFound:'Aucune salle trouvée',
      gymBeingAdded:'Votre salle est en cours de vérification',
      myGymNotListed:"Ma salle n'est pas listée → inscrire",
      noReports:'Aucun signalement — ou appuyer sur "Charger"',
      noRequests:'Aucune demande en attente',
      noFeedbackYet:'Pas encore de feedback — appuyer sur Charger',
      weiterSwipen:'Continuer à swiper',
      // Auth
      login:'Connexion', register:"S'inscrire", email:'E-Mail', password:'Mot de passe (min. 6 car.)',
      loginBtn:'CONNEXION', registerBtn:"S'INSCRIRE", forgotPw:'Mot de passe oublié?',
      privacyAgree:"J'accepte la", agbAgree:"J'accepte les",
      pwReset:'RÉINITIALISATION', pwResetSub:'Nous vous enverrons un lien par e-mail.',
      sendLink:'ENVOYER', cancel:'Annuler',
      // Setup
      yourName:'Votre nom', age:'Âge', location:'Ville', photo:'PHOTO',
      photoRequired:'Télécharger une photo (obligatoire)', photoUploaded:'Photo téléchargée ✓',
      yourGym:'Votre salle', aboutYou:'À propos de vous', fightStyle:'Style de combat (plusieurs possibles)',
      height:'Taille (cm)', fightWeight:'Poids de combat (kg)', weightClass:'Catégorie de poids',
      chooseWeightClass:'Choisir une catégorie', fightRecord:'Palmarès (optionnel)',
      back:'Retour', next:'Suivant', letsGo:'Allons-y', saving:'Enregistrement…',
      // Swipe
      profileSeen:'Voir le profil', justNow:'🟢 En ligne', minAgo:'', min:'min',
      hoursAgo:'', hour:'h', daysAgo:'', day:'j', days:'', aWhileAgo:'⚪ Il y a longtemps',
      allFightersSeen:'TOUS LES', allFightersSeen2:'COMBATTANTS VUS',
      noFightersNearby:'Aucun combattant trouvé près de vous.',
      allFightersSwiped:'Tous les combattants vus! De nouveaux arrivent chaque jour.',
      newFighters:'🔄 NOUVEAUX', goToChats:'💬 CHATS',
      recentlySeen:'VUS RÉCEMMENT', fightRequests:'DEMANDES DE COMBAT',
      interestedIn:'Des combattants sont intéressés par vous',
      myCountry:'Mon Pays', worldwide:'Mondial',
      // Chat
      messages:'MESSAGES', matches:'Match', matchPlural:'s',
      noMatches:'PAS ENCORE DE MATCHS',
      noMatchesSub:'Swipez à droite sur les combattants que vous voulez défier!',
      swipeNow:'⚔️ SWIPER', newFightersDaily:'Nouveaux combattants chaque jour',
      noFighterFound:'Aucun combattant trouvé', noMatchesFor:'Pas de matchs pour',
      searchFighter:'Chercher un combattant...', chatBtn:'CHAT →',
      // Fight Request
      fightRequest:'DEMANDE DE COMBAT', fightType:'TYPE', date:'DATE', placeGym:'LIEU / SALLE',
      placePlaceholder:'ex: Tiger Gym Berlin', waitingResponse:'En attente de réponse…',
      sendFightRequest:'⚔️ ENVOYER LA DEMANDE', fightSent:'DEMANDE ENVOYÉE!',
      waitingFor:'En attente de', accept:'✅ ACCEPTER', decline:'❌ REFUSER',
      counterDate:'🔄 CONTRE-PROPOSITION', backToChat:'💬 RETOUR AU CHAT',
      fightAccepted:'COMBAT ACCEPTÉ', fightDeclined:'COMBAT REFUSÉ', counterTerm:'CONTRE-OFFRE',
      // Ranking
      worldRanking:'CLASSEMENT MONDIAL', amateurs:'🏅 AMATEURS', pros:'🌍 PROS', trainer:'🎓 ENTRAÎNEURS',
      all:'Tous', wins:'VICTOIRES', losses:'DÉFAITES', draws:'NULS', kos:'KOs',
      points:'Pts', winRate:'TAUX VICTOIRE', fights:'combats au total',
      rankFormula:'VICTOIRE +3 · NUL +1 · DÉFAITE -2',
      // Gyms
      findGyms:'TROUVER DES SALLES', cities:'🏙️ Villes', topGyms:'🏆 TOP SALLES',
      gymRanking:'🏆 CLASSEMENT SALLES', sortedByRatings:'Trié par notes',
      rateThisGym:'NOTER CETTE SALLE', notRatedYet:'Pas encore noté · ',
      firstToRate:'Soyez le premier!', myRating:'Votre note:', star:'étoile', stars:'étoiles',
      ratings:'note', ratingsPlural:'s', members:'Membres', founded:'Fondée',
      contact:'CONTACT & ADRESSE', address:'ADRESSE', phone:'TÉLÉPHONE',
      website:'SITE WEB', fighterCode:'CODE FIGHTER APP', gymCode:'Demander ce code à votre salle',
      openingHours:'HORAIRES', aboutGym:'À PROPOS DE LA SALLE',
      // Profile
      profileView:'PROFIL', editProfile:'MODIFIER LE PROFIL', changePhoto:'Changer la photo',
      editSave:'ENREGISTRER', fightRecordEdit:'MODIFIER LE PALMARÈS', saveProfil:'Enregistrer le profil',
      verifyRecord:'🏅 VÉRIFIER LE PALMARÈS', verifyRecordSub:"Téléchargez une photo de votre diplôme ou résultat officiel.",
      verified:'PALMARÈS VÉRIFIÉ', pending:'EN COURS DE VÉRIFICATION', upTo48h:"Jusqu'à 48 heures",
      uploadProof:'Télécharger diplôme / médaille', maxSize:'JPG, PNG · max 5Mo',
      gymVerify:"Vérifier l'adhésion à la salle", gymVerified2:'Salle vérifiée ✅',
      gymCodeEnter:'Entrer le code de la salle → obtenir le badge',
      trainingHistory:"🤝 HISTORIQUE D'ENTRAÎNEMENT", trainingWith:'Avec qui avez-vous entraîné?',
      noHistory:"Pas encore d'entrées", historyHint:'Acceptez une demande de combat → sauvegardé ici',
      public2:'Public', private2:'Privé',
      // Settings
      settings:'PARAMÈTRES', darkMode:'Mode Sombre', impressum:'Mentions légales',
      privacy:'Confidentialité', agb:'CGU', deleteAccount:'Supprimer le compte',
      changePw:'Changer le mot de passe', logout:'Déconnexion',
      // Misc
      undone:'↩️ Annulé!', photoUploading:'Téléchargement en cours...',
      matchConfirmed:'Match confirmé!', writeFirst:'Écrivez le premier message',
      message:'Message…', send:'➤',
      block:'🚫 Bloquer', unblock:'🚫 Débloquer', report:'⚠️ Signaler', reported:'✓ Signalé',
      trainingPublic:'Historique public 👁', trainingPrivate:'Historique privé 🔒',
      profileLink:'Lien de profil copié! 📋',
      // Onboarding
      ob1title:'TROUVEZ VOTRE ADVERSAIRE', ob1sub:"Découvrez des combattants près de vous pour le sparring, l'entraînement technique ou un combat officiel.",
      ob2title:'MATCH & CHAT', ob2sub:"Quand les deux swipent à droite, c'est un match. Écrivez-vous et organisez des entraînements.",
      ob3title:'CONSTRUISEZ VOTRE PALMARÈS', ob3sub:"Historique d'entraînement, palmarès vérifié, adhésion à la salle. Montrez qui vous êtes.",
      skip:'Passer', continueBtn:'SUIVANT →', startNow:'COMMENCER 🥊',
      interestBanner:"Des combattants s'intéressent à vous",
      interestTitle:'INTÉRÊT POUR VOUS', interestSub:'Des combattants vous ont liké',
      matchBtn:'⚔️ MATCH',
      gymVerifyTitle:'VÉRIFIER LA SALLE', gymVerifyConfirm:'Confirmez votre adhésion',
      howToCode:'💡 COMMENT OBTENIR LE CODE?',
      howToCodeText:'Demandez à la réception de votre salle le code Fighter App.',
      gymCodeLabel:'ENTRER LE CODE', verifyBtn:'✅ VÉRIFIER', invalidCode:'Code invalide.',
      alreadyVerified:'✅ MEMBRE VÉRIFIÉ', verifiedSince:'Depuis:', removeVerification:'Supprimer la vérification',
      gymRegisterTitle:'INSCRIRE UNE SALLE', gymRegisterSub:'Votre salle sera vérifiée et ajoutée',
      gymName:'NOM DE LA SALLE *', city2:'VILLE *', gymAddress:'ADRESSE', fightStyleLabel:'STYLE DE COMBAT',
      gymRegSentTitle:'INSCRIPTION ENVOYÉE!', gymRegSentSub:'Nous vérifierons votre salle dans les 48h.',
      close:'FERMER', registerGym:'➕ INSCRIRE',
      pwChangeTitle:'🔑 CHANGER LE MOT DE PASSE', pwChangeSub:'Au moins 6 caractères', newPw:'Nouveau mot de passe',
      pwSave:'ENREGISTRER', pwError:'Au moins 6 caractères!', pwSuccess:'✅ Mot de passe changé!',
    };

  const t = T[appLang]||T.DE;

  const [showFeedback,setShowFeedback]=useState(false);
  const [feedbackText,setFeedbackText]=useState('');
  const [feedbackSent,setFeedbackSent]=useState(false);
  const [events,setEvents]=useState([]);
  const [eventsLoading,setEventsLoading]=useState(false);
  const [showCreateEvent,setShowCreateEvent]=useState(false);
  const [eventParticipants,setEventParticipants]=useState({});
  const [newEvent,setNewEvent]=useState({title:'',description:'',event_type:'Sparring',city:'',address:'',event_date:'',event_time:'',max_participants:10,styles:[]});
  const [creatingEvent,setCreatingEvent]=useState(false);
  const [gymSuggestions,setGymSuggestions]=useState([]);
  const [showGymSuggestions,setShowGymSuggestions]=useState(false);
  const [showRegisterGym,setShowRegisterGym]=useState(false);
  const [newGymData,setNewGymData]=useState({name:'',city:'',address:'',style:''});
  const [gymRegSent,setGymRegSent]=useState(false);
  const ALL_GYMS_FLAT=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct})));
  const [darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem('fighter_dark')==='true'}catch{return false}});
  useEffect(()=>{
    document.body.classList.toggle('dark',darkMode);
    try{localStorage.setItem('fighter_dark',String(darkMode));}catch{}
  },[darkMode]);

  // Gyms neu laden wenn Gym Tab geöffnet wird
  useEffect(()=>{
    if(tab==='gyms'&&session){
      loadDbGyms(session);
    }
    if(tab==='events'&&session){
      loadEvents(session);
    }
  },[tab]);

  // Admin Änderungen sofort übernehmen — dbGyms reload nach Admin-Aktionen
  useEffect(()=>{
    if(!showAdmin&&session&&dbGyms.length===0){
      loadDbGyms(session);
    }
  },[showAdmin]);

  // Rangliste neu laden wenn Tab geöffnet wird
  useEffect(()=>{
    if(tab==='ranking'&&session){
      setRankingLoading(true);
      // Erst mit Session Token versuchen
      fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=2000',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      }).then(r=>r.json()).then(data=>{
        if(Array.isArray(data)){
          setAllProfiles(data);
          setRankingLoading(false);
        } else {
          return fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=2000',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
          }).then(r=>r.json()).then(d=>{
            if(Array.isArray(d))setAllProfiles(d);
            setRankingLoading(false);
          });
        }
      }).catch(()=>setRankingLoading(false));
    }
  },[tab]);
  useEffect(()=>{
    if(localStorage.getItem('fighter_dark')==='true')document.body.classList.add('dark');
  },[]);
  const [showImpressum,setShowImpressum]=useState(false);
  const [showDatenschutz,setShowDatenschutz]=useState(false);
  const [showPwChange,setShowPwChange]=useState(false);
  const [newPassword,setNewPassword]=useState('');
  const [pwChangeMsg,setPwChangeMsg]=useState('');
  const [showAGB,setShowAGB]=useState(false);
  const [rankMode,setRankMode]=useState('user');
  const [filterStyle,setFilterStyle]=useState('Alle');
  const [ageFilter,setAgeFilter]=useState({min:16,max:50});
  const [filterCity,setFilterCity]=useState('');
  const [filterWeightClass,setFilterWeightClass]=useState(true);
  const [chatSearch,setChatSearch]=useState('');

  useEffect(()=>{
    async function restoreSession(){
      // Schritt 1: localStorage lesen
      let saved=null;
      try{saved=localStorage.getItem('fighter_v5');}catch{
        setAuthReady(true);setScreen('auth');return;
      }
      if(!saved){setAuthReady(true);setScreen('auth');return;}

      let s=null;
      try{s=JSON.parse(saved);}catch{
        try{localStorage.removeItem('fighter_v5');}catch{}
        setAuthReady(true);setScreen('auth');return;
      }
      if(!s||!s.token||!s.userId){
        try{localStorage.removeItem('fighter_v5');}catch{}
        setAuthReady(true);setScreen('auth');return;
      }

      // Schritt 2: Token bei Supabase validieren — immer, kein Vertrauen auf Cache
      try{
        // Versuche Token zu refreshen
        if(s.refresh_token){
          const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
            body:JSON.stringify({refresh_token:s.refresh_token})
          });
          const data=await r.json();
          if(data.access_token){
            // Token gültig → Session erneuern
            s={...s,token:data.access_token,refresh_token:data.refresh_token||s.refresh_token};
            try{localStorage.setItem('fighter_v5',JSON.stringify(s));}catch{}
          }else{
            // Refresh fehlgeschlagen → Token abgelaufen → Login
            try{localStorage.removeItem('fighter_v5');}catch{}
            setAuthReady(true);setScreen('auth');return;
          }
        }else{
          // Kein Refresh Token → Token direkt validieren
          const check=await fetch(SUPA_URL+'/auth/v1/user',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+s.token}
          });
          if(!check.ok){
            try{localStorage.removeItem('fighter_v5');}catch{}
            setAuthReady(true);setScreen('auth');return;
          }
        }
      }catch{
        // Netzwerkfehler → trotzdem versuchen mit altem Token
        // (Offline-Fall — besser App zeigen als leere Seite)
      }

      // Schritt 3: Profil laden
      setSession(s);
      await initProfile(s);
    }

    const timeout=setTimeout(()=>{
      try{localStorage.removeItem('fighter_v5');}catch{}
      setAuthReady(true);
      setScreen('auth');
    },6000);
    restoreSession().finally(()=>clearTimeout(timeout));
  },[]);

  async function getGPSLocation(){
    if(!navigator.geolocation){showMsg('GPS nicht verfügbar');return;}
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async(pos)=>{
        const lat=pos.coords.latitude;
        const lon=pos.coords.longitude;
        setMyLat(lat);setMyLon(lon);setLocationSource('gps');
        // Reverse geocode to get city name
        try{
          const r=await fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json');
          const d=await r.json();
          const city=d.address?.city||d.address?.town||d.address?.village||d.address?.county||'';
          if(city)setProfile(p=>({...p,city}));
          // Save to DB
          if(session&&myProfile){
            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
              method:'PATCH',
              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
              body:JSON.stringify({lat,lon,location_source:'gps',city:city||myProfile.city||profile.city})
            });
          }
          showMsg((appLang==='FR'?'📍 Localisation sauvegardée':appLang==='EN'?'📍 Location saved':'📍 Standort gespeichert')+(city?' — '+city:'')+'!');
        }catch{
          showMsg(appLang==='FR'?'📍 Position GPS sauvegardée!':appLang==='EN'?'📍 GPS location saved!':'📍 GPS Standort gespeichert!');
          if(session&&myProfile){
            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
              method:'PATCH',
              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
              body:JSON.stringify({lat,lon,location_source:'gps'})
            });
          }
        }
        setLocationLoading(false);
      },
      (err)=>{
        if(err.code===1)showMsg('Standort-Zugriff verweigert');
        else showMsg((appLang==='FR'?'Erreur GPS: ':appLang==='EN'?'GPS error: ':'GPS-Fehler: ')+err.message);
        setLocationLoading(false);
      },
      {enableHighAccuracy:true,timeout:10000}
    );
  }

  async function rateGym(gymKey, stars){
    const newRatings={...gymRatings};
    if(!newRatings[gymKey])newRatings[gymKey]={total:0,count:0,userRating:0};
    const old=newRatings[gymKey].userRating||0;
    if(old>0){newRatings[gymKey].total-=old;newRatings[gymKey].count-=1;}
    newRatings[gymKey].total+=stars;
    newRatings[gymKey].count+=1;
    newRatings[gymKey].userRating=stars;
    setGymRatings(newRatings);
    localStorage.setItem('gymRatings',JSON.stringify(newRatings));
    showMsg((appLang==='FR'?'Note enregistrée! ':appLang==='EN'?'Rating saved! ':'Bewertung gespeichert! ')+('⭐'.repeat(stars)));
    // In Supabase speichern
    if(session){
      try{
        // Upsert: wenn bereits bewertet → update, sonst insert
        const existing=await dbSelect('gym_ratings','user_id=eq.'+session.userId+'&gym_key=eq.'+encodeURIComponent(gymKey),session.token);
        if(Array.isArray(existing)&&existing.length>0){
          await fetch(SUPA_URL+'/rest/v1/gym_ratings?id=eq.'+existing[0].id,{
            method:'PATCH',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
            body:JSON.stringify({stars,updated_at:new Date().toISOString()})
          });
        }else{
          await fetch(SUPA_URL+'/rest/v1/gym_ratings',{
            method:'POST',
            headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
            body:JSON.stringify({user_id:session.userId,gym_key:gymKey,stars})
          });
        }
      }catch(e){console.error('rateGym Supabase error',e);}
      // Reload from DB to sync all ratings
      setTimeout(()=>loadGymRatings(session),500);
    }
  }

  function showMsg(text){setMsg(text);setTimeout(()=>setMsg(''),3000);}

  async function initProfile(s){
    try{
      const data=await dbSelect('profiles','user_id=eq.'+s.userId+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height,bio,record_verified,history_public,banned,social_url',s.token);
      if(Array.isArray(data)&&data[0]){
        const p=data[0];
        if(p.banned===true){
          try{localStorage.removeItem('fighter_v5');}catch{}
          setSession(null);
          setAuthReady(true);
          alert('Dein Account wurde gesperrt. Kontakt: support@fighterapp.de');
          return;
        }
        setMyProfile(p);
        setProfile({name:p.name||'',age:p.age||'',city:p.city||'',gym:p.gym||'',height:p.height||'',weight:p.weight||'',weightClass:p.weight_class||'',style:p.style||'',bio:p.bio||'',isPro:p.is_pro===true,country:p.country||'DE',gender:p.gender||'male',socialUrl:p.social_url||''});
        if(p.lat&&p.lon){setMyLat(p.lat);setMyLon(p.lon);setLocationSource(p.location_source||'gps');}
        setStats({wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0});
        if(p.avatar_url){setAvatarUrl(p.avatar_url);setAvatarPreview(p.avatar_url);}
        setAuthReady(true);
        setScreen('main');
        // Push Permission anfragen (nach kurzer Verzögerung)
        setTimeout(()=>requestPushPermission(),2000);
        // last_seen updaten
        try{fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+s.userId,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+s.token,Prefer:'return=minimal'},body:JSON.stringify({last_seen:new Date().toISOString()})});}catch{}
        loadRealFighters(s,p,true);
        loadMatches(s,p);
        loadGymRatings(s);
        loadFightHistory(s);
        loadDbGyms(s);
        loadWhoLikedMe(s,p);
        loadAllProfiles(s);
        loadAdminMessages(s);
        // Standort: GPS falls bereits gespeichert, sonst IP
        if(p.lat&&p.lon){
          setMyLat(p.lat);setMyLon(p.lon);
          setLocationSource(p.location_source||'gps');
        }else{
          // IP-basiert automatisch im Hintergrund
          getLocationByIP().then(loc=>{
            if(loc){
              setMyLat(loc.lat);setMyLon(loc.lon);
              setLocationSource('ip');
              // Stadt auch setzen falls noch leer
              if(!p.city&&loc.city){
                setProfile(prev=>({...prev,city:loc.city}));
              }
            }
          });
        }
      }else{
        setAuthReady(true);
        setScreen('setup');
      }
    }catch{
      setAuthReady(true);
      setScreen('auth');
    }
  }

  async function requestPushPermission(){
    if(!('Notification' in window))return;
    if(Notification.permission==='default'){
      const perm=await Notification.requestPermission();
      if(perm==='granted')showMsg(appLang==='FR'?'🔔 Notifications activées!':appLang==='EN'?'🔔 Notifications enabled!':'🔔 Benachrichtigungen aktiviert!');
    }
  }

  function sendLocalNotification(title,body){
    if(Notification.permission==='granted'){
      new Notification(title,{body,icon:'/icons/icon-192.png',badge:'/icons/icon-72.png'});
    }
  }

  // Rangliste Profile nachladen — KEINE Karten-Reload
  useEffect(()=>{
    if(!session||!myProfile)return;
    const interval=setInterval(async()=>{
      await loadAllProfiles(session);
    },120000); // alle 2 Minuten
    return()=>clearInterval(interval);
  },[session?.userId,myProfile?.id]);

  async function loadAdminMessages(s){
    try{
      const resp=await fetch(SUPA_URL+'/rest/v1/admin_messages?user_id=eq.'+s.userId+'&order=created_at.desc&limit=20',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+s.token}
      });
      const data=await resp.json();
      if(Array.isArray(data)&&data.length>0){
        setAdminMessages(data);
        const unread=data.filter(m=>!m.read);
        if(unread.length>0){
          setShowAdminMsg(true);
          sendLocalNotification('📢 Nachricht vom Fighter Team','Du hast '+unread.length+' neue Nachricht(en)');
        }
      }
    }catch{}
  }

  async function loadAllProfiles(s){
    try{
      const token=s?.token||session?.token;
      const resp=await fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=2000',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
      });
      const data=await resp.json();
      if(Array.isArray(data)){
        setAllProfiles(data);
      }else{
        // Fallback mit anon key
        try{
          const r2=await fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=500',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
          });
          const d2=await r2.json();
          if(Array.isArray(d2))setAllProfiles(d2);
        }catch{}
      }
    }catch(e){console.log('loadAllProfiles Fehler:',e);}
  }

  async function loadWhoLikedMe(s,myP){
    try{
      // Alle die mich geliket haben
      const likes=await dbSelect('swipes','target_id=eq.'+myP.id+'&direction=eq.like',s.token);
      if(!Array.isArray(likes)||likes.length===0){setWhoLikedMe([]);return;}
      // Meine eigenen Swipes laden — damit ich weiss wen ich schon geliket habe
      const mySwipes=await dbSelect('swipes','swiper_id=eq.'+myP.id,s.token);
      const iAlreadyLiked=new Set(Array.isArray(mySwipes)?mySwipes.filter(x=>x.direction==='like').map(x=>x.target_id):[]);
      // Profile dazu laden
      const ids=likes.map(l=>l.swiper_id);
      const profiles=await dbSelect('profiles','id=in.('+ids.join(',')+')'+'&banned=neq.true&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height,bio,record_verified,history_public,banned,social_url',s.token);
      if(!Array.isArray(profiles))return;
      // Bereits gematchte UND bereits von mir gelikte rausfiltern
      const matchedIds=new Set(dbMatches.map(m=>m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id));
      // Alle meine Swipes (egal ob like oder pass) — wer bereits von mir gesehen wurde, raus
      const iAlreadySwiped=new Set(Array.isArray(mySwipes)?mySwipes.map(x=>x.target_id):[]);
      // Nur zeigen: hat mich geliket, ich hab sie NOCH NIE geswiped, kein Match
      const notYetMatched=profiles.filter(p=>
        !matchedIds.has(p.id)&&
        !iAlreadySwiped.has(p.id)&&
        p.id!==myP.id
      );
      setWhoLikedMe(notYetMatched);
      // Neue Likes seit letztem Check
      const newLikes=likes.filter(l=>l.created_at&&l.created_at>lastLikesCheck&&!iAlreadyLiked.has(l.swiper_id)&&!matchedIds.has(l.swiper_id));
      if(newLikes.length>0){
        setNewLikesCount(newLikes.length);
        setLikesBannerSeen(''); // Banner wieder zeigen bei neuen Likes
        try{localStorage.removeItem('fighter_banner_seen');}catch{}
        sendLocalNotification('🥊 '+newLikes.length+' neue Fighter interessieren sich für dich!','Schau nach wer dich geliket hat');
      }
    }catch{}
  }

  // IDs die in dieser Session bereits geswiped wurden — verhindert Karten-Reset bei Reload
  const sessionSwipedRef=React.useRef(new Set());

  async function loadRealFighters(s,myP,isInitial=false){
    try{
      let all = await dbSelect('profiles','user_id=neq.'+s.userId+'&banned=neq.true&order=created_at.desc&limit=2000&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height',s.token);
      if(!Array.isArray(all)||all.length===0){
        try{
          const r=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=neq.'+s.userId+'&banned=neq.true&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
          all=await r.json();
        }catch{}
      }
      if(!Array.isArray(all))return;
      // Alle Swipes aus DB laden
      const swiped=await dbSelect('swipes','swiper_id=eq.'+myP.id,s.token);
      const swipedIds=new Set(Array.isArray(swiped)?swiped.map(x=>x.target_id):[]);
      // Session-Swipes auch rausfiltern (sofortige Reaktion ohne DB-Runde)
      sessionSwipedRef.current.forEach(id=>swipedIds.add(id));
      // Matches filtern
      const matchedIds=new Set(dbMatches.map(m=>m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id));
      const blockedSet=new Set(blockedUsers||[]);
      const fresh=all.filter(f=>
        f.id&&
        f.name&&f.name.trim()&&  // muss einen Namen haben
        f.avatar_url&&           // muss ein Profilbild haben
        (f.style||'').trim()&&   // muss einen Kampfstil haben
        !swipedIds.has(f.id)&&
        !matchedIds.has(f.id)&&
        !blockedSet.has(f.id)&&
        !f.banned&&
        f.id!==myP.id
      );
      setCards(prev=>{
        if(isInitial||prev.length===0)return fresh;
        // Bei Hintergrund-Reload: nur wirklich neue Profile hinzufügen
        // Bestehende Karten NIEMALS überschreiben
        const existingIds=new Set(prev.map(c=>c.id));
        const brandNew=fresh.filter(f=>!existingIds.has(f.id)&&!swipedIds.has(f.id));
        if(brandNew.length===0)return prev;
        return [...prev,...brandNew];
      });
    }catch{}
  }

  function getLastSeen(dateStr){
    if(!dateStr)return null;
    const diff=Date.now()-new Date(dateStr).getTime();
    const min=Math.floor(diff/60000);
    const h=Math.floor(min/60);
    const d=Math.floor(h/24);
    const isFR=appLang==='FR', isEN=appLang==='EN';
    if(min<2)return isFR?'🟢 En ligne':isEN?'🟢 Online now':'🟢 Gerade online';
    if(min<60)return isFR?'🟡 Il y a '+min+' min':isEN?'🟡 '+min+' min ago':'🟡 Vor '+min+' Min';
    if(h<24)return isFR?'⚪ Il y a '+h+'h':isEN?'⚪ '+h+'h ago':'⚪ Vor '+h+' Std';
    if(d<7)return isFR?'⚪ Il y a '+d+'j':isEN?'⚪ '+d+'d ago':'⚪ Vor '+d+' Tag'+(d>1?'en':'');
    return isFR?'⚪ Il y a longtemps':isEN?'⚪ A while ago':'⚪ Vor einer Weile';
  }

  async function loadGymLogos(){
    try{
      const r=await fetch(SUPA_URL+'/rest/v1/gym_logos?select=gym_code,logo_url,verified',{
        headers:{apikey:SUPA_KEY}
      });
      const data=await r.json();
      if(Array.isArray(data)){
        const map={};
        data.forEach(g=>{if(g.gym_code)map[g.gym_code]=g;});
        setGymLogos(map);
      }
    }catch{}
  }

  async function loadFightHistory(s){
    try{
      // history_public Status aus Profil laden
      const profileData=await dbSelect('profiles','id=eq.'+s.userId+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,gender,wins,losses,draws,ko,last_seen,lat,lon,weight,height,bio,record_verified,history_public,banned,social_url',s.token);
      if(Array.isArray(profileData)&&profileData[0]){
        const hp=profileData[0].history_public===true;
        setHistoryPublic(hp);
        try{localStorage.setItem('fighter_history_public',String(hp));}catch{}
      }
      const data=await dbSelect('fight_history','user_id=eq.'+s.userId+'&order=created_at.desc',s.token);
      if(Array.isArray(data)){
        setFightHistory(data);
        localStorage.setItem('fighter_history',JSON.stringify(data));
      }
    }catch(e){console.error('loadFightHistory',e);}
  }

  async function loadDbGyms(s){
    try{
      const token=(s?.token)||session?.token;
      // Versuche mit Session Token
      let resp=await fetch(SUPA_URL+'/rest/v1/gyms?order=city.asc,name.asc',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+(token||SUPA_KEY)}
      });
      let data=await resp.json();
      // Falls Fehler — versuche ohne Auth
      if(!Array.isArray(data)){
        resp=await fetch(SUPA_URL+'/rest/v1/gyms?order=city.asc,name.asc',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
        });
        data=await resp.json();
      }
      if(Array.isArray(data)){
        setDbGyms(data.map(g=>({...g,city:(g.city||'').trim(),name:(g.name||'').trim()})));
        // Erste Stadt setzen falls noch Berlin
        if(data.length>0){
          setCity(c=>{
            const norm=s=>(s||'').toLowerCase().trim();
            const hasBerlin=data.some(g=>norm(g.city)==='berlin');
            return (c==='Berlin'&&!hasBerlin)?data[0].city:c;
          });
        }
      }
    }catch(e){console.log('loadDbGyms error',e);}
  }

  async function loadEvents(s){
    setEventsLoading(true);
    try{
      // Erst mit User-Token, falls RLS blockiert mit anon key versuchen
      let data=await dbSelect('events','order=event_date.asc,event_time.asc',s?.token||session?.token);
      if(!Array.isArray(data)||data.error){
        const r=await fetch(SUPA_URL+'/rest/v1/events?order=event_date.asc,event_time.asc',{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
        });
        data=await r.json();
      }
      if(Array.isArray(data)){
        // Load participants count for each event
        const parts={};
        await Promise.all(data.map(async ev=>{
          try{
            const p=await dbSelect('event_participants','event_id=eq.'+ev.id+'&select=*,profiles(name,avatar_url)',s?.token||session?.token);
            parts[ev.id]=Array.isArray(p)?p:[];
          }catch{parts[ev.id]=[];}
        }));
        setEventParticipants(parts);
        setEvents(data);
      }
    }catch(e){console.error('loadEvents',e);}
    setEventsLoading(false);
  }

  async function joinEvent(eventId){
    if(!session||!myProfile)return;
    try{
      await fetch(SUPA_URL+'/rest/v1/event_participants',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({event_id:eventId,user_id:myProfile.id})
      });
      await loadEvents(session);
      showMsg('Du nimmst teil! 🥊');
    }catch(e){showMsg('Fehler: '+e.message);}
  }

  async function leaveEvent(eventId){
    if(!session||!myProfile)return;
    try{
      await fetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+eventId+'&user_id=eq.'+myProfile.id,{
        method:'DELETE',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
      await loadEvents(session);
      showMsg('Abgemeldet');
    }catch(e){showMsg('Fehler: '+e.message);}
  }

  async function createEvent(){
    if(!session||!myProfile)return;
    if(!newEvent.title||!newEvent.city||!newEvent.event_date){showMsg('Titel, Stadt und Datum sind Pflicht');return;}
    setCreatingEvent(true);
    try{
      await fetch(SUPA_URL+'/rest/v1/events',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({
          creator_id:myProfile.id,
          title:newEvent.title,
          description:newEvent.description,
          event_type:newEvent.event_type,
          city:newEvent.city,
          address:newEvent.address,
          event_date:newEvent.event_date,
          event_time:newEvent.event_time,
          max_participants:parseInt(newEvent.max_participants)||10,
          styles:newEvent.styles
        })
      });
      setShowCreateEvent(false);
      setNewEvent({title:'',description:'',event_type:'Sparring',city:'',address:'',event_date:'',event_time:'',max_participants:10,styles:[]});
      await loadEvents(session);
      showMsg('Event erstellt! 🎉');
    }catch(e){showMsg('Fehler: '+e.message);}
    setCreatingEvent(false);
  }

  async function loadGymRatings(s){
    try{
      const data=await dbSelect('gym_ratings','user_id=eq.'+s.userId,s.token);
      if(Array.isArray(data)&&data.length>0){
        const merged={...gymRatings};
        data.forEach(r=>{
          const k=r.gym_key;
          if(!merged[k])merged[k]={total:0,count:0,userRating:0};
          merged[k].userRating=r.stars;
          // Recalculate total/count from all ratings
        });
        // Load all ratings for avg calculation
        const allRatings=await dbSelect('gym_ratings','',s.token);
        const gymTotals={};
        if(Array.isArray(allRatings)){
          allRatings.forEach(r=>{
            if(!gymTotals[r.gym_key])gymTotals[r.gym_key]={total:0,count:0};
            gymTotals[r.gym_key].total+=r.stars;
            gymTotals[r.gym_key].count+=1;
          });
        }
        const final={};
        Object.keys(gymTotals).forEach(k=>{
          const myR=data.find(r=>r.gym_key===k);
          final[k]={
            total:gymTotals[k].total,
            count:gymTotals[k].count,
            userRating:myR?myR.stars:0
          };
        });
        setGymRatings(final);
        localStorage.setItem('gymRatings',JSON.stringify(final));
      }
    }catch(e){console.error('loadGymRatings',e);}
  }

  async function loadMatches(s,myP){
    setMatchesLoading(true);
    try{
      const m=await dbSelect('matches','or=(profile_a_id.eq.'+myP.id+',profile_b_id.eq.'+myP.id+')',s.token);
      if(!Array.isArray(m)||m.length===0){setDbMatches([]);return;}
      // Load profiles only for matched users
      const matchIds=[...new Set(m.flatMap(x=>[x.profile_a_id,x.profile_b_id]))].filter(Boolean);
      const matchProfiles=matchIds.length>0?await dbSelect('profiles','id=in.('+matchIds.join(',')+')'+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,wins,losses,draws,ko',s.token):[];
      // Fallback mit anon key falls Session-Token RLS blockiert
      let profilesArr=Array.isArray(matchProfiles)?matchProfiles:[];
      if(profilesArr.length===0&&matchIds.length>0){
        try{
          const fb=await fetch(SUPA_URL+'/rest/v1/profiles?id=in.('+matchIds.join(',')+')'+'&select=id,user_id,name,age,city,gym,style,avatar_url,weight_class,is_pro,country,wins,losses,draws,ko',{
            headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
          });
          const fbData=await fb.json();
          if(Array.isArray(fbData))profilesArr=fbData;
        }catch{}
      }
      const profileMap={};
      profilesArr.forEach(p=>{if(p&&p.id)profileMap[p.id]=p;});
      // Letzte Nachricht pro Match laden
      const enrichedRaw=m.map(match=>({
        ...match,
        profile_a:profileMap[match.profile_a_id]||null,
        profile_b:profileMap[match.profile_b_id]||null,
        last_message_at:match.created_at,
        last_message_text:''
      }));
      // Letzte Nachrichten parallel laden
      const withMessages=await Promise.all(enrichedRaw.map(async match=>{
        try{
          const msgs=await dbSelect('messages','match_id=eq.'+match.id+'&order=created_at.desc&limit=1',s.token);
          if(Array.isArray(msgs)&&msgs.length>0){
            return{...match,last_message_at:msgs[0].created_at,last_message_text:msgs[0].content||''};
          }
        }catch{}
        return match;
      }));
      // Nach neuester Nachricht sortieren
      const sorted=withMessages.filter(x=>x&&x.id).sort((a,b)=>{try{return new Date(b.last_message_at||0)-new Date(a.last_message_at||0);}catch{return 0;}});
      setDbMatches(sorted);
      // Ungelesene zählen
      const unread=sorted.filter(m=>m.last_message_at&&m.last_message_at>( localStorage.getItem('fighter_last_read_'+m.id)||'2000-01-01')).length;
      setUnreadCount(unread);
    }catch(e){console.error('loadMatches error',e);}
    finally{setMatchesLoading(false);}
  }

  // Profile-Polling entfernt — zu langsam, nicht nötig

  // Zurück-Button abfangen
  useEffect(()=>{
    const onPop=()=>{
      if(activeChat){setActiveChat(null);return;}
      if(viewProfile){setViewProfile(null);return;}
      if(viewGym){setViewGym(null);return;}
      if(showAdmin){setShowAdmin(false);return;}
      if(showImpressum){setShowImpressum(false);return;}
      if(showDatenschutz){setShowDatenschutz(false);return;}
      if(showAGB){setShowAGB(false);return;}
      if(showGymVerify){setShowGymVerify(false);return;}
      // Nichts zu schließen — bleib in der App
      window.history.pushState(null,'',window.location.href);
    };
    window.history.pushState(null,'',window.location.href);
    window.addEventListener('popstate',onPop);
    return()=>window.removeEventListener('popstate',onPop);
  },[activeChat,viewProfile,viewGym,showAdmin,showImpressum,showDatenschutz,showAGB,showGymVerify]);

  function handleSession(s){
    const sessionData={token:s.token,userId:s.userId,refresh_token:s.refresh_token,expires_at:Date.now()+(3600*1000)};
    setSession(sessionData);
    try{localStorage.setItem('fighter_v5',JSON.stringify(sessionData));}catch{}
    initProfile(sessionData);
  }

  async function refreshSession(s){
    try{
      const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      const data=await r.json();
      if(data.access_token){
        const newS={...s,token:data.access_token,refresh_token:data.refresh_token};
        setSession(newS);localStorage.setItem('fighter_v5',JSON.stringify(newS));
      }
    }catch{}
  }

  async function handleLogout(){
    if(session)await authSignOut(session.token);
    localStorage.removeItem('fighter_v5');
    setSession(null);setMyProfile(null);setProfile({name:'',age:'',city:'',gym:'',height:'',weight:'',weightClass:'',style:'',bio:''});setStats({wins:0,losses:0,draws:0,ko:0});setAvatarUrl('');setAvatarPreview('');setAuthReady(true);setScreen('auth');
  }

  async function saveEditProfile(){
    if(!session||!myProfile)return;
    setSavingEdit(true);
    try{
      await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
        body:JSON.stringify({
          name:editProfile.name||profile.name,
          city:editProfile.city||profile.city,
          gym:editProfile.gym||profile.gym,
          bio:editProfile.bio!==undefined?editProfile.bio:profile.bio,
          style:editProfile.style||profile.style,
          weight_class:editProfile.weightClass||profile.weightClass,
          height:editProfile.height||profile.height,
          weight:editProfile.weight||profile.weight,
          is_pro:editProfile.isPro!==undefined?editProfile.isPro:profile.isPro,
          country:editProfile.country||profile.country||'DE',
          gender:editProfile.gender||profile.gender||'male',
        })
      });
      setProfile(p=>({...p,...editProfile}));
      setMyProfile(mp=>({...mp,...editProfile,
        name:editProfile.name||mp.name,
        city:editProfile.city||mp.city,
        gym:editProfile.gym||mp.gym,
        bio:editProfile.bio!==undefined?editProfile.bio:mp.bio,
      }));
      setEditMode(false);
      showMsg(appLang==='FR'?'Profil enregistré ✓':appLang==='EN'?'Profile saved ✓':'Profil gespeichert ✓');
    }catch(e){showMsg(appLang==='FR'?'Erreur lors de la sauvegarde':appLang==='EN'?'Error saving':'Fehler beim Speichern');}
    setSavingEdit(false);
  }

  async function saveProfile(){
    if(!session)return;
    setSaving(true);
    // Falls Foto nur als Preview vorhanden aber noch nicht hochgeladen → jetzt hochladen
    let finalAvatarUrl = avatarUrl;
    if(avatarPreview&&!avatarUrl){
      try{
        const blob=await (await fetch(avatarPreview)).blob();
        const ext=blob.type.includes('png')?'png':'jpg';
        const path='avatars/'+session.userId+'.'+ext;
        const upRes=await fetch(SUPA_URL+'/storage/v1/object/'+path,{
          method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token,'Content-Type':blob.type,'x-upsert':'true'},body:blob
        });
        if(upRes.ok){
          finalAvatarUrl=SUPA_URL+'/storage/v1/object/public/'+path+'?t='+Date.now();
          setAvatarUrl(finalAvatarUrl);
        }
      }catch(e){console.error('avatar upload error',e);}
    }
    // Build profile data — only include columns that definitely exist
    const d={
      user_id:session.userId,
      name:profile.name,
      age:parseInt(profile.age)||null,
      city:profile.city,
      gym:profile.gym||null,
      height:parseInt(profile.height)||null,
      weight:parseInt(profile.weight)||null,
      weight_class:profile.weightClass||null,
      style:profile.style,
      bio:profile.bio||null,
      wins:parseInt(stats.wins)||0,
      losses:parseInt(stats.losses)||0,
      draws:parseInt(stats.draws)||0,
      ko:parseInt(stats.ko)||0,
      avatar_url:finalAvatarUrl||null,
      is_pro:profile.isPro===true,
      country:profile.country||'DE',
      gender:profile.gender||'male',
    };
    // Add optional columns only if they exist
    try{if(myLat)d.lat=myLat;}catch{}
    try{if(myLon)d.lon=myLon;}catch{}
    try{if(locationSource)d.location_source=locationSource;}catch{}
    try{if(profile.socialUrl)d.social_url=profile.socialUrl;}catch{}
    try{
      if(myProfile){
        const res=await dbUpdate('profiles',d,'user_id=eq.'+session.userId,session.token);
        if(Array.isArray(res)&&res[0])setMyProfile(res[0]);
        showMsg('Gespeichert! ✓');
      }else{
        // Upsert: falls Profil bereits existiert (doppelter user_id), updaten statt Fehler
        console.log('saveProfile: starting upsert for',session.userId);
        const upsertRes=await fetch(SUPA_URL+'/rest/v1/profiles',{
          method:'POST',
          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=representation,resolution=merge-duplicates'},
          body:JSON.stringify(d)
        });
        const res=await upsertRes.json();
        const profile_data=Array.isArray(res)?res[0]:null;
        if(profile_data&&profile_data.id){
          setMyProfile(profile_data);
          showMsg(appLang==='FR'?'Profil créé! 🥊':appLang==='EN'?'Profile created! 🥊':'Profil erstellt! 🥊');
          setScreen('main');
          loadRealFighters(session,profile_data,true);
          loadMatches(session,profile_data);
          loadGymRatings(session);
          loadFightHistory(session);
          loadDbGyms(session);
          loadWhoLikedMe(session,profile_data);
          loadAllProfiles(session);
        }else{
          // Fallback: try to load existing profile
          try{
            const existing=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=eq.'+session.userId,{
              headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
            });
            const ep=await existing.json();
            if(Array.isArray(ep)&&ep[0]){
              setMyProfile(ep[0]);
              setScreen('main');
              loadRealFighters(session,ep[0],true);
              loadMatches(session,ep[0]);
              loadGymRatings(session);loadFightHistory(session);loadDbGyms(session);loadWhoLikedMe(session,ep[0]);loadAllProfiles(session);
            }else{
              showMsg('Fehler: '+(JSON.stringify(res)||'?'));
            }
          }catch{showMsg('Netzwerkfehler');}
        }
      }
    }catch(e){showMsg('Fehler: '+e.message);}
    setSaving(false);
  }

  async function compressImage(file,maxSize=800,quality=0.8){
    return new Promise(resolve=>{
      const img=new window.Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>maxSize||h>maxSize){
          if(w>h){h=Math.round(h*(maxSize/w));w=maxSize;}
          else{w=Math.round(w*(maxSize/h));h=maxSize;}
        }
        const canvas=document.createElement('canvas');
        canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,w,h);
        canvas.toBlob(blob=>{
          URL.revokeObjectURL(url);
          resolve(blob||file);
        },'image/jpeg',quality);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
      img.src=url;
    });
  }

  async function handlePhoto(e){
    const file=e.target.files[0];if(!file||!session)return;
    setUploading(true);
    setAvatarPreview(URL.createObjectURL(file));
    showMsg('Foto wird komprimiert...');
    try{
      const compressed=await compressImage(file,800,0.82);
      const sizeMB=(compressed.size/1024/1024).toFixed(1);
      const path='fighter_'+session.userId+'_'+Date.now()+'.jpg';
      const url=await uploadPhoto(compressed,path,session.token);
      if(url){setAvatarUrl(url);showMsg('Foto hochgeladen! ('+sizeMB+'MB)');}
      else showMsg('Upload fehlgeschlagen');
    }catch{showMsg('Upload fehlgeschlagen');}
    setUploading(false);
    // dummy
  }

  const myWeightClass=myProfile?.weight_class||profile?.weightClass||'';
  const myCity=myProfile?.city||profile?.city||'';
  const myBundesland=getBundesland(myCity);

  // Smart Matching — erst gleiche Stadt + Klasse, dann Bundesland, dann alle
  // SMART MATCHING — Priorität: 1=Stil+Stadt, 2=Stil+Region, 3=Stil+Land, 4=Stil, 5=Stadt, 6=Region, 7=alle
  const myStyles=(profile.style||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  function sameStyle(f){
    if(!myStyles.length)return true;
    const fStyles=(f.style||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    return fStyles.some(s=>myStyles.includes(s));
  }

  function relatedStyle(f){
    if(sameStyle(f))return false; // gleicher Stil ist schon abgedeckt
    if(!myStyles.length)return false;
    // Stil-Gruppen: verwandte Kampfsportarten
    const GROUPS=[
      ['boxing','kickboxing','muay thai','savate'],           // Striking
      ['bjj','grappling','wrestling','judo','sambo'],         // Grappling/Ground
      ['mma','boxing','kickboxing','muay thai','bjj','grappling','wrestling','judo','sambo'], // MMA = alles verwandt
      ['karate','taekwondo','kung fu','kickboxing'],          // Traditionell/Treten
    ];
    const fStyles=(f.style||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    return GROUPS.some(group=>
      myStyles.some(ms=>group.includes(ms)) &&
      fStyles.some(fs=>group.includes(fs))
    );
  }
  function sameGender(f){
    if(!profile.gender||profile.gender==='other')return true;
    if(!f.gender||f.gender==='other')return true;
    return f.gender===profile.gender;
  }
  // ── PERFEKTIONIERTES MATCHING SYSTEM ──
  const myIsPro=myProfile?.is_pro===true||profile.isPro===true;
  const myWC=(myProfile?.weight_class||profile.weightClass||'').split(' (')[0].trim();

  const filteredCards=cards
    .filter(f=>!blockedUsers.includes(f.id))
    .filter(f=>!f.banned)
    // Stil-Filter (wenn manuell gesetzt)
    .filter(f=>filterStyle==='Alle'||!f.style||(f.style||'').includes(filterStyle))
    .filter(f=>{
      if(!f.age)return true; // kein Alter angegeben = immer zeigen
      const age=parseInt(f.age)||0;
      return age>=ageFilter.min&&age<=ageFilter.max;
    })
    // Land-Filter
    .filter(f=>{
      if(countryFilter==='world')return true;
      if(!f.country||f.country==='OTHER')return true;
      return f.country===(profile.country||myProfile?.country||'DE');
    })
    .map(f=>{
      // ── DISTANZ ──
      // GPS wenn beide haben, sonst Koordinaten-Tabelle, sonst Städte-Name
      const dist=(myLat&&myLon&&f.lat&&f.lon)
        ?getDistanceKmCoords(myLat,myLon,f.lat,f.lon)
        :getDistanceKm(myCity,f.city||'');

      // ── ÜBEREINSTIMMUNGS-FLAGS ──
      const hasGPS=myLat&&myLon&&f.lat&&f.lon;
      const sameCityBool=hasGPS?dist<=15:((f.city||'').toLowerCase().trim()===(myCity||'').toLowerCase().trim()&&myCity!=='');
      const nearbyBool=hasGPS?dist<=30:sameCityBool;
      const sameRegionBool=hasGPS?dist<=80:getBundesland(f.city||'')===myBundesland&&!!myBundesland;
      const sameCountryBool=hasGPS?dist<=600:(!f.country||!profile.country||f.country===(profile.country||myProfile?.country||'DE')||f.country==='OTHER');
      const sameStyleBool=sameStyle(f);
      const sameGenderBool=sameGender(f);
      const fWC=(f.weight_class||'').split(' (')[0].trim();
      const sameWCBool=!!myWC&&!!fWC&&myWC===fWC;
      const sameProBool=!!(f.is_pro===true)===myIsPro; // beide Pro oder beide Amateur

      // ── SCORE SYSTEM (niedriger = besser) ──
      const relatedStyleBool=relatedStyle(f);

      let score;
      // STUFE 1: Gleiche Sportart + Stadt
      if(sameStyleBool&&sameCityBool)             score=1;
      // STUFE 2: Verwandte Sportart + Stadt
      else if(relatedStyleBool&&sameCityBool)     score=2;
      // STUFE 3: Gleiche Sportart + Nähe (<30km)
      else if(sameStyleBool&&nearbyBool)          score=3;
      // STUFE 4: Verwandte Sportart + Nähe
      else if(relatedStyleBool&&nearbyBool)       score=4;
      // STUFE 5: Gleiche Sportart + Region
      else if(sameStyleBool&&sameRegionBool)      score=5;
      // STUFE 6: Verwandte Sportart + Region
      else if(relatedStyleBool&&sameRegionBool)   score=6;
      // STUFE 7: Gleiche Sportart + Land
      else if(sameStyleBool&&sameCountryBool)     score=7;
      // STUFE 8: Verwandte Sportart + Land
      else if(relatedStyleBool&&sameCountryBool)  score=8;
      // STUFE 9: Nur gleiche Sportart (anderes Land)
      else if(sameStyleBool)                      score=9;
      // STUFE 10: Nur verwandte Sportart
      else if(relatedStyleBool)                   score=10;
      // STUFE 11: Gleiche Stadt, andere Sportart
      else if(sameCityBool)                       score=11;
      // STUFE 12: Gleiche Region
      else if(sameRegionBool)                     score=12;
      // STUFE 13: Gleiches Land
      else if(sameCountryBool)                    score=13;
      // STUFE 14: Rest (andere Länder, unbekannte Stile)
      else                                        score=14;

      // ── BONUS-PUNKTE (verbessern Score) ──
      // Gewicht-Kompatibilität (wichtigster Bonus für echte Kämpfe)
      const myWeight=parseInt(myProfile?.weight||profile?.weight||0);
      const fWeight=parseInt(f.weight||0);
      const weightDiff=myWeight&&fWeight?Math.abs(myWeight-fWeight):999;
      if(weightDiff<=3)       score-=0.5;  // fast gleich (±3kg) — ideal
      else if(weightDiff<=7)  score-=0.35; // sehr nah (±7kg)
      else if(weightDiff<=12) score-=0.2;  // nah (±12kg)
      else if(weightDiff<=20) score-=0.05; // noch ok (±20kg)
      // Gleiche Gewichtsklasse (zusätzlich zum Gewicht)
      if(sameWCBool) score-=0.3;
      // Gleicher Pro/Amateur Status: -0.2
      if(sameProBool) score-=0.2;
      // Gleiches Geschlecht: -0.15
      if(sameGenderBool) score-=0.15;
      // Profil vollständig (hat Foto): -0.1
      if(f.avatar_url) score-=0.1;
      // Aktiv in letzten 7 Tagen: -0.2
      if(f.last_seen&&(Date.now()-new Date(f.last_seen).getTime())<604800000) score-=0.2;

      return{
        ...f,
        _score:score,
        _dist:dist,
        _sameStyle:sameStyleBool,
        _sameCity:sameCityBool,
        _sameWC:sameWCBool,
        _sameProStatus:sameProBool,
      };
    })
    .sort((a,b)=>{
      // Primär: Score
      const scoreDiff=a._score-b._score;
      if(Math.abs(scoreDiff)>0.01)return scoreDiff;
      // Sekundär: Distanz
      return (a._dist||9999)-(b._dist||9999);
    });
  const top=filteredCards[filteredCards.length-1];
  const lastTapRef=useRef(0);
  function dragStart(e){
    if(e.touches)e.preventDefault();
    const p=e.touches&&e.touches[0]?e.touches[0]:e;
    if(!p||p.clientX===undefined)return;
    setStart({x:p.clientX,y:p.clientY});
    setDrag(true);
  }
  function dragMove(e){
    if(!drag)return;
    if(e.touches)e.preventDefault();
    const p=e.touches&&e.touches[0]?e.touches[0]:e;
    if(!p||p.clientX===undefined)return;
    const dx=p.clientX-start.x;
    const dy=p.clientY-start.y;
    // Immer horizontal updaten - auch bei leicht schrägen Swipes
    if(Math.abs(dx)>10)setOffset({x:dx,y:dy*0.2});
  }
  function dragEnd(e){
    if(!drag)return;
    setDrag(false);
    if(offset.x>SW)doSwipe('ch');
    else if(offset.x<-SW)doSwipe('de');
    else setOffset({x:0,y:0});
  }

  async function undoSwipe(){
    if(!lastSwiped||!session||!myProfile)return;
    const {profile} = lastSwiped;
    // Swipe aus DB löschen
    try{
      await fetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+myProfile.id+'&target_id=eq.'+profile.id,{
        method:'DELETE',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      });
    }catch{}
    // Karte wieder hinzufügen
    setCards(prev=>[...prev, profile]);
    setLastSwiped(null);
    showMsg('↩️ Rückgängig!');
  }

  async function doSwipe(dir){
    if(!top)return;
    setLastAct(dir);setOffset({x:0,y:0});
    if(dir==='ch'){
      setSwStats(s=>({...s,ch:s.ch+1}));
      setLastSwiped({profile:top,dir:'like'});
      setRecentSwiped(prev=>[{profile:top,dir:'like'},...prev].slice(0,4));
      sessionSwipedRef.current.add(top.id);
      if(session&&myProfile&&!String(top.id).startsWith('demo_')){
        try{
          await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'like'},session.token);
          const mutual=await dbSelect('swipes','swiper_id=eq.'+top.id+'&target_id=eq.'+myProfile.id+'&direction=eq.like',session.token);
          if(Array.isArray(mutual)&&mutual.length>0){
            // Echtes Match — in DB speichern und Match-Screen zeigen
            // Match nur einmal anlegen (ON CONFLICT ignorieren)
            try{
              await fetch(SUPA_URL+'/rest/v1/matches',{
                method:'POST',
                headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'resolution=ignore-duplicates,return=minimal'},
                body:JSON.stringify({profile_a_id:myProfile.id,profile_b_id:top.id})
              });
            }catch{}
            sendLocalNotification('🥊 ITS A MATCH!',top.name+' hat dich auch geliket!');
            setTimeout(()=>{setMatched(top);loadMatches(session,myProfile);},300);
          }
          // Keine fake Matches mehr
        }catch{}
      }
    }else{
      setSwStats(s=>({...s,de:s.de+1}));
      setLastSwiped({profile:top,dir:'pass'});
      setRecentSwiped(prev=>[{profile:top,dir:'pass'},...prev].slice(0,4));
      sessionSwipedRef.current.add(top.id);
      if(session&&myProfile&&!String(top.id).startsWith('demo_')){try{await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'pass'},session.token);}catch{}}
    }
    setTimeout(()=>{
      const swipedId=top?.id;
      setCards(prev=>swipedId?prev.filter(c=>c.id!==swipedId):prev.slice(0,-1));
      setLastAct(null);
    },260);
  }

  const rot=(offset.x/14).toFixed(1);
  const fop=Math.min(offset.x/SW,1);
  const pop=Math.min(-offset.x/SW,1);
  const cStyle=drag?{transform:`translateX(${offset.x}px) translateY(${offset.y*0.25}px) rotate(${rot}deg)`,transition:'none',cursor:'grabbing'}
    :lastAct==='ch'?{transform:'translateX(140%) rotate(18deg)',transition:'transform 0.26s ease'}
    :lastAct==='de'?{transform:'translateX(-140%) rotate(-18deg)',transition:'transform 0.26s ease'}
    :{transform:'translateX(0) rotate(0deg)',transition:'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)'};

  function canGo(){
    if(step===1)return !!(profile.name&&profile.age&&profile.city);
    if(step===2)return !!(profile.style);
    if(step===3)return true; // Alles optional auf Step 3
    return true;
  }
  const tf=stats.wins+stats.losses+stats.draws;
  const wr=tf>0?Math.round((stats.wins/tf)*100):0;
  const kr=stats.wins>0?Math.round((stats.ko/stats.wins)*100):0;
  const allF=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weight_class:profile.weightClass,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'',accent:RED,isMe:true,avatar_url:avatarUrl}].concat(FIGHTERS):FIGHTERS;
  // Rangliste: ALLE angemeldeten User aus Datenbank
  const userOnly=(()=>{
    const me=profile.name?[{id:0,name:profile.name,city:profile.city,gym:profile.gym,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'',accent:RED,isMe:true,avatar_url:avatarUrl,is_pro:profile.isPro===true,country:profile.country||'DE'}]:[];
    if(allProfiles.length>0){
      const others=allProfiles.filter(p=>p.id!==myProfile?.id&&!p.banned).map(p=>({
        ...p,
        wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0,
        accent:p.accent||RED,isMe:false
      }));
      return [...me,...others];
    }
    return me;
  })();
  const ranked=rankMode==='trainer'
    ?[]
    :[...userOnly]
      .filter(f=>{
        if(rankMode==='pro') return f.isMe?(profile.isPro===true):(f.is_pro===true);
        return true; // 'alle' zeigt wirklich alle
      })
      .filter(f=>(f.wins||0)+(f.losses||0)+(f.draws||0)>0) // nur User mit mind. 1 Kampf
      .filter(f=>rankF==='All'||!f.style||(f.style&&(f.style===rankF||f.style.includes(rankF))))
      .sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  const trStyles=['All','Boxing','MMA','Muay Thai','BJJ'];
  const filteredT=TRAINERS.filter(tr=>trainerF==='All'||tr.style.includes(trainerF)).sort((a,b)=>b.rating-a.rating);





  // Fight history für viewProfile laden (MUSS vor frühen Returns stehen!)
  useEffect(()=>{
    if(!viewProfile||!session)return;
    setViewProfileHistory([]);
    fetch(SUPA_URL+'/rest/v1/fight_history?user_id=eq.'+viewProfile.id+'&order=created_at.desc&limit=10',{
      headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
    }).then(r=>r.json()).then(data=>{
      if(Array.isArray(data))setViewProfileHistory(data);
    }).catch(()=>{});
  },[viewProfile?.id]);

  if(viewGym)return(<><style>{css}</style><GymDetailScreen gym={viewGym.gym} gymKey={viewGym.key} gymRatings={gymRatings} gymLogos={gymLogos} isAdmin={isAdmin} session={session} onGymUpdate={async()=>{await loadDbGyms(session);await loadGymLogos();}} rateGym={(k,s)=>{rateGym(k,s);}} onClose={()=>setViewGym(null)} darkMode={darkMode===true}/></>);

  if(whoLikedTab)return(
    <div style={{minHeight:'100vh',background:darkMode?'#0d0d0d':'#f5f5f7',display:'flex',flexDirection:'column'}}> 
      <style>{css}</style>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
        <button onClick={()=>setWhoLikedTab(false)} style={{background:'none',border:'none',color:darkMode?'#fff':'#1a1a1a',fontSize:20,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
        <div>
          <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>{t.interestTitle}</div>
          <div style={{color:'#aaa',fontSize:11}}>{whoLikedMe.length} {t.interestSub}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
        {whoLikedMe.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:darkMode?'#555':'#bbb'}}>
            <div style={{fontSize:48,marginBottom:12}}>🥊</div>
            <div style={{fontSize:14}}>{t.noOneLiked}</div>
            <div style={{fontSize:12,marginTop:6}}>{t.keepSwiping}</div>
          </div>
        ):whoLikedMe.map((p,i)=>(
          <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px'}}>
              <div onClick={()=>{setWhoLikedTab(false);setViewProfile(p);}} style={{width:54,height:54,borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',border:'2px solid '+RED+'44'}}>
                {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{width:'100%',height:'100%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🥊</div>}
              </div>
              <div style={{flex:1}} onClick={()=>{setWhoLikedTab(false);setViewProfile(p);}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15,cursor:'pointer'}}>{p.name}</div>
                <div style={{color:RED,fontSize:12,marginTop:1}}>{p.style} · {p.city}</div>
                <div style={{color:darkMode?'#666':'#aaa',fontSize:11,marginTop:2}}>{p.wins||0}S {p.losses||0}N {p.draws||0}U</div>
              </div>
              <button onClick={async()=>{
                // Zurücklieken — Match erstellen
                try{
                  await dbInsert('swipes',{swiper_id:myProfile.id,target_id:p.id,direction:'like'},session.token);
                  await fetch(SUPA_URL+'/rest/v1/matches',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({profile_a_id:myProfile.id,profile_b_id:p.id})});
                  setWhoLikedMe(prev=>prev.filter(x=>x.id!==p.id));
                  setMatched(p);
                  setWhoLikedTab(false);
                  loadMatches(session,myProfile);
                  loadWhoLikedMe(session,myProfile);
                  sendLocalNotification('🥊 MATCH!',p.name+' — ihr könnt jetzt chatten!');
                }catch(e){showMsg('Fehler: '+e.message);}
              }} style={{background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',borderRadius:10,padding:'10px 14px',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                ⚔️ MATCH
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if(viewProfile)return(
    <div style={{minHeight:'100vh',background:darkMode?'#0d0d0d':'#f5f5f7',display:'flex',flexDirection:'column'}}>
      <style>{css}</style>
      <div style={{position:'relative',width:'100%',height:340,overflow:'hidden',flexShrink:0}}>
        {viewProfile.avatar_url
          ?<img src={viewProfile.avatar_url} onClick={()=>setLightboxImg(viewProfile.avatar_url)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:(viewProfile.img_pos_x||50)+'% '+(viewProfile.img_pos_y||30)+'%',cursor:'zoom-in'}} alt=''/>
          :<div style={{width:'100%',height:'100%',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:80}}>🥊</div>}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.75) 100%)'}}/>
        <button onClick={()=>{setViewProfile(null);}} style={{position:'absolute',top:14,left:14,background:'rgba(0,0,0,0.45)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700,borderRadius:8,padding:'4px 12px'}}>{t.back}</button>
        <div style={{position:'absolute',bottom:16,left:16,right:16}}>
          <div className='rj' style={{color:'#fff',fontSize:28,letterSpacing:2,lineHeight:1}}>{viewProfile.name}</div>
          {viewProfile.last_seen&&<div style={{color:'rgba(255,255,255,0.65)',fontSize:11,marginTop:3}}>{getLastSeen(viewProfile.last_seen)}</div>}
          <div style={{color:'#ff6b6b',fontSize:12,fontWeight:700,marginTop:4}}>{viewProfile.style} · {viewProfile.city}</div>
          {viewProfile.bio&&<div style={{color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:4,fontStyle:'italic'}}>'{viewProfile.bio}'</div>}
          {viewProfile.social_url&&(
            <div onClick={()=>window.open(viewProfile.social_url.startsWith('http')?viewProfile.social_url:'https://'+viewProfile.social_url,'_blank')} style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px',marginTop:4,cursor:'pointer'}}>
              <span style={{fontSize:12}}>{viewProfile.social_url.includes('instagram')?'📸':viewProfile.social_url.includes('youtube')?'▶️':'🔗'}</span>
              <span style={{color:'rgba(255,255,255,0.8)',fontSize:11}}>{viewProfile.social_url.replace('https://','').replace('http://','').split('/')[0]}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{padding:'12px',maxWidth:420,margin:'0 auto',width:'100%'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
          {[['SIEGE',viewProfile.wins||0,'#27ae60'],['NIEDER',viewProfile.losses||0,RED],['UNENTSCH',viewProfile.draws||0,'#d4a017'],['KOs',viewProfile.ko||0,RED]].map(([label,val,color])=>(
            <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 4px',textAlign:'center',border:'1px solid '+color+'33'}}>
              <div className='rj' style={{color:color,fontSize:22}}>{val}</div>
              <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {[[appLang==='FR'?'CATÉGORIE':appLang==='EN'?'WEIGHT CLASS':'GEWICHTSKLASSE',viewProfile.weight_class||'-','#2980b9'],[appLang==='FR'?'SALLE':'GYM',viewProfile.gym||'-','#8e44ad'],['GRÖSSE',viewProfile.height?(viewProfile.height+'cm'):'-','#27ae60'],['GEWICHT',viewProfile.weight?(viewProfile.weight+'kg'):'-','#e67e22']].map(([label,val,color])=>(
            <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 12px',border:'1px solid '+color+'22'}}>
              <div style={{color:'#bbb',fontSize:9,letterSpacing:1}}>{label}</div>
              <div style={{color:color,fontWeight:700,fontSize:12,marginTop:3}}>{val}</div>
            </div>
          ))}
        </div>
        {/* BLOCK / MELDEN */}
        {/* TRAININGS-HISTORIE auf fremdem Profil — immer anzeigen */}
        <div style={{padding:'0 12px',marginTop:12}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,letterSpacing:2}}>🤝 TRAININGS-HISTORIE</div>
            <div style={{background:viewProfile.history_public?'#27ae6018':'#88888818',border:'1px solid '+(viewProfile.history_public?'#27ae6044':'#88888844'),borderRadius:10,padding:'1px 7px',color:viewProfile.history_public?'#27ae60':'#888888',fontSize:9,fontWeight:700}}>
              {viewProfile.history_public?'ÖFFENTLICH':'PRIVAT'}
            </div>
          </div>
          {viewProfile.history_public&&viewProfileHistory.length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {viewProfileHistory.map((f,i)=>(
                <div key={f.id||i} style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:8,padding:'9px 11px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:30,height:30,borderRadius:7,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>🥊</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.opponent_name}</div>
                    <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{f.fight_type}{f.fight_type&&f.fight_date?' · ':''}{f.fight_date}</div>
                  </div>
                  {f.location&&<div style={{color:'#ccc',fontSize:9,flexShrink:0}}>📍 {f.location}</div>}
                </div>
              ))}
            </div>
          ):viewProfile.history_public&&viewProfileHistory.length===0?(
            <div style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:8,padding:'12px',textAlign:'center',border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
              <div style={{fontSize:20,marginBottom:4}}>🤝</div>
              <div style={{color:'#aaa',fontSize:12}}>{t.noHistory}</div>
            </div>
          ):(
            /* PRIVAT — ausgeblendet anzeigen */
            <div style={{position:'relative',overflow:'hidden',borderRadius:8}}>
              {/* Verschwommene Vorschau */}
              <div style={{filter:'blur(4px)',pointerEvents:'none',opacity:0.4}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:8,padding:'9px 11px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9,marginBottom:5}}>
                    <div style={{width:30,height:30,borderRadius:7,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>🥊</div>
                    <div style={{flex:1}}>
                      <div style={{background:darkMode?'#333':'#e0e0e0',height:12,borderRadius:4,width:'60%',marginBottom:6}}/>
                      <div style={{background:darkMode?'#2a2a2a':'#eee',height:9,borderRadius:4,width:'40%'}}/>
                    </div>
                  </div>
                ))}
              </div>
              {/* Lock Overlay */}
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,background:'rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:24}}>🔒</div>
                <div style={{color:darkMode?'#aaa':'#888',fontSize:12,fontWeight:700,textAlign:'center'}}>Trainings-Historie ist privat</div>
                <div style={{color:darkMode?'#666':'#bbb',fontSize:10,textAlign:'center'}}>Dieser User hat seine Historie
nicht öffentlich gemacht</div>
              </div>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8,marginTop:14,padding:'0 12px'}}>
          <button onClick={()=>{
            const isBlocked=blockedUsers.includes(viewProfile.id);
            const updated=isBlocked?blockedUsers.filter(id=>id!==viewProfile.id):[...blockedUsers,viewProfile.id];
            setBlockedUsers(updated);
            localStorage.setItem('fighter_blocked',JSON.stringify(updated));
            showMsg(isBlocked?'Nutzer entsperrt':'Nutzer blockiert 🚫');
            setViewProfile(null);
          }} style={{flex:1,padding:'11px',borderRadius:10,background:darkMode?'#2a1a1a':'#fff5f5',border:'1px solid #c0392b44',color:'#c0392b',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            🚫 {blockedUsers.includes(viewProfile.id)?'Entsperren':'Blockieren'}
          </button>
          <button onClick={()=>{
            if(reportSent[viewProfile.id]){showMsg('Bereits gemeldet');return;}
            setReportSent(r=>({...r,[viewProfile.id]:true}));
            showMsg(appLang==='FR'?'Profil signalé ✓':appLang==='EN'?'Profile reported ✓':'Profil wurde gemeldet ✓');
          }} style={{flex:1,padding:'11px',borderRadius:10,background:darkMode?'#1a1a2a':'#f5f5ff',border:'1px solid #2980b944',color:'#2980b9',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            {reportSent[viewProfile.id]?'✓ Gemeldet':'⚠️ Melden'}
          </button>
        </div>
      </div>
      {lightboxImg&&(
        <div onClick={()=>setLightboxImg(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
          <img src={lightboxImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=''/>
          <button onClick={(e)=>{e.stopPropagation();setLightboxImg(null);}} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:24,width:44,height:44,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
    </div>
  );

  if(!authReady||screen==='loading')return(
    <div style={{minHeight:'100vh',background:'#0d0d0d',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:0,position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <style>{`
        @keyframes splashScale{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes splashFade{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes splashDot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}
        .splash-logo{animation:splashScale 0.7s ease-out forwards}
        .splash-sub{animation:splashFade 0.5s ease-out 0.4s forwards;opacity:0}
        .splash-dot1{animation:splashDot 1.4s ease-in-out 0.8s infinite}
        .splash-dot2{animation:splashDot 1.4s ease-in-out 1.0s infinite}
        .splash-dot3{animation:splashDot 1.4s ease-in-out 1.2s infinite}
      `}</style>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,#1a0a0a 0%,#0d0d0d 70%)'}}/>
      <div style={{position:'relative',textAlign:'center'}}>
        <div className='rj splash-logo' style={{fontSize:56,color:'#fff',letterSpacing:8,textShadow:'0 0 40px rgba(192,57,43,0.6)'}}>FIGHTER</div>
        <div className='splash-sub' style={{color:'#c0392b',fontSize:11,letterSpacing:5,fontFamily:'DM Sans,sans-serif',fontWeight:700,marginTop:4}}>FINDE DEINEN GEGNER</div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'center'}}>
          <div className='splash-dot1' style={{width:7,height:7,borderRadius:'50%',background:'#c0392b'}}/>
          <div className='splash-dot2' style={{width:7,height:7,borderRadius:'50%',background:'#c0392b'}}/>
          <div className='splash-dot3' style={{width:7,height:7,borderRadius:'50%',background:'#c0392b'}}/>
        </div>
      </div>
    </div>
  );
  // ONBOARDING
  const onboardSlides=[
    {icon:'',title:t.ob1title,sub:t.ob1sub,bg:'linear-gradient(160deg,#1a0505 0%,#0d0d0d 100%)',accent:'#c0392b'},
    {icon:'💬',title:t.ob2title,sub:t.ob2sub,bg:'linear-gradient(160deg,#05101a 0%,#0d0d0d 100%)',accent:'#2980b9'},
    {icon:'🏆',title:t.ob3title,sub:t.ob3sub,bg:'linear-gradient(160deg,#0a0a05 0%,#0d0d0d 100%)',accent:'#d4a017'},
  ];

  if(showOnboarding&&authReady)return(
    <div style={{minHeight:'100vh',background:onboardSlides[onboardSlide].bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'60px 24px 50px',position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}.slide-content{animation:slideIn 0.4s ease-out}`}</style>
      <div/>
      <div className='slide-content' key={onboardSlide} style={{textAlign:'center',maxWidth:340}}>
        <div style={{fontSize:80,marginBottom:24,filter:'drop-shadow(0 0 30px '+onboardSlides[onboardSlide].accent+'66)'}}>{onboardSlides[onboardSlide].icon}</div>
        <div className='rj' style={{fontSize:36,color:'#fff',letterSpacing:3,lineHeight:1.15,marginBottom:16,whiteSpace:'pre-line'}}>{onboardSlides[onboardSlide].title}</div>
        <div style={{color:'rgba(255,255,255,0.65)',fontSize:15,lineHeight:1.7,fontFamily:'DM Sans,sans-serif'}}>{onboardSlides[onboardSlide].sub}</div>
      </div>
      <div style={{width:'100%',maxWidth:340}}>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:28}}>
          {onboardSlides.map((_,i)=><div key={i} style={{width:i===onboardSlide?24:7,height:7,borderRadius:4,background:i===onboardSlide?onboardSlides[onboardSlide].accent:'rgba(255,255,255,0.2)',transition:'all 0.3s'}}/>)}
        </div>
        <button onClick={()=>{
          if(onboardSlide<onboardSlides.length-1){setOnboardSlide(s=>s+1);}
          else{try{localStorage.setItem('fighter_onboarding_done','1');}catch{}setShowOnboarding(false);}
        }} style={{width:'100%',padding:'16px',borderRadius:14,background:onboardSlides[onboardSlide].accent,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:20,letterSpacing:3,cursor:'pointer',boxShadow:'0 4px 20px '+onboardSlides[onboardSlide].accent+'55'}}>
          {onboardSlide<onboardSlides.length-1?t.continueBtn:t.startNow}
        </button>
        {onboardSlide===0&&<button onClick={()=>{try{localStorage.setItem('fighter_onboarding_done','1');}catch{}setShowOnboarding(false);}} style={{width:'100%',marginTop:10,padding:'10px',background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:12,cursor:'pointer'}}>{t.skip}</button>}
      </div>
    </div>
  );

  if(!session)return <AuthScreen onSession={handleSession} appLang={appLang}/>;
  if(activeChat&&myProfile&&!viewProfile)return(<><style>{css}</style><ChatOverlay match={activeChat} myProfileId={myProfile.id} token={session.token} onClose={()=>setActiveChat(null)} onViewProfile={(p)=>{setViewProfile(p);}} darkMode={darkMode} t={t} appLang={appLang}/></>);

  if(screen==='setup')return(
    <div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 0 40px'}}>
      <style>{css}</style>
      {showImgEditor&&imgEditorSrc&&<ImgPositionEditor src={imgEditorSrc} onSave={imgEditorCallback} onCancel={()=>setShowImgEditor(false)}/>}
      <div style={{width:'100%',maxWidth:420,padding:'32px 24px 0',textAlign:'center'}}>
        <div className='rj fadeUp' style={{fontSize:64,color:'#1a1a1a',letterSpacing:6,lineHeight:1}}>FIGHTER</div>
        <div style={{color:RED,fontSize:11,letterSpacing:7,marginTop:5,fontWeight:600}}>FINDE DEINEN GEGNER</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:22}}>
        {[1,2,3].map(s=><div key={s} style={{width:s===step?32:10,height:8,borderRadius:4,background:s<=step?RED:'#ddd',transition:'all 0.3s'}}/>)}
      </div>
      <div style={{width:'100%',maxWidth:380,padding:'22px 20px 0'}}>
        {step===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:8}}> 
              <label style={{cursor:'pointer',textAlign:'center'}}>
                <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                <div style={{position:'relative',display:'inline-block'}}>
                  <div style={{width:110,height:110,borderRadius:'50%',background:avatarPreview?'#000':'#fdf0ef',border:'3px solid '+(avatarPreview?RED:'#e74c3c'),display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',margin:'0 auto',animation:avatarPreview?'none':'pulse 1.8s infinite',boxShadow:avatarPreview?'0 4px 16px rgba(192,57,43,0.3)':'0 0 0 6px rgba(231,76,60,0.15)'}}>
                    {uploading?<div style={{fontSize:28}} className='spin'>⏳</div>
                      :avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='avatar'/>
                      :<div style={{textAlign:'center'}}><div style={{fontSize:36}}>📸</div><div style={{color:RED,fontSize:10,marginTop:4,fontWeight:700}}>FOTO</div></div>}
                  </div>
                  {!avatarPreview&&<div style={{position:'absolute',top:-4,right:-4,background:RED,borderRadius:10,padding:'2px 6px',fontSize:9,color:'#fff',fontWeight:700,fontFamily:'Rajdhani,sans-serif',letterSpacing:1}}>PFLICHT</div>}
                  {avatarPreview&&<div style={{position:'absolute',bottom:4,right:4,background:'#27ae60',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'2px solid #fff'}}>✓</div>}
                </div>
                <div style={{color:avatarPreview?'#27ae60':RED,fontSize:12,marginTop:8,fontWeight:700}}>{avatarPreview?'Foto hochgeladen ✓':'Profilbild hochladen (Pflicht)'}</div>
                {!avatarPreview&&<div style={{color:'#bbb',fontSize:10,marginTop:2}}>{appLang==='FR'?'Sans photo vous ne pouvez pas continuer':appLang==='EN'?'Without a photo you cannot continue':'Ohne Foto kannst du nicht weitermachen'}</div>}
              </label>
            </div>
            <Lbl>{appLang==='FR'?'Votre nom':appLang==='EN'?'Your name':'Dein Name'}</Lbl><Inp placeholder='z.B. Max Mueller' value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
            <Lbl>Alter</Lbl><Inp placeholder='z.B. 25' type='number' value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
            <Lbl>Standort</Lbl><Inp placeholder='z.B. Berlin' value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))}/>
            <Lbl>Ich bin</Lbl>
            <div style={{display:'flex',gap:10,marginTop:2,marginBottom:4}}>
              {[['Mann','♂️','male'],['Frau','♀️','female'],['Divers','⚧️','other']].map(([label,icon,val])=>(
                <button key={val} onClick={()=>setProfile(p=>({...p,gender:val}))}
                  style={{flex:1,padding:'12px 6px',borderRadius:10,border:'2px solid '+(profile.gender===val?RED:'#e0e0e0'),background:profile.gender===val?'#fdf0ef':'#fff',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                  <div style={{fontSize:22,marginBottom:3}}>{icon}</div>
                  <div style={{color:profile.gender===val?RED:'#555',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1}}>{label}</div>
                </button>
              ))}
            </div>
            <Lbl>Level</Lbl>
            <div style={{display:'flex',gap:10,marginTop:2}}>
              {[['Amateur','🥋',false],['Profi','⭐',true]].map(([label,icon,val])=>(
                <button key={label} onClick={()=>setProfile(p=>({...p,isPro:val}))}
                  style={{flex:1,padding:'14px 10px',borderRadius:10,border:'2px solid '+(profile.isPro===val?RED:'#e0e0e0'),background:profile.isPro===val?'#fdf0ef':'#fff',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                  <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
                  <div style={{color:profile.isPro===val?RED:'#555',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:1}}>{label}</div>
                  <div style={{color:'#aaa',fontSize:10,marginTop:2}}>{val?'Wettkampf-Erfahrung':'Einsteiger / Hobbyist'}</div>
                </button>
              ))}
            </div>
            <Lbl>Land</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:2}}>
              {[['🇩🇪','DE','Deutschland'],['🇦🇹','AT','Österreich'],['🇨🇭','CH','Schweiz'],['🇫🇷','FR','Frankreich'],['🇬🇧','GB','UK'],['🇺🇸','US','USA'],['🇳🇱','NL','Niederlande'],['🇧🇪','BE','Belgien'],['🇮🇹','IT','Italien'],['🇪🇸','ES','Spanien'],['🌍','OTHER','Andere']].map(([flag,code,name])=>(
                <button key={code} onClick={()=>setProfile(p=>({...p,country:code}))}
                  style={{padding:'8px 12px',borderRadius:10,border:'2px solid '+(profile.country===code?RED:'#e0e0e0'),background:profile.country===code?'#fdf0ef':'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'all 0.2s'}}>
                  <span style={{fontSize:18}}>{flag}</span>
                  <span style={{color:profile.country===code?RED:'#555',fontWeight:700,fontSize:12}}>{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <Lbl>{appLang==='FR'?'Votre salle':appLang==='EN'?'Your gym':'Dein Gym'}</Lbl>
            <div style={{position:'relative'}}>
              <Inp placeholder={appLang==='FR'?'Chercher une salle…':appLang==='EN'?'Search gym…':'Gym suchen…'} value={profile.gym} onChange={v=>{
                setProfile(p=>({...p,gym:v}));
                if(v.length>=2){
                  const q=v.toLowerCase();
                  const matches=ALL_GYMS_FLAT.filter(g=>g.name.toLowerCase().includes(q)||g.ct.toLowerCase().includes(q));
                  setGymSuggestions(matches.slice(0,6));
                  setShowGymSuggestions(true);
                }else{
                  setShowGymSuggestions(false);
                }
              }}/>
              {showGymSuggestions&&gymSuggestions.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eee',zIndex:100,overflow:'hidden',marginTop:4}}>
                  {gymSuggestions.map((g,i)=>(
                    <div key={i} onClick={()=>{setProfile(p=>({...p,gym:g.name}));setShowGymSuggestions(false);}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',borderBottom:i<gymSuggestions.length-1?'1px solid #f5f5f5':'none'}} onMouseEnter={e=>e.currentTarget.style.background='#fdf0ef'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <div style={{fontSize:22,flexShrink:0}}>{g.emoji}</div>
                      <div style={{flex:1}}>
                        <div style={{color:'#1a1a1a',fontWeight:700,fontSize:13}}>{g.name}</div>
                        <div style={{color:'#aaa',fontSize:11}}>📍 {g.ct} · {g.styles?.join(', ')}</div>
                      </div>
                      {g.code&&<div style={{color:'#27ae60',fontSize:10,fontWeight:700}}>✅ Verifizierbar</div>}
                    </div>
                  ))}
                  <div onClick={()=>{setShowGymSuggestions(false);setShowRegisterGym(true);setNewGymData(d=>({...d,name:profile.gym}));}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:'#fdf8ff',borderTop:'1px solid #f0e8ff'}} onMouseEnter={e=>e.currentTarget.style.background='#f0e8ff'} onMouseLeave={e=>e.currentTarget.style.background='#fdf8ff'}>
                    <div style={{fontSize:20}}>➕</div>
                    <div style={{color:'#8e44ad',fontWeight:700,fontSize:13}}>{t.myGymNotListed}</div>
                  </div>
                </div>
              )}
              {showGymSuggestions&&gymSuggestions.length===0&&profile.gym.length>=2&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eee',zIndex:100,marginTop:4}}>
                  <div style={{padding:'12px 14px',color:'#aaa',fontSize:13,textAlign:'center'}}>{t.gymNotFound}</div>
                  <div onClick={()=>{setShowGymSuggestions(false);setShowRegisterGym(true);setNewGymData(d=>({...d,name:profile.gym}));}} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:'#fdf8ff',borderTop:'1px solid #f0e8ff'}}>
                    <div style={{fontSize:20}}>➕</div>
                    <div style={{color:'#8e44ad',fontWeight:700,fontSize:13}}>"{profile.gym}" zur App anmelden</div>
                  </div>
                </div>
              )}
            </div>

            {/* GYM ANMELDE-MODAL */}
            {showRegisterGym&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
                <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:360,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
                  <div style={{background:'linear-gradient(135deg,#6c3483,#8e44ad)',padding:'18px 20px'}}>
                    <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2}}>GYM ANMELDEN</div>
                    <div style={{color:'rgba(255,255,255,0.65)',fontSize:11,marginTop:2}}>{t.gymBeingAdded}</div>
                  </div>
                  <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:10}}>
                    {gymRegSent?(
                      <div style={{textAlign:'center',padding:'20px 0'}}>
                        <div style={{fontSize:48,marginBottom:10}}>✅</div>
                        <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18}}>ANMELDUNG GESENDET!</div>
                        <div style={{color:'#888',fontSize:12,marginTop:6,lineHeight:1.6}}>Wir prüfen dein Gym und fügen es innerhalb von 48h hinzu. Du bekommst eine E-Mail sobald es live ist.</div>
                        <button onClick={()=>{setShowRegisterGym(false);setGymRegSent(false);}} style={{marginTop:16,padding:'11px 28px',borderRadius:10,background:'linear-gradient(135deg,#8e44ad,#9b59b6)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>SCHLIESSEN</button>
                      </div>
                    ):(
                      <>
                        {[
                          ['GYM NAME *',newGymData.name,'name','z.B. Tiger Gym Berlin'],
                          ['STADT *',newGymData.city,'city','z.B. Berlin'],
                          ['ADRESSE',newGymData.address,'address','z.B. Müllerstraße 12'],
                          ['KAMPFSTIL',newGymData.style,'style','z.B. Boxing, MMA'],
                        ].map(([label,val,key,ph])=>(
                          <div key={key}>
                            <div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:4}}>{label}</div>
                            <input value={val} onChange={e=>setNewGymData(d=>({...d,[key]:e.target.value}))} placeholder={ph}
                              style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #e0e0e0',background:'#f5f5f7',color:'#1a1a1a',fontSize:13,fontFamily:'DM Sans,sans-serif'}}/>
                          </div>
                        ))}
                        <div style={{background:'#fdf8ff',borderRadius:8,padding:'10px',border:'1px solid #e8d5f5',marginTop:2}}>
                          <div style={{color:'#8e44ad',fontSize:11,lineHeight:1.6}}>💡 Nach der Prüfung erscheint dein Gym in der App und du kannst dich als Mitglied verifizieren.</div>
                        </div>
                        <div style={{display:'flex',gap:8,marginTop:4}}>
                          <button onClick={()=>{setShowRegisterGym(false);setGymRegSent(false);}} style={{flex:1,padding:'11px',borderRadius:10,background:'transparent',border:'1px solid #eee',color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>{t.cancel}</button>
                          <button onClick={async()=>{
                            if(!newGymData.name||!newGymData.city)return;
                            const body=`GYM ANMELDUNG

Name: ${newGymData.name}
Stadt: ${newGymData.city}
Adresse: ${newGymData.address||'-'}
Stil: ${newGymData.style||'-'}

Angemeldet von: ${profile.name||'Unbekannt'}`;
                            fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:'default_service',template_id:'template_default',user_id:'user_default',template_params:{message:body,to_email:'mfumulandu@gmail.com'}})}).catch(()=>{});
                            // Gym in DB speichern
                            try{
                              await fetch(SUPA_URL+'/rest/v1/gyms',{
                                method:'POST',
                                headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},
                                body:JSON.stringify({
                                  name:newGymData.name,
                                  city:newGymData.city,
                                  address:newGymData.address||'',
                                  style:newGymData.style||'',
                                  styles:newGymData.style?[newGymData.style]:[],
                                  code:newGymData.name.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,20)+'-'+Math.floor(Math.random()*9000+1000),
                                  emoji:'',members:0,rating:0
                                })
                              });
                              await loadDbGyms(session);
                              showMsg(appLang==='FR'?'✅ Salle enregistrée!':appLang==='EN'?'✅ Gym saved!':'✅ Gym gespeichert!');
                            }catch(e){showMsg('Fehler: '+e.message);}
                            setProfile(p=>({...p,gym:newGymData.name}));
                            setGymRegSent(true);
                          }} disabled={!newGymData.name||!newGymData.city}
                            style={{flex:2,padding:'11px',borderRadius:10,background:newGymData.name&&newGymData.city?'linear-gradient(135deg,#8e44ad,#9b59b6)':'#eee',border:'none',color:newGymData.name&&newGymData.city?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:newGymData.name&&newGymData.city?'pointer':'not-allowed'}}>
                            ➕ ANMELDEN
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <Lbl>Ueber dich</Lbl><Inp placeholder='z.B. 5 Jahre Boxing Erfahrung…' value={profile.bio} onChange={v=>{setShowGymSuggestions(false);setProfile(p=>({...p,bio:v}));}} onFocus={()=>setShowGymSuggestions(false)}/>
            <Lbl>{t.fightStyle}</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {STYLES.map(s=>{
                const selected=(profile.style||'').split(',').map(x=>x.trim()).filter(Boolean);
                const isSelected=selected.includes(s);
                return(<button key={s} onClick={()=>{
                  const cur=(profile.style||'').split(',').map(x=>x.trim()).filter(Boolean);
                  const next=isSelected?cur.filter(x=>x!==s):[...cur,s];
                  setProfile(p=>({...p,style:next.join(', ')}));
                }} style={{padding:'7px 13px',borderRadius:4,border:'1px solid '+(isSelected?RED:'#ddd'),background:isSelected?'#fdf0ef':'#fff',color:isSelected?RED:'#666',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>{s}</button>);
              })}
            </div>
          </div>
        )}
        {step===3&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{display:'flex',gap:11}}>
              <div style={{flex:1}}><Lbl>Groesse (cm)</Lbl><Inp placeholder='180' type='number' value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
              <div style={{flex:1}}><Lbl>{t.fightWeight}</Lbl><Inp placeholder='77' type='number' value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
            </div>
            <Lbl>Gewichtsklasse</Lbl>
            <select value={profile.weightClass} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:'#fff',border:'1px solid #ddd',borderRadius:8,padding:'12px 13px',color:profile.weightClass?'#1a1a1a':'#aaa',fontSize:14,width:'100%'}}>
              <option value=''>Gewichtsklasse waehlen</option>
              {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
            <Lbl>{t.fightRecord}</Lbl>
            <div style={{display:'flex',gap:7}}>
              {[['wins','SIEGE','#27ae60'],['losses','NIEDER',RED],['draws','UNENTSCH','#d4a017'],['ko','KOs',RED]].map(([key,label,color])=>(
                <div key={key} style={{flex:1,textAlign:'center'}}>
                  <div style={{color:color,fontSize:9,letterSpacing:1,marginBottom:3}}>{label}</div>
                  <input type='number' min='0' value={stats[key]} onChange={e=>setStats(s=>({...s,[key]:parseInt(e.target.value)||0}))} style={{width:'100%',background:'#fff',border:'1px solid #ddd',borderRadius:6,padding:'9px 3px',color:'#1a1a1a',fontSize:20,textAlign:'center',fontFamily:'Rajdhani,sans-serif'}}/>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:9,marginTop:22}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:'13px',borderRadius:8,background:'#fff',border:'1px solid #ddd',color:'#666',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>Zurueck</button>}
          <div style={{flex:2,display:'flex',flexDirection:'column',gap:4}}>
            <button onClick={async()=>{if(!canGo())return;if(step<3)setStep(s=>s+1);else await saveProfile();}} style={{width:'100%',padding:'13px',borderRadius:8,background:canGo()?`linear-gradient(135deg,${RED},${LIGHT_RED})`:'#eee',border:'none',color:canGo()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:canGo()?'pointer':'not-allowed',transition:'all 0.2s'}}>
              {saving?t.saving:step===3?t.letsGo:t.next}
            </button>
            {step===1&&!(avatarPreview||avatarUrl)&&<div style={{color:RED,fontSize:10,textAlign:'center',fontWeight:600}}>{appLang==='FR'?'⬆ Télécharger une photo pour continuer':appLang==='EN'?'⬆ Upload profile photo to continue':'⬆ Profilbild hochladen um fortzufahren'}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs=[['swipe','🥊',t.fight],['chat','unread',t.chat],['ranking','🏆',t.rang],['gyms','🏋️',t.gyms],['stats','🧍',t.profil]];

  return(
    <ErrorBoundary>
    <div style={{minHeight:'100vh',background:darkMode?'#1a1a1a':'#f5f5f7',fontFamily:'DM Sans,sans-serif',display:'flex',flexDirection:'column'}} onMouseMove={dragMove} onMouseUp={dragEnd} onTouchMove={dragMove} onTouchEnd={dragEnd}>
      <style>{css}</style>
      {msg&&<div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:'#fff',border:'1px solid '+RED,borderRadius:20,padding:'8px 20px',color:'#1a1a1a',fontSize:13,zIndex:200,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.1)',whiteSpace:'nowrap'}}>{msg}</div>}

      {/* SLIDE-OUT MENU OVERLAY */}
      {showMenu&&(
        <div style={{position:'fixed',inset:0,zIndex:800,display:'flex'}}>
          <div onClick={()=>setShowMenu(false)} style={{flex:1,background:'rgba(0,0,0,0.45)'}}/>
          <div style={{width:255,background:darkMode?'#141414':'#fafafa',height:'100%',display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.18)',animation:'slideInRight 0.22s ease'}}>
            <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

            {/* Profil Header */}
            <div style={{padding:'22px 18px 14px',display:'flex',alignItems:'center',gap:11}}>
              {avatarPreview
                ?<img src={avatarPreview} style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:'2px solid '+RED}} alt=''/>
                :<div style={{width:42,height:42,borderRadius:'50%',background:RED+'18',border:'2px solid '+RED+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:darkMode?'#fff':'#111',fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile.name||'Fighter'}</div>
                <div style={{color:RED,fontSize:10,marginTop:1}}>{profile.style||''}</div>
              </div>
              <button onClick={()=>setShowMenu(false)} style={{background:'none',border:'none',color:darkMode?'#555':'#bbb',fontSize:16,cursor:'pointer',padding:4}}>✕</button>
            </div>

            <div style={{height:1,background:darkMode?'#222':'#efefef',margin:'0 18px'}}/>

            {/* Menu Items */}
            <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>

              {/* Navigations-Items */}
              {[
                {icon:'',label:'Events',action:()=>{setTab('events');setShowMenu(false);loadEvents(session);}},
                {icon:'',label:'Mein Profil',action:()=>{setTab('stats');setShowMenu(false);}},
                {icon:'',label:'Equipment',action:()=>{setShowEquipment(true);setShowMenu(false);}},
              ].map(item=>(
                <div key={item.label} onClick={item.action}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontSize:17,width:24,textAlign:'center',opacity:0.85}}>{item.icon}</div>
                  <div style={{color:darkMode?'#e0e0e0':'#222',fontSize:13,fontWeight:600}}>{item.label}</div>
                </div>
              ))}

              <div style={{height:1,background:darkMode?'#222':'#efefef',margin:'8px 18px'}}/>

              {/* BENACHRICHTIGUNGEN */}
              <div onClick={async()=>{
                if(!('Notification' in window)){showMsg('Nicht unterstützt');return;}
                if(Notification.permission==='granted'){showMsg('Benachrichtigungen aktiv 🔔');}
                else if(Notification.permission==='denied'){showMsg('In Browser-Einstellungen erlauben');}
                else{const p=await Notification.requestPermission();showMsg(p==='granted'?'Aktiviert! 🔔':'Abgelehnt');}
              }} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:17,width:24,textAlign:'center',opacity:0.85}}></div>
                  <div>
                    <div style={{color:darkMode?'#e0e0e0':'#222',fontSize:13,fontWeight:600}}>Benachrichtigungen</div>
                    <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{typeof Notification!=='undefined'&&Notification.permission==='granted'?'Aktiv':'Nicht aktiv'}</div>
                  </div>
                </div>
                <div style={{width:34,height:19,borderRadius:10,background:typeof Notification!=='undefined'&&Notification.permission==='granted'?'#27ae60':'#ccc',position:'relative',flexShrink:0}}>
                  <div style={{position:'absolute',top:2.5,left:typeof Notification!=='undefined'&&Notification.permission==='granted'?17:2.5,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </div>
              </div>

              {/* DARK MODE */}
              <div onClick={()=>setDarkMode(d=>!d)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:17,width:24,textAlign:'center',opacity:0.85}}></div>
                  <div style={{color:darkMode?'#e0e0e0':'#222',fontSize:13,fontWeight:600}}>Dark Mode</div>
                </div>
                <div style={{width:34,height:19,borderRadius:10,background:darkMode?RED:'#ccc',position:'relative',flexShrink:0}}>
                  <div style={{position:'absolute',top:2.5,left:darkMode?17:2.5,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </div>
              </div>

              {isAdmin&&(
                <div onClick={()=>{setShowAdmin(true);setShowMenu(false);}} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                  onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontSize:17,width:24,textAlign:'center'}}>⚙️</div>
                  <div style={{color:RED,fontSize:13,fontWeight:700}}>Admin Panel</div>
                </div>
              )}
            </div>
            {/* EINSTELLUNGEN IN SLIDEBAR */}
            <div style={{height:1,background:darkMode?'#222':'#efefef',margin:'8px 18px'}}/>
            <div onClick={()=>setShowSettings(s=>!s)}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
              onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:15,width:24,textAlign:'center',opacity:0.7}}></div>
                <div style={{color:darkMode?'#e0e0e0':'#444',fontSize:13,fontWeight:600}}>{t.settings}</div>
              </div>
              <div style={{color:'#aaa',fontSize:12,transform:showSettings?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s'}}>›</div>
            </div>
            {showSettings&&(
              <div style={{marginLeft:16}}>
                {[
                  {icon:'📋',label:t.impressum,action:()=>{setShowImpressum(true);setShowMenu(false);}},
                  {icon:'🔐',label:t.privacy,action:()=>{setShowDatenschutz(true);setShowMenu(false);}},
                  {icon:'📜',label:t.agb,action:()=>{setShowAGB(true);setShowMenu(false);}},
                  {icon:'🔑',label:t.changePw,action:()=>{setShowPwChange(true);setShowMenu(false);}},
                ].map(item=>(
                  <div key={item.label} onClick={item.action}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'9px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                    onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{fontSize:14,width:24,textAlign:'center',opacity:0.6}}>{item.icon}</div>
                    <div style={{color:darkMode?'#ccc':'#555',fontSize:12,fontWeight:500}}>{item.label}</div>
                  </div>
                ))}
                <div onClick={()=>{
                  if(!window.confirm('Account wirklich löschen?'))return;
                  if(!window.confirm('Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden!'))return;
                  (async()=>{
                    try{
                      await fetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      await fetch(SUPA_URL+'/rest/v1/matches?profile_a_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      await fetch(SUPA_URL+'/rest/v1/matches?profile_b_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+session.userId,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                      try{localStorage.clear();}catch{}
                      setSession(null);setMyProfile(null);setShowMenu(false);
                    }catch(e){showMsg('Fehler: '+e.message);}
                  })();
                }}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'9px 18px',cursor:'pointer',borderRadius:8,margin:'1px 8px'}}
                  onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontSize:14,width:24,textAlign:'center',opacity:0.6}}></div>
                  <div style={{color:'#e74c3c',fontSize:12,fontWeight:500}}>{t.deleteAccount}</div>
                </div>
              </div>
            )}

            {/* SPRACHE */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',borderTop:'1px solid '+(darkMode?'#222':'#efefef')}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:15,width:24,textAlign:'center',opacity:0.7}}></div>
                <div style={{color:darkMode?'#aaa':'#666',fontSize:12,fontWeight:600}}>Sprache</div>
              </div>
              <div style={{display:'flex',gap:3,background:darkMode?'#222':'#ebebeb',borderRadius:16,padding:3}}>
                {[['DE','🇩🇪'],['EN','🇬🇧'],['FR','🇫🇷']].map(([lang,flag])=>(
                  <button key={lang} onClick={()=>{setAppLang(lang);try{localStorage.setItem('fighter_lang',lang);}catch{}showMsg(lang==='DE'?'Deutsch 🇩🇪':lang==='FR'?'Français 🇫🇷':'English 🇬🇧');}}
                    style={{padding:'3px 9px',borderRadius:13,background:appLang===lang?(darkMode?'#333':'#fff'):'transparent',border:'none',color:appLang===lang?(darkMode?'#fff':'#111'):(darkMode?'#555':'#999'),fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s',boxShadow:appLang===lang?'0 1px 3px rgba(0,0,0,0.12)':'none'}}>
                    {flag} {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* FEEDBACK */}
            <div onClick={()=>{setShowFeedback(true);setShowMenu(false);}} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',cursor:'pointer',borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}
              onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#2a2a2a':'#f9f9f9'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontSize:20,width:28,textAlign:'center'}}>📩</div>
              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:15,fontWeight:600}}>{appLang==='EN'?'Send Feedback':'Feedback senden'}</div>
            </div>

            {/* Logout */}
            <div onClick={handleLogout} style={{padding:'10px 18px',borderTop:'1px solid '+(darkMode?'#222':'#efefef'),display:'flex',alignItems:'center',gap:12,cursor:'pointer',borderRadius:8,margin:'4px 8px 8px'}}
              onMouseEnter={e=>e.currentTarget.style.background=darkMode?'#222':'#f0f0f0'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{color:'#e74c3c',fontSize:13,fontWeight:600}}>{t.logout}</div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedback&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:900,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'24px 20px 40px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>{appLang==='EN'?'SEND FEEDBACK':'FEEDBACK SENDEN'}</div>
                <div style={{color:'#aaa',fontSize:11,marginTop:2}}>{appLang==='EN'?'Help us improve FighterApp':'Hilf uns FighterApp besser zu machen'}</div>
              </div>
              <button onClick={()=>{setShowFeedback(false);setFeedbackSent(false);setFeedbackText('');}} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#aaa'}}>✕</button>
            </div>
            {feedbackSent?(
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:48,marginBottom:12}}>🙏</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:2,marginBottom:6}}>{appLang==='EN'?'THANK YOU!':'DANKE!'}</div>
                <div style={{color:'#aaa',fontSize:13}}>{appLang==='EN'?'Your feedback helps us improve.':'Dein Feedback hilft uns die App zu verbessern.'}</div>
                <button onClick={()=>{setShowFeedback(false);setFeedbackSent(false);setFeedbackText('');}}
                  style={{marginTop:20,padding:'12px 32px',borderRadius:10,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                  {appLang==='EN'?'CLOSE':'SCHLIESSEN'}
                </button>
              </div>
            ):(
              <>
                <textarea
                  value={feedbackText}
                  onChange={e=>setFeedbackText(e.target.value)}
                  placeholder={appLang==='EN'?'What do you like? What should we improve? Ideas for new features...':'Was gefällt dir? Was sollen wir verbessern? Ideen für neue Features...'}
                  rows={5}
                  style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif',resize:'none',boxSizing:'border-box',marginBottom:12}}
                />
                <button onClick={async()=>{
                  if(!feedbackText.trim()){showMsg(appLang==='EN'?'Please enter feedback':'Bitte Feedback eingeben');return;}
                  try{
                    await fetch(SUPA_URL+'/rest/v1/feedback',{
                      method:'POST',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                      body:JSON.stringify({user_id:myProfile?.id,user_name:profile.name,message:feedbackText.trim(),lang:appLang,created_at:new Date().toISOString()})
                    });
                  }catch{}
                  setFeedbackSent(true);
                }} disabled={!feedbackText.trim()}
                  style={{width:'100%',padding:'14px',borderRadius:10,background:feedbackText.trim()?`linear-gradient(135deg,${RED},#e74c3c)`:'#eee',border:'none',color:feedbackText.trim()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:feedbackText.trim()?'pointer':'not-allowed'}}>
                  {appLang==='EN'?'SEND 📩':'SENDEN 📩'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FEEDBACK & WÜNSCHE MODAL ── */}
      {showFeedbackModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:900,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'24px 20px 44px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:2}}>FEEDBACK & WÜNSCHE</div>
                <div style={{color:'#aaa',fontSize:11,marginTop:2}}>Hilf uns Fighter App besser zu machen</div>
              </div>
              <button onClick={()=>setShowFeedbackModal(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#aaa'}}>✕</button>
            </div>
            {feedbackSent?(
              <div style={{textAlign:'center',padding:'24px 0'}}>
                <div style={{fontSize:52,marginBottom:12}}>🙏</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:2,marginBottom:6}}>DANKE!</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.7}}>Dein {feedbackType==='wunsch'?'Wunsch':'Feedback'} wurde gesendet. Wir lesen alles!</div>
                <button onClick={()=>{setShowFeedbackModal(false);setFeedbackSent(false);setFeedbackText('');}}
                  style={{marginTop:20,padding:'12px 32px',borderRadius:10,background:`linear-gradient(135deg,#c0392b,#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                  SCHLIESSEN
                </button>
              </div>
            ):(
              <div>
                {/* Type Toggle */}
                <div style={{display:'flex',gap:8,marginBottom:16,background:darkMode?'#2a2a2a':'#f0f0f0',borderRadius:12,padding:4}}>
                  {[['feedback','💬 Feedback'],['wunsch','⭐ Wunsch / Idee']].map(([type,label])=>(
                    <button key={type} onClick={()=>setFeedbackType(type)}
                      style={{flex:1,padding:'10px',borderRadius:9,background:feedbackType===type?(darkMode?'#1a1a1a':'#fff'):'transparent',border:'none',color:feedbackType===type?(darkMode?'#fff':'#1a1a1a'):(darkMode?'#666':'#aaa'),fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s',boxShadow:feedbackType===type?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{color:'#aaa',fontSize:11,marginBottom:8}}>
                  {feedbackType==='wunsch'?'Was wünschst du dir für die App? Neue Features, Verbesserungen...':'Was läuft gut? Was soll besser werden?'}
                </div>
                <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)}
                  placeholder={feedbackType==='wunsch'?'z.B. Ich wünsche mir eine Funktion für...':'z.B. Das Matching könnte...'}
                  rows={5} style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif',resize:'none',boxSizing:'border-box',marginBottom:12}}/>
                <button onClick={async()=>{
                  if(!feedbackText.trim()){showMsg('Bitte Text eingeben');return;}
                  try{
                    await fetch(SUPA_URL+'/rest/v1/feedback',{
                      method:'POST',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+(session?.token||SUPA_KEY),Prefer:'return=minimal'},
                      body:JSON.stringify({user_id:myProfile?.id||null,user_name:profile.name||'Unbekannt',message:feedbackText.trim(),type:feedbackType,lang:appLang,read:false,created_at:new Date().toISOString()})
                    });
                  }catch(e){console.error('feedback',e);}
                  setFeedbackSent(true);
                }} disabled={!feedbackText.trim()}
                  style={{width:'100%',padding:'14px',borderRadius:10,background:feedbackText.trim()?`linear-gradient(135deg,#c0392b,#e74c3c)`:'#eee',border:'none',color:feedbackText.trim()?'#fff':'#aaa',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:feedbackText.trim()?'pointer':'not-allowed'}}>
                  {feedbackType==='wunsch'?'⭐ WUNSCH SENDEN':'💬 FEEDBACK SENDEN'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EQUIPMENT MODAL ── */}
      {showEquipment&&(
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f5f5f7',zIndex:900,display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee'),position:'sticky',top:0,zIndex:10}}>
            <button onClick={()=>setShowEquipment(false)} style={{background:'none',border:'none',color:RED,fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>←</button>
            <div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:20,letterSpacing:3}}>EQUIPMENT</div>
              <div style={{color:'#aaa',fontSize:11}}>{appLang==='FR'?'Équipement arts martiaux':appLang==='EN'?'Top Combat Sports Equipment':'Top Kampfsport-Ausrüstung'}</div>
            </div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%'}}>
            <EquipmentScreen darkMode={darkMode} appLang={appLang} SUPA_URL={SUPA_URL} SUPA_KEY={SUPA_KEY}
              onSuggest={()=>{setFeedbackType('wunsch');setFeedbackText('Equipment Empfehlung: ');setShowEquipment(false);setShowFeedbackModal(true);setFeedbackSent(false);}}/>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px 8px',flexShrink:0,borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),background:darkMode?'#1a1a1a':'#fff'}}>
        <div style={{width:36,height:36}}/>
        <div className='rj' style={{fontSize:28,color:darkMode?'#ff4500':'#1a1a1a',letterSpacing:5,position:'absolute',left:'50%',transform:'translateX(-50%)'}}>FIGHTER</div>
        <button onClick={()=>setShowMenu(true)} style={{background:'none',border:'none',cursor:'pointer',width:36,height:36,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,borderRadius:8,marginLeft:'auto'}}>
          <div style={{width:20,height:2,background:darkMode?'#fff':'#1a1a1a',borderRadius:2}}/>
          <div style={{width:20,height:2,background:darkMode?'#fff':'#1a1a1a',borderRadius:2}}/>
          <div style={{width:20,height:2,background:darkMode?'#fff':'#1a1a1a',borderRadius:2}}/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',paddingBottom:65}}>

        {tab==='swipe'&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8}}>
            {/* LAND FILTER */}
            <div style={{display:'flex',gap:4,marginBottom:6,width:'calc(100% - 24px)',maxWidth:420,justifyContent:'center'}}>
              <button onClick={()=>setCountryFilter('mine')} style={{padding:'3px 12px',borderRadius:20,background:'transparent',border:'none',color:countryFilter==='mine'?(darkMode?'#fff':'#1a1a1a'):(darkMode?'#444':'#ccc'),fontSize:11,fontWeight:countryFilter==='mine'?700:400,cursor:'pointer',transition:'all 0.2s'}}>
                {({'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[profile.country||'DE']||'🌍')} {t.myCountry}
              </button>
              <div style={{width:1,background:darkMode?'#333':'#e0e0e0',margin:'4px 0'}}/>
              <button onClick={()=>setCountryFilter('world')} style={{padding:'3px 12px',borderRadius:20,background:'transparent',border:'none',color:countryFilter==='world'?(darkMode?'#fff':'#1a1a1a'):(darkMode?'#444':'#ccc'),fontSize:11,fontWeight:countryFilter==='world'?700:400,cursor:'pointer',transition:'all 0.2s'}}>
                {t.worldwide}
              </button>
            </div>
            {/* WER HAT MICH GELIKET Banner */}
            {whoLikedMe.length>0&&(newLikesCount>0||!likesBannerSeen)&&(
              <div onClick={()=>{
                setWhoLikedTab(true);
                setNewLikesCount(0);
                const now=new Date().toISOString();
                setLikesBannerSeen(now);
                try{localStorage.setItem('fighter_likes_check',now);setLastLikesCheck(now);localStorage.setItem('fighter_banner_seen',now);}catch{}
              }} style={{width:'calc(100% - 24px)',maxWidth:420,marginBottom:6,background:'transparent',border:'1px solid '+RED+'33',borderRadius:8,padding:'6px 12px',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <div style={{fontSize:14}}>❤️</div>
                <div style={{flex:1,color:darkMode?'#aaa':'#888',fontSize:11}}>{whoLikedMe.length} {t.interestBanner}</div>
                {newLikesCount>0&&<div style={{background:RED,color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{newLikesCount}</div>}
              </div>
            )}
            <div style={{width:'calc(100% - 24px)',maxWidth:380,margin:'0 0 8px',background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:9,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {avatarPreview?<img src={avatarPreview} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+RED}} alt='me'/>
                :<div style={{fontSize:20,width:36,height:36,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center'}}>🥊</div>}
              <div style={{flex:1}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{profile.name}, {profile.age} - {profile.city}</div>
                <div style={{color:RED,fontSize:11,marginTop:1}}>{profile.style} - {profile.weightClass?profile.weightClass.split(' (')[0]:''}</div>
              </div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'right'}}>{profile.height}cm<br/>{profile.weight}kg</div>
            </div>
            {/* FILTER LEISTE - leer, kein Stil-Filter in Swipe Tab */}
            <div style={{position:'relative',width:330,height:430,flexShrink:0,touchAction:'none'}}>
              {filteredCards.length===0?(
                <div style={{width:'100%',height:'100%',borderRadius:20,background:'linear-gradient(160deg,#1a1a1a 0%,#2d1a1a 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'30px 24px',textAlign:'center'}}>
                  <div style={{fontSize:64,marginBottom:4}}>🏆</div>
                  <div className='rj' style={{color:'#fff',fontSize:26,letterSpacing:3,lineHeight:1}}>{t.allFightersSeen}</div>
                  <div className='rj' style={{color:RED,fontSize:26,letterSpacing:3,lineHeight:1}}>{t.allFightersSeen2}</div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:6,lineHeight:1.6}}>{filterWeightClass&&myWeightClass?`Keine Fighter in deiner Nähe gefunden.`:`Alle Fighter wurden gesehen! Neue kommen täglich dazu.`}</div>
                  <div style={{display:'flex',gap:12,marginTop:8,width:'100%'}}>
                    <button onClick={async()=>{setSwStats({ch:0,de:0});if(session&&myProfile){await loadRealFighters(session,myProfile);}}} style={{flex:1,padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer'}}>
                      🔄 NEUE FIGHTER
                    </button>
                    <button onClick={()=>setTab('chat')} style={{flex:1,padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer'}}>
                      💬 CHATS
                    </button>
                  </div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:4}}>{appLang==='FR'?'Conseil: Double-tap sur une carte = voir le profil':appLang==='EN'?'Tip: Double-tap a card = view profile':'Tipp: Doppel-Tap auf eine Karte = Profil ansehen'}</div>
                </div>
              ):filteredCards.map((f,idx)=>{
                if(!f||!f.id||!f.name)return null;
                const isTop=idx===filteredCards.length-1;const isSec=idx===filteredCards.length-2;const fA=f.accent||'#c0392b';
                return(
                  <div key={f.id} onMouseDown={isTop?(e)=>{e.preventDefault();dragStart(e);}:undefined} onTouchStart={e=>{
                      if(isTop){
                        if(!e.touches||!e.touches[0])return;
                        const now=Date.now();
                        if(now-lastTapRef.current<300){setViewProfile(f);lastTapRef.current=0;}
                        else{lastTapRef.current=now;dragStart(e);}
                      }
                    }}
                    style={{position:'absolute',inset:0,borderRadius:16,background:'#111',boxShadow:isTop?'0 8px 32px rgba(0,0,0,0.2)':'none',cursor:isTop?'grab':'default',zIndex:isTop?10:isSec?5:1,transform:isTop?cStyle.transform:isSec?'scale(0.96) translateY(10px)':'scale(0.92) translateY(20px)',transition:isTop?cStyle.transition:'none',overflow:'hidden',userSelect:'none'}}>
                    {f.avatar_url
                      ?<img src={f.avatar_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:(f.img_pos_x||50)+'% '+(f.img_pos_y||30)+'%'}} alt={f.name}/>
                      :<div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,${fA}55 0%,#111 100%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:120}}>{f.emoji||''}</div>
                    }
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.95) 100%)'}}/>
                    {isTop&&(<>
                      <div style={{position:'absolute',top:22,left:18,border:'3px solid #27ae60',borderRadius:6,padding:'3px 12px',color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,letterSpacing:3,transform:'rotate(-18deg)',opacity:fop,transition:drag?'none':'opacity 0.12s'}}>FIGHT</div>
                      <div style={{position:'absolute',top:22,right:18,border:'3px solid '+RED,borderRadius:6,padding:'3px 12px',color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,letterSpacing:3,transform:'rotate(18deg)',opacity:pop,transition:drag?'none':'opacity 0.12s'}}>PASS</div>
                      <div onClick={e=>{e.stopPropagation();setViewProfile(f);}} style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.45)',borderRadius:20,padding:'4px 12px',display:'flex',alignItems:'center',gap:5,cursor:'pointer',backdropFilter:'blur(4px)'}}>
                        <span style={{fontSize:12}}>👁</span>
                        <span style={{color:'rgba(255,255,255,0.85)',fontSize:10,fontWeight:600,letterSpacing:0.5}}>{t.profileSeen}</span>
                      </div>
                    </>)}
                    {isTop&&f.last_seen&&<div style={{position:'absolute',top:12,left:12,background:'rgba(0,0,0,0.55)',borderRadius:20,padding:'3px 10px',backdropFilter:'blur(4px)',zIndex:2}}><div style={{color:'#fff',fontSize:10,fontWeight:600}}>{getLastSeen(f.last_seen)}</div></div>}
                    <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'12px 16px 16px'}}> 
                      <div style={{display:'flex',gap:8,marginBottom:8}}>
                        {[{v:f.wins||0,l:'SIEGE',c:'#27ae60'},{v:f.losses||0,l:'NIEDER',c:'#e74c3c'},{v:f.draws||0,l:'UNENTSCH',c:'#d4a017'},{v:f.ko||0,l:'KOs',c:'#e74c3c'}].map(({v,l,c})=>(
                          <div key={l} style={{textAlign:'center',background:'rgba(0,0,0,0.5)',borderRadius:8,padding:'4px 8px'}}>
                            <div className='rj' style={{color:c,fontSize:18,lineHeight:1}}>{v}</div>
                            <div style={{color:'rgba(255,255,255,0.55)',fontSize:7,letterSpacing:1}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div className='rj' style={{color:'#fff',fontSize:26,letterSpacing:1.5,lineHeight:1}}>
                            {f.name}{f.age?<span style={{fontSize:19,opacity:0.75}}>, {f.age}</span>:null}
                          </div>
                          <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap'}}>
                            {f.style&&<div style={{background:fA,borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>{f.style}</div>}
                            {(f.weight_class||f.weightClass)&&<div style={{background:(f.weight_class||f.weightClass)===myWeightClass?'rgba(211,84,0,0.7)':'rgba(255,255,255,0.2)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:(f.weight_class||f.weightClass)===myWeightClass?700:400}}>⚖️ {(f.weight_class||f.weightClass||'').split(' (')[0]}{(f.weight_class||f.weightClass)===myWeightClass?' ✓':''}</div>}
                            {f.is_pro&&<div style={{background:'#d4a01733',borderRadius:20,padding:'2px 10px',color:'#d4a017',fontSize:11,fontWeight:700}}>⭐ PROFI</div>}
                          {f.country&&f.country!=='DE'&&f.country!=='OTHER'&&<div style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'2px 8px',color:'#fff',fontSize:13}}>{{'AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[f.country]||'🌍'}</div>}
                          {f.city&&<div style={{background:f._sameCity?'rgba(39,174,96,0.3)':'rgba(255,255,255,0.2)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11}}>📍 {f.city}{f._dist&&f._dist<500&&!f._sameCity?' · '+f._dist+'km':''}{f._sameCity?' · Deine Stadt':''}</div>}
                          {f._sameStyle&&<div style={{background:'rgba(192,57,43,0.5)',border:'1px solid rgba(192,57,43,0.7)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>🥊 Gleicher Stil</div>}
                       {f._sameWC&&<div style={{background:'rgba(212,160,23,0.5)',border:'1px solid rgba(212,160,23,0.7)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>⚖️ Gleiche Klasse</div>}
                       {f._sameCity&&!f._sameStyle&&<div style={{background:'rgba(39,174,96,0.5)',border:'1px solid rgba(39,174,96,0.7)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11,fontWeight:700}}>📍 In deiner Nähe</div>}
                          </div>
                          {f.bio&&<div style={{color:'rgba(255,255,255,0.5)',fontSize:10,marginTop:5,fontStyle:'italic'}}>"{f.bio}"</div>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0,marginLeft:10}}>
                          {f.height&&<div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{f.height} cm</div>}
                          {f.weight&&<div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{f.weight} kg</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cards.length>0&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginTop:10}}>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  <Btn onClick={()=>doSwipe('de')} color={RED} icon='✕' size={54}/>
                  {lastSwiped&&<Btn onClick={undoSwipe} color='rgba(255,255,255,0.2)' icon='↩️' size={46}/>}
                  <Btn onClick={()=>doSwipe('ch')} color='#27ae60' icon='⚔️' size={64} primary label='FIGHT'/>
                  <Btn onClick={()=>doSwipe('ch')} color='#d4a017' icon='⭐' size={54}/>
                </div>
                {recentSwiped.length>0&&(
                  <div style={{padding:'4px 16px 0',width:'100%',maxWidth:420}}>
                    <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:2,marginBottom:6,textAlign:'center',fontWeight:700}}>{t.recentlySeen}</div>
                    <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                      {recentSwiped.map((s,i)=>(
                        <div key={i} onClick={()=>setViewProfile(s.profile)} style={{position:'relative',cursor:'pointer'}}>
                          <div style={{width:44,height:44,borderRadius:10,overflow:'hidden',border:'2px solid '+(s.dir==='like'?'#27ae60':RED)}}>
                            {s.profile.avatar_url?<img src={s.profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='' onError={e=>{e.target.style.display='none'}}/>:<div style={{width:'100%',height:'100%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🥊</div>}
                          </div>
                          <div style={{position:'absolute',bottom:-2,right:-2,fontSize:8,background:s.dir==='like'?'#27ae60':RED,borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700}}>{s.dir==='like'?'✓':'✕'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}


        {tab==='chat'&&(
          <div style={{padding:'14px',maxWidth:420,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3}}>{t.messages}</div>
              {dbMatches.length>0&&<div style={{color:'#aaa',fontSize:11}}>{dbMatches.length} Match{dbMatches.length!==1?'es':''}</div>}
            </div>
            {dbMatches.length>3&&(
              <div style={{position:'relative',marginBottom:10}}>
                <input
                  value={chatSearch}
                  onChange={e=>setChatSearch(e.target.value)}
                  placeholder={t.searchFighter}
                  style={{width:'100%',padding:'9px 12px 9px 36px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#1a1a1a':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}
                />
                <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#aaa',fontSize:14}}>🔍</div>
                {chatSearch&&<div onClick={()=>setChatSearch('')} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#aaa',cursor:'pointer',fontSize:14}}>✕</div>}
              </div>
            )}
            {matchesLoading&&dbMatches.length===0?(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,padding:'13px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:12,opacity:1-i*0.2}}>
                    <div style={{width:54,height:54,borderRadius:'50%',background:darkMode?'#2a2a2a':'#f0f0f0',flexShrink:0,animation:'pulse 1.5s infinite'}}/>
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
                      <div style={{height:14,borderRadius:7,background:darkMode?'#2a2a2a':'#f0f0f0',width:'60%',animation:'pulse 1.5s infinite'}}/>
                      <div style={{height:10,borderRadius:5,background:darkMode?'#222':'#f5f5f5',width:'40%',animation:'pulse 1.5s infinite'}}/>
                    </div>
                  </div>
                ))}
              </div>
            ):dbMatches.length===0?(
              <div style={{textAlign:'center',padding:'48px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                <div style={{fontSize:70,marginBottom:4}}>🥊</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>{t.noMatches}</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.8,maxWidth:260,textAlign:'center'}}>{t.noMatchesSub}</div>
                <button onClick={()=>setTab('swipe')} style={{marginTop:10,padding:'14px 32px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:'pointer',boxShadow:'0 4px 16px rgba(192,57,43,0.3)'}}>
                  ⚔️ JETZT SWIPEN
                </button>
                <div style={{color:'#ddd',fontSize:11,marginTop:2}}>{t.newFightersDaily}</div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {dbMatches.filter(m=>{
                  if(!chatSearch)return true;
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return false;
                  const q=chatSearch.toLowerCase();
                  return (other.name||'').toLowerCase().includes(q)||(other.city||'').toLowerCase().includes(q)||(other.style||'').toLowerCase().includes(q);
                }).map(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return null;
                  const ac=(other?.style||'')==='Boxing'?'#c0392b':(other?.style||'')==='MMA'?'#2980b9':'#27ae60';
                  if(!m.id)return null;
                  return(
                    <div key={m.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,border:'1px solid '+ac+'33',overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                      <div style={{height:3,background:'linear-gradient(90deg,'+ac+',transparent)'}}/>
                      <div style={{padding:'13px',display:'flex',alignItems:'center',gap:12}}>
                        <div onClick={()=>setViewProfile(other)} style={{cursor:'pointer',flexShrink:0}}>
                          {other.avatar_url?<img src={other.avatar_url} style={{width:54,height:54,borderRadius:'50%',objectFit:'cover',border:'2px solid '+ac+'44'}} alt={other.name}/>
                          :<div style={{width:54,height:54,borderRadius:'50%',background:ac+'18',border:'2px solid '+ac+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🥊</div>}
                        </div>
                        <div style={{flex:1}} onClick={()=>setViewProfile(other)} >
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:1}}>{other.name}</div>
                          </div>
                          <div style={{color:ac,fontSize:11,fontWeight:700}}>{other.style} · {other.city}</div>
                          {m.last_message_text?(
                            <div style={{color:darkMode?'#555':'#aaa',fontSize:11,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:160}}>
                              {m.last_message_text.startsWith('⚔️')?'⚔️ Fight Request':m.last_message_text.startsWith('✅')?'✅ Angenommen':m.last_message_text.startsWith('❌')?'❌ Abgelehnt':m.last_message_text}
                            </div>
                          ):(
                            <div style={{color:'#ccc',fontSize:11,marginTop:2,fontStyle:'italic'}}>{appLang==='FR'?'Pas encore de messages':appLang==='EN'?'No messages yet':'Noch keine Nachrichten'}</div>
                          )}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{color:'#ccc',fontSize:10}}>{m.last_message_at?new Date(m.last_message_at).toLocaleDateString('de',{day:'2-digit',month:'2-digit'}):''}</div>
                        </div>
                        <div onClick={()=>setActiveChat(m)} style={{padding:'9px 16px',borderRadius:8,background:'linear-gradient(135deg,#c0392b,#e74c3c)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>CHAT →</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab==='stats'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            {/* EDIT MODAL */}
            {editMode&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 40px',maxHeight:'85vh',overflowY:'auto'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                    <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>PROFIL BEARBEITEN</div>
                    <button onClick={()=>setEditMode(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#aaa'}}>✕</button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {/* FOTO ÄNDERN */}
                    <div style={{textAlign:'center',marginBottom:4}}>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>PROFILBILD</div>
                      <label style={{cursor:'pointer',display:'inline-block',position:'relative'}}>
                        <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                          const file=e.target.files[0];if(!file||!session)return;
                          showMsg('Foto wird hochgeladen...');
                          const compressed=await compressImage(file,800,0.82);
                          const path='fighter_'+session.userId+'_'+Date.now()+'.jpg';
                          const url=await uploadPhoto(compressed,path,session.token);
                          if(url){
                            setAvatarUrl(url);setAvatarPreview(url);
                            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                              method:'PATCH',
                              headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                              body:JSON.stringify({avatar_url:url})
                            });
                            showMsg('Foto geändert ✓');
                          }
                        }}/>
                        <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',border:'3px solid '+RED,background:'#f0f0f0',margin:'0 auto',position:'relative'}}>
                          {avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>👤</div>}
                          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:18}}>📷</span>
                          </div>
                        </div>
                        <div style={{color:RED,fontSize:11,marginTop:5,fontWeight:700}}>Foto ändern</div>
                      </label>
                    </div>
                    {[['NAME *','name','text',profile.name],['STADT *','city','text',profile.city],['GYM','gym','text',profile.gym],['GRÖSSE (cm)','height','number',profile.height],['GEWICHT (kg)','weight','number',profile.weight],['BIO','bio','text',profile.bio],['INSTAGRAM / YOUTUBE','socialUrl','text',profile.socialUrl]].map(([label,key,type,current])=>(
                      <div key={key}>
                        <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{label}</div>
                        <input type={type} defaultValue={current||''} onChange={e=>setEditProfile(p=>({...p,[key]:e.target.value}))}
                          style={{width:'100%',padding:'11px 13px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}/>
                      </div>
                    ))}
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>KAMPFSTIL</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {STYLES.map(s=>(
                          <button key={s} onClick={()=>setEditProfile(p=>({...p,style:s}))}
                            style={{padding:'7px 13px',borderRadius:20,background:(editProfile.style||profile.style)===s?RED:'transparent',border:'1px solid '+((editProfile.style||profile.style)===s?RED:(darkMode?'#333':'#ddd')),color:(editProfile.style||profile.style)===s?'#fff':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:700,cursor:'pointer'}}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>GEWICHTSKLASSE</div>
                      <select defaultValue={profile.weightClass||''} onChange={e=>setEditProfile(p=>({...p,weightClass:e.target.value}))}
                        style={{width:'100%',padding:'11px 13px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontFamily:'DM Sans,sans-serif'}}>
                        <option value=''>{appLang==='FR'?'Choisir':appLang==='EN'?'Please select':'Bitte wählen'}</option>
                        {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>GESCHLECHT</div>
                      <div style={{display:'flex',gap:8,marginBottom:12}}>
                        {[['Mann','♂️','male'],['Frau','♀️','female'],['Divers','⚧️','other']].map(([label,icon,val])=>(
                          <button key={val} onClick={()=>setEditProfile(p=>({...p,gender:val}))}
                            style={{flex:1,padding:'8px 4px',borderRadius:10,border:'2px solid '+((editProfile.gender!==undefined?editProfile.gender:(profile.gender||'male'))===val?RED:(darkMode?'#333':'#e0e0e0')),background:(editProfile.gender!==undefined?editProfile.gender:(profile.gender||'male'))===val?'#fdf0ef':'transparent',cursor:'pointer',textAlign:'center'}}>
                            <div style={{fontSize:18}}>{icon}</div>
                            <div style={{color:(editProfile.gender!==undefined?editProfile.gender:(profile.gender||'male'))===val?RED:(darkMode?'#aaa':'#555'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12}}>{label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>LEVEL</div>
                      <div style={{display:'flex',gap:8}}>
                        {[['Amateur','🥋',false],['Profi','⭐',true]].map(([label,icon,val])=>(
                          <button key={label} onClick={()=>setEditProfile(p=>({...p,isPro:val}))}
                            style={{flex:1,padding:'10px',borderRadius:10,border:'2px solid '+((editProfile.isPro!==undefined?editProfile.isPro:profile.isPro)===val?RED:(darkMode?'#333':'#e0e0e0')),background:(editProfile.isPro!==undefined?editProfile.isPro:profile.isPro)===val?'#fdf0ef':'transparent',cursor:'pointer'}}>
                            <div style={{fontSize:18}}>{icon}</div>
                            <div style={{color:(editProfile.isPro!==undefined?editProfile.isPro:profile.isPro)===val?RED:(darkMode?'#aaa':'#555'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13}}>{label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={saveEditProfile} disabled={savingEdit}
                      style={{width:'100%',marginTop:6,padding:'14px',borderRadius:12,background:savingEdit?'#eee':`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:savingEdit?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:savingEdit?'not-allowed':'pointer'}}>
                      {savingEdit?'Speichern...':'SPEICHERN'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:11,textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',position:'relative'}}>
              <div style={{position:'absolute',top:12,right:12,display:'flex',gap:6,alignItems:'center'}}>
                <button onClick={()=>{
                  const shareText=`⚔️ ${profile.name} auf Fighter\n${profile.style} · ${profile.weightClass?profile.weightClass.split(' (')[0]:''}\n📍 ${profile.city}\n\nSchau dir mein Profil an: https://fighterapp.de`;
                  if(navigator.share){navigator.share({title:'Fighter — '+profile.name,text:shareText,url:'https://fighterapp.de'});}
                  else{navigator.clipboard?.writeText(shareText);showMsg('Profil-Link kopiert! 📋');}
                }} style={{background:'none',border:'none',color:darkMode?'#666':'#aaa',fontSize:16,cursor:'pointer',padding:'4px'}}>
                  🔗
                </button>
                <button onClick={()=>{setEditProfile({});setEditMode(true);}} style={{background:'none',border:'none',color:darkMode?'#666':'#aaa',fontSize:20,cursor:'pointer',padding:'4px 4px',letterSpacing:2}}>
                  ···
                </button>
              </div>
              <div style={{position:'relative',display:'inline-block',marginBottom:10}}>
                <label style={{cursor:'pointer'}}>
                  <input type='file' accept='image/*' onChange={handlePhoto} style={{display:'none'}}/>
                  <div style={{width:160,height:160,borderRadius:16,background:'#f0f0f0',border:'3px solid '+(avatarPreview?RED:'#ddd'),overflow:'hidden',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {uploading?<div style={{fontSize:24}} className='spin'>⏳</div>:avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt='avatar'/>:<div style={{fontSize:32}}>👤</div>}
                  </div>
                  <div style={{position:'absolute',bottom:0,right:0,background:RED,borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📷</div>
                </label>
              </div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>{profile.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2,justifyContent:'center',flexWrap:'wrap'}}><span style={{color:RED,fontSize:13,fontWeight:600}}>{profile.style}</span>{profile.style&&profile.weightClass&&<span style={{color:'#aaa',fontSize:13}}>·</span>}<span style={{color:RED,fontSize:13,fontWeight:600}}>{profile.weightClass?profile.weightClass.split(' (')[0]:''}</span>{profile.gender&&profile.gender!=='male'&&<span style={{background:profile.gender==='female'?'#e8197818':'#8e44ad18',borderRadius:20,padding:'2px 8px',color:profile.gender==='female'?'#e81978':'#8e44ad',fontSize:11,fontWeight:700}}>{profile.gender==='female'?'♀️ Frau':'⚧️ Divers'}</span>}</div>
              <div style={{color:darkMode?'#666':'#999',fontSize:11,marginTop:3}}>📍 {profile.city} - 🏋️ {profile.gym} · {({'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[profile.country||'DE']||'🌍')}</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:5,background:profile.isPro?'#d4a01718':'#2980b918',border:'1px solid '+(profile.isPro?'#d4a01744':'#2980b944'),borderRadius:20,padding:'3px 10px',marginTop:6,marginRight:4}}>
                <span style={{color:profile.isPro?'#d4a017':'#2980b9',fontSize:11,fontWeight:700}}>{profile.isPro?'⭐ PROFI':'🥋 AMATEUR'}</span>
              </div>
              {gymVerified&&(
                <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#27ae6018',border:'1px solid #27ae6044',borderRadius:20,padding:'3px 10px',marginTop:6}}>
                  <span style={{fontSize:13}}>{gymVerified.gymEmoji}</span>
                  <span style={{color:'#27ae60',fontSize:11,fontWeight:700}}>✅ Verifiziertes Mitglied · {gymVerified.gymName}</span>
                </div>
              )}
              {profile.bio&&<div style={{color:'#aaa',fontSize:12,marginTop:6,fontStyle:'italic'}}>'{profile.bio}'</div>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:9}}>
              {[['SIEGE',stats.wins,'#27ae60'],['NIEDERLAGEN',stats.losses,RED],['UNENTSCHIEDEN',stats.draws,'#d4a017']].map(([label,val,color])=>(
                <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:11,padding:'13px 5px',textAlign:'center',border:'1px solid '+color+'33',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div className='rj' style={{color:color,fontSize:36,lineHeight:1}}>{val}</div>
                  <div style={{color:'#bbb',fontSize:8,letterSpacing:1,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:9}}>
              {[['KO / TKO',stats.ko,RED,'KO-Rate: '+kr+'%',kr],['SIEGRATE',wr+'%','#27ae60',tf+' Kaempfe',wr]].map(([label,val,color,sub,pct])=>(
                <div key={label} style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{color:'#bbb',fontSize:9,letterSpacing:2}}>{label}</div>
                  <div className='rj' style={{color:color,fontSize:30,marginTop:3}}>{val}</div>
                  <div style={{color:'#ccc',fontSize:10,marginTop:2}}>{sub}</div>
                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:2}}/></div>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:11,padding:'13px',border:'1px solid #eee',marginBottom:9}}>
              <div style={{color:'#ccc',fontSize:9,letterSpacing:2,marginBottom:11}}>REKORD BEARBEITEN</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5}}>
                {[['wins','SIEGE','#27ae60'],['losses','NIEDER',RED],['draws','UNENTSCH','#d4a017'],['ko','KOs',RED]].map(([key,label,color])=>(
                  <div key={key} style={{textAlign:'center'}}>
                    <div style={{color:'#ccc',fontSize:8,marginBottom:3}}>{label}</div>
                    <button onClick={()=>setStats(s=>({...s,[key]:s[key]+1}))} style={{width:'100%',background:'#f5f5f5',border:'1px solid '+color+'22',borderRadius:4,color:color,fontSize:13,cursor:'pointer',padding:'3px 0',marginBottom:3}}>+</button>
                    <div className='rj' style={{color:color,fontSize:20}}>{stats[key]}</div>
                    <button onClick={()=>setStats(s=>({...s,[key]:Math.max(0,s[key]-1)}))} style={{width:'100%',background:'#f5f5f5',border:'1px solid #eee',borderRadius:4,color:'#ccc',fontSize:13,cursor:'pointer',padding:'3px 0',marginTop:3}}>−</button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} style={{width:'100%',padding:'14px',borderRadius:10,background:saving?'#eee':`linear-gradient(135deg,${RED},${LIGHT_RED})`,border:'none',color:saving?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:saving?'not-allowed':'pointer',transition:'all 0.2s'}}>
              {saving?t.saving:t.saveProfil}
            </button>
            {/* VERIFIZIERTER KAMPFREKORD */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginTop:8,marginBottom:8}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:10}}>🏅 KAMPFREKORD VERIFIZIEREN</div>
              <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Lade ein Foto deiner Urkunde, Medaille oder eines offiziellen Kampfergebnisses hoch. Dein Rekord bekommt dann ein ✅ Verifiziert-Badge.</div>
              <label style={{cursor:'pointer',display:'block'}}>
                <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                  const file=e.target.files[0];if(!file||!session)return;
                  showMsg('Wird hochgeladen...');
                  const compressed=await compressImage(file,1200,0.85);
                  const path='record_'+session.userId+'_'+Date.now()+'.jpg';
                  const url=await uploadPhoto(compressed,path,session.token);
                  if(url){
                    await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                      method:'PATCH',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                      body:JSON.stringify({record_proof_url:url,record_verified:'pending'})
                    });
                    showMsg('✅ Nachweis hochgeladen! Wird innerhalb 48h geprüft.');
                  }else showMsg('Upload fehlgeschlagen');
                }}/>
                <div style={{background:darkMode?'#111':'#f5f5f5',border:'1.5px dashed '+(myProfile?.record_verified==='verified'?'#27ae60':myProfile?.record_verified==='pending'?'#d4a017':'#ccc'),borderRadius:10,padding:'14px',textAlign:'center'}}>
                  {myProfile?.record_verified==='verified'?(
                    <div><div style={{fontSize:24}}>✅</div><div style={{color:'#27ae60',fontWeight:700,fontSize:12,marginTop:4}}>REKORD VERIFIZIERT</div></div>
                  ):myProfile?.record_verified==='pending'?(
                    <div><div style={{fontSize:24}}>⏳</div><div style={{color:'#d4a017',fontWeight:700,fontSize:12,marginTop:4}}>WIRD GEPRÜFT</div><div style={{color:'#aaa',fontSize:10,marginTop:2}}>Bis zu 48 Stunden</div></div>
                  ):(
                    <div><div style={{fontSize:24}}>📄</div><div style={{color:darkMode?'#aaa':'#888',fontSize:12,marginTop:4}}>Urkunde / Medaille hochladen</div><div style={{color:'#ccc',fontSize:10,marginTop:2}}>JPG, PNG · max 5MB</div></div>
                  )}
                </div>
              </label>
            </div>
            {/* STANDORT */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(locationSource==='gps'?'#27ae6044':locationSource==='ip'?'#2980b944':(darkMode?'#2a2a2a':'#eee')),marginTop:10}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:locationSource==='gps'?'#27ae6018':locationSource==='ip'?'#2980b918':'#f5f5f5',border:'1px solid '+(locationSource==='gps'?'#27ae6044':locationSource==='ip'?'#2980b944':'#eee'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                  📍
                </div>
                <div style={{flex:1}}>
                  <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>
                    {locationSource==='gps'?'GPS Standort aktiv ✅':locationSource==='ip'?'Standort via IP 🌐':'Kein Standort'}
                  </div>
                  <div style={{color:locationSource==='gps'?'#27ae60':locationSource==='ip'?'#2980b9':'#aaa',fontSize:11,marginTop:1}}>
                    {locationSource==='gps'?'Genauer Standort — beste Matching-Ergebnisse':locationSource==='ip'?'Ungefährer Standort — GPS für bessere Ergebnisse aktivieren':'GPS aktivieren für besseres Matching'}
                  </div>
                  {myLat&&myLon&&<div style={{color:'#ccc',fontSize:10,marginTop:2}}>{myLat.toFixed(4)}, {myLon.toFixed(4)}</div>}
                </div>
              </div>
              {locationSource!=='gps'&&(
                <button onClick={getGPSLocation} disabled={locationLoading}
                  style={{width:'100%',marginTop:12,padding:'11px',borderRadius:10,background:locationLoading?'#eee':'linear-gradient(135deg,#27ae60,#2ecc71)',border:'none',color:locationLoading?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:locationLoading?'not-allowed':'pointer'}}>
                  {locationLoading?'GPS wird ermittelt...':'📍 PRÄZISEN STANDORT AKTIVIEREN'}
                </button>
              )}
              {locationSource==='gps'&&(
                <button onClick={()=>{
                  setLocationSource('city');setMyLat(null);setMyLon(null);
                  if(session&&myProfile){
                    fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({lat:null,lon:null,location_source:'city'})});
                  }
                  showMsg('GPS Standort entfernt');
                }} style={{width:'100%',marginTop:12,padding:'9px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c44',color:'#e74c3c',fontFamily:'DM Sans,sans-serif',fontSize:12,cursor:'pointer'}}>
                  GPS zurücksetzen
                </button>
              )}
            </div>

            {/* GYM VERIFIZIERUNG */}
            <div onClick={()=>setShowGymVerify(true)} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(gymVerified?'#27ae6044':(darkMode?'#2a2a2a':'#eee')),marginTop:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,borderRadius:10,background:gymVerified?'#27ae6018':'#f5f5f5',border:'1px solid '+(gymVerified?'#27ae6044':'#eee'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                {gymVerified?gymVerified.gymEmoji:'🏅'}
              </div>
              <div style={{flex:1}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{gymVerified?t.gymVerified2:t.gymVerify}</div>
                <div style={{color:gymVerified?'#27ae60':'#aaa',fontSize:11,marginTop:1}}>{gymVerified?gymVerified.gymName+' · '+gymVerified.gymCity:t.gymCodeEnter}</div>
              </div>
              <div style={{color:'#bbb',fontSize:18}}>›</div>
            </div>
            {/* TRAININGS-HISTORIE */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2}}>{t.trainingHistory}</div>
                  <div style={{color:'#aaa',fontSize:10,marginTop:2}}>{t.trainingWith}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <div style={{color:'#aaa',fontSize:9,textAlign:'right'}}>{historyPublic?'Öffentlich':'Privat'}</div>
                  <div onClick={async()=>{
                    const next=!historyPublic;
                    setHistoryPublic(next);
                    try{localStorage.setItem('fighter_history_public',String(next));}catch{}
                    // In Supabase speichern
                    if(session&&myProfile){
                      try{
                        await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+myProfile.id,{
                          method:'PATCH',
                          headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                          body:JSON.stringify({history_public:next})
                        });
                      }catch(e){console.error('history_public save error',e);}
                    }
                    showMsg(next?'Trainings-Historie ist jetzt öffentlich 👁':'Trainings-Historie ist jetzt privat 🔒');
                  }} style={{width:38,height:22,borderRadius:11,background:historyPublic?'#27ae60':'#ccc',position:'relative',cursor:'pointer',flexShrink:0}}>
                    <div style={{position:'absolute',top:3,left:historyPublic?19:3,width:16,height:16,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>
              </div>
              {!historyPublic&&(
                <div style={{background:darkMode?'#111':'#f5f5f7',borderRadius:8,padding:'8px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:14}}>🔒</span>
                  <div style={{color:'#aaa',fontSize:11}}>Nur du siehst deine Trainings-Historie. Aktiviere den Toggle um sie öffentlich zu machen.</div>
                </div>
              )}
              {fightHistory.length===0?(
                <div style={{textAlign:'center',padding:'12px 0'}}>
                  <div style={{fontSize:28,marginBottom:6}}>🤝</div>
                  <div style={{color:'#bbb',fontSize:12}}>{t.noHistory}</div>
                  <div style={{color:'#ccc',fontSize:10,marginTop:3}}>{t.historyHint}</div>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {fightHistory.slice(0,15).map((f,i)=>(
                    <div key={f.id||i} style={{background:darkMode?'#111':'#f9f9f9',borderRadius:10,padding:'10px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:8,background:'#2980b918',border:'1px solid #2980b933',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>🥊</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.opponent_name}</div>
                        <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{f.opponent_style||''}{f.opponent_style&&f.fight_type?' · ':''}{f.fight_type||''}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{color:'#aaa',fontSize:10}}>{f.fight_date||''}</div>
                        {f.location&&<div style={{color:'#ccc',fontSize:9,marginTop:1}}>📍 {f.location}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {dbMatches.length>3&&(
              <div style={{marginTop:14}}>
                <div style={{color:'#bbb',fontSize:9,letterSpacing:2,marginBottom:8,fontWeight:700}}>MEINE MATCHES</div>
                {dbMatches.map(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return null;
                  return(<div key={m.id} onClick={()=>setActiveChat(m)} style={{background:'#fff',borderRadius:10,padding:'11px 13px',border:'1px solid #eee',marginBottom:7,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                    {other.avatar_url?<img src={other.avatar_url} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}} alt=''/>:<div style={{width:38,height:38,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
                    <div style={{flex:1}}><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{other.name}</div><div style={{color:'#aaa',fontSize:11}}>{other.style} · {other.city}</div></div>
                    <div style={{color:RED,fontSize:11,fontWeight:700}}>💬 Chat →</div>
                  </div>);
                })}
              </div>
            )}
          </div>
        )}

        {tab==='gyms'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:11}}>{t.findGyms}</div>
            {(()=>{
              // Unified ranked list - no duplicates
              const hardcoded=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct,city:ct})));
              const dbOnly=dbGyms.filter(dg=>!hardcoded.some(h=>h.name.toLowerCase()===dg.name.toLowerCase()));
              const allGyms=[...hardcoded,...dbOnly];
              const norm=s=>(s||'').replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
              const allRanked=allGyms.map(g=>{
                const k=(g.city||g.ct||'')+'-'+g.name;
                const kn=norm(g.city||g.ct||'')+'-'+norm(g.name||'');
                const r=gymRatings[k]||gymRatings[kn]||{};
                const avg=r.count>0?r.total/r.count:(g.rating||0);
                const cnt=r.count||0;
                return{...g,k,avg,cnt};
              }).sort((a,b)=>{
                if(b.cnt!==a.cnt)return b.cnt-a.cnt;
                return b.avg-a.avg;
              });
              const top5=allRanked.slice(0,5);
              const rest=allRanked.slice(5);
              const medal=['🥇','🥈','🥉'];
              const openGym=(g)=>{
                const hard=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(gx=>({...gx,ct}))).find(gx=>gx.name===g.name);
                const db=dbGyms.find(dg=>dg.name===g.name);
                const base=hard||db||g;
                setViewGym({gym:{styles:[],...base,city:base.city||base.ct||'',members:base.members||0,rating:base.rating||0,styles:base.styles||[base.style||'Kampfsport'],address:base.address||base.city||'',desc:base.desc||base.description||'',street:base.street||base.address||'',zip:base.zip||'',founded:base.founded||''},key:g.k});
              };
              return(<>
                {/* TOP 5 */}
                <div style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div className='rj' style={{color:'#d4a017',fontSize:15,letterSpacing:2}}>🏆 GYM RANKING</div>
                    <div style={{color:'#aaa',fontSize:10}}>{t.sortedByRatings}</div>
                  </div>
                  {top5.map((g,i)=>{
                    const isTop3=i<3;
                    return(
                      <div key={g.k} onClick={()=>openGym(g)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:isTop3?(darkMode?'#1f1a10':'#fffbf0'):(darkMode?'#1a1a1a':'#fff'),borderRadius:12,marginBottom:6,border:'1px solid '+(isTop3?'#d4a01744':(darkMode?'#2a2a2a':'#eee')),boxShadow:isTop3?'0 2px 8px rgba(212,160,23,0.12)':'none',cursor:'pointer'}}>
                        <div style={{fontSize:isTop3?26:18,width:32,textAlign:'center',flexShrink:0}}>{isTop3?medal[i]:<span className='rj' style={{color:'#bbb'}}>#{i+1}</span>}</div>
                        <div style={{width:38,height:38,borderRadius:8,background:darkMode?'#2a2a2a':'#f5f5f5',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                          {(gymLogos[g.code]?.logo_url||g.logo_url)?<img src={gymLogos[g.code]?.logo_url||g.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#bbb',fontSize:9,textAlign:'center',fontWeight:700,lineHeight:1.2}}>{(g.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:isTop3?(darkMode?'#ffd700':'#b8860b'):(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.name}</div>
                          <div style={{color:'#888',fontSize:10,marginTop:1}}>📍 {g.city||g.ct} · {g.members||0} Mitglieder</div>
                          <div style={{display:'flex',gap:1,marginTop:3}}>
                            {[1,2,3,4,5].map(s=>(<button key={s} onClick={e=>{e.stopPropagation();rateGym(g.k,s);}} style={{background:'none',border:'none',cursor:'pointer',padding:'0 1px',fontSize:14,color:s<=Math.round(g.avg)?'#d4a017':'#ddd',lineHeight:1}}>{s<=Math.round(g.avg)?'★':'☆'}</button>))}
                            <span style={{color:'#aaa',fontSize:10,marginLeft:3,alignSelf:'center'}}>{g.cnt>0?g.cnt+' Bew.':'bewerten →'}</span>
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}><span style={{color:'#d4a017',fontSize:14}}>★</span><span style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:16}}>{g.avg>0?g.avg.toFixed(1):'–'}</span></div>
                          <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{g.cnt>0?'User-Rating':'Basis'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Toggle Städte / TOP GYMS */}
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <button onClick={()=>setGymRankMode(false)} style={{flex:1,padding:'7px',borderRadius:20,background:!gymRankMode?RED:'transparent',border:'1px solid '+(gymRankMode?'#ddd':RED),color:gymRankMode?'#888':'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>{t.cities}</button>
                  <button onClick={()=>setGymRankMode(true)} style={{flex:1,padding:'7px',borderRadius:20,background:gymRankMode?RED:'transparent',border:'1px solid '+(gymRankMode?RED:'#ddd'),color:gymRankMode?'#fff':'#888',fontSize:13,fontWeight:600,cursor:'pointer'}}>{t.topGyms}</button>
                </div>

                {gymRankMode?(
                  /* REST DES RANKINGS ab #6 */
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{color:'#aaa',fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:4}}>PLÄTZE #6 UND WEITER</div>
                    {rest.map((gym,i)=>(
                      <div key={gym.k} onClick={()=>openGym(gym)} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'12px 14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
                        <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,color:'#aaa',width:30,textAlign:'center'}}>#{i+6}</div>
                        <div style={{width:42,height:42,borderRadius:8,background:darkMode?'#2a2a2a':'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,overflow:'hidden'}}>
                          {(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} alt=''/>:(gym.emoji||'')}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:14,color:darkMode?'#fff':'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{gym.name||''}</div>
                          <div style={{color:'#888',fontSize:11}}>{gym.city||gym.ct} · {gym.members||0} Mitglieder</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{color:'#f1c40f',fontSize:12}}>{'⭐'.repeat(Math.min(5,Math.round(gym.avg)))}</div>
                          <div style={{color:'#aaa',fontSize:11,fontWeight:700}}>{gym.avg>0?gym.avg.toFixed(1):'–'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ):(
                  /* STÄDTE ANSICHT */
                  <>
                  <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
                    {(()=>{
                      const normC=s=>(s||'').toLowerCase().trim().replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
                      const seen=new Set();const result=[];
                      [...dbGyms.map(g=>g.city).filter(Boolean),...Object.keys(GYMS)].forEach(c=>{
                        const k=normC(c);
                        if(!seen.has(k)){seen.add(k);result.push(c);}
                      });
                      return result.sort((a,b)=>a.localeCompare(b,'de'));
                    })().map(c=>(<button key={c} onClick={()=>setCity(c)} style={{flexShrink:0,padding:'6px 13px',borderRadius:20,background:city===c?RED:'#fff',border:'1px solid '+(city===c?RED:'#e0e0e0'),color:city===c?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{c}</button>))}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {(dbGyms.filter(g=>g.city===city).length>0?dbGyms.filter(g=>g.city===city):(GYMS[city]||[])).map((gym,i)=>(
                      <div key={i} onClick={()=>openGym(gym)} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'13px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),boxShadow:'0 1px 4px rgba(0,0,0,0.05)',cursor:'pointer'}}>
                        <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
                          <div style={{width:46,height:46,borderRadius:9,background:darkMode?'#2a2a2a':'#f0f0f0',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>{(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#aaa',fontSize:10,fontWeight:700,textAlign:'center',lineHeight:1.2}}>{(gym.name||'').split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}</div>
                          <div style={{flex:1}}>
                            <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{gym.name||''}</div>
                            <div style={{color:darkMode?'#aaa':'#888',fontSize:11,marginTop:1}}>📍 {gym.address||gym.city||''}</div>
                            <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>{(gym.styles||[gym.style||'Kampfsport']).filter(Boolean).map(s=><Tag key={s} text={s} accent={RED}/>)}</div>
                          </div>
                        </div>
                        <div style={{marginTop:9,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div style={{color:'#888',fontSize:12}}>👥 {gym.members||0} Mitglieder</div>
                          <div style={{display:'flex',alignItems:'center',gap:3}}><span style={{color:'#d4a017'}}>★</span><span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{gym.rating||0}</span></div>
                        </div>
                        <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                          <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginBottom:4}}>Gym bewerten:</div>
                          <div style={{display:'flex',gap:2,alignItems:'center'}}>
                            {[1,2,3,4,5].map(star=>{
                              const k=(city||gym.city)+'-'+gym.name;
                              const mine=gymRatings[k]?.userRating||0;
                              return <button key={star} onClick={e=>{e.stopPropagation();rateGym(k,star);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:star<=mine?'#d4a017':'#ddd',padding:'0 1px'}}>{star<=mine?'★':'☆'}</button>;
                            })}
                            {gymRatings[(city||gym.city)+'-'+gym.name]?.count>0&&<span style={{color:'#aaa',fontSize:10,marginLeft:4}}>{gymRatings[(city||gym.city)+'-'+gym.name].count} Bew.</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </>);
            })()}
          </div>
        )}


        {tab==='events'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>

            {/* CREATE EVENT MODAL */}
            {showCreateEvent&&isAdmin&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:'20px 20px 40px',maxHeight:'90vh',overflowY:'auto'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>EVENT ERSTELLEN</div>
                    <button onClick={()=>setShowCreateEvent(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#aaa'}}>✕</button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>TYP</div>
                      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                        {['Sparring','Community Training','Wettkampf','Open Mat','Seminar'].map(t=>(
                          <button key={t} onClick={()=>setNewEvent(e=>({...e,event_type:t}))}
                            style={{padding:'7px 12px',borderRadius:20,background:newEvent.event_type===t?RED:'transparent',border:'1px solid '+(newEvent.event_type===t?RED:(darkMode?'#333':'#ddd')),color:newEvent.event_type===t?'#fff':(darkMode?'#aaa':'#666'),fontSize:12,fontWeight:700,cursor:'pointer'}}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    {[
                      ['TITEL *','title','text','z.B. Community Sparring Düsseldorf'],
                      ['STADT *','city','text','z.B. Düsseldorf'],
                      ['ADRESSE','address','text','z.B. Tiger Gym, Fichtenstraße 12'],
                    ].map(([lbl,key,type,ph])=>(
                      <div key={key}>
                        <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>{lbl}</div>
                        <input type={type} value={newEvent[key]} onChange={e=>setNewEvent(ev=>({...ev,[key]:e.target.value}))} placeholder={ph}
                          style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>DATUM *</div>
                        <input type='date' value={newEvent.event_date} onChange={e=>setNewEvent(ev=>({...ev,event_date:e.target.value}))}
                          style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>UHRZEIT</div>
                        <input type='time' value={newEvent.event_time} onChange={e=>setNewEvent(ev=>({...ev,event_time:e.target.value}))}
                          style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>MAX. TEILNEHMER</div>
                      <input type='number' min='2' max='100' value={newEvent.max_participants} onChange={e=>setNewEvent(ev=>({...ev,max_participants:e.target.value}))}
                        style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>KAMPFSTILE</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {['Boxing','MMA','Muay Thai','BJJ','Kickboxing','Grappling','Wrestling','Karate','Alle'].map(s=>(
                          <button key={s} onClick={()=>setNewEvent(ev=>({...ev,styles:ev.styles.includes(s)?ev.styles.filter(x=>x!==s):[...ev.styles,s]}))}
                            style={{padding:'5px 10px',borderRadius:20,background:newEvent.styles.includes(s)?RED:'transparent',border:'1px solid '+(newEvent.styles.includes(s)?RED:(darkMode?'#333':'#ddd')),color:newEvent.styles.includes(s)?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:5}}>BESCHREIBUNG</div>
                      <textarea value={newEvent.description} onChange={e=>setNewEvent(ev=>({...ev,description:e.target.value}))} placeholder='Was erwartet die Teilnehmer? Level, Ausrüstung, Besonderheiten...' rows={3}
                        style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid '+(darkMode?'#2a2a2a':'#e0e0e0'),background:darkMode?'#111':'#f5f5f7',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box',resize:'none'}}/>
                    </div>
                    <button onClick={createEvent} disabled={creatingEvent}
                      style={{width:'100%',padding:'14px',borderRadius:12,background:creatingEvent?'#eee':`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:creatingEvent?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,letterSpacing:2,cursor:creatingEvent?'not-allowed':'pointer',marginTop:4}}>
                      {creatingEvent?'ERSTELLT...':'EVENT ERSTELLEN 🥊'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HEADER */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3}}>EVENTS</div>
                <div style={{color:'#aaa',fontSize:11,marginTop:2}}>Community Sparrings & Trainings</div>
              </div>
              {isAdmin&&(
                <button onClick={()=>setShowCreateEvent(true)}
                  style={{padding:'9px 16px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,letterSpacing:1,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                  ➕ EVENT
                </button>
              )}
            </div>

            {eventsLoading?(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),opacity:1-i*0.25}}>
                    <div style={{height:14,background:darkMode?'#2a2a2a':'#f0f0f0',borderRadius:7,width:'60%',marginBottom:8}}/>
                    <div style={{height:10,background:darkMode?'#222':'#f5f5f5',borderRadius:5,width:'40%'}}/>
                  </div>
                ))}
              </div>
            ):events.length===0?(
              <div style={{textAlign:'center',padding:'50px 20px'}}>
                <div style={{fontSize:56,marginBottom:12}}>📅</div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:2,marginBottom:8}}>NOCH KEINE EVENTS</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.7,maxWidth:260,margin:'0 auto'}}>
                  {isAdmin?'Erstelle das erste Community Sparring!':'Bald gibt es hier Events in deiner Stadt. Schau später nochmal rein 🥊'}
                </div>
                {isAdmin&&(
                  <button onClick={()=>setShowCreateEvent(true)}
                    style={{marginTop:16,padding:'13px 28px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>
                    ➕ ERSTES EVENT ERSTELLEN
                  </button>
                )}
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {events.map(ev=>{
                  const parts=eventParticipants[ev.id]||[];
                  const isJoined=parts.some(p=>p.user_id===myProfile?.id);
                  const isFull=parts.length>=(ev.max_participants||10);
                  const isOwner=ev.creator_id===myProfile?.id;
                  const typeColors={'Sparring':RED,'Community Training':'#27ae60','Wettkampf':'#d4a017','Open Mat':'#2980b9','Seminar':'#8e44ad'};
                  const color=typeColors[ev.event_type]||RED;
                  const isPast=ev.event_date&&new Date(ev.event_date)<new Date(new Date().toDateString());
                  return(
                    <div key={ev.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,border:'1px solid '+(isPast?(darkMode?'#2a2a2a':'#eee'):(isJoined?color+'44':(darkMode?'#2a2a2a':'#eee'))),overflow:'hidden',opacity:isPast?0.6:1,boxShadow:isJoined&&!isPast?'0 2px 12px '+color+'22':'none'}}>
                      <div style={{height:3,background:isPast?'#555':color}}/>
                      <div style={{padding:'13px 14px'}}>
                        {/* TYPE + DATE */}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                            <div style={{background:color+'18',border:'1px solid '+color+'44',borderRadius:20,padding:'2px 9px',color:color,fontSize:10,fontWeight:700}}>{ev.event_type}</div>
                            {isJoined&&!isPast&&<div style={{background:'#27ae6018',border:'1px solid #27ae6044',borderRadius:20,padding:'2px 9px',color:'#27ae60',fontSize:10,fontWeight:700}}>✓ Angemeldet</div>}
                            {isPast&&<div style={{background:'#88888818',borderRadius:20,padding:'2px 9px',color:'#888',fontSize:10,fontWeight:700}}>Vergangen</div>}
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:700}}>
                              {ev.event_date?new Date(ev.event_date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'}):''}
                            </div>
                            {ev.event_time&&<div style={{color:'#aaa',fontSize:11,marginTop:1}}>🕐 {ev.event_time} Uhr</div>}
                          </div>
                        </div>
                        {/* TITLE */}
                        <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:1,marginBottom:4}}>{ev.title}</div>
                        {/* LOCATION */}
                        <div style={{color:'#aaa',fontSize:12,marginBottom:6}}>📍 {ev.address||ev.city}</div>
                        {/* STYLES */}
                        {ev.styles&&ev.styles.length>0&&(
                          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                            {ev.styles.map(s=><div key={s} style={{background:darkMode?'#2a2a2a':'#f5f5f5',borderRadius:20,padding:'2px 8px',color:darkMode?'#aaa':'#666',fontSize:10,fontWeight:600}}>{s}</div>)}
                          </div>
                        )}
                        {/* DESCRIPTION */}
                        {ev.description&&<div style={{color:darkMode?'#888':'#666',fontSize:12,lineHeight:1.6,marginBottom:8}}>{ev.description}</div>}
                        {/* PARTICIPANTS BAR */}
                        <div style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                            <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:600}}>👥 Teilnehmer</div>
                            <div style={{color:isFull?RED:color,fontSize:11,fontWeight:700}}>{parts.length}/{ev.max_participants||10}{isFull?' · Voll':''}</div>
                          </div>
                          <div style={{height:4,background:darkMode?'#2a2a2a':'#f0f0f0',borderRadius:2}}>
                            <div style={{height:'100%',width:Math.min(100,(parts.length/(ev.max_participants||10))*100)+'%',background:isFull?RED:color,borderRadius:2,transition:'width 0.4s'}}/>
                          </div>
                        </div>
                        {/* ACTION BUTTONS */}
                        {!isPast&&(
                          <div style={{display:'flex',gap:8}}>
                            {isOwner?(
                              <button onClick={async()=>{
                                if(!window.confirm('Event löschen?'))return;
                                try{
                                  // Teilnehmer zuerst löschen, dann Event
                                  const aKey=isAdmin?SUPA_SERVICE_KEY:SUPA_KEY;
                                  const aAuth=isAdmin?SUPA_SERVICE_KEY:session.token;
                                  await fetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+ev.id,{method:'DELETE',headers:{apikey:aKey,Authorization:'Bearer '+aAuth}});
                                  await fetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{method:'DELETE',headers:{apikey:aKey,Authorization:'Bearer '+aAuth}});
                                  await loadEvents(session);showMsg('Event gelöscht ✅');
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }} style={{flex:1,padding:'10px',borderRadius:10,background:'transparent',border:'1px solid #e74c3c44',color:'#e74c3c',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                                🗑️ Löschen
                              </button>
                            ):isJoined?(
                              <button onClick={()=>leaveEvent(ev.id)}
                                style={{flex:1,padding:'10px',borderRadius:10,background:'transparent',border:'1px solid '+(darkMode?'#333':'#ddd'),color:darkMode?'#aaa':'#888',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                                Abmelden
                              </button>
                            ):(
                              <button onClick={()=>joinEvent(ev.id)} disabled={isFull}
                                style={{flex:1,padding:'10px',borderRadius:10,background:isFull?'#eee':`linear-gradient(135deg,${color},${color}cc)`,border:'none',color:isFull?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1,cursor:isFull?'not-allowed':'pointer'}}>
                                {isFull?'Ausgebucht':'🥊 ANMELDEN'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab==='ranking'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:8}}>{t.worldRanking}</div>
            <div style={{display:'flex',gap:6,marginBottom:11}}>
              <button onClick={()=>setRankMode('user')} style={{flex:1,padding:'7px',borderRadius:8,background:rankMode==='user'?RED:'transparent',border:'1px solid '+(rankMode==='user'?RED:(darkMode?'#333':'#ddd')),color:rankMode==='user'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>🏅 AMATEURE</button>
              <button onClick={()=>setRankMode('pro')} style={{flex:1,padding:'7px',borderRadius:8,background:rankMode==='pro'?'#d4a017':'transparent',border:'1px solid '+(rankMode==='pro'?'#d4a017':(darkMode?'#333':'#ddd')),color:rankMode==='pro'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>⭐ PROFIS</button>
              <button onClick={()=>setRankMode('trainer')} style={{flex:1,padding:'7px',borderRadius:8,background:rankMode==='trainer'?'#8e44ad':'transparent',border:'1px solid '+(rankMode==='trainer'?'#8e44ad':(darkMode?'#333':'#ddd')),color:rankMode==='trainer'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>{t.trainer}</button>
            </div>
            {rankMode!=='trainer'&&(
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <button onClick={()=>setCountryFilter('mine')} style={{flex:1,padding:'6px',borderRadius:20,background:countryFilter==='mine'?RED:'transparent',border:'1px solid '+(countryFilter==='mine'?RED:(darkMode?'#333':'#ddd')),color:countryFilter==='mine'?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  {({'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','FR':'🇫🇷','GB':'🇬🇧','US':'🇺🇸','NL':'🇳🇱','BE':'🇧🇪','IT':'🇮🇹','ES':'🇪🇸'}[profile.country||'DE']||'🌍')} Mein Land
                </button>
                <button onClick={()=>setCountryFilter('world')} style={{flex:1,padding:'6px',borderRadius:20,background:countryFilter==='world'?'#2980b9':'transparent',border:'1px solid '+(countryFilter==='world'?'#2980b9':(darkMode?'#333':'#ddd')),color:countryFilter==='world'?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  🌍 Weltweit
                </button>
              </div>
            )}
            {rankMode!=='trainer'&&(
              <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
                {['All',...STYLES].map(s=>(<button key={s} onClick={()=>setRankF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:rankF===s?RED:'#fff',border:'1px solid '+(rankF===s?RED:'#e0e0e0'),color:rankF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
              </div>
            )}
            {rankMode==='trainer'&&(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[...TRAINERS].filter(tr=>!myProfile||tr.name!==myProfile.name).sort((a,b)=>b.rating-a.rating).map((tr,i)=>{
                  const medal=['🥇','🥈','🥉'];
                  const medalColor=['#d4a017','#95a5a6','#cd7f32'];
                  const isTop3=i<3;
                  return(
                    <div key={tr.id} style={{background:isTop3?(darkMode?'#1f1a10':'#fffbf0'):(darkMode?'#1a1a1a':'#fff'),borderRadius:13,padding:'12px 13px',border:'1px solid '+(isTop3?'#d4a01733':(darkMode?'#2a2a2a':'#eee')),boxShadow:isTop3?'0 2px 8px rgba(212,160,23,0.1)':'none',display:'flex',alignItems:'center',gap:11}}>
                      <div style={{fontSize:isTop3?26:18,width:32,textAlign:'center',flexShrink:0}}>
                        {isTop3?medal[i]:<span className='rj' style={{color:'#bbb'}}>#{i+1}</span>}
                      </div>
                      <div style={{width:46,height:46,borderRadius:10,background:tr.accent+'22',border:'2px solid '+tr.accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{tr.emoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div className='rj' style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontSize:15,letterSpacing:0.5}}>{tr.name}</div>
                          <div style={{background:'#8e44ad22',border:'1px solid #8e44ad44',borderRadius:10,padding:'1px 6px',color:'#8e44ad',fontSize:9,fontWeight:700,flexShrink:0}}>🎓 TRAINER</div>
                        </div>
                        <div style={{color:tr.accent,fontSize:11,fontWeight:700,marginTop:1}}>{tr.style} · {tr.country}</div>
                        <div style={{color:darkMode?'#555':'#bbb',fontSize:10,marginTop:1}}>🏋️ {tr.gym}</div>
                        <div style={{color:darkMode?'#444':'#ccc',fontSize:10,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>👥 {tr.pupils}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}>
                          <span style={{color:'#d4a017',fontSize:13}}>★</span>
                          <span className='rj' style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontSize:18}}>{tr.rating}</span>
                        </div>
                        <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{tr.exp} Jahre</div>
                        <div style={{color:'#d4a017',fontSize:9}}>{tr.titles} Titel</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* EIGENER PLATZ */}
            {rankMode!=='trainer'&&myProfile&&(()=>{
              const myScore=(myProfile.wins||0)*3-(myProfile.losses||0)*2+(myProfile.draws||0);
              const allScored=[...userOnly].map(f=>({...f,score:(f.wins||0)*3-(f.losses||0)*2+(f.draws||0)})).sort((a,b)=>b.score-a.score);
              const myRank=allScored.findIndex(f=>f.id===0)+1;
              if(myRank<=0)return null;
              return(
                <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'12px 14px',border:'2px solid '+RED+'44',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
                  <div className='rj' style={{color:RED,fontSize:22,width:36,textAlign:'center',flexShrink:0}}>#{myRank}</div>
                  <div style={{width:38,height:38,borderRadius:8,overflow:'hidden',flexShrink:0,background:'#f0f0f0'}}>
                    {avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🥊</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>Du · {profile.name}</div>
                    <div style={{color:'#aaa',fontSize:10,marginTop:1}}>{profile.style} · {myBundesland||profile.city}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16}}>{myScore} Pkt</div>
                    <div style={{color:'#bbb',fontSize:9}}>{myProfile.wins||0}S · {myProfile.losses||0}N</div>
                  </div>
                </div>
              );
            })()}
            {ranked.length>=3&&rankMode!=='trainer'&&(
              <div style={{display:'flex',alignItems:'flex-end',gap:5,marginBottom:13,justifyContent:'center'}}>
                {[ranked[1],ranked[0],ranked[2]].map((f,i)=>{
                  const heights=[96,118,80];const places=[2,1,3];const colors=['#95a5a6','#d4a017','#cd7f32'];const isFirst=i===1;
                  return(<div key={f.id} onClick={()=>{if(!f.isMe&&f.id)setViewProfile(f);}} style={{flex:1,maxWidth:105,display:'flex',flexDirection:'column',alignItems:'center',cursor:f.isMe?'default':'pointer'}}>
                    {isFirst&&<div style={{fontSize:26,marginBottom:2}}>🏆</div>}
                    {f.avatar_url?<img src={f.avatar_url} style={{width:isFirst?44:36,height:isFirst?44:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+colors[i],marginBottom:3}} alt={f.name}/>:<div style={{fontSize:isFirst?28:22,marginBottom:3}}>{f.emoji||''}</div>}
                    <div style={{color:f.isMe?RED:(darkMode?'#fff':'#1a1a1a'),fontSize:11,fontWeight:700,textAlign:'center'}}>{f.name?.split(' ')[0]}</div>
                    <div style={{color:'#aaa',fontSize:9}}>{f.wins}W-{f.losses}L</div>
                    <div style={{width:'100%',height:heights[i],background:colors[i]+'18',border:'1px solid '+colors[i]+'44',borderRadius:'5px 5px 0 0',marginTop:5,display:'flex',alignItems:'center',justifyContent:'center'}}><div className='rj' style={{color:colors[i],fontSize:28}}>#{places[i]}</div></div>
                  </div>);
                })}
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {ranked.map((f,i)=>{
                const score=f.wins*3-f.losses*2+f.draws;const rc=['#d4a017','#95a5a6','#cd7f32'];
                return(<div key={f.id} onClick={()=>{if(!f.isMe&&f.id&&typeof f.id==='string')setViewProfile(f);}} style={{background:f.isMe?(darkMode?'#2a1510':'#fdf0ef'):(darkMode?'#1a1a1a':'#fff'),borderRadius:9,padding:'10px 12px',border:'1px solid '+(f.isMe?RED+'33':i<3?rc[i]+'33':'#eee'),display:'flex',alignItems:'center',gap:9,boxShadow:'0 1px 4px rgba(0,0,0,0.04)',cursor:f.isMe?'default':'pointer'}}>
                  <div className='rj' style={{color:i<3?rc[i]:'#bbb',fontSize:18,width:24,textAlign:'center'}}>#{i+1}</div>
                  {f.avatar_url?<img src={f.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}} alt={f.name}/>:<div style={{fontSize:22}}>{f.emoji||''}</div>}
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{color:f.isMe?RED:(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:13}}>{f.name}</div>
                      {f.isMe&&<div style={{background:'#fdf0ef',border:'1px solid '+RED+'44',borderRadius:3,padding:'1px 4px',color:RED,fontSize:8,fontWeight:700}}>ICH</div>}
                    </div>
                    <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginTop:1}}>{f.style} - {f.city}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{display:'flex',gap:4,fontSize:11,justifyContent:'flex-end',fontWeight:700}}><span style={{color:'#27ae60'}}>{f.wins}W</span><span style={{color:RED}}>{f.losses}L</span><span style={{color:'#d4a017'}}>{f.draws}D</span></div>
                    <div style={{color:RED,fontSize:10,marginTop:1}}>{score} Pkt</div>
                  </div>
                </div>);
              })}
            </div>
            <div style={{color:'#ddd',fontSize:9,textAlign:'center',marginTop:11,letterSpacing:1}}>{t.rankFormula}</div>
          </div>
        )}

        {tab==='trainer'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>TOP TRAINER</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>Die besten Coaches der Welt</div>
            <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {trStyles.map(s=>(<button key={s} onClick={()=>setTrainerF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:trainerF===s?'#d4a017':'#fff',border:'1px solid '+(trainerF===s?'#d4a017':'#e0e0e0'),color:trainerF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {filteredT.map((tr,i)=>(
                <div key={tr.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,border:'1px solid '+tr.accent+(darkMode?'55':'33'),overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                  <div style={{height:3,background:`linear-gradient(90deg,${tr.accent},transparent)`}}/>
                  <div style={{padding:'14px'}}>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:56,height:56,borderRadius:12,background:tr.accent+'18',border:'2px solid '+tr.accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{tr.emoji}</div>
                        <div style={{position:'absolute',bottom:-5,right:-5,background:i===0?'#d4a017':i===1?'#95a5a6':i===2?'#cd7f32':'#eee',borderRadius:10,padding:'1px 5px'}}><div className='rj' style={{color:i<3?'#fff':'#aaa',fontSize:10}}>#{i+1}</div></div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{tr.name}</div><div style={{color:tr.accent,fontSize:11,fontWeight:700,marginTop:1}}>{tr.style.toUpperCase()}</div></div>
                          <div style={{textAlign:'right'}}><div style={{display:'flex',alignItems:'center',gap:2}}><span style={{color:'#d4a017'}}>★</span><span style={{color:'#1a1a1a',fontWeight:700,fontSize:14}}>{tr.rating}</span></div><div style={{color:'#aaa',fontSize:10}}>{tr.exp} Jahre</div></div>
                        </div>
                        <div style={{color:'#888',fontSize:11,marginTop:2}}>{tr.country} - {tr.gym}</div>
                      </div>
                    </div>
                    <div style={{marginTop:9,color:darkMode?'#ccc':'#666',fontSize:12,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee'),paddingTop:8}}>{tr.bio}</div>
                    <div style={{marginTop:8,background:darkMode?'#2a2a2a':'#f8f8f8',borderRadius:7,padding:'7px 10px'}}><div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:3}}>BEKANNTE SCHUELER</div><div style={{color:darkMode?'#ccc':'#666',fontSize:12,fontWeight:600}}>{tr.pupils}</div></div>
                    <div style={{marginTop:8,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:(tr.rating/10*100)+'%',background:`linear-gradient(90deg,${tr.accent},${tr.accent}66)`,borderRadius:2}}/></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='sports'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>SPORTARTEN</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>{t.findEventsCity}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
              {Object.keys(SPORTS).map(s=>{const{color,emoji}=SPORTS[s];const sel=sport===s;return(<button key={s} onClick={()=>setSport(s)} style={{padding:'12px 10px',borderRadius:11,background:sel?color+'25':(darkMode?'#1a1a1a':'#fff'),border:'1px solid '+(sel?color:(darkMode?'#2a2a2a':'#eee')),cursor:'pointer',transition:'all 0.2s',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}><div style={{fontSize:22,marginBottom:4}}>{emoji}</div><div style={{color:sel?color:'#555',fontWeight:700,fontSize:13}}>{s}</div><div style={{color:darkMode?'#666':'#bbb',fontSize:10,marginTop:2}}>{SPORTS[s].games.length} Events</div></button>);})}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {SPORTS[sport].games.map(game=>{
                const{color}=SPORTS[sport];const pct=(game.cur/game.max)*100;const full=game.cur>=game.max;const key=sport+game.id;const isJoined=joined[key];
                return(<div key={game.id} style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid '+color+'22',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
                  <div style={{padding:'13px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{game.title}</div><div style={{color:'#888',fontSize:11}}>📍 {game.location}</div></div>
                      <div style={{background:color+'18',border:'1px solid '+color+'33',borderRadius:6,padding:'3px 8px',height:'fit-content'}}><div style={{color:color,fontSize:11,fontWeight:700}}>{game.level}</div></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{display:'flex',gap:10}}><div style={{color:'#888',fontSize:11}}>🕐 {game.time}</div><div style={{color:'#888',fontSize:11}}>👤 {game.host}</div></div>
                      <div style={{color:full?RED:color,fontSize:11,fontWeight:700}}>{game.cur}/{game.max}</div>
                    </div>
                    <div style={{height:4,background:'#f0f0f0',borderRadius:3,marginBottom:9}}><div style={{height:'100%',width:pct+'%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:3}}/></div>
                    <button onClick={()=>setJoined(j=>({...j,[key]:!j[key]}))} style={{width:'100%',padding:'10px',borderRadius:8,background:isJoined?'#f0faf0':full?'#f5f5f5':`linear-gradient(135deg,${color}cc,${color})`,border:isJoined?'1px solid #27ae60':'none',color:isJoined?'#27ae60':full?'#aaa':'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,letterSpacing:1.5,cursor:'pointer',transition:'all 0.2s'}}>
                      {isJoined?'Beigetreten':full?'Ausgebucht':'Mitmachen'}
                    </button>
                  </div>
                </div>);
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:darkMode?'#1a1a1a':'#fff',borderTop:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),display:'flex',height:60,zIndex:50,boxShadow:'0 -2px 12px rgba(0,0,0,0.06)'}}>
        {tabs.map(([id,iconOrKey,label])=>{const icon=iconOrKey==='unread'?'💬':iconOrKey;const showBadge=iconOrKey==='unread'&&unreadCount>0&&tab!=='chat';return(<button key={id} onClick={()=>{setTab(id);if(id==='chat'){dbMatches.forEach(m=>localStorage.setItem('fighter_last_read_'+m.id,new Date().toISOString()));setUnreadCount(0);}}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',gap:2,borderTop:tab===id?'2px solid '+RED:'2px solid transparent',transition:'all 0.2s',position:'relative'}}><div style={{position:'relative',display:'inline-block'}}><div style={{fontSize:15,opacity:tab===id?1:0.4}}>{icon}</div>{showBadge&&<div style={{position:'absolute',top:-3,right:-5,width:14,height:14,borderRadius:'50%',background:RED,border:'1.5px solid '+(darkMode?'#0d0d0d':'#f5f5f7'),display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:7,fontWeight:700}}>{unreadCount>9?'9+':unreadCount}</span></div>}</div><div style={{color:tab===id?RED:(darkMode?'#666':'#aaa'),fontSize:9,fontFamily:'DM Sans,sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div></button>);})}
      </div>

      {/* GYM VERIFY OVERLAY */}
      {showAdminMsg&&adminMessages.length>0&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:16,padding:20,maxWidth:360,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{fontSize:28}}>📢</div>
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:16,letterSpacing:1}}>NACHRICHT VOM TEAM</div>
                <div style={{color:'#aaa',fontSize:11}}>Fighter Support</div>
              </div>
            </div>
            {adminMessages.filter(m=>!m.read).map((m,i)=>(
              <div key={i} style={{background:darkMode?'#111':'#f9f9f9',borderRadius:10,padding:'12px 14px',marginBottom:8,borderLeft:'3px solid '+RED}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,lineHeight:1.6}}>{m.message}</div>
                <div style={{color:'#aaa',fontSize:10,marginTop:4}}>{m.created_at?new Date(m.created_at).toLocaleDateString('de-DE'):''}</div>
              </div>
            ))}
            <button onClick={async()=>{
              setShowAdminMsg(false);
              try{
                const ids=adminMessages.filter(m=>!m.read).map(m=>m.id);
                for(const id of ids){
                  await fetch(SUPA_URL+'/rest/v1/admin_messages?id=eq.'+id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({read:true})});
                }
              }catch{}
            }} style={{width:'100%',padding:'12px',borderRadius:10,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginTop:4}}>
              VERSTANDEN ✓
            </button>
          </div>
        </div>
      )}
      {showPwChange&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:16,padding:24,width:'100%',maxWidth:360,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,color:darkMode?'#fff':'#1a1a1a',letterSpacing:2,marginBottom:4}}>{t.pwChangeTitle}</div>
            <div style={{color:'#aaa',fontSize:12,marginBottom:16}}>{t.pwChangeSub}</div>
            <input
              type='password'
              placeholder={t.newPw}
              value={newPassword}
              onChange={e=>setNewPassword(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',marginBottom:8,outline:'none'}}
            />
            {pwChangeMsg&&<div style={{color:pwChangeMsg.includes('✅')?'#27ae60':'#e74c3c',fontSize:12,marginBottom:8}}>{pwChangeMsg}</div>}
            <div style={{display:'flex',gap:10,marginTop:8}}>
              <button onClick={()=>{setShowPwChange(false);setNewPassword('');setPwChangeMsg('');}} style={{flex:1,padding:'12px',borderRadius:10,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>ABBRECHEN</button>
              <button onClick={async()=>{
                if(!newPassword||newPassword.length<6){setPwChangeMsg('Mindestens 6 Zeichen!');return;}
                try{
                  const resp=await fetch(SUPA_URL+'/auth/v1/user',{
                    method:'PUT',
                    headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token},
                    body:JSON.stringify({password:newPassword})
                  });
                  const data=await resp.json();
                  if(data.id){
                    setPwChangeMsg('✅ Passwort geändert!');
                    setTimeout(()=>{setShowPwChange(false);setNewPassword('');setPwChangeMsg('');},1500);
                  } else {
                    setPwChangeMsg('Fehler: '+(data.message||'Unbekannt'));
                  }
                }catch(e){setPwChangeMsg('Fehler: '+e.message);}
              }} style={{flex:1,padding:'12px',borderRadius:10,background:'#c0392b',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>SPEICHERN</button>
            </div>
          </div>
        </div>
      )}
      {showGymVerify&&<div style={{position:'fixed',inset:0,zIndex:500}}><style>{css}</style><GymVerifyModal onClose={()=>{setShowGymVerify(false);setGymCodeInput('');setGymVerifyError('');}} gymCodeInput={gymCodeInput} setGymCodeInput={setGymCodeInput} gymVerifyError={gymVerifyError} setGymVerifyError={setGymVerifyError} gymVerified={gymVerified} setGymVerified={setGymVerified} gymCodes={GYM_CODES} darkMode={darkMode} showMsg={showMsg}/></div>}
      {/* IMPRESSUM MODAL */}
      {showImpressum&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowImpressum(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>{t.back}</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>IMPRESSUM</div>
              <div style={{color:'#c0392b',fontSize:10,letterSpacing:2,marginBottom:20}}>Angaben gemäß § 5 TMG</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Betreiber</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Junior Landu Mfumu, Ottostraße 43, 52070 Aachen, Deutschland</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Kontakt</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>E-Mail: mfumulandu@gmail.com</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Haftungsausschluss</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Inhalte mit größter Sorgfalt erstellt. Nach §§ 8-10 TMG keine Pflicht zur Überwachung übermittelter Informationen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Urheberrecht</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Inhalte unterliegen dem deutschen Urheberrecht. Vervielfältigung bedarf der Zustimmung.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>Streitbeilegung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>EU-Plattform: ec.europa.eu/consumers/odr</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {/* DATENSCHUTZ MODAL */}
      {showDatenschutz&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowDatenschutz(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>{t.back}</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>DATENSCHUTZ</div>
              <div style={{color:'#c0392b',fontSize:10,letterSpacing:2,marginBottom:20}}>Datenschutzerklärung gemäß DSGVO</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>1. Verantwortlicher</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Junior Landu Mfumu, Ottostraße 43, 52070 Aachen. E-Mail: mfumulandu@gmail.com</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>2. Erhobene Daten</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>E-Mail, Name, Alter, Stadt, Gym, Kampfstil, Profilbild, Nachrichten, Swipes und Matches.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>3. Zweck</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Bereitstellung der App, Matching, Chat, Gym-Verzeichnis und Ranglisten.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>4. Datenweitergabe</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Keine Weitergabe an Dritte. Dienste: Supabase (EU), Vercel, Resend.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>5. Deine Rechte</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Auskunft, Berichtigung, Löschung. Account löschen: Profil → Einstellungen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>6. Kontakt</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>mfumulandu@gmail.com</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {/* AGB MODAL */}
      {showAGB&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowAGB(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>{t.back}</button>
            <div style={{background:'#fff',borderRadius:14,padding:'20px',border:'1px solid #eee'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:22,color:'#1a1a1a',letterSpacing:2,marginBottom:4}}>AGB</div>
              <div style={{color:'#c0392b',fontSize:10,letterSpacing:2,marginBottom:20}}>Allgemeine Geschäftsbedingungen</div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>1. Leistungsumfang</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Kampfsport-Profil, Matching, Chat, Gym-Suche und Ranglisten. Kein Anspruch auf dauerhaften Betrieb.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>2. Nutzung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Ab 18 Jahren. Beleidigungen oder illegale Inhalte führen zur Sperrung.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>3. Haftung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Keine Haftung für Schäden aus der Nutzung oder Treffen zwischen Nutzern.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>4. Kündigung</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Account jederzeit löschbar: Profil → Einstellungen → Account löschen.</div></div>
              <div style={{marginBottom:14}}><div style={{fontWeight:700,color:'#1a1a1a',fontSize:13,marginBottom:5,borderLeft:'3px solid #c0392b',paddingLeft:8}}>5. Geltendes Recht</div><div style={{color:'#555',fontSize:13,lineHeight:1.8}}>Deutsches Recht. Gerichtsstand: Aachen.</div></div>
              <div style={{color:'#aaa',fontSize:10,textAlign:'center',marginTop:8}}>Stand: Mai 2026</div>
            </div>
          </div>
        </div>
      )}
      {/* ADMIN PANEL */}
      {showAdmin&&isAdmin&&(
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f5f5f7',zIndex:600,display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{background:RED,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
            <div className='rj' style={{color:'#fff',fontSize:18,letterSpacing:3}}>⚙️ ADMIN</div>
            <button onClick={()=>setShowAdmin(false)} style={{background:'none',border:'none',color:'#fff',fontSize:22,cursor:'pointer'}}>✕</button>
          </div>
          <div style={{display:'flex',overflowX:'auto',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
            {[['gyms','🏋️'],['addgym','➕'],['addcity','🌍'],['events',''],['users',''],['reports','🚨'],['records','🏅'],['feedback','💬'],['equipment',''],['broadcast','📢'],['stats','📊'],['scanner','🔍']].map(([t,l])=>(
              <button key={t} onClick={()=>setAdminTab(t)} style={{flexShrink:0,padding:'10px 14px',background:'none',border:'none',borderBottom:adminTab===t?'2px solid '+RED:'2px solid transparent',color:adminTab===t?RED:(darkMode?'#aaa':'#888'),fontWeight:700,fontSize:16,cursor:'pointer'}}>{l}</button>
            ))}
          </div>
          <div style={{padding:'16px',flex:1,overflowY:'auto'}}>

            {/* ── GYM LOGOS ── */}
            {adminTab==='gyms'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:8}}>🏋️ GYM MANAGER</div>
                <button style={{width:'100%',marginBottom:8,padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}} onClick={()=>loadDbGyms(session)}>🔄 GYMS NEU LADEN</button>

                {/* DUPLIKATE ERKENNEN */}
                {(()=>{
                  const nameCount={};
                  dbGyms.forEach(g=>{const k=(g.name||'').trim().toLowerCase();if(k)nameCount[k]=(nameCount[k]||[]); nameCount[k].push(g);});
                  const dupes=Object.values(nameCount).filter(arr=>arr.length>1);
                  const invalid=dbGyms.filter(g=>!g.name||g.name.trim().length<=1);
                  if(dupes.length===0&&invalid.length===0)return null;
                  return(
                    <div style={{background:'#2a1010',borderRadius:10,padding:'12px',marginBottom:12,border:'1px solid #c0392b44'}}>
                      <div style={{color:'#e74c3c',fontWeight:700,fontSize:13,marginBottom:8}}>⚠️ {dupes.length} Duplikate · {invalid.length} ungültige Namen</div>
                      {invalid.map(gym=>(
                        <div key={gym.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'#1a1a1a',borderRadius:8,marginBottom:5,border:'1px solid #e74c3c44'}}>
                          <div style={{flex:1}}>
                            <span style={{color:'#e74c3c',fontSize:12,fontWeight:700}}>"{gym.name||'(leer)'}"</span>
                            <span style={{color:'#666',fontSize:11}}> · {gym.city}</span>
                          </div>
                          <button onClick={async()=>{
                            if(!window.confirm('Löschen: "'+gym.name+'"?'))return;
                            await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                            await loadDbGyms(session);showMsg('✅ Gelöscht');
                          }} style={{padding:'4px 10px',borderRadius:6,background:'#e74c3c',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{t.deleteBtn}</button>
                        </div>
                      ))}
                      {dupes.map(arr=>(
                        <div key={arr[0].name} style={{marginBottom:8}}>
                          <div style={{color:'#d4a017',fontSize:11,fontWeight:700,marginBottom:4}}>📋 Duplikat: "{arr[0].name}" ({arr.length}x)</div>
                          {arr.map((gym,i)=>(
                            <div key={gym.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'#1a1a1a',borderRadius:8,marginBottom:4,border:'1px solid '+(i===0?'#27ae6044':'#e74c3c44')}}>
                              <div style={{width:16,height:16,borderRadius:'50%',background:i===0?'#27ae60':'#e74c3c',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span style={{color:'#fff',fontSize:9,fontWeight:700}}>{i===0?'✓':'×'}</span>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <span style={{color:i===0?'#27ae60':'#aaa',fontSize:12,fontWeight:700}}>{gym.name}</span>
                                <span style={{color:'#555',fontSize:11}}> · {gym.city} · {gym.style||'kein Stil'}</span>
                              </div>
                              {i>0&&<button onClick={async()=>{
                                if(!window.confirm('Duplikat löschen: "'+gym.name+'" ('+gym.city+')?'))return;
                                await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                                await loadDbGyms(session);showMsg('✅ Duplikat gelöscht');
                              }} style={{padding:'4px 10px',borderRadius:6,background:'#e74c3c',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>{t.deleteBtn}</button>}
                              {i===0&&<span style={{color:'#27ae60',fontSize:10,flexShrink:0}}>✓ Behalten</span>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* SUCHE */}
                <div style={{position:'relative',marginBottom:8}}>
                  <input placeholder='🔍 Gym suchen...' onChange={e=>setGymSearchQuery(e.target.value)} value={gymSearchQuery||''}
                    style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                </div>

                <div style={{color:'#aaa',fontSize:11,marginBottom:8}}>{dbGyms.filter(g=>!gymSearchQuery||(g.name||'').toLowerCase().includes(gymSearchQuery.toLowerCase())||(g.city||'').toLowerCase().includes(gymSearchQuery.toLowerCase())).length} / {dbGyms.length} Gyms</div>
                {dbGyms.filter(g=>!gymSearchQuery||(g.name||'').toLowerCase().includes(gymSearchQuery.toLowerCase())||(g.city||'').toLowerCase().includes(gymSearchQuery.toLowerCase())).map((gym,i)=>(
                  <div key={gym.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 12px',marginBottom:8,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                    {editGymId===gym.id?(
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <input defaultValue={gym.name} id={'gn'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #c0392b',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Name'/>
                        <input defaultValue={gym.city} id={'gc'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #ddd',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Stadt'/>
                        <input defaultValue={gym.address||''} id={'ga'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #ddd',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Adresse'/>
                        <input defaultValue={gym.style||''} id={'gs'+gym.id} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #ddd',background:darkMode?'#111':'#f9f9f9',color:darkMode?'#fff':'#1a1a1a',fontSize:13,width:'100%',boxSizing:'border-box'}} placeholder='Stil z.B. MMA, Boxing'/>
                        {/* Logo Upload */}
                        <div style={{marginBottom:6}}>
                          <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>LOGO</div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {(gymLogos[gym.code]?.logo_url||gym.logo_url)&&<img src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:36,height:36,borderRadius:6,objectFit:'cover',border:'1px solid #ddd'}} alt=''/>}
                            <label style={{flex:1,padding:'6px 10px',borderRadius:8,border:'2px dashed '+(darkMode?'#333':'#ddd'),color:'#aaa',fontSize:11,cursor:'pointer',textAlign:'center'}}>
                              📷 Logo hochladen
                              <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                                const file=e.target.files?.[0];if(!file)return;
                                showMsg('Logo wird hochgeladen...');
                                try{
                                  const path='gyms/logo_'+gym.code+'_'+Date.now()+'.png';
                                  const url=await uploadPhoto(file,path,session.token);
                                  if(url){
                                    // Delete old logo first, then insert new
                                    await fetch(SUPA_URL+'/rest/v1/gym_logos?gym_code=eq.'+gym.code,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                                    // Delete old + insert new logo
                                    try{await fetch(SUPA_URL+'/rest/v1/gym_logos?gym_code=eq.'+gym.code,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});}catch{}
                                    await fetch(SUPA_URL+'/rest/v1/gym_logos',{
                                      method:'POST',
                                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                                      body:JSON.stringify({gym_code:gym.code,logo_url:url,verified:true})
                                    });
                                    setGymLogos(prev=>({...prev,[gym.code]:{logo_url:url,verified:true}}));
                                    await loadGymLogos();
                                    showMsg('✅ Logo gespeichert!');
                                  }
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }}/>
                            </label>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={async()=>{
                            const name=document.getElementById('gn'+gym.id)?.value?.trim();
                            const city=document.getElementById('gc'+gym.id)?.value?.trim();
                            const address=document.getElementById('ga'+gym.id)?.value?.trim();
                            const style=document.getElementById('gs'+gym.id)?.value?.trim();
                            if(!name||!city)return;
                            try{
                              await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name,city,address,style})});
                              await loadDbGyms(session);
                              await loadGymLogos();
                              setEditGymId(null);
                              showMsg('✅ Gespeichert — sofort in App aktiv');
                            }catch(e){showMsg('Fehler: '+e.message);}
                          }} style={{flex:1,padding:'7px',borderRadius:8,background:'#27ae60',border:'none',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>✓ SPEICHERN</button>
                          <button onClick={()=>setEditGymId(null)} style={{flex:1,padding:'7px',borderRadius:8,background:darkMode?'#2a2a2a':'#eee',border:'none',color:darkMode?'#fff':'#666',fontWeight:700,fontSize:12,cursor:'pointer'}}>✕ ABBRECHEN</button>
                          <button onClick={async()=>{
                            if(!window.confirm('Gym löschen?'))return;
                            try{
                              await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                              await loadDbGyms(session);
                              setEditGymId(null);
                              showMsg('✅ Gelöscht');
                            }catch(e){showMsg('Fehler: '+e.message);}
                          }} style={{padding:'7px 10px',borderRadius:8,background:'#e74c3c',border:'none',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>🗑️</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:36,height:36,borderRadius:8,background:darkMode?'#2a2a2a':'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',fontSize:14}}>
                          {(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:(gym.name||'?').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:darkMode?'#fff':'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{gym.name||'(kein Name)'}</div>
                          <div style={{fontSize:11,color:'#888'}}>{gym.city}{gym.style?' · '+gym.style:''}</div>
                        </div>
                        <button onClick={()=>setEditGymId(gym.id)} style={{padding:'5px 8px',borderRadius:6,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontSize:11,cursor:'pointer'}}>✏️</button>
                        <button onClick={async()=>{
                          if(!window.confirm('Gym löschen: "'+gym.name+'"?'))return;
                          await fetch(SUPA_URL+'/rest/v1/gyms?id=eq.'+gym.id,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                          await loadDbGyms(session);showMsg('✅ Gelöscht');
                        }} style={{padding:'5px 8px',borderRadius:6,background:'#e74c3c22',border:'1px solid #e74c3c44',color:'#e74c3c',fontSize:11,cursor:'pointer'}}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

                        {adminTab==='addgym'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:8}}>➕ NEUES GYM</div>
                {/* KI Suche */}
                <div style={{background:darkMode?'#111d2a':'#e8f4fd',borderRadius:10,padding:'12px',marginBottom:12,border:'1px solid #2980b944'}}>
                  <div style={{color:'#2980b9',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>🤖 KI SUCHE — Gym-Infos automatisch laden</div>
                  <div style={{display:'flex',gap:8}}>
                    <input value={gymSearchQuery||''} onChange={e=>setGymSearchQuery(e.target.value)} placeholder='z.B. Triple One Gym Düsseldorf' style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,outline:'none'}} onKeyDown={e=>{if(e.key==='Enter')document.getElementById('gymAIBtn')?.click();}}/>
                    <button id='gymAIBtn' onClick={async()=>{
                      if(!gymSearchQuery?.trim())return;
                      setGymSearchLoading(true);
                      try{
                        const r=await fetch('https://api.anthropic.com/v1/messages',{
                          method:'POST',
                          headers:{'Content-Type':'application/json'},
                          body:JSON.stringify({
                            model:'claude-sonnet-4-20250514',
                            max_tokens:800,
                            tools:[{type:'web_search_20250305',name:'web_search'}],
                            messages:[{role:'user',content:'Suche im Internet nach dem Kampfsport-Gym: "'+gymSearchQuery.trim()+'". Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text) mit diesen Feldern: name (vollständiger Name), city (nur Stadtname), address (Straße + Hausnummer + PLZ + Stadt), style (Hauptkampfstil), phone, hours (Öffnungszeiten), website, description (kurze Beschreibung auf Deutsch, max 80 Wörter). Falls ein Feld unbekannt ist, leerer String.'}]
                          })
                        });
                        const d=await r.json();
                        const txt=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
                        const clean=txt.replace(/```json|```/g,'').trim();
                        const start=clean.indexOf('{');
                        const end=clean.lastIndexOf('}');
                        if(start>=0&&end>start){
                          const gym=JSON.parse(clean.slice(start,end+1));
                          if(gym.name)setAdminGymName(gym.name);
                          if(gym.city)setAdminGymCity(gym.city);
                          if(gym.address)setAdminGymAddress(gym.address);
                          if(gym.style)setAdminGymStyles(gym.style);
                          if(gym.phone)setAdminGymPhone(gym.phone);
                          if(gym.hours)setAdminGymHours(gym.hours);
                          if(gym.description)setAdminGymDesc(gym.description);
                          showMsg('✅ Infos geladen — bitte prüfen und speichern');
                        }else{showMsg('Keine Infos gefunden');}
                      }catch(e){showMsg('Fehler: '+e.message);}
                      setGymSearchLoading(false);
                    }} style={{padding:'8px 14px',borderRadius:8,background:'#2980b9',border:'none',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                      {gymSearchLoading?'⏳':'🔍 Suchen'}
                    </button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[['GYM NAME *',adminGymName,setAdminGymName,'z.B. Tiger Gym Berlin'],['STADT *',adminGymCity,setAdminGymCity,'z.B. Berlin'],['ADRESSE',adminGymAddress||'',setAdminGymAddress,'z.B. Hauptstr. 1, 40000 Düsseldorf'],['KAMPFSTILE',adminGymStyles,setAdminGymStyles,'z.B. Boxing, MMA, BJJ'],['TELEFON',adminGymPhone,setAdminGymPhone,'+49 ...'],['ÖFFNUNGSZEITEN',adminGymHours,setAdminGymHours,'Mo-Fr 17:00-22:00']].map(([lbl,val,set,ph])=>(
                    <div key={lbl}><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>{lbl}</div>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/></div>
                  ))}
                  <div><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>BESCHREIBUNG</div>
                  <textarea value={adminGymDesc} onChange={e=>setAdminGymDesc(e.target.value)} placeholder="Kurze Beschreibung des Gyms..." rows={3} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box',resize:'none'}}/></div>
                  <button onClick={async()=>{
                    if(!adminGymName||!adminGymCity){showMsg('Name + Stadt eingeben');return;}
                    const code=adminGymName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,3)+'-'+Math.floor(1000+Math.random()*9000);
                    setAdminSaving(true);
                    try{
                      const trimmedName=adminGymName.trim();
                      const trimmedCity=adminGymCity.trim();
                      await fetch(SUPA_URL+'/rest/v1/gyms',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name:trimmedName,city:trimmedCity,address:(adminGymAddress||'').trim(),style:adminGymStyles,styles:adminGymStyles?[adminGymStyles]:[],phone:adminGymPhone,hours:adminGymHours,description:adminGymDesc,code,verified:false,members:0,rating:0})});
                      await loadDbGyms(session);
                      showMsg('✅ '+trimmedName+' in '+trimmedCity+' hinzugefügt!');
                      setAdminGymName('');setAdminGymCity('');setAdminGymStyles('');setAdminGymPhone('');setAdminGymHours('');setAdminGymDesc('');
                    }catch(e){showMsg('Fehler: '+e.message);}
                    setAdminSaving(false);
                  }} style={{padding:'11px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer',letterSpacing:2}}>GYM HINZUFÜGEN</button>
                </div>
              </div>
            )}

            {/* ── STADT HINZUFÜGEN ── */}
            {adminTab==='addcity'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:8}}>🌍 NEUE STADT + GYM</div>
                <div style={{color:'#aaa',fontSize:11,marginBottom:12}}>{appLang==='FR'?'La ville sera visible immédiatement.':appLang==='EN'?'City will be immediately visible.':'Stadt wird sofort im Gym-Reiter sichtbar.'}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
                  <div><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>STADTNAME *</div>
                  <input value={adminCityName||''} onChange={e=>setAdminCityName(e.target.value)} placeholder='z.B. Neuss' style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box'}}/></div>
                  <div><div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:4}}>GYM NAME (optional)</div>
                  <input value={adminCityGymName||''} onChange={e=>setAdminCityGymName(e.target.value)} placeholder='z.B. Kampfsport Neuss' style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box'}}/></div>
                </div>
                <button onClick={async()=>{
                  const city=(adminCityName||'').trim();
                  if(!city){showMsg('Stadtname eingeben');return;}
                  const gymName=(adminCityGymName||('Kampfsport '+city)).trim();
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/gyms',{
                      method:'POST',
                      headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                      body:JSON.stringify({name:gymName,city,code:gymName.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,15)+'-'+Date.now().toString().slice(-4),emoji:'',members:0,rating:0,style:'Kampfsport',styles:['Kampfsport']})
                    });
                    if(resp.ok||resp.status===201){
                      await loadDbGyms(session);
                      showMsg('✅ '+city+' hinzugefügt!');
                      setAdminCityName('');setAdminCityGymName('');
                    } else {
                      const err=await resp.text();
                      showMsg('Fehler: '+err);
                    }
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,cursor:'pointer',letterSpacing:2}}>STADT HINZUFÜGEN</button>
              </div>
            )}


            {adminTab==='events'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>📅 EVENTS VERWALTEN</div>
                <button onClick={()=>loadEvents(session)} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12}}>🔄 EVENTS LADEN</button>
                {events.length===0?(
                  <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noEvents}</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {[...events].sort((a,b)=>new Date(a.event_date)-new Date(b.event_date)).map(ev=>{
                      const parts=eventParticipants[ev.id]||[];
                      const typeColors={'Sparring':RED,'Community Training':'#27ae60','Wettkampf':'#d4a017','Open Mat':'#2980b9','Seminar':'#8e44ad'};
                      const color=typeColors[ev.event_type]||RED;
                      const isPast=ev.event_date&&new Date(ev.event_date)<new Date(new Date().toDateString());
                      return(
                        <div key={ev.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,border:'1px solid '+(isPast?(darkMode?'#2a2a2a':'#eee'):color+'33'),padding:'12px',opacity:isPast?0.6:1}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                                <div style={{background:color+'18',border:'1px solid '+color+'33',borderRadius:20,padding:'1px 7px',color:color,fontSize:9,fontWeight:700}}>{ev.event_type}</div>
                                {isPast&&<div style={{background:'#88888818',borderRadius:20,padding:'1px 7px',color:'#888',fontSize:9,fontWeight:700}}>VERGANGEN</div>}
                              </div>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                              <div style={{color:'#aaa',fontSize:11,marginTop:2}}>📍 {ev.city}{ev.address?' · '+ev.address:''}</div>
                              <div style={{color:'#aaa',fontSize:11,marginTop:1}}>
                                📅 {ev.event_date?new Date(ev.event_date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):''}{ev.event_time?' · 🕐 '+ev.event_time+' Uhr':''}
                              </div>
                              <div style={{color:'#888',fontSize:11,marginTop:2}}>👥 {parts.length}/{ev.max_participants||10} Teilnehmer</div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
                              <button onClick={async()=>{
                                if(!window.confirm('Event "'+ev.title+'" wirklich löschen?'))return;
                                try{
                                  await fetch(SUPA_URL+'/rest/v1/event_participants?event_id=eq.'+ev.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                                  await fetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                                  await loadEvents(session);
                                  showMsg('Event gelöscht ✅');
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }} style={{padding:'5px 10px',borderRadius:6,background:'#e74c3c22',border:'1px solid #e74c3c44',color:'#e74c3c',fontSize:11,fontWeight:700,cursor:'pointer'}}>{t.deleteBtn}</button>
                              <button onClick={async()=>{
                                const newTitle=window.prompt('Neuer Titel:',ev.title);
                                if(!newTitle||!newTitle.trim())return;
                                try{
                                  await fetch(SUPA_URL+'/rest/v1/events?id=eq.'+ev.id,{
                                    method:'PATCH',
                                    headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},
                                    body:JSON.stringify({title:newTitle.trim()})
                                  });
                                  await loadEvents(session);
                                  showMsg('Titel geändert ✅');
                                }catch(e){showMsg('Fehler: '+e.message);}
                              }} style={{padding:'5px 10px',borderRadius:6,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#666',fontSize:11,cursor:'pointer'}}>✏️ Bearbeiten</button>
                            </div>
                          </div>
                          {parts.length>0&&(
                            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                              <div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:5}}>ANGEMELDETE TEILNEHMER</div>
                              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                                {parts.map((p,i)=>(
                                  <div key={i} style={{background:darkMode?'#2a2a2a':'#f5f5f5',borderRadius:6,padding:'3px 8px',fontSize:10,color:darkMode?'#aaa':'#555'}}>{p.profiles?.name||p.user_id?.slice(0,8)+'...'}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

                        {/* ── USER VERWALTEN ── */}
            {adminTab==='users'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>👤 USER ({adminUsers.length})</div>
                <button onClick={async()=>{
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?order=created_at.desc&limit=500',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminUsers(data);setAdminUsersLoaded(true);}
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>{adminUsersLoaded?'🔄 AKTUALISIEREN':'USER LADEN'}</button>
                {adminUsers.map(u=>(
                  <div key={u.id} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,border:'1px solid '+(u.banned?'#e74c3c44':(darkMode?'#2a2a2a':'#eee')),marginBottom:5}}>
                    {u.avatar_url?<img src={u.avatar_url} style={{width:34,height:34,borderRadius:'50%',objectFit:'cover',opacity:u.banned?0.4:1}} alt=''/>:<div style={{width:34,height:34,borderRadius:'50%',background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:u.banned?'#e74c3c':(darkMode?'#fff':'#1a1a1a'),fontSize:12,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.name||'?'} {u.banned&&'🚫'}</div>
                      <div style={{color:'#aaa',fontSize:10}}>{u.city} · {u.style} · {new Date(u.created_at).toLocaleDateString('de')}</div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={async()=>{
                        const ban=!u.banned;
                        await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({banned:ban})});
                        setAdminUsers(prev=>prev.map(x=>x.id===u.id?{...x,banned:ban}:x));
                        if(ban) setAllProfiles(prev=>prev.filter(x=>x.id!==u.id));
                        showMsg(ban?'User gesperrt 🚫':'User entsperrt ✅');
                      }} style={{background:u.banned?'#27ae60':'#e74c3c',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>{u.banned?'Freig.':'Sperren'}</button>
                      <button onClick={async()=>{
                        const msg=window.prompt('Nachricht an '+u.name+':');
                        if(!msg||!msg.trim())return;
                        try{
                          await fetch(SUPA_URL+'/rest/v1/admin_messages',{
                            method:'POST',
                            headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},
                            body:JSON.stringify({user_id:u.id,message:msg,from_admin:true,read:false})
                          });
                          showMsg('✅ Nachricht gesendet an '+(u.name||'User'));
                        }catch(e){showMsg('Fehler: '+e.message);}
                      }} style={{background:'#2980b9',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✉️</button>
                      <button onClick={async()=>{
                        if(!window.confirm('User '+u.name+' wirklich löschen? Das kann nicht rückgängig gemacht werden.'))return;
                        try{
                          // 1. Alle Daten löschen
                          await fetch(SUPA_URL+'/rest/v1/messages?sender_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                          await fetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                          await fetch(SUPA_URL+'/rest/v1/swipes?target_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                          await fetch(SUPA_URL+'/rest/v1/matches?profile_a_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                          await fetch(SUPA_URL+'/rest/v1/matches?profile_b_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                          // 2. Profile löschen + banned setzen damit Login fehlschlägt
                          await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({banned:true,name:'[Gelöscht]',avatar_url:null,bio:null})});
                          // 3. Auth User löschen
                          const authResp=await fetch(SUPA_URL+'/auth/v1/admin/users/'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,'Content-Type':'application/json','X-Supabase-Admin':SUPA_SERVICE_KEY}});
                          if(authResp.ok){
                            await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                            showMsg('✅ User vollständig gelöscht');
                          }else{
                            showMsg('✅ User gesperrt + Daten gelöscht (Auth-Account bleibt)');
                          }
                          setAdminUsers(prev=>prev.filter(x=>x.id!==u.id));
                          setAllProfiles(prev=>prev.filter(x=>x.id!==u.id));
                        }catch(e){
                          showMsg('Fehler: '+e.message);
                        }
                      }} style={{background:'none',border:'1px solid #e74c3c',borderRadius:6,padding:'4px 6px',color:'#e74c3c',fontSize:10,cursor:'pointer'}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── GEMELDETE USER ── */}
            {adminTab==='reports'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🚨 MELDUNGEN</div>
                <button onClick={async()=>{
                  try{
                    const data=await dbSelect('reports','order=created_at.desc&limit=50',session.token);
                    if(Array.isArray(data))setAdminReports(data);
                    else setAdminReports([]);
                  }catch{setAdminReports([]);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>MELDUNGEN LADEN</button>
                {adminReports.length===0&&<div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noReports}</div>}
                {adminReports.map((r,i)=>(
                  <div key={r.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px',border:'1px solid #e74c3c44',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <div style={{color:RED,fontSize:11,fontWeight:700}}>🚨 {r.reason||'Kein Grund angegeben'}</div>
                      <div style={{color:'#bbb',fontSize:10}}>{new Date(r.created_at).toLocaleDateString('de')}</div>
                    </div>
                    <div style={{color:darkMode?'#aaa':'#666',fontSize:11}}>Gemeldet: <strong>{r.reported_name||r.reported_id}</strong></div>
                    <div style={{color:'#bbb',fontSize:10,marginTop:2}}>Von: {r.reporter_id?.slice(0,8)}...</div>
                    <div style={{display:'flex',gap:6,marginTop:8}}>
                      <button onClick={async()=>{
                        await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+r.reported_id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({banned:true})});
                        showMsg('User gesperrt 🚫');
                        setAdminReports(prev=>prev.filter(x=>x.id!==r.id));
                      }} style={{flex:1,padding:'7px',borderRadius:7,background:'#e74c3c',border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🚫 Sperren</button>
                      <button onClick={async()=>{
                        await fetch(SUPA_URL+'/rest/v1/reports?id=eq.'+r.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                        setAdminReports(prev=>prev.filter(x=>x.id!==r.id));
                        showMsg('Meldung ignoriert');
                      }} style={{flex:1,padding:'7px',borderRadius:7,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#aaa':'#666',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Ignorieren</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── KAMPFREKORD VERIFIZIEREN ── */}
            {adminTab==='records'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🏅 REKORD-ANTRÄGE</div>
                <button onClick={async()=>{
                  try{
                    const data=await dbSelect('profiles','record_verified=eq.pending&select=id,name,city,style,record_proof_url,created_at&limit=30',session.token);
                    if(Array.isArray(data))setAdminRecords(data);
                    else setAdminRecords([]);
                  }catch{setAdminRecords([]);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>ANTRÄGE LADEN</button>
                {adminRecords.length===0&&<div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noRequests}</div>}
                {adminRecords.map((u,i)=>(
                  <div key={u.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px',border:'1px solid #d4a01744',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <div style={{flex:1}}>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:700}}>{u.name}</div>
                        <div style={{color:'#aaa',fontSize:10}}>{u.city} · {u.style}</div>
                      </div>
                      <div style={{background:'#d4a01722',borderRadius:6,padding:'2px 7px',color:'#d4a017',fontSize:10,fontWeight:700}}>⏳ WARTEND</div>
                    </div>
                    {u.record_proof_url&&<img src={u.record_proof_url} style={{width:'100%',borderRadius:8,marginBottom:8,maxHeight:200,objectFit:'contain',background:'#f0f0f0'}} alt='Nachweis'/>}
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={async()=>{
                        await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({record_verified:'verified'})});
                        setAdminRecords(prev=>prev.filter(x=>x.id!==u.id));
                        showMsg('✅ Rekord verifiziert!');
                      }} style={{flex:1,padding:'8px',borderRadius:7,background:'#27ae60',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Bestätigen</button>
                      <button onClick={async()=>{
                        await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({record_verified:'rejected'})});
                        setAdminRecords(prev=>prev.filter(x=>x.id!==u.id));
                        showMsg('❌ Abgelehnt');
                      }} style={{flex:1,padding:'8px',borderRadius:7,background:'#e74c3c',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>❌ Ablehnen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── BROADCAST ── */}
            {adminTab==='feedback'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>💬 FEEDBACK & WÜNSCHE</div>
                <button onClick={async()=>{
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/feedback?order=created_at.desc&limit=100',{
                      headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}
                    });
                    const data=await resp.json();
                    if(Array.isArray(data))setAdminFeedback(data);
                    else setAdminFeedback([]);
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:12}}>
                  🔄 FEEDBACK LADEN
                </button>
                {/* Filter Tabs */}
                <div style={{display:'flex',gap:6,marginBottom:12}}>
                  {[['alle','Alle'],['feedback','💬 Feedback'],['wunsch','⭐ Wünsche']].map(([type,label])=>(
                    <button key={type} onClick={()=>setFeedbackFilter(type)}
                      style={{flex:1,padding:'7px',borderRadius:8,background:feedbackFilter===type?RED:'transparent',border:'1px solid '+(feedbackFilter===type?RED:(darkMode?'#333':'#ddd')),color:feedbackFilter===type?'#fff':(darkMode?'#aaa':'#666'),fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      {label}
                    </button>
                  ))}
                </div>
                {adminFeedback.length===0?(
                  <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'20px 0'}}>{t.noFeedbackYet}</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {adminFeedback.filter(f=>feedbackFilter==='alle'||f.type===feedbackFilter).map((fb,i)=>(
                      <div key={fb.id||i} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px 14px',border:'1px solid '+(fb.type==='wunsch'?'#d4a01744':(darkMode?'#2a2a2a':'#eee')),position:'relative'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <div style={{background:fb.type==='wunsch'?'#d4a01722':'#2980b922',border:'1px solid '+(fb.type==='wunsch'?'#d4a01744':'#2980b944'),borderRadius:20,padding:'2px 8px',color:fb.type==='wunsch'?'#d4a017':'#2980b9',fontSize:10,fontWeight:700}}>
                              {fb.type==='wunsch'?'⭐ WUNSCH':'💬 FEEDBACK'}
                            </div>
                            {!fb.read&&<div style={{background:RED,borderRadius:20,padding:'2px 8px',color:'#fff',fontSize:9,fontWeight:700}}>NEU</div>}
                          </div>
                          <div style={{color:'#aaa',fontSize:10}}>
                            {fb.created_at?new Date(fb.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):''}
                          </div>
                        </div>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,lineHeight:1.6,marginBottom:6}}>{fb.message}</div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div style={{color:'#aaa',fontSize:11}}>👤 {fb.user_name||'Anonym'}</div>
                          <button onClick={async()=>{
                            try{
                              await fetch(SUPA_URL+'/rest/v1/feedback?id=eq.'+fb.id,{
                                method:'PATCH',
                                headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},
                                body:JSON.stringify({read:true})
                              });
                              setAdminFeedback(prev=>prev.map(f=>f.id===fb.id?{...f,read:true}:f));
                            }catch{}
                          }} style={{background:'none',border:'1px solid '+(darkMode?'#333':'#ddd'),borderRadius:6,padding:'3px 8px',color:darkMode?'#666':'#aaa',fontSize:10,cursor:'pointer'}}>
                            {fb.read?'✓ Gelesen':'Als gelesen markieren'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminTab==='equipment'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🥊 EQUIPMENT VERWALTEN</div>

                {/* NEUES PRODUKT HINZUFÜGEN */}
                <div style={{background:darkMode?'#1a1a1a':'#f9f9f9',borderRadius:12,padding:'14px',marginBottom:16,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div style={{color:RED,fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:10}}>➕ NEUES PRODUKT</div>
                  {[
                    ['Marke *','brand','z.B. Paffen Sport'],
                    ['Produkt *','product','z.B. Pro Mexican Boxing Gloves'],
                    ['Beschreibung','description','z.B. Professionelle Boxhandschuhe für Training & Wettkampf'],
                    ['Link / URL','url','z.B. https://paffen-sport.com/...'],
                    ['Bild URL','image_url','z.B. https://... (optional)'],
                    ['Rabattcode','discount_code','z.B. FIGHTER10 (optional)'],
                  ].map(([label,key,ph])=>(
                    <div key={key} style={{marginBottom:8}}>
                      <div style={{color:'#aaa',fontSize:10,marginBottom:3}}>{label}</div>
                      <input value={newEquip[key]} onChange={e=>setNewEquip(p=>({...p,[key]:e.target.value}))}
                        placeholder={ph}
                        style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13,boxSizing:'border-box'}}/>
                    </div>
                  ))}
                  <div style={{marginBottom:8}}>
                    <div style={{color:'#aaa',fontSize:10,marginBottom:3}}>Kategorie</div>
                    <select value={newEquip.category} onChange={e=>setNewEquip(p=>({...p,category:e.target.value}))}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid '+(darkMode?'#333':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>
                      {['Boxen','Kickboxing','MMA','BJJ','Muay Thai','Grappling','Allgemein','Schutzausrüstung','Bekleidung','Supplements'].map(cat=>(
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <input type='checkbox' checked={newEquip.featured} onChange={e=>setNewEquip(p=>({...p,featured:e.target.checked}))} id='featured_cb'/>
                    <label htmlFor='featured_cb' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,cursor:'pointer'}}>⭐ Featured (oben anzeigen)</label>
                  </div>
                  <button onClick={async()=>{
                    if(!newEquip.brand||!newEquip.product){showMsg('Marke und Produkt sind Pflicht');return;}
                    try{
                      const res=await fetch(SUPA_URL+'/rest/v1/equipment',{
                        method:'POST',
                        headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=representation'},
                        body:JSON.stringify({...newEquip,sort_order:Date.now()})
                      });
                      const data=await res.json();
                      if(Array.isArray(data)&&data[0]){
                        setEquipmentList(prev=>[data[0],...prev]);
                        setNewEquip({brand:'',product:'',description:'',category:'Boxen',url:'',image_url:'',discount_code:'',featured:false});
                        showMsg('✅ Produkt hinzugefügt!');
                      }else showMsg('Fehler: '+JSON.stringify(data));
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                    ➕ PRODUKT SPEICHERN
                  </button>
                </div>

                {/* LISTE LADEN */}
                <button onClick={async()=>{
                  setEquipLoading(true);
                  try{
                    const res=await fetch(SUPA_URL+'/rest/v1/equipment?order=featured.desc,sort_order.asc',{
                      headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}
                    });
                    const data=await res.json();
                    setEquipmentList(Array.isArray(data)?data:[]);
                  }catch(e){showMsg('Fehler: '+e.message);}
                  setEquipLoading(false);
                }} style={{width:'100%',padding:'9px',borderRadius:8,background:darkMode?'#2a2a2a':'#f0f0f0',border:'none',color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12}}>
                  {equipLoading?'Laden...':'🔄 ALLE PRODUKTE LADEN'}
                </button>

                {/* PRODUKT LISTE */}
                {equipmentList.map(eq=>(
                  <div key={eq.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'12px',marginBottom:8,border:'1px solid '+(eq.featured?'#d4a01744':(darkMode?'#2a2a2a':'#eee'))}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                          {eq.featured&&<span style={{background:'#d4a01722',border:'1px solid #d4a01744',borderRadius:20,padding:'1px 7px',color:'#d4a017',fontSize:10,fontWeight:700}}>⭐ FEATURED</span>}
                          <span style={{background:RED+'22',border:'1px solid '+RED+'44',borderRadius:20,padding:'1px 7px',color:RED,fontSize:10,fontWeight:700}}>{eq.category}</span>
                        </div>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{eq.brand} — {eq.product}</div>
                        {eq.description&&<div style={{color:'#aaa',fontSize:11,marginTop:2}}>{eq.description}</div>}
                        {eq.url&&<div style={{color:'#2980b9',fontSize:11,marginTop:2}}>🔗 {eq.url.replace('https://','').slice(0,50)}</div>}
                        {eq.discount_code&&<div style={{color:'#27ae60',fontSize:11,marginTop:2}}>🏷️ Code: {eq.discount_code}</div>}
                      </div>
                      <button onClick={async()=>{
                        if(!window.confirm('Löschen?'))return;
                        await fetch(SUPA_URL+'/rest/v1/equipment?id=eq.'+eq.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                        setEquipmentList(prev=>prev.filter(e=>e.id!==eq.id));
                        showMsg('Gelöscht');
                      }} style={{background:'none',border:'1px solid #e74c3c44',borderRadius:6,padding:'4px 8px',color:'#e74c3c',fontSize:11,cursor:'pointer',flexShrink:0,marginLeft:8}}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adminTab==='broadcast'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>📢 NACHRICHT AN ALLE</div>
                <div style={{color:'#aaa',fontSize:11,marginBottom:12,lineHeight:1.6}}>Sende eine Systemnachricht die alle User beim nächsten Öffnen der App sehen.</div>
                <textarea value={adminBroadcast} onChange={e=>setAdminBroadcast(e.target.value)} placeholder="z.B. Neues Feature: Jetzt Gym-Seiten besuchen! 🏋️" rows={4} style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid '+(darkMode?'#2a2a2a':'#ddd'),background:darkMode?'#111':'#fff',color:darkMode?'#fff':'#1a1a1a',fontSize:14,boxSizing:'border-box',resize:'none',marginBottom:10}}/>
                <button onClick={async()=>{
                  if(!adminBroadcast.trim()){showMsg('Nachricht eingeben');return;}
                  setAdminSaving(true);
                  try{
                    // Alle User laden
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?select=id&banned=neq.true&limit=500',{headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                    const users=await resp.json();
                    if(!Array.isArray(users)||users.length===0){showMsg('Keine User gefunden');setAdminSaving(false);return;}
                    // Für jeden User eine admin_message anlegen
                    let sent=0;
                    for(const u of users){
                      try{
                        await fetch(SUPA_URL+'/rest/v1/admin_messages',{
                          method:'POST',
                          headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},
                          body:JSON.stringify({user_id:u.id,message:adminBroadcast,from_admin:true,read:false})
                        });
                        sent++;
                      }catch{}
                    }
                    showMsg('✅ Nachricht an '+sent+' User gesendet!');
                    setAdminBroadcast('');
                  }catch(e){showMsg('Fehler: '+e.message);}
                  setAdminSaving(false);
                }} style={{width:'100%',padding:'12px',borderRadius:10,background:adminSaving?'#aaa':`linear-gradient(135deg,${RED},#e74c3c)`,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,cursor:adminSaving?'not-allowed':'pointer',letterSpacing:2}}>{adminSaving?'Sende...':'📢 AN ALLE SENDEN'}</button>

                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2,marginBottom:6}}>✉️ AKTIVIERUNGS-MAILS</div>
                  <div style={{color:'#aaa',fontSize:11,marginBottom:10,lineHeight:1.6}}>Schickt eine E-Mail an alle User die sich noch nicht bestätigt haben damit sie sich einloggen können.</div>
                  <button onClick={async()=>{
                    if(!window.confirm('Aktivierungs-E-Mail an alle unbestätigten User senden?'))return;
                    showMsg('Sende E-Mails...');
                    try{
                      const resp=await fetch(SUPA_URL+'/auth/v1/admin/users?page=1&per_page=100',{
                        headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}
                      });
                      const data=await resp.json();
                      const unconfirmed=(data.users||[]).filter(u=>!u.email_confirmed_at);
                      let sent=0;
                      for(const u of unconfirmed){
                        try{
                          await fetch('https://api.resend.com/emails',{
                            method:'POST',
                            headers:{'Content-Type':'application/json','Authorization':'Bearer re_Y2CAV2io_E166bEXwLZVym2yHXoiYq3dg'},
                            body:JSON.stringify({
                              from:'Fighter App <noreply@fighterapp.de>',
                              to:u.email,
                              subject:'Dein Fighter Account ist jetzt aktiv 🥊',
                              html:'<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0d0d0d;color:#fff;border-radius:12px"><h1 style="color:#c0392b;font-size:28px;letter-spacing:4px;margin:0 0 16px">FIGHTER</h1><p style="font-size:15px;line-height:1.6">Hey Fighter,<br><br>dein Account ist jetzt aktiviert — du kannst dich sofort einloggen!</p><a href="https://fighterapp.de" style="display:inline-block;background:#c0392b;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">👊 Jetzt einloggen</a><p style="color:#888;font-size:13px;margin-top:16px">Finde Sparringpartner & Gegner in deiner Nähe.<br>Swipe. Match. Fight.</p><p style="color:#444;font-size:11px;margin-top:24px;border-top:1px solid #222;padding-top:12px">© 2026 Fighter App · fighterapp.de</p></div>'
                            })
                          });
                          sent++;
                        }catch{}
                      }
                      showMsg('✅ '+sent+'/'+unconfirmed.length+' E-Mails gesendet!');
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }} style={{width:'100%',padding:'12px',borderRadius:10,background:'#2980b9',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:1}}>✉️ AKTIVIERUNGS-MAILS SENDEN</button>
                </div>
              </div>
            )}

            {/* ── STATISTIKEN ── */}
            {adminTab==='scanner'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>🔍 STÄDTE & GYMS SCANNER</div>
                <button onClick={async()=>{
                  showMsg('Scanne alle Profile...');
                  try{
                    // Alle Profile laden
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?select=city,gym&limit=500',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const profiles=await resp.json();
                    // Bekannte Städte aus DB — mit Session Token
                    const gymResp=await fetch(SUPA_URL+'/rest/v1/gyms?select=city,name',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const existingGyms=await gymResp.json();
                    const existingCities=new Set((Array.isArray(existingGyms)?existingGyms:[]).map(g=>g.city?.toLowerCase().trim()));
                    const existingGymNames=new Set((Array.isArray(existingGyms)?existingGyms:[]).map(g=>g.name?.toLowerCase().trim()));
                    // Hardcoded Städte auch
                    Object.keys(GYMS).forEach(c=>existingCities.add(c.toLowerCase()));
                    // Neue Städte finden
                    const newCities={};
                    const newGyms={};
                    if(Array.isArray(profiles)){
                      profiles.forEach(p=>{
                        if(p.city&&!existingCities.has(p.city.toLowerCase().trim())){
                          newCities[p.city]=(newCities[p.city]||0)+1;
                        }
                        if(p.gym&&!existingGymNames.has(p.gym.toLowerCase().trim())){
                          newGyms[p.gym]={city:p.city,count:(newGyms[p.gym]?.count||0)+1};
                        }
                      });
                    }
                    setScanResult({cities:Object.entries(newCities).sort((a,b)=>b[1]-a[1]),gyms:Object.entries(newGyms).sort((a,b)=>b[1].count-a[1].count)});
                    showMsg('Scan abgeschlossen!');
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:16}}>
                  🔍 JETZT SCANNEN
                </button>
                {scanResult&&(
                  <>
                    {/* Fehlende Städte */}
                    {scanResult.cities.length>0&&(
                      <div style={{marginBottom:16}}>
                        <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>FEHLENDE STÄDTE ({scanResult.cities.length})</div>
                        {scanResult.cities.map(([city,count])=>(
                          <div key={city} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                            <div style={{flex:1}}>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{city}</div>
                              <div style={{color:'#aaa',fontSize:11}}>{count} User</div>
                            </div>
                            <button onClick={async()=>{
                              try{
                                // Nur Stadt hinzufügen — User kann danach Gym Namen eingeben
                                const gymName=window.prompt('Gym Name für '+city+' (oder leer lassen):');
                                const name=gymName&&gymName.trim()?gymName.trim():'Kampfsport '+city;
                                await fetch(SUPA_URL+'/rest/v1/gyms',{
                                  method:'POST',
                                  headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},
                                  body:JSON.stringify({name,city,code:name.toUpperCase().replace(/[^A-Z0-9]/g,'-').slice(0,20)+'-'+Date.now().toString().slice(-4),emoji:'',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})
                                });
                                setScanResult(prev=>({...prev,cities:prev.cities.filter(([c])=>c!==city)}));
                                await loadDbGyms(session);
                                showMsg('✅ '+city+' hinzugefügt');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }} style={{background:'#27ae60',border:'none',borderRadius:6,padding:'6px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Hinzufügen</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Fehlende Gyms */}
                    {scanResult.gyms.length>0&&(
                      <div>
                        <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>FEHLENDE GYMS ({scanResult.gyms.length})</div>
                        {scanResult.gyms.map(([gym,data])=>(
                          <div key={gym} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                            <div style={{flex:1}}>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{gym}</div>
                              <div style={{color:'#aaa',fontSize:11}}>{data.city||'?'} · {data.count} User</div>
                            </div>
                            <button onClick={async()=>{
                              try{
                                await fetch(SUPA_URL+'/rest/v1/gyms',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name:gym,city:data.city||'Unbekannt',code:gym.toUpperCase().replace(/\s/g,'-').slice(0,20),emoji:'',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})});
                                setScanResult(prev=>({...prev,gyms:prev.gyms.filter(([g])=>g!==gym)}));
                                await loadDbGyms(session);
                                showMsg('✅ '+gym+' hinzugefügt');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }} style={{background:'#27ae60',border:'none',borderRadius:6,padding:'6px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Hinzufügen</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {scanResult.cities.length===0&&scanResult.gyms.length===0&&(
                      <div style={{textAlign:'center',padding:'30px',color:darkMode?'#555':'#bbb'}}>
                        <div style={{fontSize:32,marginBottom:8}}>✅</div>
                        <div style={{fontSize:14}}>{appLang==='FR'?'Toutes les villes et salles sont déjà enregistrées!':appLang==='EN'?'All cities and gyms are already registered!':'Alle Städte und Gyms sind bereits erfasst!'}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {adminTab==='stats'&&(
              <div>
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,letterSpacing:2,marginBottom:12}}>📊 ECHTZEIT STATISTIKEN</div>
                <button onClick={async()=>{
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?order=created_at.desc&limit=500',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminUsers(data);setAdminUsersLoaded(true);}
                  }catch(e){showMsg('Fehler: '+e.message);}
                }} style={{width:'100%',padding:'10px',borderRadius:8,background:RED,border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12}}>
                  🔄 STATS AKTUALISIEREN
                </button>
                {adminUsersLoaded&&(
                  <>
                    {/* Haupt-Stats */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                      {[
                        ['','Gesamt User',adminUsers.length],
                        ['🟢','Heute aktiv',adminUsers.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<86400000).length],
                        ['⚡','Diese Woche',adminUsers.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<604800000).length],
                        ['🚫','Gesperrt',adminUsers.filter(u=>u.banned).length],
                      ].map(([icon,label,val])=>(
                        <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px 12px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),textAlign:'center'}}>
                          <div style={{fontSize:22}}>{icon}</div>
                          <div style={{color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:28,lineHeight:1}}>{val}</div>
                          <div style={{color:darkMode?'#aaa':'#888',fontSize:10,marginTop:2}}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Neue User heute */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:8}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>NEUE USER HEUTE</div>
                      {adminUsers.filter(u=>u.created_at&&(Date.now()-new Date(u.created_at).getTime())<86400000).length===0
                        ?<div style={{color:darkMode?'#555':'#bbb',fontSize:12,textAlign:'center',padding:'8px 0'}}>{appLang==='FR'?"Pas encore de nouveaux utilisateurs aujourd'hui":appLang==='EN'?'No new users today':'Noch keine neuen User heute'}</div>
                        :adminUsers.filter(u=>u.created_at&&(Date.now()-new Date(u.created_at).getTime())<86400000).map((u,i)=>(
                          <div key={i} onClick={()=>{setShowAdmin(false);setViewProfile(u);}} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                            {u.avatar_url?<img src={u.avatar_url} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt=''/>:<div style={{width:28,height:28,borderRadius:'50%',background:RED,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',fontWeight:700,flexShrink:0}}>{u.name?u.name[0].toUpperCase():'?'}</div>}
                            <div style={{flex:1}}>
                              <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,fontWeight:600}}>{u.name||'Unbekannt'}</div>
                              <div style={{color:darkMode?'#666':'#aaa',fontSize:10}}>{u.style||'?'} · {u.city||'?'}</div>
                            </div>
                            <div style={{color:darkMode?'#555':'#bbb',fontSize:10}}>{u.created_at?new Date(u.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'?'}</div>
                          </div>
                        ))
                      }
                    </div>
                    {/* Alle User */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:8}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>ALLE USER ({adminUsers.length})</div>
                      {adminUsers.map((u,i)=>(
                        <div key={i} onClick={()=>{setShowAdmin(false);setViewProfile(u);}} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                          {u.avatar_url?<img src={u.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0,opacity:u.banned?0.4:1}} alt=''/>:<div style={{width:32,height:32,borderRadius:'50%',background:u.banned?'#555':RED,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700,flexShrink:0}}>{u.name?u.name[0].toUpperCase():'?'}</div>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:u.banned?'#e74c3c':(darkMode?'#fff':'#1a1a1a'),fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name||'Unbekannt'} {u.banned&&'🚫'}</div>
                            <div style={{color:darkMode?'#666':'#aaa',fontSize:10}}>{u.style||'?'} · {u.city||'?'}</div>
                          </div>
                          <div style={{color:darkMode?'#555':'#888',fontSize:10,flexShrink:0}}>{u.created_at?new Date(u.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'?'}</div>
                        </div>
                      ))}
                    </div>
                    {/* Top Städte */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:8}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>TOP STÄDTE</div>
                      {(()=>{const cnt={};const norm=s=>(s||'').trim().toLowerCase().replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ä/g,'ae').replace(/ß/g,'ss');const normMap={};adminUsers.forEach(u=>{if(u.city){const k=norm(u.city);if(!normMap[k])normMap[k]=u.city.trim();cnt[normMap[k]]=(cnt[normMap[k]]||0)+1;}});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([city,count],i)=>(
                        <div key={city} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f5f5f5')}}>
                          <span style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '} {city}</span>
                          <span style={{color:RED,fontWeight:700,fontSize:13}}>{count}</span>
                        </div>
                      ))})()}
                    </div>
                    {/* Top Kampfstile */}
                    <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'14px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>TOP KAMPFSTILE</div>
                      {(()=>{const cnt={};adminUsers.forEach(u=>{if(u.style)cnt[u.style]=(cnt[u.style]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([style,count],i)=>(
                        <div key={style} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f5f5f5')}}>
                          <span style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>{style}</span>
                          <span style={{color:RED,fontWeight:700,fontSize:13}}>{count}</span>
                        </div>
                      ))})()}
                    </div>
                  </>
                )}
                {!adminUsersLoaded&&<div style={{color:darkMode?'#555':'#bbb',fontSize:13,textAlign:'center',padding:'20px 0'}}>Klicke auf "Stats aktualisieren" um die Daten zu laden</div>}
              </div>
            )}

          </div>
        </div>
      )}
      {lightboxImg&&(
        <div onClick={()=>setLightboxImg(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
          <img src={lightboxImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=''/>
          <button onClick={()=>setLightboxImg(null)} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:24,width:44,height:44,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
      {matched&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:100,gap:12}}>
          <div className='rj' style={{color:RED,fontSize:12,letterSpacing:8}}>⚡ NEUES MATCH</div>
          <div className='rj' style={{fontSize:46,color:'#fff',letterSpacing:4,textAlign:'center',lineHeight:1,animation:'pulse 1.2s infinite'}}>IT'S A MATCH!</div>
          <div style={{fontSize:14,color:'rgba(255,255,255,0.6)',textAlign:'center'}}>Ihr habt beide geswipt — jetzt chatten!</div>
          {matched.avatar_url?<img src={matched.avatar_url} style={{width:140,height:140,borderRadius:'50%',objectFit:'cover',border:'3px solid '+RED}} alt=''/>:<div style={{fontSize:52}}>{matched.emoji||''}</div>}
          <div className='rj' style={{color:'#fff',fontSize:24,letterSpacing:2}}>{matched.name}</div>
          <div style={{color:matched.accent||RED,fontSize:12,fontWeight:700}}>{matched.style} · {matched.city}</div>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={()=>{setMatched(null);setTab('chat');}} style={{padding:'13px 28px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>💬 JETZT CHATTEN</button>
            <button onClick={()=>setMatched(null)} style={{padding:'13px 20px',borderRadius:12,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>{t.weiterSwipen}</button>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

function ImgPositionEditor({src,onSave,onCancel}){
  const [pos,setPos]=useState({x:50,y:50});
  const drag=useRef(false);
  const last=useRef({x:0,y:0});
  const ref=useRef(null);
  const move=(cx,cy)=>{
    if(!drag.current||!ref.current)return;
    const r=ref.current.getBoundingClientRect();
    const dx=(cx-last.current.x)/r.width*100;
    const dy=(cy-last.current.y)/r.height*100;
    setPos(p=>({x:Math.max(0,Math.min(100,p.x-dx)),y:Math.max(0,Math.min(100,p.y-dy))}));
    last.current={x:cx,y:cy};
  };
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.96)',zIndex:2000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{color:'#fff',fontFamily:'Rajdhani,sans-serif',fontSize:18,fontWeight:700,letterSpacing:2,marginBottom:8}}>BILDAUSSCHNITT WÄHLEN</div>
      <div style={{color:'#aaa',fontSize:12,marginBottom:16,textAlign:'center'}}>Bild verschieben für Ausschnitt</div>
      <div ref={ref} style={{width:260,height:260,borderRadius:'50%',overflow:'hidden',border:'3px solid #c0392b',cursor:'grab',position:'relative',flexShrink:0}}
        onMouseDown={e=>{drag.current=true;last.current={x:e.clientX,y:e.clientY};}}
        onMouseMove={e=>{if(drag.current)move(e.clientX,e.clientY);}}
        onMouseUp={()=>{drag.current=false;}}
        onTouchStart={e=>{drag.current=true;last.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
        onTouchMove={e=>{e.preventDefault();if(drag.current)move(e.touches[0].clientX,e.touches[0].clientY);}}
        onTouchEnd={()=>{drag.current=false;}}
      >
        <img src={src} style={{width:'150%',height:'150%',objectFit:'cover',objectPosition:pos.x+'% '+pos.y+'%',pointerEvents:'none',transform:'translate(-17%,-17%)'}} alt=''/>
      </div>
      <div style={{display:'flex',gap:12,marginTop:20,width:'100%',maxWidth:260}}>
        <button onClick={onCancel} style={{flex:1,padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>ABBRECHEN</button>
        <button onClick={()=>onSave(pos)} style={{flex:1,padding:'12px',borderRadius:10,background:'#c0392b',border:'none',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>SPEICHERN ✓</button>
      </div>
    </div>
  );
}

function Lbl({children}){return <div style={{color:'#555',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase'}}>{children}</div>;}
function Inp({placeholder,value,onChange,type='text',onKeyDown}){
  return(<input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown}
    style={{width:'100%',background:'#fff',border:'1px solid #e0e0e0',borderRadius:8,padding:'12px 13px',color:'#1a1a1a',fontSize:15,fontFamily:'DM Sans,sans-serif',transition:'border-color 0.2s'}}
    onFocus={e=>e.target.style.borderColor=RED} onBlur={e=>e.target.style.borderColor='#e0e0e0'}/>);
}
function Tag({text,accent}){return <div style={{padding:'2px 7px',borderRadius:3,background:accent?accent+'12':'#f5f5f5',color:accent||'#888',fontSize:10,fontWeight:600,border:accent?'1px solid '+accent+'22':'none'}}>{text}</div>;}
function Btn({onClick,color,icon,size,primary,label}){
  const [h,setH]=useState(false);
  return(<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{width:size,height:size,borderRadius:primary?11:'50%',background:primary?`linear-gradient(135deg,${color}cc,${color})`:color+'12',border:primary?'none':'2px solid '+color+'33',fontSize:primary?21:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:1,transform:h?'scale(1.1)':'scale(1)',transition:'all 0.2s',boxShadow:primary?`0 5px 16px ${color}44`:'none'}}>
    {icon}{primary&&<div style={{color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:9,letterSpacing:2}}>{label}</div>}
  </button>);
}
