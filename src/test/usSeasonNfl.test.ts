/* Round 1147: the NFL's number file for the US Season Center
   (src/lib/season/nfl.ts), every pure part of it. The loops walk every
   value, never only the ends: every score from 0 to 70 with every number of
   his touchdowns and every exact field goal count, every minute of the
   clock, every one of the 32 teams as "his". */
import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { buildUsSeason, usPlayoffPath, type UsRow } from '@/lib/season/us';
import { deriveSeason, type DerivedGame, type SeasonEvent } from '@/lib/season/core';
import {
  NFL_SEASON, nflClockLabel, nflDeal, nflDealProblems, nflDealUnnamed, nflDriveCost, nflDrives, nflEventWords, nflKickerMakes, nflOrderProblems, nflScore, nflTouchdownDays,
} from '@/lib/season/nfl';
import { NBA_SEASON } from '@/lib/season/nba';
import { NFL_ERAS, NFL_MISSED_PLAYOFFS, NFL_PLAYOFF_RESULTS, teamLabelOf } from '@/lib/nflMyCareer';
import { NFL_CLOCK, NFL_SCORING, US_PLAYOFF_FORMAT, nflHosts17, usLeagueShape } from '@/data/usLeagueShape';
import { usSeasonHeldLine } from '@/data/usSeasonLengths';

/* ───────────────────────── the drives of one side ───────────────────────── */

/** The test's own answer to "can this score be made": touchdowns of 6, 7 or 8, threes, at most one safety. */
function canMake(points: number, minTd: number, exactFg: number | null): boolean {
  for (let s = 0; s <= 1; s += 1) for (let f = exactFg ?? 0; f <= (exactFg ?? 6); f += 1) for (let t = minTd; t <= 12; t += 1) {
    const rest = points - 3 * f - 2 * s;
    if (rest >= 6 * t && rest <= 8 * t) return true;
  }
  return false;
}
/** Plain football: sevens and threes only make it. */
function plain(points: number, minTd: number, exactFg: number | null): boolean {
  for (let f = exactFg ?? 0; f <= (exactFg ?? 6); f += 1) {
    const rest = points - 3 * f;
    if (rest >= 0 && rest % 7 === 0 && rest / 7 >= minTd) return true;
  }
  return false;
}

describe('nflDrives', () => {
  it('makes every score from 0 to 70, with 0 to 5 touchdowns of his and every exact field goal count', () => {
    let made = 0; let refused = 0;
    for (let points = 0; points <= 70; points += 1) for (let minTd = 0; minTd <= 5; minTd += 1) for (const exactFg of [null, 0, 1, 2, 3, 4, 5, 6]) {
      const label = `${points} points, ${minTd} of his, ${exactFg === null ? 'any' : exactFg} field goals`;
      const d = nflDrives(points, minTd, exactFg, keyedRng(`drives|${label}`));
      const can = canMake(points, minTd, exactFg);
      expect(d !== null, label).toBe(can);
      expect(nflDriveCost(points, minTd, exactFg) !== null, label).toBe(can);
      if (!d) { refused += 1; continue; }
      made += 1;
      expect(d.tds.reduce((a, v) => a + v, 0) + 3 * d.fgs + 2 * d.safeties, label).toBe(points);
      expect(d.tds.length, label).toBeGreaterThanOrEqual(minTd);
      expect(d.tds.every(v => v === 6 || v === 7 || v === 8), label).toBe(true);
      expect(d.safeties, label).toBeLessThanOrEqual(1);
      expect(d.fgs, label).toBeLessThanOrEqual(6);
      if (exactFg !== null) expect(d.fgs, label).toBe(exactFg);
      /* sevens and threes first: when plain football makes the score, nothing odd is used */
      if (plain(points, minTd, exactFg)) { expect(d.safeties, label).toBe(0); expect(d.tds.every(v => v === 7), label).toBe(true); }
      /* never a six and an eight in one list (a seven and a seven is the same sum) */
      expect(d.tds.includes(6) && d.tds.includes(8), label).toBe(false);
    }
    /* both branches were walked */
    expect(made).toBeGreaterThan(1500);
    expect(refused).toBeGreaterThan(300);
  });
  it('has a list for every whole number but 1 and 4 when nothing is asked of it', () => {
    const none: number[] = [];
    for (let points = 0; points <= 70; points += 1) if (!nflDrives(points, 0, null, keyedRng(`free|${points}`))) none.push(points);
    expect(none).toEqual([1, 4]);
    expect(nflDrives(-1, 0, null, keyedRng('x'))).toBeNull();
    expect(nflDrives(7.5, 0, null, keyedRng('x'))).toBeNull();
  });
  it('draws the same list from the same key, and always takes one number from its stream first', () => {
    expect(nflDrives(31, 2, null, keyedRng('same'))).toEqual(nflDrives(31, 2, null, keyedRng('same')));
    /* a score with no list still spends its draw, so a refused side never shifts the next side's stream */
    const a = keyedRng('spent'); nflDrives(4, 0, null, a);
    const b = keyedRng('spent'); b();
    expect(a()).toBe(b());
  });
});

describe('the NFL score law', () => {
  it('never returns a level game, a 1, a 3 or a 4, and stays under the cap', () => {
    const seen = new Set<number>();
    /* counted in plain loops and asserted once: 40,000 games are too many for an expect each */
    let level = 0;
    const bad: number[] = [];
    for (const edge of [-40, -14, 0, 14, 40]) for (const home of [true, false]) {
      const rng = keyedRng(`score|${edge}|${home}`);
      for (let i = 0; i < 4000; i += 1) {
        const [us, them] = nflScore(edge, home, rng);
        if (us === them) level += 1;
        for (const v of [us, them]) { if (!Number.isInteger(v) || v < 0 || v > NFL_SEASON.cap || v === 1 || v === 3 || v === 4) bad.push(v); seen.add(v); }
      }
    }
    expect(level).toBe(0);
    expect(bad).toEqual([]);
    expect(seen.size).toBeGreaterThan(30);
    /* a shut out and a big day are both in the law */
    expect(seen.has(0)).toBe(true);
    expect([...seen].some(v => v >= 45)).toBe(true);
  });
  it('gives the stronger side more wins, and the same side more at home', () => {
    const wins = (edge: number, home: boolean) => { const rng = keyedRng(`wins|${edge}|${home}`); let w = 0; for (let i = 0; i < 6000; i += 1) { const [u, t] = nflScore(edge, home, rng); if (u > t) w += 1; } return w / 6000; };
    expect(wins(14, true)).toBeGreaterThan(wins(0, true) + 0.1);
    expect(wins(0, true)).toBeGreaterThan(wins(-14, true) + 0.1);
    expect(wins(0, true)).toBeGreaterThan(wins(0, false));
  });
});

