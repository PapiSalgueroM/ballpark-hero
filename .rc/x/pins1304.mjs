// Round 1304 probe (sent as an extra file, never committed): what an unscoped leagueOf reads
// for the clubs simEra2020 section 8 pins, on whatever tree this file is copied into.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `pins1304Entry-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `pins1304-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${R}/src/lib/clubManager.ts');
export { engine };
`);
const { build } = await import('esbuild');
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error' });
const { engine: cm } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
const keys = Object.keys(cm.ERA_LEAGUES);
const real = new Set(cm.REAL_LEAGUES.flatMap(l => l.clubs));
const inEras = c => keys.filter(k => cm.ERA_LEAGUES[k].some(l => l.clubs.includes(c)));
console.log(`order ${JSON.stringify(cm.ERA_FALLBACK_ORDER ?? null)} keys ${JSON.stringify(keys)}`);
for (const c of ['Wigan Athletic', 'Zaragoza', 'Chievo Verona', 'Bordeaux', 'Caen', 'Leicester City', 'Cádiz']) {
  console.log(`PIN ${c}: reads ${cm.leagueOf(c).id}; eras ${inEras(c).join(',')}; modern league ${real.has(c) ? 'yes' : 'no'}`);
}
const eraOnly = [...new Set(keys.flatMap(k => cm.ERA_LEAGUES[k].flatMap(l => l.clubs)))].filter(c => !real.has(c));
console.log(`era-only ${eraOnly.length}, in two or more eras ${eraOnly.filter(c => inEras(c).length > 1).length}`);
console.log('pins1304 done');
