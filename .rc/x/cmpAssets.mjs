// Round 1214 probe, run on a GitHub runner only (sent as .rc/x/cmpAssets.mjs, never committed):
// the built site of the branch head against the base built the same way, by hashed file name and by bytes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dirs = { base: '/tmp/base/dist', head: '/tmp/head/dist', head2: '/tmp/head2/dist' };
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const listing = {};
for (const [name, dir] of Object.entries(dirs)) {
  if (!fs.existsSync(dir)) { console.log(`cmpAssets: ${dir} is missing`); process.exit(2); }
  listing[name] = new Map(walk(dir).map(f => [path.relative(dir, f), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
}
const compare = (a, b) => {
  const onlyA = [...listing[a].keys()].filter(k => !listing[b].has(k));
  const onlyB = [...listing[b].keys()].filter(k => !listing[a].has(k));
  const bytes = [...listing[a].keys()].filter(k => listing[b].has(k) && listing[b].get(k) !== listing[a].get(k));
  console.log(`${a} against ${b}: ${listing[a].size} and ${listing[b].size} files; names only in ${a}: ${onlyA.length}, only in ${b}: ${onlyB.length}; same name, other bytes: ${bytes.length}`);
  for (const k of [...onlyA.slice(0, 12).map(x => `  only ${a}: ${x}`), ...onlyB.slice(0, 12).map(x => `  only ${b}: ${x}`), ...bytes.slice(0, 12).map(x => `  bytes differ: ${x}`)]) console.log(k);
  return onlyA.length + onlyB.length + bytes.length;
};
const entry = (name) => [...listing[name].keys()].filter(k => /^assets\/index-[^/]+\.js$/.test(k)).join(', ');
const clubManager = (name) => [...listing[name].keys()].filter(k => /clubmanager/i.test(k)).sort();
console.log(`entry: base ${entry('base')} | head ${entry('head')} | head again ${entry('head2')}`);
console.log(`Club Manager chunks: base ${clubManager('base').length}, head ${clubManager('head').length}, same names: ${JSON.stringify(clubManager('base')) === JSON.stringify(clubManager('head'))}`);
console.log(clubManager('head').slice(0, 30).join(' '));
const wrapped = [...listing.head.keys()].filter(k => /\.js$/.test(k)).filter(k => /cmAgeRead|levelFrom|readInWorld/.test(fs.readFileSync(path.join(dirs.head, k), 'utf8')));
console.log(`built head files that mention the new library: ${wrapped.length} ${wrapped.join(' ')}`);
const noise = compare('head', 'head2');
const moved = compare('base', 'head');
fs.writeFileSync(path.join(process.env.RC_OUT ?? '/tmp', 'assets.json'), JSON.stringify({ base: [...listing.base.keys()].sort(), head: [...listing.head.keys()].sort() }));
if (moved === 0) { console.log('cmpAssets: INERT. The head builds the very files the base builds, name for name and byte for byte.'); process.exit(0); }
console.log(`cmpAssets: the head and the base differ in ${moved} file(s); the same head built twice differs in ${noise}`);
process.exit(1);
