import { useState, useRef } from 'react';

const DELETE_WIDTH = 76;

function SwipeableChatRow({ children, onDelete, darkMode }) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const dragging = useRef(false);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function onTouchMove(e) {
    if (!dragging.current || startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const base = open ? DELETE_WIDTH : 0;
    let next = base + dx;
    if (next < 0) next = 0;
    if (next > DELETE_WIDTH) next = DELETE_WIDTH;
    setDragX(next);
  }
  function onTouchEnd() {
    dragging.current = false;
    if (dragX > DELETE_WIDTH / 2) {
      setDragX(DELETE_WIDTH);
      setOpen(true);
    } else {
      setDragX(0);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 13 }}>
      <div
        onClick={() => {
          if (window.confirm('Chat löschen? Das kann nicht rückgängig gemacht werden.')) {
            onDelete();
          }
          setDragX(0);
          setOpen(false);
        }}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: DELETE_WIDTH,
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
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging.current ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          background: darkMode ? '#0d0d0d' : '#f5f5f7',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableChatRow;
