/* Skeptic walk for BS-cm416-3 (PR 420 head 11aa2a6ef). Built site, old pre AZ save A planted, Supabase and every
   off origin request aborted. Per width:
   control A: scroll the Buy list to row 20, re-render without unmount (click the Buy mode button), read scrollTop.
              Proves the measurement sees a kept place when the list survives.
   main:      scroll to row 20, keyboard Enter on that row's Save, Back by keyboard Enter, then read the list's
              scrollTop, whether it is the same DOM node (a data attribute planted before Save), whether the row's
              Save button is still connected, whether row 20 is inside the list's visible window, and the focus.
   control B: keyboard Enter on the top Shortlist button, Back, read focus. Proves the restore path works when the
              opener survives, so a lost focus on Save is the unmount and not the measurement.
   Prints VF lines; exit 0 when the walk ran, exit 2 when it could not run. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'vf') : '.tmp-fx/vf';
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync('scripts/data/cmPreAzMarketFixture.json', 'utf8'));
const SAVE_KEY = 'dukb-club-manager-save', NOW = Date.UTC(2026, 9, 28, 16, 0, 0);
const log = (...a) => console.log('VF', ...a);
const browser = await pw.chromium.launch();
const results = [];

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
const LIST = 'input[aria-label="Search player or club"] ~ div.overflow-y-auto';
const scrollToRow = (page, i, tag) => page.evaluate(([sel, i, tag]) => {
  const l = document.querySelector(sel);
  const rows = [...l.children].filter(r => r.querySelector('button[aria-label^="Save "]'));
  const row = rows[i]; l.scrollTop = row.offsetTop - l.offsetTop - 40; l.setAttribute('data-vf', tag);
  return { rows: rows.length, name: row.querySelector('button[aria-label^="Save "]').getAttribute('aria-label').slice(5), listTop: Math.round(l.scrollTop), pageY: Math.round(scrollY) };
}, [LIST, i, tag]);
const readList = (page, name) => page.evaluate(([sel, name]) => {
  const l = document.querySelector(sel);
  const b = document.querySelector(`button[aria-label="Save ${name}"]`);
  const lr = l.getBoundingClientRect(), br = b ? b.getBoundingClientRect() : null;
  const a = document.activeElement;
  return { listTop: Math.round(l.scrollTop), sameNode: l.getAttribute('data-vf'), pageY: Math.round(scrollY),
    rowInListWindow: br ? br.top >= lr.top && br.bottom <= lr.bottom : null,
    focused: a ? (a.getAttribute('aria-label') ?? (a.textContent ?? '').trim().slice(0, 30)) : null,
    focusedIsRowSave: a === b };
}, [LIST, name]);
const pressOn = async (page, locator) => { await locator.evaluate(el => el.focus({ preventScroll: true })); await page.keyboard.press('Enter'); };
const boardBack = page => page.locator('section[aria-labelledby="cm-recruitment-title"]').getByRole('button', { name: 'Back', exact: true });

for (const size of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const w = size.width;
  let run;
  try { run = await resume(size); } catch (e) { console.log(`vf: cannot run at ${w}: ${e}`); process.exit(2); }
  const { page, errors } = run;
  /* control A: the list keeps its place when it is not unmounted */
  const a0 = await scrollToRow(page, 20, 'ctlA');
  await page.waitForTimeout(500);
  await pressOn(page, page.getByRole('button', { name: 'Buy', exact: true }).first());
  await page.waitForTimeout(500);
  const a1 = await readList(page, a0.name);
  log(w, 'controlA', JSON.stringify({ before: a0, after: a1 }));
  /* main: Save on row 20, then Back */
  const m0 = await scrollToRow(page, 20, 'main');
  const saveBtn = await page.locator(`button[aria-label="Save ${m0.name}"]`).elementHandle();
  await pressOn(page, page.locator(`button[aria-label="Save ${m0.name}"]`));
  await page.locator('#cm-recruitment-title').waitFor();
  await page.waitForTimeout(400);
  const mb = await page.evaluate(() => ({ listPresent: !!document.querySelector('input[aria-label="Search player or club"]'),
    msg: document.querySelector('section[aria-labelledby="cm-recruitment-title"] [aria-live]')?.textContent ?? '', pageY: Math.round(scrollY) }));
  const btnConnectedOnBoard = await saveBtn.evaluate(b => b.isConnected);
  await page.screenshot({ path: path.join(OUT, `board-${w}.png`) });
  await pressOn(page, boardBack(page));
  await page.locator('input[aria-label="Search player or club"]').waitFor();
  await page.waitForTimeout(500);
  const m1 = await readList(page, m0.name);
  const btnConnectedAfterBack = await saveBtn.evaluate(b => b.isConnected);
  await page.screenshot({ path: path.join(OUT, `after-back-${w}.png`) });
  log(w, 'main', JSON.stringify({ before: m0, board: { ...mb, btnConnectedOnBoard }, afterBack: { ...m1, btnConnectedAfterBack } }));
  /* control B: the opener that survives gets its focus back */
  await pressOn(page, page.locator('[data-cm-shortlist-open]'));
  await page.locator('#cm-recruitment-title').waitFor();
  await page.waitForTimeout(300);
  await pressOn(page, boardBack(page));
  await page.locator('input[aria-label="Search player or club"]').waitFor();
  await page.waitForTimeout(500);
  const b1 = await page.evaluate(() => ({ focused: document.activeElement?.textContent?.trim().slice(0, 30) ?? null,
    focusedIsOpener: document.activeElement === document.querySelector('[data-cm-shortlist-open]') }));
  log(w, 'controlB', JSON.stringify(b1));
  log(w, 'page errors', errors.length, JSON.stringify(errors.slice(0, 3)));
  results.push({ w, controlA: { before: a0, after: a1 }, main: { before: m0, board: { ...mb, btnConnectedOnBoard }, afterBack: { ...m1, btnConnectedAfterBack } }, controlB: b1, errors: errors.length });
  await run.ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
console.log('vf: done');
