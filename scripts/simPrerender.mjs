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
import fs from 'node:fs';
import { readFileSync, existsSync, statSync } from 'node:fs';
/* Round 420: the atomic write is exercised directly in section 17 */
import { writeFileAtomic, RENAME_ATTEMPTS } from './lib/atomicWrite.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

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

/* ROUND 284 NEGATIVE CONTROL for section 14. Run with
   SIM_PRERENDER_CONTROL=noindex and one sitemap document is given a noindex
   in memory, which section 14 must then report. The edit is asserted to have
   landed, because a control that changes nothing proves nothing: an earlier
   control in this repo replaced a string that was not in the file, stayed
   green, and green meant "the control did not fire", not "the check works". */
const CONTROL = process.env.SIM_PRERENDER_CONTROL || '';
/* Round 420 adds truncwrite, which puts back the write that truncates its
   target before writing. Like noindex it is INVERTED: its section is supposed
   to fail under it, so the run reports "control: green" and exits 0 when it
   catches that, and red if its section stayed clean or anything outside it
   failed. A control whose red could come from anywhere says
   nothing about the check it is meant to prove. */
if (CONTROL && !['noindex', 'replay', 'port', 'truncwrite'].includes(CONTROL)) {
  console.error(`SIM_PRERENDER_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
if (CONTROL === 'noindex') {
  const victim = [...docs.keys()].find(r => r !== '/');
  const before = docs.get(victim);
  const after = before.replace(/<head>/i, '<head><meta name="robots" content="noindex, follow">');
  if (after === before) {
    console.error(`control: could not inject a noindex into ${victim}, so this control would prove nothing`);
    process.exit(1);
  }
  docs.set(victim, after);
  console.log(`   NEGATIVE CONTROL ON: ${victim} has been given a noindex in memory and section 14 must report it`);
}

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
/* ROUND 275 MOVED WHERE THIS LOOKS, and the distinction is the whole point.
   The danger is a hash frozen into a file that is COMMITTED and then copied
   into a future build that renames its bundle. That danger lives in public/,
   not in dist/. Round 275 added a build step that writes the real tags into the
   dist copies precisely because dist is rebuilt from scratch every time, so its
   hashes are correct by construction and cannot go stale. Reading dist here
   would now fail on 126 pages for doing exactly the right thing. So this reads
   the committed files, which is what the rule was always about, and
   scripts/simSnapshotAssets.mjs is what checks the dist side. */
let hashed = 0;
for (const [r] of docs) {
  if (r === '/') continue;   // the root is vite's own output, hashes and all
  const committed = path.join(PUBLIC, r.replace(/^\//, ''), 'index.html');
  if (!existsSync(committed)) continue;
  const committedHtml = readFileSync(committed, 'utf8');
  const refs = committedHtml.match(/(?:src|href)="\/assets\/[^"]+"/g);
  if (refs) { hashed += 1; fail(`${r}: the COMMITTED snapshot is pinned to one build by ${refs.length} hashed path(s), first ${refs[0]}`); }
  /* The boot script is the fallback for a build where the Round 275 plugin did
     not run, so it has to be in the committed file too, not only in dist. */
  if (!committedHtml.includes('/prerender-boot.js')) {
    fail(`${r}: no boot script, so nothing will ever inject the real bundle`);
  }
}
console.log(`   ${docs.size - 1} snapshots, ${hashed} carrying a hashed path`);

console.log('7) no dated real world line was frozen into a snapshot');
/* Round 258 gave the ticker a hand kept calendar of real fixtures with
   relative dates ("in nine days"), and this section kept those sentences out
   of the snapshots. Round 298 retired the calendar itself on the owner's
   2026-08-26 instruction (the strip carries only the live feed now), so the
   calendar file is gone and there are no titles left to scan for. What
   remains checkable is the shape: no snapshot may carry ANY line matching
   the retired ticker pattern, a phrase followed by a comma and a relative
   date, coming from a resurrected calendar. The stronger successor is
   section 13, which pins the strip to the live feed shapes, and
   playSnapshotDrift, which needs no list at all. If the calendar ever comes
   back, this section must come back with it in its Round 258 form. */
{
  const calPath = path.join(ROOT, 'src/data/sportsCalendar.ts');
  if (existsSync(calPath)) {
    fail('src/data/sportsCalendar.ts is back but the Round 258 frozen-line scan was retired with it; restore the title scan here before shipping a calendar');
  } else {
    console.log('   the calendar is retired and stays retired; drift is held by section 13 and playSnapshotDrift');
  }
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
  /* ROUND 282 MADE THIS PRECISE, and it had to. The count was of the bare string
     rel="canonical" anywhere in the file, which was right for as long as the only
     place that string appeared was on a real tag. The soft 404 marker added to
     index.html this round has to REMOVE the home page canonical from a dead
     address, so the template now contains that string inside a querySelector and
     inside the comment explaining why, and the home page was reported as
     shipping two canonicals when it ships one. Comments and scripts are stripped
     and the count is of real link elements, which is what the rule was always
     about. The same trap caught the new 404 harness on the same afternoon: a
     guard that can be tripped by prose about itself is not measuring the thing
     it names. */
  let worst = 0, offenders = 0;
  for (const [r, doc] of docs) {
    const html = doc
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ');
    const n = (html.match(/<link[^<>]*\brel="canonical"/g) || []).length;
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

/* ── Round 280: every computed ticker line must declare itself volatile ── */
/* WHAT WENT WRONG. Round 258 built the data-no-prerender mechanism and set it
   on the calendar lines, and section 7 above checks those specific titles. That
   is a check on ONE known offender, and it could never have caught the next one.
   The next one was already there: the strip's four "Fresh daily" lines pick
   their games with Date.now(), and they were frozen into all 126 committed
   snapshots. Every page on the site was telling a crawler that today's puzzle is
   Tier List, and would have gone on telling it for as long as the file lived.

   MEASURED BEFORE FIXING, and the measurement is the reason this section is
   shaped the way it is: six routes were rendered twice with the page's own clock
   five days apart and the captured blocks diffed. Exactly four lines moved, the
   same four on every route, and nothing else on any page moved at all. So the
   corpus was date stable apart from one hole, and a check written as "look for
   Fresh daily" would have closed that hole and left the next one open.

   THE RULE IS SOURCE LEVEL AND MECHANICAL. Every items.push in TopTicker's
   buildItems either sets volatile, or its text is a plain quoted string with
   nothing interpolated into it. A line built out of a template literal is by
   definition computed from something outside this file, so it has to answer the
   question. This cannot be satisfied by accident and it extends itself: the next
   ticker line anyone writes either declares itself or fails here.

   It deliberately does NOT try to decide whether a computed line is really
   volatile. That judgement belongs to the person writing it. What this refuses
   to allow is the judgement never being made. */
console.log('13) everything the ticker computes declares itself volatile');
{
  /* ROUND 298 RESHAPED THIS SECTION WITHOUT CHANGING ITS QUESTION. The old
     ticker was a list of items.push lines and the rule was per push: a
     template literal either sets volatile or fails here. The owner's tweaks
     document replaced that strip with a scores-only wire (a LIVE chip, sport
     boxes, score cards), so there are no pushes left to audit. The question
     survives the mechanism: every element the component computes from the
     scores feed must carry data-no-prerender in its own tag, and the old
     mechanism must stay gone, because a reintroduced push list would dodge
     this check entirely. */
  const tickerPath = path.join(ROOT, 'src/components/layout/TopTicker.tsx');
  if (!existsSync(tickerPath)) {
    fail('src/components/layout/TopTicker.tsx is missing, so the ticker rule cannot be checked');
  } else {
    const raw = readFileSync(tickerPath, 'utf8');
    const src2 = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/items\.push\(/.test(src2)) {
      fail('TopTicker grew an items.push line list again; every such line must answer the volatility question, see the Round 280 story above');
    }
    const tags = [...src2.matchAll(/<(Link|span|div)\b[^>]*>/g)].map(m => m[0]);
    const dynamicMarkers = ['data-score-card', 'data-sport-box'];
    let checked = 0;
    for (const marker of dynamicMarkers) {
      const carriers = tags.filter(t => t.includes(marker));
      if (!carriers.length) { fail(`TopTicker has no ${marker} element; the wire is not rendering what this check expects, re-read it`); continue; }
      for (const t of carriers) {
        checked += 1;
        const wrapped = t.includes('data-no-prerender');
        if (marker === 'data-sport-box' && !wrapped) {
          /* The sport box link itself is static text; its data-no-prerender
             lives on the wrapping span that mounts with the feed. */
          const wrapper = src2.indexOf('data-no-prerender', Math.max(0, src2.indexOf(t) - 400));
          if (wrapper === -1 || wrapper > src2.indexOf(t)) fail(`a ${marker} element has no data-no-prerender on itself or its wrapper: ${JSON.stringify(t.replace(/\s+/g, ' ').slice(0, 80))}`);
        } else if (marker !== 'data-sport-box' && !wrapped) {
          fail(`a ${marker} element does not carry data-no-prerender: ${JSON.stringify(t.replace(/\s+/g, ' ').slice(0, 80))}`);
        }
      }
    }
    if (!/data-live-chip/.test(src2)) fail('the LIVE chip marker is gone from TopTicker');
    console.log(`   no push list, ${checked} computed elements checked for data-no-prerender, LIVE chip present`);

    /* And the shipped files must be clean of the strip's dynamic content:
       no document may carry a score card, which is the one shape that would
       freeze a twenty minute number into a month old file. */
    let frozen = 0;
    for (const [r, html] of docs) {
      if (html.includes('data-score-card')) { frozen += 1; if (frozen <= 4) fail(`${r} froze a live score card into a file that outlives the game`); }
    }
    console.log(`   ${docs.size} documents, ${frozen} carrying a frozen score card`);
  }
}

/* ── Round 284: a page in the sitemap never ships a noindex ─────────────── */
/* WHAT NEARLY SHIPPED. Round 282's soft 404 marker decides a document is a
   dead address by the ABSENCE of a snapshot block, and the prerenderer hands
   every route the bare template on purpose so React can draw the real page
   into it. Under the prerenderer every page therefore looked like a dead
   address, the marker wrote a noindex into the head, and the head is exactly
   what a snapshot keeps. All 133 saved documents came out asking not to be
   indexed, the 126 sitemap pages included. Every section above passed,
   because every section above asks whether a page has its words, its
   canonical and its links, and none asked whether the page had told the
   crawler to ignore all of it. A site that ships that has no search
   presence at all, which is worse than the empty shell Round 256 fixed.

   THE CHECK IS ON THE FILES, NOT ON THE MARKER. The marker is fixed by one
   line (the prerenderer sets a flag it returns on) and one line is exactly
   what a refactor loses. Reading the shipped documents holds whatever the
   mechanism is next time, and whatever the next marker is.

   Comments and scripts are stripped first, for the reason section 11 learned:
   the template explains the marker in prose that contains the very string this
   looks for, and a guard that can be tripped by a comment about itself is not
   measuring the thing it names. The attribute order is not assumed either;
   name before content is a convention, not a rule.

   SIM_PRERENDER_CONTROL=noindex proves the check can fail. See the top. */
console.log('14) no page in the sitemap ships a noindex');
const failuresBefore14 = failures;
{
  let noindexed = 0;
  for (const [r, doc] of docs) {
    const html = doc
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ');
    const directives = [];
    for (const tag of html.matchAll(/<meta\b[^<>]*>/gi)) {
      const name = (tag[0].match(/\bname\s*=\s*"([^"]*)"/i) || [])[1] || '';
      if (name.toLowerCase() !== 'robots') continue;
      const content = (tag[0].match(/\bcontent\s*=\s*"([^"]*)"/i) || [])[1] || '';
      directives.push(content);
    }
    if (directives.some(c => /\bnoindex\b/i.test(c))) {
      noindexed += 1;
      if (noindexed <= 4) fail(`${r} is in the sitemap and ships robots ${JSON.stringify(directives.join('; '))}: it asks Google to come in and to stay away in the same document`);
    }
  }
  if (noindexed > 4) fail(`${noindexed} sitemap documents carry a noindex in all`);
  console.log(`   ${docs.size} sitemap documents, ${noindexed} carrying a noindex`);
}
const failuresAfter14 = failures;

/* Round 422: a random board or player is a valid photograph, but rebuilding
   the same source must produce the same photograph. Every clock sample uses a
   fixed seed, records the call count and hook identity, then repeats in an
   independent context. A changed head, ordered body, call count or hook makes
   the route refuse to write.

   SIM_PRERENDER_CONTROL=replay disables the mismatch comparison in memory.
   The section must report exactly that planted defect and nothing else. */
console.log('15) seeded random crawler copy repeats before it is written');
const failuresBefore15 = failures;
{
  const prerenderPath = path.join(ROOT, 'scripts/prerender.mjs');
  let source = readFileSync(prerenderPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  if (CONTROL === 'replay') {
    const before = source;
    source = source.replace(
      /const\s+mismatchedReplay\s*=\s*samples\.findIndex\(\(sample,\s*s\)\s*=>\s*!captureRepeats\(sample,\s*replays\[s\]\)\);/,
      'const mismatchedReplay = -1;',
    );
    if (source === before) {
      console.error('control: could not disable the random replay mismatch gate, so this control would prove nothing');
      process.exit(1);
    }
  }

  const daysMatch = source.match(/const\s+SAMPLE_DAYS\s*=\s*\[([^\]]+)\]/);
  const days = daysMatch ? daysMatch[1].split(',').map(v => Number(v.trim())) : [];
  const seedMatch = source.match(/const\s+RANDOM_SEED\s*=\s*(\d+)/);
  if (days.length < 3 || days.some(v => !Number.isFinite(v)) || !seedMatch || Number(seedMatch[1]) !== 284 || /\bRANDOM_SEEDS\b/.test(source)) {
    fail('prerender.mjs does not pair every clock sample with the fixed audited random seed');
  }
  if (!/const\s+clockScript\s*=\s*\(days,\s*perturbReplay\s*=\s*false\)\s*=>/.test(source)
      || !/audit\.calls\s*\+=\s*1/.test(source)
      || !/Math\.random\s*=\s*seededRandom/.test(source)
      || !/Math\.random\s*===\s*seededRandom/.test(source)) {
    fail('the prerender init script does not count calls and prove its seeded random hook stayed installed');
  }
  if (!/let\s+replayPages\s*=\s*\[\]/.test(source)
      || !/for\s*\(let\s+pass\s*=\s*0;\s*pass\s*<\s*2;\s*pass\s*\+=\s*1\)/.test(source)
      || !/pass\s*===\s*0\s*\?\s*pages\s*:\s*replayPages/.test(source)
      || !/clockScript\(days,\s*CONTROL\s*===\s*['"]random-replay['"]\s*&&\s*pass\s*===\s*1\)/.test(source)) {
    fail('the prerender browser does not create an independent replay context for every clock sample');
  }
  if (!/randomCalls:\s*Number\.isInteger\(randomAudit\?\.calls\)/.test(source)
      || !/randomHookIntact:\s*randomAudit\?\.intact\?\.\(\)\s*===\s*true/.test(source)
      || !/const\s+brokenAudit\s*=\s*samples\.findIndex/.test(source)) {
    fail('the rendered capture does not fail closed on a missing random audit or replaced hook');
  }
  if (!/samples\.some\(sample\s*=>\s*sample\.randomCalls\s*>\s*0\)/.test(source)
      || !/replays\.push\(await\s+draw\(s,\s*route,\s*url,\s*true\)\)/.test(source)
      || !/const\s+mismatchedReplay\s*=\s*samples\.findIndex\(\(sample,\s*s\)\s*=>\s*!captureRepeats\(sample,\s*replays\[s\]\)\);/.test(source)
      || !/if\s*\(mismatchedReplay\s*!==\s*-1\)/.test(source)) {
    fail('the fixed-seed replay does not compare every random-using clock sample before writing');
  }
  if (!/original\.randomCalls\s*>=\s*0/.test(source)
      || !/replay\.randomCalls\s*===\s*original\.randomCalls/.test(source)
      || !/capturePayload\(replay\)\s*===\s*capturePayload\(original\)/.test(source)) {
    fail('the replay comparison omits the call count or exact ordered crawler payload');
  }
  console.log(`   ${days.length} clock samples use one seed, audited hooks and independent exact replays`);
}
const failuresAfter15 = failures;

/* Round 422: the desktop and Codex lanes use separate working trees but share
   one machine. A fixed default prerender port made a valid build fail as soon
   as the other lane began its own build. The default must be an operating
   system assigned loopback port, while an explicit PRERENDER_PORT remains
   available for debugging.

   SIM_PRERENDER_CONTROL=port changes the default back to 4310 in memory. This
   section must report that one planted defect and nothing else. */
console.log('16) concurrent builds get separate prerender ports');
const failuresBefore16 = failures;
{
  const prerenderPath = path.join(ROOT, 'scripts/prerender.mjs');
  let source = readFileSync(prerenderPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  if (CONTROL === 'port') {
    const before = source;
    source = source.replace(
      /(process\.env\.PRERENDER_PORT\s*===\s*undefined\s*\?\s*)0(\s*:\s*Number\(process\.env\.PRERENDER_PORT\))/,
      (_match, beforeDefault, afterDefault) => `${beforeDefault}4310${afterDefault}`,
    );
    if (source === before) {
      console.error('control: could not restore the fixed prerender port, so this control would prove nothing');
      process.exit(1);
    }
  }

  const defaultMatch = source.match(
    /const\s+REQUESTED_PORT\s*=\s*process\.env\.PRERENDER_PORT\s*===\s*undefined\s*\?\s*(\d+)\s*:\s*Number\(process\.env\.PRERENDER_PORT\)/,
  );
  if (!defaultMatch) {
    fail('prerender.mjs no longer has an explicit optional PRERENDER_PORT default');
  } else if (Number(defaultMatch[1]) !== 0) {
    fail(`prerender.mjs defaults to fixed port ${defaultMatch[1]}, so parallel working-tree builds can collide`);
  }
  if (!/server\.listen\(REQUESTED_PORT,\s*['"]127\.0\.0\.1['"]/.test(source)) {
    fail('the prerender server does not bind the requested port on loopback');
  }
  if (!/const\s+boundAddress\s*=\s*server\.address\(\)/.test(source)
      || !/const\s+PORT\s*=\s*boundAddress\.port/.test(source)) {
    fail('the prerender browser does not read back the operating system assigned port');
  }
  if (!/const\s+url\s*=\s*`http:\/\/127\.0\.0\.1:\$\{PORT\}\$\{route\}`/.test(source)) {
    fail('prerender navigation does not use the operating system assigned port');
  }
  console.log('   free loopback port by default, explicit override retained');
}
const failuresAfter16 = failures;

/* ---- 17. A FAILED WRITE MUST NOT DELETE THE PAGE (Round 420) ----------- */
/* Hit for real while Round 419 was being built: the prerenderer failed to
   write public/nfl-higher-lower/index.html with a Windows UNKNOWN error and
   left the snapshot DELETED, because a plain writeFileSync truncates its
   target before it writes a byte. The build exited 1 so nothing shipped, but
   that is luck about WHEN the write failed, not a property of the write. A
   snapshot is the only document a crawler ever sees for its route, so losing
   one has to mean "the page is stale", never "the page is gone".
   This exercises the guarantee DIRECTLY against a scratch directory, both the
   happy path and the failures, in a few milliseconds. A check that has to
   drive a headless browser over 145 routes to reach the write is a check
   nobody runs, which is exactly why nothing was watching this before.
   The failure is injected through writeFileAtomic's io seam, because there is
   no portable way to make a real disk write fail on demand, and a check that
   cannot exercise the failure path is only testing the happy one.
   SIM_PRERENDER_CONTROL=truncwrite swaps in the write this round removed, the
   one that truncates its target first. The failures it raises must come from
   THIS section and nowhere else, which the inverted block at the end of the
   file checks before it calls the control green. */
console.log('17) a failed write leaves the previous page whole');
const failuresBefore17 = failures;
{
  const tmpRoot = path.join(ROOT, 'dist', '.atomicwrite-check');
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  const target = path.join(tmpRoot, 'page', 'index.html');

  /* the control is the pre 420 write: straight at the target, no temp */
  const naive = (file, contents, io = fs) => {
    io.mkdirSync(path.dirname(file), { recursive: true });
    io.writeFileSync(file, contents);
    return file;
  };
  if (CONTROL === 'truncwrite') {
    console.log('   control truncwrite: the pre 420 write put back, straight at the target with no temp');
  }
  const write = CONTROL === 'truncwrite' ? naive : writeFileAtomic;

  write(target, 'first');
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== 'first') {
    fail('the snapshot write did not write the file it was given');
  }
  write(target, 'second');
  if (fs.readFileSync(target, 'utf8') !== 'second') fail('the snapshot write did not replace an existing file');

  /* THE POINT. A write that cannot finish must leave the previous document
     standing. The stub throws where the bytes would land, which is what a
     failing disk looks like from in here. */
  const before = fs.readFileSync(target, 'utf8');
  /* The stub TRUNCATES AND THEN THROWS, because that is what a real failed
     write does and it is the whole reason this section exists. A stub that
     merely throws would leave the target untouched even for the truncating
     write, and the control would pass: the first version of this did exactly
     that and proved nothing. */
  const exploding = {
    mkdirSync: fs.mkdirSync.bind(fs),
    renameSync: fs.renameSync.bind(fs),
    writeFileSync(where) {
      fs.writeFileSync(where, '');
      throw new Error('injected: the disk gave up after opening the file');
    },
  };
  let threw = false;
  try { write(target, 'third', exploding); } catch { threw = true; }
  if (!threw) fail('the snapshot write swallowed a failed write, so a caller cannot tell the page did not update');
  if (!fs.existsSync(target)) {
    fail('a failed snapshot write DELETED the page: the route would serve nothing to a crawler');
  } else if (fs.readFileSync(target, 'utf8') !== before) {
    fail('a failed snapshot write damaged the previous page instead of leaving it alone');
  }
  const litter = fs.existsSync(path.join(tmpRoot, 'page'))
    ? fs.readdirSync(path.join(tmpRoot, 'page')).filter(f => f.includes('.tmp'))
    : [];
  if (litter.length) fail(`a failed snapshot write left ${litter.length} temp file(s) behind: ${litter.join(', ')}`);

  /* THE RETRY IS LOAD BEARING, and that was measured rather than assumed.
     Renaming over an existing file on Windows fails with EPERM whenever
     anything holds a handle on the target for that instant, which on a normal
     desktop means a virus scanner, the search indexer or a sync client
     touching the file that was just written: 8 failures per 1000 writes with
     no retry, and an immediate retry barely helped. Across 145 routes that is
     more than one dead build per prerender, so without the retry this module
     would have swapped a rare destructive bug for a frequent build breaking
     one.
     These count the rename attempts rather than timing them. A timing
     assertion against a 15ms backoff is a coin toss on a busy machine, and
     this repo's own rule is to measure the strongest signal, not the most
     descriptive one. */
  if (CONTROL !== 'truncwrite') {
    /* `failUntil`, NOT `failures`: that name is the harness's own failure
       counter, and shadowing it inside a helper that exists to inject
       failures is a trap waiting for the next reader. */
    const flaky = (failUntil, code) => {
      let calls = 0;
      return {
        calls: () => calls,
        io: {
          mkdirSync: fs.mkdirSync.bind(fs),
          writeFileSync: fs.writeFileSync.bind(fs),
          renameSync(from, to) {
            calls += 1;
            if (calls <= failUntil) { const e = new Error('injected: a holder has the target'); e.code = code; throw e; }
            return fs.renameSync(from, to);
          },
        },
      };
    };

    /* a hold that clears must be ridden out, not reported as a failure */
    const transient = flaky(2, 'EPERM');
    write(target, 'after a transient hold', transient.io);
    if (fs.readFileSync(target, 'utf8') !== 'after a transient hold') {
      fail('a rename that failed twice with EPERM and then cleared did not land: the retry is missing');
    }
    if (transient.calls() !== 3) fail(`expected 3 rename attempts before it cleared, saw ${transient.calls()}`);

    /* a hold that never clears must still leave the old page standing */
    const permanent = flaky(Infinity, 'EPERM');
    const held = fs.readFileSync(target, 'utf8');
    let heldThrew = false;
    try { write(target, 'never lands', permanent.io); } catch { heldThrew = true; }
    if (!heldThrew) fail('a rename that never succeeds must throw rather than report a page written');
    if (permanent.calls() !== RENAME_ATTEMPTS) {
      fail(`a permanently held target got ${permanent.calls()} rename attempts, expected ${RENAME_ATTEMPTS}`);
    }
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== held) {
      fail('a rename that never succeeded damaged the previous page instead of leaving it alone');
    }

    /* and a genuine error is not a hold: retrying it just delays the truth */
    const genuine = flaky(Infinity, 'ENOENT');
    try { write(target, 'nope', genuine.io); } catch { /* expected */ }
    if (genuine.calls() !== 1) {
      fail(`a genuine ENOENT was retried ${genuine.calls()} times; only a transient hold should be retried`);
    }

    /* the retry path is a second way to leave a temp behind, and the litter
       check above ran before any of it */
    const retryLitter = fs.readdirSync(path.join(tmpRoot, 'page')).filter(f => f.includes('.tmp'));
    if (retryLitter.length) {
      fail(`a rename that gave up left ${retryLitter.length} temp file(s) behind: ${retryLitter.join(', ')}`);
    }
  }

  /* and the prerenderer has to actually use it, or none of this matters */
  /* COMMENTS STRIPPED BEFORE MATCHING. The call sits directly under a comment
     that names writeFileAtomic, and prose about the code is the one place a
     string a guard looks for is guaranteed to appear. Reverting the CALL while
     leaving that comment does fail this check as written, but a comment that
     happened to quote the call shape would satisfy it, and this repo has
     shipped that mistake four times in one day. So the prose goes first. */
  const prerenderSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'prerender.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  if (!/writeFileAtomic\(path\.join\(base,/.test(prerenderSrc)) {
    fail('scripts/prerender.mjs no longer writes its snapshots through writeFileAtomic, so a failed write can delete a page again');
  }

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  /* Only claim it holds if it held. An unconditional success line under a
     FAIL is how a reader skims a red run and sees green, and this repo's
     rule is that a harness is judged by its output. */
  if (failures === failuresBefore17) {
    console.log('   the snapshot write holds: it replaces, it rides out a transient hold, it throws rather than');
    console.log('   damage the old page, it does not retry a genuine error, and it leaves no litter');
  } else {
    console.log('   the snapshot write did NOT hold, see the failure(s) above');
  }
}
const failuresAfter17 = failures;

console.log('');
if (CONTROL === 'truncwrite') {
  /* Inverted for the same reason as the noindex control below: under this
     control section 17 is SUPPOSED to fail, so a clean section 17 is the bug.
     Without this the control just exits 1 like any other red run, and "the
     control went red" would be satisfied by a failure anywhere in the
     harness, which proves nothing about the write. */
  const caught = failuresAfter17 - failuresBefore17;
  const elsewhere = failuresBefore17 + (failures - failuresAfter17);
  if (caught > 0 && elsewhere === 0) {
    console.log(`simPrerender control: green. The pre 420 truncating write was reported (${caught} finding), so section 17 works.`);
    process.exit(0);
  }
  if (caught === 0) console.error('simPrerender control: RED. A truncating snapshot write went unreported, so section 17 proves nothing.');
  if (elsewhere > 0) console.error(`simPrerender control: RED. ${elsewhere} failure(s) outside section 17, which the control run must not hide.`);
  process.exit(1);
}
if (CONTROL === 'noindex') {
  /* Inverted on purpose: under the control section 14 is SUPPOSED to fail,
     so a clean section is the bug. Everything else has to stay clean, or a
     real failure could hide behind the control's expected one. */
  const caught = failuresAfter14 - failuresBefore14;
  const elsewhere = failuresBefore14 + (failures - failuresAfter14);
  if (caught === 1 && elsewhere === 0) {
    console.log('simPrerender control: green. The injected noindex was reported as exactly one finding, so section 14 works.');
    process.exit(0);
  }
  if (caught !== 1) console.error(`simPrerender control: RED. The injected noindex produced ${caught} findings, expected exactly one.`);
  if (elsewhere > 0) console.error(`simPrerender control: RED. ${elsewhere} failure(s) outside section 14, which the control run must not hide.`);
  process.exit(1);
}
if (CONTROL === 'replay') {
  const caught = failuresAfter15 - failuresBefore15;
  const elsewhere = failuresBefore15 + (failures - failuresAfter15);
  if (caught === 1 && elsewhere === 0) {
    console.log('simPrerender control: green. The disabled random replay gate was reported as exactly one finding.');
    process.exit(0);
  }
  if (caught !== 1) console.error(`simPrerender control: RED. The disabled random replay gate produced ${caught} findings, expected exactly one.`);
  if (elsewhere > 0) console.error(`simPrerender control: RED. ${elsewhere} failure(s) outside section 15, which the control run must not hide.`);
  process.exit(1);
}
if (CONTROL === 'port') {
  const caught = failuresAfter16 - failuresBefore16;
  const elsewhere = failuresBefore16 + (failures - failuresAfter16);
  if (caught === 1 && elsewhere === 0) {
    console.log('simPrerender control: green. The restored fixed port was reported as exactly one finding.');
    process.exit(0);
  }
  if (caught !== 1) console.error(`simPrerender control: RED. The restored fixed port produced ${caught} findings, expected exactly one.`);
  if (elsewhere > 0) console.error(`simPrerender control: RED. ${elsewhere} failure(s) outside section 16, which the control run must not hide.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simPrerender: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simPrerender: green. Every page answers with its own words, no JavaScript required.');
