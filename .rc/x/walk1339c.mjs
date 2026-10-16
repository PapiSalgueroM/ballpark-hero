// Reviewer walk C for Round 1339 (runner only, #!serve #!playwright). Fixture C is an old (pre AZ) Real Madrid save
// held mid talk for Ferland Mendy, a man at the player's OWN club. After the round he is off the market; the talk
// is still in the save. What does a player see, and can he finish it into one man? Also save B's searches with the
// accents the names really carry. Pictures to $RC_OUT/rc/. Exit 0 green, 1 a check failed, 2 could not run.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.join(process.env.RC_OUT ?? '.tmp-fx', 'rc');
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync('scripts/data/cmPreAzMarketFixture.json', 'utf8'));
const NOW = Date.UTC(2026, 9, 16, 16, 0, 0);
const fails = [];
const check = (ok, msg) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg); };
const browser = await chromium.launch();

async function resume(key, size, motion) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: motion, serviceWorkers: 'block' });
  const origin = new URL(BASE).origin;
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.addInitScript(([k, v, now]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ }
    Date.now = () => now;
  }, ['dukb-club-manager-save', FX.saves[key], NOW]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  const btn = page.locator('button', { hasText: 'Resume Career' }).first();
  await btn.waitFor({ timeout: 45000 });
  await btn.click();
  await page.locator('[data-cm-hub]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
async function rowsFor(page, query) {
  const box = page.locator('input[aria-label="Search player or club"]');
  await box.fill(query);
  await page.waitForTimeout(500);
  return box.locator('xpath=following-sibling::div[1]').evaluate(list => [...list.children]
    .map(row => ({ name: row.querySelector('span.text-foreground.truncate')?.textContent?.trim() ?? '', line: row.querySelector('.text-muted-foreground.truncate')?.textContent?.trim() ?? '' })));
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const tab = async (page, name) => { await page.getByRole('tab', { name, exact: true }).click(); await page.waitForTimeout(500); };
const count = (text, s) => text.split(s).length - 1;

const RUNS = [[{ width: 390, height: 844 }, 'reduce'], [{ width: 390, height: 844 }, 'no-preference'], [{ width: 1280, height: 900 }, 'reduce']];
for (const [size, motion] of RUNS) {
  const tag = `C-${size.width}-${motion === 'reduce' ? 'rm' : 'motion'}`;
  console.log(`save C (Real Madrid, season 1, a talk open for Ferland Mendy) ${size.width}x${size.height} ${motion}`);
  let w;
  try { w = await resume('C', size, motion); } catch (e) { console.log(`walk1339c: cannot run: ${e.message.split('\n')[0]}`); process.exit(2); }
  const { page, ctx, errors } = w;
  await tab(page, 'Squad');
  const before = count(await page.locator('body').innerText(), 'Ferland Mendy');
  console.log(`  MEASURED ${tag}: the Squad tab names Ferland Mendy ${before} times before the deal`);
  await tab(page, 'Market');
  const card = page.locator('[data-testid="cm-deal-card"]');
  let shown = false;
  try { await card.first().waitFor({ timeout: 15000 }); shown = true; } catch { /* no card */ }
  console.log(`  MEASURED ${tag}: the deal card is ${shown ? 'shown' : 'NOT shown'}${shown ? `: ${(await card.first().innerText()).split('\n').slice(0, 4).join(' / ')}` : ''}`);
  if (shown) { await card.first().scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(OUT, `deal-open-${tag}.png`) }); }
  const mendy = await rowsFor(page, 'Mendy');
  check(mendy.filter(r => r.line.startsWith('Real Madrid ·')).length === 0, `${tag}: searching Mendy lists ${mendy.filter(r => r.line.startsWith('Real Madrid ·')).length} rows at Real Madrid (${mendy.map(r => r.name).filter(Boolean).join(', ')})`);
  await rowsFor(page, '');
  if (shown) {
    try {
      await card.locator('button', { hasText: 'Meet ask' }).first().click();
      await page.waitForTimeout(900);
      const give = card.locator('button', { hasText: 'Give him what he wants' });
      if (await give.count()) { await give.first().click(); await page.waitForTimeout(300); await card.locator('button', { hasText: 'Put it to him' }).first().click(); await page.waitForTimeout(1200); }
      const txt = await card.first().innerText().catch(() => '(card gone)');
      console.log(`  MEASURED ${tag}: after Meet ask and his terms the card reads: ${txt.split('\n').slice(0, 5).join(' / ')}`);
      await card.first().scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: path.join(OUT, `deal-done-${tag}.png`) });
      check(await overflow(page) <= 0, `${tag}: the Market tab scrolls sideways by ${await overflow(page)}px with the deal card`);
    } catch (e) { check(false, `${tag}: the talk could not be played: ${e.message.split('\n')[0]}`); }
    await tab(page, 'Squad');
    const after = count(await page.locator('body').innerText(), 'Ferland Mendy');
    console.log(`  MEASURED ${tag}: the Squad tab names Ferland Mendy ${after} times after the deal`);
    check(after <= 1, `${tag}: Ferland Mendy is in my squad at most once (${after})`);
    await page.screenshot({ path: path.join(OUT, `squad-after-${tag}.png`), fullPage: false });
  }
  check(errors.length === 0, `${tag}: ${errors.length} page errors${errors.length ? ` (${errors[0].slice(0, 160)})` : ''}`);
  await ctx.close();
}
/* Save B: the names with their real accents, and the free agents an old market used to double list. */
{
  const { page, ctx, errors } = await resume('B', { width: 390, height: 844 }, 'reduce');
  await tab(page, 'Market');
  for (const q of ['Mbapp', 'Vinícius', 'Bellingham', 'Valverde', 'Huijsen']) {
    const r = await rowsFor(page, q);
    console.log(`  MEASURED B-390: searching "${q}" lists ${r.filter(x => x.name).length} rows: ${r.filter(x => x.name).slice(0, 4).map(x => `${x.name} | ${x.line}`).join(' ; ')}`);
  }
  const save = JSON.parse(FX.saves.B);
  console.log(`  MEASURED B: free agents in the save from my club: ${(save.freeAgents ?? []).filter(f => f.fromMyClub).map(f => `${f.name} (${f.reason})`).join(', ')}`);
  await rowsFor(page, 'Bellingham');
  await page.screenshot({ path: path.join(OUT, `B-bellingham-390.png`) });
  check(errors.length === 0, `B-390: ${errors.length} page errors`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `walk1339c: ${fails.length} FAILURE(S)` : `walk1339c: green (pictures in ${OUT})`);
process.exit(fails.length ? 1 : 0);
