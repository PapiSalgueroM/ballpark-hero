import { describe, expect, it } from 'vitest';
import { PLAIN_ORDER_ROWS, PLAIN_ORDER_WORDS, lotteryExample, lotteryHelp, lotteryNight, ordinal } from './gmLotteryNight';
import { buildDraftOrder, type DraftSeason, type SavedDraftOrder } from './gmDraftOrder';
import { NBA_PICK_RULES, NHL_PICK_RULES } from './gmPicks';
import { LOTTERY_REVEAL_CEILING_MS, LOTTERY_REVEAL_USE } from './lotteryReveal';
import { NBA_DRAFT_ORDER_2019 as NBA } from '@/data/gmDraftOrder/rules';

const CLUBS = Array.from({ length: 30 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
const season = (draftYear: number): DraftSeason => ({
  sport: 'nba', draftYear,
  rows: CLUBS.map((id, i) => ({ id, wins: 12 + 2 * i, losses: 70 - 2 * i, made: i >= 14 })),
});
/* Many nights, so every kind of move turns up. */
const nights = Array.from({ length: 60 }, (_, i) => buildDraftOrder(season(2027 + i), NBA, NBA_PICK_RULES));
const label = (club: string) => `The ${club}`;

describe('ordinal', () => {
  it('reads the way a person says it', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 101, 111].map(ordinal))
      .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '30th', '101st', '111th']);
  });
});

describe('lottery night', () => {
  it('turns over every lottery club once, the last slot first and the first pick last', () => {
    for (const saved of nights) {
      const view = lotteryNight(saved, 'C05', label);
      expect(view.reveal).toBe(true);
      expect(view.rows.map(r => r.slot)).toEqual(Array.from({ length: 14 }, (_, i) => 14 - i));
      expect(view.rows.map(r => r.label).sort()).toEqual(CLUBS.slice(0, 14).map(label).sort());
      for (const r of view.rows) {
        const club = saved.first[r.slot - 1];
        expect(r.label).toBe(label(club));
        expect(r.seed).toBe(saved.lottery!.field.find(f => f.club === club)!.seed);
        expect(r.moved).toBe(r.seed - r.slot);
      }
      expect(view.rows.filter(r => r.mine).map(r => r.label)).toEqual([label('C05')]);
      expect(view.totalMs).toBeLessThanOrEqual(LOTTERY_REVEAL_CEILING_MS * LOTTERY_REVEAL_USE);
      expect(view.totalMs).toBeGreaterThan(0);
    }
  });

  it('says where his club landed in words about a club and a slot, each kind of move', () => {
    const said = new Set<string>();
    for (const saved of nights) {
      for (const club of CLUBS.slice(0, 14)) {
        const view = lotteryNight(saved, club, label);
        const seed = saved.lottery!.field.find(f => f.club === club)!.seed;
        const slot = saved.first.indexOf(club) + 1;
        expect(view.mineSlot).toBe(slot);
        expect(view.inLottery).toBe(true);
        const moved = seed - slot;
        if (moved > 0) {
          expect(view.headline).toBe(`Your club lands ${ordinal(slot)}, up ${moved} ${moved === 1 ? 'place' : 'places'}.`);
          said.add('up');
        } else if (moved < 0) {
          expect(view.headline).toBe(`Your club lands ${ordinal(slot)}, down ${-moved} ${moved === -1 ? 'place' : 'places'}.`);
          said.add('down');
        } else {
          expect(view.headline).toBe(`Your club stays ${ordinal(slot)}.`);
          said.add('stays');
        }
      }
    }
    expect([...said].sort()).toEqual(['down', 'stays', 'up']);
  });

  it('flags nobody for a playoff club and says its slot', () => {
    const view = lotteryNight(nights[0], 'C22', label);
    expect(view.rows.some(r => r.mine)).toBe(false);
    expect(view.inLottery).toBe(false);
    expect(view.headline).toBe('Your club is not in the lottery. Its round one slot is 22nd.');
    const stranger = lotteryNight(nights[0], 'ZZZ', label);
    expect(stranger.mineSlot).toBeNull();
    expect(stranger.headline).toBe('');
  });

  it('draws the order with no reveal when no drawing was held, and says why', () => {
    const plain = buildDraftOrder(season(2027), { ...NBA, lottery: null }, NBA_PICK_RULES);
    const top = lotteryNight(plain, 'C03', label);
    expect(top.reveal).toBe(false);
    expect(top.totalMs).toBe(0);
    expect(top.rows.map(r => r.slot)).toEqual(Array.from({ length: PLAIN_ORDER_ROWS }, (_, i) => PLAIN_ORDER_ROWS - i));
    expect(top.rows.every(r => r.moved === 0 && r.seed === r.slot)).toBe(true);
    expect(top.rows.filter(r => r.mine).map(r => r.slot)).toEqual([3]);
    expect(top.headline).toBe(`${PLAIN_ORDER_WORDS['no-lottery']} Your club's slot is 3rd.`);
    /* A club outside the rows shown gets a row of its own, with its true slot. */
    const low = lotteryNight(plain, 'C22', label);
    expect(low.rows.length).toBe(PLAIN_ORDER_ROWS + 1);
    expect(low.rows[0]).toMatchObject({ slot: 22, label: label('C22'), mine: true });
    const thin = buildDraftOrder(season(2027), { ...NBA, facts: [] }, NBA_PICK_RULES);
    expect(lotteryNight(thin, 'C03', label).headline).toContain('could not be confirmed twice');
  });
});

