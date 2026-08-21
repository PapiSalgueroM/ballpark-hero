import { foldSpecialLatin } from '@/lib/nameFold';
import { dailyIndex, dateSeed, getTodayET } from '@/lib/dateUtils';

/**
 * Missing Five (task #39, the NBA port of Missing XI): a famous real NBA
 * starting five is shown with ONE player blanked out. 3 guesses, hint ladder,
 * 100/70/40 scoring, same mechanic as /missing-xi.
 *
 * CONTENT VERIFICATION METHOD (same discipline as src/lib/missingXi.ts):
 * Every lineup below was verified on 2026-07-22 against the
 * basketball-reference.com box score for that exact game (the "Starters"
 * table is the official record of who started) and cross-checked against a
 * second source (the Wikipedia article for the game, whose box-score row
 * order matched bref exactly for both 1998 tables). The traps here are the
 * whole point and were double-confirmed:
 *   - 2016 G7 Warriors: Festus EZELI started at center (Bogut was injured);
 *     everyone misremembers Bogut or Varejao.
 *   - 1998 G6 Bulls: Toni KUKOC started, Dennis Rodman came off the bench
 *     that night. Verified vs bref Starters table AND the Wikipedia box
 *     (Rodman's 38:59 line sits in the reserves block in both).
 *   - 1998 G6 Jazz: Adam KEEFE started at center in the biggest game of the
 *     Stockton-Malone era.
 * Do NOT "fix" these back to the famous-but-wrong names.
 *
 * Guess checking is LOCAL (normalized compare against this lineup's
 * blankCandidates), no database dependency, so 90s role players who are
 * absent from nba_player_stats are still guessable. Suggestions come from
 * the union of all names in this file.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FivePosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface FiveSlot {
  position: FivePosition;
  /** Player's real name as billed at the time. */
  name: string;
  /** Court x/y percentages for the half-court render (y grows toward the baseline/basket at the top). */
  x: number;
  y: number;
}

export interface FiveBlankCandidate {
  name: string;
  /** Index into Lineup.slots. */
  slotIndex: number;
  nationality: string;
  /** One-line VERIFIED flavor fact shown on reveal (never invented by the UI). */
  fact?: string;
}

export interface FiveLineup {
  id: string;
  dateLabel: string;
  competition: string;
  matchDate: string;
  team: string;
  opponent: string;
  scoreLine: string;
  venue: string;
  slots: FiveSlot[];
  blankCandidates: FiveBlankCandidate[];
  /** INTERNAL editor note on what was checked. Never rendered. */
  source: string;
}

export interface ActiveFivePuzzle {
  lineup: FiveLineup;
  candidate: FiveBlankCandidate;
}

export type FiveHintLevel = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Court coordinates (half court, basket at top): guards high, bigs low.
// ---------------------------------------------------------------------------
const PG = (name: string): FiveSlot => ({ position: 'PG', name, x: 50, y: 80 });
const SG = (name: string): FiveSlot => ({ position: 'SG', name, x: 80, y: 62 });
const SF = (name: string): FiveSlot => ({ position: 'SF', name, x: 20, y: 62 });
const PF = (name: string): FiveSlot => ({ position: 'PF', name, x: 70, y: 30 });
const C  = (name: string): FiveSlot => ({ position: 'C',  name, x: 30, y: 26 });

