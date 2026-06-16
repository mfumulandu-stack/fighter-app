with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'r') as f:
    code = f.read()

# 1. Add PRO_FIGHTERS before FIGHTERS array
pro_fighters = '''const PRO_FIGHTERS=[
  {id:"p1",name:"Islam Makhachev",age:33,city:"Dagestan",gym:"AKA",style:"MMA",wins:26,losses:1,draws:0,ko:11,emoji:"🦅",accent:"#c0392b",isPro:true},
  {id:"p2",name:"Ilia Topuria",age:27,city:"Tiflis",gym:"Sanford MMA",style:"MMA",wins:16,losses:0,draws:0,ko:13,emoji:"🔥",accent:"#e67e22",isPro:true},
  {id:"p3",name:"Alex Pereira",age:37,city:"Sao Paulo",gym:"Glory Kickboxing",style:"Kickboxing",wins:12,losses:2,draws:0,ko:10,emoji:"💥",accent:"#27ae60",isPro:true},
  {id:"p4",name:"Jon Jones",age:37,city:"New York",gym:"Jackson-Wink MMA",style:"MMA",wins:27,losses:1,draws:0,ko:11,emoji:"👑",accent:"#8e44ad",isPro:true},
  {id:"p5",name:"Khamzat Chimaev",age:30,city:"Grozny",gym:"Allstars Training",style:"MMA",wins:14,losses:0,draws:0,ko:10,emoji:"🐺",accent:"#2980b9",isPro:true},
  {id:"p6",name:"Tom Aspinall",age:31,city:"Manchester",gym:"Next Generation MMA",style:"MMA",wins:15,losses:3,draws:0,ko:11,emoji:"🦁",accent:"#c0392b",isPro:true},
  {id:"p7",name:"Merab Dvalishvili",age:33,city:"Tiflis",gym:"Serra-Longo MMA",style:"MMA",wins:17,losses:4,draws:0,ko:3,emoji:"⚡",accent:"#16a085",isPro:true},
  {id:"p8",name:"Canelo Alvarez",age:34,city:"Guadalajara",gym:"Reynoso Boxing",style:"Boxing",wins:62,losses:2,draws:2,ko:39,emoji:"🌹",accent:"#e74c3c",isPro:true},
  {id:"p9",name:"Tyson Fury",age:36,city:"Manchester",gym:"MTK Global",style:"Boxing",wins:34,losses:1,draws:1,ko:24,emoji:"🥊",accent:"#c0392b",isPro:true},
  {id:"p10",name:"Oleksandr Usyk",age:37,city:"Simferopol",gym:"Klitschko Gym",style:"Boxing",wins:22,losses:0,draws:0,ko:14,emoji:"🏆",accent:"#2980b9",isPro:true},
  {id:"p11",name:"Gervonta Davis",age:30,city:"Baltimore",gym:"Mayweather Promotions",style:"Boxing",wins:30,losses:0,draws:0,ko:28,emoji:"💎",accent:"#8e44ad",isPro:true},
  {id:"p12",name:"Terence Crawford",age:37,city:"Omaha",gym:"Top Rank",style:"Boxing",wins:41,losses:0,draws:0,ko:31,emoji:"👊",accent:"#d4a017",isPro:true},
  {id:"p13",name:"Charles Oliveira",age:35,city:"Sao Paulo",gym:"Chute Boxe",style:"MMA",wins:35,losses:10,draws:0,ko:21,emoji:"🕊️",accent:"#27ae60",isPro:true},
  {id:"p14",name:"Alexander Volkanovski",age:36,city:"Wollongong",gym:"City Kickboxing",style:"MMA",wins:26,losses:3,draws:0,ko:12,emoji:"🦈",accent:"#2980b9",isPro:true},
  {id:"p15",name:"Dricus Du Plessis",age:30,city:"Pretoria",gym:"EFC Worldwide",style:"MMA",wins:22,losses:2,draws:0,ko:14,emoji:"🦓",accent:"#e67e22",isPro:true},
  {id:"p16",name:"Max Holloway",age:33,city:"Hawaii",gym:"Hawaii Hilo",style:"MMA",wins:26,losses:7,draws:0,ko:13,emoji:"🌺",accent:"#27ae60",isPro:true},
  {id:"p17",name:"Dustin Poirier",age:35,city:"Louisiana",gym:"American Top Team",style:"MMA",wins:30,losses:9,draws:0,ko:16,emoji:"💰",accent:"#e67e22",isPro:true},
  {id:"p18",name:"Sean O Malley",age:30,city:"Montana",gym:"MMA Lab",style:"MMA",wins:18,losses:1,draws:0,ko:13,emoji:"🍭",accent:"#9b59b6",isPro:true},
  {id:"p19",name:"Israel Adesanya",age:35,city:"Auckland",gym:"City Kickboxing",style:"MMA",wins:24,losses:4,draws:0,ko:16,emoji:"🥷",accent:"#2c3e50",isPro:true},
  {id:"p20",name:"Leon Edwards",age:32,city:"Birmingham",gym:"Wolfslair MMA",style:"MMA",wins:22,losses:4,draws:1,ko:8,emoji:"🐉",accent:"#c0392b",isPro:true},
];
'''