describe('the rules behind the "?"', () => {
  const saved = nights[0];

  it('builds the league block from the table, keeps the game block apart, and computes the example', () => {
    const blocks = lotteryHelp(saved, NBA, NBA_PICK_RULES.lottery);
    expect(blocks.map(b => b.heading)).toEqual(["The league's rule", "This game's own", 'A worked example']);
    expect(blocks[0].lines[0]).toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    expect(blocks[0].lines.slice(1, -1)).toEqual(NBA.leagueSays);
    expect(blocks[0].lines[blocks[0].lines.length - 1]).toBe('The league used this rule from its 2019 draft to its 2026 draft.');
    expect(blocks[1].lines).toEqual([...NBA.gameSays, ...NBA.partial]);
    expect(blocks[1].lines.join(' ')).toContain('2027');
    expect(blocks[2].lines).toEqual([
      "The worst record's chance at the first pick is 14%. The best record in the lottery gets 0.5%.",
      '4 picks are drawn, so the worst record can be passed 4 times at most and picks no lower than 5th.',
    ]);
  });

  it('computes the example from whatever table it is handed', () => {
    expect(lotteryExample(NHL_PICK_RULES.lottery!)).toEqual([
      "The worst record's chance at the first pick is 18.5%. The best record in the lottery gets 0.5%.",
      'No club climbs more than 10 places, so only the 11 worst records can win the first pick.',
    ]);
    expect(lotteryExample({ clubs: 2, odds: [3, 1], draws: 1, maxClimb: null, table: 't' })[1])
      .toBe('One pick is drawn, so the worst record can be passed once at most and picks no lower than 2nd.');
    expect(lotteryExample({ clubs: 0, odds: [], draws: 1, maxClimb: null, table: 't' })).toEqual([]);
  });

  it("degrades to the saved table's own words for a rule this build no longer carries", () => {
    const old: SavedDraftOrder = { ...saved, rulesId: 'nba-1990' };
    for (const rules of [NBA, null]) {
      const blocks = lotteryHelp(old, rules, NBA_PICK_RULES.lottery);
      expect(blocks.map(b => b.heading)).toEqual(['How this night was drawn']);
      expect(blocks[0].lines[0]).toBe('It was drawn under an earlier rule of this game (nba-1990), on the table of the 2026 draft.');
      expect(blocks[0].lines[1]).toContain('14 clubs are in the lottery and the top 4 picks are drawn.');
      expect(blocks[0].lines.join(' ')).not.toContain(NBA.leagueSays[0]);
    }
  });

  it('says why there was no drawing, and never shows an example for a table that was not used', () => {
    const plain = buildDraftOrder(season(2027), NBA, { ...NBA_PICK_RULES, lottery: null });
    const blocks = lotteryHelp(plain, NBA, null);
    expect(blocks.map(b => b.heading)).toEqual(['Why there was no drawing', "The league's rule", "This game's own"]);
    expect(blocks[0].lines).toEqual([PLAIN_ORDER_WORDS.table]);
    const other = lotteryHelp(saved, NBA, { ...NBA_PICK_RULES.lottery!, table: 'the 2030 draft' });
    expect(other.map(b => b.heading)).toEqual(["The league's rule", "This game's own"]);
    expect(other[0].lines[0]).toBe(NBA.leagueSays[0]);
  });
});
