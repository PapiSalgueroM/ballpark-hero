// Reviewer walk (run lens, 1587), extra file, never committed. Runs on the runner under #!serve and #!playwright.
// The only player visible change of the round is the What's New entry; this walks /whats-new the way a player would,
// at 390x844 and 1280x900, reduced motion on and off, with supabase.co blocked, then follows the entry's Rarity Round
// link. Screenshots and walk.json go to $RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rc-out';
fs.mkdirSync(OUT, { recursive: true });
const HEAD = 'Arsenal means the London Arsenal again.';
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const report = [];
let bad = 0;
const browser = await chromium.launch({ headless: true });
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const rm of ['reduce', 'no-preference']) {
    const tag = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    let blocked = 0;
    await page.route(/supabase\.co/, (r) => { blocked += 1; return r.abort(); });
    await page.route(/googletagmanager|googlesyndication|google-analytics|doubleclick/, (r) => r.abort());
    page.on('pageerror', (e) => errors.push('pageerror ' + String(e.message).slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text().slice(0, 160)); });
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded' });
    const li = page.locator('li', { hasText: HEAD }).first();
    let found = true;
    try { await li.waitFor({ state: 'visible', timeout: 15000 }); } catch { found = false; }
    const r = { tag, found };
    if (found) {
      await li.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(400);
      Object.assign(r, await page.evaluate((head) => {
        const el = [...document.querySelectorAll('li')].find((x) => x.textContent.includes(head));
        const ul = el.parentElement;
        const b = el.getBoundingClientRect();
        const h2 = ul.previousElementSibling ? ul.previousElementSibling.textContent : '';
        const links = [...el.querySelectorAll('a')].map((a) => ({ text: a.textContent, href: a.getAttribute('href') }));
        const overflow = [...el.querySelectorAll('*')].filter((c) => c.getBoundingClientRect().right > window.innerWidth + 1).length;
        return {
          rect: { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) },
          firstInList: ul.firstElementChild === el, monthHeading: h2, links, overflowChildren: overflow,
          pageScrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          fontPx: getComputedStyle(el).fontSize, text: el.textContent,
        };
      }, HEAD));
      r.dashes = DASHES.some((d) => r.text.includes(d));
      await page.screenshot({ path: path.join(OUT, `whatsnew-${tag}.png`) });
      await li.screenshot({ path: path.join(OUT, `entry-${tag}.png`) });
    } else {
      await page.screenshot({ path: path.join(OUT, `whatsnew-${tag}-notfound.png`), fullPage: false });
    }
    r.blocked = blocked; r.errors = errors.slice(0, 6);
    if (!found || r.pageScrollX > 0 || r.overflowChildren || r.dashes || !r.firstInList) bad += 1;
    if (found && w === 390 && rm === 'reduce') {
      const link = li.locator('a[href="/rarity-round"]');
      r.rarityLink = await link.count();
      if (r.rarityLink) {
        await link.click();
        await page.waitForURL(/rarity-round/, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2500);
        r.afterClickUrl = page.url().replace(BASE, '');
        r.afterClickH1 = await page.locator('h1').first().textContent().catch(() => null);
        await page.screenshot({ path: path.join(OUT, `rarity-after-link-${tag}.png`) });
      }
    }
    report.push(r);
    console.log(`${tag}: found=${found} first=${r.firstInList} rect=${JSON.stringify(r.rect)} scrollX=${r.pageScrollX} overflow=${r.overflowChildren} dashes=${r.dashes} font=${r.fontPx} links=${JSON.stringify(r.links)} blocked=${blocked} errors=${errors.length}${r.afterClickUrl ? ` clicked->${r.afterClickUrl} h1=${r.afterClickH1}` : ''}`);
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(report, null, 1));
console.log(`walk1587: ${report.length} walks, ${bad} with a problem: ${bad ? 'RED' : 'green'}`);
process.exit(bad ? 1 : 0);
