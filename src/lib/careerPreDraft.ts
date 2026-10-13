/* Round 914: the road to the draft, one engine for every US My Career.

   A Soccer Career starts at sixteen in an academy and earns its first deal.
   The NFL, NBA, MLB and NHL careers used to start on draft day with a pick
   rolled from the rating and a team rolled at random, whatever the pick was.
   This module is the part in between: one to three seasons on a route the
   sport really has (college, junior college, high school, major junior,
   Europe), a choice after each season, a showcase, a generated draft order,
   and the pick decides the team. The team that holds the pick is the team
   you join, because nothing here trades picks.

   ONE ENGINE, MANY SPORTS. Everything a sport changes lives in its
   descriptor (src/lib/{nfl,nba,mlb,nhl}CareerPreDraft.ts): the routes, the
   rounds, the lottery, the showcase drills, the stat line and the minor
   league or development seasons after the draft. Every rule and number in
   those files is two source verified in
   docs/audits/US-PRE-DRAFT-RULES-2026-10.md.

   Every draw comes from keyedRng with a key built from the save's own seed
   and the step, so a step replays to the same result and nothing here moves
   any other stream. No other prospect is ever named. */

import { keyedRng } from './keyedRng';

export type PreDraftSport = 'nfl' | 'nba' | 'mlb' | 'nhl';

export interface PreDraftRoute {
  id: string;
  label: string;
  blurb: string;
  /** Pre draft seasons on this route, 1 to 3. */
  seasons: number;
  /** Age during the first pre draft season. */
  startAge: number;
  /** Where the stock meter starts against the rating alone. */
  stockStart: number;
  /** The league or level each season line is played in. */
  level: string;
}

export interface PreDraftLottery {
  /** Lottery teams: the non playoff teams, worst record first. */
  teams: number;
  /** Picks decided by the drawing. */
  drawn: number;
  /** Combinations out of 1000 for each seed, worst record first. */
  combos: number[];
}

export interface PreDraftStat { label: string; value: string }

export interface PreDraftEffect {
  stock?: number;
  rating?: number;
  health?: number;
}

export interface PreDraftChoiceOption {
  label: string;
  effect: PreDraftEffect;
}

export interface PreDraftChoice {
  id: string;
  title: string;
  body: string;
  /** Route ids this card fits; absent means every route. */
  routes?: string[];
  options: PreDraftChoiceOption[];
}

export interface PreDraftApproach {
  id: 'allout' | 'steady' | 'skip';
  label: string;
  blurb: string;
}

export interface PreDraftPostDraft {
  /** The level of season i (0 based) of n after the draft. */
  levelFor: (i: number, n: number, routeId: string) => string;
  min: number;
  max: number;
  /** What the board calls these seasons. */
  title: string;
}

/** Round 1319: one showcase drill a player can run himself, as one of the
 *  shared training drills (the burst tap or the cone run). The name is a
 *  plain name for what the game's drill is ("Burst test", "Agility run",
 *  "Hit your spots"), which claims no real test, or a real test's name only
 *  where the audit backs it twice for that era (the NHL's today: audit row
 *  65 of docs/audits/US-PRE-DRAFT-RULES-2026-10.md). */
export interface PreDraftStation {
  name: string;
  kind: 'burst' | 'cones';
}

export interface PreDraftDescriptor {
  sport: PreDraftSport;
  eraId: string;
  /** The year the draft is held. */
  draftYear: number;
  rounds: number;
  /** Read lazily, never at module scope. */
  teamIds: () => string[];
  teamLabel: (id: string) => string;
  /** Round 1220: the club's own name without its city ("Trail Blazers"), for
   *  a tile too narrow for both. Optional: without it a tile prints teamLabel. */
  teamShort?: (id: string) => string;
  lottery: PreDraftLottery | null;
  routes: PreDraftRoute[];
  showcaseName: string;
  drills: string[];
  statLine: (perf: number, rng: () => number, pos: string | undefined, routeId: string) => PreDraftStat[];
  choices: PreDraftChoice[];
  /** The signing bonus slot of a pick, in dollars, where it is verified. */
  slotValue?: (pick: number) => number | null;
  /** One line about the money for a pick. */
  bonusLine?: (pick: number) => string;
  /** Round 1104: picks added to a prospect's board rank for his position,
   *  where a sport's game rule drafts a position late (the NFL's kickers). A
   *  rank past the last pick is undrafted, as always. Nothing else sets it. */
  pickOffset?: (pos: string | undefined) => number;
  /** Round 1319: the stations a player of this position can run himself at
   *  the showcase, in order. Read through preDraftStations, which turns
   *  anything but one or two good stations into none. `drills` is the
   *  scouts path's list and is never read here. */
  stations?: (pos: string | undefined) => PreDraftStation[];
  postDraft: PreDraftPostDraft | null;
  undraftedLine: string;
}

