/* nhlCareerHall.ts, the NHL career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { nhlLegacyOf, nhlShouldRetire, nhlTeamLabelOf, type NhlCareerState } from "./nhlMyCareer";
import { usCareerHall } from "./careerHallOfFame";

export const NHL_CAREER_HALL = usCareerHall<NhlCareerState>({
  rules: {
    sport: "nhl",
    hallName: "Hockey Hall of Fame",
    ruleYear: "Current bylaws, Class of 2026",
    // The audit anchors the current bylaws on the Class of 2026; earlier classes print no year.
    verifiedFromClass: 2026,
    waitSeasons: 3,
    firstClassOffset: 4,
    // 75 percent of the Selection Committee members present.
    threshold: 75,
    ballotYears: null,
    stayFloor: null,
    publishesShares: false,
    provenance: { wait: "verified", firstClass: "verified", threshold: "verified", ballotYears: "believed", stayFloor: "believed", publishesShares: "believed" },
  },
  // nhlLegacyOf: hof at 500. No tier promises a first ballot; the game makes it certain
  // at 900, "Rushmore of the sport".
  lines: { hofLine: 500, firstBallotScore: 900, jerseyScore: null },
  // Game tuning. The hard stop (nhlShouldRetire) is untouched.
  retirement: { minAge: 31, dropFromPeak: 8, floor: 69 },
  legacy: nhlLegacyOf,
  shouldRetire: nhlShouldRetire,
  teamLabel: nhlTeamLabelOf,
});
