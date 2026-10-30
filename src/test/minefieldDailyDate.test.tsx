import './dailyReload/mocks';
import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Minefield from '@/pages/Minefield';
import { dayNumber, getTodayET } from '@/lib/dateUtils';
import {
  buildRun, loadDailyResult, maxRunScore, saveDailyResult, ROUNDS_PER_RUN,
} from '@/lib/minefield';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { button, click, mountPage, type MountedPage } from './dailyReload/harness';

type Run = ReturnType<typeof buildRun>;

function identity(run: Run) {
  return run.map(round => ({
    category: round.category.id,
    tiles: round.tiles.map(tile => tile.name),
  }));
}

// Pick real adjacent runs with a witnessed difference in their exact available scores.
function dayPair() {
  for (let day = 1; day < 31; day += 1) {
    const d0 = `2026-10-${String(day).padStart(2, '0')}`;
    const d1 = `2026-10-${String(day + 1).padStart(2, '0')}`;
    const run0 = buildRun(dayNumber(d0));
    const run1 = buildRun(dayNumber(d1));
    if (maxRunScore(run0) !== maxRunScore(run1)
      && JSON.stringify(identity(run0)[0].tiles) !== JSON.stringify(identity(run1)[0].tiles)) {
      expect(maxRunScore(run0), 'fixture has different exact daily totals').not.toBe(maxRunScore(run1));
      expect(identity(run0)[0].tiles, 'fixture has different actual first-board tile order').not.toEqual(identity(run1)[0].tiles);
      return { d0, d1, run0, run1 };
    }
  }
  throw new Error('No adjacent October 2026 Minefield score witness in the actual source pool');
}

function clock(day: string, time: string) {
  vi.setSystemTime(new Date(`${day}T${time}-04:00`));
  expect(getTodayET()).toBe(day);
}

function grid(page: MountedPage) {
  const element = page.container.querySelector('div.grid.grid-cols-2');
  expect(element, 'actual Minefield tile grid').not.toBeNull();
  return element!;
}

function expectBoard(page: MountedPage, run: Run, index: number, owner: string) {
  const round = run[index];
  const tiles = Array.from(grid(page).querySelectorAll('button'));
  expect(tiles.map(tile => tile.textContent?.trim()), `${owner}: ordered board identity ${index + 1}`)
    .toEqual(round.tiles.map(tile => tile.name));
  expect(page.container.textContent).toContain(round.category.title);
  expect(page.container.textContent).toContain(round.category.hint);
  expect(page.container.textContent).toContain(`Board ${index + 1}/${ROUNDS_PER_RUN}`);
  expect(tiles.every(tile => !tile.disabled)).toBe(true);
}

async function finishRun(page: MountedPage, run: Run, owner: string) {
  for (let index = 0; index < run.length; index += 1) {
    expectBoard(page, run, index, owner);
    for (const tile of run[index].tiles) {
      if (tile.isMine) continue;
      const actual = Array.from(grid(page).querySelectorAll('button'))
        .find(candidate => candidate.textContent?.trim() === tile.name);
      expect(actual, `actual correct tile ${tile.name}`).toBeDefined();
      expect(actual!.disabled).toBe(false);
      await click(actual!);
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(run[index].tiles.length * 70 + 601);
    });
    await click(button(page.container, /^Next board|^See final score$/));
  }
}

function expectResult(page: MountedPage, score: number, roundsWon: number, run: Run, owner: string) {
  const paragraphs = Array.from(page.container.querySelectorAll('p'))
    .map(element => (element.textContent ?? '').replace(/\s+/g, ' ').trim());
  expect(paragraphs).toContain(`${score} pts`);
  const sweep = roundsWon === ROUNDS_PER_RUN ? ' · FLAWLESS SWEEP 🔥' : '';
  expect(paragraphs, `${owner}: restored mount-day maximum`).toContain(
    `${roundsWon}/${ROUNDS_PER_RUN} boards cleared · max was ${maxRunScore(run)}${sweep}`,
  );
}

function dailyKeys() {
  return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => key !== null && key.startsWith('minefield-daily-')).sort();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  localStorage.clear();
  resetMocks();
  consumeRestoredFinish('minefield');
});

