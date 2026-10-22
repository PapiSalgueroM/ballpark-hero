// Review of Round 1552 (read lens), runs on a GitHub runner only. Writes a copy of scripts/simTriviaBank.mjs
// whose CHECKER (not the bank) also treats the names given in PROBE_NAMES as namesakes, so section 2's
// "new rules ... namesakes N" line counts how often the shipped generator still asks about them.
// The bank under test is untouched. Usage: PROBE_NAMES='A|B' node .rc/x/probeMissed.mjs && node scripts/simTriviaBankReadProbe.mjs
import fs from 'node:fs';
const src = fs.readFileSync('scripts/simTriviaBank.mjs', 'utf8');
const from = "const NAMESAKES = new Set(JSON.parse(read('src/data/marketNamesakes.json')).names);";
if (!src.includes(from)) { console.error('probe cannot run: target line not found'); process.exit(2); }
const names = (process.env.PROBE_NAMES || '').split('|').filter(Boolean);
if (!names.length) { console.error('probe cannot run: PROBE_NAMES is empty'); process.exit(2); }
const to = `const NAMESAKES = new Set([...JSON.parse(read('src/data/marketNamesakes.json')).names, ...${JSON.stringify(names)}]);`;
fs.writeFileSync('scripts/simTriviaBankReadProbe.mjs', src.replace(from, to));
console.log('probe written, checker names added: ' + names.join(', '));