export interface PreDraftSeasonRecord {
  age: number;
  level: string;
  perf: number;
  stockDelta: number;
  stats: PreDraftStat[];
}

export interface PreDraftShowcaseResult {
  approach: PreDraftApproach['id'];
  drill: string;
  grade: 'A' | 'B' | 'C' | 'D' | null;
  stockDelta: number;
  /** Round 1319: a showcase the player ran himself, one whole station score
   *  from 0 to 100 a station, in order. Absent on the scouts' grade. */
  played?: number[];
}

export interface PreDraftOutcome {
  /** Overall pick, or null when nobody calls your name. */
  pick: number | null;
  round: number | null;
  pickInRound: number | null;
  team: string;
  ageAtDraft: number;
  draftYear: number;
  slotValue: number | null;
  devSeasons: PreDraftSeasonRecord[];
  /** Rating and age after the development seasons: what a career starts on. */
  ratingAfter: number;
  ageAfter: number;
}

export interface CareerDraftEntry extends PreDraftOutcome {
  pot: number;
  health: number;
  prospect: PreDraftState;
}

export type PreDraftPhase = 'season' | 'choice' | 'showcase' | 'draft' | 'done';

/** The save block. Every field the board reads is validated by
 *  loadPreDraft, and a block that fails resets that block alone. */
export interface PreDraftState {
  v: 1;
  sport: PreDraftSport;
  eraId: string;
  seed: string;
  routeId: string;
  pos?: string;
  rating: number;
  pot: number;
  stock: number;
  health: number;
  age: number;
  seasonsDone: number;
  lines: PreDraftSeasonRecord[];
  pendingChoice: string | null;
  choicesSeen: string[];
  showcase: PreDraftShowcaseResult | null;
  draft: PreDraftOutcome | null;
  phase: PreDraftPhase;
  /** Round 1319: present only between "run it yourself" and the grade, at
   *  phase `showcase`. A block that carries it is settled by the loader. */
  combine?: { approach: 'allout' | 'steady' };
}

export const clampMeter = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Words for an effect, built from the numbers so the card can never say
 *  something the code does not do. */
export function preDraftEffectText(e: PreDraftEffect): string {
  const parts: string[] = [];
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  if (e.stock) parts.push(`Draft stock ${sign(e.stock)}`);
  if (e.rating) parts.push(`Rating ${sign(e.rating)}`);
  if (e.health) parts.push(`Health ${sign(e.health)}`);
  return parts.length ? parts.join(', ') : 'No change';
}

/* Cards every sport shares. A sport adds its own in its descriptor. */
export const SHARED_PRE_DRAFT_CHOICES: PreDraftChoice[] = [
  {
    id: 'summer',
    title: 'The offseason',
    body: 'Time off between seasons. Your coach has a plan, your friends have a beach house.',
    options: [
      { label: 'Train all summer', effect: { rating: 2, stock: 1 } },
      { label: 'Rest up', effect: { health: 15 } },
    ],
  },
  {
    id: 'knock',
    title: 'Playing through it',
    body: 'Something is barking in your ankle the week the scouts are in town.',
    options: [
      { label: 'Play through it', effect: { stock: 4, health: -20 } },
      { label: 'Sit it out', effect: { stock: -2, health: 10 } },
    ],
  },
  {
    id: 'film',
    title: 'The film room',
    body: 'The coaching staff will stay late with you if you ask.',
    options: [
      { label: 'Stay late every night', effect: { rating: 1, stock: 2 } },
      { label: 'Keep your own routine', effect: {} },
    ],
  },
  {
    id: 'spotlight',
    title: 'A big stage',
    body: 'A national broadcast wants you on the feature. It cuts into your week.',
    options: [
      { label: 'Do the feature', effect: { stock: 3, rating: -1 } },
      { label: 'Keep your head down', effect: { rating: 1 } },
    ],
  },
];

export const PRE_DRAFT_APPROACHES: PreDraftApproach[] = [
  { id: 'allout', label: 'Go all out', blurb: 'Push every drill to the limit.' },
  { id: 'steady', label: 'Play it safe', blurb: 'Stay within yourself.' },
  { id: 'skip', label: 'Skip it', blurb: 'No drill and no grade. The scouts notice.' },
];

/** Draft stock moves for a drill grade, per approach. These are the only
 *  numbers the showcase card quotes. */
export const SHOWCASE_DELTAS: Record<'allout' | 'steady', Record<'A' | 'B' | 'C' | 'D', number>> = {
  allout: { A: 10, B: 4, C: -3, D: -8 },
  steady: { A: 5, B: 2, C: -1, D: -3 },
};
export const SKIP_DELTA = -2;

