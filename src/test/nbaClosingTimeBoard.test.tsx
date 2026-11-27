import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import NbaClosingTime from '@/components/nba-my-career/NbaClosingTime';
import { CLOSING_KEY } from '@/lib/nbaClosingTime';

afterEach(() => { cleanup(); localStorage.clear(); });
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));

it('plays the three-game set in the practice room and reopens the same five-second inbound', async () => {
  render(<NbaClosingTime />);
  click('Closing Time');
  expect(screen.getByText(/^Example: with five seconds/)).toBeVisible();
  click('Start closing set');
  for (const action of ['Cut to rim', 'Shoot from rim', 'Protect the rim', 'Pass to corner', 'Shoot from corner', 'Deny the corner', 'Hold to the horn']) click(action);
  expect(screen.getByText(/Two for one · 99-96/)).toBeVisible();
  click('Next situation');
  click('Deny the corner');
  click('Hold to the horn');
  click('Next situation');
  click('Foul to stop the clock');
  const saved = localStorage.getItem(CLOSING_KEY);
  cleanup();
  render(<NbaClosingTime />);
  click('Closing Time');
  click('Resume closing set');
  expect(screen.getByText('Q4 0:05')).toBeVisible();
  expect(localStorage.getItem(CLOSING_KEY)).toBe(saved);
  click('Advance with timeout');
  expect(button('Advance with timeout')).toBeDisabled();
  click('Pass to corner');
  click('Shoot from corner');
  click('Protect the rim');
  expect(screen.getByText('3 of 3 won in regulation.')).toBeVisible();
  expect(screen.getByText(/One timeout left · 104-103/)).toBeVisible();
  click('Back to career');
  await waitFor(() => expect(button('Closing Time')).toHaveFocus());
  click('Closing Time');
  click('Open set results');
  click('Replay the same set');
  expect(screen.getByText('Q4 0:39')).toBeVisible();
});

it('keeps another tab’s committed possession when the current room is stale', () => {
  render(<NbaClosingTime />);
  click('Closing Time');
  click('Start closing set');
  localStorage.setItem(CLOSING_KEY, '["rim","shoot"]');
  click('Pass to corner');
  expect(screen.getByText(/This set changed in another tab/)).toBeVisible();
  expect(localStorage.getItem(CLOSING_KEY)).toBe('["rim","shoot"]');
  click('Resume closing set');
  expect(screen.getByRole('group', { name: 'Defensive half court' })).toBeVisible();
});
