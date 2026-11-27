import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import BreakThePressBoard from '@/components/soccer-career/BreakThePressBoard';
import { CUP_KEY } from '@/lib/soccerTransitionCup';

afterEach(() => { cleanup(); localStorage.clear(); });
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));

it('resumes inside a defensive passage, preserves practice, and gives both outcomes from the same draw', () => {
  const key = 'dukb-press-practice-v1:outlet';
  localStorage.setItem(key, '[1,3,4]');
  render(<BreakThePressBoard onBack={() => {}} />);
  click(/^Transition Cup/);
  expect(screen.getByText(/^Example: if the ball is at C2/)).toBeVisible();
  click('Start cup');
  const pass = (n: number) => fireEvent.keyDown(screen.getByRole('group', { name: 'Passing pitch' }), { key: String(n) });
  [2, 4, 5].forEach(pass);
  click('Hold at E3');
  expect(screen.getByText(/Pass 2 of 4. Ball at C2/)).toBeVisible();
  expect(button('Spend recovery at C3')).toBeDisabled();
  const snapshot = localStorage.getItem(CUP_KEY);
  cleanup();
  render(<BreakThePressBoard onBack={() => {}} />);
  click(/^Transition Cup/);
  click('Resume quarterfinal');
  expect(screen.getByText(/Pass 2 of 4. Ball at C2/)).toBeVisible();
  click('Use recovery run');
  click('Spend recovery at C3');
  expect(screen.getByText(/1-0, counter intercepted/)).toBeVisible();
  expect(screen.getByText('Recovery run used')).toBeVisible();
  click('Back to practice');
  expect(button(/^Transition Cup/)).toHaveFocus();
  expect(screen.getByText('Personal best · 3 passes')).toBeVisible();

  localStorage.setItem(CUP_KEY, snapshot!);
  click(/^Transition Cup/);
  click('Resume quarterfinal');
  for (let i = 0; i < 3; i++) click('Hold at E3');
  expect(screen.getByText(/Level at 1-1/)).toBeVisible();
  for (let i = 0; i < 3; i++) click('Hold at A3');
  expect(screen.getByRole('heading', { name: 'Cup run ended' })).toHaveFocus();
  expect(screen.getByText(/1-1, tiebreak conceded/)).toBeVisible();
  click('Replay the same draw');
  expect(screen.getByText(/Your attack · Find the outlet/)).toBeVisible();
  expect(localStorage.getItem(CUP_KEY)).toBe('[]');
  expect(localStorage.getItem(key)).toBe('[1,3,4]');
});

it('reopens the latest cup when another tab has already moved', () => {
  render(<BreakThePressBoard onBack={() => {}} />);
  click(/^Transition Cup/);
  click('Start cup');
  localStorage.setItem(CUP_KEY, '[1,3,4,13]');
  click(/^Pass to 2/);
  expect(localStorage.getItem(CUP_KEY)).toBe('[1,3,4,13]');
  click('Resume quarterfinal');
  expect(screen.getByText(/You defend from D3/)).toBeVisible();
});
