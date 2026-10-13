// Fixer mutation applier (Round 1323 fix). Usage: node mutf.mjs <id>
// Each mutation asserts its anchor is present exactly once, applies it and prints MUTATION <id> APPLIED.
// Exit 3 = anchor missing (an ABORT, never a red for the mutation's sake).
import fs from 'node:fs';

const HOOK = 'src/hooks/useClubManager.ts';
const CM = 'src/lib/clubManager.ts';
const RELEASE_IF = '      if (!saveFence.moved(SAVE_KEY)) saveFence.release(SAVE_KEY);\n';
const RELEASE_LATER = '      else queueMicrotask(() => { if (saveFence.moved(SAVE_KEY)) saveFence.release(SAVE_KEY); });\n';
const M = {
  // the code before the fix: release at unmount whatever the page's state
  oldrelease: [HOOK, RELEASE_IF + RELEASE_LATER, '      saveFence.release(SAVE_KEY);\n'],
  // release before the hook's own last write (that write becomes a claim)
  releasefirst: [HOOK, '      write();\n      /* Round 1323: the last write is done', '      saveFence.release(SAVE_KEY);\n      write();\n      /* Round 1323: the last write is done'],
  // a stale page never lets go (no microtask release)
  neverrelease: [HOOK, RELEASE_LATER, ''],
  // the squad repair's line back at the engine's floor of 14 (the code before the fix)
  squad14: [CM, 'if (parsed.squad.length < 11) {', 'if (parsed.squad.length < 14) {'],
  // a negative budget repaired like a value that is not a number
  budgetneg: [CM, "if (typeof rawBudget !== 'number' || !Number.isFinite(rawBudget)) {", "if (typeof rawBudget !== 'number' || !Number.isFinite(rawBudget) || rawBudget < 0) {"],
};

const id = process.argv[2];
const m = M[id];
if (!m) { console.error(`MUTATION ABORT: unknown id ${id}`); process.exit(3); }
const [file, from, to] = m;
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ABORT: ${id} anchor found ${n} times in ${file}`); process.exit(3); }
let out = text.replace(from, to);
if (crlf) out = out.replace(/\n/g, '\r\n');
fs.writeFileSync(file, out);
console.log(`MUTATION ${id} APPLIED to ${file}`);
