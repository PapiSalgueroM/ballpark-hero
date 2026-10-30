/* Reviewer helper for Round 1597 (runner only). Copied to scripts/; writes a real saveCareer string of an Everton
   career four league weeks from the end of season 1 into $RC_OUT/walksave.txt, with one made up 41 year old put on
   the free agent list (so the new season's "Retired off the free agent list" tile has someone to show). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as hub from './src/lib/clubManagerHubLines';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'mkwalk.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent' });
const module = { exports: {} }; const store = new Map();
const require = createRequire(path.join(ROOT, 'package.json'));
const ctx = vm.createContext({ module, exports: module.exports, require, console, process, Buffer, Math, Date, URL, URLSearchParams,
  TextEncoder, TextDecoder, structuredClone, performance, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: () => Promise.reject(new Error('no network here')),
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text, { filename: 'mkwalk.cjs' }).runInContext(ctx);
const { cm, eras, hub } = module.exports;
await eras.ensureAllEraRosters();
let seed = 0x1597f; Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let s = cm.startCareer('Everton', 'now');
const left = st => (st.calendar ?? []).slice(Math.max(0, st.week)).filter(e => e.type === 'league').length;
for (let i = 0; i < 400 && left(s) > 4; i += 1) {
  if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
  const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state;
  if (r.kind === 'seasonOver' || s.sacked) break;
}
s = { ...s, budget: Math.max(s.budget, 120), freeAgents: [...(s.freeAgents ?? []), { name: 'Walk Probe Veteran', position: 'CB', age: 41, rating: 58, since: 1, reason: 'expired' }] };
const line = hub.expiringDealsLine(s);
console.log(`mkwalk: season ${s.season} week ${s.week}, league weeks left ${left(s)}, expiring ${cm.expiringPlayers(s).length}, hub line ${JSON.stringify(line)}, pool ${s.freeAgents.length}, sacked ${!!s.sacked}`);
if (!cm.saveCareer(s)) { console.log('mkwalk: saveCareer refused'); process.exit(2); }
fs.writeFileSync(path.join(process.env.RC_OUT || '.', 'walksave.txt'), store.get(cm.SAVE_KEY));
console.log('mkwalk: wrote walksave.txt');
for (let i = 0; i < 400; i += 1) {
  if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
  const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state;
  if (r.kind === 'seasonOver' || s.sacked) break;
}
s = cm.finishSeason(s).state;
console.log(`mkwalk: end of season ${s.season}, review pending ${!!s.pendingSummary}, expiring ${cm.expiringPlayers(s).length}, sacked ${!!s.sacked}`);
if (!cm.saveCareer(s)) { console.log('mkwalk: saveCareer refused at the end'); process.exit(2); }
fs.writeFileSync(path.join(process.env.RC_OUT || '.', 'walkend.txt'), store.get(cm.SAVE_KEY));
console.log('mkwalk: wrote walkend.txt');
