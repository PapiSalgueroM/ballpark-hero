import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PhaseShapePicker } from '@/components/club-manager/PhaseShapePicker';
import { PhaseShapeReview } from '@/components/club-manager/PhaseShapeReview';
import { startCareer, type PlayEvent } from '@/lib/clubManager';
import { phasePositions, type PhaseMove, type PhaseOrder } from '@/lib/clubManagerPhaseShapes';

const order: PhaseOrder = {
  v: 1, withBall: 'secure-3-2-5', withoutBall: 'screen-4-1-4-1', outlet: 'near', recovery: 'screen',
};

afterEach(cleanup);

it('assigns the actual ten outfield players on the selected pitch, with both editable shapes and a recovery view', () => {
  const career = startCareer('Brentford');
  const positionsFor = (draft: PhaseOrder) => phasePositions(career, undefined, undefined, draft);
  const preview = positionsFor(order);
  expect(new Set(preview.rows.map(row => row.playerId)).size).toBe(10);
  const choose = vi.fn();
  const view = render(<PhaseShapePicker order={null} positionsFor={positionsFor} onChange={choose} />);
  const disclosure = screen.getByText('Shapes by phase').closest('details')!;
  disclosure.open = true;
  fireEvent(disclosure, new Event('toggle'));
  fireEvent.click(screen.getByRole('button', { name: 'Shape rules and example' }));
  expect(screen.getByText(/tired player who steps up/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Use separate shapes' }));
  expect(choose).toHaveBeenLastCalledWith(order);
  view.rerender(<PhaseShapePicker order={order} positionsFor={positionsFor} onChange={choose} />);
  const picker = screen.getByRole('region', { name: 'Shapes by phase' });
  fireEvent.change(within(picker).getByLabelText('With the ball', { selector: 'select' }), { target: { value: 'wide-2-3-5' } });
  expect(choose).toHaveBeenLastCalledWith({ ...order, withBall: 'wide-2-3-5' });
  fireEvent.change(within(picker).getByLabelText('When their keeper starts a move'), { target: { value: 'challenge' } });
  expect(choose).toHaveBeenLastCalledWith({ ...order, recovery: 'challenge' });
  fireEvent.click(within(picker).getByRole('button', { name: 'Recovery runs' }));
  expect(screen.getByText('From attack back into defensive shape')).toBeVisible();
  fireEvent.click(within(picker).getByText('Player assignments'));
  expect(within(picker).getAllByRole('listitem')).toHaveLength(10);
  expect(within(picker).getByText(new RegExp(preview.rows[0].name))).toBeVisible();
  expect(within(picker).getAllByText(/pitch units/)).toHaveLength(10);
  fireEvent.click(within(picker).getByRole('button', { name: 'Return to one shape' }));
  expect(choose).toHaveBeenLastCalledWith(null);
});

it('links a phase chance by recorded move even when another player shoots in the same minute', () => {
  const positions = phasePositions(startCareer('Brentford'), undefined, undefined, order);
  const actor = positions.rows[0];
  const keeper = positions.keeper!;
  const move: PhaseMove = {
    id: 'save-to-outlet-1', phase: 'outlet', order, keeper, actor,
    other: { name: positions.rows[1].name }, outcome: 'released', lane: 'left', cover: 2, effort: 1, spent: 1,
    support: 3, screenedLane: false, highPressure: false,
  };
  const events: PlayEvent[] = [
    { minute: 90, plus: 2, kind: 'shot', side: 'opp', who: move.other.name, on: true, phaseMove: move },
    { minute: 90, plus: 2, kind: 'shot', side: 'me', who: 'Unrelated finisher', on: true, goal: true },
    { minute: 90, plus: 2, kind: 'shot', side: 'me', who: actor.name, on: true, goal: true, phaseChance: move.id },
  ];
  const history = [{ minute: 0, order, positions }];
  const view = render(<PhaseShapeReview live play={events} />);
  expect(screen.getByRole('region')).toHaveTextContent('The move led to a chance.');
  expect(screen.getByRole('region')).not.toHaveTextContent('scored.');
  view.rerender(<PhaseShapeReview play={events} history={history} />);
  expect(screen.getByRole('region')).toHaveTextContent(`${actor.name} scored.`);
  expect(screen.getByRole('region')).not.toHaveTextContent('Unrelated finisher');
  expect(screen.getByRole('region')).toHaveTextContent('1 fitness spent');
  expect(screen.getByRole('region')).toHaveTextContent('3 nearby passing options');
  expect(screen.getByRole('region')).toHaveTextContent("90+2'");
  view.rerender(<PhaseShapeReview play={[{ ...events[0], phaseMove: { ...move, actor: null } } as unknown as PlayEvent]} />);
  expect(screen.queryByRole('region')).toBeNull();
});
