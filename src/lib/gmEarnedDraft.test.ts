import { describe, expect, it } from 'vitest';
import {
  buildDraftOrder, draftRulesFor, draftSlots, earnedByStaff, earnedContinue, earnedDraftHeading, earnedDraftHelp,
  earnedPick, lotteryChancesLine, lotteryRangeLine, movePicks, newLedger, openDraftNight, ordinal, pickKey,
  LOTTERY_ODDS_BUDGET, lotteryChancesBefore, lotteryOdds,
  type DraftSeason, type EarnedSlot, type GmDraftHost, type GmDraftNight, type GmLotteryRules, type LotteryOdds, type SavedDraftOrder,
} from './gmEarnedDraft';
import { nbaGamePickRules } from './nbaGmDesk';

/* A toy league through the shared half, so the presses are proven before any sport binds them. The lift, the pick
   ledger of gmPicks included, is reached only through gmEarnedDraft's own re-exports (advice 17); the one lottery
   table the game has comes from the NBA desk's pick rules, the ones its bind draws on. */
const PICK_RULES = nbaGamePickRules();
interface Man { id: string; name: string; pos: string; true: number; scout: number }
interface Toy { markers: Record<string, number[]>; signed: { club: string; id: string; overall: number }[] }

const CLUBS = Array.from({ length: 30 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
const season: DraftSeason = {
  sport: 'nba', draftYear: 2027,
  rows: CLUBS.map((id, i) => ({ id, wins: 12 + 2 * i, losses: 70 - 2 * i, made: i >= 14 })),
};
const rules = draftRulesFor('nba', 2027)!;
const order = buildDraftOrder(season, rules, PICK_RULES);

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
  let ledger = newLedger(CLUBS, 2026, PICK_RULES);
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
      const line = lotteryRangeLine(order, f.club, PICK_RULES.lottery)!;
      const hi = Math.min(order.lottery!.field.length, f.seed + order.lottery!.wins.length);
      expect(line).toBe(`Your club's own pick was seeded ${ordinal(f.seed)}: it could land anywhere from 1st to ${ordinal(hi)}, and it landed ${ordinal(firstOf(f.club))}.`);
    }
    expect(lotteryRangeLine(order, order.first[29], PICK_RULES.lottery)).toBeNull();
  });

  it('the chances line is the table, and the sport blocks come after the lottery blocks', () => {
    const total = PICK_RULES.lottery!.odds.reduce((a, b) => a + b, 0);
    const want = PICK_RULES.lottery!.odds.map(o => `${Math.round((o / total) * 1000) / 10}%`).join(', ');
    expect(lotteryChancesLine(order, PICK_RULES.lottery)).toBe(`By the table, the chances at the first pick, worst record first: ${want}.`);
    expect(lotteryChancesLine(order, { ...PICK_RULES.lottery!, table: 'another' })).toBeNull();
    const help = earnedDraftHelp(setUp().night, rules, PICK_RULES.lottery, [{ heading: 'Ours', lines: ['One line.'] }, { heading: 'Empty', lines: [] }]);
    expect(help[help.length - 1]).toEqual({ heading: 'Ours', lines: ['One line.'] });
    expect(help.some(b => b.heading === 'Empty')).toBe(false);
    expect(help.findIndex(b => b.heading === 'The chances')).toBeLessThan(help.length - 1);
  });
});

/* ---------------------------------------------------------------------- */
/* Round 1540: every club's chances, and the lines before the draw          */
/* ---------------------------------------------------------------------- */

const EPS = 1e-9;
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const fmt = (p: number): string => `${(Math.round(p * 1000) / 10).toFixed(1)}%`;

/** Every ordered run of `draws` distinct winners with its chance, written here on its own so the checks do not lean
    on lotteryOdds' walk. The redraw rule weights a winner by its share of the clubs not yet drawn; `full` weights it
    by its share of the whole field instead (the "with replacement" control). */
