/**
 * Round 198 harness: every page is either worth indexing and reachable, or
 * says plainly that it is not.
 *
 * His ask was four words, "make sure every page is good to be indexed",
 * and the audit behind this file read it as a question about EVERY route
 * the site serves, not just the ones already in the sitemap. What it found:
 *
 *   FIVE ORPHANS. /higher-lower-transfers, /shirt-number, /pack-battle,
 *   /football-timeline and /guess-nfl-team are games he retired himself
 *   ("too easy and boring", "get rid of this game") whose routes were kept
 *   alive for old links. They were in no menu and no sitemap, so a search
 *   result was the only way anyone could ever land on one, with no way
 *   onward. They are noindex, follow now.
 *
 *   TWO PRIVATE PAGES indexable by accident (/profile, /reset-password),
 *   and TWO ADMIN SCREENS with no head tags at all.
 *
 *   ONE GOOD PAGE NOBODY COULD REACH. /college is a real hub with its own
 *   copy and a link to every college game, and it was in no menu and no
 *   sitemap. It is in both now.
 *
 * The rules below are what keeps that true. The important one is the last:
 * a URL cannot be in the sitemap AND carry noindex, because that is the
 * exact contradiction that makes Search Console shout, and it is one
 * careless copy-paste away at any time.
 *
 * Run: node scripts/simIndexing.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf-8');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const app = read('src/App.tsx');
const xml = read('public/sitemap.xml');
const robots = read('public/robots.txt');

/* Live routes and redirect routes, the way genSitemap reads them. */
const live = new Set(), redirects = new Set();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element={\s*(<Navigate\b)?/g)) {
  const p = m[1];
  if (p.includes(':') || p === '*') continue;
  (m[2] ? redirects : live).add(p);
}
const sitemap = new Set([...xml.matchAll(/<loc>https:\/\/douknowball\.com([^<]*)<\/loc>/g)].map(m => m[1] || '/'));