/** What a table move really does from this stock, once the meter clamps at
 *  0 and 100. The showcase card prints this and the showcase applies it. */
export function preDraftShowcaseMove(stock: number, delta: number): number {
  return clampMeter(stock + delta) - stock;
}

/* ─── The draft order ─────────────────────────────────────────────────── */

export interface PreDraftOrder {
  /** Every team, worst generated record first. */
  standings: string[];
  /** Teams that won a drawn pick, in the order they won it. */
  lotteryWinners: string[];
  /** Overall pick n is held by order[n - 1]. */
  order: string[];
}

export const preDraftKey = (seed: string, step: string) => `${seed}|predraft|${step}`;

/** The generated standings, the lottery if the sport and era have one, and
 *  every pick in every round. Round one is the lottery order; every later
 *  round is plain inverse record. Nothing trades a pick, so whoever holds
 *  pick n here is the team that drafts the player taken at n. */
export function preDraftOrder(desc: PreDraftDescriptor, seed: string): PreDraftOrder {
  const standings = [...desc.teamIds()];
  const rng = keyedRng(preDraftKey(seed, 'standings'));
  for (let i = standings.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [standings[i], standings[j]] = [standings[j], standings[i]];
  }
  const winners: string[] = [];
  let first = [...standings];
  const L = desc.lottery;
  if (L) {
    const lotteryTeams = standings.slice(0, L.teams);
    const pool = lotteryTeams.map((id, i) => ({ id, w: L.combos[i] ?? 0 }));
    const draw = keyedRng(preDraftKey(seed, 'lottery'));
    /* A combination that belongs to a team already drawn is drawn again,
       which is the same as drawing in proportion to what is left. */
    for (let d = 0; d < L.drawn && pool.length; d += 1) {
      const total = pool.reduce((a, p) => a + p.w, 0);
      let x = draw() * total;
      let k = 0;
      while (k < pool.length - 1 && x >= pool[k].w) { x -= pool[k].w; k += 1; }
      winners.push(pool[k].id);
      pool.splice(k, 1);
    }
    first = [...winners, ...lotteryTeams.filter(t => !winners.includes(t)), ...standings.slice(L.teams)];
  }
  const order = [...first];
  for (let r = 2; r <= desc.rounds; r += 1) order.push(...standings);
  return { standings, lotteryWinners: winners, order };
}

/** Where the scouts have you on the board: stock 100 is the first name
 *  called, and a low stock can fall past the last pick. */
export function preDraftBoardRank(stock: number, totalPicks: number, rng: () => number): number {
  return preDraftBoardRankAt(stock, totalPicks, rng());
}

/** Round 1220: the same arithmetic with the draw handed in (u from 0 to 1),
 *  so the range the scouts quote before the draft and the rank the draft
 *  draws are one formula and can never disagree. One draw, as before. */
export function preDraftBoardRankAt(stock: number, totalPicks: number, u: number): number {
  const z = (100 - clampMeter(stock)) / 100;
  const spread = 0.75 + 0.5 * u;
  return Math.max(1, Math.round(1 + Math.pow(z, 1.6) * totalPicks * 1.25 * spread));
}

export interface PreDraftProjection {
  /** The earliest pick this stock can land on. */
  lo: number;
  /** The latest. Past `total` means the board can run out before his name. */
  hi: number;
  /** Every pick of this draft. */
  total: number;
}

/** Round 1220: where this stock can land. The rank the draft draws is always
 *  inside, by construction: it is preDraftBoardRankAt at a draw between the
 *  two ends, plus the same position offset. It draws nothing. */
export function preDraftProjection(desc: PreDraftDescriptor, s: Pick<PreDraftState, 'stock' | 'pos'>): PreDraftProjection {
  const total = desc.teamIds().length * desc.rounds;
  const off = desc.pickOffset?.(s.pos) ?? 0;
  return { lo: preDraftBoardRankAt(s.stock, total, 0) + off, hi: preDraftBoardRankAt(s.stock, total, 1) + off, total };
}

/** The range in words, built from the numbers: what the scouts say before
 *  the draft ("have") and what draft night recalls ("had"). */
export function preDraftProjectionLine(p: PreDraftProjection, tense: 'have' | 'had'): string {
  if (p.lo > p.total) return `The scouts ${tense} you outside the ${p.total} picks of this draft.`;
  if (p.hi > p.total) return `The scouts ${tense} you between pick ${p.lo} and undrafted. This draft has ${p.total} picks.`;
  if (p.lo === p.hi) return `The scouts ${tense} you at pick ${p.lo} of ${p.total}.`;
  return `The scouts ${tense} you between pick ${p.lo} and pick ${p.hi} of ${p.total}.`;
}

