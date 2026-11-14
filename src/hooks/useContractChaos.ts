/**
 * Round 720: Contract Chaos, the state. The rules live in
 * src/lib/contractChaos.ts; this holds the phase, the save and the daily lock.
 *
 * The daily locks the moment you sign, not when the last season is shown:
 * the career is already decided by then, and locking late would let a
 * reload replay the day with the answer in hand.
 */
import { useCallback, useState } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  SAVE_KEY, HORIZON, ROLE_WORD, buildDeal, dailySeed, freeSeed, pushOffer, roleCounterOffer, allOutcomes,
  type CcDeal, type CcOutcome,
} from '@/lib/contractChaos';

export type Mode = 'daily' | 'free';
export type Phase = 'menu' | 'deal' | 'offer' | 'career' | 'done';

export interface CcDailyRecord {
  date: string;
  score: number;
  club: string;
  verdict: string;
}

export interface CcSave {
  played: number;
  best: number;
  total: number;
  daily?: CcDailyRecord;
}

const EMPTY: CcSave = { played: 0, best: 0, total: 0 };

function loadSave(): CcSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return EMPTY;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return EMPTY;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    const d = s.daily;
    const daily = d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && typeof d.club === 'string' && typeof d.verdict === 'string'
      ? { date: d.date, score: num(d.score), club: d.club, verdict: d.verdict }
      : undefined;
    return { played: num(s.played), best: Math.min(100, num(s.best)), total: num(s.total), daily };
  } catch {
    return EMPTY;
  }
}

function writeSave(s: CcSave) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function useContractChaos() {
  const [save, setSave] = useState<CcSave>(loadSave);
  const [mode, setMode] = useState<Mode>('daily');
  const [phase, setPhase] = useState<Phase>('menu');
  const [{ deal, talk }, setNegotiation] = useState<{ deal: CcDeal | null; talk: Record<number, string> }>({ deal: null, talk: {} });
  const [dealDate, setDealDate] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const [signed, setSigned] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<CcOutcome[]>([]);
  const [revealed, setRevealed] = useState(0);
  const today = getTodayET();
  const dailyPlayed = save.daily?.date === today ? save.daily : null;

  const start = useCallback((m: Mode) => {
    const date = m === 'daily' ? getTodayET() : null;
    setMode(m);
    setDealDate(date);
    setNegotiation({ deal: buildDeal(date ? dailySeed(date) : freeSeed(Math.random())), talk: {} });
    setSigned(null);
    setOutcomes([]);
    setRevealed(0);
    setPhase('deal');
  }, []);

  const open = useCallback((i: number) => { setFocus(i); setPhase('offer'); }, []);
  const back = useCallback(() => setPhase('deal'), []);

  const push = useCallback((i: number) => {
    setNegotiation(current => {
      if (!current.deal || current.deal.offers[i]?.fa.pushed) return current;
      const pushed = pushOffer(current.deal, i);
      return { deal: pushed.deal, talk: { ...current.talk, [i]: pushed.line } };
    });
  }, []);

  const counterRole = useCallback((i: number) => {
    if (mode !== 'free' || phase !== 'offer' || focus !== i) return;
    setNegotiation(current => {
      const deal = current.deal;
      const offer = deal?.offers[i];
      if (!deal || !offer) return current;
      const counter = roleCounterOffer(offer);
      if (!counter) return current;
      return {
        deal: { ...deal, offers: deal.offers.map((o, index) => index === i ? counter : o) },
        talk: { ...current.talk, [i]: `${ROLE_WORD[counter.role]} promised at the lower wage.` },
      };
    });
  }, [focus, mode, phase]);

  const sign = useCallback((i: number) => {
    if (!deal || deal.offers[i]?.fa.gone) return;
    const stored = loadSave();
    const latest = stored.played >= save.played ? stored : save;
    const daily = stored.daily && (!save.daily || stored.daily.date >= save.daily.date)
      ? stored.daily
      : save.daily;
    // Another tab may have signed while these offers were open.
    if (dealDate && daily && daily.date >= dealDate) {
      setSave({ ...latest, daily });
      setPhase('menu');
      return;
    }
    const outs = allOutcomes(deal);
    const mine = outs[i];
    setSigned(i);
    setOutcomes(outs);
    setRevealed(1);
    setPhase('career');
    const next: CcSave = {
      ...latest,
      played: latest.played + 1,
      best: Math.max(latest.best, mine.score),
      total: latest.total + mine.score,
      daily: dealDate
        ? { date: dealDate, score: mine.score, club: deal.offers[i].fa.label, verdict: mine.verdict }
        : daily,
    };
    setSave(next);
    writeSave(next);
  }, [deal, dealDate, save]);

  const nextSeason = useCallback(() => {
    if (revealed >= HORIZON) setPhase('done');
    else setRevealed(revealed + 1);
  }, [revealed]);

  const finish = useCallback(() => { setRevealed(HORIZON); setPhase('done'); }, []);
  const toMenu = useCallback(() => setPhase('menu'), []);

  /* A play with no score while the points economy is rebuilt: undefined is
     the recorder's unscored row (Round 644), the same one Crowd Says writes. */
  useGameCompletion('contract-chaos', phase === 'career' || phase === 'done', undefined);

  return {
    save, mode, phase, deal, dealDate, focus, talk, signed, outcomes, revealed, today, dailyPlayed,
    start, open, back, push, counterRole, sign, nextSeason, finish, toMenu,
  };
}