/* Every page file's PageSeo block: path, title, description, noindex. */
const pages = [];
const dir = path.join(ROOT, 'src/pages');
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.tsx')) continue;
  const s = fs.readFileSync(path.join(dir, f), 'utf-8');
  const m = s.match(/<PageSeo([\s\S]{0,700}?)\/>/);
  if (!m) {
    pages.push({ file: f, seo: false, noindex: /name="robots"[^>]*noindex/.test(s) || /content="noindex/.test(s) });
    continue;
  }
  const block = m[1];
  /* Most pages pass literals, but a couple build their head from state
     (Profile's title is the player's name). An expression counts as
     present, and its path is read from the literal fallback inside it,
     which is the route the page answers on when there is no parameter. */
  let routePath = null;
  const litPath = block.match(/path="([^"]+)"/);
  if (litPath) {
    routePath = litPath[1];
  } else {
    /* An expression path: a template literal's own ${...} braces end a
       non-greedy match early, so the tail of the block is scanned instead
       and the LAST route-shaped literal wins, which is the no-parameter
       fallback the page answers on. */
    const at = block.indexOf('path={');
    if (at >= 0) {
      const lits = [...block.slice(at).matchAll(/'(\/[^']*)'|"(\/[^"]*)"/g)].map(x => x[1] ?? x[2]);
      routePath = lits.length ? lits[lits.length - 1] : null;
    }
  }
  const titleM = block.match(/title="([^"]+)"/);
  const descM = block.match(/description="([^"]+)"/);
  pages.push({
    file: f,
    seo: true,
    path: routePath,
    dynamicTitle: !titleM && /title=\{/.test(block),
    dynamicDesc: !descM && /description=\{/.test(block),
    title: titleM ? titleM[1] : null,
    desc: descM ? descM[1] : null,
    noindex: /(^|\s)noindex(\s|$|\n)/.test(block),
  });
}

/* ---------- 1. Nothing in the index by accident ---------- */
console.log('1) The pages that must never be indexed say so');
{
  /* Retired games whose routes still resolve, and private pages. */
  const MUST_NOINDEX = [
    '/higher-lower-transfers', '/shirt-number', '/pack-battle',
    '/football-timeline', '/guess-nfl-team',
    '/profile', '/reset-password',
  ];
  for (const p of MUST_NOINDEX) {
    const page = pages.find(x => x.path === p);
    if (!page) { fail(`${p}: no page file carries this path, the audit list is stale`); continue; }
    if (!page.noindex) fail(`${p} (${page.file}) is indexable, and nothing on the site links to it`);
    if (sitemap.has(p)) fail(`${p} is noindexed AND in the sitemap, the contradiction Search Console reports`);
  }
  /* The admin screens and the 404 carry raw robots tags, no PageSeo. */
  for (const f of ['AdminLogin.tsx', 'AdminReports.tsx', 'NotFound.tsx']) {
    const s = read('src/pages/' + f);
    if (!/content="noindex/.test(s)) fail(`${f} does not tell crawlers to stay away`);
  }
  console.log(`   ${MUST_NOINDEX.length} routes noindexed, admin and 404 covered`);
}

/* ---------- 2. Nothing worth indexing is missing ---------- */
console.log('2) Every live page is either in the sitemap or deliberately out');
{
  /* Out by design: noindexed pages, and the admin routes. */
  const noindexPaths = new Set(pages.filter(p => p.noindex && p.path).map(p => p.path));
  const missing = [];
  for (const r of live) {
    if (sitemap.has(r)) continue;
    if (noindexPaths.has(r)) continue;
    if (r.startsWith('/admin')) continue;
    missing.push(r);
  }
  if (missing.length) fail(`live pages in no sitemap and with no noindex: ${missing.join(' | ')}`);
  /* And nothing in the sitemap that is not a live route. */
  for (const u of sitemap) {
    if (redirects.has(u)) fail(`${u} is a redirect and is being submitted, the Round 148 failure`);
    else if (!live.has(u) && u !== '/') fail(`${u} is in the sitemap with no live route`);
  }
  console.log(`   ${sitemap.size} URLs submitted, ${live.size} live routes, 0 unexplained`);
}

/* ---------- 3. Every hub is reachable, not just listed ---------- */
console.log('3) A sitemap entry with no inbound link is not a page');
{
  /* Round 198 wrote this for /college alone, and checked for the literal
     string to="/college" in the home page source. Round 270 turned one hub
     into six drawn by one component, so that literal is gone and the check
     had to grow up. It now reads the hub list itself and asks the question
     that actually matters: is the route in the sitemap, will the generator
     keep it there, and does the home page a crawler RECEIVES link to it.
     That last one is the point. The home page's React grid links every hub
     through a helper, but a crawler with no JavaScript sees index.html, so
     the static block is where the vote has to be. */
  const hubRoutes = [...read('src/lib/sportHub.ts').matchAll(/^\s*route: '([^']+)',/gm)].map(m => m[1]);
  if (hubRoutes.length < 2) fail(`only parsed ${hubRoutes.length} hub routes out of sportHub.ts, which cannot be right`);
  const gen = read('scripts/genSitemap.mjs');
  const home = read('index.html');
  for (const r of hubRoutes) {
    if (!sitemap.has(r)) fail(`${r} is a hub and is not in the sitemap`);
    if (!gen.includes(`p: '${r}'`)) fail(`the generator would drop ${r} on the next run`);
    if (!home.includes(`href="${r}"`)) fail(`the home page a crawler receives does not link ${r}, so it is a sitemap entry with no vote`);
  }
  console.log(`   ${hubRoutes.length} hubs, each submitted, kept by the generator and linked from the static home page`);
}

/* ---------- 4. Titles and descriptions do their job ---------- */
console.log('4) Unique titles, unique descriptions, sane lengths');
{
  const indexable = pages.filter(p => p.seo && p.title && p.desc && !p.noindex);
  if (indexable.length < 100) fail(`only ${indexable.length} indexable pages parsed, the parser is missing pages`);
  const byTitle = new Map(), byDesc = new Map();
  for (const p of indexable) {
    byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p.file]);
    byDesc.set(p.desc, [...(byDesc.get(p.desc) ?? []), p.file]);
  }
  for (const [t, files] of byTitle) if (files.length > 1) fail(`duplicate title on ${files.join(', ')}: ${t}`);
  for (const [d, files] of byDesc) if (files.length > 1) fail(`duplicate description on ${files.join(', ')}: ${d.slice(0, 60)}`);
  /* Length bands are advisory, so they are counted, not enforced, EXCEPT
     the two that genuinely hurt: an empty description and a title so long
     the brand falls off the end of every result. */
  for (const p of indexable) {
    if (p.desc.length < 30) fail(`${p.file}: description is ${p.desc.length} characters`);
    if (p.title.length > 75) fail(`${p.file}: title is ${p.title.length} characters, the brand will be cut`);
  }
  const longTitles = indexable.filter(p => p.title.length > 65).length;
  const longDescs = indexable.filter(p => p.desc.length > 165).length;
  console.log(`   ${indexable.length} indexable pages, 0 duplicate titles, 0 duplicate descriptions (${longTitles} titles and ${longDescs} descriptions run past the display width, which only truncates)`);
}

/* ---------- 5. Every indexable page actually has a head ---------- */
console.log('5) No indexable page ships without title, description and canonical');
{
  const EXEMPT = new Set(['AdminLogin.tsx', 'AdminReports.tsx', 'NotFound.tsx']);
  for (const p of pages) {
    if (EXEMPT.has(p.file)) continue;
    if (!p.seo) { fail(`${p.file} has no PageSeo block at all`); continue; }
    if (!p.title && !p.dynamicTitle) fail(`${p.file}: no title`);
    if (!p.desc && !p.dynamicDesc) fail(`${p.file}: no description`);
  }
  const seo = read('src/components/seo/PageSeo.tsx');
  if (!seo.includes('rel="canonical"')) fail('PageSeo stopped emitting a canonical');
  if (!seo.includes('noindex, follow')) fail('the noindex tag is not follow, retired pages would stop passing their links on');
  if (!seo.includes('og:title') || !seo.includes('twitter:card')) fail('social tags went missing');
}

