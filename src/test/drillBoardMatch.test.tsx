/* Round 1047: the training boards in their one moment mode (the `match` prop).

   A Season Centre moment is one round of a drill. These tests play that
   round through the real boards and hold the contract the moment host
   relies on: the board opens on its ready card with no way back to a menu,
   plays round `round` of the run `seed` deals, never reads or writes a daily
   record, reports exactly once, and what it reports settles to the same
   result through src/lib/season/soccerMoments.ts (the one place a moment's
   stars come from). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import DrillBoard, { type DrillMatch } from '@/components/soccer-career/DrillBoard';
import ThroughBallBoard from '@/components/soccer-career/ThroughBallBoard';
import { momentSeed, momentSetup, momentShotRng, settleMoment, textbookStrike } from '@/lib/season/soccerMoments';
import { perfectThroughBall, passTarget, type ThroughBallSetup } from '@/lib/throughBallDrill';
import { tackleBallAt, tackleNextLoose, type TackleSetup, type WallShotSetup } from '@/lib/careerDrills';
import type { CareerState } from '@/lib/soccerCareerEngine';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerId = options.pointerId ?? 7; }
}
const fixture = (position: string) => ({ position, overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState);
const KEY = 'Test Player|Club|2031|30|10|5|7.1|centre';
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('a drill board playing one round inside a match', { timeout: 20000 }, () => {
  it('plays the wall shot round it was handed, once, and writes no daily record', () => {
    const seed = momentSeed(KEY, 12, 0);
    const setup = momentSetup('wallshot', seed, 4) as WallShotSetup;
    const onResult = vi.fn();
    const match: DrillMatch = { kind: 'wallshot', seed, round: 4, rng: () => momentShotRng(KEY, 12, 0, setup), onResult };
    /* a centre back: the moment's drill wins over the position's own */
    const view = render(<DrillBoard career={fixture('CB')} canBank onBank={vi.fn()} onBack={vi.fn()} match={match} />);
    expect(view.container.querySelector('[data-drill-board="wallshot"]')).not.toBeNull();
    expect(view.container.querySelector('[data-drill-match="wallshot"]')).not.toBeNull();
    expect(view.queryByText(/Today's ten/)).toBeNull();
    expect(view.getByText(setup.label)).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    const [x, y, power, press] = textbookStrike(setup);
    advance(Math.round(press * 1000));
    /* aim with the keys' own state setters is slow; the Shoot button plays the default aim */
    fireEvent.click(view.getByRole('button', { name: 'Shoot now' }));
    advance(900);
    expect(onResult).toHaveBeenCalledTimes(1);
    const told = onResult.mock.calls[0][0];
    expect(told.input).toHaveLength(4);
    for (const v of told.input) expect(Math.round(v * 10000) / 10000).toBe(v);
    const again = settleMoment('wallshot', setup, told.input, momentShotRng(KEY, 12, 0, setup));
    expect(again.won).toBe(told.won);
    expect(again.verdict).toBe(told.verdict);
    expect(view.queryByRole('button', { name: /Next/ })).toBeNull();
    expect(view.container.querySelector('[data-drill-phase="roundEnd"]')).not.toBeNull();
    advance(5000);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    /* the textbook strike itself is a make on this moment's stream */
    expect(settleMoment('wallshot', setup, [x, y, power, press], momentShotRng(KEY, 12, 0, setup)).won).toBe(true);
  });

  it('wins the tackle round by tapping the loose ball, and reports what the engine settles', () => {
    const seed = momentSeed(KEY, 7, 1);
    const setup = momentSetup('tackle', seed, 3) as TackleSetup;
    const onResult = vi.fn();
    const view = render(<DrillBoard career={fixture('ST')} canBank onBank={vi.fn()} onBack={vi.fn()} match={{ kind: 'tackle', seed, round: 3, rng: () => () => 0.5, onResult }} />);
    const svg = view.container.querySelector('[data-drill-board="tackle"]')!;
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 360, height: 210, right: 360, bottom: 210, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    const t = tackleNextLoose(setup, 0.05);
    advance(Math.round(t * 1000));
    const ball = tackleBallAt(setup, t);
    fireEvent.pointerDown(svg, { pointerId: 7, clientX: ball.x * 360, clientY: ball.y * 210 });
    advance(900);
    expect(onResult).toHaveBeenCalledTimes(1);
    const told = onResult.mock.calls[0][0];
    expect(told.won).toBe(true);
    const again = settleMoment('tackle', setup, told.input, () => 0.5);
    expect(again.won).toBe(true);
    expect(again.stars).toBeGreaterThanOrEqual(1);
    expect(again.verdict).toBe(told.verdict);
    expect(localStorage.length).toBe(0);
  });

  it('lets a glove round run out as a miss, once', () => {
    const seed = momentSeed(KEY, 20, 2);
    const onResult = vi.fn();
    const view = render(<DrillBoard career={fixture('ST')} canBank onBank={vi.fn()} onBack={vi.fn()} match={{ kind: 'gloves', seed, round: 5, rng: () => () => 0.5, onResult }} />);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    /* in steps: the board reads its clock, sees the ball cross, then draws the flight */
    for (let i = 0; i < 16; i += 1) advance(500);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0].won).toBe(false);
    expect(settleMoment('gloves', momentSetup('gloves', seed, 5), onResult.mock.calls[0][0].input, () => 0.5).stars).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('plays one through ball, reports once and offers no next ball or menu', () => {
    const seed = momentSeed(KEY, 9, 0);
    const setup = momentSetup('throughball', seed, 6) as ThroughBallSetup;
    const onResult = vi.fn();
    const view = render(<ThroughBallBoard career={fixture('ST')} canBank onBank={vi.fn()} onBack={vi.fn()} match={{ seed, round: 6, onResult }} />);
    expect(view.container.querySelector('[data-through-match]')).not.toBeNull();
    expect(view.queryByText(/Daily \/ practice menu/)).toBeNull();
    expect(view.queryByText(/Drills/)).toBeNull();
    const svg = view.container.querySelector('svg[role="img"]')!;
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 360, height: 240, right: 360, bottom: 240, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    fireEvent.click(view.getByRole('button', { name: 'Start run' }));
    const p = perfectThroughBall(setup);
    const spot = passTarget(p.angle, p.weight);
    advance(Math.round(p.press * 1000));
    fireEvent.pointerDown(svg, { pointerId: 7, clientX: spot.x, clientY: spot.y });
    fireEvent.pointerUp(svg, { pointerId: 7, clientX: spot.x, clientY: spot.y });
    advance(900);
    expect(onResult).toHaveBeenCalledTimes(1);
    const told = onResult.mock.calls[0][0];
    expect(told.input).toHaveLength(3);
    const again = settleMoment('throughball', setup, told.input, () => 0.5);
    expect(again.won).toBe(told.won);
    expect(again.verdict).toBe(told.verdict);
    const action = view.container.querySelector('[data-through-action]') as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    expect(action.textContent).toBe('Played');
    fireEvent.keyDown(view.getByRole('group'), { key: ' ', code: 'Space' });
    advance(3000);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  });
});
