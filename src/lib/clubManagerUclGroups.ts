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
 * THE RULE, and which competition and which seasons it is. Two eras of the
 * competition, and they order a level table in opposite ways, so this
 * module carries both and the save says which it plays.
 *
 *  groupStage   The eight group, four club stage: 2003-04, when the second
 *               group stage was abolished and the round of 16 came in,
 *               through 2023-24, the last season before the 36 club league
 *               phase. UEFA's own order (Champions League Regulations
 *               article 17.01), verified 2026-09-06 against two sources
 *               that quote it in full: Wikipedia, "2018-19 UEFA Champions
 *               League group stage" (tiebreaking criteria, "Points in
 *               head-to-head matches among tied teams", then head to head
 *               goal difference, then head to head goals scored, then the
 *               head to head criteria reapplied to any subset still level,
 *               then goal difference in all group matches, then goals
 *               scored in all group matches, then away goals in all group
 *               matches, wins, away wins, disciplinary points, club
 *               coefficient), and CBS Sports, "Champions League: How a rare
 *               tiebreaker cost PSG first in group and could result in a
 *               tougher knockout draw" (December 2022), which walks the
 *               same order down a real group: Benfica and PSG were level on
 *               points, on their head to head, on overall goal difference
 *               and on goals scored, and away goals over the group gave
 *               Benfica first place.
 *
 *               THE FIVE STEPS ENCODED HERE are head to head points, head
 *               to head goal difference, head to head goals scored, the
 *               reapplication to a subset still level, then overall goal
 *               difference and overall goals scored. That is where the
 *               sources stop agreeing across the whole era and where this
 *               engine stops being able to answer honestly, both:
 *               - Head to head AWAY goals was a real step (between head to
 *                 head goals scored and the reapplication) for 2003-04 to
 *                 2020-21 and was DROPPED from 2021-22 when UEFA abolished
 *                 the away goals rule (Wikipedia, "2022-23 UEFA Champions
 *                 League group stage": head to head away goals "no longer
 *                 applied as a tiebreaker starting from last season",
 *                 while total away goals stayed). An era career here starts
 *                 in one season and runs forward for as many as it lasts,
 *                 the way eraUclHasR16 already commits a save to one
 *                 format for the whole career, so a step that changes in
 *                 the middle of the era is not one this engine can encode
 *                 without being wrong for half of it.
 *               - Away goals over the group, wins, away wins, disciplinary
 *                 points and the club coefficient are all after overall
 *                 goals scored, and a TableRow keeps a season total rather
 *                 than a home and away split, no cards and no coefficient.
 *               A run still exactly level after the encoded steps falls to
 *               the club name, the same last resort the league sort uses.
 *
 *  leaguePhase  The 36 club single table from 2024-25, which the modern
 *               (non era) save stands in for. It has NO head to head step
 *               at all, because a club plays eight of the other 35 and two
 *               level clubs may never have met: goal difference, then goals
 *               scored, then away goals, wins, away wins, then the
 *               opponents' collective points, goal difference and goals,
 *               then discipline and coefficient. Verified 2026-09-06
 *               against Wikipedia, "2024-25 UEFA Champions League league
 *               phase", and World Soccer Talk, "Champions League: criteria
 *               for teams with equal points revealed". The first two steps
 *               are exactly what this engine already did, so a modern save
 *               keeps the order it has always had, and now it keeps it for
 *               a reason that can be cited.
 *
 * WHEN THE HEAD TO HEAD IS READ. Only once every pair in the level run has
 * played BOTH its games, which is the convention Round 462 set for the
 * league tables and the way the official standings apply it: a four club
 * group meets twice by matchday 6, so the final table that seeds the round
 * of 16 always reads the full rule, and a mid group table falls back to
 * goal difference and says so in its footnote. Among three or more level
 * clubs the numbers are the mini league of every game between them.
 *
 * WHERE THE RESULTS COME FROM. Round 462's PairLedger, under one key for
 * the whole draw (UCL_GROUP_LEDGER). Club names are unique across the eight
 * groups (initUclWorld draws from a pool with every club already taken
 * removed), so one flat slice of "home|away" to [homeGoals, awayGoals]
 * covers all of them. A save from before this round has no such slice: the
 * results of the group nights it already played are gone, nothing is
 * reconstructed, the sort falls back to goal difference until the pairs
 * meet again, and the footnote says so. Same shape, same honesty, as the
 * league ledger it lives beside.
 *
 * scripts/simClubManagerEraUcl.mjs section 6 drives era careers through the
 * group stage and holds every level pair against this rule, holds the round
 * of 16 field against the corrected order, and measures how often the head
 * to head reorders a group and changes who tops it. Control: uclgd.
 */
