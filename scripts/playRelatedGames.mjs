/**
 * Round 181 browser harness: the related-games tiles, walked like a person.
 *
 * simRelatedGames proves the graph; this proves the tiles actually render
 * on the built site and actually navigate: a big-category page shows six,
 * a two-game-category page still shows four (ring shrinks, cycle and
 * variety fill in), clicking a tile is a real route change, and the featured
 * career and management games keep their recommendations readable on a phone.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playRelatedGames.mjs
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(origin => {
  if (location.origin === origin) localStorage.setItem('rules-gate-seen:' + location.pathname, '1');
}, new URL(BASE).origin);
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) A big-category page carries six real tiles');
await page.goto(`${BASE}/footle`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const block = page.locator('[data-related-games]');
say(await block.count() === 1, 'the related block is on the page');
say((await block.locator('h2').innerText()).includes('More games to play'), 'the block introduces itself');
const tiles = block.locator('a');
say(await tiles.count() === 6, `six tiles on a big-category page (saw ${await tiles.count()})`);
const hrefs = await tiles.evaluateAll(as => as.map(a => a.getAttribute('href')));
say(!hrefs.includes('/footle'), 'no page links to itself');
say(new Set(hrefs).size === hrefs.length, 'no duplicate tiles');

console.log('2) A tiny-category page still fills the block');
await page.goto(`${BASE}/golf-higher-lower`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const smallTiles = page.locator('[data-related-games] a');
const n = await smallTiles.count();
say(n >= 4, `a two-game category still offers ${n} tiles (floor 4)`);
const smallHrefs = await smallTiles.evaluateAll(as => as.map(a => a.getAttribute('href')));
say(smallHrefs.includes('/guess-the-golfer'), 'the golf sibling is in the ring');

console.log('3) A tile is a real navigation');
const target = smallHrefs[0];
await smallTiles.first().click();
await page.waitForTimeout(1200);
say(new URL(page.url()).pathname === target, `clicking the first tile landed on ${target}`);
say(await page.locator('[data-related-games]').count() === 1, 'the destination page carries its own block');

console.log('4) Featured games show full titles and readable descriptions on phones');
for (const route of ['/soccer-career', '/club-manager', '/nba-my-career', '/stadium-tycoon']) {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  const recommendations = page.locator('[data-related-games] a');
  await recommendations.last().waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  const stadiumRules = page.getByRole('dialog', { name: 'How Stadium Tycoon works' });
  if (await stadiumRules.isVisible()) {
    await stadiumRules.getByRole('button', { name: 'Close the rules', exact: true }).click();
  }

  const desktop = await recommendations.evaluateAll(links => links.map(link => ({
    href: link.getAttribute('href'),
    title: getComputedStyle(link.children[1]).textOverflow,
    descriptionSize: parseFloat(getComputedStyle(link.children[2]).fontSize),
  })));
  say(desktop.length === 6 && desktop.every(tile => tile.title === 'ellipsis' && tile.descriptionSize === 10),
    `${route} keeps its six desktop tiles and typography`);

  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const phone = await recommendations.evaluateAll(links => links.map(link => {
      const [, title, description] = link.children;
      const titleStyle = getComputedStyle(title);
      const descriptionStyle = getComputedStyle(description);
      const bounds = link.getBoundingClientRect();
      return {
        href: link.getAttribute('href'),
        title: title.textContent,
        titleFits: titleStyle.whiteSpace === 'normal' && titleStyle.textOverflow === 'clip'
          && title.scrollWidth <= title.clientWidth + 1 && title.scrollHeight <= title.clientHeight + 1,
        readable: parseFloat(titleStyle.fontSize) >= 14 && parseFloat(descriptionStyle.fontSize) >= 12
          && description.clientHeight > 0,
        tileFits: bounds.height >= 44 && bounds.width >= 44 && bounds.left >= 0 && bounds.right <= innerWidth,
      };
    }));

    say(JSON.stringify(phone.map(tile => tile.href)) === JSON.stringify(desktop.map(tile => tile.href)),
      `${route} has the same link order at ${viewport.width}px`);
    const clipped = phone.filter(tile => !tile.titleFits || !tile.readable || !tile.tileFits);
    say(clipped.length === 0, `${route} fits readable, 44px tiles at ${viewport.width}px${clipped.length ? ` (${clipped.map(tile => tile.title).join(', ')})` : ''}`);
  }

  const recommendationHref = desktop[0].href;
  await recommendations.first().click();
  await page.waitForURL(url => url.pathname === recommendationHref);
  say(new URL(page.url()).pathname === recommendationHref, `${route} opens its first recommendation from the phone layout`);
}

say(errors.length === 0, `no page errors on the walk (${errors.length ? errors[0] : 'clean'})`);

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} RELATED GAMES WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL RELATED GAMES WALK CHECKS PASSED');