describe('the NFL clock', () => {
  it('reads the quarter and the minutes left in it at every minute', () => {
    expect(nflClockLabel(0)).toBe('Q1 15:00');
    expect(nflClockLabel(1)).toBe('Q1 14:00');
    expect(nflClockLabel(15)).toBe('Q1 0:00');
    expect(nflClockLabel(16)).toBe('Q2 14:00');
    expect(nflClockLabel(45)).toBe('Q3 0:00');
    expect(nflClockLabel(60)).toBe('Q4 0:00');
    for (let m = 0; m <= 60; m += 1) {
      const label = nflClockLabel(m);
      const hit = /^Q([1-4]) (\d{1,2}):00$/.exec(label);
      expect(hit, `minute ${m}: ${label}`).not.toBeNull();
      const q = Number(hit![1]); const left = Number(hit![2]);
      /* the minutes played are the quarters behind him plus what this one has used */
      expect((q - 1) * 15 + (15 - left), `minute ${m}`).toBe(m);
      expect(label.length).toBeLessThanOrEqual(8);
    }
    /* the feed's time column is the wide one, as a whole literal the stylesheet holds */
    expect(NFL_SEASON.view.clock.labelClass).toBe('w-14');
    expect(NFL_SEASON.view.clock.length).toBe(60);
  });
});

/* ───────────────────────── the schedule and the season ───────────────────────── */

const LINES: Record<string, Partial<UsRow>> = {
  QB: { passYds: 4210, passTd: 31, ints: 11 },
  RB: { rushYds: 1240, rushTd: 11, rec: 38, recYds: 301 },
  WR: { rec: 96, recYds: 1310, recTd: 9 },
  TE: { rec: 71, recYds: 812, recTd: 7 },
  LB: { tackles: 131, sacks: 4.5, picks: 2, forcedFum: 2 },
  CB: { tackles: 58, picks: 5, passDef: 14, forcedFum: 1 },
  EDGE: { sacks: 13.7, tackles: 49, forcedFum: 3, passDef: 2 },
  K: { fgAtt: 33, fgMade: 29, longFg: 56 },
};
const POSITIONS = Object.keys(LINES);
const NFL_ROW = (pos: string, over: Partial<UsRow> = {}): UsRow => ({
  year: 2026, team: 'KC', age: 25, ovr: 85, games: 17, awards: [], salary: 10,
  teamResult: 'Lost in the Divisional round', poGames: 2, poLine: '512 yds, 4 TD, 1 INT',
  ...LINES[pos], ...over,
} as UsRow);
const career = (pos: string, eraId?: string) => ({ name: 'Rex Gridiron', pos, eraId });
const built = (row: UsRow, pos = 'QB', eraId?: string) => {
  const b = buildUsSeason(NFL_SEASON, career(pos, eraId), row, teamLabelOf);
  if (b.ok === false) throw new Error(`usSeasonNfl.test: ${b.why}`);
  return b;
};
const asGames = (rounds: [number, number][][]) =>
  rounds.map((r, i) => ({ md: i + 1, opp: r[0][0] === 0 ? r[0][1] : r[0][0], home: r[0][0] === 0 })) as unknown as DerivedGame[];
const NOW_IDS = NFL_ERAS[0].teams.map(t => t.abbr);

describe('the NFL schedule formula, dealt for every team', () => {
  it('meets every kind of opponent as the formula says, 8 or 9 at home, whoever he plays for and whichever year', () => {
    expect(NOW_IDS).toHaveLength(32);
    const homes = new Set<number>();
    for (const team of NOW_IDS) for (const year of [2026, 2027, 2028, 2030]) {
      const { ctx } = built(NFL_ROW('QB', { team, year }));
      expect(ctx.order[0]).toBe(team);
      expect([...ctx.order].sort()).toEqual([...NOW_IDS].sort());
      expect([ctx.divSlots, ctx.confSlots]).toEqual([3, 15]);
      const conf = usLeagueShape('nfl', undefined, year)!.divisions.find(d => d.teams.includes(team))!.conf;
      const hosts = nflHosts17(year, conf);
      for (let seed = 0; seed < 5; seed += 1) {
        const rounds = nflDeal(ctx, keyedRng(`deal|${team}|${year}|${seed}`));
        expect(rounds).toHaveLength(17);
        expect(rounds.every(r => r.length === 1 && (r[0][0] === 0) !== (r[0][1] === 0))).toBe(true);
        const games = asGames(rounds);
        expect(nflDealProblems(ctx, games), `${team} ${year} seed ${seed}`).toEqual([]);
        const h = games.filter(g => g.home).length;
        /* the 17th game is at home exactly when the ledger says his conference hosts it that year */
        if (hosts !== null) expect(h, `${team} ${year}`).toBe(hosts ? 9 : 8);
        else homes.add(h);
      }
    }
    /* where nothing is verified (2030) the side is keyed, so both happen */
    expect([...homes].sort()).toEqual([8, 9]);
  });
  it('is caught when a division rival is met three times, a whole division is one short, or the 17th game is on the wrong side', () => {
    const { ctx } = built(NFL_ROW('QB'));
    const good = asGames(nflDeal(ctx, keyedRng('broken')));
    const third = good.map(g => ({ ...g }));
    third[third.findIndex(g => g.opp > 15)].opp = 1;
    expect(nflDealProblems(ctx, third).length).toBeGreaterThan(0);
    const short = good.filter((g, i) => i !== good.findIndex(x => x.opp > 3 && x.opp <= 15));
    expect(nflDealProblems(ctx, short).length).toBeGreaterThan(0);
    /* 2026 is an even year: the NFC hosts, so Kansas City's 17th game is away. Turn it round. */
    const total = new Map<number, number>();
    for (const g of good) if (g.opp > 15) total.set(Math.floor((g.opp - 16) / 4), (total.get(Math.floor((g.opp - 16) / 4)) ?? 0) + 1);
    const lone = [...total].find(([, n]) => n === 1)![0];
    const flipped = good.map(g => (g.opp > 15 && Math.floor((g.opp - 16) / 4) === lone ? { ...g, home: !g.home } : g));
    expect(nflDealProblems(ctx, flipped).join(' ')).toContain('17th game');
  });
});

