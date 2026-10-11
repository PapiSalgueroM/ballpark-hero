/* Round 1212: baseball's number file for the US Season Center
   (src/lib/season/mlb.ts) and its held words (src/lib/mlbSeasonHeld.ts),
   every pure part. The loops walk every value: every one of the 30 clubs as
   "his", every hitter position, every year of the ledger for the held line,
   the whole grid of games and averages for the at bats fit. */
import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { buildUsSeason, usBandOf, usBindOf, usPlayoffPath, type UsRow, type UsSeasonCtx } from '@/lib/season/us';
import { deriveSeason, deriveSeasonOrWhy, disagreements, type DerivedGame } from '@/lib/season/core';
import {
  MLB_SEASON, mlbAtBats, mlbAvgText, mlbDeal, mlbDealProblems, mlbDealUnnamed, mlbOrderProblems, mlbScore, mlbSeriesList, mlbWentExtra,
} from '@/lib/season/mlb';
import { mlbHeldLine, mlbHeldPos, mlbRealGames, mlbSeasonHeld, mlbViewGames } from '@/lib/mlbSeasonHeld';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_MISSED_PLAYOFFS, MLB_PLAYOFF_LADDER, MLB_WILD_CARD_GAME_EXIT, mlbEraTeamIds, mlbPlayoffResults, mlbTeamLabelOf } from '@/lib/mlbMyCareer';
import { MLB_DIVISIONS_2026, MLB_FORMULAS, MLB_PLAYOFF_FORMAT, MLB_RIVALS, MLB_SCORING, MLB_SEASONS } from '@/data/usSeasonLedgerMlb';
import type { UsCareerCore } from '@/lib/usCareerSport';

const HITTERS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const NOW_IDS = mlbEraTeamIds('now');

const ROW = (over: Record<string, unknown> = {}): UsRow => ({
  year: 2027, team: 'DET', age: 26, ovr: 82, games: 151, avg: 0.287, hr: 24, rbi: 81, sb: 9, doubles: 31, obp: 0.352,
  awards: [], teamResult: MLB_MISSED_PLAYOFFS, salary: 12, ...over,
} as unknown as UsRow);
const CAREER = (pos = 'CF', eraId: string | undefined = 'now') => ({ name: 'Cal Linedrive', pos, eraId, seasons: [] } as unknown as UsCareerCore);
const build = (row: UsRow, pos = 'CF', eraId: string | undefined = 'now') => buildUsSeason(MLB_SEASON, CAREER(pos, eraId), row, mlbTeamLabelOf);
const okBuild = (row: UsRow, pos = 'CF', eraId: string | undefined = 'now') => { const b = build(row, pos, eraId); if (b.ok === false) throw new Error(`usSeasonMlb.test: ${b.line}`); return b; };

/** The named ctx of a present day club, built the way the binding builds it. */
const ctxOf = (team: string): UsSeasonCtx => okBuild(ROW({ team })).ctx;

describe('mlbScore', () => {
  it('is never level, and its runs a team game sit on the ledger mean of each era at even strength', () => {
    for (const eraId of ['now', 'y2004']) {
      const rng = keyedRng(`mlb-score|${eraId}`);
      let runs = 0; const N = 20000;
      for (let i = 0; i < N; i += 1) {
        const [us, them] = mlbScore(0, i % 2 === 0, rng, eraId);
        expect(us === them).toBe(false);
        expect(Number.isInteger(us) && Number.isInteger(them) && us >= 0 && them >= 0).toBe(true);
        runs += us + them;
      }
      /* a level game gains a run or two in extra innings, so the mean sits a little above the ledger's */
      const mean = runs / (2 * N);
      expect(mean).toBeGreaterThan(MLB_SCORING[eraId] - 0.1);
      expect(mean).toBeLessThan(MLB_SCORING[eraId] + 0.25);
    }
  });
  it('gives the stronger side more of the wins, step by step', () => {
    let last = 0;
    for (const edge of [-2, -1, 0, 1, 2]) {
      const rng = keyedRng(`mlb-edge|${edge}`);
      let w = 0;
      for (let i = 0; i < 8000; i += 1) { const [us, them] = mlbScore(edge, i % 2 === 0, rng, 'now'); if (us > them) w += 1; }
      expect(w, `edge ${edge}`).toBeGreaterThan(last);
      last = w;
    }
  });
});

