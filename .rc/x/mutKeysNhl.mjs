// Round 1313 correction 8b (sent to a runner as an extra file, never committed): swap the two keys a goalie's
// block writes in nhlStatLineFor (wins and svpct: neither reads the other, so the values stay and only the key
// order moves). src/test/usRivalLine.test.ts must then fail on the key order.
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = 'src/lib/nhlMyCareer.ts';
const L = readFileSync(FILE, 'utf8').split('\n');
const start = L.findIndex(l => l.startsWith('export function nhlStatLineFor('));
const wins = L.findIndex((l, k) => k > start && l.startsWith('    full.wins = Math.max(8,'));
const sv = L.findIndex((l, k) => k > start && l.startsWith('    full.svpct = Math.min(0.938,'));
if (start < 0 || wins < 0 || sv !== wins + 1) { console.error(`anchors not found (start ${start}, wins ${wins}, svpct ${sv}): refusing`); process.exit(2); }
[L[wins], L[sv]] = [L[sv], L[wins]];
writeFileSync(FILE, L.join('\n'));
console.log(`swapped lines ${wins + 1} and ${sv + 1} of ${FILE}`);
