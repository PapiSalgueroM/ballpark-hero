/**
 * Perfect Season engine core. Sport-agnostic: adapters supply rosters and
 * ratings, this module handles randomness, win probability, and the sim.
 * Reused later for NHL 82-0, NBA, NFL, and the Conquest match sim.
 */

export interface SeasonSlot {
  key: string;      // 'C', '1B', 'SP', ...
  label: string;    // display label
  weight: number;   // contribution to team overall
}

export interface DraftablePlayer {
  playerId: string;
  name: string;
  rating: number;          // 40-99
  eligible: string[];      // slot keys this player can fill
  detail: string;          // one-line season stat summary
}

export interface SpinSquad {
  squadId: string;         // unique per team-season
  teamName: string;
  year: number;
  players: DraftablePlayer[];
}

export interface SimResult {
  wins: number;
  losses: number;
  games: boolean[];        // true = win, in order
  perfect: boolean;
  overall: number;
}

/** Deterministic RNG (mulberry32) so daily seeds are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Team overall from filled slots (weighted mean). */
export function teamOverall(slots: SeasonSlot[], picks: Record<string, DraftablePlayer | null>): number {
  let sum = 0;
  let wsum = 0;
  for (const s of slots) {
    const p = picks[s.key];
    if (!p) continue;
    sum += p.rating * s.weight;
    wsum += s.weight;
  }
  return wsum > 0 ? sum / wsum : 0;
}

/**
 * Per-game win probability. Tuned so a drafted team of all-99 legends wins a
 * 162 game season unbeaten several percent of the time, while a merely great
 * team racks up wins but almost never goes perfect.
 */
export function winProbability(overall: number): number {
  const x = (overall - 77) / 5;
  const p = 1 / (1 + Math.exp(-x));
  return Math.min(0.985, Math.max(0.05, p));
}

export function simulateSeason(overall: number, games: number, seed: number): SimResult {
  const rand = rng(seed);
  const p = winProbability(overall);
  const results: boolean[] = [];
  let wins = 0;
  for (let i = 0; i < games; i++) {
    // A pinch of streakiness: losing yesterday stings today, winning helps
    const momentum = i > 0 ? (results[i - 1] ? 0.004 : -0.006) : 0;
    const win = rand() < Math.min(0.988, p + momentum);
    results.push(win);
    if (win) wins++;
  }
  return {
    wins,
    losses: games - wins,
    games: results,
    perfect: wins === games,
    overall: Math.round(overall),
  };
}

/** Ratings color tier for UI. */
export function ratingTier(r: number): 'elite' | 'great' | 'good' | 'meh' {
  if (r >= 90) return 'elite';
  if (r >= 80) return 'great';
  if (r >= 68) return 'good';
  return 'meh';
}

/** Squads must be able to fill an open slot, so spins never come up dead. */
export function squadFillsAny(squad: SpinSquad, openSlots: string[], usedNames: Set<string>): boolean {
  return squad.players.some(
    p => !usedNames.has(p.name) && p.eligible.some(e => openSlots.includes(e))
  );
}
