import type { FeedbackField } from '../../types';

interface TextFieldProps {
  field: FeedbackField;
  value: string;
  onChange: (value: string) => void;
}

export default function TextField({ field, value, onChange }: TextFieldProps) {
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
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="Enter your notes…"
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1.5px solid var(--color-border)',
          outline: 'none',
          resize: 'vertical',
          fontSize: 13,
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-surface)',
          lineHeight: 1.55,
          transition: 'border-color 0.12s ease',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }}
      />
    </div>
  );
}
