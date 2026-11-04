import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import type { Position } from '@/types/game';

type Engine = typeof import('@/lib/clubManager');
type Course = { to: Position; weeksLeft: number; weeksTotal: number; paused?: unknown };
type Start = (career: CareerState, id: string, to: Position, paused?: boolean) => CareerState | null;
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
let E: Engine, tape: number[], next: () => number;
function stream(initial: number) {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
beforeEach(async () => {
  tape = []; next = stream(5320001);
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = next(); tape.push(value); return value; });
  vi.spyOn(Date, 'now').mockReturnValue(1793800800000);
  Element.prototype.scrollIntoView = vi.fn();
  E = await import('@/lib/clubManager');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
function raw(name: string, observations: unknown) {
  if (!process.env.CM_RETRAINING_PAUSE_RAW) return;
  mkdirSync(process.env.CM_RETRAINING_PAUSE_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_RETRAINING_PAUSE_RAW, name + '.json'), JSON.stringify({ case: name,
    fixture: 'Fictional real-constructor eleven and generated January window. A real started ST course is positioned one paid week from completion as a declared saved-progress fixture. No natural history or athlete claim.',
    observations }, null, 2) + '\n');
}
function player(c: CareerState, id: string): CMPlayer {
  const p = c.squad.find(row => row.id === id);
  expect(p, 'SETUP fixture target remains in the current squad').toBeTruthy(); return p!;
}
function course(c: CareerState, id: string): Course | undefined { return player(c, id).retraining as Course | undefined; }
function toggle(c: CareerState, id: string, to: Position, paused: boolean) {
  const start: Start = E.startRetraining; return start(c, id, to, paused);
}
function fixture() {
  let c = E.startCareer('Course Timing Borough', E.DEFAULT_ERA_ID, {
    name: 'Course Timing Borough', stadium: 'Course Park', quality: 70, budgetTier: 'mid',
    leagueId: E.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'CT' },
  });
  c.formationIndex = 0; c.mentality = 'balanced'; c.form = [];
  c.budget = 1000; c.wageCap = 100000;
  c.training = { intensity: 'normal', focus: 'balanced' };
  const formation = E.FORMATIONS[0];
  expect(c.squad.length, 'SETUP eleven real constructor players').toBeGreaterThanOrEqual(11);
  expect(formation.slots[8].allowed, 'SETUP current canonical right wing slot').toContain('RW');
  c.squad = c.squad.map((p, i) => ({ ...p, position: i < 11 ? formation.slots[i].allowed[0] : p.position,
    secondaryPositions: [], rating: 70, fitness: 100, morale: 68, injuryWeeks: 0, suspendedMatches: 0, contractYears: 5 }));
  c.xiIds = c.squad.slice(0, 11).map(p => p.id);
  const id = c.squad[8].id;
  Object.assign(player(c, id), { position: 'LW', secondaryPositions: ['RW', 'CM'] });
  const started = E.startRetraining(c, id, 'ST');
  expect(started, 'SETUP existing public start creates a real valid course').toBeTruthy(); c = started!;
  player(c, id).retraining!.weeksLeft = 1;
  const at = c.calendar.findIndex(entry => entry.type === 'window');
  expect(at, 'SETUP generated paid January window').toBeGreaterThanOrEqual(0);
  c.week = at; c.press!.lastWeek = at;
  return { c, id, slot: formation.slots[8] };
}
function step(c: CareerState, seed: number) {
  tape = []; next = stream(seed);
  const before = JSON.stringify(c), result = E.playNextEntry(c,
    { skipHalftime: true, noCoach: true, untilWeek: c.week + 1 });
  const draws = [...tape], nextDraw = next();
  expect(result.state.week, 'SETUP one real paid window was advanced').toBe(c.week + 1);
  expect(JSON.stringify(c), 'SETUP public action keeps its input').toBe(before);
  return { state: copy(result.state), kind: result.kind, draws, nextDraw };
}

