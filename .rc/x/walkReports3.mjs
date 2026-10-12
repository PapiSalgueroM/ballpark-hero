// Review walk (screens lens, Release BA). Runner only, never committed.
// Every route x width: count the Report a problem controls outside the footer, measure where the
// game report sits against the guide's first heading, watch scrollY for a jump, and screenshot it.
// On DIALOG routes: open, submit disabled until text, Escape returns focus, failed send keeps text,
// a later success clears. Network: same origin passes; supabase.co is fulfilled LOCALLY, never reached.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.walk-out');
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [[320, 568], [390, 844], [1280, 900]];
const slug = r => r.replace(/^\//, '').replace(/\//g, '_') || 'home';
const rows = [];
const browser = await pw.chromium.launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TEXT = 'Review walk: I pressed Draft and the board froze, I expected the next pick.';

async function newCtx(w, h, extra = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, ...extra });
  const net = { fail: true, relay: [], inserts: [], external: [] };
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === new URL(BASE).origin || (process.env.BASE2 && url.origin === new URL(process.env.BASE2).origin)) return route.fallback();
    net.external.push(url.hostname);
    if (!url.hostname.endsWith('supabase.co')) return route.abort();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
    if (url.pathname.endsWith('/functions/v1/report-relay')) { net.relay.push(req.postDataJSON()); return route.fulfill({ status: net.fail ? 500 : 200, headers: cors, body: net.fail ? '{"error":"stub"}' : '{"ok":true}' }); }
    if (url.pathname.includes('/rest/v1/question_reports')) { net.inserts.push(req.method()); return route.fulfill({ status: net.fail ? 500 : 201, headers: cors, body: net.fail ? '{"message":"stub"}' : '' }); }
    return route.fulfill({ status: 200, headers: cors, body: '[]' });
  });
  return { context, net };
}
async function formChecks(page, opener, net, row, id, h, sendName, tag) {
  const d = {};
  await opener.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 8000 });
  const send = dialog.getByRole('button', { name: sendName, exact: true });
  const box = dialog.getByRole('textbox', { name: 'Describe the problem' });
  d.disabledEmpty = await send.isDisabled();
  await dialog.getByRole('button', { name: 'Bug', exact: true }).click();
  d.disabledChipOnly = await send.isDisabled();
  await box.fill('   ');
  d.disabledSpaces = await send.isDisabled();
  await box.fill(TEXT);
  d.enabledWithText = await send.isEnabled();
  const r = await dialog.evaluate(el => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; });
  d.dialogRect = r; d.fits = r.top >= 0 && r.bottom <= h && r.left >= 0 && r.right <= page.viewportSize().width;
  d.small = await dialog.evaluate(el => [...el.querySelectorAll('*')].filter(n => n.childNodes.length && [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(n).fontSize) < 12).map(n => n.textContent.trim().slice(0, 30)));
  await page.screenshot({ path: path.join(OUT, `${id}-${tag}dialog.png`) }); row.shots.push(`${id}-${tag}dialog.png`);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { d.escapeFailed = true; });
  await sleep(300);
  d.focusReturned = await opener.evaluate(el => el === document.activeElement);
  d.activeAfterEscape = await page.evaluate(() => (document.activeElement?.innerText || document.activeElement?.tagName || '').slice(0, 40));
  await opener.click();
  await dialog.waitFor({ timeout: 8000 });
  d.keptAfterEscape = (await box.inputValue()) === TEXT;
  if (!d.keptAfterEscape) await box.fill(TEXT);
  net.fail = true;
  const relayBefore = net.relay.length, insertsBefore = net.inserts.length;
  await send.click();
  d.errorShown = await dialog.getByText(/went wrong/i).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  d.errorText = d.errorShown ? (await dialog.getByText(/went wrong/i).first().innerText()).slice(0, 80) : null;
  d.keptAfterFail = (await box.inputValue()) === TEXT;
  d.sendEnabledAfterFail = await send.isEnabled();
  d.failRelay = net.relay.length - relayBefore; d.failInserts = net.inserts.length - insertsBefore;
  await page.screenshot({ path: path.join(OUT, `${id}-${tag}failed.png`) }); row.shots.push(`${id}-${tag}failed.png`);
  net.fail = false;
  await send.click();
  d.success = await dialog.getByText(/thanks/i).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  const last = net.relay[net.relay.length - 1];
  d.payload = last ? { game_type: last.game_type, description: String(last.description).slice(0, 60), source: last.game_context?.source, path: last.game_context?.path, len: JSON.stringify(last.game_context).length } : null;
  await sleep(1900);
  d.closedAfterSuccess = !(await dialog.isVisible().catch(() => false));
  if (d.closedAfterSuccess) { await opener.click(); await dialog.waitFor({ timeout: 8000 }); d.clearedAfterSuccess = (await box.inputValue()) === ''; await page.keyboard.press('Escape'); }
  return d;
}

