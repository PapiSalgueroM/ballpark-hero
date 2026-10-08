/* nhlCareerHall.ts, the NHL career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { nhlLegacyOf, NHL_LEGACY_WEIGHTS, nhlShouldRetire, nhlTeamLabelOf, type NhlCareerState } from "./nhlMyCareer";
import { HALL_CALIBRATION, hallVoterRulesFor, usCareerHall, type HallVoterWords } from "./careerHallOfFame";

/* Round 1051: what the voters weigh, in words. The card prints the sentence;
   the "?" builds its rule and its worked example from the rest. "The major
   awards" on purpose: the engine counts a different trophy by position under
   one name, and a sentence that names none cannot mislabel one. The example
   names a standout family of the calibration 2 table, and section 19 of
   scripts/simCareerHall.mjs holds it against the engine. */
export const NHL_HALL_WORDS: HallVoterWords = {
  weighs: "The voters weigh the hardware first: Cups, the major awards, All-Star years. Then the whole stat sheet, goals and assists each on their own.",
  hardware: "Cups, the major awards, All-Star years",
  families: "goals, assists, points or a goalie's wins",
  example: { positions: ["LW", "RW"], stat: "assists", one: "winger", who: "wingers", family: "assists" },
};

/** The two lines the page's "?" adds, built from the words above and the table careers retire on today. */
export const nhlHallHelpRules = (): string[] => hallVoterRulesFor(NHL_HALL_WORDS, NHL_LEGACY_WEIGHTS[HALL_CALIBRATION]);

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
  weighs: NHL_HALL_WORDS.weighs,
  shouldRetire: nhlShouldRetire,
  teamLabel: nhlTeamLabelOf,
});
