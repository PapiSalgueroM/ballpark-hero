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
    if (url.origin === new URL(BASE).origin) return route.fallback();
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

// ---- walk 2: first visit cleared (cookie choice, then the self opening How to play), full errors, blockers,
// focus after Escape on this head AND on origin/main (BASE2), mouse and keyboard.
const BASE2 = process.env.BASE2 || '';
async function prep(page) {
  await page.getByRole('button', { name: /essential only/i }).first().click({ timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const open = await page.getByRole('dialog').first().isVisible().catch(() => false);
    if (!open) break;
    await page.keyboard.press('Escape'); await sleep(500);
  }
}
async function blocker(loc) {
  return loc.evaluate(el => {
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y);
    return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vh: innerHeight,
      top: top ? `${top.tagName}.${String(top.className).slice(0, 80)} | ${(top.innerText || '').slice(0, 50)}` : null,
      same: !!top && (top === el || el.contains(top)), bodyPE: getComputedStyle(document.body).pointerEvents };
  });
}
async function findBtn(page, re, inFooter) {
  const all = page.locator('button', { hasText: re });
  for (let i = 0; i < await all.count(); i++) {
    const el = all.nth(i);
    if (!(await el.isVisible())) continue;
    const txt = (await el.innerText()).trim();
    if (!re.test(txt)) continue;
    if ((await el.evaluate(e => !!e.closest('footer'))) === inFooter) return el;
  }
  return null;
}
const rows2 = [];
for (const route of (process.env.ROUTES2 || '/soccer-grid,/player-bingo,/front-office').split(',')) for (const [w, h] of WIDTHS) {
  const id = `w2-${slug(route)}-${w}`;
  const row = { id, errors: [] }; rows2.push(row);
  const { context, net } = await newCtx(w, h);
  const page = await context.newPage();
  page.on('pageerror', e => row.errors.push(String(e.message).slice(0, 200)));
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await page.locator('[data-seo-content="ready"]').first().waitFor({ timeout: 20000 }).catch(() => {});
    await prep(page);
    const game = await findBtn(page, /^Report a problem$/, false);
    if (game) {
      await game.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(300);
      row.gameBlock = await blocker(game);
      row.shots = [];
      row.dialog = await formChecks(page, game, net, row, id, h, 'Submit Report', '').catch(async e => { await page.screenshot({ path: path.join(OUT, `${id}-gamefail.png`) }); return { fatal: String(e.message).slice(0, 1500) }; });
      await page.getByRole('dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      await sleep(500);
    }
    const foot = await findBtn(page, /^Report a problem$/, true);
    if (foot) {
      await foot.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(300);
      row.footBlock = await blocker(foot);
      await page.screenshot({ path: path.join(OUT, `${id}-footer-place.png`) });
      row.shots = row.shots || [];
      row.footerDialog = await formChecks(page, foot, net, row, id, h, 'Send report', 'footer-').catch(async e => { await page.screenshot({ path: path.join(OUT, `${id}-footfail.png`) }); return { fatal: String(e.message).slice(0, 1500) }; });
    }
  } catch (e) { row.fatal = String(e.stack || e).slice(0, 800); await page.screenshot({ path: path.join(OUT, `${id}-fatal.png`) }).catch(() => {}); }
  await context.close();
  const s = d => d ? (d.fatal ? 'FATAL' : `e${+d.disabledEmpty}c${+d.disabledChipOnly}t${+d.enabledWithText} fit${+d.fits} focus${+d.focusReturned} keptEsc${+d.keptAfterEscape} err${+d.errorShown} keptFail${+d.keptAfterFail} ok${+d.success} clr${+d.clearedAfterSuccess} src=${d.payload?.source}`) : '-';
  console.log(id, 'GAME', s(row.dialog), JSON.stringify(row.gameBlock || null), '| FOOT', s(row.footerDialog), JSON.stringify(row.footBlock || null), row.fatal ? 'ROWFATAL' : '', 'errs', row.errors.length);
}

// focus after Escape, head against origin/main, on pages that had a report on main too
for (const [label, base] of [['head', BASE], ['main', BASE2]]) {
  if (!base) continue;
  for (const route of ['/club-manager', '/stat-detective', '/front-office']) for (const mode of ['mouse', 'keyboard']) {
    const { context } = await newCtx(1280, 900);
    const page = await context.newPage();
    const r = { label, route, mode };
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 45000 });
      await page.locator('[data-seo-content="ready"]').first().waitFor({ timeout: 20000 }).catch(() => {});
      await prep(page);
      for (const [kind, re, inFooter] of [['game', /^Report( a problem)?$/, false], ['footer', /^Report a (bug|problem)$/, true]]) {
        const b = await findBtn(page, re, inFooter);
        if (!b) { r[kind] = 'none'; continue; }
        await b.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(200);
        if (mode === 'keyboard') { await b.focus(); await page.keyboard.press('Enter'); } else await b.click({ timeout: 8000 });
        await page.getByRole('dialog').first().waitFor({ timeout: 8000 });
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        await sleep(400);
        const back = await b.evaluate(el => el === document.activeElement);
        const act = await page.evaluate(() => document.activeElement === document.body ? 'BODY' : (document.activeElement?.tagName + ' ' + (document.activeElement?.innerText || '').slice(0, 30)));
        r[kind] = `${(await b.innerText()).trim()} focusBack=${back} active=${act}`;
      }
    } catch (e) { r.fatal = String(e.message).slice(0, 300); }
    console.log('FOCUS', JSON.stringify(r));
    await context.close();
  }
}

// reduced motion: the game report dialog at 390 on /soccer-grid, 60 ms after the press
for (const rm of ['reduce', 'no-preference']) {
  const { context } = await newCtx(390, 844, { reducedMotion: rm });
  const page = await context.newPage();
  try {
    await page.goto(BASE + '/soccer-grid', { waitUntil: 'load', timeout: 45000 });
    await page.locator('[data-seo-content="ready"]').first().waitFor({ timeout: 20000 }).catch(() => {});
    await prep(page);
    const t = await findBtn(page, /^Report a problem$/, false);
    await t.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(300);
    await t.click(); await sleep(60);
    await page.screenshot({ path: path.join(OUT, `w2-rm-${rm}-60ms.png`) });
    const anim = await page.getByRole('dialog').first().evaluate(el => `${getComputedStyle(el).animationName} ${getComputedStyle(el).animationDuration}`);
    console.log('RM', rm, anim);
  } catch (e) { console.log('RM FAIL', rm, String(e.message).slice(0, 300)); }
  await context.close();
}
fs.writeFileSync(path.join(OUT, 'rows2.json'), JSON.stringify(rows2, null, 1));
await browser.close();
console.log(`WALK2 DONE rows=${rows2.length} fatal=${rows2.filter(r => r.fatal || r.dialog?.fatal || r.footerDialog?.fatal).length}`);
