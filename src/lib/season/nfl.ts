/* Round 1147: the NFL's number file for the US Season Center
   (src/lib/season/us.ts binds it to the season core, the way nba.ts is bound).

   What is the engine's: games played, every stat total of his position, the
   team result and the playoff numbers, all read from the saved line. What is
   THIS SIM'S OWN, and said so in the "?": the record bands, the score law,
   the per game caps, how his totals fall game by game, who he meets on which
   week, every score and every drive.

   Real and two sourced (src/data/usLeagueShape.ts): the divisions, the
   league's 17 game formula and which conference hosts the 17th game.

   How a game is laid out. The core spreads his whole number totals (his
   touchdowns hold his team's score up: a touchdown of his is a seven point
   drive here) and accepts the scores. `finish` then lays out what hangs off
   the game: his yards and catches, a kicker's field goals (every field goal
   his team makes in a game he plays is his, so the makes must EQUAL the
   field goals in that score), the sacks in tenths, and both sides' scoring
   drives minute by minute. A game can end level (his floor can lift his side
   onto the other side's score): a tie is not a win, and the record says so.

   No React, no Math.random. The engine import is the two exported result
   words and the era's team list (the engine is already in the route's chunk). */
import { shuffled, type DerivedGame, type DerivedSeason, type Rng, type SeasonEvent, type StatTotal } from './core';
import { splitTotal, usHelp, type UsRow, type UsSeasonBind, type UsSeasonCtx } from './us';
import { NFL_MISSED_PLAYOFFS, NFL_PLAYOFF_RESULTS, nflEraById } from '../nflMyCareer';
import { formatNumber } from '../formatNumber';
import { nflHosts17 } from '@/data/usLeagueShape';
import { usSeasonHeldLine, usSeasonLabel, usSeasonLength } from '@/data/usSeasonLengths';

const GAMES = 17;
/** Wins this career's rule gives each result: missed, then the five results in depth order. A tie is not a win. */
const BANDS = [[2, 9], [9, 12], [10, 13], [11, 14], [11, 15], [11, 15]] as const;
const CAP = 70;
/** The most field goals one side is given in a game. */
const MAX_FG = 6;
const CLOCK = 60;
/** Every stat field of the engine's season line, in its declared order. */
const STAT_KEYS = ['passYds', 'passTd', 'ints', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'tackles', 'sacks', 'picks', 'passDef', 'forcedFum', 'fgMade', 'fgAtt', 'longFg'] as const;
/** The stat whose touchdowns are his, by position. */
const TD_KEY: Record<string, string> = { QB: 'passTd', RB: 'rushTd', WR: 'recTd', TE: 'recTd' };

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The drives a side has in a game, and the most of them that may end in a
 *  touchdown (nine sevens and a field goal are 66, and the three a level
 *  game adds keeps a side at 69 or under: never past the cap). */
const DRIVES = 10;
const MAX_TD = 9;
/** A drive ends in a touchdown 26 times in 100 at even strength (2.6 a game)
 *  and in a field goal about 14 (1.445 a game): 22.5 points a team game. */
const TD_A_GAME = 2.6;
const FG_A_DRIVE = 0.1445;

/** [his side, the other side] for a side `edge` stronger. Each side has ten
 *  drives; a drive ends in a touchdown (seven), a field goal (three) or
 *  nothing, so a side's score scatters like a football score does (a Poisson
 *  count of touchdowns put 49 or more on the board far too often). A lone
 *  field goal becomes two (so no repair of the core's can make a 4, which no
 *  drive list can), and the law itself never returns a level game. */
export function nflScore(edge: number, home: boolean, rng: Rng): [number, number] {
  const venue = home ? 1 : -1;
  const side = (e: number) => {
    const p = Math.min(0.6, Math.max(0.06, (TD_A_GAME + 0.05 * e) / DRIVES));
    let td = 0;
    let fg = 0;
    for (let i = 0; i < DRIVES; i += 1) {
      const u = rng();
      if (u < p) { if (td < MAX_TD) td += 1; } else if (u < p + FG_A_DRIVE) fg += 1;
    }
    const pts = 7 * td + 3 * fg;
    return pts === 3 ? 6 : pts;
  };
  let us = side(edge + venue);
  let them = side(-edge - venue);
  if (us === them) {
    const more = us === 0 ? 7 : 3;
    if (home) us += more; else them += more;
  }
  return [us, them];
}

/** The scoring drives of one side: touchdowns worth 6, 7 or 8, field goals, safeties. */
export interface NflDrives { tds: number[]; fgs: number; safeties: number }

/** How far a list is from plain football: every touchdown that is not a
 *  seven costs one, a safety four. */
function driveOptions(points: number, minTd: number, exactFg: number | null): { t: number; f: number; s: number; cost: number }[] {
  const out: { t: number; f: number; s: number; cost: number }[] = [];
  if (!Number.isInteger(points) || points < 0 || minTd < 0) return out;
  for (let s = 0; s <= 1; s += 1) {
    for (let f = exactFg ?? 0; f <= (exactFg ?? MAX_FG); f += 1) {
      const rest = points - 3 * f - 2 * s;
      if (rest < 0) break;
      for (let t = minTd; 6 * t <= rest; t += 1) {
        if (rest > 8 * t) continue;
        out.push({ t, f, s, cost: Math.abs(rest - 7 * t) + 4 * s });
      }
    }
  }
  return out;
}

