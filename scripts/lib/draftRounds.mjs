/* Where each NFL draft's first round ends, derived from the draft table itself.

   Round 611. nfl_draft_picks carries a round column that cannot be trusted as
   a verdict: the scrape defaults an unparsed round to 1, so thousands of rows
   are filed as first rounders with picks in the hundreds (1982 files picks
   252 to 257 as round 1). Rounds 2 and later are internally consistent, so the
   one fact the round column CAN give is where round two starts. The first
   round is every pick before that.

   THE RULE. For each draft year, firstRoundEnds is the smallest pick among
   that year's round two rows, minus 1. A year with no round two rows gets
   null (measured 2026-09-15: 1942 to 1945, 1949, 1951 to 1955 and 1957 to
   1969; every draft from 1970 has a boundary), and a pick from a null year
   is never judged either way.

   The raw round column is never used as a verdict anywhere that imports this
   module. The College Grid key (scripts/genCollegeGridData.mjs) uses it now;
   the NFL grid key (Round 614) imports the same module so the two keys can
   never disagree about who went in the first round.

   ROW CLEANING lives here too, for the same reason: both keys must read the
   same rows. The table holds placeholder rows for forfeited selections (their
   "player" is a sentence about the forfeit) and repeated imports of whole
   drafts (2024 and 2025 appear three times over). cleanDraftPicks drops the
   forfeit rows, then keeps one row per (year, pick), the lowest id.
*/

/** A placeholder row for a forfeited selection, not a player. */
export function isForfeitRow(row) {
  return /forfeit/i.test(String(row?.player_name ?? ''));
}

/** Forfeit rows dropped, then one row per (year, pick): the lowest id wins. */
export function cleanDraftPicks(rows) {
  const byKey = new Map();
  for (const r of rows) {
    if (isForfeitRow(r)) continue;
    const year = Number(r.year);
    const pick = Number(r.pick);
    if (!Number.isInteger(year) || !Number.isInteger(pick) || pick <= 0) continue;
    const key = `${year}|${pick}`;
    const have = byKey.get(key);
    if (!have || Number(r.id) < Number(have.id)) byKey.set(key, r);
  }
  return [...byKey.values()].sort((a, b) => Number(a.year) - Number(b.year) || Number(a.pick) - Number(b.pick));
}

/** Map of draft year to the last first round pick, or null when the year has no round two rows. */
export function firstRoundEnds(picks) {
  const ends = new Map();
  for (const r of picks) {
    const year = Number(r.year);
    const pick = Number(r.pick);
    if (!Number.isInteger(year)) continue;
    if (!ends.has(year)) ends.set(year, null);
    if (Number(r.round) === 2 && Number.isInteger(pick) && pick > 0) {
      const cur = ends.get(year);
      if (cur === null || pick - 1 < cur) ends.set(year, pick - 1);
    }
  }
  return ends;
}

/** true when the pick is inside its year's first round, false when past it, null when the year has no boundary. */
export function inFirstRound(year, pick, ends) {
  const end = ends.get(Number(year));
  if (end === null || end === undefined || !Number.isInteger(Number(pick))) return null;
  return Number(pick) <= end;
}
