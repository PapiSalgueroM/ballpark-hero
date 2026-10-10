/* Round 1300: a US career's playoff run, game by game, derived from what the
   save already holds. Sport neutral: a sport is its UsSeasonBind (the NBA and
   the NFL today; MLB and the NHL bind later as data), and nothing here knows
   which one it is laying out.

   THE IDEA. A postseason is THE SAME SPORT BOUND TO A SECOND ROW. The season
   core (src/lib/season/core.ts) derives the playoff games exactly as it
   derives game 40 of the regular season, through the bind's own score law,
   `finish` and `check`, from a row whose stat fields hold his saved playoff
   numbers. The core can hold a COUNT of wins and not the result of one named
   game, so it is asked for G games with exactly W wins against one opponent
   of even strength, and whole games then take their places in the series in
   a keyed order the series scores allow. Whole games move, so every total,
   every cap and every floor the core checked stays what it was.

   THE SUM RULE. The games laid out add up exactly to the playoff line the
   save holds. A number saved as a total is met to the unit. A number saved
   as a mean to one decimal (the NBA's three) is held as the whole total
   nearest to mean times games, worked in tenths so no float can sit a hair
   under a half: over a short run no set of whole scores averages to every
   decimal (24.5 over 5 games would need 122.5 points), so the stage prints
   totals and the saved averages are printed once, from the save.

   IT FAILS CLOSED. No lay, a count that does not fit the rounds, a season
   whose real format the data file does not hold (or holds otherwise than the
   bind), no playoff number on the line for his position (every NFL season
   saved so far: its postseason is a sentence, and a sentence is never read
   for numbers), a number the core cannot lay out, or no try that passes
   every check: null, and the review keeps the list it shows today.

   WHICH TRY. PO_TRIES keyed layouts are derived and, among those that pass
   every check, the one the core had to REPAIR least is returned (the lowest
   try number on a tie). A repair turns a result by making it a one point
   game, so taking the first try that passes would fill the playoffs with one
   point games; taking the least repaired one keeps them as rare as the score
   law makes them. (Stopping at the first try with no repair is the same
   choice: nothing later can have fewer, and a tie goes to the lower number.)

   NO VENUE IS CLAIMED. The save holds no seed, so who hosted a playoff game
   is not knowable and `home` is never to be printed for one. The score laws
   do take a side, so the games are dealt with his side first and second
   alternately (a fixed pattern, no draw): the run is not scored as all home
   games.

   Key streams, all suffixes of the season key and none used before:
     |pog|<t>       try t: the core's own streams under it (|cal, |avail,
                    |alloc, |str, |score|n, |min, |fin, |label)
     |pog|<t>|ser   the order of the games inside each series
   `|po` stays the lay's (src/lib/season/us.ts) and is not drawn on here.

   Imports: ./core, ./us, ../keyedRng and the format data. No React, no
   Math.random, no engine import, nothing evaluated at module scope from an
   import. Nothing under src imports this file yet but its tests: the stage
   that shows it is a later round's. */
import {
  deriveSeasonOrWhy, disagreements, shuffled,
  type DerivedGame, type DerivedSeason, type Rng, type SeasonSport, type SlotLabel, type StatTotal,
} from './core';
import { usPlayoffLay, type UsPlayoffLay, type UsRow, type UsSeasonBind, type UsSeasonCtx } from './us';
import { keyedRng } from '../keyedRng';
import { usPostseasonFormat } from '@/data/usPostseasonFormat';

/** How many keyed layouts are derived before a postseason fails closed. */
export const PO_TRIES = 12;
/** His side's strength is his real share of the run's games, pulled toward even so a sweep is not four
 *  thirty point games. A tuning number: scripts/simUsPostseason.mjs prints the repairs with it and without. */
const PO_SHARE_MIN = 0.3;
const PO_SHARE_MAX = 0.7;

/** One series of the run. `from` and `to` are game numbers (1 based) of `season.games`. */
export interface UsPostSeries { round: string; opp: string; named: boolean; need: number; most: number; from: number; to: number; won: boolean }
/** One game's place: its series (0 based), its number in it, and the count AFTER it, his wins first. */
export interface UsPostAt { series: number; no: number; mine: number; theirs: number; over: 'won' | 'lost' | null }
export interface UsPostseason {
  /** The season key + '|pog|' + the try that was taken. */
  key: string;
  /** Mode 'record': the playoff games in bracket order; g.opp is the series number + 1, labels[g.opp] the opponent. */
  season: DerivedSeason;
  series: UsPostSeries[];
  at: UsPostAt[];
  champion: boolean;
  /** The whole totals the games are held to, by the bind's own line keys. */
  held: [key: string, total: number][];
  /** The try that was taken, 0 based. */
  try: number;
}

