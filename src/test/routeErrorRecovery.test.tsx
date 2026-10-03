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
import { BROKEN_SAVE_MARK, openGame, setAsideSave } from '@/lib/brokenSaveRecovery';

const Boom = () => { throw new Error('deliberate test throw'); };
const BROKEN = '{"st":{"myTeam":"Broken Save U"},"g":{"name":"x"},"c":null}';

function at(path: string) {
  window.history.pushState({}, '', path);
}

function crash(path: string) {
  at(path);
  /* React reports a caught error on the way past; keep the run readable. */
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return render(<RouteErrorBoundary resetKey={path}><Boom /></RouteErrorBoundary>);
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
      expect(screen.getByText(/moved aside to a\s+backup in this browser, not deleted/)).toBeInTheDocument();
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
});
