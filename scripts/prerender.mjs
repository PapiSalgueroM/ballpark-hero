/**
 * Round 256: prerender every public route to real HTML.
 *
 * THE PROBLEM THIS SOLVES, measured on the live site 2026-08-21: every one
 * of the 122 URLs served BYTE-IDENTICAL html, Googlebot included. The
 * whole site is a client-rendered SPA, so the document a crawler receives
 * carries roughly 7,000 characters of which the only readable words are
 * code comments and the site title. Not one word of the 47,000 words of
 * game guides, not a Record Books row, not even a game name. AdSense
 * rejected the site for "low value content", which is exactly what 122
 * copies of an empty page look like on a first pass.
 *
 * WHAT IT DOES: after `vite build`, serve dist, open each route in
 * headless chromium, let React draw it, and write the finished DOM to
 * dist/<route>/index.html. Static hosts serve a real file in preference
 * to the SPA fallback in _redirects, so /soccer-career now answers with a
 * document that already contains its entire guide before a byte of
 * JavaScript runs. Players see no difference: the app boots over the
 * snapshot exactly as before.
 *
 * TWO RULES THE SNAPSHOTS FOLLOW, both about not lying:
 *   1. NO LIVE DATA IS BAKED IN. Supabase requests are left hanging
 *      rather than answered or refused, so every page renders its static
 *      copy plus its normal loading state. That keeps today's puzzle
 *      answers, today's champion tables and any dated figure OUT of a
 *      file that would still be on disk next month, and it keeps the
 *      honest error card out too (the watchdogs need 15 seconds; the
 *      snapshot is taken well before that).
 *   2. NOTHING IS INVENTED. The snapshot is whatever the app really
 *      draws. This script adds no text of its own.
 *
 *   3. NOTHING IS PINNED TO ONE BUILD (Round 257, and this one nearly took
 *      the site down). A snapshot is copied verbatim into every future
 *      build, and that build renames its bundle, so a hashed path written
 *      into a snapshot is a promise about a file that will not exist.
 *      Proved in a browser: a deep link 404s on the entry and on every lazy
 *      chunk and the app never boots, so the page has words on it and
 *      nothing on it works. No /assets path is written here at all;
 *      /prerender-boot.js reads the real ones off the live root document.
 *
 *   4. NOTHING COMPUTED FROM THE CLOCK IS WRITTEN (Round 284). Rule 1 covers
 *      data that arrives over the network and does nothing for a board the
 *      page works out from the date. Fifteen saved pages carried today's
 *      puzzle, three of them printing the literal date ("Today's lineup,
 *      2026-08-24"). Every route is now rendered three times with the
 *      page's own clock at 0, 5 and 11 days and only the blocks all three
 *      renders agree on are written. Nothing here knows which games are
 *      daily, and that is deliberate: a list of affected games has been
 *      written three times in this repo and each one covered what somebody
 *      had already found and nothing after.
 *
 * simPrerender.mjs is the cheap fence: it fails if a route is missing, if
 * two routes share a document, if a page's own words are absent from it, or
 * if any snapshot pins itself to one build. simPrerenderBoot.mjs is the
 * expensive one: it serves the shipping files to a real browser and checks
 * the app actually takes the page over.
 *
 * Run: npm run build && node scripts/prerender.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PRERENDER_PORT || 4310);
/** how long to let a page draw before the snapshot is taken */
const SETTLE_MS = Number(process.env.PRERENDER_SETTLE || 3500);
/* ROUND 284: THE CLOCK SAMPLES, in days from the real date. Every route is
   drawn once at each and only the blocks all three renders agree on are
   written. Five days crosses a daily rotation without crossing a season, a
   transfer window or a year, which is the same shift playSnapshotDrift
   settled on. Eleven days is a different weekday from both of the others and
   more than a week clear of the first, so a puzzle keyed to the weekday or
   to the week cannot agree with all three by luck.
   All three are always drawn. Drawing the third only where the first two
   disagree would save about ten minutes a run and reopen exactly that hole:
   a page keyed only to the week can agree with itself five days apart, and
   nothing would then ask for the sample that catches it. The run reports
   what the third sample removed over and above the second, so the cost of
   keeping it stays measured rather than assumed. */
const SAMPLE_DAYS = [0, 5, 11];

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('No dist/index.html. Run npm run build first.');
  process.exit(1);
}

/* the routes come from the sitemap, which is already the list of pages
   this site wants indexed. */
const sitemap = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
  .map(m => m[1] || '/')
  .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r));

