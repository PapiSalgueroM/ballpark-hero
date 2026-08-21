import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dailyDraw, shuffledRange } from '@/lib/dateUtils';
import { fetchQuizBoardClues, type Clue, type ClueValue } from '@/lib/fetchQuizBoard';

export interface Question {
  clue: Clue;
  options: string[];
  chosen: string | null;
}

export interface BallIqState {
  loading: boolean;
  questions: Question[];
  index: number;
  current: Question | null;
  status: 'answering' | 'revealed' | 'finished';
  correctCount: number;
  iq: number;
  rank: string;
  answer: (option: string) => void;
  next: () => void;
  shareText: string;
}

const QUESTIONS = 12;
const STORAGE_PREFIX = 'ball-iq-';

/**
 * Difficulty ramp: start on recent/easy clues, finish on the deep cuts.
 * Reads as an escalating test rather than a random pile.
 */
const RAMP: ClueValue[] = [200, 200, 200, 400, 400, 400, 600, 600, 800, 800, 1000, 1000];

/**
 * Distractors come from the SAME category and value tier, so a question about
 * 1970s Ballon d'Or winners offers other 1970s winners, not a Super Bowl team.
 * Wrong options have to be plausible or the test measures nothing.
 *
 * Round 224: draws are dailyDraw/shuffledRange off a per-question label now.
 * The old in-file multiply overflowed float precision, and a fixed question
 * slot could circle as few as 9 clues of a 72 clue tier across a whole
 * year; measured, then replaced.
 */
export function buildQuestion(correct: Clue, pool: Clue[], label: string): Question {
  const sameCat = pool.filter(
    c => c.category === correct.category && c.answer !== correct.answer,
  );
  const nearValue = sameCat.filter(c => Math.abs(c.value - correct.value) <= 200);
  const source = nearValue.length >= 3 ? nearValue : sameCat;

  const distractors: string[] = [];
  const seen = new Set<string>([correct.answer]);
  /* walk the source in a shuffled order so the three distractors are a
     uniform sample of the tier, not the survivors of a biased stream */
  for (const si of shuffledRange(source.length, `${label}:distractors`)) {
    if (distractors.length >= 3) break;
    const pick = source[si];
    if (!pick || seen.has(pick.answer)) continue;
    seen.add(pick.answer);
    distractors.push(pick.answer);
  }

  const options = [correct.answer, ...distractors];
  const order = shuffledRange(options.length, `${label}:order`);
  return { clue: correct, options: order.map(i => options[i]), chosen: null };
}

/**
 * Ball Knowledge IQ. Centred on 100, weighted so the hard questions carry more:
 * a $1000 clue is worth more IQ than a $200 one. Range clamps to 55-160.
 */
function computeIq(questions: Question[]): number {
  const total = questions.reduce((s, q) => s + q.clue.value, 0);
  const earned = questions.reduce(
    (s, q) => s + (q.chosen === q.clue.answer ? q.clue.value : 0),
    0,
  );
  if (total === 0) return 100;
  const pct = earned / total;
  return Math.round(Math.max(55, Math.min(160, 55 + pct * 105)));
}

function rankFor(iq: number): string {
  if (iq >= 145) return 'Certified ball knower';
  if (iq >= 125) return 'Knows ball';
  if (iq >= 105) return 'Solid ball knowledge';
  if (iq >= 85) return 'Casual';
  if (iq >= 70) return 'Knows of ball';
  return 'Does not know ball';
}

function loadSaved(today: string) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw) as { chosen: (string | null)[]; index: number };
  } catch { /* ignore */ }
  return null;
}

function save(today: string, chosen: (string | null)[], index: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify({ chosen, index }));
  } catch { /* storage unavailable */ }
}

export function useBallIq(): BallIqState {
  const today = useMemo(() => getTodayET(), []);
  const [pool, setPool] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState<(string | null)[]>(
    () => loadSaved(today)?.chosen ?? Array(QUESTIONS).fill(null),
  );
  const [index, setIndex] = useState(() => loadSaved(today)?.index ?? 0);

  useEffect(() => {
    let cancelled = false;
    fetchQuizBoardClues().then(c => {
      if (cancelled) return;
      setPool(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const questions = useMemo(() => {
    if (pool.length === 0) return [];
    const out: Question[] = [];
    const usedIds = new Set<string>();

    RAMP.forEach((value, qi) => {
      const tier = pool.filter(c => c.value === value && !usedIds.has(c.clueId));
      const source = tier.length > 0 ? tier : pool.filter(c => !usedIds.has(c.clueId));
      if (source.length === 0) return;
      const label = `ball-iq:${today}:q${qi}`;
      const correct = source[dailyDraw(source.length, label)];
      usedIds.add(correct.clueId);
      const q = buildQuestion(correct, pool, label);
      // Only keep questions we could give real alternatives to.
      if (q.options.length >= 2) out.push(q);
    });

    return out.map((q, i) => ({ ...q, chosen: chosen[i] ?? null }));
  }, [pool, today, chosen]);

  const finished = questions.length > 0 && index >= questions.length;
  const current = finished ? null : (questions[index] ?? null);
  const status: 'answering' | 'revealed' | 'finished' =
    finished ? 'finished' : (current?.chosen ? 'revealed' : 'answering');

  const correctCount = questions.filter(q => q.chosen === q.clue.answer).length;
  const iq = useMemo(() => computeIq(questions), [questions]);
  const rank = rankFor(iq);

  useGameCompletion('ball-iq', finished, iq * 10, correctCount);

  const answer = useCallback((option: string) => {
    if (!current || current.chosen) return;
    const next = [...chosen];
    next[index] = option;
    setChosen(next);
    save(today, next, index);
  }, [current, chosen, index, today]);

  const next = useCallback(() => {
    const n = index + 1;
    setIndex(n);
    save(today, chosen, n);
  }, [index, chosen, today]);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const squares = questions.map(q => (q.chosen === q.clue.answer ? '🟩' : '🟥')).join('');
    return `Ball Knowledge IQ, ${today}\n${squares}\nIQ ${iq} · ${rank}\ndouknowball.com/ball-iq`;
  }, [finished, questions, iq, rank, today]);

  return {
    loading, questions, index, current, status,
    correctCount, iq, rank, answer, next, shareText,
  };
}
