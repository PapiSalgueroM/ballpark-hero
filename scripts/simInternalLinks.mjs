/**
 * Round 266 harness (number 113): no page a crawler can find is an island.
 *
 * WHY THIS EXISTS. The owner asked why Search Console was listing 82 pages as
 * not indexed. Most of that was the empty-shell problem Round 257 fixed, but
 * measuring the link graph while checking turned up a second, quieter one:
 * /leaderboard and /college were in the sitemap and had NOT ONE inbound link
 * from any of the 122 documents a crawler can actually read. That is exactly
 * the shape behind "discovered, currently not indexed": Google knows the
 * address because the sitemap named it, and nothing anywhere on the site
 * argues it is worth having. A sitemap entry is a suggestion; a link is a
 * vote.
 *
 * WHAT IT MEASURES, over the files that really ship:
 *
 *   1. NO ORPHANS. Every route in the sitemap must be linked from at least
 *      one other crawlable document. This is the check the round was built
 *      for and it is the one that must never go back to failing quietly.
 *   2. NO PAGE IS A DEAD END. Every document must link out to a useful number
 *      of other real pages, so a crawler arriving anywhere can keep going.
 *   3. EVERY LINK GOES SOMEWHERE REAL. An internal href that is not a route
 *      in App.tsx is a crawl budget leak and a bad user experience.
 *   4. THE HUBS STAY WELL CONNECTED. The pages that exist to gather other
 *      pages together are worth more than one vote each, so they are held to
 *      a higher floor than the minimum.
 *
 * It reads the SHIPPED documents (public/<route>/index.html plus index.html
 * for the home page), not the React source, because the question is what a
 * crawler receives and not what the app would render if it ran.
 *
 * Run: node scripts/simInternalLinks.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const sitemapPath = path.join(DIST, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  console.log('NO dist/sitemap.xml. BUILD FIRST. NOT CHECKED.');
  process.exit(1);
}
const routes = [...new Set(
  [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
    .map(m => m[1] || '/')
    .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r)),
)];

/* the home page is served from the template, every other route from its
   prerendered snapshot: exactly what the host serves */
const docs = [];
const homeHtml = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
docs.push(['/', homeHtml]);
for (const r of routes) {
  if (r === '/') continue;
  const f = path.join(PUBLIC, r.replace(/^\//, ''), 'index.html');
  if (existsSync(f) && statSync(f).isFile()) docs.push([r, readFileSync(f, 'utf8')]);
}
console.log(`1) ${docs.length} crawlable documents against ${routes.length} sitemap routes`);
if (docs.length < routes.length) {
  fail(`${routes.length - docs.length} sitemap routes have no shipped document, so they cannot link anywhere`);
}

const routeSet = new Set(routes);
const appRoutes = new Set(
  [...readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8').matchAll(/path="([^"]+)"/g)].map(m => m[1]),
);
const inbound = new Map(routes.map(r => [r, new Set()]));
const outbound = new Map();
let deadLinks = 0;

for (const [from, html] of docs) {
  const hrefs = [...new Set(
    [...html.matchAll(/href="(\/[^"#?]*)"/g)]
      .map(m => (m[1].endsWith('/') && m[1] !== '/' ? m[1].slice(0, -1) : m[1])),
  )];
  let out = 0;
  for (const h of hrefs) {
    /* 3: an internal link that is not a route is a leak. Static assets are
       not links in this sense, so anything with a file extension is skipped. */
    if (/\.[a-z0-9]{2,5}$/i.test(h)) continue;
    if (!appRoutes.has(h)) {
      deadLinks += 1;
      if (deadLinks <= 5) fail(`${from} links to ${h}, which is not a route in App.tsx`);
      continue;
    }
    if (routeSet.has(h) && h !== from) { inbound.get(h).add(from); out += 1; }
  }
  outbound.set(from, out);
}

/* ── 1: no orphans ────────────────────────────────────────────────────── */
console.log('2) every sitemap route is linked from somewhere');
const orphans = [...inbound.entries()].filter(([, s]) => s.size === 0).map(([r]) => r);
for (const o of orphans) {
  fail(`${o} is in the sitemap and NOTHING crawlable links to it, which is how a page gets discovered and never indexed`);
}
const counts = [...inbound.values()].map(s => s.size).sort((a, b) => a - b);
console.log(`   ${orphans.length} orphans, thinnest linked route has ${counts[0]} inbound, median ${counts[Math.floor(counts.length / 2)]}`);

/* ── 4: the hubs ──────────────────────────────────────────────────────── */
console.log('3) the pages that exist to gather other pages');
/* These are the site's own hubs and standing pages. They are reachable from
   the footer, which is on every document, so their floor is high on purpose:
   if one drops out of the footer this is what notices. */
const HUBS = ['/records', '/whats-new', '/about', '/contact', '/privacy', '/terms', '/leaderboard', '/college'];
for (const h of HUBS) {
  if (!routeSet.has(h)) { fail(`${h} is not in the sitemap at all`); continue; }
  const n = inbound.get(h).size;
  /* measured: a footer link puts a page on every one of the 122 documents,
     so the floor is set well below that and still far above an accident */
  if (n < 50) fail(`${h} has only ${n} inbound links, so it is not in the footer any more`);
}
console.log(`   ${HUBS.length} hubs, every one linked from most of the site`);

/* ── 2: no dead ends ──────────────────────────────────────────────────── */
console.log('4) no page is a dead end');
const outs = [...outbound.values()].sort((a, b) => a - b);
const worst = [...outbound.entries()].sort((a, b) => a[1] - b[1])[0];
console.log(`   outbound links: min ${outs[0]} (${worst[0]}), median ${outs[Math.floor(outs.length / 2)]}, max ${outs[outs.length - 1]}`);
/* measured 2026-08-22 across all 122 documents: min 10, median 19, max 20.
   The floor is at half the measured minimum, because what this catches is a
   page that stops linking anywhere at all, not one that links a bit less. */
for (const [r, n] of outbound) {
  if (n < 5) fail(`${r} links to only ${n} other pages, so a crawler arriving there has nowhere to go`);
}
if (deadLinks > 5) fail(`${deadLinks} internal links point at routes that do not exist`);

console.log('');
if (failures > 0) {
  console.error(`simInternalLinks: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simInternalLinks: green. Every page can be reached, and every page leads somewhere.');
