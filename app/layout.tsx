import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  axes: ['opsz'],
  display: 'swap',
});

const SITE_NAME = 'Rent vs Buy — Canadian Calculator';
const DESCRIPTION =
  'A Canada-only rent vs buy decision tool, inspired by Ben Felix\'s framework. The 5% Rule, year-by-year wealth comparison, full Canadian tax model. Every assumption editable. Every source linked.';

export const metadata: Metadata = {
  metadataBase: new URL('https://rent-vs-buy.example.com'),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'rent vs buy',
    'rent or buy',
    'Canadian rent vs buy calculator',
    'Ben Felix',
    'PWL Capital',
    'Principal Residence Exemption',
    '5% Rule',
    'mortgage calculator',
    'real estate calculator',
  ],
  authors: [{ name: 'Anthony Brady' }],
  creator: 'Anthony Brady',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport = {
  themeColor: '#F5F3EF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:bg-white focus:px-3 focus:py-1 focus:text-sm focus:outline-none focus:ring-2 focus:ring-ink"
        >
          Skip to main content
        </a>
      </body>
    </html>
  );
}
