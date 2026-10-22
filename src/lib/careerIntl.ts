/* Round 1541: the international summer of a career, sport free.
 *
 * In a summer with a national team tournament, a player good enough is called
 * up, goes or rests, and if he goes his nation plays a group and a knockout
 * against the nations of that summer. This module is the tournament and the
 * record of it. It holds no sport's numbers and no sport's words beyond the
 * place names (gold, silver, bronze, fourth, quarter-final, round of 16,
 * group): a sport binds it through IntlSportBind (src/lib/nbaCareerIntl.ts is
 * the first), so the NHL's Olympics and MLB's Classic bind it later rather
 * than copy it.
 *
 * WHERE THE SHAPE COMES FROM. Soccer Career runs an international career on
 * src/lib/soccerInternational.ts and src/lib/soccerCareerEngine.ts (session
 * I's files, read as the model and not edited). The shape is lifted from them:
 * InternationalStats becomes CareerIntlStats, derived from the summers kept on
 * the save and never stored as counters; simulateTournament's field, pots by
 * strength, a full round robin a group, the top places plus the best thirds
 * and a knockout becomes runIntlTournament; IntlHistoryEntry becomes one
 * compact row a summer kept for ever, with the whole bracket only for the
 * latest; Round 1329's rule (soccerWorldTruth.ts) becomes intlWinnerShown.
 * Three things are new, not copied: groups of any size (soccer draws exactly
 * four pots), a seeded knockout (soccer shuffles its knockout field; here the
 * qualifiers are ordered by group place then record and play 1 v 8, 4 v 5,
 * 2 v 7, 3 v 6, the same pattern for sixteen), and a bronze game as a flag.
 * The group fixtures come from src/lib/leagueCore.ts's roundRobinCalendar
 * (imports nothing), not a second round robin. src/lib/worldCompetition.ts
 * (Club Manager's keyed group and knockout engine) is not bound: its own
 * header says its tables are football's and a sport without draws needs more
 * than a binding.
 *
 * WHAT A SPORT HANDS IN. The score law (play), whether a group game may end
 * level, the group points and table order, his line (lineOf), the knock, the
 * call (callOf), strength (strengthOf, liftOf), the career's key and the
 * keyed stream (rng). A knockout game always has a winner: a level score must
 * come back with `winner` set (soccer's penalties), or the bind never returns
 * one level (basketball's overtime).
 *
 * THE DRAW ORDER, fixed, so a later bind that hands in another stream gets
 * the same order: the generated field (on the EDITION's own stream, so every
 * career sees the same field), then on the career's stream: the pots, the
 * group games in table order with each group's tie coins after its games,
 * the knockout round by round, the bronze game, his lines game by game, the
 * knock. Never Math.random: every draw comes from the stream handed in.
 *
 * THE SAVE. One optional block on the career, `intl` = { v: 1, summers, last }.
 * A summer row is written only when he answers a call: { year, edition,
 * went: false } for rest, the whole row for go. `last` is a snapshot of the
 * latest tournament he played, kept whole for the result screen; older
 * summers keep the row only. Hosts and names are never copied into a save:
 * screens read them from the ledger by edition id. An edition id is the
 * competition and the summer ('oly-2028'), a save key never renamed, and a
 * row whose id the ledger no longer lists is kept and rendered from its parse.
 */

import { roundRobinCalendar } from '@/lib/leagueCore';

export type Rng = () => number;

/* ─── the calendar ───────────────────────────────────────────────────────── */

export type IntlRound = 'R16' | 'QF' | 'SF';
export interface IntlShape {
  id: string; teams: number; groups: number; groupSize: number; through: number;
  thirdsThrough: number; firstKnockout: IntlRound; bronze: boolean;
  playable: boolean; playedAs: string | null;
}
/** A ledger's shape row, the tuple a data file holds. */
export type IntlShapeRow = readonly [string, number, number, number, number, number, IntlRound, boolean, boolean, string | null];
/** gold, silver, bronze, fourth, the other quarter-finalists. */
export type IntlRungsRow = readonly [string, string, string, string, readonly string[]];
/** id, comp, summer, name, host, shape, field, places, Olympiad year. */
export type IntlEditionRow = readonly [string, string, number, string, string, string, readonly string[] | null, IntlRungsRow | null, number?];

