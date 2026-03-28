import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useJobSpec } from '../hooks/useJob';
import { useItems } from '../hooks/useItems';
import { useAnnotation, useSaveAnnotation } from '../hooks/useAnnotation';
import ItemList from '../components/Sidebar/ItemList';
import StatsPanel from '../components/Sidebar/StatsPanel';
import ContentGrid from '../components/ContentPanel/ContentGrid';
import FeedbackForm from '../components/FeedbackPanel/FeedbackForm';
import ActionBar from '../components/ActionBar';
import ThemeToggle from '../components/ThemeToggle';
import { formatTitle } from '../utils/format';
import type { AnnotationValues } from '../types';

export default function AnnotatorView() {
  const { jobId, itemId } = useParams<{ jobId: string; itemId?: string }>();
  const navigate = useNavigate();

  const { data: spec, isLoading: specLoading, isError: specError } = useJobSpec(jobId ?? '');
  const { data: items, isLoading: itemsLoading, isError: itemsError } = useItems(jobId ?? '');
  const { data: savedAnnotation } = useAnnotation(jobId ?? '', itemId ?? '');
  const saveMutation = useSaveAnnotation(jobId ?? '');

  const [formValues, setFormValues] = useState<AnnotationValues>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  // Redirect to first unannotated item when no itemId is present
  useEffect(() => {
    if (!itemId && items && items.length > 0) {
      const target = items.find(i => !i.is_annotated) ?? items[0];
      navigate(`/jobs/${jobId}/items/${target.item_id}`, { replace: true });
    }
  }, [itemId, items, jobId, navigate]);

  // Reset form on item navigation
  useEffect(() => {
    setFormValues({});
    setSaveError(null);
    setShowComplete(false);
  }, [itemId]);

  // Pre-populate form from saved annotation
  useEffect(() => {
    if (savedAnnotation) {
      setFormValues(savedAnnotation.values);
    }
  }, [savedAnnotation]);

  const currentItem = items?.find(i => i.item_id === itemId);

  const itemCount = items?.length ?? 0;
  const annotatedCount = items?.filter(i => i.is_annotated).length ?? 0;

  const nextUnannotated = (() => {
    if (!items || !itemId) return undefined;
    const idx = items.findIndex(i => i.item_id === itemId);
    return (
      items.slice(idx + 1).find(i => !i.is_annotated) ??
      items.slice(0, idx).find(i => !i.is_annotated)
    );
  })();

  const handleSave = async (advance: boolean) => {
    if (!jobId || !itemId) return;
    setSaveError(null);
    try {
      await saveMutation.mutateAsync({ itemId, values: formValues });
      if (advance && nextUnannotated) {
        navigate(`/jobs/${jobId}/items/${nextUnannotated.item_id}`);
      } else if (advance && !nextUnannotated) {
        setShowComplete(true);
      }
    } catch {
      setSaveError('Failed to save. Please try again.');
    }
  };

  const isLoading = specLoading || itemsLoading;
  const isError = specError || itemsError;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          height: 50,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 10,
          backgroundColor: 'var(--color-sidebar-bg)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          zIndex: 10,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-surface)',
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          H
        </div>

        {/* Breadcrumb */}
        <Link
          to="/"
          style={{
            color: 'var(--color-text-dim)',
            fontSize: 13,
            textDecoration: 'none',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-dim)'; }}
        >
          Jobs
        </Link>

        <span style={{ color: 'var(--color-sidebar-dim)', fontSize: 13 }}>/</span>

        <span style={{ color: 'var(--color-border)', fontSize: 13, fontWeight: 600 }}>
          {formatTitle(jobId ?? '')}
        </span>

        {currentItem && (
          <>
            <span style={{ color: 'var(--color-sidebar-dim)', fontSize: 13 }}>/</span>
            <span
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 12,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              {currentItem.item_id}
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />

        <ThemeToggle onDarkBg />

        {currentItem?.is_annotated && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-success)',
              backgroundColor: 'rgba(5,150,105,0.12)',
              border: '1px solid rgba(5,150,105,0.25)',
              padding: '3px 10px',
              borderRadius: 20,
            }}
          >
            ✓ Saved
          </span>
        )}
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 258,
            flexShrink: 0,
            backgroundColor: 'var(--color-sidebar-bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              padding: '10px 16px 6px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-sidebar-dim)',
              flexShrink: 0,
            }}
          >
            Items{items ? ` (${items.length})` : ''}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {items && (
              <ItemList jobId={jobId!} items={items} currentItemId={itemId} />
            )}
            {itemsLoading && (
              <div style={{ padding: '20px 16px', color: 'var(--color-sidebar-dim)', fontSize: 13 }}>
                Loading…
              </div>
            )}
          </div>

          <StatsPanel
            jobId={jobId!}
            itemCount={itemCount}
            annotatedCount={annotatedCount}
            onSave={currentItem ? () => handleSave(false) : undefined}
            isSaving={saveMutation.isPending}
          />
        </aside>

        {/* Main workspace */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {isLoading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-faint)',
                fontSize: 14,
              }}
            >
              Loading…
            </div>
          )}

          {!isLoading && isError && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
              }}
            >
              <div
                style={{
                  maxWidth: 400,
                  padding: '18px 22px',
                  borderRadius: 10,
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger-dark)',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <strong>Failed to load job.</strong> Check that the backend is running and that{' '}
                <code
                  style={{
                    backgroundColor: '#fee2e2',
                    padding: '1px 5px',
                    borderRadius: 3,
                    fontFamily: 'monospace',
                  }}
                >
                  {jobId}
                </code>{' '}
                is a valid job ID.
              </div>
            </div>
          )}

          {!isLoading && !isError && items && items.length === 0 && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-faint)',
                fontSize: 14,
              }}
            >
              No items in this job.
            </div>
          )}

          {!isLoading && !isError && currentItem && spec && (
            <>
              {/* Completion banner */}
              {showComplete && (
                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 20px',
                    backgroundColor: 'var(--color-success-bg)',
                    borderBottom: '1px solid var(--color-success-border)',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--color-success)', fontWeight: 600 }}>
                    ✓ All items annotated — job complete!
                  </span>
                  <Link
                    to="/"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    Back to jobs →
                  </Link>
                </div>
              )}

              {/* Content grid */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 16,
                  minHeight: 0,
                }}
              >
                <ContentGrid
                  key={itemId}
                  jobId={jobId!}
                  item={currentItem}
                  contentSchema={spec.content_schema}
                />
              </div>

              {/* Feedback panel */}
              <div
                style={{
                  flexShrink: 0,
                  backgroundColor: 'var(--color-surface)',
                  borderTop: '1px solid var(--color-border)',
                  padding: '16px 20px',
                  overflowY: 'auto',
                  maxHeight: '42%',
                }}
              >
                <FeedbackForm
                  fields={spec.feedbacks}
                  values={formValues}
                  onChange={setFormValues}
                />

                {saveError && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: 'var(--color-danger)',
                    }}
                  >
                    {saveError}
                  </p>
                )}

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: '1px solid var(--color-bg-subtle)',
                  }}
                >
                  <ActionBar
                    onSave={() => handleSave(false)}
                    onSaveAndNext={() => handleSave(true)}
                    isSaving={saveMutation.isPending}
                    hasNextUnannotated={!!nextUnannotated}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
