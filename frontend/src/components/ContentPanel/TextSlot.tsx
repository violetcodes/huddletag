import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  marginBottom: 8,
};

async function fetchText(src: string, signal: AbortSignal): Promise<string> {
  const r = await fetch(src, { signal });
  if (!r.ok) throw new Error('Not found');
  return r.text();
}

interface TextSlotProps {
  src: string;
  label: string;
}

export default function TextSlot({ src, label }: TextSlotProps) {
  const { data: content, isError } = useQuery({
    queryKey: ['text-content', src],
    queryFn: ({ signal }) => fetchText(src, signal),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={labelStyle}>{label}</div>
      <div
        style={{
          flex: 1,
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '12px 16px',
          overflow: 'auto',
          fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
          fontSize: 13,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text)',
          minHeight: 0,
        }}
      >
        {content === undefined && !isError && (
          <span style={{ color: 'var(--color-text-faint)' }}>Loading…</span>
        )}
        {isError && (
          <span style={{ color: 'var(--color-danger)' }}>Failed to load content.</span>
        )}
        {content !== undefined && content}
      </div>
    </div>
  );
}
