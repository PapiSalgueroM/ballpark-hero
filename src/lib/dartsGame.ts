/**
 * Darts (working title "Treble Trouble") — a soccer darts game that fuses two
 * proven formats: box2box's "darts" show (throw lands on a segment, then name a
 * player from that segment's category) and TopBins Football Darts (classic
 * 501 -> 0 darts scoring). You sweep a pointer around a real dartboard, throw,
 * and the wedge you land on reveals a category ("Name a player from Brazil",
 * "Played for Barcelona", "Name a goalkeeper"). Answer correctly and the dart
 * banks its value (wedge x ring multiplier); miss the answer and the dart
 * scores nothing. First to exactly 0 from 501 wins, racing an AI opponent.
 *
 * FREE + SELF-CONTAINED: every challenge and answer is validated against the
 * existing whoAmI player pool (real player_market_values rows: nationality,
 * position, current club, career club history, market value). No edge function,
 * no external AI, so this game costs nothing to run and works whenever the DB
 * is reachable, exactly like Alphabet Sprint / Who Am I.
 */
import {
  WhoAmIData,
  WhoAmIPlayer,
  normalizeName,
  primaryNationality,
  positionGroup,
  clubKey,
  PositionGroup,
} from '@/lib/whoAmI';

export { fetchWhoAmIPool } from '@/lib/whoAmI';
export type { WhoAmIData, WhoAmIPlayer } from '@/lib/whoAmI';

/** Clockwise wedge order on a standard dartboard, starting at the top (20). */
export const WEDGE_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;

export const START_SCORE = 501;
export const DARTS_PER_TURN = 3;

export type Ring = 'single' | 'treble' | 'double' | 'miss';

export interface Dart {
  wedge: number; // 1..20, or 0 for a miss
  ring: Ring;
  score: number; // banked points for this dart (0 on a miss / wrong answer)
}

export type CategoryKind = 'nation' | 'club' | 'position' | 'value' | 'wild';

export interface DartCategory {
  id: string;
  label: string; // short chip text, e.g. "Brazil", "Barcelona", "€50M+ value"
  prompt: string; // full instruction, e.g. "Name a player from Brazil"
  kind: CategoryKind;
  /** True when a pool player satisfies this category. */
  test: (p: WhoAmIPlayer, data: WhoAmIData) => boolean;
  /** How many pool players satisfy it (rarity / difficulty signal). */
  count: number;
}

/* ------------------------------------------------------------------ */
/* Board geometry                                                     */
/* ------------------------------------------------------------------ */

/** Angle (degrees, 0 = up / 12 o'clock, increasing clockwise) -> wedge number. */
export function wedgeAtAngle(deg: number): number {
  const a = ((deg % 360) + 360) % 360;
  // Wedge 20 is centered on 0 and spans -9deg..+9deg, so shift by +9 then bucket.
  const idx = Math.floor(((a + 9) % 360) / 18);
  return WEDGE_ORDER[idx];
}

/** Center angle (degrees from top, clockwise) of a wedge's slice. */
export function angleOfWedge(wedge: number): number {
  const idx = WEDGE_ORDER.indexOf(wedge as (typeof WEDGE_ORDER)[number]);
  return idx < 0 ? 0 : idx * 18;
}

export function ringMultiplier(ring: Ring): number {
  return ring === 'treble' ? 3 : ring === 'double' ? 2 : ring === 'single' ? 1 : 0;
}

export function ringLabel(wedge: number, ring: Ring): string {
  if (ring === 'miss') return 'Miss';
  const prefix = ring === 'treble' ? 'Treble ' : ring === 'double' ? 'Double ' : '';
  return `${prefix}${wedge}`;
}

/**
 * Which ring a throw lands in. Ring is mostly luck (you can time the sweep for
 * the wedge you want, but not the depth), weighted like real scattered throws:
 * mostly singles, with a satisfying minority of trebles/doubles and the odd
 * clean miss. A steadier hand (higher `steadiness` 0..1) nudges more trebles.
 */
