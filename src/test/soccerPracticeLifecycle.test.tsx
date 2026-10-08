import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import { applyTrainingResult, trainingAvailable, type CareerState } from '@/lib/soccerCareerEngine';
import { drillForPosition, drillStatFor } from '@/lib/careerDrills';

const fixture = (position = 'ST') => ({ position, phase: 'pro', retired: false, seasons: [{ year: 2031 }], trainingSeasonYear: 2030, statBoostNextSeason: {}, morale: 50, events: [] } as unknown as CareerState);
const mount = (position = 'ST') => {
  const career = fixture(position), onComplete = vi.fn(), onDrill = vi.fn(), onClose = vi.fn();
  return { ...render(<TrainingPanel career={career} available onComplete={onComplete} onDrill={onDrill} onClose={onClose} />), career, onComplete, onDrill, onClose };
};
type View = ReturnType<typeof mount>;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const click = (v: View, name: string | RegExp) => fireEvent.click(v.getByRole('button', { name }));
const open = (v: View, name: string) => click(v, new RegExp(name));
const text = (v: View) => v.container.textContent || '';
const paused = (v: View) => v.container.querySelector('[data-soccer-practice-paused]')?.getAttribute('data-soccer-practice-paused');
const feedback = (v: View) => v.container.querySelector('[data-training-feedback]');
const noResult = (v: View) => expect(v.container.querySelector('[data-training-result]'), 'unfinished or abandoned practice must not create a result').toBeNull();
const pause = (v: View) => click(v, 'Pause practice');
const resume = (v: View) => click(v, 'Resume practice');
const blur = () => act(() => { window.dispatchEvent(new Event('blur')); });
const noBank = (v: View) => { expect(v.onComplete).not.toHaveBeenCalled(); expect(v.onDrill).not.toHaveBeenCalled(); };
const result = (v: View, drill: string, score: number) => {
  expect(v.container.querySelector('[data-training-result]')).toHaveAttribute('data-training-result', drill);
  expect(v.container.querySelector('[data-training-score]')).toHaveTextContent(new RegExp(`^${score}$`));
  noBank(v);
  click(v, 'Bank the session');
  expect(v.onComplete).toHaveBeenCalledExactlyOnceWith(drill, score);
  const after = applyTrainingResult(v.career, drill as Parameters<typeof applyTrainingResult>[1], score);
  expect(trainingAvailable(after)).toBe(false);
  expect(applyTrainingResult(after, 'pace', 100)).toBe(after);
  click(v, 'Back to your career');
  expect(v.onComplete).toHaveBeenCalledTimes(1);
  expect(v.onClose).toHaveBeenCalledTimes(1);
};
const gate = (v: View) => {
  const button = [...v.container.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === '🚩');
  expect(button, 'an actual lit passing gate is available').toBeDefined();
  return button!;
};

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Soccer practice lifecycle', () => {
  it('keeps five actual mixed penalty verdicts and the earned one time bank unchanged', () => {
    const v = mount(); open(v, 'Penalty Placement');
    for (let n = 0; n < 3; n++) { click(v, 'Shoot bottom middle'); expect(feedback(v)).toHaveTextContent('GOAL!'); advance(1100); }
    click(v, 'Shoot bottom left'); expect(feedback(v)).toHaveTextContent('Saved! Keeper guessed right.'); advance(1100);
    vi.mocked(Math.random).mockReturnValueOnce(.5).mockReturnValueOnce(.01);
    click(v, 'Shoot top left'); expect(feedback(v)).toHaveTextContent('Blazed over the bar!'); advance(1099); noResult(v); advance(1);
    result(v, 'shooting', 60);
    expect(v.career.statBoostNextSeason).toEqual({});
    expect(applyTrainingResult(v.career, 'shooting', 60).statBoostNextSeason).toEqual({ shooting: 1 });
  });

  it('abandons a final penalty before it can hijack the real Through Ball and First Touch boards', () => {
    for (const board of ['Through Ball', 'First Touch']) {
      const v = mount('CM'); open(v, 'Penalty Placement');
      for (let n = 0; n < 4; n++) { click(v, 'Shoot bottom middle'); advance(1100); }
      click(v, 'Shoot bottom middle'); advance(400); click(v, '‹ Drills'); click(v, 'Practice rules'); open(v, board);
      const selector = board === 'Through Ball' ? '[data-through-ball-board]' : '[data-first-touch-board]';
      expect(v.container.querySelector('[data-practice-rules]'), 'extra boards show their own rules without the abandoned legacy help').toBeNull();
      expect(paused(v)).toBe('false');
      expect(v.container.querySelector(selector)).toHaveAttribute('data-phase', 'intro');
      advance(10000); noResult(v);
      expect(v.container.querySelector(selector), 'the selected actual board survives the abandoned final reveal').toHaveAttribute('data-phase', 'intro');
      noBank(v); v.unmount();
    }
  });

  it('reopens a clean penalty run without an old reveal advancing the new counter', () => {
    const v = mount(); open(v, 'Penalty Placement'); click(v, 'Shoot bottom middle'); advance(400);
    click(v, '‹ Drills'); open(v, 'Penalty Placement'); click(v, 'Shoot bottom left');
    advance(700);
    expect(text(v), 'the old reveal cannot advance the reopened attempt').toContain('Penalty 1/5');
    expect(feedback(v)).toHaveTextContent('Saved! Keeper guessed right.');
    advance(399); expect(text(v)).toContain('Penalty 1/5'); advance(1);
    expect(text(v)).toContain('Penalty 2/5'); expect(text(v)).toContain('0 scored'); noBank(v);
  });

  it('cancels passing gate deadlines and random draws as soon as Drills is chosen', () => {
    const v = mount(); open(v, 'Passing Gates'); click(v, /Tap to start the passing drill/); advance(450);
    const draws = vi.mocked(Math.random).mock.calls.length;
    click(v, '‹ Drills');
    expect(vi.getTimerCount(), 'abandoned gates own no live timers').toBe(0);
    advance(20000); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); noResult(v); noBank(v);
    open(v, 'Passing Gates'); expect(text(v)).toContain('Pass 1/8'); expect(text(v)).toContain('0 through');
  });

  it('cancels keeper setup tell and reveal timers on every route back to Drills', () => {
    for (const stage of ['setup', 'tell', 'reveal']) {
      const v = mount('GK'); open(v, 'Shot Stopping');
      if (stage === 'tell') advance(600);
      if (stage === 'reveal') { advance(1250); click(v, 'Dive bottom left'); }
      const draws = vi.mocked(Math.random).mock.calls.length;
      click(v, '‹ Drills');
      expect(vi.getTimerCount(), `${stage} keeper timer stops on exit`).toBe(0);
      advance(10000); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); noResult(v); noBank(v); v.unmount();
    }
  });

  it('allows leaving an active sprint and cancels both running stopwatches before reopening', () => {
    for (const drill of ['Cone Slalom', 'Sprint Burst']) {
      const v = mount(); open(v, drill);
      click(v, drill === 'Cone Slalom' ? '1' : /Tap to start the 5 second sprint/); advance(500);
      click(v, '‹ Drills');
      expect(v.container.querySelector('[data-soccer-practice-screen]'), 'Drills works during the active timed run').toHaveAttribute('data-soccer-practice-screen', 'menu');
      expect(vi.getTimerCount(), 'abandoned stopwatch stops immediately').toBe(0);
      advance(10000); noResult(v); open(v, drill);
      expect(text(v)).toContain(drill === 'Cone Slalom' ? '0.0s' : '5.0s'); noBank(v); v.unmount();
    }
  });

  it('holds the remaining penalty reveal through blur rules and explicit resume without accepting paused shots', () => {
    const v = mount(); open(v, 'Penalty Placement'); click(v, 'Shoot bottom middle'); advance(400); blur();
    expect(paused(v), 'focus loss visibly pauses the active practice').toBe('true');
    const draws = vi.mocked(Math.random).mock.calls.length;
    advance(5000); click(v, 'Shoot top left'); expect(feedback(v)).toHaveTextContent('GOAL!');
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    click(v, 'Practice rules'); expect(v.container.querySelector('[data-practice-rules]')).toBeInTheDocument();
    expect(v.getByRole('button', { name: 'Resume practice' })).toBeDisabled();
    click(v, 'Practice rules'); act(() => window.dispatchEvent(new Event('focus'))); advance(5000);
    expect(paused(v), 'closing help and returning focus need an explicit resume').toBe('true');
    expect(text(v)).toContain('Penalty 1/5'); resume(v); advance(699); expect(feedback(v)).toBeInTheDocument(); advance(1);
    expect(text(v)).toContain('Penalty 2/5'); expect(feedback(v)).toBeNull();
    pause(v); click(v, 'Shoot top left'); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); noBank(v);
  });

  it('freezes a running penalty when rules open and preserves its last seven hundred milliseconds', () => {
    const v = mount(); open(v, 'Penalty Placement'); click(v, 'Shoot bottom middle'); advance(400);
    click(v, 'Practice rules'); advance(5000);
    expect(paused(v), 'opening the actual rules pauses the active reveal').toBe('true');
    expect(text(v)).toContain('Penalty 1/5'); expect(feedback(v)).toHaveTextContent('GOAL!');
    click(v, 'Practice rules'); advance(1000); expect(text(v)).toContain('Penalty 1/5');
    resume(v); advance(699); expect(feedback(v)).toBeInTheDocument(); advance(1); expect(text(v)).toContain('Penalty 2/5'); noBank(v);
  });

  it('preserves keeper setup tell and reveal remainders then banks the actual five saves', () => {
    const v = mount('GK'); open(v, 'Shot Stopping'); advance(300); pause(v); advance(5000);
    expect(text(v)).not.toContain('He is shaping up...'); resume(v); advance(299); expect(text(v)).not.toContain('He is shaping up...'); advance(1);
    expect(text(v)).toContain('He is shaping up...'); advance(300); pause(v); advance(5000);
    click(v, 'Dive bottom left'); expect(text(v)).toContain('0 saved'); resume(v); advance(349); expect(text(v)).not.toContain('SHOT! Dive!'); advance(1);
    pause(v); click(v, 'Dive bottom left'); expect(text(v), 'a paused keeper cannot save the revealed shot').toContain('0 saved'); resume(v);
    click(v, 'Dive bottom left'); advance(400); pause(v); advance(5000); expect(feedback(v)).toHaveTextContent('SAVED!');
    resume(v); advance(699); expect(text(v)).toContain('Shot 1/5'); advance(1); expect(text(v)).toContain('Shot 2/5');
    for (let n = 1; n < 5; n++) { advance(650); click(v, 'Dive bottom left'); advance(1100); }
    result(v, 'shooting', 100); expect(applyTrainingResult(v.career, 'shooting', 100).statBoostNextSeason).toEqual({ reflexes: 2 });
  });

  it('preserves gate closing and between pass delays while paused taps cannot earn hits', () => {
    const v = mount(); open(v, 'Passing Gates'); click(v, /Tap to start the passing drill/); advance(450); pause(v);
    const draws = vi.mocked(Math.random).mock.calls.length; fireEvent.click(gate(v)); advance(5000);
    expect(text(v), 'paused input cannot score a passing gate').toContain('0 through'); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    resume(v); advance(949); expect(text(v)).toContain('Pass 1/8'); fireEvent.click(gate(v)); advance(100); pause(v); advance(5000);
    expect(text(v)).toContain('1 through'); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    resume(v); advance(249); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); advance(1);
    for (let n = 1; n < 8; n++) { fireEvent.click(gate(v)); if (n < 7) advance(350); }
    result(v, 'passing', 100);
  });

  it('excludes paused wall time and paused cone taps from the real slalom score', () => {
    const v = mount(); open(v, 'Cone Slalom'); click(v, '1'); click(v, '8'); advance(1000); blur();
    click(v, '2'); click(v, '8'); advance(20000);
    expect(text(v), 'paused cones preserve current cone slips and stopwatch').toContain('Cone 2/8'); expect(text(v)).toContain('1 slips'); expect(text(v)).toContain('1.0s');
    resume(v); advance(4300); for (let n = 2; n <= 8; n++) click(v, String(n));
    result(v, 'dribbling', 82);
  });

  it('preserves sprint time and real step score across hidden focus and paused input', () => {
    const v = mount(); open(v, 'Sprint Burst'); click(v, /Tap to start the 5 second sprint/);
    for (let n = 0; n < 20; n++) click(v, /GO GO GO/); advance(2000);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); act(() => document.dispatchEvent(new Event('visibilitychange')));
    for (let n = 0; n < 10; n++) click(v, /GO GO GO/); advance(20000);
    expect(paused(v), 'hidden practice is visibly paused').toBe('true'); expect(text(v)).toContain('3.0s'); expect(text(v)).toContain('20 steps'); noResult(v);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange'))); advance(1000); expect(text(v)).toContain('3.0s');
    resume(v); advance(2999); noResult(v); advance(1); result(v, 'pace', 64);
  });

  it('ignores paused start buttons until the player explicitly resumes the new run', () => {
    for (const drill of ['Sprint Burst', 'Passing Gates']) {
      const v = mount(); open(v, drill); pause(v);
      const start = drill === 'Sprint Burst' ? /Tap to start the 5 second sprint/ : /Tap to start the passing drill/;
      const draws = vi.mocked(Math.random).mock.calls.length;
      click(v, start); advance(10000);
      expect(v.queryByRole('button', { name: start }), 'paused start leaves the initial board intact').toBeInTheDocument();
      expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); noResult(v); noBank(v);
      resume(v); click(v, start); expect(v.queryByRole('button', { name: start })).toBeNull(); v.unmount();
    }
  });

  it('cancels pending work on Close and unmount without extra callbacks or random draws', () => {
    for (const exit of ['Close', 'unmount']) for (const drill of ['Penalty Placement', 'Shot Stopping', 'Passing Gates', 'Sprint Burst', 'Cone Slalom']) {
      const v = mount(drill === 'Shot Stopping' ? 'GK' : 'ST'); open(v, drill);
      if (drill === 'Penalty Placement') click(v, 'Shoot bottom middle');
      if (drill === 'Passing Gates') click(v, /Tap to start the passing drill/);
      if (drill === 'Sprint Burst') click(v, /Tap to start the 5 second sprint/);
      if (drill === 'Cone Slalom') click(v, '1');
      const draws = vi.mocked(Math.random).mock.calls.length;
      if (exit === 'Close') click(v, 'Close'); else v.unmount();
      expect(vi.getTimerCount(), `${exit} cancels ${drill} work immediately`).toBe(0);
      advance(20000); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); noBank(v);
      expect(v.onClose).toHaveBeenCalledTimes(exit === 'Close' ? 1 : 0); v.unmount();
    }
  });

  it('retains the independent engine gain and fresh midfielder drill baseline', () => {
    for (const position of ['ST', 'GK']) for (const score of [49, 50, 79, 80, 100]) {
      const career = fixture(position), snapshot = JSON.stringify(career), after = applyTrainingResult(career, 'shooting', score);
      const boost = score >= 80 ? 2 : score >= 50 ? 1 : 0;
      expect(after.statBoostNextSeason).toEqual(boost ? { [position === 'GK' ? 'reflexes' : 'shooting']: boost } : {});
      expect(after.morale).toBe(boost ? 52 : 50); expect(after.trainingSeasonYear).toBe(2031);
      expect(applyTrainingResult(after, 'shooting', 100)).toBe(after); expect(JSON.stringify(career)).toBe(snapshot);
    }
    expect(drillForPosition('CM')).toBe('throughball'); expect(drillForPosition('CAM')).toBe('throughball');
    expect(drillStatFor('throughball', 'CM').label).toBe('Passing');
  });
});
