import { useState, useMemo, useCallback } from 'react';
import { worldCupPuzzles } from '@/data/worldCupPuzzles';
import { WorldCupPuzzle, WorldCupClue, WorldCupGameStatus } from '@/types/worldCup';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET } from '@/lib/dateUtils';

/**
 * Hard upper bound on clue slots — a CLAMP ONLY, never a game-ending test.
 *
 * getClues returns SIX clues, not seven, when the player is from the host
 * nation (the 'Host Country' clue is dropped as a giveaway). Gating the run on
 * this constant instead of the live clues.length is exactly what broke the game
 * (see playableClues below). Anything that decides "are we out of clues?" must
 * use playableClues.
 *
 * The two surviving uses are safe: dailyRevealedCount clamps to it (the real
 * clamp happens in revealedClues), and useDailyPuzzle's isLost keeps it as a
 * backstop. isLost genuinely cannot see playableClues — it is config for the
 * very hook that returns dailyPuzzle, so the dependency is circular — but it no
 * longer matters: submitGuess/skipClue now emit a 'g' action once
 * playableClues is exhausted, and isLost's first clause catches that.
 */
const MAX_CLUES = 7;
const POINTS_BY_CLUE: Record<number, number> = { 1: 1000, 2: 800, 3: 600, 4: 400, 5: 300, 6: 200, 7: 100 };

// Seeded PRNG — deterministic per seed+index
function seededRandom(seed: number, index: number): number {
  let s = (seed ^ (index * 2654435761)) >>> 0;
  s = ((s ^ (s >>> 16)) * 0x45d9f3b) >>> 0;
  s = ((s ^ (s >>> 16)) * 0x45d9f3b) >>> 0;
  return (s ^ (s >>> 16)) / 0xffffffff;
}

/**
 * Daily clue-order seed. Uses getTodayET, not new Date().toISOString() —
 * dateUtils.ts is explicit that the UTC form "breaks the shared daily
 * experience for US users", since it rolls over at 7-8pm local rather than
 * midnight ET. Fixed 2026-07-15; this hook was still on the UTC form.
 */
function getDailySeed(): number {
  const [y, m, d] = getTodayET().split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function isGuessCorrect(guess: string, puzzle: WorldCupPuzzle): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const answerNorm = normalize(puzzle.answer);
  if (g === answerNorm) return true;
  if (puzzle.aliases?.some(alias => normalize(alias) === g)) return true;
  const answerParts = answerNorm.split(/\s+/);
  if (answerParts.length > 1 && answerParts[answerParts.length - 1] === g) return true;
  if (answerParts.length > 1 && answerParts[0] === g && g.length >= 4) return true;
  const guessParts = g.split(/\s+/);
  if (guessParts.length >= 2 && answerParts.every(part => guessParts.includes(part))) return true;
  return false;
}

function getClues(puzzle: WorldCupPuzzle, seed?: number): WorldCupClue[] {
  const isHostNation = puzzle.hostCountry === puzzle.country;

  // Middle clues (shuffleable) — skip 'Host Country' when player is from host nation
  const middle: WorldCupClue[] = [
    ...(isHostNation ? [] : [{ label: 'Host Country', value: puzzle.hostCountry }]),
    { label: isHostNation ? 'Country (Host Nation)' : 'Country', value: puzzle.country },
    { label: 'Position', value: puzzle.position },
    { label: 'Club at the Time', value: puzzle.clubAtTime },
    { label: 'Achievement', value: puzzle.achievement },
  ];

  // Shuffle middle clues when a seed is provided
  if (seed !== undefined) {
    for (let i = middle.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed, i) * (i + 1));
      [middle[i], middle[j]] = [middle[j], middle[i]];
    }
  }

  return [
    { label: 'Year', value: String(puzzle.year) },
    ...middle,
    { label: 'Answer', value: puzzle.answer },
  ];
}

// Action persisted per guess attempt
type WCAction =
  | { t: 'w'; v: string }   // wrong guess
  | { t: 's' }              // skip
  | { t: 'ok'; v: string }  // correct (won)
  | { t: 'g' };             // give up / auto-lose at last clue

export type WorldCupMode = 'daily' | 'unlimited';