import type { PairLedger, TableRow } from '@/lib/clubManager';

/** The PairLedger key holding this season's group stage results, all eight
 *  groups in one flat slice. Not a league id, and no league may take it. */
export const UCL_GROUP_LEDGER = 'uclGroups';

/** Which of the competition's two orders a save's groups are sorted by. */
export type UclGroupRule = 'groupStage' | 'leaguePhase';

/** One club's mini league line among a run of level clubs. */
interface H2hLine { pts: number; gd: number; gf: number }

/** Record one group stage result, either group of the draw. */
export function noteUclGroupResult(
  ledger: PairLedger, home: string, away: string, hg: number, ag: number,
): void {
  const pairs = ledger[UCL_GROUP_LEDGER] ?? (ledger[UCL_GROUP_LEDGER] = {});
  pairs[`${home}|${away}`] = [hg, ag];
}

/**
 * The mini league of every game among `run`, or null when a pair of them
 * has not met twice yet, which is when the rule is not readable.
 */
function miniLeague(
  run: TableRow[], pairs: Record<string, [number, number]>,
): Map<string, H2hLine> | null {
  const line = new Map<string, H2hLine>();
  for (const r of run) {
    let pts = 0;
    let gd = 0;
    let gf = 0;
    for (const o of run) {
      if (o.club === r.club) continue;
      const home = pairs[`${r.club}|${o.club}`];
      const away = pairs[`${o.club}|${r.club}`];
      if (!home || !away) return null;
      pts += home[0] > home[1] ? 3 : home[0] === home[1] ? 1 : 0;
      pts += away[1] > away[0] ? 3 : away[0] === away[1] ? 1 : 0;
      gd += (home[0] - home[1]) + (away[1] - away[0]);
      gf += home[0] + away[1];
    }
    line.set(r.club, { pts, gd, gf });
  }
  return line;
}

/** Overall goal difference, then overall goals scored, then the name. */
function byOverall(run: TableRow[]): TableRow[] {
  return [...run].sort((a, b) =>
    (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.club.localeCompare(b.club));
}

/**
 * One run of clubs level on points, in the group stage order. The three
 * head to head numbers first; then any sub-run still exactly level on all
 * three gets those same three numbers recomputed among ITSELF, which is the
 * regulations' reapplication step, and only a sub-run that is the whole run
 * (nobody separated at all) falls through to the overall numbers.
 */
function orderGroupStage(
  run: TableRow[], pairs: Record<string, [number, number]>,
): TableRow[] {
  const line = miniLeague(run, pairs);
  if (!line) return byOverall(run);
  const key = (r: TableRow) => line.get(r.club)!;
  const sorted = [...run].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return kb.pts - ka.pts || kb.gd - ka.gd || kb.gf - ka.gf || a.club.localeCompare(b.club);
  });
  const out: TableRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    const ki = key(sorted[i]);
    let j = i + 1;
    while (j < sorted.length) {
      const kj = key(sorted[j]);
      if (kj.pts !== ki.pts || kj.gd !== ki.gd || kj.gf !== ki.gf) break;
      j += 1;
    }
    const sub = sorted.slice(i, j);
    if (sub.length === 1) out.push(sub[0]);
    else if (sub.length < run.length) out.push(...orderGroupStage(sub, pairs));
    else out.push(...byOverall(sub));
    i = j;
  }
  return out;
}

/**
 * One group table: points first, then each run of level clubs in the order
 * that competition uses. Pure, and a pure function of the rows and the
 * results handed in, so a harness can put a crafted table through it.
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
    else if (rule === 'groupStage') out.push(...orderGroupStage(run, pairs ?? {}));
    else out.push(...byOverall(run));
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
  return `Level on points splits on the games between the level clubs first (points, then goal difference, then goals) once they have met twice, then overall goal difference, then goals scored.${pending}`;
}
