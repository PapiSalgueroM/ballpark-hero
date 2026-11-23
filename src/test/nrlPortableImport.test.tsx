import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NrlCareerSlots from '@/components/nrl-manager/NrlCareerSlots';
import { createNrlCareer, NRL_SAVE_MAX_CHARS, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_DOMESTIC_SCORING_MODEL } from '@/lib/nrlManager';
import { NRL_SAVE_SLOTS, nrlCheckpointKey, nrlSeasonCanCredit, writeNrlSaveSlot } from '@/lib/nrlSaveSlots';
import { fenceKeyOf } from '@/lib/saveFence';
import { backupKeysOf } from '@/lib/brokenSaveRecovery';

const [first, second, third] = NRL_SAVE_SLOTS.map(slot => slot.saveKey);
const secondCheckpoint = nrlCheckpointKey(second);
const secondFence = fenceKeyOf(second);
const ordinary = () => createNrlCareer('storm', 620);
const neighboring = () => JSON.stringify(createNrlCareer('bears', 19, 2027));
const slotAction = (slot: number) => screen.getByRole('button', { name: new RegExp('^Import into slot ' + slot + '$') });
const confirm = () => screen.getByRole('button', { name: /^Import career$/ });
const bytes = (raw: string, format = 'douknowball-nrl-team-manager', version = 1) => new File(
  [JSON.stringify({ format, version, save: raw })], 'nrl-team-manager-save.json', { type: 'application/json' },
);

function open() {
  const onOpen = vi.fn();
  render(<NrlCareerSlots onOpen={onOpen} onBack={vi.fn()} />);
  return onOpen;
}

function choose(file: File, slot = 2) {
  fireEvent.click(slotAction(slot));
  const picker = screen.getByLabelText('NRL career file');
  fireEvent.change(picker, { target: { files: [file] } });
}

async function stage(file: File, slot = 2) {
  choose(file, slot);
  await screen.findByRole('button', { name: /^Import career$/ });
}

function storage() {
  return Object.fromEntries(Object.entries(localStorage));
}

