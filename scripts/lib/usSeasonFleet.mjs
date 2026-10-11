/**
 * Round 1300: the seeded fleet of the US careers, lifted out of scripts/simUsSeasonCentre.mjs so that a second
 * harness (scripts/simUsPostseason.mjs) plays the very same careers and not a copy of the loop.
 *
 * A PURE MOVE. The body of playCareer below is the one that harness held, line for line; the only change is
 * where its two outside names come from: the bundle (M) and the sport table (SPORT_DEFS) are handed in instead
 * of being read from the harness's own scope. The proof is that harness's digest mode: its `careers` digest is
 * a sha1 over the hash this function returns after every season of every career, so one draw moved, one call
 * reordered or one field of a career changed turns `US_SEASON_DIGEST=compare` red.
 *
 * What a caller's SPORT_DEFS row must hold for a sport: `binding` (the name of the career binding in the
 * bundle), `positions`, `eras` and `targetedFrom: { era, year }`. A targeted career is a throwback career whose
 * `year` is advanced before its first season, so it reaches the seasons organic careers rarely do; that is not
 * how a player gets there, and every harness that uses one says so and counts those seasons apart.
 *
 * No network, no file read, nothing evaluated at import but two function definitions.
 */
import { createHash } from 'node:crypto';

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hashOf = v => createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);

/** The fleet's one loop, bound to a bundle and a sport table. */
export function usSeasonFleet(M, SPORT_DEFS) {
/** Plays one career to retirement with the binding's own calls. `onSeason(c, line)`
 *  runs right after each season with Math.random swapped for a counting trap
 *  that forwards to the career's generator. Returns a hash a season. */
function playCareer(slug, i, seedset, targeted, onSeason, trap) {
  const d = SPORT_DEFS[slug];
  const SB = M[d.binding];
  const rng = mulberry32(i * 7919 + 11 + seedset * 100003 + (targeted ? 500009 : 0) + (slug === 'nfl' ? 77 : 0));
  const real = Math.random;
  Math.random = rng;
  const hashes = [];
  try {
    const pos = d.positions[i % d.positions.length];
    const eraId = targeted ? d.targetedFrom.era : d.eras[Math.floor(i / d.positions.length) % d.eras.length];
    const archs = SB.create.archetypes[pos];
    const c = SB.startCareer(`${targeted ? 'Late' : 'Week'} ${seedset}.${i}`, pos, archs[i % archs.length], rng, null, eraId);
    if (targeted) c.year = d.targetedFrom.year;
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let guard = 0; guard < 34 && !c.retired; guard += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(SB.suspendedLine(c));
        SB.progress(c, rng);
        hashes.push(hashOf(c));
        continue;
      }
      if (c.contractYears <= 0) {
        const fa = SB.buildFaWindow(c, tq, rng);
        const offer = fa.offers.find(o => !o.gone) ?? fa.offers[0];
        if (offer) { M.applyFaSigning(c, offer); SB.campBattle(c, offer.quality, rng); tq = offer.quality; }
      }
      SB.campBattle(c, tq, rng);
      const { line } = SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      if (onSeason) {
        Math.random = () => { trap.count += 1; return rng(); };
        try { onSeason(c, line, { slug, i, seedset, targeted, eraId, pos }); } finally { Math.random = rng; }
      }
      hashes.push(hashOf(c));
      if (SB.shouldRetire(c)) { c.retired = true; break; }
      const ev = SB.drawEvent(c, rng);
      if (ev && ev.options.length) ev.options[0].apply(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
  } finally { Math.random = real; }
  return hashes;
}
  return { playCareer };
}
