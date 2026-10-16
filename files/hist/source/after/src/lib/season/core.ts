/* Round 1045: the season core, one engine for every career's "week by week".

   A career draws a whole season in one press and saves only totals: games,
   goals, a rating, a finish, a few fixed games (derbies). This module derives
   that season match by match AFTER the fact, from generators keyed on the
   saved row, so it lands exactly on every number the save holds and stores
   nothing. It is sport neutral: a sport brings its data and rules through a
   SeasonSport descriptor (src/lib/season/soccer.ts is the first), and the
   loop, the result shapes, the table, the clinch and the self check are
   written once here. Nothing in it is soccer's: a game's timed events come
   from the sport's `events` hook (soccer's are src/lib/season/soccerEvents.ts),
   his line's floor on his club's score weighs each stat by `teamPoints`, and
   the clock's length and words come with the sport's viewer model.

   The derivation, one keyed stream per concern (a later concern adds a new
   suffix and never reshuffles an older one):
     |cal    fixtures and which slot each fixed opponent takes
     |avail  which of his games he played, the injury block, suspensions
     |alloc  his line (goals, assists, clean sheet marks, cards) over games
     |score|t  attempt t of every other score, then up to 40 one goal repairs
     |min    minutes of every event, and the per game means (ratings)
     |fin    the sport's optional `finish` pass (Round 1048; the US binds)
   It fails closed: a season whose saved numbers cannot be laid out gives
   null, and an attempt budget spent without acceptance gives null too (the
   sport decides whether a results only season is offered instead).
   deriveSeason runs `disagreements` on its own output and returns null
   unless the list is empty, and scripts/simSeasonCentreAgreement.mjs checks
   every item again with an independent checker.

   Imports: ../leagueCore, ../keyedRng and ../keyedShuffle only, and types
   from ./law. No React, no sport file, no Math.random, nothing evaluated at
   module scope from an import. */
import { roundRobinCalendar } from '../leagueCore';
import { keyedRng } from '../keyedRng';
import { shuffled } from '../keyedShuffle';

export type Rng = () => number;
/** A full table, a won and lost record (US), or his games only. */
export type Mode = 'table' | 'record' | 'results';
export interface PointsRule { win: number; draw: number; loss: number }

export interface Frame {
  mode: Mode;
  /** Teams in the competition (table), or opponents' slots plus his (results, record). */
  teams: number;
  /** His club's league games in the season. */
  games: number;
  rule: PointsRule | null;
  /** Most goals (points) a side may hold after a repair; 7 when absent (Club Manager's cap). */
  cap?: number;
}

/** A game whose result and his line are already on the save (a derby). */
export interface FixedGame {
  /** The opponent's identity; every meeting with one opponent shares it. */
  key: string;
  home: boolean;
  us: number;
  them: number;
  played: boolean;
  line: Record<string, number>;
  /** His score was the one that put his club ahead for good (soccer's `won`;
   *  the sport's events place it and the sport's check holds it). */
  decisive?: boolean;
}

/** Release AQ: places `from` to `to` of the final table (1 based, both ends
 *  in) and, for each fixed opponent named, whether its club ends inside them.
 *  Soccer hands this over for a season whose promotion and relegation are
 *  already saved, so a derby rival can never be drawn into, or out of, the
 *  places the save says changed hands. Absent everywhere else. */
export interface TableZone { from: number; to: number; fixed: [key: string, inside: boolean][] }

export type TeamTarget =
  | { kind: 'finish'; finish: number; title: boolean; champion: 'mine' | 'other' | { key: string }; zone?: TableZone }
  | { kind: 'record'; winsMin: number; winsMax: number }
  | { kind: 'band'; ppgMin: number; ppgMax: number }
  | { kind: 'none' };

export interface Availability {
  /** League games he plays, fixed games included. */
  played: number;
  /** Games missed in one run for an injury (0: none). */
  block: number;
  /** A severe injury ends his season: nothing he plays comes after it. */
  severe: boolean;
  /** Already served bans, placed outside injuries and protected fixed games. */
  suspended?: number;
}

/** `teamFor`: each unit of this stat is also his club's score, so the club
 *  never scores less than his line in a game; `teamPoints` is what one unit
 *  puts on the board (1 when absent: a soccer goal or assist; 3 for a made
 *  field goal, 6 for a touchdown). `formPower` (Round 1147, absent: 1): how
 *  much of his game to game form this stat follows. The form runs about six
 *  to one between his best game and his worst, which suits a stat that
 *  comes in ones (goals); a stat counted in tens a season piles up on its
 *  cap under it, so a number file may ask for less (0.5 is the square root
 *  of the form: about two and a half to one). */
export type StatTotal =
  | { key: string; kind: 'sum'; total: number; perGameCap: number; teamFor?: boolean; teamPoints?: number; noBucket?: boolean; suspends?: boolean; distinct?: string; formPower?: number }
  | { key: string; kind: 'mean'; mean: number; dp: 0 | 1; perGame: 'int' | 0.1; min: number; max: number }
  | { key: string; kind: 'count-of'; total: number; when: 'shutout' }
  | { key: string; kind: 'max'; max: number };

export interface SlotLabel { name: string; named: boolean; key: string }
export interface SlotFacts { slot: number; pos: number; fixedKey: string | null; champion: boolean }

export interface SeasonWords {
  round: string;        // "Matchday"
  title: string;        // "Season Centre"
  unnamed: string;      // "another club"
}

export interface SeasonSport<Row, Ctx> {
  id: 'soccer' | 'nba' | 'nfl' | 'mlb' | 'nhl' | 'toy';
  /** Built only from saved fields, so any device rebuilds the same season. null: no season view. */
  seasonKey(row: Row, ctx: Ctx): string | null;
  frame(row: Row, ctx: Ctx): Frame;
  /** Rounds of [home, away] slot pairs; slot 0 is his club. */
  fixtures(frame: Frame, rng: Rng): [number, number][][];
  target(row: Row, ctx: Ctx, frame: Frame): TeamTarget;
  fixed(row: Row, ctx: Ctx, frame: Frame): FixedGame[];
  availability(row: Row, ctx: Ctx, frame: Frame): Availability;
  /** His totals over every game he played: games shown plus the bucket. */
  totals(row: Row, ctx: Ctx): StatTotal[];
  /** Every game he played this season, as saved (shown games plus the bucket). */
  apps(row: Row): number;
  /** [its goals, the other side's goals] for a side `edge` stronger than its
   *  opponent, at home when `home` is true. */
  score(edge: number, home: boolean, rng: Rng): [number, number];
  strengths(frame: Frame, target: TeamTarget, slotOf: ReadonlyMap<string, number>, ctx: Ctx, rng: Rng): number[];
  /** A per game mean's starting value before it is nudged onto the saved mean. */
  meanBase(key: string, g: DerivedGame): number;
  /** Chance he came off the bench in a game he played. */
  subChance(played: number, games: number): number;
  labels(slots: SlotFacts[], ctx: Ctx, rng: Rng): SlotLabel[];
  /** The timed events of one game (soccer: every goal at its minute, his
   *  assists, cards, coming on, the injury; src/lib/season/soccerEvents.ts).
   *  It may set `started`, `onAt` and `offAt`, must leave the score and his
   *  line alone, and draws only from the rng it is given. Absent: a game has
   *  no events and he starts every game he plays. */
  events?(g: DerivedGame, f: FixedGame | null, game: GameContext, rng: Rng): void;
  /** Round 1048. After every score is accepted and every mean is fitted: the
   *  sport's last pass over the whole season, for numbers that hang off other
   *  numbers of the same game (yards off catches, a kicker's field goals off
   *  his team's score) and the timed events that need them. It may add keys
   *  to a played game's line and set `events`; it must leave scores, `played`,
   *  `why` and every key the core's totals own alone. (Round 1147: it may
   *  have two games he played exchange their whole lines, which keeps every
   *  total and every cap; `disagreements` still holds his floor on the result.
   *  The NFL does, so his touchdown days go with his team's big days.) false: the
   *  row cannot be laid out. Absent: nothing happens (soccer). A sport that has both
   *  this and playable moments must run its finish again after a decision is
   *  applied (Round 1049's job; no sport has both yet). */
  finish?(games: DerivedGame[], row: Row, ctx: Ctx, rng: Rng): boolean;
  /** The sport's own agreement items, beyond the core's (soccer checks its
   *  events against the score here). */
  check?(row: Row, ctx: Ctx, s: DerivedSeason): string[];
  /** Round 1047: the points of a season the player may play himself. Absent: none. */
  moments?: SportMoments<Row, Ctx>;
  words: SeasonWords;
}

