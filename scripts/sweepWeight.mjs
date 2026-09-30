/**
 * Round 210: what a phone actually has to download.
 *
 * The owner plays this on a phone, often not on wifi, and nothing was
 * measuring what that costs. It turned out every game page was fetching
 * every word of prose on the site plus a screenshot library nobody had
 * pressed, and the numbers were only visible if you went looking.
 *
 * So this measures them, per route, the way a phone experiences it: open
 * the page, collect every JavaScript file it actually requests, and add up
 * their GZIPPED size, which is what goes over the wire. Then hold each
 * route to a budget.
 *
 * The budgets are the measured numbers with about a fifth of headroom, so
 * ordinary growth does not trip them and a regression of the size Round
 * 210 removed does. They are a ratchet, not a target: if a round makes a
 * page lighter, lower the number here in the same round so the win cannot
 * be silently given back.
 *
 * Measured before Round 210 / after, gzipped JS:
 *   /                 201K / 201K   (the shell, on every page)
 *   /club-manager     661K / 530K
 *   /soccer-career    776K / 649K
 *   /stadium-tycoon   320K / 240K
 *   /minefield        369K / 236K
 *   /nfl-my-career    462K / 330K
 *   /front-office     388K / 256K
 *
 * ROUND 672: FIVE ROUTES 5K TO 15K OVER, AND WHAT GREW, NAMED BEFORE ANYTHING
 * WAS CUT. Measured 2026-09-28 the way this harness measures, a build of
 * main (3e9d0210) against a build of f66bab76 (2026-09-15, the last commit
 * that touched this file):
 *
 *   every game page  +9.1K  the seoMeta chunk: Round 642's 127 search titles
 *                           and descriptions, loaded whole to read one entry
 *                    -5.0K  the entry chunk (Round 659 moved the polls, the
 *                           search engine and the flags out and put the new
 *                           home front in)
 *   /club-manager   +10.5K  its engine chunk: clubManager.ts (+33K of source,
 *                           Round 619's free agents and contract termination
 *                           and what followed), the 2025-26 final tables
 *                           (+15K) and Round 633's season score (+5K)
 *   soccer2 guides   +5.4K  on /soccer-grid, /footle and /soccer-career
 *   football guides  +3.4K  on /nfl-my-career and /front-office
 *
 * THE CUT. The entry chunk every page downloads was carrying all six sport
 * hubs' prose (src/lib/sportHub.ts, about 47K of text: why here, start here,
 * reference, FAQs, about) because the footer and the home page imported
 * SPORT_HUBS for three fields. They read src/lib/sportHubNav.ts now (simHubs
 * holds the two lists equal) and every route measured exactly 14.6K lighter:
 * /club-manager 634.5 to 619.9, /stadium-tycoon 295.1 to 280.5,
 * /wonderkid-factory 275.1 to 260.5, /nfl-my-career 407.6 to 393.0,
 * /soccer-grid 304.6 to 290.0, / 233.3 to 218.7. Three runs, same file
 * counts and the same numbers every time.
 *
 * No budget was raised. The five routes that were red spent the win getting
 * back under; every other route had its budget lowered by 14K, so each keeps
 * exactly the headroom it had before and the win cannot be given back.
 * Release F (2026-09-29) raised /club-manager from 620 to 622: Round 670
 * added extra time to the match engine (the thirty minute stretch, the
 * deflator and the tie context), measured at 621K on the release build, and
 * that is the whole of the raise. The seoMeta split below would pay it back
 * several times over and is filed as its own round.
 * /club-manager and /minefield sit on their ceilings (0.1K and 0.2K spare),
 * as /minefield already did. The next cut on the table is seoMeta: every
 * game page downloads all 127 entries to read one, 9.1K gzipped, which a
 * split by sport (the way Round 210 split the guides) would take to about 1K.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/sweepWeight.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Route, and the ceiling in kilobytes of gzipped JavaScript. */
/* Round 672: the six routes that had room were lowered by 14K, the whole
   part of the 14.6K the hub prose cut took off every route (see the header);
   the other five were over and spent it getting back under. */
const BUDGETS = [
  ['/', 226],
  ['/club-manager', 626], /* release G: 626K measured with the match centre (714), the squad rows (715) and the double roster fix (742); was 622 */
  ['/soccer-career', 736],
  ['/stadium-tycoon', 290],
  /* Round 216: the new idle game. Measured 243K on the day it shipped,
     mostly the shared index chunk. */
  ['/wonderkid-factory', 270],
  ['/minefield', 280], /* release G: 280K measured; the shared result moment (710), the native share sheet (744) and the hub trail (654) sit in chunks every game loads; was 276 */
  ['/footle', 320], /* release G: 319K measured, same shared chunks as above; was 316 */
  ['/nfl-my-career', 400],
  ['/front-office', 300], /* release G: 299K measured, same shared chunks as above; was 296 */
  ['/soccer-grid', 300],
  ['/leaderboard', 266],
];

