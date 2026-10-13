// Reviewer mutation applier (r1323 run lens). Usage: node mut.mjs <id>
// Each mutation asserts its anchor is present exactly once, applies it, and prints MUTATION <id> APPLIED.
// Exit 3 = anchor missing (an ABORT, never read as red for the mutation's sake).
import fs from 'node:fs';

const M = {
  // core rule: drop the stale check in write (a stale page writes anyway)
  nomovedcheck: ['src/lib/saveFence.ts', "      if (moved(saveKey)) return 'moved';\n", ''],
  // off by one: the generation never moves on a write
  pluszero: ['src/lib/saveFence.ts', 'const next = Math.max(mine ?? 0, stored(saveKey) ?? 0) + 1;', 'const next = Math.max(mine ?? 0, stored(saveKey) ?? 0) + 0;'],
  // stale constant: adopt always holds 0 instead of the stored generation
  adoptzero: ['src/lib/saveFence.ts', 'held.set(saveKey, stored(saveKey) ?? 0);', 'held.set(saveKey, 0);'],
  // off by one at the squad floor: the repair fires at exactly 14, a squad the engine writes
  squadle14: ['src/lib/clubManager.ts', 'if (parsed.squad.length < 14) {', 'if (parsed.squad.length <= 14) {'],
  // dropped filter: a negative budget is repaired to 0 too (the brief rules negatives must be left alone)
  budgetneg: ['src/lib/clubManager.ts', "if (typeof rawBudget !== 'number' || !Number.isFinite(rawBudget)) {", "if (typeof rawBudget !== 'number' || !Number.isFinite(rawBudget) || rawBudget < 0) {"],
  // hook: release before the last write (the unmount write becomes an unchecked claim)
  releasefirst: ['src/hooks/useClubManager.ts', '      write();\n      /* Round 1323: the last write is done, so this page holds nothing now. */\n      saveFence.release(SAVE_KEY);', '      saveFence.release(SAVE_KEY);\n      write();'],
  // hook: the boot never adopts (every page write is a claim)
  noadopt: ['src/hooks/useClubManager.ts', '      saveFence.adopt(SAVE_KEY);\n      /* Round 1323: Hot Seat', '      /* Round 1323: Hot Seat'],
  // hook: the every-phase listener only listens for the save key, not the fence key
  listenkey: ['src/hooks/useClubManager.ts', "const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === fenceKey) movedOn(); };", "const onStorage = (e: StorageEvent) => { if (e.key === null) movedOn(); };"],
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
