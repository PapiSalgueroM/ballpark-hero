import { Component, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Save Tester',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') return (ok: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  return {
    supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) } },
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <p data-testid="share-score">{score}</p> }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import fs from 'node:fs';
import * as E from '@/lib/soccerCareerEngine';
import { revealBallonDorResult } from '@/lib/soccerAwardReveal';
import { revealAfter } from '@/components/club-manager/Celebration';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { recordCompletion } from '@/lib/completions';
import { careerStep } from '../../scripts/lib/careerStep.mjs';
import SoccerCareer from '@/pages/SoccerCareer';

type Saved = Record<string, any>;
const KEY = 'soccerCareerSave', OTHER = 'award-generation-unrelated-save';
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const actualRandom = Math.random;
const observed: Saved[] = [];
let fixtures: { legacy: Saved; generated: Saved; pending: Saved; legacyPending: Saved }, draws: Saved[];
let activeObservation: Saved | null;
const frameworkSetup: Saved = { id: 'react-async-act-setup', draws: [], storageBefore: {}, storageAfter: {} };
function modelCall(id: string, value: Saved, action: (input: E.CareerState) => E.CareerState) {
  const input = copy(value), modelDraws: Saved[] = [], pageRandom = Math.random;
  Math.random = () => { modelDraws.push({ value: .52, stack: new Error().stack }); return .52; };
  try { return { id, input: copy(input), inputAfter: input, output: copy(action(input as E.CareerState)), draws: modelDraws }; }
  finally { Math.random = pageRandom; }
}
const malformed = ['null', 'unknown-version', 'missing-entries', 'empty-entries', 'fraction-year', 'future-year', 'string-year', 'wrong-next-id', 'noncontiguous-id', 'invalid-role', 'negative-slot', 'over-slot', 'fraction-seed', 'future-first-year', 'young-entry-age', 'old-entry-age', 'empty-name', 'empty-nationality', 'empty-club', 'invalid-position', 'wrong-tuple', 'huge-tuple', 'string-tuple', 'short-tuple', 'wrong-retirement-year', 'duplicate-name', 'duplicate-active-slot'];
function corrupt(value: Saved, id: string): Saved {
  const s = copy(value), p = s.generatedBallonPool, e = p.entries[0];
  switch (id) {
    case 'null': s.generatedBallonPool = null; break;
    case 'unknown-version': p.version = 2; break;
    case 'missing-entries': delete p.entries; break;
    case 'empty-entries': p.entries = []; p.nextId = 0; break;
    case 'fraction-year': p.year += .5; break;
    case 'future-year': p.year = s.seasons.at(-1).year + 1; break;
    case 'string-year': p.year = String(p.year); break;
    case 'wrong-next-id': p.nextId++; break;
    case 'noncontiguous-id': e.id = 100; break;
    case 'invalid-role': e.role = 'other'; break;
    case 'negative-slot': e.slot = -1; break;
    case 'over-slot': e.slot = 20; break;
    case 'fraction-seed': e.seed += .5; break;
    case 'future-first-year': e.firstYear = p.year + 1; break;
    case 'young-entry-age': e.entryAge = 18; break;
    case 'old-entry-age': e.entryAge = 29; break;
    case 'empty-name': e.name = ' '; break;
    case 'empty-nationality': e.nationality = ' '; break;
    case 'empty-club': e.club = ' '; break;
    case 'invalid-position': e.position = 'GK'; break;
    case 'wrong-tuple': e.baseGoals[0]++; break;
    case 'huge-tuple': e.baseGoals = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]; break;
    case 'string-tuple': e.baseGoals = ['18', '40']; break;
    case 'short-tuple': e.baseGoals = [18]; break;
    case 'wrong-retirement-year': e.retiredYear = e.firstYear; break;
    case 'duplicate-name': p.entries[1].name = e.name; break;
    case 'duplicate-active-slot': p.entries[1].role = e.role; p.entries[1].slot = e.slot; break;
    default: throw new Error(`Unknown declared invalid case ${id}`);
  }
  return s;
}
/* Ordinary test discovery also derives its input through actual callbacks. The
   dedicated method provides full naturally captured inputs and provenance. */
