/**
 * ROUND 281 HARNESS: the structured data on every shipped page is true, and it
 * reaches the crawler.
 *
 * TWO DEFECTS, BOTH MEASURED ON THE SHIPPED FILES BEFORE ANYTHING WAS CHANGED.
 *
 * ONE: THIRTEEN PAGES SAID THEY WERE VIDEO GAMES. PageSeo emitted one shape for
 * the home page and @type Game for everything else, so the privacy policy, the
 * terms, the about page, the contact page, the record books, the world
 * leaderboard, the changelog and all six sport hubs each declared themselves a
 * Game in machine readable terms. Google's structured data guidelines say the
 * markup has to describe the page's main content; markup that does not is
 * ignored at best, and a privacy policy claiming to be a game is exactly the
 * shape of thing that reads as low quality on a domain that has already been
 * turned down once for low value content.
 *
 * TWO: THE FAQ AND BREADCRUMB MARKUP REACHED NOBODY. Both were built correctly
 * and both were rendered in the BODY, and since Round 256 a snapshot keeps the
 * head verbatim and rebuilds the body from readable content only. A script tag
 * is not readable content. Counted across all 127 shipped documents: exactly one
 * ld+json block each, the Game one, which happens to live in the head. 113 game
 * pages were generating breadcrumbs, the one of the two that Google actually
 * renders in a result, and shipping none of them.
 *
 * WHAT THIS CHECKS, and the split matters: sections 1 to 3 read the SHIPPED
 * FILES, because that is the only thing that answers "did it arrive". Section 4
 * reads the source, because a table that has fallen behind the route list is a
 * defect before it ever reaches a build.
 *
 * Run: node scripts/simSchema.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const xml = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
const submitted = [...xml.matchAll(/<loc>https:\/\/douknowball\.com([^<]*)<\/loc>/g)]
  .map(m => (m[1] || '/').replace(/\/$/, '') || '/');

/** Every ld+json object on a shipped page, flattened out of arrays. */
function schemasOf(route) {
  const file = route === '/'
    ? path.join(ROOT, 'index.html')
    : path.join(ROOT, 'public', route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let parsed;
    try { parsed = JSON.parse(m[1]); }
    catch (e) { out.push({ __invalid: e.message }); continue; }
    for (const o of (Array.isArray(parsed) ? parsed : [parsed])) out.push(o);
  }
  return out;
}

/* The registry is the authority on what is a game, same as it is for the
   sitemap. Bundled rather than regexed, so a formatting change in the data file
   cannot quietly shrink the list this checks against. */
