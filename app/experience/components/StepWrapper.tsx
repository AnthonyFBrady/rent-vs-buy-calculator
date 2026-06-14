'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface StepWrapperProps {
  heading: React.ReactNode;
  headingVariant?: 'default' | 'cinematic';
  description?: React.ReactNode;
  children?: React.ReactNode;
  enterY?: number;
  exitY?: number;
}

export function StepWrapper({
  heading,
  headingVariant = 'default',
  description,
  children,
  enterY = 10,
  exitY = -6,
}: StepWrapperProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: enterY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: exitY }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        style={{ outline: 'none' }}
        className={headingVariant === 'cinematic' ? 'step-heading-cinematic' : 'step-heading'}
      >
        {heading}
      </h2>
      {description && (
        <p className="step-desc" aria-live="polite">
          {description}
        </p>
      )}
      {children}
    </motion.div>
  );
}
