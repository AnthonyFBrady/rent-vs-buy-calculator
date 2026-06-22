// Bank of Canada VALET API — 5-year conventional mortgage rate.
// Series V122514: "Chartered bank administered interest rates — conventional mortgage, 5 year"
// Source: https://www.bankofcanada.ca/valet/observations/V122514/json?recent=1
// Cached 24 hours. Falls back to the hardcoded default in engine/data/limits.ts if unavailable.

import { NextResponse } from 'next/server';

export const revalidate = 86400; // 24 hours

const BOC_VALET_URL =
  'https://www.bankofcanada.ca/valet/observations/V122514/json?recent=1';

const FALLBACK_RATE = 0.05; // June 2026 placeholder — updated by live fetch in production

export async function GET() {
  try {
    const res = await fetch(BOC_VALET_URL, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`BoC VALET returned ${res.status}`);

    const json = await res.json();
    // The VALET response shape: { observations: [{ d: '2026-06-18', V122514: { v: '6.70' } }] }
    const observations = json?.observations;
    if (!Array.isArray(observations) || observations.length === 0) {
      throw new Error('No observations in BoC response');
    }

    const latest = observations[observations.length - 1];
    const raw = latest?.V122514?.v;
    if (!raw) throw new Error('Missing rate value in BoC response');

    // BoC posts the rate as a percentage (e.g. "6.70"), convert to decimal
    const rate = parseFloat(raw) / 100;
    if (!isFinite(rate) || rate <= 0 || rate > 0.25) {
      throw new Error(`Implausible rate value: ${raw}`);
    }

    return NextResponse.json({
      rate,
      asOf: latest.d,
      source: 'Bank of Canada — 5-year conventional mortgage rate (V122514)',
    });
  } catch {
    return NextResponse.json(
      {
        rate: FALLBACK_RATE,
        asOf: null,
        source: 'Fallback — Bank of Canada API unavailable',
        fallback: true,
      },
      { status: 200 }, // Return 200 so the UI can use the fallback without error handling
    );
  }
}
