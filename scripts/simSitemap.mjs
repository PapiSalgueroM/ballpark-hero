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

console.log('');
if (failures > 0) {
  console.error(`simSitemap: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSitemap: green. Google only ever hears about real pages.');
