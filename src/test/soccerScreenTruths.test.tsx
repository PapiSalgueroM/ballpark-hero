/* Round 1337: Soccer Career's screens say true things.
   S1 the Ballon d'Or night holds Full attributes while it counts down.
   S2 Week by week says it is a watch, and the Season Centre help says what it is.
   S3 the Squad sheet opens on the squad with a one line pointer to its ?.
   S4 Training shows one rules paragraph on its menu, all three behind its ?.
   Every case renders a component that exists on the base too, so the base
   control (this file run against the base's copies of the edited files) fails
   on the words and the behaviour, never on a missing export. */
import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@/lib/completions', async original => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Screen Tester',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') return (ok: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  return {
    supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) } },
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { prepareLeagueWorld, recordLeagueWorldSeason } from '@/lib/soccerCareerLeagueWorld';
import SoccerSeasonCentre from '@/components/soccer-career/SoccerSeasonCentre';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function player(): E.CareerState {
  const career = E.initCareer('Screen Tester', 'England', 'CM', '2020-24',
    { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 },
    80, 2020, E.FALLBACK_CLUBS, null, 88);
  const club = E.FALLBACK_CLUBS.find(candidate => candidate.name === 'Arsenal')!;
  career.age = 27; career.overall = 84; career.peakOverall = 84;
  career.currentClub = club.name; career.currentClubCountry = club.country;
  career.currentClubTier = club.tier; career.currentClubColor = club.color; career.currentLeague = club.league;
  career.contractYearsLeft = 3; career.weeklyWage = 45000; career.marketValue = 30;
  career.phase = 'playing';
  career.intStats.debutYear = -1; career.pendingBallonDor = null;
  career.seasons = [{ ...career.seasons[0], year: 2026, age: 27, club: club.name, clubCountry: club.country,
    clubTier: club.tier, type: 'playing', apps: 32, leagueApps: 28, goals: 18, assists: 11, rating: 7.6, ovr: 84 }];
  return copy(E.repairCareer(career));
}
function mount(saved: E.CareerState) {
  expect(isSoccerCareerSave(saved)).toBe(true);
  localStorage.setItem(KEY, JSON.stringify(saved));
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  expect(view.queryByText('TEST: route crashed')).toBeNull();
  expect(view.queryByText('Create Your Player')).toBeNull();
  return view;
}
/* The league world fixture's way of making a saved Spanish lower division season (soccerCareerLeagueWorld.test.ts). */
function worldCareer(club: string, league: string): E.CareerState {
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find((s: { id: string }) => s.id === 'ere').state;
  return { ...saved, playerName: 'Future World Fixture', currentClub: club, currentLeague: league, currentClubCountry: 'Spain', currentClubTier: 2, position: 'CM', seasons: [], awards: [], events: [], story: [], phone: undefined, leagueWorld: undefined };
}
const stillQuery = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
function worldRow(s: E.CareerState, year: number): E.SeasonRecord {
  return { year, age: 26, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
    apps: 42, leagueApps: 42, goals: 5, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 6.9,
    leagueTitle: false, leagueFinish: 4, leagueSize: 22, domesticCup: false, championsLeague: false,
    worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null } as E.SeasonRecord;
}

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/* A Ballon d'Or night on the save: ten fictional names, the player third, the list not yet shown. */
function nightSave(phase: E.CareerState['phase'], revealed: boolean): E.CareerState {
  const career = player();
  const row = career.seasons[career.seasons.length - 1];
  const nominees = Array.from({ length: 10 }, (_, i) => ({
    name: i === 2 ? career.playerName : `Fixture Candidate ${i + 1}`, points: 300 - i * 20, isPlayer: i === 2,
    nationality: 'England', club: 'Arsenal', position: 'CM', goals: 12, trophies: [] as string[],
  }));
  return { ...career, phase, pendingSummary: row,
    pendingBallonDor: { year: row.year, nominees, playerRank: 3, playerPoints: 260, playerNominated: true, moved: '', ...(revealed ? { revealed: true } : {}) } } as E.CareerState;
}
const attributesButton = () => screen.getByRole('button', { name: /^Full attributes/ });
const attributesOpen = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('h1')].some(h => /full attributes$/.test(h.textContent ?? ''));

