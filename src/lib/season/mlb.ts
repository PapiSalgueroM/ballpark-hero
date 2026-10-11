/* Round 1212: baseball's number file for the US Season Center
   (src/lib/season/us.ts binds it to the season core). Hitters only: a
   pitcher is held with an honest line (src/lib/mlbSeasonHeld.ts says why).

   What is the engine's, read from the saved line: games played, the batting
   average (three places), home runs, runs batted in, doubles, steals, the
   team result and the playoff games. The on base percentage stays on the
   season card: walks are not laid out game by game.

   What is real and two sourced, all of it read from Round 1211's ledger
   (src/data/usSeasonLedgerMlb.ts) and never typed here: the season's length
   club by club, the six divisions of 2026, how many games a club plays
   against each kind of opponent (13 against a division rival, seven and six
   by park; six against eight clubs of the league and seven against two; six
   with the interleague rival, three in each park; three against each of the
   other fourteen, seven of those series at home), the fifteen rival pairs,
   league runs a team game for each era, and the rounds of the postseason
   from 2022.

   What is THIS SIM'S OWN, and said so in the "?": the record bands, the score
   law, how the games are grouped into series and which park a league series
   is played in (the ledger marks both thin: one source), which series falls
   where, every score, every inning and every line of his.

   What a game claims: a score, runs by inning, and for him at bats, hits,
   home runs, doubles, runs batted in and steals. Nothing else (no walks, no
   pitchers, no dates).

   THIN, marked (the ledger's MLB_THIN, one source each), and how each is
   handled here:
   - Nine innings, and extra innings until one side leads: the clock is built
     on it, as the NFL's is on four quarters of fifteen minutes (NFL_CLOCK,
     thin the same way). It is the game's basic rule; a second source is owed.
   - The World Series as the only round against the other league: NOT used.
     The playoff path names no opponent (`pathNamed: false`).
   - The shares of shutouts, one run games and extra inning games: not used
     as targets. The score law is banded on its own measured output in
     scripts/simUsSeasonCentre.mjs, and that header says the bands are this
     career's own.
   - The length of the rounds before 2022: no path is drawn before 2022.

   No React, no Math.random. The engine import is its own exported result
   words and the era's team ids (the engine is already in the route's chunk). */
import { shuffled, type DerivedGame, type DerivedSeason, type Rng, type SeasonEvent, type StatTotal } from './core';
import { splitTotal, usHelp, type UsRow, type UsSeasonBind, type UsSeasonCtx, type UsSeasonFormat } from './us';
import { MLB_MISSED_PLAYOFFS, MLB_PLAYOFF_LADDER, mlbEraTeamIds, mlbPlayoffResults } from '../mlbMyCareer';
import { MLB_DIVISIONS_2026, MLB_FORMULAS, MLB_PLAYOFF_FORMAT, MLB_RIVALS, MLB_SCORING } from '@/data/usSeasonLedgerMlb';
import type { UsShape } from '@/data/usLeagueShape';
import { postseasonRounds } from '../usSeasonShape';
import { mlbHeldLine, mlbHeldPos, mlbRealGames, mlbViewGames } from '../mlbSeasonHeld';

/** Wins this career's rule gives each result, of 162: missed, a first round
 *  exit, then the Division Series, the Championship Series, a lost World
 *  Series and the title. A year with no wild card round has no second entry. */
const BANDS = [[52, 86], [84, 95], [86, 100], [88, 103], [90, 105], [92, 108]] as const;
/** The first season whose divisions the ledger holds (MLB_DIVISIONS_2026 is that season's). */
const SHAPE_FROM = 2026;
/** The clock's marks: nine innings and one for everything after the ninth. */
const INNINGS = 9;
const EXTRA = INNINGS + 1;
/** After a run scores, the chance the inning brings another (this sim's own):
 *  it is what makes shutouts and ten run games both happen. */
const RUN_ON = 0.42;
/** A side's runs a game are held inside this before the innings are drawn. */
const MEAN_FLOOR = 1.8;
const MEAN_CEILING = 9;
/** The home side's edge in runs (this sim's own). */
const HOME_RUNS = 0.1;
/** Of the games decided by one run, the share this sim sends past the ninth. */
const EXTRA_SHARE = 0.3;
/** His at bats in a game he plays, and a season's at bats a game he played. */
const AB_MAX = 6;
const AB_LOW = 2.2;
const AB_HIGH = 4.5;
/** The most runs he can drive in in one game (this sim's own cap). */
const RBI_MAX = 8;
/** His caps a game: home runs, doubles, steals. */
const SUMS: { key: string; cap: number }[] = [{ key: 'hr', cap: 3 }, { key: 'doubles', cap: 3 }, { key: 'sb', cap: 3 }];
/** Counted in tens a season, so they follow half of the core's game to game form (the NFL's rule for touchdowns). */
const FORM_POWER = 0.5;
const ORDER_TRIES = 40;
const HOME_RUN_OF_SERIES = 4;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const of = (g: DerivedGame, k: string): number => g.line[k] ?? 0;
const thousandths = (v: number): number => Math.round(v * 1000);

