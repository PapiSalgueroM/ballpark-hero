import { normalizeName, WhoAmIPlayer } from '@/lib/whoAmI';

/**
 * Alphabet Sprint (timed surname quickfire)
 *
 * Pool: the Who Am I pool (top ~400 currentish players by market value from
 * fetchWhoAmIPool, already sorted by value desc). Each player is bucketed by
 * the first letter of their surname, where the surname is the last word of the
 * name after skipping suffixes like Jr / Junior / Filho / Neto, accent-folded
 * down to plain A-Z (Ederson with the accent lands on E, Odegaard's slashed O
 * lands on O, Skriniar's S-caron lands on S).
 *
 * Letter wheel: only letters holding at least MIN_PLAYERS_PER_LETTER players
 * in the full pool are ever drawn. With the current 400-player pool that
 * excludes I, Q, U, X, Y and Z (checked in SQL on 2026-07-02; the sets are
 * recomputed from live data on every boot, so drift takes care of itself).
 * Draws are weighted by how many unnamed players remain on each letter, and
 * the same letter never shows up twice in a row.
 *
 * Scoring: +1 per correct pick, +1 bonus on every STREAK_BONUS_EVERY-th pick
 * in a row. Skipping never costs points (only time) but restarts the streak.
 * Each player can be named once per run.
 *
 * Answers are typed in full and submitted (resolveSprintGuess below), there
 * is deliberately no autocomplete during play, since suggestions were handing
 * the answers over after two typed letters.
 */

export type SprintModeId = 'relaxed' | 'classic' | 'insane';

export interface SprintMode {
  id: SprintModeId;
  label: string;
  seconds: number;
  tagline: string;
}

export const MODES: SprintMode[] = [
  { id: 'relaxed', label: 'Relaxed', seconds: 75, tagline: 'A quicker 75 seconds' },
  { id: 'classic', label: 'Classic', seconds: 45, tagline: 'The standard sprint' },
  { id: 'insane', label: 'Insane', seconds: 20, tagline: '20 seconds of chaos' },
];

export const DEFAULT_MODE: SprintModeId = 'classic';

export function modeById(id: SprintModeId): SprintMode {
  return MODES.find(m => m.id === id) ?? MODES[1];
}

/** A letter needs at least this many pool players to ever appear on the wheel. */
export const MIN_PLAYERS_PER_LETTER = 5;

/** Every Nth correct pick in a row pays one bonus point on top of the +1. */
export const STREAK_BONUS_EVERY = 5;

export interface SprintPlayer {
  name: string;
  surname: string;
  /** Uppercase A-Z bucket for the surname's first letter. */
  letter: string;
  nationality: string;
  club: string;
  value: number;
}

/** Suffix words skipped when the surname is taken as the last word of the name. */
const SUFFIXES = new Set(['jr', 'jr.', 'jnr', 'sr', 'sr.', 'ii', 'iii', 'iv', 'junior', 'filho', 'neto', 'segundo']);

/** Last word of the name, skipping suffixes: "Vinicius Junior" gives "Vinicius". */
export function surnameOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  let i = parts.length - 1;
  while (i > 0 && SUFFIXES.has(parts[i].toLowerCase())) i--;
  return parts[i] ?? '';
}

// normalizeName strips NFD combining marks (accented E becomes e) but a few
// letters never decompose, so they get folded by hand before bucketing.
const LETTER_FOLD: Record<string, string> = {
  'ø': 'o', 'œ': 'o', 'æ': 'a', 'ð': 'd', 'đ': 'd', 'ł': 'l', 'ß': 's', 'þ': 't', 'ı': 'i',
};

/** Uppercase A-Z bucket for a surname, or '' when it does not start with a letter. */
export function letterOf(surname: string): string {
  const n = normalizeName(surname);
  if (!n) return '';
  const c = LETTER_FOLD[n[0]] ?? n[0];
  return c >= 'a' && c <= 'z' ? c.toUpperCase() : '';
}

/** Maps the Who Am I pool into sprint players, dropping anything unbucketable. */
export function buildSprintPool(pool: WhoAmIPlayer[]): SprintPlayer[] {
  const out: SprintPlayer[] = [];
  for (const p of pool) {
    const surname = surnameOf(p.name);
    const letter = letterOf(surname);
    if (!letter) continue;
    out.push({ name: p.name, surname, letter, nationality: p.nationality, club: p.club, value: p.value });
  }
  return out;
}

/** Players per letter across the given list. */
export function letterCounts(players: SprintPlayer[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of players) counts.set(p.letter, (counts.get(p.letter) ?? 0) + 1);
  return counts;
}

/** Letters allowed on the wheel: at least MIN_PLAYERS_PER_LETTER pool players. */
export function playableLetters(players: SprintPlayer[]): Set<string> {
  const playable = new Set<string>();
  for (const [letter, n] of letterCounts(players)) {
    if (n >= MIN_PLAYERS_PER_LETTER) playable.add(letter);
  }
  return playable;
}

/**
 * Draws the next target letter. Weight = number of still-unnamed players on
 * each playable letter (so B and M come up more than E and F, and a letter you
 * have milked dry drops off the wheel entirely). Never repeats lastLetter
 * unless it is the only letter left. Returns null once everything is exhausted.
 */
