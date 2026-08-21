/**
 * Round 257 harness (number 107): a prerendered page still boots the app.
 *
 * THE BUG THIS EXISTS FOR, and it is the worst one this project has come
 * close to shipping. Round 256 prerendered all 122 routes so a crawler could
 * read the site without JavaScript, and it copied vite's built <head> into
 * each snapshot exactly as it stood, hashed asset tags included. Those
 * snapshots live in public/ and are copied verbatim into whatever build runs
 * next, and that build names its bundle differently. Reproduced in a
 * headless browser on 2026-08-21: a fresh build served with the previous
 * snapshot answers /soccer-career with 404s on the entry bundle and on every
 * lazy chunk, and #root's first child is still the snapshot's own markup.
 * The page has words on it and not one thing on it works. Every game on the
 * site would have been dead for anyone arriving from a search result, which
 * is a far worse outcome than the indexing problem the feature was solving.
 *
 * The fix is that no snapshot carries a hashed path at all: /prerender-boot.js
 * has a stable name, reads the real tags off the live root document and
 * injects them. This file proves both halves, and it proves them the only way
 * that counts, which is by serving the exact files that ship and looking at
 * what a browser does with them:
 *
 *   1. THE SHIPPING FILES CARRY NO HASHES. Every snapshot in public/ is read
 *      and must contain no /assets/ reference at all, and must reference the
 *      stable boot script. This is the property that makes a snapshot survive
 *      a build it has never seen.
 *   2. THE APP ACTUALLY BOOTS. public/ snapshots are served alongside dist/
 *      assets, which is precisely the host's arrangement, and a sample of
 *      routes is loaded for real. No request may fail, and #root must end up
 *      holding the app rather than the snapshot's plain markup.
 *   3. THE WORDS SURVIVE THE HANDOVER. The page must still carry its own
 *      readable content before the boot script runs, because that is the
 *      whole point of prerendering it.
 *
 * Run: node scripts/simPrerenderBoot.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.BOOT_PORT || 4327);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

if (!existsSync(path.join(DIST, 'index.html')) || !existsSync(path.join(DIST, 'assets'))) {
  console.log('NO dist build. RUN npm run build FIRST. NOT CHECKED.');
  process.exit(1);
}

/* ── 1: the shipping files carry no hashed paths ──────────────────────── */
console.log('1) every snapshot in public/ is hash free');
const snapshots = [];
for (const entry of readdirSync(PUBLIC, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const f = path.join(PUBLIC, entry.name, 'index.html');
  if (existsSync(f) && statSync(f).isFile()) snapshots.push([`/${entry.name}`, f]);
}
if (snapshots.length < 50) {
  fail(`only ${snapshots.length} snapshots found in public/, the site has 122 routes`);
}
let bootRefs = 0;
for (const [route, f] of snapshots) {
  const html = readFileSync(f, 'utf8');
  const hashed = html.match(/(?:src|href)="\/assets\/[^"]+"/g);
  if (hashed) {
    fail(`${route} carries ${hashed.length} hashed asset path(s), the first is ${hashed[0]}`);
  }
  if (!html.includes('/prerender-boot.js')) {
    fail(`${route} has no boot script, so nothing will ever inject the real bundle`);
  } else {
    bootRefs += 1;
  }
}
console.log(`   ${snapshots.length} snapshots, ${bootRefs} referencing the stable boot script, 0 hashed paths`);
if (!existsSync(path.join(PUBLIC, 'prerender-boot.js'))) {
  fail('public/prerender-boot.js does not exist, so every snapshot points at a 404');
}

/* ── 2 and 3: serve exactly what ships and watch a browser use it ─────── */
/* public/ answers the routes and dist/ answers the assets, which IS the
   arrangement on the host: the snapshots were written by an older build and
   the bundle belongs to the newest one. */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.woff2': 'font/woff2',
};
const isFile = f => { try { return statSync(f).isFile(); } catch { return false; } };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (p === '/' || p === '/index.html') {
    f = path.join(DIST, 'index.html');
  } else if (isFile(path.join(PUBLIC, p))) {
    f = path.join(PUBLIC, p);
  } else if (isFile(path.join(PUBLIC, p.replace(/^\//, ''), 'index.html'))) {
    f = path.join(PUBLIC, p.replace(/^\//, ''), 'index.html');
  } else if (isFile(path.join(DIST, p))) {
    f = path.join(DIST, p);
  }
  if (!f) { res.writeHead(404); res.end('missing'); return; }
  let body;
  try { body = readFileSync(f); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(body);
});
await new Promise(r => server.listen(PORT, r));

/* the flagship, a plain page and a records page: three different shapes of
   route, so a fix that only works for one of them cannot pass */
const SAMPLE = ['/soccer-career', '/records', '/whats-new'];
const browser = await pw.chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

console.log('2) the app boots on a snapshot served against a build it never saw');
for (const route of SAMPLE) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const broken = [];
  page.on('response', r => { if (r.status() >= 400) broken.push(`${r.status()} ${r.url().replace(`http://127.0.0.1:${PORT}`, '')}`); });
  /* the live database is not this harness's business, and letting it hang
     keeps the check about booting rather than about data */
  await page.route('**://*.supabase.co/**', () => {});
  try {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    /* 3: the words are there BEFORE anything boots */
    const preText = await page.evaluate(() => (document.getElementById('root')?.innerText ?? '').trim().length);
    if (preText < 400) fail(`${route}: the snapshot only carries ${preText} characters before boot`);

    /* wait for React to take the page over */
    const booted = await page.waitForFunction(
      () => !!document.querySelector('#root [class]'),
      { timeout: 20000 },
    ).then(() => true).catch(() => false);

    /* let it settle before counting: the mount fires early and the page is
       still drawing, so a number read at that instant says 63 for a page
       that ends up at 198 and tells you nothing about whether the app is
       really there */
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => ({
      nodes: document.querySelectorAll('#root *').length,
      classed: document.querySelectorAll('#root [class]').length,
      styles: document.querySelectorAll('link[rel="stylesheet"][href^="/assets/"]').length,
      text: (document.getElementById('root')?.innerText ?? '').trim().length,
    }));
    if (!booted) {
      fail(`${route}: the app never mounted, #root still holds the snapshot (${after.nodes} nodes, ${after.classed} with classes)`);
    }
    /* A crashed app inside an error boundary also has classes on it, so the
       check needs a floor. Measured at 198 and 213 styled nodes on a settled
       page, so 80 is under half and still far above any error card. */
    if (booted && after.classed < 80) {
      fail(`${route}: only ${after.classed} styled nodes after boot, which is not the app`);
    }
    /* the stylesheet has to come back too, or the app renders unstyled */
    if (booted && after.styles < 1) fail(`${route}: booted with no stylesheet injected`);
    const assetFails = broken.filter(b => b.includes('/assets/'));
    if (assetFails.length) fail(`${route}: ${assetFails.length} asset request(s) failed, first ${assetFails[0]}`);
    console.log(`   ${route.padEnd(16)} snapshot ${preText} chars, booted ${booted ? 'yes' : 'NO'}, ${after.nodes} nodes / ${after.classed} styled, ${after.styles} stylesheet(s), ${broken.length} failed requests`);
  } catch (e) {
    fail(`${route}: ${String(e).split('\n')[0].slice(0, 110)}`);
  } finally {
    await page.close();
  }
}

await browser.close();
server.close();

console.log('');
if (failures > 0) {
  console.error(`simPrerenderBoot: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simPrerenderBoot: green. The snapshots read like documents and still turn into the app.');