/** Runs in one inning for a side that scores in a share `q` of its innings. */
function inningRuns(q: number, rng: Rng): number {
  if (rng() >= q) return 0;
  let runs = 1;
  while (runs < 9 && rng() < RUN_ON) runs += 1;
  return runs;
}

/** [his side, the other side] for a side `edge` runs a game stronger. Never
 *  level: a game level after nine goes to extra innings and one side wins it. */
export function mlbScore(edge: number, home: boolean, rng: Rng, eraId: string | undefined): [number, number] {
  const mean = MLB_SCORING[eraId ?? 'now'] ?? MLB_SCORING.now;
  const park = home ? HOME_RUNS : -HOME_RUNS;
  const side = (m: number): number => {
    const q = (Math.min(MEAN_CEILING, Math.max(MEAN_FLOOR, m)) / INNINGS) * (1 - RUN_ON);
    let runs = 0;
    for (let i = 0; i < INNINGS; i += 1) runs += inningRuns(q, rng);
    return runs;
  };
  let us = side(mean + edge / 2 + park);
  let them = side(mean - edge / 2 - park);
  if (us === them) {
    const more = 1 + (rng() < 0.3 ? 1 : 0);
    if (rng() < 0.5 + (home ? 0.02 : -0.02)) us += more; else them += more;
  }
  return [us, them];
}

/** One series: an opponent's slot, the park, and how many games. */
export interface MlbSeries { slot: number; home: boolean; games: number }

/** How oddly an order of series reads: the same club in back to back series
 *  (counted heavily), and every series past four running at home or away. */
export function mlbOrderProblems(list: readonly MlbSeries[]): number {
  let bad = 0;
  let run = 1;
  for (let i = 1; i < list.length; i += 1) {
    if (list[i].slot === list[i - 1].slot) bad += 100;
    run = list[i].home === list[i - 1].home ? run + 1 : 1;
    if (run > HOME_RUN_OF_SERIES) bad += 1;
  }
  return bad;
}

/** The calmest of a few keyed shuffles of the series, then a pass that parts
 *  any club still meeting itself in back to back series (so a run of games
 *  against one club in one park is always one series long). */
function orderSeries(list: MlbSeries[], rng: Rng): MlbSeries[] {
  let best = shuffled(list, rng);
  let least = mlbOrderProblems(best);
  for (let t = 1; t < ORDER_TRIES && least > 0; t += 1) {
    const next = shuffled(list, rng);
    const bad = mlbOrderProblems(next);
    if (bad < least) { best = next; least = bad; }
  }
  const out = best.slice();
  const clash = (i: number): boolean => (i > 0 && out[i].slot === out[i - 1].slot) || (i < out.length - 1 && out[i].slot === out[i + 1].slot);
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].slot !== out[i - 1].slot) continue;
    for (let step = 1; step < out.length; step += 1) {
      const j = (i + step) % out.length;
      [out[i], out[j]] = [out[j], out[i]];
      if (!clash(i) && !clash(j)) break;
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  return out;
}

const roundsOf = (list: readonly MlbSeries[]): [number, number][][] => list.flatMap(s => Array.from({ length: s.games }, (): [number, number][] => [s.home ? [0, s.slot] : [s.slot, 0]]));

/** The slot of his interleague rival (the ledger's fifteen pairs), or -1. */
function rivalSlot(ctx: UsSeasonCtx): number {
  const pair = MLB_RIVALS.find(p => p[0] === ctx.team || p[1] === ctx.team);
  return pair ? ctx.order.indexOf(pair[0] === ctx.team ? pair[1] : pair[0]) : -1;
}

/** The series of the league's schedule formula for his club, slots by relationship
 *  (his division, the rest of his league, the other league). The counts are the
 *  ledger's; the split of thirteen games into four series is this sim's own. */
