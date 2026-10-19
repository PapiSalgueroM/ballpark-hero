import { beforeAll, describe, expect, it } from 'vitest';
import type { CareerState, CMPlayer, CustomClubSpec, MarketPlayer } from '@/lib/clubManager';
import { boardVerdictLine, buildMarket, buyPlayer, playableClubs, releaseClauseOf, sellValue, startCareer } from '@/lib/clubManager';
import { DIFFICULTY_LEVELS, readLevel } from '@/lib/managerDifficulty';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import {
  easyFrom, ensureStartOptions, levelFrom, noSackFrom, postsScore, setDifficulty, setStartOption, startOptionsOf, turnOnNoSack,
} from '@/lib/clubManagerStart';
import {
  CM_DIFFICULTY_DIALS, applyNewJobDials, boardCheque, boardOpening, boardSwing, difficultyOf, markedPrice,
  marketForMe, oppEdge, setUpCareer, wageRoomFor,
} from '@/lib/clubManagerDifficulty';

/* Round 1501: Club Manager difficulty, the pure side. Normal is the game as it was: every applier
   hands back its input (the same value, ===) whenever its own dial holds the identity value, and a
   career set up on Normal with No sacking off is the very object startCareer returned. The engine
   side (the levers inside a match and a summer, the fleet, the dailies) is scripts/simCmDifficulty.mjs. */

const withLevel = (s: CareerState, level: 'veryeasy' | 'easy' | 'hard' | 'legend'): CareerState =>
  ({ ...s, startOptions: { ...(s.startOptions as object), difficulty: level } } as CareerState);

