/* Round 1584: builds scripts/data/clubNamesakes1584/detectFixture.json, the compact fixture the namesake detection
   (scripts/lib/clubNamesakeDetect.mjs, and its SQL twin scripts/qa/clubNamesakes1584Detect.sql) is proved on.

   Run once on the PC, seconds, no network, from the lead's offline pulls of player_market_values:
     node scripts/qa/genNamesakeDetectFixture.mjs <pull.json> [<pull.json> ...]
   The pulls used for the committed file: C:/Users/antho/dukb-handoff/data/market-base-2005-2010-2015.json,
   market-base-2006-2011-2016.json and market-base-2020-2021.json. market-2025-2026.json stays OUT: its ids are
   ranks (1, 2, 3 by value), not table ids, and it has no nationality column (critic 6).

   What goes in (critic 6, so S1's rank and margin and S2's blocs are the pulls' own, not the fixture's):
     - for every year the pulls cover, every row of that year's THREE largest club years (S1 sees the real rank 1 and 2);
     - every row of every club year the detection flags on the whole pulls (S2 and S1);
     - every row of 40 clean club years of 12 or more rows with a nationality, drawn with a fixed seed (1584).
   Every row keeps its real table id. Only the columns the detection reads, plus the id.
   The generator refuses (exit 1) unless the detection on the fixture equals the detection on the whole pulls, row
   for row, so the fixture provably loses nothing the detection needs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectNamesakes } from '../lib/clubNamesakeDetect.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584', 'detectFixture.json');
const SEED = 1584;
const CLEAN = 40;

const files = process.argv.slice(2);
if (!files.length) { console.error('name the pull files: see the header. Nothing written.'); process.exit(2); }

const rows = [];
const sources = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const list = Array.isArray(j) ? j : j.rows;
  if (!Array.isArray(list) || !list.length) { console.error(`${f}: no rows. Nothing written.`); process.exit(1); }
  if (!list.every(r => Number.isInteger(r.id) && 'nationality' in r)) {
    console.error(`${f}: a row without a table id or a nationality column (a ranked pull?). Nothing written.`);
    process.exit(1);
  }
  const years = [...new Set(list.map(r => r.year))].sort();
  sources.push({ file: path.basename(f), pulledAt: j.pulledAt ?? null, table: j.table ?? null, rows: list.length, years });
  for (const r of list) rows.push(r);
}
const ids = new Set(rows.map(r => r.id));
if (ids.size !== rows.length) { console.error(`ids repeat across the pulls (${rows.length} rows, ${ids.size} ids). Nothing written.`); process.exit(1); }

const keyOf = r => `${r.year}\u0001${r.club}`;
const usable = r => r.club != null && r.market_value_usd != null && r.year != null
  && !/^(retired|without club|unknown|career break)/.test(String(r.club).toLowerCase()) && !String(r.club).includes(' / ');

const full = detectNamesakes(rows);
const keep = new Set(full.map(d => `${d.year}\u0001${d.club}`));

/* the three largest club years of every year, sized from every usable row (the S1 base) */
const sizes = new Map();
for (const r of rows) if (usable(r)) sizes.set(keyOf(r), (sizes.get(keyOf(r)) ?? 0) + 1);
const byYear = new Map();
for (const [k, n] of sizes) {
  const y = k.split('\u0001')[0];
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push([k, n]);
}
for (const list of byYear.values()) {
  list.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  for (const [k] of list.slice(0, 3)) keep.add(k);
}

/* 40 clean club years of 12 or more rows with a nationality, drawn with a fixed seed */
const withNat = new Map();
for (const r of rows) if (usable(r) && r.nationality != null) withNat.set(keyOf(r), (withNat.get(keyOf(r)) ?? 0) + 1);
const flagged = new Set(full.map(d => `${d.year}\u0001${d.club}`));
const clean = [...withNat].filter(([k, n]) => n >= 12 && !flagged.has(k) && !keep.has(k)).map(([k]) => k).sort();
let s = SEED >>> 0;
const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (let i = clean.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [clean[i], clean[j]] = [clean[j], clean[i]]; }
const drawn = clean.slice(0, CLEAN);
if (drawn.length < CLEAN) { console.error(`only ${drawn.length} clean club years to draw from. Nothing written.`); process.exit(1); }
for (const k of drawn) keep.add(k);

const fx = rows.filter(r => keep.has(keyOf(r)))
  .map(r => ({ id: r.id, year: r.year, club: r.club, nationality: r.nationality, player_name: r.player_name, market_value_usd: r.market_value_usd }))
  .sort((a, b) => a.year - b.year || (a.club < b.club ? -1 : a.club > b.club ? 1 : 0) || a.id - b.id);

const onFixture = detectNamesakes(fx);
/* an S2 row's size_rank is its club year's rank among ALL club years of its year, which a fixture of a few club
   years a year cannot keep; every other column, and every S1 row whole, must be the pulls' own */
const noRank = list => JSON.stringify(list.map(d => (d.signal === 'S2' ? { ...d, size_rank: null } : d)));
const same = noRank(onFixture) === noRank(full);
if (!same) {
  console.error(`the detection on the fixture (${onFixture.length} rows) differs from the detection on the whole pulls (${full.length}). Nothing written.`);
  process.exit(1);
}

const lines = [];
lines.push('{');
lines.push(`  "round": 1584,`);
lines.push(`  "what": ${JSON.stringify('The namesake detection fixture: every row of the club years the detection flags on the lead\'s offline pulls, every row of each pulled year\'s three largest club years, and 40 clean club years drawn with seed 1584. Real table ids. Made by scripts/qa/genNamesakeDetectFixture.mjs; the detection on it equals the detection on the whole pulls (the generator refuses otherwise).')},`);
lines.push(`  "sources": ${JSON.stringify(sources)},`);
lines.push(`  "seed": ${SEED},`);
lines.push(`  "cleanDrawn": ${JSON.stringify(drawn.map(k => k.replace('\u0001', ' ')))},`);
lines.push(`  "expected": [`);
lines.push(onFixture.map(d => '    ' + JSON.stringify(d)).join(',\n'));
lines.push('  ],');
lines.push(`  "rows": [`);
lines.push(fx.map(r => '    ' + JSON.stringify(r)).join(',\n'));
lines.push('  ]');
lines.push('}');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n');
const s2 = onFixture.filter(d => d.signal === 'S2');
const s1 = onFixture.filter(d => d.signal === 'S1');
console.log(`pulls: ${rows.length} rows over ${byYear.size} years; club years of 12 or more with a nationality: ${[...withNat.values()].filter(n => n >= 12).length}`);
console.log(`detection: ${s2.length} S2 rows, ${s1.length} S1 rows; Arsenal FC S2 years ${s2.filter(d => d.club === 'Arsenal FC').map(d => d.year + ' ' + d.nat + ' ' + d.k).join(', ')}; S1 ${s1.map(d => d.club + ' ' + d.year + ' n=' + d.n).join(', ')}`);
console.log(`fixture: ${fx.length} rows, ${new Set(fx.map(keyOf)).size} club years (${drawn.length} clean drawn); written ${path.relative(ROOT, OUT)}`);
