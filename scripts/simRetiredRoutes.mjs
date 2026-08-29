/**
 * Round 272 harness: the retired routes must be signposts, not copies of the
 * home page.
 *
 * THE BASELINE THIS IS MEASURED AGAINST is the live site on 2026-08-22. All
 * eight retired addresses returned 200 with a body byte identical to the home
 * page and no canonical tag at all, because public/_redirects is not honored
 * by this host and the only redirect was the client side <Navigate>, which a
 * crawler finds only if it renders the page. The full measurement is written
 * at the top of scripts/genRetiredStubs.mjs.
 *
 * So the checks below are not "does a file exist". They are the specific
 * things that were wrong: the document is the home page, the title is the
 * home page's title, there is no canonical, and there is nothing in the HTML
 * that says where the address went.
 *
 * Run: node scripts/simRetiredRoutes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { readRoutes, ROOT, SITE } from './lib/retiredRoutes.mjs';
import { stubHtml } from './genRetiredStubs.mjs';

const PUBLIC = path.join(ROOT, 'public');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const { live, retired } = readRoutes();
const isLive = to => to === '/' || live.has(to);

/* The document these addresses serve today: the SPA shell, generated from the
   repo's index.html template. Everything below compares against it. */
const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const shellTitle = (shell.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim();
if (!shellTitle) fail('index.html has no title, so there is nothing to compare a stub against');

console.log(`0) ${retired.length} retired routes in App.tsx, ${live.size} live routes`);

/* -- 1: every retired route has its own document ------------------------ */
console.log('1) coverage');
const docs = new Map();
for (const r of retired) {
  const f = path.join(PUBLIC, r.from.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(f)) {
    fail(`${r.from} has no document in public/, so the host serves the home page there`);
    continue;
  }
  docs.set(r.from, fs.readFileSync(f, 'utf8'));
}
console.log(`   ${docs.size} of ${retired.length} retired routes have their own document`);

/* -- 2: the destination is stated three times and agrees three times ---- */
console.log('2) every stub names one destination, and it is a live page');
for (const r of retired) {
  const html = docs.get(r.from);
  if (!html) continue;
  const refresh = (html.match(/http-equiv="refresh"\s+content="0;\s*url=([^"]+)"/i) || [])[1];
  const canon = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) || [])[1];
  const anchor = (html.match(/<a\s+href="([^"]+)"/i) || [])[1];
  const wantCanon = `${SITE}${r.to === '/' ? '/' : r.to}`;

  if (refresh !== r.to) fail(`${r.from}: meta refresh says ${refresh}, App.tsx says ${r.to}`);
  if (canon !== wantCanon) fail(`${r.from}: canonical is ${canon}, expected ${wantCanon}`);
  if (anchor !== r.to) fail(`${r.from}: the visible link goes to ${anchor}, not ${r.to}`);
  if (!isLive(r.to)) fail(`${r.from} points at ${r.to}, which is not a live route in App.tsx`);
  if (retired.some(o => o.from === r.to)) fail(`${r.from} points at ${r.to}, which is itself retired: a redirect chain`);
}
console.log(`   refresh, canonical and visible link agree on all ${docs.size}`);

/* -- 3: THE OUTCOME. None of these is the home page any more. ----------- */
console.log('3) no retired route serves the home page document');
let sameDoc = 0, sameTitle = 0, noCanon = 0, noSignpost = 0;
for (const [from, html] of docs) {
  if (html === shell) { sameDoc += 1; fail(`${from} is byte identical to the home page shell, which is the defect this round fixes`); }
  const t = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim();
  if (t === shellTitle) { sameTitle += 1; fail(`${from} carries the home page's own title, so it reads as a duplicate of it`); }
  if (!/rel="canonical"/i.test(html)) { noCanon += 1; fail(`${from} has no canonical, so nothing tells a crawler where it went`); }
  if (!/http-equiv="refresh"/i.test(html)) { noSignpost += 1; fail(`${from} declares no redirect in its HTML, so only a rendering crawler can find one`); }
  /* A signpost is a signpost. If one of these ever grows into a real page it
     wants a route and a sitemap entry, not a stub. */
  if (html.length > 4000) fail(`${from} is ${html.length} bytes, which is a page rather than a signpost`);
}
console.log(`   ${docs.size} documents: ${sameDoc} identical to the shell, ${sameTitle} sharing its title, ${noCanon} with no canonical, ${noSignpost} with no declared redirect`);

/* -- 4: retired routes are not submitted and nothing links to them ------ */
console.log('4) not in the sitemap, not linked from anywhere shipped');
const sitemapFile = path.join(PUBLIC, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) {
  fail('public/sitemap.xml does not exist, run node scripts/genSitemap.mjs');
} else {
  const sitemap = fs.readFileSync(sitemapFile, 'utf8');
  const locs = new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map(m => m[1] || '/'));
  for (const r of retired) {
    if (locs.has(r.from)) fail(`${r.from} is retired and still in the sitemap, which is the "Page with redirect" failure`);
  }
  console.log(`   sitemap has ${locs.size} URLs and none of the ${retired.length} retired routes`);
}

const retiredSet = new Set(retired.map(r => r.from));
let inboundHits = 0;
for (const entry of fs.readdirSync(PUBLIC, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const from = `/${entry.name}`;
  if (retiredSet.has(from)) continue;              // a stub linking on is fine
  const f = path.join(PUBLIC, entry.name, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1].replace(/\/$/, '') || '/';
    if (retiredSet.has(href)) {
      inboundHits += 1;
      if (inboundHits <= 5) fail(`${from} links to ${href}, which is a retired route, so a crawler is being walked into a redirect`);
    }
  }
}
console.log(`   ${inboundHits} internal links point at a retired route`);

/* -- 5: the stubs on disk are the stubs the generator would write now --- */
console.log('5) stubs are current with App.tsx');
let stale = 0;
for (const r of retired) {
  const html = docs.get(r.from);
  if (!html) continue;
  /* Round 314: newline insensitive, because a Windows checkout with
     core.autocrlf rewrites the working copy to CRLF while the repo stays LF
     (git ls-files --eol showed i/lf w/crlf on this exact file), and a fence
     red over checkout settings on healthy content is a coin toss dressed as
     a rule. Everything else stays byte exact. */
  if (html.replace(/\r\n/g, '\n') !== stubHtml(r).replace(/\r\n/g, '\n')) {
    stale += 1;
    fail(`${r.from} on disk differs from what the generator produces now, run node scripts/genRetiredStubs.mjs`);
  }
}
console.log(`   ${docs.size - stale} of ${docs.size} current`);

console.log(failures ? `\nsimRetiredRoutes: ${failures} FAILURES` : '\nsimRetiredRoutes: all green');
process.exit(failures ? 1 : 0);
