/**
 * Round 1104: the rookie contract for a draft slot, one function for the US
 * careers. Today only the NFL has a table (src/data/nflRookieScale.ts); a
 * sport with none answers null and its engine keeps its own rule. Round 1123
 * adds the NBA table to this same function, not a second mechanism.
 *
 * It imports the table and nothing else.
 *
 * THE NFL RULE.
 *   Round one (picks 1 to 32): the slot's own row, its total over its years.
 *   Rounds two to seven: the engine drafts 32 a round for seven rounds (224
 *   picks), the real draft runs to 257 with compensatory picks. A pick is paid
 *   by its place in its ROUND: the straight line from the real round's first
 *   pick to its last, read at the engine pick's place among the round's 32.
 *   Undrafted (pick 0 or below, or past the seventh round): the rookie
 *   minimum.
 *   An era with no verified table (`heldAs`) pays the same slot of the era it
 *   names, times its scale.
 *   Salary is millions a year, to 0.1, never under 0.1. Every NFL rookie in
 *   this game signs for four seasons (a game rule, see the table's header).
 */
import { NFL_ROOKIE_SCALE, type NflRookieTable } from '@/data/nflRookieScale';

export interface RookieDeal {
  /** Millions a year, to 0.1. */
  salary: number;
  years: number;
  /** True when the number behind this slot is not two sourced. */
  held: boolean;
}

export const NFL_PICKS_A_ROUND = 32;
export const NFL_ROUNDS = 7;
const NFL_ROOKIE_YEARS = 4;

/** Dollars a year for an NFL slot off one era's own table, and whether it is held. */
function nflSlot(table: NflRookieTable, pick: number): { perYear: number; held: boolean } {
  if (pick <= 0 || pick > NFL_PICKS_A_ROUND * NFL_ROUNDS) return { perYear: table.undrafted, held: false };
  if (pick <= NFL_PICKS_A_ROUND) {
    const r = table.firstRound.find(x => x.pick === pick);
    if (r) return { perYear: r.total / r.years, held: !!r.held || r.second === undefined };
  }
  const round = Math.ceil(pick / NFL_PICKS_A_ROUND);
  const r = table.laterRounds.find(x => x.round === round);
  if (!r) return { perYear: table.undrafted, held: true };
  const first = r.firstTotal / r.years;
  const last = r.lastTotal / r.years;
  const place = (pick - (round - 1) * NFL_PICKS_A_ROUND - 1) / (NFL_PICKS_A_ROUND - 1);
  return { perYear: first + (last - first) * place, held: r.held !== undefined };
}

const toMillions = (dollars: number): number => Math.max(0.1, Math.round(dollars / 100_000) / 10);

/** The rookie contract for a draft slot. null = this sport has no table yet
 *  (the caller keeps its own rule). pick 0 or below = undrafted. `position` is
 *  part of the shape for sports where the slot depends on it; the NFL pays
 *  the slot whatever the position. An era id the table does not know reads
 *  `now`. */
export function rookieDeal(sport: 'nfl' | 'nba' | 'mlb' | 'nhl', era: string, pick: number, _position?: string): RookieDeal | null {
  if (sport !== 'nfl') return null;
  const scale = era === 'y2005' ? NFL_ROOKIE_SCALE.y2005 : NFL_ROOKIE_SCALE.now;
  if ('heldAs' in scale) {
    const base = nflSlot(NFL_ROOKIE_SCALE[scale.heldAs.of], pick);
    return { salary: toMillions(base.perYear * scale.heldAs.scale), years: NFL_ROOKIE_YEARS, held: true };
  }
  const slot = nflSlot(scale, pick);
  return { salary: toMillions(slot.perYear), years: NFL_ROOKIE_YEARS, held: slot.held };
}
