/* Runner side retake of the Round 1081 pin (never committed by Round BIG part one): every unchangedSource entry of
   scripts/fixtures/managerAppealIsolation1081/manifest.json must be reproduced by the base, then the tree's values
   are written into the checkout. Usage: node .rc/x/pinAll.mjs <base ref> [--write] (run from the repo root). */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const M = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
const hash = t => createHash('sha256').update(t.replaceAll('\r\n', '\n')).digest('hex');
const base = process.argv[2];
let text = fs.readFileSync(M, 'utf8');
const manifest = JSON.parse(text);
let bad = 0;
const moves = [];
for (const [F, committed] of Object.entries(manifest.unchangedSource)) {
  const baseHash = hash(execFileSync('git', ['show', `${base}:${F}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const headHash = hash(fs.readFileSync(F, 'utf8'));
  const rep = baseHash === committed;
  if (!rep) bad++;
  console.log(`${F}: committed ${committed.slice(0, 8)} base ${baseHash.slice(0, 8)} ${rep ? 'REPRODUCES' : 'DIFFERS'} tree ${headHash.slice(0, 8)}${headHash === committed ? ' (unchanged)' : ' (moved)'}`);
  if (headHash !== committed) moves.push([committed, headHash]);
}
if (process.argv.includes('--write')) {
  if (bad) { console.log('refused: the base does not reproduce every committed value'); process.exit(2); }
  for (const [from, to] of moves) {
    const n = text.split(from).length - 1;
    if (n !== 1) { console.log(`refused: ${from.slice(0, 8)} stands ${n} times`); process.exit(2); }
    text = text.replace(from, to);
  }
  fs.writeFileSync(M, text);
  console.log(`written (${moves.length} moved)`);
}
