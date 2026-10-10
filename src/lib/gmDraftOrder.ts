/* Round 1222: the order of a draft, earned. The shared lift, sport neutral.

   Before this, on all four front office boards, the GM picked first from the
   whole class in every round whatever his record. This module is the order a
   league would really give him: reverse standings, the league's lottery drawn
   once, and every later round by the league's own rule. No board imports it
   yet; each sport binds in its own round.

   IT SITS ON gmPicks.ts. The standings row, the lottery draw (runLottery) and
   the slots of a round over a pick ledger (roundSlots) are that module's and
   are imported, never retyped. The lottery TABLE is the one on the pick rules
   the caller hands in. What a league does around the table is DATA in
   src/data/gmDraftOrder/rules.ts. There is no league constant in this file.

   DRAWN ONCE, ON KEYED STREAMS, AND SAVED. buildDraftOrder draws the lottery
   on one keyed stream and each level group on a stream of its own, so adding
   a tie never moves a lottery and one tie never moves another. It returns a
   JSON safe SavedDraftOrder that carries the id of the rule set that drew it.
   Everything after reads the saved object. Nothing draws twice, so a later
   change of table can never re-deal a night somebody watched, and no other
   random stream in a game is touched by any of it.

   FAIL CLOSED. A lottery is drawn only when the rule set has one, every fact
   it needs was read twice, the table handed in is the one the rule set was
   read against and the field is the size the table is for. Anything else is
   plain reverse standings, and the saved order says why. */
import { keyedRng } from './keyedRng';
import { roundSlots, runLottery, share } from './gmPicks';
import type { GmLotteryRules, GmPickKind, GmPickLedger, GmPickRules, LotteryWin, StandingRow } from './gmPicks';
import { GM_DRAFT_ORDER_RULES } from '@/data/gmDraftOrder/rules';
import type { GmDraftOrderRules } from '@/data/gmDraftOrder/rules';

export interface DraftClubRow extends StandingRow {
  /** In the postseason field the lottery leaves out. */
  made: boolean;
  /** The league's picking class among those clubs, low picks first (the round
      a club went out). The host computes it from the bracket's NUMBERS. */
  cls?: number;
  /** The league's own tiebreak values, lower picks earlier. Absent where the league's rule is a draw. */
  tie?: number[];
}

export interface DraftSeason {
  sport: string;
  /** The year a board prints on the draft. It selects the rule set. A pick
      ledger's own year is a separate number, passed to draftSlots. */
  draftYear: number;
  rows: DraftClubRow[];
}

/** Why no lottery ran, or null when one did. */
export type PlainOrderReason = null | 'no-lottery' | 'thin-rule' | 'table' | 'field-size';

export interface SavedDraftOrder {
  v: 1;
  sport: string;
  draftYear: number;
  /** The rule set that drew it. A build that no longer knows the id still reads the order. */
  rulesId: string;
  /** Round one by first owner, slot 1 first. */
  first: string[];
  /** Every later round by first owner. */
  later: string[];
  lottery: null | {
    /** GmLotteryRules.table, as drawn. */
    table: string;
    /** The field worst record first, with the chance each club was drawn on. */
    field: { club: string; seed: number; pct: number }[];
    wins: LotteryWin[];
  };
  plain: PlainOrderReason;
  /** Every group of level clubs a drawing put in order, in that order. */
  level: string[][];
}

/** The rule set a sport's draft of that year plays under, or null. Selected
    on `plays`, the game's own span, never on the league's. */
export function draftRulesFor(
  sport: string, draftYear: number, sets: Record<string, GmDraftOrderRules[]> = GM_DRAFT_ORDER_RULES,
): GmDraftOrderRules | null {
  for (const r of sets[sport] ?? []) {
    if (draftYear >= r.plays.from && (r.plays.to === null || draftYear <= r.plays.to)) return r;
  }
  return null;
}

/** Everything a draw depends on: the rule set, the year and every club's
    record and place in the field. A reload cannot change it, so it cannot
    change the night. */
