// reviewer walk (runner only, never committed): node .rc/x/walk.mjs
// Round 1224 mounts nothing, so this walks the page its libraries are FOR (/front-office) the way a player would,
// to see that the head's build still plays a week and saves exactly the old shape (no new field written by anyone).
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const motion of ['no-preference', 'reduce']) {
    const tag = `${w}-${motion === 'reduce' ? 'reduced' : 'motion'}`;
    console.log(`walk ${tag}`);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
    const page = await ctx.newPage();
    const errors = [];
    let blocked = 0;
    page.on('pageerror', e => errors.push(String(e)));
    await page.route(/supabase\.co/, r => { blocked += 1; return r.abort(); });
    await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `fo-${tag}-1-pick.png`) });
    await page.locator('.grid button').first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `fo-${tag}-2-hub.png`) });
    const press = page.locator('[data-gm-press] button');
    if (await press.count() > 0) { await press.first().click(); await page.waitForTimeout(500); }
    const week = page.locator('button:has-text("This week")');
    say(await week.count() > 0, `${tag}: the hub offers This week`);
    if (await week.count() > 0) { await week.first().click(); await page.waitForTimeout(500); }
    const play = page.locator('button:has-text("Play Week 1")');
    say(await play.count() === 1, `${tag}: Play Week 1 is on the panel`);
    if (await play.count() === 1) { await play.click(); await page.waitForTimeout(700); }
    await page.screenshot({ path: path.join(OUT, `fo-${tag}-3-week.png`) });
    const body = await page.locator('body').innerText();
    say(/Play Week 2/.test(body), `${tag}: after the press the panel offers Play Week 2`);
    say(await page.locator('[data-gameday], [data-bracket]').count() === 0, `${tag}: no Game Day card and no bracket card is on the page (nothing mounts them yet)`);
    const over = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
    say(over <= 1, `${tag}: the page does not scroll sideways (${over}px over)`);
    const save = await page.evaluate(() => { const raw = localStorage.getItem('front-office-save-v1'); return raw ? Object.keys(JSON.parse(raw)).sort() : null; });
    say(Array.isArray(save), `${tag}: a save was written`);
    say(Array.isArray(save) && !save.includes('lastGame') && !save.includes('playoffs') && !save.some(k => /bracket|gameDay|lastGame/i.test(k)), `${tag}: the save holds no new field (${save ? save.join(',') : 'none'})`);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const after = await page.locator('body').innerText();
    say(!/couldn.t open this save/i.test(after), `${tag}: the save opens after a reload`);
    await page.screenshot({ path: path.join(OUT, `fo-${tag}-4-reload.png`) });
    say(errors.length === 0, `${tag}: no page error (${errors.slice(0, 2).join(' | ')})`);
    console.log(`  (${blocked} requests to the database host were blocked)`);
    if (tag === '390-motion') fs.writeFileSync(path.join(OUT, 'fo-save-keys.txt'), (save || []).join('\n'));
    await ctx.close();
  }
}
await browser.close();
console.log(failures === 0 ? 'walk: green, 4 walks of /front-office on the head build' : `walk: ${failures} FAILED`);
process.exit(failures ? 1 : 0);
