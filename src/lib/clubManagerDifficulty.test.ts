import { describe, expect, it } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import { buildMarket, startCareer } from '@/lib/clubManager';
import { DIFFICULTY_LEVELS, readLevel } from '@/lib/managerDifficulty';
import { ensureStartOptions, levelFrom, noSackFrom } from '@/lib/clubManagerStart';
import {
  CM_DIFFICULTY_DIALS, applyNewJobDials, boardCheque, boardOpening, boardSwing, difficultyOf, markedPrice,
  marketForMe, oppEdge, setUpCareer, wageRoomFor,
} from '@/lib/clubManagerDifficulty';

/* Round 1501: Club Manager difficulty, the pure side. Normal is the game as it was: every applier
   hands back its input (the same value, ===) whenever its own dial holds the identity value, and a
   career set up on Normal with No sacking off is the very object startCareer returned. The engine
   side (the levers inside a match and a summer, the fleet, the dailies) is scripts/simCmDifficulty.mjs. */

const withLevel = (s: CareerState, level: 'hard' | 'legend'): CareerState =>
  ({ ...s, startOptions: { ...(s.startOptions as object), difficulty: level } } as CareerState);

describe('readLevel and the stored key', () => {
  it('reads only the two exact words, everything else is Normal', () => {
    expect(readLevel('hard')).toBe('hard');
    expect(readLevel('legend')).toBe('legend');
    for (const odd of [undefined, null, 'Normal', 'normal', 'HARD', 'Legend', 0, -1, 1.5, '3', 2, {}, []]) {
      expect(readLevel(odd)).toBe('normal');
    }
  });

  it('a fresh career is Normal and carries no key at all', () => {
    const s = startCareer('Everton');
    expect(difficultyOf(s)).toBe('normal');
    ensureStartOptions(s);
    expect('difficulty' in (s.startOptions as object)).toBe(false);
  });

  it('ensureStartOptions keeps the level and No sacking off a broken block, and is idempotent', () => {
    const s = startCareer('Everton');
    s.startOptions = { v: 99, difficulty: 'legend', noSack: 3 } as unknown as CareerState['startOptions'];
    ensureStartOptions(s);
    expect(levelFrom(s)).toBe('legend');
    expect(noSackFrom(s)).toBe(3);
    const once = JSON.stringify(s.startOptions);
    ensureStartOptions(s);
    expect(JSON.stringify(s.startOptions)).toBe(once);
    const valid = startCareer('Everton');
    ensureStartOptions(valid);
    const before = JSON.stringify(valid.startOptions);
    ensureStartOptions(valid);
    expect(JSON.stringify(valid.startOptions)).toBe(before);
  });
});

describe('the table', () => {
  it('Normal is the identity row and each level is strictly harder than the one before on every dial', () => {
    expect(CM_DIFFICULTY_DIALS.normal).toEqual({ gain: 1, pain: 1, cut: 0, cheque: 1, wageRoom: 1, mark: 1, edge: 0 });
    for (let i = 1; i < DIFFICULTY_LEVELS.length; i++) {
      const a = CM_DIFFICULTY_DIALS[DIFFICULTY_LEVELS[i - 1]], b = CM_DIFFICULTY_DIALS[DIFFICULTY_LEVELS[i]];
      expect(b.gain).toBeLessThan(a.gain);
      expect(b.pain).toBeGreaterThan(a.pain);
      expect(b.cut).toBeGreaterThan(a.cut);
      expect(b.cheque).toBeLessThan(a.cheque);
      expect(b.wageRoom).toBeLessThan(a.wageRoom);
      expect(b.mark).toBeGreaterThan(a.mark);
      expect(b.edge).toBeGreaterThan(a.edge);
    }
  });
});

