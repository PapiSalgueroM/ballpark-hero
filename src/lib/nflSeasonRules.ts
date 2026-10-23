/**
 * Round 1542: the words of the NFL season numbers' rules, the award rules the season card prints and the page's "?"
 * lines with their worked example, computed from the rules in src/lib/nflSeasonStats.ts.
 *
 * WHY A FILE OF ITS OWN (the closing check of 2026-10-22, the weight of /front-office): nothing a press or a load
 * runs reads these words. The page fetches this file beside the guide its "?" panel already waits for
 * (src/pages/FrontOffice.tsx) and the season card's chunk carries it, so the page every visitor downloads does not.
 * scripts/simFoLazyDesk.mjs section 1 holds it off the page.
 */
import {
  NFL_AWARD_LABEL, NFL_MVP_WIN_WEIGHT, NFL_USAGE_PIVOT, nflPassChance, nflUsage, type NflAwardKey,
} from './nflSeasonStats';

/** The stated rule, as the card and the page's "?" say it. */
export const NFL_AWARD_RULE: Record<NflAwardKey, string> = {
  mvp: `touchdowns he threw, ran in or caught, plus half his sacks, plus ${NFL_MVP_WIN_WEIGHT} times his club's winning share`,
  oroy: 'touchdowns he threw, ran in or caught, among first year men drafted in this save',
  droy: 'sacks, among first year men drafted in this save',
};

/** The rules of the season numbers for the page's "?", the worked example computed from the rules themselves. Build it inside a component, never at module scope. */
export function nflStatsHelp(): string[] {
  const share = (ovr: number) => Math.round(nflPassChance(ovr) * 100);
  const odds = Number((nflUsage(85) / nflUsage(NFL_USAGE_PIVOT)).toFixed(2));
  return [
    "Who scored: every touchdown of a game goes to one of the club's starters that week. It is a pass from the quarterback or a run, and the better the quarterback the more of them he throws. A pass is caught by one of the five skill starters, receivers most often, then tight ends, then backs, the better rated more often. A run is a back's, now and then the quarterback's, and once in a long while a receiver's. Injured men, the line and the bench never score.",
    "Sacks come from the pass rush against the other side's line: the better the rushers are rated against the blockers, the more of them land. A sack goes to one of the defensive starters, linemen most often, then linebackers, then defensive backs, the better rated more often. Field goals and safeties count for the club, because kickers and punters are not on these rosters.",
    `The season's leaders (touchdown passes, rushing touchdowns, sacks) are in Standings. When the season closes this save names, from the regular season's lines, an ${NFL_AWARD_LABEL.mvp} (${NFL_AWARD_RULE.mvp}), an ${NFL_AWARD_LABEL.oroy} (${NFL_AWARD_RULE.oroy}) and a ${NFL_AWARD_LABEL.droy} (${NFL_AWARD_RULE.droy}). A rookie award needs at least one, and ties go to more games played. Playoff games are not in the lines or the awards.`,
    "Every line and award is this save's sim season, not real NFL stats. A save from before season lines starts keeping them at its next Week 1.",
    `For example: a quarterback rated 85 throws ${share(85)} of every 100 of his club's touchdowns and one rated 70 throws ${share(70)}, and a receiver rated 85 is ${odds} times as likely to catch one as a receiver rated ${NFL_USAGE_PIVOT} in the same slot.`,
  ];
}
