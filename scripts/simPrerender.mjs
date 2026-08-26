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

console.log('6) no snapshot pins itself to one build');
/* Round 257. A snapshot lives in public/ and is copied verbatim into every
   future build, so a hashed path inside one is a promise about a file that
   the next build renames. Proved in a browser: served against a fresh build,
   a snapshot carrying the old <script src="/assets/index-HASH.js"> 404s on
   the entry bundle and on every lazy chunk, and the app never starts. The
   page keeps its words and stops being a site. simPrerenderBoot proves the
   replacement works in a real browser; this is the cheap version that runs
   on every build and states the property exactly. */
let hashed = 0;
for (const [r, html] of docs) {
  if (r === '/') continue;   // the root is vite's own output, hashes and all
  const refs = html.match(/(?:src|href)="\/assets\/[^"]+"/g);
  if (refs) { hashed += 1; fail(`${r}: pinned to one build by ${refs.length} hashed path(s), first ${refs[0]}`); }
  if (!html.includes('/prerender-boot.js')) {
    fail(`${r}: no boot script, so nothing will ever inject the real bundle`);
  }
}
console.log(`   ${docs.size - 1} snapshots, ${hashed} carrying a hashed path`);

console.log('7) no dated real world line was frozen into a snapshot');
/* Round 258. The ticker now carries real fixtures with a relative date
   worked out from the reader's clock ("Italian Grand Prix at Monza, in nine
   days"). That sentence is true for about a day, and a snapshot lives for
   weeks, so the ticker marks those lines data-no-prerender and the
   prerenderer strips them. This reads the calendar's own titles out of the
   source rather than restating them, so adding an entry extends the check
   automatically. */