describe('a kicker and his makes', () => {
  it('lays out every total a list of scores can hold, each game a count its score can hold', () => {
    const rng = keyedRng('kick-scores');
    for (let round = 0; round < 40; round += 1) {
      const n = 1 + Math.floor(rng() * 17);
      const scores = Array.from({ length: n }, () => nflScore(0, rng() < 0.5, rng)[0]);
      const most = scores.reduce((a, us) => a + Math.max(...[0, 1, 2, 3, 4, 5, 6].filter(f => nflDriveCost(us, 0, f) !== null)), 0);
      const wrong: string[] = [];
      let laid = 0;
      for (let made = 0; made <= most + 2; made += 1) {
        const x = nflKickerMakes(scores, made, keyedRng(`kick|${round}|${made}`));
        if (!x) continue;
        laid += 1;
        if (x.reduce((a, b) => a + b, 0) !== made) wrong.push(`made ${made}: sums to ${x.reduce((a, b) => a + b, 0)}`);
        x.forEach((f, i) => { if (f > 6 || nflDriveCost(scores[i], 0, f) === null) wrong.push(`made ${made}: a score of ${scores[i]} with ${f}`); });
      }
      expect(wrong, `round ${round}`).toEqual([]);
      expect(laid, `round ${round}`).toBeGreaterThan(0);
      expect(nflKickerMakes(scores, most + 1, keyedRng('over'))).toBeNull();
      expect(nflKickerMakes(scores, 0, keyedRng('none'))).not.toBeNull();
    }
  });
  it('refuses a total no score can hold', () => {
    expect(nflKickerMakes([0, 0], 1, keyedRng('a'))).toBeNull();
    expect(nflKickerMakes([6], 3, keyedRng('b'))).toBeNull();
    expect(nflKickerMakes([6], 2, keyedRng('c'))).toEqual([2]);
    expect(nflKickerMakes([7, 10], 1, keyedRng('d'))).toEqual([0, 1]);
    expect(nflKickerMakes([], 0, keyedRng('e'))).toEqual([]);
    expect(nflKickerMakes([10], -1, keyedRng('f'))).toBeNull();
  });
});

const STAT_FIELDS = ['passYds', 'passTd', 'ints', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'tackles', 'sacks', 'picks', 'passDef', 'forcedFum', 'fgMade', 'fgAtt'];
const TD_OF: Record<string, string> = { 'td-pass': 'passTd', 'td-rush': 'rushTd', 'td-rec': 'recTd' };

describe('an NFL season, derived from its saved line', () => {
  it('lands every total of every position, game by game, with drives that make each score', () => {
    for (const pos of POSITIONS) for (const [team, games, teamResult] of [['KC', 17, 'Lost in the Divisional round'], ['DAL', 12, NFL_MISSED_PLAYOFFS], ['SEA', 17, 'WON THE SUPER BOWL']] as [string, number, string][]) {
      const scale = games / 17;
      const line = Object.fromEntries(Object.entries(LINES[pos]).map(([k, v]) => [k, k === 'longFg' ? v : k === 'sacks' ? Math.round((v as number) * scale * 10) / 10 : Math.round((v as number) * scale)]));
      const row = NFL_ROW(pos, { ...line, team, games, teamResult });
      const b = built(row, pos);
      const s = deriveSeason(b.sport, row, b.ctx)!;
      const label = `${pos} ${team} ${games}`;
      expect(s, label).not.toBeNull();
      expect(s.games, label).toHaveLength(17);
      const on = s.games.filter(g => g.played);
      expect(on, label).toHaveLength(games);
      for (const k of STAT_FIELDS) {
        if (typeof row[k] !== 'number') { expect(on.every(g => g.line[k] === undefined), `${label} ${k}`).toBe(true); continue; }
        expect(on.reduce((a, g) => a + Math.round((g.line[k] ?? 0) * 10), 0), `${label} ${k}`).toBe(Math.round((row[k] as number) * 10));
      }
      for (const g of s.games) {
        /* the drives make the score, each worth what its kind is worth, inside the sixty minutes */
        const us = g.events.filter(e => e.side === 'us').reduce((a, e) => a + (e.pts ?? 0), 0);
        const them = g.events.filter(e => e.side === 'them').reduce((a, e) => a + (e.pts ?? 0), 0);
        expect([us, them], `${label} game ${g.md}`).toEqual([g.us, g.them]);
        /* no two lines of one game share a minute, and the feed is in time order */
        expect(new Set(g.events.map(e => e.min)).size, `${label} game ${g.md}`).toBe(g.events.length);
        expect(g.events.every((e, i) => i === 0 || g.events[i - 1].min < e.min), `${label} game ${g.md}`).toBe(true);
        for (const e of g.events) {
          expect(e.min).toBeGreaterThanOrEqual(1); expect(e.min).toBeLessThanOrEqual(60);
          if (e.kind === 'td' || e.kind in TD_OF) expect([6, 7, 8]).toContain(e.pts);
          else if (e.kind === 'fg') expect(e.pts).toBe(3);
          else if (e.kind === 'safety') expect(e.pts).toBe(2);
          else expect(e.pts).toBeUndefined();
        }
        if (!g.played) { expect(g.events.some(e => e.mine), `${label} game ${g.md}`).toBe(false); expect(g.line).toEqual({}); continue; }
        for (const [kind, key] of Object.entries(TD_OF)) expect(g.events.filter(e => e.kind === kind).length, `${label} game ${g.md} ${kind}`).toBe(g.line[key] ?? 0);
        if (pos === 'K') {
          const fgs = g.events.filter(e => e.kind === 'fg' && e.side === 'us');
          expect(fgs.length, `${label} game ${g.md}`).toBe(g.line.fgMade);
          expect(fgs.every(e => e.mine)).toBe(true);
          expect(g.line.fgAtt).toBeGreaterThanOrEqual(g.line.fgMade);
          if (g.line.fgMade > 0) { expect(g.line.longFg).toBeLessThanOrEqual(56); expect(g.line.longFg).toBeGreaterThanOrEqual(19); } else expect(g.line.longFg).toBeUndefined();
        }
        if (g.line.rec !== undefined) { expect(g.line.rec).toBeGreaterThanOrEqual(g.line.recTd ?? 0); if (g.line.rec === 0) expect(g.line.recYds ?? 0).toBe(0); }
      }
      if (pos === 'K') expect(Math.max(...on.filter(g => g.line.fgMade > 0).map(g => g.line.longFg)), label).toBe(56);
      /* the record sits in the band this career gives the result, a tie is not a win */
      const wins = s.games.filter(g => g.us > g.them).length;
      const band = teamResult === NFL_MISSED_PLAYOFFS ? NFL_SEASON.bands[0] : NFL_SEASON.bands[NFL_PLAYOFF_RESULTS.indexOf(teamResult as (typeof NFL_PLAYOFF_RESULTS)[number]) + 1];
      expect(wins, label).toBeGreaterThanOrEqual(band[0]);
      expect(wins, label).toBeLessThanOrEqual(band[1]);
      /* named, his team in slot 0, and the same season from the same saved line */
      expect(s.labels[0]).toEqual({ name: teamLabelOf(team), named: true, key: team });
      expect(new Set(s.labels.map(l => l.name)).size).toBe(32);
      const again = JSON.parse(JSON.stringify(row)) as UsRow;
      const b2 = built(again, pos);
      expect(deriveSeason(b2.sport, again, b2.ctx), label).toEqual(s);
    }
  });
  it('holds every throwback year that was not 17 games, and never names a throwback opponent', () => {
    for (const year of [2005, 2012, 2020, 2022]) {
      const b = buildUsSeason(NFL_SEASON, career('QB', 'y2005'), NFL_ROW('QB', { year, team: 'OAK' }), teamLabelOf);
      expect(b.ok).toBe(false);
      if (b.ok === false) { expect(b.why).toBe('held'); expect(b.line).toBe(usSeasonHeldLine('nfl', year)); }
    }
    for (const year of [2021, 2023]) {
      const row = NFL_ROW('QB', { year, team: 'OAK' });
      const b = built(row, 'QB', 'y2005');
      expect(b.ctx.shape).toBeNull();
      const s = deriveSeason(b.sport, row, b.ctx)!;
      expect(s).not.toBeNull();
      expect(s.labels[0]).toEqual({ name: 'Oakland Raiders', named: true, key: 'OAK' });
      expect(s.labels.slice(1).every(l => !l.named && l.name === 'another team')).toBe(true);
      expect(new Set(s.games.map(g => g.opp)).size).toBe(17);
      expect([8, 9]).toContain(s.games.filter(g => g.home).length);
    }
    /* a present day id the 2005 list does not hold is still not named in a throwback season */
    expect(built(NFL_ROW('QB', { year: 2026, team: 'LV' }), 'QB', 'y2005').ctx.shape).toBeNull();
  });
  it('gives no view to a banned year, a season with no games, or a line whose numbers cannot be laid out', () => {
    for (const row of [NFL_ROW('QB', { games: 0, teamResult: 'SUSPENDED' }), NFL_ROW('QB', { games: 0 })]) {
      const b = buildUsSeason(NFL_SEASON, career('QB'), row, teamLabelOf);
      expect(b.ok).toBe(false);
      if (b.ok === false) expect(b.why).toBe('empty');
    }
    /* fail closed, never a guess: more touchdown catches than catches, a long with no make, yards below zero */
    const cannot: [string, Partial<UsRow>][] = [['WR', { rec: 3, recTd: 9 }], ['K', { fgMade: 0, fgAtt: 2, longFg: 51 }], ['RB', { rushYds: -4 }], ['K', { fgMade: 30, fgAtt: 29 }], ['LB', { sacks: 4.55 }]];
    for (const [pos, over] of cannot) {
      const row = NFL_ROW(pos, over);
      const b = built(row, pos);
      expect(deriveSeason(b.sport, row, b.ctx), `${pos} ${JSON.stringify(over)}`).toBeNull();
    }
    /* an older line that never held a stat still shows its games and scores */
    const bare = NFL_ROW('QB', { passYds: undefined, passTd: undefined, ints: undefined });
    const bb = built(bare, 'QB');
    expect(deriveSeason(bb.sport, bare, bb.ctx)).not.toBeNull();
  });
});

