import { foldSpecialLatin } from '@/lib/nameFold';
import { dailyIndex, dateSeed, getTodayET } from '@/lib/dateUtils';

/**
 * Missing Eleven (task #39, the NFL port of Missing XI): a famous real
 * Super Bowl STARTING UNIT (11 players, offenses AND defenses) is shown with
 * ONE name blanked. 3 guesses, hint ladder, 100/70/40 scoring, same mechanic
 * as /missing-five and /missing-nine.
 *
 * CONTENT VERIFICATION METHOD:
 * pro-football-reference hides its "Starters" tables inside HTML comments
 * (empty on plain fetch), so lineups below were extracted 2026-07-22 from the
 * CHROME-RENDERED pfr box score DOM (tables #vis_starters/#home_starters)
 * and cross-verified against the Wikipedia article's "Starting lineups"
 * table for the same game. Both sources matched 22/22 on offense for SB LI.
 *
 * ROUND 950 (sheets 19 to 40, read 2026-10-03): two hosts per sheet, and
 * Wikipedia is not one of them. The league's own game book PDF (linked from
 * the nfl.com game page, page 1 "Lineups") and the pro-football-reference.com
 * box score Starters table, both naming the same eleven men. Positions are
 * the game book's. Every row, both URLs and the evidence for each reveal
 * line are in scripts/data/missingElevenVerified2026-10.json, and
 * scripts/simMissingElevenSources.mjs holds this file to that record. A side
 * the two hosts disagree on is held out, the same rule that dropped the
 * SB XLII Giants offense and the SB 50 Panthers below.
 *
 * THE TRAPS ARE THE POINT, double-confirmed, do NOT "fix" them:
 *   - SB LI Patriots: Dion LEWIS started at RB. LeGarrette Blount and James
 *     White (three TDs incl. the OT winner) came off the bench. Rookie
 *     Malcolm MITCHELL started at WR ahead of Danny Amendola.
 *   - SB LI Falcons: Levine TOILOLO started at TE, Austin Hooper, who
 *     caught a touchdown, was not the starter.
 *
 * Guess checking is LOCAL (normalized compare against blankCandidates), no
 * database dependency. Suggestions come from the union of names in this file.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElevenSlot {
  /** Position as billed in the pfr starters table (QB/RB/FB/WR/TE/LT/LG/C/RG/RT). */
  position: string;
  name: string;
}

export interface ElevenBlankCandidate {
  name: string;
  /** Index into Lineup.slots. */
  slotIndex: number;
  nationality: string;
  /** One-line VERIFIED flavor fact shown on reveal (never invented by the UI). */
  fact?: string;
  /** Other full names a source prints for the same man (pfr's "Ben Watson"), accepted as a guess. */
  aliases?: string[];
}

export interface ElevenLineup {
  id: string;
  dateLabel: string;
  competition: string;
  matchDate: string;
  team: string;
  opponent: string;
  scoreLine: string;
  venue: string;
  /** Which side of the ball this lineup is. Missing = 'offense' (the original entries). */
  unit?: 'offense' | 'defense';
  /** Exactly 11 slots, the starting unit in the official listed order. */
  slots: ElevenSlot[];
  blankCandidates: ElevenBlankCandidate[];
  /** INTERNAL editor note on what was checked. Never rendered. */
  source: string;
}

/** Side of the ball for a lineup ('offense' when the field is omitted). */
export function elevenUnit(lineup: ElevenLineup): 'offense' | 'defense' {
  return lineup.unit ?? 'offense';
}

export interface ActiveElevenPuzzle {
  lineup: ElevenLineup;
  candidate: ElevenBlankCandidate;
}

export type ElevenHintLevel = 0 | 1 | 2 | 3;

const S = (position: string, name: string): ElevenSlot => ({ position, name });