/* ROUND 278: THE NOINDEXED PAGES ARE PRERENDERED TOO NOW, and the reason is a
   decision that stopped being right without anybody touching it.
 *
 * This used to say that noindexed pages (profile, admin, the password reset,
 * five retired games) are not in the sitemap and must not be prerendered
 * either. That was correct when it was written: a page with no snapshot served
 * the SPA fallback, and the fallback was an empty shell with 43 characters in
 * it. Harmless.
 *
 * Round 257 then moved the home page's content INTO that fallback, because the
 * home page is the one route not prerendered and had nothing for a crawler
 * otherwise. Correct on its own terms, and it turned these nine addresses into
 * nine copies of the home page. Measured against Search Console on 2026-08-23:
 * /guess-nfl-team is sitting in "Crawled, currently not indexed", last looked
 * at in April, which is exactly what an address serving somebody else's content
 * and declaring nothing looks like.
 *
 * The noindex these pages carry only exists after JavaScript runs. Prerendering
 * them puts it in the HTML, where a crawler reads it without rendering, and the
 * clean Search Console status for a page you do not want indexed is "excluded
 * by noindex tag", not the ambiguous bucket that also holds real problems.
 *
 * They are still NOT in the sitemap, and that is the point: a sitemap is a list
 * of pages you are asking for. This is a list of pages you are answering for. */
const hiddenRoutes = (() => {
  const app = readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  const live = [], retired = new Set();
  for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element={\s*(<Navigate\b)?/g)) {
    const r = m[1];
    if (!r.startsWith('/') || r.includes(':') || r === '*') continue;
    if (m[2]) retired.add(r); else live.push(r);
  }
  const submitted = new Set(routes);
  /* a route is hidden when it is live, unsubmitted, and its own page asks not
     to be indexed. All three have to be true: an unsubmitted page that never
     asked for noindex is a mistake in the sitemap, not a page to snapshot. */
  const pagesWithNoindex = new Set();
  for (const f of readdirSync(path.join(ROOT, 'src/pages'))) {
    if (!f.endsWith('.tsx')) continue;
    if (/noindex/.test(readFileSync(path.join(ROOT, 'src/pages', f), 'utf8'))) {
      pagesWithNoindex.add(f.replace(/\.tsx$/, ''));
    }
  }
  const componentOf = r => {
    const m = app.match(new RegExp(`<Route\\s+path="${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+element={\\s*<(\\w+)`));
    return m ? m[1] : null;
  };
  return live.filter(r => !submitted.has(r) && !retired.has(r))
    .filter(r => { const c = componentOf(r); return c && pagesWithNoindex.has(c); });
})();
if (hiddenRoutes.length) console.log(`  plus ${hiddenRoutes.length} noindexed routes that are not submitted: ${hiddenRoutes.join(', ')}`);

let unique = [...new Set([...routes, ...hiddenRoutes])];
/* PRERENDER_ONLY=/a,/b limits the run while measuring a change.

   Round 325: a named route the sitemap does not know is a HARD REFUSAL,
   not a silent drop. Twice in three rounds (the two new game rounds) a
   scoped run named a brand new route before the sitemap had been
   regenerated with it, the filter quietly dropped it, the page shipped
   with no snapshot, and four separate fences had to catch the hole from
   four angles after the fact. The documented build:seo order (routes
   first, then prerender) prevents it, and this makes forgetting that
   order fail in one obvious line instead of four confusing ones. */
if (process.env.PRERENDER_ONLY) {
  const want = new Set(process.env.PRERENDER_ONLY.split(',').map(x => x.trim()));
  const known = new Set(unique);
  const unknown = [...want].filter(r => !known.has(r));
  if (unknown.length) {
    console.error(`PRERENDER_ONLY names route(s) the sitemap does not know: ${unknown.join(', ')}.`);
    console.error('This script reads dist/sitemap.xml, and the build is what copies public/sitemap.xml into dist.');
    console.error('New route order: node scripts/genSitemap.mjs --routes-only, then npm run build, THEN prerender.');
    console.error('Round 328 hit this with the routes-only pass run after the build: public knew the route, dist did not.');
    process.exit(1);
  }
  unique = unique.filter(r => want.has(r));
}
/* ROUND 257: THE HOME PAGE IS NOT PRERENDERED, and that is deliberate.
   Vite generates dist/index.html from the repo's own index.html template on
   whatever machine builds the site, so it always carries the correct hashed
   asset tags and it already carries a static block for crawlers. Writing a
   snapshot over it here does nothing for the live site (the host rebuilds
   it) and did two kinds of damage locally: the SPA fallback this script
   serves is dist/index.html, so the run's own output for '/' turned the
   fallback into a finished document and 32 routes captured the HOME PAGE's
   text under their own names; and once the snapshot stripped its hashed
   tags, the fallback stopped booting the app entirely, so the boot check
   had nothing to read the real tags off. Caught by three unrelated routes
   coming out at exactly 17,578 bytes, then by the boot harness. */
unique = unique.filter(r => r !== '/');
console.log(`prerendering ${unique.length} routes from the sitemap`);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.woff2': 'font/woff2',
};
const isFile = f => { try { return statSync(f).isFile(); } catch { return false; } };
/* THE SPA SHELL, READ ONCE, BEFORE THIS RUN WRITES ANYTHING.
   Round 257: this used to be re-read off disk on every request, and the run
   overwrites dist/index.html with its own snapshot of the home page, so from
   that moment on the fallback served a finished document instead of the app
   shell. Every route after it captured the home page's words under its own
   name. Holding the real shell in memory makes that impossible whatever the
   run writes. */