// ---- walk 3: Escape timing (0 ms vs 600 ms after the dialog shows), focus after Escape, head vs origin/main,
// and the footer form on its own (failed send keeps text), with a settled pause before every Escape.
const BASE2 = process.env.BASE2 || '';
async function prep(page) {
  await page.getByRole('button', { name: /essential only/i }).first().click({ timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const open = await page.getByRole('dialog').first().isVisible().catch(() => false);
    if (!open) break;
    await page.keyboard.press('Escape'); await sleep(600);
  }
}
async function findBtn(page, re, inFooter) {
  const all = page.locator('button', { hasText: re });
  for (let i = 0; i < await all.count(); i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    if (!re.test((await el.innerText()).trim())) continue;
    if ((await el.evaluate(e => !!e.closest('footer'))) === inFooter) return el;
  }
  return null;
}
async function load(base, route, w, h) {
  const { context, net } = await newCtx(w, h);
  const page = await context.newPage();
  await page.goto(base + route, { waitUntil: 'load', timeout: 45000 });
  await page.locator('[data-seo-content="ready"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await prep(page);
  return { context, net, page };
}
const dlg = page => page.locator('[role="dialog"][data-state="open"]');
// 1. Escape timing and focus, head and main, game and footer controls, mouse and keyboard
for (const [label, base] of [['head', BASE], ['main', BASE2]]) {
  if (!base) continue;
  for (const route of ['/club-manager', '/stat-detective']) {
    const { context, page } = await load(base, route, 1280, 900).catch(e => ({ fail: e }));
    if (!page) { console.log('LOADFAIL', label, route); continue; }
    for (const [kind, re, inFooter] of [['game', /^Report( a problem)?$/, false], ['footer', /^Report a (bug|problem)$/, true]]) {
      const b = await findBtn(page, re, inFooter);
      if (!b) { console.log('ESC', label, route, kind, 'none'); continue; }
      const tally = { label, route, kind, text: (await b.innerText()).trim() };
      for (const mode of ['mouse', 'keyboard']) for (const delay of [0, 600]) {
        let closed = 0, back = 0, n = 4, acts = new Set();
        for (let i = 0; i < n; i++) {
          await b.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(150);
          if (mode === 'keyboard') { await b.focus(); await page.keyboard.press('Enter'); } else await b.click({ timeout: 8000 });
          await dlg(page).first().waitFor({ timeout: 8000 });
          if (delay) await sleep(delay);
          await page.keyboard.press('Escape');
          const ok = await dlg(page).first().waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false);
          if (ok) closed++;
          else { await page.locator('[role="dialog"] button:has(svg.lucide-x), [role="dialog"] button:has-text("Close")').first().click({ timeout: 3000 }).catch(() => {}); await dlg(page).first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {}); }
          await sleep(300);
          if (ok && await b.evaluate(el => el === document.activeElement)) back++;
          if (ok) acts.add(await page.evaluate(() => document.activeElement === document.body ? 'BODY' : `${document.activeElement?.tagName} ${(document.activeElement?.innerText || '').slice(0, 24)}`));
        }
        tally[`${mode}${delay}`] = `closed ${closed}/${n} focusBack ${back}/${closed} active ${[...acts].join(',')}`;
      }
      console.log('ESC', JSON.stringify(tally));
    }
    await context.close();
  }
}
// 2. the footer form on its own, with nothing open before it
const rows3 = [];
for (const [w, h] of WIDTHS) {
  const id = `w3-front-office-${w}`;
  const row = { id, shots: [] }; rows3.push(row);
  const { context, net, page } = await load(BASE, '/front-office', w, h);
  try {
    const foot = await findBtn(page, /^Report a problem$/, true);
    await foot.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(300);
    row.footerDialog = await formChecks(page, foot, net, row, id, h, 'Send report', 'footer-');
  } catch (e) { row.fatal = String(e.message).slice(0, 1200); await page.screenshot({ path: path.join(OUT, `${id}-fatal.png`) }).catch(() => {}); }
  const d = row.footerDialog;
  console.log('FOOT', id, d ? `e${+d.disabledEmpty}c${+d.disabledChipOnly}s${+d.disabledSpaces}t${+d.enabledWithText} fit${+d.fits} small${d.small.length} focus${+d.focusReturned} keptEsc${+d.keptAfterEscape} err${+d.errorShown} keptFail${+d.keptAfterFail} relay${d.failRelay} insert${d.failInserts} ok${+d.success} clr${+d.clearedAfterSuccess} ${JSON.stringify(d.payload)}` : row.fatal);
  await context.close();
}
fs.writeFileSync(path.join(OUT, 'rows3.json'), JSON.stringify(rows3, null, 1));
await browser.close();
console.log(`WALK3 DONE footer rows=${rows3.length} fatal=${rows3.filter(r => r.fatal).length}`);
