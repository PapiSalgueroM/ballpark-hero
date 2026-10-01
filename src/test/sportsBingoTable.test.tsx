/**
 * Round 727: the Sports Bingo pass the device table, walked through the real
 * page in jsdom. scripts/simBingoSeats.mjs proves the engine with no page;
 * this proves the page drives it: the setup screen deals, the hand over shows
 * a name and no card, a turn turns players up one at a time and claims only
 * what they satisfy, the phone moves seat to seat, the result names the
 * engine's winner and books one completion, a game left mid turn comes back
 * at the hand over, and a family pick too thin to fill a card says so on both
 * screens.
 *
 * Shares the daily reload mocks (signed out auth, a stub Supabase client, the
 * counted recorder, the pool loader fed the baked pool), imported first.
 */
import './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, waitFor } from '@testing-library/react';
import { button, click, findButton, mountPage, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture } from './dailyReload/mocks';
import { players } from '@/data/players';
import {
  CARD_SIZE, FREE_INDEX, PACK_SIZE, claimableSquares, declareWinner, loadBingoTable, seatGame, type BingoTable,
} from '@/lib/sportsBingo';
import SportsBingo from '@/pages/SportsBingo';

const lehmer = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

beforeEach(() => {
  resetMocks();
  localStorage.clear();
  setPoolFixture('squad', players);
  vi.spyOn(Math, 'random').mockImplementation(lehmer(727));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

/** The seat in the chair turns up `reveal` players and claims everything they satisfy. */
async function playTurn(m: MountedPage, reveal: number) {
  await click(button(m.container, /show me the pack$/));
  expect(grid(m)).not.toBeNull();
  for (let r = 0; r < reveal; r += 1) await click(button(m.container, /Tap to turn up$/));
  const t = saved();
  const seat = t.seats[t.turn];
  expect(t.revealed).toBe(reveal);
  const shown = t.packs[t.packIndex].slice(0, t.revealed);
  const claim = claimableSquares(seatGame(t, seat.index), shown, seat.marked);
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
  it('deals, hides every card at the hand over, plays seat by seat and declares the engine winner', async () => {
    const m = await mountSetup();
    await click(button(m.container, /^Pass the device/));
    await click(button(m.container, /^Deal the cards$/));

    let turns = 0;
    while (!m.container.querySelector('[role="status"]')) {
      if (++turns > 60) throw new Error('the table never finished');
      const t = saved();
      expect(t.phase).toBe('handover');
      /* The hand over: the next name and a ready button, no card, no player. */
      expect(grid(m)).toBeNull();
      const text = m.container.textContent ?? '';
      expect(text).toContain(t.seats[t.turn].name);
      for (const name of dealNames(t)) expect(text).not.toContain(name);
      /* Player 1 turns every player up and claims all; Player 2 turns up two. */
      await playTurn(m, t.turn === 0 ? PACK_SIZE : 2);
    }

    /* Two seats, so at least one full round of hand overs happened. */
    expect(turns).toBeGreaterThanOrEqual(2);
    const t = saved();
    expect(t.phase).toBe('done');
    const verdict = declareWinner(t);
    const card = m.container.querySelector('[role="status"]')!;
    const headline = card.querySelector('h2')?.textContent ?? '';
    const names = verdict.winners.map(i => t.seats[i].name);
    if (names.length === 1) expect(headline).toContain(`${names[0]} takes it`);
    else for (const n of names) expect(headline).toContain(n);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

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
    /* The turn restarts from nothing turned up, so the clock stays fair. */
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
});
