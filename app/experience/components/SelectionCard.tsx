'use client';

interface Props {
  selected: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
  note?: string;
  variant?: 'owner' | 'renter';
  compact?: boolean;
}

export function SelectionCard({ selected, onClick, label, sublabel, note, variant = 'owner', compact = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-colors duration-150"
      style={{
        height: compact ? '44px' : '52px',
        padding: '0 14px',
        borderRadius: '10px',
        border: `1px solid ${selected ? 'var(--color-outline-active)' : 'var(--color-outline)'}`,
        backgroundColor: selected ? 'var(--color-surface-raised)' : 'var(--color-surface)',
        color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--color-outline-active)';
          e.currentTarget.style.color = 'var(--color-text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--color-outline)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }
      }}
    >
      <p className="text-sm font-medium">{label}</p>
      {sublabel && (
        <p className="hidden sm:block text-xs" style={{ opacity: 0.65 }}>{sublabel}</p>
      )}
      {note && (
        <p className="hidden sm:block text-[10px]" style={{ opacity: 0.45 }}>{note}</p>
      )}
    </button>
  );
}
