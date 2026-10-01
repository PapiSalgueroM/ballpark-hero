import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import feedback from '@/components/soccer-career/TrainingFeedback.module.css';
import type { CareerState } from '@/lib/soccerCareerEngine';

const fixture = (position = 'ST') => ({ position } as CareerState);
const handlers = () => ({ onComplete: vi.fn(), onDrill: vi.fn(), onClose: vi.fn() });
const draw = (career: CareerState, callbacks: ReturnType<typeof handlers>, available = true) => (
  <TrainingPanel career={career} available={available} {...callbacks} />
);
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const zones = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-training-zone]')];
const open = (view: ReturnType<typeof render>, label: string) => fireEvent.click(view.getByRole('button', { name: new RegExp(label) }));
const markers = (view: ReturnType<typeof render>, shot: number, dive: number) => {
  const ball = view.container.querySelector('[data-training-marker="ball"]');
  const glove = view.container.querySelector('[data-training-marker="glove"]');
  expect(ball).toHaveClass(feedback.marker);
  expect(glove).toHaveClass(feedback.marker);
  expect(ball?.closest('[data-training-zone]')).toHaveAttribute('data-training-zone', String(shot));
  expect(glove?.closest('[data-training-zone]')).toHaveAttribute('data-training-zone', String(dive));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Soccer Career training feedback', () => {
  it('keeps unavailable legacy drills and the opening menu quiet with unchanged close controls', () => {
    const callbacks = handlers();
    const view = render(draw(fixture(), callbacks, false));
    expect(view.getByText('Already trained this season')).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /Penalty Placement/ })).toBeNull();
    expect(view.getByRole('button', { name: /Wall Shot/ })).toBeEnabled();
    expect(view.container.querySelector('[data-training-feedback], [data-training-summary], [data-training-banked], [data-training-marker]')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Close' }));
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(callbacks.onDrill).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'goal', shot: 4, result: 'GOAL!', tone: 'success', goals: 1, overbar: false },
    { label: 'saved', shot: 3, result: 'Saved! Keeper guessed right.', tone: 'miss', goals: 0, overbar: false },
    { label: 'over-bar', shot: 0, result: 'Blazed over the bar!', tone: 'miss', goals: 0, overbar: true },
  ])('reveals the exact $label penalty and its real zones without replacing controls', ({ shot, result, tone, goals, overbar }) => {
    const career = fixture();
    const callbacks = handlers();
    const view = render(draw(career, callbacks));
    open(view, 'Penalty Placement');
    const before = zones(view);
    expect(before).toHaveLength(6);
    expect(view.container.querySelector('[data-training-feedback]')).toBeNull();
    if (overbar) vi.mocked(Math.random).mockReturnValueOnce(0.5).mockReturnValueOnce(0.01);
    before[shot].focus();
    fireEvent.click(before[shot]);
    const response = view.container.querySelector('[data-training-feedback]');
    expect(response).toHaveTextContent(result);
    expect(response).toHaveAttribute('data-training-feedback', tone);
    expect(response).toHaveClass(tone === 'success' ? feedback.success : feedback.miss);
    expect(view.getByText(`${goals} scored`)).toBeInTheDocument();
    markers(view, shot, 3);
    expect(zones(view)).toEqual(before);
    expect(document.activeElement).toBe(before[shot]);
    const randomCalls = vi.mocked(Math.random).mock.calls.length;
    fireEvent.click(before[4]);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(randomCalls);
    expect(view.getByText(`${goals} scored`)).toBeInTheDocument();
    expect(before.every(button => !button.disabled)).toBe(true);
    view.rerender(draw({ ...career }, callbacks));
    expect(view.container.querySelector('[data-training-feedback]')).toBe(response);
    expect(document.activeElement).toBe(before[shot]);
    advance(1099);
    expect(response).toBeInTheDocument();
    advance(1);
    expect(view.container.querySelector('[data-training-feedback], [data-training-marker]')).toBeNull();
    expect(view.getByText('Penalty 2/5')).toBeInTheDocument();
    expect(zones(view)).toEqual(before);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(callbacks.onDrill).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'saved', dive: 3, saved: true, result: 'SAVED! What a stop!' },
    { label: 'wrong-way', dive: 4, saved: false, result: 'In the net. Wrong way.' },
  ])('reveals the exact $label keeper outcome after the existing tell and shot timing', ({ dive, saved, result }) => {
    const career = fixture('GK');
    const callbacks = handlers();
    const view = render(draw(career, callbacks));
    open(view, 'Shot Stopping');
    const before = zones(view);
    advance(599);
    expect(view.queryByText('He is shaping up...')).toBeNull();
    advance(1);
    expect(view.getByText('He is shaping up...')).toBeInTheDocument();
    advance(649);
    expect(view.queryByText('SHOT! Dive!')).toBeNull();
    advance(1);
    expect(view.getByText('SHOT! Dive!')).toBeInTheDocument();
    before[dive].focus();
    fireEvent.click(before[dive]);
    const response = view.container.querySelector('[data-training-feedback]');
    expect(response).toHaveTextContent(result);
    expect(response).toHaveClass(saved ? feedback.success : feedback.miss);
    expect(view.getByText(`${saved ? 1 : 0} saved`)).toBeInTheDocument();
    markers(view, 3, dive);
    expect(zones(view)).toEqual(before);
    expect(document.activeElement).toBe(before[dive]);
    const randomCalls = vi.mocked(Math.random).mock.calls.length;
    fireEvent.click(before[3]);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(randomCalls);
    expect(view.getByText(`${saved ? 1 : 0} saved`)).toBeInTheDocument();
    view.rerender(draw({ ...career }, callbacks));
    expect(view.container.querySelector('[data-training-feedback]')).toBe(response);
    advance(1099);
    expect(response).toBeInTheDocument();
    advance(1);
    expect(view.container.querySelector('[data-training-feedback], [data-training-marker]')).toBeNull();
    expect(view.getByText('Shot 2/5')).toBeInTheDocument();
    expect(zones(view)).toEqual(before);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it.each([
    { drill: 'dribbling', label: 'Cone Slalom', position: 'ST', score: 60, tier: 'Solid work. +1 Dribbling next season' },
    { drill: 'pace', label: 'Sprint Burst', position: 'ST', score: 96, tier: 'Elite session! +2 Pace next season' },
    { drill: 'shooting', label: 'Penalty Placement', position: 'ST', score: 60, tier: 'Solid work. +1 Shooting next season' },
    { drill: 'shooting', label: 'Shot Stopping', position: 'GK', score: 80, tier: 'Elite session! +2 Reflexes next season' },
    { drill: 'passing', label: 'Passing Gates', position: 'ST', score: 75, tier: 'Solid work. +1 Passing next season' },
    { drill: 'pace', label: 'Sprint Burst', position: 'ST', score: 0, tier: 'Rough day. No gains this time' },
  ])('reveals the exact $label $score result and banks it once with immediate stable controls', ({ drill, label, position, score, tier }) => {
    const career = fixture(position);
    const original = JSON.stringify(career);
    const callbacks = handlers();
    const view = render(draw(career, callbacks));
    open(view, label);
    if (drill === 'dribbling') {
      for (let i = 0; i < 5; i++) fireEvent.click(view.getByRole('button', { name: '2' }));
      for (let i = 1; i <= 8; i++) fireEvent.click(view.getByRole('button', { name: String(i) }));
    } else if (drill === 'pace') {
      fireEvent.click(view.getByRole('button', { name: /Tap to start the 5 second sprint/ }));
      if (score) for (let i = 0; i < 30; i++) fireEvent.click(view.getByRole('button', { name: /GO GO GO/ }));
      advance(5000);
    } else if (drill === 'shooting' && position === 'GK') {
      advance(1250);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(zones(view)[i === 4 ? 4 : 3]);
        advance(1100);
        if (i < 4) advance(650);
      }
    } else if (drill === 'shooting') {
      for (const zone of [4, 3, 4, 3, 4]) { fireEvent.click(zones(view)[zone]); advance(1100); }
    } else {
      fireEvent.click(view.getByRole('button', { name: /Tap to start the passing drill/ }));
      for (let i = 0; i < 8; i++) {
        const lit = view.getByRole('button', { name: '🚩' });
        const gates = [...lit.parentElement!.querySelectorAll<HTMLButtonElement>('button')];
        expect(gates).toHaveLength(6);
        fireEvent.click(i < 6 ? lit : gates.find(button => button !== lit)!);
        if (i < 7) advance(350);
      }
    }
    const summary = view.container.querySelector('[data-training-summary]');
    expect(summary).toHaveClass(feedback.result);
    expect(view.container.querySelector('[data-training-result]')).toHaveAttribute('data-training-result', drill);
    expect(view.container.querySelector('[data-training-score]')).toHaveTextContent(String(score));
    expect(view.getByText(tier)).toBeInTheDocument();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    const bank = view.getByRole('button', { name: 'Bank the session' });
    expect(bank).toBeEnabled();
    expect(bank.closest('[data-training-summary]')).toBeNull();
    bank.focus();
    view.rerender(draw({ ...career }, callbacks));
    expect(view.container.querySelector('[data-training-summary]')).toBe(summary);
    expect(view.getByRole('button', { name: 'Bank the session' })).toBe(bank);
    expect(bank).toHaveFocus();
    fireEvent.click(bank);
    expect(callbacks.onComplete).toHaveBeenCalledExactlyOnceWith(drill, score);
    const back = view.getByRole('button', { name: 'Back to your career' });
    expect(back).toBe(bank);
    expect(back).toBeEnabled();
    expect(back).toHaveClass(feedback.banked);
    expect(back).toHaveFocus();
    expect(view.queryByRole('button', { name: 'Bank the session' })).toBeNull();
    view.rerender(draw({ ...career }, callbacks, false));
    expect(view.getByRole('button', { name: 'Back to your career' })).toBe(back);
    expect(view.container.querySelector('[data-training-summary]')).toBe(summary);
    fireEvent.click(back);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onDrill).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(original);
  });
});
