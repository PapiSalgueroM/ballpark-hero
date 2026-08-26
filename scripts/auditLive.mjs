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
 *   - a page with fewer readable characters than the home page's own static
 *     block, which is the "low value content" shape that got this site turned
 *     down for ads;
 *   - a page with no canonical, or one pointing somewhere else;
 *   - more than one canonical or description, which a reader resolves by taking
 *     the first and which cost this site 126 pages in Round 276;
 *   - anything that is not a 200.
 *
 * Redirects are NOT followed, on purpose. Following them reports the
 * destination's content under the source's name, which is the exact mistake
 * this is meant to catch.
 *
 *   node scripts/auditLive.mjs                  every URL in the sitemap
 *   node scripts/auditLive.mjs /a /b /c         just these
 *   BASE=https://example.com node scripts/auditLive.mjs
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

const argv = process.argv.slice(2).filter(a => a.startsWith('/'));
let routes = argv;
if (!routes.length) {
  const f = path.join(ROOT, 'public/sitemap.xml');
  if (!existsSync(f)) { console.error('no public/sitemap.xml and no routes given'); process.exit(1); }
  routes = [...new Set([...readFileSync(f, 'utf8').matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
    .map(m => (m[1] || '/').replace(/\/$/, '') || '/'))];
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

const problems = [];
let ok = 0;
for (const r of routes) {
  let res, body = '';
  try {
    res = await ctx.get(BASE + r, { maxRedirects: 0, timeout: 30000 });
    body = await res.text();
  } catch (e) {
    problems.push([r, `did not answer: ${String(e.message).slice(0, 60)}`]);
    continue;
  }
  const status = res.status();
  const text = readable(body);
  const canons = [...body.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g)].map(m => m[1]);
  const descs = [...body.matchAll(/<meta[^>]+name="description"[^>]*>/g)].length;
  const found = [];
  if (status !== 200) found.push(`answered ${status}`);
  if (r !== '/' && body === home) found.push('is byte identical to the home page');
  else if (r !== '/' && text.length <= homeReadable) found.push(`only ${text.length} readable characters, no more than the home page's own block`);
  if (!canons.length) found.push('has no canonical');
  else if (canons.length > 1) found.push(`has ${canons.length} canonicals, and a reader takes the first`);
  else if (canons[0] !== `${BASE}${r === '/' ? '/' : r}`) found.push(`canonicalises to ${canons[0].replace(BASE, '') || '/'}`);
  if (descs > 1) found.push(`has ${descs} descriptions`);
  if (found.length) problems.push([r, found.join('; ')]);
  else ok += 1;
}
await ctx.dispose();

for (const [r, what] of problems) console.log(`  ${r.padEnd(26)} ${what}`);
console.log('');
console.log(`${ok} of ${routes.length} answered cleanly, ${problems.length} did not.`);
process.exit(problems.length ? 1 : 0);
