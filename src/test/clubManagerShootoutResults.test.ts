import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  engineRegistrations, playNextEntry, restoreEngineRegistrations, runShootout, startCareer,
  type CareerState, type ShootoutDetail, type ShootoutSide,
} from '@/lib/clubManager';

// Only the new detached stream is controlled. Every other keyed roll stays real.
const detached = vi.hoisted(() => ({ force: false, streams: 0, draws: 0, fallbackRoll: 0 }));
vi.mock('@/lib/keyedRng', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/keyedRng')>();
  return {
    ...actual,
    keyedRng(key: string) {
      if (!detached.force || !key.startsWith('cm-shootout|')) return actual.keyedRng(key);
      detached.streams += 1;
      return () => { detached.draws += 1; return detached.draws % 102 === 0 ? detached.fallbackRoll : 0; };
    },
  };
});

const realRandom = Math.random;
const realNow = Date.now;
let registrations: ReturnType<typeof engineRegistrations>;
const FIXED_NOW = Date.UTC(2026, 9, 1);
const side = (prefix: string): ShootoutSide => ({
  takers: Array.from({ length: 11 }, (_, i) => ({ name: `${prefix} ${i + 1}`, rating: 75 })),
  keeperRating: 75,
});
const args = { mine: side('Home taker'), theirs: side('Away taker'), myFirst: true };
// The cast keeps the baseline type gate meaningful before the optional argument exists.
function injected(input: typeof args, random: () => number): ShootoutDetail {
  return (runShootout as (input: typeof args, random?: () => number) => ShootoutDetail)(input, random);
}

function seeded<T>(seed: number, run: () => T): { value: T; draws: number[] } {
  let a = seed | 0;
  const draws: number[] = [];
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const draw = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    draws.push(draw);
    return draw;
  };
  Date.now = () => FIXED_NOW;
  try { return { value: run(), draws }; }
  finally { Math.random = realRandom; Date.now = realNow; }
}

let cup: CareerState;
let shootoutSeed: number;
beforeAll(() => {
  registrations = engineRegistrations();
  cup = seeded(782002, () => {
    let state = startCareer('Real Madrid');
    const target = state.calendar.findIndex(entry => entry.type === 'cup');
    if (target < 0) throw new Error('Actual career has no cup fixture');
    for (let guard = 0; state.week < target && guard < 60; guard += 1) {
      const out = playNextEntry(state, { skipHalftime: true, untilWeek: target });
      state = out.state;
      if (out.kind === 'reached') break;
      if (out.kind !== 'match') throw new Error(`Actual cup walk stopped at ${out.kind}`);
    }
    if (state.week !== target) throw new Error('Actual cup walk did not reach its target');
    return state;
  }).value;
  const found = Array.from({ length: 150 }, (_, i) => 782100 + i).find(seed => {
    const out = seeded(seed, () => playNextEntry(cup, { skipHalftime: true })).value;
    if (out.kind !== 'match' || !out.report) throw new Error('Actual cup fixture did not play');
    return out.report.decidedBy === 'pens';
  });
  if (found === undefined) throw new Error('Current fixture cohort reached no shootout');
  shootoutSeed = found;
}, 120000);

afterEach(() => {
  Math.random = realRandom;
  Date.now = realNow;
  detached.force = false;
  detached.streams = 0;
  detached.draws = 0;
  detached.fallbackRoll = 0;
});
afterAll(() => restoreEngineRegistrations(registrations));

describe('shootout display data', () => {
  it('uses an injected stream without touching the global match stream', () => {
    const values = [0.1, 0.99, 0.1, 0.99, 0.1, 0.99];
    let draws = 0;
    Math.random = () => { throw new Error('Global match stream was consumed'); };
    const out = injected(args, () => values[draws++]);
    expect(draws).toBe(6);
    expect(out).toMatchObject({ mine: 3, theirs: 0 });
    expect(out.kicks.map(kick => kick.result)).toEqual(['scored', 'missed', 'scored', 'missed', 'scored', 'missed']);
    expect(out.kicks.map(kick => `${kick.mine}-${kick.theirs}`)).toEqual(['1-0', '1-0', '2-0', '2-0', '3-0', '3-0']);
  });

  it('keeps the original default stream and saved versus missed distinction', () => {
    const values = [0.75, 0.8, 0.98, 0.1, 0.1, 0.99, 0.1, 0.99];
    let draws = 0;
    Math.random = () => values[Math.min(draws++, values.length - 1)];
    const out = runShootout(args);
    expect(out.kicks.slice(0, 3).map(kick => kick.result)).toEqual(['scored', 'saved', 'missed']);
    expect(out.kicks[out.kicks.length - 1]).toMatchObject({ mine: out.mine, theirs: out.theirs });
    expect(draws).toBe(out.kicks.length);
  });

  it('keeps the existing 50-round fallback inside the injected stream too', () => {
    let draws = 0;
    Math.random = () => { throw new Error('Global match stream was consumed by the fallback'); };
    const out = injected(args, () => { draws += 1; return 0; });
    expect(draws).toBe(101);
    expect(out.kicks).toHaveLength(100);
    expect(out).toMatchObject({ mine: 51, theirs: 50 });
    // This existing explicit-order edge stays unchanged. Detached sampling must reject it.
    expect(out.kicks[out.kicks.length - 1]).toMatchObject({ mine: 50, theirs: 50 });
  });

  it.each(['absent', 'empty', 'departed'] as const)('records real simulated kicks with an %s order', mode => {
    const state = JSON.parse(JSON.stringify(cup)) as CareerState;
    if (mode === 'empty') state.shootoutOrder = [];
    if (mode === 'departed') state.shootoutOrder = ['proof-player-who-left'];
    const played = seeded(shootoutSeed, () => playNextEntry(state, { skipHalftime: true }));
    const out = played.value;
    expect(out.kind).toBe('match');
    expect(out.report?.decidedBy).toBe('pens');
    expect(out.report?.shootout, 'new shootout report has no kick details').toBeDefined();
    const detail = out.report!.shootout!;
    expect(detail.kicks.length).toBeGreaterThan(0);
    expect(detail.kicks[detail.kicks.length - 1]).toMatchObject({ mine: detail.mine, theirs: detail.theirs });
    expect(detail.mine > detail.theirs).toBe(out.report!.shootoutWon);
    expect(detail.kicks.every(kick => kick.taker.length > 0)).toBe(true);
    const replayed = seeded(shootoutSeed, () => playNextEntry(state, { skipHalftime: true }));
    expect(replayed.value.report?.shootout).toEqual(detail);
    expect(replayed.draws).toEqual(played.draws);
  });

  it('exhausts 128 detached attempts without inventing an unrecorded deciding kick', () => {
    const reference = seeded(shootoutSeed, () => playNextEntry(cup, { skipHalftime: true }));
    detached.fallbackRoll = reference.value.report!.shootoutWon ? 0 : 0.99;
    detached.force = true;
    const exhausted = seeded(shootoutSeed, () => playNextEntry(cup, { skipHalftime: true }));
    // All kicks score, so every candidate reaches the old unlogged 50-round fallback.
    expect(detached.streams).toBe(1);
    expect(detached.draws).toBe(128 * 102);
    expect(exhausted.value.report?.decidedBy).toBe('pens');
    expect(exhausted.value.report?.shootout).toBeUndefined();
    expect(exhausted.value.report?.shootoutWon).toBe(reference.value.report?.shootoutWon);
    expect(exhausted.value.state).toEqual(reference.value.state);
    expect(exhausted.draws).toEqual(reference.draws);
  });
});
