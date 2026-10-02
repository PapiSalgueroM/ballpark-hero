import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Save Tester',
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
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <p data-testid="share-score">{score}</p> }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { recordCompletion } from '@/lib/completions';
import SoccerCareer from '@/pages/SoccerCareer';

/* The page, its creator, actual engine and completion hook run here. Only
   network services, presentation-only children and select popups are stubbed. */
type Saved = Record<string, any>;
const KEY = 'soccerCareerSave';
const OTHER = 'nhl-front-office-save-v1';
const realRandom = Math.random;
const read = (): Saved => JSON.parse(localStorage.getItem(KEY)!);
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function nativeCareer() {
  const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
  return E.initCareer('Save Tester', 'England', 'CM', '2020-24', stats, 70, 2020, E.FALLBACK_CLUBS, null, 88);
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function mount(raw: string | null) {
  if (raw !== null) localStorage.setItem(KEY, raw);
  localStorage.setItem(OTHER, 'unrelated progress');
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  const removes = vi.spyOn(Storage.prototype, 'removeItem');
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  return { view, writes, removes };
}
function assertPlayable(view: ReturnType<typeof render>) {
  expect(view.queryByText('TEST: route crashed')).toBeNull();
  expect(view.queryByRole('alert')).toBeNull();
  expect(view.queryByText('Create Your Player')).toBeNull();
  expect(view.container.textContent).toContain('Save Tester');
}
function pressNext(view: ReturnType<typeof render>) {
  const button = view.container.querySelector('[data-career-action-bar] button');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  fireEvent.click(button!);
}
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  Math.random = () => 0.52;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = () => undefined;
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Math.random = realRandom; });