describe('the NFL playoff path', () => {
  it('is one game a round for every depth, won or lost as the save says, and prints no score the save does not hold', () => {
    const { ctx, key } = built(NFL_ROW('QB'));
    NFL_PLAYOFF_RESULTS.forEach((teamResult, i) => {
      const n = Math.min(4, i + 1);
      for (let seed = 0; seed < 25; seed += 1) {
        const path = usPlayoffPath(NFL_SEASON, NFL_ROW('QB', { teamResult, poGames: n }), ctx, `${key}|${seed}`)!;
        expect(path, teamResult).not.toBeNull();
        expect(path.steps.map(st => st.round)).toEqual(NFL_SEASON.rounds.slice(0, n));
        path.steps.forEach((st, r) => {
          expect(st.won, `${teamResult} round ${r + 1}`).toBe(r < n - 1 || i === 4);
          /* the save holds his playoff numbers as a sentence and no score: a drawn one could not be held
             to "2 of 3 on field goals" or "2 TD", so none is shown */
          expect(st.score, `${teamResult} round ${r + 1}`).toBeNull();
        });
      }
      /* playoff games on the save that are not the rounds the result means: nothing is drawn */
      expect(usPlayoffPath(NFL_SEASON, NFL_ROW('QB', { teamResult, poGames: n + 1 }), ctx, key)).toBeNull();
      /* an older line with no playoff games still shows the rounds */
      expect(usPlayoffPath(NFL_SEASON, NFL_ROW('QB', { teamResult, poGames: undefined }), ctx, key)!.steps).toHaveLength(n);
    });
  });
  it('meets his own conference before the Super Bowl, and the other conference only in it', () => {
    const shape = usLeagueShape('nfl', undefined, 2026)!;
    const confOf = (label: string) => shape.divisions.find(d => d.teams.some(id => teamLabelOf(id) === label))!.conf;
    let early = 0; let last = 0;
    for (const team of ['KC', 'DAL', 'SEA', 'BUF']) {
      const row = NFL_ROW('QB', { team, teamResult: 'WON THE SUPER BOWL', poGames: 4 });
      const { ctx, key } = built(row);
      const mine = shape.divisions.find(d => d.teams.includes(team))!.conf;
      for (let seed = 0; seed < 20; seed += 1) {
        const path = usPlayoffPath(NFL_SEASON, row, ctx, `${key}|${seed}`)!;
        expect(new Set(path.steps.map(st => st.opp)).size).toBe(4);
        path.steps.forEach((st, r) => {
          expect(st.opp).not.toBe(teamLabelOf(team));
          if (r === 3) { last += 1; expect(confOf(st.opp), `${team} Super Bowl`).not.toBe(mine); } else { early += 1; expect(confOf(st.opp), `${team} round ${r + 1}`).toBe(mine); }
        });
      }
    }
    expect([early, last]).toEqual([240, 80]);
  });
  it('has no path for a missed postseason or a result the engine never wrote', () => {
    const { ctx, key } = built(NFL_ROW('QB'));
    expect(usPlayoffPath(NFL_SEASON, NFL_ROW('QB', { teamResult: NFL_MISSED_PLAYOFFS, poGames: undefined }), ctx, key)).toBeNull();
    expect(usPlayoffPath(NFL_SEASON, NFL_ROW('QB', { teamResult: 'Lost Wild Card' }), ctx, key)).toBeNull();
    /* and that unknown result gets no record band either */
    const odd = NFL_ROW('QB', { teamResult: 'Lost Wild Card' });
    expect(built(odd).sport.target(odd, built(odd).ctx, built(odd).sport.frame(odd, built(odd).ctx))).toEqual({ kind: 'none' });
  });
});

