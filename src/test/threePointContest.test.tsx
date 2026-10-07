import { installArcadePointers } from './arcadePointerFixture';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { buildRun, daySeed, launchDegFor, lehmer, requiredSpeed, takeShot, type HoopResult, type HoopSetup } from '@/lib/buzzerBeater';
import { BALLS_PER_RACK, buildThreePointContest, CONTEST_RACKS, CONTEST_SHOTS, contestPoints, contestShotValue, MAX_CONTEST_SCORE } from '@/lib/threePointContest';
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
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score, customText }: { score: string; customText: string }) => <div data-testid="recorded-share" data-score={score}>{customText}</div> }));

const random = 0.125;
const freeSeed = Math.floor(random * 2147483645) + 1;
let pointerFixture: ReturnType<typeof installArcadePointers>;
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();
let realShot: typeof takeShot;

beforeEach(async () => {
  const engine = await vi.importActual<typeof import('@/lib/buzzerBeater')>('@/lib/buzzerBeater');
  const records = await vi.importActual<typeof import('@/lib/arcadeRecord')>('@/lib/arcadeRecord');
  realShot = engine.takeShot;
  vi.mocked(takeShot).mockImplementation(realShot);
  vi.mocked(writeArcadeRun).mockImplementation(records.writeArcadeRun);
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-09-30T17:00:00Z'));
  vi.clearAllMocks();
  pointerFixture = installArcadePointers();
  consumeRestoredFinish('buzzer-beater');
  localStorage.clear();
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(random);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
});
afterEach(() => { cleanup(); pointerFixture.restore(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function advance(milliseconds: number) {
  act(() => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
    const pending = [...frames.values()]; frames.clear();
    for (const frame of pending) frame(now);
  });
}
function reducedMotion(reduced: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: reduced && query.includes('prefers-reduced-motion'), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
}
function button(label: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === label);
  expect(found, `actual ${label} button is present`).toBeDefined();
  return found!;
}
const board = (view: ReturnType<typeof render>) => view.container.querySelector('[data-arcade-phase]')!;
function actualShot() {
  const results = vi.mocked(takeShot).mock.results;
  return results[results.length - 1].value as HoopResult;
}
function settle(view: ReturnType<typeof render>) {
  if (board(view).getAttribute('data-arcade-phase') === 'flying') advance(780);
  expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
}
function finishTen(view: ReturnType<typeof render>, seed: number, practice = false) {
  const setups = buildRun(seed), rng = lehmer(seed ^ 0x5eed1234);
  let score = 0, made = 0;
  for (let index = 0; index < 10; index++) {
    const expected = realShot({ x: 0, arc: 0.6, power: 0.4 }, setups[index], rng);
    if (practice) fireEvent.click(button('Shoot'));
    else { const hold = button('Hold to shoot'); fireEvent.pointerDown(hold); fireEvent.pointerUp(hold); }
    expect(actualShot(), `original ten-shot engine result ${index + 1}`).toEqual(expected);
    settle(view);
    score += expected.points; made += Number(expected.made);
    fireEvent.click(button(index === 9 ? 'See the run' : 'Next shot'));
  }
  expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
  expect(screen.getByText(`${made} of 10 made`)).toBeVisible();
  return { score, made };
}
function contestTicks(setup: HoopSetup) {
  const power = (requiredSpeed(setup.distance, launchDegFor(0.6)) - 6.6) / 4.8;
  return Math.round((power - 0.4) / 0.026);
}
function chargedPower(ticks: number) {
  let power = 0.4;
  for (let tick = 0; tick < ticks; tick++) power += 0.026;
  return power;
}

describe('Buzzer Beater three-point contest', () => {
  it('uses five arcade racks and exact regular and money ball scoring', () => {
    expect([CONTEST_RACKS, BALLS_PER_RACK, CONTEST_SHOTS, MAX_CONTEST_SCORE]).toEqual([5, 5, 25, 30]);
    const setups = buildThreePointContest();
    expect(setups).toHaveLength(25);
    let points = 0;
    for (let index = 0; index < 25; index++) {
      const rack = Math.floor(index / 5), setup = setups[index];
      expect(setup).toEqual({ distance: [7.3, 7.6, 8, 7.6, 7.3][rack], contestReach: 0, contestDist: 0, contestSide: 0, label: `Rack ${rack + 1}, ${[7.3, 7.6, 8, 7.6, 7.3][rack]} m, nobody there` });
      const value = index % 5 === 4 ? 2 : 1;
      expect(contestShotValue(index)).toBe(value);
      expect(contestPoints(index, false)).toBe(0);
      expect(contestPoints(index, true)).toBe(value);
      const power = (requiredSpeed(setup.distance, launchDegFor(0.6)) - 6.6) / 4.8;
      expect(realShot({ x: 0, arc: 0.6, power }, setup, () => 0.5).made).toBe(true);
      points += contestPoints(index, true);
    }
    expect(points).toBe(30);
  });

  it('plays all twenty five exact engine shots without recording the contest', () => {
    const date = getTodayET(), key = `buzzer-beater-daily-${date}`;
    const raw = JSON.stringify({ v: 1, date, score: 874, made: 4 });
    for (const reduced of [false, true]) {
      reducedMotion(reduced);
      localStorage.setItem(key, raw);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      const view = render(<BuzzerBeaterBoard />);
      fireEvent.click(button('Three-point contest'));
      const setups = buildThreePointContest(), rng = lehmer(freeSeed ^ 0x5eed1234);
      let score = 0, made = 0, moneyMakes = 0, misses = 0;
      const outcomes: boolean[] = [];
      for (let index = 0; index < 25; index++) {
        const value = index % 5 === 4 ? 2 : 1;
        expect(board(view)).toHaveAttribute('data-arcade-mode', 'contest');
        expect(view.container.querySelector('[data-contest-rack]')).toHaveAttribute('data-contest-rack', String(Math.floor(index / 5) + 1));
        expect(view.container.querySelector('[data-contest-ball]')).toHaveAttribute('data-contest-ball', String(index % 5 + 1));
        expect(view.container.querySelector('[data-contest-value]')).toHaveAttribute('data-contest-value', String(value));
        const markers = [...view.container.querySelectorAll('[data-contest-ball-marker]')];
        expect(markers).toHaveLength(5);
        for (let ball = 0; ball < 5; ball++) {
          const status = ball < index % 5 ? outcomes[Math.floor(index / 5) * 5 + ball] ? 'made' : 'missed' : ball === index % 5 ? 'current' : 'upcoming';
          expect(markers[ball]).toHaveAttribute('data-ball-status', status);
          expect(markers[ball]).toHaveAccessibleName(`Ball ${ball + 1}, ${ball === 4 ? 'money ball, 2 points' : '1 point'}, ${status}`);
        }
        const fade = index % 7 === 3 ? 1 : 0, ticks = contestTicks(setups[index]);
        fireEvent.change(screen.getByRole('slider', { name: 'How far to fade off the closeout' }), { target: { value: fade } });
        const expected = realShot({ x: fade, arc: 0.6, power: chargedPower(ticks) }, setups[index], rng);
        const hold = button('Hold to shoot'); fireEvent.pointerDown(hold); advance(ticks * 16); fireEvent.pointerUp(hold);
        expect(actualShot(), `contest shot ${index + 1}, reduced=${reduced}`).toEqual(expected);
        expect(board(view)).toHaveAttribute('data-arcade-phase', reduced ? 'shotEnd' : 'flying');
        expect(markers[index % 5]).toHaveAttribute('data-ball-status', reduced ? expected.made ? 'made' : 'missed' : 'in-flight');
        settle(view);
        outcomes.push(expected.made);
        score += expected.made ? value : 0; made += Number(expected.made);
        moneyMakes += Number(expected.made && value === 2); misses += Number(!expected.made);
        expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent(String(score));
        expect(view.container.querySelector('[data-arcade-feedback]')).toHaveTextContent(expected.verdict);
        expect(button(index === 24 ? 'See the run' : 'Next shot')).toHaveFocus();
        fireEvent.click(button(index === 24 ? 'See the run' : 'Next shot'));
      }
      expect(moneyMakes, 'real money-ball makes exercise the extra point').toBeGreaterThan(0);
      expect(misses, 'misses exercise zero rather than the available value').toBeGreaterThan(0);
      expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
      expect(screen.getByText(`${made} of 25 made`)).toBeVisible();
      expect(screen.getByText(`${score} points out of a possible 30. Unranked local contest. Nothing saved.`)).toBeVisible();
      expect(screen.queryByTestId('recorded-share')).toBeNull();
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(writeArcadeRun).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
      expect(localStorage.getItem(key)).toBe(raw);
      fireEvent.click(button('Another contest'));
      expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
      expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent('0');
      expect(view.container.querySelector('[data-contest-rack]')).toHaveAttribute('data-contest-rack', '1');
      expect(view.container.querySelector('[data-contest-ball]')).toHaveAttribute('data-contest-ball', '1');
      advance(1000);
      expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
      view.unmount(); writes.mockRestore();
    }
  }, 30000);

  it('preserves recorded ten shot modes and restored daily bytes', () => {
    const date = getTodayET(), key = `buzzer-beater-daily-${date}`;
    for (const mode of ['daily', 'unlimited'] as const) {
      const view = render(<BuzzerBeaterBoard />);
      fireEvent.click(button(mode === 'daily' ? "Today's ten" : 'Unlimited'));
      const result = finishTen(view, mode === 'daily' ? daySeed(date) : freeSeed);
      expect(recordCompletion).toHaveBeenCalledTimes(1);
      expect(recordCompletion).toHaveBeenLastCalledWith('/buzzer-beater', result.score, null, result.made);
      expect(screen.getByTestId('recorded-share')).toHaveAttribute('data-score', `${result.made}/10 shots for ${result.score} points`);
      expect(screen.getByTestId('recorded-share')).toHaveTextContent(`Buzzer Beater 🏀 ${result.made}/10 made, ${result.score} points. douknowball.com/buzzer-beater`);
      if (mode === 'daily') {
        expect(writeArcadeRun).toHaveBeenCalledTimes(1);
        expect(writeArcadeRun).toHaveBeenLastCalledWith('buzzer-beater', date, 'made', { score: result.score, count: result.made });
        expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ score: result.score, made: result.made, v: 1, date });
      } else {
        expect(writeArcadeRun).not.toHaveBeenCalled();
        expect(localStorage.getItem(key)).toBeNull();
      }
      advance(2000); view.rerender(<BuzzerBeaterBoard />);
      expect(recordCompletion).toHaveBeenCalledTimes(1);
      view.unmount(); localStorage.clear(); vi.clearAllMocks();
    }
    const raw = JSON.stringify({ v: 1, date, score: 874, made: 4 });
    localStorage.setItem(key, raw);
    const view = render(<BuzzerBeaterBoard />);
    expect(screen.getByText('4 of 10 made')).toBeVisible();
    expect(screen.getByText(/A rack with three regular makes and a made money ball scores 5 points/)).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(button('Steady practice'));
    finishTen(view, freeSeed, true);
    expect(screen.queryByTestId('recorded-share')).toBeNull();
    fireEvent.click(button("Today's ten"));
    expect(screen.getByText('4 of 10 made')).toBeVisible();
    expect(localStorage.getItem(key)).toBe(raw);
    expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
  }, 30000);

  it('pauses contest shots and reopens rules without stale charging', () => {
    const view = render(<BuzzerBeaterBoard />);
    expect(screen.getByText(/A rack with three regular makes and a made money ball scores 5 points/)).toBeVisible();
    fireEvent.click(button('Three-point contest'));
    const hold = button('Hold to shoot');
    fireEvent.keyDown(hold, { key: 'Enter' }); advance(64);
    fireEvent.click(screen.getByRole('button', { name: 'Three-point contest rules' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Make all 25 for 30 points');
    expect(board(view)).toHaveAttribute('data-arcade-paused', 'true');
    advance(5000);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    fireEvent.click(button("Let's Play!")); advance(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(board(view)).toHaveAttribute('data-arcade-paused', 'true');
    fireEvent.click(button('Resume'));
    const calls = vi.mocked(takeShot).mock.calls.length;
    fireEvent.keyUp(hold, { key: 'Enter' }); advance(1000);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(vi.mocked(takeShot).mock.calls).toHaveLength(calls);
    const expected = realShot({ x: 0, arc: 0.6, power: chargedPower(4) }, buildThreePointContest()[0], lehmer(freeSeed ^ 0x5eed1234));
    fireEvent.keyDown(hold, { key: ' ' });
    fireEvent.keyDown(hold, { key: ' ', repeat: true });
    fireEvent.keyUp(hold, { key: ' ' });
    expect(actualShot()).toEqual(expected);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    advance(200);
    fireEvent.click(screen.getByRole('button', { name: 'Three-point contest rules' }));
    advance(5000);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent('0');
    fireEvent.click(button("Let's Play!")); advance(1); fireEvent.click(button('Resume'));
    advance(579);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    advance(1);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
    expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent(String(Number(expected.made)));
    advance(200);
    expect(view.container.querySelector('[data-contest-score]')).toHaveTextContent(String(Number(expected.made)));
    fireEvent.click(button('Next shot'));
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(view.container.querySelector('[data-contest-ball]')).toHaveAttribute('data-contest-ball', '2');
    view.unmount(); advance(1000);
    expect(frames.size).toBe(0);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(writeArcadeRun).not.toHaveBeenCalled();
  });
});
