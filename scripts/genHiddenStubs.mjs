/**
 * Round 278: the pages that need an account still have to say "do not index me"
 * out loud.
 *
 * WHY THIS EXISTS. Nine live routes are deliberately kept out of the sitemap and
 * pass noindex to PageSeo: /football-timeline, /admin/login, /admin/reports,
 * /profile, /reset-password, /guess-nfl-team, /shirt-number,
 * /higher-lower-transfers, /pack-battle. Until Round 278 none of them had a
 * saved copy, on the documented grounds that a page you do not want indexed
 * should not be prerendered. That was correct when it was written, because a
 * route with no snapshot served an empty shell.
 *
 * Round 257 then put the home page's content into that shell. Nine harmless
 * empty addresses became nine copies of the home page, and the noindex they
 * carry only appears after JavaScript runs. Measured against Search Console on
 * 2026-08-23: /guess-nfl-team sits in "Crawled, currently not indexed", last
 * looked at in April, which is what an address serving somebody else's content
 * and declaring nothing looks like.
 *
 * Six of the nine render themselves when signed out and the prerenderer now
 * photographs them properly. The other three, both admin screens and the
 * profile, land on the home page without an account, so there is no page there
 * to photograph and the prerenderer refuses to write one (its self canonical
 * guard, added the same round after the first run wrote the home page into
 * public/profile/index.html). This writes those three a small document instead:
 * their own title, a self canonical, noindex follow, and the boot script so a
 * real visitor still gets the app.
 *
 * NO HASHED PATHS, same as every other committed snapshot: Round 275's build
 * plugin injects the real ones into the dist copies, where they cannot go stale.
 *
 * Run after the prerenderer: node scripts/genHiddenStubs.mjs
 * Guarded by: scripts/simHiddenPages.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://douknowball.com';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function isGeneratedStub(html) {
  const headEnd = html.search(/<\/head\s*>/i);
  const bodyStart = html.search(/<body\b/i);
  if (headEnd < 0 || bodyStart < headEnd) return false;
  const head = html.slice(0, headEnd)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  for (const match of head.matchAll(/<meta\b[^<>]*>/gi)) {
    const attributes = new Map();
    for (const attribute of match[0].matchAll(/\b([a-z][\w:-]*)\s*=\s*(["'])(.*?)\2/gi)) {
      attributes.set(attribute[1].toLowerCase(), attribute[3]);
    }
    if (attributes.get('name') === 'dukb-hidden-page' && attributes.get('content') === 'needs an account') return true;
  }
  return false;
}

/** Every live route that is unsubmitted and whose own page asks for noindex. */
export function hiddenRoutes() {
  const app = readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  const live = [], retired = new Set();
  for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element={\s*(<Navigate\b)?/g)) {
    const r = m[1];
    if (!r.startsWith('/') || r.includes(':') || r === '*') continue;
    if (m[2]) retired.add(r); else live.push(r);
  }
  const sitemapFile = path.join(PUBLIC, 'sitemap.xml');
  const submitted = new Set(
    existsSync(sitemapFile)
      ? [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
          .map(m => (m[1] || '/').replace(/\/$/, '') || '/')
      : [],
  );
  const noindexPages = new Set();
  for (const f of readdirSync(path.join(ROOT, 'src/pages'))) {
    if (f.endsWith('.tsx') && /noindex/.test(readFileSync(path.join(ROOT, 'src/pages', f), 'utf8'))) {
      noindexPages.add(f.replace(/\.tsx$/, ''));
    }
  }
  const componentOf = r => {
    const m = app.match(new RegExp(`<Route\\s+path="${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+element={\\s*<(\\w+)`));
    return m ? m[1] : null;
  };
  return live
    .filter(r => !submitted.has(r) && !retired.has(r))
    .filter(r => { const c = componentOf(r); return c && noindexPages.has(c); });
}

/** What a route's own page declares, read out of its source.
 *
 * Two shapes, because the site has two. Most pages go through PageSeo and set
 * title="...". The two admin screens use Helmet directly with a <title> element
 * and robots noindex,nofollow rather than noindex,follow, and the stub carries
 * whatever the page itself says rather than a value chosen here: a page that
 * asks crawlers not to follow its links has a reason, and overriding it from a
 * generator would be inventing policy. */
function declaredBy(route) {
  const app = readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  const m = app.match(new RegExp(`<Route\\s+path="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+element={\\s*<(\\w+)`));
  if (!m) return { title: null, robots: 'noindex, follow' };
  const f = path.join(ROOT, 'src/pages', `${m[1]}.tsx`);
  if (!existsSync(f)) return { title: null, robots: 'noindex, follow' };
  const src = readFileSync(f, 'utf8');
  const t = src.match(/title="([^"]+)"/) || src.match(/<title>([^<{]+)<\/title>/);
  const r = src.match(/name="robots"\s+content="([^"]+)"/);
  return { title: t ? t[1].trim() : null, robots: r ? r[1] : 'noindex, follow' };
}

export function stubHtml(route, title, robots) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(title)}</title>`,
    /* noindex, FOLLOW: the page stops asking to be a landing page and keeps
       passing its links on, which is the Round 198 rule and still right. */
    `<meta name="robots" content="${esc(robots)}">`,
    `<link rel="canonical" href="${SITE}${route}">`,
    '<meta name="dukb-hidden-page" content="needs an account">',
    '<script src="/prerender-boot.js"></script>',
    '</head>',
    '<body>',
    '<div id="root">',
    '<main id="dukb-snapshot">',
    `<h1>${esc(title)}</h1>`,
    '<p>This page needs an account, so there is nothing here for a search engine to read. It is marked as one to skip.</p>',
    '<p><a href="/">Go to DoUKnowBall</a></p>',
    '</main>',
    '</div>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let wrote = 0, already = 0;
  for (const route of hiddenRoutes()) {
    const rel = route.replace(/^\//, '');
    const publicFile = path.join(PUBLIC, rel, 'index.html');
    if (existsSync(publicFile) && !isGeneratedStub(readFileSync(publicFile, 'utf8'))) { already += 1; continue; }
    const { title, robots } = declaredBy(route);
    /* A page with no title of its own gets one named after itself. That is not
       inventing a claim, it is naming a door, and it is strictly better than the
       alternative, which is this address answering with the home page. */
    const shown = title || `${rel.split('/').map(w => w.replace(/(^|-)([a-z])/g, (_, a, b) => a.replace('-', ' ') + b.toUpperCase())).join(': ')} | DoUKnowBall`;
    const html = stubHtml(route, shown, robots);
    for (const base of [PUBLIC, DIST]) {
      if (base === DIST && !existsSync(DIST)) continue;
      const dir = path.join(base, rel);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'index.html'), html);
    }
    wrote += 1;
    console.log(`  ${route} -> noindex stub`);
  }
  console.log(`hidden pages: ${already} already photographed, ${wrote} given a stub`);
}