export function rollRing(rng: () => number, steadiness = 0.5): Ring {
  const treble = 0.12 + steadiness * 0.12; // 0.12..0.24
  const double = 0.14;
  const miss = 0.08 - steadiness * 0.04; // 0.04..0.08
  const r = rng();
  if (r < miss) return 'miss';
  if (r < miss + treble) return 'treble';
  if (r < miss + treble + double) return 'double';
  return 'single';
}

export function dartScore(wedge: number, ring: Ring): number {
  return ring === 'miss' ? 0 : wedge * ringMultiplier(ring);
}

/* ------------------------------------------------------------------ */
/* 501 scoring rules                                                  */
/* ------------------------------------------------------------------ */

export interface ApplyResult {
  remaining: number;
  bust: boolean; // overshot 0 -> dart ignored
  checkout: boolean; // reached exactly 0
}

/**
 * Casual 501: subtract the dart unless it would take you below zero (a bust —
 * the dart is ignored, remaining unchanged). Reaching exactly 0 checks out.
 * The authentic "finish on a double" rule is intentionally dropped so a random
 * ring never softlocks a winning position; overshoot protection keeps the
 * count-down tension.
 */
export function applyDart(remaining: number, score: number): ApplyResult {
  if (score <= 0) return { remaining, bust: false, checkout: false };
  const next = remaining - score;
  if (next < 0) return { remaining, bust: true, checkout: false };
  return { remaining: next, bust: false, checkout: next === 0 };
}

/* ------------------------------------------------------------------ */
/* AI opponent                                                        */
/* ------------------------------------------------------------------ */

export interface AiDifficulty {
  id: 'amateur' | 'pro' | 'legend';
  label: string;
  blurb: string;
  skill: number; // 0..1 chance to "answer" (land a scoring dart)
  steadiness: number; // 0..1 treble bias
}

export const AI_LEVELS: AiDifficulty[] = [
  { id: 'amateur', label: 'Pub Player', blurb: 'Loose arm, misses a fair bit', skill: 0.55, steadiness: 0.25 },
  { id: 'pro', label: 'Tour Pro', blurb: 'Reliable scoring, punishes slow legs', skill: 0.75, steadiness: 0.5 },
  { id: 'legend', label: 'The Nine-Darter', blurb: 'Ruthless. Bring your A game', skill: 0.9, steadiness: 0.8 },
];

/** Simulate one AI turn of up to three darts against its own remaining score. */
export function aiTurn(remaining: number, ai: AiDifficulty, rng: () => number): { darts: Dart[]; remaining: number } {
  let rem = remaining;
  const darts: Dart[] = [];
  for (let i = 0; i < DARTS_PER_TURN; i++) {
    if (rng() > ai.skill) {
      darts.push({ wedge: 0, ring: 'miss', score: 0 });
      continue;
    }
    // Aim high (mostly 20 / 19), occasionally scatter.
    const wedge = rng() < 0.72 ? (rng() < 0.5 ? 20 : 19) : 1 + Math.floor(rng() * 20);
    const ring = rollRing(rng, ai.steadiness);
    const score = dartScore(wedge, ring);
    const res = applyDart(rem, score);
    if (res.bust) {
      darts.push({ wedge, ring: 'miss', score: 0 });
      continue;
    }
    rem = res.remaining;
    darts.push({ wedge, ring, score });
    if (res.checkout) break;
  }
  return { darts, remaining: rem };
}

/* ------------------------------------------------------------------ */
/* Category generation (from the real player pool)                   */
/* ------------------------------------------------------------------ */

const POSITION_LABELS: Record<PositionGroup, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

function titleCaseClub(raw: string): string {
  return raw.trim();
}