describe('the schedule in series', () => {
  it('deals the league formula for every one of the 30 clubs, in series that never run into one another', () => {
    expect(NOW_IDS).toHaveLength(30);
    const f = MLB_FORMULAS[0];
    for (const team of NOW_IDS) {
      const ctx = ctxOf(team);
      expect(ctx.shape, team).not.toBeNull();
      expect([ctx.order.length, ctx.divSlots, ctx.confSlots], team).toEqual([30, 4, 14]);
      for (let k = 0; k < 4; k += 1) {
        const list = mlbSeriesList(ctx, keyedRng(`mlb-deal|${team}|${k}`));
        expect(list, team).toHaveLength(52);
        expect(list.reduce((a, s) => a + s.games, 0), team).toBe(f.games);
        expect(list.filter(s => s.home).reduce((a, s) => a + s.games, 0), team).toBe(81);
        expect(list.every(s => s.games === 3 || s.games === 4), team).toBe(true);
        /* no club in back to back series */
        expect(mlbOrderProblems(list), team).toBeLessThan(100);
        const rounds = mlbDeal(ctx, keyedRng(`mlb-deal|${team}|${k}`));
        const games = rounds.map((r, i): DerivedGame => ({ md: i + 1, opp: r[0][0] === 0 ? r[0][1] : r[0][0], home: r[0][0] === 0, us: 1, them: 0, fixed: false, played: true, started: true, line: {}, events: [] }));
        expect(mlbDealProblems(ctx, games), `${team} ${k}`).toEqual([]);
        /* his interleague rival is the ledger's pair, met six times */
        const pair = MLB_RIVALS.find(p => p.includes(team))!;
        const rival = ctx.order.indexOf(pair[0] === team ? pair[1] : pair[0]);
        expect(games.filter(g => g.opp === rival), team).toHaveLength(f.rival.games);
      }
    }
  });
  it('says what is wrong with a schedule that is not the formula', () => {
    const ctx = ctxOf('DET');
    const rounds = mlbDeal(ctx, keyedRng('mlb-deal|wrong'));
    const games = rounds.map((r, i): DerivedGame => ({ md: i + 1, opp: r[0][0] === 0 ? r[0][1] : r[0][0], home: r[0][0] === 0, us: 1, them: 0, fixed: false, played: true, started: true, line: {}, events: [] }));
    /* one game against a division rival handed to another club */
    const at = games.findIndex(g => g.opp === 1);
    const moved = games.map((g, i) => (i === at ? { ...g, opp: 20 } : g));
    expect(mlbDealProblems(ctx, moved).join(' | ')).toContain(`division rival ${ctx.order[1]}: 12 games`);
    /* the same games one at a time in another order: the series are gone */
    const single = games.slice().sort((a, b) => ((a.md * 37) % 162) - ((b.md * 37) % 162)).map((g, i) => ({ ...g, md: i + 1 }));
    expect(mlbDealProblems(ctx, single).some(p => p.startsWith('a run of 1 against'))).toBe(true);
  });
  it('deals a throwback season as unnamed series of three, half of them at home', () => {
    for (let k = 0; k < 6; k += 1) {
      const rounds = mlbDealUnnamed(162, keyedRng(`mlb-unnamed|${k}`));
      expect(rounds).toHaveLength(162);
      const home = rounds.map(r => r[0][0] === 0);
      expect(home.filter(Boolean)).toHaveLength(81);
      for (let i = 0; i < 162; i += 3) expect(new Set(home.slice(i, i + 3)).size, `series at ${i}`).toBe(1);
      expect(new Set(rounds.map(r => (r[0][0] === 0 ? r[0][1] : r[0][0]))).size).toBe(162);
    }
  });
});

