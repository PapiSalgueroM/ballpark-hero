/* ─── Soccer Career: the deep attribute layer (Round 131) ───

   His words: "Idk if there should be more attributes to a player. Like height
   and weight and many many more stats that are important to a soccer player."

   What was there before this file: seven numbers, pace shooting passing
   dribbling defending physical reflexes. Six of them averaged into your
   overall, and NOTHING else in the game ever read them again. Goals came from
   position plus overall. Appearances came from overall, club tier and age.
   Season rating came from overall against the club's average. So a striker
   who put every spare point into finishing and a striker who put it all into
   strength were, to the engine, the same striker.

   The rule this file is built on: an attribute that changes nothing should not
   exist. So every attribute below either moves a number the season simulation
   reads, or it is not here.

   HOW IT IS SHAPED, and why it costs almost nothing on the save.

   The six families stay exactly as they were and still make the overall, so
   nothing about the allocator, the ceiling or the overall maths moves. Under
   each family sit the specifics a football person would actually name, and a
   specific is stored as an OFFSET from its family, never as its own number.
   Offsets inside one family always add to zero, so the family average is
   untouched, so your overall cannot drift no matter how you shape it. A
   career therefore carries a handful of small integers instead of two dozen
   full attributes, and a save that never touched the shaping screen carries
   nothing at all.

   Height and weight sit on top of that as physical modifiers. A tall heavy
   player really is better in the air and slower off the mark, and here that is
   arithmetic rather than flavour text.

   Everything reads through defaults, so a save written before this round has
   no physique, no shape, and comes out exactly as it went in. */

import type { AllocKey } from "./careerEras";

/* ─── Physique ─── */

export interface PlayerPhysique {
  heightCm: number;
  weightKg: number;
}

export const HEIGHT_MIN = 155;
export const HEIGHT_MAX = 210;
export const WEIGHT_MIN = 50;
export const WEIGHT_MAX = 110;

/** How far a single specific can be pushed away from its family. */
export const SHAPE_MAX = 12;

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** A sane starting frame for each position, which doubles as the reference the
    performance maths measures you against. Accept every default and you get a
    completely neutral player, at any overall, in any position. */
const DEFAULT_PHYSIQUE: Record<string, PlayerPhysique> = {
  GK: { heightCm: 190, weightKg: 84 },
  CB: { heightCm: 187, weightKg: 82 },
  LB: { heightCm: 178, weightKg: 73 },
  RB: { heightCm: 178, weightKg: 73 },
  CDM: { heightCm: 183, weightKg: 78 },
  CM: { heightCm: 180, weightKg: 75 },
  CAM: { heightCm: 176, weightKg: 71 },
  LW: { heightCm: 175, weightKg: 70 },
  RW: { heightCm: 175, weightKg: 70 },
  ST: { heightCm: 183, weightKg: 78 },
};

export function defaultPhysique(position: string): PlayerPhysique {
  const d = DEFAULT_PHYSIQUE[position] || { heightCm: 180, weightKg: 76 };
  return { ...d };
}

/** Never trusts what it is handed. Old saves, hand edited saves and half typed
    numbers all come out as a legal frame. */
export function safePhysique(position: string, p?: PlayerPhysique | null): PlayerPhysique {
  const d = defaultPhysique(position);
  const h = Number(p?.heightCm);
  const w = Number(p?.weightKg);
  return {
    heightCm: Number.isFinite(h) ? Math.round(clampNum(h, HEIGHT_MIN, HEIGHT_MAX)) : d.heightCm,
    weightKg: Number.isFinite(w) ? Math.round(clampNum(w, WEIGHT_MIN, WEIGHT_MAX)) : d.weightKg,
  };
}

/** Feet and inches alongside the centimetres, because most of the people
    playing this think in feet. */
export function heightLabel(cm: number): string {
  const totalIn = Math.round(cm / 2.54);
  return `${cm} cm (${Math.floor(totalIn / 12)}'${totalIn % 12}")`;
}

