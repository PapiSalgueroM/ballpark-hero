import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@/lib/completions', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Focus fixture',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }) }));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success() {}, error() {}, info() {}, message() {} });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, property) {
      if (property === 'then') return (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
      if (typeof property === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  return { SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub', supabase: {
    from: () => chain(), rpc: () => chain(), functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: { getSession: () => Promise.resolve({ data: { session: null } }), getUser: () => Promise.resolve({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }), removeChannel() {},
  } };
});

import SoccerCareer from '@/pages/SoccerCareer';
import { FALLBACK_CLUBS, initCareer, repairCareer, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { readCommunityShield, type CommunityShieldResult } from '@/lib/soccerCareerExtraCups';
import { isSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { soccerSeasonKey } from '@/lib/season/soccer';
import { readResume, resumeRowIndex } from '@/lib/season/resume';
import { writeResume } from '@/components/season-centre/resumeStore';
import { seasonStable } from '@/components/soccer-career/SoccerSeasonCentre';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

const SAVE_KEY = 'soccerCareerSave';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Controlled saved career and match DTOs, not real results or naturally played careers.
function fixture(zeroApps: boolean): CareerState {
  const row = copy(cupSeason);
  const qualification: CommunityShieldResult['qualification'] = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    leagueWinner: 'Arsenal', cupWinner: 'Newcastle', entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const result: CommunityShieldResult = {
    version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [1, 1], decidedBy: 'penalties', penalties: [5, 4], winner: 'Arsenal',
    player: { club: 'Arsenal', availability: 'available', selected: !zeroApps, apps: zeroApps ? 0 : 1, goals: zeroApps ? 0 : 1, assists: 0, cleanSheets: 0, rating: zeroApps ? null : 8, title: !zeroApps },
  };
  if (zeroApps) Object.assign(row, { apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0, yellowCards: 0, redCards: 0,
    leagueTitle: false, domesticCup: false, cupRun: undefined, injurySevere: true });
  else Object.assign(row, { apps: row.apps + 1, goals: row.goals + 1, rating: Math.round((row.rating * row.apps + 8) / (row.apps + 1) * 10) / 10,
    leagueTitle: true, leagueFinish: 1, leagueSize: 20 });
  row.extraCups = [result];
  const club = FALLBACK_CLUBS.find(item => item.name === row.club);
  expect(club, 'existing club fixture foundation').toBeDefined();
  const stats = { pace: 71, shooting: 71, passing: 71, dribbling: 71, defending: 71, physical: 71, reflexes: 71 };
  const initial = initCareer('Focus fixture', 'England', 'ST', '2020s', stats, 71, 2027, FALLBACK_CLUBS, null);
  const career = copy(repairCareer({ ...initial, phase: 'playing', retired: false, currentClub: row.club, currentClubCountry: row.clubCountry,
    currentClubColor: club!.color, currentClubTier: row.clubTier, currentLeague: club!.league, seasons: [row], pendingSummary: null,
    pendingEvents: [], pendingOffers: [], pendingNews: [], lastUCLResult: null, events: ['Controlled saved replay focus fixture.'], story: [] }));
  expect(isSoccerCareerSave(career), 'the real core save reader admits this controlled fixture').toBe(true);
  expect(readCommunityShield(career.seasons[0]), 'the complete controlled opening passes the real strict reader').not.toBeNull();
  return career;
}

beforeEach(() => {
  localStorage.clear(); vi.useRealTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: true, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount(career: CareerState) {
  localStorage.setItem(SAVE_KEY, serializeSoccerCareerSave(career));
  return render(<HelmetProvider><MemoryRouter initialEntries={['/soccer-career']}><SoccerCareer /></MemoryRouter></HelmetProvider>);
}
async function acknowledgeFirstHelp(view: ReturnType<typeof render>) {
  const help = view.container.querySelector<HTMLElement>('[data-season-help]');
  if (help) fireEvent.click(within(help).getByRole('button', { name: 'Got it' }));
  await act(async () => {});
}
async function closeAndCheck(view: ReturnType<typeof render>, opener: HTMLButtonElement, marker: string, focus: MockInstance<(options?: FocusOptions) => void>) {
  const close = await screen.findByRole('button', { name: 'Back to your career' });
  close.focus(); expect(document.activeElement, 'real close control takes focus before it unmounts').toBe(close);
  const saved = localStorage.getItem(SAVE_KEY);
  focus.mockClear(); fireEvent.click(close);
  await waitFor(() => expect(view.container.querySelector('[data-season-centre]'), 'actual Centre closes before the return assertion').toBeNull());
  expect(opener.isConnected, 'the same career opener remains connected').toBe(true);
  expect(document.activeElement, marker + '_MISSING: close restores the real opener').toBe(opener);
  expect(focus.mock.contexts.some((target, index) => target === opener && focus.mock.calls[index]?.[0]?.preventScroll === true),
    marker + '_OPTIONS_MISSING: the opener return requests preventScroll').toBe(true);
  expect(localStorage.getItem(SAVE_KEY), 'closing the replay keeps settled career bytes').toBe(saved);
}

describe('Soccer Career Season Centre return focus', () => {
  it('SC_CENTRE_FOCUS_RESUME: restores the connected Resume opener after a positive-app saved season', async () => {
    const career = fixture(false), row = career.seasons[0], key = soccerSeasonKey(career.playerName, row);
    expect(key, 'positive-app replay has the real saved-fields key').not.toBeNull();
    const record = { key: key!, year: row.year, md: 1, speed: 'results' as const, stable: seasonStable('table', row.leagueFinish) };
    writeResume('soccer', record);
    expect(readResume('soccer')).toMatchObject(record);
    expect(resumeRowIndex(readResume('soccer'), career.seasons, value => soccerSeasonKey(career.playerName, value), career.phone?.world?.year)).toBe(0);
    const view = mount(career), focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const opener = await waitFor(() => { const button = view.container.querySelector<HTMLButtonElement>('[data-season-resume]'); expect(button, 'the real lazy Resume chip loads').not.toBeNull(); return button!; });
    opener.focus(); expect(document.activeElement, 'actual Resume opener receives focus before click').toBe(opener); fireEvent.click(opener);
    await waitFor(() => expect(view.container.querySelector('[data-centre-stage]'), 'actual positive-app viewer loads').not.toBeNull());
    await acknowledgeFirstHelp(view);
    await closeAndCheck(view, opener, 'SC_CENTRE_FOCUS_RESUME', focus);
  }, 20000);

  it('SC_CENTRE_FOCUS_ZERO_SHIELD: restores Season replays after a represented zero-app Shield result', async () => {
    const career = fixture(true), row: SeasonRecord = career.seasons[0], original = JSON.stringify(row);
    expect(row.apps).toBe(0); expect(soccerSeasonKey(career.playerName, row)).toBeNull();
    expect(readCommunityShield(row)?.player.selected).toBe(false);
    const view = mount(career), focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const opener = await waitFor(() => { const button = view.container.querySelector<HTMLButtonElement>('[data-open-season-replays]'); expect(button, 'real zero-app Shield Replay entry exists').not.toBeNull(); return button!; });
    opener.focus(); expect(document.activeElement, 'actual Replay opener receives focus before click').toBe(opener); fireEvent.click(opener);
    const choice = await waitFor(() => { const button = view.container.querySelector<HTMLButtonElement>('[data-replay-row="0"]'); expect(button, 'real season picker includes the represented zero-app row').not.toBeNull(); return button!; });
    fireEvent.click(choice);
    await waitFor(() => expect(view.container.querySelector('[data-centre-league-unavailable]'), 'zero-app league view remains honestly unavailable').not.toBeNull());
    const shield = view.container.querySelector<HTMLButtonElement>('[data-centre-competition="shield"]');
    expect(shield, 'the actual represented Shield tab is available').not.toBeNull(); fireEvent.click(shield!);
    const match = await waitFor(() => { const button = view.container.querySelector<HTMLButtonElement>('[data-centre-cup-open="0"]'); expect(button, 'the actual saved opening is inspectable').not.toBeNull(); return button!; });
    fireEvent.click(match);
    expect(view.container.querySelector('[data-centre-cup-score]'), 'the real saved match score is shown').toHaveTextContent('1-1');
    expect(JSON.stringify(row), 'read-only navigation retains the controlled saved row').toBe(original);
    await closeAndCheck(view, opener, 'SC_CENTRE_FOCUS_ZERO_SHIELD', focus);
  }, 20000);
});
