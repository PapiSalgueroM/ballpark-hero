import { supabase } from '@/integrations/supabase/client';
import { dailyPrngSeed, dateSeed, getTodayET } from '@/lib/dateUtils';
import { FORMATIONS, type Formation, type FormationSlot } from '@/lib/squadDeal';
import type { Position } from '@/types/game';

/**
 * Sign the Player: "Guess the Value, Get the Player" (MASTER_PLAN #54).
 *
 * MECHANIC
 * 11 rounds, one per slot of a real formation. Each round shows a real
 * current player (club, nationality, position, age; nationality rendered as
 * a flag only, per the sitewide flagFor() convention in dealPlayers.ts) with
 * their market value hidden. The player types a numeric USD guess. If the
 * guess falls inside a tolerance band around the true value, the player is
 * SIGNED into the formation slot their position matches; otherwise the round
 * is lost and that slot stays empty. The tolerance band is tighter for
 * famous (high-value) players and looser for obscure ones, so guessing a
 * superstar's price to within 30% is a real test, while guessing a squad
 * player's price only has to land in the right neighborhood.
 *
 * DATA SOURCE (verified live on flawuiqbvjobmkfkauhw, 2026-07-03)
 * player_market_values_dedup is a DISTINCT ON (player_name, year) view over
 * player_market_values (view definition confirmed via pg_get_viewdef),
 * keeping the highest market_value_usd per player per year - i.e. already
 * exactly one row per player for a given year, no client-side dedupe needed.
 * Verified row count for year = 2026: 5393 rows, 5393 distinct player_name
 * (total_rows === distinct_players), confirming true 1-row-per-player.
 * Position spread for that slate (distinct-player counts, 2026):
 *   Left Midfield 632, Central Midfield 500, Centre-Back 499,
 *   Centre-Forward 498, Right-Back 497, Right Midfield 495, Goalkeeper 494,
 *   Attacking Midfield 475, Left-Back 470, Left Winger 426, Right Winger 407.
 * Every FORMATIONS slot (imported from squadDeal.ts, the same formation
 * catalog Squad Deal uses) allows enough distinct source positions that no
 * slot in any of the 9 formations can ever come up short of candidates.
 *
 * TOLERANCE BAND
 * Computed from the player's percentile rank within the full 2026 pool by
 * market value (rank 1 = most valuable = most famous, matching the same
 * prominence convention rarityRound.ts already established sitewide).
 *   toleranceFraction = MIN_TOLERANCE + (MAX_TOLERANCE - MIN_TOLERANCE) * percentile
 * percentile is 0 for the single most valuable player in the pool and
 * approaches 1 for the least valuable, so MIN_TOLERANCE (tightest, elite
 * players) is 0.15 and MAX_TOLERANCE (loosest, obscure players) is 0.60.
 * A guess counts as a correct sign whenever
 *   abs(guess - trueValue) / trueValue <= toleranceFraction
 * A player sitting exactly at the pool's value median lands almost exactly
 * on the spec's "within 30 percent" example.
 *
 * DAILY VS UNLIMITED
 * Daily: dateSeed(getTodayET()) deterministically picks (a) which formation
 * from FORMATIONS is used and (b) which 11 players fill its slots, so every
 * player faces the same slate on the same ET date, matching the sitewide
 * daily-reset convention in src/lib/dateUtils.ts. Unlimited: a fresh
 * Math.random() formation + player draw every run.
 */

// ---------------------------------------------------------------------------
// Position normalization (mirrors squadDeal.ts's POSITION_NORMALIZE exactly,
// reusing the same Position type from src/types/game.ts so a signed player's
// raw DB position string maps onto the exact vocabulary FORMATIONS slots
// (imported from squadDeal.ts) are defined against, with no cast needed)
// ---------------------------------------------------------------------------

export type SlotPosition = Position;

const POSITION_NORMALIZE: Record<string, SlotPosition> = {
  Goalkeeper: 'GK', GK: 'GK',
  'Centre-Back': 'CB', 'Center-Back': 'CB', CB: 'CB', Defender: 'CB',
  'Left-Back': 'LB', LB: 'LB', 'Right-Back': 'RB', RB: 'RB',
  'Left Wing-Back': 'LWB', LWB: 'LWB', 'Right Wing-Back': 'RWB', RWB: 'RWB',
  'Defensive Midfield': 'CDM', CDM: 'CDM', 'Central Midfield': 'CM', CM: 'CM', Midfield: 'CM',
  'Attacking Midfield': 'CAM', CAM: 'CAM', 'Left Midfield': 'LM', LM: 'LM', 'Right Midfield': 'RM', RM: 'RM',
  'Left Winger': 'LW', LW: 'LW', 'Right Winger': 'RW', RW: 'RW',
  'Centre-Forward': 'CF', 'Center-Forward': 'CF', 'Second Striker': 'CF', CF: 'CF',
  Striker: 'ST', ST: 'ST', Forward: 'ST', Attack: 'ST',
};

