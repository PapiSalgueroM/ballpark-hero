import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueRow } from '@/components/home/ContinueRow';
import { savedGames } from '@/data/continueSaves';
import { BROKEN_SAVE_MARK, heldSaveEntry, routeSaveEntry } from '@/lib/brokenSaveRecovery';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY } from '@/lib/nrlManager';
import { createSaveFence, fenceKeyOf, saveFence } from '@/lib/saveFence';
import { applyPending, keepUpdateCopies, PENDING_RESTORE_KEY, stageRestore } from '@/lib/saveKeeper';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const path = '/nrl-team-manager';
const secondKey = 'nrl-manager-save-v1-slot-2';
const thirdKey = 'nrl-manager-save-v1-slot-3';
const now = new Date('2026-11-12T06:00:00Z');
const storm = () => createNrlCareer('storm', 17);
const perth = () => createNrlCareer('bears', 19, 2027);
const read = (key: string) => readNrlCareerSave(localStorage.getItem(key));
const raw = (key: string) => localStorage.getItem(key);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function open(search = '') {
  return render(<MemoryRouter initialEntries={[path + search]}><NrlTeamManager /></MemoryRouter>);
}

function externalWrite(key: string, text: string) {
  const other = createSaveFence(localStorage);
  other.adopt(key);
  expect(other.write(key, () => { localStorage.setItem(key, text); return true; })).toBe('written');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: fenceKeyOf(key) })));
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const key of [NRL_SAVE_KEY, secondKey, thirdKey]) saveFence.release(key);
});

describe('NRL career slots', () => {
  it('opens the old v1 save in slot 1 without a write, creates Perth in slot 2, and resumes both years', () => {
    const legacy = JSON.stringify(createNrlSeason('storm', 17));
    localStorage.setItem(NRL_SAVE_KEY, legacy);
    localStorage.setItem(fenceKeyOf(NRL_SAVE_KEY), '4');
    open();
    click('Career saves');
    const chooser = screen.getByRole('region', { name: 'Career saves' });
    expect(within(chooser).getByText('Melbourne Storm')).toBeVisible();
    expect(raw(NRL_SAVE_KEY)).toBe(legacy);
    expect(raw(fenceKeyOf(NRL_SAVE_KEY))).toBe('4');

    click('New career in slot 2');
    fireEvent.click(screen.getByRole('button', { name: /2027 Perth Bears debut/ }));
    click('Manage Perth Bears');
    expect(read(secondKey)?.openingYear).toBe(2027);
    expect(read(secondKey)?.season.clubId).toBe('bears');
    const perthBytes = raw(secondKey);
    expect(raw(NRL_SAVE_KEY)).toBe(legacy);

    click('Career saves');
    click('Resume slot 1');
    click('Quick Sim');
    expect(read(NRL_SAVE_KEY)).toMatchObject({ version: 2, openingYear: 2026, legacySeason: true });
    expect(read(NRL_SAVE_KEY)).toEqual(reduceNrlCareer(readNrlCareerSave(legacy)!, { type: 'advance' }));
    expect(raw(secondKey)).toBe(perthBytes);
  });

  it('reopens a saved half in slot 2 and isolates writes and stale fences by key', () => {
    const first = storm();
    const inPlay = reduceNrlCareer(perth(), { type: 'startLive' });
    expect(inPlay.season.live).toBeDefined();
    const half = JSON.stringify(inPlay);
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(first));
    localStorage.setItem(secondKey, half);
    open('?slot=2');
    expect(screen.getByRole('button', { name: 'Play second half' })).toBeEnabled();
    const newerFirst = JSON.stringify(reduceNrlCareer(first, { type: 'advance' }));
    externalWrite(NRL_SAVE_KEY, newerFirst);
    expect(screen.getByRole('button', { name: 'Play second half' })).toBeEnabled();
    expect(raw(secondKey)).toBe(half);

    const { year, round, tactic } = inPlay.season;
    const settled = reduceNrlCareer(inPlay, { type: 'finishLive', year, round, tactic });
    expect(settled.season.live).toBeUndefined();
    expect(settled.season.round).toBe(round + 1);
    const finished = JSON.stringify(settled);
    externalWrite(secondKey, finished);
    const finish = screen.getByRole('button', { name: 'Play second half' });
    expect(finish).toBeDisabled();
    fireEvent.click(finish);
    expect(raw(secondKey)).toBe(finished);
    click('Career saves');
    click('Resume slot 1');
    expect(screen.queryByText('This season changed in another tab.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quick Sim' })).toBeEnabled();
    expect(raw(NRL_SAVE_KEY)).toBe(newerFirst);
  });

  it('refuses to overwrite a slot filled after a New screen opened', () => {
    open('?slot=2');
    const newer = JSON.stringify(perth());
    // A keeper restore or an older client can replace bytes without touching the fence.
    localStorage.setItem(secondKey, newer);
    click('Manage Melbourne Storm');
    expect(raw(secondKey)).toBe(newer);
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
    expect(raw(NRL_SAVE_KEY)).toBeNull();
  });

  it('keeps pending progress in its own slot when storage refuses it and retries before leaving', () => {
    const first = JSON.stringify(storm());
    const second = JSON.stringify(perth());
    localStorage.setItem(NRL_SAVE_KEY, first);
    localStorage.setItem(secondKey, second);
    open('?slot=2');
    const set = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === secondKey) throw new DOMException('Storage full', 'QuotaExceededError');
      set.call(this, key, value);
    });
    click('Quick Sim');
    click('Career saves');
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Career saves' })).not.toBeInTheDocument();
    expect(raw(NRL_SAVE_KEY)).toBe(first);
    expect(raw(secondKey)).toBe(second);

    quota.mockRestore();
    click('Career saves');
    expect(screen.getByRole('region', { name: 'Career saves' })).toBeVisible();
    expect(read(secondKey)).toEqual(reduceNrlCareer(readNrlCareerSave(second)!, { type: 'advance' }));
    expect(raw(NRL_SAVE_KEY)).toBe(first);
  });

  it('confirms deletion for one slot, rejects a changed receipt, and fences a successful delete', () => {
    const first = JSON.stringify(storm());
    const second = perth();
    localStorage.setItem(NRL_SAVE_KEY, first);
    localStorage.setItem(secondKey, JSON.stringify(second));
    open('?slot=2&view=saves');
    click('Delete slot 2');
    const newer = JSON.stringify(reduceNrlCareer(second, { type: 'advance' }));
    externalWrite(secondKey, newer);
    click('Delete career');
    expect(raw(secondKey)).toBe(newer);
    expect(screen.getByText('This slot changed in another tab.')).toBeVisible();

    click('Delete slot 2');
    const stale = createSaveFence(localStorage);
    stale.adopt(secondKey);
    click('Delete career');
    expect(raw(secondKey)).toBeNull();
    expect(stale.write(secondKey, () => { localStorage.setItem(secondKey, newer); return true; })).toBe('moved');
    expect(raw(NRL_SAVE_KEY)).toBe(first);
  });
});

