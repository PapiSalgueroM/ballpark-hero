/**
 * Round 1102: re rate Club Manager's four past seasons on the game's current rating curve, in
 * place, from the rows they already ship.
 *
 *   node scripts/rerateCmEras.mjs            re rate every era file still on an older curve
 *   node scripts/rerateCmEras.mjs --check    write nothing; exit 1 if a file is not on the curve
 *
 * Offline: reads and writes src/data/clubManagerEra2005.ts, 2010, 2015 and 2020 and nothing else.
 * No pull is needed, because a shipped row's old rating IS its value rating, so the new rating is
 * the curve's rateFrom(r, a + 1, p) read off the row itself (rerateShippedEra in
 * scripts/lib/eraBakeExtend.mjs, where the "+ 1" is explained). A second run finds every file
 * stamped with the curve and writes nothing. scripts/simEraBakeExtend.mjs part C proves this path
 * equals a full re bake from the pulls, and scripts/simCmRatingShape.mjs section 2 holds every
 * shipped row to the curve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rerateShippedEra, CURVE_VERSION } from './lib/eraBakeExtend.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const ERAS = [2005, 2010, 2015, 2020];
let stale = 0;
for (const year of ERAS) {
  const rel = `src/data/clubManagerEra${year}.ts`;
  const file = path.join(ROOT, rel);
  let res;
  try { res = rerateShippedEra(fs.readFileSync(file, 'utf8'), `ERA${year}`); } catch (e) {
    console.error(`FATAL: ${rel}: ${e.message}`);
    process.exit(1);
  }
  if (res.already) { console.log(`${rel}: already on curve ${CURVE_VERSION}`); continue; }
  const by = Object.keys(res.by).map(Number).sort((a, b) => a - b).map(k => `${k > 0 ? '+' : ''}${k}: ${res.by[k]}`).join(', ');
  if (CHECK) { stale += 1; console.error(`${rel}: NOT on curve ${CURVE_VERSION} (${res.changed} of ${res.rows} ratings would move)`); continue; }
  fs.writeFileSync(file, res.text);
  console.log(`${rel}: ${res.changed} of ${res.rows} ratings moved to curve ${CURVE_VERSION} (${by})`);
}
if (CHECK && stale) process.exit(1);
