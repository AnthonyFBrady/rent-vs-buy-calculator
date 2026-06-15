import Link from 'next/link';
import { MethodologyContent } from '@/components/MethodologyContent';

export const metadata = {
  title: 'Methodology — longrun.ca',
  description:
    "The framework, formulas, and academic citations behind this calculator. Built on Ben Felix's 5% rule with full Canadian tax model.",
};

export default function MethodologyPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--color-outline)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--color-bg)',
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
            textDecoration: 'none',
          }}
        >
          longrun.ca
        </Link>
        <Link
          href="/experience"
          style={{
            height: '34px',
            padding: '0 16px',
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Calculator →
        </Link>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Header */}
        <header style={{ paddingTop: '52px', paddingBottom: '44px', borderBottom: '1px solid var(--color-outline)' }}>
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
              marginBottom: '16px',
            }}
          >
            Methodology
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--color-text)',
              marginBottom: '20px',
            }}
          >
            How this calculator thinks
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.7,
              maxWidth: '540px',
            }}
          >
            Every assumption is editable. Every claim has a source. Below is the math the
            calculator runs and the research it stands on.
          </p>
        </header>

        <MethodologyContent />

        <footer
          style={{
            borderTop: '1px solid var(--color-outline)',
            paddingTop: '24px',
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            ← Back to home
          </Link>
          <Link
            href="/experience"
            style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            Run the calculator
          </Link>
        </footer>
      </div>
    </div>
  );
}
