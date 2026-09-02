import type { ComponentType, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => (
    <main>{headerExtra}{children}</main>
  ),
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/hooks/useDailyPuzzle', () => ({
  useDailyPuzzle: () => ({
    guesses: [],
    addGuess: vi.fn(),
    gameStatus: 'playing',
    isLoading: false,
  }),
}));
vi.mock('@/lib/playerSearch', () => ({
  NFL_ROSTER_SOURCE: 'nfl_roster_players',
  searchPlayers: vi.fn(async () => ({ results: [], error: null })),
}));

import MissingFive from '@/pages/MissingFive';
import MissingNine from '@/pages/MissingNine';
import MissingEleven from '@/pages/MissingEleven';
import { FIVE_LINEUPS } from '@/lib/missingFive';
import { NINE_LINEUPS } from '@/lib/missingNine';
import { ELEVEN_LINEUPS } from '@/lib/missingEleven';

const RANDOM_SAMPLE = 0.37;

type Lineup = {
  team: string;
  dateLabel: string;
  unit?: string;
};

type LineupCase = {
  name: string;
  Page: ComponentType;
  pool: readonly Lineup[];
  header: (lineup: Lineup) => string;
};

const cases: LineupCase[] = [
  {
    name: 'Missing Five',
    Page: MissingFive,
    pool: FIVE_LINEUPS,
    header: (lineup) => `${lineup.team} starting five`,
  },
  {
    name: 'Missing Nine',
    Page: MissingNine,
    pool: NINE_LINEUPS,
    header: (lineup) => `${lineup.team} starting lineup`,
  },
  {
    name: 'Missing Eleven',
    Page: MissingEleven,
    pool: ELEVEN_LINEUPS,
    header: (lineup) => `${lineup.team} starting ${lineup.unit ?? 'offense'}`,
  },
];

describe('Missing lineup unlimited selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(cases)('waits for the Unlimited click before drawing a $name lineup', ({ Page, pool, header }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(RANDOM_SAMPLE);
    render(<Page />);

    expect(random).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Unlimited/i }));
    expect(random).toHaveBeenCalledTimes(2);

    const expected = pool[Math.floor(RANDOM_SAMPLE * pool.length)];
    expect(screen.getByText(expected.dateLabel)).toBeInTheDocument();
    expect(screen.getByText(header(expected))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Daily/i }));
    fireEvent.click(screen.getByRole('button', { name: /Unlimited/i }));
    expect(random).toHaveBeenCalledTimes(2);
    expect(screen.getByText(header(expected))).toBeInTheDocument();
  });
});
