/* nflCareerHall.ts, the NFL career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { legacyOf, NFL_LEGACY_WEIGHTS, shouldRetire, teamLabelOf, type CareerState } from "./nflMyCareer";
import { HALL_CALIBRATION, hallVoterRulesFor, usCareerHall, type HallVoterWords } from "./careerHallOfFame";

/* Round 1051: what the voters weigh, in words. The card prints the hardware
   sentence and then names what the table reads for the position, from the
   table itself (reads is the noun for each stat a term can read). The kicker
   gets his own second sentence: the real anchors took his field goals out of
   the table (real kickers near the top of the real list were never called),
   so he is told "your seasons" and that his field goals do not move the
   voters, and the "?" says a kicker gets no push. The "?" builds its rule
   and its worked example from the rest. "The major awards" on purpose:
   the engine counts a different trophy by position under one name, and a
   sentence that names none cannot mislabel one. The example names a standout
   family of the calibration 2 table, and section 19 of
   scripts/simCareerHall.mjs holds it against the engine. */
export const NFL_HALL_WORDS: HallVoterWords = {
  weighs: "The voters weigh the hardware first: rings, the major awards, All-Pro years.",
  reads: {
    passYds: "passing yards", passTd: "touchdown passes", rushYds: "rushing yards", recYds: "receiving yards", rec: "catches",
    recTd: "touchdown catches", tackles: "tackles", sacks: "sacks", picks: "interceptions", forcedFum: "forced fumbles", passDef: "passes defended",
  },
  readsBy: { K: "Then your seasons. A kicker's field goals do not move them." },
  hardware: "rings, the major awards, All-Pro years",
  families: "passing yards for a quarterback, catches for a receiver, interceptions for a corner, sacks for an edge rusher, though a kicker gets none",
  example: { positions: ["CB"], stat: "picks", one: "corner", who: "corners", family: "interceptions" },
};

/** The two lines the page's "?" adds, built from the words above and the table careers retire on today. */
export const nflHallHelpRules = (): string[] => hallVoterRulesFor(NFL_HALL_WORDS, NFL_LEGACY_WEIGHTS[HALL_CALIBRATION]);

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
  words: NFL_HALL_WORDS,
  weights: NFL_LEGACY_WEIGHTS,
  shouldRetire,
  teamLabel: teamLabelOf,
  deckJerseyFlag: "b_jersey",
});
