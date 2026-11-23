import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressToUTF16 } from 'lz-string';
import { engineRegistrations, loadCareer, registerLeagueOverrides, restoreEngineRegistrations, saveCareer, startCareer, startNextSeason, trimCareer } from '@/lib/clubManager';
import * as cm from '@/lib/clubManager';
import * as eras from '@/lib/clubManagerEras';
import { packCareerPairs } from '@/lib/clubManagerParkedSave';
import * as packedReader from '@/lib/clubManagerParkedSave';
import { parkedKey, pairLedgerSignature, SAVE_KEY, SLOTS_INDEX_KEY } from '@/lib/clubManagerSaveKeys';
import { switchSlot } from '@/lib/clubManagerSlots';
import { postsScore } from '@/lib/clubManagerStart';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import {
  captureClubManagerImportTarget, clubManagerDownload, importClubManagerSave, readClubManagerFile,
} from '@/lib/clubManagerPortable';
import archivedEverton from '../../scripts/data/cmBookSaveEvertonFixture.json';
import worldFixture from '../../scripts/data/cmOldCareersWorldFixture.json';

const plain = JSON.stringify(archivedEverton, null, ' ');
const historical = worldFixture.saves.mid;
const format = 'douknowball-club-manager';
const envelope = (raw: string, version = 1, game = format) => JSON.stringify({ format: game, version, save: raw });
const file = (content: BlobPart) => new File([content], 'career.json');
const ready = (raw: string) => ({ kind: 'ready', raw } as const);
const storage = () => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));
const choose = (slot: number) => {
  const r = captureClubManagerImportTarget(localStorage, slot);
  expect(r.kind).toBe('ready');
  if (r.kind !== 'ready') throw new Error('Expected an empty slot');
  return r.target;
};
const blobText = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});
const packedFile = async (raw: string) => {
  const blob = clubManagerDownload(raw);
  if (!blob) throw new Error('Expected a downloadable save');
  const result = await readClubManagerFile(file(await blobText(blob)));
  if (result.kind !== 'ready') throw new Error('Expected a readable save file');
  return result;
};
const packed = () => {
  const raw = packCareerPairs({ ...startCareer('Everton'), pairResults: { premier: { 'Everton|Fixture Away': [4, 1] } } });
  if (!raw) throw new Error('Expected a packed career');
  return raw;
};

beforeEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  restoreEngineRegistrations({ custom: null, overrides: null });
});
afterEach(() => {
  vi.restoreAllMocks();
  saveFence.release(SAVE_KEY);
  restoreEngineRegistrations({ custom: null, overrides: null });
});