// Frozen Era: every distinct World Cup year present in the puzzle bank, newest first.
// 'all' keeps the classic random-any-year behavior in Unlimited mode.
export const FROZEN_ERA_YEARS: number[] = Array.from(
  new Set(worldCupPuzzles.map(p => p.year))
).sort((a, b) => b - a);

export type FrozenEra = 'all' | number;

function poolForEra(era: FrozenEra): WorldCupPuzzle[] {
  if (era === 'all') return worldCupPuzzles;
  const filtered = worldCupPuzzles.filter(p => p.year === era);
  return filtered.length > 0 ? filtered : worldCupPuzzles;
}

function countProgression(actions: WCAction[]): number {
  // wrong + skip actions each advance the clue
  return actions.filter(a => a.t === 'w' || a.t === 's').length;
}

export function useWorldCup() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<WorldCupMode>('daily');

  // ---- DAILY ---------------------------------------------------------------
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    reset: resetDailyHook,
  } = useDailyPuzzle<WorldCupPuzzle, WCAction>({
    gameSlug: 'world-cup',
    puzzles: worldCupPuzzles,
    maxGuesses: 999, // ends via isWon/isLost only
    isWon: (g) => g.some(a => a.t === 'ok'),
    isLost: (g) =>
      g.some(a => a.t === 'g') ||
      (!g.some(a => a.t === 'ok') && 1 + countProgression(g) >= MAX_CLUES),
    deserializeGuesses: (raw) => raw as WCAction[],
  });

  // Derived daily state
  const dailyRevealedCount = Math.min(1 + countProgression(dailyActions), MAX_CLUES);
  const dailyAttempts = dailyActions.filter(a => a.t === 'w').map(a => a.v);

  // ---- UNLIMITED -----------------------------------------------------------
  // Frozen Era: lock the puzzle pool to one past World Cup year, or 'all' for classic behavior.
  const [era, setEraState] = useState<FrozenEra>('all');
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState(
    () => worldCupPuzzles[Math.floor(Math.random() * worldCupPuzzles.length)]
  );
  const [unlimitedSeed, setUnlimitedSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [revealedCount, setRevealedCount] = useState(1);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<WorldCupGameStatus>('playing');

  // ---- SHARED LOCAL STATE --------------------------------------------------
  const [guess, setGuess] = useState('');

  // ---- ACTIVE VALUES -------------------------------------------------------
  const puzzle           = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const activeRevealed   = mode === 'daily' ? dailyRevealedCount : revealedCount;
  const activeAttempts   = mode === 'daily' ? dailyAttempts : attempts;
  const gameStatus       = mode === 'daily' ? (rawDailyStatus as WorldCupGameStatus) : unlimitedStatus;

  // Clue order: daily uses date seed (same for everyone), unlimited uses per-puzzle seed
  const clueSeed = mode === 'daily' ? getDailySeed() : unlimitedSeed;
  const clues = useMemo(() => (puzzle ? getClues(puzzle, clueSeed) : []), [puzzle, clueSeed]);
  const totalClues = clues.length; // 6 when player = host nation, 7 otherwise

  /**
   * How many clues the player can actually be shown while still guessing.
   *
   * The LAST entry from getClues is always { label: 'Answer' } — it exists to be
   * revealed once the game is over (the page only styles it as the big gold
   * reveal when `isFinalReveal`, i.e. gameStatus !== 'playing'). So it must
   * never enter revealedClues during play.
   *
   * BUG FIX 2026-07-15 — this is why the game was pulled on 2026-07-08 as
   * "buggy (hint x3 -> blank screen)". Two faults, compounding:
   *  1. Both modes ended the run at `>= totalClues`, so the final reveal index
   *     was reachable while still playing — the page then rendered the Answer as
   *     an ordinary clue, literally captioned "Answer", while the input box kept
   *     asking you to guess it.
   *  2. Daily mode compared against the CONSTANT MAX_CLUES (7) rather than the
   *     live clues.length. For a host-nation puzzle getClues returns only 6, so
   *     daily hit the Answer a clue earlier AND kept going to 7 on a 6-length
   *     array. That's 9 of the 60 puzzles — and they're the marquee ones:
   *     Beckenbauer '74, Kempes '78, Schillaci '90, Zidane '98, Klose '06,
   *     Neymar '14.
   * Unlimited mode already used totalClues (right idea, still off by the Answer
   * slot); daily used the constant. Both now use playableClues.
   */
  const playableClues = Math.max(1, totalClues - 1);

  const revealedClues = clues.slice(0, Math.min(activeRevealed, gameStatus === 'playing' ? playableClues : totalClues));
  const score = gameStatus === 'won' ? (POINTS_BY_CLUE[activeRevealed] ?? 100) : 0;

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: WorldCupMode) => setMode(newMode), []);

  const submitGuess = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed || gameStatus !== 'playing' || !puzzle) return;
    const correct = isGuessCorrect(trimmed, puzzle);

    if (mode === 'daily') {
      if (correct) {
        addDailyAction({ t: 'ok', v: puzzle.answer });
      } else if (dailyRevealedCount >= playableClues) {
        // Out of clues: a wrong guess here ends the game (and only now does the
        // Answer clue get revealed, as the gold final reveal).
        addDailyAction({ t: 'g' });
      } else {
        addDailyAction({ t: 'w', v: trimmed });
      }
    } else {
      if (correct) {
        // Correct guesses are shown on the result screen, not the wrong-attempts
        // pill list, so they must not be pushed into `attempts`.
        setUnlimitedStatus('won');
      } else {
        setAttempts(prev => [...prev, trimmed]);
        if (revealedCount >= playableClues) {
          setUnlimitedStatus('lost');
        } else {
          setRevealedCount(c => c + 1);
        }
      }
    }
  }, [mode, gameStatus, puzzle, dailyRevealedCount, revealedCount, playableClues, addDailyAction]);

  const skipClue = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      if (dailyRevealedCount >= playableClues) {
        addDailyAction({ t: 'g' });
      } else {
        addDailyAction({ t: 's' });
      }
    } else {
      if (revealedCount >= playableClues) {
        setUnlimitedStatus('lost');
      } else {
        setRevealedCount(c => c + 1);
      }
    }
  }, [mode, gameStatus, dailyRevealedCount, revealedCount, playableClues, addDailyAction]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'g' });
    } else {
      setUnlimitedStatus('lost');
      setRevealedCount(totalClues);
    }
  }, [mode, gameStatus, totalClues, addDailyAction]);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
      resetDailyHook();
    } else {
      const pool = poolForEra(era);
      setUnlimitedPuzzle(pool[Math.floor(Math.random() * pool.length)]);
      setUnlimitedSeed(Math.floor(Math.random() * 1e9));
      setRevealedCount(1);
      setAttempts([]);
      setUnlimitedStatus('playing');
    }
    setGuess('');
  }, [mode, resetDailyHook, era]);

  // Changing the Frozen Era filter (Unlimited mode only) draws a fresh puzzle
  // from the newly locked pool and restarts the current round.
  const setEra = useCallback((newEra: FrozenEra) => {
    setEraState(newEra);
    const pool = poolForEra(newEra);
    setUnlimitedPuzzle(pool[Math.floor(Math.random() * pool.length)]);
    setUnlimitedSeed(Math.floor(Math.random() * 1e9));
    setRevealedCount(1);
    setAttempts([]);
    setUnlimitedStatus('playing');
    setGuess('');
  }, []);

  // ---- COMPLETION ----------------------------------------------------------
  const dailyScore = rawDailyStatus === 'won' ? (POINTS_BY_CLUE[dailyRevealedCount] ?? 100) : 0;
  useGameCompletion('world-cup', rawDailyStatus !== 'playing', dailyScore);

  return {
    mode,
    switchMode,
    puzzle,
    clues,
    revealedClues,
    revealedCount: activeRevealed,
    totalClues,
    guess,
    setGuess,
    attempts: activeAttempts,
    submitGuess,
    skipClue,
    giveUp,
    resetGame,
    gameStatus,
    score,
    isLoading: mode === 'daily' ? isLoading : false,
    // Frozen Era: Unlimited-mode-only filter that locks the puzzle pool to one past World Cup year.
    era,
    setEra,
  };
}
