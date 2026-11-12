import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSquad, fetchTeamSeasonIndex } from '@/lib/perfectSeasonNfl';
import PerfectSeasonNfl from '@/pages/PerfectSeasonNfl';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/perfectSeasonNfl', async (original) => ({
  ...await original<typeof import('@/lib/perfectSeasonNfl')>(),
  fetchTeamSeasonIndex: vi.fn(),
  fetchSquad: vi.fn(),
}));

const beforeMidnight = new Date('2026-11-10T04:59:40.000Z');
const afterMidnight = new Date('2026-11-10T05:00:01.000Z');
const archive = Array.from({ length: 480 }, (_, i) => ({
  name: `Archive fixture ${i}`,
  abbr: `T${i % 24}`,
  year: 2000 + Math.floor(i / 24),
}));

async function spin(mode: 'Classic' | 'Daily', mount: Date, enter: Date, roll: number) {
  localStorage.clear();
  vi.clearAllMocks();
  vi.setSystemTime(mount);
  const random = vi.spyOn(Math, 'random').mockReturnValue(roll);
  const view = render(<MemoryRouter initialEntries={['/perfect-season-nfl']}><PerfectSeasonNfl /></MemoryRouter>);
  try {
    const entry = screen.getByRole('button', { name: new RegExp(`^${mode}\\b`) });
    vi.setSystemTime(enter);
    fireEvent.click(entry);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    fireEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(fetchSquad).toHaveBeenCalledTimes(1);
    const squad = vi.mocked(fetchSquad).mock.calls[0][0];
    expect(screen.getByText('You landed on').nextElementSibling).toHaveTextContent(`${squad.year} ${squad.name}`);
    return { squad, theme: screen.queryByText(/^Today's theme:/)?.textContent?.trim() ?? null };
  } finally {
    view.unmount();
    random.mockRestore();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(fetchTeamSeasonIndex).mockResolvedValue(archive);
  vi.mocked(fetchSquad).mockImplementation(async (team) => ({
    squadId: `${team.abbr}-${team.year}`,
    teamName: team.name,
    year: team.year,
    players: [{ playerId: 'qb', name: 'Draft fixture QB', eligible: ['QB'], rating: 80, detail: 'Synthetic archive player' }],
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Perfect Season NFL daily wheel date', () => {
  it('deals the mounted Eastern day on either side of midnight', async () => {
    const before = await spin('Daily', beforeMidnight, beforeMidnight, 0.25);
    expect(before).toEqual({ squad: archive[28], theme: "Today's theme: Iron Curtain Defenses" });
    const crossed = await spin('Daily', beforeMidnight, afterMidnight, 0.75);
    expect(crossed).toEqual(before);
  });

  it('deals the new day in a freshly opened tab', async () => {
    const next = await spin('Daily', afterMidnight, afterMidnight, 0.25);
    expect(next).toEqual({ squad: archive[445], theme: "Today's theme: Spread Offense Era" });
  });

  it('uses the random draw in Classic while the same-day Daily is stable', async () => {
    const classicLow = await spin('Classic', beforeMidnight, afterMidnight, 0.25);
    const classicHigh = await spin('Classic', beforeMidnight, afterMidnight, 0.75);
    expect(classicLow).toEqual({ squad: archive[120], theme: null });
    expect(classicHigh).toEqual({ squad: archive[360], theme: null });
    const dailyLow = await spin('Daily', beforeMidnight, beforeMidnight, 0.25);
    const dailyHigh = await spin('Daily', beforeMidnight, beforeMidnight, 0.75);
    expect(dailyHigh).toEqual(dailyLow);
  });
});
