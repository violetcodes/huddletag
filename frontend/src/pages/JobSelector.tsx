import { Link } from 'react-router-dom';
import { useJobs } from '../hooks/useJob';
import { formatTitle } from '../utils/format';
import ThemeToggle from '../components/ThemeToggle';

export default function JobSelector() {
  const { data: jobs, isLoading, isError } = useJobs();

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
            and restart the backend.
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

                  {/* CTA */}
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
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
