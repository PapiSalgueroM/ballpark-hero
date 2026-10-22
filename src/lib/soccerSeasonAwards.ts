/* ─── Round 1525: Soccer Career's season awards, won against a field ───

   The eight season awards (Player of the Year, the Puskas Award, the Golden Boot, the Golden Glove, Young Player of
   the Year, UEFA Player of the Year, Comeback Player of the Year, the Fair Play Award) were a bar on his own numbers
   and a coin: 25 goals and a 30 percent coin for the Golden Boot, so a 40 goal season lost it seven times in ten
   and a 24 goal season could never win it. Round 123 ended that in the four US careers (careerAwards.ts): DRAW the
   best rival season in the league out of a measured distribution and win only by beating it. Soccer now asks the
   same question through the same draw (beatsFieldOf and bestOfNAt), with its own field table below.

   One stream per award, keyed to the career and the season (keyedRng), so the main stream never moves: the engine
   still makes the old coin draws in the old order and throws them away (the Round 1329 rule).

   THE FIELD. Measured, never typed: 2,200 house careers a position (scripts/lib/careerStep.mjs, every era from
   1990 to 2020, start overall 56 to 68) read at the awards block on 2026-10-22, every season of 20 or more games,
   about 41,000 a position. scripts/simSoccerSeasonAwards.mjs section 1 measures it again on other seeds and fails
   when a row goes stale. Like the US table, it is the engine's own players, who are all good enough to hold a
   job, so every bar sits a little high: the safe direction.

   THE SCORE, from numbers the season row holds.
     Golden Boot: his goals against the field of strikers' goals at clubs of the top two tiers (the award is
     only given there, as before), whatever his position.
     Golden Glove: his clean sheets against the keepers' field.
     Player of the Year, Young Player, UEFA Player: his level, the rating the same season would carry at an
     elite club (seasonLevel in the engine: the rating is read against his club's average, so the same season
     rates higher at a small club). A national award is one scale for every club.
     Fair Play and Comeback: his rating as it stands, read in his own league's terms.
     Puskas Award: every goal he scored is a chance at the best goal of the season, against the goals the jury
     chooses between (PUSKAS_FIELD_GOALS), so he wins with about goals / (goals + that) a season.

   THE POOLS are the players genuinely in the conversation and are estimates, said so line by line. The grades are
   the game's own thumb on the scale for a vote that leans to attacking players. Every rate they give is measured
   in scripts/simSoccerSeasonAwards.mjs (rates per 100 seasons per position and tier band, against the designed
   one winner a league a season). Import free but for the two files it reads, so it can never close a cycle. */
import { beatsFieldOf, bestOfNAt, gumbel, type FieldConfig } from './careerAwards';
import { goldenGloveAwardExists, puskasAwardExists, uefaPlayerAwardExists } from './soccerWorldTruth';

export type SoccerSeasonAward =
  | 'Player of the Year' | 'Puskás Award' | 'Golden Boot' | 'Golden Glove'
  | 'Young Player of the Year' | 'UEFA Player of the Year' | 'Comeback Player of the Year' | 'Fair Play Award';

/** What one season gives the awards: the row's own numbers plus three things about him that season. */
export interface SoccerAwardSeason {
  year: number; apps: number; goals: number; cleanSheets: number; rating: number;
  yellowCards: number; redCards: number; championsLeague: boolean; clubTier: number;
  position: string; age: number;
  /** seasonLevel(rating, clubTier) from the engine. */
  level: number;
  /** The rating of his last playing season when he has two or more behind him, else null. */
  prevRating: number | null;
}

type Field = { mean: number; sd: number };
const POSITIONS = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'] as const;
/** [level mean, level sd, young level mean, young level sd, rating mean, rating sd] per position, in POSITIONS order. */
const FIELD_ROWS: number[][] = [
  [6.53, 0.95, 6.05, 0.60, 7.00, 0.85], [6.58, 0.93, 6.13, 0.59, 7.06, 0.84], [6.61, 0.94, 6.12, 0.59, 7.08, 0.85],
  [6.52, 0.84, 6.12, 0.56, 7.00, 0.77], [6.42, 0.74, 6.09, 0.51, 6.90, 0.70], [6.43, 0.74, 6.09, 0.51, 6.91, 0.70],
  [6.41, 0.75, 6.02, 0.51, 6.90, 0.71], [6.44, 0.75, 6.09, 0.52, 6.92, 0.71], [6.44, 0.75, 6.08, 0.52, 6.91, 0.71],
  [6.68, 0.77, 6.41, 0.55, 7.12, 0.70],
];
export type SoccerFieldKind = 'level' | 'young' | 'rating';
/** One row of the field table (exported for the harness). An unknown position reads the first row. */
export function soccerField(kind: SoccerFieldKind, position: string): Field {
  const row = FIELD_ROWS[Math.max(0, (POSITIONS as readonly string[]).indexOf(position))];
  const at = kind === 'level' ? 0 : kind === 'young' ? 2 : 4;
  return { mean: row[at], sd: row[at + 1] };
}
/** Strikers' goals at a top two tier club, and keepers' clean sheets, every season of 20 or more games. */
export const SOCCER_GOALS_FIELD: Field = { mean: 14.55, sd: 8.08 };
export const SOCCER_SHEETS_FIELD: Field = { mean: 10.01, sd: 3.26 };
/** The goals a season's Puskas jury chooses between. A design number: the game's own estimate. */
export const PUSKAS_FIELD_GOALS = 2000;

