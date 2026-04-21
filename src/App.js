import { useState, useEffect } from "react";

// --- KONFIGURATION ---
const SUPABASE_URL = "https://uykdrmymjvqgebsmndme.supabase.co";
const SUPABASE_KEY = "sb_publishable___XeJxD4-15c1dbNZPH9EQ_gKFNRoH5";

const SPORTS = [
  { id: "combat", name: "Kampfsport", icon: "🥊" },
  { id: "basketball", name: "Basketball", icon: "🏀" },
  { id: "tennis", name: "Tennis", icon: "🎾" }
];

const mockFighters = [
  { id: 1, name: "Kai Müller", age: 26, weightClass: "Weltergewicht", style: "Boxing", wins: 12, losses: 2, emoji: "🥊", accent: "#E03000" },
  { id: 2, name: "Marco Reyes", age: 29, weightClass: "Leichtgewicht", style: "MMA", wins: 18, losses: 4, emoji: "🥋", accent: "#00B4D8" },
  { id: 3, name: "Leon Braun", age: 24, weightClass: "Mittelgewicht", style: "Muay Thai", wins: 7, losses: 1, emoji: "🔥", accent: "#d97706" }
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f5f7; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
  .fr { font-family: 'Rajdhani', sans-serif !important; }
  .nav-active { color: #E03000; opacity: 1 !important; }
  .card { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
  input, select { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 10px; font-family: inherit; }
  .match-popup { position: fixed; inset: 0; background: rgba(224,48,0,0.95); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; animation: zoomIn 0.3s ease; }
  @keyframes zoomIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`;

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [tab, setTab] = useState("swipe");
  const [profile, setProfile] = useState({ name: "", age: "", city: "Berlin", style: "Boxing", weightClass: "Weltergewicht" });
  const [matches, setMatches] = useState([]);
  const [showMatch, setShowMatch] = useState(null);
  const [cards, setCards] = useState([...mockFighters]);
  const [activeSport, setActiveSport] = useState(SPORTS[0]);

  // Profil beim Start laden
  useEffect(() => {
    const savedProfile = localStorage.getItem("fighter_profile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
      setScreen("main");
    } else {
      setScreen("setup");
    }
  }, []);

  const saveProfile = () => {
    localStorage.setItem("fighter_profile", JSON.stringify(profile));
    setScreen("main");
    alert("Profil gespeichert!");
  };

  const handleSwipe = (dir, fighter) => {
    if (dir === "right") {
      // Simuliertes Matchmaking: 50% Chance
      if (Math.random() > 0.5) {
        setShowMatch(fighter);
        setMatches([...matches, fighter]);
      }
    }
    setCards(cards.filter(c => c.id !== fighter.id));
  };

  if (screen === "loading") return null;

  // --- SETUP / EDIT SCREEN ---
  if (screen === "setup" || (screen === "main" && tab === "profile")) {
    return (
      <div style={{ padding: "30px", minHeight: "100vh" }}>
        <style>{css}</style>
        <h1 className="fr" style={{ fontSize: "32px", marginBottom: "20px" }}>{screen === "setup" ? "PROFIL ERSTELLEN" : "PROFIL BEARBEITEN"}</h1>
        <div className="card">
          <label className="fr" style={{ fontSize: "12px", color: "#888" }}>NAME</label>
          <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Max Mustermann" />
          
          <label className="fr" style={{ fontSize: "12px", color: "#888", marginTop: "10px", display: "block" }}>STIL</label>
          <select value={profile.style} onChange={e => setProfile({ ...profile, style: e.target.value })}>
            <option>Boxing</option><option>MMA</option><option>Muay Thai</option>
          </select>

          <label className="fr" style={{ fontSize: "12px", color: "#888", marginTop: "10px", display: "block" }}>GEWICHTSKLASSE</label>
          <select value={profile.weightClass} onChange={e => setProfile({ ...profile, weightClass: e.target.value })}>
            <option>Leichtgewicht</option><option>Weltergewicht</option><option>Mittelgewicht</option><option>Schwergewicht</option>
          </select>

          <button onClick={saveProfile} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "#E03000", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700" }}>
            SPEICHERN & STARTEN
          </button>
          
          {screen === "main" && (
            <button onClick={() => setTab("swipe")} style={{ width: "100%", marginTop: "10px", padding: "10px", background: "none", color: "#888", border: "none" }}>Abbrechen</button>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>

      {/* Match Popup */}
      {showMatch && (
        <div className="match-popup" onClick={() => setShowMatch(null)}>
          <h1 className="fr" style={{ fontSize: "60px" }}>MATCH!</h1>
          <p style={{ fontSize: "20px", marginBottom: "30px" }}>Du und {showMatch.name} wollt kämpfen!</p>
          <div style={{ display: "flex", gap: "20px", fontSize: "50px" }}>
            <span>👤</span> <span>⚔️</span> <span>{showMatch.emoji}</span>
          </div>
          <button style={{ marginTop: "40px", padding: "15px 40px", borderRadius: "30px", border: "none", fontWeight: "700" }}>CHAT STARTEN</button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "15px 20px", background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="fr" style={{ letterSpacing: "3px" }}>FIGHTER</h2>
          <div style={{ display: "flex", gap: "10px" }}>
             {SPORTS.map(s => (
               <span key={s.id} onClick={() => setActiveSport(s)} style={{ cursor: "pointer", opacity: activeSport.id === s.id ? 1 : 0.3 }}>{s.icon}</span>
             ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px", position: "relative" }}>
        {tab === "swipe" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {cards.length > 0 ? (
              <div className="card" style={{ width: "100%", maxWidth: "340px", textAlign: "center", borderTop: `8px solid ${cards[cards.length-1].accent}` }}>
                <div style={{ fontSize: "80px" }}>{cards[cards.length-1].emoji}</div>
                <h2 className="fr" style={{ fontSize: "28px" }}>{cards[cards.length-1].name}</h2>
                <p style={{ color: "#E03000", fontWeight: "700" }}>{cards[cards.length-1].style} • {cards[cards.length-1].weightClass}</p>
                
                <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "30px" }}>
                  <button onClick={() => handleSwipe("left", cards[cards.length-1])} style={{ width: "65px", height: "65px", borderRadius: "50%", border: "2px solid #eee", background: "#fff", fontSize: "24px" }}>✕</button>
                  <button onClick={() => handleSwipe("right", cards[cards.length-1])} style={{ width: "65px", height: "65px", borderRadius: "50%", border: "none", background: "#E03000", color: "#fff", fontSize: "24px", boxShadow: "0 5px 15px rgba(224,48,0,0.3)" }}>⚔️</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginTop: "50px" }}>
                <p className="fr">Keine Gegner in deiner Nähe gefunden.</p>
                <button onClick={() => setCards([...mockFighters])} style={{ color: "#E03000", background: "none", border: "none", marginTop: "10px", fontWeight: "700" }}>Suche erweitern</button>
              </div>
            )}
          </div>
        )}

        {tab === "matches" && (
          <div className="fade-up">
            <h2 className="fr">DEINE MATCHES</h2>
            {matches.length > 0 ? matches.map(m => (
              <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
                <span style={{ fontSize: "30px" }}>{m.emoji}</span>
                <div style={{ flex: 1 }}><b className="fr">{m.name}</b><br/><small>{m.style}</small></div>
                <button style={{ padding: "8px 15px", borderRadius: "8px", border: "none", background: "#1a1a1a", color: "#fff", fontSize: "12px" }}>CHAT</button>
              </div>
            )) : <p style={{ color: "#888", marginTop: "20px" }}>Noch keine Matches. Geh swipen!</p>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ height: "75px", background: "#fff", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-around", alignItems: "center", paddingBottom: "10px" }}>
        <div onClick={() => setTab("swipe")} className={tab === "swipe" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.3 }}>
          <div style={{ fontSize: "22px" }}>🔥</div><div style={{ fontSize: "9px", fontWeight: "700" }}>FIGHT</div>
        </div>
        <div onClick={() => setTab("matches")} className={tab === "matches" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.3 }}>
          <div style={{ fontSize: "22px" }}>💬</div><div style={{ fontSize: "9px", fontWeight: "700" }}>MATCHES</div>
        </div>
        <div onClick={() => setTab("profile")} className={tab === "profile" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.3 }}>
          <div style={{ fontSize: "22px" }}>👤</div><div style={{ fontSize: "9px", fontWeight: "700" }}>PROFIL</div>
        </div>
      </div>
    </div>
  );
}
