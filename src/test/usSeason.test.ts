/* Round 1048: the US Season Center's pure parts. The two ledgers first
   (src/data/usSeasonLengths.ts, src/data/usLeagueShape.ts), then the binding
   (src/lib/season/us.ts) and the two number files as each lands. */
import { describe, expect, it } from 'vitest';
import {
  US_FULL_SEASON, US_LENGTHS_VERIFIED_TO, US_SEASON_LENGTHS, usSeasonHeldLine, usSeasonLabel, usSeasonLength,
  type UsLengthSport,
} from '@/data/usSeasonLengths';
import { NBA_SCORING, US_LEAGUE_SHAPES, nflHosts17, usLeagueShape } from '@/data/usLeagueShape';
import { keyedRng } from '@/lib/keyedRng';
import { buildUsSeason, dealUnnamed, splitTotal, usBandOf, usPlayoffPath, type UsRow } from '@/lib/season/us';
import { deriveSeason, type DerivedGame } from '@/lib/season/core';
import { NBA_SEASON, nbaDeal, nbaDealProblems } from '@/lib/season/nba';
import { NBA_MISSED_PLAYOFFS, NBA_PLAYOFF_RESULTS, nbaEraTeamIds, nbaTeamLabelOf } from '@/lib/nbaMyCareer';

const SPORTS: UsLengthSport[] = ['nba', 'nfl'];

describe('the season length ledger', () => {
  it('has windows in order that never overlap or leave a gap, the last one open', () => {
    for (const sport of SPORTS) {
      const ws = US_SEASON_LENGTHS[sport];
      expect(ws.length).toBeGreaterThan(1);
      ws.forEach((w, i) => {
        if (i < ws.length - 1) {
          expect(w.to, `${sport} window ${i} is closed`).not.toBeNull();
          expect(w.to!).toBeGreaterThanOrEqual(w.from);
          expect(ws[i + 1].from).toBe(w.to! + 1);
        } else expect(w.to).toBeNull();
        if (w.games === null) expect(typeof w.why).toBe('string');
      });
      expect(ws[ws.length - 1].games).toBe(US_FULL_SEASON[sport]);
      expect(ws[ws.length - 1].from).toBeLessThanOrEqual(US_LENGTHS_VERIFIED_TO[sport]);
    }
  });
  it('holds a year exactly when its real length is not the one the career plays', () => {
    for (const sport of SPORTS) {
      let held = 0; let open = 0;
      for (let year = 1990; year <= 2060; year += 1) {
        const line = usSeasonHeldLine(sport, year);
        const full = usSeasonLength(sport, year) === US_FULL_SEASON[sport];
        expect(line === null, `${sport} ${year}`).toBe(full);
        if (line === null) open += 1; else { held += 1; expect(line.startsWith('📺 ')).toBe(true); expect(line).toContain(usSeasonLabel(sport, year)); }
      }
      expect(held).toBeGreaterThan(0);
      expect(open).toBeGreaterThan(0);
    }
  });
  it('says each kind of held year in its own words', () => {
    expect(usSeasonHeldLine('nfl', 2005)).toBe('📺 Week by week starts with the 2021 season: the real 2005 season had 16 games and this career plays 17.');
    expect(usSeasonHeldLine('nfl', 2020)).toContain('starts with the 2021 season');
    expect(usSeasonHeldLine('nfl', 2021)).toBeNull();
    expect(usSeasonHeldLine('nba', 2011)).toBe('📺 No week by week this season: the real 2011-12 season had 66 games and this career plays 82.');
    expect(usSeasonHeldLine('nba', 2019)).toBe('📺 No week by week this season: the real 2019-20 season was cut short and teams finished on different numbers of games.');
    expect(usSeasonHeldLine('nba', 2012)).toContain('2012-13');
    expect(usSeasonHeldLine('nba', 2020)).toContain('72 games');
    expect(usSeasonHeldLine('nba', 2003)).toBeNull();
    expect(usSeasonHeldLine('nba', 2026)).toBeNull();
    expect(usSeasonHeldLine('nba', 1999)).toContain('no verified length');
    expect(usSeasonLabel('nba', 1999)).toBe('1999-00');
    expect(usSeasonLabel('nba', 2009)).toBe('2009-10');
  });
});

