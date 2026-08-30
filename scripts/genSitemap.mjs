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
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  /* Round 354: the NBA grid archive. A non-game page has to be named here to
     be submitted at all, and being submitted is also what puts it in front of
     the prerenderer, which reads its route list from this file's output. */
  { p: '/nba-grid/archive', freq: 'weekly', pri: '0.5' },
  { p: '/about', freq: 'yearly', pri: '0.4' },
  { p: '/contact', freq: 'yearly', pri: '0.4' },
  { p: '/privacy', freq: 'yearly', pri: '0.3' },
  { p: '/terms', freq: 'yearly', pri: '0.3' },
  { p: '/accessibility', freq: 'yearly', pri: '0.3' },
];

/* ---- routes from App.tsx, via the one shared reader ---- */
const { live: liveRoutes, retired } = readRoutes();
const redirects = new Set(retired.map(r => r.from));

/* ---- games from the registry (house bundle pattern) ---- */
/* Round 349: Windows-safe. The generated entry file is JavaScript source, so
   a Windows ROOT full of backslashes gets its \U and \b eaten as escapes
   (esbuild saw "C:Usersantho..." and the whole pipeline died on the desktop
   lane while Linux never noticed). Forward slashes work on every platform,
   the tmp dir comes from the OS, and the bundle import needs a file URL on
   Windows. */
