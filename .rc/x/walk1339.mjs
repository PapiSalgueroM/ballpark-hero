// Reviewer walk for Round 1339 (runner only, #!serve #!playwright). Plants the pre AZ fixture saves, resumes the
// career and plays the market the way a player would, at 390x844 and 1280x900, reduced motion on and off.
// Pictures go to $RC_OUT/rv/. Exit 0 green, 1 a check failed, 2 could not run.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.join(process.env.RC_OUT ?? '.tmp-fx', 'rv');
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

const RUNS = [['B', { width: 390, height: 844 }, 'reduce'], ['B', { width: 390, height: 844 }, 'no-preference'],
  ['B', { width: 1280, height: 900 }, 'reduce'], ['B', { width: 1280, height: 900 }, 'no-preference'], ['A', { width: 390, height: 844 }, 'reduce']];
for (const [key, size, motion] of RUNS) {
  const save = JSON.parse(FX.saves[key]);
  const club = save.clubName, tag = `${key}-${size.width}-${motion === 'reduce' ? 'rm' : 'motion'}`;
  const squad = new Set(save.squad.map(p => p.name));
  console.log(`save ${key} (${club}, season ${save.season}) ${size.width}x${size.height} ${motion}`);
  let w;
  try { w = await resume(key, size, motion); } catch (e) { console.log(`walk1339: cannot run: ${e.message.split('\n')[0]}`); process.exit(2); }
  const { page, ctx, errors } = w;
  await page.screenshot({ path: path.join(OUT, `hub-${tag}.png`) });
  await page.getByRole('tab', { name: 'Market', exact: true }).click();
  const box = page.locator('input[aria-label="Search player or club"]');
  await box.waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `market-top-${tag}.png`) });
  const all = await rowsFor(page, '');
  check(all.length > 0 && all.filter(r => r.line.startsWith(`${club} ·`)).length === 0, `${tag}: the unsearched list shows ${all.length} rows, ${all.filter(r => r.line.startsWith(`${club} ·`)).length} at ${club}`);
  await box.scrollIntoViewIfNeeded();
  const y0 = await page.evaluate(() => window.scrollY);
  const mine = await rowsFor(page, club);
  const y1 = await page.evaluate(() => window.scrollY);
  check(mine.filter(r => r.line.startsWith(`${club} ·`)).length === 0, `${tag}: searching ${club} lists ${mine.filter(r => r.line.startsWith(`${club} ·`)).length} rows at ${club} (${mine.length} rows in all)`);
  check(y1 === y0, `${tag}: typing the search moved the page ${y1 - y0}px`);
  await page.screenshot({ path: path.join(OUT, `market-own-${tag}.png`) });
  const rival = await rowsFor(page, 'Barcelona');
  check(rival.filter(r => r.line.startsWith('Barcelona ·')).length > 0, `${tag}: searching Barcelona lists ${rival.filter(r => r.line.startsWith('Barcelona ·')).length} rows at Barcelona (the row counter works)`);
  for (const sold of ['Mbappe', 'Vinicius', 'Mendy']) {
    const found = await rowsFor(page, sold);
    console.log(`  MEASURED ${tag}: searching "${sold}" lists ${found.length} rows: ${found.slice(0, 4).map(r => `${r.name} | ${r.line}`).join(' ; ')}`);
  }
  await rowsFor(page, 'Mbappe');
  await page.screenshot({ path: path.join(OUT, `market-sold-${tag}.png`) });
  await rowsFor(page, '');
  const text = await page.locator('body').innerText();
  const fromMe = text.split('\n').filter(l => l.includes(`from ${club}`) && ![...squad].some(n => l.includes(n)));
  console.log(`  MEASURED ${tag}: ${fromMe.length} lines on the Market tab name a man "from ${club}" who is not in the save's squad${fromMe.length ? `: ${fromMe.slice(0, 3).join(' | ')}` : ''}`);
  check(await overflow(page) <= 0, `${tag}: the Market tab scrolls sideways by ${await overflow(page)}px`);
  /* The club's own page, from the Table tab: the squad card and none of the old market's men at the club. */
  try {
    await page.getByRole('tab', { name: 'Table', exact: true }).click();
    const button = page.locator('[data-world-tables] button[data-club]').filter({ has: page.getByText(club, { exact: true }) });
    await button.first().waitFor({ timeout: 45000 });
    await button.first().click();
    const card = page.locator('div.bg-card').filter({ has: page.getByText(/^Squad \(\d+ on the books\)$/) });
    await card.first().waitFor({ timeout: 45000 });
    await card.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `club-${tag}.png`) });
    const cardText = await card.first().innerText();
    const old = FX.expect[key].names.filter(n => cardText.includes(n));
    check(old.length === 0, `${tag}: the club page names ${old.length} of the old market's men at ${club}`);
  } catch (e) { check(false, `${tag}: the club page could not be reached: ${e.message.split('\n')[0]}`); }
  check(errors.length === 0, `${tag}: ${errors.length} page errors${errors.length ? ` (${errors[0].slice(0, 120)})` : ''}`);
  await ctx.close();
}
/* What's New at 390 and 1280: the round's line renders, no sideways scroll. */
for (const size of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const origin = new URL(BASE).origin;
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded' });
  const item = page.locator('li', { hasText: 'your club is your squad on the market too' }).first();
  try {
    await item.waitFor({ timeout: 30000 });
    await item.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `whatsnew-${size.width}.png`) });
    const t = await item.innerText();
    console.log(`  MEASURED whats-new ${size.width}: ${t.slice(0, 400)}`);
    check(await overflow(page) <= 0, `whats-new ${size.width}: scrolls sideways by ${await overflow(page)}px`);
  } catch (e) { check(false, `whats-new ${size.width}: the entry was not found: ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `walk1339: ${fails.length} FAILURE(S)` : `walk1339: green (pictures in ${OUT})`);
process.exit(fails.length ? 1 : 0);
