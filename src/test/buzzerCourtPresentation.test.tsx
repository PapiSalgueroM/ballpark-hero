import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { buildRun, lehmer, takeShot, type Release } from '@/lib/buzzerBeater';
import { recordCompletion } from '@/lib/completions';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => <div data-testid="recorded-share">Share recorded run</div> }));

const SEED = Math.floor(0.125 * 2147483645) + 1;
const RELEASE: Release = { x: 0, arc: 0.6, power: 0.35 };
// Physical projection held from the accepted court, independently of the artwork helper.
const projectX = (metres: number) => 26 + metres * (314 / 9.6);
const projectY = (metres: number) => 190 - metres * 40;
let now = 0, frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-03T17:00:00Z'));
  consumeRestoredFinish('buzzer-beater'); localStorage.clear();
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(0.125);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

type View = ReturnType<typeof render>;
const button = (name: string) => screen.getByRole('button', { name });
const board = (view: View) => view.container.querySelector('[data-arcade-phase]')!;
function advance(milliseconds: number) {
  act(() => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
    const pending = [...frames.values()]; frames.clear();
    for (const frame of pending) frame(now);
  });
}
function startLab() {
  const view = render(<BuzzerBeaterBoard />);
  fireEvent.click(button('Shot lab'));
  fireEvent.change(screen.getByRole('slider', { name: 'Power' }), { target: { value: RELEASE.power } });
  return view;
}
function element(view: View, selector: string) {
  const found = view.container.querySelector<SVGElement>(selector);
  expect(found, `rendered ${selector}`).not.toBeNull();
  return found!;
}
function number(view: View, selector: string, attribute: string) {
  const value = element(view, selector).getAttribute(attribute);
  expect(value, `${selector} has ${attribute}`).not.toBeNull();
  return Number(value);
}
function wrist(view: View, athlete: 'shooter' | 'defender') {
  const transform = element(view, `[data-court-rig="${athlete}"]`).getAttribute('transform');
  const translate = transform?.match(/^translate\(([-+.\deE]+)[ ,]+([-+.\deE]+)\)$/) ?? null;
  expect(translate, 'Athlete translation is a measurable SVG transform').not.toBeNull();
  return {
    x: Number(translate![1]) + number(view, `[data-court-wrist="${athlete}"]`, 'cx'),
    y: Number(translate![2]) + number(view, `[data-court-wrist="${athlete}"]`, 'cy'),
  };
}
function seamRotation(view: View) {
  const transform = element(view, '[data-ball-seams]').getAttribute('transform');
  const rotation = transform?.match(/rotate\(([-+.\deE]+)\)/) ?? null;
  expect(rotation, 'Ball seam orientation is measurable').not.toBeNull();
  return Number(rotation![1]);
}
const geometryAttributes = ['d', 'points', 'transform', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry'];
function geometry(view: View, selector: string) {
  const root = element(view, selector);
  return [root, ...root.querySelectorAll('*')].map(node => [node.tagName, ...geometryAttributes.map(name => node.getAttribute(name))]);
}
function pose(view: View) {
  return { shooter: geometry(view, '[data-court-athlete="shooter"]'), ball: geometry(view, '[data-court-ball]'), seams: geometry(view, '[data-ball-seams]') };
}
function assertBall(view: View, x: number, y: number) {
  expect(number(view, '[data-court-ball]', 'cx'), 'Scored ball horizontal projection').toBeCloseTo(projectX(x), 9);
  expect(number(view, '[data-court-ball]', 'cy')).toBeCloseTo(projectY(y), 9);
  expect(number(view, '[data-court-ball]', 'r')).toBeCloseTo(0.1197 * 314 / 9.6, 9);
}

describe('Buzzer court presentation', () => {
  it('keeps the actual ball hoop and release anchors on the accepted projection across fixed shots', () => {
    const view = startLab(), setups = buildRun(SEED);
    expect(screen.getByRole('img', { name: /^Jump shot/ })).toHaveAttribute('viewBox', '0 0 360 210');
    for (let index = 0; index < 3; index++) {
      const setup = setups[index];
      assertBall(view, 0.1, 2.13);
      expect(number(view, '[data-court-rim]', 'x1'), 'Scored rim horizontal projection').toBeCloseTo(projectX(setup.distance - 0.2286), 9);
      expect(number(view, '[data-court-rim]', 'x2')).toBeCloseTo(projectX(setup.distance + 0.2286), 9);
      expect(number(view, '[data-court-rim]', 'y1')).toBeCloseTo(projectY(3.05), 9);
      expect(number(view, '[data-court-rim]', 'y2')).toBeCloseTo(projectY(3.05), 9);
      expect(wrist(view, 'shooter').x).toBeCloseTo(projectX(0.1), 9);
      expect(wrist(view, 'shooter').y).toBeCloseTo(projectY(2.13), 9);
      if (index === 0) expect(view.container.querySelector('[data-court-athlete="defender"]')).toBeNull();
      else {
        expect(wrist(view, 'defender').x).toBeCloseTo(projectX(setup.contestDist + 0.12), 9);
        expect(wrist(view, 'defender').y).toBeCloseTo(projectY(setup.contestReach), 9);
      }
      const result = takeShot(RELEASE, setup, lehmer((SEED ^ 0x5eed1234) + index * 7919));
      fireEvent.click(button('Shoot'));
      for (const fraction of [0, 0.25, 0.5, 1]) {
        if (fraction > 0) advance(fraction === 1 ? 390 : 195);
        const point = result.path[Math.round(fraction * (result.path.length - 1))];
        assertBall(view, point.x, point.y);
      }
      expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
      if (index < 2) fireEvent.click(button('Change setup'));
    }
  });

  it('draws real limb and ball seam motion then settles and resets the same shot', () => {
    const view = startLab(), ready = pose(view), readyRotation = seamRotation(view);
    fireEvent.click(button('Shoot')); advance(195);
    const flying = pose(view);
    expect(flying.shooter, 'Shooter limbs respond to the actual flight').not.toEqual(ready.shooter);
    expect(seamRotation(view), 'Ball seams rotate independently of translation').not.toBe(readyRotation);
    expect(flying.seams).not.toEqual(ready.seams);
    advance(585);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
    const settled = pose(view); advance(3000);
    expect(pose(view)).toEqual(settled);
    fireEvent.click(button('Retry this shot'));
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(pose(view)).toEqual(ready);
    fireEvent.click(button('Shoot')); advance(195);
    expect(pose(view)).toEqual(flying);
  });

  it('holds the visible rig and ball during pause and resumes the same remaining flight', () => {
    const view = startLab(); fireEvent.click(button('Shoot')); advance(260);
    const held = pose(view);
    fireEvent.click(button('Pause'));
    expect(pose(view), 'Pausing keeps the current visible rig').toEqual(held);
    advance(2500);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    expect(pose(view)).toEqual(held);
    fireEvent.click(button('Resume')); advance(260);
    expect(pose(view)).not.toEqual(held);
    advance(260);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
    const settled = pose(view); advance(2500);
    expect(pose(view)).toEqual(settled);
  });

  it('uses the identical settled artwork immediately with reduced motion', () => {
    let view = startLab(); fireEvent.click(button('Shoot')); advance(780);
    const settled = pose(view); view.unmount();
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }));
    view = startLab(); fireEvent.click(button('Shoot'));
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
    expect(pose(view), 'Reduced motion uses the ordinary settled pose').toEqual(settled);
    advance(5000); expect(pose(view)).toEqual(settled);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('restores the original daily quietly with identical bytes independently of court art', () => {
    const date = getTodayET(), key = `buzzer-beater-daily-${date}`;
    const bytes = JSON.stringify({ v: 1, date, score: 874, made: 4 });
    localStorage.setItem(key, bytes);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<BuzzerBeaterBoard />); advance(2000);
    expect(board(view)).toHaveAttribute('data-arcade-mode', 'daily');
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
    expect(screen.getByText('4 of 10 made')).toBeVisible();
    expect(screen.getByText(/^874 points/)).toBeVisible();
    expect(screen.getByTestId('recorded-share')).toBeVisible();
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(writes).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
