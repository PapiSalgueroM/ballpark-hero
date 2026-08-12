import { foldSpecialLatin } from '@/lib/nameFold';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Missing Nine (task #39, the MLB port of Missing XI/Five): a famous real
 * World Series starting nine is shown IN BATTING ORDER with ONE name blanked.
 * 3 guesses, hint ladder, 100/70/40 scoring, same mechanic as /missing-five.
 *
 * CONTENT VERIFICATION METHOD:
 * sports-reference hides its "Starting Lineups" tables inside HTML comments
 * (empty on fetch), so every lineup below was verified on 2026-07-22 against
 * the baseball-almanac.com box score for that exact game (boxid in `source`).
 * Almanac batting tables list STARTERS as the un-indented rows in batting
 * order, with substitutes (ph/pr/positional subs) indented beneath them.
 * Each lineup is additionally corroborated by the same box's event lines
 * (HR/2B/HBP with inning stamps) and, for 2016 G7, the SABR Games Project
 * recap (Fowler leadoff HR, Ross entering WITH Lester in the 5th, Martinez
 * replacing Crisp defensively).
 *
 * THE TRAPS ARE THE POINT, double-confirmed, do NOT "fix" them:
 *   - 1988 G1 Dodgers: Kirk GIBSON DID NOT START. Mickey Hatcher started LF
 *     (and homered in the 1st). Gibson's only appearance was the walk-off
 *     pinch-hit homer ("Gibson (1,9th inning off Eckersley 1 on, 2 out)").
 *   - 2016 G7 Cubs: Willson CONTRERAS started at catcher. David Ross (who
 *     homered) only entered in the 5th alongside Jon Lester.
 *   - 2001 G7 Yankees: Shane SPENCER started LF; Knoblauch and Justice were
 *     pinch-hitters only. Clemens batted 9th (NL park, no DH).
 *
 * Guess checking is LOCAL (normalized compare against blankCandidates), no
 * database dependency. Suggestions come from the union of names in this file.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NineSlot {
  /** Fielding position as billed in the box score (P only when no DH). */
  position: string;
  /** Player's real name as billed at the time. */
  name: string;
}

export interface NineBlankCandidate {
  name: string;
  /** Index into Lineup.slots (0 = leadoff). */
  slotIndex: number;
  nationality: string;
  /** One-line VERIFIED flavor fact shown on reveal (never invented by the UI). */
  fact?: string;
}

export interface NineLineup {
  id: string;
  dateLabel: string;
  competition: string;
  matchDate: string;
  team: string;
  opponent: string;
  scoreLine: string;
  venue: string;
  /** Exactly 9 slots, in batting order (index 0 bats leadoff). */
  slots: NineSlot[];
  blankCandidates: NineBlankCandidate[];
  /** INTERNAL editor note on what was checked. Never rendered. */
  source: string;
}

export interface ActiveNinePuzzle {
  lineup: NineLineup;
  candidate: NineBlankCandidate;
}

export type NineHintLevel = 0 | 1 | 2 | 3;

const S = (position: string, name: string): NineSlot => ({ position, name });

export const NINE_LINEUPS: NineLineup[] = [
  // 1. 2016 World Series Game 7, Chicago Cubs (ended the 108-year drought)
  {
    id: 'ws-2016-g7-chc',
    dateLabel: '2016 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2016-11-02',
    team: 'Chicago Cubs',
    opponent: 'Cleveland Indians',
    scoreLine: 'Cubs 8-7 Indians (10 inn)',
    venue: 'Progressive Field, Cleveland',
    slots: [
      S('CF', 'Dexter Fowler'),
      S('DH', 'Kyle Schwarber'),
      S('3B', 'Kris Bryant'),
      S('1B', 'Anthony Rizzo'),
      S('LF', 'Ben Zobrist'),
      S('SS', 'Addison Russell'),
      S('C', 'Willson Contreras'),
      S('RF', 'Jason Heyward'),
      S('2B', 'Javier Baez'),
    ],
    blankCandidates: [
      { name: 'Kyle Schwarber', slotIndex: 1, nationality: 'USA', fact: 'Tore knee ligaments in April and returned seven months later to DH in the World Series.' },
      { name: 'Willson Contreras', slotIndex: 6, nationality: 'Venezuela', fact: 'Started behind the plate, David Ross (who homered) only entered in the 5th with Jon Lester.' },
      { name: 'Ben Zobrist', slotIndex: 4, nationality: 'USA', fact: 'Series MVP, his 10th-inning double off Bryan Shaw broke the 6-6 tie.' },
    ],
    source: 'baseball-almanac box 201611020CLE (starters = un-indented batting rows) + SABR Games Project recap: Fowler leadoff HR, Ross entered with Lester in the 5th.',
  },

  // 2. 2016 World Series Game 7, Cleveland Indians
  {
    id: 'ws-2016-g7-cle',
    dateLabel: '2016 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2016-11-02',
    team: 'Cleveland Indians',
    opponent: 'Chicago Cubs',
    scoreLine: 'Cubs 8-7 Indians (10 inn)',
    venue: 'Progressive Field, Cleveland',
    slots: [
      S('DH', 'Carlos Santana'),
      S('2B', 'Jason Kipnis'),
      S('SS', 'Francisco Lindor'),
      S('1B', 'Mike Napoli'),
      S('3B', 'Jose Ramirez'),
      S('RF', 'Lonnie Chisenhall'),
      S('CF', 'Rajai Davis'),
      S('LF', 'Coco Crisp'),
      S('C', 'Roberto Perez'),
    ],
    blankCandidates: [
      { name: 'Rajai Davis', slotIndex: 6, nationality: 'USA', fact: 'His two-run, two-out homer off Aroldis Chapman in the 8th tied Game 7 at 6-6.' },
      { name: 'Roberto Perez', slotIndex: 8, nationality: 'Puerto Rico', fact: 'Batted ninth and caught the start, Yan Gomes only entered late.' },
      { name: 'Coco Crisp', slotIndex: 7, nationality: 'USA', fact: 'Doubled and scored Cleveland\'s first run; Michael Martinez replaced him defensively in the 8th.' },
    ],
    source: 'baseball-almanac box 201611020CLE + SABR recap (Crisp double in the 3rd, Martinez defensive sub, Davis HR off Chapman).',
  },

  // 3. 2001 World Series Game 7, New York Yankees (the Spencer trap)
  {
    id: 'ws-2001-g7-nyy',
    dateLabel: '2001 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2001-11-04',
    team: 'New York Yankees',
    opponent: 'Arizona Diamondbacks',
    scoreLine: 'Diamondbacks 3-2 Yankees',
    venue: 'Bank One Ballpark, Phoenix',
    // NL park: no DH, Clemens bats ninth. Spencer started LF, not Knoblauch.
    slots: [
      S('SS', 'Derek Jeter'),
      S('RF', 'Paul O\'Neill'),
      S('CF', 'Bernie Williams'),
      S('1B', 'Tino Martinez'),
      S('C', 'Jorge Posada'),
      S('LF', 'Shane Spencer'),
      S('2B', 'Alfonso Soriano'),
      S('3B', 'Scott Brosius'),
      S('P', 'Roger Clemens'),
    ],
    blankCandidates: [
      { name: 'Shane Spencer', slotIndex: 5, nationality: 'USA', fact: 'Started left field, Chuck Knoblauch and David Justice only appeared as pinch-hitters.' },
      { name: 'Alfonso Soriano', slotIndex: 6, nationality: 'Dominican Republic', fact: 'His 8th-inning homer off Curt Schilling briefly put New York ahead 2-1.' },
      { name: 'Roger Clemens', slotIndex: 8, nationality: 'USA', fact: 'NL park, no DH, the Rocket batted ninth and struck out 10 in 6.1 innings.' },
    ],
    source: 'baseball-almanac box 200111040ARI (starters = un-indented rows; Knoblauch listed ph,lf and Justice ph). Soriano HR line: "8th inning off Schilling".',
  },

  // 4. 2001 World Series Game 7, Arizona Diamondbacks (the walk-off)
  {
    id: 'ws-2001-g7-ari',
    dateLabel: '2001 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2001-11-04',
    team: 'Arizona Diamondbacks',
    opponent: 'New York Yankees',
    scoreLine: 'Diamondbacks 3-2 Yankees',
    venue: 'Bank One Ballpark, Phoenix',
    slots: [
      S('SS', 'Tony Womack'),
      S('2B', 'Craig Counsell'),
      S('LF', 'Luis Gonzalez'),
      S('3B', 'Matt Williams'),
      S('CF', 'Steve Finley'),
      S('RF', 'Danny Bautista'),
      S('1B', 'Mark Grace'),
      S('C', 'Damian Miller'),
      S('P', 'Curt Schilling'),
    ],
    blankCandidates: [
      { name: 'Tony Womack', slotIndex: 0, nationality: 'USA', fact: 'His ninth-inning double off Mariano Rivera tied the game before the walk-off.' },
      { name: 'Craig Counsell', slotIndex: 1, nationality: 'USA', fact: 'Hit by a Rivera pitch in the 9th, setting the stage for Gonzalez\'s walk-off single.' },
      { name: 'Danny Bautista', slotIndex: 5, nationality: 'Dominican Republic', fact: 'His double off Clemens drove in Arizona\'s first run.' },
    ],
    source: 'baseball-almanac box 200111040ARI. Event lines confirm: Womack 2B off Rivera, Counsell HBP by Rivera, Bautista 2B off Clemens.',
  },

  // 5. 1988 World Series Game 1, Oakland Athletics (Canseco\'s slam wasted)
  {
    id: 'ws-1988-g1-oak',
    dateLabel: '1988 World Series, Game 1',
    competition: 'World Series',
    matchDate: '1988-10-15',
    team: 'Oakland Athletics',
    opponent: 'Los Angeles Dodgers',
    scoreLine: 'Dodgers 5-4 Athletics',
    venue: 'Dodger Stadium, Los Angeles',
    slots: [
      S('3B', 'Carney Lansford'),
      S('CF', 'Dave Henderson'),
      S('RF', 'Jose Canseco'),
      S('LF', 'Dave Parker'),
      S('1B', 'Mark McGwire'),
      S('C', 'Terry Steinbach'),
      S('2B', 'Glenn Hubbard'),
      S('SS', 'Walt Weiss'),
      S('P', 'Dave Stewart'),
    ],
    blankCandidates: [
      { name: 'Jose Canseco', slotIndex: 2, nationality: 'Cuba', fact: 'His second-inning grand slam off Tim Belcher gave Oakland a 4-2 lead.' },
      { name: 'Dave Parker', slotIndex: 3, nationality: 'USA', fact: 'The Cobra started in left field batting cleanup for Oakland.' },
      { name: 'Dave Stewart', slotIndex: 8, nationality: 'USA', fact: 'Threw 8 innings, then Eckersley took the loss on the famous walk-off.' },
    ],
    source: 'baseball-almanac box 198810150LAN. HR line confirms Canseco grand slam: "2nd inning off Belcher 3 on, 2 out".',
  },

  // 6. 1988 World Series Game 1, Los Angeles Dodgers (THE Gibson trap)
  {
    id: 'ws-1988-g1-lad',
    dateLabel: '1988 World Series, Game 1',
    competition: 'World Series',
    matchDate: '1988-10-15',
    team: 'Los Angeles Dodgers',
    opponent: 'Oakland Athletics',
    scoreLine: 'Dodgers 5-4 Athletics',
    venue: 'Dodger Stadium, Los Angeles',
    // Trap: Kirk Gibson did NOT start, his walk-off was a pinch-hit at-bat.
    slots: [
      S('2B', 'Steve Sax'),
      S('1B', 'Franklin Stubbs'),
      S('LF', 'Mickey Hatcher'),
      S('RF', 'Mike Marshall'),
      S('CF', 'John Shelby'),
      S('C', 'Mike Scioscia'),
      S('3B', 'Jeff Hamilton'),
      S('SS', 'Alfredo Griffin'),
      S('P', 'Tim Belcher'),
    ],
    blankCandidates: [
      { name: 'Mickey Hatcher', slotIndex: 2, nationality: 'USA', fact: 'Homered in the 1st inning. Kirk Gibson never started, his walk-off homer was a pinch-hit at-bat.' },
      { name: 'Franklin Stubbs', slotIndex: 1, nationality: 'USA', fact: 'Started at first base on the night of Gibson\'s pinch-hit walk-off.' },
      { name: 'Mike Scioscia', slotIndex: 5, nationality: 'USA', fact: 'Caught the whole game and drove in a run, later a World Series-winning manager.' },
    ],
    source: 'baseball-almanac box 198810150LAN (Gibson listed only as "ph" in the 9-hole pitchers\' block; HR line: "Gibson (1,9th inning off Eckersley 1 on, 2 out)"). Hatcher HR: "1st inning off Stewart 1 on, 1 out".',
  },
  // 7. 1986 World Series Game 6, Boston Red Sox (one strike away)
  // Verified 2026-07-22: baseball-almanac box 198610250NYN (starters =
  // un-indented batting rows). In-box corroboration: Henderson HR "10th
  // inning off Aguilera", E-Buckner, Clemens 7.0 IP.
  {
    id: 'ws-1986-g6-bos',
    dateLabel: '1986 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1986-10-25',
    team: 'Boston Red Sox',
    opponent: 'New York Mets',
    scoreLine: 'Mets 6-5 Red Sox (10 inn)',
    venue: 'Shea Stadium, New York',
    slots: [
      S('3B', 'Wade Boggs'),
      S('2B', 'Marty Barrett'),
      S('1B', 'Bill Buckner'),
      S('LF', 'Jim Rice'),
      S('RF', 'Dwight Evans'),
      S('C', 'Rich Gedman'),
      S('CF', 'Dave Henderson'),
      S('SS', 'Spike Owen'),
      S('P', 'Roger Clemens'),
    ],
    blankCandidates: [
      { name: 'Roger Clemens', slotIndex: 8, nationality: 'USA', fact: 'Started and threw seven innings, the collapse came after he left.' },
      { name: 'Bill Buckner', slotIndex: 2, nationality: 'USA', fact: 'Batted third and played first base, the error in the 10th made him the story forever.' },
      { name: 'Dave Henderson', slotIndex: 6, nationality: 'USA', fact: 'His 10th-inning homer off Aguilera had Boston one strike from the title.' },
    ],
    source: 'baseball-almanac box 198610250NYN. Event lines: Henderson HR 10th off Aguilera; E-Buckner (1); Clemens 7.0 IP.',
  },

  // 8. 1986 World Series Game 6, New York Mets (the Mookie game)
  {
    id: 'ws-1986-g6-nym',
    dateLabel: '1986 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1986-10-25',
    team: 'New York Mets',
    opponent: 'Boston Red Sox',
    scoreLine: 'Mets 6-5 Red Sox (10 inn)',
    venue: 'Shea Stadium, New York',
    // Trap: Bobby Ojeda started, not Gooden. Kevin Mitchell only pinch-hit.
    slots: [
      S('CF', 'Lenny Dykstra'),
      S('2B', 'Wally Backman'),
      S('1B', 'Keith Hernandez'),
      S('C', 'Gary Carter'),
      S('RF', 'Darryl Strawberry'),
      S('3B', 'Ray Knight'),
      S('LF', 'Mookie Wilson'),
      S('SS', 'Rafael Santana'),
      S('P', 'Bobby Ojeda'),
    ],
    blankCandidates: [
      { name: 'Bobby Ojeda', slotIndex: 8, nationality: 'USA', fact: 'The lefty ex-Red Sox started Game 6 against his old team, not Dwight Gooden.' },
      { name: 'Mookie Wilson', slotIndex: 6, nationality: 'USA', fact: 'Hit the grounder that rolled through Buckner\'s legs.' },
      { name: 'Rafael Santana', slotIndex: 7, nationality: 'Dominican Republic', fact: 'The light-hitting shortstop batted eighth in the most famous Game 6 ever.' },
    ],
    source: 'baseball-almanac box 198610250NYN. Event lines: Ojeda 6.0 IP as starter; Knight 2 RBI; Carter SF; Mitchell listed ph only.',
  },

  // 5. 2013 World Series Game 6, Boston Red Sox (clinched at Fenway; Ortiz MVP)
  {
    id: 'ws-2013-g6-bos',
    dateLabel: '2013 World Series, Game 6',
    competition: 'World Series',
    matchDate: '2013-10-30',
    team: 'Boston Red Sox',
    opponent: 'St. Louis Cardinals',
    scoreLine: 'Red Sox 6-1 Cardinals',
    venue: 'Fenway Park, Boston',
    // AL park: DH in the order. Trap: David Ross started at catcher over
    // Saltalamacchia; rookie Bogaerts started at third.
    slots: [
      S('CF', 'Jacoby Ellsbury'),
      S('2B', 'Dustin Pedroia'),
      S('DH', 'David Ortiz'),
      S('1B', 'Mike Napoli'),
      S('LF', 'Jonny Gomes'),
      S('RF', 'Shane Victorino'),
      S('3B', 'Xander Bogaerts'),
      S('SS', 'Stephen Drew'),
      S('C', 'David Ross'),
    ],
    blankCandidates: [
      { name: 'David Ross', slotIndex: 8, nationality: 'USA', fact: 'The veteran started at catcher over regular Jarrod Saltalamacchia; his glove anchored the clincher.' },
      { name: 'Xander Bogaerts', slotIndex: 6, nationality: 'Aruba', fact: 'The 21-year-old rookie from Aruba started at third base.' },
      { name: 'Stephen Drew', slotIndex: 7, nationality: 'USA', fact: 'Limited at the plate all series, he kept his job at shortstop for his defense.' },
    ],
    source: 'baseball-reference box BOS201310300 (starters = 9 batting rows before the substitution break) + Wikipedia "2013 World Series": Ross/Drew limited offensively but strong defensively, Saltalamacchia the regular catcher.',
  },

  // 6. 2013 World Series Game 6, St. Louis Cardinals
  {
    id: 'ws-2013-g6-stl',
    dateLabel: '2013 World Series, Game 6',
    competition: 'World Series',
    matchDate: '2013-10-30',
    team: 'St. Louis Cardinals',
    opponent: 'Boston Red Sox',
    scoreLine: 'Red Sox 6-1 Cardinals',
    venue: 'Fenway Park, Boston',
    // Trap: Descalso started at short (Kozma reduced to pinch-running); Adams
    // at first pushed Craig to DH.
    slots: [
      S('2B', 'Matt Carpenter'),
      S('RF', 'Carlos Beltran'),
      S('LF', 'Matt Holliday'),
      S('DH', 'Allen Craig'),
      S('C', 'Yadier Molina'),
      S('1B', 'Matt Adams'),
      S('3B', 'David Freese'),
      S('CF', 'Jon Jay'),
      S('SS', 'Daniel Descalso'),
    ],
    blankCandidates: [
      { name: 'Daniel Descalso', slotIndex: 8, nationality: 'USA', fact: 'Started at shortstop; regular Pete Kozma was reduced to a pinch-running role.' },
      { name: 'Matt Adams', slotIndex: 5, nationality: 'USA', fact: 'Started at first base, pushing Allen Craig to designated hitter.' },
      { name: 'Allen Craig', slotIndex: 3, nationality: 'USA', fact: 'Batted cleanup as the designated hitter in the AL park.' },
    ],
    source: 'baseball-reference box BOS201310300 (starters = 9 batting rows before the substitution break) + Wikipedia "2013 World Series": Kozma pinch-ran (Descalso started SS).',
  },
];

// ---------------------------------------------------------------------------
// Puzzle selection, daily (ET-seeded, sitewide convention) + unlimited.
// ---------------------------------------------------------------------------

export function getDailyNinePuzzle(): ActiveNinePuzzle {
  const seed = dateSeed(getTodayET());
  const lineup = NINE_LINEUPS[seed % NINE_LINEUPS.length];
  const candidate = lineup.blankCandidates[Math.floor(seed / 7) % lineup.blankCandidates.length];
  return { lineup, candidate };
}

export function getRandomNinePuzzle(): ActiveNinePuzzle {
  const lineup = NINE_LINEUPS[Math.floor(Math.random() * NINE_LINEUPS.length)];
  const candidate = lineup.blankCandidates[Math.floor(Math.random() * lineup.blankCandidates.length)];
  return { lineup, candidate };
}

/** All names across the file, for local guess suggestions. */
export const ALL_NINE_NAMES: string[] = Array.from(
  new Set(NINE_LINEUPS.flatMap((l) => l.slots.map((s) => s.name)))
);

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
export function normalizeNineName(name: string): string {
  return foldSpecialLatin(name.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/\./g, '').replace(/'/g, ''));
}

/** A guess is correct if it matches the blanked candidate (full name or surname). */
export function isCorrectNineGuess(guess: string, candidate: NineBlankCandidate): boolean {
  const g = normalizeNineName(guess);
  const target = normalizeNineName(candidate.name);
  if (g === target) return true;
  const surname = target.split(' ').slice(-1)[0];
  return g === surname && surname.length >= 4;
}

/**
 * Hint ladder (mirrors Missing Five): hints never restate what the card shows
 * (batting-order spot and position are always visible on the blank row).
 *   1: nationality
 *   2: surname first letter
 *   3: surname letter count
 */
export function nineHintForLevel(level: NineHintLevel, candidate: NineBlankCandidate): string | null {
  const surname = candidate.name.split(' ').slice(-1)[0];
  if (level >= 3) return `The surname has ${surname.length} letters`;
  if (level >= 2) return `The surname starts with "${surname[0]}"`;
  if (level >= 1) return `Nationality: ${candidate.nationality}`;
  return null;
}

export const NINE_SCORES = [100, 70, 40] as const;