/**
 * Build a rich, real category list from the pool. Only categories with enough
 * satisfying players are kept so the board is always answerable, and each is
 * tagged with its count for rarity/difficulty.
 */
export function buildCategories(data: WhoAmIData): DartCategory[] {
  const pool = data.pool;
  const cats: DartCategory[] = [];

  // --- Nations ---
  const natCount = new Map<string, { display: string; n: number }>();
  for (const p of pool) {
    const key = primaryNationality(p.nationality);
    if (!key) continue;
    const display = (p.nationality || '').split(/[/,]/)[0].trim() || key;
    const cur = natCount.get(key);
    if (cur) cur.n += 1;
    else natCount.set(key, { display, n: 1 });
  }
  for (const [key, { display, n }] of natCount) {
    if (n < 4) continue;
    cats.push({
      id: `nation:${key}`,
      label: display,
      prompt: `Name a player from ${display}`,
      kind: 'nation',
      count: n,
      test: (p) => primaryNationality(p.nationality) === key,
    });
  }

  // --- Clubs (career history, displayed by a real current-club spelling) ---
  const clubDisplay = new Map<string, string>();
  for (const p of pool) {
    const key = clubKey(p.club);
    if (key && !clubDisplay.has(key)) clubDisplay.set(key, titleCaseClub(p.club));
  }
  const clubCount = new Map<string, number>();
  for (const p of pool) {
    const hist = data.clubHistory.get(p.name);
    if (!hist) continue;
    for (const key of hist) {
      if (!clubDisplay.has(key)) continue; // only clubs we can name nicely
      clubCount.set(key, (clubCount.get(key) || 0) + 1);
    }
  }
  for (const [key, n] of clubCount) {
    if (n < 4) continue;
    const display = clubDisplay.get(key) as string;
    cats.push({
      id: `club:${key}`,
      label: display,
      prompt: `Name a player who has played for ${display}`,
      kind: 'club',
      count: n,
      test: (p, d) => {
        if (clubKey(p.club) === key) return true;
        const hist = d.clubHistory.get(p.name);
        return hist ? hist.has(key) : false;
      },
    });
  }

  // --- Positions ---
  (['GK', 'DEF', 'MID', 'FWD'] as PositionGroup[]).forEach((g) => {
    const n = pool.filter((p) => positionGroup(p.position) === g).length;
    if (n < 4) return;
    cats.push({
      id: `pos:${g}`,
      label: POSITION_LABELS[g],
      prompt: `Name a ${POSITION_LABELS[g].toLowerCase()}`,
      kind: 'position',
      count: n,
      test: (p) => positionGroup(p.position) === g,
    });
  });

  // --- Value tiers (market value in USD; shown with $) ---
  const tiers: Array<{ min: number; label: string }> = [
    { min: 30_000_000, label: '$30M+ value' },
    { min: 60_000_000, label: '$60M+ value' },
    { min: 100_000_000, label: '$100M+ value' },
  ];
  for (const t of tiers) {
    const n = pool.filter((p) => p.value >= t.min).length;
    if (n < 4) continue;
    cats.push({
      id: `value:${t.min}`,
      label: t.label,
      prompt: `Name a player worth ${t.label.replace(' value', '')}`,
      kind: 'value',
      count: n,
      test: (p) => p.value >= t.min,
    });
  }

  return cats;
}

/** Wildcard used for the bullseye: any real player in the pool counts. */
export const WILD_CATEGORY: DartCategory = {
  id: 'wild',
  label: 'Bullseye — any player',
  prompt: 'Bullseye! Name ANY real player',
  kind: 'wild',
  count: Infinity,
  test: () => true,
};

/**
 * Assign one category to each of the 20 wedges. Nations and clubs are favoured
 * (they are the fun "box2box" prompts), with positions and value tiers mixed in
 * for variety. Deterministic given the same rng so a leg's board is stable.
 */
