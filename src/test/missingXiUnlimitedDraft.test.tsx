import './dailyReload/mocks';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MissingXi from '@/pages/MissingXi';
import { getTodayET } from '@/lib/dateUtils';
import { pickDailyPuzzle } from '@/lib/missingXi';
import { click, mountPage, typeInto } from './dailyReload/harness';
import { recordCompletion } from '@/lib/completions';

const draftKey = 'dukb-missing-xi-unlimited-v1';
const dailyKey = () => 'missing-xi-daily-' + getTodayET();
const unlimited = () => screen.getByRole('button', { name: /^∞ Unlimited$/ });
const daily = () => screen.getByRole('button', { name: /^📅 Daily$/ });
const guess = (number: number) => screen.getByText('Guess ' + number + ' of 3');
const tried = 'Already tried: Gianluigi Buffon';

async function mount() {
  const page = mountPage(<MissingXi />, '/missing-xi');
  const dismiss = screen.queryByRole('button', { name: "Let's Play!" });
  if (dismiss) await click(dismiss);
  return page;
}

async function miss() {
  await typeInto(screen.getByRole('combobox'), 'Gianluigi Buffon');
  fireEvent.pointerDown(await screen.findByRole('option', { name: 'Gianluigi Buffon' }));
  await click(screen.getByRole('button', { name: 'Lock in guess' }));
  expect(guess(2)).toBeInTheDocument();
  expect(screen.getByText(tried)).toBeInTheDocument();
}

beforeEach(() => { localStorage.clear(); vi.mocked(recordCompletion).mockClear(); vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps the open Daily on its dealt Eastern date and opens a fresh board after midnight', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    vi.setSystemTime(new Date('2026-11-27T04:59:45Z'));
    const original = pickDailyPuzzle();
    const firstKey = dailyKey();
    const page = await mount();
    expect(screen.getByText(/2026-11-26\. Same puzzle/)).toBeInTheDocument();
    vi.setSystemTime(new Date('2026-11-27T05:00:15Z'));
    await miss();
    expect(screen.getByText(/2026-11-26\. Same puzzle/)).toBeInTheDocument();
    expect(screen.getByText(original.lineup.dateLabel)).toBeInTheDocument();
    await click(screen.getByRole('button', { name: 'Give up' }));
    await click(screen.getByRole('button', { name: 'Yes, reveal it' }));
    expect(JSON.parse(localStorage.getItem(firstKey)!)).toMatchObject({ date: '2026-11-26', gameStatus: 'lost' });
    expect(localStorage.getItem(dailyKey())).toBeNull();
    expect(screen.getByRole('link', { name: "Play today's lineup" })).toHaveAttribute('href', '/missing-xi');
    page.unmount();
    await mount();
    expect(screen.getByText(/2026-11-27\. Same puzzle/)).toBeInTheDocument();
    expect(screen.getByText(pickDailyPuzzle().lineup.dateLabel)).toBeInTheDocument();
    expect(pickDailyPuzzle().lineup.id).not.toBe(original.lineup.id);
    expect(guess(1)).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it('restores the exact Unlimited clue, accepted miss and guess count after a remount', async () => {
  const page = await mount();
  await click(unlimited());
  await miss();
  expect(screen.getByText(/Nationality: Argentina/)).toBeInTheDocument();
  const original = localStorage.getItem(dailyKey());
  page.unmount();

  await mount();
  expect(guess(2)).toBeInTheDocument();
  expect(screen.getByText(tried)).toBeInTheDocument();
  expect(screen.getByText(/Nationality: Argentina/)).toBeInTheDocument();
  expect(screen.getByText(/Showing Barcelona's XI/)).toBeInTheDocument();
  expect(localStorage.getItem(dailyKey())).toBe(original);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('keeps Daily selected through a remount and resumes the saved Unlimited round on switching back', async () => {
  const page = await mount();
  await click(unlimited());
  await miss();
  await click(daily());
  page.unmount();

  await mount();
  expect(screen.getByText(/Daily lineup/)).toBeInTheDocument();
  await click(unlimited());
  expect(guess(2)).toBeInTheDocument();
  expect(screen.getByText(tried)).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'New Lineup' }));
  expect(guess(1)).toBeInTheDocument();
  expect(screen.queryByText(tried)).toBeNull();
  await click(screen.getByRole('button', { name: 'Give up' }));
  await click(screen.getByRole('button', { name: 'Yes, reveal it' }));
  expect(localStorage.getItem(draftKey)).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('ignores an invalid archive choice until a player starts an Unlimited round', async () => {
  const invalid = '{"lineupId":"missing-lineup","slotIndex":0,"misses":["Gianluigi Buffon"],"active":true}';
  localStorage.setItem(draftKey, invalid);
  await mount();
  expect(screen.getByText(/Daily lineup/)).toBeInTheDocument();
  expect(localStorage.getItem(draftKey)).toBe(invalid);
  await click(unlimited());
  expect(guess(1)).toBeInTheDocument();
  expect(screen.queryByText(tried)).toBeNull();
  expect(localStorage.getItem(draftKey)).not.toBe(invalid);
});
