import { describe, expect, it } from 'vitest';
import {
  NBA_ROSTER_MAX, NBA_ROUNDS, initNbaLeague, nbaDraftSigning, nbaMinContract, type NbaLeague, type NbaProspect, type SeriesResult,
} from './nbaFrontOffice';
import { nbaContractsOf, nbaDeskOffseason, nbaGamePickRules, nbaPicksOf, nbaScoutRead, openNbaDesk, syncNbaPicks } from './nbaGmDesk';
import { withGmBlock, type GmDesk } from './gmDesk';
import { lotteryChancesBefore, movePicks, pickKey } from './gmEarnedDraft';
import { NBA_ROOKIE_SCALE_YEARS } from './gmContractRules';
import { NBA_TEAM_MAP } from '@/data/conquestDataNba';
import {
  NBA_DRAFT_BLOCK, NBA_DRAFT_KNOBS, NBA_DRAFT_NIGHT_SUMMER, NBA_SECOND_ROUND_SEASONS, draftRulesFor, nbaDraftByStaff, nbaDraftContinue, nbaDraftHeading, nbaDraftHelp, nbaDraftHost,
  nbaDraftNightOf, nbaDraftPick, nbaDraftSeason, nbaEarnedDraftClass, openNbaDraftNight, type EarnedSlot, type GmDraftNight,
  lotteryOdds, nbaDraftChances, nbaDraftKnobLines, nbaDraftLabel, nbaDraftTileLabel,
} from './nbaEarnedDraft';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A closed season: every record different, the sixteen best in the first round, a play-in game among the rest. */
function closed(seed = 7): { league: NbaLeague; series: SeriesResult[]; ids: string[]; made: string[] } {
  const league = initNbaLeague(mulberry32(seed));
  const ids = Object.keys(league.teams).sort();
  ids.forEach((id, i) => { league.teams[id].wins = 20 + i; league.teams[id].losses = 60 - i; });
  const made = ids.slice(14);
  const series: SeriesResult[] = [];
  for (let i = 0; i < 8; i += 1) series.push({ name: 'R1', home: made[15 - i], away: made[i], homeWins: 4, awayWins: 2, winner: made[15 - i] });
  series.push({ name: 'Play-In', home: ids[13], away: ids[12], homeWins: 1, awayWins: 0, winner: ids[13] });
  league.round = NBA_ROUNDS;
  league.champions.push({ season: league.season, team: made[15] });
  return { league, series, ids, made };
}
const ME = 'BOS';
function opened(seed = 7): { league: NbaLeague; desk: GmDesk; night: GmDraftNight } {
  const { league, series } = closed(seed);
  const o = openNbaDraftNight(openNbaDesk(league, ME), league, series, ME)!;
  return { league, desk: o.desk, night: o.night };
}
/** Move picks of this year's draft in the desk's ledger and the engine lists, the way a deal does, on a desk the night has not
    opened on yet (a night already open is answered as it stands, so a deal after it would not reach it). */
function moved(league: NbaLeague, desk: GmDesk, moves: [number, string, string][]): GmDesk {
  let ledger = nbaPicksOf(desk, league);
  for (const [round, orig, to] of moves) ledger = movePicks(ledger, [pickKey({ year: league.season, round, orig })], to);
  syncNbaPicks(league, ledger);
  return withGmBlock(desk, 'picks', ledger);
}

describe('the season the order is drawn from', () => {
  it('reads the sixteen off the series numbers and nothing else', () => {
    const { league, series, made } = closed();
    const s = nbaDraftSeason(league, series)!;
    expect(s.draftYear).toBe(league.season + 1);
    expect(s.rows).toHaveLength(30);
    expect(s.rows.filter(r => r.made).map(r => r.id).sort()).toEqual([...made].sort());
  });
  it('is null on fifteen, on seventeen and with no postseason', () => {
    const { league, series, ids, made } = closed();
    const fifteen = series.map((x, i) => (i === 0 ? { ...x, away: made[15 - 1] } : x));
    expect(nbaDraftSeason(league, fifteen)).toBeNull();
    expect(nbaDraftSeason(league, [...series, { name: 'R1', home: made[0], away: ids[0], homeWins: 4, awayWins: 0, winner: made[0] }])).toBeNull();
    expect(nbaDraftSeason(league, [])).toBeNull();
  });
});

