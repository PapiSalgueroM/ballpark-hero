import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useClubManager } from '@/hooks/useClubManager';
import * as E from '@/lib/clubManager';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import { activeSlot, readSlots, switchSlot } from '@/lib/clubManagerSlots';
import { createSaveFence, saveFence } from '@/lib/saveFence';
import { readVeteranReviews } from '@/lib/clubManagerVeteranLedger';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
}));

type ReviewAction = (id: string) => Promise<boolean>;
type Api = ReturnType<typeof useClubManager> & { reviewVeteran?: ReviewAction };
type Commit = { career: CareerState | null; raw: string | null };
let current: Api | null = null;
let commits: Commit[] = [];
const ids = ['fictional-hook-veteran-one', 'fictional-hook-veteran-two'] as const;
function Harness() {
  const game: Api = useClubManager();
  current = game;
  useLayoutEffect(() => {
    commits.push({ career: game.career, raw: localStorage.getItem(E.SAVE_KEY) });
  }, [game.career]);
  return <p>{game.phase}</p>;
}
function read(): Api {
  if (!current) throw new Error('The actual career hook has not mounted.');
  return current;
}
function career(): CareerState {
  const value = read().career;
  if (!value) throw new Error('The actual hook has no current career.');
  return value;
}
function action(): ReviewAction {
  const fn = read().reviewVeteran;
  expect(typeof fn, 'CM_VETERAN_HOOK_ACTION_AVAILABLE').toBe('function');
  if (!fn) throw new Error('The owned action assertion should fail first.');
  return fn;
}
function raw(): string {
  const value = localStorage.getItem(E.SAVE_KEY);
  expect(typeof value, 'CM_VETERAN_HOOK_RAW_FOUNDATION').toBe('string');
  return value!;
}
function reviewRaw(state: CareerState) {
  return (state as CareerState & { veteranReviews?: unknown }).veteranReviews;
}
function reviewCount(state = career()) {
  const ledger = readVeteranReviews(reviewRaw(state));
  expect(ledger, 'CM_VETERAN_HOOK_VALID_PUBLISHED_LEDGER').not.toBeNull();
  return ledger!.reviews.length;
}
function store() {
  return Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
    .sort().map(key => [key, localStorage.getItem(key)]));
}
async function realReview() {
  return vi.importActual<typeof import('@/lib/clubManagerVeteranRetirement')>('@/lib/clubManagerVeteranRetirement');
}
function gateImport() {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  vi.doMock('@/lib/clubManagerVeteranRetirement', async () => {
    enter(); await gate;
    return vi.importActual<typeof import('@/lib/clubManagerVeteranRetirement')>('@/lib/clubManagerVeteranRetirement');
  });
  return { entered, release };
}
async function boot(edit?: (state: CareerState) => CareerState, atReview = true) {
  const made = E.startCareer('Everton'), donors = made.squad.filter(player => !player.onLoan).slice(0, 2);
  expect(donors.length, 'CM_VETERAN_HOOK_TWO_ACTUAL_OWNED_DONORS').toBe(2);
  // Explicitly fictional review fixtures, not facts about the original roster.
  const veterans: CMPlayer[] = donors.map((donor, index) => ({
    ...donor, id: ids[index], name: 'Fictional Hook Veteran ' + (index + 1), generated: true,
    worldRosterKey: undefined, worldRosterSince: undefined, age: 36 + index,
    contractYears: 3, wage: 3, role: 'rotation', lastTen: [1, 0, 1, 0], wantsOut: false,
    onLoan: undefined, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, academyGrad: false,
  }));
  let prepared: CareerState = {
    ...made, budget: 500, live: null, pendingMove: null,
    squad: made.squad.map(player => veterans[donors.findIndex(donor => donor.id === player.id)] ?? player),
  };
  if (atReview) {
    const finished = E.finishSeason({ ...prepared, week: prepared.calendar.length, pendingSummary: null });
    expect(finished.state.pendingSummary, 'CM_VETERAN_HOOK_REAL_FINISH_SEASON').toEqual(finished.summary);
    prepared = finished.state;
  }
  if (edit) prepared = edit(prepared);
  saveFence.release(E.SAVE_KEY);
  expect(E.saveCareer(prepared), 'CM_VETERAN_HOOK_REAL_FIXTURE_WRITE').toBe(true);
  const view = render(<Harness />);
  await waitFor(() => expect(read().phase).toBe('resume'), { timeout: 10000 });
  act(() => read().resume());
  await waitFor(() => expect(read().phase).toBe(atReview ? 'seasonEnd' : 'hub'), { timeout: 10000 });
  expect(career().squad.filter(player => ids.includes(player.id as typeof ids[number])).length).toBe(2);
  if (atReview) {
    expect(career().week).toBe(career().calendar.length);
    expect(career().pendingSummary?.season).toBe(career().season);
    expect(career().pendingSummary?.club).toBe(career().clubName);
  }
  commits = [];
  return view;
}
function refuseWrites() {
  const actual = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage && key === E.SAVE_KEY)
      throw new DOMException('Controlled career quota refusal', 'QuotaExceededError');
    return actual.call(this, key, value);
  });
}
function otherTabWrite() {
  const other = createSaveFence(() => localStorage), newer = { ...career(), budget: career().budget + 1 };
  other.adopt(E.SAVE_KEY);
  expect(other.write(E.SAVE_KEY, () => { localStorage.setItem(E.SAVE_KEY, JSON.stringify(newer)); return true; }),
    'CM_VETERAN_HOOK_REAL_OTHER_TAB_WRITE').toBe('written');
  return raw();
}
beforeEach(async () => {
  // Initialize React's async task queue before observing game randomness.
  await act(async () => {});
  vi.doUnmock('@/lib/clubManagerVeteranRetirement');
  localStorage.clear(); sessionStorage.clear(); saveFence.release(E.SAVE_KEY);
  current = null; commits = [];
  let seed = 1461001;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.doUnmock('@/lib/clubManagerVeteranRetirement');
  saveFence.release(E.SAVE_KEY);
  current = null; commits = []; localStorage.clear(); sessionStorage.clear();
});