/* ---------- 6. Exactly one first level heading per page ---------- */
console.log('6) One h1 per page: the SEO block fills in only where a page has none');
{
  /* Why this is a rule and not a one-off fix: the block at the foot of every
     game page printed an h1, and so does most games' own headline, so about
     forty pages shipped two. Making it an h2 everywhere looked right and was
     worse: eighty two pages have NO headline of their own (their board is
     the whole page), and those would have ended up with none at all, which
     is weaker than having two. So the level follows the page, and this check
     is what keeps the flag honest as pages change. */
  const PAGES_DIR = path.join(ROOT, 'src/pages');
  const readFile = p => { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } };
  const resolveImport = (spec, fromFile) => {
    let s2 = spec;
    if (s2.startsWith('@/')) s2 = path.join(ROOT, 'src', s2.slice(2));
    else if (s2.startsWith('.')) s2 = path.join(path.dirname(fromFile), s2);
    else return null;
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
      if (fs.existsSync(s2 + ext)) return s2 + ext;
    }
    return null;
  };
  /* A file prints its own h1 with a literal tag, or by handing GameShell a
     title (GameShell renders one only when it is given one). */
  const rendersH1 = file => {
    const t = readFile(file);
    if (/<h1/.test(t)) return true;
    const at = t.indexOf('<GameShell');
    return at >= 0 && /\btitle=/.test(t.slice(at, at + 600));
  };
  /* Two hops, because the usual shape is page to board to shell. */
  const hasOwnH1 = (file, depth = 2, seen = new Set()) => {
    if (seen.has(file)) return false;
    seen.add(file);
    if (rendersH1(file)) return true;
    if (depth <= 0) return false;
    for (const m of readFile(file).matchAll(/from\s+["']([^"']+)["']/g)) {
      if (/seo\/(GameSeoContent|PageSeo)/.test(m[1])) continue;
      const r = resolveImport(m[1], file);
      if (r && hasOwnH1(r, depth - 1, seen)) return true;
    }
    return false;
  };

  let checked = 0, own = 0;
  for (const f of fs.readdirSync(PAGES_DIR)) {
    if (!f.endsWith('.tsx')) continue;
    const fp = path.join(PAGES_DIR, f);
    const t = readFile(fp);
    if (!t.includes('<GameSeoContent')) continue;
    checked += 1;
    const flagged = /<GameSeoContent[\s\S]{0,400}?pageHasOwnH1/.test(t);
    const real = hasOwnH1(fp);
    if (real) own += 1;
    if (real && !flagged) fail(`${f} prints its own h1 but does not tell the SEO block, so the page has two`);
    if (!real && flagged) fail(`${f} claims an h1 it does not have, so the page has none`);
  }
  /* Only the page renders the block. A board rendering it too duplicates the
     whole guide and its FAQ structured data, which is how /transfer-path and
     /shirt-number ended up carrying the block twice. */
  const dupes = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p2 = path.join(d, e.name);
      if (e.isDirectory()) walk(p2);
      else if (e.name.endsWith('.tsx') && readFile(p2).includes('<GameSeoContent')) dupes.push(path.relative(ROOT, p2));
    }
  };
  walk(path.join(ROOT, 'src/components'));
  if (dupes.length) fail(`components rendering the SEO block on top of their page: ${dupes.join(' | ')}`);
  console.log(`   ${checked} pages carry the block, ${own} have a headline of their own, ${checked - own} rely on it for their h1`);
}

/* ---------- 7. robots.txt is one honest set of rules ---------- */
console.log('7) robots.txt reads the way a crawler parses it');
{
  if (!robots.includes('Sitemap: https://douknowball.com/sitemap.xml')) fail('robots.txt does not point at the sitemap');
  if (!/Disallow: \/admin\//.test(robots)) fail('robots.txt does not keep crawlers out of the admin screens');
  const wildcards = (robots.match(/^User-agent: \*$/gm) ?? []).length;
  if (wildcards !== 1) fail(`${wildcards} wildcard groups in robots.txt, split rules are read differently by different crawlers`);
  /* Nothing may disallow the site itself. */
  if (/^Disallow: \/$/m.test(robots)) fail('robots.txt disallows the whole site');
  for (const p of [...sitemap]) {
    if (/^\/admin/.test(p)) fail(`${p} is disallowed in robots.txt and submitted in the sitemap`);
  }
}

/* ---------- 8. Copy discipline ---------- */
console.log('8) No em or en dash in the files this round touched');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  for (const f of ['src/components/seo/PageSeo.tsx', 'public/robots.txt', 'scripts/genSitemap.mjs']) {
    if (DASHES.test(read(f))) fail(`${f}: dash in copy`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simIndexing: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simIndexing: green. Every page is either worth finding or honestly hidden.');