export const FIVE_LINEUPS: FiveLineup[] = [
  // 1. 2016 NBA Finals Game 7, Cleveland Cavaliers (completed the 3-1 comeback)
  {
    id: 'finals-2016-g7-cle',
    dateLabel: '2016 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2016-06-19',
    team: 'Cleveland Cavaliers',
    opponent: 'Golden State Warriors',
    scoreLine: 'Cavaliers 93-89 Warriors',
    venue: 'Oracle Arena, Oakland',
    slots: [
      PG('Kyrie Irving'),
      SG('J.R. Smith'),
      SF('LeBron James'),
      PF('Kevin Love'),
      C('Tristan Thompson'),
    ],
    blankCandidates: [
      { name: 'J.R. Smith', slotIndex: 1, nationality: 'USA' },
      { name: 'Kevin Love', slotIndex: 3, nationality: 'USA', fact: 'Grabbed 14 rebounds and made the famous final defensive stand on Stephen Curry.' },
      { name: 'Tristan Thompson', slotIndex: 4, nationality: 'Canada' },
    ],
    source: 'basketball-reference box score 201606190GSW (Starters table), Irving/Smith/James/Thompson/Love confirmed.',
  },

  // 2. 2016 NBA Finals Game 7, Golden State Warriors (the Ezeli trap)
  {
    id: 'finals-2016-g7-gsw',
    dateLabel: '2016 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2016-06-19',
    team: 'Golden State Warriors',
    opponent: 'Cleveland Cavaliers',
    scoreLine: 'Cavaliers 93-89 Warriors',
    venue: 'Oracle Arena, Oakland',
    // Trap: Festus Ezeli started at center (Andrew Bogut was out injured).
    slots: [
      PG('Stephen Curry'),
      SG('Klay Thompson'),
      SF('Harrison Barnes'),
      PF('Draymond Green'),
      C('Festus Ezeli'),
    ],
    blankCandidates: [
      { name: 'Festus Ezeli', slotIndex: 4, nationality: 'Nigeria', fact: 'Started at center with Andrew Bogut out injured, the answer almost nobody remembers.' },
      { name: 'Harrison Barnes', slotIndex: 2, nationality: 'USA' },
      { name: 'Draymond Green', slotIndex: 3, nationality: 'USA', fact: 'Scored 32 with 15 rebounds and 9 assists in the losing effort.' },
    ],
    source: 'basketball-reference box score 201606190GSW (Starters table), Curry/Thompson/Barnes/Green/Ezeli confirmed; Ezeli 10:45 MP as starter.',
  },

  // 3. 1998 NBA Finals Game 6, Chicago Bulls ("The Last Shot"; the Kukoc trap)
  {
    id: 'finals-1998-g6-chi',
    dateLabel: '1998 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '1998-06-14',
    team: 'Chicago Bulls',
    opponent: 'Utah Jazz',
    scoreLine: 'Bulls 87-86 Jazz',
    venue: 'Delta Center, Salt Lake City',
    // Trap: Kukoc started; Dennis Rodman came off the bench in this game.
    slots: [
      PG('Ron Harper'),
      SG('Michael Jordan'),
      SF('Scottie Pippen'),
      PF('Toni Kukoc'),
      C('Luc Longley'),
    ],
    blankCandidates: [
      { name: 'Toni Kukoc', slotIndex: 3, nationality: 'Croatia', fact: 'Started with Rodman on the bench that night and scored 15, second only to Jordan\'s 45.' },
      { name: 'Ron Harper', slotIndex: 0, nationality: 'USA' },
      { name: 'Luc Longley', slotIndex: 4, nationality: 'Australia' },
    ],
    source: 'basketball-reference box score 199806140UTA (Starters table) + Wikipedia "Game 6 of the 1998 NBA Finals" box (row order matches; Rodman 38:59 in reserves block in both).',
  },

  // 4. 1998 NBA Finals Game 6, Utah Jazz (the Keefe trap)
  {
    id: 'finals-1998-g6-uta',
    dateLabel: '1998 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '1998-06-14',
    team: 'Utah Jazz',
    opponent: 'Chicago Bulls',
    scoreLine: 'Bulls 87-86 Jazz',
    venue: 'Delta Center, Salt Lake City',
    // Trap: Adam Keefe started at center in the biggest game of the era.
    slots: [
      PG('John Stockton'),
      SG('Jeff Hornacek'),
      SF('Bryon Russell'),
      PF('Karl Malone'),
      C('Adam Keefe'),
    ],
    blankCandidates: [
      { name: 'Adam Keefe', slotIndex: 4, nationality: 'USA', fact: 'A surprise starter at center on the night of Jordan\'s "Last Shot".' },
      { name: 'Jeff Hornacek', slotIndex: 1, nationality: 'USA', fact: 'Scored 17, second on the Jazz behind Malone\'s 31.' },
      { name: 'Bryon Russell', slotIndex: 2, nationality: 'USA', fact: 'Forever remembered as the defender on Jordan\'s final Bulls shot.' },
    ],
    source: 'basketball-reference box score 199806140UTA (Starters table) + Wikipedia game article box, Malone/Russell/Hornacek/Stockton/Keefe confirmed.',
  },

  // 5. 2023 NBA Finals Game 5, Denver Nuggets (first title in franchise history)
  {
    id: 'finals-2023-g5-den',
    dateLabel: '2023 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2023-06-12',
    team: 'Denver Nuggets',
    opponent: 'Miami Heat',
    scoreLine: 'Nuggets 94-89 Heat',
    venue: 'Ball Arena, Denver',
    slots: [
      PG('Jamal Murray'),
      SG('Kentavious Caldwell-Pope'),
      SF('Michael Porter Jr.'),
      PF('Aaron Gordon'),
      C('Nikola Jokic'),
    ],
    blankCandidates: [
      { name: 'Kentavious Caldwell-Pope', slotIndex: 1, nationality: 'USA' },
      { name: 'Aaron Gordon', slotIndex: 3, nationality: 'USA' },
      { name: 'Michael Porter Jr.', slotIndex: 2, nationality: 'USA', fact: 'Grabbed 13 rebounds in the title clincher.' },
    ],
    source: 'basketball-reference box score 202306120DEN (Starters table), Jokic/Murray/Caldwell-Pope/Porter/Gordon confirmed.',
  },

  // 6. 2023 NBA Finals Game 5, Miami Heat (the 8-seed finalists)
  {
    id: 'finals-2023-g5-mia',
    dateLabel: '2023 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2023-06-12',
    team: 'Miami Heat',
    opponent: 'Denver Nuggets',
    scoreLine: 'Nuggets 94-89 Heat',
    venue: 'Ball Arena, Denver',
    // Undrafted Vincent/Strus starting a Finals game is the whole Heat-culture story.
    slots: [
      PG('Gabe Vincent'),
      SG('Max Strus'),
      SF('Jimmy Butler'),
      PF('Kevin Love'),
      C('Bam Adebayo'),
    ],
    blankCandidates: [
      { name: 'Gabe Vincent', slotIndex: 0, nationality: 'Nigeria', fact: 'An undrafted starter in an NBA Finals game, peak Heat culture.' },
      { name: 'Max Strus', slotIndex: 1, nationality: 'USA', fact: 'Undrafted out of DePaul, starting in the Finals.' },
      { name: 'Kevin Love', slotIndex: 3, nationality: 'USA', fact: 'Reinserted into the starting lineup mid-series, the documented Spoelstra adjustment.' },
    ],
    source: 'basketball-reference box score 202306120DEN (Starters table), Adebayo/Butler/Strus/Vincent/Love confirmed.',
  },
  // 7. 2013 NBA Finals Game 7, San Antonio Spurs (the Ginobili trap)
  // Verified 2026-07-22: bref box 201306200MIA Starters table (Chrome-rendered)
  // + NBA.com official box 0041200407 (starters-first block). Splitter listed
  // in the bench block in BOTH sources.
  {
    id: 'finals-2013-g7-sas',
    dateLabel: '2013 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2013-06-20',
    team: 'San Antonio Spurs',
    opponent: 'Miami Heat',
    scoreLine: 'Heat 95-88 Spurs',
    venue: 'AmericanAirlines Arena, Miami',
    // Trap: career sixth man Manu Ginobili STARTED Game 7 (Splitter benched).
    slots: [
      PG('Tony Parker'),
      SG('Manu Ginobili'),
      SF('Danny Green'),
      PF('Kawhi Leonard'),
      C('Tim Duncan'),
    ],
    blankCandidates: [
      { name: 'Manu Ginobili', slotIndex: 1, nationality: 'Argentina', fact: 'The career sixth man started Game 7, Popovich moved him into the lineup with Tiago Splitter benched.' },
      { name: 'Kawhi Leonard', slotIndex: 3, nationality: 'USA', fact: 'A 21-year-old Leonard started at forward, one year before his Finals MVP.' },
      { name: 'Danny Green', slotIndex: 2, nationality: 'USA', fact: 'Had broken the record for made threes in a single Finals series (27) earlier in the same series.' },
    ],
    source: 'bref box 201306200MIA Starters (Parker/Green/Leonard/Duncan/Ginobili) + NBA.com box 0041200407 starters block; Splitter bench in both.',
  },

  // 8. 2013 NBA Finals Game 7, Miami Heat (the Mike Miller trap)
  {
    id: 'finals-2013-g7-mia',
    dateLabel: '2013 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2013-06-20',
    team: 'Miami Heat',
    opponent: 'San Antonio Spurs',
    scoreLine: 'Heat 95-88 Spurs',
    venue: 'AmericanAirlines Arena, Miami',
    // Trap: Mike Miller started; Ray Allen and Shane Battier came off the bench.
    slots: [
      PG('Mario Chalmers'),
      SG('Dwyane Wade'),
      SF('Mike Miller'),
      PF('LeBron James'),
      C('Chris Bosh'),
    ],
    blankCandidates: [
      { name: 'Mike Miller', slotIndex: 2, nationality: 'USA', fact: 'Started the title clincher, Ray Allen and Shane Battier both came off the bench that night.' },
      { name: 'Mario Chalmers', slotIndex: 0, nationality: 'USA', fact: 'The starting point guard on both Heatles championship teams.' },
      { name: 'Chris Bosh', slotIndex: 4, nationality: 'USA' },
    ],
    source: 'bref box 201306200MIA Starters (James/Chalmers/Wade/Bosh/Miller) + NBA.com box 0041200407 starters block; Allen/Battier bench in both.',
  },

  // 9. 2008 NBA Finals Game 6, Los Angeles Lakers (the Radmanovic trap)
  // Verified 2026-07-22: bref box 200806170BOS Starters + NBA.com box
  // 0040700406 starters block (Walton bench in both).
  {
    id: 'finals-2008-g6-lal',
    dateLabel: '2008 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2008-06-17',
    team: 'Los Angeles Lakers',
    opponent: 'Boston Celtics',
    scoreLine: 'Celtics 131-92 Lakers',
    venue: 'TD Banknorth Garden, Boston',
    // Trap: Vladimir Radmanovic started at small forward, not Walton, not Ariza.
    slots: [
      PG('Derek Fisher'),
      SG('Kobe Bryant'),
      SF('Vladimir Radmanovic'),
      PF('Lamar Odom'),
      C('Pau Gasol'),
    ],
    blankCandidates: [
      { name: 'Vladimir Radmanovic', slotIndex: 2, nationality: 'Serbia', fact: 'The forgotten starting small forward of the 2008 Finals, not Luke Walton, not Trevor Ariza.' },
      { name: 'Lamar Odom', slotIndex: 3, nationality: 'USA' },
      { name: 'Pau Gasol', slotIndex: 4, nationality: 'Spain', fact: 'Traded to L.A. that February, the Finals rematch two years later ended differently.' },
    ],
    source: 'bref box 200806170BOS Starters (Bryant/Odom/Gasol/Fisher/Radmanovic) + NBA.com box 0040700406 starters block; Walton bench in both.',
  },

  // 10. 2008 NBA Finals Game 6, Boston Celtics (the 131-92 clincher)
  {
    id: 'finals-2008-g6-bos',
    dateLabel: '2008 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2008-06-17',
    team: 'Boston Celtics',
    opponent: 'Los Angeles Lakers',
    scoreLine: 'Celtics 131-92 Lakers',
    venue: 'TD Banknorth Garden, Boston',
    slots: [
      PG('Rajon Rondo'),
      SG('Ray Allen'),
      SF('Paul Pierce'),
      PF('Kevin Garnett'),
      C('Kendrick Perkins'),
    ],
    blankCandidates: [
      { name: 'Kendrick Perkins', slotIndex: 4, nationality: 'USA', fact: 'Started the 131-92 clincher but played only 13 minutes with a shoulder injury, P.J. Brown soaked up the frontcourt minutes.' },
      { name: 'Rajon Rondo', slotIndex: 0, nationality: 'USA', fact: 'The second-year point guard ran the offense in the biggest banner-clinching rout in Finals history.' },
      { name: 'Ray Allen', slotIndex: 1, nationality: 'USA' },
    ],
    source: 'bref box 200806170BOS Starters (Pierce/Garnett/Allen/Rondo/Perkins; Perkins 13:25 MP) + NBA.com box 0040700406 starters block.',
  },
  // 11. 2011 NBA Finals Game 6, Dallas Mavericks (the Barea trap)
  // Verified 2026-07-22: bref box 201106120MIA Starters + NBA.com box
  // 0041000406 starters block (first bench = Brian Cardinal in both).
  {
    id: 'finals-2011-g6-dal',
    dateLabel: '2011 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2011-06-12',
    team: 'Dallas Mavericks',
    opponent: 'Miami Heat',
    scoreLine: 'Mavericks 105-95 Heat',
    venue: 'AmericanAirlines Arena, Miami',
    // Trap: 6-foot backup J.J. Barea started the title clincher.
    slots: [
      PG('Jason Kidd'),
      SG('J.J. Barea'),
      SF('Shawn Marion'),
      PF('Dirk Nowitzki'),
      C('Tyson Chandler'),
    ],
    blankCandidates: [
      { name: 'J.J. Barea', slotIndex: 1, nationality: 'Puerto Rico', fact: 'The 6-foot backup was moved into the starting lineup mid-series, Dallas won the last three games.' },
      { name: 'Shawn Marion', slotIndex: 2, nationality: 'USA', fact: 'The Matrix drew the LeBron assignment in the clincher.' },
      { name: 'Tyson Chandler', slotIndex: 4, nationality: 'USA' },
    ],
    source: 'bref box 201106120MIA Starters (Nowitzki/Kidd/Marion/Chandler/Barea) + NBA.com box 0041000406 starters block.',
  },

  // 12. 2011 NBA Finals Game 6, Miami Heat (the Joel Anthony trap)
  {
    id: 'finals-2011-g6-mia',
    dateLabel: '2011 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2011-06-12',
    team: 'Miami Heat',
    opponent: 'Dallas Mavericks',
    scoreLine: 'Mavericks 105-95 Heat',
    venue: 'AmericanAirlines Arena, Miami',
    // Trap: undrafted Joel Anthony started at center (10:55 MP).
    slots: [
      PG('Mario Chalmers'),
      SG('Dwyane Wade'),
      SF('LeBron James'),
      PF('Chris Bosh'),
      C('Joel Anthony'),
    ],
    blankCandidates: [
      { name: 'Joel Anthony', slotIndex: 4, nationality: 'Canada', fact: 'The undrafted Canadian started at center in the title-deciding game, and played just 11 minutes.' },
      { name: 'Mario Chalmers', slotIndex: 0, nationality: 'USA' },
      { name: 'Chris Bosh', slotIndex: 3, nationality: 'USA' },
    ],
    source: 'bref box 201106120MIA Starters (Wade/James/Bosh/Chalmers/Anthony; Anthony 10:55 MP) + NBA.com box 0041000406 starters block (Mike Miller first off the bench).',
  },

  // 2019 NBA Finals Game 6, Toronto Raptors (first title, clinched on the road)
  {
    id: 'finals-2019-g6-tor',
    dateLabel: '2019 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2019-06-13',
    team: 'Toronto Raptors',
    opponent: 'Golden State Warriors',
    scoreLine: 'Raptors 114-110 Warriors',
    venue: 'Oracle Arena, Oakland',
    slots: [
      PG('Kyle Lowry'),
      SG('Danny Green'),
      SF('Kawhi Leonard'),
      PF('Pascal Siakam'),
      C('Marc Gasol'),
    ],
    blankCandidates: [
      { name: 'Marc Gasol', slotIndex: 4, nationality: 'Spain', fact: 'The center acquired from Memphis at the February trade deadline started as Toronto won its first title.' },
      { name: 'Danny Green', slotIndex: 1, nationality: 'USA', fact: 'The fifth starter alongside Leonard, Lowry, Siakam and Gasol, the one nobody names.' },
      { name: 'Pascal Siakam', slotIndex: 3, nationality: 'Cameroon', fact: 'The Cameroon-born forward broke out as a starter in the championship run.' },
    ],
    source: 'basketball-reference box 201906130GSW (Starters: Lowry/Green/Leonard/Siakam/Gasol) + Wikipedia "2019 NBA Finals": Gasol acquired from Memphis, Raptors won Game 6 114-110.',
  },

  // 2019 NBA Finals Game 6, Golden State Warriors (Durant out, Klay hurt)
  {
    id: 'finals-2019-g6-gsw',
    dateLabel: '2019 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2019-06-13',
    team: 'Golden State Warriors',
    opponent: 'Toronto Raptors',
    scoreLine: 'Raptors 114-110 Warriors',
    venue: 'Oracle Arena, Oakland',
    // Trap: Kevon Looney started at center; Iguodala started for the injured Durant.
    slots: [
      PG('Stephen Curry'),
      SG('Klay Thompson'),
      SF('Andre Iguodala'),
      PF('Draymond Green'),
      C('Kevon Looney'),
    ],
    blankCandidates: [
      { name: 'Andre Iguodala', slotIndex: 2, nationality: 'USA', fact: 'Started in place of Kevin Durant, who had torn his Achilles in Game 5.' },
      { name: 'Kevon Looney', slotIndex: 4, nationality: 'USA', fact: 'Started at center and left in the second half with a chest injury.' },
      { name: 'Draymond Green', slotIndex: 3, nationality: 'USA', fact: 'Fell one assist short of a triple-double in the clincher.' },
    ],
    source: 'basketball-reference box 201906130GSW (Starters: Curry/Thompson/Iguodala/Green/Looney) + Wikipedia "2019 NBA Finals": Durant tore his Achilles in Game 5, Looney chest injury in Game 6.',
  },
];

