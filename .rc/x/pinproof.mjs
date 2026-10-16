/* Round 1342 fix, the Round 1081 pin (scripts/fixtures/managerAppealIsolation1081/manifest.json unchangedSource).
 *   node pinproof.mjs check          per pinned file: the LF sha256 on BASE equals BASE's manifest, on HEAD equals
 *                                    HEAD's manifest; exit 1 on any mismatch.
 *   node pinproof.mjs revert <file>  put <file> back to BASE in the tree and ITS manifest entry back to BASE's
 *                                    value, every other entry left as HEAD has it (then run the harness).
 *   node pinproof.mjs retake         rewrite every unchangedSource entry from the tree's own files (LF sha256).
 * BASE is d4f2c6f6 (origin/main when Round 1342 branched). */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const BASE = 'd4f2c6f6';
const MANIFEST = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
const lf = t => t.replaceAll('\r\n', '\n');
const sha = t => crypto.createHash('sha256').update(lf(t)).digest('hex');
const show = (rev, f) => execFileSync('git', ['show', `${rev}:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const [mode, arg] = process.argv.slice(2);
const head = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const base = JSON.parse(show(BASE, MANIFEST));

if (mode === 'check') {
  let bad = 0;
  for (const f of Object.keys(head.unchangedSource)) {
    const onBase = sha(show(BASE, f)), onHead = sha(fs.readFileSync(f, 'utf8'));
    const okBase = onBase === base.unchangedSource[f], okHead = onHead === head.unchangedSource[f];
    if (!okBase || !okHead) bad += 1;
    console.log(`${f}: base ${onBase.slice(0, 16)} (pin ${base.unchangedSource[f].slice(0, 16)}) ${okBase ? 'equal' : 'DIFFERS'}; head ${onHead.slice(0, 16)} (pin ${head.unchangedSource[f].slice(0, 16)}) ${okHead ? 'equal' : 'DIFFERS'}; ${onBase === onHead ? 'unchanged by the round' : 'changed by the round'}`);
  }
  console.log(bad ? `pinproof: FAIL (${bad})` : 'pinproof: every pin moved with its own file and nothing else');
  process.exit(bad ? 1 : 0);
}
if (mode === 'revert') {
  if (!(arg in head.unchangedSource)) { console.log(`pinproof: ${arg} is not pinned`); process.exit(2); }
  fs.writeFileSync(arg, show(BASE, arg));
  head.unchangedSource[arg] = base.unchangedSource[arg];
  fs.writeFileSync(MANIFEST, JSON.stringify(head, null, 2) + '\n');
  console.log(`pinproof: ${arg} and its pin are back at ${BASE}; the other pins are HEAD's`);
  process.exit(0);
}
if (mode === 'retake') {
  for (const f of Object.keys(head.unchangedSource)) head.unchangedSource[f] = sha(fs.readFileSync(f, 'utf8'));
  fs.writeFileSync(MANIFEST, JSON.stringify(head, null, 2) + '\n');
  console.log('pinproof: retaken from the tree');
  process.exit(0);
}
console.log('pinproof: usage check | revert <file> | retake');
process.exit(2);
