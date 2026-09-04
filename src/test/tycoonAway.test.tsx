/* Round 439: Stadium Tycoon pays for the time you were away, whether the tab
   was closed or only sitting behind another window.

   THE BUG. The away settle ran once, in a mount effect. requestAnimationFrame
   stops dead in a hidden tab, so a player who left /stadium-tycoon open in a
   background window and came back hours later got exactly one frame with dt
   clamped to two seconds, and the old visibilitychange handler then wrote the
   save with savedAt = now, so a later reload could not pay for those hours
   either. Hours away, two seconds paid, the rest gone.

   HOW THIS DRIVES IT. The real hook, the real lib, jsdom's real localStorage,
   and a hand-driven requestAnimationFrame delivering 16ms frames, which is the
   cadence a browser really hands the loop. Round 424's lesson applies here too:
   the Stadium Tycoon clock bug only existed at the real tick rate, and every
   check that drove tick() with a big dt sailed past it. A hidden tab is modelled
   the way a browser really does it: visibilitychange fires, and then NO frames
   arrive until the tab comes back.

   THE ORACLE is the game's own promise, in the rules modal:
     "Away from the game, you earn at half speed for up to 8 hours (the Away Day
      Deal perk raises both, up to 80% for 12 hours)."
   So every assertion converts the money paid back into SECONDS of away time at
   the state's own stated rate, and compares those seconds against the wall clock
   the tab was gone for, capped at the stated cap. The margin is half a second:
   the loop credits play time in 0.2s ticks, so the settle is structurally at
   most one tick out, and the drift these runs actually report is 0.000s.

   The wrapper is scripts/simTycoonAway.mjs; run that, not this file alone.
*/
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import {
  incomePerSec, offlineRateOf, offlineCapHoursOf, serializeTycoon, TYCOON_SAVE_KEY,
} from '@/lib/stadiumTycoon';
import type { TycoonState } from '@/lib/stadiumTycoon';

/** A browser hands the loop a frame about every 16ms. */
const FRAME_MS = 16;
/** Long enough for the match clock to run and the fanbase to move. */
const WARMUP_SEC = 30;
/* The loop credits play time in whole ticks and the accumulator fires at 0.2s,
   so the un-credited residue at the moment the tab hides is structurally under
   0.208s and the settle cannot be further out than that. Measured over these
   runs the drift comes back at 0.000s (the printed AWAY| lines carry it), so
   0.5s is a little over twice the hard bound and nowhere near the distribution. */
const MARGIN_SEC = 0.5;
/** A fixed wall clock so a run is reproducible. */
const EPOCH = 1767225600000;

let vnow = 0;
let frameCb: FrameRequestCallback | null = null;
let latest: ReturnType<typeof useStadiumTycoon> | null = null;

function Probe() {
  latest = useStadiumTycoon();
  return null;
}

function g() {
  if (!latest) throw new Error('the Stadium Tycoon hook is not mounted');
  return latest;
}

function mount() {
  return render(<Probe />);
}

/** Deliver `count` real frames, one act() each, the way a browser does. */
function frames(count: number) {
  for (let i = 0; i < count; i += 1) {
    const cb = frameCb;
    if (!cb) break;
    frameCb = null;
    vnow += FRAME_MS;
    act(() => { cb(vnow); });
  }
}

function warmUp() {
  frames(Math.round((WARMUP_SEC * 1000) / FRAME_MS));
}

function setVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (visible ? 'visible' : 'hidden'),
  });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}

/** Background the tab, let `hours` of wall clock pass with NO frames, come back. */
function backgroundFor(hours: number) {
  setVisible(false);
  vnow += hours * 3600 * 1000;
  setVisible(true);
}

/** Money paid, read back as seconds of away time at the state's stated rate. */
function awaySeconds(money: number, at: TycoonState) {
  const idle = incomePerSec({ ...at, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null });
  return money / (idle * offlineRateOf(at));
}

