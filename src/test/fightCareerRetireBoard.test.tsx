/**
 * Round 1546: Fight Career retires when you say. On the board: the gate holds
 * below ten fights, "Retire now" ends the career on the verdict with one
 * completion that a reload does not pay again, the career goes on the past
 * fighters list once, and "Start again" sits behind a confirm and records
 * nothing.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FightCareerBoard from '@/components/fight-career/FightCareerBoard';
import { newFightCareer, runCamp, takeFight, RETIRE_MIN_FIGHTS, type FightCareerState } from '@/lib/fightCareer';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const KEY = 'fight-career-save-v1';
const PAST = 'fight-career-past-v1';
const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const LOOKS = ['box', 'press', 'counter'] as const;

/* A career of n tune ups, saved the way a player from before the life layer
   left it, so the hub opens with no card waiting in front of the offers. */
function careerOf(n: number, name: string): FightCareerState {
  let st = newFightCareer(name, 'welter', 'outboxer', `retire-board-${name}`);
  for (let i = 0; i < n; i += 1) st = takeFight(runCamp(st, PLAN), st.offers[0].id, [...LOOKS])!.state;
  expect(st.retired).toBe(false);
  expect(st.fightNo).toBe(n);
  return st;
}

beforeEach(() => { localStorage.clear(); vi.mocked(recordCompletion).mockClear(); });
afterEach(() => cleanup());

describe('Fight Career board, hanging them up', () => {
  it('keeps the door shut below the gate', async () => {
    localStorage.setItem(KEY, JSON.stringify({ st: careerOf(3, 'Too Soon'), phase: 'hub' }));
    const view = render(<FightCareerBoard />);
    await view.findByText('Too Soon');
    const retire = view.getByRole('button', { name: 'Retire' }) as HTMLButtonElement;
    expect(retire.disabled).toBe(true);
    expect(view.container.textContent).toContain(`after ${RETIRE_MIN_FIGHTS} fights, ${RETIRE_MIN_FIGHTS - 3} to go`);
  });

  it('retires on the verdict, pays it once across a reload, and keeps the career on the list', async () => {
    const st = careerOf(RETIRE_MIN_FIGHTS, 'Walks Away');
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'hub' }));
    let view = render(<FightCareerBoard />);
    await view.findByText('Walks Away');
    fireEvent.click(view.getByRole('button', { name: 'Retire' }));
    fireEvent.click(view.getByRole('button', { name: 'Yes, hang them up' }));
    expect(await view.findByText('Final verdict')).toBeTruthy();
    expect(view.container.textContent).toContain(`He called time himself after ${RETIRE_MIN_FIGHTS} fights.`);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.st.retired).toBe(true);
    expect(saved.st.retiredBy).toBe('choice');
    expect(JSON.parse(localStorage.getItem(PAST)!)).toHaveLength(1);

    /* A reload lands on the same verdict and pays nothing, and lists nothing twice. */
    cleanup();
    view = render(<FightCareerBoard />);
    expect(await view.findByText('Final verdict')).toBeTruthy();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(PAST)!)).toHaveLength(1);

    /* A new fighter: the old one is on the setup screen. */
    fireEvent.click(view.getByRole('button', { name: /Start a new fighter/ }));
    expect(await view.findByText('Your past fighters')).toBeTruthy();
    expect(view.container.textContent).toContain('Walks Away');
    expect(view.container.textContent).toContain('walked away');
  });

  it('asks before starting again, and starting again records nothing', async () => {
    localStorage.setItem(KEY, JSON.stringify({ st: careerOf(4, 'Second Thoughts'), phase: 'hub' }));
    const view = render(<FightCareerBoard />);
    await view.findByText('Second Thoughts');
    fireEvent.click(view.getByRole('button', { name: 'Start again' }));
    expect(localStorage.getItem(KEY)).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Keep this career' }));
    expect(view.getByText('Second Thoughts')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Start again' }));
    fireEvent.click(view.getByRole('button', { name: 'Yes, start again' }));
    expect(await view.findByText('Turn professional')).toBeTruthy();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(PAST)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
