with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'r') as f:
    code = f.read()

# Add agb state alongside privacy state
code = code.replace(
    "const [privacy,setPrivacy]=useState(false);",
    "const [privacy,setPrivacy]=useState(false);\n  const [agbAccepted,setAgbAccepted]=useState(false);"
)

# Add AGB check in submit function
code = code.replace(
    "if(mode==='register'&&!privacy){setErr('Bitte Datenschutzhinweis akzeptieren');return;}",
    "if(mode==='register'&&!privacy){setErr('Bitte Datenschutzhinweis akzeptieren');return;}\n    if(mode==='register'&&!agbAccepted){setErr('Bitte AGB akzeptieren');return;}"
)

# Add AGB checkbox after privacy checkbox
code = code.replace(
    """          {mode==='register'&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:12}}>
              <input type='checkbox' checked={privacy} onChange={e=>setPrivacy(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer'}}/>
              <div style={{color:'#888',fontSize:11,lineHeight:1.4}}>Ich stimme zu, dass meine Daten (Name, Kampfstil, Standort, Foto) gespeichert und anderen Nutzern angezeigt werden. Die Daten werden ausschließlich für die Fighter-App verwendet.</div>
            </div>
          )}""",
    """          {mode==='register'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' checked={privacy} onChange={e=>setPrivacy(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <div style={{color:'#888',fontSize:11,lineHeight:1.4}}>Ich stimme zu, dass meine Daten (Name, Kampfstil, Standort, Foto) gespeichert werden. Weitere Infos in der <span onClick={()=>setShowDatenschutz(true)} style={{color:RED,cursor:'pointer',textDecoration:'underline'}}>Datenschutzerklärung</span>.</div>
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <input type='checkbox' checked={agbAccepted} onChange={e=>setAgbAccepted(e.target.checked)} style={{marginTop:2,accentColor:RED,width:16,height:16,cursor:'pointer',flexShrink:0}}/>
                <div style={{color:'#888',fontSize:11,lineHeight:1.4}}>Ich habe die <span onClick={()=>setShowAGB(true)} style={{color:RED,cursor:'pointer',textDecoration:'underline'}}>AGB</span> gelesen und akzeptiere sie.</div>
              </div>
            </div>
          )}"""
)

with open('/Users/juniormfumu/Downloads/fighter-app/src/App.js', 'w') as f:
    f.write(code)
print('Done!')