export function weightLabel(kg: number): string {
  return `${kg} kg (${Math.round(kg * 2.2046)} lb)`;
}

/** Rough build read out, the thing a scout would say in one word. */
export function buildLabel(p: PlayerPhysique): string {
  const bmi = p.weightKg / Math.pow(p.heightCm / 100, 2);
  const tall = p.heightCm >= 190 ? "Towering" : p.heightCm >= 183 ? "Tall" : p.heightCm >= 174 ? "Average height" : "Short";
  const frame = bmi >= 25.5 ? "powerful" : bmi >= 23 ? "solid" : bmi >= 21 ? "lean" : "wiry";
  return `${tall}, ${frame}`;
}

/* ─── The attribute tree ─── */

export interface AttrDef {
  id: string;
  label: string;
  /** how much this attribute moves per cm above 180 */
  perCm?: number;
  /** how much this attribute moves per kg above 76 */
  perKg?: number;
  /** plain english for what it does, shown on the detail screen */
  does: string;
}

export interface AttrFamily {
  key: AllocKey;
  label: string;
  children: AttrDef[];
}

const OUTFIELD_TREE: AttrFamily[] = [
  {
    key: "pace", label: "Pace", children: [
      { id: "acceleration", label: "Acceleration", perCm: -0.20, perKg: -0.34, does: "The first three yards. Getting away from a defender who is already touching you" },
      { id: "sprint_speed", label: "Sprint Speed", perCm: 0.10, perKg: -0.18, does: "Top end over forty yards, once you are already moving" },
    ],
  },
  {
    key: "shooting", label: "Shooting", children: [
      { id: "finishing", label: "Finishing", does: "One touch inside the box, the chances that decide seasons" },
      { id: "shot_power", label: "Shot Power", perKg: 0.14, perCm: 0.06, does: "How hard you hit it, and whether a keeper can hold it" },
      { id: "long_shots", label: "Long Shots", does: "Anything from outside the area" },
      { id: "heading", label: "Heading", perCm: 0.36, perKg: 0.12, does: "Attacking headers from crosses and set pieces" },
      { id: "penalties", label: "Penalties", does: "From twelve yards, and in a shootout" },
    ],
  },
  {
    key: "passing", label: "Passing", children: [
      { id: "vision", label: "Vision", does: "Seeing the pass nobody else in the stadium saw" },
      { id: "short_pass", label: "Short Passing", does: "Keeping the ball under pressure in tight areas" },
      { id: "crossing", label: "Crossing", does: "Delivery from wide, both feet, both heights" },
      { id: "long_pass", label: "Long Passing", does: "Switching play, and the ball over the top" },
      { id: "free_kicks", label: "Free Kicks", does: "Dead ball delivery and the ones you shoot yourself" },
    ],
  },
  {
    key: "dribbling", label: "Dribbling", children: [
      { id: "ball_control", label: "Ball Control", perCm: -0.06, does: "First touch, and whether the ball sticks when it arrives fast" },
      { id: "agility", label: "Agility", perCm: -0.30, perKg: -0.22, does: "Turning, changing direction, getting out of a crowd" },
      { id: "balance", label: "Balance", perCm: -0.12, perKg: 0.16, does: "Staying on your feet when somebody leans on you" },
      { id: "flair", label: "Flair", does: "The trick nobody asked for that comes off anyway" },
    ],
  },
  {
    key: "defending", label: "Defending", children: [
      { id: "marking", label: "Marking", perCm: 0.10, does: "Staying with a man for ninety minutes" },
      { id: "tackling", label: "Tackling", perKg: 0.10, does: "Winning the ball cleanly, standing up and going to ground" },
      { id: "interceptions", label: "Interceptions", perCm: 0.08, does: "Reading the pass before it is played and stepping in front" },
      { id: "reading", label: "Reading The Game", does: "Where to be before anything happens" },
    ],
  },
  {
    key: "physical", label: "Physical", children: [
      { id: "strength", label: "Strength", perCm: 0.16, perKg: 0.46, does: "Holding the ball up and winning the shoulder to shoulder stuff" },
      { id: "stamina", label: "Stamina", perKg: -0.22, does: "Still running in the ninetieth minute, and playing every week" },
      { id: "aggression", label: "Aggression", perKg: 0.10, does: "How hard you go into a challenge you might not win" },
      { id: "jumping", label: "Jumping", perCm: 0.26, perKg: -0.10, does: "How high you get off the floor, which is not the same as being tall" },
    ],
  },
];