describe('Club Manager retraining pause', () => {
  it('keeps earned weeks and the older learned wing fit through a paid paused week', () => {
    const { c, id, slot } = fixture(), before = copy(c), at = tape.length;
    const paused = toggle(c, id, 'ST', true), toggleDraws = tape.length - at;
    const a = step(paused ?? c, 5320101), b = step(c, 5320101);
    const available = (state: CareerState) => ({ ...state, squad: state.squad.map(p => ({ ...p, injuryWeeks: 0, suspendedMatches: 0 })) });
    const observed = { paused: course(a.state, id), ordinary: course(b.state, id),
      pausedPositions: E.heldPositions(player(a.state, id)), ordinaryPositions: E.heldPositions(player(b.state, id)),
      pausedFit: E.fitPenalty(player(a.state, id), slot), ordinaryFit: E.fitPenalty(player(b.state, id), slot),
      pausedStrength: E.matchStrengthNow(available(a.state)), ordinaryStrength: E.matchStrengthNow(available(b.state)) };
    raw('pause-fit', { id, before, toggleResult: paused, toggleDraws, paused: a, ordinary: b, observed });
    expect(course(paused ?? c, id)?.paused, 'CM_RETRAIN_PAUSE_FIT').toBe(true);
    expect(observed.paused, 'CM_RETRAIN_PAUSE_FIT').toStrictEqual({ ...course(c, id), paused: true });
    expect(observed.pausedPositions, 'CM_RETRAIN_PAUSE_FIT').toStrictEqual(['LW', 'RW', 'CM']);
    expect(observed.ordinaryPositions, 'CM_RETRAIN_PAUSE_FIT').toStrictEqual(['LW', 'CM', 'ST']);
    expect([observed.pausedFit, observed.ordinaryFit], 'CM_RETRAIN_PAUSE_FIT').toStrictEqual([0, 2]);
    expect(observed.pausedStrength - observed.ordinaryStrength, 'CM_RETRAIN_PAUSE_FIT').toBeCloseTo(2 / 11, 12);
    expect(player(a.state, id).fitness, 'CM_RETRAIN_PAUSE_FIT').toBe(player(b.state, id).fitness);
    expect(a.state.squad.map(p => [p.id, p.rating, p.fitness, p.morale, p.injuryWeeks, p.suspendedMatches]), 'CM_RETRAIN_PAUSE_FIT')
      .toStrictEqual(b.state.squad.map(p => [p.id, p.rating, p.fitness, p.morale, p.injuryWeeks, p.suspendedMatches]));
    expect(a.state.xiIds, 'CM_RETRAIN_PAUSE_FIT').toStrictEqual(before.xiIds);
    expect(toggleDraws, 'CM_RETRAIN_PAUSE_FIT').toBe(0);
    expect(c, 'CM_RETRAIN_PAUSE_FIT').toStrictEqual(before);
  });

  it('resumes the existing counter without restarting and completes by the original replacement rule', () => {
    const { c, id, slot } = fixture(); Object.assign(player(c, id).retraining!, { paused: true });
    const before = copy(c), at = tape.length, resumed = toggle(c, id, 'ST', false);
    const twice = resumed ? toggle(resumed, id, 'ST', false) : null;
    const changedDraws = tape.length - at, run = step(resumed ?? c, 5320102);
    const ordinaryCourse = copy(course(c, id)!); delete ordinaryCourse.paused;
    raw('resume', { id, before, resumed, idempotent: twice === resumed, changedDraws, run,
      finalPositions: E.heldPositions(player(run.state, id)), finalFit: E.fitPenalty(player(run.state, id), slot) });
    expect(resumed && course(resumed, id), 'CM_RETRAIN_RESUME').toStrictEqual(ordinaryCourse);
    expect(twice, 'CM_RETRAIN_RESUME').toBe(resumed);
    expect(course(run.state, id), 'CM_RETRAIN_RESUME').toBeUndefined();
    expect(player(run.state, id).secondaryPositions, 'CM_RETRAIN_RESUME').toStrictEqual(['CM', 'ST']);
    expect(E.fitPenalty(player(run.state, id), slot), 'CM_RETRAIN_RESUME').toBe(2);
    expect(changedDraws, 'CM_RETRAIN_RESUME').toBe(0);
    expect(c, 'CM_RETRAIN_RESUME').toStrictEqual(before);
  });

  it('offers native Pause and Resume controls while keeping Stop as complete cancellation', async () => {
    const { c, id } = fixture(), { TrainingScreen } = await import('@/components/club-manager/TrainingScreen');
    const name = player(c, id).name, calls: { id: string; to: Position; paused?: boolean }[] = [],
      stops: string[] = [], states: CareerState[] = [], before = JSON.stringify(c), saved = localStorage.getItem(E.SAVE_KEY), at = tape.length;
    function Harness() {
      const [career, setCareer] = useState(c);
      return <TrainingScreen career={career} onSetPlan={() => { throw new Error('Unexpected base-plan action'); }}
        onRetrain={(playerId, to, paused?: boolean) => {
          calls.push({ id: playerId, to, paused }); const next = toggle(career, playerId, to, paused!);
          if (next) { states.push(copy(next)); setCareer(next); }
        }} onStopRetrain={playerId => {
          stops.push(playerId); const next = E.stopRetraining(career, playerId); states.push(copy(next)); setCareer(next);
        }} />;
    }
    render(<Harness />);
    const pause = screen.queryByRole('button', { name: 'Pause retraining for ' + name });
    let hasResume = false, stopped = false;
    if (pause) {
      fireEvent.click(pause);
      const resume = screen.queryByRole('button', { name: 'Resume retraining for ' + name }); hasResume = !!resume;
      if (resume) fireEvent.click(resume);
      const stop = screen.queryByRole('button', { name: 'Stop' });
      if (stop) { fireEvent.click(stop); stopped = true; }
    }
    raw('ui-actions', { id, hasPause: !!pause, hasResume, stopped, calls, stops, states,
      extraDraws: tape.length - at, inputHeld: JSON.stringify(c) === before, savedHeld: localStorage.getItem(E.SAVE_KEY) === saved });
    expect(!!pause && hasResume && stopped, 'CM_RETRAIN_PAUSE_UI').toBe(true);
    expect(calls, 'CM_RETRAIN_PAUSE_UI').toStrictEqual([{ id, to: 'ST', paused: true }, { id, to: 'ST', paused: false }]);
    expect(stops, 'CM_RETRAIN_PAUSE_UI').toStrictEqual([id]);
    expect(course(states[0], id), 'CM_RETRAIN_PAUSE_UI').toStrictEqual({ ...course(c, id), paused: true });
    expect(course(states[1], id), 'CM_RETRAIN_PAUSE_UI').toStrictEqual(course(c, id));
    expect(course(states[2], id), 'CM_RETRAIN_PAUSE_UI').toBeUndefined();
    expect(tape.length - at, 'CM_RETRAIN_PAUSE_UI').toBe(0);
    expect(JSON.stringify(c), 'CM_RETRAIN_PAUSE_UI').toBe(before);
    expect(localStorage.getItem(E.SAVE_KEY), 'CM_RETRAIN_PAUSE_UI').toBe(saved);
  });

  it('refuses stale or malformed toggles and preserves unknown pause metadata through a paid tick', () => {
    const { c, id } = fixture();
    const invalid = ['missing-course', 'missing-id', 'different-target', 'zero-weeks', 'future-field', 'already-held', 'unknown-pause'];
    const rows = invalid.map(kind => {
      const input = copy(c), p = player(input, id); let askedId = id, to: Position = 'ST';
      if (kind === 'missing-course') delete p.retraining;
      if (kind === 'missing-id') askedId = 'qa-departed-player';
      if (kind === 'different-target') to = 'CB';
      if (kind === 'zero-weeks') p.retraining!.weeksLeft = 0;
      if (kind === 'future-field') Object.assign(p.retraining!, { future: 99 });
      if (kind === 'already-held') p.secondaryPositions = ['RW', 'ST'];
      if (kind === 'unknown-pause') Object.assign(p.retraining!, { paused: { v: 99 } });
      const before = JSON.stringify(input), at = tape.length;
      const pause = toggle(input, askedId, to, true), resume = toggle(input, askedId, to, false);
      return { kind, pause, resume, inputHeld: JSON.stringify(input) === before, extraDraws: tape.length - at };
    });
    const unknowns = [null, 'future', 1, { v: 99 }].map((value, index) => {
      const input = copy(c); Object.assign(player(input, id).retraining!, { paused: value });
      const run = step(input, 5320300 + index);
      return { value, before: course(input, id), run };
    });
    raw('refusals', { rows, unknowns });
    for (const row of rows) {
      expect(row.pause, 'CM_RETRAIN_PAUSE_REFUSAL').toBeNull();
      expect(row.resume, 'CM_RETRAIN_PAUSE_REFUSAL').toBeNull();
      expect(row.inputHeld, 'CM_RETRAIN_PAUSE_REFUSAL').toBe(true);
      expect(row.extraDraws, 'CM_RETRAIN_PAUSE_REFUSAL').toBe(0);
    }
    for (const row of unknowns) {
      expect(course(row.run.state, id), 'CM_RETRAIN_PAUSE_REFUSAL').toStrictEqual(row.before);
      expect(player(row.run.state, id).secondaryPositions, 'CM_RETRAIN_PAUSE_REFUSAL').toStrictEqual(['RW', 'CM']);
    }
  });

  it('preserves legacy starts unpaused ticks full tapes real reloads and the existing Stop result', async () => {
    const { c, id } = fixture(), legacy = copy(c); course(legacy, id)!.weeksLeft = 2;
    const explicitFalse = copy(legacy); Object.assign(player(explicitFalse, id).retraining!, { paused: false });
    const a = step(legacy, 5320105), b = step(explicitFalse, 5320105);
    const blank = copy(c); delete player(blank, id).retraining;
    const beforeStart = JSON.stringify(blank), startAt = tape.length, started = E.startRetraining(blank, id, 'ST');
    const startDraws = tape.length - startAt;
    const stopped = E.stopRetraining(c, id), stoppedExpected = structuredClone(c); delete player(stoppedExpected, id).retraining;
    const pending = copy(c); Object.assign(player(pending, id).retraining!, { paused: true });
    const fence = await import('@/lib/saveFence'); localStorage.clear(); fence.saveFence.adopt(E.SAVE_KEY);
    expect(E.saveCareer(pending), 'SETUP existing writer acknowledges the controlled course').toBe(true);
    const bytes = localStorage.getItem(E.SAVE_KEY), at = tape.length, loaded = E.loadCareer(), readDraws = tape.length - at;
    raw('ordinary', { legacy: a, explicitFalse: b, blank, started, startDraws, stopped, pending,
      loaded, bytes, afterRead: localStorage.getItem(E.SAVE_KEY), readDraws });
    expect(course(a.state, id)).toStrictEqual({ ...course(legacy, id), weeksLeft: 1 });
    expect(course(b.state, id)).toStrictEqual({ ...course(explicitFalse, id), weeksLeft: 1 });
    expect(b.draws).toStrictEqual(a.draws); expect(b.nextDraw).toBe(a.nextDraw);
    expect(started).not.toBeNull(); expect(course(started!, id)).toStrictEqual({ to: 'ST',
      weeksLeft: E.retrainWeeks(blank, player(blank, id), 'ST'), weeksTotal: E.retrainWeeks(blank, player(blank, id), 'ST') });
    expect(JSON.stringify(blank)).toBe(beforeStart); expect(startDraws).toBe(0);
    expect(stopped).toStrictEqual(stoppedExpected);
    expect(loaded).not.toBeNull(); expect(course(loaded!, id)).toStrictEqual(course(pending, id));
    expect(localStorage.getItem(E.SAVE_KEY)).toBe(bytes); expect(readDraws).toBe(0);
  });
});
