import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined, error: () => 'qa', dismiss: () => undefined } }));

type Save = { c: Record<string, any> | null; phase: string; teamQuality: number | null; prospect?: Record<string, any>; [key: string]: any };
type Frame = { action: string; raw: string; save: Save | null; dom: string; text: string; globalAt: number; rngState: number };
type Camp = { before: Record<string, any>; after: Record<string, any>; quality: number; note: string | null; globalStart: number; globalEnd: number; draws: number[] };
type Journey = { key: string; seed: number; pos: string; mode: string; observedCamp: boolean; frames: Frame[]; globals: number[]; camps: Camp[]; input?: unknown; classView?: unknown; faSigned?: boolean };
const OUT = process.env.NBA_2004_ORIGINAL_OUT;
const SPEC_PATH = process.env.NBA_2004_ORIGINAL_SPEC;
if (!OUT || !SPEC_PATH) throw new Error('NBA original measurement requires explicit OUT and SPEC');
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'nba-my-career-save-v1';
const oldScrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const referenceBytes = fs.readFileSync(path.resolve(spec.originalInputsFile));
if (sha(referenceBytes) !== spec.originalInputsSha256) throw new Error('Authenticated original reference file SHA mismatch');
const referenceEnvelope = JSON.parse(referenceBytes.toString('utf8'));
const originals: Record<string, any> = {};
for (const row of referenceEnvelope.files) {
  const bytes = gunzipSync(Buffer.from(row.gzipBase64, 'base64'));
  if (bytes.length !== row.bytes || sha(bytes) !== row.sha256) throw new Error('Authenticated whole original RAW mismatch: ' + row.file);
  originals[row.file] = JSON.parse(bytes.toString('utf8'));
}
const originalLegacy = originals['raw/legacy-full.json'];
const originalRoad = originals['raw/journeys/road-61-PG.json'];
if (sha(originalLegacy.inputRaw) !== referenceEnvelope.frozenInputs.professional.sha256
  || sha(originalRoad.input.pending.raw) !== referenceEnvelope.frozenInputs.pending.sha256)
  throw new Error('Actual old save strings differ from admitted original');
