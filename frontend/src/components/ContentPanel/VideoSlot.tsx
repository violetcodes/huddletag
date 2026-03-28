import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  marginBottom: 8,
};

const frameStyle: CSSProperties = {
  flex: 1,
  backgroundColor: 'var(--color-sidebar-bg)',
  borderRadius: 8,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
};

interface VideoSlotProps {
  src: string;
  label: string;
}

export default function VideoSlot({ src, label }: VideoSlotProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={labelStyle}>{label}</div>
      <div style={frameStyle}>
        <video
          key={src}
          src={src}
          controls
          preload="metadata"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    </div>
  );
}