/** The least a drive list for that score strays from sevens and threes; null: no list makes it. */
export function nflDriveCost(points: number, minTd: number, exactFg: number | null): number | null {
  const opts = driveOptions(points, minTd, exactFg);
  return opts.length ? Math.min(...opts.map(o => o.cost)) : null;
}

/** The scoring drives of one side that make `points`, with at least `minTd`
 *  touchdowns (his) and, for a kicker's own side, exactly `exactFg` field
 *  goals. Sevens and threes first; a 6 (the kick after is missed), an 8 (a
 *  two point try) and at most one safety only when the sum needs it. Every
 *  whole number has a list except 1 and 4; null when there is none. */
export function nflDrives(points: number, minTd: number, exactFg: number | null, rng: Rng): NflDrives | null {
  const opts = driveOptions(points, minTd, exactFg);
  const u = rng();
  if (opts.length === 0) return null;
  const least = Math.min(...opts.map(o => o.cost));
  const best = opts.filter(o => o.cost === least);
  const pick = best[Math.floor(u * best.length)];
  const off = points - 3 * pick.f - 2 * pick.s - 7 * pick.t;
  const tds = shuffled(Array.from({ length: pick.t }, (_, i) => (i < Math.abs(off) ? 7 + Math.sign(off) : 7)), rng);
  return { tds, fgs: pick.f, safeties: pick.s };
}

/** His division's slots are 1 to divSlots; the other divisions follow in the
 *  ledger's order, a whole division at a time. */
function divisionsOf(ctx: UsSeasonCtx, from: number, to: number): number[][] {
  const size = ctx.divSlots + 1;
  const out: number[][] = [];
  for (let s = from; s <= to; s += size) out.push(Array.from({ length: Math.min(size, to - s + 1) }, (_, i) => s + i));
  return out;
}
const confOf = (ctx: UsSeasonCtx): string => ctx.shape?.divisions.find(dv => dv.teams.includes(ctx.team))?.conf ?? '';

/** The 17 games of the league's formula for his team, slots by relationship:
 *  his division home and away (6); one whole division of his conference and
 *  one of the other, two of each at home (8); one club from each of the two
 *  other divisions of his conference, one at home (2); and a 17th game
 *  against the other conference, from a division not already met (1). The
 *  real formula picks some of these by last year's standings, which this
 *  career does not have, so those are a keyed draw from the right divisions. */
export function nflDeal(ctx: UsSeasonCtx, rng: Rng): [number, number][][] {
  const d = ctx.divSlots;
  const confDivs = shuffled(divisionsOf(ctx, d + 1, ctx.confSlots), rng);
  const otherDivs = shuffled(divisionsOf(ctx, ctx.confSlots + 1, ctx.order.length - 1), rng);
  const list: [number, boolean][] = [];
  for (let s = 1; s <= d; s += 1) { list.push([s, true]); list.push([s, false]); }
  for (const div of [confDivs[0] ?? [], otherDivs[0] ?? []]) shuffled(div, rng).forEach((s, k) => list.push([s, k < div.length / 2]));
  const flip = rng() < 0.5;
  confDivs.slice(1).forEach((div, k) => list.push([div[Math.floor(rng() * div.length)], (k % 2 === 0) === flip]));
  /* who hosts the 17th game is the ledger's fact where it is verified, a keyed coin where it is not */
  const coin = rng() < 0.5;
  const hosts = nflHosts17(ctx.year, confOf(ctx)) ?? coin;
  const extra = otherDivs[1];
  if (extra) list.push([extra[Math.floor(rng() * extra.length)], hosts]);
  return shuffled(list, rng).map(([slot, home]): [number, number][] => [home ? [0, slot] : [slot, 0]]);
}

/** Every way a named season's opponents disagree with the formula. */
export function nflDealProblems(ctx: UsSeasonCtx, games: readonly DerivedGame[]): string[] {
  const out: string[] = [];
  const d = ctx.divSlots;
  const size = d + 1;
  const n = ctx.order.length;
  const total = new Array(n).fill(0);
  const home = new Array(n).fill(0);
  for (const g of games) { total[g.opp] += 1; if (g.home) home[g.opp] += 1; }
  if (games.length !== GAMES) out.push(`${games.length} games`);
  for (let s = 1; s <= d; s += 1) if (total[s] !== 2 || home[s] !== 1) out.push(`division rival ${ctx.order[s]}: ${total[s]} games, ${home[s]} at home`);
  const read = (div: number[]) => ({ met: div.filter(s => total[s] > 0).length, games: div.reduce((a, s) => a + total[s], 0), homes: div.reduce((a, s) => a + home[s], 0) });
  const whole = (x: { met: number; games: number; homes: number }) => x.met === size && x.games === size && x.homes === size / 2;
  const single = (x: { met: number; games: number }) => x.met === 1 && x.games === 1;
  const conf = divisionsOf(ctx, d + 1, ctx.confSlots).map(read);
  const other = divisionsOf(ctx, ctx.confSlots + 1, n - 1).map(read);
  const confOnes = conf.filter(single);
  if (conf.filter(whole).length !== 1 || confOnes.length !== conf.length - 1) out.push(`his conference: ${conf.map(x => `${x.games} games against ${x.met}`).join(', ')}`);
  else if (confOnes.length === 2 && confOnes.reduce((a, x) => a + x.homes, 0) !== 1) out.push('the two single conference games are not one at home and one away');
  const otherOnes = other.filter(single);
  if (other.filter(whole).length !== 1 || otherOnes.length !== 1 || other.filter(x => x.met === 0).length !== other.length - 2) out.push(`the other conference: ${other.map(x => `${x.games} games against ${x.met}`).join(', ')}`);
  const homes = games.filter(g => g.home).length;
  if (homes !== 8 && homes !== 9) out.push(`${homes} home games`);
  const hosts = nflHosts17(ctx.year, confOf(ctx));
  if (hosts !== null && otherOnes.length === 1 && (otherOnes[0].homes === 1) !== hosts) out.push(`the 17th game is ${hosts ? 'away' : 'at home'} in a year his conference ${hosts ? 'hosts' : 'travels for'} it`);
  return out;
}

