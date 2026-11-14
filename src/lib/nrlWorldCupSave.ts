import { NRL_BENCH_SIZE, NRL_ROLES, NRL_TACTICS, type NrlTactic } from '@/lib/nrlManager';

export const NRL_WORLD_CUP_2026_POOLS = {
  A: ['australia', 'new-zealand', 'fiji', 'cook-islands'],
  B: ['england', 'samoa', 'lebanon'],
  C: ['tonga', 'papua-new-guinea', 'france'],
} as const;
export type NrlWorldCupNation = typeof NRL_WORLD_CUP_2026_POOLS[keyof typeof NRL_WORLD_CUP_2026_POOLS][number];
export const NRL_WORLD_CUP_STAGES = 5;
export const NRL_WORLD_CUP_SAVE_MAX_CHARS = 512;

export interface NrlWorldCupLineup {
  swap?: number; // Index in the published opening bench.
  target?: number; // Opening starter index. Older changes use the reserve's position.
  firstReserve?: number; // Index in the bench after the swap.
}

export interface NrlWorldCupRun {
  version: 1;
  year: 2026;
  seed: number;
  nation: NrlWorldCupNation;
  tactics: NrlTactic[];
  lineups?: Partial<Record<number, NrlWorldCupLineup>>;
}

export const NRL_WORLD_CUP_NATIONS = Object.values(NRL_WORLD_CUP_2026_POOLS).flat();
export const isNrlWorldCupNation = (nation: unknown): nation is NrlWorldCupNation => NRL_WORLD_CUP_NATIONS.includes(nation as NrlWorldCupNation);
export const isNrlWorldCupTactic = (tactic: unknown): tactic is NrlTactic => NRL_TACTICS.includes(tactic as NrlTactic);

export function createNrlWorldCup(seed: number, nation: NrlWorldCupNation): NrlWorldCupRun {
  return { version: 1, year: 2026, seed: seed >>> 0, nation, tactics: [] };
}

export function isNrlWorldCupLineup(value: unknown): value is NrlWorldCupLineup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { swap, target, firstReserve } = value as NrlWorldCupLineup;
  const fields = Number(swap !== undefined) + Number(target !== undefined) + Number(firstReserve !== undefined);
  return fields > 0 && Object.keys(value).length === fields
    && (swap === undefined || (Number.isInteger(swap) && swap >= 0 && swap < NRL_BENCH_SIZE))
    && (target === undefined || (swap !== undefined && Number.isInteger(target) && target >= 0 && target < NRL_ROLES.length))
    && (firstReserve === undefined || (Number.isInteger(firstReserve) && firstReserve > 0 && firstReserve < NRL_BENCH_SIZE));
}

export function isNrlWorldCupRun(value: unknown): value is NrlWorldCupRun {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const run = value as NrlWorldCupRun;
  if (Object.keys(run).length !== (run.lineups === undefined ? 5 : 6) || run.version !== 1 || run.year !== 2026
    || !Number.isSafeInteger(run.seed) || run.seed !== (run.seed >>> 0) || !isNrlWorldCupNation(run.nation)
    || !Array.isArray(run.tactics) || run.tactics.length > NRL_WORLD_CUP_STAGES || !run.tactics.every(isNrlWorldCupTactic)) return false;
  if (run.lineups === undefined) return true;
  if (!run.lineups || typeof run.lineups !== 'object' || Array.isArray(run.lineups)) return false;
  const entries = Object.entries(run.lineups);
  return entries.length > 0 && entries.every(([stage, lineup]) => /^[1-5]$/.test(stage)
    && Number(stage) <= run.tactics.length && isNrlWorldCupLineup(lineup));
}
