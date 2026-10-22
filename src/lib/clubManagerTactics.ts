/**
 * Round 1522: Club Manager's team instructions, the other dugout's style, and what both do to a match.
 *
 * A player's report on /club-manager, 2026-10-21: "plss make the game be soooo much more tactical". Until this
 * round a manager had a formation, duties, a mentality, positions and set pieces. Now there are four standing
 * instructions beside the mentality, three settings each: pressing, tempo, width and the defensive line.
 *
 * BALANCED ON ALL FOUR IS THE GAME AS IT WAS, TO THE BYTE. Every reader in the engine asks isBalanced first and
 * takes an early return, so a career that never touches these plays, saves and draws exactly as before. A save
 * only carries `instructions` while at least one is off balanced.
 *
 * EVERY SETTING HAS A COST. The numbers are lambda boosts in MENT_MOD's convention (atk goes on my side's goal
 * rate, def on theirs, so a positive def means we concede more), and they are small next to a mentality step
 * (attacking is atk 0.42, def 0.34). What each setting reads, besides itself:
 *   pressing  the eleven's legs (fitness at kick off scales what a press wins), the half (a press tires the side
 *             in the second), the other side's tempo (a direct side goes long over a press)
 *   tempo     the other side's line (direct balls want space behind) and press (patient play gets caught out by
 *             a press), and the duties up front (a target man or a poacher suits direct, playmakers suit patient)
 *   width     the wide duties (wingers and attacking full backs) or the central ones (inside forwards,
 *             playmakers, creators), and the other side's width
 *   line      the other side's tempo (a high line against a direct side is asking for it) and my own press (a
 *             high line with nobody pressing the ball, or a press in front of a deep line, leaves a gap)
 * The table and its measured effects are in scripts/simCmTactics.mjs's header.
 *
 * THE OTHER DUGOUT. Every AI club plays a style (AI_STYLES), drawn from a stream keyed to the club's name and
 * read against its strength, never from the game's own stream: a strong side presses and keeps the ball more,
 * a weak one sits in and goes direct. Their style only matters through yours: with you on balanced it changes
 * nothing, because the whole league was tuned against balanced football.
 *
 * LOADING: the engine never imports this file. It carries clubManagerTacticsCore.ts (the types, balanced, a saved
 * value read back, and a slot), and this module fills that slot as it loads (the last lines below), so the page
 * budget of Club Manager and of the two dailies that load its engine does not carry the table, the words and the
 * styles. This module imports the engine at run time, which is safe: the engine is already loaded by then and
 * does not import this back. Nothing here draws from Math.random.
 */
import { FORMATIONS, dutyOptions, liveDutyAt, liveInstructions, strengthOf, worldYear } from '@/lib/clubManager';
import type { CareerState, Duty, LiveChange, LiveMatch, MyFixture, XiSlot } from '@/lib/clubManager';
import { carryShape } from '@/lib/clubManagerCarry';
import { keyedRng } from '@/lib/keyedRng';
import {
  BALANCED, INSTRUCTION_KEYS, isBalanced, readInstructions, setTacticsImpl,
  type AiStyleId, type InstructionKey, type InstructionStep, type Setting, type TacticStats, type TeamInstructions,
} from '@/lib/clubManagerTacticsCore';

export { BALANCED, INSTRUCTION_KEYS, isBalanced, readInstructions, logEverSet } from '@/lib/clubManagerTacticsCore';
export type { AiStyleId, InstructionKey, InstructionStep, Setting, TacticStats, TeamInstructions } from '@/lib/clubManagerTacticsCore';