/** His whole number totals the core spreads over the games he played. A
 *  touchdown of his is a seven point drive on his team's board (a floor on
 *  the score), in this sim. The caps are this sim's own, set under what a
 *  real game has held; no record is quoted. */
const SUMS: { key: string; cap: number; td?: boolean }[] = [
  { key: 'passTd', cap: 6, td: true }, { key: 'ints', cap: 5 }, { key: 'rushTd', cap: 4, td: true }, { key: 'recTd', cap: 4, td: true },
  { key: 'tackles', cap: 20 }, { key: 'picks', cap: 3 }, { key: 'passDef', cap: 6 }, { key: 'forcedFum', cap: 3 },
];
const TD_KINDS: [string, string][] = [['td-pass', 'passTd'], ['td-rush', 'rushTd'], ['td-rec', 'recTd']];

function totals(row: UsRow): StatTotal[] {
  const out: StatTotal[] = [];
  for (const t of SUMS) {
    const v = num(row[t.key]);
    if (v === null) continue;
    out.push(t.td ? { key: t.key, kind: 'sum', total: v, perGameCap: t.cap, teamFor: true, teamPoints: 7 } : { key: t.key, kind: 'sum', total: v, perGameCap: t.cap });
  }
  return out;
}

/** How much a kicker's game is pulled toward a count of makes: plain
 *  football first (sevens and threes), then the count his season still needs. */
const COST_WEIGHT = [1, 0.5, 0.25, 0.12];
const kickWeight = (cost: number, f: number, need: number) => (COST_WEIGHT[cost] ?? 0.05) * Math.exp(-((f - need) ** 2) / 3.4);

/** A kicker's makes game by game: one count a game he played, each one a
 *  count that game's score can hold, summing to his season. null: no such
 *  lay out exists. A keyed walk over a small reachability table. */
export function nflKickerMakes(scores: readonly number[], made: number, rng: Rng): number[] | null {
  const n = scores.length;
  if (!Number.isInteger(made) || made < 0) return null;
  const costs = scores.map(us => Array.from({ length: MAX_FG + 1 }, (_, f) => nflDriveCost(us, 0, f)));
  const order = shuffled(Array.from({ length: n }, (_, i) => i), rng);
  /* reach[k][r]: the games from place k on can make exactly r */
  const reach: boolean[][] = Array.from({ length: n + 1 }, () => new Array(made + 1).fill(false));
  reach[n][0] = true;
  for (let k = n - 1; k >= 0; k -= 1) {
    for (let r = 0; r <= made; r += 1) {
      for (let f = 0; f <= MAX_FG && f <= r; f += 1) if (costs[order[k]][f] !== null && reach[k + 1][r - f]) { reach[k][r] = true; break; }
    }
  }
  if (!reach[0][made]) return null;
  const out = new Array(n).fill(0);
  let left = made;
  for (let k = 0; k < n; k += 1) {
    const i = order[k];
    const need = left / (n - k);
    const can: number[] = [];
    const w: number[] = [];
    for (let f = 0; f <= MAX_FG && f <= left; f += 1) {
      const cost = costs[i][f];
      if (cost === null || !reach[k + 1][left - f]) continue;
      can.push(f); w.push(kickWeight(cost, f, need));
    }
    let x = rng() * w.reduce((a, b) => a + b, 0);
    let at = can.length - 1;
    for (let j = 0; j < can.length; j += 1) { x -= w[j]; if (x < 0) { at = j; break; } }
    out[i] = can[at];
    left -= can[at];
  }
  return out;
}

/** His touchdown days go with his team's big days. The core spreads his lines
 *  before any score is drawn, so by itself a four touchdown line lands on any
 *  game (and then IS that game's whole score), and a blank line lands on a 49
 *  point day as easily. This says which line each game he played takes, as a
 *  permutation: whole lines change places, so every total and every cap stays
 *  what it was, and a line only goes to a game whose score holds its
 *  touchdowns at seven each (the floor the core checks after this pass). The
 *  lines with the most touchdowns choose first, among the games that can hold
 *  them, leaning to the higher scores. The core's own lay out is one such
 *  assignment, so one always exists; if none did, the core's is kept. */