// ---------------------------------------------------------------------------
// Puzzle selection, daily (ET-seeded, sitewide convention) + unlimited.
// ---------------------------------------------------------------------------

export function getDailyFivePuzzle(): ActiveFivePuzzle {
  const seed = dateSeed(getTodayET());
  const lineup = FIVE_LINEUPS[dailyIndex(getTodayET(), FIVE_LINEUPS.length)];
  // Independent pick of which candidate is blanked, per the Missing XI convention.
  const candidate = lineup.blankCandidates[Math.floor(seed / 7) % lineup.blankCandidates.length];
  return { lineup, candidate };
}

export function getRandomFivePuzzle(): ActiveFivePuzzle {
  const lineup = FIVE_LINEUPS[Math.floor(Math.random() * FIVE_LINEUPS.length)];
  const candidate = lineup.blankCandidates[Math.floor(Math.random() * lineup.blankCandidates.length)];
  return { lineup, candidate };
}

/** All names across the file, for local guess suggestions. */
export const ALL_FIVE_NAMES: string[] = Array.from(
  new Set(FIVE_LINEUPS.flatMap((l) => l.slots.map((s) => s.name)))
);

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
export function normalizeFiveName(name: string): string {
  return foldSpecialLatin(name.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/\./g, ''));
}

/** A guess is correct if it matches the blanked candidate (full name or surname). */
export function isCorrectFiveGuess(guess: string, candidate: FiveBlankCandidate): boolean {
  const g = normalizeFiveName(guess);
  const target = normalizeFiveName(candidate.name);
  if (g === target) return true;
  const surname = target.split(' ').slice(-1)[0];
  return g === surname && surname.length >= 4;
}

/**
 * Hint ladder (mirrors Missing XI): hints never restate what the card shows
 * (position is always visible on the blank tile).
 *   1: nationality
 *   2: surname first letter
 *   3: surname letter count
 */
export function fiveHintForLevel(level: FiveHintLevel, candidate: FiveBlankCandidate): string | null {
  const surname = candidate.name.split(' ').slice(-1)[0];
  if (level >= 3) return `The surname has ${surname.length} letters`;
  if (level >= 2) return `The surname starts with "${surname[0]}"`;
  if (level >= 1) return `Nationality: ${candidate.nationality}`;
  return null;
}

export const FIVE_SCORES = [100, 70, 40] as const;