function runsOf(pct: number[], draws: number, full = false): { seq: number[]; p: number }[] {
  const total = sum(pct);
  const out: { seq: number[]; p: number }[] = [];
  const go = (seq: number[], p: number): void => {
    if (seq.length === draws) { out.push({ seq, p }); return; }
    const rest = full ? total : sum(pct.filter((_, i) => !seq.includes(i)));
    pct.forEach((x, i) => { if (x > 0 && !seq.includes(i)) go([...seq, i], p * (x / rest)); });
  };
  go([], 1);
  return out;
}

/** What must hold of any table's odds; each broken identity is one line. `maxClimb` null is the uncapped shape. */
function identityFailures(odds: LotteryOdds, pct: number[], maxClimb: number | null): string[] {
  const out: string[] = [];
  const n = odds.clubs.length;
  const total = sum(pct);
  const runs = runsOf(pct, odds.draws);
  odds.clubs.forEach((c, i) => {
    if (Math.abs(sum(c.slot) - 1) > EPS) out.push(`${c.club}'s places sum to ${sum(c.slot)}`);
    const best = maxClimb === null ? 1 : Math.max(1, c.seed - maxClimb);
    const worst = Math.min(n, c.seed + odds.draws);
    c.slot.forEach((p, k) => { if (p > EPS && (k + 1 < best || k + 1 > worst)) out.push(`${c.club} can land ${k + 1}`); });
    if (maxClimb === null) {
      if (Math.abs(c.slot[0] - pct[i] / total) > EPS) out.push(`${c.club}'s first pick chance is not its share`);
      const drawn = sum(runs.filter(r => r.seq.includes(i)).map(r => r.p));
      if (Math.abs(sum(c.slot.slice(0, odds.draws)) - drawn) > EPS) out.push(`${c.club}'s top chance is not its chance of being drawn`);
    } else if (c.seed > 1 + maxClimb && c.slot[0] > EPS) out.push(`${c.club} climbs past its limit to the first pick`);
  });
  for (let k = 0; k < n; k += 1) {
    const col = sum(odds.clubs.map(c => c.slot[k]));
    if (Math.abs(col - 1) > EPS) out.push(`place ${k + 1} sums to ${col}`);
  }
  return out;
}

function toyOrder(pct: number[], table: string): SavedDraftOrder {
  const clubs = pct.map((_, i) => `T${String(i + 1).padStart(2, '0')}`);
  return {
    v: 1, sport: 'toy', draftYear: 2030, rulesId: 'toy', first: clubs, later: clubs,
    lottery: { table, field: clubs.map((club, i) => ({ club, seed: i + 1, pct: pct[i] })), wins: [] }, plain: null, level: [],
  };
}
const NBA_LOTTERY = PICK_RULES.lottery!;
const NBA_PCT = order.lottery!.field.map(f => f.pct);