export function nflTouchdownDays(scores: readonly number[], tds: readonly number[], rng: Rng): number[] {
  const n = scores.length;
  /* a keyed order among lines with the same count (the sort is stable) */
  const order = shuffled(Array.from({ length: n }, (_, i) => i), rng).sort((a, b) => tds[b] - tds[a]);
  const free = new Set(scores.map((_, i) => i));
  const take: number[] = new Array(n).fill(-1);
  for (const line of order) {
    const can = [...free].filter(game => scores[game] >= 7 * tds[line]);
    const u = rng();
    if (can.length === 0) return scores.map((_, i) => i);
    const w = can.map(game => (tds[line] > 0 ? (scores[game] + 3) ** 2 : 1));
    let x = u * w.reduce((a, b) => a + b, 0);
    let at = can.length - 1;
    for (let j = 0; j < can.length; j += 1) { x -= w[j]; if (x < 0) { at = j; break; } }
    take[can[at]] = line;
    free.delete(can[at]);
  }
  return take;
}

/** The numbers that hang off the game (yards, catches, sacks in tenths, a
 *  kicker's makes, misses and long), then both sides' scoring drives and his
 *  own moments minute by minute. Every split lands exactly on the saved
 *  total; false when a total cannot be held. */
function finish(games: DerivedGame[], row: UsRow, _pos: string, rng: Rng): boolean {
  const on = games.filter(g => g.played);
  const of = (g: DerivedGame, key: string) => g.line[key] ?? 0;
  const form = () => 0.5 + rng();
  /* his touchdown days first (see nflTouchdownDays): whole lines change places among the games he played */
  const tdsOf = (g: DerivedGame) => TD_KINDS.reduce((a, [, key]) => a + of(g, key), 0);
  if (on.some(g => tdsOf(g) > 0)) {
    const lines = on.map(g => g.line);
    const take = nflTouchdownDays(on.map(g => g.us), on.map(tdsOf), rng);
    on.forEach((g, i) => { g.line = lines[take[i]]; });
  }
  const lay = (key: string, weights: number[], caps: number[], mins: number[] | null, soft: boolean): boolean => {
    const total = num(row[key]);
    if (total === null) return true;
    const x = (mins ? splitTotal(total, weights, caps, mins) : null) ?? (mins && !soft ? null : splitTotal(total, weights, caps));
    if (!x) return false;
    on.forEach((g, i) => { g.line[key] = x[i]; });
    return true;
  };
  /* yards: more on a day he scored and on a day his team did, and at least a yard a touchdown where
     the total allows it */
  const day = (g: DerivedGame) => form() * (0.7 + g.us / 60);
  if (!lay('passYds', on.map(g => day(g) * (1 + 0.25 * of(g, 'passTd'))), on.map(() => 520), on.map(g => of(g, 'passTd')), true)) return false;
  if (!lay('rushYds', on.map(g => day(g) * (1 + 0.5 * of(g, 'rushTd'))), on.map(() => 290), on.map(g => of(g, 'rushTd')), true)) return false;
  /* a touchdown catch is a catch, and yards need a catch */
  if (!lay('rec', on.map(g => day(g) * (1 + of(g, 'recTd'))), on.map(() => 15), on.map(g => of(g, 'recTd')), false)) return false;
  if (!lay('recYds', on.map(g => of(g, 'rec') * (0.6 + 0.8 * rng())), on.map(g => (of(g, 'rec') > 0 ? 330 : 0)), on.map(g => of(g, 'recTd')), true)) return false;
  /* sacks: the save holds one decimal. Whole sacks are spread, a half sack goes to one keyed game,
     and the last tenths (0 to 4) to the game with the most, so the season's sum is the saved number */
  const sacks = num(row.sacks);
  if (sacks !== null) {
    const tenths = Math.round(sacks * 10);
    if (tenths < 0 || Math.abs(sacks * 10 - tenths) > 1e-6 || on.length === 0) return false;
    const whole = splitTotal(Math.floor(tenths / 10), on.map(form), on.map(() => 4));
    if (!whole) return false;
    const t = whole.map(v => v * 10);
    const left = tenths % 10;
    const half = Math.floor(rng() * Math.max(1, on.length));
    if (left >= 5) t[half] += 5;
    if (left % 5 > 0) t[t.indexOf(Math.max(...t))] += left % 5;
    on.forEach((g, i) => { g.line.sacks = t[i] / 10; });
  }
  /* the kicker */
  const made = num(row.fgMade);
  const att = num(row.fgAtt);
  const long = num(row.longFg);
  if (made !== null) {
    const makes = nflKickerMakes(on.map(g => g.us), made, rng);
    if (!makes) return false;
    const misses = att === null ? null : splitTotal(att - made, on.map(form), on.map(() => 2));
    if (att !== null && !misses) return false;
    on.forEach((g, i) => { g.line.fgMade = makes[i]; if (misses) g.line.fgAtt = makes[i] + misses[i]; });
    if (long !== null) {
      const hit = on.filter(g => of(g, 'fgMade') > 0);
      if (hit.length === 0) return false;
      /* one keyed game holds his season's long; every other game with a make holds an everyday
         distance (24 to 57 yards, never past his long), so a long season best shows up once */
      const top = Math.floor(rng() * hit.length);
      const hi = Math.min(long, 57);
      const lo = Math.min(hi, Math.max(19, Math.min(24, hi - 10)));
      hit.forEach((g, i) => { g.line.longFg = i === top ? long : lo + Math.floor(rng() * (hi - lo + 1)); });
    }
  } else if (att !== null || long !== null) return false;
  /* the drives of both sides, and his own moments, at keyed whole minutes */
  for (const g of games) {
    /* no two lines of one game share a minute (a side cannot score twice in one) */
    const used = new Set<number>();
    const minute = () => {
      let m = 1 + Math.floor(rng() * CLOCK);
      for (let i = 0; i < CLOCK && used.has(m); i += 1) m = (m % CLOCK) + 1;
      used.add(m);
      return m;
    };
    const kinds: string[] = [];
    if (g.played) for (const [kind, key] of TD_KINDS) for (let i = 0; i < of(g, key); i += 1) kinds.push(kind);
    const kicks = g.played && made !== null;
    const us = nflDrives(g.us, kinds.length, kicks ? of(g, 'fgMade') : null, rng);
    const them = nflDrives(g.them, 0, null, rng);
    if (!us || !them) return false;
    const ev: SeasonEvent[] = [];
    us.tds.forEach((pts, i) => ev.push(i < kinds.length ? { min: minute(), kind: kinds[i], side: 'us', pts, mine: true } : { min: minute(), kind: 'td', side: 'us', pts }));
    for (let i = 0; i < us.fgs; i += 1) ev.push(kicks ? { min: minute(), kind: 'fg', side: 'us', pts: 3, mine: true } : { min: minute(), kind: 'fg', side: 'us', pts: 3 });
    for (let i = 0; i < us.safeties; i += 1) ev.push({ min: minute(), kind: 'safety', side: 'us', pts: 2 });
    them.tds.forEach(pts => ev.push({ min: minute(), kind: 'td', side: 'them', pts }));
    for (let i = 0; i < them.fgs; i += 1) ev.push({ min: minute(), kind: 'fg', side: 'them', pts: 3 });
    for (let i = 0; i < them.safeties; i += 1) ev.push({ min: minute(), kind: 'safety', side: 'them', pts: 2 });
    if (g.played) {
      const own = (kind: string, count: number) => { for (let i = 0; i < count; i += 1) ev.push({ min: minute(), kind, side: 'us', mine: true }); };
      own('miss', of(g, 'fgAtt') - of(g, 'fgMade'));
      own('int', of(g, 'ints'));
      own('sack', Math.floor(of(g, 'sacks') + 1e-9));
      own('pick', of(g, 'picks'));
      own('ff', of(g, 'forcedFum'));
    }
    g.events = ev.sort((a, b) => a.min - b.min);
  }
  return true;
}

