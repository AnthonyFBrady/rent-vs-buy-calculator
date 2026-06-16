import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '700', '900'],
  style: ['normal', 'italic'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const SITE_NAME = 'reckon';
const DESCRIPTION =
  "Canada's rent vs buy calculator. The explicit costs of renting are obvious. The implicit costs of owning are not. reckon with the real math. Every assumption editable. Every formula cited.";

export const metadata: Metadata = {
  metadataBase: new URL('https://reckon.ca'),
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
  themeColor: '#FAF9F7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-CA" className={cn("font-sans", dmSans.variable, playfair.variable)}>
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
