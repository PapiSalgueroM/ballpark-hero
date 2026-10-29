/* Release BS fix walk for BS-cm416-2, BS-cm416-3 and BS-cm416-5 (never committed; built on the verifiers'
   walkVf.mjs and vfWalk3.mjs). A built site, the pre AZ save A planted, Supabase and every off origin request
   aborted, at 320x640, 390x844 and 1280x900. Asserts:
   rows   every Buy row has a Save, the Save is at least 44 by 44, the median row is no taller than 50 px and at
          least 6 rows show whole at the top of the list window (base before PR 420: median 42.5, 7 whole;
          PR 420: median 88, 3 whole); the list has no sideways overflow.
   place  Save on row 20 by keyboard, Back by keyboard: the list comes back within 2 px of where it was and
          focus is on that row's Save.
   back   the board's Back label sits on one line (no break inside the word).
   Controls: the base build must fail rows and place (run it with BASE=http://localhost:4174).
   Exit 0 green, 1 a check failed, 2 could not run. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const TAG = process.env.TAG ?? 'head';
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'cmwalk') : '.tmp-fx/cmwalk';
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync('scripts/data/cmPreAzMarketFixture.json', 'utf8'));
const SAVE_KEY = 'dukb-club-manager-save', NOW = Date.UTC(2026, 9, 28, 16, 0, 0);
const browser = await pw.chromium.launch();
let failures = 0;
const check = (ok, what, data) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${TAG} ${what} ${JSON.stringify(data)}`); if (!ok) failures += 1; };

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
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const LIST = 'input[aria-label="Search player or club"] ~ div.overflow-y-auto';
const measure = page => page.evaluate(sel => {
  const list = document.querySelector(sel);
  const rows = [...list.children].filter(r => [...r.querySelectorAll('button')].some(b => /^(Talk|Cold)/.test(b.textContent.trim())));
  list.scrollTop = 0;
  const top = list.getBoundingClientRect().top + list.clientTop;
  const hs = rows.map(r => r.getBoundingClientRect().height).sort((a, b) => a - b);
  const saves = rows.map(r => r.querySelector('button[aria-label^="Save "]')).filter(Boolean);
  const small = saves.filter(b => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length;
  return { rows: rows.length, saves: saves.length, small, median: hs[Math.floor(hs.length / 2)],
    whole: rows.filter(r => r.getBoundingClientRect().bottom - top <= list.clientHeight + 0.5).length,
    sideways: list.scrollWidth - list.clientWidth };
}, LIST);
const scrollToRow = (page, i) => page.evaluate(([sel, i]) => {
  const l = document.querySelector(sel);
  const rows = [...l.children].filter(r => r.querySelector('button[aria-label^="Save "]'));
  const row = rows[i]; l.scrollTop = row.offsetTop - l.offsetTop - 40;
  return { name: row.querySelector('button[aria-label^="Save "]').getAttribute('aria-label').slice(5), listTop: Math.round(l.scrollTop) };
}, [LIST, i]);
const readList = (page, name) => page.evaluate(([sel, name]) => {
  const l = document.querySelector(sel);
  const b = [...l.querySelectorAll('button[aria-label]')].find(x => x.getAttribute('aria-label') === `Save ${name}`);
  return { listTop: Math.round(l.scrollTop), focusedIsRowSave: !!b && document.activeElement === b,
    focused: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim().slice(0, 30) };
}, [LIST, name]);
const pressOn = async (page, locator) => { await locator.evaluate(el => el.focus({ preventScroll: true })); await page.keyboard.press('Enter'); };
const board = page => page.locator('section[aria-labelledby="cm-recruitment-title"]');

for (const size of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const w = size.width;
  let run;
  try { run = await resume(size); } catch (e) { console.log(`cmwalk: cannot run at ${w}: ${e}`); process.exit(2); }
  const { page, errors, ctx } = run;
  const m = await measure(page);
  check(m.rows > 20 && m.saves === m.rows && m.small === 0, `${w} rows: every row has a 44 px Save`, m);
  check(m.median <= 50 && m.whole >= 6, `${w} rows: no taller than before`, { median: m.median, whole: m.whole });
  check(m.sideways <= 0, `${w} rows: no sideways overflow`, { sideways: m.sideways });
  const before = await scrollToRow(page, 20);
  await page.waitForTimeout(300);
  await pressOn(page, page.locator(`button[aria-label="Save ${before.name}"]`));
  await page.locator('#cm-recruitment-title').waitFor();
  await page.waitForTimeout(400);
  const back = board(page).getByRole('button', { name: 'Back', exact: true });
  const label = await back.evaluate(b => { const r = document.createRange(); r.selectNodeContents(b); const lines = new Set([...r.getClientRects()].map(x => Math.round(x.top))); return { lines: lines.size, text: b.textContent.trim() }; });
  check(label.lines === 1, `${w} back: one line`, label);
  await page.screenshot({ path: path.join(OUT, `${TAG}-board-${w}.png`) });
  await pressOn(page, back);
  await page.locator('input[aria-label="Search player or club"]').waitFor();
  await page.waitForTimeout(500);
  const after = await readList(page, before.name);
  check(Math.abs(after.listTop - before.listTop) <= 2 && after.focusedIsRowSave, `${w} place: Back keeps the list and focus`, { before, after });
  await page.screenshot({ path: path.join(OUT, `${TAG}-list-${w}.png`) });
  check(errors.length === 0, `${w} no page errors`, errors.slice(0, 2));
  await ctx.close();
}
await browser.close();
console.log(failures ? `cmwalk ${TAG}: RED, ${failures} failure(s)` : `cmwalk ${TAG}: green at 320, 390 and 1280`);
process.exit(failures ? 1 : 0);
