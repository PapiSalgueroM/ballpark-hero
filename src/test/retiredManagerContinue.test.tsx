import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueRow } from '@/components/home/ContinueRow';
import { CONTINUE_SAVES, describeSave, type ContinueSave, type SavePath } from '@/data/continueSaves';
import { HOME_STAGE } from '@/data/homeFront';
import { startCareer, type CareerState } from '@/lib/clubManager';
import { retireCareer } from '@/lib/clubManagerRetire';

const CASE_TITLES = Object.freeze({
  targetMidSeason: 'target: an actual mid-season retirement says retired in metadata and the mounted Continue row',
  targetOutOfWork: 'target: an actual out-of-work retirement takes precedence over sacked in metadata and the mounted Continue row',
  preserveLegacy: 'preserve: legacy active and sacked Club Manager saves keep their existing labels',
  preserveInvalid: 'preserve: invalid Club Manager retirement markers keep the legacy fallback',
  preserveOtherGames: 'preserve: all other 20 games ignore an object retirement marker and keep strict boolean endings',
  preserveCorruptOwn: 'preserve: corrupt saves and inherited fields stay unusable without changing storage',
});
type CaseKey = keyof typeof CASE_TITLES;
const caseKeys = Object.freeze(Object.keys(CASE_TITLES) as CaseKey[]);
const cases = Object.fromEntries(caseKeys.map(key => [key, null])) as Record<CaseKey, unknown>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const managerEntry = () => CONTINUE_SAVES.find(entry => entry.path === '/club-manager')!;
const stored = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => storage.key(index)!)
  .sort().map(key => [key, storage.getItem(key)]));
const storage = () => ({ local: stored(localStorage), session: stored(sessionStorage) });

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('retired-manager-continue-unrelated', '{"keep":"unchanged"}');
  sessionStorage.setItem('retired-manager-continue-session', 'opaque session bytes');
});
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });
afterAll(() => {
  const out = process.env.RETIRED_MANAGER_CONTINUE_RAW;
  if (!out) return;
  if (!isAbsolute(out)) throw new Error('RETIRED_MANAGER_CONTINUE_RAW must be absolute');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ version: 1, caseKeys, caseTitles: CASE_TITLES, cases }, null, 2) + '\n', { flag: 'wx' });
});

function observe(entry: ContinueSave, raw: string | null) {
  const storageBefore = storage(), descriptorBefore = copy(entry);
  let line: string | null = null, error: string | null = null;
  try { line = describeSave(entry, raw); } catch (caught) { error = String(caught); }
  return { raw, line, error, descriptorBefore, descriptorAfter: copy(entry), storageBefore, storageAfter: storage() };
}
function held(observation: ReturnType<typeof observe>) {
  expect(observation.error).toBeNull();
  expect(observation.descriptorAfter).toEqual(observation.descriptorBefore);
  expect(observation.storageAfter).toEqual(observation.storageBefore);
}

async function target(key: 'targetMidSeason' | 'targetOutOfWork', sacked: boolean) {
  const entry = managerEntry();
  let seed = 1392;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  // The actual academy producer puts Date.now() in generated youth IDs.
  const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
  let input: CareerState, retired: CareerState | null, inputBefore: string, inputAfter: string;
  try {
    input = startCareer('Everton', 'now');
    if (sacked) input.sacked = true;
    inputBefore = JSON.stringify(input);
    retired = retireCareer(input);
    inputAfter = JSON.stringify(input);
  } finally { clock.mockRestore(); random.mockRestore(); }
  const raw = JSON.stringify(retired);
  localStorage.setItem(entry.saveKey, raw);
  const metadata = observe(entry, raw);
  const storageBeforeRender = storage();
  const view = render(<MemoryRouter><ContinueRow /></MemoryRouter>);
  await act(async () => {});
  const cards = [...view.container.querySelectorAll<HTMLAnchorElement>('a[data-continue-card]')].map(card => ({
    path: card.getAttribute('data-continue-card'), href: card.getAttribute('href'),
    line: card.querySelector('[data-continue-line]')?.textContent ?? null, text: card.textContent, html: card.outerHTML,
  }));
  const evidence = {
    setup: { club: 'Everton', era: 'now', seed: 1392, generatedIdClock: 0, sacked },
    inputBefore, inputAfter, raw, retiredAfterRender: JSON.stringify(retired),
    retirement: copy(retired?.retired ?? null), retainedSacked: retired?.sacked ?? null,
    metadata, stageDescriptor: copy(HOME_STAGE.find(row => row.path === entry.path) ?? null),
    storageBeforeRender, storageAfterRender: storage(), cards,
    dom: { document: document.documentElement.outerHTML, container: view.container.outerHTML },
    expected: { line: `${input!.clubName}, retired`, when: sacked ? 'outOfWork' : 'midSeason' },
  };
  cases[key] = evidence;
  expect(metadata.line, 'The actual retirement object must replace the legacy season or sacked label').toBe(evidence.expected.line);
  expect(cards.map(card => [card.path, card.href, card.line])).toEqual([[entry.path, entry.path, evidence.expected.line]]);
  expect(retired?.retired?.when).toBe(evidence.expected.when);
  expect(retired?.sacked).toBe(sacked);
  expect(inputAfter).toBe(inputBefore);
  expect(evidence.retiredAfterRender).toBe(raw);
  expect(evidence.storageAfterRender).toEqual(storageBeforeRender);
  held(metadata);
}

