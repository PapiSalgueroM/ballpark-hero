import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrainingGround from '@/components/career/TrainingGround';
import { usePracticeClock } from '@/hooks/usePracticeClock';
import { nbaTraining } from '@/lib/nbaCareerTraining';
import { nhlTraining } from '@/lib/nhlCareerTraining';
import { bankTrainingRating, type TrainingSport } from '@/lib/careerTraining';

const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const RULES = 'Pick a drill. Finish it, then bank your score once this season.';
function ground(sport: TrainingSport = nbaTraining('PG')) {
  const onComplete = vi.fn();
  const onClose = vi.fn();
  const view = render(<TrainingGround sport={sport} available onComplete={onComplete} onClose={onClose} instructions={RULES} />);
  const button = (name: string) => view.getByRole('button', { name });
  const tap = (name: string) => fireEvent.click(button(name));
  const open = (id: string) => {
    const drill = sport.drills.find(d => d.id === id)!;
    fireEvent.click(view.getByText(drill.name));
  };
  const zones = () => [...view.container.querySelectorAll<HTMLButtonElement>('[data-training-zone]')];
  const score = () => view.container.querySelector('[data-training-score]')?.textContent ?? null;
  const stage = () => view.getByRole('dialog').getAttribute('data-practice-screen');
  const paused = () => view.getByRole('dialog').getAttribute('data-practice-paused');
  return { ...view, sport, onComplete, onClose, button, tap, open, zones, score, stage, paused };
}
const shoot = (g: ReturnType<typeof ground>, zone = 4) => fireEvent.click(g.zones()[zone]);
const bank = (g: ReturnType<typeof ground>) => g.tap(g.sport.bank);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('independent rating bank preserves thresholds and the player ceiling', () => {
  expect([0, 49, 50, 79, 80, 100].map(score => bankTrainingRating(70, 90, score))).toEqual([
    { ovr: 70, tier: 0, gain: 0 }, { ovr: 70, tier: 0, gain: 0 },
    { ovr: 71, tier: 1, gain: 1 }, { ovr: 71, tier: 1, gain: 1 },
    { ovr: 72, tier: 2, gain: 2 }, { ovr: 72, tier: 2, gain: 2 },
  ]);
  expect(bankTrainingRating(74, 75, 80)).toEqual({ ovr: 75, tier: 2, gain: 1 });
  expect(bankTrainingRating(75, 75, 100)).toEqual({ ovr: 75, tier: 2, gain: 0 });
  expect(Math.random).not.toHaveBeenCalled();
});

