/* Reviewer's check of the Round 1220 recording. node digestcmp.mjs <fresh recording> <committed recording> [base checkout]
   Compares a recording taken again on the runner, on the base engine, with the committed file. Writes nothing. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const [freshFile, committedFile, baseRoot] = process.argv.slice(2);
const fresh = JSON.parse(fs.readFileSync(freshFile, 'utf-8'));
const rec = JSON.parse(fs.readFileSync(committedFile, 'utf-8'));
let bad = 0;
const say = (ok, what) => { if (!ok) bad += 1; console.log(`${ok ? 'equal' : 'DIFFERENT'}: ${what}`); };
say(fresh.base === rec.base, `base sha (${rec.base})`);
say(String(fresh.node).split('.')[0] === String(rec.node).split('.')[0], `node major (fresh ${fresh.node}, committed ${rec.node})`);
say(fresh.roads === rec.roads, `roads per pair (${rec.roads})`);
say(JSON.stringify(fresh.src) === JSON.stringify(rec.src), 'the engine file hashes the recording names');
const sets = Object.keys(rec.sets);
let digests = 0;
for (const s of sets) for (const pair of Object.keys(rec.sets[s])) for (const half of ['showcase', 'draft']) {
  digests += 1;
  if (!fresh.sets[s] || !fresh.sets[s][pair] || fresh.sets[s][pair][half] !== rec.sets[s][pair][half]) { bad += 1; console.log(`DIFFERENT: set ${s} ${pair} ${half}`); }
}
console.log(`sets ${sets.join(',')}; ${digests} digests compared`);
say(JSON.stringify(fresh.sets) === JSON.stringify(rec.sets), 'the whole sets block, first roads included');
if (baseRoot) {
  const sha = text => crypto.createHash('sha256').update(text).digest('hex');
  for (const [f, want] of Object.entries(rec.src)) {
    const got = sha(fs.readFileSync(path.join(baseRoot, 'src/lib', f), 'utf-8').replace(/\r\n/g, '\n'));
    say(got === want, `hash of ${f} on the base checkout`);
  }
}
console.log(`digestcmp: ${bad === 0 ? 'THE COMMITTED RECORDING IS WHAT THE BASE ENGINE GIVES' : `${bad} DIFFERENCE(S)`}`);
process.exit(bad === 0 ? 0 : 1);