describe('Club Manager portable files', () => {
  it('downloads and reads the exact archived plain and packed JSON bytes', async () => {
    for (const raw of [plain, packed()]) {
      const blob = clubManagerDownload(raw);
      expect(blob).toBeInstanceOf(Blob);
      const contents = await blobText(blob!);
      const document = JSON.parse(contents);
      expect(document).toMatchObject({ format, version: 1, save: raw });
      const result = await readClubManagerFile(file(contents));
      expect(result).toMatchObject(ready(raw));
      if (JSON.parse(raw).saveVersion === 'parked-pairs-1') expect(document.proof).toHaveProperty('pairResults');
      else expect(document).not.toHaveProperty('proof');
    }
  });

  it('rejects foreign, unsupported, damaged, oversized and invalid UTF-8 files', async () => {
    const original = JSON.parse(packed());
    const badScores = compressToUTF16('{"premier":{"Everton|Fixture Away":[-1,2]}}');
    const damaged = JSON.stringify({ ...original, pairResults: badScores, pairSignature: pairLedgerSignature(badScores) });
    const tooLarge = new File([' '.repeat(16 * 1024 * 1024 + 1)], 'career.json');
    for (const [sample, expected] of [
      [file(envelope(plain, 1, 'douknowball-soccer-career')), 'invalid'],
      [file(envelope(plain, 5)), 'unsupported'],
      [file(envelope(JSON.stringify({ ...archivedEverton, saveVersion: 999 }))), 'unsupported'],
      [file(envelope(damaged)), 'invalid'],
      [file(envelope(JSON.stringify({ ...archivedEverton, squad: [null] }))), 'invalid'],
      [file(new Uint8Array([0xC3, 0x28])), 'invalid'],
      [tooLarge, 'too-large'],
    ] as const) expect(await readClubManagerFile(sample)).toEqual({ kind: expected });
    expect(clubManagerDownload(damaged)).toBeNull();
    expect(storage()).toEqual({});
  });

  it('rejects unproved and mismatched compressed data before the decoder or engine runs', async () => {
    const raw = packed();
    const loaded = vi.spyOn(packedReader, 'restoreParkedCareer');
    const engine = vi.spyOn(cm, 'loadCareer');
    const malformed = {
      worldRoster: { version: 1, eraId: 'now', records: [], packedRecords: compressToUTF16('[1]') },
    };
    const rawWithPackedRoster = JSON.stringify({ ...archivedEverton, ...malformed });
    for (const document of [
      envelope(raw),
      JSON.stringify({ ...JSON.parse(envelope(raw)), proof: { pairResults: '{"other":{}}' } }),
      envelope(rawWithPackedRoster),
      JSON.stringify({ ...JSON.parse(envelope(rawWithPackedRoster)), proof: { worldRoster: '[2]' } }),
    ]) expect(await readClubManagerFile(file(document))).toEqual({ kind: 'invalid' });

    const current = storage();
    expect(await importClubManagerSave(localStorage, choose(1), ready(raw))).toBe('invalid');
    expect(await importClubManagerSave(localStorage, choose(1), ready(rawWithPackedRoster))).toBe('invalid');
    expect(loaded).not.toHaveBeenCalled();
    expect(engine).not.toHaveBeenCalled();
    expect(storage()).toEqual(current);
  });

  it('imports a packed save into a parked slot without rewriting either peer', async () => {
    const raw = packed();
    localStorage.setItem(SAVE_KEY, plain);
    localStorage.setItem(parkedKey(3), 'unchanged third slot');
    localStorage.setItem(fenceKeyOf(SAVE_KEY), '3');
    const before = storage();
    expect(await importClubManagerSave(localStorage, choose(2), await packedFile(raw))).toBe('imported');
    const inserted = localStorage.getItem(parkedKey(2))!;
    expect(JSON.parse(inserted)).toEqual({ ...JSON.parse(raw), importedFromFile: true });
    expect(storage()).toEqual({ ...before, [parkedKey(2)]: inserted });
  });

  it('retains the marker through engine load, trim, save, parking and the next season', async () => {
    const original = startCareer('Everton');
    expect(postsScore(original)).toBe(true);
    expect(await importClubManagerSave(localStorage, choose(1), ready(plain))).toBe('imported');
    const stored = localStorage.getItem(SAVE_KEY)!;
    expect(JSON.parse(stored)).toEqual({ ...JSON.parse(plain), importedFromFile: true });
    expect(localStorage.getItem(fenceKeyOf(SAVE_KEY))).toBe('1');
    const opened = loadCareer();
    expect(opened).not.toBeNull();
    expect(postsScore(trimCareer(opened!))).toBe(false);
    const following = startNextSeason(opened!);
    expect(following.season).toBe(opened!.season + 1);
    expect(postsScore(following)).toBe(false);
    expect(saveCareer(following)).toBe(true);
    expect(switchSlot(2)).toBe(true);
    const parked = loadCareer(localStorage.getItem(parkedKey(1))!);
    expect(parked).not.toBeNull();
    expect(postsScore(parked!)).toBe(false);
  });

  it('preloads a historical world for the real load probe and restores engine registration', async () => {
    expect(typeof historical).toBe('string');
    const preload = vi.spyOn(eras, 'ensureEraRosters');
    const current = { premier: ['Fixture Club'] };
    registerLeagueOverrides(current);
    const registered = engineRegistrations();
    expect(await importClubManagerSave(localStorage, choose(1), ready(historical))).toBe('imported');
    expect(preload).toHaveBeenCalledWith('era2015');
    expect(engineRegistrations()).toEqual(registered);
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual({ ...JSON.parse(historical), importedFromFile: true });
  });

  it('does not claim an unavailable or already occupied slot', async () => {
    expect(captureClubManagerImportTarget(localStorage, 0)).toEqual({ kind: 'failed' });
    localStorage.setItem(SLOTS_INDEX_KEY, '{"active":9}');
    expect(captureClubManagerImportTarget(localStorage, 1)).toEqual({ kind: 'failed' });
    localStorage.removeItem(SLOTS_INDEX_KEY);
    localStorage.setItem(parkedKey(1), plain);
    expect(captureClubManagerImportTarget(localStorage, 1)).toEqual({ kind: 'occupied' });
    localStorage.removeItem(parkedKey(1));
    const target = choose(1);
    localStorage.setItem(SAVE_KEY, plain);
    const before = storage();
    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe('occupied');
    expect(storage()).toEqual(before);

    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(captureClubManagerImportTarget(localStorage, 2)).toEqual({ kind: 'failed' });
    get.mockRestore();
    expect(storage()).toEqual(before);
  });

  it('rejects a slot whose active layout or save generation changed after file selection', async () => {
    const target = choose(2);
    localStorage.setItem(SLOTS_INDEX_KEY, '{"v":1,"active":2}');
    const layout = storage();
    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe('changed');
    expect(storage()).toEqual(layout);

    localStorage.removeItem(SLOTS_INDEX_KEY);
    localStorage.setItem(fenceKeyOf(SAVE_KEY), '2');
    const generation = storage();
    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe('changed');
    expect(storage()).toEqual(generation);
  });

  it('rechecks the active target after its fence write before replacing it', async () => {
    const target = choose(1);
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, value);
      if (key === fenceKeyOf(SAVE_KEY)) set.call(this, SAVE_KEY, plain);
    });
    expect(await importClubManagerSave(localStorage, target, await packedFile(packed()))).toBe('occupied');
    expect(localStorage.getItem(SAVE_KEY)).toBe(plain);
    expect(localStorage.getItem(fenceKeyOf(SAVE_KEY))).toBeNull();
  });

  it.each(['occupies', 'activates'] as const)('refuses a peer that %s the target during the last context check', async (action) => {
    localStorage.setItem(SAVE_KEY, plain);
    const target = choose(2);
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    const load = cm.loadCareer;
    let afterProbe = false;
    vi.spyOn(cm, 'loadCareer').mockImplementation(raw => {
      const state = load(raw);
      afterProbe = true;
      return state;
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const value = get.call(this, key);
      if (afterProbe && key === fenceKeyOf(SAVE_KEY)) {
        afterProbe = false;
        if (action === 'occupies') set.call(this, parkedKey(2), 'peer save');
        else set.call(this, SLOTS_INDEX_KEY, '{"v":1,"active":2}');
      }
      return value;
    });

    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe(action === 'occupies' ? 'occupied' : 'changed');
    expect(storage()).toEqual(action === 'occupies'
      ? { [SAVE_KEY]: plain, [parkedKey(2)]: 'peer save' }
      : { [SAVE_KEY]: plain, [SLOTS_INDEX_KEY]: '{"v":1,"active":2}' });
  });

  it('keeps a newer generation raised during the active claim', async () => {
    const target = choose(1);
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, key === fenceKeyOf(SAVE_KEY) ? '2' : value);
    });
    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe('changed');
    expect(storage()).toEqual({ [fenceKeyOf(SAVE_KEY)]: '2' });
  });

  it('keeps peer bytes when the destination rejects storage or read-back', async () => {
    localStorage.setItem(SAVE_KEY, plain);
    localStorage.setItem(parkedKey(3), 'third slot');
    const target = choose(2);
    const before = storage();
    const set = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === parkedKey(2)) throw new DOMException('quota', 'QuotaExceededError');
      set.call(this, key, value);
    });
    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe('failed');
    expect(storage()).toEqual(before);
    quota.mockRestore();
    const get = Storage.prototype.getItem;
    const suspect = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const value = get.call(this, key);
      return key === parkedKey(2) && value !== null ? 'unexpected readback' : value;
    });
    expect(await importClubManagerSave(localStorage, target, ready(plain))).toBe('failed');
    suspect.mockRestore();
    const { [parkedKey(2)]: attempted, ...unchanged } = storage();
    expect(unchanged).toEqual(before);
    expect(JSON.parse(attempted!)).toEqual({ ...JSON.parse(plain), importedFromFile: true });
  });

  it('cancels a pending file import before either slot or fence is written', async () => {
    localStorage.setItem(parkedKey(3), 'third slot');
    const before = storage();
    const signal = new AbortController();
    let entered!: () => void;
    let finish!: () => void;
    const preloading = new Promise<void>(resolve => { entered = resolve; });
    const stalled = new Promise<void>(resolve => { finish = resolve; });
    vi.spyOn(eras, 'ensureEraRosters').mockImplementationOnce(() => { entered(); return stalled; });
    const pending = importClubManagerSave(localStorage, choose(1), ready(historical), signal.signal);
    await preloading;
    signal.abort();
    finish();
    expect(await pending).toBe('cancelled');
    expect(storage()).toEqual(before);
  });
});
