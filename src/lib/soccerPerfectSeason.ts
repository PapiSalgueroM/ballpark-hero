import { keyedRng } from '@/lib/keyedRng';
import { teamOverall, type DraftablePlayer, type SeasonSlot } from '@/lib/perfectSeason';

export const SOCCER_PS_VERSION = 'soccer-ps-v1';
export const SOCCER_PS_BUDGET = 55;
export const SOCCER_PS_GAMES = 38;
// Provisional game odds, not a model of real soccer results.
export const SOCCER_PS_ALPHA = 5;
export const SOCCER_PS_SLOTS: readonly SeasonSlot[] = Object.freeze([
  { key: 'GK', label: 'Goalkeeper', weight: 2 },
  { key: 'LB', label: 'Left back', weight: 1 },
  { key: 'LCB', label: 'Left centre back', weight: 1 },
  { key: 'RCB', label: 'Right centre back', weight: 1 },
  { key: 'RB', label: 'Right back', weight: 1 },
  { key: 'LCM', label: 'Left midfielder', weight: 1 },
  { key: 'CM', label: 'Central midfielder', weight: 1 },
  { key: 'RCM', label: 'Right midfielder', weight: 1 },
  { key: 'LW', label: 'Left winger', weight: 1 },
  { key: 'ST', label: 'Striker', weight: 2 },
  { key: 'RW', label: 'Right winger', weight: 1 },
].map(slot => Object.freeze(slot)));

export interface SoccerPSCard extends DraftablePlayer { cost: 3 | 5 | 7 }
export type SoccerPSDeal = readonly (readonly SoccerPSCard[])[];
export type SoccerPSOutcome = 'W' | 'D' | 'L';
export type SoccerPSMode = 'daily' | 'unlimited';
export interface SoccerPSRun {
  version: string; mode: SoccerPSMode; date: string | null; seed: number;
  choices: number[]; revealed: number; completionRecorded: boolean;
}
export interface SoccerPSRecord {
  played: number; wins: number; draws: number; losses: number; points: number;
  score: number; perfect: boolean; unbeaten: boolean;
}
export interface SoccerPSSeason extends SoccerPSRecord { games: SoccerPSOutcome[] }
export interface SoccerPSOdds { win: number; draw: number; loss: number; perfect: number; unbeaten: number }
export interface SoccerPSBest { choices: number[]; spent: number; weightedStrength: number; overall: number }
export interface SoccerPSRunView {
  deal: SoccerPSDeal; picks: Record<string, SoccerPSCard | null>; spent: number; remaining: number;
  weightedStrength: number; overall: number; best: SoccerPSBest;
  odds: SoccerPSOdds | null; season: SoccerPSSeason | null; record: SoccerPSRecord; finished: boolean;
}

function validDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
function validSeed(seed: unknown): seed is number {
  return typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
}
export function dailySoccerSeed(date: string, version = SOCCER_PS_VERSION): number {
  if (!validDate(date)) throw new Error('Invalid daily date');
  return Math.floor(keyedRng(`${version}|soccer-perfect-season|daily|${date}`)() * 2 ** 32);
}
export function unlimitedSoccerSeed(nonce: number, version = SOCCER_PS_VERSION): number {
  if (!validSeed(nonce)) throw new Error('Invalid unlimited seed');
  return Math.floor(keyedRng(`${version}|soccer-perfect-season|unlimited|${nonce}`)() * 2 ** 32);
}

