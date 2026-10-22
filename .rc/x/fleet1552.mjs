// Reviewer fleet for Round 1552: dates before ONE_ANSWER_FROM must deal byte for byte what the
// base generator (c75d04dad) dealt, over many dates and several pool shapes, not three dates on one.
// Run from the repo root on the runner: node .rc/x/fleet1552.mjs
// FLEET_CONTROL=1 compares the base against the head with every date forced onto the new rules
// (the comparator must then see mismatches before the cutover, or it is blind).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.FLEET_BASE || 'c75d04dad';
const CONTROL = process.env.FLEET_CONTROL === '1';
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const alpha = JSON.parse(read('scripts/data/alphabetSprintPool.json')).rows;
const auction = new Map(JSON.parse(read('scripts/data/auctionMarketRows.json')).map(r => [r.player_name, r.position]));
const stock = JSON.parse(read('scripts/data/stockMarketPools.json'));
const stockPos = new Map();
for (const season of Object.keys(stock.pools).sort()) for (const r of stock.pools[season]) if (r[1]) stockPos.set(r[0], r[1]);
const realPositions = [...auction.values(), ...stockPos.values()].filter(Boolean);
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const cmp = (a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0);
const marketDrawn = alpha.filter(r => r.player_name && r.market_value_usd).map(r => {
  const known = auction.get(r.player_name) ?? stockPos.get(r.player_name) ?? null;
  return { player_name: r.player_name, position: known ?? realPositions[hash(r.player_name) % realPositions.length], nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) };
}).sort(cmp);
const ballonDor = JSON.parse(read('scripts/data/ballonDorVerified2026-09.json')).rows
  .map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }))
  .sort((a, b) => b.year - a.year || a.rank - b.rank || (a.player_name < b.player_name ? -1 : 1));
const clubs = [...new Set(marketDrawn.map(r => r.club).filter(Boolean))].slice(0, 20);
const shirtNumbers = Array.from({ length: 40 }, (_, i) => ({ player_name: `Shirt Fixture ${i + 1}`, club: clubs[i % clubs.length], league: 'Fixture League', nationality: 'Fixtureland', kit_number: i + 1 }));

// pool shapes: the fixture; real positions only (null elsewhere); every third row gone; duplicate
// names planted (a second row of a name with another club, as a namesake would look); no ballon or shirts
const realOnly = marketDrawn.map(r => ({ ...r, position: auction.get(r.player_name) ?? stockPos.get(r.player_name) ?? null }));
const thinned = marketDrawn.filter((_, i) => i % 3 !== 2);
const dup = [];
marketDrawn.forEach((r, i) => { dup.push(r); if (i % 37 === 5) dup.push({ ...r, club: marketDrawn[(i * 7) % marketDrawn.length].club, nationality: marketDrawn[(i * 11) % marketDrawn.length].nationality }); });
const POOLS = {
  fixture: { market: marketDrawn, ballonDor, shirtNumbers },
  realPositions: { market: realOnly, ballonDor, shirtNumbers },
  thinned: { market: thinned, ballonDor, shirtNumbers },
  duplicates: { market: dup, ballonDor, shirtNumbers },
  marketOnly: { market: marketDrawn, ballonDor: [], shirtNumbers: [] },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet1552-'));
const STUB = path.join(tmp, 'client.ts');
fs.writeFileSync(STUB, "export const SUPABASE_URL = 'x'; export const SUPABASE_PUBLISHABLE_KEY = 'x';\nexport const supabase: any = { from() { throw new Error('no database'); } };\n");
async function bundle(label, source) {
  const file = path.join(tmp, `${label}.ts`);
  fs.writeFileSync(file, source);
  const out = path.join(tmp, `${label}.mjs`);
  await build({ entryPoints: [file], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: ROOT,
    alias: { '@/integrations/supabase/client': STUB, '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(out).href);
}
const baseSrc = execSync(`git show ${BASE}:src/lib/triviaQuestionBank.ts`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
let headSrc = read('src/lib/triviaQuestionBank.ts').replace(/\r\n/g, '\n');
if (CONTROL) {
  const from = 'return dateStr < ONE_ANSWER_FROM ? LEGACY : ONE_ANSWER;';
  if (!headSrc.includes(from)) { console.log('FLEET CONTROL TARGET MISSING'); process.exit(3); }
  headSrc = headSrc.replace(from, 'return ONE_ANSWER;');
  console.log('FLEET CONTROL ON: every date on the new rules');
}
const B = await bundle('base', baseSrc);
const H = await bundle('head', headSrc);
const cutover = H.ONE_ANSWER_FROM;
const addDays = (d, k) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
let failures = 0;
const t0 = Date.now();
for (const [name, pool] of Object.entries(POOLS)) {
  const step = name === 'fixture' ? 1 : 3;
  let same = 0, diff = 0, firstDiff = null, after = 0, afterDiff = 0;
  for (let d = process.env.FLEET_FROM || '2024-01-01'; d < cutover; d = addDays(d, step)) {
    const a = JSON.stringify(B.generateDailyLadder(pool, d, 15));
    const b = JSON.stringify(H.generateDailyLadder(pool, d, 15));
    if (a === b) same += 1; else { diff += 1; firstDiff ??= d; }
  }
  for (let k = 0; k < Number(process.env.FLEET_AFTER || 60); k++) {
    const d = addDays(cutover, k);
    after += 1;
    if (JSON.stringify(B.generateDailyLadder(pool, d, 15)) !== JSON.stringify(H.generateDailyLadder(pool, d, 15))) afterDiff += 1;
  }
  console.log(`  ${name}: market ${pool.market.length} rows; before ${cutover}: ${same} identical, ${diff} differ${firstDiff ? ` (first ${firstDiff})` : ''}; from the cutover: ${afterDiff} of ${after} differ [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  if (diff > 0) failures += 1;
  if (afterDiff === 0) { failures += 1; console.log(`  ${name}: the comparator saw no difference after the cutover either: blind`); }
}
console.log(`fleet1552: ${failures === 0 ? 'legacy byte identical on every pool' : `${failures} failure(s)`}${CONTROL ? ' (CONTROL ON)' : ''}`);
process.exit(failures === 0 ? 0 : 1);
