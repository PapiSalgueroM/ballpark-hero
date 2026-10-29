// Skeptic probe for BS-mix-2: run the SHIPPED fetchBingoData + buildCriteria of src/lib/playerBingo.ts
// with the supabase client replaced by an in-memory fake that serves player_market_values from repo copies:
//   scripts/data/stockMarketPools.json (straight rows of player_market_values via the player_market_tracked
//   view, years 2014 to 2022) plus scripts/data/auctionMarketRows.json as the 2026 rows (no matches column).
// world_cup_players and ballon_dor are served empty. No network.
// Usage: node .tmp-fx/probeBSmix2.mjs <repoRoot> [control]   control=noyouth drops every history row aged 19 or under.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const control = process.argv[3] || '';
const out = path.join(root, '.tmp-fx', 'pbx-' + Date.now());
mkdirSync(out, { recursive: true });
const fakeClient = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'fakeSupabase.mjs').split(path.sep).join('/');
const plugin = { name: 'fake', setup(b) {
  b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: fakeClient }));
  b.onResolve({ filter: /^@\// }, a => {
    const base = path.join(root, 'src', a.path.slice(2));
    for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx', '.json', '']) if (existsSync(base + ext) && (ext || /\.[a-z]+$/.test(base))) return { path: base + ext };
    return { path: base + '.ts' };
  });
} };
const entry = path.join(out, 'entry.ts');
writeFileSync(entry, `export { fetchBingoData, buildCriteria, MIN_TILE_SUPPORT } from ${JSON.stringify(path.join(root, 'src/lib/playerBingo.ts').split(path.sep).join('/'))};`);
const file = path.join(out, 'bundle.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: file, plugins: [plugin], logLevel: 'error' });

const sm = JSON.parse(readFileSync(path.join(root, 'scripts/data/stockMarketPools.json'), 'utf8'));
const seen = new Set();
const rows = [];
let id = 1;
for (const list of Object.values(sm.pools)) for (const r of list) {
  const key = r.join('|');
  if (seen.has(key)) continue;
  seen.add(key);
  const [player_name, position, age, matches, goals, assists, yellow_cards, red_cards, market_value_usd, year] = r;
  if (control === 'noyouth' && age != null && age <= 19) continue;
  rows.push({ id: id++, player_name, position, age, matches, goals, assists, yellow_cards, red_cards, market_value_usd, year, nationality: null, club: null });
}
for (const r of JSON.parse(readFileSync(path.join(root, 'scripts/data/auctionMarketRows.json'), 'utf8'))) {
  rows.push({ id: id++, player_name: r.player_name, position: r.position, age: r.age, matches: null, goals: r.goals, assists: r.assists,
    yellow_cards: null, red_cards: null, market_value_usd: r.market_value_usd, year: 2026, nationality: r.nationality, club: r.club });
}
globalThis.__FAKE_TABLES = { player_market_values: rows, world_cup_players: [], ballon_dor: [] };
const lib = await import(pathToFileURL(file).href);
const data = await lib.fetchBingoData();
if (!data) { console.log('fetchBingoData returned null'); process.exit(2); }
console.log('control', control || 'none', 'rows served', rows.length, 'pool', data.pool.length, 'seasonStats men', data.seasonStats.size);
const crit = lib.buildCriteria(data);
const tile = crit.find(c => c.id === 'season-goals-10-under-30-matches');
if (!tile) { console.log('tile not built'); process.exit(3); }
const passing = data.pool.filter(p => tile.test(p, data));
console.log('tile', JSON.stringify(tile.label), 'support', tile.support.length, 'MIN_TILE_SUPPORT', lib.MIN_TILE_SUPPORT, 'satisfiers', passing.length);
for (const name of ['Cole Palmer', 'Curtis Jones', 'Folarin Balogun', 'Endrick', 'Moise Kean', 'Erling Haaland']) {
  const p = data.pool.find(x => x.name === name);
  if (!p) { console.log(`${name}: not in pool`); continue; }
  const lines = (data.seasonStats.get(name) || []).filter(s => (s.goals ?? 0) >= 10 && s.matches != null && s.matches > 0 && s.matches < 30);
  console.log(`${name}: pool age ${p.age} value ${p.value}; tile accepts = ${tile.test(p, data)}; passing stat lines ${JSON.stringify(lines)}`);
}
const hist = new Map();
for (const r of rows) if (r.year < 2026) { if (!hist.has(r.player_name)) hist.set(r.player_name, []); hist.get(r.player_name).push(r); }
let youthOnly = 0;
for (const p of passing) {
  const own = (hist.get(p.name) || []).filter(r => (r.goals ?? 0) >= 10 && r.matches > 0 && r.matches < 30);
  const ages = own.map(r => `${r.year}/age${r.age}:${r.matches}m${r.goals}g`).join(',');
  if (own.length && own.every(r => r.age <= 19)) youthOnly++;
  console.log(`  satisfier ${p.name} via ${ages}`);
}
console.log('satisfiers whose only passing rows are at age 19 or under:', youthOnly, 'of', passing.length);
