/**
 * Round 678: the player with no knowledge, driven through a game's own moves.
 *
 * WHY THIS EXISTS. Points start past the knowledge line (src/lib/
 * knowledgeLine.ts), and the line is only as honest as the naive players it
 * is measured on. A line set on "random" alone let counting beat it (a
 * balanced key with a reveal after each item pays about 16.9 of 100 on Ball
 * IQ to a player who picks whatever has come up least), and a line set on a
 * sorted list let the top name pay the perfect. So every policy a player with
 * no knowledge really uses is written here once, and each one plays through
 * the game's own move API (Moves below), never through a copy of its rules.
 *
 * THE POLICIES (docs/design/POINTS-ECONOMY-V2.md, section 7.1):
 *   topListed        the first option exactly as the screen lists it
 *   constant         the same answer position on every item, once for each
 *                    position (constant:0, constant:1, ...)
 *   random           a uniform legal choice
 *   counter          on a game that reveals each answer, the option revealed
 *                    least so far (ties go to the first listed)
 *   biggestNumber    the option with the largest number on screen
 *   medianCall       higher when the value shown is under the pool median
 *   suggestionBox    types two letters and takes the first suggestion
 *   structureStacker the option with the biggest visible bonus (chemistry)
 *   lifelineReader   spends a lifeline whenever one is left and follows it
 *   speedTapper      the first listed option, answered at once
 *   firstSlot        each pull into the first open slot
 *   idle             changes nothing and lets the clock run
 * Beside them, the two the fence plays for the other end of the scale: the
 * ORACLE (the site's own best move, which must record exactly 100) and
 * KNOWLEDGE_70 (the oracle's move 7 times in 10, else random, which must
 * average at least 15 or the game has no room for skill).
 *
 * EXACT OR SAMPLED. A policy says, in each state, which moves it makes and
 * the chance of each. When the game has no chance of its own and the tree is
 * small, every path is walked and the outcome is exact (the choice dailies).
 * Otherwise it is SAMPLES runs from a generator seeded by the board's salt,
 * so the fence reproduces the engine's line to the last digit.
 *
 * Pure: no clock, no storage, never Math.random.
 */
import { lineFor, type PolicyOutcome } from './knowledgeLine';

export type NaivePolicyName =
  | 'topListed' | 'constant' | 'random' | 'counter' | 'biggestNumber' | 'medianCall'
  | 'suggestionBox' | 'structureStacker' | 'lifelineReader' | 'speedTapper' | 'firstSlot' | 'idle';

export const NAIVE_POLICY_NAMES: readonly NaivePolicyName[] = [
  'topListed', 'constant', 'random', 'counter', 'biggestNumber', 'medianCall',
  'suggestionBox', 'structureStacker', 'lifelineReader', 'speedTapper', 'firstSlot', 'idle',
];

/** One option as the screen shows it, in the order it shows them. */
export interface MoveOption {
  /** What counter counts once answers are revealed: a position ('0' to '3') or a text ('true', 'higher'). */
  readonly key: string;
  /** A number the screen prints on this option, or null when it prints none. */
  readonly shown?: number | null;
  /** A bonus the screen says this option adds (same team or era), for structureStacker. */
  readonly bonus?: number;
  /** A lifeline's advice points at this option. */
  readonly advised?: boolean;
}

export type Rng = () => number;

/** What a move is played with: the generator for any chance after it, and how fast it was made. */
export interface MoveContext {
  readonly rng: Rng;
  readonly seconds?: number;
}

/**
 * A game's own moves on one board. Every call returns a new state and leaves
 * the old one alone. The optional parts are what some policies need; a policy
 * the family table lists for a game whose moves lack its part is an error the
 * fence reports, never a quiet fallback.
 */
export interface Moves<S> {
  start(): S;
  /** The options on screen now, in screen order. */
  options(s: S): readonly MoveOption[];
  play(s: S, index: number, ctx: MoveContext): S;
  done(s: S): boolean;
  /** The game's own number for a finished run. */
  result(s: S): number;
  /** The site's own best move here: the oracle, or the house expert. */
  best(s: S): number;
  /** True when anything after a move is left to chance (a crowd poll, a simulated match). */
  readonly chance?: boolean;
  /** The answers revealed so far, as option keys, oldest first. */
  revealed?(s: S): readonly string[];
  /** Higher or lower: the value on screen, and the median of the pool it is drawn from. */
  shownValue?(s: S): number;
  readonly poolMedian?: number;
  /** The lifelines still unspent, and spending one. */
  lifelines?(s: S): readonly string[];
  useLifeline?(s: S, name: string, ctx: MoveContext): S;
  /** The state with `text` typed into the box; options() then lists what it highlights. */
  type?(s: S, text: string): S;
  /** Let the clock run with no decision (a week, a season). */
  idle?(s: S, ctx: MoveContext): S;
}

