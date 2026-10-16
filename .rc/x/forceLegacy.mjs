/* Round 1335's forced leg, runner only, never committed: a copy of the head with legacySeason answering
   true and startCareer's opening put back to LEGACY_BOARD_START (when the step has it), so the head plays
   the old season everywhere. Usage: node forceLegacy.mjs <tree>. Every anchor is asserted first. */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const tree = process.argv[2];
const file = path.join(tree, 'src/lib/clubManager.ts');
let t = readFileSync(file, 'utf8');
const once = (from, to, need) => {
  const n = t.split(from).length - 1;
  if (n === 0 && !need) { console.log(`forced leg: no ${JSON.stringify(from.trim().slice(0, 50))} on this step, left as is`); return; }
  if (n !== 1) { console.log(`forced leg: anchor ${JSON.stringify(from.trim().slice(0, 60))} found ${n} times; could not run`); process.exit(2); }
  t = t.replace(from, to);
  console.log(`forced leg: patched ${JSON.stringify(from.trim().slice(0, 60))}`);
};
once("  return c.matchRules === 'base';", '  return true;', true);
once('    boardConfidence: BOARD_FRESH,\n', '    boardConfidence: LEGACY_BOARD_START,\n', false);
writeFileSync(file, t);
