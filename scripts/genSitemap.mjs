/**
 * Round 148: the sitemap generator, built the day Search Console showed
 * "Page with redirect, validation failed" (owner screenshots, 2026-08-17).
 * The r54 sitemap was generated once and drifted two ways at once: six
 * retired routes that point at other pages were still being submitted
 * (/world-cup, /football-draft, /guess-soccer-club, /guess-transfer-value,
 * /perfect-lineup, /grade-transfer), and games added after r54 (Stadium
 * Tycoon) were missing. Both drift classes end here:
 *
 *   node scripts/genSitemap.mjs        rewrites public/sitemap.xml
 *
 * Sources of truth, no hand lists of games anywhere:
 *  - src/App.tsx: a <Route> whose element is <Navigate ...> is a redirect
 *    and can NEVER be submitted; everything else with a literal path is a
 *    real page.
 *  - src/data/gameRegistry.ts: every registered game must be in the map.
 *  - STATIC_PAGES below: the handful of non-game pages, curated.
 *
 * scripts/simSitemap.mjs asserts all of this on every suite run, so the
 * next retired game or new release cannot recreate today's Search Console
 * failure quietly.
 *
 * Round 272 correction, and it matters: those retired routes never actually
 * sent a 301. public/_redirects is not honored by this host, which was proved
 * against the live site, so until Round 272 they returned 200 with the home
 * page in the body. Excluding them from the sitemap was still exactly right,
 * it just was not doing what the sentence above says it was. They now carry
 * their own signpost documents; see scripts/genRetiredStubs.mjs.
 *
 * Round 272 also moved the App.tsx route parse into scripts/lib/retiredRoutes.mjs
 * so that this generator, the stub generator and simRetiredRoutes cannot end
 * up with three slightly different ideas of what is retired. That failure mode
 * is not hypothetical: it is what shipped /college empty in Round 268.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRoutes } from './lib/retiredRoutes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://douknowball.com';

/* Non-game pages, with their crawl hints.
   Round 198: /college joined the list. It is a real hub with its own copy
   and links to every college game, but it was in no menu and no sitemap,
   so nothing on the web pointed at it and nothing ever would. It got a
   link from the home page's College Sports heading in the same round,
   because a sitemap entry with no inbound link is a page Google is
   entitled to ignore. */
/* Round 270: five more hubs joined /college, all six drawn by one component
   from src/lib/sportHub.ts. They are listed here rather than parsed out of
   App.tsx because App.tsx now mounts them all through the same element and
   the route strings are the only thing that distinguishes them. simHubs
   fails if this list and SPORT_HUBS ever disagree. */
const STATIC_PAGES = [
  { p: '/', freq: 'daily', pri: '1.0' },
  { p: '/leaderboard', freq: 'daily', pri: '0.7' },
  { p: '/college', freq: 'weekly', pri: '0.6' },
  { p: '/soccer', freq: 'weekly', pri: '0.7' },
  { p: '/pro-basketball', freq: 'weekly', pri: '0.6' },
  { p: '/pro-football', freq: 'weekly', pri: '0.6' },
  { p: '/baseball', freq: 'weekly', pri: '0.6' },
  { p: '/hockey', freq: 'weekly', pri: '0.6' },
  { p: '/whats-new', freq: 'weekly', pri: '0.5' },
  { p: '/records', freq: 'weekly', pri: '0.6' },
  { p: '/about', freq: 'yearly', pri: '0.4' },
  { p: '/contact', freq: 'yearly', pri: '0.4' },
  { p: '/privacy', freq: 'yearly', pri: '0.3' },
  { p: '/terms', freq: 'yearly', pri: '0.3' },
];

/* ---- routes from App.tsx, via the one shared reader ---- */
const { live: liveRoutes, retired } = readRoutes();
const redirects = new Set(retired.map(r => r.from));

/* ---- games from the registry (house bundle pattern) ---- */
const ENTRY = '/tmp/sitemapEntry.mjs';
const BUNDLE = '/tmp/sitemap.bundle.mjs';
fs.writeFileSync(ENTRY, `
const reg = await import('${ROOT}/src/data/gameRegistry.ts');
export const paths = (reg.ALL_GAMES ?? reg.CATEGORIES.flatMap(c => c.games)).map(g => g.path);
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { paths: gamePaths } = await import(BUNDLE);

let bad = 0;
for (const p of gamePaths) {
  if (redirects.has(p)) { bad += 1; console.error(`FATAL: registry game ${p} is a redirect route`); }
  if (!liveRoutes.has(p)) { bad += 1; console.error(`FATAL: registry game ${p} has no route in App.tsx`); }
}
if (bad) process.exit(1);

/* Legacy live routes that stay submitted although they left the registry:
 * they are real pages kept for direct links and data continuity. Anything
 * else that is a live route but neither game, static nor listed here is
 * deliberately NOT submitted (retired pages kept only for direct links). */
const LEGACY_LIVE = ['/jeopardy'];
for (const p of LEGACY_LIVE) {
  if (!liveRoutes.has(p)) { console.error(`FATAL: legacy page ${p} lost its route`); process.exit(1); }
}

const today = new Date().toISOString().slice(0, 10);
const row = (p, freq, pri) =>
  /* Round 198: the root is submitted WITH its trailing slash, because that
     is exactly what PageSeo puts in the home page's canonical tag. The two
     disagreed until now (sitemap bare, canonical slashed), which is a
     crawler being told about one URL and pointed at another. */
  `  <url><loc>${SITE}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;

const seen = new Set();
const rows = [];
for (const s of STATIC_PAGES) { seen.add(s.p); rows.push(row(s.p, s.freq, s.pri)); }
for (const p of [...gamePaths, ...LEGACY_LIVE]) {
  if (seen.has(p)) continue;
  seen.add(p);
  rows.push(row(p, 'daily', '0.8'));
}

const out = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Generated by scripts/genSitemap.mjs from src/App.tsx routes plus
  src/data/gameRegistry.ts on ${today} (Round 148). Redirect routes are
  excluded mechanically: submitting them is exactly the "Page with
  redirect" Search Console failure this generator was built to end.
  Regenerate with: node scripts/genSitemap.mjs
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'public/sitemap.xml'), out);
console.log(`sitemap.xml: ${rows.length} URLs (${gamePaths.length} games, ${STATIC_PAGES.length} static, ${LEGACY_LIVE.length} legacy)`);
console.log(`redirect routes excluded: ${[...redirects].filter(p => !p.includes(':')).length}`);
