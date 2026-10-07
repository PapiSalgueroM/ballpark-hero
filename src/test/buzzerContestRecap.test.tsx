import { installArcadePointers } from './arcadePointerFixture';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { buildRun, daySeed, lehmer, takeShot, type HoopResult, type Release } from '@/lib/buzzerBeater';
import { buildThreePointContest } from '@/lib/threePointContest';
import { writeArcadeRun } from '@/lib/arcadeRecord';
import { recordCompletion } from '@/lib/completions';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

vi.mock('@/lib/buzzerBeater', async original => {
  const actual = await original<typeof import('@/lib/buzzerBeater')>();
  return { ...actual, takeShot: vi.fn(actual.takeShot) };
});
vi.mock('@/lib/arcadeRecord', async original => {
  const actual = await original<typeof import('@/lib/arcadeRecord')>();
  return { ...actual, writeArcadeRun: vi.fn(actual.writeArcadeRun) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => <div data-testid="recorded-share">Share recorded run</div> }));

const RANDOM = 0.125;
const SEED = Math.floor(RANDOM * 2147483645) + 1;
const DEFAULT: Release = { x: 0, arc: 0.6, power: 0.4 };
let realShot: typeof takeShot;
let pointers: ReturnType<typeof installArcadePointers>;
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();
type View = ReturnType<typeof render>;
type PlannedShot = { release: Release; ticks: number; result: HoopResult };
let planned: PlannedShot[] | undefined;

