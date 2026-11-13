import './dailyReload/mocks';
import { act, cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import missingXi from './dailyReload/missing-xi.driver';
import { button, click, typeInto } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

it('keeps the Daily lineup date and save together across Eastern midnight', async () => {
  resetMocks();
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T04:59:58Z'));
  const page = await missingXi.mount();
  const view = within(page.container);
  const caption = /Same puzzle for everyone/;
  expect(view.getByText(caption)).toHaveTextContent('2026-11-11');
  expect(view.getByText('Germany 0-2 Italy, AET')).toBeVisible();

  vi.setSystemTime(new Date('2026-11-12T05:00:02Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  await click(button(page.container, /^∞ Unlimited$/));
  expect(view.queryByText(caption)).toBeNull();
  expect(view.getByText('2011 Champions League Final')).toBeVisible();
  await missingXi.enterDaily(page);
  expect(view.getByText('Germany 0-2 Italy, AET')).toBeVisible();
  expect(view.getByText(caption)).toHaveTextContent('2026-11-11');

  await typeInto(view.getByRole('combobox'), 'Gennaro Gattuso');
  const answer = await view.findByRole('option', { name: /^Gennaro Gattuso$/ });
  await act(async () => { fireEvent.pointerDown(answer); });
  await click(button(page.container, /^Lock in guess$/));
  expect(view.getByText(/Gennaro Gattuso was the missing CM/)).toBeVisible();
  expect(view.getByText(caption)).toHaveTextContent('2026-11-11');
  expect(JSON.parse(localStorage.getItem('missing-xi-daily-2026-11-11') ?? 'null')).toEqual({
    v: 1, date: '2026-11-11', puzzleIndex: 0, guesses: [{ t: 'won' }], gameStatus: 'won',
  });
  expect(localStorage.getItem('missing-xi-daily-2026-11-12')).toBeNull();
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/missing-xi', 100, 'Tester', 1);

  missingXi.unmount(page);
  const fresh = within((await missingXi.mount()).container);
  expect(fresh.getByText(caption)).toHaveTextContent('2026-11-12');
  expect(fresh.getByText('FC Koln 1-2 Bayern Munich (title clinched)')).toBeVisible();
  expect(fresh.getByText('Guess 1 of 3')).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});
