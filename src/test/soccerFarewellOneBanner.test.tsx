/* Release AW fix pass, review sc-screens finding F1: one box for a farewell season, not two.
 *
 * The page has carried a pulsing FINAL SEASON banner since long before the farewell season existed, behind a
 * flag nothing ever set. Rounds 1238 to 1240 set that flag when a farewell is announced AND mount their own
 * card for the same seasons, so from the announcement to retirement every screen showed two stacked boxes that
 * said one thing, and on a 320 by 568 phone they filled the first screen of every result.
 *
 * These cases mount the real page on a save that holds an announced plan, on the playing screen and on the
 * season summary of the final year, and ask for exactly one of the two: the card, which names the year and
 * holds the rules. The control is the page's condition taken back out (the banner returns, both cases fail).
 * The mocks are the ones the farewell page test of the other lane uses, so the page mounts the same way.
 */
import { Component, type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', async original => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Farewell Tester',
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
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { announceSoccerFarewell, readSoccerFarewell } from '@/lib/soccerCareerFarewell';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
/** A 34 year old between seasons at Arsenal, the fixture of the farewell page test. */
function senior(): E.CareerState {
  const career = E.initCareer('Farewell Tester', 'England', 'CM', '2020-24',
    { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 },
    80, 2020, E.FALLBACK_CLUBS, null, 88);
  const club = E.FALLBACK_CLUBS.find(candidate => candidate.name === 'Arsenal')!;
  career.age = 34; career.overall = 80; career.peakOverall = 80;
  career.currentClub = club.name; career.currentClubCountry = club.country;
  career.currentClubTier = club.tier; career.currentClubColor = club.color; career.currentLeague = club.league;
  career.contractYearsLeft = 3; career.weeklyWage = 45000; career.marketValue = 30;
  career.phase = 'playing'; career.retirementSuggested = true;
  career.intStats.debutYear = -1; career.pendingBallonDor = null;
  career.seasons = [{ ...career.seasons[0], year: 2026, age: 34, club: club.name, clubCountry: club.country,
    clubTier: club.tier, type: 'playing', apps: 32, leagueApps: 28, goals: 8, assists: 11, rating: 7.2, ovr: 80 }];
  return copy(E.repairCareer(career));
}
/** The season summary of the announced final year, played by the engine. */
function finalSummary(): E.CareerState {
  let career = copy(E.advanceProSeason(announceSoccerFarewell(senior()), E.FALLBACK_CLUBS));
  if (career.phase === 'newspaper') career = copy(E.dismissNewspaper(career));
  expect(career.phase).toBe('season_summary');
  career.pendingBallonDor = null; career.pendingTournament = null; career.pendingWorldCup = null;
  career.pendingRivalryEvent = null; career.intStats.debutYear = -1;
  return career;
}
function mount(saved: E.CareerState) {
  expect(isSoccerCareerSave(saved)).toBe(true);
  localStorage.setItem(KEY, JSON.stringify(saved));
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  expect(view.queryByText('TEST: route crashed')).toBeNull();
  expect(view.queryByText('Create Your Player')).toBeNull();
  return view;
}
/** What the two boxes are on screen: the count of farewell cards by state, and whether the old banner is drawn. */
function boxes(view: ReturnType<typeof render>) {
  return {
    announced: view.container.querySelectorAll('[data-farewell-plan="announced"]').length,
    available: view.container.querySelectorAll('[data-farewell-plan="available"]').length,
    banner: (view.container.textContent ?? '').includes('FINAL SEASON'),
  };
}

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('A farewell season is announced by one box on the page', () => {
  it('on the playing screen an announced plan shows its card and no second banner', () => {
    const saved = announceSoccerFarewell(senior());
    expect(readSoccerFarewell(saved)?.year, 'the fixture really holds an announced plan').toBe(2027);
    expect(saved.isFinalSeason, 'and the flag the old banner reads is set').toBe(true);
    expect(boxes(mount(copy(saved)))).toEqual({ announced: 1, available: 0, banner: false });
  });

  it('on the season summary of the final year the card is still the only one', () => {
    const saved = finalSummary();
    expect(readSoccerFarewell(saved)?.year).toBe(2027);
    expect(saved.isFinalSeason).toBe(true);
    expect(boxes(mount(saved))).toEqual({ announced: 1, available: 0, banner: false });
  });

  it('a player of 34 with no plan is offered the farewell once and told nothing yet', () => {
    expect(boxes(mount(senior()))).toEqual({ announced: 0, available: 1, banner: false });
  });
});

/* Release AW closing pass, ruling C3: a plan that cannot be verified is read as absent. With the flag off the
   card is offered again like to any eligible player (that case fails on the head before the ruling: the card
   stayed closed for good). With the flag the announcement set, the page shows the one FINAL SEASON banner it
   has always shown for that flag, and since the fix pass after the closing check the card is offered again
   beside it: the engine never ended a career by the flag alone, so a closed card left that player a banner and
   no way to the farewell it names. That is the page of a save that holds the flag and no part at all. */
describe('A farewell plan that cannot be verified is read as absent on the page', () => {
  const unverifiable = (saved: E.CareerState, flag: boolean): E.CareerState => {
    const career = copy(saved);
    (career as unknown as Record<string, unknown>).farewellSeason = { ...career.farewellSeason, version: 2 };
    career.isFinalSeason = flag;
    return career;
  };
  const banners = (view: ReturnType<typeof render>) => (view.container.textContent ?? '').split('FINAL SEASON').length - 1;

  it('with the flag set by the announcement: the old banner shows, once, and the card is offered again beside it', () => {
    const saved = unverifiable(announceSoccerFarewell(senior()), true);
    expect(readSoccerFarewell(saved), 'the plan is past verifying').toBeNull();
    const view = mount(saved);
    expect(boxes(view)).toEqual({ announced: 0, available: 1, banner: true });
    expect(banners(view)).toBe(1);
  });

  it('the same save with the part taken out is the same page: the banner once and the card offered (this one never changed)', () => {
    const saved = unverifiable(announceSoccerFarewell(senior()), true);
    delete (saved as unknown as Record<string, unknown>).farewellSeason;
    const view = mount(saved);
    expect(boxes(view)).toEqual({ announced: 0, available: 1, banner: true });
    expect(banners(view)).toBe(1);
  });

  it('with the flag off: the card is offered again and there is no banner', () => {
    const saved = unverifiable(announceSoccerFarewell(senior()), false);
    expect(readSoccerFarewell(saved), 'the plan is past verifying').toBeNull();
    expect(boxes(mount(saved))).toEqual({ announced: 0, available: 1, banner: false });
  });
});
