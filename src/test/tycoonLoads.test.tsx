/* Round 581: Stadium Tycoon loads a bad save as a working game, and writes every
   change before React renders it.

   TWO BUGS, ONE ROUND.
   - The loader merged the stored upgrade levels in raw. A save carrying
     levels.squad = "abc" loaded as a string, the goal chance became NaN, and no
     roll ever beat NaN again: the club never scored. The match minute, the
     banked seconds, the streak and the match number were never checked either,
     and a savedAt that was not a number made the away settle pay NaN.
   - The state ref was assigned during render. Between an action and the render
     after it, the ref still held the state from before the action, so a
     pagehide in that gap (the Round 567 shape) saved the old ground over a Sell
     up, and a tick and a tap landing in the same frame each read the old ref and
     the second erased the first.

   HOW THIS DRIVES IT. The real hook, the real lib, jsdom's real localStorage and
   hand-delivered 16ms frames, the tycoonAway rig. The doctored save is the one
   in src/test/fixtures/tycoonSaves.json, so the harness and this suite read the
   same bytes.

   The wrapper is scripts/simTycoonLoads.mjs; run that, not this file alone. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import {
  TRACKS, TYCOON_SAVE_KEY, goalChancePerMin, prestigeThreshold, canPrestige,
} from '@/lib/stadiumTycoon';
import corpus from './fixtures/tycoonSaves.json';

const FRAME_MS = 16;
const EPOCH = 1767225600000;
const RESIDUE_SEC = 0.216;
const TEST_MS = 120_000;

type Entry = { name: string; key: string; raw: string; loaded: string | null; current: string | null };
const entry = (name: string) => {
  const e = (corpus as { entries: Entry[] }).entries.find(x => x.key === 'stadium' && x.name === name);
  if (!e) throw new Error(`no stadium save called ${name}`);
  return e;
};

let vnow = 0;
let frameCb: FrameRequestCallback | null = null;
let latest: ReturnType<typeof useStadiumTycoon> | null = null;
function Probe() {
  latest = useStadiumTycoon();
  return null;
}
const g = () => {
  if (!latest) throw new Error('the Stadium Tycoon hook is not mounted');
  return latest;
};

function frame() {
  const cb = frameCb;
  if (!cb) return;
  frameCb = null;
  vnow += FRAME_MS;
  cb(vnow);
}
function frames(count: number) {
  for (let i = 0; i < count; i += 1) act(() => { frame(); });
}

const clockSec = (s: { totalMatches?: number; minute: number; matchSec?: number }) =>
  ((s.totalMatches ?? 0) * 90 + s.minute) * 1.4 + (s.matchSec ?? 0);

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function measured(line: string) {
  console.log(`LOADS| ${line}`);
}

beforeEach(() => {
  vnow = 0;
  frameCb = null;
  latest = null;
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20260914));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameCb = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frameCb = null; });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stadium Tycoon loads and writes', () => {
  it('7 a doctored save loads as a working game and its match clock runs', () => {
    localStorage.setItem(TYCOON_SAVE_KEY, entry('doctored').raw);
    render(<Probe />);
    const s = g().state;
    const problems: string[] = [];
    for (const [id, lvl] of Object.entries(s.levels)) {
      const track = TRACKS.find(t => t.id === id);
      if (!track) problems.push(`unknown track ${id}`);
      else if (!Number.isInteger(lvl) || lvl < 0 || lvl > track.maxLevel) problems.push(`${id} at ${JSON.stringify(lvl)}`);
    }
    for (const t of TRACKS) if (!(t.id in s.levels)) problems.push(`${t.id} missing`);
    if (!Number.isInteger(s.minute) || s.minute < 0 || s.minute > 89) problems.push(`minute ${s.minute}`);
    if (s.matchSec !== undefined && !(s.matchSec >= 0 && s.matchSec < 1.4)) problems.push(`matchSec ${s.matchSec}`);
    for (const k of ['streak', 'matchNo', 'totalGoals', 'totalWins', 'totalTaps', 'goalsFor', 'goalsAgainst'] as const) {
      if (!Number.isInteger(s[k]) || s[k] < 0) problems.push(`${k} ${s[k]}`);
    }
    if (!Number.isFinite(s.savedAt) || s.savedAt > Date.now()) problems.push(`savedAt ${s.savedAt}`);
    if (!Number.isFinite(goalChancePerMin(s))) problems.push(`goal chance ${goalChancePerMin(s)}`);
    expect(problems, `the doctored save loaded broken: ${problems.join('; ')}`).toEqual([]);

    const before = clockSec(g().state);
    frames(Math.round(30_000 / FRAME_MS));
    const moved = clockSec(g().state) - before;
    expect(moved, `thirty seconds moved the repaired save's match clock ${moved.toFixed(3)}s`).toBeGreaterThan(30 - RESIDUE_SEC);
    expect(moved).toBeLessThanOrEqual(30 + RESIDUE_SEC);
    expect(g().awayPay, 'loading the doctored save popped an away total').toBeNull();
    measured(`doctored save: every level a whole number inside its track, minute ${s.minute}, streak ${s.streak}, goal chance ${goalChancePerMin(s).toFixed(4)}; 30s of frames moved the clock ${moved.toFixed(3)}s`);
  }, TEST_MS);

  it('8 a pagehide in the same instant as Sell up saves the sold ground', () => {
    const mid = JSON.parse(entry('midGame').current as string);
    const ready = { ...mid, lifetime: 0, savedAt: EPOCH };
    ready.lifetime = prestigeThreshold(ready);
    localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify(ready));
    render(<Probe />);
    frames(10);
    expect(canPrestige(g().state), 'the fixture cannot sell up, so this proves nothing').toBe(true);
    const repBefore = g().state.rep;
    act(() => {
      g().doPrestige();
      window.dispatchEvent(new Event('pagehide'));
    });
    const saved = JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY) as string);
    expect(saved.rep, `Sell up took the club to ${repBefore + 1} stars but the page going away saved ${saved.rep}`).toBe(repBefore + 1);
    expect(saved.lifetime, 'the save written as the page went away still holds the old ground').toBeLessThan(ready.lifetime);
    measured(`sell up then pagehide in one task: the save holds ${saved.rep} stars and a fresh ground (lifetime ${Math.round(saved.lifetime)})`);
  }, TEST_MS);

  it('9 a tap in the same frame as a match tick keeps both', () => {
    localStorage.setItem(TYCOON_SAVE_KEY, entry('midGame').current as string);
    render(<Probe />);
    frames(40);
    /* Walk up to the frame that ticks, without delivering it. */
    let guard = 0;
    const clockAt = () => clockSec(g().state);
    let c0 = clockAt();
    while (guard < 20) {
      act(() => { frame(); });
      const c = clockAt();
      if (c !== c0) { c0 = c; break; }
      guard += 1;
    }
    /* The loop ticks once 0.2s has banked: twelve 16ms frames bank 0.192s, so
       the thirteenth is the frame that ticks. */
    frames(12);
    const before = g().state;
    act(() => {
      frame();
      g().doTap(50, 50);
    });
    const after = g().state;
    const ticked = clockSec(after) - clockSec(before);
    expect(guard, 'never found a ticking frame to start from').toBeLessThan(20);
    expect(after.totalTaps, 'the tap was lost').toBe(before.totalTaps + 1);
    expect(ticked, `the tap landed in the frame that ticked and the tick's ${RESIDUE_SEC}s of match clock was erased (moved ${ticked.toFixed(3)}s)`).toBeGreaterThan(0.19);
    measured(`same frame: the tap counted and the tick moved the clock ${ticked.toFixed(3)}s`);
  }, TEST_MS);
});
