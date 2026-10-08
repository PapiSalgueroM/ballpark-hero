/**
 * Round 1142: a real game boots and plays with storage blocked.
 *
 * Champ or Not is the smallest page that reads localStorage with no guard on
 * its very first render (a useState initialiser), so it is the honest case
 * for the call sites this round did NOT edit: there are several hundred of
 * them, and what keeps them alive is the seam putting its stand in on window.
 * The control in here renders the same hook with nothing standing in and
 * shows it throw, which is the "This page broke" the player used to get the
 * moment the Supabase client stopped being the first thing to die.
 *
 * The storage notice is mounted here too: it shows on a game route, stays off
 * the home page, and never renders under the prerenderer.
 */
import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import ChampOrNot from '@/pages/ChampOrNot';
import type { CompetitionDef, ChampRow } from '@/lib/champOrNot';
import { getTodayET } from '@/lib/dateUtils';
import { resetMocks } from './dailyReload/mocks';

vi.mock('@/lib/champOrNot', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async (comp: CompetitionDef) => fixtureRows(comp),
}));

/* The page's furniture is not what is being tested: the same stand ins the
   page's own reveal test uses. The hook, the page and the daily save are real. */
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => <button>Help fixture</button> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

/* Fictional rows: this test is about storage, not about who won what. */
function fixtureRows(comp: CompetitionDef): ChampRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    year: 2000 + i,
    team: `Fictional ${comp.key} Champion ${i}`,
    ...(comp.finals ? { beat: `the Fictional ${comp.key} Finalist ${i}` } : {}),
  })) as ChampRow[];
}

const NAMES = ['localStorage', 'sessionStorage'] as const;
const original = new Map<string, PropertyDescriptor | undefined>();
type PrerenderWindow = Window & { __DUKB_PRERENDER__?: boolean };

function denied(): never {
  throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
}
function blockStorage() {
  for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
}
/* What main.tsx does before anything else: load the seam. */
async function bootSeam() {
  vi.resetModules();
  return import('@/lib/safeStorage');
}

beforeEach(() => {
  for (const name of NAMES) original.set(name, Object.getOwnPropertyDescriptor(window, name));
  window.localStorage.clear();
  resetMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const name of NAMES) {
    const d = original.get(name);
    if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
  }
  delete (window as PrerenderWindow).__DUKB_PRERENDER__;
});

describe('a game under blocked storage', () => {
  it('boots, takes an answer and keeps it for the visit', async () => {
    blockStorage();
    const seam = await bootSeam();
    expect(seam.getStorageTrouble()).toBe('blocked');
    const view = renderHook(useChampOrNot);
    await waitFor(() => expect(view.result.current.loadState).toBe('ready'));
    expect(view.result.current.rounds).toHaveLength(10);
    act(() => view.result.current.answer(view.result.current.current!.isTrue));
    const kept = seam.safeLocalStorage.getItem(`champ-or-not-daily-${getTodayET()}`);
    expect(JSON.parse(kept as string)).toEqual({ answers: [true] });
  });

  it('the page itself mounts, and its first press is kept for the visit', async () => {
    blockStorage();
    const seam = await bootSeam();
    const view = render(<HelmetProvider><MemoryRouter><ChampOrNot /></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(view.getByRole('button', { name: '🏆 CHAMP' })).toBeEnabled());
    fireEvent.click(view.getByRole('button', { name: '🏆 CHAMP' }));
    const kept = JSON.parse(seam.safeLocalStorage.getItem(`champ-or-not-daily-${getTodayET()}`) as string) as { answers: boolean[] };
    expect(kept.answers).toHaveLength(1);
  });

  it('control: with nothing standing in, the same hook throws on its first render', () => {
    blockStorage();
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(useChampOrNot)).toThrow(/Access is denied/);
    quiet.mockRestore();
  });
});

