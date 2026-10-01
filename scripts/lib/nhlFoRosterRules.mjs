/**
 * Round 830: the NHL Front Office roster rules, in one place.
 *
 * Pure functions over scripts/data/nhlRosters2026.json. The generator
 * (scripts/genNhlFrontOfficeRoster.mjs), the second source spot check
 * (scripts/checkNhlFoRosterEspn.mjs) and the fence (scripts/simNhlFullRosters.mjs)
 * all import these, so the rule that built the file and the rule that checks it
 * cannot drift apart.
 *
 * THE RATING RULE. It is the rule of the Aug 5 2026 bake (src/data/nhlFoPlayers.ts,
 * whose script was never committed), recovered and proven: run over the same
 * 2025-26 lines it gives the exact rating that file printed for every one of its
 * rated rows (the fence re-proves this on every run). Per position:
 *   - Forwards (C, L, R): among every forward with 30 or more 2025-26 regular
 *     season games, his points per game percentile, counted as the share of that
 *     pool strictly below him over (pool size minus one), mapped onto 66 to 97 and
 *     rounded.
 *   - Defensemen: the same among defensemen with 30 or more games, onto 66 to 95.
 *   - Goalies: among goalies with 15 or more games, 60 percent his save
 *     percentage percentile plus 40 percent his wins percentile, onto 66 to 95.
 *   - Anyone under his threshold, or with no 2025-26 NHL line at all (rookies, men
 *     back from a lost season), is NOT guessed: he gets the old file's stand in of
 *     68 and is marked partial, so the game can say so.
 *
 * THE 23 RULE. The NHL's active roster limit is 23. A club whose published
 * roster is at or under 23 on the day read keeps every man on it, never padded.
 * A club still carrying a training camp roster keeps 23 by a stated order, the
 * one thing the record cannot settle on its own: the 2 goalies, 12 forwards and 6
 * defensemen with the most 2025-26 NHL games, then the 3 remaining skaters with
 * the most games. Ties go to the higher rating, then the lower NHL id. Every man
 * this leaves out is written to scripts/data/nhlRosters2026LeftOut.json with the
 * reason.
 */

export const ACTIVE_LIMIT = 23;
export const PARTIAL_RATING = 68;
const KEEP_AT_LEAST = { G: 2, F: 12, D: 6 };

export const groupOf = pos => (pos === 'G' ? 'G' : pos === 'D' ? 'D' : 'F');
/** The game's position letters: left and right wing fold into W, as the Aug 5 bake did. */
export const gamePos = pos => (pos === 'L' || pos === 'R' ? 'W' : pos);

/** Whole years between a YYYY-MM-DD birth date and the YYYY-MM-DD day read. */
export function ageOn(birthDate, day) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = day.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Share of the pool strictly below v, over (pool size minus one). */
function pctBelow(pool, v) {
  let below = 0;
  for (const x of pool) if (x < v) below += 1;
  return below / (pool.length - 1);
}

/** Every rating the record supports, keyed by NHL player id. */
export function buildRatings(stats) {
  const skaters = new Map(stats.skaters.map(s => [s.id, s]));
  const goalies = new Map(stats.goalies.map(s => [s.id, s]));
  const fPool = stats.skaters.filter(s => s.pos !== 'D' && s.gp >= 30).map(s => s.pts / s.gp);
  const dPool = stats.skaters.filter(s => s.pos === 'D' && s.gp >= 30).map(s => s.pts / s.gp);
  const gRows = stats.goalies.filter(s => s.gp >= 15);
  const svPool = gRows.map(s => s.sv / s.sa);
  const wPool = gRows.map(s => s.w);
  /** { ovr, partial, gp, why } for one rostered man. */
  return function rate(p) {
    const g = groupOf(p.pos);
    if (g === 'G') {
      const s = goalies.get(p.id);
      if (!s || s.gp < 15) return { ovr: PARTIAL_RATING, partial: true, gp: s?.gp ?? 0, why: s ? `${s.gp} games in goal in 2025-26, under the 15 the rule needs` : 'no 2025-26 NHL games in goal' };
      const blend = 0.6 * pctBelow(svPool, s.sv / s.sa) + 0.4 * pctBelow(wPool, s.w);
      return { ovr: Math.round(66 + blend * (95 - 66)), partial: false, gp: s.gp, why: null };
    }
    const s = skaters.get(p.id);
    if (!s || s.gp < 30) return { ovr: PARTIAL_RATING, partial: true, gp: s?.gp ?? 0, why: s ? `${s.gp} games in 2025-26, under the 30 the rule needs` : 'no 2025-26 NHL games' };
    const top = g === 'D' ? 95 : 97;
    return { ovr: Math.round(66 + pctBelow(g === 'D' ? dPool : fPool, s.pts / s.gp) * (top - 66)), partial: false, gp: s.gp, why: null };
  };
}

/** The keep or leave decision for one club. Returns { kept, leftOut } with reasons. */
export function chooseTwentyThree(players, rate) {
  const rated = players.map(p => ({ p, r: rate(p) }));
  if (rated.length <= ACTIVE_LIMIT) return { kept: rated, leftOut: [] };
  const order = (a, b) => b.r.gp - a.r.gp || b.r.ovr - a.r.ovr || a.p.id - b.p.id;
  const sorted = [...rated].sort(order);
  const kept = new Set();
  for (const g of ['G', 'F', 'D']) {
    for (const x of sorted.filter(x => groupOf(x.p.pos) === g).slice(0, KEEP_AT_LEAST[g])) kept.add(x);
  }
  for (const x of sorted) {
    if (kept.size >= ACTIVE_LIMIT) break;
    if (!kept.has(x) && groupOf(x.p.pos) !== 'G') kept.add(x);
  }
  const leftOut = sorted.filter(x => !kept.has(x)).map(x => ({
    ...x,
    reason: `club still carried ${rated.length} on its published roster; outside the 23 kept by 2025-26 NHL games (${x.r.gp} games)`,
  }));
  return { kept: sorted.filter(x => kept.has(x)), leftOut };
}

/** The five clubs and ten men a club the second source checks: a fixed rule, written down. */
export const SPOT_CHECK_RULE = 'the 6th, 12th, 18th, 24th and 30th clubs in alphabetical order of abbreviation, and on each the first ten kept men in alphabetical order of surname then first name';
export function spotCheckClubs(abbrs) {
  const sorted = [...abbrs].sort();
  return [5, 11, 17, 23, 29].map(i => sorted[i]);
}
export function spotCheckMen(kept) {
  const surname = p => p.name.split(' ').slice(1).join(' ');
  return [...kept].sort((a, b) => surname(a).localeCompare(surname(b), 'en') || a.name.localeCompare(b.name, 'en') || a.id - b.id).slice(0, 10);
}
/** Names compared without accents, case or punctuation, which differ between sources. */
export const nameKey = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
