/**
 * Round 1542: closing a front office season's awards, shared.
 *
 * What does not depend on the sport, lifted out of the NBA's close
 * (src/lib/nbaSeasonStats.ts, nbaCloseSeasonStats) so the NFL board calls it
 * now and the NBA, MLB and NHL boards can switch to it in a one line round
 * each (owed: the NBA's file is not edited in the round that wrote this):
 *   ONCE A SEASON. A season already in the history is handed back as it was
 *     and nothing is written twice (the Round 431 rule that a season closes
 *     once).
 *   THE HISTORY keeps the last FO_HISTORY_CAP seasons.
 *   THE MARKS. Each winner's card gains `${season} ${label}`, wherever the man
 *     is: a roster, a practice squad, the free agent pool (a man can be cut
 *     after the deadline he played to). A man in two lists is marked once,
 *     the first list he is found in.
 * Pure but for the league it is handed, no imports.
 */

/** How many seasons of awards a league keeps. */
export const FO_HISTORY_CAP = 40;

/** The season's entry in a history, or null. */
export function foClosedSeason<A extends { season: number }>(history: readonly A[] | undefined, season: number): A | null {
  return (history ?? []).find(a => a.season === season) ?? null;
}

/**
 * Close a season once. `name` names the season's awards (null: the league
 * kept no lines for it, nothing is written); `list` gives every award as
 * [label, man id] pairs; `men` are the lists to mark, in the order to look.
 */
export function foCloseOnce<A extends { season: number }>(
  league: { season: number; awards?: A[] },
  name: () => A | null,
  list: (a: A) => [string, string][],
  men: readonly (readonly { id: string; awards?: string[] }[])[],
): A | null {
  const done = foClosedSeason(league.awards, league.season);
  if (done) return done;
  const awards = name();
  if (!awards) return null;
  league.awards = [...(league.awards ?? []), awards].slice(-FO_HISTORY_CAP);
  const byId = new Map<string, { id: string; awards?: string[] }>();
  for (const group of men) for (const p of group) if (!byId.has(p.id)) byId.set(p.id, p);
  for (const [label, id] of list(awards)) {
    const man = byId.get(id);
    if (man) man.awards = [...(man.awards ?? []), `${awards.season} ${label}`];
  }
  return awards;
}
