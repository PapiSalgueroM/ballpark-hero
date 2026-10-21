/* Round 1531 walk of the real /stadium-tycoon route on a served dist, at 390x844 and 1280x900.
   It seeds a save one match minute from a level full time, keeps every roll high so nobody scores,
   reads the draw floater, buys a Stands level and counts the terrace bays, then opens the Academy.
   WALK_EXPECT=branch asserts the three fixes; WALK_EXPECT=main asserts the opposite (the control). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.walk-out');
const EXPECT = process.env.WALK_EXPECT || 'branch';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'stadiumTycoonSaveV1';
const facts = {};
const browser = await chromium.launch();
try {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const tag = `${w}x${h}`, f = facts[tag] = {};
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route(/supabase\.co/, r => r.abort());
    const errors = [];
    /* A first visit makes the app write its own fresh save; the page that wrote it is closed before the
       seeded copy goes in, and the seed is written at document start of the second page, before any app
       code runs, so the app cannot overwrite it with its in-memory state. */
    const first = await ctx.newPage();
    first.on('pageerror', e => errors.push(String(e)));
    await first.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await first.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
    await first.waitForFunction(k => !!localStorage.getItem(k), KEY, { timeout: 15000 });
    const seed = JSON.parse(await first.evaluate(k => localStorage.getItem(k), KEY));
    await first.close({ runBeforeUnload: true });
    seed.money = 5e9; seed.levels = { ...seed.levels, stands: 30 }; seed.fanbase = Math.max(seed.fanbase || 0, 900);
    seed.minute = 84; seed.matchSec = 0; seed.goalsFor = 1; seed.goalsAgainst = 1;
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(({ k, v }) => {
      const s = JSON.parse(v); s.savedAt = Date.now();
      localStorage.setItem(k, JSON.stringify(s));
      Math.random = () => 0.999;
    }, { k: KEY, v: JSON.stringify(seed) });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
    await page.keyboard.press('Escape');
    const reject = page.getByRole('button', { name: 'Reject all' });
    if (await reject.count()) await reject.first().click({ noWaitAfter: true }).catch(() => {});
    const pitch = page.locator('[data-tycoon-terraces]').locator('xpath=../..');
    f.terracesBefore = await page.locator('[data-tycoon-terraces] rect').count().catch(() => 0);
    f.hasTerraceSvg = (await page.locator('[data-tycoon-terraces]').count()) > 0;
    const stand = f.hasTerraceSvg ? pitch : page.locator('.rounded-2xl.overflow-hidden.border').first();
    let drawSeen = false, resultText = '';
    for (let i = 0; i < 250 && !drawSeen; i++) {
      resultText = await page.evaluate(() => document.body.innerText);
      if (/FULL TIME DRAW/.test(resultText)) { drawSeen = true; break; }
      if (/full time\. beaten|FULL TIME WIN/i.test(resultText)) break;
      await page.waitForTimeout(100);
    }
    f.drawFloater = drawSeen;
    await stand.screenshot({ path: path.join(OUT, `draw-${tag}.png`) });
    await page.screenshot({ path: path.join(OUT, `stadium-${tag}.png`) });
    const stadiumText = await page.evaluate(() => document.body.innerText);
    f.stadiumDollars = (stadiumText.match(/\$[0-9][0-9,.]*[KMBTQ]?/g) || []).slice(0, 6);
    f.stadiumPounds = (stadiumText.match(/£[0-9][0-9,.]*[KMBTQ]?/g) || []).length;
    await page.waitForTimeout(2500);
    await stand.screenshot({ path: path.join(OUT, `stand-before-${tag}.png`) });
    const standsTile = page.locator('button').filter({ hasText: 'Stands' }).filter({ hasText: /Lv \d+/ }).first();
    f.standsLevelBefore = (await standsTile.innerText()).match(/Lv (\d+)/)?.[1];
    await standsTile.click({ noWaitAfter: true });
    await page.waitForTimeout(600);
    f.standsLevelAfter = (await standsTile.innerText()).match(/Lv (\d+)/)?.[1];
    f.terracesAfter = await page.locator('[data-tycoon-terraces] rect').count().catch(() => 0);
    await stand.screenshot({ path: path.join(OUT, `stand-after-${tag}.png`) });
    await page.locator('[data-room="academy"]').click();
    await page.waitForTimeout(1500);
    const academyRules = page.locator('[role="dialog"][aria-label="How Wonderkid Factory works"] button[aria-label="Close the rules"]');
    if (await academyRules.count()) await academyRules.first().click({ noWaitAfter: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `academy-${tag}.png`) });
    const academyText = await page.evaluate(() => document.body.innerText);
    f.academyDollars = (academyText.match(/\$[0-9][0-9,.]*[KMBTQ]?/g) || []).slice(0, 6);
    f.academyPounds = (academyText.match(/£[0-9][0-9,.]*[KMBTQ]?/g) || []).slice(0, 6);
    f.errors = errors;
    await ctx.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'walk1531.json'), JSON.stringify(facts, null, 2));
console.log(JSON.stringify(facts));
for (const [tag, f] of Object.entries(facts)) {
  assert.deepEqual(f.errors, [], `${tag}: page errors`);
  assert.equal(Number(f.standsLevelAfter), Number(f.standsLevelBefore) + 1, `${tag}: the Stands purchase went through`);
  if (EXPECT === 'branch') {
    assert.equal(f.drawFloater, true, `${tag}: draw floater`);
    assert(f.academyDollars.length > 0 && f.academyPounds.length === 0, `${tag}: Academy in dollars`);
    assert(f.stadiumDollars.length > 0 && f.stadiumPounds === 0, `${tag}: stadium in dollars`);
    assert.equal(f.terracesBefore, Math.floor((120 + 30 * 40) / 40), `${tag}: bays for 1320 seats`);
    assert.equal(f.terracesAfter, f.terracesBefore + 1, `${tag}: one more bay after Stands`);
  } else {
    assert.equal(f.drawFloater, false, `${tag}: main shows no draw floater`);
    assert(f.academyPounds.length > 0, `${tag}: main Academy in pounds`);
    assert.equal(f.hasTerraceSvg, false, `${tag}: main has no terraces`);
  }
}
console.log(`walk1531 ${EXPECT}: all assertions held at 390x844 and 1280x900`);
