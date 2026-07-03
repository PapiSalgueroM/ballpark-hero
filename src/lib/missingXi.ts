import { supabase } from '@/integrations/supabase/client';
import { normalizeName, displayName, SOCCER_MARKET_VALUE_SOURCE } from '@/lib/playerSearch';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Missing XI: a famous real starting lineup is shown with ONE player
 * blanked out. The player identifies the missing man via PlayerAutocomplete.
 * See docs/research/R6_build_plan.md Part 1 item 2 for the original spec and
 * MASTER_PLAN [#57].
 *
 * CONTENT VERIFICATION METHOD (read this before touching LINEUPS below)
 * Every lineup in this file was researched via live web search against
 * reliable sources (Wikipedia match-report infoboxes, official UEFA/club
 * tactical PDFs, Sky Sports, ESPN, BBC Sport lineup graphics) on 2026-07-03,
 * cross-checked across 2+ independent sources per match. Each entry's
 * `source` field records what was checked. Several matches researched had
 * genuine, well-documented traps (a famous super-sub wrongly remembered as a
 * starter, a suspension-forced reshuffle, a position that is disputed between
 * outlets) - those are called out inline in comments so a future editor does
 * not "fix" a deliberately-verified surprising fact back to the wrong,
 * more-obvious one.
 *
 * Every `blankCandidates` name below was individually verified with a
 * read-only SQL query against player_market_values on flawuiqbvjobmkfkauhw
 * (2026-07-03) to confirm the exact row exists, so PlayerAutocomplete's
 * validateOnly guessing (scoped to SOCCER_MARKET_VALUE_SOURCE, the same
 * table) can always resolve a correct guess. player_market_values covers
 * 2004 onward, so lineups from before 2004 (this file goes back to 1994) only
 * ever blank a player whose career/value rows extend into the covered range,
 * never a player who retired before 2004. Per the v1 constraint, the blanked
 * player is deliberately NOT always the biggest superstar in the XI; each
 * lineup stores 2-3 acceptable candidate blanks of mixed prominence and the
 * daily seed picks which slot is blanked, so a mid-table starter is blanked
 * as often as a household name.
 *
 * GAME MECHANIC
 * - The lineup is rendered on a simple pitch using the same row-based
 *   {label, allowed, x, y} slot shape FORMATIONS uses in squadDeal.ts, so the
 *   pitch-layout rendering code can reuse that positioning logic directly.
 * - One slot (chosen by date seed for Daily, at random for Unlimited) shows
 *   "?" instead of a name. Its `allowed` position label is still shown, e.g.
 *   "? (CB)", since the position is never the secret, only the name is.
 * - 3 guesses. After each wrong guess, one more hint unlocks in this order:
 *   1) nationality, 2) club at the time of the match, 3) first letter of the
 *   surname. A guess is only checked against the pool of `blankCandidates`
 *   for THIS lineup (not the whole soccer database), since the puzzle has
 *   exactly one correct answer per day.
 * - Scoring: 100 points on guess 1, 70 on guess 2, 40 on guess 3, 0 on a
 *   failed 3rd guess (full reveal shown instead).
 *
 * DAILY VS UNLIMITED
 * Daily: dateSeed(getTodayET()) picks both the lineup (index into LINEUPS)
 * and, independently, which of that lineup's blankCandidates is blanked, so
 * every player sees the same puzzle on the same ET date, matching the
 * sitewide daily-reset convention in src/lib/dateUtils.ts. Unlimited: a fresh
 * Math.random() pick of lineup + blank every time, for free-play replay.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Same position vocabulary FORMATIONS in squadDeal.ts uses, so pitch layout logic can be shared. */
export type XiPosition =
  | 'GK' | 'CB' | 'RB' | 'LB' | 'RWB' | 'LWB'
  | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'ST' | 'CF';

export interface XiSlot {
  /** Position label shown on the tile, e.g. "CB". */
  position: XiPosition;
  /** Player's real name as they were known at the time of the match. */
  name: string;
  /** Pitch x/y percentage, same convention as FormationSlot in squadDeal.ts (0-100, y grows toward the goalkeeper's own goal). */
  x: number;
  y: number;
}

export interface BlankCandidate {
  /** Exact player_market_values.player_name spelling, verified to exist via SQL on 2026-07-03. */
  name: string;
  /** The slot index (into Lineup.slots) this candidate occupies. */
  slotIndex: number;
  nationality: string;
  /** Club the player was AT during this specific match (may differ from their most famous club). */
  clubAtTime: string;
}

export interface Lineup {
  id: string;
  /** e.g. "2011 Champions League Final". */
  dateLabel: string;
  competition: string;
  /** Exact match date, YYYY-MM-DD. */
  matchDate: string;
  team: string;
  opponent: string;
  /** Final score line, e.g. "Barcelona 3-1 Manchester United". Penalty/AET noted where relevant. */
  scoreLine: string;
  venue: string;
  formationLabel: string;
  slots: XiSlot[];
  /** 2-3 verified acceptable blanks; the daily/unlimited seed picks one. */
  blankCandidates: BlankCandidate[];
  /** One-line note on what was checked, per the file-level verification method above. */
  source: string;
}

export interface ActivePuzzle {
  lineup: Lineup;
  /** Which of lineup.blankCandidates is blanked this round. */
  candidate: BlankCandidate;
}

export type HintLevel = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Curated, verified lineups
// ---------------------------------------------------------------------------
// x/y follow the same pitch convention as squadDeal.ts FORMATIONS: y=90 is
// the goalkeeper's line (own goal end), y=16-24 is the attacking third.
// Formations below reuse the same coordinate bands FORMATIONS already
// established so a shared pitch component renders both without a new layout
// system.

const GK = (name: string): XiSlot => ({ position: 'GK', name, x: 50, y: 90 });