const TD_PTS = [6, 7, 8];

/** This sport's own agreement items, beyond the core's (which already holds
 *  the whole number totals and that the drives' points make each score). */
function check(row: UsRow, _pos: string, s: DerivedSeason, ctx: UsSeasonCtx): string[] {
  const out: string[] = [];
  const on = s.games.filter(g => g.played);
  const of = (g: DerivedGame, key: string) => g.line[key] ?? 0;
  for (const key of STAT_KEYS) {
    const want = num(row[key]);
    if (want === null) continue;
    if (key === 'longFg') {
      const longs = on.filter(g => of(g, 'fgMade') > 0).map(g => of(g, 'longFg'));
      if (longs.length === 0 || Math.max(...longs) !== want) out.push(`the long of ${want} is not his longest in a game with a make`);
      if (on.some(g => of(g, 'fgMade') === 0 && g.line.longFg !== undefined)) out.push('a long in a game with no make');
      continue;
    }
    const tenths = on.reduce((a, g) => a + Math.round(of(g, key) * 10), 0);
    if (tenths !== Math.round(want * 10)) out.push(`${key} ${tenths / 10} != ${want}`);
    if (on.some(g => of(g, key) < 0)) out.push(`${key} below zero in a game`);
  }
  const kicker = num(row.fgMade) !== null;
  for (const g of s.games) {
    const count = (kind: string, mine?: boolean) => g.events.filter(e => e.kind === kind && (mine === undefined || !!e.mine === mine)).length;
    for (const [kind, key] of TD_KINDS) if (count(kind) !== (g.played ? of(g, key) : 0)) out.push(`game ${g.md}: ${count(kind)} ${kind} drives for ${of(g, key)} on his line`);
    if (g.played) {
      if (of(g, 'fgMade') > of(g, 'fgAtt') && g.line.fgAtt !== undefined) out.push(`game ${g.md}: more makes than tries`);
      if (kicker && (count('fg', true) !== of(g, 'fgMade') || g.events.some(e => e.kind === 'fg' && e.side === 'us' && !e.mine))) out.push(`game ${g.md}: his team's field goals are not his makes`);
      if (of(g, 'rec') < of(g, 'recTd')) out.push(`game ${g.md}: a touchdown catch with no catch`);
      if (of(g, 'recYds') !== 0 && of(g, 'rec') === 0) out.push(`game ${g.md}: receiving yards with no catch`);
      if (count('miss') !== Math.max(0, of(g, 'fgAtt') - of(g, 'fgMade')) || count('int') !== of(g, 'ints') || count('pick') !== of(g, 'picks') || count('ff') !== of(g, 'forcedFum') || count('sack') !== Math.floor(of(g, 'sacks') + 1e-9)) out.push(`game ${g.md}: his moments do not match his line`);
    } else if (g.events.some(e => e.mine)) out.push(`game ${g.md}: a moment of his in a game he did not play`);
    for (const e of g.events) {
      const pts = e.pts ?? 0;
      const ok = e.kind === 'fg' ? pts === 3 : e.kind === 'safety' ? pts === 2 : e.kind === 'td' || e.kind.startsWith('td-') ? TD_PTS.includes(pts) : pts === 0;
      if (!ok) out.push(`game ${g.md}: a ${e.kind} worth ${pts}`);
      if (!(e.min >= 1 && e.min <= CLOCK)) out.push(`game ${g.md}: a drive at minute ${e.min}`);
    }
  }
  if (ctx.shape) out.push(...nflDealProblems(ctx, s.games));
  return out;
}

