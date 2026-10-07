/* nbaCareerHall.ts, the NBA career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { nbaLegacyOf, NBA_LEGACY_WEIGHTS, nbaShouldRetire, nbaTeamLabelOf, type NbaCareerState } from "./nbaMyCareer";
import { HALL_CALIBRATION, hallVoterRulesFor, usCareerHall, type HallVoterWords } from "./careerHallOfFame";

/* Round 1051: what the voters weigh, in words. The card prints the sentence;
   the "?" builds its rule and its worked example from the rest. "The major
   awards" on purpose: the engine counts a different trophy by position under
   one name, and a sentence that names none cannot mislabel one. The example
   names a standout family of the calibration 2 table, and section 19 of
   scripts/simCareerHall.mjs holds it against the engine. */
export const NBA_HALL_WORDS: HallVoterWords = {
  weighs: "The voters weigh the hardware first: rings, the major awards, All-NBA years. Then the whole stat sheet, boards and assists as much as points.",
  hardware: "rings, the major awards, All-NBA years",
  families: "points, rebounds or assists",
  example: { positions: ["PG"], stat: "ast", one: "point guard", who: "point guards", family: "assists" },
};

/** The two lines the page's "?" adds, built from the words above and the table careers retire on today. */
export const nbaHallHelpRules = (): string[] => hallVoterRulesFor(NBA_HALL_WORDS, NBA_LEGACY_WEIGHTS[HALL_CALIBRATION]);

export const NBA_CAREER_HALL = usCareerHall<NbaCareerState>({
  rules: {
    sport: "nba",
    hallName: "Naismith Memorial Basketball Hall of Fame",
    ruleYear: "Class of 2025 onward",
    // The two season wait starts with the Class of 2025; the older wait is not two-sourced, so earlier classes print no year.
    verifiedFromClass: 2025,
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
  weighs: NBA_HALL_WORDS.weighs,
  shouldRetire: nbaShouldRetire,
  teamLabel: nbaTeamLabelOf,
  deckJerseyFlag: "nb_jersey",
});
