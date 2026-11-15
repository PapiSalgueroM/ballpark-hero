import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AcademyProspects from '@/components/tycoon/AcademyProspects';
import { deserialize, newFactory, sellProspect, serialize, tick, YEAR_SEC } from '@/lib/wonderkidFactory';

const now = 1700000000000;
const academy = () => {
  const state = newFactory(now, 26);
  for (let second = 0; second < 1945; second += 1) tick(state, 1);
  return state;
};
const actions = { doSell: vi.fn(), doPromote: vi.fn() };

afterEach(cleanup);

it('shows which age-23 prospect can wait through save, reload and away time', () => {
  const state = academy();
  const restored = deserialize(serialize(state), now)!;
  expect(restored).toEqual(state);
  expect(restored.deadlineIn).toBe(55);
  expect(sellProspect(structuredClone(restored), 1)).toBe(242);
  expect(sellProspect(structuredClone(restored), 3)).toBe(332);
  const view = render(<AcademyProspects s={restored} {...actions} />);
  const departure = 'Leaves in 36s of play · Deadline too late';
  const chance = 'Leaves in 156s of play · Deadline first (55s)';
  expect(screen.getByText(departure)).toBeVisible();
  expect(screen.getByText(chance)).toBeVisible();

  tick(restored, 90, { offline: true });
  view.rerender(<AcademyProspects s={restored} {...actions} />);
  expect(screen.getByText(departure)).toBeVisible();
  expect(screen.getByText(chance)).toBeVisible();

  for (let second = 0; second < 55; second += 1) tick(restored, 1);
  expect(restored.leftFree).toBe(state.leftFree + 1);
  expect(sellProspect(structuredClone(restored), 1)).toBeNull();
  expect(sellProspect(structuredClone(restored), 3)).toBe(498);
  view.rerender(<AcademyProspects s={restored} {...actions} />);
  expect(screen.queryByText(departure)).not.toBeInTheDocument();
  expect(screen.getByText('Leaves in 101s of play · Deadline bonus active')).toBeVisible();
});

it.each([
  { deadline: 12, hint: 'Deadline too late', canSell: false },
  { deadline: 11.75, hint: 'Deadline first (12s)', canSell: true },
])('reads the exact boundary when the next deadline is $deadline seconds away', ({ deadline, hint, canSell }) => {
  const state = academy();
  const player = state.prospects.find(prospect => prospect.id === 1)!;
  player.ageClock = YEAR_SEC - 12;
  state.deadlineIn = deadline;

  const view = render(<AcademyProspects s={state} {...actions} />);
  expect(screen.getByText('Leaves in 12s of play · ' + hint)).toBeVisible();
  tick(state, deadline);

  expect(state.deadlineLeft).toBeGreaterThan(0);
  expect(sellProspect(structuredClone(state), player.id)).toBe(canSell ? 362 : null);
  view.rerender(<AcademyProspects s={state} {...actions} />);
  if (canSell) expect(screen.getByText('Leaves in 1s of play · Deadline bonus active')).toBeVisible();
  else expect(screen.queryByText(player.name)).not.toBeInTheDocument();
});