describe('lotteryOdds: every club at every place, by the draw itself', () => {
  it('the uncapped table: places and clubs sum to one, the first pick is the share, a top pick is being drawn', () => {
    const odds = lotteryOdds(order, NBA_LOTTERY)!;
    expect(odds).not.toBeNull();
    expect(odds.draws).toBe(4);
    expect(odds.clubs.map(c => c.club)).toEqual(order.lottery!.field.map(f => f.club));
    expect(identityFailures(odds, NBA_PCT, null)).toEqual([]);
  });

  it('a sixteen club table, two draws and a climb capped at ten places: the identities of that shape', () => {
    const pct = [20, 15, 12, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1.5, 1, 0.5];
    const climb: GmLotteryRules = { clubs: 16, odds: pct, draws: 2, maxClimb: 10, table: 'a toy climb table' };
    const odds = lotteryOdds(toyOrder(pct, climb.table), climb)!;
    expect(odds).not.toBeNull();
    expect(identityFailures(odds, pct, 10)).toEqual([]);
    for (const c of odds.clubs.filter(x => x.seed > 11)) expect(c.slot[0]).toBe(0);
    expect(odds.clubs.find(c => c.seed === 12)!.slot[1]).toBeGreaterThan(0);
  });

  it('two clubs level on a shared chance hold the same identities', () => {
    const pct = [...NBA_LOTTERY.odds];
    pct[3] = pct[4] = (NBA_LOTTERY.odds[3] + NBA_LOTTERY.odds[4]) / 2;
    const level: GmLotteryRules = { ...NBA_LOTTERY, table: 'level' };
    const odds = lotteryOdds(toyOrder(pct, 'level'), level)!;
    expect(odds.clubs[3].slot[0]).toBeCloseTo(odds.clubs[4].slot[0], 12);
    expect(identityFailures(odds, pct, null)).toEqual([]);
  });

  it('control: a with replacement draw put through the same checker breaks an identity', () => {
    const n = NBA_PCT.length;
    const slot = NBA_PCT.map(() => NBA_PCT.map(() => 0));
    for (const r of runsOf(NBA_PCT, 4, true)) {
      [...r.seq, ...Array.from({ length: n }, (_, i) => i).filter(i => !r.seq.includes(i))].forEach((club, place) => { slot[club][place] += r.p; });
    }
    const wrong: LotteryOdds = { draws: 4, clubs: order.lottery!.field.map((f, i) => ({ club: f.club, seed: f.seed, slot: slot[i] })) };
    expect(identityFailures(wrong, NBA_PCT, null).length).toBeGreaterThan(0);
  });

  it('null on another table, and past the budget of runs', () => {
    expect(lotteryOdds(order, { ...NBA_LOTTERY, table: 'another' })).toBeNull();
    expect(lotteryOdds(order, null)).toBeNull();
    const wide = Array.from({ length: 18 }, () => 100 / 18);
    expect(18 * 17 * 16 * 15 * 14 * 13).toBeGreaterThan(LOTTERY_ODDS_BUDGET);
    expect(lotteryOdds(toyOrder(wide, 'wide'), { clubs: 18, odds: wide, draws: 6, maxClimb: null, table: 'wide' })).toBeNull();
    expect(lotteryOdds(toyOrder(wide, 'wide'), { clubs: 18, odds: wide, draws: 2, maxClimb: null, table: 'wide' })).not.toBeNull();
  });
});

