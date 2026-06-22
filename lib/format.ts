// Shared formatting + verdict helpers. Single source so the experience flow,
// the result page, and the shared result page agree on wealth display and the
// buy/rent/tie call.

/** Compact wealth display: $1.23M, $45k, $320. Uses a true minus sign. */
export function fmtWealth(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export type Verdict = 'buy' | 'rent' | 'tie';

/**
 * The buy/rent/tie call from the owner's net advantage at exit. The $500 dead
 * band keeps near-ties from flipping the verdict on rounding noise.
 */
export function verdict(netAdvantageToOwner: number): Verdict {
  if (netAdvantageToOwner > 500) return 'buy';
  if (netAdvantageToOwner < -500) return 'rent';
  return 'tie';
}