function actualProductPins() {
  return Object.fromEntries(Object.keys(spec.productPins).map(file => {
    const b = fs.readFileSync(file);
    return [file, createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex')];
  }));
}
const records: { file: string; bytes: number; sha256: string; storedFile: string; storedBytes: number; storedSHA256: string; encoding: string }[] = [];
let rawBytes = 0;
let storedRawBytes = 0;
let lastDiagnostic: unknown = null;
function put(file: string, value: unknown) {
  const body = JSON.stringify(value);
  const literal = Buffer.from(body, 'utf8');
  const bytes = literal.length;
  const prior = records.find(r => r.file === file);
  const nextBytes = rawBytes - (prior?.bytes ?? 0) + bytes;
  let stored: Buffer | undefined;
  try {
    if (nextBytes > spec.limits.maxDecodedRawBytes) throw new Error('decoded raw safety bound exceeded');
    stored = gzipSync(literal);
    assert.deepEqual(gunzipSync(stored, { maxOutputLength: spec.limits.maxDecodedRawBytes }), literal, 'NBA_2004_LITERAL_GZIP_ROUNDTRIP');
    const nextStored = storedRawBytes - (prior?.storedBytes ?? 0) + stored.length;
    if (nextStored > spec.limits.maxRawBytes) throw new Error('stored raw retention ceiling exceeded');
    const storedFile = file + '.gz';
    const dest = path.join(OUT!, storedFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, stored);
    rawBytes = nextBytes;
    storedRawBytes = nextStored;
    const row = { bytes, sha256: sha(literal), storedFile, storedBytes: stored.length,
      storedSHA256: sha(stored), encoding: spec.transport.encoding };
    if (prior) Object.assign(prior, row);
    else records.push({ file, ...row });
  } catch (error) {
    try { fs.writeFileSync(path.join(OUT!, 'diagnostic-fallback.json'), JSON.stringify({
      status: 'RETENTION_FAILED_NO_FULL_PROOF', file, rawBytes, storedRawBytes, requestedBytes: bytes,
      requestedStoredBytes: stored?.length, error: String(error), lastDiagnostic,
    })); } catch { /* stderr and native exit still retain the failure */ }
    throw error;
  }
}
let rngState = 0;
let draws: number[] = [];
let importDraws: number[] = [];
let initializationCapture = true;
const initializationOrigins: { at: number; stack: string }[] = [];
function random() {
  rngState = (rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  if (initializationCapture) initializationOrigins.push({ at: draws.length, stack: new Error('actual global draw origin').stack ?? '' });
  draws.push(v);
  return v;
}
let Board: typeof import('@/components/nba-my-career/NbaMyCareerBoard').default;
let nba: typeof import('@/lib/nbaCareerSport').NBA_CAREER_SPORT;
let originalCamp: typeof nba.campBattle;
let draftRows: readonly { id: string; pick: number; name: string; families: readonly string[]; dob: string | null }[] = [];
let view: ReturnType<typeof render> | null = null;
let current: Journey | null = null;
let mathSpy: { mockRestore(): void } | undefined;
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const buttons = (root: ParentNode = document.body) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].filter(b => !b.disabled && !b.closest('[aria-hidden="true"]'));
const by = (re: RegExp, root: ParentNode = document.body) => buttons(root).find(b => re.test(squash(b.textContent ?? '')));
function uniqueButton(re: RegExp, root: ParentNode = document.body) {
  const matches = buttons(root).filter(b => re.test(squash(b.textContent ?? '')));
  if (matches.length !== 1) throw new Error('Existing control is not unique: ' + re + ' count=' + matches.length);
  return matches[0];
}
function actualHubTile(title: string) {
  const root = document.querySelector('[data-career-hub-buttons]');
  if (!root) throw new Error('Missing existing hub tile container');
  const matches = buttons(root).filter(b => [...b.querySelectorAll('div')].some(d => squash(d.textContent ?? '') === title));
  if (matches.length !== 1) throw new Error('Existing hub title is not unique: ' + title + ' count=' + matches.length);
  return matches[0];
}
const node = (selector: string) => document.querySelector<HTMLButtonElement>(selector);
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
function saved(key = KEY): { raw: string; save: Save | null } {
  const raw = localStorage.getItem(key) ?? '';
  return { raw, save: raw ? JSON.parse(raw) : null };
}
function frame(action: string, key = KEY) {
  const s = saved(key);
  const f: Frame = { action, ...s, dom: document.body.innerHTML, text: squash(document.body.textContent ?? ''),
    globalAt: draws.length, rngState };
  current?.frames.push(f);
  lastDiagnostic = { key: current?.key, action, phase: s.save?.phase, year: s.save?.c?.year,
    actions: current?.frames.length, globalDraws: draws.length, saveSha256: sha(s.raw) };
  if ((current?.frames.length ?? 0) > spec.limits.maxActionsPerJourney)
    throw new Error('NBA measurement action ceiling: ' + JSON.stringify(lastDiagnostic));
  return f;
}
async function click(b: HTMLElement | undefined | null, action: string) {
  if (!b) throw new Error('Missing existing action: ' + action + '; ' + squash(document.body.textContent ?? '').slice(0, 260));
  fireEvent.click(b);
  await flush();
  return frame(action);
}
async function mount(key = KEY) {
  view?.unmount(); cleanup();
  view = render(<MemoryRouter><Board /></MemoryRouter>);
  await flush(); await flush();
  return frame('MOUNT', key);
}
function setObserver(observe: boolean) {
  nba.campBattle = originalCamp;
  if (!observe) return;
  nba.campBattle = ((c, quality, rng) => {
    const before = clone(c);
    const start = draws.length;
    const note = originalCamp(c, quality, rng);
    current?.camps.push({ before, after: clone(c), quality, note, globalStart: start,
      globalEnd: draws.length, draws: draws.slice(start) });
    return note;
  }) as typeof nba.campBattle;
}
async function start(seed: number, pos: string, mode: string, observe: boolean, rawInput?: string, stateInput?: number) {
  view?.unmount(); view = null; cleanup(); localStorage.clear();
  rngState = stateInput ?? seed; draws = [];
  current = { key: mode + '-' + seed + '-' + pos, seed, pos, mode, observedCamp: observe, frames: [], globals: [], camps: [] };
  setObserver(observe);
  if (rawInput) localStorage.setItem(KEY, rawInput);
  await mount();
  if (!rawInput) {
    fireEvent.change(document.querySelector('input[aria-label="Your player name"]')!, { target: { value: 'Draft Test ' + seed } });
    await flush(); frame('TYPE fictional name');
    await click(by(/2003-04 throwback/), '2003-04 throwback');
    await click(by(new RegExp('^' + pos + '$')), 'POSITION ' + pos);
    await click(by(mode === 'road' ? /^Play your road to the draft$/ : /^Enter the draft$/), mode === 'road' ? 'ROAD' : 'QUICK CREATE');
  }
  return current;
}
async function next() {
  const review = node('[data-fa-sign-review]');
  if (review) {
    const f = await click(uniqueButton(/^Confirm signing$/, review), 'CONFIRM real FA signing');
    if (current) current.faSigned = saved().save?.phase === 'season';
    return f;
  }
  const curtain = document.querySelector('[data-season-reveal]');
  if (curtain) return click(buttons(curtain).slice(-1)[0], 'SEASON CURTAIN Continue');
  const receipt = node('[data-decision-continue]');
  if (receipt) return click(receipt, 'DECISION Continue');
  const beat = document.querySelector('[data-rivalry-event]');
  if (beat) return click(buttons(beat).slice(-1)[0], 'RIVAL EVENT Continue');
  const rival = document.querySelector('[data-rivalry-choice]');
  if (rival) return click(rival.querySelector('[data-rivalry-outcome]') ? buttons(rival).slice(-1)[0] : buttons(rival)[0], 'RIVAL CHOICE actual option');
  const wheel = node('[data-market-skip]') ?? node('[data-market-continue]');
  if (wheel) return click(wheel, 'MARKET saved wheel Continue');
  const rest = node('[data-intl-answer="rest"]');
  if (rest) return click(rest, 'REST international summer');
  const intlContinue = node('[data-intl-continue]');
  if (intlContinue) return click(intlContinue, 'INTERNATIONAL Continue');
  const ext = document.querySelector('[data-extension-talk]');
  if (ext) return click(ext.querySelector('[data-ext-decline]') ?? buttons(ext).slice(-1)[0], 'DECLINE real extension');
  const fa = node('[data-fa-sign]');
  if (fa) {
    const f = await click(fa, 'OPEN real FA signing review');
    return f;
  }
  const option = node('[data-career-decision-option="0"]');
  if (option) return click(option, 'OFFSEASON actual option0');
  const play = by(/^Play the \d+ season$/);
  if (play) return click(play, squash(play.textContent ?? ''));
  const back = by(/^Hub$/) ?? by(/^Back to My Player$/);
  if (back) return click(back, 'BACK');
  const cont = by(/^Continue$/);
  if (cont) return click(cont, 'Continue');
  await flush();
  frame('WAIT existing lazy screen');
  if (by(/^Continue$/)) return click(by(/^Continue$/), 'Continue after lazy load');
  throw new Error('NBA walker lost: ' + JSON.stringify(lastDiagnostic) + '; ' + squash(document.body.textContent ?? '').slice(0, 600));
}
async function hub(year: number) {
  for (let i = 0; i < spec.limits.maxActionsPerJourney; i++) {
    const s = saved().save;
    if (s?.c?.retired) throw new Error('Career retired before requested input year ' + year);
    if (s?.c?.year === year && s.phase === 'season' && by(new RegExp('^Play the ' + year + ' season$'))) return;
    if (typeof s?.c?.year === 'number' && s.c.year > year) throw new Error('Requested year was skipped: ' + year);
    await next();
  }
  throw new Error('No requested existing hub: ' + year);
}
async function classView() {
  await click(actualHubTile('My Player'), 'OPEN actual My Player');
  const opener = by(/^2004 draft class\b/i);
  const before = frame('QUERY class opener without throwing');
  let result: unknown = { openerPresent: !!opener, before };
  if (opener) {
    await click(opener, 'OPEN proposed class control');
    const heading = [...document.querySelectorAll('h3')].find(n => squash(n.textContent ?? '') === 'Your simulated 2004 camps');
    result = { openerPresent: true, before, opened: frame('READ complete class UI'),
      campText: squash(heading?.parentElement?.textContent ?? ''),
      rows: [...document.querySelectorAll('[data-draft-2004-id]')].map(row => ({ id: row.getAttribute('data-draft-2004-id'), text: squash(row.textContent ?? '') })) };
    await click(by(/^Back to My Player$/), 'BACK class');
  }
  await click(by(/^Hub$/), 'BACK My Player');
  if (current) current.classView = result;
}
async function finish() {
  if (!current) throw new Error('No active journey');
  view?.unmount(); view = null; cleanup(); await flush();
  frame('UNMOUNT completed journey');
  current.globals = [...draws];
  const result = clone(current);
  put('journeys/' + current.key + '.json', result);
  nba.campBattle = originalCamp;
  return result;
}
async function quick(seed: number, pos: string, observe: boolean, suffix = 'quick') {
  await start(seed, pos, suffix, observe);
  const entered = saved();
  if (entered.save?.c?.year !== 2003 || entered.save.c.eraId !== 'y2004')
    throw new Error('Existing UI did not create actual 2003 throwback input');
  current!.input = { kind: 'ACTUAL_UI_CREATED', entered, rngState, noHiddenPolicyInput: true };
  await hub(2004);
  frame('HEALTHY 2004 pre-camp hub');
  await classView();
  await click(by(/^Play the 2004 season$/), 'Play the 2004 season');
  await hub(2005);
  frame('HEALTHY after actual 2004 camp and season');
  return finish();
}
function projection(j: Journey) {
  return { frames: j.frames.map(f => ({ action: f.action, raw: f.raw, text: f.text, globalAt: f.globalAt, rngState: f.rngState })),
    globals: j.globals, classView: j.classView ? { openerPresent: (j.classView as any).openerPresent,
      beforeText: (j.classView as any).before?.text, openedText: (j.classView as any).opened?.text,
      rows: (j.classView as any).rows, campText: (j.classView as any).campText } : null };
}
async function joinActualProspect() {
    await click(by(/Straight from high school/), 'Straight from high school');
    for (let i = 0; i < 20 && !saved().save?.c; i++) {
      const s = saved().save;
      const phase = s?.prospect?.state?.phase;
      if (phase === 'season') await click(by(/^Play your first season$|^Play the next season$/), 'PREDRAFT season');
      else if (phase === 'choice') {
        const root = document.querySelector('[data-testid="pre-draft-season"]')!;
        await click(buttons(root)[0], 'PREDRAFT actual option0');
      } else if (phase === 'showcase') {
        const showcase = document.querySelector('[data-testid="draft-showcase"]');
        if (!showcase) throw new Error('Missing actual draft-showcase control group');
        const skip = buttons(showcase).filter(button => [...button.querySelectorAll('span')]
          .some(span => squash(span.textContent ?? '') === 'Skip it'));
        if (skip.length !== 1) throw new Error('Actual Skip it label is not unique: ' + skip.length);
        await click(skip[0], 'Skip it');
      }
      else if (phase === 'draft') await click(by(/^Draft day$/), 'Draft day');
      else if (phase === 'done') await click(by(/^Start your career$/), 'Start your career');
      else { await flush(); frame('WAIT existing prospect phase'); }
    }
    if (saved().save?.c?.year !== 2003) throw new Error('Actual prospect route did not join 2003 career');
}
const found: Record<string, Journey> = {};
let search: Journey[] = [];
let qualification: unknown[] = [];
let road: Journey;
let legacy: Record<string, unknown> = {};
let persistence: Journey;
let legacyPending: Journey;
let beforeAllFailure: string | null = null;
beforeAll(async () => {
  try {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(spec.clock));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    Element.prototype.scrollIntoView = () => undefined;
    rngState = spec.importSeed; draws = [];
    mathSpy = vi.spyOn(Math, 'random').mockImplementation(random);
    Board = (await import('@/components/nba-my-career/NbaMyCareerBoard')).default;
    nba = (await import('@/lib/nbaCareerSport')).NBA_CAREER_SPORT;
    originalCamp = nba.campBattle;
    draftRows = (await import('@/data/nbaDraft2004')).NBA_DRAFT_2004;
    // Resolve only the read-only view module before declared seed boundaries; every case still opens it through the real UI.
    await import('@/components/nba-my-career/NbaHistoricalDraftClass');
    put('authenticated-reference.json', { authority: referenceEnvelope.authority,
      fileSha256: sha(referenceBytes), files: referenceEnvelope.files.map((r: any) => ({ file: r.file, bytes: r.bytes, sha256: r.sha256 })),
      frozenInputs: referenceEnvelope.frozenInputs });
    // Retain the real cold create-screen initialization before the per-journey seed boundary.
    localStorage.clear();
    const bootstrapFrames = [await mount()];
    for (let i = 0; i < spec.bootstrap.flushes; i++) {
      await flush();
      bootstrapFrames.push(frame('BOOTSTRAP real create screen settle ' + i));
    }
    if (!by(/^Enter the draft$/) || saved().raw) throw new Error('BOOTSTRAP_INPUT_NOT_EMPTY_REAL_CREATE_SCREEN');
    view?.unmount(); view = null; cleanup(); await flush();
    bootstrapFrames.push(frame('BOOTSTRAP UNMOUNT'));
    importDraws = [...draws]; initializationCapture = false;
    put('bootstrap.json', { status: 'ACTUAL_COLD_UI_INITIALIZATION_RETAINED', seed: spec.importSeed,
      frames: bootstrapFrames, values: importDraws, origins: initializationOrigins,
      privateForkTapeCaptured: false, noCareerCreated: true, noDrawDropped: true });
    put('import-global-tape.json', { scope: spec.tapeBoundary, seed: spec.importSeed, values: importDraws,
      includesRetainedColdUiBootstrap: true });
    for (const seed of spec.quickSeeds) {
      const pos = POS[(seed - 1) % POS.length];
      const j = await quick(seed, pos, true);
      search.push(j);
      for (const camp of j.camps.filter(c => c.before.year === 2004)) {
        if (camp.before.role === 'backup' && camp.after.role === 'starter') found.promotion ??= j;
        if (camp.after.role === 'backup') found.loss ??= j;
        if (camp.before.role === 'starter' && camp.after.role === 'starter') found.starterHold ??= j;
        if (camp.before.role === 'starter' && camp.after.role === 'backup') found.demotion ??= j;
        const family = camp.before.pos === 'C' ? 'C' : ['PG', 'SG'].includes(camp.before.pos) ? 'G' : 'F';
        found[family] ??= j;
      }
    }
    const qualifying = [...new Map(Object.entries(found).map(([,j]) => [j.key,j])).values()];
    for (const j of qualifying) {
      const normal = await quick(j.seed, j.pos, false, 'normal');
      const a = projection(j), b = projection(normal);
      // Key labels differ; all actual action/save/text/global frames must not.
      const equal = JSON.stringify(a) === JSON.stringify(b);
      qualification.push({ observed: j.key, normal: normal.key, equal, observedSha256: sha(JSON.stringify(a)), normalSha256: sha(JSON.stringify(b)) });
      if (!equal) throw new Error('CAMP_OBSERVER_NOT_QUALIFIED: normal versus observed frame/global mismatch');
    }
    const required = ['promotion','loss','starterHold','demotion','G','F','C'];
    const missing = required.filter(k => !found[k]);
    put('bounded-search.json', { scope: spec.tapeBoundary, seeds: spec.quickSeeds,
      allAttempts: search.map(j => j.key), found: Object.fromEntries(Object.entries(found).map(([k,j]) => [k,j.key])),
      missing, qualification, privateForkTapeCaptured: false });
    if (missing.length) throw new Error('INPUT_MEASUREMENT_GAP: ' + missing.join(','));
    await start(spec.roadSeed, 'PG', 'road', true);
    const pending = saved();
    frame('NEW real pending prospect');
    await mount();
    frame('PENDING real remount');
    await joinActualProspect();
    current!.input = { kind: 'ACTUAL_UI_CREATED_ROAD', pending, noHiddenPolicyInput: true };
    await hub(2004); await classView();
    road = await finish();

    // Load the actual admitted old save and checkpoint verbatim, never a candidate save with a marker removed.
    const legacyRaw = originalLegacy.inputRaw;
    const legacyState = referenceEnvelope.frozenInputs.professional.rngState;
    const legacyInput = clone(originalLegacy.input);
    const replay = async (name: string) => {
      await start(spec.legacySeed, 'PG', name, false, legacyRaw, legacyState);
      await hub(2004); await click(by(/^Play the 2004 season$/), 'Play the 2004 season'); await hub(2005);
      return finish();
    };
    const one = await replay('legacy-one'), two = await replay('legacy-two');
    const exact = JSON.stringify(projection(one)) === JSON.stringify(projection(two));
    legacy = { inputSource: 'AUTHENTICATED_ORIGINAL', input: legacyInput,
      inputRaw: legacyRaw, inputRngState: legacyState, one, two, exact };
    await start(spec.roadSeed, 'PG', 'legacy-pending', false, originalRoad.input.pending.raw,
      referenceEnvelope.frozenInputs.pending.rngState);
    frame('PENDING real remount');
    await joinActualProspect();
    await hub(2004); await classView();
    legacyPending = await finish();
    legacy.pending = legacyPending;

    // Current era is a separate actual UI input, not a rewritten year on a throwback save.
    setObserver(false);
    view?.unmount(); view = null; cleanup(); localStorage.clear(); rngState = spec.currentSeed; draws = [];
    current = { key: 'current-era-' + spec.currentSeed, seed: spec.currentSeed, pos: 'PG', mode: 'current-era', observedCamp: false, frames: [], globals: [], camps: [] };
    await mount(); await click(by(/2026/), 'CURRENT 2026'); await click(by(/^Enter the draft$/), 'CURRENT Enter the draft');
    const currentEra = await finish();
    const other: unknown[] = [];
    for (const slug of ['nfl','mlb','nhl']) {
      const importStart = draws.length, importState = rngState;
      const module = slug === 'nfl' ? await import('@/components/nfl-my-career/NflMyCareerBoard')
        : slug === 'mlb' ? await import('@/components/mlb-my-career/MlbMyCareerBoard')
        : await import('@/components/nhl-my-career/NhlMyCareerBoard');
      put('imports/' + slug + '-global.json', { scope: spec.tapeBoundary, startState: importState, endState: rngState, values: draws.slice(importStart) });
      const OriginalBoard = Board; Board = module.default as typeof Board;
      view?.unmount(); view = null; cleanup(); localStorage.clear(); rngState = spec.otherSeed; draws = [];
      current = { key: 'other-' + slug, seed: spec.otherSeed, pos: '', mode: slug, observedCamp: false, frames: [], globals: [], camps: [] };
      await mount(slug + '-my-career-save-v1');
      await click(by(/^Enter the draft$/), 'OTHER actual Enter the draft');
      frame('OTHER complete save', slug + '-my-career-save-v1');
      other.push(await finish()); Board = OriginalBoard;
    }
    legacy.currentEra = currentEra; legacy.other = other;
    put('legacy-full.json', legacy);

    const selected = found.promotion;
    await start(selected.seed, selected.pos, 'persistence', true);
    await hub(2004); await click(by(/^Play the 2004 season$/), 'Play the 2004 season'); await hub(2005);
    await mount();
    frame('RELOAD actual post-2004 save');
    for (let i = 0; i < 180; i++) {
      if (current!.faSigned && !document.querySelector('[data-fa-sign-review]') && saved().save?.phase === 'season') break;
      if (saved().save?.c?.retired) throw new Error('No natural FA input before retirement');
      await next();
    }
    if (!current!.faSigned || saved().save?.phase !== 'season') throw new Error('INPUT_MEASUREMENT_GAP: no natural actual FA signing');
    frame('NATURAL FA signed complete save');
    await classView(); persistence = await finish();
    put('case-1-arrival.json', { scope: spec.tapeBoundary, journey: search[0], expected: spec.expectedClass });
    put('case-2-road.json', { scope: spec.tapeBoundary, journey: road });
    put('case-3-camp.json', { scope: spec.tapeBoundary, selected: Object.fromEntries(Object.entries(found).map(([k,j]) => [k,j])),
      qualification, expected: spec.expectedClass });
    put('case-4-persistence.json', { scope: spec.tapeBoundary, journey: persistence });
    put('case-5-legacy.json', { scope: spec.tapeBoundary, legacy });
    put('run.json', { status: 'ACTUAL_INPUTS_CAPTURED_BEFORE_FEATURE_ASSERTIONS', baseline: spec.baseline,
      sourcePins: actualProductPins(), tapeBoundary: spec.tapeBoundary, privateForkTapeCaptured: false,
      allAttempts: search.map(j => j.key), found: Object.fromEntries(Object.entries(found).map(([k,j]) => [k,j.key])),
      bootstrap: { file: 'bootstrap.json', retainedColdUi: true },
      qualification, caseFiles: spec.cases.map((c: any) => c.raw), rawBytes, storedRawBytes, records: [...records],
      noHiddenMarkerOrRealNpcInjected: true, importDraws: importDraws.length, setupsComplete: true });
  } catch (error) {
    beforeAllFailure = String(error);
    try { put('setup-diagnostic.json', { status: 'SETUP_OR_INPUT_MEASUREMENT_FAILED_NOT_OWNED', error: String(error),
      lastDiagnostic, current, searchCompleted: search.map(j => j.key), records, rawBytes, scope: spec.tapeBoundary }); } catch { /* fallback is written by put */ }
    throw error;
  } finally {
    if (nba && originalCamp) nba.campBattle = originalCamp;
  }
}, 600_000);
afterAll(() => {
  view?.unmount(); cleanup();
  if (nba && originalCamp) nba.campBattle = originalCamp;
  mathSpy?.mockRestore(); vi.useRealTimers(); vi.unstubAllGlobals();
  if (oldScrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScrollDescriptor);
  else delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
  fs.writeFileSync(path.join(OUT!, 'closing.json'), JSON.stringify({ beforeAllFailure, rawBytes, storedRawBytes,
    records, scope: spec.tapeBoundary, restoredCampFunction: !nba || nba.campBattle === originalCamp,
    restoredJsdomScroll: oldScrollDescriptor
      ? Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')?.value === oldScrollDescriptor.value
      : !Object.prototype.hasOwnProperty.call(Element.prototype, 'scrollIntoView') }));
});
const block = (c: Record<string, any> | null | undefined) => c?.draft2004;
const finalCareer = (j: Journey) => [...j.frames].reverse().find(f => f.save?.c)?.save?.c;
const identities = (c: Record<string, any> | null | undefined) => block(c)?.ids;

