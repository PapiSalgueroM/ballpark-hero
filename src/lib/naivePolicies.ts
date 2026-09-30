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
 *                    (evenly among the options it points at); with none
 *                    left it guesses evenly
 *   speedTapper      the first listed option, answered at once
 *   firstSlot        each pull into the first open slot
 *   idle             changes nothing and lets the clock run
 * Beside them, the two the fence plays for the other end of the scale: the
 * ORACLE (the site's own best move, which must record exactly 100) and
 * KNOWLEDGE_70 (the oracle's move 7 times in 10, else random, which must
 * average at least 15 or the game has no room for skill).
 *
 * NOTHING TO READ IS AN ERROR. biggestNumber on a screen with no number,
 * structureStacker with no bonus shown and lifelineReader when a lifeline
 * points at nothing throw, never play the first option: a quiet fallback
 * would turn each into a second topListed and measure nothing. So a game
 * whose picks show no number leaves biggestNumber off its list, and
 * policiesItOffers, which the fence reads, says which policies a game's
 * moves give something to read, so it cannot leave off one that applies.
 *
 * EXACT OR SAMPLED. A policy says, in each state, which moves it makes and
 * the chance of each. When the game has no chance of its own, the tree is
 * walked with equal states merged (Moves.key, or the state's own plain data),
 * so the outcome is exact: a ten item, four option daily is a few hundred
 * states, not 4^10 paths (the choice dailies, section 7.1). Only a walk past
 * EXACT_STATES distinct states, or a game with chance, is SAMPLES runs from a
 * generator seeded by the board's salt, so the fence reproduces the engine's
 * line to the last digit.
 *
 * A BOARD WITH CHANCE is valued in expectation (the spec keeps luck out of
 * the score): its perfect is the oracle's expected result, never its luckiest
 * sample, and the line's floor is the expected result of the best
 * deterministic policy.
 *
 * Pure: no clock, no storage, never Math.random.
 */
import { expectedResult, lineFor, type PolicyOutcome } from './knowledgeLine';

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
  /**
   * A state's identity for the exact walk: two states with one key must be
   * the same to every part above, now and after any moves. Without it the
   * walk keys a state by its own plain data (numbers, strings, arrays, plain
   * objects), so a state that keeps a log the game never reads again should
   * give a key without the log, or its walk may run out of states and sample.
   */
  key?(s: S): string;
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
      if (at < 0) throw new Error('biggestNumber: no option on screen shows a number, so it has nothing to read');
      return one(m.play(s, at, { rng }));
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
      const at = argMax(optionsOrThrow(m, s, 'structureStacker').map(o => o.bonus));
      if (at < 0) throw new Error('structureStacker: no option on screen shows a bonus, so it has nothing to read');
      return one(m.play(s, at, { rng }));
    },
  },
  lifelineReader: {
    name: 'lifelineReader',
    step(m, s, rng) {
      let t = s;
      const left = need(m.lifelines, 'lifelineReader', 'lifelines')(t);
      if (left.length > 0) t = need(m.useLifeline, 'lifelineReader', 'useLifeline')(t, left[0], { rng });
      const opts = optionsOrThrow(m, t, 'lifelineReader');
      const advised = opts.flatMap((o, i) => (o.advised ? [i] : []));
      if (advised.length === 0 && left.length > 0) {
        throw new Error(`lifelineReader: the ${left[0]} lifeline points at no option, so it has nothing to follow`);
      }
      const picks = advised.length > 0 ? advised : opts.map((_, i) => i);
      return picks.map(i => ({ weight: 1 / picks.length, next: m.play(t, i, { rng }) }));
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
/** The most distinct states an exact walk may expand before it gives way to sampling. */
export const EXACT_STATES = 1 << 16;
/** The most moves one run may take: a game that never ends is an error, not a hang. */
const MOVE_LIMIT = 10_000;

class TooManyStates extends Error {}

/** A policy's outcome with how it was found: walked exactly, or sampled. */
export interface MeasuredOutcome extends PolicyOutcome {
  readonly exact: boolean;
}

/**
 * A state's own plain data as a string, or null when it holds anything else
 * (a Map, a class, a function), which the walk then never merges.
 */
function plainKey(value: unknown): string | null {
  const out: string[] = [];
  const walk = (x: unknown, depth: number): boolean => {
    if (depth > 64) return false;
    if (x === null) { out.push('n'); return true; }
    switch (typeof x) {
      case 'number': out.push(`#${x}`); return true;
      case 'string': out.push(JSON.stringify(x)); return true;
      case 'boolean': out.push(x ? 'T' : 'F'); return true;
      case 'undefined': out.push('u'); return true;
      case 'object': {
        if (Array.isArray(x)) {
          out.push('[');
          for (const e of x) { if (!walk(e, depth + 1)) return false; out.push(','); }
          out.push(']');
          return true;
        }
        const proto = Object.getPrototypeOf(x);
        if (proto !== Object.prototype && proto !== null) return false;
        out.push('{');
        for (const k of Object.keys(x).sort()) {
          out.push(JSON.stringify(k), ':');
          if (!walk((x as Record<string, unknown>)[k], depth + 1)) return false;
          out.push(',');
        }
        out.push('}');
        return true;
      }
      default: return false;
    }
  };
  return walk(value, 0) ? out.join('') : null;
}

const stateKey = <S>(m: Moves<S>, s: S): string | null => (m.key ? `k:${m.key(s)}` : plainKey(s));

/** How a policy's steps went: whether it ever left its own choice to chance. */
interface Seen { splits: boolean }

const noteSplit = <S>(branches: readonly Branch<S>[], seen: Seen) => {
  if (branches.filter(b => b.weight > 0).length > 1) seen.splits = true;
};

/**
 * The exact distribution of a policy's results, walking the tree with equal
 * states merged: a state's results are worked out once and reused wherever
 * the tree reaches that state again.
 */
function walkExact<S>(m: Moves<S>, p: Policy, rng: Rng, seen: Seen): Map<number, number> {
  const memo = new Map<string, Map<number, number>>();
  let states = 0;
  const from = (s: S, depth: number): Map<number, number> => {
    if (depth > MOVE_LIMIT) throw new Error(`${p.name}: a run passed ${MOVE_LIMIT} moves`);
    const key = stateKey(m, s);
    if (key !== null) {
      const known = memo.get(key);
      if (known) return known;
    }
    states += 1;
    if (states > EXACT_STATES) throw new TooManyStates();
    const dist = new Map<number, number>();
    if (m.done(s)) {
      dist.set(m.result(s), 1);
    } else {
      const branches = p.step(m, s, rng);
      noteSplit(branches, seen);
      for (const b of branches) {
        if (!(b.weight > 0)) continue;
        for (const [r, w] of from(b.next, depth + 1)) dist.set(r, (dist.get(r) ?? 0) + b.weight * w);
      }
    }
    if (key !== null) memo.set(key, dist);
    return dist;
  };
  return from(m.start(), 0);
}

function sampleOnce<S>(m: Moves<S>, p: Policy, rng: Rng, seen: Seen): number {
  let s = m.start();
  for (let moves = 0; !m.done(s); moves++) {
    if (moves > MOVE_LIMIT) throw new Error(`${p.name}: a run passed ${MOVE_LIMIT} moves`);
    const branches = p.step(m, s, rng);
    noteSplit(branches, seen);
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
 * chance of its own and the merged walk stays under EXACT_STATES; otherwise
 * `samples` runs seeded by `salt`.
 */
export function outcomeOf<S>(m: Moves<S>, p: Policy, salt: string, samples: number = SAMPLES): MeasuredOutcome {
  const rng = saltedRng(`${salt}|${p.name}`);
  let seen: Seen = { splits: false };
  let dist: Map<number, number> | null = null;
  if (!m.chance) {
    try {
      dist = walkExact(m, p, rng, seen);
    } catch (e) {
      if (!(e instanceof TooManyStates)) throw e;
    }
  }
  const exact = dist !== null;
  if (!dist) {
    seen = { splits: false };
    dist = new Map();
    const sampler = saltedRng(`${salt}|${p.name}|samples`);
    for (let i = 0; i < samples; i++) {
      const r = sampleOnce(m, p, sampler, seen);
      dist.set(r, (dist.get(r) ?? 0) + 1 / samples);
    }
  }
  const results = [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([value, weight]) => ({ value, weight }));
  return { policy: p.name, results, deterministic: results.length === 1 || !seen.splits, exact };
}

/**
 * The naive policies a game's moves give something to read. A game must be
 * measured on every one of them: a game that reveals its answers is measured
 * on counter, one that prints a number on its options on biggestNumber, and
 * so on. The options are read along the oracle's run.
 */
export function policiesItOffers<S>(m: Moves<S>, salt: string): NaivePolicyName[] {
  const out = new Set<NaivePolicyName>();
  if (m.revealed) out.add('counter');
  if (m.shownValue && m.poolMedian !== undefined) out.add('medianCall');
  if (m.lifelines) out.add('lifelineReader');
  if (m.type) out.add('suggestionBox');
  if (m.idle) out.add('idle');
  const rng = saltedRng(`${salt}|offers`);
  let s = m.start();
  for (let moves = 0; !m.done(s); moves++) {
    if (moves > MOVE_LIMIT) throw new Error(`the oracle's run passed ${MOVE_LIMIT} moves`);
    const opts = m.options(s);
    if (opts.some(o => typeof o.shown === 'number' && Number.isFinite(o.shown))) out.add('biggestNumber');
    if (opts.some(o => typeof o.bonus === 'number' && Number.isFinite(o.bonus))) out.add('structureStacker');
    s = m.play(s, m.best(s), { rng });
  }
  return NAIVE_POLICY_NAMES.filter(n => out.has(n));
}

/**
 * What an engine needs at deal time: every naive outcome, the perfect and
 * the line. The perfect is the oracle's result; on a board with chance, its
 * expected result, never the luckiest of its samples.
 */
export function measureBoard<S>(
  m: Moves<S>,
  names: readonly NaivePolicyName[],
  salt: string,
  step: number = 1,
): { outcomes: MeasuredOutcome[]; perfect: number; line: number } {
  const outcomes = policiesFor(names, m).map(p => outcomeOf(m, p, salt));
  const oracle = outcomeOf(m, ORACLE, salt);
  const perfect = expectedResult(oracle);
  return { outcomes, perfect, line: lineFor({ perfect, step }, outcomes) };
}
