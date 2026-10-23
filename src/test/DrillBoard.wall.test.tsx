import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import DrillBoard from '@/components/soccer-career/DrillBoard';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { buildWallShotRun, drillSeed, lehmer, takeWallShot, wallShotGeometry } from '@/lib/careerDrills';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

const date = '2026-10-23';
const slug = 'career-drill-wallshot';
// The existing markup suite's minimal display fixture, not a shot/result substitute.
const career = () => ({ position: 'ST', overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState);

class PointerInput extends MouseEvent {
  constructor(type: string, init: MouseEventInit & { pointerId?: number; isPrimary?: boolean } = {}) {
    super(type, init);
    Object.defineProperties(this, { pointerId: { value: init.pointerId ?? 1 }, isPrimary: { value: init.isPrimary ?? true } });
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date(date + 'T12:00:00Z'));
  vi.stubGlobal('PointerEvent', PointerInput);
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function geometry(svg: Element) {
  let captured: number | null = null;
  const capture = vi.fn((id: number) => { captured = id; });
  const release = vi.fn((id: number) => { if (captured === id) captured = null; });
  Object.defineProperties(svg, {
    getBoundingClientRect: { configurable: true, value: () => new DOMRect(0, 0, 360, 210) },
    setPointerCapture: { configurable: true, value: capture },
    hasPointerCapture: { configurable: true, value: (id: number) => captured === id },
    releasePointerCapture: { configurable: true, value: release },
  });
  return { capture, release };
}
function match(rules?: number) {
  const result = vi.fn();
  const rng = vi.fn(() => () => 0.5);
  const view = render(<DrillBoard career={career()} canBank={false} onBank={vi.fn()} onBack={vi.fn()} match={{ kind: 'wallshot', seed: 1454, round: 0, wallShotRules: rules, rng, onResult: result }} />);
  return { view, result, rng };
}
function finish() { act(() => { vi.advanceTimersByTime(1000); }); }

describe('Wall Shot rules-2 real board', () => {
  it('draws five fitted defenders from the exact engine bounds', () => {
    const { view } = match(2);
    const wall = wallShotGeometry(buildWallShotRun(1454)[0]);
    const node = view.container.querySelector('[data-wall-shot-wall]');
    expect(view.container.querySelectorAll('[data-drill-player="wall"]').length, 'WALL_UI_EXACT_FIVE').toBe(5);
    expect(node?.getAttribute('data-wall-left'), 'WALL_UI_LEFT_FROM_ENGINE').toBe(String(wall.lo));
    expect(node?.getAttribute('data-wall-right'), 'WALL_UI_RIGHT_FROM_ENGINE').toBe(String(wall.hi));
    expect(node?.getAttribute('data-wall-top'), 'WALL_UI_TOP_FROM_ENGINE').toBe(String(wall.top));
    const halfCell = ((wall.hi - wall.lo) / wall.count) * 120 / 2;
    const figures = [...view.container.querySelectorAll('[data-wall-defender]')];
    expect(figures, 'WALL_UI_FIVE_REAL_FIGURE_WRAPPERS').toHaveLength(5);
    for (const f of figures) expect(f.getAttribute('transform'), 'WALL_UI_SHADOW_AND_BOOTS_FIT_CELL').toContain('scale(' + halfCell / 10 + ' 1.15)');
    expect(Number(node?.getAttribute('data-wall-head-y')), 'WALL_UI_HEAD_AND_CONTACT_PLANE').toBe(176 - 35.2 * 1.15);
  });

  it('captures aim without shooting on release, then settles one actual shot despite same-batch clicks', () => {
    const { view, result, rng } = match(2);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    const svg = view.getByRole('img');
    const capture = geometry(svg);
    fireEvent.pointerDown(svg, { pointerId: 5, button: 0, clientX: 220, clientY: 90 });
    fireEvent.pointerMove(svg, { pointerId: 5, clientX: 240, clientY: 60 });
    fireEvent.pointerUp(svg, { pointerId: 5, clientX: 240, clientY: 60 });
    expect(capture.capture, 'WALL_UI_CAPTURE_REAL_AIM_POINTER').toHaveBeenCalledWith(5);
    expect(capture.release, 'WALL_UI_RELEASE_CAPTURE').toHaveBeenCalledWith(5);
    expect(svg.getAttribute('data-drill-phase'), 'WALL_UI_AIM_RELEASE_NOT_SHOT').toBe('playing');
    expect(rng, 'WALL_UI_AIM_DRAWS_NOTHING').not.toHaveBeenCalled();
    const shoot = view.getByRole('button', { name: 'Shoot' });
    act(() => { fireEvent.click(shoot); fireEvent.click(shoot); });
    expect(rng, 'WALL_UI_SHOOT_ONCE_BEFORE_PUBLISH').toHaveBeenCalledTimes(1);
    finish();
    expect(result, 'WALL_UI_ONE_ACTUAL_SETTLEMENT').toHaveBeenCalledTimes(1);
    expect(result.mock.calls[0][0].input.slice(0, 3), 'WALL_UI_PACKED_ACTUAL_AIM').toEqual([0.5, 0.7759, 0.65]);
  });

  it('ignores a different pointer and cancels without spending the shot', () => {
    const { view, result, rng } = match(2);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    const svg = view.getByRole('img');
    geometry(svg);
    fireEvent.pointerDown(svg, { pointerId: 5, button: 0, clientX: 240, clientY: 60 });
    fireEvent.pointerMove(svg, { pointerId: 6, clientX: 350, clientY: 0 });
    fireEvent.pointerCancel(svg, { pointerId: 5 });
    fireEvent.pointerUp(svg, { pointerId: 5 });
    expect(rng, 'WALL_UI_CANCEL_PRESERVES_ATTEMPT').not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'Shoot' }));
    finish();
    expect(result.mock.calls[0][0].input.slice(0, 3), 'WALL_UI_FOREIGN_POINTER_IGNORED').toEqual([0.5, 0.7759, 0.65]);
  });

  it('updates advice for aim and power, and reopens instructions without consuming an outcome', () => {
    const { view, rng } = match(2);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    const svg = view.getByRole('img');
    geometry(svg);
    const aim = (x: number, y: number) => {
      fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: x, clientY: y });
      fireEvent.pointerUp(svg, { pointerId: 1 });
    };
    const centre = wallShotGeometry(buildWallShotRun(1454)[0]).centres[2];
    aim(60 + (centre + 1) * 120, 140);
    expect(view.container.querySelector('[data-wall-shot-cue]')?.getAttribute('data-wall-shot-cue'), 'WALL_UI_BLOCKED_AIM_NOT_GREEN').toBe('wall');
    aim(270, 50);
    fireEvent.change(view.getByRole('slider', { name: 'How hard to hit it' }), { target: { value: '0.3' } });
    expect(view.container.querySelector('[data-wall-shot-cue]')?.getAttribute('data-wall-shot-cue'), 'WALL_UI_LOW_POWER_NOT_GREEN').toBe('weak');
    fireEvent.change(view.getByRole('slider', { name: 'How hard to hit it' }), { target: { value: '0.65' } });
    aim(350, 50);
    expect(view.container.querySelector('[data-wall-shot-cue]')?.getAttribute('data-wall-shot-cue'), 'WALL_UI_OFF_TARGET_NOT_GREEN').toBe('off-target');
    aim(180, 50);
    expect(view.container.querySelector('[data-wall-shot-cue]')?.getAttribute('data-wall-shot-cue'), 'WALL_UI_CLEAR_PATH_HONEST').toBe('clear');
    fireEvent.click(view.getByRole('button', { name: 'Wall Shot rules' }));
    expect(view.queryByText(/Release your aim, then press Shoot/), 'WALL_UI_REOPENABLE_WORKED_EXAMPLE').not.toBeNull();
    expect(view.queryByText('Good window. Shoot now.'), 'WALL_UI_NO_FALSE_TIMING_CUE').toBeNull();
    expect(rng, 'WALL_UI_HELP_AND_HINTS_DRAW_NOTHING').not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    expect(rng, 'WALL_UI_REPEAT_SPACE_NOT_SHOT').not.toHaveBeenCalled();
  });

  it('keeps unmarked saved matches on the legacy wall and blocks unknown explicit rules', () => {
    const legacy = match();
    expect(legacy.view.container.querySelectorAll('[data-drill-player="wall"]').length, 'WALL_UI_UNMARKED_MATCH_LEGACY').toBeGreaterThan(5);
    legacy.view.unmount();
    const unsupported = match(3);
    expect(unsupported.view.queryByRole('alert')?.textContent, 'WALL_UI_UNKNOWN_RULE_READABLE').toContain('unsupported rules');
    expect(unsupported.view.queryByRole('button', { name: 'Start' }), 'WALL_UI_UNKNOWN_RULE_NO_START').toBeNull();
    fireEvent.keyDown(window, { key: ' ' });
    expect(unsupported.rng, 'WALL_UI_UNKNOWN_RULE_NO_OUTCOME').not.toHaveBeenCalled();
    expect(unsupported.result, 'WALL_UI_UNKNOWN_RULE_NO_RESULT').not.toHaveBeenCalled();
  });

  it('pins new daily rules and resumes the exact next four outcome draws', () => {
    const props = { career: career(), canBank: false, onBank: vi.fn(), onBack: vi.fn() };
    let view = render(<DrillBoard {...props} />);
    fireEvent.click(view.getByRole('button', { name: /Today's ten/ }));
    const initial = readDailyRecord<Record<string, unknown>>(slug, date, fields => fields);
    expect(initial?.wallShotRules, 'WALL_UI_DAILY_RULE_PINNED_BEFORE_SHOT').toBe(2);
    expect(initial?.rounds, 'WALL_UI_DAILY_ZERO_START').toBe(0);
    fireEvent.click(view.getByRole('button', { name: 'Start' }));
    fireEvent.click(view.getByRole('button', { name: 'Shoot' }));
    finish();
    view.unmount();
    view = render(<DrillBoard {...props} />);
    fireEvent.click(view.getByRole('button', { name: /Finish today's ten/ }));
    fireEvent.click(view.getByRole('button', { name: 'Next one' }));
    fireEvent.click(view.getByRole('button', { name: 'Shoot' }));
    finish();
    const record = readDailyRecord<Record<string, unknown>>(slug, date, fields => fields);
    const seed = drillSeed('wallshot', date);
    const stream = lehmer(seed ^ 0x5eed1234);
    const results = buildWallShotRun(seed).slice(0, 2).map(s => takeWallShot({ x: 0, y: 0.8, power: 0.65, press: 0 }, { ...s, wallShotRules: 2 }, stream));
    expect(record?.rounds, 'WALL_UI_RESUMED_ROUND_COUNT').toBe(2);
    expect(record?.score, 'WALL_UI_RESUME_EXACT_STREAM_POINTS').toBe(results.reduce((n, r) => n + r.points, 0));
    expect(record?.count, 'WALL_UI_RESUME_EXACT_STREAM_GOALS').toBe(results.filter(r => r.won).length);
    const wrong = takeWallShot({ x: 0, y: 0.8, power: 0.65, press: 0 }, { ...buildWallShotRun(seed)[1], wallShotRules: 2 }, lehmer(seed ^ 0x5eed1234));
    expect(results[1].x, 'WALL_UI_RESUME_FIXTURE_STREAM_SENSITIVE').not.toBe(wrong.x);
    expect(Number(view.container.querySelector('[data-drill-ball]')?.getAttribute('cx')), 'WALL_UI_RESUME_ACTUAL_NEXT_FLIGHT').toBe(60 + ((results[1].x + 1) / 2) * 240);
  });

  it('retains old and unsupported daily records instead of offering another attempt', () => {
    writeDailyRecord(slug, date, { score: 123, count: 1, banked: false, rounds: 3 });
    let view = render(<DrillBoard career={career()} canBank={false} onBank={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(view.getByRole('button', { name: /Finish today's ten/ }));
    expect(view.container.querySelectorAll('[data-drill-player="wall"]').length, 'WALL_UI_EXISTING_DAILY_STAYS_LEGACY').toBeGreaterThan(5);
    view.unmount();
    writeDailyRecord(slug, date, { score: 123, count: 1, banked: false, rounds: 3, wallShotRules: 3 });
    const raw = localStorage.getItem(slug + '-daily-' + date);
    expect(raw, 'WALL_UI_UNKNOWN_DAILY_ACTUALLY_STORED').not.toBeNull();
    view = render(<DrillBoard career={career()} canBank={false} onBank={vi.fn()} onBack={vi.fn()} />);
    const finishToday = view.getByRole('button', { name: /Finish today's ten/ });
    expect((finishToday as HTMLButtonElement).disabled, 'WALL_UI_UNKNOWN_DAILY_BLOCKED').toBe(true);
    fireEvent.click(finishToday);
    expect(localStorage.getItem(slug + '-daily-' + date), 'WALL_UI_UNKNOWN_DAILY_RAW_HELD').toBe(raw);
    expect(view.queryByRole('alert')?.textContent, 'WALL_UI_UNKNOWN_DAILY_RECOVERY_COPY').toContain('stays saved');
  });
});

