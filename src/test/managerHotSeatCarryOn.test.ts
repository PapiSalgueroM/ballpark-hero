/**
 * Round 956: a manager who keeps the job in Manager Hot Seat can carry on in
 * Club Manager. The run's state goes across through Club Manager's own
 * saveCareer and comes back through its own loadCareer, and a sacked manager
 * gets no offer. Round 1592 (report fe949903): the career goes into an empty
 * manager slot and never over one; with all three full, only into the slot
 * the player picked, whose career is kept aside first; a refused write moves
 * nothing. scripts/simManagerHotSeat.mjs section 5 plays
 * the handed over seasons to the end across leagues; this file holds the
 * small rules one at a time.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { clearCareer, ensureHandover, loadCareer, saveCareer, startCareer } from '@/lib/clubManager';
import { SLOTS_INDEX_KEY, activeSlot, parkedKey, readSlots, summarize, switchSlot, type SlotView } from '@/lib/clubManagerSlots';
import { handOverCareer } from '@/lib/clubManagerHandOver';
import { pointKeyPrefix, pointsIndexKey } from '@/lib/cmSavePointsStore';
import { backupKeysOf, offeredBackup } from '@/lib/brokenSaveRecovery';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { FENCE_PREFIX } from '@/lib/saveFence';
import {
  canCarryOn,
  carryOnInClubManager,
  carryOnSummary,
  handoverState,
  hotSeatMeters,
  hotSeatPool,
  startHotSeat,
  type HotSeatRun,
  type VerdictKind,
} from '@/lib/managerHotSeat';

const KEY = 'dukb-club-manager-save';
let base: HotSeatRun;

function withVerdict(kind: VerdictKind): HotSeatRun {
  return { ...base, verdict: { kind, points: base.points, target: base.target, leaguePlayed: base.leaguePlayed, matches: base.log.length } };
}

/** The carry the way the card makes it: Club Manager's hand over, with the slot picked when all three are full. */
const carry = (run: HotSeatRun, replace?: SlotView) => carryOnInClubManager(run, career => handOverCareer(career, replace));

/** Every key and value in the store, in key order. */
function snap(): string {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i)!);
  return JSON.stringify(keys.sort().map(k => [k, localStorage.getItem(k)]));
}

/** A Club Manager career in each of the three slots, slot 1 active. */
function fillThree(): void {
  expect(saveCareer(startCareer(hotSeatPool()[1].club))).toBe(true);
  expect(switchSlot(2)).toBe(true);
  expect(saveCareer(startCareer(hotSeatPool()[2].club))).toBe(true);
  expect(switchSlot(3)).toBe(true);
  expect(saveCareer(startCareer(hotSeatPool()[3].club))).toBe(true);
  expect(switchSlot(1)).toBe(true);
  expect(readSlots().every(v => v.summary)).toBe(true);
}

beforeAll(() => {
  base = startHotSeat({ club: hotSeatPool()[0].club, seed: 956 });
}, 120000);

afterEach(() => {
  vi.restoreAllMocks();
  clearCareer();
  localStorage.clear();
});

