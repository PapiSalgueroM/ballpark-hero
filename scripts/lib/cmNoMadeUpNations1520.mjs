/* Round 1520: the bridge, for attribution only. No engine composes it; only the kits named below do.
 *
 * WHAT IT DOES. Round 1520 gives every made up Club Manager man a country of his own (CMPlayer.nation, drawn by
 * madeUpNationAt), counts it in the board's country ask, carries the made up mark with a man bought in a career with
 * no world seed, and sends a released or expired youth or academy man to the free agent pool marked. Every kit that
 * compares this engine with one pinned from before the round sees those, so this takes them back out of a COPY of the
 * engine and such a kit compares everything else: no country is ever drawn (madeUpNationAt answers undefined, and a
 * promoted scouted boy takes none), the board counts by the verified map alone, a buy carries the mark as before,
 * the pool gets a man's own generated flag, and the Welsh and Canadian clubs the review placed in their own country
 * read their league's country again. scripts/simCmMadeUpNations.mjs section 7 (NONATION, the same cut) proves
 * the engine with it plays as its base, draw for draw and byte for byte, the made up mark aside; with BASE_ROOT it
 * plays as the base tree itself.
 * Composed by scripts/simManagerWorldContinuity.mjs (its current arm) and scripts/simCmWorldMoves.mjs (every head).
 *
 * TWELVE EDITS in two files, failing closed: each anchor must stand exactly once (line endings read as LF), or nothing
 * is changed and the caller is told (a thrown error). Any other file comes back as it is.
 *
 *   import { withoutMadeUpNations, BRIDGE_FILES_1520 } from './lib/cmNoMadeUpNations1520.mjs';   (source, file) => source
 */
const ENGINE = 'src/lib/clubManager.ts';
const ASKS = 'src/lib/clubManagerBoardAsks.ts';
export const BRIDGE_FILES_1520 = [ENGINE, ASKS];
export const BRIDGE_EDITS_1520 = [
  [ENGINE, 'no country is drawn',
    '  if (!place) return undefined;\n  const counts = nationCountsAt(place, eraId);',
    '  if (place || !place) return undefined;\n  const counts = nationCountsAt(place, eraId);'],
  [ENGINE, 'a scouted boy takes no country', "pr.source !== 'Academy' && pr.source ? mapSpelling(pr.source) : ", ''],
  [ENGINE, 'a buy carries the mark as before',
    '    ...(mp.generated ? { generated: true, ...(mp.nation ? { nation: mp.nation } : {}) } : {}),\n', ''],
  [ENGINE, 'a release sends his own flag',
    'generated: madeUp(p) || undefined, ...(p.nation ? { nation: p.nation } : {}), since: career.season,',
    'generated: p.generated, since: career.season,'],
  [ENGINE, 'an expiry sends his own flag',
    'generated: madeUp(p) || undefined, ...(p.nation ? { nation: p.nation } : {}), since: career.season + 1,',
    'generated: p.generated, since: career.season + 1,'],
  /* The review's fix: the Welsh and Canadian clubs of the English league and MLS read their own country. */
  [ENGINE, 'the Welsh Championship clubs read England',
    "    clubCountry: { 'Cardiff City': 'Wales', 'Swansea City': 'Wales', Wrexham: 'Wales' },\n", ''],
  [ENGINE, 'Swansea City 2015 reads England', "clubCountry: { 'Swansea City': 'Wales' }, ", ''],
  [ENGINE, 'the Canadian MLS East clubs read the United States', "    clubCountry: { 'Toronto FC': 'Canada', 'CF Montréal': 'Canada' },\n", ''],
  [ENGINE, 'Vancouver Whitecaps read the United States', "    clubCountry: { 'Vancouver Whitecaps': 'Canada' },\n", ''],
  [ASKS, 'the map is imported again',
    "import { SQUAD_LIMIT, buildMarket, careerPlace, groupOf, money, shownNation } from '@/lib/clubManager';",
    "import { SQUAD_LIMIT, buildMarket, careerPlace, groupOf, money, shownNation } from '@/lib/clubManager';\nimport { nationalityOf } from '@/data/playerNationalities';"],
  [ASKS, 'the squad is counted by the map',
    '  return squad.filter(p => !p.onLoan && shownNation(eraId, p) === country).length;',
    '  return squad.filter(p => !p.onLoan && nationalityOf(eraId, p.name) === country).length;'],
  [ASKS, 'the market is counted by the map',
    '    const pool = affordable.filter(p => shownNation(career.eraId, p) === country);',
    '    const pool = affordable.filter(p => nationalityOf(career.eraId, p.name) === country);'],
];

/** The source with the round's behaviour taken out (the engine and the board's asks only). */
export function withoutMadeUpNations(source, file) {
  const edits = BRIDGE_EDITS_1520.filter(([f]) => f === file);
  if (!edits.length) return source;
  let text = source.split('\r\n').join('\n');
  for (const [, label, from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`cmNoMadeUpNations1520: the anchor of "${label}" is in ${file} ${count} times, it must be exactly once`);
    text = text.replace(from, () => to);
  }
  return text;
}