describe('readLevel and the stored key', () => {
  it('reads only the five exact ids, everything else is Medium (normal)', () => {
    /* Round 1512: five ids, easiest first; the three of Round 1501 kept as they were. */
    expect(DIFFICULTY_LEVELS).toEqual(['veryeasy', 'easy', 'normal', 'hard', 'legend']);
    for (const id of DIFFICULTY_LEVELS) expect(readLevel(id)).toBe(id);
    for (const odd of [undefined, null, 'Normal', 'HARD', 'Legend', 'Easy', 'VeryEasy', 'very easy', 'veryEasy', 'medium',
      'Medium', 'impossible', 'Impossible', ' easy', 'easy ', 0, -1, 1.5, '3', 2, true, {}, [], ['easy']]) {
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
  it('Medium is the identity row; no dial is easier at a harder level, and the board, money, market and edge dials are strictly ordered', () => {
    expect(CM_DIFFICULTY_DIALS.normal).toEqual({ gain: 1, pain: 1, cut: 0, cheque: 1, wageRoom: 1, mark: 1, edge: 0 });
    expect(Object.keys(CM_DIFFICULTY_DIALS)).toEqual([...DIFFICULTY_LEVELS]);
    for (let i = 1; i < DIFFICULTY_LEVELS.length; i++) {
      const a = CM_DIFFICULTY_DIALS[DIFFICULTY_LEVELS[i - 1]], b = CM_DIFFICULTY_DIALS[DIFFICULTY_LEVELS[i]];
      expect(b.gain).toBeLessThan(a.gain);
      expect(b.pain).toBeGreaterThan(a.pain);
      expect(b.cheque).toBeLessThan(a.cheque);
      expect(b.wageRoom).toBeLessThan(a.wageRoom);
      expect(b.mark).toBeGreaterThan(a.mark);
      expect(b.edge).toBeGreaterThan(a.edge);
      /* The cut lifts nothing: 0 on Medium and both easy rows, then strictly up. */
      expect(b.cut).toBeGreaterThanOrEqual(a.cut);
    }
    expect([CM_DIFFICULTY_DIALS.veryeasy.cut, CM_DIFFICULTY_DIALS.easy.cut]).toEqual([0, 0]);
    expect(CM_DIFFICULTY_DIALS.hard.cut).toBeGreaterThan(0);
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

  it('a created club: the room dial moves only the base ceiling, and the founders\' room comes back whole', () => {
    /* Critic advice 27 and the review of 2026-10-17 (its mutation m4 applied the dial to the whole ceiling and
       nothing went red): the first summer takes the founders' room off in full, so the dial must not shrink it. */
    /* A squad picked above what a small budget could buy (quality 85): only then do the founders carry a sale
       ratio, and only then is there a founders' room to keep (a squad the money could buy has none). */
    const replacedClub = playableClubs('premier').at(-1)!.name;
    const made = startCareer('Level Ground FC', 'now', {
      name: 'Level Ground FC', stadium: 'Level Ground', budgetTier: 'small', leagueId: 'premier', replacedClub, quality: 85,
      crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'LG' },
    } as CustomClubSpec);
    const room = made.founderWageRoom ?? 0;
    expect(room).toBeGreaterThan(0);
    for (const level of ['hard', 'legend'] as const) {
      const d = CM_DIFFICULTY_DIALS[level];
      const out = setUpCareer(made, { level });
      expect(out.founderWageRoom).toBe(made.founderWageRoom);
      expect(out.wageCap).toBe(Math.max(60, Math.round(((made.wageCap as number) - room) * d.wageRoom)) + room);
      /* The case tells the two rules apart: the whole ceiling times the dial is a different number. */
      expect(out.wageCap).not.toBe(Math.max(60, Math.round((made.wageCap as number) * d.wageRoom)));
    }
  });

  it('No sacking alone writes only its own key', () => {
    const on = setUpCareer(s, { noSack: true });
    expect(noSackFrom(on)).toBe(1);
    expect(levelFrom(on)).toBe('normal');
    expect({ ...on, startOptions: s.startOptions }).toEqual(s);
  });
});

describe('the dials on Hard and Legend', () => {
  beforeAll(async () => { await ensureEraRosters('era2005'); });
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

  it('a release clause is never the cheaper door round the mark, and on Normal it is exactly what it was', () => {
    /* The clause as it was before this round (releaseClauseOf before the floor at the card's price). */
    const before = (mp: { name: string; value?: number; price: number }, season: number): number | null => {
      const key = `${mp.name}:${season}`;
      let h = 0;
      for (let i = 0; i < key.length; i++) h = ((h * 31) + key.charCodeAt(i)) >>> 0;
      if (h % 100 >= 35) return null;
      return Math.max(1, Math.round((mp.value ?? mp.price) * (1.5 + ((h >>> 8) % 100) / 100) * 10) / 10);
    };
    let clauses = 0;
    for (const era of ['now', 'era2005']) {
      const c = startCareer('Everton', era);
      for (const mp of buildMarket(c)) {
        const was = before(mp, c.season);
        expect(releaseClauseOf(mp, c.season)).toBe(was);
        if (was === null) continue;
        clauses += 1;
        const marked = marketForMe(withLevel(c, 'legend'), [mp])[0];
        expect(releaseClauseOf(marked, c.season) as number).toBeGreaterThanOrEqual(marked.price);
      }
    }
    expect(clauses).toBeGreaterThan(50);
  });

  it('the opponent: an edge only off Normal', () => {
    expect(oppEdge(hard)).toBe(CM_DIFFICULTY_DIALS.hard.edge);
    expect(oppEdge(legend)).toBe(CM_DIFFICULTY_DIALS.legend.edge);
  });
});

describe('Round 1512: the dials on Easy and Very Easy', () => {
  const s = startCareer('Everton');
  const easy = withLevel(s, 'easy'), veryeasy = withLevel(s, 'veryeasy');
  it('the board gives more for a win and takes less for a defeat, and a bad season opens where it would on Medium', () => {
    expect(boardSwing(easy, 4)).toBeCloseTo(4 * CM_DIFFICULTY_DIALS.easy.gain, 9);
    expect(boardSwing(veryeasy, -4.5)).toBeCloseTo(-4.5 * CM_DIFFICULTY_DIALS.veryeasy.pain, 9);
    expect(boardSwing(easy, 4)).toBeGreaterThan(4);
    expect(boardSwing(veryeasy, -4.5)).toBeGreaterThan(-4.5);
    for (const v of [35, 59, 60, 82]) {
      expect(boardOpening(easy, v)).toBe(v);
      expect(boardOpening(veryeasy, v)).toBe(v);
    }
  });

  it('more money, more wage room, a cheaper market (never under 0.5) and a weaker side against you', () => {
    expect(boardCheque(veryeasy, 40)).toBe(Math.round(40 * CM_DIFFICULTY_DIALS.veryeasy.cheque * 10) / 10);
    expect(boardCheque(easy, 40)).toBeGreaterThan(40);
    expect(wageRoomFor(easy, 1000)).toBeGreaterThan(1000);
    expect(markedPrice(veryeasy, 10)).toBeLessThan(10);
    for (const level of [easy, veryeasy]) {
      for (const p of [0.1, 0.5, 0.55, 0.6]) expect(markedPrice(level, p)).toBeGreaterThanOrEqual(0.5);
      expect(oppEdge(level)).toBeLessThan(0);
    }
    const base = buildMarket(s), mine = marketForMe(veryeasy, base);
    mine.forEach((mp, i) => {
      expect(mp.value).toBe(base[i].value);
      expect({ ...mp, price: base[i].price }).toEqual(base[i]);
    });
  });

  it('the easy market never lists a man under what selling him straight back banks, nor over Medium\'s price', () => {
    /* Round 1512 closing check: at 0.8 of an over 30's list (0.9 of his value) a Very Easy career bought him at
       0.72 of his value and sold him at 0.9. The floor is sellValue's share, and a signed man proves it. */
    const base = buildMarket(s);
    for (const level of [easy, veryeasy]) {
      const mine = marketForMe(level, base);
      let floored = 0, under = 0;
      mine.forEach((mp, i) => {
        expect(mp.price).toBeLessThanOrEqual(base[i].price);
        expect(typeof base[i].value).toBe('number');
        const share = Math.round((base[i].value as number) * 0.9 * 10) / 10;
        expect(mp.price).toBeGreaterThanOrEqual(Math.min(base[i].price, share));
        if (mp.price > markedPrice(level, base[i].price)) floored += 1;
        if (mp.price < base[i].price) under += 1;
        if (base[i].age >= 30) expect(mp.price).toBe(base[i].price);
      });
      expect(floored).toBeGreaterThan(0);
      expect(under).toBeGreaterThan(0);
      const rich = { ...level, budget: 9999, transferWindow: level.transferWindow ?? 'summer' } as CareerState;
      const vet = mine.find(mp => mp.age >= 31 && buyPlayer(rich, mp));
      expect(vet).toBeDefined();
      const after = buyPlayer(rich, vet as MarketPlayer) as CareerState;
      const signed = after.squad.find(p => p.name === (vet as MarketPlayer).name);
      expect(signed).toBeDefined();
      expect(rich.budget - after.budget).toBeGreaterThanOrEqual(sellValue(signed as CMPlayer));
    }
  });
});

describe('Round 1512: changing the level between matches', () => {
  const s = startCareer('Everton');
  ensureStartOptions(s);
  /* Everything apart from the two keys the change may move, as bytes. */
  const rest = (c: CareerState): string => {
    const o = { ...(c.startOptions as unknown as Record<string, unknown>) };
    delete o.difficulty;
    delete o.easySince;
    return JSON.stringify({ ...c, startOptions: o });
  };

  it('moves only the level (and the easy mark), never the calendar, the record, the money or the ceiling', () => {
    const mid = { ...s, week: 7, budget: 41.3, wageCap: 1234 } as CareerState;
    const before = JSON.stringify(mid);
    for (const level of ['veryeasy', 'easy', 'hard', 'legend'] as const) {
      const out = setDifficulty(mid, level);
      expect(out).not.toBeNull();
      expect(levelFrom(out!)).toBe(level);
      expect(rest(out!)).toBe(rest(mid));
      expect(out!.budget).toBe(41.3);
      expect(out!.wageCap).toBe(1234);
    }
    expect(JSON.stringify(mid)).toBe(before);
  });

  it('back to Medium writes no level key; the same level, a junk value or a match at halftime is refused', () => {
    const hard = setDifficulty(s, 'hard')!;
    const back = setDifficulty(hard, 'normal')!;
    expect('difficulty' in (back.startOptions as object)).toBe(false);
    expect(JSON.stringify(back)).toBe(JSON.stringify(s));
    expect(setDifficulty(s, 'normal')).toBeNull();
    expect(setDifficulty(hard, 'hard')).toBeNull();
    expect(setDifficulty(s, 'Easy' as never)).toBeNull();
    expect(setDifficulty(s, 'medium' as never)).toBeNull();
    expect(setDifficulty({ ...s, live: {} as never } as CareerState, 'hard')).toBeNull();
  });

  it('is allowed while sacked or out of work', () => {
    expect(levelFrom(setDifficulty({ ...s, sacked: true } as CareerState, 'easy')!)).toBe('easy');
    expect(levelFrom(setDifficulty({ ...s, wilderness: {} as never } as CareerState, 'legend')!)).toBe('legend');
  });

  it('going easy stops the leaderboards from that season on, one way, and going back up keeps the mark', () => {
    expect(postsScore(s)).toBe(true);
    expect(postsScore(setDifficulty(s, 'hard')!)).toBe(true);
    expect(postsScore(setDifficulty(s, 'legend')!)).toBe(true);
    const at3 = { ...s, season: 3 } as CareerState;
    const easy = setDifficulty(at3, 'easy')!;
    expect(easyFrom(easy)).toBe(3);
    expect(postsScore(easy)).toBe(false);
    const up = setDifficulty({ ...easy, season: 5 } as CareerState, 'legend')!;
    expect(levelFrom(up)).toBe('legend');
    expect(easyFrom(up)).toBe(3);
    expect(postsScore(up)).toBe(false);
    const again = setDifficulty({ ...up, season: 6 } as CareerState, 'veryeasy')!;
    expect(easyFrom(again)).toBe(3);
    const medium = setDifficulty(again, 'normal')!;
    expect(easyFrom(medium)).toBe(3);
    expect(postsScore(medium)).toBe(false);
    /* Started easy on the Dugout step: marked from the first season. */
    const started = setUpCareer(s, { level: 'veryeasy' });
    expect(easyFrom(started)).toBe(s.season > 0 ? s.season : 1);
    expect(postsScore(started)).toBe(false);
    expect(easyFrom(setUpCareer(s, { level: 'hard' }))).toBeNull();
  });

  it('only a positive whole number reads as the mark, and ensureStartOptions carries it over a broken block', () => {
    const block = startOptionsOf(s);
    for (const v of [0, -1, 1.5, '2', null, true, {}]) {
      expect(easyFrom({ ...s, startOptions: { ...block, easySince: v } } as unknown as CareerState)).toBeNull();
    }
    const broken = { ...s, startOptions: { v: 99, difficulty: 'easy', easySince: 2, noSack: 4 } } as unknown as CareerState;
    ensureStartOptions(broken);
    expect(levelFrom(broken)).toBe('easy');
    expect(easyFrom(broken)).toBe(2);
    expect(noSackFrom(broken)).toBe(4);
    const once = JSON.stringify(broken.startOptions);
    ensureStartOptions(broken);
    expect(JSON.stringify(broken.startOptions)).toBe(once);
    const brokenBad = { ...s, startOptions: { v: 99, easySince: 'x' } } as unknown as CareerState;
    ensureStartOptions(brokenBad);
    expect('easySince' in (brokenBad.startOptions as object)).toBe(false);
  });

  it('setStartOption refuses the level and the mark at run time, not only by its type', () => {
    for (const key of ['difficulty', 'easySince', 'noSack']) {
      expect(setStartOption(s, key as never, (key === 'difficulty' ? 'easy' : 2) as never)).toBeNull();
    }
    expect(setStartOption(s, 'nationJobs', false)).not.toBeNull();
  });
});

describe('the season verdict under No sacking', () => {
  it('never threatens a sack the board cannot carry out, and reads as it always did otherwise', () => {
    const s = startCareer('Everton');
    const on = turnOnNoSack(s);
    expect(on).not.toBeNull();
    const threat = 'A poor season. One more like that and you are gone.';
    const clause = 'Catastrophic. Only the compensation clause saved your job this long.';
    expect(boardVerdictLine(s, threat)).toBe(threat);
    expect(boardVerdictLine(s, clause)).toBe(clause);
    expect(boardVerdictLine(on!, threat)).toBe('A poor season. The board is fuming and wants a lot more next year.');
    expect(boardVerdictLine(on!, clause)).toBe('Catastrophic. The board is furious, and it will not forget this one.');
    /* Picked by grade alone, so neither may claim No sacking saved a job the board was never going to take. */
    for (const line of [threat, clause]) expect(boardVerdictLine(on!, line)).not.toMatch(/compensation|gone|No sacking|still have a job|in the job/);
    const plain = 'Solid work. The board is satisfied and the fans are onside.';
    expect(boardVerdictLine(on!, plain)).toBe(plain);
  });
});
