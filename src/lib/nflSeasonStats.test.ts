/* Round 1542: the NFL Front Office's season lines, credits and awards (src/lib/nflSeasonStats.ts) on hand built
   clubs and hand built seasons. The fleet's identities, determinism, rating effect and the close over real
   franchises are scripts/simNflSeasonStats.mjs's. */
import { describe, expect, it } from 'vitest';
import type { GmPlayer, GmTeamState, LeagueState } from '@/lib/frontOffice';
import { unitStarters, SKILL_POS, SKILL_SLOTS, DEF_POS, DEF_SLOTS } from '@/lib/frontOffice';
import { FO_HISTORY_CAP, foCloseOnce } from '@/lib/foSeasonClose';
import { nflDrivePair } from '@/lib/gameLaws/nflDrives';
import { keyedRng } from '@/lib/keyedRng';
import {
  NFL_AWARD_LABEL, nflAwardList, nflCleanSave, nflCloseSeasonStats, nflCreditGame, nflLiveStats, nflMarkRookies, nflMvpScore,
  nflFoStats, nflNewStats, nflPassChance, nflPlaysFor, nflPool, nflPoolMen, nflRecordGame, nflRecordWeek, nflSackChance, nflSeasonAwards,
  nflStatsHelp, nflUsage, readNflAwards, readNflStats, type NflSeasonAwards, type NflSeasonStats, type NflToldGame,
} from '@/lib/nflSeasonStats';
import { NFL_SAT_OUT, nflHistoryRows } from '@/lib/nflSeasonView';

let n = 0;
const P = (pos: GmPlayer['pos'], ovr: number, extra: Partial<GmPlayer> = {}): GmPlayer => {
  n += 1;
  return { id: `t${String(n).padStart(3, '0')}`, name: `Man ${n}`, pos, age: 25, ovr, salary: 1, years: 1, out: 0, pot: ovr, ...extra };
};
const club = (abbr: string, players: GmPlayer[], extra: Partial<GmTeamState> = {}): GmTeamState => ({ abbr, players, defense: 70, wins: 0, losses: 0, picks: [], ...extra });
/** The fifteen the bake ships: QB 1, RB 2, WR 3, TE 1, OL 2, DL 2, LB 2, DB 2. */
const fifteen = (abbr: string, lift = 0): GmTeamState => club(abbr, [
  P('QB', 80 + lift), P('RB', 75 + lift), P('RB', 70 + lift), P('WR', 82 + lift), P('WR', 78 + lift), P('WR', 72 + lift), P('TE', 74 + lift),
  P('OL', 76 + lift), P('OL', 74 + lift), P('DL', 78 + lift), P('DL', 72 + lift), P('LB', 75 + lift), P('LB', 70 + lift), P('DB', 77 + lift), P('DB', 73 + lift),
]);
const league = (teams: GmTeamState[], extra: Partial<LeagueState> = {}): LeagueState => ({
  season: 2027, cap: 300, teams: Object.fromEntries(teams.map(t => [t.abbr, t])), freeAgents: [], schedule: [], week: 1, champions: [], ...extra,
});
/** Scores every side can have (no 1 and no 4), many keys. */
const games = (home: string, away: string, count: number): NflToldGame[] => Array.from({ length: count }, (_, i) => {
  const s = [0, 2, 3, 6, 7, 10, 13, 14, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35, 38, 41, 45];
  const hs = s[(i * 7) % s.length];
  let as = s[(i * 11 + 3) % s.length];
  if (as === hs) as = hs === 0 ? 3 : 0;
  return { key: `2027|w${1 + (i % 17)}|${home}|${away}|${i}`, home, away, homeScore: hs, awayScore: as };
});
const tdsOf = (g: NflToldGame, side: 0 | 1) => {
  const pair = nflDrivePair(g.homeScore, g.awayScore, keyedRng(`${g.key}|story|${g.homeScore}-${g.awayScore}`));
  return pair ? pair[side].tds.length : -1;
};