describe('shared practice lifecycle', () => {
  it('supersedes the abandoned fifth penalty with the new drill result', () => {
    const g = ground();
    g.open('spots');
    for (let i = 0; i < 4; i++) { shoot(g); wait(1100); }
    shoot(g);
    g.tap('‹ Drills');
    g.open('handles');
    wait(5000);
    expect(g.stage()).toBe('drill');
    expect(g.score()).toBeNull();
    for (let i = 1; i <= 8; i++) g.tap(String(i));
    expect(g.container.querySelector('[data-training-result]')).toHaveAttribute('data-training-result', 'handles');
    expect(g.score()).toBe('100');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('handles', 100);
  });

  it('supersedes the old reveal when the same penalty drill reopens', () => {
    const g = ground();
    g.open('spots'); shoot(g); wait(400);
    g.tap('‹ Drills'); g.open('spots'); wait(2000);
    expect(g.queryByText('Shot 1/5')).toBeInTheDocument();
    expect(g.queryByText('0 made')).toBeInTheDocument();
    expect(Math.random).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) { shoot(g); wait(1100); }
    expect(g.score()).toBe('100');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('spots', 100);
  });

  it('supersedes the keeper tell abandoned behind the menu', () => {
    const g = ground(nhlTraining('G'));
    g.open('holes'); wait(600);
    expect(g.queryByText('He is loading up...')).toBeInTheDocument();
    g.tap('‹ Drills'); wait(10000);
    expect(g.stage()).toBe('menu');
    expect(Math.random).toHaveBeenCalledTimes(2);
    g.open('holes'); wait(599);
    expect(g.queryByText('He is loading up...')).toBeNull();
    wait(1);
    for (let i = 0; i < 5; i++) { wait(650); shoot(g, 3); wait(1100); }
    expect(g.score()).toBe('100');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('holes', 100);
  });

  it('supersedes gates running out behind the menu', () => {
    const g = ground();
    g.open('reads'); g.tap('🧠 Tap to start the passing reads Eight reads, shrinking windows');
    g.tap('🙋'); wait(350); g.tap('🙋'); wait(350);
    const draws = vi.mocked(Math.random).mock.calls.length;
    g.tap('‹ Drills'); wait(20000);
    expect(g.stage()).toBe('menu');
    expect(g.score()).toBeNull();
    expect(Math.random).toHaveBeenCalledTimes(draws);
    expect(g.onComplete).not.toHaveBeenCalled();
  });

  it('help preserves the remaining shot reveal and requires explicit resume', () => {
    const g = ground();
    g.open('spots'); shoot(g); wait(400);
    const marker = g.container.querySelector('[data-training-feedback]');
    g.tap('Practice rules');
    expect(g.paused()).toBe('true');
    expect(g.queryByRole('button', { name: 'Resume practice' })).toBeInTheDocument();
    expect(g.queryByText(RULES)).toBeInTheDocument();
    wait(10000);
    g.tap('Practice rules');
    expect(g.queryByText(RULES)).toBeNull();
    expect(g.paused()).toBe('true');
    fireEvent.focus(window); wait(2000);
    expect(g.container.querySelector('[data-training-feedback]')).toBe(marker);
    expect(g.queryByText('Shot 1/5')).toBeInTheDocument();
    g.tap('Resume practice'); wait(699);
    expect(g.container.querySelector('[data-training-feedback]')).toBe(marker);
    wait(1);
    expect(g.queryByText('Shot 1/5')).toBeNull();
    expect(g.queryByText('Shot 2/5')).toBeInTheDocument();
    expect(g.queryByText('1 made')).toBeInTheDocument();
  });

  for (const event of ['blur', 'hidden'] as const) {
    it(`${event} preserves remaining time without refocus resuming play`, () => {
      const g = ground();
      g.open('spots'); shoot(g); wait(400);
      const hidden = event === 'hidden' ? vi.spyOn(document, 'hidden', 'get').mockReturnValue(true) : null;
      if (hidden) fireEvent(document, new Event('visibilitychange'));
      else fireEvent.blur(window);
      expect(g.paused()).toBe('true');
      wait(5000);
      if (hidden) { hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange')); }
      fireEvent.focus(window); wait(2000);
      expect(g.queryByText('Shot 1/5')).toBeInTheDocument();
      expect(g.paused()).toBe('true');
      g.tap('Resume practice'); wait(699);
      expect(g.queryByText('Shot 1/5')).toBeInTheDocument();
      wait(1);
      expect(g.queryByText('Shot 2/5')).toBeInTheDocument();
    });
  }

  it('keeper pause conserves the initial delay, tell, dive and reveal', () => {
    const g = ground(nhlTraining('G'));
    g.open('holes'); wait(300); g.tap('Pause practice'); wait(3000);
    expect(Math.random).not.toHaveBeenCalled();
    g.tap('Resume practice'); wait(299);
    expect(Math.random).not.toHaveBeenCalled();
    wait(1); wait(200); g.tap('Pause practice'); wait(3000);
    expect(g.queryByText('He is loading up...')).toBeInTheDocument();
    g.tap('Resume practice'); wait(449);
    expect(g.queryByText('SHOT! Go!')).toBeNull();
    wait(1); g.tap('Pause practice'); shoot(g, 3);
    expect(g.queryByText('0 saved')).toBeInTheDocument();
    g.tap('Resume practice'); shoot(g, 3); wait(400); g.tap('Pause practice'); wait(3000);
    expect(g.queryByText('1 saved')).toBeInTheDocument();
    g.tap('Resume practice'); wait(699);
    expect(g.queryByText('Shot 1/5')).toBeInTheDocument();
    wait(1);
    for (let i = 1; i < 5; i++) { wait(650); shoot(g, 3); wait(1100); }
    expect(g.score()).toBe('100');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('holes', 100);
  });

  it('gates preserve both the open window and between-gate delay', () => {
    const g = ground();
    g.open('reads'); g.tap('🧠 Tap to start the passing reads Eight reads, shrinking windows');
    wait(300); g.tap('Pause practice'); g.tap('🙋'); wait(5000);
    expect(g.queryByText('Read 1/8')).toBeInTheDocument();
    expect(g.queryByText('0 found')).toBeInTheDocument();
    expect(Math.random).toHaveBeenCalledTimes(1);
    g.tap('Resume practice'); wait(1099);
    expect(g.queryByText('Read 1/8')).toBeInTheDocument();
    wait(1);
    expect(g.queryByText('Read 2/8')).toBeInTheDocument();
    g.tap('🙋'); wait(100); g.tap('Pause practice'); wait(5000);
    expect(Math.random).toHaveBeenCalledTimes(2);
    g.tap('Resume practice'); wait(249);
    expect(g.queryByRole('button', { name: '🙋' })).toBeNull();
    wait(1);
    for (let i = 2; i < 8; i++) { g.tap('🙋'); wait(350); }
    expect(g.score()).toBe('88');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('reads', 88);
  });

  it('cone time and mistakes exclude the entire paused interval', () => {
    const g = ground();
    g.open('handles'); g.tap('1'); wait(1000); g.tap('Pause practice');
    g.tap('8'); g.tap('2'); wait(10000);
    expect(g.queryByText('Cone 2/8')).toBeInTheDocument();
    expect(g.queryByText('0 loose')).toBeInTheDocument();
    expect(g.queryByText('⏱ 1.0s')).toBeInTheDocument();
    g.tap('Resume practice'); wait(3000);
    for (let i = 2; i <= 8; i++) g.tap(String(i));
    expect(g.score()).toBe('100');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('handles', 100);
  });

  it('burst preserves remaining time and ignores taps while paused', () => {
    const g = ground();
    g.open('lane'); g.tap('🏁 Tap to start the 5 second lane drill Then tap the floor as fast as you can');
    const tapFloor = () => fireEvent.click(g.getByText('GO GO GO'));
    for (let i = 0; i < 10; i++) tapFloor();
    wait(1100); g.tap('Pause practice');
    for (let i = 0; i < 50; i++) tapFloor();
    wait(6000);
    expect(g.queryByText('10 slides')).toBeInTheDocument();
    expect(g.queryByText('3.9s')).toBeInTheDocument();
    expect(g.score()).toBeNull();
    g.tap('Resume practice');
    for (let i = 0; i < 15; i++) tapFloor();
    wait(3899);
    expect(g.score()).toBeNull();
    wait(1);
    expect(g.score()).toBe('80');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('lane', 80);
  });

  it('Back immediately abandons an active burst and resets the next attempt', () => {
    const g = ground();
    g.open('lane'); g.tap('🏁 Tap to start the 5 second lane drill Then tap the floor as fast as you can');
    fireEvent.click(g.getByText('GO GO GO')); wait(1200);
    g.tap('‹ Drills');
    expect(g.stage()).toBe('menu');
    expect(vi.getTimerCount()).toBe(0);
    wait(6000);
    expect(g.score()).toBeNull();
    g.open('lane');
    expect(g.queryByText('5.0s')).toBeInTheDocument();
    expect(g.queryByText('0 slides')).toBeInTheDocument();
    expect(g.onComplete).not.toHaveBeenCalled();
  });

  it('burst completion at the blur boundary settles after explicit resume', () => {
    const g = ground();
    g.open('lane'); g.tap('🏁 Tap to start the 5 second lane drill Then tap the floor as fast as you can');
    for (let i = 0; i < 25; i++) fireEvent.click(g.getByText('GO GO GO'));
    // The expiry update and real blur listener run before React flushes the
    // completion effect, which must defer the earned result until Resume.
    act(() => {
      vi.advanceTimersByTime(5000);
      window.dispatchEvent(new Event('blur'));
    });
    expect(g.paused()).toBe('true');
    expect(g.queryByText('0.0s')).toBeInTheDocument();
    expect(g.score()).toBeNull();
    expect(g.onComplete).not.toHaveBeenCalled();
    g.tap('Resume practice');
    expect(g.score()).toBe('80');
    bank(g);
    expect(g.onComplete).toHaveBeenCalledExactlyOnceWith('lane', 80);
  });

  for (const id of ['handles', 'lane', 'spots', 'reads']) {
    it(`${id} ignores starting input while paused`, () => {
      const g = ground();
      g.open(id); g.tap('Pause practice');
      const before = g.container.innerHTML;
      if (id === 'handles') g.tap('1');
      if (id === 'lane') g.tap('🏁 Tap to start the 5 second lane drill Then tap the floor as fast as you can');
      if (id === 'spots') shoot(g);
      if (id === 'reads') g.tap('🧠 Tap to start the passing reads Eight reads, shrinking windows');
      wait(10000);
      expect(g.container.innerHTML).toBe(before);
      expect(Math.random).not.toHaveBeenCalled();
      expect(g.onComplete).not.toHaveBeenCalled();
    });
  }

  it('close and unmount cancel the pending penalty reveal', () => {
    const g = ground();
    g.open('spots'); shoot(g); wait(400);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    g.tap('Close');
    expect(g.onClose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    g.unmount(); wait(20000);
    expect(g.onComplete).not.toHaveBeenCalled();
  });

  it('unmount cancels the pending penalty without requiring Close first', () => {
    const g = ground();
    g.open('spots'); shoot(g);
    g.unmount();
    expect(vi.getTimerCount()).toBe(0);
    wait(20000);
    expect(g.onComplete).not.toHaveBeenCalled();
  });
});

describe('practice clock lifecycle', () => {
  it('preserves the fractional interval remainder and virtual elapsed time', () => {
    const h = renderHook(() => usePracticeClock(true));
    const ticks: number[] = [];
    const start = h.result.current.now();
    act(() => { h.result.current.interval(() => ticks.push(h.result.current.now() - start), 100); });
    wait(150); act(() => h.result.current.pause()); wait(10000);
    expect(ticks).toEqual([100]);
    expect(h.result.current.now() - start).toBe(150);
    act(() => h.result.current.resume()); wait(49);
    expect(ticks).toEqual([100]);
    wait(1);
    expect(ticks).toEqual([100, 200]);
  });

  it('inactive transition cancels work and does not pause unrelated screens', () => {
    const callback = vi.fn();
    const h = renderHook(({ active }) => usePracticeClock(active), { initialProps: { active: true } });
    act(() => { h.result.current.timeout(callback, 1000); });
    h.rerender({ active: false }); fireEvent.blur(window); wait(2000);
    expect(callback).not.toHaveBeenCalled();
    expect(h.result.current.paused).toBe(false);
  });

  it('unmount cancels scheduled callbacks and clears every native timer', () => {
    const callback = vi.fn();
    const h = renderHook(() => usePracticeClock(true));
    act(() => { h.result.current.timeout(callback, 1000); h.result.current.interval(callback, 100); });
    h.unmount();
    expect(vi.getTimerCount()).toBe(0);
    wait(2000);
    expect(callback).not.toHaveBeenCalled();
  });
});
