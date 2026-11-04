import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, CMPlayer, TrainingPlan } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type Plan = TrainingPlan & { recoveryWeek?: unknown };
const BASE: TrainingPlan = { intensity: 'double', focus: 'youth' };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const PLANS: TrainingPlan[] = ['light', 'normal', 'double'].flatMap(intensity =>
  ['firstTeam', 'balanced', 'youth'].map(focus => ({ intensity, focus } as TrainingPlan)));
let E: Engine, draws: number[], next: () => number;
function stream(initial: number) {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
beforeEach(async () => {
  draws = []; next = stream(4310001);
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = next(); draws.push(value); return value; });
  vi.spyOn(Date, 'now').mockReturnValue(1793800800000);
  Element.prototype.scrollIntoView = vi.fn();
  E = await import('@/lib/clubManager');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
function raw(name: string, observations: unknown) {
  if (!process.env.CM_RECOVERY_WEEK_RAW) return;
  mkdirSync(process.env.CM_RECOVERY_WEEK_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_RECOVERY_WEEK_RAW, name + '.json'), JSON.stringify({ case: name,
    fixture: 'Fictional real-constructor squad at its generated January window. A paid week uses the existing training policy, not an automatic XI rest or an injury cure.',
    observations }, null, 2) + '\n');
}
function fixture() {
  const c = E.startCareer('Recovery Borough', E.DEFAULT_ERA_ID, {
    name: 'Recovery Borough', stadium: 'Recovery Park', quality: 70, budgetTier: 'mid',
    leagueId: E.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RB' },
  });
  E.ensureAcademy(c);
  c.budget = 1000; c.wageCap = 100000;
  c.squad = c.squad.map(p => ({ ...p, fitness: 50, injuryWeeks: 3, contractYears: 5 }));
  c.training = { ...BASE };
  const at = c.calendar.findIndex(entry => entry.type === 'window');
  expect(at, 'SETUP real constructor has a paid January window').toBeGreaterThanOrEqual(0);
  c.week = at;
  c.press!.lastWeek = at;
  const id = c.squad[0].id;
  return { c, id };
}
function queued(c: CareerState, playerId: string): CareerState {
  return E.setTrainingPlan(c, { ...(c.training ?? BASE), recoveryWeek: {
    v: 1, club: c.clubName, season: c.season, playerId,
  } } as Plan);
}
function queueOf(c: CareerState): unknown { return (c.training as Plan | undefined)?.recoveryWeek; }
function cancelled(c: CareerState): CareerState {
  const plan: Plan = { ...(c.training ?? BASE) }; delete plan.recoveryWeek;
  return E.setTrainingPlan(c, plan);
}
function player(c: CareerState, id: string): CMPlayer {
  const p = c.squad.find(row => row.id === id);
  expect(p, 'SETUP current squad target exists').toBeTruthy(); return p!;
}
function history(p: CMPlayer) {
  return (p as CMPlayer & { trainingExposure?: { v: number; club: string; season: number; counts: number[] } }).trainingExposure;
}
function step(c: CareerState, seed: number) {
  draws = []; next = stream(seed);
  const before = JSON.stringify(c);
  const result = E.playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: c.week + 1 });
  const tape = [...draws], nextDraw = next();
  expect(result.state.week, 'SETUP native calendar advances exactly one entry').toBe(c.week + 1);
  expect(JSON.stringify(c), 'SETUP public simulation leaves its input unchanged').toBe(before);
  return { state: copy(result.state), kind: result.kind, draws: tape, nextDraw };
}
function withoutQueue(c: CareerState): CareerState {
  const n = copy(c); if (n.training) delete (n.training as Plan).recoveryWeek; return n;
}

