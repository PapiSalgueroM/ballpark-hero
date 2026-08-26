/**
 * Round 275: every prerendered page carries its own asset tags, and the
 * stylesheet among them does not block the paint.
 *
 * WHAT THIS GUARDS. Round 257 made the committed snapshots hash free on
 * purpose, because they are copied into every future build and a hashed path
 * baked into one goes stale and the app never starts. The cost was that each
 * page had to FIND its assets at runtime: /prerender-boot.js fetches the home
 * page, reads the tags out of its head and injects them. Measured on a phone at
 * slow 4G, /soccer-career: snapshot HTML at 591ms, boot script at 1231ms, the
 * home page it fetches at 1837ms, stylesheet only starting at 1878ms. Three
 * serial round trips on a document the browser has had complete since 591ms.
 *
 * A vite plugin in vite.config.ts now writes the real tags into the dist copies
 * at build time, where the hashes are correct by construction. public/ stays
 * hash free, so nothing in the repo can go stale.
 *
 * THE MEASURED RESULT, three runs a side, median, serving what actually ships:
 *
 *              requests   FCP      playable
 *   before        24      740ms    14519ms
 *   after         23      756ms    13348ms
 *
 * And the version in between, which is why section 3 exists: injecting a plain
 * render blocking <link rel="stylesheet"> gave FCP 2860ms and playable 13353ms.
 * It bought one second of "I can use this" for two seconds of "I can see this",
 * on a document whose entire purpose is that its words are already there. That
 * is a bad trade and the harness now refuses to let anyone make it again.
 *
 * ORDER MATTERS, and getting it wrong looks exactly like the bug. The
 * prerenderer writes its snapshots into BOTH public/ and dist/, so running it
 * after a build overwrites the copies the plugin just injected into and this
 * harness then reports 126 pages with no assets. That is why npm run build:seo
 * ends with a second vite build: the last thing to touch dist/ has to be the
 * build, which is also the only order the host ever uses, since it runs
 * vite build and nothing else.
 *
 * Run: npm run build && node scripts/simSnapshotAssets.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ── 1: nothing hash named is ever committed ──────────────────────────── */
console.log('1) the committed snapshots stay hash free');
let committed = 0, hashed = 0;
for (const e of readdirSync(PUBLIC, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const f = path.join(PUBLIC, e.name, 'index.html');
  if (!existsSync(f) || !statSync(f).isFile()) continue;
  committed += 1;
  if (/(?:src|href)="\/assets\//.test(readFileSync(f, 'utf8'))) {
    hashed += 1;
    if (hashed <= 3) fail(`public/${e.name}/index.html carries a hashed asset path, which goes stale on the next build`);
  }
}
console.log(`   ${committed} committed documents, ${hashed} carrying a hashed path`);

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.log('\n2 TO 5 NOT CHECKED: NO dist BUILD. RUN npm run build FIRST.');
  console.log(failures ? `\nsimSnapshotAssets: ${failures} failures` : '\nsimSnapshotAssets: section 1 green, the rest needs a build.');
  process.exit(failures ? 1 : 0);
}

/* the tags this build actually produced */
const indexHtml = readFileSync(path.join(DIST, 'index.html'), 'utf8');
const wantCss = [...indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/[^"]+)"[^>]*>/g)].map(m => m[1]);
const wantJs = [...indexHtml.matchAll(/<script[^>]+type="module"[^>]+src="(\/assets\/[^"]+)"[^>]*>/g)].map(m => m[1]);
if (!wantJs.length) fail('dist/index.html has no module script, so there is nothing to inject and nothing to compare against');

/* ── 2 to 5: what actually ships ──────────────────────────────────────── */
console.log('2) every shipped page carries THIS build\'s assets');
const snaps = [], stubs = [];
const walk = dir => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    if (e.name !== 'index.html' || path.dirname(f) === DIST) continue;
    const html = readFileSync(f, 'utf8');
    (html.includes('/prerender-boot.js') ? snaps : stubs).push([path.relative(DIST, path.dirname(f)), html]);
  }
};
walk(DIST);
let withTags = 0, blocking = 0, noBoot = 0, stale = 0;
for (const [route, html] of snaps) {
  const css = [...html.matchAll(/<link[^>]+href="(\/assets\/[^"]+\.css)"/g)].map(m => m[1]);
  const js = [...html.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  if (!js.length) { fail(`/${route} has no module script of its own, so it still has to fetch the home page to find one`); continue; }
  withTags += 1;
  for (const a of [...css, ...js]) {
    if (!existsSync(path.join(DIST, a.replace(/^\//, '')))) { stale += 1; fail(`/${route} points at ${a}, which is not in this build`); }
  }
  /* 3: the stylesheet must not block the paint. See the header for the
     measurement that made this a hard rule rather than a preference. */
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/assets\/[^"]+\.css"[^>]*>/g)) {
    const tag = m[0];
    if (/<noscript>/.test(html.slice(Math.max(0, m.index - 12), m.index))) continue;
    if (!/media="print"/.test(tag) || !/onload=/.test(tag)) {
      blocking += 1;
      if (blocking <= 3) fail(`/${route} injects a render blocking stylesheet, which measured 2860ms to first paint against 756ms without it`);
    }
  }
  /* 4: the fallback stays. prerender-boot.js returns early when it finds a
     module script, so it costs nothing and covers a build where the plugin
     did not run. */
  if (!html.includes('/prerender-boot.js')) { noBoot += 1; fail(`/${route} lost its boot script, so a build without the plugin would leave it dead`); }
}
console.log(`   ${withTags} of ${snaps.length} shipped pages carry their own tags, ${stale} pointing at a file this build did not make`);
console.log(`3) the injected stylesheet does not block the paint`);
console.log(`   ${blocking} render blocking stylesheet injections`);
console.log(`4) the boot script survives as the fallback`);
console.log(`   ${snaps.length - noBoot} of ${snaps.length} still reference /prerender-boot.js`);
console.log(`5) the retired signposts are left alone`);
let stubTags = 0;
for (const [route, html] of stubs) {
  if (/\/assets\//.test(html)) { stubTags += 1; fail(`/${route} is a retired signpost and had assets injected into it`); }
}
console.log(`   ${stubs.length} signposts, ${stubTags} touched`);

console.log('');
if (failures > 0) {
  console.error(`simSnapshotAssets: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSnapshotAssets: green. Every page knows where its own code is, and finding out costs nobody a round trip.');
