/* ─── Round 470: the NBA bindings for the shared career loop pieces ─────────

   careerSocial.ts (the fans and the headlines) and careerBadges.ts (the peaks)
   know no engine. This file reads an NbaCareerState into the facts they take,
   the same way nbaCareerMoney.ts binds careerMoney.ts and nflCareerLoop.ts
   does the same job for football. It imports the engine for its types and its
   totals; the engine never imports it, so there is no cycle. */

import type { NbaCareerState, NbaSeasonLine } from './nbaMyCareer';
import { nbaCareerTotals, nbaLegacyOf, nbaTeamLabelOf } from './nbaMyCareer';
import { NBA_BADGES, earnedBadges } from './careerBadges';
import type { BadgeDef, NbaBadgeFacts } from './careerBadges';
import { fanComments, followersFromFanbase, fmtFollowers, nbaSeasonHeadlines } from './careerSocial';
import { nbaMoneyWealth } from './nbaCareerMoney';

/** A season nobody missed: the sim deals 78 to 82 games when the body holds
 *  and at most 74 when it does not, so 78 is the clean line between them. */
const FULL_GAMES = 78;

/** Everything the badge table reads, off the save and the legacy verdict. */
export function nbaBadgeFacts(c: NbaCareerState): NbaBadgeFacts {
  const t = nbaCareerTotals(c);
  return {
    pos: c.pos,
    seasons: c.seasons.map(s => ({
      games: s.games, awards: s.awards ?? [], teamResult: s.teamResult,
      ppg: s.ppg, rpg: s.rpg, apg: s.apg,
    })),
    rings: c.rings,
    finalsMvps: c.finalsMvps,
    allNbas: c.allNbas,
    totals: { pts: t.pts, reb: t.reb, ast: t.ast },
    fullSeasons: c.seasons.filter(s => s.games >= FULL_GAMES).length,
    wealth: Math.round(((c.netWorth ?? 0) + nbaMoneyWealth(c)) * 100) / 100,
    retired: c.retired,
    hof: c.retired && nbaLegacyOf(c).hof,
    rival: c.rival ? { retired: c.rival.retired, myYears: c.rival.myYears, hisYears: c.rival.hisYears } : null,
  };
}

export function nbaEarnedBadges(c: NbaCareerState): BadgeDef<NbaBadgeFacts>[] {
  return earnedBadges(NBA_BADGES, nbaBadgeFacts(c));
}

/** Followers, in millions, read off the fanbase meter and the career. */
export function nbaFollowers(c: NbaCareerState): number {
  return followersFromFanbase({
    fanbase: c.fanbase,
    seasons: c.seasons.length,
    rings: c.rings,
    awards: c.mvps + c.allNbas,
  });
}

/** The three comments under the latest post. Standing is the fanbase. */
export function nbaFanComments(c: NbaCareerState): string[] {
  return fanComments('nba', {
    pos: c.pos,
    standing: c.fanbase,
    followers: fmtFollowers(nbaFollowers(c)),
  });
}

/** The paper for the season just played. */
export function nbaHeadlinesFor(c: NbaCareerState, line: NbaSeasonLine): string[] {
  return nbaSeasonHeadlines({
    name: c.name,
    team: nbaTeamLabelOf(line.team, c.eraId),
    pos: c.pos,
    line,
    /* A rotation player's games are 78 to 82 when he is fit, so the gap is
       the injury. A second unit season is a role, not a knock (Round 182),
       so its gap says nothing about his health and is not reported as one. */
    missed: line.teamResult === 'SUSPENDED' || c.role === 'backup' ? 0 : Math.max(0, 82 - line.games),
    role: c.role,
  });
}