const SHELL = readFileSync(path.join(DIST, 'index.html'));
/* And it has to BE the shell. Running this script twice without rebuilding
   would otherwise read back its own home page snapshot and repeat the exact
   failure this constant exists to prevent, so it refuses instead. Vite always
   injects a hashed entry module into the real shell. */
if (!/<script[^>]+type="module"[^>]+src="\/assets\//.test(SHELL.toString('utf8'))) {
  console.error('dist/index.html is not a fresh vite shell (no hashed entry module).');
  console.error('Run npm run build again before prerendering.');
  process.exit(1);
}
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(DIST, p);
  /* a route this run already prerendered exists as a DIRECTORY, so the
     plain existsSync check served a folder and the read threw after the
     headers were out. Ask for a file, and read the bytes BEFORE writing
     any header, so a failure can still answer honestly. */
  if (p !== '/' && isFile(f)) {
    let body;
    try { body = readFileSync(f); } catch { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
    res.end(body);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(SHELL);
});
await new Promise(r => server.listen(PORT, r));

/* Round 257: the browser is recreated rather than assumed. One 122 route
   run died at route 108 with "Target page, context or browser has been
   closed" and reported 14 failures, every one of which would have kept its
   PREVIOUS snapshot on disk. The run already exits non zero on any failure,
   so nothing stale could ship silently, but a whole rerun to recover one
   dead browser is a waste, and a fresh page every 25 routes keeps the
   memory flat enough that it stops happening. */
let browser = null;
/* one page per clock sample, all in the same browser */
let pages = [];

/* ROUND 284: THE PAGE'S OWN CLOCK IS MOVED, NOT THE MACHINE'S. Date is
   replaced before any of the app's code runs, the same shape
   playSnapshotDrift proved in Round 280, so everything the page works out
   from the date, a puzzle seed, a weekday, a "today" label, is worked out
   from the shifted one. Timers are untouched, so the page draws exactly as
   it would on that day.

   The same script sets the flag the Round 282 soft 404 marker reads. That
   marker decides a document is a dead address by the ABSENCE of a snapshot
   block, and this server hands every route the bare template on purpose, so
   without the flag every page rendered here looked like a dead address and
   the noindex went into all 133 saved files. It was caught before it shipped
   by the fence in simPrerender, section 14, which is the check to keep. */
/* NEGATIVE CONTROL: PRERENDER_CONTROL=noflag leaves the flag unset, which
   reproduces the near miss on purpose. The documents it writes go to dist/
   only, never to public/, so nothing it produces can ship; they exist so that
   simPrerender section 14 can be seen to fail on real output rather than on
   a string somebody typed into a test. Pair it with PRERENDER_ONLY. */
const CONTROL = process.env.PRERENDER_CONTROL || '';
if (CONTROL && CONTROL !== 'noflag') {
  console.error(`PRERENDER_CONTROL=${CONTROL} is not a control this script knows`);
  process.exit(1);
}
if (CONTROL) console.log('NEGATIVE CONTROL ON: the prerender flag is NOT set, output goes to dist/ only, and section 14 of simPrerender must go red on it');

/* ROUND 284, SECOND HALF OF THE SAME RULE: RANDOM CONTENT IS MADE THE SAME
   ON EVERY BUILD. Some pages pick from a pool with Math.random rather than
   the date (the Connect 4 boards, for one), and the clock samples only catch
   that by luck: two runs of this script on the same day disagreed about
   /mlb-connect-4, because on one of them all three samples happened to draw
   the same board out of a small pool and the line was written. A pick that
   is random is not false, so it does not need dropping; what it must not do
   is change from one build to the next, which rewrites the file and re-dates
   the page for no reason. Math.random is therefore replaced with a seeded
   generator, the same seed on every sample and every run, before any page
   code runs. Date driven content is still caught by the three clocks; random
   content is simply frozen the same way every time. */
const RANDOM_SEED = 284;
const clockScript = days => `(() => {
  ${CONTROL === 'noflag' ? '' : 'window.__DUKB_PRERENDER__ = true;'}
  (function () {
    let s = ${RANDOM_SEED} | 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const SHIFT = ${days} * 86400000;
  if (SHIFT === 0) return;
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(RealDate.now() + SHIFT); };
  D.now = () => RealDate.now() + SHIFT;
  D.parse = RealDate.parse;
  D.UTC = RealDate.UTC;
  D.prototype = RealDate.prototype;
  globalThis.Date = D;
})();`;

