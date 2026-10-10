import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

const pageAction = vi.hoisted(() => ({ announce: null as (() => void) | null }));
vi.mock('@/components/soccer-career/FarewellSeasonCard', async original => {
  const actual = await original<typeof import('@/components/soccer-career/FarewellSeasonCard')>();
  return { ...actual, FarewellSeasonCard: (props: Parameters<typeof actual.FarewellSeasonCard>[0]) => {
    pageAction.announce = props.onAnnounce;
    return <actual.FarewellSeasonCard {...props} />;
  } };
});

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
import { readSoccerFarewell, announceSoccerFarewell } from '@/lib/soccerCareerFarewell';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { ledgerPut, readSeasonMoments } from '@/lib/season/momentsSave';
import { SOCCER, buildSoccerSeasonCtx, soccerSeasonKey } from '@/lib/season/soccer';
import { deriveSeason, planMoments } from '@/lib/season/core';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', OTHER = 'unrelated-career-progress';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const read = (): E.CareerState => JSON.parse(localStorage.getItem(KEY)!);
const lastRow = (career: E.CareerState) => career.seasons[career.seasons.length - 1];
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
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
function suggestion(): E.CareerState {
  const career = senior(); career.age = 30; career.phase = 'retirement_suggestion';
  career.overall = 70; career.peakOverall = 80;
  career.seasons[0] = { ...career.seasons[0], age: 29, ovr: 70 };
  return career;
}
function mount(saved: E.CareerState) {
  expect(isSoccerCareerSave(saved)).toBe(true);
  localStorage.setItem(KEY, JSON.stringify(saved)); localStorage.setItem(OTHER, 'held other career');
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  expect(view.queryByText('TEST: route crashed')).toBeNull();
  expect(view.queryByText('Create Your Player')).toBeNull();
  expect(localStorage.getItem(OTHER)).toBe('held other career');
  return view;
}
function tape(seed = 12345, stacks?: string[]) {
  const draws: number[] = [];
  let state = seed >>> 0;
  vi.mocked(Math.random).mockImplementation(() => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state / 4294967296; draws.push(value);
    stacks?.push(new Error('Farewell action random draw').stack ?? '');
    return value;
  });
  return draws;
}
function confirmFarewell() {
  const opener = document.querySelector<HTMLButtonElement>('[data-farewell-open]');
  expect(opener).toBeEnabled(); fireEvent.click(opener!);
  const dialog = document.querySelector<HTMLElement>('[data-farewell-dialog]');
  expect(dialog).toBeVisible();
  expect(dialog!.querySelector('[data-farewell-help]')).toBeVisible();
  fireEvent.click(dialog!.querySelector('[data-farewell-review-open]')!);
  const confirm = dialog!.querySelector<HTMLButtonElement>('[data-farewell-confirm]');
  expect(confirm).toBeEnabled(); return confirm!;
}
function nextButton(view: ReturnType<typeof render>) {
  const bar = view.container.querySelector<HTMLElement>('[data-career-action-bar]');
  expect(bar).not.toBeNull(); return within(bar!).getByRole('button', { name: /Next Season/ });
}
function twice(button: HTMLElement) { act(() => { fireEvent.click(button); fireEvent.click(button); }); }
function finalSummary(): E.CareerState {
  vi.mocked(Math.random).mockReturnValue(0.52);
  let career = copy(E.advanceProSeason(announceSoccerFarewell(senior()), E.FALLBACK_CLUBS));
  if (career.phase === 'newspaper') career = copy(E.dismissNewspaper(career));
  expect(career.phase).toBe('season_summary');
  career.pendingBallonDor = null; career.pendingTournament = null; career.pendingWorldCup = null;
  career.pendingRivalryEvent = null; career.intStats.debutYear = -1;
  return career;
}

