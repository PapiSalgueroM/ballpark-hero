import { HALL_CALIBRATION, hallVoterRulesFor, type HallCalibration, type HallVoterWords, type LegacyWeights } from './careerHallOfFame';

/** Round 1103: what the POINTS of a season on the new line are worth to the legacy score against a season on
 *  the old one. 1 is no adjustment. The new line scores about a fifth lower than the old on purpose, and the
 *  Hall of Fame is held, not recalibrated, in this round: this is the one lever, set from the measured Hall
 *  rate (scripts/simNbaAwardsSense.mjs section H, the table in docs/audits/NBA-LINE-NORMS-2026-10.md). It
 *  weighs the points TERM only: it enters the calibration 2 table as a term of its own on the new line's
 *  points (NBA_NEW_LINE_TERM), so every total the scorer, the standout and the ballot card read is the
 *  career's real one. The legacy recalibration round replaces it. */
export const NBA_LEGACY_NEW_LINE_SCALE: number = 1.4;
/** The constant as the table carries it: the new line's points at the points term's own rate (430 a point)
 *  times the constant less one, a whole number (1,075 at 1.4). The marks ledger records the same number as a
 *  fixed added term (scripts/genCareerHallMarks.mjs, FIXED_BASE), and section 19 of scripts/simCareerHall.mjs
 *  fails when the two differ, so the constant cannot move without the ledger. */
const NBA_NEW_LINE_TERM = { stat: 'newLinePts', per: Math.round(430 / (NBA_LEGACY_NEW_LINE_SCALE - 1)) };

/* Round 1051: the legacy score reads a table per calibration through the one
   scorer (legacyRead, careerHallOfFame.ts). Calibration 1 is the Round 123
   formula below to the last bit; a career is read on the calibration it
   retired on (hallCalibrationOf). */
const NBA_LEGACY_V1: LegacyWeights = {
  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },
  season: 8,
  positions: { '*': { terms: [{ stat: 'pts', per: 430 }] } },
};
/* Calibration 2 (Round 1051). It contains calibration 1 unchanged (the same
   awards, the same season weight, each position's old terms first and in
   order) and only adds, so no career scores lower on it. What it adds:
   a base where calibration 1 read nothing, and the standout: a career total
   near the top of this game's books for the position, in any family on the
   list, earns credit of its own (legacyRead; only the best family counts).
   Every from and to mark, the list itself (the half rule) and the measured
   base terms come from scripts/data/careerHallMarks.json, which
   scripts/genCareerHallMarks.mjs derives from measured careers; section 17 of
   scripts/simCareerHall.mjs fails if this table and that ledger disagree.
   Round 1103 (the fix pass of 2026-10-08): the marks were measured again on the
   new stat line, where a centre no longer passes like a guard (so the big
   men's assists left the list by the half rule), and every position gained
   one fixed term, the points of seasons on the new line (NBA_NEW_LINE_TERM). */
export const NBA_LEGACY_V2: LegacyWeights = {
  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },
  season: 8,
  positions: {
    PG: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 31000, to: 38700, label: 'points' },
        { stat: 'ast', from: 10700, to: 13700, label: 'assists' },
      ],
    },
    SG: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 32500, to: 39900, label: 'points' },
        { stat: 'reb', from: 7850, to: 9610, label: 'rebounds' },
        { stat: 'ast', from: 5420, to: 6470, label: 'assists' },
      ],
    },
    SF: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 31800, to: 39900, label: 'points' },
        { stat: 'reb', from: 10400, to: 11800, label: 'rebounds' },
        { stat: 'ast', from: 8270, to: 10300, label: 'assists' },
      ],
    },
    PF: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 28700, to: 34100, label: 'points' },
        { stat: 'reb', from: 11000, to: 13400, label: 'rebounds' },
      ],
    },
    C: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 26700, to: 32200, label: 'points' },
        { stat: 'reb', from: 15600, to: 18400, label: 'rebounds' },
      ],
    },
    '*': { terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM] },
  },
};
/* Round 1301: calibration 3 moved the NHL marks only. Here 3 is the calibration 2 table itself, the same object. */
export const NBA_LEGACY_WEIGHTS: Record<HallCalibration, LegacyWeights> = { 1: NBA_LEGACY_V1, 2: NBA_LEGACY_V2, 3: NBA_LEGACY_V2 };

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
