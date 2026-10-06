/* Round 945: one lineup engine for every GM seat.

   A sport declares its slot groups (a batting nine, a rotation, four lines,
   three pairs, the personnel on the field) and what each slot is worth, and
   this file turns a lineup into the team strength those slots produce.

   THE NUMBER WITH NO CHOICES IS TODAY'S NUMBER, BIT FOR BIT. Each sport also
   says which men its current strength reads (mlbStrengthUnits, the NHL
   contributors, the NFL depth chart starters), and the strength is

     base (today's formula over those men)
       + share x (slot weighted rating of the chosen lineup
                  - slot weighted rating of the lineup the sim picks itself)

   so a team nobody has touched reads exactly what it reads today (the second
   line is x minus x, which is exactly zero), and a GM's lineup moves the
   number by how much better or worse it is than the sim's own, priced by the
   slot weights. scripts/simGmLineup.mjs holds both halves to that.

   THIS FILE IMPORTS NO ENGINE. The binds that follow make mlbStrength,
   nhlStrength and teamStrength call in here, and an engine importing a file
   that imports the engine is the cycle CLAUDE.md warns about. The sport
   descriptors live in gmLineupSports.ts, which does import the engines.

   Every weight here and in gmLineupSports.ts is the game's own assumption,
   not a measured split of plate appearances or ice time. */

/** The fields of a man the lineup reads. Every GM engine's player has them. */
export interface GmLineupMan {
  id: string;
  name?: string;
  pos: string;
  ovr: number;
  /** Rounds or weeks out hurt, 0 when healthy. */
  out: number;
}

/** One place in a group. weight is its share of the group's slot rating. */
export interface GmSlot {
  label: string;
  weight: number;
  /** The positions this slot takes. Absent: any of the group's positions. */
  accepts?: readonly string[];
}

/** A rotation walks its slots start by start; a man back too soon pitches short. */
export interface GmRotationRule {
  /** Games between starts that count as full rest (a five man turn is four). */
  fullRest: number;
  /** Rating points a start loses for each game of rest short of full. */
  shortRestCost: number;
  /** How many trailing slots the GM may leave empty on purpose (a four man rotation). */
  optional: number;
}

export interface GmSlotGroup {
  key: string;
  label: string;
  /** The group's share of team strength, the weight today's formula gives it. */
  share: number;
  /** How many men today's formula averages here (0: this group is new and only moves the number). */
  counted: number;
  /** Who may fill the group at all. */
  positions: readonly string[] | { not: readonly string[] };
  slots: readonly GmSlot[];
  /** What a group nobody fills reads, and what an empty slot reads in the slot rating. */
  fallback: number;
  /** A fixed denominator: each empty counted place reads this instead of being left out. */
  empty?: number;
  /** The group never reads below this (the NFL quarterback). */
  floor?: number;
  rotation?: GmRotationRule;
}

/** A named slot shape a group can switch to (the NFL personnel and fronts). First is the default. */
export interface GmScheme {
  key: string;
  label: string;
  slots: readonly GmSlot[];
}

/** The GM's choices. Every part optional: absent reads as the sim's own pick. */
export interface GmLineupChoice {
  /** Man ids by slot, per group. null is a slot the sim fills by rating. A
      saved man who is hurt keeps his id here, so he gets the slot back. */
  slots?: Record<string, (string | null)[]>;
  /** A scheme key per group, where the sport offers schemes. */
  schemes?: Record<string, string>;
  /** Per rotation, the optional slots left empty on purpose. Only this marks
      a skip: a slot that is empty because nobody healthy is left is not one. */
  open?: Record<string, number[]>;
}

export interface GmLineupSport<T> {
  id: string;
  groups: readonly GmSlotGroup[];
  /** Per group key, the shapes on offer. The first is the default. */
  schemes?: Record<string, readonly GmScheme[]>;
  /** The men are read off a depth chart the GM already orders elsewhere; he picks schemes only. */
  chartOnly?: boolean;
  men: (team: T) => GmLineupMan[];
  /** The men today's strength reads, per group, in the order it reads them. */
  base: (team: T) => Record<string, GmLineupMan[]>;
  /** The sim's own pick for a group under a slot shape. */
  auto: (team: T, group: GmSlotGroup, slots: readonly GmSlot[]) => (GmLineupMan | null)[];
  /** The same club with every man fit, so `auto` on it is the sim's full
      strength pick: the hurt men a first tap on a group keeps a slot for. */
  healed?: (team: T) => T;
}