export function mlbSeriesList(ctx: UsSeasonCtx, rng: Rng): MlbSeries[] {
  const f = MLB_FORMULAS[0];
  const d = ctx.divSlots;
  const c = ctx.confSlots;
  const n = ctx.order.length;
  const list: MlbSeries[] = [];
  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
  /* a division rival: thirteen games, seven in one park and six in the other; he hosts seven against half of them */
  const [big, small] = f.division.homeOrAway;
  shuffled(range(1, d), rng).forEach((slot, k) => {
    const hosts = k < d / 2;
    list.push({ slot, home: hosts, games: big - 3 }, { slot, home: hosts, games: 3 }, { slot, home: !hosts, games: small - 3 }, { slot, home: !hosts, games: 3 });
  });
  /* the rest of his league: six games against most (a series in each park), seven against the others */
  shuffled(range(d + 1, c), rng).forEach((slot, k) => {
    const seven = k >= f.league.sixGames;
    const hostsFour = seven && (k - f.league.sixGames) % 2 === 0;
    list.push({ slot, home: true, games: seven && hostsFour ? 4 : 3 }, { slot, home: false, games: seven && !hostsFour ? 4 : 3 });
  });
  /* the other league: a series in each park with his rival, one series against each of the rest, half of them at home */
  const rival = rivalSlot(ctx);
  const per = f.rival.games / f.rival.series;
  if (rival > c) list.push({ slot: rival, home: true, games: per }, { slot: rival, home: false, games: per });
  shuffled(range(c + 1, n - 1).filter(s => s !== rival), rng).forEach((slot, k) => {
    list.push({ slot, home: k < f.interleague.homeSeries, games: f.interleague.games });
  });
  return orderSeries(list, rng);
}

export function mlbDeal(ctx: UsSeasonCtx, rng: Rng): [number, number][][] {
  return roundsOf(mlbSeriesList(ctx, rng));
}

/** A season with no league shape: series of three against unnamed opponents,
 *  half of the series at home. Every game is another slot (nobody is named, so
 *  nothing says two games were against one club); the park holds for a series. */
export function mlbDealUnnamed(games: number, rng: Rng): [number, number][][] {
  const count = Math.ceil(games / 3);
  const flags = Array.from({ length: count }, (_, i) => i < Math.floor(count / 2));
  let best = shuffled(flags, rng);
  const runs = (xs: readonly boolean[]) => { let bad = 0; let run = 1; for (let i = 1; i < xs.length; i += 1) { run = xs[i] === xs[i - 1] ? run + 1 : 1; if (run > HOME_RUN_OF_SERIES) bad += 1; } return bad; };
  let least = runs(best);
  for (let t = 1; t < ORDER_TRIES && least > 0; t += 1) {
    const next = shuffled(flags, rng);
    const bad = runs(next);
    if (bad < least) { best = next; least = bad; }
  }
  const out: [number, number][][] = [];
  for (let s = 0; s < count; s += 1) {
    for (let k = 0; k < 3 && out.length < games; k += 1) {
      const slot = out.length + 1;
      out.push([best[s] ? [0, slot] : [slot, 0]]);
    }
  }
  return out;
}

