import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useJobs } from '../hooks/useJob';
import { uploadJobZip } from '../api/jobs';
import { formatTitle } from '../utils/format';
import ThemeToggle from '../components/ThemeToggle';

export default function JobSelector() {
  const { data: jobs, isLoading, isError } = useJobs();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const host = window.location.hostname;

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-surface)',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '-0.5px',
            }}
          >
            H
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>HuddleTag</span>
        </div>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </header>

      {/* Main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '44px 32px' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Annotation Jobs
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Select a job to start or continue annotating.
          </p>
        </div>

        {isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--color-text-faint)',
              fontSize: 14,
            }}
          >
            Loading jobs…
          </div>
        )}

        {isError && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 10,
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger-dark)',
              fontSize: 14,
            }}
          >
            Could not connect to the backend. Make sure it is running on port 8000.
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--color-text-faint)',
              fontSize: 14,
            }}
          >
            No jobs found. Add job directories to{' '}
            <code
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: 'monospace',
              }}
            >
              JOBS_DIR
            </code>{' '}
            and the job list will refresh automatically.
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {jobs.map(job => {
              const pct =
                job.item_count > 0
                  ? Math.round((job.annotated_count / job.item_count) * 100)
                  : 0;
              const isDone = job.annotated_count >= job.item_count && job.item_count > 0;
              const isStarted = job.annotated_count > 0;

              return (
                <div
                  key={job.job_id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 12,
                    padding: 22,
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 4px 16px rgba(0,0,0,0.1)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 1px 4px rgba(0,0,0,0.05)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Title */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>
                        {job.title ?? formatTitle(job.job_id)}
                      </h2>
                      {isDone && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-success)',
                            backgroundColor: 'var(--color-success-bg)',
                            border: '1px solid var(--color-success-border)',
                            padding: '2px 8px',
                            borderRadius: 20,
                          }}
                        >
                          Done
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                      {job.job_id}
                    </p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 7,
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Annotated</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isDone ? 'var(--color-success)' : 'var(--color-accent)',
                        }}
                      >
                        {job.annotated_count} / {job.item_count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: isDone ? 'var(--color-success)' : 'var(--color-accent)',
                          borderRadius: 3,
                          transition: 'width 0.35s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <Link
                    to={`/jobs/${job.job_id}`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '9px 0',
                      borderRadius: 8,
                      backgroundColor: isDone ? 'transparent' : 'var(--color-accent)',
                      color: isDone ? 'var(--color-success)' : 'var(--color-surface)',
                      border: isDone ? '1.5px solid var(--color-success-border)' : 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'opacity 0.12s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.opacity = '0.88';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }}
                  >
                    {!isStarted ? 'Start Annotating' : isDone ? '✓ Review' : 'Continue →'}
                  </Link>

                  {/* Secondary actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`/api/jobs/${job.job_id}/zip`}
                      download
                      title="Download this job folder as a zip"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '7px 0',
                        borderRadius: 7,
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text-muted)',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                      }}
                    >
                      ↓ Zip
                    </a>
                    <a
                      href={`/api/jobs/${job.job_id}/export`}
                      download
                      title="Export annotations as CSV"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '7px 0',
                        borderRadius: 7,
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text-muted)',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-success)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-success)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                      }}
                    >
                      ↑ Export
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Add-a-job card */}
        <AddJobCard
          host={host}
          open={addOpen}
          onToggle={() => setAddOpen(o => !o)}
          onUploaded={() => queryClient.invalidateQueries({ queryKey: ['jobs'] })}
        />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-job card (upload + SCP fallback)
// ---------------------------------------------------------------------------

interface AddJobCardProps {
  host: string;
  open: boolean;
  onToggle: () => void;
  onUploaded: () => void;
}

function AddJobCard({ host, open, onToggle, onUploaded }: AddJobCardProps) {
  return (
    <div
      style={{
        marginTop: 40,
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
          + Add a job
        </span>
        <span
          style={{
            fontSize: 18,
            color: 'var(--color-text-muted)',
            lineHeight: 1,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            display: 'inline-block',
          }}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 24px', borderTop: '1px solid var(--color-border)' }}>
          {/* Upload section */}
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 16, marginBottom: 12, lineHeight: 1.6 }}>
            Upload a <strong>.zip</strong> containing <code style={monoTag}>annot_spec.yml</code> and{' '}
            <code style={monoTag}>dataset.csv</code> at its root (or inside a single top-level folder).
            Max size: <strong>10 GiB</strong>. The job will appear automatically after upload.
          </p>
          <UploadZone onUploaded={onUploaded} />

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
              or copy directly to the server
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
          </div>

          {/* SCP section */}
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
            For large media sets (&gt;10 GiB), SCP your job folder directly into the server's mounted jobs directory:
          </p>
          <ScpSnippet host={host} />
          <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 10, lineHeight: 1.6 }}>
            The backend auto-detects new jobs every few seconds — no restart required.
            See <code style={monoTag}>README.md</code> for Docker volume mount instructions.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag-and-drop upload zone
// ---------------------------------------------------------------------------

type UploadState =
  | { phase: 'idle' }
  | { phase: 'selected'; file: File }
  | { phase: 'uploading'; pct: number }
  | { phase: 'success'; jobId: string; itemCount: number }
  | { phase: 'error'; message: string };

interface UploadZoneProps {
  onUploaded: () => void;
}

function UploadZone({ onUploaded }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setState({ phase: 'error', message: 'Only .zip files are accepted.' });
      return;
    }
    const MAX = 10 * 1024 * 1024 * 1024;
    if (f.size > MAX) {
      setState({ phase: 'error', message: 'File exceeds the 10 GiB size limit. Use SCP instead.' });
      return;
    }
    setState({ phase: 'selected', file: f });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (state.phase !== 'selected') return;
    const file = state.file;
    setState({ phase: 'uploading', pct: 0 });
    try {
      const result = await uploadJobZip(file, (pct) =>
        setState({ phase: 'uploading', pct }),
      );
      setState({ phase: 'success', jobId: result.job_id, itemCount: result.item_count });
      onUploaded();
    } catch (err) {
      setState({ phase: 'error', message: (err as Error).message });
    }
  };

  const reset = () => {
    setState({ phase: 'idle' });
    setDragging(false);
  };

  const isIdle = state.phase === 'idle' || state.phase === 'error';

  return (
    <div>
      {/* Drop zone — shown when idle, error, or selected */}
      {(state.phase === 'idle' || state.phase === 'error' || state.phase === 'selected') && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => isIdle && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 10,
            padding: '24px 20px',
            textAlign: 'center',
            cursor: isIdle ? 'pointer' : 'default',
            backgroundColor: dragging ? 'var(--color-bg-subtle)' : 'transparent',
            transition: 'border-color 0.15s, background-color 0.15s',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
          {state.phase === 'selected' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  {state.file.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                  {formatBytes(state.file.size)}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); reset(); }}
                style={{
                  marginLeft: 4,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-faint)',
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 2,
                }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>☁</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Drag &amp; drop a <strong>.zip</strong> file here, or{' '}
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>browse</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Max 10 GiB</div>
            </>
          )}
        </div>
      )}

      {/* Error banner */}
      {state.phase === 'error' && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          borderRadius: 8,
          backgroundColor: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger-dark)',
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{state.message}</span>
          <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Upload progress */}
      {state.phase === 'uploading' && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Uploading…</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{state.pct}%</span>
          </div>
          <div style={{ height: 6, backgroundColor: 'var(--color-bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${state.pct}%`,
              backgroundColor: 'var(--color-accent)',
              borderRadius: 3,
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      )}

      {/* Success */}
      {state.phase === 'success' && (
        <div style={{
          marginTop: 4,
          padding: '12px 16px',
          borderRadius: 8,
          backgroundColor: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          color: 'var(--color-success)',
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>
            Job <strong>{state.jobId}</strong> uploaded — {state.itemCount} item{state.itemCount !== 1 ? 's' : ''} ready.
          </span>
          <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Upload action button */}
      {state.phase === 'selected' && (
        <button
          onClick={handleUpload}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '10px 0',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-surface)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Upload Job
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SCP snippet (unchanged)
// ---------------------------------------------------------------------------

interface ScpSnippetProps {
  host: string;
}

function ScpSnippet({ host }: ScpSnippetProps) {
  const [copied, setCopied] = useState(false);
  const snippet = `scp -r /path/to/your-job/ <user>@${host}:/mounted/jobs/`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-bg-subtle)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '12px 48px 12px 16px',
      }}
    >
      <code
        style={{
          fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
          fontSize: 13,
          color: 'var(--color-text-base)',
          wordBreak: 'break-all',
        }}
      >
        {snippet}
      </code>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const monoTag: React.CSSProperties = {
  fontFamily: 'monospace',
  backgroundColor: 'var(--color-bg-subtle)',
  padding: '1px 5px',
  borderRadius: 3,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}
