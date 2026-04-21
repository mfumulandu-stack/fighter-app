import { useState, useEffect } from "react";

// --- KONFIGURATION & API ---
const SUPABASE_URL = "https://uykdrmymjvqgebsmndme.supabase.co";
const SUPABASE_KEY = "sb_publishable___XeJxD4-15c1dbNZPH9EQ_gKFNRoH5";

const supabase = {
  async from(table) {
    return {
      async insert(data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=representation" },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      },
      async select(id) {
        const url = id ? `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}` : `${SUPABASE_URL}/rest/v1/${table}`;
        const res = await fetch(url, { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } });
        const json = await res.json();
        return { data: json, error: res.ok ? null : json };
      }
    };
  }
};

// --- DATEN ---
const FIGHT_STYLES = ["Boxing", "Kickboxing", "MMA", "Muay Thai", "BJJ", "Wrestling"];
const CITIES = ["Berlin", "München", "Hamburg", "Köln", "Frankfurt"];

const mockFighters = [
  { id: 1, name: "Kai Müller", wins: 12, losses: 2, style: "Boxing", emoji: "🥊", city: "Berlin" },
  { id: 2, name: "Marco Reyes", wins: 18, losses: 4, style: "MMA", emoji: "🥋", city: "München" },
  { id: 3, name: "Leon Braun", wins: 7, losses: 1, style: "Muay Thai", emoji: "🔥", city: "Hamburg" },
  { id: 4, name: "Tomas Vega", wins: 22, losses: 6, style: "Kickboxing", emoji: "💥", city: "Köln" },
];

const gymsData = {
  "Berlin": [{ name: "Tiger Gym", style: "Boxing", rating: 4.8, emoji: "🐯" }, { name: "Berlin FC", style: "MMA", rating: 4.9, emoji: "⚔️" }],
  "München": [{ name: "Combat Base", style: "BJJ", rating: 4.7, emoji: "🦁" }],
  "Hamburg": [{ name: "Iron Fist", style: "Muay Thai", rating: 4.6, emoji: "✊" }],
  "Köln": [{ name: "Warriors Gym", style: "Kickboxing", rating: 4.7, emoji: "⚡" }],
  "Frankfurt": [{ name: "Apex Center", style: "MMA", rating: 4.9, emoji: "🔺" }]
};

const trainersData = [
  { name: "Freddie Roach", style: "Boxing", gym: "Wild Card", rating: "9.8", emoji: "🥊" },
  { name: "Firas Zahabi", style: "MMA", gym: "Tristar", rating: "9.7", emoji: "🎯" },
  { name: "Rafael Cordeiro", style: "Muay Thai", gym: "Kings MMA", rating: "9.6", emoji: "🔥" }
];

const sportsEvents = [
  { title: "Sparring Night", location: "Berlin", time: "Sa, 18:00", icon: "🥊" },
  { title: "Open Mat BJJ", location: "München", time: "So, 11:00", icon: "🥋" },
  { title: "Outdoor Pad Work", location: "Hamburg", time: "Fr, 17:00", icon: "🏃" }
];

