import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FeedbackField, Item, AnnotationValues } from '../types';

interface UseKeyboardShortcutsOptions {
  jobId: string;
  items: Item[];
  currentItemId: string | undefined;
  feedbackFields: FeedbackField[];
  formValues: AnnotationValues;
  onFormChange: (values: AnnotationValues) => void;
  onSave: () => void;
  onToggleShortcutOverlay: () => void;
}

export function useKeyboardShortcuts({
  jobId,
  items,
  currentItemId,
  feedbackFields,
  formValues,
  onFormChange,
  onSave,
  onToggleShortcutOverlay,
}: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inText =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // '?' always toggles overlay regardless of focus
      if (e.key === '?') {
        onToggleShortcutOverlay();
        return;
      }

      // All other shortcuts are suppressed when a text input has focus
      if (inText) return;

      const idx = items.findIndex(i => i.item_id === currentItemId);

      if (e.key === 'ArrowRight' || e.key === 'n') {
        const next = items[idx + 1];
        if (next) navigate(`/jobs/${jobId}/items/${next.item_id}`);
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'p') {
        const prev = items[idx - 1];
        if (prev) navigate(`/jobs/${jobId}/items/${prev.item_id}`);
        return;
      }

      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        onSave();
        return;
      }

      // Number keys: 1-9 → option index 0-8, 0 → option index 9
      if (/^[0-9]$/.test(e.key)) {
        const optionIdx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        const firstRadio = feedbackFields.find(f => f.type === 'radio');
        if (firstRadio?.options && firstRadio.options[optionIdx] !== undefined) {
          onFormChange({ ...formValues, [firstRadio.name]: firstRadio.options[optionIdx] });
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    jobId,
    items,
    currentItemId,
    feedbackFields,
    formValues,
    onFormChange,
    onSave,
    onToggleShortcutOverlay,
    navigate,
  ]);
}
