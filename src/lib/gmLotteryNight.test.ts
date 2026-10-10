import { describe, expect, it } from 'vitest';
import { PLAIN_ORDER_LINE, PLAIN_ORDER_ROWS, PLAIN_ORDER_WORDS, lotteryExample, lotteryHelp, lotteryNight, lotteryNightRule, ordinal } from './gmLotteryNight';
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
          expect(view.headline).toBe(`Your club's own pick lands ${ordinal(slot)}, up ${moved} ${moved === 1 ? 'place' : 'places'}.`);
          said.add('up');
        } else if (moved < 0) {
          expect(view.headline).toBe(`Your club's own pick lands ${ordinal(slot)}, down ${-moved} ${moved === -1 ? 'place' : 'places'}.`);
          said.add('down');
        } else {
          expect(view.headline).toBe(`Your club's own pick stays ${ordinal(slot)}.`);
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
    expect(view.headline).toBe('Your club is not in the lottery. Its own round one pick is 22nd.');
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
    /* The reason is the line under the heading, said once; the closing line is his club's own pick and nothing else. */
    expect(top.headline).toBe("Your club's own pick is 3rd in round one.");
    expect(lotteryNightRule(plain, NBA_PICK_RULES.lottery)).toBe(PLAIN_ORDER_WORDS['no-lottery']);
    expect(lotteryNight(plain, 'ZZZ', label).headline).toBe('');
    /* A club outside the rows shown gets a row of its own, with its true slot. */
    const low = lotteryNight(plain, 'C22', label);
    expect(low.rows.length).toBe(PLAIN_ORDER_ROWS + 1);
    expect(low.rows[0]).toMatchObject({ slot: 22, label: label('C22'), mine: true });
    const thin = buildDraftOrder(season(2027), { ...NBA, facts: [] }, NBA_PICK_RULES);
    expect(thin.plain).toBe('thin-rule');
    expect(lotteryNightRule(thin, NBA_PICK_RULES.lottery)).toBe(PLAIN_ORDER_WORDS['thin-rule']);
    expect(PLAIN_ORDER_WORDS['thin-rule']).toContain('could not be confirmed from two sources');
    /* No reason claims an order the code does not make: how round one runs is one line, in one place. */
    for (const why of Object.values(PLAIN_ORDER_WORDS)) expect(why).not.toMatch(/standings|worst record/);
    expect(PLAIN_ORDER_LINE).toBe('The clubs that missed the playoffs pick first, worst record first. The playoff clubs pick after them.');
  });
});

describe('the line under the heading is true of the night it sits on', () => {
  const table = NBA_PICK_RULES.lottery!;
  /* The same league with some of the worst records made level. `level` are places in the standings, 0 the worst. */
  const levelNight = (level: number[]) => {
    const s = season(2031);
    for (const at of level) { s.rows[at].wins = s.rows[level[0]].wins; s.rows[at].losses = s.rows[level[0]].losses; }
    return buildDraftOrder(s, NBA, NBA_PICK_RULES);
  };

  it('prints the table when the night was drawn on the table', () => {
    for (const saved of nights) {
      expect(saved.lottery!.field.map(f => f.pct)).toEqual(table.odds);
      expect(lotteryNightRule(saved, table)).toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    }
  });

  it('prints the night\'s own chances when level clubs shared theirs: the 3rd and 4th worst level are NOT three clubs on 14 each', () => {
    const pair = levelNight([2, 3]);
    /* 140 and 125 combinations pooled are 265: 133 to the winner of the drawing and 132 to the other. */
    expect(pair.lottery!.field.slice(0, 5).map(f => Math.round(f.pct * 10) / 10)).toEqual([14, 14, 13.3, 13.2, 10.5]);
    expect(lotteryNightRule(pair, table)).toBe('14 clubs are in the lottery and the top 4 picks are drawn. On this night 2 clubs shared the best chance at the first pick, 14% each.');
    const four = levelNight([0, 1, 2, 3]);
    /* 140, 140, 140 and 125 pooled are 545: 137, then 136 three times. */
    expect(four.lottery!.field.slice(0, 4).map(f => Math.round(f.pct * 10) / 10)).toEqual([13.7, 13.6, 13.6, 13.6]);
    expect(lotteryNightRule(four, table)).toBe('14 clubs are in the lottery and the top 4 picks are drawn. On this night the best chance at the first pick was 13.7%.');
    /* The worked example stays the table's, says so, and adds what this night was drawn on. */
    const example = lotteryHelp(four, NBA, table).find(b => b.heading === 'A worked example')!.lines;
    expect(example[0]).toBe("By the table, the worst record's chance at the first pick is 14%. The best record in the lottery gets 0.5%.");
    expect(example[example.length - 1]).toBe("On this night clubs level on record shared their chances, so the worst record's chance was 13.7% and the best record in the lottery had 0.5%.");
    /* A night drawn on the table has no such line. */
    expect(lotteryHelp(nights[0], NBA, table).find(b => b.heading === 'A worked example')!.lines.join(' ')).not.toContain('On this night');
  });

  it('keeps the table\'s line when level clubs lower in the field shared their chances: everything it says is still true', () => {
    /* The 7th and 8th worst level, as on the league's own 2026 night: 6.8 and 6.7, the top of the table untouched. */
    const lower = levelNight([6, 7]);
    expect(lower.lottery!.field.slice(0, 3).map(f => f.pct)).toEqual([14, 14, 14]);
    expect(lower.lottery!.field.slice(6, 8).map(f => Math.round(f.pct * 10) / 10)).toEqual([6.8, 6.7]);
    expect(lotteryNightRule(lower, table)).toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    /* The 2nd and 3rd worst level: they pool 280 combinations and get 140 each, which is 14% again, so the
       table's line is still true (the split's arithmetic leaves 14.000000000000002, the same chance). */
    expect(lotteryNightRule(levelNight([1, 2]), table)).toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    /* And the worked example's two numbers are this night's too, so it adds nothing. */
    expect(lotteryHelp(lower, NBA, table).find(b => b.heading === 'A worked example')!.lines.join(' ')).not.toContain('On this night');
    /* The pair at the 3rd and 4th: the top changed, the example's two numbers did not. */
    expect(lotteryHelp(levelNight([2, 3]), NBA, table).find(b => b.heading === 'A worked example')!.lines.join(' ')).not.toContain('On this night');
  });

  it('prints the saved chances for a night whose table this build does not carry', () => {
    for (const lottery of [null, { ...table, table: 'the 2040 draft' }]) {
      expect(lotteryNightRule(nights[0], lottery)).toBe('14 clubs are in the lottery and the top 4 picks are drawn. On this night 3 clubs shared the best chance at the first pick, 14% each.');
    }
  });
});