export type GmResolvedLineup = Record<string, (GmLineupMan | null)[]>;

const mean = (xs: GmLineupMan[]): number => xs.reduce((s, p) => s + p.ovr, 0) / xs.length;

/** Today's formula for one group over the men it reads, in the same arithmetic. */
export function gmGroupBase(group: GmSlotGroup, men: GmLineupMan[]): number {
  if (group.empty !== undefined) {
    const filled = men.reduce((s, p) => s + p.ovr, 0);
    const empty = (group.counted - men.length) * group.empty;
    return (filled + empty) / group.counted;
  }
  const value = men.length ? mean(men) : group.fallback;
  return group.floor !== undefined ? Math.max(group.floor, value) : value;
}

export interface GmStart {
  id: string | null;
  /** Games since his last start, the steady state of the turn when the walk starts fresh. */
  rest: number;
  value: number;
}

/** Walk a rotation start by start. Empty and hurt slots are skipped, so a
    short turn sends everyone out on short rest. `last` carries the game index
    of each man's previous start between calls; absent, the turn is taken to
    have been walking already (everyone on its own steady rest). */
export function gmWalkRotation(
  order: readonly (GmLineupMan | null)[],
  starts: number,
  rule: GmRotationRule,
  fallback: number,
  last?: Record<string, number>,
  from = 0,
): { starts: GmStart[]; last: Record<string, number> } {
  const able = order.map(p => (p && p.out === 0 ? p : null));
  const turn = able.filter((p): p is GmLineupMan => !!p);
  const seen: Record<string, number> = { ...(last ?? {}) };
  if (!last) turn.forEach((p, i) => { seen[p.id] = from + i - turn.length; });
  /* The turn carries on from the man after whoever pitched last, hurt or not. */
  let at = 0;
  if (last) {
    let latest = -Infinity;
    order.forEach((p, i) => { if (p && p.id in seen && seen[p.id] > latest) { latest = seen[p.id]; at = i + 1; } });
  }
  const out: GmStart[] = [];
  for (let g = from; g < from + starts; g++) {
    if (turn.length === 0) { out.push({ id: null, rest: rule.fullRest, value: fallback }); continue; }
    while (!able[at % able.length]) at += 1;
    const p = able[at % able.length]!;
    at += 1;
    const rest = p.id in seen ? g - seen[p.id] - 1 : rule.fullRest;
    seen[p.id] = g;
    out.push({ id: p.id, rest, value: gmStartValue(p, rest, rule) });
  }
  return { starts: out, last: seen };
}

/** One start: his rating, less the cost of every game of rest he is short. */
export function gmStartValue(p: GmLineupMan, rest: number, rule: GmRotationRule): number {
  return p.ovr - rule.shortRestCost * Math.max(0, rule.fullRest - rest);
}

/** A group's slot rating: the weighted mean of its slots, an empty slot at
    the group's empty or fallback value. A rotation reads one steady turn. */
export function gmGroupRich(group: GmSlotGroup, slots: readonly GmSlot[], men: readonly (GmLineupMan | null)[]): number {
  if (group.rotation) {
    const turn = men.filter(p => !!p && p.out === 0).length || 1;
    const walk = gmWalkRotation(men, turn, group.rotation, group.fallback).starts;
    return walk.reduce((s, x) => s + x.value, 0) / walk.length;
  }
  let sum = 0, weight = 0;
  slots.forEach((slot, i) => {
    const p = men[i];
    sum += slot.weight * (p ? p.ovr : group.empty ?? group.fallback);
    weight += slot.weight;
  });
  return weight > 0 ? sum / weight : group.fallback;
}

/** The slot shape a group is playing under this choice. */
export function gmGroupSlots<T>(sport: GmLineupSport<T>, group: GmSlotGroup, choice?: GmLineupChoice): readonly GmSlot[] {
  const offered = sport.schemes?.[group.key];
  if (!offered || offered.length === 0) return group.slots;
  const key = choice?.schemes?.[group.key];
  return (offered.find(s => s.key === key) ?? offered[0]).slots;
}

/** Whether a position belongs to a group: on its list, or off its list of exclusions. */
export const gmInGroup = (group: GmSlotGroup, pos: string): boolean =>
  Array.isArray(group.positions) ? group.positions.includes(pos) : !(group.positions as { not: readonly string[] }).not.includes(pos);

