/**
 * Round 274 browser harness: prove, in a real page, that Soccer Career's
 * manager job market is genuinely deferred AND genuinely still works.
 *
 * simFlagshipWeight (Round 273) proves this from the files: no static import,
 * no foreign module in the graph, the chunk listed as a lazy dependency, the
 * built weight under a ceiling. All of that can be true while the feature is
 * quietly broken, because "the chunk is not downloaded" is exactly what a
 * broken dynamic import looks like from the outside. So this drives the thing.
 *
 * Two arms, and the pair is the point:
 *   1. A fresh visit must NOT fetch the Club Manager chunk. That is the round
 *      273 win, measured at 600 KB and three seconds on a slow phone.
 *   2. A save that is already in the dugout MUST fetch it, and the dugout
 *      screen must draw. That is the half a file check cannot give you.
 *
 * The save is not hand written. An early attempt used a made up manager save
 * and the page threw on it, and the same save threw on the pre round 273 build
 * too, so it was a property of a save shape the game cannot actually produce
 * rather than a regression. This plays a real career through the real engine
 * to retirement and into the dugout, so the save is one the game itself would
 * have written.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      node scripts/playFlagshipLazy.mjs
 * (runAllSims files it as a browser harness automatically, because it imports
 * playwright, and runs it only with --browser.)
 */
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.log('NO dist BUILD. RUN npm run build FIRST. NOT CHECKED.');
  process.exit(1);
}

/* ── a real career, played by the real engine, ending in the dugout ────── */
console.log('1) play a career to the dugout in the engine, so the save is one the game could have written');
const ENTRY = '/tmp/flagshipLazyEntry.mjs';
const BUNDLE = '/tmp/flagshipLazy.bundle.mjs';
writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const e = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { e } = await import(pathToFileURL(BUNDLE).href);

/* If the engine has lost the loader entirely, that IS the defect: say so and
   carry on, so the browser arms still run and report what they see. */
if (typeof e.loadManagerMarket === 'function') await e.loadManagerMarket();
else fail('the engine exports no loadManagerMarket, so the job market is not deferred at all');
const clubs = e.FALLBACK_CLUBS;
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
let s = e.initCareer('Probe', 'England', 'ST', '2020s', stats(62), 62, 2020, clubs, null);
let guard = 0;
while (!s.retired && guard++ < 400) {
  switch (s.phase) {
    case 'youth': s = e.advanceYouthYear(s, clubs); break;
    case 'contract_offer': { const o = s.pendingOffers || []; if (!o.length) { s.phase = 'playing'; break; } s = e.acceptOffer(s, o[0]); break; }
    case 'playing': s = e.advanceProSeason(s, clubs); break;
    case 'season_summary': s = e.dismissSummary(s); break;
    case 'newspaper': s = e.dismissNewspaper(s); break;
    case 'international_debut': s = e.dismissDebut(s); break;
    case 'world_cup': s = e.dismissWorldCup(s); break;
    case 'rivalry_event': s = e.dismissRivalryEvent(s); break;
    case 'ballon_dor': s = e.dismissBallonDor(s); break;
    case 'random_events': s = e.applyEventChoice(s, 0, clubs); break;
    case 'moral_dilemma': s = e.dismissMoralDilemma(s); break;
    case 'social_media_action': s = e.dismissSocialMediaPhase(s); break;
    case 'red_card_appeal_result': s = e.dismissAppealResult(s); break;
    case 'retirement_suggestion': s = e.acceptRetirementSuggestion(s, clubs); break;
    case 'transfer_window': s = e.stayAtClub(s); break;
    case 'retirement_ceremony': s = { ...s, phase: 'post_retirement' }; break;
    case 'post_retirement': s.retired = true; break;
    default: s = { ...s, phase: 'playing' };
  }
}
if (s.seasons.length < 5) fail(`the career only reached ${s.seasons.length} seasons, so it never really played`);
s = e.choosePostRetirement({ ...s, phase: 'post_retirement', retired: true }, 'manager', clubs);
if (s.phase !== 'manager_season') fail(`choosePostRetirement left the career in ${s.phase} rather than the dugout`);
s.managerState.unemployed = true;
s.managerState.seasonsOut = 0;
const SAVE = JSON.stringify(s);
console.log(`   ${s.seasons.length} seasons, retired at ${s.age}, now unemployed at ${s.managerState.club}, save ${(SAVE.length / 1024).toFixed(0)} KB`);

