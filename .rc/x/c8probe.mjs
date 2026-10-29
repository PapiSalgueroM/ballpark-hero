// Runner probe for C8's cold run: prints each arm's draw counts at the six marks, and (mode warm-absent or
// warm-written) presses one discarded career through first. The line restores src with git checkout.
import { readFileSync, writeFileSync } from 'node:fs';

const mode = process.argv[2] || 'log';
const FILE = 'src/test/usCareerHallWall.test.tsx';
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const LOOP = "    for (let seed = 0; seed < 5; seed += 1) {\n      const written = await pressThrough(sport, seed, 'written');";
const AFTER = "      const absent = await pressThrough(sport, seed, 'absent');\n";
for (const a of [LOOP, AFTER]) if (src.split(a).length !== 2) { console.error(`c8probe: anchor not found once: ${a.slice(0, 60)}`); process.exit(2); }
src = src.replace(AFTER, `${AFTER}      console.log('C8COUNTS', sport.label, seed, JSON.stringify({ w: written.counts, r: refused.counts, a: absent.counts }));\n`);
if (mode === 'warm-absent') src = src.replace(LOOP, `    await pressThrough(sport, 0, 'absent');\n${LOOP}`);
if (mode === 'warm-written') src = src.replace(LOOP, `    await pressThrough(sport, 0, 'written');\n${LOOP}`);
writeFileSync(FILE, src);
console.log(`c8probe: ${mode} applied`);
