/**
 * genTeammatesPairs: write src/data/teammatesPairs.ts from the record alone.
 *
 * Round 921. Teammates or Not ships from scripts/data/teammatesVerified2026-10.json:
 * every row there is the shipped row word for word, and scripts/simTeammatesRecord.mjs
 * fails when the two disagree. So a row is changed in the RECORD (answer, funFact,
 * difficulty, and the claims that back the funFact), then this script rewrites the
 * shipped file, easy rows first, then medium, then hard, in record order.
 *
 *   node scripts/genTeammatesPairs.mjs           rewrite the shipped file
 *   node scripts/genTeammatesPairs.mjs --check   exit 1 when the file is not what
 *                                                the record makes, and write nothing
 *
 * Offline: it reads the record and writes one file, nothing else.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = 'scripts/data/teammatesVerified2026-10.json';
const OUT = 'src/data/teammatesPairs.ts';

const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), 'utf8'));
const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const line = r => `  { player1: "${esc(r.player1)}", player2: "${esc(r.player2)}", sport: "${r.sport}", answer: ${r.answer}, funFact: "${esc(r.funFact)}", difficulty: ${r.difficulty} },`;
const head = {
  1: '  // EASY (difficulty 1), obvious pairings',
  2: '\n  // MEDIUM (difficulty 2), less obvious',
  3: '\n  // HARD (difficulty 3), obscure overlaps and tricky false ones',
};
const ts = [
  "import { TeammatesPair } from '@/types/teammates';",
  '',
  '/* Every row is generated from scripts/data/teammatesVerified2026-10.json, which',
  '   holds two sources on two hosts for every player and every claim in a funFact',
  '   (the old soccer rows it marks legacy are still owed that). Edit the record,',
  '   never this file, then run node scripts/genTeammatesPairs.mjs:',
  '   scripts/simTeammatesRecord.mjs fails when the two disagree. */',
  'export const teammatesPairs: TeammatesPair[] = [',
];
for (const d of [1, 2, 3]) {
  ts.push(head[d]);
  for (const r of record.rows.filter(x => x.difficulty === d)) ts.push(line(r));
}
ts.push('];', '');
const want = ts.join('\n');
const outPath = path.join(ROOT, OUT);

if (process.argv.includes('--check')) {
  const have = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n') : '';
  if (have !== want) {
    console.error(`genTeammatesPairs: DRIFT, ${OUT} is not what ${RECORD} makes; run node scripts/genTeammatesPairs.mjs`);
    process.exitCode = 1;
  } else console.log(`genTeammatesPairs: ${OUT} is what the record makes (${record.rows.length} rows)`);
} else {
  fs.writeFileSync(outPath, want);
  console.log(`genTeammatesPairs: wrote ${OUT}, ${record.rows.length} rows`);
}
