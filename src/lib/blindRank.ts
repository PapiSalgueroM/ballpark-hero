import { supabase } from '@/integrations/supabase/client';

/**
 * BLIND RANK — KOT4Q's signature format (docs/YOUTUBER_FORMATS.md).
 * 5 players revealed ONE AT A TIME; the player must commit each to a rank
 * slot immediately, no rearranging. Then the true order by the hidden stat
 * is revealed. Daily (date-seeded, same 5 for everyone) + unlimited.
 */

export interface RankPlayer {
  name: string;
  club: string;
  nationality: string;
  age: number;
  marketValueM: number; // millions USD
  goals: number;
  assists: number;
}

export type StatMode = 'value' | 'goals' | 'assists' | 'age';

export interface ModeDef {
  id: StatMode;
  title: string;
  question: string;
  unit: (p: RankPlayer) => string;
  stat: (p: RankPlayer) => number;
  /** true = rank 1 is the HIGHEST stat */
  descending: boolean;
}

export const MODES: ModeDef[] = [
  {
    id: 'value',
    title: 'Market Value',
    question: 'Rank 1 = most valuable player (2026 market value)',
    unit: p => `$${p.marketValueM}M`,
    stat: p => p.marketValueM,
    descending: true,
  },
  {
    id: 'goals',
    title: 'Career Goals',
    question: 'Rank 1 = most career goals',
    unit: p => `${p.goals} goals`,
    stat: p => p.goals,
    descending: true,
  },
  {
    id: 'assists',
    title: 'Career Assists',
    question: 'Rank 1 = most career assists',
    unit: p => `${p.assists} assists`,
    stat: p => p.assists,
    descending: true,
  },
  {
    id: 'age',
    title: 'Age',
    question: 'Rank 1 = the YOUNGEST player',
    unit: p => `${p.age} years old`,
    stat: p => p.age,
    descending: false,
  },
];

/* ---------------- deterministic RNG for the daily puzzle ---------------- */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function daySeed(date = new Date()): number {
  // ET-anchored day number so the daily flips at the same moment as the polls
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return Math.floor(Date.UTC(et.getFullYear(), et.getMonth(), et.getDate()) / 86_400_000);
}

interface MarketRow {
  player_name: string;
  age: number;
  nationality: string;
  club: string;
  market_value_usd: number;
  goals: number | null;
  assists: number | null;
}

/** Famous top-200 by current value — recognizable names make Blind Rank fun. */
export async function fetchBlindRankPool(): Promise<RankPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .not('age', 'is', null)
      .order('market_value_usd', { ascending: false })
      .order('player_name', { ascending: true })
      .limit(200);
    if (error || !data) return [];
    const seen = new Set<string>();
    const pool: RankPlayer[] = [];
    for (const row of data as MarketRow[]) {
      const key = row.player_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({
        name: row.player_name,
        club: row.club,
        nationality: row.nationality,
        age: row.age,
        marketValueM: Math.round(row.market_value_usd / 1_000_000),
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
      });
    }
    return pool;
  } catch {
    return [];
  }
}

/**
 * Pick a mode + 5 players. Players are re-drawn until the 5 have strictly
 * distinct stat values (ties would make ranking unfair). Deterministic when
 * a seed is provided (daily), random otherwise (unlimited).
 */
export function buildRound(pool: RankPlayer[], seed?: number): { mode: ModeDef; players: RankPlayer[] } | null {
  if (pool.length < 20) return null;
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const mode = MODES[Math.floor(rng() * MODES.length)];
  for (let attempt = 0; attempt < 40; attempt++) {
    const picked: RankPlayer[] = [];
    const used = new Set<number>();
    while (picked.length < 5) {
      const i = Math.floor(rng() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      picked.push(pool[i]);
    }
    const stats = picked.map(mode.stat);
    if (new Set(stats).size === 5) {
      // goals/assists mode with a bunch of low numbers is boring — require spread
      const spread = Math.max(...stats) - Math.min(...stats);
      if ((mode.id === 'goals' || mode.id === 'assists') && spread < 25) continue;
      return { mode, players: picked };
    }
  }
  return null;
}

/** True ranking: array of player indices, best (rank 1) first. */
export function trueOrder(players: RankPlayer[], mode: ModeDef): number[] {
  const idx = players.map((_, i) => i);
  idx.sort((a, b) => mode.descending
    ? mode.stat(players[b]) - mode.stat(players[a])
    : mode.stat(players[a]) - mode.stat(players[b]));
  return idx;
}

/**
 * Score: +20 per exact slot, +10 for off-by-one, perfect-board bonus +50.
 * Max 150.
 */
export function scoreRound(placements: (number | null)[], players: RankPlayer[], mode: ModeDef): {
  total: number; exact: number; close: number; perfect: boolean; truth: number[];
} {
  const truth = trueOrder(players, mode);
  let exact = 0, close = 0;
  placements.forEach((playerIdx, slot) => {
    if (playerIdx === null) return;
    const trueSlot = truth.indexOf(playerIdx);
    if (trueSlot === slot) exact++;
    else if (Math.abs(trueSlot - slot) === 1) close++;
  });
  const perfect = exact === 5;
  const total = exact * 20 + close * 10 + (perfect ? 50 : 0);
  return { total, exact, close, perfect, truth };
}
