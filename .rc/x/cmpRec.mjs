// Fix pass: is a FRESH recording of the US board the committed one? Compared sport by sport, every part
// (coverage, the server rendered create screen, the saves, the path, the screens). The stamp outside the sports
// (recordedFrom and the like) is not compared. usage: node cmpRec.mjs <committed.json> <fresh.json>
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let bad = 0;
for (const slug of Object.keys(a.sports)) {
  const x = a.sports[slug], y = b.sports?.[slug];
  const parts = [...new Set([...Object.keys(x), ...Object.keys(y ?? {})])];
  const differ = parts.filter(k => JSON.stringify(x[k]) !== JSON.stringify(y?.[k]));
  if (differ.length) bad += 1;
  console.log(`cmpRec ${slug}: ${differ.length ? 'DIFFERS in ' + differ.join(', ') : 'EQUAL in every part'} (${x.path.length} path steps committed, ${y?.path?.length ?? 0} fresh; ${Object.keys(x.saves).length} saves)`);
}
console.log(bad ? `cmpRec: ${bad} sport(s) DIFFER` : `cmpRec: EQUAL in all ${Object.keys(a.sports).length} sports. A fresh recording on this head is the committed recording.`);
process.exit(bad ? 1 : 0);
