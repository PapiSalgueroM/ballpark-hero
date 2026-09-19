/**
 * Round 260 harness (number 111): the home page's static claims are true.
 *
 * WHY THIS EXISTS, and it is not a hypothetical. Round 257 gave the home page
 * a block of static content in index.html so a crawler could read it without
 * running JavaScript, which is the whole reason the site was turned down for
 * AdSense. Two of the numbers in that block were wrong the day it shipped: it
 * said more than 120 games and nearly forty soccer games, and the registry the
 * site actually renders from holds 113 and 30. Both were read off a grep of
 * the registry FILE rather than off the registry itself, which counted paths
 * that are defined but not in any visible category.
 *
 * That is the single worst kind of mistake this project can make, because the
 * site's whole promise is that the numbers on it are real, and because a claim
 * baked into a template is invisible to every other check: it is not React, it
 * is not in src/data, and nothing renders it in a test. So it gets its own
 * checker.
 *
 *   1. EVERY NUMBER IN THE BLOCK IS TRUE. The counts are read out of the
 *      prose and compared against the registry the site renders from, not
 *      against a grep of a file.
 *   2. A FLOOR IS A FLOOR, AND A FLOOR STAYS USEFUL. "120+" must be under
 *      the real count, and it must be within a sane distance of it,
 *      because a floor forty games behind reality is not much better than one
 *      ahead of it. Both directions fail.
 *   3. EVERY LINK GOES SOMEWHERE. Each href in the block must be a real route
 *      in App.tsx. A crawler following a dead link on the home page is worse
 *      than no link.
 *   4. THE BLOCK IS STILL THERE AND STILL SUBSTANTIAL. The measured "before"
 *      was 43 characters of readable text, which is what made the most
 *      important page on the site the emptiest. If someone empties it again
 *      this fails rather than silently regressing the thing that fixed the
 *      AdSense case.
 *   5. IT NAMES NOTHING IT SHOULD NOT. No dates, no results, no figure that
 *      belongs to one day.
 *
 * Since Round 651 the head's meta description is held equal to the one the
 * app renders (part 4b), with the control HOME_COPY_CONTROL=descdrift.
 *
 * Run: node scripts/simHomeCopy.mjs
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(os.tmpdir(), 'homecopy-bundle.mjs');
const ENTRY = path.join(os.tmpdir(), 'homecopy-entry.mjs');

writeFileSync(ENTRY, `export * from '${ROOT.replaceAll('\\', '/')}/src/data/gameRegistry.ts';`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const registry = await import(pathToFileURL(OUT).href);
const { CATEGORIES, ALL_GAMES } = registry;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const rootStart = html.indexOf('<div id="root">');
const rootEnd = html.lastIndexOf('</div>');
if (rootStart < 0 || rootEnd < rootStart) {
  console.error('could not find the static block in index.html');
  process.exit(1);
}
const block = html.slice(rootStart, rootEnd);
const text = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* ── 4: it is still there and still worth reading ─────────────────────── */
console.log('1) the static block');
console.log(`   ${text.length} characters of readable text, ${(block.match(/<h[12]>/g) ?? []).length} headings`);
/* measured at 1,750 characters when it was written, and the un-blocked page
   measured 43. The floor is set at half of what was written, which is still
   twenty times the empty page. */
if (text.length < 875) fail(`only ${text.length} characters of static text, which is on its way back to an empty page`);
if (!/<h1>/.test(block)) fail('the block has no h1');
if ((block.match(/<h2>/g) ?? []).length < 3) fail('the block has fewer than three sections');

/* ── 1 and 2: the numbers ─────────────────────────────────────────────── */
console.log('2) every count in the prose, against the registry the site renders');
const totalGames = ALL_GAMES.length;
const soccer = CATEGORIES.find(c => /soccer/i.test(c.title));
const soccerGames = soccer ? soccer.games.length : 0;
console.log(`   registry says ${totalGames} games, ${soccerGames} of them soccer, across ${CATEGORIES.length} categories`);

