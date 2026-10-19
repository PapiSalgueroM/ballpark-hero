/* Release BK fix (fix-BK.md), runner only, never committed. Edits a checkout's src/lib/clubManager.ts in place,
   fail closed (every anchor must stand exactly once, else exit 2 and nothing is written).
     node applyFix.mjs <checkout> fix       the BK fix on a tree from before it (5f7b13b1, 499ec5ac): a base for the
                                            fleet proof that carries the same line (the load repair's guard), so the
                                            proof compares the rest of the engine
     node applyFix.mjs <checkout> literal   on the fixed head: the object is never taken off whole when a key is
                                            cleared (the delete line removed), the reading of the task this fix
                                            did not take, so its effect on the watchers can be measured */
import fs from 'node:fs';
import path from 'node:path';

const [dir, mode] = process.argv.slice(2);
const F = path.join(dir, 'src/lib/clubManager.ts');
let text = fs.readFileSync(F, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const L = s => s.split('\n').join(eol);
const edits = mode === 'fix'
  ? [
      [L('    if (slice && slice.s === state.season && !inIt) return;\n    setWorldComp(state, comp, null);\n'), L('    if (slice && slice.s === state.season && !inIt) return;\n    if (slice !== undefined) setWorldComp(state, comp, null);\n')],
    ]
  : mode === 'literal'
    ? [[L("  if (comp === 'ucl' && !slice) delete state.worldComps;\n"), '']]
    : null;
if (!edits) { console.log('applyFix: CANNOT RUN: mode must be fix or literal'); process.exit(2); }
for (const [from, to] of edits) {
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`applyFix: CANNOT RUN: the line to edit stands ${n} times: ${from.trim().slice(0, 80)}`); process.exit(2); }
  text = text.replace(from, to);
}
fs.writeFileSync(F, text);
console.log(`applyFix: ${mode}: ${edits.length} edit(s) made in ${F}`);
