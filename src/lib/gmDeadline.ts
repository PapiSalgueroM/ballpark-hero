/* ─── Round 909: the trade deadline ───
   Until this round no Front Office engine knew what a deadline was: a GM
   could trade in the last week of the season exactly as in the first. A
   rebuild is partly a deadline (sell the veteran in the window, or keep him
   and get nothing), so this module gives the four sims one:

     - tradeWindow / deadlineRefusal: trades are open until the sport's
       deadline period has been played, then shut until the season closes.
     - deadlineStances: the CPU clubs split into buyers, sellers and clubs
       holding, by where they stand against the playoff line.
     - stanceWeights: how a buyer and a seller each lean when they value a
       veteran, a young player and a pick.

   One engine, many sports: the place of the deadline in the season is a
   field on GmDeadlineRules, and the engine hands in its own period count.

   WHAT IS A LEAGUE FACT AND WHAT IS THE GAME'S. Each league fixes its
   deadline as a DATE, and those dates are below, read twice on 2026-10-02.
   The sims have weeks and rounds, not dates, so each rule set carries
   `share`, the point of the regular season the game puts the deadline at.
   For the NFL the league states the week itself (the Tuesday after Week 9
   of an 18 week season), so the share is 9 in 18. For the other three the
   share is a GAME SETTING, chosen so the deadline falls where that sport's
   does (well past halfway, latest in hockey); it is not a published number
   and no screen may quote it as one. */

import type { GmSportId, StandingRow } from './gmPicks';
import { share as winShare } from './gmPicks';

export interface GmDeadlineRules {
  sport: GmSportId;
  /** The point of the regular season the deadline sits at, 0 to 1. */
  share: number;
  /** True where the league itself names the week, false where the share is the game's. */
  shareIsLeagueRule: boolean;
  /** The league's own deadline, in words, with the season it was read for. */
  real: string;
}

/* NFL: 4 p.m. ET on the Tuesday after Week 9 (4 November 2025). The owners
   moved it from the Tuesday after Week 8 at the 2024 league meeting.
   The 2025 date:
     https://www.foxsports.com/stories/nfl/when-2025-nfl-trade-deadline-date-time-notable-trades
     https://www.chargers.com/news/nfl-trade-deadline-2025
   The 2024 move (read by the round's review on 2026-10-02):
     https://www.espn.com/nfl/story/_/id/39813632
     https://www.nfl.com/news/nfl-owners-extend-trade-deadline-to-follow-week-9-games-of-2024-nfl-season */
export const NFL_DEADLINE: GmDeadlineRules = {
  sport: 'nfl', share: 9 / 18, shareIsLeagueRule: true,
  real: 'The Tuesday after Week 9 (4 November in the 2025 season).',
};

/* NBA: 3 p.m. ET on Thursday 5 February 2026.
     https://www.profootballnetwork.com/nba/2026-nba-trade-deadline-date-time/
     https://heavy.com/sports/nba/nba-trade-deadline-date-time-rumors/ */
export const NBA_DEADLINE: GmDeadlineRules = {
  sport: 'nba', share: 0.6, shareIsLeagueRule: false,
  real: 'A date in early February (5 February in the 2025-26 season).',
};

/* NHL: 3 p.m. ET on Friday 6 March 2026.
     https://www.dailyfaceoff.com/news/2026-nhl-trade-deadline-set-march-6
     https://www.nhl.com/news/topic/trade-coverage/nhl-trade-deadline-live-blog-2026 */
export const NHL_DEADLINE: GmDeadlineRules = {
  sport: 'nhl', share: 0.75, shareIsLeagueRule: false,
  real: 'A date in early March (6 March in the 2025-26 season).',
};

/* MLB: 6 p.m. ET on Monday 3 August 2026; the league may set it anywhere
   from 28 July to 3 August.
     https://www.mlb.com/news/mlb-trade-deadline-2026-date-time
     https://www.foxsports.com/stories/mlb/2026-mlb-trade-deadline-date-time-everything-you-should-know */
export const MLB_DEADLINE: GmDeadlineRules = {
  sport: 'mlb', share: 2 / 3, shareIsLeagueRule: false,
  real: 'A date at the turn of July into August (3 August in the 2026 season).',
};

export const GM_DEADLINE_RULES: Record<GmSportId, GmDeadlineRules> = {
  nfl: NFL_DEADLINE, nba: NBA_DEADLINE, nhl: NHL_DEADLINE, mlb: MLB_DEADLINE,
};

/** The last period a trade can follow: with this many played the window is
    still open, with one more it is shut. Never the last period itself, so
    there is always a stretch run. */
export function deadlinePeriod(rules: GmDeadlineRules, periods: number): number {
  const at = Math.round(rules.share * periods);
  return Math.max(1, Math.min(periods - 1, at));
}

export interface TradeWindow {
  open: boolean;
  /** The deadline period for this season length. */
  deadlineAfter: number;
  /** Periods still to play before it shuts. Zero means this is the last chance. */
  periodsLeft: number;
  /** Why a trade is refused, or null while the window is open. */
  reason: string | null;
}

export const DEADLINE_PASSED = 'The trade deadline has passed. Deals open again once the season is over.';