describe('the pool and the credit', () => {
  it('reads the engine\'s own starters, and a lineman, a bench man, a practice squad man and an injured starter record nothing', () => {
    const hurt = P('WR', 92, { out: 2 });
    const deep = club('AAA', [
      P('QB', 85), P('QB', 70), P('RB', 80), P('RB', 74), P('RB', 66), hurt, P('WR', 84), P('WR', 80), P('WR', 76), P('WR', 70),
      P('TE', 75), P('TE', 65), P('OL', 78), P('OL', 77), P('OL', 70), P('DL', 80), P('DL', 76), P('DL', 70), P('LB', 78), P('LB', 72), P('LB', 66),
      P('DB', 79), P('DB', 74), P('DB', 68),
    ], { rosterDepth: 2, practice: [P('WR', 88), P('DL', 85)] });
    const other = fifteen('BBB');
    const lg = league([deep, other], { stats: nflNewStats(2027) });
    const pool = nflPool(deep);
    const want = [...unitStarters(deep, ['QB'], 1), ...unitStarters(deep, SKILL_POS, SKILL_SLOTS), ...unitStarters(deep, DEF_POS, DEF_SLOTS)].map(p => p.id).sort();
    expect(nflPoolMen(pool).map(p => p.id).sort()).toEqual(want);
    expect(want).toHaveLength(12);
    for (const g of games('AAA', 'BBB', 300)) expect(nflRecordGame(lg, g, 'AAA', true)).toBe(true);
    const ids = new Set(Object.values(nflFoStats(lg.stats!).lines).filter(l => l.team === 'AAA').map(l => l.id));
    expect([...ids].sort()).toEqual(want);
    for (const p of [hurt, ...deep.players.filter(p => p.pos === 'OL'), ...deep.practice!]) expect(ids.has(p.id)).toBe(false);
    /* every pool man was in every game, and somebody caught, ran and sacked */
    for (const l of Object.values(nflFoStats(lg.stats!).lines)) expect([l.g, l.gs]).toEqual([300, 300]);
    const sum = (col: string) => Object.values(nflFoStats(lg.stats!).lines).reduce((a, l) => a + (l.tot[col] ?? 0), 0);
    expect(sum('ptd')).toBe(sum('ctd'));
    expect(sum('rtd')).toBeGreaterThan(0);
    expect(sum('sk')).toBeGreaterThan(0);
  });
});

