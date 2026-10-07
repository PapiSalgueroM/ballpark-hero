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
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { recordCompletion, recordActivity, recordStreakDay } from '@/lib/completions';
import { toast } from 'sonner';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', OTHER = 'other-career-save';
const notice = 'Your latest progress could not be saved. Keep this tab open, then try again.';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const read = (): E.CareerState => JSON.parse(localStorage.getItem(KEY)!);
const nativeCareer = () => E.initCareer('Write Tester', 'England', 'CM', '2020-24', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, E.FALLBACK_CLUBS, null, 88);
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function mount(saved = nativeCareer(), refused = false) {
  const raw = JSON.stringify(saved), originalSet = Storage.prototype.setItem;
  localStorage.setItem(KEY, raw); localStorage.setItem(OTHER, 'untouched progress');
  let blocked = refused;
  const attempts: string[] = [];
  const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === KEY) { attempts.push(value); if (blocked) throw new DOMException('Save refused', 'QuotaExceededError'); }
    originalSet.call(this, key, value);
  });
  const removes = vi.spyOn(Storage.prototype, 'removeItem');
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  return { view, raw, attempts, writes, removes, refuse: (value: boolean) => { blocked = value; } };
}
const warning = (view: ReturnType<typeof render>) => view.container.querySelector('[data-soccer-save-status="failed"]');
function assertWarning(view: ReturnType<typeof render>) {
  expect(warning(view)).toHaveAttribute('role', 'alert'); expect(warning(view)).toHaveTextContent(notice);
  expect(view.queryByRole('button', { name: 'Retry save' })).toBeEnabled();
  expect(view.queryByText('TEST: route crashed')).toBeNull();
}
function pressNext(view: ReturnType<typeof render>) {
  const button = view.container.querySelector('[data-career-action-bar] button');
  expect(button).toBeInstanceOf(HTMLButtonElement); fireEvent.click(button!);
}
function retry(view: ReturnType<typeof render>) { fireEvent.click(view.getByRole('button', { name: 'Retry save' })); }
function noReplay() {
  expect(Math.random).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); expect(recordStreakDay).not.toHaveBeenCalled();
}
function clearReplayCounts() { vi.mocked(Math.random).mockClear(); vi.mocked(recordActivity).mockClear(); vi.mocked(recordStreakDay).mockClear(); }
function bankSprint(view: ReturnType<typeof render>) {
  fireEvent.click(view.getByRole('button', { name: 'Open the training ground' }));
  fireEvent.click(view.getByRole('button', { name: /Sprint Burst/ }));
  fireEvent.click(view.getByRole('button', { name: /Tap to start the 5 second sprint/ }));
  for (let i = 0; i < 25; i++) fireEvent.click(view.getByRole('button', { name: /GO GO GO/ }));
  act(() => { vi.advanceTimersByTime(5000); });
  expect(view.container.querySelector('[data-training-score]')).toHaveTextContent('80');
  fireEvent.click(view.getByRole('button', { name: 'Bank the session' }));
  fireEvent.click(view.getByRole('button', { name: 'Back to your career' }));
}
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer Career failed write recovery', () => {
  it('keeps the restored career and old bytes while showing a persistent save warning and one toast', () => {
    const m = mount(nativeCareer(), true); assertWarning(m.view);
    expect(m.view.container.textContent).toContain('Write Tester'); expect(m.view.queryByText('Create Your Player')).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(m.raw); expect(localStorage.getItem(OTHER)).toBe('untouched progress');
    expect(m.attempts).toHaveLength(1); expect(m.removes).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(notice); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(30000); }); assertWarning(m.view); expect(m.attempts).toHaveLength(1);
  });
  it('keeps repeated refused retries visible without replaying progress or repeating the toast', () => {
    const m = mount(nativeCareer(), true); clearReplayCounts();
    retry(m.view); retry(m.view); assertWarning(m.view);
    expect(m.attempts).toHaveLength(3); expect(new Set(m.attempts).size).toBe(1); expect(localStorage.getItem(KEY)).toBe(m.raw);
    expect(m.removes).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledTimes(1); noReplay(); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('retries the actually earned training result exactly once and restores it on the next mount', () => {
    const m = mount(), before = read(), oldBytes = localStorage.getItem(KEY), expected = copy(E.applyTrainingResult(copy(before), 'pace', 80));
    m.refuse(true); bankSprint(m.view); assertWarning(m.view);
    expect(localStorage.getItem(KEY)).toBe(oldBytes); expect(JSON.parse(m.attempts[m.attempts.length - 1])).toEqual(expected);
    expect(expected.statBoostNextSeason.pace).toBe((before.statBoostNextSeason.pace || 0) + 2); const attempts = m.attempts.length;
    clearReplayCounts(); m.refuse(false); retry(m.view);
    expect(m.attempts).toHaveLength(attempts + 1); expect(read()).toEqual(expected); expect(warning(m.view)).toBeNull(); noReplay();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(m.removes).not.toHaveBeenCalled();
    m.view.unmount(); vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.52);
    const restored = mount(read()); expect(read()).toEqual(expected); expect(warning(restored.view)).toBeNull();
    fireEvent.click(restored.view.getByRole('button', { name: 'Open the training ground' }));
    expect(restored.view.queryByText('Already trained this season')).toBeVisible(); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('retries the latest earned season after more than one failed career change without rerunning its engine', () => {
    const m = mount(), before = read(), oldBytes = localStorage.getItem(KEY);
    const trained = E.applyTrainingResult(copy(before), 'pace', 80), expected = copy(E.advanceYouthYear(copy(trained), E.FALLBACK_CLUBS));
    m.refuse(true); bankSprint(m.view); pressNext(m.view); assertWarning(m.view);
    expect(localStorage.getItem(KEY)).toBe(oldBytes); expect(JSON.parse(m.attempts[m.attempts.length - 1])).toEqual(expected);
    expect(expected.seasons).toHaveLength(before.seasons.length + 1); expect(expected.age).toBe(before.age + 1);
    clearReplayCounts(); m.refuse(false); retry(m.view); noReplay(); expect(read()).toEqual(expected);
    expect(warning(m.view)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('clears a failed save on the next successful automatic save and alerts again on a later refusal', () => {
    const m = mount(nativeCareer(), true); assertWarning(m.view); m.refuse(false); bankSprint(m.view);
    expect(warning(m.view)).toBeNull(); expect(read().statBoostNextSeason.pace).toBe(2); const saved = localStorage.getItem(KEY);
    m.refuse(true); pressNext(m.view); assertWarning(m.view);
    expect(localStorage.getItem(KEY)).toBe(saved); expect(toast.error).toHaveBeenCalledTimes(2);
  });
  it('clears the old failure after explicit reset and saves the replacement career without old progress', () => {
    const m = mount(nativeCareer(), true); assertWarning(m.view);
    fireEvent.click(m.view.getByRole('button', { name: /New Career/ }));
    fireEvent.click(m.view.getByRole('button', { name: 'Delete & Start Over' }));
    expect(warning(m.view)).toBeNull(); expect(localStorage.getItem(KEY)).toBeNull(); expect(m.removes.mock.calls).toEqual([[KEY]]);
    fireEvent.change(m.view.getByPlaceholderText('Enter your player name...'), { target: { value: 'Replacement Tester' } });
    const selectors = m.view.container.querySelectorAll('select');
    for (const [index, value] of ['England', 'CM', '2020-24'].entries()) fireEvent.change(selectors[index], { target: { value } });
    fireEvent.click(m.view.getByRole('button', { name: /Generate Starting Potential/ })); act(() => { vi.advanceTimersByTime(3000); });
    fireEvent.click(m.view.getByRole('button', { name: /Begin Career/ })); assertWarning(m.view);
    expect(localStorage.getItem(KEY)).toBeNull(); expect(toast.error).toHaveBeenCalledTimes(2);
    m.refuse(false); retry(m.view);
    expect(warning(m.view)).toBeNull(); expect(read().playerName).toBe('Replacement Tester'); expect(read().seasons).toHaveLength(1);
    expect(localStorage.getItem(OTHER)).toBe('untouched progress'); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('persists the finished retirement on retry without recording its completion a second time', async () => {
    const ceremony = E.manualRetire(nativeCareer()), m = mount(ceremony), oldBytes = localStorage.getItem(KEY);
    m.refuse(true); fireEvent.click(m.view.getByRole('button', { name: /Retire and Enjoy Life/ }));
    await act(async () => { await Promise.resolve(); }); assertWarning(m.view);
    expect(localStorage.getItem(KEY)).toBe(oldBytes); expect(recordCompletion).toHaveBeenCalledTimes(1);
    const earned = JSON.parse(m.attempts[m.attempts.length - 1]); expect(earned.phase).toBe('retired'); expect(earned.legacy.score).toBe(ceremony.legacy!.score);
    clearReplayCounts(); m.refuse(false); retry(m.view); await act(async () => { await Promise.resolve(); });
    expect(read()).toEqual(earned); expect(recordCompletion).toHaveBeenCalledTimes(1); noReplay(); expect(warning(m.view)).toBeNull();
  });
  it('retains an independent valid restore and earned engine baseline without mounting the page', () => {
    const saved = copy(nativeCareer()), raw = JSON.stringify(saved); expect(isSoccerCareerSave(saved)).toBe(true);
    const restored = E.repairCareer(copy(saved)), trained = E.applyTrainingResult(restored, 'pace', 80);
    expect(trained.statBoostNextSeason.pace).toBe((saved.statBoostNextSeason.pace || 0) + 2); expect(E.applyTrainingResult(trained, 'pace', 80)).toEqual(trained);
    const next = E.advanceYouthYear(trained, E.FALLBACK_CLUBS); expect(next.age).toBe(saved.age + 1); expect(next.seasons).toHaveLength(saved.seasons.length + 1);
    expect(JSON.stringify(saved)).toBe(raw); expect(isSoccerCareerSave(copy(next))).toBe(true); expect(recordCompletion).not.toHaveBeenCalled();
  });
});

