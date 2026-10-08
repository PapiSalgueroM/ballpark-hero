/* mlbCareerHall.ts, the MLB career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { mlbLegacyOf, MLB_LEGACY_WEIGHTS, mlbShouldRetire, mlbTeamLabelOf, type MlbCareerState } from "./mlbMyCareer";
import { HALL_CALIBRATION, hallVoterRulesFor, usCareerHall, type HallVoterWords } from "./careerHallOfFame";

/* Round 1051: what the voters weigh, in words. The card prints the sentence;
   the "?" builds its rule and its worked example from the rest. "The major
   awards" on purpose: the engine counts a different trophy by position under
   one name, and a sentence that names none cannot mislabel one. The example
   names a standout family of the calibration 2 table, and section 19 of
   scripts/simCareerHall.mjs holds it against the engine. */
export const MLB_HALL_WORDS: HallVoterWords = {
  weighs: "The voters weigh the hardware first: rings, the major awards, All-Star years. Then the whole stat sheet, steals as much as homers.",
  hardware: "rings, the major awards, All-Star years",
  families: "home runs, RBI, steals, wins or strikeouts",
  example: { positions: ["CF"], stat: "sb", one: "center fielder", who: "center fielders", family: "steals" },
};

/** The two lines the page's "?" adds, built from the words above and the table careers retire on today. */
export const mlbHallHelpRules = (): string[] => hallVoterRulesFor(MLB_HALL_WORDS, MLB_LEGACY_WEIGHTS[HALL_CALIBRATION]);

export const MLB_CAREER_HALL = usCareerHall<MlbCareerState>({
  rules: {
    sport: "mlb",
    hallName: "National Baseball Hall of Fame",
    ruleYear: "BBWAA ballot, 2014 onward",
    // The ten ballot rule is dated 2014 onward in the audit; earlier classes print no year.
    verifiedFromClass: 2014,
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
  weighs: MLB_HALL_WORDS.weighs,
  shouldRetire: mlbShouldRetire,
  teamLabel: mlbTeamLabelOf,
  deckJerseyFlag: "b_number",
});
