import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { AIVerdict, Formation } from '@/types/lineupBuilder';

/* Round1403 proposal. All players and clubs are fictional. The real formation,
   position rules, selection actions and completion hook run. Only transport,
   the offline judge and recorder/auth/badge side effects are fixtures.
   Replies can settle after abandonment, so correctness cannot depend only on
   a cooperating fetch abort. Every external operation is stubbed; the hook
   runs in the remote test process. */
const fixture = vi.hoisted(() => ({
  teams: Array.from({ length: 11 }, (_, i) => ({ name: 'Fixture Harbor ' + (i + 1), isNation: false })),
  local: vi.fn<(names: string[]) => Promise<AIVerdict>>(),
  record: vi.fn<(...args: unknown[]) => void>(),
  badges: vi.fn<() => Promise<never[]>>(), refresh: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/data/lineupTeams', () => ({
  getRandomTeamAssignments: () => fixture.teams.map(team => ({ ...team })),
  clubs: fixture.teams.map(team => team.name), nations: [],
  CLUB_TABLE_NAMES: Object.fromEntries(fixture.teams.map(team => [team.name, [team.name]])),
}));
vi.mock('@/lib/squadDeal', async () => ({ normalizePosition: (await import('@/lib/squadShape')).normalizePosition }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: fixture.local }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-only' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: fixture.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => 'Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: fixture.badges }));
vi.mock('sonner', () => ({ toast: { success: fixture.toast } }));

import { useLineupBuilder } from '@/hooks/useLineupBuilder';

