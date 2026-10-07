import { useState, useRef } from 'react';

const DELETE_WIDTH = 76;

function SwipeableChatRow({ children, onDelete, darkMode, confirmText, radius, bg }) {
  const [dragX, setDragX] = useState(0); // 0 = geschlossen, -DELETE_WIDTH = offen
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const axisLock = useRef(null); // 'x' | 'y' | null
  const dragging = useRef(false);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    axisLock.current = null;
    dragging.current = true;
  }
  function onTouchMove(e) {
    if (!dragging.current || startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (axisLock.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLock.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axisLock.current === 'y') return; // vertikales Scrollen: Karte bleibt stehen
    const base = open ? -DELETE_WIDTH : 0;
    let next = base + dx;
    if (next > 0) next = 0;
    if (next < -DELETE_WIDTH) next = -DELETE_WIDTH;
    setDragX(next);
  }
  function onTouchEnd() {
    dragging.current = false;
    if (axisLock.current === 'y' || axisLock.current === null) {
      setDragX(open ? -DELETE_WIDTH : 0);
      return;
    }
    if (dragX < -DELETE_WIDTH / 2) {
      setDragX(-DELETE_WIDTH);
      setOpen(true);
    } else {
      setDragX(0);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: radius || 13 }}>
      <div
        onClick={() => {
          if (window.confirm(confirmText || 'Chat löschen? Das kann nicht rückgängig gemacht werden.')) {
            onDelete();
          }
          setDragX(0);
          setOpen(false);
        }}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_WIDTH,
          background: 'linear-gradient(135deg,#e74c3c,#c0392b)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontSize: 22, cursor: 'pointer',
        }}
      >
        🗑️
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging.current ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          width: '100%',
          background: bg || (darkMode ? '#0d0d0d' : '#f5f5f7'),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableChatRow;
