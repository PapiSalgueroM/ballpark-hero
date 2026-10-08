import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/* Round 1138. The client side of Build Your XI's validator. The rule is the
   July 2026 one: a validator that cannot verify is a no penalty retry, never
   an accept. Part A reads answers (no React). Part B is the door for a club
   pick our own row settles. Part C drives the hook: every way the call can
   fail ends with nothing counted, the slot still open and the search box
   still wanted. The test names are matched by
   scripts/simLineupValidatorClient.mjs, so do not rename them. Every request
   here is a stub: no database. */

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: vi.fn() }));
const dealt = vi.hoisted(() => ({ teams: [] as { name: string; isNation: boolean }[] }));
vi.mock('@/data/lineupTeams', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/lineupTeams')>();
  return { ...real, getRandomTeamAssignments: () => dealt.teams.map((team) => ({ ...team })) };
});

import { askValidator, readValidatorAnswer, VALIDATOR_WAIT_MS, type ValidatorAnswer } from '@/lib/validatorClient';
import { clubPickVerifies, useLineupBuilder } from '@/hooks/useLineupBuilder';
import type { PickMeta, TeamAssignment } from '@/types/lineupBuilder';

/* The teams are the game's own labels. Every player here is a fixture: no
   real footballer, and no fact about one, is asserted by this file. */
const REAL: TeamAssignment = { name: 'Real Madrid', isNation: false };
const BAYERN: TeamAssignment = { name: 'Bayern Munich', isNation: false };
const BRAZIL: TeamAssignment = { name: 'Brazil', isNation: true };
const ROVERS: TeamAssignment = { name: 'Fixture Rovers', isNation: false };
const TYPED = 'Qzx Van Rightback';
const STORED = 'Qzx van Rightback';
/** A right back whose row is at Real Madrid: what the scoped list hands the hook on a Real Madrid slot. */
const ON_FILE: PickMeta = { rawName: STORED, rawPosition: 'Right-Back', position: 'RB', club: 'Real Madrid', nationality: 'Brazil' };
const SLOT = { GK: 0, LB: 1, CB: 2, RB: 4, CM: 5 } as const; // indexes into the 4-3-3

const unverified = (why: string, extra: Record<string, unknown> = {}): ValidatorAnswer =>
  ({ kind: 'unverified', why, exhausted: false, ...extra }) as ValidatorAnswer;

describe('part A: reading a validator answer', () => {
  const rows: [string, boolean, unknown, ValidatorAnswer][] = [
    ['an HTTP 429 with an error body', false, { error: 'Rate limit exceeded' }, unverified('status')],
    ['a failed response that claims valid', false, { valid: true }, unverified('status')],
    ['null', true, null, unverified('shape')],
    ['an array', true, [], unverified('shape')],
    ['a string', true, 'valid', unverified('shape')],
    ['an empty object', true, {}, unverified('shape')],
    ['an error body with a 200', true, { error: 'x' }, unverified('shape')],
    ['valid as the string true', true, { valid: 'true' }, unverified('shape')],
    ['valid as the number 1', true, { valid: 1 }, unverified('shape')],
    ['both flags at once', true, { valid: true, unverified: true }, unverified('server')],
    ['an allowance answer', true, { valid: false, unverified: true, exhausted: true, reason: 'Allowance spent.' }, unverified('server', { exhausted: true, reason: 'Allowance spent.' })],
    ['a plain unverified answer', true, { valid: false, unverified: true }, unverified('server')],
    ['a refusal with a reason', true, { valid: false, reason: 'Never played there.' }, { kind: 'refused', reason: 'Never played there.' }],
    ['a refusal with an object for a reason', true, { valid: false, reason: { row: 'x' } }, { kind: 'refused' }],
    ['valid', true, { valid: true }, { kind: 'valid' }],
    ['valid with a stored name', true, { valid: true, fullName: 'Stored Name' }, { kind: 'valid', fullName: 'Stored Name' }],
  ];
  it.each(rows)('reads %s', (_name, ok, body, expected) => {
    expect(readValidatorAnswer(ok, body)).toEqual(expected);
  });

  it('says valid for the boolean true on an ok response and for nothing else', () => {
    const validRows = rows.filter(([, ok, body]) => readValidatorAnswer(ok, body).kind === 'valid').map(([name]) => name);
    expect(validRows).toEqual(['valid', 'valid with a stored name']);
  });
});