const newViewActions = new Set(['OPEN proposed class control','READ complete class UI','BACK class']);
function withoutFeature<T>(value: T): T {
  const c = clone(value) as any;
  if (c && typeof c === 'object') delete c.draft2004;
  return c;
}
function protectedRaw(raw: string) {
  if (!raw) return raw;
  const s = JSON.parse(raw);
  if (s.c) delete s.c.draft2004;
  if (s.prospect) delete s.prospect.draftClassPolicy;
  return JSON.stringify(s);
}
function assertProtectedGameplay(actual: Journey, original: Journey) {
  const frames = (j: Journey, removeNew: boolean) => j.frames.filter(f => !removeNew || !newViewActions.has(f.action))
    .map(f => ({ action: f.action, raw: removeNew ? protectedRaw(f.raw) : f.raw, globalAt: f.globalAt, rngState: f.rngState }));
  assert.deepEqual(actual.globals, original.globals, 'NBA_2004_PROTECTED_GAMEPLAY complete original global tape');
  assert.deepEqual(frames(actual, true), frames(original, false), 'NBA_2004_PROTECTED_GAMEPLAY complete original saved gameplay');
}
function assertReadOnlyClassView(j: Journey) {
  for (let i = 1; i < j.frames.length; i++) if (newViewActions.has(j.frames[i].action)) {
    assert.equal(j.frames[i].raw, j.frames[i - 1].raw, 'NBA_2004_CLASS_READ_ONLY fullsave');
    assert.equal(j.frames[i].globalAt, j.frames[i - 1].globalAt, 'NBA_2004_CLASS_READ_ONLY no global draw');
    assert.equal(j.frames[i].rngState, j.frames[i - 1].rngState, 'NBA_2004_CLASS_READ_ONLY checkpoint');
  }
}
function assertLegacyPending() {
  assert.ok(legacyPending.frames.every(f => !f.save?.c || block(f.save.c) === undefined), 'NBA_2004_LEGACY_EXACT pending no opt-in');
  const boundary = originalRoad.frames.findIndex((f: Frame) => f.action === 'PENDING real remount');
  const originalFrames = originalRoad.frames.slice(boundary);
  const actualBoundary = legacyPending.frames.findIndex(f => f.action === 'PENDING real remount');
  const actualFrames = legacyPending.frames.slice(actualBoundary);
  const offset = originalFrames[0].globalAt;
  const project = (frames: Frame[], delta: number) => frames.map(f => ({
    action: f.action, raw: f.raw, text: f.text, globalAt: f.globalAt + delta, rngState: f.rngState }));
  assert.deepEqual(legacyPending.globals, originalRoad.globals.slice(offset), 'NBA_2004_LEGACY_EXACT authenticated pending suffix tape');
  assert.deepEqual(project(actualFrames, offset), project(originalFrames, 0), 'NBA_2004_LEGACY_EXACT authenticated pending full-save suffix');
}

