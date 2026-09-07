/**
 * Round 478: a Champions League group table is sorted by the Champions
 * League's own rule, which is not the rule any league uses.
 *
 * WHAT WAS WRONG. Every group in this engine was ordered by overall goal
 * difference and then goals scored, the plain order sortedTable falls back
 * to with no context. The real group stage put the games between the level
 * clubs FIRST, so a club that beat its rival home and away sat above it
 * whatever the goal difference said. Since Round 462 the round of 16 is
 * seeded straight off that order (uclRoundOf16Field takes rows[0] and
 * rows[1] of every group), so a group named the wrong winner and the whole
 * bracket hung off it: the wrong club got the home leg, and the wrong club
 * was blocked from meeting its own country.
 *
 * THE RULE, and exactly which competition and which seasons it is. This
 * engine starts a career in one of four worlds, and they do not all order a
 * level table the same way, so the rule is read off the save rather than
 * assumed. Each order below was verified on 2026-09-06 against the season's
 * own record of the UEFA regulations.
 *
 *  h2hAway      The 2005-06 and 2010-11 worlds. Points in the matches
 *               between the level clubs, then goal difference in those
 *               matches, then goals scored AWAY FROM HOME in them, then
 *               overall goal difference, then overall goals scored (then
 *               the club and association coefficient over five seasons,
 *               which this engine does not model). Verified against both of
 *               those seasons' own pages, each quoting the regulations in
 *               force that year: Wikipedia, "2005-06 UEFA Champions League
 *               group stage" and "2010-11 UEFA Champions League group
 *               stage", which give the identical six step list. Note what
 *               is NOT in it: there is no goals scored step inside the head
 *               to head block, and no reapplication step, in either season.
 *               Both are read off the same publisher, so this order rests
 *               on two seasons agreeing rather than on two publishers, and
 *               it is written down here rather than glossed over.
 *
 *  h2hFull      The 2015-16 world. Points between the level clubs, then goal
 *               difference between them, then GOALS SCORED between them,
 *               then away goals between them, then those four criteria
 *               REAPPLIED to any smaller subset still level, then overall
 *               goal difference and overall goals scored (then away goals
 *               over the group, wins, away wins, disciplinary points and the
 *               club coefficient, none of which this engine keeps). Two
 *               sources for the full twelve step list, and the same caveat as
 *               above applies to them: they are two seasons on one publisher
 *               rather than two publishers, though the second names the
 *               primary document. Wikipedia, "2015-16 UEFA Champions League
 *               group stage", and Wikipedia, "2018-19 UEFA Champions League
 *               group stage", which cites it as Regulations article 17.01.
 *               A third, CBS Sports, "Champions
 *               League: How a rare tiebreaker cost PSG first in group and
 *               could result in a tougher knockout draw" (December 2022),
 *               walks the SHAPE down a real group rather than the whole
 *               list: Benfica and PSG were level on points, on their head to
 *               head, on overall goal difference and on goals scored, and
 *               away goals over the whole group gave Benfica first place.
 *               It is cited for the head to head block coming before the
 *               overall numbers and not for the away goals step inside that
 *               block, because by 2022-23 that step was gone (Wikipedia,
 *               "2022-23 UEFA Champions League group stage": head to head
 *               away goals "no longer applied as a tiebreaker starting from
 *               last season", while total away goals stayed).
 *
 *  leaguePhase  The modern (non era) save, which stands in for the 36 club
 *               league phase of 2024-25 onwards. NO head to head step at
 *               all, because a club plays eight of the other 35 and two
 *               level clubs may never have met: goal difference, then goals
 *               scored, then away goals, wins, away wins, then the
 *               opponents' collective points, goal difference and goals,
 *               then discipline and coefficient. Verified against Wikipedia,
 *               "2024-25 UEFA Champions League league phase", and World
 *               Soccer Talk, "Champions League: criteria for teams with
 *               equal points revealed". Its first two steps are exactly what
 *               this engine already did, so the modern save keeps the order
 *               it has always had and now keeps it for a reason that can be
 *               cited.
 *
 * WHERE THE BOUNDARY IS DRAWN. Between 2010-11 and 2015-16 the head to head
 * block gained its goals scored step and its reapplication step. Which
 * season that happened in is NOT established here and is not written down
 * anywhere in this file, because the engine does not need it: a career
 * starts in 2005-06, 2010-11 or 2015-16 and wears its own season's format
 * for its whole life, the way eraUclHasR16 already commits a save to eight
 * groups and a round of 16 for the whole career. Each of the three is
 * verified against its own season. An era added for a season between 2015-16
 * and 2020-21 gets the 2015-16 order, which the 2018-19 source confirms was
 * still in force. AN ERA ADDED FOR 2021-22 OR LATER NEEDS ITS OWN ENTRY:
 * UEFA abolished away goals that summer and the head to head away goals step
 * went with it, so h2hFull would be one step wrong for those three seasons.
 * A run still exactly level after every step above falls to the club name,
 * the same last resort the league sort uses.
 *
 * WHEN THE HEAD TO HEAD IS READ. Only once every pair in the level run has
 * played BOTH its games, which is the convention Round 462 set for the
 * league tables and the way the official standings apply it: a four club
 * group meets twice by matchday 6, so the final table that seeds the round
 * of 16 always reads the full rule, and a mid group table falls back to goal
 * difference and says so in its footnote. Among three or more level clubs
 * the numbers are the mini league of every game between them.
 *
 * WHERE THE RESULTS COME FROM. Round 462's PairLedger, under one key for the
 * whole draw (UCL_GROUP_LEDGER). Club names are unique across the eight
 * groups (initUclWorld draws from a pool with every club already taken
 * removed), so one flat slice of "home|away" to [homeGoals, awayGoals]
 * covers all of them, and keeping the venue is what makes the away goals
 * step readable at all. A save from before this round has no such slice: the
 * results of the group nights it already played are gone, nothing is
 * reconstructed, the sort falls back to goal difference until the pairs meet
 * again, and the footnote says so. Same shape, same honesty, as the league
 * ledger it lives beside.
 *
 * scripts/simClubManagerEraUcl.mjs section 6 drives era careers through the
 * group stage and holds every level run against its own era's order, holds
 * the round of 16 field against the corrected order, and measures how often
 * the head to head reorders a group and changes who tops it. Control: uclgd.
 */
