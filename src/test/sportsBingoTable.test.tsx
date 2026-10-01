/**
 * Round 727: the Sports Bingo pass the device table, walked through the real
 * page in jsdom. scripts/simBingoSeats.mjs proves the engine with no page;
 * this proves the page drives it: the setup screen deals, the hand over shows
 * a name and no card, a turn turns players up one at a time from the table's
 * open pack and claims only what they satisfy, a CPU seat plays the same pack
 * the people do, the phone moves seat to seat, the result names the engine's
 * winner and books one completion, a game left mid turn comes back at the
 * hand over, a family pick too thin to fill a card says so on both screens,
 * the turn runs on the difficulty's clock and passes the phone at zero, and
 * the page leaves no timer running after it is gone.
 *
 * Shares the daily reload mocks (signed out auth, a stub Supabase client, the
 * counted recorder, the pool loader fed the baked pool), imported first.
 */
import './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, waitFor } from '@testing-library/react';
import { button, click, findButton, mountPage, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture } from './dailyReload/mocks';
import { players } from '@/data/players';
import {
  CARD_SIZE, FREE_INDEX, PACK_SIZE, claimableSquares, cpuClaims, cpuRng, declareWinner, loadBingoTable, secondsFor, squaresOf,
  type BingoGame, type BingoTable,
} from '@/lib/sportsBingo';
import SportsBingo from '@/pages/SportsBingo';

const lehmer = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

