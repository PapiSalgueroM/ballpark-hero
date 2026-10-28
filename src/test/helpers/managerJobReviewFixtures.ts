import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import { advanceReviewedManagerSeason, setManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import type { CareerState } from '@/lib/soccerCareerEngine';

export function seeded<T>(seed: number, action: () => T) {
  const random = Math.random, now = Date.now, draws: number[] = [];
  let n = seed >>> 0;
  const draw = () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  Math.random = () => { const value = draw(); draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { const value = action(); const next = draw(); return { value, draws, next }; }
  finally { Math.random = random; Date.now = now; }
}
export function manager(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw new Error('Existing admitted recorded ere career is required');
  const input = structuredClone(saved.state) as CareerState;
  const retired = seeded(901, () => E.manualRetire({ ...input, phase: 'playing', retired: false, age: 34 })).value;
  const state = seeded(902, () => E.choosePostRetirement(retired, 'manager', E.FALLBACK_CLUBS)).value;
  const club = E.FALLBACK_CLUBS.find(row => row.name === 'Malmo FF');
  if (!club || !state.managerState) throw new Error('Admitted real fixture identity is required');
  state.managerState = { ...state.managerState, club: club.name, clubTier: club.tier, league: club.league,
    season: 2, trophies: 1, promotions: 2, seasonResults: [] };
  return state;
}
export function pending() {
  return seeded(22, () => advanceReviewedManagerSeason(setManagerJobReview(manager(), E.FALLBACK_CLUBS, true), E.FALLBACK_CLUBS)).value;
}
export function withoutReview(state: CareerState): CareerState {
  const copy = { ...state } as CareerState & { managerJobReview?: unknown };
  delete copy.managerJobReview; return copy;
}