const ENTRY = path.join(os.tmpdir(), 'simSchemaEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'simSchema.bundle.mjs');
fs.writeFileSync(ENTRY, `
const reg = await import('${ROOT.replaceAll('\\', '/')}/src/data/gameRegistry.ts');
export const paths = (reg.ALL_GAMES ?? reg.CATEGORIES.flatMap(c => c.games)).map(g => g.path);
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { paths: gamePaths } = await import(pathToFileURL(BUNDLE).href);
const games = new Set(gamePaths);

console.log('1) every shipped page carries structured data, and it parses');
{
  let missing = 0, invalid = 0, absent = 0;
  for (const r of submitted) {
    const s = schemasOf(r);
    if (s === null) { absent += 1; fail(`${r} has no shipped document to read`); continue; }
    if (!s.length) { missing += 1; fail(`${r} ships no structured data at all`); continue; }
    for (const o of s) if (o.__invalid) { invalid += 1; fail(`${r} ships ld+json that does not parse: ${o.__invalid.slice(0, 60)}`); }
  }
  console.log(`   ${submitted.length} submitted pages, ${missing} with none, ${invalid} unparseable, ${absent} with no file`);
}

console.log('2) no page claims to be something it is not');
{
  /* The rule is narrow on purpose: it does not try to judge whether
     CollectionPage or WebPage was the better call for a hub. It asserts the one
     thing that was actually wrong, which is a page describing itself as a Game
     when the registry has never heard of it. */
  let wrong = 0, ok = 0;
  for (const r of submitted) {
    const s = schemasOf(r) ?? [];
    const claimsGame = s.some(o => o['@type'] === 'Game');
    if (claimsGame && !games.has(r)) { wrong += 1; fail(`${r} declares itself a Game and is not one`); continue; }
    if (games.has(r) && !claimsGame) { wrong += 1; fail(`${r} is a game in the registry and does not say so`); continue; }
    ok += 1;
  }
  console.log(`   ${ok} pages typed correctly, ${wrong} wrong`);
}

console.log('3) the markup a game page generates actually ships');
{
  /* This is the arrival check. Both of these were being generated and both were
     landing in the body, where the snapshot throws them away. */
  const gamePagesSubmitted = submitted.filter(r => games.has(r));
  let noFaq = 0, noCrumbs = 0, badCrumbs = 0;
  for (const r of gamePagesSubmitted) {
    const s = schemasOf(r) ?? [];
    const faq = s.find(o => o['@type'] === 'FAQPage');
    const crumbs = s.find(o => o['@type'] === 'BreadcrumbList');
    if (!faq) { noFaq += 1; if (noFaq <= 3) fail(`${r} ships no FAQPage markup, so the questions on the page are invisible to a crawler`); }
    else if (!Array.isArray(faq.mainEntity) || faq.mainEntity.length < 2) {
      fail(`${r} ships FAQPage markup with ${faq.mainEntity?.length ?? 0} questions in it`);
    }
    if (!crumbs) { noCrumbs += 1; if (noCrumbs <= 3) fail(`${r} ships no BreadcrumbList, which is the one of these Google actually draws in a result`); }
    else if (!Array.isArray(crumbs.itemListElement) || crumbs.itemListElement.length < 2) {
      badCrumbs += 1; fail(`${r} ships a breadcrumb trail with fewer than two steps in it`);
    }
  }
  console.log(`   ${gamePagesSubmitted.length} game pages, ${noFaq} without FAQ markup, ${noCrumbs} without breadcrumbs, ${badCrumbs} with a broken trail`);
}

console.log('4) every shipped page says who this site is');
{
  /* WebSite and Organization are claims about the SITE, not about a page, so
     they are correct on every page and are what tie 127 documents to one
     entity. They live in index.html, whose head every snapshot copies verbatim,
     so this checks all of them rather than only the home page. */
  let noSite = 0, noOrg = 0, unlinked = 0;
  for (const r of submitted) {
    const s = schemasOf(r) ?? [];
    const site = s.find(o => o['@type'] === 'WebSite');
    const org = s.find(o => o['@type'] === 'Organization');
    if (!site) { noSite += 1; if (noSite <= 3) fail(`${r} ships no WebSite object, so it is a loose document rather than part of a site`); }
    if (!org) { noOrg += 1; if (noOrg <= 3) fail(`${r} ships no Organization object, which is what Google reads to work out whose domain this is`); }
    if (site && org && site.publisher?.['@id'] !== org['@id']) {
      unlinked += 1;
      if (unlinked <= 2) fail(`${r} declares a WebSite and an Organization that are not linked, so they read as two unrelated entities`);
    }
  }
  /* WebApplication is site level too and carries its own @id, so it is checked
     the same way rather than only on the home page. It is the object that says
     the thing at this address is a free browser game. */
  let noApp = 0;
  for (const r of submitted) {
    const s = schemasOf(r) ?? [];
    if (!s.some(o => o['@type'] === 'WebApplication')) { noApp += 1; if (noApp <= 3) fail(`${r} ships no WebApplication object, so nothing says this site is a free browser game`); }
  }
  const home = schemasOf('/') ?? [];
  console.log(`   ${submitted.length} pages, ${noSite} without WebSite, ${noOrg} without Organization, ${noApp} without WebApplication, ${unlinked} unlinked; home page ships ${home.length} objects`);
}

console.log('4b) the template block and the library have not drifted apart');
{
  /* Two copies of the same JSON exist on purpose, one in index.html where a
     crawler can read it without running anything and one in pageSchema.ts where
     the app can. Two copies is how a thing goes stale, so they are compared. */
  const libSrc = fs.readFileSync(path.join(ROOT, 'src/lib/pageSchema.ts'), 'utf8');
  const wantIds = [...libSrc.matchAll(/'@id':\s*`\$\{SITE\}(\/#[a-z]+)`/g)].map(m => m[1]);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) {
    fail(`index.html carries ${blocks.length} ld+json blocks, expected exactly one site level block`);
  } else {
    let parsed = null;
    try { parsed = JSON.parse(blocks[0][1]); } catch (e) { fail(`the template's ld+json does not parse: ${e.message.slice(0, 60)}`); }
    if (parsed) {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const ids = arr.map(o => String(o['@id'] || '').replace('https://douknowball.com', ''));
      for (const want of new Set(wantIds)) {
        if (!ids.includes(want)) fail(`src/lib/pageSchema.ts references ${want} but the template does not declare it`);
      }
      const types = arr.map(o => o['@type']);
      for (const want of ['WebSite', 'Organization', 'WebApplication']) {
        if (!types.includes(want)) fail(`the template's site level block has no ${want} in it`);
      }
      console.log(`   template declares ${types.join(' and ')}; the library references ${[...new Set(wantIds)].join(', ')}`);
    }
  }
}

console.log('5) the classification table has not fallen behind the route list');
{
  /* Source level. A submitted route that is neither in the registry nor in the
     table would fall back to WebPage, which is true but uninformative, and would
     do so silently. */
  const lib = path.join(ROOT, 'src/lib/pageSchema.ts');
  if (!fs.existsSync(lib)) {
    fail('src/lib/pageSchema.ts is missing, so nothing decides these types in one place any more');
  } else {
    const src = fs.readFileSync(lib, 'utf8');
    const block = src.slice(src.indexOf('STATIC_TYPES'), src.indexOf('schemaTypeFor'));
    const listed = new Set([...block.matchAll(/'(\/[a-z0-9-]*)':\s*'([A-Za-z]+)'/g)].map(m => m[1]));
    let unclassified = 0, stale = 0;
    for (const r of submitted) {
      if (r === '/' || games.has(r) || listed.has(r)) continue;
      unclassified += 1;
      fail(`${r} is submitted and is neither a registry game nor in the table, so it falls back to a bare WebPage`);
    }
    for (const r of listed) {
      if (!submitted.includes(r)) { stale += 1; fail(`the table classifies ${r}, which is not submitted any more`); }
    }
    console.log(`   ${listed.size} routes classified by hand, ${games.size} by the registry, ${unclassified} unclassified, ${stale} stale`);
  }
}

console.log('');
if (failures > 0) {
  console.log(`simSchema: ${failures} failures.`);
  process.exit(1);
}
console.log('simSchema: green. Every page says what it is, and everything it generates reaches the file a crawler reads.');