export function preDraftRoute(desc: PreDraftDescriptor, routeId: string): PreDraftRoute {
  return desc.routes.find(r => r.id === routeId) ?? desc.routes[0];
}

/** Every card this sport can deal, shared first. */
export function preDraftChoicePool(desc: PreDraftDescriptor): PreDraftChoice[] {
  return [...SHARED_PRE_DRAFT_CHOICES, ...desc.choices];
}

/** What an option really does to this player, after the meters clamp and
 *  the rating meets its ceiling. The card prints this, and the choice
 *  applies exactly this. */
export function preDraftEffectiveEffect(s: PreDraftState, e: PreDraftEffect): PreDraftEffect {
  const out: PreDraftEffect = {};
  if (e.stock) { const d = clampMeter(s.stock + e.stock) - s.stock; if (d) out.stock = d; }
  if (e.rating) {
    const next = e.rating > 0 ? Math.min(Math.max(s.pot, s.rating), s.rating + e.rating) : Math.max(1, s.rating + e.rating);
    const d = next - s.rating; if (d) out.rating = d;
  }
  if (e.health) { const d = clampMeter(s.health + e.health) - s.health; if (d) out.health = d; }
  return out;
}

/* ─── The road ────────────────────────────────────────────────────────── */

export interface PreDraftStartInput {
  seed: string;
  routeId: string;
  rating: number;
  pot: number;
  pos?: string;
}

export function preDraftStart(desc: PreDraftDescriptor, input: PreDraftStartInput): PreDraftState {
  const route = preDraftRoute(desc, input.routeId);
  const rating = Math.max(1, Math.min(99, Math.round(input.rating)));
  return {
    v: 1,
    sport: desc.sport,
    eraId: desc.eraId,
    seed: input.seed,
    routeId: route.id,
    pos: input.pos,
    rating,
    pot: Math.max(rating, Math.min(99, Math.round(input.pot))),
    stock: clampMeter(40 + (rating - 70) * 3 + route.stockStart),
    health: 100,
    age: route.startAge,
    seasonsDone: 0,
    lines: [],
    pendingChoice: null,
    choicesSeen: [],
    showcase: null,
    draft: null,
    phase: 'season',
  };
}

/** How well a season went, 0 to 100, from the rating, the body and luck. */
function seasonPerf(rating: number, health: number, rng: () => number): number {
  return clampMeter(50 + (rating - 68) * 3 + (rng() - 0.5) * 36 - (100 - health) * 0.25);
}

/** Growth that never runs past the ceiling. */
function grow(rating: number, pot: number, rng: () => number): number {
  return Math.min(Math.max(pot, rating), rating + 1 + Math.floor(rng() * 3));
}

export function preDraftPlaySeason(desc: PreDraftDescriptor, prev: PreDraftState): PreDraftState {
  if (prev.phase !== 'season') return prev;
  const s: PreDraftState = { ...prev, lines: [...prev.lines], choicesSeen: [...prev.choicesSeen] };
  const route = preDraftRoute(desc, s.routeId);
  const rng = keyedRng(preDraftKey(s.seed, `season${s.seasonsDone}`));
  const perf = seasonPerf(s.rating, s.health, rng);
  const before = s.stock;
  s.stock = clampMeter(s.stock + Math.round((perf - 50) / 5));
  s.lines.push({
    age: s.age, level: route.level, perf, stockDelta: s.stock - before,
    stats: desc.statLine(perf, rng, s.pos, route.id),
  });
  s.rating = grow(s.rating, s.pot, rng);
  s.health = clampMeter(s.health + 10);
  s.seasonsDone += 1;
  s.age += 1;
  const open = preDraftChoicePool(desc).filter(c => !s.choicesSeen.includes(c.id) && (!c.routes || c.routes.includes(route.id)));
  if (open.length) {
    const card = open[Math.floor(keyedRng(preDraftKey(s.seed, `card${s.seasonsDone}`))() * open.length)];
    s.pendingChoice = card.id;
    s.phase = 'choice';
  } else {
    s.phase = s.seasonsDone >= route.seasons ? 'showcase' : 'season';
  }
  return s;
}

