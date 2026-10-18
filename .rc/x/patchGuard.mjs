// Release BK triage, runner only, a diagnostic never committed to the branch: in a throwaway worktree, setWorldComp
// takes the worldComps object off before writing it back ONLY when a Champions League key is there to take off, so
// a save of a club in the Champions League that follows only the Europa League keeps its key where it stood.
// usage: node .rc/x/patchGuard.mjs <worktree>
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.argv[2], 'src/lib/clubManager.ts');
const from = "  if (comp === 'ucl' && !slice) delete state.worldComps;";
const to = "  if (comp === 'ucl' && !slice && state.worldComps?.ucl) delete state.worldComps;";
const t = fs.readFileSync(file, 'utf8');
if (t.split(from).length !== 2) { console.error('patchGuard: the line stands ' + (t.split(from).length - 1) + ' times, not once'); process.exit(3); }
fs.writeFileSync(file, t.replace(from, to));
console.log('patchGuard: setWorldComp takes the object off only when a ucl key is there');