/** What the OTHER outcome of a moment adds to its game: points on the board
 *  for either side and units of his line. The mirror move at the return game
 *  is the same delta with every sign turned. */
export interface MomentDelta { us: number; them: number; line: Record<string, number> }

/** A point in a game he played that could be his to play (the sport proposes them). */
export interface MomentSpot {
  md: number;
  minute: number;
  /** The sport's word for what he does there ("finish", "pass", "save", "tackle"). */
  kind: string;
  /** The season as saved has the success here (his goal, his assist, the stop). */
  planSuccess: boolean;
  /** That success is on the record itself (his goal, his assist, a clean
   *  sheet), so with no mirror it can still be played again for stars. */
  onRecord: boolean;
  /** What the other outcome adds to this game. */
  delta: MomentDelta;
  /** The planner's rank, higher first. */
  weight: number;
  /** How much rides on it, 0 (a dead rubber) to 1 (a late one in a derby): the sport sets its board's difficulty from it. */
  stakes: number;
}

export interface Moment extends MomentSpot {
  /** Its number in the season's offer, in match order (the ledger's moment number). */
  id: number;
  /** 'call': either outcome fits and the match follows the player. 'recreate': only the saved success fits. */
  mode: 'call' | 'recreate';
  /** The return game that absorbs the other outcome (call only). */
  mirrorMd: number | null;
}

/** A sport's side of the moments: where they are and how a game takes a delta. */
export interface SportMoments<Row, Ctx> {
  /** Most moments one season offers. */
  max: number;
  /** Every spot of one game he played, drawing only from the rng it is given. */
  spots(row: Row, ctx: Ctx, s: DerivedSeason, g: DerivedGame, rng: Rng): MomentSpot[];
  /** The game with `delta` played (score, his line and its events rewritten;
   *  a per game mean is left to the core), or null when this game cannot
   *  take it. `minute` is the moment's own minute, or null at the return
   *  game, where the sport picks one from the rng. Never changes `g`. */
  apply(row: Row, ctx: Ctx, g: DerivedGame, delta: MomentDelta, minute: number | null, rng: Rng): DerivedGame | null;
}

/** What the core knows about one game that the sport's events need. */
export interface GameContext {
  /** He goes off injured in this game (the injury block starts after it). */
  injured: boolean;
  /** The sport's chance that he came off the bench this season. */
  subChance: number;
}

/** A sport's event: the kind is the sport's own word ("goal", "touchdown");
 *  `pts` is what it put on the board, so a clock can show the score true at
 *  any minute without knowing the sport. */
export interface SeasonEvent { min: number; kind: string; side: 'us' | 'them'; mine?: boolean; pts?: number; ownGoalBy?: 'you' | 'teammate' | 'opponent' }

export interface DerivedGame {
  /** League round, 1 based. */
  md: number;
  opp: number;
  home: boolean;
  us: number;
  them: number;
  fixed: boolean;
  fixedKey?: string;
  played: boolean;
  started: boolean;
  onAt?: number;
  offAt?: number;
  /** His line in this game: goals, assists, rating, yellow, red, cs... by the sport's keys. */
  line: Record<string, number>;
  /** Minute ordered. */
  events: SeasonEvent[];
  why?: 'injured' | 'suspended' | 'rested';
  /** The clean sheet mark his line forced on this game (internal to the derivation). */
  mark?: 'shutout' | 'concede';
}

export interface DerivedSeason {
  key: string;
  mode: Mode;
  rule: PointsRule | null;
  teams: number;
  labels: SlotLabel[];
  /** His club's league games in round order. */
  games: DerivedGame[];
  /** Table mode: every game of every round as [home, away, home goals, away goals]. */
  rounds: [number, number, number, number][][];
  /** Games he played that are not shown one by one. */
  bucket: { apps: number; line: Record<string, number> } | null;
  /** Table mode on a title row: the first round after which nobody can catch him. */
  clinch: { md: number } | null;
  target: TeamTarget;
  attempt: number;
  repairs: number;
}