const CASE_TITLES = {
  resetSuccess: 'reset keeps a late success out and releases evaluation busy',
  formationJson: 'a new formation keeps a late JSON verdict out',
  nonOkFallback: 'reset drops a non-ok fallback already being judged',
  thrownFallback: 'reset drops a thrown-request fallback already being judged',
  rejectedFallback: 'a rejected abandoned fallback cannot start another judge',
  replacement: 'an old evaluation cannot clear or overwrite the next game',
  unmount: 'unmount ignores a late request error without judging it',
  remote: 'ordinary remote success posts the whole chosen XI and records once',
  sparse: 'sparse successful replies keep the existing default verdict',
  nonOk: 'ordinary non-ok replies still finish with the offline judge',
  thrown: 'ordinary thrown requests still finish with the offline judge',
  nestedError: 'ordinary nested local failures keep the current error verdict',
} as const;
const REMOTE: AIVerdict = { rating: 'Fixture remote rating', headline: 'Fixture remote headline', analysis: 'Fixture remote analysis' };
const LOCAL: AIVerdict = { rating: 'Fixture local rating', headline: 'Fixture local headline', analysis: 'Fixture local analysis' };
const NEW: AIVerdict = { rating: 'Fixture new rating', headline: 'Fixture new headline', analysis: 'Fixture new analysis' };
const ERROR: AIVerdict = { rating: 'Error', headline: 'Could not evaluate', analysis: 'Network error. Please check your connection and try again.' };
const ENDPOINT = 'https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/evaluate-lineup';
const cases: Partial<Record<keyof typeof CASE_TITLES, unknown>> = {};
type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void; label: string; settled: boolean };
let deferreds: { label: string; settled: boolean }[] = [];
function deferred<T>(label: string, retain = true): Deferred<T> {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const value: Deferred<T> = { label, settled: false, promise: new Promise<T>((yes, no) => { resolve = yes; reject = no; }),
    resolve: result => { value.settled = true; resolve(result); }, reject: error => { value.settled = true; reject(error); } };
  if (retain) deferreds.push(value);
  return value;
}
type RequestRow = { url: string; method: string | undefined; contentType: string | null; body: unknown; signalAtCall: boolean | null };
let queue: Deferred<Response>[] = [], requests: RequestRow[] = [], jsonCalls: string[] = [], unexpected: string[] = [], draws: number[] = [], consoleErrors: unknown[][] = [];
let localPlans: (() => Promise<AIVerdict>)[] = [];
let beforeStores: ReturnType<typeof stores>;
function stores() {
  const entries = (storage: Storage) => Object.keys(storage).sort().map(key => [key, storage.getItem(key)] as [string, string | null]);
  return { local: entries(localStorage), session: entries(sessionStorage) };
}
const mount = () => renderHook(() => useLineupBuilder());
type Mounted = ReturnType<typeof mount>;
function state(view: Mounted) {
  const s = view.result.current;
  return { formation: s.formation, phase: s.phase, selectedPositionIndex: s.selectedPositionIndex,
    filledCount: s.filledCount, filledSlots: [...s.filledSlots].map(([index, slot]) => ({ index, slot: structuredClone(slot) })),
    teamAssignments: structuredClone(s.teamAssignments), verdict: structuredClone(s.verdict),
    isEvaluating: s.isEvaluating, isValidating: s.isValidating, validationError: s.validationError, isSpinning: s.isSpinning,
    completions: structuredClone(fixture.record.mock.calls) };
}
type State = ReturnType<typeof state>;
const postFor = (s: State) => ({ formation: s.formation, players: s.filledSlots.map(row => row.slot) });
const localCallFor = (s: State) => [s.filledSlots.map(row => row.slot.playerName)];
function request(label: string) { const gate = deferred<Response>(label); queue.push(gate); return gate; }
function reply(ok: boolean, body: unknown, label = 'immediate'): Response {
  return { ok, json: async () => { jsonCalls.push(label); return body; } } as Response;
}
function begin(view: Mounted) { let done!: Promise<void>; act(() => { done = view.result.current.evaluateTeam(); }); return done; }
async function fill(view: Mounted, prefix = 'Old', formation: Formation = '4-4-2') {
  act(() => view.result.current.selectFormation(formation));
  for (let index = 0; index < 11; index += 1) {
    const role = view.result.current.positions[index].role, name = 'Fixture ' + prefix + ' Player ' + (index + 1);
    act(() => view.result.current.selectPosition(index));
    await act(async () => { await view.result.current.submitPlayer(name, {
      rawName: name, rawPosition: role, position: role, club: fixture.teams[index].name,
    }); });
    if (index < 10) act(() => view.result.current.finishSpin());
  }
  const chosen = state(view);
  if (chosen.phase !== 'reviewing' || chosen.filledCount !== 11 || chosen.isValidating) throw new Error('SETUP: actual fixture actions did not finish eleven primary-position picks');
  return chosen;
}
function retain(key: keyof typeof CASE_TITLES, moments: unknown) {
  const evidence = { title: CASE_TITLES[key], moments, requests: structuredClone(requests), jsonCalls: [...jsonCalls],
    localCalls: structuredClone(fixture.local.mock.calls), completionCalls: structuredClone(fixture.record.mock.calls),
    consoleErrors: consoleErrors.map(args => args.map(value => value instanceof Error ? { name: value.name, message: value.message } : value)),
    storesBefore: beforeStores, storesAfter: stores(), draws: [...draws], unexpected: [...unexpected],
    deferred: deferreds.map(({ label, settled }) => ({ label, settled })) };
  cases[key] = evidence;
  return evidence;
}
function fixtureHeld(evidence: ReturnType<typeof retain>, posts: ReturnType<typeof postFor>[]) {
  expect(evidence.deferred.every(gate => gate.settled), 'SETUP: every retained promise must settle before assertions').toBe(true);
  expect(evidence.unexpected, 'SETUP: no undeclared transport or local judge call').toEqual([]);
  expect(evidence.requests.map(row => ({ url: row.url, method: row.method, contentType: row.contentType, body: row.body }))).toEqual(
    posts.map(body => ({ url: ENDPOINT, method: 'POST', contentType: 'application/json', body })));
  expect(evidence.storesAfter).toEqual(evidence.storesBefore);
  expect(evidence.draws).toEqual([]);
}
function abandoned(s: State) { return s.phase === 'formation' && s.formation === null && s.filledCount === 0 && s.verdict === null && s.completions.length === 0; }
function resultHeld(s: State, chosen: State, verdict: AIVerdict, finishes = 1) {
  expect(s).toMatchObject({ phase: 'result', formation: chosen.formation, filledCount: 11, filledSlots: chosen.filledSlots, verdict, isEvaluating: false, isValidating: false });
  expect(s.completions).toEqual(Array.from({ length: finishes }, () => ['/build-your-xi', 500, 'Fixture Guest', 0]));
}

