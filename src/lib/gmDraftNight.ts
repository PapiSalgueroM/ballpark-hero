/* Round 1222: draft night as a small state machine behind a host. The second
   half of the shared lift; gmDraftOrder.ts is the first.

   WHY IT IS HERE AND NOT IN A SPORT'S DESK FILE. Nothing in a draft night
   asks which sport it is: for each slot until his next one, spend the
   holder's marker, let the club choose, sign the man, write a step. Only a
   handful of things are the sport's, and a host hands them in: spend a
   marker, turn a prospect into a signed player, the need of a club, and the
   read, position, id and name of a prospect. Four front offices then bind
   one loop instead of typing it four times (CLAUDE.md, Round 426).

   THE SIBLING. The Aussie Rules manager (src/lib/aussieRulesLeague.ts, Round
   1014) already plays an earned draft with a cursor and rivals who pick
   before you: its saved state is { order, pool, made, at }. This block is
   shaped so that game is a later BIND and not a third copy: a slot list
   where holder and first owner are one club holds its order, `made` is its
   `at`, and the pool stays the host's. WHAT THAT BIND STILL WRITES ITSELF,
   said plainly so nobody walks in with a wrong map:
   - ITS SLOT LIST. That game's clubs take different numbers of picks: one a
     pass through the order while a club still has a vacancy. ownSlots gives
     every club the same number, so ownSlots is NOT that game's order. The
     slot type and isGmDraftNight hold such a list as it is: a club with no
     pick in a round is simply absent from it.
   - ITS RIVALS' RULE, through the host's optional `choose`. That game's
     clubs fill their biggest hole first and never take a prospect another
     club still needs, which is not a read plus a weighted need, so
     rivalChoice is not its rule.

   WHAT IS SAVED. One block: the order, the slot list resolved ONCE when the
   night opens, how many slots are used, and whether the lottery card has
   been watched. Nothing reads the pick ledger again that night, so a ledger
   that resets mid draft cannot move the clock. Rivals never sit half
   resolved on a save: a saved night is the lottery not yet watched, the GM
   on the clock, or the draft over.

   IT DRAWS NOTHING. No function here takes or makes a random number. */
import { MAX_REVEALED, PICK_STEP_MS, pickDelayMs } from './draftNight';
import type { DraftNight } from './draftNight';
import { isSavedDraftOrder, nextSlot, rivalChoice } from './gmDraftOrder';
import type { EarnedSlot, SavedDraftOrder } from './gmDraftOrder';

export interface GmDraftNight {
  v: 1;
  /** The season the night belongs to, the host's own year. A block of another year is never current. */
  year: number;
  order: SavedDraftOrder;
  /** Every slot of the draft, resolved once at the open. */
  slots: EarnedSlot[];
  /** How many slots are used. */
  made: number;
  /** The lottery card has been watched. */
  seen: boolean;
}

/** The sport's half of a draft night. L is the league a host mutates, P a prospect. */
export interface GmDraftHost<L, P> {
  /** Spend the club's marker for this slot. False when the engine holds none: the slot passes. */
  consume(league: L, club: string, slot: EarnedSlot): boolean;
  /** Turn the prospect into a signed player on the club. */
  sign(league: L, club: string, prospect: P, slot: EarnedSlot): void;
  /** How short the club is at each position, 0 to 1. */
  need(league: L, club: string): Record<string, number>;
  /** What one whole point of need is worth beside a read. */
  needWeight: number;
  /** OPTIONAL: the club's own way of choosing from the men left, for a league
      whose clubs do not choose by read plus need. It must draw nothing and
      must answer one of `left`, or null to let the slot pass. Without it the
      lift's rivalChoice decides, on `read`, `need` and `needWeight`. */
  choose?(league: L, club: string, left: P[], slot: EarnedSlot): P | null;
  /** What `club` chooses on. */
  read(prospect: P, club: string): number;
  /** What a card prints beside a pick: the watching GM's own scout's read, never an engine's hidden number. */
  shown(prospect: P): number;
  pos(prospect: P): string;
  id(prospect: P): string;
  name(prospect: P): string;
}

/** One pick that was made, with its TRUE number in the draft. */
export interface RunStep {
  overall: number;
  team: string;
  playerName: string;
  pos: string;
  /** host.shown: his scout's read. */
  grade: number;
  mine: boolean;
}

export interface DraftRun<P> {
  night: GmDraftNight;
  /** The class with the men just taken gone. */
  left: P[];
  steps: RunStep[];
  /** His slot, when the run stopped for him. */
  onClock: EarnedSlot | null;
  done: boolean;
}