if 'const PRO_FIGHTERS' not in code:
    idx = code.find('const FIGHTERS')
    code = code[:idx] + pro_fighters + code[idx:]
    print("Added PRO_FIGHTERS")
else:
    print("PRO_FIGHTERS already exists")

# 2. Add rankMode state
if 'rankMode' not in code:
    code = code.replace(
        "const [rankF,setRankF]=useState('All');",
        "const [rankF,setRankF]=useState('All');\n  const [rankMode,setRankMode]=useState('user');"
    )
    code = code.replace(
        'const [rankF, setRankF] = useState("All");',
        'const [rankF, setRankF] = useState("All");\n  const [rankMode, setRankMode] = useState("user");'
    )
    print("Added rankMode state")

# 3. Add proRanked computation
if 'proRanked' not in code:
    code = code.replace(
        "const ranked=[...allF]",
        "const proRanked=[...PRO_FIGHTERS].filter(f=>rankF==='All'||f.style===rankF).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));\n  const ranked=rankMode==='pro'?proRanked:[...allF]"
    )
    print("Added proRanked")

# 4. Fix session persistence
if 'fighter_v4' in code:
    code = code.replace(
        "const saved=localStorage.getItem('fighter_v4');",
        """const saved=localStorage.getItem('fighter_v4');
    if(!saved){setAuthReady(true);return;}"""
    )
    print("Fixed session check")

# 5. Add Duesseldorf gyms
if '"Duesseldorf"' not in code and '"Duesseldorf":' not in code:
    code = code.replace(
        '"Stuttgart":[',
        '"Duesseldorf":[\n    {name:"Triple One Gym",members:180,styles:["MMA","Boxing","Kickboxing"],rating:4.9,address:"Duesseldorf-Mitte",emoji:"1️⃣"},\n    {name:"UFD Gym",members:220,styles:["MMA","BJJ","Kickboxing","Boxing"],rating:4.8,address:"Koelner Str. 65",emoji:"🔥"},\n    {name:"PHP Gym",members:160,styles:["MMA","Muay Thai","Grappling"],rating:4.8,address:"Duesseldorf-Zentrum",emoji:"⚡"},\n    {name:"Muay Thai Zentrum",members:130,styles:["Muay Thai","Kickboxing","Boxing"],rating:4.7,address:"Bilk, Duesseldorf",emoji:"🥊"},\n    {name:"Capitol Fighters",members:150,styles:["Kickboxing","Boxing"],rating:4.7,address:"Bruchstr. 78",emoji:"🏛️"},\n  ],\n  "Stuttgart":['
    )
    print("Added Duesseldorf")
else:
    print("Duesseldorf already exists")

with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'w') as f:
    f.write(code)
print('ALL DONE!')
