import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        gap: 16,
        textAlign: 'center',
        padding: 32,
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: 'var(--color-border)',
          lineHeight: 1,
        }}
      >
        404
      </div>
      <p style={{ fontSize: 16, color: 'var(--color-text-muted)', maxWidth: 320 }}>
        This page doesn't exist.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          padding: '9px 22px',
          borderRadius: 8,
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-surface)',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        ← Back to jobs
      </Link>
    </div>
  );
}
