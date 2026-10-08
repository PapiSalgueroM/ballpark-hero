/* Round 1048: the NBA's number file for the US Season Center
   (src/lib/season/us.ts binds it to the season core).

   What is the engine's: games played, points a game (a whole number), rebounds
   and assists a game (one decimal), the team result and the playoff numbers,
   all read from the saved line. What is THIS SIM'S OWN, and said so in the
   "?": the record bands, the score law, the per game spread, who he meets on
   which night, every score and every stat line.

   Real and two sourced (src/data/usLeagueShape.ts): the divisions, the
   league's standard 82 game formula, and the league scoring mean of each era.

   No React, no Math.random. The engine import is the two exported result
   words and the era's team ids (the engine is already in the route's chunk). */
import { shuffled, type DerivedGame, type DerivedSeason, type Rng, type SeasonEvent, type StatTotal } from './core';
import { splitTotal, usHelp, type UsRow, type UsSeasonBind, type UsSeasonCtx } from './us';
import { NBA_MISSED_PLAYOFFS, NBA_PLAYOFF_RESULTS, nbaEraTeamIds } from '../nbaMyCareer';
import { NBA_SCORING } from '@/data/usLeagueShape';
import { usSeasonHeldLine, usSeasonLabel, usSeasonLength } from '@/data/usSeasonLengths';

const GAMES = 82;
/** Wins this career's rule gives each result: missed, then the five results in depth order. */
const BANDS = [[17, 40], [41, 52], [45, 57], [48, 61], [50, 64], [52, 67]] as const;
const FLOOR = 72;
const CEILING = 160;
const QUARTERS = ['first', 'second', 'third', 'fourth'] as const;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** A standard normal from two uniforms (Box and Muller). */
function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** [his side, the other side] for a side `edge` net points stronger. Never level. */
export function nbaScore(edge: number, home: boolean, rng: Rng, eraId: string | undefined): [number, number] {
  const mean = NBA_SCORING[eraId ?? 'now'] ?? NBA_SCORING.now;
  const court = home ? 1.5 : -1.5;
  const clamp = (v: number) => Math.min(CEILING, Math.max(FLOOR, Math.round(v)));
  let us = clamp(mean + edge / 2 + court + 9.5 * normal(rng));
  let them = clamp(mean - edge / 2 - court + 9.5 * normal(rng));
  if (us === them) {
    /* overtime: one side pulls away */
    const extra = 5 + Math.floor(rng() * 8);
    if (rng() < 0.5) us += extra; else them += extra;
  }
  return [us, them];
}

/** The 82 games of the league's standard formula for his team, slots by relationship. */
export function nbaDeal(ctx: UsSeasonCtx, rng: Rng): [number, number][][] {
  const d = ctx.divSlots;
  const c = ctx.confSlots;
  const n = ctx.order.length;
  const list: [number, boolean][] = [];
  const add = (slot: number, home: number, away: number) => {
    for (let i = 0; i < home; i += 1) list.push([slot, true]);
    for (let i = 0; i < away; i += 1) list.push([slot, false]);
  };
  for (let s = 1; s <= d; s += 1) add(s, 2, 2);
  const rest = shuffled(Array.from({ length: c - d }, (_, i) => d + 1 + i), rng);
  rest.slice(0, 6).forEach(s => add(s, 2, 2));
  /* the four he meets three times: a keyed two of them twice at home */
  rest.slice(6).forEach((s, k) => (k < 2 ? add(s, 2, 1) : add(s, 1, 2)));
  for (let s = c + 1; s < n; s += 1) add(s, 1, 1);
  return shuffled(list, rng).map(([slot, home]): [number, number][] => [home ? [0, slot] : [slot, 0]]);
}

