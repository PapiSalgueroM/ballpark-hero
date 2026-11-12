import { SOCCER_PS_ROSTER_2026 } from '@/data/soccerPerfectSeasonPool2026';
import { keyedRng } from '@/lib/keyedRng';
import type { Position } from '@/types/game';

export const SOCCER_PS_VERSION = 'soccer-ps-clubs-2026-v1';
export const SOCCER_PS_GAMES = 38;
export const SOCCER_PS_MAX_REROLLS = 2;

// Slot order also defines the eligibility bits in the pinned roster.
export const SOCCER_PS_SLOTS = [
  { key: 'GK', label: 'Goalkeeper', weight: 2 },
  { key: 'RB', label: 'Right back', weight: 1 },
  { key: 'RCB', label: 'Right centre back', weight: 1 },
  { key: 'LCB', label: 'Left centre back', weight: 1 },
  { key: 'LB', label: 'Left back', weight: 1 },
  { key: 'RCM', label: 'Right midfielder', weight: 1 },
  { key: 'CM', label: 'Central midfielder', weight: 1 },
  { key: 'LCM', label: 'Left midfielder', weight: 1 },
  { key: 'RW', label: 'Right winger', weight: 1 },
  { key: 'ST', label: 'Striker', weight: 2 },
  { key: 'LW', label: 'Left winger', weight: 1 },
] as const;

export type SoccerPSSlot = typeof SOCCER_PS_SLOTS[number]['key'];
export type SoccerPSOutcome = 'W' | 'D' | 'L';
export type SoccerPSMode = 'daily' | 'unlimited';
interface SoccerPSPick { playerId: string; slot: SoccerPSSlot }
export type SoccerPSAction = { type: 'pick' } & SoccerPSPick | { type: 'reroll' };
export interface SoccerPSRun {
  version: typeof SOCCER_PS_VERSION;
  mode: SoccerPSMode;
  date: string | null;
  seed: number;
  actions: SoccerPSAction[];
  revealed: number;
  completionRecorded: boolean;
}

interface SoccerPSCard {
  playerId: string;
  name: string;
  position: Position;
  rating: number;
  eligible: SoccerPSSlot[];
}
interface SoccerPSClub { id: string; name: string; roster: SoccerPSCard[]; mask: number; strengths: StrengthRange[] }
interface DraftState {
  clubs: SoccerPSClub[];
  picks: Partial<Record<SoccerPSSlot, SoccerPSCard>>;
  skippedClubs: string[];
  open: number;
  turn: number;
  strength: number;
}
type StrengthRange = readonly [min: number, max: number];

const SLOT_MASK = (1 << SOCCER_PS_SLOTS.length) - 1;
const TOTAL_WEIGHT = SOCCER_PS_SLOTS.reduce((sum, slot) => sum + slot.weight, 0);
const CLUBS: SoccerPSClub[] = SOCCER_PS_ROSTER_2026.map(([id, name, players]) => {
  const roster = players.map(([playerId, name, position, rating, mask]) => ({
    playerId, name, position, rating,
    eligible: SOCCER_PS_SLOTS.filter((_, index) => mask & (1 << index)).map(slot => slot.key),
  }));
  const strengths: StrengthRange[] = SOCCER_PS_SLOTS.map(slot => {
    const ratings = roster.filter(card => card.eligible.includes(slot.key)).map(card => card.rating * slot.weight);
    return [Math.min(...ratings), Math.max(...ratings)];
  });
  return { id, name, roster, strengths, mask: players.reduce((mask, player) => mask | player[4], 0) };
});
const CLUBS_BY_SLOT = SOCCER_PS_SLOTS.map((_, index) => CLUBS.filter(club => club.mask & (1 << index)));

function validDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
function validSeed(seed: unknown): seed is number {
  return typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
}
function dailySeed(date: string): number {
  return Math.floor(keyedRng(SOCCER_PS_VERSION + '|daily|' + date)() * 2 ** 32);
}

function dealClubs(seed: number): SoccerPSClub[] {
  const draw = keyedRng(SOCCER_PS_VERSION + '|clubs|' + seed);
  const used = new Set<string>();
  // Seed one distinct club for each role, then shuffle to hide those assignments.
  const clubs = CLUBS_BY_SLOT.map(pool => {
    const available = pool.filter(club => !used.has(club.id));
    const club = available[Math.floor(draw() * available.length)];
    used.add(club.id);
    return club;
  });
  for (let i = clubs.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [clubs[i], clubs[j]] = [clubs[j], clubs[i]];
  }
  return clubs;
}

