/* scripts/genConquestKeyStats.mjs

   Round 1547. Rewrites every keyStat of NFL_TEAMS in src/data/conquestData.ts
   from the two sourced 2025 regular season file, through
   scripts/lib/conquestKeyStats.mjs (read its header for the rule). A row the
   file cannot back two ways gets an empty keyStat and the board prints none.

   The name starts with "gen" so scripts/runAllSims.mjs never runs it; the
   harness scripts/simConquestPeople.mjs runs the same rule and goes red when
   the committed file and the rule disagree. Offline: reads two files, writes one.

   USAGE
     node scripts/genConquestKeyStats.mjs           rewrite the keyStats
     node scripts/genConquestKeyStats.mjs --check   report only, exit 1 on any difference
     node scripts/genConquestKeyStats.mjs --list    print every row with the reason */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedNflKeyStats } from './lib/conquestKeyStats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data', 'conquestData.ts');
const PRODUCTION = path.join(ROOT, 'scripts', 'data', 'nfl2025Production.json');

const src = fs.readFileSync(DATA, 'utf8');
const production = JSON.parse(fs.readFileSync(PRODUCTION, 'utf8'));
const rows = expectedNflKeyStats(src, production);
const mode = process.argv[2] || '';

const tally = {};
for (const r of rows) {
  const k = r.expected ? 'printed' : r.how.replace(/:.*$/, '');
  tally[k] = (tally[k] || 0) + 1;
}
if (mode === '--list') for (const r of rows) console.log(`${r.team} ${r.position} ${r.name} | ${r.keyStat} -> ${r.expected || '(none)'} | ${r.how}`);
const diffs = rows.filter(r => r.keyStat !== r.expected);
console.log(`players ${rows.length}, ${JSON.stringify(tally)}, differing from the committed file ${diffs.length}`);

if (mode === '--check') process.exit(diffs.length ? 1 : 0);
if (mode === '') {
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(/\r?\n/);
  for (const r of diffs) {
    const p = r.parts;
    const q = r.expected.includes("'") ? '"' : "'";
    lines[r.line] = `${p[1]}${p[2]}${p[3]}${p[2]}${p[4]}${p[5]}${p[6]}${p[7]}${p[8]}${q}${r.expected}${q}${p[11]}`;
  }
  fs.writeFileSync(DATA, lines.join(nl));
  console.log(`rewrote ${diffs.length} keyStats in ${path.relative(ROOT, DATA)}`);
}
