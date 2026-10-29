// Probe for PR 408: run the SHIPPED buildCriteria / generateBoard on a pool built from repo data.
//   pool: scripts/data/auctionMarketRows.json (year 2026 rows), top 500 by value, as fetchBingoData keeps them.
//   seasonStats: scripts/data/stockMarketPools.json rows 2014 to 2022 matched by name and isSameMan,
//   plus each man's 2026 row (goals, assists; matches unknown so null).
// Prints: which named men each new tile accepts, and a seeded bluff rate (share of drawn men who fit at
// least one tile of the value, age, position and season-stat kinds on the board) for main versus the PR.
// Usage: node .tmp-fx/probe408.mjs <repoRoot> <mainSha>
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const mainSha = process.argv[3] || 'b20ec6664';
const out = path.join(root, '.tmp-fx', 'probe408-' + Date.now());
mkdirSync(out, { recursive: true });
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'stub', namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("no network in probe"); } }); export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
  b.onResolve({ filter: /^@\// }, a => {
    const base = path.join(root, 'src', a.path.slice(2));
    for (const ext of ['', '.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx']) if (existsSync(base + ext) && (ext || /\.[a-z]+$/.test(base))) return { path: base + ext };
    return { path: base + '.ts' };
  });
} };
async function bundle(libFile, name) {
  const entry = path.join(out, name + '-entry.ts');
  writeFileSync(entry, `export { buildCriteria, generateBoard, MIN_TILE_SUPPORT } from ${JSON.stringify(libFile.replaceAll('\\', '/'))};`);
  const file = path.join(out, name + '.mjs');
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: file, plugins: [stub], logLevel: 'error',
    resolveExtensions: ['.ts', '.tsx', '.js', '.mjs', '.json'] });
  return import(pathToFileURL(file).href);
}
const mainLib = path.join(out, 'playerBingo.main.ts');
writeFileSync(mainLib, execFileSync('git', ['-C', root, 'show', `${mainSha}:src/lib/playerBingo.ts`], { encoding: 'utf8' }));
const PR = await bundle(path.join(root, 'src/lib/playerBingo.ts'), 'pr');
const MAIN = await bundle(mainLib, 'main');

const rows = JSON.parse(readFileSync(path.join(root, 'scripts/data/auctionMarketRows.json'), 'utf8'));
const pool = [...rows].sort((a, b) => b.market_value_usd - a.market_value_usd).slice(0, 500).map(r => ({
  name: r.player_name, nationality: r.nationality || '', position: r.position || '', club: r.club || '',
  value: r.market_value_usd, age: r.age, year: 2026, g26: r.goals, a26: r.assists }));
const sm = JSON.parse(readFileSync(path.join(root, 'scripts/data/stockMarketPools.json'), 'utf8'));
const seasonStats = new Map();
for (const p of pool) seasonStats.set(p.name, [{ goals: p.g26, assists: p.a26, matches: null, yellowCards: null, redCards: null }]);
for (const list of Object.values(sm.pools)) for (const r of list) {
  const [name, , age, matches, goals, assists, yc, rc, , year] = r;
  const p = pool.find(x => x.name === name);
  if (!p || Math.abs((p.age - age) - (p.year - year)) > 1) continue;
  seasonStats.get(name).push({ goals, assists, matches, yellowCards: yc, redCards: rc, year });
}
const fold = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const clubHistory = new Map(pool.map(p => [p.name, new Set([fold(p.club)])]));
const data = { pool, clubHistory, clubYears: new Map(), seasonStats, worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set() };
const prCrit = PR.buildCriteria(data);
const ids = ['age-22-to-25', 'age-26-to-28', 'season-goals-10-under-30-matches', 'value-30m-under-50m'];
const named = ['Erling Haaland', 'Vinicius Junior', 'Dominik Szoboszlai', 'Phil Foden', 'Ousmane Dembélé', 'Lautaro Martínez', 'Cole Palmer', 'Curtis Jones', 'Kylian Mbappé'];
for (const id of ids) {
  const c = prCrit.find(x => x.id === id);
  console.log(`${id} label="${c.label}" support ${c.support.length}/${pool.length} | ` + named.map(n => { const p = pool.find(x => x.name === n); return p ? `${n}=${c.test(p, data) ? 'YES' : 'no'}` : `${n}=absent`; }).join(' '));
}
for (const n of ['Cole Palmer', 'Curtis Jones']) {
  console.log(n, 'rows that pass the goals-under-30 tile:', JSON.stringify((seasonStats.get(n) || []).filter(s => (s.goals ?? 0) >= 10 && s.matches != null && s.matches > 0 && s.matches < 30)));
}
// bluff rate, seeded Math.random, kinds we can feed from repo data only
const KINDS = new Set(['value', 'age', 'position', 'season-stat']);
function bluff(M, seed) {
  let s = seed; const orig = Math.random; Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  try {
    const crit = M.buildCriteria(data); let fit = 0, n = 0, perKind = 0;
    for (let b = 0; b < 1500; b++) {
      const board = M.generateBoard(crit).filter(c => KINDS.has(c.kind)); perKind += board.length;
      for (let k = 0; k < 20; k++) { const p = pool[Math.floor(Math.random() * pool.length)]; n++; if (board.some(c => c.support.includes(p.name))) fit++; }
    }
    return { fitPct: (100 * fit / n).toFixed(1), tilesOfTheseKindsPerBoard: (perKind / 1500).toFixed(2) };
  } finally { Math.random = orig; }
}
for (const seed of [11, 29, 47]) console.log('seed', seed, 'main', JSON.stringify(bluff(MAIN, seed)), 'pr', JSON.stringify(bluff(PR, seed)));
console.log('probe408 done');
