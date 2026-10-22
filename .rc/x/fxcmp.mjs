// Compare two US board fixtures step by step: which steps differ, in which fields, after which action.
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let total = 0;
const byAction = new Map(), fields = new Map();
console.log('headers equal:', JSON.stringify(a.header) === JSON.stringify(b.header));
for (const slug of Object.keys(a.sports)) {
  const A = a.sports[slug], B = b.sports[slug];
  for (const k of ['coverage', 'ssrCreate', 'saves']) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) console.log(`${slug} ${k} differs`);
  const lists = [['path', A.path, B.path], ...Object.keys(A.screens).map(s => [`screen ${s}`, A.screens[s], B.screens[s] ?? []])];
  for (const [name, x, y] of lists) {
    if (x.length !== y.length) console.log(`${slug} ${name}: ${x.length} steps against ${y.length}`);
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (JSON.stringify(x[i]) === JSON.stringify(y[i])) continue;
      total += 1;
      const diff = Object.keys({ ...x[i], ...y[i] }).filter(f => JSON.stringify(x[i][f]) !== JSON.stringify(y[i][f]));
      for (const f of diff) fields.set(f, (fields.get(f) ?? 0) + 1);
      const act = `${x[i].a}${x[i].a === y[i].a ? '' : ` / ${y[i].a}`}`;
      byAction.set(act, (byAction.get(act) ?? 0) + 1);
      if (process.env.FX_LIST) console.log(`  ${slug} ${name} step ${i}: ${act} [${diff.join(',')}]`);
    }
  }
}
console.log(`steps that differ: ${total}`);
console.log('by action:', JSON.stringify([...byAction]));
console.log('by field:', JSON.stringify([...fields]));
