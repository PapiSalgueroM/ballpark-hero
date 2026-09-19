import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dateSeed, dailyDraw } from '@/lib/dateUtils';
import { fetchQuizBoardClues, VALUES, type Clue, type ClueValue } from '@/lib/fetchQuizBoard';
import { markRestoredFinish } from '@/lib/restoredFinish';

export interface Tile {
  clue: Clue;
  answered: boolean;
  correct: boolean | null;
}

export interface QuizBoardState {
  loading: boolean;
  categories: string[];
  board: Record<string, Record<ClueValue, Tile | undefined>>;
  openTile: Tile | null;
  score: number;
  /** What a cleared board banks and records: the score, floored at 0. */
  banked: number;
  answeredCount: number;
  totalTiles: number;
  finished: boolean;
  guess: string;
  setGuess: (s: string) => void;
  select: (category: string, value: ClueValue) => void;
  submit: () => void;
  closeTile: () => void;
  shareText: string;
}

const BOARD_CATEGORIES = 5;
/* The game is called Sports Quiz Board everywhere a player can see it, and
   since Round 305 it lives at /quiz-board (the old address redirects). This
   storage key and the completion key below keep their old spelling on
   purpose: changing them would wipe every player's saved board and break
   their streak history. Renaming them is a data migration, not a copy edit,
   so it is a job of its own. */
const STORAGE_PREFIX = 'jeopardy-';

/**
 * Loose answer matching. Quiz board answers are proper nouns typed by hand, so
 * we accept case/accent/punctuation differences and allow a surname-only match
 * for people ("Weah" for "George Weah"). Deliberately generous, being pedantic
 * about diacritics would just feel broken.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCorrect(guess: string, answer: string): boolean {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g) return false;
  if (g === a) return true;
  // surname / last-word match, min 4 chars to avoid "the"/"fc" false hits
  const last = a.split(' ').slice(-1)[0];
  if (last.length >= 4 && g === last) return true;
  // guess contains the full answer or vice versa (e.g. "Man City" vs "Manchester City")
  if (a.length >= 6 && (g.includes(a) || a.includes(g)) && g.length >= 4) return true;
  return false;
}

function loadSaved(today: string) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw) as { results: Record<string, boolean>; score: number };
  } catch { /* ignore */ }
  return null;
}

function save(today: string, results: Record<string, boolean>, score: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify({ results, score }));
  } catch { /* storage unavailable */ }
}

/**
 * Only categories that actually have a clue at EVERY value tier can form a
 * column, otherwise the board would have holes. Audit found 5 such
 * categories; Premier League (no 800/1000) and Ballon d'Or Féminin (200 only)
 * legitimately can't fill a column and are excluded here rather than faked.
 *
 * Round 643: this and pickClue were the bodies of the board memos. They are
 * functions now so the restore can build today's board from a pool before it
 * is set, and the memos call the same code, so the two cannot drift.
 */