export const LINEUPS: Lineup[] = [
  // 1. 2011 Champions League Final - Barcelona 3-1 Manchester United (Wembley)
  {
    id: 'cl-2011-final-barca',
    dateLabel: '2011 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2011-05-28',
    team: 'Barcelona',
    opponent: 'Manchester United',
    scoreLine: 'Barcelona 3-1 Manchester United',
    venue: 'Wembley Stadium, London',
    formationLabel: '4-3-3',
    // Note: Mascherano (not Puyol, who was on the bench) partnered Pique at CB this match.
    slots: [
      GK('Victor Valdes'),
      { position: 'RB', name: 'Dani Alves', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Javier Mascherano', x: 38, y: 74 },
      { position: 'LB', name: 'Eric Abidal', x: 16, y: 70 },
      { position: 'CDM', name: 'Sergio Busquets', x: 50, y: 58 },
      { position: 'CM', name: 'Xavi', x: 68, y: 50 },
      { position: 'CM', name: 'Andres Iniesta', x: 32, y: 50 },
      { position: 'RW', name: 'Pedro', x: 80, y: 24 },
      { position: 'CF', name: 'Lionel Messi', x: 50, y: 18 },
      { position: 'LW', name: 'David Villa', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Javier Mascherano', slotIndex: 3, nationality: 'Argentina', clubAtTime: 'Barcelona' },
      { name: 'Eric Abidal', slotIndex: 4, nationality: 'France', clubAtTime: 'Barcelona' },
      { name: 'Pedro', slotIndex: 8, nationality: 'Spain', clubAtTime: 'Barcelona' },
    ],
    source: 'Wikipedia match report + Sky Sports lineup graphic, cross-checked vs ESPN. Mascherano (not Puyol) at CB confirmed.',
  },

  // 2. 2012 Champions League Final - Chelsea 1-1 Bayern Munich (Chelsea won on pens)
  {
    id: 'cl-2012-final-chelsea',
    dateLabel: '2012 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2012-05-19',
    team: 'Chelsea',
    opponent: 'Bayern Munich',
    scoreLine: 'Bayern Munich 1-1 Chelsea (Chelsea won 4-3 on penalties)',
    venue: 'Allianz Arena, Munich',
    formationLabel: '4-2-3-1',
    slots: [
      GK('Petr Cech'),
      { position: 'RB', name: 'Jose Bosingwa', x: 84, y: 70 },
      { position: 'CB', name: 'Gary Cahill', x: 62, y: 74 },
      { position: 'CB', name: 'David Luiz', x: 38, y: 74 },
      { position: 'LB', name: 'Ashley Cole', x: 16, y: 70 },
      { position: 'CDM', name: 'John Obi Mikel', x: 62, y: 56 },
      { position: 'CDM', name: 'Frank Lampard', x: 38, y: 56 },
      { position: 'CAM', name: 'Juan Mata', x: 50, y: 40 },
      { position: 'RW', name: 'Salomon Kalou', x: 80, y: 26 },
      { position: 'LW', name: 'Ryan Bertrand', x: 20, y: 26 },
      { position: 'ST', name: 'Didier Drogba', x: 50, y: 16 },
    ],
    // Ryan Bertrand made his competitive debut in this final, playing makeshift left winger - a real, well-documented surprise starter, not an error.
    blankCandidates: [
      { name: 'Jose Bosingwa', slotIndex: 1, nationality: 'Portugal', clubAtTime: 'Chelsea' },
      { name: 'Salomon Kalou', slotIndex: 8, nationality: "Cote d'Ivoire", clubAtTime: 'Chelsea' },
      { name: 'Ryan Bertrand', slotIndex: 9, nationality: 'England', clubAtTime: 'Chelsea' },
    ],
    source: 'Wikipedia match report (confirms Bertrand debut as makeshift winger) + Sky Sports + ESPN lineup pages.',
  },

  // 3. 2014 Champions League Final - Real Madrid 4-1 Atletico Madrid (AET)
  {
    id: 'cl-2014-final-real',
    dateLabel: '2014 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2014-05-24',
    team: 'Real Madrid',
    opponent: 'Atletico Madrid',
    scoreLine: 'Real Madrid 4-1 Atletico Madrid (after extra time)',
    venue: 'Estadio da Luz, Lisbon',
    formationLabel: '4-3-3',
    slots: [
      GK('Iker Casillas'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Raphael Varane', x: 62, y: 74 },
      { position: 'CB', name: 'Sergio Ramos', x: 38, y: 74 },
      { position: 'LB', name: 'Fabio Coentrao', x: 16, y: 70 },
      { position: 'CDM', name: 'Sami Khedira', x: 50, y: 58 },
      { position: 'CM', name: 'Luka Modric', x: 68, y: 50 },
      { position: 'CM', name: 'Angel Di Maria', x: 32, y: 50 },
      { position: 'LW', name: 'Cristiano Ronaldo', x: 20, y: 24 },
      { position: 'ST', name: 'Karim Benzema', x: 50, y: 18 },
      { position: 'RW', name: 'Gareth Bale', x: 80, y: 24 },
    ],
    // Xabi Alonso was suspended (Khedira started); Pepe was benched for Varane - both real, verified swaps.
    blankCandidates: [
      { name: 'Fabio Coentrao', slotIndex: 4, nationality: 'Portugal', clubAtTime: 'Real Madrid' },
      { name: 'Sami Khedira', slotIndex: 5, nationality: 'Germany', clubAtTime: 'Real Madrid' },
      { name: 'Raphael Varane', slotIndex: 2, nationality: 'France', clubAtTime: 'Real Madrid' },
    ],
    source: 'Wikipedia match report (confirms Alonso suspension, Pepe/Varane swap) + Managing Madrid + Sky Sports, unanimous.',
  },

  // 4. 2019 Champions League Final - Liverpool 2-0 Tottenham
  {
    id: 'cl-2019-final-liverpool',
    dateLabel: '2019 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2019-06-01',
    team: 'Liverpool',
    opponent: 'Tottenham Hotspur',
    scoreLine: 'Liverpool 2-0 Tottenham Hotspur',
    venue: 'Estadio Metropolitano, Madrid',
    formationLabel: '4-3-3',
    slots: [
      GK('Alisson'),
      { position: 'RB', name: 'Trent Alexander-Arnold', x: 84, y: 70 },
      { position: 'CB', name: 'Joel Matip', x: 62, y: 74 },
      { position: 'CB', name: 'Virgil van Dijk', x: 38, y: 74 },
      { position: 'LB', name: 'Andrew Robertson', x: 16, y: 70 },
      { position: 'CDM', name: 'Fabinho', x: 50, y: 58 },
      { position: 'CM', name: 'Jordan Henderson', x: 68, y: 50 },
      { position: 'CM', name: 'Georginio Wijnaldum', x: 32, y: 50 },
      { position: 'RW', name: 'Mohamed Salah', x: 80, y: 24 },
      { position: 'CF', name: 'Roberto Firmino', x: 50, y: 18 },
      { position: 'LW', name: 'Sadio Mane', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Joel Matip', slotIndex: 2, nationality: 'Cameroon', clubAtTime: 'Liverpool' },
      { name: 'Georginio Wijnaldum', slotIndex: 7, nationality: 'Netherlands', clubAtTime: 'Liverpool' },
      { name: 'Fabinho', slotIndex: 5, nationality: 'Brazil', clubAtTime: 'Liverpool' },
    ],
    source: 'Wikipedia match report + Liverpool FC official confirmed-lineup article + Sky Sports, unanimous.',
  },

  // 5. 2022 Champions League Final - Real Madrid 1-0 Liverpool
  {
    id: 'cl-2022-final-real',
    dateLabel: '2022 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2022-05-28',
    team: 'Real Madrid',
    opponent: 'Liverpool',
    scoreLine: 'Real Madrid 1-0 Liverpool',
    venue: 'Stade de France, Saint-Denis',
    formationLabel: '4-3-3',
    slots: [
      GK('Thibaut Courtois'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Eder Militao', x: 62, y: 74 },
      { position: 'CB', name: 'David Alaba', x: 38, y: 74 },
      { position: 'LB', name: 'Ferland Mendy', x: 16, y: 70 },
      { position: 'CDM', name: 'Casemiro', x: 50, y: 58 },
      { position: 'CM', name: 'Toni Kroos', x: 68, y: 50 },
      { position: 'CM', name: 'Luka Modric', x: 32, y: 50 },
      { position: 'RW', name: 'Federico Valverde', x: 80, y: 24 },
      { position: 'ST', name: 'Karim Benzema', x: 50, y: 18 },
      { position: 'LW', name: 'Vinicius Junior', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Eder Militao', slotIndex: 2, nationality: 'Brazil', clubAtTime: 'Real Madrid' },
      { name: 'Ferland Mendy', slotIndex: 4, nationality: 'France', clubAtTime: 'Real Madrid' },
      { name: 'Federico Valverde', slotIndex: 8, nationality: 'Uruguay', clubAtTime: 'Real Madrid' },
    ],
    source: 'Wikipedia match report + Sky Sports lineup graphic + Managing Madrid confirmed lineups, unanimous.',
  },

  // 6. 2023 Champions League Final - Manchester City 1-0 Inter Milan
  {
    id: 'cl-2023-final-city',
    dateLabel: '2023 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2023-06-10',
    team: 'Manchester City',
    opponent: 'Inter Milan',
    scoreLine: 'Manchester City 1-0 Inter Milan',
    venue: 'Ataturk Olympic Stadium, Istanbul',
    formationLabel: '4-3-3',
    slots: [
      GK('Ederson'),
      { position: 'RB', name: 'Manuel Akanji', x: 84, y: 70 },
      { position: 'CB', name: 'John Stones', x: 62, y: 74 },
      { position: 'CB', name: 'Ruben Dias', x: 38, y: 74 },
      { position: 'LB', name: 'Nathan Ake', x: 16, y: 70 },
      { position: 'CDM', name: 'Rodri', x: 50, y: 58 },
      { position: 'CM', name: 'Bernardo Silva', x: 68, y: 50 },
      { position: 'CAM', name: 'Ilkay Gundogan', x: 50, y: 40 },
      { position: 'CM', name: 'Kevin De Bruyne', x: 32, y: 50 },
      { position: 'LW', name: 'Jack Grealish', x: 20, y: 24 },
      { position: 'ST', name: 'Erling Haaland', x: 50, y: 18 },
    ],
    // Kyle Walker was a surprise bench call, with Ake preferred at left back.
    blankCandidates: [
      { name: 'Manuel Akanji', slotIndex: 1, nationality: 'Switzerland', clubAtTime: 'Manchester City' },
      { name: 'Nathan Ake', slotIndex: 4, nationality: 'Netherlands', clubAtTime: 'Manchester City' },
      { name: 'John Stones', slotIndex: 2, nationality: 'England', clubAtTime: 'Manchester City' },
    ],
    source: 'Wikipedia match report + Sky Sports + CBS Sports (Walker benched) + Coaches Voice tactical breakdown.',
  },

  // 7. 2009 Champions League Final - Barcelona 2-0 Manchester United
  {
    id: 'cl-2009-final-barca',
    dateLabel: '2009 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2009-05-27',
    team: 'Barcelona',
    opponent: 'Manchester United',
    scoreLine: 'Barcelona 2-0 Manchester United',
    venue: 'Stadio Olimpico, Rome',
    formationLabel: '4-3-3',
    // Alves and Abidal were both suspended: Puyol moved to RB, Sylvinho (a backup) started at LB, Yaya Toure filled in at CB - all verified, a very different back four from Barca's usual XI that era.
    slots: [
      GK('Victor Valdes'),
      { position: 'RB', name: 'Carles Puyol', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Yaya Toure', x: 38, y: 74 },
      { position: 'LB', name: 'Sylvinho', x: 16, y: 70 },
      { position: 'CDM', name: 'Sergio Busquets', x: 50, y: 58 },
      { position: 'CM', name: 'Xavi', x: 68, y: 50 },
      { position: 'CM', name: 'Andres Iniesta', x: 32, y: 50 },
      { position: 'RW', name: 'Samuel Eto\'o', x: 80, y: 24 },
      { position: 'CF', name: 'Lionel Messi', x: 50, y: 18 },
      { position: 'LW', name: 'Thierry Henry', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Yaya Toure', slotIndex: 3, nationality: "Cote d'Ivoire", clubAtTime: 'Barcelona' },
      { name: 'Sylvinho', slotIndex: 4, nationality: 'Brazil', clubAtTime: 'Barcelona' },
      { name: 'Thierry Henry', slotIndex: 10, nationality: 'France', clubAtTime: 'Barcelona' },
    ],
    source: 'Wikipedia match report (confirms Alves/Abidal suspensions, Puyol-to-RB, Sylvinho, Yaya Toure at CB) + Sky Sports/ESPN.',
  },

  // 8. 2005 Champions League Final - Liverpool 3-3 AC Milan (Liverpool won on pens), STARTING XI only
  {
    id: 'cl-2005-final-liverpool',
    dateLabel: '2005 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2005-05-25',
    team: 'Liverpool',
    opponent: 'AC Milan',
    scoreLine: 'Liverpool 3-3 AC Milan, AET (Liverpool won 3-2 on penalties)',
    venue: 'Ataturk Olympic Stadium, Istanbul',
    formationLabel: '4-4-1-1 diamond',
    // Starting XI before the famous second-half comeback substitutions (Hamann/Smicer/Kewell subs came on DURING the match; Kewell himself was a starter, not a sub, despite often being misremembered as one).
    slots: [
      GK('Jerzy Dudek'),
      { position: 'RB', name: 'Steve Finnan', x: 84, y: 70 },
      { position: 'CB', name: 'Jamie Carragher', x: 62, y: 74 },
      { position: 'CB', name: 'Sami Hyypia', x: 38, y: 74 },
      { position: 'LB', name: 'Djimi Traore', x: 16, y: 70 },
      { position: 'CDM', name: 'Xabi Alonso', x: 50, y: 60 },
      { position: 'RM', name: 'Luis Garcia', x: 78, y: 46 },
      { position: 'LM', name: 'John Arne Riise', x: 22, y: 46 },
      { position: 'CAM', name: 'Steven Gerrard', x: 50, y: 34 },
      { position: 'CF', name: 'Harry Kewell', x: 50, y: 22 },
      { position: 'ST', name: 'Milan Baros', x: 50, y: 12 },
    ],
    blankCandidates: [
      { name: 'Djimi Traore', slotIndex: 4, nationality: 'Mali', clubAtTime: 'Liverpool' },
      { name: 'Harry Kewell', slotIndex: 9, nationality: 'Australia', clubAtTime: 'Liverpool' },
      { name: 'Milan Baros', slotIndex: 10, nationality: 'Czech Republic', clubAtTime: 'Liverpool' },
    ],
    source: 'Wikipedia match report + Sky Sports lineup graphic + Liverpool FC retrospective, confirming starting XI vs comeback subs.',
  },

  // 9. 2015 Champions League Final - Barcelona 3-1 Juventus
  {
    id: 'cl-2015-final-barca',
    dateLabel: '2015 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2015-06-06',
    team: 'Barcelona',
    opponent: 'Juventus',
    scoreLine: 'Barcelona 3-1 Juventus',
    venue: 'Olympiastadion, Berlin',
    formationLabel: '4-3-3',
    slots: [
      GK('Marc-Andre ter Stegen'),
      { position: 'RB', name: 'Dani Alves', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Javier Mascherano', x: 38, y: 74 },
      { position: 'LB', name: 'Jordi Alba', x: 16, y: 70 },
      { position: 'CDM', name: 'Sergio Busquets', x: 50, y: 58 },
      { position: 'CM', name: 'Ivan Rakitic', x: 68, y: 50 },
      { position: 'CM', name: 'Andres Iniesta', x: 32, y: 50 },
      { position: 'RW', name: 'Lionel Messi', x: 80, y: 24 },
      { position: 'CF', name: 'Luis Suarez', x: 50, y: 18 },
      { position: 'LW', name: 'Neymar', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Ivan Rakitic', slotIndex: 6, nationality: 'Croatia', clubAtTime: 'Barcelona' },
      { name: 'Javier Mascherano', slotIndex: 3, nationality: 'Argentina', clubAtTime: 'Barcelona' },
      { name: 'Jordi Alba', slotIndex: 4, nationality: 'Spain', clubAtTime: 'Barcelona' },
    ],
    source: 'ESPN, Sky Sports, Transfermarkt, worldfootball.net all agree on names and shirt numbers.',
  },

  // 10. 2017 Champions League Final - Real Madrid 4-1 Juventus
  {
    id: 'cl-2017-final-real',
    dateLabel: '2017 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2017-06-03',
    team: 'Real Madrid',
    opponent: 'Juventus',
    scoreLine: 'Real Madrid 4-1 Juventus',
    venue: 'Millennium Stadium, Cardiff',
    formationLabel: '4-3-1-2',
    // Varane (not Pepe) partnered Ramos at CB by this final; verified via UEFA's official tactical PDF.
    slots: [
      GK('Keylor Navas'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Raphael Varane', x: 62, y: 74 },
      { position: 'CB', name: 'Sergio Ramos', x: 38, y: 74 },
      { position: 'LB', name: 'Marcelo', x: 16, y: 70 },
      { position: 'CDM', name: 'Casemiro', x: 50, y: 58 },
      { position: 'CM', name: 'Toni Kroos', x: 68, y: 48 },
      { position: 'CM', name: 'Luka Modric', x: 32, y: 48 },
      { position: 'CAM', name: 'Isco', x: 50, y: 34 },
      { position: 'ST', name: 'Cristiano Ronaldo', x: 60, y: 18 },
      { position: 'ST', name: 'Karim Benzema', x: 40, y: 18 },
    ],
    blankCandidates: [
      { name: 'Raphael Varane', slotIndex: 2, nationality: 'France', clubAtTime: 'Real Madrid' },
      { name: 'Isco', slotIndex: 8, nationality: 'Spain', clubAtTime: 'Real Madrid' },
      { name: 'Marcelo', slotIndex: 4, nationality: 'Brazil', clubAtTime: 'Real Madrid' },
    ],
    source: 'UEFA official tactical lineup PDF + Sky Sports + Wikipedia + Managing Madrid, all agree Varane (not Pepe) partnered Ramos.',
  },

  // 11. 2020 Champions League Final - Bayern Munich 1-0 Paris Saint-Germain
  {
    id: 'cl-2020-final-bayern',
    dateLabel: '2020 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2020-08-23',
    team: 'Bayern Munich',
    opponent: 'Paris Saint-Germain',
    scoreLine: 'Paris Saint-Germain 0-1 Bayern Munich',
    venue: 'Estadio da Luz, Lisbon',
    formationLabel: '4-2-3-1',
    slots: [
      GK('Manuel Neuer'),
      { position: 'RB', name: 'Joshua Kimmich', x: 84, y: 70 },
      { position: 'CB', name: 'Jerome Boateng', x: 62, y: 74 },
      { position: 'CB', name: 'David Alaba', x: 38, y: 74 },
      { position: 'LB', name: 'Alphonso Davies', x: 16, y: 70 },
      { position: 'CDM', name: 'Thiago Alcántara', x: 62, y: 56 },
      { position: 'CDM', name: 'Leon Goretzka', x: 38, y: 56 },
      { position: 'RW', name: 'Serge Gnabry', x: 80, y: 34 },
      { position: 'CAM', name: 'Thomas Muller', x: 50, y: 34 },
      { position: 'LW', name: 'Kingsley Coman', x: 20, y: 34 },
      { position: 'ST', name: 'Robert Lewandowski', x: 50, y: 16 },
    ],
    // Coman started over Perisic; scored the winner against his former club.
    blankCandidates: [
      { name: 'Jerome Boateng', slotIndex: 2, nationality: 'Germany', clubAtTime: 'Bayern Munich' },
      { name: 'Kingsley Coman', slotIndex: 9, nationality: 'France', clubAtTime: 'Bayern Munich' },
      { name: 'Leon Goretzka', slotIndex: 6, nationality: 'Germany', clubAtTime: 'Bayern Munich' },
    ],
    source: 'UEFA official tactical PDF + fcbayern.com official match-centre page + Sky Sports + Wikipedia, unanimous.',
  },

  // 12. 2021 Champions League Final - Chelsea 1-0 Manchester City
  {
    id: 'cl-2021-final-chelsea',
    dateLabel: '2021 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2021-05-29',
    team: 'Chelsea',
    opponent: 'Manchester City',
    scoreLine: 'Manchester City 0-1 Chelsea',
    venue: 'Estadio do Dragao, Porto',
    formationLabel: '3-4-2-1',
    // Werner (not Pulisic, a common misconception) started; Pulisic subbed on in the 2nd half.
    slots: [
      GK('Edouard Mendy'),
      { position: 'CB', name: 'Cesar Azpilicueta', x: 68, y: 76 },
      { position: 'CB', name: 'Thiago Silva', x: 50, y: 78 },
      { position: 'CB', name: 'Antonio Rudiger', x: 32, y: 76 },
      { position: 'RM', name: 'Reece James', x: 86, y: 52 },
      { position: 'CM', name: 'N\'Golo Kante', x: 62, y: 56 },
      { position: 'CM', name: 'Jorginho', x: 38, y: 56 },
      { position: 'LM', name: 'Ben Chilwell', x: 14, y: 52 },
      { position: 'CAM', name: 'Mason Mount', x: 62, y: 32 },
      { position: 'CAM', name: 'Timo Werner', x: 38, y: 32 },
      { position: 'CF', name: 'Kai Havertz', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Timo Werner', slotIndex: 9, nationality: 'Germany', clubAtTime: 'Chelsea' },
      { name: 'Reece James', slotIndex: 4, nationality: 'England', clubAtTime: 'Chelsea' },
      { name: 'Antonio Rudiger', slotIndex: 3, nationality: 'Germany', clubAtTime: 'Chelsea' },
    ],
    source: 'chelseafc.com official lineup article + UEFA official PDF (confirms Pulisic on bench) + Sky Sports + Wikipedia.',
  },

  // 13. 2024 Champions League Final - Real Madrid 2-0 Borussia Dortmund
  {
    id: 'cl-2024-final-real',
    dateLabel: '2024 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2024-06-01',
    team: 'Real Madrid',
    opponent: 'Borussia Dortmund',
    scoreLine: 'Real Madrid 2-0 Borussia Dortmund',
    venue: 'Wembley Stadium, London',
    formationLabel: '4-3-3',
    // No recognized striker started: Bellingham played advanced centrally; Joselu was a late sub, not a starter.
    slots: [
      GK('Thibaut Courtois'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Antonio Rudiger', x: 62, y: 74 },
      { position: 'CB', name: 'Nacho', x: 38, y: 74 },
      { position: 'LB', name: 'Ferland Mendy', x: 16, y: 70 },
      { position: 'CDM', name: 'Eduardo Camavinga', x: 50, y: 58 },
      { position: 'CM', name: 'Federico Valverde', x: 68, y: 50 },
      { position: 'CM', name: 'Toni Kroos', x: 32, y: 50 },
      { position: 'CAM', name: 'Jude Bellingham', x: 50, y: 32 },
      { position: 'LW', name: 'Vinicius Junior', x: 20, y: 20 },
      { position: 'RW', name: 'Rodrygo', x: 80, y: 20 },
    ],
    blankCandidates: [
      { name: 'Eduardo Camavinga', slotIndex: 5, nationality: 'France', clubAtTime: 'Real Madrid' },
      { name: 'Nacho', slotIndex: 3, nationality: 'Spain', clubAtTime: 'Real Madrid' },
      { name: 'Rodrygo', slotIndex: 9, nationality: 'Brazil', clubAtTime: 'Real Madrid' },
    ],
    source: 'Wikipedia + Sky Sports + Managing Madrid confirmed-lineups (Camavinga in for Tchouameni) + CBS/NBC Sports, unanimous.',
  },

  // 14. 2010 Champions League Final - Inter Milan 2-0 Bayern Munich
  {
    id: 'cl-2010-final-inter',
    dateLabel: '2010 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2010-05-22',
    team: 'Inter Milan',
    opponent: 'Bayern Munich',
    scoreLine: 'Bayern Munich 0-2 Inter Milan',
    venue: 'Santiago Bernabeu, Madrid',
    formationLabel: '4-2-3-1',
    // Thiago Motta was suspended and unavailable entirely; Zanetti (not Motta) played midfield alongside Cambiasso, with Chivu covering at LB.
    slots: [
      GK('Julio Cesar'),
      { position: 'RB', name: 'Maicon', x: 84, y: 70 },
      { position: 'CB', name: 'Walter Samuel', x: 62, y: 74 },
      { position: 'CB', name: 'Lucio', x: 38, y: 74 },
      { position: 'LB', name: 'Cristian Chivu', x: 16, y: 70 },
      { position: 'CM', name: 'Javier Zanetti', x: 62, y: 54 },
      { position: 'CM', name: 'Esteban Cambiasso', x: 38, y: 54 },
      { position: 'CAM', name: 'Wesley Sneijder', x: 50, y: 36 },
      { position: 'RW', name: 'Samuel Eto\'o', x: 80, y: 24 },
      { position: 'LW', name: 'Goran Pandev', x: 20, y: 24 },
      { position: 'ST', name: 'Diego Milito', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Cristian Chivu', slotIndex: 4, nationality: 'Romania', clubAtTime: 'Inter Milan' },
      { name: 'Goran Pandev', slotIndex: 9, nationality: 'North Macedonia', clubAtTime: 'Inter Milan' },
      { name: 'Walter Samuel', slotIndex: 2, nationality: 'Argentina', clubAtTime: 'Inter Milan' },
    ],
    source: 'Wikipedia (confirms Motta suspension) + Sky Sports + Sportskeeda tactical retrospective, unanimous.',
  },

  // 15. 2006 World Cup Final - Italy 1-1 France (Italy won on pens)
  {
    id: 'wc-2006-final-italy',
    dateLabel: '2006 World Cup Final',
    competition: 'FIFA World Cup',
    matchDate: '2006-07-09',
    team: 'Italy',
    opponent: 'France',
    scoreLine: 'Italy 1-1 France, AET (Italy won 5-3 on penalties)',
    venue: 'Olympiastadion, Berlin',
    formationLabel: '4-4-2',
    // Del Piero did not start (86th-min sub) - a common misremembering trap.
    slots: [
      GK('Gianluigi Buffon'),
      { position: 'RB', name: 'Gianluca Zambrotta', x: 84, y: 70 },
      { position: 'CB', name: 'Fabio Cannavaro', x: 62, y: 74 },
      { position: 'CB', name: 'Marco Materazzi', x: 38, y: 74 },
      { position: 'LB', name: 'Fabio Grosso', x: 16, y: 70 },
      { position: 'RM', name: 'Mauro Camoranesi', x: 82, y: 48 },
      { position: 'CM', name: 'Gennaro Gattuso', x: 60, y: 52 },
      { position: 'CM', name: 'Andrea Pirlo', x: 40, y: 52 },
      { position: 'LM', name: 'Simone Perrotta', x: 18, y: 48 },
      { position: 'CAM', name: 'Francesco Totti', x: 50, y: 32 },
      { position: 'ST', name: 'Luca Toni', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Marco Materazzi', slotIndex: 3, nationality: 'Italy', clubAtTime: 'Inter Milan' },
      { name: 'Simone Perrotta', slotIndex: 8, nationality: 'Italy', clubAtTime: 'AS Roma' },
      { name: 'Mauro Camoranesi', slotIndex: 5, nationality: 'Italy', clubAtTime: 'Juventus' },
    ],
    source: 'Wikipedia infobox + worldfootball.net lineup, agree exactly on all 11 names, subs match.',
  },

  // 16. 2006 World Cup Semifinal - Germany 0-2 Italy (identical Italy XI to the Final)
  {
    id: 'wc-2006-semi-italy',
    dateLabel: '2006 World Cup Semifinal',
    competition: 'FIFA World Cup',
    matchDate: '2006-07-04',
    team: 'Italy',
    opponent: 'Germany',
    scoreLine: 'Germany 0-2 Italy, AET',
    venue: 'Signal Iduna Park, Dortmund',
    formationLabel: '4-4-2',
    slots: [
      GK('Gianluigi Buffon'),
      { position: 'RB', name: 'Gianluca Zambrotta', x: 84, y: 70 },
      { position: 'CB', name: 'Fabio Cannavaro', x: 62, y: 74 },
      { position: 'CB', name: 'Marco Materazzi', x: 38, y: 74 },
      { position: 'LB', name: 'Fabio Grosso', x: 16, y: 70 },
      { position: 'RM', name: 'Mauro Camoranesi', x: 82, y: 48 },
      { position: 'CM', name: 'Gennaro Gattuso', x: 60, y: 52 },
      { position: 'CM', name: 'Andrea Pirlo', x: 40, y: 52 },
      { position: 'LM', name: 'Simone Perrotta', x: 18, y: 48 },
      { position: 'CAM', name: 'Francesco Totti', x: 50, y: 32 },
      { position: 'ST', name: 'Luca Toni', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Fabio Grosso', slotIndex: 4, nationality: 'Italy', clubAtTime: 'Palermo' },
      { name: 'Gennaro Gattuso', slotIndex: 6, nationality: 'Italy', clubAtTime: 'AC Milan' },
      { name: 'Luca Toni', slotIndex: 10, nationality: 'Italy', clubAtTime: 'Fiorentina' },
    ],
    source: 'worldfootball.net lineup page + Wikipedia knockout-stage infobox + Sky Sports lineup page, all agree.',
  },

  // 17. 2010 World Cup Final - Spain 1-0 Netherlands (AET)
  {
    id: 'wc-2010-final-spain',
    dateLabel: '2010 World Cup Final',
    competition: 'FIFA World Cup',
    matchDate: '2010-07-11',
    team: 'Spain',
    opponent: 'Netherlands',
    scoreLine: 'Netherlands 0-1 Spain, AET',
    venue: 'Soccer City, Johannesburg',
    formationLabel: '4-2-3-1',
    slots: [
      GK('Iker Casillas'),
      { position: 'RB', name: 'Sergio Ramos', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Carles Puyol', x: 38, y: 74 },
      { position: 'LB', name: 'Joan Capdevila', x: 16, y: 70 },
      { position: 'CDM', name: 'Sergio Busquets', x: 62, y: 58 },
      { position: 'CDM', name: 'Xabi Alonso', x: 38, y: 58 },
      { position: 'CM', name: 'Xavi', x: 50, y: 40 },
      { position: 'RW', name: 'Andres Iniesta', x: 80, y: 26 },
      { position: 'LW', name: 'Pedro', x: 20, y: 26 },
      { position: 'CF', name: 'David Villa', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Joan Capdevila', slotIndex: 4, nationality: 'Spain', clubAtTime: 'Villarreal' },
      { name: 'Carles Puyol', slotIndex: 3, nationality: 'Spain', clubAtTime: 'Barcelona' },
      { name: 'Pedro', slotIndex: 9, nationality: 'Spain', clubAtTime: 'Barcelona' },
    ],
    source: 'Wikipedia infobox + Sky Sports lineup page, full agreement on all 11 names and numbers.',
  },

  // 18. 2014 World Cup Final - Germany 1-0 Argentina (AET)
  {
    id: 'wc-2014-final-germany',
    dateLabel: '2014 World Cup Final',
    competition: 'FIFA World Cup',
    matchDate: '2014-07-13',
    team: 'Germany',
    opponent: 'Argentina',
    scoreLine: 'Germany 1-0 Argentina, AET',
    venue: 'Maracana, Rio de Janeiro',
    formationLabel: '4-2-3-1',
    // Kramer started (for the injured Khedira) and was forced off ~31' with concussion; Klose started at striker; Gotze was NOT a starter (88th-min sub who scored the winner) - a common misremembering trap.
    slots: [
      GK('Manuel Neuer'),
      { position: 'RB', name: 'Philipp Lahm', x: 84, y: 70 },
      { position: 'CB', name: 'Jerome Boateng', x: 62, y: 74 },
      { position: 'CB', name: 'Mats Hummels', x: 38, y: 74 },
      { position: 'LB', name: 'Benedikt Howedes', x: 16, y: 70 },
      { position: 'CDM', name: 'Bastian Schweinsteiger', x: 62, y: 56 },
      { position: 'CM', name: 'Christoph Kramer', x: 38, y: 56 },
      { position: 'CAM', name: 'Toni Kroos', x: 50, y: 38 },
      { position: 'RW', name: 'Thomas Muller', x: 80, y: 24 },
      { position: 'LW', name: 'Mesut Ozil', x: 20, y: 24 },
      { position: 'ST', name: 'Miroslav Klose', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Benedikt Howedes', slotIndex: 4, nationality: 'Germany', clubAtTime: 'Schalke 04' },
      { name: 'Bastian Schweinsteiger', slotIndex: 5, nationality: 'Germany', clubAtTime: 'Bayern Munich' },
      { name: 'Miroslav Klose', slotIndex: 10, nationality: 'Germany', clubAtTime: 'Lazio' },
    ],
    source: 'Wikipedia infobox and prose + Lahm/Howedes Wikipedia bios, confirms Kramer/Klose start and Gotze as a sub.',
  },

  // 19. 2014 World Cup Semifinal - Brazil 1-7 Germany
  {
    id: 'wc-2014-semi-germany',
    dateLabel: '2014 World Cup Semifinal',
    competition: 'FIFA World Cup',
    matchDate: '2014-07-08',
    team: 'Germany',
    opponent: 'Brazil',
    scoreLine: 'Brazil 1-7 Germany',
    venue: 'Estadio Mineirao, Belo Horizonte',
    formationLabel: '4-2-3-1',
    // Identical XI to the Final except Khedira (fit again) started here instead of Kramer.
    slots: [
      GK('Manuel Neuer'),
      { position: 'RB', name: 'Philipp Lahm', x: 84, y: 70 },
      { position: 'CB', name: 'Jerome Boateng', x: 62, y: 74 },
      { position: 'CB', name: 'Mats Hummels', x: 38, y: 74 },
      { position: 'LB', name: 'Benedikt Howedes', x: 16, y: 70 },
      { position: 'CDM', name: 'Bastian Schweinsteiger', x: 62, y: 56 },
      { position: 'CM', name: 'Sami Khedira', x: 38, y: 56 },
      { position: 'CAM', name: 'Toni Kroos', x: 50, y: 38 },
      { position: 'RW', name: 'Thomas Muller', x: 80, y: 24 },
      { position: 'LW', name: 'Mesut Ozil', x: 20, y: 24 },
      { position: 'ST', name: 'Miroslav Klose', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Sami Khedira', slotIndex: 6, nationality: 'Germany', clubAtTime: 'Real Madrid' },
      { name: 'Mats Hummels', slotIndex: 3, nationality: 'Germany', clubAtTime: 'Borussia Dortmund' },
      { name: 'Toni Kroos', slotIndex: 7, nationality: 'Germany', clubAtTime: 'Bayern Munich' },
    ],
    source: 'Wikipedia match article prose ("unchanged... except" Khedira for Kramer) + Lahm/Howedes bios.',
  },

  // 20. 2018 World Cup Final - France 4-2 Croatia
  {
    id: 'wc-2018-final-france',
    dateLabel: '2018 World Cup Final',
    competition: 'FIFA World Cup',
    matchDate: '2018-07-15',
    team: 'France',
    opponent: 'Croatia',
    scoreLine: 'France 4-2 Croatia',
    venue: 'Luzhniki Stadium, Moscow',
    formationLabel: '4-4-2',
    // Matuidi (a natural central midfielder) played left wing this match specifically, tracking Croatia's right back - verified, not an error.
    slots: [
      GK('Hugo Lloris'),
      { position: 'RB', name: 'Benjamin Pavard', x: 84, y: 70 },
      { position: 'CB', name: 'Raphael Varane', x: 62, y: 74 },
      { position: 'CB', name: 'Samuel Umtiti', x: 38, y: 74 },
      { position: 'LB', name: 'Lucas Hernandez', x: 16, y: 70 },
      { position: 'RW', name: 'Kylian Mbappe', x: 82, y: 30 },
      { position: 'CM', name: 'N\'Golo Kante', x: 60, y: 52 },
      { position: 'CM', name: 'Paul Pogba', x: 40, y: 52 },
      { position: 'LW', name: 'Blaise Matuidi', x: 18, y: 30 },
      { position: 'CAM', name: 'Antoine Griezmann', x: 50, y: 34 },
      { position: 'CF', name: 'Olivier Giroud', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Benjamin Pavard', slotIndex: 1, nationality: 'France', clubAtTime: 'VfB Stuttgart' },
      { name: 'Samuel Umtiti', slotIndex: 3, nationality: 'France', clubAtTime: 'Barcelona' },
      { name: 'Blaise Matuidi', slotIndex: 8, nationality: 'France', clubAtTime: 'Paris Saint-Germain' },
    ],
    source: 'Wikipedia infobox + explicit prose confirming 4-4-2 + Sky Sports lineup page + Managing Madrid pre-match report.',
  },

  // 21. 2022 World Cup Final - Argentina 3-3 France (Argentina won on pens)
  {
    id: 'wc-2022-final-argentina',
    dateLabel: '2022 World Cup Final',
    competition: 'FIFA World Cup',
    matchDate: '2022-12-18',
    team: 'Argentina',
    opponent: 'France',
    scoreLine: 'Argentina 3-3 France, AET (Argentina won 4-2 on penalties)',
    venue: 'Lusail Stadium, Lusail',
    formationLabel: '4-3-3',
    slots: [
      GK('Emiliano Martinez'),
      { position: 'RB', name: 'Nahuel Molina', x: 84, y: 70 },
      { position: 'CB', name: 'Cristian Romero', x: 62, y: 74 },
      { position: 'CB', name: 'Nicolas Otamendi', x: 38, y: 74 },
      { position: 'LB', name: 'Nicolas Tagliafico', x: 16, y: 70 },
      { position: 'CDM', name: 'Enzo Fernández', x: 50, y: 58 },
      { position: 'CM', name: 'Alexis Mac Allister', x: 68, y: 50 },
      { position: 'CM', name: 'Rodrigo De Paul', x: 32, y: 50 },
      { position: 'RW', name: 'Lionel Messi', x: 80, y: 24 },
      { position: 'CF', name: 'Julián Alvarez', x: 50, y: 18 },
      { position: 'LW', name: 'Angel Di Maria', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Nicolas Tagliafico', slotIndex: 4, nationality: 'Argentina', clubAtTime: 'Lyon' },
      { name: 'Alexis Mac Allister', slotIndex: 6, nationality: 'Argentina', clubAtTime: 'Brighton' },
      { name: 'Nahuel Molina', slotIndex: 1, nationality: 'Argentina', clubAtTime: 'Atletico Madrid' },
    ],
    source: 'Wikipedia infobox, cross-checked against the tournament squads article for number-to-name mapping.',
  },

  // 22. 2022 World Cup Semifinal - Argentina 3-0 Croatia
  {
    id: 'wc-2022-semi-argentina',
    dateLabel: '2022 World Cup Semifinal',
    competition: 'FIFA World Cup',
    matchDate: '2022-12-13',
    team: 'Argentina',
    opponent: 'Croatia',
    scoreLine: 'Argentina 3-0 Croatia',
    venue: 'Lusail Stadium, Lusail',
    formationLabel: '4-4-2',
    // Different shape and personnel from the Final: Di Maria did NOT start here (Paredes did); Messi played as a striker, not a winger, in this match specifically.
    slots: [
      GK('Emiliano Martinez'),
      { position: 'RB', name: 'Nahuel Molina', x: 84, y: 70 },
      { position: 'CB', name: 'Cristian Romero', x: 62, y: 74 },
      { position: 'CB', name: 'Nicolas Otamendi', x: 38, y: 74 },
      { position: 'LB', name: 'Nicolas Tagliafico', x: 16, y: 70 },
      { position: 'RM', name: 'Rodrigo De Paul', x: 82, y: 48 },
      { position: 'CM', name: 'Leandro Paredes', x: 60, y: 52 },
      { position: 'CM', name: 'Enzo Fernández', x: 40, y: 52 },
      { position: 'LM', name: 'Alexis Mac Allister', x: 18, y: 48 },
      { position: 'ST', name: 'Lionel Messi', x: 60, y: 16 },
      { position: 'ST', name: 'Julián Alvarez', x: 40, y: 16 },
    ],
    blankCandidates: [
      { name: 'Leandro Paredes', slotIndex: 6, nationality: 'Argentina', clubAtTime: 'Juventus' },
      { name: 'Enzo Fernández', slotIndex: 7, nationality: 'Argentina', clubAtTime: 'Benfica' },
      { name: 'Julián Alvarez', slotIndex: 10, nationality: 'Argentina', clubAtTime: 'Manchester City' },
    ],
    source: 'Wikipedia knockout-stage infobox, cross-checked vs tactical analysis naming the Paredes-for-Di Maria swap.',
  },

  // 23. 2010 World Cup Semifinal - Uruguay 2-3 Netherlands
  {
    id: 'wc-2010-semi-netherlands',
    dateLabel: '2010 World Cup Semifinal',
    competition: 'FIFA World Cup',
    matchDate: '2010-07-06',
    team: 'Netherlands',
    opponent: 'Uruguay',
    scoreLine: 'Uruguay 2-3 Netherlands',
    venue: 'Cape Town Stadium, Cape Town',
    formationLabel: '4-2-3-1',
    // Van der Wiel and Nigel de Jong were both suspended; Boulahrouz (RB) and de Zeeuw (CM) started in their place - a real, verified reshuffle.
    slots: [
      GK('Maarten Stekelenburg'),
      { position: 'RB', name: 'Khalid Boulahrouz', x: 84, y: 70 },
      { position: 'CB', name: 'John Heitinga', x: 62, y: 74 },
      { position: 'CB', name: 'Joris Mathijsen', x: 38, y: 74 },
      { position: 'LB', name: 'Giovanni van Bronckhorst', x: 16, y: 70 },
      { position: 'CM', name: 'Mark van Bommel', x: 62, y: 56 },
      { position: 'CM', name: 'Demy de Zeeuw', x: 38, y: 56 },
      { position: 'RW', name: 'Arjen Robben', x: 80, y: 32 },
      { position: 'CAM', name: 'Wesley Sneijder', x: 50, y: 34 },
      { position: 'LW', name: 'Dirk Kuyt', x: 20, y: 32 },
      { position: 'CF', name: 'Robin van Persie', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Khalid Boulahrouz', slotIndex: 1, nationality: 'Netherlands', clubAtTime: 'Stuttgart' },
      { name: 'Demy de Zeeuw', slotIndex: 6, nationality: 'Netherlands', clubAtTime: 'AZ Alkmaar' },
      { name: 'Joris Mathijsen', slotIndex: 3, nationality: 'Netherlands', clubAtTime: 'AZ Alkmaar' },
    ],
    source: 'Sky Sports + Wikipedia, confirm Boulahrouz/de Zeeuw starting in place of the suspended van der Wiel/de Jong.',
  },

  // NOTE: a curated 1994 World Cup Final (Brazil vs Italy) lineup was
  // researched and initially drafted here, but was REMOVED after SQL
  // verification (2026-07-03) found none of its candidate blanks are usable:
  // "Aldair", "Bebeto" and "Mazinho" exist in player_market_values only as
  // name collisions with unrelated modern players (2012-2026 rows, unrelated
  // clubs), not the 1994 legends; "Zinho", "Dunga", "Branco", "Marcio
  // Santos", "Mauro Silva" and "Romario" have zero rows at all (all retired
  // before the table's 2004+ coverage begins). Per the file's v1 constraint
  // (every blank candidate must be a real, verifiable row in
  // player_market_values), this lineup could not ship a single valid blank
  // and was dropped entirely rather than risk a factually wrong or
  // unguessable puzzle. Do not re-add 1990s World Cup content without first
  // re-running this same per-candidate SQL check.

  // 25. 2021 Euros Final (Euro 2020) - Italy 1-1 England (Italy won on pens)
  {
    id: 'euro-2021-final-italy',
    dateLabel: '2021 Euros Final',
    competition: 'UEFA European Championship',
    matchDate: '2021-07-11',
    team: 'Italy',
    opponent: 'England',
    scoreLine: 'Italy 1-1 England, AET (Italy won 3-2 on penalties)',
    venue: 'Wembley Stadium, London',
    formationLabel: '4-3-3',
    slots: [
      GK('Gianluigi Donnarumma'),
      { position: 'RB', name: 'Giovanni Di Lorenzo', x: 84, y: 70 },
      { position: 'CB', name: 'Leonardo Bonucci', x: 62, y: 74 },
      { position: 'CB', name: 'Giorgio Chiellini', x: 38, y: 74 },
      { position: 'LB', name: 'Emerson', x: 16, y: 70 },
      { position: 'CDM', name: 'Jorginho', x: 50, y: 58 },
      { position: 'CM', name: 'Nicolò Barella', x: 68, y: 50 },
      { position: 'CM', name: 'Marco Verratti', x: 32, y: 50 },
      { position: 'RW', name: 'Federico Chiesa', x: 80, y: 24 },
      { position: 'CF', name: 'Ciro Immobile', x: 50, y: 18 },
      { position: 'LW', name: 'Lorenzo Insigne', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Emerson', slotIndex: 4, nationality: 'Italy', clubAtTime: 'Chelsea' },
      { name: 'Giovanni Di Lorenzo', slotIndex: 1, nationality: 'Italy', clubAtTime: 'Napoli' },
      { name: 'Nicolò Barella', slotIndex: 6, nationality: 'Italy', clubAtTime: 'Inter Milan' },
    ],
    source: 'Wikipedia lineup diagram + Football Italia matchday XI + tactical analysis confirming Jorginho as sole pivot.',
  },

  // 26. 2024 Euros Final - Spain 2-1 England
  {
    id: 'euro-2024-final-spain',
    dateLabel: '2024 Euros Final',
    competition: 'UEFA European Championship',
    matchDate: '2024-07-14',
    team: 'Spain',
    opponent: 'England',
    scoreLine: 'Spain 2-1 England',
    venue: 'Olympiastadion, Berlin',
    formationLabel: '4-3-3',
    slots: [
      GK('Unai Simon'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Robin Le Normand', x: 62, y: 74 },
      { position: 'CB', name: 'Aymeric Laporte', x: 38, y: 74 },
      { position: 'LB', name: 'Marc Cucurella', x: 16, y: 70 },
      { position: 'CM', name: 'Rodri', x: 62, y: 54 },
      { position: 'CM', name: 'Fabián Ruiz', x: 38, y: 54 },
      { position: 'CM', name: 'Dani Olmo', x: 50, y: 38 },
      { position: 'RW', name: 'Lamine Yamal', x: 80, y: 24 },
      { position: 'ST', name: 'Alvaro Morata', x: 50, y: 16 },
      { position: 'LW', name: 'Nico Williams', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Robin Le Normand', slotIndex: 2, nationality: 'Spain', clubAtTime: 'Real Sociedad' },
      { name: 'Marc Cucurella', slotIndex: 4, nationality: 'Spain', clubAtTime: 'Chelsea' },
      { name: 'Fabián Ruiz', slotIndex: 6, nationality: 'Spain', clubAtTime: 'Paris Saint-Germain' },
    ],
    source: 'UEFA official tactical lineups PDF + Wikipedia + ESPN + Sky Sports, 5+ sources unanimous on names and numbers.',
  },

  // 27. 2010-11 Premier League: "El Clasico" 2018 substituted here is a separate entry below; this is the 2011-12 title decider.
  {
    id: 'epl-2012-title-city',
    dateLabel: '2011-12 Premier League Title Decider',
    competition: 'Premier League',
    matchDate: '2012-05-13',
    team: 'Manchester City',
    opponent: 'Queens Park Rangers',
    scoreLine: 'Manchester City 3-2 QPR',
    venue: 'Etihad Stadium, Manchester',
    formationLabel: '4-4-2',
    // Dzeko and Balotelli, both matchwinners in the famous injury-time comeback, were SUBSTITUTES, not starters - a well-documented trap.
    slots: [
      GK('Joe Hart'),
      { position: 'RB', name: 'Pablo Zabaleta', x: 84, y: 70 },
      { position: 'CB', name: 'Vincent Kompany', x: 62, y: 74 },
      { position: 'CB', name: 'Joleon Lescott', x: 38, y: 74 },
      { position: 'LB', name: 'Gaël Clichy', x: 16, y: 70 },
      { position: 'RM', name: 'Samir Nasri', x: 82, y: 48 },
      { position: 'CM', name: 'Yaya Toure', x: 60, y: 52 },
      { position: 'CM', name: 'Gareth Barry', x: 40, y: 52 },
      { position: 'LM', name: 'David Silva', x: 18, y: 48 },
      { position: 'CF', name: 'Carlos Tevez', x: 60, y: 18 },
      { position: 'ST', name: 'Sergio Aguero', x: 40, y: 18 },
    ],
    blankCandidates: [
      { name: 'Joleon Lescott', slotIndex: 3, nationality: 'England', clubAtTime: 'Manchester City' },
      { name: 'Samir Nasri', slotIndex: 5, nationality: 'France', clubAtTime: 'Manchester City' },
      { name: 'Gaël Clichy', slotIndex: 4, nationality: 'France', clubAtTime: 'Manchester City' },
    ],
    source: 'Wikipedia dedicated match article (position-coded table) + Sky Sports numbered lineup + Opta Analyst retrospective.',
  },

  // 28. 2015-16 Premier League: Leicester City's title-race-defining win at Man City
  {
    id: 'epl-2016-leicester',
    dateLabel: '2015-16 Premier League Title Run',
    competition: 'Premier League',
    matchDate: '2016-02-06',
    team: 'Leicester City',
    opponent: 'Manchester City',
    scoreLine: 'Manchester City 1-3 Leicester City',
    venue: 'Etihad Stadium, Manchester',
    formationLabel: '4-4-2',
    slots: [
      GK('Kasper Schmeichel'),
      { position: 'RB', name: 'Danny Simpson', x: 84, y: 70 },
      { position: 'CB', name: 'Wes Morgan', x: 62, y: 74 },
      { position: 'CB', name: 'Robert Huth', x: 38, y: 74 },
      { position: 'LB', name: 'Christian Fuchs', x: 16, y: 70 },
      { position: 'RM', name: 'Riyad Mahrez', x: 82, y: 48 },
      { position: 'CM', name: 'Danny Drinkwater', x: 60, y: 52 },
      { position: 'CM', name: 'N\'Golo Kante', x: 40, y: 52 },
      { position: 'LM', name: 'Marc Albrighton', x: 18, y: 48 },
      { position: 'ST', name: 'Jamie Vardy', x: 60, y: 18 },
      { position: 'ST', name: 'Shinji Okazaki', x: 40, y: 18 },
    ],
    blankCandidates: [
      { name: 'Christian Fuchs', slotIndex: 4, nationality: 'Austria', clubAtTime: 'Leicester City' },
      { name: 'Marc Albrighton', slotIndex: 8, nationality: 'England', clubAtTime: 'Leicester City' },
      { name: 'Danny Drinkwater', slotIndex: 6, nationality: 'England', clubAtTime: 'Leicester City' },
    ],
    source: 'Sky Sports match-centre lineup + ESPN match report narrative, both independently confirm every position.',
  },

  // 29. 2018-19 El Clasico - Barcelona 5-1 Real Madrid (Messi did NOT play, injured)
  {
    id: 'laliga-2018-clasico-barca',
    dateLabel: '2018 El Clasico',
    competition: 'La Liga',
    matchDate: '2018-10-28',
    team: 'Barcelona',
    opponent: 'Real Madrid',
    scoreLine: 'Barcelona 5-1 Real Madrid',
    venue: 'Camp Nou, Barcelona',
    formationLabel: '4-3-3',
    // Messi was injured (fractured radial bone the week before) and did not even make the bench - the first Clasico since 2007 without Messi or Ronaldo.
    slots: [
      GK('Marc-Andre ter Stegen'),
      { position: 'RB', name: 'Sergi Roberto', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Clément Lenglet', x: 38, y: 74 },
      { position: 'LB', name: 'Jordi Alba', x: 16, y: 70 },
      { position: 'CM', name: 'Sergio Busquets', x: 62, y: 54 },
      { position: 'CM', name: 'Ivan Rakitic', x: 38, y: 54 },
      { position: 'CM', name: 'Arthur Melo', x: 50, y: 38 },
      { position: 'RW', name: 'Rafinha', x: 80, y: 24 },
      { position: 'ST', name: 'Luis Suarez', x: 50, y: 16 },
      { position: 'LW', name: 'Philippe Coutinho', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Clément Lenglet', slotIndex: 3, nationality: 'France', clubAtTime: 'Barcelona' },
      { name: 'Arthur Melo', slotIndex: 7, nationality: 'Brazil', clubAtTime: 'Barcelona' },
      { name: 'Sergi Roberto', slotIndex: 1, nationality: 'Spain', clubAtTime: 'Barcelona' },
    ],
    source: '6 independent sources agree (Football Espana, FC Barcelona official match database, ESPN, Managing Madrid, Sky Sports).',
  },

  // 30. 2016-17 Premier League: Conte's first back-three start, launching Chelsea's 13-match run
  {
    id: 'epl-2016-chelsea-backthree',
    dateLabel: '2016-17 Premier League Title Run',
    competition: 'Premier League',
    matchDate: '2016-10-01',
    team: 'Chelsea',
    opponent: 'Hull City',
    scoreLine: 'Hull City 0-2 Chelsea',
    venue: 'KCOM Stadium, Hull',
    formationLabel: '3-4-3',
    slots: [
      GK('Thibaut Courtois'),
      { position: 'CB', name: 'Cesar Azpilicueta', x: 68, y: 76 },
      { position: 'CB', name: 'David Luiz', x: 50, y: 78 },
      { position: 'CB', name: 'Gary Cahill', x: 32, y: 76 },
      { position: 'RWB', name: 'Victor Moses', x: 86, y: 52 },
      { position: 'CM', name: 'N\'Golo Kante', x: 62, y: 56 },
      { position: 'CM', name: 'Nemanja Matić', x: 38, y: 56 },
      { position: 'LWB', name: 'Marcos Alonso', x: 14, y: 52 },
      { position: 'RW', name: 'Willian', x: 68, y: 26 },
      { position: 'LW', name: 'Eden Hazard', x: 32, y: 26 },
      { position: 'ST', name: 'Diego Costa', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Victor Moses', slotIndex: 4, nationality: 'Nigeria', clubAtTime: 'Chelsea' },
      { name: 'Marcos Alonso', slotIndex: 7, nationality: 'Spain', clubAtTime: 'Chelsea' },
      { name: 'Nemanja Matić', slotIndex: 6, nationality: 'Serbia', clubAtTime: 'Chelsea' },
    ],
    source: 'ESPN match centre + Sky Sports lineups + Chelsea Supporters Group match summary, all agree.',
  },

  // 31. 2003-04 Arsenal Invincibles - title-clinching north London derby
  {
    id: 'epl-2004-arsenal-invincibles',
    dateLabel: '2003-04 Arsenal Invincibles',
    competition: 'Premier League',
    matchDate: '2004-04-25',
    team: 'Arsenal',
    opponent: 'Tottenham Hotspur',
    scoreLine: 'Tottenham Hotspur 2-2 Arsenal (title clinched)',
    venue: 'White Hart Lane, London',
    formationLabel: '4-4-2',
    // Ray Parlour (not Freddie Ljungberg, who was not even in the squad) played right midfield this match - verified via Arsenal's own retrospective.
    slots: [
      GK('Jens Lehmann'),
      { position: 'RB', name: 'Lauren', x: 84, y: 70 },
      { position: 'CB', name: 'Kolo Touré', x: 62, y: 74 },
      { position: 'CB', name: 'Sol Campbell', x: 38, y: 74 },
      { position: 'LB', name: 'Ashley Cole', x: 16, y: 70 },
      { position: 'RM', name: 'Ray Parlour', x: 82, y: 48 },
      { position: 'CM', name: 'Gilberto Silva', x: 60, y: 52 },
      { position: 'CM', name: 'Patrick Vieira', x: 40, y: 52 },
      { position: 'LM', name: 'Robert Pires', x: 18, y: 48 },
      { position: 'ST', name: 'Dennis Bergkamp', x: 60, y: 18 },
      { position: 'ST', name: 'Thierry Henry', x: 40, y: 18 },
    ],
    blankCandidates: [
      { name: 'Kolo Touré', slotIndex: 2, nationality: "Cote d'Ivoire", clubAtTime: 'Arsenal' },
      { name: 'Ray Parlour', slotIndex: 5, nationality: 'England', clubAtTime: 'Arsenal' },
      { name: 'Gilberto Silva', slotIndex: 6, nationality: 'Brazil', clubAtTime: 'Arsenal' },
    ],
    source: '11v11.com + Transfermarkt + Arsenal.com official retrospective + Sky Sports lineup archive, unanimous.',
  },

  // 32. 1999 Champions League Final - Manchester United 2-1 Bayern Munich (Camp Nou comeback)
  {
    id: 'cl-1999-final-manutd',
    dateLabel: '1999 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '1999-05-26',
    team: 'Manchester United',
    opponent: 'Bayern Munich',
    scoreLine: 'Manchester United 2-1 Bayern Munich',
    venue: 'Camp Nou, Barcelona',
    formationLabel: '4-4-2',
    // Keane and Scholes were both suspended; Giggs played right midfield with Blomqvist on the left, in an XI reshuffled specifically for their absence.
    slots: [
      GK('Peter Schmeichel'),
      { position: 'RB', name: 'Gary Neville', x: 84, y: 70 },
      { position: 'CB', name: 'Jaap Stam', x: 62, y: 74 },
      { position: 'CB', name: 'Ronny Johnsen', x: 38, y: 74 },
      { position: 'LB', name: 'Denis Irwin', x: 16, y: 70 },
      { position: 'RM', name: 'Ryan Giggs', x: 82, y: 48 },
      { position: 'CM', name: 'Nicky Butt', x: 60, y: 52 },
      { position: 'CM', name: 'David Beckham', x: 40, y: 52 },
      { position: 'LM', name: 'Jesper Blomqvist', x: 18, y: 48 },
      { position: 'ST', name: 'Andy Cole', x: 60, y: 18 },
      { position: 'ST', name: 'Dwight Yorke', x: 40, y: 18 },
    ],
    // Ronny Johnsen and Jesper Blomqvist have zero rows in player_market_values
    // (verified via SQL 2026-07-03; both retired before the table's 2004+
    // coverage begins), so neither is usable as a blank candidate despite
    // starting this match. They remain shown correctly on the pitch;
    // confirmed rows (Neville, Stam, Giggs) are used as blank candidates.
    blankCandidates: [
      { name: 'Gary Neville', slotIndex: 1, nationality: 'England', clubAtTime: 'Manchester United' },
      { name: 'Jaap Stam', slotIndex: 2, nationality: 'Netherlands', clubAtTime: 'Manchester United' },
      { name: 'Ryan Giggs', slotIndex: 5, nationality: 'Wales', clubAtTime: 'Manchester United' },
    ],
    source: 'Wikipedia dedicated match article + mufcinfo.com archival grid + manutd.com official retrospective, unanimous.',
  },

  // 33. 2019-20 Champions League Quarterfinal - Barcelona 2-8 Bayern Munich
  {
    id: 'cl-2020-qf-bayern',
    dateLabel: '2019-20 Champions League Quarterfinal',
    competition: 'UEFA Champions League',
    matchDate: '2020-08-14',
    team: 'Bayern Munich',
    opponent: 'Barcelona',
    scoreLine: 'Barcelona 2-8 Bayern Munich',
    venue: 'Estadio da Luz, Lisbon',
    formationLabel: '4-2-3-1',
    // Kimmich played RB, not CM; Perisic (not Coman) started on the left and scored.
    slots: [
      GK('Manuel Neuer'),
      { position: 'RB', name: 'Joshua Kimmich', x: 84, y: 70 },
      { position: 'CB', name: 'Jerome Boateng', x: 62, y: 74 },
      { position: 'CB', name: 'David Alaba', x: 38, y: 74 },
      { position: 'LB', name: 'Alphonso Davies', x: 16, y: 70 },
      { position: 'CDM', name: 'Leon Goretzka', x: 62, y: 56 },
      { position: 'CDM', name: 'Thiago Alcántara', x: 38, y: 56 },
      { position: 'RW', name: 'Serge Gnabry', x: 80, y: 34 },
      { position: 'CAM', name: 'Thomas Muller', x: 50, y: 34 },
      { position: 'LW', name: 'Ivan Perišić', x: 20, y: 34 },
      { position: 'ST', name: 'Robert Lewandowski', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Ivan Perišić', slotIndex: 9, nationality: 'Croatia', clubAtTime: 'Bayern Munich (loan)' },
      { name: 'Alphonso Davies', slotIndex: 4, nationality: 'Canada', clubAtTime: 'Bayern Munich' },
      { name: 'Thiago Alcántara', slotIndex: 6, nationality: 'Spain', clubAtTime: 'Bayern Munich' },
    ],
    source: 'worldfootball.net formation grid + Sports Mole lineup table + Wikipedia (citing UEFA official tactical PDF), unanimous.',
  },

  // 34. 2012-13 Champions League Final - Bayern Munich 2-1 Borussia Dortmund
  {
    id: 'cl-2013-final-bayern',
    dateLabel: '2013 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2013-05-25',
    team: 'Bayern Munich',
    opponent: 'Borussia Dortmund',
    scoreLine: 'Bayern Munich 2-1 Borussia Dortmund',
    venue: 'Wembley Stadium, London',
    formationLabel: '4-2-3-1',
    slots: [
      GK('Manuel Neuer'),
      { position: 'RB', name: 'Philipp Lahm', x: 84, y: 70 },
      { position: 'CB', name: 'Jerome Boateng', x: 62, y: 74 },
      { position: 'CB', name: 'Dante', x: 38, y: 74 },
      { position: 'LB', name: 'David Alaba', x: 16, y: 70 },
      { position: 'CDM', name: 'Bastian Schweinsteiger', x: 62, y: 56 },
      { position: 'CDM', name: 'Javi Martinez', x: 38, y: 56 },
      { position: 'LW', name: 'Franck Ribery', x: 20, y: 34 },
      { position: 'CAM', name: 'Thomas Muller', x: 50, y: 34 },
      { position: 'RW', name: 'Arjen Robben', x: 80, y: 34 },
      { position: 'ST', name: 'Mario Mandžukić', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Dante', slotIndex: 3, nationality: 'Brazil', clubAtTime: 'Bayern Munich' },
      { name: 'Mario Mandžukić', slotIndex: 10, nationality: 'Croatia', clubAtTime: 'Bayern Munich' },
      { name: 'Jerome Boateng', slotIndex: 2, nationality: 'Germany', clubAtTime: 'Bayern Munich' },
    ],
    source: 'Wikipedia + Sky Sports + ESPN + UEFA.com + fcbayern.com, all agree with no disagreement.',
  },

  // 35. 2013-14 Premier League - Liverpool 5-1 Arsenal
  {
    id: 'epl-2014-liverpool-arsenal',
    dateLabel: '2013-14 Premier League',
    competition: 'Premier League',
    matchDate: '2014-02-08',
    team: 'Liverpool',
    opponent: 'Arsenal',
    scoreLine: 'Liverpool 5-1 Arsenal',
    venue: 'Anfield, Liverpool',
    formationLabel: '4-2-3-1',
    slots: [
      GK('Simon Mignolet'),
      { position: 'RB', name: 'Jon Flanagan', x: 84, y: 70 },
      { position: 'CB', name: 'Martin Skrtel', x: 62, y: 74 },
      { position: 'CB', name: 'Kolo Touré', x: 38, y: 74 },
      { position: 'LB', name: 'Aly Cissokho', x: 16, y: 70 },
      { position: 'CDM', name: 'Steven Gerrard', x: 62, y: 58 },
      { position: 'CM', name: 'Jordan Henderson', x: 38, y: 58 },
      { position: 'CAM', name: 'Philippe Coutinho', x: 50, y: 40 },
      { position: 'RW', name: 'Luis Suarez', x: 80, y: 26 },
      { position: 'LW', name: 'Raheem Sterling', x: 20, y: 26 },
      { position: 'ST', name: 'Daniel Sturridge', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Jon Flanagan', slotIndex: 1, nationality: 'England', clubAtTime: 'Liverpool' },
      { name: 'Aly Cissokho', slotIndex: 4, nationality: 'France', clubAtTime: 'Liverpool' },
      { name: 'Martin Skrtel', slotIndex: 2, nationality: 'Slovakia', clubAtTime: 'Liverpool' },
    ],
    source: 'lfchistory.net official match archive + BBC/Arsenal.com match report excerpts. Formation is 4-2-3-1 per match-specific archive.',
  },

  // 36. 2010 World Cup Group Stage - Switzerland 1-0 Spain (shock upset)
  {
    id: 'wc-2010-group-spain',
    dateLabel: '2010 World Cup Group Stage',
    competition: 'FIFA World Cup',
    matchDate: '2010-06-16',
    team: 'Spain',
    opponent: 'Switzerland',
    scoreLine: 'Switzerland 1-0 Spain',
    venue: 'Moses Mabhida Stadium, Durban',
    formationLabel: '4-2-3-1',
    slots: [
      GK('Iker Casillas'),
      { position: 'RB', name: 'Sergio Ramos', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Carles Puyol', x: 38, y: 74 },
      { position: 'LB', name: 'Joan Capdevila', x: 16, y: 70 },
      { position: 'CDM', name: 'Xabi Alonso', x: 62, y: 58 },
      { position: 'CDM', name: 'Sergio Busquets', x: 38, y: 58 },
      { position: 'CAM', name: 'Xavi', x: 50, y: 40 },
      { position: 'RW', name: 'David Silva', x: 80, y: 26 },
      { position: 'LW', name: 'Andres Iniesta', x: 20, y: 26 },
      { position: 'CF', name: 'David Villa', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'David Silva', slotIndex: 8, nationality: 'Spain', clubAtTime: 'Valencia' },
      { name: 'Joan Capdevila', slotIndex: 4, nationality: 'Spain', clubAtTime: 'Villarreal' },
      { name: 'Xabi Alonso', slotIndex: 5, nationality: 'Spain', clubAtTime: 'Real Madrid' },
    ],
    source: 'FIFA.com + Sky Sports + ESPN + footballcritic.com + national-football-teams.com, unanimous.',
  },

  // 37. 2015-16 Champions League Final - Real Madrid 1-1 Atletico Madrid (Real Madrid won on pens)
  {
    id: 'cl-2016-final-real',
    dateLabel: '2016 Champions League Final',
    competition: 'UEFA Champions League',
    matchDate: '2016-05-28',
    team: 'Real Madrid',
    opponent: 'Atletico Madrid',
    scoreLine: 'Real Madrid 1-1 Atletico Madrid, AET (Real Madrid won 5-3 on penalties)',
    venue: 'San Siro, Milan',
    formationLabel: '4-3-3',
    slots: [
      GK('Keylor Navas'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Pepe', x: 62, y: 74 },
      { position: 'CB', name: 'Sergio Ramos', x: 38, y: 74 },
      { position: 'LB', name: 'Marcelo', x: 16, y: 70 },
      { position: 'CDM', name: 'Casemiro', x: 50, y: 58 },
      { position: 'CM', name: 'Toni Kroos', x: 68, y: 50 },
      { position: 'CM', name: 'Luka Modric', x: 32, y: 50 },
      { position: 'RW', name: 'Gareth Bale', x: 80, y: 24 },
      { position: 'CF', name: 'Karim Benzema', x: 50, y: 18 },
      { position: 'LW', name: 'Cristiano Ronaldo', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Pepe', slotIndex: 2, nationality: 'Portugal', clubAtTime: 'Real Madrid' },
      { name: 'Casemiro', slotIndex: 5, nationality: 'Brazil', clubAtTime: 'Real Madrid' },
      { name: 'Daniel Carvajal', slotIndex: 1, nationality: 'Spain', clubAtTime: 'Real Madrid' },
    ],
    source: 'Sky Sports + Managing Madrid + ESPN + UEFA.com + Transfermarkt, agree Carvajal (not Danilo) and Pepe (not Varane) started.',
  },

  // 38. 2018 World Cup Round of 16 - England 1-1 Colombia (England won on pens)
  {
    id: 'wc-2018-r16-england',
    dateLabel: '2018 World Cup Round of 16',
    competition: 'FIFA World Cup',
    matchDate: '2018-07-03',
    team: 'England',
    opponent: 'Colombia',
    scoreLine: 'England 1-1 Colombia, AET (England won 4-3 on penalties)',
    venue: 'Spartak Stadium, Moscow',
    formationLabel: '3-5-2',
    slots: [
      GK('Jordan Pickford'),
      { position: 'CB', name: 'Kyle Walker', x: 68, y: 76 },
      { position: 'CB', name: 'John Stones', x: 50, y: 78 },
      { position: 'CB', name: 'Harry Maguire', x: 32, y: 76 },
      { position: 'RWB', name: 'Kieran Trippier', x: 86, y: 52 },
      { position: 'CM', name: 'Jordan Henderson', x: 62, y: 56 },
      { position: 'CM', name: 'Jesse Lingard', x: 38, y: 56 },
      { position: 'CAM', name: 'Dele Alli', x: 50, y: 38 },
      { position: 'LWB', name: 'Ashley Young', x: 14, y: 52 },
      { position: 'ST', name: 'Harry Kane', x: 60, y: 16 },
      { position: 'ST', name: 'Raheem Sterling', x: 40, y: 16 },
    ],
    blankCandidates: [
      { name: 'Jesse Lingard', slotIndex: 6, nationality: 'England', clubAtTime: 'Manchester United' },
      { name: 'Kieran Trippier', slotIndex: 4, nationality: 'England', clubAtTime: 'Tottenham Hotspur' },
      { name: 'Dele Alli', slotIndex: 7, nationality: 'England', clubAtTime: 'Tottenham Hotspur' },
    ],
    source: 'Sky Sports + Eurosport + tactical analysis, confirms Walker at right of the back three, Maguire left, Young at LWB.',
  },

  // 39. 2021-22 Champions League Semifinal 2nd Leg - Real Madrid 3-1 Manchester City
  {
    id: 'cl-2022-semi-real',
    dateLabel: '2021-22 Champions League Semifinal',
    competition: 'UEFA Champions League',
    matchDate: '2022-05-04',
    team: 'Real Madrid',
    opponent: 'Manchester City',
    scoreLine: 'Real Madrid 3-1 Manchester City, AET (Real Madrid win 6-5 on aggregate)',
    venue: 'Santiago Bernabeu, Madrid',
    formationLabel: '4-2-3-1',
    // Rodrygo did NOT start (68th-min sub who scored both famous late goals); Valverde (not Rodrygo) started on the right; David Alaba did NOT start (Nacho partnered Militao).
    slots: [
      GK('Thibaut Courtois'),
      { position: 'RB', name: 'Daniel Carvajal', x: 84, y: 70 },
      { position: 'CB', name: 'Eder Militao', x: 62, y: 74 },
      { position: 'CB', name: 'Nacho', x: 38, y: 74 },
      { position: 'LB', name: 'Ferland Mendy', x: 16, y: 70 },
      { position: 'CDM', name: 'Casemiro', x: 50, y: 58 },
      { position: 'CM', name: 'Toni Kroos', x: 68, y: 50 },
      { position: 'CAM', name: 'Luka Modric', x: 50, y: 36 },
      { position: 'RW', name: 'Federico Valverde', x: 80, y: 24 },
      { position: 'LW', name: 'Vinicius Junior', x: 20, y: 24 },
      { position: 'ST', name: 'Karim Benzema', x: 50, y: 16 },
    ],
    blankCandidates: [
      { name: 'Nacho', slotIndex: 3, nationality: 'Spain', clubAtTime: 'Real Madrid' },
      { name: 'Federico Valverde', slotIndex: 8, nationality: 'Uruguay', clubAtTime: 'Real Madrid' },
      { name: 'Eder Militao', slotIndex: 2, nationality: 'Brazil', clubAtTime: 'Real Madrid' },
    ],
    source: 'ESPN Gamecast + Footballcritic.com + Managing Madrid pre-match confirmed-lineups article, all agree.',
  },

  // 40. 2010-11 Barcelona 5-0 Real Madrid ("La Manita")
  {
    id: 'laliga-2010-manita-barca',
    dateLabel: '2010 El Clasico ("La Manita")',
    competition: 'La Liga',
    matchDate: '2010-11-29',
    team: 'Barcelona',
    opponent: 'Real Madrid',
    scoreLine: 'Barcelona 5-0 Real Madrid',
    venue: 'Camp Nou, Barcelona',
    formationLabel: '4-3-3',
    // Mascherano and Keita were substitutes, not starters, this match.
    slots: [
      GK('Victor Valdes'),
      { position: 'RB', name: 'Dani Alves', x: 84, y: 70 },
      { position: 'CB', name: 'Gerard Pique', x: 62, y: 74 },
      { position: 'CB', name: 'Carles Puyol', x: 38, y: 74 },
      { position: 'LB', name: 'Eric Abidal', x: 16, y: 70 },
      { position: 'CM', name: 'Sergio Busquets', x: 62, y: 54 },
      { position: 'CM', name: 'Xavi', x: 38, y: 54 },
      { position: 'CM', name: 'Andres Iniesta', x: 50, y: 38 },
      { position: 'RW', name: 'Pedro', x: 80, y: 24 },
      { position: 'CF', name: 'Lionel Messi', x: 50, y: 16 },
      { position: 'LW', name: 'David Villa', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Eric Abidal', slotIndex: 4, nationality: 'France', clubAtTime: 'Barcelona' },
      { name: 'Pedro', slotIndex: 8, nationality: 'Spain', clubAtTime: 'Barcelona' },
      { name: 'Dani Alves', slotIndex: 1, nationality: 'Brazil', clubAtTime: 'Barcelona' },
    ],
    source: 'Sky Sports + ESPN + Transfermarkt/footballcritic (labeled 4-3-3 Attacking), all agreeing; confirms Mascherano/Keita as subs.',
  },

  // 41. 2007-08 Premier League Title Decider - Wigan Athletic 0-2 Manchester United
  {
    id: 'epl-2008-manutd-title',
    dateLabel: '2007-08 Premier League Title Decider',
    competition: 'Premier League',
    matchDate: '2008-05-11',
    team: 'Manchester United',
    opponent: 'Wigan Athletic',
    scoreLine: 'Wigan Athletic 0-2 Manchester United (title clinched)',
    venue: 'JJB Stadium, Wigan',
    formationLabel: '4-4-2',
    // Ryan Giggs did NOT start (68th-min sub who scored the 2nd goal) - Park Ji-sung started on the right instead, a well-documented trap.
    slots: [
      GK('Edwin van der Sar'),
      { position: 'RB', name: 'Wes Brown', x: 84, y: 70 },
      { position: 'CB', name: 'Rio Ferdinand', x: 62, y: 74 },
      { position: 'CB', name: 'Nemanja Vidic', x: 38, y: 74 },
      { position: 'LB', name: 'Patrice Evra', x: 16, y: 70 },
      { position: 'RM', name: 'Park Ji-sung', x: 82, y: 48 },
      { position: 'CM', name: 'Michael Carrick', x: 60, y: 52 },
      { position: 'CM', name: 'Paul Scholes', x: 40, y: 52 },
      { position: 'LM', name: 'Cristiano Ronaldo', x: 18, y: 48 },
      { position: 'ST', name: 'Wayne Rooney', x: 60, y: 18 },
      { position: 'ST', name: 'Carlos Tevez', x: 40, y: 18 },
    ],
    // Note: Carlos Tevez has zero rows in player_market_values (verified via
    // SQL 2026-07-03), so he is not usable as a blank candidate despite being
    // a starter in this match. He remains shown correctly on the pitch;
    // Rooney (a confirmed row) is used as a blank candidate instead.
    blankCandidates: [
      { name: 'Wes Brown', slotIndex: 1, nationality: 'England', clubAtTime: 'Manchester United' },
      { name: 'Nemanja Vidic', slotIndex: 3, nationality: 'Serbia', clubAtTime: 'Manchester United' },
      { name: 'Wayne Rooney', slotIndex: 9, nationality: 'England', clubAtTime: 'Manchester United' },
    ],
    source: 'Wikipedia match log + Sky Sports lineup page + ESPN gamecast, confirms Giggs as a sub, not a starter.',
  },

  // 42. 2021-22 Premier League Title Decider - Manchester City 3-2 Aston Villa (0-2 down comeback)
  {
    id: 'epl-2022-city-title',
    dateLabel: '2021-22 Premier League Title Decider',
    competition: 'Premier League',
    matchDate: '2022-05-22',
    team: 'Manchester City',
    opponent: 'Aston Villa',
    scoreLine: 'Manchester City 3-2 Aston Villa (title clinched)',
    venue: 'Etihad Stadium, Manchester',
    formationLabel: '4-3-3',
    // Gundogan (both goals) and Sterling were substitutes, not starters, in the famous comeback.
    slots: [
      GK('Ederson'),
      { position: 'RB', name: 'John Stones', x: 84, y: 70 },
      { position: 'CB', name: 'Aymeric Laporte', x: 62, y: 74 },
      { position: 'CB', name: 'Fernandinho', x: 38, y: 74 },
      { position: 'LB', name: 'João Cancelo', x: 16, y: 70 },
      { position: 'CDM', name: 'Rodri', x: 50, y: 58 },
      { position: 'CM', name: 'Kevin De Bruyne', x: 68, y: 50 },
      { position: 'CM', name: 'Bernardo Silva', x: 32, y: 50 },
      { position: 'RW', name: 'Riyad Mahrez', x: 80, y: 24 },
      { position: 'CF', name: 'Gabriel Jesus', x: 50, y: 18 },
      { position: 'LW', name: 'Phil Foden', x: 20, y: 24 },
    ],
    blankCandidates: [
      { name: 'Fernandinho', slotIndex: 3, nationality: 'Brazil', clubAtTime: 'Manchester City' },
      { name: 'João Cancelo', slotIndex: 4, nationality: 'Portugal', clubAtTime: 'Manchester City' },
      { name: 'Phil Foden', slotIndex: 9, nationality: 'England', clubAtTime: 'Manchester City' },
    ],
    source: 'Man City official site + Sky Sports + ESPN + Sports Mole + Coaches Voice, all agree.',
  },
];

// ---------------------------------------------------------------------------
// Daily / Unlimited puzzle selection
// ---------------------------------------------------------------------------

/** Deterministic PRNG (Fisher-Yates driver), same algorithm as rarityRound.ts so both games' daily seeding behaves identically. */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Picks today's lineup and which of its blankCandidates is blanked,
 * date-seeded (America/New_York) so every player gets the same puzzle on the
 * same ET date, matching the sitewide daily-reset convention.
 */
export function pickDailyPuzzle(lineups: Lineup[] = LINEUPS): ActivePuzzle {
  const seed = dateSeed(getTodayET());
  const rand = seededRandom(seed);
  const lineupIndex = Math.floor(rand() * lineups.length);
  const lineup = lineups[lineupIndex];
  // Draw again so the candidate pick isn't perfectly correlated with the
  // lineup pick (two independent calls to the same seeded stream).
  const candidateIndex = Math.floor(rand() * lineup.blankCandidates.length);
  return { lineup, candidate: lineup.blankCandidates[candidateIndex] };
}

/** Picks a random lineup + blank for Unlimited free-play mode. */
export function pickUnlimitedPuzzle(lineups: Lineup[] = LINEUPS): ActivePuzzle {
  const lineup = lineups[Math.floor(Math.random() * lineups.length)];
  const candidate = lineup.blankCandidates[Math.floor(Math.random() * lineup.blankCandidates.length)];
  return { lineup, candidate };
}

// ---------------------------------------------------------------------------
// Guessing + hints
// ---------------------------------------------------------------------------

export const MAX_GUESSES = 3;
export const SCORE_BY_GUESS: Record<number, number> = { 1: 100, 2: 70, 3: 40 };

/** True if `guessName` matches this round's candidate, accent/case-insensitive via the shared normalizeName pipeline. */
export function isCorrectGuess(guessName: string, candidate: BlankCandidate): boolean {
  return normalizeName(guessName) === normalizeName(candidate.name);
}

/**
 * Returns the hint text unlocked at a given guess count (0 = no wrong
 * guesses yet, shows nothing extra). Escalates: 1st wrong guess reveals
 * nationality, 2nd reveals the club at the time of the match, 3rd (which also
 * ends the round on a miss) reveals the first letter of the surname.
 */
export function hintForLevel(level: HintLevel, candidate: BlankCandidate): string | null {
  if (level <= 0) return null;
  if (level === 1) return `Nationality: ${candidate.nationality}`;
  if (level === 2) return `Club at the time: ${candidate.clubAtTime}`;
  const words = candidate.name.trim().split(/\s+/);
  const surname = words[words.length - 1];
  return `First letter of surname: ${surname.charAt(0).toUpperCase()}`;
}

/** Score for a correct guess made on `guessNumber` (1-indexed). Returns 0 if guessNumber exceeds MAX_GUESSES. */
export function scoreForGuess(guessNumber: number): number {
  return SCORE_BY_GUESS[guessNumber] ?? 0;
}

// ---------------------------------------------------------------------------
// Share card
// ---------------------------------------------------------------------------

/** Builds the emoji-grid share block, R5 spec 3.6 convention (a styled block, never a bare one-liner). */
export function buildEmojiGrid(guessCount: number, won: boolean, lineup: Lineup): string {
  const boxes = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (won && i === guessCount - 1) return '🟩';
    if (i < guessCount - (won ? 1 : 0)) return '🟥';
    return '⬜';
  }).join('');
  const resultLine = won ? `Solved in ${guessCount}/${MAX_GUESSES}` : 'Missed it';
  return [`Missing XI: ${lineup.dateLabel}`, boxes, resultLine].join('\n');
}

/** Returns the exported PlayerAutocomplete source config, scoped to the full soccer pool (validation is enforced separately against blankCandidates, same pattern rarityRound.ts uses for its elite-100m category). */
export { SOCCER_MARKET_VALUE_SOURCE };
export { displayName };
