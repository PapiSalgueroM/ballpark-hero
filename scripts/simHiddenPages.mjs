/**
 * Round 278: every page this site does not want indexed says so in its HTML.
 *
 * WHAT WAS WRONG. Nine live routes are deliberately kept out of the sitemap and
 * every one of them asks not to be indexed: /football-timeline, /admin/login,
 * /admin/reports, /profile, /reset-password, /guess-nfl-team, /shirt-number,
 * /higher-lower-transfers, /pack-battle. None had a saved copy, on the
 * documented grounds that a page you do not want indexed should not be
 * prerendered. That was correct when written, because a route with no snapshot
 * served an empty shell.
 *
 * Round 257 then moved the home page's content into that shell. Nine harmless
 * empty addresses became nine copies of the home page, and the noindex only
 * appeared after JavaScript ran. Against Search Console on 2026-08-23,
 * /guess-nfl-team was sitting in "Crawled, currently not indexed", last looked
 * at in April: an address serving somebody else's content and declaring
 * nothing. The clean status for a page you do not want indexed is "excluded by
 * noindex tag", which is a different bucket from the one that holds real
 * problems.
 *
 * A decision does not have to be wrong when it is made to be wrong later. This
 * harness exists because nothing connected the rule to the round that
 * invalidated it.
 *
 * Run: node scripts/simHiddenPages.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hiddenRoutes } from './genHiddenStubs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const routes = hiddenRoutes();
console.log(`0) ${routes.length} live routes that are not submitted and ask not to be indexed`);
if (routes.length < 5) fail(`only ${routes.length} hidden routes found, which means the reader stopped working rather than the site changing that much`);

/* ── 1: each one answers for itself ────────────────────────────────────── */
console.log('1) every one of them has a document');
const docs = new Map();
for (const r of routes) {
  const f = path.join(PUBLIC, r.replace(/^\//, ''), 'index.html');
  if (!existsSync(f)) { fail(`${r} has no document, so the host serves the home page there`); continue; }
  docs.set(r, readFileSync(f, 'utf8'));
}
console.log(`   ${docs.size} of ${routes.length}`);

/* ── 2: and what it says is do not index me ────────────────────────────── */
console.log('2) each one declares noindex in the HTML, before any JavaScript runs');
for (const [r, html] of docs) {
  const m = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/);
  if (!m) { fail(`${r} carries no robots tag, so the noindex only exists once the app has run`); continue; }
  if (!/noindex/.test(m[1])) fail(`${r} says robots=${m[1]}, which does not include noindex`);
}
console.log(`   ${docs.size} documents, all declaring it`);

/* ── 3: THE OUTCOME. None of them is the home page. ────────────────────── */
/* This is the defect, stated exactly. Before Round 278 all nine served the SPA
   fallback, which since Round 257 carries the home page's static block. */
console.log('3) none of them is a copy of the home page');
const shell = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const shellTitle = (shell.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim();
for (const [r, html] of docs) {
  if (html === shell) fail(`${r} is byte identical to the home page shell`);
  const t = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim();
  if (t === shellTitle) fail(`${r} carries the home page's title, so the app navigated away while it was being photographed`);
  const canon = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/) || [])[1];
  if (canon && canon !== `https://douknowball.com${r}`) {
    fail(`${r} canonicalises to ${canon}, which is not itself`);
  }
}
console.log(`   ${docs.size} documents, none of them the home page`);

/* ── 4: still not submitted, and still not pinned to one build ─────────── */
console.log('4) not in the sitemap, and no hashed paths in the committed copy');
const sitemapFile = path.join(PUBLIC, 'sitemap.xml');
if (existsSync(sitemapFile)) {
  const sitemap = readFileSync(sitemapFile, 'utf8');
  for (const r of routes) {
    if (sitemap.includes(`<loc>https://douknowball.com${r}</loc>`)) {
      fail(`${r} asks not to be indexed and is in the sitemap, which are two opposite instructions`);
    }
  }
}
let hashed = 0;
for (const [r, html] of docs) {
  if (/(?:src|href)="\/assets\//.test(html)) { hashed += 1; fail(`${r} carries a hashed asset path, which goes stale on the next build`); }
}
console.log(`   none submitted, ${hashed} with a hashed path`);

console.log('');
if (failures > 0) {
  console.error(`simHiddenPages: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simHiddenPages: green. Every page we keep out of Google says so itself.');
