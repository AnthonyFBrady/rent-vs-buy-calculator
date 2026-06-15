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
    const t1 = setTimeout(() => setSigIn(true), 1200);
    const t2 = setTimeout(() => setVisible(false), 2500);
    const t3 = setTimeout(() => {
      sessionStorage.setItem('reckon_loaded', '1');
      onComplete();
    }, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: '#0F0F11',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '320px', height: '148px' }}>

            {/* Two crossing wealth trajectories */}
            <svg
              viewBox="0 0 320 90"
              width="320"
              height="90"
              aria-hidden="true"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Renter (teal): starts high, advantage erodes, ends lower */}
              <motion.path
                d="M 12 18 C 60 18, 100 24, 140 36 C 175 47, 220 54, 308 58"
                fill="none"
                stroke="#10B981"
                strokeWidth={2.2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              />

              {/* Owner (gold): starts low, equity builds, ends higher */}
              <motion.path
                d="M 12 70 C 60 68, 100 58, 140 45 C 175 34, 220 24, 308 18"
                fill="none"
                stroke="#F59E0B"
                strokeWidth={2.2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              />

              {/* Endpoint dots — spring in after lines complete */}
              <motion.circle
                cx="308" cy="58" r="4.5"
                fill="#10B981"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.15, type: 'spring', stiffness: 260, damping: 18 }}
              />
              <motion.circle
                cx="308" cy="18" r="4.5"
                fill="#F59E0B"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.15, type: 'spring', stiffness: 260, damping: 18 }}
              />
            </svg>

            {/* Reckon wordmark — reveals centered below the chart */}
            {sigIn && (
              <div style={{
                position: 'absolute',
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}>
                <ReckonSignature
                  animate
                  color="#FAFAFA"
                  width={200}
                  duration={0.95}
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
