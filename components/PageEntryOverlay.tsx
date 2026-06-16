'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function PageEntryOverlay() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ y: '-100%', transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] } }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: '#0F0F11',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}
