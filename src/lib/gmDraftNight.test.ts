import { describe, expect, it, vi } from 'vitest';
import {
  advanceDraftNight, draftRunReveal, isGmDraftNight, markLotterySeen, openDraftNight, passDraftPick, staffDraftNight,
  userDraftPick, type GmDraftHost, type GmDraftNight, type RunStep,
} from './gmDraftNight';
import { buildDraftOrder, draftSlots, nextSlot, ownSlots, type DraftSeason, type EarnedSlot } from './gmDraftOrder';
import { MAX_REVEALED } from './draftNight';
import { NBA_PICK_RULES, movePicks, newLedger, pickKey } from './gmPicks';
import { NBA_DRAFT_ORDER_2019 } from '@/data/gmDraftOrder/rules';

/* A toy league played through the host, so the loop is proven before any sport binds. */
interface Man { id: string; name: string; pos: string; true: number; scout: number }
interface Toy { rosters: Record<string, Man[]>; markers: Record<string, number[]>; signed: { club: string; id: string; overall: number }[] }

const CLUBS = Array.from({ length: 30 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
const season: DraftSeason = {
  sport: 'nba', draftYear: 2027,
  rows: CLUBS.map((id, i) => ({ id, wins: 12 + 2 * i, losses: 70 - 2 * i, made: i >= 14 })),
};
const order = buildDraftOrder(season, NBA_DRAFT_ORDER_2019, NBA_PICK_RULES);

function toyLeague(holders: EarnedSlot[]): Toy {
  const markers: Record<string, number[]> = Object.fromEntries(CLUBS.map(c => [c, []]));
  for (const s of holders) markers[s.holder].push(s.round);
  return { rosters: Object.fromEntries(CLUBS.map(c => [c, []])), markers, signed: [] };
}
function toyClass(n: number): Man[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${String(i + 1).padStart(3, '0')}`, name: `Prospect ${i + 1}`, pos: ['G', 'F', 'C'][i % 3],
    true: 90 - i * 0.4, scout: 60 + ((i * 7) % 23),
  }));
}
const host: GmDraftHost<Toy, Man> = {
  consume(league, club, slot) {
    const at = league.markers[club].indexOf(slot.round);
    if (at < 0) return false;
    league.markers[club].splice(at, 1);
    return true;
  },
  sign(league, club, man, slot) {
    league.rosters[club].push(man);
    league.signed.push({ club, id: man.id, overall: slot.overall });
  },
  need: (league, club) => ({ C: league.rosters[club].some(m => m.pos === 'C') ? 0 : 1 }),
  needWeight: 0.3,
  read: man => man.true,
  shown: man => man.scout,
  pos: man => man.pos,
  id: man => man.id,
  name: man => man.name,
};

/* A fresh night and a fresh league. `_me` only says in the test whose night it is. */
function openNight(_me: string, moves: [number, string, string][] = []): { night: GmDraftNight; league: Toy } {
  let ledger = newLedger(CLUBS, 2026, NBA_PICK_RULES);
  for (const [round, orig, to] of moves) ledger = movePicks(ledger, [pickKey({ year: 2026, round, orig })], to);
  const night = openDraftNight(order, draftSlots(order, ledger, 2026, 2), 2026);
  return { night, league: toyLeague(night.slots) };
}

/* Play a whole night the way a board would: advance, pick, advance, until done. */
function playNight(me: string, night: GmDraftNight, league: Toy, cls: Man[], pickIndex = 0) {
  let left = cls;
  let state = night;
  const all: RunStep[] = [];
  const clocks: { overall: number; gone: number }[] = [];
  for (let guard = 0; guard < 200; guard += 1) {
    const run = advanceDraftNight(host, league, state, me, left);
    state = run.night; left = run.left; all.push(...run.steps);
    if (run.done) break;
    clocks.push({ overall: run.onClock!.overall, gone: cls.length - left.length });
    const pick = userDraftPick(host, league, state, me, left, host.id(left[Math.min(pickIndex, left.length - 1)]))!;
    state = pick.night; left = pick.left; all.push(pick.step);
  }
  return { night: state, left, all, clocks };
}

describe('a saved night is trusted only whole', () => {
  const { night } = openNight('C12');
  const bad = (edit: (n: GmDraftNight) => void, year = 2026) => {
    const copy = JSON.parse(JSON.stringify(night)) as GmDraftNight;
    edit(copy);
    return isGmDraftNight(copy, CLUBS, year);
  };

  it('accepts what it opened, after JSON, at any cursor', () => {
    expect(night.slots.length).toBe(60);
    expect(bad(() => {})).toBe(true);
    expect(bad(n => { n.made = 60; n.seen = true; })).toBe(true);
    expect(markLotterySeen(night).seen).toBe(true);
    expect(night.seen).toBe(false);
  });

  it('refuses another year and every corruption', () => {
    expect(bad(() => {}, 2027)).toBe(false);
    expect(isGmDraftNight(undefined, CLUBS, 2026)).toBe(false);
    expect(bad(n => { (n as { v: number }).v = 2; })).toBe(false);
    expect(bad(n => { n.made = 61; })).toBe(false);
    expect(bad(n => { n.made = -1; })).toBe(false);
    expect(bad(n => { n.made = 1.5; })).toBe(false);
    expect(bad(n => { (n as { seen: unknown }).seen = 'yes'; })).toBe(false);
    expect(bad(n => { n.slots[5].holder = 'ZZZ'; })).toBe(false);
    expect(bad(n => { n.slots[5].overall = 9; })).toBe(false);
    expect(bad(n => { n.slots[40].round = 1; })).toBe(false);
    expect(bad(n => { n.slots[7].slot = 3; })).toBe(false);
    expect(bad(n => { (n.slots[7] as { kind: string }).kind = 'gift'; })).toBe(false);
    expect(bad(n => { n.order.first[0] = n.order.first[1]; })).toBe(false);
    /* Two picks out of the saved order, each slot still well formed. */
    expect(bad(n => { [n.slots[2].orig, n.slots[3].orig] = [n.slots[3].orig, n.slots[2].orig]; })).toBe(false);
    expect(bad(n => { [n.slots[40].orig, n.slots[50].orig] = [n.slots[50].orig, n.slots[40].orig]; })).toBe(false);
    /* A pick the ledger did not hold is simply absent: still valid. */
    expect(bad(n => { n.slots.splice(59, 1); })).toBe(true);
    expect(bad(n => { (n as { slots: unknown }).slots = null; })).toBe(false);
  });
});

describe('the night, played through a host', () => {
  it('puts him on the clock with exactly the men ahead of him gone, twice, and uses every slot once', () => {
    const me = order.first[11];
    const { night, league } = openNight(me);
    const cls = toyClass(64);
    const played = playNight(me, night, league, cls);
    expect(played.clocks.length).toBe(2);
    for (const c of played.clocks) expect(c.gone).toBe(c.overall - 1);
    expect(played.clocks[0].overall).toBe(12);
    expect(played.night.made).toBe(60);
    expect(played.all.map(s => s.overall)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(played.left.length).toBe(4);
    /* Every pick is a man on the club that used the slot, nobody is on two rosters, every marker is spent. */
    expect(league.signed.map(s => s.club)).toEqual(night.slots.map(s => s.holder));
    expect(new Set(league.signed.map(s => s.id)).size).toBe(60);
    for (const c of CLUBS) expect(league.rosters[c].length).toBe(2);
    expect(Object.values(league.markers).every(m => m.length === 0)).toBe(true);
    expect(played.all.filter(s => s.mine).map(s => s.team)).toEqual([me, me]);
  });

  it("prints his scout's read on every row and never the number a rival chose on", () => {
    const me = order.first[11];
    const { night, league } = openNight(me);
    const cls = toyClass(64);
    const run = advanceDraftNight(host, league, night, me, cls);
    const byName = new Map(cls.map(m => [m.name, m]));
    expect(run.steps.length).toBe(11);
    for (const s of run.steps) {
      expect(s.grade).toBe(byName.get(s.playerName)!.scout);
      expect(s.mine).toBe(false);
    }
    /* Rivals chose on the true number: the first pick is the best man, whatever his scout says. */
    expect(run.steps[0].playerName).toBe('Prospect 1');
    const pick = userDraftPick(host, league, run.night, me, run.left, run.left[3].id)!;
    expect(pick.step).toMatchObject({ overall: 12, team: me, mine: true, grade: run.left[3].scout });
  });

  it('gives the first overall pick an empty run and the last slot a full one', () => {
    const top = order.first[0];
    const a = openNight(top);
    const first = advanceDraftNight(host, a.league, a.night, top, toyClass(64));
    expect(first.steps).toEqual([]);
    expect(first.onClock!.overall).toBe(1);
    expect(first.done).toBe(false);
    expect(draftRunReveal(first.steps, first.onClock)).toEqual({ night: { picks: [], totalMs: 0 }, headline: 'You are on the clock at 1.', hidden: 0 });

    const last = order.first[29];
    const b = openNight(last);
    const run = advanceDraftNight(host, b.league, b.night, last, toyClass(64));
    expect(run.steps.length).toBe(29);
    expect(run.onClock!.overall).toBe(30);
    const played = playNight(last, b.night, toyLeague(b.night.slots), toyClass(64));
    expect(played.clocks.map(c => c.overall)).toEqual([30, 60]);
    expect(played.night.made).toBe(60);
  });

  it('sends a traded pick to the club that holds it, at the place of its first owner', () => {
    const me = order.first[20];
    const worst = order.first[0];
    const { night, league } = openNight(me, [[1, worst, me]]);
    const run = advanceDraftNight(host, league, night, me, toyClass(64));
    expect(run.steps).toEqual([]);
    expect(run.onClock).toMatchObject({ overall: 1, orig: worst, holder: me });
    const played = playNight(me, night, league, toyClass(64));
    expect(played.clocks.length).toBe(3);
    expect(league.rosters[me].length).toBe(3);
    expect(league.rosters[worst].length).toBe(1);
  });

  it('refuses a pick that is not his to make, and a man who is gone', () => {
    const me = order.first[11];
    const { night, league } = openNight(me);
    const cls = toyClass(64);
    expect(userDraftPick(host, league, night, me, cls, cls[0].id)).toBeNull();
    expect(passDraftPick(host, league, night, me)).toBeNull();
    const run = advanceDraftNight(host, league, night, me, cls);
    expect(userDraftPick(host, league, run.night, me, run.left, cls[0].id)).toBeNull();
    expect(userDraftPick(host, league, run.night, me, run.left, 'nobody')).toBeNull();
    expect(league.rosters[me]).toEqual([]);
    /* Passing spends the slot and the marker and signs nobody. */
    const passed = passDraftPick(host, league, run.night, me)!;
    expect(passed.made).toBe(12);
    expect(league.markers[me]).toEqual([2]);
    expect(league.rosters[me]).toEqual([]);
  });

  it('lets a slot pass when the club holds no marker or the class is empty, and still ends', () => {
    const me = order.first[11];
    const a = openNight(me);
    a.league.markers[order.first[0]] = [];
    const run = advanceDraftNight(host, a.league, a.night, me, toyClass(64));
    expect(run.steps.length).toBe(10);
    expect(run.steps[0].overall).toBe(2);
    expect(run.night.made).toBe(11);
    expect(draftRunReveal(run.steps, run.onClock).headline).toBe('Picks 2 to 11 are in. You are on the clock at 12.');

    const b = openNight(me);
    const short = staffDraftNight(host, b.league, b.night, me, toyClass(5));
    expect(short.done).toBe(true);
    expect(short.steps.length).toBe(5);
    expect(short.left).toEqual([]);
    /* Used means spent: the 55 slots that found the class dry cost their clubs the marker, as a pass does. */
    expect(short.night.made).toBe(60);
    expect(Object.values(b.league.markers).every(m => m.length === 0)).toBe(true);
    expect(b.league.signed.length).toBe(5);
  });

  it('lets the staff make every pick he has left, flags them his, and draws nothing', () => {
    const me = order.first[11];
    const { night, league } = openNight(me);
    const spy = vi.spyOn(Math, 'random');
    const run = staffDraftNight(host, league, night, me, toyClass(64));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(run.done).toBe(true);
    expect(run.onClock).toBeNull();
    expect(run.steps.length).toBe(60);
    expect(run.steps.filter(s => s.mine).map(s => s.overall)).toEqual(night.slots.filter(s => s.holder === me).map(s => s.overall));
    expect(night.made).toBe(0);
  });

  it('never reads a pick ledger again: a night that went through JSON mid draft finishes the same', () => {
    const me = order.first[11];
    const a = openNight(me);
    const b = openNight(me);
    const cls = toyClass(64);
    const whole = playNight(me, a.night, a.league, cls);
    const first = advanceDraftNight(host, b.league, b.night, me, cls);
    const pick = userDraftPick(host, b.league, first.night, me, first.left, first.left[0].id)!;
    const reloaded = JSON.parse(JSON.stringify(pick.night)) as GmDraftNight;
    expect(isGmDraftNight(reloaded, CLUBS, 2026)).toBe(true);
    const rest = playNight(me, reloaded, b.league, pick.left);
    expect([...first.steps, pick.step, ...rest.all]).toEqual(whole.all);
    expect(b.league.signed).toEqual(a.league.signed);
  });

  /* A league with no pick ledger and no lottery: four clubs, an order of its own. */
  const SMALL = ['C01', 'C02', 'C03', 'C04'];
  const smallOrder = buildDraftOrder(
    { sport: 'toy', draftYear: 2030, rows: SMALL.map((id, i) => ({ id, wins: 2 + 3 * i, losses: 20 - 3 * i, made: i >= 2 })) },
    { ...NBA_DRAFT_ORDER_2019, id: 'toy-plain', sport: 'toy', lottery: null, laterRounds: 'first-before-lottery', level: { odds: 'keep', later: 'as-first' } },
    NBA_PICK_RULES,
  );

  it('plays a plain list of clubs, the shape a league with no ledger binds through, and the night VALIDATES', () => {
    expect(smallOrder.first).toEqual(SMALL);
    expect(smallOrder.later).toEqual(SMALL);
    const slots = ownSlots(smallOrder.first, 2);
    const toy = toyLeague(slots);
    const plain = openDraftNight(smallOrder, slots, 2026);
    expect(isGmDraftNight(JSON.parse(JSON.stringify(plain)), SMALL, 2026)).toBe(true);
    const run = advanceDraftNight(host, toy, plain, 'C03', toyClass(10));
    expect(run.steps.map(s => `${s.overall}:${s.team}`)).toEqual(['1:C01', '2:C02']);
    expect(nextSlot(plain.slots, run.night.made)!.holder).toBe('C03');
    expect(isGmDraftNight(JSON.parse(JSON.stringify(run.night)), SMALL, 2026)).toBe(true);
    /* A list of clubs that is not the saved order is refused: a night is held to its own order. */
    expect(isGmDraftNight(openDraftNight(smallOrder, ownSlots(['C02', 'C01', 'C03', 'C04'], 2), 2026), SMALL, 2026)).toBe(false);
    /* And so is this night read against other clubs. */
    expect(isGmDraftNight(JSON.parse(JSON.stringify(plain)), CLUBS, 2026)).toBe(false);
  });

  it('holds a night where clubs take different numbers of picks, played by a rule of the host\'s own', () => {
    /* The shape of a draft by vacancy: all four in the first pass, two in the second, one in the third.
       ownSlots cannot build it (it gives every club the same number); the slot type and the validator hold it. */
    const passes = [SMALL, ['C01', 'C03'], ['C03']];
    const slots: EarnedSlot[] = [];
    passes.forEach((clubs, r) => clubs.forEach((club, i) => slots.push({ overall: slots.length + 1, round: r + 1, slot: i + 1, orig: club, holder: club, kind: 'std' })));
    const night = openDraftNight(smallOrder, slots, 2026);
    expect(isGmDraftNight(JSON.parse(JSON.stringify(night)), SMALL, 2026)).toBe(true);
    /* A pass out of the saved order is still refused. */
    const wrong = JSON.parse(JSON.stringify(night)) as GmDraftNight;
    [wrong.slots[4].orig, wrong.slots[5].orig] = [wrong.slots[5].orig, wrong.slots[4].orig];
    [wrong.slots[4].holder, wrong.slots[5].holder] = [wrong.slots[5].holder, wrong.slots[4].holder];
    expect(isGmDraftNight(wrong, SMALL, 2026)).toBe(false);

    /* This host's clubs do not choose by read plus need: each takes the LAST man left. */
    const calls: string[] = [];
    const own: GmDraftHost<Toy, Man> = { ...host, choose: (_league, club, left) => { calls.push(club); return left.length ? left[left.length - 1] : null; } };
    const toy = toyLeague(slots);
    const cls = toyClass(6);
    const spy = vi.spyOn(Math, 'random');
    const run = staffDraftNight(own, toy, night, 'C04', cls);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(calls).toEqual(['C01', 'C02', 'C03', 'C04', 'C01', 'C03', 'C03']);
    /* Six men for seven slots: the last six in reverse, then the seventh slot passes with its marker spent. */
    expect(run.steps.map(s => `${s.team}:${s.playerName}`)).toEqual(['C01:Prospect 6', 'C02:Prospect 5', 'C03:Prospect 4', 'C04:Prospect 3', 'C01:Prospect 2', 'C03:Prospect 1']);
    expect(run.done).toBe(true);
    expect(run.night.made).toBe(7);
    expect(Object.values(toy.markers).every(m => m.length === 0)).toBe(true);
    /* The lift's own rule on the same night takes the best read first: the host's rule really replaced it. */
    expect(staffDraftNight(host, toyLeague(slots), night, 'C04', cls).steps[0].playerName).toBe('Prospect 1');
  });

  it('lets a slot pass, and signs nobody, when a host\'s own rule answers a man who is not in the class', () => {
    const slots = ownSlots(smallOrder.first, 1);
    const stranger: Man = { id: 'x', name: 'Nobody', pos: 'G', true: 99, scout: 99 };
    const toy = toyLeague(slots);
    const run = staffDraftNight({ ...host, choose: () => stranger }, toy, openDraftNight(smallOrder, slots, 2026), 'C04', toyClass(6));
    expect(run.steps).toEqual([]);
    expect(toy.signed).toEqual([]);
    expect(run.left.length).toBe(6);
    expect(run.night.made).toBe(4);
  });
});

describe('the run, as the draft night card draws it', () => {
  const step = (overall: number, mine = false): RunStep => ({ overall, team: mine ? 'ME' : `R${overall}`, playerName: `Man ${overall}`, pos: 'G', grade: 70 + (overall % 9), mine });
  const slot = (overall: number): EarnedSlot => ({ overall, round: overall > 30 ? 2 : 1, slot: overall > 30 ? overall - 30 : overall, orig: 'ME', holder: 'ME', kind: 'std' });
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => step(from + i));

  it('counts every pick made in the headline and shows true pick numbers on at most nine rows', () => {
    const got = draftRunReveal(range(1, 11), slot(12));
    expect(got.headline).toBe('Picks 1 to 11 are in. You are on the clock at 12.');
    expect(got.night.picks.map(p => p.overall)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(got.night.picks.length).toBe(MAX_REVEALED);
    expect(got.hidden).toBe(2);
    expect(got.night.totalMs).toBeLessThanOrEqual(5000 * 0.8);
  });

  it('always shows his own pick as a row, then the latest picks before he is next', () => {
    const got = draftRunReveal([step(12, true), ...range(13, 37)], slot(38));
    expect(got.headline).toBe('Your pick is in at 12. Picks 13 to 37 are in. You are on the clock at 38.');
    expect(got.night.picks.map(p => p.overall)).toEqual([12, 30, 31, 32, 33, 34, 35, 36, 37]);
    expect(got.night.picks.filter(p => p.mine).map(p => p.overall)).toEqual([12]);
    expect(got.hidden).toBe(17);
    /* Every row is a pick that was made, with the grade it was handed. */
    for (const p of got.night.picks) expect(p).toMatchObject({ playerName: `Man ${p.overall}`, grade: 70 + (p.overall % 9) });
  });

  it('says so when the draft is over, and says one pick as one pick', () => {
    expect(draftRunReveal([step(38, true), ...range(39, 60)], null).headline)
      .toBe('Your pick is in at 38. Picks 39 to 60 are in. Every pick of the draft is in.');
    expect(draftRunReveal([step(59), step(60, true)], null).headline).toBe('Pick 59 is in. Your pick is in at 60. Every pick of the draft is in.');
    expect(draftRunReveal([step(2), step(5), step(6)], slot(7)).headline).toBe('3 picks are in, the last at 6. You are on the clock at 7.');
  });

  it('drops a malformed step instead of printing it, and survives no steps at all', () => {
    const got = draftRunReveal([step(1), { ...step(2), playerName: '  ' }, { ...step(3), team: '' }, null as unknown as RunStep], slot(4));
    expect(got.night.picks.map(p => p.overall)).toEqual([1]);
    expect(got.headline).toBe('Pick 1 is in. You are on the clock at 4.');
    expect(draftRunReveal(undefined as unknown as RunStep[], null)).toEqual({ night: { picks: [], totalMs: 0 }, headline: 'Every pick of the draft is in.', hidden: 0 });
  });
});
