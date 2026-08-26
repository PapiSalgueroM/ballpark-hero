/**
 * Round 198 browser harness: what a crawler actually receives.
 *
 * simIndexing reads the source. This reads the RENDERED head, because the
 * head is built by Helmet at runtime and a source-level check cannot tell
 * you whether the tag ever reached the document. It walks a spread of real
 * pages and asserts, on each one, the four things a crawler needs: a
 * unique title, a description, a self-referencing canonical, and exactly
 * one h1. Then it checks the two sides of this round's decision: an
 * indexable page carries NO robots meta, and a retired or private page
 * carries "noindex, follow" and no Game structured data.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playIndexing.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

/* A spread, not everything: the home page, a big sim, a daily game, the
   hub this round rescued, and the legal pages, plus one of each kind of
   page that must NOT be indexed. */
const INDEXABLE = ['/', '/club-manager', '/stadium-tycoon', '/soccer-career', '/college', '/leaderboard', '/whats-new', '/about', '/privacy'];
const HIDDEN = ['/shirt-number', '/pack-battle', '/guess-nfl-team', '/reset-password'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
/* Round 274: Supabase is unreachable outside a browser with egress, and its
     requests then HANG rather than fail, so waitUntil networkidle can never be
     reached and this harness timed out at 30 seconds before asserting anything.
     Measured: / had 6 requests still open, /records 10, all of them Supabase.
     It is not only a sandbox problem: the daily legend hook opens a realtime
     websocket, and an open socket means a page that mounts it can never be
     network idle anywhere. Aborting is closer to what an offline visitor gets
     than hanging is, and it makes this harness deterministic. */
  await page.route('**://*.supabase.co/**', r => r.abort());
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

async function head(pathname) {
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    h1: document.querySelectorAll('h1').length,
    ld: document.querySelectorAll('script[type="application/ld+json"]').length,
    /* ROUND 281: count the objects that are ABOUT THIS PAGE, separately from
       the site level ones. Until this round every ld+json block on a page was a
       page level claim, so a bare count answered both questions. Now index.html
       carries a WebSite, an Organization and a WebApplication, each with an @id
       naming the site root, in the raw HTML of every document, because that is
       what ties 127 pages to one entity and because the home page cannot add it
       at runtime. Those are claims about the site, true on every page of it, and
       counting them as "this page advertising itself" made the hidden page rule
       below fail on four pages that are behaving perfectly. */
    pageLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .flatMap(el => { try { const j = JSON.parse(el.textContent); return Array.isArray(j) ? j : [j]; } catch { return [{ '@type': 'INVALID' }]; } })
      .filter(o => !/#(website|org|webapp)$/.test(String(o['@id'] ?? '')))
      .map(o => o['@type']),
    og: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
  }));
}

console.log('1) Every indexable page hands a crawler a complete head');
const titles = new Map();
for (const p of INDEXABLE) {
  const h = await head(p);
  /* The home page's canonical carries its trailing slash, and since Round
     198 the sitemap submits the same string, so the two agree exactly. */
  const ok = h.title && h.title.length > 10 && h.desc && h.desc.length > 30
    && h.canonical === `https://douknowball.com${p}` && !h.robots;
  say(ok, `${p}: ${JSON.stringify(h.title ?? '').slice(0, 46)} canonical=${h.canonical} robots=${h.robots ?? 'none'}`);
  say(h.h1 === 1, `${p}: exactly one h1 (${h.h1})`);
  say(h.ld >= 1 && !!h.og, `${p}: structured data and social tags present`);
  if (h.title) titles.set(p, h.title);
}
say(new Set(titles.values()).size === titles.size, `every walked page has its own title (${new Set(titles.values()).size} of ${titles.size})`);

console.log('2) Every hidden page says noindex, and stops advertising itself');
for (const p of HIDDEN) {
  const h = await head(p);
  say(h.robots === 'noindex, follow', `${p}: robots is ${h.robots ?? 'MISSING'}`);
  say(h.canonical === `https://douknowball.com${p}`, `${p}: keeps its self canonical`);
  /* The rule Round 198 wrote is that a page told not to rank has no business
     advertising ITSELF in structured data. The site level trio is not that: it
     names the site root, it is identical on all 130 documents, and no per route
     switch can remove it from a file the build writes once. So this asserts on
     the page level objects only, which is what the rule was always about. */
  say(h.pageLd.length === 0, `${p}: nothing advertising this page itself (${h.pageLd.join(', ') || 'nothing'})`);
}

console.log('3) The crawl instructions themselves');
{
  const res = await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const body = await page.evaluate(() => document.body.innerText);
  say(res.status() === 200, `robots.txt serves (${res.status()})`);
  say(/Sitemap: https:\/\/douknowball\.com\/sitemap\.xml/.test(body), 'robots.txt points at the sitemap');
  say(/Disallow: \/admin\//.test(body), 'robots.txt keeps crawlers out of the admin screens');
  const sm = await page.goto(`${BASE}/sitemap.xml`, { waitUntil: 'domcontentloaded' });
  const xml = await page.evaluate(() => document.documentElement.textContent ?? '');
  say(sm.status() === 200, `sitemap.xml serves (${sm.status()})`);
  say(xml.includes('douknowball.com/college'), 'the college hub is in the served sitemap');
  say(xml.includes('<loc>https://douknowball.com/</loc>'), 'the root is submitted with the same trailing slash its canonical uses');
  for (const p of HIDDEN) {
    say(!xml.includes(`douknowball.com${p}<`), `${p} is not submitted`);
  }
}

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
await page.close();
await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playIndexing: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playIndexing: green. A crawler gets a complete head on every page that wants one.');