function pickCategories(clues: Clue[], today: string): string[] {
  if (clues.length === 0) return [];
  const byCat = new Map<string, Set<number>>();
  for (const c of clues) {
    if (!byCat.has(c.category)) byCat.set(c.category, new Set());
    byCat.get(c.category)!.add(c.value);
  }
  const full = [...byCat.entries()]
    .filter(([, vals]) => VALUES.every(v => vals.has(v)))
    .map(([cat]) => cat)
    .sort();
  if (full.length <= BOARD_CATEGORIES) return full;
  // rotate the selection daily
  const seed = dateSeed(today);
  const picked: string[] = [];
  const pool = [...full];
  for (let i = 0; i < BOARD_CATEGORIES && pool.length > 0; i++) {
    const idx = Math.abs((seed * (i + 11) * 1103515245 + 12345) >>> 0) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.sort();
}

/* Round 229: was pickDeterministic(options, rawSeed + offsets), which walks
   +1 per day through the alternatives, so tomorrow's tile was always simply
   the next clue. A labelled dailyDraw keeps it deterministic per day and
   unguessable across days, same as every other daily pick since Round 224. */
function pickClue(clues: Clue[], category: string, value: ClueValue, today: string): Clue | undefined {
  const options = clues.filter(c => c.category === category && c.value === value);
  if (options.length === 0) return undefined;
  return options[dailyDraw(options.length, `quiz-board:${today}:${category}:${value}`)];
}

/** Round 643: every clue on today's board, the tiles `finished` counts. */
function boardClueIds(clues: Clue[], today: string): string[] {
  return pickCategories(clues, today).flatMap(cat =>
    VALUES.map(v => pickClue(clues, cat, v, today)).filter((c): c is Clue => !!c).map(c => c.clueId));
}

export function useQuizBoard(): QuizBoardState {
  const today = useMemo(() => getTodayET(), []);
  const saved = useMemo(() => loadSaved(today), [today]);

  const [clues, setClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<string, boolean>>(saved?.results ?? {});
  const [score, setScore] = useState(saved?.score ?? 0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [guess, setGuess] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchQuizBoardClues().then(c => {
      if (cancelled) return;
      /* Round 643: the saved results are restored in a state initializer,
         but `finished` needs the board, and the board arrives here, after
         mount. A board the saved results already finish is a restored
         finish and says so first, or the completion hook sees false then
         true and records it again on every reload. */
      const done = saved?.results && typeof saved.results === 'object' ? saved.results : null;
      const ids = boardClueIds(c, today);
      if (done && ids.length > 0 && ids.every(id => id in done)) markRestoredFinish('jeopardy');
      setClues(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [today, saved]);

  const categories = useMemo(() => pickCategories(clues, today), [clues, today]);

  const board = useMemo(() => {
    const out: Record<string, Record<ClueValue, Tile | undefined>> = {};
    for (const cat of categories) {
      out[cat] = {} as Record<ClueValue, Tile | undefined>;
      VALUES.forEach(v => {
        const chosen = pickClue(clues, cat, v, today);
        if (!chosen) { out[cat][v] = undefined; return; }
        out[cat][v] = {
          clue: chosen,
          answered: chosen.clueId in results,
          correct: results[chosen.clueId] ?? null,
        };
      });
    }
    return out;
  }, [categories, clues, today, results]);

  const allTiles = useMemo(
    () => categories.flatMap(cat => VALUES.map(v => board[cat]?.[v]).filter(Boolean) as Tile[]),
    [categories, board],
  );
  const totalTiles = allTiles.length;
  const answeredCount = allTiles.filter(t => t.answered).length;
  const finished = totalTiles > 0 && answeredCount === totalTiles;

  const openTile = useMemo(
    () => allTiles.find(t => t.clue.clueId === openId) ?? null,
    [allTiles, openId],
  );

  /* Round 644: a cleared board banks at no less than $0, and the banked
     number is the one recorded, shown on the final card and shared. The
     running score can still dip below zero while you play, that is the risk
     in the big tiles, but the finish used to show and share a negative while
     the record said 0. */
  const banked = Math.max(0, score);
  useGameCompletion('jeopardy', finished, banked, allTiles.filter(t => t.correct).length);

  const select = useCallback((category: string, value: ClueValue) => {
    const t = board[category]?.[value];
    if (!t || t.answered) return;
    setOpenId(t.clue.clueId);
    setGuess('');
  }, [board]);

  const submit = useCallback(() => {
    if (!openTile) return;
    const ok = isCorrect(guess, openTile.clue.answer);
    const nextResults = { ...results, [openTile.clue.clueId]: ok };
    // Quiz board scoring: wrong answers subtract, which is what makes picking
    // the 1000s a real decision rather than a free roll.
    const nextScore = score + (ok ? openTile.clue.value : -openTile.clue.value);
    setResults(nextResults);
    setScore(nextScore);
    save(today, nextResults, nextScore);
    setOpenId(null);
    setGuess('');
  }, [openTile, guess, results, score, today]);

  const closeTile = useCallback(() => { setOpenId(null); setGuess(''); }, []);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const grid = categories.map(cat =>
      VALUES.map(v => {
        const t = board[cat]?.[v];
        if (!t) return '⬜';
        return t.correct ? '🟩' : '🟥';
      }).join(''),
    ).join('\n');
    return `Sports Quiz Board, ${today}\n${grid}\n$${banked}\ndouknowball.com/quiz-board`;
  }, [finished, categories, board, banked, today]);

  return {
    loading, categories, board, openTile, score, banked, answeredCount, totalTiles,
    finished, guess, setGuess, select, submit, closeTile, shareText,
  };
}
