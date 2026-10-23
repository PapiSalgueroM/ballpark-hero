// Round 1554 walk: a served build, Chromium, the database host blocked. Not committed; sent as an extra file.
// Notre Dame at 390x844 and 320x568: the Play tab names this week's opponent, the Schedule tab lists all twelve
// games before kickoff, the Conferences tab has an Independent table and the Group of Five's auto spot mark, no
// horizontal scroll; then a whole season, and the recap ledger names the Group of Five spot and no G5 title game.
import fs from 'node:fs';
import path from 'node:path';
import pw from 'playwright';
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.tmp-fx/walk1554';
fs.mkdirSync(OUT, { recursive: true });
let checks = 0; let failed = 0;
const check = (ok, what) => { checks += 1; if (!ok) { failed += 1; console.log('  FAIL: ' + what); } else console.log('  ok: ' + what); };
const browser = await pw.chromium.launch();
for (const [w, h] of [[390, 844], [320, 568]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/cfb-dynasty`, { waitUntil: 'networkidle' });
  /* Release BR triage: answer the cookie banner first, as a visitor would. Since the other lane's Round 1451 the site
     chrome is a sticky 44px bar, and at 320x568 the bar plus the banner left no point of a button clickable
     (rBR-rgBRd3: data-site-chrome, then "Save choices", intercepts pointer events). WALK1554_CONTROL=banner leaves
     the banner up, the walk as it was, and must go red at 320. */
  if (process.env.WALK1554_CONTROL !== 'banner') {
    const reject = page.getByRole('button', { name: /^Reject all$/ }).first();
    if (await reject.isVisible().catch(() => false)) { await reject.click(); await page.waitForTimeout(200); }
  }
  await page.getByRole('button', { name: /Notre Dame/ }).first().click();
  await page.waitForTimeout(400);
  const shot = async name => page.screenshot({ path: path.join(OUT, `${w}-${name}.png`), fullPage: false });
  const noScroll = async where => check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${w}: no horizontal scroll on ${where}`);
  await page.getByRole('button', { name: /^Play$/ }).first().click();
  await page.waitForTimeout(200);
  const playText = await page.locator('body').innerText();
  check(/This week: (vs|at) /.test(playText), `${w}: the Play tab names this week's opponent`);
  check(/set before kickoff/.test(playText), `${w}: the Play tab says the slate is set before kickoff`);
  check(/Notre Dame is in if it ranks top 12/.test(playText), `${w}: the footnote states the top 12 rule`);
  await shot('play'); await noScroll('Play');
  await page.getByRole('button', { name: /^Schedule$/ }).first().click();
  await page.waitForTimeout(200);
  const sched = await page.locator('body').innerText();
  const rows = (sched.match(/^W\d+ (vs|at) /gm) || []).length;
  check(rows === 12, `${w}: the Schedule tab lists all twelve games before kickoff (found ${rows})`);
  await shot('schedule'); await noScroll('Schedule');
  await page.getByRole('button', { name: /^Conferences$/ }).first().click();
  await page.waitForTimeout(200);
  const conf = await page.locator('body').innerText();
  check(/Independent/i.test(conf), `${w}: the Conferences tab has an Independent table`);
  check(/\(auto spot\)/.test(conf), `${w}: the Group of Five leader carries the auto spot mark`);
  await shot('conferences'); await noScroll('Conferences');
  if (w === 390) {
    await page.getByRole('button', { name: /^Play$/ }).first().click();
    for (let i = 0; i < 12; i += 1) {
      const btn = page.getByRole('button', { name: /^(Play Week \d+|Final week \+ the Playoff)$/ }).first();
      if (!(await btn.count())) break;
      await btn.click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(800);
    const recap = await page.locator('body').innerText();
    check(/Group of Five spot: /.test(recap), '390: the recap ledger names the Group of Five spot');
    check(!/G5 Championship|Group of Five Championship/.test(recap), '390: no Group of Five title game in the recap');
    check(!/ACC Championship: Notre Dame/.test(recap), '390: Notre Dame did not win an ACC title game');
    await shot('recap'); await noScroll('the recap');
  }
  await ctx.close();
}
await browser.close();
console.log(`walk1554: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