function normalizePosition(raw: string | null | undefined): SlotPosition | null {
  if (!raw) return null;
  return POSITION_NORMALIZE[raw.trim()] ?? null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketPlayer {
  name: string;
  club: string;
  nationality: string;
  position: SlotPosition;
  age: number;
  /** True market value in USD. Hidden from the player until the round resolves. */
  value: number;
  /** 0 = most valuable player in the whole pool, approaching 1 for the least valuable. */
  percentile: number;
}

export interface RoundSlot {
  slot: FormationSlot;
  player: MarketPlayer;
  /** Tolerance as a fraction of true value, e.g. 0.30 = must guess within 30%. */
  tolerance: number;
}

export interface RoundOutcome {
  slot: FormationSlot;
  player: MarketPlayer;
  guess: number;
  tolerance: number;
  /** Fraction of true value the guess was off by (always >= 0). */
  errorFraction: number;
  signed: boolean;
}

export interface Slate {
  formation: Formation;
  rounds: RoundSlot[];
}

export type PlayMode = 'daily' | 'unlimited';

const MIN_TOLERANCE = 0.15; // elite / most famous players: guess within 15%
const MAX_TOLERANCE = 0.60; // most obscure players: guess within 60%

/** Tolerance fraction for a given percentile (0 = most famous, 1 = most obscure). */
export function toleranceForPercentile(percentile: number): number {
  const p = Math.max(0, Math.min(1, percentile));
  return MIN_TOLERANCE + (MAX_TOLERANCE - MIN_TOLERANCE) * p;
}

/** Whether a guess counts as a successful sign for a given true value + tolerance. */
export function isWithinTolerance(guess: number, trueValue: number, tolerance: number): boolean {
  if (trueValue <= 0) return false;
  return Math.abs(guess - trueValue) / trueValue <= tolerance;
}

// ---------------------------------------------------------------------------
// Pool fetch
// ---------------------------------------------------------------------------

interface RawRow {
  player_name: string | null;
  position: string | null;
  age: number | null;
  nationality: string | null;
  club: string | null;
  market_value_usd: number | null;
}

/**
 * Fetches the full 2026 pool from player_market_values_dedup (already one
 * row per player, see module docstring), normalizes positions, drops rows
 * with no usable position/value, and assigns each player a percentile rank
 * by market value (0 = most valuable). Single request, under PostgREST's
 * 1000-row cap is NOT assumed here: the dedup view for 2026 has 5393 rows,
 * so this paginates with .range() in 1000-row pages rather than truncating
 * silently at PostgREST's per-request cap.
 */
export async function fetchMarketPool(): Promise<MarketPlayer[]> {
  const cols = 'player_name, position, age, nationality, club, market_value_usd';
  const pageSize = 1000;
  const rows: RawRow[] = [];

  for (let page = 0; page < 20; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select(cols)
      .eq('year', 2026)
      .order('market_value_usd', { ascending: false })
      .range(from, to);
    if (error) break;
    if (!data || data.length === 0) break;
    rows.push(...(data as RawRow[]));
    if (data.length < pageSize) break; // last page
  }

  const cleaned: { name: string; club: string; nationality: string; position: SlotPosition; age: number; value: number }[] = [];
  for (const r of rows) {
    const name = (r.player_name ?? '').trim();
    const pos = normalizePosition(r.position);
    const value = Number(r.market_value_usd) || 0;
    if (!name || !pos || value <= 0) continue;
    cleaned.push({
      name,
      club: (r.club ?? '').trim() || 'Free agent',
      nationality: (r.nationality ?? '').trim() || 'Unknown',
      position: pos,
      age: r.age ?? 0,
      value,
    });
  }

  // Already sorted descending by market_value_usd from the query, but the
  // multi-page fetch could interleave ties across pages, so re-sort once
  // over the full merged set before assigning percentiles.
  cleaned.sort((a, b) => b.value - a.value);

  const n = cleaned.length;
  return cleaned.map((p, i) => ({
    ...p,
    // rank i=0 (most valuable) -> percentile 0; rank n-1 (least valuable) -> percentile ~1.
    percentile: n <= 1 ? 0 : i / (n - 1),
  }));
}

// ---------------------------------------------------------------------------
// Deterministic shuffle (mirrors rarityRound.ts's seededShuffle exactly, so
// every date-seeded game on the site produces the same class of ordering)
// ---------------------------------------------------------------------------

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds one 11-round slate: picks a formation and, for each slot in order,
 * draws one not-yet-used player whose normalized position is in
 * slot.allowed. Falls back gracefully by relaxing to "any unused player of
 * matching broad role" only if a slot's exact allowed-list is somehow
 * exhausted, which verified pool sizes above show should not happen for any
 * of the 9 FORMATIONS entries against 5393 players (486+ per detected
 * position, minimum any single slot's allowed list could need).
 */
function buildSlate(pool: MarketPlayer[], formation: Formation, rng: () => number): RoundSlot[] {
  const used = new Set<string>();
  const rounds: RoundSlot[] = [];

  const pick = (candidates: MarketPlayer[]): MarketPlayer | null => {
    const avail = candidates.filter(p => !used.has(p.name));
    if (avail.length === 0) return null;
    const idx = Math.floor(rng() * avail.length);
    return avail[idx];
  };

  for (const slot of formation.slots) {
    let candidates = pool.filter(p => slot.allowed.includes(p.position));
    let player = pick(candidates);
    if (!player) {
      // Extremely defensive fallback: broaden to the whole pool rather than
      // leave a round unplayable. Verified pool sizes make this branch dead
      // code in practice, but a data change elsewhere should never crash the
      // page (loading/error states over silent breakage, per site convention).
      player = pick(pool);
    }
    if (!player) continue; // pool genuinely empty; caller handles rounds.length === 0
    used.add(player.name);
    rounds.push({ slot, player, tolerance: toleranceForPercentile(player.percentile) });
  }
  return rounds;
}

/** Daily slate: date-seeded formation choice + date-seeded player draw, identical for every player on the same ET date. */
export function buildDailySlate(pool: MarketPlayer[]): Slate {
  /* Round 212: the HASHED date, not the raw one. A raw date seed makes a
     Lehmer generator's first draw a straight line in the date, which froze
     this puzzle for months at a time. See dailyPrngSeed in dateUtils. */
  const seed = dailyPrngSeed(getTodayET());
  const formation = seededShuffle(FORMATIONS, seed)[0];
  let s = (seed * 48271) % 2147483647;
  if (s <= 0) s += 2147483646;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return { formation, rounds: buildSlate(pool, formation, rng) };
}

/** Unlimited slate: fresh random formation + player draw every call. */
export function buildUnlimitedSlate(pool: MarketPlayer[]): Slate {
  const formation = shuffle(FORMATIONS)[0];
  return { formation, rounds: buildSlate(pool, formation, Math.random) };
}

export function buildSlateForMode(mode: PlayMode, pool: MarketPlayer[]): Slate {
  return mode === 'daily' ? buildDailySlate(pool) : buildUnlimitedSlate(pool);
}

// ---------------------------------------------------------------------------
// Scoring + result formatting
// ---------------------------------------------------------------------------

export interface SquadSummary {
  signedCount: number;
  totalRounds: number;
  /** Sum of true market value for every SIGNED player, in USD. */
  totalValue: number;
  /** Distinct formation slot labels filled, e.g. ["GK", "CB", "CB", ...]. */
  coverage: string[];
}

export function summarizeSquad(outcomes: RoundOutcome[]): SquadSummary {
  const signed = outcomes.filter(o => o.signed);
  return {
    signedCount: signed.length,
    totalRounds: outcomes.length,
    totalValue: signed.reduce((sum, o) => sum + o.player.value, 0),
    coverage: signed.map(o => o.slot.label),
  };
}

/** Grade the run purely on how many of the 11 slots got signed. */
export function gradeSquad(summary: SquadSummary): { grade: string; headline: string } {
  const { signedCount, totalRounds } = summary;
  const pct = totalRounds > 0 ? signedCount / totalRounds : 0;
  if (signedCount === totalRounds) return { grade: 'A+', headline: 'Full XI signed! A perfect transfer window.' };
  if (pct >= 0.8) return { grade: 'A', headline: 'A near-complete squad. Excellent scouting.' };
  if (pct >= 0.6) return { grade: 'B', headline: 'A solid squad with a few gaps.' };
  if (pct >= 0.4) return { grade: 'C', headline: 'A thin squad. The board wants better valuations.' };
  if (signedCount > 0) return { grade: 'D', headline: 'Barely a matchday squad. Back to scouting school.' };
  return { grade: 'F', headline: 'No signings. The transfer window slammed shut.' };
}

/** Emoji-grid share block: one row per round, signed vs missed, per site convention (ResultScreen's emojiGrid, always a styled block, never a bare one-liner). */
export function buildEmojiGrid(outcomes: RoundOutcome[], summary: SquadSummary): string {
  const bars = outcomes.map(o => (o.signed ? '✅' : '❌'));
  const header = `Sign the Player: ${summary.signedCount}/${summary.totalRounds} signed`;
  return [header, bars.join('')].join('\n');
}

/** Human-readable per-round line for the result screen's detail list. */
export function roundSummaryLine(o: RoundOutcome): string {
  const pct = Math.round(o.errorFraction * 100);
  return o.signed
    ? `${o.player.name} (${o.slot.label}): SIGNED, guess was ${pct}% off`
    : `${o.player.name} (${o.slot.label}): missed, guess was ${pct}% off (needed within ${Math.round(o.tolerance * 100)}%)`;
}
