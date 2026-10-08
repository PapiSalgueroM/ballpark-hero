/* awardDecision.ts (Round 1103). How an NBA award is scored, in one place.

   NBA Front Office (nbaSeasonStats.ts) ranks a league of men by these scores. NBA My Career scores one man by
   the same functions and compares him with a drawn field. Neither keeps a copy. Front Office keeps its own
   eligibility (its games share, its stingy club rule); the two rules of eligibility at the bottom are the real
   league's, and the career applies them.

   This file imports NOTHING, on purpose: NBA Front Office's chunk must not gain the career's norms table, and a
   file with no imports cannot join a cycle. Every rule number is passed in. */

/** Points plus rebounds plus assists a game. */
export function nbaProduction(ppg: number, rpg: number, apg: number): number {
  return ppg + rpg + apg;
}

/** The MVP score: production plus `winWeight` times the club's winning share (0 to 1). */
export function nbaMvpValue(production: number, winShare: number, winWeight: number): number {
  return production + winWeight * winShare;
}

/** The defence score: steals plus blocks plus half his rebounds a game. */
export function nbaDefenseValue(spg: number, bpg: number, rpg: number): number {
  return spg + bpg + rpg / 2;
}

/** Games a man needs under the games rule in a season of `length` games: 0 before the rule's first season. */
export function nbaAwardGamesBar(year: number, length: number, rule: { gamesBarFrom: number; gamesBar: number; gamesBarOf: number }): number {
  return year >= rule.gamesBarFrom ? Math.ceil((rule.gamesBar / rule.gamesBarOf) * length) : 0;
}

/** May he lead the league in a stat: the share of the club's games from `statTitleShareFrom` on, and before it
 *  the old rule, the games or the season total (`total` is his, `totalNeeded` the stat's). A season shorter
 *  than a full one in the old era uses the share, the way the real short seasons scaled the minimum. */
export function nbaQualifiesForStatTitle(
  games: number, total: number, totalNeeded: number, year: number, length: number,
  rule: { statTitleShare: number; statTitleShareFrom: number; statTitleGamesBefore: number; gamesBarOf: number },
): boolean {
  if (year >= rule.statTitleShareFrom || length < rule.gamesBarOf) return games >= Math.ceil(rule.statTitleShare * length);
  return games >= rule.statTitleGamesBefore || total >= totalNeeded;
}
