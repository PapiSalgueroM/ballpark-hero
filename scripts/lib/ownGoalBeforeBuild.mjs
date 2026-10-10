/* Round 1216: the one edit behind LIVE_FIT_CONTROL=ogbefore of scripts/playLiveMatchFit.mjs, kept in the repo so
 * that control can be run from the repo alone.
 *
 * It takes the one entry line of the own goal out of the shared pitch part
 * (src/components/pitch-motion/motion.tsx) IN PLACE, so that a build made afterwards draws the picture from before
 * Round 1216: the feed still says og, the card still says (O.G), and the grass shows a striker scoring. That is the
 * bug a player reported, and section 9 of the walk must go red on it.
 *
 * It is meant for a GitHub runner or a throwaway checkout, never for a tree somebody is working in. It refuses to
 * touch a file that has uncommitted changes (the way back is a checkout of that file, which would lose them), and
 * it refuses when the entry line is not in the file exactly once (exit 2, nothing changed).
 *
 *   node scripts/lib/ownGoalBeforeBuild.mjs && npm run build
 *   (serve dist with scripts/lib/hostLikeServer.mjs, then)
 *   LIVE_FIT_OWN=1 LIVE_FIT_CONTROL=ogbefore node scripts/playLiveMatchFit.mjs     exit 1, as it must
 *   git checkout -- src/components/pitch-motion/motion.tsx                         and build again
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = 'src/components/pitch-motion/motion.tsx';
const ENTRY = "if (action.event.og && action.event.kind === 'goal' && !action.event.penalty && !action.event.freeKick) return ownGoalFrame(scene, action, elapsed);";

const dirty = spawnSync('git', ['status', '--porcelain', '--', file], { cwd: root, encoding: 'utf8' });
if (dirty.status !== 0 || dirty.stdout.trim()) {
  console.error(`ownGoalBeforeBuild: ${file} has uncommitted changes (or git could not say). Nothing was changed.`);
  process.exit(2);
}
const source = readFileSync(path.join(root, file), 'utf8');
const count = source.split(ENTRY).length - 1;
if (count !== 1) {
  console.error(`ownGoalBeforeBuild: the own goal's entry line is in ${file} ${count} times, not once. Nothing was changed.`);
  process.exit(2);
}
writeFileSync(path.join(root, file), source.replace(ENTRY, 'void ownGoalFrame;'));
console.log(`ownGoalBeforeBuild: the own goal's entry line is out of ${file}. Build, walk with LIVE_FIT_OWN=1 LIVE_FIT_CONTROL=ogbefore, then: git checkout -- ${file}`);