describe('the league shape ledger', () => {
  it('has whole divisions, no team twice, and two conferences of equal size', () => {
    const want = { nba: { divisions: 6, per: 5 }, nfl: { divisions: 8, per: 4 } } as const;
    for (const w of US_LEAGUE_SHAPES) {
      const n = want[w.sport];
      expect(w.shape.divisions).toHaveLength(n.divisions);
      for (const d of w.shape.divisions) expect(d.teams, `${w.sport} ${d.name}`).toHaveLength(n.per);
      const ids = w.shape.divisions.flatMap(d => d.teams);
      expect(new Set(ids).size).toBe(ids.length);
      const confs = [...new Set(w.shape.divisions.map(d => d.conf))];
      expect(confs).toHaveLength(2);
      for (const c of confs) expect(w.shape.divisions.filter(d => d.conf === c)).toHaveLength(n.divisions / 2);
      expect(new Set(w.shape.divisions.map(d => d.name)).size).toBe(n.divisions);
    }
  });
  it('never has two windows for one sport, era and year', () => {
    for (const a of US_LEAGUE_SHAPES) for (const b of US_LEAGUE_SHAPES) {
      if (a === b || a.sport !== b.sport || a.era !== b.era) continue;
      const aTo = a.to ?? Infinity; const bTo = b.to ?? Infinity;
      expect(a.from > bTo || b.from > aTo).toBe(true);
    }
  });
  it('answers only for the era and the years it holds', () => {
    expect(usLeagueShape('nba', 'now', 2026)?.formula.kind).toBe('nba82');
    expect(usLeagueShape('nba', undefined, 2031)?.formula.kind).toBe('nba82');
    expect(usLeagueShape('nfl', 'now', 2026)?.formula.kind).toBe('nfl17');
    expect(usLeagueShape('nba', 'y2004', 2003)).toBeNull();
    expect(usLeagueShape('nba', 'y2004', 2026)).toBeNull();
    expect(usLeagueShape('nfl', 'y2005', 2021)).toBeNull();
    expect(usLeagueShape('nba', 'now', 2024)).toBeNull();
    expect(usLeagueShape('mlb', 'now', 2026)).toBeNull();
  });
  it('knows who hosts the 17th game only where two sources say so', () => {
    for (let y = 2021; y <= 2028; y += 1) {
      expect(nflHosts17(y, 'AFC')).toBe(y % 2 === 1);
      expect(nflHosts17(y, 'NFC')).toBe(y % 2 === 0);
    }
    expect(nflHosts17(2020, 'AFC')).toBeNull();
    expect(nflHosts17(2029, 'NFC')).toBeNull();
    expect(nflHosts17(2026, 'East')).toBeNull();
  });
  it('holds a scoring mean for both NBA eras', () => {
    expect(NBA_SCORING.now).toBeGreaterThan(NBA_SCORING.y2004);
    expect(NBA_SCORING.y2004).toBeGreaterThan(80);
    expect(NBA_SCORING.now).toBeLessThan(130);
  });
});

/* ───────────────────────── src/lib/season/us.ts ───────────────────────── */

describe('splitTotal', () => {
  const rng = keyedRng('split');
  it('always sums to the total with every cap and minimum held', () => {
    let done = 0;
    for (let n = 1; n <= 17; n += 1) {
      for (let trial = 0; trial < 40; trial += 1) {
        const weights = Array.from({ length: n }, () => (rng() < 0.2 ? 0 : rng() * 3));
        const caps = Array.from({ length: n }, () => Math.floor(rng() * 9));
        const mins = caps.map(c => Math.floor(rng() * (c + 1) * 0.4));
        const lo = mins.reduce((a, b) => a + b, 0);
        const hi = caps.reduce((a, b) => a + b, 0);
        for (const total of [lo, hi, lo + Math.floor((hi - lo) / 2), lo + Math.floor((hi - lo) * rng())]) {
          const x = splitTotal(total, weights, caps, mins)!;
          expect(x, `n ${n} total ${total}`).not.toBeNull();
          expect(x.reduce((a, b) => a + b, 0)).toBe(total);
          x.forEach((v, i) => { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(mins[i]); expect(v).toBeLessThanOrEqual(caps[i]); });
          done += 1;
        }
      }
    }
    expect(done).toBeGreaterThan(2000);
  });
  it('gives null when the caps or the minimums cannot hold the total', () => {
    expect(splitTotal(10, [1, 1], [4, 5])).toBeNull();
    expect(splitTotal(3, [1, 1], [4, 5], [2, 2])).toBeNull();
    expect(splitTotal(3, [1, 1], [1, 5], [2, 0])).toBeNull();
    expect(splitTotal(-1, [1], [5])).toBeNull();
    expect(splitTotal(2.5, [1], [5])).toBeNull();
    expect(splitTotal(0, [], [])).toEqual([]);
    expect(splitTotal(1, [], [])).toBeNull();
  });
  it('follows the weights, and a zero weight only gets what is forced', () => {
    expect(splitTotal(10, [1, 1], [10, 10])).toEqual([5, 5]);
    expect(splitTotal(9, [2, 1], [10, 10])).toEqual([6, 3]);
    expect(splitTotal(6, [1, 0, 1], [3, 9, 3])).toEqual([3, 0, 3]);
    expect(splitTotal(7, [1, 0, 1], [3, 9, 3])).toEqual([3, 1, 3]);
  });
});

