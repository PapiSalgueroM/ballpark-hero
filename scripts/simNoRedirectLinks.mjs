/* No page this site ships sends a crawler to a URL that only bounces.
 *
 * Round 496. Search Console on 2026-09-06 read the sitemap clean (140 of 140)
 * and reported 58 indexed against 91 not, with three buckets behind the 91:
 * 71 "Discovered, currently not indexed", 17 "Crawled, currently not indexed",
 * and 3 "Page with redirect", that last one sitting on Validation FAILED.
 *
 * Measuring the shipped link graph to explain it ruled out the obvious theory
 * and found a real defect underneath.
 *
 * WHAT WAS RULED OUT, and it is worth writing down so nobody re-chases it: the
 * link structure is healthy. Over all 140 shipped documents there are no
 * orphans, every page carries at least 2 inbound links, and the deepest page in
 * the site is 3 clicks from home (the four grid archives, everything else is 1
 * or 2). So the 71 discovered-not-crawled pages are NOT starved of internal
 * links, and adding more links will not move them.
 *
 * WHAT WAS FOUND: index.html, the static home page copy block, linked to
 * /jeopardy. That route is a <Navigate> to /quiz-board. So the single most
 * crawled page on the domain spent one of its outbound votes on a URL that
 * exists only to bounce, which is the "Page with redirect" bucket exactly, and
 * the home page is not prerendered so that link is in the raw HTML every
 * crawler gets first.
 *
 * WHY EVERY EXISTING GUARD PASSED IT, which is the part worth keeping. Both
 * simInternalLinks (section 3) and simHomeCopy (section 3) check that an href
 * is "a real route in App.tsx", and both build that route set with
 * /path="([^"]+)"/ over App.tsx. A <Route path="/jeopardy" element={<Navigate
 * to="/quiz-board" />}> matches that regex. The guards were written against
 * DEAD links and a redirecting link is not dead, it is alive and pointed at the
 * wrong thing. A check written for a known offender does not find the next one.
 *
 * The route itself stays. /jeopardy is on the simNoRivalNames LIVE_IDENTIFIERS
 * allowlist because its localStorage prefix and its Supabase table cannot be
 * renamed without a migration, and an old bookmark should still land somewhere.
 * What changes is that nothing on the site VOTES for it any more. As a side
 * effect the home page no longer ships that word to a crawler at all.
 *
 * WHAT THIS HOLDS, over the documents that really ship:
 *   1. No shipped document links to a route that only redirects.
 *   2. No sitemap entry is a redirecting route.
 *   3. No redirect points at another redirect. A chain costs two fetches and
 *      Google gives up on long ones.
 *   4. The depth ceiling that was measured healthy stays healthy: nothing sits
 *      more than 4 clicks from home. Measured max today is 3, so the ceiling
 *      has one full step of headroom rather than sitting on the boundary.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   NO_REDIRECT_LINKS_CONTROL=relink rewrites /quiz-board back to /jeopardy in
 *     the home document in memory, reproducing exactly what shipped, so
 *     section 1 goes red.
 *   NO_REDIRECT_LINKS_CONTROL=nohome drops the home page's own outbound links
 *     before the walk, so section 4 goes red with pages stranded past the
 *     ceiling. It proves the walk is really following links and not just
 *     reading the sitemap back.
 *
 * Run: node scripts/simNoRedirectLinks.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const CONTROL = process.env.NO_REDIRECT_LINKS_CONTROL || '';
if (CONTROL && !['relink', 'nohome'].includes(CONTROL)) {
  console.error(`NO_REDIRECT_LINKS_CONTROL=${CONTROL} is not a control this harness knows (relink, nohome)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const norm = u => (u || '/').replace(/\/+$/, '') || '/';

/* the routes a crawler is told about */
const sitemapFile = path.join(PUBLIC, 'sitemap.xml');
if (!existsSync(sitemapFile)) {
  console.error('public/sitemap.xml is missing; run npm run build:seo first');
  process.exit(1);
}
const routes = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>\s*https?:\/\/[^/]+([^<]*)<\/loc>/g)]
  .map(m => norm(m[1]));
const routeSet = new Set(routes);