beforeEach(() => {
  pageAction.announce = null;
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer farewell real page actions', () => {
  it('saves one next-year announcement for two captured confirmation clicks without playing or drawing', () => {
    const view = mount(senior()), before = read();
    const expectedDraws = tape(), expected = copy(E.announceFarewellSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expectedDraws).toEqual([]); expect(readSoccerFarewell(expected)?.year).toBe(2027);
    const actualDraws = tape(); twice(confirmFarewell());
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().age).toBe(before.age); expect(read().seasons).toEqual(before.seasons);
    expect(view.container.querySelector('[data-farewell-plan]')).toHaveTextContent('2027');
    expect(document.querySelector('[data-farewell-dialog]')).toBeNull();
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('plays one complete final year and draw vector for two captured Next Season clicks', () => {
    const view = mount(announceSoccerFarewell(senior())), before = read();
    const expectedDraws = tape(), expected = copy(E.advanceProSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expected.seasons).toHaveLength(before.seasons.length + 1);
    expect(lastRow(expected)?.year).toBe(2027); expect(expectedDraws.length).toBeGreaterThan(0);
    const actualDraws = tape(); twice(nextButton(view));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().age).toBe(before.age + 1); expect(read().retired).toBe(false);
    expect(['newspaper', 'season_summary', 'rehab_choice']).toContain(read().phase);
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('banks a genuine open moment and plays one final year for two captured asynchronous Next Season clicks', async () => {
    const saved = announceSoccerFarewell(senior()), row = lastRow(saved);
    const ctx = buildSoccerSeasonCtx(saved, E.FALLBACK_CLUBS, row);
    const season = deriveSeason(SOCCER, row, ctx);
    expect(season).not.toBeNull();
    const moments = planMoments(SOCCER, row, ctx, season!);
    expect(moments.length).toBeGreaterThan(0);
    // An actual planned moment was opened and left, the existing missed-attempt shape.
    const moment = moments[0];
    saved.seasonMoments = ledgerPut(null, soccerSeasonKey(saved.playerName, row), moment.md, moment.id, -1, []);
    expect(readSeasonMoments(saved.seasonMoments)?.m).toEqual([[moment.md, moment.id, -1]]);
    expect(readSeasonMoments(saved.seasonMoments)?.banked).toBeUndefined();
    const { closeSeasonMoments } = await import('@/lib/season/soccerMoments');
    const view = mount(saved), before = read();
    const expectedDraws = tape(), banked = closeSeasonMoments(copy(before), E.FALLBACK_CLUBS);
    expect(readSeasonMoments(banked.seasonMoments)?.banked).toBe(1);
    const expected = copy(E.advanceProSeason(banked, E.FALLBACK_CLUBS));
    const actualStacks: string[] = [], actualDraws = tape(12345, actualStacks), button = nextButton(view);
    await act(async () => {
      fireEvent.click(button); fireEvent.click(button);
      await import('@/lib/season/soccerMoments');
      await Promise.resolve(); await Promise.resolve();
    });
    expect(read()).toEqual(expected);
    const firstMismatch = actualDraws.findIndex((value, index) => value !== expectedDraws[index]);
    expect(actualDraws, JSON.stringify({ expectedCount: expectedDraws.length, actualCount: actualDraws.length,
      firstMismatch, mismatchStack: actualStacks[firstMismatch], extraTail: actualDraws.slice(expectedDraws.length),
      extraTailStacks: actualStacks.slice(expectedDraws.length) })).toEqual(expectedDraws);
    expect(read().age).toBe(before.age + 1); expect(read().seasons).toHaveLength(before.seasons.length + 1);
    expect(lastRow(read()).year).toBe(2027); expect(readSeasonMoments(read().seasonMoments)?.banked).toBe(1);
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  }, 20000);
  it('restores the complete announced plan without another season, age or draw', () => {
    const expected = announceSoccerFarewell(senior()), draws = tape(), view = mount(expected), raw = localStorage.getItem(KEY);
    expect(read()).toEqual(expected); expect(draws).toEqual([]);
    expect(view.container.querySelector('[data-farewell-plan]')).toHaveTextContent('2027'); view.unmount();
    const restored = mount(read());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(read()).toEqual(expected); expect(draws).toEqual([]);
    expect(restored.container.querySelector('[data-farewell-plan]')).toHaveTextContent('2027');
  });
  it('resumes the already-aged suggestion exactly once for two captured page announcement callbacks', () => {
    const view = mount(suggestion()), before = read();
    expect(view.getByRole('button', { name: /Hang Up the Boots: Retire/ })).toBeEnabled();
    expect(view.getByRole('button', { name: /Not Done Yet: Keep Playing/ })).toBeEnabled();
    const expectedDraws = tape(), expected = copy(E.announceFarewellSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expected.age).toBe(30); expect(expected.seasons).toHaveLength(before.seasons.length + 1);
    expect(lastRow(expected)?.year).toBe(2027); expect(lastRow(expected)?.age).toBe(30);
    confirmFarewell(); const capturedAction = pageAction.announce;
    expect(capturedAction).toBeTypeOf('function');
    const actualDraws = tape(); act(() => { capturedAction!(); capturedAction!(); });
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws); expect(read().age).toBe(30);
    expect(read().retired).toBe(false); expect(view.queryByText('YOUR BODY IS SHOWING SIGNS OF WEAR')).toBeNull();
  });
  it('keeps the saved final season and result visible across reload without rerolling', () => {
    vi.mocked(Math.random).mockReturnValue(0.52);
    const played = copy(E.advanceProSeason(announceSoccerFarewell(senior()), E.FALLBACK_CLUBS));
    if (played.phase === 'newspaper') Object.assign(played, E.dismissNewspaper(played));
    expect(played.phase).toBe('season_summary'); expect(played.pendingSummary).toEqual(lastRow(played));
    const draws = tape(), view = mount(played), raw = localStorage.getItem(KEY);
    expect(read()).toEqual(played); expect(draws).toEqual([]);
    expect(view.container.querySelector('[data-farewell-plan]')).toHaveTextContent('2027');
    expect(view.container.querySelector('[data-summary-rating]')).toBeVisible(); view.unmount();
    const restored = mount(read());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(read()).toEqual(played); expect(draws).toEqual([]);
    expect(restored.container.querySelector('[data-summary-rating]')).toBeVisible();
  });
  it('keeps the original Keep Playing transition and complete draw vector without opting in', () => {
    const view = mount(suggestion()), before = read();
    const expectedDraws = tape(), expected = copy(E.declineRetirementSuggestion(copy(before), E.FALLBACK_CLUBS));
    const actualDraws = tape(); fireEvent.click(view.getByRole('button', { name: /Not Done Yet: Keep Playing/ }));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws); expect(read().age).toBe(before.age);
    expect(readSoccerFarewell(read())).toBeNull(); expect(read().seasons).toHaveLength(before.seasons.length + 1);
  });
  it('keeps the original immediate Retire suggestion and recorded retirement row', () => {
    const view = mount(suggestion()), before = read();
    const expectedDraws = tape(), expected = copy(E.acceptRetirementSuggestion(copy(before)));
    const actualDraws = tape(); fireEvent.click(view.getByRole('button', { name: /Hang Up the Boots: Retire/ }));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().phase).toBe('retirement_ceremony'); expect(read().retired).toBe(true);
    expect(lastRow(read())?.type).toBe('retired'); expect(readSoccerFarewell(read())).toBeNull();
  });
  it('keeps the original manual Retire confirmation without declaring a farewell', () => {
    const view = mount(senior()), before = read();
    const expectedDraws = tape(), expected = copy(E.manualRetire(copy(before)));
    const actualDraws = tape(); fireEvent.click(view.getByRole('button', { name: 'Retire' }));
    const dialog = view.getByRole('dialog', { name: 'Retire?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Retirement' }));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().phase).toBe('retirement_ceremony'); expect(read().seasons).toEqual(before.seasons);
    expect(readSoccerFarewell(read())).toBeNull();
  });
  it('keeps the original Stay transition and complete save in an unannounced window', () => {
    const saved = senior(); saved.phase = 'transfer_window'; saved.transferSituation = { type: 'no_interest' };
    const view = mount(saved), before = read();
    const expectedDraws = tape(), expected = copy(E.stayAtClub(copy(before)));
    const actualDraws = tape(); fireEvent.click(view.getByRole('button', { name: /Stay/ }));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().phase).toBe('playing'); expect(readSoccerFarewell(read())).toBeNull();
  });
  it('retires after the actual saved final summary without a transfer window or extra season', () => {
    const view = mount(finalSummary()), before = read();
    expect(before.pendingSummary).toEqual(lastRow(before)); expect(readSoccerFarewell(before)?.year).toBe(2027);
    expect(view.getByRole('heading', { name: 'Season Summary' }).parentElement).toHaveTextContent('2027/28');
    const expectedDraws = tape(), expected = copy(E.dismissSummary(copy(before), E.FALLBACK_CLUBS));
    expect(expected.retired).toBe(true); expect(expected.phase).toBe('retirement_ceremony');
    const actualDraws = tape(); fireEvent.click(view.getByRole('button', { name: 'Continue →' }));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws); expect(actualDraws).toEqual([]);
    expect(read().seasons).toEqual(before.seasons); expect(read().age).toBe(before.age);
    expect(view.container.querySelector('[data-farewell-open]')).toBeNull();
    const raw = localStorage.getItem(KEY); view.unmount(); mount(read());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(actualDraws).toEqual([]);
  });
  it('shows a queued saved tournament before retirement and consumes its result without another year', () => {
    const saved = finalSummary();
    // Fictional saved outcome for the phase boundary, with no real match claim.
    saved.pendingWorldCup = { year: 2027, nation: 'England', matches: [], playerApps: 0,
      playerGoals: 0, playerAssists: 0, playerAvgRating: 0, result: 'Group Stage', bestPlayer: false };
    const view = mount(saved), before = read();
    const expectedDraws = tape(), expectedTournament = copy(E.dismissSummary(copy(before), E.FALLBACK_CLUBS));
    expect(expectedTournament.phase).toBe('world_cup'); expect(expectedTournament.retired).toBe(false);
    const actualDraws = tape(); fireEvent.click(view.getByRole('button', { name: 'Continue →' }));
    expect(read()).toEqual(expectedTournament); expect(actualDraws).toEqual(expectedDraws);
    expect(read().pendingWorldCup).toEqual(saved.pendingWorldCup); expect(read().seasons).toEqual(before.seasons);
    const nextExpectedDraws = tape(), expectedRetirement = copy(E.dismissWorldCup(copy(read()), E.FALLBACK_CLUBS));
    const nextActualDraws = tape(); fireEvent.click(view.getByRole('button', { name: 'Continue →' }));
    expect(read()).toEqual(expectedRetirement); expect(nextActualDraws).toEqual(nextExpectedDraws);
    expect(read().phase).toBe('retirement_ceremony'); expect(read().retired).toBe(true);
    expect(read().pendingWorldCup).toBeNull(); expect(read().seasons).toEqual(before.seasons);
    expect(read().age).toBe(before.age);
  });
  it('holds malformed optional data while the original Next Season remains playable', () => {
    const saved = senior(); saved.farewellSeason = { version: 1 } as E.CareerState['farewellSeason'];
    const view = mount(saved), before = read();
    expect(readSoccerFarewell(before)).toBeNull(); expect(view.container.querySelector('[data-farewell-open]')).toBeNull();
    const expectedDraws = tape(), expected = copy(E.advanceProSeason(copy(before), E.FALLBACK_CLUBS));
    const actualDraws = tape(); fireEvent.click(nextButton(view));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().farewellSeason).toEqual(saved.farewellSeason); expect(readSoccerFarewell(read())).toBeNull();
    expect(read().seasons).toHaveLength(before.seasons.length + 1);
  });
});
