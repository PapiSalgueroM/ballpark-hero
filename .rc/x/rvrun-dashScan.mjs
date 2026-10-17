// Reviewer probe (round 1340, runner lens): every line the branch adds since its base, scanned for the two dashes.
// Usage: node .rc/x/rvrun-dashScan.mjs <base sha>
import { execSync } from 'node:child_process';
const base = process.argv[2] || 'd8aaa4cb';
const diff = execSync(`git diff -U0 ${base}...HEAD`, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const bad = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
let file = '';
let added = 0;
const hits = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  added += 1;
  if (bad.some(d => line.includes(d))) hits.push(`${file}: ${line.slice(0, 160)}`);
}
for (const h of hits.slice(0, 20)) console.log(h);
console.log(`dashScan: ${added} added lines since ${base}, ${hits.length} carry an en or em dash`);
process.exit(hits.length ? 1 : 0);