/** What the tactics screen and the help say about each setting: one plain line on what it does, one on what it costs. */
export interface SettingInfo { label: string; does: string; costs: string; }
export const INSTRUCTION_INFO: Record<InstructionKey, { label: string; options: Record<'-1' | '0' | '1', SettingInfo> }> = {
  press: {
    label: 'Pressing',
    options: {
      '-1': { label: 'Stand off', does: 'Let them have it in their half and stay compact.', costs: 'You win it back deep and see less of the ball.' },
      '0': { label: 'Balanced', does: 'Press when the moment is right.', costs: 'Nothing extra either way.' },
      '1': { label: 'High press', does: 'Hunt the ball in their half and win it high.', costs: 'Tires the side: late goals, knocks, heavy legs next week. A direct side goes over it.' },
    },
  },
  tempo: {
    label: 'Tempo',
    options: {
      '-1': { label: 'Patient', does: 'Keep the ball and work the opening.', costs: 'More shots but worse ones, and a pressing side punishes a loose pass.' },
      '0': { label: 'Balanced', does: 'Mix it up.', costs: 'Nothing extra either way.' },
      '1': { label: 'Direct', does: 'Get it forward fast, in behind if they leave space.', costs: 'Less of the ball and fewer shots. Against a deep line there is no space to hit.' },
    },
  },
  width: {
    label: 'Width',
    options: {
      '-1': { label: 'Narrow', does: 'Crowd the middle and play through it.', costs: 'Fewer crosses, and a wide side gets at your full backs.' },
      '0': { label: 'Balanced', does: 'Use the whole pitch.', costs: 'Nothing extra either way.' },
      '1': { label: 'Wide', does: 'Stretch them and get crosses in. Suits wingers and attacking full backs.', costs: 'Leaves the middle thinner.' },
    },
  },
  line: {
    label: 'Defensive line',
    options: {
      '-1': { label: 'Deep', does: 'Sit in and give them nothing in behind.', costs: 'Less territory, fewer chances, and a patient side camps outside your box.' },
      '0': { label: 'Balanced', does: 'Hold a normal line.', costs: 'Nothing extra either way.' },
      '1': { label: 'High', does: 'Squeeze the pitch, catch them offside, win territory.', costs: 'Space in behind: more goals conceded on the break, worst against a direct side.' },
    },
  },
};

/** The words for one setting of one instruction. */
export const settingLabel = (k: InstructionKey, v: Setting): string => INSTRUCTION_INFO[k].options[String(v) as '-1' | '0' | '1'].label;

/** A set in a few words for a folded tile: the settings off balanced, or "Balanced on all four". */
export function instructionsSummary(i: TeamInstructions): string {
  const on = INSTRUCTION_KEYS.filter(k => i[k] !== 0).map(k => (k === 'line' ? `${settingLabel(k, i[k])} line` : settingLabel(k, i[k])));
  return on.length ? on.join(', ') : 'Balanced on all four';
}

/* ---------- the other dugout's style ---------- */

/* AiStyleId lives in clubManagerTacticsCore.ts (the engine's types), re-exported above. */

export interface AiStyle {
  label: string; emoji: string;
  /** What they do, for the match preview. */
  blurb: string;
  /** What tends to work against it, in a manager's words, for the preview's second line. */
  read: string;
  /** The style as four settings: the half of the match my instructions are read against. */
  instructions: TeamInstructions;
  /** Its weight in the draw: base plus slope times the club's strength read (z, -1 weak to 1 strong). */
  base: number; slope: number;
}

export const AI_STYLES: Record<AiStyleId, AiStyle> = {
  gegenpress: { label: 'Gegenpress', emoji: '⚡', blurb: 'They press high and hit you quickly when they win it.', read: 'Go direct over the press. A patient build up feeds it.', instructions: { press: 1, tempo: 1, width: 0, line: 1 }, base: 0.10, slope: 0.08 },
  possession: { label: 'Possession', emoji: '🔄', blurb: 'They keep the ball, press to get it back and hold a high line.', read: 'Direct balls in behind that line. Pressing them back can pay.', instructions: { press: 1, tempo: -1, width: 0, line: 1 }, base: 0.12, slope: 0.10 },
  patient: { label: 'Patient build up', emoji: '🧩', blurb: 'They pass it round and wait for the gap.', read: 'Press them. Sitting deep only invites them on.', instructions: { press: 0, tempo: -1, width: 0, line: 0 }, base: 0.12, slope: 0.02 },
  wingplay: { label: 'Wing play', emoji: '🪽', blurb: 'Everything goes wide and into the box.', read: 'Do not go narrow against it: your full backs get overrun.', instructions: { press: 0, tempo: 0, width: 1, line: 0 }, base: 0.14, slope: 0 },
  direct: { label: 'Direct', emoji: '🎯', blurb: 'Long and wide, early balls, no messing about.', read: 'Keep your line deep and do not press into it.', instructions: { press: 0, tempo: 1, width: 1, line: 0 }, base: 0.12, slope: -0.04 },
  counter: { label: 'Counter attack', emoji: '🗡️', blurb: 'They sit deep and break fast.', read: 'A high line is asking for trouble. Sit deeper and be patient.', instructions: { press: -1, tempo: 1, width: 0, line: -1 }, base: 0.12, slope: -0.06 },
  lowblock: { label: 'Low block', emoji: '🚌', blurb: 'Two banks, no gaps, happy with a point.', read: 'Be patient, and go wide if you have the wingers. There is no space in behind to hit.', instructions: { press: -1, tempo: 0, width: -1, line: -1 }, base: 0.10, slope: -0.08 },
  balanced: { label: 'Balanced', emoji: '⚖️', blurb: 'No extremes. They play what the afternoon asks for.', read: 'Nothing special to exploit. Play your own game.', instructions: { ...BALANCED }, base: 0.18, slope: 0 },
};

