import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { simulate } from '@/engine';
import { decodeShare } from '@/lib/share';

export const runtime = 'edge';

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? '';

  let verdictText = 'Reckon';
  let deltaText = 'Run your own numbers';
  let winnerColor = '#A1A1AA';
  let horizonText = '';

  if (id) {
    try {
      const snapshot = decodeShare(id);
      const result = simulate(snapshot.i);
      const adv = result.exit.netAdvantageToOwner;
      const winner = adv > 500 ? 'buy' : adv < -500 ? 'rent' : 'tie';
      const delta = fmt(Math.abs(adv));

      verdictText = winner === 'buy' ? 'Buying comes out ahead' : winner === 'rent' ? 'Renting comes out ahead' : 'Roughly tied';
      deltaText = winner === 'tie' ? `Within ${fmt(Math.abs(adv))} either way` : `${delta} ahead after ${snapshot.i.holdingPeriodYears} years`;
      winnerColor = winner === 'buy' ? '#1B4F72' : winner === 'rent' ? '#1E8449' : '#A1A1AA';
      horizonText = `${snapshot.i.holdingPeriodYears}-year horizon`;
    } catch {
      // fall through to defaults
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          backgroundColor: '#0F0F11',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top label */}
        <div style={{ display: 'flex', marginBottom: '32px' }}>
          <span style={{ fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525B' }}>
            {horizonText || 'Reckon'}
          </span>
        </div>

        {/* Verdict */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <span
            style={{
              fontSize: '64px',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              color: winnerColor,
            }}
          >
            {verdictText}
          </span>
        </div>

        {/* Delta */}
        <div style={{ display: 'flex' }}>
          <span
            style={{
              fontSize: '44px',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#FAFAFA',
            }}
          >
            {deltaText}
          </span>
        </div>

        {/* Bottom wordmark */}
        <div
          style={{
            position: 'absolute',
            bottom: '52px',
            right: '96px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 500, color: '#52525B', letterSpacing: '-0.02em' }}>
            Reckon
          </span>
        </div>

        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: '0',
            top: '80px',
            bottom: '80px',
            width: '4px',
            backgroundColor: winnerColor,
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
