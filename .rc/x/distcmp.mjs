/* Review of Round 1312 (never committed): the production build at the base and at the head, chunk by chunk.
   Usage on the runner: node .rc/x/distcmp.mjs <baseDist> <headDist>
   Chunks are matched by name with the content hash taken out, and compared after every hashed file name inside
   them is normalised. Prints which chunks differ, where the NHL ledger lives (its alignment key "six-2006", which
   the engine reads, so it must be in both), and whether any word of Round 1312's new blocks reached a built file.
   Exit 0 when no new block's words are in the head's build and the ledger chunk is equal; 1 otherwise. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const [baseDir, headDir] = process.argv.slice(2);
const walk = d => readdirSync(d).flatMap(f => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const HASHED = /-[A-Za-z0-9_-]{8}(\.(?:js|css))/g;
const load = dir => {
  const out = {};
  for (const f of walk(path.join(dir, 'assets')).filter(f => f.endsWith('.js'))) {
    const key = path.basename(f).replace(HASHED, '$1');
    out[key] = (out[key] ?? []).concat(readFileSync(f, 'utf8'));
  }
  return out;
};
const A = load(baseDir); const B = load(headDir);
const norm = t => t.replace(HASHED, '-HASH$1');
const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
let equal = 0; const differ = []; const only = [];
for (const k of keys) {
  if (!A[k] || !B[k]) { only.push(`${k} (${A[k] ? 'base' : 'head'} only)`); continue; }
  const a = A[k].map(norm).sort().join('\n'); const b = B[k].map(norm).sort().join('\n');
  if (a === b) equal++; else differ.push(`${k} base ${gzipSync(a).length} head ${gzipSync(b).length} gz`);
}
console.log(`chunks: ${keys.length} names, ${equal} equal after hash normalising, ${differ.length} differ, ${only.length} on one side only`);
for (const d of differ.slice(0, 30)) console.log(`  DIFFER ${d}`);
for (const o of only.slice(0, 30)) console.log(`  ONLY ${o}`);
const WORDS = ['Conference Quarterfinals', 'Conference Semifinals', 'Stanley Cup Semifinals', 'qualifying stage came first', 'nhl-records-playoffs', 'NHL_ROUND_NAMES'];
const where = (S, w) => Object.entries(S).filter(([, ts]) => ts.some(t => t.includes(w))).map(([k]) => k);
const leaks = WORDS.map(w => [w, where(B, w)]).filter(([, ks]) => ks.length);
for (const [w, ks] of leaks) console.log(`  LEAK "${w}" in head ${ks.join(', ')}`);
const ledgerA = where(A, 'six-2006'); const ledgerB = where(B, 'six-2006');
console.log(`ledger key six-2006: base ${ledgerA.join(', ') || 'NOWHERE'} | head ${ledgerB.join(', ') || 'NOWHERE'}`);
const ledgerEqual = ledgerB.length > 0 && ledgerB.every(k => A[k] && A[k].map(norm).sort().join('\n') === B[k].map(norm).sort().join('\n'));
console.log(`distcmp: ${leaks.length === 0 ? 'no new block word in any built file' : `${leaks.length} new block words built`}; the ledger chunk is ${ledgerEqual ? 'EQUAL' : 'NOT equal (or not found)'} at base and head`);
process.exit(leaks.length === 0 && ledgerEqual ? 0 : 1);
