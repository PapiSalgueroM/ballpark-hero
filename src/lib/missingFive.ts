import { foldSpecialLatin } from '@/lib/nameFold';
import { dailyIndex, dateSeed, getTodayET } from '@/lib/dateUtils';

/**
 * Missing Five (task #39, the NBA port of Missing XI): a famous real NBA
 * starting five is shown with ONE player blanked out. 3 guesses, hint ladder,
 * 100/70/40 scoring, same mechanic as /missing-xi.
 *
 * CONTENT VERIFICATION METHOD (same discipline as src/lib/missingXi.ts):
 * Round 949 read every sheet on two hosts: the basketball-reference.com box
 * score Starters block and the nba.com box score starters block (for 1998,
 * where nba.com has no box, statmuse.com). Each source string names both
 * hosts, scripts/simMissingFiveSources.mjs fails a sheet that names fewer,
 * and the per-sheet record is docs/audits/MISSING-FIVE-SOURCES-2026-10-03.md.
 * A blank's nationality ships only when the bref birthplace and the nba.com
 * COUNTRY agree. The traps here are the whole point and were double-confirmed:
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
    source: 'basketball-reference.com box 201606190GSW Starters (Kyrie Irving/J.R. Smith/LeBron James/Kevin Love/Tristan Thompson) + nba.com box 0041500407 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 201606190GSW Starters (Stephen Curry/Klay Thompson/Harrison Barnes/Draymond Green/Festus Ezeli) + nba.com box 0041500407 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 199806140UTA Starters (Ron Harper/Michael Jordan/Scottie Pippen/Toni Kukoc/Luc Longley) + statmuse.com starters answer for June 14 1998 (nba.com has no box for a 1990s Finals game), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 199806140UTA Starters (John Stockton/Jeff Hornacek/Bryon Russell/Karl Malone/Adam Keefe) + statmuse.com starters answer for June 14 1998 (nba.com has no box for a 1990s Finals game), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 202306120DEN Starters (Jamal Murray/Kentavious Caldwell-Pope/Michael Porter Jr./Aaron Gordon/Nikola Jokic) + nba.com box 0042200405 starters block (first five rows), both read 2026-10-03.',
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
      { name: 'Gabe Vincent', slotIndex: 0, nationality: 'USA', fact: 'An undrafted starter in an NBA Finals game, peak Heat culture.' },
      { name: 'Max Strus', slotIndex: 1, nationality: 'USA', fact: 'Undrafted out of DePaul, starting in the Finals.' },
      { name: 'Kevin Love', slotIndex: 3, nationality: 'USA', fact: 'Reinserted into the starting lineup mid-series, the documented Spoelstra adjustment.' },
    ],
    source: 'basketball-reference.com box 202306120DEN Starters (Gabe Vincent/Max Strus/Jimmy Butler/Kevin Love/Bam Adebayo) + nba.com box 0042200405 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 201306200MIA Starters (Tony Parker/Manu Ginobili/Danny Green/Kawhi Leonard/Tim Duncan) + nba.com box 0041200407 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 201306200MIA Starters (Mario Chalmers/Dwyane Wade/Mike Miller/LeBron James/Chris Bosh) + nba.com box 0041200407 starters block (first five rows), both read 2026-10-03.',
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
      { name: 'Lamar Odom', slotIndex: 3, nationality: 'USA' },
      { name: 'Pau Gasol', slotIndex: 4, nationality: 'Spain', fact: 'Traded to L.A. that February, the Finals rematch two years later ended differently.' },
    ],
    source: 'basketball-reference.com box 200806170BOS Starters (Derek Fisher/Kobe Bryant/Vladimir Radmanovic/Lamar Odom/Pau Gasol) + nba.com box 0040700406 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 200806170BOS Starters (Rajon Rondo/Ray Allen/Paul Pierce/Kevin Garnett/Kendrick Perkins) + nba.com box 0040700406 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 201106120MIA Starters (Jason Kidd/J.J. Barea/Shawn Marion/Dirk Nowitzki/Tyson Chandler) + nba.com box 0041000406 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 201106120MIA Starters (Mario Chalmers/Dwyane Wade/LeBron James/Chris Bosh/Joel Anthony) + nba.com box 0041000406 starters block (first five rows), both read 2026-10-03.',
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
    source: 'basketball-reference.com box 201906130GSW Starters (Kyle Lowry/Danny Green/Kawhi Leonard/Pascal Siakam/Marc Gasol) + nba.com box 0041800406 starters block (first five rows), both read 2026-10-03.',
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
      { name: 'Draymond Green', slotIndex: 3, nationality: 'USA', fact: 'Had a triple-double in Game 6 anyway: 11 points, 19 rebounds, 13 assists.' },
    ],
    source: 'basketball-reference.com box 201906130GSW Starters (Stephen Curry/Klay Thompson/Andre Iguodala/Draymond Green/Kevon Looney) + nba.com box 0041800406 starters block (first five rows), both read 2026-10-03.',
  },

  // Round 949: 26 more Finals sheets, read on two hosts (see the record named above).
  // 2010 NBA Finals, Game 7, Boston Celtics
  {
    id: 'finals-2010-g7-bos',
    dateLabel: '2010 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2010-06-17',
    team: 'Boston Celtics',
    opponent: 'Los Angeles Lakers',
    scoreLine: 'Lakers 83-79 Celtics',
    venue: 'STAPLES Center, Los Angeles',
    slots: [
      PG('Rajon Rondo'),
      SG('Ray Allen'),
      SF('Paul Pierce'),
      PF('Kevin Garnett'),
      C('Rasheed Wallace'),
    ],
    blankCandidates: [
      { name: 'Rasheed Wallace', slotIndex: 4, nationality: 'USA', fact: 'Started in Game 7 and put up 11 points and 8 rebounds.' },
      { name: 'Rajon Rondo', slotIndex: 0, nationality: 'USA', fact: 'Finished Game 7 with 14 points, 8 rebounds and 10 assists.' },
      { name: 'Ray Allen', slotIndex: 1, nationality: 'USA', fact: 'Played 45 minutes of Game 7 and scored 13.' },
    ],
    source: 'basketball-reference.com box 201006170LAL Starters (Rajon Rondo/Ray Allen/Paul Pierce/Kevin Garnett/Rasheed Wallace) + nba.com box 0040900407 starters block (first five rows), both read 2026-10-03.',
  },

  // 2010 NBA Finals, Game 7, Los Angeles Lakers
  {
    id: 'finals-2010-g7-lal',
    dateLabel: '2010 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2010-06-17',
    team: 'Los Angeles Lakers',
    opponent: 'Boston Celtics',
    scoreLine: 'Lakers 83-79 Celtics',
    venue: 'STAPLES Center, Los Angeles',
    slots: [
      PG('Derek Fisher'),
      SG('Kobe Bryant'),
      SF('Ron Artest'),
      PF('Pau Gasol'),
      C('Andrew Bynum'),
    ],
    blankCandidates: [
      { name: 'Andrew Bynum', slotIndex: 4, nationality: 'USA', fact: 'Started Game 7 but played just 19 minutes, scoring 2.' },
      { name: 'Derek Fisher', slotIndex: 0, nationality: 'USA', fact: 'Scored 10 in the Game 7 win.' },
      { name: 'Pau Gasol', slotIndex: 3, nationality: 'Spain', fact: 'Pulled down 18 rebounds, plus 19 points, in the Game 7 win.' },
    ],
    source: 'basketball-reference.com box 201006170LAL Starters (Derek Fisher/Kobe Bryant/Ron Artest/Pau Gasol/Andrew Bynum) + nba.com box 0040900407 starters block (first five rows), both read 2026-10-03.',
  },

  // 2005 NBA Finals, Game 7, Detroit Pistons
  {
    id: 'finals-2005-g7-det',
    dateLabel: '2005 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2005-06-23',
    team: 'Detroit Pistons',
    opponent: 'San Antonio Spurs',
    scoreLine: 'Spurs 81-74 Pistons',
    venue: 'SBC Center, San Antonio',
    slots: [
      PG('Chauncey Billups'),
      SG('Richard Hamilton'),
      SF('Tayshaun Prince'),
      PF('Rasheed Wallace'),
      C('Ben Wallace'),
    ],
    blankCandidates: [
      { name: 'Tayshaun Prince', slotIndex: 2, nationality: 'USA', fact: 'Started and scored 9 in Game 7.' },
      { name: 'Richard Hamilton', slotIndex: 1, nationality: 'USA', fact: 'Scored 15 with 8 rebounds in Game 7.' },
      { name: 'Chauncey Billups', slotIndex: 0, nationality: 'USA', fact: 'Had 13 points and 8 assists in Game 7.' },
    ],
    source: 'basketball-reference.com box 200506230SAS Starters (Chauncey Billups/Richard Hamilton/Tayshaun Prince/Rasheed Wallace/Ben Wallace) + nba.com box 0040400407 starters block (first five rows), both read 2026-10-03.',
  },

  // 2005 NBA Finals, Game 7, San Antonio Spurs
  {
    id: 'finals-2005-g7-sas',
    dateLabel: '2005 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2005-06-23',
    team: 'San Antonio Spurs',
    opponent: 'Detroit Pistons',
    scoreLine: 'Spurs 81-74 Pistons',
    venue: 'SBC Center, San Antonio',
    slots: [
      PG('Tony Parker'),
      SG('Manu Ginobili'),
      SF('Bruce Bowen'),
      PF('Tim Duncan'),
      C('Nazr Mohammed'),
    ],
    blankCandidates: [
      { name: 'Nazr Mohammed', slotIndex: 4, nationality: 'USA', fact: 'Started in Game 7 and finished with 0 points and 7 rebounds.' },
      { name: 'Bruce Bowen', slotIndex: 2, nationality: 'USA', fact: 'Started in Game 7 and scored 5.' },
      { name: 'Manu Ginobili', slotIndex: 1, nationality: 'Argentina', fact: 'Scored 23 as a starter in Game 7.' },
    ],
    source: 'basketball-reference.com box 200506230SAS Starters (Tony Parker/Manu Ginobili/Bruce Bowen/Tim Duncan/Nazr Mohammed) + nba.com box 0040400407 starters block (first five rows), both read 2026-10-03.',
  },

  // 2014 NBA Finals, Game 5, Miami Heat
  {
    id: 'finals-2014-g5-mia',
    dateLabel: '2014 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2014-06-15',
    team: 'Miami Heat',
    opponent: 'San Antonio Spurs',
    scoreLine: 'Spurs 104-87 Heat',
    venue: 'AT&T Center, San Antonio',
    slots: [
      PG('Dwyane Wade'),
      SG('Ray Allen'),
      SF('LeBron James'),
      PF('Rashard Lewis'),
      C('Chris Bosh'),
    ],
    blankCandidates: [
      { name: 'Rashard Lewis', slotIndex: 3, nationality: 'USA', fact: 'Started Game 5 but played only 9 minutes.' },
      { name: 'Ray Allen', slotIndex: 1, nationality: 'USA', fact: 'Started Game 5 and scored 5.' },
      { name: 'Chris Bosh', slotIndex: 4, nationality: 'USA', fact: 'Had 13 points and 7 rebounds in Game 5.' },
    ],
    source: 'basketball-reference.com box 201406150SAS Starters (Dwyane Wade/Ray Allen/LeBron James/Rashard Lewis/Chris Bosh) + nba.com box 0041300405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2014 NBA Finals, Game 5, San Antonio Spurs
  {
    id: 'finals-2014-g5-sas',
    dateLabel: '2014 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2014-06-15',
    team: 'San Antonio Spurs',
    opponent: 'Miami Heat',
    scoreLine: 'Spurs 104-87 Heat',
    venue: 'AT&T Center, San Antonio',
    slots: [
      PG('Tony Parker'),
      SG('Danny Green'),
      SF('Kawhi Leonard'),
      PF('Boris Diaw'),
      C('Tim Duncan'),
    ],
    blankCandidates: [
      { name: 'Boris Diaw', slotIndex: 3, nationality: 'France', fact: 'Started in Game 5 with 9 rebounds and 6 assists.' },
      { name: 'Danny Green', slotIndex: 1, nationality: 'USA', fact: 'Started Game 5 and finished with 0 points.' },
      { name: 'Kawhi Leonard', slotIndex: 2, nationality: 'USA', fact: 'Scored 22 with 10 rebounds in Game 5.' },
    ],
    source: 'basketball-reference.com box 201406150SAS Starters (Tony Parker/Danny Green/Kawhi Leonard/Boris Diaw/Tim Duncan) + nba.com box 0041300405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2015 NBA Finals, Game 6, Golden State Warriors
  {
    id: 'finals-2015-g6-gsw',
    dateLabel: '2015 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2015-06-16',
    team: 'Golden State Warriors',
    opponent: 'Cleveland Cavaliers',
    scoreLine: 'Warriors 105-97 Cavaliers',
    venue: 'Quicken Loans Arena, Cleveland',
    slots: [
      PG('Stephen Curry'),
      SG('Klay Thompson'),
      SF('Andre Iguodala'),
      PF('Harrison Barnes'),
      C('Draymond Green'),
    ],
    blankCandidates: [
      { name: 'Andre Iguodala', slotIndex: 2, nationality: 'USA', fact: 'Started Game 6 and scored 25.' },
      { name: 'Harrison Barnes', slotIndex: 3, nationality: 'USA', fact: 'Started and scored 9 in Game 6.' },
      { name: 'Draymond Green', slotIndex: 4, nationality: 'USA', fact: 'Had a triple-double in Game 6: 16 points, 11 rebounds, 10 assists.' },
    ],
    source: 'basketball-reference.com box 201506160CLE Starters (Stephen Curry/Klay Thompson/Andre Iguodala/Harrison Barnes/Draymond Green) + nba.com box 0041400406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2015 NBA Finals, Game 6, Cleveland Cavaliers
  {
    id: 'finals-2015-g6-cle',
    dateLabel: '2015 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2015-06-16',
    team: 'Cleveland Cavaliers',
    opponent: 'Golden State Warriors',
    scoreLine: 'Warriors 105-97 Cavaliers',
    venue: 'Quicken Loans Arena, Cleveland',
    slots: [
      PG('Matthew Dellavedova'),
      SG('Iman Shumpert'),
      SF('LeBron James'),
      PF('Tristan Thompson'),
      C('Timofey Mozgov'),
    ],
    blankCandidates: [
      { name: 'Matthew Dellavedova', slotIndex: 0, nationality: 'Australia', fact: 'Started in Game 6 and played 25 minutes.' },
      { name: 'Timofey Mozgov', slotIndex: 4, nationality: 'Russia', fact: 'Put up 17 points and 12 rebounds as a starter in Game 6.' },
      { name: 'Iman Shumpert', slotIndex: 1, nationality: 'USA', fact: 'Started and scored 8 in Game 6.' },
    ],
    source: 'basketball-reference.com box 201506160CLE Starters (Matthew Dellavedova/Iman Shumpert/LeBron James/Tristan Thompson/Timofey Mozgov) + nba.com box 0041400406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2020 NBA Finals, Game 6, Los Angeles Lakers
  {
    id: 'finals-2020-g6-lal',
    dateLabel: '2020 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2020-10-11',
    team: 'Los Angeles Lakers',
    opponent: 'Miami Heat',
    scoreLine: 'Lakers 106-93 Heat',
    venue: 'AdventHealth Arena, Florida',
    slots: [
      PG('Alex Caruso'),
      SG('Kentavious Caldwell-Pope'),
      SF('Danny Green'),
      PF('LeBron James'),
      C('Anthony Davis'),
    ],
    blankCandidates: [
      { name: 'Alex Caruso', slotIndex: 0, nationality: 'USA', fact: 'Started Game 6 and played 33 minutes.' },
      { name: 'Danny Green', slotIndex: 2, nationality: 'USA', fact: 'Started Game 6 and scored 11.' },
      { name: 'Kentavious Caldwell-Pope', slotIndex: 1, nationality: 'USA', fact: 'Scored 17 as a starter in Game 6.' },
    ],
    source: 'basketball-reference.com box 202010110MIA Starters (Alex Caruso/Kentavious Caldwell-Pope/Danny Green/LeBron James/Anthony Davis) + nba.com box 0041900406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2020 NBA Finals, Game 6, Miami Heat
  {
    id: 'finals-2020-g6-mia',
    dateLabel: '2020 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2020-10-11',
    team: 'Miami Heat',
    opponent: 'Los Angeles Lakers',
    scoreLine: 'Lakers 106-93 Heat',
    venue: 'AdventHealth Arena, Florida',
    slots: [
      PG('Tyler Herro'),
      SG('Duncan Robinson'),
      SF('Jimmy Butler'),
      PF('Jae Crowder'),
      C('Bam Adebayo'),
    ],
    blankCandidates: [
      { name: 'Tyler Herro', slotIndex: 0, nationality: 'USA', fact: 'Started Game 6 and scored 7.' },
      { name: 'Duncan Robinson', slotIndex: 1, nationality: 'USA', fact: 'Started Game 6 and scored 10.' },
      { name: 'Jae Crowder', slotIndex: 3, nationality: 'USA', fact: 'Scored 12 as a starter in Game 6.' },
    ],
    source: 'basketball-reference.com box 202010110MIA Starters (Tyler Herro/Duncan Robinson/Jimmy Butler/Jae Crowder/Bam Adebayo) + nba.com box 0041900406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2021 NBA Finals, Game 6, Phoenix Suns
  {
    id: 'finals-2021-g6-phx',
    dateLabel: '2021 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2021-07-20',
    team: 'Phoenix Suns',
    opponent: 'Milwaukee Bucks',
    scoreLine: 'Bucks 105-98 Suns',
    venue: 'Fiserv Forum, Milwaukee',
    slots: [
      PG('Chris Paul'),
      SG('Devin Booker'),
      SF('Mikal Bridges'),
      PF('Jae Crowder'),
      C('Deandre Ayton'),
    ],
    blankCandidates: [
      { name: 'Jae Crowder', slotIndex: 3, nationality: 'USA', fact: 'Had 15 points and 13 rebounds in Game 6.' },
      { name: 'Mikal Bridges', slotIndex: 2, nationality: 'USA', fact: 'Started and scored 7 in Game 6.' },
      { name: 'Deandre Ayton', slotIndex: 4, nationality: 'Bahamas', fact: 'Started and scored 12 in Game 6.' },
    ],
    source: 'basketball-reference.com box 202107200MIL Starters (Chris Paul/Devin Booker/Mikal Bridges/Jae Crowder/Deandre Ayton) + nba.com box 0042000406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2021 NBA Finals, Game 6, Milwaukee Bucks
  {
    id: 'finals-2021-g6-mil',
    dateLabel: '2021 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2021-07-20',
    team: 'Milwaukee Bucks',
    opponent: 'Phoenix Suns',
    scoreLine: 'Bucks 105-98 Suns',
    venue: 'Fiserv Forum, Milwaukee',
    slots: [
      PG('Jrue Holiday'),
      SG('Khris Middleton'),
      SF('P.J. Tucker'),
      PF('Giannis Antetokounmpo'),
      C('Brook Lopez'),
    ],
    blankCandidates: [
      { name: 'P.J. Tucker', slotIndex: 2, nationality: 'USA', fact: 'Played 36 minutes in Game 6 and finished with 0 points.' },
      { name: 'Brook Lopez', slotIndex: 4, nationality: 'USA', fact: 'Started and scored 10 in Game 6.' },
      { name: 'Khris Middleton', slotIndex: 1, nationality: 'USA', fact: 'Scored 17 in Game 6.' },
    ],
    source: 'basketball-reference.com box 202107200MIL Starters (Jrue Holiday/Khris Middleton/P.J. Tucker/Giannis Antetokounmpo/Brook Lopez) + nba.com box 0042000406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2022 NBA Finals, Game 6, Golden State Warriors
  {
    id: 'finals-2022-g6-gsw',
    dateLabel: '2022 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2022-06-16',
    team: 'Golden State Warriors',
    opponent: 'Boston Celtics',
    scoreLine: 'Warriors 103-90 Celtics',
    venue: 'TD Garden, Boston',
    slots: [
      PG('Stephen Curry'),
      SG('Klay Thompson'),
      SF('Andrew Wiggins'),
      PF('Otto Porter Jr.'),
      C('Draymond Green'),
    ],
    blankCandidates: [
      { name: 'Andrew Wiggins', slotIndex: 2, nationality: 'Canada', fact: 'Played 44 minutes in Game 6 and scored 18.' },
      { name: 'Klay Thompson', slotIndex: 1, nationality: 'USA', fact: 'Scored 12 in Game 6.' },
      { name: 'Draymond Green', slotIndex: 4, nationality: 'USA', fact: 'Had 12 points, 12 rebounds and 8 assists in Game 6.' },
    ],
    source: 'basketball-reference.com box 202206160BOS Starters (Stephen Curry/Klay Thompson/Andrew Wiggins/Otto Porter Jr./Draymond Green) + nba.com box 0042100406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2022 NBA Finals, Game 6, Boston Celtics
  {
    id: 'finals-2022-g6-bos',
    dateLabel: '2022 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2022-06-16',
    team: 'Boston Celtics',
    opponent: 'Golden State Warriors',
    scoreLine: 'Warriors 103-90 Celtics',
    venue: 'TD Garden, Boston',
    slots: [
      PG('Marcus Smart'),
      SG('Jaylen Brown'),
      SF('Jayson Tatum'),
      PF('Al Horford'),
      C('Robert Williams III'),
    ],
    blankCandidates: [
      { name: 'Al Horford', slotIndex: 3, nationality: 'Dominican Republic', fact: 'Had 19 points and 14 rebounds in Game 6.' },
      { name: 'Marcus Smart', slotIndex: 0, nationality: 'USA', fact: 'Had 9 points and 9 assists in Game 6.' },
      { name: 'Jaylen Brown', slotIndex: 1, nationality: 'USA', fact: 'Scored 34 in Game 6.' },
    ],
    source: 'basketball-reference.com box 202206160BOS Starters (Marcus Smart/Jaylen Brown/Jayson Tatum/Al Horford/Robert Williams III) + nba.com box 0042100406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2024 NBA Finals, Game 5, Dallas Mavericks
  {
    id: 'finals-2024-g5-dal',
    dateLabel: '2024 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2024-06-17',
    team: 'Dallas Mavericks',
    opponent: 'Boston Celtics',
    scoreLine: 'Celtics 106-88 Mavericks',
    venue: 'TD Garden, Boston',
    slots: [
      PG('Luka Doncic'),
      SG('Kyrie Irving'),
      SF('Derrick Jones Jr.'),
      PF('P.J. Washington'),
      C('Daniel Gafford'),
    ],
    blankCandidates: [
      { name: 'Daniel Gafford', slotIndex: 4, nationality: 'USA', fact: 'Started in Game 5 but played only 11 minutes.' },
      { name: 'P.J. Washington', slotIndex: 3, nationality: 'USA', fact: 'Started in Game 5 and scored 4.' },
      { name: 'Luka Doncic', slotIndex: 0, nationality: 'Slovenia', fact: 'Had 28 points and 12 rebounds in Game 5.' },
    ],
    source: 'basketball-reference.com box 202406170BOS Starters (Luka Doncic/Kyrie Irving/Derrick Jones Jr./P.J. Washington/Daniel Gafford) + nba.com box 0042300405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2024 NBA Finals, Game 5, Boston Celtics
  {
    id: 'finals-2024-g5-bos',
    dateLabel: '2024 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2024-06-17',
    team: 'Boston Celtics',
    opponent: 'Dallas Mavericks',
    scoreLine: 'Celtics 106-88 Mavericks',
    venue: 'TD Garden, Boston',
    slots: [
      PG('Jrue Holiday'),
      SG('Derrick White'),
      SF('Jaylen Brown'),
      PF('Jayson Tatum'),
      C('Al Horford'),
    ],
    blankCandidates: [
      { name: 'Al Horford', slotIndex: 4, nationality: 'Dominican Republic', fact: 'Started Game 5 and grabbed 9 rebounds.' },
      { name: 'Derrick White', slotIndex: 1, nationality: 'USA', fact: 'Scored 14 in Game 5.' },
      { name: 'Jrue Holiday', slotIndex: 0, nationality: 'USA', fact: 'Had 15 points and 11 rebounds in Game 5.' },
    ],
    source: 'basketball-reference.com box 202406170BOS Starters (Jrue Holiday/Derrick White/Jaylen Brown/Jayson Tatum/Al Horford) + nba.com box 0042300405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2025 NBA Finals, Game 7, Indiana Pacers
  {
    id: 'finals-2025-g7-ind',
    dateLabel: '2025 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2025-06-22',
    team: 'Indiana Pacers',
    opponent: 'Oklahoma City Thunder',
    scoreLine: 'Thunder 103-91 Pacers',
    venue: 'Paycom Center, Oklahoma City',
    slots: [
      PG('Tyrese Haliburton'),
      SG('Andrew Nembhard'),
      SF('Aaron Nesmith'),
      PF('Pascal Siakam'),
      C('Myles Turner'),
    ],
    blankCandidates: [
      { name: 'Andrew Nembhard', slotIndex: 1, nationality: 'Canada', fact: 'Scored 15 as a starter in Game 7.' },
      { name: 'Aaron Nesmith', slotIndex: 2, nationality: 'USA', fact: 'Started Game 7 and pulled down 6 rebounds.' },
      { name: 'Myles Turner', slotIndex: 4, nationality: 'USA', fact: 'Started in Game 7 and scored 6.' },
    ],
    source: 'basketball-reference.com box 202506220OKC Starters (Tyrese Haliburton/Andrew Nembhard/Aaron Nesmith/Pascal Siakam/Myles Turner) + nba.com box 0042400407 starters block (first five rows), both read 2026-10-03.',
  },

  // 2025 NBA Finals, Game 7, Oklahoma City Thunder
  {
    id: 'finals-2025-g7-okc',
    dateLabel: '2025 NBA Finals, Game 7',
    competition: 'NBA Finals',
    matchDate: '2025-06-22',
    team: 'Oklahoma City Thunder',
    opponent: 'Indiana Pacers',
    scoreLine: 'Thunder 103-91 Pacers',
    venue: 'Paycom Center, Oklahoma City',
    slots: [
      PG('Shai Gilgeous-Alexander'),
      SG('Luguentz Dort'),
      SF('Jalen Williams'),
      PF('Chet Holmgren'),
      C('Isaiah Hartenstein'),
    ],
    blankCandidates: [
      { name: 'Luguentz Dort', slotIndex: 1, nationality: 'Canada', fact: 'Started Game 7 and grabbed 7 rebounds.' },
      { name: 'Jalen Williams', slotIndex: 2, nationality: 'USA', fact: 'Scored 20 in Game 7.' },
      { name: 'Chet Holmgren', slotIndex: 3, nationality: 'USA', fact: 'Had 18 points and 8 rebounds in Game 7.' },
    ],
    source: 'basketball-reference.com box 202506220OKC Starters (Shai Gilgeous-Alexander/Luguentz Dort/Jalen Williams/Chet Holmgren/Isaiah Hartenstein) + nba.com box 0042400407 starters block (first five rows), both read 2026-10-03.',
  },

  // 2009 NBA Finals, Game 5, Los Angeles Lakers
  {
    id: 'finals-2009-g5-lal',
    dateLabel: '2009 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2009-06-14',
    team: 'Los Angeles Lakers',
    opponent: 'Orlando Magic',
    scoreLine: 'Lakers 99-86 Magic',
    venue: 'Amway Arena, Orlando',
    slots: [
      PG('Derek Fisher'),
      SG('Kobe Bryant'),
      SF('Trevor Ariza'),
      PF('Pau Gasol'),
      C('Andrew Bynum'),
    ],
    blankCandidates: [
      { name: 'Trevor Ariza', slotIndex: 2, nationality: 'USA', fact: 'Started in Game 5 and scored 15.' },
      { name: 'Andrew Bynum', slotIndex: 4, nationality: 'USA', fact: 'Started but played only 17 minutes in Game 5.' },
      { name: 'Derek Fisher', slotIndex: 0, nationality: 'USA', fact: 'Scored 13 in Game 5.' },
    ],
    source: 'basketball-reference.com box 200906140ORL Starters (Derek Fisher/Kobe Bryant/Trevor Ariza/Pau Gasol/Andrew Bynum) + nba.com box 0040800405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2009 NBA Finals, Game 5, Orlando Magic
  {
    id: 'finals-2009-g5-orl',
    dateLabel: '2009 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2009-06-14',
    team: 'Orlando Magic',
    opponent: 'Los Angeles Lakers',
    scoreLine: 'Lakers 99-86 Magic',
    venue: 'Amway Arena, Orlando',
    slots: [
      PG('Rafer Alston'),
      SG('Courtney Lee'),
      SF('Hedo Turkoglu'),
      PF('Rashard Lewis'),
      C('Dwight Howard'),
    ],
    blankCandidates: [
      { name: 'Rafer Alston', slotIndex: 0, nationality: 'USA', fact: 'Started in Game 5 and scored 12.' },
      { name: 'Courtney Lee', slotIndex: 1, nationality: 'USA', fact: 'Started Game 5 and scored 12.' },
      { name: 'Hedo Turkoglu', slotIndex: 2, nationality: 'Turkey', fact: 'Scored 12 in Game 5.' },
    ],
    source: 'basketball-reference.com box 200906140ORL Starters (Rafer Alston/Courtney Lee/Hedo Turkoglu/Rashard Lewis/Dwight Howard) + nba.com box 0040800405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2004 NBA Finals, Game 5, Los Angeles Lakers
  {
    id: 'finals-2004-g5-lal',
    dateLabel: '2004 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2004-06-15',
    team: 'Los Angeles Lakers',
    opponent: 'Detroit Pistons',
    scoreLine: 'Pistons 100-87 Lakers',
    venue: 'The Palace of Auburn Hills, Auburn Hills',
    slots: [
      PG('Gary Payton'),
      SG('Kobe Bryant'),
      SF('Devean George'),
      PF('Slava Medvedenko'),
      C('Shaquille O\'Neal'),
    ],
    blankCandidates: [
      { name: 'Slava Medvedenko', slotIndex: 3, nationality: 'Ukraine', fact: 'Started in Game 5 and scored 10.' },
      { name: 'Devean George', slotIndex: 2, nationality: 'USA', fact: 'Started in Game 5 and scored 4.' },
      { name: 'Gary Payton', slotIndex: 0, nationality: 'USA', fact: 'Started in Game 5 and scored 2.' },
    ],
    source: 'basketball-reference.com box 200406150DET Starters (Gary Payton/Kobe Bryant/Devean George/Slava Medvedenko/Shaquille O\'Neal) + nba.com box 0040300405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2006 NBA Finals, Game 6, Miami Heat
  {
    id: 'finals-2006-g6-mia',
    dateLabel: '2006 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2006-06-20',
    team: 'Miami Heat',
    opponent: 'Dallas Mavericks',
    scoreLine: 'Heat 95-92 Mavericks',
    venue: 'American Airlines Center, Dallas',
    slots: [
      PG('Jason Williams'),
      SG('Dwyane Wade'),
      SF('Antoine Walker'),
      PF('Udonis Haslem'),
      C('Shaquille O\'Neal'),
    ],
    blankCandidates: [
      { name: 'Jason Williams', slotIndex: 0, nationality: 'USA', fact: 'Started in Game 6 with 7 assists.' },
      { name: 'Antoine Walker', slotIndex: 2, nationality: 'USA', fact: 'Had 14 points and 11 rebounds in Game 6.' },
      { name: 'Udonis Haslem', slotIndex: 3, nationality: 'USA', fact: 'Had 17 points and 10 rebounds in Game 6.' },
    ],
    source: 'basketball-reference.com box 200606200DAL Starters (Jason Williams/Dwyane Wade/Antoine Walker/Udonis Haslem/Shaquille O\'Neal) + nba.com box 0040500406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2006 NBA Finals, Game 6, Dallas Mavericks
  {
    id: 'finals-2006-g6-dal',
    dateLabel: '2006 NBA Finals, Game 6',
    competition: 'NBA Finals',
    matchDate: '2006-06-20',
    team: 'Dallas Mavericks',
    opponent: 'Miami Heat',
    scoreLine: 'Heat 95-92 Mavericks',
    venue: 'American Airlines Center, Dallas',
    slots: [
      PG('Devin Harris'),
      SG('Jason Terry'),
      SF('Josh Howard'),
      PF('Dirk Nowitzki'),
      C('DeSagana Diop'),
    ],
    blankCandidates: [
      { name: 'DeSagana Diop', slotIndex: 4, nationality: 'Senegal', fact: 'Started in Game 6 and played 16 minutes.' },
      { name: 'Devin Harris', slotIndex: 0, nationality: 'USA', fact: 'Started Game 6 and scored 6.' },
      { name: 'Josh Howard', slotIndex: 2, nationality: 'USA', fact: 'Had 14 points and 12 rebounds in Game 6.' },
    ],
    source: 'basketball-reference.com box 200606200DAL Starters (Devin Harris/Jason Terry/Josh Howard/Dirk Nowitzki/DeSagana Diop) + nba.com box 0040500406 starters block (first five rows), both read 2026-10-03.',
  },

  // 2012 NBA Finals, Game 5, Oklahoma City Thunder
  {
    id: 'finals-2012-g5-okc',
    dateLabel: '2012 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2012-06-21',
    team: 'Oklahoma City Thunder',
    opponent: 'Miami Heat',
    scoreLine: 'Heat 121-106 Thunder',
    venue: 'AmericanAirlines Arena, Miami',
    slots: [
      PG('Russell Westbrook'),
      SG('Thabo Sefolosha'),
      SF('Kevin Durant'),
      PF('Serge Ibaka'),
      C('Kendrick Perkins'),
    ],
    blankCandidates: [
      { name: 'Thabo Sefolosha', slotIndex: 1, nationality: 'Switzerland', fact: 'Started Game 5 but played only 9 minutes.' },
      { name: 'Kendrick Perkins', slotIndex: 4, nationality: 'USA', fact: 'Started in Game 5 and scored 2.' },
      { name: 'Russell Westbrook', slotIndex: 0, nationality: 'USA', fact: 'Scored 19 in Game 5.' },
    ],
    source: 'basketball-reference.com box 201206210MIA Starters (Russell Westbrook/Thabo Sefolosha/Kevin Durant/Serge Ibaka/Kendrick Perkins) + nba.com box 0041100405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2012 NBA Finals, Game 5, Miami Heat
  {
    id: 'finals-2012-g5-mia',
    dateLabel: '2012 NBA Finals, Game 5',
    competition: 'NBA Finals',
    matchDate: '2012-06-21',
    team: 'Miami Heat',
    opponent: 'Oklahoma City Thunder',
    scoreLine: 'Heat 121-106 Thunder',
    venue: 'AmericanAirlines Arena, Miami',
    slots: [
      PG('Mario Chalmers'),
      SG('Dwyane Wade'),
      SF('Shane Battier'),
      PF('LeBron James'),
      C('Chris Bosh'),
    ],
    blankCandidates: [
      { name: 'Shane Battier', slotIndex: 2, nationality: 'USA', fact: 'Started in Game 5 and scored 11.' },
      { name: 'Mario Chalmers', slotIndex: 0, nationality: 'USA', fact: 'Had 10 points and 7 assists in Game 5.' },
      { name: 'Chris Bosh', slotIndex: 4, nationality: 'USA', fact: 'Scored 24 in Game 5.' },
    ],
    source: 'basketball-reference.com box 201206210MIA Starters (Mario Chalmers/Dwyane Wade/Shane Battier/LeBron James/Chris Bosh) + nba.com box 0041100405 starters block (first five rows), both read 2026-10-03.',
  },

  // 2018 NBA Finals, Game 4, Golden State Warriors
  {
    id: 'finals-2018-g4-gsw',
    dateLabel: '2018 NBA Finals, Game 4',
    competition: 'NBA Finals',
    matchDate: '2018-06-08',
    team: 'Golden State Warriors',
    opponent: 'Cleveland Cavaliers',
    scoreLine: 'Warriors 108-85 Cavaliers',
    venue: 'Quicken Loans Arena, Cleveland',
    slots: [
      PG('Stephen Curry'),
      SG('Klay Thompson'),
      SF('Kevin Durant'),
      PF('Draymond Green'),
      C('JaVale McGee'),
    ],
    blankCandidates: [
      { name: 'JaVale McGee', slotIndex: 4, nationality: 'USA', fact: 'Started in Game 4 and played 16 minutes.' },
      { name: 'Klay Thompson', slotIndex: 1, nationality: 'USA', fact: 'Scored 10 in Game 4.' },
      { name: 'Draymond Green', slotIndex: 3, nationality: 'USA', fact: 'Had 9 points and 9 assists in Game 4.' },
    ],
    source: 'basketball-reference.com box 201806080CLE Starters (Stephen Curry/Klay Thompson/Kevin Durant/Draymond Green/JaVale McGee) + nba.com box 0041700404 starters block (first five rows), both read 2026-10-03.',
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
