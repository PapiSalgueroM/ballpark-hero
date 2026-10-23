/**
 * Round 1542: the NFL season's awards, named once when the season closes. The rules are the header of
 * src/lib/nflSeasonStats.ts and NFL_AWARD_RULE (src/lib/nflSeasonRules.ts); this file only applies them.
 *
 * WHY A FILE OF ITS OWN (the closing check of 2026-10-22, the weight of /front-office): the close runs in the press
 * that ends the season, and that press already waits for the career kit (the verdict is the kit's, closeWaits in
 * FrontOfficeBoard.tsx). So the kit re-exports nflCloseSeasonStats (src/components/front-office/nflCareerKit.ts) and
 * closeSeason takes it from there, and the page every visitor downloads carries neither this file nor the shared
 * ranking it calls (src/lib/foSeasonStats.ts). scripts/simFoLazyDesk.mjs section 1 holds both off the page.
 * Pure: no Math.random, no clock, no storage.
 */
import type { LeagueState } from './frontOffice';
import { foRankAward, foSeasonPlayers, type FoStatLine } from './foSeasonStats';
import { foCloseOnce } from './foSeasonClose';
import {
  NFL_AWARD_LABEL, nflAwardList, nflEveryMan, nflFoStats, nflLiveStats, nflMvpScore, nflTouchdowns,
  type NflAwardPick, type NflSeasonAwards,
} from './nflSeasonStats';

const pickOf = (p: FoStatLine): NflAwardPick => ({
  id: p.id, name: p.name, team: p.team, pos: p.pos, g: p.g,
  ptd: p.tot.ptd ?? 0, rtd: p.tot.rtd ?? 0, ctd: p.tot.ctd ?? 0, sk: p.tot.sk ?? 0,
});

/**
 * The season's awards from its lines, by the rules in the header, or null
 * when the league is not keeping lines for the season it is in. Pure.
 */
export function nflSeasonAwards(lg: Pick<LeagueState, 'stats' | 'season' | 'teams' | 'freeAgents'>): NflSeasonAwards | null {
  const live = nflLiveStats(lg);
  if (!live) return null;
  const stats = nflFoStats(live);
  const men = foSeasonPlayers(stats);
  const mvp = foRankAward(men, p => nflMvpScore(stats, p))[0] ?? null;
  const rookies = men.filter(p => p.rookie);
  const oroy = foRankAward(rookies.filter(p => nflTouchdowns(p) > 0), nflTouchdowns)[0] ?? null;
  const droy = foRankAward(rookies.filter(p => (p.tot.sk ?? 0) > 0), p => p.tot.sk ?? 0)[0] ?? null;
  return {
    season: stats.season,
    mvp: mvp ? pickOf(mvp) : null,
    oroy: oroy ? pickOf(oroy) : null,
    droy: droy ? pickOf(droy) : null,
    rookies: nflEveryMan(lg).some(list => list.some(p => p.rookieSeason === stats.season)),
  };
}

/**
 * Close the season's lines once (src/lib/foSeasonClose.ts): name the awards,
 * add them to the history and write each on the man's card wherever he is.
 * Null for a season the league was not keeping lines for.
 */
export function nflCloseSeasonStats(lg: LeagueState): NflSeasonAwards | null {
  return foCloseOnce(lg, () => nflSeasonAwards(lg), a => nflAwardList(a).map(([k, m]) => [NFL_AWARD_LABEL[k], m.id]), nflEveryMan(lg));
}
