import type { AnnotationValues, FeedbackField } from '../../types';
import RadioField from './RadioField';
import CheckboxField from './CheckboxField';
import TextField from './TextField';

interface FeedbackFormProps {
  fields: FeedbackField[];
  values: AnnotationValues;
  onChange: (values: AnnotationValues) => void;
}

export default function FeedbackForm({ fields, values, onChange }: FeedbackFormProps) {
  const set = (name: string, value: string | string[]) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {fields.map(field => {
        if (field.type === 'radio') {
          return (
            <RadioField
              key={field.name}
              field={field}
              value={(values[field.name] as string) ?? ''}
              onChange={v => set(field.name, v)}
            />
          );
        }
        if (field.type === 'checkbox') {
          return (
            <CheckboxField
              key={field.name}
              field={field}
              value={(values[field.name] as string[]) ?? []}
              onChange={v => set(field.name, v)}
            />
          );
        }
        return (
          <TextField
            key={field.name}
            field={field}
            value={(values[field.name] as string) ?? ''}
            onChange={v => set(field.name, v)}
          />
        );
      })}
    </div>
  );
}
