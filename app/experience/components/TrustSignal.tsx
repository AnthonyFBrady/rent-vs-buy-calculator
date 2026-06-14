'use client';

interface Props {
  children: React.ReactNode;
  href?: string;
  linkText?: string;
}

export function TrustSignal({ children, href = '/methodology', linkText = 'Methodology' }: Props) {
  return (
    <p
      style={{
        marginTop: '10px',
        fontSize: '11px',
        lineHeight: 1.55,
        color: 'var(--color-text-faint)',
      }}
    >
      {children}
      {href && (
        <>
          {' '}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-text-muted)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            {linkText} →
          </a>
        </>
      )}
    </p>
  );
}
