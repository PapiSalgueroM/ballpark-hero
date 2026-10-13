// Round 1325: which built chunks differ between the base build (argv[2]) and this tree's build (argv[3]), with gzip sizes.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [baseDir, headDir] = [process.argv[2], process.argv[3]];
const list = d => new Set(fs.readdirSync(path.join(d, 'assets')).filter(f => f.endsWith('.js') || f.endsWith('.css')));
const gz = (d, f) => (zlib.gzipSync(fs.readFileSync(path.join(d, 'assets', f))).length / 1024).toFixed(2);
const b = list(baseDir);
const h = list(headDir);
const onlyB = [...b].filter(f => !h.has(f)).sort();
const onlyH = [...h].filter(f => !b.has(f)).sort();
let sb = 0;
let sh = 0;
for (const f of onlyB) { sb += Number(gz(baseDir, f)); console.log(`base only ${f} ${gz(baseDir, f)}K gz`); }
for (const f of onlyH) { sh += Number(gz(headDir, f)); console.log(`head only ${f} ${gz(headDir, f)}K gz`); }
console.log(`chunks that changed: ${onlyB.length} on the base (${sb.toFixed(2)}K gz), ${onlyH.length} on this tree (${sh.toFixed(2)}K gz), growth ${(sh - sb).toFixed(2)}K gz`);
