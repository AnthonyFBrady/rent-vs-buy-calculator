'use client';

import { useId, useState } from 'react';

interface Props {
  label: string;
  children: React.ReactNode;
}

/**
 * Accessible inline help tooltip.
 *
 * Renders a small "i" badge next to the input label. Hover or focus reveals
 * the explanation. Keyboard accessible via Tab + Enter / Space.
 */
export function InfoTooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`More info: ${label}`}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink/30 text-[10px] font-medium text-ink/60 hover:border-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-6 top-0 z-10 w-64 rounded-sm border border-ink/15 bg-white px-3 py-2 text-xs leading-relaxed text-ink/80 shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
