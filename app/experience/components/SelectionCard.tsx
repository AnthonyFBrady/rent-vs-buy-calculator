'use client';

interface Props {
  selected: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
  note?: string;
  variant?: 'owner' | 'renter';
}

export function SelectionCard({ selected, onClick, label, sublabel, note, variant = 'owner' }: Props) {
  const accentColor = variant === 'renter' ? 'var(--color-renter)' : 'var(--color-owner)';
  const accentBg = variant === 'renter' ? 'rgba(108,191,184,0.10)' : 'rgba(232,200,122,0.10)';
  const accentBorder = variant === 'renter' ? 'var(--color-renter)' : 'var(--color-owner)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm px-3 py-3 text-left transition-colors duration-150"
      style={{
        border: `1px solid ${selected ? accentBorder : 'var(--color-outline)'}`,
        backgroundColor: selected ? accentBg : 'transparent',
        color: selected ? accentColor : 'var(--color-text-muted)',
        opacity: selected ? 1 : 0.7,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.borderColor = 'var(--color-outline-active)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.opacity = '0.7';
          e.currentTarget.style.borderColor = 'var(--color-outline)';
        }
      }}
    >
      <p className="text-sm font-medium">{label}</p>
      {sublabel && <p className="mt-0.5 text-xs" style={{ opacity: 0.75 }}>{sublabel}</p>}
      {note && <p className="mt-0.5 text-[10px]" style={{ opacity: 0.55 }}>{note}</p>}
    </button>
  );
}