describe('the NFL words', () => {
  const ev = (kind: string, side: 'us' | 'them', pts?: number, mine?: boolean): SeasonEvent => ({ min: 10, kind, side, ...(pts === undefined ? {} : { pts }), ...(mine ? { mine } : {}) });
  it('says every kind of drive, and a touchdown that is not a seven says why', () => {
    expect(nflEventWords(ev('td-pass', 'us', 7, true), 'Chiefs', 'Bills')).toBe('🏈 Touchdown! You throw it.');
    expect(nflEventWords(ev('td-rush', 'us', 6, true), 'Chiefs', 'Bills')).toBe('🏈 Touchdown! You run it in. The kick after is no good.');
    expect(nflEventWords(ev('td-rec', 'us', 8, true), 'Chiefs', 'Bills')).toBe('🏈 Touchdown! You catch it. The two point try is good.');
    expect(nflEventWords(ev('td', 'them', 7), 'Chiefs', 'Bills')).toBe('🏈 Touchdown, Bills.');
    expect(nflEventWords(ev('td', 'us', 7), 'Chiefs', 'Bills')).toBe('🏈 Touchdown, Chiefs.');
    expect(nflEventWords(ev('fg', 'them', 3), 'Chiefs', 'Bills')).toBe('🥅 Field goal, Bills.');
    expect(nflEventWords(ev('fg', 'us', 3, true), 'Chiefs', 'Bills')).toBe('🥅 Field goal! You hit it.');
    expect(nflEventWords(ev('safety', 'us', 2), 'Chiefs', 'Bills')).toBe('Safety, Chiefs.');
    for (const kind of ['miss', 'int', 'sack', 'pick', 'ff']) expect(nflEventWords(ev(kind, 'us', undefined, true), 'Chiefs', 'Bills').length).toBeGreaterThan(10);
    /* a kicker's line holds no extra points, so a six on his own side is never told as a kick of his that missed */
    expect(nflEventWords(ev('td', 'us', 6), 'Chiefs', 'Bills', true)).toBe('🏈 Touchdown, Chiefs. The two point try is no good.');
    expect(nflEventWords(ev('td', 'them', 6), 'Chiefs', 'Bills', true)).toBe('🏈 Touchdown, Bills. The kick after is no good.');
    expect(NFL_SEASON.view.eventWords(ev('td', 'us', 6), 'Chiefs', 'Bills', 'K')).not.toContain('kick after');
    expect(NFL_SEASON.view.eventWords(ev('td', 'us', 6), 'Chiefs', 'Bills', 'QB')).toContain('The kick after is no good.');
    /* every kind a season can hold has words: none prints an empty line */
    for (const pos of POSITIONS) {
      const row = NFL_ROW(pos);
      const b = built(row, pos);
      const s = deriveSeason(b.sport, row, b.ctx)!;
      for (const g of s.games) for (const e of g.events) expect(NFL_SEASON.view.eventWords(e, 'Chiefs', 'Bills', pos), `${pos} ${e.kind}`).not.toBe('');
    }
  });
  it('prints the headline once: the chip is the headline, the bits are the rest, no two bits alike', () => {
    const g = (line: Record<string, number>) => ({ line }) as unknown as DerivedGame;
    const v = NFL_SEASON.view;
    expect([v.markChip(g({ passYds: 286, passTd: 2, ints: 1 }), 'QB'), ...v.lineOf(g({ passYds: 286, passTd: 2, ints: 1 }), 'QB')]).toEqual(['286 YDS', '2 TD', '1 INT']);
    expect([v.markChip(g({ rushYds: 112, rushTd: 1, rec: 3, recYds: 24 }), 'RB'), ...v.lineOf(g({ rushYds: 112, rushTd: 1, rec: 3, recYds: 24 }), 'RB')]).toEqual(['112 YDS', '1 TD', '3-24 REC']);
    expect([v.markChip(g({ rec: 7, recYds: 104, recTd: 1 }), 'WR'), ...v.lineOf(g({ rec: 7, recYds: 104, recTd: 1 }), 'TE')]).toEqual(['104 YDS', '7 REC', '1 TD']);
    expect([v.markChip(g({ tackles: 9, sacks: 1.5, picks: 1, forcedFum: 0 }), 'LB'), ...v.lineOf(g({ tackles: 9, sacks: 1.5, picks: 1, forcedFum: 0 }), 'LB')]).toEqual(['9 TKL', '1.5 SCK', '1 INT']);
    expect(v.lineOf(g({ tackles: 4, picks: 0, passDef: 0, forcedFum: 0 }), 'CB')).toEqual([]);
    expect([v.markChip(g({ fgMade: 3, fgAtt: 4, longFg: 48 }), 'K'), ...v.lineOf(g({ fgMade: 3, fgAtt: 4, longFg: 48 }), 'K')]).toEqual(['3/4 FG', 'LONG 48']);
    expect(v.lineOf(g({ fgMade: 0, fgAtt: 1 }), 'K')).toEqual([]);
    for (const pos of POSITIONS) {
      const row = NFL_ROW(pos);
      const b = built(row, pos);
      for (const game of deriveSeason(b.sport, row, b.ctx)!.games.filter(x => x.played)) {
        const bits = v.lineOf(game, pos);
        expect(new Set(bits).size, `${pos} game ${game.md}`).toBe(bits.length);
        expect(v.markText(game, pos).length).toBeGreaterThan(5);
        expect(Number.isFinite(v.markOf(game, pos))).toBe(true);
      }
    }
  });
  it('never prints the sum of a per game long, and says an empty first half plainly', () => {
    const v = NFL_SEASON.view;
    const so = { apps: 8, fgMade: 14, fgAtt: 16, longFg: 391 };
    expect(v.soFar(so, 'K')).toEqual([['Played', '8'], ['FG made', '14'], ['FG tries', '16'], ['FG %', '88%']]);
    expect(JSON.stringify([v.soFar(so, 'K'), v.half(so, 'K')])).not.toContain('391');
    expect(v.half(so, 'K')).toBe('First half: 8 games, 14 of 16 on field goals');
    expect(v.half({ apps: 0 }, 'QB')).toBe('First half: you did not play a game.');
    expect(v.half({ apps: 8, passYds: 2104, passTd: 15 }, 'QB')).toBe('First half: 8 games, 2,104 passing yards and 15 touchdowns');
    expect(v.half({ apps: 1, rec: 1, recYds: 1 }, 'WR')).toBe('First half: 1 game, 1 catch for 1 yard');
    expect(v.soFar({ apps: 8, sacks: 6.500000000000001, tackles: 22, forcedFum: 1 }, 'EDGE')).toEqual([['Played', '8'], ['Sacks', '6.5'], ['Tackles', '22'], ['FF', '1']]);
    for (const pos of POSITIONS) expect(v.soFar({ apps: 3 }, pos)).toHaveLength(4);
    expect(v.missed('rested')).toBe('Did not play');
  });
  it('prints no zero for a number the saved line does not hold (an older line): a dash, "Played", or nothing', () => {
    const v = NFL_SEASON.view;
    const bare = { line: {} } as unknown as DerivedGame;
    for (const pos of POSITIONS) {
      expect(v.markChip(bare, pos), pos).toBe('Played');
      expect(v.lineOf(bare, pos), pos).toEqual([]);
      expect(v.markText(bare, pos), pos).toBe('no line on the save for this game');
      expect(v.soFar({ apps: 2 }, pos).slice(1).every(([, value]) => value === '-'), pos).toBe(true);
      expect(v.half({ apps: 2 }, pos), pos).toBe('First half: 2 games.');
    }
    /* a line that holds part of it prints that part */
    expect(v.lineOf({ line: { rushYds: 80, rushTd: 1, rec: 2 } } as unknown as DerivedGame, 'RB')).toEqual(['1 TD', '2 REC']);
    expect(v.markChip({ line: { fgMade: 2 } } as unknown as DerivedGame, 'K')).toBe('2 FG');
    expect(v.half({ apps: 2, passYds: 400 }, 'QB')).toBe('First half: 2 games, 400 passing yards');
    /* and the derived season of such a line carries none of those keys */
    const row = NFL_ROW('QB', { passYds: undefined, passTd: undefined, ints: undefined });
    const b = built(row, 'QB');
    for (const g of deriveSeason(b.sport, row, b.ctx)!.games.filter(x => x.played)) expect(v.markChip(g, 'QB')).toBe('Played');
  });
  it('reads the record bands off the bind in the "?", names a team that is not his, and nobody when unnamed', () => {
    const named = NFL_SEASON.view.help(true, 'Denver Broncos');
    expect(named.examples[0].body).toContain('away to the Denver Broncos.');
    expect(named.intro.join(' ')).toContain('a champion wins 11 to 15 of 17 and a team that missed the playoffs 2 to 9');
    const unnamed = NFL_SEASON.view.help(false);
    expect(unnamed.examples[0].body).toContain('away to another team.');
    expect(JSON.stringify(unnamed)).not.toMatch(/Chiefs|Broncos/);
    expect(named.examples.map(x => x.head)).toEqual(['A game', 'Your totals', 'The scoreboard', 'A level game']);
  });
});

