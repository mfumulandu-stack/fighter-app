with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'r') as f:
    code = f.read()

# 1. Add gymRatings state if not exists
if 'gymRatings' not in code:
    code = code.replace(
        "const [joined,setJoined]=useState({});",
        "const [joined,setJoined]=useState({});\n  const [gymRatings,setGymRatings]=useState(()=>{try{return JSON.parse(localStorage.getItem('gymRatings')||'{}')}catch{return{}}});"
    )
    print("Added gymRatings state")
else:
    print("gymRatings already exists")

# 2. Add rateGym function if not exists
if 'rateGym' not in code:
    code = code.replace(
        "function showMsg(text){",
        """function rateGym(gymKey,stars){
    const nr={...gymRatings};
    if(!nr[gymKey])nr[gymKey]={total:0,count:0,mine:0};
    const old=nr[gymKey].mine||0;
    if(old>0){nr[gymKey].total-=old;nr[gymKey].count-=1;}
    nr[gymKey].total+=stars;nr[gymKey].count+=1;nr[gymKey].mine=stars;
    setGymRatings(nr);
    localStorage.setItem('gymRatings',JSON.stringify(nr));
    showMsg('Bewertung: '+('⭐'.repeat(stars)));
  }
  function showMsg(text){"""
    )
    print("Added rateGym function")
else:
    print("rateGym already exists")

# 3. Find the gyms tab and insert TOP GYMS + star ratings
# Find line with tab==='gyms'
idx = code.find("tab==='gyms'&&(")
if idx == -1:
    print("MISS gyms tab")
else:
    # Find the div after it
    div_start = code.find("<div style={{padding:'10px 13px 16px'", idx)
    # Find the title line
    title_end = code.find("GYMS FINDEN</div>", div_start) + len("GYMS FINDEN</div>")
    
    top_gyms = """
            {/* TOP GYMS */}
            <div style={{marginBottom:14}}>
              <div className='rj' style={{color:'#d4a017',fontSize:13,letterSpacing:2,marginBottom:8}}>🏆 TOP GYMS RANKING</div>
              {(()=>{
                const all=Object.entries(GYMS).flatMap(([ct,gs])=>gs.map(g=>({...g,ct})));
                return[...all].map(g=>{
                  const k=g.ct+'-'+g.name;
                  const r=gymRatings[k];
                  const avg=r&&r.count>0?r.total/r.count:g.rating;
                  const cnt=r?r.count:0;
                  return{...g,k,avg,cnt};
                }).sort((a,b)=>b.avg-a.avg||b.cnt-a.cnt).slice(0,5).map((g,i)=>{
                  const cols=['#d4a017','#95a5a6','#cd7f32','#aaa','#aaa'];
                  return(
                    <div key={g.k} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:darkMode?'#1a1a1a':'#fff',borderRadius:10,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                      <div className='rj' style={{color:cols[i],fontSize:20,width:28}}>#{i+1}</div>
                      <div style={{fontSize:20}}>{g.emoji}</div>
                      <div style={{flex:1}}>
                        <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{g.name}</div>
                        <div style={{color:'#888',fontSize:10}}>📍 {g.ct} · {g.cnt} Bewertungen</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:2}}>
                        <span style={{color:'#d4a017'}}>★</span>
                        <span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{g.avg.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
"""
    code = code[:title_end] + top_gyms + code[title_end:]
    print("Added TOP GYMS ranking!")

# 4. Add star rating to gym cards - find the rating bar in gym cards
old_bar = "background:`linear-gradient(90deg,${RED},#e67e22)`,borderRadius:2}}/>"
new_bar = """background:`linear-gradient(90deg,${RED},#e67e22)`,borderRadius:2}}/>
                  <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>
                    <div style={{color:darkMode?'#666':'#aaa',fontSize:10,marginBottom:4}}>Gym bewerten:</div>
                    <div style={{display:'flex',gap:2,alignItems:'center'}}>
                      {[1,2,3,4,5].map(star=>{
                        const k=city+'-'+gym.name;
                        const mine=gymRatings[k]?.mine||0;
                        return <button key={star} onClick={()=>rateGym(k,star)} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:star<=mine?'#d4a017':'#ddd',padding:'0 1px'}}>{star<=mine?'★':'☆'}</button>;
                      })}
                      {gymRatings[city+'-'+gym.name]?.count>0&&<span style={{color:'#aaa',fontSize:10,marginLeft:4}}>{gymRatings[city+'-'+gym.name].count} Bew.</span>}
                    </div>
                  </div>"""

if old_bar in code:
    code = code.replace(old_bar, new_bar, 1)
    print("Added star rating to gym cards!")
else:
    print("MISS gym card bar")

with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'w') as f:
    f.write(code)
print('ALL DONE!')