describe('the at bats and hits a batting average allows', () => {
  it('walks the whole grid the engine can write and finds a fit for all but the 25 pairs no whole numbers make', () => {
    const none: string[] = [];
    let all = 0;
    for (let games = 40; games <= 162; games += 1) for (let a = 195; a <= 365; a += 1) {
      all += 1;
      const avg = a / 1000;
      const fit = mlbAtBats(games, avg, 0, keyedRng(`mlb-ab|${games}|${a}`));
      if (!fit) { none.push(`${games}@.${a}`); continue; }
      expect(Math.round((fit.h / fit.ab) * 1000), `${games} games at .${a}`).toBe(a);
      expect(fit.ab >= Math.ceil(games * 2.2) && fit.ab <= Math.floor(games * 4.5), `${games} games at .${a}`).toBe(true);
    }
    expect(all).toBe(21033);
    /* a .334 average in a season of 40 to 63 games needs 287 at bats or more, and .332 at 40 games the same way */
    expect(none).toHaveLength(25);
    expect(none.every(k => k === '40@.332' || /^(4\d|5\d|6[0-3])@\.334$/.test(k))).toBe(true);
  });
  it('never hands him fewer hits than his home runs and doubles', () => {
    const fit = mlbAtBats(40, 0.195, 30, keyedRng('mlb-ab|extra'))!;
    expect(fit.h).toBeGreaterThanOrEqual(30);
    expect(Math.round((fit.h / fit.ab) * 1000)).toBe(195);
    expect(mlbAtBats(40, 0.195, 60, keyedRng('mlb-ab|too-many'))).toBeNull();
    expect(mlbAvgText(47, 164)).toBe('.287');
    expect(mlbAvgText(0, 0)).toBe('-');
  });
});

