import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SoccerCareerSlots from '@/components/soccer-career/SoccerCareerSlots';
import { FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import { parseSoccerCareerSave, serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from '@/lib/soccerCareerSave';
import { readSoccerCareerSavedAt } from '@/lib/soccerCareerSaveReceipt';

const SLOTS = [
  { path: '/soccer-career', saveKey: 'soccerCareerSave' },
  { path: '/soccer-career?slot=2', saveKey: 'soccerCareerSave-slot-2' },
  { path: '/soccer-career?slot=3', saveKey: 'soccerCareerSave-slot-3' },
];
const attrs = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
const fileContents = (raw: string, version = 1) => JSON.stringify({ format: 'douknowball-soccer-career', version, save: raw });

function chooseFile(slot: number, file: File) {
  fireEvent.change(screen.getByLabelText(`Choose a save file for slot ${slot}`), { target: { files: [file] } });
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

function showSlots(backPath = '/soccer-career') {
  return render(<MemoryRouter>
    <SoccerCareerSlots slots={SLOTS} backPath={backPath} />
  </MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Soccer Career save chooser', () => {
  it('reads packed careers by player and links each slot to its own route without writing', () => {
    const career = initCareer('Fixture Forward', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS);
    const longCareer = { ...career, legacyFixtureData: 'older saved fields'.repeat(4_000) };
    const packed = serializeSoccerCareerSave(longCareer);
    expect(JSON.parse(packed).seasons.format).toBe('lz-string-utf16-career');
    localStorage.setItem(SLOTS[0].saveKey, packed);
    localStorage.setItem(SLOTS[2].saveKey, '{unreadable');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');

    showSlots(SLOTS[0].path);

    expect(screen.getByRole('heading', { name: 'Career saves' })).toBeVisible();
    expect(screen.getByText('Fixture Forward')).toBeVisible();
    expect(screen.getByText(`${career.currentClub} · Age 16`)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Resume slot 1' })).toHaveAttribute('href', SLOTS[0].path);
    expect(screen.getByRole('link', { name: 'New career in slot 2' })).toHaveAttribute('href', SLOTS[1].path);
    expect(screen.getByRole('link', { name: 'Review slot 3' })).toHaveAttribute('href', SLOTS[2].path);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', SLOTS[0].path);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('keeps a blocked slot distinct from an empty one and refreshes a changed key', () => {
    const read = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key === SLOTS[0].saveKey) throw new Error('blocked read');
      return read.call(this, key);
    });
    showSlots(SLOTS[2].path);

    expect(screen.getByText('Storage unavailable')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'New career in slot 1' })).toBeNull();
    expect(screen.getByRole('link', { name: 'New career in slot 2' })).toHaveAttribute('href', SLOTS[1].path);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', SLOTS[2].path);

    localStorage.setItem(SLOTS[1].saveKey, '{unreadable');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SLOTS[1].saveKey })); });
    expect(screen.getByRole('link', { name: 'Review slot 2' })).toHaveAttribute('href', SLOTS[1].path);
  });

  it.each([
    { version: 0, format: 'lz-string-utf16' },
    { version: SOCCER_CAREER_SAVE_VERSION, format: 'lz-string-utf16-career' },
  ] as const)('keeps ten seasons and marks a file import for save version $version', async ({ version, format }) => {
    const career = initCareer('Fixture Álvaro', 'Spain', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS);
    const seasons = Array.from({ length: 10 }, (_, index) => ({
      ...career.seasons[0], year: 2020 + index, age: 16 + index, goals: index, leagueTitle: index === 9,
      legacyHistory: 'Archived fixture record.'.repeat(350),
    }));
    const saved = { ...career, seasons, weeklyWage: 13700, contractYearsLeft: 3, netWorth: 389000,
      legacyFixtureData: 'Older history preserved in the save.'.repeat(version === 0 ? 1 : 2_000) };
    const raw = serializeSoccerCareerSave(saved, version);
    const sourceWire = JSON.parse(raw);
    expect(sourceWire.seasons.format).toBe(format);
    expect(sourceWire.saveVersion ?? 0).toBe(version);
    localStorage.setItem(SLOTS[0].saveKey, raw);
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:career-test');
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = vi.fn();
    });
    const downloaded: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded.push(this.download);
    });
    const view = showSlots();

    fireEvent.click(screen.getByRole('button', { name: 'Download save for slot 1' }));
    expect(downloaded).toEqual(['soccer-career-slot-1.json']);
    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blobText(blob)).toBe(fileContents(raw));
    expect(localStorage.getItem(SLOTS[0].saveKey)).toBe(raw);

    chooseFile(2, new File([blob], downloaded[0]));
    expect(await screen.findByText('Career imported into slot 2.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Resume slot 2' })).toHaveAttribute('href', SLOTS[1].path);
    expect(screen.getByRole('link', { name: 'Resume slot 2' })).toHaveFocus();
    expect(localStorage.getItem(SLOTS[0].saveKey)).toBe(raw);
    const imported = localStorage.getItem(SLOTS[1].saveKey) ?? '';
    expect(JSON.parse(imported)).toHaveProperty('importedFromFile', true);
    expect(JSON.parse(imported)).toStrictEqual({ ...sourceWire, importedFromFile: true });
    const sourceCareer = parseSoccerCareerSave(raw) as Record<string, unknown>;
    expect(parseSoccerCareerSave(imported)).toStrictEqual({ ...sourceCareer, importedFromFile: true });
    const importedAt = readSoccerCareerSavedAt(localStorage, SLOTS[1].saveKey, imported);
    expect(importedAt).not.toBeNull();
    expect(view.container.querySelector('time')).toHaveAttribute('datetime', importedAt);
  });

  it.each([
    ['malformed', '{broken', 'Choose a readable Soccer Career save file.'],
    ['other game', JSON.stringify({ format: 'other-game', version: 1, save: '{}' }), 'Choose a readable Soccer Career save file.'],
    ['unsupported version', fileContents('{}', 2), 'This save file needs a newer version of Soccer Career.'],
    ['unplayable payload', fileContents('{}'), 'Choose a readable Soccer Career save file.'],
  ])('rejects a %s file before writing to storage', async (_label, text, message) => {
    const write = vi.spyOn(Storage.prototype, 'setItem');
    showSlots();
    chooseFile(2, new File([text], 'save.json'));

    expect(await screen.findByText(message)).toBeVisible();
    expect(localStorage.getItem(SLOTS[1].saveKey)).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });

  it('refuses a future career schema inside a supported file', async () => {
    const career = initCareer('Future Fixture', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS);
    const raw = JSON.stringify({ ...career, saveVersion: SOCCER_CAREER_SAVE_VERSION + 1 });
    showSlots();

    chooseFile(2, new File([fileContents(raw)], 'save.json'));
    expect(await screen.findByText('This save file needs a newer version of Soccer Career.')).toBeVisible();
    expect(localStorage.getItem(SLOTS[1].saveKey)).toBeNull();
  });

  it('rejects an oversized file before asking the browser to read it', async () => {
    const file = new File(['{}'], 'save.json');
    Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 + 1 });
    const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
    showSlots();

    chooseFile(2, file);
    expect(await screen.findByText('This save file is too large.')).toBeVisible();
    expect(read).not.toHaveBeenCalled();
    expect(localStorage.getItem(SLOTS[1].saveKey)).toBeNull();
  });

  it('commits nothing if the chooser is closed before a file finishes reading', async () => {
    const raw = serializeSoccerCareerSave(initCareer('Late Fixture', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS));
    const readers: FileReader[] = [];
    vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: FileReader) { readers.push(this); });
    const view = showSlots();

    chooseFile(2, new File([fileContents(raw)], 'save.json'));
    expect(screen.getByText('Reading save file...')).toBeVisible();
    view.unmount();
    expect(readers).toHaveLength(1);

    await act(async () => {
      Object.defineProperty(readers[0], 'result', { value: new TextEncoder().encode(fileContents(raw)).buffer });
      readers[0].dispatchEvent(new ProgressEvent('load'));
    });
    expect(localStorage.getItem(SLOTS[1].saveKey)).toBeNull();
  });

  it('refuses a competing write that fills the slot during import', async () => {
    const incoming = serializeSoccerCareerSave(initCareer('Incoming Fixture', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS));
    const existing = serializeSoccerCareerSave(initCareer('Competing Fixture', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS));
    const competingKey = SLOTS[1].saveKey;
    const write = Storage.prototype.setItem;
    let filled = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === `dukb-fence:${competingKey}` && !filled) {
        filled = true;
        write.call(this, competingKey, existing);
      }
      write.call(this, key, value);
    });
    showSlots();

    chooseFile(2, new File([fileContents(incoming)], 'save.json'));
    expect(await screen.findByText('This slot already holds a save. Choose an empty slot.')).toBeVisible();
    expect(filled).toBe(true);
    expect(localStorage.getItem(competingKey)).toBe(existing);
    expect(screen.queryByRole('button', { name: 'Import save to slot 2' })).toBeNull();
  });

  it.each(['throws', 'silently refuses'])('keeps the file recoverable when storage %s the write', async kind => {
    const raw = serializeSoccerCareerSave(initCareer('Stored Fixture', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS));
    localStorage.setItem(SLOTS[0].saveKey, raw);
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SLOTS[1].saveKey) {
        if (kind === 'throws') throw new DOMException('Storage is full', 'QuotaExceededError');
        return;
      }
      write.call(this, key, value);
    });
    showSlots();

    chooseFile(2, new File([fileContents(raw)], 'save.json'));
    expect(await screen.findByText('Could not save this career in this browser. Keep the file and try again.')).toBeVisible();
    expect(localStorage.getItem(SLOTS[0].saveKey)).toBe(raw);
    expect(localStorage.getItem(SLOTS[1].saveKey)).toBeNull();
    expect(screen.getByRole('button', { name: 'Import save to slot 2' })).toBeEnabled();
  });
});