describe('the storage notice', () => {
  async function mountNotice(path: string) {
    const { StorageNotice } = await import('@/components/StorageNotice');
    return render(<MemoryRouter initialEntries={[path]}><StorageNotice /></MemoryRouter>);
  }
  const notice = () => document.querySelector('[data-dukb-storage-notice]');

  it('says so on a game route when storage is blocked, and is kept out of saved pages', async () => {
    blockStorage();
    await bootSeam();
    await mountNotice('/champ-or-not');
    expect(notice()).not.toBeNull();
    expect(notice()!.getAttribute('data-dukb-storage-notice')).toBe('blocked');
    expect(notice()!.hasAttribute('data-no-prerender')).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/progress won't be saved/);
  });

  it('says the storage is full when that is the reason', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    await bootSeam();
    await mountNotice('/soccer-career');
    expect(notice()!.getAttribute('data-dukb-storage-notice')).toBe('full');
    expect(notice()!.textContent).toMatch(/storage is full/);
  });

  it.each(['/', '/soccer', '/whats-new', '/privacy'])('stays off %s, which is not a game', async path => {
    blockStorage();
    await bootSeam();
    await mountNotice(path);
    expect(notice()).toBeNull();
  });

  it('never renders under the prerenderer', async () => {
    blockStorage();
    await bootSeam();
    (window as PrerenderWindow).__DUKB_PRERENDER__ = true;
    await mountNotice('/champ-or-not');
    expect(notice()).toBeNull();
  });

  it('renders nothing in a browser that stores normally', async () => {
    await bootSeam();
    await mountNotice('/champ-or-not');
    expect(notice()).toBeNull();
  });

  /* Review finding: five games are routed and playable but commented out of
     the registry, and the notice went by the registry alone, so they got no
     line at all (one of them tells the player his streak is saved here). */
  it.each(['/football-timeline', '/guess-nfl-team', '/shirt-number', '/higher-lower-transfers', '/pack-battle'])(
    'says so on %s, a game the registry no longer lists', async path => {
      blockStorage();
      await bootSeam();
      await mountNotice(path);
      expect(notice()).not.toBeNull();
    });

  it('every unlisted game route is still routed, and still not in the registry', async () => {
    const { UNLISTED_GAME_ROUTES } = await import('@/components/StorageNotice');
    const { ALL_GAMES } = await import('@/data/gameRegistry');
    const app = (await import('node:fs')).readFileSync('src/App.tsx', 'utf8');
    for (const path of UNLISTED_GAME_ROUTES) {
      /* a route that was retired, or a game that came back to the registry, has to leave the list */
      expect(app).toContain(`<Route path="${path}" element={<`);
      expect(app).not.toContain(`<Route path="${path}" element={<Navigate`);
      expect(ALL_GAMES.some(g => g.path === path)).toBe(false);
    }
  });

  /* Review finding: the seam used to probe with a write as it loaded, in
     every browser, on every page. Now only the notice asks, only on a game
     page, and the seam remembers the answer for the visit. */
  it('in a browser that stores normally: nothing is written off a game page, and one probe on the first game page', async () => {
    await bootSeam();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const removes = vi.spyOn(Storage.prototype, 'removeItem');
    const home = await mountNotice('/');
    home.unmount();
    const hub = await mountNotice('/soccer');
    hub.unmount();
    expect(writes).not.toHaveBeenCalled();
    expect(removes).not.toHaveBeenCalled();
    const game = await mountNotice('/soccer-career');
    expect(notice()).toBeNull();
    game.unmount();
    await mountNotice('/club-manager');
    expect(notice()).toBeNull();
    expect(writes.mock.calls.map(c => c[0])).toEqual(['__dukb_storage_probe__']);
    expect(removes.mock.calls.map(c => c[0])).toEqual(['__dukb_storage_probe__']);
    expect(window.localStorage.length).toBe(0);
  });

  it('storage full: the line is there on the first render of a game page, and the home page asks nothing', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    await bootSeam();
    const home = await mountNotice('/');
    expect(notice()).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    home.unmount();
    const { StorageNotice } = await import('@/components/StorageNotice');
    const { renderToStaticMarkup } = await import('react-dom/server');
    /* one synchronous render, no effects: what the first paint holds */
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/footle']}><StorageNotice /></MemoryRouter>);
    expect(html).toContain('data-dukb-storage-notice="full"');
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it('the phone line is the short one, so it fits one line at 320 wide', async () => {
    blockStorage();
    await bootSeam();
    await mountNotice('/soccer-career');
    const phone = notice()!.querySelector('span.sm\\:hidden');
    const wide = notice()!.querySelector('span.hidden.sm\\:inline');
    expect(phone!.textContent).toBe("Storage is blocked, so progress won't save.");
    expect(wide!.textContent).toBe("This browser blocks storage, so progress won't be saved. You can still play everything.");
    /* measured on the runner: 56 characters wrapped at 360 wide. The phone line stays well under that. */
    expect(phone!.textContent!.length).toBeLessThanOrEqual(44);
  });
});
