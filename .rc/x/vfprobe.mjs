// Skeptic probe for BS-mix-1 (PR 408 age tiles). Runs the SHIPPED buildCriteria from
// src/lib/playerBingo.ts at the checked out head, then judges every man in
// scripts/data/cmBirthDates2026.json (two-source birth dates, live table row id/year/age
// as pulled 2026-10-07) by the shipped tile test against his real age on a given date.
// Usage: node .tmp-fx/vfprobe.mjs <repoRoot> <YYYY-MM-DD>
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const today = process.argv[3] || '2026-10-29';
const out = path.join(root, '.tmp-fx', 'vfprobe-' + Date.now());
mkdirSync(out, { recursive: true });
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'stub', namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("no network"); } }); export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' }));
  b.onResolve({ filter: /^@\// }, a => {
    const base = path.join(root, 'src', a.path.slice(2));
    for (const ext of ['', '.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx']) if (existsSync(base + ext) && (ext || /\.[a-z]+$/.test(base))) return { path: base + ext };
    return { path: base + '.ts' };
  });
} };
const entry = path.join(out, 'entry.ts');
writeFileSync(entry, `export { buildCriteria } from ${JSON.stringify(path.join(root, 'src/lib/playerBingo.ts').replaceAll('\\', '/'))};`);
const file = path.join(out, 'pb.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: file, plugins: [stub], logLevel: 'error' });
const PB = await import(pathToFileURL(file).href);

const ageOn = (born, d) => {
  const [by, bm, bd] = born.split('-').map(Number); const [y, m, dd] = d.split('-').map(Number);
  return y - by - ((m < bm || (m === bm && dd < bd)) ? 1 : 0);
};
const rows = JSON.parse(readFileSync(path.join(root, 'scripts/data/auctionMarketRows.json'), 'utf8'));
const top = [...rows].sort((a, b) => b.market_value_usd - a.market_value_usd).slice(0, 500);
const pool = top.map(r => ({ name: r.player_name, nationality: r.nationality || '', position: r.position || '', club: r.club || '', value: r.market_value_usd, age: r.age, year: 2026 }));
const data = { pool, clubHistory: new Map(pool.map(p => [p.name, new Set([p.club.toLowerCase()])])), clubYears: new Map(), seasonStats: new Map(), worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set() };
const crit = PB.buildCriteria(data);
const ids = ['age-21-under', 'age-22-to-25', 'age-26-to-28', 'age-29-plus'];
const bands = { 'age-21-under': a => a <= 21, 'age-22-to-25': a => a >= 22 && a <= 25, 'age-26-to-28': a => a >= 26 && a <= 28, 'age-29-plus': a => a >= 29 };
for (const id of ids) { const c = crit.find(x => x.id === id); console.log(`tile ${id} ${c ? `present label="${c.label}" support=${c.support.length}` : 'ABSENT from buildCriteria'}`); }

const bd = JSON.parse(readFileSync(path.join(root, 'scripts/data/cmBirthDates2026.json'), 'utf8'));
let jan = 0, aug = 0, tod = 0, n26 = 0;
for (const r of bd.rows.filter(r => r.table && r.table.year === 2026 && !r.thin)) {
  n26++; if (ageOn(r.born, '2026-01-01') === r.table.age) jan++; if (ageOn(r.born, '2026-08-01') === r.table.age) aug++; if (ageOn(r.born, today) === r.table.age) tod++;
}
console.log(`semantics: 2026 rows ${n26}, table age equals age on 2026-01-01 ${jan}, on 2026-08-01 ${aug}, on ${today} ${tod}`);
const byName = new Map(top.map(r => [r.player_name, r]));
const tally = Object.fromEntries(ids.map(id => [id, { falseYes: [], falseNo: [] }]));
let checked = 0, inPool = 0, poolAgeAgrees = 0;
for (const r of bd.rows.filter(r => r.table && !r.thin)) {
  const a = byName.get(r.name); if (a) { inPool++; if (a.age === r.table.age) poolAgeAgrees++; }
  const p = { name: r.name, nationality: a?.nationality || '', position: a?.position || '', club: a?.club || r.club, value: a?.market_value_usd || 1, age: r.table.age, year: r.table.year };
  const real = ageOn(r.born, today); checked++;
  for (const id of ids) {
    const c = crit.find(x => x.id === id); if (!c) continue;
    const shipped = c.test(p, data), truth = bands[id](real);
    const tag = `${r.name} (b ${r.born}, row ${r.table.year} age ${r.table.age}, real ${real}${a ? ', pool $' + Math.round(a.market_value_usd / 1e6) + 'M' : ', not in top 500'})`;
    if (shipped && !truth) tally[id].falseYes.push(tag); if (!shipped && truth) tally[id].falseNo.push(tag);
  }
}
console.log(`men checked ${checked}, in repo top 500 ${inPool}, repo age equals live pull age ${poolAgeAgrees}/${inPool}`);
for (const id of ids) {
  console.log(`${id}: shipped YES but false on ${today}: ${tally[id].falseYes.length}; shipped no but true: ${tally[id].falseNo.length}`);
  for (const t of tally[id].falseYes.slice(0, 14)) console.log(`  falseYES ${t}`);
  for (const t of tally[id].falseNo.slice(0, 14)) console.log(`  falseNO  ${t}`);
}
// Fix premise: birth year derived as year - age - 1 (1 January rule) versus the two-source date.
let byOk = 0, byOff = [], bandOk = 0, bandN = 0;
const birthBand = y => (y >= 2000 && y <= 2003 ? 'b2000-2003' : y >= 1997 && y <= 1999 ? 'b1997-1999' : 'other');
for (const r of bd.rows.filter(r => r.table && !r.thin)) {
  const real = Number(r.born.slice(0, 4)), derived = r.table.year - r.table.age - 1;
  if (real === derived) byOk++; else byOff.push(`${r.name} real ${real} derived ${derived} (row ${r.table.year} age ${r.table.age})`);
  if (birthBand(real) !== 'other' || birthBand(derived) !== 'other') { bandN++; if (birthBand(real) === birthBand(derived)) bandOk++; }
}
console.log(`fix premise: derived birth year equals real ${byOk}/${byOk + byOff.length}; born-year band (2000-2003, 1997-1999) right for ${bandOk}/${bandN} men touching those bands`);
for (const t of byOff.slice(0, 20)) console.log(`  off ${t}`);
console.log('vfprobe done');