export interface IntlLedger {
  shapes: readonly IntlShapeRow[];
  editions: readonly IntlEditionRow[];
  /** competition, first projected summer, every how many years. */
  cycles: readonly (readonly [string, number, number])[];
  partial: readonly string[];
  lastPlayed: number;
}

export type IntlRung = 'gold' | 'silver' | 'bronze' | 'fourth' | 'quarter' | 'field';
/** played: in the ledger with its field; future: in the ledger, still to come; projected: the game's own calendar. */
export type IntlKind = 'played' | 'future' | 'projected';

export interface IntlEdition {
  id: string; comp: string; year: number; name: string;
  host: string | null; games: number | null; kind: IntlKind;
  /** the shape it really had (or the last verified one); `play` is the one the game plays. */
  shape: IntlShape; play: IntlShape;
  field: readonly string[] | null; places: IntlRungsRow | null;
  partial: boolean;
}

export interface IntlCalendar {
  editionFor(year: number): IntlEdition | null;
  /** an edition by id; an id the ledger lacks renders from its parse. */
  byId(id: string): IntlEdition | null;
  /** the played editions, oldest first. */
  played(): IntlEdition[];
}

const ID_RE = /^([a-z]+)-(\d{4})$/;
export function parseIntlId(id: unknown): { comp: string; year: number } | null {
  if (typeof id !== 'string') return null;
  const m = ID_RE.exec(id);
  return m ? { comp: m[1], year: Number(m[2]) } : null;
}

function shapeFrom(row: IntlShapeRow): IntlShape {
  const [id, teams, groups, groupSize, through, thirdsThrough, firstKnockout, bronze, playable, playedAs] = row;
  return { id, teams, groups, groupSize, through, thirdsThrough, firstKnockout, bronze, playable, playedAs };
}

/**
 * The calendar a ledger answers. A summer the ledger holds is that edition; a
 * summer past the ledger's last edition of a competition is the game's own
 * when the competition's cycle says so, with no host, no field and the last
 * verified shape and name of that competition; any other summer has none.
 */
export function intlCalendar(ledger: IntlLedger): IntlCalendar {
  const shapes = new Map(ledger.shapes.map(r => [r[0], shapeFrom(r)]));
  const playOf = (s: IntlShape): IntlShape => (s.playable ? s : shapes.get(s.playedAs ?? '') ?? s);
  const partial = new Set(ledger.partial);
  const rows = new Map<string, IntlEdition>();
  for (const r of ledger.editions) {
    const shape = shapes.get(r[5]);
    if (!shape) continue;
    rows.set(r[0], {
      id: r[0], comp: r[1], year: r[2], name: r[3], host: r[4], games: r[8] ?? null,
      kind: r[6] ? 'played' : 'future', shape, play: playOf(shape),
      field: r[6], places: r[7], partial: partial.has(r[0]),
    });
  }
  const lastOf = (comp: string): IntlEdition | null => {
    let best: IntlEdition | null = null;
    for (const e of rows.values()) if (e.comp === comp && (!best || e.year > best.year)) best = e;
    return best;
  };
  const projected = (comp: string, year: number): IntlEdition | null => {
    const last = lastOf(comp);
    if (!last) return null;
    return {
      id: `${comp}-${year}`, comp, year, name: last.name, host: null, games: null, kind: 'projected',
      shape: last.shape, play: last.play, field: null, places: null, partial: false,
    };
  };
  const byYear = new Map([...rows.values()].map(e => [e.year, e]));
  return {
    editionFor(year) {
      const hit = byYear.get(year);
      if (hit) return hit;
      for (const [comp, first, every] of ledger.cycles) {
        if (year >= first && (year - first) % every === 0) return projected(comp, year);
      }
      return null;
    },
    byId(id) {
      const hit = rows.get(id);
      if (hit) return hit;
      const p = parseIntlId(id);
      return p ? projected(p.comp, p.year) : null;
    },
    played() {
      return [...rows.values()].filter(e => e.kind === 'played').sort((a, b) => a.year - b.year);
    },
  };
}

