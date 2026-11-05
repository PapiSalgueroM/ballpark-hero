import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

const moduleTape = vi.hoisted(() => {
  const original = Math.random, values: number[] = [];
  let seed = 7301;
  Math.random = () => { seed = seed * 16807 % 2147483647; const value = (seed - 1) / 2147483646; values.push(value); return value; };
  return { original, values };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/completions', async original => ({ ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Entry Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), dismiss: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') return (ok: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    }, apply() { return chain(); },
  });
  return { supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) } },
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>, SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>, SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { getEraStars } from '@/lib/careerEras';
import { worldClubOf } from '@/lib/soccerPhone';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { revealBallonDorResult } from '@/lib/soccerAwardReveal';
import PhonePanel from '@/components/soccer-career/PhonePanel';
import SoccerCareer from '@/pages/SoccerCareer';

Math.random = moduleTape.original;

const KEY = 'soccerCareerSave', OTHER = 'historical-entry-unrelated';
type Entry = { id: string; entryYear: number; entryClub: string };
type Versioned = { version: number; players: Entry[] };
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const arrival = (s: E.CareerState): Versioned | undefined => (s as E.CareerState & { historicalArrivals?: Versioned }).historicalArrivals;
const own = (s: E.CareerState) => Object.prototype.hasOwnProperty.call(s, 'historicalArrivals');
const year = (s: E.CareerState) => s.seasons[s.seasons.length - 1].year;
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
let action = 'ui', uiDraws: { action: string; value: number }[], mainDraws: { action: string; value: number }[];

const OUT = process.env.SC_FOUR_ORIGINAL_OUT;
const SPEC = process.env.SC_FOUR_ORIGINAL_SPEC;
if (!OUT || !SPEC) throw new Error('SC4 original capture requires explicit output/spec');
const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
const authorityFile = process.env.SC_FOUR_ORIGINAL_AUTHORITY;
const referenceRaw = process.env.SC_FOUR_REFERENCE_RAW;
if (!authorityFile || !referenceRaw) throw new Error('SC4 outcome requires authenticated actual original inputs');
const authorityBytes = fs.readFileSync(authorityFile);
if (createHash('sha256').update(authorityBytes).digest('hex') !== 'c49e3cb424e5db86ee61bdb45a82878ff58135b97b0b1e6b6575d9bdf32d8f0c')
  throw new Error('SC4_ORIGINAL_INPUT_AUTHORITY_SHA');
const originalAuthority = JSON.parse(authorityBytes.toString('utf8'));
const originalUiLiteral = gunzipSync(fs.readFileSync(path.join(referenceRaw, 'actual-original-ui-input.json.gz')));
if (createHash('sha256').update(originalUiLiteral).digest('hex') !== '7fef55fae16dc21b14b8b8efa1947f4c67454f7e22f304fff80b6e17fead2822')
  throw new Error('SC4_ORIGINAL_UI_LITERAL_SHA');