describe('NRL slot discovery and recovery', () => {
  it('lists one Home card and links directly to the only saved slot', () => {
    localStorage.setItem(thirdKey, JSON.stringify(perth()));
    const nrl = savedGames(localStorage).filter(item => item.game.path === path);
    expect(nrl).toHaveLength(1);
    expect(nrl[0].entry).toMatchObject({ path: path + '?slot=3', saveKey: thirdKey });
    render(<MemoryRouter><ContinueRow /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /NRL Team Manager/ })).toHaveAttribute('href', path + '?slot=3');
    expect(heldSaveEntry(path + '?slot=3', localStorage)?.saveKey).toBe(thirdKey);
    expect(heldSaveEntry(path, localStorage)).toBeNull();
    expect(routeSaveEntry(path + '?slot=7')).toBeNull();
    expect(routeSaveEntry(path + '?slot=2&slot=3')).toBeNull();
  });

  it('keeps old copies per key and restores one approved slot without touching the other careers', () => {
    const first = JSON.stringify(storm());
    const oldThird = JSON.stringify(createNrlSeason('bears', 22, 2027));
    const current = JSON.stringify(perth());
    const incoming = JSON.stringify(createNrlCareer('dragons', 20, 2027));
    localStorage.setItem(NRL_SAVE_KEY, first);
    localStorage.setItem(secondKey, current);
    localStorage.setItem(thirdKey, oldThird);
    expect(keepUpdateCopies(localStorage, now)).toBe(1);
    expect(Object.keys(localStorage).some(key => key.startsWith(thirdKey + BROKEN_SAVE_MARK))).toBe(true);
    expect(raw(thirdKey)).toBe(oldThird);

    const entry = routeSaveEntry(path + '?slot=2')!;
    const backup = secondKey + BROKEN_SAVE_MARK + '2026-11-12T05-00-00';
    localStorage.setItem(backup, incoming);
    expect(stageRestore(entry, backup, localStorage, now)).toEqual({ ok: true });
    const staged = raw(PENDING_RESTORE_KEY)!;
    localStorage.setItem(PENDING_RESTORE_KEY, staged.replace('?slot=2', '?slot=3'));
    expect(applyPending(localStorage, now)).toBeNull();
    expect(raw(secondKey)).toBe(current);
    expect(raw(thirdKey)).toBe(oldThird);

    expect(stageRestore(entry, backup, localStorage, now)).toEqual({ ok: true });
    expect(applyPending(localStorage, now)).toMatchObject({ path: path + '?slot=2', ok: true, kept: true });
    expect(raw(secondKey)).toBe(incoming);
    expect(raw(NRL_SAVE_KEY)).toBe(first);
    expect(raw(thirdKey)).toBe(oldThird);
  });
});
