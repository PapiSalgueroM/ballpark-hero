import { useState, useCallback, useMemo } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { EMOJI_PUZZLES, MIN_BANK_SIZE, type EmojiPuzzle } from '@/data/emojiPuzzles';

export interface RoundState {
  puzzle: EmojiPuzzle;
  guesses: string[];
  solved: boolean;
  /** 100 first try, 60 second, 30 third; 0 = failed. */
  points: number;
  done: boolean;
}

export interface EmojiGuessState {
  rounds: RoundState[];
  index: number;
  current: RoundState | null;
  finished: boolean;
  totalScore: number;
  solvedCount: number;
  hintVisible: boolean;
  guess: (value: string) => void;
  next: () => void;
  shareText: string;
}

const ROUNDS = 5;
const MAX_GUESSES = 3;
const POINTS = [100, 60, 30];
const STORAGE_PREFIX = 'emoji-guess-';

/** Same normalization approach as the other guess games: accents/case/punct-insensitive. */
function normalize(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCorrect(guessRaw: string, p: EmojiPuzzle): boolean {
  const g = normalize(guessRaw);
  if (!g) return false;
  const targets = [p.answer, ...p.aliases].map(normalize);
  if (targets.includes(g)) return true;
  // Surname match for people ("kante" for N'Golo Kanté), clubs too ("united"
  // is an alias, not a surname, so it's handled above instead).
  const answerParts = normalize(p.answer).split(' ');
  const last = answerParts[answerParts.length - 1];
  if (answerParts.length > 1 && last.length >= 4 && g === last) return true;
  // Full containment either way for multiword guesses ("kylian mbappe jr").
  const a = normalize(p.answer);
  if (a.length >= 6 && g.length >= 4 && (g.includes(a) || a.includes(g))) return true;
  return false;
}

function lcg(seed: number, i: number): number {
  return Math.abs((seed * (i + 17) * 1103515245 + 12345) >>> 0);
}

/**
 * Daily five: 2 easy, 2 medium, 1 hard, same for everyone (ET day seed).
 * Falls back to whatever exists if a bucket is thin, the MIN_BANK_SIZE guard
 * in the data file keeps that theoretical.
 */
function pickDaily(today: string): EmojiPuzzle[] {
  if (EMOJI_PUZZLES.length < MIN_BANK_SIZE) return EMOJI_PUZZLES.slice(0, ROUNDS);
  const seed = dateSeed(today);
  const buckets: Record<string, EmojiPuzzle[]> = { easy: [], medium: [], hard: [] };
  for (const p of EMOJI_PUZZLES) buckets[p.difficulty].push(p);
  const plan: Array<keyof typeof buckets> = ['easy', 'easy', 'medium', 'medium', 'hard'];
  const picked: EmojiPuzzle[] = [];
  const used = new Set<string>();
  plan.forEach((bucket, bi) => {
    const pool = buckets[bucket].filter(p => !used.has(p.id));
    const source = pool.length > 0 ? pool : EMOJI_PUZZLES.filter(p => !used.has(p.id));
    if (source.length === 0) return;
    const pick = source[lcg(seed, bi * 7) % source.length];
    used.add(pick.id);
    picked.push(pick);
  });
  return picked;
}

interface Saved {
  guesses: string[][];
  index: number;
}

function loadSaved(today: string): Saved | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw) as Saved;
  } catch { /* ignore */ }
  return null;
}

function save(today: string, guesses: string[][], index: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify({ guesses, index }));
  } catch { /* storage unavailable, playable, not resumable */ }
}

export function useEmojiGuess(): EmojiGuessState {
  const today = useMemo(() => getTodayET(), []);
  const puzzles = useMemo(() => pickDaily(today), [today]);
  const saved = useMemo(() => loadSaved(today), [today]);

  const [allGuesses, setAllGuesses] = useState<string[][]>(
    () => saved?.guesses ?? puzzles.map(() => []),
  );
  const [index, setIndex] = useState(() => saved?.index ?? 0);

  const rounds: RoundState[] = useMemo(
    () => puzzles.map((puzzle, i) => {
      const guesses = allGuesses[i] ?? [];
      const solvedAt = guesses.findIndex(g => isCorrect(g, puzzle));
      const solved = solvedAt >= 0;
      return {
        puzzle,
        guesses,
        solved,
        points: solved ? POINTS[solvedAt] ?? 30 : 0,
        done: solved || guesses.length >= MAX_GUESSES,
      };
    }),
    [puzzles, allGuesses],
  );

  const finished = rounds.length > 0 && index >= rounds.length;
  const current = finished ? null : (rounds[index] ?? null);
  const totalScore = rounds.reduce((s, r) => s + r.points, 0);
  const solvedCount = rounds.filter(r => r.solved).length;
  const hintVisible = !!current && current.guesses.length >= 1 && !current.done;

  useGameCompletion('emoji-guess', finished, totalScore, solvedCount);

  const guess = useCallback((value: string) => {
    const v = value.trim();
    if (!v || !current || current.done) return;
    setAllGuesses(prev => {
      const next = prev.map(a => [...a]);
      next[index] = [...(next[index] ?? []), v];
      save(today, next, index);
      return next;
    });
  }, [current, index, today]);

  const next = useCallback(() => {
    const n = index + 1;
    setIndex(n);
    save(today, allGuesses, n);
  }, [index, allGuesses, today]);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const squares = rounds.map(r => {
      if (!r.solved) return '🟥';
      if (r.points === 100) return '🟩';
      if (r.points === 60) return '🟨';
      return '🟧';
    }).join('');
    return `Emoji Guess, ${today}\n${squares}\n${solvedCount}/${rounds.length} solved · ${totalScore} pts\ndouknowball.com/emoji-guess`;
  }, [finished, rounds, solvedCount, totalScore, today]);

  return { rounds, index, current, finished, totalScore, solvedCount, hintVisible, guess, next, shareText };
}
