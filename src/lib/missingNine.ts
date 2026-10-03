import { foldSpecialLatin } from '@/lib/nameFold';
import { dailyIndex, dateSeed, getTodayET } from '@/lib/dateUtils';

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
 * ROUND 948, TWO HOSTS FOR EVERY SHEET: every sheet (the ten above and the
 * twenty added) was read again on 2026-10-02 and 2026-10-03 from BOTH the
 * baseball-almanac box and the baseball-reference box (its Starting Lineups
 * table sits in the raw page), matched by player id, and every blank's
 * birthplace from both hosts' player pages. Wikipedia no longer counts as a
 * source anywhere in this file. Each sheet's check, fact by fact, is written
 * down in scripts/data/missingNineSources.json, and
 * scripts/simMissingNineSources.mjs fails when this file and that record
 * disagree or when a sheet's source names fewer than two hosts. Facts only
 * say what both hosts support: where they disagreed (the inning of the 2016
 * Martinez switch) the fact names no inning.
 *
 * THE TRAPS ARE THE POINT, double-confirmed, do NOT "fix" them:
 *   - 1988 G1 Dodgers: Kirk GIBSON DID NOT START. Mickey Hatcher started LF
 *     (and homered in the 1st). Gibson's only appearance was the walk-off
 *     pinch-hit homer ("Gibson (1,9th inning off Eckersley 1 on, 2 out)").
 *   - 2016 G7 Cubs: Willson CONTRERAS started at catcher. David Ross (who
 *     homered) only entered in the 5th alongside Jon Lester.
 *   - 2001 G7 Yankees: Shane SPENCER started LF; Knoblauch and Justice only
 *     came off the bench (Justice pinch-hit; Knoblauch pinch-hit for O'Neill
 *     and stayed on in left). Clemens batted 9th (NL park, no DH).
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
      { name: 'Kyle Schwarber', slotIndex: 1, nationality: 'USA', fact: 'Had three hits as the DH before Albert Almora Jr. ran for him in the 10th and scored the go-ahead run.' },
      { name: 'Willson Contreras', slotIndex: 6, nationality: 'Venezuela', fact: 'Started behind the plate, David Ross (who homered) only entered in the 5th with Jon Lester.' },
      { name: 'Ben Zobrist', slotIndex: 4, nationality: 'USA', fact: 'His 10th-inning double off Bryan Shaw broke the 6-6 tie.' },
    ],
    source: 'baseball-almanac box 201611020CLE (starters = un-indented batting rows) + baseball-reference box CLE201611020 (same nine, same order) + SABR Games Project recap: Fowler leadoff HR, Ross entered with Lester in the 5th, Almora Jr. ran for Schwarber. Record: scripts/data/missingNineSources.json.',
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
      { name: 'Coco Crisp', slotIndex: 7, nationality: 'USA', fact: 'Doubled and scored Cleveland\'s first run; Michael Martinez later replaced him in the field.' },
    ],
    source: 'baseball-almanac box 201611020CLE + baseball-reference box CLE201611020 (same nine, same order) + SABR recap (Crisp double in the 3rd, Davis HR off Chapman). SABR puts the Martinez switch in the 8th and the baseball-reference play log in the 9th, so the fact names no inning. Record: scripts/data/missingNineSources.json.',
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
      { name: 'Shane Spencer', slotIndex: 5, nationality: 'USA', fact: 'Started in left field; Chuck Knoblauch and David Justice only came off the bench.' },
      { name: 'Alfonso Soriano', slotIndex: 6, nationality: 'Dominican Republic', fact: 'His 8th-inning homer off Curt Schilling briefly put New York ahead 2-1.' },
      { name: 'Roger Clemens', slotIndex: 8, nationality: 'USA', fact: 'NL park, no DH: Clemens batted ninth and struck out 10 in 6.1 innings.' },
    ],
    source: 'baseball-almanac box 200111040ARI (starters = un-indented rows; Knoblauch listed ph,lf and Justice ph) + baseball-reference box ARI200111040 (same nine, same order) + SABR Games Project recap (Martinez tied it 1-1 in the 7th, Soriano led off the 8th with the homer). Record: scripts/data/missingNineSources.json.',
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
    source: 'baseball-almanac box 200111040ARI + baseball-reference box ARI200111040 (same nine, same order). Both boxes: Womack 2B off Rivera, Counsell HBP by Rivera, Bautista 2B off Clemens; the play log and the SABR Games Project recap put each in order. Record: scripts/data/missingNineSources.json.',
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
      { name: 'Dave Parker', slotIndex: 3, nationality: 'USA', fact: 'Started in left field and batted cleanup for Oakland.' },
      { name: 'Dave Stewart', slotIndex: 8, nationality: 'USA', fact: 'Threw 8 innings, then Dennis Eckersley took the loss on Kirk Gibson\'s walk-off.' },
    ],
    source: 'baseball-almanac box 198810150LAN + baseball-reference box LAN198810150 (same nine, same order). Both HR lines: Canseco grand slam in the 2nd off Belcher, Gibson in the 9th off Eckersley. Record: scripts/data/missingNineSources.json.',
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
      { name: 'Mike Scioscia', slotIndex: 5, nationality: 'USA', fact: 'Caught the whole game and drove in a run with a single.' },
    ],
    source: 'baseball-almanac box 198810150LAN (Gibson listed only as "ph" in the 9-hole pitchers\' block; HR line: "Gibson (1,9th inning off Eckersley 1 on, 2 out)") + baseball-reference box LAN198810150 (same nine, same order, no Gibson among the starters). Hatcher HR: "1st inning off Stewart 1 on, 1 out" on both. Record: scripts/data/missingNineSources.json.',
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
      { name: 'Roger Clemens', slotIndex: 8, nationality: 'USA', fact: 'Started and threw seven innings with eight strikeouts.' },
      { name: 'Bill Buckner', slotIndex: 2, nationality: 'USA', fact: 'Batted third and played first base; his error on Mookie Wilson\'s grounder in the 10th let the winning run score.' },
      { name: 'Dave Henderson', slotIndex: 6, nationality: 'USA', fact: 'His homer leading off the 10th, off Rick Aguilera, put Boston ahead 4-3.' },
    ],
    source: 'baseball-almanac box 198610250NYN + baseball-reference box NYN198610250 (same nine, same order) + SABR Games Project recap. Both boxes: Henderson HR 10th off Aguilera, 0 on, 0 out; E-Buckner; Clemens 7.0 IP, 8 SO. Record: scripts/data/missingNineSources.json.',
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
    // Trap: Bob Ojeda started, not Gooden. Kevin Mitchell only pinch-hit.
    slots: [
      S('CF', 'Lenny Dykstra'),
      S('2B', 'Wally Backman'),
      S('1B', 'Keith Hernandez'),
      S('C', 'Gary Carter'),
      S('RF', 'Darryl Strawberry'),
      S('3B', 'Ray Knight'),
      S('LF', 'Mookie Wilson'),
      S('SS', 'Rafael Santana'),
      S('P', 'Bob Ojeda'),
    ],
    blankCandidates: [
      { name: 'Bob Ojeda', slotIndex: 8, nationality: 'USA', fact: 'Started Game 6, not Dwight Gooden, and went six innings.' },
      { name: 'Mookie Wilson', slotIndex: 6, nationality: 'USA', fact: 'His 10th-inning grounder went for an error on Bill Buckner at first, and Ray Knight scored the winning run.' },
      { name: 'Rafael Santana', slotIndex: 7, nationality: 'Dominican Republic', fact: 'Started at short and batted eighth; Kevin Elster and Howard Johnson both took turns there later.' },
    ],
    source: 'baseball-almanac box 198610250NYN + baseball-reference box NYN198610250 (same nine, same order) + SABR Games Project recap. Both boxes: Ojeda 6.0 IP as starter; Knight 2 RBI; Carter SF; Mitchell listed ph only. Both player pages bill him Bob Ojeda. Record: scripts/data/missingNineSources.json.',
  },

  // 9. 2013 World Series Game 6, Boston Red Sox (clinched at Fenway)
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
      { name: 'David Ross', slotIndex: 8, nationality: 'USA', fact: 'Started at catcher; Jarrod Saltalamacchia did not play in the clincher.' },
      { name: 'Xander Bogaerts', slotIndex: 6, nationality: 'Aruba', fact: 'Started at third base, aged 21.' },
      { name: 'Stephen Drew', slotIndex: 7, nationality: 'USA', fact: 'Led off the 4th with a homer off Michael Wacha.' },
    ],
    source: 'baseball-reference box BOS201310300 (starters = 9 batting rows before the substitution break) + baseball-almanac box 201310300BOS (same nine, same order). Both boxes: Drew HR 4th off Wacha, no Saltalamacchia. Record: scripts/data/missingNineSources.json.',
  },

  // 10. 2013 World Series Game 6, St. Louis Cardinals
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
      { name: 'Daniel Descalso', slotIndex: 8, nationality: 'USA', fact: 'Started at shortstop; Pete Kozma did not play in Game 6.' },
      { name: 'Matt Adams', slotIndex: 5, nationality: 'USA', fact: 'Started at first base while Allen Craig was the designated hitter.' },
      { name: 'Allen Craig', slotIndex: 3, nationality: 'USA', fact: 'Batted cleanup as the designated hitter in the AL park.' },
    ],
    source: 'baseball-reference box BOS201310300 (starters = 9 batting rows before the substitution break) + baseball-almanac box 201310300BOS (same nine, same order). Neither box has Kozma in the game. Record: scripts/data/missingNineSources.json.',
  },

  // 11. 1991 World Series Game 7, Minnesota Twins (Jack Morris's 10-inning shutout)
  // Trap: Gene Larkin, whose pinch-hit single won it, did not start: Chili Davis was the DH.
  {
    id: 'ws-1991-g7-min',
    dateLabel: '1991 World Series, Game 7',
    competition: 'World Series',
    matchDate: '1991-10-27',
    team: 'Minnesota Twins',
    opponent: 'Atlanta Braves',
    scoreLine: 'Twins 1-0 Braves (10 inn)',
    venue: 'Hubert H. Humphrey Metrodome, Minneapolis',
    slots: [
      S('LF', 'Dan Gladden'),
      S('2B', 'Chuck Knoblauch'),
      S('CF', 'Kirby Puckett'),
      S('1B', 'Kent Hrbek'),
      S('DH', 'Chili Davis'),
      S('C', 'Brian Harper'),
      S('RF', 'Shane Mack'),
      S('3B', 'Mike Pagliarulo'),
      S('SS', 'Greg Gagne'),
    ],
    blankCandidates: [
      { name: 'Chili Davis', slotIndex: 4, nationality: 'Jamaica', fact: 'Started at DH. Gene Larkin\'s pinch-hit winner in the 10th came in his spot in the order.' },
      { name: 'Dan Gladden', slotIndex: 0, nationality: 'USA', fact: 'Had three hits, two of them doubles, and scored the game\'s only run.' },
      { name: 'Brian Harper', slotIndex: 5, nationality: 'USA', fact: 'Caught all ten innings of Jack Morris\'s shutout and had two hits.' },
    ],
    source: 'baseball-almanac box 199110270MIN + baseball-reference box MIN199110270: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 12. 1991 World Series Game 7, Atlanta Braves (Jack Morris's 10-inning shutout)
  // Trap: Jeff Blauser did not start at short: Rafael Belliard did, batting ninth.
  {
    id: 'ws-1991-g7-atl',
    dateLabel: '1991 World Series, Game 7',
    competition: 'World Series',
    matchDate: '1991-10-27',
    team: 'Atlanta Braves',
    opponent: 'Minnesota Twins',
    scoreLine: 'Twins 1-0 Braves (10 inn)',
    venue: 'Hubert H. Humphrey Metrodome, Minneapolis',
    slots: [
      S('DH', 'Lonnie Smith'),
      S('3B', 'Terry Pendleton'),
      S('CF', 'Ron Gant'),
      S('RF', 'David Justice'),
      S('1B', 'Sid Bream'),
      S('LF', 'Brian Hunter'),
      S('C', 'Greg Olson'),
      S('2B', 'Mark Lemke'),
      S('SS', 'Rafael Belliard'),
    ],
    blankCandidates: [
      { name: 'Lonnie Smith', slotIndex: 0, nationality: 'USA', fact: 'Led off as the DH and had two of Atlanta\'s seven hits off Jack Morris.' },
      { name: 'Rafael Belliard', slotIndex: 8, nationality: 'Dominican Republic', fact: 'Started at short and batted ninth; Jeff Blauser later pinch-hit for him.' },
      { name: 'Brian Hunter', slotIndex: 5, nationality: 'USA', fact: 'Started in left field and doubled off Jack Morris.' },
    ],
    source: 'baseball-almanac box 199110270MIN + baseball-reference box MIN199110270: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 13. 2011 World Series Game 6, St. Louis Cardinals (the Freese game)
  // Trap: Allen Craig, who homered, did not start: Matt Holliday was in left.
  {
    id: 'ws-2011-g6-stl',
    dateLabel: '2011 World Series, Game 6',
    competition: 'World Series',
    matchDate: '2011-10-27',
    team: 'St. Louis Cardinals',
    opponent: 'Texas Rangers',
    scoreLine: 'Cardinals 10-9 Rangers (11 inn)',
    venue: 'Busch Stadium, St. Louis',
    slots: [
      S('SS', 'Rafael Furcal'),
      S('CF', 'Skip Schumaker'),
      S('1B', 'Albert Pujols'),
      S('RF', 'Lance Berkman'),
      S('LF', 'Matt Holliday'),
      S('3B', 'David Freese'),
      S('C', 'Yadier Molina'),
      S('2B', 'Nick Punto'),
      S('P', 'Jaime Garcia'),
    ],
    blankCandidates: [
      { name: 'David Freese', slotIndex: 5, nationality: 'USA', fact: 'Tripled off Neftali Feliz, then won it with a homer off Mark Lowe leading off the 11th.' },
      { name: 'Lance Berkman', slotIndex: 3, nationality: 'USA', fact: 'Scored four runs and hit a two-run homer off Colby Lewis in the 1st.' },
      { name: 'Matt Holliday', slotIndex: 4, nationality: 'USA', fact: 'Started in left; Allen Craig replaced him and homered off Derek Holland in the 8th.' },
    ],
    source: 'baseball-almanac box 201110270SLN + baseball-reference box SLN201110270: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 14. 2011 World Series Game 6, Texas Rangers (the Freese game)
  // Trap: NL park, no DH: Colby Lewis batted ninth, and Hamilton started in left, not center.
  {
    id: 'ws-2011-g6-tex',
    dateLabel: '2011 World Series, Game 6',
    competition: 'World Series',
    matchDate: '2011-10-27',
    team: 'Texas Rangers',
    opponent: 'St. Louis Cardinals',
    scoreLine: 'Cardinals 10-9 Rangers (11 inn)',
    venue: 'Busch Stadium, St. Louis',
    slots: [
      S('2B', 'Ian Kinsler'),
      S('SS', 'Elvis Andrus'),
      S('LF', 'Josh Hamilton'),
      S('1B', 'Michael Young'),
      S('3B', 'Adrian Beltre'),
      S('RF', 'Nelson Cruz'),
      S('C', 'Mike Napoli'),
      S('CF', 'Craig Gentry'),
      S('P', 'Colby Lewis'),
    ],
    blankCandidates: [
      { name: 'Josh Hamilton', slotIndex: 2, nationality: 'USA', fact: 'Hit a two-run homer off Jason Motte in the 10th.' },
      { name: 'Adrian Beltre', slotIndex: 4, nationality: 'Dominican Republic', fact: 'He and Nelson Cruz opened the 7th with back-to-back homers off Lance Lynn.' },
      { name: 'Craig Gentry', slotIndex: 7, nationality: 'USA', fact: 'Started in center field; David Murphy later pinch-hit for him.' },
    ],
    source: 'baseball-almanac box 201110270SLN + baseball-reference box SLN201110270: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 15. 1975 World Series Game 6, Boston Red Sox (the Fisk game)
  // Trap: Bernie Carbo, whose three-run homer tied it in the 8th, did not start: he pinch-hit.
  {
    id: 'ws-1975-g6-bos',
    dateLabel: '1975 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1975-10-21',
    team: 'Boston Red Sox',
    opponent: 'Cincinnati Reds',
    scoreLine: 'Red Sox 7-6 Reds (12 inn)',
    venue: 'Fenway Park, Boston',
    slots: [
      S('1B', 'Cecil Cooper'),
      S('2B', 'Denny Doyle'),
      S('LF', 'Carl Yastrzemski'),
      S('C', 'Carlton Fisk'),
      S('CF', 'Fred Lynn'),
      S('3B', 'Rico Petrocelli'),
      S('RF', 'Dwight Evans'),
      S('SS', 'Rick Burleson'),
      S('P', 'Luis Tiant'),
    ],
    blankCandidates: [
      { name: 'Carlton Fisk', slotIndex: 3, nationality: 'USA', fact: 'Led off the 12th with the homer off Pat Darcy that won it 7-6.' },
      { name: 'Fred Lynn', slotIndex: 4, nationality: 'USA', fact: 'Hit a three-run homer off Gary Nolan in the 1st.' },
      { name: 'Luis Tiant', slotIndex: 8, nationality: 'Cuba', fact: 'Started and batted ninth; Bernie Carbo\'s tying three-run homer in the 8th came as a pinch-hitter in this spot.' },
    ],
    source: 'baseball-almanac box 197510210BOS + baseball-reference box BOS197510210: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 16. 1975 World Series Game 6, Cincinnati Reds (the Fisk game)
  // Trap: No DH in 1975: Gary Nolan batted ninth, and Pete Rose started at third base.
  {
    id: 'ws-1975-g6-cin',
    dateLabel: '1975 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1975-10-21',
    team: 'Cincinnati Reds',
    opponent: 'Boston Red Sox',
    scoreLine: 'Red Sox 7-6 Reds (12 inn)',
    venue: 'Fenway Park, Boston',
    slots: [
      S('3B', 'Pete Rose'),
      S('RF', 'Ken Griffey'),
      S('2B', 'Joe Morgan'),
      S('C', 'Johnny Bench'),
      S('1B', 'Tony Perez'),
      S('LF', 'George Foster'),
      S('SS', 'Dave Concepcion'),
      S('CF', 'Cesar Geronimo'),
      S('P', 'Gary Nolan'),
    ],
    blankCandidates: [
      { name: 'Cesar Geronimo', slotIndex: 7, nationality: 'Dominican Republic', fact: 'Led off the 8th with a homer off Luis Tiant.' },
      { name: 'George Foster', slotIndex: 5, nationality: 'USA', fact: 'Doubled off Luis Tiant and drove in two runs.' },
      { name: 'Gary Nolan', slotIndex: 8, nationality: 'USA', fact: 'Started but lasted two innings, Fred Lynn\'s three-run homer came off him in the 1st.' },
    ],
    source: 'baseball-almanac box 197510210BOS + baseball-reference box BOS197510210: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 17. 1993 World Series Game 6, Toronto Blue Jays (Joe Carter's walk-off)
  // Trap: Rickey Henderson led off in left; Molitor was the DH, not at a position.
  {
    id: 'ws-1993-g6-tor',
    dateLabel: '1993 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1993-10-23',
    team: 'Toronto Blue Jays',
    opponent: 'Philadelphia Phillies',
    scoreLine: 'Blue Jays 8-6 Phillies',
    venue: 'SkyDome, Toronto',
    slots: [
      S('LF', 'Rickey Henderson'),
      S('CF', 'Devon White'),
      S('DH', 'Paul Molitor'),
      S('RF', 'Joe Carter'),
      S('1B', 'John Olerud'),
      S('2B', 'Roberto Alomar'),
      S('SS', 'Tony Fernandez'),
      S('3B', 'Ed Sprague'),
      S('C', 'Pat Borders'),
    ],
    blankCandidates: [
      { name: 'Joe Carter', slotIndex: 3, nationality: 'USA', fact: 'His three-run homer off Mitch Williams in the 9th turned a 6-5 deficit into an 8-6 win.' },
      { name: 'Paul Molitor', slotIndex: 2, nationality: 'USA', fact: 'Homered, tripled and scored three runs as the DH.' },
      { name: 'Roberto Alomar', slotIndex: 5, nationality: 'Puerto Rico', fact: 'Had three hits, one a double off Terry Mulholland.' },
    ],
    source: 'baseball-almanac box 199310230TOR + baseball-reference box TOR199310230: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 18. 1993 World Series Game 6, Philadelphia Phillies (Joe Carter's walk-off)
  // Trap: Pete Incaviglia did not start in left: Milt Thompson did.
  {
    id: 'ws-1993-g6-phi',
    dateLabel: '1993 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1993-10-23',
    team: 'Philadelphia Phillies',
    opponent: 'Toronto Blue Jays',
    scoreLine: 'Blue Jays 8-6 Phillies',
    venue: 'SkyDome, Toronto',
    slots: [
      S('CF', 'Lenny Dykstra'),
      S('DH', 'Mariano Duncan'),
      S('1B', 'John Kruk'),
      S('3B', 'Dave Hollins'),
      S('C', 'Darren Daulton'),
      S('RF', 'Jim Eisenreich'),
      S('LF', 'Milt Thompson'),
      S('SS', 'Kevin Stocker'),
      S('2B', 'Mickey Morandini'),
    ],
    blankCandidates: [
      { name: 'Lenny Dykstra', slotIndex: 0, nationality: 'USA', fact: 'Hit a three-run homer off Dave Stewart in the 7th.' },
      { name: 'Milt Thompson', slotIndex: 6, nationality: 'USA', fact: 'Started in left; Pete Incaviglia pinch-hit for him and drove in a run with a sacrifice fly.' },
      { name: 'Darren Daulton', slotIndex: 4, nationality: 'USA', fact: 'Caught the whole game and doubled off Dave Stewart.' },
    ],
    source: 'baseball-almanac box 199310230TOR + baseball-reference box TOR199310230: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 19. 1960 World Series Game 7, Pittsburgh Pirates (the Mazeroski game)
  // Trap: Hal Smith, whose three-run homer in the 8th set up the finish, did not start: Smoky Burgess caught.
  {
    id: 'ws-1960-g7-pit',
    dateLabel: '1960 World Series, Game 7',
    competition: 'World Series',
    matchDate: '1960-10-13',
    team: 'Pittsburgh Pirates',
    opponent: 'New York Yankees',
    scoreLine: 'Pirates 10-9 Yankees',
    venue: 'Forbes Field, Pittsburgh',
    slots: [
      S('CF', 'Bill Virdon'),
      S('SS', 'Dick Groat'),
      S('LF', 'Bob Skinner'),
      S('1B', 'Rocky Nelson'),
      S('RF', 'Roberto Clemente'),
      S('C', 'Smoky Burgess'),
      S('3B', 'Don Hoak'),
      S('2B', 'Bill Mazeroski'),
      S('P', 'Vern Law'),
    ],
    blankCandidates: [
      { name: 'Bill Mazeroski', slotIndex: 7, nationality: 'USA', fact: 'Led off the bottom of the 9th with a walk-off homer off Ralph Terry.' },
      { name: 'Smoky Burgess', slotIndex: 5, nationality: 'USA', fact: 'Started at catcher; Hal Smith, whose three-run homer came in the 8th, only entered after Burgess was pinch-run for.' },
      { name: 'Rocky Nelson', slotIndex: 3, nationality: 'USA', fact: 'Hit a two-run homer off Bob Turley in the 1st.' },
    ],
    source: 'baseball-almanac box 196010130PIT + baseball-reference box PIT196010130: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 20. 1960 World Series Game 7, New York Yankees (the Mazeroski game)
  // Trap: Johnny Blanchard caught, not Elston Howard, and Yogi Berra played left field.
  {
    id: 'ws-1960-g7-nyy',
    dateLabel: '1960 World Series, Game 7',
    competition: 'World Series',
    matchDate: '1960-10-13',
    team: 'New York Yankees',
    opponent: 'Pittsburgh Pirates',
    scoreLine: 'Pirates 10-9 Yankees',
    venue: 'Forbes Field, Pittsburgh',
    slots: [
      S('2B', 'Bobby Richardson'),
      S('SS', 'Tony Kubek'),
      S('RF', 'Roger Maris'),
      S('CF', 'Mickey Mantle'),
      S('LF', 'Yogi Berra'),
      S('1B', 'Bill Skowron'),
      S('C', 'Johnny Blanchard'),
      S('3B', 'Clete Boyer'),
      S('P', 'Bob Turley'),
    ],
    blankCandidates: [
      { name: 'Johnny Blanchard', slotIndex: 6, nationality: 'USA', fact: 'Started at catcher and drove in a run; Elston Howard did not play.' },
      { name: 'Yogi Berra', slotIndex: 4, nationality: 'USA', fact: 'Played left field and hit a three-run homer off Roy Face in the 6th.' },
      { name: 'Bob Turley', slotIndex: 8, nationality: 'USA', fact: 'Started but lasted one inning, Rocky Nelson\'s two-run homer came off him in the 1st.' },
    ],
    source: 'baseball-almanac box 196010130PIT + baseball-reference box PIT196010130: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 21. 2014 World Series Game 7, San Francisco Giants (Bumgarner from the bullpen)
  // Trap: Madison Bumgarner did not start: Tim Hudson did, and Bumgarner threw five scoreless innings in relief.
  {
    id: 'ws-2014-g7-sf',
    dateLabel: '2014 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2014-10-29',
    team: 'San Francisco Giants',
    opponent: 'Kansas City Royals',
    scoreLine: 'Giants 3-2 Royals',
    venue: 'Kauffman Stadium, Kansas City',
    slots: [
      S('CF', 'Gregor Blanco'),
      S('2B', 'Joe Panik'),
      S('C', 'Buster Posey'),
      S('3B', 'Pablo Sandoval'),
      S('RF', 'Hunter Pence'),
      S('1B', 'Brandon Belt'),
      S('DH', 'Mike Morse'),
      S('SS', 'Brandon Crawford'),
      S('LF', 'Juan Perez'),
    ],
    blankCandidates: [
      { name: 'Mike Morse', slotIndex: 6, nationality: 'USA', fact: 'Drove in two of the Giants\' three runs as the DH, one with a sacrifice fly.' },
      { name: 'Pablo Sandoval', slotIndex: 3, nationality: 'Venezuela', fact: 'Had three hits, one a double off Wade Davis.' },
      { name: 'Buster Posey', slotIndex: 2, nationality: 'USA', fact: 'Caught the whole game, including Madison Bumgarner\'s five scoreless innings in relief.' },
    ],
    source: 'baseball-almanac box 201410290KCA + baseball-reference box KCA201410290: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 22. 2014 World Series Game 7, Kansas City Royals (Bumgarner from the bullpen)
  // Trap: Nori Aoki batted second in right, Lorenzo Cain played center.
  {
    id: 'ws-2014-g7-kc',
    dateLabel: '2014 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2014-10-29',
    team: 'Kansas City Royals',
    opponent: 'San Francisco Giants',
    scoreLine: 'Giants 3-2 Royals',
    venue: 'Kauffman Stadium, Kansas City',
    slots: [
      S('SS', 'Alcides Escobar'),
      S('RF', 'Nori Aoki'),
      S('CF', 'Lorenzo Cain'),
      S('1B', 'Eric Hosmer'),
      S('DH', 'Billy Butler'),
      S('LF', 'Alex Gordon'),
      S('C', 'Salvador Perez'),
      S('3B', 'Mike Moustakas'),
      S('2B', 'Omar Infante'),
    ],
    blankCandidates: [
      { name: 'Alex Gordon', slotIndex: 5, nationality: 'USA', fact: 'Had two hits, one a double off Tim Hudson, and drove in a run.' },
      { name: 'Omar Infante', slotIndex: 8, nationality: 'Venezuela', fact: 'Drove in a run with a sacrifice fly off Tim Hudson.' },
      { name: 'Nori Aoki', slotIndex: 1, nationality: 'Japan', fact: 'Batted second and started in right field.' },
    ],
    source: 'baseball-almanac box 201410290KCA + baseball-reference box KCA201410290: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 23. 1977 World Series Game 6, New York Yankees (three Reggie Jackson homers)
  // Trap: No DH in this Series: Mike Torrez batted ninth and pitched all nine innings.
  {
    id: 'ws-1977-g6-nyy',
    dateLabel: '1977 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1977-10-18',
    team: 'New York Yankees',
    opponent: 'Los Angeles Dodgers',
    scoreLine: 'Yankees 8-4 Dodgers',
    venue: 'Yankee Stadium, New York',
    slots: [
      S('CF', 'Mickey Rivers'),
      S('2B', 'Willie Randolph'),
      S('C', 'Thurman Munson'),
      S('RF', 'Reggie Jackson'),
      S('1B', 'Chris Chambliss'),
      S('3B', 'Graig Nettles'),
      S('LF', 'Lou Piniella'),
      S('SS', 'Bucky Dent'),
      S('P', 'Mike Torrez'),
    ],
    blankCandidates: [
      { name: 'Reggie Jackson', slotIndex: 3, nationality: 'USA', fact: 'Homered three times, off Burt Hooton, Elias Sosa and Charlie Hough.' },
      { name: 'Chris Chambliss', slotIndex: 4, nationality: 'USA', fact: 'Hit a two-run homer off Burt Hooton in the 2nd and added a double.' },
      { name: 'Mike Torrez', slotIndex: 8, nationality: 'USA', fact: 'Pitched all nine innings and got the win.' },
    ],
    source: 'baseball-almanac box 197710180NYA + baseball-reference box NYA197710180: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 24. 1977 World Series Game 6, Los Angeles Dodgers (three Reggie Jackson homers)
  // Trap: Steve Garvey batted fifth, behind Reggie Smith and Ron Cey.
  {
    id: 'ws-1977-g6-lad',
    dateLabel: '1977 World Series, Game 6',
    competition: 'World Series',
    matchDate: '1977-10-18',
    team: 'Los Angeles Dodgers',
    opponent: 'New York Yankees',
    scoreLine: 'Yankees 8-4 Dodgers',
    venue: 'Yankee Stadium, New York',
    slots: [
      S('2B', 'Davey Lopes'),
      S('SS', 'Bill Russell'),
      S('RF', 'Reggie Smith'),
      S('3B', 'Ron Cey'),
      S('1B', 'Steve Garvey'),
      S('LF', 'Dusty Baker'),
      S('CF', 'Rick Monday'),
      S('C', 'Steve Yeager'),
      S('P', 'Burt Hooton'),
    ],
    blankCandidates: [
      { name: 'Burt Hooton', slotIndex: 8, nationality: 'USA', fact: 'Started and took the loss, charged with four runs in three innings.' },
      { name: 'Steve Garvey', slotIndex: 4, nationality: 'USA', fact: 'Tripled off Mike Torrez and drove in two runs.' },
      { name: 'Reggie Smith', slotIndex: 2, nationality: 'USA', fact: 'Homered off Mike Torrez in the 3rd.' },
    ],
    source: 'baseball-almanac box 197710180NYA + baseball-reference box NYA197710180: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 25. 2017 World Series Game 7, Houston Astros (Houston's first title)
  // Trap: NL park, no DH: Lance McCullers Jr. batted ninth, and Charlie Morton, who got the win, did not start.
  {
    id: 'ws-2017-g7-hou',
    dateLabel: '2017 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2017-11-01',
    team: 'Houston Astros',
    opponent: 'Los Angeles Dodgers',
    scoreLine: 'Astros 5-1 Dodgers',
    venue: 'Dodger Stadium, Los Angeles',
    slots: [
      S('CF', 'George Springer'),
      S('3B', 'Alex Bregman'),
      S('2B', 'Jose Altuve'),
      S('SS', 'Carlos Correa'),
      S('1B', 'Yuli Gurriel'),
      S('C', 'Brian McCann'),
      S('LF', 'Marwin Gonzalez'),
      S('RF', 'Josh Reddick'),
      S('P', 'Lance McCullers Jr.'),
    ],
    blankCandidates: [
      { name: 'George Springer', slotIndex: 0, nationality: 'USA', fact: 'Doubled and hit a two-run homer off Yu Darvish in the 2nd.' },
      { name: 'Brian McCann', slotIndex: 5, nationality: 'USA', fact: 'Caught all nine innings as five Houston pitchers held the Dodgers to one run.' },
      { name: 'Marwin Gonzalez', slotIndex: 6, nationality: 'Venezuela', fact: 'Had two hits, one a double off Yu Darvish.' },
    ],
    source: 'baseball-almanac box 201711010LAN + baseball-reference box LAN201711010: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 26. 2017 World Series Game 7, Los Angeles Dodgers (Houston's first title)
  // Trap: Clayton Kershaw did not start: Yu Darvish did, and Kershaw came on in relief.
  {
    id: 'ws-2017-g7-lad',
    dateLabel: '2017 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2017-11-01',
    team: 'Los Angeles Dodgers',
    opponent: 'Houston Astros',
    scoreLine: 'Astros 5-1 Dodgers',
    venue: 'Dodger Stadium, Los Angeles',
    slots: [
      S('CF', 'Chris Taylor'),
      S('SS', 'Corey Seager'),
      S('3B', 'Justin Turner'),
      S('1B', 'Cody Bellinger'),
      S('RF', 'Yasiel Puig'),
      S('LF', 'Joc Pederson'),
      S('2B', 'Logan Forsythe'),
      S('C', 'Austin Barnes'),
      S('P', 'Yu Darvish'),
    ],
    blankCandidates: [
      { name: 'Yu Darvish', slotIndex: 8, nationality: 'Japan', fact: 'Started but got only five outs; Clayton Kershaw later threw four scoreless innings in relief.' },
      { name: 'Joc Pederson', slotIndex: 5, nationality: 'USA', fact: 'Scored the Dodgers\' only run.' },
      { name: 'Chris Taylor', slotIndex: 0, nationality: 'USA', fact: 'Led off and doubled off Lance McCullers Jr.' },
    ],
    source: 'baseball-almanac box 201711010LAN + baseball-reference box LAN201711010: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 27. 2019 World Series Game 7, Washington Nationals (Washington's first title)
  // Trap: Howie Kendrick was the DH, not at second: Asdrubal Cabrera started there.
  {
    id: 'ws-2019-g7-wsh',
    dateLabel: '2019 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2019-10-30',
    team: 'Washington Nationals',
    opponent: 'Houston Astros',
    scoreLine: 'Nationals 6-2 Astros',
    venue: 'Minute Maid Park, Houston',
    slots: [
      S('SS', 'Trea Turner'),
      S('RF', 'Adam Eaton'),
      S('3B', 'Anthony Rendon'),
      S('LF', 'Juan Soto'),
      S('DH', 'Howie Kendrick'),
      S('2B', 'Asdrubal Cabrera'),
      S('1B', 'Ryan Zimmerman'),
      S('C', 'Yan Gomes'),
      S('CF', 'Victor Robles'),
    ],
    blankCandidates: [
      { name: 'Howie Kendrick', slotIndex: 4, nationality: 'USA', fact: 'His two-run homer off Will Harris in the 7th turned a 2-1 deficit into a 3-2 lead.' },
      { name: 'Anthony Rendon', slotIndex: 2, nationality: 'USA', fact: 'His homer off Zack Greinke in the 7th was Washington\'s first run.' },
      { name: 'Yan Gomes', slotIndex: 7, nationality: 'Brazil', fact: 'Caught all nine innings, from Max Scherzer\'s start to Daniel Hudson\'s ninth.' },
    ],
    source: 'baseball-almanac box 201910300HOA + baseball-reference box HOU201910300: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 28. 2019 World Series Game 7, Houston Astros (Washington's first title)
  // Trap: Jake Marisnick did not start: Josh Reddick was in right and Springer in center.
  {
    id: 'ws-2019-g7-hou',
    dateLabel: '2019 World Series, Game 7',
    competition: 'World Series',
    matchDate: '2019-10-30',
    team: 'Houston Astros',
    opponent: 'Washington Nationals',
    scoreLine: 'Nationals 6-2 Astros',
    venue: 'Minute Maid Park, Houston',
    slots: [
      S('CF', 'George Springer'),
      S('2B', 'Jose Altuve'),
      S('LF', 'Michael Brantley'),
      S('3B', 'Alex Bregman'),
      S('1B', 'Yuli Gurriel'),
      S('DH', 'Yordan Alvarez'),
      S('SS', 'Carlos Correa'),
      S('C', 'Robinson Chirinos'),
      S('RF', 'Josh Reddick'),
    ],
    blankCandidates: [
      { name: 'Yuli Gurriel', slotIndex: 4, nationality: 'Cuba', fact: 'Led off the 2nd with a homer off Max Scherzer.' },
      { name: 'Carlos Correa', slotIndex: 6, nationality: 'Puerto Rico', fact: 'Had two hits and drove in a run.' },
      { name: 'Josh Reddick', slotIndex: 8, nationality: 'USA', fact: 'Started in right field; Jake Marisnick later pinch-hit for him.' },
    ],
    source: 'baseball-almanac box 201910300HOA + baseball-reference box HOU201910300: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 29. 1956 World Series Game 5, New York Yankees (Larsen's perfect game)
  // Trap: No DH in 1956: Don Larsen batted ninth on the day he was perfect.
  {
    id: 'ws-1956-g5-nyy',
    dateLabel: '1956 World Series, Game 5',
    competition: 'World Series',
    matchDate: '1956-10-08',
    team: 'New York Yankees',
    opponent: 'Brooklyn Dodgers',
    scoreLine: 'Yankees 2-0 Dodgers',
    venue: 'Yankee Stadium, New York',
    slots: [
      S('RF', 'Hank Bauer'),
      S('1B', 'Joe Collins'),
      S('CF', 'Mickey Mantle'),
      S('C', 'Yogi Berra'),
      S('LF', 'Enos Slaughter'),
      S('2B', 'Billy Martin'),
      S('SS', 'Gil McDougald'),
      S('3B', 'Andy Carey'),
      S('P', 'Don Larsen'),
    ],
    blankCandidates: [
      { name: 'Don Larsen', slotIndex: 8, nationality: 'USA', fact: 'Threw a perfect game: nine innings, no hits, no walks, seven strikeouts.' },
      { name: 'Yogi Berra', slotIndex: 3, nationality: 'USA', fact: 'Caught every pitch of Don Larsen\'s perfect game.' },
      { name: 'Mickey Mantle', slotIndex: 2, nationality: 'USA', fact: 'Homered off Sal Maglie in the 4th.' },
    ],
    source: 'baseball-almanac box 195610080NYA + baseball-reference box NYA195610080: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },

  // 30. 1956 World Series Game 5, Brooklyn Dodgers (Larsen's perfect game)
  // Trap: Jackie Robinson played third base, not second: Jim Gilliam led off at second.
  {
    id: 'ws-1956-g5-bro',
    dateLabel: '1956 World Series, Game 5',
    competition: 'World Series',
    matchDate: '1956-10-08',
    team: 'Brooklyn Dodgers',
    opponent: 'New York Yankees',
    scoreLine: 'Yankees 2-0 Dodgers',
    venue: 'Yankee Stadium, New York',
    slots: [
      S('2B', 'Jim Gilliam'),
      S('SS', 'Pee Wee Reese'),
      S('CF', 'Duke Snider'),
      S('3B', 'Jackie Robinson'),
      S('1B', 'Gil Hodges'),
      S('LF', 'Sandy Amoros'),
      S('RF', 'Carl Furillo'),
      S('C', 'Roy Campanella'),
      S('P', 'Sal Maglie'),
    ],
    blankCandidates: [
      { name: 'Sal Maglie', slotIndex: 8, nationality: 'USA', fact: 'Allowed two runs in eight innings and still took the loss.' },
      { name: 'Jackie Robinson', slotIndex: 3, nationality: 'USA', fact: 'Played third base and batted cleanup.' },
      { name: 'Sandy Amoros', slotIndex: 5, nationality: 'Cuba', fact: 'Started in left field and batted sixth.' },
    ],
    source: 'baseball-almanac box 195610080NYA + baseball-reference box NYA195610080: both list the same nine in the same order (matched by player id). Checked facts and birthplaces: scripts/data/missingNineSources.json.',
  },
];

// ---------------------------------------------------------------------------
// Puzzle selection, daily (ET-seeded, sitewide convention) + unlimited.
// ---------------------------------------------------------------------------

export function getDailyNinePuzzle(): ActiveNinePuzzle {
  const seed = dateSeed(getTodayET());
  const lineup = NINE_LINEUPS[dailyIndex(getTodayET(), NINE_LINEUPS.length)];
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