const accepts = (group: GmSlotGroup, slot: GmSlot, p: GmLineupMan): boolean =>
  (slot.accepts ? slot.accepts.includes(p.pos) : gmInGroup(group, p.pos));

/** The healthy men a group may use. */
export function gmGroupPool(group: GmSlotGroup, men: readonly GmLineupMan[]): GmLineupMan[] {
  return men.filter(p => p.out === 0 && gmInGroup(group, p.pos));
}

/** Fill slots best first: heavier slots first, each with the best man left that it takes.
    `keep` is what is already placed (null where open); `skip` slots stay empty. */
export function gmFillByRating(
  group: GmSlotGroup,
  slots: readonly GmSlot[],
  pool: readonly GmLineupMan[],
  keep: readonly (GmLineupMan | null)[] = [],
  skip: ReadonlySet<number> = new Set(),
): (GmLineupMan | null)[] {
  const out: (GmLineupMan | null)[] = slots.map((_, i) => keep[i] ?? null);
  const used = new Set(out.filter((p): p is GmLineupMan => !!p).map(p => p.id));
  const spare = [...pool].sort((a, b) => b.ovr - a.ovr).filter(p => !used.has(p.id));
  const order = slots.map((s, i) => i).sort((a, b) => slots[b].weight - slots[a].weight || a - b);
  for (const i of order) {
    if (out[i] || skip.has(i)) continue;
    const at = spare.findIndex(p => accepts(group, slots[i], p));
    if (at >= 0) out[i] = spare.splice(at, 1)[0];
  }
  return out;
}

const savedShape = (v: unknown, length: number): v is (string | null)[] =>
  Array.isArray(v) && v.length === length && v.every(id => id === null || typeof id === 'string')
  && new Set(v.filter(id => id !== null)).size === v.filter(id => id !== null).length;

/** The saved slots of a group, when they fit its current shape. */
const savedSlots = <T>(sport: GmLineupSport<T>, group: GmSlotGroup, slots: readonly GmSlot[], choice?: GmLineupChoice): (string | null)[] | undefined => {
  const saved = sport.chartOnly ? undefined : choice?.slots?.[group.key];
  return savedShape(saved, slots.length) ? saved : undefined;
};

/** The optional rotation slots a choice leaves empty on purpose. Read only
    beside a valid save of the group's slots. */
export function gmSkippedSlots<T>(sport: GmLineupSport<T>, group: GmSlotGroup, choice?: GmLineupChoice): Set<number> {
  const slots = gmGroupSlots(sport, group, choice);
  const marks = choice?.open?.[group.key];
  if (!group.rotation || !Array.isArray(marks) || !savedSlots(sport, group, slots, choice)) return new Set();
  return new Set(marks.filter(i => Number.isInteger(i) && i >= slots.length - group.rotation!.optional && i < slots.length));
}

/** The lineup a choice puts on the field: saved men where they can play, the
    sim's pick everywhere else. A saved man who is hurt, gone or in a slot he
    cannot take leaves a hole the best spare fills, and gets it back when he
    can play again. A group with no valid save is the sim's own pick. */
export function gmResolveLineup<T>(sport: GmLineupSport<T>, team: T, choice?: GmLineupChoice): GmResolvedLineup {
  const men = sport.men(team);
  const out: GmResolvedLineup = {};
  for (const g of sport.groups) {
    const slots = gmGroupSlots(sport, g, choice);
    const saved = savedSlots(sport, g, slots, choice);
    if (!saved) { out[g.key] = sport.auto(team, g, slots); continue; }
    const pool = gmGroupPool(g, men);
    const keep: (GmLineupMan | null)[] = [];
    const skip = gmSkippedSlots(sport, g, choice);
    const used = new Set<string>();
    saved.forEach((id, i) => {
      const p = id === null || skip.has(i) ? undefined : pool.find(q => q.id === id);
      if (p && !used.has(p.id) && accepts(g, slots[i], p)) { keep.push(p); used.add(p.id); } else keep.push(null);
    });
    out[g.key] = gmFillByRating(g, slots, pool, keep, skip);
  }
  return out;
}

/** Per slot, the saved man who is hurt and waiting to get it back (his
    fill-in plays there meanwhile), or null. */