describe('dealUnnamed', () => {
  it('meets every opponent once, one game a round, home and away split evenly', () => {
    for (const games of [82, 17, 16, 1]) {
      for (let seed = 0; seed < 30; seed += 1) {
        const rounds = dealUnnamed(games, keyedRng(`un|${games}|${seed}`));
        expect(rounds).toHaveLength(games);
        expect(rounds.every(r => r.length === 1 && (r[0][0] === 0) !== (r[0][1] === 0))).toBe(true);
        const opps = rounds.map(r => (r[0][0] === 0 ? r[0][1] : r[0][0]));
        expect([...opps].sort((a, b) => a - b)).toEqual(Array.from({ length: games }, (_, i) => i + 1));
        const home = rounds.filter(r => r[0][0] === 0).length;
        expect(Math.abs(2 * home - games)).toBeLessThanOrEqual(1);
      }
    }
  });
  it('keys the side of the odd game, so both eight and nine home games happen', () => {
    const homes = new Set<number>();
    for (let seed = 0; seed < 40; seed += 1) homes.add(dealUnnamed(17, keyedRng(`odd|${seed}`)).filter(r => r[0][0] === 0).length);
    expect([...homes].sort()).toEqual([8, 9]);
  });
});

/* ───────────────────────── src/lib/season/nba.ts ───────────────────────── */

const NBA_ROW = (over: Partial<UsRow> = {}): UsRow => ({
  year: 2026, team: 'DEN', age: 24, ovr: 84, games: 80, ppg: 25, rpg: 6.4, apg: 5.1,
  awards: [], teamResult: 'Lost in the conference semis', salary: 20, poGames: 11, poPpg: 26, poRpg: 6.1, poApg: 5,
  ...over,
} as UsRow);
const NBA_CAREER = { name: 'Trey Buckets', pos: 'SG', eraId: undefined as string | undefined };
const built = (row: UsRow, career = NBA_CAREER) => {
  const b = buildUsSeason(NBA_SEASON, career, row, nbaTeamLabelOf);
  if (b.ok === false) throw new Error(`usSeason.test: ${b.why}`);
  return b;
};
const asGames = (rounds: [number, number][][]) =>
  rounds.map((r, i) => ({ md: i + 1, opp: r[0][0] === 0 ? r[0][1] : r[0][0], home: r[0][0] === 0 })) as unknown as DerivedGame[];

describe('the NBA schedule formula, dealt for every team', () => {
  it('meets every kind of opponent as often as the formula says, 41 at home, whoever he plays for', () => {
    const ids = nbaEraTeamIds('now');
    expect(ids).toHaveLength(30);
    for (const team of ids) {
      const { ctx } = built(NBA_ROW({ team }));
      expect(ctx.order[0]).toBe(team);
      expect([...ctx.order].sort()).toEqual([...ids].sort());
      expect([ctx.divSlots, ctx.confSlots]).toEqual([4, 14]);
      for (let seed = 0; seed < 6; seed += 1) {
        const rounds = nbaDeal(ctx, keyedRng(`deal|${team}|${seed}`));
        expect(rounds).toHaveLength(82);
        expect(rounds.every(r => r.length === 1 && (r[0][0] === 0) !== (r[0][1] === 0))).toBe(true);
        expect(nbaDealProblems(ctx, asGames(rounds)), `${team} seed ${seed}`).toEqual([]);
      }
    }
  });
  it('is caught when a division rival is met three times', () => {
    const { ctx } = built(NBA_ROW());
    const games = asGames(nbaDeal(ctx, keyedRng('broken')));
    games.splice(games.findIndex(g => g.opp === 1), 1);
    expect(nbaDealProblems(ctx, games).length).toBeGreaterThan(0);
  });
});