export function dealSoccerXI(seed: number, version = SOCCER_PS_VERSION): SoccerPSDeal {
  return SOCCER_PS_SLOTS.map(slot => {
    const random = keyedRng(`${version}|soccer-perfect-season|offer|${seed}|${slot.key}`);
    return ([3, 5, 7] as const).map((cost, index) => ({
      playerId: `${version}:${seed}:${slot.key}:${index}`,
      name: `${['Reliable', 'Balanced', 'Standout'][index]} ${slot.label.toLowerCase()}`,
      rating: 55 + 5 * cost + Math.floor(random() * 17) - 8,
      cost, eligible: [slot.key], detail: 'Fictional role card. Strength is a game rating.',
    }));
  });
}
export function draftSoccerCost(deal: SoccerPSDeal, choices: readonly number[]): number {
  return choices.reduce((sum, choice, slot) => sum + deal[slot][choice].cost, 0);
}
export function canDraftSoccerCard(deal: SoccerPSDeal, choices: readonly number[], index: number): boolean {
  if (choices.length >= SOCCER_PS_SLOTS.length || !Number.isInteger(index) || !deal[choices.length]?.[index]) return false;
  if (!choices.every((choice, slot) => Number.isInteger(choice) && Boolean(deal[slot]?.[choice]))) return false;
  const remainingSlots = SOCCER_PS_SLOTS.length - choices.length - 1;
  return draftSoccerCost(deal, choices) + deal[choices.length][index].cost + 3 * remainingSlots <= SOCCER_PS_BUDGET;
}
export function weightedSoccerStrength(deal: SoccerPSDeal, choices: readonly number[]): number {
  return choices.reduce((sum, choice, slot) => sum + deal[slot][choice].rating * SOCCER_PS_SLOTS[slot].weight, 0);
}
function soccerPicks(deal: SoccerPSDeal, choices: readonly number[]): Record<string, SoccerPSCard | null> {
  return Object.fromEntries(SOCCER_PS_SLOTS.map((slot, index) => [slot.key, choices[index] === undefined ? null : deal[index][choices[index]]]));
}
export function soccerTeamOverall(deal: SoccerPSDeal, choices: readonly number[]): number {
  return teamOverall([...SOCCER_PS_SLOTS], soccerPicks(deal, choices));
}

export function bestAffordableSoccerXI(deal: SoccerPSDeal): SoccerPSBest {
  type State = { choices: number[]; weightedStrength: number };
  let states: (State | null)[] = Array(SOCCER_PS_BUDGET + 1).fill(null);
  states[0] = { choices: [], weightedStrength: 0 };
  for (let slot = 0; slot < SOCCER_PS_SLOTS.length; slot++) {
    const next: (State | null)[] = Array(SOCCER_PS_BUDGET + 1).fill(null);
    for (let spent = 0; spent <= SOCCER_PS_BUDGET; spent++) {
      const state = states[spent];
      if (!state) continue;
      deal[slot].forEach((card, index) => {
        const cost = spent + card.cost;
        if (cost > SOCCER_PS_BUDGET) return;
        const weightedStrength = state.weightedStrength + card.rating * SOCCER_PS_SLOTS[slot].weight;
        if (!next[cost] || weightedStrength > next[cost].weightedStrength) {
          next[cost] = { choices: [...state.choices, index], weightedStrength };
        }
      });
    }
    states = next;
  }
  let best: SoccerPSBest | null = null;
  states.forEach((state, spent) => {
    if (state && (!best || state.weightedStrength > best.weightedStrength)) {
      best = { ...state, spent, overall: soccerTeamOverall(deal, state.choices) };
    }
  });
  if (!best) throw new Error('No affordable XI');
  return best;
}