describe('the credit adds up', () => {
  it('a side\'s credited and unclaimed touchdowns are its drive split, thrown equals caught, and the club line is the split', () => {
    const lg = league([fifteen('AAA'), fifteen('BBB', 4)], { stats: nflNewStats(2027) });
    let tds = 0;
    for (const g of games('AAA', 'BBB', 200)) {
      const c = nflCreditGame(g, lg.teams)!;
      expect(c.home.credits.length + c.home.unclaimed).toBe(tdsOf(g, 0));
      expect(c.away.credits.length + c.away.unclaimed).toBe(tdsOf(g, 1));
      expect(c.home.unclaimed + c.away.unclaimed).toBe(0);
      tds += tdsOf(g, 0);
      nflRecordGame(lg, g, 'AAA', true);
    }
    const lines = Object.values(nflFoStats(lg.stats!).lines).filter(l => l.team === 'AAA');
    const col = (k: string) => lines.reduce((a, l) => a + (l.tot[k] ?? 0), 0);
    expect(col('ptd')).toBe(col('ctd'));
    expect(col('rtd') + col('ctd')).toBe(tds);
    expect(lg.stats!.clubs.AAA[4]).toBe(tds);
    expect(lg.stats!.clubs.AAA[0]).toBe(200);
  });

  it('with no healthy quarterback every touchdown is a run, and a side with nobody to take one leaves it unclaimed', () => {
    const noQb = fifteen('AAA');
    noQb.players.find(p => p.pos === 'QB')!.out = 3;
    const lg = league([noQb, fifteen('BBB')]);
    const credits = games('AAA', 'BBB', 120).map(g => nflCreditGame(g, lg.teams)!);
    expect(credits.flatMap(c => c.home.credits).length).toBeGreaterThan(0);
    expect(credits.flatMap(c => c.home.credits).every(c => c.passer === null)).toBe(true);
    for (const p of noQb.players) if (p.pos === 'RB' || p.pos === 'WR' || p.pos === 'TE') p.out = 3;
    const none = games('AAA', 'BBB', 120).map(g => nflCreditGame(g, lg.teams)!);
    expect(none.flatMap(c => c.home.credits)).toHaveLength(0);
    expect(none.reduce((a, c) => a + c.home.unclaimed, 0)).toBeGreaterThan(0);
  });

  it('the same game credits the same men, twice and through JSON, and a final with no list records nothing', () => {
    const lg = league([fifteen('AAA'), fifteen('BBB')]);
    const copy: LeagueState = JSON.parse(JSON.stringify(lg));
    for (const g of games('AAA', 'BBB', 60)) {
      expect(JSON.stringify(nflCreditGame(g, lg.teams))).toBe(JSON.stringify(nflCreditGame(g, lg.teams)));
      expect(JSON.stringify(nflCreditGame(g, copy.teams))).toBe(JSON.stringify(nflCreditGame(g, lg.teams)));
    }
    expect(nflCreditGame({ key: 'k', home: 'AAA', away: 'BBB', homeScore: 1, awayScore: 7 }, lg.teams)).toBeNull();
    expect(nflCreditGame({ key: 'k', home: 'AAA', away: 'ZZZ', homeScore: 3, awayScore: 7 }, lg.teams)).toBeNull();
  });

  it('the rules\' numbers: the pass chance, the usage and the sack chance stay in their ranges', () => {
    [[nflPassChance(85), 0.65], [nflPassChance(70), 0.5], [nflPassChance(99), 0.75], [nflPassChance(40), 0.35]].forEach(([got, want]) => expect(got).toBeCloseTo(want, 9));
    expect(nflUsage(85) / nflUsage(72)).toBeCloseTo(1.78, 5);
    expect(nflUsage(50)).toBe(0.4);
    [[nflSackChance(70, 70), 0.28], [nflSackChance(99, 50), 0.5], [nflSackChance(50, 99), 0.1]].forEach(([got, want]) => expect(got).toBeCloseTo(want, 9));
    const help = nflStatsHelp();
    expect(help[help.length - 1]).toContain('throws 65 of every 100');
  });
});

describe('the block and his games', () => {
  it('opens at Week 1 only, drops last season\'s lines and keeps the history; his games keep their credits', () => {
    const lg = league([fifteen('AAA'), fifteen('BBB')], { week: 5 });
    const g = games('AAA', 'BBB', 3);
    expect(nflRecordWeek(lg, g, 'AAA')).toBe(0);
    expect(lg.stats).toBeUndefined();
    const old: NflSeasonStats = { ...nflNewStats(2026), lines: { AAA: { x: ['Old', 'QB', 17, 30, 0, 0, 0] } } };
    const history: NflSeasonAwards[] = [{ season: 2026, mvp: null, oroy: null, droy: null, rookies: false }];
    Object.assign(lg, { week: 1, stats: old, awards: history });
    expect(nflRecordWeek(lg, g, 'AAA')).toBe(3);
    expect(lg.stats!.season).toBe(2027);
    expect(lg.stats!.lines.AAA.x).toBeUndefined();
    expect(lg.awards).toEqual(history);
    expect(nflPlaysFor(lg, g[0].key)).not.toBeNull();
    expect(nflPlaysFor(lg, 'no such game')).toBeNull();
    /* a playoff game writes his credits and no line */
    const before = JSON.stringify(lg.stats!.lines);
    const po: NflToldGame = { key: '2027|Wild Card|AAA|BBB|x', home: 'AAA', away: 'BBB', homeScore: 24, awayScore: 17 };
    expect(nflRecordGame(lg, po, 'AAA', false)).toBe(true);
    expect(JSON.stringify(lg.stats!.lines)).toBe(before);
    expect(nflPlaysFor(lg, po.key)!.home.length + nflPlaysFor(lg, po.key)!.away.length).toBeGreaterThan(0);
    /* a game that is not his keeps no credits */
    const theirs: NflToldGame = { key: 'theirs', home: 'BBB', away: 'AAA', homeScore: 10, awayScore: 7 };
    nflRecordGame(lg, theirs, 'CCC', true);
    expect(nflPlaysFor(lg, 'theirs')).toBeNull();
  });
});