/** Every way a named season's opponents disagree with the formula. */
export function nbaDealProblems(ctx: UsSeasonCtx, games: readonly DerivedGame[]): string[] {
  const out: string[] = [];
  const n = ctx.order.length;
  const total = new Array(n).fill(0);
  const home = new Array(n).fill(0);
  for (const g of games) { total[g.opp] += 1; if (g.home) home[g.opp] += 1; }
  for (let s = 1; s <= ctx.divSlots; s += 1) if (total[s] !== 4 || home[s] !== 2) out.push(`division rival ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
  let four = 0; let three = 0; let threeTwice = 0;
  for (let s = ctx.divSlots + 1; s <= ctx.confSlots; s += 1) {
    if (total[s] === 4 && home[s] === 2) four += 1;
    else if (total[s] === 3 && (home[s] === 1 || home[s] === 2)) { three += 1; if (home[s] === 2) threeTwice += 1; }
    else out.push(`conference team ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
  }
  if (four !== 6 || three !== 4 || threeTwice !== 2) out.push(`conference split ${four} at four games, ${three} at three (${threeTwice} with two at home)`);
  for (let s = ctx.confSlots + 1; s < n; s += 1) if (total[s] !== 2 || home[s] !== 1) out.push(`other conference team ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
  if (games.filter(g => g.home).length !== GAMES / 2) out.push('home games are not 41');
  return out;
}

function totals(row: UsRow): StatTotal[] {
  const out: StatTotal[] = [];
  const ppg = num(row.ppg); const rpg = num(row.rpg); const apg = num(row.apg);
  if (ppg !== null) out.push({ key: 'pts', kind: 'mean', mean: ppg, dp: 0, perGame: 'int', min: 0, max: Math.min(70, Math.round(ppg * 2.3) + 6) });
  if (rpg !== null) out.push({ key: 'reb', kind: 'mean', mean: rpg, dp: 1, perGame: 'int', min: 0, max: Math.round(rpg * 2.5) + 4 });
  if (apg !== null) out.push({ key: 'ast', kind: 'mean', mean: apg, dp: 1, perGame: 'int', min: 0, max: Math.round(apg * 2.5) + 4 });
  return out;
}

/** A night the feed may call a takeover: at least 20 points AND at least 1.3
 *  times his season average, in a game his team won. This sim's own rule, so
 *  the words are earned: a bench player's 4 point night and a big night in a
 *  loss never read as one. */
export function nbaTakeover(pts: number, ppg: number, won: boolean): boolean {
  return won && pts >= 20 && pts >= 1.3 * ppg;
}

/** The board by quarter for every game, and his big nights in the feed. */
function finish(games: DerivedGame[], row: UsRow, _pos: string, rng: Rng): boolean {
  const ppg = num(row.ppg) ?? Infinity;
  for (const g of games) {
    const events: SeasonEvent[] = [];
    for (const side of ['us', 'them'] as const) {
      const score = side === 'us' ? g.us : g.them;
      const q = splitTotal(score, [0.8 + 0.4 * rng(), 0.8 + 0.4 * rng(), 0.8 + 0.4 * rng(), 0.8 + 0.4 * rng()], [score, score, score, score], [12, 12, 12, 12]);
      if (!q) return false;
      q.forEach((pts, i) => events.push({ min: 12 * (i + 1), kind: 'quarter', side, pts }));
    }
    /* the quarter is drawn for every game, so moving the rule never moves another game's numbers */
    const quarter = 1 + Math.floor(rng() * 4);
    if (g.played && nbaTakeover(g.line.pts ?? 0, ppg, g.us > g.them)) events.push({ min: 12 * quarter - 1, kind: 'hot', side: 'us', mine: true });
    g.events = events.sort((a, b) => a.min - b.min || (a.side === b.side ? 0 : a.side === 'us' ? -1 : 1));
  }
  return true;
}

function check(row: UsRow, _pos: string, s: DerivedSeason, ctx: UsSeasonCtx): string[] {
  const out: string[] = [];
  for (const g of s.games) {
    if (g.us === g.them) out.push(`game ${g.md}: level`);
    if (g.us < FLOOR || g.them < FLOOR) out.push(`game ${g.md}: a side under ${FLOOR}`);
    if (g.played && (g.line.pts ?? 0) >= g.us) out.push(`game ${g.md}: his points are not below his team's`);
    const q = g.events.filter(e => e.kind === 'quarter');
    if (q.length !== 8 || q.some(e => (e.pts ?? 0) < 12)) out.push(`game ${g.md}: not eight quarters of twelve or more`);
  }
  if (ctx.shape) out.push(...nbaDealProblems(ctx, s.games));
  return out;
}

