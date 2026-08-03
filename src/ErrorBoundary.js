// Die Absturz-Schutzhuelle um die gesamte App.
//
// Faengt Fehler beim Darstellen ab und zeigt statt eines schwarzen
// Bildschirms den "KURZE PAUSE"-Hinweis mit Neu-laden-Knopf.
//
// Bewusst als eigene Datei ausgelagert.
//
// WICHTIG FUER KUENFTIGE AENDERUNGEN: Hier drin darf NICHTS verwendet
// werden, das ausserhalb dieser Klasse lebt (z.B. appLang). Genau das
// hatte schon einmal dazu gefuehrt, dass die Schutzhuelle SELBST
// abstuerzte - und der Nutzer nur einen schwarzen Bildschirm sah.
// Die Sprache kommt deshalb aus navigator.language.

import React from "react";

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
          {/* Browser-Sprache statt appLang: appLang existiert in dieser Klasse nicht —
              der Zugriff darauf ließ den Notfallbildschirm selbst abstürzen,
              sodass statt "KURZE PAUSE" nur ein schwarzer Bildschirm erschien */}
          <div style={{color:'#aaa',fontSize:13,textAlign:'center',marginBottom:24,lineHeight:1.6}}>{(navigator.language||'').startsWith('fr')?'Quelque chose a mal tourné. Rechargez l\'application.':(navigator.language||'').startsWith('en')?'Something went wrong. Please reload the app.':'Etwas ist schiefgelaufen. Bitte lade die App neu.'}</div>
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

export default ErrorBoundary;