import type { PairLedger, TableRow } from '@/lib/clubManager';

/** The PairLedger key holding this season's group stage results, all eight
 *  groups in one flat slice. Not a league id, and no league may take it. */
export const UCL_GROUP_LEDGER = 'uclGroups';

/** Which of the competition's three orders a save's groups are sorted by. */
export type UclGroupRule = 'h2hAway' | 'h2hFull' | 'leaguePhase';

/** One club's line in the mini league of a run of level clubs: points, goal
 *  difference, goals scored and goals scored away from home, all counted
 *  over the games among that run only. */
interface H2hLine { pts: number; gd: number; gf: number; away: number }

/** Record one group stage result, either group of the draw. */
export function noteUclGroupResult(
  ledger: PairLedger, home: string, away: string, hg: number, ag: number,
): void {
  const pairs = ledger[UCL_GROUP_LEDGER] ?? (ledger[UCL_GROUP_LEDGER] = {});
  pairs[`${home}|${away}`] = [hg, ag];
}

/**
 * The mini league of every game among `run`, or null when a pair of them has
 * not met twice yet, which is when the rule is not readable.
 */
function miniLeague(
  run: TableRow[], pairs: Record<string, [number, number]>,
): Map<string, H2hLine> | null {
  const line = new Map<string, H2hLine>();
  for (const r of run) {
    let pts = 0;
    let gd = 0;
    let gf = 0;
    let away = 0;
    for (const o of run) {
      if (o.club === r.club) continue;
      const atHome = pairs[`${r.club}|${o.club}`];
      const atTheirs = pairs[`${o.club}|${r.club}`];
      if (!atHome || !atTheirs) return null;
      pts += atHome[0] > atHome[1] ? 3 : atHome[0] === atHome[1] ? 1 : 0;
      pts += atTheirs[1] > atTheirs[0] ? 3 : atTheirs[0] === atTheirs[1] ? 1 : 0;
      gd += (atHome[0] - atHome[1]) + (atTheirs[1] - atTheirs[0]);
      gf += atHome[0] + atTheirs[1];
      away += atTheirs[1];
    }
    line.set(r.club, { pts, gd, gf, away });
  }
  return line;
}

