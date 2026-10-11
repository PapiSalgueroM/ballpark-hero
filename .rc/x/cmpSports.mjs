// Reviewer's runner helper: are two US board fixtures the same recording (everything but the header)?
// usage: node cmpSports.mjs <a.json> <b.json>   exit 0 when every sport is equal, 1 when not, 2 on a missing file
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [a, b] = process.argv.slice(2);
for (const f of [a, b]) if (!existsSync(f)) { console.log(`cmpSports: missing file ${f}`); process.exit(2); }
const sha = s => createHash('sha256').update(s).digest('hex');
const A = JSON.parse(readFileSync(a, 'utf8'));
const B = JSON.parse(readFileSync(b, 'utf8'));
console.log(`A ${a} sha256 ${sha(readFileSync(a))} recordedFrom ${A.header.recordedFrom}`);
console.log(`B ${b} sha256 ${sha(readFileSync(b))} recordedFrom ${B.header.recordedFrom}`);
let bad = 0;
const sports = [...new Set([...Object.keys(A.sports), ...Object.keys(B.sports)])];
for (const slug of sports) {
  const x = A.sports[slug], y = B.sports[slug];
  if (!x || !y) { console.log(`${slug}: missing on one side`); bad += 1; continue; }
  const parts = {
    coverage: JSON.stringify(x.coverage) === JSON.stringify(y.coverage),
    ssrCreate: JSON.stringify(x.ssrCreate) === JSON.stringify(y.ssrCreate),
    saveNames: JSON.stringify(Object.keys(x.saves)) === JSON.stringify(Object.keys(y.saves)),
    saveBytes: JSON.stringify(x.saves) === JSON.stringify(y.saves),
    path: JSON.stringify(x.path) === JSON.stringify(y.path),
    screens: JSON.stringify(x.screens) === JSON.stringify(y.screens),
  };
  const ok = Object.values(parts).every(Boolean);
  if (!ok) bad += 1;
  let first = '';
  if (!parts.path) {
    const i = x.path.findIndex((st, k) => JSON.stringify(st) !== JSON.stringify(y.path[k]));
    first = ` first path difference at step ${i}: A "${x.path[i]?.a}" [${x.path[i]?.p}] B "${y.path[i]?.a}" [${y.path[i]?.p}]`;
  }
  console.log(`${slug}: ${ok ? 'EQUAL' : 'DIFFERENT'} path ${x.path.length}/${y.path.length} saves ${Object.keys(x.saves).length}/${Object.keys(y.saves).length} ${JSON.stringify(parts)}${first}`);
}
const headerRest = h => JSON.stringify({ ...h, recordedFrom: '' });
console.log(`header apart from recordedFrom: ${headerRest(A.header) === headerRest(B.header) ? 'equal' : 'DIFFERENT'}`);
console.log(bad ? `cmpSports: DIFFERENT in ${bad} sport(s)` : `cmpSports: EQUAL in all ${sports.length} sports`);
process.exit(bad ? 1 : 0);
