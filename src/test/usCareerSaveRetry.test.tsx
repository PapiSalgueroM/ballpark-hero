import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { bankTrainingRating } from '@/lib/careerTraining';
import { createUsCareerProspect, type UsCareerProspect } from '@/lib/usCareerProspect';
import { preDraftPlaySeason, preDraftStart } from '@/lib/careerPreDraft';
import { answerSummerCard, dealSummer, newSummerSalt, seekSummerCard, summerOn } from '@/lib/usCareerSummer';
import { talkDeckFilter } from '@/lib/usCareerRetirementFlow';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const spies = vi.hoisted(() => ({ error: vi.fn(), completion: vi.fn(), activity: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: spies.completion, recordActivity: spies.activity, getCurrentPlayerName: () => 'Save fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: spies.error, dismiss: vi.fn() } }));

interface SportCase { label: string; Board: ComponentType; sport: UsCareerSport; burst: RegExp; drill: string }
const SPORTS: SportCase[] = [
  { label: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT, burst: /The 40/, drill: 'forty' },
  { label: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT, burst: /Lane Agility/, drill: 'lane' },
  { label: 'MLB', Board: MlbMyCareerBoard, sport: MLB_CAREER_SPORT, burst: /Home to First/, drill: 'first' },
  { label: 'NHL', Board: NhlMyCareerBoard, sport: NHL_CAREER_SPORT, burst: /Blue Line Sprint/, drill: 'sprint' },
];
type Save = { c: UsCareerCore | null; phase: string; teamQuality: number | null; coach: null; prospect?: UsCareerProspect };
type View = ReturnType<typeof render>;
type Attempt = { method: 'setItem' | 'removeItem'; key: string; value: string | null; refused: boolean };
const BASELINE = 'unchanged training rule preserves complete engine-created careers';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const encoded = (value: Save) => JSON.stringify(value);
const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
let attempts: Attempt[] = [], refusedKey = '', refusing = false, rngState = 1084, rngDraws = 0;
const stepRng = (state: number) => (Math.imul(1664525, state) + 1013904223) >>> 0;
function rngFrom(seed: number) { let state = seed; return () => { state = stepRng(state); return state / 4294967296; }; }
function rng() { let state = rngState; return { state, draws: rngDraws, next: Array.from({ length: 8 }, () => { state = stepRng(state); return state / 4294967296; }) }; }
const values = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const observe = () => ({ values: values(), attempts: clone(attempts), rng: rng(), errors: spies.error.mock.calls.length, completions: clone(spies.completion.mock.calls) });
function check(id: string, actual: unknown, expected: unknown, evidence: unknown = {}) {
  console.log('US_SAVE_RECORD|' + JSON.stringify({ id, actual, expected, evidence }));
  expect(actual, id).toEqual(expected);
}
function fixture(row: SportCase, retired = false): Save {
  const { sport } = row, pos = sport.create.defaultPos;
  const c = sport.startCareer('Save Recovery Player', pos, sport.create.archetypes[pos][0], rngFrom(81084), defaultAppearance(), 'now');
  // Explicit lifecycle fixture: known practice headroom and an optional already-retired save.
  Object.assign(c, { ovr: 70, pot: 90, health: 100, contractYears: 3, role: 'starter', retired });
  return { c, phase: retired ? 'retired' : 'season', teamQuality: 75, coach: null };
}
function seed(row: SportCase, save: Save | null) {
  for (const other of SPORTS) if (other !== row) nativeSet.call(localStorage, other.sport.saveKey, encoded(fixture(other)));
  nativeSet.call(localStorage, 'save-recovery-protected', 'unrelated exact bytes');
  if (save) nativeSet.call(localStorage, row.sport.saveKey, encoded(save));
  else nativeRemove.call(localStorage, row.sport.saveKey);
  refusedKey = row.sport.saveKey; attempts = [];
}
const mount = (row: SportCase) => render(<StrictMode><MemoryRouter><row.Board /></MemoryRouter></StrictMode>);
const notice = (view: View) => view.container.querySelector<HTMLElement>('[data-us-career-save-error]');
function assertNotice(view: View, operation: 'write' | 'remove', id: string) {
  const node = notice(view);
  check(id, { exists: !!node, role: node?.getAttribute('role'), operation: node?.getAttribute('data-save-operation'), retry: node?.querySelector('button')?.textContent?.trim(), text: node?.querySelector('p')?.textContent }, {
    exists: true, role: 'alert', operation, retry: 'Retry save', text: operation === 'remove'
      ? 'Your reset has not been saved. This device may still load the previous career. Stay on this page and retry, or create a new player to replace it.'
      : 'Your latest progress has not been saved. Stay on this page and try again.',
  }, observe());
}
function latest(row: SportCase, id: string): string {
  const writes = attempts.filter(a => a.key === row.sport.saveKey && a.method === 'setItem');
  check(id, writes.length > 0, true, observe());
  return writes[writes.length - 1].value!;
}
function retry(view: View, row: SportCase, bytes: string | null, id: string, twice = false) {
  const before = observe(), button = view.queryByRole('button', { name: 'Retry save' });
  check(id + ': available', !!button, true, before);
  act(() => { fireEvent.click(button!); if (twice) fireEvent.click(button!); });
  const after = observe();
  check(id, { rng: after.rng, completions: after.completions, attempts: after.attempts.slice(before.attempts.length), values: after.values, notice: notice(view)?.getAttribute('data-save-operation') ?? null, errors: after.errors }, {
    rng: before.rng, completions: before.completions,
    attempts: [{ method: bytes === null ? 'removeItem' : 'setItem', key: row.sport.saveKey, value: bytes, refused: refusing }],
    values: refusing ? before.values : bytes === null ? Object.fromEntries(Object.entries(before.values).filter(([key]) => key !== row.sport.saveKey)) : { ...before.values, [row.sport.saveKey]: bytes },
    notice: refusing ? bytes === null ? 'remove' : 'write' : null, errors: before.errors,
  }, { before, after, expectedPayload: bytes });
}
function reload(row: SportCase, view: View, bytes: string | null, id: string, expectedPhase: 'season' | 'create' | 'prospect') {
  const before = observe(); view.unmount(); const again = mount(row);
  check(id, { bytes: localStorage.getItem(row.sport.saveKey), values: values(), attempts: attempts.slice(before.attempts.length), notice: !!notice(again), phase: expectedPhase === 'season' ? !!again.queryByRole('button', { name: /^Play the \d+ season$/ }) : expectedPhase === 'create' ? !!again.queryByRole('button', { name: 'Enter the draft' }) : !!again.container.querySelector('[data-prospect-journey]') }, {
    bytes, values: before.values, attempts: [], notice: false, phase: true,
  }, { before, after: observe() });
  return again;
}
function reset(view: View) {
  fireEvent.click(view.getByRole('button', { name: 'New career' }));
  fireEvent.click(within(view.getByRole('alertdialog')).getByRole('button', { name: 'Start new career' }));
}
function prospect(row: SportCase): UsCareerProspect {
  const { sport } = row, pos = sport.create.defaultPos;
  return createUsCareerProspect(sport, { name: 'Recovery Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: defaultAppearance(), seed: `${sport.slug}:save-retry-1084` });
}
const prospectSave = (p: UsCareerProspect): Save => ({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: p });
function summerFixture(row: SportCase): Save {
  const { sport } = row;
  for (let seedNumber = 21; seedNumber < 321; seedNumber++) {
    const random = rngFrom(seedNumber), pos = sport.create.defaultPos;
    const c = sport.startCareer('Recovery Summer', pos, sport.create.archetypes[pos][0], random, defaultAppearance(), 'now');
    c.summerSalt = 'fixture'; let tq = sport.rollTeamQuality(null, random); sport.assignRole(c, tq, random);
    for (let y = 0; y < 3; y++) { sport.campBattle(c, tq, random); sport.simSeason(c, tq, random); sport.progress(c, random); tq = sport.rollTeamQuality(tq, random); }
    // Match the existing summer fixture boundary: no competing rivalry or contract screen.
    c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; c.contractYears = Math.max(c.contractYears, 2);
    if (sport.shouldRetire(c) || (c.suspendedSeasons ?? 0) > 0) continue;
    dealSummer(c, sport, talkDeckFilter(c, sport.hall));
    if ((c.summer?.ids.length ?? 0) < 2) continue;
    const probe = clone(c), first = seekSummerCard(probe, sport, talkDeckFilter(probe, sport.hall));
    if (!first) continue;
    const result = answerSummerCard(probe, sport, first, 0, rngFrom(1084), talkDeckFilter(probe, sport.hall));
    if (result.next) return { c, phase: 'event', teamQuality: tq, coach: null };
  }
  throw new Error(`${row.label}: no actual two-card summer fixture in 300 seeds`);
}

vi.setConfig({ testTimeout: 30000 });
beforeAll(async () => {
  await import('@/components/us-career/UsCareerPractice');
  await Promise.all(SPORTS.map(row => row.sport.loadTraining(row.sport.create.defaultPos)));
}, 120000);
beforeEach(() => {
  localStorage.clear(); attempts = []; refusing = false; refusedKey = ''; rngState = 1084; rngDraws = 0;
  spies.error.mockClear(); spies.completion.mockClear(); spies.activity.mockClear();
  vi.spyOn(Date, 'now').mockReturnValue(1790985600000);
  vi.spyOn(Math, 'random').mockImplementation(() => { rngState = stepRng(rngState); rngDraws++; return rngState / 4294967296; });
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    const refused = refusing && key === refusedKey; attempts.push({ method: 'setItem', key, value: String(value), refused });
    if (refused) throw new DOMException('Controlled quota refusal', 'QuotaExceededError'); nativeSet.call(this, key, value);
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (key) {
    const refused = refusing && key === refusedKey; attempts.push({ method: 'removeItem', key, value: null, refused });
    if (refused) throw new DOMException('Controlled removal refusal', 'SecurityError'); nativeRemove.call(this, key);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it(BASELINE, () => {
  const before = SPORTS.map(row => fixture(row)), frozen = clone(before), randomBefore = rng();
  const after = before.map(save => ({ ...clone(save), c: { ...clone(save.c!), ovr: bankTrainingRating(save.c!.ovr, save.c!.pot, 80).ovr } }));
  check(BASELINE, { after, inputs: before, rng: rng(), storage: values() }, { after: frozen.map(save => ({ ...clone(save), c: { ...clone(save.c!), ovr: 72 } })), inputs: frozen, rng: randomBefore, storage: {} });
});

describe.each(SPORTS)('$label save recovery on the actual board', row => {
  it('quiet restore preserves all four save keys without claiming failure', () => {
    const original = fixture(row); seed(row, original); const before = observe(), view = mount(row);
    check(row.label + ': quiet restore', { bytes: localStorage.getItem(row.sport.saveKey), values: values(), attempts, notice: !!notice(view), errors: spies.error.mock.calls.length }, { bytes: encoded(original), values: before.values, attempts: [], notice: false, errors: 0 });
    reload(row, view, encoded(original), row.label + ': quiet reload', 'season');
  });

  it('refused played practice banks once and Retry saves exact gain without replay', async () => {
    const original = fixture(row); seed(row, original); const view = mount(row), durable = values();
    fireEvent.click(view.getByRole('button', { name: 'Start practice' }));
    await view.findByRole('button', { name: 'Practice rules' }, { timeout: 10000 });
    const dialog = view.getByRole('dialog'); fireEvent.click(within(dialog).getByRole('button', { name: row.burst }));
    vi.useFakeTimers(); fireEvent.click(within(dialog).getByRole('button', { name: /Tap to start/ }));
    const floor = within(dialog).getByRole('button', { name: /GO GO GO/ });
    for (let tap = 0; tap < 25; tap++) fireEvent.click(floor);
    act(() => { vi.advanceTimersByTime(5000); }); vi.useRealTimers();
    check(row.label + ': played score', dialog.querySelector('[data-training-score]')?.textContent, '80');
    refusing = true; const button = within(dialog).getByRole('button', { name: 'Bank the session' });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    const expected: Save = { ...clone(original), c: { ...clone(original.c!), ovr: 72, practice: { ovr: 72, tier: 2, gain: 2, year: original.c!.year, drill: row.drill, score: 80, before: 70 } } };
    const bytes = latest(row, row.label + ': practice attempted');
    check(row.label + ': complete practice result', { save: JSON.parse(bytes), durable: values(), count: attempts.filter(a => a.key === row.sport.saveKey).length, errors: spies.error.mock.calls.length }, { save: expected, durable, count: 1, errors: 1 }, observe());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to your career' }));
    assertNotice(view, 'write', row.label + ': practice refusal visible');
    retry(view, row, bytes, row.label + ': repeated refused practice Retry');
    refusing = false; retry(view, row, bytes, row.label + ': accepted practice Retry', true);
    check(row.label + ': gain still banked once', { text: view.container.querySelector('[data-practice-receipt]')?.textContent, canPlay: !!view.queryByRole('button', { name: 'View practice' }) }, { text: `Rating +2. OVR 70 to 72. Session banked for ${original.c!.year}.`, canPlay: true });
    reload(row, view, bytes, row.label + ': practice reload', 'season');
  });

  it('two actual summer answers replace the pending payload and Retry does not answer again', () => {
    const original = summerFixture(row); seed(row, original); const view = mount(row), durable = values();
    refusing = true; let expected = clone(original), firstBytes = '';
    for (let turn = 0; turn < 2; turn++) {
      const before = observe(), random = rngFrom(before.rng.state), c = clone(expected.c!);
      const card = seekSummerCard(c, row.sport, talkDeckFilter(c, row.sport.hall));
      check(row.label + ': actual summer card ' + turn, view.container.querySelector('[data-career-event]')?.getAttribute('data-career-event'), card?.id);
      const result = answerSummerCard(c, row.sport, card!, 0, random, talkDeckFilter(c, row.sport.hall));
      expected = { c, phase: result.next ? 'event' : 'season', teamQuality: result.next ? expected.teamQuality : row.sport.rollTeamQuality(expected.teamQuality, random), coach: null };
      const option = view.container.querySelector<HTMLButtonElement>('[data-career-decision-option="0"]')!;
      act(() => { fireEvent.click(option); fireEvent.click(option); });
      const bytes = latest(row, row.label + ': summer attempted ' + turn);
      check(row.label + ': full actual summer consequence ' + turn, { save: JSON.parse(bytes), durable: values(), receipt: !!view.container.querySelector('[data-career-decision-outcome]') }, { save: expected, durable, receipt: true }, { before, after: observe(), card });
      assertNotice(view, 'write', row.label + ': summer refusal ' + turn);
      if (turn === 0) { firstBytes = bytes; fireEvent.click(view.container.querySelector<HTMLButtonElement>('[data-decision-continue]')!); }
    }
    const bytes = latest(row, row.label + ': latest summer bytes');
    check(row.label + ': two distinct consequences', bytes !== firstBytes, true);
    retry(view, row, bytes, row.label + ': still refused summer Retry');
    refusing = false; retry(view, row, bytes, row.label + ': latest summer Retry');
    const beforeReload = observe(); view.unmount(); const again = mount(row);
    const card = expected.c!.summer ? seekSummerCard(clone(expected.c!), row.sport, talkDeckFilter(expected.c!, row.sport.hall)) : null;
    check(row.label + ': summer reload', { bytes: localStorage.getItem(row.sport.saveKey), values: values(), attempts: attempts.slice(beforeReload.attempts.length), card: again.container.querySelector('[data-career-event]')?.getAttribute('data-career-event') ?? null, notice: !!notice(again) }, { bytes, values: beforeReload.values, attempts: [], card: card?.id ?? null, notice: false }, { beforeReload, after: observe(), expected });
  });

  it('real prospect route and season replace refused progress and restore the latest choice', () => {
    const initial = prospect(row); seed(row, prospectSave(initial)); const view = mount(row), durable = values(), desc = row.sport.preDraft(initial.eraId);
    refusing = true;
    const started = { ...initial, state: preDraftStart(desc, { seed: initial.seed, routeId: desc.routes[0].id, rating: initial.rating, pot: initial.pot, pos: initial.pos }) };
    fireEvent.click(view.getByRole('button', { name: new RegExp(desc.routes[0].label) }));
    const first = latest(row, row.label + ': prospect route attempted');
    check(row.label + ': actual prospect route', JSON.parse(first), prospectSave(started), observe());
    assertNotice(view, 'write', row.label + ': prospect refusal visible');
    const played = { ...started, state: preDraftPlaySeason(desc, started.state) };
    fireEvent.click(view.getByRole('button', { name: /Play (your first|the next) season/ }));
    const bytes = latest(row, row.label + ': prospect season attempted');
    check(row.label + ': full prospect season', { save: JSON.parse(bytes), durable: values(), different: bytes !== first, errors: spies.error.mock.calls.length }, { save: prospectSave(played), durable, different: true, errors: 1 }, observe());
    retry(view, row, bytes, row.label + ': refused prospect Retry');
    refusing = false; retry(view, row, bytes, row.label + ': latest prospect Retry');
    const again = reload(row, view, bytes, row.label + ': prospect reload', 'prospect');
    check(row.label + ': restored prospect phase', again.container.querySelector('[data-prospect-phase]')?.getAttribute('data-prospect-phase'), played.state.phase);
  });

  it('refused occupied reset queues removal and Retry really deletes only this sport', () => {
    seed(row, fixture(row, true)); const view = mount(row), durable = values(); refusing = true; reset(view);
    assertNotice(view, 'remove', row.label + ': reset refusal visible');
    check(row.label + ': reset remains local', { values: values(), create: !!view.queryByRole('button', { name: 'Enter the draft' }), attempts }, { values: durable, create: true, attempts: [{ method: 'removeItem', key: row.sport.saveKey, value: null, refused: true }] });
    retry(view, row, null, row.label + ': refused reset Retry');
    refusing = false; retry(view, row, null, row.label + ': accepted removal');
    reload(row, view, null, row.label + ': removed reload', 'create');
  });

  it('a later ordinary prospect save clears refusal using the newest progress', () => {
    const initial = prospect(row); seed(row, prospectSave(initial)); const view = mount(row), durable = values(), desc = row.sport.preDraft(initial.eraId);
    refusing = true;
    const started = { ...initial, state: preDraftStart(desc, { seed: initial.seed, routeId: desc.routes[0].id, rating: initial.rating, pot: initial.pot, pos: initial.pos }) };
    fireEvent.click(view.getByRole('button', { name: new RegExp(desc.routes[0].label) }));
    const first = latest(row, row.label + ': ordinary route attempted');
    check(row.label + ': ordinary route refused', { save: JSON.parse(first), durable: values() }, { save: prospectSave(started), durable }, observe());
    assertNotice(view, 'write', row.label + ': ordinary refusal visible');
    const played = { ...started, state: preDraftPlaySeason(desc, started.state) }, expected = encoded(prospectSave(played)), before = observe();
    refusing = false; fireEvent.click(view.getByRole('button', { name: /Play (your first|the next) season/ }));
    check(row.label + ': newest ordinary save', { bytes: localStorage.getItem(row.sport.saveKey), values: values(), attempts: attempts.slice(before.attempts.length), notice: !!notice(view), errors: spies.error.mock.calls.length, completions: spies.completion.mock.calls, rng: rng() }, {
      bytes: expected, values: { ...durable, [row.sport.saveKey]: expected }, attempts: [{ method: 'setItem', key: row.sport.saveKey, value: expected, refused: false }], notice: false, errors: 1, completions: before.completions, rng: before.rng,
    }, { before, after: observe(), initial, expected: prospectSave(played) });
    reload(row, view, expected, row.label + ': ordinary recovery reload', 'prospect');
  });

  it('a new actual draft supersedes queued deletion with the latest career', () => {
    seed(row, fixture(row, true)); const view = mount(row), durable = values(); refusing = true; reset(view);
    assertNotice(view, 'remove', row.label + ': queued deletion');
    fireEvent.change(view.getByRole('textbox', { name: 'Your player name' }), { target: { value: 'Replacement Player' } });
    const before = observe(), random = rngFrom(before.rng.state), sport = row.sport, pos = sport.create.defaultPos;
    const c = sport.startCareer('Replacement Player', pos, sport.create.archetypes[pos][0], random, defaultAppearance(), 'now');
    const teamQuality = sport.rollTeamQuality(null, random); sport.assignRole(c, teamQuality, random); sport.draftNightInbox(c);
    if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(random);
    fireEvent.click(view.getByRole('button', { name: 'Enter the draft' }));
    const bytes = latest(row, row.label + ': replacement attempted');
    check(row.label + ': full replacement draft', { save: JSON.parse(bytes), durable: values() }, { save: { c, phase: 'season', teamQuality, coach: null }, durable }, { before, after: observe() });
    assertNotice(view, 'write', row.label + ': replacement refusal visible');
    retry(view, row, bytes, row.label + ': refused replacement Retry');
    refusing = false; retry(view, row, bytes, row.label + ': replacement saved');
    reload(row, view, bytes, row.label + ': replacement reload', 'season');
  });

  it('Back from an unsaved prospect queues an honest empty-key removal', () => {
    seed(row, null); const view = mount(row), durable = values(); refusing = true;
    fireEvent.change(view.getByRole('textbox', { name: 'Your player name' }), { target: { value: 'Unsaved Prospect' } });
    fireEvent.click(view.getByRole('button', { name: 'Play your road to the draft' }));
    latest(row, row.label + ': new prospect attempted'); assertNotice(view, 'write', row.label + ': new prospect refusal');
    fireEvent.click(view.getByRole('button', { name: 'Back to player' }));
    assertNotice(view, 'remove', row.label + ': empty removal visible');
    check(row.label + ': empty key stays empty', { values: values(), create: !!view.queryByRole('button', { name: 'Enter the draft' }), last: attempts[attempts.length - 1] }, { values: durable, create: true, last: { method: 'removeItem', key: row.sport.saveKey, value: null, refused: true } }, observe());
    refusing = false; retry(view, row, null, row.label + ': empty removal Retry');
    reload(row, view, null, row.label + ': empty removal reload', 'create');
  });
});
