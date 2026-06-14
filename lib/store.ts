// Calculator state store. Persists results across routes (experience/ → /result).
// The step navigation reducer in experience/page.tsx stays local — this store
// only holds what the result page needs to render without re-running the engine.

import { create } from 'zustand';
import type { CalculatorInputs, SimulationResult } from '@/engine';

export interface SensitivityScenario {
  id: 'base' | 'rate+1' | 'rate-1' | 'growth+2' | 'growth-2';
  label: string;
  ownerData: { year: number; value: number }[];
  renterData: { year: number; value: number }[];
}

interface CalculatorStore {
  inputs: CalculatorInputs | null;
  result: SimulationResult | null;
  sensitivity: SensitivityScenario[];
  activeSensitivity: SensitivityScenario['id'];
  setResult: (
    inputs: CalculatorInputs,
    result: SimulationResult,
    sensitivity: SensitivityScenario[],
  ) => void;
  setActiveSensitivity: (id: SensitivityScenario['id']) => void;
  reset: () => void;
}

export const useCalculatorStore = create<CalculatorStore>((set) => ({
  inputs: null,
  result: null,
  sensitivity: [],
  activeSensitivity: 'base',

  setResult: (inputs, result, sensitivity) =>
    set({ inputs, result, sensitivity, activeSensitivity: 'base' }),

  setActiveSensitivity: (id) => set({ activeSensitivity: id }),

  reset: () =>
    set({ inputs: null, result: null, sensitivity: [], activeSensitivity: 'base' }),
}));