export function preDraftChoose(desc: PreDraftDescriptor, prev: PreDraftState, optionIndex: number): PreDraftState {
  if (prev.phase !== 'choice' || !prev.pendingChoice) return prev;
  const card = preDraftChoicePool(desc).find(c => c.id === prev.pendingChoice);
  const option = card?.options[optionIndex];
  if (!card || !option || !Number.isInteger(optionIndex)) return prev;
  const s: PreDraftState = { ...prev, choicesSeen: [...prev.choicesSeen] };
  if (card && option) {
    const e = preDraftEffectiveEffect(s, option.effect);
    s.stock += e.stock ?? 0;
    s.rating += e.rating ?? 0;
    s.health += e.health ?? 0;
    s.choicesSeen.push(card.id);
  }
  s.pendingChoice = null;
  s.phase = s.seasonsDone >= preDraftRoute(desc, s.routeId).seasons ? 'showcase' : 'season';
  return s;
}

/** The drill grade: a number u from 0 to 1, cut by the rating and the health
 *  into four grades. The scouts path hands it one draw that ignores the
 *  approach (preDraftShowcaseGrade below); Round 1319 lets a showcase run by
 *  hand hand it the drills' average instead. Same terms, same lines, so both
 *  paths share one cut, and the approach only decides how far the same grade
 *  moves the stock. */
export function preDraftShowcaseGradeFrom(u: number, s: Pick<PreDraftState, 'rating' | 'health'>): 'A' | 'B' | 'C' | 'D' {
  const roll = u + (s.rating - 70) * 0.02 - (100 - s.health) * 0.003;
  return roll > 0.8 ? 'A' : roll > 0.5 ? 'B' : roll > 0.2 ? 'C' : 'D';
}
export function preDraftShowcaseGrade(s: PreDraftState, rng: () => number): 'A' | 'B' | 'C' | 'D' {
  return preDraftShowcaseGradeFrom(rng(), s);
}

export function preDraftShowcase(desc: PreDraftDescriptor, prev: PreDraftState, approach: PreDraftApproach['id']): PreDraftState {
  if (prev.phase !== 'showcase' || !PRE_DRAFT_APPROACHES.some(a => a.id === approach)) return prev;
  if (prev.combine) return prev; /* Round 1319: an opened attempt is resolved by the drills or settled by the loader, never pressed again */
  const s: PreDraftState = { ...prev };
  if (approach === 'skip') {
    const move = preDraftShowcaseMove(s.stock, SKIP_DELTA);
    s.stock += move;
    s.showcase = { approach, drill: '', grade: null, stockDelta: move };
  } else {
    const rng = keyedRng(preDraftKey(s.seed, 'showcase'));
    const drill = desc.drills[Math.floor(rng() * desc.drills.length)];
    const grade = preDraftShowcaseGrade(s, rng);
    const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[approach][grade]);
    s.stock += move;
    s.showcase = { approach, drill, grade, stockDelta: move };
  }
  s.phase = 'draft';
  return s;
}

/** How many development seasons a drafted player spends before the debut:
 *  the better he already is, the fewer. Always inside the sport's range. */
export function preDraftDevSeasonCount(pd: PreDraftPostDraft, rating: number, rng: () => number): number {
  const n = pd.max - Math.floor((rating - 62) / 8) + (rng() < 0.3 ? 1 : 0);
  return Math.max(pd.min, Math.min(pd.max, n));
}

export function preDraftRunDraft(desc: PreDraftDescriptor, prev: PreDraftState): PreDraftState {
  if (prev.phase !== 'draft') return prev;
  const s: PreDraftState = { ...prev };
  const { order } = preDraftOrder(desc, s.seed);
  const teams = desc.teamIds();
  const rng = keyedRng(preDraftKey(s.seed, 'board'));
  const rank = preDraftBoardRank(s.stock, order.length, rng) + (desc.pickOffset?.(s.pos) ?? 0);
  const drafted = rank <= order.length;
  const pick = drafted ? rank : null;
  const round = pick ? Math.ceil(pick / teams.length) : null;
  /* Undrafted: any club can sign you, and one does. Drafted: the club that
     holds the pick, and no other. */
  const team = pick ? order[pick - 1] : teams[Math.floor(rng() * teams.length)];
  const devSeasons: PreDraftSeasonRecord[] = [];
  let rating = s.rating;
  let age = s.age;
  if (desc.postDraft) {
    const dev = keyedRng(preDraftKey(s.seed, 'development'));
    // An undrafted player climbs from the first rung, as the result promises.
    const n = drafted ? preDraftDevSeasonCount(desc.postDraft, rating, dev) : desc.postDraft.max;
    for (let i = 0; i < n; i += 1) {
      const perf = seasonPerf(rating, 100, dev);
      devSeasons.push({
        age, level: desc.postDraft.levelFor(i, n, s.routeId), perf, stockDelta: 0,
        stats: desc.statLine(perf, dev, s.pos, s.routeId),
      });
      rating = grow(rating, s.pot, dev);
      age += 1;
    }
  }
  s.draft = {
    pick, round, pickInRound: pick && round ? pick - (round - 1) * teams.length : null,
    team, ageAtDraft: s.age, draftYear: desc.draftYear,
    slotValue: pick && desc.slotValue ? desc.slotValue(pick) : null,
    devSeasons, ratingAfter: rating, ageAfter: age,
  };
  s.phase = 'done';
  return s;
}

