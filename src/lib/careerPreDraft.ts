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

export interface PreDraftDescriptor {
  sport: PreDraftSport;
  eraId: string;
  /** The year the draft is held. */
  draftYear: number;
  rounds: number;
  /** Read lazily, never at module scope. */
  teamIds: () => string[];
  teamLabel: (id: string) => string;
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
  /* The blurbs say nothing about size: near either end of the meter both
     approaches can move the stock the same amount, and the line under each
     button prints the real numbers from this stock. */
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
  const z = (100 - clampMeter(stock)) / 100;
  const spread = 0.75 + 0.5 * rng();
  return Math.max(1, Math.round(1 + Math.pow(z, 1.6) * totalPicks * 1.25 * spread));
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

/** The drill grade comes from one draw that ignores the approach, so the
 *  approach only decides how far the same grade moves the stock. */
export function preDraftShowcaseGrade(s: PreDraftState, rng: () => number): 'A' | 'B' | 'C' | 'D' {
  const roll = rng() + (s.rating - 70) * 0.02 - (100 - s.health) * 0.003;
  return roll > 0.8 ? 'A' : roll > 0.5 ? 'B' : roll > 0.2 ? 'C' : 'D';
}

export function preDraftShowcase(desc: PreDraftDescriptor, prev: PreDraftState, approach: PreDraftApproach['id']): PreDraftState {
  if (prev.phase !== 'showcase') return prev;
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
  const rank = preDraftBoardRank(s.stock, order.length, rng);
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
    /* Undrafted means the longest climb, from the first rung of the ladder:
       the undrafted lines promise exactly that. */
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

/* ─── The save block ──────────────────────────────────────────────────── */

const PHASES: PreDraftPhase[] = ['season', 'choice', 'showcase', 'draft', 'done'];
const SPORTS: PreDraftSport[] = ['nfl', 'nba', 'mlb', 'nhl'];
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isNumOrNull = (x: unknown) => x === null || isNum(x);
const GRADES = ['A', 'B', 'C', 'D'];
const APPROACH_IDS = ['allout', 'steady', 'skip'];

/** A season line the cards can print: every field they read, every stat. */
function isSeasonRecord(x: unknown): boolean {
  if (!isObj(x) || !isNum(x.age) || !isStr(x.level) || !isNum(x.perf) || !isNum(x.stockDelta)) return false;
  return Array.isArray(x.stats) && x.stats.every(st => isObj(st) && isStr(st.label) && isStr(st.value));
}

function isShowcase(x: unknown): boolean {
  if (!isObj(x) || !APPROACH_IDS.includes(x.approach as string) || !isStr(x.drill) || !isNum(x.stockDelta)) return false;
  return x.approach === 'skip' ? x.grade === null : GRADES.includes(x.grade as string);
}

function isOutcome(x: unknown): boolean {
  if (!isObj(x) || !isStr(x.team) || !isNum(x.ageAtDraft) || !isNum(x.draftYear)) return false;
  if (!isNumOrNull(x.pick) || !isNumOrNull(x.round) || !isNumOrNull(x.pickInRound) || !isNumOrNull(x.slotValue)) return false;
  if ((x.pick === null) !== (x.round === null) || (x.pick === null) !== (x.pickInRound === null)) return false;
  if (!isNum(x.ratingAfter) || !isNum(x.ageAfter)) return false;
  return Array.isArray(x.devSeasons) && x.devSeasons.every(isSeasonRecord);
}

/** Reads a saved block. Anything that is not a whole, sane block comes back
 *  as null, so a corrupt block resets that block alone and never the career
 *  around it. A save from before Round 914 has no block and reads as null.
 *  Every field a card reads is checked down to the elements: the season
 *  lines and their stats, the showcase, the draft outcome and its seasons.
 *  Each phase carries exactly what it needs: a pending card only in
 *  'choice', a showcase from 'draft' on, an outcome only in 'done'.
 *  Given the sport's descriptor it also checks the block belongs to that
 *  sport, era and one of its routes, and a pending card the descriptor no
 *  longer deals (a later round renamed it) is dropped and the road goes on,
 *  so a renamed card can never leave a player with no button to press. */
export function loadPreDraft(raw: unknown, desc?: PreDraftDescriptor): PreDraftState | null {
  if (!isObj(raw)) return null;
  const r = raw;
  if (r.v !== 1 || !SPORTS.includes(r.sport as PreDraftSport) || !isStr(r.eraId) || !isStr(r.seed) || !isStr(r.routeId)) return null;
  if (![r.rating, r.pot, r.stock, r.health, r.age, r.seasonsDone].every(isNum)) return null;
  if (!PHASES.includes(r.phase as PreDraftPhase)) return null;
  if (!Array.isArray(r.lines) || !r.lines.every(isSeasonRecord)) return null;
  if (!Array.isArray(r.choicesSeen) || !r.choicesSeen.every(isStr)) return null;
  if (r.pos !== undefined && !isStr(r.pos)) return null;
  if (r.phase === 'choice' ? !isStr(r.pendingChoice) : r.pendingChoice !== null) return null;
  const late = r.phase === 'draft' || r.phase === 'done';
  if (late ? !isShowcase(r.showcase) : r.showcase !== null) return null;
  if (r.phase === 'done' ? !isOutcome(r.draft) : r.draft !== null) return null;
  const s: PreDraftState = {
    ...(r as unknown as PreDraftState),
    stock: clampMeter(r.stock as number),
    health: clampMeter(r.health as number),
  };
  if (desc) {
    if (s.sport !== desc.sport || s.eraId !== desc.eraId || !desc.routes.some(x => x.id === s.routeId)) return null;
    if (s.phase === 'choice' && !preDraftChoicePool(desc).some(c => c.id === s.pendingChoice)) {
      s.pendingChoice = null;
      s.phase = s.seasonsDone >= preDraftRoute(desc, s.routeId).seasons ? 'showcase' : 'season';
    }
  }
  return s;
}
