import { installArcadePointers } from './arcadePointerFixture';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { buildRun, daySeed, lehmer, takeShot, type HoopResult, type Release } from '@/lib/buzzerBeater';
import { buildThreePointContest, contestPoints } from '@/lib/threePointContest';
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
const DEFAULT_RELEASE: Release = { x: 0, arc: 0.6, power: 0.4 };
let realShot: typeof takeShot;
let pointerFixture: ReturnType<typeof installArcadePointers>;
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

beforeEach(async () => {
  const engine = await vi.importActual<typeof import('@/lib/buzzerBeater')>('@/lib/buzzerBeater');
  const records = await vi.importActual<typeof import('@/lib/arcadeRecord')>('@/lib/arcadeRecord');
  realShot = engine.takeShot;
  vi.mocked(takeShot).mockImplementation(realShot);
  vi.mocked(writeArcadeRun).mockImplementation(records.writeArcadeRun);
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-03T17:00:00Z'));
  consumeRestoredFinish('buzzer-beater');
  localStorage.clear();
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(RANDOM);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  pointerFixture = installArcadePointers();
});
afterEach(() => { cleanup(); pointerFixture.restore(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

type View = ReturnType<typeof render>;
function advance(milliseconds: number) {
  act(() => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
    const pending = [...frames.values()]; frames.clear();
    for (const frame of pending) frame(now);
  });
}
function reducedMotion(reduced = true) {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: reduced && query.includes('prefers-reduced-motion'), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
}
const button = (name: string) => screen.getByRole('button', { name, exact: true });
const board = (view: View) => view.container.querySelector('[data-arcade-phase]')!;
const power = () => screen.getByRole('slider', { name: 'Power', exact: true });
const arc = () => screen.getByRole('slider', { name: 'How high to put the arc on the shot' });
const fade = () => screen.getByRole('slider', { name: 'How far to fade off the closeout' });
function setRelease(release: Release) {
  fireEvent.change(power(), { target: { value: release.power } });
  fireEvent.change(arc(), { target: { value: release.arc } });
  fireEvent.change(fade(), { target: { value: release.x } });
}
function expectRelease(release: Release) {
  expect(power()).toHaveValue(String(release.power));
  expect(arc()).toHaveValue(String(release.arc));
  expect(fade()).toHaveValue(String(release.x));
}
function startLab() {
  const view = render(<BuzzerBeaterBoard />);
  expect(screen.getByText(/Same setup, unlimited retries\. Try Power 35, Arc 60 and Fade square/)).toBeVisible();
  fireEvent.click(button('Shot lab'));
  expect(board(view)).toHaveAttribute('data-arcade-mode', 'lab');
  expect(power()).toHaveFocus();
  return view;
}
function expectedShot(release: Release, index = 0) {
  return realShot(release, buildRun(SEED)[index], lehmer((SEED ^ 0x5eed1234) + index * 7919));
}
function actualShot() { return vi.mocked(takeShot).mock.results.at(-1)!.value as HoopResult; }
function shoot() { fireEvent.click(button('Shoot')); return actualShot(); }
function settle(view: View) {
  if (board(view).getAttribute('data-arcade-phase') === 'flying') advance(780);
  expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
}
function retry() { fireEvent.click(button('Retry this shot')); }
function labCard(view: View, which: 'previous' | 'current') {
  const card = view.container.querySelector(`[data-lab-shot="${which}"]`);
  expect(card, `actual ${which} release card exists`).not.toBeNull();
  return card!;
}
function expectDrawnShot(view: View, which: 'previous' | 'current', release: Release, result: HoopResult, attempt: number) {
  const card = labCard(view, which);
  expect(card).toHaveTextContent(`${which === 'previous' ? 'Previous shot' : 'Latest shot'} · ${attempt}`);
  const metric = (label: string) => within(card as HTMLElement).getByText(label, { selector: 'dt' }).nextElementSibling;
  expect(metric('Power')).toHaveTextContent(String(Math.round(release.power * 100)));
  expect(metric('Arc setting')).toHaveTextContent(String(Math.round(release.arc * 100)));
  expect(metric('Fade')).toHaveTextContent(`${Math.round(Math.abs(release.x) * 100)} ${release.x < 0 ? 'left' : release.x > 0 ? 'right' : 'square'}`);
  const path = view.container.querySelector(`[data-lab-path="${which}"]`);
  expect(path).toHaveAttribute('d', result.path.map((p, i) => `${i ? 'L' : 'M'} ${26 + p.x * (314 / 9.6)} ${190 - p.y * 40}`).join(' '));
  const landing = view.container.querySelector(`[data-lab-landing="${which}"]`);
  if (result.blocked || result.entryDeg <= 0) {
    expect(card).toHaveTextContent(result.blocked ? 'Stopped at the defender. No rim crossing.' : 'Never reached rim height.');
    expect(card.querySelector('[data-lab-rim]')).toBeNull();
    expect(landing).toBeNull();
  } else {
    expect(metric('Rim entry')).toHaveTextContent(`${Math.round(result.entryDeg)}°`);
    expect(card.querySelector('[data-lab-rim]')).toHaveTextContent(`${Math.round(Math.abs(result.depth) * 100)} cm ${result.depth < 0 ? 'short' : 'long'}`);
    expect(card.querySelector('[data-lab-rim]')).toHaveTextContent(`${Math.round(Math.abs(result.lateral) * 100)} cm ${result.lateral < 0 ? 'left' : 'right'}`);
    expect(Number(landing?.getAttribute('cx'))).toBeCloseTo(306 + Math.max(-0.34, Math.min(0.34, result.lateral)) * 78, 9);
    expect(Number(landing?.getAttribute('cy'))).toBeCloseTo(46 - Math.max(-0.34, Math.min(0.34, result.depth)) * 78, 9);
  }
}
function dailyRecord() {
  const date = getTodayET();
  return { date, key: `buzzer-beater-daily-${date}`, bytes: JSON.stringify({ v: 1, date, score: 874, made: 4 }) };
}
function finishMode(view: View, mode: 'daily' | 'unlimited' | 'practice' | 'contest') {
  const seed = mode === 'daily' ? daySeed(getTodayET()) : SEED;
  const setups = mode === 'contest' ? buildThreePointContest() : buildRun(seed);
  const rng = lehmer(seed ^ 0x5eed1234);
  let score = 0, made = 0;
  for (let index = 0; index < setups.length; index++) {
    const expected = realShot(DEFAULT_RELEASE, setups[index], rng);
    if (mode === 'practice') shoot();
    else { const hold = button('Hold to shoot'); fireEvent.pointerDown(hold); fireEvent.pointerUp(hold); }
    expect(actualShot(), `${mode} shot ${index + 1} retains the original engine outcome`).toEqual(expected);
    settle(view);
    score += mode === 'contest' ? contestPoints(index, expected.made) : expected.points;
    made += Number(expected.made);
    fireEvent.click(button(index === setups.length - 1 ? 'See the run' : 'Next shot'));
  }
  expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
  return { score, made };
}

describe('Buzzer Beater Shot lab', () => {
  it('retries the same setup with retained controls and the identical actual trajectory', () => {
    const view = startLab();
    const release = { x: 0.28, arc: 0.72, power: 0.31 };
    const expected = expectedShot(release);
    setRelease(release);
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(shoot()).toEqual(expected);
      settle(view);
      expect(button('Retry this shot')).toHaveFocus();
      expect(view.container.querySelector('[data-lab-setup]')).toHaveAttribute('data-lab-setup', '1');
      expect(view.container.querySelector('[data-lab-attempt]')).toHaveAttribute('data-lab-attempt', String(attempt));
      retry(); expectRelease(release); expect(power()).toHaveFocus();
    }
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled();
  });

  it('turns a measured miss into a make through actual release adjustments', () => {
    const view = startLab();
    const poor = { x: 0.8, arc: 0.2, power: 0.95 };
    const baseline = expectedShot(poor);
    expect(baseline.made).toBe(false);
    let improved: Release | undefined;
    for (const aim of [0, -0.04, 0.04, -0.08, 0.08]) {
      for (let step = 1; step < 100 && !improved; step++) {
        const candidate = { x: aim, arc: 0.6, power: step / 100 };
        if (expectedShot(candidate).made) improved = candidate;
      }
      if (improved) break;
    }
    expect(improved, 'the fixed free-throw setup has a reachable make on the real slider grid').toBeDefined();
    const expected = expectedShot(improved!);
    setRelease(poor); expect(shoot()).toEqual(baseline); settle(view); retry();
    setRelease(improved!); const actual = shoot(); settle(view);
    expect(actual).toEqual(expected);
    expect(actual.made).toBe(true); expect(actual.points).toBeGreaterThan(baseline.points);
    expect(Math.abs(actual.depth)).toBeLessThan(Math.abs(baseline.depth));
    expect(Math.abs(actual.lateral)).toBeLessThan(Math.abs(baseline.lateral));
    expect(actual.path).not.toEqual(baseline.path);
    expect(within(labCard(view, 'current') as HTMLElement).getByText('Made', { exact: true })).toBeVisible();
    expect(view.container.querySelector('[data-lab-result]')).toHaveTextContent(expected.verdict);
  });

  it('compares only the latest two settled actual releases and their rendered paths', () => {
    const view = startLab();
    const releases = [{ x: 0.08, arc: 0.6, power: 0.25 }, { x: -0.12, arc: 0.72, power: 0.4 }, { x: 0.16, arc: 0.82, power: 0.2 }];
    const results = releases.map(release => expectedShot(release));
    for (let index = 0; index < releases.length; index++) {
      setRelease(releases[index]); expect(shoot()).toEqual(results[index]);
      expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(Math.min(index, 2));
      if (index) expectDrawnShot(view, 'current', releases[index - 1], results[index - 1], index);
      settle(view);
      expectDrawnShot(view, 'current', releases[index], results[index], index + 1);
      if (index) expectDrawnShot(view, 'previous', releases[index - 1], results[index - 1], index);
      expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(Math.min(index + 1, 2));
      if (index < releases.length - 1) retry();
    }
    const previous = view.container.querySelector('[data-lab-path="previous"]');
    const latest = view.container.querySelector('[data-lab-path="current"]');
    expect(previous).toHaveAttribute('stroke-dasharray', '5 4');
    expect(latest).not.toHaveAttribute('stroke-dasharray');
    expect(previous?.getAttribute('d')).not.toBe(latest?.getAttribute('d'));
    expect(view.container.querySelector('[data-lab-legend]')).toHaveTextContent('Previous: amber dashed');
    expect(view.container.querySelector('[data-lab-legend]')).toHaveTextContent('Latest: cyan solid');
  });

  it('shows stopped shots honestly without imaginary rim metrics or landing markers', () => {
    reducedMotion();
    const view = startLab();
    const low = { x: 0, arc: 0, power: 0 }, lowResult = expectedShot(low);
    expect(lowResult.blocked).toBe(false); expect(lowResult.entryDeg).toBe(0);
    setRelease(low); expect(shoot()).toEqual(lowResult); settle(view);
    expectDrawnShot(view, 'current', low, lowResult, 1);
    let blocked: { index: number; release: Release; result: HoopResult } | undefined;
    for (let index = 1; index < 10 && !blocked; index++) {
      for (const x of [-1, 0, 1]) {
        const release = { x, arc: 0, power: 0.8 }, result = expectedShot(release, index);
        if (result.blocked) { blocked = { index, release, result }; break; }
      }
    }
    expect(blocked, 'the fixed ladder contains an actually blocked flat release').toBeDefined();
    expect(blocked!.result.entryDeg).toBeGreaterThan(0);
    for (let index = 1; index <= blocked!.index; index++) {
      fireEvent.click(button('Change setup'));
      if (index < blocked!.index) { shoot(); settle(view); }
    }
    setRelease(blocked!.release); expect(shoot()).toEqual(blocked!.result); settle(view);
    expectDrawnShot(view, 'current', blocked!.release, blocked!.result, 1);
    expect(within(labCard(view, 'current') as HTMLElement).getByText('Blocked', { exact: true })).toBeVisible();
    expect(blocked!.result.path.at(-1)!.x).toBeCloseTo(buildRun(SEED)[blocked!.index].contestDist, 12);
  });

  it('changes setup without carrying previous comparison or attempt counts', () => {
    const view = startLab();
    const release = { x: -0.12, arc: 0.7, power: 0.29 };
    setRelease(release); shoot(); settle(view); retry(); shoot(); settle(view);
    expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(2);
    fireEvent.click(button('Change setup'));
    expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(0);
    expect(view.container.querySelectorAll('[data-lab-path], [data-lab-landing]')).toHaveLength(0);
    expect(view.container.querySelector('[data-lab-setup]')).toHaveAttribute('data-lab-setup', '2');
    expectRelease(release);
    expect(shoot()).toEqual(expectedShot(release, 1)); settle(view);
    expect(view.container.querySelector('[data-lab-attempt]')).toHaveAttribute('data-lab-attempt', '1');
    expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(1);
    for (let index = 2; index <= 10; index++) {
      fireEvent.click(button('Change setup'));
      expect(view.container.querySelector('[data-lab-setup]')).toHaveAttribute('data-lab-setup', String(index % 10 + 1));
      expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(0);
      expect(shoot()).toEqual(expectedShot(release, index % 10)); settle(view);
    }
  });

  it.each([false, true])('locks duplicate release before a render with reduced motion %s', reduced => {
    reducedMotion(reduced);
    const view = startLab();
    const shootButton = button('Shoot'), calls = vi.mocked(takeShot).mock.calls.length;
    act(() => { fireEvent.click(shootButton); fireEvent.click(shootButton); fireEvent.click(shootButton); });
    expect(vi.mocked(takeShot).mock.calls.length - calls).toBe(1);
    settle(view); advance(2000);
    expect(view.container.querySelector('[data-lab-attempt]')).toHaveAttribute('data-lab-attempt', '1');
    expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(1);
    retry(); shoot(); settle(view);
    expect(view.container.querySelector('[data-lab-attempt]')).toHaveAttribute('data-lab-attempt', '2');
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled();
  });

  it('holds the release and exact remaining flight while rules are open or play is paused', () => {
    const view = startLab();
    const release = { x: -0.08, arc: 0.68, power: 0.26 };
    setRelease(release);
    fireEvent.click(button('Shot lab rules'));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('dialog')).toHaveTextContent(/same|repeat/i);
    expect(board(view)).toHaveAttribute('data-arcade-paused', 'true');
    advance(5000); expectRelease(release); expect(power()).toBeDisabled();
    fireEvent.click(button("Let's Play!")); advance(1);
    expect(button('Shot lab rules')).toHaveFocus();
    expect(button('Shoot')).toBeDisabled();
    fireEvent.click(button('Resume'));
    expect(shoot()).toEqual(expectedShot(release)); advance(200);
    fireEvent.click(button('Shot lab rules')); advance(5000);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    expect(view.container.querySelector('[data-lab-shot]')).toBeNull();
    fireEvent.click(button("Let's Play!")); advance(1); fireEvent.click(button('Resume'));
    advance(579); expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    advance(1); expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
    expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(1);
    retry(); fireEvent.click(button('Pause')); advance(3000);
    expectRelease(release); expect(button('Shoot')).toBeDisabled();
    fireEvent.click(button('Resume')); expect(shoot()).toEqual(expectedShot(release)); settle(view);
    expect(view.container.querySelector('[data-lab-attempt]')).toHaveAttribute('data-lab-attempt', '2');
  });

  it.each([
    ['daily', "Today's ten"], ['unlimited', 'Unlimited'], ['practice', 'Steady practice'], ['contest', 'Three-point contest'],
  ] as const)('leaves the lab for %s without stale shots or record changes', (mode, label) => {
    const saved = dailyRecord(); localStorage.setItem(saved.key, saved.bytes);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = startLab();
    shoot(); settle(view); retry(); shoot(); advance(200);
    fireEvent.click(screen.getByText('Leave lab', { selector: 'summary' }));
    fireEvent.click(button(label));
    expect(board(view)).toHaveAttribute('data-arcade-mode', mode);
    expect(view.container.querySelector('[data-shot-lab], [data-lab-comparison], [data-lab-path]')).toBeNull();
    advance(2000);
    if (mode === 'daily') {
      expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
      expect(screen.getByText('4 of 10 made')).toBeVisible();
      expect(screen.getByText(/^874 points/)).toBeVisible();
    } else {
      expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
      const outcome = finishMode(view, mode);
      if (mode === 'unlimited') expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/buzzer-beater', outcome.score, null, outcome.made);
    }
    expect(recordCompletion).toHaveBeenCalledTimes(mode === 'unlimited' ? 1 : 0);
    expect(writeArcadeRun).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem(saved.key)).toBe(saved.bytes);
    fireEvent.click(button('Shot lab'));
    expectRelease(DEFAULT_RELEASE);
    expect(view.container.querySelectorAll('[data-lab-shot], [data-lab-path], [data-lab-landing]')).toHaveLength(0);
    expect(shoot()).toEqual(expectedShot(DEFAULT_RELEASE)); settle(view);
    expect(view.container.querySelector('[data-lab-attempt]')).toHaveAttribute('data-lab-attempt', '1');
    expect(localStorage.getItem(saved.key)).toBe(saved.bytes);
  }, 20000);

  it('keeps a newly earned daily byte identical across lab retries setup changes and return', () => {
    reducedMotion();
    const view = render(<BuzzerBeaterBoard />), saved = dailyRecord();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(button("Today's ten")); const daily = finishMode(view, 'daily');
    const bytes = localStorage.getItem(saved.key);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/buzzer-beater', daily.score, null, daily.made);
    fireEvent.click(button('Shot lab'));
    shoot(); settle(view); retry(); shoot(); settle(view);
    fireEvent.click(button('Change setup')); shoot(); settle(view);
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(writeArcadeRun).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls.filter(([key]) => key === saved.key)).toHaveLength(1);
    expect(localStorage.getItem(saved.key)).toBe(bytes);
    fireEvent.click(screen.getByText('Leave lab', { selector: 'summary' }));
    fireEvent.click(button("Today's ten"));
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
    expect(screen.getByText(`${daily.made} of 10 made`)).toBeVisible();
    expect(screen.getByText(new RegExp(`^${daily.score} points`))).toBeVisible();
    expect(localStorage.getItem(saved.key)).toBe(bytes);
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(writeArcadeRun).toHaveBeenCalledTimes(1);
  }, 20000);

  it('retains the original recorded daily and unlimited outcomes independently of the lab', () => {
    reducedMotion();
    const view = render(<BuzzerBeaterBoard />), saved = dailyRecord();
    fireEvent.click(button("Today's ten")); const daily = finishMode(view, 'daily');
    expect(writeArcadeRun).toHaveBeenCalledExactlyOnceWith('buzzer-beater', saved.date, 'made', { score: daily.score, count: daily.made });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/buzzer-beater', daily.score, null, daily.made);
    const bytes = localStorage.getItem(saved.key);
    expect(JSON.parse(bytes!)).toEqual({ v: 1, date: saved.date, score: daily.score, made: daily.made });
    fireEvent.click(button('Another ten')); const unlimited = finishMode(view, 'unlimited');
    expect(recordCompletion).toHaveBeenNthCalledWith(2, '/buzzer-beater', unlimited.score, null, unlimited.made);
    expect(recordCompletion).toHaveBeenCalledTimes(2); expect(writeArcadeRun).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(saved.key)).toBe(bytes); expect(screen.getByTestId('recorded-share')).toBeVisible();
  }, 20000);

  it('restores the original daily quietly without entering the lab', () => {
    const saved = dailyRecord(); localStorage.setItem(saved.key, saved.bytes);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<BuzzerBeaterBoard />); advance(2000);
    expect(board(view)).toHaveAttribute('data-arcade-mode', 'daily');
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
    expect(screen.getByText('4 of 10 made')).toBeVisible(); expect(screen.getByText(/^874 points/)).toBeVisible();
    expect(localStorage.getItem(saved.key)).toBe(saved.bytes);
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(screen.getByTestId('recorded-share')).toBeVisible();
  });
});
