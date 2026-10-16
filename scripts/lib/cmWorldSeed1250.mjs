/* Release AZ: the inverse of Round 1250's world seed, for attribution only. It is composed NOWHERE by default.
 *
 * WHAT IT DOES. Since Round 1250 (the other lane's PR224) startCareer gives every new Club Manager save a
 * worldSeed, keyed on the save's own start, and from the second season a seeded career plays a world that
 * develops with some variety. A save with no seed plays the projected world it always had, and by the lead's
 * ruling Y1 it never writes a ledger either (recordActualRosterTransfer returns at once). So taking the seed
 * block out of startCareer makes every new save a save from before the release again: a harness that plays new
 * careers must then replay as on the first parent of the merge (b6eb78e7). That is the proof that whatever moved
 * moved for the seed and for nothing else.
 *
 * ONE EDIT, failing closed: the block of startCareer that writes state.worldSeed, from `  if (!world) {` with the
 * line under it (the entropy) to the `  }` that closes its else branch, right above `  return state;`. The pair
 * must stand exactly once in the source, and the block must end where it is expected to, or nothing is changed
 * and the caller is told (exit 2 from the command line, a thrown error from the function).
 *
 *   import { withoutWorldSeed } from './lib/cmWorldSeed1250.mjs';    source => source without the seed block
 *   node scripts/lib/cmWorldSeed1250.mjs --apply                      the same edit IN PLACE, for a runner or a
 *                                                                     throwaway checkout only; it refuses a file
 *                                                                     with uncommitted changes. The way back:
 *                                                                     git checkout -- src/lib/clubManager.ts
 *   node scripts/lib/cmWorldSeed1250.mjs --check                      says whether the edit can be made (exit 0)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILE = 'src/lib/clubManager.ts';
export const ANCHOR = '  if (!world) {\n    const entropy = JSON.stringify([state.eraId, state.startYear, state.clubName,\n';
const CLOSE = '    state.worldSeed = world.worldSeed;\n  }\n';
/* Round 1344: startCareer's last line records the opening window's deals once the seed is drawn (the post seed
   flush). With the seed block cut there is no seed and that line hands back the same state, so the inverse still
   makes every new save a save from before Release AZ. Either last line is accepted, so the legs that apply this
   in throwaway checkouts of older commits still run. */
const AFTERS = ['  return state;\n}\n', '  return recordAiDeals(state, unrecorded);\n}\n'];

/** The source of clubManager.ts with the seed block of startCareer taken out. Line endings are read as LF. */
export function withoutWorldSeed(source) {
  const text = source.split('\r\n').join('\n');
  const count = text.split(ANCHOR).length - 1;
  if (count !== 1) throw new Error(`cmWorldSeed1250: the seed block's anchor is in ${FILE} ${count} times, it must be exactly once`);
  const start = text.indexOf(ANCHOR);
  const close = text.indexOf(CLOSE, start);
  if (close < 0) throw new Error(`cmWorldSeed1250: the seed block in ${FILE} does not end with its else branch`);
  const end = close + CLOSE.length;
  if (!AFTERS.some(after => text.startsWith(after, end))) throw new Error(`cmWorldSeed1250: the seed block in ${FILE} is not the last thing startCareer does`);
  const block = text.slice(start, end);
  if (block.split('\n').length > 14 || !block.includes('state.worldSeed = Math.floor(')) throw new Error(`cmWorldSeed1250: the cut in ${FILE} is not the seed block`);
  const out = text.slice(0, start) + text.slice(end);
  if (out === text) throw new Error('cmWorldSeed1250: the edit changed nothing');
  return out;
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const root = path.resolve(path.dirname(here), '../..');
  const file = path.join(root, FILE);
  const mode = process.argv[2];
  try {
    const out = withoutWorldSeed(readFileSync(file, 'utf8'));
    if (mode === '--check') { console.log(`cmWorldSeed1250: the seed block stands once in ${FILE} and can be taken out`); process.exit(0); }
    if (mode !== '--apply') { console.error('cmWorldSeed1250: say --check or --apply'); process.exit(2); }
    const dirty = spawnSync('git', ['status', '--porcelain', '--', FILE], { cwd: root, encoding: 'utf8' });
    if (dirty.status !== 0 || dirty.stdout.trim()) { console.error(`cmWorldSeed1250: ${FILE} has uncommitted changes (or git could not say). Nothing was changed.`); process.exit(2); }
    writeFileSync(file, out);
    console.log(`cmWorldSeed1250: the seed block is out of ${FILE}. The way back: git checkout -- ${FILE}`);
  } catch (e) {
    console.error(`${e.message}. Nothing was changed.`);
    process.exit(2);
  }
}
