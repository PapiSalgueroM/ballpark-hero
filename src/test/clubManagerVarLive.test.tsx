/**
 * Club Manager: what the game asks the engine to review, through the REAL hook.
 *
 * The switch is CM_VAR_LIVE in src/lib/clubManagerVarLive.ts and the kinds of review the game plays are
 * CM_VAR_KINDS, generated from the rates ledger (Round 1303: the goal kind alone). The hook reads both at the two
 * places a match is kicked off: the match button (live and Quick Sim) and the fast forward. This file drives the
 * hook, as src/test/clubManagerSave.test.tsx does, on a new 2026-27 Premier League career, and holds TWO rules.
 *
 * THE DARK RULE (Release AT; what a build with the switch off plays, and what turning the one constant back gives):
 *   1. a live kick off leaves no varReviews key on the saved match;
 *   2. a Quick Sim through the hook is the match the engine plays from the same save and the same seed when
 *      nobody asks for reviews: the whole report, and no review row in it;
 *   3. the fast forward is the engine's run to that week without reviews.
 * THE LIT RULE (Round 1303; the run review's probe made a standing case): with the switch on and the goal kind
 *   alone, all three paths play GOALS ONLY:
 *   1. a live kick off saves varReviews and the list ['goal'], and its half is the engine's half asked for it;
 *   2. a Quick Sim is the engine asked for ['goal'], on matches chosen so that staging every kind WOULD show a
 *      penalty by review (no penalty review row, no kick a review gave);
 *   3. the fast forward is the engine run asked for ['goal'], on a run that differs both from no reviews and
 *      from every kind. This is the one check that reads what a fast forwarded match plays: a calendar that
 *      hands the engine a boolean stages every kind there, and every other gate of the round stays green.
 *
 * Which rule runs: the one this release ships (the real constant and the real list), unless a mode says otherwise.
 * CM_VAR_LIVE_CONTROL, for this file only (the hook sees the mocked values, the first block reads the real ones):
 *   dark      the switch off, the dark rule: must be GREEN (a roll back of the one constant is the dark game).
 *   lit       the switch on with the goal kind alone, the lit rule: must be GREEN (the lit game, before or after
 *             the switch commit).
 * NEGATIVE CONTROLS, each must make vitest exit 1 on an assertion:
 *   on        the switch on with the goal kind, the DARK rule's cases: the key appears, the reviews move matches.
 *   switch    the switch on and the kinds as the ledger has them, the DARK rule's cases: red since the ledger
 *             plays the goal kind (it was green while the ledger played none: the switch alone lit nothing).
 *   off       the switch off, the LIT rule's cases: nothing is asked, so all three fail.
 *   allkinds  the switch on and BOTH kinds handed to the game, the LIT rule's cases: the saved list is not the
 *             goal kind alone and penalties by review appear.
 * A green run under a negative control would mean the hook no longer reads the switch or the list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const MODE = process.env.CM_VAR_LIVE_CONTROL ?? '';
if (!['', 'dark', 'lit', 'on', 'switch', 'off', 'allkinds'].includes(MODE)) throw new Error(`clubManagerVarLive: unknown CM_VAR_LIVE_CONTROL ${MODE}`);
/* What this release ships, read past any mock. */
const SHIPPED = await vi.importActual<{ CM_VAR_LIVE: boolean }>('@/lib/clubManagerVarLive');
const SHIPPED_RATES = await vi.importActual<Record<string, unknown> & { CM_VAR_KINDS: readonly string[] }>('@/data/clubManagerVarRates');
const SHIPS_LIT = SHIPPED.CM_VAR_LIVE && SHIPPED_RATES.CM_VAR_KINDS.length > 0;
/* What the hook sees. */
const SWITCH = MODE === '' ? SHIPPED.CM_VAR_LIVE : MODE === 'dark' || MODE === 'off' ? false : true;
const KINDS: readonly string[] = MODE === 'on' || MODE === 'lit' ? ['goal'] : MODE === 'allkinds' ? ['goal', 'penalty'] : SHIPPED_RATES.CM_VAR_KINDS;
if (MODE) {
  vi.doMock('@/lib/clubManagerVarLive', () => ({ CM_VAR_LIVE: SWITCH }));
  vi.doMock('@/data/clubManagerVarRates', () => ({ ...SHIPPED_RATES, CM_VAR_KINDS: KINDS }));
}
/* Which rule's cases run. */
const RULE: 'dark' | 'lit' = MODE === 'dark' || MODE === 'on' || MODE === 'switch' ? 'dark' : MODE === 'lit' || MODE === 'off' || MODE === 'allkinds' ? 'lit' : SHIPS_LIT ? 'lit' : 'dark';

