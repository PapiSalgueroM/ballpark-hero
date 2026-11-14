import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createNrlCareer, nrlSelectionPromiseCandidates, reduceNrlCareer, type NrlCareerAction } from '@/lib/nrlCareer';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';

afterEach(cleanup);

it('previews and explicitly confirms one selection promise, then shows saved progress and the renewal discount', () => {
  let state = createNrlCareer('broncos', 1);
  const player = nrlSelectionPromiseCandidates(state).find(row => Object.values(state.season.lineup).includes(row.id))!;
  const dispatch = (action: NrlCareerAction) => {
    const next = reduceNrlCareer(state, action);
    if (next === state) return false;
    state = next;
    return true;
  };
  const office = () => <NrlCareerOffice career={state} screen="contracts" onAction={dispatch} disabled={false} />;
  const view = render(office());
  const card = screen.getByText('Selection promise', { selector: 'summary span' }).closest('details')!;
  card.open = true;
  const input = within(card).getByLabelText('Player to make a promise to');
  fireEvent.change(input, { target: { value: player.id } });
  expect(state.selectionPromise).toBeUndefined();
  fireEvent.click(within(card).getByRole('button', { name: 'Confirm selection promise' }));
  expect(state.selectionPromise?.playerId).toBe(player.id);
  view.rerender(office());
  expect(within(card).getByText(/0 of 4 appearances/)).toBeVisible();
  for (let index = 0; index < 4; index++) dispatch({ type: 'advance' });
  view.rerender(office());
  expect(within(card).getByText(/Promise kept/)).toBeVisible();
  expect(within(card).getByRole('status')).toHaveTextContent('Their renewal asking salary is up to 5% lower.');
  expect(within(card).queryByRole('button', { name: 'Confirm selection promise' })).toBeNull();
});
