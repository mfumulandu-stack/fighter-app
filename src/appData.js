// Stammdaten der App: Gewichtsklassen, Kampfstile, Guertelgrade, Staedte
// mit Koordinaten und Bundesland-Zuordnung, Gyms, Trainer und Sportarten -
// dazu die drei Helfer, die auf diesen Daten rechnen (Entfernung zwischen
// zwei Staedten bzw. zwei Koordinaten, Bundesland zu einer Stadt).
//
// Bewusst als eigene Datei ausgelagert: reine Daten ohne Oberflaeche,
// die von mehreren Stellen gebraucht werden. Neue Staedte oder Gyms
// pflegt man ab jetzt hier.
//
// HINWEIS: Der Inhalt ist unveraendert aus App.js hierher verschoben.

const WEIGHT_CLASSES = [
  'Strohgewicht (bis 48 kg)','Leichtfliegengewicht (bis 49 kg)','Fliegengewicht (bis 51 kg)',
  'Superfliegengewicht (bis 52 kg)','Bantamgewicht (bis 53,5 kg)','Superbantamgewicht (bis 55 kg)',
  'Federgewicht (bis 57 kg)','Superfedergewicht (bis 59 kg)','Leichtgewicht (bis 61 kg)',
  'Halbweltergewicht (bis 63,5 kg)','Weltergewicht (bis 66,7 kg)','Halbmittelgewicht (bis 69,9 kg)',
  'Mittelgewicht (bis 72,6 kg)','Supermittelgewicht (bis 76,2 kg)','Halbschwergewicht (bis 79,4 kg)',
  'Cruisergewicht (bis 90,7 kg)','Schwergewicht (ueber 90,7 kg)'
];
const STYLES = ['Boxing','Kickboxing','MMA','Muay Thai','Grappling','BJJ','Wrestling','Kung Fu','Karate','Taekwondo','Judo','Sambo'];
// Sportarten, bei denen ein Guertelrang ueblich ist
const BELT_STYLES = ['BJJ','Karate','Taekwondo','Judo'];
const BELT_RANKS = ['Weiss','Gelb','Orange','Gruen','Blau','Lila','Braun','Schwarz'];
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
export { WEIGHT_CLASSES, STYLES, BELT_STYLES, BELT_RANKS, PRO_FIGHTERS, FIGHTERS, CITY_COORDS, CITY_BUNDESLAND, GYMS, TRAINERS, SPORTS, getDistanceKm, getDistanceKmCoords, getBundesland, getLocationByIP };
