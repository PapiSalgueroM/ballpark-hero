// Review of Round 1508 (run lens): a probe, never committed. Makes simCmWorldMoves' section 2 protected careers and
// section 3 join careers ADOPTED careers (no seed, the ledger adoptLivingWorld gives) right after startCareer, so
// Round 1344's refusal and join carry checks run on the kind of career this round brings into the living world.
// Exit 2 if an anchor is not found exactly once. The request line restores the checkout afterwards.
import fs from 'node:fs';

const FILE = 'scripts/simCmWorldMoves.mjs';
const ADOPT = " { const c = { ...s }; delete c.worldSeed; delete c.worldRoster; s = M.cm.adoptLivingWorld(c);"
  + " if (M.cm.worldSeedOf(s) !== undefined || !M.ledger.readWorldRoster(s)) throw new Error('adoptHarness probe: the career is not adopted'); }";
const EDITS = [
  ["    s = M.cm.startCareer(club, 'now');\n", "    s = M.cm.startCareer(club, 'now');" + ADOPT + "\n"],
  ["    let s = M.cm.startCareer(club, 'now'), january = false, after = 0;\n", "    let s = M.cm.startCareer(club, 'now'), january = false, after = 0;" + ADOPT + "\n"],
];
let src = fs.readFileSync(FILE, 'utf8').split('\r\n').join('\n');
for (const [from, to] of EDITS) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`adoptHarness: ABORT, anchor found ${n} times: ${from.trim()}`); process.exit(2); }
  src = src.replace(from, () => to);
}
fs.writeFileSync(FILE, src);
console.log('adoptHarness: sections 2 (protected) and 3 (join) now start adopted careers');
