/**
 * Round 1228: a league phase slate, the way the European cups have drawn one since 2024-25.
 *
 * Clubs sit in pots of equal size. Every club plays two clubs from every pot, its own included, one at
 * home and one away, so with four pots of nine that is eight matches against eight different clubs, four
 * at home. Nobody meets a club of its own association and nobody meets more than `cap` clubs of any other
 * one association. Then the matches are laid on matchdays, one match a club a matchday.
 *
 * This file knows no football beyond that: pots, an association per club and a stream are handed in. It
 * sits beside leagueCore.ts (which stays byte for byte what it was) and imports nothing else. Nothing in
 * the game imports it yet.
 *
 * WHEN A FIELD CANNOT BE DRAWN. Five clubs of one association in a pot of nine cannot all avoid each
 * other, by counting. The rule is then relaxed by a COUNTED budget and never switched off: at most
 * `breaks` matches between two clubs of one association and at most `overCap` opponents over the cap,
 * both tried from the counting floor upward, the cap giving way before the ban. The slate records both
 * counts. If the search still finds nothing inside its bounds, a recorded legal pattern is seated and the
 * slate says so (`fallback`), so the builder never hangs and never returns a slate that lies about itself.
 */
import { hash32, mulberry32 } from './leagueCore';

export interface SlateSpec {
  /** Club indices by pot. Pots of equal size, every index from 0 to clubs - 1 exactly once. */
  pots: number[][];
  /** An association id per club index. */
  assoc: number[];
  /** The most opponents of any one other association. Default 2. */
  cap?: number;
  /** Whole draws tried at each budget before it is raised. Default 20. 0 goes straight to the pattern. */
  tries?: number;
}

export interface Slate {
  /** [home, away, matchday], matchdays counted from 0. */
  matches: [number, number, number][];
  /** Matches between two clubs of one association. */
  breaks: number;
  /** Opponents over the cap, summed over every club and every other association. */
  overCap: number;
  /** The least of each that counting allows for this field. */
  floor: { breaks: number; overCap: number };
  /** True when the search gave up and the recorded pattern was seated. */
  fallback: boolean;
  /** Whole draws spent. */
  tries: number;
}

/** How far above the counting floor each budget may climb before the next one is tried. */
const CLIMB = 2;
const MATCH_NODES = 4000;
const COLOUR_RESTARTS = 4;

function shape(spec: SlateSpec): { n: number; p: number; s: number } | null {
  const p = spec.pots.length;
  const s = p > 0 ? spec.pots[0].length : 0;
  const n = p * s;
  if (p < 1 || s < 3 || n % 2 === 1 || spec.assoc.length !== n) return null;
  const seen = new Set<number>();
  for (const pot of spec.pots) {
    if (pot.length !== s) return null;
    for (const c of pot) { if (!Number.isInteger(c) || c < 0 || c >= n || seen.has(c)) return null; seen.add(c); }
  }
  return { n, p, s };
}

/** The least number of same association matches, and of opponents over the cap, that counting allows.
 *  k clubs of one association in a pot of s play 2k matches inside the pot against s - k others who have
 *  2(s - k) to give: past half the pot the rest must meet each other. And every club of an association
 *  plays two clubs of each pot, so the pot's other clubs take 2K such opponents between them, with room
 *  for `cap` each. That holds for a pot the association has NO club in as well, so every association of
 *  the field is walked for every pot: with k = 0 the pot's s clubs take all 2K visits. (The first writing
 *  walked only the associations a pot holds, and an association of eleven clubs missing from a pot was
 *  then drawn with a same association match the field did not force: the review of Round 1228.) */
