/* ─── Round 470: the MLB bindings for the shared career loop pieces ─────────

   careerSocial.ts (the fans and the headlines) and careerBadges.ts (the peaks)
   know no engine. This file reads an MlbCareerState into the facts they take,
   the same way mlbCareerMoney.ts binds careerMoney.ts. It imports the engine
   for its types and its totals; the engine never imports it, so there is no
   cycle.

   The one thing baseball needs that the other three do not: a full season is
   three different numbers depending on the job. simMlbSeason deals a starter
   about 32 starts, a reliever about 62 to 71 appearances and everybody else
   155 to 162 games, so the iron man badge and the injury headline both read
   the position first. */

import type { MlbCareerState, MlbSeasonLine } from './mlbMyCareer';
import { mlbCareerTotals, mlbLegacyOf, mlbTeamLabelOf } from './mlbMyCareer';
import { MLB_BADGES, earnedBadges } from './careerBadges';
import type { BadgeDef, MlbBadgeFacts } from './careerBadges';
import { fanComments, followersFromFanbase, fmtFollowers, mlbSeasonHeadlines } from './careerSocial';
import { mlbMoneyWealth } from './mlbCareerMoney';

/** The schedule this job works when nothing goes wrong. An injured season is
 *  dealt at 35 to 75 percent of it, so these numbers sit clear of both. */
export function mlbFullSlate(pos: string): number {
  if (pos === 'SP') return 30;
  if (pos === 'RP') return 60;
  return 150;
}

/** Everything the badge table reads, off the save and the legacy verdict. */
export function mlbBadgeFacts(c: MlbCareerState): MlbBadgeFacts {
  const t = mlbCareerTotals(c);
  let saves = 0;
  for (const s of c.seasons) saves += s.saves ?? 0;
  const slate = mlbFullSlate(c.pos);
  return {
    pos: c.pos,
    seasons: c.seasons.map(s => ({
      games: s.games, awards: s.awards ?? [], teamResult: s.teamResult,
      avg: s.avg, hr: s.hr, sb: s.sb, era: s.era,
    })),
    rings: c.rings,
    mvpCys: c.mvpCys,
    allStars: c.allStars,
    totals: { hr: t.hr, rbi: t.rbi, sb: t.sb, wins: t.wins, so: t.so, saves },
    fullSeasons: c.seasons.filter(s => s.games >= slate).length,
    wealth: Math.round(((c.netWorth ?? 0) + mlbMoneyWealth(c)) * 100) / 100,
    retired: c.retired,
    hof: c.retired && mlbLegacyOf(c).hof,
    rival: c.rival ? { retired: c.rival.retired, myYears: c.rival.myYears, hisYears: c.rival.hisYears } : null,
  };
}

export function mlbEarnedBadges(c: MlbCareerState): BadgeDef<MlbBadgeFacts>[] {
  return earnedBadges(MLB_BADGES, mlbBadgeFacts(c));
}

/** Followers, in millions, read off the fanbase meter and the career. */
export function mlbFollowers(c: MlbCareerState): number {
  return followersFromFanbase({
    fanbase: c.fanbase,
    seasons: c.seasons.length,
    rings: c.rings,
    awards: c.mvpCys + c.allStars,
  });
}

/** The three comments under the latest post. Standing is the fanbase. */
export function mlbFanComments(c: MlbCareerState): string[] {
  return fanComments('mlb', {
    pos: c.pos,
    standing: c.fanbase,
    followers: fmtFollowers(mlbFollowers(c)),
  });
}

/** The paper for the season just played. */
export function mlbHeadlinesFor(c: MlbCareerState, line: MlbSeasonLine): string[] {
  const slate = c.pos === 'SP' ? 32 : c.pos === 'RP' ? 62 : 155;
  return mlbSeasonHeadlines({
    name: c.name,
    team: mlbTeamLabelOf(line.team, c.eraId),
    pos: c.pos,
    line,
    /* A bench bat and a long relief arm are given fewer games on purpose
       (Round 183), so their gap says nothing about health and is not
       reported as an injury. */
    missed: line.teamResult === 'SUSPENDED' || (c.role === 'backup' && c.pos !== 'RP') ? 0 : Math.max(0, slate - line.games),
    role: c.role,
  });
}