/** Where a nation really finished in a played edition; 'field' when it only took part. */
export function intlRungOf(e: IntlEdition, nation: string): IntlRung | null {
  if (!e.field || !e.field.includes(nation)) return null;
  const p = e.places;
  if (!p) return 'field';
  if (p[0] === nation) return 'gold';
  if (p[1] === nation) return 'silver';
  if (p[2] === nation) return 'bronze';
  if (p[3] === nation) return 'fourth';
  if (p[4].includes(nation)) return 'quarter';
  return 'field';
}

/** Every rung a nation reached in the played editions, oldest first. */
export function intlRungHistory(cal: IntlCalendar, nation: string): IntlRung[] {
  const out: IntlRung[] = [];
  for (const e of cal.played()) {
    const r = intlRungOf(e, nation);
    if (r) out.push(r);
  }
  return out;
}

function shuffleInPlace<T>(xs: T[], rng: Rng): T[] {
  for (let i = xs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/**
 * A field the game draws, for an edition with none: the nation, then the
 * rest drawn from the nations of that competition's last two played fields,
 * widened to every played field of it when that pool is short. Fails closed
 * (returns null) when even the widest pool cannot fill the shape. The stream
 * must be keyed to the edition alone, so every career sees the same field.
 */
export function intlGeneratedField(cal: IntlCalendar, e: IntlEdition, nation: string, rng: Rng): string[] | null {
  const past = cal.played().filter(x => x.comp === e.comp && x.year < e.year);
  const poolOf = (eds: IntlEdition[]) => [...new Set(eds.flatMap(x => x.field ?? []))].filter(n => n !== nation).sort();
  let pool = poolOf(past.slice(-2));
  if (pool.length < e.play.teams - 1) pool = poolOf(past);
  if (pool.length < e.play.teams - 1) return null;
  return [nation, ...shuffleInPlace(pool, rng).slice(0, e.play.teams - 1)];
}

/* ─── the tournament ─────────────────────────────────────────────────────── */

/** One game's score. A level score must name its winner in a knockout. */
export interface IntlScore { a: number; b: number; ot?: number; winner?: 'a' | 'b' }
export interface IntlTableRow {
  nation: string; played: number; won: number; drawn: number; lost: number;
  pf: number; pa: number; pts: number; coin: number;
}
export type IntlGameRound = 'group' | 'R16' | 'QF' | 'SF' | 'bronze' | 'final';
export interface IntlGame {
  round: IntlGameRound; group?: number;
  a: string; b: string; sa: number; sb: number; ot: number;
  /** null only for a level group game in a sport whose groups may end level. */
  winner: string | null;
}
export type IntlPlace = 'gold' | 'silver' | 'bronze' | 'fourth' | 'semi' | 'quarter' | 'r16' | 'group';
export interface IntlTournament {
  v: 1; edition: string; nation: string;
  field: string[]; generated: boolean;
  groups: { teams: string[]; table: IntlTableRow[] }[];
  games: IntlGame[];
  champion: string;
  places: Record<string, IntlPlace>;
  /** his line in each game his nation played, by index into games. */
  his: { game: number; line: Record<string, number> }[];
  hurt: boolean;
}

/** The face a sport hands in. Numbers and words only; the runner is here. */
export interface IntlSportBind<C extends IntlCareer> {
  slug: string;
  calendar: IntlCalendar;
  nationOf(c: C): string;
  /** the edition he is called up for after his last season, or null. */
  callOf(c: C): IntlEdition | null;
  strengthOf(e: IntlEdition, nation: string): number;
  /** what he adds to his nation's strength. */
  liftOf(c: C): number;
  play(a: number, b: number, rng: Rng, knockout: boolean): IntlScore;
  /** may a group game end level (soccer yes, basketball never). */
  groupDraws: boolean;
  /** points for a win, a draw and a loss. */
  groupPoints: readonly [number, number, number];
  /** the sport's table order, best first; the module breaks a tie left over with each row's coin. */
  tableOrder(x: IntlTableRow, y: IntlTableRow): number;
  lineOf(c: C, rng: Rng): Record<string, number>;
  knockChance(c: C): number;
  /** what coming home hurt does to him. */
  knock(c: C): void;
  ageOf(c: C): number;
  careerKey(c: C): string;
  rng(key: string): Rng;
}

const ROUND_OF: Record<number, IntlGameRound> = { 16: 'R16', 8: 'QF', 4: 'SF', 2: 'final' };
const SIZE_OF: Record<IntlRound, number> = { R16: 16, QF: 8, SF: 4 };
const LOSER_PLACE: Record<string, IntlPlace> = { R16: 'r16', QF: 'quarter' };

/** Seed numbers in bracket order: 1 v n, then the pattern down (1 8 4 5 2 7 3 6 for eight). */
export function intlSeedOrder(n: number): number[] {
  let order = [1];
  while (order.length < n) {
    const m = order.length * 2;
    order = order.flatMap(s => [s, m + 1 - s]);
  }
  return order;
}

/** The field this career's nation would play in an edition, or null when none can be drawn. */
export function intlFieldOf<C extends IntlCareer>(bind: IntlSportBind<C>, e: IntlEdition, nation: string): { field: string[]; generated: boolean } | null {
  if (e.field) return e.field.includes(nation) ? { field: [...e.field], generated: false } : null;
  const f = intlGeneratedField(bind.calendar, e, nation, bind.rng(`intl-field:${e.id}`));
  return f ? { field: f, generated: true } : null;
}

/**
 * The tournament, every draw from `rng` in the order the header fixes (the
 * generated field draws first, on the edition's own stream). The champion is
 * crowned every time, whether his nation goes far or not.
 */
export function runIntlTournament<C extends IntlCareer>(e: IntlEdition, nation: string, bind: IntlSportBind<C>, c: C, rng: Rng): IntlTournament | null {
  const got = intlFieldOf(bind, e, nation);
  if (!got) return null;
  const { field, generated } = got;
  const shape = e.play;
  const strength = new Map(field.map(t => [t, bind.strengthOf(e, t)]));
  strength.set(nation, (strength.get(nation) ?? 0) + bind.liftOf(c));
  const games: IntlGame[] = [];
  const places: Record<string, IntlPlace> = {};
  const playOne = (round: IntlGameRound, a: string, b: string, group?: number): IntlGame => {
    const r = bind.play(strength.get(a) ?? 0, strength.get(b) ?? 0, rng, round !== 'group');
    let winner: string | null = r.winner ? (r.winner === 'a' ? a : b) : r.a > r.b ? a : r.b > r.a ? b : null;
    if (winner === null && (round !== 'group' || !bind.groupDraws)) throw new Error(`careerIntl: ${bind.slug} returned a level ${round} game with no winner`);
    const g: IntlGame = { round, a, b, sa: r.a, sb: r.b, ot: r.ot ?? 0, winner };
    if (group !== undefined) g.group = group;
    games.push(g);
    return g;
  };

  /* Pots by strength (ties by name, so the sort is stable), each pot drawn. */
  const seeded = [...field].sort((x, y) => (strength.get(y) ?? 0) - (strength.get(x) ?? 0) || (x < y ? -1 : 1));
  const pots: string[][] = [];
  for (let p = 0; p < shape.groupSize; p += 1) pots.push(shuffleInPlace(seeded.slice(p * shape.groups, (p + 1) * shape.groups), rng));
  const groups: { teams: string[]; table: IntlTableRow[] }[] = [];
  const order = (x: IntlTableRow, y: IntlTableRow) => bind.tableOrder(x, y) || y.coin - x.coin;
  for (let g = 0; g < shape.groups; g += 1) {
    const teams = pots.map(pot => pot[g]).filter((t): t is string => typeof t === 'string');
    const rows = new Map(teams.map(t => [t, { nation: t, played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, pts: 0, coin: 0 }]));
    const n = teams.length;
    for (const [i, j] of roundRobinCalendar(n).slice(0, (n * (n - 1)) / 2)) {
      const gm = playOne('group', teams[i], teams[j], g);
      for (const [me, mine, theirs] of [[teams[i], gm.sa, gm.sb], [teams[j], gm.sb, gm.sa]] as const) {
        const row = rows.get(me);
        if (!row) continue;
        row.played += 1; row.pf += mine; row.pa += theirs;
        if (gm.winner === me) { row.won += 1; row.pts += bind.groupPoints[0]; }
        else if (gm.winner === null) { row.drawn += 1; row.pts += bind.groupPoints[1]; }
        else { row.lost += 1; row.pts += bind.groupPoints[2]; }
      }
    }
    for (const t of teams) { const row = rows.get(t); if (row) row.coin = rng(); }
    groups.push({ teams, table: [...rows.values()].sort(order) });
  }

  /* Who goes through, ordered by group place, then record: that order is the seeding. */
  const seeds: string[] = [];
  for (let p = 0; p < shape.through; p += 1) seeds.push(...groups.map(gr => gr.table[p]).filter(Boolean).sort(order).map(r => r.nation));
  if (shape.thirdsThrough > 0) seeds.push(...groups.map(gr => gr.table[shape.through]).filter(Boolean).sort(order).slice(0, shape.thirdsThrough).map(r => r.nation));
  const size = SIZE_OF[shape.firstKnockout];
  if (seeds.length !== size) throw new Error(`careerIntl: shape ${shape.id} sends ${seeds.length} through to a ${shape.firstKnockout} of ${size}`);
  for (const t of field) if (!seeds.includes(t)) places[t] = 'group';

  /* The knockout, round by round, then the bronze game. */
  let alive = intlSeedOrder(size).map(s => seeds[s - 1]);
  let semiLosers: string[] = [];
  while (alive.length > 1) {
    const round = ROUND_OF[alive.length];
    const next: string[] = [];
    for (let k = 0; k < alive.length; k += 2) {
      const gm = playOne(round, alive[k], alive[k + 1]);
      const w = gm.winner as string;
      const l = w === gm.a ? gm.b : gm.a;
      next.push(w);
      if (round === 'SF') semiLosers.push(l);
      else if (round === 'final') places[l] = 'silver';
      else places[l] = LOSER_PLACE[round];
    }
    alive = next;
  }
  const champion = alive[0];
  places[champion] = 'gold';
  if (shape.bronze && semiLosers.length === 2) {
    const gm = playOne('bronze', semiLosers[0], semiLosers[1]);
    const w = gm.winner as string;
    places[w] = 'bronze';
    places[w === gm.a ? gm.b : gm.a] = 'fourth';
    semiLosers = [];
  }
  for (const t of semiLosers) places[t] = 'semi';

  /* His lines, game by game, then the knock. */
  const his: IntlTournament['his'] = [];
  games.forEach((gm, i) => { if (gm.a === nation || gm.b === nation) his.push({ game: i, line: bind.lineOf(c, rng) }); });
  const hurt = rng() < bind.knockChance(c);
  return { v: 1, edition: e.id, nation, field, generated, groups, games, champion, places, his, hurt };
}

/* ─── the save ───────────────────────────────────────────────────────────── */

export type IntlSummerEntry =
  | { year: number; edition: string; went: false }
  | {
    year: number; edition: string; went: true; age: number; place: IntlPlace;
    games: number; wins: number; avg: Record<string, number>; hurt: boolean;
  };
export interface CareerIntlBlock { v: 1; summers: IntlSummerEntry[]; last?: IntlTournament }
export interface IntlCareer { intl?: CareerIntlBlock }
export interface IntlCall { edition: IntlEdition; year: number }

/** The call waiting on an answer: derived from the save, so a reload asks again until he answers. */
export function pendingCallUp<C extends IntlCareer>(c: C, bind: IntlSportBind<C>): IntlCall | null {
  const e = bind.callOf(c);
  if (!e) return null;
  if ((c.intl?.summers ?? []).some(s => s.year === e.year)) return null;
  if (!intlFieldOf(bind, e, bind.nationOf(c))) return null;
  return { edition: e, year: e.year };
}

/** The stream a career's tournament draws on, keyed to the career and the edition. */
export const intlStreamKey = (slug: string, careerKey: string, editionId: string) => `intl:${slug}:${careerKey}:${editionId}`;

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * He answers. Rest writes { year, edition, went: false } and nothing else; go
 * plays the tournament on the career's keyed stream, writes the row and the
 * snapshot in `last`, and a knock goes through the sport. Mutates c (the
 * board's own copy). Null when nothing is pending.
 */
export function answerCallUp<C extends IntlCareer>(c: C, bind: IntlSportBind<C>, choice: 'go' | 'rest'): { row: IntlSummerEntry; tournament: IntlTournament | null } | null {
  const call = pendingCallUp(c, bind);
  if (!call) return null;
  const block: CareerIntlBlock = c.intl ?? { v: 1, summers: [] };
  if (choice === 'rest') {
    const row: IntlSummerEntry = { year: call.year, edition: call.edition.id, went: false };
    block.summers.push(row);
    c.intl = block;
    return { row, tournament: null };
  }
  const nation = bind.nationOf(c);
  const t = runIntlTournament(call.edition, nation, bind, c, bind.rng(intlStreamKey(bind.slug, bind.careerKey(c), call.edition.id)));
  if (!t) return null;
  const mine = t.games.filter(g => g.a === nation || g.b === nation);
  const sums: Record<string, number> = {};
  for (const h of t.his) for (const [k, v] of Object.entries(h.line)) sums[k] = (sums[k] ?? 0) + v;
  const avg: Record<string, number> = {};
  for (const [k, v] of Object.entries(sums)) avg[k] = round1(v / Math.max(1, t.his.length));
  const row: IntlSummerEntry = {
    year: call.year, edition: call.edition.id, went: true, age: bind.ageOf(c),
    place: t.places[nation] ?? 'group', games: mine.length, wins: mine.filter(g => g.winner === nation).length, avg, hurt: t.hurt,
  };
  block.summers.push(row);
  block.last = t;
  c.intl = block;
  if (t.hurt) bind.knock(c);
  return { row, tournament: t };
}

/** Round 1329's rule: a tournament he played is the career's own and prints whole; a summer he rested prints nothing. */
export const intlWinnerShown = (went: boolean): boolean => went;

/* ─── what the summers add up to ─────────────────────────────────────────── */

export interface CareerIntlStats {
  caps: number; wins: number; tournaments: number; rested: number;
  gold: number; silver: number; bronze: number; medals: number;
  byComp: Record<string, { played: number; gold: number }>;
  debutYear: number | null; debutAge: number | null;
  totals: Record<string, number>;
}

/** The career's international totals, derived from the summers on the save, never stored as counters. */
export function intlStatsOf(block: CareerIntlBlock | undefined): CareerIntlStats {
  const s: CareerIntlStats = { caps: 0, wins: 0, tournaments: 0, rested: 0, gold: 0, silver: 0, bronze: 0, medals: 0, byComp: {}, debutYear: null, debutAge: null, totals: {} };
  for (const r of block?.summers ?? []) {
    if (!r.went) { s.rested += 1; continue; }
    s.tournaments += 1;
    s.caps += r.games;
    s.wins += r.wins;
    if (r.place === 'gold') s.gold += 1;
    if (r.place === 'silver') s.silver += 1;
    if (r.place === 'bronze') s.bronze += 1;
    const comp = parseIntlId(r.edition)?.comp ?? '?';
    const bc = (s.byComp[comp] ??= { played: 0, gold: 0 });
    bc.played += 1;
    if (r.place === 'gold') bc.gold += 1;
    if (s.debutYear === null || r.year < s.debutYear) { s.debutYear = r.year; s.debutAge = r.age; }
    for (const [k, v] of Object.entries(r.avg)) s.totals[k] = round1((s.totals[k] ?? 0) + v * r.games);
  }
  s.medals = s.gold + s.silver + s.bronze;
  return s;
}

/* ─── repair on load ─────────────────────────────────────────────────────── */

const PLACES = new Set<IntlPlace>(['gold', 'silver', 'bronze', 'fourth', 'semi', 'quarter', 'r16', 'group']);
const isInt = (x: unknown, lo = 0) => typeof x === 'number' && Number.isInteger(x) && x >= lo;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

function rowOk(r: unknown): r is IntlSummerEntry {
  if (!isObj(r)) return false;
  const p = parseIntlId(r.edition);
  if (!p || !isInt(r.year, 1900) || p.year !== r.year) return false;
  if (r.went === false) return true;
  if (r.went !== true) return false;
  const avg = r.avg;
  return isInt(r.age, 10) && typeof r.place === 'string' && PLACES.has(r.place as IntlPlace)
    && isInt(r.games, 1) && isInt(r.wins) && (r.wins as number) <= (r.games as number) && typeof r.hurt === 'boolean'
    && isObj(avg) && Object.values(avg).every(v => typeof v === 'number' && Number.isFinite(v));
}

function lastOk(t: unknown, rows: IntlSummerEntry[]): boolean {
  if (!isObj(t) || t.v !== 1 || !parseIntlId(t.edition) || typeof t.nation !== 'string') return false;
  if (!Array.isArray(t.field) || !Array.isArray(t.groups) || !Array.isArray(t.games) || !Array.isArray(t.his) || !isObj(t.places)) return false;
  if (typeof t.champion !== 'string' || typeof t.hurt !== 'boolean') return false;
  return rows.some(r => r.went && r.edition === t.edition);
}

/**
 * The house repair (repairSummerOnLoad's pattern): the block is checked alone
 * and dropped alone, a broken row is dropped alone, `last` is dropped alone.
 * A row is never dropped because the ledger stopped listing its edition: the
 * id is a save key, and a screen renders an unknown one from its parse. A
 * block left with no rows goes, so a career never called carries none.
 * Returns whether anything changed.
 */
export function repairIntlOnLoad(c: IntlCareer): boolean {
  if (!('intl' in c) || c.intl === undefined) return false;
  const b: unknown = c.intl;
  if (!isObj(b) || b.v !== 1 || !Array.isArray(b.summers)) { delete c.intl; return true; }
  let changed = false;
  const seen = new Set<number>();
  const rows: IntlSummerEntry[] = [];
  for (const r of b.summers as unknown[]) {
    if (rowOk(r) && !seen.has(r.year)) { seen.add(r.year); rows.push(r); } else changed = true;
  }
  if (!rows.length) { delete c.intl; return true; }
  const block: CareerIntlBlock = { v: 1, summers: rows };
  if ('last' in b && b.last !== undefined) {
    if (lastOk(b.last, rows)) block.last = b.last as IntlTournament; else changed = true;
  }
  if (changed) c.intl = block;
  return changed;
}
