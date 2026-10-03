/**
 * Round 956: a manager who keeps the job in Manager Hot Seat can carry on in
 * Club Manager. The run's state goes across through Club Manager's own
 * saveCareer and comes back through its own loadCareer, a sacked manager gets
 * no offer, and a Club Manager career already on the device is never replaced
 * without the player saying so. scripts/simManagerHotSeat.mjs section 5 plays
 * the handed over seasons to the end across leagues; this file holds the
 * small rules one at a time.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { clearCareer, ensureHandover, loadCareer, saveCareer, startCareer } from '@/lib/clubManager';
import {
  canCarryOn,
  carryOnInClubManager,
  carryOnSummary,
  existingClubManagerSave,
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
    expect(carryOnInClubManager(withVerdict('sacked'), { replace: true })).toBe('refused');
    expect(carryOnInClubManager(withVerdict('boardSacked'), { replace: true })).toBe('refused');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('the save Club Manager opens is the run as it stands', () => {
    const run = withVerdict('survived');
    expect(carryOnInClubManager(run, { replace: false })).toBe('saved');
    const loaded = loadCareer();
    expect(loaded).not.toBeNull();
    expect(loaded!.clubName).toBe(run.state.clubName);
    expect(loaded!.week).toBe(run.state.week);
    expect(loaded!.calendar.length).toBe(run.state.calendar.length);
    expect(loaded!.boardConfidence).toBe(run.state.boardConfidence);
    expect(loaded!.table.map(r => [r.club, r.pts])).toEqual(run.state.table.map(r => [r.club, r.pts]));
  });

  it('never replaces a career already saved without the say so', () => {
    expect(saveCareer(startCareer(hotSeatPool()[1].club))).toBe(true);
    const before = localStorage.getItem(KEY);
    expect(existingClubManagerSave()?.club).toBe(hotSeatPool()[1].club);
    const run = withVerdict('reprieve');
    expect(carryOnInClubManager(run, { replace: false })).toBe('confirm');
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(carryOnInClubManager(run, { replace: true })).toBe('saved');
    expect(loadCareer()!.clubName).toBe(run.state.clubName);
  }, 60000);

  it('a save that cannot be read still counts as a save', () => {
    localStorage.setItem(KEY, '{not json');
    expect(existingClubManagerSave()).toEqual({ club: null, season: null });
    expect(carryOnInClubManager(withVerdict('survived'), { replace: false })).toBe('confirm');
    expect(localStorage.getItem(KEY)).toBe('{not json');
  });

  it('says so when the browser refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(carryOnInClubManager(withVerdict('survived'), { replace: true })).toBe('failed');
  });

  it('goes across with Club Manager\'s takeover stamp, so the weeks before you are not scored as yours', () => {
    const run = withVerdict('survived');
    expect(run.state.handover).toMatchObject({ pts: run.takeover.points, played: run.takeover.played });
    expect(run.state.midSeasonStart).toBeTruthy();
    expect(carryOnInClubManager(run, { replace: false })).toBe('saved');
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
