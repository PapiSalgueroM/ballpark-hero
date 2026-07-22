import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Missing Eleven (task #39 — the NFL port of Missing XI): a famous real
 * Super Bowl STARTING OFFENSE (11 players) is shown with ONE name blanked.
 * 3 guesses, hint ladder, 100/70/40 scoring — same mechanic as /missing-five
 * and /missing-nine.
 *
 * CONTENT VERIFICATION METHOD:
 * pro-football-reference hides its "Starters" tables inside HTML comments
 * (empty on plain fetch), so lineups below were extracted 2026-07-22 from the
 * CHROME-RENDERED pfr box score DOM (tables #vis_starters/#home_starters)
 * and cross-verified against the Wikipedia article's "Starting lineups"
 * table for the same game. Both sources matched 22/22 on offense for SB LI.
 *
 * THE TRAPS ARE THE POINT — double-confirmed, do NOT "fix" them:
 *   - SB LI Patriots: Dion LEWIS started at RB. LeGarrette Blount and James
 *     White (three TDs incl. the OT winner) came off the bench. Rookie
 *     Malcolm MITCHELL started at WR ahead of Danny Amendola.
 *   - SB LI Falcons: Levine TOILOLO started at TE — Austin Hooper, who
 *     caught a touchdown, was not the starter.
 *
 * Guess checking is LOCAL (normalized compare against blankCandidates) — no
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
  /** Exactly 11 slots — the starting offense in pfr's listed order. */
  slots: ElevenSlot[];
  blankCandidates: ElevenBlankCandidate[];
  /** INTERNAL editor note on what was checked. Never rendered. */
  source: string;
}

export interface ActiveElevenPuzzle {
  lineup: ElevenLineup;
  candidate: ElevenBlankCandidate;
}

export type ElevenHintLevel = 0 | 1 | 2 | 3;

const S = (position: string, name: string): ElevenSlot => ({ position, name });

export const ELEVEN_LINEUPS: ElevenLineup[] = [
  // 1. Super Bowl LI — New England Patriots (the 28-3 comeback offense)
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
      { name: 'Dion Lewis', slotIndex: 1, nationality: 'USA', fact: 'Started at running back in the 28-3 comeback — James White, who scored the overtime winner, came off the bench.' },
      { name: 'Malcolm Mitchell', slotIndex: 2, nationality: 'USA', fact: 'The rookie wideout started ahead of Danny Amendola.' },
      { name: 'Martellus Bennett', slotIndex: 5, nationality: 'USA', fact: 'Started at tight end with Gronkowski out injured for the Super Bowl run.' },
    ],
    source: 'pfr box 201702050atl #vis_starters (Chrome-rendered DOM) + Wikipedia "Super Bowl LI" Starting lineups table — 11/11 match.',
  },

  // 2. Super Bowl LI — Atlanta Falcons (the 28-3 offense)
  {
    id: 'sb-li-atl',
    dateLabel: 'Super Bowl LI',
    competition: 'Super Bowl',
    matchDate: '2017-02-05',
    team: 'Atlanta Falcons',
    opponent: 'New England Patriots',
    scoreLine: 'Patriots 34-28 Falcons (OT)',
    venue: 'NRG Stadium, Houston',
    // Trap: Levine Toilolo started at TE — not Austin Hooper.
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
      { name: 'Levine Toilolo', slotIndex: 5, nationality: 'USA', fact: 'Started at tight end — Austin Hooper, who caught a touchdown that night, came off the bench.' },
      { name: 'Patrick DiMarco', slotIndex: 2, nationality: 'USA', fact: 'A fullback starting a Super Bowl — the MVP-season Falcons ran a two-back look.' },
      { name: 'Mohamed Sanu', slotIndex: 4, nationality: 'USA', fact: 'Started opposite Julio Jones; Taylor Gabriel was the third receiver off the bench.' },
    ],
    source: 'pfr box 201702050atl #home_starters (Chrome-rendered DOM) + Wikipedia "Super Bowl LI" Starting lineups table — 11/11 match.',
  },
  // 3. Super Bowl XLIX — New England Patriots (the Malcolm Butler game)
  // Verified 2026-07-22: pfr 201502010sea #vis_starters + Wikipedia "Super
  // Bowl XLIX" Starting lineups — 11/11 match (two-TE look, Vereen at RB).
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
      { name: 'Michael Hoomanawanui', slotIndex: 5, nationality: 'USA', fact: 'The second tight end in the opening two-TE look — the surname nobody can spell.' },
      { name: 'Brandon LaFell', slotIndex: 2, nationality: 'USA', fact: 'The forgotten starter of the receiving corps alongside Edelman and Gronkowski.' },
    ],
    source: 'pfr box 201502010sea #vis_starters (Chrome DOM) + Wikipedia SB XLIX Starting lineups — 11/11 match.',
  },

  // 4. Super Bowl XLIX — Seattle Seahawks (the goal-line interception)
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
      { name: 'Ricardo Lockette', slotIndex: 4, nationality: 'USA', fact: 'Started at receiver — and was the intended target on the goal-line interception that decided it.' },
      { name: 'Jermaine Kearse', slotIndex: 3, nationality: 'USA', fact: 'His juggling catch put Seattle at the goal line moments before the interception.' },
      { name: 'Luke Willson', slotIndex: 5, nationality: 'Canada', fact: 'The Canadian tight end from LaSalle, Ontario started with Seattle one yard from a repeat.' },
    ],
    source: 'pfr box 201502010sea #home_starters (Chrome DOM) + Wikipedia SB XLIX Starting lineups — 11/11 match.',
  },

  // 5. Super Bowl XLII — New England Patriots (18-1)
  // NOTE: the Giants lineup for this game is NOT shipped — pfr and Wikipedia
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
      { name: 'Kyle Brady', slotIndex: 5, nationality: 'USA', fact: 'The OTHER Brady — the blocking tight end in the two-TE set.' },
      { name: 'Benjamin Watson', slotIndex: 4, nationality: 'USA', fact: 'Started at tight end for the record-setting 2007 offense.' },
    ],
    source: 'pfr box 200802030nwe #home_starters (Chrome DOM) + Wikipedia SB XLII Starting lineups — 11/11 match. Giants side dropped: sources disagree on the 11th starter.',
  },

  // 6. Super Bowl 50 — Denver Broncos (Peyton's last ride)
  // NOTE: the Panthers lineup is NOT shipped — pfr lists a 6-OL jumbo look
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
    source: 'pfr box 201602070den #home_starters (Chrome DOM) + Wikipedia Super Bowl 50 Starting lineups — 11/11 match. Panthers side dropped: sources disagree on the receiver slots.',
  },

  // 7. Super Bowl LVII — Kansas City Chiefs (the Kelce Bowl)
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
      { name: 'Noah Gray', slotIndex: 5, nationality: 'USA', fact: 'The second tight end behind Travis Kelce — the starter nobody remembers.' },
      { name: 'JuJu Smith-Schuster', slotIndex: 3, nationality: 'USA', fact: 'Started at receiver in his single season as a Chief.' },
    ],
    source: 'pfr box 202302120phi #vis_starters (Chrome DOM) + Wikipedia SB LVII Starting lineups — 11/11 match (wiki resolves pfr\'s generic OL labels).',
  },

  // 8. Super Bowl LVII — Philadelphia Eagles
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
      { name: 'Jason Kelce', slotIndex: 8, nationality: 'USA', fact: 'Faced his brother Travis — the first brothers ever to play each other in a Super Bowl.' },
      { name: 'Jordan Mailata', slotIndex: 6, nationality: 'Australia', fact: 'The Australian former rugby league player started at left tackle.' },
    ],
    source: 'pfr box 202302120phi #home_starters (Chrome DOM) + Wikipedia SB LVII Starting lineups — 11/11 match.',
  },
];

// ---------------------------------------------------------------------------
// Puzzle selection — daily (ET-seeded, sitewide convention) + unlimited.
// ---------------------------------------------------------------------------

export function getDailyElevenPuzzle(): ActiveElevenPuzzle {
  const seed = dateSeed(getTodayET());
  const lineup = ELEVEN_LINEUPS[seed % ELEVEN_LINEUPS.length];
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
  return name.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/\./g, '').replace(/'/g, '');
}

/** A guess is correct if it matches the blanked candidate (full name or surname). */
export function isCorrectElevenGuess(guess: string, candidate: ElevenBlankCandidate): boolean {
  const g = normalizeElevenName(guess);
  const target = normalizeElevenName(candidate.name);
  if (g === target) return true;
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