describe('the rules behind the "?"', () => {
  const saved = nights[0];

  it('builds the league block from the table, keeps the game block apart, and computes the example', () => {
    const blocks = lotteryHelp(saved, NBA, NBA_PICK_RULES.lottery);
    expect(blocks.map(b => b.heading)).toEqual(["The league's rule", "This game's own", 'A worked example']);
    /* The line under the heading is the card's and is not printed a second time in the panel. */
    const rule = lotteryNightRule(saved, NBA_PICK_RULES.lottery);
    expect(rule).toBe('14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each.');
    for (const b of blocks) expect(b.lines).not.toContain(rule);
    expect(blocks[0].lines.slice(0, -1)).toEqual(NBA.leagueSays);
    expect(blocks[0].lines[blocks[0].lines.length - 1]).toBe('The league used this rule from its 2019 draft to its 2026 draft.');
    expect(blocks[1].lines).toEqual([...NBA.gameSays, ...NBA.partial]);
    expect(blocks[1].lines.join(' ')).toContain('2027');
    expect(blocks[2].lines).toEqual([
      "By the table, the worst record's chance at the first pick is 14%. The best record in the lottery gets 0.5%.",
      '4 picks are drawn, so the worst record can be passed 4 times at most and picks no lower than 5th.',
    ]);
  });

  it('computes the example from whatever table it is handed', () => {
    expect(lotteryExample(NHL_PICK_RULES.lottery!)).toEqual([
      "By the table, the worst record's chance at the first pick is 18.5%. The best record in the lottery gets 0.5%.",
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
      /* In a player's words: the saved table is named, the rule's id in this code is not. */
      expect(blocks[0].lines).toEqual(['It was drawn under an earlier rule of this game, on the odds table of the 2026 draft.']);
      expect(blocks[0].lines.join(' ')).not.toContain('nba-1990');
      expect(blocks[0].lines.join(' ')).not.toContain(NBA.leagueSays[0]);
    }
  });

  it('says why there was no drawing, and never shows an example for a table that was not used', () => {
    const plain = buildDraftOrder(season(2027), NBA, { ...NBA_PICK_RULES, lottery: null });
    const blocks = lotteryHelp(plain, NBA, null);
    expect(blocks.map(b => b.heading)).toEqual(['How round one is ordered', "The league's rule", "This game's own"]);
    expect(blocks[0].lines).toEqual([PLAIN_ORDER_LINE]);
    expect(lotteryNightRule(plain, null)).toBe(PLAIN_ORDER_WORDS.table);
    const other = lotteryHelp(saved, NBA, { ...NBA_PICK_RULES.lottery!, table: 'the 2030 draft' });
    expect(other.map(b => b.heading)).toEqual(["The league's rule", "This game's own"]);
    expect(other[0].lines[0]).toBe(NBA.leagueSays[0]);
  });
});
