/**
 * A retired My Career save is history, not a new scored finish.
 *
 * Each board starts on its create screen and restores localStorage in an
 * effect. That means a retired save changes the completion hook from false to
 * true after mount, the same shape as a player retiring in this visit. This
 * test mounts the real boards with complete saved careers and holds the only
 * user visible outcome that matters here: reopening one must not pay its
 * legacy score again.
 */
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { recordCompletion } from '@/lib/completions';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { ARCHETYPES, startCareer } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer } from '@/lib/nhlMyCareer';

type SavedCareer = { retired: boolean; name: string };

interface CareerCase {
  label: string;
  slug: string;
  saveKey: string;
  Board: ComponentType;
  makeCareer: () => SavedCareer;
}

const fixedRandom = () => 0.5;

const CASES: CareerCase[] = [
  {
    label: 'NFL',
    slug: 'nfl-my-career',
    saveKey: 'nfl-my-career-save-v1',
    Board: NflMyCareerBoard,
    makeCareer: () => {
      const career = startCareer('Stored NFL', 'QB', ARCHETYPES.QB[0], fixedRandom);
      career.rings = 1;
      return career;
    },
  },
  {
    label: 'NBA',
    slug: 'nba-my-career',
    saveKey: 'nba-my-career-save-v1',
    Board: NbaMyCareerBoard,
    makeCareer: () => {
      const career = startNbaCareer('Stored NBA', 'PG', NBA_ARCHETYPES.PG[0], fixedRandom);
      career.rings = 1;
      return career;
    },
  },
  {
    label: 'MLB',
    slug: 'mlb-my-career',
    saveKey: 'mlb-my-career-save-v1',
    Board: MlbMyCareerBoard,
    makeCareer: () => {
      const career = startMlbCareer('Stored MLB', 'CF', MLB_ARCHETYPES.CF[0], fixedRandom);
      career.rings = 1;
      return career;
    },
  },
  {
    label: 'NHL',
    slug: 'nhl-my-career',
    saveKey: 'nhl-my-career-save-v1',
    Board: NhlMyCareerBoard,
    makeCareer: () => {
      const career = startNhlCareer('Stored NHL', 'C', NHL_ARCHETYPES.C[0], fixedRandom);
      career.cups = 1;
      return career;
    },
  },
];

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordCompletion).mockClear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('My Career saved retirement scoring', () => {
  it.each(CASES)('$label does not repay a retired save on reopen', async ({ saveKey, Board, makeCareer }) => {
    const career = makeCareer();
    career.retired = true;
    localStorage.setItem(saveKey, JSON.stringify({ c: career, phase: 'retired', teamQuality: 80, coach: null }));

    const firstVisit = render(<Board />);
    expect(await screen.findByText(`${career.name} retires`)).toBeInTheDocument();
    firstVisit.unmount();

    render(<Board />);
    expect(await screen.findByText(`${career.name} retires`)).toBeInTheDocument();
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
