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
