import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp';
const saves = { ceremony: readFileSync('/tmp/rvbs/ceremony.txt', 'utf8'), pending: readFileSync('/tmp/rvbs/pending.txt', 'utf8') };
const consent = JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() });
const log = [];
let fails = 0;
const browser = await chromium.launch();
for (const width of [320, 390, 1280]) for (const [name, save] of Object.entries(saves)) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([s, c]) => { if (!sessionStorage.getItem('rvbs')) { localStorage.setItem('soccerCareerSave', s); localStorage.setItem('cookie-consent-v2', c); sessionStorage.setItem('rvbs', '1'); } }, [save, consent]);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message.slice(0, 120)));
  const m = async tag => log.push(`${name} w=${width} ${tag} ` + JSON.stringify(await page.evaluate(() => ({ sx: document.documentElement.scrollWidth, iw: innerWidth, y: Math.round(scrollY) }))));
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
    if (name === 'ceremony') {
      const btn = page.getByRole('button', { name: 'Use coaching coursework' });
      await btn.waitFor({ timeout: 30000 }); await btn.scrollIntoViewIfNeeded(); await m('ceremony');
      await btn.click();
      const card = page.locator('div.rounded-xl', { has: page.getByRole('heading', { name: 'Choose your first club' }) });
      await card.waitFor(); await page.waitForTimeout(1500); await m('chooser');
      const shown = await page.locator('button:has-text("Club level")').allInnerTexts();
      log.push(`${name} w=${width} shown=${shown.map(t => t.replace(/\s+/g, ' ')).join(' | ')}`);
      const ov = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.scrollWidth > b.clientWidth + 1 && b.offsetParent).map(b => b.innerText.slice(0, 30)));
      log.push(`${name} w=${width} overflowingButtons=${JSON.stringify(ov)}`);
      await page.screenshot({ path: `${OUT}/chooser-${width}.png` });
      await card.getByRole('button', { name: 'Back' }).click();
      await btn.waitFor(); await m('afterBack');
      await btn.click(); await card.waitFor();
      const first = page.locator('button:has-text("Club level")').first();
      for (let i = 0; i < 40 && await first.isDisabled(); i++) await page.waitForTimeout(250);
      const picked = (await first.locator('span.font-bold').innerText()).trim();
      await first.click();
      await page.getByText('Manager Career').first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(800); await page.reload();
      await page.getByText('Manager Career').first().waitFor({ timeout: 30000 });
      const managing = await page.getByText(/Managing /).first().innerText();
      log.push(`${name} w=${width} picked=${picked} afterReload="${managing}" ok=${managing.includes(picked)}`);
      if (!managing.includes(picked)) fails++;
    } else {
      await page.getByText('has made an approach').waitFor({ timeout: 30000 }); await page.waitForTimeout(1500); await m('pending');
      const next = page.getByRole('button', { name: /Next Manager Season/ });
      const stay = page.getByRole('button', { name: /^Stay at / }), accept = page.getByRole('button', { name: 'Accept move' });
      const r = async l => { const b = await l.boundingBox(); return b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] : null; };
      log.push(`${name} w=${width} nextDisabled=${await next.isDisabled()} accept=${JSON.stringify(await r(accept))} stay=${JSON.stringify(await r(stay))}`);
      await page.screenshot({ path: `${OUT}/pending-${width}.png` });
      await stay.click();
      await page.getByText('has made an approach').waitFor({ state: 'detached', timeout: 10000 });
      await page.waitForTimeout(800); await page.reload();
      await page.getByText('Manager Career').first().waitFor({ timeout: 30000 });
      const body = await page.evaluate(() => document.body.innerText);
      log.push(`${name} w=${width} afterStayReload stayed=${body.includes('Stayed with')} stillPending=${body.includes('Decision pending')} approach=${body.includes('has made an approach')}`);
      if (!body.includes('Stayed with') || body.includes('Decision pending')) fails++;
    }
  } catch (e) { fails++; log.push(`${name} w=${width} ERROR ${String(e.message).slice(0, 200)}`); await page.screenshot({ path: `${OUT}/err-${name}-${width}.png` }).catch(() => {}); }
  if (errors.length) log.push(`${name} w=${width} pageerrors=${JSON.stringify(errors)}`);
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/walk.txt`, log.join('\n'));
console.log(log.join('\n'));
console.log(`WALK SUMMARY fails=${fails}`);
process.exit(fails ? 1 : 0);
