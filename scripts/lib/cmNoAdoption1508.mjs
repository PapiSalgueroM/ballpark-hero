/* Round 1508: the bridge, for attribution only. No engine composes it; only the kits named below do.
 *
 * WHAT IT DOES. Round 1508 adopts a Club Manager career with no world seed into the living world at its next summer
 * (adoptLivingWorld, first thing in startNextSeason: an empty ledger, still no seed, and a record of each man of my
 * squad the projection still lists at another club). That moves every career from before the 13 October update, and
 * every kit that plays such a career across a summer against an engine pinned from before this round, at that summer
 * and only there. This takes the adoption back out of a COPY of the engine, so such a kit compares everything else.
 * scripts/simManagerWorldContinuity.mjs (its current arm, on every run) composes it through withoutAdoption, and
 * scripts/lib/cmWorldSeed1250.mjs (simCmUnseededWorld's fresh section) makes the same cut with this file's ADOPT line.
 *
 * ONE EDIT, failing closed: startNextSeason's line `  career = adoptLivingWorld(career);` must stand exactly once in
 * src/lib/clubManager.ts (line endings read as LF), or nothing is changed and the caller is told (exit 2 from the
 * command line, a thrown error from the function). Any other file comes back as it is.
 *
 *   import { withoutAdoption, ADOPT } from './lib/cmNoAdoption1508.mjs';   (source, file) => source
 *   node scripts/lib/cmNoAdoption1508.mjs --check     says whether the edit can be made (exit 0)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILE = 'src/lib/clubManager.ts';
export const ADOPT = '  career = adoptLivingWorld(career);\n';

/** The source with the adoption line out of startNextSeason (the engine file only). */
export function withoutAdoption(source, file = FILE) {
  if (file !== FILE) return source;
  const text = source.split('\r\n').join('\n');
  const count = text.split(ADOPT).length - 1;
  if (count !== 1) throw new Error(`cmNoAdoption1508: the adoption line is in ${FILE} ${count} times, it must be exactly once`);
  return text.replace(ADOPT, () => '');
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const root = path.resolve(path.dirname(here), '../..');
  try {
    withoutAdoption(readFileSync(path.join(root, FILE), 'utf8'));
    if (process.argv[2] !== '--check') { console.error('cmNoAdoption1508: say --check'); process.exit(2); }
    console.log(`cmNoAdoption1508: the adoption line stands once in ${FILE} and can be taken out`);
  } catch (e) {
    console.error(`${e.message}. Nothing was changed.`);
    process.exit(2);
  }
}
