/* Round 1339: the own club market rule as text edits of src/lib/clubManager.ts. Composed NOWHERE by default.
 *
 * THE RULE. Since Round 1339 the transfer market lists nobody at the club you manage in EVERY career, seeded or
 * not, the same as your club's page (ClubDetailScreen, Release BE): your club is your squad. Before it, a career
 * with no world seed (every career started before Release AZ, and a Manager Hot Seat day handed over) listed the
 * projected world's men at your own club who are not in your squad.
 *
 * EDITS, each failing closed with a thrown error naming the file and the count unless its anchor stands exactly
 * once (every text is read with CRLF turned to LF first):
 *   withRuleToday(text)     main's line (LEGACY_LINE) to the rule (RULE_LINE): the probe of step 2
 *   withLegacyToday(text)   RULE_LINE back to LEGACY_LINE: the parent arm, and control =legacy
 *   withRulePreAz(text)     in an engine from before Release AZ (36cc9ffe, b6eb78e7, or the gate's tree without the
 *                           AZ merge), buildMarket's predicate gains `p.club !== career.clubName && `: the bridge
 *                           of scripts/simCmUnseededWorld.mjs and scripts/simManagerWorldContinuity.mjs. Filtering
 *                           keeps order, so filter(club) then filter(rest) on this tree and filter(club and rest)
 *                           there give the same list from the same marketBase rows.
 *   withSlice119(text)      generateHeadlines draws from the first 119 rows, not 120: control =slice
 *   withShallowSquad(text)  buildSquad keeps the bake's first 9 men, not 26: control =shallow
 * Each takes an optional receipts array and pushes { file, from, to, count } to it.
 *
 *   import { withRuleToday } from './lib/cmOwnClubMarket1339.mjs';
 */
export const FILE = 'src/lib/clubManager.ts';
export const LEGACY_LINE = '  if (!held) return worldSeedOf(career) === undefined ? fallback : fallback.filter(p => p.club !== career.clubName);\n';
export const RULE_LINE = '  if (!held) return fallback.filter(p => p.club !== career.clubName);\n';
export const PRE_AZ_ANCHOR = '  return marketBase(yearsOn(career), career.eraId)\n    .filter(p => !squadNames.has(p.name)';
export const PRE_AZ_RULE = '  return marketBase(yearsOn(career), career.eraId)\n    .filter(p => p.club !== career.clubName && !squadNames.has(p.name)';
export const SLICE_ANCHOR = '  const candidates = shuffle(market.slice(0, 120)).slice(0, count);\n';
export const SLICE_TO = '  const candidates = shuffle(market.slice(0, 119)).slice(0, count);\n';
export const SHALLOW_ANCHOR = '    ? baked.slice(0, 26).map(bakedToCMPlayer)\n';
export const SHALLOW_TO = '    ? baked.slice(0, 9).map(bakedToCMPlayer)\n';

export const lf = text => text.split('\r\n').join('\n');

/** Replaces `from` with `to` in `source`, failing closed unless `from` stands exactly once. */
export function once(source, from, to, what, receipts) {
  const text = lf(source);
  const count = text.split(from).length - 1;
  if (count !== 1 || from === to) throw new Error(`cmOwnClubMarket1339 ${what}: its anchor is in ${FILE} ${count} times, it must be exactly once`);
  const out = text.replace(from, () => to);
  if (out === text) throw new Error(`cmOwnClubMarket1339 ${what}: the edit changed nothing`);
  if (receipts) receipts.push({ file: FILE, what, from, to, count });
  return out;
}
export const withRuleToday = (text, receipts) => once(text, LEGACY_LINE, RULE_LINE, 'rule', receipts);
export const withLegacyToday = (text, receipts) => once(text, RULE_LINE, LEGACY_LINE, 'legacy', receipts);
export const withRulePreAz = (text, receipts) => once(text, PRE_AZ_ANCHOR, PRE_AZ_RULE, 'pre AZ rule', receipts);
export const withSlice119 = (text, receipts) => once(text, SLICE_ANCHOR, SLICE_TO, 'slice', receipts);
export const withShallowSquad = (text, receipts) => once(text, SHALLOW_ANCHOR, SHALLOW_TO, 'shallow', receipts);
/** Which of the two lines this text carries: 'rule', 'legacy', or null (neither, or both). */
export function lineOf(text) {
  const t = lf(text);
  const rule = t.split(RULE_LINE).length - 1, legacy = t.split(LEGACY_LINE).length - 1;
  return rule === 1 && legacy === 0 ? 'rule' : legacy === 1 && rule === 0 ? 'legacy' : null;
}
