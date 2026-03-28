import type { FeedbackField } from '../../types';

interface CheckboxFieldProps {
  field: FeedbackField;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function CheckboxField({ field, value, onChange }: CheckboxFieldProps) {
  const toggle = (option: string) => {
    const next = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(next);
  };

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          marginBottom: 8,
        }}
      >
        {field.name.replace(/_/g, ' ')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(field.options ?? []).map(option => {
          const checked = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              style={{
                padding: '7px 18px',
                borderRadius: 24,
                border: `2px solid ${checked ? 'var(--color-success)' : 'var(--color-border)'}`,
                backgroundColor: checked ? 'var(--color-success)' : 'var(--color-surface)',
                color: checked ? 'var(--color-surface)' : 'var(--color-text-base)',
                fontSize: 13,
                fontWeight: checked ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {checked && (
                <span style={{ fontSize: 11, lineHeight: 1 }}>✓</span>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