// --- STYLES ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f5f7; font-family: 'DM Sans', sans-serif; color: #1a1a1a; }
  .fr { font-family: 'Rajdhani', sans-serif !important; font-weight: 700; }
  .card-shadow { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .fade-in { animation: fadeIn 0.3s ease-in; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  input, select { width: 100%; padding: 12px; margin-top: 5px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
  label { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; }
`;

// --- HAUPT-KOMPONENTE ---
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [tab, setTab] = useState("swipe");
  const [profile, setProfile] = useState({ name: "", city: "Berlin", style: "Boxing" });
  const [cards, setCards] = useState([...mockFighters]);
  const [swipeStats, setSwipeStats] = useState({ yes: 0, no: 0 });

  useEffect(() => {
    const saved = localStorage.getItem("fighter_profile");
    if (saved) {
      setProfile(JSON.parse(saved));
      setScreen("main");
    }
  }, []);

  const handleFinishSetup = () => {
    if (profile.name) {
      localStorage.setItem("fighter_profile", JSON.stringify(profile));
      setScreen("main");
    }
  };

  const handleSwipe = (dir) => {
    if (dir === "yes") setSwipeStats(s => ({ ...s, yes: s.yes + 1 }));
    else setSwipeStats(s => ({ ...s, no: s.no + 1 }));
    setCards(prev => prev.slice(0, -1));
  };

  // --- RENDERING SCREENS ---
  if (screen === "setup") return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <style>{css}</style>
      <h1 className="fr" style={{ fontSize: "40px", marginBottom: "20px" }}>FIGHTER SETUP</h1>
      <div style={{ textAlign: "left", maxWidth: "400px", margin: "0 auto" }}>
        <label>Dein Name</label>
        <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="z.B. Max Power" />
        <div style={{ marginTop: "15px" }}>
          <label>Deine Stadt</label>
          <select value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginTop: "15px" }}>
          <label>Kampfstil</label>
          <select value={profile.style} onChange={e => setProfile({ ...profile, style: e.target.value })}>
            {FIGHT_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={handleFinishSetup} style={{ width: "100%", marginTop: "30px", padding: "15px", background: "#E03000", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700" }}>PROFIL ERSTELLEN</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>
      
      {/* Header */}
      <div style={{ padding: "15px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#888", fontSize: "12px" }}>✕ {swipeStats.no}</span>
        <h2 className="fr" style={{ letterSpacing: "3px" }}>FIGHTER</h2>
        <span style={{ color: "#E03000", fontSize: "12px" }}>⚔ {swipeStats.yes}</span>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        {tab === "swipe" && (
          <div className="fade-in" style={{ textAlign: "center" }}>
            {cards.length > 0 ? (
              <div className="card-shadow" style={{ background: "#fff", borderRadius: "20px", padding: "30px", maxWidth: "340px", margin: "0 auto" }}>
                <div style={{ fontSize: "80px" }}>{cards[cards.length - 1].emoji}</div>
                <h2 className="fr">{cards[cards.length - 1].name}</h2>
                <p style={{ color: "#E03000", fontWeight: "700" }}>{cards[cards.length - 1].style}</p>
                <p style={{ fontSize: "14px", color: "#888" }}>{cards[cards.length - 1].city}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "30px" }}>
                  <button onClick={() => handleSwipe("no")} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid #ddd", background: "none", fontSize: "24px" }}>✕</button>
                  <button onClick={() => handleSwipe("yes")} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "none", background: "#16a34a", color: "#fff", fontSize: "24px" }}>⚔</button>
                </div>
              </div>
            ) : <p className="fr">KEINE WEITEREN KÄMPFER</p>}
          </div>
        )}

        {tab === "gyms" && (
          <div className="fade-in">
            <h2 className="fr" style={{ marginBottom: "15px" }}>GYMS IN {profile.city.toUpperCase()}</h2>
            {gymsData[profile.city]?.map(gym => (
              <div key={gym.name} className="card-shadow" style={{ background: "#fff", padding: "15px", borderRadius: "12px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ fontSize: "30px" }}>{gym.emoji}</span>
                <div>
                  <div style={{ fontWeight: "700" }}>{gym.name}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>{gym.style} • ⭐ {gym.rating}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "ranking" && (
          <div className="fade-in">
            <h2 className="fr" style={{ marginBottom: "15px" }}>LEADERBOARD</h2>
            {[...mockFighters, { name: profile.name, wins: 0, losses: 0 }].sort((a, b) => b.wins - a.wins).map((f, i) => (
              <div key={i} style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                <span><b style={{ color: "#E03000" }}>#{i + 1}</b> {f.name}</span>
                <span className="fr">{f.wins}W - {f.losses}L</span>
              </div>
            ))}
          </div>
        )}

        {tab === "trainer" && (
          <div className="fade-in">
            <h2 className="fr" style={{ marginBottom: "15px" }}>TOP COACHES</h2>
            {trainersData.map(t => (
              <div key={t.name} className="card-shadow" style={{ background: "#fff", padding: "15px", borderRadius: "12px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: "700" }}>{t.name}</div>
                  <div style={{ fontSize: "12px", color: "#E03000" }}>{t.style} • {t.gym}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "20px" }}>{t.emoji}</div>
                  <div style={{ fontSize: "10px", fontWeight: "700" }}>⭐ {t.rating}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "sports" && (
          <div className="fade-in">
            <h2 className="fr" style={{ marginBottom: "15px" }}>EVENTS</h2>
            {sportsEvents.map((ev, i) => (
              <div key={i} className="card-shadow" style={{ background: "#fff", padding: "15px", borderRadius: "12px", marginBottom: "12px", display: "flex", gap: "15px", alignItems: "center" }}>
                <div style={{ fontSize: "30px" }}>{ev.icon}</div>
                <div>
                  <div style={{ fontWeight: "700" }}>{ev.title}</div>
                  <div style={{ fontSize: "12px", color: "#888" }}>{ev.location} • {ev.time}</div>
                </div>
                <button style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: "5px", border: "1px solid #E03000", color: "#E03000", background: "none", fontSize: "10px", fontWeight: "700" }}>JOIN</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ height: "75px", background: "#fff", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-around", alignItems: "center", paddingBottom: "15px" }}>
        {[["swipe", "FIGHT", "🔥"], ["gyms", "GYMS", "🏋️"], ["ranking", "RANG", "🏆"], ["trainer", "COACH", "🎓"], ["sports", "EVENT", "🎯"]].map(([id, label, icon]) => (
          <div key={id} onClick={() => setTab(id)} style={{ textAlign: "center", cursor: "pointer", opacity: tab === id ? 1 : 0.3, transition: "0.2s" }}>
            <div style={{ fontSize: "22px" }}>{icon}</div>
            <div style={{ fontSize: "9px", fontWeight: "700", marginTop: "2px" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
