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
 *  6. A chunk that failed to load (the network or a deploy, never the save)
 *     gets only the reload, even with a save held.
 *  7. The copy is read back before the original goes, a copy whose original
 *     will not go is taken back out, and no helper throws on blocked storage.
 *  8. The way back: BrokenSaveRestore offers the newest backup on the game's
 *     page, restoreBackup sets any newer save aside first, and a fresh start
 *     followed by "Put my old save back" returns the original bytes.
 *  9. Round 1219: the card's button only STAGES the put back. Nothing is
 *     written under the open page, the game's address is loaded, the swap is
 *     made by runSaveKeeper on the way in (src/lib/saveKeeper.ts), the backup
 *     it came from stays, and the card says once what happened.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/brokenSaveRecovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/brokenSaveRecovery')>()),
  /* jsdom cannot navigate, so the full load is recorded instead. */
  openGame: vi.fn(),
}));
vi.mock('@/lib/saveKeeper', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/saveKeeper')>()),
  /* Round 1219: the load after a put back, recorded for the same reason. */
  reopenGame: vi.fn(),
}));

import RouteErrorBoundary from '@/components/RouteErrorBoundary';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import BrokenSaveRestore from '@/components/BrokenSaveRestore';
import {
  BACKUPS_KEPT, BROKEN_SAVE_MARK, SET_ASIDE_SEEN_KEY, backupDate, backupKeysOf, deleteBackup, dismissBackup, heldSaveEntry,
  offeredBackup, openGame, restoreBackup, setAsideSave, type SaveStorage,
} from '@/lib/brokenSaveRecovery';
import { PENDING_RESTORE_KEY, reopenGame, runSaveKeeper } from '@/lib/saveKeeper';

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
  vi.mocked(reopenGame).mockClear();
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
    expect(heldSaveEntry(entry.path, s)).toBeNull();
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
    const card = render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(screen.getByRole('region', { name: 'Your kept aside save' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Put that save back' }));
    /* Round 1219: the press only stages. Nothing is written under the open
       page; the game's address is loaded and the swap is made on the way in. */
    expect(localStorage.getItem('fight-gym-save-v1')).toBeNull();
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).not.toBeNull();
    expect(reopenGame).toHaveBeenCalledWith('/fight-gym');
    expect(openGame).not.toHaveBeenCalled();
    card.unmount();
    runSaveKeeper();
    expect(localStorage.getItem('fight-gym-save-v1')).toBe(OLD);
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).toBeNull();
    /* The backup it came from stays (another tab can still write over the key). */
    const kept = backupsOf('fight-gym-save-v1');
    expect(kept).toHaveLength(1);
    expect(localStorage.getItem(kept[0])).toBe(OLD);
    /* The game's page says what happened, once, and does not offer back the game already being played. */
    const after = render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(screen.getByRole('status')).toHaveTextContent('This is the save that was kept aside.');
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(after.container).toBeEmptyDOMElement();
    after.unmount();
    const again = render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(again.container).toBeEmptyDOMElement();
  });

  it('says the save the player has now is kept aside, and keeps it', () => {
    localStorage.setItem(backup, OLD);
    localStorage.setItem('fight-gym-save-v1', 'new gym');
    const card = render(<BrokenSaveRestore pathname="/fight-gym/" />);
    expect(screen.getByText(/nothing is deleted/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Put that save back' }));
    expect(localStorage.getItem('fight-gym-save-v1')).toBe('new gym');
    expect(reopenGame).toHaveBeenCalledWith('/fight-gym');
    card.unmount();
    runSaveKeeper();
    expect(localStorage.getItem('fight-gym-save-v1')).toBe(OLD);
    const kept = backupsOf('fight-gym-save-v1');
    expect(kept.map(k => localStorage.getItem(k)).sort()).toEqual([OLD, 'new gym'].sort());
    /* After the load: the outcome first, then the game that was replaced is on offer, as it was after a swap before. */
    render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(screen.getByText('Your save is back')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/kept aside in this browser, so nothing was deleted/);
    expect(screen.queryByRole('button', { name: 'Put that save back' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'Put that save back' })).toBeInTheDocument();
  });

  it('does not offer back a backup that is exactly the save being played', () => {
    localStorage.setItem(backup, OLD);
    localStorage.setItem('fight-gym-save-v1', OLD);
    const { container } = render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says so when the load could not put the save back, and still offers it', () => {
    localStorage.setItem(backup, OLD);
    localStorage.setItem('fight-gym-save-v1', 'new gym');
    const card = render(<BrokenSaveRestore pathname="/fight-gym" />);
    fireEvent.click(screen.getByRole('button', { name: 'Put that save back' }));
    card.unmount();
    /* The load meets a browser with no room for the copy aside. */
    const full = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    runSaveKeeper();
    full.mockRestore();
    expect(localStorage.getItem('fight-gym-save-v1')).toBe('new gym');
    expect(localStorage.getItem(backup)).toBe(OLD);
    expect(backupsOf('fight-gym-save-v1')).toHaveLength(1);
    render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(screen.getByText('Nothing changed')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/out of room/);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'Put that save back' })).toBeInTheDocument();
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

  it('"Leave it aside" hides it and touches nothing', () => {
    localStorage.setItem(backup, OLD);
    const { container } = render(<BrokenSaveRestore pathname="/fight-gym" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leave it aside' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Put that save back' }));
    vi.mocked(Storage.prototype.setItem).mockRestore();
    expect(localStorage.getItem(backup)).toBe(OLD);
    expect(localStorage.getItem('fight-gym-save-v1')).toBeNull();
    expect(openGame).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/nothing changed/);
  });
});

