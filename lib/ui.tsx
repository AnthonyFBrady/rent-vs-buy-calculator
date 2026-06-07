'use client';

// Shared UI primitives for the experience flow.
// All components are unstyled-first and accept isDark for theme context.

import { colors } from './tokens';

// ─── SliderField ───────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  accent?: string;
  hint?: string;
  minLabel?: string;
  maxLabel?: string;
  displayColor?: string;
}

export function SliderField({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  accent = colors.ownerGold,
  hint,
  minLabel,
  maxLabel,
  displayColor,
}: SliderFieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="mb-2 text-xs uppercase tracking-widest opacity-50">{label}</p>
        <span
          className="mb-2 font-serif text-2xl tabular-nums"
          style={displayColor ? { color: displayColor } : undefined}
        >
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{ accentColor: accent }}
      />
      {(minLabel || maxLabel) && (
        <div className="mt-1 flex justify-between text-xs opacity-35">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      {hint && (
        <p className="mt-2 text-xs leading-relaxed opacity-50">{hint}</p>
      )}
    </div>
  );
}

// ─── ToggleField ───────────────────────────────────────────────────────────

interface ToggleFieldProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  impact?: string | null;
}

export function ToggleField({ checked, onChange, label, description, impact }: ToggleFieldProps) {
  return (
    <label className="flex cursor-pointer items-start gap-4 py-1">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`h-5 w-9 rounded-full transition-colors duration-200 ${checked ? 'bg-[#E8C87A]' : 'bg-white/15'}`}>
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium leading-snug">{label}</p>
        <p className="mt-1 text-xs leading-relaxed opacity-45">{description}</p>
        {impact && checked && (
          <p className="mt-1 text-xs font-medium" style={{ color: '#6CBFB8' }}>{impact}</p>
        )}
      </div>
    </label>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs uppercase tracking-widest opacity-50">{children}</p>
  );
}

// ─── HintCard ─────────────────────────────────────────────────────────────

interface HintCardProps {
  color: string;
  children: React.ReactNode;
}

export function HintCard({ color, children }: HintCardProps) {
  return (
    <div
      className="mt-3 rounded-sm px-3 py-2.5"
      style={{
        border: `1px solid ${color}20`,
        backgroundColor: `${color}06`,
      }}
    >
      {children}
    </div>
  );
}
