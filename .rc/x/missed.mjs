// Read only probe (review of Round 1552): names in the 2026 slice whose saved 2014 to 2022 raw rows
// show two men in one season (two different positions in the same season, or a goalkeeper and an
// outfielder), and which the shipped namesake list leaves out.
import fs from 'node:fs';
const ROOT = process.argv[2];
const read = p => JSON.parse(fs.readFileSync(ROOT + '/' + p, 'utf8'));
const stock = read('scripts/data/stockMarketPools.json');
const slice = read('scripts/data/alphabetSprintPool.json').rows.slice()
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const listed = new Set(read('src/data/marketNamesakes.json').names);
const N = slice.length, E = Math.max(30, Math.floor(N * 0.02)), M = Math.floor(N * 0.2);
const idx = new Map(slice.map((r, i) => [r.player_name, i]));
const band = i => (i < E ? 'easy' : i < M ? 'medium' : 'hard');
const bySeason = new Map();
for (const [season, rows] of Object.entries(stock.pools)) for (const [name, pos, age] of rows) {
  if (!idx.has(name)) continue;
  const k = name + '|' + season;
  if (!bySeason.has(k)) bySeason.set(k, []);
  bySeason.get(k).push({ pos, age });
}
const hits = new Map();
for (const [k, rows] of bySeason) {
  const [name, season] = k.split('|');
  const pos = new Set(rows.map(r => r.pos));
  if (pos.size < 2) continue;
  const gk = rows.some(r => r.pos === 'Goalkeeper') && rows.some(r => r.pos !== 'Goalkeeper');
  if (!hits.has(name)) hits.set(name, { seasons: 0, gk: false, ex: '' });
  const h = hits.get(name);
  h.seasons += 1; h.gk ||= gk;
  if (!h.ex) h.ex = season + ': ' + rows.map(r => r.pos + ' ' + r.age).join(', ');
}
const missed = [...hits].filter(([n, h]) => !listed.has(n) && h.seasons >= 2);
console.log('names with two positions in one season, in 2 or more seasons:', [...hits].filter(([, h]) => h.seasons >= 2).length, 'of which NOT on the list:', missed.length);
for (const [n, h] of missed.sort((a, b) => idx.get(a[0]) - idx.get(b[0]))) {
  const r = slice[idx.get(n)];
  console.log(`  ${n} [${band(idx.get(n))} #${idx.get(n)}; ${r.nationality}; ${r.club}; ${r.market_value_usd / 1e6}M] seasons ${h.seasons}${h.gk ? ' GK+outfield' : ''}; e.g. ${h.ex}`);
}
