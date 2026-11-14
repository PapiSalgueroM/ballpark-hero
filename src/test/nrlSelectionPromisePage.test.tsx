import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createNrlCareer, nrlSelectionPromiseCandidates, readNrlCareerSave, reduceNrlCareer, type NrlCareerAction } from '@/lib/nrlCareer';
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

it('previews the discount forfeiture, can back out and keeps the ended receipt after reload', () => {
  const initial = createNrlCareer('broncos', 1);
  const player = nrlSelectionPromiseCandidates(initial).find(row => Object.values(initial.season.lineup).includes(row.id))!;
  let state = reduceNrlCareer(initial, { type: 'makeSelectionPromise', year: 2026, clubId: 'broncos', round: 1, playerId: player.id });
  for (let i = 0; i < 3; i++) state = reduceNrlCareer(state, { type: 'advance' });
  const pending = state;
  const actions: NrlCareerAction[] = [];
  const dispatch = (action: NrlCareerAction) => {
    actions.push(action);
    const next = reduceNrlCareer(state, action);
    if (next === state) return false;
    state = next;
    return true;
  };
  const office = () => <NrlCareerOffice career={state} screen="contracts" onAction={dispatch} disabled={false} />;
  const view = render(office());
  const card = screen.getByText('Selection promise', { selector: 'summary span' }).closest('details')!;
  card.open = true;
  const panel = within(card);
  fireEvent.click(panel.getByRole('button', { name: 'End selection promise' }));
  expect(panel.getByText(/gives up its renewal discount/)).toBeVisible();
  expect(state).toBe(pending);
  fireEvent.click(panel.getByRole('button', { name: 'Keep promise' }));
  expect(actions).toHaveLength(0);
  fireEvent.click(panel.getByRole('button', { name: 'End selection promise' }));
  fireEvent.click(panel.getByRole('button', { name: 'Confirm end' }));
  const bytes = JSON.stringify(state);
  state = readNrlCareerSave(bytes)!;
  view.rerender(office());
  expect(panel.getByRole('status')).toHaveTextContent('Promise ended in Round 4. The normal asking salary applies.');
  expect(panel.queryByRole('button', { name: 'End selection promise' })).not.toBeInTheDocument();
  expect(panel.queryByRole('button', { name: 'Confirm selection promise' })).not.toBeInTheDocument();
  expect(JSON.stringify(state)).toBe(bytes);
});