const ENTRY = path.join(os.tmpdir(), 'sitemapEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'sitemap.bundle.mjs');
fs.writeFileSync(ENTRY, `
const reg = await import('${ROOT.replaceAll('\\', '/')}/src/data/gameRegistry.ts');
export const paths = (reg.ALL_GAMES ?? reg.CATEGORIES.flatMap(c => c.games)).map(g => g.path);
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { paths: gamePaths } = await import(pathToFileURL(BUNDLE).href);

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
/* Round 305: /jeopardy left this list when it became a redirect to
   /quiz-board (the registry path now, so it rides in with the games). The
   list stays, empty, for the next page kept alive outside the registry. */
const LEGACY_LIVE = [];
for (const p of LEGACY_LIVE) {
  if (!liveRoutes.has(p)) { console.error(`FATAL: legacy page ${p} lost its route`); process.exit(1); }
}

const today = new Date().toISOString().slice(0, 10);

/* ─── ROUND 280: A LASTMOD THAT IS TRUE ────────────────────────────────────
   WHAT WAS WRONG. Every one of the 127 rows carried the same lastmod, the day
   the generator last ran, because that is what `today` is. Regenerate the
   sitemap for any reason at all and all 127 pages claimed to have changed.

   Google's own sitemap documentation is unusually blunt about this: the value
   must be consistently and verifiably accurate, and where it is not, they may
   ignore it entirely. A file that says all 127 pages changed today, every time,
   is not a re-crawl hint, it is a boy crying wolf 127 times at once, and
   ignoring it is the correct thing for a crawler to do. That matters here more
   than on most sites, because the specific Search Console complaint on this
   domain is "Crawled, currently not indexed" on pages last looked at in April.
   The one lever a site has to ask for a re-crawl was the one being wasted.

   WHAT IT IS NOW. A page's lastmod is the day that page's readable content last
   actually changed, and it is derived rather than asserted: every route's
   prerendered snapshot is reduced to the text and links a crawler reads, hashed,
   and compared against the hash recorded last time. Same hash, the stored date
   is kept, however many times this runs. Different hash, today's date goes in
   and the new hash is stored. So the claim in the file is checkable by anyone
   who diffs two snapshots, which is exactly the standard the documentation asks
   for.

   THE LEDGER IS COMMITTED (scripts/data/lastmod.json) because it has to survive
   the build that regenerates it, the machine that runs the build, and this
   repo's habit of rebuilding everything from scratch. A route with no entry yet
   gets today, which is the honest answer for a page nobody has a history for.

   IT READS THE SNAPSHOT, NOT THE SOURCE, on purpose. A page renders from dozens
   of files and a change to any of them may or may not change a word on the page;
   the shipped document is the only thing that answers "did what a crawler sees
   change" without guessing. The cost is that the sitemap has to be generated
   AFTER the prerenderer, which is now what build:seo does. If a snapshot is
   missing, that route keeps whatever date it had rather than being stamped with
   today, because a file that is not there is not evidence that anything changed.

   Guarded by scripts/simSitemap.mjs. */
const LEDGER_PATH = path.join(ROOT, 'scripts/data/lastmod.json');
/* ROUND 281: THE FINGERPRINT ITSELF IS VERSIONED, and the reason is a mistake
   this round nearly made.

   Adding the structured data to the reduction changed every hash on the site at
   once, which made the generator report that all 127 pages had changed. That
   happened to be TRUE this round, because the same round moved the FAQ and
   breadcrumb markup into the head on 113 pages and gave every document the site
   level entity block. But it would have been reported either way, and a ledger
   that says everything changed whenever its own algorithm is edited is the
   original defect wearing a different hat.

   So a version mismatch HOLDS every date instead of stamping today. The
   generator cannot tell a content change from an algorithm change, and between
   "claim a change I cannot prove" and "stay quiet", staying quiet is the only
   honest option and the only one Google is not entitled to punish.

   The escape hatch is deliberate and manual: DELETE scripts/data/lastmod.json to
   force a reseed at today's date. That is the right move only when you know the
   content genuinely changed everywhere, which is exactly what happened here, and
   it costs the whole history, so it should be rare. */
/* v3, Round 286: the site chrome (header, ticker, navbar, footer, cookie
   banner) is left out of the reduction. A footer change re-dated all 126 pages
   in Round 285, which is true in the narrowest sense and useless to a crawler:
   the page's own words had not moved. Every date was held across this change,
   as the version rule below requires. */
const FINGERPRINT_VERSION = 3;
const readLedger = () => {
  try { return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')); } catch { return {}; }
};
const rawLedger = readLedger();
const ledgerVersion = rawLedger.__version ?? 1;
const VERSION_CHANGED = ledgerVersion !== FINGERPRINT_VERSION && Object.keys(rawLedger).length > 0;
const ledger = Object.fromEntries(Object.entries(rawLedger).filter(([k]) => k !== '__version'));
/* --routes-only: emit the sitemap for the route list and DO NOT touch the
   ledger. The prerenderer reads the sitemap to know what to render, so a route
   added this round has to appear in the file before the prerenderer runs, and
   at that moment its snapshot does not exist yet. Stamping the ledger from
   snapshots that predate this build would record a date for content that has
   already been replaced. So build:seo runs this generator twice: once for the
   route list, then the prerenderer, then again for real against the documents
   that were just written. */
const ROUTES_ONLY = process.argv.includes('--routes-only');
const nextLedger = {};
let changed = 0, held = 0, fresh = 0, noSnapshot = 0;

/** Everything a crawler takes off the shipped document, and nothing else: the
 *  title, the description, the readable words, the link targets, and the
 *  structured data. No hashed asset names, no injected style, no markup. Two
 *  builds of an unchanged page must reduce to the same string or this whole
 *  mechanism is noise.
 *
 *  ROUND 281 ADDED THE STRUCTURED DATA, and it was added because leaving it out
 *  gave a visibly wrong answer on real work. That round moved the FAQ and
 *  breadcrumb markup on 113 game pages from the body, where the snapshot threw
 *  it away, into the head where it ships, corrected thirteen pages that were
 *  declaring themselves video games, and put the site level entity block into
 *  every document. Every one of the 127 pages changed in a way a crawler should
 *  come back for. The ledger reported six. A page gaining a rich result it never
 *  had is a change; the fingerprint has to see it.
 *
 *  The JSON is normalised before hashing, parsed and re-emitted with its keys
 *  sorted, so that a formatting difference between two builds cannot masquerade
 *  as a content change. That is the same standard the rest of this function
 *  holds itself to: it must be blind to how the file was written and sensitive
 *  only to what it says. */
function snapshotFingerprint(route) {
  const file = route === '/'
    ? path.join(ROOT, 'index.html')
    : path.join(ROOT, 'public', route.replace(/^\//, ''), 'index.html');
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch { return null; }
  /* The home page has no snapshot block; its content lives in #root in the
     template. Every other route carries its content under #dukb-snapshot. */
  const marker = route === '/' ? '<div id="root">' : 'id="dukb-snapshot"';
  const i = html.indexOf(marker);
  const body = i < 0 ? html : html.slice(i);
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const text = body
    .replace(/<div data-site-chrome>[\s\S]*?<\/div>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g, ' [$1] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  /* Sorted keys, sorted blocks: two documents saying the same thing in a
     different order must hash the same. A block that will not parse is folded
     in as its raw text rather than dropped, because unparseable JSON-LD is
     itself a change worth noticing. */
  const sortDeep = v => Array.isArray(v)
    ? v.map(sortDeep)
    : (v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])]))
        : v);
  const ld = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => { try { return JSON.stringify(sortDeep(JSON.parse(m[1]))); } catch { return m[1].replace(/\s+/g, ' ').trim(); } })
    .sort()
    .join('\n');
  return createHash('sha256').update(`${title}\n${desc}\n${text}\n${ld}`).digest('hex').slice(0, 16);
}

function lastmodFor(route) {
  if (ROUTES_ONLY) {
    const prev = ledger[route];
    nextLedger[route] = prev ?? { hash: '', date: today };
    return prev ? prev.date : today;
  }
  const fp = snapshotFingerprint(route);
  const prev = ledger[route];
  if (fp === null) {
    noSnapshot += 1;
    if (prev) { nextLedger[route] = prev; return prev.date; }
    nextLedger[route] = { hash: '', date: today };
    return today;
  }
  if (prev && prev.hash === fp) { held += 1; nextLedger[route] = prev; return prev.date; }
  if (prev && VERSION_CHANGED) {
    /* The reduction changed, so a different hash proves nothing about the page.
       Record the new hash, keep the date that was already there. */
    held += 1;
    nextLedger[route] = { hash: fp, date: prev.date };
    return prev.date;
  }
  if (prev) changed += 1; else fresh += 1;
  nextLedger[route] = { hash: fp, date: today };
  return today;
}

const row = (p, freq, pri) =>
  /* Round 198: the root is submitted WITH its trailing slash, because that
     is exactly what PageSeo puts in the home page's canonical tag. The two
     disagreed until now (sitemap bare, canonical slashed), which is a
     crawler being told about one URL and pointed at another. */
  `  <url><loc>${SITE}${p === '/' ? '/' : p}</loc><lastmod>${lastmodFor(p)}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;

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

/* The ledger is written from nextLedger rather than mutated in place, so a
   route that has left the sitemap drops out of it instead of sitting there
   forever. Sorted, so a diff shows the routes that changed and not the order
   Object.keys happened to come back in. */
if (!ROUTES_ONLY) {
fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
const sortedLedger = { __version: FINGERPRINT_VERSION, ...Object.fromEntries(Object.keys(nextLedger).sort().map(k => [k, nextLedger[k]])) };
fs.writeFileSync(LEDGER_PATH, JSON.stringify(sortedLedger, null, 2) + '\n');
console.log(
  `lastmod: ${held} unchanged and holding their old date, ${changed} rewritten today, ` +
  `${fresh} new, ${noSnapshot} with no snapshot to read`,
);
if (VERSION_CHANGED) {
  console.log(
    `   the fingerprint changed from v${ledgerVersion} to v${FINGERPRINT_VERSION}, so every date was HELD: ` +
    'a different hash proves nothing when the reduction itself moved',
  );
}
} else {
  console.log('lastmod: routes-only pass, every date left exactly as the ledger already had it');
}
console.log(`sitemap.xml: ${rows.length} URLs (${gamePaths.length} games, ${STATIC_PAGES.length} static, ${LEGACY_LIVE.length} legacy)`);
console.log(`redirect routes excluded: ${[...redirects].filter(p => !p.includes(':')).length}`);
