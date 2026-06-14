'use client';

import { WealthChart } from '@/components/chart/WealthChart';

interface Props {
  ownerData: { year: number; value: number }[];
  renterData: { year: number; value: number }[];
  breakEvenYear: number | null;
  holdingPeriodYears: number;
}

export function CityChart({ ownerData, renterData, breakEvenYear, holdingPeriodYears }: Props) {
  return (
    <WealthChart
      ownerData={ownerData}
      renterData={renterData}
      breakEvenYear={breakEvenYear}
      holdingPeriodYears={holdingPeriodYears}
      height={320}
    />
  );
}