async function freshPage() {
  for (const p of pages) { try { await p.context().close(); } catch { /* already gone */ } }
  pages = [];
  if (browser) { try { await browser.close(); } catch { /* already gone */ } }
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  });
  for (const days of SAMPLE_DAYS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(clockScript(days));
    const page = await ctx.newPage();

    /* No visitor's state may end up in a file every visitor receives. The
       first full pass baked "Your stadium empire: $54 banked" into the ticker
       on every page, which is this browser's own save talking. Storage is
       wiped before each document is drawn, so the snapshot shows only what a
       brand new visitor would see. */
    await page.addInitScript(() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked, nothing to clear */ }
    });

    /* rule 1: let live data hang rather than land. A fulfilled request bakes
       today's data into a file that outlives today; an aborted one trips the
       fail-closed error cards into the snapshot. Hanging leaves the normal
       loading state, which is honest and dateless. */
    await page.route('**://*.supabase.co/**', () => { /* never settled on purpose */ });
    await page.route('**://*.googletagmanager.com/**', r => r.abort());
    await page.route('**://pagead2.googlesyndication.com/**', r => r.abort());
    pages.push(page);
  }
}

await freshPage();

/* Draw one route on one of the clock samples and hand back its head and
   its blocks. The page is looked up by index each time rather than held,
   because the retry below replaces every page in the browser. */