const GK_TREE: AttrFamily[] = [
  {
    key: "reflexes", label: "Reflexes", children: [
      { id: "gk_reflex", label: "Shot Reflexes", perCm: -0.10, does: "The save nobody had time to think about" },
      { id: "gk_recovery", label: "Recovery Saves", perCm: -0.12, does: "Getting back up and stopping the rebound" },
    ],
  },
  {
    key: "shooting", label: "Shot Stopping", children: [
      { id: "gk_one_v_one", label: "One On Ones", perCm: 0.10, does: "A striker through on goal with only you to beat" },
      { id: "gk_long_range", label: "Long Range", does: "Everything struck from outside the box" },
    ],
  },
  {
    key: "defending", label: "Positioning", children: [
      { id: "gk_angles", label: "Angles", perCm: 0.16, does: "Making the goal look small before the shot is hit" },
      { id: "gk_reading", label: "Reading The Game", does: "Knowing where the ball is going before it goes there" },
    ],
  },
  {
    key: "physical", label: "Aerial Command", children: [
      { id: "gk_crosses", label: "Claiming Crosses", perCm: 0.30, perKg: 0.10, does: "Coming and taking it in a crowded six yard box" },
      { id: "gk_punching", label: "Punching", perKg: 0.20, does: "Clearing the danger when catching it is not on" },
    ],
  },
  {
    key: "passing", label: "Distribution", children: [
      { id: "gk_throwing", label: "Throwing", perKg: 0.16, does: "Starting a counter attack with your hands" },
      { id: "gk_kicking", label: "Kicking", does: "Playing out from the back and finding a man long" },
    ],
  },
  {
    key: "dribbling", label: "Penalty Saving", children: [
      { id: "gk_pen_read", label: "Reading The Penalty", does: "Picking the corner before he strikes it" },
      { id: "gk_nerve", label: "Shootout Nerve", does: "The fifth kick of a shootout, in front of their end" },
    ],
  },
  {
    key: "pace", label: "Sweeping Speed", children: [
      { id: "gk_rush", label: "Rushing Out", perKg: -0.24, does: "Beating a striker to a through ball outside your area" },
      { id: "gk_recovery_pace", label: "Recovery Pace", perCm: -0.12, perKg: -0.28, does: "Getting back when the ball goes over your head" },
    ],
  },
];

export function attrTreeFor(position: string): AttrFamily[] {
  return position === "GK" ? GK_TREE : OUTFIELD_TREE;
}

export function allAttrDefs(position: string): AttrDef[] {
  return attrTreeFor(position).flatMap(f => f.children);
}

/** Every attribute id this game knows about, both trees, for save repair. */
export const ALL_ATTR_IDS: string[] = [
  ...OUTFIELD_TREE.flatMap(f => f.children.map(c => c.id)),
  ...GK_TREE.flatMap(f => f.children.map(c => c.id)),
];

/* ─── Shape: the offsets that make two identical overalls play differently ─── */

export type AttrShape = Record<string, number>;

/** Legal, finite, in range, no unknown keys, and every family adds to zero.
    Anything that fails is dropped rather than repaired into nonsense, because
    a broken shape must never be able to move an overall. */
export function safeShape(position: string, raw?: AttrShape | null): AttrShape {
  const out: AttrShape = {};
  if (!raw || typeof raw !== "object") return out;
  for (const fam of attrTreeFor(position)) {
    const vals: number[] = [];
    for (const c of fam.children) {
      const v = Number((raw as any)[c.id]);
      vals.push(Number.isFinite(v) ? Math.round(clampNum(v, -SHAPE_MAX, SHAPE_MAX)) : 0);
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum !== 0) continue; // a family that does not balance is ignored entirely
    fam.children.forEach((c, i) => { if (vals[i] !== 0) out[c.id] = vals[i]; });
  }
  return out;
}

