import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AussieRulesLeagueBoard from '@/components/aussie-rules-manager/AussieRulesLeagueBoard';
import { useAussieRulesLeague } from '@/hooks/useAussieRulesLeague';
import { offeredBackup, routeSaveEntry } from '@/lib/brokenSaveRecovery';
import * as league from '@/lib/aussieRulesLeague';
import archive from '../../scripts/data/aussieV2SaveFixture1572.json';
import { maskedHash, play, sha } from '../../scripts/lib/aflClubNames1572.mjs';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const { LEGACY_SAVE_KEY, SAVE_KEY } = league;
const peer = '{ "version": 1, "seed": 5150 }';
const backup = (key: string) => key.startsWith(SAVE_KEY + '.broken-');
const backupKeys = () => Object.keys(localStorage).filter(backup);
const activeRaw = () => localStorage.getItem(SAVE_KEY);
const writeRefused = () => new DOMException('fixture quota', 'QuotaExceededError');

const fixtures = ['breakAfterSwap', 'season3Break'].map(name => archive.recipes.find(row => row.name === name)!);

function plant(fixture = fixtures[0]) {
  const archiveDir = process.env.AFL_MIGRATION_ARCHIVE_DIR;
  const archived = archiveDir && readFileSync(join(archiveDir, `dukb-afl-pre1572-${fixture.name}.raw`), 'utf8');
  if (archived) expect(sha(archived)).toBe(fixture.raw);
  const generated = archived ? null : play(league, league.createLeague(fixture.seed, fixture.club), fixture.at);
  const original = archived || JSON.stringify(generated);
  const state = league.readLeagueSave(original)!;
  expect(state).toBeTruthy();
  expect(state.phase).toBe(fixture.phase);
  expect(state.season).toBe(fixture.season);
  expect(state.history).toHaveLength(fixture.season - 1);
  localStorage.setItem(SAVE_KEY, original);
  localStorage.setItem(LEGACY_SAVE_KEY, peer);
  return { state, original, replacement: JSON.stringify(league.switchClubSet(state)) };
}

function switchNames(hook: { result: { current: ReturnType<typeof useAussieRulesLeague> } }) {
  let switched = false;
  act(() => { switched = hook.result.current.switchNames(); });
  return switched;
}

function expectUnchanged(original: string) {
  expect(activeRaw() === original).toBe(true);
  expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBe(peer);
}

