/* Reviewer walk, Release BS PR 416 and PR 420, on the built site with an old (pre AZ, unseeded) save planted.
   Measures: Buy rows with and without the new Save button, the Buy list place across Save and Back, the 13th
   save message, the full shortlist board against the viewport, the Back button height, and the Loan plan card.
   Prints numbers; exit 0 unless the walk could not run (exit 2). */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'walk') : '.tmp-fx/walk';
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync('scripts/data/cmPreAzMarketFixture.json', 'utf8'));
const SAVE_KEY = 'dukb-club-manager-save', NOW = Date.UTC(2026, 9, 28, 16, 0, 0);
const out = (...a) => console.log('WALK', ...a);
const browser = await pw.chromium.launch();
async function resume(size) {
  const origin = new URL(BASE).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.addInitScript(([k, v, now]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ }
    Date.now = () => now;
  }, [SAVE_KEY, FX.saves.A, NOW]);
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  const slot = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
  const any = page.locator('button', { hasText: 'Resume Career' }).first();
  await any.waitFor({ timeout: 60000 });
  await ((await slot.count()) ? slot : any).click();
  await page.locator('[data-cm-hub]').waitFor({ timeout: 60000 });
  await page.getByRole('tab', { name: 'Market', exact: true }).click();
  await page.locator('input[aria-label="Search player or club"]').waitFor();
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
const listOf = page => page.locator('input[aria-label="Search player or club"]').locator('xpath=following-sibling::div[1]');
async function rowStats(page) {
  return listOf(page).evaluate(list => {
    const rows = [...list.children].filter(r => r.querySelector('button[aria-label^="Save "]'));
    const h = rows.slice(0, 10).map(r => r.getBoundingClientRect().height);
    const saves = rows.map(r => r.querySelector('button[aria-label^="Save "]'));
    saves.forEach(b => { b.style.display = 'none'; });
    const h0 = rows.slice(0, 10).map(r => r.getBoundingClientRect().height);
    saves.forEach(b => { b.style.display = ''; });
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    return { listHeight: list.clientHeight, rows: rows.length, rowWithSave: avg(h), rowWithoutSave: avg(h0),
      visibleWith: +(list.clientHeight / avg(h)).toFixed(1), visibleWithout: +(list.clientHeight / avg(h0)).toFixed(1) };
  });
}
async function saveRow(page, index) {
  const list = listOf(page);
  const before = await list.evaluate((l, i) => {
    const rows = [...l.children].filter(r => r.querySelector('button[aria-label^="Save "]'));
    const row = rows[i]; l.scrollTop = row.offsetTop - l.offsetTop - 40;
    return { name: row.querySelector('button[aria-label^="Save "]').getAttribute('aria-label').slice(5), listTop: l.scrollTop, pageY: window.scrollY };
  }, index);
  await page.locator(`button[aria-label="Save ${before.name}"]`).evaluate(b => b.click());
  await page.locator('#cm-recruitment-title').waitFor();
  await page.waitForTimeout(300);
  const board = await page.evaluate(() => ({ pageY: window.scrollY, msg: document.querySelector('section[aria-labelledby="cm-recruitment-title"] [aria-live]')?.textContent ?? '' }));
  return { before, board };
}
async function back(page) {
  await page.locator('section[aria-labelledby="cm-recruitment-title"]').getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator('input[aria-label="Search player or club"]').waitFor();
  await page.waitForTimeout(300);
  return listOf(page).evaluate(l => ({ listTop: l.scrollTop, pageY: window.scrollY, focused: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.slice(0, 30) }));
}
for (const size of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const tag = size.width;
  let run;
  try { run = await resume(size); } catch (e) { console.log(`walk: cannot run at ${tag}: ${e}`); process.exit(2); }
  const { page, errors } = run;
  out(tag, 'rows', JSON.stringify(await rowStats(page)));
  await page.screenshot({ path: path.join(OUT, `buy-${tag}.png`) });
  const first = await saveRow(page, 20);
  await page.screenshot({ path: path.join(OUT, `board-after-save-${tag}.png`) });
  const after = await back(page);
  out(tag, 'save row 20', JSON.stringify(first), 'after Back', JSON.stringify(after));
  if (tag === 320) {
    for (let i = 21; i < 32; i++) { await saveRow(page, i); await back(page); }
    const thirteenth = await saveRow(page, 33);
    out(tag, '13th save', JSON.stringify(thirteenth.board));
    await page.screenshot({ path: path.join(OUT, `board-full-${tag}.png`), fullPage: true });
    const geo = await page.evaluate(() => {
      const s = document.querySelector('section[aria-labelledby="cm-recruitment-title"]').getBoundingClientRect();
      const b = [...document.querySelectorAll('section[aria-labelledby="cm-recruitment-title"] button')].find(x => x.textContent === 'Back').getBoundingClientRect();
      return { boardHeight: Math.round(s.height), viewport: innerHeight, backHeight: Math.round(b.height), backWidth: Math.round(b.width), docWidth: document.documentElement.scrollWidth };
    });
    out(tag, 'full board', JSON.stringify(geo));
    await back(page);
  }
  /* The Sell desk's Loan plan card, opened. */
  await page.getByRole('button', { name: 'Sell', exact: true }).first().click().catch(e => out(tag, 'sell click failed', String(e).slice(0, 120)));
  const plan = page.locator('[data-cm-tile-btn="loan-plan"]');
  if (await plan.count()) {
    const y0 = await page.evaluate(() => window.scrollY);
    await plan.click(); await page.locator('[data-testid="loan-plan-body"]').waitFor(); await page.waitForTimeout(400);
    const g = await page.evaluate(() => ({ body: Math.round(document.querySelector('[data-testid="loan-plan-body"]').getBoundingClientRect().height), pageY: scrollY, docWidth: document.documentElement.scrollWidth }));
    out(tag, 'loan plan open', JSON.stringify({ y0, ...g, viewport: size.height }));
    await page.screenshot({ path: path.join(OUT, `loanplan-${tag}.png`) });
  } else out(tag, 'loan plan tile not found');
  out(tag, 'page errors', errors.length, JSON.stringify(errors.slice(0, 3)));
  await run.ctx.close();
}
await browser.close();
console.log('walk: done');