/** Every way a named season's opponents disagree with the formula. */
export function mlbDealProblems(ctx: UsSeasonCtx, games: readonly DerivedGame[]): string[] {
  const out: string[] = [];
  const f = MLB_FORMULAS[0];
  const d = ctx.divSlots;
  const c = ctx.confSlots;
  const n = ctx.order.length;
  const total = new Array<number>(n).fill(0);
  const home = new Array<number>(n).fill(0);
  for (const g of games) { total[g.opp] += 1; if (g.home) home[g.opp] += 1; }
  if (games.length !== f.games) out.push(`${games.length} games`);
  const [big, small] = f.division.homeOrAway;
  let hostsBig = 0;
  for (let s = 1; s <= d; s += 1) {
    if (total[s] !== f.division.games || (home[s] !== big && home[s] !== small)) out.push(`division rival ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
    if (home[s] === big) hostsBig += 1;
  }
  if (hostsBig * 2 !== d) out.push(`he hosts ${big} against ${hostsBig} division rivals`);
  let six = 0; let seven = 0; let sevenHome = 0;
  for (let s = d + 1; s <= c; s += 1) {
    if (total[s] === 6 && home[s] === 3) six += 1;
    else if (total[s] === 7 && (home[s] === 3 || home[s] === 4)) { seven += 1; sevenHome += home[s]; }
    else out.push(`league club ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
  }
  if (six !== f.league.sixGames || seven !== f.league.sevenGames || sevenHome !== 7) out.push(`league split ${six} at six games, ${seven} at seven (${sevenHome} of those at home)`);
  const rival = rivalSlot(ctx);
  if (rival <= c) out.push('no interleague rival');
  let homeSeries = 0;
  for (let s = c + 1; s < n; s += 1) {
    if (s === rival) { if (total[s] !== f.rival.games || home[s] !== f.rival.home) out.push(`rival ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`); continue; }
    if (total[s] !== f.interleague.games || (home[s] !== 0 && home[s] !== f.interleague.games)) out.push(`other league club ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
    if (home[s] > 0) homeSeries += 1;
  }
  if (homeSeries !== f.interleague.homeSeries) out.push(`${homeSeries} interleague series at home`);
  /* a run of games against one club in one park is one series: two to four games */
  let run = 1;
  for (let i = 1; i <= games.length; i += 1) {
    const same = i < games.length && games[i].opp === games[i - 1].opp && games[i].home === games[i - 1].home;
    if (same) { run += 1; continue; }
    if (run < 2 || run > 4) out.push(`a run of ${run} against ${ctx.order[games[i - 1].opp]}`);
    run = 1;
  }
  return out;
}

/** What the core spreads over the games he played: sums only. A home run is
 *  NOT handed to the core as a floor on his team's score: the core lifts a
 *  score to a floor after the score law has spoken, and in a game of four
 *  runs a side that turns a 0-1 into a 1-1, a level game, which a ball game
 *  never is. `finish` keeps his home runs inside his team's runs instead. */
function totals(row: UsRow): StatTotal[] {
  const out: StatTotal[] = [];
  for (const t of SUMS) {
    const v = num(row[t.key]);
    if (v === null) continue;
    out.push({ key: t.key, kind: 'sum', total: v, perGameCap: t.cap, formPower: FORM_POWER });
  }
  return out;
}

/** Whole numbers moved one at a time onto `total`: up into a keyed game with
 *  room (by `weight`), down out of a keyed game above its minimum. false: the
 *  minimums or the caps cannot hold the total. */
function settle(x: number[], total: number, mins: readonly number[], caps: readonly number[], weight: (i: number) => number, rng: Rng): boolean {
  let sum = x.reduce((a, b) => a + b, 0);
  const pick = (w: number[]): number => {
    const all = w.reduce((a, b) => a + b, 0);
    if (!(all > 0)) return -1;
    let at = rng() * all;
    for (let i = 0; i < w.length; i += 1) { at -= w[i]; if (at < 0) return i; }
    return w.findIndex(v => v > 0);
  };
  while (sum < total) {
    const i = pick(x.map((v, k) => (v < caps[k] ? Math.max(1e-6, weight(k)) : 0)));
    if (i < 0) return false;
    x[i] += 1; sum += 1;
  }
  while (sum > total) {
    const i = pick(x.map((v, k) => (v > mins[k] ? v - mins[k] : 0)));
    if (i < 0) return false;
    x[i] -= 1; sum -= 1;
  }
  return true;
}

/** His season's at bats and hits: whole numbers whose quotient rounds to the
 *  saved average at three places, with at least `extra` hits (his home runs
 *  and doubles are hits), the at bats as near a keyed 3.5 to 4.0 a game as the
 *  average allows and never outside 2.2 to 4.5. null: no such pair. */
export function mlbAtBats(games: number, avg: number, extra: number, rng: Rng): { ab: number; h: number } | null {
  const want = Math.round(games * (3.5 + 0.5 * rng()));
  const lo = Math.ceil(games * AB_LOW);
  const hi = Math.floor(games * AB_HIGH);
  const target = thousandths(avg);
  const fit = (ab: number): number | null => {
    if (ab < lo || ab > hi || ab < 1) return null;
    for (const h of [Math.round(avg * ab), Math.round(avg * ab) + 1, Math.round(avg * ab) - 1]) {
      if (h >= extra && h >= 0 && h <= ab && thousandths(h / ab) === target) return h;
    }
    return null;
  };
  for (let step = 0; step <= hi - lo; step += 1) {
    for (const ab of step === 0 ? [want] : [want + step, want - step]) {
      const h = fit(ab);
      if (h !== null) return { ab, h };
    }
  }
  return null;
}

/** A weight that clumps: most innings (or games) get little, a few get a lot. */
const clumpy = (rng: Rng): number => { const x = -Math.log(Math.max(rng(), 1e-9)); return x * x; };

/** Was the game level after nine? Only a one run game can have been. */
export function mlbWentExtra(g: DerivedGame): boolean {
  return g.events.some(e => e.min === EXTRA);
}

/** One game's innings as the clock's events: each side's runs by inning add up
 *  to the score; the home side does not bat in the ninth when it leads; a game
 *  sent past the ninth was level after nine and the winner scores the one run
 *  after it; a home run of his is in an inning his side scores in. null: the
 *  score cannot be laid out (it never should be: his home runs are under his
 *  team's runs by the core's own floor). */
function layInnings(g: DerivedGame, extra: boolean, rng: Rng): SeasonEvent[] | null {
  const usWon = g.us > g.them;
  const homeWon = g.home === usWon;
  const hr = g.played ? of(g, 'hr') : 0;
  const events: SeasonEvent[] = [];
  for (const side of ['us', 'them'] as const) {
    const score = side === 'us' ? g.us : g.them;
    const won = side === 'us' ? usWon : !usWon;
    const isHome = side === 'us' ? g.home : !g.home;
    /* runs by the end of the ninth, and how many innings this side batted in */
    const nine = extra && won ? score - 1 : score;
    const innings = !extra && isHome && homeWon ? INNINGS - 1 : INNINGS;
    const mine = side === 'us' ? hr : 0;
    /* his home runs: one scoring inning each, the last of them after the ninth when nine innings cannot hold them */
    const inNine = Math.min(mine, nine, innings);
    const late = mine - inNine;
    if (late > (extra && won ? 1 : 0)) return null;
    const slots = shuffled(Array.from({ length: innings }, (_, i) => i), rng).slice(0, inNine);
    const mins = Array.from({ length: innings }, (_, i) => (slots.includes(i) ? 1 : 0));
    const runs = splitTotal(nine, Array.from({ length: innings }, () => clumpy(rng)), Array.from({ length: innings }, () => nine), mins);
    if (!runs) return null;
    runs.forEach((pts, i) => {
      if (slots.includes(i)) events.push({ min: i + 1, kind: 'hr', side, mine: true });
      if (pts > 0) events.push({ min: i + 1, kind: 'inning', side, pts });
    });
    if (extra && won) {
      if (late > 0) events.push({ min: EXTRA, kind: 'hr', side, mine: true });
      events.push({ min: EXTRA, kind: 'inning', side, pts: 1 });
    }
  }
  /* inning by inning, the visitors bat first; his home run comes before the runs it is part of */
  const away: 'us' | 'them' = g.home ? 'them' : 'us';
  return events.sort((a, b) => a.min - b.min || (a.side === b.side ? (a.kind === b.kind ? 0 : a.kind === 'hr' ? -1 : 1) : a.side === away ? -1 : 1));
}

/** His at bats, hits and runs batted in for every game he played, and every game's innings. */
function finish(games: DerivedGame[], row: UsRow, _pos: string, rng: Rng): boolean {
  const avg = num(row.avg);
  const rbi = num(row.rbi);
  if (avg === null || rbi === null || !Number.isInteger(rbi) || rbi < 0) return false;
  /* a line the engine played on another length is not this view's season */
  if (num(row.slate) !== null && row.slate !== mlbViewGames()) return false;
  const on = games.filter(g => g.played);
  /* his home runs stay inside his team's runs: a line his team's runs cannot hold changes places with a
     line they can (two games he played exchange their whole lines, which keeps every total and every cap) */
  for (const g of on) {
    if (of(g, 'hr') <= g.us) continue;
    const others = on.filter(x => x !== g && of(x, 'hr') <= g.us && of(g, 'hr') <= x.us);
    if (others.length === 0) return false;
    const x = others[Math.floor(rng() * others.length)];
    [g.line, x.line] = [x.line, g.line];
  }
  const need = on.map(g => of(g, 'hr') + of(g, 'doubles'));
  const fit = mlbAtBats(on.length, avg, need.reduce((a, b) => a + b, 0), rng);
  if (!fit) return false;
  const ab = splitTotal(fit.ab, on.map(() => 0.8 + 0.4 * rng()), on.map(() => AB_MAX), need.map(x => Math.max(1, x)));
  if (!ab) return false;
  /* hits: each at bat a keyed try at his average, then moved one at a time onto the season's hits */
  const hits = ab.map((n, i) => { let h = 0; for (let k = 0; k < n; k += 1) if (rng() < avg) h += 1; return Math.min(n, Math.max(need[i], h)); });
  if (!settle(hits, fit.h, need, ab, i => ab[i] - hits[i], rng)) return false;
  /* runs batted in: at least his home runs, at most his team's runs that game, likelier on a day he hits */
  const room = on.map(g => Math.min(g.us, RBI_MAX));
  const floor = on.map(g => of(g, 'hr'));
  const driven = floor.slice();
  if (driven.some((v, i) => v > room[i])) return false;
  if (!settle(driven, rbi, floor, room, i => (room[i] - driven[i]) * (hits[i] > 0 ? 1 : 0.25), rng)) return false;
  on.forEach((g, i) => { g.line.ab = ab[i]; g.line.h = hits[i]; g.line.rbi = driven[i]; });
  for (const g of games) {
    /* drawn for every game, so the rule never moves another game's innings */
    const u = rng();
    const extra = Math.abs(g.us - g.them) === 1 && u < EXTRA_SHARE;
    const events = layInnings(g, extra, rng);
    if (!events) return false;
    g.events = events;
  }
  return true;
}

/** Every way a derived season disagrees with the saved line or with baseball. */
function check(row: UsRow, _pos: string, s: DerivedSeason, ctx: UsSeasonCtx): string[] {
  const out: string[] = [];
  const on = s.games.filter(g => g.played);
  const sum = (k: string) => on.reduce((a, g) => a + of(g, k), 0);
  for (const k of ['hr', 'doubles', 'sb', 'rbi']) {
    const want = num(row[k]);
    if (want !== null && sum(k) !== want) out.push(`${k} ${sum(k)} != ${want}`);
  }
  const avg = num(row.avg);
  const ab = sum('ab');
  if (avg === null || ab < 1 || thousandths(sum('h') / ab) !== thousandths(avg)) out.push(`hits ${sum('h')} over at bats ${ab} is not ${avg}`);
  if (on.length && (ab < Math.ceil(on.length * AB_LOW) || ab > Math.floor(on.length * AB_HIGH))) out.push(`${ab} at bats in ${on.length} games`);
  for (const g of s.games) {
    if (g.us === g.them) out.push(`game ${g.md}: level`);
    const inning = (side: 'us' | 'them', min: number) => g.events.filter(e => e.kind === 'inning' && e.side === side && e.min === min).reduce((a, e) => a + (e.pts ?? 0), 0);
    const through = (side: 'us' | 'them', last: number) => g.events.filter(e => e.kind === 'inning' && e.side === side && e.min <= last).reduce((a, e) => a + (e.pts ?? 0), 0);
    if (through('us', EXTRA) !== g.us || through('them', EXTRA) !== g.them) out.push(`game ${g.md}: the innings do not add up to ${g.us}-${g.them}`);
    if (g.events.some(e => e.min < 1 || e.min > EXTRA || !Number.isInteger(e.min))) out.push(`game ${g.md}: an inning off the clock`);
    const homeSide: 'us' | 'them' = g.home ? 'us' : 'them';
    const awaySide: 'us' | 'them' = g.home ? 'them' : 'us';
    if (mlbWentExtra(g)) {
      if (through('us', INNINGS) !== through('them', INNINGS)) out.push(`game ${g.md}: past the ninth and not level after nine`);
      if (inning('us', EXTRA) > 0 && inning('them', EXTRA) > 0) out.push(`game ${g.md}: both sides score after the ninth`);
    } else if (through(homeSide, INNINGS) > through(awaySide, INNINGS) && inning(homeSide, INNINGS) > 0) {
      out.push(`game ${g.md}: the home side bats in a ninth it led`);
    }
    const homers = g.events.filter(e => e.kind === 'hr');
    if (homers.some(e => e.side !== 'us' || !e.mine)) out.push(`game ${g.md}: a home run that is not his`);
    if (homers.length !== (g.played ? of(g, 'hr') : 0)) out.push(`game ${g.md}: ${homers.length} home runs in the feed for ${g.played ? of(g, 'hr') : 0} on his line`);
    for (const e of homers) if (inning('us', e.min) < homers.filter(x => x.min === e.min).length) out.push(`game ${g.md}: a home run in an inning his side does not score in`);
    if (!g.played) { if (Object.keys(g.line).length) out.push(`game ${g.md}: a line in a game he missed`); continue; }
    const [gab, gh, ghr, g2b, grbi] = [of(g, 'ab'), of(g, 'h'), of(g, 'hr'), of(g, 'doubles'), of(g, 'rbi')];
    if (!Number.isInteger(gab) || gab < 1 || gab > AB_MAX) out.push(`game ${g.md}: ${gab} at bats`);
    if (!Number.isInteger(gh) || gh < ghr + g2b || gh > gab) out.push(`game ${g.md}: ${gh} hits in ${gab} at bats with ${ghr} home runs and ${g2b} doubles`);
    if (!Number.isInteger(grbi) || grbi < ghr || grbi > g.us || grbi > RBI_MAX) out.push(`game ${g.md}: ${grbi} RBI with ${ghr} home runs in a game his team scores ${g.us}`);
  }
  if (ctx.shape) out.push(...mlbDealProblems(ctx, s.games));
  return out;
}

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const inningLabel = (m: number): string => (m >= EXTRA ? 'EXT' : ORDINAL[Math.min(INNINGS, Math.max(1, Math.floor(m)))]);
const inningWords = (m: number): string => (m >= EXTRA ? 'in extra innings' : `in the ${inningLabel(m)}`);
const count = (n: number, word: string): string => (n === 1 ? word : `${n} ${word}`);
/** ".287", the way a batting average is printed. */
export const mlbAvgText = (h: number, ab: number): string => (ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '-');

/** "2 for 4 with a home run and 3 RBI". */
function gameWords(g: DerivedGame): string {
  const bits: string[] = [];
  const hr = of(g, 'hr'); const d = of(g, 'doubles'); const rbi = of(g, 'rbi'); const sb = of(g, 'sb');
  if (hr) bits.push(hr === 1 ? 'a home run' : `${hr} home runs`);
  if (d) bits.push(d === 1 ? 'a double' : `${d} doubles`);
  if (rbi) bits.push(`${rbi} RBI`);
  if (sb) bits.push(sb === 1 ? 'a steal' : `${sb} steals`);
  const tail = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}` : bits[0];
  return `${of(g, 'h')} for ${of(g, 'ab')}${tail ? ` with ${tail}` : ''}`;
}

/** The year's own postseason: the engine's result words for that year and the
 *  ledger's rounds. A year with no wild card round has one band and one round
 *  fewer. Only a season from the ledger's format year on has every round's
 *  length, and only those draw a path (`pathFrom`). */
function formatOf(year: number): UsSeasonFormat {
  const results = mlbPlayoffResults(year);
  const rounds = postseasonRounds('mlb', year);
  const skip = Math.max(0, MLB_PLAYOFF_LADDER.length - results.length);
  const names = MLB_PLAYOFF_FORMAT.rounds.slice(MLB_PLAYOFF_FORMAT.rounds.length - rounds.length);
  return {
    results,
    bands: [BANDS[0], ...BANDS.slice(1 + skip)],
    rounds: rounds.map((r, i) => r.name ?? names[i]),
    series: rounds.every(r => r.series !== null) ? rounds.map(r => r.series as readonly [number, number]) : null,
  };
}

/** The league's shape for the present day era from the season the ledger's divisions were read for. */
function shapeOf(eraId: string | undefined, year: number): UsShape | null {
  return (eraId ?? 'now') === 'now' && year >= SHAPE_FROM ? { formula: { kind: 'mlb162' }, divisions: MLB_DIVISIONS_2026 } : null;
}

/** Why a season with a postseason shows no path, or null. */
function noPathNote(row: UsRow): string | null {
  if (!formatOf(row.year).results.includes(row.teamResult)) return null;
  if (row.year < MLB_PLAYOFF_FORMAT.from) return `The playoff path starts with the ${MLB_PLAYOFF_FORMAT.from} season, when the playoffs took today's shape.`;
  return "No playoff path for this season: the playoff games on your season card do not fit today's rounds.";
}

export const MLB_SEASON: UsSeasonBind = {
  slug: 'mlb',
  league: 'MLB',
  fullSeason: MLB_FORMULAS[0].games,
  realLength: (year, team, eraId) => mlbRealGames(year, team, eraId),
  heldLine: (year, team, eraId) => mlbHeldLine(year, team, eraId),
  heldFor: pos => mlbHeldPos(pos),
  shapeOf,
  formatOf,
  /* the ledger holds every round's length from its format year on, and the saved games must fit them */
  pathFrom: MLB_PLAYOFF_FORMAT.from,
  pathNeedsFit: true,
  /* that the World Series is the only round against the other league is one source in the ledger (thin),
     so a round is not placed in a league and nobody is named */
  pathNamed: false,
  missed: MLB_MISSED_PLAYOFFS,
  results: MLB_PLAYOFF_LADDER,
  bands: BANDS,
  series: MLB_PLAYOFF_FORMAT.series,
  rounds: MLB_PLAYOFF_FORMAT.rounds,
  cap: 30,
  seasonLabel: year => String(year),
  /* all six enter the key, laid out or not, so a different saved line is a different season */
  statKeys: () => ['avg', 'hr', 'rbi', 'sb', 'doubles', 'obp'],
  teamIds: eraId => mlbEraTeamIds(eraId),
  score: mlbScore,
  /* the margin of one game has a standard deviation of about four runs, so a logistic of 2.5 a unit lands
     the share of wins (to be retuned from the repairs scripts/simUsSeasonCentre.mjs measures) */
  strengthFor: share => { const p = Math.min(0.98, Math.max(0.02, share)); return 2.5 * Math.log(p / (1 - p)); },
  oppSpread: 0.6,
  totals: row => totals(row),
  /* the line does not say why a game was missed (a bench season and a hurt one overlap), so nothing is claimed */
  availability: row => ({ played: row.games, block: 0, severe: false }),
  meanBase: () => 0,
  deal: mlbDeal,
  dealUnnamed: mlbDealUnnamed,
  finish,
  check,
  view: {
    words: { round: 'Game', title: 'Season Center', unnamed: 'another team' },
    copy: {
      start: '▶ Play ball', lastBadge: 'LAST GAME', lastHead: 'Last game', lastBody: () => 'The last game of the regular season.',
      best: 'Best game', bestSoFar: 'Best so far', scope: 'Regular season, the same numbers as your season card.',
      soFarHead: 'Season so far', tie: 'T', list: 'Schedule', side: 'Record',
    },
    clock: { length: EXTRA, label: inningLabel, start: 'First pitch.', end: 'Final', endShort: 'FINAL' },
    eventWords: (e, us, them) => (e.kind === 'hr'
      ? `💥 You go deep ${inningWords(e.min)}`
      : `⚾ ${e.side === 'us' ? us : them} put ${e.pts ?? 0} on the board ${inningWords(e.min)}`),
    missed: () => 'Did not play',
    /* the hits and at bats are the chip, printed first, so the bits are the rest of his line */
    lineOf: g => [
      ...(of(g, 'hr') ? [count(of(g, 'hr'), 'HR')] : []),
      ...(of(g, 'rbi') ? [`${of(g, 'rbi')} RBI`] : []),
      ...(of(g, 'doubles') ? [count(of(g, 'doubles'), '2B')] : []),
      ...(of(g, 'sb') ? [count(of(g, 'sb'), 'SB')] : []),
    ],
    markOf: g => of(g, 'h') + 2 * of(g, 'hr') + of(g, 'doubles') + of(g, 'rbi'),
    markChip: g => `${of(g, 'h')}-${of(g, 'ab')}`,
    markText: g => gameWords(g),
    soFar: so => [['Played', String(so.apps)], ['AVG', mlbAvgText(so.h ?? 0, so.ab ?? 0)], ['HR', String(so.hr ?? 0)], ['RBI', String(so.rbi ?? 0)]],
    half: (so, _pos, row) => {
      if (!so.apps) return 'First half: you did not play a game.';
      const hr = so.hr ?? 0;
      const star = row && Array.isArray(row.awards) && row.awards.includes('All-Star') ? ' You are an All-Star this year.' : '';
      return `First half: ${so.apps === 1 ? '1 game' : `${so.apps} games`}, ${mlbAvgText(so.h ?? 0, so.ab ?? 0)} with ${hr === 1 ? '1 home run' : `${hr} home runs`}.${star}`;
    },
    tileLabels: { 'Batting average': 'AVG', 'Home runs': 'HR', 'Runs batted in': 'RBI' },
    groupWords: ['Division', 'League'],
    noPathNote,
    help: (named, opp) => usHelp({
      named, games: MLB_FORMULAS[0].games, bands: BANDS,
      whoWhen: 'How the games are grouped into series, which series falls where and which park a league series is played in',
      playoffNote: `Every October here starts at the first round: this career has no first round bye. The path shows each round and its score, not who you played. A season before ${MLB_PLAYOFF_FORMAT.from} shows no playoff path, because the playoffs had a different shape then, and a season whose playoff games do not fit today's rounds shows none either.`,
      examples: [
        { head: 'A game', body: `Game 41, at home to ${named && opp ? `the ${opp}` : 'another team'}. You win 6-4 and go 2 for 4 with a home run and 3 RBI. Your record goes to 24-17.` },
        { head: 'Your numbers', body: 'Your season card says .287 with 24 home runs and 81 RBI. Every home run, RBI, double and steal here adds up to exactly that, and your hits over your at bats round to .287. Walks are not dealt game by game, so your on base percentage is the one on your card.' },
        { head: 'Series', body: `Baseball is played in series: a few games in a row against one club in one park. ${named ? 'You meet each division rival 13 times, and how often you meet everybody else follows the league formula too.' : 'Here each series is three games.'} A game you sat out reads Did not play.` },
        { head: 'The innings', body: 'The clock runs inning by inning. Each line is the runs a side put up in that inning, and a home run of yours is called out in the inning it came in. A game still level after nine is settled in extra innings, shown as one last mark.' },
        { head: 'All-Star', body: 'If your season card has an All-Star on it, the halfway point tells you so.' },
      ],
    }),
  },
};