const { useClubManager } = await import('@/hooks/useClubManager');
const { playNextEntry } = await import('@/lib/clubManager');
const { simToWeek } = await import('@/lib/clubManagerCalendar');

/* eslint-disable @typescript-eslint/no-explicit-any */
const CLUB = 'Everton';
let api: any = null;
function Harness() {
  const g = useClubManager();
  api = g;
  return <div data-testid="cm-var-live" />;
}

const FAKE = ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] as any;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const realRandom = Math.random;
function seeded<T>(seed: number, fn: () => T): T {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = realRandom; }
}
const rows = (report: any, needle: string): number => JSON.stringify(report ?? null).split(needle).length - 1;
const reviewRows = (report: any): number => rows(report, '"kind":"var"');
const PEN = '"incident":"penalty"', GOAL = '"incident":"goal"';

beforeEach(() => { localStorage.clear(); api = null; });
afterEach(() => { vi.useRealTimers(); Math.random = realRandom; });

async function booted() {
  vi.useFakeTimers({ toFake: FAKE });
  const r = render(<Harness />);
  await act(async () => { vi.advanceTimersByTime(10); });
  expect(api.phase).toBe('clubSelect');
  act(() => api.chooseClub(CLUB));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
  return r;
}

describe('Club Manager: VAR as this release ships it', () => {
  it('the switch is on in this release, and the ledger plays the goal kind alone', () => {
    expect(SHIPPED.CM_VAR_LIVE, 'CM_VAR_LIVE as src/lib/clubManagerVarLive.ts has it').toBe(true);
    /* Round 1303 fix: the goal kind is on in the ledger (its owed entry goals-level closed in the engine) and
       penalties-total still holds the penalty kind, so the generated list is the goal kind alone. */
    expect(SHIPPED_RATES.CM_VAR_KINDS, 'the ledger plays the goal kind and holds the penalty kind (owed penalties-total)').toEqual(['goal']);
    expect(RULE, 'the rule this file ran').toBe(MODE === '' ? 'lit' : RULE);
  });

  /* Round 1303, the lead's decision 2: what the game asks kickOff for is the ledger's list of kinds, never `true`
     (which stages every kind the engine can play, and is how the cases below ask the engine what it WOULD review). */
  it('the game asks for the kinds of review the ledger plays, and for nothing while the switch is off or no kind is played', async () => {
    const { cmVarGameAsk, CM_VAR_KINDS } = await import('@/lib/clubManagerVar');
    expect(cmVarGameAsk(false, ['goal'])).toEqual({});
    expect(cmVarGameAsk(true, [])).toEqual({});
    expect(cmVarGameAsk(true, ['goal'])).toEqual({ varReviews: ['goal'] });
    expect(cmVarGameAsk(true)).toEqual(CM_VAR_KINDS.length ? { varReviews: CM_VAR_KINDS } : {});
    expect([...CM_VAR_KINDS], 'the list the game is handed').toEqual([...KINDS]);
  });
});