describe('an NBA season, derived from its saved line', () => {
  it('lands the games played, the averages, the band and the names', () => {
    const row = NBA_ROW();
    const b = built(row);
    const s = deriveSeason(b.sport, row, b.ctx)!;
    expect(s).not.toBeNull();
    expect(s.games).toHaveLength(82);
    const on = s.games.filter(g => g.played);
    expect(on).toHaveLength(80);
    const mean = (k: string) => on.reduce((a, g) => a + g.line[k], 0) / on.length;
    expect(Math.round(mean('pts'))).toBe(25);
    expect(Math.round(mean('reb') * 10)).toBe(64);
    expect(Math.round(mean('ast') * 10)).toBe(51);
    expect(on.every(g => Number.isInteger(g.line.pts) && Number.isInteger(g.line.reb) && Number.isInteger(g.line.ast) && g.line.pts < g.us)).toBe(true);
    const wins = s.games.filter(g => g.us > g.them).length;
    expect(wins).toBeGreaterThanOrEqual(45);
    expect(wins).toBeLessThanOrEqual(57);
    expect(s.games.every(g => g.us !== g.them && g.events.filter(e => e.kind === 'quarter').length === 8)).toBe(true);
    expect(s.labels[0].name).toBe('Denver Nuggets');
    expect(new Set(s.labels.map(l => l.name)).size).toBe(30);
    expect(deriveSeason(b.sport, JSON.parse(JSON.stringify(row)), b.ctx)).toEqual(s);
  });
  it('holds a year whose real length is not 82, and never names a throwback opponent', () => {
    const old = { ...NBA_CAREER, eraId: 'y2004' };
    for (const year of [2011, 2012, 2019, 2020]) {
      const b = buildUsSeason(NBA_SEASON, old, NBA_ROW({ year, team: 'SEA' }), nbaTeamLabelOf);
      expect(b.ok).toBe(false);
      if (b.ok === false) { expect(b.why).toBe('held'); expect(b.line).toBe(usSeasonHeldLine('nba', year)); }
    }
    const row = NBA_ROW({ year: 2003, team: 'SEA' });
    const b = built(row, old);
    expect(b.ctx.shape).toBeNull();
    const s = deriveSeason(b.sport, row, b.ctx)!;
    expect(s).not.toBeNull();
    expect(s.labels[0]).toEqual({ name: 'Seattle SuperSonics', named: true, key: 'SEA' });
    expect(s.labels.slice(1).every(l => !l.named && l.name === 'another team')).toBe(true);
    /* a present day id the 2003-04 list does not hold is still not named in a throwback season */
    expect(built(NBA_ROW({ year: 2026, team: 'OKC' }), old).ctx.shape).toBeNull();
  });
  it('gives no view to a banned year or a season with no games', () => {
    for (const row of [NBA_ROW({ games: 0, teamResult: 'SUSPENDED' }), NBA_ROW({ games: 0 })]) {
      const b = buildUsSeason(NBA_SEASON, NBA_CAREER, row, nbaTeamLabelOf);
      expect(b.ok).toBe(false);
      if (b.ok === false) expect(b.why).toBe('empty');
    }
  });
});

describe('the NBA playoff path', () => {
  it('lays out every depth and every number of playoff games that fits it', () => {
    const { ctx, key } = built(NBA_ROW());
    NBA_PLAYOFF_RESULTS.forEach((teamResult, i) => {
      const n = Math.min(4, i + 1);
      for (let po = 4 * n; po <= 7 * n; po += 1) {
        const path = usPlayoffPath(NBA_SEASON, NBA_ROW({ teamResult, poGames: po }), ctx, `${key}|${po}`)!;
        expect(path.steps).toHaveLength(n);
        let sum = 0;
        path.steps.forEach((st, r) => {
          const [a, b] = st.score!.split('-').map(Number);
          expect(st.won).toBe(r < n - 1 || i === 4);
          expect(st.won ? a : b).toBe(4);
          expect(st.won ? b : a).toBeLessThanOrEqual(3);
          sum += a + b;
          expect(st.round).toBe(NBA_SEASON.rounds[r]);
          expect(st.opp).not.toBe('Denver Nuggets');
        });
        expect(sum).toBe(po);
        expect(new Set(path.steps.map(st => st.opp)).size).toBe(n);
      }
      /* playoff games that cannot be four to seven a round: the rounds show, no score is claimed */
      for (const po of [4 * n - 1, 7 * n + 1, 5.5, undefined]) {
        const path = usPlayoffPath(NBA_SEASON, NBA_ROW({ teamResult, poGames: po }), ctx, key)!;
        expect(path.steps).toHaveLength(n);
        expect(path.steps.every(st => st.score === null)).toBe(true);
      }
    });
  });
  it('has no path for a missed postseason or a result the engine never wrote', () => {
    const { ctx, key } = built(NBA_ROW());
    expect(usPlayoffPath(NBA_SEASON, NBA_ROW({ teamResult: NBA_MISSED_PLAYOFFS }), ctx, key)).toBeNull();
    expect(usPlayoffPath(NBA_SEASON, NBA_ROW({ teamResult: 'Lost in the first round ' }), ctx, key)).toBeNull();
    expect(usBandOf(NBA_SEASON, 'Lost in the first round ')).toBeNull();
    expect(usBandOf(NBA_SEASON, NBA_MISSED_PLAYOFFS)).toEqual([17, 40]);
    expect(usBandOf(NBA_SEASON, 'WON THE NBA FINALS')).toEqual([52, 67]);
  });
});

describe('the NBA clock', () => {
  it('reads a quarter at every minute', () => {
    const { label } = NBA_SEASON.view.clock;
    for (let m = 0; m <= 48; m += 1) expect(label(m)).toBe(`Q${m <= 12 ? 1 : m <= 24 ? 2 : m <= 36 ? 3 : 4}`);
  });
});
