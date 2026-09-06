/* ─── Round 473: the soccer binding for the shared badge case ───────────────

   careerBadges.ts holds the table and the evaluator and knows no engine, the
   same way careerSocial.ts holds the fans. This file reads a soccer
   CareerState into the facts that table takes, exactly as nflCareerLoop.ts
   does for the football one. It imports the engine; the engine never imports
   it, so there is no cycle, and nothing here runs at module scope.

   Why the sponsorship marks are read rather than typed: the two follower
   badges are the engine's own SPONSORSHIP_TIERS rows. If somebody moves the
   boot deal from five million followers to six, the badge moves with it and
   the blurb, which names no number, stays true.
*/
import type { CareerState } from "./soccerCareerEngine";
import { getCareerTotals, SPONSORSHIP_TIERS } from "./soccerCareerEngine";
import { moneyWealth } from "./soccerMoney";
import { SOCCER_BADGES, earnedBadges } from "./careerBadges";
import type { BadgeDef, SoccerBadgeFacts, SoccerSeasonFact } from "./careerBadges";

/** Followers, in millions, that a named sponsorship row asks for. */
function tierAt(tier: string, fallback: number): number {
  const row = SPONSORSHIP_TIERS.find(t => t.tier === tier);
  return row ? row.minFollowers / 1_000_000 : fallback;
}

/** Everything the badge table reads, off the save. */
export function soccerBadgeFacts(c: CareerState): SoccerBadgeFacts {
  const played = (c.seasons ?? []).filter(s => s.type === "playing");
  const totals = getCareerTotals(played);
  const seasons: SoccerSeasonFact[] = played.map(s => ({
    apps: s.apps ?? 0,
    goals: s.goals ?? 0,
    assists: s.assists ?? 0,
    cleanSheets: s.cleanSheets ?? 0,
    rating: s.rating ?? 0,
    club: s.club,
    intApps: s.intApps ?? 0,
    leagueTitle: !!s.leagueTitle,
    domesticCup: !!s.domesticCup,
    championsLeague: !!s.championsLeague,
    worldCup: !!s.worldCup,
    continentalCup: !!s.continentalCup,
    ballonDor: !!s.ballonDor,
  }));

  /* The comeback badge counts what he played AFTER the first serious one, so
     a long career that happened to end with an injury cannot claim it. */
  const serious = c.seriousInjuries ?? [];
  const firstYear = serious.length ? Math.min(...serious.map(i => i.year)) : null;
  const appsAfterFirstSerious = firstYear === null ? 0
    : played.filter(s => s.year > firstYear).reduce((a, s) => a + (s.apps ?? 0), 0);

  return {
    pos: c.position,
    seasons,
    totals: {
      apps: totals.apps,
      goals: totals.goals,
      assists: totals.assists,
      cleanSheets: totals.cleanSheets,
      leagueTitles: totals.leagueTitles,
      domesticCups: totals.domesticCups,
      championsLeagues: totals.championsLeagues,
      worldCups: totals.worldCups,
      continentalCups: totals.continentalCups,
      ballonDors: totals.ballonDors,
      intCaps: played.reduce((a, s) => a + (s.intApps ?? 0), 0),
    },
    wealth: Math.round(((c.netWorth ?? 0) + (c.totalAssetValue ?? 0) + moneyWealth(c)) * 100) / 100,
    followers: c.socialMediaFollowers ?? 0,
    bootDealAt: tierAt("nike_adidas", 5),
    merchLineAt: tierAt("merchandise_line", 30),
    seriousInjuries: serious.length,
    appsAfterFirstSerious,
  };
}

export function soccerEarnedBadges(c: CareerState): BadgeDef<SoccerBadgeFacts>[] {
  return earnedBadges(SOCCER_BADGES, soccerBadgeFacts(c));
}