/* Added after the review of Round 1138: its mutation run turned the wait into
   150 seconds and took away the line that hears the caller, and every test
   stayed green (the first because the tests read the constant back, the
   second only went red by running into the runner's own five second limit). */
describe('part A, asking: one wait, and a caller who can give up', () => {
  const INIT = { headers: { 'Content-Type': 'application/json' }, body: '{}' };
  /** A request that settles only when its signal aborts, and at once when it already has: what a real fetch does. */
  const hung = (_url: string, init: RequestInit = {}) => new Promise<Reply>((_resolve, reject) => {
    const stop = () => reject(new DOMException('aborted', 'AbortError'));
    if (init.signal?.aborted) stop();
    else init.signal?.addEventListener('abort', stop);
  });
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(hung)); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('waits fifteen seconds for an answer and no longer', async () => {
    // The number is written out here on purpose: a test that reads the constant back agrees with any value.
    expect(VALIDATOR_WAIT_MS).toBe(15000);
    let got: ValidatorAnswer | undefined;
    void askValidator('http://stub/validate', INIT).then((result) => { got = result; });
    await vi.advanceTimersByTimeAsync(14_999);
    expect(got).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(got).toEqual(unverified('timeout'));
  });

  it('hears the caller give up at once, after it asked or before', async () => {
    const caller = new AbortController();
    let got: ValidatorAnswer | undefined;
    void askValidator('http://stub/validate', INIT, { signal: caller.signal }).then((result) => { got = result; });
    await vi.advanceTimersByTimeAsync(10);
    expect(got).toBeUndefined();
    caller.abort();
    await vi.advanceTimersByTimeAsync(1);
    expect(got).toEqual(unverified('cancelled'));

    // A caller that had already given up: the question ends the same way, without waiting out the clock.
    let late: ValidatorAnswer | undefined;
    void askValidator('http://stub/validate', INIT, { signal: caller.signal }).then((result) => { late = result; });
    await vi.advanceTimersByTimeAsync(1);
    expect(late).toEqual(unverified('cancelled'));
  });
});

describe('part B: the door for a club pick our own row settles', () => {
  const open: [string, TeamAssignment, PickMeta | undefined][] = [
    ['a club row at the slot club', REAL, ON_FILE],
    ['the club under its second stored name', BAYERN, { rawPosition: 'Centre-Back', club: 'FC Bayern Munich' }],
    ['a split season that includes the club', REAL, { rawPosition: 'Right-Back', club: 'Real Madrid / Liverpool FC' }],
  ];
  const shut: [string, TeamAssignment, PickMeta | undefined][] = [
    ['a row at another club', REAL, { rawPosition: 'Right-Back', club: 'Liverpool FC' }],
    ['a nation slot whatever the row says', BRAZIL, ON_FILE],
    ['a row with no club', REAL, { rawPosition: 'Right-Back' }],
    ['a row with no position', REAL, { club: 'Real Madrid' }],
    ['a row with a position spelling the map does not know', REAL, { rawPosition: 'Sweeper', club: 'Real Madrid' }],
    ['a club label with no stored names', ROVERS, { rawPosition: 'Right-Back', club: 'Fixture Rovers' }],
    ['no row at all', REAL, undefined],
    /* Near misses, added after the review: the club on the row must BE one of
       the slot club's stored names, not contain one and not sit inside one. */
    ['a side whose name only starts with the slot club', REAL, { rawPosition: 'Right-Back', club: 'Real Madrid Castilla' }],
    ['a second side of the club under its longer stored name', BAYERN, { rawPosition: 'Right-Back', club: 'FC Bayern Munich II' }],
    ['a club name that is only a piece of the stored name', REAL, { rawPosition: 'Right-Back', club: 'Madrid' }],
    ['a split season whose nearest club is a near miss', REAL, { rawPosition: 'Right-Back', club: 'Real Madrid Castilla / Liverpool FC' }],
    ['a club field that is only the separator', REAL, { rawPosition: 'Right-Back', club: ' / ' }],
  ];
  it.each(open)('the door opens for %s', (_name, team, pick) => {
    expect(clubPickVerifies(team, 'RB', pick)).toBe(true);
  });
  it.each(shut)('the door stays shut for %s', (_name, team, pick) => {
    expect(clubPickVerifies(team, 'RB', pick)).toBe(false);
  });
});

