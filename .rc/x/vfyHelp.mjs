// Closing check walk (never committed): the reviewer's rvwHelp.mjs with two more phrases per page, so a "no" for a
// stale phrase cannot be a guide that failed to draw. The first four needles of each route are the reviewer's own.
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173', SHOTS = process.env.RC_OUT || '.', origin = new URL(BASE).origin;
const browser = await chromium.launch();
const ROUTES = [
  ['/front-office', ['sixty carries', 'three things', 'fullback', 'how much of the work', 'gets credit', 'Roster box']],
  ['/nfl-gauntlet-draft', ['78, 85, 90, 95, 99', '78 up to 99', '97 rated MVP', '79 up to 97', '79, 83, 88, 92, 97', 'a 93 next to an 88', 'There is no cost to any of them']],
];
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/*', route => { const url = new URL(route.request().url()); return url.origin === origin || /^(data|blob):/.test(url.protocol) ? route.continue() : route.abort(); });
  for (const [route, needles] of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const consent = page.locator('button:has-text("Essential only")');
    if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
    const body = await page.evaluate(() => document.body.innerText);
    console.log(`${viewport.width} ${route} page text (${body.length} chars): ${needles.map(n => `"${n}" ${body.includes(n) ? 'YES' : 'no'}`).join(', ')}`);
    const help = page.locator('button[aria-label*="how to play" i], button[aria-label*="help" i]').first();
    console.log(`   help button: ${await help.count()} (${await help.getAttribute('aria-label').catch(() => null)})`);
    await help.click().catch(e => console.log('   click failed: ' + String(e.message).split('\n')[0]));
    await page.waitForTimeout(700);
    const pop = await page.evaluate(() => { const el = document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper], [data-state="open"][role]'); return el ? el.innerText.replace(/\s+/g, ' ') : null; });
    console.log(`   ? panel (${pop ? pop.length : 0} chars): ${pop ? needles.map(n => `"${n}" ${pop.includes(n) ? 'YES' : 'no'}`).join(', ') : 'NOT FOUND'}`);
    if (pop) { const i = pop.search(/Opposition ratings climb|read on three things|three things/i); if (i >= 0) console.log(`   ? panel text there: ${pop.slice(Math.max(0, i - 40), i + 300)}`); }
    await page.screenshot({ path: path.join(SHOTS, `vfy${route.replace(/\//g, '-')}-${viewport.width}.png`) });
  }
  await ctx.close();
}
await browser.close();
