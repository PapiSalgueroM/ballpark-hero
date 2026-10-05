/**
 * Round 958: a broken save never traps a game.
 *
 * Before this round RouteErrorBoundary offered only "Try this page again",
 * which reloaded into the same broken save and the same crash. On a route that
 * keeps a save (src/data/continueSaves.ts) it now also offers a fresh start
 * that moves the save to a dated backup key and opens the game's start screen.
 *
 * What these tests hold:
 *  1. On every registered route holding a save, a throwing child gets the
 *     fresh start button beside the reload, and the "kept aside" line.
 *  2. The click copies the raw save byte for byte to a backup key, removes the
 *     original, and opens the game's own address.
 *  3. An unregistered route, and a registered route with no save, show only the
 *     reload: there is nothing to move, so the button would be a false promise.
 *  4. When the copy cannot be written, nothing is removed, the game is not
 *     reopened, and the screen says so.
 *  5. Two fresh starts in the same second keep both backups.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/brokenSaveRecovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/brokenSaveRecovery')>()),
  /* jsdom cannot navigate, so the full load is recorded instead. */
  openGame: vi.fn(),
}));

import RouteErrorBoundary from '@/components/RouteErrorBoundary';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import BrokenSaveRestore from '@/components/BrokenSaveRestore';
import { BROKEN_SAVE_MARK, backupKeysOf, openGame, restoreBackup, setAsideSave, type SaveStorage } from '@/lib/brokenSaveRecovery';

const Boom = () => { throw new Error('deliberate test throw'); };
/* What a lazy route throws when its chunk cannot load: the network or a
   deploy, never the save. */
const ChunkBoom = () => { throw new Error('Failed to fetch dynamically imported module: https://example.test/assets/Game-abc123.js'); };
const BROKEN = '{"st":{"myTeam":"Broken Save U"},"g":{"name":"x"},"c":null}';

function at(path: string) {
  window.history.pushState({}, '', path);
}

function crash(path: string, Child: () => never = Boom) {
  at(path);
  /* React reports a caught error on the way past; keep the run readable. */
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return render(<RouteErrorBoundary resetKey={path}><Child /></RouteErrorBoundary>);
  } finally {
    quiet.mockRestore();
  }
}

function backupsOf(saveKey: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`${saveKey}${BROKEN_SAVE_MARK}`)) out.push(k);
  }
  return out;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(openGame).mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  at('/');
});