beforeEach(async () => {
  vi.useRealTimers();
  // Warm React's first async act scheduler before recording its known setup draw.
  await act(async () => {});
  fixture.local.mockReset(); fixture.record.mockReset(); fixture.badges.mockReset().mockResolvedValue([]);
  fixture.refresh.mockReset(); fixture.toast.mockReset();
  queue = []; requests = []; jsonCalls = []; unexpected = []; draws = []; consoleErrors = []; localPlans = []; deferreds = [];
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('fixture-xi-evaluation', '{"held":true}'); sessionStorage.setItem('fixture-session', 'held'); beforeStores = stores();
  fixture.local.mockImplementation(() => {
    const plan = localPlans.shift();
    if (!plan) { unexpected.push('Undeclared local judge call'); return Promise.reject(new Error('SETUP: undeclared local judge')); }
    return plan();
  });
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, method: init?.method, contentType: new Headers(init?.headers).get('Content-Type'),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body ?? null, signalAtCall: init?.signal?.aborted ?? null });
    const next = queue.shift();
    if (url !== ENDPOINT || !next) { unexpected.push(url); return Promise.reject(new Error('SETUP: undeclared fetch')); }
    return next.promise;
  }));
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.6); return 0.6; });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { consoleErrors.push(args); });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
afterAll(() => {
  const out = process.env.XI_EVALUATION_RAW;
  if (out) { if (!isAbsolute(out)) throw new Error('XI_EVALUATION_RAW must be absolute'); writeFileSync(out, JSON.stringify({ version: 1, caseTitles: Object.values(CASE_TITLES), cases }, null, 2) + '\n', { flag: 'wx' }); }
});

