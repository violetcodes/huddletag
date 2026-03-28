import { getExportUrl } from '../../api/export';

interface StatsPanelProps {
  jobId: string;
  itemCount: number;
  annotatedCount: number;
  onSave?: () => void;
  isSaving?: boolean;
}

export default function StatsPanel({
  jobId,
  itemCount,
  annotatedCount,
  onSave,
  isSaving,
}: StatsPanelProps) {
  const pct = itemCount > 0 ? Math.round((annotatedCount / itemCount) * 100) : 0;
  const isDone = pct === 100;

  return (
    <div
      style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Progress label + count */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Progress
        </span>
        <span
          style={{
            fontSize: 12,
            color: isDone ? 'var(--color-success)' : 'var(--color-text-faint)',
            fontWeight: 700,
          }}
        >
          {annotatedCount}/{itemCount}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          backgroundColor: 'var(--color-sidebar-hover)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: isDone ? 'var(--color-success)' : 'var(--color-accent)',
            borderRadius: 2,
            transition: 'width 0.35s ease',
          }}
        />
      </div>

      {/* Save button — shown only when an item is active */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 0',
            borderRadius: 6,
            backgroundColor: 'var(--color-accent)',
            border: 'none',
            color: 'var(--color-surface)',
            fontSize: 12,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isSaving ? 'Saving…' : '↑ Save'}
        </button>
      )}

      {/* Export button */}
      <a
        href={getExportUrl(jobId)}
        download
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '7px 0',
          borderRadius: 6,
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.09)';
          (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
        }}
      >
        ↓ Export CSV
      </a>
    </div>
  );
}