export function draftSeasonKey(season: DraftSeason, rulesId: string): string {
  const rows = [...season.rows].sort(byId)
    .map(r => `${r.id}:${r.wins}-${r.losses}:${typeof r.pct === 'number' ? r.pct : ''}:${r.made ? 1 : 0}:${r.cls ?? ''}:${(r.tie ?? []).join('/')}`);
  return `${season.sport}|${season.draftYear}|${rulesId}|${rows.join(',')}`;
}

/* By code unit, never by locale: the same ids sort the same on every machine. */
const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function byRecord(a: DraftClubRow, b: DraftClubRow): number {
  const d = share(a) - share(b);
  if (d !== 0) return d;
  const n = Math.max(a.tie?.length ?? 0, b.tie?.length ?? 0);
  for (let i = 0; i < n; i += 1) {
    const t = (a.tie?.[i] ?? 0) - (b.tie?.[i] ?? 0);
    if (t !== 0) return t;
  }
  return 0;
}

/** Worst record first; then each of the league's `tie` values in turn; what
    is still level is put in order by a drawing keyed to the season and to the
    group itself, and returned in `level` so a card and a proof can see every
    drawing. With `byClass`, the league's class comes before the record. */
export function standingOrder(rows: DraftClubRow[], key: string, byClass = false): { order: string[]; level: string[][] } {
  const cmp = (a: DraftClubRow, b: DraftClubRow) => (byClass ? (a.cls ?? 0) - (b.cls ?? 0) : 0) || byRecord(a, b);
  const sorted = [...rows].sort((a, b) => cmp(a, b) || byId(a, b));
  const order: string[] = [];
  const level: string[][] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && cmp(sorted[i], sorted[j]) === 0) j += 1;
    const group = sorted.slice(i, j).map(r => r.id);
    if (group.length > 1) {
      const rng = keyedRng(`${key}|tie|${group.join(',')}`);
      for (let k = group.length - 1; k > 0; k -= 1) {
        const pick = Math.floor(rng() * (k + 1));
        [group[k], group[pick]] = [group[pick], group[k]];
      }
      level.push([...group]);
    }
    order.push(...group);
    i = j;
  }
  return { order, level };
}

/** Why this rule set cannot draw a lottery with this table on this field, or null when it can. */
export function lotteryRefusal(rules: GmDraftOrderRules, lottery: GmLotteryRules | null, fieldSize: number): PlainOrderReason {
  if (!rules.lottery) return 'no-lottery';
  for (const need of rules.lottery.needs) {
    const fact = rules.facts.find(f => f.key === need);
    if (!fact || fact.thin) return 'thin-rule';
  }
  if (!lottery || lottery.table !== rules.lottery.table) return 'table';
  if (fieldSize !== lottery.clubs || lottery.odds.length !== lottery.clubs) return 'field-size';
  return null;
}

/** The field worst record first, with the chance each club is drawn on.
    `pool` is the field in order and `level` its level groups in drawn order
    (both from standingOrder). Where the rules split level odds, a group
    shares the chances of the seeds it spans: whole combinations when the
    league draws with them, the odd ones going one each in the order of the
    drawing, and the plain mean otherwise. */
export function lotteryField(
  pool: string[], level: string[][], rules: GmDraftOrderRules, lottery: GmLotteryRules,
): { club: string; seed: number; pct: number }[] {
  const pct = pool.map((_, i) => (i < lottery.odds.length ? lottery.odds[i] : 0));
  if (rules.level.odds === 'split') {
    const units = rules.lottery?.combinations ?? null;
    for (const group of level) {
      const at = group.map(id => pool.indexOf(id));
      if (at.some(i => i < 0)) continue;
      const total = at.reduce((sum, i) => sum + pct[i], 0);
      if (units === null) {
        for (const i of at) pct[i] = total / group.length;
        continue;
      }
      const whole = Math.round((total / 100) * units);
      const each = Math.floor(whole / group.length);
      const odd = whole - each * group.length;
      at.forEach((i, k) => { pct[i] = ((each + (k < odd ? 1 : 0)) / units) * 100; });
    }
  }
  return pool.map((club, i) => ({ club, seed: i + 1, pct: pct[i] }));
}

/** The order of one draft, drawn once. Pure: the same season, rules, table
    and key always give the identical object, and it survives JSON. */