describe('Manager Hot Seat: carry on in Club Manager', () => {
  it('offers the carry on only to a manager still in the job', () => {
    expect(canCarryOn(base)).toBe(false);
    expect(canCarryOn(withVerdict('survived'))).toBe(true);
    expect(canCarryOn(withVerdict('reprieve'))).toBe(true);
    expect(canCarryOn(withVerdict('sacked'))).toBe(false);
    expect(canCarryOn(withVerdict('boardSacked'))).toBe(false);
  });

  it('a sacked manager writes nothing, even to an empty device', () => {
    expect(carry(withVerdict('sacked'))).toBe('refused');
    expect(carry(withVerdict('boardSacked'))).toBe('refused');
    expect(snap()).toBe('[]');
  });

  it('the save Club Manager opens is the run as it stands', () => {
    const run = withVerdict('survived');
    expect(carry(run)).toBe('saved');
    expect(activeSlot()).toBe(1);
    const loaded = loadCareer();
    expect(loaded).not.toBeNull();
    expect(loaded!.clubName).toBe(run.state.clubName);
    expect(loaded!.week).toBe(run.state.week);
    expect(loaded!.calendar.length).toBe(run.state.calendar.length);
    expect(loaded!.boardConfidence).toBe(run.state.boardConfidence);
    expect(loaded!.table.map(r => [r.club, r.pts])).toEqual(run.state.table.map(r => [r.club, r.pts]));
  });

  it('report fe949903: a career in slot 1 stays, the job goes into empty slot 2', () => {
    const mine = startCareer(hotSeatPool()[1].club);
    expect(saveCareer(mine)).toBe(true);
    const was = summarize(localStorage.getItem(KEY));
    const run = withVerdict('reprieve');
    expect(carry(run)).toBe('saved');
    expect(activeSlot()).toBe(2);
    expect(summarize(localStorage.getItem(parkedKey(1)))).toEqual(was);
    expect(loadCareer()!.clubName).toBe(run.state.clubName);
    /* And slot 1 opens on the career it held. */
    expect(switchSlot(1)).toBe(true);
    const back = loadCareer()!;
    expect([back.clubName, back.season, back.week]).toEqual([mine.clubName, mine.season, mine.week]);
  }, 60000);

  it('the active slot 2 holding a career and slot 1 empty: the job lands in slot 1', () => {
    localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 2 }));
    expect(saveCareer(startCareer(hotSeatPool()[2].club))).toBe(true);
    expect(readSlots().map(v => !!v.summary)).toEqual([false, true, false]);
    expect(carry(withVerdict('survived'))).toBe('saved');
    expect(activeSlot()).toBe(1);
    expect(summarize(localStorage.getItem(parkedKey(2)))?.clubName).toBe(hotSeatPool()[2].club);
  }, 60000);

  it('a save that cannot be read still counts as a career, and its bytes are kept', () => {
    localStorage.setItem(KEY, '{not json');
    expect(carry(withVerdict('survived'))).toBe('saved');
    expect(activeSlot()).toBe(2);
    expect(localStorage.getItem(parkedKey(1))).toBe('{not json');
  });

  it('a new career in a slot never finds old save points there', () => {
    localStorage.setItem(pointsIndexKey(1), JSON.stringify({ v: 1, points: [], credited: [1], blocked: [] }));
    localStorage.setItem(`${pointKeyPrefix(1)}abc`, 'x');
    expect(carry(withVerdict('survived'))).toBe('saved');
    expect(localStorage.getItem(pointsIndexKey(1))).toBeNull();
    expect(localStorage.getItem(`${pointKeyPrefix(1)}abc`)).toBeNull();
  });

  it('with all three slots full nothing is written until a career is picked', () => {
    fillThree();
    const before = snap();
    expect(carry(withVerdict('survived'))).toBe('full');
    expect(snap()).toBe(before);
  }, 90000);

  it('a picked career is kept aside first, its points go, the others stay byte for byte', () => {
    fillThree();
    localStorage.setItem(pointsIndexKey(2), JSON.stringify({ v: 1, points: [], credited: [1], blocked: [] }));
    const one = localStorage.getItem(KEY), three = localStorage.getItem(parkedKey(3)), two = localStorage.getItem(parkedKey(2));
    const run = withVerdict('survived');
    expect(carry(run, readSlots()[1])).toBe('saved');
    expect(activeSlot()).toBe(2);
    expect(loadCareer()!.clubName).toBe(run.state.clubName);
    expect(localStorage.getItem(parkedKey(3))).toBe(three);
    expect(summarize(localStorage.getItem(parkedKey(1)))).toEqual(summarize(one));
    expect(localStorage.getItem(pointsIndexKey(2))).toBeNull();
    const entry = CONTINUE_SAVES.find(e => e.saveKey === KEY)!;
    const kept = backupKeysOf(entry, localStorage);
    expect(kept.length).toBe(1);
    expect(localStorage.getItem(kept[0])).toBe(two);
    /* Offered back in slot 2, the slot it came from. */
    expect(offeredBackup(entry, localStorage)).toBe(kept[0]);
  }, 90000);

  it('a slot that changed since the card read it is not replaced', () => {
    fillThree();
    const shown = readSlots()[2];
    expect(switchSlot(3)).toBe(true);
    const other = startCareer(hotSeatPool()[4].club);
    expect(saveCareer(other)).toBe(true);
    const before = snap();
    expect(carry(withVerdict('survived'), shown)).toBe('changed');
    expect(snap()).toBe(before);
  }, 90000);

  it('says so when the browser refuses the write, and nothing moves', () => {
    expect(saveCareer(startCareer(hotSeatPool()[1].club))).toBe(true);
    const before = snap();
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === KEY) throw new Error('quota');
      return real.call(this, k, v);
    });
    expect(carry(withVerdict('survived'))).toBe('failed');
    expect(snap()).toBe(before);
    vi.restoreAllMocks();
    fillThree();
    const full = snap();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === KEY) throw new Error('quota');
      return real.call(this, k, v);
    });
    expect(carry(withVerdict('survived'), readSlots()[0])).toBe('failed');
    expect(snap()).toBe(full);
  }, 90000);

  /* Review fix (r1592-run-m m2): a replace of a PARKED slot swaps to it first,
     so a refusal after that must swap back. Only the fence's generation may
     move, as it does on any swap (src/lib/saveFence.ts). */
  it('a refused replace of a parked slot swaps back, and nothing else moves', () => {
    fillThree();
    const unfenced = () => JSON.stringify((JSON.parse(snap()) as [string, string][]).filter(([k]) => !k.startsWith(FENCE_PREFIX)));
    const before = unfenced();
    const one = localStorage.getItem(KEY), two = localStorage.getItem(parkedKey(2));
    const real = Storage.prototype.setItem;
    const rules: [string, (k: string, v: string) => boolean][] = [
      ['its kept aside copy', k => k.startsWith(`${KEY}.broken-`)],
      ['the career after the swap', (k, v) => k === KEY && v !== one && v !== two],
    ];
    for (const [, refused] of rules) {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
        if (refused(k, v)) throw new Error('quota');
        return real.call(this, k, v);
      });
      expect(carry(withVerdict('survived'), readSlots()[1])).toBe('failed');
      vi.restoreAllMocks();
      expect(activeSlot()).toBe(1);
      expect(unfenced()).toBe(before);
    }
  }, 90000);

  it('goes across with Club Manager\'s takeover stamp, so the weeks before you are not scored as yours', () => {
    const run = withVerdict('survived');
    expect(run.state.handover).toMatchObject({ pts: run.takeover.points, played: run.takeover.played });
    expect(run.state.midSeasonStart).toBeTruthy();
    expect(carry(run)).toBe('saved');
    const loaded = loadCareer()!;
    expect(ensureHandover(loaded)).toMatchObject({ pts: run.takeover.points, played: run.takeover.played });
    expect(loaded.midSeasonStart).toBe(run.state.midSeasonStart);
  });

  it('the card reads the career, not the games in the job', () => {
    const s = carryOnSummary(base);
    const row = base.state.table.find(r => r.club === base.state.clubName)!;
    expect(s.leaguePlayed).toBe(row.w + row.d + row.l);
    expect(s.leaguePlayed).toBe(base.takeover.played);
    expect(s.leaguePlayed).toBeGreaterThan(base.leaguePlayed);
    expect(s.clubs).toBe(base.state.table.length);
    expect(s.points).toBe(row.pts);
    expect(s.board).toBe(hotSeatMeters(base.state).board.shown);
  });

  it('leaves the previous manager\'s post behind', () => {
    const copy = handoverState(base);
    expect(copy.inbox.every(m => m.week >= base.takeover.calendarWeek)).toBe(true);
  });

  it('the handed over career is a copy, not the run itself', () => {
    const copy = handoverState(base);
    copy.table[0].pts += 100;
    expect(base.state.table[0].pts).not.toBe(copy.table[0].pts);
  });
});
