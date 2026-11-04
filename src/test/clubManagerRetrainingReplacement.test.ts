import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import type { Position } from '@/types/game';

type Engine = typeof import('@/lib/clubManager');
type Course = { to: Position; weeksLeft: number; weeksTotal: number; paused?: unknown; replace?: unknown };
type Start = (career: CareerState, id: string, to: Position, paused?: boolean, replace?: Position) => CareerState | null;
type Refusal = (player: CMPlayer | undefined, to: Position, replace?: Position) => string | null;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let E: Engine, tape: number[], next: () => number;
function stream(initial: number) {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
beforeEach(async () => {
  tape = []; next = stream(6420000);
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = next(); tape.push(value); return value; });
  vi.spyOn(Date, 'now').mockReturnValue(1793800800000);
  E = await import('@/lib/clubManager');
  await import('@/lib/saveFence');
  tape = []; next = stream(6420001);
});
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
function raw(name: string, observations: unknown) {
  if (!process.env.CM_REPLACEMENT_RAW) return;
  mkdirSync(process.env.CM_REPLACEMENT_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_REPLACEMENT_RAW, name + '.json'), JSON.stringify({ case: name,
    fixture: 'Fictional real-constructor XI with declared earned RW/CM cover. A public ST course is staged one paid week from completion. This is a controlled saved-state fixture, not natural development or real-athlete position data.',
    observations }, null, 2) + '\n');
}
function player(c: CareerState, id: string): CMPlayer {
  const p = c.squad.find(row => row.id === id);
  expect(p, 'SETUP current constructor player exists').toBeTruthy(); return p!;
}
function course(c: CareerState, id: string) { return player(c, id).retraining as Course | undefined; }
function start(c: CareerState, id: string, to: Position, paused?: boolean, replace?: unknown) {
  const action: Start = E.startRetraining; return action(c, id, to, paused, replace as Position | undefined);
}
function refusal(p: CMPlayer | undefined, to: Position, replace?: unknown) {
  const action: Refusal = E.retrainRefusal; return action(p, to, replace as Position | undefined);
}
function fixture() {
  const c = E.startCareer('Replacement Choice Borough', E.DEFAULT_ERA_ID, {
    name: 'Replacement Choice Borough', stadium: 'Replacement Park', quality: 70, budgetTier: 'mid',
    leagueId: E.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RC' },
  });
  c.formationIndex = 0; c.mentality = 'balanced'; c.form = [];
  c.budget = 1000; c.wageCap = 100000; c.training = { intensity: 'normal', focus: 'balanced' };
  const formation = E.FORMATIONS[0];
  expect(c.squad.length, 'SETUP eleven constructor players').toBeGreaterThanOrEqual(11);
  expect(formation.slots[8].allowed, 'SETUP canonical right-wing slot').toContain('RW');
  c.squad = c.squad.map((p, i) => ({ ...p, age: 24,
    position: i < 11 ? formation.slots[i].allowed[0] : p.position, secondaryPositions: [],
    rating: 70, fitness: 100, morale: 68, injuryWeeks: 0, suspendedMatches: 0, contractYears: 5 }));
  c.xiIds = c.squad.slice(0, 11).map(p => p.id);
  const id = c.squad[8].id;
  Object.assign(player(c, id), { position: 'LW', secondaryPositions: ['RW', 'CM'] });
  const at = c.calendar.findIndex(entry => entry.type === 'window');
  expect(at, 'SETUP generated paid January window').toBeGreaterThanOrEqual(0);
  c.week = at; c.press!.lastWeek = at;
  return { c, id, slot: formation.slots[8] };
}
function nearly(c: CareerState, id: string, replace?: unknown) {
  const result = start(c, id, 'ST', undefined, replace);
  expect(result, 'SETUP existing public course start is reachable').not.toBeNull();
  player(result!, id).retraining!.weeksLeft = 1;
  return result!;
}
function step(c: CareerState, seed: number) {
  tape = []; next = stream(seed);
  const before = JSON.stringify(c);
  const result = E.playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: c.week + 1 });
  const draws = [...tape], nextDraw = next();
  expect(result.state.week, 'SETUP actual paid window advances one week').toBe(c.week + 1);
  expect(JSON.stringify(c), 'SETUP public paid action leaves input held').toBe(before);
  return { state: copy(result.state), kind: result.kind, draws, nextDraw };
}
function available(c: CareerState): CareerState {
  return { ...c, squad: c.squad.map(p => ({ ...p, injuryWeeks: 0, suspendedMatches: 0 })) };
}