beforeEach(async () => {
  const engine = await vi.importActual<typeof import('@/lib/buzzerBeater')>('@/lib/buzzerBeater');
  const records = await vi.importActual<typeof import('@/lib/arcadeRecord')>('@/lib/arcadeRecord');
  realShot = engine.takeShot;
  vi.mocked(takeShot).mockImplementation(realShot);
  vi.mocked(writeArcadeRun).mockImplementation(records.writeArcadeRun);
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-07T17:00:00Z'));
  consumeRestoredFinish('buzzer-beater'); localStorage.clear();
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(RANDOM);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  pointers = installArcadePointers();
});
afterEach(() => { cleanup(); pointers.restore(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function advance(ms: number) {
  act(() => {
    now += ms; vi.advanceTimersByTime(ms);
    const pending = [...frames.values()]; frames.clear();
    for (const frame of pending) frame(now);
  });
}
function reducedMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
}
const button = (name: string) => screen.getByRole('button', { name, exact: true });
const board = (view: View) => view.container.querySelector('[data-arcade-phase]')!;
const actualShot = () => vi.mocked(takeShot).mock.results.at(-1)!.value as HoopResult;
const strip = (view: View, recap = false) => view.container.querySelector(`[data-contest-balls="${recap ? 'recap' : 'live'}"]`)!;
const markers = (view: View, recap = false) => [...strip(view, recap).querySelectorAll('[data-contest-ball-marker]')];
const rackButtons = (view: View) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-contest-rack-select]')];
function state(view: View, expected: string) { expect(board(view)).toHaveAttribute('data-arcade-phase', expected); }
function settle(view: View) { if (board(view).getAttribute('data-arcade-phase') === 'flying') advance(780); state(view, 'shotEnd'); }
function savedDaily() {
  const date = getTodayET();
  return { date, key: `buzzer-beater-daily-${date}`, bytes: JSON.stringify({ v: 1, date, score: 874, made: 4 }) };
}
function startContest() {
  const view = render(<BuzzerBeaterBoard />);
  fireEvent.click(button('Three-point contest'));
  expect(board(view)).toHaveAttribute('data-arcade-mode', 'contest');
  return view;
}
function contestPlan() {
  if (planned) return planned;
  const setups = buildThreePointContest(), plan: PlannedShot[] = [];
  const wanted = [true, false, true, false, true, false, true, false, false, false, true, true, false, true, false, false, false, true, false, true, true, false, false, true, false];
  for (let index = 0; index < 25; index++) {
    let found: PlannedShot | undefined;
    for (const arc of [0.6, 0.5, 0.7, 0.4, 0.8]) {
      for (let ticks = 0; ticks <= 22 && !found; ticks++) {
        let power = 0.4;
        for (let tick = 0; tick < ticks; tick++) power += 0.026;
        for (const x of wanted[index] ? [0, -0.04, 0.04, -0.08, 0.08] : [1]) {
          const rng = lehmer(SEED ^ 0x5eed1234);
          for (let previous = 0; previous < plan.length; previous++) realShot(plan[previous].release, setups[previous], rng);
          const release = { x, arc, power }, result = realShot(release, setups[index], rng);
          if (result.made === wanted[index]) { found = { release, ticks, result }; break; }
        }
      }
      if (found) break;
    }
    expect(found, `real charging and slider inputs reach the requested shot ${index + 1} outcome`).toBeDefined();
    plan.push(found!);
  }
  planned = plan;
  return plan;
}
function releaseContest(shot: PlannedShot) {
  fireEvent.change(screen.getByRole('slider', { name: 'How high to put the arc on the shot' }), { target: { value: shot.release.arc } });
  fireEvent.change(screen.getByRole('slider', { name: 'How far to fade off the closeout' }), { target: { value: shot.release.x } });
  const hold = button('Hold to shoot'); fireEvent.pointerDown(hold); advance(shot.ticks * 16); fireEvent.pointerUp(hold);
  expect(actualShot()).toEqual(shot.result);
}
function expectBall(marker: Element, ball: number, made: boolean) {
  expect(marker).toHaveAttribute('data-ball-status', made ? 'made' : 'missed');
  expect(marker).toHaveAccessibleName(`Ball ${ball + 1}, ${ball === 4 ? 'money ball, 2 points' : '1 point'}, ${made ? 'made' : 'missed'}`);
  expect(marker).toHaveTextContent(new RegExp(`^${made ? '✓' : '×'}${ball === 4 ? '2' : ''}$`));
}
function finishContest(view: View) {
  const plan = contestPlan();
  let score = 0;
  for (let index = 0; index < 25; index++) {
    releaseContest(plan[index]); settle(view);
    expectBall(markers(view)[index % 5], index % 5, plan[index].result.made);
    score += plan[index].result.made ? index % 5 === 4 ? 2 : 1 : 0;
    expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent(new RegExp(`^${score}$`));
    expect(view.container.querySelector('[data-arcade-feedback]')).toHaveTextContent(plan[index].result.verdict);
    fireEvent.click(button(index === 24 ? 'See the run' : 'Next shot'));
  }
  state(view, 'done');
  return { plan, score };
}
function finishTen(view: View, seed: number) {
  const setups = buildRun(seed), rng = lehmer(seed ^ 0x5eed1234);
  let score = 0, made = 0;
  for (let index = 0; index < 10; index++) {
    const expected = realShot(DEFAULT, setups[index], rng);
    const hold = button('Hold to shoot'); fireEvent.pointerDown(hold); fireEvent.pointerUp(hold);
    expect(actualShot()).toEqual(expected); settle(view);
    if (!expected.blocked && expected.entryDeg > 0) {
      expect(view.container.querySelector('[data-arcade-feedback]')).toHaveTextContent(`Came in at ${Math.round(expected.entryDeg)}°`);
      expect(Number(view.container.querySelector('[data-rim-landing]')?.getAttribute('cx'))).toBeCloseTo(306 + expected.lateral * 78, 9);
      if (expected.depthWindow > 0) expect(Number(view.container.querySelector('[data-rim-window]')?.getAttribute('ry'))).toBeCloseTo(expected.depthWindow * 78, 9);
    }
    score += expected.points; made += Number(expected.made);
    fireEvent.click(button(index === 9 ? 'See the run' : 'Next shot'));
  }
  state(view, 'done'); return { score, made };
}

describe('Buzzer contest recap', () => {
  it('records only landed outcomes through pause help and the exact remaining flight', () => {
    const view = startContest(), plan = contestPlan();
    expect(markers(view).map(marker => marker.getAttribute('data-ball-status'))).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    releaseContest(plan[0]); state(view, 'flying');
    expect(markers(view)[0]).toHaveAttribute('data-ball-status', 'in-flight');
    expect(markers(view)[0]).toHaveAccessibleName('Ball 1, 1 point, in flight');
    advance(200); fireEvent.click(button('Pause')); advance(5000);
    state(view, 'flying'); expect(markers(view)[0]).toHaveAttribute('data-ball-status', 'in-flight');
    expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent(/^0$/);
    fireEvent.click(button('Three-point contest rules'));
    expect(screen.getByRole('dialog')).toHaveTextContent('pick any rack');
    fireEvent.click(button("Let's Play!")); advance(1);
    fireEvent.click(button('Resume')); advance(579);
    state(view, 'flying'); expect(markers(view)[0]).toHaveAttribute('data-ball-status', 'in-flight');
    advance(1); state(view, 'shotEnd'); expectBall(markers(view)[0], 0, true);
    advance(2000); expect(markers(view)[1]).toHaveAttribute('data-ball-status', 'upcoming');
    fireEvent.click(button('Next shot')); releaseContest(plan[1]); settle(view);
    expectBall(markers(view)[0], 0, true); expectBall(markers(view)[1], 1, false);
    expect(markers(view)[2]).toHaveAttribute('data-ball-status', 'upcoming');
  });

  it('revisits every actual rack with distinct outcomes and exact money ball points', () => {
    const view = startContest(), { plan, score } = finishContest(view);
    const buttons = rackButtons(view); expect(buttons).toHaveLength(5);
    const points = [4, 1, 3, 3, 2];
    expect(score).toBe(13);
    expect(screen.getByText('13 points out of a possible 30. Unranked local contest. Nothing saved.')).toBeVisible();
    for (const rack of [0, 4, 2, 1, 3, 0]) {
      fireEvent.click(buttons[rack]);
      expect(strip(view, true)).toHaveAttribute('data-rack', String(rack + 1));
      expect(strip(view, true)).toHaveAccessibleName(`Rack ${rack + 1} shots`);
      for (let index = 0; index < 5; index++) {
        expect(buttons[index]).toHaveAccessibleName(`Rack ${index + 1}, ${points[index]} of 6 points`);
        expect(buttons[index]).toHaveAttribute('data-rack-points', String(points[index]));
        expect(buttons[index]).toHaveTextContent(`${points[index]}/6`);
        expect(buttons[index]).toHaveAttribute('aria-pressed', String(index === rack));
        expectBall(markers(view, true)[index], index, plan[rack * 5 + index].result.made);
      }
    }
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled();
  }, 30000);

  it('clears all earned balls and rack selection when another contest starts', () => {
    reducedMotion(); const view = startContest(); finishContest(view);
    fireEvent.click(rackButtons(view)[4]);
    fireEvent.click(button('Another contest')); state(view, 'aiming');
    expect(view.container.querySelector('[data-contest-scorecard]')).toBeNull();
    expect(markers(view).map(marker => marker.getAttribute('data-ball-status'))).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    advance(2000); expect(markers(view)[0]).toHaveAttribute('data-ball-status', 'current');
    finishContest(view);
    expect(rackButtons(view)[0]).toHaveAttribute('aria-pressed', 'true');
    expect(strip(view, true)).toHaveAttribute('data-rack', '1');
  }, 30000);

  it('keeps contest results local across restored daily exit and reentry', () => {
    reducedMotion(); const saved = savedDaily(); localStorage.setItem(saved.key, saved.bytes);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = startContest(); finishContest(view);
    expect(screen.queryByTestId('recorded-share')).toBeNull();
    fireEvent.click(button("Today's ten")); state(view, 'done');
    expect(board(view)).toHaveAttribute('data-arcade-mode', 'daily');
    expect(view.container.querySelector('[data-contest-scorecard], [data-contest-balls]')).toBeNull();
    expect(screen.getByText('4 of 10 made')).toBeVisible(); expect(screen.getByText(/^874 points/)).toBeVisible();
    fireEvent.click(button('Three-point contest'));
    expect(markers(view).map(marker => marker.getAttribute('data-ball-status'))).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(localStorage.getItem(saved.key)).toBe(saved.bytes);
    expect(writes).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
  }, 30000);

  it('settles reduced motion once and keeps missed money balls distinct from unused balls', () => {
    reducedMotion(); const view = startContest(), plan = contestPlan();
    for (let index = 0; index < 10; index++) {
      releaseContest(plan[index]); state(view, 'shotEnd');
      advance(2000);
      expectBall(markers(view)[index % 5], index % 5, plan[index].result.made);
      if (index % 5 < 4) expect(markers(view)[index % 5 + 1]).toHaveAttribute('data-ball-status', 'upcoming');
      if (index === 4) expectBall(markers(view)[4], 4, true);
      if (index === 9) expectBall(markers(view)[4], 4, false);
      fireEvent.click(button('Next shot'));
    }
    expect(markers(view).map(marker => marker.getAttribute('data-ball-status'))).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('does not invent a rim crossing for an actual blocked practice shot', () => {
    reducedMotion(); const setups = buildRun(SEED);
    let blocked: { index: number; release: Release; result: HoopResult } | undefined;
    for (let index = 0; index < 10 && !blocked; index++) {
      for (const arc of [0, 0.1, 0.2]) {
        for (const x of [-1, 0, 1]) {
          const rng = lehmer(SEED ^ 0x5eed1234);
          for (let previous = 0; previous < index; previous++) realShot(DEFAULT, setups[previous], rng);
          const release = { x, arc, power: 0.8 }, result = realShot(release, setups[index], rng);
          if (result.blocked && result.entryDeg > 0 && result.depthWindow > 0) { blocked = { index, release, result }; break; }
        }
        if (blocked) break;
      }
    }
    expect(blocked, 'actual blocked shot retains hypothetical entry and depth window, so the guard is exercised').toBeDefined();
    const view = render(<BuzzerBeaterBoard />); fireEvent.click(button('Steady practice'));
    for (let index = 0; index < blocked!.index; index++) { fireEvent.click(button('Shoot')); settle(view); fireEvent.click(button('Next shot')); }
    for (const [name, value] of [['Power', blocked!.release.power], ['How high to put the arc on the shot', blocked!.release.arc], ['How far to fade off the closeout', blocked!.release.x]] as const)
      fireEvent.change(screen.getByRole('slider', { name }), { target: { value } });
    fireEvent.click(button('Shoot')); expect(actualShot()).toEqual(blocked!.result); settle(view);
    expect(view.container.querySelector('[data-arcade-feedback]')).toHaveTextContent('Stopped at the defender. No rim crossing.');
    expect(view.container.querySelector('[data-arcade-feedback]')).not.toHaveTextContent('Came in at');
    expect(view.container.querySelector('[data-rim-landing], [data-rim-window]')).toBeNull();
    expect(actualShot().path.at(-1)!.x).toBeCloseTo(setups[blocked!.index].contestDist, 12);
  });

  it('does not invent a rim crossing for a shot that never reaches rim height', () => {
    reducedMotion(); const view = render(<BuzzerBeaterBoard />); fireEvent.click(button('Steady practice'));
    expect(view.container.querySelector('[data-rim-landing]')).not.toBeNull();
    fireEvent.change(screen.getByRole('slider', { name: 'Power' }), { target: { value: 0 } });
    fireEvent.change(screen.getByRole('slider', { name: 'How high to put the arc on the shot' }), { target: { value: 0 } });
    const expected = realShot({ x: 0, arc: 0, power: 0 }, buildRun(SEED)[0], lehmer(SEED ^ 0x5eed1234));
    expect(expected.blocked).toBe(false); expect(expected.entryDeg).toBe(0);
    fireEvent.click(button('Shoot')); expect(actualShot()).toEqual(expected); settle(view);
    expect(view.container.querySelector('[data-arcade-feedback]')).toHaveTextContent('Never reached rim height.');
    expect(view.container.querySelector('[data-arcade-feedback]')).not.toHaveTextContent('Came in at');
    expect(view.container.querySelector('[data-rim-landing], [data-rim-window]')).toBeNull();
  });

  it('preserves original recorded daily and unlimited engine outcomes independently', () => {
    reducedMotion(); const view = render(<BuzzerBeaterBoard />), saved = savedDaily();
    fireEvent.click(button("Today's ten")); const daily = finishTen(view, daySeed(saved.date));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/buzzer-beater', daily.score, null, daily.made);
    expect(writeArcadeRun).toHaveBeenCalledExactlyOnceWith('buzzer-beater', saved.date, 'made', { score: daily.score, count: daily.made });
    const bytes = localStorage.getItem(saved.key);
    expect(JSON.parse(bytes!)).toEqual({ v: 1, date: saved.date, score: daily.score, made: daily.made });
    fireEvent.click(button('Another ten')); const unlimited = finishTen(view, SEED);
    expect(recordCompletion).toHaveBeenNthCalledWith(2, '/buzzer-beater', unlimited.score, null, unlimited.made);
    expect(recordCompletion).toHaveBeenCalledTimes(2); expect(writeArcadeRun).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(saved.key)).toBe(bytes); expect(screen.getByTestId('recorded-share')).toBeVisible();
    expect(view.container.querySelector('[data-contest-scorecard], [data-contest-balls]')).toBeNull();
  }, 30000);
});