const poKey = (k: string) => `po${k.charAt(0).toUpperCase()}${k.slice(1)}`;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The saved line as a playoff row: `games` playoff games, and every stat field of his position REPLACED by
 *  the number saved under "po" plus that field with a capital (ppg and poPpg), or removed when the save holds
 *  none. null when the line holds not one playoff number for his position. Nothing is parsed out of a sentence. */
export function usPostRow(bind: UsSeasonBind, row: UsRow, pos: string, games: number): UsRow | null {
  const out: UsRow = { ...row, games, awards: [] };
  let any = false;
  for (const k of bind.statKeys(pos)) {
    const v = row[poKey(k)];
    if (finite(v)) { out[k] = v; any = true; } else delete out[k];
  }
  return any ? out : null;
}

/** The bind's totals of a playoff row as what the games are held to: a sum as it is, a mean of whole numbers
 *  as the whole total nearest to mean times games (in tenths). null: a total the core cannot hold game by game
 *  (a max, a count of shutouts, a mean in tenths a game or with a floor above zero), or a number that is not one. */
export function usPostTotals(totals: readonly StatTotal[], games: number): StatTotal[] | null {
  if (!Number.isInteger(games) || games < 1) return null;
  const out: StatTotal[] = [];
  for (const t of totals) {
    if (t.kind === 'sum') {
      if (!Number.isFinite(t.total) || t.total < 0) return null;
      out.push(t);
    } else if (t.kind === 'mean') {
      if (t.perGame !== 'int' || t.min !== 0 || !Number.isFinite(t.mean) || t.mean < 0) return null;
      out.push({ key: t.key, kind: 'sum', total: Math.round((Math.round(t.mean * 10) * games) / 10), perGameCap: t.max, formPower: 0.5 });
    } else return null;
  }
  return out;
}

/** His results in one series, game by game (true: he won it). The first `games - 1` are a keyed shuffle of
 *  `need - 1` wins of the side that takes the series and `games - need` of the other, and the clincher is
 *  last, so no series is over before its last game. []: a length no series of that `need` can have. */
export function usSeriesOrder(need: number, games: number, won: boolean, rng: Rng): boolean[] {
  if (!Number.isInteger(need) || !Number.isInteger(games) || need < 1 || games < need || games > 2 * need - 1) return [];
  const early: boolean[] = [...Array.from({ length: need - 1 }, () => won), ...Array.from({ length: games - need }, () => !won)];
  return [...shuffled(early, rng), won];
}

/** The count after a game, in words. No speaker, no quote. */
export function usCountWords(at: Pick<UsPostAt, 'mine' | 'theirs' | 'over'>, need: number): string {
  if (need <= 1) return at.over === 'won' ? 'You win' : at.over === 'lost' ? 'You are out' : 'Still to play';
  if (at.over === 'won') return `You win the series ${at.mine}-${at.theirs}`;
  if (at.over === 'lost') return `You lose the series ${at.mine}-${at.theirs}`;
  if (at.mine === at.theirs) return `Series level ${at.mine}-${at.theirs}`;
  return at.mine > at.theirs ? `You lead ${at.mine}-${at.theirs}` : `You trail ${at.mine}-${at.theirs}`;
}

interface Placed { season: DerivedSeason; series: UsPostSeries[]; at: UsPostAt[] }

/** The derived games in their places: each series takes the core's next won game or its next lost game, in
 *  the order the core produced them, by the keyed order of that series. null: the games do not hold exactly
 *  the wins and losses the series need (a level game is neither). */