/* ── the two arms ──────────────────────────────────────────────────────── */
const browser = await pw.chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

/* WHICH CHUNK holds Club Manager is found by CONTENT, never by file name.
   Named it by prefix at first, and that check would have passed for the wrong
   reason against the pre round 273 build: back then the code lived in a chunk
   called managerJobMarket-*.js, so a /^clubManager-/ test would have reported
   the very build with the defect in it as clean.

   The marker then has to be picked carefully too. The first one tried was the
   Club Manager save key, and it reported the SHARED bundle as holding Club
   Manager, because the ticker reads that key out of localStorage to show your
   saves. A key string is not the code. This is a mentality description, which
   exists in exactly one source file, is a runtime string minification cannot
   drop, and is not the kind of thing another screen quotes. */
const ASSETS = path.join(ROOT, 'dist/assets');
const CM_MARKER = 'Sit deep, frustrate them, protect the point';
const cmChunks = readdirSync(ASSETS)
  .filter(f => f.endsWith('.js'))
  .filter(f => readFileSync(path.join(ASSETS, f), 'utf8').includes(CM_MARKER));
if (!cmChunks.length) fail(`no built chunk contains ${CM_MARKER}, so this harness cannot tell whether Club Manager was fetched`);
console.log(`   Club Manager's code lives in: ${cmChunks.join(', ') || 'nowhere found'}`);

async function visit(label, seed) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const chunks = [];
  const errors = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) chunks.push(u.split('/').pop()); });
  page.on('pageerror', err => errors.push(String(err).slice(0, 120)));
  /* the live database is not this harness's business, and letting it hang
     keeps the check about loading rather than about data */
  await page.route('**://*.supabase.co/**', () => {});
  if (seed) await page.addInitScript(v => { try { localStorage.setItem('soccerCareerSave', v); } catch { /* private mode */ } }, SAVE);
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 80, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const text = (await page.evaluate(() => document.getElementById('root')?.innerText ?? '')).replace(/\s+/g, ' ');
  const cm = chunks.filter(c => cmChunks.includes(c));
  await ctx.close();
  console.log(`   ${label.padEnd(26)} ${String(chunks.length).padStart(2)} js chunks, Club Manager chunk: ${cm.length ? 'fetched' : 'not fetched'}, ${errors.length} page errors`);
  for (const err of errors.slice(0, 2)) console.log(`      page error: ${err}`);
  return { cm: cm.length, text, errors };
}

console.log('2) a fresh visit does not pay for the dugout');
const fresh = await visit('no save', false);
if (fresh.cm > 0) fail('a fresh visit fetched the Club Manager chunk, so the job market is eagerly loaded again');
if (!/Create Your Player/i.test(fresh.text)) fail('a fresh visit did not reach the create screen at all');
if (fresh.errors.length) fail(`a fresh visit threw ${fresh.errors.length} page error(s)`);

console.log('3) a career already in the dugout pulls it in, and the screen draws');
const dugout = await visit('dugout save', true);
if (dugout.cm === 0) fail('the dugout save never fetched the Club Manager chunk, so the job market is not deferred, it is gone');
if (dugout.errors.length) fail(`the dugout screen threw ${dugout.errors.length} page error(s), first: ${dugout.errors[0]}`);
if (dugout.text.length < 200) fail(`the dugout screen rendered only ${dugout.text.length} characters, so it did not draw`);
if (!/CAREER TIMELINE/i.test(dugout.text)) fail('the dugout screen has no career timeline on it, so the save did not load');

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playFlagshipLazy: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playFlagshipLazy: green. The dugout costs nothing until you walk into it, and it still works when you do.');
