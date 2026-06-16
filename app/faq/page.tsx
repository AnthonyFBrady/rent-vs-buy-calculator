'use client';

import Link from 'next/link';
import { FaqContent } from '@/components/FaqContent';

export default function FAQPage() {
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
          reckon
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
            FAQ
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--color-text)',
            }}
          >
            Frequently asked questions
          </h1>
        </header>

        <div style={{ paddingTop: '8px' }}>
          <FaqContent />
        </div>

        <footer
          style={{
            borderTop: '1px solid var(--color-outline)',
            paddingTop: '24px',
            marginTop: '24px',
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Back to home
          </Link>
          <Link href="/methodology" style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Methodology
          </Link>
          <Link href="/experience" style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Run the calculator
          </Link>
        </footer>
      </div>
    </div>
  );
}