describe('Build Your XI evaluation belongs to the current game', () => {
  it(CASE_TITLES.resetSuccess, async () => {
    const view = mount(), chosen = await fill(view), response = request('reset success response');
    const done = begin(view), during = state(view);
    act(() => view.result.current.resetGame()); const reset = state(view);
    await act(async () => { response.resolve(reply(true, REMOTE)); await done; });
    const settled = state(view), evidence = retain('resetSuccess', { chosen, during, reset, settled });
    fixtureHeld(evidence, [postFor(chosen)]);
    expect(abandoned(settled), 'Starting over must keep the abandoned XI from becoming a result').toBe(true);
    expect(during.isEvaluating).toBe(true); expect(reset.isEvaluating).toBe(false); expect(settled.isEvaluating).toBe(false);
    expect(evidence.localCalls).toEqual([]);
  });

  it(CASE_TITLES.formationJson, async () => {
    const view = mount(), chosen = await fill(view), response = request('formation response'), body = deferred<unknown>('formation JSON');
    const jsonStarted = deferred<void>('JSON entered', false), done = begin(view);
    await act(async () => { response.resolve({ ok: true, json: () => { jsonCalls.push('held'); jsonStarted.resolve(); return body.promise; } } as Response); await jsonStarted.promise; });
    act(() => view.result.current.selectFormation('4-3-3')); const next = state(view);
    await act(async () => { body.resolve(REMOTE); await done; });
    const settled = state(view), evidence = retain('formationJson', { chosen, next, settled });
    fixtureHeld(evidence, [postFor(chosen)]);
    expect(settled.phase === 'building' && settled.formation === '4-3-3' && settled.filledCount === 0 && settled.verdict === null && settled.completions.length === 0,
      'A new formation must not inherit the previous XI verdict').toBe(true);
    expect(next.isEvaluating).toBe(false); expect(settled.isEvaluating).toBe(false); expect(settled.teamAssignments).toEqual(fixture.teams);
  });

  it(CASE_TITLES.nonOkFallback, async () => {
    const view = mount(), chosen = await fill(view), response = request('non-ok response'), local = deferred<AIVerdict>('non-ok local');
    const entered = deferred<void>('local entered', false); localPlans.push(() => { entered.resolve(); return local.promise; }); const done = begin(view);
    await act(async () => { response.resolve(reply(false, { error: 'Fixture non-ok' })); await entered.promise; });
    const judging = state(view); act(() => view.result.current.resetGame()); const reset = state(view);
    await act(async () => { local.resolve(LOCAL); await done; });
    const settled = state(view), evidence = retain('nonOkFallback', { chosen, judging, reset, settled });
    fixtureHeld(evidence, [postFor(chosen)]);
    expect(abandoned(settled), 'A reset XI must ignore its abandoned non-ok fallback').toBe(true);
    expect(reset.isEvaluating).toBe(false); expect(settled.isEvaluating).toBe(false); expect(evidence.localCalls).toEqual([localCallFor(chosen)]);
  });

  it(CASE_TITLES.thrownFallback, async () => {
    const view = mount(), chosen = await fill(view), response = request('thrown response'), local = deferred<AIVerdict>('thrown local');
    const entered = deferred<void>('local entered', false); localPlans.push(() => { entered.resolve(); return local.promise; }); const done = begin(view);
    await act(async () => { response.reject(new Error('Fixture request failure')); await entered.promise; });
    const judging = state(view); act(() => view.result.current.resetGame()); const reset = state(view);
    await act(async () => { local.resolve(LOCAL); await done; });
    const settled = state(view), evidence = retain('thrownFallback', { chosen, judging, reset, settled });
    fixtureHeld(evidence, [postFor(chosen)]);
    expect(abandoned(settled), 'A reset XI must ignore its abandoned network fallback').toBe(true);
    expect(reset.isEvaluating).toBe(false); expect(settled.isEvaluating).toBe(false); expect(evidence.localCalls).toEqual([localCallFor(chosen)]);
  });

  it(CASE_TITLES.rejectedFallback, async () => {
    const view = mount(), chosen = await fill(view), response = request('nested response'), local = deferred<AIVerdict>('first local failure');
    const entered = deferred<void>('local entered', false);
    localPlans.push(() => { entered.resolve(); return local.promise; }, () => Promise.reject(new Error('Fixture second judge failure'))); const done = begin(view);
    await act(async () => { response.resolve(reply(false, {})); await entered.promise; });
    act(() => view.result.current.resetGame()); const reset = state(view);
    await act(async () => { local.reject(new Error('Fixture first judge failure')); await done; });
    const settled = state(view), evidence = retain('rejectedFallback', { chosen, reset, settled });
    fixtureHeld(evidence, [postFor(chosen)]);
    expect(abandoned(settled) && evidence.localCalls.length === 1, 'An abandoned fallback rejection must not start another judge or publish an error').toBe(true);
    expect(reset.isEvaluating).toBe(false); expect(settled.isEvaluating).toBe(false);
  });

  it(CASE_TITLES.replacement, async () => {
    async function pair(order: 'old-first' | 'new-first') {
      const view = mount(), completedBefore = fixture.record.mock.calls.length, chosen = await fill(view, order + ' Old'), old = request(order + ' old response'), oldDone = begin(view);
      act(() => view.result.current.resetGame()); const fresh = await fill(view, order + ' New', '4-3-3');
      const next = request(order + ' next response'), nextDone = begin(view), waiting = state(view);
      let middle: State;
      if (order === 'old-first') {
        await act(async () => { old.resolve(reply(true, REMOTE)); await oldDone; }); middle = state(view);
        await act(async () => { next.resolve(reply(true, NEW)); await nextDone; });
      } else {
        await act(async () => { next.resolve(reply(true, NEW)); await nextDone; }); middle = state(view);
        await act(async () => { old.resolve(reply(true, REMOTE)); await oldDone; });
      }
      const settled = state(view); view.unmount(); return { completedBefore, chosen, fresh, waiting, middle, settled };
    }
    const pending = await pair('old-first'), completed = await pair('new-first'), evidence = retain('replacement', { pending, completed });
    fixtureHeld(evidence, [postFor(pending.chosen), postFor(pending.fresh), postFor(completed.chosen), postFor(completed.fresh)]);
    expect(pending.middle.phase === 'reviewing' && pending.middle.isEvaluating && pending.middle.verdict === null && pending.middle.completions.length === pending.completedBefore
      && completed.settled.verdict?.rating === NEW.rating && completed.settled.phase === 'result',
      'An abandoned evaluation must leave the new game\'s busy state and result alone').toBe(true);
    resultHeld(pending.settled, pending.fresh, NEW, 1); resultHeld(completed.middle, completed.fresh, NEW, 2); resultHeld(completed.settled, completed.fresh, NEW, 2);
  });

  it(CASE_TITLES.unmount, async () => {
    const view = mount(), chosen = await fill(view), response = request('unmounted response'); localPlans.push(() => Promise.resolve(LOCAL));
    const done = begin(view), during = state(view); view.unmount(); const lastPublished = state(view);
    await act(async () => { response.reject(new Error('Fixture request after unmount')); await done; });
    const evidence = retain('unmount', { chosen, during, lastPublished, afterSettlement: state(view) });
    fixtureHeld(evidence, [postFor(chosen)]);
    expect(evidence.localCalls.length === 0, 'An unmounted XI must not start the offline judge after its request fails').toBe(true);
    expect(evidence.completionCalls).toEqual([]); expect(evidence.consoleErrors).toEqual([]);
  });

  it(CASE_TITLES.remote, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary remote response'), done = begin(view), during = state(view);
    await act(async () => { response.resolve(reply(true, REMOTE)); await done; });
    const settled = state(view), evidence = retain('remote', { chosen, during, settled }); fixtureHeld(evidence, [postFor(chosen)]);
    expect(during.isEvaluating).toBe(true); resultHeld(settled, chosen, REMOTE); expect(evidence.localCalls).toEqual([]); expect(evidence.consoleErrors).toEqual([]);
  });

  it(CASE_TITLES.sparse, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary sparse response'), done = begin(view);
    await act(async () => { response.resolve(reply(true, { headline: 'Fixture sparse headline' })); await done; });
    const settled = state(view), evidence = retain('sparse', { chosen, settled }); fixtureHeld(evidence, [postFor(chosen)]);
    resultHeld(settled, chosen, { rating: 'Mid-Table 😐', headline: 'Fixture sparse headline', analysis: 'Your squad has been evaluated.' });
    expect(evidence.localCalls).toEqual([]); expect(evidence.consoleErrors).toEqual([]);
  });

  it(CASE_TITLES.nonOk, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary non-ok response'); localPlans.push(() => Promise.resolve(LOCAL)); const done = begin(view);
    await act(async () => { response.resolve(reply(false, { error: 'Fixture refused' })); await done; });
    const settled = state(view), evidence = retain('nonOk', { chosen, settled }); fixtureHeld(evidence, [postFor(chosen)]); resultHeld(settled, chosen, LOCAL);
    expect(evidence.localCalls).toEqual([localCallFor(chosen)]); expect(evidence.consoleErrors).toEqual([]);
  });

  it(CASE_TITLES.thrown, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary thrown response'); localPlans.push(() => Promise.resolve(LOCAL)); const done = begin(view);
    await act(async () => { response.reject(new Error('Fixture request failure')); await done; });
    const settled = state(view), evidence = retain('thrown', { chosen, settled }); fixtureHeld(evidence, [postFor(chosen)]); resultHeld(settled, chosen, LOCAL);
    expect(evidence.localCalls).toEqual([localCallFor(chosen)]);
    expect(evidence.consoleErrors).toEqual([['Evaluation error:', { name: 'Error', message: 'Fixture request failure' }]]);
  });

  it(CASE_TITLES.nestedError, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary nested response');
    localPlans.push(() => Promise.reject(new Error('Fixture first judge failure')), () => Promise.reject(new Error('Fixture second judge failure'))); const done = begin(view);
    await act(async () => { response.resolve(reply(false, {})); await done; });
    const settled = state(view), evidence = retain('nestedError', { chosen, settled }); fixtureHeld(evidence, [postFor(chosen)]); resultHeld(settled, chosen, ERROR);
    expect(evidence.localCalls).toEqual([localCallFor(chosen), localCallFor(chosen)]);
    expect(evidence.consoleErrors).toEqual([['Evaluation error:', { name: 'Error', message: 'Fixture first judge failure' }]]);
  });
});