export interface StandingRow { slot: number; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

const clampN = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/* The keyed Fisher-Yates shuffle: its one body is ../keyedShuffle since Round 1221 (a score law needs it and
   may not import this file), read here and still exported from here. */
export { shuffled };

/** The standings after replaying rounds 1..md of a table. Points, then goal
 *  difference, then goals for; the slot number breaks a full tie so the
 *  order is total (the footnote says ties are this game's rule). */
export function standingsOf(rounds: readonly (readonly [number, number, number, number][])[], teams: number, rule: PointsRule, md: number): StandingRow[] {
  const rows: StandingRow[] = Array.from({ length: teams }, (_, slot) => ({ slot, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  for (let r = 0; r < md && r < rounds.length; r += 1) {
    for (const [h, a, hg, ag] of rounds[r]) {
      const H = rows[h]; const A = rows[a];
      H.p += 1; A.p += 1; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
      if (hg > ag) { H.w += 1; A.l += 1; H.pts += rule.win; A.pts += rule.loss; }
      else if (hg < ag) { A.w += 1; H.l += 1; A.pts += rule.win; H.pts += rule.loss; }
      else { H.d += 1; A.d += 1; H.pts += rule.draw; A.pts += rule.draw; }
    }
  }
  return rows.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.slot - y.slot);
}

/** The table after matchday `md` (0: before a ball is kicked). Empty outside table mode. */
export function tableAt(s: DerivedSeason, md: number): StandingRow[] {
  if (s.mode !== 'table' || !s.rule) return [];
  return standingsOf(s.rounds, s.teams, s.rule, md);
}

/** His totals over the games shown up to matchday `md` (the bucket is not shown by round). */
export function soFar(s: DerivedSeason, md: number): Record<string, number> {
  const out: Record<string, number> = { apps: 0 };
  for (const g of s.games) {
    if (g.md > md || !g.played) continue;
    out.apps += 1;
    for (const [k, v] of Object.entries(g.line)) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

/** The other meeting with the opponent of his game at matchday `md`, or null. */
export function reverseOf(s: DerivedSeason, md: number): number | null {
  const g = s.games.find(x => x.md === md);
  if (!g) return null;
  const other = s.games.find(x => x.opp === g.opp && x.md !== md);
  return other ? other.md : null;
}

/* ─── The derivation ─── */

/** A double round robin calendar of `teams` as rounds of [home, away] pairs
 *  (roundRobinCalendar's circle method, every team once a round). */
export function roundRobinRounds(teams: number): [number, number][][] {
  const flat = roundRobinCalendar(teams);
  const per = Math.floor(teams / 2);
  const out: [number, number][][] = [];
  for (let i = 0; i < flat.length; i += per) out.push(flat.slice(i, i + per));
  return out;
}

/** His row of a double round robin: one game a round, slot 0 against each
 *  other slot home and away (results mode, where no table is shown). */
export function ownRowRounds(teams: number): [number, number][][] {
  return roundRobinRounds(teams).map(r => r.filter(([h, a]) => h === 0 || a === 0)).filter(r => r.length > 0);
}

interface Placed {
  /** His games in round order. */
  mine: { r: number; opp: number; home: boolean }[];
  fixedAt: (FixedGame | null)[];
  slotOf: Map<string, number>;
}

/** Every fixed opponent takes a slot whose games with his club, in time
 *  order, have the fixed meetings' home flags in the saved order. */
function placeFixed(rounds: [number, number][][], fixed: FixedGame[], rng: Rng): Placed | null {
  const mine: Placed['mine'] = [];
  rounds.forEach((pairs, r) => {
    for (const [h, a] of pairs) if (h === 0 || a === 0) mine.push({ r, opp: h === 0 ? a : h, home: h === 0 });
  });
  const fixedAt: (FixedGame | null)[] = mine.map(() => null);
  const slotOf = new Map<string, number>();
  const keys: string[] = [];
  for (const f of fixed) if (!keys.includes(f.key)) keys.push(f.key);
  const taken = new Set<number>();
  for (const key of keys) {
    const meetings = fixed.filter(f => f.key === key);
    const slots = [...new Set(mine.map(m => m.opp))].filter(s => !taken.has(s)).sort((x, y) => x - y);
    const fits = slots.filter(s => {
      const legs = mine.filter(m => m.opp === s);
      return legs.length === meetings.length && legs.every((m, i) => m.home === meetings[i].home);
    });
    if (fits.length === 0) return null;
    const s = fits[Math.floor(rng() * fits.length)];
    taken.add(s);
    slotOf.set(key, s);
    let i = 0;
    mine.forEach((m, idx) => { if (m.opp === s) { fixedAt[idx] = meetings[i]; i += 1; } });
  }
  return { mine, fixedAt, slotOf };
}

interface Avail { played: boolean[]; why: (DerivedGame['why'] | undefined)[] }

/** Which of his games he played: fixed games as saved, an injury block of
 *  the stated length over no fixed game he played (a severe one straight
 *  after his last game, running off the season's end if it must), the rest
 *  of his games chosen until the played count is met. */
function chooseAvailability(p: Placed, a: Availability, rng: Rng): Avail | null {
  const M = p.mine.length;
  const fixedPlayed = p.fixedAt.map(f => !!f && f.played);
  const nFixedPlayed = fixedPlayed.filter(Boolean).length;
  const need = a.played - nFixedPlayed;
  if (need < 0 || a.played > M) return null;
  const played = fixedPlayed.slice();
  const why: Avail['why'] = p.mine.map(() => undefined);
  let suspended = Math.max(0, a.suspended ?? 0);
  for (let i = 0; i < M && suspended > 0; i += 1) {
    if (!p.fixedAt[i]) { why[i] = 'suspended'; suspended -= 1; }
  }
  const free = (i: number) => !p.fixedAt[i];
  const available = (i: number) => free(i) && why[i] !== 'suspended';
  if (a.severe) {
    let lastFixed = -1;
    fixedPlayed.forEach((x, i) => { if (x) lastFixed = i; });
    let W = lastFixed + 1;
    let avail = 0;
    for (let i = 0; i < W; i += 1) if (available(i)) avail += 1;
    while (avail < need && W < M) { if (available(W)) avail += 1; W += 1; }
    if (avail < need) return null;
    const pool = [] as number[];
    for (let i = 0; i < W; i += 1) if (available(i)) pool.push(i);
    const lastFree = pool.length ? pool[pool.length - 1] : -1;
    const mustLast = need > 0 && lastFree === W - 1 && lastFixed < W - 1;
    const rest = shuffled(pool.filter(i => !(mustLast && i === lastFree)), rng).slice(0, need - (mustLast ? 1 : 0));
    if (mustLast) played[lastFree] = true;
    for (const i of rest) played[i] = true;
    let last = -1;
    played.forEach((x, i) => { if (x) last = i; });
    for (let i = last + 1; i < M; i += 1) if (why[i] !== 'suspended') why[i] = i <= last + a.block ? 'injured' : 'rested';
    for (let i = 0; i <= last; i += 1) if (!played[i] && !why[i]) why[i] = 'rested';
    return { played, why };
  }
  if (a.block > 0) {
    const starts: number[] = [];
    for (let s = 0; s + a.block <= M; s += 1) {
      let ok = true;
      for (let i = s; i < s + a.block; i += 1) if (fixedPlayed[i] || why[i] === 'suspended') { ok = false; break; }
      if (!ok) continue;
      let room = 0;
      for (let i = 0; i < M; i += 1) if (available(i) && (i < s || i >= s + a.block)) room += 1;
      if (room >= need) starts.push(s);
    }
    if (starts.length === 0) return null;
    const s = starts[Math.floor(rng() * starts.length)];
    for (let i = s; i < s + a.block; i += 1) why[i] = 'injured';
  }
  const pool = p.mine.map((_, i) => i).filter(i => available(i) && why[i] !== 'injured');
  if (pool.length < need) return null;
  for (const i of shuffled(pool, rng).slice(0, need)) played[i] = true;
  for (let i = 0; i < M; i += 1) if (!played[i] && !why[i]) why[i] = 'rested';
  return { played, why };
}

interface Alloc {
  lines: Record<string, number>[];
  bucket: Record<string, number>;
  marks: (DerivedGame['mark'])[];
  /** His club's score in each of his games may not fall below this (teamFloor of his line). */
  floors: number[];
}

/** Pick an index by weight among those with room; -1 when none has room. */
function pickWeighted(weights: number[], rng: Rng): number {
  let sum = 0;
  for (const w of weights) sum += w > 0 ? w : 0;
  if (sum <= 0) return -1;
  let x = rng() * sum;
  for (let i = 0; i < weights.length; i += 1) {
    if (weights[i] <= 0) continue;
    x -= weights[i];
    if (x < 0) return i;
  }
  for (let i = weights.length - 1; i >= 0; i -= 1) if (weights[i] > 0) return i;
  return -1;
}

/** The least his club can have scored in a game, from his line: every
 *  `teamFor` stat's units times the points each puts on the board. */
export function teamFloor(totals: readonly StatTotal[], line: Record<string, number>): number {
  let s = 0;
  for (const t of totals) if (t.kind === 'sum' && t.teamFor) s += (line[t.key] ?? 0) * (t.teamPoints ?? 1);
  return s;
}

/** His line over the games he played and the bucket, exactly on the saved totals. */
function allocate(p: Placed, av: Avail, totals: StatTotal[], bucketApps: number, rng: Rng): Alloc | null {
  const M = p.mine.length;
  const lines: Record<string, number>[] = p.fixedAt.map(f => (f ? { ...f.line } : {}));
  const bucket: Record<string, number> = {};
  const marks: Alloc['marks'] = p.mine.map(() => undefined);
  const phase = rng() * Math.PI * 2;
  const form = p.mine.map((_, i) => (1 + 0.45 * Math.sin(phase + (i / Math.max(1, M)) * Math.PI * 2)) * (0.6 + rng() * 0.8));
  const teamSum = (i: number) => teamFloor(totals, lines[i]);
  const cardTaken = (i: number, group: string) => totals.some(t => t.kind === 'sum' && t.distinct === group && (lines[i][t.key] ?? 0) > 0);
  const bucketCards = (group: string) => totals.reduce((s, t) => s + (t.kind === 'sum' && t.distinct === group ? bucket[t.key] ?? 0 : 0), 0);
  const order = [...totals.filter(t => t.kind === 'sum' && !t.distinct), ...totals.filter(t => t.kind === 'sum' && t.distinct && t.suspends), ...totals.filter(t => t.kind === 'sum' && t.distinct && !t.suspends), ...totals.filter(t => t.kind === 'count-of')];
  let lastPlayed = -1;
  av.played.forEach((x, i) => { if (x) lastPlayed = i; });
  for (const t of order) {
    if (t.kind === 'sum' && !t.distinct) {
      let rem = t.total;
      const owns = (i: number) => !!p.fixedAt[i] && p.fixedAt[i]!.line[t.key] !== undefined;
      for (let i = 0; i < M; i += 1) if (owns(i)) rem -= p.fixedAt[i]!.line[t.key];
      if (rem < 0) return null;
      bucket[t.key] = 0;
      for (let i = 0; i < M; i += 1) if (!owns(i)) lines[i][t.key] = 0;
      for (let u = 0; u < rem; u += 1) {
        const w = p.mine.map((_, i) => {
          if (!av.played[i] || owns(i) || lines[i][t.key] >= t.perGameCap) return 0;
          const f = p.fixedAt[i];
          if (t.teamFor && f && teamSum(i) + (t.teamPoints ?? 1) > f.us) return 0;
          return t.formPower === undefined ? form[i] : form[i] ** t.formPower;
        });
        const bucketRoom = !t.noBucket && bucket[t.key] < t.perGameCap * bucketApps;
        w.push(bucketRoom ? bucketApps * 0.9 : 0);
        const at = pickWeighted(w, rng);
        if (at < 0) return null;
        if (at === M) bucket[t.key] += 1; else lines[at][t.key] += 1;
      }
    } else if (t.kind === 'sum' && t.distinct) {
      bucket[t.key] = 0;
      for (let i = 0; i < M; i += 1) lines[i][t.key] = 0;
      for (let u = 0; u < t.total; u += 1) {
        const ok: number[] = p.mine.map((_, i): number => {
          if (!av.played[i] || cardTaken(i, t.distinct!)) return 0;
          if (!t.suspends) return 1;
          if (i === lastPlayed) return 1;
          return i + 1 < M && !av.played[i + 1] && av.why[i + 1] === 'rested' ? 1 : 0;
        });
        ok.push(bucketCards(t.distinct) < bucketApps ? Math.max(0.5, bucketApps * 0.3) : 0);
        const at = pickWeighted(ok, rng);
        if (at < 0) return null;
        if (at === M) { bucket[t.key] += 1; continue; }
        lines[at][t.key] = 1;
        if (t.suspends && at !== lastPlayed) av.why[at + 1] = 'suspended';
      }
    } else if (t.kind === 'count-of') {
      let rem = t.total;
      const free: number[] = [];
      for (let i = 0; i < M; i += 1) {
        if (!av.played[i]) continue;
        const f = p.fixedAt[i];
        if (f) { const cs = f.them === 0 ? 1 : 0; lines[i][t.key] = cs; rem -= cs; } else free.push(i);
      }
      if (rem < 0) return null;
      const n = free.length;
      const lo = Math.max(0, rem - bucketApps);
      const hi = Math.min(rem, n);
      if (lo > hi) return null;
      const inLeague = n + bucketApps > 0 ? clampN(Math.round((rem * n) / (n + bucketApps)), lo, hi) : 0;
      const pick = new Set(shuffled(free, rng).slice(0, inLeague));
      for (const i of free) { const s = pick.has(i); marks[i] = s ? 'shutout' : 'concede'; lines[i][t.key] = s ? 1 : 0; }
      bucket[t.key] = rem - inLeague;
    }
  }
  const floors = p.mine.map((_, i) => (av.played[i] ? teamSum(i) : 0));
  for (let i = 0; i < M; i += 1) { const f = p.fixedAt[i]; if (f && f.us < floors[i]) return null; }
  for (let i = 0; i < M; i += 1) if (!av.played[i]) lines[i] = {};
  return { lines, bucket, marks, floors };
}

type Board = [number, number, number, number][][];
const GOAL_CAP = 7;

interface Locks { at: Map<string, number>; p: Placed; al: Alloc; cap: number; wide: boolean }
const cell = (r: number, k: number) => `${r}:${k}`;

/** The goals a side may hold in a game: his floors and clean sheet marks, a fixed game not at all. */
function bounds(L: Locks, r: number, k: number, homeSide: boolean): [number, number] | null {
  const i = L.at.get(cell(r, k));
  if (i === undefined) return [0, L.cap];
  if (L.p.fixedAt[i]) return null;
  const m = L.p.mine[i];
  const usSide = m.home === homeSide;
  if (usSide) return [L.al.floors[i], L.cap];
  const mark = L.al.marks[i];
  return mark === 'shutout' ? [0, 0] : mark === 'concede' ? [1, L.cap] : [0, L.cap];
}

/** One goal moved so that `slot` gains (dir 1) or loses (dir -1) points, or false. */
function nudge(board: Board, L: Locks, slot: number, dir: 1 | -1, rng: Rng): boolean {
  const opts: [number, number, number, number][] = []; // r, k, index in tuple (2 or 3), delta
  board.forEach((pairs, r) => pairs.forEach((g, k) => {
    if (g[0] !== slot && g[1] !== slot) return;
    const home = g[0] === slot;
    const si = home ? 2 : 3; const oi = home ? 3 : 2;
    const sb = bounds(L, r, k, home); const ob = bounds(L, r, k, !home);
    if (!sb || !ob) return;
    const s = g[si]; const o = g[oi];
    if (L.wide) {
      /* a record sport: a lost or drawn game becomes a one point win, a won or drawn one a one point loss */
      if (dir === 1 && s <= o && o + 1 <= sb[1]) opts.push([r, k, si, o + 1 - s]);
      if (dir === -1 && s >= o && s + 1 <= ob[1]) opts.push([r, k, oi, s + 1 - o]);
      return;
    }
    if (dir === 1 && (s === o || s === o - 1)) {
      if (s + 1 <= sb[1]) opts.push([r, k, si, 1]);
      if (o - 1 >= ob[0]) opts.push([r, k, oi, -1]);
    }
    if (dir === -1 && (s === o || s === o + 1)) {
      if (o + 1 <= ob[1]) opts.push([r, k, oi, 1]);
      if (s - 1 >= sb[0]) opts.push([r, k, si, -1]);
    }
  }));
  if (opts.length === 0) return false;
  const [r, k, idx, d] = opts[Math.floor(rng() * opts.length)];
  board[r][k][idx] += d;
  return true;
}

interface Fix { slot: number; dir: 1 | -1; alt?: { slot: number; dir: 1 | -1 } }

/** What, if anything, keeps this board from matching the saved team target. */
function violation(board: Board, frame: Frame, target: TeamTarget, slotOf: Map<string, number>): Fix | null {
  if (target.kind === 'none') return null;
  if (target.kind === 'record' || target.kind === 'band') {
    let w = 0; let d = 0; let n = 0;
    for (const pairs of board) for (const [h, a, hg, ag] of pairs) {
      if (h !== 0 && a !== 0) continue;
      const us = h === 0 ? hg : ag; const them = h === 0 ? ag : hg;
      n += 1; if (us > them) w += 1; else if (us === them) d += 1;
    }
    if (target.kind === 'record') return w < target.winsMin ? { slot: 0, dir: 1 } : w > target.winsMax ? { slot: 0, dir: -1 } : null;
    const rule = frame.rule ?? { win: 3, draw: 1, loss: 0 };
    const ppg = n ? (w * rule.win + d * rule.draw) / n : 0;
    return ppg < target.ppgMin ? { slot: 0, dir: 1 } : ppg > target.ppgMax ? { slot: 0, dir: -1 } : null;
  }
  const rows = standingsOf(board, frame.teams, frame.rule!, board.length);
  const f = target.finish;
  const pos = rows.findIndex(x => x.slot === 0) + 1;
  if (pos > f) return { slot: 0, dir: 1, alt: { slot: rows[pos - 2].slot, dir: -1 } };
  if (pos < f) return { slot: 0, dir: -1, alt: { slot: rows[pos].slot, dir: 1 } };
  if (f > 1 && rows[f - 2].pts === rows[f - 1].pts) return { slot: rows[f - 2].slot, dir: 1 };
  if (f < rows.length && rows[f].pts === rows[f - 1].pts) return { slot: rows[f].slot, dir: -1 };
  if (f === 1) return zoneViolation(rows, target.zone, slotOf);
  if (rows[0].pts === rows[1].pts) return { slot: rows[0].slot, dir: 1, alt: rows[1].slot !== 0 ? { slot: rows[1].slot, dir: -1 } : undefined };
  const fixedSlots = new Set(slotOf.values());
  const ch = target.champion;
  if (typeof ch === 'object') {
    const ks = slotOf.get(ch.key);
    if (ks === undefined) return { slot: rows[0].slot, dir: -1 };
    if (rows[0].slot !== ks) return { slot: ks, dir: 1, alt: { slot: rows[0].slot, dir: -1 } };
  } else if (ch === 'other' && fixedSlots.has(rows[0].slot)) {
    return { slot: rows[0].slot, dir: -1 };
  }
  return zoneViolation(rows, target.zone, slotOf);
}

/** Release AQ: the first fixed opponent on the wrong side of a saved zone,
 *  and which way its club has to move. The other club of the fix is the one
 *  standing at the zone's edge, when that club is free to move (not his, not
 *  another fixed opponent). Null with no zone, which is every season that
 *  saved no promotion or relegation. */
function zoneViolation(rows: StandingRow[], zone: TableZone | undefined, slotOf: Map<string, number>): Fix | null {
  if (!zone) return null;
  const fixedSlots = new Set(slotOf.values());
  const free = (slot: number | undefined) => slot !== undefined && slot !== 0 && !fixedSlots.has(slot);
  for (const [key, inside] of zone.fixed) {
    const ks = slotOf.get(key);
    if (ks === undefined) continue;
    const at = rows.findIndex(x => x.slot === ks) + 1;
    if ((at >= zone.from && at <= zone.to) === inside) continue;
    /* a zone at the foot of the table is left by climbing, one at the head by dropping */
    const foot = zone.from > 1;
    const dir: 1 | -1 = inside === foot ? -1 : 1;
    const edge = foot ? (inside ? rows[zone.from - 1]?.slot : rows[zone.from - 2]?.slot) : (inside ? rows[zone.to - 1]?.slot : rows[zone.to]?.slot);
    return { slot: ks, dir, ...(free(edge) ? { alt: { slot: edge as number, dir: (dir === 1 ? -1 : 1) as 1 | -1 } } : {}) };
  }
  return null;
}

const ATTEMPTS = 30;
const REPAIRS = 40;

/** One keyed attempt at every score, then up to REPAIRS one goal repairs. */
function playAttempt<R, C>(sport: SeasonSport<R, C>, frame: Frame, rounds: [number, number][][], L: Locks, str: number[], key: string, t: number, target: TeamTarget, slotOf: Map<string, number>): { board: Board; repairs: number } | null {
  const rng = keyedRng(`${key}|score|${t}`);
  const board: Board = rounds.map((pairs, r) => pairs.map(([h, a], k): [number, number, number, number] => {
    const i = L.at.get(cell(r, k));
    if (i === undefined) {
      const [hg, ag] = sport.score(str[h] - str[a], true, rng);
      return [h, a, hg, ag];
    }
    const f = L.p.fixedAt[i];
    const m = L.p.mine[i];
    let us: number; let them: number;
    if (f) { us = f.us; them = f.them; } else {
      [us, them] = sport.score(str[0] - str[m.opp], m.home, rng);
      us = Math.min(L.cap, Math.max(us, L.al.floors[i]));
      const mark = L.al.marks[i];
      if (mark === 'shutout') them = 0; else if (mark === 'concede') them = Math.max(1, them);
    }
    return m.home ? [h, a, us, them] : [h, a, them, us];
  }));
  for (let n = 0; n <= REPAIRS; n += 1) {
    const v = violation(board, frame, target, slotOf);
    if (!v) return { board, repairs: n };
    if (n === REPAIRS) break;
    const first = v.alt && rng() < 0.5 ? v.alt : v;
    const second = first === v ? v.alt : v;
    if (!nudge(board, L, first.slot, first.dir, rng) && !(second && nudge(board, L, second.slot, second.dir, rng))) break;
  }
  return null;
}

/** The first round after which his club cannot be caught (strict: no tiebreak is ever claimed). */
export function clinchOf(rounds: Board, teams: number, rule: PointsRule): number | null {
  const total = new Array(teams).fill(0);
  for (const pairs of rounds) for (const [h, a] of pairs) { total[h] += 1; total[a] += 1; }
  for (let md = 1; md <= rounds.length; md += 1) {
    const rows = standingsOf(rounds, teams, rule, md);
    const me = rows.find(x => x.slot === 0)!;
    if (rows.every(x => x.slot === 0 || me.pts > x.pts + rule.win * (total[x.slot] - x.p))) return md;
  }
  return null;
}

/** Per game values whose mean rounds to the saved mean, every value in range. */
function fitMean(games: DerivedGame[], t: Extract<StatTotal, { kind: 'mean' }>, base: (g: DerivedGame) => number, rng: Rng): boolean {
  const on = games.filter(g => g.played);
  if (on.length === 0) return true;
  const step = t.perGame === 'int' ? 1 : 0.1;
  const snap = (v: number) => Math.round(clampN(v, t.min, t.max) / step) * step;
  const vals = on.map(g => snap(base(g) + (rng() - 0.5) * (t.perGame === 'int' ? 2 : 1.2)));
  const scale = t.dp === 1 ? 10 : 1;
  const target = Math.round(t.mean * scale);
  const meanOk = () => Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * scale + 1e-9) === target;
  for (let n = 0; n < 4000 && !meanOk(); n += 1) {
    const up = vals.reduce((s, v) => s + v, 0) / vals.length < t.mean;
    const can = vals.map((v, i) => (up ? v + step <= t.max + 1e-9 : v - step >= t.min - 1e-9) ? i : -1).filter(i => i >= 0);
    if (can.length === 0) return false;
    const i = can[Math.floor(rng() * can.length)];
    vals[i] = Math.round((vals[i] + (up ? step : -step)) / step) * step;
  }
  if (!meanOk()) return false;
  on.forEach((g, i) => { g.line[t.key] = Math.round(vals[i] * 10) / 10; });
  return true;
}

/** Derive the season, or null when the saved row cannot be laid out match by match. */
export function deriveSeason<R, C>(sport: SeasonSport<R, C>, row: R, ctx: C): DerivedSeason | null {
  const s = deriveSeasonOrWhy(sport, row, ctx);
  return typeof s === 'string' ? null : s;
}

/** The same, saying which stage refused a season (the harnesses print the split). */
export function deriveSeasonOrWhy<R, C>(sport: SeasonSport<R, C>, row: R, ctx: C): DerivedSeason | string {
  const key = sport.seasonKey(row, ctx);
  if (key === null) return 'nokey';
  const frame = sport.frame(row, ctx);
  const cal = keyedRng(`${key}|cal`);
  const rounds = sport.fixtures(frame, cal);
  const p = placeFixed(rounds, sport.fixed(row, ctx, frame), cal);
  if (!p) return 'fixed';
  const av = chooseAvailability(p, sport.availability(row, ctx, frame), keyedRng(`${key}|avail`));
  if (!av) return 'availability';
  const shown = av.played.filter(Boolean).length;
  const bucketApps = sport.apps(row) - shown;
  if (bucketApps < 0) return 'apps';
  const totals = sport.totals(row, ctx);
  const al = allocate(p, av, totals, bucketApps, keyedRng(`${key}|alloc`));
  if (!al) return 'allocation';
  const target = sport.target(row, ctx, frame);
  const at = new Map<string, number>();
  p.mine.forEach((m, i) => at.set(cell(m.r, rounds[m.r].findIndex(([h, a]) => h === 0 || a === 0)), i));
  const L: Locks = { at, p, al, cap: frame.cap ?? GOAL_CAP, wide: frame.mode === 'record' };
  const str = sport.strengths(frame, target, p.slotOf, ctx, keyedRng(`${key}|str`));
  let won: { board: Board; repairs: number } | null = null;
  let attempt = 0;
  for (; attempt < ATTEMPTS && !won; attempt += 1) won = playAttempt(sport, frame, rounds, L, str, key, attempt, target, p.slotOf);
  if (!won) return 'attempts';
  const board = won.board;
  const minRng = keyedRng(`${key}|min`);
  const subChance = sport.subChance(shown, p.mine.length);
  const games: DerivedGame[] = p.mine.map((m, i) => {
    const k = rounds[m.r].findIndex(([h, a]) => h === 0 || a === 0);
    const [, , hg, ag] = board[m.r][k];
    const f = p.fixedAt[i];
    const g: DerivedGame = { md: m.r + 1, opp: m.opp, home: m.home, us: m.home ? hg : ag, them: m.home ? ag : hg, fixed: !!f, played: av.played[i], started: false, line: al.lines[i], events: [] };
    if (f) g.fixedKey = f.key;
    if (!av.played[i]) g.why = av.why[i];
    if (al.marks[i]) g.mark = al.marks[i];
    /* the game he played just before an injury block is the one he went off in */
    const injured = av.played[i] && i + 1 < p.mine.length && av.why[i + 1] === 'injured';
    if (sport.events) sport.events(g, f, { injured, subChance }, minRng);
    else g.started = g.played;
    return g;
  });
  for (const t of totals) {
    if (t.kind === 'mean' && !fitMean(games, t, g => sport.meanBase(t.key, g), minRng)) return 'mean';
    if (t.kind === 'max') {
      const on = games.filter(g => g.played);
      if (on.length) {
        const top = Math.floor(minRng() * on.length);
        on.forEach((g, i) => { g.line[t.key] = i === top ? t.max : Math.floor(minRng() * (t.max + 1)); });
      }
    }
  }
  if (sport.finish && !sport.finish(games, row, ctx, keyedRng(`${key}|fin`))) return 'finish';
  const rows = frame.mode === 'table' && frame.rule ? standingsOf(board, frame.teams, frame.rule, board.length) : [];
  const keyOfSlot = new Map<number, string>();
  p.slotOf.forEach((s, k) => keyOfSlot.set(s, k));
  const facts: SlotFacts[] = Array.from({ length: frame.teams }, (_, slot) => {
    const pos = rows.findIndex(x => x.slot === slot) + 1;
    return { slot, pos, fixedKey: keyOfSlot.get(slot) ?? null, champion: pos === 1 && slot !== 0 };
  });
  const labels = sport.labels(facts, ctx, keyedRng(`${key}|label`));
  const title = target.kind === 'finish' && target.title;
  const md = title && frame.rule ? clinchOf(board, frame.teams, frame.rule) : null;
  const s: DerivedSeason = {
    key, mode: frame.mode, rule: frame.rule, teams: frame.teams, labels, games,
    rounds: board, bucket: { apps: bucketApps, line: al.bucket }, clinch: md ? { md } : null,
    target, attempt: attempt - 1, repairs: won.repairs,
  };
  const bad = disagreements(sport, row, ctx, s);
  return bad.length === 0 ? s : `self: ${bad[0]}`;
}

/** Every way the derived season disagrees with the saved row (empty: it agrees). */
export function disagreements<R, C>(sport: SeasonSport<R, C>, row: R, ctx: C, s: DerivedSeason): string[] {
  const out: string[] = [];
  const frame = sport.frame(row, ctx);
  const a = sport.availability(row, ctx, frame);
  const on = s.games.filter(g => g.played);
  const bucket = s.bucket ?? { apps: 0, line: {} };
  if (on.length + bucket.apps !== sport.apps(row)) out.push(`apps ${on.length}+${bucket.apps} != ${sport.apps(row)}`);
  if (on.length !== a.played) out.push(`league played ${on.length} != ${a.played}`);
  if (s.games.length !== frame.games) out.push(`games ${s.games.length} != ${frame.games}`);
  for (const t of sport.totals(row, ctx)) {
    const vals = on.map(g => g.line[t.key] ?? 0);
    if (t.kind === 'sum') {
      const total = vals.reduce((x, v) => x + v, 0) + (bucket.line[t.key] ?? 0);
      if (total !== t.total) out.push(`${t.key} ${total} != ${t.total}`);
      if (vals.some(v => v > t.perGameCap)) out.push(`${t.key} over its cap in a game`);
      if (t.noBucket && (bucket.line[t.key] ?? 0) > 0) out.push(`${t.key} in the bucket`);
      if ((bucket.line[t.key] ?? 0) > t.perGameCap * bucket.apps) out.push(`${t.key} bucket over its cap`);
    } else if (t.kind === 'count-of') {
      const shown = on.filter(g => g.them === 0).length;
      if (shown + (bucket.line[t.key] ?? 0) !== t.total) out.push(`${t.key} ${shown}+${bucket.line[t.key] ?? 0} != ${t.total}`);
      if (on.some(g => (g.line[t.key] ?? 0) !== (g.them === 0 ? 1 : 0))) out.push(`${t.key} mark disagrees with a score`);
    } else if (t.kind === 'mean' && on.length) {
      const scale = t.dp === 1 ? 10 : 1;
      const mean = vals.reduce((x, v) => x + v, 0) / vals.length;
      if (Math.round(mean * scale + 1e-9) !== Math.round(t.mean * scale)) out.push(`${t.key} mean ${mean.toFixed(3)} != ${t.mean}`);
      if (vals.some(v => v < t.min - 1e-9 || v > t.max + 1e-9)) out.push(`${t.key} out of range`);
    } else if (t.kind === 'max' && on.length && Math.max(...vals) !== t.max) out.push(`${t.key} max != ${t.max}`);
  }
  const totalsNow = sport.totals(row, ctx);
  for (const g of on) if (teamFloor(totalsNow, g.line) > g.us) out.push(`md ${g.md}: his line puts more on the board than his club scored`);
  /* events with points must add up to the score (each sport's own events
     are checked by its `check`) */
  for (const g of s.games) {
    if (!g.events.some(e => e.pts)) continue;
    const us = g.events.reduce((x, e) => x + (e.side === 'us' ? e.pts ?? 0 : 0), 0);
    const them = g.events.reduce((x, e) => x + (e.side === 'them' ? e.pts ?? 0 : 0), 0);
    if (us !== g.us || them !== g.them) out.push(`md ${g.md}: the events' points do not make the score`);
  }
  const fixed = sport.fixed(row, ctx, frame);
  const keys = [...new Set(fixed.map(f => f.key))];
  for (const k of keys) {
    const want = fixed.filter(f => f.key === k);
    const got = s.games.filter(g => g.fixedKey === k);
    if (got.length !== want.length) { out.push(`fixed ${k}: ${got.length} games for ${want.length}`); continue; }
    want.forEach((f, i) => {
      const g = got[i];
      if (g.home !== f.home || g.us !== f.us || g.them !== f.them || g.played !== f.played) out.push(`fixed ${k} #${i + 1} differs`);
      for (const [lk, lv] of Object.entries(f.line)) if (f.played && (g.line[lk] ?? 0) !== lv) out.push(`fixed ${k} #${i + 1} ${lk}`);
    });
  }
  const inj = s.games.map(g => g.why === 'injured');
  const first = inj.indexOf(true);
  const runEnd = first < 0 ? -1 : (() => { let e = first; while (e + 1 < inj.length && inj[e + 1]) e += 1; return e; })();
  const run = first < 0 ? 0 : runEnd - first + 1;
  if (inj.lastIndexOf(true) !== runEnd) out.push('injury is not one run');
  if (a.severe) {
    const last = s.games.map(g => g.played).lastIndexOf(true);
    if (run !== Math.min(a.block, s.games.length - last - 1)) out.push(`severe injury run ${run}`);
    if (first >= 0 && first !== last + 1) out.push('severe injury does not follow his last game');
  } else if (run !== a.block) out.push(`injury run ${run} != ${a.block}`);
  const redKey = sport.totals(row, ctx).find(t => t.kind === 'sum' && t.suspends)?.key;
  if (s.games.filter(g => g.why === 'suspended').length < (a.suspended ?? 0)) out.push('served bans missing from availability');
  for (const [i, g] of s.games.entries()) {
    const red = !!redKey && (g.line[redKey] ?? 0) > 0;
    if (red && s.games[i + 1]?.why !== 'suspended' && s.games.slice(i + 1).some(x => x.played)) out.push(`md ${g.md}: a red with no suspension`);
  }
  out.push(...targetDisagreements(s, frame, sport.target(row, ctx, frame)));
  if (sport.check) out.push(...sport.check(row, ctx, s));
  return out;
}

/** Checked against the target rebuilt from the row, never only the one the season carries. */
function targetDisagreements(s: DerivedSeason, frame: Frame, target: TeamTarget): string[] {
  const out: string[] = [];
  if (JSON.stringify(target) !== JSON.stringify(s.target)) out.push('the season carries another team target than its row');
  const slotOf = new Map<string, number>();
  for (const g of s.games) if (g.fixedKey) slotOf.set(g.fixedKey, g.opp);
  if (violation(s.rounds, frame, target, slotOf)) out.push(`team target not met (${target.kind})`);
  if (s.mode === 'table' && s.rule) {
    const title = target.kind === 'finish' && target.title;
    const md = title ? clinchOf(s.rounds, s.teams, s.rule) : null;
    if ((s.clinch?.md ?? null) !== md) out.push('clinch round');
    const rows = standingsOf(s.rounds, s.teams, s.rule, s.rounds.length);
    if (rows.some(r => r.pts !== s.rule!.win * r.w + s.rule!.draw * r.d + s.rule!.loss * r.l)) out.push('points rule');
    if (rows.some(r => r.p !== frame.games)) out.push('games played');
  }
  return out;
}

/* ─── Round 1047: moments (YOUR CALL and RECREATE) ───

   A moment hangs on a point of a game he played. One outcome is the saved
   season's own; the question is whether the OTHER one can be absorbed. In a
   double round robin every opponent is met twice, so the other outcome at
   game G is paid back by the exact mirror move at the return game G': the
   same delta with every sign turned. When the two result changes are equal
   and opposite, the points cancel for both clubs, goals for and against
   cancel, and his totals cancel, so every final table row, his position, the
   champion and every saved total are exactly as saved, and only the matches
   between G and G' tell another story.

   Nothing here trusts that argument: `otherOutcome` builds the alternate
   season and keeps it only when `disagreements` (the whole agreement list)
   is empty for it and its final standings equal the plan's row for row.
   No draw from Math.random: the sport's rewrites get keyed generators. */

const turned = (d: MomentDelta): MomentDelta => ({
  us: d.us === 0 ? 0 : -d.us,
  them: d.them === 0 ? 0 : -d.them,
  line: Object.fromEntries(Object.entries(d.line).map(([k, v]) => [k, v === 0 ? 0 : -v])),
});
const touchesLine = (d: MomentDelta) => Object.values(d.line).some(v => v !== 0);
const momentKey = (s: DerivedSeason, spot: MomentSpot) => `${s.key}|moment|${spot.md}|${spot.minute}|${spot.kind}|${spot.planSuccess ? 1 : 0}`;

/** The season with some of his games replaced: the board follows them and the clinch is read again. */
function withGames(s: DerivedSeason, changed: DerivedGame[]): DerivedSeason {
  const by = new Map(changed.map(g => [g.md, g]));
  const games = s.games.map(g => by.get(g.md) ?? g);
  const rounds = s.rounds.map((pairs, r) => {
    const g = by.get(r + 1);
    if (!g) return pairs;
    return pairs.map((p): [number, number, number, number] => (p[0] === 0 || p[1] === 0 ? (g.home ? [p[0], p[1], g.us, g.them] : [p[0], p[1], g.them, g.us]) : p));
  });
  const title = s.target.kind === 'finish' && s.target.title;
  const md = title && s.rule && s.mode === 'table' ? clinchOf(rounds, s.teams, s.rule) : null;
  return { ...s, games, rounds, clinch: md ? { md } : null };
}

/** His club's record over the games shown, for the modes with no table. */
function ownRecord(s: DerivedSeason): string {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const g of s.games) { gf += g.us; ga += g.them; if (g.us > g.them) w += 1; else if (g.us < g.them) l += 1; else d += 1; }
  return `${w}|${d}|${l}|${gf}|${ga}`;
}

/** The final standings (or his record where no table is shown) as one comparable string. */
export function finalLine(s: DerivedSeason): string {
  return s.mode === 'table' && s.rule ? JSON.stringify(standingsOf(s.rounds, s.teams, s.rule, s.rounds.length)) : ownRecord(s);
}

/** The season with the other outcome of `spot` played and absorbed at the
 *  return game, or null when it has no legal mirror (the both fit test). */
export function otherOutcome<R, C>(sport: SeasonSport<R, C>, row: R, ctx: C, s: DerivedSeason, spot: MomentSpot): { season: DerivedSeason; mirrorMd: number } | null {
  const hook = sport.moments;
  if (!hook) return null;
  const g = s.games[spot.md - 1];
  if (!g || g.md !== spot.md || !g.played || g.fixed) return null;
  const meetings = s.games.filter(x => x.opp === g.opp);
  if (meetings.length !== 2) return null;
  const back = meetings.find(x => x.md !== g.md)!;
  /* only a later game can pay it back, so nothing already watched changes */
  if (back.md <= g.md || back.fixed) return null;
  if (touchesLine(spot.delta) && !back.played) return null;
  const key = momentKey(s, spot);
  const a = hook.apply(row, ctx, g, spot.delta, spot.minute, keyedRng(`${key}|a`));
  if (!a) return null;
  const b = hook.apply(row, ctx, back, turned(spot.delta), null, keyedRng(`${key}|b`));
  if (!b) return null;
  /* a per game mean moves by equal and opposite steps, so its sum (and the
     saved mean) is untouched; with no room, or a return game he missed, it
     does not move at all */
  for (const t of sport.totals(row, ctx)) {
    if (t.kind !== 'mean' || !back.played) continue;
    const step = t.perGame === 'int' ? 1 : 0.1;
    const at = (v: number) => Math.round(v / step);
    const here = at(g.line[t.key] ?? 0); const there = at(back.line[t.key] ?? 0);
    const want = at(sport.meanBase(t.key, a)) - at(sport.meanBase(t.key, g));
    const up = Math.min(at(t.max) - here, there - at(t.min));
    const down = Math.min(here - at(t.min), at(t.max) - there);
    const n = clampN(want, -Math.max(0, down), Math.max(0, up));
    a.line = { ...a.line, [t.key]: Math.round((here + n) * step * 10) / 10 };
    b.line = { ...b.line, [t.key]: Math.round((there - n) * step * 10) / 10 };
  }
  const season = withGames(s, [a, b]);
  if (finalLine(season) !== finalLine(s)) return null;
  if (disagreements(sport, row, ctx, season).length > 0) return null;
  return { season, mirrorMd: back.md };
}

/** What a YOUR CALL adds to its rank over a RECREATE of the same stakes. */
const CALL_BONUS = 1;
/** The modes a season's offer is filled with first, in this order. */
const MIX = ['call', 'recreate', 'call'] as const;

/** The moments a season offers: at most `max`, in match order, no two on the
 *  same game or on each other's return game, so every mix of outcomes is
 *  legal. The best YOUR CALL goes in first, then the best RECREATE, then a
 *  second YOUR CALL, the rest by rank, so a season leans on the moments that
 *  can go either way. Read only: planning draws from `|moment` and changes
 *  nothing. */
export function planMoments<R, C>(sport: SeasonSport<R, C>, row: R, ctx: C, s: DerivedSeason): Moment[] {
  const hook = sport.moments;
  if (!hook || hook.max <= 0) return [];
  const rng = keyedRng(`${s.key}|moment`);
  type Cand = MomentSpot & { mode: 'call' | 'recreate'; mirrorMd: number | null };
  const cands: Cand[] = [];
  for (const g of s.games) {
    if (!g.played) continue;
    for (const spot of hook.spots(row, ctx, s, g, rng)) {
      const other = otherOutcome(sport, row, ctx, s, spot);
      /* a moment that can go either way outranks one that only replays the record */
      if (other) cands.push({ ...spot, weight: spot.weight + CALL_BONUS, mode: 'call', mirrorMd: other.mirrorMd });
      /* a recorded success with no mirror can still be played again, for stars only */
      else if (spot.planSuccess && spot.onRecord) cands.push({ ...spot, mode: 'recreate', mirrorMd: null });
    }
  }
  cands.sort((x, y) => y.weight - x.weight || x.md - y.md || x.minute - y.minute);
  const used = new Set<number>();
  const picked: Cand[] = [];
  const free = (c: Cand) => !used.has(c.md) && (c.mirrorMd === null || !used.has(c.mirrorMd));
  const take = (c: Cand) => { picked.push(c); used.add(c.md); if (c.mirrorMd !== null) used.add(c.mirrorMd); };
  for (const mode of MIX) {
    const best = cands.find(c => c.mode === mode && free(c));
    if (best && picked.length < hook.max) take(best);
  }
  for (const c of cands) { if (picked.length >= hook.max) break; if (free(c)) take(c); }
  picked.sort((x, y) => x.md - y.md || x.minute - y.minute);
  return picked.map((c, id) => ({ ...c, id }));
}

/** How one moment went, from the ledger: not in it means the season played as saved. */
export function momentResult(m: Moment, entries: readonly (readonly number[])[]): { taken: boolean; success: boolean; stars: number; flipped: boolean } {
  const e = entries.find(x => x[0] === m.md && x[1] === m.id);
  if (!e) return { taken: false, success: m.planSuccess, stars: 0, flipped: false };
  const made = e[2] >= 1;
  /* a recreate never changes the record; a call follows the player */
  const success = m.mode === 'call' ? made : m.planSuccess;
  return { taken: true, success, stars: Math.max(0, e[2]), flipped: m.mode === 'call' && made !== m.planSuccess };
}

/** The season as the player shaped it: every YOUR CALL whose outcome differs
 *  from the plan is replayed with its mirror, in match order, with no draw.
 *  Fails closed: if the result disagrees with the saved row in any way, the
 *  plan itself is returned. */
export function applyDecisions<R, C>(sport: SeasonSport<R, C>, row: R, ctx: C, plan: DerivedSeason, moments: readonly Moment[], entries: readonly (readonly number[])[]): DerivedSeason {
  let s = plan;
  let changed = false;
  for (const m of [...moments].sort((x, y) => x.md - y.md)) {
    if (!momentResult(m, entries).flipped) continue;
    const other = otherOutcome(sport, row, ctx, s, m);
    if (!other || other.mirrorMd !== m.mirrorMd) return plan;
    s = other.season;
    changed = true;
  }
  if (!changed) return plan;
  return finalLine(s) === finalLine(plan) && disagreements(sport, row, ctx, s).length === 0 ? s : plan;
}
