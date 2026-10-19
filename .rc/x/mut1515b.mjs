// Round 1515 review (run lens): one named mutation applied to the checkout on the runner.
// Every anchor is asserted present exactly once before the edit, so a mutation that changes nothing exits 2
// (CANNOT), never green. The request line restores the tree with git checkout -- src scripts after the harness.
import fs from 'node:fs';

const R = 'src/lib/brokenSaveRecovery.ts';
const MUTS = {
  // M1 the slot filter in offeredBackup dropped
  M1: [R, 'if (marks[k] - slot) continue;', '/* M1 */'],
  // M1b the filter "tidied" to a strict inequality (an unmarked copy and every other game would then be passed over)
  M1b: [R, 'if (marks[k] - slot) continue;', 'if (marks[k] !== slot) continue;'],
  // M2 off by one: slot 3 read as slot 1
  M2: [R, 'slot = a === 2 || a === 3 ? a : 1;', 'slot = a === 2 ? a : 1;'],
  // M3 the pruning of gone copies' marks dropped
  M3: [R, 'for (const k in marks) storage.getItem(k) ?? delete marks[k];', '/* M3 */'],
  // M4 moveAside marks its copy before the original is gone (a refused move leaves a stray mark)
  M4: [R, 'const copied = copyAside(entry, storage, now, true);', 'const copied = copyAside(entry, storage, now);'],
  // M5 a stale index key name in the continue saves row
  M5: ['src/data/continueSaves.ts', "slots: 'dukb-cm-slots'", "slots: 'dukb-cm-slot'"],
  // M6 the edge's sign flipped in the engine (Hard and Impossible would play easier than Medium)
  M6: ['src/lib/clubManager.ts', 'strengthOf(state, club) + edge;', 'strengthOf(state, club) - edge;'],
  // M7 Hard's and Impossible's edges swapped (a swapped argument in the table)
  M7: ['src/lib/clubManagerDifficulty.ts', [['mark: 1.15, edge: 2.5 }', 'mark: 1.15, edge: 4.3 }'], ['mark: 1.3, edge: 4.3 }', 'mark: 1.3, edge: 2.5 }']]],
  // M9 the mark written from the raw index (slot 1 has no index, so its copies would go unmarked)
  M9: [R, 'marks[mark] = slot;', 'marks[mark] = a;'],
  // M11 copyAside's unmarked flag inverted (the staged put back and the version copy go unmarked)
  M11: [R, 'if (!unmarked) slotMarks(entry, storage, backupKey);', 'if (unmarked) slotMarks(entry, storage, backupKey);'],
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mut1515b: CANNOT, no mutation ${name}`); process.exit(2); }
const [file, a, b] = m;
const pairs = Array.isArray(a) ? a : [[a, b]];
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.split('\r\n').join('\n');
for (const [from, to] of pairs) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`mut1515b: CANNOT, ${name} anchor found ${n} times in ${file}: ${from.slice(0, 80)}`); process.exit(2); }
  src = src.replace(from, to);
}
fs.writeFileSync(file, crlf ? src.split('\n').join('\r\n') : src);
console.log(`mut1515b: ${name} applied to ${file}`);
