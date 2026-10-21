/* Release BK triage, section 7 (a defect of Round 1509): a save the engine wrote loads to the same bytes.
 *
 * loadCareer runs the Champions League's load repair on every save. For a club IN the Champions League the repair
 * takes off a key the save does not hold, and setWorldComp took the whole worldComps object off and put it back,
 * so since Round 1509 (every career of today's world follows the Europa League) and Round 1510 (the super cup)
 * the object moved to the end of the save's keys at the first load. Every value stayed the same; only the bytes
 * moved, and two packet proofs of Release BE assert them (qualifyManagerNoteSnapshots and
 * playClubManagerDecisionDepth). Each case saves a career the engine wrote and played on, loads it, saves the
 * loaded career and loads that again, and holds all four to one JSON, byte for byte. The first case failed on
 * 499ec5ac; the watcher case, whose worldComps holds all three keys, and the second summer are guards that the
 * fix moves nothing else.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  finishSeason, loadCareer, playNextEntry, saveCareer, SAVE_KEY, startCareer, startNextSeason, type CareerState,
} from './clubManager';
import { keyedRng } from './keyedRng';

const OPTS = { skipHalftime: true, noCoach: true } as const;

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

/** Every draw from one keyed stream, so a case plays the same career on every run. */
function seeded(key: string): void {
  const rng = keyedRng(`worldCompsReload|${key}`);
  vi.spyOn(Math, 'random').mockImplementation(rng);
}

function play(state: CareerState, entries: number): CareerState {
  let s = state;
  for (let i = 0; i < entries; i += 1) {
    const r = playNextEntry(s, OPTS);
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

function playSeason(state: CareerState): CareerState {
  let s = state;
  for (let i = 0; i < 240; i += 1) {
    const r = playNextEntry(s, OPTS);
    s = r.state;
    if (r.kind === 'seasonOver') return s;
  }
  throw new Error('the season did not end in 240 entries');
}

/** Where two JSON saves part: the first top level key whose value differs, else where worldComps stands in each. */
function where(a: string, b: string): string {
  const A = JSON.parse(a) as Record<string, unknown>;
  const B = JSON.parse(b) as Record<string, unknown>;
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) return `the value of ${k} differs`;
  }
  const ka = Object.keys(A), kb = Object.keys(B);
  return `the key order differs: worldComps at ${ka.indexOf('worldComps')} of ${ka.length}, then at ${kb.indexOf('worldComps')} of ${kb.length}`;
}

/** Save, load, save the loaded career, load again: one JSON at every step. */
function expectByteStable(state: CareerState, label: string): void {
  expect(saveCareer(state)).toBe(true);
  const saved = localStorage.getItem(SAVE_KEY) as string;
  const first = loadCareer();
  expect(first, `${label}: the save did not load`).not.toBeNull();
  const firstJson = JSON.stringify(first);
  expect(firstJson === saved, `${label}: the first load differs from the save the engine wrote (${firstJson === saved ? '' : where(saved, firstJson)})`).toBe(true);
  expect(saveCareer(first as CareerState)).toBe(true);
  const resaved = localStorage.getItem(SAVE_KEY) as string;
  expect(resaved === saved, `${label}: the loaded career saves other bytes (${resaved === saved ? '' : where(saved, resaved)})`).toBe(true);
  const againJson = JSON.stringify(loadCareer());
  expect(againJson === firstJson, `${label}: the reload differs from the first load (${againJson === firstJson ? '' : where(firstJson, againJson)})`).toBe(true);
}

/** The case is only worth its name when keys stand after worldComps in the save, so a move to the end would show. */
function expectWorldCompsNotLast(state: CareerState, label: string): void {
  const keys = Object.keys(state);
  const at = keys.indexOf('worldComps');
  expect(at, `${label}: the career holds no worldComps`).toBeGreaterThanOrEqual(0);
  expect(at, `${label}: worldComps is the last key, so a move to the end could not show`).toBeLessThan(keys.length - 1);
}

describe('Club Manager: a save the engine wrote loads to the same bytes, whatever worldComps holds', () => {
  it('a club in the Champions League, following the Europa League and the super cup', () => {
    seeded('participant-s1');
    const start = startCareer('Arsenal');
    expect(start.uclGroup, 'Arsenal starts in the Champions League').toBeTruthy();
    expect(start.worldComps?.ucl).toBeUndefined();
    expect(start.worldComps?.uel, 'a club in the Champions League follows the Europa League').toBeTruthy();
    expect(start.worldComps?.dsc, 'and its super cup').toBeTruthy();
    const s = play(start, 21);
    expectWorldCompsNotLast(s, 'Arsenal mid season one');
    expectByteStable(s, 'Arsenal mid season one');
  });

  it('a club watching the Champions League, the Europa League and the super cup', () => {
    seeded('watcher-s1');
    const start = startCareer('Chelsea');
    expect(start.uclGroup, 'Chelsea starts outside the Champions League').toBeFalsy();
    expect(start.worldComps?.ucl && start.worldComps?.uel && start.worldComps?.dsc, 'Chelsea follows all three').toBeTruthy();
    const s = play(start, 21);
    expectWorldCompsNotLast(s, 'Chelsea mid season one');
    expectByteStable(s, 'Chelsea mid season one');
  });

  it('a club in the Champions League, after its first summer', () => {
    seeded('participant-s2');
    const one = playSeason(startCareer('Arsenal'));
    const two = startNextSeason(finishSeason(one).state);
    expectByteStable(two, 'Arsenal at its first summer');
    expectByteStable(play(two, 21), 'Arsenal mid season two');
  });
});
