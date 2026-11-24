// Stadt-Auswahl mit Vorschlaegen und optionaler GPS-Bestaetigung.
// Die Stadt kommt aus einer festen Liste (src/data/dachCities.json), damit jede
// Stadt eindeutige Koordinaten hat. Orte, die nicht in der Liste stehen, koennen
// trotzdem als Text uebernommen werden. GPS wird NUR auf Knopfdruck abgefragt.
import React from 'react';
import { Inp } from './uiHelpers';
import { loadCityIndex, searchCities, exactCity, nearestCity, distKm } from './cityIndex';

const GPS_OK_KM = 100; // so weit duerfen GPS und gewaehlte Stadt auseinanderliegen

// onPick({ name, lat, lon, source: 'city'|'gps', free? })
export default function CityPicker({ value, onType, onPick, L, placeholder, showGps = true }) {
  const [index, setIndex] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [conflict, setConflict] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    loadCityIndex().then((i) => { if (alive) setIndex(i); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const text = String(value || '');
  const matches = React.useMemo(() => (index ? searchCities(index, text, 6) : []), [index, text]);
  const exact = index ? exactCity(index, text) : null;
  const sub = (c) => [c.region, c.cc !== 'DE' ? c.cc : ''].filter(Boolean).join(' · ');

  const pick = (c) => {
    setConflict(null);
    setNote('');
    setOpen(false);
    onPick({ name: c.name, lat: c.lat, lon: c.lon, source: 'city' });
  };
  const pickFree = () => {
    setOpen(false);
    onPick({ name: text.trim(), lat: null, lon: null, source: 'city', free: true });
  };

  // Beim Verlassen: genau passender Name ohne Antippen des Vorschlags wird uebernommen
  const onBlurWrap = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOpen(false);
    if (exact && text && exact.name !== '') pick(exact);
  };

  const askGps = () => {
    if (!navigator.geolocation) { setNote(L('GPS nicht verfügbar', 'GPS not available', 'GPS indisponible', 'GPS no disponible')); return; }
    setBusy(true); setNote(''); setConflict(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const found = index ? nearestCity(index, lat, lon) : null;
        const cur = index ? exactCity(index, text) : null;
        if (!cur) {
          // noch keine (bekannte) Stadt gewaehlt: nimm die naechste
          if (found) { onPick({ name: found.name, lat, lon, source: 'gps' }); setNote(L('✅ Standort bestätigt: ', '✅ Location confirmed: ', '✅ Position confirmée : ', '✅ Ubicación confirmada: ') + found.name); }
          else { onPick({ name: text.trim(), lat, lon, source: 'gps', free: true }); setNote(L('✅ GPS gespeichert', '✅ GPS saved', '✅ GPS enregistré', '✅ GPS guardado')); }
          return;
        }
        if (distKm(cur.lat, cur.lon, lat, lon) <= GPS_OK_KM) {
          onPick({ name: cur.name, lat, lon, source: 'gps' });
          setNote(L('✅ Standort bestätigt: ', '✅ Location confirmed: ', '✅ Position confirmée : ', '✅ Ubicación confirmada: ') + cur.name);
          return;
        }
        setConflict({ cur, found, lat, lon });
      },
      () => { setBusy(false); setNote(L('GPS nicht erlaubt – wähle deine Stadt in der Liste', 'GPS not allowed – pick your city from the list', 'GPS refusé – choisis ta ville dans la liste', 'GPS no permitido: elige tu ciudad en la lista')); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const btn = { padding: '9px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' };

  return (
    <div onFocus={() => setOpen(true)} onBlur={onBlurWrap} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
      <Inp placeholder={placeholder} value={text} onChange={(v) => { onType(v); setOpen(true); setConflict(null); setNote(''); }} autoComplete='off' name='city-search' />
      {open && text.trim().length >= 2 && (matches.length > 0 || !exact) && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 60, marginTop: 4, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
          {matches.map((c, i) => (
            <button key={c.name + c.region + i} type='button' onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 13px', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
              <span style={{ color: '#1a1a1a', fontSize: 14, fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>{sub(c)}</span>
            </button>
          ))}
          {!exact && (
            <button type='button' onMouseDown={(e) => e.preventDefault()} onClick={pickFree}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 13px', background: '#fafafa', border: 'none', cursor: 'pointer', color: '#555', fontSize: 13 }}>
              {L('„' + text.trim() + '“ so übernehmen', 'Use “' + text.trim() + '” as typed', 'Utiliser « ' + text.trim() + ' » tel quel', 'Usar «' + text.trim() + '» tal cual')}
            </button>
          )}
          <div style={{ padding: '4px 13px', color: '#bbb', fontSize: 9, background: '#fff' }}>{L('Städtedaten: GeoNames (CC BY 4.0)', 'City data: GeoNames (CC BY 4.0)', 'Données : GeoNames (CC BY 4.0)', 'Datos: GeoNames (CC BY 4.0)')}</div>
        </div>
      )}
      </div>
      {showGps && !conflict && (
        <button type='button' onClick={askGps} disabled={busy} style={{ marginTop: 8, background: 'transparent', border: '1px solid #bbb', color: '#555', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
          {busy ? L('GPS wird ermittelt…', 'Getting GPS…', 'GPS en cours…', 'Obteniendo GPS…') : L('📍 Per GPS bestätigen', '📍 Confirm with GPS', '📍 Confirmer par GPS', '📍 Confirmar con GPS')}
        </button>
      )}
      {note && <div style={{ color: '#27ae60', fontSize: 12, marginTop: 6 }}>{note}</div>}
      {conflict && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid #e0c36a', background: '#fff9e6', borderRadius: 10 }}>
          <div style={{ color: '#6b5500', fontSize: 12, marginBottom: 8, lineHeight: 1.4 }}>
            {L('Dein GPS sagt ', 'Your GPS says ', 'Ton GPS indique ', 'Tu GPS indica ')}<b>{conflict.found ? conflict.found.name : '?'}</b>
            {L(', du hast aber ', ', but you chose ', ', mais tu as choisi ', ', pero elegiste ')}<b>{conflict.cur.name}</b>{L(' gewählt. Was stimmt?', '. Which is right?', '. Laquelle est correcte ?', '. ¿Cuál es correcta?')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conflict.found && <button type='button' style={btn} onClick={() => { onPick({ name: conflict.found.name, lat: conflict.lat, lon: conflict.lon, source: 'gps' }); setConflict(null); setNote(L('✅ Standort bestätigt: ', '✅ Location confirmed: ', '✅ Position confirmée : ', '✅ Ubicación confirmada: ') + conflict.found.name); }}>
              {L('Ich bin in ', 'I am in ', 'Je suis à ', 'Estoy en ')}{conflict.found.name}
            </button>}
            <button type='button' style={btn} onClick={() => { onPick({ name: conflict.cur.name, lat: conflict.cur.lat, lon: conflict.cur.lon, source: 'city' }); setConflict(null); setNote(L('✅ Bei ', '✅ Staying with ', '✅ On garde ', '✅ Se queda ') + conflict.cur.name); }}>
              {L('Bei ', 'Stay with ', 'Garder ', 'Quedarse con ')}{conflict.cur.name}{L(' bleiben', '', '', '')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