describe('held, said before he presses (the whole sentence, typed here)', () => {
  it('holds pitchers and no hitter', () => {
    for (const pos of ['SP', 'RP']) {
      expect(mlbHeldPos(pos), pos).toBe('📺 No week by week for pitchers yet: this view cannot yet show which games were your wins.');
      const b = build(ROW(), pos);
      expect(b.ok === false && b.why === 'held' && b.line, pos).toBe(mlbHeldPos(pos));
      expect(mlbSeasonHeld(2027, 'now', { pos, team: 'DET' }), pos).toBe(mlbHeldPos(pos));
    }
    for (const pos of HITTERS) { expect(mlbHeldPos(pos), pos).toBeNull(); expect(build(ROW(), pos).ok, pos).toBe(true); }
  });
  it('holds the short season, a club a game short, a club on 163 and a club outside the league, each in its own true words', () => {
    expect(mlbViewGames()).toBe(162);
    /* 2020: 60 games for every club */
    expect(mlbHeldLine(2020, 'DET', 'y2004')).toBe('📺 No week by week this season: the real 2020 season had 60 games and the week by week view is built for 162.');
    /* 2026: the Orioles and the Yankees finished on 161, and nobody else did */
    expect(mlbRealGames(2026, 'BAL', 'now')).toBe(161);
    expect(mlbHeldLine(2026, 'BAL', 'now')).toContain('📺 No week by week this season: in the real 2026 season your club ');
    expect(mlbHeldLine(2026, 'BAL', 'now')).toContain(', and the week by week view is built for 162.');
    expect(mlbHeldLine(2026, 'NYY', 'now')).toBe(mlbHeldLine(2026, 'BAL', 'now'));
    for (const team of NOW_IDS.filter(t => t !== 'BAL' && t !== 'NYY')) expect(mlbHeldLine(2026, team, 'now'), team).toBeNull();
    /* 2007: the Rockies and the Padres played a 163rd game */
    expect(mlbRealGames(2007, 'COL', 'y2004')).toBe(163);
    expect(mlbHeldLine(2007, 'COL', 'y2004')).toBe('📺 No week by week this season: in the real 2007 season your club played a 163rd game, and the week by week view is built for 162.');
    /* a year after the ledger is the present day league carried forward: open for every club */
    for (const team of NOW_IDS) expect(mlbHeldLine(2031, team, 'now'), team).toBeNull();
    /* a club the ledger puts outside the league, and an id that is no club of the era's list */
    expect(mlbHeldLine(2027, 'Yomiuri Giants', 'now')).toBe('📺 No week by week this season: your club plays outside Major League Baseball, and this view lays out a Major League season.');
    expect(mlbHeldLine(2027, 'MON', 'now')).toBe('📺 No week by week this season: the game holds no league schedule for your club.');
    /* a year the ledger does not hold: fail closed */
    expect(mlbHeldLine(1999, 'DET', 'y2004')).toBe('📺 No week by week this season: the game has no verified length for the real 1999 season.');
  });
  it('agrees with the ledger row by row, and the build is held exactly when the hub says so', () => {
    let held = 0; let open = 0;
    for (const season of MLB_SEASONS) {
      const eraId = season.year >= 2026 ? 'now' : 'y2004';
      for (const team of mlbEraTeamIds(eraId)) {
        const group = season.clubs.find(g => g.ids.includes(team));
        const real = group ? group.games : season.games;
        const line = mlbHeldLine(season.year, team, eraId);
        expect(line === null, `${season.year} ${team}`).toBe(real === 162);
        const b = build(ROW({ year: season.year, team }), 'CF', eraId);
        expect(b.ok, `${season.year} ${team}`).toBe(line === null);
        if (b.ok === false) { expect(b.line, `${season.year} ${team}`).toBe(line); held += 1; } else open += 1;
        expect(mlbSeasonHeld(season.year, eraId, { pos: 'CF', team }), `${season.year} ${team}`).toBe(line);
      }
    }
    /* both branches were walked */
    expect(held).toBeGreaterThan(30);
    expect(open).toBeGreaterThan(500);
  });
  it('lays out nothing for a line the engine played on another length, whatever the ledger says', () => {
    const b = okBuild(ROW({ slate: 161 }));
    expect(deriveSeason(b.sport, ROW({ slate: 161 }), b.ctx)).toBeNull();
  });
});

/** A hitter's career played through the real binding on a keyed stream. */
function play(pos: string, seed: string, eraId: string, seasons = 6): UsCareerCore {
  const SB = MLB_CAREER_SPORT;
  const rng = keyedRng(seed);
  const c = SB.startCareer('Cal Linedrive', pos, SB.create.archetypes[pos][0], rng, null as never, eraId);
  let tq = SB.rollTeamQuality(null, rng);
  SB.assignRole(c, tq, rng);
  for (let i = 0; i < seasons; i += 1) {
    SB.campBattle(c, tq, rng);
    SB.simSeason(c, tq, rng);
    SB.progress(c, rng);
    tq = SB.rollTeamQuality(tq, rng);
  }
  return JSON.parse(JSON.stringify(c));
}

