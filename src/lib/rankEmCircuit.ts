import { dailyDraw } from '@/lib/dateUtils';
import { RANK_ROUNDS, scoreRankGuess, type RankRound } from '@/lib/orderTheList';

export const CIRCUIT_SAVE_KEY = 'rank-em-legends-circuit-v1';
export const CIRCUIT_SPORTS = ['NBA', 'NHL', 'MLB'] as const;
export const CIRCUIT_ROUND_IDS = ['nba-pts', 'nba-reb', 'nba-blk', 'nba-gp', 'nhl-pts', 'nhl-ast', 'nhl-gp', 'mlb-hr', 'mlb-sb-circuit'] as const;
const STOLEN_BASE_ROUND: RankRound = {
  id: 'mlb-sb-circuit', sport: 'MLB', statLabel: 'career stolen bases', unit: 'SB',
  items: [
    { name: 'Rickey Henderson', value: 1406 }, { name: 'Lou Brock', value: 938 },
    { name: 'Tim Raines', value: 808 }, { name: 'Vince Coleman', value: 752 },
    { name: 'Kenny Lofton', value: 622 },
  ],
  source: 'MLB career stolen-base leaders and Baseball-Reference, checked 2026-10-03',
};
export type CircuitPhase = 'intro' | 'playing' | 'reveal' | 'done';
export interface CircuitState {
  v: 1;
  excludedDailyId: string;
  roundIds: string[];
  seeds: number[];
  index: number;
  phase: CircuitPhase;
  drafts: string[][];
  orders: (string[] | null)[];
}

export const circuitRoundById = (id: string): RankRound | undefined => id === STOLEN_BASE_ROUND.id ? STOLEN_BASE_ROUND : RANK_ROUNDS.find(round => round.id === id);
const excluded = (id: string, dailyId: string) => id === dailyId || id === 'mlb-sb-circuit' && dailyId === 'mlb-sb';
const validDraft = (draft: unknown, round: RankRound): draft is string[] => Array.isArray(draft)
  && draft.length <= 5 && new Set(draft).size === draft.length
  && Array.from(draft).every(name => typeof name === 'string' && round.items.some(item => item.name === name));
const uint = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffffff;

/** Accept a parsed document or JSON text. Only canonical names and reachable phases survive. */
export function parseCircuit(raw: unknown): CircuitState | null {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.v !== 1) return null;
    if (Object.keys(value).sort().join(',') !== 'drafts,excludedDailyId,index,orders,phase,roundIds,seeds,v') return null;
    if (typeof value.excludedDailyId !== 'string' || !RANK_ROUNDS.some(round => round.id === value.excludedDailyId)) return null;
    if (!Array.isArray(value.roundIds) || value.roundIds.length !== 3 || new Set(value.roundIds).size !== 3
      || !Array.isArray(value.seeds) || value.seeds.length !== 3 || !Array.from(value.seeds).every(uint)
      || !Array.isArray(value.drafts) || value.drafts.length !== 3
      || !Array.isArray(value.orders) || value.orders.length !== 3) return null;
    if (!Number.isInteger(value.index) || value.index < 0 || value.index > 2
      || !['intro', 'playing', 'reveal', 'done'].includes(value.phase)) return null;
    if (value.phase === 'intro' && value.index !== 0 || value.phase === 'done' && value.index !== 2) return null;
    for (let index = 0; index < 3; index += 1) {
      const id = value.roundIds[index];
      if (!CIRCUIT_ROUND_IDS.includes(id) || excluded(id, value.excludedDailyId)) return null;
      const round = circuitRoundById(id)!;
      if (round.sport !== CIRCUIT_SPORTS[index] || !validDraft(value.drafts[index], round)) return null;
      const locked = index < value.index || value.phase === 'done' || index === value.index && value.phase === 'reveal';
      const order = value.orders[index];
      if (locked) {
        if (!validDraft(order, round) || order.length !== 5 || JSON.stringify(order) !== JSON.stringify(value.drafts[index])) return null;
      } else if (order !== null) return null;
      if ((index > value.index || value.phase === 'intro') && value.drafts[index].length !== 0) return null;
    }
    return {
      v: 1, excludedDailyId: value.excludedDailyId, roundIds: [...value.roundIds], seeds: [...value.seeds],
      index: value.index, phase: value.phase, drafts: value.drafts.map((draft: string[]) => [...draft]),
      orders: value.orders.map((order: string[] | null) => order && [...order]),
    };
  } catch { return null; }
}

export function createCircuit(excludedDailyId: string, seed: number): CircuitState | null {
  if (!RANK_ROUNDS.some(round => round.id === excludedDailyId) || !uint(seed)) return null;
  const roundIds = CIRCUIT_SPORTS.map(sport => {
    const pool = CIRCUIT_ROUND_IDS.map(id => circuitRoundById(id)!).filter(round => round.sport === sport && !excluded(round.id, excludedDailyId));
    return pool[dailyDraw(pool.length, `rank-circuit:${seed}:${sport}`)].id;
  });
  return { v: 1, excludedDailyId, roundIds, seeds: CIRCUIT_SPORTS.map((_, index) => (seed + Math.imul(index + 1, 2654435761)) >>> 0), index: 0, phase: 'intro', drafts: [[], [], []], orders: [null, null, null] };
}

export function circuitRound(state: CircuitState, index = state.index): RankRound { return circuitRoundById(state.roundIds[index])!; }
export function circuitScore(state: CircuitState): number { return state.orders.reduce((sum, order, index) => sum + (order ? scoreRankGuess(order, circuitRound(state, index)) : 0), 0); }
export function startCircuit(state: CircuitState): CircuitState { return state.phase === 'intro' ? { ...state, phase: 'playing' } : state; }
export function editCircuit(state: CircuitState, draft: string[]): CircuitState {
  if (state.phase !== 'playing' || !validDraft(draft, circuitRound(state)) || JSON.stringify(draft) === JSON.stringify(state.drafts[state.index])) return state;
  return { ...state, drafts: state.drafts.map((old, index) => index === state.index ? [...draft] : old) };
}
export function lockCircuit(state: CircuitState): CircuitState {
  const draft = state.drafts[state.index];
  if (state.phase !== 'playing' || draft.length !== 5 || !validDraft(draft, circuitRound(state))) return state;
  return { ...state, phase: 'reveal', orders: state.orders.map((order, index) => index === state.index ? [...draft] : order) };
}
export function advanceCircuit(state: CircuitState): CircuitState {
  if (state.phase !== 'reveal') return state;
  return state.index === 2 ? { ...state, phase: 'done' } : { ...state, index: state.index + 1, phase: 'playing' };
}
export function loadCircuit(): CircuitState | null {
  try { return parseCircuit(localStorage.getItem(CIRCUIT_SAVE_KEY)); } catch { return null; }
}
export function saveCircuit(state: CircuitState): boolean {
  if (!parseCircuit(state)) return false;
  try { localStorage.setItem(CIRCUIT_SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
