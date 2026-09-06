/* ─── Round 470: the NHL bindings for the shared career loop pieces ─────────

   careerSocial.ts (the fans and the headlines) and careerBadges.ts (the peaks)
   know no engine. This file reads an NhlCareerState into the facts they take,
   the same way nhlCareerMoney.ts binds careerMoney.ts. It imports the engine
   for its types and its totals; the engine never imports it, so there is no
   cycle.

   Hockey's split is the crease: simNhlSeason deals a goalie 58 to 67 starts
   and a skater 79 to 82 games, so a full season and a missed one are
   different numbers for the two of them. */

import type { NhlCareerState, NhlSeasonLine } from './nhlMyCareer';
import { nhlCareerTotals, nhlLegacyOf, nhlTeamLabelOf } from './nhlMyCareer';
import { NHL_BADGES, earnedBadges } from './careerBadges';
import type { BadgeDef, NhlBadgeFacts } from './careerBadges';
import { fanComments, followersFromFanbase, fmtFollowers, nhlSeasonHeadlines } from './careerSocial';
import { nhlMoneyWealth } from './nhlCareerMoney';

/** The schedule this job plays when nothing goes wrong. An injured season is
 *  dealt at 45 to 80 percent of it, so these numbers sit clear of both. */
export function nhlFullSlate(pos: string): number {
  return pos === 'G' ? 55 : 78;
}

/** Everything the badge table reads, off the save and the legacy verdict. */
export function nhlBadgeFacts(c: NhlCareerState): NhlBadgeFacts {
  const t = nhlCareerTotals(c);
  const slate = nhlFullSlate(c.pos);
  return {
    pos: c.pos,
    seasons: c.seasons.map(s => ({
      games: s.games, awards: s.awards ?? [], teamResult: s.teamResult,
      goals: s.goals, points: s.points, wins: s.wins, svpct: s.svpct,
    })),
    cups: c.cups,
    harts: c.harts,
    connSmythes: c.connSmythes,
    allStars: c.allStars,
    totals: { goals: t.goals, assists: t.assists, points: t.points, wins: t.wins },
    fullSeasons: c.seasons.filter(s => s.games >= slate).length,
    wealth: Math.round(((c.netWorth ?? 0) + nhlMoneyWealth(c)) * 100) / 100,
    retired: c.retired,
    hof: c.retired && nhlLegacyOf(c).hof,
    rival: c.rival ? { retired: c.rival.retired, myYears: c.rival.myYears, hisYears: c.rival.hisYears } : null,
  };
}

export function nhlEarnedBadges(c: NhlCareerState): BadgeDef<NhlBadgeFacts>[] {
  return earnedBadges(NHL_BADGES, nhlBadgeFacts(c));
}

/** Followers, in millions, read off the fanbase meter and the career. */
export function nhlFollowers(c: NhlCareerState): number {
  return followersFromFanbase({
    fanbase: c.fanbase,
    seasons: c.seasons.length,
    rings: c.cups,
    awards: c.harts + c.allStars + c.connSmythes,
  });
}

/** The three comments under the latest post. Standing is the fanbase. */
export function nhlFanComments(c: NhlCareerState): string[] {
  return fanComments('nhl', {
    pos: c.pos,
    standing: c.fanbase,
    followers: fmtFollowers(nhlFollowers(c)),
  });
}

/** The paper for the season just played. */
export function nhlHeadlinesFor(c: NhlCareerState, line: NhlSeasonLine): string[] {
  const slate = c.pos === 'G' ? 58 : 82;
  return nhlSeasonHeadlines({
    name: c.name,
    team: nhlTeamLabelOf(line.team, c.eraId),
    pos: c.pos,
    line,
    /* A backup goalie's starts and a fourth liner's minutes are the role
       (Round 183), not a knock, so their gap is not reported as an injury. */
    missed: line.teamResult === 'SUSPENDED' || c.role === 'backup' ? 0 : Math.max(0, slate - line.games),
    role: c.role,
  });
}
