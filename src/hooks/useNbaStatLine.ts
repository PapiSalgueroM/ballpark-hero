import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import {
  BuiltTarget, CombinedLine, PICK_COUNT, ScoreResult, StatLineSeason,
  buildDailyTarget, buildRandomTarget, combineLine, eligiblePoolFor,
  fetchNbaStatLinePool, scoreCombined, suggestSeasons,
} from '@/lib/nbaStatLine';

/**
 * NBA Stat Line phase machine. boot fetches the season pool (error state
 * with a reload on a bad or implausibly small pull), setup offers the two
 * modes, playing holds the five slots and the search, done holds the score.
 *
 * Daily is one scored run per ET date: the finished run is saved under
 * nba-stat-line-daily-<date> and reopening the daily that day restores the
 * result instead of dealing a second scored attempt. A restored run sets
 * alreadyPlayed so the page does not record a second completion.
 */

export type Phase = 'boot' | 'error' | 'setup' | 'playing' | 'done';
export type Mode = 'daily' | 'unlimited';

const DAILY_KEY_PREFIX = 'nba-stat-line-daily-';

interface DailySave {
  picks: string[];  // season keys, in slot order
}

function loadDailySave(raw: string | null): DailySave | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DailySave;
    if (!Array.isArray(parsed.picks) || parsed.picks.some(k => typeof k !== 'string')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useNbaStatLine() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<StatLineSeason[]>([]);
  const [mode, setMode] = useState<Mode>('daily');
  const [built, setBuilt] = useState<BuiltTarget | null>(null);
  const [picks, setPicks] = useState<StatLineSeason[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNbaStatLinePool()
      .then(p => {
        if (cancelled) return;
        if (!p) { setPhase('error'); return; }
        setPool(p);
        setPhase('setup');
      })
      .catch(() => { if (!cancelled) setPhase('error'); });
    return () => { cancelled = true; };
  }, []);

  const target = built?.target ?? null;

  const eligible = useMemo(
    () => (target ? eligiblePoolFor(pool, target) : []),
    [pool, target],
  );

  const start = useCallback((m: Mode) => {
    const today = getTodayET();
    const b = m === 'daily' ? buildDailyTarget(pool, today) : buildRandomTarget(pool);
    if (!b) { setPhase('error'); return; }
    setMode(m);
    setBuilt(b);
    setQuery('');
    setResult(null);

    if (m === 'daily') {
      let saved: DailySave | null = null;
      try {
        saved = loadDailySave(localStorage.getItem(`${DAILY_KEY_PREFIX}${today}`));
      } catch { /* storage unavailable, play fresh */ }
      if (saved) {
        const byKey = new Map(pool.map(s => [s.key, s]));
        const restored = saved.picks.map(k => byKey.get(k)).filter((s): s is StatLineSeason => !!s);
        if (restored.length === PICK_COUNT) {
          setPicks(restored);
          setResult(scoreCombined(b.target, combineLine(restored, b.target.split)));
          setAlreadyPlayed(true);
          setPhase('done');
          return;
        }
      }
    }
    setPicks([]);
    setAlreadyPlayed(false);
    setPhase('playing');
  }, [pool]);

  const pickedKeys = useMemo(() => new Set(picks.map(p => p.key)), [picks]);

  const suggestions = useMemo(
    () => (phase === 'playing' && picks.length < PICK_COUNT ? suggestSeasons(eligible, query, pickedKeys) : []),
    [phase, eligible, query, pickedKeys, picks.length],
  );

  const addPick = useCallback((season: StatLineSeason) => {
    setPicks(prev => {
      if (prev.length >= PICK_COUNT || prev.some(p => p.key === season.key)) return prev;
      return [...prev, season];
    });
    setQuery('');
  }, []);

  const removePick = useCallback((key: string) => {
    setPicks(prev => prev.filter(p => p.key !== key));
  }, []);

  /** The live combined line of the picks so far. The score stays hidden
   *  until submit, reading the gap is the skill. */
  const combined: CombinedLine | null = useMemo(
    () => (target && picks.length > 0 ? combineLine(picks, target.split) : null),
    [picks, target],
  );

  const canSubmit = phase === 'playing' && picks.length === PICK_COUNT;

  const submit = useCallback(() => {
    if (!target || picks.length !== PICK_COUNT) return;
    const scored = scoreCombined(target, combineLine(picks, target.split));
    setResult(scored);
    setPhase('done');
    if (mode === 'daily') {
      try {
        localStorage.setItem(
          `${DAILY_KEY_PREFIX}${getTodayET()}`,
          JSON.stringify({ picks: picks.map(p => p.key) } satisfies DailySave),
        );
      } catch { /* best effort */ }
    }
  }, [target, picks, mode]);

  const backToSetup = useCallback(() => {
    setPhase('setup');
    setBuilt(null);
    setPicks([]);
    setResult(null);
    setQuery('');
    setAlreadyPlayed(false);
  }, []);

  return {
    phase, mode, target, picks, query, setQuery, suggestions, addPick,
    removePick, combined, canSubmit, submit, start, backToSetup, result,
    alreadyPlayed, poolSize: pool.length, eligibleSize: eligible.length,
  };
}
