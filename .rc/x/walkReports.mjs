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
const ROUTES = (process.env.ROUTES || '/soccer-grid,/soccer-career,/nba-my-career,/front-office,/club-manager,/transfer-path,/stat-detective,/player-bingo,/nba-grid/archive,/deadline-day,/shirt-number,/about,/whats-new,/perfect-season-nba').split(',');
const DIALOG = new Set((process.env.DIALOG || '/soccer-grid,/soccer-career,/front-office,/player-bingo').split(','));
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

async function measure(page) {
  return page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const rect = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
    const btns = [...document.querySelectorAll('button, a, [role=button]')].filter(b => /^report a problem$/i.test((b.innerText || '').trim()) && vis(b));
    const seo = document.querySelector('[data-seo-content]');
    const heading = seo ? seo.querySelector('h1, h2') : null;
    const prev = seo ? seo.previousElementSibling : null;
    const where = b => b.closest('footer') ? 'footer' : b.closest('[data-seo-content]') ? 'seo' : 'other';
    const oldWords = (document.body.innerText.match(/report a bug/gi) || []).length;
    return {
      controls: btns.map(b => ({ where: where(b), rect: rect(b), title: b.getAttribute('title') })),
      seoState: seo ? seo.getAttribute('data-seo-content') : null,
      heading: heading ? { text: heading.innerText.slice(0, 60), rect: rect(heading) } : null,
      seoTop: seo ? rect(seo).y : null,
      prevBottom: prev ? rect(prev).y + rect(prev).h : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollY, oldWords,
      problemSentences: (document.body.innerText.match(/[^.\n]*Report a problem[^.\n]*/g) || []).filter(s => s.trim() !== 'Report a problem').slice(0, 4),
    };
  });
}

for (const route of ROUTES) for (const [w, h] of WIDTHS) {
  const id = `${slug(route)}-${w}`;
  const row = { id, route, width: w, errors: [], console: [] };
  rows.push(row);
  const { context, net } = await newCtx(w, h);
  const page = await context.newPage();
  page.on('pageerror', e => row.errors.push(String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') row.console.push(m.text().slice(0, 160)); });
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await sleep(600);
    row.scrollAtLoad = await page.evaluate(() => scrollY);
    await page.locator('[data-seo-content="ready"]').first().waitFor({ timeout: 20000 }).catch(() => { row.seoNotReady = true; });
    await sleep(1200);
    Object.assign(row, await measure(page));
    row.jump = row.scrollY !== row.scrollAtLoad;
    const nonFooter = row.controls.filter(c => c.where !== 'footer');
    row.nonFooterCount = nonFooter.length;
    row.footerCount = row.controls.filter(c => c.where === 'footer').length;
    const game = nonFooter[0];
    if (game && row.heading) row.aboveGuide = game.rect.y + game.rect.h <= row.heading.rect.y;
    if (game && row.prevBottom != null) row.belowGame = game.rect.y >= row.prevBottom;
    // the picture a player sees around the control: centre it, viewport only
    let target = null;
    if (game) {
      const all = page.locator('button', { hasText: 'Report a problem' });
      for (let i = 0; i < await all.count(); i++) {
        const el = all.nth(i);
        if (await el.isVisible() && !(await el.evaluate(e => !!e.closest('footer')))) { target = el; break; }
      }
    }
    if (target) await target.evaluate(el => el.scrollIntoView({ block: 'center' }));
    else await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await sleep(400);
    await page.screenshot({ path: path.join(OUT, `${id}-place.png`) });
    row.shots = [`${id}-place.png`];
    row.banner = await page.getByRole('button', { name: /essential only/i }).first().isVisible().catch(() => false);
    if (DIALOG.has(route) && target) {
      await page.getByRole('button', { name: /essential only/i }).first().click({ timeout: 3000 }).catch(() => {});
      await dialogChecks(page, target, net, row, id, h);
    }
  } catch (e) { row.fatal = String(e.stack || e).slice(0, 400); await page.screenshot({ path: path.join(OUT, `${id}-fatal.png`) }).catch(() => {}); }
  await context.close();
  const brief = { id, n: row.nonFooterCount, f: row.footerCount, above: row.aboveGuide, below: row.belowGame, jump: row.jump, ox: row.overflowX, seo: row.seoState, old: row.oldWords, d: row.dialog, fatal: row.fatal ? 'FATAL' : undefined, err: row.errors.length };
  console.log(JSON.stringify(brief));
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
async function dialogChecks(page, target, net, row, id, h) {
  row.dialog = await formChecks(page, target, net, row, id, h, 'Submit Report', '').catch(e => ({ fatal: String(e.message).slice(0, 300) }));
  const footerBtn = page.locator('footer button', { hasText: 'Report a problem' }).first();
  if (await footerBtn.count()) {
    await footerBtn.evaluate(el => el.scrollIntoView({ block: 'center' }));
    row.footerDialog = await formChecks(page, footerBtn, net, row, id, h, 'Send report', 'footer-').catch(e => ({ fatal: String(e.message).slice(0, 300) }));
  }
}

// reduced motion: the game report dialog at 390, captured 60 ms after the press, with and without
for (const rm of ['reduce', 'no-preference']) {
  const { context } = await newCtx(390, 844, { reducedMotion: rm });
  const page = await context.newPage();
  try {
    await page.goto(BASE + '/soccer-grid', { waitUntil: 'load', timeout: 45000 });
    await page.locator('[data-seo-content="ready"]').first().waitFor({ timeout: 20000 }).catch(() => {});
    const t = page.locator('[data-seo-content] button', { hasText: 'Report a problem' }).first();
    await t.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await t.click(); await sleep(60);
    await page.screenshot({ path: path.join(OUT, `rm-${rm}-dialog-60ms.png`) });
    const anim = await page.getByRole('dialog').evaluate(el => getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration);
    console.log(JSON.stringify({ rm, anim }));
  } catch (e) { console.log('rm walk failed', rm, String(e.message).slice(0, 200)); }
  await context.close();
}
fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows, null, 1));
await browser.close();
const fatal = rows.filter(r => r.fatal || r.dialog?.fatal || r.footerDialog?.fatal).length;
console.log(`WALK DONE rows=${rows.length} fatal=${fatal}`);