async function draw(sample, route, url) {
  try {
    await pages[sample].goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  } catch (first) {
    /* one retry on a fresh browser: a dead browser fails every remaining
       route, and losing the whole tail to one crash is how 14 stale
       snapshots nearly shipped */
    console.error(`   retrying ${route} on a fresh browser`);
    await freshPage();
    await pages[sample].goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  }
  const page = pages[sample];
  /* wait for the app to actually mount something, then let the rest of
     the page paint. #dukb-main is the game shell; the plain pages use
     their own containers, so a body with real text is the fallback. */
  await page.waitForFunction(
    () => (document.body?.innerText ?? '').trim().length > 200,
    { timeout: 20000 },
  ).catch(() => {});
  /* ROUND 284: THE PAGE SAYS WHEN ITS GUIDE HAS LANDED, and the capture waits
     for it. The guide and its FAQ structured data arrive in a lazy chunk, and
     until they do the block renders a generic three question fallback. A
     fixed settle was racing that chunk: the first three sample run caught
     five routes whose head disagreed with itself, every one of them the FAQ
     markup captured before the chunk on one sample and after it on another.
     The single sample prerender had been running the same race for twenty
     eight rounds with nothing to notice it. GameSeoContent now marks its
     section data-seo-content="loading" until the answer is in (ready covers
     both a guide and a route that has none), and this waits for the mark to
     clear. Pages without the block have nothing to wait for. */
  await page.waitForFunction(
    () => !document.querySelector('[data-seo-content="loading"]'),
    { timeout: 15000 },
  ).catch(() => {
    /* said out loud, because a capture taken with the guide still in flight
       is the generic three question fallback wearing the page's name, and
       the head agreement check downstream is the only thing that would
       otherwise notice */
    console.error(`   ${route} (day ${SAMPLE_DAYS[sample]}): the guide had not landed after 15s, capturing anyway`);
  });
  /* ROUND 355: WAIT FOR THE HEAD TO STOP MOVING, NOT FOR A FIXED NUMBER OF
     MILLISECONDS.
     Round 284 closed one race by having the page announce when its guide had
     landed, and that check still passes on every sample. A second race
     survived it: Helmet writes the structured data into the head from an
     effect, so the guide's own marker can clear a tick before its FAQ JSON-LD
     is actually in the document. Under load that tick matters. Two routes lost
     their snapshot on every full run, never the same two (alphabet-sprint and
     golf-higher-lower on one run, perfect-season-nhl and hall-of-champions on
     another), and the reported difference was always the same shape: the FAQ
     block PRESENT in one clock sample and ABSENT in another, rather than
     carrying different content, which is what a real calendar dependency would
     look like. Run either of those routes on its own and it prerenders
     perfectly, which is the tell.
     The cost was worse than the noise: a refused route keeps whatever snapshot
     it already had, so two pages a run silently held a stale document, and the
     non-zero exit stopped build:seo before it regenerated the sitemap.
     So the capture now waits for the head to be the same twice in a row before
     trusting it. Pages whose head was never going to move settle on the first
     comparison and pay one interval for it. */
  await page.waitForFunction(
    () => {
      const now = document.head.innerHTML.length + ':' + document.querySelectorAll('script[type="application/ld+json"]').length;
      const settled = window.__dukbHeadPrev === now;
      window.__dukbHeadPrev = now;
      return settled;
    },
    { timeout: 12000, polling: 250 },
  ).catch(() => {
    console.error(`   ${route} (day ${SAMPLE_DAYS[sample]}): the head was still changing after 12s, capturing anyway`);
  });
  await page.waitForTimeout(SETTLE_MS);
  /* THE SNAPSHOT IS DELIBERATELY LIGHT. A full DOM capture measured
     96KB a page, 11.6MB across the site, which is far too heavy to
     carry in the repo and would ship in every round's zip forever. A
     crawler does not need the app's markup, it needs the words, the
     headings, the links and the head. So the snapshot keeps the built
     <head> exactly as vite produced it (title, description, canonical,
     JSON-LD, the script tags) and rebuilds the body as plain semantic
     HTML holding the page's own readable content in document order.
     Nothing is added: every string below came off the rendered page.
     React clears #root on mount, so a real visitor sees this for the
     instant before the app draws over it. */
  const captured = await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll('[role="dialog"]'))) el.remove();
      /* Round 258: anything the app marks data-no-prerender is live or dated
         and must not be frozen into a file that will still be on disk next
         month. The ticker's real world fixture lines are the first user of
         this: "Italian Grand Prix at Monza, in nine days" is true for about
         a day. Same principle as leaving the database requests hanging, just
         for data that lives in the bundle rather than behind a fetch. */
      for (const el of Array.from(document.querySelectorAll('[data-no-prerender]'))) el.remove();
      const esc = t => String(t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const seen = new Set();
      const parts = [];
      const visible = el => {
        const st = window.getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05;
      };
      const SEL = 'h1, h2, h3, h4, p, li, a[href], td, th, blockquote';
      const BLOCK = 'h1, h2, h3, h4, p, li, td, th, blockquote';

      /* ROUND 269, TWO FIXES TO THIS LOOP, BOTH MEASURED FIRST.

         ONE: A LINK INSIDE A PARAGRAPH WAS WRITTEN OUT TWICE. This used to
         take each element's innerText, which flattens any link inside it into
         plain words, and then emit that same link again on its own as a bare
         anchor. Measured across all 121 snapshots on 2026-08-22: 161 anchors
         duplicated that way, every document affected, worst case six on
         /about. Now a block is rebuilt with its links kept where they belong,
         and those links are not emitted a second time. The link graph is
         unchanged, because an href inside a paragraph is still an href.

         TWO: ANY ELEMENT OVER 1200 CHARACTERS WAS SILENTLY THROWN AWAY. The
         cap was there to stop a giant wrapper dumping the whole page into the
         snapshot, which is a real thing to guard against, but length is the
         wrong test for it. It was costing /whats-new six of its 112 entries,
         and on a changelog the longest entries are the biggest features: the
         Soccer Career squad card, the full browser inspection and the search
         visibility pass were all missing from the page a crawler receives.
         The test is now about SHAPE: an element that CONTAINS another block
         element is a wrapper and is still capped, while a leaf keeps its text
         up to a ceiling high enough that no honest paragraph reaches it. */
      const WRAPPER_CAP = 1200;
      const LEAF_CAP = 8000;

      const consumed = new Set();
      const inline = el => {
        let out = '';
        const walk = node => {
          for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === 3) { out += esc(child.nodeValue); continue; }
            if (child.nodeType !== 1) continue;
            if (child.tagName === 'A') {
              const href = child.getAttribute('href') || '';
              const t = (child.innerText || '').trim().replace(/\s+/g, ' ');
              if (t && (href.startsWith('/') || href.startsWith('http'))) {
                out += `<a href="${esc(href)}">${esc(t)}</a>`;
                consumed.add(child);
                continue;
              }
            }
            walk(child);
          }
        };
        walk(el);
        return out.replace(/\s+/g, ' ').trim();
      };

      /* ROUND 286: A BLOCK KNOWS WHETHER IT IS THE PAGE OR THE SITE. The
         header, the ticker, the game navbar, the footer and the cookie banner
         mark themselves data-site-chrome, and every block captured from inside
         one of them is written wrapped in <div data-site-chrome>. The words
         still ship (the footer's links are the site's link graph), but the
         sitemap generator leaves those wrappers out of the text it dates a
         page by, so a footer change stops re-dating 126 pages. Explicit marks
         rather than landmark tags on purpose: GameShell draws each game's own
         title inside a <header>, and that is the page, not the furniture. */
      const isChrome = el => !!el.closest('[data-site-chrome]');
      for (const el of Array.from(document.querySelectorAll(SEL))) {
        if (!visible(el)) continue;
        const text = (el.innerText || '').trim().replace(/\s+/g, ' ');
        if (!text) continue;
        const tag = el.tagName.toLowerCase();
        const chrome = isChrome(el);
        if (tag === 'a') {
          /* already written out inside the paragraph or list item it sits in */
          if (consumed.has(el)) continue;
          const href = el.getAttribute('href') || '';
          if (!href.startsWith('/') && !href.startsWith('http')) continue;
          if (text.length > LEAF_CAP) continue;
          const key = 'a|' + href + '|' + text;
          if (seen.has(key)) continue;
          seen.add(key);
          parts.push({ s: `<a href="${esc(href)}">${esc(text)}</a>`, chrome });
          continue;
        }
        const cap = el.querySelector(BLOCK) ? WRAPPER_CAP : LEAF_CAP;
        if (text.length > cap) continue;
        const html = inline(el);
        if (!html) continue;
        const key = tag + '|' + html;
        if (seen.has(key)) continue;
        seen.add(key);
        const out = tag === 'td' || tag === 'th' ? 'p' : tag === 'li' ? 'li' : tag;
        parts.push({ s: `<${out}>${html}</${out}>`, chrome });
      }
      /* the head is copied as built, minus the runtime-injected <style>
         blocks: they measured 29KB a page (four fifths of the file) and
         are duplicates of the linked stylesheet the app loads anyway. */
      let head = document.head.innerHTML.replace(/<style[\s\S]*?<\/style>/gi, '');
      /* ROUND 257, AND THIS ONE WOULD HAVE KILLED THE SITE.
         The first version of this script copied the head EXACTLY as vite
         built it, hashed asset tags included, so every snapshot carried
         <script src="/assets/index-CRgX024h.js">. Those snapshots live in
         public/ and are copied verbatim by whatever build runs next, and
         that build produces a DIFFERENT hash. Proved in a headless browser
         on 2026-08-21: serving a fresh build with the previous snapshot,
         /soccer-career 404s on the entry bundle and on every lazy chunk,
         and #root's first child is still the snapshot's own markup. The app
         never boots. Every game on the site would be dead for anyone
         arriving on a deep link, which is a far worse outcome than the
         indexing problem this whole feature exists to fix.
         So no hashed path is written into a snapshot at all. Everything
         under /assets is stripped here and /prerender-boot.js, a stable
         path that no build ever renames, reads the real tags off the live
         root document and injects them. */
      const doc = document.implementation.createHTMLDocument('');
      doc.head.innerHTML = head;
      for (const el of Array.from(doc.head.querySelectorAll('[src], [href]'))) {
        const url = el.getAttribute('src') || el.getAttribute('href') || '';
        if (url.startsWith('/assets/')) el.remove();
      }
      /* ROUND 284: THE STRUCTURED DATA IS WRITTEN IN A STABLE ORDER. Helmet
         emits head tags in the order the components that own them mounted,
         and that order moved this round when the guide block started
         declaring its readiness: 79 documents changed with not one word in
         them different, because two JSON-LD scripts had swapped places. The
         sitemap fingerprint already sorts these blocks before hashing, so no
         date moved, but a diff that big hides the seventeen files that really
         changed. Two builds of an unchanged page must produce the same bytes,
         so the blocks are sorted here by their own text, in place, and the
         mount order can never be seen in a file again. */
      const lds = Array.from(doc.head.querySelectorAll('script[type="application/ld+json"]'));
      if (lds.length > 1) {
        const mark = doc.createComment('ld');
        lds[0].parentNode.insertBefore(mark, lds[0]);
        for (const el of lds) el.remove();
        lds.sort((x, y) => (x.textContent < y.textContent ? -1 : x.textContent > y.textContent ? 1 : 0));
        for (const el of lds) mark.parentNode.insertBefore(el, mark);
        mark.remove();
      }
      head = doc.head.innerHTML;
      return { head, parts };
    });
  /* Park the page. An idle sample left on a game page keeps its ticker, its
     countdown and its animations running while the other two samples draw,
     which on a small machine is enough to make the settle window mean
     different things to different samples. */
  await page.goto('about:blank').catch(() => {});
  return captured;
}

