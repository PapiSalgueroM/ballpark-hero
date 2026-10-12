// Round 1318 review: how often a generated rival's saved name ends in a number (the suffix loop), over natural careers.
// Usage: node rvm4.mjs <engine root> [N=24]   (careers start 2025, ST/CM/GK, seeds 1..N, played to retirement)
import path from 'node:path';
import fs from 'node:fs';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
const ROOT = path.resolve(process.argv[2] || '.'), N = Number(process.argv[3] || 24);
const outfile = fs.mkdtempSync('/tmp/rvm4-') + '/e.mjs';
await build({ stdin: { contents: "export * from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, banner: { js: 'globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };' } });
const E = await import(pathToFileURL(outfile).href);
const { careerStep, seedRandom } = await import(pathToFileURL(path.join(process.cwd(), 'scripts/lib/careerStep.mjs')).href);
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
let careers = 0, entries = 0, replaced = 0, suffixed = 0, shownSuffixed = 0; const examples = [];
for (const pos of ['ST', 'CM', 'GK']) for (let seed = 1; seed <= N; seed++) {
  seedRandom(seed * 977 + pos.charCodeAt(0));
  let c = E.initCareer('Suffix Probe', 'England', pos, 'modern', flat(70), 70, 2025, E.FALLBACK_CLUBS, null, 88);
  for (let g = 0; g < 2500 && !c.retired; g++) {
    c = careerStep(E, c, E.FALLBACK_CLUBS);
    if (c.phase === 'ballon_dor' && c.pendingBallonDor) shownSuffixed += c.pendingBallonDor.nominees.filter(n => n.generatedId !== undefined && / \d+$/.test(n.name)).length;
  }
  careers++;
  const pool = c.generatedBallonPool; if (!pool) continue;
  entries += pool.entries.length;
  replaced += pool.entries.filter(e => pool.entries.some(o => o.role === e.role && o.slot === e.slot && o.id < e.id)).length;
  for (const e of pool.entries) if (/ \d+$/.test(e.name)) { suffixed++; if (examples.length < 5) examples.push(e.name); }
}
console.log(`RVM4 ${ROOT}: ${careers} careers, ${entries} pool entries, ${replaced} replacements, ${suffixed} saved names ending in a number, ${shownSuffixed} such nominees shown on nights; e.g. ${examples.join(', ')}`);