describe.runIf(RULE === 'dark')('Club Manager: VAR with the switch off (the dark rule)', () => {
  it('a live kick off through the hook asks for no review', async () => {
    const r = await booted();
    let guard = 0, before: any = null, seed = 0;
    while (api.phase !== 'halftime' && guard++ < 20) {
      before = clone(api.career); seed = 4100 + guard;
      act(() => seeded(seed, () => api.play()));
    }
    expect(api.phase, 'no match was kicked off').toBe('halftime');
    expect(api.career.live).toBeTruthy();
    /* The save is one the engine WOULD review if asked (a modern era, 2026 or later), so the missing key
       below is the switch's doing and not the era's. */
    const asked = seeded(seed, () => playNextEntry(clone(before), { varReviews: true }));
    expect(asked.kind).toBe('halftime');
    expect(asked.state.live?.varReviews, 'this save is not one the engine reviews, so the case proves nothing').toBe(true);
    expect('varReviews' in api.career.live, 'the saved match carries the review opt in').toBe(false);
    expect('varKinds' in api.career.live, 'the saved match carries a list of kinds of review').toBe(false);
    r.unmount();
  }, 180000);

  it('a Quick Sim through the hook is the match the engine plays without reviews', async () => {
    const r = await booted();
    let played = 0, chosen = 0;
    for (let guard = 0; guard < 30 && played < 6; guard++) {
      const before = clone(api.career);
      /* Round 1218 fix (review finding 8): on rates taken from real football about one league match in six has a
         review, and six matches on any six seeds had none in them about four runs in ten, so this case could
         not see the switch. Each match is now chosen: the first seed whose match the engine WOULD show a review
         in if asked. A match no seed reviews (a competition without reviews) is played on its plain seed. */
      let seed = 5200 + guard * 500, found = false;
      for (let k = 0; k < 120 && !found; k++) {
        const reviewed = seeded(seed + k, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: true }));
        if (reviewed.kind === 'match' && reviewRows(reviewed.report) > 0) { seed += k; found = true; }
      }
      act(() => seeded(seed, () => api.quickPlay()));
      if (api.phase !== 'matchResult') { act(() => api.continueFromReport?.()); continue; }
      const expected = seeded(seed, () => playNextEntry(clone(before), { skipHalftime: true }));
      expect(expected.kind).toBe('match');
      expect(reviewRows(api.report), `match ${played + 1} shows a review`).toBe(0);
      expect(clone(api.report), `match ${played + 1} differs from the engine without reviews`).toEqual(clone(expected.report));
      played++;
      if (found) chosen++;
      act(() => api.continueFromReport());
    }
    expect(played, 'too few matches were played to say anything').toBeGreaterThanOrEqual(6);
    expect(chosen, 'too few matches that reviews would show in, so the case proves nothing').toBeGreaterThanOrEqual(3);
    r.unmount();
  }, 240000);

  it('the fast forward is the engine run without reviews', async () => {
    const r = await booted();
    const before = clone(api.career);
    const target = before.week + 6;
    /* Round 1218: on rates taken from real football a review is rare, and a run of six weeks with none in it
       would read the same with the switch on or off. So the run is chosen: the first seed whose run the engine
       WOULD play to other results with the game's own kinds asked for. That is what lets this case see the switch
       (Round 1303 fix: it asked with every kind staged, and a run only a penalty by review moved cannot tell a
       game that plays goals only from one that asks for nothing). */
    let seed = 6300, expected: any = null;
    for (; seed < 6600; seed++) {
      expected = seeded(seed, () => simToWeek(clone(before), target));
      const reviewed = seeded(seed, () => simToWeek(clone(before), target, { varReviews: ['goal'] }));
      if (JSON.stringify(reviewed.state.resultLog) !== JSON.stringify(expected.state.resultLog)) break;
    }
    expect(seed, 'no seeded run that reviews would change, so the case proves nothing').toBeLessThan(6600);
    act(() => seeded(seed, () => api.simToWeek(target)));
    expect(api.career.week).toBe(expected.state.week);
    expect(clone(api.career.resultLog), 'the results of the run differ from the engine without reviews').toEqual(clone(expected.state.resultLog));
    expect(JSON.stringify(api.career.resultLog).includes('"kind":"var"')).toBe(false);
    r.unmount();
  }, 240000);
});