describe('Club Manager one-player recovery week', () => {
  it('applies Light recovery and its growth record only to the selected player on a paid week', () => {
    const { c, id } = fixture(), input = queued(c, id), before = copy(input), run = step(input, 4310101);
    const target = player(run.state, id), peers = run.state.squad.filter(p => p.id !== id);
    raw('paid-player', { id, before, ...run });
    expect(target.fitness, 'CM_RECOVERY_PAID_PLAYER').toBe(98);
    expect(target.injuryWeeks, 'CM_RECOVERY_PAID_PLAYER').toBe(2);
    expect(history(target), 'CM_RECOVERY_PAID_PLAYER').toStrictEqual({ v: 1, club: c.clubName,
      season: c.season, counts: [0, 0, 1, 0, 0, 0, 0, 0, 0] });
    for (const p of peers) {
      expect(p.fitness, 'CM_RECOVERY_PAID_PLAYER').toBe(81);
      expect(history(p), 'CM_RECOVERY_PAID_PLAYER').toStrictEqual({ v: 1, club: c.clubName,
        season: c.season, counts: [0, 0, 0, 0, 0, 0, 0, 0, 1] });
    }
    expect(run.state.xiIds, 'CM_RECOVERY_PAID_PLAYER').toStrictEqual(before.xiIds);
    expect(run.state.training, 'CM_RECOVERY_PAID_PLAYER').toStrictEqual(BASE);
  });

  it('consumes one paid week then returns the same player to the standing plan', () => {
    const { c, id } = fixture(), first = step(queued(c, id), 4310102);
    let after = first.state, skipped = 0;
    while (after.calendar[after.week]?.night && skipped++ < 8) after = step(after, 4310202 + skipped).state;
    expect(after.calendar[after.week] && !after.calendar[after.week].night,
      'SETUP another actual paid calendar entry follows the window').toBeTruthy();
    const second = step(after, 4310302), target = player(second.state, id);
    raw('once', { id, first, skipped, second });
    expect(queueOf(first.state), 'CM_RECOVERY_ONE_CHARGE').toBeUndefined();
    expect(history(target), 'CM_RECOVERY_ONE_CHARGE').toStrictEqual({ v: 1, club: c.clubName,
      season: c.season, counts: [0, 0, 1, 0, 0, 0, 0, 0, 1] });
    expect(target.injuryWeeks, 'CM_RECOVERY_ONE_CHARGE').toBe(1);
    expect(second.state.training, 'CM_RECOVERY_ONE_CHARGE').toStrictEqual(BASE);
  });

  it('waits through a non-charged night and read-only previews before applying the recovery week', () => {
    const { c, id } = fixture(), input = queued(c, id);
    input.calendar.splice(input.week, 0, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 999 } });
    const before = copy(input), at = draws.length;
    E.developmentRate(player(input, id), input); E.recordedTraining(player(input, id), input);
    const previewDraws = draws.length - at, night = step(input, 4310103), paid = step(night.state, 4310203);
    raw('night-delay', { id, before, previewDraws, night, paid });
    expect(previewDraws, 'CM_RECOVERY_NIGHTS').toBe(0);
    expect(night.state.squad, 'CM_RECOVERY_NIGHTS').toStrictEqual(before.squad);
    expect(queueOf(night.state), 'CM_RECOVERY_NIGHTS').toStrictEqual(queueOf(before));
    expect(history(player(paid.state, id)), 'CM_RECOVERY_NIGHTS').toStrictEqual({ v: 1,
      club: c.clubName, season: c.season, counts: [0, 0, 1, 0, 0, 0, 0, 0, 0] });
    expect(queueOf(paid.state), 'CM_RECOVERY_NIGHTS').toBeUndefined();
  });

  it('keeps the pending player through the real save reader before the paid action', async () => {
    const { c, id } = fixture(), input = queued(c, id), fence = await import('@/lib/saveFence');
    localStorage.clear(); fence.saveFence.adopt(E.SAVE_KEY);
    expect(E.saveCareer(input), 'SETUP real writer acknowledges the pending career').toBe(true);
    const bytes = localStorage.getItem(E.SAVE_KEY), at = draws.length, loaded = E.loadCareer();
    expect(loaded, 'SETUP real reader opens the known current career').toBeTruthy();
    const readDraws = draws.length - at, bytesAfterRead = localStorage.getItem(E.SAVE_KEY);
    const run = step(loaded!, 4310104);
    raw('saved-queue', { id, queued: queueOf(input), loadedQueue: queueOf(loaded!), bytes,
      bytesAfterRead, readDraws, run });
    expect(queueOf(loaded!), 'CM_RECOVERY_SAVED').toStrictEqual(queueOf(input));
    expect(readDraws, 'CM_RECOVERY_SAVED').toBe(0);
    expect(bytesAfterRead, 'CM_RECOVERY_SAVED').toBe(bytes);
    expect(player(run.state, id).fitness, 'CM_RECOVERY_SAVED').toBe(98);
    expect(queueOf(run.state), 'CM_RECOVERY_SAVED').toBeUndefined();
  });

  it('queues and cancels a named player from Training without changing the standing plan or XI', async () => {
    const { c, id } = fixture(), { TrainingScreen } = await import('@/components/club-manager/TrainingScreen');
    const calls: Plan[] = [], states: CareerState[] = [], before = JSON.stringify(c), at = draws.length;
    function Harness() {
      const [career, setCareer] = useState(c);
      return <TrainingScreen career={career} onSetPlan={plan => {
        calls.push(copy(plan)); const updated = E.setTrainingPlan(career, plan); states.push(copy(updated)); setCareer(updated);
      }} onRetrain={() => { throw new Error('Unexpected retraining action'); }}
        onStopRetrain={() => { throw new Error('Unexpected retraining cancellation'); }} />;
    }
    render(<Harness />);
    const pick = screen.queryByRole('combobox', { name: 'Player for recovery' });
    const button = screen.queryByRole('button', { name: 'Queue recovery week' });
    let pending = '', hasCancel = false;
    if (pick && button) {
      fireEvent.change(pick, { target: { value: id } }); fireEvent.click(button);
      pending = screen.queryByText(/Light next paid week/i)?.textContent ?? '';
      const cancel = screen.queryByRole('button', { name: 'Cancel recovery week' }); hasCancel = !!cancel;
      if (cancel) fireEvent.click(cancel);
    }
    raw('queue-cancel', { id, hasPick: !!pick, hasQueue: !!button, pending, hasCancel,
      calls, states, inputHeld: JSON.stringify(c) === before, extraDraws: draws.length - at });
    expect(!!pick && !!button, 'CM_RECOVERY_UI_QUEUE_CANCEL').toBe(true);
    expect(pending, 'CM_RECOVERY_UI_QUEUE_CANCEL').toContain(player(c, id).name);
    expect(hasCancel, 'CM_RECOVERY_UI_QUEUE_CANCEL').toBe(true);
    expect(calls, 'CM_RECOVERY_UI_QUEUE_CANCEL').toStrictEqual([
      { ...BASE, recoveryWeek: { v: 1, club: c.clubName, season: c.season, playerId: id } }, BASE,
    ]);
    expect(states.every(state => JSON.stringify(state.xiIds) === JSON.stringify(c.xiIds)), 'CM_RECOVERY_UI_QUEUE_CANCEL').toBe(true);
    expect(states.at(-1)!.training, 'CM_RECOVERY_UI_QUEUE_CANCEL').toStrictEqual(BASE);
    expect(JSON.stringify(c), 'CM_RECOVERY_UI_QUEUE_CANCEL').toBe(before);
    expect(draws.length - at, 'CM_RECOVERY_UI_QUEUE_CANCEL').toBe(0);
  });

  it('preserves unreadable recovery metadata and refuses queue or cancel without blocking ordinary plan edits', () => {
    const { c, id } = fixture(), samples: unknown[] = [null, { v: 99, club: c.clubName,
      season: c.season, playerId: id }, { v: 1, club: c.clubName, season: c.season },
      { v: 1, club: c.clubName, season: c.season, playerId: id, extra: true }];
    const rows = samples.map((value, index) => {
      const input = copy(c); input.training = { ...BASE, recoveryWeek: value } as Plan;
      const before = JSON.stringify(input), at = draws.length;
      const q = queued(input, id), cancel = cancelled(input);
      const ordinary = E.setTrainingPlan(input, { ...input.training, intensity: 'normal' });
      const extraDraws = draws.length - at, inputHeld = JSON.stringify(input) === before;
      const paid = step(input, 4310600 + index), reference = step(withoutQueue(input), 4310600 + index);
      return { value, queueSameIdentity: q === input, cancelSameIdentity: cancel === input,
        queue: q.training, cancel: cancel.training, ordinary: ordinary.training,
        inputHeld, extraDraws, paid, reference };
    });
    raw('unsupported', rows);
    for (const row of rows) {
      expect(row.queueSameIdentity, 'CM_RECOVERY_UNSUPPORTED').toBe(true);
      expect(row.cancelSameIdentity, 'CM_RECOVERY_UNSUPPORTED').toBe(true);
      expect(row.ordinary, 'CM_RECOVERY_UNSUPPORTED').toStrictEqual({ ...BASE, intensity: 'normal', recoveryWeek: row.value });
      expect(row.inputHeld, 'CM_RECOVERY_UNSUPPORTED').toBe(true);
      expect(row.extraDraws, 'CM_RECOVERY_UNSUPPORTED').toBe(0);
      expect(queueOf(row.paid.state), 'CM_RECOVERY_UNSUPPORTED').toStrictEqual(row.value);
      expect({ ...row.paid, state: withoutQueue(row.paid.state) }, 'CM_RECOVERY_UNSUPPORTED').toStrictEqual(row.reference);
    }
  });

  it('keeps all nine ordinary paid-week states and full draw tapes unchanged when no recovery is queued', () => {
    const { c } = fixture(), rows = [];
    for (let index = 0; index < PLANS.length; index++) {
      const plan = PLANS[index], plain = E.setTrainingPlan(copy(c), plan);
      const absent = E.setTrainingPlan(copy(c), { ...plan, recoveryWeek: undefined } as Plan);
      const a = step(plain, 4310400 + index), b = step(absent, 4310400 + index);
      rows.push({ plan, ordinary: a, absentOptional: b });
    }
    raw('ordinary', rows);
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]; expect(row.absentOptional).toStrictEqual(row.ordinary);
      expect(row.ordinary.state.training).toStrictEqual(row.plan);
      const counts = Array(9).fill(0); counts[index] = 1;
      for (const p of row.ordinary.state.squad) expect(history(p)).toStrictEqual({ v: 1,
        club: c.clubName, season: c.season, counts });
    }
  });

  it('expires stale club season and departed-player queues at the first paid tick without giving their recovery to anyone', () => {
    const { c, id } = fixture();
    const frames = ['club', 'season', 'departed'].map(kind => {
      const input = copy(c);
      input.training = { ...BASE, recoveryWeek: { v: 1, club: kind === 'club' ? 'Other Recovery Club' : c.clubName,
        season: kind === 'season' ? c.season + 1 : c.season, playerId: id } } as Plan;
      if (kind === 'departed') {
        input.squad = input.squad.map(p => p.id === id ? { ...p, id: 'qa-replacement', name: p.name } : p);
        input.xiIds = input.xiIds.map(value => value === id ? 'qa-replacement' : value);
      }
      return { kind, input };
    });
    const rows = frames.map(({ kind, input }, index) => {
      const pending = queueOf(input), a = step(input, 4310500 + index);
      const b = step(withoutQueue(input), 4310500 + index);
      return { kind, pending, queued: a, ordinary: b };
    });
    raw('boundaries', rows);
    for (const row of rows) {
      expect(queueOf(row.queued.state), 'CM_RECOVERY_STALE').toBeUndefined();
      expect(row.queued, 'CM_RECOVERY_STALE').toStrictEqual(row.ordinary);
    }
  });
});