describe('backups are capped, and one can be waved off or deleted (Round 958 closing check)', () => {
  const entry = CONTINUE_SAVES.find(e => e.path === '/fight-gym')!;
  const other = CONTINUE_SAVES.find(e => e.path === '/cfb-dynasty')!;
  const key = (stamp: string) => `${entry.saveKey}${BROKEN_SAVE_MARK}${stamp}`;
  const day = (d: number) => new Date(Date.UTC(2026, 9, d, 8, 0, 0));
  const stamp = (d: number) => `2026-10-${String(d).padStart(2, '0')}T08-00-00`;

  it('the boundary tells the player the cap it applies', () => {
    expect(BACKUPS_KEPT).toBe(3);
    localStorage.setItem(entry.saveKey, BROKEN);
    crash('/fight-gym');
    expect(screen.getByText(/keeps its three newest backups/)).toBeInTheDocument();
  });

  it('every fresh start keeps the newest three of that game, step by step, and never touches another game', () => {
    const { m, s } = fakeStorage();
    m.set(`${other.saveKey}${BROKEN_SAVE_MARK}${stamp(1)}`, 'other game');
    for (let n = 1; n <= 6; n += 1) {
      m.set(entry.saveKey, `save ${n}`);
      expect(setAsideSave(entry, s, day(n))).toEqual({ ok: true, backupKey: key(stamp(n)) });
      const kept = backupKeysOf(entry, s);
      expect(kept).toEqual([n, n - 1, n - 2].filter(d => d >= 1).map(d => key(stamp(d))));
      for (const k of kept) expect(m.get(k)).toBe(`save ${Number(k.slice(-11, -9))}`);
    }
    expect(m.get(`${other.saveKey}${BROKEN_SAVE_MARK}${stamp(1)}`)).toBe('other game');
  });

  it('a clock set back never prunes the save it just moved', () => {
    const { m, s } = fakeStorage();
    for (const d of [10, 11, 12]) m.set(key(stamp(d)), `kept ${d}`);
    m.set(entry.saveKey, 'just broke');
    expect(setAsideSave(entry, s, day(1))).toEqual({ ok: true, backupKey: key(stamp(1)) });
    expect(m.get(key(stamp(1)))).toBe('just broke');
    expect(backupKeysOf(entry, s)).toEqual([key(stamp(12)), key(stamp(11)), key(stamp(1))]);
  });

  it('a swap at the cap drops nothing', () => {
    const { m, s } = fakeStorage();
    for (const d of [1, 2, 3]) m.set(key(stamp(d)), `kept ${d}`);
    m.set(entry.saveKey, 'playing now');
    expect(restoreBackup(entry, key(stamp(3)), s, day(5))).toEqual({ ok: true });
    expect(m.get(entry.saveKey)).toBe('kept 3');
    expect(backupKeysOf(entry, s)).toEqual([key(stamp(5)), key(stamp(2)), key(stamp(1))]);
    expect(m.get(key(stamp(5)))).toBe('playing now');
  });

  it('offers the newest backup until it is waved off, then the next newer one only', () => {
    const { m, s } = fakeStorage();
    m.set(key(stamp(1)), 'one');
    expect(offeredBackup(entry, s)).toBe(key(stamp(1)));
    expect(dismissBackup(entry, key(stamp(1)), s)).toBe(true);
    expect(offeredBackup(entry, s)).toBeNull();
    m.set(entry.saveKey, 'two');
    setAsideSave(entry, s, day(2));
    expect(offeredBackup(entry, s)).toBe(key(stamp(2)));
    expect(m.get(key(stamp(1)))).toBe('one');
    expect(backupKeysOf(entry, s)).not.toContain(SET_ASIDE_SEEN_KEY);
  });

  it('a damaged waved-off record means nothing was waved off', () => {
    const { m, s } = fakeStorage();
    m.set(key(stamp(1)), 'one');
    for (const bad of ['not json', '[]', 'null', '7']) {
      m.set(SET_ASIDE_SEEN_KEY, bad);
      expect(offeredBackup(entry, s)).toBe(key(stamp(1)));
    }
  });

  it('deleteBackup takes only a backup of this game', () => {
    const { m, s } = fakeStorage();
    m.set(entry.saveKey, 'playing now');
    m.set(`${other.saveKey}${BROKEN_SAVE_MARK}${stamp(1)}`, 'other game');
    m.set(key(stamp(1)), 'one');
    expect(deleteBackup(entry, entry.saveKey, s)).toEqual({ ok: false });
    expect(deleteBackup(entry, `${other.saveKey}${BROKEN_SAVE_MARK}${stamp(1)}`, s)).toEqual({ ok: false });
    expect(deleteBackup(entry, key(stamp(1)), s)).toEqual({ ok: true });
    expect([...m.keys()].sort()).toEqual([`${other.saveKey}${BROKEN_SAVE_MARK}${stamp(1)}`, entry.saveKey].sort());
  });

  it('reads the date a backup was made from its key', () => {
    expect(backupDate(key('2026-10-04T09-30-15-2'))?.toISOString()).toBe('2026-10-04T09:30:15.000Z');
    expect(backupDate(entry.saveKey)).toBeNull();
  });

  it('"Leave it aside" is remembered on the next visit, and a newer backup is offered again', () => {
    localStorage.setItem(key(stamp(1)), 'one');
    const first = render(<BrokenSaveRestore pathname="/fight-gym" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leave it aside' }));
    first.unmount();
    const second = render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(second.container).toBeEmptyDOMElement();
    second.unmount();
    localStorage.setItem(key(stamp(2)), 'two');
    render(<BrokenSaveRestore pathname="/fight-gym" />);
    expect(screen.getByRole('region', { name: 'Your kept aside save' })).toBeInTheDocument();
    expect(localStorage.getItem(key(stamp(1)))).toBe('one');
  });

  it('"Delete it" asks first, "Keep it" keeps it, and yes deletes only that backup', () => {
    localStorage.setItem(key(stamp(1)), 'one');
    localStorage.setItem(entry.saveKey, 'playing now');
    const { container } = render(<BrokenSaveRestore pathname="/fight-gym" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    expect(screen.getByText(/for good/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(localStorage.getItem(key(stamp(1)))).toBe('one');
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem(key(stamp(1)))).toBeNull();
    expect(localStorage.getItem(entry.saveKey)).toBe('playing now');
    expect(openGame).not.toHaveBeenCalled();
  });
});
