/**
 * Round 188 browser harness: the home page tile curtain, walked like a
 * person, including the person who asked their OS for less motion.
 *
 * What Round 188 shipped (S-3's home page pass): each game section on the
 * home page reveals once as it scrolls into view, tiles rising in a short
 * capped stagger. The rules this file proves in the real DOM:
 *   - the reveal wrappers exist and the first section is revealed on load
 *     (it sits in the opening viewport);
 *   - scrolling the page bottoms out with EVERY section revealed and no
 *     tile left at opacity 0, so the curtain can never eat a game;
 *   - the stagger is real (a later tile carries a non-zero delay);
 *   - prefers-reduced-motion kills the animation dead: tiles render at
 *     full opacity with no animation at all;
 *   - a revealed tile still navigates on click.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playHomeReveal.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();

/* ---------- Walk one: the curtain, top to bottom ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  /* Round 274: Supabase is unreachable outside a browser with egress, and its
     requests then HANG rather than fail, so waitUntil networkidle can never be
     reached and this harness timed out at 30 seconds before asserting anything.
     Measured: / had 6 requests still open, /records 10, all of them Supabase.
     It is not only a sandbox problem: the daily legend hook opens a realtime
     websocket, and an open socket means a page that mounts it can never be
     network idle anywhere. Aborting is closer to what an offline visitor gets
     than hanging is, and it makes this harness deterministic. */
  await page.route('**://*.supabase.co/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) The wrappers exist and the first grid reveals as it enters view');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const sections = await page.locator('[data-tile-reveal]').count();
  say(sections >= 8, `the home page has reveal sections (saw ${sections})`);
  /* On a phone the hero, the trending strip, the poll and the search bar
     fill the whole opening viewport, so NO grid is in view yet and none
     should have revealed: that is the design working. One viewport of
     scroll brings the first grid in, and THAT is the moment it must fire. */
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(700);
  say(await page.locator('[data-tile-reveal="in"]').count() >= 1, 'the first grid revealed itself as it entered the viewport');

  console.log('2) Scrolling reveals everything and hides nothing');
  /* Scroll in steps so the observer sees each section arrive. */
  for (let step = 0; step < 30; step++) {
    const done = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.8);
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
    });
    await page.waitForTimeout(180);
    if (done) break;
  }
  await page.waitForTimeout(900);
  const stillOut = await page.locator('[data-tile-reveal="out"]').count();
  say(stillOut === 0, `every section revealed by the bottom (still hidden: ${stillOut})`);
  const invisible = await page.evaluate(() =>
    [...document.querySelectorAll('.home-tile')].filter(el => Number(getComputedStyle(el).opacity) < 0.99).length);
  say(invisible === 0, `no tile is left transparent after its entrance (saw ${invisible})`);

  console.log('3) The stagger is real and capped');
  const delays = await page.evaluate(() => {
    const grid = document.querySelector('[data-tile-reveal="in"] .grid');
    if (!grid) return null;
    return [...grid.querySelectorAll('.home-tile')].slice(0, 3).map(el => getComputedStyle(el).animationDelay);
  });
  say(!!delays && delays.length >= 2 && delays[0] === '0s' && delays[1] !== '0s',
    `tile one leads and tile two waits its turn (delays: ${delays ? delays.join(', ') : 'none read'})`);

  console.log('4) A revealed tile still navigates');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const firstTile = page.locator('[data-tile-reveal="in"] a.home-tile').first();
  const href = await firstTile.getAttribute('href');
  await firstTile.click();
  await page.waitForTimeout(900);
  say(!!href && page.url().includes(href), `clicking the first tile landed on ${href}`);
  say(errors.length === 0, `no page errors on the curtain walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: reduced motion means NO motion ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.route('**://*.supabase.co/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('5) prefers-reduced-motion kills the curtain dead');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const readings = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.home-tile')].slice(0, 6);
    return tiles.map(el => {
      const cs = getComputedStyle(el);
      return { anim: cs.animationName, opacity: Number(cs.opacity) };
    });
  });
  say(readings.length > 0 && readings.every(r => r.anim === 'none'), 'no tile animates under reduced motion');
  say(readings.every(r => r.opacity > 0.99), 'every tile is instantly visible under reduced motion');
  say(errors.length === 0, `no page errors on the reduced-motion walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} HOME REVEAL WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL HOME REVEAL WALK CHECKS PASSED');
