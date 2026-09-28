/* Round 667: a defender's clean sheets are not stuck at zero.

   A player reported on 2026-09-23: "Even when playing as a defender, clean
   sheets get stuck at zero for the entire career." They were right. Soccer
   Career draws a season's line once in generateSeasonStats, and its
   cleanSheets was gated on the goalkeeper alone, so every CB, LB and RB read 0
   for a whole career while the stats card showed them the tile. The youth
   season had the same gate.

   This runs the real engine, bundled the way simCareerEngaged does it, over
   seeded careers in every outfield position and the keeper, and measures:

   1. the back line (CB, LB, RB) records clean sheets: the total across all
      careers is well above zero, and the per appearance rate sits in the band
      the draw defines (20 to 45 percent of apps before the build multiplier),
      measured over hundreds of seasons rather than asserted on any one career,
      because a 20 percent draw on a 6 game season rounds to nothing and the
      reviewer of this round said so;
   2. the keeper's rate and the back line's rate are the same draw, so they
      land within a band of each other;
   3. midfielders and forwards (CDM, CM, CAM, LW, RW, ST) record exactly zero,
      every career, every season, so the widening did not leak forward;
   4. the youth season follows the same rule: a back line youth year is above
      zero on average, a forward's is zero.

   Negative control: SIM_CLEAN_SHEETS_CONTROL=gkonly bundles a copy of the
   engine with the pro gate put back to the keeper alone (the anchor must be
   present exactly once or it refuses to run), and sections 1 and 2 must fail
   while 3 and 4 stay green. Exit 1 when the control did its job, 2 when it
   proved nothing.

   Run: node scripts/simCareerCleanSheets.mjs [careersPerPosition] */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CLEAN_SHEETS_CONTROL || '';
if (CONTROL && CONTROL !== 'gkonly') { console.error('unknown control ' + CONTROL + ' (known: gkonly)'); process.exit(1); }
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const OUT = path.join(TMP, `sc-cleansheets-${process.pid}.mjs`);
const ENTRY = path.join(TMP, `sc-cleansheets-entry-${process.pid}.mjs`);

let enginePath = `${ROOT}/src/lib/soccerCareerEngine.ts`;
if (CONTROL === 'gkonly') {
  const src = fs.readFileSync(enginePath, 'utf8');
  const anchor = 'const keepsSheets = isGK || position === "CB" || position === "LB" || position === "RB";';
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`control: the gate line appears ${n} times, refusing to run a dead control`); process.exit(2); }
  enginePath = path.join(TMP, `soccerCareerEngine.gkonly-${process.pid}.ts`);
  fs.writeFileSync(enginePath, src.replace(anchor, 'const keepsSheets = isGK;'));
}

/* Same two stage entry with a localStorage stub as simCareerEngaged (Round 124):
   the engine's import chain reaches the Supabase client, which reads
   localStorage as it loads. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
export const engine = mod;
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': './src' }, absWorkingDir: ROOT });
const { engine } = await import(pathToFileURL(OUT).href);
const { initCareer, advanceYouthYear, acceptOffer, advanceProSeason, dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup, FALLBACK_CLUBS } = engine;
for (const [k, v] of Object.entries({ initCareer, advanceYouthYear, acceptOffer, advanceProSeason, dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup, FALLBACK_CLUBS })) {
  if (!v) { console.error('engine export missing: ' + k + ', so nothing below measures anything'); process.exit(1); }
}
try { fs.rmSync(OUT); fs.rmSync(ENTRY); if (CONTROL) fs.rmSync(enginePath); } catch { /* temp only */ }

const CAREERS = Number(process.argv[2] || 24);
const SEASONS = 8;
const clubs = FALLBACK_CLUBS;
let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };

/* Deterministic: a small seeded generator stands in for Math.random for the
   length of each career, so a red here reproduces. */
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });

function runCareer(position, seed) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + position.length);
  try {
    let s = initCareer(`Sim ${seed}`, 'England', position, '2020s', stats(64), 64, 2020, clubs, null, 80);
    let guard = 0, pro = 0;
    const youth = [], proSeasons = [];
    while (!s.retired && guard++ < 200 && pro < SEASONS) {
      switch (s.phase) {
        case 'youth': s = advanceYouthYear(s, clubs); break;
        case 'contract_offer': { const offers = s.pendingOffers || []; if (!offers.length) { s = { ...s, phase: 'playing' }; break; } s = acceptOffer(s, offers[0]); break; }
        case 'playing': s = advanceProSeason(s, clubs); pro++; break;
        case 'newspaper': s = dismissNewspaper(s); break;
        case 'season_summary': s = dismissSummary(s, clubs); break;
        case 'international_debut': s = dismissDebut(s, clubs); break;
        case 'world_cup': s = dismissWorldCup(s, clubs); break;
        default: {
          /* Any other pause (rehab, rivalry, dilemma, social) is a phase this
             walk does not drive. Take the first generic dismisser the engine
             offers, else stop this career: the seasons already drawn count. */
          const dis = engine[`dismiss${s.phase.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}`];
          if (typeof dis === 'function') { try { s = dis(s, clubs); break; } catch { /* fall through */ } }
          guard = 999;
        }
      }
    }
    for (const rec of s.seasons || []) (rec.type === 'youth' ? youth : proSeasons).push(rec);
    return { youth, pro: proSeasons };
  } finally {
    Math.random = realRandom;
  }
}