export const AI_STYLE_IDS = Object.keys(AI_STYLES) as AiStyleId[];

/** A club's strength read as -1 (weak) to 1 (strong), the scale the style weights lean on. */
export const styleStrengthRead = (strength: number): number => Math.max(-1, Math.min(1, (strength - 72) / 10));

/**
 * The style a club plays, from a stream keyed to its name (one roll, the same forever) read against its strength:
 * the roll stays, so a club only changes style when its strength moves it across a weight. Never Math.random.
 */
export function aiStyleFor(club: string, strength: number): AiStyleId {
  const z = styleStrengthRead(strength);
  const weights = AI_STYLE_IDS.map(id => Math.max(0.02, AI_STYLES[id].base + AI_STYLES[id].slope * z));
  const total = weights.reduce((a, b) => a + b, 0);
  let u = keyedRng(`cm-style|${club}`)() * total;
  for (let i = 0; i < AI_STYLE_IDS.length; i++) {
    u -= weights[i];
    if (u < 0) return AI_STYLE_IDS[i];
  }
  return 'balanced';
}

/* ---------- what the instructions do to a match ---------- */

/**
 * The table, one place: lambda boosts in MENT_MOD's convention. The engine reads it through tacticBoost, the help's
 * worked example and scripts/simCmTactics.mjs read it by name. Measured, not felt: see the harness header.
 */
export const TACTIC_TABLE = {
  press: {
    /** A high press: what it wins in the first half (times the eleven's legs), what it costs in the second. */
    high: { atkH1: 0.08, defH1: -0.03, atkH2: 0.02, defH2: 0.09, vsPatientAtk: 0.05, vsDirectDef: 0.06 },
    off: { atk: -0.06, def: -0.05, vsPatientAtk: -0.03, vsDirectDef: -0.03 },
  },
  tempo: {
    direct: { atk: 0.02, def: 0.03, vsHighLineAtk: 0.07, vsDeepLineAtk: -0.05, perDutyAtk: 0.015 },
    patient: { atk: -0.04, def: -0.04, vsStandOffAtk: 0.03, vsPressDef: 0.07, perDutyAtk: 0.015 },
  },
  width: {
    wide: { atk: -0.01, def: 0.03, perDutyAtk: 0.02, vsNarrowAtk: 0.04 },
    narrow: { atk: -0.03, def: -0.04, perDutyAtk: 0.015, vsWideDef: 0.05 },
  },
  line: {
    high: { atk: 0.05, def: 0.05, vsDirectDef: 0.07, vsPatientAtk: 0.02, noPressDef: 0.05 },
    deep: { atk: -0.05, def: -0.06, vsPatientDef: 0.03, vsDirectDef: -0.03, pressGapDef: 0.05 },
  },
  /** Share of the ball, in points, per step of each (a high press and a patient tempo keep more of it). */
  poss: { press: 4, tempo: -6, line: 2 },
  /** Shots for the same expected goals: patient play takes more and worse ones, direct fewer and better. */
  shots: { patient: 1.2, direct: 0.8 },
  /** Knocks: the chance of an injury in a stretch, times this. */
  injury: { high: 1.3, off: 0.85 },
  /** Extra fitness each man who played pays for ninety minutes of it (stand off gives some back). */
  legs: { high: 5, off: -2 },
  /** The legs a high press reads: none at 60 fitness, all of it at 90. */
  legsFrom: 60, legsTo: 90,
  /** Per ninety minutes on balanced, and each setting's factor: balls won in their third, crosses, their offsides. */
  wonHigh: { base: 6, off: 0.5, high: 1.9 },
  crosses: { base: 11, narrow: 0.5, wide: 1.7, perDuty: 0.08 },
  offsides: { base: 2, deep: 0.4, high: 2.3 },
  /** The share of their goals that come on the break, and of mine that come from wide. */
  breakShare: { base: 0.16, perLine: 0.14, press: 0.06, vsDirect: 0.08 },
  wideShare: { base: 0.3, perWidth: 0.17, perDuty: 0.03 },
};

