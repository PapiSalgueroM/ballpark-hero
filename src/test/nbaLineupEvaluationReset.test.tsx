import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { NbaAIVerdict, StatChallenge } from '@/types/nba';
import type { PlayerEntity } from '@/lib/playerSearch';

/* Round1405. Fictional teams, players and challenges are prepared inputs, not
   sports data. The real NBA selection actions and completion hook run in the
   remote test process. Only transport, challenge/team draws, the local judge
   and recorder/auth/badge IO are fixtures. All five stat enrichments finish
   before evaluation, so this measures evaluation ownership only. */
const fixture = vi.hoisted(() => ({
  teams: Array.from({ length: 5 }, (_, i) => ({ name: 'Fixture Harbor ' + (i + 1), abbreviation: 'fh' + i })),
  challenge: vi.fn<() => StatChallenge>(),
  local: vi.fn<(names: string[], challengeLabel: string) => Promise<NbaAIVerdict>>(),
  record: vi.fn<(...args: unknown[]) => void>(),
  badges: vi.fn<() => Promise<never[]>>(), refresh: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/data/nbaTeams', () => ({ NBA_TEAMS: fixture.teams, getRandomNbaTeams: (count: number) => fixture.teams.slice(0, count).map(team => ({ ...team })) }));
vi.mock('@/data/nbaStats', () => ({ getRandomStatChallenge: fixture.challenge }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateNbaFive: fixture.local }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-only' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: fixture.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => 'Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: fixture.badges }));
vi.mock('sonner', () => ({ toast: { success: fixture.toast } }));

import { useNbaLineup } from '@/hooks/useNbaLineup';

const CASE_TITLES = {
  resetSuccess: 'reset keeps a late NBA verdict out and releases evaluation busy',
  resetJson: 'reset keeps a late NBA JSON verdict out',
  nonOkFallback: 'reset drops a non-ok NBA fallback already being judged',
  thrownFallback: 'reset drops a thrown NBA fallback already being judged',
  rejectedFallback: 'an abandoned NBA fallback rejection cannot set a new-game error',
  replacement: 'an old NBA evaluation cannot clear or overwrite the next game',
  unmount: 'unmount ignores a late NBA request error without judging it',
  remote: 'ordinary NBA remote success posts the chosen five and records once',
  nonOk: 'ordinary NBA non-ok replies still finish with the offline judge',
  thrown: 'ordinary NBA thrown requests still finish with the offline judge',
  malformed: 'ordinary malformed NBA replies still finish with the offline judge',
  nestedError: 'ordinary NBA local failures keep the existing retry error',
} as const;
const REMOTE: NbaAIVerdict = { rating: 'Fixture remote rating', headline: 'Fixture remote headline', analysis: 'Fixture remote analysis' };
const LOCAL: NbaAIVerdict = { rating: 'Fixture local rating', headline: 'Fixture local headline', analysis: 'Fixture local analysis' };
const NEW: NbaAIVerdict = { rating: 'Fixture new rating', headline: 'Fixture new headline', analysis: 'Fixture new analysis' };
const RETRY_ERROR = 'Could not evaluate your lineup. Please try again.';
const REVIEW_URL = 'https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/nba-evaluate-lineup';
const STAT_URL = 'https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/nba-validate-player';
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
type RequestRow = { kind: 'enrichment' | 'evaluation' | 'unexpected'; url: string; method: string | undefined; contentType: string | null; body: unknown; signalAtCall: boolean | null };
let queue: Deferred<Response>[] = [], requests: RequestRow[] = [], jsonCalls: string[] = [], unexpected: string[] = [], draws: number[] = [], consoleErrors: unknown[][] = [];
let localPlans: (() => Promise<NbaAIVerdict>)[] = [];
let beforeStores: ReturnType<typeof stores>;
function stores() {
  const entries = (storage: Storage) => Object.keys(storage).sort().map(key => [key, storage.getItem(key)] as [string, string | null]);
  return { local: entries(localStorage), session: entries(sessionStorage) };
}
const mount = () => renderHook(() => useNbaLineup());
type Mounted = ReturnType<typeof mount>;
function state(view: Mounted) {
  const s = view.result.current;
  return { phase: s.phase, challenge: structuredClone(s.challenge), selectedPosition: s.selectedPosition, currentTeam: structuredClone(s.currentTeam),
    filledCount: s.filledCount, filledSlots: [...s.filledSlots].map(([index, slot]) => ({ index, slot: structuredClone(slot) })),
    filledSlotsArray: structuredClone(s.filledSlotsArray), teamAssignments: structuredClone(s.teamAssignments), verdict: structuredClone(s.verdict),
    isEvaluating: s.isEvaluating, evaluationError: s.evaluationError, isValidating: s.isValidating, validationError: s.validationError,
    isStatSpinning: s.isStatSpinning, isTeamSpinning: s.isTeamSpinning, availablePositions: structuredClone(s.availablePositions), totalStat: s.totalStat,
    filledNormalizedNames: [...s.filledNormalizedNames].sort(), completions: structuredClone(fixture.record.mock.calls) };
}
type State = ReturnType<typeof state>;
const postFor = (s: State) => ({ players: s.filledSlots.map(row => row.slot), challenge: s.challenge });
const localCallFor = (s: State) => [s.filledSlots.map(row => row.slot.playerName), `${s.challenge?.direction === 'highest' ? 'Highest' : 'Lowest'} ${s.challenge?.stat}`];
function request(label: string) { const gate = deferred<Response>(label); queue.push(gate); return gate; }
function reply(ok: boolean, body: unknown, label = 'immediate'): Response {
  return { ok, status: ok ? 200 : 503, json: async () => { jsonCalls.push(label); return body; } } as Response;
}
function begin(view: Mounted) { let done!: Promise<void>; act(() => { done = view.result.current.evaluateTeam(); }); return done; }
async function fill(view: Mounted, prefix = 'Old') {
  if (view.result.current.phase !== 'challenge' || !view.result.current.challenge) throw new Error('SETUP: actual challenge must be ready before building');
  act(() => { view.result.current.finishStatSpin(); view.result.current.beginBuilding(); });
  act(() => view.result.current.finishTeamSpin());
  for (let index = 0; index < 5; index += 1) {
    const name = 'Fixture ' + prefix + ' Player ' + (index + 1);
    const entity: PlayerEntity = { key: name.toLowerCase(), name, rawName: name, matchRank: 0, prominence: 0,
      meta: { position: index < 2 ? 'G' : index < 4 ? 'F' : 'C', team: fixture.teams[index].name } };
    act(() => view.result.current.selectPosition(index));
    await act(async () => { await view.result.current.submitPlayer(entity); });
    if (index < 4) act(() => view.result.current.finishTeamSpin());
  }
  const chosen = state(view);
  if (chosen.phase !== 'reviewing' || chosen.filledCount !== 5 || chosen.isValidating || chosen.totalStat !== 65) throw new Error('SETUP: actual five-pick actions and stat enrichments must finish before evaluation');
  return chosen;
}
function reset(view: Mounted) {
  act(() => view.result.current.resetGame()); const resetImmediate = state(view);
  act(() => vi.advanceTimersByTime(100));
  return { resetImmediate, fresh: state(view) };
}
function retain(key: keyof typeof CASE_TITLES, moments: unknown) {
  const evidence = { title: CASE_TITLES[key], moments, requests: structuredClone(requests), jsonCalls: [...jsonCalls],
    localCalls: structuredClone(fixture.local.mock.calls), completionCalls: structuredClone(fixture.record.mock.calls),
    consoleErrors: consoleErrors.map(args => args.map(value => value instanceof Error ? { name: value.name, message: value.message } : value)),
    storesBefore: beforeStores, storesAfter: stores(), draws: [...draws], unexpected: [...unexpected],
    deferred: deferreds.map(({ label, settled }) => ({ label, settled })), pendingTimers: vi.getTimerCount() };
  cases[key] = evidence;
  return evidence;
}
function fixtureHeld(evidence: ReturnType<typeof retain>, chosen: State[]) {
  expect(evidence.deferred.every(gate => gate.settled), 'SETUP: every retained promise must settle before assertions').toBe(true);
  expect(evidence.pendingTimers, 'SETUP: the actual reset timer must be drained').toBe(0);
  expect(evidence.unexpected, 'SETUP: no undeclared transport or local judge call').toEqual([]);
  expect(evidence.requests.filter(row => row.kind === 'evaluation')).toEqual(chosen.map(s => ({ kind: 'evaluation', url: REVIEW_URL, method: 'POST', contentType: 'application/json', body: postFor(s), signalAtCall: null })));
  expect(evidence.requests.filter(row => row.kind === 'enrichment')).toEqual(chosen.flatMap(s => s.filledSlots.map(({ slot }) => ({ kind: 'enrichment', url: STAT_URL, method: 'POST', contentType: 'application/json',
    body: { playerName: slot.playerName, teamName: slot.assignedTeam, position: slot.role, challengeStat: s.challenge?.stat }, signalAtCall: null }))));
  expect(evidence.storesAfter).toEqual(evidence.storesBefore);
  expect(evidence.draws).toEqual([]);
}
function abandoned(s: State) { return s.phase === 'challenge' && s.filledCount === 0 && s.verdict === null && s.evaluationError === null && s.completions.length === 0; }
function resultHeld(s: State, chosen: State, verdict: NbaAIVerdict, finishes = 1) {
  expect(s).toMatchObject({ phase: 'result', challenge: chosen.challenge, filledCount: 5, filledSlots: chosen.filledSlots, filledSlotsArray: chosen.filledSlotsArray,
    totalStat: 65, verdict, isEvaluating: false, evaluationError: null, isValidating: false });
  expect(s.completions).toEqual(Array.from({ length: finishes }, () => ['/nba-starting-5', 500, 'Fixture Guest', 0]));
}
function caught(evidence: ReturnType<typeof retain>, message: string) { expect(evidence.consoleErrors).toEqual([['Evaluation error:', { name: 'Error', message }]]); }

beforeEach(async () => {
  vi.useRealTimers();
  // Warm React's first async act scheduler before measuring any game draw.
  await act(async () => {});
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  let challengeIndex = 0;
  fixture.challenge.mockReset().mockImplementation(() => ({ stat: 'Fixture Challenge ' + (++challengeIndex), direction: challengeIndex % 2 ? 'highest' : 'lowest', unit: 'fixture units', emoji: '🏀' }));
  fixture.local.mockReset(); fixture.record.mockReset(); fixture.badges.mockReset().mockResolvedValue([]); fixture.refresh.mockReset(); fixture.toast.mockReset();
  queue = []; requests = []; jsonCalls = []; unexpected = []; draws = []; consoleErrors = []; localPlans = []; deferreds = [];
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('fixture-nba-evaluation', '{"held":true}'); sessionStorage.setItem('fixture-session', 'held'); beforeStores = stores();
  fixture.local.mockImplementation(() => {
    const plan = localPlans.shift();
    if (!plan) { unexpected.push('Undeclared local judge call'); return Promise.reject(new Error('SETUP: undeclared local judge')); }
    return plan();
  });
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body ?? null;
    requests.push({ kind: url === STAT_URL ? 'enrichment' : url === REVIEW_URL ? 'evaluation' : 'unexpected', url, method: init?.method,
      contentType: new Headers(init?.headers).get('Content-Type'), body, signalAtCall: init?.signal?.aborted ?? null });
    if (url === STAT_URL) {
      const suffix = typeof body?.playerName === 'string' ? Number(body.playerName.match(/ (\d+)$/)?.[1]) : NaN;
      if (suffix >= 1 && suffix <= 5) return Promise.resolve(reply(true, { statValue: 10 + suffix }, 'enrichment:' + suffix));
    } else if (url === REVIEW_URL) {
      const next = queue.shift(); if (next) return next.promise;
    }
    unexpected.push(url); return Promise.reject(new Error('SETUP: undeclared fetch'));
  }));
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.6); return 0.6; });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { consoleErrors.push(args); });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
afterAll(() => {
  const out = process.env.NBA_EVALUATION_RAW;
  if (out) { if (!isAbsolute(out)) throw new Error('NBA_EVALUATION_RAW must be absolute'); writeFileSync(out, JSON.stringify({ version: 1, caseTitles: Object.values(CASE_TITLES), cases }, null, 2) + '\n', { flag: 'wx' }); }
});