export function drawLetter(
  players: SprintPlayer[],
  used: Set<string>,
  playable: Set<string>,
  lastLetter: string | null,
  rng: () => number = Math.random,
): string | null {
  const remaining = new Map<string, number>();
  for (const p of players) {
    if (!playable.has(p.letter) || used.has(p.name)) continue;
    remaining.set(p.letter, (remaining.get(p.letter) ?? 0) + 1);
  }
  let entries = [...remaining.entries()].filter(([letter]) => letter !== lastLetter);
  if (entries.length === 0) entries = [...remaining.entries()];
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  let roll = rng() * total;
  for (const [letter, n] of entries) {
    roll -= n;
    if (roll <= 0) return letter;
  }
  return entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// Guess resolution (2026-07-08, owner: "too easy, they can just put two
// letters and the suggestion gives them the answer; make them spell out the
// name and submit"). The old suggestForLetter() showed live suggestions after
// 2 typed letters, which handed the answers over. There is no suggestion list
// during play anymore: the player spells a name and submits, and the resolver
// below decides whether it names exactly one unused player on the current
// letter. Timer, streaks and scoring are untouched.
// ---------------------------------------------------------------------------

export type SprintGuessOutcome =
  | { kind: 'hit'; player: SprintPlayer }
  /** The bare surname fits 2+ unused pool players; the UI asks for the full name without listing them. */
  | { kind: 'ambiguous'; count: number }
  | { kind: 'miss' };

/**
 * normalizeName plus punctuation folding, so "alexander arnold" matches
 * "Alexander-Arnold" and "oneill" matches "O'Neill" without accent or case
 * fuss (normalizeName already handles those).
 */
function foldForMatch(s: string): string {
  return normalizeName(s)
    .replace(/['’]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a typed, submitted guess against the unused players on the target
 * letter. Lenient on the FORM of the answer, strict on knowing it:
 *   - full name always accepted ("virgil van dijk", accents/case ignored);
 *   - a bare surname is accepted ONLY when it fits exactly one unused player
 *     on this letter ("haaland"); if several fit ("silva"), the result is
 *     'ambiguous' and the UI asks for the full name WITHOUT revealing the
 *     candidates;
 *   - a multi-word name tail counts as a surname answer too ("van dijk"),
 *     but only when it contains the real surname word, so lone suffixes like
 *     "junior" never match Vinicius Junior.
 * Anything else is a miss. Nothing here ever returns a list of names, so the
 * UI cannot leak answers the player didn't already know.
 */
export function resolveSprintGuess(
  players: SprintPlayer[],
  letter: string,
  rawInput: string,
  used: Set<string>,
): SprintGuessOutcome {
  const q = foldForMatch(rawInput);
  if (q.length < 2) return { kind: 'miss' };
  const qTokenCount = q.split(' ').length;

  const surnameMatches: SprintPlayer[] = [];
  for (const p of players) {
    if (p.letter !== letter || used.has(p.name)) continue;
    const full = foldForMatch(p.name);
    if (full === q) return { kind: 'hit', player: p };
    const surname = foldForMatch(p.surname);
    if (surname === q) {
      surnameMatches.push(p);
      continue;
    }
    if (qTokenCount >= 2 && surname) {
      const fullTokens = full.split(' ');
      if (qTokenCount < fullTokens.length) {
        const tail = fullTokens.slice(fullTokens.length - qTokenCount).join(' ');
        if (tail === q && q.includes(surname)) surnameMatches.push(p);
      }
    }
  }

  if (surnameMatches.length === 1) return { kind: 'hit', player: surnameMatches[0] };
  if (surnameMatches.length > 1) return { kind: 'ambiguous', count: surnameMatches.length };
  return { kind: 'miss' };
}

/** Points for a correct pick that brings the streak up to newStreak. */
export function pointsFor(newStreak: number): number {
  return newStreak > 0 && newStreak % STREAK_BONUS_EVERY === 0 ? 2 : 1;
}

/**
 * Wave 15: partial-credit tiers for a run's letter coverage. There is no
 * fixed 26-letter sweep in this timed sprint (letters are drawn and can be
 * skipped or exhausted), so the denominator is the letters actually playable
 * this run, the closest real analog to "all 26 letters" once I/Q/U/X/Y/Z-style
 * thin letters are excluded per playableLetters(). Gold requires clearing
 * every playable letter, Silver 75%+, Bronze 50%+, anything below stays a
 * non-tiered, encouraging result.
 */
export type SprintTier = 'gold' | 'silver' | 'bronze' | null;

export const SPRINT_TIER_THRESHOLDS: Record<'gold' | 'silver' | 'bronze', number> = {
  gold: 100,
  silver: 75,
  bronze: 50,
};

/** Distinct letters with at least one named player this run. */
export function distinctLettersNamed(named: SprintPlayer[]): number {
  return new Set(named.map(p => p.letter)).size;
}

export function sprintTier(lettersNamed: number, playableCount: number): SprintTier {
  if (playableCount <= 0) return null;
  const pct = (lettersNamed / playableCount) * 100;
  if (pct >= SPRINT_TIER_THRESHOLDS.gold) return 'gold';
  if (pct >= SPRINT_TIER_THRESHOLDS.silver) return 'silver';
  if (pct >= SPRINT_TIER_THRESHOLDS.bronze) return 'bronze';
  return null;
}

export const SPRINT_TIER_LABEL: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const SPRINT_TIER_EMOJI: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};