/** Overall goal difference, then overall goals scored, then the name. */
function byOverall(run: TableRow[]): TableRow[] {
  return [...run].sort((a, b) =>
    (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.club.localeCompare(b.club));
}

/**
 * One run of clubs level on points, in the head to head order of its era.
 * `full` is the 2015-16 order, which reads goals scored inside the head to
 * head block and reapplies the block to a smaller subset still level; the
 * 2005-06 and 2010-11 order does neither, so a subset it has not separated
 * goes straight to the overall numbers.
 */
function orderHeadToHead(
  run: TableRow[], pairs: Record<string, [number, number]>, full: boolean,
): TableRow[] {
  const line = miniLeague(run, pairs);
  if (!line) return byOverall(run);
  const key = (r: TableRow): number[] => {
    const h = line.get(r.club)!;
    return full ? [h.pts, h.gd, h.gf, h.away] : [h.pts, h.gd, h.away];
  };
  const cmp = (a: TableRow, b: TableRow): number => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return a.club.localeCompare(b.club);
  };
  const sorted = [...run].sort(cmp);
  const same = (a: TableRow, b: TableRow): boolean => {
    const ka = key(a);
    const kb = key(b);
    return ka.every((v, i) => v === kb[i]);
  };
  const out: TableRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && same(sorted[j], sorted[i])) j += 1;
    const sub = sorted.slice(i, j);
    if (sub.length === 1) out.push(sub[0]);
    else if (full && sub.length < run.length) out.push(...orderHeadToHead(sub, pairs, full));
    else out.push(...byOverall(sub));
    i = j;
  }
  return out;
}

/**
 * One group table: points first, then each run of level clubs in the order
 * that world uses. Pure, and a pure function of the rows and the results
 * handed in, so a harness can put a crafted table through it.
 */
export function sortedUclGroupTable(
  rows: TableRow[], rule: UclGroupRule, pairs?: Record<string, [number, number]>,
): TableRow[] {
  const byPts = [...rows].sort((a, b) => b.pts - a.pts || a.club.localeCompare(b.club));
  const out: TableRow[] = [];
  let i = 0;
  while (i < byPts.length) {
    let j = i + 1;
    while (j < byPts.length && byPts[j].pts === byPts[i].pts) j += 1;
    const run = byPts.slice(i, j);
    if (run.length === 1) out.push(run[0]);
    else if (rule === 'leaguePhase') out.push(...byOverall(run));
    else out.push(...orderHeadToHead(run, pairs ?? {}, rule === 'h2hFull'));
    i = j;
  }
  return out;
}

/**
 * The line under a group table saying how level points were split, and how
 * many level pairs are still waiting on their second meeting.
 */
export function uclGroupFootnote(
  rows: TableRow[], rule: UclGroupRule, pairs?: Record<string, [number, number]>,
): string {
  if (rule === 'leaguePhase') {
    return 'Level on points splits on goal difference, then goals scored.';
  }
  const sorted = sortedUclGroupTable(rows, rule, pairs);
  let waiting = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].pts !== sorted[i - 1].pts) continue;
    const a = sorted[i - 1].club;
    const b = sorted[i].club;
    if (!pairs?.[`${a}|${b}`] || !pairs?.[`${b}|${a}`]) waiting += 1;
  }
  const pending = waiting === 0 ? ''
    : ` ${waiting} level ${waiting === 1 ? 'pair has' : 'pairs have'} not met twice yet, so ${waiting === 1 ? 'that one splits' : 'those split'} on goal difference for now.`;
  const steps = rule === 'h2hFull'
    ? 'points, then goal difference, then goals, then away goals'
    : 'points, then goal difference, then away goals';
  return `Level on points splits on the games between the level clubs first (${steps}) once they have met twice, then overall goal difference, then goals scored.${pending}`;
}
