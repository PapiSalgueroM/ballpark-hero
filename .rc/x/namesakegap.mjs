// Reviewer probe: names in the 2026 slice whose saved raw rows carry two rows in ONE season with
// positions in different lines of the pitch (goalkeeper, defence, midfield, attack), which one man
// cannot be in one snapshot, but which the generator's rules A (ages 2+ apart) and B (birth years
// 3+ apart) do not catch because the two men are the same age.
import fs from 'node:fs';
const slice = JSON.parse(fs.readFileSync('scripts/data/alphabetSprintPool.json', 'utf8')).rows.filter(r => r.player_name && r.market_value_usd);
const stock = JSON.parse(fs.readFileSync('scripts/data/stockMarketPools.json', 'utf8'));
const listed = new Set(JSON.parse(fs.readFileSync('src/data/marketNamesakes.json', 'utf8')).names);
const sorted = [...slice].sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : 1));
const rank = new Map(sorted.map((r, i) => [r.player_name, i]));
const N = sorted.length, EASY = Math.max(30, Math.floor(N * 0.02)), MID = Math.floor(N * 0.2);
const band = i => (i < EASY ? 'easy' : i < MID ? 'medium' : 'hard');
const line = p => (!p ? null : /keeper/i.test(p) ? 'GK' : /back|defen[cs]e|sweeper/i.test(p) && !/midfield/i.test(p) ? 'DEF' : /midfield/i.test(p) ? 'MID' : 'ATT');
const seasons = new Map();
for (const [season, rows] of Object.entries(stock.pools)) for (const [name, pos, age] of rows) {
  if (!rank.has(name)) continue;
  const k = `${name}|${season}`;
  if (!seasons.has(k)) seasons.set(k, []);
  seasons.get(k).push({ pos, age, line: line(pos) });
}
const hits = new Map();
for (const [k, rows] of seasons) {
  if (rows.length < 2) continue;
  const lines = new Set(rows.map(r => r.line).filter(Boolean));
  if (lines.size < 2) continue;
  const [name, season] = k.split('|');
  if (!hits.has(name)) hits.set(name, `${season}: ${rows.map(r => `${r.pos} age ${r.age}`).join(' + ')}`);
}
const unlisted = [...hits].filter(([n]) => !listed.has(n));
console.log(`names with two rows in one season on different lines of the pitch: ${hits.size}; listed ${hits.size - unlisted.length}; NOT on the list ${unlisted.length}`);
const byBand = { easy: 0, medium: 0, hard: 0 };
for (const [n] of unlisted) byBand[band(rank.get(n))] += 1;
console.log(`not listed, by band: easy ${byBand.easy}, medium ${byBand.medium}, hard ${byBand.hard}`);
for (const [n, e] of unlisted.sort((a, b) => rank.get(a[0]) - rank.get(b[0])).slice(0, 30)) {
  const r = sorted[rank.get(n)];
  console.log(`  ${n} (rank ${rank.get(n)}, ${band(rank.get(n))}; 2026 row: ${r.club}, ${r.nationality}) ${e}`);
}