const WIDE_DUTIES: Duty[] = ['winger', 'attackingFullBack'];
const CENTRAL_DUTIES: Duty[] = ['insideForward', 'playmaker', 'creator', 'shadowStriker'];
const DIRECT_DUTIES: Duty[] = ['targetMan', 'poacher'];
const BUILD_DUTIES: Duty[] = ['deepPlaymaker', 'playmaker', 'falseNine'];
const countOf = (duties: (Duty | null)[], list: Duty[]): number => duties.filter(d => !!d && list.includes(d)).length;
/** The wide jobs in an eleven (wingers and attacking full backs), which wide play and the cross count read. */
export const wideDutyCount = (duties: (Duty | null)[]): number => countOf(duties, WIDE_DUTIES);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** What the engine hands the table at a moment of a match. */
export interface TacticRead {
  mine: TeamInstructions;
  theirs: TeamInstructions;
  half: 1 | 2;
  /** My eleven's average fitness at the time, 0 to 100. */
  fit: number;
  /** The duty on each of my slots. */
  duties: (Duty | null)[];
}

/** The goal rate boosts my instructions are worth against theirs, in MENT_MOD's convention. Zero on balanced. */
export function tacticBoost(r: TacticRead): { atk: number; def: number } {
  const { mine: m, theirs: t } = r;
  const T = TACTIC_TABLE;
  let atk = 0;
  let def = 0;
  if (m.press === 1) {
    const legs = clamp((r.fit - T.legsFrom) / (T.legsTo - T.legsFrom), 0, 1);
    atk += r.half === 1 ? T.press.high.atkH1 * legs : T.press.high.atkH2;
    def += r.half === 1 ? T.press.high.defH1 : T.press.high.defH2;
    if (t.tempo === -1) atk += T.press.high.vsPatientAtk;
    if (t.tempo === 1) def += T.press.high.vsDirectDef;
  } else if (m.press === -1) {
    atk += T.press.off.atk;
    def += T.press.off.def;
    if (t.tempo === -1) atk += T.press.off.vsPatientAtk;
    if (t.tempo === 1) def += T.press.off.vsDirectDef;
  }
  if (m.tempo === 1) {
    atk += T.tempo.direct.atk + T.tempo.direct.perDutyAtk * Math.min(2, countOf(r.duties, DIRECT_DUTIES));
    def += T.tempo.direct.def;
    if (t.line === 1) atk += T.tempo.direct.vsHighLineAtk;
    if (t.line === -1) atk += T.tempo.direct.vsDeepLineAtk;
  } else if (m.tempo === -1) {
    atk += T.tempo.patient.atk + T.tempo.patient.perDutyAtk * Math.min(2, countOf(r.duties, BUILD_DUTIES));
    def += T.tempo.patient.def;
    if (t.press === -1) atk += T.tempo.patient.vsStandOffAtk;
    if (t.press === 1) def += T.tempo.patient.vsPressDef;
  }
  if (m.width === 1) {
    atk += T.width.wide.atk + T.width.wide.perDutyAtk * Math.min(3, countOf(r.duties, WIDE_DUTIES));
    def += T.width.wide.def;
    if (t.width === -1) atk += T.width.wide.vsNarrowAtk;
  } else if (m.width === -1) {
    atk += T.width.narrow.atk + T.width.narrow.perDutyAtk * Math.min(3, countOf(r.duties, CENTRAL_DUTIES));
    def += T.width.narrow.def;
    if (t.width === 1) def += T.width.narrow.vsWideDef;
  }
  if (m.line === 1) {
    atk += T.line.high.atk;
    def += T.line.high.def;
    if (t.tempo === 1) def += T.line.high.vsDirectDef;
    if (t.tempo === -1) atk += T.line.high.vsPatientAtk;
    if (m.press === -1) def += T.line.high.noPressDef;
  } else if (m.line === -1) {
    atk += T.line.deep.atk;
    def += T.line.deep.def;
    if (t.tempo === -1) def += T.line.deep.vsPatientDef;
    if (t.tempo === 1) def += T.line.deep.vsDirectDef;
    if (m.press === 1) def += T.line.deep.pressGapDef;
  }
  return { atk, def };
}

/** Points of the ball my instructions are worth (a half's possession figure moves by this). */
export const possessionShift = (i: TeamInstructions): number =>
  TACTIC_TABLE.poss.press * i.press + TACTIC_TABLE.poss.tempo * i.tempo + TACTIC_TABLE.poss.line * i.line;
