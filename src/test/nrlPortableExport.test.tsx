import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NrlCareerSlots from '@/components/nrl-manager/NrlCareerSlots';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_DOMESTIC_SCORING_MODEL } from '@/lib/nrlManager';
import { NRL_SAVE_SLOTS, nrlCheckpointKey } from '@/lib/nrlSaveSlots';
import { fenceKeyOf } from '@/lib/saveFence';

const [first, second, third] = NRL_SAVE_SLOTS.map(slot => slot.saveKey);
const open = () => render(<NrlCareerSlots onOpen={vi.fn()} onBack={vi.fn()} />);
const download = (slot: number) => screen.getByRole('button', { name: 'Download slot ' + slot });
const readBlob = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(file);
});

function captureDownload() {
  const href = 'blob:http://localhost/nrl-career';
  const create = vi.fn<(blob: Blob) => string>(() => href);
  class DownloadURL extends URL {
    static createObjectURL = create;
    static revokeObjectURL = vi.fn();
  }
  vi.stubGlobal('URL', DownloadURL);
  const anchors: { href: string; download: string }[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    anchors.push({ href: this.href, download: this.download });
  });
  return { create, anchors, href };
}

function completedCareer() {
  const started = createNrlCareer('storm', 620);
  let career: NrlCareerState = {
    ...started, season: { ...started.season, domesticScoringModel: NRL_DOMESTIC_SCORING_MODEL, halftimeInjuryCover: true as const },
    originClubCalendar: true as const, originClubRecovery: true as const,
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
  vi.unstubAllGlobals();
});

describe('NRL career downloads', () => {
  it('ships the exact current slot bytes with all 12 completed seasons and no storage writes', async () => {
    const long = completedCareer();
    const old = JSON.stringify(createNrlCareer('storm', 620));
    const newer = ' \r\n' + JSON.stringify({ ...long, savedNote: 'Māori 🏉' }) + '\n ';
    const peer = JSON.stringify(createNrlCareer('bears', 19, 2027));
    localStorage.setItem(first, peer);
    localStorage.setItem(second, old);
    localStorage.setItem(nrlCheckpointKey(second), old);
    localStorage.setItem(fenceKeyOf(second), '4');
    const { anchors, href, create } = captureDownload();
    open();

    // The active slot can advance before its storage/focus update reaches this chooser.
    localStorage.setItem(second, newer);
    localStorage.setItem(fenceKeyOf(second), '5');
    const storage = Object.entries(localStorage);
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Fixture quota', 'QuotaExceededError');
    });
    const removes = vi.spyOn(Storage.prototype, 'removeItem');
    const clears = vi.spyOn(Storage.prototype, 'clear');
    fireEvent.click(download(2));

    expect(anchors).toEqual([{ href, download: 'nrl-team-manager-slot-2.json' }]);
    expect(create).toHaveBeenCalledTimes(1);
    const file = create.mock.calls[0][0];
    expect(file.type).toBe('application/json');
    const contents = JSON.parse(await readBlob(file));
    expect(contents).toEqual({ format: 'douknowball-nrl-team-manager', version: 1, save: newer });
    const revived = readNrlCareerSave(contents.save);
    expect(revived?.history).toEqual(long.history);
    expect(revived?.history).toHaveLength(12);
    expect(revived?.season).toEqual(long.season);
    expect(Object.entries(localStorage)).toEqual(storage);
    expect(writes).not.toHaveBeenCalled();
    expect(removes).not.toHaveBeenCalled();
    expect(clears).not.toHaveBeenCalled();
  });

  it('offers the download for original v1 bytes and omits unreadable and empty slots', async () => {
    const legacy = ' ' + JSON.stringify(createNrlSeason('storm', 17)) + '\n';
    localStorage.setItem(first, legacy);
    localStorage.setItem(second, JSON.stringify({ ...createNrlCareer('bears', 19, 2027), version: 3 }));
    open();
    const { create } = captureDownload();
    expect(screen.queryByRole('button', { name: 'Download slot 2' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download slot 3' })).toBeNull();
    fireEvent.click(download(1));
    expect(JSON.parse(await readBlob(create.mock.calls[0][0])).save).toBe(legacy);
    expect(localStorage.getItem(first)).toBe(legacy);
  });

  it.each([
    ['empty', null],
    ['corrupt', 'bad JSON'],
    ['from a future version', JSON.stringify({ ...createNrlCareer('storm', 620), version: 3 })],
  ])(
    'refuses a stale button when the slot is now %s',
    (_label, replacement) => {
      const valid = JSON.stringify(createNrlCareer('storm', 620));
      localStorage.setItem(third, valid);
      const { create, anchors } = captureDownload();
      open();
      if (replacement === null) localStorage.removeItem(third);
      else localStorage.setItem(third, replacement);

      fireEvent.click(download(3));

      expect(screen.getByRole('status')).toHaveTextContent('A readable career could not be downloaded from this slot.');
      expect(create).not.toHaveBeenCalled();
      expect(anchors).toEqual([]);
      expect(localStorage.getItem(third)).toBe(replacement);
      expect(screen.queryByRole('button', { name: 'Download slot 3' })).toBeNull();
    },
  );
});
