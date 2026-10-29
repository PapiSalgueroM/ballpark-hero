/* fix3 probe (never committed): the digest simUsCareerReports F3 holds, computed from any copy of
   careerSocial.ts. Usage: node ladderSha.mjs <path to careerSocial.ts> (run from the repo root).
   The positions come from the tree's four sport bindings; the comments from the file given. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const FILE = path.resolve(process.argv[2]);
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const OUT = path.join(os.tmpdir(), `ladder-${process.pid}.mjs`);
await build({
  stdin: {
    contents: SPORTS.map(s => `export { ${s.toUpperCase()}_CAREER_SPORT } from './src/lib/${s}CareerSport.ts';`).join('\n')
      + `\nexport { fanComments } from ${JSON.stringify(FILE.split(path.sep).join('/'))};\n`,
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error',
  alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* a copy */ }
/* Identical to simUsCareerReports F3. */
function ladderSha() {
  const SOCCER_POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const DERBIES = [null, { won: 1, lost: 0 }, { won: 0, lost: 1 }, { won: 1, lost: 1 }, { won: 0, lost: 0 }];
  const out = [];
  for (const sport of ['soccer', ...SPORTS]) {
    const positions = sport === 'soccer' ? SOCCER_POS : M[`${sport.toUpperCase()}_CAREER_SPORT`].create.positions;
    for (const pos of positions) for (let standing = 0; standing <= 100; standing++) for (const d of sport === 'soccer' ? DERBIES : [null]) {
      out.push(M.fanComments(sport, d ? { pos, standing, followers: '1.2M', derby: { ...d, rival: 'Rivals FC' } } : { pos, standing, followers: '1.2M' }).join('|'));
    }
  }
  return { sha: createHash('sha1').update(out.join('\n')).digest('hex').slice(0, 16), n: out.length };
}
const r = ladderSha();
console.log(`ladderSha ${r.sha} over ${r.n} ladders from ${FILE}`);