/* the routes that only bounce, and where each one bounces to */
const app = readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');
const redirects = new Map();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<Navigate\s+to="([^"]+)"/g)) {
  redirects.set(norm(m[1]), norm(m[2]));
}
console.log(`   ${routes.length} routes in the sitemap, ${redirects.size} redirect routes in App.tsx`);
if (redirects.size === 0) {
  fail('no redirect routes were parsed out of App.tsx, so this harness is checking nothing');
}

/* the outbound links of every document that really ships */
const docFor = r => (r === '/' ? path.join(ROOT, 'index.html') : path.join(PUBLIC, r.slice(1), 'index.html'));
const linksOf = new Map();
let noDoc = 0;
for (const r of routes) {
  const f = docFor(r);
  if (!existsSync(f)) { noDoc += 1; linksOf.set(r, []); continue; }
  let html = readFileSync(f, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  if (CONTROL === 'relink' && r === '/') html = html.replace(/href="\/quiz-board"/g, 'href="/jeopardy"');
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]*)"/g)) out.add(norm(m[1]));
  linksOf.set(r, [...out]);
}
if (noDoc > 0) fail(`${noDoc} sitemap routes have no shipped document`);

console.log('1) no shipped document links to a route that only redirects');
{
  let offences = 0;
  for (const [from, outs] of linksOf) {
    for (const to of outs) {
      if (!redirects.has(to)) continue;
      offences += 1;
      if (offences <= 8) {
        fail(`${from} links to ${to}, which is a redirect to ${redirects.get(to)}. Link to ${redirects.get(to)} directly.`);
      }
    }
  }
  if (offences > 8) fail(`and ${offences - 8} more redirect links`);
  console.log(`   ${offences} redirect link(s) across ${linksOf.size} shipped documents`);
  if (CONTROL === 'relink' && offences === 0) {
    console.error('   CONTROL relink changed nothing: the home document must contain a /quiz-board link to rewrite');
    process.exit(1);
  }
}

console.log('2) no sitemap entry is a redirecting route');
{
  const listed = routes.filter(r => redirects.has(r));
  listed.forEach(r => fail(`the sitemap lists ${r}, which redirects to ${redirects.get(r)}`));
  console.log(`   ${listed.length} redirecting route(s) listed`);
}

console.log('3) no redirect points at another redirect');
{
  let chains = 0;
  for (const [from, to] of redirects) {
    if (redirects.has(to)) { chains += 1; fail(`${from} redirects to ${to}, which redirects again to ${redirects.get(to)}`); }
    else if (!routeSet.has(to) && to !== '/') {
      fail(`${from} redirects to ${to}, which is not a page in the sitemap`);
    }
  }
  console.log(`   ${chains} chained redirect(s)`);
}

console.log('4) nothing sits more than 4 clicks from the home page');
{
  const CEILING = 4; /* measured max today is 3, so this keeps a full step of headroom */
  const depth = new Map([['/', 0]]);
  let frontier = ['/'];
  while (frontier.length) {
    const next = [];
    for (const cur of frontier) {
      const outs = (CONTROL === 'nohome' && cur === '/') ? [] : (linksOf.get(cur) || []);
      for (const to of outs) {
        if (!routeSet.has(to) || depth.has(to)) continue;
        depth.set(to, depth.get(cur) + 1);
        next.push(to);
      }
    }
    frontier = next;
  }
  const stranded = routes.filter(r => !depth.has(r));
  const deep = routes.filter(r => depth.has(r) && depth.get(r) > CEILING);
  const worst = Math.max(...routes.filter(r => depth.has(r)).map(r => depth.get(r)));
  stranded.slice(0, 8).forEach(r => fail(`${r} is in the sitemap but no chain of links from the home page reaches it`));
  if (stranded.length > 8) fail(`and ${stranded.length - 8} more unreachable pages`);
  deep.slice(0, 8).forEach(r => fail(`${r} is ${depth.get(r)} clicks from home, past the ceiling of ${CEILING}`));
  console.log(`   deepest reachable page: ${Number.isFinite(worst) ? worst : 'none'} clicks; ${stranded.length} unreachable, ${deep.length} past the ceiling`);
  if (CONTROL === 'nohome' && stranded.length === 0 && deep.length === 0) {
    console.error('   CONTROL nohome changed nothing: dropping the home page links must strand pages');
    process.exit(1);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimNoRedirectLinks: green. Every internal vote goes to a page that answers, not one that bounces.'
    : `\nsimNoRedirectLinks: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
