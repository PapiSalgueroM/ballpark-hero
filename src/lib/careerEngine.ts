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
 * ROUND 621 MEASURED THAT LAST SENTENCE AND IT IS WRONG. The 25 shared names
 * are real; the shared code is not. Two of the eleven comparable common
 * functions are identical in all four and one in three, and the other eight
 * are genuinely different per sport. Read the Round 621 header further down
 * before planning any more of this work: the paragraph above is what was
 * believed when this file was created, kept because Rounds 622 to 624 were
 * scoped on it and somebody should be able to see why.
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

/* ══════════════════════════════════════════════════════════════════════════ */
/* Round 621: the first of the four my career games adopts this file, and the  */
/* measurement that had to happen first.                                       */
/*                                                                             */
/* Round 620 recorded that the four games "share 24 exported symbol names once */
/* the sport prefix is stripped, which is about two thirds of 3,900 lines      */
/* being one idea written four times". The first half is right: 25 names are   */
/* common to all four. The second half is not, and it matters, because Rounds  */
/* 622 to 624 were scoped on it.                                               */
/*                                                                             */
/* MEASURED over the eleven common functions whose bodies can be compared,     */
/* with comments, whitespace and the sport prefix normalised away:             */
/*                                                                             */
/*   identical in all four   2   repairNetWorth, eraById                       */
/*   identical in three      1   rollTeamQuality (NFL differs by five numbers) */
/*   genuinely different     8   shouldRetire, careerTotals, marketSalary,     */
/*                               legacyOf, progress, assignRole, campBattle,   */
/*                               teamLabelOf                                   */
/*                                                                             */
/* Shared NAMES are not shared CODE. legacyOf is the clearest case: the NFL    */
/* scores an unbounded total with Canton at 520 and the shared legacyTier above */
/* is a 0 to 100 ladder, so "sharing" it would change every verdict in the      */
/* game rather than lift anything. The heavy machinery these four have in       */
/* common was already shared years of rounds ago, through careerVariance,       */
/* careerAwards, careerRival, usCareerFreeAgency, usCareerExtension,            */
/* usCareerPress, careerMoney, careerInbox and careerRivalryEvents. What is     */
/* left per sport is the sport.                                                */
/*                                                                             */
/* So this is what there actually was to lift, and it is one small round        */
/* rather than four large ones. See docs/PROJECT-STATE.md for what that means   */
/* for 622 to 624.                                                             */
/* ══════════════════════════════════════════════════════════════════════════ */

/**
 * What a professional keeps out of a contract after tax and the agent, in all
 * four leagues. It was a private `const TAKE_HOME = 0.45` in each of the four
 * files, at the same value, feeding the same two lines of net worth arithmetic.
 */
export const TAKE_HOME = 0.45;

/**
 * Rebuild a net worth that a save is missing or that went negative.
 *
 * This was four byte identical copies. `careerEngine`'s own header already
 * called it generic in Round 620; this round actually moves it.
 */
export function repairNetWorth<T extends { netWorth?: number; earnings: number; purchased?: string[] }>(
  c: T,
  costOf: (id: string) => number,
): T {
  if ((c.netWorth ?? 0) >= 0) return c;
  const spent = (c.purchased ?? []).reduce((sum, id) => sum + costOf(id), 0);
  const rebuilt = Math.max(0, Math.round((c.earnings * TAKE_HOME - spent) * 10) / 10);
  return { ...c, netWorth: rebuilt };
}

/** The five numbers that make one league's roster churn differ from another's. */
export interface TeamQualityBand {
  /** The floor of the opening draw. */
  base: number;
  /** How wide the opening draw is above that floor. */
  span: number;
  /** How far a roster can swing in either direction between seasons. */
  drift: number;
  min: number;
  max: number;
}

/**
 * How good the team around you is this season.
 *
 * The NBA, MLB and NHL copies were byte identical and the NFL's differed only
 * in these five numbers, which is the shape the owner asked for on 2026-09-04:
 * the DATA differs per sport and the function is shared. The arithmetic is
 * unchanged from the copies it replaces, `rng()` is drawn exactly once on each
 * path and in the same order, so a fixed seed produces the identical sequence
 * it did before. `simCareerEngineParity` proves that against the pre migration
 * source rather than against a recorded number.
 */
export function rollTeamQuality(prev: number | null, rng: () => number, band: TeamQualityBand): number {
  if (prev == null) return band.base + Math.floor(rng() * band.span);
  return Math.max(band.min, Math.min(band.max, Math.round(prev + (rng() * (band.drift * 2) - band.drift))));
}

/**
 * The era a save is playing in, or the default when it names one that has been
 * retired or was never there. Four identical one line lookups over four
 * different lists, so the list is the parameter.
 */
export function eraById<T extends { id: string }>(list: T[], id?: string): T {
  return list.find(e => e.id === id) ?? list[0];
}