const per = (sum: number | undefined, apps: number) => (apps ? ((sum ?? 0) / apps).toFixed(1) : '-');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const NBA_SEASON: UsSeasonBind = {
  slug: 'nba',
  league: 'NBA',
  fullSeason: GAMES,
  realLength: year => usSeasonLength('nba', year),
  heldLine: year => usSeasonHeldLine('nba', year),
  missed: NBA_MISSED_PLAYOFFS,
  results: NBA_PLAYOFF_RESULTS,
  bands: BANDS,
  /* every round is a best of seven: four wins, seven games at most */
  series: [[4, 7], [4, 7], [4, 7], [4, 7]],
  rounds: ['First round', 'Conference semifinals', 'Conference finals', 'NBA Finals'],
  cap: 175,
  seasonLabel: year => usSeasonLabel('nba', year),
  statKeys: () => ['ppg', 'rpg', 'apg'],
  teamIds: eraId => nbaEraTeamIds(eraId),
  score: nbaScore,
  /* the margin of one game has a standard deviation of about 13.4 points, so a
     logistic of 7.9 a unit lands the share of wins (retuned from the repairs
     scripts/simUsSeasonCentre.mjs measures) */
  strengthFor: share => { const p = Math.min(0.98, Math.max(0.02, share)); return 7.9 * Math.log(p / (1 - p)); },
  oppSpread: 6,
  totals: row => totals(row),
  /* the engine's own ranges: 74 games or fewer is an injury season (one run of
     missed games), 75 or more is a healthy one whose few missed games are rest */
  availability: row => (row.games <= 74
    ? { played: row.games, block: Math.max(0, GAMES - row.games), severe: false }
    : { played: row.games, block: 0, severe: false }),
  meanBase: (key, g, row, u) => {
    const mean = num(key === 'pts' ? row.ppg : key === 'reb' ? row.rpg : row.apg) ?? 0;
    const base = mean * (0.55 + 0.9 * u);
    /* he starts inside his team's score, and scores a touch more in a win */
    return key === 'pts' ? Math.min(base + (g.us > g.them ? 0.4 : -0.4), 0.45 * g.us) : base;
  },
  deal: nbaDeal,
  finish,
  check,
  view: {
    words: { round: 'Game', title: 'Season Center', unnamed: 'another team' },
    copy: {
      start: '▶ Tip off', lastBadge: 'LAST GAME', lastHead: 'Last game', lastBody: () => 'The last game of the regular season.',
      best: 'Best game', bestSoFar: 'Best so far', scope: 'Regular season, the same numbers as your season card.',
      soFarHead: 'Season so far', tie: 'T', list: 'Schedule', side: 'Record',
    },
    clock: { length: 48, label: m => `Q${Math.max(1, Math.ceil(m / 12))}`, start: 'Tip off.', end: 'Final', endShort: 'FINAL' },
    eventWords: (e, us, them) => (e.kind === 'quarter'
      ? `🏀 ${e.side === 'us' ? us : them} put up ${e.pts ?? 0} in the ${QUARTERS[Math.min(3, Math.max(0, Math.round(e.min / 12) - 1))]}`
      : `🔥 You take over in the ${QUARTERS[Math.min(3, Math.max(0, Math.ceil(e.min / 12) - 1))]}`),
    missed: why => (why === 'injured' ? 'Out: injured' : 'Did not play: rest'),
    /* the points are the chip, printed first, so the bits are the rest of his line */
    lineOf: g => [`${g.line.reb ?? 0} REB`, `${g.line.ast ?? 0} AST`],
    markOf: g => (g.line.pts ?? 0) + (g.line.reb ?? 0) + (g.line.ast ?? 0),
    markChip: g => `${g.line.pts ?? 0} PTS`,
    markText: g => `${plural(g.line.pts ?? 0, 'point', 'points')}, ${plural(g.line.reb ?? 0, 'rebound', 'rebounds')}, ${plural(g.line.ast ?? 0, 'assist', 'assists')}`,
    soFar: so => [['Played', String(so.apps)], ['PPG', per(so.pts, so.apps)], ['RPG', per(so.reb, so.apps)], ['APG', per(so.ast, so.apps)]],
    half: so => (so.apps ? `First half: ${plural(so.apps, 'game', 'games')}, ${per(so.pts, so.apps)} points a game` : 'First half: you did not play a game.'),
    tileLabels: { 'Points per game': 'PPG', 'Rebounds per game': 'RPG', 'Assists per game': 'APG' },
    help: (named, opp) => usHelp({
      named, games: GAMES, bands: BANDS,
      examples: [
        { head: 'A game', body: `Game 12, at home to ${named && opp ? `the ${opp}` : 'another team'}. You win 112-104 and put up 31 points, 8 rebounds and 6 assists. Your record goes to 8-4.` },
        { head: 'Your averages', body: 'Your season card says 25 points a game over 80 games. Add up every game here, divide by 80, and it rounds to 25. Same for rebounds and assists.' },
        { head: 'The playoffs', body: 'Your card says you lost in the conference semis after 11 playoff games. The path shows two rounds that add up to 11: a 4-2 win, then a 1-4 loss.' },
      ],
    }),
  },
};