describe('Soccer Career actual save recovery', () => {
  it('restores current progress synchronously and advances the same career once', () => {
    const saved = copy(nativeCareer()); saved.netWorth = -4.25; saved.awards = [{ year: 2020, name: 'Simulation fixture award', emoji: 'T' }];
    const { view, removes } = mount(JSON.stringify(saved));
    assertPlayable(view);
    expect(read().seasons).toEqual(saved.seasons); expect(read().awards).toEqual(saved.awards);
    expect(read().netWorth).toBe(-4.25); expect(read().weeklyWage).toBe(saved.weeklyWage);
    expect(read().phase).toBe('youth'); expect(read().age).toBe(16);
    pressNext(view);
    expect(read().age).toBe(17); expect(read().seasons).toHaveLength(2);
    expect(read().seasons[1].year).toBe(2021); expect(read().playerName).toBe(saved.playerName);
    expect(removes).not.toHaveBeenCalled(); expect(localStorage.getItem(OTHER)).toBe('unrelated progress');
  });
  it('preserves supported older optional migrations without inventing the starting overall', () => {
    const saved: Saved = copy(nativeCareer());
    for (const key of ['primeType', 'loan', 'pendingLoanOffers', 'frozenOut', 'badSeasonStreak', 'startingOverall', 'physique', 'attrShape', 'money', 'phone', 'peakOverall', 'sponsorBonus', 'potentialEarned', 'eliteStreak', 'pendingTournament', 'lastTournament', 'intlHistory', 'personality', 'agentId', 'lifeFlags', 'appearance', 'phoneInbox', 'phoneUsedIds', 'karma']) delete saved[key];
    const { view } = mount(JSON.stringify(saved));
    assertPlayable(view);
    const restored = read();
    expect(restored.seasons).toEqual(saved.seasons); expect(restored.overall).toBe(70);
    expect(restored.loan).toBeNull(); expect(restored.frozenOut).toBe(0);
    expect(restored.physique).toEqual(E.repairCareer(copy(saved as E.CareerState)).physique);
    expect(restored).not.toHaveProperty('startingOverall'); expect(restored.money).toBeTruthy();
    pressNext(view);
    expect(read().age).toBe(17); expect(read().seasons).toHaveLength(2);
    expect(readSaveCompletion()).toEqual([]);
  });
  it('retains the older missing-summary migration into a playable season', () => {
    const saved = copy(nativeCareer()); saved.phase = 'season_summary'; saved.pendingSummary = null;
    const { view } = mount(JSON.stringify(saved));
    assertPlayable(view); expect(read().phase).toBe('playing');
    expect(view.container.querySelector('[data-career-action-bar] button')).toBeEnabled();
    expect(read().seasons).toEqual(saved.seasons);
  });
  it('restores a decided moral dilemma and keeps its consequence after Continue', () => {
    const saved = copy(nativeCareer()); saved.phase = 'moral_dilemma'; saved.pendingMoralDilemma = null;
    saved.events = ['Simulation fixture consequence']; saved.popularity = 41;
    const { view } = mount(JSON.stringify(saved));
    assertPlayable(view); expect(view.getByText('Decision Made')).toBeVisible();
    expect(view.getAllByText('Simulation fixture consequence')[0]).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: /Continue/ }));
    expect(read().phase).not.toBe('moral_dilemma'); expect(read().popularity).toBe(41);
  });
  it('restores serialized event choices without requiring lost function properties', () => {
    const saved = copy(nativeCareer());
    const event = E.MORAL_DILEMMAS.find(d => d.id === 'haunted_hotel')!;
    saved.phase = 'moral_dilemma'; saved.pendingMoralDilemma = copy(event);
    const { view } = mount(JSON.stringify(saved));
    assertPlayable(view);
    const choice = Array.from(view.container.querySelectorAll('button')).find(b => b.textContent?.includes('Sleep in the team bus'));
    expect(choice).toBeEnabled(); fireEvent.click(choice!);
    expect(read().pendingMoralDilemma).toBeNull(); expect(view.getByText('Decision Made')).toBeVisible();
  });
  it('rehydrates a serialized random event and applies its catalog outcome', () => {
    const saved = copy(nativeCareer());
    const event = E.getAllEvents(saved)[0]; saved.phase = 'random_events'; saved.pendingEvents = [copy(event)];
    expect(saved.pendingEvents[0].choices[0]).not.toHaveProperty('apply');
    const expected = E.applyEventChoice(copy(saved), 0, E.FALLBACK_CLUBS);
    const { view } = mount(JSON.stringify(saved)); assertPlayable(view);
    fireEvent.click(view.getByRole('button', { name: new RegExp(event.choices[0].label) }));
    const next = read();
    expect(next.lastEventId).toBe(event.id); expect(next.pendingEvents).toHaveLength(0);
    expect(next.phase).toBe(expected.phase); expect(next.overall).toBe(expected.overall);
    expect(next.morale).toBe(expected.morale); expect(next.netWorth).toBe(expected.netWorth);
    expect(next.events).toEqual(expected.events);
  });
  it('restores an older World Cup result without requiring a new tournament field', () => {
    const saved: Saved = copy(nativeCareer()); saved.phase = 'world_cup'; delete saved.pendingTournament;
    saved.pendingWorldCup = { year: 2022, nation: 'England', matches: [], playerApps: 3, playerGoals: 1, playerAssists: 2, playerAvgRating: 7.3, result: 'Group Stage', bestPlayer: false };
    const { view } = mount(JSON.stringify(saved));
    assertPlayable(view); expect(view.getByText('World Cup 2022')).toBeVisible();
    expect(read().pendingWorldCup).toEqual(saved.pendingWorldCup);
    fireEvent.click(view.getByRole('button', { name: /Continue/ }));
    expect(read().phase).not.toBe('world_cup');
  });
  for (const tail of ['manager', 'pundit', 'owner'] as const) it(`restores the current ${tail} tail with its own saved season history`, () => {
    const retired = E.manualRetire(nativeCareer());
    const saved = E.choosePostRetirement(retired, tail, E.FALLBACK_CLUBS);
    const { view } = mount(JSON.stringify(saved));
    assertPlayable(view); expect(read().phase).toBe(`${tail}_season`);
    expect(read()[`${tail}State`]).toEqual(copy(saved[`${tail}State`]));
  });
  it('restores a retired career on the first render and never records it again after reload', async () => {
    const retired = E.choosePostRetirement(E.manualRetire(nativeCareer()), 'retire', E.FALLBACK_CLUBS);
    const { view } = mount(JSON.stringify(retired));
    assertPlayable(view); expect(view.getByTestId('share-score')).toHaveTextContent(`${retired.legacy!.score}/100`);
    await act(async () => { await Promise.resolve(); });
    expect(readSaveCompletion()).toEqual([]);
    view.unmount();
    const second = mount(localStorage.getItem(KEY));
    assertPlayable(second.view); await act(async () => { await Promise.resolve(); });
    expect(readSaveCompletion()).toEqual([]); expect(read().seasons).toEqual(copy(retired.seasons));
  });
  it('records a newly finished ceremony once and does not replay it on the next mount', async () => {
    const ceremony = E.manualRetire(nativeCareer());
    const { view } = mount(JSON.stringify(ceremony)); assertPlayable(view);
    fireEvent.click(view.getByRole('button', { name: /Retire and Enjoy Life/ }));
    await act(async () => { await Promise.resolve(); });
    expect(readSaveCompletion()).toEqual([ceremony.legacy!.score]);
    view.unmount(); const next = mount(localStorage.getItem(KEY)); assertPlayable(next.view);
    await act(async () => { await Promise.resolve(); });
    expect(readSaveCompletion()).toEqual([ceremony.legacy!.score]);
  });

  const corrupt: [string, (saved: Saved) => void][] = [
    ['null seasons', s => { s.seasons = null; }],
    ['missing seasons', s => { delete s.seasons; }],
    ['empty seasons', s => { s.seasons = []; }],
    ['object seasons', s => { s.seasons = {}; }],
    ['null season entry', s => { s.seasons = [null]; }],
    ['text season rating', s => { s.seasons[0].rating = 'not a rating'; }],
    ['object event history', s => { s.events = {}; }],
    ['null pending events', s => { s.pendingEvents = null; }],
    ['null event entry', s => { s.pendingEvents = [null]; }],
    ['null event choices', s => { s.pendingEvents = [{ id: 5, title: 'Simulation fixture', description: 'Fixture', choices: null }]; s.phase = 'random_events'; }],
    ['null awards', s => { s.awards = null; }],
    ['null award entry', s => { s.awards = [null]; }],
    ['null properties', s => { s.properties = null; }],
    ['object investments', s => { s.investments = {}; }],
    ['null family', s => { s.family = null; }],
    ['null international stats', s => { s.intStats = null; }],
    ['object contract offers', s => { s.pendingOffers = {}; }],
    ['null news', s => { s.pendingNews = null; }],
    ['text market value', s => { s.marketValue = 'not a value'; }],
    ['unknown phase', s => { s.phase = 'missing-screen'; }],
    ['null manager history', s => { s.managerState = { seasonResults: null }; s.phase = 'manager_season'; }],
    ['null pundit predictions', s => { s.punditState = { predictions: null }; s.phase = 'pundit_season'; }],
    ['null owner history', s => { s.ownerState = { seasonResults: null }; s.phase = 'owner_season'; }],
  ];
  for (const [name, mutate] of corrupt) it(`rejects ${name} before render, retains raw bytes and deletes only its own key on request`, () => {
    const saved: Saved = copy(nativeCareer()); mutate(saved);
    const raw = JSON.stringify(saved), { view, writes, removes } = mount(raw);
    expect(view.queryByText('TEST: route crashed')).toBeNull();
    expect(view.getByText('Create Your Player')).toBeVisible(); expect(view.getByRole('alert')).toHaveTextContent("couldn't open this save");
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled(); expect(removes).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'Delete unusable save' }));
    expect(localStorage.getItem(KEY)).toBeNull(); expect(removes.mock.calls).toEqual([[KEY]]);
    expect(view.queryByRole('alert')).toBeNull(); expect(view.getByText('Create Your Player')).toBeVisible();
    expect(localStorage.getItem(OTHER)).toBe('unrelated progress'); expect(readSaveCompletion()).toEqual([]);
  });
  for (const [name, raw] of [['malformed JSON', '{broken'], ['primitive JSON', 'false']] as const) it(`retains ${name} until explicit deletion`, () => {
    const { view, writes, removes } = mount(raw);
    expect(view.getByRole('alert')).toHaveTextContent("couldn't open this save");
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled(); expect(removes).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'Delete unusable save' }));
    expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem(OTHER)).toBe('unrelated progress');
  });
  it('allows an explicit new career to replace damaged bytes without touching another save', () => {
    vi.useFakeTimers();
    const raw = JSON.stringify({ ...copy(nativeCareer()), seasons: null });
    const { view, writes, removes } = mount(raw);
    expect(view.getByRole('alert')).toBeVisible();
    fireEvent.change(view.getByPlaceholderText('Enter your player name...'), { target: { value: 'New Save Tester' } });
    const selectors = view.container.querySelectorAll('select');
    fireEvent.change(selectors[0], { target: { value: 'England' } });
    fireEvent.change(selectors[1], { target: { value: 'CM' } });
    fireEvent.change(selectors[2], { target: { value: '2020-24' } });
    fireEvent.click(view.getByRole('button', { name: /Generate Starting Potential/ }));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: /Begin Career/ }));
    expect(view.queryByRole('alert')).toBeNull(); expect(read().playerName).toBe('New Save Tester');
    expect(read().seasons).toHaveLength(1); expect(read().age).toBe(16); expect(read().phase).toBe('youth');
    expect(removes).not.toHaveBeenCalled(); expect(localStorage.getItem(OTHER)).toBe('unrelated progress');
  });
  it('opens a clean creator without a recovery warning when no save exists', () => {
    const { view, writes, removes } = mount(null);
    expect(view.getByText('Create Your Player')).toBeVisible(); expect(view.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull(); expect(writes).not.toHaveBeenCalled(); expect(removes).not.toHaveBeenCalled();
  });
});
function readSaveCompletion() {
  return vi.mocked(recordCompletion).mock.calls.filter(call => call[0] === '/soccer-career').map(call => call[1]);
}
