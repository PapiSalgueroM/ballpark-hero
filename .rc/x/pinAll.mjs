/* Runner side retake of the Round 1081 pin (never committed by Round BIG part one): every unchangedSource entry of
   scripts/fixtures/managerAppealIsolation1081/manifest.json must be reproduced by the base, then the tree's values
   are written into the checkout. Usage: node .rc/x/pinAll.mjs <base ref> [--base-for <file>=<ref>]... [--write]
   (run from the repo root).
   Round BII (Release BI, part three): --base-for names a different base for one entry, for a value an incoming packet
   set on purpose. PR301 (the other lane's owned repair of simClubManagerDecisions) pins its own harness at 3383d016,
   which main e814c2de cannot reproduce but PR301's head does: --base-for scripts/simClubManagerDecisions.mjs=4508500e.
   Every other entry is still held to the main base. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const M = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
const hash = t => createHash('sha256').update(t.replaceAll('\r\n', '\n')).digest('hex');
const args = process.argv.slice(2);
const base = args[0];
const baseFor = {};
for (let i = 1; i < args.length; i++) if (args[i] === '--base-for') { const [f, r] = args[++i].split('='); baseFor[f] = r; }
let text = fs.readFileSync(M, 'utf8');
const manifest = JSON.parse(text);
for (const f of Object.keys(baseFor)) if (!(f in manifest.unchangedSource)) { console.log(`refused: ${f} is not pinned`); process.exit(2); }
let bad = 0;
const moves = [];
for (const [F, committed] of Object.entries(manifest.unchangedSource)) {
  const b = baseFor[F] || base;
  const baseHash = hash(execFileSync('git', ['show', `${b}:${F}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const headHash = hash(fs.readFileSync(F, 'utf8'));
  const rep = baseHash === committed;
  if (!rep) bad++;
  console.log(`${F}: committed ${committed.slice(0, 8)} base ${String(b).slice(0, 8)} ${baseHash.slice(0, 8)} ${rep ? 'REPRODUCES' : 'DIFFERS'} tree ${headHash.slice(0, 8)}${headHash === committed ? ' (unchanged)' : ' (moved)'}`);
  if (headHash !== committed) moves.push([committed, headHash]);
}
if (args.includes('--write')) {
  if (bad) { console.log('refused: the base does not reproduce every committed value'); process.exit(2); }
  for (const [from, to] of moves) {
    const n = text.split(from).length - 1;
    if (n !== 1) { console.log(`refused: ${from.slice(0, 8)} stands ${n} times`); process.exit(2); }
    text = text.replace(from, to);
  }
  fs.writeFileSync(M, text);
  console.log(`written (${moves.length} moved)`);
}
