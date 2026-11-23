import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupKeysOf, BROKEN_SAVE_MARK } from '@/lib/brokenSaveRecovery';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_DOMESTIC_SCORING_MODEL, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { NRL_SAVE_SLOTS } from '@/lib/nrlSaveSlots';
import { createSaveFence, fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

const { recordCompletion } = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion, getCurrentPlayerName: () => 'Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const path = '/nrl-team-manager';
const firstKey = NRL_SAVE_KEY;
const secondKey = NRL_SAVE_SLOTS[1].saveKey;
const pointKey = (key: string) => 'dukb-nrl-checkpoint:' + key;
const seasonPointKey = (key: string) => 'dukb-nrl-season-checkpoint:' + key;
const raw = (key: string) => localStorage.getItem(key);
const bytes = JSON.stringify;
const put = (key: string, text: string) => localStorage.setItem(key, text);
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const slot = (number: number) => within(screen.getByRole('heading', { name: 'Slot ' + number }).parentElement!);
const slotClick = (number: number, name: string) => fireEvent.click(slot(number).getByRole('button', { name }));
const selectCheckpoint = (number = 1) => slotClick(number, 'Save checkpoint');
const startRestore = (number = 1) => slotClick(number, 'Restore checkpoint');
const confirmRestore = () => click('Restore saved checkpoint');

function open(view = '?view=saves') {
  return render(<MemoryRouter initialEntries={[path + view]}><NrlTeamManager /></MemoryRouter>);
}

function beforeGrandFinal(career: NrlCareerState) {
  while (career.season.round < 31) career = advance(career);
  expect(career.season.phase).toBe('finals');
  return career;
}

function finishDisplayed(view: ReturnType<typeof open>) {
  const next = view.container.querySelector<HTMLButtonElement>('[data-nrl-advance]');
  expect(next).toBeEnabled();
  fireEvent.click(next!);
  expect(button('Review this season')).toBeVisible();
}

function closedSeason(career: NrlCareerState) {
  for (let round = 0; round < 45 && career.season.phase !== 'complete'; round++) career = advance(career);
  expect(career.season.phase).toBe('complete');
  return career;
}

function keepPlaying(year: number) {
  click('Review this season');
  click('Start ' + (year + 1));
}

beforeEach(() => {
  localStorage.clear();
  recordCompletion.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  NRL_SAVE_SLOTS.forEach(entry => saveFence.release(entry.saveKey));
});

describe('NRL career checkpoints', () => {
  it('copies original v1 bytes and restores a real live half in another slot', () => {
    const v1 = bytes(reduceNrlSeason(createNrlSeason('storm', 17), { type: 'advance' }));
    const live = reduceNrlCareer(createNrlCareer('bears', 19, 2027), { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    put(firstKey, v1);
    put(secondKey, bytes(live));
    put(fenceKeyOf(firstKey), '7');
    const view = open('?slot=2&view=saves');
    selectCheckpoint(1);
    selectCheckpoint(2);
    expect(raw(pointKey(firstKey))).toBe(v1);
    expect(raw(pointKey(secondKey))).toBe(bytes(live));
    expect(raw(firstKey)).toBe(v1);
    expect(raw(fenceKeyOf(firstKey))).toBe('7');
    expect(slot(2).getByText(/Checkpoint.*half time/)).toBeVisible();

    click('Resume slot 2');
    click('Play second half');
    const finished = raw(secondKey);
    expect(finished).not.toBe(bytes(live));
    click('Career saves');
    startRestore(2);
    expect(raw(secondKey)).toBe(finished);
    confirmRestore();
    expect(raw(secondKey)).toBe(bytes(live));
    expect(raw(firstKey)).toBe(v1);
    expect(raw(pointKey(firstKey))).toBe(v1);
    expect(backupKeysOf(NRL_SAVE_SLOTS[1], localStorage).some(key => raw(key) === finished)).toBe(true);
    click('Resume slot 2');
    expect(button('Play second half')).toBeEnabled();

    click('Career saves');
    click('Resume slot 1');
    const next = view.container.querySelector<HTMLButtonElement>('[data-nrl-advance]');
    expect(next).toBeEnabled();
    fireEvent.click(next!);
    expect(raw(firstKey)).not.toBe(v1);
    click('Career saves');
    startRestore(1);
    confirmRestore();
    expect(raw(firstKey)).toBe(v1);
    expect(raw(secondKey)).toBe(bytes(live));
  });

  it('requires confirmation to replace and refuses a changed checkpoint or active save', () => {
    const start = createNrlCareer('storm', 17);
    const first = bytes(start);
    const second = bytes(advance(start));
    const third = bytes(advance(advance(start)));
    put(firstKey, first);
    open();
    selectCheckpoint();
    put(firstKey, second);
    fireEvent.focus(window);
    slotClick(1, 'Replace checkpoint');
    expect(raw(pointKey(firstKey))).toBe(first);
    put(pointKey(firstKey), third);
    click('Replace saved checkpoint');
    expect(raw(pointKey(firstKey))).toBe(third);
    expect(raw(firstKey)).toBe(second);
    expect(screen.getByRole('status')).toHaveTextContent(/changed in another tab/);

    startRestore();
    put(firstKey, first);
    confirmRestore();
    expect(raw(firstKey)).toBe(first);
    expect(raw(pointKey(firstKey))).toBe(third);
    expect(backupKeysOf(NRL_SAVE_SLOTS[0], localStorage)).toHaveLength(0);
  });

  it('keeps current bytes and the checkpoint when recovery or active writes run out of room', () => {
    const start = beforeGrandFinal(createNrlCareer('storm', 4));
    const old = bytes(start);
    const current = bytes(advance(start));
    const replayKey = 'dukb-nrl-checkpoint-replay:' + firstKey;
    put(firstKey, current);
    put(pointKey(firstKey), old);
    open();
    const setItem = Storage.prototype.setItem;
    for (const rejects of [(key: string) => key.includes(BROKEN_SAVE_MARK), (key: string) => key === replayKey, (key: string) => key === firstKey]) {
      startRestore();
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
        if (rejects(key)) throw new DOMException('Quota full', 'QuotaExceededError');
        setItem.call(this, key, value);
      });
      confirmRestore();
      spy.mockRestore();
      expect(screen.getByRole('status')).toHaveTextContent(/could not restore/i);
      expect(raw(firstKey)).toBe(current);
      expect(raw(pointKey(firstKey))).toBe(old);
      expect(raw(replayKey)).toBeNull();
      expect(backupKeysOf(NRL_SAVE_SLOTS[0], localStorage)).toHaveLength(0);
    }
  });

  it('reports the recovery cap and never changes another slot or its write fence', () => {
    const old = createNrlCareer('storm', 4);
    const current = bytes(advance(old));
    put(firstKey, current);
    put(pointKey(firstKey), bytes(old));
    put(secondKey, bytes(createNrlCareer('bears', 2, 2027)));
    const other = raw(secondKey);
    const stale = createSaveFence(localStorage);
    stale.adopt(firstKey);
    for (let day = 1; day <= 3; day++) put(firstKey + BROKEN_SAVE_MARK + '2026-11-0' + day + 'T00-00-00', 'slot one ' + day);
    const otherBackup = secondKey + BROKEN_SAVE_MARK + '2026-11-01T00-00-00';
    put(otherBackup, 'slot two backup');
    open();
    startRestore();
    expect(slot(1).getByText(/three.*recovery copies|3.*recovery copies/i)).toBeVisible();
    confirmRestore();
    expect(raw(firstKey)).toBe(bytes(old));
    expect(raw(pointKey(firstKey))).toBe(bytes(old));
    const backups = backupKeysOf(NRL_SAVE_SLOTS[0], localStorage);
    expect(backups).toHaveLength(3);
    expect(backups.some(key => raw(key) === current)).toBe(true);
    expect(backups.some(key => raw(key) === 'slot one 1')).toBe(false);
    expect(raw(secondKey)).toBe(other);
    expect(raw(otherBackup)).toBe('slot two backup');
    expect(raw(fenceKeyOf(secondKey))).toBeNull();
    expect(stale.write(firstKey, () => true)).toBe('moved');
  });

  it('shows a damaged checkpoint or a checkpoint for a different career without restoring it', () => {
    const active = bytes(createNrlCareer('storm', 10));
    put(firstKey, active);
    put(pointKey(firstKey), '{"broken":true}');
    open();
    expect(slot(1).getByText('Unreadable checkpoint')).toBeVisible();
    expect(slot(1).queryByRole('button', { name: 'Restore checkpoint' })).not.toBeInTheDocument();
    put(pointKey(firstKey), bytes(createNrlCareer('storm', 11)));
    fireEvent.focus(window);
    expect(slot(1).getByText('Checkpoint belongs to another career.')).toBeVisible();
    expect(slot(1).queryByRole('button', { name: 'Restore checkpoint' })).not.toBeInTheDocument();
    expect(raw(firstKey)).toBe(active);
  });

  it('keeps the first credit, suppresses repeated restored finishes, and credits a new season or career', async () => {
    const initial = beforeGrandFinal(createNrlCareer('storm', 4));
    put(firstKey, bytes(initial));
    let view = open();
    selectCheckpoint();
    click('Resume slot 1');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(1));
    for (let attempt = 0; attempt < 2; attempt++) {
      click('Career saves');
      startRestore();
      confirmRestore();
      click('Resume slot 1');
      finishDisplayed(view);
      expect(recordCompletion).toHaveBeenCalledTimes(1);
    }
    const ended = readNrlCareerSave(raw(firstKey))!;
    expect(ended.season.phase).toBe('complete');
    const next = reduceNrlCareer(ended, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(next.season.clubId).toBe('bears');
    const nextFinal = beforeGrandFinal(next);
    view.unmount();
    put(firstKey, bytes(nextFinal));
    view = open('');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(2));

    view.unmount();
    view = open();
    startRestore();
    confirmRestore();
    click('Resume slot 1');
    finishDisplayed(view);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    view.unmount();
    put(firstKey, bytes(nextFinal));
    view = open('');
    finishDisplayed(view);
    expect(recordCompletion).toHaveBeenCalledTimes(2);

    view.unmount();
    const fresh = beforeGrandFinal(createNrlCareer('storm', 1));
    expect(fresh.season.seed).not.toBe(initial.season.seed);
    put(firstKey, bytes(fresh));
    view = open('');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(3));
  });
});

