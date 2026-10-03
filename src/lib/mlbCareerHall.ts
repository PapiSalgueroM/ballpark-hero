/* mlbCareerHall.ts, the MLB career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { mlbLegacyOf, mlbShouldRetire, mlbTeamLabelOf, type MlbCareerState } from "./mlbMyCareer";
import { usCareerHall } from "./careerHallOfFame";

export const MLB_CAREER_HALL = usCareerHall<MlbCareerState>({
  rules: {
    sport: "mlb",
    hallName: "National Baseball Hall of Fame",
    ruleYear: "BBWAA ballot, 2014 onward",
    waitSeasons: 5,
    firstClassOffset: 6,
    threshold: 75,
    ballotYears: 10,
    stayFloor: 5,
    // The BBWAA prints every candidate's share (bbwaa.com and Baseball Reference, 2025 results).
    publishesShares: true,
    provenance: { wait: "verified", firstClass: "verified", threshold: "verified", ballotYears: "verified", stayFloor: "verified", publishesShares: "verified" },
  },
  // mlbLegacyOf: hof at 500, and 900 reads "Cooperstown first ballot, inner circle".
  lines: { hofLine: 500, firstBallotScore: 900, jerseyScore: null },
  // Game tuning. The hard stop (mlbShouldRetire) is untouched.
  retirement: { minAge: 32, dropFromPeak: 8, floor: 68 },
  legacy: mlbLegacyOf,
  shouldRetire: mlbShouldRetire,
  teamLabel: mlbTeamLabelOf,
});