export function slateFloor(spec: SlateSpec): { breaks: number; overCap: number } {
  const sh = shape(spec);
  if (!sh) return { breaks: 0, overCap: 0 };
  const cap = spec.cap ?? 2;
  const total = new Map<number, number>();
  for (const a of spec.assoc) total.set(a, (total.get(a) ?? 0) + 1);
  const inPot = spec.pots.map(pot => { const m = new Map<number, number>(); for (const c of pot) m.set(spec.assoc[c], (m.get(spec.assoc[c]) ?? 0) + 1); return m; });
  let breaks = 0;
  let overCap = 0;
  inPot.forEach((m, a) => {
    for (const x of total.keys()) {
      const k = m.get(x) ?? 0;
      const inside = Math.max(0, 2 * k - sh.s);
      let across = 0;
      for (let b = 0; b < inPot.length; b += 1) if (b !== a) across += Math.max(0, k + (inPot[b].get(x) ?? 0) - sh.s);
      breaks += inside + across; // each ordered pair of pots is one matching, so both directions are counted
      /* A forced match inside the pot takes two of the association's 2K visits to this pot off the other
         clubs, a forced match with another pot takes one, and there is one of those in each direction. */
      overCap += Math.max(0, 2 * (total.get(x) ?? 0) - 2 * inside - 2 * across - cap * (sh.s - k));
    }
  });
  return { breaks, overCap };
}

/** What a set of matches costs against the two association rules. */
export function slateCost(spec: SlateSpec, matches: readonly (readonly [number, number, number?])[]): { breaks: number; overCap: number } {
  const cap = spec.cap ?? 2;
  const seen = new Map<string, number>();
  let breaks = 0;
  for (const [h, a] of matches) {
    if (spec.assoc[h] === spec.assoc[a]) { breaks += 1; continue; }
    for (const [club, other] of [[h, a], [a, h]]) { const key = `${club}|${spec.assoc[other]}`; seen.set(key, (seen.get(key) ?? 0) + 1); }
  }
  let overCap = 0;
  for (const n of seen.values()) overCap += Math.max(0, n - cap);
  return { breaks, overCap };
}

