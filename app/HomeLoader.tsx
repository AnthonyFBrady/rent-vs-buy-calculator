'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReckonSignature } from '@/components/ReckonSignature';

interface Props {
  onComplete: () => void;
}

export function HomeLoader({ onComplete }: Props) {
  const [visible, setVisible] = useState(true);
  const [sigIn, setSigIn] = useState(false);

  useEffect(() => {
    // Gold line draws 0–1.4s
    // Signature starts at 1.2s (overlaps line end) and draws over ~1.0s
    // Loader fades out at 2.7s, onComplete at 3.1s
    const t1 = setTimeout(() => setSigIn(true), 1200);
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
          <div style={{ position: 'relative', width: '280px', height: '90px' }}>
            {/* Gold wealth line — draws left to right */}
            <svg
              viewBox="0 0 280 70"
              width="280"
              height="70"
              aria-hidden="true"
              style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
            >
              <motion.path
                d="M 10 60 C 40 60, 60 52, 86 44 C 112 36, 136 35, 166 35 C 186 35, 200 35, 262 35"
                fill="none"
                stroke="var(--color-owner)"
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
              />
              {/* Arrowhead tip at (270, 35) pointing right */}
              <motion.polygon
                points="270,35 262,31 262,39"
                fill="var(--color-owner)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.2, ease: [0.0, 0.0, 0.2, 1] }}
              />
            </svg>

            {/* White signature scribbles over the gold line */}
            {sigIn && (
              <div style={{
                position: 'absolute',
                top: '14px',
                left: '30px',
              }}>
                <ReckonSignature
                  animate
                  color="#FAFAFA"
                  width={210}
                  duration={1.0}
                  delay={0}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
