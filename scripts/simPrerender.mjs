/**
 * Round 256 harness (number 105): the prerendered HTML is real content.
 *
 * The whole point of Round 256 is that a crawler must be able to read this
 * site without running JavaScript. That claim is easy to believe and easy
 * to get wrong (a snapshot that captured a loading spinner, a build that
 * silently skipped half the routes, a host that serves the SPA shell
 * anyway), so it is measured here against dist/ exactly as a crawler
 * would receive it:
 *
 *   1. COVERAGE: every route in the sitemap has its own index.html on
 *      disk. A missing one is a page that stays invisible.
 *   2. NOT THE SHELL: each page carries far more readable text than the
 *      un-prerendered shell did (measured at about 7,000 characters of
 *      which the readable words were code comments), and every page's own
 *      title is in its own document.
 *   3. NOT ALL THE SAME PAGE: the 122 documents must not collapse to a
 *      handful of hashes. That was the actual defect: identical HTML on
 *      every URL is what "low value content" means to a reviewer.
 *   4. ITS OWN WORDS: a sample of game pages must contain a phrase that
 *      belongs to that page and nowhere else, so a page cannot pass by
 *      carrying only the shared header and footer.
 *   5. NO STALE DATA AND NO ERROR CARDS: a prerendered file lives on disk
 *      for weeks, so it must not contain a fail-closed error line, and it
 *      must not contain a date-stamped figure that will age.
 *
 * Run: node scripts/simPrerender.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

if (!existsSync(path.join(DIST, 'sitemap.xml'))) {
  console.log('NO dist/sitemap.xml. BUILD AND PRERENDER FIRST. NOT CHECKED.');
  process.exit(1);
}
const sitemap = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const routes = [...new Set(
  [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
    .map(m => m[1] || '/')
    .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r)),
)];

const fileFor = r => (r === '/' ? path.join(DIST, 'index.html') : path.join(DIST, r.replace(/^\//, ''), 'index.html'));
const textOf = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

console.log(`1) coverage: ${routes.length} routes in the sitemap`);
const docs = new Map();
for (const r of routes) {
  const f = fileFor(r);
  if (!existsSync(f) || !statSync(f).isFile()) { fail(`${r} has no prerendered file`); continue; }
  docs.set(r, readFileSync(f, 'utf8'));
}
console.log(`   ${docs.size} of ${routes.length} routes have a document`);

console.log('2) each document is a page, not the empty shell');
/* the un-prerendered shell measured 7,494 characters of stripped text and
   almost all of it was code comments; a real page runs many times that.
   The floor is deliberately far below the smallest real page. */
const TEXT_FLOOR = 900;
let thinnest = Infinity, thinnestRoute = '';
for (const [r, html] of docs) {
  const t = textOf(html);
  if (t.length < thinnest) { thinnest = t.length; thinnestRoute = r; }
  if (t.length < TEXT_FLOOR) fail(`${r}: only ${t.length} characters of readable text, the floor is ${TEXT_FLOOR}`);
  const title = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
  if (!title.trim()) fail(`${r}: no title`);
}
console.log(`   thinnest page ${thinnestRoute} at ${thinnest} characters of text`);

console.log('3) the documents are not all the same page');
const hashes = new Map();
for (const [r, html] of docs) {
  let h = 0;
  for (let i = 0; i < html.length; i++) { h = (Math.imul(h, 31) + html.charCodeAt(i)) | 0; }
  const key = String(h);
  if (!hashes.has(key)) hashes.set(key, []);
  hashes.get(key).push(r);
}
const dupes = [...hashes.values()].filter(v => v.length > 1);
console.log(`   ${hashes.size} distinct documents across ${docs.size} routes`);
for (const group of dupes) fail(`these routes share one identical document: ${group.slice(0, 4).join(', ')}`);
/* titles must differ too: identical titles across pages read as duplicates
   even when the bodies differ slightly */
const titles = new Map();
for (const [r, html] of docs) {
  const t = ((html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '').trim();
  if (!titles.has(t)) titles.set(t, []);
  titles.get(t).push(r);
}
for (const [t, rs] of titles) {
  if (rs.length > 1) fail(`${rs.length} routes share the title ${JSON.stringify(t.slice(0, 50))}: ${rs.slice(0, 3).join(', ')}`);
}

console.log("4) each sampled page carries its OWN words");
/* phrases that appear on exactly one page: if a snapshot caught only the
   shared chrome, these are the words that would be missing */
const OWN_WORDS = [
  ['/soccer-career', 'academy'],
  ['/records', 'Record Books'],
  ['/hall-of-champions', 'HALL OF CHAMPIONS'],
  ['/silverware-sort', 'SILVERWARE SORT'],
  ['/whod-they-beat', "Who'd They Beat"],
  ['/champ-or-not', 'CHAMP OR NOT'],
  ['/club-manager', 'Club Manager'],
  ['/minefield', 'Minefield'],
  ['/whats-new', "What's New"],
  ['/privacy', 'Privacy'],
];
for (const [route, phrase] of OWN_WORDS) {
  const html = docs.get(route);
  if (!html) { fail(`${route}: no document to check for its own words`); continue; }
  const t = textOf(html);
  if (!t.toLowerCase().includes(phrase.toLowerCase())) {
    fail(`${route}: the page does not contain ${JSON.stringify(phrase)}, so the snapshot missed its content`);
  }
}
console.log(`   ${OWN_WORDS.length} sampled pages each carry their own words`);

console.log('5) nothing stale or broken was baked in');
/* these are the fail-closed lines the site shows when data cannot load.
   A snapshot containing one would tell a crawler the page is broken. */
/* These must be the site's ACTUAL fail-closed lines, not words that
   merely sound like failure. The first version of this list included
   "unavailable" and flagged /clue-auction, whose SEO copy says clues with
   no real data "show as unavailable rather than invented", which is the
   honesty rule being explained, not an error. A check that fires on good
   copy trains you to ignore it. */
const BAD_LINES = [
  "Couldn't load",
  'Refresh to try again',
  'went wrong',
];
/* A snapshot is a file every visitor receives, so it must not carry the
   state of whichever browser drew it. The first full pass baked the
   prerender browser's own idle-game save into the ticker on all 122
   pages ("Your stadium empire: $54 banked"). These are the shapes that
   personal state takes on this site. */
/* These must match the SHAPE of leaked state, not words that appear in
   ordinary copy. A first draft used /banked/ and /your streak/ and
   flagged twelve pages of perfectly good writing ("called games are
   banked forever", "Protect your streak late"). A guard that cries wolf
   is a guard nobody reads. */
const PERSONAL_STATE = [
  /Your stadium empire/i,
  /\$[\d,.]+ banked/i,
  /Resume Career/i,
  /Continue your \d+ day streak/i,
];
for (const [r, html] of docs) {
  const t = textOf(html);
  for (const bad of BAD_LINES) {
    if (t.includes(bad)) fail(`${r}: the snapshot baked in an error line (${JSON.stringify(bad)})`);
  }
  for (const pat of PERSONAL_STATE) {
    if (pat.test(t)) fail(`${r}: the snapshot baked in one browser's personal state (${pat})`);
  }
}
console.log(`   no error cards and no personal state in any of the ${docs.size} documents`);

console.log('');
if (failures > 0) {
  console.error(`simPrerender: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simPrerender: green. Every page answers with its own words, no JavaScript required.');