describe('rookies, readers and the clean load', () => {
  it('stamps the man of each pick on his club once, and counts what it found', () => {
    const a = fifteen('AAA');
    const b = fifteen('BBB');
    const lg = league([a, b]);
    a.players.push(P('WR', 70, { name: 'Draft One' }));
    b.players.push(P('DL', 71, { name: 'Draft Two' }));
    expect(nflMarkRookies(lg, [{ team: 'AAA', playerName: 'Draft One' }, { team: 'BBB', playerName: 'Draft Two' }, { team: 'BBB', playerName: 'Nobody' }], 2028)).toBe(2);
    expect(a.players.find(p => p.name === 'Draft One')!.rookieSeason).toBe(2028);
    expect(nflMarkRookies(lg, [{ team: 'AAA', playerName: 'Draft One' }], 2029)).toBe(0);
    expect(a.players.filter(p => p.rookieSeason !== undefined)).toHaveLength(1);
  });

  it('reads a whole block and history, refuses a damaged one, and the clean load deletes the bad keys in place', () => {
    const lg = league([fifteen('AAA'), fifteen('BBB')], { stats: nflNewStats(2027) });
    for (const g of games('AAA', 'BBB', 5)) nflRecordGame(lg, g, 'AAA', true);
    expect(readNflStats(JSON.parse(JSON.stringify(lg.stats)))).not.toBeNull();
    const bad = (f: (s: NflSeasonStats) => void) => { const s: NflSeasonStats = JSON.parse(JSON.stringify(lg.stats)); f(s); return readNflStats(s); };
    const first = (s: NflSeasonStats) => Object.values(Object.values(s.lines)[0])[0] as unknown as unknown[];
    expect(bad(s => { first(s)[2] = -1; })).toBeNull();
    expect(bad(s => { first(s).push(9); })).toBeNull();
    expect(bad(s => { first(s)[0] = ''; })).toBeNull();
    expect(bad(s => { (Object.values(s.plays!)[0][0] as unknown[]).push([null, 7]); })).toBeNull();
    expect(bad(s => { s.clubs.AAA = [1, 2] as unknown as NflSeasonStats['clubs'][string]; })).toBeNull();
    expect(bad(s => { s.clubs.AAA[1] = s.clubs.AAA[0] + 1; })).toBeNull();
    expect(readNflStats('nope')).toBeNull();
    const hist: NflSeasonAwards[] = [{ season: 2026, mvp: null, oroy: null, droy: null, rookies: false }];
    expect(readNflAwards(hist)).not.toBeNull();
    expect(readNflAwards([...hist, ...hist])).toBeNull();
    expect(readNflAwards([{ season: 2026, mvp: null, oroy: null, droy: null }])).toBeNull();
    expect(readNflAwards(Array.from({ length: FO_HISTORY_CAP + 1 }, (_, i) => ({ ...hist[0], season: i })))).toBeNull();
    const damaged = league([fifteen('AAA')], { stats: { season: 2027, lines: 5 } as unknown as NflSeasonStats, awards: 'x' as unknown as NflSeasonAwards[] });
    const man = damaged.teams.AAA.players[0] as unknown as Record<string, unknown>;
    man.awards = [3];
    man.rookieSeason = 'soon';
    damaged.teams.AAA.players[1].awards = ['2026 MVP'];
    expect(nflCleanSave(damaged)).toBe(4);
    expect('stats' in damaged || 'awards' in damaged || 'awards' in man || 'rookieSeason' in man).toBe(false);
    expect(damaged.teams.AAA.players[1].awards).toEqual(['2026 MVP']);
  });
});