/* ─── The combine you run (Round 1319) ────────────────────────────────── */

/** The stations this player can run himself: the descriptor's list, kept
 *  only when it is one or two stations of the burst or the cone kind with
 *  distinct names that are not empty. Anything else is none, and a showcase
 *  with no stations offers only the scouts' three buttons. */
export function preDraftStations(desc: PreDraftDescriptor, s: Pick<PreDraftState, 'pos'>): PreDraftStation[] {
  const list = desc.stations?.(s.pos);
  if (!Array.isArray(list) || list.length < 1 || list.length > 2) return [];
  const good = list.every(st => !!st && (st.kind === 'burst' || st.kind === 'cones') && typeof st.name === 'string' && st.name.trim() !== '');
  if (!good || new Set(list.map(st => st.name)).size !== list.length) return [];
  return list.map(st => ({ name: st.name, kind: st.kind }));
}

/** How a station was played: with a pointer (a mouse, a finger, two thumbs)
 *  or from the keyboard. Keys tab straight onto the next marker and can
 *  alternate two keys on the burst, so they get a curve of their own. */
export type PreDraftInput = 'pointer' | 'keys';

/** A station's raw result: the taps in the burst's five seconds, or the
 *  milliseconds from the first marker to the last and the slips. */
export type PreDraftStationRaw = { taps: number } | { ms: number; slips: number };

/** What a station's raw result is worth, from 0 to 100. These are GAME
 *  numbers, set so that the harness's median bot for each input averages
 *  about 50 (scripts/simCareerPreDraft.mjs section 12, where the bots are
 *  stated as assumptions about hands, not facts about people). They are a
 *  tuning result, never a real performance: no time, height or count here
 *  stands for one. burst: 100 * (taps - zeroAt) / (fullAt - zeroAt). cones:
 *  100 * (zeroAt - ms) / (zeroAt - fullAt) - slip * slips. Both rounded and
 *  held to 0 to 100. */
export const COMBINE_CURVES = {
  burst: { pointer: { zeroAt: 15, fullAt: 50 }, keys: { zeroAt: 22, fullAt: 58 } },
  cones: { pointer: { zeroAt: 6200, fullAt: 2600, slip: 8 }, keys: { zeroAt: 2900, fullAt: 900, slip: 8 } },
} as const;

/** A station score, whole, 0 to 100. More taps never score less; more time
 *  or more slips never score more. A raw result that is not a number is 0. */
export function preDraftStationScore(kind: PreDraftStation['kind'], raw: PreDraftStationRaw, input: PreDraftInput): number {
  const which: PreDraftInput = input === 'keys' ? 'keys' : 'pointer';
  if (kind === 'burst') {
    const b = COMBINE_CURVES.burst[which];
    const taps = 'taps' in raw ? raw.taps : NaN;
    return Number.isFinite(taps) ? clampMeter(100 * (taps - b.zeroAt) / (b.fullAt - b.zeroAt)) : 0;
  }
  const c = COMBINE_CURVES.cones[which];
  const ms = 'ms' in raw ? raw.ms : NaN;
  const slips = 'slips' in raw ? raw.slips : NaN;
  return Number.isFinite(ms) && Number.isFinite(slips) ? clampMeter(100 * (c.zeroAt - ms) / (c.zeroAt - c.fullAt) - c.slip * slips) : 0;
}

/** "Run it yourself": the attempt goes on the save before any station shows.
 *  Only at the showcase, once, with a real approach and at least one station;
 *  anything else hands back the same object, so nothing is written. */
export function preDraftCombineOpen(desc: PreDraftDescriptor, prev: PreDraftState, approach: PreDraftApproach['id']): PreDraftState {
  if (prev.phase !== 'showcase' || prev.combine !== undefined || (approach !== 'allout' && approach !== 'steady')) return prev;
  if (!preDraftStations(desc, prev).length) return prev;
  return { ...prev, combine: { approach } };
}

/** The last station's score lands: the average of the station scores over
 *  100 takes the place of the scouts' draw, cut by the same rating and health
 *  terms (preDraftShowcaseGradeFrom), and moves the stock by the same table
 *  for the approach the attempt was opened with. One whole score from 0 to
 *  100 a station, or nothing happens. It draws nothing. */
