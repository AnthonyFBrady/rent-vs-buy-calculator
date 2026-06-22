'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Small uppercase label above the title (e.g. "Methodology"). */
  eyebrow: string;
  /** Serif heading for the sheet. */
  title: string;
  children: ReactNode;
}

/**
 * Dark bottom-sheet drawer with a scrim, grab handle, header, and scroll body.
 * Single source of truth for the Methodology / FAQ / Assumptions drawers used
 * across the experience and result pages. Tokens drive all colors so it follows
 * the global dark theme automatically.
 */
export function BottomSheet({ open, onClose, eyebrow, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 50 }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
            style={{ position: 'fixed', bottom: 0, left: 'clamp(8px, 3vw, 32px)', right: 'clamp(8px, 3vw, 32px)', maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 51, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '9999px', backgroundColor: 'var(--color-outline-active)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 12px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '2px' }}>{eyebrow}</p>
                <p style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>{title}</p>
              </div>
              <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, padding: '0 20px 40px' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
