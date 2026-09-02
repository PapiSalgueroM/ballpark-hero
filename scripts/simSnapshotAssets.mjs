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
import { JSDOM } from 'jsdom';

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

/* ── 6: the invisible handoff (Round 418) ─────────────────────────────────
   The dimmed crawler copy still looked like a broken page. Every shipped
   document now needs all three pieces: an early JavaScript capability marker,
   a marker-scoped rule that hides exactly one viewport, and a noscript rule
   that restores the complete visible document. The copy itself stays in the
   DOM for crawlers in both cases.

   NEGATIVE CONTROLS: SNAP_CONTROL=flash strips the marker,
   SNAP_CONTROL=recovery removes its failure fallback, SNAP_CONTROL=paint
   makes the JavaScript handoff visible, and SNAP_CONTROL=nojs hides the
   no-JavaScript copy. SNAP_CONTROL=wrapper removes the element each rule is
   meant to style. Each mutation is applied to one snapshot and the home page,
   and both findings must be reported alone. */
console.log('6) the invisible handoff: hidden for app boot, complete without JavaScript');
{
  const CONTROL = process.env.SNAP_CONTROL || '';
  if (CONTROL && !['flash', 'recovery', 'paint', 'nojs', 'wrapper'].includes(CONTROL)) { console.error(`SNAP_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
  const validMarker = code =>
    /document\.documentElement\.classList\.add\((['"])dukb-js\1\)/.test(code) &&
    /setTimeout\s*\(/.test(code) &&
    /document\.querySelector\((['"])#dukb-home-copy,#dukb-snapshot\1\)/.test(code) &&
    /document\.documentElement\.classList\.remove\((['"])dukb-js\1\)/.test(code) &&
    /,\s*8000\s*\)/.test(code);
  const hiddenRule = id => `.dukb-js #${id}{visibility:hidden;height:100vh;max-height:100vh;overflow:hidden;opacity:0;box-sizing:border-box}`;
  const visibleRule = id => `#${id}{visibility:visible;height:auto;max-height:none;overflow:visible;opacity:1}`;
  const parsedState = (html, id) => {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const markers = [...document.head.querySelectorAll('script[data-dukb-js-capability]')];
    const paints = [...document.head.querySelectorAll('style[data-dukb-first-paint]')];
    const noJs = [...document.head.querySelectorAll('noscript style[data-dukb-no-js-copy]')];
    const wrappers = [...document.body.querySelectorAll('[id]')].filter(element => element.id === id);
    const state = {
      marker: { count: markers.length, ok: markers.length === 1 && validMarker(markers[0].textContent || '') },
      paint: { count: paints.length, ok: paints.length === 1 && (paints[0].textContent || '').includes(hiddenRule(id)) },
      noJs: { count: noJs.length, ok: noJs.length === 1 && (noJs[0].textContent || '').includes(visibleRule(id)) },
      wrapper: { count: wrappers.length, ok: wrappers.length === 1 },
    };
    dom.window.close();
    return state;
  };
  const mutateControl = (html, id, label) => {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    if (CONTROL === 'wrapper') {
      const wrapper = [...document.body.querySelectorAll('[id]')].find(element => element.id === id);
      if (!wrapper) { console.error(`control found no #${id} wrapper in ${label}`); process.exit(1); }
      wrapper.removeAttribute('id');
      wrapper.setAttribute('data-removed-wrapper', 'true');
      const changed = dom.serialize();
      dom.window.close();
      return changed;
    }
    if (CONTROL === 'flash') {
      const marker = document.head.querySelector('script[data-dukb-js-capability]');
      if (!marker) { console.error(`control found no capability marker in ${label}`); process.exit(1); }
      marker.remove();
    } else if (CONTROL === 'recovery') {
      const from = "document.documentElement.classList.remove('dukb-js')";
      const to = "document.documentElement.classList.contains('dukb-js')";
      const marker = document.head.querySelector('script[data-dukb-js-capability]');
      if (!marker || !(marker.textContent || '').includes(from)) { console.error(`control found no recovery action in ${label}`); process.exit(1); }
      marker.textContent = (marker.textContent || '').replace(from, to);
    } else if (CONTROL === 'paint') {
      const from = hiddenRule(id);
      const to = from.replace('visibility:hidden', 'visibility:visible');
      const style = document.head.querySelector('style[data-dukb-first-paint]');
      if (!style || !(style.textContent || '').includes(from)) { console.error(`control found no first-paint rule in ${label}`); process.exit(1); }
      style.textContent = (style.textContent || '').replace(from, to);
    } else if (CONTROL === 'nojs') {
      const from = visibleRule(id);
      const to = from.replace('visibility:visible', 'visibility:hidden');
      const style = document.head.querySelector('noscript style[data-dukb-no-js-copy]');
      if (!style || !(style.textContent || '').includes(from)) { console.error(`control found no no-JavaScript rule in ${label}`); process.exit(1); }
      style.textContent = (style.textContent || '').replace(from, to);
    }
    const changed = dom.serialize();
    dom.window.close();
    if (changed === html) { console.error(`control changed nothing in ${label}`); process.exit(1); }
    return changed;
  };
  const failuresBeforeSection = failures;
  let ready = 0;
  let controlArmed = 0;
  for (const [route, htmlIn] of snaps) {
    let html = htmlIn;
    if (CONTROL && controlArmed === 0) {
      html = mutateControl(html, 'dukb-snapshot', `/${route}`);
      controlArmed += 1;
      console.log(`   NEGATIVE CONTROL ON: ${CONTROL} mutation applied to /${route} in memory`);
    }
    const { marker, paint, noJs, wrapper } = parsedState(html, 'dukb-snapshot');
    if (marker.ok && paint.ok && noJs.ok && wrapper.ok) { ready += 1; continue; }
    if (!marker.ok) fail(`/${route} has ${marker.count} working capability markers in its head, expected exactly one`);
    if (!paint.ok) fail(`/${route} has ${paint.count} valid first-paint rules in its head, expected exactly one`);
    if (!noJs.ok) fail(`/${route} has ${noJs.count} valid no-JavaScript rules in its head, expected exactly one`);
    if (!wrapper.ok) fail(`/${route} has ${wrapper.count} #dukb-snapshot wrappers, expected exactly one so the handoff rules style real copy`);
  }
  let home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
  if (CONTROL) {
    home = mutateControl(home, 'dukb-home-copy', 'the built home page');
    controlArmed += 1;
  }
  const { marker: homeMarker, paint: homePaint, noJs: homeNoJs, wrapper: homeWrapper } = parsedState(home, 'dukb-home-copy');
  if (!homeMarker.ok) {
    fail(`the built home page has ${homeMarker.count} working capability markers in its head, expected exactly one`);
  }
  if (!homePaint.ok) {
    fail(`the built home page has ${homePaint.count} valid first-paint rules in its head, expected exactly one`);
  }
  if (!homeNoJs.ok) {
    fail(`the built home page has ${homeNoJs.count} valid no-JavaScript rules in its head, expected exactly one`);
  }
  if (!homeWrapper.ok) {
    fail(`the built home page has ${homeWrapper.count} #dukb-home-copy wrappers, expected exactly one so the handoff rules style real copy`);
  }
  console.log(`   ${ready} of ${snaps.length} shipped pages carry all three pieces, and the home template carries its own`);
  if (CONTROL) {
    const added = failures - failuresBeforeSection;
    if (controlArmed === 2 && failuresBeforeSection === 0 && added === 2) {
      console.log(`simSnapshotAssets control: green. Both ${CONTROL} mutations were the only findings.`);
      process.exit(0);
    }
    console.error(`simSnapshotAssets control: RED. Armed ${controlArmed}, earlier findings ${failuresBeforeSection}, section findings ${added}.`);
    process.exit(1);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simSnapshotAssets: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSnapshotAssets: green. Every page knows where its own code is, and finding out costs nobody a round trip.');
