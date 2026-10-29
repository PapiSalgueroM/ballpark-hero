// Compare the committed searchKeywords.json (HEAD) with the working copy after a regeneration.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const before = JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/searchKeywords.json'], { encoding: 'utf8' }));
const after = JSON.parse(fs.readFileSync('src/data/searchKeywords.json', 'utf8'));
console.log(`source ${before.source} -> ${after.source}`);
const keys = new Set([...Object.keys(before.k), ...Object.keys(after.k)]);
let changed = 0;
for (const k of [...keys].sort()) {
  const a = new Set((before.k[k] || '').split(' ').filter(Boolean));
  const b = new Set((after.k[k] || '').split(' ').filter(Boolean));
  const out = [...a].filter(w => !b.has(w));
  const inn = [...b].filter(w => !a.has(w));
  if (out.length || inn.length) {
    changed++;
    console.log(`${k}: out=[${out.join(',')}] in=[${inn.join(',')}]`);
  }
}
console.log(`games changed: ${changed} of ${keys.size}`);
