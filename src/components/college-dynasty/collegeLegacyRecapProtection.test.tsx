import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import { backupKeysOf, BROKEN_SAVE_MARK, routeSaveEntry } from '@/lib/brokenSaveRecovery';
import { settlePendingSaves } from '@/lib/safeStorage';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const originalSet = Storage.prototype.setItem;
const originalGet = Storage.prototype.getItem;
const recapButton = { name: 'Hit the recruiting trail' };
const retryButton = { name: 'Retry save' };
const sports = [
  { id: 'cfb', Board: CfbDynastyBoard, history: 'natties', recap: 'postseason' },
  { id: 'cbb', Board: CbbDynastyBoard, history: 'titles', recap: 'march' },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe.each(sports)('$id recruiting from an older recap', ({ id, Board, history, recap }) => {
  const saveKey = `${id}-dynasty-save-v1`;
  const peerKey = id === 'cfb' ? 'cbb-dynasty-save-v1' : 'cfb-dynasty-save-v1';
  const backupPrefix = saveKey + BROKEN_SAVE_MARK;
  const peer = '{"phase":"season","separateCareer":true}';
  const entry = routeSaveEntry(`/${id}-dynasty`)!;
  const backups = () => backupKeysOf(entry, localStorage);
  const readActive = () => originalGet.call(localStorage, saveKey)!;
  let fixtureRaw: string;

  function capture() {
    const archivedDir = process.env.COLLEGE_RECAP_FIXTURE_DIR;
    if (archivedDir) {
      return readFileSync(join(archivedDir, `dukb-college-${id}-recap-raw.json`), 'utf8');
    }
    let random = 426;
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => {
      random = (random * 16807) % 2147483647;
      return (random - 1) / 2147483646;
    });
    const view = render(<Board />);
    fireEvent.click(view.getByRole('button', { name: /^Alabama Prestige/ }));
    fireEvent.click(view.getByRole('button', { name: 'Play' }));
    const turn = /^(?:Play Week \d+|Play Round \d+|Final week \+ the Playoff|Final round \+ March)$/;
    for (let round = 0; round < 20 && !view.queryByRole('button', recapButton); round++) {
      fireEvent.click(view.getByRole('button', { name: turn }));
    }
    expect(view.getByRole('button', recapButton)).toBeTruthy();
    const old = JSON.parse(readActive());
    delete old[recap];
    view.unmount();
    rng.mockRestore();
    return JSON.stringify(old);
  }

  function seed() {
    fixtureRaw ??= capture();
    localStorage.setItem(saveKey, fixtureRaw);
    localStorage.setItem(peerKey, peer);
    return fixtureRaw;
  }

  function mount() {
    return render(<StrictMode><Board /></StrictMode>);
  }

  function expectRecruiting(before: string) {
    const old = JSON.parse(before);
    const current = JSON.parse(readActive());
    expect(current.phase).toBe('recruit');
    expect(current.st.myTeam).toBe(old.st.myTeam);
    expect(current.st.season).toBe(old.st.season);
    expect(current.st.seasonsPlayed).toBe(old.st.seasonsPlayed);
    expect(current.st[history]).toEqual(old.st[history]);
    expect(current.recruits.length).toBeGreaterThan(0);
    expect(current.portal.length).toBeGreaterThan(0);
    expect(localStorage.getItem(peerKey)).toBe(peer);
  }

  it('verifies an exact recovery copy before the single recruiting write', () => {
    const raw = seed();
    const writes: string[] = [];
    const reads: string[] = [];
    const copiedBeforeWrite: Array<{ bytes: string | null; checked: boolean }> = [];
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      reads.push(key);
      return originalGet.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === saveKey) {
        for (const backup of backups()) {
          copiedBeforeWrite.push({ bytes: originalGet.call(this, backup), checked: reads.includes(backup) });
        }
      }
      writes.push(key);
      originalSet.call(this, key, value);
    });
    mount();
    expectRecruiting(raw);
    expect(copiedBeforeWrite).toEqual([{ bytes: raw, checked: true }]);
    expect(writes.filter(key => key === saveKey)).toHaveLength(1);
  });

  it('keeps original bytes on refused copy, blocks automatic refresh, and retries the same draft', () => {
    const raw = seed();
    const random = vi.spyOn(Math, 'random');
    let refused = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (refused && key.startsWith(backupPrefix)) throw new DOMException('Quota', 'QuotaExceededError');
      originalSet.call(this, key, value);
    });
    const view = mount();
    expect(view.getByRole('button', retryButton)).toBeTruthy();
    expect(readActive()).toBe(raw);
    expect(backups()).toEqual([]);
    const draws = random.mock.calls.length;
    act(() => expect(settlePendingSaves()).toBe(false));
    expect(readActive()).toBe(raw);
    refused = false;
    fireEvent.click(view.getByRole('button', retryButton));
    expect(random.mock.calls).toHaveLength(draws);
    expectRecruiting(raw);
    expect(backups().map(key => localStorage.getItem(key))).toEqual([raw]);
    expect(settlePendingSaves()).toBe(true);
  });

  it('retries the exact claimed pool after a suspected active write readback', () => {
    const raw = seed();
    let attempted: string | undefined;
    let suspect = true;
    let wrote = false;
    const activeWrites: string[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === saveKey) {
        attempted = value;
        activeWrites.push(value);
        wrote = true;
      }
      originalSet.call(this, key, value);
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key === saveKey && wrote && suspect) return null;
      return originalGet.call(this, key);
    });
    const view = render(<Board />);
    expect(attempted).toBeTruthy();
    expect(view.getByRole('button', retryButton)).toBeTruthy();
    expect(backups().map(key => localStorage.getItem(key))).toEqual([raw]);
    suspect = false;
    act(() => expect(settlePendingSaves()).toBe(true));
    expect(view.queryByRole('button', retryButton)).toBeNull();
    expect(readActive()).toBe(attempted);
    expect(activeWrites).toHaveLength(1);
    expectRecruiting(raw);
  });

  it('keeps a newer career that arrives while the verified recovery copy is made', () => {
    const raw = seed();
    const peerWrite = JSON.stringify({ ...JSON.parse(raw), otherTab: true });
    const writes: string[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      writes.push(key);
      originalSet.call(this, key, value);
      if (key.startsWith(backupPrefix)) originalSet.call(this, saveKey, peerWrite);
    });
    const view = mount();
    expect(view.getByText(/changed in another tab/)).toBeTruthy();
    expect(writes).not.toContain(saveKey);
    expect(readActive()).toBe(peerWrite);
    expect(localStorage.getItem(peerKey)).toBe(peer);
    expect(backups().map(key => localStorage.getItem(key))).toEqual([raw]);
  });

  it('checks the defensive automatic move from a closed market record', () => {
    const legacy = seed();
    const raw = JSON.stringify({ ...JSON.parse(legacy), phase: 'market' });
    localStorage.setItem(saveKey, raw);
    mount();
    expectRecruiting(raw);
    expect(backups().map(key => localStorage.getItem(key))).toEqual([raw]);
  });
});