function expectOneBackup(original: string) {
  const copies = backupKeys();
  expect(copies).toHaveLength(1);
  expect(localStorage.getItem(copies[0]) === original).toBe(true);
  return copies[0];
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Aussie Rules club-name migration recovery', () => {
  it.each(fixtures)('backs up the exact $name archive before changing the names', fixture => {
    const { state, original, replacement } = plant(fixture);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const loaded = renderHook(() => useAussieRulesLeague());
    expect(writes).not.toHaveBeenCalled();
    expect(switchNames(loaded)).toBe(true);
    const key = expectOneBackup(original);
    expect(offeredBackup(routeSaveEntry('/aussie-rules-manager')!, localStorage)).toBe(key);
    expect(writes.mock.calls.map(([name]) => name)).toEqual([key, SAVE_KEY]);
    expect(activeRaw() === replacement).toBe(true);
    const changed = loaded.result.current.state!;
    expect(changed.clubSet).toBe('afl2026');
    expect(changed.myClub).toBe(state.myClub);
    expect(changed.clubName).not.toBe(state.clubName);
    expect(maskedHash(changed)).toBe(maskedHash(state));
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBe(peer);

    loaded.unmount();
    const reopened = renderHook(() => useAussieRulesLeague());
    expect(JSON.stringify(reopened.result.current.state) === replacement).toBe(true);
    expect(switchNames(reopened)).toBe(false);
    expect(writes.mock.calls.map(([name]) => name)).toEqual([key, SAVE_KEY]);
  });

  it.each(['backup quota', 'backup readback', 'active quota'] as const)(
    'keeps the original career on %s and retries without another backup', fault => {
      const { original, replacement } = plant();
      const set = Storage.prototype.setItem;
      const get = Storage.prototype.getItem;
      const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
        if ((fault === 'backup quota' && backup(key)) || (fault === 'active quota' && key === SAVE_KEY)) throw writeRefused();
        set.call(this, key, value);
      });
      const reads = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
        const raw = get.call(this, key);
        return fault === 'backup readback' && raw !== null && backup(key) ? 'wrong backup bytes' : raw;
      });
      const loaded = renderHook(() => useAussieRulesLeague());
      expect(switchNames(loaded)).toBe(false);
      expectUnchanged(original);
      expect(loaded.result.current.state?.clubSet).toBeUndefined();
      expect(loaded.result.current.storageNotice).toMatch(/save/i);
      expect(writes.mock.calls.filter(([name]) => name === SAVE_KEY)).toHaveLength(fault === 'active quota' ? 1 : 0);
      const knownCopy = fault === 'active quota' ? expectOneBackup(original) : null;
      writes.mockRestore();
      reads.mockRestore();
      expect(switchNames(loaded)).toBe(true);
      const key = expectOneBackup(original);
      if (knownCopy) expect(key).toBe(knownCopy);
      expect(activeRaw() === replacement).toBe(true);
    },
  );

  it('acknowledges a landed replacement after a suspect active readback without writing it twice', () => {
    const { original, replacement } = plant();
    const get = Storage.prototype.getItem;
    const reads = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const raw = get.call(this, key);
      return key === SAVE_KEY && raw === replacement ? 'wrong active bytes' : raw;
    });
    const loaded = renderHook(() => useAussieRulesLeague());
    expect(switchNames(loaded)).toBe(false);
    expect(loaded.result.current.state?.clubSet).toBeUndefined();
    const held = expectOneBackup(original);
    expect(get.call(localStorage, SAVE_KEY) === replacement).toBe(true);
    const uncertain = vi.spyOn(Storage.prototype, 'setItem');
    expect(switchNames(loaded)).toBe(false);
    expect(loaded.result.current.state?.clubName).toBe(league.readLeagueSave(original)?.clubName);
    expect(uncertain).not.toHaveBeenCalled();
    uncertain.mockRestore();
    reads.mockRestore();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    expect(switchNames(loaded)).toBe(true);
    expect(expectOneBackup(original)).toBe(held);
    expect(activeRaw() === replacement).toBe(true);
    expect(writes).not.toHaveBeenCalled();
  });

  it('preserves the newer save another tab writes while the backup is being made', () => {
    const { state, original } = plant();
    const newer = JSON.stringify(play(league, state, 1));
    expect(newer === original).toBe(false);
    const set = Storage.prototype.setItem;
    let otherTab = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, value);
      if (!otherTab && backup(key)) {
        otherTab = true;
        set.call(this, SAVE_KEY, newer);
      }
    });
    const loaded = renderHook(() => useAussieRulesLeague());
    expect(switchNames(loaded)).toBe(false);
    expect(otherTab).toBe(true);
    expect(activeRaw() === newer).toBe(true);
    expect(loaded.result.current.storageNotice).toMatch(/another tab/i);
    expect(JSON.stringify(loaded.result.current.state) === newer).toBe(true);
    expectOneBackup(original);
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBe(peer);
  });

  it('keeps the confirmation available if the switch has to be retried from the Club screen', () => {
    const { original, replacement } = plant(fixtures[1]);
    const stored = Storage.prototype.setItem;
    const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (backup(key)) throw writeRefused();
      stored.call(this, key, value);
    });
    const board = render(<MemoryRouter><AussieRulesLeagueBoard /></MemoryRouter>);
    fireEvent.click(board.getByText('Club', { selector: 'div' }).closest('button')!);
    fireEvent.click(board.getByRole('button', { name: 'Switch to the real names' }));
    fireEvent.click(board.getByRole('button', { name: /^Switch$/ }));
    expect(board.getByText(/Could not save the club name change/)).toBeVisible();
    expectUnchanged(original);
    expect(board.getByRole('button', { name: /^Switch$/ })).toBeEnabled();
    refused.mockRestore();
    fireEvent.click(board.getByRole('button', { name: /^Switch$/ }));
    expect(activeRaw() === replacement).toBe(true);
    expectOneBackup(original);
    expect(board.queryByRole('button', { name: /^Switch$/ })).toBeNull();
  });
});