function strengthSolver(clubs: readonly SoccerPSClub[]) {
  const memo = new Map<number, StrengthRange>();
  function range(index: number, open: number): StrengthRange {
    if (index === clubs.length) return open === 0 ? [0, 0] : [Infinity, -Infinity];
    const key = (index << SOCCER_PS_SLOTS.length) | open;
    const saved = memo.get(key);
    if (saved) return saved;
    let min = Infinity;
    let max = -Infinity;
    for (const [slot, [low, high]] of clubs[index].strengths.entries()) {
      if ((open & (1 << slot)) === 0 || !Number.isFinite(high)) continue;
      const [nextMin, nextMax] = range(index + 1, open ^ (1 << slot));
      min = Math.min(min, low + nextMin);
      max = Math.max(max, high + nextMax);
    }
    const result: StrengthRange = [min, max];
    memo.set(key, result);
    return result;
  }
  return range;
}

function safeSlots(state: DraftState) {
  const future = strengthSolver(state.clubs.slice(state.turn + 1));
  return SOCCER_PS_SLOTS.flatMap((slot, index) => {
    const bit = 1 << index;
    if ((state.open & bit) === 0) return [];
    const [min, max] = future(0, state.open ^ bit);
    return Number.isFinite(max) ? [{ slot, bit, min, max }] : [];
  });
}

function move(state: DraftState, action: SoccerPSAction, seed: number): boolean {
  const current = state.clubs[state.turn];
  if (!current) return false;
  if (action.type === 'reroll') {
    if (state.skippedClubs.length === SOCCER_PS_MAX_REROLLS) return false;
    const mask = safeSlots(state).reduce((bits, slot) => bits | slot.bit, 0);
    const excluded = new Set([...state.clubs.map(club => club.id), ...state.skippedClubs]);
    const choices = CLUBS.filter(club => (club.mask & mask) !== 0 && !excluded.has(club.id));
    const draw = keyedRng(SOCCER_PS_VERSION + '|reroll|' + seed + '|' + state.turn + '|' + state.skippedClubs.length);
    state.skippedClubs.push(current.id);
    state.clubs[state.turn] = choices[Math.floor(draw() * choices.length)];
    return true;
  }
  const card = current.roster.find(player => player.playerId === action.playerId);
  const safe = safeSlots(state).find(({ slot }) => slot.key === action.slot);
  if (!card || !safe || !card.eligible.includes(safe.slot.key)) return false;
  state.picks[safe.slot.key] = card;
  state.open ^= safe.bit;
  state.turn++;
  state.strength += card.rating * safe.slot.weight;
  return true;
}

function replayDraft(seed: number, actions: readonly SoccerPSAction[]): DraftState | null {
  const state: DraftState = { clubs: dealClubs(seed), picks: {}, skippedClubs: [], open: SLOT_MASK, turn: 0, strength: 0 };
  for (const action of actions) {
    if (!action || (action.type !== 'pick' && action.type !== 'reroll') || !move(state, action, seed)) return null;
  }
  return state;
}

export function applySoccerAction(run: SoccerPSRun, action: SoccerPSAction): SoccerPSRun | null {
  const actions = [...run.actions, action];
  return replayDraft(run.seed, actions) ? { ...run, actions } : null;
}

export function createSoccerRun(mode: SoccerPSMode, date: string | null, nonce = 0): SoccerPSRun {
  if (mode === 'daily' ? !validDate(date) : date !== null || !validSeed(nonce)) throw new Error('Invalid season seed');
  const seed = mode === 'daily'
    ? dailySeed(date!)
    : Math.floor(keyedRng(SOCCER_PS_VERSION + '|unlimited|' + nonce)() * 2 ** 32);
  return { version: SOCCER_PS_VERSION, mode, date, seed, actions: [], revealed: 0, completionRecorded: false };
}

