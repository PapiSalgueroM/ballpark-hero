// Round 1313 correction 8b (sent to a runner as an extra file, never committed): swap the two first keys a
// starter's block writes in mlbStatLineFor (era and wins: wins reads no era, so every value stays the same and
// only the key order moves). src/test/usRivalLine.test.ts must then fail on the key order.
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = 'src/lib/mlbMyCareer.ts';
const L = readFileSync(FILE, 'utf8').split('\n');
const start = L.findIndex(l => l.startsWith('export function mlbStatLineFor('));
const era = L.findIndex((l, k) => k > start && l.startsWith('    full.era = Math.max(1.85,'));
const wins = L.findIndex((l, k) => k > start && l.startsWith('    full.wins = Math.max(1, Math.round(gs *'));
if (start < 0 || era < 0 || wins !== era + 1) { console.error(`anchors not found (start ${start}, era ${era}, wins ${wins}): refusing`); process.exit(2); }
[L[era], L[wins]] = [L[wins], L[era]];
writeFileSync(FILE, L.join('\n'));
console.log(`swapped lines ${era + 1} and ${wins + 1} of ${FILE}`);
