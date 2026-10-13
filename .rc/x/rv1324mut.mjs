// Reviewer's mutation applier for Round 1324 (runs on the GitHub runner only, restored by git checkout in the same line).
// node .rc/x/rv1324mut.mjs <M> : asserts the anchor is in src/lib/gmInbox.ts exactly once, swaps it, writes the file.
import fs from 'node:fs';
const F = 'src/lib/gmInbox.ts';
const MUT = {
  M0: null,
  M2: ['    if (e.story) drop(came, x => bookKey(x) === bookKey(e));', '    /* M2: story sibling drop removed */'],
  M3: ['if (clock - Math.min(at, clock) < restFor) rest[k] = Math.min(at, clock);', 'if (clock - at < restFor) rest[k] = at; /* M3 */'],
  M4: ['const w = Math.min(m.w, clock);', 'const w = m.w; /* M4 */'],
  M6: ['if (ttl !== undefined && clock - w >= ttl && n >= 0)', 'if (ttl !== undefined && clock - w > ttl && n >= 0) /* M6 */'],
  M7: ['  return came.splice(i, 1)[0];', '  return came[i]; /* M7 */'],
  M8: ['    if (sk === null) return false;', '    /* M8: fail closed removed */'],
};
const k = process.argv[2];
if (!(k in MUT)) { console.error(`unknown mutation ${k}`); process.exit(2); }
const raw = fs.readFileSync(F, 'utf8');
const src = raw.replace(/\r\n/g, '\n');
if (MUT[k] === null) { console.log(`${k}: no change (rig control)`); process.exit(0); }
const [from, to] = MUT[k];
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`${k}: anchor found ${n} times, ABORT`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.error(`${k}: changed nothing, ABORT`); process.exit(2); }
fs.writeFileSync(F, out);
console.log(`${k}: applied (${from.trim().slice(0, 60)} -> ${to.trim().slice(0, 60)})`);
