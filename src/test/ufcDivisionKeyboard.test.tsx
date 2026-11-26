import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import UfcDivisionRun from '@/components/ufc/UfcDivisionRun';
import { DIVISION_RUN_KEY, readDivisionRun } from '@/lib/ufcDivisionRun';

afterEach(() => {
  cleanup();
  localStorage.removeItem(DIVISION_RUN_KEY);
});

it('ignores Enter on a dismissed search and keeps focus into the next round', () => {
  localStorage.removeItem(DIVISION_RUN_KEY);
  const view = render(<UfcDivisionRun />);
  fireEvent.click(view.getByRole('button', { name: /^Welterweight/ }));
  const saved = () => readDivisionRun(localStorage.getItem(DIVISION_RUN_KEY))!;
  const run = saved();
  const wrong = run.pool.find(fighter => !run.targets.includes(fighter.name))!.name;
  const input = () => view.getByRole('textbox', { name: 'Search for a fighter' });
  input().focus();
  fireEvent.change(input(), { target: { value: wrong } });
  const match = view.getByRole('button', { name: name => name.startsWith(wrong) });
  fireEvent.keyDown(input(), { key: 'Escape' });
  expect(match).not.toBeInTheDocument();
  fireEvent.keyDown(input(), { key: 'Enter' });
  expect(saved().picks).toEqual([]);
  fireEvent.change(input(), { target: { value: run.targets[0] } });
  fireEvent.keyDown(input(), { key: 'Enter' });
  expect(view.getByRole('heading', { name: /Fighter 2 of 3/ })).toBeVisible();
  expect(saved().picks).toEqual([run.targets[0]]);
  expect(input()).toHaveFocus();
});