export function assignBoard(cats: DartCategory[], rng: () => number): Record<number, DartCategory> {
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const nations = shuffle(cats.filter((c) => c.kind === 'nation'));
  const clubs = shuffle(cats.filter((c) => c.kind === 'club'));
  const positions = shuffle(cats.filter((c) => c.kind === 'position'));
  const values = shuffle(cats.filter((c) => c.kind === 'value'));

  // Target mix across 20 wedges (falls back gracefully if a bucket is short).
  const picks: DartCategory[] = [];
  const take = (src: DartCategory[], k: number) => {
    for (let i = 0; i < k && src.length; i++) picks.push(src.shift() as DartCategory);
  };
  take(nations, 9);
  take(clubs, 6);
  take(positions, 3);
  take(values, 2);

  // Backfill from anything left if some buckets were thin.
  const leftovers = shuffle([...nations, ...clubs, ...positions, ...values]);
  while (picks.length < 20 && leftovers.length) picks.push(leftovers.shift() as DartCategory);
  // Last resort: repeat categories so all 20 wedges are covered.
  while (picks.length < 20 && cats.length) picks.push(cats[picks.length % cats.length]);

  const board = shuffle(picks).slice(0, 20);
  const map: Record<number, DartCategory> = {};
  WEDGE_ORDER.forEach((w, i) => {
    map[w] = board[i] ?? WILD_CATEGORY;
  });
  return map;
}

/* ------------------------------------------------------------------ */
/* Answer validation                                                  */
/* ------------------------------------------------------------------ */

export type ResolveKind = 'hit' | 'wrongcat' | 'ambiguous' | 'used' | 'notfound';

export interface ResolveResult {
  kind: ResolveKind;
  player?: WhoAmIPlayer;
}

/**
 * Resolve a typed answer against the pool for a given category. A full name
 * always works; a bare surname works when it is unambiguous (or when exactly
 * one candidate fits the category). Players already named this leg are blocked
 * so you can't spam one name.
 */
export function resolveAnswer(
  data: WhoAmIData,
  cat: DartCategory,
  typed: string,
  used: Set<string>,
): ResolveResult {
  const q = normalizeName(typed);
  if (q.length < 2) return { kind: 'notfound' };

  let matches = data.pool.filter((p) => normalizeName(p.name) === q);
  if (!matches.length) {
    matches = data.pool.filter((p) => {
      const n = normalizeName(p.name);
      const words = n.split(' ');
      return words.includes(q) || n.endsWith(' ' + q);
    });
  }
  if (!matches.length) {
    matches = data.pool.filter((p) => normalizeName(p.name).includes(q));
  }
  if (!matches.length) return { kind: 'notfound' };

  const fresh = matches.filter((p) => !used.has(p.name));
  if (!fresh.length) return { kind: 'used' };

  if (fresh.length > 1) {
    const satisfying = fresh.filter((p) => cat.test(p, data));
    if (satisfying.length === 1) return { kind: 'hit', player: satisfying[0] };
    if (satisfying.length === 0) return { kind: 'wrongcat', player: fresh[0] };
    return { kind: 'ambiguous' };
  }

  const p = fresh[0];
  return cat.test(p, data) ? { kind: 'hit', player: p } : { kind: 'wrongcat', player: p };
}

/** A couple of example valid answers for a category (used for the reveal hint). */
export function sampleAnswers(data: WhoAmIData, cat: DartCategory, n = 3): string[] {
  const out: string[] = [];
  for (const p of data.pool) {
    if (cat.test(p, data)) {
      out.push(p.name);
      if (out.length >= n) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                       */
/* ------------------------------------------------------------------ */

/** Small deterministic PRNG (mulberry32) so a leg can be reproduced/seeded. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function checkoutHint(remaining: number): string {
  if (remaining > 60) return 'Aim big — trebles on 20 or 19.';
  if (remaining <= 0) return 'Checked out!';
  return `Need ${remaining}. Land it exactly — overshoot busts the dart.`;
}