const WORDS = {
  ten: 10, fifteen: 15, twenty: 20, 'twenty five': 25, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
/** Read "120+", "more than 110" or "more than twenty five" into a number. */
function floorsIn(s) {
  const out = [];
  /* case insensitive on purpose: the sentence that opens the block starts
     with a capital M, and the first draft of this check silently found only
     the soccer claim because of it. */
  for (const m of s.matchAll(/more than ([a-z ]+?|\d+)(?= )/gi)) {
    const raw = m[1].trim().toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : WORDS[raw] ?? null;
    if (n !== null) out.push({ n, phrase: m[0], inclusive: false });
  }
  for (const m of s.matchAll(/\b(\d+)\+(?= )/g)) {
    out.push({ n: Number(m[1]), phrase: m[0], inclusive: true });
  }
  return out;
}
/* the total games claim and the soccer claim, found by the sentence they
   live in rather than by position, so reordering the block cannot break it */
const sentences = text.split(/(?<=\.)\s+/);
let checkedTotal = false, checkedSoccer = false;
for (const sentence of sentences) {
  const floors = floorsIn(sentence);
  if (!floors.length) continue;
  const isSoccer = /soccer/i.test(sentence);
  const actual = isSoccer ? soccerGames : totalGames;
  const label = isSoccer ? 'soccer games' : 'games in total';
  for (const f of floors) {
    if (f.inclusive ? f.n > actual : f.n >= actual) {
      fail(`the page claims "${f.phrase}" ${label} and there are ${actual}`);
    } else if (actual - f.n > Math.max(15, actual * 0.2)) {
      fail(`"${f.phrase}" ${label} is ${actual - f.n} behind the real ${actual}, so the floor has stopped being useful`);
    }
    if (isSoccer) checkedSoccer = true; else checkedTotal = true;
  }
}
if (!checkedTotal) fail('no rounded floor claim about the total game count was found to check');
if (!checkedSoccer) fail('no "more than N" claim about soccer was found to check');
if (!/\b\d+\+ free sports games\b/i.test(text)) {
  fail('the total game count is not written as a rounded N+ claim');
}

/* every bare number in the block gets eyeballed too, so a future edit cannot
   sneak an exact count past the floor rule */
const bare = [...text.matchAll(/\b(\d{2,4})\b/g)].map(m => Number(m[1]));
for (const n of bare) {
  if (n === totalGames || n === soccerGames) {
    fail(`the block states an exact count (${n}), which goes stale the next time a game ships`);
  }
}
console.log(`   ${bare.length} numbers in the prose, all of them floors and all of them under the real figure`);

/* ── 3: every link is real ────────────────────────────────────────────── */
console.log('3) every link in the block');
const routes = new Set(
  [...readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8').matchAll(/path="([^"]+)"/g)].map(m => m[1]),
);
const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
if (hrefs.length < 8) fail(`only ${hrefs.length} links in the block, which is thin for a home page a crawler reads`);
const gamePaths = new Set(ALL_GAMES.map(g => g.path));
let gameLinks = 0;
for (const h of hrefs) {
  if (!h.startsWith('/')) { fail(`${h} is not an internal link`); continue; }
  if (!routes.has(h)) fail(`${h} is not a route in App.tsx`);
  if (gamePaths.has(h)) gameLinks += 1;
}
console.log(`   ${hrefs.length} links, ${gameLinks} of them games, every one a real route`);
if (gameLinks < 6) fail(`only ${gameLinks} of the links go to a game, which is the point of the block`);

/* ── 5: nothing dated ─────────────────────────────────────────────────── */
/* ── the head a JavaScript-off crawler reads ──────────────────────────── */
console.log('4) the head the crawler actually gets');
/* Round 265. Every other page's canonical and title reach a crawler because
   the prerenderer captures the head AFTER React has drawn it. The home page is
   deliberately not prerendered, so whatever is in this template is the whole
   of what a crawler with JavaScript off sees. Measured live on 2026-08-22 with
   a Googlebot user agent: ten pages, ten canonicals, and the one missing was
   the home page. */
const head = html.slice(0, rootStart);
const canon = head.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
if (!canon) fail('the template has no canonical, so a crawler with JavaScript off sees none on the home page');
else if (canon[1] !== 'https://douknowball.com/') fail(`the home canonical points at ${canon[1]}`);
const staticTitle = (head.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
if (!staticTitle.trim()) fail('the template has no title');
/* and the app must not rename the page the moment it boots: a crawler that
   renders would then read a different title from one that does not */
const indexPage = readFileSync(path.join(ROOT, 'src/pages/Index.tsx'), 'utf8');
const appTitle = (indexPage.match(/title="([^"]*)"/) ?? [])[1] ?? '';
if (appTitle !== staticTitle) {
  fail(`the template says ${JSON.stringify(staticTitle)} and the app sets ${JSON.stringify(appTitle)}, so the two disagree`);
}
const staticDesc = head.match(/<meta name="description" content="([^"]+)"/);
if (!staticDesc || staticDesc[1].length < 60) fail('the template has no usable meta description');
console.log(`   canonical ${canon ? canon[1] : 'MISSING'}, title matches the app, description ${staticDesc ? staticDesc[1].length : 0} chars`);

/* ── Round 651: the description is one string in both places ──────────── */
/* The title was fenced in Round 265 and the description never was, so the
   template said "Free sports trivia games and daily sports quizzes: NFL, NBA,
   ..." while the app said "120+ free sports trivia games, daily sports quizzes
   and career sims ...", and a crawler got one or the other depending on
   whether it ran JavaScript. Neither named the Soccer Career sim or Club
   Manager, the two games that carry most of the traffic. Now the app passes a
   plain string (not a count computed at runtime, which would drift from the
   template the day the 130th game ships), and this holds the pair together:
   equal to each other, the template's social tags equal too, the count a
   floor that is true and still close, both games named by their registry
   labels, and a length a result does not cut.
   HOME_COPY_CONTROL=descdrift changes one word of the app's description in
   memory; this part must then report the pair apart, and nothing else may
   fail. */
console.log('4b) the home description is one string in the template and the app');
const CONTROL = process.env.HOME_COPY_CONTROL || '';
if (CONTROL && CONTROL !== 'descdrift') {
  console.error(`HOME_COPY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const failuresBefore4b = failures;
let descDriftCaught = false;
{
  const decodeAttr = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const tpl = staticDesc ? decodeAttr(staticDesc[1]) : '';
  const seoBlock = (indexPage.match(/<PageSeo\b([\s\S]*?)\/>/) ?? [])[1] ?? '';
  let app = (seoBlock.match(/\bdescription="([^"]*)"/) ?? [])[1] ?? null;
  if (app === null) {
    fail('the home PageSeo description in src/pages/Index.tsx is not a plain string, so it cannot be held equal to the template');
  } else {
    if (CONTROL === 'descdrift') {
      const drifted = app.replace('No login needed.', 'No login required.');
      if (drifted === app) {
        console.error('control descdrift: the app description has no "No login needed." to change, so this control would prove nothing');
        process.exit(1);
      }
      app = drifted;
      console.log('   control descdrift: one word of the app description changed in memory; the pair must be reported apart');
    }
    if (app !== tpl) {
      fail(`the template's description ${JSON.stringify(tpl)} and the app's ${JSON.stringify(app)} differ, so a crawler reads one or the other depending on JavaScript`);
      if (CONTROL === 'descdrift') descDriftCaught = true;
    }
  }
  for (const key of ['og:description', 'twitter:description']) {
    const m = head.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]+)"`));
    if (!m) fail(`the template has no ${key}`);
    else if (decodeAttr(m[1]) !== tpl) fail(`the template's ${key} is not its meta description, so a share card before JavaScript says something else`);
  }
  const floor = tpl.match(/^(\d+)\+ free sports games\b/);
  if (!floor) {
    fail('the home description does not open with an "N+ free sports games" floor');
  } else {
    const n = Number(floor[1]);
    if (n > totalGames) fail(`the home description claims ${n}+ games and there are ${totalGames}`);
    else if (totalGames - n > Math.max(15, totalGames * 0.2)) fail(`"${n}+" in the home description is ${totalGames - n} behind the real ${totalGames}, so the floor has stopped being useful`);
  }
  const labels = new Set(ALL_GAMES.map(g => g.label));
  for (const name of ['Soccer Career', 'Club Manager']) {
    if (!labels.has(name)) fail(`"${name}" is no longer a registry label, so the home description names a game the site does not list`);
    if (!tpl.includes(name)) fail(`the home description does not name ${name}`);
  }
  if (tpl.length < 120 || tpl.length > 158) fail(`the home description is ${tpl.length} characters, outside 120 to 158`);
  console.log(`   template and app ${app === tpl ? 'match' : 'DIFFER'}, ${tpl.length} characters, social tags match, floor ${floor ? floor[1] + '+' : 'missing'} against ${totalGames} games`);
}
const failuresAfter4b = failures;

