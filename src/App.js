import { useState, useEffect } from "react";

// --- API & DB SETUP ---
const SUPABASE_URL = "https://uykdrmymjvqgebsmndme.supabase.co";
const SUPABASE_KEY = "sb_publishable___XeJxD4-15c1dbNZPH9EQ_gKFNRoH5";

// --- DATEN & MOCKS ---
const SPORTS = [
  { id: "combat", name: "Kampfsport", icon: "🥊" },
  { id: "basketball", name: "Basketball", icon: "🏀" },
  { id: "tennis", name: "Tennis", icon: "🎾" },
  { id: "football", name: "Fußball", icon: "⚽" }
];

const mockGyms = [
  { id: 1, name: "Tiger Gym Berlin", city: "Berlin", dist: 1.2, rating: 4.8, reviews: 124, emoji: "🐯", desc: "Berlins Top-Adresse für Muay Thai und K1. Große Sparringsfläche und Profi-Equipment.", tags: ["Muay Thai", "Boxing"] },
  { id: 2, name: "Combat Base", city: "Berlin", dist: 3.5, rating: 4.5, reviews: 89, emoji: "🦁", desc: "Fokus auf BJJ und Grappling. Familiäre Atmosphäre und Schwarzgurt-Trainer.", tags: ["BJJ", "Grappling"] },
  { id: 3, name: "Peak Performance", city: "Berlin", dist: 5.1, rating: 4.2, reviews: 45, emoji: "🔺", desc: "Modernes MMA Center mit Kraftraum und Sauna.", tags: ["MMA", "Wrestling"] }
];

const mockCourts = {
  basketball: [{ id: 1, name: "Mauerpark Court", dist: 0.8, players: 6, icon: "🏀", desc: "Legendärer Streetball-Court. Immer was los." }],
  tennis: [{ id: 1, name: "TC Blau-Weiß", dist: 2.4, players: 2, icon: "🎾", desc: "Gepflegte Sandplätze. Gastspieler willkommen." }]
};

const mockTrainers = [
  { id: 1, name: "Coach Mike", style: "Boxing", rating: 4.9, points: 2450, emoji: "🧔", gym: "Tiger Gym" },
  { id: 2, name: "Sarah 'The Kick'", style: "Muay Thai", rating: 4.8, points: 2100, emoji: "👩‍🦰", gym: "Peak Performance" },
  { id: 3, name: "Igor BJJ", style: "Grappling", rating: 4.7, points: 1950, emoji: "🧔‍♂️", gym: "Combat Base" }
];

