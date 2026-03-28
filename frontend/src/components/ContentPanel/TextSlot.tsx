import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  marginBottom: 8,
};

const COLLAPSED_MAX_HEIGHT = 300;

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
  const [expanded, setExpanded] = useState(false);

  const { data: content, isError } = useQuery({
    queryKey: ['text-content', src],
    queryFn: ({ signal }) => fetchText(src, signal),
  });

  const needsExpand =
    content !== undefined && content.length > 800;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            flex: expanded ? 1 : undefined,
            maxHeight: expanded ? undefined : COLLAPSED_MAX_HEIGHT,
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: needsExpand && !expanded ? '8px 8px 0 0' : 8,
            padding: '12px 16px',
            overflowY: 'auto',
            fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
            fontSize: 13,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            color: 'var(--color-text)',
            minHeight: 0,
            // Subtle inner-bottom shadow to hint at more content
            boxShadow: needsExpand && !expanded
              ? 'inset 0 -24px 16px -12px var(--color-bg)'
              : undefined,
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

        {needsExpand && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              width: '100%',
              padding: '6px 0',
              border: '1px solid var(--color-border)',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              background: 'var(--color-surface)',
              color: 'var(--color-accent)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        )}
      </div>
    </div>
  );
}
