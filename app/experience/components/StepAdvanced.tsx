'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  label?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function StepAdvanced({ label = 'Advanced', children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginTop: '24px' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontSize: '12px',
          color: 'var(--color-text-faint)',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          letterSpacing: '-0.01em',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease',
            fontSize: '9px',
            opacity: 0.7,
          }}
        >
          ▶
        </span>
        {label}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.0, 0.0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                paddingTop: '16px',
                paddingLeft: '12px',
                borderLeft: '2px solid var(--color-outline)',
                marginTop: '12px',
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