const gzCache = new Map();
function gzSize(file) {
  if (gzCache.has(file)) return gzCache.get(file);
  let n = 0;
  try { n = zlib.gzipSync(fs.readFileSync(file)).length; } catch { n = 0; }
  gzCache.set(file, n);
  return n;
}

const browser = await chromium.launch();

console.log('1) Every page is inside its download budget');
const measured = [];
for (const [route, budget] of BUDGETS) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => {
    const m = req.url().match(/\/assets\/([^?]+\.js)$/);
    if (m) files.add(m[1]);
  });
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    fail(`${route}: would not load (${String(e).split('\n')[0].slice(0, 80)})`);
    await ctx.close();
    continue;
  }
  let total = 0;
  for (const f of files) total += gzSize(path.join(ROOT, 'dist/assets', f));
  const kb = Math.round(total / 1024);
  measured.push({ route, kb, budget, files: files.size });
  if (kb > budget) fail(`${route}: ${kb}K of gzipped JavaScript against a budget of ${budget}K`);
  /* A budget nobody is near is a budget nobody is keeping. If a page comes
     in under half its ceiling the ceiling is stale and should come down. */
  if (kb > 0 && kb < budget * 0.5) {
    fail(`${route}: ${kb}K against a ${budget}K budget, so the budget is stale and should be lowered in this round`);
  }
  await ctx.close();
}
for (const m of measured) {
  console.log(`   ${m.route.padEnd(18)} ${String(m.kb).padStart(4)}K gz over ${String(m.files).padStart(3)} files (budget ${m.budget}K)`);
}

console.log('2) The two things Round 210 moved off the critical path stay off it');
{
  /* The screenshot library: 47K gzipped, on every game page, for one
     button most players never press. */
  const share = fs.readFileSync(path.join(ROOT, 'src/components/game/ShareButtons.tsx'), 'utf-8');
  if (/^import html2canvas/m.test(share)) fail('html2canvas is back on the critical path of every game page');
  if (!/await import\('html2canvas'\)/.test(share)) fail('html2canvas is no longer loaded on demand');

  /* The guides: 101K gzipped of prose for every game on the site, on every
     game page, when one entry was wanted. */
  const seo = fs.readFileSync(path.join(ROOT, 'src/components/seo/GameSeoContent.tsx'), 'utf-8');
  if (/from '@\/data\/gameContent'/.test(seo)) fail('the guide block imports the merged content map again');
  if (!/loadGameContent/.test(seo)) fail('the guide block no longer loads its sport file on demand');
  /* Nothing else may pull the merged map in either, or the split is undone
     from somewhere else in the tree. */
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !p.includes('gameContent')) {
        const t = fs.readFileSync(p, 'utf-8');
        if (/from '@\/data\/gameContent'/.test(t) || /from '\.\.\/data\/gameContent'/.test(t)) {
          fail(`${path.relative(ROOT, p)} imports the merged content map, which puts every sport back on every page`);
        }
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  console.log('   the screenshot library and the merged guide map are both off the critical path');
}

console.log('3) Every guide is still reachable, one sport at a time');
{
  /* The map from route to sport file is generated, so the risk is that it
     falls behind: a new game whose guide is unreachable would render the
     fallback copy and nobody would notice. This reconciles it against the
     sport files themselves. */
  const dir = path.join(ROOT, 'src/data/gameContent');
  const loader = fs.readFileSync(path.join(dir, 'loader.ts'), 'utf-8');
  const mapped = new Map();
  for (const m of loader.matchAll(/^\s*'([^']+)': '([a-zA-Z0-9]+)',$/gm)) mapped.set(m[1], m[2]);
  const BUNDLES = ['soccer1', 'soccer2', 'football', 'college', 'basketball', 'baseball', 'hockey', 'moreSports', 'world', 'clubManagement', 'stadiumManagement', 'academyManagement'];
  let keys = 0;
  for (const b of BUNDLES) {
    const src = fs.readFileSync(path.join(dir, `${b}.ts`), 'utf-8');
    /* Top level keys of the record: a route path in quotes at the start of
       a line with two spaces of indent. */
    for (const m of src.matchAll(/^ {2}'(\/[a-z0-9-]+)':/gm)) {
      keys += 1;
      const got = mapped.get(m[1]);
      if (!got) fail(`${m[1]} has a guide in ${b}.ts and no entry in loader.ts, so the page shows fallback copy`);
      else if (got !== b) fail(`${m[1]} lives in ${b}.ts but loader.ts sends it to ${got}`);
    }
  }
  if (keys < 90) fail(`only ${keys} guides found across the sport files, the reconciliation is not reading them`);
  for (const [p, b] of mapped) {
    if (!BUNDLES.includes(b)) fail(`loader.ts points ${p} at an unknown bundle ${b}`);
  }
  console.log(`   ${keys} guides across ${BUNDLES.length} sport files, every one of them routed`);
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`sweepWeight: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('sweepWeight: green. Every page is inside its budget, and the budgets came down this round.');