/* ─── The words ─── */
const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const sum = (so: Record<string, number>, key: string) => so[key] ?? 0;
const tenth = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
/** How his line reads, by the kind of player he is. */
type Family = 'qb' | 'rb' | 'catch' | 'kick' | 'def';
const familyOf = (pos: string): Family => (pos === 'QB' ? 'qb' : pos === 'RB' ? 'rb' : pos === 'WR' || pos === 'TE' ? 'catch' : pos === 'K' ? 'kick' : 'def');

/** One line of the feed. A touchdown reads as seven unless it says otherwise.
 *  `kicker`: he is his team's kicker, and his line holds no extra points, so a
 *  six on his own side is never told as a kick of his that missed. */
export function nflEventWords(e: SeasonEvent, us: string, them: string, kicker = false): string {
  const team = e.side === 'us' ? us : them;
  const six = kicker && e.side === 'us' ? ' The two point try is no good.' : ' The kick after is no good.';
  const after = e.pts === 6 ? six : e.pts === 8 ? ' The two point try is good.' : '';
  switch (e.kind) {
    case 'td-pass': return `🏈 Touchdown! You throw it.${after}`;
    case 'td-rush': return `🏈 Touchdown! You run it in.${after}`;
    case 'td-rec': return `🏈 Touchdown! You catch it.${after}`;
    case 'td': return `🏈 Touchdown, ${team}.${after}`;
    case 'fg': return e.mine ? '🥅 Field goal! You hit it.' : `🥅 Field goal, ${team}.`;
    case 'safety': return `Safety, ${team}.`;
    case 'miss': return 'Your field goal try is no good.';
    case 'int': return 'You are picked off.';
    case 'sack': return '💥 You get the sack.';
    case 'pick': return '🖐 You pick it off.';
    case 'ff': return 'You force a fumble.';
    default: return '';
  }
}

/** The quarter and the minutes left in it: minute 0 is Q1 15:00, minute 16 is Q2 14:00, minute 60 is Q4 0:00. */
export function nflClockLabel(minute: number): string {
  const m = Math.max(0, Math.min(CLOCK, Math.floor(minute)));
  return m === 0 ? 'Q1 15:00' : `Q${Math.ceil(m / 15)} ${(15 - (m % 15)) % 15}:00`;
}

/* A number is printed only when the saved line holds it: a line from an older
   build that never held a stat shows no zero in its place (mark, never fill). */
function lineOf(g: DerivedGame, pos: string): string[] {
  const of = (key: string) => g.line[key] ?? 0;
  const has = (key: string) => g.line[key] !== undefined;
  const bit = (key: string, label: string) => (has(key) ? [`${of(key)} ${label}`] : []);
  switch (familyOf(pos)) {
    case 'qb': return [...bit('passTd', 'TD'), ...bit('ints', 'INT')];
    case 'rb': return [...bit('rushTd', 'TD'), ...(has('rec') ? [has('recYds') ? `${of('rec')}-${of('recYds')} REC` : `${of('rec')} REC`] : [])];
    case 'catch': return [...bit('rec', 'REC'), ...bit('recTd', 'TD')];
    case 'kick': return of('fgMade') > 0 && has('longFg') ? [`LONG ${of('longFg')}`] : [];
    default: return [
      ...(of('sacks') > 0 ? [`${of('sacks')} SCK`] : []), ...(of('picks') > 0 ? [`${of('picks')} INT`] : []),
      ...(of('passDef') > 0 ? [`${of('passDef')} PD`] : []), ...(of('forcedFum') > 0 ? [`${of('forcedFum')} FF`] : []),
    ];
  }
}