export function preDraftCombineResolve(desc: PreDraftDescriptor, prev: PreDraftState, scores: number[]): PreDraftState {
  const names = preDraftStations(desc, prev).map(st => st.name);
  const opened = prev.combine;
  if (prev.phase !== 'showcase' || !opened || (opened.approach !== 'allout' && opened.approach !== 'steady')) return prev;
  if (!Array.isArray(scores) || !names.length || scores.length !== names.length) return prev;
  if (!scores.every(x => Number.isInteger(x) && x >= 0 && x <= 100)) return prev;
  const { combine, ...rest } = prev;
  const s: PreDraftState = { ...rest };
  const total = scores.reduce((a, x) => a + x, 0);
  const g = preDraftShowcaseGradeFrom(total / (100 * scores.length), s);
  const delta = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[combine.approach][g]);
  s.stock += delta;
  s.showcase = { approach: combine.approach, drill: names.join(' and '), grade: g, stockDelta: delta, played: [...scores] };
  s.phase = 'draft';
  return s;
}

/** An attempt left before the last station landed (Leave, a closed tab, a
 *  reload): the scouts grade it, byte for byte what that scouts' button would
 *  have given, because it IS that button on the state without the attempt.
 *  The same bytes on disk settle to the same grade on every load. */
export function preDraftCombineSettle(desc: PreDraftDescriptor, prev: PreDraftState): PreDraftState {
  if (prev.phase !== 'showcase' || !prev.combine) return prev;
  const { combine, ...rest } = prev;
  return preDraftShowcase(desc, rest, combine.approach);
}

export interface PreDraftCombineCuts { A: number | null; B: number | null; C: number | null }

/** The lowest average of n whole station scores that earns each grade or
 *  better at this rating and health, found by walking every total through
 *  the same expression the resolve uses, so the line a card prints can never
 *  disagree with the grade. null where the grade is out of reach. */
export function preDraftCombineCuts(s: Pick<PreDraftState, 'rating' | 'health'>, n: number): PreDraftCombineCuts {
  const cuts: PreDraftCombineCuts = { A: null, B: null, C: null };
  if (!Number.isInteger(n) || n < 1 || n > 2) return cuts;
  const at = { A: 3, B: 2, C: 1, D: 0 } as const;
  for (let total = 0; total <= 100 * n; total += 1) {
    const reach = at[preDraftShowcaseGradeFrom(total / (100 * n), s)];
    for (const k of ['A', 'B', 'C'] as const) if (cuts[k] === null && reach >= at[k]) cuts[k] = total / n;
  }
  return cuts;
}

/* ─── The save block ──────────────────────────────────────────────────── */

const PHASES: PreDraftPhase[] = ['season', 'choice', 'showcase', 'draft', 'done'];
const SPORTS: PreDraftSport[] = ['nfl', 'nba', 'mlb', 'nhl'];
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object';
const isSeasonRecord = (x: unknown): boolean => isRecord(x)
  && [x.age, x.perf, x.stockDelta].every(isNum) && isStr(x.level)
  && Array.isArray(x.stats) && x.stats.length <= 8
  && x.stats.every(st => isRecord(st) && isStr(st.label) && isStr(st.value));

/** Reads a saved block. Anything that is not a whole, sane block comes back
 *  as null, so a corrupt block resets that block alone and never the career
 *  around it. A save from before Round 914 has no block and reads as null. */
