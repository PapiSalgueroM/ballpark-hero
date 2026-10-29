import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { SiteMenu } from '@/components/layout/SiteMenu';
import { SiteMenuProvider } from '@/components/layout/SiteMenuHost';
import HofOrBust from '@/pages/HofOrBust';
import ScorePredictor from '@/pages/ScorePredictor';
import GuessTheYear from '@/pages/GuessTheYear';
import GuessTheNation from '@/pages/GuessTheNation';
import { useHofOrBust } from '@/hooks/useHofOrBust';
import { useScorePredictor } from '@/hooks/useScorePredictor';
import { useGuessTheYear } from '@/hooks/useGuessTheYear';
import { useGuessTheNation } from '@/hooks/useGuessTheNation';
import type { useAuth } from '@/contexts/AuthContext';
import type { NationPuzzle } from '@/types/guessTheNation';

vi.mock('@/hooks/useHofOrBust', () => ({ useHofOrBust: vi.fn() }));
vi.mock('@/hooks/useScorePredictor', () => ({ useScorePredictor: vi.fn() }));
vi.mock('@/hooks/useGuessTheYear', () => ({ useGuessTheYear: vi.fn() }));
vi.mock('@/hooks/useGuessTheNation', () => ({ useGuessTheNation: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null, session: null, profile: null, loading: false,
    signUp: async () => ({ error: null, session: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => {},
    refreshProfile: async () => {},
    updateProfile: async () => ({ error: null }),
  } satisfies ReturnType<typeof useAuth>),
}));

// Fictional UI fixtures isolate chrome composition, not sports facts or gameplay.
const noop = () => {};
const nationPuzzle: NationPuzzle = {
  id: 'fictional-chrome-fixture', countryName: 'Fictional Fixture Nation',
  commonNames: [], flagEmoji: '', continent: 'Fictional fixture region',
  difficulty: 'easy', seasonFocus: 'both',
  clues: {
    vibeWord: 'Fictional UI clue', continentHint: 'Fictional UI clue',
    populationHint: 'Fictional UI clue', gamesAttendedHint: 'Fictional UI clue',
    totalMedalsHint: 'Fictional UI clue', bestSportHint: 'Fictional UI clue',
    famousMomentHint: 'Fictional UI clue', winterHistoryHint: 'Fictional UI clue',
    goldMedalHint: 'Fictional UI clue', flagColorsHint: 'Fictional UI clue',
    countrySizeHint: 'Fictional UI clue',
  },
  iconicMoment: 'Fictional UI fixture only',
};
const nation: ReturnType<typeof useGuessTheNation> = {
  countries: [nationPuzzle], loading: false, error: false, retryLoad: noop,
  gameState: {
    puzzle: nationPuzzle, mode: 'daily', difficulty: 'easy',
    revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0,
  },
  streak: 0, currentBadge: null, pointsForCurrentClue: 1200,
  startGame: async () => {}, makeGuess: noop, giveUp: noop, revealHint: noop, resetGame: noop,
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useHofOrBust).mockReturnValue({
    player: {
      id: 'fictional-chrome-fixture', sport: 'soccer', answer: 'Fictional Fixture Player',
      anonymizedStats: ['Fictional UI fixture only'], hints: [], verdict: 'hof',
      hall: null, funFact: 'Fictional UI fixture only',
    },
    hintsRevealed: 0, status: 'voting', userVote: null, score: 0, mode: 'daily',
    communityVotes: null, vote: noop, revealHint: noop, switchToUnlimited: noop,
    nextPuzzle: noop, unlimitedIndex: 0,
  });
  vi.mocked(useScorePredictor).mockReturnValue({
    puzzle: {
      id: 'fictional-chrome-fixture', sport: 'soccer',
      homeTeam: 'Fictional North', awayTeam: 'Fictional South',
      competition: 'Fictional UI fixture', date: 'Fictional fixture date',
      hint: 'Fictional UI fixture only', homeScore: 0, awayScore: 0,
      funFact: 'Fictional UI fixture only',
    },
    status: 'predicting', guessHome: null, guessAway: null, score: 0, mode: 'daily',
    submit: noop, switchToUnlimited: noop, nextPuzzle: noop, unlimitedIndex: 0,
  });
  vi.mocked(useGuessTheYear).mockReturnValue({
    gameState: {
      puzzle: { year: 2000, clues: ['Fictional UI clue'] },
      revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0,
    },
    makeGuess: noop, giveUp: noop, revealNextClue: noop, getHint: () => 'Fictional UI hint',
    maxClues: 6, yearRange: { min: 1972, max: 2026 }, pointsForCurrentClue: 1000,
  });
  vi.mocked(useGuessTheNation).mockReturnValue(nation);
});
afterEach(cleanup);