describe('opening the night refuses, having written nothing, whatever it cannot trust (correction 7)', () => {
  it('opens on a closed season with a whole ledger, and the block reads back after a JSON round trip', () => {
    const { league, desk, night } = opened();
    expect(night.slots).toHaveLength(60);
    expect(night).toMatchObject({ year: league.season, made: 0, seen: false });
    expect(nbaDraftNightOf(JSON.parse(JSON.stringify(desk)), league)).toEqual(night);
    const again = openNbaDraftNight(openNbaDesk(league, ME), league, closed().series, ME)!;
    expect(again.night).toEqual(night);
  });
  it('a ledger with a spare pick, malformed markers, a missing champion, a season before the 2027 draft', () => {
    const base = closed();
    const spare = withGmBlock(openNbaDesk(base.league, ME), 'picks', { broken: true });
    base.league.teams.LAL.picks = [1, 1, 2];
    expect(openNbaDraftNight(spare, base.league, base.series, ME)).toBeNull();
    const bad = closed();
    const desk = openNbaDesk(bad.league, ME);
    bad.league.teams[ME].picks = ['x' as unknown as number];
    expect(openNbaDraftNight(desk, bad.league, bad.series, ME)).toBeNull();
    const nochamp = closed();
    nochamp.league.champions = [];
    expect(openNbaDraftNight(openNbaDesk(nochamp.league, ME), nochamp.league, nochamp.series, ME)).toBeNull();
    const early = closed();
    early.league.season = 2025;
    early.league.champions = [{ season: 2025, team: early.made[15] }];
    expect(openNbaDraftNight(openNbaDesk(early.league, ME), early.league, early.series, ME)).toBeNull();
    for (const d of [spare, desk]) expect(Object.keys(d.blocks)).not.toContain(NBA_DRAFT_BLOCK);
  });
  it('opening again over a night in progress answers that night as it stands, writing nothing', () => {
    /* Review 2026-10-12: a second open used to answer a fresh night with made 0 over markers already spent. */
    const { league, desk, night } = opened();
    const at = nbaDraftContinue(league, desk, ME, nbaEarnedDraftClass(mulberry32(13), night.slots.length, new Set()), mulberry32(14))!;
    const run = nbaDraftPick(league, at.desk, ME, at.left, at.left[0].id, mulberry32(15))!;
    const now = nbaDraftNightOf(run.desk, league)!;
    expect(now.made).toBeGreaterThan(0);
    const again = openNbaDraftNight(run.desk, league, closed().series, ME)!;
    expect(again.night).toEqual(now);
    expect(again.desk).toBe(run.desk);
  });
  it('a block broken at any field, or of another season, is never current', () => {
    const { league, desk, night } = opened();
    const breaks: ((n: GmDraftNight) => unknown)[] = [
      n => ({ ...n, year: n.year + 1 }),
      n => ({ ...n, slots: n.slots.map((s, i) => (i === 3 ? { ...s, overall: 99 } : s)) }),
      n => ({ ...n, made: n.slots.length + 1 }),
      n => ({ ...n, seen: 'yes' }),
      n => ({ ...n, order: { ...n.order, first: [...n.order.first].reverse() } }),
    ];
    for (const b of breaks) expect(nbaDraftNightOf(withGmBlock(desk, NBA_DRAFT_BLOCK, b(night)), league)).toBeNull();
    expect(nbaDraftNightOf(desk, { ...league, season: league.season + 1 })).toBeNull();
    expect(nbaDraftNightOf(desk, { ...league, round: 1 })).toBeNull();
  });
});

