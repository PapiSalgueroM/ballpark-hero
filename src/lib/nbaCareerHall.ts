/* nbaCareerHall.ts, the NBA career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { nbaLegacyOf, nbaShouldRetire, nbaTeamLabelOf, type NbaCareerState } from "./nbaMyCareer";
import { usCareerHall } from "./careerHallOfFame";

export const NBA_CAREER_HALL = usCareerHall<NbaCareerState>({
  rules: {
    sport: "nba",
    hallName: "Naismith Memorial Basketball Hall of Fame",
    ruleYear: "Class of 2025 onward",
    // Two full seasons since the Class of 2025 (NBA.com and CBS, Dec 2024). A 2026 ESPN
    // piece still says three; the audit records the conflict.
    waitSeasons: 2,
    firstClassOffset: 4,
    // 18 of 24 Honors Committee votes.
    threshold: 75,
    ballotYears: null,
    stayFloor: null,
    publishesShares: false,
    provenance: { wait: "verified", firstClass: "verified", threshold: "verified", ballotYears: "believed", stayFloor: "believed", publishesShares: "believed" },
  },
  // nbaLegacyOf: hof at 500, and 650 reads "First-ballot Hall of Famer, jersey in the rafters".
  lines: { hofLine: 500, firstBallotScore: 650, jerseyScore: 650 },
  // Game tuning. The hard stop (nbaShouldRetire) is untouched.
  retirement: { minAge: 31, dropFromPeak: 8, floor: 72 },
  legacy: nbaLegacyOf,
  shouldRetire: nbaShouldRetire,
  teamLabel: nbaTeamLabelOf,
});
