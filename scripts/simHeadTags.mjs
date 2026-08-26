/**
 * Round 276: every page says its own thing exactly once.
 *
 * WHAT THIS EXISTS FOR. index.html carries a full block of SEO tags, correctly,
 * because the home page is the one route that is not prerendered and a crawler
 * that runs no JavaScript has nothing else to read. Helmet then writes the
 * page's own tags at runtime. Helmet ADDS rather than replaces, so every
 * prerendered page ended up carrying both.
 *
 * MEASURED on the 126 shipped pages before this round: ten tags duplicated on
 * every single one. The canonical, which Round 274 caught and fixed, plus
 * description, og:type, og:title, og:description, og:image, twitter:card,
 * twitter:title, twitter:description and twitter:image, which it did not,
 * because the harness that found the canonical only read canonicals.
 *
 * A reader takes the FIRST tag it finds. So every page handed out the generic
 * site description instead of its own, and every share of every game on
 * Facebook, LinkedIn or X carried the site wide title, blurb and picture rather
 * than the game's. Footle's own line was sitting second in the file behind the
 * home page's.
 *
 * This harness counts, rather than checking for presence, because presence is
 * what nine rounds of checks already asked for and presence is exactly what was
 * true the whole time.
 *
 * Run: npm run build && node scripts/simHeadTags.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const docs = [];
for (const e of readdirSync(PUBLIC, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const f = path.join(PUBLIC, e.name, 'index.html');
  if (!existsSync(f) || !statSync(f).isFile()) continue;
  const html = readFileSync(f, 'utf8');
  /* the 8 retired signposts from Round 272 are tiny redirect documents with a
     head of their own on purpose, so they are not part of this */
  if (!html.includes('/prerender-boot.js')) continue;
  docs.push([`/${e.name}`, html]);
}
console.log(`0) ${docs.length} shipped pages`);

/* ── 1: one of each, never two ─────────────────────────────────────────── */
console.log('1) every head tag appears exactly once');
const WATCHED = ['description', 'og:type', 'og:title', 'og:description', 'og:image',
  'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
const offenders = new Map();
for (const [route, html] of docs) {
  for (const key of WATCHED) {
    const n = [...html.matchAll(new RegExp(`<meta[^>]+(?:name|property)="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g'))].length;
    if (n !== 1) offenders.set(key, (offenders.get(key) ?? 0) + 1);
  }
  const canon = [...html.matchAll(/rel="canonical"/g)].length;
  if (canon !== 1) offenders.set('canonical', (offenders.get('canonical') ?? 0) + 1);
  const titles = [...html.matchAll(/<title[^>]*>/g)].length;
  if (titles !== 1) offenders.set('title', (offenders.get('title') ?? 0) + 1);
}
for (const [key, n] of offenders) {
  fail(`${key} appears more than once (or not at all) on ${n} of ${docs.length} pages, and a reader takes the first one`);
}
console.log(`   ${WATCHED.length + 2} tag kinds checked on ${docs.length} pages, ${offenders.size} kinds wrong`);

/* ── 2: and the one that survives is the page's own ────────────────────── */
/* This is the half that matters. One tag per page would still be wrong if the
   surviving one were the template's. Every tag Helmet writes carries data-rh,
   so the test is simply whether the survivor is Helmet's. */
console.log('2) the tag that survives is the page\'s own, not the template\'s');
let templateWon = 0;
for (const [route, html] of docs) {
  for (const key of ['description', 'og:title', 'og:description']) {
    const m = html.match(new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]*>`));
    if (m && !/data-rh/.test(m[0])) {
      templateWon += 1;
      if (templateWon <= 4) fail(`${route} still answers with the template's ${key}, so it is describing the whole site rather than itself`);
    }
  }
}
console.log(`   ${templateWon} template written tags left standing`);

/* ── 3: and no two pages say the same thing ────────────────────────────── */
/* The failure this round fixed looked exactly like every page having the same
   description, so the strongest possible check is that they are all different
   now. Titles are already covered by simIndexing; descriptions were not. */
console.log('3) no two pages share a description');
const byDesc = new Map();
for (const [route, html] of docs) {
  const m = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/);
  if (!m) { fail(`${route} has no description at all`); continue; }
  const list = byDesc.get(m[1]) ?? [];
  list.push(route);
  byDesc.set(m[1], list);
}
let shared = 0;
for (const [desc, routes] of byDesc) {
  if (routes.length > 1) {
    shared += routes.length;
    if (shared <= 8) fail(`${routes.length} pages share one description (${routes.slice(0, 3).join(', ')}): ${JSON.stringify(desc.slice(0, 48))}`);
  }
}
console.log(`   ${byDesc.size} distinct descriptions across ${docs.length} pages`);

/* ── 4: reported, not failed ───────────────────────────────────────────── */
/* Google truncates a result title around 60 characters. This is a number for
   whoever writes the next batch of copy, not a red light: shortening 37 titles
   is a copy job with real judgement in it, and a board that stays red until
   somebody does it teaches everyone to ignore the board. */
console.log('4) title lengths');
const lens = docs.map(([r, h]) => [(h.match(/<title[^>]*>([^<]*)<\/title>/) || [, ''])[1].length, r]).sort((a, b) => b[0] - a[0]);
const over = lens.filter(([n]) => n > 60);
console.log(`   median ${lens[Math.floor(lens.length / 2)][0]}, longest ${lens[0][0]} (${lens[0][1]}), ${over.length} over 60 characters`);
if (over.length) console.log(`   NOT A FAILURE: Google truncates around 60, so these get cut off in results. A copy job, listed here so it stays visible.`);

console.log('');
if (failures > 0) {
  console.error(`simHeadTags: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simHeadTags: green. Every page says its own thing, once.');