/* ─── Round 131: the one rule for shaping a family ───

   Raising a specific takes the points off its siblings on the spot, spread as
   evenly as they will take it. That means a family can never be left
   unbalanced, which in turn means shaping a player can never move his overall,
   which is the invariant this whole layer rests on. It lives here rather than
   inside the build screen so the harness can hammer it directly. */
export function applyFamilyOffset(
  position: string, shape: AttrShape, familyKey: string, id: string, next: number,
): AttrShape {
  const fam = attrTreeFor(position).find(f => f.key === familyKey);
  if (!fam || !fam.children.some(c => c.id === id)) return shape;
  const base = safeShape(position, shape);
  const cur = base[id] ?? 0;
  const raw = Math.round(Number(next));
  if (!Number.isFinite(raw)) return base;
  const want = clampNum(raw, -SHAPE_MAX, SHAPE_MAX);
  let delta = want - cur;
  if (delta === 0) return base;

  const others = fam.children.filter(c => c.id !== id).map(c => c.id);
  const vals: Record<string, number> = {};
  for (const o of others) vals[o] = base[o] ?? 0;
  const capacity = delta > 0
    ? others.reduce((a, o) => a + (vals[o] + SHAPE_MAX), 0)
    : others.reduce((a, o) => a + (SHAPE_MAX - vals[o]), 0);
  if (Math.abs(delta) > capacity) delta = Math.sign(delta) * capacity;
  if (delta === 0) return base;

  let remaining = Math.abs(delta);
  const step = delta > 0 ? -1 : 1;
  let guard = 0;
  while (remaining > 0 && guard < 500) {
    guard++;
    let moved = false;
    for (const o of others) {
      if (remaining <= 0) break;
      const nv = vals[o] + step;
      if (nv < -SHAPE_MAX || nv > SHAPE_MAX) continue;
      vals[o] = nv;
      remaining--;
      moved = true;
    }
    if (!moved) break;
  }
  const applied = delta - remaining * Math.sign(delta);
  const out: AttrShape = { ...base, [id]: cur + applied };
  for (const o of others) out[o] = vals[o];
  for (const c of fam.children) if (out[c.id] === 0) delete out[c.id];
  return safeShape(position, out);
}

/* ─── Derivation: family + shape + frame = the number you see ─── */

type StatLine = { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number };

export interface DerivedAttr {
  id: string;
  label: string;
  value: number;
  family: AllocKey;
  familyLabel: string;
  does: string;
  /** what the frame did to this one, so the physique screen can show its work */
  frameDelta: number;
}

function frameDelta(def: AttrDef, phys: PlayerPhysique): number {
  const dh = phys.heightCm - 180;
  const dw = phys.weightKg - 76;
  return (def.perCm || 0) * dh + (def.perKg || 0) * dw;
}

export function deriveAttributes(
  stats: StatLine,
  position: string,
  physique?: PlayerPhysique | null,
  shape?: AttrShape | null,
): DerivedAttr[] {
  const phys = safePhysique(position, physique);
  const sh = safeShape(position, shape);
  const out: DerivedAttr[] = [];
  for (const fam of attrTreeFor(position)) {
    const base = Number((stats as any)[fam.key]) || 0;
    for (const c of fam.children) {
      const fd = frameDelta(c, phys);
      out.push({
        id: c.id,
        label: c.label,
        family: fam.key,
        familyLabel: fam.label,
        does: c.does,
        frameDelta: Math.round(fd),
        value: Math.round(clampNum(base + (sh[c.id] || 0) + fd, 1, 99)),
      });
    }
  }
  return out;
}