export function buildDraftOrder(
  season: DraftSeason, rules: GmDraftOrderRules, pickRules: GmPickRules, key: string = draftSeasonKey(season, rules.id),
): SavedDraftOrder {
  const missed = standingOrder(season.rows.filter(r => !r.made), key);
  const rest = standingOrder(season.rows.filter(r => r.made), key, rules.restOfFirst === 'class');
  const plain = lotteryRefusal(rules, pickRules.lottery, missed.order.length);
  let lottery: SavedDraftOrder['lottery'] = null;
  let top = missed.order;
  if (plain === null && pickRules.lottery) {
    const field = lotteryField(missed.order, missed.level, rules, pickRules.lottery);
    const drawn = runLottery(missed.order, { ...pickRules.lottery, odds: field.map(f => f.pct) }, keyedRng(`${key}|lottery`));
    lottery = { table: pickRules.lottery.table, field, wins: drawn.wins };
    top = drawn.order;
  }
  const first = [...top, ...rest.order];
  const place = new Map(first.map((id, i) => [id, i]));
  const flip = rules.level.later === 'reverse-of-first' ? -1 : 1;
  let later: string[];
  if (rules.laterRounds === 'record-all') {
    later = [...season.rows]
      .sort((a, b) => byRecord(a, b) || flip * ((place.get(a.id) ?? 0) - (place.get(b.id) ?? 0)))
      .map(r => r.id);
  } else {
    later = [...missed.order, ...rest.order];
    if (flip < 0) {
      for (const group of [...missed.level, ...rest.level]) {
        const seats = group.map(id => later.indexOf(id)).sort((a, b) => a - b);
        const byFirst = [...group].sort((a, b) => (place.get(b) ?? 0) - (place.get(a) ?? 0));
        seats.forEach((seat, k) => { later[seat] = byFirst[k]; });
      }
    }
  }
  return {
    v: 1, sport: season.sport, draftYear: season.draftYear, rulesId: rules.id,
    first, later, lottery, plain, level: [...missed.level, ...rest.level],
  };
}

const PLAIN_REASONS: PlainOrderReason[] = ['no-lottery', 'thin-rule', 'table', 'field-size'];
const isPerm = (v: unknown, ids: string[]): v is string[] =>
  Array.isArray(v) && v.length === ids.length && new Set(v).size === ids.length && v.every(x => typeof x === 'string' && ids.includes(x));

/** A saved order this build can trust for these clubs. Fails closed, like
    validateLedger: one wrong field and the whole order is refused. A rule id
    this build no longer knows is NOT a reason to refuse: the order was drawn
    and somebody may have watched it. */
