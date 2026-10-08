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
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import type { CompetitionDef, ChampRow } from '@/lib/champOrNot';
import { getTodayET } from '@/lib/dateUtils';
import { resetMocks } from './dailyReload/mocks';

vi.mock('@/lib/champOrNot', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async (comp: CompetitionDef) => fixtureRows(comp),
}));

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
    expect(seam.storageTrouble).toBe('blocked');
    const view = renderHook(useChampOrNot);
    await waitFor(() => expect(view.result.current.loadState).toBe('ready'));
    expect(view.result.current.rounds).toHaveLength(10);
    act(() => view.result.current.answer(view.result.current.current!.isTrue));
    const kept = seam.safeLocalStorage.getItem(`champ-or-not-daily-${getTodayET()}`);
    expect(JSON.parse(kept as string)).toEqual({ answers: [true] });
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
});
