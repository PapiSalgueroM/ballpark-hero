/* Round 1597 remote walk (not committed): the summer contracts checkpoint on a real build, at 390x844 and 1280x900.
   Opens an end of season 5 save written on main (scripts/fixtures/cmFreeAgencyOldSaves.json), resumes it to the season
   review, and checks: the tile lists the final year men, Continue is shut and says so, answering a row does not move
   the page, Renew changes the save the way the desk does (budget down, the deal renewed), and Let the rest go opens
   Continue. The database host is blocked. Screenshots go to $RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(path.resolve('package.json'));
const lz = require('lz-string');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const KEY = 'dukb-club-manager-save';
const fixture = JSON.parse(fs.readFileSync('scripts/fixtures/cmFreeAgencyOldSaves.json', 'utf8'));
const raw = lz.decompressFromBase64(fixture.saves[0].save);
let failures = 0;
const check = (ok, line) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${line}`); if (!ok) failures += 1; };

const browser = await chromium.launch();
for (const [w, h, label] of [[390, 844, 'phone'], [1280, 900, 'desktop']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([k, v]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ }
  }, [KEY, raw]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: 'Resume Career' }).first().click({ timeout: 30000 });
  await page.waitForSelector('[data-cm-deals]', { timeout: 60000 });
  await page.waitForTimeout(1500);
  const rows = await page.locator('[data-cm-deal]').count();
  const cont = page.locator('button', { hasText: /^(Answer \d+ deals? first|Continue to Season \d+)$/ }).first();
  check(rows > 0, `${label}: the review lists ${rows} final year men`);
  check(await cont.isDisabled(), `${label}: Continue is shut: "${(await cont.textContent())?.trim()}"`);
  const tile = page.locator('[data-cm-deals]');
  await tile.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  await tile.screenshot({ path: path.join(OUT, `deals-${label}-open.png`) });
  const box = async () => page.evaluate(() => { const r = document.querySelector('[data-cm-deals]').getBoundingClientRect(); return { y: window.scrollY, top: Math.round(r.top), height: Math.round(r.height) }; });
  /* Let one go with a DOM click (no scroll of Playwright's own), then measure. */
  const before = await box();
  await page.evaluate(() => document.querySelector('[data-cm-deal="open"] [data-cm-deal-letgo]').click());
  await page.waitForTimeout(400);
  const afterLetGo = await box();
  check(before.y === afterLetGo.y && before.top === afterLetGo.top && before.height === afterLetGo.height,
    `${label}: letting a man go moves nothing on the page (scroll ${before.y} to ${afterLetGo.y}, tile top ${before.top} to ${afterLetGo.top}, height ${before.height} to ${afterLetGo.height})`);
  /* Renew the first open, affordable man and read the save back. */
  const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const s0 = await saved();
  const target = await page.evaluate(() => {
    const row = [...document.querySelectorAll('[data-cm-deal="open"]')].find(r => !r.querySelector('[data-cm-deal-renew]').disabled);
    if (!row) return null;
    const name = row.querySelector('.truncate').textContent;
    row.querySelector('[data-cm-deal-renew]').click();
    return name;
  });
  if (target) {
    await page.waitForTimeout(2500);
    const s1 = await saved();
    const p0 = (s0.squad || []).find(p => p.name === target), p1 = (s1.squad || []).find(p => p.name === target);
    check(!!p1 && (p1.contractYears ?? 0) >= 2 && s1.budget < s0.budget,
      `${label}: Renew on ${target} renewed him on the save (${p0?.contractYears} to ${p1?.contractYears} years, wage ${p0?.wage} to ${p1?.wage}k, budget ${s0.budget} to ${s1.budget})`);
    const afterRenew = await box();
    check(afterRenew.height === afterLetGo.height && afterRenew.y === afterLetGo.y, `${label}: a renewal keeps the row and the page still (height ${afterLetGo.height} to ${afterRenew.height})`);
  } else {
    console.log(`  note ${label}: no open man the budget could renew, Renew not walked`);
  }
  await page.evaluate(() => document.querySelector('[data-cm-deals-rest]').click());
  await page.waitForTimeout(400);
  check(!(await cont.isDisabled()) && /^Continue to Season \d+$/.test((await cont.textContent())?.trim() ?? ''), `${label}: Let the rest go opens Continue: "${(await cont.textContent())?.trim()}"`);
  await tile.screenshot({ path: path.join(OUT, `deals-${label}-answered.png`) });
  await page.evaluate(() => document.querySelector('[data-cm-deals-help]').click());
  await page.waitForTimeout(300);
  check(await page.locator('[data-cm-deals-rules]').isVisible(), `${label}: the ? opens the rules`);
  await tile.screenshot({ path: path.join(OUT, `deals-${label}-rules.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${label}: no sideways scroll (${overflow} px)`);
  check(errors.length === 0, `${label}: no page errors${errors.length ? `: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
await browser.close();
console.log(failures ? `walk1597: RED, ${failures} failure(s)` : 'walk1597: green');
process.exit(failures ? 1 : 0);
