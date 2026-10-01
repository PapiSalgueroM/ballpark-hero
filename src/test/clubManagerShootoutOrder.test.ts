/**
 * Round 782: the shootout order walk, from a player's report on 2026-09-23:
 * "let us have a choice of all 11 players like who will shoot 1 by 1 in
 * penalty shootout so we do not lose".
 *
 * shootoutTakerOrder decides who steps up and in what order; runShootout
 * walks that order, five each then sudden death, cycling round the list.
 * Both are pure, so this file drives them with a scripted Math.random and
 * checks the walk itself: skips for men off the pitch, the unlisted tail in
 * shirt order with the keeper last, duplicates counted once, an early finish
 * once a side cannot be caught, and the twelfth kick going back to the first
 * man. scripts/simCmShootoutOrder.mjs measures the same code through the
 * whole match engine and carries the negative controls.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { runShootout, shootoutTakerOrder, setShootoutOrder, shootoutOrderOf, startCareer } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

/** A Math.random that hands out the given values in order, then the last one for ever. */
function script(values: number[]): void {
  let i = 0;
  Math.random = () => values[Math.min(i++, values.length - 1)];
}

const SCORE = 0.1;  // under any kick's odds: in
const MISS = 0.99;  // over any kick's odds: out

const eleven = ['gk', 'rb', 'cb1', 'cb2', 'lb', 'cm1', 'cm2', 'cm3', 'rw', 'st', 'lw'];
const side = (names: string[], keeperRating = 75) => ({ takers: names.map(n => ({ name: n, rating: 75 })), keeperRating });

describe('shootoutTakerOrder', () => {
  it('walks the listed men who are still on the pitch, then the unlisted in shirt order with the keeper last', () => {
    const order = ['st', 'subbedOff', 'cm1', 'sentOff', 'lw'];
    const onPitch = ['gk', 'rb', 'cb1', 'cb2', 'lb', 'cm1', 'cm2', 'cm3', 'rw', 'st', 'lw'];
    expect(shootoutTakerOrder(order, onPitch, 'gk')).toEqual([
      'st', 'cm1', 'lw',
      'rb', 'cb1', 'cb2', 'lb', 'cm2', 'cm3', 'rw',
      'gk',
    ]);
  });

  it('counts a man listed twice once and keeps the keeper where the manager put him when he is listed', () => {
    expect(shootoutTakerOrder(['st', 'st', 'gk', 'lw'], eleven, 'gk')).toEqual([
      'st', 'gk', 'lw', 'rb', 'cb1', 'cb2', 'lb', 'cm1', 'cm2', 'cm3', 'rw',
    ]);
  });

  it('with nothing listed is shirt order with the keeper last, and a keeper already off the pitch is nowhere', () => {
    expect(shootoutTakerOrder(undefined, eleven, 'gk')).toEqual([...eleven.slice(1), 'gk']);
    const tenMen = eleven.filter(id => id !== 'gk');
    expect(shootoutTakerOrder([], tenMen, 'gk')).toEqual(tenMen);
  });
});

describe('runShootout', () => {
  it('cycles round the list in sudden death: the twelfth kick is the first man again', () => {
    /* Everyone scores for eleven rounds (22 kicks), then my twelfth scores and theirs misses. */
    script([...Array(22).fill(SCORE), SCORE, MISS]);
    const d = runShootout({ mine: side(eleven), theirs: side(eleven.map(n => `t-${n}`)), myFirst: true });
    const mine = d.kicks.filter(k => k.side === 'me');
    expect(mine.map(k => k.taker)).toEqual([...eleven, 'gk']);
    expect(mine[11].taker).toBe(eleven[0]);
    expect(d.kicks).toHaveLength(24);
    expect(d.kicks[23]).toMatchObject({ side: 'opp', result: expect.stringMatching(/saved|missed/), mine: 12, theirs: 11 });
    expect(d.mine).toBe(12);
    expect(d.theirs).toBe(11);
  });

  it('is over the moment a side cannot be caught inside the five', () => {
    /* They go first and miss three, I score three: 3-0 after six kicks, nothing more taken. */
    script([MISS, SCORE, MISS, SCORE, MISS, SCORE]);
    const d = runShootout({ mine: side(eleven), theirs: side(eleven.map(n => `t-${n}`)), myFirst: false });
    expect(d.kicks).toHaveLength(6);
    expect(d.kicks.map(k => k.side)).toEqual(['opp', 'me', 'opp', 'me', 'opp', 'me']);
    expect(d.kicks.map(k => `${k.mine}-${k.theirs}`)).toEqual(['0-0', '1-0', '1-0', '2-0', '2-0', '3-0']);
    expect(d.mine).toBe(3);
    expect(d.theirs).toBe(0);
  });

  it('plays all five each when it stays close, then one sudden death pair', () => {
    /* Me first. Both score four of five, in the same spots, then I score and they miss. */
    const five = [SCORE, SCORE, SCORE, MISS, SCORE];
    const regulation: number[] = [];
    for (let i = 0; i < 5; i++) regulation.push(five[i], five[i]);
    script([...regulation, SCORE, MISS]);
    const d = runShootout({ mine: side(eleven), theirs: side(eleven.map(n => `t-${n}`)), myFirst: true });
    expect(d.kicks).toHaveLength(12);
    expect(d.kicks[9]).toMatchObject({ mine: 4, theirs: 4 });
    expect(d.kicks[10]).toMatchObject({ side: 'me', taker: 'cm1', result: 'scored', mine: 5, theirs: 4 });
    expect(d.mine).toBe(5);
    expect(d.theirs).toBe(4);
  });

  it('reads the same draw for scored, saved and missed', () => {
    /* Odds 0.76 at 75 against 75: under it scores, the next 65 percent of the gap is saved, the rest wide. */
    script([0.75, 0.80, 0.98]);
    const d = runShootout({ mine: side(['a', 'b', 'c']), theirs: side(['x']), myFirst: true });
    expect(d.kicks.slice(0, 3).map(k => k.result)).toEqual(['scored', 'saved', 'missed']);
  });
});

describe('setShootoutOrder', () => {
  const base: CareerState = startCareer('Real Madrid');

  it('is absent until set, holds eleven, drops duplicates, and an empty list takes the field back off the save', () => {
    expect(shootoutOrderOf(base)).toBeNull();
    expect('shootoutOrder' in base).toBe(false);
    const ids = base.squad.filter(p => !p.onLoan).map(p => p.id);
    const set = setShootoutOrder(base, [ids[0], ids[0], ...ids.slice(1, 14)]);
    expect(set).not.toBeNull();
    expect(set!.shootoutOrder).toEqual(ids.slice(0, 11));
    expect(shootoutOrderOf(set!)).toEqual(ids.slice(0, 11));
    const cleared = setShootoutOrder(set!, []);
    expect(cleared).not.toBeNull();
    expect('shootoutOrder' in cleared!).toBe(false);
  });

  it('refuses a man who is not in the squad and leaves the save alone', () => {
    expect(setShootoutOrder(base, ['nobody-here'])).toBeNull();
    expect('shootoutOrder' in base).toBe(false);
  });
});