function deriveFixtures() {
  let seed = 1; Math.random = () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const st = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
  const legacy = copy(E.initCareer('Generation Save Tester', 'England', 'ST', '2025', st, 70, 2025, E.FALLBACK_CLUBS, null, 88));
  /* Round 1318: on today's engine a 2025 start can reach a night before 2028,
     the first year that draws a generated rival, so the first night is no
     longer always the pooled one. The walk now plays on (the passive player of
     scripts/lib/careerStep.mjs) to the first night whose pool presence is the
     one wanted. */
  const early = (startYear: number, wantPool: boolean) => {
  let s = E.initCareer('Generation Save Tester', 'England', 'ST', startYear === 2010 ? '2010-14' : '2025', st, 70, startYear, E.FALLBACK_CLUBS, null, 88);
  for (let i = 0; i < 400 && !(s.phase === 'ballon_dor' && s.pendingBallonDor && !!s.generatedBallonPool === wantPool); i++) {
    if (s.retired) break;
    s = careerStep(E, s, E.FALLBACK_CLUBS);
  }
  if (!s.pendingBallonDor || s.phase !== 'ballon_dor') throw new Error('Genuine pending fixture missing');
  return copy(s);
  };
  const pending = early(2025, true), legacyPending = early(2010, false);
  if (!pending.generatedBallonPool || legacyPending.generatedBallonPool) throw new Error('Genuine generated and legacy boundary fixtures missing');
  return { legacy, generated: copy(pending), pending, legacyPending };
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
async function open(raw: string) {
  localStorage.setItem(KEY, raw); localStorage.setItem(OTHER, 'whole unrelated bytes');
  const writes = vi.spyOn(Storage.prototype, 'setItem'), removes = vi.spyOn(Storage.prototype, 'removeItem');
  const view = render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
  await act(async () => { await Promise.resolve(); });
  return { view, writes, removes };
}
beforeAll(async () => {
  frameworkSetup.storageBefore = Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));
  const setupRandom = Math.random;
  Math.random = () => { frameworkSetup.draws.push({ value: .52, stack: new Error().stack }); return .52; };
  try { await act(async () => { await Promise.resolve(); }); }
  finally { Math.random = setupRandom; }
  frameworkSetup.storageAfter = Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));
  expect(frameworkSetup.draws).toHaveLength(1);
  expect(frameworkSetup.draws[0].value).toBe(.52);
  expect(frameworkSetup.draws[0].stack).toContain('at enqueueTask ');
  expect(frameworkSetup.draws[0].stack).toContain('/node_modules/react/cjs/react.development.js:2458:45');
  expect(frameworkSetup.storageAfter).toEqual(frameworkSetup.storageBefore);
  const file = process.env.SOCCER_AWARD_GENERATIONS_FIXTURES;
  fixtures = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : deriveFixtures();
  for (const value of [fixtures.legacy, fixtures.generated, fixtures.pending, fixtures.legacyPending]) expect(isSoccerCareerSave(value)).toBe(true);
  expect(fixtures.legacy.generatedBallonPool).toBeUndefined();
  expect(fixtures.generated.generatedBallonPool.entries.length).toBeGreaterThanOrEqual(3);
});
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); draws = []; activeObservation = null; vi.useFakeTimers();
  Math.random = () => { draws.push({ value: .52, stack: new Error().stack }); return .52; };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = () => undefined;
});
afterEach(() => {
  if (activeObservation) {
    activeObservation.finalRaw = localStorage.getItem(KEY); activeObservation.finalDraws = copy(draws);
    activeObservation.finalDOM = document.body.innerHTML; observed.push(activeObservation);
  }
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Math.random = actualRandom;
});
afterAll(() => {
  const file = process.env.SOCCER_AWARD_COMPONENT_OBSERVER;
  if (file) {
    fs.writeFileSync(file, JSON.stringify(observed));
    fs.writeFileSync(file.replace(/\.json$/, '-framework-setup.json'), JSON.stringify(frameworkSetup));
  }
});

