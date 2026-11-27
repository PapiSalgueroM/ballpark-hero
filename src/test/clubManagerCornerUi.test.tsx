import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CornerTrainingCard } from '@/components/club-manager/CornerTrainingCard';
import { RehearsedCornerReview } from '@/components/club-manager/RehearsedCornerReview';
import { bookCornerRoutine, cornerTrainingDesk, startCareer, type CornerRoutine, type PlayEvent } from '@/lib/clubManager';

afterEach(cleanup);

it('quotes the cost, passes two named starters to a single booking and distinguishes spent training', () => {
  const career = startCareer('Brentford');
  const eligible = cornerTrainingDesk(career, 'right');
  const order: CornerRoutine = { kind: 'short', flag: 'right', takerId: eligible.taker!.id, targetId: eligible.targets[0].id };
  const onBook = vi.fn(() => true), onCancel = vi.fn(() => true), onChooseTaker = vi.fn();
  const props = { onBook, onCancel, onChooseTaker };
  const view = render(<CornerTrainingCard career={career} {...props} />);
  fireEvent.click(screen.getByText('Corner routines'));
  fireEvent.click(screen.getByRole('button', { name: 'Corner routine rules' }));
  expect(screen.getByText(/send a centre-back to the far post/i)).toBeVisible();
  fireEvent.change(screen.getByLabelText('Corner flag'), { target: { value: 'right' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Short corner' }));
  expect(screen.getByRole('button', { name: 'Book corner session' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Target player'), { target: { value: order.targetId } });
  expect(onBook).not.toHaveBeenCalled();
  expect(screen.getByText(/spend up to 3 fitness points/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Book corner session' }));
  expect(onBook).toHaveBeenCalledWith(order, career);
  const booked = bookCornerRoutine(career, order)!;
  view.rerender(<CornerTrainingCard career={booked} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel corner session' }));
  expect(onCancel).toHaveBeenCalledWith(booked);
  const ready = { ...booked, cornerTraining: { ...booked.cornerTraining!, readyWeek: booked.week,
    paid: { taker: 2, target: 3 } } };
  view.rerender(<CornerTrainingCard career={ready} {...props} />);
  expect(screen.getByText(/used 2 fitness from the taker and 3 from the target/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Stand down routine' }));
  expect(onCancel).toHaveBeenLastCalledWith(ready);
});

it('opens the taker assignment when a flag has no eligible starter', () => {
  const career = startCareer('Brentford');
  career.setPieces = { ...career.setPieces!, cornersLeft: null };
  const go = vi.fn();
  render(<CornerTrainingCard career={career} onBook={() => false} onCancel={() => false} onChooseTaker={go} />);
  fireEvent.click(screen.getByText('Corner routines'));
  fireEvent.click(screen.getByRole('button', { name: 'Choose corner taker' }));
  expect(go).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Book corner session' })).toBeDisabled();
});

const routine: CornerRoutine = { kind: 'short', flag: 'left', takerId: 'wing', targetId: 'runner' };
const corner: PlayEvent = { minute: 39, side: 'me', kind: 'corner', who: 'Wide player', flank: 'left',
  cornerDelivery: { ...routine, id: '39a', target: 'Box runner', read: false, outcome: 'shot' } };
const shot: PlayEvent = { minute: 39, side: 'me', kind: 'shot', who: 'Wide player', cornerChance: '39a', on: true, goal: true };
const otherGoal: PlayEvent = { minute: 39, side: 'me', kind: 'shot', who: 'Other scorer', goal: true };

it('links a finish to its delivery, reads a later review and leaves the live score to the match clock', () => {
  const later: PlayEvent = { ...corner, minute: 79,
    cornerDelivery: { ...corner.cornerDelivery!, id: '79b', read: true, outcome: 'disallowed' } };
  const review: PlayEvent = { minute: 79, kind: 'var', side: 'me', who: 'Wide player', cornerChance: '79b',
    review: { id: '79b-review', incident: 'goal', decision: 'disallowed', reason: 'ruled_out' } };
  const confirmed: PlayEvent = { ...review, minute: 39, cornerChance: '39a',
    review: { id: '39a-review', incident: 'goal', decision: 'confirmed', reason: 'clear' } };
  const play = [later, otherGoal, confirmed, review, shot, corner];
  const view = render(<RehearsedCornerReview play={play} routine={routine} />);
  const region = screen.getByRole('region', { name: 'Rehearsed corners' });
  expect(region).toHaveTextContent('Wide player scored.');
  expect(region).not.toHaveTextContent('ruled out');
  expect(region).not.toHaveTextContent('Other scorer');
  fireEvent.click(within(region).getByRole('button', { name: 'Next corner' }));
  expect(region).toHaveTextContent('defence was ready');
  expect(region).toHaveTextContent('goal was ruled out');
  view.rerender(<RehearsedCornerReview play={[corner, shot]} routine={routine} live />);
  const live = screen.getByRole('region', { name: 'Latest rehearsed corner' });
  expect(live).toHaveTextContent('led to a chance');
  expect(live).not.toHaveTextContent('scored');
  view.rerender(<RehearsedCornerReview play={[otherGoal]} routine={routine} />);
  expect(screen.getByRole('region', { name: 'Rehearsed corners' })).toHaveTextContent('0 rehearsed deliveries');
});
