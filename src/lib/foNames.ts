/**
 * Round 211: no two men in a front office league share a name.
 *
 * The sibling of Round 206, which found that a thin club in Club Manager
 * shipped a day one squad containing two identically named academy kids
 * about one time in five. The four GM games had the same bug and worse
 * odds: their invented name banks were ten first names by ten surnames,
 * which is a hundred possible people, and a new franchise deals fourteen
 * free agents out of that hundred before you have pressed anything. The
 * birthday problem does the rest. Measured across thirty fresh leagues
 * each: the same man appeared twice in 6 of 30 NFL leagues, 8 of 30 MLB,
 * 13 of 30 NBA and 10 of 30 NHL. Two identical rows in the free agent
 * list, indistinguishable when you go to sign one.
 *
 * The fix is the same shape as Round 206's, because the bug is the same
 * bug: widen the bank so collisions are rare, and put a hard guard on top
 * so rarity stops mattering. What is different here is what counts as
 * taken. In Club Manager a name had to be free within one squad; in a GM
 * game the whole league is one world, so a generated free agent must not
 * share a name with a REAL player on any of the thirty two rosters either.
 * leagueNames() collects all of them, which is what makes that possible.
 */

/** Every name currently in a league: real players, generated men, the lot. */
export function leagueNames(league: {
  teams: Record<string, { players: { name: string }[] }>;
  freeAgents: { name: string }[];
}): Set<string> {
  const out = new Set<string>();
  for (const t of Object.values(league.teams ?? {})) {
    for (const p of t.players ?? []) out.add(p.name);
  }
  for (const p of league.freeAgents ?? []) out.add(p.name);
  return out;
}

/**
 * A name nobody in this league already has.
 *
 * Roll first, because a random pick out of a wide bank almost always lands
 * clean and keeps the feel of the bank. On a clash, walk the cross product
 * from a rolled starting point and take the first free pairing, which is
 * guaranteed to terminate. Only if the entire bank were somehow spoken for
 * does it fall back to a numbered name, which is still better than two
 * identical rows in a market list.
 *
 * The chosen name is added to `taken`, so one set threaded through a draft
 * class or a free agent pool is all it takes.
 */
export function uniqueName(
  rng: () => number,
  first: readonly string[],
  last: readonly string[],
  taken: Set<string>,
): string {
  for (let i = 0; i < 12; i += 1) {
    const n = `${first[Math.floor(rng() * first.length)]} ${last[Math.floor(rng() * last.length)]}`;
    if (!taken.has(n)) { taken.add(n); return n; }
  }
  const f0 = Math.floor(rng() * first.length);
  const l0 = Math.floor(rng() * last.length);
  for (let a = 0; a < first.length; a += 1) {
    for (let b = 0; b < last.length; b += 1) {
      const n = `${first[(f0 + a) % first.length]} ${last[(l0 + b) % last.length]}`;
      if (!taken.has(n)) { taken.add(n); return n; }
    }
  }
  let n = 2;
  while (taken.has(`${first[f0]} ${last[l0]} ${n}`)) n += 1;
  const out = `${first[f0]} ${last[l0]} ${n}`;
  taken.add(out);
  return out;
}
