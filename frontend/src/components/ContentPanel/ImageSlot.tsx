import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState, useCallback } from 'react';

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  marginBottom: 8,
};

interface Transform {
  scale: number;
  dx: number;
  dy: number;
}

const INITIAL: Transform = { scale: 1, dx: 0, dy: 0 };
const MIN_SCALE = 1;
const MAX_SCALE = 8;

interface ImageSlotProps {
  src: string;
  label: string;
}

export default function ImageSlot({ src, label }: ImageSlotProps) {
  const [transform, setTransform] = useState<Transform>(INITIAL);
  const dragStart = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const isZoomed = transform.scale > 1;

  const reset = () => setTransform(INITIAL);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform(prev => {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      // When zooming out to 1 reset pan too
      if (nextScale === MIN_SCALE) return INITIAL;
      return { ...prev, scale: nextScale };
    });
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (!isZoomed) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, dx: transform.dx, dy: transform.dy };
  }, [isZoomed, transform]);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragStart.current) return;
    const ddx = e.clientX - dragStart.current.x;
    const ddy = e.clientY - dragStart.current.y;
    setTransform(prev => ({
      ...prev,
      dx: dragStart.current!.dx + ddx,
      dy: dragStart.current!.dy + ddy,
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragStart.current = null;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={labelStyle}>{label}</div>
        {isZoomed && (
          <button
            onClick={reset}
            title="Reset zoom"
            style={{
              marginLeft: 'auto',
              padding: '2px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>
      <div
        ref={frameRef}
        onWheel={handleWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          flex: 1,
          backgroundColor: 'var(--color-sidebar-bg)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          cursor: isZoomed ? 'grab' : 'zoom-in',
          userSelect: 'none',
        }}
      >
        <img
          src={src}
          alt={label}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${transform.scale}) translate(${transform.dx / transform.scale}px, ${transform.dy / transform.scale}px)`,
            transformOrigin: 'center center',
            transition: dragStart.current ? 'none' : 'transform 0.15s ease',
            pointerEvents: 'none',
          }}
        />
      </div>
      {isZoomed && (
        <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 4 }}>
          {Math.round(transform.scale * 100)}% — scroll to zoom · drag to pan
        </div>
      )}
    </div>
  );
}