describe('NRL automatic season checkpoint', () => {
  it('backs up a season checkpoint before deletion, rolls back a refused delete, and reuses one backup on retry', () => {
    const review = closedSeason(createNrlCareer('storm', 620));
    const checkpoint = ' ' + bytes(review);
    const active = bytes(reduceNrlCareer(review, { type: 'startNextSeason' }));
    const key = seasonPointKey(secondKey);
    const manual = bytes(review);
    put(secondKey, active);
    put(key, checkpoint);
    put(fenceKeyOf(secondKey), '7');
    put(pointKey(secondKey), manual);
    put(firstKey, bytes(createNrlCareer('bears', 19, 2027)));
    const peer = raw(firstKey);
    open('?slot=2&view=saves');
    const set = Storage.prototype.setItem;
    const remove = Storage.prototype.removeItem;
    let blocked = 'archive';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (blocked === 'archive' && name.startsWith(secondKey + BROKEN_SAVE_MARK)) throw new DOMException('Fixture quota', 'QuotaExceededError');
      set.call(this, name, value);
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, name) {
      if (blocked === 'delete' && name === secondKey) throw new Error('Fixture refused active deletion');
      remove.call(this, name);
    });
    for (const failure of ['archive', 'delete']) {
      blocked = failure;
      slotClick(2, 'Delete slot 2');
      click('Delete career');
      expect(raw(secondKey) === active).toBe(true);
      expect(raw(key) === checkpoint).toBe(true);
      expect(raw(fenceKeyOf(secondKey))).toBe('7');
    }
    blocked = '';
    slotClick(2, 'Delete slot 2');
    click('Delete career');
    const copies = backupKeysOf(NRL_SAVE_SLOTS[1], localStorage);
    expect(copies).toHaveLength(1);
    expect(raw(copies[0]) === checkpoint).toBe(true);
    expect(raw(secondKey)).toBeNull();
    expect(raw(key)).toBeNull();
    expect(raw(pointKey(secondKey)) === manual).toBe(true);
    expect(raw(firstKey) === peer).toBe(true);
  });

  it('preserves a replaced automatic checkpoint while the deletion confirmation is open', () => {
    const review = closedSeason(createNrlCareer('storm', 620));
    const active = bytes(reduceNrlCareer(review, { type: 'startNextSeason' }));
    const key = seasonPointKey(secondKey);
    const newer = ' ' + bytes(review);
    put(secondKey, active);
    put(key, bytes(review));
    open('?slot=2&view=saves');
    slotClick(2, 'Delete slot 2');
    put(key, newer);
    click('Delete career');
    expect(raw(secondKey) === active).toBe(true);
    expect(raw(key) === newer).toBe(true);
    expect(backupKeysOf(NRL_SAVE_SLOTS[1], localStorage)).toEqual([]);
  });

  it('archives a valid checkpoint from a displaced lineage before storing the new career’s first', () => {
    const old = closedSeason(createNrlCareer('storm', 620));
    const own = closedSeason(createNrlCareer('storm', 621));
    const key = seasonPointKey(secondKey);
    put(secondKey, bytes(own));
    put(key, bytes(old));
    open('?slot=2');
    keepPlaying(2026);
    expect(raw(key) === bytes(own)).toBe(true);
    const [held] = backupKeysOf(NRL_SAVE_SLOTS[1], localStorage);
    expect(raw(held) === bytes(old)).toBe(true);
  });

  it('keeps a newer generation and active save written just after an automatic restore lands', () => {
    const review = closedSeason(createNrlCareer('storm', 620));
    const active = bytes(reduceNrlCareer(review, { type: 'startNextSeason' }));
    const checkpoint = bytes(review);
    const newer = ' ' + active;
    const generation = fenceKeyOf(secondKey);
    put(secondKey, active);
    put(seasonPointKey(secondKey), checkpoint);
    put(generation, '7');
    open('?slot=2&view=saves');
    slotClick(2, 'Restore season checkpoint');
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      set.call(this, name, value);
      if (name === secondKey) {
        set.call(this, name, newer);
        set.call(this, generation, '9');
      }
    });
    confirmRestore();
    expect(raw(secondKey) === newer).toBe(true);
    expect(raw(generation)).toBe('9');
    expect(raw(seasonPointKey(secondKey)) === checkpoint).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('This slot changed in another tab.');
  });

  it('suppresses replay credit for a completed active year when the previous season point is restored', () => {
    const previous = closedSeason(createNrlCareer('storm', 620));
    const final = beforeGrandFinal(reduceNrlCareer(previous, { type: 'startNextSeason' }));
    const active = advance(final);
    const settled = bytes(active);
    expect(readNrlCareerSave(settled)?.season).toMatchObject({ phase: 'complete', year: 2027 });
    expect(readNrlCareerSave(bytes({ ...active, history: previous.history }))).toBeNull();
    put(secondKey, settled);
    put(seasonPointKey(secondKey), bytes(previous));
    const chooser = open('?slot=2&view=saves');
    slotClick(2, 'Restore season checkpoint');
    confirmRestore();
    chooser.unmount();
    put(secondKey, bytes(final));
    const view = open('?slot=2');
    finishDisplayed(view);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('waits at season completion and does not add credit when a finished checkpoint is restored', async () => {
    put(firstKey, bytes(beforeGrandFinal(createNrlCareer('storm', 620))));
    let view = open('');
    finishDisplayed(view);
    const first = raw(firstKey)!;
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(1));
    expect(raw(seasonPointKey(firstKey))).toBeNull();
    keepPlaying(2026);
    expect(raw(seasonPointKey(firstKey)) === first).toBe(true);
    const next = readNrlCareerSave(raw(firstKey))!;
    const beforeSecondFinal = bytes(beforeGrandFinal(next));
    view.unmount();

    put(firstKey, beforeSecondFinal);
    view = open('');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(2));
    click('Career saves');
    slotClick(1, 'Restore season checkpoint');
    confirmRestore();
    click('Resume slot 1');
    expect(raw(firstKey) === first).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    view.unmount();

    put(firstKey, beforeSecondFinal);
    view = open('');
    finishDisplayed(view);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
  });

  it('does not checkpoint a same-year caretaker move', () => {
    let career = createNrlCareer('storm', 3, 2026, true);
    career = reduceNrlCareer(career, { type: 'signSponsor', year: 2026, clubId: 'storm', offer: 'twoSeason' });
    while (career.season.round < 14) career = advance(career);
    put(secondKey, bytes(career));
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    open('?slot=2');
    click('Club office');
    fireEvent.click(screen.getByRole('button', { name: /Review .*Dragons job/ }));
    click('Accept caretaker job');
    expect(readNrlCareerSave(raw(secondKey))?.season).toMatchObject({ clubId: 'dragons', round: 14, year: 2026 });
    expect(raw(seasonPointKey(secondKey))).toBeNull();
    expect(spy.mock.calls.some(([key]) => key === seasonPointKey(secondKey))).toBe(false);
  });

  it('keeps a newer checkpoint already held by the same slot during a replayed year', () => {
    const before = closedSeason(createNrlCareer('storm', 620));
    const later = closedSeason(reduceNrlCareer(before, { type: 'startNextSeason' }));
    const laterRaw = bytes(later);
    put(secondKey, bytes(before));
    put(seasonPointKey(secondKey), laterRaw);
    open('?slot=2');
    keepPlaying(2026);
    expect(readNrlCareerSave(raw(secondKey))?.season.year).toBe(2027);
    expect(raw(seasonPointKey(secondKey)) === laterRaw).toBe(true);
  });

  it('keeps the exact last season on a new job after a year out', () => {
    const season = closedSeason(createNrlCareer('storm', 620));
    const left = reduceNrlCareer(season, { type: 'leaveClub', year: 2026, clubId: 'storm' });
    const rested = reduceNrlCareer(left, { type: 'simulateSeasonOut', year: 2026, clubId: 'storm' });
    expect(rested.satOutSeason).toBe(true);
    const before = bytes(rested);
    put(secondKey, before);
    open('?slot=2');
    expect(raw(seasonPointKey(secondKey))).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /^Take job at/ })[0]);
    expect(readNrlCareerSave(raw(secondKey))?.season.year).toBe(2028);
    expect(raw(seasonPointKey(secondKey)) === before).toBe(true);
  });

  it('rejects a changed season checkpoint after confirmation was opened', () => {
    const closed = closedSeason(createNrlCareer('storm', 620));
    const active = bytes(reduceNrlCareer(closed, { type: 'startNextSeason' }));
    const other = ' ' + bytes(closed);
    const key = seasonPointKey(secondKey);
    put(secondKey, active);
    put(key, bytes(closed));
    open('?slot=2&view=saves');
    slotClick(2, 'Restore season checkpoint');
    put(key, other);
    confirmRestore();
    expect(raw(secondKey) === active).toBe(true);
    expect(raw(key) === other).toBe(true);
    expect(backupKeysOf(NRL_SAVE_SLOTS[1], localStorage)).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('This slot changed in another tab.');
  });


  it('keeps the exact 12-season imported review after rollover and restores it beside a manual point', () => {
    const start = createNrlCareer('storm', 620);
    const opening: NrlCareerState = {
      ...start, importedFromFile: true,
      season: { ...start.season, domesticScoringModel: NRL_DOMESTIC_SCORING_MODEL, halftimeInjuryCover: true },
      originClubCalendar: true, originClubRecovery: true,
    };
    let season = closedSeason(opening);
    for (let count = 1; count < 12; count++) season = closedSeason(reduceNrlCareer(season, { type: 'startNextSeason' }));
    expect(season.history).toHaveLength(12);
    expect(season.season.results).toHaveLength(237);
    const before = ' \r\n' + bytes(season) + '\n';
    const peer = bytes(createNrlSeason('storm', 17));
    const manual = bytes(opening);
    put(firstKey, peer);
    put(fenceKeyOf(firstKey), '4');
    put(secondKey, before);
    put(fenceKeyOf(secondKey), '9');
    put(pointKey(secondKey), manual);
    open('?slot=2');
    click('Review this season');
    expect(raw(seasonPointKey(secondKey))).toBeNull();
    click('Start 2038');
    const forward = raw(secondKey)!;
    expect(readNrlCareerSave(forward)?.season.year).toBe(2038);
    expect(readNrlCareerSave(forward)?.importedFromFile).toBe(true);
    expect(raw(seasonPointKey(secondKey)) === before).toBe(true);
    expect(raw(pointKey(secondKey)) === manual).toBe(true);
    expect(raw(fenceKeyOf(secondKey))).toBe('10');
    expect(raw(firstKey)).toBe(peer);
    expect(raw(fenceKeyOf(firstKey))).toBe('4');

    click('Career saves');
    slotClick(2, 'Restore season checkpoint');
    click('Restore saved checkpoint');
    expect(raw(secondKey) === before).toBe(true);
    expect(raw(seasonPointKey(secondKey)) === before).toBe(true);
    expect(raw(pointKey(secondKey)) === manual).toBe(true);
    expect(backupKeysOf(NRL_SAVE_SLOTS[1], localStorage).some(key => raw(key) === forward)).toBe(true);
    click('Resume slot 2');
    expect(button('Review this season')).toBeVisible();
    expect(readNrlCareerSave(raw(secondKey))?.importedFromFile).toBe(true);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('waits for a successful primary save, then retries from the old committed review', () => {
    const before = bytes(closedSeason(createNrlCareer('storm', 620)));
    put(secondKey, before);
    put(fenceKeyOf(secondKey), '5');
    open('?slot=2');
    const set = Storage.prototype.setItem;
    let refuseActive = true;
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === secondKey && refuseActive) throw new DOMException('Fixture quota', 'QuotaExceededError');
      set.call(this, key, value);
    });
    keepPlaying(2026);
    expect(raw(secondKey) === before).toBe(true);
    expect(raw(fenceKeyOf(secondKey))).toBe('5');
    expect(writes.mock.calls.some(([key]) => key === seasonPointKey(secondKey))).toBe(false);
    refuseActive = false;
    click('Retry save');
    expect(raw(seasonPointKey(secondKey)) === before).toBe(true);
    expect(readNrlCareerSave(raw(secondKey))?.season.year).toBe(2027);
    expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
  });

  it.each(['quota', 'fence quota', 'fence', 'peer checkpoint', 'false active receipt'] as const)(
    'keeps main progress and the earlier checkpoint when optional checkpoint ownership fails through %s',
    fault => {
      const old = closedSeason(createNrlCareer('storm', 620));
      const before = closedSeason(reduceNrlCareer(old, { type: 'startNextSeason' }));
      const previous = bytes(old);
      const current = bytes(before);
      const key = seasonPointKey(secondKey);
      const manual = bytes(createNrlCareer('storm', 620));
      put(secondKey, current);
      put(fenceKeyOf(secondKey), '5');
      put(key, previous);
      put(pointKey(secondKey), manual);
      open('?slot=2');
      const set = Storage.prototype.setItem;
      const get = Storage.prototype.getItem;
      let refuseRead = false;
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, address) {
        if (fault === 'false active receipt' && refuseRead && address === secondKey) {
          refuseRead = false;
          return current;
        }
        return get.call(this, address);
      });
      const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, address, value) {
        if (fault === 'quota' && address === key) throw new DOMException('Fixture quota', 'QuotaExceededError');
        if (fault === 'fence quota' && address === fenceKeyOf(secondKey)) throw new DOMException('Fixture quota', 'QuotaExceededError');
        set.call(this, address, value);
        if (address === secondKey) {
          refuseRead = true;
          if (fault === 'fence') set.call(this, fenceKeyOf(secondKey), '7');
          if (fault === 'peer checkpoint') set.call(this, key, current);
        }
      });
      keepPlaying(2027);
      expect(raw(key) === (fault === 'peer checkpoint' ? current : previous)).toBe(true);
      expect(writes.mock.calls.filter(([address]) => address === key)).toHaveLength(fault === 'quota' ? 1 : 0);
      expect(raw(pointKey(secondKey)) === manual).toBe(true);
      if (fault === 'false active receipt') expect(refuseRead).toBe(false);
      expect(readNrlCareerSave(get.call(localStorage, secondKey))?.season.year).toBe(2028);
      expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
    },
  );

  it('captures a complete v1 source on a change of club and preserves the checked migration copy', () => {
    let legacy = createNrlSeason('storm', 620);
    for (let round = 0; round < 45 && legacy.phase !== 'complete'; round++) legacy = reduceNrlSeason(legacy, { type: 'advance' });
    expect(legacy.phase).toBe('complete');
    const before = '\n' + bytes(legacy) + ' ';
    put(firstKey, before);
    open('');
    click('Review this season');
    fireEvent.change(screen.getByLabelText('Club to manage'), { target: { value: 'bears' } });
    const move = screen.getByRole('button', { name: /Start 2027 with/ });
    fireEvent.click(move);
    expect(readNrlCareerSave(raw(firstKey))?.season).toMatchObject({ year: 2027, clubId: 'bears' });
    expect(raw(seasonPointKey(firstKey)) === before).toBe(true);
    expect(backupKeysOf(NRL_SAVE_SLOTS[0], localStorage).some(key => raw(key) === before)).toBe(true);
    click('Career saves');
    slotClick(1, 'Delete slot 1');
    click('Delete career');
    expect(raw(firstKey)).toBeNull();
    expect(raw(seasonPointKey(firstKey))).toBeNull();
    const copies = backupKeysOf(NRL_SAVE_SLOTS[0], localStorage);
    expect(copies).toHaveLength(1);
    expect(raw(copies[0]) === before).toBe(true);
    expect(slot(1).getByRole('button', { name: 'Import into slot 1' })).toBeVisible();
  });
});
