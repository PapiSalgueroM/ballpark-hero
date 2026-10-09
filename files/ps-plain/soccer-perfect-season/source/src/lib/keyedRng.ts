/* ─── Round 796: a random stream keyed to a string ─────────────────────────

   The careers draw a season from one seeded stream, and every harness that
   samples a seeded career replays that stream. Anything that rolls inside a
   season but is not the season itself (the rival choice roll, the inbox) and
   draws from that stream shifts every draw after it, so a round that only
   adds a text or a choice would quietly reshuffle every seeded career on the
   site. Those rolls draw from here instead: the same key always gives the
   same numbers, and the season's stream is left exactly as it was.

   A 32 bit FNV-1a hash of the key seeds a mulberry32 generator. This is the
   generator careerRivalryChoices.ts shipped as seasonChoiceRng, moved here
   unchanged so the inbox can share it rather than carry a second copy. */

export function keyedRng(key: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
