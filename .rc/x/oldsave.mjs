// Review walk for Round 1522: a save made by main's build (port 4174) mid match, loaded by the branch's build (4173).
import path from 'node:path';
import fs from 'node:fs';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const HEAD = process.env.BASE ?? 'http://localhost:4173';
const MAIN = process.env.MAIN_BASE ?? 'http://localhost:4174';
const OUT = process.env.RC_OUT || '/tmp/rv-out';
fs.mkdirSync(OUT, { recursive: true });
let failures = 0, passes = 0;
const say = (ok, what) => { if (ok) { passes += 1; console.log(`  ok: ${what}`); } else { failures += 1; console.log(`  FAIL: ${what}`); } };
const pause = (page, ms) => page.waitForTimeout(ms);
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const button = (page, name) => page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
const stageIs = (page, v, timeout = 45000) => page.waitForFunction(x => [...document.querySelectorAll('[data-cm-live-stage]')].some(el => el.getAttribute('data-cm-live-stage') === x), v, { timeout });
async function dismissConsent(page) {
  for (const name of [/^\s*Essential only\s*$/, /^\s*(Reject|Decline)( all)?\s*$/i, /^\s*Save choices\s*$/]) {
    const b = page.locator('button:visible').filter({ hasText: name });
    if (await visible(b)) { await b.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 400); return; }
  }
}
const browser = await chromium.launch();
const vp = { width: 390, height: 844 };
let dump = null;
{
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  try {
    await page.goto(`${MAIN}/club-manager`, { waitUntil: 'networkidle' });
    await pause(page, 1500);
    await dismissConsent(page);
    await page.locator('button:has-text("2026-27")').first().click();
    await pause(page, 700);
    await page.locator('text=England').first().click();
    await pause(page, 700);
    await page.locator('button:has-text("Premier League")').first().click();
    await pause(page, 700);
    await dismissConsent(page);
    await page.locator('button:has-text("Brentford")').first().click();
    await pause(page, 500);
    await dismissConsent(page);
    await page.locator('text=Take the job').click();
    await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
    await page.locator('[data-cm-meters]').waitFor({ timeout: 30000 });
    await page.locator('button:visible[data-cm-way="live"]').first().click({ timeout: 20000 });
    await stageIs(page, 'first');
    await button(page, 'Skip').click({ timeout: 20000 });
    await stageIs(page, 'interval');
    await pause(page, 1000);
    await shot(page, 'old-main-interval.png');
    dump = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
    const c = JSON.parse(dump['dukb-club-manager-save'] || 'null');
    say(!!c?.live && !c.instructions && !c.live.instrLog, `main made a save paused at the interval (week ${c?.live?.week}, ${String(dump['dukb-club-manager-save'] || '').length} chars)`);
  } catch (e) { say(false, `main walk stopped: ${String(e).split('\n')[0]}`); await shot(page, 'old-main-stopped.png'); }
  await ctx.close();
}
if (dump) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(d => { if (!sessionStorage.getItem('rv-seeded')) { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v); sessionStorage.setItem('rv-seeded', '1'); } }, dump);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  try {
    await page.goto(`${HEAD}/club-manager`, { waitUntil: 'networkidle' });
    await pause(page, 1500);
    await dismissConsent(page);
    const again = page.locator('button:visible').filter({ hasText: /^(Resume|Continue)/ });
    if (await visible(again)) { await again.first().click({ timeout: 5000 }).catch(() => {}); await pause(page, 1500); }
    await page.locator('button:visible').filter({ hasText: /Resume match/ }).first().click({ timeout: 20000 }).catch(() => {});
    await page.locator('[data-cm-live-stage]').first().waitFor({ timeout: 30000 }).catch(() => {});
    const stage = await page.locator('[data-cm-live-stage]').first().getAttribute('data-cm-live-stage').catch(() => null);
    await shot(page, 'old-head-resumed.png');
    say(stage === 'interval', `the branch resumes main's save at the interval (stage ${stage})`);
    await page.locator('[data-cm-ht-tactics-open]').click({ timeout: 10000 });
    await page.locator('[data-cm-ht-tactics]').waitFor({ timeout: 10000 });
    await page.locator('[data-cm-instr-btn="ht:press:1"]').click();
    await pause(page, 500);
    const c = await page.evaluate(() => JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'));
    say(JSON.stringify(c?.live?.instrLog) === JSON.stringify([{ minute: 46, instructions: { press: 1, tempo: 0, width: 0, line: 0 } }]), `a high press at the break on main's save is logged at 46 (${JSON.stringify(c?.live?.instrLog)})`);
    await shot(page, 'old-head-ht-tactics.png');
    await page.locator('button:visible').filter({ hasText: 'Back to the dressing room' }).first().click({ timeout: 8000 });
    await button(page, 'Second half').click({ timeout: 30000 });
    await stageIs(page, 'second');
    for (let i = 0; i < 8; i++) {
      const full = button(page, 'Full report');
      if (await visible(full)) { await full.click(); break; }
      const skip = button(page, 'Skip');
      if (await visible(skip)) await skip.click().catch(() => {});
      await pause(page, 2500);
    }
    await page.locator('[data-cm-report-tactics]').waitFor({ timeout: 30000 }).catch(() => {});
    const block = ((await page.locator('[data-cm-report-tactics]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    console.log(`    report block: ${block}`);
    say(/High press/.test(block) && /They played/.test(block), 'the report of the old save names the press taken at the break');
    await page.locator('[data-cm-report-tactics]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, 'old-head-report.png');
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'));
    say(!after?.live && !('instructions' in (after ?? {})), `the old career keeps no standing instructions after the match (live ${!!after?.live}, instructions ${JSON.stringify(after?.instructions)})`);
  } catch (e) { say(false, `head walk stopped: ${String(e).split('\n')[0]}`); await shot(page, 'old-head-stopped.png'); }
  say(errors.length === 0, `no page errors on the branch (${errors.slice(0, 3).join(' | ')})`);
  await ctx.close();
}
await browser.close();
console.log(failures ? `reviewOldSave: RED (${failures} failures, ${passes} passed)` : `reviewOldSave: all green (${passes} checks)`);
process.exit(failures ? 1 : 0);