describe('a season derived from its saved line', () => {
  it('lands every hitter position on the save in both eras: the sums, the average, the innings', () => {
    let seen = 0; let extras = 0; let homers = 0;
    for (const pos of HITTERS) for (const eraId of ['now', 'y2004']) {
      const career = play(pos, `mlb-derive|${pos}|${eraId}`, eraId);
      for (const season of career.seasons) {
        const row = season as UsRow;
        const b = buildUsSeason(MLB_SEASON, career, row, MLB_CAREER_SPORT.teamLabelOf);
        if (b.ok === false) continue;
        const label = `${pos} ${eraId} ${row.year}`;
        const s = deriveSeasonOrWhy(b.sport, row, b.ctx);
        expect(typeof s, `${label}: ${typeof s === 'string' ? s : ''}`).toBe('object');
        if (typeof s === 'string') continue;
        seen += 1;
        expect(disagreements(b.sport, row, b.ctx, s), label).toEqual([]);
        expect(s.games, label).toHaveLength(162);
        expect(!!b.ctx.shape, label).toBe(eraId === 'now');
        const on = s.games.filter(g => g.played);
        expect(on, label).toHaveLength(row.games);
        const sum = (k: string) => on.reduce((a, g) => a + (g.line[k] ?? 0), 0);
        for (const k of ['hr', 'rbi', 'sb', 'doubles']) expect(sum(k), `${label} ${k}`).toBe(row[k]);
        expect(Math.round((sum('h') / sum('ab')) * 1000), label).toBe(Math.round((row.avg as number) * 1000));
        for (const g of s.games) {
          expect(g.us === g.them, `${label} game ${g.md}`).toBe(false);
          const runs = (side: 'us' | 'them') => g.events.filter(e => e.kind === 'inning' && e.side === side).reduce((a, e) => a + (e.pts ?? 0), 0);
          expect([runs('us'), runs('them')], `${label} game ${g.md}`).toEqual([g.us, g.them]);
          if (mlbWentExtra(g)) { extras += 1; expect(Math.abs(g.us - g.them), `${label} game ${g.md}`).toBe(1); }
          homers += g.events.filter(e => e.kind === 'hr').length;
          if (!g.played) { expect(g.line, `${label} game ${g.md}`).toEqual({}); expect(MLB_SEASON.view.missed(g.why), label).toBe('Did not play'); }
        }
        /* the same save, the same season, on a second read */
        expect(JSON.stringify(deriveSeason(b.sport, row, b.ctx)), label).toBe(JSON.stringify(s));
      }
    }
    expect(seen).toBeGreaterThan(60);
    expect(extras).toBeGreaterThan(0);
    expect(homers).toBeGreaterThan(0);
  }, 120000);
  it('opens an older line with no doubles and no on base percentage, and holds a line with no average to the plain tile', () => {
    const old = ROW({ doubles: undefined, obp: undefined });
    const b = okBuild(old);
    const s = deriveSeason(b.sport, old, b.ctx)!;
    expect(s).not.toBeNull();
    expect(s.games.filter(g => g.played).every(g => g.line.doubles === undefined)).toBe(true);
    const bare = ROW({ avg: undefined });
    expect(deriveSeason(okBuild(bare).sport, bare, okBuild(bare).ctx)).toBeNull();
  });
});

