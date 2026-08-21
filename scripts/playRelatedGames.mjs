/**
 * Round 181 browser harness: the related-games tiles, walked like a person.
 *
 * simRelatedGames proves the graph; this proves the tiles actually render
 * on the built site and actually navigate: a big-category page shows six,
 * a two-game-category page still shows four (ring shrinks, cycle and
 * variety fill in), and clicking a tile is a real route change.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playRelatedGames.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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
say(errors.length === 0, `no page errors on the walk (${errors.length ? errors[0] : 'clean'})`);

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} RELATED GAMES WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL RELATED GAMES WALK CHECKS PASSED');