/* Pools, slots and grades. Twenty is a twenty club league. */
const CONFIG: Record<Exclude<SoccerSeasonAward, 'Puskás Award'>, FieldConfig> = {
  'Golden Boot': { pool: 20, slots: 1 },              // each club's leading scorer
  'Golden Glove': { pool: 20, slots: 1 },             // each club's number one
  'Player of the Year': { pool: 40, slots: 1 },       // about two a club are in the conversation (estimate)
  'Young Player of the Year': { pool: 40, slots: 1 }, // the same, among players under 23 (estimate)
  'UEFA Player of the Year': { pool: 10, slots: 1 },  // the winners' key men and a few from elsewhere (estimate)
  'Fair Play Award': { pool: 20, slots: 1 },          // the game's own award: one clean regular a club
  'Comeback Player of the Year': { pool: 10, slots: 1 }, // the game's own award (estimate)
};
/** Added to the bar for a vote, by position group: a design number, the vote leans to attacking players. */
const VOTE_GRADE: Record<string, number> = { GK: 0.2, CB: 0.2, LB: 0.2, RB: 0.2, CM: 0.1, CDM: 0.1 };
const VOTES = new Set<SoccerSeasonAward>(['Player of the Year', 'Young Player of the Year', 'UEFA Player of the Year']);

/** Who may be named at all, before the field: who it is given to, and the seasons it was given for. */
export function soccerAwardEligible(award: SoccerSeasonAward, s: SoccerAwardSeason): boolean {
  switch (award) {
    case 'Golden Boot': return s.clubTier <= 2 && s.goals > 0;
    case 'Golden Glove': return s.position === 'GK' && s.apps >= 20 && goldenGloveAwardExists(s.year);
    case 'Player of the Year': return s.apps >= 20;
    case 'Young Player of the Year': return s.age < 23 && s.apps >= 20;
    case 'UEFA Player of the Year': return s.championsLeague && s.apps >= 20 && uefaPlayerAwardExists(s.year);
    case 'Puskás Award': return s.goals > 0 && puskasAwardExists(s.year);
    case 'Fair Play Award': return s.yellowCards <= 1 && s.redCards === 0 && s.apps >= 25;
    case 'Comeback Player of the Year': return s.prevRating !== null && s.prevRating <= 6.5 && s.apps >= 20;
  }
}

/** The number his season is judged on, and the field it is judged against (exported for the harness). */
export function soccerAwardScore(award: Exclude<SoccerSeasonAward, 'Puskás Award'>, s: SoccerAwardSeason): { score: number; field: Field } {
  switch (award) {
    case 'Golden Boot': return { score: s.goals, field: SOCCER_GOALS_FIELD };
    case 'Golden Glove': return { score: s.cleanSheets, field: SOCCER_SHEETS_FIELD };
    case 'Player of the Year': case 'UEFA Player of the Year': return { score: s.level, field: soccerField('level', s.position) };
    case 'Young Player of the Year': return { score: s.level, field: soccerField('young', s.position) };
    case 'Fair Play Award': case 'Comeback Player of the Year': return { score: s.rating, field: soccerField('rating', s.position) };
  }
}

/** The config the field is drawn with, the vote grade included (exported for the harness). */
export function soccerAwardConfig(award: Exclude<SoccerSeasonAward, 'Puskás Award'>, position: string): FieldConfig {
  const cfg = CONFIG[award];
  return VOTES.has(award) ? { ...cfg, grade: VOTE_GRADE[position] ?? 0 } : cfg;
}

/** Did this season win the award? Pure: the same season and the same stream always give the same answer. */
export function soccerAwardWon(award: SoccerSeasonAward, s: SoccerAwardSeason, rng: () => number): boolean {
  if (!soccerAwardEligible(award, s)) return false;
  if (award === 'Puskás Award') return bestOfNAt(s.goals, gumbel(rng)) > bestOfNAt(PUSKAS_FIELD_GOALS, gumbel(rng));
  const { score, field } = soccerAwardScore(award, s);
  return beatsFieldOf(rng, field, score, soccerAwardConfig(award, s.position));
}