describe('October, by the year', () => {
  it('reads the result words of every year from the engine, and bands a result by the round it ended in', () => {
    /* today's ladder, a one game wild card, and no wild card round at all */
    expect(mlbPlayoffResults(2027)).toEqual([...MLB_PLAYOFF_LADDER]);
    expect(mlbPlayoffResults(2015)).toEqual([MLB_WILD_CARD_GAME_EXIT, ...MLB_PLAYOFF_LADDER.slice(1)]);
    expect(mlbPlayoffResults(2008)).toEqual(MLB_PLAYOFF_LADDER.slice(1));
    for (let year = 2004; year <= 2040; year += 1) {
      const bind = usBindOf(MLB_SEASON, year);
      expect(bind.results, String(year)).toEqual(mlbPlayoffResults(year));
      expect(bind.bands, String(year)).toHaveLength(bind.results.length + 1);
      expect(bind.rounds, String(year)).toHaveLength(bind.results.length - 1);
      /* the title and the lost World Series hold one band in every year, whatever came before them */
      expect(usBandOf(bind, 'WON THE WORLD SERIES'), String(year)).toEqual([92, 108]);
      expect(usBandOf(bind, 'Lost the World Series'), String(year)).toEqual([90, 105]);
      expect(usBandOf(bind, 'Lost the Division Series'), String(year)).toEqual([86, 100]);
      expect(usBandOf(bind, MLB_MISSED_PLAYOFFS), String(year)).toEqual([52, 86]);
      expect(usBandOf(bind, 'Lost the Division Series '), String(year)).toBeNull();
    }
    expect(usBandOf(usBindOf(MLB_SEASON, 2015), MLB_WILD_CARD_GAME_EXIT)).toEqual([84, 95]);
    expect(usBandOf(usBindOf(MLB_SEASON, 2027), MLB_WILD_CARD_GAME_EXIT)).toBeNull();
    expect(usBandOf(usBindOf(MLB_SEASON, 2008), 'Lost the Wild Card series')).toBeNull();
  });
  it('draws a path from 2022 on, round by round, whose scores add up to the saved games, and names nobody', () => {
    const { ctx, key } = okBuild(ROW());
    const most = MLB_PLAYOFF_FORMAT.series;
    MLB_PLAYOFF_LADDER.forEach((teamResult, i) => {
      const n = Math.min(4, i + 1);
      const champion = i === MLB_PLAYOFF_LADDER.length - 1;
      const lo = most.slice(0, n).reduce((a, s) => a + s[0], 0);
      const hi = most.slice(0, n).reduce((a, s) => a + s[1], 0);
      for (let po = lo; po <= hi; po += 1) {
        const path = usPlayoffPath(MLB_SEASON, ROW({ teamResult, poGames: po }), ctx, `${key}|${po}`)!;
        expect(path.steps.map(s => s.round), teamResult).toEqual(MLB_PLAYOFF_FORMAT.rounds.slice(0, n));
        expect(path.steps.every(s => s.opp === 'another team'), teamResult).toBe(true);
        expect(path.steps.map(s => s.won), teamResult).toEqual(Array.from({ length: n }, (_, r) => r < n - 1 || champion));
        let games = 0;
        path.steps.forEach((s, r) => {
          const [a, b] = s.score!.split('-').map(Number);
          expect(Math.max(a, b), `${teamResult} ${po}`).toBe(most[r][0]);
          expect(a > b, `${teamResult} ${po}`).toBe(s.won);
          expect(a + b, `${teamResult} ${po}`).toBeLessThanOrEqual(most[r][1]);
          games += a + b;
        });
        expect(games, `${teamResult} ${po}`).toBe(po);
      }
      /* playoff games the rounds cannot hold (a save from before the engine held October to them), or none saved: no path at all */
      for (const po of [lo - 1, hi + 1, undefined]) expect(usPlayoffPath(MLB_SEASON, ROW({ teamResult, poGames: po }), ctx, key), `${teamResult} ${po}`).toBeNull();
    });
    expect(usPlayoffPath(MLB_SEASON, ROW({ teamResult: MLB_MISSED_PLAYOFFS }), ctx, key)).toBeNull();
  });
  it('draws no path before 2022 and says why, in a throwback season and for a result the year cannot hold', () => {
    const view = MLB_SEASON.view;
    for (const year of [2005, 2015, 2021]) {
      /* a club of the throwback list whose real season that year was the full one */
      const team = mlbEraTeamIds('y2004').find(t => mlbHeldLine(year, t, 'y2004') === null)!;
      const row = ROW({ year, team, teamResult: 'Lost the Championship Series', poGames: 11 });
      const b = okBuild(row, 'CF', 'y2004');
      expect(usPlayoffPath(MLB_SEASON, row, b.ctx, b.key), String(year)).toBeNull();
      expect(view.noPathNote!(row), String(year)).toBe("The playoff path starts with the 2022 season, when the playoffs took today's shape.");
    }
    expect(view.noPathNote!(ROW({ teamResult: MLB_MISSED_PLAYOFFS }))).toBeNull();
    expect(view.noPathNote!(ROW({ teamResult: 'Lost the Wild Card series', poGames: 5 }))).toBe("No playoff path for this season: the playoff games on your season card do not fit today's rounds.");
  });
});

