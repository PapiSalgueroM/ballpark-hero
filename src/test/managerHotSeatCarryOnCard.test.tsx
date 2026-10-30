/**
 * Round 956 review fix: the Carry on in Club Manager card, wired as a player
 * meets it. The lib's rule (src/test/managerHotSeatCarryOn.test.ts and
 * scripts/simManagerHotSeat.mjs section 5) was held, but nothing committed
 * checked the card's buttons, that a sacked manager sees no card, or that the
 * offer survives a trip back to the menu. This file does, through the real
 * component and Club Manager's own save. Round 1592 (report fe949903): the
 * main button never writes over a career; with all three slots full it opens
 * a chooser naming each career, whose Cancel writes nothing.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ManagerHotSeatBoard, { CarryOnCard } from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import { clearCareer, loadCareer, saveCareer, startCareer } from '@/lib/clubManager';
import { activeSlot, parkedKey, summarize, switchSlot } from '@/lib/clubManagerSlots';
import { backupKeysOf } from '@/lib/brokenSaveRecovery';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import {
  answerHotSeatPress,
  hotSeatPool,
  pendingPress,
  playHotSeatMatch,
  startHotSeat,
  type HotSeatRun,
} from '@/lib/managerHotSeat';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const KEY = 'dukb-club-manager-save';
let kept: HotSeatRun;

/** Every key and value in the store, in key order. */
function snap(): string {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i)!);
  return JSON.stringify(keys.sort().map(k => [k, localStorage.getItem(k)]));
}
let sacked: HotSeatRun | null = null;

/** The silent manager's run to its verdict, the way the harness plays it. */
function playOut(run: HotSeatRun): HotSeatRun {
  let r = run;
  for (let i = 0; i < 40 && !r.verdict; i++) r = pendingPress(r) ? answerHotSeatPress(r, 0) : playHotSeatMatch(r, 'balanced', null);
  return r;
}

beforeAll(() => {
  const club = hotSeatPool()[0].club;
  for (let seed = 1; seed < 40 && (!kept || !sacked); seed++) {
    const r = playOut(startHotSeat({ club, seed }));
    if (r.verdict?.kind === 'survived' && !kept) kept = r;
    if ((r.verdict?.kind === 'sacked' || r.verdict?.kind === 'boardSacked') && !sacked) sacked = r;
  }
  if (!kept) throw new Error('no seed under 40 kept the job');
}, 240000);

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); clearCareer(); localStorage.clear(); });

