/* ─── Round 1525: Soccer Career's season awards, won against a field ───

   The eight season awards (Player of the Year, the Puskas Award, the Golden Boot, the Golden Glove, Young Player of
   the Year, UEFA Player of the Year, Comeback Player of the Year, the Fair Play Award) were a bar on his own numbers
   and a coin: 25 goals and a 30 percent coin for the Golden Boot, so a 40 goal season lost it seven times in ten
   and a 24 goal season could never win it. Round 123 ended that in the four US careers (careerAwards.ts): DRAW the
   best rival season in the league out of a measured distribution and win only by beating it. Soccer now asks the
   same question through the same draw, lifted out of careerAwards.ts into awardDraw.ts (beatsFieldOf) so this
   page never loads the US tables, with its own field table below.

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
     Every other award: his level, the rating the same season would carry at an elite club (seasonLevel in the
     engine: the rating is read against his club's average, so the same season rates higher at a small club), on
     one scale for every club, against his position's field.
     Puskas Award: every goal he scored is a chance at the best goal of the season, against the goals the jury
     chooses between (PUSKAS_FIELD_GOALS), so he wins with goals / (goals + that) a season.

   THE POOLS are the players genuinely in the conversation and are estimates, said so line by line. The grades are
   the game's own thumb on the scale: a vote leans to attacking players, and Young Player of the Year is judged on
   the whole field with a grade (the US careers' Rookie of the Year pattern) set so it is won about as often as a
   measured field of under 23 seasons gave (0.070 a career on the r1525-field rows, against 0.074). Every rate is
   measured in scripts/simSoccerSeasonAwards.mjs (rates per 100 seasons per position and tier band, against the
   designed one winner a league a season). Import free but for the two files it reads, so it can never close a
   cycle. One field per position keeps the page light: the young and rating fields it was first built with cost a
   third of the round's weight. */
import { beatsFieldOf, type FieldConfig } from './awardDraw';
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
const POSITIONS = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'];
/** [level mean, level sd] per position, in POSITIONS order. */
const LEVEL_ROWS = [[6.53, 0.95], [6.58, 0.93], [6.61, 0.94], [6.52, 0.84], [6.42, 0.74], [6.43, 0.74], [6.41, 0.75], [6.44, 0.75], [6.44, 0.75], [6.68, 0.77]];
/** A position's level field (exported for the harness). An unknown position reads the first row. */
export function soccerField(position: string): Field {
  const [mean, sd] = LEVEL_ROWS[Math.max(0, POSITIONS.indexOf(position))];
  return { mean, sd };
}
/** Strikers' goals at a top two tier club, and keepers' clean sheets, every season of 20 or more games. */
export const SOCCER_GOALS_FIELD: Field = { mean: 14.55, sd: 8.08 };
export const SOCCER_SHEETS_FIELD: Field = { mean: 10.01, sd: 3.26 };
/** The goals a season's Puskas jury chooses between. A design number: the game's own estimate. */
export const PUSKAS_FIELD_GOALS = 2000;

type Ranked = Exclude<SoccerSeasonAward, 'Puskás Award'>;
/* Each award: its pool (the players genuinely in the conversation; one winner, so slots is 1), what it is judged on
   (goals, clean sheets, or level, a vote adding the position grade below), who may be named at all before the field
   (who it is given to and the seasons it was given for), and a grade of its own. Twenty is a twenty club league. */
const RULES: Record<Ranked, [number, 'goals' | 'sheets' | 'vote' | 'level', (s: SoccerAwardSeason) => boolean, number?]> = {
  'Golden Boot': [20, 'goals', s => s.clubTier <= 2 && s.goals > 0], // each club's leading scorer
  'Golden Glove': [20, 'sheets', s => s.position === 'GK' && s.apps >= 20 && goldenGloveAwardExists(s.year)], // each club's number one
  'Player of the Year': [40, 'vote', s => s.apps >= 20], // about two a club (estimate)
  'Young Player of the Year': [40, 'vote', s => s.age < 23 && s.apps >= 20, -1.1], // the same, under 23 (estimate)
  'UEFA Player of the Year': [10, 'vote', s => s.championsLeague && s.apps >= 20 && uefaPlayerAwardExists(s.year)], // the winners' key men and a few more (estimate)
  'Fair Play Award': [20, 'level', s => s.yellowCards <= 1 && s.redCards === 0 && s.apps >= 25], // the game's own: one clean regular a club
  'Comeback Player of the Year': [10, 'level', s => s.prevRating !== null && s.prevRating <= 6.5 && s.apps >= 20], // the game's own (estimate)
};
const puskasEligible = (s: SoccerAwardSeason) => s.goals > 0 && puskasAwardExists(s.year);
/** Added to the bar for a vote, by position: a design number, the vote leans to attacking players. */
const VOTE_GRADE: Record<string, number> = { GK: 0.2, CB: 0.2, LB: 0.2, RB: 0.2, CM: 0.1, CDM: 0.1 };

/** Who may be named at all, before the field. */
export function soccerAwardEligible(award: SoccerSeasonAward, s: SoccerAwardSeason): boolean {
  return award === 'Puskás Award' ? puskasEligible(s) : RULES[award][2](s);
}

/** The number his season is judged on, and the field it is judged against (exported for the harness). */
export function soccerAwardScore(award: Ranked, s: SoccerAwardSeason): { score: number; field: Field } {
  const kind = RULES[award][1];
  return kind === 'goals' ? { score: s.goals, field: SOCCER_GOALS_FIELD }
    : kind === 'sheets' ? { score: s.cleanSheets, field: SOCCER_SHEETS_FIELD }
      : { score: s.level, field: soccerField(s.position) };
}

/** The config the field is drawn with, every grade included (exported for the harness). */
export function soccerAwardConfig(award: Ranked, position: string): FieldConfig {
  const [pool, kind, , grade = 0] = RULES[award];
  return { pool, slots: 1, grade: grade + (kind === 'vote' ? VOTE_GRADE[position] ?? 0 : 0) };
}

/** Did this season win the award? Pure: the same season and the same stream always give the same answer. */
export function soccerAwardWon(award: SoccerSeasonAward, s: SoccerAwardSeason, rng: () => number): boolean {
  if (!soccerAwardEligible(award, s)) return false;
  /* The best goal of the season is one of his with the chance goals / (goals + the field's), exactly, for goals of
     one quality distribution. The extreme value bar is a large n shortcut and overstates a handful of goals against
     thousands (measured: three times this chance), so the one award about a single moment uses this. */
  if (award === 'Puskás Award') return rng() < s.goals / (s.goals + PUSKAS_FIELD_GOALS);
  const { score, field } = soccerAwardScore(award, s);
  return beatsFieldOf(rng, field, score, soccerAwardConfig(award, s.position));
}