describe('the words', () => {
  it('labels the clock inning by inning and words every line of the feed', () => {
    const { clock, eventWords } = MLB_SEASON.view;
    expect(clock.length).toBe(10);
    expect(Array.from({ length: 11 }, (_, m) => clock.label(m))).toEqual(['1st', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', 'EXT']);
    expect(eventWords({ min: 3, kind: 'inning', side: 'us', pts: 2 }, 'Detroit Tigers', 'another team', 'CF')).toBe('⚾ Detroit Tigers put 2 on the board in the 3rd');
    expect(eventWords({ min: 10, kind: 'inning', side: 'them', pts: 1 }, 'Detroit Tigers', 'another team', 'CF')).toBe('⚾ another team put 1 on the board in extra innings');
    expect(eventWords({ min: 5, kind: 'hr', side: 'us', mine: true }, 'Detroit Tigers', 'another team', 'CF')).toBe('💥 You go deep in the 5th');
  });
  it('prints his line, the halfway sentence with and without an All-Star, and a help sheet with no dash in it', () => {
    const view = MLB_SEASON.view;
    const g = { md: 41, opp: 1, home: true, us: 6, them: 4, fixed: false, played: true, started: true, line: { ab: 4, h: 2, hr: 1, rbi: 3, doubles: 0, sb: 0 }, events: [] } as DerivedGame;
    expect(view.markChip(g, 'CF')).toBe('2-4');
    expect(view.lineOf(g, 'CF')).toEqual(['HR', '3 RBI']);
    expect(view.markText(g, 'CF')).toBe('2 for 4 with a home run and 3 RBI');
    const big = { ...g, line: { ab: 5, h: 4, hr: 2, rbi: 5, doubles: 1, sb: 2 } } as DerivedGame;
    expect(view.lineOf(big, 'CF')).toEqual(['2 HR', '5 RBI', '2B', '2 SB']);
    expect(view.markText(big, 'CF')).toBe('4 for 5 with 2 home runs, a double, 5 RBI and 2 steals');
    expect(view.markText({ ...g, line: { ab: 4, h: 0 } } as DerivedGame, 'CF')).toBe('0 for 4');
    expect(view.soFar({ apps: 81, ab: 300, h: 90, hr: 14, rbi: 40 }, 'CF')).toEqual([['Played', '81'], ['AVG', '.300'], ['HR', '14'], ['RBI', '40']]);
    expect(view.half({ apps: 81, ab: 300, h: 90, hr: 14 }, 'CF', ROW())).toBe('First half: 81 games, .300 with 14 home runs.');
    expect(view.half({ apps: 81, ab: 300, h: 90, hr: 14 }, 'CF', ROW({ awards: ['All-Star'] }))).toBe('First half: 81 games, .300 with 14 home runs. You are an All-Star this year.');
    expect(view.half({ apps: 0 }, 'CF', ROW())).toBe('First half: you did not play a game.');
    expect(view.groupWords).toEqual(['Division', 'League']);
    expect(MLB_DIVISIONS_2026.flatMap(d => d.teams).slice().sort()).toEqual(NOW_IDS.slice().sort());
    for (const named of [true, false]) {
      const help = view.help(named, named ? 'Chicago White Sox' : undefined);
      const all = [help.title, ...help.intro, help.controls, help.footnote, ...help.examples.flatMap(x => [x.head, x.body])].join(' ');
      expect(all.includes(String.fromCharCode(0x2013)) || all.includes(String.fromCharCode(0x2014))).toBe(false);
      expect(all).toContain('a champion wins 92 to 108 of 162 and a team that missed the playoffs 52 to 86');
      expect(all).toContain('this career has no first round bye');
      expect(help.examples.map(x => x.head)).toEqual(['A game', 'Your numbers', 'Series', 'The innings', 'All-Star']);
      expect(help.examples[0].body).toContain(named ? 'at home to the Chicago White Sox' : 'at home to another team');
    }
  });
});