describe('the awards and the close', () => {
  type L = { team: string; id: string; g: number; tot: Record<string, number>; rookie?: boolean; pos?: string };
  /** A season by hand: the lines in the order given (the man who should LOSE a tie goes first), and each club's [wins, games]. */
  const seasonLeague = (ls: L[], clubs: Record<string, [number, number]>, men: GmPlayer[] = []): LeagueState => {
    const stats = nflNewStats(2027);
    for (const l of ls) {
      const t = l.tot;
      (stats.lines[l.team] ??= {})[l.id] = l.rookie
        ? [`Name ${l.id}`, l.pos ?? 'QB', l.g, t.ptd ?? 0, t.rtd ?? 0, t.ctd ?? 0, t.sk ?? 0, 1]
        : [`Name ${l.id}`, l.pos ?? 'QB', l.g, t.ptd ?? 0, t.rtd ?? 0, t.ctd ?? 0, t.sk ?? 0];
    }
    for (const [t, [w, g]] of Object.entries(clubs)) stats.clubs[t] = [g, w, 0, 0, 0, 0, 0];
    const a = fifteen('AAA');
    a.players.push(...men);
    return league([a, fifteen('BBB')], { stats });
  };
  const clubs: Record<string, [number, number]> = { AAA: [2, 17], BBB: [15, 17] };

  it('MVP is the argmax of the stated rule: a bigger line on a losing club beats a smaller one on a winner only when it outscores the win share', () => {
    const big = seasonLeague([{ team: 'AAA', id: 'a', g: 17, tot: { ptd: 30 } }, { team: 'BBB', id: 'b', g: 17, tot: { ptd: 20 } }], clubs);
    expect(nflSeasonAwards(big)!.mvp!.id).toBe('a');
    const small = seasonLeague([{ team: 'AAA', id: 'a', g: 17, tot: { ptd: 18 } }, { team: 'BBB', id: 'b', g: 17, tot: { ptd: 20 } }], clubs);
    expect(nflSeasonAwards(small)!.mvp!.id).toBe('b');
    const fo = nflFoStats(small.stats!);
    expect(nflMvpScore(fo, fo.lines['BBB|b'])).toBeCloseTo(20 + 10 * 15 / 17, 9);
    /* half a sack counts: 10 sacks are worth 5 touchdowns */
    const sacks = seasonLeague([{ team: 'BBB', id: 'q', g: 17, tot: { ptd: 4 } }, { team: 'BBB', id: 'r', g: 17, tot: { sk: 10 }, pos: 'DL' }], clubs);
    expect(nflSeasonAwards(sacks)!.mvp!.id).toBe('r');
  });

  it('an exact tie goes to more games, then to the id, whatever order the lines are in', () => {
    const games = seasonLeague([{ team: 'BBB', id: 'm1', g: 16, tot: { ptd: 12 } }, { team: 'BBB', id: 'm2', g: 17, tot: { ptd: 12 } }], clubs);
    expect(nflSeasonAwards(games)!.mvp!.id).toBe('m2');
    const ids = seasonLeague([{ team: 'BBB', id: 'z9', g: 17, tot: { ptd: 12 } }, { team: 'BBB', id: 'a1', g: 17, tot: { ptd: 12 } }], clubs);
    expect(nflSeasonAwards(ids)!.mvp!.id).toBe('a1');
  });

  it('rookie awards: first year men drafted in this save only, at least one apiece; a save\'s first season has no class', () => {
    const first = seasonLeague([{ team: 'AAA', id: 'v', g: 17, tot: { ctd: 9 } }], clubs, [P('WR', 70, { noSeason: true })]);
    const a = nflSeasonAwards(first)!;
    expect([a.oroy, a.droy, a.rookies]).toEqual([null, null, false]);
    const kid = P('WR', 70, { rookieSeason: 2027 });
    const later = seasonLeague([{ team: 'AAA', id: kid.id, g: 17, tot: { ctd: 3 }, rookie: true, pos: 'WR' }, { team: 'AAA', id: 'v', g: 17, tot: { ctd: 9 } }], clubs, [kid]);
    const b = nflSeasonAwards(later)!;
    expect([b.oroy?.id, b.droy, b.rookies]).toEqual([kid.id, null, true]);
  });

  it('a man traded in mid season is summed onto the club he played most for', () => {
    const lg = seasonLeague([{ team: 'AAA', id: 'x', g: 10, tot: { ptd: 25 } }, { team: 'BBB', id: 'x', g: 7, tot: { ptd: 10 } }], clubs);
    expect(nflSeasonAwards(lg)!.mvp).toMatchObject({ id: 'x', team: 'AAA', g: 17, ptd: 35 });
  });

  it('closes once, marks the winners on a roster, a practice squad and the free agent pool, and keeps 40 seasons', () => {
    const qb = P('QB', 90);
    const kid = P('WR', 70, { rookieSeason: 2027 });
    const rusher = P('DL', 70, { rookieSeason: 2027 });
    const lg = seasonLeague([
      { team: 'AAA', id: qb.id, g: 17, tot: { ptd: 40 } },
      { team: 'AAA', id: kid.id, g: 17, tot: { ctd: 5 }, rookie: true, pos: 'WR' },
      { team: 'AAA', id: rusher.id, g: 17, tot: { sk: 6 }, rookie: true, pos: 'DL' },
    ], clubs, [qb]);
    lg.teams.BBB.practice = [kid];
    lg.freeAgents = [rusher];
    const closed = nflCloseSeasonStats(lg)!;
    expect(nflAwardList(closed).map(([k]) => k)).toEqual(['mvp', 'oroy', 'droy']);
    expect([qb.awards, kid.awards, rusher.awards]).toEqual([[`2027 ${NFL_AWARD_LABEL.mvp}`], [`2027 ${NFL_AWARD_LABEL.oroy}`], [`2027 ${NFL_AWARD_LABEL.droy}`]]);
    expect(nflCloseSeasonStats(lg)).toBe(closed);
    expect(qb.awards).toHaveLength(1);
    expect(lg.awards).toHaveLength(1);
    const full = { season: 2100, awards: Array.from({ length: FO_HISTORY_CAP }, (_, i) => ({ season: 2060 + i })) };
    foCloseOnce(full, () => ({ season: 2100 }), () => [], []);
    expect(full.awards).toHaveLength(FO_HISTORY_CAP);
    expect([full.awards[0].season, full.awards[FO_HISTORY_CAP - 1].season]).toEqual([2061, 2100]);
    /* a league keeping no lines for its season names nothing and writes nothing */
    const none = league([fifteen('AAA')], { stats: nflNewStats(2026) });
    expect(nflLiveStats(none)).toBeNull();
    expect(nflCloseSeasonStats(none)).toBeNull();
    expect(none.awards).toBeUndefined();
  });
});