describe('S1 the Ballon d\'Or night holds Full attributes while it counts down', () => {
  it('disables the button with the night line, and a press leaves the night up and the save unchanged', () => {
    const view = mount(nightSave('ballon_dor', false));
    const card = view.container.querySelector('[data-award-night="ballon_dor"]');
    expect(card).not.toBeNull();
    expect(card!.getAttribute('data-award-result')).toBe('waiting');
    const button = attributesButton();
    expect(button).toBeDisabled();
    expect(button.textContent).toContain("Opens once the Ballon d'Or night is over");
    const before = localStorage.getItem(KEY);
    fireEvent.click(button);
    expect(attributesOpen(view)).toBe(false);
    expect(view.container.querySelector('[data-award-night="ballon_dor"]')).toBe(card);
    expect(localStorage.getItem(KEY)).toBe(before);
  });

  it('opens Full attributes once the night has been shown', () => {
    const view = mount(nightSave('ballon_dor', true));
    const button = attributesButton();
    expect(button).toBeEnabled();
    expect(button.textContent).not.toContain('Opens once');
    fireEvent.click(button);
    expect(attributesOpen(view)).toBe(true);
  });

  it('keeps Full attributes open on the season summary with the night still to come', () => {
    const view = mount(nightSave('season_summary', false));
    const button = attributesButton();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(attributesOpen(view)).toBe(true);
  });
});

describe('S2 Week by week says it is a watch', () => {
  it('labels the 📺 button as a watch, never live', () => {
    const view = mount(player());
    const button = view.container.querySelector<HTMLButtonElement>('[data-week-by-week]');
    expect(button).not.toBeNull();
    const label = button!.getAttribute('aria-label') ?? '';
    expect(label.startsWith('Week by week')).toBe(true);
    expect(label).toContain('watch');
    expect(label).not.toContain('live');
  });

  it('opens its help on what the sheet is, with no Spanish pool note and no "nothing here can change"', () => {
    stillQuery();
    const s = worldCareer('Arsenal', 'Premier League');
    const row = worldRow(s, 2024);
    const career = { ...s, seasons: [row], phase: 'playing' } as E.CareerState;
    render(<MemoryRouter><SoccerSeasonCentre career={career} clubs={E.FALLBACK_CLUBS} row={row} mode="watch" offer={false} onClose={() => {}} /></MemoryRouter>);
    const help = screen.getByRole('dialog', { name: 'How the Season Centre works' });
    const text = help.textContent ?? '';
    expect(text).not.toContain('Spanish');
    expect(text).not.toContain('nothing here can change');
    expect(text).toContain('Next Season');
    expect(text).toContain('Week by week');
  });

  it("still names the Spanish club pool in a partial league world season's own note", () => {
    stillQuery(); localStorage.setItem('seasonCentre:help', '1');
    const s = worldCareer('Girona', 'Segunda Division');
    prepareLeagueWorld(s, E.FALLBACK_CLUBS, 2026);
    const row = worldRow(s, 2026);
    recordLeagueWorldSeason(s, E.FALLBACK_CLUBS, row);
    expect(row.leagueWorld?.simulation).toBe('simulated-partial');
    const career = { ...s, seasons: [row], phase: 'playing' } as E.CareerState;
    const view = render(<MemoryRouter><SoccerSeasonCentre career={career} clubs={E.FALLBACK_CLUBS} row={row} mode="watch" offer={false} onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(within(view.container.querySelector<HTMLElement>('[data-kickoff]')!).getByRole('button', { name: /Straight to the final table/ }));
    act(() => { vi.advanceTimersByTime(5000); });
    const review = view.container.querySelector('[data-review]');
    expect(review).not.toBeNull();
    expect(review!.textContent).toContain('The Spanish lower division uses the available first-team club pool.');
  });
});
