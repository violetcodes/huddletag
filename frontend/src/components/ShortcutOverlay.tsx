import { useEffect } from 'react';

interface ShortcutOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '→  /  n', action: 'Next item' },
  { key: '←  /  p', action: 'Previous item' },
  { key: 'Ctrl + S', action: 'Save current annotation' },
  { key: '1 – 9,  0', action: 'Select radio option (0 = 10th)' },
  { key: '?', action: 'Toggle this cheat-sheet' },
] as const;

export default function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '22px 26px',
          minWidth: 360,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Shortcut table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {SHORTCUTS.map(({ key, action }) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '9px 16px 9px 0', whiteSpace: 'nowrap' }}>
                  <kbd
                    style={{
                      fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
                      fontSize: 12,
                      backgroundColor: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 5,
                      padding: '3px 9px',
                      color: 'var(--color-text-base)',
                    }}
                  >
                    {key}
                  </kbd>
                </td>
                <td style={{ padding: '9px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
          Number keys apply to the first radio field. All shortcuts except{' '}
          <kbd
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '1px 5px',
            }}
          >
            ?
          </kbd>{' '}
          are suppressed when a text input has focus.
        </p>
      </div>
    </div>
  );
}