function place(s: DerivedSeason, lay: UsPlayoffLay, ctx: UsSeasonCtx, rng: Rng): Placed | null {
  const wins = s.games.filter(g => g.us > g.them);
  const losses = s.games.filter(g => g.us < g.them);
  const games: DerivedGame[] = [];
  const series: UsPostSeries[] = [];
  const at: UsPostAt[] = [];
  let wi = 0; let li = 0;
  for (const [r, sr] of lay.series.entries()) {
    if (sr.games === null) return null;
    const order = usSeriesOrder(sr.need, sr.games, sr.won, rng);
    if (order.length !== sr.games) return null;
    const from = games.length + 1;
    let mine = 0; let theirs = 0;
    for (const [i, won] of order.entries()) {
      const g = won ? wins[wi] : losses[li];
      if (!g) return null;
      if (won) { wi += 1; mine += 1; } else { li += 1; theirs += 1; }
      games.push({ ...g, md: games.length + 1, opp: r + 1 });
      at.push({ series: r, no: i + 1, mine, theirs, over: mine === sr.need ? 'won' : theirs === sr.need ? 'lost' : null });
    }
    series.push({ round: sr.round, opp: sr.opp, named: sr.slot !== null, need: sr.need, most: sr.most, from, to: games.length, won: sr.won });
  }
  if (wi !== wins.length || li !== losses.length || games.length !== s.games.length) return null;
  const labels: SlotLabel[] = [s.labels[0], ...lay.series.map((sr, r): SlotLabel => ({ name: sr.opp, named: sr.slot !== null, key: sr.slot !== null ? ctx.order[sr.slot] : `po${r + 1}` }))];
  const rounds = games.map((g): [number, number, number, number][] => [g.home ? [0, g.opp, g.us, g.them] : [g.opp, 0, g.them, g.us]]);
  return { season: { ...s, teams: labels.length, labels, games, rounds, clinch: null }, series, at };
}

/** Every way a laid out postseason disagrees with the save and the lay (empty: it agrees). */
export function usPostProblems(p: UsPostseason, lay: UsPlayoffLay, row: UsRow, held: readonly (readonly [string, number])[]): string[] {
  const out: string[] = [];
  const games = p.season.games;
  const G = games.length;
  if (!finite(row.poGames) || G !== row.poGames) out.push(`games ${G} != ${String(row.poGames)}`);
  if (p.at.length !== G) out.push('the counts are not one a game');
  if (p.series.length !== lay.series.length) out.push(`series ${p.series.length} != ${lay.series.length}`);
  if (p.champion !== lay.champion) out.push('the champion flag differs from the lay');
  let next = 1;
  p.series.forEach((sr, r) => {
    const L = lay.series[r];
    if (!L) return;
    if (sr.round !== L.round || sr.opp !== L.opp || sr.need !== L.need || sr.most !== L.most || sr.won !== L.won) out.push(`series ${r + 1} is not the lay's`);
    if (sr.won !== (r < p.series.length - 1 || p.champion)) out.push(`series ${r + 1}: its result does not fit the run`);
    if (sr.from !== next) out.push(`series ${r + 1} starts at game ${sr.from}, not ${next}`);
    const n = sr.to - sr.from + 1;
    if (n !== L.games) out.push(`series ${r + 1} has ${n} games for ${String(L.games)}`);
    if (n < sr.need || n > sr.most) out.push(`series ${r + 1}: ${n} games is no length of a first to ${sr.need}`);
    let mine = 0; let theirs = 0;
    for (let md = sr.from; md <= sr.to; md += 1) {
      const g = games[md - 1]; const a = p.at[md - 1];
      if (!g || !a) { out.push(`series ${r + 1}: game ${md} is missing`); break; }
      if (mine >= sr.need || theirs >= sr.need) out.push(`series ${r + 1} goes on after it is decided`);
      if (g.md !== md || g.opp !== r + 1) out.push(`game ${md} is not in its place`);
      if (!g.played) out.push(`game ${md}: he does not play`);
      if (g.us === g.them) out.push(`game ${md}: level`);
      else if (g.us > g.them) mine += 1; else theirs += 1;
      const over = mine === sr.need ? 'won' : theirs === sr.need ? 'lost' : null;
      if (a.series !== r || a.no !== md - sr.from + 1 || a.mine !== mine || a.theirs !== theirs || a.over !== over) out.push(`game ${md}: the count is wrong`);
    }
    if ((sr.won ? mine : theirs) !== sr.need) out.push(`series ${r + 1}: the side that takes it has not ${sr.need} wins`);
    if ((sr.won ? theirs : mine) !== n - sr.need) out.push(`series ${r + 1}: the other side's wins`);
    next = sr.to + 1;
  });
  if (next !== G + 1) out.push('the series do not cover every game');
  for (const [key, total] of held) {
    const tenths = games.reduce((a, g) => a + Math.round((g.line[key] ?? 0) * 10), 0);
    if (tenths !== Math.round(total * 10)) out.push(`${key} ${tenths / 10} != ${total}`);
  }
  return out;
}

/** The postseason of one saved line, or the stage that refused it (the harness prints the split):
 *  'lay' no postseason or numbers that disagree with the result; 'fit' a games count the rounds cannot hold;
 *  'format' no row for that season, or one the bind disagrees with; 'count' the lay's games are not the saved
 *  count; 'numbers' no playoff number for his position; 'totals' a number the core cannot hold game by game;
 *  'tries: ...' no try passed, with what stopped the first one. */
