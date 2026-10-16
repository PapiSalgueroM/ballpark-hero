// Review 1508: regenerate the old careers fixture and compare everything but the "made" line.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
execFileSync('node', ['scripts/genCmOldCareersWorldFixture.mjs', '/tmp/fx-regen2.json'], { stdio: 'inherit' });
const a = JSON.parse(fs.readFileSync('/tmp/fx-regen2.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('scripts/data/cmOldCareersWorldFixture.json', 'utf8'));
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
const differ = keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
console.log(`made: regenerated "${a.made}" vs committed "${b.made}"`);
for (const k of ['pre', 'mid']) console.log(`${k}: save equal ${a.saves[k] === b.saves[k]} (${a.saves[k].length} vs ${b.saves[k].length})`);
console.log(differ.length === 1 && differ[0] === 'made' ? 'fxcmp: EQUAL apart from the made line' : `fxcmp: DIFFER in ${differ.join(', ')}`);
process.exit(differ.length === 1 && differ[0] === 'made' ? 0 : 1);
