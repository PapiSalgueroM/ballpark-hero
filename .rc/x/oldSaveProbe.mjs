/* Round 1600 probe (never committed): load scripts/data/cmOldSave1052Fixture.json through the engine of <root> and
   print every squad man whose loaded row differs from the file's, field by field. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(process.argv[2] || '.');
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oldsave-'));
const out = path.join(TMP, 'e.cjs');
await build({
  stdin: { contents: "export * as cm from '@/lib/clubManager';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(HERE, 'node_modules')],
});
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const { cm } = createRequire(import.meta.url)(out);
await cm.ensureAllEraRosters();
const raw = fs.readFileSync(path.join(HERE, 'scripts/data/cmOldSave1052Fixture.json'), 'utf8');
const parsed = JSON.parse(raw);
store.set(cm.SAVE_KEY, raw);
const s = cm.loadCareer();
console.log(`loaded ${s?.clubName}, squad ${s?.squad.length} (file ${parsed.squad.length})`);
const byId = new Map(parsed.squad.map(p => [p.id, p]));
for (const p of s.squad) {
  const f = byId.get(p.id);
  if (!f) { console.log(`  NEW ${p.id} ${p.name} ${JSON.stringify(p).slice(0, 160)}`); continue; }
  const keys = [...new Set([...Object.keys(p), ...Object.keys(f)])].filter(k => JSON.stringify(p[k]) !== JSON.stringify(f[k]));
  if (keys.length) console.log(`  ${p.name}: ${keys.map(k => `${k} ${JSON.stringify(f[k])} -> ${JSON.stringify(p[k])}`).join('; ')}`);
}
for (const f of parsed.squad) if (!s.squad.some(p => p.id === f.id)) console.log(`  GONE ${f.id} ${f.name}`);
console.log('order same', JSON.stringify(s.squad.map(p => p.id)) === JSON.stringify(parsed.squad.map(p => p.id)));
