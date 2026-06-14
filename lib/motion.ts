export const ease = {
  out:   [0.0, 0.0, 0.2, 1.0] as const,
  in:    [0.4, 0.0, 1.0, 1.0] as const,
  inOut: [0.4, 0.0, 0.2, 1.0] as const,
};

// Named aliases for backward compatibility
export const easeOut   = ease.out;
export const easeIn    = ease.in;
export const easeInOut = ease.inOut;

export const spring = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 28,
};

export const springSnappy = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 35,
};

export const fadeInUp = {
  initial:    { opacity: 0, y: 14 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: ease.out },
};

export const fadeIn = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: 0.25, ease: ease.out },
};

export const stagger = { staggerChildren: 0.07 };
export const staggerFast = { staggerChildren: 0.04 };
