import { describe, expect, it } from 'vitest';
import { NBA_ROUNDS, initNbaLeague, nbaProspectToPlayer, type NbaLeague, type NbaProspect, type SeriesResult } from './nbaFrontOffice';
import { nbaContractsOf, nbaGamePickRules, nbaPicksOf, nbaScoutRead, openNbaDesk, syncNbaPicks } from './nbaGmDesk';
import { withGmBlock, type GmDesk } from './gmDesk';
import { NBA_PICK_RULES, movePicks, pickKey } from './gmPicks';
import { NBA_ROOKIE_SCALE_YEARS } from './gmContractRules';
import {
  NBA_DRAFT_BLOCK, nbaDraftByStaff, nbaDraftContinue, nbaDraftHeading, nbaDraftHelp, nbaDraftHost, nbaDraftNightOf,
  nbaDraftPick, nbaDraftSeason, nbaEarnedDraftClass, openNbaDraftNight, type GmDraftNight,
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
    /* His second round man keeps the plain draft deal, never the first round scale (review 2026-10-12, mutation m3). */
    const plain = nbaProspectToPlayer(cls[cls.length - 1], mulberry32(1)).years;
    expect(plain).not.toBe(NBA_ROOKIE_SCALE_YEARS + 1);
    expect(rookies.find(p => ledger.men[p.id].round === 2)!.years).toBe(plain);
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
    const lines = nbaDraftHelp(night, ME).flatMap(b => [b.heading, ...b.lines]);
    expect(lines.length).toBeGreaterThan(5);
    expect(lines.filter(l => /league's order/i.test(l))).toEqual([]);
    for (const p of nbaGamePickRules().partial) expect(lines).not.toContain(p);
  });
  it('prints no chance the table cannot compute', () => {
    const { night } = opened();
    const total = NBA_PICK_RULES.lottery!.odds.reduce((a, b) => a + b, 0);
    const table = new Set(NBA_PICK_RULES.lottery!.odds.map(o => Math.round((o / total) * 1000) / 10));
    const shown = nbaDraftHelp(night, ME).flatMap(b => b.lines).flatMap(l => [...l.matchAll(/(\d+(?:\.\d+)?)%/g)].map(m => Number(m[1])));
    expect(shown.length).toBeGreaterThan(10);
    for (const pct of shown) expect(table.has(pct)).toBe(true);
  });
});