beforeEach(() => {
  resetMocks();
  localStorage.clear();
  setPoolFixture('squad', players);
  vi.spyOn(Math, 'random').mockImplementation(lehmer(727));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function mountSetup(): Promise<MountedPage> {
  const m = mountPage(<SportsBingo />, '/sports-bingo');
  await waitFor(() => button(m.container, /^Pass the device/));
  return m;
}

const grid = (m: MountedPage) => m.container.querySelector('div.grid-cols-5');
const squares = (m: MountedPage) => Array.from(grid(m)!.querySelectorAll('button'));
const saved = (): BingoTable => {
  const t = loadBingoTable();
  if (!t) throw new Error('no table saved');
  return t;
};

/** Every player name in the deal: none may be on screen at a hand over. */
const dealNames = (t: BingoTable) => t.packs.flat().map(p => p.name);

/** A seat's card over the table's packs, read straight off the saved table
 *  rather than through the engine's own seat view, so a page or engine that
 *  plays a seat on some other pack cannot agree with itself here. */
const cardOf = (t: BingoTable, seat: number): BingoGame => ({ cardIds: t.cards[seat], packs: t.packs });

/** The names face up on the turn screen's pack, top to bottom. A face down
 *  slot is a button; a face up player is a row whose first span is the name. */
function faceUp(m: MountedPage): string[] {
  const list = button(m.container, /^Done with this pack, pass the phone$/).parentElement!.firstElementChild!;
  return Array.from(list.children).filter(el => el.tagName === 'DIV').map(el => el.firstElementChild?.textContent ?? '');
}

/** The seat in the chair turns up `reveal` players and claims everything they satisfy. */
async function playTurn(m: MountedPage, reveal: number) {
  await click(button(m.container, /show me the pack$/));
  expect(grid(m)).not.toBeNull();
  expect(faceUp(m)).toEqual([]);
  for (let r = 0; r < reveal; r += 1) {
    await click(button(m.container, /Tap to turn up$/));
    /* What the seat is shown is the table's open pack, in order: the one
       every other seat hears and the one the engine judges claims against. */
    const now = saved();
    expect(faceUp(m)).toEqual(now.packs[now.packIndex].slice(0, r + 1).map(p => p.name));
  }
  const t = saved();
  const seat = t.seats[t.turn];
  expect(t.revealed).toBe(reveal);
  const shown = t.packs[t.packIndex].slice(0, t.revealed);
  const claim = claimableSquares(cardOf(t, seat.index), shown, seat.marked);
  /* A square nothing turned up satisfies is refused, the board unchanged. */
  const dud = Array.from({ length: CARD_SIZE }, (_, i) => i).find(i => i !== FREE_INDEX && !seat.marked[i] && !claim.includes(i));
  if (dud !== undefined) {
    await click(squares(m)[dud]);
    expect(saved().seats[seat.index].marked[dud]).toBe(false);
  }
  for (const sq of claim) await click(squares(m)[sq]);
  const after = saved().seats[seat.index].marked;
  for (const sq of claim) expect(after[sq]).toBe(true);
  await click(button(m.container, /^Done with this pack, pass the phone$/));
}

describe('Sports Bingo pass the device table', () => {
  it('deals, hides every card at the hand over, plays seat by seat with a CPU on the same packs and declares the engine winner', async () => {
    const m = await mountSetup();
    await click(button(m.container, /^Pass the device/));
    /* Three seats, the middle one a Ruthless CPU (the temper that marks the
       most), so the CPU's turn runs through the page between two people. */
    await click(button(m.container, /^3 seats$/));
    const toCpu = m.container.querySelector('button[aria-label="Seat 2, a person, tap to switch"]');
    expect(toCpu).not.toBeNull();
    await click(toCpu!);
    await click(button(m.container, /^Ruthless$/));
    await click(button(m.container, /^Deal the cards$/));
    expect(saved().seats.map(s => `${s.kind} ${s.kind === 'cpu' ? s.level : ''}`.trim())).toEqual(['human', 'cpu ruthless', 'human']);

    let turns = 0;
    let cpuMarks = 0;
    while (!m.container.querySelector('[role="status"]')) {
      if (++turns > 60) throw new Error('the table never finished');
      const t = saved();
      expect(t.phase).toBe('handover');
      expect(t.seats[t.turn].kind).toBe('human');
      /* The hand over: the next name and a ready button, no card, no player. */
      expect(grid(m)).toBeNull();
      const text = m.container.textContent ?? '';
      expect(text).toContain(t.seats[t.turn].name);
      for (const name of dealNames(t)) expect(text).not.toContain(name);
      /* Player 1 turns every player up and claims all; Player 3 turns up two. */
      await playTurn(m, t.turn === 0 ? PACK_SIZE : 2);
      /* The CPU in seat two plays straight after seat one, on the pack seat
         one just had. Its turn is replayed here on THAT pack, its own card,
         its temper and its own stream, and the board must match square for
         square, so a CPU dealt any other pack cannot pass by luck. */
      if (t.turn === 0) {
        const cpu = t.seats[1];
        const want = [...cpu.marked];
        for (const sq of cpuClaims(cardOf(t, 1), t.packs[t.packIndex], cpu.marked, cpu.level, cpuRng(t, 1))) want[sq] = true;
        const got = saved().seats[1].marked;
        expect(got).toEqual(want);
        cpuMarks += squaresOf(got) - squaresOf(cpu.marked);
      }
    }

    /* Three seats, so at least one full round of hand overs happened, and the CPU check above bit at least once. */
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(cpuMarks).toBeGreaterThan(0);
    const t = saved();
    expect(t.phase).toBe('done');
    const verdict = declareWinner(t);
    const card = m.container.querySelector('[role="status"]')!;
    const headline = card.querySelector('h2')?.textContent ?? '';
    const names = verdict.winners.map(i => t.seats[i].name);
    if (names.length === 1) expect(headline).toContain(`${names[0]} takes it`);
    else for (const n of names) expect(headline).toContain(n);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 30000);

  it('brings a game left mid turn back at the hand over for the same seat', async () => {
    const m = await mountSetup();
    await click(button(m.container, /^Pass the device/));
    await click(button(m.container, /^Deal the cards$/));
    await click(button(m.container, /show me the pack$/));
    await click(button(m.container, /Tap to turn up$/));
    const before = saved();
    expect(before.phase).toBe('turn');
    m.unmount();

    const again = await mountSetup();
    const resume = findButton(again.container, /^Resume pass the device/);
    expect(resume).not.toBeNull();
    await click(resume!);
    expect(grid(again)).toBeNull();
    expect(again.container.textContent ?? '').toContain(before.seats[before.turn].name);
    await click(button(again.container, /show me the pack$/));
    /* The turn restarts on the same seat and pack with nothing turned up (and
       a full clock, a known give recorded beside resumableTable in the page). */
    expect(saved().revealed).toBe(0);
    expect(saved().packIndex).toBe(before.packIndex);
    expect(saved().turn).toBe(before.turn);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('says so, on setup and on the turn, when the family pick cannot fill a card', async () => {
    const m = await mountSetup();
    await click(button(m.container, /^Pass the device/));
    for (const label of [/^Ages$/, /^Values$/, /^Goals and assists$/, /^Nationalities$/, /^Leagues$/]) await click(button(m.container, label));
    expect(m.container.textContent ?? '').toContain('Your pick fills 7 of 24 squares, so 17 on every card come from the families you dropped.');
    await click(button(m.container, /^Deal the cards$/));
    const t = saved();
    expect(t.families).toEqual(['position']);
    expect(t.fallback).toBe(true);
    expect(t.allowed).toBe(7);
    await click(button(m.container, /show me the pack$/));
    expect(m.container.textContent ?? '').toContain('Your families fill 7 of 24 squares, the rest came from the whole bank.');
  });

  it('runs every turn on the picked difficulty clock and passes the phone when it hits zero', async () => {
    const m = await mountSetup();
    await click(button(m.container, /^Pass the device/));
    await click(button(m.container, /^Quick/));
    await click(button(m.container, /^Deal the cards$/));
    expect(saved().difficulty).toBe('quick');
    const secs = secondsFor('quick');
    /* A pace the default does not share, or a setting that does nothing would pass. */
    expect(secs).not.toBe(secondsFor('standard'));

    /* Fake clocks from here: the turn's interval starts when the seat takes the phone. */
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const clock = () => (m.container.querySelector('span.tabular-nums')?.textContent ?? '').trim();
    const tick = async (n: number) => {
      for (let i = 0; i < n; i += 1) await act(async () => { vi.advanceTimersByTime(1000); });
    };

    /* Seat one, then seat two, each on pack one; when seat two runs out the round is over and pack two opens for seat one. */
    const after = [{ turn: 1, packIndex: 0 }, { turn: 0, packIndex: 1 }];
    for (const [seat, next] of after.entries()) {
      await click(button(m.container, /show me the pack$/));
      expect(saved()).toMatchObject({ phase: 'turn', turn: seat, packIndex: 0 });
      expect(clock()).toBe(`${secs}s`);
      await tick(secs - 1);
      expect(clock()).toBe('1s');
      expect(saved().phase).toBe('turn');
      await tick(1);
      /* Out of time: nobody pressed done, the turn closed on its own and the phone moved on. */
      expect(saved()).toMatchObject({ phase: 'handover', ...next });
      expect(grid(m)).toBeNull();
      expect(m.container.textContent ?? '').toContain(saved().seats[next.turn].name);
    }
  });

  it('clears its shake timer when the page goes away, so it never fires after', async () => {
    const m = await mountSetup();
    await click(button(m.container, /^Pass the device/));
    await click(button(m.container, /^Deal the cards$/));
    await click(button(m.container, /show me the pack$/));
    const set = vi.spyOn(window, 'setTimeout');
    const clear = vi.spyOn(window, 'clearTimeout');
    /* Nothing is turned up yet, so any square is a dud and shakes; square 0
       is a corner, never the free centre. 450 ms is the shake's length in
       SportsBingo.tsx; if it changes this finds no timer and fails, it does
       not pass quietly. */
    await click(squares(m)[0]);
    const at = set.mock.calls.findIndex(c => c[1] === 450);
    expect(at).toBeGreaterThanOrEqual(0);
    const id = set.mock.results[at].value;
    m.unmount();
    expect(clear.mock.calls.some(c => c[0] === id)).toBe(true);
  });
});