const BACK = ['CB', 'LB', 'RB'];
const FORWARD = ['CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const results = {};
for (const pos of ['GK', ...BACK, ...FORWARD]) {
  const all = { youth: [], pro: [] };
  for (let i = 0; i < CAREERS; i++) { const r = runCareer(pos, i + 1); all.youth.push(...r.youth); all.pro.push(...r.pro); }
  const apps = all.pro.reduce((a, r) => a + (r.apps || 0), 0);
  const cs = all.pro.reduce((a, r) => a + (r.cleanSheets || 0), 0);
  results[pos] = { seasons: all.pro.length, apps, cs, rate: apps ? cs / apps : 0, youthCs: all.youth.reduce((a, r) => a + (r.cleanSheets || 0), 0), youthSeasons: all.youth.length };
}

section = 1;
console.log('1) the back line records clean sheets, measured over every season it played');
for (const pos of BACK) {
  const r = results[pos];
  if (r.seasons < CAREERS * 3) fail(`${pos}: only ${r.seasons} pro seasons drawn over ${CAREERS} careers, the walk is not reaching the season loop`);
  if (r.cs === 0) fail(`${pos}: 0 clean sheets over ${r.seasons} seasons and ${r.apps} appearances, the gate is still the keeper's`);
  /* The draw is 20 to 45 percent of apps times the build multiplier, then
     rounded. Over hundreds of seasons the mean must land inside a band a
     little wider than the draw, never outside it. */
  else if (r.rate < 0.12 || r.rate > 0.55) fail(`${pos}: clean sheet rate ${(r.rate * 100).toFixed(1)}% of appearances is outside the 12 to 55 percent band the draw defines`);
  console.log(`   ${pos}: ${r.cs} clean sheets in ${r.apps} apps over ${r.seasons} seasons, ${(r.rate * 100).toFixed(1)}% of apps`);
}

section = 2;
console.log('2) the keeper and the back line draw the same share');
{
  const gk = results.GK;
  console.log(`   GK: ${gk.cs} in ${gk.apps} apps over ${gk.seasons} seasons, ${(gk.rate * 100).toFixed(1)}%`);
  if (gk.cs === 0) fail('GK: 0 clean sheets, the keeper lost them too');
  for (const pos of BACK) {
    const ratio = gk.rate ? results[pos].rate / gk.rate : 0;
    if (ratio < 0.5 || ratio > 2) fail(`${pos} rate is ${ratio.toFixed(2)}x the keeper's; the same draw should land within 0.5x to 2x`);
  }
}

section = 3;
console.log('3) midfielders and forwards record none, every season');
for (const pos of FORWARD) {
  const r = results[pos];
  if (r.cs !== 0 || r.youthCs !== 0) fail(`${pos}: ${r.cs} pro and ${r.youthCs} youth clean sheets, the widening leaked forward`);
  else console.log(`   ${pos}: 0 over ${r.seasons} pro and ${r.youthSeasons} youth seasons`);
}

section = 4;
console.log('4) the youth season follows the same rule');
{
  for (const pos of BACK) { const r = results[pos]; if (r.youthSeasons && r.youthCs === 0) fail(`${pos}: 0 youth clean sheets over ${r.youthSeasons} youth seasons`); }
  console.log(`   back line youth clean sheets: ${BACK.map(p => `${p} ${results[p].youthCs}/${results[p].youthSeasons}`).join(', ')}`);
}

console.log('');
if (CONTROL) {
  const want = [1, 2];
  const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log('simCareerCleanSheets: control gkonly turned sections 1 and 2 red and nothing else. The check works.'); process.exit(1); }
  console.log(`simCareerCleanSheets: control gkonly should have reddened exactly sections 1, 2, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(2);
}
if (failures) { console.error(`simCareerCleanSheets: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log(`simCareerCleanSheets: green. ${CAREERS} careers a position, ${SEASONS} seasons each. Defenders keep clean sheets at the keeper's rate, forwards keep none.`);
