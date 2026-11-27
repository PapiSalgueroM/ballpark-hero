import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SignThePlayer from '@/pages/SignThePlayer';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

beforeEach(() => {
  vi.useFakeTimers();
  // Both rivals pass at list price and the first rival takes the discount.
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([true, false])('settles a discounted lot exactly once (take it yourself: %s)', async take => {
  render(<HelmetProvider><MemoryRouter><SignThePlayer /></MemoryRouter></HelmetProvider>);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /All-Time Legends/ })); });
  fireEvent.click(screen.getByRole('button', { name: 'Pass' }));
  const opening = screen.getByRole('heading', { level: 2 }).textContent!;
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  // Play the two rivals' passes, then the first price drop.
  tick(350 + 460 + 460 + 950);
  const discounted = screen.getByRole('button', { name: /Take him at/ });
  const price = discounted.textContent!.replace('Take him at ', '');
  if (take) fireEvent.click(discounted);
  tick(500 + 650);
  const sales = screen.getAllByText(text => text.startsWith('✅ SOLD! ' + opening + ' to '));
  expect(sales).toHaveLength(1);
  expect(sales[0]).toHaveTextContent(`to ${take ? 'You' : 'The Sheikh'} for ${price}.`);
  expect(screen.getByText(/Lot 2\/22/)).toBeInTheDocument();
});
