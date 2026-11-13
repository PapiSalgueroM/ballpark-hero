import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import { createNrlCareer, reduceNrlCareer, type NrlCareerAction } from '@/lib/nrlCareer';

afterEach(cleanup);

it('shows payback before charging and presents the paid investment and projected income after confirmation', () => {
  let career = createNrlCareer('bears', 4, 2027);
  const onAction = vi.fn((action: NrlCareerAction) => {
    career = reduceNrlCareer(career, action);
    return true;
  });
  const office = () => <NrlCareerOffice career={career} screen="finances" onAction={onAction} disabled={false} />;
  const { rerender } = render(office());
  const card = within(screen.getByRole('region', { name: 'Home-ground concessions' }));
  expect(card.getByText(/10 home matches to break even/)).toBeVisible();
  expect(card.getByText(/Scheduled payback/)).toBeVisible();
  fireEvent.click(card.getByRole('button', { name: 'Review concessions upgrade' }));
  expect(onAction).not.toHaveBeenCalled();
  fireEvent.click(card.getByRole('button', { name: 'Cancel' }));
  expect(onAction).not.toHaveBeenCalled();
  fireEvent.click(card.getByRole('button', { name: 'Review concessions upgrade' }));
  fireEvent.click(card.getByRole('button', { name: 'Confirm $250,000 upgrade' }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: 'upgradeConcessions', year: 2027, clubId: 'bears', round: 1 });
  rerender(office());
  expect(card.getByText('Paid. Opens next round.')).toBeVisible();
  expect(card.queryByRole('button', { name: 'Review concessions upgrade' })).not.toBeInTheDocument();
  expect(screen.getByText('Concessions upgrade', { exact: true })).toBeVisible();
  fireEvent.click(screen.getByText('Season cash forecast'));
  expect(screen.getByText('Estimated concessions income')).toBeVisible();
});
