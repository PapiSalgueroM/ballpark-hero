import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
/* The notice is a lazy chunk on the page; importing it here keeps it in the
   module cache so it resolves on the next turn. */
import '@/components/SaveMovedNotice';

/* Round 1330: Soccer Career bound to Round 1323's save fence. Another tab is
   played here the way a fenced game write in another tab leaves the disk: the
   fence key one higher than this page holds, and save bytes this page never
   wrote. The page is mounted the way soccerCareerSaveRetry.test.tsx mounts it. */

vi.mock('@/lib/completions', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Fence Tester',
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
import { toast } from 'sonner';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', FENCE = 'dukb-fence:soccerCareerSave';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const read = (): E.CareerState => JSON.parse(localStorage.getItem(KEY)!);
const nativeCareer = () => E.initCareer('Fence Tester', 'England', 'CM', '2020-24', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, E.FALLBACK_CLUBS, null, 88);
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function mount(raw: string | null) {
  if (raw !== null) localStorage.setItem(KEY, raw);
  return render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
}
/* Another tab plays two seasons on and writes through its own fence. Two, so
   its bytes can never equal what this page would write with one press. */
function otherTabPlays(from: E.CareerState = nativeCareer()): string {
  const theirs = E.advanceYouthYear(E.advanceYouthYear(copy(from), E.FALLBACK_CLUBS), E.FALLBACK_CLUBS);
  const raw = JSON.stringify(theirs);
  const now = Number(localStorage.getItem(FENCE) ?? '0');
  localStorage.setItem(FENCE, String(now + 1));
  localStorage.setItem(KEY, raw);
  return raw;
}
function storageEvent(key: string | null) {
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key })); });
}
const notice = () => document.querySelector('[data-testid="save-moved-notice"]');
const failedBanner = (view: ReturnType<typeof render>) => view.container.querySelector('[data-soccer-save-status="failed"]');
function pressNext(view: ReturnType<typeof render>) {
  const button = view.container.querySelector('[data-career-action-bar] button');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  act(() => { fireEvent.click(button!); });
}
async function noticeShows() {
  const shown = await screen.findByTestId('save-moved-notice');
  expect(shown).toHaveTextContent('This career moved on in another tab. Reload to carry on.');
}

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.spyOn(Math, 'random').mockReturnValue(0.52); vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer Career save fence', () => {
  it('an old save with no fence key opens, plays, and is fenced from its first write', () => {
    const view = mount(JSON.stringify(nativeCareer()));
    expect(view.queryByText('TEST: route crashed')).toBeNull();
    expect(Number(localStorage.getItem(FENCE))).toBeGreaterThanOrEqual(1);
    const opened = Number(localStorage.getItem(FENCE));
    pressNext(view);
    expect(read().age).toBe(17);
    expect(Number(localStorage.getItem(FENCE))).toBe(opened + 1);
    expect(notice()).toBeNull();
  });

  it('another tab playing on shows the notice at once, and a press forced past it writes nothing', async () => {
    const view = mount(JSON.stringify(nativeCareer()));
    const theirs = otherTabPlays();
    const theirFence = localStorage.getItem(FENCE);
    storageEvent(FENCE);
    await noticeShows();
    expect(failedBanner(view)).toBeNull();
    expect(toast.dismiss).toHaveBeenCalled();
    pressNext(view);
    expect(localStorage.getItem(KEY)).toBe(theirs);
    expect(localStorage.getItem(FENCE)).toBe(theirFence);
    expect(failedBanner(view)).toBeNull();
  });

  it('with no event at all, the press finds the move at write time and writes nothing', async () => {
    const view = mount(JSON.stringify(nativeCareer()));
    const theirs = otherTabPlays();
    expect(notice()).toBeNull();
    pressNext(view);
    await noticeShows();
    expect(localStorage.getItem(KEY)).toBe(theirs);
    expect(failedBanner(view)).toBeNull();
    expect(toast.dismiss).toHaveBeenCalled();
  });

  it('New Career in a stale tab clears nothing', async () => {
    const view = mount(JSON.stringify(nativeCareer()));
    const theirs = otherTabPlays();
    fireEvent.click(view.getByRole('button', { name: /New Career/ }));
    act(() => { fireEvent.click(view.getByRole('button', { name: 'Delete & Start Over' })); });
    await noticeShows();
    expect(localStorage.getItem(KEY)).toBe(theirs);
    expect(view.queryByText('Create Your Player')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('Delete unusable save in a stale tab deletes nothing', async () => {
    const view = mount('{broken');
    expect(view.getByRole('button', { name: 'Delete unusable save' })).toBeVisible();
    const theirs = otherTabPlays();
    act(() => { fireEvent.click(view.getByRole('button', { name: 'Delete unusable save' })); });
    await noticeShows();
    expect(localStorage.getItem(KEY)).toBe(theirs);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('a hand edit of the save moves no generation: no notice, and the next press writes', () => {
    const view = mount(JSON.stringify(nativeCareer()));
    const edited = { ...read(), netWorth: 12345 };
    localStorage.setItem(KEY, JSON.stringify(edited));
    storageEvent(KEY);
    storageEvent(null);
    expect(notice()).toBeNull();
    pressNext(view);
    expect(read().age).toBe(17);
    expect(notice()).toBeNull();
  });
});