describe('NBA evaluation belongs to the current five', () => {
  it(CASE_TITLES.resetSuccess, async () => {
    const view = mount(), chosen = await fill(view), response = request('reset success response');
    const done = begin(view), during = state(view), { resetImmediate, fresh } = reset(view);
    await act(async () => { response.resolve(reply(true, REMOTE)); await done; }); const settled = state(view);
    const evidence = retain('resetSuccess', { chosen, during, resetImmediate, fresh, settled }); fixtureHeld(evidence, [chosen]);
    expect(abandoned(settled), 'Starting over must keep the abandoned NBA five from becoming a result').toBe(true);
    expect(resetImmediate.isEvaluating).toBe(false); expect(settled).toEqual(fresh); expect(evidence.localCalls).toEqual([]);
  });
  it(CASE_TITLES.resetJson, async () => {
    const view = mount(), chosen = await fill(view), response = request('held JSON response'), body = deferred<NbaAIVerdict>('held JSON body'), entered = deferred<void>('JSON entered', false);
    const done = begin(view);
    await act(async () => { response.resolve({ ok: true, status: 200, json: () => { jsonCalls.push('held'); entered.resolve(); return body.promise; } } as Response); await entered.promise; });
    const readingJson = state(view), { resetImmediate, fresh } = reset(view);
    await act(async () => { body.resolve(REMOTE); await done; }); const settled = state(view);
    const evidence = retain('resetJson', { chosen, readingJson, resetImmediate, fresh, settled }); fixtureHeld(evidence, [chosen]);
    expect(abandoned(settled), 'A reset NBA game must ignore the previous held JSON verdict').toBe(true);
    expect(resetImmediate.isEvaluating).toBe(false); expect(settled).toEqual(fresh); expect(evidence.jsonCalls).toContain('held'); expect(evidence.localCalls).toEqual([]);
  });
  it(CASE_TITLES.nonOkFallback, async () => {
    const view = mount(), chosen = await fill(view), response = request('non-ok response'), local = deferred<NbaAIVerdict>('non-ok local'), entered = deferred<void>('non-ok entered', false);
    localPlans.push(() => { entered.resolve(); return local.promise; }); const done = begin(view);
    await act(async () => { response.resolve(reply(false, {})); await entered.promise; }); const judging = state(view), { resetImmediate, fresh } = reset(view);
    await act(async () => { local.resolve(LOCAL); await done; }); const settled = state(view);
    const evidence = retain('nonOkFallback', { chosen, judging, resetImmediate, fresh, settled }); fixtureHeld(evidence, [chosen]);
    expect(abandoned(settled), 'A reset NBA game must ignore its abandoned non-ok fallback').toBe(true);
    expect(resetImmediate.isEvaluating).toBe(false); expect(settled).toEqual(fresh); expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Evaluation request failed (503)');
  });
  it(CASE_TITLES.thrownFallback, async () => {
    const view = mount(), chosen = await fill(view), response = request('thrown response'), local = deferred<NbaAIVerdict>('thrown local'), entered = deferred<void>('thrown entered', false);
    localPlans.push(() => { entered.resolve(); return local.promise; }); const done = begin(view);
    await act(async () => { response.reject(new Error('Fixture request failure')); await entered.promise; }); const judging = state(view), { resetImmediate, fresh } = reset(view);
    await act(async () => { local.resolve(LOCAL); await done; }); const settled = state(view);
    const evidence = retain('thrownFallback', { chosen, judging, resetImmediate, fresh, settled }); fixtureHeld(evidence, [chosen]);
    expect(abandoned(settled), 'A reset NBA game must ignore its abandoned network fallback').toBe(true);
    expect(resetImmediate.isEvaluating).toBe(false); expect(settled).toEqual(fresh); expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Fixture request failure');
  });
  it(CASE_TITLES.rejectedFallback, async () => {
    const view = mount(), chosen = await fill(view), response = request('rejected fallback response'), local = deferred<NbaAIVerdict>('rejected local'), entered = deferred<void>('rejected entered', false);
    localPlans.push(() => { entered.resolve(); return local.promise; }); const done = begin(view);
    await act(async () => { response.resolve(reply(false, {})); await entered.promise; }); const judging = state(view), { resetImmediate, fresh } = reset(view);
    await act(async () => { local.reject(new Error('Fixture local failure')); await done; }); const settled = state(view);
    const evidence = retain('rejectedFallback', { chosen, judging, resetImmediate, fresh, settled }); fixtureHeld(evidence, [chosen]);
    expect(abandoned(settled), 'An abandoned NBA judge rejection must not set the new game error').toBe(true);
    expect(resetImmediate.isEvaluating).toBe(false); expect(settled).toEqual(fresh); expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Evaluation request failed (503)');
  });
  it(CASE_TITLES.replacement, async () => {
    async function pair(oldFirst: boolean) {
      const view = mount(), completedBefore = fixture.record.mock.calls.length, chosen = await fill(view, 'Old'), old = request(oldFirst ? 'old first response' : 'old last response');
      const oldDone = begin(view), { resetImmediate } = reset(view), fresh = await fill(view, 'New'), next = request(oldFirst ? 'new last response' : 'new first response');
      const nextDone = begin(view), waiting = state(view); let middle: State;
      if (oldFirst) {
        await act(async () => { old.resolve(reply(true, REMOTE)); await oldDone; }); middle = state(view);
        await act(async () => { next.resolve(reply(true, NEW)); await nextDone; });
      } else {
        await act(async () => { next.resolve(reply(true, NEW)); await nextDone; }); middle = state(view);
        await act(async () => { old.resolve(reply(true, REMOTE)); await oldDone; });
      }
      const settled = state(view); view.unmount(); return { completedBefore, chosen, resetImmediate, fresh, waiting, middle, settled };
    }
    const pending = await pair(true), completed = await pair(false), evidence = retain('replacement', { pending, completed });
    fixtureHeld(evidence, [pending.chosen, pending.fresh, completed.chosen, completed.fresh]);
    expect(pending.middle.phase === 'reviewing' && pending.middle.isEvaluating && pending.middle.verdict === null && pending.middle.completions.length === pending.completedBefore && completed.settled.phase === 'result' && completed.settled.verdict?.rating === NEW.rating,
      'An abandoned NBA evaluation must leave the next game busy and verdict alone').toBe(true);
    expect(pending.middle).toEqual(pending.waiting); resultHeld(pending.settled, pending.fresh, NEW, 1);
    resultHeld(completed.middle, completed.fresh, NEW, 2); expect(completed.settled).toEqual(completed.middle); expect(evidence.localCalls).toEqual([]);
  });
  it(CASE_TITLES.unmount, async () => {
    const view = mount(), chosen = await fill(view), response = request('unmounted response'); localPlans.push(() => Promise.resolve(LOCAL));
    const done = begin(view), during = state(view); view.unmount(); const lastPublished = state(view);
    await act(async () => { response.reject(new Error('Fixture error after unmount')); await done; }); const settled = state(view);
    const evidence = retain('unmount', { chosen, during, lastPublished, settled }); fixtureHeld(evidence, [chosen]);
    expect(evidence.localCalls.length === 0, 'An unmounted NBA game must not start the offline judge after its request fails').toBe(true);
    expect(settled).toEqual(lastPublished); expect(evidence.completionCalls).toEqual([]); expect(evidence.consoleErrors).toEqual([]);
  });
  it(CASE_TITLES.remote, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary remote response'), done = begin(view), during = state(view);
    await act(async () => { response.resolve(reply(true, REMOTE)); await done; }); const settled = state(view);
    const evidence = retain('remote', { chosen, during, settled }); fixtureHeld(evidence, [chosen]);
    expect(during.isEvaluating).toBe(true); resultHeld(settled, chosen, REMOTE); expect(evidence.localCalls).toEqual([]); expect(evidence.consoleErrors).toEqual([]);
  });
  it(CASE_TITLES.nonOk, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary non-ok response'); localPlans.push(() => Promise.resolve(LOCAL)); const done = begin(view);
    await act(async () => { response.resolve(reply(false, {})); await done; }); const settled = state(view);
    const evidence = retain('nonOk', { chosen, settled }); fixtureHeld(evidence, [chosen]); resultHeld(settled, chosen, LOCAL);
    expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Evaluation request failed (503)');
  });
  it(CASE_TITLES.thrown, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary thrown response'); localPlans.push(() => Promise.resolve(LOCAL)); const done = begin(view);
    await act(async () => { response.reject(new Error('Fixture ordinary request failure')); await done; }); const settled = state(view);
    const evidence = retain('thrown', { chosen, settled }); fixtureHeld(evidence, [chosen]); resultHeld(settled, chosen, LOCAL);
    expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Fixture ordinary request failure');
  });
  it(CASE_TITLES.malformed, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary malformed response'); localPlans.push(() => Promise.resolve(LOCAL)); const done = begin(view);
    await act(async () => { response.resolve(reply(true, { headline: 'Fixture incomplete verdict' })); await done; }); const settled = state(view);
    const evidence = retain('malformed', { chosen, settled }); fixtureHeld(evidence, [chosen]); resultHeld(settled, chosen, LOCAL);
    expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Malformed verdict');
  });
  it(CASE_TITLES.nestedError, async () => {
    const view = mount(), chosen = await fill(view), response = request('ordinary failed local response'); localPlans.push(() => Promise.reject(new Error('Fixture ordinary local failure'))); const done = begin(view);
    await act(async () => { response.resolve(reply(false, {})); await done; }); const settled = state(view);
    const evidence = retain('nestedError', { chosen, settled }); fixtureHeld(evidence, [chosen]);
    expect(settled).toMatchObject({ phase: 'reviewing', challenge: chosen.challenge, filledCount: 5, filledSlots: chosen.filledSlots, verdict: null, isEvaluating: false, evaluationError: RETRY_ERROR, completions: [] });
    expect(evidence.localCalls).toEqual([localCallFor(chosen)]); caught(evidence, 'Evaluation request failed (503)');
  });
});