describe('Soccer Career generated-candidate save boundaries', () => {
  for (const kind of ['legacy', 'generated', 'pending', 'legacyPending'] as const) it(`holds complete ${kind} pool and old pending ballot over actual page reload`, async () => {
    const value = copy(fixtures[kind]), raw = JSON.stringify(value), start = draws.length;
    const row: Saved = activeObservation = { id: kind, invalid: false, input: value, rawBefore: raw, callbacks: [], frameworkSetup: copy(frameworkSetup) };
    const expectedLoad = modelCall('repairCareer-load', value, E.repairCareer);
    row.expectedLoad = expectedLoad;
    expect(value.primeType).toBeTruthy(); expect(expectedLoad.draws).toEqual([]);
    expect(isSoccerCareerSave(value)).toBe(true); expect(draws).toHaveLength(start);
    const first = await open(raw);
    expect(first.view.queryByText('TEST: route crashed')).toBeNull(); expect(first.view.queryByRole('alert')).toBeNull();
    const rawAfter = localStorage.getItem(KEY)!, loaded = JSON.parse(rawAfter);
    row.rawAfter = rawAfter; row.actualLoadDraws = copy(draws.slice(start));
    expect(loaded).toEqual(expectedLoad.output); expect(draws).toHaveLength(start);
    expect(loaded.generatedBallonPool).toEqual(value.generatedBallonPool); expect(loaded.pendingBallonDor).toEqual(value.pendingBallonDor);
    expect(loaded.seasons).toEqual(value.seasons); expect(loaded.awards).toEqual(value.awards);
    const firstWrites = copy(first.writes.mock.calls), firstRemoves = copy(first.removes.mock.calls), firstDraws = copy(draws), firstDOM = first.view.container.innerHTML;
    cleanup(); first.writes.mockRestore(); first.removes.mockRestore();
    const second = await open(rawAfter), rawAfterReload = localStorage.getItem(KEY)!, reloaded = JSON.parse(rawAfterReload);
    const expectedReload = modelCall('repairCareer-reload', loaded, E.repairCareer);
    Object.assign(row, { rawAfterReload, expectedReload, firstWrites, firstRemoves, secondWrites: copy(second.writes.mock.calls), secondRemoves: copy(second.removes.mock.calls), firstDraws, allDraws: copy(draws), firstDOM, secondDOM: second.view.container.innerHTML });
    expect(reloaded).toEqual(expectedReload.output); expect(rawAfterReload).toBe(rawAfter); expect(expectedReload.draws).toEqual([]); expect(draws).toHaveLength(start);
    expect(second.view.queryByText('TEST: route crashed')).toBeNull(); expect(second.view.queryByRole('alert')).toBeNull();
    expect(reloaded.generatedBallonPool).toEqual(value.generatedBallonPool); expect(reloaded.pendingBallonDor).toEqual(value.pendingBallonDor);
    expect(reloaded.seasons).toEqual(value.seasons); expect(reloaded.awards).toEqual(value.awards);
    expect(localStorage.getItem(OTHER)).toBe('whole unrelated bytes'); expect(recordCompletion).not.toHaveBeenCalled();
    if (reloaded.phase === 'ballon_dor' && reloaded.pendingBallonDor) {
      const revealStart = draws.length, expectedReveal = modelCall('revealBallonDorResult', reloaded, revealBallonDorResult);
      const revealMs = Math.ceil((revealAfter(reloaded.pendingBallonDor.nominees.length, .75) + .24) * 1000);
      await act(async () => { vi.advanceTimersByTime(revealMs + 1); await Promise.resolve(); });
      let rawAction = localStorage.getItem(KEY)!, actual = JSON.parse(rawAction);
      row.callbacks.push({ id: 'reveal', expected: expectedReveal, rawBefore: rawAfterReload, rawAfter: rawAction, actual, draws: copy(draws.slice(revealStart)), writes: copy(second.writes.mock.calls), removes: copy(second.removes.mock.calls), dom: second.view.container.innerHTML, revealMs });
      expect(actual).toEqual(expectedReveal.output); expect(draws.slice(revealStart).map(d => d.value)).toEqual(expectedReveal.draws.map(d => d.value));
      expect(actual.generatedBallonPool).toEqual(value.generatedBallonPool); expect(actual.seasons).toEqual(value.seasons);
      const ceremony = second.view.container.querySelector(`[data-award-night="${E.SOCCER_BALLON_DOR.award.id}"]`);
      expect(ceremony).not.toBeNull(); expect(ceremony!.getAttribute('data-award-result')).toBe('revealed');
      if (E.bdorSpeechOpen(actual as E.CareerState)) {
        const speechStart = draws.length, beforeSpeech = rawAction, expectedSpeech = modelCall('giveBdorSpeech-tears', actual, input => E.giveBdorSpeech(input, 'tears'));
        const option = E.SOCCER_BDOR_SPEECHES.find(o => o.id === 'tears')!;
        const button = [...ceremony!.querySelectorAll('button')].find(b => b.textContent?.includes(option.label)); expect(button).toBeDefined();
        await act(async () => { fireEvent.click(button!); await Promise.resolve(); });
        rawAction = localStorage.getItem(KEY)!; actual = JSON.parse(rawAction);
        row.callbacks.push({ id: 'speech', expected: expectedSpeech, rawBefore: beforeSpeech, rawAfter: rawAction, actual, draws: copy(draws.slice(speechStart)), writes: copy(second.writes.mock.calls), removes: copy(second.removes.mock.calls), dom: second.view.container.innerHTML });
        expect(actual).toEqual(expectedSpeech.output); expect(draws.slice(speechStart).map(d => d.value)).toEqual(expectedSpeech.draws.map(d => d.value));
      }
      const dismissStart = draws.length, beforeDismiss = rawAction, expectedDismiss = modelCall('dismissBallonDor', actual, input => E.dismissBallonDor(input, E.FALLBACK_CLUBS));
      const currentCeremony = second.view.container.querySelector(`[data-award-night="${E.SOCCER_BALLON_DOR.award.id}"]`)!;
      const continueButton = [...currentCeremony.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Continue →'); expect(continueButton).toBeDefined();
      await act(async () => { fireEvent.click(continueButton!); await Promise.resolve(); });
      const rawDismissed = localStorage.getItem(KEY)!, dismissed = JSON.parse(rawDismissed);
      row.callbacks.push({ id: 'dismiss', expected: expectedDismiss, rawBefore: beforeDismiss, rawAfter: rawDismissed, actual: dismissed, draws: copy(draws.slice(dismissStart)), writes: copy(second.writes.mock.calls), removes: copy(second.removes.mock.calls), dom: second.view.container.innerHTML });
      expect(dismissed).toEqual(expectedDismiss.output); expect(draws.slice(dismissStart).map(d => d.value)).toEqual(expectedDismiss.draws.map(d => d.value));
      expect(dismissed.generatedBallonPool).toEqual(value.generatedBallonPool); expect(dismissed.seasons).toEqual(value.seasons); expect(dismissed.pendingBallonDor).toBeNull();
      expect(localStorage.getItem(OTHER)).toBe('whole unrelated bytes'); expect(recordCompletion).not.toHaveBeenCalled();
    }
    if (kind === 'legacy') {
      cleanup(); second.writes.mockRestore(); second.removes.mockRestore();
      const oldPrime = copy(value); delete oldPrime.primeType;
      const migrationStart = draws.length, migrationRaw = JSON.stringify(oldPrime), expectedMigration = modelCall('existing-primeType-migration', oldPrime, E.repairCareer);
      expect(expectedMigration.draws).toHaveLength(1);
      const migratedPage = await open(migrationRaw), rawMigrated = localStorage.getItem(KEY)!, migrated = JSON.parse(rawMigrated);
      row.primeMigration = { qualification: 'Existing absent-primeType migration draws once. It does not generate a candidate.', input: oldPrime, rawBefore: migrationRaw, rawAfter: rawMigrated, expected: expectedMigration, actual: migrated, draws: copy(draws.slice(migrationStart)), writes: copy(migratedPage.writes.mock.calls), removes: copy(migratedPage.removes.mock.calls), dom: migratedPage.view.container.innerHTML };
      expect(migrated).toEqual(expectedMigration.output); expect(draws.slice(migrationStart).map(d => d.value)).toEqual(expectedMigration.draws.map(d => d.value));
      expect(migrated.generatedBallonPool).toBeUndefined(); expect(migrated.pendingBallonDor).toEqual(value.pendingBallonDor);
      cleanup(); migratedPage.writes.mockRestore(); migratedPage.removes.mockRestore();
      const migrationReloadStart = draws.length, migratedReload = await open(rawMigrated), rawMigrationReload = localStorage.getItem(KEY)!;
      row.primeMigration.reload = { rawBefore: rawMigrated, rawAfter: rawMigrationReload, draws: copy(draws.slice(migrationReloadStart)), writes: copy(migratedReload.writes.mock.calls), removes: copy(migratedReload.removes.mock.calls), dom: migratedReload.view.container.innerHTML };
      expect(rawMigrationReload).toBe(rawMigrated); expect(draws).toHaveLength(migrationReloadStart);
    }
  });
  /* Round 1318, ruling C3 of Release AW: a present pool that cannot be verified
     is read as ABSENT. The save opens as the career it is (no broken save card),
     the reader refuses the pool, nothing draws on the way in or on a reload, and
     a reload writes nothing new. That the next night then writes a fresh pool
     with the draws of a save that never had one is
     src/test/soccerBallonPoolReadAsAbsent.test.tsx. `invalid` still marks the
     declared malformed rows for simSoccerAwardGenerations. */
  it.each(malformed)('reads a present %s pool as absent and opens the career over actual reload', async id => {
    const value = corrupt(fixtures.generated, id), raw = JSON.stringify(value), beforeValidation = draws.length;
    const row: Saved = activeObservation = { id, invalid: true, input: value, rawBefore: raw, frameworkSetup: copy(frameworkSetup) };
    expect(isSoccerCareerSave(value)).toBe(true); expect(E.isGeneratedBallonPool(value.generatedBallonPool, value.seasons.at(-1).year)).toBe(false);
    expect(draws).toHaveLength(beforeValidation);
    const expectedLoad = modelCall('repairCareer-load', value, E.repairCareer);
    row.expectedLoad = expectedLoad; expect(expectedLoad.draws).toEqual([]);
    const first = await open(raw);
    row.actualLoadDraws = copy(draws.slice(beforeValidation)); expect(draws).toHaveLength(beforeValidation);
    expect(first.view.queryByText('TEST: route crashed')).toBeNull(); expect(first.view.queryByRole('alert')).toBeNull();
    const rawAfter = localStorage.getItem(KEY)!; expect(JSON.parse(rawAfter)).toEqual(expectedLoad.output);
    const firstWrites = copy(first.writes.mock.calls), firstRemoves = copy(first.removes.mock.calls), firstDOM = first.view.container.innerHTML;
    cleanup(); first.writes.mockRestore(); first.removes.mockRestore();
    const second = await open(rawAfter), rawAfterReload = localStorage.getItem(KEY);
    expect(draws).toHaveLength(beforeValidation);
    expect(second.view.queryByText('TEST: route crashed')).toBeNull(); expect(second.view.queryByRole('alert')).toBeNull();
    expect(rawAfterReload).toBe(rawAfter);
    expect(localStorage.getItem(OTHER)).toBe('whole unrelated bytes'); expect(recordCompletion).not.toHaveBeenCalled();
    Object.assign(row, { rawAfter, rawAfterReload, firstWrites, firstRemoves, secondWrites: copy(second.writes.mock.calls), secondRemoves: copy(second.removes.mock.calls), allDraws: copy(draws), firstDOM, secondDOM: second.view.container.innerHTML });
  });
});
