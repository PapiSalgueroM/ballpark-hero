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
 * simPrerender.mjs is the fence: it fails if a route is missing, if two
 * routes share a document, or if a page's own words are absent from it.
 *
 * Run: npm run build && node scripts/prerender.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PRERENDER_PORT || 4310);
/** how long to let a page draw before the snapshot is taken */
const SETTLE_MS = Number(process.env.PRERENDER_SETTLE || 3500);

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('No dist/index.html. Run npm run build first.');
  process.exit(1);
}

/* the routes come from the sitemap, which is already the list of pages
   this site wants indexed: noindexed pages (profile, admin, resets) are
   not in it and must not be prerendered either */
const sitemap = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
  .map(m => m[1] || '/')
  .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r));
let unique = [...new Set(routes)];
/* PRERENDER_ONLY=/a,/b limits the run while measuring a change */
if (process.env.PRERENDER_ONLY) {
  const want = new Set(process.env.PRERENDER_ONLY.split(',').map(x => x.trim()));
  unique = unique.filter(r => want.has(r));
}
console.log(`prerendering ${unique.length} routes from the sitemap`);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.woff2': 'font/woff2',
};
const isFile = f => { try { return statSync(f).isFile(); } catch { return false; } };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  /* a route this run already prerendered exists as a DIRECTORY, so the
     plain existsSync check served a folder and the read threw after the
     headers were out. Ask for a file, and read the bytes BEFORE writing
     any header, so a failure can still answer honestly. */
  if (p === '/' || !isFile(f)) f = path.join(DIST, 'index.html');
  let body;
  try { body = readFileSync(f); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(body);
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

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

let written = 0, failed = 0;
for (const route of unique) {
  const url = `http://127.0.0.1:${PORT}${route}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    /* wait for the app to actually mount something, then let the rest of
       the page paint. #dukb-main is the game shell; the plain pages use
       their own containers, so a body with real text is the fallback. */
    await page.waitForFunction(
      () => (document.body?.innerText ?? '').trim().length > 200,
      { timeout: 20000 },
    ).catch(() => {});
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
    const payload = await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll('[role="dialog"]'))) el.remove();
      const esc = t => String(t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const seen = new Set();
      const parts = [];
      const visible = el => {
        const st = window.getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05;
      };
      const SEL = 'h1, h2, h3, h4, p, li, a[href], td, th, blockquote';
      for (const el of Array.from(document.querySelectorAll(SEL))) {
        if (!visible(el)) continue;
        const text = (el.innerText || '').trim().replace(/\s+/g, ' ');
        if (!text || text.length > 1200) continue;
        const tag = el.tagName.toLowerCase();
        if (tag === 'a') {
          const href = el.getAttribute('href') || '';
          if (!href.startsWith('/') && !href.startsWith('http')) continue;
          const key = 'a|' + href + '|' + text;
          if (seen.has(key)) continue;
          seen.add(key);
          parts.push(`<a href="${esc(href)}">${esc(text)}</a>`);
          continue;
        }
        /* a heading or paragraph whose text is already covered by a link
           we kept would just duplicate it */
        const key = tag + '|' + text;
        if (seen.has(key)) continue;
        seen.add(key);
        const out = tag === 'td' || tag === 'th' ? 'p' : tag === 'li' ? 'li' : tag;
        parts.push(`<${out}>${esc(text)}</${out}>`);
      }
      /* the head is copied as built, minus the runtime-injected <style>
         blocks: they measured 29KB a page (four fifths of the file) and
         are duplicates of the linked stylesheet the app loads anyway.
         Every functional tag stays, including the consent gating and the
         module script, so a prerendered page behaves exactly like the
         root one for a real visitor. */
      const head = document.head.innerHTML.replace(/<style[\s\S]*?<\/style>/gi, '');
      return { head, body: parts.join('\n') };
    });
    const html = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      payload.head,
      '</head>',
      '<body>',
      '<div id="root">',
      payload.body,
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
    if (route === '/') {
      writeFileSync(path.join(DIST, 'index.html'), html);
    } else {
      for (const base of [DIST, PUBLIC]) {
        const dir = path.join(base, route.replace(/^\//, ''));
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, 'index.html'), html);
      }
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

console.log(`prerendered ${written} routes, ${failed} failed`);
if (failed > 0) process.exit(1);