describe('his touchdown days', () => {
  it('is a permutation that only puts a line in a game whose score holds its touchdowns, and leans his big days to the big scores', () => {
    const rng = keyedRng('td-days');
    let topScore = 0; let meanScore = 0; let rounds = 0;
    for (let round = 0; round < 300; round += 1) {
      const n = 4 + Math.floor(rng() * 14);
      const tds = Array.from({ length: n }, () => Math.floor(rng() * rng() * 6));
      /* as the core lays a season out: every game holds its own line's touchdowns */
      const scores = tds.map(k => Math.max(7 * k, nflScore(0, rng() < 0.5, rng)[0]));
      const take = nflTouchdownDays(scores, tds, keyedRng(`days|${round}`));
      expect([...take].sort((a, b) => a - b), `round ${round}`).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(take.filter((line, game) => 7 * tds[line] > scores[game]), `round ${round}`).toEqual([]);
      const top = tds.indexOf(Math.max(...tds));
      if (tds[top] === 0) continue;
      rounds += 1;
      topScore += scores[take.indexOf(top)];
      meanScore += scores.reduce((a, b) => a + b, 0) / n;
    }
    expect(rounds).toBeGreaterThan(200);
    /* the game that takes his best touchdown line scores clearly more than his team's average game */
    expect(topScore / rounds).toBeGreaterThan(meanScore / rounds + 3);
  });
  it('keeps the lay out it was given when nothing else fits, and draws the same days from the same key', () => {
    expect(nflTouchdownDays([7, 14, 21], [1, 2, 3], keyedRng('tight'))).toEqual([0, 1, 2]);
    /* no game holds his touchdown: the lay out it was handed stands */
    expect(nflTouchdownDays([0, 0], [1, 0], keyedRng('none'))).toEqual([0, 1]);
    expect(nflTouchdownDays([31, 10, 24, 17], [0, 1, 3, 2], keyedRng('k'))).toEqual(nflTouchdownDays([31, 10, 24, 17], [0, 1, 3, 2], keyedRng('k')));
    expect(nflTouchdownDays([], [], keyedRng('e'))).toEqual([]);
  });
});

/* ───────────────────────── the fix pass: order, his line, the feed, the ledger ───────────────────────── */

/** One keyed season of a position's everyday line; `i` varies the key through the career's name. */
const seasonOf = (pos: string, i: number) => {
  const row = NFL_ROW(pos);
  const b = buildUsSeason(NFL_SEASON, { name: `Rex Gridiron ${i}`, pos, eraId: undefined }, row, teamLabelOf);
  if (b.ok === false) throw new Error(`usSeasonNfl.test: ${b.why}`);
  const s = deriveSeason(b.sport, row, b.ctx);
  if (!s) throw new Error(`usSeasonNfl.test: ${pos} ${i} has no season`);
  return s;
};

