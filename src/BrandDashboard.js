import { useState, useEffect } from 'react';

function BrandDashboard({ brandSlug, SUPA_URL, SUPA_KEY }) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(SUPA_URL + '/rest/v1/equipment?brand=ilike.*' + encodeURIComponent(brandSlug) + '*&order=click_count.desc', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY },
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [brandSlug]);

  const totalClicks = items ? items.reduce((sum, i) => sum + (i.click_count || 0), 0) : 0;
  const brandName = items && items.length > 0 ? items[0].brand : brandSlug;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 20px', fontFamily: 'DM Sans,sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Georgia,serif', letterSpacing: 6, color: '#fff', fontSize: 32, fontWeight: 'bold' }}>FIGHTER</div>
          <div style={{ color: '#c0392b', fontSize: 11, letterSpacing: 3, marginTop: 6, fontWeight: 600 }}>PARTNER-DASHBOARD</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>Lädt...</div>
        ) : !items || items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            Keine Produkte unter diesem Namen gefunden. Bitte den Link bei Junior prüfen lassen.
          </div>
        ) : (
          <>
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '24px 20px', marginBottom: 20, border: '1px solid #2a2a2a', textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: 12, letterSpacing: 1, marginBottom: 6 }}>WILLKOMMEN,</div>
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: 'Rajdhani,sans-serif', letterSpacing: 1, marginBottom: 16 }}>{brandName}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
                <div>
                  <div style={{ color: '#c0392b', fontSize: 32, fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{totalClicks}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>Klicks gesamt</div>
                </div>
                <div>
                  <div style={{ color: '#c0392b', fontSize: 32, fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{items.length}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>Produkte gelistet</div>
                </div>
              </div>
            </div>

            <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>DEINE PRODUKTE</div>
            {items.map((eq) => (
              <div key={eq.id} style={{ background: '#1a1a1a', borderRadius: 12, padding: '14px 16px', marginBottom: 8, border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 12 }}>
                {eq.image_url ? (
                  <img loading="lazy" src={eq.image_url} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} alt="" />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: '#2a2a2a', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.product}</div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{eq.category}{eq.featured ? ' · ⭐ Empfohlen' : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#c0392b', fontSize: 18, fontWeight: 700, fontFamily: 'Rajdhani,sans-serif' }}>{eq.click_count || 0}</div>
                  <div style={{ color: '#666', fontSize: 10 }}>Klicks</div>
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center', color: '#555', fontSize: 11, marginTop: 24, lineHeight: 1.6 }}>
              Fragen zu deiner Partnerschaft? Schreib uns an{' '}
              <a href="mailto:junior@fighterapp.de" style={{ color: '#c0392b' }}>junior@fighterapp.de</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BrandDashboard;
