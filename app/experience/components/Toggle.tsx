'use client';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  impact?: string | null;
  accentColor?: string;
}

export function Toggle({ checked, onChange, label, description, impact, accentColor = 'var(--color-owner)' }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-4 py-1">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className="h-5 w-9 rounded-full transition-colors duration-200"
          style={{ backgroundColor: checked ? accentColor : 'var(--color-outline)' }}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
            style={{ backgroundColor: 'var(--color-surface)' }}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)' }}>{label}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>{description}</p>
        )}
        {impact && checked && (
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--color-renter)' }}>{impact}</p>
        )}
      </div>
    </label>
  );
}