describe('the host and the three presses', () => {
  it('spends the marker of the slot\'s round, never the lowest one', () => {
    const { league, night } = opened();
    const { host } = nbaDraftHost({ me: ME, season: league.season, scoutLevel: 1, rng: mulberry32(1) });
    league.teams.LAL.picks = [2];
    const r1 = night.slots.find(s => s.round === 1)!;
    const r2 = night.slots.find(s => s.round === 2)!;
    expect(host.consume(league, 'LAL', r1)).toBe(false);
    expect(league.teams.LAL.picks).toEqual([2]);
    expect(host.consume(league, 'LAL', r2)).toBe(true);
    expect(league.teams.LAL.picks).toEqual([]);
  });
  it('a rival reads the engine\'s own grade; he, his staff and every card read his scout (A5)', () => {
    const { league } = opened();
    const level = 1;
    const { host } = nbaDraftHost({ me: ME, season: league.season, scoutLevel: level, rng: mulberry32(1) });
    const scout = (p: NbaProspect) => nbaScoutRead(p, ME, league.season, level);
    const cls = nbaEarnedDraftClass(mulberry32(12), 60, new Set());
    expect(cls.filter(p => scout(p) !== p.grade).length).toBeGreaterThan(10);
    for (const p of cls) {
      for (const rival of ['LAL', 'DEN', 'MIA']) expect(host.read(p, rival)).toBe(p.grade);
      expect(host.read(p, ME)).toBe(scout(p));
      expect(host.shown(p)).toBe(scout(p));
    }
  });
  it('the two knobs are one rule for every club, his own included: a second rounder plays one season at the minimum, a man from pick 13 never grows', () => {
    const { league, night } = opened();
    const { host } = nbaDraftHost({ me: ME, season: league.season, scoutLevel: 1, rng: mulberry32(2) });
    const cls = nbaEarnedDraftClass(mulberry32(21), night.slots.length, new Set());
    const signed = (club: string, p: NbaProspect, slot: EarnedSlot) => {
      host.sign(league, club, p, slot);
      return league.teams[club].players[league.teams[club].players.length - 1];
    };
    const at = (overall: number) => night.slots[overall - 1];
    expect([at(5).round, at(12).round, at(13).round, at(20).round, at(40).round]).toEqual([1, 1, 1, 1, 2]);
    expect(NBA_DRAFT_KNOBS).toEqual({ secondOnMin: true, latePot: { from: 13, cap: 66 } });
    /* A draft night deal is written with the season the summer after the draft takes off on top (fix pass of
       2026-10-22): one season at the minimum is two on draft night, the same + 1 nbaSignDraftee gives the scale. */
    expect([NBA_SECOND_ROUND_SEASONS, NBA_DRAFT_NIGHT_SUMMER]).toEqual([1, 1]);
    const onMin = NBA_SECOND_ROUND_SEASONS + NBA_DRAFT_NIGHT_SUMMER;
    const min = nbaMinContract(nbaDraftSigning(league).cap);
    const top = signed('LAL', cls[0], at(5));
    expect(top.years).toBe(4);
    expect(top.pot).toBeGreaterThan(top.ovr);
    /* Knob (ii)'s own edge (review 2026-10-22, mutation k1): pick 12 keeps the ceiling it was drawn with, pick 13 is
       capped at his rating. A drawn ceiling is at least four over the rating, so neither can pass by chance. */
    const twelfth = signed('MIA', cls[11], at(12));
    expect(twelfth.pot).toBeGreaterThanOrEqual(twelfth.ovr + 4);
    const thirteenth = signed('MIA', cls[12], at(13));
    expect(thirteenth.pot).toBe(thirteenth.ovr);
    const lateFirst = signed('LAL', cls[20], at(20));
    expect(lateFirst.years).toBe(4);
    expect(lateFirst.pot).toBe(lateFirst.ovr);
    const second = signed('DEN', cls[40], at(40));
    expect([second.years, second.salary, second.pot]).toEqual([onMin, min, second.ovr]);
    /* His own men meet the same rule (the lead's ruling of 2026-10-21): no hidden privilege for his club. Only the
       first round scale (nbaSignDraftee, four seasons plus the summer's) is his club's alone and no knob: a rival's
       first rounder keeps the engine's deal of four, so he plays three (review 2026-10-22, a note for the rookie scale
       a later round builds). */
    const myTop = signed(ME, cls[1], at(5));
    expect(myTop.years).toBe(NBA_ROOKIE_SCALE_YEARS + 1);
    expect(myTop.pot).toBeGreaterThan(myTop.ovr);
    const myLateFirst = signed(ME, cls[21], at(20));
    expect(myLateFirst.years).toBe(NBA_ROOKIE_SCALE_YEARS + 1);
    expect(myLateFirst.pot).toBe(myLateFirst.ovr);
    const mySecond = signed(ME, cls[41], at(40));
    expect([mySecond.years, mySecond.salary, mySecond.pot]).toEqual([onMin, min, mySecond.ovr]);
  });
  it('the staff press is done, and every man of his reaches the re-sign ledger with his round', () => {
    const { league, desk, night } = opened();
    const cls = nbaEarnedDraftClass(mulberry32(3), night.slots.length, new Set());
    const before = new Set(league.teams[ME].players.map(p => p.id));
    const run = nbaDraftByStaff(league, desk, ME, cls, mulberry32(4))!;
    expect(run.done).toBe(true);
    expect(run.onClock).toBeNull();
    expect(nbaDraftNightOf(run.desk, league)?.made).toBe(60);
    const rookies = league.teams[ME].players.filter(p => !before.has(p.id));
    expect(rookies).toHaveLength(2);
    const ledger = nbaContractsOf(run.desk, league, ME);
    const rounds = rookies.map(p => ledger.men[p.id]);
    expect(rounds.map(r => r.how)).toEqual(['draft', 'draft']);
    expect(rounds.map(r => r.round).sort()).toEqual([1, 2]);
    expect(rookies.find(p => ledger.men[p.id].round === 1)!.years).toBe(NBA_ROOKIE_SCALE_YEARS + 1);
    /* His second round man signs the league's second round deal (knob (i), one season at the minimum, the same rule as
       every club's since 2026-10-21, written with the summer's season on top), never the first round scale (review
       2026-10-12, mutation m3). */
    const second = rookies.find(p => ledger.men[p.id].round === 2)!;
    expect(second.years).not.toBe(NBA_ROOKIE_SCALE_YEARS + 1);
    expect([second.years, second.salary]).toEqual([NBA_SECOND_ROUND_SEASONS + NBA_DRAFT_NIGHT_SUMMER, nbaMinContract(nbaDraftSigning(league).cap)]);
  });
  it('the summer after the draft leaves every second rounder on his club for one season at the minimum, his own and a rival\'s (review 2026-10-22)', () => {
    /* The draft is held before the summer, and the summer takes a season off every deal and puts a man with one
       season left on the re-sign desk. Knob (i) once wrote one season on draft night: his own second rounder was
       released by his staff's rule that same summer, a rival's re-signed for four seasons or let go, so nobody played
       a season at the minimum. Here the night runs to its end, then his desk's summer (which runs the engine's summer
       for the whole league), and every man the night signed is followed. */
    const { league, desk, night } = opened();
    const cls = nbaEarnedDraftClass(mulberry32(3), night.slots.length, new Set());
    const run = nbaDraftByStaff(league, desk, ME, cls, mulberry32(4))!;
    expect(run.done).toBe(true);
    const deals = run.steps.map(st => {
      const man = league.teams[st.team].players.find(p => p.name === st.playerName)!;
      return { id: man.id, club: st.team, round: night.slots[st.overall - 1].round, years: man.years, salary: man.salary };
    });
    expect(deals).toHaveLength(60);
    const min = nbaMinContract(nbaDraftSigning(league).cap);
    const summer = nbaDeskOffseason(league, run.desk, ME, mulberry32(5));
    expect(summer.ok).toBe(true);
    if (!summer.ok) return;
    /* Neither of his draftees came up on his re-sign desk that summer: nothing settled them, by him or his staff. */
    for (const d of deals.filter(x => x.club === ME)) {
      expect(summer.autoSettled.some(x => x.id === d.id)).toBe(false);
      expect(summer.applied.some(x => x.id === d.id)).toBe(false);
    }
    const onClub = (d: { id: string; club: string }) => league.teams[d.club].players.find(p => p.id === d.id);
    const mine = deals.filter(d => d.club === ME);
    expect(mine.map(d => d.round).sort()).toEqual([1, 2]);
    for (const d of mine) {
      const man = onClub(d)!;
      expect(man).toBeDefined();
      expect([man.years, man.salary]).toEqual([d.years - NBA_DRAFT_NIGHT_SUMMER, d.salary]);
    }
    expect(onClub(mine.find(d => d.round === 2)!)!.years).toBe(NBA_SECOND_ROUND_SEASONS);
    expect(onClub(mine.find(d => d.round === 1)!)!.years).toBe(NBA_ROOKIE_SCALE_YEARS);
    /* A rival's man stays on his deal less the summer's season, or is waived by the summer's trim of a club over the
       roster's fifteen (its lowest rated man, often a second rounder): never re-signed, never let go as expiring. */
    let kept = 0;
    let trimmed = 0;
    for (const d of deals.filter(x => x.club !== ME)) {
      const man = onClub(d);
      if (!man) {
        trimmed += 1;
        expect(league.teams[d.club].players.length).toBeGreaterThanOrEqual(NBA_ROSTER_MAX);
        continue;
      }
      kept += 1;
      expect([man.years, man.salary]).toEqual([d.years - NBA_DRAFT_NIGHT_SUMMER, d.salary]);
      if (d.round === 2) expect([man.years, man.salary]).toEqual([NBA_SECOND_ROUND_SEASONS, min]);
    }
    expect(kept + trimmed).toBe(58);
    expect(kept).toBeGreaterThan(0);
    expect(deals.filter(d => d.club !== ME && d.round === 2 && onClub(d)).length).toBeGreaterThan(0);
  });
  it('a GM with no pick is done on Continue; a GM whose last slot is the last pick is done by it', () => {
    const a = opened();
    const none = moved(a.league, openNbaDesk(a.league, ME), [[1, ME, 'LAL'], [2, ME, 'LAL']]);
    const n1 = openNbaDraftNight(none, a.league, closed().series, ME)!;
    const r1 = nbaDraftContinue(a.league, n1.desk, ME, nbaEarnedDraftClass(mulberry32(5), 60, new Set()), mulberry32(6))!;
    expect(r1).toMatchObject({ done: true, onClock: null });
    expect(r1.steps).toHaveLength(60);
    const b = opened();
    const last = b.night.order.later[29];
    const late = moved(b.league, openNbaDesk(b.league, ME), [[1, ME, 'LAL'], [2, last, ME], [2, ME, last]]);
    const n2 = openNbaDraftNight(late, b.league, closed().series, ME)!;
    const at = nbaDraftContinue(b.league, n2.desk, ME, nbaEarnedDraftClass(mulberry32(7), 60, new Set()), mulberry32(8))!;
    expect(at).toMatchObject({ done: false });
    expect(at.onClock?.overall).toBe(60);
    const end = nbaDraftPick(b.league, at.desk, ME, at.left, at.left[0].id, mulberry32(9))!;
    expect(end).toMatchObject({ done: true, onClock: null });
    expect(nbaDraftPick(b.league, end.desk, ME, end.left, end.left[0].id, mulberry32(9))).toBeNull();
  });
  it('a GM who holds the first pick gets an empty run and is on the clock at 1', () => {
    const a = opened();
    const top = a.night.order.first[0];
    const pre = openNbaDesk(a.league, ME);
    const desk = top === ME ? pre : moved(a.league, pre, [[1, top, ME]]);
    const n = openNbaDraftNight(desk, a.league, closed().series, ME)!;
    const run = nbaDraftContinue(a.league, n.desk, ME, nbaEarnedDraftClass(mulberry32(10), 60, new Set()), mulberry32(11))!;
    expect(run.steps).toEqual([]);
    expect(run.onClock?.overall).toBe(1);
    expect(nbaDraftHeading(nbaDraftNightOf(run.desk, a.league)!, ME)).toContain('You are on the clock at 1.');
  });
});

