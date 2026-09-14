/**
 * Round 582: the league pieces two games share, with no imports at all.
 *
 * Rebuild Challenge has played a round robin season since it shipped, and Stadium
 * Tycoon's league (docs/design/round-580-tycoon-merge.md, section 8) plays the
 * same calendar and orders the same table. The house rule is one engine, so the
 * two functions moved here verbatim and src/lib/rebuildDeck.ts imports them back.
 * Importing rebuildDeck.ts directly from the tycoon would have dragged squadDeal
 * and the player types onto the stadium's first load.
 *
 * The seeded stream and the hash live here for the same reason: the exported
 * copies elsewhere sit in modules that import Supabase or the daily record.
 */

/** A calendar, round by round (the circle method), then the reverse fixtures.
 *  Every team plays once a round, so a run of results is a run in time and
 *  "longest unbeaten" means what it says. */
export function roundRobinCalendar(n: number): [number, number][] {
  const teams = Array.from({ length: n }, (_, i) => i);
  if (n % 2 === 1) teams.push(-1);
  const half = teams.length / 2;
  const firstLeg: [number, number][] = [];
  for (let round = 0; round < teams.length - 1; round++) {
    for (let k = 0; k < half; k++) {
      const a = teams[k];
      const b = teams[teams.length - 1 - k];
      if (a === -1 || b === -1) continue;
      // Alternate home advantage so the fixed first team does not host every round.
      firstLeg.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    teams.splice(1, 0, teams.pop() as number);
  }
  return [...firstLeg, ...firstLeg.map(([h, a]): [number, number] => [a, h])];
}

/** Points, then goal difference, then goals for. */
export const tableOrder = <T extends { pts: number; gf: number; ga: number }>(a: T, b: T): number =>
  b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;

/** mulberry32: a seeded stream in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32 bit hash of a few whole numbers, order sensitive. */
export function hash32(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h ^= p | 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}
