// Release BP: take Round 1520 out of the engine files of the CURRENT checkout (run inside a throwaway worktree copy of
// the head, never in a tree that is committed), through Round 1520's own bridge scripts/lib/cmNoMadeUpNations1520.mjs:
// twelve edits in src/lib/clubManager.ts and src/lib/clubManagerBoardAsks.ts, each anchor exactly once or it throws.
// Then simCmDifficulty with BASE_ROOT at a tree without 1520 compares everything else. Exit 2 when it cannot apply.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { withoutMadeUpNations, BRIDGE_FILES_1520 } = await import(pathToFileURL(path.join(root, 'scripts/lib/cmNoMadeUpNations1520.mjs')).href);
try {
  for (const rel of BRIDGE_FILES_1520) {
    const f = path.join(root, rel);
    const before = fs.readFileSync(f, 'utf8');
    const after = withoutMadeUpNations(before, rel);
    if (after === before.split('\r\n').join('\n')) throw new Error(`${rel}: the bridge changed nothing`);
    fs.writeFileSync(f, after);
  }
} catch (e) { console.log(`mutNoNations1520: CANNOT APPLY: ${e.message}`); process.exit(2); }
console.log(`mutNoNations1520: Round 1520 taken out of ${BRIDGE_FILES_1520.join(' and ')} (its twelve bridge edits)`);