/** His headline in a game; "Played" when the saved line does not hold it. */
function markChip(g: DerivedGame, pos: string): string {
  const of = (key: string) => g.line[key] ?? 0;
  const has = (key: string) => g.line[key] !== undefined;
  const chip = (key: string, label: string) => (has(key) ? `${of(key)} ${label}` : 'Played');
  switch (familyOf(pos)) {
    case 'qb': return chip('passYds', 'YDS');
    case 'rb': return chip('rushYds', 'YDS');
    case 'catch': return chip('recYds', 'YDS');
    case 'kick': return has('fgMade') ? (has('fgAtt') ? `${of('fgMade')}/${of('fgAtt')} FG` : `${of('fgMade')} FG`) : 'Played';
    default: return chip('tackles', 'TKL');
  }
}

/** One number for "best game", this sim's own weighing of a line. */
function markOf(g: DerivedGame, pos: string): number {
  const of = (key: string) => g.line[key] ?? 0;
  switch (familyOf(pos)) {
    case 'qb': return of('passYds') / 25 + 4 * of('passTd') - 2 * of('ints');
    case 'rb': return (of('rushYds') + of('recYds')) / 10 + 6 * of('rushTd') + 0.5 * of('rec');
    case 'catch': return of('recYds') / 10 + 6 * of('recTd') + 0.5 * of('rec');
    case 'kick': return 3 * of('fgMade') - 2 * (of('fgAtt') - of('fgMade')) + of('longFg') / 50;
    default: return of('tackles') + 2 * of('sacks') + 3 * of('picks') + of('passDef') + 2 * of('forcedFum');
  }
}

function markText(g: DerivedGame, pos: string): string {
  const of = (key: string) => g.line[key] ?? 0;
  const has = (key: string) => g.line[key] !== undefined;
  const out: string[] = [];
  const add = (key: string, one: string, many: string, always = true) => { if (has(key) && (always || of(key) > 0)) out.push(plural(of(key), one, many)); };
  switch (familyOf(pos)) {
    case 'qb': add('passYds', 'yard', 'yards'); add('passTd', 'touchdown', 'touchdowns', false); add('ints', 'interception', 'interceptions', false); break;
    case 'rb': add('rushYds', 'rushing yard', 'rushing yards'); add('rushTd', 'touchdown', 'touchdowns', false); break;
    case 'catch':
      if (has('rec')) out.push(has('recYds') ? `${plural(of('rec'), 'catch', 'catches')} for ${plural(of('recYds'), 'yard', 'yards')}` : plural(of('rec'), 'catch', 'catches'));
      add('recTd', 'touchdown', 'touchdowns', false);
      break;
    case 'kick':
      if (has('fgMade')) out.push(has('fgAtt') ? `${of('fgMade')} of ${of('fgAtt')} on field goals` : plural(of('fgMade'), 'field goal', 'field goals'));
      if (of('fgMade') > 0 && has('longFg')) out.push(`long of ${of('longFg')}`);
      break;
    default:
      add('tackles', 'tackle', 'tackles');
      if (of('sacks') > 0) out.push(`${of('sacks')} ${of('sacks') === 1 ? 'sack' : 'sacks'}`);
      add('picks', 'interception', 'interceptions', false);
  }
  return out.length ? out.join(', ') : 'no line on the save for this game';
}

/** The tiles above the record: sums only, and a dash for a number the saved
 *  line does not hold. A kicker's long is a per game number, so its sum is
 *  never printed (his tiles are makes and tries). */
function soFarTiles(so: Record<string, number>, pos: string): [string, string][] {
  const n = (key: string) => (so[key] === undefined ? '-' : formatNumber(sum(so, key)));
  const t = (key: string) => (so[key] === undefined ? '-' : tenth(sum(so, key)));
  const played: [string, string] = ['Played', String(so.apps ?? 0)];
  switch (pos) {
    case 'QB': return [played, ['Pass yds', n('passYds')], ['TD', n('passTd')], ['INT', n('ints')]];
    case 'RB': return [played, ['Rush yds', n('rushYds')], ['Rush TD', n('rushTd')], ['Rec', n('rec')]];
    case 'WR': case 'TE': return [played, ['Rec', n('rec')], ['Rec yds', n('recYds')], ['TD', n('recTd')]];
    case 'K': return [played, ['FG made', n('fgMade')], ['FG tries', n('fgAtt')], ['FG %', sum(so, 'fgAtt') > 0 ? `${Math.round((100 * sum(so, 'fgMade')) / sum(so, 'fgAtt'))}%` : '-']];
    case 'CB': return [played, ['Tackles', n('tackles')], ['INT', n('picks')], ['PD', n('passDef')]];
    case 'EDGE': return [played, ['Sacks', t('sacks')], ['Tackles', n('tackles')], ['FF', n('forcedFum')]];
    default: return [played, ['Tackles', n('tackles')], ['Sacks', t('sacks')], ['INT', n('picks')]];
  }
}