export function deriveMap(
  stats: StatLine,
  position: string,
  physique?: PlayerPhysique | null,
  shape?: AttrShape | null,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const a of deriveAttributes(stats, position, physique, shape)) m[a.id] = a.value;
  return m;
}

/* ─── The reference player ───

   Every multiplier below is measured against the player you would get if you
   changed nothing: the position's normal stat spread at your overall, no
   shaping, the position's default frame. That is what keeps this safe to bolt
   onto a game that was balanced without it. A player who taps Begin Career
   straight after rolling comes out at exactly 1.00 on every multiplier, at any
   overall, in any position, so nothing that was tuned before this round moves
   unless the player deliberately moved it. */

/** Position stat spread, the same table the creation screen builds from.
    Order: pace, shooting, passing, dribbling, defending, physical, reflexes. */
export const POSITION_OFFSETS: Record<string, number[]> = {
  ST: [+5, +8, -3, +2, -10, +3, -5],
  LW: [+8, +3, 0, +6, -10, -2, -5],
  RW: [+8, +3, 0, +6, -10, -2, -5],
  CAM: [+2, +3, +6, +6, -12, 0, -5],
  CM: [-4, -3, +6, +3, 0, +3, -5],
  CDM: [-1, -8, +3, -3, +8, +6, -5],
  CB: [-2, -10, 0, -6, +10, +8, 0],
  LB: [+5, -8, +3, -4, +6, +2, -4],
  RB: [+5, -8, +3, -4, +6, +2, -4],
  GK: [-4, -14, 0, -8, 0, +4, +12],
};

const STAT_KEYS: (keyof StatLine)[] = ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"];

export function referenceLine(position: string, overall: number): StatLine {
  const o = POSITION_OFFSETS[position] || [0, 0, 0, 0, 0, 0, 0];
  const line: any = {};
  STAT_KEYS.forEach((k, i) => { line[k] = clampNum(overall + o[i], 25, 99); });
  return line as StatLine;
}

/* ─── The scores the season simulation actually reads ─── */

type Weights = Record<string, number>;

const ATTACK_W: Weights = { finishing: 0.42, shot_power: 0.16, long_shots: 0.12, heading: 0.16, acceleration: 0.14 };
const CREATIVE_W: Weights = { vision: 0.30, short_pass: 0.22, crossing: 0.20, long_pass: 0.18, agility: 0.10 };
const AVAIL_W: Weights = { stamina: 0.45, strength: 0.30, balance: 0.15, jumping: 0.10 };
const DEFENCE_W: Weights = { marking: 0.30, tackling: 0.28, interceptions: 0.22, reading: 0.12, heading: 0.08 };
const KEEPER_W: Weights = { gk_reflex: 0.30, gk_recovery: 0.14, gk_one_v_one: 0.16, gk_long_range: 0.10, gk_angles: 0.14, gk_reading: 0.08, gk_crosses: 0.08 };
const GK_AVAIL_W: Weights = { gk_rush: 0.4, gk_recovery_pace: 0.3, gk_punching: 0.3 };

function score(map: Record<string, number>, w: Weights): number {
  let total = 0;
  for (const k in w) total += (map[k] ?? 0) * w[k];
  return total;
}

export interface BuildEffects {
  /** goals scale, 1.00 means the build changed nothing */
  goalMult: number;
  assistMult: number;
  appsMult: number;
  cleanSheetMult: number;
  /** added straight onto the season rating */
  ratingDelta: number;
  /** added onto the season injury chance, negative is safer */
  injuryDelta: number;
  /** the raw deltas, for the screens that explain themselves */
  attackDelta: number;
  creativeDelta: number;
  availDelta: number;
  defenceDelta: number;
  keeperDelta: number;
}

export const NEUTRAL_EFFECTS: BuildEffects = {
  goalMult: 1, assistMult: 1, appsMult: 1, cleanSheetMult: 1, ratingDelta: 0, injuryDelta: 0,
  attackDelta: 0, creativeDelta: 0, availDelta: 0, defenceDelta: 0, keeperDelta: 0,
};

