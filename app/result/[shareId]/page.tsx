import { notFound } from 'next/navigation';
import { simulate, simulateSensitivity } from '@/engine';
import { decodeShare } from '@/lib/share';
import { SharedResultClient } from './SharedResultClient';

interface Props {
  params: { shareId: string };
}

export async function generateMetadata({ params }: Props) {
  try {
    const snapshot = decodeShare(params.shareId);
    const result = simulate(snapshot.i);
    const adv = result.exit.netAdvantageToOwner;
    const winner = adv > 500 ? 'buying' : adv < -500 ? 'renting' : 'a near-tie';
    const abs = Math.abs(adv);
    const delta = abs >= 1_000_000
      ? `$${(abs / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
      ? `$${Math.round(abs / 1_000)}k`
      : `$${Math.round(abs)}`;

    return {
      title: `${winner === 'a near-tie' ? 'Tied' : winner.charAt(0).toUpperCase() + winner.slice(1) + ' ahead'} by ${delta} — Rent vs Buy`,
      description: `Rent vs buy result for a ${snapshot.i.holdingPeriodYears}-year horizon. ${winner.charAt(0).toUpperCase() + winner.slice(1)} comes out ${delta} ahead after exit costs.`,
      openGraph: {
        title: `${winner === 'a near-tie' ? 'Tied' : winner.charAt(0).toUpperCase() + winner.slice(1) + ' ahead'} by ${delta}`,
        description: `${snapshot.i.holdingPeriodYears}-year rent vs buy analysis`,
        images: [`/api/og?id=${params.shareId}`],
      },
    };
  } catch {
    return {
      title: 'Shared result — Rent vs Buy',
    };
  }
}

export default function SharedResultPage({ params }: Props) {
  let snapshot;
  try {
    snapshot = decodeShare(params.shareId);
  } catch {
    notFound();
  }

  const result = simulate(snapshot.i);
  const sensitivity = simulateSensitivity(snapshot.i);

  // Build scenario data matching the Zustand format
  const toPoints = (r: typeof result) => {
    let cum = 0;
    return [
      { year: 0, ownerValue: r.inputs.homePrice * r.inputs.downPaymentPct, renterValue: r.yearByYear[0]?.renterPortfolioStart ?? 0 },
      ...r.yearByYear.map((y) => {
        cum += y.ownerMoveTransactionCost;
        return { year: y.year, ownerValue: y.ownerEquity + y.ownerPortfolioEnd - cum, renterValue: y.renterPortfolioEnd + y.renterRrspBalance };
      }),
    ];
  };

  const scenarios = [
    { id: 'base' as const,     label: 'Base case',          ownerData: toPoints(sensitivity.base).map(p => ({ year: p.year, value: p.ownerValue })),      renterData: toPoints(sensitivity.base).map(p => ({ year: p.year, value: p.renterValue })) },
    { id: 'growth+2' as const, label: 'Home prices +2%/yr', ownerData: toPoints(sensitivity.ownerHigh).map(p => ({ year: p.year, value: p.ownerValue })), renterData: toPoints(sensitivity.ownerHigh).map(p => ({ year: p.year, value: p.renterValue })) },
    { id: 'growth-2' as const, label: 'Home prices -2%/yr', ownerData: toPoints(sensitivity.ownerLow).map(p => ({ year: p.year, value: p.ownerValue })),  renterData: toPoints(sensitivity.ownerLow).map(p => ({ year: p.year, value: p.renterValue })) },
    { id: 'rate+1' as const,   label: 'Returns +2%/yr',     ownerData: toPoints(sensitivity.renterHigh).map(p => ({ year: p.year, value: p.ownerValue })), renterData: toPoints(sensitivity.renterHigh).map(p => ({ year: p.year, value: p.renterValue })) },
    { id: 'rate-1' as const,   label: 'Returns -2%/yr',     ownerData: toPoints(sensitivity.renterLow).map(p => ({ year: p.year, value: p.ownerValue })),  renterData: toPoints(sensitivity.renterLow).map(p => ({ year: p.year, value: p.renterValue })) },
  ];

  return (
    <SharedResultClient
      inputs={snapshot.i}
      result={result}
      scenarios={scenarios}
      shareId={params.shareId}
    />
  );
}