export function gmLineupHeld<T>(sport: GmLineupSport<T>, team: T, choice: GmLineupChoice | undefined, key: string): (GmLineupMan | null)[] {
  const g = sport.groups.find(x => x.key === key);
  if (!g) return [];
  const slots = gmGroupSlots(sport, g, choice);
  const saved = savedSlots(sport, g, slots, choice);
  const skip = gmSkippedSlots(sport, g, choice);
  const men = sport.men(team);
  return slots.map((slot, i) => {
    const id = saved?.[i];
    const p = id && !skip.has(i) ? men.find(q => q.id === id) : undefined;
    return p && p.out > 0 && accepts(g, slot, p) ? p : null;
  });
}

export interface GmGroupReading {
  key: string;
  /** What today's formula reads here (absent on a group it does not read). */
  base?: number;
  /** Slot rating of the chosen lineup and of the sim's own. */
  mine: number;
  auto: number;
  /** What this group's choices add to or take off team strength. */
  delta: number;
}

/** Team strength for a lineup, group by group. See the header for the formula. */
export function gmLineupReading<T>(sport: GmLineupSport<T>, team: T, choice?: GmLineupChoice): { strength: number; base: number; groups: GmGroupReading[] } {
  const baseMen = sport.base(team);
  let base = 0;
  for (const g of sport.groups) if (g.counted > 0) base += gmGroupBase(g, baseMen[g.key] ?? []) * g.share;
  const auto = gmResolveLineup(sport, team);
  const mine = choice ? gmResolveLineup(sport, team, choice) : auto;
  let strength = base;
  const groups = sport.groups.map(g => {
    const a = gmGroupRich(g, gmGroupSlots(sport, g), auto[g.key]);
    const m = choice ? gmGroupRich(g, gmGroupSlots(sport, g, choice), mine[g.key]) : a;
    const delta = g.share * (m - a);
    strength += delta;
    return { key: g.key, base: g.counted > 0 ? gmGroupBase(g, baseMen[g.key] ?? []) : undefined, mine: m, auto: a, delta };
  });
  return { strength, base, groups };
}

/** Team strength for a lineup. With no choice it is today's strength exactly. */
export function gmLineupStrength<T>(sport: GmLineupSport<T>, team: T, choice?: GmLineupChoice): number {
  return gmLineupReading(sport, team, choice).strength;
}

/** A tap on the panel: a man by id, or an empty slot by its index. */
export type GmPick = { id: string } | { slot: number };

const clean = (choice: GmLineupChoice): GmLineupChoice => {
  const out: GmLineupChoice = {};
  if (choice.slots && Object.keys(choice.slots).length) out.slots = choice.slots;
  if (choice.schemes && Object.keys(choice.schemes).length) out.schemes = choice.schemes;
  if (choice.open && Object.keys(choice.open).length) out.open = choice.open;
  return out;
};

/* A group whose saved order reads exactly like the sim's own pick, with no
   slot skipped on purpose, is dropped, so it goes back to following the
   ratings (the Round 723 settleDepth rule). The sim's own pick with its hurt
   men holding their stand-ins' slots counts too: that is what a first tap
   saves, so a swap and a swap back still hand the group back. */
function settle<T>(sport: GmLineupSport<T>, team: T, choice: GmLineupChoice, key: string): GmLineupChoice {
  const ids = choice.slots?.[key];
  if (ids && !choice.open?.[key]?.length) {
    const auto = gmResolveLineup(sport, team, { schemes: choice.schemes })[key].map(p => p?.id ?? null);
    const same = (xs: (string | null)[]) => ids.length === xs.length && ids.every((id, i) => id === xs[i]);
    if (same(auto) || same(withHolds(sport, team, { schemes: choice.schemes }, key, auto, []))) {
      const slots = { ...choice.slots };
      delete slots[key];
      choice = { ...choice, slots };
    }
  }
  return clean(choice);
}

const withGroup = (choice: GmLineupChoice | undefined, key: string, ids: (string | null)[], skip?: Set<number>): GmLineupChoice => {
  const next: GmLineupChoice = { ...(choice ?? {}), slots: { ...(choice?.slots ?? {}), [key]: ids } };
  if (skip) {
    const open = { ...(choice?.open ?? {}) };
    if (skip.size) open[key] = [...skip].sort((a, b) => a - b); else delete open[key];
    next.open = open;
  }
  return next;
};