console.log('5) nothing in it belongs to one day');
const DATED = [
  [/\b(19|20)\d\d\b/, 'a year'],
  [/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/, 'a month'],
  [/\b(today|tonight|tomorrow|this week|yesterday)\b/i, 'a relative date'],
  [/\b\d+\s*[-x]\s*\d+\b/, 'a scoreline'],
];
for (const [re, what] of DATED) {
  const m = text.match(re);
  if (m) fail(`the block contains ${what}: ${JSON.stringify(m[0])}`);
}
console.log('   no years, months, relative dates or results');

console.log('');
if (CONTROL === 'descdrift') {
  /* inverted: the pair must be reported apart, by part 4b, and nothing else
     may fail, or the red could have come from anywhere */
  const elsewhere = failuresBefore4b + (failures - failuresAfter4b);
  if (descDriftCaught && elsewhere === 0) {
    console.log('simHomeCopy control descdrift: green. The drifted description was reported by part 4b and nothing else failed.');
    process.exit(0);
  }
  if (!descDriftCaught) console.error('simHomeCopy control descdrift: RED. A description that differs from the template went unreported, so part 4b proves nothing.');
  if (elsewhere > 0) console.error(`simHomeCopy control descdrift: RED. ${elsewhere} failure(s) outside part 4b, which the control run must not hide.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simHomeCopy: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simHomeCopy: green. The one page a crawler reads first says only true things.');
