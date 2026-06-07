import type { ReactNode } from 'react';

export const metadata = {
  title: 'Rent or Buy — Build Your Financial Future',
  description:
    'An interactive, graph-first rent vs buy calculator for Canada. See the real cost of each choice, built on evidence-based math.',
};

export default function ExperienceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
