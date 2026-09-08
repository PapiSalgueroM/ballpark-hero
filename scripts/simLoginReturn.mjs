/* A full auth return lands on the site, not on a wall of text or a spinner
   that never stops.

   Round 448. His words, with two screenshots: "that thing still shows when u
   log in into douknowball with the balck screen and all that text and i dont
   want taht ... also if u go to login and then go back or sign up and then go
   back it leaves the google thing just loading."

   Two defects, one journey. At the time, sign in with Google left the site and
   came back through a FULL RELOAD of the home document, so the moment before
   React mounted was the first thing a player saw after choosing an account.
   Google now uses a popup, but Apple and password links can still make a full
   auth return, so the cold-load fence remains useful. Round 314 had capped and
   dimmed the crawler copy in that moment; a dimmed wall of grey paragraphs on
   a dark screen was still a wall of text, and he filmed it. A browser can also
   restore the page from its back-forward cache with React state intact, so
   provider loading states must still reset.

   WHAT THIS HOLDS:
     1) The home template carries a boot splash (#dukb-boot) that sits over
        the crawler copy inside #root, so React's mount removes it. The copy
        itself stays in the document, capped so it cannot scroll.
     2) A visitor without JavaScript never sees the splash and gets the whole
        copy: the noscript rule hides #dukb-boot and lifts the cap.
     3) The prerenderer writes the same splash into every saved route, so a
        cold load of any game page shows the mark and not the text. (The
        built pages themselves are checked by simSnapshotAssets section 6;
        this section checks the source that writes them.)
     4) MEASURED, in a real browser with the app bundle blocked: on a 390 by
        844 phone, every point on a grid across the viewport hits the splash
        and none hits the copy.
     5) The auth modal turns its Google and Apple spinners off every time it
        opens, and again on pageshow when the page was restored from the
        back-forward cache.

   Negative controls:
     LOGIN_RETURN_CONTROL=wall   removes the splash element from the template
       in memory; sections 1 and 4 must go red.
     LOGIN_RETURN_CONTROL=stuck  removes the pageshow reset from the modal in
       memory; section 5 must go red.
   Each refuses to run if its rewrite changed nothing.

   Run: node scripts/simLoginReturn.mjs
   CHROME_PATH selects the installed browser through the shared loader.
   Page requests use local fixtures only; this does not test real sign-in.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.LOGIN_RETURN_CONTROL || '';
if (CONTROL && !['wall', 'stuck'].includes(CONTROL)) {
  console.error(`LOGIN_RETURN_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
let failures = 0;
const failedChecks = [];
const fail = (m, id = m) => { failures += 1; failedChecks.push(id); console.error('  FAIL: ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

let template = read('index.html');
let modal = read('src/components/auth/AuthModal.tsx');
const prerender = read('scripts/prerender.mjs');

if (CONTROL === 'wall') {
  const needle = /<div id="dukb-boot"[^>]*>[\s\S]*?<\/div>\n/;
  if (!needle.test(template)) { console.error('control cannot run: the template has no splash to remove'); process.exit(1); }
  template = template.replace(needle, '');
  console.log('NEGATIVE CONTROL ON: the splash is gone from the template, the wall of text is back');
}
if (CONTROL === 'stuck') {
  const needle = "window.addEventListener('pageshow', onPageShow);";
  if (!modal.includes(needle)) { console.error('control cannot run: the modal has no pageshow listener to remove'); process.exit(1); }
  modal = modal.replace(needle, '/* listener removed by the control */');
  console.log('NEGATIVE CONTROL ON: the modal no longer listens for a restored auth page');
}

/* A guard that reads source must read the code, not the comments. */
const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const tpl = stripComments(template);
const mod = stripComments(modal);
const pre = stripComments(prerender);

