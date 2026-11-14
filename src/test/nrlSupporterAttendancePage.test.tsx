import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import { createNrlCareer, reduceNrlCareer, type NrlCareerAction } from '@/lib/nrlCareer';

afterEach(cleanup);

it('previews simulated attendance, commits the optional season policy and explains the locked choice', () => {
  let state = createNrlCareer('broncos', 1);
  const dispatch = (action: NrlCareerAction) => {
    const next = reduceNrlCareer(state, action);
    if (next === state) return false;
    state = next;
    return true;
  };
  const office = () => <NrlCareerOffice career={state} screen="finances" onAction={dispatch} disabled={false} />;
  const view = render(office());
  const card = screen.getByText('Supporter attendance', { selector: 'summary span' }).closest('details')!;
  card.open = true;
  const inside = within(card);
  expect(inside.getByText(/No club matches played yet/)).toBeVisible();
  expect(inside.getByText(/Round 1 home gate/)).toBeVisible();
  fireEvent.click(inside.getByRole('button', { name: 'Enable supporter attendance' }));
  expect(state.finance.supporterAttendance).toBe(true);
  view.rerender(office());
  expect(inside.getByRole('button', { name: 'Disable supporter attendance' })).toBeEnabled();
  dispatch({ type: 'advance' });
  view.rerender(office());
  expect(inside.getByText(/Locked for this season/)).toBeVisible();
  expect(inside.getByRole('button', { name: 'Disable supporter attendance' })).toBeDisabled();
});
