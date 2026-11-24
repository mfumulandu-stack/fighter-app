// Ladeplatzhalter: zeigen die Form des Inhalts, solange Daten laden
// (statt leerer Flaeche oder kurz aufblitzender "Alle gesehen"-Seite).
import React from 'react';

export function SkeletonCard() {
  const bar = (w, h, extra) => <div className='skel' style={{ width: w, height: h, borderRadius: 10, ...extra }} />;
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative', background: '#151515' }}>
      <div className='skel' style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
      <div style={{ position: 'absolute', left: 18, right: 18, bottom: 84, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bar('55%', 30, { background: 'rgba(255,255,255,0.12)', animation: 'none' })}
        <div style={{ display: 'flex', gap: 6 }}>
          {bar(70, 22, { borderRadius: 20, background: 'rgba(255,255,255,0.1)', animation: 'none' })}
          {bar(90, 22, { borderRadius: 20, background: 'rgba(255,255,255,0.1)', animation: 'none' })}
          {bar(60, 22, { borderRadius: 20, background: 'rgba(255,255,255,0.1)', animation: 'none' })}
        </div>
      </div>
    </div>
  );
}

export function SkeletonRank({ darkMode, rows = 8 }) {
  const cls = darkMode ? 'skel' : 'skel skel-l';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-hidden='true'>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: darkMode ? '#1a1a1a' : '#fff' }}>
          <div className={cls} style={{ width: 26, height: 14, borderRadius: 6 }} />
          <div className={cls} style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className={cls} style={{ width: '45%', height: 13, borderRadius: 6 }} />
            <div className={cls} style={{ width: '25%', height: 10, borderRadius: 6 }} />
          </div>
          <div className={cls} style={{ width: 34, height: 16, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