describe('his line, game by game', () => {
  /* the per game caps of the numbers `finish` lays out, and each position's headline number */
  const CAPS: Record<string, number> = { passYds: 520, rushYds: 290, rec: 15, recYds: 330, tackles: 20 };
  const HEAD: Record<string, string> = { QB: 'passYds', RB: 'rushYds', WR: 'rec', TE: 'rec', LB: 'tackles', CB: 'tackles', EDGE: 'tackles' };
  /* MEASURED 2026-10-09 over 60 keyed seasons a position (1,020 games each): on a cap 0, 0, 1, 0, 0, 0, 0
     games; above twice his season's average 0.00, 0.00, 0.49, 1.27, 0.00, 0.10, 0.10 %; the standard
     deviation of his games over their mean 0.28, 0.33, 0.42, 0.45, 0.33, 0.42, 0.45. Before the fix pass
     a receiver sat on the cap of 15 catches in 4.6% of his games and a quarterback on 520 yards in 2.9%. */
  it('keeps an everyday season off the per game caps and near his average, while his games still differ', () => {
    for (const pos of Object.keys(HEAD)) {
      const key = HEAD[pos];
      let games = 0; let onCap = 0; let doubles = 0; let spread = 0; let seasons = 0;
      for (let i = 0; i < 40; i += 1) {
        const on = seasonOf(pos, i).games.filter(x => x.played);
        const xs = on.map(x => x.line[key]);
        const mean = xs.reduce((a, v) => a + v, 0) / xs.length;
        games += xs.length; seasons += 1;
        spread += Math.sqrt(xs.reduce((a, v) => a + (v - mean) ** 2, 0) / xs.length) / mean;
        onCap += on.reduce((a, x) => a + Object.keys(CAPS).filter(k => x.line[k] === CAPS[k]).length, 0);
        doubles += xs.filter(v => v > 2 * mean).length;
      }
      expect(games, pos).toBe(680);
      expect(onCap / games, `${pos}: games on a per game cap`).toBeLessThan(0.005);
      expect(doubles / games, `${pos}: games above twice his season's average`).toBeLessThan(0.03);
      /* not lumpy, and not seventeen copies of his average either */
      expect(spread / seasons, `${pos}: spread`).toBeGreaterThan(0.2);
      expect(spread / seasons, `${pos}: spread`).toBeLessThan(0.6);
    }
  });
  it('lays out his tackles exactly, and a game he scored in holds at least a yard a touchdown', () => {
    for (let i = 0; i < 10; i += 1) {
      for (const pos of ['LB', 'CB', 'EDGE']) {
        const on = seasonOf(pos, i).games.filter(x => x.played);
        expect(on.reduce((a, x) => a + x.line.tackles, 0), `${pos} ${i}`).toBe(LINES[pos].tackles);
        expect(on.every(x => Number.isInteger(x.line.tackles) && x.line.tackles >= 0 && x.line.tackles <= 20), `${pos} ${i}`).toBe(true);
      }
      for (const [pos, yds, td] of [['QB', 'passYds', 'passTd'], ['RB', 'rushYds', 'rushTd'], ['WR', 'recYds', 'recTd']]) {
        for (const x of seasonOf(pos, i).games.filter(y => y.played)) expect(x.line[yds], `${pos} ${i} game ${x.md}`).toBeGreaterThanOrEqual(x.line[td] ?? 0);
      }
    }
  });
});

describe('the feed, minute by minute', () => {
  /* MEASURED 2026-10-09 over 480 keyed seasons (8,160 games, 1 to 22 lines a game): no game of up to 19
     lines had two lines in back to back minutes or two scoring drives of one side under three minutes
     apart; the one game of 22 lines had both, which is the fallback the hour leaves no room to avoid. */
  it('never puts two lines in back to back minutes, or two scoring drives of one side under three minutes apart, where the hour has room', () => {
    let roomy = 0; let pairs = 0;
    for (const pos of POSITIONS) for (let i = 0; i < 12; i += 1) {
      for (const game of seasonOf(pos, i).games) {
        const ev = game.events;
        if (ev.length > 14) continue;
        roomy += 1;
        ev.forEach((e, k) => { if (k > 0) expect(e.min - ev[k - 1].min, `${pos} ${i} game ${game.md}`).toBeGreaterThanOrEqual(2); });
        for (const side of ['us', 'them']) {
          const drives = ev.filter(e => e.side === side && (e.pts ?? 0) > 0).map(e => e.min);
          drives.forEach((m, k) => { if (k > 0) { pairs += 1; expect(m - drives[k - 1], `${pos} ${i} game ${game.md} ${side}`).toBeGreaterThanOrEqual(3); } });
        }
      }
    }
    /* nearly every game has room, and plenty of them hold a side's drives one after another */
    expect(roomy).toBeGreaterThan(1500);
    expect(pairs).toBeGreaterThan(3000);
  });
});

describe('the order of the games', () => {
  const g = (slot: number, home: boolean): [number, boolean] => [slot, home];
  it('counts what reads oddly: the same opponent twice running, and every game past the third in a row at home or away', () => {
    expect(nflOrderProblems([])).toBe(0);
    expect(nflOrderProblems([g(1, true), g(2, false), g(3, true)])).toBe(0);
    expect(nflOrderProblems([g(1, true), g(1, false)])).toBe(1);
    /* three in a row is fine, the fourth is one too many, the fifth two */
    expect(nflOrderProblems([g(1, true), g(2, true), g(3, true), g(4, false)])).toBe(0);
    expect(nflOrderProblems([g(1, true), g(2, true), g(3, true), g(4, true)])).toBe(1);
    expect(nflOrderProblems([g(1, false), g(2, false), g(3, false), g(4, false), g(5, false)])).toBe(2);
    expect(nflOrderProblems([g(1, true), g(2, true), g(3, true), g(3, true)])).toBe(2);
    /* a run that is broken starts again */
    expect(nflOrderProblems([g(1, true), g(2, true), g(3, true), g(4, false), g(5, true), g(6, true), g(7, true)])).toBe(0);
  });
  it('deals no team a rival twice running or four straight at home or away, whoever he plays for', () => {
    let seasons = 0;
    const odd: string[] = [];
    for (const team of NOW_IDS) for (let seed = 0; seed < 10; seed += 1) {
      const { ctx } = built(NFL_ROW('QB', { team }));
      const games = asGames(nflDeal(ctx, keyedRng(`order|${team}|${seed}`)));
      seasons += 1;
      /* the test's own reading, never the module's counter */
      let run = 1;
      for (let i = 1; i < games.length; i += 1) {
        if (games[i].opp === games[i - 1].opp) odd.push(`${team} ${seed}: slot ${games[i].opp} in games ${i} and ${i + 1}`);
        run = games[i].home === games[i - 1].home ? run + 1 : 1;
        if (run > 3) odd.push(`${team} ${seed}: ${run} straight ${games[i].home ? 'at home' : 'away'} by game ${i + 1}`);
      }
      /* and the order is still the formula's 17 games */
      expect(nflDealProblems(ctx, games), `${team} ${seed}`).toEqual([]);
    }
    expect(seasons).toBe(320);
    expect(odd).toEqual([]);
  });
  it('orders a throwback season with no names the same way, and leaves the NBA\'s unnamed deal as it was', () => {
    const odd: string[] = [];
    const homes = new Set<number>();
    for (let seed = 0; seed < 200; seed += 1) {
      const games = asGames(nflDealUnnamed(17, keyedRng(`unnamed|${seed}`)));
      expect(games).toHaveLength(17);
      expect(new Set(games.map(x => x.opp)).size, `seed ${seed}`).toBe(17);
      homes.add(games.filter(x => x.home).length);
      let run = 1;
      for (let i = 1; i < games.length; i += 1) {
        run = games[i].home === games[i - 1].home ? run + 1 : 1;
        if (run > 3) odd.push(`seed ${seed}: ${run} straight by game ${i + 1}`);
      }
    }
    expect(odd).toEqual([]);
    expect([...homes].sort()).toEqual([8, 9]);
    expect(NFL_SEASON.dealUnnamed).toBe(nflDealUnnamed);
    expect(NBA_SEASON.dealUnnamed).toBeUndefined();
  });
});

