with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'r') as f:
    code = f.read()

# Add gymRatings state
code = code.replace(
    "const [joined,setJoined]=useState({});",
    "const [joined,setJoined]=useState({});\n  const [gymRatings,setGymRatings]=useState(()=>{try{return JSON.parse(localStorage.getItem('gymRatings')||'{}')}catch{return {}}});\n  const [gymRatingInput,setGymRatingInput]=useState({});"
)

# Add rate gym function
code = code.replace(
    "function showMsg(text){",
    """function rateGym(gymKey, stars){
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
  }

  function showMsg(text){"""
)

# Replace the gyms tab with rated version
old_gyms = """        {tab==='gyms'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto',background:darkMode?'#0d0d0d':'transparent',minHeight:'100%'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:11}}>GYMS FINDEN</div>
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {Object.keys(GYMS).map(c=>(
                <button key={c} onClick={()=>setCity(c)}
                  style={{flexShrink:0,padding:'6px 13px',borderRadius:20,background:city===c?RED:'#fff',border:'1px solid '+(city===c?RED:'#e0e0e0'),color:city===c?'#fff':'#555',fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>
                  {c}
                </button>
              ))}
            </div>"""

new_gyms = """        {tab==='gyms'&&(
          <div style={{padding:'10px 13px 16px',maxWidth:420,margin:'0 auto',background:darkMode?'#0d0d0d':'transparent',minHeight:'100%'}}>
            <div className='rj' style={{color:darkMode?'#fff':'#1a1a1a',fontSize:22,letterSpacing:3,marginBottom:4}}>GYMS FINDEN</div>

            {/* TOP GYMS RANKING */}
            {(()=>{
              const allGyms=Object.entries(GYMS).flatMap(([city,gyms])=>gyms.map(g=>({...g,city})));
              const ranked=[...allGyms].map(g=>{
                const key=g.city+'-'+g.name;
                const r=gymRatings[key];
                const userCount=r?r.count:0;
                const userAvg=r&&r.count>0?r.total/r.count:0;
                const combinedRating=userCount>0?((g.rating*10+userAvg*userCount)/(10+userCount)):g.rating;
                return{...g,key,userCount,userAvg,combinedRating};
              }).sort((a,b)=>b.combinedRating-a.combinedRating||b.userCount-a.userCount).slice(0,5);
              return(
                <div style={{marginBottom:14}}>
                  <div className='rj' style={{color:darkMode?'#d4a017':'#d4a017',fontSize:13,letterSpacing:2,marginBottom:8}}>🏆 TOP GYMS</div>
                  {ranked.map((g,i)=>{
                    const colors=['#d4a017','#95a5a6','#cd7f32','#aaa','#aaa'];
                    const avg=g.userCount>0?g.userAvg:g.rating;
                    return(
                      <div key={g.key} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:darkMode?'#1a1a1a':'#fff',borderRadius:10,marginBottom:6,border:'1px solid '+(darkMode?'#2a2a2a':'#eee')}}>
                        <div className='rj' style={{color:colors[i],fontSize:20,width:28}}>#{i+1}</div>
                        <div style={{fontSize:22}}>{g.emoji}</div>
                        <div style={{flex:1}}>
                          <div style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:13}}>{g.name}</div>
                          <div style={{color:'#888',fontSize:10}}>📍 {g.city} · {g.userCount} Bewertungen</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:2}}>
                          <span style={{color:'#d4a017',fontSize:14}}>★</span>
                          <span style={{color:darkMode?'#fff':'#1a1a1a',fontWeight:700,fontSize:14}}>{avg.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:7,marginBottom:11}}>
              {Object.keys(GYMS).map(c=>(
                <button key={c} onClick={()=>setCity(c)}
                  style={{flexShrink:0,padding:'6px 13px',borderRadius:20,background:city===c?RED:(darkMode?'#1a1a1a':'#fff'),border:'1px solid '+(city===c?RED:(darkMode?'#333':'#e0e0e0')),color:city===c?'#fff':(darkMode?'#aaa':'#555'),fontFamily:'DM Sans,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>
                  {c}
                </button>
              ))}
            </div>"""

if old_gyms in code:
    code = code.replace(old_gyms, new_gyms)
    print("Added top gyms ranking!")
else:
    print("MISS - gyms tab")

# Add star rating to each gym card
old_gym_card_end = """                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}>
                    <div style={{height:'100%',width:((gym.rating-4)/1*100)+'%',background:`linear-gradient(90deg,${RED},#e67e22)`,borderRadius:2}}/>
                  </div>"""

new_gym_card_end = """                  <div style={{marginTop:6,height:3,background:'#f0f0f0',borderRadius:2}}>
                    <div style={{height:'100%',width:((gym.rating-4)/1*100)+'%',background:`linear-gradient(90deg,${RED},#e67e22)`,borderRadius:2}}/>
                  </div>
                  <div style={{marginTop:10,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0'),paddingTop:8}}>
                    <div style={{color:darkMode?'#aaa':'#888',fontSize:11,marginBottom:6}}>Bewerte dieses Gym:</div>
                    <div style={{display:'flex',gap:4,alignItems:'center'}}>
                      {[1,2,3,4,5].map(star=>{
                        const gymKey=city+'-'+gym.name;
                        const userRating=gymRatings[gymKey]?.userRating||0;
                        return(
                          <button key={star} onClick={()=>rateGym(gymKey,star)}
                            style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:star<=userRating?'#d4a017':'#ddd',transition:'all 0.1s',padding:'0 2px'}}>
                            ★
                          </button>
                        );
                      })}
                      {gymRatings[city+'-'+gym.name]?.count>0&&(
                        <span style={{color:darkMode?'#666':'#aaa',fontSize:10,marginLeft:4}}>
                          {gymRatings[city+'-'+gym.name].count} Bewertung{gymRatings[city+'-'+gym.name].count!==1?'en':''}
                        </span>
                      )}
                    </div>
                  </div>"""

if old_gym_card_end in code:
    code = code.replace(old_gym_card_end, new_gym_card_end)
    print("Added star rating to gym cards!")
else:
    print("MISS - gym card")

with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'w') as f:
    f.write(code)
print('Done!')
