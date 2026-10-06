import { useCallback, useRef, useState } from 'react';
import {
  advanceMmaMonth, closeMmaPromotion, isMmaPlan, loadMmaPromotion, MMA_REST_COST, newMmaPromotion,
  runMmaEvent, signMmaFighter, validateMmaPlan,
  type MmaBooking, type MmaPlan, type MmaPromotion,
} from '@/lib/mmaPromotion';

export const MMA_STORAGE_KEY = 'dukb-mma-promoter-v1';
export type MmaView = 'dashboard' | 'result' | 'closed';
interface MmaSession {
  state: MmaPromotion | null; plan: MmaPlan; view: MmaView; resultIndex: number | null; notice: string | null;
}
const emptyPlan = (): MmaPlan => ({ venueId: 'club', ticketPrice: 25, bookings: [] });
const emptySession = (): MmaSession => ({ state: null, plan: emptyPlan(), view: 'dashboard', resultIndex: null, notice: null });
const BLOCKED = 'Saving is blocked in this browser. You can keep playing here, but a refresh may lose your progress.';
const MALFORMED = 'Your MMA save could not be read. Start a new promotion to replace it.';

function readSession(): MmaSession {
  let raw: string | null;
  try { raw = localStorage.getItem(MMA_STORAGE_KEY); }
  catch { return { ...emptySession(), notice: BLOCKED }; }
  if (!raw) return emptySession();
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('save');
    const s = saved as Record<string, unknown>;
    const state = loadMmaPromotion(s.state);
    if (s.version !== 1 || !state || !isMmaPlan(s.plan)
      || !s.plan.bookings.every(b => state.fighters.some(f => f.id === b.aId) && state.fighters.some(f => f.id === b.bId))
      || !['dashboard', 'result', 'closed'].includes(s.view as string)
      || (s.resultIndex !== null && (!Number.isInteger(s.resultIndex) || (s.resultIndex as number) < 0 || (s.resultIndex as number) >= state.history.length))
      || (s.view === 'result' && s.resultIndex === null) || (s.view === 'closed' && !state.closed)
      || (s.view === 'dashboard' && state.closed)) throw new Error('save');
    return { state, plan: { ...s.plan, bookings: s.plan.bookings.map(b => ({ ...b })) },
      view: s.view as MmaView, resultIndex: s.resultIndex as number | null, notice: null };
  } catch { return { ...emptySession(), notice: MALFORMED }; }
}

export function useMmaPromotion() {
  const [session, setSession] = useState<MmaSession>(readSession);
  const current = useRef(session);
  const blocked = useRef(session.notice === BLOCKED);

  const change = useCallback((next: MmaSession, persist = true) => {
    if (persist && next.state) {
      try {
        localStorage.setItem(MMA_STORAGE_KEY, JSON.stringify({ version: 1, state: next.state,
          plan: next.plan, view: next.view, resultIndex: next.resultIndex }));
        blocked.current = false;
      } catch { blocked.current = true; }
    }
    const visible = { ...next, notice: blocked.current ? BLOCKED : next.notice };
    current.current = visible;
    setSession(visible);
  }, []);
  const notify = useCallback((notice: string) => change({ ...current.current, notice }, false), [change]);

  const start = useCallback((name: string) => {
    if (current.current.state) return;
    change({ state: newMmaPromotion(name), plan: emptyPlan(), view: 'dashboard', resultIndex: null, notice: null });
  }, [change]);

  const sign = useCallback((id: string) => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard') return;
    const next = signMmaFighter(s.state, id);
    if (!next) { notify('Signing needs enough cash and a fighter with one fight or fewer left on the contract.'); return; }
    change({ ...s, state: next, notice: null });
  }, [change, notify]);

  const setPlan = useCallback((plan: MmaPlan) => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard') return;
    if (!isMmaPlan(plan) || !plan.bookings.every(b => s.state!.fighters.some(f => f.id === b.aId) && s.state!.fighters.some(f => f.id === b.bId))) {
      notify('Choose a valid venue, ticket price and card.'); return;
    }
    change({ ...s, plan: { ...plan, bookings: plan.bookings.map(b => ({ ...b })) }, notice: null });
  }, [change, notify]);

  const book = useCallback((booking: MmaBooking) => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard') return;
    const plan = { ...s.plan, bookings: [...s.plan.bookings, { ...booking }] };
    const reason = validateMmaPlan(s.state, plan);
    if (reason) { notify(reason); return; }
    change({ ...s, plan, notice: null });
  }, [change, notify]);

  const removeBout = useCallback((index: number) => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard' || !Number.isInteger(index) || index < 0 || index >= s.plan.bookings.length) return;
    change({ ...s, plan: { ...s.plan, bookings: s.plan.bookings.filter((_, i) => i !== index) }, notice: null });
  }, [change]);

  const runEvent = useCallback(() => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard') return;
    const reason = validateMmaPlan(s.state, s.plan);
    if (reason) { notify(reason); return; }
    const next = runMmaEvent(s.state, s.plan);
    if (!next) return;
    change({ state: next.state, plan: { ...s.plan, bookings: [] }, view: 'result',
      resultIndex: next.state.history.length - 1, notice: null });
  }, [change, notify]);

  const rest = useCallback(() => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard') return;
    const next = advanceMmaMonth(s.state);
    if (next === s.state) { notify(`A month off costs $${MMA_REST_COST.toLocaleString('en-US')}.`); return; }
    change({ ...s, state: next, notice: null });
  }, [change, notify]);

  const endPromotion = useCallback(() => {
    const s = current.current;
    if (!s.state || s.view !== 'dashboard') return;
    const next = closeMmaPromotion(s.state);
    if (!next) { notify('Run your first event before ending the promotion.'); return; }
    change({ ...s, state: next, plan: emptyPlan(), view: 'closed', resultIndex: null, notice: null });
  }, [change, notify]);

  const back = useCallback(() => {
    const s = current.current;
    if (!s.state) return;
    change({ ...s, view: s.state.closed ? 'closed' : 'dashboard', resultIndex: null, notice: null });
  }, [change]);

  const openResult = useCallback((index: number) => {
    const s = current.current;
    if (!s.state || !Number.isInteger(index) || index < 0 || index >= s.state.history.length) return;
    change({ ...s, view: 'result', resultIndex: index, notice: null });
  }, [change]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(MMA_STORAGE_KEY); blocked.current = false; }
    catch { blocked.current = true; }
    change(emptySession(), false);
  }, [change]);

  return { state: session.state, plan: session.plan, view: session.view, notice: session.notice,
    result: session.resultIndex === null ? null : session.state?.history[session.resultIndex] ?? null,
    start, sign, book, removeBout, setPlan, runEvent, rest, endPromotion, back, openResult, reset };
}
