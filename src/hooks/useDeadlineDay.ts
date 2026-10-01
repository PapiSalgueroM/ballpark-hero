import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { getTodayET } from '@/lib/dateUtils';
import { hotSeatPool } from '@/lib/managerHotSeat';
import {
  dailyDeadlineDay,
  endDay,
  offerPersonalTerms,
  openRefusal,
  openTalks,
  placeBid,
  replayDeadlineDay,
  sellPlayer,
  startDeadlineDay,
  walkFrom,
  type DeadlineAction,
  type DeadlineRun,
  type DeadlineSetup,
  type GradeLetter,
} from '@/lib/deadlineDay';

/**
 * Round 721: the screen side of Deadline Day. The window itself is
 * src/lib/deadlineDay.ts on the Club Manager engine; this hook holds which
 * window is open, saves its actions after every move (the daily under the
 * shared daily record, free play under its own key) and rebuilds it from the
 * seed and those actions after a refresh.
 */

export const DEADLINE_SLUG = 'deadline-day';
const FREE_KEY = 'deadline-day-free';

export type DeadlinePhase = 'menu' | 'pick' | 'loading' | 'play' | 'done';

export interface DeadlineDailySummary {
  club: string;
  letter: GradeLetter;
  score: number;
  filled: number;
  needs: number;
}

