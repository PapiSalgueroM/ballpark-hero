/* nbaCareerHall.ts, the NBA career's Hall of Fame and retirement talk (Round 915).
   Data only: the engine is careerHallOfFame.ts and careerRetirement.ts. Every
   real rule below is sourced in docs/audits/US-HALL-RULES-2026-10.md and
   scripts/simCareerHall.mjs holds these numbers to that file's table. */

import { nbaLegacyOf, NBA_LEGACY_WEIGHTS, nbaShouldRetire, nbaTeamLabelOf, type NbaCareerState } from "./nbaMyCareer";
import { HALL_CALIBRATION, hallVoterRulesFor, usCareerHall, type HallVoterWords } from "./careerHallOfFame";

/* Round 1051: what the voters weigh, in words. The card prints the hardware
   sentence and then names what the table reads for the position, from the
   table itself (points for everyone here; rebounds and assists only count
   as a standout, and the card says so only when one did). The "?" builds its
   rule and its worked example from the rest. The hardware is named trophy by
   trophy in this sport because the counts are exactly these four: mvps moves
   on the MVP alone (nbaMyCareer.ts, where the award is drawn), and a
   Defensive Player of the Year goes on the season line and into no count
   the legacy reads, so the card does not promise it. The other three sports
   say "the major awards" because there one count holds a different trophy by
   position. The example names a standout family of the calibration 2 table,
   and section 19 of scripts/simCareerHall.mjs holds it against the engine. */
export const NBA_HALL_WORDS: HallVoterWords = {
  weighs: "The voters weigh the hardware first: rings, MVPs, Finals MVPs, All-NBA years.",
  // Round 1103: the table's second term (newLinePts, the points of seasons on the newer stat line, see
  // NBA_LEGACY_NEW_LINE_SCALE in nbaMyCareer.ts) is points too, so it carries the same noun and the card says
  // it once. Without a noun here the card printed the table's own key.
  reads: { pts: "points", newLinePts: "points" },
  hardware: "rings, MVPs, Finals MVPs, All-NBA years",
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
  words: NBA_HALL_WORDS,
  weights: NBA_LEGACY_WEIGHTS,
  shouldRetire: nbaShouldRetire,
  teamLabel: nbaTeamLabelOf,
  deckJerseyFlag: "nb_jersey",
});