function shuffled<T>(list: readonly T[], rand: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** One whole pairing under a budget: for every ordered pair of pots, each club of the first hosts one club
 *  of the second. Null on a dead end. */
function drawPairs(spec: SlateSpec, n: number, cap: number, maxBreaks: number, maxOver: number, rand: () => number): [number, number][] | null {
  const ids = [...new Set(spec.assoc)];
  const assoc = spec.assoc.map(a => ids.indexOf(a));
  const na = ids.length;
  const met = new Uint8Array(n * n);
  const faced = new Int16Array(n * na); // faced[club * na + association]: opponents of that other association
  let breaks = 0;
  let over = 0;
  const out: [number, number][] = [];
  const cost = (h: number, v: number): [number, number] | null => {
    if (h === v || met[h * n + v]) return null;
    if (assoc[h] === assoc[v]) return breaks < maxBreaks ? [1, 0] : null;
    const o = (faced[h * na + assoc[v]] >= cap ? 1 : 0) + (faced[v * na + assoc[h]] >= cap ? 1 : 0);
    return over + o <= maxOver ? [0, o] : null;
  };
  const put = (h: number, v: number, c: [number, number], sign: 1 | -1) => {
    met[h * n + v] = met[v * n + h] = sign === 1 ? 1 : 0;
    breaks += sign * c[0]; over += sign * c[1];
    if (assoc[h] !== assoc[v]) { faced[h * na + assoc[v]] += sign; faced[v * na + assoc[h]] += sign; }
  };
  /* The fullest pots first: they are the ones a budget is spent on. */
  const clash = (a: number, b: number) => { let c = 0; for (const x of spec.pots[a]) for (const y of spec.pots[b]) if (x !== y && assoc[x] === assoc[y]) c += 1; return c; };
  const order = shuffled(spec.pots.flatMap((_, a) => spec.pots.map((__, b) => [a, b] as [number, number])), rand)
    .map(pair => ({ pair, key: clash(pair[0], pair[1]) + (pair[0] === pair[1] ? 0.5 : 0) }))
    .sort((x, y) => y.key - x.key).map(x => x.pair);
  for (const [a, b] of order) {
    const hosts = spec.pots[a];
    const guests = spec.pots[b];
    const s = hosts.length;
    const hostOf = new Int16Array(s).fill(-1); // by guest seat
    const guestOf = new Int16Array(s).fill(-1); // by host seat
    let nodes = 0;
    const place = (left: number): boolean => {
      if (left === 0) return true;
      nodes += 1;
      if (nodes > MATCH_NODES) return false;
      /* The tightest seat on either side goes next. */
      let best: { host: boolean; seat: number; options: [number, [number, number]][] } | null = null;
      for (let side = 0; side < 2; side += 1) for (let i = 0; i < s; i += 1) {
        if ((side === 0 ? guestOf[i] : hostOf[i]) !== -1) continue;
        const options: [number, [number, number]][] = [];
        for (let j = 0; j < s; j += 1) {
          if ((side === 0 ? hostOf[j] : guestOf[j]) !== -1) continue;
          const c = side === 0 ? cost(hosts[i], guests[j]) : cost(hosts[j], guests[i]);
          if (c) options.push([j, c]);
        }
        if (options.length === 0) return false;
        if (!best || options.length < best.options.length) best = { host: side === 0, seat: i, options };
      }
      if (!best) return false;
      const picks = shuffled(best.options, rand).sort((x, y) => x[1][0] + x[1][1] - y[1][0] - y[1][1]);
      for (const [j] of picks) {
        const hi = best.host ? best.seat : j;
        const gi = best.host ? j : best.seat;
        const c = cost(hosts[hi], guests[gi]);
        if (!c) continue;
        put(hosts[hi], guests[gi], c, 1); guestOf[hi] = gi; hostOf[gi] = hi;
        if (place(left - 1)) return true;
        put(hosts[hi], guests[gi], c, -1); guestOf[hi] = -1; hostOf[gi] = -1;
        if (nodes > MATCH_NODES) return false;
      }
      return false;
    };
    if (!place(s)) return null;
    for (let i = 0; i < s; i += 1) out.push([hosts[i], guests[guestOf[i]]]);
  }
  return out;
}

/** Lay the matches on `days` matchdays, one match a club a matchday. A colour free at both ends is taken;
 *  failing that the two colour chain from one end is flipped (Kempe), and where the chain closes on the
 *  other end one neighbouring match is lifted and laid again. Bounded: null when the budget runs out.
 *  NOT DONE HERE: the order of a club's home and away nights. The real schedule allows no more than two
 *  home or two away nights in a row and one of each across the first two and the last two matchdays
 *  (ledger row F18, one publisher). This layer ignores venue, so no screen may call the order real. */
function layMatchdays(n: number, pairs: readonly [number, number][], days: number, rand: () => number): Int16Array | null {
  const at = new Int32Array(n * days).fill(-1); // at[club * days + day]: the match that club plays that day
  const day = new Int16Array(pairs.length).fill(-1);
  const set = (e: number, d: number) => { day[e] = d; at[pairs[e][0] * days + d] = e; at[pairs[e][1] * days + d] = e; };
  const lift = (e: number) => { const d = day[e]; at[pairs[e][0] * days + d] = -1; at[pairs[e][1] * days + d] = -1; day[e] = -1; };
  const freeAt = (club: number) => { const f: number[] = []; for (let d = 0; d < days; d += 1) if (at[club * days + d] === -1) f.push(d); return f; };
  const todo = shuffled(pairs.map((_, e) => e), rand);
  let budget = pairs.length * 60;
  while (todo.length > 0) {
    budget -= 1;
    if (budget < 0) return null;
    const e = todo.pop() as number;
    const [u, v] = pairs[e];
    const fu = freeAt(u);
    const fv = freeAt(v);
    const both = fu.filter(d => fv.includes(d));
    if (both.length > 0) { set(e, both[Math.floor(rand() * both.length)]); continue; }
    const a = fu[Math.floor(rand() * fu.length)];
    const b = fv[Math.floor(rand() * fv.length)];
    /* The chain from v: its match on day a, then that club's match on day b, and so on. */
    const chain: number[] = [];
    let x = v;
    let d = a;
    for (;;) {
      const f = at[x * days + d];
      if (f === -1) break;
      chain.push(f);
      x = pairs[f][0] === x ? pairs[f][1] : pairs[f][0];
      d = d === a ? b : a;
    }
    if (x !== u) {
      const was = chain.map(f => day[f]);
      for (const f of chain) lift(f);
      chain.forEach((f, i) => set(f, was[i] === a ? b : a));
      set(e, a);
    } else {
      const g = at[v * days + a];
      lift(g);
      set(e, a);
      todo.splice(Math.floor(rand() * (todo.length + 1)), 0, g);
    }
  }
  return day;
}

/** A recorded legal slate for four pots of nine, by seat (pot * 9 + seat): matchday * 1296 + home * 36 +
 *  away. Drawn once by this file's own search on a field with no two clubs of one association, and held
 *  by src/lib/leagueSlate.test.ts and scripts/simCmLeaguePhase.mjs section 1. */
export const PATTERN_4X9: readonly number[] = [
  3, 161, 196, 251, 260, 451, 488, 527, 558, 766, 793, 875, 934, 966, 974, 1037, 1125, 1185,
  1306, 1337, 1406, 1473, 1532, 1561, 1642, 1916, 2003, 2187, 2211, 2318, 2352, 2392, 2438, 2466, 2541, 2567,
  2658, 2692, 2715, 2822, 2892, 2961, 2988, 3181, 3225, 3273, 3280, 3337, 3455, 3552, 3586, 3641, 3740, 3823,
  3920, 3950, 3971, 4093, 4111, 4199, 4241, 4347, 4391, 4468, 4531, 4622, 4666, 4770, 4915, 4971, 5086, 5127,
  5205, 5326, 5395, 5455, 5501, 5520, 5569, 5606, 5690, 5725, 5784, 5852, 5993, 6169, 6198, 6299, 6340, 6395,
  6570, 6624, 6759, 6769, 6810, 6893, 6922, 7014, 7052, 7089, 7228, 7267, 7291, 7321, 7383, 7421, 7558, 7764,
  7908, 7942, 8170, 8200, 8215, 8249, 8295, 8432, 8469, 8538, 8606, 8728, 8840, 8881, 8893, 8945, 8991, 9036,
  9117, 9150, 9256, 9435, 9551, 9628, 9698, 9732, 9785, 9799, 9896, 9926, 9936, 9993, 10074, 10268, 10327, 10360,
];

function seatPattern(spec: SlateSpec, rand: () => number): [number, number, number][] | null {
  if (spec.pots.length !== 4 || spec.pots[0].length !== 9 || PATTERN_4X9.length !== 144) return null;
  let best: [number, number, number][] | null = null;
  let bestCost = Infinity;
  for (let t = 0; t < 64; t += 1) {
    const seats = spec.pots.flatMap(pot => shuffled(pot, rand));
    const matches = PATTERN_4X9.map((code): [number, number, number] => [seats[Math.floor(code / 36) % 36], seats[code % 36], Math.floor(code / 1296)]);
    const c = slateCost(spec, matches);
    const total = c.breaks * 1000 + c.overCap;
    if (total < bestCost) { bestCost = total; best = matches; }
  }
  return best;
}

/** Draw a slate. `rand` is a stream in [0, 1) handed in: nothing here reads Math.random. Null only when
 *  the pots are not a shape this file can draw, or the search fails on a shape with no recorded pattern. */
export function swissSlate(spec: SlateSpec, rand: () => number): Slate | null {
  const sh = shape(spec);
  if (!sh) return null;
  const cap = spec.cap ?? 2;
  const tries = spec.tries ?? 20;
  const floor = slateFloor(spec);
  const days = 2 * sh.p;
  let spent = 0;
  for (let db = 0; db <= CLIMB; db += 1) for (let dc = 0; dc <= CLIMB; dc += 1) {
    for (let t = 0; t < tries; t += 1) {
      spent += 1;
      /* Each try has a stream of its own, so a try that ends early cannot shift the next. */
      const sub = mulberry32(hash32(Math.floor(rand() * 4294967296), spent));
      const pairs = drawPairs(spec, sh.n, cap, floor.breaks + db, floor.overCap + dc, sub);
      if (!pairs) continue;
      for (let r = 0; r < COLOUR_RESTARTS; r += 1) {
        const day = layMatchdays(sh.n, pairs, days, sub);
        if (!day) continue;
        const matches = pairs.map(([h, a], e): [number, number, number] => [h, a, day[e]]);
        return { matches, ...slateCost(spec, matches), floor, fallback: false, tries: spent };
      }
    }
  }
  const seated = seatPattern(spec, rand);
  if (!seated) return null;
  return { matches: seated, ...slateCost(spec, seated), floor, fallback: true, tries: spent };
}
