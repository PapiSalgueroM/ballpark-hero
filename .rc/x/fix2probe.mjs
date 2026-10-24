// Round 1568 closing check probe (never committed, sent as .rc/x/fix2probe.mjs). Blocks supabase.co on every page.
// PARTS (PROBE_PARTS): kbd (consent answered: from Back, two Shift+Tab presses and Enter, the review's F5 path, then
// a long Shift+Tab and Tab run counting landings under the stage), banner (the cookie notice opened over the match:
// the strip between the stage and the notice, a hit test in it, and Tab both ways reaching the notice and never the
// page). BASE: a served dist; PROBE_DIST: serve this dist on PROBE_PORT instead. PROBE_TAG names the arm in the log.
import { chromium } from 'playwright';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { answerConsent } = await import(path.join(ROOT, 'scripts', 'lib', 'answerConsent.mjs'));
const TAG = process.env.PROBE_TAG || 'head';
const PARTS = (process.env.PROBE_PARTS || 'kbd,banner').split(',');
const OUT = process.env.RC_OUT || '';
let server = null;
let BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
if (process.env.PROBE_DIST) {
  const port = Number(process.env.PROBE_PORT || 4391);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.resolve(process.env.PROBE_DIST), String(port)], { stdio: 'ignore' });
  BASE = `http://127.0.0.1:${port}`;
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { up = await fetch(BASE + '/').then(r => r.ok).catch(() => false); if (!up) await new Promise(r => setTimeout(r, 250)); }
  if (!up) { console.log('fix2probe: ABORT, the dist server never came up'); process.exit(2); }
}
const findings = [];
const say = s => console.log(`[${TAG}] ${s}`);
const bad = s => { findings.push(s); console.log(`[${TAG}] FINDING ${s}`); };
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;