export function isSavedDraftOrder(raw: unknown, teamIds: string[]): raw is SavedDraftOrder {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || typeof o.sport !== 'string' || !o.sport || !Number.isInteger(o.draftYear)) return false;
  if (typeof o.rulesId !== 'string' || !o.rulesId) return false;
  if (!isPerm(o.first, teamIds) || !isPerm(o.later, teamIds)) return false;
  if (!Array.isArray(o.level)) return false;
  const seen = new Set<string>();
  for (const g of o.level as unknown[]) {
    if (!Array.isArray(g) || g.length < 2) return false;
    for (const id of g) {
      if (typeof id !== 'string' || !teamIds.includes(id) || seen.has(id)) return false;
      seen.add(id);
    }
  }
  if (o.lottery === null) return PLAIN_REASONS.includes(o.plain as PlainOrderReason);
  if (o.plain !== null || !o.lottery || typeof o.lottery !== 'object') return false;
  const l = o.lottery as Record<string, unknown>;
  if (typeof l.table !== 'string' || !l.table || !Array.isArray(l.field) || !Array.isArray(l.wins)) return false;
  const field = l.field as { club?: unknown; seed?: unknown; pct?: unknown }[];
  const clubs: string[] = [];
  for (let i = 0; i < field.length; i += 1) {
    const f = field[i];
    if (!f || typeof f !== 'object' || typeof f.club !== 'string' || f.seed !== i + 1) return false;
    if (typeof f.pct !== 'number' || !Number.isFinite(f.pct) || f.pct < 0) return false;
    clubs.push(f.club);
  }
  /* The field is the head of round one, club for club: nobody outside it picks inside it. */
  if (clubs.length === 0 || !isPerm((o.first as string[]).slice(0, clubs.length), clubs)) return false;
  const wins = l.wins as { draw?: unknown; club?: unknown; seed?: unknown; slot?: unknown }[];
  const winners = new Set<string>();
  for (let i = 0; i < wins.length; i += 1) {
    const w = wins[i];
    if (!w || typeof w !== 'object' || w.draw !== i + 1 || typeof w.club !== 'string' || winners.has(w.club)) return false;
    if (clubs[(w.seed as number) - 1] !== w.club) return false;
    if (!Number.isInteger(w.slot) || (w.slot as number) < 1 || (w.slot as number) > clubs.length) return false;
    winners.add(w.club);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Slots: the order laid over who holds each pick now
// ---------------------------------------------------------------------------

export interface EarnedSlot {
  /** 1 for the first pick of the draft, counting every round. */
  overall: number;
  round: number;
  /** The place inside its round. */
  slot: number;
  /** The club the pick first belonged to: its record set the place. */
  orig: string;
  /** The club that uses it. */
  holder: string;
  kind: GmPickKind;
  /** The old save never wrote down whose pick this first was, so its place is a guess. A card marks it. */
  origUnknown?: true;
}

/** Every pick the ledger holds for `ledgerYear`, as the clubs will use it:
    round one on the saved order's first round, every later round on its
    later order, numbered 1..n over the whole draft. A pick the ledger does
    not hold is skipped and an awarded pick closes its round, as roundSlots
    does it. `rounds` is the GAME's number of rounds, which may be fewer than
    the league's. */
export function draftSlots(order: SavedDraftOrder, ledger: GmPickLedger, ledgerYear: number, rounds: number): EarnedSlot[] {
  const out: EarnedSlot[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    for (const s of roundSlots(ledger, ledgerYear, round, round === 1 ? order.first : order.later)) {
      out.push({
        overall: out.length + 1, round, slot: s.slot, orig: s.pick.orig, holder: s.pick.holder, kind: s.pick.kind ?? 'std',
        ...(s.pick.origUnknown ? { origUnknown: true as const } : {}),
      });
    }
  }
  return out;
}

/** The slots of a league with no pick ledger: every club uses its own pick,
    `order` once a round. The shape a game whose order is a plain list of
    clubs binds through. */
export function ownSlots(order: string[], rounds: number): EarnedSlot[] {
  const out: EarnedSlot[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    order.forEach((club, i) => out.push({ overall: out.length + 1, round, slot: i + 1, orig: club, holder: club, kind: 'std' }));
  }
  return out;
}

/** The slot on the clock once `made` are used, or null when the draft is over. */
export function nextSlot(slots: EarnedSlot[], made: number): EarnedSlot | null {
  return made >= 0 && made < slots.length ? slots[made] : null;
}

/** The run of slots other clubs use before `club` is next on the clock, or to the end. Never one of the club's own. */
export function slotsUntil(slots: EarnedSlot[], made: number, club: string): EarnedSlot[] {
  const out: EarnedSlot[] = [];
  for (let i = Math.max(0, made); i < slots.length && slots[i].holder !== club; i += 1) out.push(slots[i]);
  return out;
}

/** The slots `club` still has to use. */
export function slotsLeftFor(slots: EarnedSlot[], made: number, club: string): EarnedSlot[] {
  return slots.slice(Math.max(0, made)).filter(s => s.holder === club);
}

/** What a club reads off a prospect. The host supplies it, so this module never learns a sport. */
export interface ProspectRead<P> {
  read(p: P): number;
  pos(p: P): string;
  id(p: P): string;
}

/** A rival's choice: the best man left on the club's own read, plus a bonus
    for a position it is short at. Level calls go to the lower id. IT DRAWS
    NOTHING, so binding it moves no random stream anywhere. */
export function rivalChoice<P>(left: P[], h: ProspectRead<P>, need: Record<string, number>, needWeight: number): P | null {
  let best: P | null = null;
  let bestScore = -Infinity;
  for (const p of left) {
    const score = h.read(p) + needWeight * (need[h.pos(p)] ?? 0);
    if (best === null || score > bestScore || (score === bestScore && h.id(p) < h.id(best))) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}