const LETTERS: GradeLetter[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

function isNum(v: unknown, lo: number, hi: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
}

function isAction(a: unknown): a is DeadlineAction {
  if (!a || typeof a !== 'object') return false;
  const x = a as Record<string, unknown>;
  const idx = Number.isInteger(x.i) && (x.i as number) >= 0 && (x.i as number) < 40;
  switch (x.t) {
    case 'open':
    case 'walk':
    case 'sell':
      return idx;
    case 'bid':
      return idx && isNum(x.amt, 0.1, 100000);
    case 'terms':
      return idx && isNum(x.wage, 1, 100000) && isNum(x.years, 1, 10) && isNum(x.bonus, 0, 100000);
    case 'end':
      return true;
    default:
      return false;
  }
}

function readActions(v: unknown): DeadlineAction[] | null {
  return Array.isArray(v) && v.length <= 80 && v.every(isAction) ? (v as DeadlineAction[]) : null;
}

function summaryOf(run: DeadlineRun): DeadlineDailySummary | null {
  const g = run.grade;
  return g ? { club: run.setup.club, letter: g.letter, score: g.score, filled: g.filled, needs: g.needs } : null;
}

export function useDeadlineDay() {
  const today = useRef(getTodayET()).current;
  const daily = useMemo(() => dailyDeadlineDay(today), [today]);
  const [phase, setPhase] = useState<DeadlinePhase>('menu');
  const [run, setRun] = useState<DeadlineRun | null>(null);
  const [dailyDone, setDailyDone] = useState<DeadlineDailySummary | null>(null);
  const [dailySaved, setDailySaved] = useState<DeadlineAction[] | null>(null);
  const [freeSaved, setFreeSaved] = useState<{ setup: DeadlineSetup; actions: DeadlineAction[] } | null>(null);
  /* Why the last press did nothing, in the engine's or the frame's words. */
  const [notice, setNotice] = useState<string | null>(null);

  /* A play with no score for now, like Manager Hot Seat and Contract Chaos:
     the points economy is being rebuilt, so this records that you played and
     puts nothing on the leaderboard. */
  useGameCompletion(DEADLINE_SLUG, !!run?.grade, undefined);

  /* What is waiting in storage, read after mount so nothing from the clock or
     the store lands in the first render. */
  useEffect(() => {
    const rec = readDailyRecord(DEADLINE_SLUG, today, f => {
      const actions = readActions(f.actions);
      if (!actions || f.club !== daily.club) return null;
      const done = f.done === true && typeof f.letter === 'string' && LETTERS.includes(f.letter as GradeLetter)
        ? { club: daily.club, letter: f.letter as GradeLetter, score: Number(f.score) || 0, filled: Number(f.filled) || 0, needs: Number(f.needs) || 0 }
        : null;
      return { actions, done };
    });
    if (rec?.done) setDailyDone(rec.done);
    else if (rec && rec.actions.length) setDailySaved(rec.actions);
    try {
      const raw = localStorage.getItem(FREE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, unknown>;
        const actions = readActions(p.actions);
        const club = typeof p.club === 'string' ? p.club : '';
        const seed = Number(p.seed);
        if (p.v === 1 && actions && p.done !== true && hotSeatPool().some(c => c.club === club) && Number.isFinite(seed)) {
          setFreeSaved({ setup: { club, seed: seed >>> 0 }, actions });
        }
      }
    } catch {
      /* a blocked or mangled store just means no free play to continue */
    }
  }, [today, daily.club]);

  /* The in memory copies (dailySaved, freeSaved) move with the store. They
     were only read on mount, so Menu then reopening the daily started the
     window from nothing and the next move overwrote the stored actions. */
  const persist = useCallback((r: DeadlineRun) => {
    if (r.setup.daily) {
      const s = summaryOf(r);
      writeDailyRecord(DEADLINE_SLUG, r.setup.daily, {
        club: r.setup.club,
        actions: r.actions,
        done: !!s,
        ...(s ? { letter: s.letter, score: s.score, filled: s.filled, needs: s.needs } : {}),
      });
      if (s) setDailyDone(s);
      setDailySaved(s || !r.actions.length ? null : r.actions);
    } else {
      try {
        localStorage.setItem(FREE_KEY, JSON.stringify({ v: 1, club: r.setup.club, seed: r.setup.seed, actions: r.actions, done: !!r.grade }));
      } catch {
        /* storage full or blocked: the window still plays, it just will not survive a refresh */
      }
      setFreeSaved(r.grade ? null : { setup: r.setup, actions: r.actions });
    }
  }, []);

  /* Opening the day starts a Club Manager career and reads its market, so the
     loading card paints first. */
  const open = useCallback((setup: DeadlineSetup, actions: DeadlineAction[] = []) => {
    setPhase('loading');
    setNotice(null);
    window.setTimeout(() => {
      const r = actions.length ? replayDeadlineDay(setup, actions) : startDeadlineDay(setup);
      if (r.grade) markRestoredFinish(DEADLINE_SLUG);
      setRun(r);
      setPhase(r.grade ? 'done' : 'play');
    }, 30);
  }, []);

  const startDaily = useCallback(() => {
    open({ club: daily.club, seed: daily.seed, daily: daily.daily }, dailySaved ?? []);
  }, [open, daily, dailySaved]);

  const startFree = useCallback((club: string) => {
    const seed = Math.floor(Math.random() * 4294967296) >>> 0;
    setFreeSaved(null);
    open({ club, seed });
  }, [open]);

  const randomFree = useCallback(() => {
    const pool = hotSeatPool();
    startFree(pool[Math.floor(Math.random() * pool.length)].club);
  }, [startFree]);

  const resumeFree = useCallback(() => {
    if (freeSaved) open(freeSaved.setup, freeSaved.actions);
  }, [open, freeSaved]);

  /* One move. A move the frame or the engine refuses returns the same run,
     and the screen says why instead of a button that does nothing. */
  const apply = useCallback((next: DeadlineRun, why: string) => {
    if (!run) return;
    if (next === run) {
      setNotice(why);
      return;
    }
    setNotice(null);
    setRun(next);
    persist(next);
    if (next.grade) setPhase('done');
  }, [run, persist]);

  const callClub = useCallback((i: number) => {
    if (!run) return;
    apply(openTalks(run, i), openRefusal(run, i) ?? 'They are not taking calls about him today.');
  }, [run, apply]);

  const bid = useCallback((i: number, amount: number) => {
    if (!run) return;
    apply(placeBid(run, i, amount), amount > run.state.budget ? 'That is more than the budget you have left.' : 'That bid could not be made.');
  }, [run, apply]);

  const terms = useCallback((i: number, offer: { wage: number; years: number; bonus: number }) => {
    if (!run) return;
    const fee = run.targets[i]?.neg?.agreedFee ?? 0;
    const why = fee + offer.bonus > run.state.budget
      ? 'The fee and that bonus come to more than the budget. Cut the bonus or sell someone first.'
      : run.state.squad.length >= 30
        ? 'The squad is full at 30. Sell someone before he can sign.'
        : 'His agent would not look at that.';
    apply(offerPersonalTerms(run, i, offer), why);
  }, [run, apply]);

  const walk = useCallback((i: number) => {
    if (!run) return;
    apply(walkFrom(run, i), 'There is nothing to walk away from.');
  }, [run, apply]);

  const sell = useCallback((k: number) => {
    if (!run) return;
    apply(sellPlayer(run, k), 'That sale cannot go through now.');
  }, [run, apply]);

  const finish = useCallback(() => {
    if (!run) return;
    apply(endDay(run), 'The window is already shut.');
  }, [run, apply]);

  const backToMenu = useCallback(() => {
    setRun(null);
    setNotice(null);
    setPhase('menu');
  }, []);

  return {
    today,
    daily,
    phase,
    setPhase,
    run,
    dailyDone,
    dailySaved,
    freeSaved,
    notice,
    clearNotice: () => setNotice(null),
    startDaily,
    startFree,
    randomFree,
    resumeFree,
    callClub,
    bid,
    terms,
    walk,
    sell,
    finish,
    backToMenu,
  };
}
