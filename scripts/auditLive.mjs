/**
 * Round 279: ask the LIVE site what a crawler gets, one URL at a time, and say
 * which answers are wrong.
 *
 * WHY THIS EXISTS. Search Console tells you a page is not indexed. It does not
 * tell you what the page is currently serving, and the reason it gives is often
 * a verdict from months ago. Every time that question has come up in this
 * project it has been answered by hand-building a probe, and every time the
 * hand-built version has had a flaw worth catching: one served the committed
 * snapshot instead of the shipped one, another followed redirects and reported
 * the destination's content under the source's name.
 *
 * MEASURED with this on 2026-08-23, against the ten URLs in Anthony's
 * "Crawled, currently not indexed" list. Seven answered with 4,300 to 5,700
 * readable characters, their own title and their own canonical: healthy, and
 * the old verdict was passed when they served an empty shell. Three answered
 * with the HOME PAGE, 1,760 characters, no canonical of their own:
 * /football-draft, /guess-soccer-club and /guess-nfl-team. All three are fixed
 * in the queue (Rounds 272 and 278) and none of it is live yet.
 *
 * WHAT IT FLAGS, and each is a real defect rather than a style note:
 *   - a page whose body is byte identical to the home page, which means the
 *     address is answering with somebody else's content;
 *   - a page whose own readable text is not meaningfully larger than the text
 *     every page shares (the header, the nav, the footer), which is the "low
 *     value content" shape that got this site turned down for ads;
 *   - a page with no canonical, or one pointing somewhere else;
 *   - more than one canonical or description, which a reader resolves by taking
 *     the first and which cost this site 126 pages in Round 276;
 *   - anything that is not a 200.
 *
 * Redirects are NOT followed, on purpose. Following them reports the
 * destination's content under the source's name, which is the exact mistake
 * this is meant to catch.
 *
 * THE THIN BAR IS MEASURED, NEVER HARD CODED, since 2026-08-29. The first
 * version compared every page against the whole home document, which was
 * 1,760 readable characters when that was written and 5,051 once rounds 280
 * plus grew the home copy, so on 2026-08-28 it flagged 101 healthy pages,
 * each serving 2,000 to 4,900 characters of its own. A bar written down as a
 * number, or as a proxy that grows for its own reasons, goes stale the same
 * way. What "thin" actually means here is a page carrying nothing beyond the
 * chrome every page shares, so that is what gets measured: per word, the
 * count at least nine in ten of the audited pages reach, summed. The nine in
 * ten quantile rather than a strict intersection because one broken empty
 * page zeroes an intersection and thereby masks itself (measured 2026-08-29:
 * intersection 909, then 0 with one empty page added; quantile 1,166, then
 * 1,140). Measured that day against all 130 live pages: chrome 1,166, and
 * 1,108 to 1,168 across different 24 page samples; the smallest healthy page
 * (/contact) at 1.73 times chrome, every other page at 2.68 times or more; a
 * page serving only the chrome sits at about 1.0 to 1.15 times. The multiple
 * 1.4 is the middle of that gap, roughly 25 percent measured headroom on
 * each side.
 *
 *   node scripts/auditLive.mjs                  every URL in the sitemap
 *   node scripts/auditLive.mjs /a /b /c         just these
 *   BASE=https://example.com node scripts/auditLive.mjs
 *   AUDIT_CONTROL=thin node scripts/auditLive.mjs
 *       negative control: plants, on one page that really passes, the
 *       measurement a chrome only page would give. It refuses to run if that
 *       page would have failed anyway, so a red run proves the plant flipped
 *       a passing page, and the run MUST go red.
 *
 * It talks to the internet, so runAllSims never runs it: it is a tool for
 * answering a question about the live site, not a guard on the repo.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'https://douknowball.com';

const readable = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/* The chrome is the readable text the pages share: per word, the count at
   least nine in ten of the sampled pages reach. See the header for why a
   quantile and not a strict intersection, and for where 1.4 comes from. */
const THIN_MULTIPLE = 1.4;
const MIN_CHROME_SAMPLE = 10;
const wordCounts = t => {
  const m = new Map();
  for (const w of t.split(' ')) m.set(w, (m.get(w) || 0) + 1);
  return m;
};
const sharedChrome = texts => {
  const maps = texts.map(wordCounts);
  const idx = Math.floor(maps.length / 10);
  const union = new Set();
  for (const m of maps) for (const w of m.keys()) union.add(w);
  let len = 0;
  for (const w of union) {
    const per = maps.map(m => m.get(w) || 0).sort((a, b) => a - b);
    if (per[idx] > 0) len += (w.length + 1) * per[idx];
  }
  return len;
};

