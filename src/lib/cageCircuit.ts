import { createCageFight, stepCageFight, type CageFight, type CageInput, type CageStyle } from './cageClash';

export const CAGE_CIRCUIT_STYLES: CageStyle[] = ['balanced', 'striker', 'grappler'];
export interface CageCircuit {
  fight: CageFight;
  stage: number;
  seed: number;
  results: NonNullable<CageFight['result']>[];
}

export function createCageCircuit(style: CageStyle, seed: number): CageCircuit {
  return { fight: createCageFight(style, CAGE_CIRCUIT_STYLES[0], seed), stage: 0, seed, results: [] };
}

export function stepCageCircuit(state: CageCircuit, input: CageInput): CageCircuit {
  if (state.fight.phase !== 'fight') return state;
  const fight = stepCageFight(state.fight, input);
  return { ...state, fight, results: fight.result ? [...state.results, { ...fight.result }] : state.results };
}

export function isCageCircuitComplete(state: CageCircuit): boolean {
  return state.fight.phase === 'finished' && Boolean(state.fight.result)
    && (state.fight.result!.winner !== 'player' || state.stage === CAGE_CIRCUIT_STYLES.length - 1);
}

export function advanceCageCircuit(state: CageCircuit): CageCircuit {
  if (state.fight.phase !== 'finished' || state.fight.result?.winner !== 'player'
    || state.stage >= CAGE_CIRCUIT_STYLES.length - 1) return state;
  const stage = state.stage + 1;
  return { ...state, stage, fight: createCageFight(state.fight.player.style, CAGE_CIRCUIT_STYLES[stage], (state.seed + stage) >>> 0) };
}

export function cageCircuitScore(state: CageCircuit): number {
  return isCageCircuitComplete(state) ? Math.round(state.results.reduce((sum, result) => sum + result.score, 0) / CAGE_CIRCUIT_STYLES.length) : 0;
}