function twelveSeasons() {
  const started = ordinary();
  let career: NrlCareerState = {
    ...started, season: { ...started.season, domesticScoringModel: NRL_DOMESTIC_SCORING_MODEL, halftimeInjuryCover: true },
    originClubCalendar: true, originClubRecovery: true,
  };
  for (let year = 2026; year <= 2037; year += 1) {
    for (let round = 0; round < 45 && career.season.phase !== 'complete'; round += 1) {
      career = reduceNrlCareer(career, { type: 'advance' });
    }
    expect(career.season.phase).toBe('complete');
    expect(career.season.year).toBe(year);
    if (year < 2037) career = reduceNrlCareer(career, { type: 'startNextSeason' });
  }
  return career;
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NRL career file import', () => {
  it('previews and only imports an exact 12-season career into the chosen empty slot as local play', async () => {
    const career = twelveSeasons();
    const source = { ...career, savedNote: 'Māori 🏉' };
    const raw = ' \n' + JSON.stringify(source) + '\r\n ';
    const peer = neighboring();
    localStorage.setItem(first, peer);
    localStorage.setItem(third, JSON.stringify(ordinary()));
    localStorage.setItem(nrlCheckpointKey(first), peer);
    localStorage.setItem(secondFence, '6');
    const opened = open();
    const before = storage();
    await stage(bytes(raw));
    expect(storage()).toEqual(before);
    expect(screen.getByRole('heading', { name: 'Import career into slot 2' })).toBeVisible();
    expect(screen.getByText(/Imported careers are for local play/)).toBeVisible();
    fireEvent.click(confirm());

    expect(screen.getByRole('status')).toHaveTextContent('Career imported into slot 2.');
    expect(opened).not.toHaveBeenCalled();
    expect(localStorage.getItem(secondFence)).toBe('7');
    const imported = localStorage.getItem(second)!;
    // The imported marker is the only difference from the file's original save document.
    expect(JSON.parse(imported)).toEqual({ ...source, importedFromFile: true });
    const revived = readNrlCareerSave(imported)!;
    expect(revived.history).toHaveLength(12);
    expect(revived.season.results).toEqual(career.season.results);
    expect(revived.season.results.length).toBeGreaterThan(200);
    expect(nrlSeasonCanCredit(revived, null)).toBe(false);
    const next = reduceNrlCareer(revived, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2038);
    expect(readNrlCareerSave(JSON.stringify(next))?.importedFromFile).toBe(true);
    expect(nrlSeasonCanCredit(next, null)).toBe(false);
    expect(nrlSeasonCanCredit(career, null)).toBe(true);
    const untouched = storage();
    delete untouched[second];
    untouched[secondFence] = before[secondFence];
    expect(untouched).toEqual(before);
  });

  it('opens an original v1 file and preserves its local-play marker through checked migration', async () => {
    const legacy = createNrlSeason('storm', 17);
    const raw = '\n' + JSON.stringify(legacy) + ' ';
    open();
    await stage(bytes(raw));
    fireEvent.click(confirm());
    const disk = localStorage.getItem(second)!;
    expect(JSON.parse(disk)).toEqual({ ...legacy, importedFromFile: true });
    const loaded = readNrlCareerSave(disk)!;
    expect(loaded.importedFromFile).toBe(true);
    expect(nrlSeasonCanCredit(loaded, null)).toBe(false);
    const changed = reduceNrlCareer(loaded, { type: 'advance' });
    expect(changed).not.toBe(loaded);
    const next = JSON.stringify(changed);
    expect(writeNrlSaveSlot(second, disk, next)).toBe('written');
    expect(readNrlCareerSave(localStorage.getItem(second))?.importedFromFile).toBe(true);
    const [saved] = backupKeysOf(NRL_SAVE_SLOTS[1], localStorage);
    expect(localStorage.getItem(saved)).toBe(disk);
  });

  it('retries a storage refusal with the same reviewed file and preserves the old fence', async () => {
    localStorage.setItem(secondFence, '3');
    open();
    const before = storage();
    const raw = JSON.stringify(ordinary());
    await stage(bytes(raw));
    const original = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === second && blocked) throw new DOMException('Fixture quota', 'QuotaExceededError');
      original.call(this, key, value);
    });
    fireEvent.click(confirm());
    expect(storage()).toEqual(before);
    expect(screen.getByRole('status')).toHaveTextContent('The browser could not save this career. Try again.');
    expect(confirm()).toBeEnabled();
    blocked = false;
    fireEvent.click(confirm());
    expect(screen.getByRole('status')).toHaveTextContent('Career imported into slot 2.');
    expect(localStorage.getItem(secondFence)).toBe('4');
    expect(JSON.parse(localStorage.getItem(second)!)).toEqual({ ...JSON.parse(raw), importedFromFile: true });
  });

  it.each(['career', 'checkpoint', 'season checkpoint', 'fence'] as const)('keeps a %s written by a racing tab after review', async kind => {
    localStorage.setItem(secondFence, '3');
    localStorage.setItem(third, neighboring());
    open();
    await stage(bytes(JSON.stringify(ordinary())));
    const held = kind === 'career' ? second : kind === 'checkpoint' ? secondCheckpoint
      : kind === 'season checkpoint' ? 'dukb-nrl-season-checkpoint:' + second : secondFence;
    localStorage.setItem(held, kind === 'fence' ? '4' : neighboring());
    const before = storage();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(confirm());
    expect(screen.getByRole('status')).toHaveTextContent('This slot changed. Choose an empty slot to import.');
    expect(storage()).toEqual(before);
    expect(writes).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Import career$/ })).toBeNull();
  });

  it('keeps the claimed fence when a landed import cannot be read back immediately', async () => {
    localStorage.setItem(secondFence, '7');
    const peer = neighboring();
    localStorage.setItem(first, peer);
    open();
    const raw = JSON.stringify(ordinary());
    await stage(bytes(raw));
    const set = Storage.prototype.setItem;
    const get = Storage.prototype.getItem;
    let refuseRead = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, value);
      if (key === second) refuseRead = true;
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key === second && refuseRead) {
        refuseRead = false;
        return null;
      }
      return get.call(this, key);
    });
    fireEvent.click(confirm());
    expect(localStorage.getItem(secondFence)).toBe('8');
    expect(JSON.parse(localStorage.getItem(second)!)).toEqual({ ...JSON.parse(raw), importedFromFile: true });
    expect(localStorage.getItem(first)).toBe(peer);
    expect(screen.getByRole('status')).toHaveTextContent('Could not verify the import. Check the slot before trying again.');
    expect(screen.getByRole('button', { name: 'Resume slot 2' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Import career$/ })).toBeNull();
  });

  it('reports a newer confirmed save when another tab wins after the import write lands', async () => {
    localStorage.setItem(secondFence, '7');
    const peer = neighboring();
    open();
    await stage(bytes(JSON.stringify(ordinary())));
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, value);
      if (key === second) {
        set.call(this, secondFence, '9');
        set.call(this, second, peer);
      }
    });
    fireEvent.click(confirm());
    expect(localStorage.getItem(secondFence)).toBe('9');
    expect(localStorage.getItem(second)).toBe(peer);
    expect(screen.getByRole('status')).toHaveTextContent('This slot changed. Choose an empty slot to import.');
    expect(screen.queryByRole('button', { name: /^Import career$/ })).toBeNull();
  });

  it('keeps an orphan checkpoint and refuses a race during strict fence acquisition', async () => {
    localStorage.setItem(nrlCheckpointKey(first), neighboring());
    localStorage.setItem(secondFence, '8');
    open();
    expect(screen.queryByRole('button', { name: 'Import into slot 1' })).toBeNull();
    await stage(bytes(JSON.stringify(ordinary())));
    const original = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      original.call(this, key, value);
      if (key === secondFence && value === '9') {
        original.call(this, secondFence, '10');
        original.call(this, secondCheckpoint, neighboring());
      }
    });
    fireEvent.click(confirm());
    expect(localStorage.getItem(second)).toBeNull();
    expect(localStorage.getItem(secondFence)).toBe('10');
    expect(localStorage.getItem(secondCheckpoint)).toBe(neighboring());
    expect(localStorage.getItem(nrlCheckpointKey(first))).toBe(neighboring());
    expect(write.mock.calls.map(([key]) => key)).toEqual([secondFence]);
  });

  it.each([
    ['malformed file', () => new File(['{'], 'malformed.json')],
    ['wrong game', () => bytes(JSON.stringify(ordinary()), 'douknowball-club-manager')],
    ['future file', () => bytes(JSON.stringify(ordinary()), 'douknowball-nrl-team-manager', 2)],
    ['future save', () => bytes(JSON.stringify({ ...ordinary(), version: 3 }))],
    ['malformed career', () => bytes(JSON.stringify({ version: 2, season: {} }))],
    ['reader size cap', () => bytes(JSON.stringify(ordinary()).padEnd(NRL_SAVE_MAX_CHARS + 1, ' '))],
  ] as const)('refuses a %s without claiming the slot', async (_label, file) => {
    localStorage.setItem(secondFence, '5');
    open();
    const before = storage();
    choose(file());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/could not use this NRL career file/i));
    expect(screen.queryByRole('button', { name: /^Import career$/ })).toBeNull();
    expect(storage()).toEqual(before);
  });
});
