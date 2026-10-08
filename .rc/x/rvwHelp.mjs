// Reviewer's walk (never committed): what the ? button says on the two games this branch changes.
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173', SHOTS = process.env.RC_OUT || '.', origin = new URL(BASE).origin;
const browser = await chromium.launch();
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/*', route => { const url = new URL(route.request().url()); return url.origin === origin || /^(data|blob):/.test(url.protocol) ? route.continue() : route.abort(); });
  for (const [route, needles] of [['/front-office', ['sixty carries', 'three things', 'fullback', 'how much of the work']], ['/nfl-gauntlet-draft', ['78, 85, 90, 95, 99', '78 up to 99', '97 rated MVP', '79 up to 97']]]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const consent = page.locator('button:has-text("Essential only")');
    if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
    const body = await page.evaluate(() => document.body.innerText);
    console.log(`${viewport.width} ${route} page text, four seconds after load: ${needles.map(n => `"${n}" ${body.includes(n) ? 'YES' : 'no'}`).join(', ')}`);
    const help = page.locator('button[aria-label*="how to play" i], button[aria-label*="help" i]').first();
    console.log(`   help button: ${await help.count()} (${await help.getAttribute('aria-label').catch(() => null)})`);
    await help.click().catch(e => console.log('   click failed: ' + String(e.message).split('\n')[0]));
    await page.waitForTimeout(700);
    const pop = await page.evaluate(() => { const el = document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper], [data-state="open"][role]'); return el ? el.innerText.replace(/\s+/g, ' ') : null; });
    console.log(`   ? panel: ${pop ? needles.map(n => `"${n}" ${pop.includes(n) ? 'YES' : 'no'}`).join(', ') : 'NOT FOUND'}`);
    if (pop) { const i = pop.search(/Opposition ratings|opening ratings|OVR|rating/i); console.log(`   ? panel text near the ratings: ${pop.slice(Math.max(0, i - 60), i + 420)}`); console.log(`   ? panel length ${pop.length}`); }
    await page.screenshot({ path: path.join(SHOTS, `help${route.replace(/\//g, '-')}-${viewport.width}.png`) });
  }
  await ctx.close();
}
await browser.close();