let written = 0, failed = 0, done = 0, refused = 0;
/* what the clock samples removed, for the summary line */
let volatileRoutes = 0, droppedBySecond = 0, droppedByThird = 0, headRedraws = 0, headRaces = 0;
for (const route of unique) {
  const url = `http://127.0.0.1:${PORT}${route}`;
  if (done > 0 && done % 25 === 0) await freshPage();
  done += 1;
  try {
    let samples = [];
    for (let s = 0; s < SAMPLE_DAYS.length; s++) samples.push(await draw(s, route, url));
    /* THE HEAD HAS TO AGREE WITH ITSELF. Nothing in it is meant to depend on
       the date, so a head that moves between two clocks is a defect this run
       does not know how to write around: it fails the route rather than
       picking one and hoping.

       One redraw first, and it is a redraw of every sample rather than a
       vote. Two full runs of this script each turned up a couple of routes
       whose heads disagreed, never the same routes twice, and none of them
       could be made to disagree on a quiet machine: a transient, not the
       calendar. A real date dependence survives a redraw; a race does not.
       Whatever differed is printed either way, so the next transient can be
       named rather than guessed at. */
    const headsAgree = xs => xs.every(x => x.head === xs[0].head);
    if (!headsAgree(samples)) {
      const tags = h => h.match(/<[^>]+>|[^<]+/g) || [];
      const a = tags(samples[0].head);
      for (let i = 1; i < samples.length; i++) {
        const b = tags(samples[i].head);
        const onlyA = a.filter(t => !b.includes(t)).slice(0, 3);
        const onlyB = b.filter(t => !a.includes(t)).slice(0, 3);
        if (onlyA.length || onlyB.length) {
          console.error(`   ${route}: head differs between day ${SAMPLE_DAYS[0]} and day ${SAMPLE_DAYS[i]}`);
          for (const t of onlyA) console.error(`      day ${SAMPLE_DAYS[0]} only: ${t.slice(0, 160)}`);
          for (const t of onlyB) console.error(`      day ${SAMPLE_DAYS[i]} only: ${t.slice(0, 160)}`);
        }
      }
      headRedraws += 1;
      await freshPage();
      samples = [];
      for (let s = 0; s < SAMPLE_DAYS.length; s++) samples.push(await draw(s, route, url));
      if (!headsAgree(samples)) {
        /* ROUND 355: PRESENCE IS A RACE, CONFLICT IS THE CALENDAR, and only
           one of those is a reason to throw the page away.
           Before this, any surviving disagreement was called a date dependent
           head and the route kept whatever stale snapshot it already had. The
           disagreements actually being seen were never a block saying two
           different things on two dates; they were always a block PRESENT in
           one sample and ABSENT in another, the affected routes changed on
           every run, and either one prerendered perfectly when run alone. That
           is Helmet writing structured data from an effect and one sample
           capturing a beat early, not the calendar.
           The two are now told apart by shape. If one sample's head contains
           everything the others contain plus extra, the others had simply not
           received the extra yet, and the fullest head is the true one. If two
           samples each hold something the other lacks, they genuinely
           disagree, which is the Round 282 case this check exists for: refuse,
           loudly, exactly as before. */
        const tagsOf = h => (h.match(/<[^>]+>|[^<]+/g) || []).filter(t => t.trim());
        const lists = samples.map(x => tagsOf(x.head));
        let fullest = 0;
        for (let i = 1; i < lists.length; i++) if (lists[i].length > lists[fullest].length) fullest = i;
        let superset = true;
        for (let i = 0; i < lists.length && superset; i++) {
          if (i === fullest) continue;
          const pool = lists[fullest].slice();
          for (const t of lists[i]) {
            const at = pool.indexOf(t);
            if (at === -1) { superset = false; break; }
            pool.splice(at, 1);
          }
        }
        if (!superset) {
          failed += 1;
          console.error(`   NOT WRITTEN ${route}: its head changes with the clock, so no one version of it is true for long`);
          continue;
        }
        headRaces += 1;
        console.error(`   ${route}: the heads differ only by what one sample had not received yet, so the fullest (day ${SAMPLE_DAYS[fullest]}) is used`);
        if (fullest !== 0) samples[0] = { ...samples[0], head: samples[fullest].head };
      } else {
        console.error(`   ${route}: the heads agreed on the redraw, so that was a race and not the calendar`);
      }
    }
    /* ONLY THE BLOCKS EVERY SAMPLE AGREES ON ARE WRITTEN, in the first
       sample's order. A block that appears on one date and not another is,
       by construction, something a file written once cannot hold, and it
       does not matter whether anybody thought of it in advance. The two
       counts are kept apart so the third sample's own contribution is
       visible in the summary. */
    const first = samples[0].parts;
    const inSecond = new Set(samples[1].parts.map(p => p.s));
    const afterSecond = first.filter(p => inSecond.has(p.s));
    let keep = afterSecond;
    for (const later of samples.slice(2)) {
      const inLater = new Set(later.parts.map(p => p.s));
      keep = keep.filter(p => inLater.has(p.s));
    }
    const lostToSecond = first.length - afterSecond.length;
    const lostToThird = afterSecond.length - keep.length;
    if (lostToSecond + lostToThird > 0) {
      volatileRoutes += 1;
      droppedBySecond += lostToSecond;
      droppedByThird += lostToThird;
      const kept = new Set(keep.map(p => p.s));
      const gone = first.filter(p => !kept.has(p.s));
      const show = gone.slice(0, 2).map(p => JSON.stringify(p.s.replace(/<[^>]+>/g, '').slice(0, 70))).join(', ');
      console.log(`   ${route}: ${gone.length} block(s) change with the date and were left out: ${show}`);
    }
    /* runs of site chrome are wrapped so the sitemap can look past them */
    const lines = [];
    let open = false;
    for (const p of keep) {
      if (p.chrome && !open) { lines.push('<div data-site-chrome>'); open = true; }
      if (!p.chrome && open) { lines.push('</div>'); open = false; }
      lines.push(p.s);
    }
    if (open) lines.push('</div>');
    const payload = { head: samples[0].head, body: lines.join('\n') };
    const html = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      payload.head,
      /* The stripped stylesheet comes back through the boot script, which
         means a fraction of a second of unstyled document first. Two lines
         of theme colour make that moment look like the site loading rather
         than a white page, and they cost nothing.

         ROUND 271: THE PADDING USED TO BE ON html AND body AND IT NEVER LEFT.
         This style block sits in the head for the life of the page. Tailwind's
         reset zeroes body MARGIN and says nothing about body PADDING, so
         16px on each of html and body survived the real stylesheet loading,
         survived React mounting, and squeezed the live app by 64 pixels on
         every one of the 121 prerendered pages. Measured on the live site at
         390 pixels wide: body 358, and the home page, which is the one route
         that is not prerendered, 390. It had been shipping since Round 257.
         Nothing caught it because every check for a layout defect looks for
         content WIDER than the screen, and this made everything narrower. It
         only ever surfaced as an overflow on /leaderboard, where the header
         could not fit into the reduced width, and only once Round 271 taught
         the sweep to open pages that are not games.

         The padding now lives on a wrapper INSIDE #root, which React throws
         away the instant it mounts, so it lasts exactly as long as it is
         useful and not one frame longer. html and body are pinned to zero on
         purpose rather than left unset, so a future reset that adds padding
         cannot bring this back. */
      '<style>html,body{background:#0a0a0b;color:#fafafa;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:0}a{color:#7dd3fc}#dukb-snapshot{padding:16px}</style>',
      /* Round 314: the calm boot, baked in for future prerenders. The build
         plugin injects the same pair into existing snapshots (vite.config.ts),
         so the rule holds whether a snapshot is old or new; a duplicate of an
         identical rule is harmless. Cap and dim until React mounts, noscript
         lifts it for a browser that never will. */
      '<style>#dukb-snapshot{max-height:100vh;overflow:hidden;opacity:.45}</style>',
      '<noscript><style>#dukb-snapshot{max-height:none;overflow:visible;opacity:1}</style></noscript>',
      '<script src="/prerender-boot.js" defer></script>',
      '</head>',
      '<body>',
      '<div id="root">',
      '<div id="dukb-snapshot">',
      payload.body,
      '</div>',
      '</div>',
      '</body>',
      '</html>',
      '',
    ].join('\n');
    /* The site is BUILT ON THE HOST, not here, so a snapshot written only
       into dist/ would be thrown away by the next deploy. They go into
       public/ instead, which vite copies verbatim into dist, so they
       survive a build anywhere. The root is the one exception: vite
       generates dist/index.html from the repo's index.html template, and
       a public/index.html would collide with it, so the home page keeps
       the shell and is covered by the static block in index.html. */
    /* ROUND 278: A SNAPSHOT THAT IS NOT THIS PAGE IS NOT WRITTEN.
     *
     * The captured head has to canonicalise to the route being rendered. If it
     * does not, the app navigated somewhere else while the snapshot was being
     * taken and what came back is another page's content wearing this page's
     * file name. Found immediately: /profile requires an account, so signed out
     * it lands on the home page, and the first run of this wrote the home page's
     * title and a canonical to / into public/profile/index.html. That would have
     * shipped a permanent copy of the home page at /profile, which is the exact
     * shape of the Round 257 bug where 32 routes captured the home page's text
     * under their own names.
     *
     * Fail closed: nothing is written and the route is counted as failed, so a
     * run that hits this cannot look like a clean run. */
    const canon = (html.match(/<link[^>]+rel="canonical"[^>]+href="[^"]*?([^"/]*)"/) || [])[0] || '';
    const wantUrl = `https://douknowball.com${route}`;
    if (!canon.includes(`href="${wantUrl}"`)) {
      /* A SITEMAP route doing this is a defect and counts as a failure. A
         hidden route doing it is expected for the three that need an account:
         /admin/login, /admin/reports and /profile all land on the home page
         when signed out, which is the correct behaviour and simply means there
         is no page here to photograph. scripts/genHiddenStubs.mjs gives those a
         small noindex document instead, so the intent still reaches a crawler
         without publishing a signed out admin screen. */
      const expected = hiddenRoutes.includes(route);
      if (!expected) failed += 1; else refused += 1;
      console.error(`   NOT WRITTEN ${route}: it canonicalises somewhere else, so the app navigated away and this is not that page${expected ? ' (expected, it needs an account)' : ''}`);
      continue;
    }
    for (const base of (CONTROL ? [DIST] : [DIST, PUBLIC])) {
      const dir = path.join(base, route.replace(/^\//, ''));
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'index.html'), html);
    }
    written += 1;
    if (written % 20 === 0) console.log(`   ${written}/${unique.length}`);
  } catch (e) {
    failed += 1;
    console.error(`   FAILED ${route}: ${String(e).split('\n')[0].slice(0, 90)}`);
  }
}

await browser.close();
server.close();

console.log(`prerendered ${written} routes, ${failed} failed${refused ? `, ${refused} hidden routes refused because they need an account` : ''}`);
console.log(`clock samples at ${SAMPLE_DAYS.join(', ')} days: ${volatileRoutes} route(s) carried date dependent blocks, ${droppedBySecond} removed by the second sample, ${droppedByThird} more by the third`);
if (headRedraws) console.log(`${headRedraws} route(s) needed a redraw because their heads disagreed the first time`);
if (headRaces) console.log(`${headRaces} of those were a sample capturing before Helmet had finished, so the fullest head was used`);
if (failed > 0) process.exit(1);