/** `periodsPlayed`: regular season weeks or rounds already played this
    season. `seasonClosed`: the season is over and the next has not started
    (the offseason), when every club can deal again. */
export function tradeWindow(
  rules: GmDeadlineRules, periods: number, periodsPlayed: number, seasonClosed: boolean,
): TradeWindow {
  const after = deadlinePeriod(rules, periods);
  if (seasonClosed) return { open: true, deadlineAfter: after, periodsLeft: after, reason: null };
  if (periodsPlayed <= after) {
    return { open: true, deadlineAfter: after, periodsLeft: after - periodsPlayed, reason: null };
  }
  return { open: false, deadlineAfter: after, periodsLeft: 0, reason: DEADLINE_PASSED };
}

/** The one call a trade path makes first. Null means go ahead. */
export function deadlineRefusal(
  rules: GmDeadlineRules, periods: number, periodsPlayed: number, seasonClosed: boolean,
): string | null {
  return tradeWindow(rules, periods, periodsPlayed, seasonClosed).reason;
}

// ---------------------------------------------------------------------------
// Buyers and sellers
// ---------------------------------------------------------------------------

export type DeadlineStance = 'buyer' | 'seller' | 'holding';

export interface StanceRow extends StandingRow {
  /** Conference or league, when playoff places are counted inside one. */
  group?: string;
}

/* How far off the playoff line a club is, measured in the one unit that
   means the same thing after nine games as after a hundred: standard errors
   of a winning share. A share after n games wobbles by about
   sqrt(0.25 / n), so a gap of 1.5 of those is a hole luck alone rarely
   digs, and half of one is nothing. That makes the split scale free: the
   same two numbers read 2.25 games back in a 9 game NFL season, about five
   in the NBA at its deadline and about eight in MLB at its own.
   Both numbers are the game's design values, not league rules. */
export const BUYER_Z = 0.5;
export const SELLER_Z = 1.5;

export interface StanceReport {
  stance: Record<string, DeadlineStance>;
  /** Standard errors off the line. Zero or less means in a playoff place. */
  gap: Record<string, number>;
}

/** Split the league. `spots` is playoff places per group (or in all, when no
    row carries a group). A club in a place is a buyer; one within BUYER_Z of
    the line still is; one SELLER_Z or more adrift sells; the rest hold.
    Before a game is played nobody has a record and everybody holds.
    Round 1019, optional `placed`: the clubs that hold a playoff place today
    when the bracket is not simply the best records (NFL division winners
    plus wild cards). Given, those clubs are the ones in a place, and the line
    the rest chase is the last of them above the first club out of one, so a
    weak division leader does not drag the line down. Absent, the first
    `spots` by record are in, exactly as before. */
export function deadlineStances(rows: StanceRow[], spots: number, placed?: ReadonlySet<string>): StanceReport {
  const stance: Record<string, DeadlineStance> = {};
  const gap: Record<string, number> = {};
  const groups = new Map<string, StanceRow[]>();
  for (const r of rows) {
    const g = r.group ?? '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(r);
  }
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => winShare(b) - winShare(a) || (b.diff ?? 0) - (a.diff ?? 0) || a.id.localeCompare(b.id));
    const inPlace = (r: StanceRow, i: number): boolean => (placed ? placed.has(r.id) : i < spots);
    const firstOut = sorted.findIndex((r, i) => !inPlace(r, i));
    const line = sorted[(firstOut < 0 ? sorted.length : firstOut) - 1];
    const lineShare = line ? winShare(line) : 0.5;
    sorted.forEach((r, i) => {
      const games = r.wins + r.losses;
      if (games <= 0) { stance[r.id] = 'holding'; gap[r.id] = 0; return; }
      const z = (lineShare - winShare(r)) / Math.sqrt(0.25 / games);
      gap[r.id] = inPlace(r, i) ? Math.min(0, z) : z;
      if (inPlace(r, i) || z <= BUYER_Z) stance[r.id] = 'buyer';
      else if (z >= SELLER_Z) stance[r.id] = 'seller';
      else stance[r.id] = 'holding';
    });
  }
  return { stance, gap };
}

export interface StanceWeights { veteran: number; young: number; pick: number }

/* How each kind of club leans. A buyer pays up for a man who helps now and
   marks its own picks down; a seller wants the pick and the young player and
   marks the veteran down. Every weight is above zero, so a weighted asset
   never counts against the side offering it. */
export const STANCE_WEIGHTS: Record<DeadlineStance, StanceWeights> = {
  buyer: { veteran: 1.1, young: 0.95, pick: 0.9 },
  seller: { veteran: 0.85, young: 1.1, pick: 1.15 },
  holding: { veteran: 1, young: 1, pick: 1 },
};

/** The age a player stops being 'young' and the age he becomes a 'veteran'
    for the leanings above. Between the two he is weighed as he is. */
export const YOUNG_AGE = 24;
export const VETERAN_AGE = 29;

/** What an asset is worth to a club leaning this way. `age` absent means a pick. */
export function stanceValue(stance: DeadlineStance, value: number, age?: number): number {
  const w = STANCE_WEIGHTS[stance];
  if (age === undefined) return value * w.pick;
  if (age <= YOUNG_AGE) return value * w.young;
  if (age >= VETERAN_AGE) return value * w.veteran;
  return value;
}
