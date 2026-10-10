/* ─── Round 470: the NHL bindings for the shared career loop pieces ─────────

   careerSocial.ts (the fans and the headlines) and careerBadges.ts (the peaks)
   know no engine. This file reads an NhlCareerState into the facts they take,
   the same way nhlCareerMoney.ts binds careerMoney.ts. It imports the engine
   for its types and its totals; the engine never imports it, so there is no
   cycle.

   Hockey's split is the crease: simNhlSeason deals a goalie 58 to 67 starts
   and a skater all but zero to three of his club's games, so a full season and a missed one are
   different numbers for the two of them. */

import type { NhlCareerState, NhlSeasonLine } from './nhlMyCareer';
import { nhlCareerTotals, nhlLegacyOf, nhlTeamLabelOf, nhlWorkSlate } from './nhlMyCareer';
import { NHL_BADGES, earnedBadges } from './careerBadges';
import type { BadgeDef, NhlBadgeFacts } from './careerBadges';
import { fanComments, followersFromFanbase, fmtFollowers, nhlSeasonHeadlines } from './careerSocial';
import { nhlMoneyWealth } from './nhlCareerMoney';
import { US_ENGINE_SEASON, slateOf, toSlate } from './usSeasonShape';

/** The schedule this job plays when nothing goes wrong. An injured season is
 *  dealt at 45 to 80 percent of it, so these numbers sit clear of both. */
export function nhlFullSlate(pos: string): number {
  return pos === 'G' ? 55 : US_ENGINE_SEASON.nhl - 4;
}

/** Round 1226: the same mark for one saved season, on the games that season
 *  held (48 in 2012-13, 84 from 2026-27). A line saved before the engine read
 *  the season ledger carries no `slate` and is judged on the engine's own
 *  season, as it was played. A goalie's starts only give way to a season too
 *  short to hold them, the engine's own rule (nhlWorkSlate in nhlMyCareer.ts). */
export function nhlFullSlateOf(pos: string, line: { slate?: number }): number {
  return toSlate('nhl', nhlFullSlate(pos), nhlWorkSlate(pos, slateOf('nhl', line)));
}

/** Everything the badge table reads, off the save and the legacy verdict. */
export function nhlBadgeFacts(c: NhlCareerState): NhlBadgeFacts {
  const t = nhlCareerTotals(c);
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
    fullSeasons: c.seasons.filter(s => s.games >= nhlFullSlateOf(c.pos, s)).length,
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
  /* Round 1226: missed games are counted from the season this line was played
     on (its own `slate`), so an 84 game season and a saved 82 game one each
     read true beside the same paper. */
  const held = nhlWorkSlate(c.pos, slateOf('nhl', line));
  const slate = c.pos === 'G' ? toSlate('nhl', 58, held) : held;
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
