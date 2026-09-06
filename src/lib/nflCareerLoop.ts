/* ─── Round 469: the NFL bindings for the shared career loop pieces ─────────

   careerSocial.ts (the fans and the headlines) and careerBadges.ts (the
   peaks) know no engine. This file reads an NFL CareerState into the facts
   they take, the same way nflCareerMoney.ts binds careerMoney.ts. It imports
   the engine for its types and its totals; the engine never imports it, so
   there is no cycle. */

import type { CareerState, SeasonLine } from './nflMyCareer';
import { careerTotals, legacyOf, teamLabelOf } from './nflMyCareer';
import { NFL_BADGES, earnedBadges } from './careerBadges';
import type { BadgeDef, NflBadgeFacts } from './careerBadges';
import { fanComments, followersFromFanbase, fmtFollowers, nflSeasonHeadlines } from './careerSocial';
import { nflMoneyWealth } from './nflCareerMoney';

/** Everything the badge table reads, off the save and the legacy verdict. */
export function nflBadgeFacts(c: CareerState): NflBadgeFacts {
  const t = careerTotals(c);
  let sacks = 0, picks = 0, tackles = 0, fgMade = 0;
  for (const s of c.seasons) {
    sacks += s.sacks ?? 0; picks += s.picks ?? 0; tackles += s.tackles ?? 0; fgMade += s.fgMade ?? 0;
  }
  return {
    pos: c.pos,
    seasons: c.seasons.map(s => ({
      games: s.games, awards: s.awards ?? [], teamResult: s.teamResult,
      passYds: s.passYds, rushYds: s.rushYds, sacks: s.sacks,
    })),
    rings: c.rings,
    mvps: c.mvps,
    allPros: c.allPros,
    totals: {
      passYds: t.passYds, rushYds: t.rushYds, recYds: t.recYds, recTd: t.recTd,
      sacks: Math.round(sacks * 10) / 10, picks, tackles, fgMade,
    },
    /* Round 470: what a full season is, moved onto the facts so the iron man
       badge reads the same field in all four American careers. 17 is the
       whole schedule, so this is the Round 469 test unchanged. */
    fullSeasons: c.seasons.filter(s => s.games >= 17).length,
    wealth: Math.round(((c.netWorth ?? 0) + nflMoneyWealth(c)) * 100) / 100,
    retired: c.retired,
    hof: c.retired && legacyOf(c).hof,
    rival: c.rival ? { retired: c.rival.retired, myYears: c.rival.myYears, hisYears: c.rival.hisYears } : null,
  };
}

export function nflEarnedBadges(c: CareerState): BadgeDef<NflBadgeFacts>[] {
  return earnedBadges(NFL_BADGES, nflBadgeFacts(c));
}

/** Followers, in millions, read off the fanbase meter and the career. */
export function nflFollowers(c: CareerState): number {
  return followersFromFanbase({
    fanbase: c.fanbase,
    seasons: c.seasons.length,
    rings: c.rings,
    awards: c.mvps + c.allPros,
  });
}

/** The three comments under the latest post. Standing is the fanbase. */
export function nflFanComments(c: CareerState): string[] {
  return fanComments('nfl', {
    pos: c.pos,
    standing: c.fanbase,
    followers: fmtFollowers(nflFollowers(c)),
  });
}

/** The paper for the season just played. */
export function nflHeadlinesFor(c: CareerState, line: SeasonLine): string[] {
  return nflSeasonHeadlines({
    name: c.name,
    team: teamLabelOf(line.team, c.eraId),
    pos: c.pos,
    line,
    /* A starter's games are 17 less what injury took, so the gap is the
       injury. A backup's games are spot duty by design (Round 182), so the
       gap says nothing about his health and is not reported as one. */
    missed: line.teamResult === 'SUSPENDED' || c.role === 'backup' ? 0 : Math.max(0, 17 - line.games),
    role: c.role,
  });
}
