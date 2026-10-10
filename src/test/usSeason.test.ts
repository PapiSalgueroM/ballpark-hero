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
import { NBA_SEASON, nbaDeal, nbaDealProblems, nbaTakeover } from '@/lib/season/nba';
import {
  NBA_ARCHETYPES, NBA_MISSED_PLAYOFFS, NBA_PLAYOFF_RESULTS, nbaEraTeamIds, nbaSeasonGames, nbaTeamLabelOf, simNbaSeason, startNbaCareer,
  type NbaCareerPos,
} from '@/lib/nbaMyCareer';

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
  it('holds a year exactly when its real length is not the one the view is built for', () => {
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
    /* Since Round 1104 an NFL throwback plays the real 16 games of 2005 to 2020, so the line must not say the career plays 17. */
    expect(usSeasonHeldLine('nfl', 2005)).toBe('📺 Week by week starts with the 2021 season: the real 2005 season had 16 games and the week by week view is built for 17.');
    expect(usSeasonHeldLine('nfl', 2020)).toContain('starts with the 2021 season');
    for (let year = 2005; year <= 2026; year++) expect(usSeasonHeldLine('nfl', year) ?? '').not.toContain('this career plays');
    expect(usSeasonHeldLine('nfl', 2021)).toBeNull();
    /* 2022: the Bills at Bengals game was never replayed, so those two teams played 16 (the same case as NBA 2012-13) */
    expect(usSeasonLength('nfl', 2022)).toBeNull();
    expect(usSeasonHeldLine('nfl', 2022)).toBe('📺 No week by week this season: the real 2022 season had one game called off for good, so two teams finished on 16 games.');
    expect(usSeasonHeldLine('nfl', 2023)).toBeNull();
    expect(usSeasonHeldLine('nfl', 2026)).toBeNull();
    /* Since Round 1103 an NBA career plays the real 66 and 72 games, so the line must not say the career plays 82. */
    expect(usSeasonHeldLine('nba', 2011)).toBe('📺 No week by week this season: the real 2011-12 season had 66 games and the week by week view is built for 82.');
    expect(usSeasonHeldLine('nba', 2020)).toBe('📺 No week by week this season: the real 2020-21 season had 72 games and the week by week view is built for 82.');
    for (let year = 2003; year <= 2030; year++) expect(usSeasonHeldLine('nba', year) ?? '').not.toContain('this career plays');
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

/* Round 1103: the held line above tells an NBA player "the week by week view is built for 82" of a 66 or 72 game
   season. That is only the honest reason while the career really plays the ledger's length, so the real engine
   plays seasons in every ledger year here: the club's record adds up to the year's length, nobody plays more
   games than the year has, the healthy and the hurt windows are the engine's own scaled to it, and somebody
   plays every game. A year the ledger holds with no single length (2012-13, 2019-20) plays 82, and its held
   line gives the real reason and says nothing about what the career plays. */
describe('Round 1103: an NBA career plays the season the ledger holds', () => {
  const POS: NbaCareerPos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
  const SEEDS = 80;
  it('plays the ledger length in every year the ledger holds one, and 82 in a year it holds none for', () => {
    const lengths = new Set<number>();
    let seasons = 0;
    for (let year = 2003; year <= 2045; year += 1) {
      const real = usSeasonLength('nba', year);
      const L = real ?? 82;
      expect(nbaSeasonGames(year), `${year}`).toBe(L);
      lengths.add(L);
      let everyGame = 0; let hurt = 0;
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const rng = keyedRng(`nba-plays-the-ledger-${year}-${seed}`);
        const pos = POS[seed % POS.length];
        const types = NBA_ARCHETYPES[pos];
        const c = startNbaCareer('Ledger Test', pos, types[seed % types.length], rng, null, year < 2026 ? 'y2004' : 'now');
        c.year = year;
        const { line, notes } = simNbaSeason(c, 70 + (seed % 5) * 5, rng);
        seasons += 1;
        expect(line.year).toBe(year);
        expect((line.clubWins ?? -1) + (line.clubLosses ?? -1), `${year} seed ${seed}: the club's record`).toBe(L);
        const wasHurt = notes.some(n => n.startsWith('🚑 Missed'));
        if (wasHurt) {
          hurt += 1;
          expect(line.games, `${year} seed ${seed}: hurt`).toBeLessThanOrEqual(L - Math.round((8 * L) / 82));
          expect(line.games).toBeGreaterThanOrEqual(Math.max(Math.round((20 * L) / 82), L - Math.round((42 * L) / 82)));
        } else {
          expect(line.games, `${year} seed ${seed}: healthy`).toBeLessThanOrEqual(L);
          expect(line.games).toBeGreaterThanOrEqual(L - 4);
        }
        if (line.games === L) everyGame += 1;
      }
      expect(everyGame, `${year}: somebody plays all ${L}`).toBeGreaterThan(0);
      expect(hurt, `${year}: not every season is a hurt one`).toBeLessThan(SEEDS);
    }
    expect([...lengths].sort((a, b) => a - b)).toEqual([66, 72, 82]);
    expect(seasons).toBe(43 * SEEDS);
  });
  it('so a short season is held for the view, and a year with no single length for what really happened', () => {
    let short = 0; let none = 0;
    for (let year = 2003; year <= 2045; year += 1) {
      const real = usSeasonLength('nba', year);
      const line = usSeasonHeldLine('nba', year);
      if (real === US_FULL_SEASON.nba) { expect(line, `${year}`).toBeNull(); continue; }
      expect(line, `${year}`).not.toBeNull();
      if (real === null) { none += 1; expect(line).not.toContain('built for'); expect(nbaSeasonGames(year)).toBe(82); continue; }
      short += 1;
      expect(line).toContain(`had ${nbaSeasonGames(year)} games and the week by week view is built for 82.`);
    }
    expect(short).toBe(2);
    expect(none).toBe(2);
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
    const bad: string[] = [];
    for (let n = 1; n <= 17; n += 1) {
      for (let trial = 0; trial < 40; trial += 1) {
        const weights = Array.from({ length: n }, () => (rng() < 0.2 ? 0 : rng() * 3));
        const caps = Array.from({ length: n }, () => Math.floor(rng() * 9));
        const mins = caps.map(c => Math.floor(rng() * (c + 1) * 0.4));
        const lo = mins.reduce((a, b) => a + b, 0);
        const hi = caps.reduce((a, b) => a + b, 0);
        for (const total of [lo, hi, lo + Math.floor((hi - lo) / 2), lo + Math.floor((hi - lo) * rng())]) {
          const x = splitTotal(total, weights, caps, mins);
          /* plain checks, one expect at the end: 2,700 cases with an expect a number is slow on a busy machine */
          if (!x || x.reduce((p, v) => p + v, 0) !== total || x.some((v, i) => !Number.isInteger(v) || v < mins[i] || v > caps[i])) bad.push(`n ${n} total ${total}: ${JSON.stringify(x)}`);
          done += 1;
        }
      }
    }
    expect(bad).toEqual([]);
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
  it('gives each stat its own number a game, so a big scoring night is not by rule his best rebounding night', () => {
    const row = NBA_ROW();
    const b = built(row);
    const s = deriveSeason(b.sport, row, b.ctx)!;
    /* a mean's base is mean * (0.55 + 0.9u), u keyed by stat AND game: read u back for rebounds and
       for assists. One shared number a game (the key without the stat) would make them equal in all 82. */
    const u = (k: 'reb' | 'ast', g: DerivedGame) => (b.sport.meanBase(k, g) / (k === 'reb' ? 6.4 : 5.1) - 0.55) / 0.9;
    for (const g of s.games) { expect(u('reb', g)).toBeGreaterThan(-1e-9); expect(u('reb', g)).toBeLessThan(1); }
    expect(s.games.filter(g => Math.abs(u('reb', g) - u('ast', g)) < 1e-9)).toHaveLength(0);
  });
  it('only calls a night a takeover when it was one: 20 or more, 1.3 times his average, in a win', () => {
    expect(nbaTakeover(4, 4, true)).toBe(false);
    expect(nbaTakeover(19, 4, true)).toBe(false);
    expect(nbaTakeover(20, 4, true)).toBe(true);
    expect(nbaTakeover(32, 25, true)).toBe(false);
    expect(nbaTakeover(33, 25, true)).toBe(true);
    expect(nbaTakeover(45, 25, false)).toBe(false);
    let hot = 0;
    for (const ppg of [4, 12, 25, 31]) {
      const row = NBA_ROW({ ppg });
      const b = built(row);
      const s = deriveSeason(b.sport, row, b.ctx)!;
      for (const g of s.games) {
        const said = g.events.some(e => e.kind === 'hot');
        expect(said, `ppg ${ppg} game ${g.md}`).toBe(g.played && nbaTakeover(g.line.pts, ppg, g.us > g.them));
        if (said) hot += 1;
      }
    }
    /* the line is still in the game: these four seasons hold some */
    expect(hot).toBeGreaterThan(4);
  });
  it('names a team of his own season in the worked example, never his own, and nobody when unnamed', () => {
    const named = NBA_SEASON.view.help(true, 'Utah Jazz').examples[0].body;
    expect(named).toContain('at home to the Utah Jazz.');
    const unnamed = NBA_SEASON.view.help(false).examples[0].body;
    expect(unnamed).toContain('at home to another team.');
    expect(unnamed).not.toMatch(/Nuggets|Jazz/);
    expect(NBA_SEASON.view.help(false).intro.join(' ')).not.toContain("is not that season's real league");
    /* a first half with no game in it says so, with no "0 games, - points" */
    expect(NBA_SEASON.view.half({ apps: 0 }, 'SG')).toBe('First half: you did not play a game.');
    expect(NBA_SEASON.view.half({ apps: 1, pts: 12 }, 'SG')).toBe('First half: 1 game, 12.0 points a game');
    expect(NBA_SEASON.view.half({ apps: 41, pts: 1025 }, 'SG')).toBe('First half: 41 games, 25.0 points a game');
  });
  it('prints his points once: the chip is the points, the bits are the rest', () => {
    const g = { line: { pts: 31, reb: 8, ast: 6 } } as unknown as DerivedGame;
    expect(NBA_SEASON.view.markChip(g, 'SG')).toBe('31 PTS');
    expect(NBA_SEASON.view.lineOf(g, 'SG')).toEqual(['8 REB', '6 AST']);
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
  it('draws every round before the Finals from his own conference, and only the Finals from the other', () => {
    const shape = usLeagueShape('nba', 'now', 2026)!;
    const confOf = (name: string) => shape.divisions.find(d => d.teams.some(id => nbaTeamLabelOf(id) === name))?.conf;
    let finals = 0; let early = 0;
    /* a Western team and an Eastern one, every depth, several keys */
    for (const team of ['DEN', 'BOS']) {
      const { ctx, key } = built(NBA_ROW({ team }));
      const mine = confOf(nbaTeamLabelOf(team));
      expect(mine).toBeDefined();
      NBA_PLAYOFF_RESULTS.forEach((teamResult, i) => {
        for (let k = 0; k < 12; k += 1) {
          const path = usPlayoffPath(NBA_SEASON, NBA_ROW({ team, teamResult, poGames: 5 * Math.min(4, i + 1) }), ctx, `${key}|conf|${k}`)!;
          path.steps.forEach((st, r) => {
            const conf = confOf(st.opp);
            expect(conf, `${st.opp} is a team of the league`).toBeDefined();
            /* round index 3 is the Finals: the only round against the other conference */
            expect(conf === mine, `${team} "${teamResult}" round ${r + 1} against ${st.opp}`).toBe(r < 3);
            if (r < 3) early += 1; else finals += 1;
          });
        }
      });
    }
    expect(early).toBeGreaterThan(100);
    expect(finals).toBe(2 * 2 * 12);
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
