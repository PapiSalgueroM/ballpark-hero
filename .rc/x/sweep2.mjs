// Round 1521 probe, never committed: set LONG_PASS (metres) in scene.ts for one runner line.
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'src/components/pitch-motion/scene.ts';
const src = readFileSync(file, 'utf8');
const re = /const LONG_PASS = [0-9.]+;/;
if (!re.test(src)) { console.log('sweep2: ABORT, the LONG_PASS line is not in scene.ts'); process.exit(1); }
writeFileSync(file, src.replace(re, `const LONG_PASS = ${Number(process.argv[2])};`));
console.log(`sweep2: LONG_PASS ${process.argv[2]}`);
