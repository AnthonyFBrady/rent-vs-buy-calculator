import { describe, it, expect } from 'vitest';
import { defaultInputsFor } from './index';
import {
  scoreLifestyle,
  applyLifestyleToInputs,
  deriveCashFlowComfort,
} from './lifestyle';

describe('scoreLifestyle', () => {
  it('scores every dimension neutral when nothing is answered', () => {
    const score = scoreLifestyle({});
    expect(score.dimensions).toHaveLength(6);
    expect(score.dimensions.every((d) => !d.answered && d.lean === 0)).toBe(true);
    expect(score.overall).toBe('balanced');
    expect(score.dominant).toEqual([]);
  });

  it('inverts discipline: high discipline leans rent, low discipline leans buy', () => {
    const disciplined = scoreLifestyle({ discipline: 4 }).dimensions.find((d) => d.dimension === 'discipline')!;
    const spender = scoreLifestyle({ discipline: 0 }).dimensions.find((d) => d.dimension === 'discipline')!;
    expect(disciplined.lean).toBeLessThan(0); // rent
    expect(disciplined.label).toBe('rent');
    expect(spender.lean).toBeGreaterThan(0); // buy
    expect(spender.label).toBe('buy');
  });

  it('maps mobility the intuitive way: rooted leans buy, mobile leans rent', () => {
    const rooted = scoreLifestyle({ mobility: 4 }).dimensions.find((d) => d.dimension === 'mobility')!;
    const mobile = scoreLifestyle({ mobility: 0 }).dimensions.find((d) => d.dimension === 'mobility')!;
    expect(rooted.lean).toBeGreaterThan(0);
    expect(mobile.lean).toBeLessThan(0);
  });

  it('picks the strongest answered dimensions as dominant', () => {
    const score = scoreLifestyle({ mobility: 0, controlValue: 2, discipline: 2 });
    // mobility is the only strong pull (|lean| >= 0.5); controlValue/discipline are neutral.
    expect(score.dominant).toEqual(['mobility']);
  });

  it('reports an overall rent lean when answers point that way', () => {
    const score = scoreLifestyle({ mobility: 0, maintenanceTolerance: 0, discipline: 4 });
    expect(['rent', 'lean-rent']).toContain(score.overall);
  });

  it('clamps out-of-range answers instead of producing leans beyond [-1, 1]', () => {
    const score = scoreLifestyle({ mobility: 99 });
    const mobility = score.dimensions.find((d) => d.dimension === 'mobility')!;
    expect(mobility.lean).toBeLessThanOrEqual(1);
    expect(mobility.lean).toBeGreaterThanOrEqual(-1);
  });
});

describe('applyLifestyleToInputs', () => {
  it('maps discipline to the 50%..100% savings lever on both sides', () => {
    const base = defaultInputsFor('ON');
    const low = applyLifestyleToInputs(base, { discipline: 0 });
    const high = applyLifestyleToInputs(base, { discipline: 4 });
    expect(low.savingsDisciplinePct).toBeCloseTo(0.5, 5);
    expect(low.renterSavingsDisciplinePct).toBeCloseTo(0.5, 5);
    expect(high.savingsDisciplinePct).toBeCloseTo(1.0, 5);
  });

  it('maps mobility to owner moves: rooted is 0, likely-to-move is 2', () => {
    const base = defaultInputsFor('ON');
    expect(applyLifestyleToInputs(base, { mobility: 4 }).ownerMoves).toBe(0);
    expect(applyLifestyleToInputs(base, { mobility: 0 }).ownerMoves).toBe(2);
  });

  it('leaves inputs untouched for unanswered or non-lever dimensions', () => {
    const base = defaultInputsFor('ON');
    const next = applyLifestyleToInputs(base, { controlValue: 4, concentrationTolerance: 0 });
    expect(next.savingsDisciplinePct).toBe(base.savingsDisciplinePct);
    expect(next.ownerMoves).toBe(base.ownerMoves);
  });
});

describe('deriveCashFlowComfort', () => {
  it('reads low carry as comfortable and high carry as strained', () => {
    const income = 120_000; // 10k gross per month
    const comfortable = deriveCashFlowComfort(2_500, income); // ~0.25 ratio
    const strained = deriveCashFlowComfort(5_500, income); // ~0.55 ratio
    expect(comfortable).toBeGreaterThan(0);
    expect(strained).toBeLessThan(0);
  });

  it('stays within [-1, 1]', () => {
    expect(deriveCashFlowComfort(50_000, 60_000)).toBeGreaterThanOrEqual(-1);
    expect(deriveCashFlowComfort(100, 200_000)).toBeLessThanOrEqual(1);
  });
});
