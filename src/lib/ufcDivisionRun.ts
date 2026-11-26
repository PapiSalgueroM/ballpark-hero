import { uniqueUfcFighters } from '@/data/ufcFighters';
import { shuffled } from '@/lib/keyedShuffle';
import { WEIGHT_CLASS_ORDER, type UfcFighter, type WeightClass } from '@/types/ufc';

export const DIVISION_LIMIT = 8;
export const DIVISION_TARGETS = 3;
export const DIVISION_RUN_KEY = 'ufc-division-run-v1';
export interface DivisionRun {
  date: string;
  pool: UfcFighter[];
  targets: string[];
  picks: string[];
  gaveUp: boolean;
}

export function startDivisionRun(weight: WeightClass, date: string, rng = Math.random): DivisionRun | null {
  const pool = uniqueUfcFighters.filter(fighter => fighter.weightClass === weight);
  if (pool.length < DIVISION_TARGETS) return null;
  const targets = shuffled(pool, rng).slice(0, DIVISION_TARGETS).map(fighter => fighter.name);
  return { date, pool, targets, picks: [], gaveUp: false };
}

export function divisionProgress(run: DivisionRun) {
  let solved = 0;
  const rounds = run.targets.map((): string[] => []);
  for (const name of run.picks) {
    rounds[solved].push(name);
    if (name === run.targets[solved]) solved++;
  }
  return { solved, rounds, finished: run.gaveUp || solved === DIVISION_TARGETS || run.picks.length === DIVISION_LIMIT };
}

export function pickDivisionFighter(run: DivisionRun, name: string): DivisionRun {
  const { solved, rounds, finished } = divisionProgress(run);
  if (finished || rounds[solved].includes(name) || run.targets.slice(0, solved).includes(name)
    || !run.pool.some(fighter => fighter.name === name)) return run;
  return { ...run, picks: [...run.picks, name] };
}

const dateShape = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
function isSavedFighter(value: unknown): value is UfcFighter {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<UfcFighter>;
  return !!row.name && typeof row.name === 'string' && WEIGHT_CLASS_ORDER.includes(row.weightClass as WeightClass)
    && typeof row.nationality === 'string' && typeof row.record === 'string' && typeof row.yearsActive === 'string'
    && dateShape(row.birthDate) && [row.wins, row.losses, row.draws, row.koTko, row.submissions, row.yearsActiveStart, row.yearsActiveEnd]
      .every(n => typeof n === 'number' && Number.isInteger(n) && n >= 0);
}

export function readDivisionRun(raw: string | null): DivisionRun | null {
  if (!raw) return null;
  try {
    const run = JSON.parse(raw) as DivisionRun | null;
    if (!run || !dateShape(run.date) || typeof run.gaveUp !== 'boolean' || !Array.isArray(run.pool)
      || run.pool.length < DIVISION_TARGETS || !run.pool.every(isSavedFighter)
      || !run.pool.every(f => f.weightClass === run.pool[0].weightClass)) return null;
    const names = new Set(run.pool.map(f => f.name));
    if (names.size !== run.pool.length || !Array.isArray(run.targets) || run.targets.length !== DIVISION_TARGETS
      || new Set(run.targets).size !== DIVISION_TARGETS || !run.targets.every(name => names.has(name))
      || !Array.isArray(run.picks) || run.picks.length > DIVISION_LIMIT) return null;
    let replay: DivisionRun = { ...run, picks: [], gaveUp: false };
    for (const name of run.picks) {
      const next = pickDivisionFighter(replay, name);
      if (next === replay) return null;
      replay = next;
    }
    return run;
  } catch { return null; }
}
