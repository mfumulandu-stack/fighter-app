import { useState } from 'react';
import { RED, LIGHT_RED } from './constants';

const STEPS = [
  { emoji: '🥊', title: 'WILLKOMMEN BEI FIGHTER', text: 'Kurz gezeigt, wie alles funktioniert — dauert nur eine Minute.' },
  { emoji: '👊', title: 'FIGHT', text: 'Swipe durch Kampfsportler in deiner Nähe und finde passende Sparringspartner — nach Stil, Gewichtsklasse und Erfahrung gefiltert.' },
  { emoji: '💬', title: 'CHAT', text: 'Sobald ihr euch matcht, könnt ihr direkt chatten und ein Training ausmachen.' },
  { emoji: '🏆', title: 'RANG', text: 'Verfolge deine Platzierung in der Rangliste und bewerte Trainer direkt mit Sternen.' },
  { emoji: '🏋️', title: 'GYMS', text: 'Entdecke Gyms in deiner Stadt, verifiziere deine Mitgliedschaft und schau dir Equipment- und Supplement-Empfehlungen an.' },
  { emoji: '👤', title: 'PROFIL', text: 'Trag deine Kampfstatistiken ein, lad Fotos hoch und stell dein Profil fertig — je vollständiger, desto bessere Matches.' },
];

function OnboardingTour({ onFinish, darkMode }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: darkMode ? '#0d0d0d' : '#1a1a1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <button onClick={onFinish} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Überspringen
        </button>
      </div>
      <div style={{ fontSize: 72, marginBottom: 24 }}>{current.emoji}</div>
      <div className="rj" style={{ color: '#fff', fontSize: 26, letterSpacing: 3, marginBottom: 14, textAlign: 'center' }}>
        {current.title}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.7, textAlign: 'center', maxWidth: 320, marginBottom: 40 }}>
        {current.text}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? RED : 'rgba(255,255,255,0.25)', transition: 'all 0.2s ease' }} />
        ))}
      </div>
      <button onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))} style={{ width: '100%', maxWidth: 320, padding: '14px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${RED},${LIGHT_RED})`, color: '#fff', fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>
        {isLast ? "LOS GEHT'S 🥊" : 'WEITER'}
      </button>
      {step > 0 && (
        <button onClick={() => setStep((s) => s - 1)} style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Zurück
        </button>
      )}
    </div>
  );
}

export default OnboardingTour;