const originalUi = JSON.parse(originalUiLiteral.toString('utf8')).ui;
fs.mkdirSync(OUT, { recursive: true });
const sha = (v: Buffer | string) => createHash('sha256').update(v).digest('hex');
const records: { file: string; storedFile: string; bytes: number; sha256: string; storedBytes: number; storedSHA256: string; journeys: unknown[] }[] = [];
let decodedBytes = 0, storedBytes = 0, mainState = 0;
let lastJourney: unknown = null, setupFailure: string | null = null;
const originalScrollTo = window.scrollTo;
let captureNotes = 0, comparatorControlDone = false;
const maxCaptureNotes = (spec.measureSeeds.length + 8) * 5 + 1;
function captureNote(name: string, stage: string, extra: Record<string, number> = {}) {
  if (++captureNotes > maxCaptureNotes) throw new Error('SC4_CAPTURE_JOURNAL_BOUND');
  fs.appendFileSync(path.join(OUT!, '..', 'capture-progress.jsonl'), JSON.stringify({
    seq: captureNotes, name, stage, decodedBytes, storedBytes, memory: process.memoryUsage(), ...extra,
  }) + '\n');
}
function assertLiteralBytes(actual: Buffer, expected: Buffer) {
  expect(actual.length, 'SC4_LITERAL_GZIP_LENGTH').toBe(expected.length);
  expect(actual.equals(expected), 'SC4_LITERAL_GZIP_ROUNDTRIP').toBe(true);
}
function journeyCensus(value: any, pointer = ''): unknown[] {
  if (!value || typeof value !== 'object') return [];
  const found: unknown[] = [];
  if (Array.isArray(value.frames) && Array.isArray(value.mainDraws))
    found.push({ pointer, frames: value.frames.length, draws: value.mainDraws.length });
  for (const [key, child] of Object.entries(value))
    found.push(...journeyCensus(child, pointer + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1')));
  return found;
}
function retain(name: string, value: unknown) {
  captureNote(name, 'serialize');
  const bytes = Buffer.from(JSON.stringify(value));
  captureNote(name, 'serialized', { bodyBytes: bytes.length });
  const zipped = gzipSync(bytes);
  captureNote(name, 'compressed', { bodyBytes: bytes.length, bodyStoredBytes: zipped.length });
  if (decodedBytes + bytes.length > spec.limits.decodedBytes || storedBytes + zipped.length > spec.limits.storedBytes) {
    fs.writeFileSync(path.join(OUT!, 'retention-failure.json'), JSON.stringify({
      status: 'RETENTION_FAILED_NO_FULL_PROOF', name, requestedBytes: bytes.length, requestedStoredBytes: zipped.length,
      decodedBytes, storedBytes, lastJourney,
    }));
    throw new Error('SC4_FULL_CAPTURE_RETENTION_BOUND');
  }
  const restored = gunzipSync(zipped);
  assertLiteralBytes(restored, bytes);
  captureNote(name, 'roundtrip');
  if (!comparatorControlDone) {
    const copied = Buffer.from(bytes), originalSHA = sha(copied);
    copied[copied.length - 1] ^= 1;
    const changedSHA = sha(copied);
    expect(changedSHA, 'SC4_LITERAL_COMPARATOR_CONTROL_CHANGED').not.toBe(originalSHA);
    let failure: unknown;
    try { assertLiteralBytes(restored, copied); } catch (error) { failure = error; }
    expect((failure as Error)?.name, 'SC4_LITERAL_COMPARATOR_CONTROL_OWNED').toBe('AssertionError');
    expect((failure as Error)?.message, 'SC4_LITERAL_COMPARATOR_CONTROL_OWNED').toContain('SC4_LITERAL_GZIP_ROUNDTRIP');
    copied[copied.length - 1] ^= 1;
    assertLiteralBytes(restored, copied);
    expect(sha(copied), 'SC4_LITERAL_COMPARATOR_CONTROL_INVERSE').toBe(originalSHA);
    fs.writeFileSync(path.join(OUT!, '..', 'capture-comparator-control.json'), JSON.stringify({
      actualFile: name + '.json', bytes: bytes.length, originalSHA, changedSHA, restoredSHA: sha(copied),
      changed: true, ownedAssertion: 'SC4_LITERAL_GZIP_ROUNDTRIP', wholeInverse: true,
    }), { flag: 'wx' });
    comparatorControlDone = true;
    captureNote(name, 'control');
  }
  const file = name + '.json', storedFile = file + '.gz';
  if (records.some(r => r.file === file)) throw new Error('Duplicate actual RAW name ' + file);
  fs.writeFileSync(path.join(OUT!, storedFile), zipped, { flag: 'wx' });
  const row = { file, storedFile, bytes: bytes.length, sha256: sha(bytes), storedBytes: zipped.length, storedSHA256: sha(zipped), journeys: journeyCensus(value) };
  records.push(row); decodedBytes += row.bytes; storedBytes += row.storedBytes;
  captureNote(name, 'written', { bodyBytes: row.bytes, bodyStoredBytes: row.storedBytes });
  return row;
}
function record(s: E.CareerState, label: string) {
  const saved = serializeSoccerCareerSave(s), parsed = parseSoccerCareerSave(saved);
  expect(isSoccerCareerSave(parsed), 'SC_ENTRY_VALID_COMPLETE_SAVE').toBe(true);
  expect(parsed, 'SC_ENTRY_COMPLETE_CODEC').toEqual(plain(s));
  return { action: label, year: year(s), phase: s.phase, state: plain(s), saved, drawsThrough: mainDraws.length, mainRngState: mainState };
}
function seedMain(seed = 1) {
  mainState = seed; mainDraws = []; action = 'public-api';
  vi.mocked(Math.random).mockImplementation(() => {
    mainState = mainState * 16807 % 2147483647;
    const value = (mainState - 1) / 2147483646;
    mainDraws.push({ action, value }); return value;
  });
}
const mount = () => render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
async function createFromUi(era = '2005-09') {
  const init = vi.spyOn(E, 'initCareer');
  const view = mount();
  expect(view.getByText('Create Your Player')).toBeInTheDocument();
  fireEvent.change(view.getByPlaceholderText('Enter your player name...'), { target: { value: 'Entry Tester' } });
  const selects = view.container.querySelectorAll('select');
  expect(selects).toHaveLength(3);
  for (const [index, value] of ['Spain', 'CM', era].entries()) fireEvent.change(selects[index], { target: { value } });
  fireEvent.click(view.getByRole('button', { name: /Generate Starting Potential|Roll again/ }));
  act(() => { vi.advanceTimersByTime(1200); });
  expect(view.getByRole('button', { name: /Begin Career/ })).toBeEnabled();
  await act(async () => { fireEvent.click(view.getByRole('button', { name: /Begin Career/ })); });
  expect(init).toHaveBeenCalledTimes(1);
  const bytes = localStorage.getItem(KEY);
  expect(bytes, 'SC_ENTRY_UI_ACTUAL_SAVE').not.toBeNull();
  const state = parseSoccerCareerSave(bytes!);
  expect(isSoccerCareerSave(state)).toBe(true);
  const s = state as E.CareerState;
  expect(s.era).toBe(era); expect(s.phase).toBe('youth'); expect(s.age).toBe(16);
  expect(s.playerName).toBe('Entry Tester'); expect(s.nationality).toBe('Spain'); expect(s.position).toBe('CM');
  const result = { state: plain(s), bytes: bytes!, args: plain(init.mock.calls[0]), storage: storage(),
    html: view.container.innerHTML, uiDraws: plain(uiDraws) };
  cleanup(); init.mockRestore(); seedMain();
  return result;
}
function journey(start: E.CareerState, target: number) {
  let current = plain(start), actions = 0;
  const frames = [record(current, 'actual-ui-save')];
  const priorArrivalWrites: { action: string; before: unknown; after: unknown }[] = [];
  function step(label: string, fn: (s: E.CareerState) => E.CareerState) {
    expect(++actions, 'SC_ENTRY_PUBLIC_ACTION_BOUND').toBeLessThanOrEqual(300);
    action = label;
    const input = current, before = arrival(input) === undefined ? null : plain(arrival(input));
    current = fn(input);
    priorArrivalWrites.push({ action: label, before, after: arrival(input) === undefined ? null : plain(arrival(input)) });
    frames.push(record(current, label));
    lastJourney = { state: plain(current), frames, priorArrivalWrites, mainDraws: plain(mainDraws), mainRngState: mainState };
  }
  while (year(current) < target) {
    if (current.retired) break;
    switch (current.phase) {
      case 'youth': step('advanceYouthYear', s => E.advanceYouthYear(s, E.FALLBACK_CLUBS)); break;
      case 'playing': step('advanceProSeason', s => E.advanceProSeason(s, E.FALLBACK_CLUBS)); break;
      case 'newspaper': step('dismissNewspaper', E.dismissNewspaper); break;
      case 'season_summary': step('dismissSummary', s => E.dismissSummary(s, E.FALLBACK_CLUBS)); break;
      case 'international_debut': step('dismissDebut', s => E.dismissDebut(s, E.FALLBACK_CLUBS)); break;
      case 'world_cup': step('dismissWorldCup', s => E.dismissWorldCup(s, E.FALLBACK_CLUBS)); break;
      case 'ballon_dor':
        expect(current.pendingBallonDor).not.toBeNull();
        if (!current.pendingBallonDor!.revealed && !current.pendingBallonDor!.speech) step('revealBallonDorResult', revealBallonDorResult);
        else step('dismissBallonDor', s => E.dismissBallonDor(s, E.FALLBACK_CLUBS));
        break;
      case 'rivalry_event': step('dismissRivalryEvent', s => E.dismissRivalryEvent(s, E.FALLBACK_CLUBS)); break;
      case 'social_media_action': step('dismissSocialMediaPhase', s => E.dismissSocialMediaPhase(s, E.FALLBACK_CLUBS)); break;
      case 'random_events':
        expect(current.pendingEvents[0]?.choices.length).toBeGreaterThan(0);
        step('applyActualEventChoice0', s => E.applyEventChoice(s, 0, E.FALLBACK_CLUBS)); break;
      case 'moral_dilemma':
        if (current.pendingMoralDilemma) {
          const index = current.pendingMoralDilemma.choices.length - 1;
          step('applyActualLastMoralChoice', s => E.applyMoralDilemmaChoice(s, index));
        } else step('dismissMoralDilemma', s => E.dismissMoralDilemma(s, E.FALLBACK_CLUBS));
        break;
      case 'rehab_choice': step('actualFullRehabChoice1', s => E.applyRehabChoice(s, 1)); break;
      case 'red_card_appeal_result': step('dismissAppealResult', s => E.dismissAppealResult(s, E.FALLBACK_CLUBS)); break;
      case 'retirement_suggestion': step('declineRetirementSuggestion', s => E.declineRetirementSuggestion(s, E.FALLBACK_CLUBS)); break;
      case 'transfer_window': step('stayAtClub', E.stayAtClub); break;
      case 'contract_offer': {
        const offer = current.pendingOffers.find(o => o.isHomegrown) ?? current.pendingOffers[0];
        expect(offer, 'SC_ENTRY_REAL_GENERATED_OFFER').toBeDefined();
        step('acceptActualGeneratedOffer', s => E.acceptOffer(s, offer)); break;
      }
      default: throw new Error('Unsupported actual public phase: ' + current.phase);
    }
  }
  return { state: current, frames, priorArrivalWrites, reached: year(current) === target,
    mainDraws: plain(mainDraws), mainRngState: mainState };
}
function wholeLoad(s: E.CareerState) {
  const bytes = serializeSoccerCareerSave(s), parsed = parseSoccerCareerSave(bytes);
  expect(isSoccerCareerSave(parsed)).toBe(true);
  const input = plain(parsed) as E.CareerState, before = plain(input);
  const loaded = E.repairCareer(input);
  return { before, state: loaded, bytes, loadedBytes: serializeSoccerCareerSave(loaded) };
}


const expected = [
  { id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos', name: 'Neymar' },
  { id: 'soccer:mbappe', entryYear: 2015, entryClub: 'Monaco', name: 'Kylian Mbappé' },
  { id: 'soccer:haaland', entryYear: 2016, entryClub: 'Bryne', name: 'Erling Haaland' },
  { id: 'soccer:bellingham', entryYear: 2019, entryClub: 'Birmingham City', name: 'Jude Bellingham' },
];
const entries = (s: E.CareerState) => arrival(s)?.players;
const admitted = (through: number) => expected.filter(p => p.entryYear <= through)
  .map(({ id, entryYear, entryClub }) => ({ id, entryYear, entryClub }));
let ui: Awaited<ReturnType<typeof createFromUi>>, healthy: ReturnType<typeof journey>;
let seed: number, held: any, card: any, cache: any, reload: ReturnType<typeof wholeLoad>;
let attempts: { seed: number; reached: boolean; file: ReturnType<typeof retain> }[] = [];

function replay(initial: E.CareerState, chosen: number, target: number) {
  seedMain(chosen);
  return journey(initial, target);
}
function codecProjection(run: ReturnType<typeof journey>) {
  return { frames: run.frames, priorArrivalWrites: run.priorArrivalWrites, mainDraws: run.mainDraws,
    mainRngState: run.mainRngState, reached: run.reached };
}
async function uiInput(era = '2005-09') {
  cleanup(); localStorage.clear(); localStorage.setItem(OTHER, 'untouched');
  uiDraws = []; mainDraws = []; action = 'ui';
  vi.mocked(Math.random).mockImplementation(() => { const value = 0.52; uiDraws.push({ action, value }); return value; });
  return createFromUi(era);
}

beforeAll(async () => {
  try {
    vi.useFakeTimers(); vi.setSystemTime(new Date(spec.clock));
    vi.spyOn(Math, 'random').mockImplementation(() => 0.52);
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.scrollTo = vi.fn();
    ui = await uiInput();
    retain('actual-original-ui-input', { ui, importDraws: moduleTape.values,
      scope: arrival(ui.state)?.version === 1
        ? 'Actual current v1 UI input, no version2 flag or real player inserted. Per-journey main seed starts after this real creation.'
        : 'Actual current UI input, no policy flag or real player injected. Per-journey main seed starts after this real creation.' });
    for (const chosen of spec.measureSeeds) {
      const run = replay(ui.state, chosen, 2019);
      const file = retain('attempt-' + chosen, { seed: chosen, ...run });
      attempts.push({ seed: chosen, reached: run.reached, file });
      if (run.reached) { healthy = run; seed = chosen; break; }
    }
    if (!healthy) throw new Error('SC4_INPUT_MEASUREMENT_GAP: no ordinary live career reaches2019 within declared seeds/actions');
    const repeat = replay(ui.state, seed, 2019);
    const equal = JSON.stringify(codecProjection(healthy)) === JSON.stringify(codecProjection(repeat));
    retain('healthy-repeated-original', { seed, ...repeat, sameWholeProjection: equal });
    if (!equal) throw new Error('SC4_INPUT_REPLAY_NOT_EQUAL');
    reload = wholeLoad(healthy.state);
    const resolved = Object.fromEntries(expected.map(p => [p.id, worldClubOf(reload.state, p.name)]));
    cache = { resolved, pool2015: getEraStars(2015), pool2020: getEraStars(2020) };

    const before = serializeSoccerCareerSave(reload.state), beforeStorage = storage(), beforeDraws = mainDraws.length;
    const view = render(<PhonePanel career={reload.state} onAnswer={() => undefined} onMoney={() => undefined}
      onBuyItem={() => undefined} onClose={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: /SportsFeed/ }));
    const firstHtml = view.container.innerHTML;
    fireEvent.click(view.getByRole('button', { name: /Home/ }));
    fireEvent.click(view.getByRole('button', { name: /SportsFeed/ }));
    const region = view.queryByRole('region', { name: 'Real player arrivals' });
    card = { firstHtml, reopenedHtml: view.container.innerHTML, text: region?.textContent ?? '',
      regionPresent: !!region, links: region ? [...region.querySelectorAll('a')].map(a => a.href) : [],
      before, after: serializeSoccerCareerSave(reload.state), beforeStorage, afterStorage: storage(),
      beforeDraws, afterDraws: mainDraws.length };
    cleanup();

    // Replay the authenticated original inputs, never an edited new version2 save.
    const oldV1 = originalAuthority.inputSources.v1;
    expect(oldV1.raw).toBe(originalUi.bytes);
    expect(oldV1.state).toEqual(originalUi.state);
    expect(oldV1.mainSeed).toBe(seed);
    const v1One = replay(plain(oldV1.state), seed, 2019), v1Two = replay(plain(oldV1.state), seed, 2019);
    const args = originalUi.args.slice(0, 13) as unknown as Parameters<typeof E.initCareer>;
    expect(ui.args).toEqual(originalUi.args);
    const legacyReplay = () => {
      seedMain(seed); action = 'actual-unmarked-constructor';
      const initial = E.initCareer(...args), checkpoint = mainState;
      expect(serializeSoccerCareerSave(initial), 'SC4_AUTHENTIC_LEGACY_INPUT').toBe(originalAuthority.inputSources.legacy.raw);
      expect(checkpoint).toBe(originalAuthority.inputSources.legacy.checkpoint);
      const run = journey(initial, 2011);
      return { initial, initialBytes: serializeSoccerCareerSave(initial), checkpoint, run, load: wholeLoad(run.state) };
    };
    const legacyOne = legacyReplay(), legacyTwo = legacyReplay();
    const opaque = plain(originalAuthority.inputSources.opaque.state.historicalArrivals);
    const opaqueReplay = () => {
      seedMain(seed); action = 'actual-unmarked-constructor-for-declared-opaque-codec';
      const original = E.initCareer(...args);
      expect(serializeSoccerCareerSave(original), 'SC4_AUTHENTIC_LEGACY_INPUT').toBe(originalAuthority.inputSources.legacy.raw);
      const parsed = parseSoccerCareerSave(originalAuthority.inputSources.opaque.raw);
      expect(isSoccerCareerSave(parsed)).toBe(true);
      const initial = plain(parsed) as E.CareerState;
      const checkpoint = mainState, firstLoad = wholeLoad(initial);
      expect(serializeSoccerCareerSave(initial), 'SC4_AUTHENTIC_OPAQUE_INPUT').toBe(originalAuthority.inputSources.opaque.raw);
      expect(checkpoint).toBe(originalAuthority.inputSources.opaque.checkpoint);
      const run = journey(firstLoad.state, 2011);
      return { initial, initialBytes: serializeSoccerCareerSave(initial), checkpoint, firstLoad,
        run, load: wholeLoad(run.state) };
    };
    const opaqueOne = opaqueReplay(), opaqueTwo = opaqueReplay();
    const newer = await uiInput('2025'), newerLoad = wholeLoad(newer.state);
    expect(newer.bytes, 'SC4_AUTHENTIC_NEWER_INPUT').toBe(originalAuthority.inputSources.newer.raw);
    expect(newer.state).toEqual(originalAuthority.inputSources.newer.state);
    held = { actualV1Input: { raw: oldV1.raw, state: oldV1.state, mainSeed: seed }, v1One, v1Two,
      legacyOne, legacyTwo, opaque, opaqueOne, opaqueTwo, newer, newerLoad,
      rule: 'Original-capture authority only. Before candidate tests freeze these exact actual old inputs and full projections into an authenticated original reference.' };
    const healthyFile = attempts.find(a => a.reached)!.file;
    retain('case-1-new-policy', { ui, seed, healthyFile });
    retain('case-2-due-timeline', { seed, healthyFile, reload });
    retain('case-3-world-identities', { seed, healthyFile, reload, cache });
    retain('case-4-visible-cards', { seed, healthyFile, card });
    retain('case-5-held-originals', held);
    fs.writeFileSync(path.join(OUT!, 'run.json'), JSON.stringify({
      status: arrival(ui.state)?.version === 1 ? 'FULL_ACTUAL_ORIGINAL_INPUTS_BEFORE_ABSENCE_ASSERTIONS' : 'FULL_ACTUAL_CURRENT_INPUTS_BEFORE_BUSINESS_ASSERTIONS',
      source: spec.preparationSource, selectedSeed: seed, attempts, sameWholeRepeatedProjection: true,
      expectedCaseFiles: spec.cases.map((c: any) => c.file), privateForkTapeCaptured: false,
      tapeScope: 'Actual module/UI/global Math.random during unmodified public engine calls only; private keyed generators are not observed.',
      originalInputKind: arrival(ui.state)?.version === 1 ? 'ACTUAL_CURRENT_V1_UI' : 'ACTUAL_CURRENT_V2_UI', allFramesAreCompleteCodecStates: true,
    }));
  } catch (error) {
    setupFailure = String(error);
    try { retain('setup-diagnostic', { setupFailure, attempts, lastJourney, mainDraws, mainRngState: mainState }); }
    catch { /* The retention fallback and native stderr still prove failure. */ }
    throw error;
  }
}, 600_000);
afterAll(() => {
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  window.scrollTo = originalScrollTo;
  fs.writeFileSync(path.join(OUT!, 'closing.json'), JSON.stringify({
    setupFailure, decodedBytes, storedBytes, records, attempts, selectedSeed: seed,
    noPrivateForkClaim: true, schema: 'gzip-full-literal-json-v1',
  }));
});

describe('Soccer Career four historical entries original-first', () => {
  it('new eligible 2005 UI creation uses the four-entry version2 policy', () => {
    expect(arrival(ui.state)?.version, 'SC4_NEW_CREATION_VERSION').toBe(2);
    expect(entries(ui.state), 'SC4_NEW_CREATION_VERSION empty before2009').toEqual([]);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });
  it('the ordinary committed-year timeline admits all four sourced IDs exactly once', () => {
    for (const frame of healthy.frames) {
      expect(entries(frame.state), 'SC4_DUE_YEAR_ENTRIES at' + frame.year).toEqual(admitted(frame.year));
      expect(new Set(entries(frame.state)?.map(p => p.id)).size).toBe(entries(frame.state)?.length);
    }
    expect(entries(reload.state), 'SC4_DUE_YEAR_ENTRIES full2019').toEqual(admitted(2019));
    expect(reload.loadedBytes).toBe(reload.bytes);
    for (const row of healthy.priorArrivalWrites) expect(row.after, row.action).toEqual(row.before);
  });
  it('each registered identity resolves its own saved source club across existing era tables', () => {
    expect(cache.resolved, 'SC4_OWN_WORLD_IDENTITY').toEqual(Object.fromEntries(expected.map(p => [p.id, p.entryClub])));
    expect(Object.keys(reload.state.phone!.clubs).length).toBeLessThanOrEqual(28);
    expect(Object.prototype.hasOwnProperty.call(reload.state.phone!.clubs, 'Kylian Mbappe'), 'SC4_OWN_WORLD_IDENTITY no alias duplicate').toBe(false);
    expect(entries(reload.state)).toEqual(admitted(2019));
  });
  it('the actual reopened SportsFeed shows all four source entries without writes or draws', () => {
    expect(card.regionPresent, 'SC4_VISIBLE_SOURCE_CARDS').toBe(true);
    for (const row of expected) {
      expect(row.id === 'soccer:mbappe' ? card.text.includes(row.name) || card.text.includes('Kylian Mbappe') : card.text.includes(row.name),
        'SC4_VISIBLE_SOURCE_CARDS ' + row.id).toBe(true);
      expect(card.text, 'SC4_VISIBLE_SOURCE_CARDS ' + row.id).toContain(row.entryClub);
      expect(card.text, 'SC4_VISIBLE_SOURCE_CARDS ' + row.id).toContain(String(row.entryYear));
    }
    expect(card.text, 'SC4_VISIBLE_SOURCE_CARDS saved world disclosure').toMatch(/Career world/i);
    expect(card.links.length).toBeGreaterThanOrEqual(8);
    expect(card.after).toBe(card.before); expect(card.afterStorage).toEqual(card.beforeStorage);
    expect(card.afterDraws).toBe(card.beforeDraws);
  });
  it('actual original v1 unmarked opaque and newer inputs preserve complete codec world and draw projections', () => {
    expect(arrival(held.actualV1Input.state)?.version).toBe(1);
    expect(codecProjection(held.v1One)).toEqual(codecProjection(held.v1Two));
    expect(entries(held.v1One.state), 'SC4_V1_PRESERVED_NO_UPGRADE').toEqual([{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }]);
    expect(held.legacyOne).toEqual(held.legacyTwo);
    expect(held.legacyOne.run.reached).toBe(true);
    expect(own(held.legacyOne.initial)).toBe(false); expect(own(held.legacyOne.run.state)).toBe(false);
    expect(held.opaqueOne).toEqual(held.opaqueTwo);
    expect(held.opaqueOne.run.reached).toBe(true);
    expect(arrival(held.opaqueOne.run.state)).toEqual(held.opaque);
    expect(held.opaqueOne.load.loadedBytes).toBe(held.opaqueOne.load.bytes);
    expect(own(held.newer.state)).toBe(false); expect(own(held.newerLoad.state)).toBe(false);
    expect(year(held.newer.state)).toBe(2025);
    expect(held.v1One.state.phone).toEqual(held.v1Two.state.phone);
  });
});
