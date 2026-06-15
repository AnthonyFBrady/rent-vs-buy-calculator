import type { ReactNode } from 'react';

export const metadata = {
  title: 'Reckon — Run the numbers',
  description:
    'The real cost of owning versus renting in Canada. Evidence-based math, every assumption editable.',
};

export default function ExperienceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
