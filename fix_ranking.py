with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'r') as f:
    code = f.read()

# Fix ranking name color
code = code.replace(
    "color:f.isMe?RED:'#1a1a1a',fontWeight:700,fontSize:13}}>{f.name}",
    "color:f.isMe?RED:(darkMode?'#fff':'#1a1a1a'),fontWeight:700,fontSize:13}}>{f.name}"
)

# Fix ranking podium name color  
code = code.replace(
    "color:f.isMe?RED:'#1a1a1a',fontSize:11,fontWeight:700,textAlign:'center'}}>{f.name?.split(' ')[0]}",
    "color:f.isMe?RED:(darkMode?'#fff':'#1a1a1a'),fontSize:11,fontWeight:700,textAlign:'center'}}>{f.name?.split(' ')[0]}"
)

# Fix allF - remove PRO_FIGHTERS from swipe cards (keep only demo FIGHTERS)
# Make sure ranked allF only uses real user profiles, not PRO_FIGHTERS
code = code.replace(
    "const ranked=rankMode==='pro'?proRanked:[...allF].filter(f=>rankF==='All'||f.style===rankF).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));",
    "const userOnly=profile.name?[{id:0,name:profile.name,age:profile.age,city:profile.city,gym:profile.gym,weightClass:profile.weightClass,style:profile.style,wins:stats.wins,losses:stats.losses,draws:stats.draws,ko:stats.ko,emoji:'🥊',accent:RED,isMe:true,avatarUrl}].concat(dbMatches.map(m=>m.profile_a_id===myProfile?.id?m.profile_b:m.profile_a).filter(Boolean)):[];\n  const ranked=rankMode==='pro'?proRanked:[...userOnly].filter(f=>rankF==='All'||f.style===rankF).sort((a,b)=>(b.wins*3-b.losses*2+b.draws)-(a.wins*3-a.losses*2+a.draws));"
)

print("Fixed!")

with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'w') as f:
    f.write(code)
print('Done!')