export function soccerSeasonOdds(weightedStrength: number, bestStrength: number): SoccerPSOdds {
  const win = Math.min(1, Math.max(0, weightedStrength / bestStrength) ** SOCCER_PS_ALPHA);
  const draw = (1 - win) / 2;
  return { win, draw, loss: draw, perfect: win ** SOCCER_PS_GAMES, unbeaten: (win + draw) ** SOCCER_PS_GAMES };
}
export function soccerMatchOutcome(winChance: number, roll: number): SoccerPSOutcome {
  return roll < winChance ? 'W' : roll < winChance + (1 - winChance) / 2 ? 'D' : 'L';
}
export function scoreSoccerMatches(games: readonly SoccerPSOutcome[]): SoccerPSRecord {
  const wins = games.filter(game => game === 'W').length;
  const draws = games.filter(game => game === 'D').length;
  const losses = games.filter(game => game === 'L').length;
  const points = 3 * wins + draws;
  return { played: games.length, wins, draws, losses, points,
    score: Math.min(100, Math.round(100 * points / (3 * SOCCER_PS_GAMES))),
    perfect: games.length === SOCCER_PS_GAMES && wins === SOCCER_PS_GAMES, unbeaten: losses === 0 };
}
export function simulateSoccerSeason(winChance: number, seed: number, version = SOCCER_PS_VERSION): SoccerPSSeason {
  const random = keyedRng(`${version}|soccer-perfect-season|season|${seed}`);
  const games = Array.from({ length: SOCCER_PS_GAMES }, () => soccerMatchOutcome(winChance, random()));
  return { ...scoreSoccerMatches(games), games };
}

export function createSoccerRun(mode: SoccerPSMode, date: string | null, nonce = 0): SoccerPSRun {
  if (mode !== 'daily' && mode !== 'unlimited') throw new Error('Invalid mode');
  if (mode === 'daily' ? !validDate(date) : date !== null) throw new Error('Invalid pinned date');
  const seed = mode === 'daily' ? dailySoccerSeed(date!) : unlimitedSoccerSeed(nonce);
  return { version: SOCCER_PS_VERSION, mode, date, seed, choices: [], revealed: 0, completionRecorded: false };
}
export function restoreSoccerRun(raw: unknown): SoccerPSRun | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { return null; }
  }
  if (!value || typeof value !== 'object') return null;
  const run = value as SoccerPSRun;
  if (run.version !== SOCCER_PS_VERSION || (run.mode !== 'daily' && run.mode !== 'unlimited') || !validSeed(run.seed)) return null;
  if (run.mode === 'daily' ? !validDate(run.date) || run.seed !== dailySoccerSeed(run.date, run.version) : run.date !== null) return null;
  if (!Array.isArray(run.choices) || run.choices.length > SOCCER_PS_SLOTS.length) return null;
  const deal = dealSoccerXI(run.seed, run.version);
  const choices: number[] = [];
  for (const choice of run.choices) {
    if (!canDraftSoccerCard(deal, choices, choice)) return null;
    choices.push(choice);
  }
  if (!Number.isInteger(run.revealed) || run.revealed < 0 || run.revealed > SOCCER_PS_GAMES) return null;
  if (choices.length < SOCCER_PS_SLOTS.length && run.revealed !== 0) return null;
  if (typeof run.completionRecorded !== 'boolean' || (run.completionRecorded && run.revealed !== SOCCER_PS_GAMES)) return null;
  return { version: run.version, mode: run.mode, date: run.date, seed: run.seed, choices,
    revealed: run.revealed, completionRecorded: run.completionRecorded };
}
export function deriveSoccerRun(run: SoccerPSRun): SoccerPSRunView {
  const deal = dealSoccerXI(run.seed, run.version);
  const spent = draftSoccerCost(deal, run.choices);
  const weightedStrength = weightedSoccerStrength(deal, run.choices);
  const best = bestAffordableSoccerXI(deal);
  const complete = run.choices.length === SOCCER_PS_SLOTS.length;
  const odds = complete ? soccerSeasonOdds(weightedStrength, best.weightedStrength) : null;
  const season = odds ? simulateSoccerSeason(odds.win, run.seed, run.version) : null;
  return { deal, picks: soccerPicks(deal, run.choices), spent, remaining: SOCCER_PS_BUDGET - spent,
    weightedStrength, overall: soccerTeamOverall(deal, run.choices), best, odds, season,
    record: scoreSoccerMatches(season?.games.slice(0, run.revealed) ?? []),
    finished: complete && run.revealed === SOCCER_PS_GAMES };
}
