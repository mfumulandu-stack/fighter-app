import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fängt JEDEN Absturz der App ab und zeigt die Fehlermeldung sichtbar an,
// statt eines schwarzen Bildschirms. Ohne diese Hülle verschwindet bei
// einem Render-Fehler die komplette App und niemand weiß warum.
class RootErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App-Absturz:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', padding: 24, fontFamily: 'monospace', fontSize: 13 }}>
          <div style={{ color: '#e74c3c', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>⚠️ Die App ist abgestürzt</div>
          <div style={{ marginBottom: 16, fontFamily: 'sans-serif' }}>Bitte mach einen Screenshot von dieser Seite und schick ihn an den Support.</div>
          <div style={{ background: '#7b1010', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '50vh', overflow: 'auto' }}>
            {String(this.state.error && this.state.error.message)}
            {'\n\n'}
            {String((this.state.error && this.state.error.stack) || '').slice(0, 1500)}
          </div>
          <button onClick={() => { window.location.reload(); }}
            style={{ marginTop: 16, padding: '12px 24px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700 }}>
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootErrorBoundary><App /></RootErrorBoundary>);
