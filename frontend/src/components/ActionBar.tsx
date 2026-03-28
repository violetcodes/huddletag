interface ActionBarProps {
  onSave: () => void;
  onSaveAndNext: () => void;
  isSaving: boolean;
  hasNextUnannotated: boolean;
}

export default function ActionBar({
  onSave,
  onSaveAndNext,
  isSaving,
  hasNextUnannotated,
}: ActionBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
      }}
    >
      <button
        onClick={onSave}
        disabled={isSaving}
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          border: '1.5px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-base)',
          fontSize: 13,
          fontWeight: 500,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.55 : 1,
          transition: 'all 0.12s ease',
        }}
      >
        Save
      </button>

      <button
        onClick={hasNextUnannotated ? onSaveAndNext : onSave}
        disabled={isSaving}
        style={{
          padding: '8px 22px',
          borderRadius: 8,
          border: 'none',
          backgroundColor: hasNextUnannotated ? 'var(--color-accent)' : 'var(--color-success)',
          color: 'var(--color-surface)',
          fontSize: 13,
          fontWeight: 600,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.55 : 1,
          transition: 'all 0.12s ease',
          minWidth: 130,
        }}
      >
        {isSaving ? 'Saving…' : hasNextUnannotated ? 'Save & Next →' : 'Save ✓'}
      </button>
    </div>
  );
}
