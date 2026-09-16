/**
 * Round 620: the shared career engine.
 *
 * WHY THIS FILE EXISTS, measured rather than asserted. The four my career
 * games (`nbaMyCareer` 899 lines, `nflMyCareer` 1042, `mlbMyCareer` 995,
 * `nhlMyCareer` 937) export 36 to 38 symbols each, and 24 of those names are
 * common to all four once the sport prefix is stripped: the career state, the
 * season line, the event shape, archetypes, eras, career start, season
 * simulation, progression, the free agency and extension talks, spending and
 * net worth, retirement, and the legacy verdict. That is roughly two thirds of
 * about 3,900 lines being one idea written four times, which is the same shape
 * as the Round 426 roster bug that had to be fixed twice because two games
 * were two copies of one idea.
 *
 * Sharing had already started before this round and is what proves the
 * direction rather than my opinion of it: `repairNetWorth` is generic,
 * `careerVariance.ts`, `careerRival.ts`, `careerInbox.ts` and
 * `careerRivalryEvents.ts` are already shared modules bound per sport.
 *
 * WHAT THIS FILE DELIBERATELY IS NOT. It is not a rewrite of those four games,
 * and it does not try to be the union of everything they do. It holds only the
 * pieces Fight Career actually uses, so nothing here is speculative surface
 * built for a caller that does not exist. The four live games adopt it one per
 * round in Rounds 621 to 624, each proving byte identical career outcomes on a
 * fixed seed before and after, because the gates cannot tell a silent
 * behaviour change from a correct one and four games is too much to risk at
 * once for no immediate player benefit.
 */

/**
 * mulberry32. The canonical one in `dateUtils.ts` is a private function there,
 * and this repo already carries copies in `cbbGrid`, `conquestDaily`,
 * `faceOff` and `clubManager`, so this is the exported home rather than a
 * seventh copy. Round 212's lesson applies: a multiplicative Lehmer step
 * seeded from a short label does not scatter well enough, so use this.
 */
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32 bit hash of a label, so a seed can come from a save name or a date. */
export function hashLabel(s: string): number {
  let h = 7;
  for (let i = 0; i < (s || 'x').length; i += 1) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampi(v: number, lo: number, hi: number): number {
  return Math.round(clamp(v, lo, hi));
}

/**
 * A generated person's name from injected pools.
 *
 * The pools are the parameter on purpose. `cfbGenName` and `cbbGenName`
 * already exist and are the same function twice over two different word lists,
 * which is the duplication this file is against. The lists genuinely differ per
 * sport, so the DATA is injected and the function is shared. Those two adopt
 * this in their migration rounds; they are not touched here.
 */
export function genPersonName(rng: () => number, first: string[], last: string[]): string {
  const f = first[Math.floor(rng() * first.length)];
  const l = last[Math.floor(rng() * last.length)];
  return `${f} ${l}`;
}

/**
 * How much of an athlete is left at a given age, as a multiplier around 1.
 *
 * Flat while he is climbing, 1 at his peak, then falling away past the cliff,
 * and falling faster the further past it he goes. Round 96 and Round 116 are
 * the reason the shape is a curve rather than a step: growth that ignores
 * headroom and decline that arrives all at once both read as broken to a
 * player who can see the number.
 */
export function declineAt(age: number, peak: number, cliff: number): number {
  if (age <= peak) return 1;
  if (age <= cliff) return 1 - (age - peak) * 0.012;
  const past = age - cliff;
  return clamp(1 - (cliff - peak) * 0.012 - past * 0.038 - past * past * 0.004, 0.42, 1);
}

export interface LegacyVerdict {
  score: number;
  tier: string;
  hof: boolean;
  bullets: string[];
}

/**
 * The tier ladder every career game ends on. The top rung is deliberately hard
 * to reach: an ending that congratulates everybody is not an ending.
 */
export function legacyTier(score: number): { tier: string; hof: boolean } {
  if (score >= 92) return { tier: 'All Time Great', hof: true };
  if (score >= 78) return { tier: 'Hall of Famer', hof: true };
  if (score >= 62) return { tier: 'Modern Great', hof: false };
  if (score >= 46) return { tier: 'Solid Pro', hof: false };
  if (score >= 28) return { tier: 'Journeyman', hof: false };
  return { tier: 'Footnote', hof: false };
}
