import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import NbaPage from '@/pages/PerfectSeasonNba';
import { getDailyDateET, loadDailyAttempt, type SpinSquad } from '@/lib/perfectSeason';
import { fetchSquad, fetchTeamSeasonIndex, type NbaTeamSeasonEntry } from '@/lib/perfectSeasonNba';
import { simulateSeasonFair } from '@/lib/perfectSeasonExpansion';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  getCurrentPlayerName: () => 'Daily date fixture guest',
}));
vi.mock('@/lib/perfectSeasonNba', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: vi.fn(),
  fetchSquad: vi.fn(),
}));
vi.mock('@/lib/perfectSeasonExpansion', async original => {
  const actual = await original<typeof import('@/lib/perfectSeasonExpansion')>();
  return { ...actual, simulateSeasonFair: vi.fn(actual.simulateSeasonFair) };
});

const title = "keeps the mounted Eastern day's wheel and season after midnight";
const previousDate = '2026-11-09';
const nextDate = '2026-11-10';
const beforeMidnight = '2026-11-10T04:59:40.000Z';
const afterMidnight = '2026-11-10T05:00:01.000Z';
const slots = ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'] as const;
const rating = 80;
type Slot = typeof slots[number];

function seasonRows(start: number, prefix: string): NbaTeamSeasonEntry[] {
  return Array.from({ length: 8 }, (_, offset) => {
    const year = start + offset;
    const team = prefix + String(offset + 1).padStart(2, '0');
    return {
      season: String(year) + '-' + String(year + 1).slice(-2),
      team,
      teamName: 'Daily Date Club ' + team,
    };
  });
}

const index = [...seasonRows(2015, 'MOD'), ...seasonRows(2000, 'MID')];

function playerName(team: string, slot: Slot) {
  return ['Daily Date Fixture', team, slot].join(' ');
}

function squadFor(entry: NbaTeamSeasonEntry): SpinSquad {
  return {
    squadId: entry.team,
    teamName: entry.teamName,
    year: Number(entry.season.slice(0, 4)) + 1,
    players: slots.map(slot => ({
      playerId: entry.team + '-' + slot,
      name: playerName(entry.team, slot),
      rating,
      eligible: [slot === 'SIXTH' ? 'PG' : slot, 'SIXTH'],
      detail: 'Synthetic archive player',
    })),
  };
}