describe('Veteran review through the actual career hook and writer', { timeout: 120000 }, () => {
  it('saves the actual agreement before publication without changing phase or drawing randomness', async () => {
    const view = await boot(), R = await realReview(), before = career(), body = JSON.stringify(before);
    expect(R.previewVeteranRetirement(before, ids[0]).kind, 'CM_VETERAN_HOOK_ACTUAL_OFFER').toBe('offer');
    const expected = R.applyVeteranRetirement(before, ids[0]);
    expect(expected, 'CM_VETERAN_HOOK_ACTUAL_CANDIDATE').not.toBeNull();
    const run = action();
    const seededRandom = vi.mocked(Math.random).getMockImplementation();
    expect(typeof seededRandom, 'CM_VETERAN_HOOK_SEEDED_RANDOM_FOUNDATION').toBe('function');
    const randomCallStacks: string[] = [];
    const draws = vi.spyOn(Math, 'random').mockClear().mockImplementation(() => {
      randomCallStacks.push(new Error('CM_VETERAN_HOOK_RANDOM_CALL').stack ?? 'Caller stack unavailable');
      return seededRandom!();
    });
    let ok = false;
    await act(async () => { ok = await run(ids[0]); });
    expect(ok, 'CM_VETERAN_HOOK_AGREEMENT_SAVED').toBe(true);
    expect(JSON.stringify(career()), 'CM_VETERAN_HOOK_EXACT_ACTUAL_RESULT').toBe(JSON.stringify(expected));
    const publication = commits.find(row => row.career === career());
    expect(publication, 'CM_VETERAN_HOOK_PUBLICATION_FOUNDATION').toBeDefined();
    expect(JSON.parse(publication!.raw!), 'CM_VETERAN_HOOK_SAVED_BEFORE_PUBLICATION').toEqual(expected);
    expect(read().phase).toBe('seasonEnd'); expect(read().summary).toBe(before.pendingSummary);
    console.info('CM_VETERAN_HOOK_RANDOM_CALL_STACKS', JSON.stringify(randomCallStacks));
    expect(draws, 'CM_VETERAN_HOOK_NO_RANDOMNESS').not.toHaveBeenCalled();
    expect(JSON.stringify(before), 'CM_VETERAN_HOOK_INPUT_HELD').toBe(body);
    expect(career().xiIds).toEqual(before.xiIds); expect(career().xiDuties).toEqual(before.xiDuties);
    view.unmount();
    const loaded = E.loadCareer();
    expect(loaded, 'CM_VETERAN_HOOK_ACTUAL_RELOAD_FOUNDATION').not.toBeNull();
    expect(reviewRaw(loaded!), 'CM_VETERAN_HOOK_ACTUAL_RELOAD').toEqual(reviewRaw(expected!));
  });

  it('records the actual deterministic decline without renewing or changing rewards', async () => {
    await boot(state => ({ ...state, squad: state.squad.map(player =>
      player.id === ids[0] ? { ...player, wantsOut: true } : player) }));
    const before = career(), R = await realReview(), expected = R.applyVeteranRetirement(before, ids[0]);
    expect(R.previewVeteranRetirement(before, ids[0]), 'CM_VETERAN_HOOK_DECLINE_FOUNDATION')
      .toMatchObject({ kind: 'offer', decision: 'declined' });
    let ok = false;
    await act(async () => { ok = await action()(ids[0]); });
    expect(ok, 'CM_VETERAN_HOOK_DECLINE_SAVED').toBe(true);
    expect(JSON.stringify(career())).toBe(JSON.stringify(expected));
    expect(career().budget).toBe(before.budget); expect(career().squad).toBe(before.squad);
    expect(read().phase).toBe('seasonEnd');
  });

  it('keeps memory and all old raw bytes on quota refusal and commits the actual retry', async () => {
    await boot();
    const before = career(), held = store(), R = await realReview(), expected = R.applyVeteranRetirement(before, ids[0]);
    expect(expected).not.toBeNull();
    const run = action(), fault = refuseWrites();
    let ok = true;
    await act(async () => { ok = await run(ids[0]); });
    expect(fault.mock.calls.some(([key]) => key === E.SAVE_KEY), 'CM_VETERAN_HOOK_ACTUAL_QUOTA_REACHED').toBe(true);
    expect(ok, 'CM_VETERAN_HOOK_QUOTA_FALSE').toBe(false);
    expect(career(), 'CM_VETERAN_HOOK_QUOTA_NO_PUBLICATION').toBe(before);
    expect(store(), 'CM_VETERAN_HOOK_QUOTA_FENCE_AND_RAW_ROLLBACK').toEqual(held);
    expect(commits.some(row => row.career !== before)).toBe(false); expect(read().saveFailed).toBe(true);
    fault.mockRestore();
    await act(async () => { ok = await run(ids[0]); });
    expect(ok, 'CM_VETERAN_HOOK_QUOTA_RETRY_SAVED').toBe(true);
    expect(JSON.parse(raw())).toEqual(expected); expect(read().saveFailed).toBe(false);
  });

  it('permits only one pending talk across different players and releases the lock after completion', async () => {
    await boot();
    const run = action(), gate = gateImport(), before = career(), R = await realReview();
    expect(R.applyVeteranRetirement(before, ids[1]), 'CM_VETERAN_HOOK_SECOND_PLAYER_ELIGIBLE').not.toBeNull();
    let first!: Promise<boolean>, second = true, firstOk = false;
    await act(async () => {
      first = run(ids[0]); await gate.entered;
      second = await run(ids[1]); gate.release(); firstOk = await first;
    });
    expect(second, 'CM_VETERAN_HOOK_GLOBAL_PENDING_REFUSAL').toBe(false);
    expect(firstOk).toBe(true); expect(reviewCount()).toBe(1);
    let later = false;
    await act(async () => { later = await run(ids[1]); });
    expect(later, 'CM_VETERAN_HOOK_LOCK_RELEASES_FOR_LATER_PLAYER').toBe(true);
    expect(reviewCount()).toBe(2);
  });

  it('uses the saved authoritative ref for successive decisions before the parent rerenders', async () => {
    await boot();
    const before = career(), R = await realReview(), one = R.applyVeteranRetirement(before, ids[0]);
    expect(one).not.toBeNull();
    const expected = R.applyVeteranRetirement(one!, ids[1]); expect(expected).not.toBeNull();
    const run = action();
    let results: boolean[] = [];
    await act(async () => { results = [await run(ids[0]), await run(ids[1])]; });
    expect(results, 'CM_VETERAN_HOOK_SAME_TURN_CURRENT_REF').toEqual([true, true]);
    expect(JSON.stringify(career())).toBe(JSON.stringify(expected));
    expect(JSON.parse(raw())).toEqual(expected);
  });

  it('returns false for a real core refusal without writing or publishing a candidate', async () => {
    await boot();
    const before = career(), old = store(), R = await realReview();
    expect(R.applyVeteranRetirement(before, 'absent-fictional-player')).toBeNull();
    const run = action(), writes = vi.spyOn(Storage.prototype, 'setItem'), draws = vi.spyOn(Math, 'random').mockClear();
    let ok = true;
    await act(async () => { ok = await run('absent-fictional-player'); });
    expect(ok, 'CM_VETERAN_HOOK_CORE_REFUSAL_FALSE').toBe(false);
    expect(writes).not.toHaveBeenCalled(); expect(draws).not.toHaveBeenCalled();
    expect(career()).toBe(before); expect(store()).toEqual(old);
  });

  it('preserves a future raw review ledger and refuses the actual unsupported decision', async () => {
    const future = { v: 2, reviews: [], untouched: 'kept' };
    await boot(state => ({ ...state, veteranReviews: future } as CareerState));
    const before = career(), old = raw(), R = await realReview();
    expect(R.applyVeteranRetirement(before, ids[0])).toBeNull();
    let ok = true;
    await act(async () => { ok = await action()(ids[0]); });
    expect(ok, 'CM_VETERAN_HOOK_FUTURE_RAW_REFUSED').toBe(false);
    expect(career()).toBe(before); expect(raw()).toBe(old);
    expect((career() as CareerState & { veteranReviews: unknown }).veteranReviews).toEqual(future);
  });

  it('returns false when the lazy module transport fails without changing the saved career', async () => {
    await boot();
    const before = career(), old = store(), run = action();
    vi.doMock('@/lib/clubManagerVeteranRetirement', async () => { throw new Error('Controlled retirement chunk failure'); });
    let ok = true;
    await act(async () => { ok = await run(ids[0]); });
    expect(ok, 'CM_VETERAN_HOOK_IMPORT_FAILURE_FALSE').toBe(false);
    expect(career()).toBe(before); expect(store()).toEqual(old); expect(read().phase).toBe('seasonEnd');
  });

  it('refuses before importing when another tab already owns a newer fenced save', async () => {
    await boot();
    const before = career(), run = action(), newer = otherTabWrite();
    let opened = false;
    vi.doMock('@/lib/clubManagerVeteranRetirement', async () => {
      opened = true;
      return vi.importActual<typeof import('@/lib/clubManagerVeteranRetirement')>('@/lib/clubManagerVeteranRetirement');
    });
    let ok = true;
    await act(async () => { ok = await run(ids[0]); });
    expect(ok, 'CM_VETERAN_HOOK_PRE_IMPORT_STALE_FALSE').toBe(false);
    expect(opened, 'CM_VETERAN_HOOK_STALE_NO_IMPORT').toBe(false);
    expect(read().saveMoved).toBe(true); expect(career()).toBe(before); expect(raw()).toBe(newer);
  });

  it('rechecks the actual save fence after the awaited import and retains the newer tab bytes', async () => {
    await boot();
    const before = career(), run = action(), gate = gateImport();
    let pending!: Promise<boolean>, ok = true, newer = '';
    await act(async () => {
      pending = run(ids[0]); await gate.entered;
      newer = otherTabWrite(); gate.release(); ok = await pending;
    });
    expect(ok, 'CM_VETERAN_HOOK_POST_IMPORT_FENCE_FALSE').toBe(false);
    expect(career()).toBe(before); expect(raw()).toBe(newer); expect(read().saveMoved).toBe(true);
  });

  it('rechecks actual slot ownership after import and never overwrites the incoming slot', async () => {
    await boot();
    const before = career(), run = action(), gate = gateImport();
    expect(activeSlot()).toBe(1); expect(readSlots()[1].summary).toBeFalsy();
    let pending!: Promise<boolean>, ok = true, incoming: ReturnType<typeof store> = {};
    await act(async () => {
      pending = run(ids[0]); await gate.entered;
      expect(switchSlot(2, before), 'CM_VETERAN_HOOK_ACTUAL_PENDING_SLOT_SWITCH').toBe(true);
      expect(activeSlot()).toBe(2); incoming = store();
      gate.release(); ok = await pending;
    });
    expect(ok, 'CM_VETERAN_HOOK_POST_IMPORT_SLOT_FALSE').toBe(false);
    expect(store()).toEqual(incoming); expect(career()).toBe(before);
    await act(async () => { expect(await run(ids[1]), 'CM_VETERAN_HOOK_PRE_IMPORT_SLOT_FALSE').toBe(false); });
    expect(store()).toEqual(incoming);
  });

  it.each(['showSlots', 'startNew', 'nextSeason'] as const)(
    'invalidates a pending talk when actual %s moves context in the same pending React turn', async move => {
      await boot();
      const before = career(), run = action(), gate = gateImport(), rendered = read();
      expect(readSlots()[1].summary, 'CM_VETERAN_HOOK_REAL_EMPTY_DESTINATION').toBeFalsy();
      let pending!: Promise<boolean>, ok = true;
      await act(async () => {
        pending = run(ids[0]); await gate.entered;
        rendered[move]();
        // The context action queued state, so the old render is still visible here.
        expect(read(), 'CM_VETERAN_HOOK_SAME_PENDING_RENDER_FOUNDATION').toBe(rendered);
        gate.release(); ok = await pending;
      });
      expect(ok, 'CM_VETERAN_HOOK_SAME_TURN_CONTEXT_REFUSED_' + move).toBe(false);
      expect(commits.some(row => row.career !== null && reviewRaw(row.career) !== undefined),
        'CM_VETERAN_HOOK_NO_LATE_REVIEW_PUBLICATION_' + move).toBe(false);
      for (const value of Object.values(store())) {
        if (!value) continue;
        try {
          const parsed: unknown = JSON.parse(value);
          if (parsed && typeof parsed === 'object')
            expect(Object.prototype.hasOwnProperty.call(parsed, 'veteranReviews'),
              'CM_VETERAN_HOOK_NO_LATE_REVIEW_SAVE_' + move).toBe(false);
        } catch (error) {
          if (error instanceof SyntaxError) continue;
          throw error;
        }
      }
      if (move === 'showSlots') { expect(read().phase).toBe('resume'); expect(career()).toBe(before); }
      if (move === 'startNew') { expect(read().phase).toBe('clubSelect'); expect(read().career).toBeNull(); }
      if (move === 'nextSeason') { expect(read().phase).toBe('hub'); expect(career().season).toBe(before.season + 1); }
    });

  it('refuses after unmount while retaining the actual unmount save and releasing no late candidate', async () => {
    const view = await boot(), run = action(), gate = gateImport();
    let pending!: Promise<boolean>, ok = true, held: ReturnType<typeof store> = {};
    await act(async () => {
      pending = run(ids[0]); await gate.entered;
      view.unmount(); held = store(); gate.release(); ok = await pending;
    });
    expect(ok, 'CM_VETERAN_HOOK_UNMOUNT_REFUSED').toBe(false);
    expect(store(), 'CM_VETERAN_HOOK_UNMOUNT_RAW_HELD').toEqual(held);
    expect(JSON.parse(localStorage.getItem(E.SAVE_KEY)!).veteranReviews).toBeUndefined();
  });
});
