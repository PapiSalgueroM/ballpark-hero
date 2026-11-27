import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReturnToPlayDeskCard, ReturnToPlayMatchCard } from '@/components/club-manager/ReturnToPlayCard';
import { startCareer, type CareerState } from '@/lib/clubManager';
import { returnToPlayDesk } from '@/lib/clubManagerReturnToPlay';

afterEach(cleanup);

it('books and cancels a first appearance plan through the treatment room', () => {
  const opening = startCareer('Liverpool');
  const player = opening.squad.find(man => man.name === 'Cody Gakpo')!;
  expect(player).toBeDefined();
  let career = { ...opening, squad: opening.squad.map(man => man.id === player.id ? { ...man, injuryWeeks: 3 } : man) };
  const commit = (make: (current: CareerState) => CareerState | null) => {
    const next = make(career);
    if (!next) return false;
    career = next;
    return true;
  };
  const view = render(<ReturnToPlayDeskCard career={career} onCommit={commit} />);
  const desk = screen.getByRole('region', { name: 'Plan a return from injury' });
  fireEvent.click(within(desk).getByText('Return rules and example'));
  expect(desk).toHaveTextContent('he records 16 minutes');
  fireEvent.click(within(desk).getByRole('radio', { name: /Managed start/ }));
  fireEvent.click(within(desk).getByRole('button', { name: 'Book managed start' }));
  expect(returnToPlayDesk(career).active).toMatchObject({ player: { name: player.name }, plan: 'managed-start', status: 'recovering' });
  expect(career.squad.find(man => man.id === player.id)?.injuryWeeks).toBe(3);
  const booked = JSON.parse(JSON.stringify(career)) as CareerState;
  career = booked;
  view.rerender(<><ReturnToPlayDeskCard career={career} onCommit={commit} /><ReturnToPlayMatchCard career={career} /></>);
  expect(desk).toHaveTextContent('Awaiting clearance');
  expect(screen.queryByText(/First appearance plan/)).toBeNull();
  fireEvent.click(within(desk).getByRole('button', { name: 'Cancel return plan' }));
  view.rerender(<ReturnToPlayDeskCard career={career} onCommit={commit} />);
  expect(returnToPlayDesk(career).active).toBeNull();
  expect(screen.getByRole('button', { name: /Book / })).toBeVisible();
});