// --- STYLES ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f5f7; font-family: 'DM Sans', sans-serif; }
  .fr { font-family: 'Rajdhani', sans-serif !important; }
  .card-glow { background: #fff; border-radius: 18px; padding: 15px; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: 0.2s; cursor: pointer; }
  .card-glow:active { transform: scale(0.98); }
  .nav-btn { text-align: center; opacity: 0.3; transition: 0.2s; flex: 1; }
  .nav-active { opacity: 1; color: #E03000; }
  .tag { background: #E0300010; color: #E03000; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; align-items: flex-end; }
  .modal-content { background: #fff; width: 100%; border-radius: 25px 25px 0 0; padding: 30px; animation: slideUp 0.3s ease-out; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
`;

export default function App() {
  const [tab, setTab] = useState("swipe");
  const [activeSport, setActiveSport] = useState(SPORTS[0]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [myRating, setMyRating] = useState(0);

  // --- RENDERING ---
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>

      {/* Header mit Sportart-Auswahl */}
      <div style={{ background: "#fff", padding: "15px 20px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h1 className="fr" style={{ fontSize: "24px", letterSpacing: "3px" }}>FIGHTER</h1>
          <div style={{ background: "#f0f0f0", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>Berlin, 10405</div>
        </div>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "5px" }}>
          {SPORTS.map(s => (
            <button key={s.id} onClick={() => setActiveSport(s)} style={{ 
              whiteSpace: "nowrap", padding: "8px 16px", borderRadius: "12px", border: "none", 
              background: activeSport.id === s.id ? "#E03000" : "#fff", 
              color: activeSport.id === s.id ? "#fff" : "#666",
              fontWeight: "700", boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
            }}>
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto", paddingBottom: "100px" }}>
        
        {/* REITER: GYMS & COURTS */}
        {tab === "gyms" && (
          <div className="fade-up">
            <h2 className="fr" style={{ marginBottom: "15px" }}>{activeSport.id === "combat" ? "GYMS" : "COURTS"} IN DER NÄHE</h2>
            {(activeSport.id === "combat" ? mockGyms : (mockCourts[activeSport.id] || [])).map(item => (
              <div key={item.id} className="card-glow" onClick={() => setSelectedGym(item)}>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  <div style={{ fontSize: "32px" }}>{item.emoji || item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "700" }}>{item.name}</div>
                    <div style={{ fontSize: "11px", color: "#888" }}>📍 {item.dist} km entfernt</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#16a34a", fontWeight: "700" }}>⭐ {item.rating || "New"}</div>
                    <div style={{ fontSize: "10px", color: "#aaa" }}>{item.reviews || 0} Bewertungen</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REITER: RANKING (Coaches & Kämpfer) */}
        {tab === "ranking" && (
          <div className="fade-up">
            <h2 className="fr" style={{ marginBottom: "15px" }}>COACH RANKING</h2>
            {mockTrainers.sort((a,b) => b.points - a.points).map((t, i) => (
              <div key={t.id} className="card-glow" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div className="fr" style={{ fontSize: "20px", color: i === 0 ? "#FFD700" : "#ccc", width: "25px" }}>#{i+1}</div>
                <div style={{ fontSize: "28px" }}>{t.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700" }}>{t.name}</div>
                  <div style={{ fontSize: "11px", color: "#E03000" }}>{t.style} • {t.gym}</div>
                </div>
                <div className="fr" style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px" }}>{t.points} PTS</div>
                  <div style={{ fontSize: "10px", color: "#16a34a" }}>⭐ {t.rating}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REITER: EVENTS (Open Mats & Court Games) */}
        {tab === "sports" && (
          <div className="fade-up">
            <h2 className="fr" style={{ marginBottom: "15px" }}>{activeSport.name} EVENTS</h2>
            <div className="card-glow" style={{ borderLeft: "4px solid #E03000" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b style={{ fontSize: "14px" }}>{activeSport.id === "combat" ? "Open Mat Sparring" : "Community Game"}</b>
                <span className="tag">HEUTE</span>
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>Tiger Gym Berlin • 18:30 Uhr</div>
              <button style={{ width: "100%", marginTop: "15px", padding: "10px", background: "#E03000", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px" }}>JETZT ANMELDEN</button>
            </div>
          </div>
        )}
      </div>

      {/* GYM DETAIL MODAL */}
      {selectedGym && (
        <div className="modal" onClick={() => setSelectedGym(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 className="fr" style={{ fontSize: "28px" }}>{selectedGym.name}</h2>
                <div style={{ color: "#E03000", fontWeight: "700", fontSize: "14px" }}>{selectedGym.dist} km entfernt</div>
              </div>
              <div style={{ fontSize: "40px" }}>{selectedGym.emoji || selectedGym.icon}</div>
            </div>
            <p style={{ marginTop: "15px", color: "#666", lineHeight: "1.5" }}>{selectedGym.desc}</p>
            
            <div style={{ marginTop: "25px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
              <div className="fr" style={{ fontSize: "16px", marginBottom: "10px" }}>GYM BEWERTEN</div>
              <div style={{ display: "flex", gap: "10px" }}>
                {[1,2,3,4,5].map(star => (
                  <span key={star} onClick={() => setMyRating(star)} style={{ fontSize: "30px", cursor: "pointer", color: star <= myRating ? "#FFD700" : "#ddd" }}>★</span>
                ))}
              </div>
              <button onClick={() => setSelectedGym(null)} style={{ width: "100%", marginTop: "25px", padding: "15px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700" }}>BEWERTUNG ABSCHICKEN</button>
            </div>
          </div>
        </div>
      )}

      {/* Nav-Bar */}
      <div style={{ height: "80px", background: "#fff", borderTop: "1px solid #eee", display: "flex", alignItems: "center", position: "fixed", bottom: 0, width: "100%", paddingBottom: "15px" }}>
        <div className={`nav-btn ${tab === "gyms" ? "nav-active" : ""}`} onClick={() => setTab("gyms")}>
          <div style={{ fontSize: "22px" }}>📍</div>
          <div style={{ fontSize: "9px", fontWeight: "700" }}>{activeSport.id === "combat" ? "GYMS" : "COURTS"}</div>
        </div>
        <div className={`nav-btn ${tab === "ranking" ? "nav-active" : ""}`} onClick={() => setTab("ranking")}>
          <div style={{ fontSize: "22px" }}>🏆</div>
          <div style={{ fontSize: "9px", fontWeight: "700" }}>RANKING</div>
        </div>
        <div className={`nav-btn ${tab === "swipe" ? "nav-active" : ""}`} onClick={() => setTab("swipe")}>
          <div style={{ fontSize: "32px" }}>🔥</div>
        </div>
        <div className={`nav-btn ${tab === "sports" ? "nav-active" : ""}`} onClick={() => setTab("sports")}>
          <div style={{ fontSize: "22px" }}>🎯</div>
          <div style={{ fontSize: "9px", fontWeight: "700" }}>EVENTS</div>
        </div>
        <div className={`nav-btn ${tab === "profile" ? "nav-active" : ""}`} onClick={() => setTab("profile")}>
          <div style={{ fontSize: "22px" }}>👤</div>
          <div style={{ fontSize: "9px", fontWeight: "700" }}>PROFIL</div>
        </div>
      </div>
    </div>
  );
}