async function newPage(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.route(BLOCK, r => r.abort());
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e && e.message ? e.message : e)));
  return { ctx, page };
}
/* Into a live match, the way scripts/playLiveMatchFit.mjs gets there (as esc1568.mjs copied it). */
const tap = async (page, rx) => { const b = page.getByRole('button', { name: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
const tapText = async (page, rx) => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
async function clearRoom(page) {
  await answerConsent(page, { wait: 1200 });
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
async function liveMatch(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom(page);
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(800);
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) break;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1200);
  return (await page.locator('[data-cm-live-stagebox]').count().catch(() => 0)) > 0;
}
const state = page => page.evaluate(() => ({
  stage: document.querySelectorAll('[data-cm-live-stagebox]').length,
  card: document.querySelectorAll('[data-cm-live-compact]').length,
  dialogs: [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(d => !d.closest('[data-cm-live-stagebox]') && !d.hasAttribute('data-cm-live-stagebox') && d.getBoundingClientRect().width > 0).map(d => d.getAttribute('aria-label') || (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)),
}));
/* where the focus is: on the stage, in the cookie notice, on the body, or on something under the stage */
const where = page => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return { at: 'body' };
  const label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  if (a.closest('[data-cm-live-stagebox]')) return { at: 'stage', back: a.getAttribute('aria-label') === 'Back to the club page', label };
  if (a.closest('[aria-label="Cookie choices"]')) return { at: 'notice', label };
  if (a.closest('[data-sonner-toaster]')) return { at: 'toast', label };
  return { at: 'under', label: `${a.tagName.toLowerCase()} "${label}"${a.closest('[data-site-chrome]') ? ' in the site bar' : ''}` };
});
const stageStops = page => page.evaluate(() => {
  const box = document.querySelector('[data-cm-live-stagebox]');
  return box ? [...box.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(el => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0).length : 0;
});
async function pressRun(page, key, n) {
  await page.getByRole('button', { name: 'Back to the club page' }).first().focus();
  const seen = [];
  for (let i = 0; i < n; i++) { await page.keyboard.press(key); seen.push(await where(page)); }
  return seen;
}
const brief = seen => seen.map(s => s.at === 'stage' ? (s.back ? 'BACK' : 's') : s.at === 'notice' ? 'N' : s.at).join(' ');

/* The review's F5 path: from Back, two Shift+Tab presses and Enter. No dialog may open outside the stage and the
   stage stays up. Then a long run each way: no landing under the stage, and the run comes round to Back again. */
async function partKbd(browser, w, h) {
  const tag = `kbd ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h);
  try {
    if (!(await liveMatch(page))) { bad(`${tag}: never reached a live match`); return; }
    await page.getByRole('button', { name: 'Back to the club page' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    const two = await where(page);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const after = await state(page);
    say(`${tag}: two Shift+Tab from Back put the focus ${two.at === 'under' ? 'UNDER the stage on ' + two.label : 'on ' + two.at + ' ' + (two.label || '')}; after Enter ${JSON.stringify(after)}`);
    if (two.at === 'under') bad(`${tag}: two Shift+Tab presses from Back reached ${two.label} under the stage`);
    if (after.dialogs.length) bad(`${tag}: Enter opened ${JSON.stringify(after.dialogs)} outside the stage`);
    if (!after.stage) bad(`${tag}: the stage was gone after Enter (card ${after.card})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (!(await state(page)).stage) { await tapText(page, /Back to the match/i); await page.waitForTimeout(600); }
    const n = (await stageStops(page)) + 2;
    for (const key of ['Shift+Tab', 'Tab']) {
      const seen = await pressRun(page, key, n);
      const under = seen.filter(s => s.at === 'under');
      say(`${tag}: ${key} x${n}: ${brief(seen)}`);
      if (under.length) bad(`${tag}: ${key} landed under the stage ${under.length} times (${under.slice(0, 2).map(s => s.label).join('; ')})`);
      else if (!seen.some(s => s.back)) bad(`${tag}: ${key} x${n} never came round to Back`);
    }
    if (page.errs.length) bad(`${tag}: page errors ${page.errs.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(`${tag}: probe threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

/* The cookie notice opened over the match (the site's own open event, as the footer link sends it): the strip the
   consent clamp leaves between the stage and the notice belongs to the stage (a hit test at its middle answers the
   stage, never the page), and Tab both ways reaches the notice's buttons and never the page. */
async function partBanner(browser, w, h) {
  const tag = `banner ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h);
  try {
    if (!(await liveMatch(page))) { bad(`${tag}: never reached a live match`); return; }
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('dukb-consent-open')));
    await page.waitForTimeout(900);
    const geo = await page.evaluate(() => {
      const box = document.querySelector('[data-cm-live-stagebox]');
      const note = document.querySelector('[aria-label="Cookie choices"]');
      if (!box || !note) return { box: !!box, note: !!note };
      const b = box.getBoundingClientRect();
      const n = note.getBoundingClientRect();
      const x = window.innerWidth / 2;
      const y = (b.bottom + n.top) / 2;
      const hit = n.top - b.bottom >= 2 ? document.elementFromPoint(x, y) : null;
      const at = !hit ? 'no strip' : hit === box || box.contains(hit) ? 'stage' : note.contains(hit) ? 'notice' : `PAGE ${hit.tagName.toLowerCase()}`;
      return { box: true, note: true, pending: document.body.hasAttribute('data-consent-pending'), stageBottom: Math.round(b.bottom), noticeTop: Math.round(n.top), strip: Math.round(n.top - b.bottom), y: Math.round(y), at };
    });
    say(`${tag}: ${JSON.stringify(geo)}`);
    if (OUT) await page.screenshot({ path: path.join(OUT, `fix2-${TAG}-banner-${w}.png`) }).catch(() => {});
    if (!geo.box || !geo.note) { bad(`${tag}: stage ${geo.box}, notice ${geo.note}`); return; }
    if (!geo.pending) bad(`${tag}: the notice is up but consent is not marked pending, so the clamp is not under test`);
    if (geo.at !== 'stage' && geo.at !== 'no strip') bad(`${tag}: the strip between the stage and the notice (${geo.strip} px) answers ${geo.at}`);
    const n = (await stageStops(page)) + 8;
    for (const key of ['Tab', 'Shift+Tab']) {
      const seen = await pressRun(page, key, n);
      const under = seen.filter(s => s.at === 'under');
      say(`${tag}: ${key} x${n}: ${brief(seen)}`);
      if (under.length) bad(`${tag}: ${key} landed under the stage ${under.length} times (${under.slice(0, 2).map(s => s.label).join('; ')})`);
      if (!seen.some(s => s.at === 'notice')) bad(`${tag}: ${key} x${n} never reached the cookie notice`);
    }
    if (page.errs.length) bad(`${tag}: page errors ${page.errs.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(`${tag}: probe threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

const browser = await chromium.launch();
try {
  if (PARTS.includes('kbd')) for (const [w, h] of [[390, 844], [1280, 900]]) await partKbd(browser, w, h);
  if (PARTS.includes('banner')) for (const [w, h] of [[390, 844], [1280, 900], [320, 568]]) await partBanner(browser, w, h);
} finally { await browser.close(); if (server) server.kill(); }
console.log(findings.length ? `fix2probe [${TAG}]: RED, ${findings.length} findings` : `fix2probe [${TAG}]: green, parts ${PARTS.join(', ')}`);
process.exit(findings.length ? 1 : 0);
