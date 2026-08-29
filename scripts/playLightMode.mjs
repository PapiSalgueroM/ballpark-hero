/**
 * Round 347 harness: light mode is real, chosen, kept, and readable.
 *
 * The dark palette on :root is the site's default and identity; .light on
 * <html> overrides the tokens. What this holds, on the built site served the
 * way the live host serves it:
 *
 *   1. The default is dark, exactly as before this round: a fresh visitor
 *      gets no .light class and a body background darker than luminance 0.2.
 *   2. The footer toggle works and the choice is KEPT: clicking it turns the
 *      page light (body luminance above 0.8), a reload stays light, and
 *      toggling back lands dark again.
 *   3. Light mode is readable where it matters: on each swept route, loaded
 *      fresh in light mode, every sampled visible text node holds the WCAG
 *      floor against its effective background (4.5 for normal text, 3.0 for
 *      large text, 2.5 for disabled/placeholder-looking text at 50 percent
 *      alpha or less, which we skip entirely). Fresh-load states only: menus,
 *      instructions, boards as a visitor first sees them. Deep play states
 *      are playGames' territory.
 *
 * NEGATIVE CONTROL: LIGHTMODE_CONTROL=nolight strips the :root.light block
 * from the served CSS (refusing to run if the block is not found, per the
 * control-must-bite rule) and section 2 must go red: the toggle can no
 * longer make the page light.
 *
 * Run: node scripts/playLightMode.mjs   (needs dist/ from npm run build)
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.LIGHTMODE_CONTROL || '';
if (CONTROL && CONTROL !== 'nolight') {
  console.error(`LIGHTMODE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* One route per visual family rather than all 60 plus: the token system is
   shared, so a family's fresh-load screen stands in for its siblings. */
const ROUTES = [
  '/',
  '/soccer',
  '/squad-deal',
  '/world-xi',
  '/club-manager',
  '/soccer-grid',
  '/footle',
  '/higher-lower',
  '/leaderboard',
  '/about',
];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Serve dist the way the live host serves it (see hostLikeServer's header).
   The port dodges 4173 so a manually started server never collides. */
const PORT = 4187;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const base = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
/* The cookie banner is a fixed overlay across the footer and intercepts the
   toggle click; answer it the privacy-preserving way before any page loads. */
await context.addInitScript(() => {
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* ignored */ }
});

if (CONTROL === 'nolight') {
  let stripped = 0;
  await context.route('**/*.css', async route => {
    const res = await route.fetch();
    let body = await res.text();
    const before = body.length;
    body = body.replace(/:root\.light\s*\{[^}]*\}/g, '');
    if (body.length !== before) stripped += 1;
    await route.fulfill({ response: res, body });
  });
  /* The assertion that the control bit lives below, after the first light
     mode load: if nothing was stripped by then, the control refuses. */
  context.__strippedCount = () => stripped;
  console.log('   NEGATIVE CONTROL ON: :root.light stripped from served CSS, section 2 must go red');
}

const page = await context.newPage();

function luminanceOfCss(rgb) {
  const m = rgb.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!m) return null;
  const chan = v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(+m[1]) + 0.7152 * chan(+m[2]) + 0.0722 * chan(+m[3]);
}

async function bodyLuminance() {
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  return luminanceOfCss(bg);
}

console.log('1) the default is dark, exactly as before this round');
{
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const hasLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
  const lum = await bodyLuminance();
  if (hasLight) fail('a fresh visitor got the .light class without asking');
  if (lum === null || lum > 0.2) fail(`fresh body luminance ${lum?.toFixed(3)}, expected the dark default under 0.2`);
  console.log(`   fresh visit: no .light class, body luminance ${lum?.toFixed(3)}`);
}

console.log('2) the footer toggle works and the choice is kept');
{
  const toggle = page.locator('footer [data-theme-toggle]');
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  let lum = await bodyLuminance();
  const litUp = lum !== null && lum > 0.8;
  if (CONTROL === 'nolight') {
    if (context.__strippedCount() === 0) {
      console.error('control found nothing to strip: no :root.light block in any served CSS');
      process.exit(1);
    }
    if (litUp) {
      console.error('control: the page went light with the light CSS stripped, the measurement is fake');
      await browser.close(); server.kill(); process.exit(1);
    }
    console.log('playLightMode control: green. With :root.light stripped the toggle could not light the page.');
    await browser.close(); server.kill(); process.exit(0);
  }
  if (!litUp) fail(`after the toggle the body luminance is ${lum?.toFixed(3)}, expected above 0.8`);
  await page.reload({ waitUntil: 'networkidle' });
  lum = await bodyLuminance();
  if (lum === null || lum < 0.8) fail(`after a reload the light choice was lost (luminance ${lum?.toFixed(3)})`);
  const back = page.locator('footer [data-theme-toggle]');
  await back.scrollIntoViewIfNeeded();
  await back.click();
  lum = await bodyLuminance();
  if (lum === null || lum > 0.2) fail(`toggling back did not land dark (luminance ${lum?.toFixed(3)})`);
  console.log('   toggled light, survived a reload, toggled back dark');
}

console.log('3) light mode is readable on every swept route');
{
  let sampled = 0;
  for (const route of ROUTES) {
    const p = await context.newPage();
    await p.addInitScript(() => {
      try { localStorage.setItem('dukb-theme', 'light'); } catch { /* ignored */ }
    });
    await p.goto(base + route, { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const bad = await p.evaluate(() => {
      const lumOf = (r, g, b) => {
        const chan = v => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
      };
      const parse = c => {
        const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
      };
      const effectiveBg = el => {
        let node = el;
        while (node && node !== document.documentElement) {
          const bg = parse(getComputedStyle(node).backgroundColor);
          if (bg && bg.a >= 0.9) return bg;
          node = node.parentElement;
        }
        return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
      };
      const out = [];
      let count = 0;
      for (const el of document.querySelectorAll('body *')) {
        if (count >= 400) break;
        const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!ownText) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.5) continue;
        const fg = parse(cs.color);
        if (!fg || fg.a < 0.5) continue;
        count += 1;
        const bg = effectiveBg(el);
        const l1 = lumOf(fg.r, fg.g, fg.b);
        const l2 = lumOf(bg.r, bg.g, bg.b);
        const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const floor = large ? 3.0 : 4.5;
        if (contrast < floor) {
          out.push({
            text: el.textContent.trim().slice(0, 40),
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 60),
            contrast: +contrast.toFixed(2),
            floor,
          });
        }
      }
      return { violations: out, count };
    });
    sampled += bad.count;
    for (const v of bad.violations.slice(0, 5)) {
      fail(`${route} <${v.tag} class="${v.cls}"> "${v.text}" measures ${v.contrast}, floor ${v.floor}`);
    }
    if (bad.violations.length > 5) {
      fail(`${route} has ${bad.violations.length - 5} more contrast violations beyond the five shown`);
    }
    await p.close();
  }
  if (sampled < ROUTES.length * 30) {
    fail(`only ${sampled} text nodes sampled across ${ROUTES.length} routes, the sweep did not really run`);
  }
  console.log(`   ${sampled} text nodes sampled across ${ROUTES.length} routes in light mode`);
}

await browser.close();
server.kill();
console.log('');
if (failures > 0) { console.error(`playLightMode: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('playLightMode: green. Dark by default, light by choice, readable either way.');