/** Shots for the same expected goals. */
export const shotMult = (i: TeamInstructions): number =>
  i.tempo === -1 ? TACTIC_TABLE.shots.patient : i.tempo === 1 ? TACTIC_TABLE.shots.direct : 1;
/** The injury chance of a stretch, times this. */
export const injuryMult = (i: TeamInstructions): number =>
  i.press === 1 ? TACTIC_TABLE.injury.high : i.press === -1 ? TACTIC_TABLE.injury.off : 1;
/** Extra fitness a man pays for ninety minutes under these (negative gives some back). */
export const legsCost = (i: TeamInstructions): number =>
  i.press === 1 ? TACTIC_TABLE.legs.high : i.press === -1 ? TACTIC_TABLE.legs.off : 0;

/* ---------- a match's instructions over time, and the report's numbers ---------- */

/** The instructions in force at a minute of a match (balanced before the first entry). A change at m bites from m + 1. */
export function instructionsAt(log: InstructionStep[] | undefined, minute: number): TeamInstructions {
  let out: TeamInstructions = BALANCED;
  for (const s of log ?? []) if (s.minute < minute || (s.minute === 0 && minute <= 0)) out = s.instructions;
  return out;
}

/** A count off a keyed stream with mean `mean` (Knuth's product, capped). */
function keyedPoisson(mean: number, rand: () => number): number {
  const L = Math.exp(-Math.max(0, mean));
  let k = 0;
  let p = 1;
  do { k += 1; p *= rand(); } while (p > L && k < 60);
  return k - 1;
}

/**
 * The report's numbers for the instructions, off a stream keyed to the match (never the game's own), the minutes
 * each setting was in force, the share of the ball each half and the goals the engine already drew. The legs figure
 * is the one the squad is charged at the whistle. Pure: the same match gives the same numbers, and the harness
 * reads balanced football's numbers through the same function.
 */
/** A goal as the report's numbers read it: when, and whether it was a set piece or an own goal (never credited to
 *  the break or the wing; Round 1522 review). */
export interface GoalMark { minute: number; penalty?: boolean; freeKick?: boolean; og?: unknown; }
const openPlay = (gs: GoalMark[]): number[] => gs.filter(g => !g.penalty && !g.freeKick && !g.og).map(g => g.minute);

export function tacticStatsOf(a: {
  key: string; log: InstructionStep[] | undefined; theirs: TeamInstructions; lastMinute: number;
  possHalves: [number, number]; myGoals: GoalMark[]; oppGoals: GoalMark[]; wideDuties: number;
}): TacticStats {
  const T = TACTIC_TABLE;
  const rand = keyedRng(`cm-tactics|${a.key}`);
  let wonHigh = 0;
  let crosses = 0;
  let offsides = 0;
  let legs = 0;
  for (let m = 1; m <= a.lastMinute; m++) {
    const i = instructionsAt(a.log, m);
    const poss = m <= 45 ? a.possHalves[0] : a.possHalves[1];
    wonHigh += (T.wonHigh.base / 90) * (i.press === 1 ? T.wonHigh.high : i.press === -1 ? T.wonHigh.off : 1) * ((100 - poss) / 50);
    crosses += (T.crosses.base / 90) * (i.width === 1 ? T.crosses.wide : i.width === -1 ? T.crosses.narrow : 1) * (poss / 50) * (1 + T.crosses.perDuty * a.wideDuties);
    offsides += (T.offsides.base / 90) * (i.line === 1 ? T.offsides.high : i.line === -1 ? T.offsides.deep : 1);
    legs += legsCost(i) / 90;
  }
  const breakConceded = openPlay(a.oppGoals).filter(m => {
    const i = instructionsAt(a.log, m);
    const p = clamp(T.breakShare.base + T.breakShare.perLine * i.line + (i.press === 1 ? T.breakShare.press : 0) + (a.theirs.tempo === 1 ? T.breakShare.vsDirect : 0), 0.03, 0.6);
    return rand() < p;
  }).length;
  const wideGoals = openPlay(a.myGoals).filter(m => {
    const i = instructionsAt(a.log, m);
    const p = clamp(T.wideShare.base + T.wideShare.perWidth * i.width + T.wideShare.perDuty * a.wideDuties, 0.08, 0.75);
    return rand() < p;
  }).length;
  return {
    wonHigh: keyedPoisson(wonHigh, rand),
    crosses: keyedPoisson(crosses, rand),
    offsides: keyedPoisson(offsides, rand),
    breakConceded,
    wideGoals,
    legs: Math.round(legs),
  };
}

