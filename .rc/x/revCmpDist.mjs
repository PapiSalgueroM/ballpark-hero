// Reviewer probe for Round 1214: are two built sites the same files, name for name and byte for byte?
// usage: node revCmpDist.mjs <label A> <dist A> <label B> <dist B> [words that must not be in any built file of B]
// Written apart from the builder's own comparison on purpose. Exit 1 when the two differ.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [labelA, dirA, labelB, dirB, ...words] = process.argv.slice(2);
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const full = path.join(dir, e.name);
  return e.isDirectory() ? walk(full, base) : [path.relative(base, full)];
});
const digest = dir => {
  const map = new Map();
  let bytes = 0;
  for (const rel of walk(dir)) {
    const buf = fs.readFileSync(path.join(dir, rel));
    bytes += buf.length;
    map.set(rel, crypto.createHash('sha256').update(buf).digest('hex'));
  }
  return { map, bytes };
};
const a = digest(dirA);
const b = digest(dirB);
const onlyA = [...a.map.keys()].filter(k => !b.map.has(k));
const onlyB = [...b.map.keys()].filter(k => !a.map.has(k));
const other = [...a.map.keys()].filter(k => b.map.has(k) && b.map.get(k) !== a.map.get(k));
console.log(`${labelA}: ${a.map.size} files, ${a.bytes} bytes. ${labelB}: ${b.map.size} files, ${b.bytes} bytes.`);
console.log(`only in ${labelA}: ${onlyA.length}; only in ${labelB}: ${onlyB.length}; same name and other bytes: ${other.length}`);
for (const k of [...onlyA.slice(0, 8), ...onlyB.slice(0, 8), ...other.slice(0, 8)]) console.log(`   differs: ${k}`);
const entry = dir => (fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/assets\/index-[A-Za-z0-9_-]+\.js/) ?? ['none'])[0];
console.log(`entry: ${labelA} ${entry(dirA)}, ${labelB} ${entry(dirB)}`);
const cm = dir => walk(dir).filter(f => /club-?manager/i.test(path.basename(f)) && f.endsWith('.js')).map(f => path.basename(f)).sort();
console.log(`Club Manager chunks: ${labelA} ${cm(dirA).length}, ${labelB} ${cm(dirB).length}, same names: ${JSON.stringify(cm(dirA)) === JSON.stringify(cm(dirB))}`);
let mentions = 0;
if (words.length) {
  for (const rel of walk(dirB)) {
    if (!/\.(js|html|css|json|map)$/.test(rel)) continue;
    const text = fs.readFileSync(path.join(dirB, rel), 'utf8');
    for (const w of words) if (text.includes(w)) { mentions += 1; if (mentions <= 8) console.log(`   ${rel} mentions ${w}`); }
  }
  console.log(`built files of ${labelB} that mention ${words.join(', ')}: ${mentions}`);
}
const same = !onlyA.length && !onlyB.length && !other.length;
console.log(same ? `revCmpDist: SAME. ${labelA} and ${labelB} are the same ${a.map.size} files, byte for byte.` : `revCmpDist: DIFFERENT. ${labelA} and ${labelB} are not the same build.`);
process.exit(same && !mentions ? 0 : 1);
