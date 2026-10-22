// Review walk for Round 1522: a career with instructions, reloaded, Quick Sim pressed while the tactics module is
// still on its way (its chunk held back 5 s). Does the click play the match, wait, or vanish?
import path from 'node:path';
import fs from 'node:fs';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rv-out';
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
const chunks = [];
page.on('request', r => { if (/clubManagerTactics/i.test(r.url())) chunks.push(`${Date.now()} ${r.url().split('/').pop()}`); });
const save = () => page.evaluate(() => { const c = JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'); return c ? { week: c.week, played: c.careerStats?.played ?? null, instr: c.instructions ?? null } : null; });
try {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  console.log(`  tactics chunk requests on a fresh /club-manager load: ${chunks.length} (${chunks.join(', ')})`);
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
  console.log(`  tactics chunk requests by the hub: ${chunks.length}`);
  await page.getByRole('tab', { name: /Tactics/ }).first().click({ timeout: 10000 });
  await page.locator('[data-cm-instr-open="tab"]').click();
  await page.locator('[data-cm-instr-btn="tab:press:1"]').click();
  await pause(page, 400);
  console.log(`  save after the tap: ${JSON.stringify(await save())}`);
  // hold the tactics chunk back for 5 s, then reload
  await ctx.route(/clubManagerTactics[^/]*\.js/, async r => { await new Promise(res => setTimeout(res, 5000)); await r.continue(); });
  chunks.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  await page.locator('button:visible').filter({ hasText: /^(Resume|Continue)/ }).first().click({ timeout: 15000 }).catch(() => {});
  const quick = page.locator('button:visible').filter({ hasText: /Quick Sim/ }).first();
  await quick.waitFor({ timeout: 15000 });
  const before = await save();
  await quick.click();
  const tClick = Date.now() - t0;
  await pause(page, 1500);
  const after1 = await save();
  const reportUp1 = await visible(page.locator('text=Full report'));
  await page.screenshot({ path: path.join(OUT, 'slow-after-click.png') }).catch(() => {});
  await pause(page, 6000);
  const after2 = await save();
  const reportUp2 = await visible(page.locator('text=Full report'));
  console.log(`  clicked Quick Sim ${tClick} ms after the reload; chunk requests ${chunks.length}`);
  console.log(`  before ${JSON.stringify(before)}; 1.5 s after the click ${JSON.stringify(after1)} report ${reportUp1}; 7.5 s after ${JSON.stringify(after2)} report ${reportUp2}`);
  await page.screenshot({ path: path.join(OUT, 'slow-after-wait.png') }).catch(() => {});
  const swallowed = JSON.stringify(before) === JSON.stringify(after2) && !reportUp2;
  console.log(swallowed ? 'slowload: the click was swallowed (nothing played, no word on screen)' : 'slowload: the click played or queued the match');
} catch (e) { console.log(`slowload: stopped: ${String(e).split('\n')[0]}`); await page.screenshot({ path: path.join(OUT, 'slow-stopped.png') }).catch(() => {}); }
console.log(`  page errors: ${errors.length} ${errors.slice(0, 2).join(' | ')}`);
await browser.close();
