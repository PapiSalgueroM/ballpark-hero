import { rng, simulateSeason, winProbability, type DraftablePlayer } from '@/lib/perfectSeason';
import { NHL_GAMES, NHL_SLOTS } from '@/lib/perfectSeasonNhl';

export const NHL_CUP_KEY = 'perfect-season-nhl-cup-v1';
export const CUP_PLANS = {
  pinch: 'Pinch the points',
  hold: 'Hold the blue line',
  clear: 'Clear the crease',
} as const;
export type CupPlan = keyof typeof CUP_PLANS;
type Call = { plan: CupPlan; doubleShift: boolean };
type Skater = { name: string; rating: number };
export type CupRun = { v: 1; seed: number; wins: number; lineup: Record<string, Skater>; calls: Call[] };

const opponents = [
  { name: 'Rush attack', look: 'Quick exits', report: 'Their wings are flying the zone. Hold the blue line to cut off their rush. A pinch can leave an odd-man break.' },
  { name: 'Net-front attack', look: 'Traffic in front', report: 'They are sending a screen to the net. Clear the crease to give your goalie a sightline. Holding high leaves traffic below.' },
  { name: 'Low-block defense', look: 'Packed slot', report: 'They are packed around the net. Pinch the points to keep pucks in. Staying near your own crease gives them an easy exit.' },
] as const;
const matchups = [{ pinch: -3, hold: 3, clear: 0 }, { pinch: 0, hold: -3, clear: 3 }, { pinch: 3, hold: 0, clear: -3 }];

export function makeCupRun(picks: Record<string, DraftablePlayer | null>, wins: number, seed: number): CupRun | null {
  const lineup: CupRun['lineup'] = {};
  for (const { key } of NHL_SLOTS) {
    const p = picks[key];
    if (!p?.eligible.includes(key)) return null;
    lineup[key] = { name: p.name, rating: p.rating };
  }
  return { v: 1, seed, wins, lineup, calls: [] };
}

export function cupScout(run: CupRun, game: number) {
  const base = Math.floor(rng(run.seed ^ 0x73ac)() * opponents.length);
  const look = (base + [0, 1, 0, 2, 0][game]) % opponents.length;
  return { opponent: opponents[base].name, ...opponents[look], matchup: matchups[look] };
}

export function cupGame(run: CupRun, i: number, call: Call) {
  const p = run.lineup;
  const overall = NHL_SLOTS.reduce((sum, slot) => sum + p[slot.key].rating * slot.weight, 0)
    / NHL_SLOTS.reduce((sum, slot) => sum + slot.weight, 0);
  const pair = (p.D.rating + p.D2.rating) / 2;
  const forwards = (p.C.rating + p.LW.rating + p.RW.rating) / 3;
  const unit = call.plan === 'clear' ? (pair + p.G.rating) / 2 : call.plan === 'pinch' ? (pair + forwards) / 2 : pair;
  const scout = cupScout(run, i);
  const tired = i > 0 && run.calls[i - 1].doubleShift;
  const strength = 77 + (overall - 75) * 0.3 + (unit - overall) * 0.15 + scout.matchup[call.plan]
    + (call.doubleShift ? 3 : tired ? -3 : 0);
  const seed = (run.seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  return { won: simulateSeason(strength, 1, seed).games[0], chance: Math.round(winProbability(strength) * 100), tired, look: scout.look };
}

export function cupBoard(run: CupRun) {
  const games = run.calls.map((call, i) => cupGame(run, i, call));
  const wins = games.filter(g => g.won).length;
  const losses = games.length - wins;
  return { games, wins, losses, finished: wins === 3 || losses === 3, shiftUsed: run.calls.some(c => c.doubleShift) };
}

export function callCupGame(run: CupRun, call: Call): CupRun | null {
  const board = cupBoard(run);
  if (board.finished || (call.doubleShift && board.shiftUsed)) return null;
  return { ...run, calls: [...run.calls, call] };
}

export function readCupRun(raw: string | null): CupRun | null {
  if (!raw || raw.length > 8000) return null;
  try {
    const saved = JSON.parse(raw) as CupRun;
    if (saved?.v !== 1 || !Number.isInteger(saved.seed) || saved.seed < 0 || saved.seed >= 2 ** 31
      || !Number.isInteger(saved.wins) || saved.wins < 0 || saved.wins > NHL_GAMES
      || !Array.isArray(saved.calls) || saved.calls.length > 5) return null;
    for (const slot of NHL_SLOTS) {
      const player = saved.lineup?.[slot.key];
      if (typeof player?.name !== 'string' || !player.name.trim() || !Number.isInteger(player.rating) || player.rating < 40 || player.rating > 99) return null;
    }
    const names = NHL_SLOTS.map(slot => saved.lineup[slot.key].name);
    if (new Set(names).size !== names.length) return null;
    let run: CupRun = { ...saved, calls: [] };
    for (const call of saved.calls) {
      if (!call || !Object.prototype.hasOwnProperty.call(CUP_PLANS, call.plan) || typeof call.doubleShift !== 'boolean') return null;
      const next = callCupGame(run, call);
      if (!next) return null;
      run = next;
    }
    return run;
  } catch {
    return null;
  }
}