function halfLine(so: Record<string, number>, pos: string): string {
  if (!so.apps) return 'First half: you did not play a game.';
  const games = `First half: ${plural(so.apps, 'game', 'games')}`;
  const has = (key: string) => so[key] !== undefined;
  const tail = (() => {
    switch (familyOf(pos)) {
      case 'qb': return has('passYds') ? `${plural(sum(so, 'passYds'), 'passing yard', 'passing yards')}${has('passTd') ? ` and ${plural(sum(so, 'passTd'), 'touchdown', 'touchdowns')}` : ''}` : '';
      case 'rb': return has('rushYds') ? `${plural(sum(so, 'rushYds'), 'rushing yard', 'rushing yards')}${has('rushTd') ? ` and ${plural(sum(so, 'rushTd'), 'touchdown', 'touchdowns')}` : ''}` : '';
      case 'catch': return has('rec') ? `${plural(sum(so, 'rec'), 'catch', 'catches')}${has('recYds') ? ` for ${plural(sum(so, 'recYds'), 'yard', 'yards')}` : ''}` : '';
      case 'kick': return has('fgMade') && has('fgAtt') ? `${formatNumber(sum(so, 'fgMade'))} of ${formatNumber(sum(so, 'fgAtt'))} on field goals` : '';
      default: return has('tackles') ? `${plural(sum(so, 'tackles'), 'tackle', 'tackles')}${has('sacks') ? ` and ${tenth(sum(so, 'sacks'))} sacks` : ''}` : '';
    }
  })();
  return tail ? `${games}, ${tail}` : `${games}.`;
}

export const NFL_SEASON: UsSeasonBind = {
  slug: 'nfl',
  league: 'NFL',
  fullSeason: GAMES,
  realLength: year => usSeasonLength('nfl', year),
  heldLine: year => usSeasonHeldLine('nfl', year),
  missed: NFL_MISSED_PLAYOFFS,
  results: NFL_PLAYOFF_RESULTS,
  bands: BANDS,
  /* one game a round */
  series: null,
  rounds: ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'],
  cap: CAP,
  seasonLabel: year => usSeasonLabel('nfl', year),
  statKeys: () => STAT_KEYS,
  teamIds: eraId => nflEraById(eraId).teams.map(t => t.abbr),
  score: (edge, home, rng) => nflScore(edge, home, rng),
  /* a game's margin has a standard deviation of about 13.4 points under the
     ten drive law and a unit of edge is worth 0.7 of a point, so a logistic
     of 11.3 a unit lands the share of wins (held by the repairs and the
     median records scripts/simUsSeasonCentre.mjs measures) */
  strengthFor: share => { const p = Math.min(0.98, Math.max(0.02, share)); return 11.3 * Math.log(p / (1 - p)); },
  oppSpread: 6.5,
  totals: row => totals(row),
  /* the line does not say whether a missed game was an injury or a day on the
     bench, so nothing is claimed: a missed game reads "Did not play" */
  availability: row => ({ played: row.games, block: 0, severe: false }),
  /* no per game mean is on an NFL line */
  meanBase: () => 0,
  deal: nflDeal,
  finish,
  check,
  view: {
    words: { round: 'Game', title: 'Season Center', unnamed: 'another team' },
    copy: {
      start: '▶ Kick off', lastBadge: 'LAST GAME', lastHead: 'Last game', lastBody: () => 'The last game of the regular season.',
      best: 'Best game', bestSoFar: 'Best so far', scope: 'Regular season, the same numbers as your season card.',
      soFarHead: 'Season so far', tie: 'T', list: 'Schedule', side: 'Record',
    },
    /* "Q2 14:00" is eight characters: the feed's time column needs the wider class, as a whole literal */
    clock: { length: CLOCK, label: nflClockLabel, start: 'Kickoff.', end: 'Final', endShort: 'FINAL', labelClass: 'w-14' },
    eventWords: (e, us, them, pos) => nflEventWords(e, us, them, pos === 'K'),
    missed: () => 'Did not play',
    lineOf,
    markOf,
    markChip,
    markText,
    soFar: soFarTiles,
    half: halfLine,
    tileLabels: {
      'Passing yards': 'Pass yds', 'Passing touchdowns': 'Pass TD', 'Interceptions thrown': 'INT',
      'Rushing yards': 'Rush yds', 'Rushing touchdowns': 'Rush TD', Receptions: 'Rec', 'Receiving yards': 'Rec yds',
      'Receiving touchdowns': 'Rec TD', Interceptions: 'INT', 'Passes defended': 'PD', 'Forced fumbles': 'FF',
      'Field goals made': 'FG made', 'Field goals attempted': 'FG tries', 'Longest field goal': 'Long FG',
    },
    help: (named, opp) => usHelp({
      named, games: GAMES, bands: BANDS,
      examples: [
        { head: 'A game', body: `Say you are a quarterback. Game 9, away to ${named && opp ? `the ${opp}` : 'another team'}. You lose 24-27 and throw for 286 yards and 2 touchdowns. Your record goes to 6-3.` },
        { head: 'Your totals', body: 'Whatever your season card says (4,210 passing yards and 31 touchdowns, say), every game here adds up to exactly that. A kicker makes every field goal his team scores in a game he plays.' },
        { head: 'The scoreboard', body: 'Each scoring drive goes on the board as it happens: 7 for a touchdown with the kick after it, 6 when that kick misses, 8 with a two point try, 3 for a field goal and 2 for a safety.' },
        { head: 'A level game', body: 'Now and then a game ends level. Ties are real in the NFL. Here a tie is not a win and not a loss, and your record shows it as 9-7-1.' },
      ],
    }),
  },
};
