/**
 * Round 148 harness: the sitemap can never lie to Search Console again.
 *
 * Born from the owner's 2026-08-17 screenshots: "Page with redirect,
 * validation failed" on three pages, because the hand-generated r54 sitemap
 * kept submitting routes that had become redirects, and had also never
 * heard of games shipped after it. Three permanent rules, asserted against
 * the REAL files on every suite run:
 *
 *   1. No sitemap URL may be a <Navigate> redirect route in App.tsx.
 *      (The exact Search Console failure.)
 *   2. Every game in the registry is in the sitemap. (A new game cannot be
 *      silently invisible to Google, the way Stadium Tycoon briefly was.)
 *   3. Every sitemap URL has a real route. (No 404s submitted either.)
 *
 * Run: node scripts/simSitemap.mjs
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const xml = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');

const urls = [...xml.matchAll(/<loc>https:\/\/douknowball\.com([^<]*)<\/loc>/g)].map(m => m[1] || '/');
const redirects = new Set();
const liveRoutes = new Set();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element={\s*(<Navigate\b)?/g)) {
  if (m[1].includes(':') || m[1] === '*') continue;
  (m[2] ? redirects : liveRoutes).add(m[1]);
}

const ENTRY = '/tmp/simSitemapEntry.mjs';
const BUNDLE = '/tmp/simSitemap.bundle.mjs';
fs.writeFileSync(ENTRY, `
const reg = await import('${ROOT}/src/data/gameRegistry.ts');
export const paths = (reg.ALL_GAMES ?? reg.CATEGORIES.flatMap(c => c.games)).map(g => g.path);
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { paths: gamePaths } = await import(BUNDLE);

console.log('1) Sanity: the three sources parsed');
console.log(`   ${urls.length} sitemap URLs, ${liveRoutes.size} live routes, ${redirects.size} redirect routes, ${gamePaths.length} registry games`);
if (urls.length < 100) fail(`the sitemap shrank to ${urls.length} URLs`);
if (new Set(urls).size !== urls.length) fail('duplicate URLs in the sitemap');
if (!redirects.size) fail('no redirect routes parsed from App.tsx, the parser broke');
if (gamePaths.length < 90) fail(`only ${gamePaths.length} games parsed from the registry`);

console.log('2) No submitted URL is a redirect');
{
  const offenders = urls.filter(u => redirects.has(u));
  if (offenders.length) fail(`redirect routes in the sitemap: ${offenders.join(', ')}`);
  else console.log('   clean, the Search Console failure cannot recur from here');
}

console.log('3) Every registry game is submitted');
{
  const set = new Set(urls);
  const missing = gamePaths.filter(p => !set.has(p));
  if (missing.length) fail(`games missing from the sitemap: ${missing.join(', ')}`);
  else console.log(`   all ${gamePaths.length} games present, including the newest`);
}

console.log('4) Every submitted URL has a real route');
{
  const missing = urls.filter(u => u !== '/' && !liveRoutes.has(u));
  if (missing.length) fail(`sitemap URLs with no route: ${missing.join(', ')}`);
  else console.log('   no orphans submitted');
}

console.log('5) every lastmod is a claim the shipped files back up');
/* ROUND 280. Until this round every row carried the same lastmod, the day the
   generator last ran, so the file asserted that all 127 pages changed on the
   same day, every single time it was regenerated. Google's sitemap
   documentation says the value has to be consistently and verifiably accurate
   and that they may ignore it entirely where it is not, which is the correct
   response to a file that cries wolf 127 times at once, and it costs this site
   the only re-crawl hint it has while pages sit in "Crawled, currently not
   indexed" having last been looked at in April.

   The generator now derives each date from a hash of the page's own shipped
   text and links, kept in scripts/data/lastmod.json. These three checks are
   about the property that makes the claim worth making: every date is backed
   by a recorded hash, that hash is the one the shipped file actually has, and
   no date is in the future. What this deliberately does NOT do is require the
   dates to be spread out. A round that genuinely rewrites every page, which is
   exactly what this one does, is entitled to stamp every page with today. The
   defect was never "all the dates match", it was "the dates are asserted rather
   than derived", and a check on the spread would fire on honest work. */
{
  const LEDGER = path.join(ROOT, 'scripts/data/lastmod.json');
  if (!fs.existsSync(LEDGER)) {
    fail('scripts/data/lastmod.json is missing, so every lastmod in the sitemap is an unbacked assertion');
  } else {
    const rawLedger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    /* __version records which reduction the hashes were computed with, so a
       change to the algorithm holds every date instead of claiming the whole
       site changed. It is not a route. */
    const ledger = Object.fromEntries(Object.entries(rawLedger).filter(([k]) => k !== '__version'));
    if (!rawLedger.__version) fail('the ledger carries no fingerprint version, so an algorithm change would silently re-date the whole site');
    const rows = [...xml.matchAll(/<loc>https:\/\/douknowball\.com([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod>/g)]
      .map(m => ({ route: m[1] || '/', date: m[2] }));
    if (rows.length !== urls.length) fail(`${urls.length} URLs but only ${rows.length} carry a lastmod`);
    const today = new Date().toISOString().slice(0, 10);
    let unbacked = 0, mismatched = 0, future = 0, malformed = 0;
    for (const { route, date } of rows) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { malformed += 1; fail(`${route} has a lastmod that is not a date: ${JSON.stringify(date)}`); continue; }
      if (date > today) { future += 1; fail(`${route} claims it was modified on ${date}, which has not happened yet`); }
      const entry = ledger[route];
      if (!entry) { unbacked += 1; if (unbacked <= 3) fail(`${route} has a lastmod with no entry in the ledger behind it`); continue; }
      if (entry.date !== date) { mismatched += 1; if (mismatched <= 3) fail(`${route} says ${date} but the ledger recorded ${entry.date}`); }
    }
    /* And the ledger's own hashes have to match the files on disk, or the dates
       are backed by a record of some other version of the site. Recomputed here
       with an independent copy of the reduction rather than by importing the
       generator's, so a bug in that function cannot agree with itself. */
    let stale = 0, unreadable = 0;
    for (const [route, entry] of Object.entries(ledger)) {
      if (!entry.hash) continue;
      const file = route === '/'
        ? path.join(ROOT, 'index.html')
        : path.join(ROOT, 'public', route.replace(/^\//, ''), 'index.html');
      let html;
      try { html = fs.readFileSync(file, 'utf8'); } catch { unreadable += 1; continue; }
      const marker = route === '/' ? '<div id="root">' : 'id="dukb-snapshot"';
      const i2 = html.indexOf(marker);
      const body = i2 < 0 ? html : html.slice(i2);
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '';
      const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
      const text = body
        .replace(/<script[\s\S]*?<\/script>/g, ' ')
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g, ' [$1] ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      /* Round 281: the structured data is part of the fingerprint now, because a
         page gaining a rich result it never had is a change a crawler should
         come back for. Normalised the same way, keys sorted and blocks sorted,
         so formatting cannot masquerade as content. Written out again here
         rather than imported, on purpose: a bug in the generator's reduction
         must not be able to agree with itself. */
      const sortDeep = v => Array.isArray(v)
        ? v.map(sortDeep)
        : (v && typeof v === 'object'
            ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])]))
            : v);
      const ld = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
        .map(m => { try { return JSON.stringify(sortDeep(JSON.parse(m[1]))); } catch { return m[1].replace(/\s+/g, ' ').trim(); } })
        .sort()
        .join('\n');
      const fp = createHash('sha256').update(`${title}\n${desc}\n${text}\n${ld}`).digest('hex').slice(0, 16);
      if (fp !== entry.hash) { stale += 1; if (stale <= 3) fail(`${route}: the shipped file no longer matches the hash its lastmod was recorded against, so the sitemap is dating the wrong version`); }
    }
    console.log(`   ${rows.length} rows, ${Object.keys(ledger).length} ledger entries, ${unbacked} unbacked, ${mismatched} disagreeing, ${stale} pointing at a version that has been rewritten, ${future} in the future`);
    if (unreadable) console.log(`   ${unreadable} ledger entries have no file to check, which is normal only for a route that has just been retired`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simSitemap: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSitemap: green. Google only ever hears about real pages.');