describe('RouteErrorBoundary fresh start (Round 958)', () => {
  it('keeps the existing screen text', () => {
    localStorage.setItem('fight-gym-save-v1', BROKEN);
    crash('/fight-gym');
    expect(screen.getByText('This page broke')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try this page again' })).toBeInTheDocument();
    expect(screen.getByText(/still on this device/)).toBeInTheDocument();
  });

  it.each(CONTINUE_SAVES.map(e => [e.path, e.saveKey]))(
    'offers a fresh start on %s when a save is held, and moves the save aside',
    (path, saveKey) => {
      localStorage.setItem(saveKey, BROKEN);
      crash(path);
      expect(screen.getByRole('button', { name: 'Try this page again' })).toBeInTheDocument();
      expect(screen.getByText(/moved\s+aside to a backup in this browser, not deleted/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Start a fresh game' }));
      expect(localStorage.getItem(saveKey)).toBeNull();
      const backups = backupsOf(saveKey);
      expect(backups).toHaveLength(1);
      expect(localStorage.getItem(backups[0])).toBe(BROKEN);
      expect(openGame).toHaveBeenCalledTimes(1);
      expect(openGame).toHaveBeenCalledWith(path);
    },
  );

  it('covers all 21 long games on the list', () => {
    expect(CONTINUE_SAVES.length).toBeGreaterThanOrEqual(21);
  });

  it('finds the game on the trailing slash form of its address', () => {
    localStorage.setItem('cfb-dynasty-save-v1', BROKEN);
    crash('/cfb-dynasty/');
    fireEvent.click(screen.getByRole('button', { name: 'Start a fresh game' }));
    expect(localStorage.getItem('cfb-dynasty-save-v1')).toBeNull();
    expect(openGame).toHaveBeenCalledWith('/cfb-dynasty');
  });

  it('shows only the reload on a route that keeps no long save', () => {
    localStorage.setItem('fight-gym-save-v1', BROKEN);
    crash('/footle');
    expect(screen.getByRole('button', { name: 'Try this page again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start a fresh game' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(localStorage.getItem('fight-gym-save-v1')).toBe(BROKEN);
  });

  it('shows only the reload on a registered route with no save in this browser', () => {
    crash('/fight-career');
    expect(screen.queryByRole('button', { name: 'Start a fresh game' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('removes nothing and says so when the copy cannot be written', () => {
    localStorage.setItem('fight-promoter-save-v1', BROKEN);
    crash('/fight-promoter');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start a fresh game' }));
    vi.mocked(Storage.prototype.setItem).mockRestore();
    expect(localStorage.getItem('fight-promoter-save-v1')).toBe(BROKEN);
    expect(backupsOf('fight-promoter-save-v1')).toHaveLength(0);
    expect(openGame).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/left it exactly where it\s+was/);
  });

  it('never offers a fresh start for a chunk that failed to load, even with a save held', () => {
    /* The once per tab reload is already spent, so the boundary paints. */
    sessionStorage.setItem('dukb-reloaded-stale-chunk', '1');
    localStorage.setItem('soccerCareerSave', BROKEN);
    crash('/soccer-career', ChunkBoom);
    expect(screen.getByText('This page broke')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start a fresh game' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(localStorage.getItem('soccerCareerSave')).toBe(BROKEN);
  });

  it('still offers it for an ordinary throw on the same route, so the chunk test is not vacuous', () => {
    sessionStorage.setItem('dukb-reloaded-stale-chunk', '1');
    localStorage.setItem('soccerCareerSave', BROKEN);
    crash('/soccer-career');
    expect(screen.getByRole('button', { name: 'Start a fresh game' })).toBeInTheDocument();
  });
});

describe('setAsideSave (Round 958)', () => {
  const entry = CONTINUE_SAVES.find(e => e.path === '/club-manager')!;
  const when = new Date('2026-10-03T12:34:56Z');

  it('keeps both backups when two fresh starts land in the same second', () => {
    localStorage.setItem(entry.saveKey, 'first');
    expect(setAsideSave(entry, localStorage, when)).toEqual({ ok: true, backupKey: `${entry.saveKey}${BROKEN_SAVE_MARK}2026-10-03T12-34-56` });
    localStorage.setItem(entry.saveKey, 'second');
    expect(setAsideSave(entry, localStorage, when)).toEqual({ ok: true, backupKey: `${entry.saveKey}${BROKEN_SAVE_MARK}2026-10-03T12-34-56-2` });
    expect(localStorage.getItem(`${entry.saveKey}${BROKEN_SAVE_MARK}2026-10-03T12-34-56`)).toBe('first');
    expect(localStorage.getItem(`${entry.saveKey}${BROKEN_SAVE_MARK}2026-10-03T12-34-56-2`)).toBe('second');
    expect(localStorage.getItem(entry.saveKey)).toBeNull();
  });

  it('is still a fresh start when the save is already gone', () => {
    expect(setAsideSave(entry, localStorage, when)).toEqual({ ok: true, backupKey: null });
  });

  it('refuses without storage', () => {
    expect(setAsideSave(entry, null, when)).toEqual({ ok: false });
  });

  it('removes nothing when the copy is silently dropped (the read back check)', () => {
    const { m, s } = fakeStorage(() => ({ setItem: () => {} }));
    m.set(entry.saveKey, 'career');
    expect(setAsideSave(entry, s, when)).toEqual({ ok: false });
    expect(m.get(entry.saveKey)).toBe('career');
    expect(m.size).toBe(1);
  });

  it('takes the copy back out when the original will not go, so a retry cannot stack backups', () => {
    const { m, s } = fakeStorage(m => ({
      removeItem: (k: string) => { if (k === entry.saveKey) throw new Error('blocked'); m.delete(k); },
    }));
    m.set(entry.saveKey, 'career');
    expect(setAsideSave(entry, s, when)).toEqual({ ok: false });
    expect(setAsideSave(entry, s, when)).toEqual({ ok: false });
    expect([...m.keys()]).toEqual([entry.saveKey]);
  });

  it('never throws when every storage call throws', () => {
    const boom = () => { throw new Error('storage blocked'); };
    const { s } = fakeStorage(() => ({ getItem: boom, setItem: boom, removeItem: boom, key: boom }));
    expect(setAsideSave(entry, s, when)).toEqual({ ok: false });
    expect(restoreBackup(entry, `${entry.saveKey}${BROKEN_SAVE_MARK}2026-10-03T12-34-56`, s, when)).toEqual({ ok: false });
    expect(backupKeysOf(entry, s)).toEqual([]);
  });
});

/** A Map backed storage; over() may replace any method to misbehave. */
function fakeStorage(over: (m: Map<string, string>) => Partial<Record<keyof SaveStorage | 'key', unknown>> = () => ({})) {
  const m = new Map<string, string>();
  const base = {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
  return { m, s: Object.assign(base, over(m)) as typeof base };
}

describe('restoreBackup and backupKeysOf (Round 958 review)', () => {
  const entry = CONTINUE_SAVES.find(e => e.path === '/fight-gym')!;
  const key = (stamp: string) => `${entry.saveKey}${BROKEN_SAVE_MARK}${stamp}`;
  const when = new Date('2026-10-05T08:00:00Z');

  it('lists this game\'s backups newest first, the same second suffix in number order', () => {
    const { m, s } = fakeStorage();
    for (const k of [key('2026-10-01T10-00-00'), key('2026-10-04T09-00-00-2'), key('2026-10-04T09-00-00'), key('2026-10-04T09-00-00-10')]) m.set(k, 'x');
    m.set('cfb-dynasty-save-v1.broken-2026-10-09T00-00-00', 'other game');
    expect(backupKeysOf(entry, s)).toEqual([
      key('2026-10-04T09-00-00-10'), key('2026-10-04T09-00-00-2'), key('2026-10-04T09-00-00'), key('2026-10-01T10-00-00'),
    ]);
  });

  it('puts a backup back when the game has no save now, and drops the backup', () => {
    const { m, s } = fakeStorage();
    m.set(key('2026-10-04T09-00-00'), 'old career');
    expect(restoreBackup(entry, key('2026-10-04T09-00-00'), s, when)).toEqual({ ok: true });
    expect([...m.entries()]).toEqual([[entry.saveKey, 'old career']]);
  });

  it('sets the save the player has now aside first, so the swap deletes nothing', () => {
    const { m, s } = fakeStorage();
    m.set(key('2026-10-04T09-00-00'), 'old career');
    m.set(entry.saveKey, 'new career');
    expect(restoreBackup(entry, key('2026-10-04T09-00-00'), s, when)).toEqual({ ok: true });
    expect(m.get(entry.saveKey)).toBe('old career');
    expect(m.get(key('2026-10-05T08-00-00'))).toBe('new career');
    expect(m.has(key('2026-10-04T09-00-00'))).toBe(false);
  });

  it('keeps the backup when the restored copy does not read back', () => {
    const { m, s } = fakeStorage(m => ({ setItem: (k: string, v: string) => { if (k !== entry.saveKey) m.set(k, v); } }));
    m.set(key('2026-10-04T09-00-00'), 'old career');
    expect(restoreBackup(entry, key('2026-10-04T09-00-00'), s, when)).toEqual({ ok: false });
    expect(m.get(key('2026-10-04T09-00-00'))).toBe('old career');
  });

  it('refuses a key that is not a backup of this game', () => {
    const { m, s } = fakeStorage();
    m.set('cfb-dynasty-save-v1', 'someone else');
    expect(restoreBackup(entry, 'cfb-dynasty-save-v1', s, when)).toEqual({ ok: false });
    expect(m.has(entry.saveKey)).toBe(false);
  });
});

describe('BrokenSaveRestore, the way back (Round 958 review)', () => {
  const OLD = '{"g":{"name":"Old Gym"}}';
  const backup = `fight-gym-save-v1${BROKEN_SAVE_MARK}2026-10-04T09-00-00`;

  it('a fresh start is reversible end to end: crash, start fresh, put it back', () => {
    localStorage.setItem('fight-gym-save-v1', OLD);
    const crashed = crash('/fight-gym');
    fireEvent.click(screen.getByRole('button', { name: 'Start a fresh game' }));
    expect(localStorage.getItem('fight-gym-save-v1')).toBeNull();
    crashed.unmount();
    vi.mocked(openGame).mockClear();
    render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(screen.getByRole('region', { name: 'Your old save' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Put my old save back' }));
    expect(localStorage.getItem('fight-gym-save-v1')).toBe(OLD);
    expect(backupsOf('fight-gym-save-v1')).toHaveLength(0);
    expect(openGame).toHaveBeenCalledWith('/fight-gym');
  });

  it('says the save the player has now is kept aside, and keeps it', () => {
    localStorage.setItem(backup, OLD);
    localStorage.setItem('fight-gym-save-v1', 'new gym');
    render(<BrokenSaveRestore pathname="/fight-gym/" />);
    expect(screen.getByText(/nothing is deleted/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Put my old save back' }));
    expect(localStorage.getItem('fight-gym-save-v1')).toBe(OLD);
    const kept = backupsOf('fight-gym-save-v1');
    expect(kept).toHaveLength(1);
    expect(localStorage.getItem(kept[0])).toBe('new gym');
  });

  it('shows nothing without a backup, or on a route that keeps no long save', () => {
    localStorage.setItem('fight-gym-save-v1', 'a save');
    const first = render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();
    localStorage.setItem(backup, OLD);
    const second = render(<BrokenSaveRestore pathname="/footle" />);
    expect(second.container).toBeEmptyDOMElement();
  });

  it('"Not now" hides it and touches nothing', () => {
    localStorage.setItem(backup, OLD);
    const { container } = render(<BrokenSaveRestore pathname="/fight-gym" />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem(backup)).toBe(OLD);
    expect(openGame).not.toHaveBeenCalled();
  });

  it('says so and changes nothing when the browser will not take the swap', () => {
    localStorage.setItem(backup, OLD);
    render(<BrokenSaveRestore pathname="/fight-gym" />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Put my old save back' }));
    vi.mocked(Storage.prototype.setItem).mockRestore();
    expect(localStorage.getItem(backup)).toBe(OLD);
    expect(localStorage.getItem('fight-gym-save-v1')).toBeNull();
    expect(openGame).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/nothing changed/);
  });
});
