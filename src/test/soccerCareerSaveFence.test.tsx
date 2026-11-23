import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import SoccerCareerEntry from '@/pages/SoccerCareerEntry';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { BROKEN_SAVE_MARK, offeredBackup, routeSaveEntry } from '@/lib/brokenSaveRecovery';

const KEY = 'soccerCareerSave', FENCE = 'dukb-fence:soccerCareerSave';
const SECOND_KEY = 'soccerCareerSave-slot-2';
const backupsFor = (key: string) => Object.keys(localStorage).filter(name => name.startsWith(`${key}${BROKEN_SAVE_MARK}`));
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
function openSlot(path: string) {
  return render(<HelmetProvider><MemoryRouter initialEntries={[path]}><Boundary><SoccerCareerEntry /></Boundary></MemoryRouter></HelmetProvider>);
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
async function noticeShows(message = 'This career moved on in another tab. Reload to carry on.') {
  const shown = await screen.findByTestId('save-moved-notice');
  expect(shown).toHaveTextContent(message);
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
  it.each([false, true])('keeps the old career before the first versioned write (packed: %s)', async packed => {
    const old = { ...nativeCareer(), playerName: 'Older Career', weeklyWage: 17500, contractYearsLeft: 3, netWorth: 34123 };
    old.seasons = Array.from({ length: 10 }, (_, n) => ({ ...old.seasons[0], year: 2020 + n }));
    old.seasons[8].clubCupTitle = 'FA Cup';
    old.awards = [{ year: 2028, name: 'Golden Boot', emoji: '🏆' }];
    delete old.loan;
    delete old.pendingLoanOffers;
    if (packed) old.events = Array.from({ length: 1600 }, (_, n) => `Career history entry ${n} with season details.`);
    const legacy = serializeSoccerCareerSave(old);
    if (packed) expect(legacy).toContain('lz-string-utf16-career');
    localStorage.setItem(SECOND_KEY, legacy);
    localStorage.setItem(KEY, 'independent slot');
    const setItem = Storage.prototype.setItem;
    const beforeImages: (string | null)[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SECOND_KEY) beforeImages.push(this.getItem(backupsFor(SECOND_KEY)[0]));
      setItem.call(this, key, value);
    });

    const view = openSlot('/soccer-career?slot=2');
    await view.findByRole('button', { name: 'Career saves' });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SECOND_KEY)!).saveVersion).toBe(1));
    const migrated = localStorage.getItem(SECOND_KEY)!;
    expect(beforeImages).toEqual([legacy]);
    expect(backupsFor(SECOND_KEY)).toHaveLength(1);
    expect(offeredBackup(routeSaveEntry('/soccer-career?slot=2')!, localStorage)).toBe(backupsFor(SECOND_KEY)[0]);
    expect(localStorage.getItem(KEY)).toBe('independent slot');
    expect(parseSoccerCareerSave(migrated)).toMatchObject({
      playerName: old.playerName, nationality: old.nationality, weeklyWage: old.weeklyWage,
      contractYearsLeft: old.contractYearsLeft, netWorth: old.netWorth, awards: old.awards,
      seasons: old.seasons, events: old.events, loan: null, pendingLoanOffers: null,
    });
    expect((parseSoccerCareerSave(migrated) as E.CareerState).seasons).toEqual(old.seasons);
    view.unmount();
    const reopened = openSlot('/soccer-career?slot=2');
    await reopened.findByRole('button', { name: 'Career saves' });
    expect(backupsFor(SECOND_KEY)).toHaveLength(1);
  });

  it('keeps old bytes if the migration backup or replacement cannot be written, then retries safely', () => {
    const old = JSON.stringify(nativeCareer());
    localStorage.setItem(KEY, old);
    const setItem = Storage.prototype.setItem;
    let blocked: 'backup' | 'career' | null = 'backup';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if ((blocked === 'backup' && key.startsWith(`${KEY}${BROKEN_SAVE_MARK}`)) || (blocked === 'career' && key === KEY)) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });
    const view = mount(null);
    const retry = view.getByRole('button', { name: 'Retry save' });
    expect(localStorage.getItem(KEY)).toBe(old);
    expect(backupsFor(KEY)).toHaveLength(0);

    blocked = 'career';
    fireEvent.click(retry);
    expect(localStorage.getItem(KEY)).toBe(old);
    expect(backupsFor(KEY)).toHaveLength(1);
    expect(localStorage.getItem(backupsFor(KEY)[0])).toBe(old);

    blocked = null;
    fireEvent.click(retry);
    expect(JSON.parse(localStorage.getItem(KEY)!).saveVersion).toBe(1);
    expect(backupsFor(KEY)).toHaveLength(1);
    expect(localStorage.getItem(backupsFor(KEY)[0])).toBe(old);
  });

  it('keeps competing bytes written while the migration backup is being copied', async () => {
    const old = JSON.stringify(nativeCareer());
    const other = JSON.stringify({ ...nativeCareer(), playerName: 'Another Tab' });
    localStorage.setItem(KEY, old);
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      setItem.call(this, key, value);
      if (key.startsWith(`${KEY}${BROKEN_SAVE_MARK}`)) setItem.call(this, KEY, other);
    });
    mount(null);
    await noticeShows('This slot changed. Reload to open the saved career.');
    expect(localStorage.getItem(KEY)).toBe(other);
    expect(localStorage.getItem(backupsFor(KEY)[0])).toBe(old);
  });

  it('refuses the migration if its checked backup disappears before replacement', () => {
    const old = JSON.stringify(nativeCareer());
    localStorage.setItem(KEY, old);
    const setItem = Storage.prototype.setItem;
    let spoilBackup = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === FENCE && spoilBackup) {
        const backup = backupsFor(KEY)[0];
        if (backup) this.removeItem(backup);
      }
      setItem.call(this, key, value);
    });

    const view = mount(null);
    expect(localStorage.getItem(KEY)).toBe(old);
    expect(backupsFor(KEY)).toHaveLength(0);
    expect(view.getByText(/couldn’t keep a backup before updating/)).toBeInTheDocument();
    spoilBackup = false;
    fireEvent.click(view.getByRole('button', { name: 'Retry save' }));
    expect(JSON.parse(localStorage.getItem(KEY)!).saveVersion).toBe(1);
    expect(localStorage.getItem(backupsFor(KEY)[0])).toBe(old);
  });

  it('leaves a future career intact and offers another slot instead', async () => {
    const future = JSON.stringify({ ...nativeCareer(), saveVersion: 7 });
    localStorage.setItem(SECOND_KEY, future);
    const view = openSlot('/soccer-career?slot=2');
    const choose = await view.findByRole('button', { name: 'Choose another slot' });
    expect(view.queryByRole('button', { name: 'Delete unusable save' })).toBeNull();
    fireEvent.click(choose);
    expect(await view.findByRole('link', { name: 'New career in slot 3' })).toBeInTheDocument();
    expect(localStorage.getItem(SECOND_KEY)).toBe(future);
    expect(backupsFor(SECOND_KEY)).toHaveLength(0);
  });

  it('starts and progresses a second career while preserving the legacy slot bytes', async () => {
    const legacy = { ...nativeCareer(), oldStoryNotes: 'One more old story. '.repeat(3500) };
    legacy.playerName = 'Long Career';
    legacy.seasons = Array.from({ length: 10 }, (_, index) => ({ ...legacy.seasons[0], year: 2020 + index }));
    const legacyRaw = serializeSoccerCareerSave(legacy);
    expect(legacyRaw).toContain('lz-string-utf16-career');
    localStorage.setItem(KEY, legacyRaw);
    const view = openSlot('/soccer-career?slot=2');

    await view.findByText('Create Your Player');
    fireEvent.change(view.getByPlaceholderText('Enter your player name...'), { target: { value: 'Second Career' } });
    const selects = view.container.querySelectorAll('select');
    for (const [index, value] of ['England', 'ST', '2020-24'].entries()) fireEvent.change(selects[index], { target: { value } });
    fireEvent.click(view.getByRole('button', { name: /Generate Starting Potential/ }));
    await view.findByRole('heading', { name: 'Starting Stats' }, { timeout: 4000 });
    fireEvent.click(view.getByRole('button', { name: /Begin Career/ }));
    const second = () => parseSoccerCareerSave(localStorage.getItem(SECOND_KEY)!) as E.CareerState;
    expect(second()).toMatchObject({ playerName: 'Second Career', age: 16 });
    pressNext(view);
    expect(second()).toMatchObject({ playerName: 'Second Career', age: 17 });
    expect(localStorage.getItem(KEY)).toBe(legacyRaw);
    expect(localStorage.getItem(FENCE)).toBeNull();

    const secondRaw = localStorage.getItem(SECOND_KEY);
    fireEvent.click(view.getByRole('button', { name: 'Career saves' }));
    fireEvent.click(await view.findByRole('link', { name: 'Resume slot 1' }));
    await view.findByText('Long Career', { exact: true });
    expect(parseSoccerCareerSave(localStorage.getItem(KEY)!)).toMatchObject({ seasons: legacy.seasons, oldStoryNotes: legacy.oldStoryNotes });
    expect(localStorage.getItem(SECOND_KEY)).toBe(secondRaw);
  }, 15000);

  it('refuses to overwrite a slot whose saved bytes changed without an event', async () => {
    const career = nativeCareer();
    localStorage.setItem(SECOND_KEY, serializeSoccerCareerSave(career));
    const view = openSlot('/soccer-career?slot=2');
    await view.findByRole('button', { name: 'Career saves' });
    const newer = serializeSoccerCareerSave(E.advanceYouthYear(career, E.FALLBACK_CLUBS));
    localStorage.setItem(SECOND_KEY, newer);
    pressNext(view);
    await noticeShows('This slot changed. Reload to open the saved career.');
    expect(localStorage.getItem(SECOND_KEY)).toBe(newer);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps a career with an interrupted save open until its progress can be written', async () => {
    const legacyRaw = serializeSoccerCareerSave(nativeCareer());
    localStorage.setItem(KEY, legacyRaw);
    localStorage.setItem(SECOND_KEY, serializeSoccerCareerSave({ ...nativeCareer(), playerName: 'Second Career' }));
    const view = openSlot('/soccer-career?slot=2');
    const saves = await view.findByRole('button', { name: 'Career saves' });
    const previous = localStorage.getItem(SECOND_KEY);
    const setItem = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SECOND_KEY && blocked) throw new DOMException('Storage full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    pressNext(view);
    expect(failedBanner(view)).not.toBeNull();
    fireEvent.click(saves);
    expect(view.queryByRole('heading', { name: 'Career saves' })).toBeNull();
    expect(localStorage.getItem(SECOND_KEY)).toBe(previous);
    expect(localStorage.getItem(KEY)).toBe(legacyRaw);

    blocked = false;
    fireEvent.click(saves);
    expect(await view.findByRole('link', { name: 'Resume slot 2' })).toHaveAttribute('href', '/soccer-career?slot=2');
    expect(parseSoccerCareerSave(localStorage.getItem(SECOND_KEY)!)).toMatchObject({ playerName: 'Second Career', age: 17 });
    expect(localStorage.getItem(KEY)).toBe(legacyRaw);
  });

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
    act(() => { fireEvent.click(view.getByRole('button', { name: 'Keep Copy & Start Over' })); });
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

  /* A removal the browser refuses (the save key only; the fence's own key
     still works). Nothing moved, so no notice: the page says it could not
     delete and keeps everything as it was. */
  function refuseSaveRemoval() {
    const original = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (key === KEY) throw new Error('TEST: removal refused');
      return original.call(this, key);
    });
  }

  it('New Career whose removal the browser refuses resets nothing and says so', () => {
    const view = mount(JSON.stringify(nativeCareer()));
    const before = localStorage.getItem(KEY);
    const fence = localStorage.getItem(FENCE);
    refuseSaveRemoval();
    fireEvent.click(view.getByRole('button', { name: /New Career/ }));
    act(() => { fireEvent.click(view.getByRole('button', { name: 'Keep Copy & Start Over' })); });
    expect(toast.error).toHaveBeenCalledWith('Could not clear the slot. Try again.', expect.objectContaining({ position: 'top-center' }));
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(localStorage.getItem(FENCE)).toBe(fence);
    expect(view.queryByText('Create Your Player')).toBeNull();
    expect(view.container.querySelector('[data-career-action-bar]')).not.toBeNull();
    expect(notice()).toBeNull();
  });

  it('Delete unusable save whose removal the browser refuses keeps the save and says so', () => {
    const view = mount('{broken');
    refuseSaveRemoval();
    act(() => { fireEvent.click(view.getByRole('button', { name: 'Delete unusable save' })); });
    expect(toast.error).toHaveBeenCalledWith('Could not delete the save. Try again.', expect.objectContaining({ position: 'top-center' }));
    expect(localStorage.getItem(KEY)).toBe('{broken');
    expect(view.getByRole('button', { name: 'Delete unusable save' })).toBeVisible();
    expect(notice()).toBeNull();
  });

  it('keeps a legacy slot replacement even when it has no new generation', async () => {
    const view = mount(JSON.stringify(nativeCareer()));
    const edited = { ...read(), netWorth: 12345 };
    const replacement = JSON.stringify(edited);
    localStorage.setItem(KEY, replacement);
    storageEvent(KEY);
    storageEvent(null);
    expect(notice()).toBeNull();
    pressNext(view);
    await noticeShows('This slot changed. Reload to open the saved career.');
    expect(localStorage.getItem(KEY)).toBe(replacement);
  });
});