/* What a tap saves. `want` is the field the tap makes, man by man, and the
   save puts exactly that field out. A hurt man also holds a slot, his
   fill-in playing it until he is fit, but only where the hold changes
   nothing on that field now, which is checked by resolving it: a hole is
   filled by the best spare, so if the GM has just benched a better man the
   hole would bring him straight back, and that hold goes. Who holds what:
     a saved man who is hurt, the slot he is saved in, unless the tap moved
       a man into it, which hands it over (Round 723's swapDepth keeps hurt
       men in place the same way; building the save from the field alone
       handed the slot to the fill-in for good on any tap);
     on a first tap on a group nobody saved, where the sim's pick shuffles
       everyone up past a hurt man, each hurt man of the sim's full strength
       pick (sport.healed), heavier slot first, the slot of a stand-in, a man
       on the field only because somebody is hurt. Without this he came back
       on the bench. */
function withHolds<T>(sport: GmLineupSport<T>, team: T, choice: GmLineupChoice | undefined, key: string, want: (string | null)[], touched: number[], skip?: Set<number>): (string | null)[] {
  const g = sport.groups.find(x => x.key === key);
  if (!g) return want;
  const slots = gmGroupSlots(sport, g, choice);
  const field = (save: (string | null)[]) => gmResolveLineup(sport, team, withGroup(choice, key, save, skip))[key].map(p => p?.id ?? null);
  const heavier = (xs: number[]) => xs.sort((a, b) => slots[b].weight - slots[a].weight || a - b);
  const tries: { man: GmLineupMan; at: number[] }[] = [];
  if (savedSlots(sport, g, slots, choice)) {
    const held = gmLineupHeld(sport, team, choice, key);
    for (const i of heavier(held.flatMap((p, i) => (p && !touched.includes(i) ? [i] : [])))) tries.push({ man: held[i]!, at: [i] });
  } else if (sport.healed) {
    const full = sport.auto(sport.healed(team), g, slots).map(p => p?.id ?? null);
    const men = sport.men(team);
    const standIns = heavier(want.flatMap((id, i) => (id && !full.includes(id) && !skip?.has(i) ? [i] : [])));
    for (const i of heavier(full.flatMap((id, i) => (id && (men.find(p => p.id === id)?.out ?? 0) > 0 ? [i] : [])))) {
      tries.push({ man: men.find(p => p.id === full[i])!, at: standIns });
    }
  }
  if (!tries.length) return want;
  const target = field(want);
  let out = want;
  const taken = new Set<number>();
  for (const { man, at } of tries) {
    if (out.includes(man.id)) continue;
    const i = at.find(k => {
      if (taken.has(k) || !accepts(g, slots[k], man)) return false;
      const next = [...out];
      next[k] = man.id;
      return field(next).every((id, n) => id === target[n]);
    });
    if (i === undefined) continue;
    out = [...out];
    out[i] = man.id;
    taken.add(i);
  }
  return out;
}

/** Tap two to swap. Two men in the group trade slots; a spare takes a man's
    slot (or an empty one) and the man drops out. Refused (null) when a slot
    cannot take the man, the group is read off a depth chart, or nothing moves. */
export function gmLineupSwap<T>(sport: GmLineupSport<T>, team: T, choice: GmLineupChoice | undefined, key: string, a: GmPick, b: GmPick): GmLineupChoice | null {
  const g = sport.groups.find(x => x.key === key);
  if (!g || sport.chartOnly) return null;
  const slots = gmGroupSlots(sport, g, choice);
  const placed = gmResolveLineup(sport, team, choice)[key];
  const shown = placed.map(p => p?.id ?? null);
  const ids = [...shown];
  const pool = gmGroupPool(g, sport.men(team));
  const where = (x: GmPick): number => ('slot' in x ? (Number.isInteger(x.slot) && x.slot >= 0 && x.slot < slots.length ? x.slot : -2) : shown.indexOf(x.id));
  const ia = where(a), ib = where(b);
  if (ia === -2 || ib === -2 || (ia < 0 && ib < 0) || (ia >= 0 && ia === ib)) return null;
  /* A slot skipped on purpose is filled again with its own button, not by a
     swap. Moving a man into a slot a hurt man is holding hands it over. */
  const skip = gmSkippedSlots(sport, g, choice);
  if ((ia >= 0 && skip.has(ia)) || (ib >= 0 && skip.has(ib))) return null;
  let touched: number[];
  if (ia >= 0 && ib >= 0) {
    const pa = placed[ia], pb = placed[ib];
    if ((pa && !accepts(g, slots[ib], pa)) || (pb && !accepts(g, slots[ia], pb))) return null;
    [ids[ia], ids[ib]] = [shown[ib], shown[ia]];
    touched = [ia, ib];
  } else {
    const at = ia >= 0 ? ia : ib;
    const incoming = (ia >= 0 ? b : a) as { id: string };
    const man = pool.find(p => p.id === incoming.id);
    if (!man || !accepts(g, slots[at], man)) return null;
    ids[at] = man.id;
    touched = [at];
  }
  return settle(sport, team, withGroup(choice, key, withHolds(sport, team, choice, key, ids, touched)), key);
}