async function tick(ms = 10) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function journey(mountAt: string, enterAt: string) {
  localStorage.clear();
  vi.clearAllMocks();
  vi.setSystemTime(new Date(mountAt));
  const mountInstant = new Date().toISOString();
  const mountET = getDailyDateET();
  const view = render(<MemoryRouter initialEntries={['/perfect-season-nba']}><NbaPage /></MemoryRouter>);
  try {
    const dailyButton = screen.getByRole('button', { name: /^Daily\b/ });
    const archiveRequestsBeforeEntry = vi.mocked(fetchTeamSeasonIndex).mock.calls.length;
    vi.setSystemTime(new Date(enterAt));
    const entryInstant = new Date().toISOString();
    const entryET = getDailyDateET();
    fireEvent.click(dailyButton);
    await tick();
    const theme = screen.queryByText(/^Today's theme:/)?.textContent?.trim() ?? null;

    const wheel = [];
    for (const [step, slot] of slots.entries()) {
      fireEvent.click(screen.getByRole('button', { name: step === 0 ? 'Spin the wheel' : 'Next spin' }));
      await tick(1600);
      const archiveRow = vi.mocked(fetchSquad).mock.calls.at(-1)?.[0];
      if (!archiveRow) throw new Error('Wheel did not request an archive row');
      const landed = screen.getByText('You landed on').nextElementSibling?.textContent?.trim() ?? null;
      const player = screen.getByText(playerName(archiveRow.team, slot));
      const pickButton = player.closest('button');
      if (!pickButton || pickButton.disabled) throw new Error('Draft did not offer the intended player');
      const pickedPlayer = player.textContent?.trim() ?? null;
      fireEvent.click(pickButton);
      const slotButton = screen.queryByRole('button', { name: slot, exact: true });
      if (slotButton) fireEvent.click(slotButton);
      await tick();
      const lineup = screen.queryByRole('complementary');
      const lineupPlayer = lineup
        ? within(lineup).getByText(slot, { exact: true }).nextElementSibling?.textContent?.trim() ?? null
        : null;
      wheel.push({ slot, archiveRow, landed, pickedPlayer, lineupPlayer });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
    await tick();
    const calls = vi.mocked(simulateSeasonFair).mock;
    const simulation = calls.calls.map(([sport, overall, games, seed], i) => ({
      sport, overall, games, seed, result: calls.results[i].value,
    }));
    return {
      mountInstant, entryInstant, mountET, entryET, finishET: getDailyDateET(), archiveRequestsBeforeEntry,
      indexRequests: vi.mocked(fetchTeamSeasonIndex).mock.calls.map(([options]) => options),
      theme, wheel, simulation,
      resultText: view.container.querySelector('[data-result-score]')?.textContent?.trim() ?? null,
      savedAttempts: {
        [previousDate]: loadDailyAttempt('nba', previousDate),
        [nextDate]: loadDailyAttempt('nba', nextDate),
      },
      completions: vi.mocked(recordCompletion).mock.calls.slice(),
    };
  } finally {
    view.unmount();
  }
}

type Journey = Awaited<ReturnType<typeof journey>>;

function checkFinished(run: Journey, date: string, theme: string, otherDate: string) {
  expect(run.archiveRequestsBeforeEntry).toBe(0);
  expect(run.indexRequests).toEqual([{ oldWheel: false }]);
  expect(run.wheel.map(stop => stop.slot)).toEqual(slots);
  for (const [step, stop] of run.wheel.entries()) {
    expect(stop.landed).toBe(stop.archiveRow.season + ' ' + stop.archiveRow.teamName);
    expect(stop.pickedPlayer).toBe(playerName(stop.archiveRow.team, stop.slot));
    expect(stop.lineupPlayer).toBe(step === slots.length - 1 ? null : stop.pickedPlayer);
  }
  expect(run.simulation).toHaveLength(1);
  const [{ sport, overall, games, result }] = run.simulation;
  expect({ sport, overall, games }).toEqual({ sport: 'nba', overall: 80, games: 82 });
  expect(result.games).toHaveLength(82);
  expect(result.games.every(value => typeof value === 'boolean')).toBe(true);
  expect(result.wins).toBe(result.games.filter(Boolean).length);
  expect(result.wins + result.losses).toBe(82);
  expect(run.resultText).toBe(result.wins + '-' + result.losses);
  expect(run.savedAttempts[date]).toEqual({
    v: 1, date, sim: result, overall: 80, spins: 6, teamNames: run.wheel.map(stop => stop.landed), themeId: theme,
  });
  expect(run.savedAttempts[otherDate]).toBeNull();
  expect(run.completions).toEqual([['/perfect-season-nba', result.wins, 'Daily date fixture guest']]);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(fetchTeamSeasonIndex).mockResolvedValue(index);
  vi.mocked(fetchSquad).mockImplementation(async entry => squadFor(entry));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

describe('NBA Perfect Season Daily date', () => {
  it(title, async () => {
    const before = await journey(beforeMidnight, beforeMidnight);
    const crossover = await journey(beforeMidnight, afterMidnight);
    const after = await journey(afterMidnight, afterMidnight);
    const rawPath = process.env.NBA_DAILY_DATE_RAW;
    if (rawPath) {
      mkdirSync(dirname(rawPath), { recursive: true });
      writeFileSync(rawPath, JSON.stringify({
        schema: 'nba-perfect-season-daily-date-v1',
        title,
        fixture: { source: 'Synthetic NBA archive fixtures', slots, index, rating },
        journeys: { before, crossover, after },
      }) + '\n');
    }

    expect([before.mountET, before.entryET, before.finishET]).toEqual([previousDate, previousDate, previousDate]);
    expect([crossover.mountET, crossover.entryET, crossover.finishET]).toEqual([previousDate, nextDate, nextDate]);
    expect([after.mountET, after.entryET, after.finishET]).toEqual([nextDate, nextDate, nextDate]);
    expect(before.theme).toBe("Today's theme: Three-Point Boom");
    expect(crossover.theme).toBe(before.theme);
    expect(after.theme).toBe("Today's theme: 2000s Basketball");
    checkFinished(before, previousDate, 'three-point-boom', nextDate);
    checkFinished(crossover, previousDate, 'three-point-boom', nextDate);
    checkFinished(after, nextDate, 'two-thousands-nba', previousDate);
    expect(before.simulation[0].seed).not.toBe(after.simulation[0].seed);
    expect(before.wheel[0].archiveRow.team).not.toBe(after.wheel[0].archiveRow.team);

    expect(
      { wheel: crossover.wheel, simulation: crossover.simulation },
      'NBA_DAILY_PICKER_MOUNT_DATE',
    ).toEqual({ wheel: before.wheel, simulation: before.simulation });
  });
});
