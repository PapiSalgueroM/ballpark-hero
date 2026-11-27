import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bookCornerRoutine, cancelCornerRoutine, cornerTrainingDesk, playNextEntry, resumeMatch, SAVE_KEY, startCareer, startNextSeason,
  type CareerState, type CornerRoutine,
} from '@/lib/clubManager';
import { useClubManager, type ClubManagerGame } from '@/hooks/useClubManager';
import { createSaveFence } from '@/lib/saveFence';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
function seeded<T>(n: number, play: () => T) {
  const old = Math.random, draws: number[] = [];
  Math.random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; const r = n / 4294967296; draws.push(r); return r; };
  try { return { result: play(), draws }; } finally { Math.random = old; }
}
function fixture() {
  const career = seeded(123, () => startCareer('Brentford')).result;
  const desk = cornerTrainingDesk(career, 'left');
  const order: CornerRoutine = { flag: 'left', kind: 'far-post', takerId: desk.taker!.id, targetId: desk.targets[0].id };
  return { career, order };
}
function windowWeek(c: CareerState) {
  const week = structuredClone(c);
  week.calendar.splice(week.week, 0, { type: 'window', round: 0 });
  return seeded(8642, () => playNextEntry(week));
}
const fitness = (state: CareerState) => new Map(state.squad.map(p => [p.id, p.fitness]));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('competitive corner training', () => {
  it('reads, books or cancels a single routine without spending fitness or changing a standing assignment', () => {
    const { career, order } = fixture(), before = JSON.stringify(career), desk = cornerTrainingDesk(career, 'left');
    expect(desk.status).toBe('open'); expect(desk.targets.every(p => p.position !== 'GK' && p.id !== order.takerId)).toBe(true);
    expect(desk.fitnessCost).toBe(3);
    const booked = bookCornerRoutine(career, order)!;
    expect(booked.cornerTraining).toMatchObject({ order, bookedWeek: career.week });
    expect(cornerTrainingDesk(booked, 'left').status).toBe('pending');
    expect(booked.squad).toEqual(career.squad); expect(bookCornerRoutine(booked, order)).toBeNull();
    expect(cancelCornerRoutine(booked)).toEqual(career);
    expect(bookCornerRoutine(career, { ...order, targetId: order.takerId })).toBeNull();
    expect(bookCornerRoutine(career, { ...order, takerId: desk.targets[1].id })).toBeNull();
    expect(bookCornerRoutine(career, { ...order, targetId: career.squad.find(p => p.position === 'GK')!.id })).toBeNull();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('pays two actual recovery costs on one wage week, saves the receipt, and consumes the routine once on kickoff', () => {
    const { career, order } = fixture(), booked = bookCornerRoutine(career, order)!;
    const plain = windowWeek(career), trained = windowWeek(booked);
    expect(trained.draws).toEqual(plain.draws);
    const ready = trained.result.state, before = fitness(plain.result.state), after = fitness(ready);
    for (const [id, f] of before) expect(after.get(id)).toBe(f - ([order.takerId, order.targetId].includes(id) ? 3 : 0));
    const desk = cornerTrainingDesk(ready, 'left');
    expect(desk).toMatchObject({ status: 'ready', paid: { taker: 3, target: 3 }, order });
    const secondWeek = windowWeek(ready).result.state;
    const cancelled = cancelCornerRoutine(ready)!;
    const sameWeek = windowWeek(cancelled).result.state;
    expect(fitness(secondWeek)).toEqual(fitness(sameWeek));
    expect(secondWeek.cornerTraining).toEqual(ready.cornerTraining);
    expect(fitness(cancelled)).toEqual(after);
    const started = seeded(48, () => playNextEntry(JSON.parse(JSON.stringify(ready)))).result;
    expect(started.live!.cornerRoutine).toEqual(order); expect(started.state.cornerTraining).toBeUndefined();
    const reloaded = seeded(221, () => playNextEntry(JSON.parse(JSON.stringify(started.state)))).result;
    expect(reloaded.live).toEqual(started.live);
    const done = seeded(365, () => resumeMatch(reloaded.state)).result.state;
    expect(done.cornerTraining).toBeUndefined(); expect(done.live).toBeFalsy();
    expect(seeded(548, () => playNextEntry(done)).result.live?.cornerRoutine).toBeUndefined();
  });

  it('waits through an unpaid night and lapses on lost assignment, injury, suspension, departure, or new club', () => {
    const { career, order } = fixture(), booked = bookCornerRoutine(career, order)!;
    const night = structuredClone(booked);
    night.calendar.splice(0, 0, { type:'uel', round: 0, night: { k:'uel', n:0 } });
    const passed = seeded(31, () => playNextEntry(night, { untilWeek:1 })).result;
    expect(passed.kind).toBe('reached'); expect(passed.state.week).toBe(1);
    expect(passed.state.cornerTraining).toEqual(booked.cornerTraining);
    expect(fitness(passed.state)).toEqual(fitness(night));
    for (const change of [
      (s: CareerState) => { s.setPieces!.cornersLeft = order.targetId; },
      (s: CareerState) => { s.squad.find(p => p.id === order.targetId)!.injuryWeeks = 1; },
      (s: CareerState) => { s.squad.find(p => p.id === order.takerId)!.suspendedMatches = 2; },
      (s: CareerState) => { s.squad = s.squad.filter(p => p.id !== order.targetId); },
      (s: CareerState) => { s.cornerTraining!.club = 'Previous club'; },
    ]) {
      const changed = structuredClone(booked); change(changed);
      const control = { ...changed }; delete control.cornerTraining;
      const result = windowWeek(changed), normal = windowWeek(control);
      expect(result.result.state.cornerTraining).toBeUndefined(); expect(result.draws).toEqual(normal.draws);
      expect(fitness(result.result.state)).toEqual(fitness(normal.result.state));
    }
    const ready = windowWeek(booked).result.state;
    ready.squad = ready.squad.filter(p => p.id !== order.takerId);
    const fixtureAfterSale = seeded(12, () => playNextEntry(ready)).result;
    expect(fixtureAfterSale.live?.cornerRoutine).toBeUndefined(); expect(fixtureAfterSale.state.cornerTraining).toBeUndefined();
    const next = seeded(923, () => startNextSeason(booked)).result;
    expect(next.season).toBe(booked.season + 1); expect(next.cornerTraining).toBeUndefined();
  });

  it('leaves unsupported metadata untouched and old saves bare', () => {
    const { career, order } = fixture();
    const future = { ...career, cornerTraining: { v: 9, explanation:'future' } as never };
    expect(cornerTrainingDesk(future, 'left').status).toBe('unsupported');
    expect(bookCornerRoutine(future, order)).toBeNull();expect(cancelCornerRoutine(future)).toBeNull();
    expect(windowWeek(future).result.state.cornerTraining).toEqual(future.cornerTraining);
    const untouched = windowWeek(career).result.state;
    expect(untouched).not.toHaveProperty('cornerTraining');
    expect(seeded(23, () => playNextEntry(untouched)).result.live).not.toHaveProperty('cornerRoutine');
  });
});

let api: ClubManagerGame;
function Harness() { api = useClubManager(); return <span>{api.phase}</span>; }
it('refuses repeated, stale-tab and failed-storage bookings on the ordinary hook', async () => {
  const { career, order } = fixture();
  localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  render(<Harness/>);
  await waitFor(() => expect(api.phase).toBe('resume'));
  act(() => api.resume()); await waitFor(() => expect(api.phase).toBe('hub'));
  const expected = api.career!, set = api.bookCornerTraining;
  act(() => { expect(set(order, expected)).toBe(true); expect(set(order, expected)).toBe(false); });
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(saved.cornerTraining.order).toEqual(order);
  const pending = api.career!;
  act(() => expect(api.cancelCornerTraining(expected)).toBe(false));
  act(() => expect(api.cancelCornerTraining(pending)).toBe(true));
  const clean = api.career!;
  const store = Storage.prototype.setItem;
  const refusing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(k, value) {
    if (k === SAVE_KEY) throw new Error('Simulated quota failure'); store.call(this, k, value);
  });
  try { act(() => expect(api.bookCornerTraining(order, clean)).toBe(false)); }
  finally { refusing.mockRestore(); }
  expect(api.career!.cornerTraining).toBeUndefined();
  const incoming = JSON.stringify({ ...clean, budget: clean.budget + 1 });
  const other = createSaveFence(() => localStorage);
  other.adopt(SAVE_KEY);
  expect(other.write(SAVE_KEY, () => { localStorage.setItem(SAVE_KEY, incoming); return true; })).toBe('written');
  act(() => expect(api.bookCornerTraining(order, clean)).toBe(false));
  expect(localStorage.getItem(SAVE_KEY)).toBe(incoming);
});
