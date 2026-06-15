'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onComplete: () => void;
}

export function HomeLoader({ onComplete }: Props) {
  const [visible, setVisible] = useState(true);
  const [wordmarkIn, setWordmarkIn] = useState(false);

  useEffect(() => {
    // Line draws over 1.4s → arrowhead pops at 1.3s → wordmark slides in at 1.5s → fade out at 2.6s
    const t1 = setTimeout(() => setWordmarkIn(true), 1500);
    const t2 = setTimeout(() => setVisible(false), 2700);
    const t3 = setTimeout(() => {
      sessionStorage.setItem('reckon_loaded', '1');
      onComplete();
    }, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: '#0F0F11',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/*
            Flex row: [SVG line ending with arrowhead] [Reckon wordmark]
            Path ends at y=35 — exact vertical center of the 70px-tall SVG.
            Text aligned via flexbox center, so it sits flush with the arrowhead.
          */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg
              viewBox="0 0 224 70"
              width="224"
              height="70"
              aria-hidden="true"
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Wealth line: rises from bottom-left, levels at the vertical center */}
              <motion.path
                d="M 10 60 C 40 60, 60 52, 86 44 C 112 36, 136 35, 166 35 C 186 35, 200 35, 212 35"
                fill="none"
                stroke="var(--color-owner)"
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
              />
              {/*
                Arrowhead — tip at (222, 35), base at x=212, spanning y 30–40.
                Pops in just before the line finishes drawing.
              */}
              <motion.polygon
                points="222,35 212,30 212,40"
                fill="var(--color-owner)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.2, ease: [0.0, 0.0, 0.2, 1] }}
              />
            </svg>

            {/* Reckon wordmark — slides in from the left, directly after the arrowhead */}
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: wordmarkIn ? 1 : 0,
                x: wordmarkIn ? 0 : -8,
              }}
              transition={{ duration: 0.38, ease: [0.0, 0.0, 0.2, 1] }}
              style={{
                fontSize: '19px',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: '#FAFAFA',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                marginLeft: '11px',
                lineHeight: 1,
              }}
            >
              Reckon
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
