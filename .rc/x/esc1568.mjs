// Round 1568 fixer probe (never committed, sent as .rc/x/esc1568.mjs). Blocks supabase.co on every page.
// PARTS (PROBE_PARTS): esc (live match: a Radix dialog opened by keyboard under the stage, then Escape),
// plain (live match: Escape with nothing else open is still Back), ghost (Soccer Career: a synthetic leaving
// toast with PAGE_TOAST's classes read from PROBE_SRC's src/pages/SoccerCareer.tsx, against the menu button).
// BASE: a served dist; PROBE_DIST: serve this dist on PROBE_PORT instead. PROBE_TAG names the arm in the log.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { answerConsent } = await import(path.join(ROOT, 'scripts', 'lib', 'answerConsent.mjs'));
const TAG = process.env.PROBE_TAG || 'head';
const PARTS = (process.env.PROBE_PARTS || 'esc,plain,ghost').split(',');
const SRC = path.resolve(process.env.PROBE_SRC || ROOT);
let server = null;
let BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
if (process.env.PROBE_DIST) {
  const port = Number(process.env.PROBE_PORT || 4391);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.resolve(process.env.PROBE_DIST), String(port)], { stdio: 'ignore' });
  BASE = `http://127.0.0.1:${port}`;
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { up = await fetch(BASE + '/').then(r => r.ok).catch(() => false); if (!up) await new Promise(r => setTimeout(r, 250)); }
  if (!up) { console.log('esc1568: ABORT, the dist server never came up'); process.exit(2); }
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
/* Into a live match, the way scripts/playLiveMatchFit.mjs gets there (as the review's walk1568 copied it). */
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
  dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(d => !d.closest('[data-cm-live-stagebox]') && !d.hasAttribute('data-cm-live-stagebox') && d.getBoundingClientRect().width > 0).map(d => d.getAttribute('aria-label') || (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)),
}));