/** Leave a rotation's optional trailing slot empty on purpose, or take the
    skip back off. Refused when the slot already reads that way, or when
    there is nobody to leave out (a slot empty for want of a healthy man is
    not a skip, and skipping it would change nothing). */
export function gmLineupSetOpen<T>(sport: GmLineupSport<T>, team: T, choice: GmLineupChoice | undefined, key: string, slot: number, open: boolean): GmLineupChoice | null {
  const g = sport.groups.find(x => x.key === key);
  if (!g?.rotation || sport.chartOnly || slot < g.slots.length - g.rotation.optional || slot >= g.slots.length) return null;
  const placed = gmResolveLineup(sport, team, choice)[key];
  const ids = placed.map(p => p?.id ?? null);
  const skip = new Set(gmSkippedSlots(sport, g, choice));
  if (open === skip.has(slot) || (open && placed[slot] === null)) return null;
  if (open) { ids[slot] = null; skip.add(slot); }
  else {
    skip.delete(slot);
    /* The best spare, or nobody yet: the slot then fills when a man is fit. */
    const slots = gmGroupSlots(sport, g, choice);
    const man = gmGroupPool(g, sport.men(team)).filter(p => !ids.includes(p.id) && accepts(g, slots[slot], p)).sort((x, y) => y.ovr - x.ovr)[0];
    ids[slot] = man ? man.id : null;
  }
  return settle(sport, team, withGroup(choice, key, withHolds(sport, team, choice, key, ids, [slot], skip), skip), key);
}

/** Switch a group to one of its schemes. The default scheme is not saved.
    The men saved for the old shape go with it: the new shape opens on the
    sim's own pick. */
export function gmLineupSetScheme<T>(sport: GmLineupSport<T>, choice: GmLineupChoice | undefined, key: string, scheme: string): GmLineupChoice | null {
  const offered = sport.schemes?.[key];
  if (!offered?.some(s => s.key === scheme)) return null;
  const current = choice?.schemes?.[key] ?? offered[0].key;
  if (current === scheme) return null;
  const next = gmLineupReset(choice, key);
  const schemes = { ...(choice?.schemes ?? {}) };
  if (scheme === offered[0].key) delete schemes[key]; else schemes[key] = scheme;
  return clean({ ...next, schemes });
}

/** Hand a group back to the sim: its own pick and its default scheme. */
export function gmLineupReset(choice: GmLineupChoice | undefined, key: string): GmLineupChoice {
  const slots = { ...(choice?.slots ?? {}) };
  const schemes = { ...(choice?.schemes ?? {}) };
  const open = { ...(choice?.open ?? {}) };
  delete slots[key];
  delete schemes[key];
  delete open[key];
  return clean({ slots, schemes, open });
}

/** Read a saved choice back. Anything malformed in one group drops that
    group alone; a save from before this round has none and reads as {}. */
export function gmSanitizeLineupChoice<T>(sport: GmLineupSport<T>, raw: unknown): GmLineupChoice {
  const out: GmLineupChoice = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const r = raw as { slots?: unknown; schemes?: unknown; open?: unknown };
  const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null);
  const slots = record(r.slots);
  const schemes = record(r.schemes);
  const open = record(r.open);
  for (const g of sport.groups) {
    const scheme = schemes?.[g.key];
    if (typeof scheme === 'string' && sport.schemes?.[g.key]?.some(s => s.key === scheme)) (out.schemes ??= {})[g.key] = scheme;
    /* The slots are checked against the shape the group is saved under. */
    const length = gmGroupSlots(sport, g, out).length;
    const saved = slots?.[g.key];
    if (sport.chartOnly || !savedShape(saved, length)) continue;
    (out.slots ??= {})[g.key] = [...saved];
    const marks = open?.[g.key];
    if (!g.rotation || !Array.isArray(marks)) continue;
    const first = length - g.rotation.optional;
    const valid = marks.every(i => Number.isInteger(i) && i >= first && i < length) && new Set(marks).size === marks.length;
    if (valid && marks.length) (out.open ??= {})[g.key] = [...marks] as number[];
  }
  return out;
}
