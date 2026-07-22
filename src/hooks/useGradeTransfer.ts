import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { fetchTransferGrades, GRADES, type Grade, type TransferCase } from '@/lib/fetchTransferGrades';

export interface CrowdGrade {
  counts: Record<Grade, number>;
  total: number;
  mode: Grade | null;
}

export interface Round {
  tc: TransferCase;
  userGrade: Grade | null;
  crowd: CrowdGrade | null;
}

export interface GradeTransferState {
  loading: boolean;
  rounds: Round[];
  index: number;
  current: Round | null;
  status: 'grading' | 'revealed' | 'finished';
  score: number;
  exact: number;
  grade: (g: Grade) => void;
  next: () => void;
  shareText: string;
}

const ROUNDS = 5;
const STORAGE_PREFIX = 'grade-transfer-';

function pickDaily(pool: TransferCase[], today: string): TransferCase[] {
  if (pool.length === 0) return [];
  const seed = dateSeed(today);
  const picked: TransferCase[] = [];
  const used = new Set<number>();
  for (let i = 0; picked.length < ROUNDS && i < pool.length * 4; i++) {
    const idx = Math.abs((seed * (i + 3) * 1103515245 + 12345) >>> 0) % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
}

function loadSaved(today: string): { grades: (Grade | null)[]; index: number } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function save(today: string, grades: (Grade | null)[], index: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify({ grades, index }));
  } catch { /* storage unavailable */ }
}

/** Exact grade = 100, one grade off = 50, else 0. */
function scoreFor(user: Grade, actual: Grade): number {
  const d = Math.abs(GRADES.indexOf(user) - GRADES.indexOf(actual));
  return d === 0 ? 100 : d === 1 ? 50 : 0;
}

export function useGradeTransfer(): GradeTransferState {
  const today = useMemo(() => getTodayET(), []);
  const [pool, setPool] = useState<TransferCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<(Grade | null)[]>(() => loadSaved(today)?.grades ?? Array(ROUNDS).fill(null));
  const [index, setIndex] = useState(() => loadSaved(today)?.index ?? 0);
  const [crowds, setCrowds] = useState<(CrowdGrade | null)[]>(Array(ROUNDS).fill(null));

  useEffect(() => {
    let cancelled = false;
    fetchTransferGrades().then(p => {
      if (cancelled) return;
      setPool(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const cases = useMemo(() => pickDaily(pool, today), [pool, today]);

  const rounds: Round[] = useMemo(
    () => cases.map((tc, i) => ({ tc, userGrade: grades[i] ?? null, crowd: crowds[i] ?? null })),
    [cases, grades, crowds],
  );

  const finished = cases.length > 0 && index >= cases.length;
  const current = finished ? null : (rounds[index] ?? null);
  const status: 'grading' | 'revealed' | 'finished' =
    finished ? 'finished' : (current?.userGrade ? 'revealed' : 'grading');

  const score = useMemo(
    () => rounds.reduce((s, r) => s + (r.userGrade ? scoreFor(r.userGrade, r.tc.actualGrade) : 0), 0),
    [rounds],
  );
  const exact = useMemo(
    () => rounds.filter(r => r.userGrade && r.userGrade === r.tc.actualGrade).length,
    [rounds],
  );

  useGameCompletion('grade-transfer', finished, score, exact);

  const loadCrowd = useCallback(async (i: number, tc: TransferCase) => {
    try {
      const { data } = await supabase
        .from('transfer_grade_votes')
        .select('grade')
        .eq('player_name', tc.playerName)
        .eq('move_year', tc.moveYear);
      if (!data) return;
      const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<Grade, number>;
      for (const d of data) counts[d.grade as Grade] = (counts[d.grade as Grade] ?? 0) + 1;
      const total = data.length;
      let mode: Grade | null = null;
      let best = -1;
      for (const g of GRADES) if (counts[g] > best) { best = counts[g]; mode = g; }
      setCrowds(prev => {
        const next = [...prev];
        next[i] = { counts, total, mode: total > 0 ? mode : null };
        return next;
      });
    } catch { /* silent */ }
  }, []);

  const grade = useCallback((g: Grade) => {
    if (!current || current.userGrade) return;
    const i = index;
    const tc = current.tc;

    const next = [...grades];
    next[i] = g;
    setGrades(next);
    save(today, next, i);

    supabase
      .from('transfer_grade_votes')
      .insert({ player_name: tc.playerName, move_year: tc.moveYear, to_club: tc.toClub, grade: g })
      .then(() => loadCrowd(i, tc));
  }, [current, index, grades, today, loadCrowd]);

  const next = useCallback(() => {
    const n = index + 1;
    setIndex(n);
    save(today, grades, n);
  }, [index, grades, today]);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const squares = rounds.map(r => {
      if (!r.userGrade) return '⬜';
      const d = Math.abs(GRADES.indexOf(r.userGrade) - GRADES.indexOf(r.tc.actualGrade));
      return d === 0 ? '🟩' : d === 1 ? '🟨' : '🟥';
    }).join('');
    return `Grade the Transfer — ${today}\n${squares}\n${exact}/${ROUNDS} spot on · ${score} pts\ndouknowball.com/grade-transfer`;
  }, [finished, rounds, exact, score, today]);

  return { loading, rounds, index, current, status, score, exact, grade, next, shareText };
}
