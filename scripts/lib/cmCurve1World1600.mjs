/**
 * Round 1600's bridge, for a kit that compares this tree's Club Manager engine with an engine pinned from before
 * the round (the same kind of bridge as scripts/lib/cmWorldSeed1250.mjs and scripts/lib/cmNoMadeUpNations1520.mjs).
 *
 * WHY. Round 1600 put the modern world on curve 2: the squads files carry each man's level and age, and the load
 * shows the level plus points for his age (src/data/clubManagerWorldRosters.ts) and keeps the level beside it as
 * `lv`, which the engine reads for what a club is (levelOf in src/lib/clubManagerEras.ts). An engine pinned from
 * before the round imports the same world but knows neither `lv` nor the free agents' age read nor the drop out
 * shift, so on this tree's data no match of the two can be equal, whatever its shootout or any other code does
 * (simCmShootoutOrder sections 4 and 5: 0 of 150 rows; simCmShootoutResults: the walk to the first cup differs).
 *
 * WHAT. The world as it stood before the flip, rebuilt from this tree's own files through the shared library
 * (scripts/lib/cmSquadAges.mjs, the same rebuild simCmLevelReads' curve 1 arm uses): the main squads file with
 * its stamp off and every man at the age the curve 1 view holds (src/data/clubManagerCurve1View.ts), the A-League
 * and Russia files with their stamps off, the real free agents back on curve 1, and the past seasons' age read
 * (Proposal 4, PAST_SEASONS_READ_AGE in src/lib/clubManagerEras.ts) switched off. On that world this tree's engine
 * reads no age at all (cmWorldReadsAge is false, so no `lv`, no age read of a free agent, no drop out shift and no
 * ledger stamp, and a past season shows its stretched levels), so a kit bundles BOTH engines on it and every claim
 * it makes about the code the two share is judged on one world again. simCmLeagueRules' modern and eras parts
 * (Round 1600's re-record proofs) are the measurement that this tree's engine there plays as the engine before;
 * simManagerWorldContinuity's probe (r1600-h5k) found the past seasons' read was needed for the era careers.
 *
 * HOW. curve1Plugin1600(root) is an esbuild plugin (the async build API: buildSync takes no plugins) that serves
 * the four rebuilt files in place of the shipped ones. It fails closed: it throws unless this tree's main squads
 * file is stamped, so a kit that builds the arm on a tree from before the flip learns it is not needed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isStamped, unflippedSquads, unstampedLeague, unstampedFreeAgents } from './cmSquadAges.mjs';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/** True when this tree's modern world reads age at load: its main squads file carries the curve 2 stamp. */
export function worldReadsAge1600(root) {
  return isStamped(read(root, 'src/data/clubManagerRosters.ts'));
}

/** The four modern data files on curve 1, rebuilt from this tree's own files. Throws on a tree with no flip. */
export function curve1Files1600(root) {
  const shipped = read(root, 'src/data/clubManagerRosters.ts');
  if (!isStamped(shipped)) throw new Error('cmCurve1World1600: the main squads file carries no curve 2 stamp, so there is no flip to take out');
  const fa = read(root, 'src/data/clubManagerFreeAgents2026.ts');
  const faBack = unstampedFreeAgents(fa);
  if (faBack.includes('CM_REAL_FREE_AGENTS_CURVE') && !faBack.includes('export const CM_REAL_FREE_AGENTS_CURVE = 1;')) {
    throw new Error('cmCurve1World1600: the free agents file names its curve in a shape the rebuild does not know');
  }
  return {
    clubManagerEras: withoutPastSeasonsRead1600(read(root, 'src/lib/clubManagerEras.ts')),
    clubManagerRosters: unflippedSquads(shipped, read(root, 'src/data/clubManagerCurve1View.ts')).text,
    clubManagerALeague2026: unstampedLeague(read(root, 'src/data/clubManagerALeague2026.ts')),
    clubManagerRussia2026: unstampedLeague(read(root, 'src/data/clubManagerRussia2026.ts')),
    clubManagerFreeAgents2026: faBack,
  };
}

const PAST_READ = 'const PAST_SEASONS_READ_AGE = true;';
/** src/lib/clubManagerEras.ts with the past seasons' age read off (Round 1600's Proposal 4, the era flip, taken
 *  out: each past season's man is shown at his stretched level again, as before the round). Throws unless the
 *  switch stands exactly once, so a later edit to it cannot leave the bridge reading half a world. */
export function withoutPastSeasonsRead1600(source) {
  const lf = source.replaceAll('\r\n', '\n');
  if (lf.split(PAST_READ).length !== 2) throw new Error('cmCurve1World1600: src/lib/clubManagerEras.ts does not hold its past seasons switch exactly once');
  return lf.replace(PAST_READ, 'const PAST_SEASONS_READ_AGE = false;');
}

const FILTERS = {
  clubManagerEras: /[\\/]src[\\/]lib[\\/]clubManagerEras\.ts$/,
  clubManagerRosters: /[\\/]src[\\/]data[\\/]clubManagerRosters\.ts$/,
  clubManagerALeague2026: /[\\/]src[\\/]data[\\/]clubManagerALeague2026\.ts$/,
  clubManagerRussia2026: /[\\/]src[\\/]data[\\/]clubManagerRussia2026\.ts$/,
  clubManagerFreeAgents2026: /[\\/]src[\\/]data[\\/]clubManagerFreeAgents2026\.ts$/,
};

/** The esbuild plugin that bundles a kit on the curve 1 world. `served` counts each file it served, so a kit can
 *  prove the bridge was walked (a bundle that never imported a file would leave its count at 0). */
export function curve1Plugin1600(root) {
  const files = curve1Files1600(root);
  const served = Object.fromEntries(Object.keys(FILTERS).map(k => [k, 0]));
  return {
    served,
    plugin: {
      name: 'cm-curve1-world-1600',
      setup(b) {
        for (const [key, filter] of Object.entries(FILTERS)) {
          b.onLoad({ filter }, () => { served[key] += 1; return { contents: files[key], loader: 'ts' }; });
        }
      },
    },
  };
}
