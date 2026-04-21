import { useState, useEffect } from "react";

// --- KONFIGURATION (Supabase) ---
const SUPABASE_URL = "https://uykdrmymjvqgebsmndme.supabase.co";
const SUPABASE_KEY = "sb_publishable___XeJxD4-15c1dbNZPH9EQ_gKFNRoH5";

// API Hilfsfunktionen
const supabaseFetch = async (endpoint, method = "GET", body = null) => {
  const options = {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
  return res.json();
};

// --- DATEN-STRUKTUREN ---
const SPORTS = [
  { id: "combat", name: "Kampfsport", icon: "🥊" },
  { id: "basketball", name: "Basketball", icon: "🏀" },
  { id: "tennis", name: "Tennis", icon: "🎾" }
];

const mockGyms = [
  { id: 1, name: "Tiger Gym Berlin", dist: 1.2, rating: 4.8, emoji: "🐯", desc: "Profi-Muay Thai & Boxen.", sport: "combat" },
  { id: 2, name: "Mauerpark Court", dist: 0.8, rating: 4.5, emoji: "🏀", desc: "Streetball Community.", sport: "basketball" }
];

// --- STYLES ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
  .fr { font-family: 'Rajdhani', sans-serif !important; font-weight: 700; }
  body { background: #f5f5f7; color: #1a1a1a; }
  .card-glow { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.06); }
  .nav-active { color: #E03000; opacity: 1 !important; }
  .btn-primary { background: #E03000; color: #fff; border: none; padding: 15px; border-radius: 12px; font-weight: 700; cursor: pointer; width: 100%; }
  input, select, textarea { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 10px; font-size: 16px; }
  .swipe-card { width: 100%; max-width: 340px; height: 450px; background: #fff; border-radius: 25px; position: relative; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: flex-end; }
  .modal-content { background: #fff; width: 100%; border-radius: 25px 25px 0 0; padding: 30px; max-height: 90vh; overflow-y: auto; }
`;

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [tab, setTab] = useState("swipe");
  const [activeSport, setActiveSport] = useState(SPORTS[0]);
  const [profile, setProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [myRating, setMyRating] = useState(0);

  // 1. Profil & Nutzer laden
  useEffect(() => {
    async function init() {
      const savedId = localStorage.getItem("my_fighter_id");
      if (savedId) {
        const data = await supabaseFetch(`profiles?id=eq.${savedId}`);
        if (data && data[0]) setProfile(data[0]);
      }
      const users = await supabaseFetch("profiles");
      if (Array.isArray(users)) setAllUsers(users.filter(u => u.id != savedId));
      setScreen(savedId ? "main" : "setup");
    }
    init();
  }, []);

  // 2. Profil speichern & Bild-Upload simulieren
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProfile = {
      name: formData.get("name"),
      age: formData.get("age"),
      city: formData.get("city"),
      style: formData.get("style"),
      weightClass: formData.get("weightClass"),
      avatar_url: "👤" // Hier könnte echter Storage-Upload-Pfad stehen
    };

    const result = await supabaseFetch("profiles", "POST", newProfile);
    if (result && result[0]) {
      localStorage.setItem("my_fighter_id", result[0].id);
      setProfile(result[0]);
      setScreen("main");
    }
  };

  // 3. Matchmaking
  const handleLike = async (targetId) => {
    await supabaseFetch("matches", "POST", {
      from_id: profile.id,
      to_id: targetId,
      status: "pending"
    });
    setAllUsers(allUsers.filter(u => u.id !== targetId));
    // Check if back-match exists
    const backMatch = await supabaseFetch(`matches?from_id=eq.${targetId}&to_id=eq.${profile.id}`);
    if (backMatch && backMatch.length > 0) {
      alert("ITS A MATCH! ⚔️");
    }
  };

  if (screen === "loading") return <div className="fr" style={{ padding: 50 }}>LOADING...</div>;

  // --- SETUP SCREEN ---
  if (screen === "setup") return (
    <div style={{ padding: 30 }}>
      <style>{css}</style>
      <h1 className="fr" style={{ fontSize: 32 }}>ERSTELLE DEIN PROFIL</h1>
      <form onSubmit={handleSaveProfile} style={{ marginTop: 20 }}>
        <input name="name" placeholder="Name" required />
        <input name="age" type="number" placeholder="Alter" required />
        <input name="city" placeholder="Stadt (z.B. Berlin)" required />
        <select name="style">
          {SPORTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input name="weightClass" placeholder="Gewichtsklasse" />
        <p style={{ fontSize: 11, color: "#888", margin: "10px 0" }}>Profilbild-Upload (Storage aktiv)</p>
        <input type="file" accept="image/*" />
        <button className="btn-primary" type="submit">STARTEN</button>
      </form>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: "#fff", padding: "15px 20px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h1 className="fr" style={{ fontSize: 24, letterSpacing: 3 }}>FIGHTER</h1>
          <div style={{ background: "#f0f0f0", padding: "4px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{profile?.city}</div>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
          {SPORTS.map(s => (
            <button key={s.id} onClick={() => setActiveSport(s)} style={{
              padding: "8px 15px", borderRadius: 10, border: "none",
              background: activeSport.id === s.id ? "#E03000" : "#fff",
              color: activeSport.id === s.id ? "#fff" : "#666", fontWeight: 700
            }}>{s.icon} {s.name}</button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto", paddingBottom: 100 }}>
        {tab === "swipe" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {allUsers.length > 0 ? (
              <div className="swipe-card">
                <div style={{ height: "60%", background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>
                  {allUsers[0].avatar_url || "👤"}
                </div>
                <div style={{ padding: 20 }}>
                  <h2 className="fr">{allUsers[0].name}, {allUsers[0].age}</h2>
                  <p style={{ color: "#E03000", fontWeight: 700 }}>{allUsers[0].style} • {allUsers[0].weightClass}</p>
                  <div style={{ display: "flex", gap: 15, marginTop: 20 }}>
                    <button onClick={() => setAllUsers(allUsers.slice(1))} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>✕</button>
                    <button onClick={() => handleLike(allUsers[0].id)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#E03000", color: "#fff", fontWeight: 700 }}>⚔️ FIGHT</button>
                  </div>
                </div>
              </div>
            ) : <p className="fr">KEINE NEUEN GEGNER</p>}
          </div>
        )}

        {tab === "gyms" && (
          <div>
            <h2 className="fr" style={{ marginBottom: 15 }}>{activeSport.id === "combat" ? "GYMS" : "COURTS"} IN DER NÄHE</h2>
            {mockGyms.filter(g => g.sport === activeSport.id).map(g => (
              <div key={g.id} className="card-glow" onClick={() => setSelectedItem(g)} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{g.emoji} {g.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>📍 {g.dist} km entfernt</div>
                </div>
                <div style={{ color: "#16a34a", fontWeight: 700 }}>⭐ {g.rating}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "ranking" && (
          <div>
            <h2 className="fr">RANKING</h2>
            {allUsers.concat(profile).sort((a,b) => (b.wins || 0) - (a.wins || 0)).map((u, i) => (
              <div key={i} style={{ padding: 15, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                <span><b style={{ color: "#E03000" }}>#{i+1}</b> {u.name}</span>
                <span className="fr">{u.wins || 0}W - {u.losses || 0}L</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="fr" style={{ fontSize: 28 }}>{selectedItem.name}</h2>
            <p style={{ margin: "15px 0", color: "#666" }}>{selectedItem.desc}</p>
            <div className="fr" style={{ fontSize: 14 }}>BEWERTEN:</div>
            <div style={{ display: "flex", gap: 10, margin: "10px 0" }}>
              {[1,2,3,4,5].map(s => <span key={s} onClick={() => setMyRating(s)} style={{ fontSize: 30, color: s <= myRating ? "#FFD700" : "#ddd" }}>★</span>)}
            </div>
            <button className="btn-primary" onClick={() => setSelectedItem(null)}>SPEICHERN</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ height: 80, background: "#fff", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-around", alignItems: "center", position: "fixed", bottom: 0, width: "100%", paddingBottom: 15 }}>
        <div onClick={() => setTab("gyms")} className={tab === "gyms" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.4 }}>📍<div style={{ fontSize: 9, fontWeight: 700 }}>LOCATIONS</div></div>
        <div onClick={() => setTab("ranking")} className={tab === "ranking" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.4 }}>🏆<div style={{ fontSize: 9, fontWeight: 700 }}>RANKING</div></div>
        <div onClick={() => setTab("swipe")} className={tab === "swipe" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.4, fontSize: 30 }}>🔥</div>
        <div onClick={() => setTab("matches")} className={tab === "matches" ? "nav-active" : ""} style={{ textAlign: "center", opacity: 0.4 }}>💬<div style={{ fontSize: 9, fontWeight: 700 }}>MATCHES</div></div>
        <div onClick={() => setScreen("setup")} style={{ textAlign: "center", opacity: 0.4 }}>👤<div style={{ fontSize: 9, fontWeight: 700 }}>PROFIL</div></div>
      </div>
    </div>
  );
}
