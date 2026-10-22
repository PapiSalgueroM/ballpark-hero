/* Round 1543 (closing check F3): milestones and badges that land together can
   be read.

   THE BUG. Every badge floater was drawn at (22, 36) and every milestone at
   (18, 30), and the badge line held one badge. Round 1543 lowered the goal and
   win rungs, so an old save past several of them gains them all on its first
   tick: the review's walk saw two badges 100 percent on top of each other and
   a milestone over both for 1.9 s, and a badge line naming only the last.

   WHAT THIS HOLDS, over the real hook and lib with a hand driven frame:
   1 every milestone and badge of that tick is a floater at once (so nothing
     the engine paid goes unannounced), and no two of them that are showing at
     the same moment sit closer than a floater is tall on a phone pitch.
   2 the badge line names every badge of that tick, one at a time, in order,
     and then clears.

   THE CONTROL is the hook from before the fix: on the runner, put
   03f56b56d's src/hooks/useStadiumTycoon.ts back and both tests go red (the
   round's request r1543-f2a, line ctl-hook). */
import './dailyReload/mocks';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { TickEvent } from '@/lib/stadiumTycoon';

const recorded = vi.hoisted(() => ({ ticks: [] as TickEvent[][] }));
vi.mock('@/lib/stadiumTycoon', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/stadiumTycoon')>();
  return {
    ...real,
    tick: (...args: Parameters<typeof real.tick>) => {
      const r = real.tick(...args);
      recorded.ticks.push(r.events);
      return r;
    },
  };
});

import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { TYCOON_SAVE_KEY, ACHIEVEMENTS, MILESTONES, newTycoon, serializeTycoon } from '@/lib/stadiumTycoon';

const EPOCH = 1767225600000;
/** A floater line is text-lg, 28 px, on a 176 px phone pitch: 15.9 percent. */
const FLOATER_TALL_PCT = 28 / 176 * 100;
/** The floater's life on the pitch: the page's 1.8 s rise, cleared at 1.9 s. */
const LIFE_MS = 1900;
/** The rungs that read wins and goals, as Round 1543's harness names them. */
const LADDER = new Set(['win1', 'win10', 'win50', 'goals25', 'streak5', 'aw1', 'aw10', 'aw50', 'aw150', 'aw400', 'ag25', 'ag100', 'ag500', 'ag2000', 'as5', 'as10']);

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
function frames(n: number) {
  for (let i = 0; i < n; i += 1) {
    const cb = frameCb;
    if (!cb) return;
    frameCb = null;
    vnow += 16;
    act(() => { cb(vnow); });
  }
}

/* An old save at 49 wins and 140 goals that holds every badge and milestone it
   hits except five ladder rungs, so its first tick owes all five at once. */
function oldSave() {
  const s0 = { ...newTycoon(EPOCH), totalWins: 49, totalGoals: 140, totalMatches: 80, streak: 0, lifetime: 2e6, money: 50000, savedAt: EPOCH };
  const keepAch = ACHIEVEMENTS.filter(a => !LADDER.has(a.id) && a.hit(s0 as never)).map(a => a.id);
  const keepMs = MILESTONES.filter(m => !LADDER.has(m.id) && m.hit(s0 as never)).map(m => m.id);
  return { ...s0, ach: [...keepAch, 'aw1', 'aw10', 'ag25', 'ag100'], claimed: [...keepMs, 'win1'] };
}

function firstTick() {
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(oldSave() as never, EPOCH));
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  render(<Probe />);
  for (let i = 0; i < 40 && !recorded.ticks.some(t => t.some(e => e.kind === 'milestone' || e.kind === 'ach')); i += 1) frames(1);
  const tick = recorded.ticks.find(t => t.some(e => e.kind === 'milestone' || e.kind === 'ach')) ?? [];
  return { milestones: tick.filter(e => e.kind === 'milestone'), badges: tick.filter(e => e.kind === 'ach') };
}

beforeEach(() => {
  vnow = 0;
  frameCb = null;
  latest = null;
  recorded.ticks = [];
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameCb = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frameCb = null; });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stadium Tycoon: badges and milestones that land together', () => {
  it('1 every milestone and badge of one tick is a floater at once, and no two showing together share a spot', () => {
    const { milestones, badges } = firstTick();
    const owed = [...milestones, ...badges];
    expect(owed.length, `the planted save gained ${owed.length} rungs on its first tick, so nothing was stacked`).toBeGreaterThanOrEqual(4);
    const fl = g().floaters;
    const placed = [
      ...milestones.map(e => fl.find(f => f.text.startsWith(`🏁 ${e.label} +`))),
      ...badges.map(e => fl.find(f => f.text.startsWith(`${e.label}: +`) && f.text.endsWith('forever'))),
    ];
    const missing = owed.filter((_, i) => !placed[i]).map(e => e.label);
    expect(missing, `no floater for ${missing.join(', ')}`).toEqual([]);
    const shown = placed.filter((f): f is NonNullable<typeof f> => Boolean(f));
    const clashes: string[] = [];
    for (let i = 0; i < shown.length; i += 1) {
      for (let j = i + 1; j < shown.length; j += 1) {
        const a = shown[i];
        const b = shown[j];
        const da = a.delay ?? 0;
        const db = b.delay ?? 0;
        const together = da < db + LIFE_MS && db < da + LIFE_MS;
        if (together && Math.abs(a.y - b.y) < FLOATER_TALL_PCT) clashes.push(`"${a.text}" at y ${a.y} from ${da} ms and "${b.text}" at y ${b.y} from ${db} ms`);
      }
    }
    expect(clashes, `two floaters share a spot: ${clashes.join('; ')}`).toEqual([]);
    console.log(`TURNS| ${milestones.length} milestones and ${badges.length} badges in one tick: ${shown.map(f => `y ${f.y} at ${f.delay ?? 0} ms`).join(', ')}`);
  });

  it('2 the badge line names every badge of that tick, one at a time, in order, then clears', () => {
    const { badges } = firstTick();
    expect(badges.length, `the planted save gained ${badges.length} badges on its first tick, so the line had nothing to queue`).toBeGreaterThanOrEqual(2);
    const said: string[] = [];
    for (let i = 0; i < badges.length + 2 && g().badge; i += 1) {
      said.push(g().badge!.label);
      act(() => { g().dismissBadge(); });
    }
    expect(said, 'the badge line did not name each badge of the tick in turn').toEqual(badges.map(e => e.label));
    expect(g().badge, 'the badge line stayed after its last badge').toBeNull();
    console.log(`TURNS| the badge line said ${said.join(', then ')}`);
  });
});
