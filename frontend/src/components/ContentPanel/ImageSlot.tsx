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

interface ImageSlotProps {
  src: string;
  label: string;
}

export default function ImageSlot({ src, label }: ImageSlotProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={labelStyle}>{label}</div>
      <div style={frameStyle}>
        <img
          src={src}
          alt={label}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
