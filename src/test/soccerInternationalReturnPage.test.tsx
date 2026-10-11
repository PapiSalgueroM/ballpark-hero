import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

// Capture the unchanged real callback while delegating all rendering and guards.
const pageAction = vi.hoisted(() => ({ return: null as (() => void) | null }));
vi.mock('@/components/soccer-career/InternationalReturnCard', async original => {
  const actual = await original<typeof import('@/components/soccer-career/InternationalReturnCard')>();
  return { ...actual, InternationalReturnCard: (props: Parameters<typeof actual.InternationalReturnCard>[0]) => {
    pageAction.return = props.onReturn;
    return <actual.InternationalReturnCard {...props} />;
  } };
});

vi.mock('@/lib/completions', async original => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Comeback Tester',
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
import * as R from '@/lib/soccerInternationalReturn';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', OTHER = 'unrelated-career-progress';
const RETURN_EVENT = 'Made yourself available for national-team selection again. A squad place still has to be earned.';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const read = (): E.CareerState => JSON.parse(localStorage.getItem(KEY)!);
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function senior(): E.CareerState {
  const carrier = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const career = copy(carrier.saves.find((saved: { id: string }) => saved.id === 'ere').state) as E.CareerState;
  career.playerName = 'Comeback Tester'; career.age = 34; career.overall = 82; career.peakOverall = 82;
  career.phase = 'playing'; career.retired = false; career.retirementSuggested = true;
  career.internationalCareer = false; career.intStats = { ...career.intStats, isRetired: true, debutYear: -1 };
  career.seasons[career.seasons.length - 1] = { ...career.seasons[career.seasons.length - 1], age: 34, ovr: 82 };
  career.pendingSummary = null; career.pendingBallonDor = null; career.pendingTournament = null;
  career.pendingWorldCup = null; career.pendingRivalryEvent = null; career.pendingEvents = [];
  delete career.seasonMoments;
  return copy(E.repairCareer(career));
}
function mount(saved: E.CareerState) {
  expect(isSoccerCareerSave(saved)).toBe(true);
  localStorage.setItem(KEY, JSON.stringify(saved)); localStorage.setItem(OTHER, 'held other career');
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  expect(view.queryByText('TEST: route crashed')).toBeNull(); expect(view.queryByText('Create Your Player')).toBeNull();
  expect(localStorage.getItem(OTHER)).toBe('held other career'); return view;
}
function tape(seed = 12345) {
  const values: number[] = []; let state = seed >>> 0;
  vi.mocked(Math.random).mockImplementation(() => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state / 4294967296; values.push(value); return value;
  });
  return values;
}
function confirm() {
  const opener = document.querySelector<HTMLButtonElement>('[data-international-return-open]');
  expect(opener).toBeEnabled(); fireEvent.click(opener!);
  const dialog = document.querySelector<HTMLElement>('[data-international-return-dialog]');
  expect(dialog).toBeVisible(); expect(dialog!.querySelector('[data-international-return-help]')).toBeVisible();
  fireEvent.click(dialog!.querySelector('[data-international-return-review-open]')!);
  const button = dialog!.querySelector<HTMLButtonElement>('[data-international-return-confirm]');
  expect(button).toBeEnabled(); return button!;
}
function expectHeldHistory(before: E.CareerState, after: E.CareerState) {
  expect(after.seasons).toEqual(before.seasons); expect(after.intlHistory).toEqual(before.intlHistory);
  expect(after.lastTournament).toEqual(before.lastTournament); expect(after.awards).toEqual(before.awards);
  expect(after.intStats).toEqual({ ...before.intStats, isRetired: false });
  expect(after.events).toEqual([...before.events, RETURN_EVENT]);
  expect(after.age).toBe(before.age); expect(after.phase).toBe(before.phase); expect(after.currentClub).toBe(before.currentClub);
}
beforeEach(() => {
  pageAction.return = null; localStorage.clear(); vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer international return real page actions', () => {
  it('executes the real comeback mutation once for two captured same-render page callbacks', () => {
    const view = mount(senior()), before = read();
    const expected = copy(R.makeInternationallyAvailable(copy(before)));
    expect(R.readInternationalReturn(expected)).toEqual({ version: 1, sourceCount: before.seasons.length,
      sourceYear: before.seasons[before.seasons.length - 1].year, sourceAge: before.age,
      nationality: before.nationality, caps: before.intStats.caps });
    const mutation = vi.spyOn(R, 'makeInternationallyAvailable'), values = tape();
    const callback = pageAction.return; expect(callback).toBeTypeOf('function');
    act(() => { callback!(); callback!(); });
    // Identical zero-draw results alone would not detect a repeated helper call.
    expect(mutation).toHaveBeenCalledTimes(1); expect(values).toEqual([]); expect(read()).toEqual(expected);
    expectHeldHistory(before, read());
    expect(view.container.querySelector('[data-international-return-status="saved"]')).toHaveTextContent('Available for national-team selection');
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('uses the actual rules and confirmation once for two captured button clicks', () => {
    const view = mount(senior()), before = read(), expected = copy(R.makeInternationallyAvailable(copy(before)));
    const mutation = vi.spyOn(R, 'makeInternationallyAvailable'), values = tape(), button = confirm();
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(mutation).toHaveBeenCalledTimes(1); expect(values).toEqual([]); expect(read()).toEqual(expected);
    expectHeldHistory(before, read()); expect(document.querySelector('[data-international-return-dialog]')).toBeNull();
    expect(view.getByRole('button', { name: 'Retire from International Football 🚶' })).toBeVisible();
  });
  it('holds the complete returned save and saved read-only help across reload with no mutation or action draw', () => {
    const saved = R.makeInternationallyAvailable(senior()), values = tape(), mutation = vi.spyOn(R, 'makeInternationallyAvailable');
    const first = mount(saved), raw = localStorage.getItem(KEY); expect(read()).toEqual(saved); first.unmount();
    const view = mount(read()); expect(localStorage.getItem(KEY)).toBe(raw); expect(read()).toEqual(saved);
    const opener = view.getByRole('button', { name: 'International comeback help' }); fireEvent.click(opener);
    expect(document.querySelector('[data-international-return-help]')).toBeVisible();
    expect(document.querySelector('[data-international-return-confirm]')).toBeNull();
    fireEvent.click(document.querySelector('[data-international-return-cancel]')!);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled(); expect(values).toEqual([]);
  });
  it('keeps the legacy international retirement action and blocks a same-season return after re-retiring', () => {
    const view = mount(R.makeInternationallyAvailable(senior())), before = read();
    const expected = copy(E.retireFromInternational(copy(before))), mutation = vi.spyOn(R, 'makeInternationallyAvailable'), values = tape();
    fireEvent.click(view.getByRole('button', { name: 'Retire from International Football 🚶' }));
    expect(read()).toEqual(expected); expect(read().internationalReturn).toEqual(before.internationalReturn);
    expect(R.internationalReturnEligibility(read()).available).toBe(false);
    const callback = pageAction.return; act(() => { callback!(); callback!(); });
    expect(read()).toEqual(expected); expect(mutation).not.toHaveBeenCalled(); expect(values).toEqual([]);
    expect(view.container.querySelector('[data-international-return-status="saved"]')).toHaveTextContent('International plans already changed this season');
    expect(view.queryByRole('button', { name: 'National-team comeback' })).toBeNull();
  });
  it('does not reset the recorded-season limit when club, position and rating change', () => {
    const saved = E.retireFromInternational(R.makeInternationallyAvailable(senior()));
    const destination = E.FALLBACK_CLUBS.find(club => club.name === 'Arsenal')!;
    saved.currentClub = destination.name; saved.currentClubCountry = destination.country;
    saved.currentClubTier = destination.tier; saved.currentClubColor = destination.color; saved.currentLeague = destination.league;
    saved.position = 'ST'; saved.overall = 90;
    const view = mount(saved), before = read(), mutation = vi.spyOn(R, 'makeInternationallyAvailable'), values = tape();
    const callback = pageAction.return; act(() => { callback!(); callback!(); });
    expect(read()).toEqual(before); expect(mutation).not.toHaveBeenCalled(); expect(values).toEqual([]);
    expect(R.readInternationalReturn(read())).toEqual(saved.internationalReturn);
    expect(view.queryByRole('button', { name: 'National-team comeback' })).toBeNull();
  });
  it('plays the actual next club season with the unchanged engine outcome and complete draw vector', () => {
    const view = mount(R.makeInternationallyAvailable(senior())), before = read();
    const expectedValues = tape(), expected = copy(E.advanceProSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expected.seasons).toHaveLength(before.seasons.length + 1); expect(expectedValues.length).toBeGreaterThan(0);
    const mutation = vi.spyOn(R, 'makeInternationallyAvailable'), actualValues = tape();
    const bar = view.container.querySelector<HTMLElement>('[data-career-action-bar]'); expect(bar).not.toBeNull();
    fireEvent.click(within(bar!).getByRole('button', { name: /Next Season/ }));
    expect(read()).toEqual(expected); expect(actualValues).toEqual(expectedValues); expect(mutation).not.toHaveBeenCalled();
    expect(read().age).toBe(before.age + 1); expect(read().internationalReturn).toEqual(before.internationalReturn);
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('rejects a never-used stale eligible callback after the actual next season without invoking the mutation', () => {
    const view = mount(senior()), before = read(), stale = pageAction.return;
    expect(R.internationalReturnEligibility(before).available).toBe(true); expect(stale).toBeTypeOf('function');
    const expectedValues = tape(), expected = copy(E.advanceProSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expected.seasons).toHaveLength(before.seasons.length + 1);
    const actualValues = tape(), bar = view.container.querySelector<HTMLElement>('[data-career-action-bar]');
    expect(bar).not.toBeNull(); fireEvent.click(within(bar!).getByRole('button', { name: /Next Season/ }));
    expect(read()).toEqual(expected); expect(actualValues).toEqual(expectedValues);
    const raw = localStorage.getItem(KEY), mutation = vi.spyOn(R, 'makeInternationallyAvailable'), staleValues = tape();
    act(() => { stale!(); stale!(); });
    expect(mutation).not.toHaveBeenCalled(); expect(staleValues).toEqual([]);
    expect(read()).toEqual(expected); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('preserves a malformed optional receipt without resetting the career or exposing a new action', () => {
    const saved = senior(); saved.internationalReturn = { version: 1 } as E.CareerState['internationalReturn'];
    const values = tape(), view = mount(saved), raw = localStorage.getItem(KEY), before = read();
    const mutation = vi.spyOn(R, 'makeInternationallyAvailable'), callback = pageAction.return;
    expect(callback).toBeTypeOf('function'); act(() => { callback!(); });
    expect(read()).toEqual(before); expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled();
    expect(read().internationalReturn).toEqual(saved.internationalReturn); expect(values).toEqual([]);
    expect(view.queryByRole('button', { name: 'National-team comeback' })).toBeNull();
  });
  it('leaves queued saved season results held until their existing flow is finished', () => {
    const saved = senior(); saved.pendingSummary = copy(saved.seasons[saved.seasons.length - 1]);
    const view = mount(saved), before = read(), raw = localStorage.getItem(KEY);
    const mutation = vi.spyOn(R, 'makeInternationallyAvailable'), values = tape(), callback = pageAction.return;
    act(() => { callback!(); });
    expect(read()).toEqual(before); expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled();
    expect(values).toEqual([]); expect(view.container.querySelector('[data-international-return-open]')).toBeNull();
  });
  it('keeps an old active international save and its original retirement terms without adding a return receipt', () => {
    const saved = senior(); saved.internationalCareer = true; saved.intStats.isRetired = false;
    const view = mount(saved), before = read(), expected = copy(E.retireFromInternational(copy(before))), values = tape();
    fireEvent.click(view.getByRole('button', { name: 'Retire from International Football 🚶' }));
    expect(read()).toEqual(expected); expect(Object.prototype.hasOwnProperty.call(read(), 'internationalReturn')).toBe(false);
    expect(values).toEqual([]); expect(view.getByRole('button', { name: 'National-team comeback' })).toBeVisible();
  });
});