describe('the "?" (correction 9)', () => {
  it('never says the league\'s order unqualified and prints no line of the old pick rules\' partial', () => {
    const { night } = opened();
    /* The rule set a board hands the lottery card, reached through this library's re-export (advice 17). */
    expect(draftRulesFor('nba', night.order.draftYear)).not.toBeNull();
    const lines = nbaDraftHelp(night, ME).flatMap(b => [b.heading, ...b.lines]);
    expect(lines.length).toBeGreaterThan(5);
    expect(lines.filter(l => /league's order/i.test(l))).toEqual([]);
    for (const p of nbaGamePickRules().partial) expect(lines).not.toContain(p);
  });
  it('promises the class the engine draws for the night, never a size of its own', () => {
    /* Review 2026-10-12: the help used to retype the size rule. */
    const { night } = opened();
    const drawn = nbaEarnedDraftClass(mulberry32(16), night.slots.length, new Set()).length;
    const lines = nbaDraftHelp(night, ME).flatMap(b => b.lines);
    expect(lines.filter(l => l.includes(`${night.slots.length} picks tonight and a class of ${drawn},`))).toHaveLength(1);
  });
  it('prints no chance the table cannot compute', () => {
    const { night } = opened();
    const total = nbaGamePickRules().lottery!.odds.reduce((a, b) => a + b, 0);
    const table = new Set(nbaGamePickRules().lottery!.odds.map(o => Math.round((o / total) * 1000) / 10));
    /* Round 1540: the chances before the draw add each lottery club's chance at a top four pick, worked out from the
       same table by lotteryOdds; nothing else may appear. */
    const odds = lotteryOdds(night.order, nbaGamePickRules().lottery)!;
    for (const c of odds.clubs) table.add(Math.round(c.slot.slice(0, odds.draws).reduce((a, b) => a + b, 0) * 1000) / 10);
    const shown = nbaDraftHelp(night, ME).flatMap(b => b.lines).flatMap(l => [...l.matchAll(/(\d+(?:\.\d+)?)%/g)].map(m => Number(m[1])));
    expect(shown.length).toBeGreaterThan(10);
    for (const pct of shown) expect(table.has(pct)).toBe(true);
  });
});

describe('Round 1540: the "?" states the league wide knobs, and the chances come before the draw', () => {
  it('"This game\'s draft" is the whole list, the two knob lines last', () => {
    const { night } = opened();
    const own = nbaDraftHelp(night, ME).find(b => b.heading === "This game's draft")!;
    expect(own.lines).toEqual([
      `This game's draft is two rounds of prospects it generates: ${night.slots.length} picks tonight and a class of ${nbaEarnedDraftClass(mulberry32(1), night.slots.length, new Set()).length}, so the last club still has a choice.`,
      'Each rival club takes the best man on its own read, leaning a little to a position its best eight are short of.',
      'Every grade you see is your scout\'s read, never the true rating.',
      'A pick traded away is used by the club that holds it, at the place its first club earned. A pick you hold from another club is yours, at that club\'s place.',
      'Your staff can make every pick you have left, on your scout\'s read and your needs, and the rest of the draft runs to its end.',
      'Every club\'s second round pick, yours included, signs for one season at the league minimum.',
      'Every club\'s man taken 13th or later, yours included, never grows past the rating he is drafted at.',
    ]);
  });

  it('each knob line comes from its knob: off takes it away, a new number changes the words', () => {
    expect(nbaDraftKnobLines()).toHaveLength(2);
    expect(NBA_DRAFT_KNOBS.secondOnMin).toBe(true);
    expect(NBA_SECOND_ROUND_SEASONS).toBe(1);
    expect(NBA_DRAFT_KNOBS.latePot).toEqual({ from: 13, cap: 66 });
    const offSecond = nbaDraftKnobLines({ ...NBA_DRAFT_KNOBS, secondOnMin: false });
    expect(offSecond).toEqual([nbaDraftKnobLines()[1]]);
    const offLate = nbaDraftKnobLines({ ...NBA_DRAFT_KNOBS, latePot: null });
    expect(offLate).toEqual([nbaDraftKnobLines()[0]]);
    expect(nbaDraftKnobLines(NBA_DRAFT_KNOBS, 2)[0]).toContain('signs for two seasons at the league minimum');
    expect(nbaDraftKnobLines({ ...NBA_DRAFT_KNOBS, latePot: { from: 21, cap: 66 } })[1]).toContain('taken 21st or later');
  });

  /* "Never grows past the rating he is drafted at" is true only while no man of a class is under the cap: the cap
     then leaves every late man's ceiling at his own rating. */
  const everyManAtTheCap = (cls: NbaProspect[], cap: number): boolean => cls.every(p => p.trueOvr >= cap);
  it('over 200 classes no man is drawn under the late cap, and the check sees one who is', () => {
    const cap = NBA_DRAFT_KNOBS.latePot!.cap;
    let men = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const cls = nbaEarnedDraftClass(mulberry32(seed * 7919), 60, new Set());
      men += cls.length;
      expect(everyManAtTheCap(cls, cap)).toBe(true);
    }
    expect(men).toBe(200 * 64);
    const lowered = nbaEarnedDraftClass(mulberry32(3), 60, new Set()).map((p, i) => (i === 40 ? { ...p, trueOvr: cap - 1 } : p));
    expect(everyManAtTheCap(lowered, cap)).toBe(false);
  });

  it('the chances are the shared lines on the NBA table and labels, and land in the "?" before the worked example', () => {
    const { night } = opened();
    const chances = nbaDraftChances(night, ME);
    expect(chances).toEqual(lotteryChancesBefore(night.order, night.slots, ME, nbaGamePickRules().lottery, nbaDraftLabel));
    expect(chances[0]).toMatch(/^Your club goes in seeded 3rd of 14\. By the table it has a 14\.0% chance at the first pick and \d+\.\d% at a top four pick, and it picks no later than 7th\.$/);
    const help = nbaDraftHelp(night, ME);
    const at = help.findIndex(b => b.heading === 'Before the draw');
    expect(help[at].lines).toEqual(chances);
    expect(help[at + 1].heading).toBe('Tonight, worked out');
    expect(nbaDraftHelp(night, ME, ['handed in'])[at].lines).toEqual(['handed in']);
    expect(nbaDraftHelp(night, ME, []).some(b => b.heading === 'Before the draw')).toBe(false);
  });

  it('a lottery tile shows the nickname alone', () => {
    expect(nbaDraftTileLabel('BOS')).toBe(NBA_TEAM_MAP.get('BOS')!.name);
    expect(nbaDraftLabel('BOS')).toBe(`the ${nbaDraftTileLabel('BOS')}`);
    expect(nbaDraftTileLabel('ZZZ')).toBe('ZZZ');
  });
});