describe('NBA 2004 historical draft outcomes', () => {
  it('new 2003 UI career exposes all 59 real selections after the 2003 season', () => {
    const j = search[0];
    const c = finalCareer(j);
    assert.deepEqual(draftRows.map(r => ({ id: r.id, pick: r.pick, name: r.name, families: [...r.families], dob: r.dob })),
      spec.expectedClass.map((r: any) => ({ id: r.id, pick: r.pick, name: r.name, families: r.broadFamilies, dob: r.dateOfBirth })),
      'NBA_2004_CLASS_FACTS');
    for (const actual of search) {
      assertProtectedGameplay(actual, originals['raw/journeys/' + actual.key + '.json']);
      assertReadOnlyClassView(actual);
      for (const f of actual.frames) if (f.save?.c) {
        const b = block(f.save.c);
        assert.equal(b?.v, 1, 'NBA_2004_CLASS_ARRIVAL new UI marker');
        assert.deepEqual(b.ids, f.save.c.year < 2004 ? [] : spec.expectedClass.map((r: any) => r.id), 'NBA_2004_CLASS_ARRIVAL exact once');
      }
    }
    assert.deepEqual(identities(c), spec.expectedClass.map((r: any) => r.id), 'NBA_2004_CLASS_ARRIVAL');
    const entered = (j.input as any).entered.save.c;
    assert.ok(identities(entered) === undefined || identities(entered).length === 0, 'NBA_2004_CLASS_ARRIVAL absent before2004');
    const cv = j.classView as any;
    assert.ok(cv?.openerPresent, 'NBA_2004_CLASS_ARRIVAL visible entry');
    const text = cv?.opened?.text ?? '';
    assert.ok(spec.expectedClass.every((r: any) => text.includes(r.name)), 'NBA_2004_CLASS_ARRIVAL all59 actual UI text');
    assert.deepEqual(cv.rows?.map((row: any) => row.id), spec.expectedClass.map((r: any) => r.id), 'NBA_2004_CLASS_ARRIVAL 59 distinct actual list rows');
    spec.expectedClass.forEach((r: any, i: number) => assert.ok(cv.rows[i].text.includes('Pick ' + r.pick + ': ' + r.name)
      && cv.rows[i].text.includes('Born: ' + (r.dateOfBirth ?? 'Unknown, sources disagree')), 'NBA_2004_CLASS_ARRIVAL factual row ' + r.id));
  });
  it('new Road to the Draft opts in before pending reload and reaches the real 2003 career', () => {
    const pending = (road.input as any)?.pending?.save?.prospect;
    assert.equal(pending?.draftClassPolicy, 'nba-draft-2004-v1', 'NBA_2004_NEW_PROSPECT_POLICY');
    const remounted = road.frames.find(f => f.action === 'PENDING real remount');
    assert.equal(remounted?.save?.prospect?.draftClassPolicy, 'nba-draft-2004-v1', 'NBA_2004_NEW_PROSPECT_POLICY actual reload');
    assert.deepEqual(identities(finalCareer(road)), spec.expectedClass.map((r: any) => r.id), 'NBA_2004_NEW_PROSPECT_POLICY arrival');
    assertProtectedGameplay(road, originalRoad);
  });
  it('the actual 2004 camp has a persistent real-identity participant and unchanged healthy role effects', () => {
    for (const key of ['promotion','loss','starterHold','demotion','G','F','C']) {
      const j = found[key];
      const old = originals['raw/journeys/' + j.key + '.json'];
      const camp = j.camps.find(x => x.before.year === 2004)!;
      const oldCamp = old.camps.find((x: any) => x.before.year === 2004);
      assert.deepEqual(camp.draws, oldCamp.draws, 'NBA_2004_CAMP_PARTICIPANT old draw tape');
      assert.deepEqual(withoutFeature(camp.before), oldCamp.before, 'NBA_2004_CAMP_PARTICIPANT old before state');
      assert.deepEqual(withoutFeature(camp.after), oldCamp.after, 'NBA_2004_CAMP_PARTICIPANT old role/morale state');
      const b = block(camp.after);
      assert.deepEqual(b?.ids, spec.expectedClass.map((r: any) => r.id), 'NBA_2004_CAMP_PARTICIPANT full59');
      const visits = b?.visits;
      assert.ok(Array.isArray(visits) && visits.length === (block(camp.before)?.visits.length ?? 0) + 1, 'NBA_2004_CAMP_PARTICIPANT one actual visit');
      const v = visits[visits.length - 1];
      assert.deepEqual(Object.keys(v).sort(), ['year','id','team','family','comparison','roleBefore','roleAfter','moraleBefore','moraleAfter'].sort(), 'NBA_2004_CAMP_PARTICIPANT schema');
      const family = camp.before.pos === 'C' ? 'C' : ['PG','SG'].includes(camp.before.pos) ? 'G' : 'F';
      const eligible = spec.expectedClass.filter((r: any) => r.broadFamilies.includes(family));
      const expected = eligible[Math.max(0, camp.before.draftPick - 1) % eligible.length];
      assert.deepEqual(v, { year: 2004, id: expected.id, team: camp.before.team, family,
        comparison: Math.round(oldCamp.quality - 7 + oldCamp.draws[0] * 8),
        roleBefore: camp.before.role, roleAfter: camp.after.role,
        moraleBefore: camp.before.morale, moraleAfter: camp.after.morale }, 'NBA_2004_CAMP_PARTICIPANT actual receipt');
      assert.ok(camp.note?.startsWith('Simulated camp matchup: ' + expected.name + '. '), 'NBA_2004_CAMP_PARTICIPANT real named narration');
    }
    const campText = (persistence.classView as any)?.campText ?? '';
    assert.ok(campText.includes('Your simulated 2004 camps'), 'NBA_2004_CAMP_PARTICIPANT visible camp record');
    for (const visit of block(finalCareer(persistence))?.visits ?? []) {
      const person = spec.expectedClass.find((r: any) => r.id === visit.id);
      const role = (value: string) => value === 'starter' ? 'Starting five' : 'Second unit';
      assert.ok(person && campText.includes(person.name) && campText.includes('Simulated comparison: ' + visit.comparison)
        && campText.includes(role(visit.roleBefore) + ' to ' + role(visit.roleAfter) + '. Morale ' + visit.moraleBefore + ' to ' + visit.moraleAfter + '.'),
        'NBA_2004_CAMP_PARTICIPANT visible actual named receipt');
    }
  });
  it('all factual identities survive actual reload and later real free-agency signing', () => {
    assert.ok(persistence.faSigned, 'Setup must reach actual FA');
    assertProtectedGameplay(persistence, originals['raw/journeys/persistence-3-SF.json']);
    assertReadOnlyClassView(persistence);
    assert.deepEqual(identities(finalCareer(persistence)), spec.expectedClass.map((r: any) => r.id), 'NBA_2004_PERSISTED_IDENTITIES');
    assert.equal(new Set(identities(finalCareer(persistence))).size, 59, 'NBA_2004_PERSISTED_IDENTITIES unique');
    assert.ok((persistence.classView as any)?.openerPresent
      && spec.expectedClass.every((r: any) => (persistence.classView as any)?.opened?.text.includes(r.name)),
      'NBA_2004_PERSISTED_IDENTITIES actual reopened full59 UI');
    const reloaded = persistence.frames.find(f => f.action === 'RELOAD actual post-2004 save');
    const visits = block(reloaded?.save?.c)?.visits;
    assert.ok(Array.isArray(visits) && visits.length > 0, 'NBA_2004_PERSISTED_IDENTITIES saved camp history');
    const afterVisits = block(finalCareer(persistence))?.visits;
    assert.ok(Array.isArray(afterVisits), 'NBA_2004_PERSISTED_IDENTITIES visit record');
    assert.deepEqual(afterVisits.slice(0, visits.length), visits, 'NBA_2004_PERSISTED_IDENTITIES old visit prefix byte-exact');
    const actualLater = persistence.camps.filter(c => c.globalStart >= (reloaded?.globalAt ?? Infinity));
    for (const visit of afterVisits.slice(visits.length)) {
      const at = actualLater.findIndex(c => c.before.year === visit.year && c.before.team === visit.team
        && c.before.role === visit.roleBefore && c.after.role === visit.roleAfter
        && c.before.morale === visit.moraleBefore && c.after.morale === visit.moraleAfter
        && spec.expectedClass.some((r: any) => r.id === visit.id && r.broadFamilies.includes(
          c.before.pos === 'C' ? 'C' : ['PG','SG'].includes(c.before.pos) ? 'G' : 'F')));
      assert.ok(at >= 0, 'NBA_2004_PERSISTED_IDENTITIES later visit must belong to one actual camp');
      actualLater.splice(at, 1);
    }
  });
  it('unmarked original career replay current era and other sport creations remain healthy and cohort absent', () => {
    assert.equal(legacy.exact, true, 'NBA_2004_LEGACY_EXACT complete original save/text/global replay');
    assert.deepEqual(projection(legacy.one as Journey), projection(originalLegacy.one), 'NBA_2004_LEGACY_EXACT authenticated original professional');
    assert.deepEqual(projection(legacy.two as Journey), projection(originalLegacy.two), 'NBA_2004_LEGACY_EXACT original repeated professional');
    assertLegacyPending();
    const one = legacy.one as Journey;
    assert.ok(one.frames.every(f => !f.save?.c || block(f.save.c) === undefined), 'NBA_2004_LEGACY_EXACT absent original block');
    const currentEra = legacy.currentEra as Journey;
    assert.equal(finalCareer(currentEra)?.year, 2026, 'NBA_2004_LEGACY_EXACT actual current creation');
    assert.equal(block(finalCareer(currentEra)), undefined, 'NBA_2004_LEGACY_EXACT current absent');
    assert.deepEqual(projection(currentEra), projection(originalLegacy.currentEra), 'NBA_2004_LEGACY_EXACT original current era');
    for (const j of legacy.other as Journey[]) {
      const key = j.mode + '-my-career-save-v1';
      const f = [...j.frames].reverse().find(x => x.action === 'OTHER complete save');
      assert.ok(f?.save?.c && Number.isSafeInteger(f.save.c.year), 'NBA_2004_LEGACY_EXACT other actual creation ' + key);
      assert.equal(block(f?.save?.c), undefined, 'NBA_2004_LEGACY_EXACT other absent');
      assert.deepEqual(projection(j), projection(originalLegacy.other.find((x: any) => x.mode === j.mode)),
        'NBA_2004_LEGACY_EXACT original ' + j.mode);
    }
  });
});
