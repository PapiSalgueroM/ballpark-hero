import { Component, type ReactNode } from 'react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import '@/components/SaveMovedNotice';

vi.mock('@/lib/completions', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Packed Fence Tester',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), dismiss: vi.fn() }) }));
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
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { settleLoadedMoments } from '@/components/soccer-career/careerMoments';
import { recordActivity, recordCompletion, recordStreakDay } from '@/lib/completions';
import SoccerCareer from '@/pages/SoccerCareer';
/* Relative imports keep the independent codec/fence baseline outside the
   copied page/fence aliases used by the three control arms. */
import * as S from '../lib/soccerCareerSave';
import { createSaveFence } from '../lib/saveFence';

const KEY = 'soccerCareerSave', FENCE = 'dukb-fence:soccerCareerSave', OTHER = 'packed-fence-unrelated';
const LIMIT = 60000, FORMAT = 'lz-string-utf16-career';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const nativeCareer = () => E.initCareer('Packed Fence Tester', 'England', 'CM', '2020-24',
  { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, E.FALLBACK_CLUBS, null, 88);
/* Synthetic forward-compatible data only. The age and single academy season
   come directly from initCareer, not an invented long playing history. */
const largeCareer = () => ({ ...nativeCareer(), syntheticSaveFenceEdge: {
  label: 'Synthetic unknown logical field', text: 'Exact unknown data: 雪 café ⚽ | '.repeat(5000), nested: [null, true, { count: 17 }],
} });
const normalize = (raw: string): E.CareerState => {
  const value = S.parseSoccerCareerSave(raw); expect(S.isSoccerCareerSave(value)).toBe(true);
  const loaded = E.repairCareer(value as E.CareerState);
  try { settleLoadedMoments(loaded); } catch { /* same existing page restoration */ }
  return copy(loaded);
};
let caseId = '';
const record = (stage: string, value: unknown) => {
  const out = process.env.SC_PACKED_FENCE_CASE_OUT;
  if (out) { mkdirSync(out, { recursive: true }); writeFileSync(path.join(out, caseId + '-' + stage + '.json'), JSON.stringify(value, null, 2)); }
};
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function mount(saved = largeCareer()) {
  const raw = S.serializeSoccerCareerSave(saved), input = JSON.stringify(saved), original = Storage.prototype.setItem;
  expect(saved.age).toBe(16); expect(saved.seasons).toHaveLength(1); expect(input.length).toBeGreaterThan(LIMIT);
  expect(raw.length).toBeLessThanOrEqual(LIMIT); expect(JSON.parse(raw).seasons.format).toBe(FORMAT);
  expect(S.parseSoccerCareerSave(raw)).toEqual(copy(saved));
  localStorage.setItem(KEY, raw); localStorage.setItem(OTHER, 'unchanged unrelated bytes');
  let blocked = false;
  const attempts: string[] = [];
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (this === localStorage && key === KEY) {
      attempts.push(String(value));
      if (blocked || String(value).length > LIMIT) throw new DOMException('Synthetic test store limit', 'QuotaExceededError');
    }
    original.call(this, key, value);
  });
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  return { view, raw, input, attempts, refuse: (value: boolean) => { blocked = value; } };
}
const warning = (view: ReturnType<typeof render>) => view.container.querySelector('[data-soccer-save-status="failed"]');
const read = () => S.parseSoccerCareerSave(localStorage.getItem(KEY)!) as E.CareerState;
function pair(stage: string, actual: unknown, expected: unknown) {
  record(stage, { actual, expected }); expect(JSON.stringify(actual), stage + ': complete logical state').toBe(JSON.stringify(expected));
}
function opened(m: ReturnType<typeof mount>) {
  const expected = normalize(m.raw);
  record('opened', { input: m.input, raw: m.raw, actualBytes: localStorage.getItem(KEY), actual: read(), expected, attempts: m.attempts, body: document.body.innerHTML });
  expect(m.view.queryByText('Create Your Player'), 'packed reader keeps actual career mounted').toBeNull();
  expect(m.view.queryByText('TEST: route crashed')).toBeNull();
  expect(warning(m.view), 'packed writer accepts encoded initial save under the store limit').toBeNull();
  expect(m.attempts).toHaveLength(1);
  expect(m.attempts[0].length).toBeLessThanOrEqual(LIMIT);
  pair('restored', read(), expected);
  expect(localStorage.getItem(KEY)).toBe(S.serializeSoccerCareerSave(expected));
  expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(expect.objectContaining({ currentClub: expected.currentClub, age: expected.age, retired: expected.retired }));
  expect(localStorage.getItem(FENCE)).toBe('1');
  return expected;
}
function pressNext(view: ReturnType<typeof render>) {
  const button = view.container.querySelector('[data-career-action-bar] button');
  expect(button).toBeInstanceOf(HTMLButtonElement); act(() => { fireEvent.click(button!); });
}
function clearReplayCounts() { vi.mocked(Math.random).mockClear(); vi.mocked(recordActivity).mockClear(); vi.mocked(recordStreakDay).mockClear(); vi.mocked(recordCompletion).mockClear(); }
function noReplay() { expect(Math.random).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); expect(recordStreakDay).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled(); }

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => {
  record('final-body-storage', { body: document.body.innerHTML, save: localStorage.getItem(KEY), fence: localStorage.getItem(FENCE), unrelated: localStorage.getItem(OTHER) });
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Soccer Career packed save and fence seam', () => {
  it('restores a complete packed synthetic edge and persists one actual academy action under the cap', () => {
    caseId = 'cold-action'; const m = mount(), before = opened(m), expected = copy(E.advanceYouthYear(copy(before), E.FALLBACK_CLUBS));
    clearReplayCounts(); pressNext(m.view);
    pair('earned', read(), expected); expect(Math.random).toHaveBeenCalled();
    expect(expected.age).toBe(before.age + 1); expect(expected.seasons).toHaveLength(before.seasons.length + 1);
    expect(localStorage.getItem(KEY)).toBe(S.serializeSoccerCareerSave(expected)); expect(localStorage.getItem(KEY)!.length).toBeLessThanOrEqual(LIMIT);
    expect(localStorage.getItem(FENCE)).toBe('2'); expect(localStorage.getItem(OTHER)).toBe('unchanged unrelated bytes');
  });
  it('a refused packed action rolls the fence back and retries the exact earned state without replay', () => {
    caseId = 'refused-retry'; const m = mount(), before = opened(m), old = localStorage.getItem(KEY), fence = localStorage.getItem(FENCE);
    const expected = copy(E.advanceYouthYear(copy(before), E.FALLBACK_CLUBS)); m.refuse(true); pressNext(m.view);
    const earned = m.attempts[m.attempts.length - 1]; pair('refused-earned', S.parseSoccerCareerSave(earned), expected);
    expect(warning(m.view)).toHaveAttribute('role', 'alert'); expect(localStorage.getItem(KEY)).toBe(old); expect(localStorage.getItem(FENCE)).toBe(fence);
    const count = m.attempts.length; clearReplayCounts(); m.refuse(false); fireEvent.click(m.view.getByRole('button', { name: 'Retry save' }));
    record('retry', { actualBytes: localStorage.getItem(KEY), expectedBytes: earned, actual: read(), expected, attempts: m.attempts });
    expect(m.attempts).toHaveLength(count + 1); expect(m.attempts[m.attempts.length - 1]).toBe(earned); expect(localStorage.getItem(KEY)).toBe(earned);
    pair('retried', read(), expected); noReplay(); expect(warning(m.view)).toBeNull(); expect(localStorage.getItem(FENCE)).toBe(String(Number(fence) + 1));
    expect(localStorage.getItem(OTHER)).toBe('unchanged unrelated bytes');
  });
  it('a stale Retry cannot replace another complete packed save or consume any RNG', async () => {
    caseId = 'stale-retry'; const m = mount(), before = opened(m); m.refuse(true); pressNext(m.view); expect(warning(m.view)).not.toBeNull();
    m.refuse(false); const theirYear = E.advanceYouthYear(copy(before), E.FALLBACK_CLUBS);
    expect(theirYear.pendingOffers.length).toBeGreaterThan(0);
    const theirs = copy(E.acceptOffer(theirYear, theirYear.pendingOffers[0]));
    const theirBytes = S.serializeSoccerCareerSave(theirs), otherFence = createSaveFence(localStorage); otherFence.adopt(KEY);
    expect(otherFence.write(KEY, () => { localStorage.setItem(KEY, theirBytes); return true; })).toBe('written');
    expect(S.isSoccerCareerSave(S.parseSoccerCareerSave(theirBytes))).toBe(true); expect(JSON.parse(theirBytes).seasons.format).toBe(FORMAT);
    const generation = localStorage.getItem(FENCE), count = m.attempts.length; clearReplayCounts();
    await act(async () => { fireEvent.click(m.view.getByRole('button', { name: 'Retry save' })); await import('@/components/SaveMovedNotice'); });
    record('stale-retry', { actualBytes: localStorage.getItem(KEY), expectedBytes: theirBytes, actual: read(), expected: theirs, generation, actualGeneration: localStorage.getItem(FENCE), attempts: m.attempts, body: document.body.innerHTML });
    expect(localStorage.getItem(KEY), 'stale Retry keeps complete winning packed bytes').toBe(theirBytes);
    expect(localStorage.getItem(FENCE)).toBe(generation); expect(m.attempts).toHaveLength(count); pair('winning-save', read(), theirs); noReplay();
    expect(screen.getByTestId('save-moved-notice')).toHaveTextContent('This career moved on in another tab. Reload to carry on.');
    expect(localStorage.getItem(OTHER)).toBe('unchanged unrelated bytes');
  });
  it('retains an independent real legacy restore and generation fence baseline', () => {
    caseId = 'independent-legacy'; const value = nativeCareer(), raw = JSON.stringify(value); expect(raw.length).toBeLessThanOrEqual(LIMIT);
    expect(S.isSoccerCareerSave(S.parseSoccerCareerSave(raw))).toBe(true); expect(S.serializeSoccerCareerSave(value)).toBe(raw); pair('legacy', S.parseSoccerCareerSave(raw), copy(value));
    const bytes = new Map<string, string>([[KEY, raw]]), store = { getItem: (key: string) => bytes.get(key) ?? null,
      setItem: (key: string, data: string) => { bytes.set(key, data); }, removeItem: (key: string) => { bytes.delete(key); } };
    const older = createSaveFence(store), newer = createSaveFence(store); older.adopt(KEY); newer.adopt(KEY);
    expect(newer.write(KEY, () => { store.setItem(KEY, raw); return true; })).toBe('written');
    const write = vi.fn(() => true); expect(older.write(KEY, write)).toBe('moved'); expect(write).not.toHaveBeenCalled(); expect(bytes.get(KEY)).toBe(raw);
    record('legacy-fence', { before: raw, after: bytes.get(KEY), generation: bytes.get(FENCE), refusedCallbackCalls: write.mock.calls.length });
  });
});