/* A Radix dialog opened by keyboard under the stage, then one Escape: the dialog closes and the match stays. */
async function partEsc(browser, w, h, opener) {
  const tag = `esc ${opener} ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h);
  try {
    if (!(await liveMatch(page))) { bad(`${tag}: never reached a live match`); return; }
    let where = '';
    if (opener === 'menu') {
      where = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-site-chrome] button')].find(x => /site menu/i.test(x.getAttribute('aria-label') || '')) || document.querySelector('[data-site-chrome] button');
        if (!b) return 'none';
        b.focus();
        return 'BAR ' + (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30);
      });
    } else {
      await page.getByRole('button', { name: 'Back to the club page' }).first().focus();
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Shift+Tab');
        where = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return 'none'; if (a.closest('[data-cm-live-stagebox]')) return 'stage'; const lab = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30); return `${a.closest('[data-site-chrome]') ? 'BAR' : 'page'} ${a.tagName.toLowerCase()} ${a.getAttribute('aria-haspopup') === 'dialog' ? 'opens a dialog ' : ''}${lab}`; });
        if (/opens a dialog/.test(where)) break;
      }
    }
    say(`${tag}: focus is on ${where}`);
    if (!/^(BAR|page) /.test(where)) { bad(`${tag}: focus never left the stage for a control under it (${where})`); return; }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const open = await state(page);
    say(`${tag}: after Enter ${JSON.stringify(open)}`);
    if (!open.dialogs.length) { bad(`${tag}: Enter opened no dialog, so the Escape below proves nothing`); return; }
    if (!open.stage) { bad(`${tag}: the stage was gone before Escape`); return; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    const after = await state(page);
    say(`${tag}: after one Escape ${JSON.stringify(after)}`);
    if (after.dialogs.length) bad(`${tag}: Escape left the dialog open`);
    if (!after.stage || after.card) bad(`${tag}: one Escape closed the dialog AND left the match (stage ${after.stage}, card ${after.card})`);
    if (page.errs.length) bad(`${tag}: page errors ${page.errs.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(`${tag}: probe threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

/* The library's exit ghost on a phone, against the site bar's menu button: a synthetic toast carrying PAGE_TOAST's
   classes as PROBE_SRC ships them, at rest and then marked removed (the review's r1568-run-w5 ghost part). */
const srcText = fs.readFileSync(path.join(SRC, 'src', 'pages', 'SoccerCareer.tsx'), 'utf8');
const clsMatch = /const PAGE_TOAST = \{[\s\S]*?className: "([^"]+)"/.exec(srcText);
async function partGhost(browser, w, h) {
  const tag = `ghost ${w}x${h}`;
  if (!clsMatch) { bad(`${tag}: no PAGE_TOAST className in ${SRC}`); return; }
  const { ctx, page } = await newPage(browser, w, h);
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await clearRoom(page);
    const got = await page.evaluate(cls => {
      const menu = [...document.querySelectorAll('[data-site-chrome] button')].find(x => /site menu/i.test(x.getAttribute('aria-label') || '')) || document.querySelector('[data-site-chrome] button');
      const mr = menu.getBoundingClientRect();
      const ol = document.createElement('ol');
      ol.setAttribute('data-sonner-toaster', ''); ol.setAttribute('data-y-position', 'top'); ol.setAttribute('data-x-position', 'center');
      ol.style.cssText = '--mobile-offset-top:16px;--mobile-offset-left:16px;--mobile-offset-right:16px;--offset-top:24px;--offset-left:24px;--offset-right:24px;--gap:14px;--width:356px;--front-toast-height:54px';
      document.body.appendChild(ol);
      const li = document.createElement('li');
      for (const [k, v] of Object.entries({ 'data-sonner-toast': '', 'data-y-position': 'top', 'data-x-position': 'center', 'data-mounted': 'true', 'data-front': 'true', 'data-removed': 'false', 'data-swiping': 'false', 'data-swipe-out': 'false', 'data-expanded': 'false', 'data-styled': 'true', 'data-visible': 'true' })) li.setAttribute(k, v);
      li.className = cls; li.style.height = '54px'; li.textContent = 'synthetic toast';
      ol.appendChild(li);
      const probeAt = (x, y) => { const at = document.elementFromPoint(x, y); return at === li || li.contains(at) ? 'TOAST' : at && at.closest('[data-site-chrome]') ? 'bar' : at ? at.tagName.toLowerCase() : 'nothing'; };
      const pts = [[mr.left + mr.width / 2, mr.top + mr.height / 2], [mr.left + mr.width / 2, mr.bottom - 10], [mr.left + mr.width / 2, mr.bottom - 4]];
      const read = () => pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}:${probeAt(x, y)}`);
      const resting = { rect: (r => [r.left, r.top, r.right, r.bottom].map(Math.round))(li.getBoundingClientRect()), at: read() };
      li.setAttribute('data-removed', 'true');
      const g = getComputedStyle(li, '::before');
      const leaving = { ghost: { display: g.display, content: g.content, transform: g.transform }, at: read() };
      ol.remove();
      return { menu: [mr.left, mr.top, mr.right, mr.bottom].map(Math.round), resting, leaving };
    }, clsMatch[1]);
    say(`${tag}: ${JSON.stringify(got)}`);
    for (const a of [...got.resting.at, ...got.leaving.at]) if (a.endsWith(':TOAST')) bad(`${tag}: a point of the menu button answers the toast (${a})`);
  } catch (e) { bad(`${tag}: probe threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

/* With nothing else open, Escape from the stage is still Back: the match folds to its card. */
async function partPlain(browser, w, h) {
  const tag = `plain ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h);
  try {
    if (!(await liveMatch(page))) { bad(`${tag}: never reached a live match`); return; }
    await page.getByRole('button', { name: 'Back to the club page' }).first().focus();
    const before = await state(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    const after = await state(page);
    say(`${tag}: before ${JSON.stringify(before)}, after one Escape ${JSON.stringify(after)}`);
    if (!before.stage) bad(`${tag}: no stage before Escape`);
    else if (after.stage || !after.card) bad(`${tag}: Escape with nothing open did not fold the match to its card (stage ${after.stage}, card ${after.card})`);
  } catch (e) { bad(`${tag}: probe threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

const browser = await chromium.launch();
try {
  if (PARTS.includes('esc')) for (const [w, h] of [[390, 844], [1280, 900]]) for (const opener of ['menu', 'tab']) await partEsc(browser, w, h, opener);
  if (PARTS.includes('plain')) for (const [w, h] of [[390, 844], [1280, 900]]) await partPlain(browser, w, h);
  if (PARTS.includes('ghost')) for (const [w, h] of [[390, 844], [320, 640]]) await partGhost(browser, w, h);
} finally { await browser.close(); if (server) server.kill(); }
console.log(findings.length ? `esc1568 [${TAG}]: RED, ${findings.length} findings` : `esc1568 [${TAG}]: green, parts ${PARTS.join(', ')}`);
process.exit(findings.length ? 1 : 0);
