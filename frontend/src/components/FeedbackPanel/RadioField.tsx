import type { FeedbackField } from '../../types';

interface RadioFieldProps {
  field: FeedbackField;
  value: string;
  onChange: (value: string) => void;
}

export default function RadioField({ field, value, onChange }: RadioFieldProps) {
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
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              style={{
                padding: '7px 18px',
                borderRadius: 24,
                border: `2px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-surface)',
                color: selected ? 'var(--color-surface)' : 'var(--color-text-base)',
                fontSize: 13,
                fontWeight: selected ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                outline: 'none',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