export function openDraftNight(order: SavedDraftOrder, slots: EarnedSlot[], year: number): GmDraftNight {
  return { v: 1, year, order, slots: slots.map(s => ({ ...s })), made: 0, seen: false };
}

export function markLotterySeen(night: GmDraftNight): GmDraftNight {
  return night.seen ? night : { ...night, seen: true };
}

const KINDS = ['std', 'comp', 'cb'];

/** A saved night this build can trust for these clubs and this year. Fails
    closed: one wrong field and the caller finishes the draft its old way. */
export function isGmDraftNight(raw: unknown, teamIds: string[], year: number): raw is GmDraftNight {
  if (!raw || typeof raw !== 'object') return false;
  const n = raw as Record<string, unknown>;
  if (n.v !== 1 || n.year !== year || typeof n.seen !== 'boolean') return false;
  if (!isSavedDraftOrder(n.order, teamIds) || !Array.isArray(n.slots)) return false;
  const slots = n.slots as Partial<EarnedSlot>[];
  let round = 1;
  let inRound = 0;
  for (let i = 0; i < slots.length; i += 1) {
    const s = slots[i];
    if (!s || typeof s !== 'object' || s.overall !== i + 1 || !Number.isInteger(s.round)) return false;
    if (s.round !== round) {
      if ((s.round as number) < round) return false;
      round = s.round as number;
      inRound = 0;
    }
    inRound += 1;
    if (s.slot !== inRound || !KINDS.includes(s.kind as string)) return false;
    if (typeof s.orig !== 'string' || typeof s.holder !== 'string' || !teamIds.includes(s.orig) || !teamIds.includes(s.holder)) return false;
    if (s.origUnknown !== undefined && s.origUnknown !== true) return false;
  }
  /* Every ordinary slot sits at its first owner's place in the saved order,
     so a slot list from another night, or one put out of order, is refused.
     A pick the ledger did not hold is simply absent; an awarded pick closes
     its round and has no place in the order to be held to. */
  const order = n.order as SavedDraftOrder;
  let line: string[] = [];
  let at = -1;
  round = 0;
  for (const s of slots as EarnedSlot[]) {
    if (s.round !== round) { round = s.round; line = round === 1 ? order.first : order.later; at = -1; }
    if (s.kind !== 'std') continue;
    at = line.indexOf(s.orig, at + 1);
    if (at < 0) return false;
  }
  return Number.isInteger(n.made) && (n.made as number) >= 0 && (n.made as number) <= slots.length;
}

function stepOf<L, P>(host: GmDraftHost<L, P>, slot: EarnedSlot, prospect: P, mine: boolean): RunStep {
  return {
    overall: slot.overall, team: slot.holder, playerName: host.name(prospect), pos: host.pos(prospect),
    grade: Math.round(host.shown(prospect)), mine,
  };
}

/* The one loop. Resolves slots from the cursor: every club but `stopFor`
   chooses by the rival rule (the host's own `choose` when it has one); it
   stops when `stopFor` is on the clock, or runs to the end when `stopFor` is
   null. A slot whose club holds no marker, or that finds the class empty,
   passes: it is used and no man is signed.

   USED MEANS SPENT. The marker is spent FIRST, so a slot that finds the
   class dry still costs its club the marker, exactly as a pass does
   (passDraftPick). A host whose markers carry over a summer would otherwise
   keep one for every slot that came after the last prospect. */
function run<L, P>(host: GmDraftHost<L, P>, league: L, night: GmDraftNight, left: P[], stopFor: string | null, me: string): DraftRun<P> {
  let made = night.made;
  let pool = left;
  const steps: RunStep[] = [];
  while (made < night.slots.length && night.slots[made].holder !== stopFor) {
    const slot = night.slots[made];
    made += 1;
    const club = slot.holder;
    const spent = host.consume(league, club, slot);
    const choice = host.choose
      ? host.choose(league, club, pool, slot)
      : rivalChoice(pool, { read: p => host.read(p, club), pos: p => host.pos(p), id: p => host.id(p) }, host.need(league, club), host.needWeight);
    /* No marker, nobody left, or a host that answered a man who is not in the class: the slot passes. */
    if (!spent || choice === null || choice === undefined || !pool.includes(choice)) continue;
    host.sign(league, club, choice, slot);
    pool = pool.filter(p => p !== choice);
    steps.push(stepOf(host, slot, choice, club === me));
  }
  return { night: { ...night, made }, left: pool, steps, onClock: nextSlot(night.slots, made), done: made >= night.slots.length };
}