export const ELEVEN_LINEUPS: ElevenLineup[] = [
  // 1. Super Bowl LI, New England Patriots (the 28-3 comeback offense)
  {
    id: 'sb-li-ne',
    dateLabel: 'Super Bowl LI',
    competition: 'Super Bowl',
    matchDate: '2017-02-05',
    team: 'New England Patriots',
    opponent: 'Atlanta Falcons',
    scoreLine: 'Patriots 34-28 Falcons (OT)',
    venue: 'NRG Stadium, Houston',
    // Trap: Dion Lewis started at RB; Blount and James White came off the bench.
    slots: [
      S('QB', 'Tom Brady'),
      S('RB', 'Dion Lewis'),
      S('WR', 'Malcolm Mitchell'),
      S('WR', 'Chris Hogan'),
      S('WR', 'Julian Edelman'),
      S('TE', 'Martellus Bennett'),
      S('LT', 'Nate Solder'),
      S('LG', 'Joe Thuney'),
      S('C', 'David Andrews'),
      S('RG', 'Shaq Mason'),
      S('RT', 'Marcus Cannon'),
    ],
    blankCandidates: [
      { name: 'Dion Lewis', slotIndex: 1, nationality: 'USA', fact: 'Started at running back in the 28-3 comeback, James White, who scored the overtime winner, came off the bench.' },
      { name: 'Malcolm Mitchell', slotIndex: 2, nationality: 'USA', fact: 'The rookie wideout started ahead of Danny Amendola.' },
      { name: 'Martellus Bennett', slotIndex: 5, nationality: 'USA', fact: 'Started at tight end with Gronkowski out injured for the Super Bowl run.' },
    ],
    source: 'pfr box 201702050atl #vis_starters (Chrome-rendered DOM) + Wikipedia "Super Bowl LI" Starting lineups table, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201702050atl #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 2. Super Bowl LI, Atlanta Falcons (the 28-3 offense)
  {
    id: 'sb-li-atl',
    dateLabel: 'Super Bowl LI',
    competition: 'Super Bowl',
    matchDate: '2017-02-05',
    team: 'Atlanta Falcons',
    opponent: 'New England Patriots',
    scoreLine: 'Patriots 34-28 Falcons (OT)',
    venue: 'NRG Stadium, Houston',
    // Trap: Levine Toilolo started at TE, not Austin Hooper.
    slots: [
      S('QB', 'Matt Ryan'),
      S('RB', 'Devonta Freeman'),
      S('FB', 'Patrick DiMarco'),
      S('WR', 'Julio Jones'),
      S('WR', 'Mohamed Sanu'),
      S('TE', 'Levine Toilolo'),
      S('LT', 'Jake Matthews'),
      S('LG', 'Andy Levitre'),
      S('C', 'Alex Mack'),
      S('RG', 'Chris Chester'),
      S('RT', 'Ryan Schraeder'),
    ],
    blankCandidates: [
      { name: 'Levine Toilolo', slotIndex: 5, nationality: 'USA', fact: 'Started at tight end, Austin Hooper, who caught a touchdown that night, came off the bench.' },
      { name: 'Patrick DiMarco', slotIndex: 2, nationality: 'USA', fact: 'A fullback starting a Super Bowl, the MVP-season Falcons ran a two-back look.' },
      { name: 'Mohamed Sanu', slotIndex: 4, nationality: 'USA', fact: 'Started opposite Julio Jones; Taylor Gabriel was the third receiver off the bench.' },
    ],
    source: 'pfr box 201702050atl #home_starters (Chrome-rendered DOM) + Wikipedia "Super Bowl LI" Starting lineups table, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201702050atl #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },
  // 3. Super Bowl XLIX, New England Patriots (the Malcolm Butler game)
  // Verified 2026-07-22: pfr 201502010sea #vis_starters + Wikipedia "Super
  // Bowl XLIX" Starting lineups, 11/11 match (two-TE look, Vereen at RB).
  {
    id: 'sb-xlix-ne',
    dateLabel: 'Super Bowl XLIX',
    competition: 'Super Bowl',
    matchDate: '2015-02-01',
    team: 'New England Patriots',
    opponent: 'Seattle Seahawks',
    scoreLine: 'Patriots 28-24 Seahawks',
    venue: 'University of Phoenix Stadium, Glendale',
    slots: [
      S('QB', 'Tom Brady'),
      S('RB', 'Shane Vereen'),
      S('WR', 'Brandon LaFell'),
      S('WR', 'Julian Edelman'),
      S('TE', 'Rob Gronkowski'),
      S('TE', 'Michael Hoomanawanui'),
      S('LT', 'Nate Solder'),
      S('LG', 'Dan Connolly'),
      S('C', 'Bryan Stork'),
      S('RG', 'Ryan Wendell'),
      S('RT', 'Sebastian Vollmer'),
    ],
    blankCandidates: [
      { name: 'Shane Vereen', slotIndex: 1, nationality: 'USA', fact: 'Started at running back over LeGarrette Blount in the Malcolm Butler game.' },
      { name: 'Michael Hoomanawanui', slotIndex: 5, nationality: 'USA', fact: 'The second tight end in the opening two-TE look, the surname nobody can spell.' },
      { name: 'Brandon LaFell', slotIndex: 2, nationality: 'USA', fact: 'The forgotten starter of the receiving corps alongside Edelman and Gronkowski.' },
    ],
    source: 'pfr box 201502010sea #vis_starters (Chrome DOM) + Wikipedia SB XLIX Starting lineups, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201502010sea #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 4. Super Bowl XLIX, Seattle Seahawks (the goal-line interception)
  {
    id: 'sb-xlix-sea',
    dateLabel: 'Super Bowl XLIX',
    competition: 'Super Bowl',
    matchDate: '2015-02-01',
    team: 'Seattle Seahawks',
    opponent: 'New England Patriots',
    scoreLine: 'Patriots 28-24 Seahawks',
    venue: 'University of Phoenix Stadium, Glendale',
    slots: [
      S('QB', 'Russell Wilson'),
      S('RB', 'Marshawn Lynch'),
      S('WR', 'Doug Baldwin'),
      S('WR', 'Jermaine Kearse'),
      S('WR', 'Ricardo Lockette'),
      S('TE', 'Luke Willson'),
      S('LT', 'Russell Okung'),
      S('LG', 'James Carpenter'),
      S('C', 'Max Unger'),
      S('RG', 'J.R. Sweezy'),
      S('RT', 'Justin Britt'),
    ],
    blankCandidates: [
      { name: 'Ricardo Lockette', slotIndex: 4, nationality: 'USA', fact: 'Started at receiver, and was the intended target on the goal-line interception that decided it.' },
      { name: 'Jermaine Kearse', slotIndex: 3, nationality: 'USA', fact: 'His juggling catch put Seattle at the goal line moments before the interception.' },
      { name: 'Luke Willson', slotIndex: 5, nationality: 'Canada', fact: 'The Canadian tight end from LaSalle, Ontario started with Seattle one yard from a repeat.' },
    ],
    source: 'pfr box 201502010sea #home_starters (Chrome DOM) + Wikipedia SB XLIX Starting lineups, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201502010sea #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 5. Super Bowl XLII, New England Patriots (18-1)
  // NOTE: the Giants lineup for this game is NOT shipped, pfr and Wikipedia
  // disagree on the 11th starter (Michael Matthews TE vs Steve Smith WR), so
  // it fails the two-source bar. The Patriots side matched 11/11.
  {
    id: 'sb-xlii-ne',
    dateLabel: 'Super Bowl XLII',
    competition: 'Super Bowl',
    matchDate: '2008-02-03',
    team: 'New England Patriots',
    opponent: 'New York Giants',
    scoreLine: 'Giants 17-14 Patriots',
    venue: 'University of Phoenix Stadium, Glendale',
    slots: [
      S('QB', 'Tom Brady'),
      S('RB', 'Laurence Maroney'),
      S('WR', 'Randy Moss'),
      S('WR', 'Wes Welker'),
      S('TE', 'Benjamin Watson'),
      S('TE', 'Kyle Brady'),
      S('LT', 'Matt Light'),
      S('LG', 'Logan Mankins'),
      S('C', 'Dan Koppen'),
      S('RG', 'Stephen Neal'),
      S('RT', 'Nick Kaczur'),
    ],
    blankCandidates: [
      { name: 'Laurence Maroney', slotIndex: 1, nationality: 'USA', fact: 'Started at running back for the 18-0 Patriots on the night the perfect season died.' },
      { name: 'Benjamin Watson', slotIndex: 4, nationality: 'USA', fact: 'Started at tight end for the record-setting 2007 offense.', aliases: ['Ben Watson'] },
    ],
    source: 'pfr box 200802030nwe #home_starters (Chrome DOM) + Wikipedia SB XLII Starting lineups, 11/11 match. Giants side dropped: sources disagree on the 11th starter. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 200802030nwe #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 6. Super Bowl 50, Denver Broncos (Peyton's last ride)
  // NOTE: the Panthers lineup is NOT shipped, pfr lists a 6-OL jumbo look
  // (Funchess + Daryl Williams) while Wikipedia lists 3 WR (Ginn + Brown);
  // only 9/11 agree. The Broncos side matched 11/11.
  {
    id: 'sb-50-den',
    dateLabel: 'Super Bowl 50',
    competition: 'Super Bowl',
    matchDate: '2016-02-07',
    team: 'Denver Broncos',
    opponent: 'Carolina Panthers',
    scoreLine: 'Broncos 24-10 Panthers',
    venue: "Levi's Stadium, Santa Clara",
    slots: [
      S('QB', 'Peyton Manning'),
      S('RB', 'C.J. Anderson'),
      S('WR', 'Demaryius Thomas'),
      S('WR', 'Emmanuel Sanders'),
      S('TE', 'Owen Daniels'),
      S('TE', 'Vernon Davis'),
      S('LT', 'Ryan Harris'),
      S('LG', 'Evan Mathis'),
      S('C', 'Matt Paradis'),
      S('RG', 'Louis Vasquez'),
      S('RT', 'Michael Schofield'),
    ],
    blankCandidates: [
      { name: 'C.J. Anderson', slotIndex: 1, nationality: 'USA', fact: "Scored the clinching touchdown in Peyton Manning's final game." },
      { name: 'Owen Daniels', slotIndex: 4, nationality: 'USA', fact: 'The veteran tight end started in the last game of the Manning era.' },
      { name: 'Vernon Davis', slotIndex: 5, nationality: 'USA', fact: "The former 49er started as the second tight end in Peyton's final game." },
    ],
    source: 'pfr box 201602070den #home_starters (Chrome DOM) + Wikipedia Super Bowl 50 Starting lineups, 11/11 match. Panthers side dropped: sources disagree on the receiver slots. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201602070den #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 7. Super Bowl LVII, Kansas City Chiefs (the Kelce Bowl)
  {
    id: 'sb-lvii-kc',
    dateLabel: 'Super Bowl LVII',
    competition: 'Super Bowl',
    matchDate: '2023-02-12',
    team: 'Kansas City Chiefs',
    opponent: 'Philadelphia Eagles',
    scoreLine: 'Chiefs 38-35 Eagles',
    venue: 'State Farm Stadium, Glendale',
    slots: [
      S('QB', 'Patrick Mahomes'),
      S('RB', 'Isiah Pacheco'),
      S('WR', 'Marquez Valdes-Scantling'),
      S('WR', 'JuJu Smith-Schuster'),
      S('TE', 'Travis Kelce'),
      S('TE', 'Noah Gray'),
      S('LT', 'Orlando Brown Jr.'),
      S('LG', 'Joe Thuney'),
      S('C', 'Creed Humphrey'),
      S('RG', 'Trey Smith'),
      S('RT', 'Andrew Wylie'),
    ],
    blankCandidates: [
      { name: 'Isiah Pacheco', slotIndex: 1, nationality: 'USA', fact: 'The seventh-round rookie started at running back and ran for a touchdown.' },
      { name: 'Noah Gray', slotIndex: 5, nationality: 'USA', fact: 'The second tight end behind Travis Kelce, the starter nobody remembers.' },
      { name: 'JuJu Smith-Schuster', slotIndex: 3, nationality: 'USA', fact: 'Started at receiver in his single season as a Chief.' },
    ],
    source: 'pfr box 202302120phi #vis_starters (Chrome DOM) + Wikipedia SB LVII Starting lineups, 11/11 match (wiki resolves pfr\'s generic OL labels). Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 202302120phi #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 8. Super Bowl LVII, Philadelphia Eagles
  {
    id: 'sb-lvii-phi',
    dateLabel: 'Super Bowl LVII',
    competition: 'Super Bowl',
    matchDate: '2023-02-12',
    team: 'Philadelphia Eagles',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Chiefs 38-35 Eagles',
    venue: 'State Farm Stadium, Glendale',
    slots: [
      S('QB', 'Jalen Hurts'),
      S('RB', 'Miles Sanders'),
      S('WR', 'A.J. Brown'),
      S('WR', 'DeVonta Smith'),
      S('WR', 'Quez Watkins'),
      S('TE', 'Dallas Goedert'),
      S('LT', 'Jordan Mailata'),
      S('LG', 'Landon Dickerson'),
      S('C', 'Jason Kelce'),
      S('RG', 'Isaac Seumalo'),
      S('RT', 'Lane Johnson'),
    ],
    blankCandidates: [
      { name: 'Quez Watkins', slotIndex: 4, nationality: 'USA', fact: 'The forgotten third receiver next to A.J. Brown and DeVonta Smith.' },
      { name: 'Jason Kelce', slotIndex: 8, nationality: 'USA', fact: 'Faced his brother Travis, the first brothers ever to play each other in a Super Bowl.' },
      { name: 'Jordan Mailata', slotIndex: 6, nationality: 'Australia', fact: 'The Australian former rugby league player started at left tackle.' },
    ],
    source: 'pfr box 202302120phi #home_starters (Chrome DOM) + Wikipedia SB LVII Starting lineups, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 202302120phi #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },
  // 9. Super Bowl XLV, Pittsburgh Steelers (the jumbo look)
  // Verified 2026-07-22: pfr 201102060pit #vis_starters + Wikipedia "Super
  // Bowl XLV" Starting lineups, 11/11 match (1 WR, 2 TE, FB).
  {
    id: 'sb-xlv-pit',
    dateLabel: 'Super Bowl XLV',
    competition: 'Super Bowl',
    matchDate: '2011-02-06',
    team: 'Pittsburgh Steelers',
    opponent: 'Green Bay Packers',
    scoreLine: 'Packers 31-25 Steelers',
    venue: 'Cowboys Stadium, Arlington',
    slots: [
      S('QB', 'Ben Roethlisberger'),
      S('RB', 'Rashard Mendenhall'),
      S('FB', 'David Johnson'),
      S('WR', 'Hines Ward'),
      S('TE', 'Heath Miller'),
      S('TE', 'Matt Spaeth'),
      S('LT', 'Jonathan Scott'),
      S('LG', 'Chris Kemoeatu'),
      S('C', 'Doug Legursky'),
      S('RG', 'Ramon Foster'),
      S('RT', 'Flozell Adams'),
    ],
    blankCandidates: [
      { name: 'Doug Legursky', slotIndex: 8, nationality: 'USA', fact: 'Started at center with All-Rookie Maurkice Pouncey out injured.' },
      { name: 'Rashard Mendenhall', slotIndex: 1, nationality: 'USA', fact: 'Started at running back, his fourth-quarter fumble swung the game.' },
      { name: 'David Johnson', slotIndex: 2, nationality: 'USA', fact: 'Not THAT David Johnson, the Steelers fullback in the jumbo opening look.' },
    ],
    source: 'pfr box 201102060pit #vis_starters (Chrome DOM) + Wikipedia SB XLV Starting lineups, 11/11 match. Only one WR started; Brown/Wallace off the bench. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201102060pit #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 10. Super Bowl XLV, Green Bay Packers (four wide, no tight end)
  {
    id: 'sb-xlv-gb',
    dateLabel: 'Super Bowl XLV',
    competition: 'Super Bowl',
    matchDate: '2011-02-06',
    team: 'Green Bay Packers',
    opponent: 'Pittsburgh Steelers',
    scoreLine: 'Packers 31-25 Steelers',
    venue: 'Cowboys Stadium, Arlington',
    slots: [
      S('QB', 'Aaron Rodgers'),
      S('RB', 'James Starks'),
      S('WR', 'Donald Driver'),
      S('WR', 'Greg Jennings'),
      S('WR', 'James Jones'),
      S('WR', 'Jordy Nelson'),
      S('LT', 'Chad Clifton'),
      S('LG', 'Daryn Colledge'),
      S('C', 'Scott Wells'),
      S('RG', 'Josh Sitton'),
      S('RT', 'Bryan Bulaga'),
    ],
    blankCandidates: [
      { name: 'James Starks', slotIndex: 1, nationality: 'USA', fact: 'The rookie back started with Ryan Grant on injured reserve.' },
      { name: 'Jordy Nelson', slotIndex: 5, nationality: 'USA', fact: 'One of FOUR wide receivers in the no-tight-end opening look.' },
      { name: 'James Jones', slotIndex: 4, nationality: 'USA', fact: 'The third of four wideouts Rodgers threw to all night.' },
    ],
    source: 'pfr box 201102060pit #home_starters (Chrome DOM) + Wikipedia SB XLV Starting lineups, 11/11 match. Four-WR set, no TE started. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201102060pit #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 11. Super Bowl LIV, San Francisco 49ers (the fourth-quarter collapse)
  // Verified 2026-07-22: pfr 202002020kan #vis_starters + Wikipedia "Super
  // Bowl LIV" Starting lineups, 11/11 match (wiki resolves pfr's OL labels).
  {
    id: 'sb-liv-sf',
    dateLabel: 'Super Bowl LIV',
    competition: 'Super Bowl',
    matchDate: '2020-02-02',
    team: 'San Francisco 49ers',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Chiefs 31-20 49ers',
    venue: 'Hard Rock Stadium, Miami Gardens',
    slots: [
      S('QB', 'Jimmy Garoppolo'),
      S('RB', 'Tevin Coleman'),
      S('FB', 'Kyle Juszczyk'),
      S('WR', 'Deebo Samuel'),
      S('WR', 'Emmanuel Sanders'),
      S('TE', 'George Kittle'),
      S('LT', 'Joe Staley'),
      S('LG', 'Laken Tomlinson'),
      S('C', 'Ben Garland'),
      S('RG', 'Mike Person'),
      S('RT', 'Mike McGlinchey'),
    ],
    blankCandidates: [
      { name: 'Kyle Juszczyk', slotIndex: 2, nationality: 'USA', fact: 'A Pro Bowl fullback starting a Super Bowl in Kyle Shanahan\'s two-back offense.' },
      { name: 'Ben Garland', slotIndex: 8, nationality: 'USA', fact: 'Started at center with Weston Richburg out for the season.' },
      { name: 'Tevin Coleman', slotIndex: 1, nationality: 'USA', fact: 'Started at running back over Raheem Mostert, who had run for 220 yards in the NFC Championship.' },
    ],
    source: 'pfr box 202002020kan #vis_starters (Chrome DOM) + Wikipedia "Super Bowl LIV" Starting lineups table, 11/11 match (wiki resolves pfr generic OL labels). Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 202002020kan #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 12. Super Bowl LIV, Kansas City Chiefs (Mahomes\' comeback)
  {
    id: 'sb-liv-kc',
    dateLabel: 'Super Bowl LIV',
    competition: 'Super Bowl',
    matchDate: '2020-02-02',
    team: 'Kansas City Chiefs',
    opponent: 'San Francisco 49ers',
    scoreLine: 'Chiefs 31-20 49ers',
    venue: 'Hard Rock Stadium, Miami Gardens',
    slots: [
      S('QB', 'Patrick Mahomes'),
      S('RB', 'Damien Williams'),
      S('WR', 'Tyreek Hill'),
      S('WR', 'Sammy Watkins'),
      S('WR', 'Mecole Hardman'),
      S('TE', 'Travis Kelce'),
      S('LT', 'Eric Fisher'),
      S('LG', 'Stefen Wisniewski'),
      S('C', 'Austin Reiter'),
      S('RG', 'Laurent Duvernay-Tardif'),
      S('RT', 'Mitchell Schwartz'),
    ],
    blankCandidates: [
      { name: 'Damien Williams', slotIndex: 1, nationality: 'USA', fact: 'Scored the go-ahead touchdown as Kansas City erased a ten-point fourth-quarter deficit.' },
      { name: 'Laurent Duvernay-Tardif', slotIndex: 9, nationality: 'Canada', fact: 'The starting right guard also holds a medical degree from McGill.' },
      { name: 'Mecole Hardman', slotIndex: 4, nationality: 'USA', fact: 'The rookie second-round pick started as the third receiver next to Tyreek Hill and Sammy Watkins.' },
    ],
    source: 'pfr box 202002020kan #home_starters (Chrome DOM) + Wikipedia "Super Bowl LIV" Starting lineups table, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 202002020kan #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 13. Super Bowl LII, Philadelphia Eagles (the Philly Special)
  // Verified 2026-07-22: pfr 201802040nwe #vis_starters + Wikipedia "Super
  // Bowl LII" Starting lineups, 11/11 match (pfr listed explicit OL labels).
  {
    id: 'sb-lii-phi',
    dateLabel: 'Super Bowl LII',
    competition: 'Super Bowl',
    matchDate: '2018-02-04',
    team: 'Philadelphia Eagles',
    opponent: 'New England Patriots',
    scoreLine: 'Eagles 41-33 Patriots',
    venue: 'U.S. Bank Stadium, Minneapolis',
    slots: [
      S('QB', 'Nick Foles'),
      S('RB', 'LeGarrette Blount'),
      S('WR', 'Alshon Jeffery'),
      S('WR', 'Torrey Smith'),
      S('WR', 'Nelson Agholor'),
      S('TE', 'Zach Ertz'),
      S('LT', 'Halapoulivaati Vaitai'),
      S('LG', 'Stefen Wisniewski'),
      S('C', 'Jason Kelce'),
      S('RG', 'Brandon Brooks'),
      S('RT', 'Lane Johnson'),
    ],
    blankCandidates: [
      { name: 'Halapoulivaati Vaitai', slotIndex: 6, nationality: 'USA', fact: 'Started at left tackle with nine-time Pro Bowler Jason Peters out for the season.' },
      { name: 'LeGarrette Blount', slotIndex: 1, nationality: 'USA', fact: 'Started at running back a year after winning Super Bowl LI with the Patriots he was now beating.' },
      { name: 'Torrey Smith', slotIndex: 3, nationality: 'USA', fact: 'The third receiver alongside Alshon Jeffery and Nelson Agholor.' },
    ],
    source: 'pfr box 201802040nwe #vis_starters (Chrome DOM) + Wikipedia "Super Bowl LII" Starting lineups table, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201802040nwe #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 14. Super Bowl LII, New England Patriots (613 yards and a loss)
  {
    id: 'sb-lii-ne',
    dateLabel: 'Super Bowl LII',
    competition: 'Super Bowl',
    matchDate: '2018-02-04',
    team: 'New England Patriots',
    opponent: 'Philadelphia Eagles',
    scoreLine: 'Eagles 41-33 Patriots',
    venue: 'U.S. Bank Stadium, Minneapolis',
    slots: [
      S('QB', 'Tom Brady'),
      S('RB', 'Dion Lewis'),
      S('FB', 'James Develin'),
      S('WR', 'Brandin Cooks'),
      S('WR', 'Chris Hogan'),
      S('TE', 'Rob Gronkowski'),
      S('LT', 'Nate Solder'),
      S('LG', 'Joe Thuney'),
      S('C', 'David Andrews'),
      S('RG', 'Shaq Mason'),
      S('RT', 'Cameron Fleming'),
    ],
    blankCandidates: [
      { name: 'Cameron Fleming', slotIndex: 10, nationality: 'USA', fact: 'Started at right tackle in the highest-scoring Super Bowl ever, 74 combined points.' },
      { name: 'Dion Lewis', slotIndex: 1, nationality: 'USA', fact: 'Started at running back as the Patriots piled up a Super Bowl-record 613 yards, and lost.' },
      { name: 'James Develin', slotIndex: 2, nationality: 'USA', fact: 'The fullback in New England\'s two-back opening set.' },
    ],
    source: 'pfr box 201802040nwe #home_starters (Chrome DOM) + Wikipedia "Super Bowl LII" Starting lineups table, 11/11 match. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201802040nwe #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // -------------------------------------------------------------------------
  // DEFENSES (task #82, added 2026-08-05). Verification: every starter is
  // confirmed by 2+ independent publishers fetched on 2026-08-05; primary
  // per-lineup sources are in each entry's source note. Traps double-checked,
  // do NOT "fix" them:
  //   - SB XLVIII Seattle: the official card is the NICKEL (3 CBs, 2 LBs).
  //     Malcolm Smith, the game MVP, did NOT start (gamebook substitutions
  //     "LB 53 M.Smith"), and neither did Bruce Irvin, Brandon Mebane, Tony
  //     McDaniel or Red Bryant. Clinton McDonald started at RDT.
  //   - SB XX Chicago: William Perry STARTED at RDT (Hartenstine did not).
  //   - SB XXXV Baltimore: Kim Herring is the SS, not Corey Harris.
  // -------------------------------------------------------------------------

  // 15. Super Bowl XX, Chicago Bears defense (the 46)
  {
    id: 'sb-xx-chi-d',
    dateLabel: 'Super Bowl XX',
    competition: 'Super Bowl',
    matchDate: '1986-01-26',
    team: 'Chicago Bears',
    opponent: 'New England Patriots',
    scoreLine: 'Bears 46-10 Patriots',
    venue: 'Louisiana Superdome, New Orleans',
    unit: 'defense',
    slots: [
      S('LDE', 'Dan Hampton'),
      S('LDT', 'Steve McMichael'),
      S('RDT', 'William Perry'),
      S('RDE', 'Richard Dent'),
      S('LLB', 'Otis Wilson'),
      S('MLB', 'Mike Singletary'),
      S('RLB', 'Wilber Marshall'),
      S('LCB', 'Mike Richardson'),
      S('RCB', 'Leslie Frazier'),
      S('SS', 'Dave Duerson'),
      S('FS', 'Gary Fencik'),
    ],
    blankCandidates: [
      { name: 'William Perry', slotIndex: 2, nationality: 'USA', fact: 'The Fridge started at right tackle and rumbled in a rushing touchdown that night.' },
      { name: 'Leslie Frazier', slotIndex: 8, nationality: 'USA', fact: 'Started at right corner and suffered a career-ending knee injury in the game.' },
      { name: 'Otis Wilson', slotIndex: 4, nationality: 'USA', fact: 'The left-side linebacker piled up 10.5 sacks that season in the 46.' },
      { name: 'Gary Fencik', slotIndex: 10, nationality: 'USA', fact: 'The Yale man at free safety, with five interceptions that season.' },
    ],
    source: 'chicagobears.com official "Super Bowl XX Starters" photo gallery + profootballarchives.com SB XX box score, 11/11 match incl. positions and CB sides; Perry-started and Frazier-injury cross-checked in Wikipedia SB XX prose and Post and Courier.',
  },

  // 16. Super Bowl XXXV, Baltimore Ravens defense (the 2000 Ravens)
  {
    id: 'sb-xxxv-bal-d',
    dateLabel: 'Super Bowl XXXV',
    competition: 'Super Bowl',
    matchDate: '2001-01-28',
    team: 'Baltimore Ravens',
    opponent: 'New York Giants',
    scoreLine: 'Ravens 34-7 Giants',
    venue: 'Raymond James Stadium, Tampa',
    unit: 'defense',
    slots: [
      S('LDE', 'Rob Burnett'),
      S('LDT', 'Sam Adams'),
      S('RDT', 'Tony Siragusa'),
      S('RDE', 'Michael McCrary'),
      S('LLB', 'Peter Boulware'),
      S('MLB', 'Ray Lewis'),
      S('RLB', 'Jamie Sharper'),
      S('LCB', 'Duane Starks'),
      S('RCB', 'Chris McAlister'),
      S('SS', 'Kim Herring'),
      S('FS', 'Rod Woodson'),
    ],
    blankCandidates: [
      { name: 'Kim Herring', slotIndex: 9, nationality: 'USA', fact: 'The forgotten starter on the most feared defense ever, and he picked off Kerry Collins in this game.' },
      { name: 'Duane Starks', slotIndex: 7, nationality: 'USA', fact: 'Jumped a Kerry Collins route and took it 49 yards to the house.' },
      { name: 'Jamie Sharper', slotIndex: 6, nationality: 'USA', fact: 'The third man in the linebacker trio with Ray Lewis and Peter Boulware.' },
      { name: 'Rob Burnett', slotIndex: 0, nationality: 'USA', fact: 'The left end had 10.5 sacks that season, a career year at age 33.' },
    ],
    source: 'pfr 2000 Ravens roster Starters table (fetched, matches 11/11 incl. CB sides) + reference.org/nfl-video.com SB XXXV lineups; Herring SS (not Corey Harris) per Baltimore Sun via neilcornrich.com and Russell Street Report; Starks pick-six per CBS News recap.',
  },

  // 17. Super Bowl XLVIII, Seattle Seahawks defense (the Legion of Boom)
  {
    id: 'sb-xlviii-sea-d',
    dateLabel: 'Super Bowl XLVIII',
    competition: 'Super Bowl',
    matchDate: '2014-02-02',
    team: 'Seattle Seahawks',
    opponent: 'Denver Broncos',
    scoreLine: 'Seahawks 43-8 Broncos',
    venue: 'MetLife Stadium, East Rutherford',
    unit: 'defense',
    // Official gamebook lists the NICKEL as the starting defense: 3 CBs, 2 LBs.
    slots: [
      S('LDE', 'Cliff Avril'),
      S('LDT', 'Michael Bennett'),
      S('RDT', 'Clinton McDonald'),
      S('RDE', 'Chris Clemons'),
      S('OLB', 'K.J. Wright'),
      S('MLB', 'Bobby Wagner'),
      S('CB', 'Walter Thurmond'),
      S('LCB', 'Richard Sherman'),
      S('RCB', 'Byron Maxwell'),
      S('SS', 'Kam Chancellor'),
      S('FS', 'Earl Thomas'),
    ],
    blankCandidates: [
      { name: 'K.J. Wright', slotIndex: 4, nationality: 'USA', fact: 'Wright started at linebacker. Malcolm Smith, who won MVP that night, came off the bench.' },
      { name: 'Clinton McDonald', slotIndex: 2, nationality: 'USA', fact: 'Started inside in the nickel front while base tackles Brandon Mebane and Tony McDaniel waited.' },
      { name: 'Walter Thurmond', slotIndex: 6, nationality: 'USA', fact: 'Seattle opened in the nickel, so the official card lists three starting corners. Thurmond held the slot.' },
      { name: 'Byron Maxwell', slotIndex: 8, nationality: 'USA', fact: 'Started opposite Sherman after stepping in for Brandon Browner late that season.' },
    ],
    source: 'Official NFL gamebook PDF (static.www.nfl.com, Lineups page: nickel starters verbatim, M.Smith and B.Irvin listed as substitutions) + PFT starters-remaining enumeration + SI All-22 film review; Wright start also in Wikipedia K.J. Wright prose. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201402020den #vis_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 18. Super Bowl 50, Denver Broncos defense (the No Fly Zone)
  {
    id: 'sb-50-den-d',
    dateLabel: 'Super Bowl 50',
    competition: 'Super Bowl',
    matchDate: '2016-02-07',
    team: 'Denver Broncos',
    opponent: 'Carolina Panthers',
    scoreLine: 'Broncos 24-10 Panthers',
    venue: "Levi's Stadium, Santa Clara",
    unit: 'defense',
    slots: [
      S('DE', 'Derek Wolfe'),
      S('NT', 'Sylvester Williams'),
      S('DE', 'Malik Jackson'),
      S('OLB', 'Von Miller'),
      S('ILB', 'Brandon Marshall'),
      S('ILB', 'Danny Trevathan'),
      S('OLB', 'DeMarcus Ware'),
      S('CB', 'Aqib Talib'),
      S('CB', 'Chris Harris Jr.'),
      S('SS', 'T.J. Ward'),
      S('FS', 'Darian Stewart'),
    ],
    blankCandidates: [
      { name: 'Sylvester Williams', slotIndex: 1, nationality: 'USA', fact: "The nose tackle between Derek Wolfe and Malik Jackson in Wade Phillips' front." },
      { name: 'Danny Trevathan', slotIndex: 5, nationality: 'USA', fact: 'Led the Broncos with eight tackles and recovered two fumbles in the game.' },
      { name: 'Malik Jackson', slotIndex: 2, nationality: 'USA', fact: "Fell on Cam Newton's fumble in the end zone for the game's first touchdown." },
      { name: 'Darian Stewart', slotIndex: 10, nationality: 'USA', fact: 'Wade Phillips named him the free safety, with T.J. Ward at strong.' },
    ],
    source: 'B/R position-by-position SB 50 preview + AMNY defenses-at-a-glance + NFL.com postgame film review (front three named) + Wikipedia player pages ("started in Super Bowl 50" for Marshall, Trevathan; Stewart FS/Ward SS assignment), 11/11 across 2+ publishers each. Rechecked 2026-10-03 (Round 950): the nfl.com game book and the pro-football-reference.com box score 201602070den #home_starters both list these 11; row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 19. Super Bowl LVIII, Kansas City Chiefs offense
  {
    id: 'sb-lviii-kc',
    dateLabel: 'Super Bowl LVIII',
    competition: 'Super Bowl',
    matchDate: '2024-02-11',
    team: 'Kansas City Chiefs',
    opponent: 'San Francisco 49ers',
    scoreLine: 'Chiefs 25-22 49ers (OT)',
    venue: 'Allegiant Stadium, Las Vegas',
    slots: [
      S('QB', 'Patrick Mahomes'),
      S('RB', 'Isiah Pacheco'),
      S('WR', 'Rashee Rice'),
      S('WR', 'Marquez Valdes-Scantling'),
      S('TE', 'Travis Kelce'),
      S('TE', 'Noah Gray'),
      S('LT', 'Donovan Smith'),
      S('LG', 'Nick Allegretti'),
      S('C', 'Creed Humphrey'),
      S('RG', 'Trey Smith'),
      S('RT', 'Jawaan Taylor'),
    ],
    blankCandidates: [
      { name: 'Noah Gray', slotIndex: 5, nationality: 'USA', fact: 'Started as the second tight end next to Travis Kelce.' },
      { name: 'Nick Allegretti', slotIndex: 7, nationality: 'USA', fact: 'Started at left guard as the Chiefs won it 25-22 in overtime.' },
      { name: 'Isiah Pacheco', slotIndex: 1, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1707737132/gamecenter/674ddfc1-b342-11ee-aec3-7d8f81bc70be.pdf) + pro-football-reference.com box score 202402110kan #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 20. Super Bowl LVIII, San Francisco 49ers offense
  {
    id: 'sb-lviii-sf',
    dateLabel: 'Super Bowl LVIII',
    competition: 'Super Bowl',
    matchDate: '2024-02-11',
    team: 'San Francisco 49ers',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Chiefs 25-22 49ers (OT)',
    venue: 'Allegiant Stadium, Las Vegas',
    slots: [
      S('QB', 'Brock Purdy'),
      S('RB', 'Christian McCaffrey'),
      S('FB', 'Kyle Juszczyk'),
      S('WR', 'Brandon Aiyuk'),
      S('WR', 'Deebo Samuel'),
      S('TE', 'George Kittle'),
      S('LT', 'Trent Williams'),
      S('LG', 'Aaron Banks'),
      S('C', 'Jake Brendel'),
      S('RG', 'Jon Feliciano'),
      S('RT', 'Colton McKivitz'),
    ],
    blankCandidates: [
      { name: 'Christian McCaffrey', slotIndex: 1, nationality: 'USA', fact: 'Scored on a 21-yard catch, and the pass came from receiver Jauan Jennings.' },
      { name: 'Kyle Juszczyk', slotIndex: 2, nationality: 'USA', fact: 'San Francisco opened with a fullback on the field, and it was him.' },
      { name: 'Jake Brendel', slotIndex: 8, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1707737132/gamecenter/674ddfc1-b342-11ee-aec3-7d8f81bc70be.pdf) + pro-football-reference.com box score 202402110kan #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 21. Super Bowl LIX, Philadelphia Eagles offense
  {
    id: 'sb-lix-phi',
    dateLabel: 'Super Bowl LIX',
    competition: 'Super Bowl',
    matchDate: '2025-02-09',
    team: 'Philadelphia Eagles',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Eagles 40-22 Chiefs',
    venue: 'Caesars Superdome, New Orleans',
    slots: [
      S('QB', 'Jalen Hurts'),
      S('RB', 'Saquon Barkley'),
      S('WR', 'A.J. Brown'),
      S('WR', 'DeVonta Smith'),
      S('WR', 'Jahan Dotson'),
      S('TE', 'Dallas Goedert'),
      S('LT', 'Jordan Mailata'),
      S('LG', 'Landon Dickerson'),
      S('C', 'Cam Jurgens'),
      S('RG', 'Mekhi Becton'),
      S('RT', 'Lane Johnson'),
    ],
    blankCandidates: [
      { name: 'DeVonta Smith', slotIndex: 3, nationality: 'USA', fact: 'Caught a 46-yard touchdown from Jalen Hurts in the third quarter.' },
      { name: 'Jahan Dotson', slotIndex: 4, nationality: 'USA', fact: 'The third starting receiver, alongside A.J. Brown and DeVonta Smith.' },
      { name: 'Mekhi Becton', slotIndex: 9, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1739186285/gamecenter/882c1e9c-dc59-11ef-8d24-59614ea9df0f.pdf) + pro-football-reference.com box score 202502090phi #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 22. Super Bowl LIX, Philadelphia Eagles defense
  {
    id: 'sb-lix-phi-d',
    dateLabel: 'Super Bowl LIX',
    competition: 'Super Bowl',
    matchDate: '2025-02-09',
    team: 'Philadelphia Eagles',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Eagles 40-22 Chiefs',
    venue: 'Caesars Superdome, New Orleans',
    unit: 'defense',
    slots: [
      S('OLB', 'Josh Sweat'),
      S('DT', 'Jordan Davis'),
      S('DT', 'Jalen Carter'),
      S('OLB', 'Nolan Smith'),
      S('LB', 'Zack Baun'),
      S('LB', 'Oren Burks'),
      S('CB', 'Darius Slay'),
      S('CB', 'Quinyon Mitchell'),
      S('DB', 'Cooper DeJean'),
      S('S', 'Reed Blankenship'),
      S('S', 'C.J. Gardner-Johnson'),
    ],
    blankCandidates: [
      { name: 'Cooper DeJean', slotIndex: 8, nationality: 'USA', fact: 'Returned an interception 38 yards for a touchdown in the second quarter.' },
      { name: 'Oren Burks', slotIndex: 5, nationality: 'USA', fact: 'Started at linebacker beside Zack Baun.' },
      { name: 'Jordan Davis', slotIndex: 1, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1739186285/gamecenter/882c1e9c-dc59-11ef-8d24-59614ea9df0f.pdf) + pro-football-reference.com box score 202502090phi #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 23. Super Bowl LV, Tampa Bay Buccaneers offense
  {
    id: 'sb-lv-tb',
    dateLabel: 'Super Bowl LV',
    competition: 'Super Bowl',
    matchDate: '2021-02-07',
    team: 'Tampa Bay Buccaneers',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Buccaneers 31-9 Chiefs',
    venue: 'Raymond James Stadium, Tampa',
    slots: [
      S('QB', 'Tom Brady'),
      S('RB', 'Leonard Fournette'),
      S('WR', 'Mike Evans'),
      S('WR', 'Chris Godwin'),
      S('WR', 'Scott Miller'),
      S('TE', 'Rob Gronkowski'),
      S('LT', 'Donovan Smith'),
      S('LG', 'Ali Marpet'),
      S('C', 'Ryan Jensen'),
      S('RG', 'Aaron Stinnie'),
      S('RT', 'Tristan Wirfs'),
    ],
    blankCandidates: [
      { name: 'Scott Miller', slotIndex: 4, nationality: 'USA', fact: 'Started at receiver. Antonio Brown, who caught a touchdown that night, came off the bench.' },
      { name: 'Rob Gronkowski', slotIndex: 5, nationality: 'USA', fact: 'Caught two first-half touchdown passes from Tom Brady.' },
      { name: 'Aaron Stinnie', slotIndex: 9, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629321/gamecenter/10012021-0207-0069-5207-a78dd8bf8075.pdf) + pro-football-reference.com box score 202102070tam #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 24. Super Bowl LV, Tampa Bay Buccaneers defense
  {
    id: 'sb-lv-tb-d',
    dateLabel: 'Super Bowl LV',
    competition: 'Super Bowl',
    matchDate: '2021-02-07',
    team: 'Tampa Bay Buccaneers',
    opponent: 'Kansas City Chiefs',
    scoreLine: 'Buccaneers 31-9 Chiefs',
    venue: 'Raymond James Stadium, Tampa',
    unit: 'defense',
    slots: [
      S('DL', 'Ndamukong Suh'),
      S('NT', 'Rakeem Nunez-Roches'),
      S('OLB', 'Jason Pierre-Paul'),
      S('ILB', 'Devin White'),
      S('ILB', 'Lavonte David'),
      S('OLB', 'Shaquil Barrett'),
      S('CB', 'Carlton Davis'),
      S('CB', 'Jamel Dean'),
      S('CB', 'Sean Murphy-Bunting'),
      S('S', 'Jordan Whitehead'),
      S('S', 'Antoine Winfield Jr.'),
    ],
    blankCandidates: [
      { name: 'Devin White', slotIndex: 3, nationality: 'USA', fact: 'This defense held the Chiefs to three field goals and no touchdowns.' },
      { name: 'Jamel Dean', slotIndex: 7, nationality: 'USA', fact: 'Tampa Bay opened in the nickel, so three corners started. Dean was one of them.' },
      { name: 'Jordan Whitehead', slotIndex: 9, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629321/gamecenter/10012021-0207-0069-5207-a78dd8bf8075.pdf) + pro-football-reference.com box score 202102070tam #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 25. Super Bowl LV, Kansas City Chiefs offense
  {
    id: 'sb-lv-kc',
    dateLabel: 'Super Bowl LV',
    competition: 'Super Bowl',
    matchDate: '2021-02-07',
    team: 'Kansas City Chiefs',
    opponent: 'Tampa Bay Buccaneers',
    scoreLine: 'Buccaneers 31-9 Chiefs',
    venue: 'Raymond James Stadium, Tampa',
    slots: [
      S('QB', 'Patrick Mahomes'),
      S('RB', 'Clyde Edwards-Helaire'),
      S('WR', 'Tyreek Hill'),
      S('WR', 'Demarcus Robinson'),
      S('WR', 'Byron Pringle'),
      S('TE', 'Travis Kelce'),
      S('LT', 'Mike Remmers'),
      S('LG', 'Nick Allegretti'),
      S('C', 'Austin Reiter'),
      S('RG', 'Stefen Wisniewski'),
      S('RT', 'Andrew Wylie'),
    ],
    blankCandidates: [
      { name: 'Mike Remmers', slotIndex: 6, nationality: 'USA' },
      { name: 'Andrew Wylie', slotIndex: 10, nationality: 'USA' },
      { name: 'Byron Pringle', slotIndex: 4, nationality: 'USA', fact: 'The third starting receiver, with Tyreek Hill and Demarcus Robinson.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629321/gamecenter/10012021-0207-0069-5207-a78dd8bf8075.pdf) + pro-football-reference.com box score 202102070tam #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 26. Super Bowl LVI, Los Angeles Rams offense
  {
    id: 'sb-lvi-lar',
    dateLabel: 'Super Bowl LVI',
    competition: 'Super Bowl',
    matchDate: '2022-02-13',
    team: 'Los Angeles Rams',
    opponent: 'Cincinnati Bengals',
    scoreLine: 'Rams 23-20 Bengals',
    venue: 'SoFi Stadium, Inglewood',
    slots: [
      S('QB', 'Matthew Stafford'),
      S('RB', 'Cam Akers'),
      S('WR', 'Odell Beckham Jr.'),
      S('WR', 'Cooper Kupp'),
      S('WR', 'Van Jefferson'),
      S('TE', 'Kendall Blanton'),
      S('LT', 'Andrew Whitworth'),
      S('LG', 'David Edwards'),
      S('C', 'Brian Allen'),
      S('RG', 'Austin Corbett'),
      S('RT', 'Rob Havenstein'),
    ],
    blankCandidates: [
      { name: 'Kendall Blanton', slotIndex: 5, nationality: 'USA' },
      { name: 'Van Jefferson', slotIndex: 4, nationality: 'USA', fact: 'The third starting receiver, with Odell Beckham Jr. and Cooper Kupp.' },
      { name: 'Cooper Kupp', slotIndex: 3, nationality: 'USA', fact: 'Caught the 1-yard touchdown with 1:25 left that won it 23-20.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629338/gamecenter/757bbb2a-71a2-11ec-8e86-ebe0df6765ab.pdf) + pro-football-reference.com box score 202202130cin #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 27. Super Bowl LVI, Los Angeles Rams defense
  {
    id: 'sb-lvi-lar-d',
    dateLabel: 'Super Bowl LVI',
    competition: 'Super Bowl',
    matchDate: '2022-02-13',
    team: 'Los Angeles Rams',
    opponent: 'Cincinnati Bengals',
    scoreLine: 'Rams 23-20 Bengals',
    venue: 'SoFi Stadium, Inglewood',
    unit: 'defense',
    slots: [
      S('DE', 'A\'Shawn Robinson'),
      S('NT', 'Greg Gaines'),
      S('DT', 'Aaron Donald'),
      S('OLB', 'Von Miller'),
      S('OLB', 'Leonard Floyd'),
      S('LB', 'Ernest Jones'),
      S('LCB', 'Darious Williams'),
      S('RCB', 'Jalen Ramsey'),
      S('CB', 'David Long'),
      S('DB', 'Eric Weddle'),
      S('SS', 'Nick Scott'),
    ],
    blankCandidates: [
      { name: 'Eric Weddle', slotIndex: 9, nationality: 'USA' },
      { name: 'Greg Gaines', slotIndex: 1, nationality: 'USA', fact: 'Started at nose tackle between A\'Shawn Robinson and Aaron Donald.' },
      { name: 'Darious Williams', slotIndex: 6, nationality: 'USA', fact: 'One of three starting corners, with Jalen Ramsey and David Long.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629338/gamecenter/757bbb2a-71a2-11ec-8e86-ebe0df6765ab.pdf) + pro-football-reference.com box score 202202130cin #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 28. Super Bowl LVI, Cincinnati Bengals offense
  {
    id: 'sb-lvi-cin',
    dateLabel: 'Super Bowl LVI',
    competition: 'Super Bowl',
    matchDate: '2022-02-13',
    team: 'Cincinnati Bengals',
    opponent: 'Los Angeles Rams',
    scoreLine: 'Rams 23-20 Bengals',
    venue: 'SoFi Stadium, Inglewood',
    slots: [
      S('QB', 'Joe Burrow'),
      S('HB', 'Joe Mixon'),
      S('WR', 'Ja\'Marr Chase'),
      S('WR', 'Tee Higgins'),
      S('WR', 'Tyler Boyd'),
      S('TE', 'C.J. Uzomah'),
      S('LT', 'Jonah Williams'),
      S('LG', 'Quinton Spain'),
      S('C', 'Trey Hopkins'),
      S('RG', 'Hakeem Adeniji'),
      S('RT', 'Isaiah Prince'),
    ],
    blankCandidates: [
      { name: 'Joe Mixon', slotIndex: 1, nationality: 'USA', fact: 'The running back threw a 6-yard touchdown pass to Tee Higgins.' },
      { name: 'Isaiah Prince', slotIndex: 10, nationality: 'USA' },
      { name: 'Hakeem Adeniji', slotIndex: 9, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629338/gamecenter/757bbb2a-71a2-11ec-8e86-ebe0df6765ab.pdf) + pro-football-reference.com box score 202202130cin #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 29. Super Bowl LIII, New England Patriots defense
  {
    id: 'sb-liii-ne-d',
    dateLabel: 'Super Bowl LIII',
    competition: 'Super Bowl',
    matchDate: '2019-02-03',
    team: 'New England Patriots',
    opponent: 'Los Angeles Rams',
    scoreLine: 'Patriots 13-3 Rams',
    venue: 'Mercedes-Benz Stadium, Atlanta',
    unit: 'defense',
    slots: [
      S('LE', 'Trey Flowers'),
      S('DT', 'Lawrence Guy'),
      S('DT', 'Malcom Brown'),
      S('RE', 'Deatrich Wise Jr.'),
      S('LB', 'Dont\'a Hightower'),
      S('LB', 'Kyle Van Noy'),
      S('LCB', 'Jason McCourty'),
      S('RCB', 'Stephon Gilmore'),
      S('DB', 'Jonathan Jones'),
      S('S', 'Devin McCourty'),
      S('S', 'Patrick Chung'),
    ],
    blankCandidates: [
      { name: 'Trey Flowers', slotIndex: 0, nationality: 'USA', fact: 'This defense gave up one field goal all night in a 13-3 win.' },
      { name: 'Jonathan Jones', slotIndex: 8, nationality: 'USA', fact: 'The nickel back on the opening card.' },
      { name: 'Malcom Brown', slotIndex: 2, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629595/gamecenter/10012019-0203-0011-323b-548fe39c23df.pdf) + pro-football-reference.com box score 201902030ram #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 30. Super Bowl LIII, Los Angeles Rams offense
  {
    id: 'sb-liii-lar',
    dateLabel: 'Super Bowl LIII',
    competition: 'Super Bowl',
    matchDate: '2019-02-03',
    team: 'Los Angeles Rams',
    opponent: 'New England Patriots',
    scoreLine: 'Patriots 13-3 Rams',
    venue: 'Mercedes-Benz Stadium, Atlanta',
    slots: [
      S('QB', 'Jared Goff'),
      S('HB', 'Todd Gurley'),
      S('WR', 'Robert Woods'),
      S('WR', 'Brandin Cooks'),
      S('WR', 'Josh Reynolds'),
      S('TE', 'Tyler Higbee'),
      S('LT', 'Andrew Whitworth'),
      S('LG', 'Rodger Saffold'),
      S('C', 'John Sullivan'),
      S('RG', 'Austin Blythe'),
      S('RT', 'Rob Havenstein'),
    ],
    blankCandidates: [
      { name: 'Josh Reynolds', slotIndex: 4, nationality: 'USA', fact: 'The third starting receiver, with Robert Woods and Brandin Cooks.' },
      { name: 'Austin Blythe', slotIndex: 9, nationality: 'USA' },
      { name: 'John Sullivan', slotIndex: 8, nationality: 'USA', fact: 'Snapped for an offense that managed one field goal all night.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677629595/gamecenter/10012019-0203-0011-323b-548fe39c23df.pdf) + pro-football-reference.com box score 201902030ram #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 31. Super Bowl XLVII, Baltimore Ravens offense
  {
    id: 'sb-xlvii-bal',
    dateLabel: 'Super Bowl XLVII',
    competition: 'Super Bowl',
    matchDate: '2013-02-03',
    team: 'Baltimore Ravens',
    opponent: 'San Francisco 49ers',
    scoreLine: 'Ravens 34-31 49ers',
    venue: 'Mercedes-Benz Superdome, New Orleans',
    slots: [
      S('QB', 'Joe Flacco'),
      S('RB', 'Ray Rice'),
      S('FB', 'Vonta Leach'),
      S('WR', 'Anquan Boldin'),
      S('WR', 'Torrey Smith'),
      S('WR', 'Jacoby Jones'),
      S('LT', 'Bryant McKinnie'),
      S('LG', 'Kelechi Osemele'),
      S('C', 'Matt Birk'),
      S('RG', 'Marshal Yanda'),
      S('RT', 'Michael Oher'),
    ],
    blankCandidates: [
      { name: 'Jacoby Jones', slotIndex: 5, nationality: 'USA', fact: 'Caught a 56-yard touchdown and returned a kickoff 108 yards for another.' },
      { name: 'Vonta Leach', slotIndex: 2, nationality: 'USA', fact: 'Baltimore opened with a fullback and three receivers, no tight end.' },
      { name: 'Bryant McKinnie', slotIndex: 6, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677630684/gamecenter/10012013-0203-00bb-9d76-3f7dbeaf2a5e.pdf) + pro-football-reference.com box score 201302030sfo #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 32. Super Bowl XLVII, San Francisco 49ers offense
  {
    id: 'sb-xlvii-sf',
    dateLabel: 'Super Bowl XLVII',
    competition: 'Super Bowl',
    matchDate: '2013-02-03',
    team: 'San Francisco 49ers',
    opponent: 'Baltimore Ravens',
    scoreLine: 'Ravens 34-31 49ers',
    venue: 'Mercedes-Benz Superdome, New Orleans',
    slots: [
      S('QB', 'Colin Kaepernick'),
      S('RB', 'Frank Gore'),
      S('WR', 'Michael Crabtree'),
      S('WR', 'Randy Moss'),
      S('TE', 'Vernon Davis'),
      S('TE', 'Delanie Walker'),
      S('LT', 'Joe Staley'),
      S('LG', 'Mike Iupati'),
      S('C', 'Jonathan Goodwin'),
      S('RG', 'Alex Boone'),
      S('RT', 'Anthony Davis'),
    ],
    blankCandidates: [
      { name: 'Delanie Walker', slotIndex: 5, nationality: 'USA', fact: 'The second starting tight end, next to Vernon Davis.' },
      { name: 'Randy Moss', slotIndex: 3, nationality: 'USA', fact: 'Started at receiver opposite Michael Crabtree.' },
      { name: 'Jonathan Goodwin', slotIndex: 8, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677630684/gamecenter/10012013-0203-00bb-9d76-3f7dbeaf2a5e.pdf) + pro-football-reference.com box score 201302030sfo #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 33. Super Bowl XLVI, New York Giants offense
  {
    id: 'sb-xlvi-nyg',
    dateLabel: 'Super Bowl XLVI',
    competition: 'Super Bowl',
    matchDate: '2012-02-05',
    team: 'New York Giants',
    opponent: 'New England Patriots',
    scoreLine: 'Giants 21-17 Patriots',
    venue: 'Lucas Oil Stadium, Indianapolis',
    slots: [
      S('QB', 'Eli Manning'),
      S('RB', 'Ahmad Bradshaw'),
      S('FB', 'Henry Hynoski'),
      S('WR', 'Hakeem Nicks'),
      S('WR', 'Victor Cruz'),
      S('TE', 'Jake Ballard'),
      S('LT', 'David Diehl'),
      S('LG', 'Kevin Boothe'),
      S('C', 'David Baas'),
      S('RG', 'Chris Snee'),
      S('RT', 'Kareem McKenzie'),
    ],
    blankCandidates: [
      { name: 'Henry Hynoski', slotIndex: 2, nationality: 'USA' },
      { name: 'Jake Ballard', slotIndex: 5, nationality: 'USA' },
      { name: 'Ahmad Bradshaw', slotIndex: 1, nationality: 'USA', fact: 'Scored the winning 6-yard touchdown run with 57 seconds left.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677630587/gamecenter/10012012-0205-00bb-c38f-1f97f8af3cca.pdf) + pro-football-reference.com box score 201202050nwe #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 34. Super Bowl XLVI, New England Patriots offense
  {
    id: 'sb-xlvi-ne',
    dateLabel: 'Super Bowl XLVI',
    competition: 'Super Bowl',
    matchDate: '2012-02-05',
    team: 'New England Patriots',
    opponent: 'New York Giants',
    scoreLine: 'Giants 21-17 Patriots',
    venue: 'Lucas Oil Stadium, Indianapolis',
    slots: [
      S('QB', 'Tom Brady'),
      S('RB', 'BenJarvus Green-Ellis'),
      S('WR', 'Wes Welker'),
      S('WR', 'Deion Branch'),
      S('TE', 'Rob Gronkowski'),
      S('TE', 'Nate Solder'),
      S('LT', 'Matt Light'),
      S('LG', 'Logan Mankins'),
      S('C', 'Dan Connolly'),
      S('RG', 'Brian Waters'),
      S('RT', 'Sebastian Vollmer'),
    ],
    blankCandidates: [
      { name: 'Nate Solder', slotIndex: 5, nationality: 'USA', fact: 'Wore 77 and was listed as a starting tight end next to Gronkowski.' },
      { name: 'Dan Connolly', slotIndex: 8, nationality: 'USA' },
      { name: 'Deion Branch', slotIndex: 3, nationality: 'USA', fact: 'Started at receiver alongside Wes Welker.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677630587/gamecenter/10012012-0205-00bb-c38f-1f97f8af3cca.pdf) + pro-football-reference.com box score 201202050nwe #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 35. Super Bowl XLIV, New Orleans Saints offense
  {
    id: 'sb-xliv-no',
    dateLabel: 'Super Bowl XLIV',
    competition: 'Super Bowl',
    matchDate: '2010-02-07',
    team: 'New Orleans Saints',
    opponent: 'Indianapolis Colts',
    scoreLine: 'Saints 31-17 Colts',
    venue: 'Sun Life Stadium, Miami Gardens',
    slots: [
      S('QB', 'Drew Brees'),
      S('RB', 'Pierre Thomas'),
      S('RB', 'Reggie Bush'),
      S('WR', 'Marques Colston'),
      S('WR', 'Devery Henderson'),
      S('TE', 'Jeremy Shockey'),
      S('LT', 'Jermon Bushrod'),
      S('LG', 'Carl Nicks'),
      S('C', 'Jonathan Goodwin'),
      S('RG', 'Jahri Evans'),
      S('RT', 'Jon Stinchcomb'),
    ],
    blankCandidates: [
      { name: 'Pierre Thomas', slotIndex: 1, nationality: 'USA', fact: 'Started in a two-back set with Reggie Bush and caught a 16-yard touchdown.' },
      { name: 'Devery Henderson', slotIndex: 4, nationality: 'USA', fact: 'Started at receiver opposite Marques Colston.' },
      { name: 'Jon Stinchcomb', slotIndex: 10, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677631473/gamecenter/10012010-0207-00e1-2890-45de8ffd3cb3.pdf) + pro-football-reference.com box score 201002070clt #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 36. Super Bowl XLIV, Indianapolis Colts offense
  {
    id: 'sb-xliv-ind',
    dateLabel: 'Super Bowl XLIV',
    competition: 'Super Bowl',
    matchDate: '2010-02-07',
    team: 'Indianapolis Colts',
    opponent: 'New Orleans Saints',
    scoreLine: 'Saints 31-17 Colts',
    venue: 'Sun Life Stadium, Miami Gardens',
    slots: [
      S('QB', 'Peyton Manning'),
      S('RB', 'Joseph Addai'),
      S('H-B', 'Gijon Robinson'),
      S('WR', 'Reggie Wayne'),
      S('WR', 'Pierre Garcon'),
      S('TE', 'Dallas Clark'),
      S('LT', 'Charlie Johnson'),
      S('LG', 'Ryan Lilja'),
      S('C', 'Jeff Saturday'),
      S('RG', 'Kyle DeVan'),
      S('RT', 'Ryan Diem'),
    ],
    blankCandidates: [
      { name: 'Gijon Robinson', slotIndex: 2, nationality: 'USA' },
      { name: 'Kyle DeVan', slotIndex: 9, nationality: 'USA' },
      { name: 'Pierre Garcon', slotIndex: 4, nationality: 'USA', fact: 'Caught a 19-yard touchdown from Peyton Manning in the first quarter.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677631473/gamecenter/10012010-0207-00e1-2890-45de8ffd3cb3.pdf) + pro-football-reference.com box score 201002070clt #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 37. Super Bowl XLIII, Pittsburgh Steelers offense
  {
    id: 'sb-xliii-pit',
    dateLabel: 'Super Bowl XLIII',
    competition: 'Super Bowl',
    matchDate: '2009-02-01',
    team: 'Pittsburgh Steelers',
    opponent: 'Arizona Cardinals',
    scoreLine: 'Steelers 27-23 Cardinals',
    venue: 'Raymond James Stadium, Tampa',
    slots: [
      S('QB', 'Ben Roethlisberger'),
      S('RB', 'Willie Parker'),
      S('WR', 'Hines Ward'),
      S('TE', 'Heath Miller'),
      S('TE', 'Matt Spaeth'),
      S('TE', 'Sean McHugh'),
      S('LT', 'Max Starks'),
      S('LG', 'Chris Kemoeatu'),
      S('C', 'Justin Hartwig'),
      S('RG', 'Darnell Stapleton'),
      S('RT', 'Willie Colon'),
    ],
    blankCandidates: [
      { name: 'Sean McHugh', slotIndex: 5, nationality: 'USA', fact: 'Pittsburgh opened with three tight ends. Santonio Holmes, who caught the winning touchdown, came off the bench.' },
      { name: 'Matt Spaeth', slotIndex: 4, nationality: 'USA', fact: 'One of three starting tight ends, with Heath Miller and Sean McHugh.' },
      { name: 'Darnell Stapleton', slotIndex: 9, nationality: 'USA' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677631650/gamecenter/10012009-0201-005b-8ea3-b4ab4e2b8bea.pdf) + pro-football-reference.com box score 200902010crd #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 38. Super Bowl XLIII, Pittsburgh Steelers defense
  {
    id: 'sb-xliii-pit-d',
    dateLabel: 'Super Bowl XLIII',
    competition: 'Super Bowl',
    matchDate: '2009-02-01',
    team: 'Pittsburgh Steelers',
    opponent: 'Arizona Cardinals',
    scoreLine: 'Steelers 27-23 Cardinals',
    venue: 'Raymond James Stadium, Tampa',
    unit: 'defense',
    slots: [
      S('DE', 'Aaron Smith'),
      S('NT', 'Casey Hampton'),
      S('DE', 'Brett Keisel'),
      S('OLB', 'LaMarr Woodley'),
      S('LILB', 'James Farrior'),
      S('RILB', 'Larry Foote'),
      S('OLB', 'James Harrison'),
      S('LCB', 'Ike Taylor'),
      S('RCB', 'Bryant McFadden'),
      S('SS', 'Troy Polamalu'),
      S('FS', 'Ryan Clark'),
    ],
    blankCandidates: [
      { name: 'James Harrison', slotIndex: 6, nationality: 'USA', fact: 'Returned an interception 100 yards for a touchdown as the first half ended.' },
      { name: 'Bryant McFadden', slotIndex: 8, nationality: 'USA' },
      { name: 'Larry Foote', slotIndex: 5, nationality: 'USA', fact: 'Started inside next to James Farrior.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677631650/gamecenter/10012009-0201-005b-8ea3-b4ab4e2b8bea.pdf) + pro-football-reference.com box score 200902010crd #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 39. Super Bowl XLIII, Arizona Cardinals offense
  {
    id: 'sb-xliii-ari',
    dateLabel: 'Super Bowl XLIII',
    competition: 'Super Bowl',
    matchDate: '2009-02-01',
    team: 'Arizona Cardinals',
    opponent: 'Pittsburgh Steelers',
    scoreLine: 'Steelers 27-23 Cardinals',
    venue: 'Raymond James Stadium, Tampa',
    slots: [
      S('QB', 'Kurt Warner'),
      S('RB', 'Edgerrin James'),
      S('FB', 'Terrelle Smith'),
      S('WR', 'Larry Fitzgerald'),
      S('WR', 'Anquan Boldin'),
      S('TE', 'Leonard Pope'),
      S('LT', 'Mike Gandy'),
      S('LG', 'Reggie Wells'),
      S('C', 'Lyle Sendlein'),
      S('RG', 'Deuce Lutui'),
      S('RT', 'Levi Brown'),
    ],
    blankCandidates: [
      { name: 'Larry Fitzgerald', slotIndex: 3, nationality: 'USA', fact: 'Scored twice in the fourth quarter, the second on a 64-yard catch.' },
      { name: 'Terrelle Smith', slotIndex: 2, nationality: 'USA' },
      { name: 'Leonard Pope', slotIndex: 5, nationality: 'USA', fact: 'Started at tight end. Ben Patrick, who caught a touchdown, came off the bench.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677631650/gamecenter/10012009-0201-005b-8ea3-b4ab4e2b8bea.pdf) + pro-football-reference.com box score 200902010crd #home_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },

  // 40. Super Bowl XLII, New York Giants defense
  {
    id: 'sb-xlii-nyg-d',
    dateLabel: 'Super Bowl XLII',
    competition: 'Super Bowl',
    matchDate: '2008-02-03',
    team: 'New York Giants',
    opponent: 'New England Patriots',
    scoreLine: 'Giants 17-14 Patriots',
    venue: 'University of Phoenix Stadium, Glendale',
    unit: 'defense',
    slots: [
      S('LE', 'Michael Strahan'),
      S('DT', 'Barry Cofield'),
      S('DT', 'Fred Robbins'),
      S('RE', 'Osi Umenyiora'),
      S('SLB', 'Reggie Torbor'),
      S('MLB', 'Antonio Pierce'),
      S('WLB', 'Kawika Mitchell'),
      S('LCB', 'Aaron Ross'),
      S('RCB', 'Corey Webster'),
      S('SS', 'James Butler'),
      S('FS', 'Gibril Wilson'),
    ],
    blankCandidates: [
      { name: 'Fred Robbins', slotIndex: 2, nationality: 'USA', fact: 'Started at tackle. Justin Tuck came off the bench in this game.' },
      { name: 'Reggie Torbor', slotIndex: 4, nationality: 'USA' },
      { name: 'Kawika Mitchell', slotIndex: 6, nationality: 'USA', fact: 'Started at weak-side linebacker in a game the Patriots scored 14 in.' },
    ],
    source: 'nfl.com game book (static.www.nfl.com/image/upload/v1677631553/gamecenter/10012008-0203-00d1-c381-50c19c704227.pdf) + pro-football-reference.com box score 200802030nwe #vis_starters, read 2026-10-03, 11/11 match; full row in scripts/data/missingElevenVerified2026-10.json.',
  },
];

// ---------------------------------------------------------------------------
// Puzzle selection, daily (ET-seeded, sitewide convention) + unlimited.
// ---------------------------------------------------------------------------

/**
 * Round 950 grew the pool from 18 sheets to 40. dailyIndex shuffles the
 * pool in cycles the length of the pool, so a longer pool deals a different
 * sheet on every date: a daily already played would change under the people
 * who played it, and the day the release lands would change mid day. So a
 * daily dated before this keeps dealing from the first 18 sheets exactly as
 * it did (they stay at indexes 0 to 17, in order), and every daily from this
 * date on deals from the first 40. Unlimited uses the whole pool at once.
 * The 40 is a number, not the length of the list, for the same reason: a
 * sheet added later goes on the end and joins Unlimited at once, and joins
 * the daily only through a new cutover date of its own, never by moving
 * every deal from today on.
 * Set a week and a bit out on purpose: the release has to land before it.
 * scripts/simMissingElevenSources.mjs proves the old deal is unchanged and
 * holds the first 40 sheets to their order.
 */
export const ELEVEN_GROWN_DAILY_FROM = '2026-10-12';
export const ELEVEN_ORIGINAL_POOL = 18;
export const ELEVEN_GROWN_POOL = 40;

/** How many sheets the daily for this ET date deals from. */
export function elevenDailyPoolSize(dateStr: string): number {
  return dateStr < ELEVEN_GROWN_DAILY_FROM ? ELEVEN_ORIGINAL_POOL : ELEVEN_GROWN_POOL;
}

export function getDailyElevenPuzzle(): ActiveElevenPuzzle {
  const today = getTodayET();
  const seed = dateSeed(today);
  const lineup = ELEVEN_LINEUPS[dailyIndex(today, elevenDailyPoolSize(today))];
  const candidate = lineup.blankCandidates[Math.floor(seed / 7) % lineup.blankCandidates.length];
  return { lineup, candidate };
}

export function getRandomElevenPuzzle(): ActiveElevenPuzzle {
  const lineup = ELEVEN_LINEUPS[Math.floor(Math.random() * ELEVEN_LINEUPS.length)];
  const candidate = lineup.blankCandidates[Math.floor(Math.random() * lineup.blankCandidates.length)];
  return { lineup, candidate };
}

/** All names across the file, for local guess suggestions. */
export const ALL_ELEVEN_NAMES: string[] = Array.from(
  new Set(ELEVEN_LINEUPS.flatMap((l) => l.slots.map((s) => s.name)))
);

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
export function normalizeElevenName(name: string): string {
  return foldSpecialLatin(name.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/\./g, '').replace(/'/g, ''));
}

/** A guess is correct if it matches the blanked candidate (full name, an alias, or surname). */
export function isCorrectElevenGuess(guess: string, candidate: ElevenBlankCandidate): boolean {
  const g = normalizeElevenName(guess);
  const target = normalizeElevenName(candidate.name);
  if (g === target) return true;
  if ((candidate.aliases ?? []).some((a) => normalizeElevenName(a) === g)) return true;
  const surname = target.split(' ').slice(-1)[0];
  return g === surname && surname.length >= 4;
}

/**
 * Hint ladder (mirrors Missing Five/Nine): hints never restate what the card
 * shows (position is always visible on the blank row).
 *   1: nationality
 *   2: surname first letter
 *   3: surname letter count
 */
export function elevenHintForLevel(level: ElevenHintLevel, candidate: ElevenBlankCandidate): string | null {
  const surname = candidate.name.split(' ').slice(-1)[0];
  if (level >= 3) return `The surname has ${surname.length} letters`;
  if (level >= 2) return `The surname starts with "${surname[0]}"`;
  if (level >= 1) return `Nationality: ${candidate.nationality}`;
  return null;
}

export const ELEVEN_SCORES = [100, 70, 40] as const;
