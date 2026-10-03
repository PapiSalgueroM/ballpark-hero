import type { Difficulty, Player } from '@/types/game';
import { normalizeName } from '@/lib/playerSearch';

export const FOOTLE_PRACTICE_KEY = 'footle-practice-run-v1';
export const PRACTICE_LENGTH = 5;
const MAX_GUESSES = 8;
type Round = { guesses: string[]; status: 'playing' | 'won' | 'lost' };
export type FootlePracticeRun = {
  v: 1;
  active: boolean;
  tier: Difficulty;
  pool: Player[];
  targets: string[];
  rounds: Round[];
  index: number;
};

const identity = normalizeName;
const tiers = ['easy', 'hard', 'insane'];
const positions = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];

export function practiceCandidates(pool: Player[], tier: Difficulty, dailyName: string): Player[] {
  const seen = new Set<string>([identity(dailyName)]);
  return pool.filter(player => {
    const key = identity(player.name);
    if (player.difficulty !== tier || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createPracticeRun(pool: Player[], tier: Difficulty, dailyName: string, random = Math.random): FootlePracticeRun | null {
  const candidates = practiceCandidates(pool, tier, dailyName);
  if (candidates.length < PRACTICE_LENGTH) return null;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const seen = new Set<string>();
  const snapshot = pool.filter(player => {
    const key = identity(player.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(player => ({ ...player }));
  return {
    v: 1, active: true, tier, pool: snapshot,
    targets: candidates.slice(0, PRACTICE_LENGTH).map(player => player.name),
    rounds: Array.from({ length: PRACTICE_LENGTH }, () => ({ guesses: [], status: 'playing' })),
    index: 0,
  };
}

export function guessPractice(run: FootlePracticeRun, name: string): FootlePracticeRun {
  const round = run.rounds[run.index];
  const player = run.pool.find(candidate => candidate.name === name);
  if (round.status !== 'playing' || !player || round.guesses.includes(name)) return run;
  const guesses = [...round.guesses, name];
  const status = name === run.targets[run.index] ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return { ...run, rounds: run.rounds.map((value, index) => index === run.index ? { guesses, status } : value) };
}

export function giveUpPractice(run: FootlePracticeRun): FootlePracticeRun {
  if (run.rounds[run.index].status !== 'playing') return run;
  return { ...run, rounds: run.rounds.map((round, index) => index === run.index ? { ...round, status: 'lost' } : round) };
}

export function nextPractice(run: FootlePracticeRun): FootlePracticeRun {
  if (run.rounds[run.index].status === 'playing' || run.index >= PRACTICE_LENGTH - 1) return run;
  return { ...run, index: run.index + 1 };
}

export function practiceFinished(run: FootlePracticeRun): boolean {
  return run.index === PRACTICE_LENGTH - 1 && run.rounds[run.index].status !== 'playing';
}

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') return false;
  const player = value as Player;
  return ['name', 'club', 'nationality', 'league'].every(key => typeof player[key as keyof Player] === 'string' && String(player[key as keyof Player]).trim().length > 0)
    && tiers.includes(player.difficulty) && positions.includes(player.position)
    && ['age', 'marketValue'].every(key => typeof player[key as keyof Player] === 'number' && Number.isFinite(player[key as keyof Player]) && Number(player[key as keyof Player]) >= 0)
    && [player.goals, player.assists].every(value => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0))
    && (player.kitNumber === null || (Number.isInteger(player.kitNumber) && player.kitNumber! > 0));
}

export function parsePracticeRun(raw: string | null): FootlePracticeRun | null {
  if (!raw) return null;
  try {
    const run = JSON.parse(raw) as FootlePracticeRun;
    if (!run || run.v !== 1 || typeof run.active !== 'boolean' || !tiers.includes(run.tier)
      || !Array.isArray(run.pool) || run.pool.length < PRACTICE_LENGTH || run.pool.length > 5000 || !run.pool.every(isPlayer)
      || !Array.isArray(run.targets) || run.targets.length !== PRACTICE_LENGTH || !run.targets.every(name => typeof name === 'string')
      || new Set(run.targets.map(identity)).size !== PRACTICE_LENGTH
      || !Array.isArray(run.rounds) || run.rounds.length !== PRACTICE_LENGTH
      || !Number.isInteger(run.index) || run.index < 0 || run.index >= PRACTICE_LENGTH) return null;
    const pool = new Map(run.pool.map(player => [player.name, player]));
    if (new Set(run.pool.map(player => identity(player.name))).size !== run.pool.length
      || run.targets.some(name => pool.get(name)?.difficulty !== run.tier)) return null;
    for (let index = 0; index < run.rounds.length; index++) {
      const round = run.rounds[index];
      if (!round || !['playing', 'won', 'lost'].includes(round.status) || !Array.isArray(round.guesses)
        || round.guesses.length > MAX_GUESSES || new Set(round.guesses).size !== round.guesses.length
        || round.guesses.some(name => !pool.has(name))) return null;
      const correctAt = round.guesses.indexOf(run.targets[index]);
      if ((round.status === 'won') !== (correctAt >= 0) || (correctAt >= 0 && correctAt !== round.guesses.length - 1)
        || (round.status === 'playing' && round.guesses.length >= MAX_GUESSES)
        || (index < run.index && round.status === 'playing')
        || (index > run.index && (round.status !== 'playing' || round.guesses.length > 0))) return null;
    }
    return run;
  } catch { return null; }
}

export function loadPracticeRun(): FootlePracticeRun | null {
  try { return parsePracticeRun(localStorage.getItem(FOOTLE_PRACTICE_KEY)); }
  catch { return null; }
}