type Reply = { ok: boolean; status: number; json: () => Promise<unknown> };
type Seen = { url: string; signal: AbortSignal | null | undefined; body: unknown };
const answer = (body: unknown): Promise<Reply> => Promise.resolve({ ok: true, status: 200, json: async () => body });
const failed = (status: number, body: unknown): Promise<Reply> => Promise.resolve({ ok: false, status, json: async () => body });
/** A request that only ever settles when its signal aborts, the way a real fetch does. */
const never = (init: RequestInit): Promise<Reply> => new Promise((_resolve, reject) => {
  init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
});

/** Every request is recorded. The history table answers "nothing on file"; the validator answers what the test says. */
function stubFetch(validator: (init: RequestInit, nth: number) => Promise<Reply>, history: (init: RequestInit) => Promise<Reply> = () => answer([])) {
  const seen: Seen[] = [];
  const validatorCalls = () => seen.filter((call) => call.url.includes('validate-player'));
  vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit = {}) => {
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    seen.push({ url: String(url), signal: init.signal, body });
    if (String(url).includes('player_verified_positions')) return history(init);
    if (String(url).includes('validate-player')) return validator(init, validatorCalls().length);
    return Promise.reject(new Error(`unexpected request to ${url}`));
  }));
  return { seen, validatorCalls };
}

/** A game on the 4-3-3 whose teams, slot by slot, are the ones given, with one slot selected. */
function mount(teams: TeamAssignment[], slot: number) {
  dealt.teams = Array.from({ length: 11 }, (_unused, i) => teams[Math.min(i, teams.length - 1)]);
  const hook = renderHook(() => useLineupBuilder());
  act(() => hook.result.current.selectFormation('4-3-3'));
  act(() => hook.result.current.selectPosition(slot));
  return hook;
}
function start(teams: TeamAssignment[], slot: number) {
  return mount(teams, slot).result;
}

type Game = ReturnType<typeof useLineupBuilder>;
/** Waits for a pick to end, but only for a moment. A build that leaves a cancelled check hanging must fail the
    assertions that follow; if the test waited on it for ever, the runner's time limit would end the test inside
    an open act() and every test after it in this file would fail with it. */
const ended = (done: Promise<void> | undefined) => Promise.race([done, new Promise<void>((resolve) => { setTimeout(resolve, 250); })]);
/** "Burn nothing": what must be true after every answer that could not be checked. */
function nothingCounted(game: Game, team: TeamAssignment, slot: number) {
  expect(game.filledSlots.size).toBe(0);
  expect(game.filledCount).toBe(0);
  expect(game.currentTeam).toEqual(team);
  expect(game.selectedPositionIndex).toBe(slot);
  expect(game.isValidating).toBe(false);
  expect(game.checkingDown).toBe(false);
  expect(typeof game.validationError).toBe('string');
  expect((game.validationError ?? '').length).toBeGreaterThan(0);
  expect(game.validationError).not.toContain('saved');
  expect(game.validationError).not.toContain("hasn't played");
}

