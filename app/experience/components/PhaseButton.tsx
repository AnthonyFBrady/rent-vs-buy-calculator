'use client';

interface Props {
  variant?: 'primary' | 'ghost' | 'cta';
  onClick?: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}

export function PhaseButton({ variant = 'primary', onClick, children, fullWidth = true, type = 'button' }: Props) {
  const base = 'rounded-md h-[56px] text-sm font-medium tracking-[-0.01em] cursor-pointer border-none transition-opacity duration-150 hover:opacity-85';
  const widthClass = fullWidth ? 'w-full' : '';

  let colorStyle: React.CSSProperties;
  if (variant === 'cta') {
    colorStyle = { backgroundColor: 'var(--color-accent-cta)', color: '#1C1B1B' };
  } else if (variant === 'ghost') {
    colorStyle = { backgroundColor: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-outline)' };
  } else {
    colorStyle = { backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-btn-primary-text)' };
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${widthClass}`}
      style={colorStyle}
    >
      {children}
    </button>
  );
}
