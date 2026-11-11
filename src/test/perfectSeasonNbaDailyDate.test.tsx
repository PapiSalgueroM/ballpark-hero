import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeDailyPicker } from '@/lib/perfectSeason';
import { fetchSquad, fetchTeamSeasonIndex, type NbaTeamSeasonEntry } from '@/lib/perfectSeasonNba';
import { applyTheme, getDailyTheme } from '@/lib/perfectSeasonThemes';
import PerfectSeasonNba from '@/pages/PerfectSeasonNba';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/perfectSeasonNba', async (original) => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: vi.fn(),
  fetchSquad: vi.fn(),
}));

const beforeMidnight = new Date('2026-11-11T04:59:50.000Z');
const afterMidnight = new Date('2026-11-11T05:00:01.000Z');
const archive: NbaTeamSeasonEntry[] = [2000, 2015].flatMap(firstYear =>
  Array.from({ length: 60 }, (_, i) => {
    const year = firstYear + i % 8;
    const team = `Fixture ${firstYear}-${i}`;
    return { season: `${year}-${String(year + 1).slice(-2)}`, team, teamName: team };
  }),
);

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function spin(mode: 'Daily' | 'Classic', mount: Date, enter: Date) {
  vi.mocked(fetchSquad).mockClear();
  vi.setSystemTime(mount);
  const view = render(<MemoryRouter><PerfectSeasonNba /></MemoryRouter>);
  try {
    vi.setSystemTime(enter);
    fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + mode + '\\b') }));
    await tick(1);
    fireEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
    await tick(1600);
    expect(fetchSquad).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(fetchSquad).mock.calls[0][0];
    expect(screen.getByText('You landed on').nextElementSibling).toHaveTextContent(`${entry.season} ${entry.teamName}`);
    return { entry, theme: screen.queryByText(/^Today's theme:/)?.textContent ?? null };
  } finally {
    view.unmount();
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.mocked(fetchTeamSeasonIndex).mockResolvedValue(archive);
  vi.mocked(fetchSquad).mockImplementation(async entry => ({
    squadId: entry.team,
    teamName: entry.teamName,
    year: Number(entry.season.slice(0, 4)),
    players: [{ playerId: 'pg', name: 'Fixture point guard', eligible: ['PG'], rating: 80, detail: 'Synthetic archive player' }],
  }));
});

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('uses the mounted date for both the Daily theme and the wheel after midnight', async () => {
  const before = await spin('Daily', beforeMidnight, beforeMidnight);
  const oldDate = '2026-11-10';
  const oldTheme = getDailyTheme('nba', oldDate, archive);
  const oldPool = applyTheme(archive, oldTheme);
  expect(before.entry).toEqual(oldPool[makeDailyPicker('nba', oldDate)(oldPool.length)]);
  expect(before.theme).toContain(oldTheme?.label);
  expect(await spin('Daily', beforeMidnight, afterMidnight)).toEqual(before);

  const fresh = await spin('Daily', afterMidnight, afterMidnight);
  const newDate = '2026-11-11';
  const newTheme = getDailyTheme('nba', newDate, archive);
  const newPool = applyTheme(archive, newTheme);
  expect(fresh.entry).toEqual(newPool[makeDailyPicker('nba', newDate)(newPool.length)]);
  expect(fresh.entry).not.toEqual(before.entry);
});

it('uses the regular random draw in Classic after midnight', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  expect(await spin('Classic', beforeMidnight, afterMidnight)).toEqual({ entry: archive[30], theme: null });
  vi.mocked(Math.random).mockReturnValue(0.75);
  expect(await spin('Classic', beforeMidnight, afterMidnight)).toEqual({ entry: archive[90], theme: null });
});