describe.runIf(RULE === 'lit')('Club Manager: VAR lit, goals only (the lit rule)', () => {
  it('a live kick off saves the goal kind and is the half the engine plays when asked for the goal kind', async () => {
    const r = await booted();
    let guard = 0, before: any = null, seed = 0;
    while (api.phase !== 'halftime' && guard++ < 20) {
      before = clone(api.career); seed = 4100 + guard;
      act(() => seeded(seed, () => api.play()));
    }
    expect(api.phase, 'no match was kicked off').toBe('halftime');
    expect(api.career.live?.varReviews, 'the saved match does not carry the review opt in').toBe(true);
    expect(api.career.live.varKinds, 'the saved match does not carry the goal kind alone').toEqual(['goal']);
    const asked = seeded(seed, () => playNextEntry(clone(before), { varReviews: ['goal'] }));
    expect(asked.kind).toBe('halftime');
    expect(clone(api.career.live.h1Play), 'the half the hook kicked off is not the half the engine plays for the goal kind').toEqual(clone(asked.state.live!.h1Play));
    r.unmount();
  }, 180000);

  it('a Quick Sim is the engine asked for the goal kind, on matches where every kind staged would show a penalty by review', async () => {
    const r = await booted();
    let played = 0, chosen = 0, goalRows = 0;
    for (let guard = 0; guard < 40 && played < 8; guard++) {
      const before = clone(api.career);
      let seed = 15200 + guard * 500, found = false;
      for (let k = 0; k < 400 && !found; k++) {
        const all = seeded(seed + k, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: true }));
        if (all.kind === 'match' && rows(all.report, PEN) > 0) { seed += k; found = true; }
      }
      act(() => seeded(seed, () => api.quickPlay()));
      if (api.phase !== 'matchResult') { act(() => api.continueFromReport?.()); continue; }
      const expected = seeded(seed, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: ['goal'] }));
      expect(expected.kind).toBe('match');
      expect(rows(api.report, PEN), `match ${played + 1} shows a penalty by review`).toBe(0);
      expect(rows(api.report, '"decision":"awarded"'), `match ${played + 1} plays a kick a review gave`).toBe(0);
      expect(clone(api.report), `match ${played + 1} differs from the engine asked for the goal kind`).toEqual(clone(expected.report));
      goalRows += rows(api.report, GOAL);
      played++;
      if (found) chosen++;
      act(() => api.continueFromReport());
    }
    expect(played, 'too few matches were played to say anything').toBeGreaterThanOrEqual(8);
    expect(chosen, 'too few matches a penalty by review would show in, so the case proves nothing').toBeGreaterThanOrEqual(4);
    console.info(`clubManagerVarLive, lit: Quick Sim, ${played} matches, ${chosen} chosen where every kind staged shows a penalty by review, ${goalRows} goal review rows`);
    r.unmount();
  }, 280000);

  it('the fast forward is the engine run asked for the goal kind, on a run that differs both from no reviews and from every kind', async () => {
    const r = await booted();
    const before = clone(api.career);
    const target = before.week + 6;
    let seed = 26300, goal: any = null;
    for (; seed < 27300; seed++) {
      goal = seeded(seed, () => simToWeek(clone(before), target, { varReviews: ['goal'] }));
      const plain = seeded(seed, () => simToWeek(clone(before), target));
      const all = seeded(seed, () => simToWeek(clone(before), target, { varReviews: true }));
      const g = JSON.stringify(goal.state.resultLog);
      if (g !== JSON.stringify(plain.state.resultLog) && g !== JSON.stringify(all.state.resultLog)) break;
    }
    expect(seed, 'no seeded run the three asks play three ways, so the case proves nothing').toBeLessThan(27300);
    act(() => seeded(seed, () => api.simToWeek(target)));
    expect(api.career.week).toBe(goal.state.week);
    expect(clone(api.career.resultLog), 'the fast forward is not the engine run asked for the goal kind').toEqual(clone(goal.state.resultLog));
    console.info(`clubManagerVarLive, lit: fast forward on seed ${seed}, to week ${api.career.week}`);
    r.unmount();
  }, 280000);
});