describe('every applier is the identity at its own identity dial', () => {
  const s = startCareer('Everton');
  it('on a Normal career', () => {
    for (const v of [4, -4.5, 0, 0.1 + 0.2, -0.30000000000000004, 1e-9]) expect(boardSwing(s, v)).toBe(v);
    for (const v of [35, 59, 59.9, 60, 82]) expect(boardOpening(s, v)).toBe(v);
    for (const v of [0.1 + 0.2, 33.33333, 10, 0]) expect(boardCheque(s, v)).toBe(v);
    for (const v of [60, 1234, 1234.5]) expect(wageRoomFor(s, v)).toBe(v);
    for (const v of [0.1 + 0.2, 12.345]) expect(markedPrice(s, v)).toBe(v);
    const m = buildMarket(s);
    expect(marketForMe(s, m)).toBe(m);
    expect(oppEdge(s)).toBe(0);
    expect(applyNewJobDials(s)).toBe(s);
  });

  it('setUpCareer on Normal with No sacking off returns the very career it was given', () => {
    expect(setUpCareer(s)).toBe(s);
    expect(setUpCareer(s, {})).toBe(s);
    expect(setUpCareer(s, { level: 'normal', noSack: false })).toBe(s);
    expect(setUpCareer(s, { level: 'normal' }, () => { throw new Error('no rebuild on Normal'); })).toBe(s);
  });

  it('a level writes its key, cuts the cheque and the room by the dial, and rebuilds the asks on day one only', () => {
    let calls = 0;
    const rebuild = (x: CareerState) => { calls += 1; return x.boardObjectives; };
    const hard = setUpCareer(s, { level: 'hard' }, rebuild);
    const d = CM_DIFFICULTY_DIALS.hard;
    expect(levelFrom(hard)).toBe('hard');
    expect(noSackFrom(hard)).toBe(null);
    expect(hard.budget).toBe(Math.round(s.budget * d.cheque * 10) / 10);
    expect(hard.wageCap).toBe(Math.max(60, Math.round((s.wageCap as number) * d.wageRoom)));
    expect(hard.boardConfidence).toBe(s.boardConfidence);
    expect(calls).toBe(1);
    const both = setUpCareer(s, { level: 'legend', noSack: true }, rebuild);
    expect(levelFrom(both)).toBe('legend');
    expect(noSackFrom(both)).toBe(1);
    const later = setUpCareer({ ...s, week: 5 }, { level: 'hard' }, rebuild);
    expect(calls).toBe(2);
    expect(later.boardObjectives).toBe(s.boardObjectives);
  });

  it('No sacking alone writes only its own key', () => {
    const on = setUpCareer(s, { noSack: true });
    expect(noSackFrom(on)).toBe(1);
    expect(levelFrom(on)).toBe('normal');
    expect({ ...on, startOptions: s.startOptions }).toEqual(s);
  });
});

describe('the dials on Hard and Legend', () => {
  const s = startCareer('Everton');
  const hard = withLevel(s, 'hard'), legend = withLevel(s, 'legend');
  it('the board: a win gives less, a defeat takes more, and only a bad season opens lower', () => {
    expect(boardSwing(hard, 4)).toBeCloseTo(4 * CM_DIFFICULTY_DIALS.hard.gain, 9);
    expect(boardSwing(legend, -4.5)).toBeCloseTo(-4.5 * CM_DIFFICULTY_DIALS.legend.pain, 9);
    expect(boardSwing(hard, 0)).toBe(0);
    expect(boardOpening(hard, 60)).toBe(60);
    expect(boardOpening(legend, 82)).toBe(82);
    expect(boardOpening(hard, 59)).toBe(59 - CM_DIFFICULTY_DIALS.hard.cut);
    expect(boardOpening(legend, 35)).toBe(35 - CM_DIFFICULTY_DIALS.legend.cut);
  });

  it('the market: the same men in the same order, every price marked, every value untouched', () => {
    const base = buildMarket(s), mine = marketForMe(legend, base);
    expect(mine.length).toBe(base.length);
    mine.forEach((mp, i) => {
      expect(mp.name).toBe(base[i].name);
      expect(mp.value).toBe(base[i].value);
      expect(mp.price).toBe(Math.max(0.5, Math.round(base[i].price * CM_DIFFICULTY_DIALS.legend.mark * 10) / 10));
      expect({ ...mp, price: base[i].price }).toEqual(base[i]);
    });
  });

  it('the opponent: an edge only off Normal', () => {
    expect(oppEdge(hard)).toBe(CM_DIFFICULTY_DIALS.hard.edge);
    expect(oppEdge(legend)).toBe(CM_DIFFICULTY_DIALS.legend.edge);
  });
});