function plant(root: Record<string, unknown>, at: SavePath, value: unknown) {
  let current: Record<string, unknown> = root;
  at.forEach((step, index) => {
    if (index === at.length - 1) { current[step] = value; return; }
    current[step] ??= /^\d+$/.test(at[index + 1]) ? [] : {};
    current = current[step] as Record<string, unknown>;
  });
}

describe('retired Club Manager continuation', { timeout: 60000 }, () => {
  it(CASE_TITLES.targetMidSeason, async () => { await target('targetMidSeason', false); });
  it(CASE_TITLES.targetOutOfWork, async () => { await target('targetOutOfWork', true); });

  it(CASE_TITLES.preserveLegacy, () => {
    const entry = managerEntry();
    const observations = [false, true].map(sacked => ({
      sacked, expected: `Fixture FC, ${sacked ? 'sacked' : 'season 3'}`,
      observation: observe(entry, JSON.stringify({ clubName: 'Fixture FC', season: 3, sacked })),
    }));
    cases.preserveLegacy = observations;
    for (const row of observations) { expect(row.observation.line).toBe(row.expected); held(row.observation); }
  });

  it(CASE_TITLES.preserveInvalid, () => {
    const entry = managerEntry();
    const invalid = [undefined, null, [], [{}], true, false, 0, 1, 'retired', 'true'];
    const observations = [false, true].flatMap(sacked => invalid.map((retired, index) => ({
      sacked, invalidIndex: index, expected: `Fixture FC, ${sacked ? 'sacked' : 'season 3'}`,
      observation: observe(entry, JSON.stringify({ clubName: 'Fixture FC', season: 3, sacked, retired })),
    })));
    cases.preserveInvalid = observations;
    for (const row of observations) { expect(row.observation.line).toBe(row.expected); held(row.observation); }
  });

  it(CASE_TITLES.preserveOtherGames, () => {
    const observations = CONTINUE_SAVES.filter(entry => entry.path !== '/club-manager').map(entry => {
      const input: Record<string, unknown> = {};
      if (entry.name) plant(input, entry.name, 'Fixture Name');
      if (entry.count) plant(input, entry.count.at, 3);
      if (entry.ended) plant(input, entry.ended.at, false);
      const plain = observe(entry, JSON.stringify(input));
      const objectMarker = observe(entry, JSON.stringify({ ...input, retired: { when: 'midSeason' } }));
      const nullMarker = observe(entry, JSON.stringify({ ...input, retired: null }));
      const ending = entry.ended ? [true, 'true', {}, [], 1].map(value => {
        const changed = copy(input); plant(changed, entry.ended!.at, value);
        return { value, observation: observe(entry, JSON.stringify(changed)) };
      }) : [];
      return { path: entry.path, plain, objectMarker, nullMarker, ending,
        expectedEnded: entry.ended ? `${entry.name ? 'Fixture Name, ' : ''}${entry.ended.say}` : null };
    });
    cases.preserveOtherGames = observations;
    expect(observations).toHaveLength(20);
    for (const row of observations) {
      expect(row.objectMarker.line).toBe(row.plain.line);
      expect(row.nullMarker.line).toBe(row.plain.line);
      [row.plain, row.objectMarker, row.nullMarker].forEach(held);
      for (const ending of row.ending) {
        expect(ending.observation.line).toBe(ending.value === true ? row.expectedEnded : row.plain.line);
        held(ending.observation);
      }
    }
  });

  it(CASE_TITLES.preserveCorruptOwn, () => {
    const entry = managerEntry();
    const unusable = [null, 'not json{', '[]', 'null', '42', '"text"', '{}',
      '{"__proto__":{"clubName":"Inherited FC","season":3,"sacked":true,"retired":{}}}'];
    const observations = unusable.map(raw => observe(entry, raw));
    const named = observe(entry, '{"clubName":"Fixture FC","season":3,"__proto__":{"sacked":true,"retired":{}}}');
    const oldRetired = Object.getOwnPropertyDescriptor(Object.prototype, 'retired');
    const oldSacked = Object.getOwnPropertyDescriptor(Object.prototype, 'sacked');
    let inherited: ReturnType<typeof observe>;
    try {
      Object.defineProperty(Object.prototype, 'retired', { configurable: true, value: {} });
      Object.defineProperty(Object.prototype, 'sacked', { configurable: true, value: true });
      inherited = observe(entry, '{"clubName":"Fixture FC","season":3}');
    } finally {
      if (oldRetired) Object.defineProperty(Object.prototype, 'retired', oldRetired); else Reflect.deleteProperty(Object.prototype, 'retired');
      if (oldSacked) Object.defineProperty(Object.prototype, 'sacked', oldSacked); else Reflect.deleteProperty(Object.prototype, 'sacked');
    }
    cases.preserveCorruptOwn = { unusable: observations, named, inherited: inherited!,
      prototypeRestored: { retired: Object.getOwnPropertyDescriptor(Object.prototype, 'retired') ?? null,
        sacked: Object.getOwnPropertyDescriptor(Object.prototype, 'sacked') ?? null } };
    for (const row of observations) { expect(row.line).toBeNull(); held(row); }
    expect(named.line).toBe('Fixture FC, season 3'); held(named);
    expect(inherited!.line).toBe('Fixture FC, season 3'); held(inherited!);
    expect(Object.getOwnPropertyDescriptor(Object.prototype, 'retired')).toEqual(oldRetired);
    expect(Object.getOwnPropertyDescriptor(Object.prototype, 'sacked')).toEqual(oldSacked);
  });
});
