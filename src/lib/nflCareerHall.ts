/* nflCareerHall.ts, the NFL career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { legacyOf, shouldRetire, teamLabelOf, type CareerState } from "./nflMyCareer";
import { usCareerHall } from "./careerHallOfFame";

export const NFL_CAREER_HALL = usCareerHall<CareerState>({
  rules: {
    sport: "nfl",
    hallName: "Pro Football Hall of Fame",
    ruleYear: "Class of 2027 onward",
    // The rules are the Class of 2027 ones; earlier classes ran under bylaws the audit has not two-sourced.
    verifiedFromClass: 2027,
    waitSeasons: 5,
    firstClassOffset: 6,
    threshold: 80,
    // ESPN alone says the pools merge and nobody ages off from 2027: one source, so no limit is claimed.
    ballotYears: null,
    stayFloor: null,
    publishesShares: false,
    provenance: { wait: "verified", firstClass: "verified", threshold: "verified", ballotYears: "believed", stayFloor: "believed", publishesShares: "believed" },
  },
  // legacyOf: hof at 520, and 900 reads "Inner-circle, first-ballot immortal".
  lines: { hofLine: 520, firstBallotScore: 900, jerseyScore: null },
  // Game tuning. The hard stop (shouldRetire) is untouched.
  retirement: { minAge: 30, dropFromPeak: 8, floor: 70 },
  legacy: legacyOf,
  shouldRetire,
  teamLabel: teamLabelOf,
});