export function loadPreDraft(raw: unknown, desc?: PreDraftDescriptor): PreDraftState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || !SPORTS.includes(r.sport as PreDraftSport) || !isStr(r.eraId) || !isStr(r.seed) || !isStr(r.routeId)) return null;
  if (![r.rating, r.pot, r.stock, r.health, r.age, r.seasonsDone].every(isNum)) return null;
  if (!PHASES.includes(r.phase as PreDraftPhase)) return null;
  if (!Array.isArray(r.lines) || !r.lines.every(isSeasonRecord)) return null;
  if (!Array.isArray(r.choicesSeen) || !r.choicesSeen.every(isStr)) return null;
  if (!Number.isInteger(r.seasonsDone) || (r.seasonsDone as number) < 0 || (r.seasonsDone as number) > 3
    || r.lines.length !== r.seasonsDone
    || r.choicesSeen.length > (r.seasonsDone as number) || new Set(r.choicesSeen).size !== r.choicesSeen.length
    || (r.rating as number) < 1 || (r.rating as number) > 99 || (r.pot as number) < (r.rating as number)
    || (r.pot as number) > 99 || (r.age as number) < 16 || (r.age as number) > 30) return null;
  if (r.pendingChoice !== null && !isStr(r.pendingChoice)) return null;
  if ((r.phase === 'choice') !== (r.pendingChoice !== null)) return null;
  if (r.pos !== undefined && !isStr(r.pos)) return null;
  if (r.phase === 'draft' || r.phase === 'done') {
    const sc = r.showcase;
    if (!isRecord(sc) || !PRE_DRAFT_APPROACHES.some(a => a.id === sc.approach)
      || !isStr(sc.drill) || !isNum(sc.stockDelta)
      || !(sc.approach === 'skip' ? sc.grade === null : ['A', 'B', 'C', 'D'].includes(sc.grade as string))) return null;
  } else if (r.showcase !== null) return null;
  if (r.phase === 'done') {
    const d = r.draft as Record<string, unknown> | null;
    if (!d || typeof d !== 'object' || !isStr(d.team) || !(d.pick === null || isNum(d.pick))) return null;
    if (![d.ratingAfter, d.ageAfter, d.ageAtDraft, d.draftYear].every(isNum)
      || !Array.isArray(d.devSeasons) || d.devSeasons.length > 3 || !d.devSeasons.every(isSeasonRecord)
      || !(d.slotValue === null || isNum(d.slotValue))
      || (d.pick === null ? d.round !== null || d.pickInRound !== null
        : !Number.isInteger(d.pick) || (d.pick as number) < 1 || !isNum(d.round) || !isNum(d.pickInRound))) return null;
  } else if (r.draft !== null) return null;
  const s: PreDraftState = {
    ...(r as unknown as PreDraftState),
    stock: clampMeter(r.stock as number),
    health: clampMeter(r.health as number),
  };
  /* Round 1319: the attempt and the played scores are optional and checked
     alone. A bad one is dropped and the rest of the block loads as before:
     an older bundle in another tab can write a graded state back with the
     attempt still on it, and an optional key must never throw a road away. */
  if ('combine' in s) {
    const cb = s.combine as unknown;
    if (isRecord(cb) && (cb.approach === 'allout' || cb.approach === 'steady') && s.phase === 'showcase' && s.showcase === null) s.combine = { approach: cb.approach };
    else delete s.combine;
  }
  if (isRecord(s.showcase) && 'played' in s.showcase) {
    const p = s.showcase.played as unknown;
    const fine = Array.isArray(p) && p.length >= 1 && p.length <= 2 && p.every(x => Number.isInteger(x) && x >= 0 && x <= 100);
    if (!fine || s.showcase.approach === 'skip' || s.showcase.grade === null) {
      const { played, ...kept } = s.showcase;
      s.showcase = kept;
    }
  }
  if (desc) {
    if (s.sport !== desc.sport || s.eraId !== desc.eraId || !desc.routes.some(route => route.id === s.routeId)) return null;
    if (s.phase === 'done' && s.draft) {
      // A committed outcome is history, not a request to run today's formulas.
      const d = s.draft, teams = desc.teamIds(), count = d.devSeasons.length;
      const route = preDraftRoute(desc, s.routeId);
      if (!teams.includes(d.team) || d.draftYear !== desc.draftYear
        || s.seasonsDone !== route.seasons || s.age !== route.startAge + route.seasons
        || s.lines.some((line, i) => line.age !== route.startAge + i)
        || d.ageAtDraft !== s.age || d.ageAfter !== d.ageAtDraft + count
        || !Number.isInteger(d.ratingAfter) || d.ratingAfter < 1 || d.ratingAfter > s.pot
        || d.devSeasons.some((line, i) => line.age !== d.ageAtDraft + i)
        || (desc.postDraft ? count < desc.postDraft.min || count > desc.postDraft.max : count !== 0)
        || (d.slotValue !== null && d.slotValue < 0)
        || (d.pick === null ? d.slotValue !== null
          : d.pick > teams.length * desc.rounds || d.round !== Math.ceil(d.pick / teams.length)
            || d.pickInRound !== (d.pick - 1) % teams.length + 1)) return null;
    }
    if (s.phase === 'choice' && !preDraftChoicePool(desc).some(card => card.id === s.pendingChoice)) {
      s.pendingChoice = null;
      s.phase = s.seasonsDone >= preDraftRoute(desc, s.routeId).seasons ? 'showcase' : 'season';
    }
    /* Round 1319: an attempt opened and never resolved (Leave, a closed tab,
       a reload) is settled here to the scouts' keyed draw for its approach,
       the same grade on every load. In memory only: the board never writes
       on load, so the disk keeps the attempt until the road's next write
       ("Draft day"), and until then the grade is worked out from today's
       descriptor on every load, exactly as an unpressed showcase's would be.
       A later round that renames `desc.drills` (which re-deals the scouts
       path) moves the grade of an attempt left sitting here and must say so. */
    if (s.phase === 'showcase' && s.combine) return preDraftCombineSettle(desc, s);
  }
  return s;
}