const calPath = path.join(ROOT, 'src/data/sportsCalendar.ts');
if (!existsSync(calPath)) {
  fail('src/data/sportsCalendar.ts is missing, so the ticker has no calendar to read');
} else {
  const titles = [...readFileSync(calPath, 'utf8').matchAll(/^\s*title: (?:'([^']+)'|"([^"]+)")/gm)]
    .map(m => m[1] ?? m[2]);
  if (titles.length < 3) fail(`only found ${titles.length} calendar titles to check for, which cannot be right`);
  /* The defect is a TICKER LINE, which is the title followed by a comma and a
     relative date, not the title on its own. The first draft looked for the
     bare title and immediately flagged the What's New page for the sentence
     announcing this very feature, which mentions World Series Game 1 in
     ordinary prose that stays true forever. A guard that fires on good
     writing is a guard people learn to skip, so it now matches the shape the
     ticker actually renders and nothing else. */
  const WHEN = String.raw`(?:today|tomorrow|on now|in \d+ days|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)`;
  let frozen = 0;
  for (const [r, html] of docs) {
    const t = textOf(html);
    for (const title of titles) {
      const line = new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*${WHEN}\\b`);
      if (line.test(t)) { frozen += 1; fail(`${r}: froze the dated ticker line ${JSON.stringify(title)} into a file that outlives it`); }
    }
  }
  console.log(`   ${titles.length} dated titles, ${frozen} of them frozen as a ticker line in the ${docs.size} snapshots`);
}

console.log('8) nothing a page renders is thrown away for being long');
/* ROUND 269. The extractor used to skip any element whose text ran past 1200
   characters. That cap exists for a real reason, a giant wrapper element would
   otherwise dump the entire page into the snapshot, but length is the wrong
   test for it and it was quietly costing us content. Measured on /whats-new:
   the source held 112 entries and the shipped page carried 106. The six it
   dropped were the longest six, and on a changelog the longest entries are the
   biggest features, so the Soccer Career squad card, the full browser
   inspection and the search visibility pass were all missing from the page a
   crawler receives. The cap is about SHAPE now, a wrapper is capped and a leaf
   is not, and this is how that stays true. The changelog is the right page to
   measure it on because it is the only one on the site whose entries are long
   by nature and whose source is a flat readable list. */
{
  const src = readFileSync(path.join(ROOT, 'src/pages/WhatsNew.tsx'), 'utf8');
  const entries = [...src.matchAll(/<li><strong className="text-foreground">([^<]+)<\/strong>/g)]
    .map(m => m[1].trim());
  const shipped = docs.get('/whats-new');
  if (!entries.length) {
    fail('could not read any What\'s New entries out of the source, so this check is measuring nothing');
  } else if (!shipped) {
    fail('/whats-new has no shipped document at all');
  } else {
    const text = textOf(shipped).replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"');
    const missing = entries.filter(e => !text.includes(e.replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'")));
    for (const m of missing.slice(0, 6)) fail(`/whats-new drops the entry "${m}", which means the extractor is throwing away real content again`);
    if (missing.length > 6) fail(`/whats-new drops ${missing.length} entries in total`);
    console.log(`   ${entries.length - missing.length} of ${entries.length} changelog entries reach the shipped page`);
  }
}

console.log('9) no link is written into a snapshot twice');
/* The other half of the same round. Taking an element's innerText flattens any
   link inside it into plain words, and the loop then emitted that link AGAIN
   as a bare anchor of its own, always immediately after its container.
   Measured before the fix: 161 duplicated anchors across all 121 snapshots,
   every document affected.

   THE ASSERTION IS ON THE EXTRACTOR, NOT ON THE OUTPUT, AND THAT IS A
   DELIBERATE CLIMBDOWN FROM TWO DRAFTS THAT BOTH CRIED WOLF. Draft one
   matched "a block followed by an anchor whose text the block contains" and
   flagged three innocent pages: the terms page says the words Privacy Policy
   in a long paragraph and the footer's Privacy Policy link happens to be the
   next thing on the page. Draft two demanded the same href AND the same text
   and still flagged /contact and /terms, because those pages really do link
   the privacy policy from their prose AND from the footer, which is normal
   and correct. The duplication this round removed is not distinguishable from
   honest repeated linking by reading the finished HTML, because the thing
   that made it a duplicate was that ONE DOM element got written out twice,
   and that fact does not survive into the file.

   So the guarantee is kept where it is actually true. The extractor marks
   every anchor it writes inside a block, and skips it when the loop reaches
   it on its own, which makes writing one twice structurally impossible. This
   asserts that mechanism is still there, and REPORTS the adjacency count
   without asserting on it, the same way simOpposition reports a signal too
   small to test rather than pretending it is a check. Measured: 161 before
   this round, 2 after, and both of those two are a page that links the
   privacy policy from its own text as well as from the footer. */
{
  const src = readFileSync(path.join(ROOT, 'scripts/prerender.mjs'), 'utf8');
  if (!/consumed\.add\(child\)/.test(src) || !/consumed\.has\(el\)/.test(src)) {
    fail('prerender.mjs no longer marks the anchors it writes inside a block, so every inline link will be written out twice again');
  }
  let adjacent = 0;
  for (const [, html] of docs) {
    const i = html.indexOf('<div id="root">');
    if (i < 0) continue;
    for (const m of html.slice(i).matchAll(/<(p|li|h[1-4]|blockquote)\b[^>]*>([\s\S]*?)<\/\1>\s*<a href="([^"]*)">([^<]+)<\/a>/g)) {
      const inside = [...m[2].matchAll(/<a href="([^"]*)">([^<]*)<\/a>/g)].map(a => a[1] + '|' + a[2].trim());
      if (inside.includes(m[3] + '|' + m[4].trim())) adjacent += 1;
    }
  }
  console.log(`   the consumed-anchor guard is in place; ${adjacent} block-then-same-link adjacencies (reported, not asserted on: honest repeat linking looks identical)`);
}

console.log('10) the snapshot styling does not outlive the snapshot');
/* ROUND 271, AND THIS ONE WAS LIVE FOR THIRTEEN ROUNDS. Every snapshot carries
   a small <style> in its head so the readable text looks like the site for the
   fraction of a second before the real stylesheet arrives. It set padding of
   16px on html and body. That block stays in the head forever: Tailwind's
   reset zeroes body MARGIN and says nothing about body PADDING, so the padding
   survived the stylesheet, survived React mounting, and squeezed the live app
   by 64 pixels on all 121 prerendered pages. Measured on douknowball.com at a
   390 pixel viewport: body 358 wide on /records and /leaderboard, and 390 on
   the home page, which is the one route that is not prerendered.

   Nothing caught it because every layout check on this project hunts content
   WIDER than the screen and this made everything narrower. The padding lives
   on a wrapper inside #root now, which React discards on mount. Both halves
   are asserted: html and body must be pinned to zero padding, and the wrapper
   must actually be there, because either one alone would let it back. */
{
  let leaks = 0, missing = 0;
  for (const [r, html] of docs) {
    if (r === '/') continue; /* the home page is served from the template, not a snapshot */
    const style = (html.match(/<style>([\s\S]*?)<\/style>/) ?? [])[1] ?? '';
    const rule = style.match(/html,body\{([^}]*)\}/);
    if (!rule) { fail(`${r}: no html,body boot rule in the snapshot at all, so the shape this checks has changed`); continue; }
    const pad = rule[1].match(/padding:\s*([^;}]+)/);
    if (pad && pad[1].trim() !== '0') {
      leaks += 1;
      if (leaks <= 3) fail(`${r}: the boot style sets padding ${pad[1].trim()} on html and body, which never goes away and shrinks the live app`);
    }
    if (!html.includes('<div id="dukb-snapshot">')) {
      missing += 1;
      if (missing <= 3) fail(`${r}: no dukb-snapshot wrapper, so the readable text has no padding before the app mounts`);
    }
  }
  if (leaks > 3) fail(`${leaks} snapshots leak padding onto html and body`);
  if (missing > 3) fail(`${missing} snapshots have no padded wrapper`);
  console.log(`   ${docs.size - 1} snapshots, ${leaks} leaking padding onto the live app, ${missing} missing the wrapper`);
}

/* ── Round 274: exactly one canonical per document ────────────────────── */
/* Round 265 put a hardcoded canonical to the home page in index.html, for the
   one route that is not prerendered and has no other way to declare one. It was
   right for that page and quietly wrong for every other, because Helmet ADDS a
   canonical rather than replacing a static one, so 126 of the 134 shipped
   documents went out carrying two: the home page's first and their own second.
   Google ignores conflicting canonicals, and a crawler that simply takes the
   first was being told every page on this site IS the home page. It never
   reached the live site because it sat in the unpushed queue. Nothing caught
   it for nine rounds: every check here asked whether a canonical was PRESENT
   and none asked how many there were. */
console.log('11) exactly one canonical per shipped document');
{
  let worst = 0, offenders = 0;
  for (const [r, html] of docs) {
    const n = (html.match(/rel="canonical"/g) || []).length;
    if (n > 1) {
      offenders += 1;
      worst = Math.max(worst, n);
      if (offenders <= 4) {
        const hrefs = [...html.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g)].map(m => m[1]);
        fail(`${r} ships ${n} canonical tags (${hrefs.join(' and ')}), and a crawler taking the first is told this page is ${hrefs[0]}`);
      }
    }
    if (n === 0) fail(`${r} ships no canonical at all`);
  }
  console.log(`   ${docs.size} documents, ${offenders} with more than one canonical, worst ${worst || 1}`);
}

/* ── Round 274: no running clock is frozen into a saved page ──────────── */
/* 90 of the 134 shipped documents carried "Next puzzle in 22:04:46", a live
   countdown captured at the instant the snapshot was taken. It is wrong within
   a second of being written and absurd by the time anyone reads it, which is
   exactly what Round 256's rule against freezing dated data forbids. It also
   made every snapshot non deterministic: re-rendering one route twice produced
   two different files, so each round's zip carried 90 files of countdown churn
   that buried whatever had actually changed. The countdown is marked
   data-no-prerender now, the mechanism Round 258 built for this.

   The pattern is narrow on purpose. A short line whose text is a running clock
   is ephemeral by definition; a scoreline is 2-1 and a match clock is 45:00,
   neither of which is hh:mm:ss. */
console.log('12) no shipped page has a running clock frozen into it');
{
  const CLOCK = /\b\d{1,2}:\d{2}:\d{2}\b/;
  let frozen = 0;
  for (const [r, html] of docs) {
    for (const m of html.matchAll(/<(p|li|td|h[1-4])>([^<]{0,80})<\/\1>/g)) {
      if (CLOCK.test(m[2])) {
        frozen += 1;
        if (frozen <= 4) fail(`${r} has a live clock frozen into it: ${JSON.stringify(m[2].trim().slice(0, 50))}`);
        break;
      }
    }
  }
  console.log(`   ${docs.size} documents, ${frozen} carrying a frozen clock`);
}

console.log('');
if (failures > 0) {
  console.error(`simPrerender: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simPrerender: green. Every page answers with its own words, no JavaScript required.');