/** Every rival slot from the cursor up to `me`'s next one, or to the end. */
export function advanceDraftNight<L, P>(host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string, left: P[]): DraftRun<P> {
  return run(host, league, night, left, me, me);
}

/** The staff makes every pick `me` has left by the rivals' rule, and the draft runs to its end. */
export function staffDraftNight<L, P>(host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string, left: P[]): DraftRun<P> {
  return run(host, league, night, left, null, me);
}

/** His pick. Null unless the slot on the clock is his, the man is still in the class and the marker is there.
    A null while his slot IS on the clock (the engine holds no marker for it, or the class is empty) leaves the
    night where it is, and advanceDraftNight stops at his slot again: only passDraftPick or staffDraftNight moves
    it on. So a board that binds this MUST offer one of the two, or that case is a screen with no way forward. */
export function userDraftPick<L, P>(
  host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string, left: P[], prospectId: string,
): { night: GmDraftNight; left: P[]; step: RunStep; slot: EarnedSlot } | null {
  const slot = nextSlot(night.slots, night.made);
  if (!slot || slot.holder !== me) return null;
  const prospect = left.find(p => host.id(p) === prospectId);
  if (prospect === undefined || !host.consume(league, me, slot)) return null;
  host.sign(league, me, prospect, slot);
  return { night: { ...night, made: night.made + 1 }, left: left.filter(p => p !== prospect), step: stepOf(host, slot, prospect, true), slot };
}

/** He lets his slot go by: the marker is spent and nobody is signed. Null unless the slot on the clock is his. */
export function passDraftPick<L, P>(host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string): GmDraftNight | null {
  const slot = nextSlot(night.slots, night.made);
  if (!slot || slot.holder !== me) return null;
  host.consume(league, me, slot);
  return { ...night, made: night.made + 1 };
}

// ---------------------------------------------------------------------------
// The run, as the existing draft night card draws it
// ---------------------------------------------------------------------------

/* What the picks of a run say in words. It counts every pick MADE, never the
   rows a card shows: "Picks 1 to 11 are in. You are on the clock at 12." */
function runHeadline(steps: RunStep[], next: EarnedSlot | null): string {
  const parts: string[] = [];
  for (let i = 0; i < steps.length;) {
    if (steps[i].mine) {
      parts.push(`Your pick is in at ${steps[i].overall}.`);
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < steps.length && !steps[j + 1].mine) j += 1;
    const from = steps[i].overall;
    const to = steps[j].overall;
    const count = j - i + 1;
    if (count === 1) parts.push(`Pick ${from} is in.`);
    else if (to - from + 1 === count) parts.push(`Picks ${from} to ${to} are in.`);
    else parts.push(`${count} picks are in, the last at ${to}.`);
    i = j + 1;
  }
  parts.push(next ? `You are on the clock at ${next.overall}.` : 'Every pick of the draft is in.');
  return parts.join(' ');
}

/** A run of picks as a DraftNight the existing card can draw, with TRUE pick
    numbers. A card shows at most MAX_REVEALED rows: every pick of his in the
    run is always one of them, and the rest are the latest picks before he is
    next. The headline counts every pick made; `hidden` is how many were made
    and are not rows. It does not go through buildDraftNight, whose contract
    (the GM first, numbered from 1) stays as scripts/simDraftNight.mjs holds it. */
export function draftRunReveal(steps: RunStep[], next: EarnedSlot | null): { night: DraftNight; headline: string; hidden: number } {
  const made = (Array.isArray(steps) ? steps : []).filter(s => s && Number.isInteger(s.overall) && s.overall > 0
    && typeof s.team === 'string' && s.team !== '' && typeof s.playerName === 'string' && s.playerName.trim() !== '');
  const keep = new Set<RunStep>(made.filter(s => s.mine).slice(-MAX_REVEALED));
  for (let i = made.length - 1; i >= 0 && keep.size < MAX_REVEALED; i -= 1) keep.add(made[i]);
  const rows = made.filter(s => keep.has(s));
  return {
    night: {
      picks: rows.map(s => ({
        overall: s.overall, team: s.team, playerName: s.playerName.trim(), pos: typeof s.pos === 'string' ? s.pos : '',
        grade: Number.isFinite(s.grade) ? Math.round(s.grade) : 0, mine: s.mine === true,
      })),
      totalMs: rows.length ? pickDelayMs(rows.length - 1) + PICK_STEP_MS : 0,
    },
    headline: runHeadline(made, next),
    hidden: made.length - rows.length,
  };
}