afterEach(() => {
  cleanup();
  consumeRestoredFinish('minefield');
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Minefield daily date ownership', () => {
  it('MF-DATE-01: delayed Daily Boards keeps mount-day identities and saves that day', async () => {
    const pair = dayPair();
    clock(pair.d0, '23:59:59');
    const page = mountPage(<Minefield />, '/minefield');
    clock(pair.d1, '00:00:01');
    await click(button(page.container, /^Daily Boards$/));

    await finishRun(page, pair.run0, 'MF-DATE-01');
    const score = maxRunScore(pair.run0);
    expectResult(page, score, ROUNDS_PER_RUN, pair.run0, 'MF-DATE-01');
    expect(loadDailyResult(pair.d0)).toEqual({ score, roundsWon: ROUNDS_PER_RUN });
    expect(loadDailyResult(pair.d1)).toBeNull();
    expect(dailyKeys()).toEqual([`minefield-daily-${pair.d0}`]);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('MF-DATE-02: another tab finish after rollover restores mount-day score and real maximum', async () => {
    const pair = dayPair();
    clock(pair.d0, '23:59:59');
    const page = mountPage(<Minefield />, '/minefield');
    clock(pair.d1, '00:00:01');
    const score = maxRunScore(pair.run0);
    saveDailyResult(pair.d0, { score, roundsWon: ROUNDS_PER_RUN });
    await click(button(page.container, /^Daily Boards$/));

    expectResult(page, score, ROUNDS_PER_RUN, pair.run0, 'MF-DATE-02');
    expect(loadDailyResult(pair.d0)).toEqual({ score, roundsWon: ROUNDS_PER_RUN });
    expect(dailyKeys()).toEqual([`minefield-daily-${pair.d0}`]);
    expect(recordCompletion).not.toHaveBeenCalled();
  }, 15_000);

  it('MF-DATE-03: same-day finish restores once and a new-day reload deals its own boards', async () => {
    const pair = dayPair();
    clock(pair.d0, '12:00:00');
    const first = mountPage(<Minefield />, '/minefield');
    await click(button(first.container, /^Daily Boards$/));
    await finishRun(first, pair.run0, 'MF-DATE-03');
    const score = maxRunScore(pair.run0);
    expectResult(first, score, ROUNDS_PER_RUN, pair.run0, 'MF-DATE-03');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    first.unmount();

    const restored = mountPage(<Minefield />, '/minefield');
    expectResult(restored, score, ROUNDS_PER_RUN, pair.run0, 'MF-DATE-03');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    restored.unmount();

    clock(pair.d1, '12:00:00');
    const nextDay = mountPage(<Minefield />, '/minefield');
    await click(button(nextDay.container, /^Daily Boards$/));
    expectBoard(nextDay, pair.run1, 0, 'MF-DATE-03');
    expect(loadDailyResult(pair.d1)).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('MF-DATE-04: Unlimited keeps random boards and does not save a daily finish', async () => {
    const pair = dayPair();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const run = buildRun();
    random.mockClear();
    clock(pair.d0, '23:59:59');
    const page = mountPage(<Minefield />, '/minefield');
    clock(pair.d1, '00:00:01');
    await click(button(page.container, /^Unlimited$/));
    expect(random).toHaveBeenCalled();
    await finishRun(page, run, 'MF-DATE-04');
    expectResult(page, maxRunScore(run), ROUNDS_PER_RUN, run, 'MF-DATE-04');
    expect(dailyKeys()).toEqual([]);
    expect(recordCompletion).not.toHaveBeenCalled();

    random.mockReturnValue(0.75);
    const newRun = buildRun();
    expect(identity(newRun), 'positive random-board reset witness').not.toEqual(identity(run));
    random.mockClear();
    await click(button(page.container, /^New boards$/));
    expect(random).toHaveBeenCalled();
    expectBoard(page, newRun, 0, 'MF-DATE-04');
    expect(page.container.textContent).toContain('0 pts');
    expect(dailyKeys()).toEqual([]);
    expect(recordCompletion).not.toHaveBeenCalled();
  }, 15_000);
});