console.log('1) the home template covers its crawler copy with a boot splash inside #root');
{
  const rootAt = tpl.indexOf('<div id="root">');
  const bootAt = tpl.indexOf('<div id="dukb-boot"');
  const copyAt = tpl.indexOf('<div id="dukb-home-copy">');
  if (bootAt === -1) fail('the template has no #dukb-boot, so the wait before React shows the crawler copy', 'template-splash');
  else if (!(rootAt !== -1 && bootAt > rootAt && copyAt > bootAt)) fail('#dukb-boot must sit inside #root and before the copy, or React\'s mount will not remove it');
  if (!/#dukb-boot\{position:fixed;inset:0;[^}]*background:/.test(tpl)) fail('#dukb-boot is not a fixed, opaque, full-viewport cover');
  if (!/#dukb-home-copy\{max-height:100vh;overflow:hidden\}/.test(tpl)) fail('the copy lost its cap, so the document can scroll under the splash');
  if (!/src="\/logo-mark\.svg"/.test(tpl.slice(bootAt, bootAt + 300))) fail('the splash does not show the mark', 'template-mark');
  if (!failures) console.log('   #dukb-boot covers #dukb-home-copy inside #root, showing the mark');
}

console.log('2) without JavaScript the splash is hidden and the whole copy shows');
{
  const lift = /<noscript><style>#dukb-boot\{display:none\}#dukb-home-copy\{max-height:none;overflow:visible\}<\/style><\/noscript>/;
  if (!lift.test(tpl)) fail('the noscript rule must hide #dukb-boot and lift the cap, or a no-JS reader gets a blank screen');
  else console.log('   the noscript rule hides the splash and lifts the cap');
}

console.log('3) the prerenderer writes the same splash into every saved route');
{
  if (!/dukb-boot/.test(pre)) fail('scripts/prerender.mjs never writes #dukb-boot, so every game page still boots on the dimmed wall');
  else if (!/#dukb-boot\{display:none\}/.test(pre)) fail('the prerenderer writes the splash but not the noscript rule that hides it');
  else console.log('   prerender.mjs writes the splash and its noscript rule');
}

console.log('4) measured: on a phone with the app blocked, the viewport shows the splash and no copy');
{
  const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
  try {
    const origin = 'http://127.0.0.1:4202';
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', serviceWorkers: 'block' });
    let blocked = 0;
    await context.routeWebSocket('**/*', socket => { blocked += 1; socket.close(); });
    await context.route('**/*', route => {
      const request = route.request();
      if (request.method() === 'GET' && request.url() === `${origin}/`)
        return route.fulfill({ status: 200, contentType: 'text/html', body: template });
      if (request.method() === 'GET' && request.url() === `${origin}/logo-mark.svg`)
        return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: fs.readFileSync(path.join(ROOT, 'public/logo-mark.svg')) });
      blocked += 1;
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', error => fail(`template runtime error: ${error.message}`, 'page-runtime'));
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const hits = await page.evaluate(() => {
      const out = { boot: 0, copy: 0, other: 0 };
      for (let y = 20; y < innerHeight; y += 80) {
        for (let x = 20; x < innerWidth; x += 90) {
          const el = document.elementFromPoint(x, y);
          if (!el) { out.other += 1; continue; }
          if (el.closest('#dukb-boot')) out.boot += 1;
          else if (el.closest('#dukb-home-copy')) out.copy += 1;
          else out.other += 1;
        }
      }
      return out;
    });
    const total = hits.boot + hits.copy + hits.other;
    console.log(`   ${total} grid points: ${hits.boot} on the splash, ${hits.copy} on the copy, ${hits.other} elsewhere`);
    if (hits.copy > 0) fail(`${hits.copy} of ${total} viewport points land on the crawler copy, so the wall of text is visible before React`, 'viewport-copy');
    if (hits.boot < total * 0.9) fail(`only ${hits.boot} of ${total} viewport points land on the splash`, 'viewport-splash');
    console.log(`   local document/logo fixtures; ${blocked} other page request(s) blocked`);
  } finally {
    await browser.close();
  }
}

console.log('5) the auth modal turns its spinners off on open and on return from the back-forward cache');
{
  const openEffect = /useEffect\(\(\) => \{\s*if \(!isOpen\) return;[\s\S]*?\}, \[isOpen, defaultTab\]\);/.exec(mod)?.[0] ?? '';
  if (!openEffect) fail('the open effect could not be found, so this check read nothing');
  else {
    if (!/setGoogleLoading\(false\)/.test(openEffect)) fail('opening the modal does not clear the Google spinner');
    if (!/setAppleLoading\(false\)/.test(openEffect)) fail('opening the modal does not clear the Apple spinner');
  }
  const hasListener = /addEventListener\('pageshow'/.test(mod);
  const handler = /const onPageShow = \(e[^)]*\) => \{[\s\S]*?\};/.exec(mod)?.[0] ?? '';
  if (!hasListener) fail('the modal never listens for pageshow, so a restored auth page can keep a spinner running', 'pageshow-listener');
  if (!/e\.persisted/.test(handler)) fail('the pageshow handler does not check persisted, so it fires on every ordinary load');
  if (!/setGoogleLoading\(false\)/.test(handler) || !/setAppleLoading\(false\)/.test(handler)) fail('the pageshow handler does not clear both spinners');
  if (!failures) console.log('   both spinners reset on open, and on a restored page');
}

await new Promise(r => setTimeout(r, 100));
if (CONTROL) {
  const expected = CONTROL === 'wall'
    ? ['template-splash', 'template-mark', 'viewport-copy', 'viewport-splash']
    : ['pageshow-listener'];
  if (JSON.stringify([...failedChecks].sort()) === JSON.stringify([...expected].sort())) {
    console.log(`\ncontrol "${CONTROL}": ${failures} exact failure(s) fired as expected, all other checks passed`); process.exit(0);
  }
  console.error(`\ncontrol "${CONTROL}": expected ${expected.join(', ')}, got ${failedChecks.join(', ') || 'no failures'}`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimLoginReturn: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimLoginReturn: green. A full auth return shows the mark, then the site, and provider buttons reset after a restored page.');