function renderPage(Page: () => JSX.Element, path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <SiteMenuProvider><Page /><SiteMenu /></SiteMenuProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function actualHeaders() {
  const headers = Array.from(document.querySelectorAll<HTMLElement>('nav[data-site-chrome]'));
  for (const header of headers) {
    expect(within(header).getByRole('link', { name: 'DoUKnowBall' })).toHaveAttribute('href', '/');
    expect(within(header).getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  }
  expect(screen.getAllByRole('button', { name: 'Open site menu' }), 'MENU_TOPOLOGY_REAL_SINGLE_MENU').toHaveLength(1);
  return headers;
}

describe('routed game chrome keeps one real header', () => {
  it.each([
    ['HofOrBust', HofOrBust, '/hof-or-bust', 'Hall of Fame or Bust?', 1, 'HOF'],
    ['ScorePredictor', ScorePredictor, '/score-predictor', 'Score Predictor', 1, 'SCORE'],
    ['GuessTheYear', GuessTheYear, '/guess-the-year', /^📅\s*Guess The Year$/, 1, 'YEAR'],
    ['GuessTheNation', GuessTheNation, '/guess-the-nation', /^🌍\s*Guess The Nation$/, 2, 'NATION'],
  ] as const)('keeps one header for the active %s page', (_name, Page, path, title, level, marker) => {
    renderPage(Page, path);
    const board = within(screen.getByRole('main'));
    expect(board.getByRole('heading', { name: title, level })).toBeInTheDocument();
    if (marker === 'HOF') expect(board.getByText('Fictional UI fixture only', { exact: true }), 'MENU_TOPOLOGY_LOADED_HOF').toBeVisible();
    if (marker === 'SCORE') {
      expect(board.getByRole('spinbutton', { name: 'Fictional North score' }), 'MENU_TOPOLOGY_LOADED_SCORE_FIRST').toBeVisible();
      expect(board.getByRole('spinbutton', { name: 'Fictional South score' }), 'MENU_TOPOLOGY_LOADED_SCORE_SECOND').toBeVisible();
    }
    if (marker === 'YEAR') expect(board.getByText('Fictional UI clue', { exact: true }), 'MENU_TOPOLOGY_LOADED_YEAR').toBeVisible();
    if (marker === 'NATION') expect(board.getByText('"Fictional UI clue"', { exact: true }), 'MENU_TOPOLOGY_LOADED_NATION').toBeVisible();
    const headers = actualHeaders();
    expect(headers.length, 'MENU_TOPOLOGY_SINGLE_' + marker).toBe(1);
    expect(headers[0]).toContainElement(screen.getByRole('button', { name: 'Open site menu' }));
  });

  it.each(['loading', 'error', 'mode'] as const)('preserves the Nation %s header and page help', async state => {
    vi.mocked(useGuessTheNation).mockReturnValue({
      ...nation, loading: state === 'loading', error: state === 'error', gameState: null,
    });
    renderPage(GuessTheNation, '/guess-the-nation');
    const main = screen.getByRole('main');
    if (state === 'loading') expect(main).toHaveAttribute('aria-busy', 'true');
    if (state === 'error') expect(within(main).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    if (state === 'mode') expect(within(main).getByRole('heading', { name: 'Guess The Nation', level: 2 })).toBeInTheDocument();

    const headers = actualHeaders();
    expect(headers, 'MENU_TOPOLOGY_NATION_EARLY_' + state.toUpperCase()).toHaveLength(1);
    expect(headers[0]).toContainElement(screen.getByRole('button', { name: 'Open site menu' }));
    const helpHost = headers[0].nextElementSibling;
    expect(helpHost, 'MENU_TOPOLOGY_NATION_PAGE_HELP_HOST').not.toBeNull();
    const help = await within(helpHost as HTMLElement).findByRole('button', { name: 'How to play' });
    expect(help, 'MENU_TOPOLOGY_NATION_REAL_PAGE_HELP').toBeInTheDocument();
    expect(helpHost!.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING, 'MENU_TOPOLOGY_NATION_HELP_BEFORE_BOARD').not.toBe(0);
  });
});
