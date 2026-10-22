/* Round 1550 probe: what the /front-office route chunk pulls in statically beyond the entry, by gzipped file and
   by module. Usage: node chunkReport.mjs <chunks.json> <dist dir> [chunk name prefix, default FrontOffice-] */
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
const [json, dist, prefix = 'FrontOffice-'] = process.argv.slice(2);
const chunks = JSON.parse(fs.readFileSync(json, 'utf8'));
const by = new Map(chunks.map(c => [c.f, c]));
const closure = (start) => {
  const seen = new Set();
  const walk = (f) => { if (seen.has(f)) return; seen.add(f); for (const i of by.get(f)?.imports ?? []) walk(i); };
  walk(start);
  return seen;
};
const entry = chunks.find(c => c.entry);
const entrySet = closure(entry.f);
const route = chunks.find(c => c.f.includes('/' + prefix) || c.f.startsWith('assets/' + prefix));
if (!route) { console.log('no chunk named', prefix); process.exit(1); }
const own = [...closure(route.f)].filter(f => !entrySet.has(f));
const gz = (f) => gzipSync(fs.readFileSync(`${dist}/${f}`)).length;
let total = 0;
for (const f of own.sort()) {
  const g = gz(f); total += g;
  const mods = Object.entries(by.get(f).mods).sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([id, n]) => `${id.split('/').slice(-2).join('/')}:${n}`).join(' ');
  console.log(`${(g / 1024).toFixed(1)}K ${f} | ${mods}`);
}
let entryTotal = 0; for (const f of entrySet) entryTotal += gz(f);
console.log(`route-own ${(total / 1024).toFixed(1)}K in ${own.length} files; entry closure ${(entryTotal / 1024).toFixed(1)}K in ${entrySet.size} files`);
console.log('dynamic imports of the route chunk:', (route.dyn ?? []).map(f => `${f}:${(gz(f) / 1024).toFixed(1)}K`).join(' '));
