'use client';

import { useState } from 'react';
import { ReckonSignature } from '@/components/ReckonSignature';
import { BottomSheet } from '@/components/BottomSheet';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="5.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.8 6.8C6.8 5.6 7.8 4.8 9 4.8s2.2.8 2.2 2c0 1.4-2.2 1.8-2.2 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="13" r="0.9" fill="currentColor" />
    </svg>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s',
};

export function NavRail() {
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <>
      {/* Desktop: fixed left rail */}
      <div
        className="hidden lg:flex"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '52px',
          backgroundColor: 'var(--color-bg)',
          borderRight: '1px solid var(--color-outline)',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0 16px',
          zIndex: 20,
          gap: 0,
        }}
      >
        <a href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none' }}>
          <ReckonSignature color="var(--color-text)" width={28} />
        </a>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setMethodologyOpen(true)}
            title="How this works"
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-outline)'; e.currentTarget.style.color = 'var(--color-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <InfoIcon />
          </button>
          <button
            onClick={() => setFaqOpen(true)}
            title="FAQ"
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-outline)'; e.currentTarget.style.color = 'var(--color-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <QuestionIcon />
          </button>
        </div>
      </div>

      {/* Mobile: fixed top bar */}
      <div
        className="flex lg:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '52px',
          backgroundColor: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-outline)',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 20,
          gap: '8px',
        }}
      >
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          <ReckonSignature color="var(--color-text)" width={60} />
        </a>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setMethodologyOpen(true)}
          title="How this works"
          style={iconBtnStyle}
        >
          <InfoIcon />
        </button>
        <button
          onClick={() => setFaqOpen(true)}
          title="FAQ"
          style={iconBtnStyle}
        >
          <QuestionIcon />
        </button>
      </div>

      <BottomSheet open={methodologyOpen} onClose={() => setMethodologyOpen(false)} eyebrow="Methodology" title="How this calculator thinks">
        <MethodologyContent />
      </BottomSheet>
      <BottomSheet open={faqOpen} onClose={() => setFaqOpen(false)} eyebrow="FAQ" title="Frequently asked questions">
        <FaqContent />
      </BottomSheet>
    </>
  );
}
