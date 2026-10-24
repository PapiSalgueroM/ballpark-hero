/* Round 1568 probe (never committed): how Chromium's KEYBOARD focus scroll meets a sticky top bar and a fixed
   bottom bar, with and without scroll-margin, on a synthetic page shaped like the two game screens.
   A: a range input far above the viewport (Conquest's timeline after the recap), reached by Shift+Tab.
   B: a button whose centre is under a fixed 73 px bottom bar (Soccer Career's record tile at 390x844), reached by Tab.
   Run: node .rc/x/probeFocus.mjs */
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const page0 = (sm, mb) => `<!doctype html><html><head><style>body{margin:0;font:16px sans-serif}
#bar{position:sticky;top:0;z-index:50;height:44px;background:#222;color:#fff}
#foot{position:fixed;bottom:0;left:0;right:0;height:73px;background:#444;z-index:40}
.gap{height:900px;background:linear-gradient(#eee,#ccc)}</style></head><body>
<div id="bar"><button id="menu">Menu</button></div>
<div style="height:713px"></div><button id="tile" style="display:block;width:100%;height:82px;${mb ? 'scroll-margin-bottom:96px' : ''}">tile</button>
<div class="gap"></div><button id="before">before</button><input id="tl" type="range" style="display:block;width:100%;height:30px;${sm ? 'scroll-margin-top:80px' : ''}"><button id="after">after</button>
<div class="gap"></div><div class="gap"></div><div id="foot"></div></body></html>`;
const browser = await chromium.launch();
for (const [w, h] of [[430, 844], [390, 844]]) for (const variant of [false, true]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(page0(variant, variant));
  const rect = id => page.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return `${Math.round(r.top)}-${Math.round(r.bottom)} scrollY ${Math.round(scrollY)} hit ${at ? at.id || at.tagName : 'null'}`; }, id);
  /* A: from far below, Shift+Tab back onto the range input */
  await page.evaluate(() => { document.getElementById('after').scrollIntoView({ block: 'end' }); window.scrollBy(0, 1200); document.getElementById('after').focus({ preventScroll: true }); });
  await page.keyboard.press('Shift+Tab');
  const a = await rect('tl');
  /* A2: element.focus() from the same place */
  await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); document.getElementById('after').focus({ preventScroll: true }); });
  await page.evaluate(() => document.getElementById('tl').focus());
  const a2 = await rect('tl');
  /* A3: Playwright scrollIntoViewIfNeeded from the same place */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('#tl').scrollIntoViewIfNeeded();
  const a3 = await rect('tl');
  /* B: at the top of the page, Tab from the menu onto the tile (its centre under the bottom bar) */
  await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById('menu').focus({ preventScroll: true }); });
  await page.keyboard.press('Tab');
  const b = await rect('tile');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#tile').scrollIntoViewIfNeeded();
  const b3 = await rect('tile');
  console.log(`${w}x${h} ${variant ? 'WITH scroll-margin (top 80 on the input, bottom 96 on the tile)' : 'no scroll-margin'}`);
  console.log(`  A  Shift+Tab to the input: ${a}`);
  console.log(`  A2 input.focus(): ${a2}`);
  console.log(`  A3 scrollIntoViewIfNeeded: ${a3}`);
  console.log(`  B  Tab to the tile: ${b}`);
  console.log(`  B3 scrollIntoViewIfNeeded tile: ${b3}`);
  await page.close();
}
await browser.close();
console.log('probeFocus: done');