/* ---------- the engine's side of it: what clubManagerTacticsCore's slot holds ---------- */

/** The style a club plays, off its own strength (never the level's edge, which is about you). Keyed, no draw. */
export function opponentStyle(state: CareerState, club: string): AiStyleId {
  return aiStyleFor(club, strengthOf(state, club));
}

/** The points of the ball the log was worth over a half (half two runs on through extra time), each minute under
 *  what was in force then. */
function possShift(live: LiveMatch, half: 1 | 2): number {
  const lo = half === 1 ? 1 : 46;
  const hi = half === 1 ? 45 : (live.et ? live.et.to : 90);
  let sum = 0;
  for (let m = lo; m <= hi; m++) sum += possessionShift(instructionsAt(live.instrLog, m));
  return sum / (hi - lo + 1);
}

/** An instructions, formation or duty change on a live match, applied in place; false refuses it (the same set
 *  again, a junk value, a formation or duty that is not one, or the shape already standing). */
function change(state: CareerState, live: LiveMatch, ch: LiveChange, m: number, p: number): boolean {
  const plus = p ? { plus: p } : {};
  if (ch.kind === 'instructions') {
    const next = readInstructions(ch.instructions);
    const now = liveInstructions(live);
    if (!next || INSTRUCTION_KEYS.every(k => next[k] === now[k])) return false;
    live.instrLog = [...(live.instrLog ?? []), { minute: m, ...plus, instructions: next }];
    return true;
  }
  if (ch.kind !== 'formation' && ch.kind !== 'duty') return false;
  const fromIdx = live.formationIndex ?? state.formationIndex;
  const from = FORMATIONS[fromIdx] ?? FORMATIONS[0];
  const dutiesNow = from.slots.map((_, i) => liveDutyAt(state, live, i));
  let toIdx = fromIdx;
  let order = [...live.onPitch];
  let duties = dutiesNow;
  if (ch.kind === 'formation') {
    const to = FORMATIONS[ch.formationIndex];
    if (!to || ch.formationIndex === fromIdx || !Number.isInteger(ch.formationIndex)) return false;
    const carried = carryShape(live.onPitch, dutiesNow, from, to, state.squad);
    if (carried.xiIds.some(id => !id)) return false;
    toIdx = ch.formationIndex;
    order = carried.xiIds as string[];
    duties = carried.xiDuties;
  } else {
    const slot = from.slots[ch.slot];
    if (!slot || !Number.isInteger(ch.slot)) return false;
    if (ch.duty !== null && !dutyOptions(slot).includes(ch.duty)) return false;
    if ((dutiesNow[ch.slot] ?? null) === ch.duty) return false;
    duties = dutiesNow.map((d, i) => (i === ch.slot ? ch.duty : d));
  }
  if (!live.kickoffShape && !live.formChanges?.length) live.kickoffShape = { formationIndex: fromIdx, duties: dutiesNow };
  live.onPitch = order;
  live.formationIndex = toIdx;
  live.duties = duties;
  live.formChanges = [...(live.formChanges ?? []), { minute: m, ...plus, formationIndex: toIdx, order: [...order], duties: [...duties] }];
  return true;
}

setTacticsImpl({
  edge: (state, fx: MyFixture, xi: XiSlot[], instr, half) => tacticBoost({
    mine: instr, theirs: AI_STYLES[opponentStyle(state, fx.opponent)].instructions, half,
    fit: xi.length ? xi.reduce((s, x) => s + x.p.fitness, 0) / xi.length : 80, duties: xi.map(x => x.duty),
  }),
  segment: instr => ({ knock: injuryMult(instr), shots: shotMult(instr) }),
  possShift,
  day: (state, fx, live, pairs, lastMinute) => {
    const theirStyle = opponentStyle(state, fx.opponent);
    const goals = (a?: GoalMark[], b?: GoalMark[]): GoalMark[] => [...(a ?? []), ...(b ?? [])];
    return {
      log: live.instrLog ?? [], theirStyle,
      stats: tacticStatsOf({
        key: `${worldYear(state)}:${state.clubName}:${live.week}:${live.opponent}`,
        log: live.instrLog, theirs: AI_STYLES[theirStyle].instructions, lastMinute,
        possHalves: [live.possH1 ?? 50, live.possH2 ?? live.possH1 ?? 50],
        myGoals: goals(live.h1My, live.h2My), oppGoals: goals(live.h1Opp, live.h2Opp),
        wideDuties: wideDutyCount(pairs.map(x => x.duty)),
      }),
    };
  },
  change,
});