/** Measurements the wrapper reprints, so the margins can be read off a run. */
function measured(line: string) {
  console.log(`AWAY| ${line}`);
}

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => {
  vnow = 0;
  frameCb = null;
  latest = null;
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20260904));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameCb = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frameCb = null; });
  setVisible(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stadium Tycoon away earnings', () => {
  it('1 the loop really runs at the frame cadence a browser gives it', () => {
    mount();
    const start = g().state;
    const idle = incomePerSec(start);
    const t0 = Date.now();
    warmUp();
    const played = g().state;
    const seconds = (Date.now() - t0) / 1000;
    const earned = played.money - start.money;
    const minutes = played.minute + (played.matchNo ?? 0) * 90;
    expect(seconds, 'the rig did not advance the wall clock by the warm up it claims').toBeCloseTo(WARMUP_SEC, 0);
    expect(minutes, `${WARMUP_SEC}s of frames advanced the match clock only ${minutes} minutes, so this rig is not driving the real loop`).toBeGreaterThan(10);
    expect(earned, `${WARMUP_SEC}s of play earned ${earned.toFixed(0)}, under the ${(idle * WARMUP_SEC).toFixed(0)} the header rate alone promises`).toBeGreaterThan(idle * WARMUP_SEC * 0.9);
    measured(`${WARMUP_SEC}s of 16ms frames drove ${minutes} match minutes and earned ${earned.toFixed(1)} against a header rate of ${idle.toFixed(3)}/s`);
  });

  it('2 a closed tab reopened hours later settles on the load path', () => {
    const view = mount();
    warmUp();
    const closed = g().state;
    view.unmount();
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(closed, Date.now()));
    vnow += 3 * 3600 * 1000;

    mount();
    const pay = g().awayPay;
    expect(pay, 'reopening a save that is three hours old paid nothing at all').not.toBeNull();
    const secs = awaySeconds(pay as number, closed);
    expect(secs, `the load path paid ${secs.toFixed(1)}s of away time for a three hour gap`).toBeGreaterThan(3 * 3600 - MARGIN_SEC);
    expect(secs, `the load path paid ${secs.toFixed(1)}s of away time for a three hour gap`).toBeLessThan(3 * 3600 + MARGIN_SEC);
    measured(`load path, 3h closed: paid ${secs.toFixed(3)}s of away time, ${(secs - 3 * 3600).toFixed(3)}s off the wall clock, margin ${MARGIN_SEC}s`);
  });

  it('3 a backgrounded tab settles the hours when it comes back', () => {
    mount();
    warmUp();
    const hidden = g().state;
    const bank = hidden.money;
    backgroundFor(3);

    const settled = g().state.money - bank;
    frames(1);
    const withReturnFrame = g().state.money - bank;
    const promised = 3 * 3600;
    const detail = `three hours behind another window: the away total reads ${g().awayPay === null ? 'nothing' : String(Math.round(g().awayPay as number))} and the bank moved ${withReturnFrame.toFixed(0)}, which is ${awaySeconds(withReturnFrame, hidden).toFixed(1)}s of away pay where the rules promise ${promised}s`;
    expect(g().awayPay, detail).not.toBeNull();
    const secs = awaySeconds(settled, hidden);
    expect(secs, detail).toBeGreaterThan(promised - MARGIN_SEC);
    expect(secs, detail).toBeLessThan(promised + MARGIN_SEC);
    expect(settled, 'the "While you were away" total and the money actually banked disagree').toBeCloseTo(g().awayPay as number, 6);
    measured(`visibility path, 3h hidden: paid ${secs.toFixed(3)}s of away time, ${(secs - promised).toFixed(3)}s off the wall clock, margin ${MARGIN_SEC}s`);
    measured(`visibility path, 3h hidden: the return frame alone would have paid ${(withReturnFrame - settled).toFixed(1)}, worth ${awaySeconds(withReturnFrame - settled, hidden).toFixed(1)}s of away time`);
  });

  it('4 the stated cap applies to a backgrounded tab exactly as to a closed one', () => {
    const view = mount();
    warmUp();
    const save = g().state;
    const capSec = offlineCapHoursOf(save) * 3600;

    backgroundFor(20);
    const background = g().awayPay;
    expect(background, 'twenty hours behind another window paid nothing at all').not.toBeNull();
    const secs = awaySeconds(background as number, save);
    expect(secs, `twenty hours hidden paid ${(secs / 3600).toFixed(2)}h of away time against a stated ${capSec / 3600}h cap`).toBeGreaterThan(capSec - MARGIN_SEC);
    expect(secs, `twenty hours hidden paid ${(secs / 3600).toFixed(2)}h of away time against a stated ${capSec / 3600}h cap`).toBeLessThan(capSec + MARGIN_SEC);

    view.unmount();
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(save, Date.now()));
    vnow += 20 * 3600 * 1000;
    mount();
    const reopened = g().awayPay;
    expect(reopened, 'reopening the same save after the same twenty hours paid nothing').not.toBeNull();
    expect(background, 'the same save and the same twenty hours pay differently depending on whether the tab was closed or only hidden').toBe(reopened);
    measured(`cap: 20h hidden paid ${(secs / 3600).toFixed(4)}h against the stated ${capSec / 3600}h cap; hidden ${background} and closed ${reopened} are the same number`);
  });

  it('5 time spent playing is never billed back as time away', () => {
    mount();
    warmUp();
    backgroundFor(3);
    const paidOnce = g().awayPay;
    expect(paidOnce, 'nothing settled, so this test cannot say whether it settles twice').not.toBeNull();

    /* Two warm ups, so the live play on the clock is well past the lib's 30
       second "a tab refresh is not a trip away" floor. A settle that measured
       from the save rather than from the seconds the loop has already paid for
       would bill all of it back at the away rate right here. */
    warmUp();
    warmUp();
    const bank = g().state.money;
    setVisible(false);
    setVisible(true);
    expect(g().state.money, `bouncing the tab after ${WARMUP_SEC}s of live play paid another ${(g().state.money - bank).toFixed(0)} of away money`).toBe(bank);
    expect(g().awayPay, 'a bounce with no time away popped a fresh away total').toBe(paidOnce);
    measured(`no double bill: ${WARMUP_SEC * 2}s of live play then a tab bounce paid 0 more on top of the ${paidOnce} already settled`);
  });

  it('6 a quick alt tab is not a trip away', () => {
    mount();
    warmUp();
    const bank = g().state.money;
    setVisible(false);
    vnow += 20 * 1000;
    setVisible(true);
    expect(g().awayPay, 'twenty seconds behind another window popped the away modal').toBeNull();
    expect(g().state.money, 'twenty seconds behind another window paid away money').toBe(bank);
    measured('floor: 20s behind another window paid nothing, which is the lib rule that a tab refresh is not a trip away');
  });
});