export interface Branch<S> {
  readonly weight: number;
  readonly next: S;
}

/** A policy: the moves it makes in a state, with the chance of each. */
export interface Policy {
  readonly name: string;
  step<S>(m: Moves<S>, s: S, rng: Rng): Branch<S>[];
}

const one = <S>(next: S): Branch<S>[] => [{ weight: 1, next }];

function need<T>(value: T | undefined, policy: string, part: string): T {
  if (value === undefined) throw new Error(`${policy} needs moves.${part}, which this game does not offer`);
  return value;
}

function optionsOrThrow<S>(m: Moves<S>, s: S, policy: string): readonly MoveOption[] {
  const opts = m.options(s);
  if (opts.length === 0) throw new Error(`${policy}: a state that is not done offers no option`);
  return opts;
}

/** The index of the largest value, the first listed on a tie; -1 when none is a number. */
function argMax(values: readonly (number | null | undefined)[]): number {
  let at = -1;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (at < 0 || v > (values[at] as number)) at = i;
  }
  return at;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function constantAt(k: number): Policy {
  return {
    name: `constant:${k}`,
    step(m, s, rng) {
      const opts = optionsOrThrow(m, s, 'constant');
      return one(m.play(s, Math.min(k, opts.length - 1), { rng }));
    },
  };
}

const POLICIES: Record<Exclude<NaivePolicyName, 'constant'>, Policy> = {
  topListed: {
    name: 'topListed',
    step(m, s, rng) {
      optionsOrThrow(m, s, 'topListed');
      return one(m.play(s, 0, { rng }));
    },
  },
  random: {
    name: 'random',
    step(m, s, rng) {
      const n = optionsOrThrow(m, s, 'random').length;
      return Array.from({ length: n }, (_, i) => ({ weight: 1 / n, next: m.play(s, i, { rng }) }));
    },
  },
  counter: {
    name: 'counter',
    step(m, s, rng) {
      const opts = optionsOrThrow(m, s, 'counter');
      const seen = need(m.revealed, 'counter', 'revealed')(s);
      const count = (key: string) => seen.filter(k => k === key).length;
      let at = 0;
      for (let i = 1; i < opts.length; i++) if (count(opts[i].key) < count(opts[at].key)) at = i;
      return one(m.play(s, at, { rng }));
    },
  },
  biggestNumber: {
    name: 'biggestNumber',
    step(m, s, rng) {
      const at = argMax(optionsOrThrow(m, s, 'biggestNumber').map(o => o.shown));
      return one(m.play(s, Math.max(0, at), { rng }));
    },
  },
  medianCall: {
    name: 'medianCall',
    step(m, s, rng) {
      const opts = optionsOrThrow(m, s, 'medianCall');
      const shown = need(m.shownValue, 'medianCall', 'shownValue')(s);
      const median = need(m.poolMedian, 'medianCall', 'poolMedian');
      const want = shown < median ? 'higher' : 'lower';
      const at = opts.findIndex(o => o.key === want);
      if (at < 0) throw new Error(`medianCall: no option keyed ${want}`);
      return one(m.play(s, at, { rng }));
    },
  },
  suggestionBox: {
    name: 'suggestionBox',
    step(m, s, rng) {
      const type = need(m.type, 'suggestionBox', 'type');
      const typed: (typeof s)[] = [];
      for (const a of LETTERS) for (const b of LETTERS) {
        const t = type(s, a + b);
        if (m.options(t).length > 0) typed.push(t);
      }
      if (typed.length === 0) throw new Error('suggestionBox: no two letters highlight anything');
      return typed.map(t => ({ weight: 1 / typed.length, next: m.play(t, 0, { rng }) }));
    },
  },
  structureStacker: {
    name: 'structureStacker',
    step(m, s, rng) {
      const at = argMax(optionsOrThrow(m, s, 'structureStacker').map(o => o.bonus ?? 0));
      return one(m.play(s, Math.max(0, at), { rng }));
    },
  },
  lifelineReader: {
    name: 'lifelineReader',
    step(m, s, rng) {
      let t = s;
      const left = need(m.lifelines, 'lifelineReader', 'lifelines')(t);
      if (left.length > 0) t = need(m.useLifeline, 'lifelineReader', 'useLifeline')(t, left[0], { rng });
      const advised = optionsOrThrow(m, t, 'lifelineReader').findIndex(o => o.advised);
      return one(m.play(t, Math.max(0, advised), { rng }));
    },
  },
  speedTapper: {
    name: 'speedTapper',
    step(m, s, rng) {
      optionsOrThrow(m, s, 'speedTapper');
      return one(m.play(s, 0, { rng, seconds: 0 }));
    },
  },
  firstSlot: {
    name: 'firstSlot',
    step(m, s, rng) {
      optionsOrThrow(m, s, 'firstSlot');
      return one(m.play(s, 0, { rng }));
    },
  },
  idle: {
    name: 'idle',
    step(m, s, rng) {
      return one(need(m.idle, 'idle', 'idle')(s, { rng }));
    },
  },
};