export function restoreSoccerRun(raw: unknown): SoccerPSRun | null {
  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { return null; }
  }
  if (!value || typeof value !== 'object') return null;
  const run = value as SoccerPSRun;
  if (run.version !== SOCCER_PS_VERSION || (run.mode !== 'daily' && run.mode !== 'unlimited') || !validSeed(run.seed)) return null;
  if (run.mode === 'daily' ? !validDate(run.date) || run.seed !== dailySeed(run.date) : run.date !== null) return null;
  if (!Array.isArray(run.actions) || run.actions.length > SOCCER_PS_SLOTS.length + SOCCER_PS_MAX_REROLLS) return null;
  const state = replayDraft(run.seed, run.actions);
  if (!state || !Number.isInteger(run.revealed) || run.revealed < 0 || run.revealed > SOCCER_PS_GAMES) return null;
  if (state.open !== 0 && run.revealed !== 0) return null;
  if (run.completionRecorded !== (run.revealed === SOCCER_PS_GAMES)) return null;
  return run;
}

export function soccerSeasonOdds(weightedStrength: number, bestStrength: number) {
  // Game odds. Calibration compares strongest and weakest playable paths on paired draws.
  const win = Math.min(1, Math.max(0, weightedStrength / bestStrength) ** 12);
  const draw = (1 - win) / 2;
  return { win, draw, loss: draw, perfect: win ** SOCCER_PS_GAMES };
}

export function scoreSoccerMatches(games: readonly SoccerPSOutcome[]) {
  const wins = games.filter(game => game === 'W').length;
  const draws = games.filter(game => game === 'D').length;
  const losses = games.length - wins - draws;
  const points = 3 * wins + draws;
  return {
    played: games.length, wins, draws, losses, points,
    score: Math.min(100, Math.round(100 * points / (3 * SOCCER_PS_GAMES))),
    perfect: games.length === SOCCER_PS_GAMES && wins === SOCCER_PS_GAMES,
    unbeaten: losses === 0,
  };
}

function simulateSoccerSeason(win: number, seed: number) {
  const draw = keyedRng(SOCCER_PS_VERSION + '|season|' + seed);
  const games = Array.from({ length: SOCCER_PS_GAMES }, (): SoccerPSOutcome => {
    const roll = draw();
    if (roll < win) return 'W';
    return roll < win + (1 - win) / 2 ? 'D' : 'L';
  });
  return { ...scoreSoccerMatches(games), games };
}

export function deriveSoccerRun(run: SoccerPSRun) {
  const state = replayDraft(run.seed, run.actions);
  if (!state) throw new Error('Invalid draft');
  const current = state.clubs[state.turn];
  const safe = current ? safeSlots(state) : [];
  const offers = (current?.roster ?? []).flatMap(card => {
    const eligible = card.eligible.filter(key => safe.some(({ slot }) => slot.key === key));
    return eligible.length ? [{ ...card, eligible }] : [];
  });
  let best: SoccerPSPick | null = null;
  let worst: SoccerPSPick | null = null;
  let high = -Infinity;
  let low = Infinity;
  for (const card of offers) {
    for (const { slot, min, max } of safe) {
      if (!card.eligible.includes(slot.key)) continue;
      const rating = card.rating * slot.weight;
      if (rating + max > high) {
        high = rating + max;
        best = { playerId: card.playerId, slot: slot.key };
      }
      if (rating + min < low) {
        low = rating + min;
        worst = { playerId: card.playerId, slot: slot.key };
      }
    }
  }
  const bestStrength = current ? null : strengthSolver(state.clubs)(0, SLOT_MASK)[1];
  const odds = bestStrength === null ? null : soccerSeasonOdds(state.strength, bestStrength);
  const season = odds ? simulateSoccerSeason(odds.win, run.seed) : null;
  return {
    turn: state.turn,
    clubOrder: state.clubs.map(club => club.id),
    currentClub: current?.name,
    upcoming: state.clubs.slice(state.turn + 1),
    picks: state.picks,
    offers, best, worst, odds, season,
    rerollsLeft: SOCCER_PS_MAX_REROLLS - state.skippedClubs.length,
    weightedStrength: state.strength,
    overall: state.strength / TOTAL_WEIGHT,
    bestOverall: bestStrength === null ? null : bestStrength / TOTAL_WEIGHT,
    record: scoreSoccerMatches(season?.games.slice(0, run.revealed) ?? []),
    finished: run.revealed === SOCCER_PS_GAMES,
  };
}