export function usPostseasonOrWhy(bind: UsSeasonBind, row: UsRow, ctx: UsSeasonCtx, key: string): UsPostseason | string {
  const lay = usPlayoffLay(bind, row, ctx, key);
  if (!lay) return 'lay';
  if (lay.series.some(s => s.games === null)) return 'fit';
  const fmt = usPostseasonFormat(bind.slug, row.year);
  if (!fmt) return 'format';
  if (lay.series.some((s, r) => { const f = fmt.rounds[r]; return !f || f.name !== s.round || f.series[0] !== s.need || f.series[1] !== s.most; })) return 'format';
  const G = lay.series.reduce((a, s) => a + (s.games ?? 0), 0);
  const W = lay.series.reduce((a, s) => a + (s.won ? s.need : (s.games ?? 0) - s.need), 0);
  if (!finite(row.poGames) || row.poGames !== G || G < 1) return 'count';
  const pos = ctx.pos;
  const poRow = usPostRow(bind, row, pos, G);
  if (!poRow) return 'numbers';
  const totals = usPostTotals(bind.totals(poRow, pos), G);
  if (!totals) return 'totals';
  const held = totals.map((t): [string, number] => [t.key, t.kind === 'sum' ? t.total : 0]);
  /* the same teams, no league shape: a playoff run is not a schedule, so the bind's schedule checks stand down */
  const poCtx: UsSeasonCtx = { ...ctx, shape: null };
  const unnamed = bind.view.words.unnamed;
  const share = Math.min(PO_SHARE_MAX, Math.max(PO_SHARE_MIN, W / G));
  let best: UsPostseason | null = null;
  let first = '';
  for (let t = 0; t < PO_TRIES; t += 1) {
    const tryKey = `${key}|pog|${t}`;
    const sport: SeasonSport<UsRow, UsSeasonCtx> = {
      id: bind.slug,
      seasonKey: () => tryKey,
      frame: () => ({ mode: 'record', teams: 2, games: G, rule: null, cap: bind.cap }),
      /* his side first and second alternately: no venue is claimed, and the run is not scored as all home games */
      fixtures: () => Array.from({ length: G }, (_, i): [number, number][] => [i % 2 === 0 ? [0, 1] : [1, 0]]),
      target: () => ({ kind: 'record', winsMin: W, winsMax: W }),
      fixed: () => [],
      /* the engines save one playoff line over every playoff game: he plays them all */
      availability: () => ({ played: G, block: 0, severe: false }),
      totals: () => totals,
      apps: () => G,
      score: (edge, home, rng) => bind.score(edge, home, rng, ctx.eraId),
      strengths: () => [bind.strengthFor(share), 0],
      meanBase: () => 0,
      subChance: () => 0,
      labels: facts => facts.map((f): SlotLabel => (f.slot === 0 ? { name: ctx.teamLabel, named: true, key: row.team } : { name: unnamed, named: false, key: `po${f.slot}` })),
      finish: (games, _row, _ctx, rng) => bind.finish(games, poRow, pos, rng, poCtx),
      check: (_row, _ctx, s) => [...bind.check(poRow, pos, s, poCtx), ...s.games.filter(g => g.us === g.them).map(g => `playoff game ${g.md}: level`)],
      words: bind.view.words,
    };
    const s = deriveSeasonOrWhy(sport, poRow, poCtx);
    if (typeof s === 'string') { if (!first) first = s; continue; }
    const placed = place(s, lay, ctx, keyedRng(`${tryKey}|ser`));
    if (!placed) { if (!first) first = 'place'; continue; }
    const p: UsPostseason = { key: tryKey, season: placed.season, series: placed.series, at: placed.at, champion: lay.champion, held, try: t };
    const bad = [...disagreements(sport, poRow, poCtx, placed.season), ...usPostProblems(p, lay, row, held)];
    if (bad.length) { if (!first) first = `problems: ${bad[0]}`; continue; }
    if (!best || p.season.repairs < best.season.repairs) best = p;
    if (best.season.repairs === 0) break;
  }
  return best ?? `tries: ${first}`;
}

/** The postseason of one saved line, game by game, or null: nothing is laid out and the list stays. */
export function usPostseason(bind: UsSeasonBind, row: UsRow, ctx: UsSeasonCtx, key: string): UsPostseason | null {
  const p = usPostseasonOrWhy(bind, row, ctx, key);
  return typeof p === 'string' ? null : p;
}