describe('lotteryChancesBefore: the lines before the draw cannot give the draw away (correction 1)', () => {
  const keyed = (key: string): SavedDraftOrder => buildDraftOrder(season, rules, PICK_RULES, key);
  const slotsOn = (o: SavedDraftOrder, moves: [number, string, string][] = []): EarnedSlot[] => {
    let ledger = newLedger(CLUBS, 2026, PICK_RULES);
    for (const [round, orig, to] of moves) ledger = movePicks(ledger, [pickKey({ year: 2026, round, orig })], to);
    return draftSlots(o, ledger, 2026, 2);
  };
  const label = (c: string): string => `the ${c}s`;
  const lines = (o: SavedDraftOrder, me: string, moves: [number, string, string][] = []): string[] =>
    lotteryChancesBefore(o, slotsOn(o, moves), me, NBA_LOTTERY, label);
  const landed = (o: SavedDraftOrder, club: string): number => o.first.indexOf(club) + 1;
  const HELD: [number, string, string][] = [[1, 'C05', 'C20'], [1, 'C09', 'C20']];
  /* Two keys for one season: the draws differ, the two firsts C20 holds land in the opposite order, and C03 lands at
     another place. Found by a fixed walk over key names, so the test is the same every run. */
  const A = keyed('k0');
  let B: SavedDraftOrder | null = null;
  for (let i = 1; i < 400 && !B; i += 1) {
    const o = keyed(`k${i}`);
    const flips = (landed(A, 'C05') < landed(A, 'C09')) !== (landed(o, 'C05') < landed(o, 'C09'));
    if (flips && landed(o, 'C03') !== landed(A, 'C03') && JSON.stringify(o.lottery!.wins) !== JSON.stringify(A.lottery!.wins)) B = o;
  }

  /* The independent figures: the share of the table, the chance of being drawn at all, and seed plus draws. */
  const runs = runsOf(NBA_PCT, 4);
  const figures = (seed: number) => ({
    first: fmt(NBA_PCT[seed - 1] / sum(NBA_PCT)),
    top: fmt(sum(runs.filter(r => r.seq.includes(seed - 1)).map(r => r.p))),
    latest: ordinal(Math.min(14, seed + 4)),
  });
  const seeded = (seed: number): string => {
    const f = figures(seed);
    return `Your club goes in seeded ${ordinal(seed)} of 14. By the table it has a ${f.first} chance at the first pick and ${f.top} at a top four pick, and it picks no later than ${f.latest}.`;
  };
  const held = (club: string, seed: number): string => {
    const f = figures(seed);
    return `You also hold the ${club}s' first: seeded ${ordinal(seed)}, ${f.first} at the first pick, ${f.top} at a top four pick, no later than ${f.latest}.`;
  };

  it('the two keys draw differently on the same field, every club on its own record', () => {
    expect(B).not.toBeNull();
    expect(B!.lottery!.wins).not.toEqual(A.lottery!.wins);
    expect(B!.lottery!.field).toEqual(A.lottery!.field);
    expect(new Set(NBA_PCT).size).toBeGreaterThan(1);
    expect(new Set(season.rows.map(r => r.wins)).size).toBe(30);
  });

  it('his club seeded 1st, 3rd and 14th, a playoff club, a traded away first, a bought first and two bought firsts', () => {
    const cases: { me: string; moves?: [number, string, string][]; want: string[] }[] = [
      { me: 'C01', want: [seeded(1)] },
      { me: 'C03', want: [seeded(3)] },
      { me: 'C14', want: [seeded(14)] },
      { me: 'C20', want: ['Your club made the playoffs, so its own first is not in the lottery.'] },
      { me: 'C03', moves: [[1, 'C03', 'C07']], want: [seeded(3), "That pick is the C07s' tonight, wherever it lands."] },
      { me: 'C20', moves: [HELD[0]], want: ['Your club made the playoffs, so its own first is not in the lottery.', held('C05', 5)] },
      { me: 'C20', moves: HELD, want: ['Your club made the playoffs, so its own first is not in the lottery.', held('C05', 5), held('C09', 9)] },
    ];
    for (const c of cases) {
      expect(lines(A, c.me, c.moves)).toEqual(c.want);
      expect(lines(B!, c.me, c.moves)).toEqual(c.want);
    }
  });

  it('control: a variant that adds where his pick landed, or lists held firsts in slot order, tells the keys apart', () => {
    const withLanding = (o: SavedDraftOrder) => [...lines(o, 'C03'), `It landed ${ordinal(landed(o, 'C03'))}.`];
    expect(withLanding(A)).not.toEqual(withLanding(B!));
    const bySlot = (o: SavedDraftOrder): string[] => slotsOn(o, HELD)
      .filter(s => s.round === 1 && s.kind === 'std' && s.holder === 'C20' && s.orig !== 'C20')
      .map(s => s.orig);
    expect(bySlot(A)).not.toEqual(bySlot(B!));
    expect(lines(A, 'C20', HELD)).toEqual(lines(B!, 'C20', HELD));
  });

  it('no line without a drawn lottery on this table', () => {
    expect(lotteryChancesBefore(order, slotsOn(order), 'C03', { ...NBA_LOTTERY, table: 'another' }, label)).toEqual([]);
    expect(lotteryChancesBefore({ ...order, lottery: null }, slotsOn(order), 'C03', NBA_LOTTERY, label)).toEqual([]);
  });
});

