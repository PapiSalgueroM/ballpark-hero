import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import * as E from '@/lib/soccerCareerEngine';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const labels = ['Cone Slalom', 'Sprint Burst', 'Penalty Placement', 'Passing Gates'];
function setup(position = 'ST', available = false) {
  const stats = { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 };
  const career = E.initCareer('Practice Fixture', 'England', position, '2020-24', stats, 75, 2020, E.FALLBACK_CLUBS);
  const before = JSON.stringify(career), storage = JSON.stringify({ ...localStorage });
  const callbacks = { onComplete: vi.fn(), onDrill: vi.fn(), onClose: vi.fn() };
  const view = render(<TrainingPanel career={career} available={available} {...callbacks} />);
  return { view, career, before, storage, callbacks, drawsBefore: vi.mocked(Math.random).mock.calls.length };
}
type Setup = ReturnType<typeof setup>;
function keep(name: string, state: Setup, extra: Record<string, unknown> = {}) {
  const value = { inputHeld: JSON.stringify(state.career) === state.before,
    storageHeld: JSON.stringify({ ...localStorage }) === state.storage,
    callbacks: { complete: state.callbacks.onComplete.mock.calls, drill: state.callbacks.onDrill.mock.calls },
    draws: vi.mocked(Math.random).mock.results.slice(state.drawsBefore).map(row => row.value),
    score: state.view.container.querySelector('[data-training-score]')?.textContent ?? null, ...extra };
  const folder = process.env.SC_CLASSIC_PRACTICE_RAW;
  if (folder) { fs.mkdirSync(folder, { recursive: true }); fs.writeFileSync(path.join(folder, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }
  return value;
}
function held(state: Setup) {
  expect(JSON.stringify(state.career)).toBe(state.before);
  expect(JSON.stringify({ ...localStorage })).toBe(state.storage);
  expect(state.callbacks.onDrill).not.toHaveBeenCalled();
}
function cones(state: Setup) {
  for (let i = 1; i <= 8; i++) fireEvent.click(state.view.getByRole('button', { name: String(i) }));
}
function penalties(state: Setup) {
  for (let i = 0; i < 5; i++) { fireEvent.click(state.view.getByRole('button', { name: 'Shoot bottom middle' })); advance(1100); }
}
function keeper(state: Setup) {
  advance(1250);
  for (let i = 0; i < 5; i++) {
    fireEvent.click(state.view.getByRole('button', { name: 'Dive bottom left' })); advance(1100);
    if (i < 4) advance(650);
  }
}
function passing(state: Setup) {
  fireEvent.click(state.view.getByRole('button', { name: /Tap to start the passing drill/ }));
  for (let i = 0; i < 8; i++) { fireEvent.click(state.view.getByRole('button', { name: '🚩' })); if (i < 7) advance(350); }
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('practice-unrelated', '{"keep":"unchanged"}');
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Soccer classic practice', () => {
  it('keeps the existing rewarded penalty score, five global draws and one bank', () => {
    const s = setup('ST', true);
    fireEvent.click(s.view.getByRole('button', { name: /Penalty Placement/ })); penalties(s);
    const observation = keep('rewarded-held', s);
    expect(observation.draws, 'SC_CLASSIC_REWARDED_DRAWS').toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(observation.score).toBe('100');
    fireEvent.click(s.view.getByRole('button', { name: 'Bank the session' }));
    expect(s.callbacks.onComplete).toHaveBeenCalledExactlyOnceWith('shooting', 100);
    expect(s.view.queryByRole('button', { name: 'Bank the session' })).toBeNull();
    keep('rewarded-held', s); held(s);
  });

  it('keeps all four classic drills open after the reward and repeats cones and sprint without a bank', () => {
    const s = setup();
    const available = labels.map(label => s.view.queryByRole('button', { name: new RegExp(label) }) !== null);
    keep('menu-free', s, { available });
    expect(available, 'SC_CLASSIC_SPENT_MENU').toEqual([true, true, true, true]);
    fireEvent.click(s.view.getByRole('button', { name: /Cone Slalom/ })); cones(s);
    expect(s.view.container.querySelector('[data-training-score]')).toHaveTextContent('100');
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_CLASSIC_NO_FREE_BANK').toBeNull();
    fireEvent.click(s.view.getByRole('button', { name: 'Try again' })); cones(s);
    expect(s.view.container.querySelector('[data-training-score]')).toHaveTextContent('100');
    fireEvent.click(s.view.getByRole('button', { name: 'Choose a drill' }));
    fireEvent.click(s.view.getByRole('button', { name: /Sprint Burst/ }));
    fireEvent.click(s.view.getByRole('button', { name: /Tap to start the 5 second sprint/ }));
    for (let i = 0; i < 20; i++) fireEvent.click(s.view.getByRole('button', { name: /GO GO GO/ }));
    advance(5000);
    const observation = keep('menu-free', s, { available });
    expect(observation.score).toBe('64'); expect(observation.draws).toEqual([]);
    expect(s.view.getByText('Practice only. No career boost.')).toBeInTheDocument();
    expect(s.callbacks.onComplete).not.toHaveBeenCalled(); held(s);
  });

  it('keeps a banked session spent when the same drill is retried without a parent rerender', () => {
    const s = setup('ST', true);
    fireEvent.click(s.view.getByRole('button', { name: /Cone Slalom/ })); cones(s);
    fireEvent.click(s.view.getByRole('button', { name: 'Bank the session' }));
    expect(s.callbacks.onComplete).toHaveBeenCalledExactlyOnceWith('dribbling', 100);
    const again = s.view.queryByRole('button', { name: 'Try again' });
    keep('banked-repeat', s, { retryAvailable: again !== null });
    expect(again !== null, 'SC_CLASSIC_BANKED_RETRY').toBe(true);
    fireEvent.click(again!); cones(s);
    const observation = keep('banked-repeat', s);
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_CLASSIC_NO_SECOND_BANK').toBeNull();
    expect(s.view.getByText('Practice only. No career boost.')).toBeInTheDocument();
    expect(s.callbacks.onComplete).toHaveBeenCalledTimes(1); expect(observation.draws).toEqual([]); held(s);
  });

  it.each([
    { name: 'penalty', position: 'ST', label: 'Penalty Placement', play: penalties },
    { name: 'keeper', position: 'GK', label: 'Shot Stopping', play: keeper },
    { name: 'passing', position: 'ST', label: 'Passing Gates', play: passing },
  ])('repeats free $name runs without reward callbacks or global career draws', ({ name, position, label, play }) => {
    const s = setup(position);
    const button = s.view.queryByRole('button', { name: new RegExp(label) });
    keep('free-' + name, s, { available: button !== null });
    expect(button !== null, 'SC_CLASSIC_FREE_' + name.toUpperCase()).toBe(true);
    fireEvent.click(button!); play(s);
    const first = Number(s.view.container.querySelector('[data-training-score]')?.textContent);
    fireEvent.click(s.view.getByRole('button', { name: 'Try again' })); play(s);
    const observation = keep('free-' + name, s, { first });
    expect(first).toBeGreaterThanOrEqual(0); expect(first).toBeLessThanOrEqual(100);
    expect(Number(observation.score)).toBeGreaterThanOrEqual(0); expect(Number(observation.score)).toBeLessThanOrEqual(100);
    expect(observation.draws, 'SC_CLASSIC_FREE_GLOBAL_DRAWS').toEqual([]);
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_CLASSIC_NO_FREE_BANK').toBeNull();
    expect(s.callbacks.onComplete).not.toHaveBeenCalled(); held(s);
    fireEvent.click(s.view.getByRole('button', { name: 'Close' }));
    expect(s.callbacks.onClose).toHaveBeenCalledTimes(1);
    s.view.unmount(); advance(30000);
    expect(s.callbacks.onComplete).not.toHaveBeenCalled(); held(s);
  });
});
