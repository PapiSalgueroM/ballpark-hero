import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', async original => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Transfer Tester',
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
import { readTransferBrief, setTransferBrief, type TransferBriefResult } from '@/lib/soccerCareerTransferBrief';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { toast } from 'sonner';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', OTHER = 'other-career-save';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const read = (): E.CareerState => JSON.parse(localStorage.getItem(KEY)!);
const successTape = [0.2, 0.8, 0.3, 0.6, 0.4, 0.7, 0.5];

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function windowCareer(opted = true): E.CareerState {
  const career = E.initCareer('Transfer Tester', 'England', 'CM', '2020-24',
    { pace: 78, shooting: 78, passing: 78, dribbling: 78, defending: 78, physical: 78, reflexes: 78 },
    78, 2020, E.FALLBACK_CLUBS, null, 88);
  const club = E.FALLBACK_CLUBS.find(candidate => candidate.name === 'Arsenal')!;
  career.age = 24;
  career.currentClub = club.name; career.currentClubCountry = club.country;
  career.currentClubTier = club.tier; career.currentClubColor = club.color; career.currentLeague = club.league;
  career.contractYearsLeft = 3; career.weeklyWage = 45000; career.marketValue = 50;
  career.phase = 'transfer_window'; career.transferSituation = { type: 'no_interest' };
  career.pendingLoanOffers = null;
  career.seasons = [{ ...career.seasons[0], year: 2026, age: 24, club: club.name, clubCountry: club.country,
    clubTier: club.tier, type: 'playing', apps: 32, leagueApps: 28, goals: 8, assists: 11, rating: 7.2, ovr: 78 }];
  const saved = copy(E.repairCareer(career));
  return opted ? setTransferBrief(saved, 'minutes') : saved;
}
function mount(saved: E.CareerState) {
  expect(isSoccerCareerSave(saved)).toBe(true);
  localStorage.setItem(KEY, JSON.stringify(saved)); localStorage.setItem(OTHER, 'unrelated progress');
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  expect(view.queryByText('TEST: route crashed')).toBeNull();
  expect(view.queryByText('Create Your Player')).toBeNull();
  expect(localStorage.getItem(OTHER)).toBe('unrelated progress');
  return view;
}
function tape(values: readonly number[]) {
  const draws: number[] = [];
  let index = 0;
  vi.mocked(Math.random).mockImplementation(() => {
    const value = values[index++ % values.length];
    draws.push(value);
    return value;
  });
  return draws;
}
function requestButton(view: ReturnType<typeof render>) {
  const buttons = view.container.querySelectorAll<HTMLButtonElement>('[data-request-transfer]');
  expect(buttons).toHaveLength(1);
  expect(buttons[0]).toBeEnabled();
  return buttons[0];
}
function pressCapturedTwice(view: ReturnType<typeof render>) {
  const button = requestButton(view);
  act(() => { fireEvent.click(button); fireEvent.click(button); });
}
function legacyDecision(before: E.CareerState) {
  const result = E.requestTransfer(copy(before), E.FALLBACK_CLUBS);
  const next: E.CareerState = { ...before, transferSituation: result };
  if (result.type === 'request_result' && !result.offer) {
    next.phase = 'playing'; next.transferSituation = null;
  }
  return copy(next);
}

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer transfer brief actual page request', () => {
  it('commits one full offered response and draw vector for two captured rapid request clicks', () => {
    const view = mount(windowCareer()), before = read(), originalBytes = JSON.stringify(before);
    const expectedDraws = tape(successTape), expected = copy(E.requestTransferDecision(copy(before), E.FALLBACK_CLUBS));
    expect(expected.transferSituation?.type).toBe('request_result');
    expect(readTransferBrief(expected, E.projectLeagueApps)?.result?.status).toBe('offered');
    expect(expectedDraws.length).toBeGreaterThan(1);
    const actualDraws = tape(successTape);
    pressCapturedTwice(view);
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().phase).toBe('transfer_window');
    expect(view.container.querySelector('[data-transfer-brief-result="offered"]')).toBeVisible();
    expect(view.container.querySelector('[data-request-transfer]')).toBeNull();
    expect(JSON.stringify(before)).toBe(originalBytes);
    expect(localStorage.getItem(OTHER)).toBe('unrelated progress');
  });
  it('restores the complete offered request and visible receipt with zero new request draws', () => {
    const saved = windowCareer(); tape(successTape);
    const expected = copy(E.requestTransferDecision(saved, E.FALLBACK_CLUBS));
    expect(readTransferBrief(expected, E.projectLeagueApps)?.result?.status).toBe('offered');
    const actualDraws = tape(successTape), view = mount(expected), raw = localStorage.getItem(KEY);
    expect(read()).toEqual(expected); expect(actualDraws).toEqual([]);
    expect(view.container.querySelector('[data-transfer-brief-result="offered"]')).toBeVisible();
    expect(view.container.querySelector('[data-request-transfer]')).toBeNull();
    view.unmount();
    const restored = mount(read());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(read()).toEqual(expected); expect(actualDraws).toEqual([]);
    expect(restored.container.querySelector('[data-transfer-brief-result="offered"]')).toBeVisible();
  });
  it('saves one unsuccessful brief response and reloads it without another chance or offer', () => {
    const view = mount(windowCareer()), before = read();
    const expectedDraws = tape([0.75]), expected = copy(E.requestTransferDecision(copy(before), E.FALLBACK_CLUBS));
    expect(expectedDraws).toEqual([0.75]);
    expect(readTransferBrief(expected, E.projectLeagueApps)?.result?.status).toBe('no_interest');
    const actualDraws = tape([0.75]);
    pressCapturedTwice(view);
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().phase).toBe('transfer_window');
    expect(view.container.querySelector('[data-transfer-brief-result="no_interest"]')).toBeVisible();
    expect(view.container.querySelector('[data-transfer-brief-stay]')).toBeEnabled();
    expect(view.container.querySelector('[data-request-transfer]')).toBeNull();
    const raw = localStorage.getItem(KEY); view.unmount();
    const reloadDraws = tape([0.2]), restored = mount(read());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(read()).toEqual(expected); expect(reloadDraws).toEqual([]);
    expect(restored.container.querySelector('[data-transfer-brief-result="no_interest"]')).toBeVisible();
  });
  it('keeps an invalid saved null result playable with a real Stay action and no request reroll', () => {
    const saved = windowCareer();
    saved.transferBrief!.result = null as unknown as TransferBriefResult;
    saved.transferSituation = { type: 'request_result', offer: null };
    const expected = copy(E.stayAtClub(copy(saved))), draws = tape([0.2]), view = mount(saved);
    const raw = localStorage.getItem(KEY);
    expect(readTransferBrief(read(), E.projectLeagueApps)).toBeNull();
    expect(read()).toEqual(saved); expect(draws).toEqual([]);
    expect(view.container.querySelector('[data-transfer-brief-result]')).toBeNull();
    expect(view.container.querySelector('[data-request-transfer]')).toBeNull();
    expect(view.getByText('No offer is available in this saved window.')).toBeVisible();
    const stay = view.container.querySelector<HTMLButtonElement>('[data-transfer-brief-stay]');
    expect(stay).toBeEnabled(); expect(localStorage.getItem(KEY)).toBe(raw);
    fireEvent.click(stay!);
    expect(read()).toEqual(expected); expect(read().phase).toBe('playing'); expect(draws).toEqual([]);
    expect(localStorage.getItem(OTHER)).toBe('unrelated progress');
  });
  it('preserves the complete original unbriefed failure state and one original chance draw', () => {
    const view = mount(windowCareer(false)), before = read();
    const expectedDraws = tape([0.75]), expected = legacyDecision(copy(before));
    const actualDraws = tape([0.75]);
    fireEvent.click(requestButton(view));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws); expect(actualDraws).toEqual([0.75]);
    expect(read().phase).toBe('playing'); expect(read().transferSituation).toBeNull();
    expect(read()).not.toHaveProperty('transferBrief');
    expect(view.container.querySelector('[data-transfer-brief-result]')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('No clubs are interested right now. You must stay.');
  });
  it('preserves the complete original unbriefed offer, contract terms and original draw vector', () => {
    const view = mount(windowCareer(false)), before = read();
    const expectedDraws = tape(successTape), expected = legacyDecision(copy(before));
    expect(expected.transferSituation?.type).toBe('request_result');
    expect(expectedDraws.length).toBeGreaterThan(1);
    const actualDraws = tape(successTape);
    fireEvent.click(requestButton(view));
    expect(read()).toEqual(expected); expect(actualDraws).toEqual(expectedDraws);
    expect(read().phase).toBe('transfer_window'); expect(read()).not.toHaveProperty('transferBrief');
    expect(view.container.querySelector('[data-transfer-brief-result]')).toBeNull();
    expect(view.container.querySelector('[data-request-transfer]')).toBeNull();
  });
});