describe('part C: the hook', () => {
  beforeEach(() => { vi.useRealTimers(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('a club pick on file at the club lands with no request to the validator', async () => {
    const { seen, validatorCalls } = stubFetch(() => answer({ valid: false, reason: 'The validator must not be asked.' }));
    const game = start([REAL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); });
    expect(game.current.filledSlots.get(SLOT.RB)?.playerName).toBe(STORED); // the stored spelling, as the validator's fullName gave it
    expect(game.current.filledSlots.get(SLOT.RB)?.assignedTeam).toBe('Real Madrid');
    expect(game.current.filledCount).toBe(1);
    expect(game.current.isValidating).toBe(false);
    expect(game.current.validationError).toBeNull();
    expect(validatorCalls()).toHaveLength(0);
    expect(seen).toHaveLength(0); // a pick in his own position reads nothing at all

    // Without the stored name on the row the slot shows the name it was given.
    const plain = start([REAL], SLOT.RB);
    await act(async () => { await plain.current.submitPlayer(TYPED, { ...ON_FILE, rawName: undefined }); });
    expect(plain.current.filledSlots.get(SLOT.RB)?.playerName).toBe(TYPED);
    expect(validatorCalls()).toHaveLength(0);
  });

  it('a club pick whose row is at another club goes to the validator', async () => {
    const { validatorCalls } = stubFetch(() => answer({ valid: true, fullName: 'Stored Fullname' }));
    const game = start([REAL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, { ...ON_FILE, club: 'Liverpool FC' }); });
    expect(validatorCalls()).toHaveLength(1);
    expect(validatorCalls()[0].body).toEqual({ playerName: TYPED, teamName: 'Real Madrid', isNation: false, position: 'RB' });
    expect(game.current.filledSlots.get(SLOT.RB)?.playerName).toBe('Stored Fullname');
  });

  it('a club pick whose row has no known position goes to the validator', async () => {
    for (const rawPosition of [undefined, 'Sweeper']) {
      const { validatorCalls } = stubFetch(() => answer({ valid: true }));
      const game = start([REAL], SLOT.RB);
      await act(async () => { await game.current.submitPlayer(TYPED, { ...ON_FILE, rawPosition, position: undefined }); });
      expect(validatorCalls(), String(rawPosition)).toHaveLength(1);
      expect(game.current.filledSlots.get(SLOT.RB)?.playerName, String(rawPosition)).toBe(TYPED);
    }
  });

  it('a nation pick always goes to the validator', async () => {
    const { validatorCalls } = stubFetch(() => answer({ valid: true }));
    const game = start([BRAZIL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); }); // the row's nationality matches, and its club is on file
    expect(validatorCalls()).toHaveLength(1);
    expect(validatorCalls()[0].url).toBe('http://stub/functions/v1/validate-player');
    expect(validatorCalls()[0].body).toEqual({ playerName: TYPED, teamName: 'Brazil', isNation: true, position: 'RB' });
    expect(game.current.filledSlots.get(SLOT.RB)?.playerName).toBe(TYPED);
  });

  const uncheckable: [string, (init: RequestInit) => Promise<Reply>][] = [
    ['an HTTP 429 with an error body', () => failed(429, { error: 'Rate limit exceeded' })],
    ['an HTTP 500', () => failed(500, { valid: true })],
    ['a 200 that is not JSON', () => Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token < in JSON'); } })],
    ['a 200 with an empty object', () => answer({})],
    ['a 200 with valid as a string', () => answer({ valid: 'true' })],
    ['a 200 with both flags', () => answer({ valid: true, unverified: true })],
    ['a 200 unverified answer', () => answer({ valid: false, unverified: true })],
    ['a rejected fetch', () => Promise.reject(new TypeError('Failed to fetch'))],
  ];
  it.each(uncheckable)('%s is not counted', async (_name, reply) => {
    const { validatorCalls } = stubFetch(reply);
    const game = start([BRAZIL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); });
    expect(validatorCalls()).toHaveLength(1);
    nothingCounted(game.current, BRAZIL, SLOT.RB);
    expect(game.current.validationError).toMatch(/Couldn't verify that answer/);
  });

  it('an allowance answer blocks only that pick', async () => {
    const spent = { valid: false, unverified: true, exhausted: true, reason: 'Daily allowance used up.' };
    let reply: unknown = spent;
    const { validatorCalls } = stubFetch(() => answer(reply));
    const game = start([BRAZIL, REAL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); });
    nothingCounted(game.current, BRAZIL, SLOT.RB);
    expect(game.current.validationError).toContain('allowance for today');
    expect(game.current.validationError).toContain('not counted');

    // The next pick is asked again, and counts: one pick was blocked, not the session.
    reply = { valid: true };
    await act(async () => { await game.current.submitPlayer('Qzx Other Back', { ...ON_FILE, rawName: 'Qzx Other Back' }); });
    expect(validatorCalls()).toHaveLength(2);
    expect(game.current.filledSlots.get(SLOT.RB)?.playerName).toBe('Qzx Other Back');
    expect(game.current.filledCount).toBe(1);
    expect(game.current.validationError).toBeNull();
    expect(game.current.checkingDown).toBe(false);

    // And with the allowance still spent, a club pick our own row settles lands with no call at all.
    reply = spent;
    expect(game.current.currentTeam).toEqual(REAL);
    act(() => game.current.selectPosition(SLOT.CB));
    await act(async () => { await game.current.submitPlayer('Qzx Centre Half', { rawName: 'Qzx Centre Half', rawPosition: 'Centre-Back', club: 'Real Madrid' }); });
    expect(validatorCalls()).toHaveLength(2);
    expect(game.current.filledSlots.get(SLOT.CB)?.playerName).toBe('Qzx Centre Half');
    expect(game.current.filledCount).toBe(2);
  });

  it('a check that never answers is given up and cancelled', async () => {
    vi.useFakeTimers();
    const { validatorCalls } = stubFetch((init) => never(init));
    const game = start([BRAZIL], SLOT.RB);
    act(() => { void game.current.submitPlayer(TYPED, ON_FILE); });
    await act(async () => { await vi.advanceTimersByTimeAsync(VALIDATOR_WAIT_MS - 50); });
    expect(validatorCalls()).toHaveLength(1);
    expect(validatorCalls()[0].signal?.aborted).toBe(false);
    expect(game.current.isValidating).toBe(true);
    // State is read after the clock moves, never by awaiting a promise a broken build would leave hanging.
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(validatorCalls()[0].signal?.aborted).toBe(true);
    nothingCounted(game.current, BRAZIL, SLOT.RB);
    expect(game.current.validationError).toContain('took too long');
    expect(validatorCalls()).toHaveLength(1);
  });

  it('a reroll cancels the check in flight', async () => {
    const { validatorCalls } = stubFetch((init) => never(init));
    const game = start([BRAZIL], SLOT.RB);
    let done: Promise<void> | undefined;
    act(() => { done = game.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(validatorCalls()).toHaveLength(1));
    expect(game.current.isValidating).toBe(true);
    await act(async () => { game.current.rerollTeam(); await ended(done); });
    expect(validatorCalls()[0].signal?.aborted).toBe(true);
    expect(game.current.filledSlots.size).toBe(0);
    expect(game.current.validationError).toBeNull();
    expect(game.current.isValidating).toBe(false);

    // The same through the cancel the hook hands out, which leaves the team and the slot as they were.
    const again = start([BRAZIL], SLOT.RB);
    act(() => { done = again.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(validatorCalls()).toHaveLength(2));
    await act(async () => { again.current.cancelValidation(); await ended(done); });
    expect(validatorCalls()[1].signal?.aborted).toBe(true);
    expect(again.current.filledSlots.size).toBe(0);
    expect(again.current.validationError).toBeNull();
    expect(again.current.isValidating).toBe(false);
    expect(again.current.currentTeam).toEqual(BRAZIL);
    expect(again.current.selectedPositionIndex).toBe(SLOT.RB);
  });

  it('a real refusal reads as a refusal', async () => {
    let reply: unknown = { valid: false, reason: 'Never played there.' };
    stubFetch(() => answer(reply));
    const game = start([BRAZIL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); });
    expect(game.current.validationError).toBe('Never played there.');
    expect(game.current.filledSlots.size).toBe(0);
    expect(game.current.isValidating).toBe(false);
    expect(game.current.selectedPositionIndex).toBe(SLOT.RB);
    reply = { valid: false };
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); });
    expect(game.current.validationError).toBe(`${TYPED} hasn't played for Brazil`);
    expect(game.current.filledSlots.size).toBe(0);
  });

  it('a valid answer is accepted', async () => {
    const { validatorCalls } = stubFetch(() => answer({ valid: true, fullName: 'Stored Fullname' }));
    const game = start([BRAZIL], SLOT.RB);
    await act(async () => { await game.current.submitPlayer(TYPED, ON_FILE); });
    expect(validatorCalls()).toHaveLength(1);
    expect(game.current.filledSlots.get(SLOT.RB)?.playerName).toBe('Stored Fullname');
    expect(game.current.filledSlots.get(SLOT.RB)?.assignedTeam).toBe('Brazil');
    expect(game.current.filledCount).toBe(1);
    expect(game.current.isValidating).toBe(false);
    expect(game.current.validationError).toBeNull();
  });

  it('a club row the position gate refuses is still refused', async () => {
    const { validatorCalls } = stubFetch(() => answer({ valid: true }));
    const game = start([REAL], SLOT.CM);
    await act(async () => { await game.current.submitPlayer('Qzx Keeper', { rawName: 'Qzx Keeper', rawPosition: 'Goalkeeper', club: 'Real Madrid' }); });
    expect(game.current.validationError).toMatch(/^Qzx Keeper is a goalkeeper\. The CM slot needs /);
    expect(game.current.filledSlots.size).toBe(0);
    expect(game.current.selectedPositionIndex).toBe(SLOT.CM);
    expect(validatorCalls()).toHaveLength(0);
  });

  it('a pick given up while its history is read is dropped', async () => {
    // A right back into the left back slot is a next door pick, so the history table is read first. Hold that read.
    let release: (reply: Reply) => void = () => {};
    const { seen, validatorCalls } = stubFetch(() => answer({ valid: true }), () => new Promise<Reply>((resolve) => { release = resolve; }));
    const game = start([REAL], SLOT.LB);
    let done: Promise<void> | undefined;
    act(() => { done = game.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(seen.filter((call) => call.url.includes('player_verified_positions'))).toHaveLength(1));
    expect(game.current.isValidating).toBe(true);
    act(() => game.current.rerollTeam());
    expect(game.current.isValidating).toBe(false);
    await act(async () => { release({ ok: true, status: 200, json: async () => [] }); await done; });
    expect(game.current.filledSlots.size).toBe(0);
    expect(game.current.filledCount).toBe(0);
    expect(game.current.validationError).toBeNull();
    expect(game.current.isValidating).toBe(false);
    expect(validatorCalls()).toHaveLength(0);
  });

  /* Tests 20 and 21 were added after the review of Round 1138. Its mutation
     run took the cancel out of a new formation, a reset and leaving the page,
     and took out the check that drops an answer landing after the player gave
     up, and every test stayed green: only a reroll was walked, and only with a
     request that dies the moment it is aborted. */

  it('giving up drops an answer that was already on its way', async () => {
    const waysOut: [string, (game: Game) => void][] = [
      ['a reroll', (game) => game.rerollTeam()],
      ['a new formation', (game) => game.selectFormation('4-4-2')],
      ['a reset', (game) => game.resetGame()],
      ['the cancel the hook hands out', (game) => game.cancelValidation()],
    ];
    for (const [name, giveUp] of waysOut) {
      // A reply already on the wire: the test lets it land, it says yes, and it does not hear the abort.
      let land: () => void = () => {};
      const onTheWire = new Promise<Reply>((resolve) => {
        land = () => resolve({ ok: true, status: 200, json: async () => ({ valid: true, fullName: 'Late Answer' }) });
      });
      const { validatorCalls } = stubFetch(() => onTheWire);
      const game = start([BRAZIL], SLOT.RB);
      let done: Promise<void> | undefined;
      act(() => { done = game.current.submitPlayer(TYPED, ON_FILE); });
      await waitFor(() => expect(validatorCalls(), name).toHaveLength(1));
      expect(validatorCalls()[0].signal?.aborted, name).toBe(false);
      act(() => giveUp(game.current));
      // The request is cancelled there and then, and the player is not left waiting on it.
      expect(validatorCalls()[0].signal?.aborted, name).toBe(true);
      expect(game.current.isValidating, name).toBe(false);
      await act(async () => { land(); await done; });
      expect(game.current.filledSlots.size, name).toBe(0);
      expect(game.current.filledCount, name).toBe(0);
      expect(game.current.validationError, name).toBeNull();
      expect(game.current.isValidating, name).toBe(false);
    }
  });

  it('leaving the page cancels the check in flight', async () => {
    const { validatorCalls } = stubFetch((init) => never(init));
    const hook = mount([BRAZIL], SLOT.RB);
    act(() => { void hook.result.current.submitPlayer(TYPED, ON_FILE); });
    await waitFor(() => expect(validatorCalls()).toHaveLength(1));
    expect(validatorCalls()[0].signal?.aborted).toBe(false);
    hook.unmount();
    expect(validatorCalls()[0].signal?.aborted).toBe(true);
  });
});
