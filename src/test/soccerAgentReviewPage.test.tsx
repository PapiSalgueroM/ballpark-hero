import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

// Capture the unchanged real callback while delegating all rendering and guards.
const pageAction = vi.hoisted(() => ({ change: null as ((agentId: string) => void) | null }));
vi.mock('@/components/soccer-career/AgentReviewCard', async original => {
  const actual = await original<typeof import('@/components/soccer-career/AgentReviewCard')>();
  return { ...actual, AgentReviewCard: (props: Parameters<typeof actual.AgentReviewCard>[0]) => {
    pageAction.change = props.onChange;
    return <actual.AgentReviewCard {...props} />;
  } };
});

vi.mock('@/lib/completions', async original => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Agent Tester',
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
import * as R from '@/lib/soccerAgentReview';
import { AGENTS } from '@/lib/soccerCareerLife';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', OTHER = 'unrelated-career-progress';
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
  career.playerName = 'Agent Tester'; career.age = 34; career.overall = 82; career.peakOverall = 82;
  career.phase = 'playing'; career.retired = false; career.retirementSuggested = true; career.agentId = 'cousin';
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
function openDialog() {
  const opener = document.querySelector<HTMLButtonElement>('[data-agent-review-open]');
  expect(opener).toBeEnabled(); fireEvent.click(opener!);
  const dialog = document.querySelector<HTMLElement>('[data-agent-review-dialog]');
  expect(dialog).toBeVisible(); expect(dialog!.querySelector('[data-agent-review-help]')).toBeVisible();
  return dialog!;
}
function heldTerms(before: E.CareerState, after: E.CareerState, target: string) {
  const from = AGENTS.find(agent => agent.id === before.agentId)!, to = AGENTS.find(agent => agent.id === target)!;
  expect(after).toEqual({ ...before, agentId: target, agentReview: {
    version: 1, sourceCount: before.seasons.length, sourceYear: before.seasons[before.seasons.length - 1].year,
    sourceAge: before.seasons[before.seasons.length - 1].age, fromAgent: before.agentId, toAgent: target,
  }, events: [...before.events, `Changed representation from ${from.name} to ${to.name}. Existing wages and contracts stay the same; future deals use your new agent's terms.`] });
}
beforeEach(() => {
  pageAction.change = null; localStorage.clear(); vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer agent review real page actions', () => {
  it('executes the real agent mutation once for two captured same-render page callbacks', () => {
    const view = mount(senior()), before = read(), expected = copy(R.changeCareerAgent(copy(before), 'shark'));
    const mutation = vi.spyOn(R, 'changeCareerAgent'), values = tape(), callback = pageAction.change;
    expect(callback).toBeTypeOf('function'); act(() => { callback!('shark'); callback!('shark'); });
    // Identical zero-draw saves alone would not detect a repeated helper call.
    expect(mutation).toHaveBeenCalledTimes(1); expect(values).toEqual([]); expect(read()).toEqual(expected);
    heldTerms(before, read(), 'shark'); expect(view.container.querySelector('[data-agent-review-status]')).toBeVisible();
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('uses the actual choices and review once for two captured confirmation clicks', () => {
    mount(senior()); const before = read(), expected = copy(R.changeCareerAgent(copy(before), 'self'));
    const mutation = vi.spyOn(R, 'changeCareerAgent'), values = tape(), dialog = openDialog();
    expect(dialog.querySelector('[data-agent-review-choices]')).toBeNull();
    fireEvent.click(dialog.querySelector('[data-agent-review-choices-open]')!);
    fireEvent.click(dialog.querySelector('[data-agent-review-choice="self"]')!);
    fireEvent.click(dialog.querySelector('[data-agent-review-review-open]')!);
    const confirm = dialog.querySelector<HTMLButtonElement>('[data-agent-review-confirm]'); expect(confirm).toBeEnabled();
    act(() => { fireEvent.click(confirm!); fireEvent.click(confirm!); });
    expect(mutation).toHaveBeenCalledTimes(1); expect(read()).toEqual(expected); heldTerms(before, read(), 'self');
    expect(values).toEqual([]); expect(document.querySelector('[data-agent-review-dialog]')).toBeNull();
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('holds the complete changed save and read-only saved help across reload without invoking the mutation', () => {
    const saved = R.changeCareerAgent(senior(), 'self'), values = tape(), mutation = vi.spyOn(R, 'changeCareerAgent');
    const first = mount(saved), raw = localStorage.getItem(KEY); expect(read()).toEqual(saved); first.unmount();
    const view = mount(read()); expect(localStorage.getItem(KEY)).toBe(raw); expect(read()).toEqual(saved);
    const dialog = openDialog(); expect(dialog.querySelector('[data-agent-review-confirm]')).toBeNull();
    fireEvent.click(dialog.querySelector('[data-agent-review-cancel]')!);
    expect(view.container.querySelector('[data-agent-review-status]')).toBeVisible();
    expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled(); expect(values).toEqual([]);
  });
  it('does not consume the captured-state guard for an invalid or current-agent selection', () => {
    mount(senior()); const before = read(), raw = localStorage.getItem(KEY), callback = pageAction.change;
    const mutation = vi.spyOn(R, 'changeCareerAgent'), values = tape();
    act(() => { callback!('toString'); callback!('cousin'); });
    expect(read()).toEqual(before); expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled();
    const expected = copy(R.changeCareerAgent(copy(before), 'super')); mutation.mockClear();
    act(() => { callback!('super'); callback!('super'); });
    expect(mutation).toHaveBeenCalledTimes(1); expect(read()).toEqual(expected); expect(values).toEqual([]);
    heldTerms(before, read(), 'super');
  });
  it('keeps the same-recorded-season limit after club, rating, loan and legacy agent changes', () => {
    const saved = R.changeCareerAgent(senior(), 'shark'), destination = E.FALLBACK_CLUBS.find(club => club.name === 'Arsenal')!;
    saved.loan = { parentClub: saved.currentClub, parentTier: saved.currentClubTier, parentLeague: saved.currentLeague,
      parentCountry: saved.currentClubCountry, parentColor: saved.currentClubColor };
    saved.currentClub = destination.name; saved.currentClubCountry = destination.country; saved.currentClubTier = destination.tier;
    saved.currentClubColor = destination.color; saved.currentLeague = destination.league; saved.agentId = 'super';
    saved.position = 'ST'; saved.overall = 90;
    const view = mount(saved), before = read(), raw = localStorage.getItem(KEY), mutation = vi.spyOn(R, 'changeCareerAgent'), values = tape();
    const callback = pageAction.change; act(() => { callback!('self'); callback!('cousin'); });
    expect(read()).toEqual(before); expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled();
    expect(values).toEqual([]); expect(R.readAgentReview(read())).toEqual(saved.agentReview);
    expect(R.agentReviewEligibility(read()).available).toBe(false); expect(view.container.querySelector('[data-agent-review-status]')).toBeVisible();
  });
  it('plays the actual next club season with the existing agent economics and complete engine draw vector', () => {
    const view = mount(R.changeCareerAgent(senior(), 'super')), before = read();
    const expectedValues = tape(), expected = copy(E.advanceProSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expected.seasons).toHaveLength(before.seasons.length + 1); expect(expectedValues.length).toBeGreaterThan(0);
    const mutation = vi.spyOn(R, 'changeCareerAgent'), actualValues = tape(), bar = view.container.querySelector<HTMLElement>('[data-career-action-bar]');
    expect(bar).not.toBeNull(); fireEvent.click(within(bar!).getByRole('button', { name: /Next Season/ }));
    expect(read()).toEqual(expected); expect(actualValues).toEqual(expectedValues); expect(mutation).not.toHaveBeenCalled();
    expect(read().age).toBe(before.age + 1); expect(read().agentReview).toEqual(before.agentReview);
    expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('rejects a never-used stale eligible callback after the actual next season without invoking the agent mutation', () => {
    const view = mount(senior()), before = read(), stale = pageAction.change;
    expect(R.agentReviewEligibility(before).available).toBe(true); expect(stale).toBeTypeOf('function');
    const expectedValues = tape(), expected = copy(E.advanceProSeason(copy(before), E.FALLBACK_CLUBS));
    expect(expected.seasons).toHaveLength(before.seasons.length + 1);
    const actualValues = tape(), bar = view.container.querySelector<HTMLElement>('[data-career-action-bar]');
    expect(bar).not.toBeNull(); fireEvent.click(within(bar!).getByRole('button', { name: /Next Season/ }));
    expect(read()).toEqual(expected); expect(actualValues).toEqual(expectedValues);
    const raw = localStorage.getItem(KEY), mutation = vi.spyOn(R, 'changeCareerAgent'), staleValues = tape();
    act(() => { stale!('shark'); stale!('super'); });
    expect(mutation).not.toHaveBeenCalled(); expect(staleValues).toEqual([]);
    expect(read()).toEqual(expected); expect(localStorage.getItem(KEY)).toBe(raw); expect(localStorage.getItem(OTHER)).toBe('held other career');
  });
  it('preserves a malformed optional receipt without resetting the career or exposing another choice', () => {
    const saved = senior(); saved.agentReview = { version: 1 } as E.CareerState['agentReview'];
    const values = tape(), view = mount(saved), raw = localStorage.getItem(KEY), before = read();
    const mutation = vi.spyOn(R, 'changeCareerAgent'), callback = pageAction.change;
    if (callback) act(() => { callback('shark'); callback('super'); });
    expect(read()).toEqual(before); expect(read().agentReview).toEqual(saved.agentReview); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(values).toEqual([]); expect(mutation).not.toHaveBeenCalled(); expect(view.container.querySelector('[data-agent-review-open]')).toBeNull();
  });
  it('leaves queued saved season results held until their existing flow is finished', () => {
    const saved = senior(); saved.phase = 'season_summary'; saved.pendingSummary = saved.seasons[saved.seasons.length - 1];
    const values = tape(), view = mount(saved), before = read(), raw = localStorage.getItem(KEY), mutation = vi.spyOn(R, 'changeCareerAgent');
    expect(view.getByRole('heading', { name: 'Season Summary' })).toBeVisible();
    expect(view.container.querySelector('[data-agent-review-open]')).toBeNull();
    expect(read()).toEqual(before); expect(localStorage.getItem(KEY)).toBe(raw); expect(values).toEqual([]); expect(mutation).not.toHaveBeenCalled();
  });
  it('holds an old unreviewed chosen-agent save during read-only rules and cancellation', () => {
    const values = tape(), view = mount(senior()), before = read(), raw = localStorage.getItem(KEY), mutation = vi.spyOn(R, 'changeCareerAgent');
    expect(Object.prototype.hasOwnProperty.call(before, 'agentReview')).toBe(false); const dialog = openDialog();
    fireEvent.click(dialog.querySelector('[data-agent-review-cancel]')!);
    expect(view.container.querySelector('[data-agent-review-open]')).toBeVisible(); expect(Object.prototype.hasOwnProperty.call(read(), 'agentReview')).toBe(false);
    expect(read()).toEqual(before); expect(localStorage.getItem(KEY)).toBe(raw); expect(mutation).not.toHaveBeenCalled(); expect(values).toEqual([]);
  });
});