const sitemapRoutes = () => {
  const f = path.join(ROOT, 'public/sitemap.xml');
  if (!existsSync(f)) return null;
  return [...new Set([...readFileSync(f, 'utf8').matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
    .map(m => (m[1] || '/').replace(/\/$/, '') || '/'))];
};

const argv = process.argv.slice(2).filter(a => a.startsWith('/'));
let routes = argv;
if (!routes.length) {
  routes = sitemapRoutes();
  if (!routes) { console.error('no public/sitemap.xml and no routes given'); process.exit(1); }
}

const ctx = await request.newContext({
  extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
});

/* The home page is the yardstick: it is the document every unrouted and
   unsnapshotted address answers with, so "identical to this" is the precise
   statement of the fault, not a guess at one. */
let home = '', homeReadable = 0;
try {
  home = await (await ctx.get(BASE + '/', { maxRedirects: 0, timeout: 30000 })).text();
  homeReadable = readable(home).length;
} catch { /* reported per route below */ }
console.log(`${BASE} home page: ${homeReadable} readable characters. Checking ${routes.length} routes.\n`);

const pages = [];
for (const r of routes) {
  let res, body = '';
  try {
    res = await ctx.get(BASE + r, { maxRedirects: 0, timeout: 30000 });
    body = await res.text();
  } catch (e) {
    pages.push({ r, found: [`did not answer: ${String(e.message).slice(0, 60)}`], thinEligible: false });
    continue;
  }
  const status = res.status();
  const text = readable(body);
  const canons = [...body.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g)].map(m => m[1]);
  const descs = [...body.matchAll(/<meta[^>]+name="description"[^>]*>/g)].length;
  const found = [];
  if (status !== 200) found.push(`answered ${status}`);
  const identical = r !== '/' && body === home;
  if (identical) found.push('is byte identical to the home page');
  if (!canons.length) found.push('has no canonical');
  else if (canons.length > 1) found.push(`has ${canons.length} canonicals, and a reader takes the first`);
  else if (canons[0] !== `${BASE}${r === '/' ? '/' : r}`) found.push(`canonicalises to ${canons[0].replace(BASE, '') || '/'}`);
  if (descs > 1) found.push(`has ${descs} descriptions`);
  pages.push({ r, found, text, thinEligible: r !== '/' && status === 200 && !identical });
}

/* The chrome sample. In a full run the audited pages are the sample. In a
   spot probe of a few routes they are not enough to measure what "every
   page" shares, so a spread of sitemap pages is fetched for measurement
   only, against the same BASE. */
let chromeSample;
if (!argv.length) {
  chromeSample = pages.filter(p => p.thinEligible).map(p => p.text);
} else {
  chromeSample = [];
  const all = (sitemapRoutes() || []).filter(r => r !== '/');
  const k = Math.min(24, all.length);
  for (let i = 0; i < k; i++) {
    const r = all[Math.floor(i * all.length / k)];
    try {
      const res = await ctx.get(BASE + r, { maxRedirects: 0, timeout: 30000 });
      const body = await res.text();
      if (res.status() === 200 && body !== home) chromeSample.push(readable(body));
    } catch { /* a failed sample page just shrinks the sample */ }
  }
}
await ctx.dispose();

const CONTROL = process.env.AUDIT_CONTROL === 'thin';
if (chromeSample.length >= MIN_CHROME_SAMPLE) {
  const chrome = sharedChrome(chromeSample);
  const bar = Math.round(chrome * THIN_MULTIPLE);
  console.log(`shared chrome measured at ${chrome} readable characters over ${chromeSample.length} pages, thin bar ${bar} (chrome times ${THIN_MULTIPLE}).\n`);
  let target = null;
  if (CONTROL) {
    /* The plant only proves something if the page it lands on would have
       passed. A control that reddens an already failing page shows nothing. */
    target = pages.find(p => p.thinEligible);
    if (!target || target.text.length <= bar) {
      console.error(`CONTROL refused: ${target ? `${target.r} really measures ${target.text.length}, at or under the bar of ${bar},` : 'no page was eligible for the thin rule,'} so a plant would prove nothing.`);
      process.exit(2);
    }
    console.log(`CONTROL: ${target.r} really measures ${target.text.length} and passes the bar of ${bar}. Planting ${chrome} in its place, the measurement a page serving nothing but the chrome would give. This run must go red.\n`);
  }
  for (const p of pages) {
    if (!p.thinEligible) continue;
    const len = p === target ? chrome : p.text.length;
    if (len <= bar) p.found.push(`only ${len} readable characters, not meaningfully more than the ${chrome} every page shares as chrome${p === target ? ' (CONTROL plant)' : ''}`);
  }
  if (CONTROL && !target.found.some(f => f.includes('CONTROL plant'))) {
    console.error('CONTROL failed: the planted chrome only measurement did not turn the thin rule red. The rule is broken.');
    process.exit(2);
  }
} else {
  console.log(`thin rule skipped: only ${chromeSample.length} usable pages to measure the shared chrome, ${MIN_CHROME_SAMPLE} needed.\n`);
  if (CONTROL) {
    console.error('CONTROL refused: the thin rule did not run, so there is nothing to prove.');
    process.exit(2);
  }
}

const problems = pages.filter(p => p.found.length).map(p => [p.r, p.found.join('; ')]);
const ok = pages.length - problems.length;

for (const [r, what] of problems) console.log(`  ${r.padEnd(26)} ${what}`);
console.log('');
console.log(`${ok} of ${routes.length} answered cleanly, ${problems.length} did not.`);
process.exit(problems.length ? 1 : 0);