describe('Manager Hot Seat: the Carry on in Club Manager card', () => {
  it('on an empty device the main button saves the run and opens Club Manager', () => {
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    expect(openPath).toHaveBeenCalledWith('/club-manager');
    expect(loadCareer()?.clubName).toBe(kept.state.clubName);
  });

  it('report fe949903: a saved career stays in slot 1 and the card says the job goes into slot 2', () => {
    const other = hotSeatPool()[hotSeatPool().length - 1].club;
    expect(saveCareer(startCareer(other))).toBe(true);
    const before = summarize(localStorage.getItem(KEY));
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    const where = view.getByTestId('hot-seat-carry-on-slot').textContent ?? '';
    expect(where).toContain('slot 2');
    expect(where).toContain(other);
    expect(view.queryByRole('button', { name: /Replace/ })).toBeNull();

    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    expect(openPath).toHaveBeenCalledWith('/club-manager');
    expect(activeSlot()).toBe(2);
    expect(loadCareer()?.clubName).toBe(kept.state.clubName);
    expect(summarize(localStorage.getItem(parkedKey(1)))).toEqual(before);
  }, 60000);

  it('all three slots full: the chooser names each career, Cancel writes nothing, a pick keeps a copy aside', () => {
    const clubs = [1, 2, 3].map(i => hotSeatPool()[i].club);
    expect(saveCareer(startCareer(clubs[0]))).toBe(true);
    expect(switchSlot(2)).toBe(true);
    expect(saveCareer(startCareer(clubs[1]))).toBe(true);
    expect(switchSlot(3)).toBe(true);
    expect(saveCareer(startCareer(clubs[2]))).toBe(true);
    expect(switchSlot(1)).toBe(true);
    const before = snap();
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    expect(view.getByTestId('hot-seat-carry-on-slot').textContent).toContain('All three');

    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    const chooser = view.getByTestId('hot-seat-carry-on-choose');
    clubs.forEach((club, i) => expect(view.getByTestId(`hot-seat-carry-on-replace-${i + 1}`).textContent).toContain(club));
    expect(chooser.textContent).toContain('kept aside');
    expect(snap()).toBe(before);

    fireEvent.click(view.getByRole('button', { name: 'Cancel, keep all three' }));
    expect(view.queryByTestId('hot-seat-carry-on-choose')).toBeNull();
    expect(snap()).toBe(before);
    expect(openPath).not.toHaveBeenCalled();

    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    const third = localStorage.getItem(parkedKey(3));
    fireEvent.click(view.getByTestId('hot-seat-carry-on-replace-3'));
    expect(openPath).toHaveBeenCalledWith('/club-manager');
    expect(activeSlot()).toBe(3);
    expect(loadCareer()?.clubName).toBe(kept.state.clubName);
    const entry = CONTINUE_SAVES.find(e => e.saveKey === KEY)!;
    const aside = backupKeysOf(entry, localStorage);
    expect(aside.map(k => localStorage.getItem(k))).toEqual([third]);
  }, 120000);

  /* Review fix (r1592-run-w finding 3): the note sat under Cancel, below the fold. */
  it('a slot changed under the open chooser: nothing is written and the note sits above the options', () => {
    const clubs = [1, 2, 3].map(i => hotSeatPool()[i].club);
    expect(saveCareer(startCareer(clubs[0]))).toBe(true);
    expect(switchSlot(2)).toBe(true);
    expect(saveCareer(startCareer(clubs[1]))).toBe(true);
    expect(switchSlot(3)).toBe(true);
    expect(saveCareer(startCareer(clubs[2]))).toBe(true);
    expect(switchSlot(1)).toBe(true);
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    const chooser = view.getByTestId('hot-seat-carry-on-choose');
    expect(chooser.textContent).toContain('deleted for good');
    localStorage.setItem(parkedKey(2), '{another tab');
    const before = snap();
    fireEvent.click(view.getByTestId('hot-seat-carry-on-replace-2'));
    expect(snap()).toBe(before);
    expect(openPath).not.toHaveBeenCalled();
    const notes = view.getAllByRole('status');
    expect(notes.length).toBe(1);
    expect(notes[0].textContent).toContain('changed since this card read it');
    expect(chooser.contains(notes[0])).toBe(true);
    const first = view.getByTestId('hot-seat-carry-on-replace-1');
    expect(notes[0].compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }, 120000);

  it('says so and goes nowhere when the browser refuses the write', () => {
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    expect(view.getByRole('status').textContent).toContain('would not save');
    expect(openPath).not.toHaveBeenCalled();
  });

  it('a sacked manager gets no card at all', () => {
    expect(sacked).not.toBeNull();
    const view = render(<CarryOnCard run={sacked!} openPath={vi.fn()} />);
    expect(view.queryByTestId('hot-seat-carry-on')).toBeNull();
  });
});

describe('Manager Hot Seat: the offer waits on the menu', () => {
  const FREE_KEY = 'manager-hot-seat-free';
  const freeRecord = (run: HotSeatRun, extra: Record<string, unknown>) =>
    JSON.stringify({ v: 1, club: run.setup.club, seed: run.setup.seed, actions: run.actions, done: true, ...extra });
  const board = () => render(<MemoryRouter><ManagerHotSeatBoard /></MemoryRouter>);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('a finished free run that kept the job reopens on its verdict with the offer', () => {
    localStorage.setItem(FREE_KEY, freeRecord(kept, { kind: 'survived' }));
    const view = board();
    fireEvent.click(view.getByRole('button', { name: `See the Club Manager offer for ${kept.setup.club}` }));
    act(() => { vi.advanceTimersByTime(50); });
    expect(view.getByTestId('hot-seat-verdict')).toBeTruthy();
    expect(view.getByTestId('hot-seat-carry-on')).toBeTruthy();
  }, 120000);

  it('a sacked run, and a finished record from before the offer, show no way back to it', () => {
    localStorage.setItem(FREE_KEY, freeRecord(sacked!, { kind: sacked!.verdict!.kind }));
    let view = board();
    expect(view.queryByRole('button', { name: /See the Club Manager offer/ })).toBeNull();
    cleanup();
    localStorage.setItem(FREE_KEY, freeRecord(kept, {}));
    view = board();
    expect(view.queryByRole('button', { name: /See the Club Manager offer/ })).toBeNull();
  });
});