/** The site's own best move every time: must record exactly 100 on every board. */
export const ORACLE: Policy = {
  name: 'oracle',
  step(m, s, rng) {
    return one(m.play(s, m.best(s), { rng }));
  },
};

/** The oracle's move 7 times in 10, else a uniform choice: must average at least 15. */
export const KNOWLEDGE_70: Policy = {
  name: 'knowledge70',
  step(m, s, rng) {
    const n = optionsOrThrow(m, s, 'knowledge70').length;
    const best = m.best(s);
    return Array.from({ length: n }, (_, i) => ({
      weight: 0.3 / n + (i === best ? 0.7 : 0),
      next: m.play(s, i, { rng }),
    }));
  },
};

/**
 * The policies a family table lists, as the fence and the engines play them:
 * `constant` becomes one policy per answer position on the board's first item.
 */
export function policiesFor<S>(names: readonly NaivePolicyName[], m: Moves<S>): Policy[] {
  const out: Policy[] = [];
  for (const name of names) {
    if (name === 'constant') {
      const width = m.options(m.start()).length;
      for (let k = 0; k < width; k++) out.push(constantAt(k));
    } else {
      out.push(POLICIES[name]);
    }
  }
  return out;
}

/** A generator seeded from a string (a board's salt), the same stream on every machine. */
export function saltedRng(salt: string): Rng {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs sampled when a policy's outcome is not walked exactly. */
export const SAMPLES = 200;
/** The most finished paths an exact walk may reach before it gives way to sampling. */
export const EXACT_PATHS = 1 << 16;
/** The most moves one run may take: a game that never ends is an error, not a hang. */
const MOVE_LIMIT = 10_000;

class TooManyPaths extends Error {}

function walkExact<S>(m: Moves<S>, p: Policy, rng: Rng): Map<number, number> {
  const out = new Map<number, number>();
  let paths = 0;
  const walk = (s: S, w: number, depth: number) => {
    if (depth > MOVE_LIMIT) throw new Error(`${p.name}: a run passed ${MOVE_LIMIT} moves`);
    if (m.done(s)) {
      paths += 1;
      if (paths > EXACT_PATHS) throw new TooManyPaths();
      const r = m.result(s);
      out.set(r, (out.get(r) ?? 0) + w);
      return;
    }
    for (const b of p.step(m, s, rng)) if (b.weight > 0) walk(b.next, w * b.weight, depth + 1);
  };
  walk(m.start(), 1, 0);
  return out;
}

function sampleOnce<S>(m: Moves<S>, p: Policy, rng: Rng): number {
  let s = m.start();
  for (let moves = 0; !m.done(s); moves++) {
    if (moves > MOVE_LIMIT) throw new Error(`${p.name}: a run passed ${MOVE_LIMIT} moves`);
    const branches = p.step(m, s, rng);
    let roll = rng();
    let chosen = branches[branches.length - 1];
    for (const b of branches) {
      if (roll < b.weight) { chosen = b; break; }
      roll -= b.weight;
    }
    s = chosen.next;
  }
  return m.result(s);
}

/**
 * Everything a policy reaches on one board. Exact when the game has no
 * chance of its own and the walk stays under EXACT_PATHS; otherwise
 * `samples` runs seeded by `salt`.
 */
export function outcomeOf<S>(m: Moves<S>, p: Policy, salt: string, samples: number = SAMPLES): PolicyOutcome {
  const rng = saltedRng(`${salt}|${p.name}`);
  let dist: Map<number, number> | null = null;
  if (!m.chance) {
    try {
      dist = walkExact(m, p, rng);
    } catch (e) {
      if (!(e instanceof TooManyPaths)) throw e;
    }
  }
  if (!dist) {
    dist = new Map();
    const sampler = saltedRng(`${salt}|${p.name}|samples`);
    for (let i = 0; i < samples; i++) {
      const r = sampleOnce(m, p, sampler);
      dist.set(r, (dist.get(r) ?? 0) + 1 / samples);
    }
  }
  const results = [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([value, weight]) => ({ value, weight }));
  return { policy: p.name, results, deterministic: results.length === 1 };
}

/** What an engine needs at deal time: every naive outcome, the perfect and the line. */
export function measureBoard<S>(
  m: Moves<S>,
  names: readonly NaivePolicyName[],
  salt: string,
  step: number = 1,
): { outcomes: PolicyOutcome[]; perfect: number; line: number } {
  const outcomes = policiesFor(names, m).map(p => outcomeOf(m, p, salt));
  const oracle = outcomeOf(m, ORACLE, salt);
  const perfect = Math.max(...oracle.results.map(r => r.value));
  return { outcomes, perfect, line: lineFor({ perfect, step }, outcomes) };
}
