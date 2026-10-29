// Round 1522 fix walk (after the run review's slowload.mjs): a career with instructions, reloaded, Quick Sim tapped
// while the tactics chunk is on its way. MODE=slow (chunk held 5 s: the tap must be held and played once it lands),
// MODE=none (control, chunk not held: plays at once), MODE=fail (chunk aborted: the page must say so).
// Exit 0 when the mode's expectation holds, 1 when it does not, 2 when the walk could not run.
import path from 'node:path';
import fs from 'node:fs';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const MODE = process.env.MODE || 'slow';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/fx-out';
fs.mkdirSync(OUT, { recursive: true });
const pause = (page, ms) => page.waitForTimeout(ms);
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
async function dismissConsent(page) {
  for (const name of [/^\s*Essential only\s*$/, /^\s*(Reject|Decline)( all)?\s*$/i, /^\s*Save choices\s*$/]) {
    const b = page.locator('button:visible').filter({ hasText: name });
    if (await visible(b)) { await b.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 400); return; }
  }
}
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
const save = () => page.evaluate(() => { const c = JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'); return c ? { week: c.week, played: c.careerStats?.played ?? null, instr: c.instructions ?? null } : null; });
let code = 2;
try {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1200);
  await dismissConsent(page);
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 600);
  await page.locator('text=England').first().click();
  await pause(page, 600);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 600);
  await dismissConsent(page);
  await page.locator('button:has-text("Arsenal")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await page.locator('[data-cm-meters]').waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Tactics/ }).first().click({ timeout: 10000 });
  await page.locator('[data-cm-instr-open="tab"]').click();
  await page.locator('[data-cm-instr-btn="tab:press:1"]').click();
  await pause(page, 600);
  const start = await save();
  console.log(`  ${MODE}: save before the reload ${JSON.stringify(start)}`);
  if (!start || !start.instr) throw new Error('the high press did not reach the save');
  if (MODE === 'slow') await ctx.route(/clubManagerTactics[^/]*\.js/, async r => { await new Promise(res => setTimeout(res, 5000)); await r.continue(); });
  if (MODE === 'fail') await ctx.route(/clubManagerTactics[^/]*\.js/, r => r.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  const tap = async () => {
    await page.locator('button:visible').filter({ hasText: /^(Resume|Continue)/ }).first().click({ timeout: 8000 }).catch(() => {});
    const quick = page.locator('button:visible').filter({ hasText: /Quick Sim/ }).first();
    await quick.waitFor({ timeout: 15000 });
    await quick.click();
  };
  await tap();
  if (MODE === 'fail') {
    let alert = false;
    for (let i = 0; i < 4 && !alert; i++) {
      await pause(page, 2500);
      alert = await visible(page.locator('[data-testid="cm-tactics-failed"]'));
      if (!alert) await tap().catch(() => {});
    }
    const after = await save();
    await page.screenshot({ path: path.join(OUT, 'fx-fail.png') }).catch(() => {});
    const text = alert ? (await page.locator('[data-testid="cm-tactics-failed"]').first().innerText()).replace(/\s+/g, ' ') : '';
    console.log(`  fail: notice ${alert} "${text}"; save after ${JSON.stringify(after)}`);
    code = alert && after.played === start.played ? 0 : 1;
    console.log(code === 0 ? 'fx-slowload fail: green, the page says the tactics did not load and nothing played' : 'fx-slowload fail: RED');
  } else {
    await pause(page, MODE === 'slow' ? 8000 : 2000);
    const after = await save();
    await page.screenshot({ path: path.join(OUT, `fx-${MODE}.png`) }).catch(() => {});
    console.log(`  ${MODE}: save after the tap ${JSON.stringify(after)}`);
    code = after && after.week > start.week && (after.played ?? 0) > (start.played ?? 0) ? 0 : 1;
    console.log(code === 0 ? `fx-slowload ${MODE}: green, the tap played the match` : `fx-slowload ${MODE}: RED, the tap was dropped`);
  }
} catch (e) { console.log(`fx-slowload: stopped: ${String(e).split('\n')[0]}`); code = 2; await page.screenshot({ path: path.join(OUT, 'fx-stopped.png') }).catch(() => {}); }
console.log(`  page errors: ${errors.length} ${errors.slice(0, 2).join(' | ')}`);
await browser.close();
process.exit(code);
