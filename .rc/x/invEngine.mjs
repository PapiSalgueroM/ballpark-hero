// Review probe (runner only, never committed). Apply the round's own exported inverse, awardGenerationsInverse
// (scripts/lib/careerAwardsNight1172.mjs: Round 1318's five rows, then PR234's nine), to the engine, each row found
// exactly once on the text the rows before it produced. The result must be main's engine byte for byte
// (sha256 0d9ab4a2...30ea); the caller restores the file with git checkout in the same line.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { awardGenerationsInverse } from '../../scripts/lib/careerAwardsNight1172.mjs';
const file = 'src/lib/soccerCareerEngine.ts';
let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
for (const row of awardGenerationsInverse) {
  if (row.file !== file) { console.log(`INVERSE ABORTED: a row for ${row.file}`); process.exit(3); }
  const n = text.split(row.from).length - 1;
  if (n !== 1) { console.log(`INVERSE ABORTED: a row found ${n} times`); process.exit(3); }
  text = text.replace(row.from, row.to);
}
const sha = crypto.createHash('sha256').update(text).digest('hex');
const want = '0d9ab4a21241ca1d993fbc7a7176d3ed0de988d6cd2e6989d662c6a1307730ea';
if (sha !== want) { console.log(`INVERSE ABORTED: engine sha256 ${sha}, want ${want}`); process.exit(3); }
fs.writeFileSync(file, text);
console.log(`INVERSE APPLIED: ${awardGenerationsInverse.length} rows, engine is main's byte for byte (${sha.slice(0, 8)})`);
