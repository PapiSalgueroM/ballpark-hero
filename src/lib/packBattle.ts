import { supabase } from '@/integrations/supabase/client';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Pack Battle (R6 build plan, Part 1 item 9; MASTER_PLAN Wave 15d, the final
 * unbuilt R6 item). The format is daily football top-trumps: you get a pack of
 * mystery cards and play them off against an opponent, one stat at a time.
 *
 * MECHANIC
 * A daily pack of 5 mystery player cards, revealed one at a time. The player
 * always holds a "banked" card face up (its market value shown) and must
 * call whether the next card in the pack is worth MORE or LESS before it
 * flips, Top Trumps style. A correct call keeps that new card as the banked
 * card and banks its value; a single wrong call busts the pack immediately
 * and the run ends with whatever was banked before the miss. Getting through
 * all 5 cards (4 correct calls) without busting is a full "pack cleared".
 *
 * SCORING
 * Score = sum of the market values of every card successfully called before
 * a bust (or before the pack completes). Ties count in the player's favor,
 * matching the sitewide convention already used in
 * HigherLowerTransfers.tsx's guess() function.
 *
 * DATA SOURCE (same table + verified shape as signThePlayer.ts, confirmed
 * live on flawuiqbvjobmkfkauhw 2026-07-03)
 * player_market_values_dedup: DISTINCT ON (player_name, year) view, already
 * one row per player per year, so no client-side name-dedupe pass is needed
 * beyond what the view already guarantees. Filtered to year = 2026 exactly
 * like signThePlayer.ts. Fetched with .order() + .range() paging rather than
 * a single .limit() call, since PostgREST caps any single request at 1000
 * rows and the 2026 slice alone is already north of 5000 rows.
 *
 * DAILY VS UNLIMITED
 * Daily: dateSeed(getTodayET()) deterministically draws the day's 5-card
 * pack (and the order they're revealed in) from the full pool, so every
 * player faces the identical pack on the same ET date, matching the
 * sitewide daily convention in signThePlayer.ts / careerLadder.ts. Unlimited:
 * a fresh Math.random() draw every run, reshuffling a new 5-card pack each
 * time so the mode never runs out of packs.
 */

export interface PackCard {
  name: string;
  club: string;
  nationality: string;
  value: number; // market value in USD
}

export type PlayMode = 'daily' | 'unlimited';

export interface PackResult {
  cards: PackCard[];
  /** Per-card outcome once revealed: true = correct call, false = wrong call (bust), null = not reached. */
  calls: (boolean | null)[];
  bankedValue: number;
  bustIndex: number | null; // index in cards[] where the bust happened, null if cleared
  cleared: boolean; // true if all 5 cards were called correctly
}

// ---------------------------------------------------------------------------
// Pool fetch (mirrors signThePlayer.ts's fetchMarketPool exactly)
// ---------------------------------------------------------------------------

interface RawRow {
  player_name: string | null;
  nationality: string | null;
  club: string | null;
  market_value_usd: number | null;
}

export async function fetchPackPool(): Promise<PackCard[]> {
  const cols = 'player_name, nationality, club, market_value_usd';
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

  const cleaned: PackCard[] = [];
  for (const r of rows) {
    const name = (r.player_name ?? '').trim();
    const value = Number(r.market_value_usd) || 0;
    if (!name || value <= 0) continue;
    cleaned.push({
      name,
      club: (r.club ?? '').trim() || 'Free agent',
      nationality: (r.nationality ?? '').trim() || 'Unknown',
      value,
    });
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Deterministic shuffle (mirrors rarityRound.ts / signThePlayer.ts exactly)
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

const PACK_SIZE = 5;

/** Daily pack: date-seeded 5-card draw, identical for every player on the same ET date. */
export function buildDailyPack(pool: PackCard[]): PackCard[] {
  const seed = dateSeed(getTodayET());
  return seededShuffle(pool, seed).slice(0, PACK_SIZE);
}

/** Unlimited pack: fresh random 5-card draw every call. */
export function buildUnlimitedPack(pool: PackCard[]): PackCard[] {
  return shuffle(pool).slice(0, PACK_SIZE);
}

export function buildPackForMode(mode: PlayMode, pool: PackCard[]): PackCard[] {
  return mode === 'daily' ? buildDailyPack(pool) : buildUnlimitedPack(pool);
}

// ---------------------------------------------------------------------------
// Call resolution + scoring
// ---------------------------------------------------------------------------

/** Whether calling "higher" (or not, i.e. "lower") on the next card is correct. Ties count in the player's favor. */
export function resolveCall(bankedValue: number, nextValue: number, calledHigher: boolean): boolean {
  if (nextValue === bankedValue) return true;
  return calledHigher ? nextValue > bankedValue : nextValue < bankedValue;
}

/** Grade + headline purely on how far through the pack the run got. */
export function gradePack(result: PackResult): { grade: string; headline: string } {
  const correctCalls = result.calls.filter(c => c === true).length;
  if (result.cleared) return { grade: 'A+', headline: 'Pack cleared! Every call landed.' };
  if (correctCalls >= 3) return { grade: 'B', headline: 'Busted late. So close to a clean pack.' };
  if (correctCalls >= 1) return { grade: 'C', headline: 'A few good calls before the bust.' };
  return { grade: 'F', headline: 'Busted on the first card. Tough pack.' };
}

/** Emoji-grid share block: one pip per card, per site convention (ResultScreen's emojiGrid, always a styled block). */
export function buildPackEmojiGrid(result: PackResult): string {
  const pips = result.calls.map(c => (c === true ? '🟢' : c === false ? '🔴' : '⚪'));
  const header = result.cleared
    ? `Pack Battle: pack cleared, ${fmtCompactUsd(result.bankedValue)} banked`
    : `Pack Battle: busted, ${fmtCompactUsd(result.bankedValue)} banked`;
  return [header, pips.join('')].join('\n');
}

/** Compact USD formatter, mirrors dealPlayers.ts's fmtCompactUsd exactly so both games render values identically. */
export function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
  return '$' + Math.round(n);
}