export function buildEffects(
  stats: StatLine,
  position: string,
  overall: number,
  physique?: PlayerPhysique | null,
  shape?: AttrShape | null,
): BuildEffects {
  const isGK = position === "GK";
  const mine = deriveMap(stats, position, physique, shape);
  const ref = deriveMap(referenceLine(position, overall), position, null, null);

  if (isGK) {
    const keeperDelta = score(mine, KEEPER_W) - score(ref, KEEPER_W);
    const availDelta = score(mine, GK_AVAIL_W) - score(ref, GK_AVAIL_W);
    return {
      goalMult: 1,
      assistMult: 1,
      appsMult: clampNum(1 + availDelta * 0.0080, 0.89, 1.11),
      cleanSheetMult: clampNum(1 + keeperDelta * 0.020, 0.72, 1.30),
      ratingDelta: clampNum(keeperDelta * 0.012, -0.30, 0.30),
      injuryDelta: clampNum(-availDelta * 0.0020, -0.04, 0.04),
      attackDelta: 0, creativeDelta: 0, availDelta, defenceDelta: 0, keeperDelta,
    };
  }

  const attackDelta = score(mine, ATTACK_W) - score(ref, ATTACK_W);
  const creativeDelta = score(mine, CREATIVE_W) - score(ref, CREATIVE_W);
  const availDelta = score(mine, AVAIL_W) - score(ref, AVAIL_W);
  const defenceDelta = score(mine, DEFENCE_W) - score(ref, DEFENCE_W);

  /* Which score decides how well your season reads depends on what you are
     paid to do. A centre back having a great year is not a centre back who
     scored, and a ten having a great year is not a ten who tackled. */
  const ratingSource = ["ST", "LW", "RW"].includes(position) ? attackDelta
    : ["CAM", "CM"].includes(position) ? (creativeDelta * 0.6 + attackDelta * 0.4)
    : ["CDM"].includes(position) ? (defenceDelta * 0.6 + creativeDelta * 0.4)
    : defenceDelta;

  return {
    goalMult: clampNum(1 + attackDelta * 0.030, 0.62, 1.42),
    assistMult: clampNum(1 + creativeDelta * 0.028, 0.64, 1.40),
    appsMult: clampNum(1 + availDelta * 0.0080, 0.89, 1.11),
    cleanSheetMult: 1,
    ratingDelta: clampNum(ratingSource * 0.012, -0.30, 0.30),
    injuryDelta: clampNum(-availDelta * 0.0020, -0.04, 0.04),
    attackDelta, creativeDelta, availDelta, defenceDelta, keeperDelta: 0,
  };
}

/** One line of plain english about what the build is doing to the career,
    shown live on the build screen so nobody has to guess. */
export function effectsSummary(fx: BuildEffects, position: string): string[] {
  const pct = (m: number) => `${m >= 1 ? "+" : ""}${Math.round((m - 1) * 100)}%`;
  const lines: string[] = [];
  if (position === "GK") {
    if (Math.abs(fx.cleanSheetMult - 1) >= 0.02) lines.push(`${pct(fx.cleanSheetMult)} clean sheets`);
  } else {
    if (Math.abs(fx.goalMult - 1) >= 0.02) lines.push(`${pct(fx.goalMult)} goals`);
    if (Math.abs(fx.assistMult - 1) >= 0.02) lines.push(`${pct(fx.assistMult)} assists`);
  }
  if (Math.abs(fx.appsMult - 1) >= 0.01) lines.push(`${pct(fx.appsMult)} games played`);
  if (Math.abs(fx.ratingDelta) >= 0.03) lines.push(`${fx.ratingDelta > 0 ? "+" : ""}${fx.ratingDelta.toFixed(2)} season rating`);
  if (Math.abs(fx.injuryDelta) >= 0.005) lines.push(`${fx.injuryDelta > 0 ? "+" : ""}${Math.round(fx.injuryDelta * 100)}% injury risk`);
  if (lines.length === 0) lines.push("Dead average, exactly what a scout expects from this position");
  return lines;
}