describe('the award history', () => {
  const entry = (season: number, mvp: NflSeasonAwards['mvp'] = null): NflSeasonAwards => ({ season, mvp, oroy: null, droy: null, rookies: false });
  it('a closed season after the first lined one with no awards of its own is a season sat out, and its row says so', () => {
    const hand = { id: 'q1', name: 'Old Hand', team: 'AAA', pos: 'QB', g: 17, ptd: 30, rtd: 2, ctd: 0, sk: 0 };
    const lg = {
      awards: [entry(2027, hand), entry(2029)],
      champions: [2025, 2026, 2027, 2028, 2029].map((season, i) => ({ season, team: i % 2 ? 'BBB' : 'CCC' })),
    };
    const h = nflHistoryRows(lg, 'AAA');
    expect(h.rows.map(r => r.season), 'newest first, the sat out 2028 between its neighbours, nothing before 2027').toEqual([2029, 2028, 2027]);
    expect(h.rows[1].text).toBe(`Champions BBB · ${NFL_SAT_OUT}`);
    expect(h.rows[2].text).toBe('Champions CCC · MVP Old Hand (AAA)');
    expect(h.ours).toBe(1);
    expect(h.before, '2025 and 2026 were played before lines were kept').toBe(true);
    /* a save whose first lined season is its first season has nothing before it, and no season sat out */
    const fresh = nflHistoryRows({ awards: [entry(2027)], champions: [{ season: 2027, team: 'AAA' }] }, 'AAA');
    expect([fresh.rows.length, fresh.before]).toEqual([1, false]);
    expect(fresh.rows[0].text).not.toContain(NFL_SAT_OUT);
  });
});
