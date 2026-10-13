/* Release AZ fix pass 4, a MEASUREMENT only (never committed): the head with the own club market rule taken out
 * (worldMarket lists my own club's world roster again, ledger or none), the name dedupe kept. The same two lines
 * simFreeAgents' FA_CONTROL=ownclub puts back. node mutNoOwn.mjs <worktree root>; fails closed on each anchor. */
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.argv[2] ?? process.cwd(), 'src/lib/clubManager.ts');
let src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const edits = [
  ['  if (!held) return worldSeedOf(career) === undefined ? fallback : fallback.filter(p => p.club !== career.clubName);\n', '  if (!held) return fallback;\n'],
  ['    if (club === current.clubName) continue;\n', ''],
];
for (const [from, to] of edits) {
  const count = src.split(from).length - 1;
  if (count !== 1) { console.error(`mutNoOwn: anchor found ${count} times: ${from.slice(0, 70)}`); process.exit(2); }
  src = src.replace(from, to);
}
fs.writeFileSync(file, src);
console.log('mutNoOwn: the own club market rule is out (2 edits applied)');
