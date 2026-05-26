import { useState, useEffect, useRef } from 'react';

const SUPA_URL = 'https://uykdrmymjvqgebsmndme.supabase.co';
const ADMIN_ID = '1a697731-458d-4559-a4cf-a89d3150bfa5';
const SUPA_SERVICE_KEY = process.env.REACT_APP_SUPA_SERVICE_KEY||'sb_secret_N0bkvRQt1mqBwGdbH3fwIw_nidJ7iX_';
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
const STYLES = ['Boxing','Kickboxing','MMA','Muay Thai','Grappling','BJJ','Wrestling'];
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
    {name:'Kick & Box Austria',members:145,styles:['Kickboxing','Muay Thai'],rating:4.6,address:'Ottakringer Str. 120, 1160 Wien',street:'Ottakringer Str. 120',zip:'1160',city:'Wien',emoji:'🥊',code:'KBA-7792',phone:'+43 1 4567890',hours:'Mo-Fr 09:00-21:00, Sa 10:00-15:00',desc:'Das älteste Kickboxing-Gym Wiens mit Tradition seit 1998. Heimat zahlreicher österreichischer Meister und internationaler Nachwuchstalente.',founded:1998,website:'kickbox-austria.at'},
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


function GymDetailScreen({gym,gymKey,gymRatings,rateGym,onClose,darkMode}){
  if(!gym)return(<div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:250,display:'flex',alignItems:'center',justifyContent:'center'}}><button onClick={onClose} style={{padding:'12px 24px',background:'#c0392b',color:'#fff',border:'none',borderRadius:10,fontSize:16,cursor:'pointer'}}>← Zurück</button></div>);
  const isDark=darkMode===true;
  const bg=isDark?'#0d0d0d':'#f5f5f7';
  const card=isDark?'#1a1a1a':'#fff';
  const text=isDark?'#fff':'#1a1a1a';
  const sub=isDark?'#aaa':'#666';
  const border=isDark?'#2a2a2a':'#eee';
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
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:8,padding:'4px 10px'}}>
            <div style={{color:'#d4a017',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:16}}>★</span>
              <span style={{fontSize:16}}>{avgRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:'16px 20px 0',textAlign:'center'}}>
          <div style={{width:72,height:72,borderRadius:14,background:'rgba(255,255,255,0.15)',border:'2px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8,overflow:'hidden'}}>
            {gym.logo_url?<img src={gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,textAlign:'center',lineHeight:1.3}}>{gym.name.split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
          </div>
          <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,color:'#fff',letterSpacing:1,lineHeight:1.2}}>{gym.name}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:6}}>📍 {gym.city} · gegründet {gym.founded}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginTop:10}}>
            {gym.styles.map(s=>(
              <div key={s} style={{padding:'4px 10px',borderRadius:20,background:(styleColors[s]||'#555')+'33',border:'1px solid '+(styleColors[s]||'#555')+'66',color:styleColors[s]||'#fff',fontSize:11,fontWeight:700}}>{s}</div>
            ))}
          </div>
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
          <div style={{color:sub,fontSize:13,lineHeight:1.7}}>{gym.desc}</div>
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
                <div style={{color:text,fontSize:13,fontWeight:600}}>{gym.phone}</div>
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
          {gym.hours.split(', ').map((h,i)=>{
            const [days,time]=h.split(' ').reduce((acc,w,idx)=>{
              if(idx===0||w.includes('-')&&!w.includes(':'))acc[0]+=(acc[0]?' ':'')+w;
              else acc[1]+=(acc[1]?' ':'')+w;
              return acc;
            },['','']);
            return(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<gym.hours.split(', ').length-1?'1px solid '+border:'none'}}>
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

function AuthScreen({ onSession }) {
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
                {m==='login'?'Einloggen':'Registrieren'}
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
            {loading?'...':mode==='login'?'LOGIN':'REGISTRIEREN'}
          </button>
          {mode==='login'&&<div onClick={()=>{setShowForgot(true);setErr('');setInfo('');}} style={{textAlign:'center',marginTop:12,color:'#aaa',fontSize:12,cursor:'pointer',textDecoration:'underline'}}>Passwort vergessen?</div>}
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

function ChatOverlay({match,myProfileId,token,onClose,onViewProfile}){
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
  const other=match.profile_a_id===myProfileId?match.profile_b:match.profile_a;
  const accent=other?.style==='Boxing'?'#c0392b':other?.style==='MMA'?'#2980b9':other?.style==='Muay Thai'?'#d35400':'#27ae60';

  async function markAsRead(){
    try{
      await fetch(SUPA_URL+'/rest/v1/messages?match_id=eq.'+match.id+'&sender_id=neq.'+myProfileId+'&read_at=is.null',{
        method:'PATCH',
        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+token,Prefer:'return=minimal'},
        body:JSON.stringify({read_at:new Date().toISOString()})
      });
    }catch{}
  }
  async function loadMsgs(){
    try{const msgs=await dbSelect('messages','match_id=eq.'+match.id+'&order=created_at.asc',token);if(Array.isArray(msgs)){setMessages(msgs);markAsRead();}}catch{}
    setLoading(false);
  }
  useEffect(()=>{
    loadMsgs();
    pollRef.current=setInterval(async()=>{
      const prevCount=msgs.length;
      await loadMsgs();
      // Push bei neuer Nachricht
      if(msgs.length>prevCount){
        const newest=msgs[msgs.length-1];
        if(newest&&newest.sender_id!==myProfileId){
          sendLocalNotification('💬 Neue Nachricht',other?.name+': '+newest.content?.slice(0,60));
        }
      }
      // Typing status prüfen
      try{
        const r=await fetch(SUPA_URL+'/rest/v1/typing_status?match_id=eq.'+match.id+'&user_id=neq.'+myProfileId,{
          headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
        });
        const data=await r.json();
        if(Array.isArray(data)&&data[0]){
          const t=data[0];
          const age=Date.now()-new Date(t.updated_at).getTime();
          setOtherTyping(age<4000&&t.is_typing===true);
        }else{setOtherTyping(false);}
      }catch{}
    },1500);
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
    const tmp={id:'tmp_'+Date.now(),match_id:match.id,sender_id:myProfileId,content:text,created_at:new Date().toISOString()};
    setMessages(m=>[...m,tmp]);
    try{await dbInsert('messages',{match_id:match.id,sender_id:myProfileId,content:text},token);}catch{}
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
              ?<img src={other.avatar_url} style={{width:'100%',height:'100%',objectFit:'contain',objectPosition:'center top',background:'#111',opacity:0.85}} alt=''/>
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
                ['GEWICHTSKLASSE',other?.weight_class||'-','#2980b9'],
                ['GYM',other?.gym||'-','#8e44ad'],
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
            <div className='rj' style={{color:'#fff',fontSize:20,letterSpacing:2,flex:1}}>FIGHT REQUEST</div>
            <div style={{fontSize:22}}>⚔️</div>
          </div>
          <div style={{padding:'16px',maxWidth:480,margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee',textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:6}}>{other?.emoji||'🥊'}</div>
              <div className='rj' style={{color:'#1a1a1a',fontSize:18,letterSpacing:1}}>{other?.name}</div>
              <div style={{color:'#888',fontSize:12,marginTop:2}}>{other?.style} · {other?.weight_class||other?.weightClass||''}</div>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:10}}>FIGHT TYP</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['Sparring','Amateur Wettkampf','Profi Wettkampf','Freundschaftskampf'].map(t=>(
                  <button key={t} onClick={()=>setFightType(t)} style={{padding:'7px 12px',borderRadius:20,background:fightType===t?'#c0392b':'#f5f5f5',border:'1px solid '+(fightType===t?'#c0392b':'#ddd'),color:fightType===t?'#fff':'#666',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>DATUM</div>
              <input type='date' value={fightDate} onChange={e=>setFightDate(e.target.value)}
                style={{width:'100%',background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:8,padding:'10px 12px',fontSize:14,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif'}}/>
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #eee'}}>
              <div style={{color:'#aaa',fontSize:10,letterSpacing:1,marginBottom:8}}>ORT / GYM</div>
              <input type='text' value={fightLocation} onChange={e=>setFightLocation(e.target.value)} placeholder='z.B. Tiger Gym Berlin, Mitte'
                style={{width:'100%',background:'#f5f5f7',border:'1px solid #e0e0e0',borderRadius:8,padding:'10px 12px',fontSize:14,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif'}}/>
            </div>
            {fightSent?(
              <div style={{background:'#f0faf0',border:'1px solid #27ae6044',borderRadius:12,padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:6}}>✅</div>
                <div style={{color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18}}>FIGHT REQUEST GESENDET!</div>
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
                    {isMe&&<div style={{color:'#aaa',fontSize:11,textAlign:'center',marginTop:6}}>Warte auf Antwort…</div>}
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
          placeholder='Nachricht…' rows={1}
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
  const [profile,setProfile]=useState({name:'',age:'',city:'',gym:'',height:'',weight:'',weightClass:'',style:'',bio:''});
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
  const [imgPosition,setImgPosition]=useState({x:50,y:50}); // % position
  const [showImgEditor,setShowImgEditor]=useState(false);
  const [imgEditorSrc,setImgEditorSrc]=useState(null);
  const [imgEditorCallback,setImgEditorCallback]=useState(null);
  const [recentSwiped,setRecentSwiped]=useState([]);
  const [whoLikedMe,setWhoLikedMe]=useState([]);
  const [adminMessages,setAdminMessages]=useState([]);
  const [showAdminMsg,setShowAdminMsg]=useState(false);
  const [allProfiles,setAllProfiles]=useState([]);
  const [rankingLoading,setRankingLoading]=useState(false);
  const [scanResult,setScanResult]=useState(null);
  const [whoLikedTab,setWhoLikedTab]=useState(false);
  const [newLikesCount,setNewLikesCount]=useState(0);
  const [lastLikesCheck,setLastLikesCheck]=useState(()=>{try{return localStorage.getItem('fighter_likes_check')||'2000-01-01'}catch{return '2000-01-01'}});
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
  const [adminBroadcast,setAdminBroadcast]=useState('');
  const [adminCityName,setAdminCityName]=useState('');
  const [adminCityLat,setAdminCityLat]=useState('');
  const [adminCityLon,setAdminCityLon]=useState('');
  const [adminCityBL,setAdminCityBL]=useState('');
  const [adminSaving,setAdminSaving]=useState(false);
  const [adminUsersLoaded,setAdminUsersLoaded]=useState(false);
  const isAdmin=session?.userId===ADMIN_ID;
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
  const [gymRatingInput,setGymRatingInput]=useState({});
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
  },[tab]);

  // Rangliste neu laden wenn Tab geöffnet wird
  useEffect(()=>{
    if(tab==='ranking'&&session){
      setRankingLoading(true);
      // Erst mit Session Token versuchen
      fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=500',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}
      }).then(r=>r.json()).then(data=>{
        if(Array.isArray(data)&&data.length>0){
          setAllProfiles(data);
          setRankingLoading(false);
        } else {
          // Fallback mit Service Key
          return fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=500',{
            headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}
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
  const [showAGB,setShowAGB]=useState(false);
  const [rankMode,setRankMode]=useState('user');
  const [filterStyle,setFilterStyle]=useState('Alle');
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
    showMsg('Bewertung gespeichert! '+('⭐'.repeat(stars)));
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
    }
  }

  function showMsg(text){setMsg(text);setTimeout(()=>setMsg(''),3000);}

  async function initProfile(s){
    try{
      const data=await dbSelect('profiles','user_id=eq.'+s.userId,s.token);
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
        setProfile({name:p.name||'',age:p.age||'',city:p.city||'',gym:p.gym||'',height:p.height||'',weight:p.weight||'',weightClass:p.weight_class||'',style:p.style||'',bio:p.bio||''});
        setStats({wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0});
        if(p.avatar_url){setAvatarUrl(p.avatar_url);setAvatarPreview(p.avatar_url);}
        setAuthReady(true);
        setScreen('main');
        // Push Permission anfragen (nach kurzer Verzögerung)
        setTimeout(()=>requestPushPermission(),2000);
        // last_seen updaten
        try{fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+s.userId,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+s.token,Prefer:'return=minimal'},body:JSON.stringify({last_seen:new Date().toISOString()})});}catch{}
        loadRealFighters(s,p);
        loadMatches(s,p);
        loadGymRatings(s);
        loadFightHistory(s);
        loadDbGyms(s);
        loadWhoLikedMe(s,p);
        loadAllProfiles(s);
        loadAdminMessages(s);
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
      if(perm==='granted')showMsg('🔔 Benachrichtigungen aktiviert!');
    }
  }

  function sendLocalNotification(title,body){
    if(Notification.permission==='granted'){
      new Notification(title,{body,icon:'/icons/icon-192.png',badge:'/icons/icon-72.png'});
    }
  }

  // Neue Fighter automatisch nachladen
  useEffect(()=>{
    if(!session||!myProfile)return;
    const interval=setInterval(async()=>{
      await loadRealFighters(session,myProfile);
      await loadAllProfiles(session);
    },60000); // alle 60 Sekunden — weniger Sprünge // alle 60 Sekunden
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
      const resp=await fetch(SUPA_URL+'/rest/v1/profiles?banned=neq.true&order=created_at.desc&limit=500',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
      });
      const data=await resp.json();
      if(Array.isArray(data)&&data.length>0){
        setAllProfiles(data);
      }
    }catch(e){console.log('loadAllProfiles Fehler:',e);}
  }

  async function loadWhoLikedMe(s,myP){
    try{
      // Alle die mich geliket haben
      const likes=await dbSelect('swipes','target_id=eq.'+myP.id+'&direction=eq.like',s.token);
      if(!Array.isArray(likes)||likes.length===0){setWhoLikedMe([]);return;}
      // Profile dazu laden
      const ids=likes.map(l=>l.swiper_id);
      const profiles=await dbSelect('profiles','id=in.('+ids.join(',')+')'+'&banned=neq.true',s.token);
      if(!Array.isArray(profiles))return;
      // Bereits gematchte rausfiltern (die sind schon im Chat)
      const matchedIds=dbMatches.map(m=>m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id);
      const notYetMatched=profiles.filter(p=>!matchedIds.includes(p.id));
      setWhoLikedMe(notYetMatched);
      // Neue Likes seit letztem Check
      const newLikes=likes.filter(l=>l.created_at&&l.created_at>lastLikesCheck);
      if(newLikes.length>0){
        setNewLikesCount(newLikes.length);
        sendLocalNotification('🥊 '+newLikes.length+' neue Fighter interessieren sich für dich!','Schau nach wer dich geliket hat');
      }
    }catch{}
  }

  async function loadRealFighters(s,myP){
    try{
      // Versuche erst mit Session Token, dann mit anon key als Fallback
      let all = await dbSelect('profiles','user_id=neq.'+s.userId+'&banned=neq.true',s.token);
      if(!Array.isArray(all)||all.length===0){
        // Fallback: anon key
        try{
          const r=await fetch(SUPA_URL+'/rest/v1/profiles?user_id=neq.'+s.userId+'&banned=neq.true',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
          all=await r.json();
        }catch{}
      }
      if(!Array.isArray(all))return;
      const swiped=await dbSelect('swipes','swiper_id=eq.'+myP.id,s.token);
      // Also filter out matches — no need to show already matched people
      const matchedIds=dbMatches.map(m=>m.profile_a_id===myP.id?m.profile_b_id:m.profile_a_id);
      const swipedIds=Array.isArray(swiped)?swiped.map(x=>x.target_id):[];
      const fresh=all.filter(f=>!swipedIds.includes(f.id)&&!f.banned&&!matchedIds.includes(f.id));
      // Nur neue Fighter hinzufügen — bestehende Karten nicht überschreiben
      setCards(prev=>{
        // Wenn leer — alles setzen
        if(prev.length===0)return [...fresh];
        // Bestehende IDs merken
        const existingIds=new Set(prev.map(c=>c.id));
        // Nur wirklich neue Fighter hinzufügen — NIE bestehende entfernen oder sortieren
        const newOnes=fresh.filter(f=>!existingIds.has(f.id));
        if(newOnes.length>0)return [...prev,...newOnes];
        return prev; // Keine Änderung wenn nichts Neues
      });
    }catch{}
  }

  function getLastSeen(dateStr){
    if(!dateStr)return null;
    const diff=Date.now()-new Date(dateStr).getTime();
    const min=Math.floor(diff/60000);
    const h=Math.floor(min/60);
    const d=Math.floor(h/24);
    if(min<2)return'🟢 Gerade online';
    if(min<60)return'🟡 Vor '+min+' Min';
    if(h<24)return'⚪ Vor '+h+' Std';
    if(d<7)return'⚪ Vor '+d+' Tag'+(d>1?'en':'');
    return'⚪ Vor einer Weile';
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
      const profileData=await dbSelect('profiles','id=eq.'+s.userId,s.token);
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
      const token=(s?.token)||session?.token||SUPA_KEY;
      const key=token===SUPA_KEY?SUPA_KEY:SUPA_KEY;
      const resp=await fetch(SUPA_URL+'/rest/v1/gyms?order=city.asc,name.asc',{
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+token}
      });
      const data=await resp.json();
      if(Array.isArray(data)&&data.length>0){
        setDbGyms(data);
        // Setze erste verfügbare Stadt
        const firstCity=data[0]?.city;
        if(firstCity)setCity(c=>c==='Berlin'?firstCity:c);
      }
    }catch(e){console.log('loadDbGyms error',e);}
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
      const matchProfiles=await dbSelect('profiles','',s.token);
      const profileMap={};
      if(Array.isArray(matchProfiles))matchProfiles.forEach(p=>{profileMap[p.id]=p;});
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
      const sorted=withMessages.sort((a,b)=>new Date(b.last_message_at)-new Date(a.last_message_at));
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
      showMsg('Profil gespeichert ✓');
    }catch(e){showMsg('Fehler beim Speichern');}
    setSavingEdit(false);
  }

  async function saveProfile(){
    if(!session)return;
    setSaving(true);
    const d={user_id:session.userId,name:profile.name,age:parseInt(profile.age)||null,city:profile.city,gym:profile.gym,height:parseInt(profile.height)||null,weight:parseInt(profile.weight)||null,weight_class:profile.weightClass,style:profile.style,bio:profile.bio,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,avatar_url:avatarUrl};
    try{
      if(myProfile){
        const res=await dbUpdate('profiles',d,'user_id=eq.'+session.userId,session.token);
        if(Array.isArray(res)&&res[0])setMyProfile(res[0]);
        showMsg('Gespeichert! ✓');
      }else{
        const res=await dbInsert('profiles',d,session.token);
        if(Array.isArray(res)&&res[0]){setMyProfile(res[0]);showMsg('Profil erstellt! 🥊');setScreen('main');loadRealFighters(session,res[0]);loadMatches(session,res[0]);loadGymRatings(session);loadFightHistory(session);loadDbGyms(session);loadWhoLikedMe(session,res[0]);loadAllProfiles(session);}
        else showMsg('Fehler: '+(JSON.stringify(res)||'unbekannt'));
      }
    }catch{showMsg('Netzwerkfehler');}
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
    // Erst Editor zeigen
    const reader=new FileReader();
    reader.onload=ev=>{
      setImgEditorSrc(ev.target.result);
      setImgEditorCallback(()=>async(pos)=>{
        setShowImgEditor(false);
        setImgPosition(pos);
        setUploading(true);
        setAvatarPreview(ev.target.result);
        showMsg('Foto wird komprimiert...');
        const compressed=await compressImage(file,800,0.82);
        const sizeMB=(compressed.size/1024/1024).toFixed(1);
        const path='fighter_'+session.userId+'_'+Date.now()+'.jpg';
        const url=await uploadPhoto(compressed,path,session.token);
        if(url){
          setAvatarUrl(url);
          setProfile(p=>({...p,avatar_url:url,img_pos_x:pos.x,img_pos_y:pos.y}));
          showMsg('Foto hochgeladen! ('+sizeMB+'MB)');
        } else showMsg('Upload fehlgeschlagen');
        setUploading(false);
      });
      setShowImgEditor(true);
    };
    reader.readAsDataURL(file);
    // dummy to match closing braces
  }

  const myWeightClass=myProfile?.weight_class||profile?.weightClass||'';
  const myCity=myProfile?.city||profile?.city||'';
  const myBundesland=getBundesland(myCity);

  // Smart Matching — erst gleiche Stadt + Klasse, dann Bundesland, dann alle
  const filteredCards=cards
    .filter(f=>!blockedUsers.includes(f.id))
    .filter(f=>!f.banned)
    .filter(f=>filterStyle==='Alle'||f.style===filterStyle)
    // Kein harter Stadt-Filter — alle User werden angezeigt, nähere zuerst sortiert
    .map(f=>({
      ...f,
      _dist:getDistanceKm(myCity,f.city||''),
      _sameCity:(f.city||'').toLowerCase()===(myCity||'').toLowerCase(),
      _sameBL:getBundesland(f.city||'')===myBundesland&&!!myBundesland,
      _sameWC:(f.weight_class||f.weightClass||'')===(myWeightClass||''),
    }))
    .sort((a,b)=>{
      // Priorität: 1=gleiche Stadt+Klasse, 2=gleiches BL+Klasse, 3=gleiche Klasse, 4=gleiche Stadt, 5=gleiches BL, 6=alle
      const pa=a._sameCity&&a._sameWC?1:a._sameBL&&a._sameWC?2:a._sameWC?3:a._sameCity?4:a._sameBL?5:6;
      const pb=b._sameCity&&b._sameWC?1:b._sameBL&&b._sameWC?2:b._sameWC?3:b._sameCity?4:b._sameBL?5:6;
      if(pa!==pb)return pa-pb;
      return (a._dist||999)-(b._dist||999);
    });
  const top=filteredCards[filteredCards.length-1];
  const lastTapRef=useRef(0);
  function dragStart(e){
    if(e.touches)e.preventDefault();
    const p=e.touches?e.touches[0]:e;
    setStart({x:p.clientX,y:p.clientY});
    setDrag(true);
  }
  function dragMove(e){
    if(!drag)return;
    if(e.touches)e.preventDefault();
    const p=e.touches?e.touches[0]:e;
    const dx=p.clientX-start.x;
    const dy=p.clientY-start.y;
    if(Math.abs(dx)>Math.abs(dy))setOffset({x:dx,y:dy*0.3});
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
      if(session&&myProfile&&!String(top.id).startsWith('demo_')){try{await dbInsert('swipes',{swiper_id:myProfile.id,target_id:top.id,direction:'pass'},session.token);}catch{}}
    }
    setTimeout(()=>{setCards(prev=>prev.slice(0,-1));setLastAct(null);},260);
  }

  const rot=(offset.x/14).toFixed(1);
  const fop=Math.min(offset.x/SW,1);
  const pop=Math.min(-offset.x/SW,1);
  const cStyle=drag?{transform:`translateX(${offset.x}px) translateY(${offset.y*0.25}px) rotate(${rot}deg)`,transition:'none',cursor:'grabbing'}
    :lastAct==='ch'?{transform:'translateX(140%) rotate(18deg)',transition:'transform 0.26s ease'}
    :lastAct==='de'?{transform:'translateX(-140%) rotate(-18deg)',transition:'transform 0.26s ease'}
    :{transform:'translateX(0) rotate(0deg)',transition:'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)'};

  function canGo(){
    if(step===1)return profile.name&&profile.age&&profile.city&&(avatarPreview||avatarUrl);
    if(step===2)return profile.gym&&profile.style;
    if(step===3)return profile.height&&profile.weight&&profile.weightClass;
    return true;
  }
  const tf=stats.wins+stats.losses+stats.draws;
  const wr=tf>0?Math.round((stats.wins/tf)*100):0;
  const kr=stats.wins>0?Math.round((stats.ko/stats.wins)*100):0;
  const allF=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weight_class:profile.weightClass,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'🥊',accent:RED,isMe:true,avatar_url:avatarUrl}].concat(FIGHTERS):FIGHTERS;
  const proRanked=[...PRO_FIGHTERS].filter(f=>rankF==='All'||f.style===rankF).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  // Rangliste: ALLE angemeldeten User aus Datenbank — kein Fallback mehr
  const userOnly=(()=>{
    const me=profile.name?[{id:0,name:profile.name,city:profile.city,gym:profile.gym,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'🥊',accent:RED,isMe:true,avatar_url:avatarUrl}]:[];
    if(allProfiles.length>0){
      const others=allProfiles.filter(p=>p.id!==myProfile?.id&&!p.banned).map(p=>({
        ...p,
        wins:p.wins||0,losses:p.losses||0,draws:p.draws||0,ko:p.ko||0,
        accent:p.accent||RED,isMe:false
      }));
      return [...me,...others];
    }
    // Noch am Laden — nur ich anzeigen
    return me;
  })();
  const ranked=rankMode==='pro'?proRanked:[...userOnly].filter(f=>rankF==='All'||!f.style||(f.style&&(f.style===rankF||f.style.includes(rankF)))).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));
  const trStyles=['All','Boxing','MMA','Muay Thai','BJJ'];
  const filteredT=TRAINERS.filter(t=>trainerF==='All'||t.style.includes(trainerF)).sort((a,b)=>b.rating-a.rating);





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

  if(viewGym)return(<><style>{css}</style><GymDetailScreen gym={viewGym.gym} gymKey={viewGym.key} gymRatings={gymRatings} rateGym={(k,s)=>{rateGym(k,s);}} onClose={()=>setViewGym(null)} darkMode={darkMode===true}/></>);

  if(whoLikedTab)return(
    <div style={{minHeight:'100vh',background:darkMode?'#0d0d0d':'#f5f5f7',display:'flex',flexDirection:'column'}}> 
      <style>{css}</style>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
        <button onClick={()=>setWhoLikedTab(false)} style={{background:'none',border:'none',color:darkMode?'#fff':'#1a1a1a',fontSize:20,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
        <div>
          <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:18,letterSpacing:2}}>INTERESSE AN DIR</div>
          <div style={{color:'#aaa',fontSize:11}}>{whoLikedMe.length} Fighter haben dich geliket</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
        {whoLikedMe.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:darkMode?'#555':'#bbb'}}>
            <div style={{fontSize:48,marginBottom:12}}>🥊</div>
            <div style={{fontSize:14}}>Noch niemand hat dich geliket</div>
            <div style={{fontSize:12,marginTop:6}}>Swipe weiter — dein Match kommt!</div>
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
          ?<img src={viewProfile.avatar_url} onClick={()=>setLightboxImg(viewProfile.avatar_url)} style={{width:'100%',height:'100%',objectFit:'contain',objectPosition:'center top',background:'#111',cursor:'zoom-in'}} alt=''/>
          :<div style={{width:'100%',height:'100%',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:80}}>🥊</div>}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.75) 100%)'}}/>
        <button onClick={()=>{setViewProfile(null);}} style={{position:'absolute',top:14,left:14,background:'rgba(0,0,0,0.45)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700,borderRadius:8,padding:'4px 12px'}}>← Zurück</button>
        <div style={{position:'absolute',bottom:16,left:16,right:16}}>
          <div className='rj' style={{color:'#fff',fontSize:28,letterSpacing:2,lineHeight:1}}>{viewProfile.name}</div>
          {viewProfile.last_seen&&<div style={{color:'rgba(255,255,255,0.65)',fontSize:11,marginTop:3}}>{getLastSeen(viewProfile.last_seen)}</div>}
          <div style={{color:'#ff6b6b',fontSize:12,fontWeight:700,marginTop:4}}>{viewProfile.style} · {viewProfile.city}</div>
          {viewProfile.bio&&<div style={{color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:4,fontStyle:'italic'}}>'{viewProfile.bio}'</div>}
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
          {[['GEWICHTSKLASSE',viewProfile.weight_class||'-','#2980b9'],['GYM',viewProfile.gym||'-','#8e44ad'],['GRÖSSE',viewProfile.height?(viewProfile.height+'cm'):'-','#27ae60'],['GEWICHT',viewProfile.weight?(viewProfile.weight+'kg'):'-','#e67e22']].map(([label,val,color])=>(
            <div key={label} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:10,padding:'10px 12px',border:'1px solid '+color+'22'}}>
              <div style={{color:'#bbb',fontSize:9,letterSpacing:1}}>{label}</div>
              <div style={{color:color,fontWeight:700,fontSize:12,marginTop:3}}>{val}</div>
            </div>
          ))}
        </div>
        {/* BLOCK / MELDEN */}
        {/* TRAININGS-HISTORIE auf fremdem Profil */}
        {viewProfile.history_public&&viewProfileHistory.length>0&&(
          <div style={{padding:'0 12px',marginTop:12}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:12,letterSpacing:2}}>🤝 TRAININGS-HISTORIE</div>
              <div style={{background:'#27ae6018',border:'1px solid #27ae6044',borderRadius:10,padding:'1px 7px',color:'#27ae60',fontSize:9,fontWeight:700}}>ÖFFENTLICH</div>
            </div>
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
          </div>
        )}
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
            showMsg('Profil wurde gemeldet ✓');
          }} style={{flex:1,padding:'11px',borderRadius:10,background:darkMode?'#1a1a2a':'#f5f5ff',border:'1px solid #2980b944',color:'#2980b9',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            {reportSent[viewProfile.id]?'✓ Gemeldet':'⚠️ Melden'}
          </button>
        </div>
      </div>
      {showImgEditor&&imgEditorSrc&&(
        <ImgPositionEditor
          src={imgEditorSrc}
          onSave={imgEditorCallback}
          onCancel={()=>setShowImgEditor(false)}
          darkMode={darkMode}
        />
      )}
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
    {icon:'🥊',title:'FINDE DEINEN GEGNER',sub:'Entdecke Kampfsportler in deiner Nähe — egal ob Sparring, Techniktraining oder offizieller Kampf.',bg:'linear-gradient(160deg,#1a0505 0%,#0d0d0d 100%)',accent:'#c0392b'},
    {icon:'💬',title:'MATCH & CHAT',sub:'Wenn beide geliket haben habt ihr ein Match. Schreibt euch, vereinbart Trainings und baut euren Rekord auf.',bg:'linear-gradient(160deg,#05101a 0%,#0d0d0d 100%)',accent:'#2980b9'},
    {icon:'🏆',title:'BAUE DEINEN REKORD AUF',sub:'Trainings-Historie, verifizierter Kampfrekord, Gym-Mitgliedschaft. Zeig der Community wer du bist.',bg:'linear-gradient(160deg,#0a0a05 0%,#0d0d0d 100%)',accent:'#d4a017'},
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
          {onboardSlide<onboardSlides.length-1?'WEITER →':'JETZT STARTEN 🥊'}
        </button>
        {onboardSlide===0&&<button onClick={()=>{try{localStorage.setItem('fighter_onboarding_done','1');}catch{}setShowOnboarding(false);}} style={{width:'100%',marginTop:10,padding:'10px',background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:12,cursor:'pointer'}}>Überspringen</button>}
      </div>
    </div>
  );

  if(!session)return <AuthScreen onSession={handleSession}/>;
  if(activeChat&&myProfile&&!viewProfile)return(<><style>{css}</style><ChatOverlay match={activeChat} myProfileId={myProfile.id} token={session.token} onClose={()=>setActiveChat(null)} onViewProfile={(p)=>{setViewProfile(p);}}/></>);

  if(screen==='setup')return(
    <div style={{minHeight:'100vh',background:'#f5f5f7',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 0 40px'}}>
      <style>{css}</style>
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
                      :avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:(profile.img_pos_x||50)+'% '+(profile.img_pos_y||50)+'%'}} alt='avatar'/>
                      :<div style={{textAlign:'center'}}><div style={{fontSize:36}}>📸</div><div style={{color:RED,fontSize:10,marginTop:4,fontWeight:700}}>FOTO</div></div>}
                  </div>
                  {!avatarPreview&&<div style={{position:'absolute',top:-4,right:-4,background:RED,borderRadius:10,padding:'2px 6px',fontSize:9,color:'#fff',fontWeight:700,fontFamily:'Rajdhani,sans-serif',letterSpacing:1}}>PFLICHT</div>}
                  {avatarPreview&&<div style={{position:'absolute',bottom:4,right:4,background:'#27ae60',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'2px solid #fff'}}>✓</div>}
                </div>
                <div style={{color:avatarPreview?'#27ae60':RED,fontSize:12,marginTop:8,fontWeight:700}}>{avatarPreview?'Foto hochgeladen ✓':'Profilbild hochladen (Pflicht)'}</div>
                {!avatarPreview&&<div style={{color:'#bbb',fontSize:10,marginTop:2}}>Ohne Foto kannst du nicht weitermachen</div>}
              </label>
            </div>
            <Lbl>Dein Name</Lbl><Inp placeholder='z.B. Max Mueller' value={profile.name} onChange={v=>setProfile(p=>({...p,name:v}))}/>
            <Lbl>Alter</Lbl><Inp placeholder='z.B. 25' type='number' value={profile.age} onChange={v=>setProfile(p=>({...p,age:v}))}/>
            <Lbl>Standort</Lbl><Inp placeholder='z.B. Berlin' value={profile.city} onChange={v=>setProfile(p=>({...p,city:v}))}/>
          </div>
        )}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <Lbl>Dein Gym</Lbl>
            <div style={{position:'relative'}}>
              <Inp placeholder='Gym suchen…' value={profile.gym} onChange={v=>{
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
                    <div style={{color:'#8e44ad',fontWeight:700,fontSize:13}}>Mein Gym ist nicht dabei → anmelden</div>
                  </div>
                </div>
              )}
              {showGymSuggestions&&gymSuggestions.length===0&&profile.gym.length>=2&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eee',zIndex:100,marginTop:4}}>
                  <div style={{padding:'12px 14px',color:'#aaa',fontSize:13,textAlign:'center'}}>Kein Gym gefunden</div>
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
                    <div style={{color:'rgba(255,255,255,0.65)',fontSize:11,marginTop:2}}>Dein Gym wird geprüft und hinzugefügt</div>
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
                          <button onClick={()=>{setShowRegisterGym(false);setGymRegSent(false);}} style={{flex:1,padding:'11px',borderRadius:10,background:'transparent',border:'1px solid #eee',color:'#aaa',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer'}}>Abbrechen</button>
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
                                headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                                body:JSON.stringify({
                                  name:newGymData.name,
                                  city:newGymData.city,
                                  address:newGymData.address||'',
                                  style:newGymData.style||'',
                                  styles:newGymData.style?[newGymData.style]:[],
                                  code:newGymData.name.replace(/\s+/g,'-').toUpperCase()+'-'+Math.floor(Math.random()*9000+1000),
                                  emoji:'🥊'
                                })
                              });
                              await loadDbGyms();
                              showMsg('✅ Gym gespeichert!');
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
            <Lbl>Kampfstil</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {STYLES.map(s=>(<button key={s} onClick={()=>setProfile(p=>({...p,style:s}))} style={{padding:'7px 13px',borderRadius:4,border:'1px solid '+(profile.style===s?RED:'#ddd'),background:profile.style===s?'#fdf0ef':'#fff',color:profile.style===s?RED:'#666',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>{s}</button>))}
            </div>
          </div>
        )}
        {step===3&&(
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            <div style={{display:'flex',gap:11}}>
              <div style={{flex:1}}><Lbl>Groesse (cm)</Lbl><Inp placeholder='180' type='number' value={profile.height} onChange={v=>setProfile(p=>({...p,height:v}))}/></div>
              <div style={{flex:1}}><Lbl>Kampfgewicht (kg)</Lbl><Inp placeholder='77' type='number' value={profile.weight} onChange={v=>setProfile(p=>({...p,weight:v}))}/></div>
            </div>
            <Lbl>Gewichtsklasse</Lbl>
            <select value={profile.weightClass} onChange={e=>setProfile(p=>({...p,weightClass:e.target.value}))} style={{background:'#fff',border:'1px solid #ddd',borderRadius:8,padding:'12px 13px',color:profile.weightClass?'#1a1a1a':'#aaa',fontSize:14,width:'100%'}}>
              <option value=''>Gewichtsklasse waehlen</option>
              {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
            <Lbl>Kampfrekord (optional)</Lbl>
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
              {saving?'Speichern…':step===3?'Lets Fight':'Weiter'}
            </button>
            {step===1&&!(avatarPreview||avatarUrl)&&<div style={{color:RED,fontSize:10,textAlign:'center',fontWeight:600}}>⬆ Profilbild hochladen um fortzufahren</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs=[['swipe','🥊','FIGHT'],['chat','unread','CHAT'],['ranking','🏆','RANG'],['gyms','🏋️','GYMS'],['stats','👤','PROFIL']];

  return(
    <div style={{minHeight:'100vh',background:darkMode?'#1a1a1a':'#f5f5f7',fontFamily:'DM Sans,sans-serif',display:'flex',flexDirection:'column'}} onMouseMove={dragMove} onMouseUp={dragEnd} onTouchMove={dragMove} onTouchEnd={dragEnd}>
      <style>{css}</style>
      {msg&&<div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:'#fff',border:'1px solid '+RED,borderRadius:20,padding:'8px 20px',color:'#1a1a1a',fontSize:13,zIndex:200,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.1)',whiteSpace:'nowrap'}}>{msg}</div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px 8px',flexShrink:0,borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),background:darkMode?'#1a1a1a':'#fff'}}>
        <div style={{color:'#999',fontSize:11,fontWeight:600}}>Abgelehnt: {swStats.de}</div>
        <div className='rj' style={{fontSize:28,color:darkMode?'#ff4500':'#1a1a1a',letterSpacing:5}}>FIGHTER</div>
        <button onClick={()=>setDarkMode(d=>!d)} style={{background:darkMode?'#222':'#f0f0f0',border:'none',cursor:'pointer',fontSize:16,padding:'4px 8px',borderRadius:8,marginRight:6}}>{darkMode?'☀️':'🌙'}</button>{isAdmin&&<button onClick={()=>setShowAdmin(true)} style={{background:RED,border:'none',borderRadius:8,padding:'6px 12px',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',marginRight:6,boxShadow:'0 2px 8px rgba(192,57,43,0.5)'}}>⚙️</button>}<button onClick={handleLogout} style={{color:darkMode?'#555':'#aaa',fontSize:11,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Logout</button>
      </div>

      <div style={{flex:1,overflowY:'auto',paddingBottom:65}}>

        {tab==='swipe'&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8}}>
            {/* WER HAT MICH GELIKET Banner */}
            {whoLikedMe.length>0&&(
              <div onClick={()=>{setWhoLikedTab(true);setNewLikesCount(0);try{const now=new Date().toISOString();localStorage.setItem('fighter_likes_check',now);setLastLikesCheck(now);}catch{}}} style={{width:'calc(100% - 24px)',maxWidth:420,marginBottom:6,background:'transparent',border:'1px solid '+RED+'33',borderRadius:8,padding:'6px 12px',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <div style={{fontSize:14}}>❤️</div>
                <div style={{flex:1,color:darkMode?'#aaa':'#888',fontSize:11}}>{whoLikedMe.length} Fighter interessieren sich für dich</div>
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
            {/* FILTER LEISTE */}
            <div style={{width:'calc(100% - 24px)',maxWidth:380,margin:'0 0 8px',display:'flex',flexDirection:'column',gap:6}}>

            </div>
            <div style={{position:'relative',width:330,height:430,flexShrink:0,touchAction:'none'}}>
              {cards.length===0?(
                <div style={{width:'100%',height:'100%',borderRadius:20,background:'linear-gradient(160deg,#1a1a1a 0%,#2d1a1a 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'30px 24px',textAlign:'center'}}>
                  <div style={{fontSize:64,marginBottom:4}}>🏆</div>
                  <div className='rj' style={{color:'#fff',fontSize:26,letterSpacing:3,lineHeight:1}}>ALLE FIGHTER</div>
                  <div className='rj' style={{color:RED,fontSize:26,letterSpacing:3,lineHeight:1}}>GESEHEN</div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:6,lineHeight:1.6}}>{filterWeightClass&&myWeightClass?`Keine Fighter in deiner Nähe gefunden.`:`Alle Fighter wurden gesehen! Neue kommen täglich dazu.`}</div>
                  <div style={{display:'flex',gap:12,marginTop:8,width:'100%'}}>
                    <button onClick={async()=>{setSwStats({ch:0,de:0});if(session&&myProfile){await loadRealFighters(session,myProfile);}}} style={{flex:1,padding:'12px',borderRadius:10,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer'}}>
                      🔄 NEUE FIGHTER
                    </button>
                    <button onClick={()=>setTab('chat')} style={{flex:1,padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:15,letterSpacing:1,cursor:'pointer'}}>
                      💬 CHATS
                    </button>
                  </div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:4}}>Tipp: Doppel-Tap auf eine Karte = Profil ansehen</div>
                </div>
              ):cards.map((f,idx)=>{
                const isTop=idx===cards.length-1;const isSec=idx===cards.length-2;const fA=f.accent||'#c0392b';
                return(
                  <div key={f.id} onMouseDown={isTop?dragStart:undefined} onTouchStart={e=>{
                      if(isTop){
                        const now=Date.now();
                        if(now-lastTapRef.current<300){setViewProfile(f);lastTapRef.current=0;}
                        else{lastTapRef.current=now;dragStart(e);}
                      }
                    }}
                    style={{position:'absolute',inset:0,borderRadius:16,background:'#111',boxShadow:isTop?'0 8px 32px rgba(0,0,0,0.2)':'none',cursor:isTop?'grab':'default',zIndex:isTop?10:isSec?5:1,transform:isTop?cStyle.transform:isSec?'scale(0.96) translateY(10px)':'scale(0.92) translateY(20px)',transition:isTop?cStyle.transition:'none',overflow:'hidden',userSelect:'none'}}>
                    {f.avatar_url
                      ?<img src={f.avatar_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',objectPosition:'center top',background:'#111'}} alt={f.name}/>
                      :<div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,${fA}55 0%,#111 100%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:120}}>{f.emoji||'🥊'}</div>
                    }
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.95) 100%)'}}/>
                    {isTop&&(<>
                      <div style={{position:'absolute',top:22,left:18,border:'3px solid #27ae60',borderRadius:6,padding:'3px 12px',color:'#27ae60',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,letterSpacing:3,transform:'rotate(-18deg)',opacity:fop,transition:drag?'none':'opacity 0.12s'}}>FIGHT</div>
                      <div style={{position:'absolute',top:22,right:18,border:'3px solid '+RED,borderRadius:6,padding:'3px 12px',color:RED,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:26,letterSpacing:3,transform:'rotate(18deg)',opacity:pop,transition:drag?'none':'opacity 0.12s'}}>PASS</div>
                      <div onClick={e=>{e.stopPropagation();setViewProfile(f);}} style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.45)',borderRadius:20,padding:'4px 12px',display:'flex',alignItems:'center',gap:5,cursor:'pointer',backdropFilter:'blur(4px)'}}>
                        <span style={{fontSize:12}}>👁</span>
                        <span style={{color:'rgba(255,255,255,0.85)',fontSize:10,fontWeight:600,letterSpacing:0.5}}>Profil ansehen</span>
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
                            {f.city&&<div style={{background:'rgba(255,255,255,0.2)',borderRadius:20,padding:'2px 10px',color:'#fff',fontSize:11}}>📍 {f.city}{myCity&&f.city&&f.city.toLowerCase()!==myCity.toLowerCase()&&getDistanceKm(myCity,f.city)<500?' · '+getDistanceKm(myCity,f.city)+'km':''}</div>}
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
                  <Btn onClick={()=>doSwipe('de')} color='#d4a017' icon='⭐' size={54}/>
                </div>
                {recentSwiped.length>0&&(
                  <div style={{padding:'4px 16px 0',width:'100%',maxWidth:420}}>
                    <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:2,marginBottom:6,textAlign:'center',fontWeight:700}}>ZULETZT GESEHEN</div>
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
            {dbMatches.length>3&&(
              <div style={{marginTop:11,width:'calc(100% - 24px)',maxWidth:380}}>
                <div style={{color:'#bbb',fontSize:9,letterSpacing:2,marginBottom:6,fontWeight:700}}>FIGHT REQUESTS – tippe für Chat</div>
                <div style={{display:'flex',gap:7,overflowX:'auto'}}>
                  {dbMatches.map(m=>{
                    const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                    if(!other)return null;
                    const ac=other.accent||'#c0392b';
                    return(
                      <div key={m.id} style={{textAlign:'center',flexShrink:0}}>
                        <div onClick={()=>setActiveChat(m)} style={{cursor:'pointer',width:54,height:54,borderRadius:8,overflow:'hidden',border:'2px solid '+ac}}>
                          {other.avatar_url?<img src={other.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} alt={other.name}/>
                          :<div style={{width:'100%',height:'100%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🥊</div>}
                        </div>
                        <div onClick={()=>setViewProfile(other)} style={{color:ac,fontSize:9,marginTop:3,cursor:'pointer',fontWeight:700,maxWidth:54,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{other.name?.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
                {chatSearch&&dbMatches.filter(m=>{
                  const other=m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a;
                  if(!other)return false;
                  const q=chatSearch.toLowerCase();
                  return (other.name||'').toLowerCase().includes(q)||(other.city||'').toLowerCase().includes(q)||(other.style||'').toLowerCase().includes(q);
                }).length===0&&(
                  <div style={{textAlign:'center',padding:'32px 0',color:'#aaa'}}>
                    <div style={{fontSize:36,marginBottom:8}}>🔍</div>
                    <div style={{fontSize:14,fontWeight:700,color:darkMode?'#fff':'#1a1a1a'}}>Kein Fighter gefunden</div>
                    <div style={{fontSize:12,marginTop:4}}>Keine Matches für "{chatSearch}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {tab==='chat'&&(
          <div style={{padding:'14px',maxWidth:420,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3}}>NACHRICHTEN</div>
              {dbMatches.length>0&&<div style={{color:'#aaa',fontSize:11}}>{dbMatches.length} Match{dbMatches.length!==1?'es':''}</div>}
            </div>
            {dbMatches.length>3&&(
              <div style={{position:'relative',marginBottom:10}}>
                <input
                  value={chatSearch}
                  onChange={e=>setChatSearch(e.target.value)}
                  placeholder='Fighter suchen...'
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
                <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>NOCH KEINE MATCHES</div>
                <div style={{color:'#aaa',fontSize:13,lineHeight:1.8,maxWidth:260,textAlign:'center'}}>Swipe rechts auf Fighter die du herausfordern möchtest — bei gegenseitigem Match könnt ihr direkt chatten!</div>
                <button onClick={()=>setTab('swipe')} style={{marginTop:10,padding:'14px 32px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:17,letterSpacing:2,cursor:'pointer',boxShadow:'0 4px 16px rgba(192,57,43,0.3)'}}>
                  ⚔️ JETZT SWIPEN
                </button>
                <div style={{color:'#ddd',fontSize:11,marginTop:2}}>Neue Fighter kommen täglich hinzu</div>
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
                  const ac=other.style==='Boxing'?'#c0392b':other.style==='MMA'?'#2980b9':'#d35400';
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
                            <div style={{color:'#ccc',fontSize:11,marginTop:2,fontStyle:'italic'}}>Noch keine Nachrichten</div>
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
                    {[['NAME *','name','text',profile.name],['STADT *','city','text',profile.city],['GYM','gym','text',profile.gym],['GRÖSSE (cm)','height','number',profile.height],['GEWICHT (kg)','weight','number',profile.weight],['BIO','bio','text',profile.bio]].map(([label,key,type,current])=>(
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
                        <option value=''>Bitte wählen</option>
                        {WEIGHT_CLASSES.map(w=><option key={w} value={w}>{w}</option>)}
                      </select>
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
                    {uploading?<div style={{fontSize:24}} className='spin'>⏳</div>:avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:(profile.img_pos_x||50)+'% '+(profile.img_pos_y||50)+'%'}} alt='avatar'/>:<div style={{fontSize:32}}>👤</div>}
                  </div>
                  <div style={{position:'absolute',bottom:0,right:0,background:RED,borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📷</div>
                </label>
              </div>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:24,letterSpacing:2}}>{profile.name}</div>
              <div style={{color:RED,fontSize:13,fontWeight:600,marginTop:2}}>{profile.style} - {profile.weightClass?profile.weightClass.split(' (')[0]:''}</div>
              <div style={{color:darkMode?'#666':'#999',fontSize:11,marginTop:3}}>📍 {profile.city} - 🏋️ {profile.gym}</div>
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
              {saving?'Speichern...':'Profil speichern'}
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
            {/* GYM VERIFIZIERUNG */}
            <div onClick={()=>setShowGymVerify(true)} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid '+(gymVerified?'#27ae6044':(darkMode?'#2a2a2a':'#eee')),marginTop:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,borderRadius:10,background:gymVerified?'#27ae6018':'#f5f5f5',border:'1px solid '+(gymVerified?'#27ae6044':'#eee'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                {gymVerified?gymVerified.gymEmoji:'🏅'}
              </div>
              <div style={{flex:1}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{gymVerified?'Gym verifiziert ✅':'Gym-Mitgliedschaft verifizieren'}</div>
                <div style={{color:gymVerified?'#27ae60':'#aaa',fontSize:11,marginTop:1}}>{gymVerified?gymVerified.gymName+' · '+gymVerified.gymCity:'Gym-Code eingeben → Badge erhalten'}</div>
              </div>
              <div style={{color:'#bbb',fontSize:18}}>›</div>
            </div>
            {/* TRAININGS-HISTORIE */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:13,letterSpacing:2}}>🤝 TRAININGS-HISTORIE</div>
                  <div style={{color:'#aaa',fontSize:10,marginTop:2}}>Mit wem hast du trainiert?</div>
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
                  <div style={{color:'#bbb',fontSize:12}}>Noch keine Trainings-Einträge</div>
                  <div style={{color:'#ccc',fontSize:10,marginTop:3}}>Nimm einen Fight Request an → wird hier gespeichert</div>
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
            {/* EINSTELLUNGEN */}
            <div style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:14,padding:'16px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),marginTop:10}}>
              <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:16,letterSpacing:2,marginBottom:12}}>EINSTELLUNGEN</div>
              <div onClick={()=>setDarkMode(d=>!d)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontWeight:600}}>🌙 Dark Mode</div>
                <div style={{width:48,height:26,borderRadius:13,background:darkMode?'#c0392b':'#ddd',position:'relative',cursor:'pointer'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:darkMode?24:4,transition:'all 0.3s'}}/>
                </div>
              </div>
              <div onClick={()=>setShowImpressum(true)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontWeight:600}}>📋 Impressum</div>
                <div style={{color:'#aaa',fontSize:16}}>›</div>
              </div>
              <div onClick={()=>setShowDatenschutz(true)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontWeight:600}}>🔐 Datenschutz</div>
                <div style={{color:'#aaa',fontSize:16}}>›</div>
              </div>
              <div onClick={()=>setShowAGB(true)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),cursor:'pointer'}}>
                <div style={{color:darkMode?'#fff':'#1a1a1a',fontSize:14,fontWeight:600}}>📜 AGB</div>
                <div style={{color:'#aaa',fontSize:16}}>›</div>
              </div>

              <div onClick={async()=>{
                if(!window.confirm('Account wirklich löschen? Alle deine Daten werden permanent gelöscht.'))return;
                if(!window.confirm('Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden!'))return;
                try{
                  // Alle Daten löschen
                  await fetch('https://uykdrmymjvqgebsmndme.supabase.co/rest/v1/swipes?swiper_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk',Authorization:'Bearer '+session.token}});
                  await fetch('https://uykdrmymjvqgebsmndme.supabase.co/rest/v1/matches?profile_a_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk',Authorization:'Bearer '+session.token}});
                  await fetch('https://uykdrmymjvqgebsmndme.supabase.co/rest/v1/matches?profile_b_id=eq.'+session.userId,{method:'DELETE',headers:{apikey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk',Authorization:'Bearer '+session.token}});
                  await fetch('https://uykdrmymjvqgebsmndme.supabase.co/rest/v1/profiles?id=eq.'+session.userId,{method:'DELETE',headers:{apikey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5a2RybXltanZxZ2Vic21uZG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzgzNDMsImV4cCI6MjA5MjI1NDM0M30.evhJ-C3jNPkcofVMOR50HHKR9KZ3w1k2TmY-N3jQFzk',Authorization:'Bearer '+session.token}});
                  try{localStorage.clear();}catch{}
                  setSession(null);setMyProfile(null);
                  alert('Dein Account wurde gelöscht.');
                }catch(e){alert('Fehler beim Löschen: '+e.message);}
              }} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',cursor:'pointer',borderTop:'1px solid #e74c3c22'}}>
                <span style={{color:'#e74c3c',fontSize:14,fontWeight:600}}>🗑️ Account löschen</span>
                <span style={{color:'#e74c3c',fontSize:16}}>›</span>
              </div>
              <div onClick={handleLogout} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',cursor:'pointer'}}>
                <div style={{color:'#c0392b',fontSize:14,fontWeight:600}}>🚪 Ausloggen</div>
                <div style={{color:'#aaa',fontSize:16}}>›</div>
              </div>
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
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:11}}>GYMS FINDEN</div>
            {/* TOP GYMS */}
            {(()=>{
              const all=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct})));
              const ranked=all.map(g=>{
                const k=g.ct+'-'+g.name;
                const r=gymRatings[k];
                const userAvg=r&&r.count>0?r.total/r.count:0;
                const avg=userAvg>0?userAvg:g.rating;
                const cnt=r?r.count:0;
                return{...g,k,avg,cnt,userAvg};
              }).sort((a,b)=>{
                if(b.cnt!==a.cnt)return b.cnt-a.cnt;
                return b.avg-a.avg;
              });
              const medal=['🥇','🥈','🥉'];
              const medalColor=['#d4a017','#95a5a6','#cd7f32'];
              return(
                <div style={{marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div className='rj' style={{color:'#d4a017',fontSize:15,letterSpacing:2}}>🏆 GYM RANKING</div>
                    <div style={{color:'#aaa',fontSize:10}}>Nach Bewertungen sortiert</div>
                  </div>
                  {ranked.slice(0,5).map((g,i)=>{
                    const isTop3=i<3;
                    return(
                      <div key={g.k} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:isTop3?(darkMode?'#1f1a10':'#fffbf0'):(darkMode?'#1a1a1a':'#fff'),borderRadius:12,marginBottom:6,border:'1px solid '+(isTop3?'#d4a01744':(darkMode?'#2a2a2a':'#eee')),boxShadow:isTop3?'0 2px 8px rgba(212,160,23,0.12)':'none',cursor:'pointer'}} onClick={()=>{const found=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(gx=>({...gx,ct}))).find(gx=>gx.name===g.name);if(found)setViewGym({gym:found,key:g.k});}}>
                        <div style={{fontSize:isTop3?26:18,width:32,textAlign:'center',flexShrink:0}}>{isTop3?medal[i]:<span className='rj' style={{color:'#bbb'}}>#{i+1}</span>}</div>
                        <div style={{width:38,height:38,borderRadius:8,background:darkMode?'#2a2a2a':'#f5f5f5',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                          {(gymLogos[g.code]?.logo_url||g.logo_url)?<img src={gymLogos[g.code]?.logo_url||g.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#bbb',fontSize:9,textAlign:'center',fontWeight:700,lineHeight:1.2}}>{g.name.split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:isTop3?(darkMode?'#ffd700':'#b8860b'):(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.name}</div>
                          <div style={{color:'#888',fontSize:10,marginTop:1}}>📍 {g.city||g.ct} · {g.members} Mitglieder</div>
                          <div style={{display:'flex',gap:1,marginTop:3}}>
                            {[1,2,3,4,5].map(s=>(
                              <button key={s} onClick={()=>rateGym(g.k,s)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 1px',fontSize:14,color:s<=Math.round(g.avg)?'#d4a017':'#ddd',lineHeight:1}}>
                                {s<=Math.round(g.avg)?'★':'☆'}
                              </button>
                            ))}
                            <span style={{color:'#aaa',fontSize:10,marginLeft:3,alignSelf:'center'}}>{g.cnt>0?g.cnt+' Bew.':'bewerten →'}</span>
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}>
                            <span style={{color:'#d4a017',fontSize:14}}>★</span>
                            <span style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:16}}>{g.avg.toFixed(1)}</span>
                          </div>
                          <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{g.cnt>0?'User-Rating':'Basis'}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{color:'#bbb',fontSize:10,textAlign:'center',marginTop:4}}>Bewerte Gyms unten → Ranking aktualisiert sich sofort</div>
                </div>
              );
            })()}

            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {(()=>{
  const normalize=s=>(s||'').toLowerCase().trim().replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
  const seen=new Set();
  // DB Gyms haben Vorrang — originale Namen behalten
  const dbCities=dbGyms.map(g=>g.city).filter(Boolean);
  const hardCities=Object.keys(GYMS).filter(c=>!dbCities.some(d=>normalize(d)===normalize(c)));
  const allCities=[...dbCities,...hardCities];
  return allCities.filter(c=>{const k=normalize(c);if(seen.has(k))return false;seen.add(k);return true;}).sort();
})().map(c=>(<button key={c} onClick={()=>setCity(c)} style={{flexShrink:0,padding:'6px 13px',borderRadius:20,background:city===c?RED:'#fff',border:'1px solid '+(city===c?RED:'#e0e0e0'),color:city===c?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{c}</button>))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(dbGyms.filter(g=>g.city===city).length>0?dbGyms.filter(g=>g.city===city):(GYMS[city]||[])).map((gym,i)=>(
                <div key={i} onClick={()=>setViewGym({gym,key:city+'-'+gym.name})} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:12,padding:'13px',border:'1px solid '+(darkMode?'#2a2a2a':'#eee'),boxShadow:'0 1px 4px rgba(0,0,0,0.05)',cursor:'pointer'}}>
                  <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
                    <div style={{width:46,height:46,borderRadius:9,background:darkMode?'#2a2a2a':'#f0f0f0',border:'1px solid '+(darkMode?'#333':'#e0e0e0'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>{(gymLogos[gym.code]?.logo_url||gym.logo_url)?<img src={gymLogos[gym.code]?.logo_url||gym.logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=''/>:<div style={{color:'#aaa',fontSize:10,fontWeight:700,textAlign:'center',lineHeight:1.2}}>{gym.name.split(' ').map(w=>w[0]).join('').slice(0,3)}</div>}</div>
                    <div style={{flex:1}}>
                      <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{gym.name}</div>
                      <div style={{color:darkMode?'#aaa':'#888',fontSize:11,marginTop:1}}>📍 {gym.address}</div>
                      <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>{gym.styles.map(s=><Tag key={s} text={s} accent={RED}/>)}</div>
                    </div>
                  </div>
                  <div style={{marginTop:9,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{color:'#888',fontSize:12}}>👥 {gym.members} Mitglieder</div>
                    <div style={{display:'flex',alignItems:'center',gap:3}}><span style={{color:'#d4a017'}}>★</span><span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{gym.rating}</span></div>
                  </div>
                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:((gym.rating-4)/1*100)+'%',background:`linear-gradient(90deg,${RED},#e67e22)`,borderRadius:2}}/></div>
                  <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                    <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginBottom:4}}>Gym bewerten:</div>
                    <div style={{display:'flex',gap:2,alignItems:'center'}}>
                      {[1,2,3,4,5].map(star=>{
                        const k=city+'-'+gym.name;
                        const mine=gymRatings[k]?.userRating||0;
                        return <button key={star} onClick={()=>rateGym(k,star)} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:star<=mine?'#d4a017':'#ddd',padding:'0 1px'}}>{star<=mine?'★':'☆'}</button>;
                      })}
                      {gymRatings[city+'-'+gym.name]?.count>0&&<span style={{color:'#aaa',fontSize:10,marginLeft:4}}>{gymRatings[city+'-'+gym.name].count} Bew.</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='ranking'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:8}}>WELTRANGLISTE</div>
            <div style={{display:'flex',gap:6,marginBottom:11}}>
              <button onClick={()=>setRankMode('user')} style={{flex:1,padding:'7px',borderRadius:8,background:rankMode==='user'?RED:'transparent',border:'1px solid '+(rankMode==='user'?RED:(darkMode?'#333':'#ddd')),color:rankMode==='user'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>🏅 AMATEURE</button>
              <button onClick={()=>setRankMode('pro')} style={{flex:1,padding:'7px',borderRadius:8,background:rankMode==='pro'?'#d4a017':'transparent',border:'1px solid '+(rankMode==='pro'?'#d4a017':(darkMode?'#333':'#ddd')),color:rankMode==='pro'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>🌍 PROFIS</button>
              <button onClick={()=>setRankMode('trainer')} style={{flex:1,padding:'7px',borderRadius:8,background:rankMode==='trainer'?'#8e44ad':'transparent',border:'1px solid '+(rankMode==='trainer'?'#8e44ad':(darkMode?'#333':'#ddd')),color:rankMode==='trainer'?'#fff':(darkMode?'#aaa':'#666'),fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer'}}>🎓 TRAINER</button>
            </div>
            {rankMode!=='trainer'&&(
              <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
                {['All',...STYLES].map(s=>(<button key={s} onClick={()=>setRankF(s)} style={{flexShrink:0,padding:'5px 11px',borderRadius:16,background:rankF===s?RED:'#fff',border:'1px solid '+(rankF===s?RED:'#e0e0e0'),color:rankF===s?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>{s==='All'?'Alle':s}</button>))}
              </div>
            )}
            {rankMode==='trainer'&&(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[...TRAINERS].filter(t=>!myProfile||t.name!==myProfile.name).sort((a,b)=>b.rating-a.rating).map((t,i)=>{
                  const medal=['🥇','🥈','🥉'];
                  const medalColor=['#d4a017','#95a5a6','#cd7f32'];
                  const isTop3=i<3;
                  return(
                    <div key={t.id} style={{background:isTop3?(darkMode?'#1f1a10':'#fffbf0'):(darkMode?'#1a1a1a':'#fff'),borderRadius:13,padding:'12px 13px',border:'1px solid '+(isTop3?'#d4a01733':(darkMode?'#2a2a2a':'#eee')),boxShadow:isTop3?'0 2px 8px rgba(212,160,23,0.1)':'none',display:'flex',alignItems:'center',gap:11}}>
                      <div style={{fontSize:isTop3?26:18,width:32,textAlign:'center',flexShrink:0}}>
                        {isTop3?medal[i]:<span className='rj' style={{color:'#bbb'}}>#{i+1}</span>}
                      </div>
                      <div style={{width:46,height:46,borderRadius:10,background:t.accent+'22',border:'2px solid '+t.accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{t.emoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div className='rj' style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontSize:15,letterSpacing:0.5}}>{t.name}</div>
                          <div style={{background:'#8e44ad22',border:'1px solid #8e44ad44',borderRadius:10,padding:'1px 6px',color:'#8e44ad',fontSize:9,fontWeight:700,flexShrink:0}}>🎓 TRAINER</div>
                        </div>
                        <div style={{color:t.accent,fontSize:11,fontWeight:700,marginTop:1}}>{t.style} · {t.country}</div>
                        <div style={{color:darkMode?'#555':'#bbb',fontSize:10,marginTop:1}}>🏋️ {t.gym}</div>
                        <div style={{color:darkMode?'#444':'#ccc',fontSize:10,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>👥 {t.pupils}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end'}}>
                          <span style={{color:'#d4a017',fontSize:13}}>★</span>
                          <span className='rj' style={{color:isTop3?'#d4a017':(darkMode?'#fff':'#1a1a1a'),fontSize:18}}>{t.rating}</span>
                        </div>
                        <div style={{color:'#bbb',fontSize:9,marginTop:2}}>{t.exp} Jahre</div>
                        <div style={{color:'#d4a017',fontSize:9}}>{t.titles} Titel</div>
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
                    {f.avatar_url?<img src={f.avatar_url} style={{width:isFirst?44:36,height:isFirst?44:36,borderRadius:'50%',objectFit:'cover',border:'2px solid '+colors[i],marginBottom:3}} alt={f.name}/>:<div style={{fontSize:isFirst?28:22,marginBottom:3}}>{f.emoji||'🥊'}</div>}
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
                  {f.avatar_url?<img src={f.avatar_url} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}} alt={f.name}/>:<div style={{fontSize:22}}>{f.emoji||'🥊'}</div>}
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
            <div style={{color:'#ddd',fontSize:9,textAlign:'center',marginTop:11,letterSpacing:1}}>SIEG +3 - UNENTSCH +1 - NIEDERLAGE -2</div>
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
              {filteredT.map((t,i)=>(
                <div key={t.id} style={{background:darkMode?'#1a1a1a':'#fff',borderRadius:13,border:'1px solid '+t.accent+(darkMode?'55':'33'),overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                  <div style={{height:3,background:`linear-gradient(90deg,${t.accent},transparent)`}}/>
                  <div style={{padding:'14px'}}>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:56,height:56,borderRadius:12,background:t.accent+'18',border:'2px solid '+t.accent+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{t.emoji}</div>
                        <div style={{position:'absolute',bottom:-5,right:-5,background:i===0?'#d4a017':i===1?'#95a5a6':i===2?'#cd7f32':'#eee',borderRadius:10,padding:'1px 5px'}}><div className='rj' style={{color:i<3?'#fff':'#aaa',fontSize:10}}>#{i+1}</div></div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <div><div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:15}}>{t.name}</div><div style={{color:t.accent,fontSize:11,fontWeight:700,marginTop:1}}>{t.style.toUpperCase()}</div></div>
                          <div style={{textAlign:'right'}}><div style={{display:'flex',alignItems:'center',gap:2}}><span style={{color:'#d4a017'}}>★</span><span style={{color:'#1a1a1a',fontWeight:700,fontSize:14}}>{t.rating}</span></div><div style={{color:'#aaa',fontSize:10}}>{t.exp} Jahre</div></div>
                        </div>
                        <div style={{color:'#888',fontSize:11,marginTop:2}}>{t.country} - {t.gym}</div>
                      </div>
                    </div>
                    <div style={{marginTop:9,color:darkMode?'#ccc':'#666',fontSize:12,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#eee'),paddingTop:8}}>{t.bio}</div>
                    <div style={{marginTop:8,background:darkMode?'#2a2a2a':'#f8f8f8',borderRadius:7,padding:'7px 10px'}}><div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:3}}>BEKANNTE SCHUELER</div><div style={{color:darkMode?'#ccc':'#666',fontSize:12,fontWeight:600}}>{t.pupils}</div></div>
                    <div style={{marginTop:8,height:3,background:'#f0f0f0',borderRadius:2}}><div style={{height:'100%',width:(t.rating/10*100)+'%',background:`linear-gradient(90deg,${t.accent},${t.accent}66)`,borderRadius:2}}/></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='sports'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>SPORTARTEN</div>
            <div style={{color:'#888',fontSize:12,marginBottom:11}}>Finde Events in deiner Stadt</div>
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
      {showGymVerify&&<div style={{position:'fixed',inset:0,zIndex:500}}><style>{css}</style><GymVerifyModal onClose={()=>{setShowGymVerify(false);setGymCodeInput('');setGymVerifyError('');}} gymCodeInput={gymCodeInput} setGymCodeInput={setGymCodeInput} gymVerifyError={gymVerifyError} setGymVerifyError={setGymVerifyError} gymVerified={gymVerified} setGymVerified={setGymVerified} gymCodes={GYM_CODES} darkMode={darkMode} showMsg={showMsg}/></div>}
      {/* IMPRESSUM MODAL */}
      {showImpressum&&(
        <div style={{position:'fixed',inset:0,background:'#f5f5f7',zIndex:400,overflowY:'auto',padding:'20px 16px 40px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <button onClick={()=>setShowImpressum(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>← Zurück</button>
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
            <button onClick={()=>setShowDatenschutz(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>← Zurück</button>
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
            <button onClick={()=>setShowAGB(false)} style={{background:'none',border:'none',color:'#c0392b',fontSize:20,cursor:'pointer',marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:700}}>← Zurück</button>
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
        <div style={{position:'fixed',inset:0,background:darkMode?'#0d0d0d':'#f0f0f5',zIndex:600,display:'flex',flexDirection:'column'}}>
          <style>{`
            .adm-card{background:${darkMode?'#1a1a1a':'#fff'};border-radius:12px;padding:16px;border:1px solid ${darkMode?'#2a2a2a':'#e8e8e8'};margin-bottom:12px;}
            .adm-label{font-size:10px;font-weight:700;letter-spacing:2px;color:#888;margin-bottom:6px;text-transform:uppercase;}
            .adm-inp{width:100%;padding:10px 12px;border-radius:8px;border:1px solid ${darkMode?'#333':'#ddd'};background:${darkMode?'#111':'#f9f9f9'};color:${darkMode?'#fff':'#1a1a1a'};font-size:13px;box-sizing:border-box;outline:none;}
            .adm-btn{padding:10px 16px;border-radius:8px;border:none;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;cursor:pointer;letter-spacing:1px;}
            .adm-red{background:#c0392b;color:#fff;}
            .adm-green{background:#27ae60;color:#fff;}
            .adm-blue{background:#2980b9;color:#fff;}
            .adm-ghost{background:transparent;border:1px solid #c0392b !important;color:#c0392b;}
            .adm-tab{padding:10px 14px;background:none;border:none;border-bottom:2px solid transparent;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;transition:all 0.2s;}
            .adm-tab.active{border-bottom-color:#c0392b;color:#c0392b;}
            .adm-user-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid ${darkMode?'#2a2a2a':'#f0f0f0'};}
          `}</style>

          {/* Header */}
          <div style={{background:'#c0392b',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontSize:22}}>⚙️</div>
              <div>
                <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:20,color:'#fff',letterSpacing:3}}>ADMIN PANEL</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Fighter App Control Center</div>
              </div>
            </div>
            <button onClick={()=>setShowAdmin(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,width:36,height:36,color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>

          {/* Tab Bar */}
          <div style={{display:'flex',overflowX:'auto',background:darkMode?'#1a1a1a':'#fff',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#e8e8e8'),flexShrink:0,padding:'0 4px'}}>
            {[['gyms','🏋️ Gyms'],['addgym','➕ Gym'],['addcity','🌍 Stadt'],['users','👤 User'],['reports','🚨 Meldungen'],['records','🏅 Rekorde'],['broadcast','📢 Broadcast'],['stats','📊 Stats'],['scanner','🔍 Scanner']].map(([t,l])=>(
              <button key={t} onClick={()=>setAdminTab(t)} className={'adm-tab'+(adminTab===t?' active':'')} style={{color:adminTab===t?'#c0392b':(darkMode?'#aaa':'#666')}}>{l}</button>
            ))}
          </div>

          {/* Content */}
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>

            {/* ── GYMS ── */}
            {adminTab==='gyms'&&(
              <div>
                <div className='adm-label'>Gym Logos verwalten</div>
                <div className='adm-card'>
                  <div className='adm-label'>Gym Code</div>
                  <input className='adm-inp' placeholder='z.B. TGB-2847' value={newGymCode||''} onChange={e=>setNewGymCode(e.target.value)} style={{marginBottom:10}}/>
                  <label style={{display:'block',border:'2px dashed '+(darkMode?'#333':'#ddd'),borderRadius:8,padding:'20px',textAlign:'center',cursor:'pointer',marginBottom:10,color:darkMode?'#666':'#aaa'}}>
                    <input type='file' accept='image/*' style={{display:'none'}} onChange={async(e)=>{
                      const file=e.target.files?.[0];if(!file||!newGymCode)return;
                      try{
                        const url=await uploadPhoto(file,'gyms/'+newGymCode+'.png',session.token);
                        if(url){
                          await dbInsert('gym_logos',{gym_code:newGymCode,logo_url:url},session.token);
                          setGymLogos(g=>({...g,[newGymCode]:url}));
                          showMsg('✅ Logo gespeichert');
                          setNewGymCode('');
                        }
                      }catch(e){showMsg('Fehler: '+e.message);}
                    }}/>
                    📷 Logo hochladen
                  </label>
                  <button className='adm-btn adm-red' style={{width:'100%'}}>SPEICHERN</button>
                </div>
                <div className='adm-label'>Vorhandene Logos ({Object.keys(gymLogos).length})</div>
                {Object.entries(gymLogos).map(([code,url])=>(
                  <div key={code} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:darkMode?'#1a1a1a':'#fff',borderRadius:8,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                    <img src={url} style={{width:36,height:36,borderRadius:6,objectFit:'cover'}} alt=''/>
                    <div style={{flex:1,color:darkMode?'#fff':'#1a1a1a',fontSize:13,fontWeight:600}}>{code}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── GYM HINZUFÜGEN ── */}
            {adminTab==='addgym'&&(
              <div>
                <div className='adm-label'>Neues Gym hinzufügen</div>
                <div className='adm-card'>
                  {[['name','Gym Name','z.B. Black Dragon MMA'],['city','Stadt','z.B. Düsseldorf'],['address','Adresse (optional)','z.B. Hauptstr. 12'],['style','Hauptstil','z.B. MMA']].map(([key,label,ph])=>(
                    <div key={key} style={{marginBottom:10}}>
                      <div className='adm-label'>{label}</div>
                      <input className='adm-inp' placeholder={ph} value={newGymData?.[key]||''} onChange={e=>setNewGymData(p=>({...p,[key]:e.target.value}))}/>
                    </div>
                  ))}
                  <button className='adm-btn adm-red' style={{width:'100%'}} onClick={async()=>{
                    if(!newGymData?.name||!newGymData?.city){showMsg('Name und Stadt pflicht!');return;}
                    try{
                      await fetch(SUPA_URL+'/rest/v1/gyms',{
                        method:'POST',
                        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                        body:JSON.stringify({name:newGymData.name,city:newGymData.city,address:newGymData.address||'',style:newGymData.style||'',styles:newGymData.style?[newGymData.style]:[],code:newGymData.name.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,15)+'-'+Date.now().toString().slice(-4),emoji:'🥊',members:0,rating:0})
                      });
                      await loadDbGyms(session);
                      showMsg('✅ '+newGymData.name+' hinzugefügt!');
                      setNewGymData({});
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }}>GYM HINZUFÜGEN</button>
                </div>
              </div>
            )}

            {/* ── STADT HINZUFÜGEN ── */}
            {adminTab==='addcity'&&(
              <div>
                <div className='adm-label'>Neue Stadt + Gym hinzufügen</div>
                <div className='adm-card'>
                  {[['city','Stadt','z.B. Hamburg'],['gymName','Gym Name','z.B. Kampfsport Hamburg']].map(([key,label,ph])=>(
                    <div key={key} style={{marginBottom:10}}>
                      <div className='adm-label'>{label}</div>
                      <input className='adm-inp' placeholder={ph} value={newCityData?.[key]||''} onChange={e=>setNewCityData(p=>({...p,[key]:e.target.value}))}/>
                    </div>
                  ))}
                  <button className='adm-btn adm-red' style={{width:'100%'}} onClick={async()=>{
                    if(!newCityData?.city){showMsg('Stadt pflicht!');return;}
                    const gymName=newCityData.gymName||('Kampfsport '+newCityData.city);
                    try{
                      await fetch(SUPA_URL+'/rest/v1/gyms',{
                        method:'POST',
                        headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},
                        body:JSON.stringify({name:gymName,city:newCityData.city,code:gymName.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,15)+'-'+Date.now().toString().slice(-4),emoji:'🥊',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})
                      });
                      await loadDbGyms(session);
                      showMsg('✅ '+newCityData.city+' hinzugefügt!');
                      setNewCityData({});
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }}>STADT HINZUFÜGEN</button>
                </div>
              </div>
            )}

            {/* ── USER ── */}
            {adminTab==='users'&&(
              <div>
                <button className='adm-btn adm-red' style={{width:'100%',marginBottom:12}} onClick={async()=>{
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?order=created_at.desc&limit=500',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminUsers(data);setAdminUsersLoaded(true);}
                  }catch(e){showMsg('Fehler: '+e.message);}
                }}>🔄 USER LADEN ({adminUsers.length})</button>

                {adminUsersLoaded&&(
                  <div>
                    {/* Search */}
                    <input className='adm-inp' placeholder='🔍 User suchen...' style={{marginBottom:12}} onChange={e=>setAdminSearch(e.target.value)} value={adminSearch||''}/>
                    {(adminSearch?adminUsers.filter(u=>(u.name||'').toLowerCase().includes((adminSearch||'').toLowerCase())||(u.city||'').toLowerCase().includes((adminSearch||'').toLowerCase())):adminUsers).map((u,i)=>(
                      <div key={i} className='adm-card' style={{padding:'12px',marginBottom:8,opacity:u.banned?0.6:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          {u.avatar_url
                            ?<img src={u.avatar_url} style={{width:44,height:44,borderRadius:10,objectFit:'cover',flexShrink:0,cursor:'pointer'}} onClick={()=>{setShowAdmin(false);setViewProfile(u);}} alt=''/>
                            :<div style={{width:44,height:44,borderRadius:10,background:'#c0392b',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:16,flexShrink:0,cursor:'pointer'}} onClick={()=>{setShowAdmin(false);setViewProfile(u);}}>{(u.name||'?')[0].toUpperCase()}</div>
                          }
                          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>{setShowAdmin(false);setViewProfile(u);}}>
                            <div style={{fontWeight:700,fontSize:14,color:darkMode?'#fff':'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name||'Unbekannt'} {u.banned&&<span style={{background:'#e74c3c',color:'#fff',fontSize:9,padding:'1px 5px',borderRadius:4,marginLeft:4}}>GESPERRT</span>}</div>
                            <div style={{fontSize:11,color:'#888'}}>{u.style||'?'} · {u.city||'?'} · {u.wins||0}W {u.losses||0}L</div>
                            <div style={{fontSize:10,color:'#aaa'}}>{u.created_at?new Date(u.created_at).toLocaleDateString('de-DE'):''}</div>
                          </div>
                          <div style={{display:'flex',gap:4,flexShrink:0}}>
                            <button className='adm-btn' style={{background:u.banned?'#27ae60':'#e67e22',color:'#fff',padding:'5px 8px',fontSize:11}} onClick={async()=>{
                              const ban=!u.banned;
                              await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({banned:ban})});
                              setAdminUsers(prev=>prev.map(x=>x.id===u.id?{...x,banned:ban}:x));
                              showMsg(ban?'User gesperrt':'User entsperrt');
                            }}>{u.banned?'✓ Frei':'🚫 Sperren'}</button>
                            <button className='adm-btn adm-blue' style={{padding:'5px 8px',fontSize:11}} onClick={async()=>{
                              const msg=window.prompt('Nachricht an '+u.name+':');
                              if(!msg?.trim())return;
                              try{
                                await fetch(SUPA_URL+'/rest/v1/admin_messages',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({user_id:u.id,message:msg,from_admin:true,read:false})});
                                showMsg('✅ Nachricht gesendet');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }}>✉️</button>
                            <button className='adm-btn' style={{background:'#c0392b',color:'#fff',padding:'5px 8px',fontSize:11}} onClick={async()=>{
                              if(!window.confirm('User '+u.name+' wirklich löschen?'))return;
                              try{
                                await fetch(SUPA_URL+'/rest/v1/swipes?swiper_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                                await fetch(SUPA_URL+'/rest/v1/matches?profile_a_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                                await fetch(SUPA_URL+'/rest/v1/matches?profile_b_id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                                await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});
                                try{await fetch(SUPA_URL+'/auth/v1/admin/users/'+u.id,{method:'DELETE',headers:{apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY}});}catch{}
                                setAdminUsers(prev=>prev.filter(x=>x.id!==u.id));
                                setCards(prev=>prev.filter(x=>x.id!==u.id));
                                setAllProfiles(prev=>prev.filter(x=>x.id!==u.id));
                                setDbMatches(prev=>prev.filter(m=>m.profile_a_id!==u.id&&m.profile_b_id!==u.id));
                                setWhoLikedMe(prev=>prev.filter(x=>x.id!==u.id));
                                showMsg('✅ User gelöscht');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MELDUNGEN ── */}
            {adminTab==='reports'&&(
              <div>
                <div className='adm-label'>Eingegangene Meldungen</div>
                {reports.length===0
                  ?<div style={{textAlign:'center',padding:'40px',color:'#aaa'}}><div style={{fontSize:32,marginBottom:8}}>✅</div>Keine Meldungen</div>
                  :reports.map((r,i)=>(
                    <div key={i} className='adm-card'>
                      <div style={{fontWeight:700,color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>{r.reporter_name||'?'} meldet {r.reported_name||'?'}</div>
                      <div style={{color:'#aaa',fontSize:12,marginTop:4}}>{r.reason||'Kein Grund angegeben'}</div>
                      <div style={{color:'#666',fontSize:10,marginTop:4}}>{r.created_at?new Date(r.created_at).toLocaleDateString('de-DE'):''}</div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── REKORDE ── */}
            {adminTab==='records'&&(
              <div>
                <div className='adm-label'>Ausstehende Rekord-Anträge</div>
                {recordRequests.length===0
                  ?<div style={{textAlign:'center',padding:'40px',color:'#aaa'}}><div style={{fontSize:32,marginBottom:8}}>✅</div>Keine Anträge</div>
                  :recordRequests.map((r,i)=>(
                    <div key={i} className='adm-card'>
                      <div style={{fontWeight:700,color:darkMode?'#fff':'#1a1a1a',fontSize:13}}>{r.name}</div>
                      <div style={{color:'#aaa',fontSize:12}}>{r.wins}W {r.losses}L {r.draws}U {r.ko}KO</div>
                      {r.record_proof_url&&<img src={r.record_proof_url} style={{width:'100%',borderRadius:8,marginTop:8}} alt=''/>}
                      <div style={{display:'flex',gap:8,marginTop:10}}>
                        <button className='adm-btn adm-green' style={{flex:1}} onClick={async()=>{
                          await fetch(SUPA_URL+'/rest/v1/profiles?id=eq.'+r.id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:SUPA_SERVICE_KEY,Authorization:'Bearer '+SUPA_SERVICE_KEY,Prefer:'return=minimal'},body:JSON.stringify({record_verified:true})});
                          setRecordRequests(prev=>prev.filter(x=>x.id!==r.id));
                          showMsg('✅ Rekord verifiziert');
                        }}>✓ VERIFIZIEREN</button>
                        <button className='adm-btn' style={{flex:1,background:'#e74c3c',color:'#fff'}} onClick={()=>setRecordRequests(prev=>prev.filter(x=>x.id!==r.id))}>✕ ABLEHNEN</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── BROADCAST ── */}
            {adminTab==='broadcast'&&(
              <div>
                <div className='adm-label'>Nachricht an alle User</div>
                <div className='adm-card'>
                  <div className='adm-label'>Nachricht</div>
                  <textarea className='adm-inp' rows={4} placeholder='Deine Nachricht an alle Fighter...' style={{resize:'none',marginBottom:10}} value={broadcastMsg||''} onChange={e=>setBroadcastMsg(e.target.value)}/>
                  <button className='adm-btn adm-red' style={{width:'100%'}} onClick={async()=>{
                    if(!broadcastMsg?.trim())return;
                    if(!window.confirm('Nachricht an ALLE senden?'))return;
                    try{
                      await dbInsert('broadcasts',{message:broadcastMsg,sent_by:session.userId,created_at:new Date().toISOString()},session.token);
                      showMsg('✅ Broadcast gesendet!');
                      setBroadcastMsg('');
                    }catch(e){showMsg('Fehler: '+e.message);}
                  }}>📢 AN ALLE SENDEN</button>
                </div>
              </div>
            )}

            {/* ── STATS ── */}
            {adminTab==='stats'&&(
              <div>
                <button className='adm-btn adm-red' style={{width:'100%',marginBottom:12}} onClick={async()=>{
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?order=created_at.desc&limit=500',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const data=await resp.json();
                    if(Array.isArray(data)){setAdminUsers(data);setAdminUsersLoaded(true);}
                  }catch(e){showMsg('Fehler: '+e.message);}
                }}>🔄 STATS AKTUALISIEREN</button>
                {adminUsersLoaded&&(
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                      {[['👤','Gesamt',adminUsers.length],['🟢','Heute aktiv',adminUsers.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<86400000).length],['📅','Diese Woche',adminUsers.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<604800000).length],['🚫','Gesperrt',adminUsers.filter(u=>u.banned).length]].map(([icon,label,val])=>(
                        <div key={label} className='adm-card' style={{textAlign:'center',padding:'14px 8px'}}>
                          <div style={{fontSize:22}}>{icon}</div>
                          <div style={{color:'#c0392b',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:28}}>{val}</div>
                          <div style={{color:'#888',fontSize:10}}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className='adm-card'>
                      <div className='adm-label'>Neue User heute</div>
                      {adminUsers.filter(u=>u.created_at&&(Date.now()-new Date(u.created_at).getTime())<86400000).length===0
                        ?<div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'12px'}}>Keine neuen User heute</div>
                        :adminUsers.filter(u=>u.created_at&&(Date.now()-new Date(u.created_at).getTime())<86400000).map((u,i)=>(
                          <div key={i} className='adm-user-row' onClick={()=>{setShowAdmin(false);setViewProfile(u);}} style={{cursor:'pointer'}}>
                            {u.avatar_url?<img src={u.avatar_url} style={{width:32,height:32,borderRadius:8,objectFit:'cover'}} alt=''/>:<div style={{width:32,height:32,borderRadius:8,background:'#c0392b',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13}}>{(u.name||'?')[0]}</div>}
                            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:darkMode?'#fff':'#1a1a1a'}}>{u.name||'?'}</div><div style={{fontSize:11,color:'#888'}}>{u.style} · {u.city}</div></div>
                            <div style={{fontSize:10,color:'#aaa'}}>{u.created_at?new Date(u.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):''}</div>
                          </div>
                        ))
                      }
                    </div>
                    <div className='adm-card'>
                      <div className='adm-label'>Alle User ({adminUsers.length})</div>
                      {adminUsers.map((u,i)=>(
                        <div key={i} className='adm-user-row' onClick={()=>{setShowAdmin(false);setViewProfile(u);}} style={{cursor:'pointer',opacity:u.banned?0.5:1}}>
                          {u.avatar_url?<img src={u.avatar_url} style={{width:32,height:32,borderRadius:8,objectFit:'cover'}} alt=''/>:<div style={{width:32,height:32,borderRadius:8,background:'#c0392b',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13}}>{(u.name||'?')[0]}</div>}
                          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:darkMode?'#fff':'#1a1a1a'}}>{u.name||'?'} {u.banned&&'🚫'}</div><div style={{fontSize:11,color:'#888'}}>{u.style} · {u.city}</div></div>
                          <div style={{fontSize:10,color:'#aaa'}}>{u.created_at?new Date(u.created_at).toLocaleDateString('de-DE'):''}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── SCANNER ── */}
            {adminTab==='scanner'&&(
              <div>
                <div className='adm-label'>Fehlende Städte & Gyms finden</div>
                <button className='adm-btn adm-red' style={{width:'100%',marginBottom:16}} onClick={async()=>{
                  showMsg('Scanne alle Profile...');
                  try{
                    const resp=await fetch(SUPA_URL+'/rest/v1/profiles?select=city,gym&limit=500',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const profiles=await resp.json();
                    const gymResp=await fetch(SUPA_URL+'/rest/v1/gyms?select=city,name',{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+session.token}});
                    const existingGyms=await gymResp.json();
                    const norm=s=>(s||'').toLowerCase().trim().replace(/ü/g,'ue').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ß/g,'ss');
                    const existingCities=new Set();
                    const existingGymNames=new Set();
                    if(Array.isArray(existingGyms))existingGyms.forEach(g=>{if(g.city)existingCities.add(norm(g.city));if(g.name)existingGymNames.add(norm(g.name));});
                    Object.keys(GYMS).forEach(c=>existingCities.add(norm(c)));
                    Object.values(GYMS).flat().forEach(g=>{if(g.name)existingGymNames.add(norm(g.name));});
                    const newCities={};const newGyms={};
                    if(Array.isArray(profiles)){
                      profiles.forEach(p=>{
                        if(p.city&&!existingCities.has(norm(p.city)))newCities[p.city]=(newCities[p.city]||0)+1;
                        if(p.gym&&!existingGymNames.has(norm(p.gym))){if(!newGyms[p.gym])newGyms[p.gym]={city:p.city,count:0};newGyms[p.gym].count++;}
                      });
                    }
                    setScanResult({cities:Object.entries(newCities).sort((a,b)=>b[1]-a[1]),gyms:Object.entries(newGyms).sort((a,b)=>b[1].count-a[1].count)});
                    showMsg('Scan fertig!');
                  }catch(e){showMsg('Fehler: '+e.message);}
                }}>🔍 JETZT SCANNEN</button>

                {scanResult&&(
                  <>
                    {scanResult.cities.length>0&&(
                      <div className='adm-card'>
                        <div className='adm-label'>Fehlende Städte ({scanResult.cities.length})</div>
                        {scanResult.cities.map(([city,count])=>(
                          <div key={city} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:darkMode?'#fff':'#1a1a1a'}}>{city}</div><div style={{fontSize:11,color:'#888'}}>{count} User</div></div>
                            <button className='adm-btn adm-green' style={{padding:'5px 10px',fontSize:11}} onClick={async()=>{
                              const gymName=window.prompt('Gym Name für '+city+':') || ('Kampfsport '+city);
                              try{
                                await fetch(SUPA_URL+'/rest/v1/gyms',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name:gymName,city,code:gymName.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,15)+'-'+Date.now().toString().slice(-4),emoji:'🥊',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})});
                                setScanResult(prev=>({...prev,cities:prev.cities.filter(([c])=>c!==city)}));
                                await loadDbGyms(session);
                                showMsg('✅ '+city+' hinzugefügt');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }}>+ Hinzufügen</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {scanResult.gyms.length>0&&(
                      <div className='adm-card'>
                        <div className='adm-label'>Fehlende Gyms ({scanResult.gyms.length})</div>
                        {scanResult.gyms.map(([gym,data])=>(
                          <div key={gym} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:darkMode?'#fff':'#1a1a1a'}}>{gym}</div><div style={{fontSize:11,color:'#888'}}>{data.city||'?'} · {data.count} User</div></div>
                            <button className='adm-btn adm-green' style={{padding:'5px 10px',fontSize:11}} onClick={async()=>{
                              try{
                                await fetch(SUPA_URL+'/rest/v1/gyms',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+session.token,Prefer:'return=minimal'},body:JSON.stringify({name:gym,city:data.city||'Unbekannt',code:gym.replace(/[^A-Z0-9]/gi,'-').toUpperCase().slice(0,15)+'-'+Date.now().toString().slice(-4),emoji:'🥊',style:'Kampfsport',styles:['Kampfsport'],members:0,rating:0})});
                                setScanResult(prev=>({...prev,gyms:prev.gyms.filter(([g])=>g!==gym)}));
                                await loadDbGyms(session);
                                showMsg('✅ '+gym+' hinzugefügt');
                              }catch(e){showMsg('Fehler: '+e.message);}
                            }}>+ Hinzufügen</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {scanResult.cities.length===0&&scanResult.gyms.length===0&&(
                      <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}><div style={{fontSize:32,marginBottom:8}}>✅</div>Alles erfasst!</div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}}
      {showImgEditor&&imgEditorSrc&&(
        <ImgPositionEditor
          src={imgEditorSrc}
          onSave={imgEditorCallback}
          onCancel={()=>setShowImgEditor(false)}
          darkMode={darkMode}
        />
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
          {matched.avatar_url?<img src={matched.avatar_url} style={{width:140,height:140,borderRadius:'50%',objectFit:'cover',border:'3px solid '+RED}} alt=''/>:<div style={{fontSize:52}}>{matched.emoji||'🥊'}</div>}
          <div className='rj' style={{color:'#fff',fontSize:24,letterSpacing:2}}>{matched.name}</div>
          <div style={{color:matched.accent||RED,fontSize:12,fontWeight:700}}>{matched.style} · {matched.city}</div>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={()=>{setMatched(null);setTab('chat');}} style={{padding:'13px 28px',borderRadius:12,background:`linear-gradient(135deg,${RED},#e74c3c)`,color:'#fff',border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:16,letterSpacing:2,cursor:'pointer'}}>💬 JETZT CHATTEN</button>
            <button onClick={()=>setMatched(null)} style={{padding:'13px 20px',borderRadius:12,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>Weiter swipen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ImgPositionEditor({src,onSave,onCancel,darkMode}){
  const [pos,setPos]=React.useState({x:50,y:50});
  const [dragging,setDragging]=React.useState(false);
  const [startPos,setStartPos]=React.useState({x:0,y:0});
  const containerRef=React.useRef(null);

  const handleStart=(clientX,clientY)=>{
    setDragging(true);
    setStartPos({x:clientX,y:clientY});
  };
  const handleMove=(clientX,clientY)=>{
    if(!dragging||!containerRef.current)return;
    const rect=containerRef.current.getBoundingClientRect();
    const dx=(clientX-startPos.x)/rect.width*100;
    const dy=(clientY-startPos.y)/rect.height*100;
    setPos(p=>({x:Math.max(0,Math.min(100,p.x-dx)),y:Math.max(0,Math.min(100,p.y-dy))}));
    setStartPos({x:clientX,y:clientY});
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:1001,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{color:'#fff',fontFamily:'Rajdhani,sans-serif',fontSize:18,fontWeight:700,letterSpacing:2,marginBottom:12}}>BILDAUSSCHNITT WÄHLEN</div>
      <div style={{color:'#aaa',fontSize:12,marginBottom:16,textAlign:'center'}}>Ziehe das Bild um den Ausschnitt anzupassen</div>
      <div ref={containerRef}
        style={{width:280,height:280,borderRadius:'50%',overflow:'hidden',border:'3px solid #c0392b',cursor:'grab',userSelect:'none',position:'relative',boxShadow:'0 0 0 3000px rgba(0,0,0,0.5)'}}
        onMouseDown={e=>{e.preventDefault();handleStart(e.clientX,e.clientY);}}
        onMouseMove={e=>{if(dragging)handleMove(e.clientX,e.clientY);}}
        onMouseUp={()=>setDragging(false)}
        onTouchStart={e=>{e.preventDefault();handleStart(e.touches[0].clientX,e.touches[0].clientY);}}
        onTouchMove={e=>{e.preventDefault();if(dragging)handleMove(e.touches[0].clientX,e.touches[0].clientY);}}
        onTouchEnd={()=>setDragging(false)}
      >
        <img src={src} style={{width:'150%',height:'150%',objectFit:'cover',objectPosition:pos.x+'% '+pos.y+'%',pointerEvents:'none',transform:'translate(-17%,-17%)'}} alt=''/>
      </div>
      <div style={{display:'flex',gap:12,marginTop:24,width:'100%',maxWidth:280}}>
        <button onClick={onCancel} style={{flex:1,padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>ABBRECHEN</button>
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