describe('Club Manager retraining replacement choice', () => {
  it('keeps learned cover until the paid completion and replaces only the chosen role', () => {
    const { c, id, slot } = fixture(), before = structuredClone(c), at = tape.length;
    const selected = nearly(c, id, 'CM'), ordinary = nearly(c, id);
    const actionDraws = tape.length - at;
    const a = step(selected, 6420101), b = step(ordinary, 6420101);
    const normalized = copy(a.state); player(normalized, id).secondaryPositions = ['CM', 'ST'];
    const selectedFit = E.fitPenalty(player(a.state, id), slot), ordinaryFit = E.fitPenalty(player(b.state, id), slot);
    const selectedStrength = E.matchStrengthNow(available(a.state)), ordinaryStrength = E.matchStrengthNow(available(b.state));
    raw('paid-choice', { id, before, selected, ordinary, actionDraws, selectedRun: a, ordinaryRun: b,
      selectedFit, ordinaryFit, selectedStrength, ordinaryStrength, normalized });
    expect(course(selected, id)?.replace, 'CM_REPLACE_PAID_CHOICE').toBe('CM');
    expect(player(selected, id).secondaryPositions, 'CM_REPLACE_PAID_CHOICE').toStrictEqual(['RW', 'CM']);
    expect(player(a.state, id).secondaryPositions, 'CM_REPLACE_PAID_CHOICE').toStrictEqual(['RW', 'ST']);
    expect(player(b.state, id).secondaryPositions, 'CM_REPLACE_PAID_CHOICE').toStrictEqual(['CM', 'ST']);
    expect([selectedFit, ordinaryFit], 'CM_REPLACE_PAID_CHOICE').toStrictEqual([0, 2]);
    expect(selectedStrength - ordinaryStrength, 'CM_REPLACE_PAID_CHOICE').toBeCloseTo(2 / 11, 12);
    expect(course(a.state, id), 'CM_REPLACE_PAID_CHOICE').toBeUndefined();
    expect(normalized, 'CM_REPLACE_PAID_CHOICE').toStrictEqual(b.state);
    expect(a.draws, 'CM_REPLACE_PAID_CHOICE').toStrictEqual(b.draws);
    expect(a.nextDraw, 'CM_REPLACE_PAID_CHOICE').toBe(b.nextDraw);
    expect(actionDraws, 'CM_REPLACE_PAID_CHOICE').toBe(0);
    expect(c, 'CM_REPLACE_PAID_CHOICE').toStrictEqual(before);
  });

  it('preserves course intent through pause and reload while Stop leaves future default FIFO unchanged', async () => {
    const { c, id } = fixture(), before = structuredClone(c);
    const selected = nearly(c, id, 'CM'), at = tape.length;
    const paused = start(selected, id, 'ST', true) ?? selected;
    const actionDraws = tape.length - at;
    const pausedRun = step(paused, 6420102);
    const fence = await import('@/lib/saveFence');
    fence.saveFence.adopt(E.SAVE_KEY);
    expect(E.saveCareer(pausedRun.state), 'SETUP real writer acknowledges paused state').toBe(true);
    const bytes = localStorage.getItem(E.SAVE_KEY), readAt = tape.length, loaded = E.loadCareer();
    expect(loaded, 'SETUP real reader returns controlled constructor save').not.toBeNull();
    const readDraws = tape.length - readAt, afterRead = localStorage.getItem(E.SAVE_KEY);
    const resumed = start(loaded!, id, 'ST', false) ?? loaded!;
    const completed = step(resumed, 6420103);
    const stopped = E.stopRetraining(selected, id), stoppedExpected = structuredClone(selected);
    delete player(stoppedExpected, id).retraining;
    const restarted = nearly(stopped, id), defaultRun = step(restarted, 6420104);
    raw('pause-stop-reload', { id, before, selected, paused, pausedRun, bytes, loaded, afterRead, readDraws,
      resumed, completed, stopped, stoppedExpected, restarted, defaultRun, actionDraws });
    expect(course(pausedRun.state, id), 'CM_REPLACE_PAUSE_STOP').toStrictEqual({ ...course(selected, id), paused: true });
    expect(course(loaded!, id)?.replace, 'CM_REPLACE_PAUSE_STOP').toBe('CM');
    expect(player(loaded!, id).secondaryPositions, 'CM_REPLACE_PAUSE_STOP').toStrictEqual(['RW', 'CM']);
    expect(course(resumed, id), 'CM_REPLACE_PAUSE_STOP').toStrictEqual(course(selected, id));
    expect(player(completed.state, id).secondaryPositions, 'CM_REPLACE_PAUSE_STOP').toStrictEqual(['RW', 'ST']);
    expect(stopped, 'CM_REPLACE_PAUSE_STOP').toStrictEqual(stoppedExpected);
    expect(player(stopped, id).secondaryPositions, 'CM_REPLACE_PAUSE_STOP').toStrictEqual(['RW', 'CM']);
    expect(player(defaultRun.state, id).secondaryPositions, 'CM_REPLACE_PAUSE_STOP').toStrictEqual(['CM', 'ST']);
    expect(course(restarted, id), 'CM_REPLACE_PAUSE_STOP').not.toHaveProperty('replace');
    expect(afterRead, 'CM_REPLACE_PAUSE_STOP').toBe(bytes);
    expect(readDraws, 'CM_REPLACE_PAUSE_STOP').toBe(0);
    expect(actionDraws, 'CM_REPLACE_PAUSE_STOP').toBe(0);
    expect(c, 'CM_REPLACE_PAUSE_STOP').toStrictEqual(before);
  });

  it('refuses invalid replacement starts without changing qualifications or consuming a draw', () => {
    const { c, id } = fixture();
    const vectors: { name: string; replace: unknown; roles?: unknown }[] = [
      { name: 'not-held', replace: 'CB' }, { name: 'primary', replace: 'LW' },
      { name: 'target', replace: 'ST' }, { name: 'unknown', replace: 'future-role' },
      { name: 'null', replace: null }, { name: 'future', replace: { v: 99 } },
      { name: 'spare-slot', replace: 'RW', roles: ['RW'] },
      { name: 'duplicate', replace: 'RW', roles: ['RW', 'RW'] },
      { name: 'oversized', replace: 'CM', roles: ['RW', 'CM', 'CB'] },
      { name: 'invalid-role', replace: 'RW', roles: ['RW', 'future-role'] },
    ];
    const rows = vectors.map(value => {
      const input = structuredClone(c);
      if (value.roles) player(input, id).secondaryPositions = value.roles as Position[];
      const before = structuredClone(input), at = tape.length;
      const reason = refusal(player(input, id), 'ST', value.replace);
      const result = start(input, id, 'ST', undefined, value.replace);
      return { ...value, before, after: input, result, reason, extraDraws: tape.length - at };
    });
    raw('invalid-starts', { rows });
    for (const row of rows) {
      expect(row.result, 'CM_REPLACE_REFUSE_START').toBeNull();
      expect(typeof row.reason, 'CM_REPLACE_REFUSE_START').toBe('string');
      expect(row.reason && row.reason.length, 'CM_REPLACE_REFUSE_START').toBeGreaterThan(0);
      expect(row.after, 'CM_REPLACE_REFUSE_START').toStrictEqual(row.before);
      expect(row.extraDraws, 'CM_REPLACE_REFUSE_START').toBe(0);
    }
  });

  it('preserves stale or unsupported tagged courses through paid ticks and refuses pause edits', async () => {
    const { c, id } = fixture(), fence = await import('@/lib/saveFence');
    const vectors: { name: string; replace: unknown; roles?: Position[]; extra?: boolean }[] = [
      { name: 'null', replace: null }, { name: 'future-value', replace: { v: 99 } },
      { name: 'unknown-role', replace: 'future-role' }, { name: 'primary', replace: 'LW' },
      { name: 'target', replace: 'ST' }, { name: 'lost-cover', replace: 'CM', roles: ['RW', 'CB'] },
      { name: 'duplicate-cover', replace: 'CM', roles: ['CM', 'CM'] },
      { name: 'spare-slot', replace: 'CM', roles: ['CM'] },
      { name: 'future-field', replace: 'CM', extra: true },
    ];
    const rows = vectors.map((value, index) => {
      const input = nearly(c, id);
      Object.assign(course(input, id)!, { replace: value.replace }, value.extra ? { future: 99 } : {});
      if (value.roles) player(input, id).secondaryPositions = value.roles;
      const before = structuredClone(input), at = tape.length;
      const pause = start(input, id, 'ST', true), resume = start(input, id, 'ST', false);
      const editDraws = tape.length - at;
      localStorage.clear(); fence.saveFence.adopt(E.SAVE_KEY);
      const wrote = E.saveCareer(input), bytes = localStorage.getItem(E.SAVE_KEY), readAt = tape.length, loaded = E.loadCareer();
      expect(loaded, 'SETUP reader retains unknown saved course').not.toBeNull();
      const readDraws = tape.length - readAt, afterRead = localStorage.getItem(E.SAVE_KEY);
      const run = step(loaded!, 6420300 + index);
      const stopped = E.stopRetraining(input, id), expectedStop = structuredClone(input);
      delete player(expectedStop, id).retraining;
      return { ...value, before, after: input, pause, resume, editDraws, wrote, bytes, loaded, readDraws, afterRead, run, stopped, expectedStop };
    });
    raw('unsupported-courses', { rows });
    for (const row of rows) {
      expect(course(row.run.state, id), 'CM_REPLACE_UNSUPPORTED').toStrictEqual(course(row.before, id));
      expect(player(row.run.state, id).secondaryPositions, 'CM_REPLACE_UNSUPPORTED').toStrictEqual(player(row.before, id).secondaryPositions);
      expect(row.pause, 'CM_REPLACE_UNSUPPORTED').toBeNull();
      expect(row.resume, 'CM_REPLACE_UNSUPPORTED').toBeNull();
      expect(row.stopped, 'CM_REPLACE_UNSUPPORTED').toStrictEqual(row.expectedStop);
      expect(row.wrote, 'CM_REPLACE_UNSUPPORTED').toBe(true);
      expect(course(row.loaded!, id), 'CM_REPLACE_UNSUPPORTED').toStrictEqual(course(row.before, id));
      expect(row.afterRead, 'CM_REPLACE_UNSUPPORTED').toBe(row.bytes);
      expect(row.readDraws + row.editDraws, 'CM_REPLACE_UNSUPPORTED').toBe(0);
      expect(row.after, 'CM_REPLACE_UNSUPPORTED').toStrictEqual(row.before);
    }
  });

  it('keeps omitted choices exact across default FIFO paid outputs and full draw tapes', () => {
    const { c, id, slot } = fixture(), before = structuredClone(c), at = tape.length;
    const direct = E.startRetraining(c, id, 'ST')!;
    const explicit = start(c, id, 'ST', undefined, undefined)!;
    const startDraws = tape.length - at;
    const total = E.retrainWeeks(c, player(c, id), 'ST');
    const expected = structuredClone(c);
    player(expected, id).retraining = { to: 'ST', weeksLeft: total, weeksTotal: total };
    player(direct, id).retraining!.weeksLeft = 1; player(explicit, id).retraining!.weeksLeft = 1;
    player(expected, id).retraining!.weeksLeft = 1;
    const a = step(direct, 6420105), b = step(explicit, 6420105);
    raw('ordinary-fifo', { id, before, direct, explicit, expected, startDraws, ordinary: a, explicitRun: b,
      fit: E.fitPenalty(player(a.state, id), slot) });
    expect(direct, 'CM_REPLACE_ORDINARY').toStrictEqual(expected);
    expect(explicit, 'CM_REPLACE_ORDINARY').toStrictEqual(expected);
    expect(a, 'CM_REPLACE_ORDINARY').toStrictEqual(b);
    expect(player(a.state, id).secondaryPositions, 'CM_REPLACE_ORDINARY').toStrictEqual(['CM', 'ST']);
    expect(E.fitPenalty(player(a.state, id), slot), 'CM_REPLACE_ORDINARY').toBe(2);
    expect(course(a.state, id), 'CM_REPLACE_ORDINARY').toBeUndefined();
    expect(startDraws, 'CM_REPLACE_ORDINARY').toBe(0);
    expect(c, 'CM_REPLACE_ORDINARY').toStrictEqual(before);
  });

  it('retains spare-slot behavior and untagged scalar save compatibility without adding replacement metadata', async () => {
    const { c, id } = fixture(), fence = await import('@/lib/saveFence');
    const spare = structuredClone(c); player(spare, id).secondaryPositions = ['RW'];
    const spareStarted = nearly(spare, id), spareRun = step(spareStarted, 6420106);
    const scalarRows = ['future', 42].map((value, index) => {
      const input = structuredClone(c);
      (player(input, id) as unknown as { retraining: unknown }).retraining = value;
      localStorage.clear(); fence.saveFence.adopt(E.SAVE_KEY);
      const wrote = E.saveCareer(input), bytes = localStorage.getItem(E.SAVE_KEY), at = tape.length, loaded = E.loadCareer();
      expect(loaded, 'SETUP scalar legacy save loads').not.toBeNull();
      const readDraws = tape.length - at, afterRead = localStorage.getItem(E.SAVE_KEY);
      const run = step(loaded!, 6420400 + index), stopped = E.stopRetraining(input, id), expectedStop = structuredClone(input);
      delete player(expectedStop, id).retraining;
      return { value, input, wrote, bytes, loaded, readDraws, afterRead, run, stopped, expectedStop };
    });
    raw('legacy-loads', { id, spare, spareStarted, spareRun, scalarRows });
    expect(course(spareStarted, id), 'CM_REPLACE_LEGACY').not.toHaveProperty('replace');
    expect(player(spareRun.state, id).secondaryPositions, 'CM_REPLACE_LEGACY').toStrictEqual(['RW', 'ST']);
    for (const row of scalarRows) {
      const expected = typeof row.value === 'string'
        ? { '0': 'f', '1': 'u', '2': 't', '3': 'u', '4': 'r', '5': 'e', weeksLeft: null }
        : { weeksLeft: null };
      expect(row.wrote, 'CM_REPLACE_LEGACY').toBe(true);
      expect(player(row.loaded!, id).retraining, 'CM_REPLACE_LEGACY').toBe(row.value);
      expect(course(row.run.state, id), 'CM_REPLACE_LEGACY').toStrictEqual(expected);
      expect(player(row.run.state, id).secondaryPositions, 'CM_REPLACE_LEGACY').toStrictEqual(['RW', 'CM']);
      expect(row.afterRead, 'CM_REPLACE_LEGACY').toBe(row.bytes);
      expect(row.readDraws, 'CM_REPLACE_LEGACY').toBe(0);
      expect(row.stopped, 'CM_REPLACE_LEGACY').toStrictEqual(row.expectedStop);
    }
  });
});
