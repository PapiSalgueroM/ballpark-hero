import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import DrillBoard from '@/components/soccer-career/DrillBoard';
import { buildWallShotRun, wallShotGeometry } from '@/lib/careerDrills';
import type { CareerState } from '@/lib/soccerCareerEngine';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Wall Shot authoritative wall-plane animation', () => {
  it('draws a real high shot above the painted heads while it crosses the finite wall', () => {
    const career = { position: 'ST', overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState;
    const result = vi.fn();
    const view = render(<DrillBoard career={career} canBank={false} onBank={vi.fn()} onBack={vi.fn()} match={{ kind: 'wallshot', seed: 1454, round: 0, wallShotRules: 2, rng: () => () => 0.5, onResult: result }} />);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    const wall = wallShotGeometry(buildWallShotRun(1454)[0]);
    const centre = (wall.lo + wall.hi) / 2;
    const steps = Math.round(Math.abs(centre) / 0.06);
    for (let i = 0; i < steps; i += 1) fireEvent.keyDown(window, { key: centre < 0 ? 'ArrowLeft' : 'ArrowRight' });
    expect(view.container.querySelector('[data-wall-shot-cue]')?.getAttribute('data-wall-shot-cue'), 'WALL_FLIGHT_HIGH_ROUTE_POSITIVE').toBe('clear');
    fireEvent.click(view.getByRole('button', { name: 'Shoot' }));
    act(() => { vi.advanceTimersByTime(350); });
    const ball = view.container.querySelector('[data-drill-ball]');
    const progress = (Number(ball?.getAttribute('r')) - 4) / 1.6;
    expect(progress > 0.45 && progress < 0.52, 'WALL_FLIGHT_ACTUAL_CONTACT_FRAME').toBe(true);
    expect(Number(ball?.getAttribute('cy')), 'WALL_FLIGHT_OVER_PAINTED_HEADS').toBeLessThan(Number(view.container.querySelector('[data-wall-shot-wall]')?.getAttribute('data-wall-head-y')));
    expect(result, 'WALL_FLIGHT_NOT_A_FABRICATED_FINISHED_RESULT').not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result, 'WALL_FLIGHT_REAL_SETTLEMENT_FOLLOWS').toHaveBeenCalledTimes(1);
  });
});