describe('the tiles above the record, position by position', () => {
  /* every field holds a number no other field holds, so two fields changing places cannot pass */
  const so = { apps: 9, passYds: 2104, passTd: 15, ints: 6, rushYds: 611, rushTd: 4, rec: 33, recYds: 402, recTd: 3, tackles: 71, sacks: 5.5, picks: 2, passDef: 8, forcedFum: 1, fgMade: 14, fgAtt: 16 };
  it('prints each position its own three numbers, every one from its own field', () => {
    const v = NFL_SEASON.view;
    expect(new Set(Object.values(so)).size).toBe(Object.values(so).length);
    expect(v.soFar(so, 'QB')).toEqual([['Played', '9'], ['Pass yds', '2,104'], ['TD', '15'], ['INT', '6']]);
    expect(v.soFar(so, 'RB')).toEqual([['Played', '9'], ['Rush yds', '611'], ['Rush TD', '4'], ['Rec', '33']]);
    expect(v.soFar(so, 'WR')).toEqual([['Played', '9'], ['Rec', '33'], ['Rec yds', '402'], ['TD', '3']]);
    expect(v.soFar(so, 'TE')).toEqual(v.soFar(so, 'WR'));
    expect(v.soFar(so, 'LB')).toEqual([['Played', '9'], ['Tackles', '71'], ['Sacks', '5.5'], ['INT', '2']]);
    expect(v.soFar(so, 'CB')).toEqual([['Played', '9'], ['Tackles', '71'], ['INT', '2'], ['PD', '8']]);
    expect(v.soFar(so, 'EDGE')).toEqual([['Played', '9'], ['Sacks', '5.5'], ['Tackles', '71'], ['FF', '1']]);
    expect(v.soFar(so, 'K')).toEqual([['Played', '9'], ['FG made', '14'], ['FG tries', '16'], ['FG %', '88%']]);
  });
  it('says the first half in each position\'s own numbers', () => {
    const v = NFL_SEASON.view;
    expect(v.half(so, 'QB')).toBe('First half: 9 games, 2,104 passing yards and 15 touchdowns');
    expect(v.half(so, 'RB')).toBe('First half: 9 games, 611 rushing yards and 4 touchdowns');
    expect(v.half(so, 'WR')).toBe('First half: 9 games, 33 catches for 402 yards');
    expect(v.half(so, 'TE')).toBe(v.half(so, 'WR'));
    for (const pos of ['LB', 'CB', 'EDGE']) expect(v.half(so, pos), pos).toBe('First half: 9 games, 71 tackles and 5.5 sacks');
    expect(v.half(so, 'K')).toBe('First half: 9 games, 14 of 16 on field goals');
  });
});

describe('what the ledger holds and the number file reads', () => {
  it('scores a drive with the ledger\'s values: a touchdown is 6, 7 with the kick, 8 with the try, a field goal 3, a safety 2', () => {
    expect(NFL_SCORING).toEqual({ touchdown: 6, kickAfter: 1, twoPointTry: 2, fieldGoal: 3, safety: 2 });
    const one = (points: number, minTd: number) => nflDrives(points, minTd, null, keyedRng(`worth|${points}`))!;
    expect(one(NFL_SCORING.touchdown, 1)).toEqual({ tds: [6], fgs: 0, safeties: 0 });
    expect(one(NFL_SCORING.touchdown + NFL_SCORING.kickAfter, 1)).toEqual({ tds: [7], fgs: 0, safeties: 0 });
    expect(one(NFL_SCORING.touchdown + NFL_SCORING.twoPointTry, 1)).toEqual({ tds: [8], fgs: 0, safeties: 0 });
    expect(one(NFL_SCORING.fieldGoal, 0)).toEqual({ tds: [], fgs: 1, safeties: 0 });
    expect(one(NFL_SCORING.safety, 0)).toEqual({ tds: [], fgs: 0, safeties: 1 });
    /* and the "?" says the same five numbers, a six as a failed try (a kick or a two point try) */
    const board = NFL_SEASON.view.help(true, 'Denver Broncos').examples.find(x => x.head === 'The scoreboard')!.body;
    expect(board).toContain('7 for a touchdown with the kick after it, 8 with a two point try, 6 when the try after it fails, 3 for a field goal and 2 for a safety.');
    expect(board).not.toContain('kick misses');
  });
  it('runs the clock the ledger holds: four quarters of 15 minutes', () => {
    expect(NFL_CLOCK).toEqual({ quarters: 4, minutes: 15 });
    expect(NFL_SEASON.view.clock.length).toBe(NFL_CLOCK.quarters * NFL_CLOCK.minutes);
    expect(nflClockLabel(NFL_CLOCK.minutes)).toBe('Q1 0:00');
    expect(nflClockLabel(NFL_CLOCK.quarters * NFL_CLOCK.minutes)).toBe('Q4 0:00');
  });
  it('draws the playoff path on the ledger\'s format, for both sports', () => {
    expect(US_PLAYOFF_FORMAT.nfl).toEqual({ rounds: ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'], series: null });
    expect(NFL_SEASON.rounds).toBe(US_PLAYOFF_FORMAT.nfl.rounds);
    expect(NFL_SEASON.series).toBeNull();
    expect(US_PLAYOFF_FORMAT.nba.series).toEqual([[4, 7], [4, 7], [4, 7], [4, 7]]);
    expect(NBA_SEASON.rounds).toBe(US_PLAYOFF_FORMAT.nba.rounds);
    expect(NBA_SEASON.series).toBe(US_PLAYOFF_FORMAT.nba.series);
    /* the engine's five results are a loss in each of the four rounds and the title */
    expect(NFL_PLAYOFF_RESULTS).toHaveLength(US_PLAYOFF_FORMAT.nfl.rounds.length + 1);
  });
  it('says football\'s own words in the "?": games, not nights, and what the playoff path leaves out', () => {
    const nfl = NFL_SEASON.view.help(true, 'Denver Broncos');
    expect(nfl.intro.join(' ')).toContain('Who you meet in which game, every score and every stat line');
    expect(JSON.stringify(nfl)).not.toContain('night');
    expect(nfl.footnote).toContain('Every playoff run here starts at the Wild Card round: this career has no first round bye');
    expect(nfl.footnote).toContain('with no score');
    /* the NBA keeps its own words and gains none of football's */
    const nba = NBA_SEASON.view.help(true, 'Denver Nuggets');
    expect(nba.intro.join(' ')).toContain('Who you meet on which night, every score and every stat line');
    expect(nba.footnote).not.toContain('Wild Card');
    expect(nba.footnote.endsWith("this career's own world on today's format.")).toBe(true);
  });
});

