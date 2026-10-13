import { describe, expect, it } from 'vitest';
import {
  buildDraftOrder, draftRulesFor, draftSlots, earnedByStaff, earnedContinue, earnedDraftHeading, earnedDraftHelp,
  earnedPick, lotteryChancesLine, lotteryRangeLine, openDraftNight, ordinal,
  type DraftSeason, type GmDraftHost, type GmDraftNight,
} from './gmEarnedDraft';
import { NBA_PICK_RULES, movePicks, newLedger, pickKey } from './gmPicks';

/* A toy league through the shared half, so the presses are proven before any sport binds them. The lift is reached
   only through gmEarnedDraft's own re-exports. */
interface Man { id: string; name: string; pos: string; true: number; scout: number }
interface Toy { markers: Record<string, number[]>; signed: { club: string; id: string; overall: number }[] }

const CLUBS = Array.from({ length: 30 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
const season: DraftSeason = {
  sport: 'nba', draftYear: 2027,
  rows: CLUBS.map((id, i) => ({ id, wins: 12 + 2 * i, losses: 70 - 2 * i, made: i >= 14 })),
};
const rules = draftRulesFor('nba', 2027)!;
const order = buildDraftOrder(season, rules, NBA_PICK_RULES);

const host: GmDraftHost<Toy, Man> = {
  consume(league, club, slot) {
    const at = league.markers[club].indexOf(slot.round);
    if (at < 0) return false;
    league.markers[club].splice(at, 1);
    return true;
  },
  sign(league, club, man, slot) { league.signed.push({ club, id: man.id, overall: slot.overall }); },
  need: () => ({}),
  needWeight: 0,
  read: man => man.true,
  shown: man => man.scout,
  pos: man => man.pos,
  id: man => man.id,
  name: man => man.name,
};
const toyClass = (n: number): Man[] => Array.from({ length: n }, (_, i) => ({
  id: `p${String(i + 1).padStart(3, '0')}`, name: `Prospect ${i + 1}`, pos: 'G', true: 90 - i * 0.5, scout: 70 + (i % 9),
}));

/** A night over a ledger with `moves` ([round, first owner, new holder]) and a league whose markers are the slots'. */
function setUp(moves: [number, string, string][] = []): { night: GmDraftNight; league: Toy } {
  let ledger = newLedger(CLUBS, 2026, NBA_PICK_RULES);
  for (const [round, orig, to] of moves) ledger = movePicks(ledger, [pickKey({ year: 2026, round, orig })], to);
  const night = openDraftNight(order, draftSlots(order, ledger, 2026, 2), 2026);
  const markers: Record<string, number[]> = Object.fromEntries(CLUBS.map(c => [c, []]));
  for (const s of night.slots) markers[s.holder].push(s.round);
  return { night, league: { markers, signed: [] } };
}
const firstOf = (club: string) => order.first.indexOf(club) + 1;

describe('the three presses answer done exactly when no slot is left', () => {
  it('a GM with no pick runs every slot on Continue and is done', () => {
    const me = CLUBS[0];
    const { night, league } = setUp([[1, me, CLUBS[1]], [2, me, CLUBS[1]]]);
    const run = earnedContinue(host, league, night, me, toyClass(64));
    expect(run.done).toBe(true);
    expect(run.onClock).toBeNull();
    expect(run.night.made).toBe(night.slots.length);
    expect(run.night.seen).toBe(true);
    expect(run.steps).toHaveLength(60);
    expect(run.steps.every(s => !s.mine)).toBe(true);
  });

  it('Continue stops at his slot with exactly the slots before it used', () => {
    const me = CLUBS[5];
    const { night, league } = setUp();
    const run = earnedContinue(host, league, night, me, toyClass(64));
    expect(run.done).toBe(false);
    expect(run.onClock?.holder).toBe(me);
    expect(run.night.made).toBe(run.onClock!.overall - 1);
    expect(run.steps.map(s => s.overall)).toEqual(Array.from({ length: run.onClock!.overall - 1 }, (_, i) => i + 1));
  });

  it('a GM whose last slot is the last pick is done by that pick', () => {
    const last = order.later[order.later.length - 1];
    const me = CLUBS[3];
    const { night, league } = setUp([[1, me, CLUBS[4]], [2, last, me], [2, me, last]]);
    expect(night.slots[night.slots.length - 1].holder).toBe(me);
    const at = earnedContinue(host, league, night, me, toyClass(64));
    expect(at.onClock?.overall).toBe(60);
    const pick = earnedPick(host, league, at.night, me, at.left, at.left[0].id)!;
    expect(pick.done).toBe(true);
    expect(pick.onClock).toBeNull();
    expect(pick.steps).toHaveLength(1);
    expect(pick.steps[0]).toMatchObject({ overall: 60, mine: true, grade: at.left[0].scout });
  });

  it('the staff press makes his picks and runs the draft to its end', () => {
    const me = CLUBS[8];
    const { night, league } = setUp();
    const run = earnedByStaff(host, league, night, me, toyClass(64));
    expect(run.done).toBe(true);
    expect(run.onClock).toBeNull();
    expect(run.steps.filter(s => s.mine).map(s => s.overall)).toEqual(night.slots.filter(s => s.holder === me).map(s => s.overall));
    expect(league.signed).toHaveLength(60);
  });

  it('a pick that is not his to make changes nothing', () => {
    /* A playoff club, so no lottery can hand it the first pick. */
    const me = CLUBS[20];
    const { night, league } = setUp();
    expect(earnedPick(host, league, night, me, toyClass(64), 'p001')).toBeNull();
    const at = earnedContinue(host, league, night, me, toyClass(64));
    expect(earnedPick(host, league, at.night, me, at.left, 'nobody')).toBeNull();
    expect(league.markers[me]).toHaveLength(2);
  });
});

describe('the heading, from the slots', () => {
  it('says where he picks, what he gave and what he holds, by the labels handed in', () => {
    const me = CLUBS[2];
    const other = CLUBS[6];
    const { night } = setUp([[1, me, other], [1, other, me]]);
    const label = (c: string) => (c === other ? 'the Jazz' : `the ${c}s`);
    const lines = earnedDraftHeading(night, me, label);
    const mine = night.slots.filter(s => s.holder === me).map(s => ordinal(s.overall));
    expect(lines[0]).toBe(`You pick ${mine[0]} and ${mine[1]}.`);
    expect(lines).toContain(`Your club's own first, ${ordinal(firstOf(me))}, is the Jazz's tonight.`);
    expect(lines).toContain(`You hold the Jazz's first, ${ordinal(firstOf(other))}.`);
  });

  it('a GM with no pick is told so, and a GM holding the first pick is on the clock at 1 with an empty run', () => {
    expect(earnedDraftHeading(setUp([[1, CLUBS[0], CLUBS[1]], [2, CLUBS[0], CLUBS[1]]]).night, CLUBS[0], c => c)[0]).toBe('You hold no pick tonight.');
    const top = order.first[0];
    const { night, league } = setUp();
    const run = earnedContinue(host, league, night, top, toyClass(64));
    expect(run.steps).toHaveLength(0);
    expect(run.onClock?.overall).toBe(1);
    const topSlots = run.night.slots.filter(s => s.holder === top).map(s => ordinal(s.overall));
    expect(earnedDraftHeading(run.night, top, c => c)).toEqual([`You pick ${topSlots.join(' and ')}.`, 'You are on the clock at 1.']);
  });

  it('the clock line is his alone: the whole heading before Continue, on his clock and after the last pick', () => {
    /* A playoff club, so no lottery can hand it the first pick (review 2026-10-12, mutation m4: without the
       holder test every GM was told he was on the clock at 1 before Continue, and toContain let it through). */
    const me = CLUBS[20];
    const { night, league } = setUp();
    const mine = night.slots.filter(s => s.holder === me).map(s => s.overall);
    expect(mine).toHaveLength(2);
    expect(mine[0]).toBeGreaterThan(1);
    const where = `You pick ${ordinal(mine[0])} and ${ordinal(mine[1])}.`;
    expect(earnedDraftHeading(night, me, c => c)).toEqual([where]);
    const run = earnedContinue(host, league, night, me, toyClass(64));
    expect(earnedDraftHeading(run.night, me, c => c)).toEqual([where, `You are on the clock at ${mine[0]}.`]);
    const end = earnedByStaff(host, league, run.night, me, run.left);
    expect(earnedDraftHeading(end.night, me, c => c)).toEqual([where, 'Every pick of the draft is in.']);
  });
});

describe('the worked example and the chances are computed from the night and the table', () => {
  it('his own pick: where it was seeded, how far it could move, where it landed', () => {
    for (const f of order.lottery!.field) {
      const line = lotteryRangeLine(order, f.club, NBA_PICK_RULES.lottery)!;
      const hi = Math.min(order.lottery!.field.length, f.seed + order.lottery!.wins.length);
      expect(line).toBe(`Your club's own pick was seeded ${ordinal(f.seed)}: it could land anywhere from 1st to ${ordinal(hi)}, and it landed ${ordinal(firstOf(f.club))}.`);
    }
    expect(lotteryRangeLine(order, order.first[29], NBA_PICK_RULES.lottery)).toBeNull();
  });

  it('the chances line is the table, and the sport blocks come after the lottery blocks', () => {
    const total = NBA_PICK_RULES.lottery!.odds.reduce((a, b) => a + b, 0);
    const want = NBA_PICK_RULES.lottery!.odds.map(o => `${Math.round((o / total) * 1000) / 10}%`).join(', ');
    expect(lotteryChancesLine(order, NBA_PICK_RULES.lottery)).toBe(`By the table, the chances at the first pick, worst record first: ${want}.`);
    expect(lotteryChancesLine(order, { ...NBA_PICK_RULES.lottery!, table: 'another' })).toBeNull();
    const help = earnedDraftHelp(setUp().night, rules, NBA_PICK_RULES.lottery, [{ heading: 'Ours', lines: ['One line.'] }, { heading: 'Empty', lines: [] }]);
    expect(help[help.length - 1]).toEqual({ heading: 'Ours', lines: ['One line.'] });
    expect(help.some(b => b.heading === 'Empty')).toBe(false);
    expect(help.findIndex(b => b.heading === 'The chances')).toBeLessThan(help.length - 1);
  });
});
