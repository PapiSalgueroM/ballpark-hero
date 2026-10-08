// Reviewer's walk of Release AN (never committed). Runs on the runner against the served build.
// Reads BASE and RC_OUT, blocks the database host, walks the features this release brings at 390x844 and
// 1280x900, with reduced motion off and on, from saves MADE BY MAIN'S CODE (rvsaves.json beside this file).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/rvwalk-out');
fs.mkdirSync(OUT, { recursive: true });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAVES = JSON.parse(fs.readFileSync(path.join(HERE, 'rvsaves.json'), 'utf8'));
const VIEWS = [{ name: 'phone', width: 390, height: 844 }, { name: 'desk', width: 1280, height: 900 }];
const MOTIONS = ['no-preference', 'reduce'];
const lines = [];
const note = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); };
let problems = 0;
const bad = (...a) => { problems += 1; note('PROBLEM', ...a); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function initScript({ seed, blocked }) {
  if (blocked) {
    for (const name of ['localStorage', 'sessionStorage']) {
      const boom = () => { throw new DOMException(`Failed to read the '${name}' property from 'Window': Access is denied for this document.`, 'SecurityError'); };
      Object.defineProperty(window, name, { configurable: true, enumerable: true, get: boom });
    }
    if (window.LockManager && window.LockManager.prototype) {
      window.LockManager.prototype.request = function request() { return Promise.reject(new DOMException('The request was denied.', 'SecurityError')); };
    }
    return;
  }
  try {
    if (!sessionStorage.getItem('rv-seeded')) {
      sessionStorage.setItem('rv-seeded', '1');
      for (const k of Object.keys(seed)) localStorage.setItem(k, seed[k]);
    }
  } catch (e) { /* nothing to seed */ }
}

async function open(browser, view, motion, seed = {}, blocked = false) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, reducedMotion: motion });
  await ctx.addInitScript(initScript, { seed: { 'cookie-consent': 'essential', ...seed }, blocked });
  const page = await ctx.newPage();
  const errs = [];
  let aborted = 0;
  await page.route(/supabase\.co/, r => { aborted += 1; return r.abort(); });
  page.on('pageerror', e => errs.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/net::ERR|Failed to load resource|Failed to fetch|supabase/i.test(t)) errs.push('console: ' + t.slice(0, 200)); } });
  return { ctx, page, errs, tag: `${view.name}-${motion === 'reduce' ? 'reduced' : 'motion'}`, view, aborted: () => aborted };
}
const shot = async (W, name) => { await W.page.screenshot({ path: path.join(OUT, `${name}-${W.tag}.png`) }).catch(e => note('shot failed', name, String(e).slice(0, 80))); };
const facts = page => page.evaluate(() => ({
  h1: [...document.querySelectorAll('h1')].map(h => (h.textContent || '').trim()).slice(0, 2),
  overflowX: document.documentElement.scrollWidth - window.innerWidth,
  broke: /This page broke/.test(document.body.innerText || ''),
  notice: (document.querySelector('[data-dukb-storage-notice]') || {}).textContent || '',
}));
async function settle(W, what) {
  const f = await facts(W.page);
  if (f.broke) bad(what, W.tag, 'shows "This page broke"');
  if (f.overflowX > 1) bad(what, W.tag, `page is ${f.overflowX}px wider than the screen`);
  if (W.errs.length) { bad(what, W.tag, `${W.errs.length} error(s): ${W.errs.slice(0, 3).join(' || ')}`); W.errs.length = 0; }
  return f;
}
const text = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null; }, sel);
const dismiss = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /let.s play|got it/i.test(x.textContent || ''));
  if (b) b.click();
  return b ? (b.textContent || '').trim() : null;
});

/* ── 1. Soccer Career: a save made by main opens, the Squad tile and its sheet ── */
async function soccer(browser, view, motion, kind, deep) {
  const W = await open(browser, view, motion, { soccerCareerSave: SAVES.soccer[kind] });
  const { page } = W;
  await page.goto(BASE + '/soccer-career', { waitUntil: 'load', timeout: 60000 });
  const tile = await page.waitForSelector('[data-squad-tile]', { timeout: 30000 }).catch(() => null);
  const gone = await dismiss(page);
  if (gone) { note(`soccer ${kind} ${W.tag}: a dialog was up first, pressed "${gone}"`); await sleep(400); }
  const f = await settle(W, `soccer ${kind} hub`);
  if (!tile) { bad(`soccer ${kind}`, W.tag, `no Squad tile on the hub; h1 ${JSON.stringify(f.h1)}`); await shot(W, `sc-${kind}-nohub`); await W.ctx.close(); return; }
  note(`soccer ${kind} ${W.tag}: hub h1 ${JSON.stringify(f.h1[0])}; tile says "${await text(page, '[data-squad-tile]')}"`);
  await page.evaluate(() => document.querySelector('[data-squad-tile]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await shot(W, `sc-${kind}-1hub`);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.click('[data-squad-tile]');
  const home = await page.waitForSelector('[data-squad-screen="home"]', { timeout: 20000 }).catch(() => null);
  if (!home) { bad(`soccer ${kind}`, W.tag, 'the sheet did not open'); await shot(W, `sc-${kind}-nosheet`); await W.ctx.close(); return; }
  await sleep(motion === 'reduce' ? 150 : 900);
  const bar = await page.evaluate(() => { const b = document.querySelector('[data-squad-trust-bar]'); const cs = b ? getComputedStyle(b) : null; return cs ? { width: b.style.width, transition: cs.transitionDuration } : null; });
  const box = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: window.innerHeight, vw: window.innerWidth }; });
  note(`soccer ${kind} ${W.tag}: sheet "${await text(page, '[data-squad-headline]')}" | plan "${await text(page, '[data-squad-plan]')}" | source "${await text(page, '[data-squad-source-line]')}" | trust bar ${JSON.stringify(bar)} | dialog ${JSON.stringify(box)} | page moved ${await page.evaluate(() => window.scrollY) - y0}px`);
  if (box && (box.bottom > box.vh + 1 || box.right > box.vw + 1 || box.top < -1 || box.left < -1)) bad(`soccer ${kind}`, W.tag, `the sheet does not fit the screen: ${JSON.stringify(box)}`);
  await shot(W, `sc-${kind}-2sheet`);
  if (deep) {
    const ids = await page.evaluate(() => [...document.querySelectorAll('[data-squad-open]')].map(b => b.getAttribute('data-squad-open')));
    for (const id of ids) {
      await page.click(`[data-squad-open="${id}"]`);
      await sleep(motion === 'reduce' ? 150 : 600);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] *')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && (e.textContent || '').trim()).map(e => (e.textContent || '').trim().slice(0, 40)).slice(0, 4));
      note(`soccer ${kind} ${W.tag}: screen ${id}: "${(await text(page, '[role="dialog"]') || '').slice(0, 260)}"${clipped.length ? ' | CLIPPED: ' + JSON.stringify(clipped) : ''}`);
      await shot(W, `sc-${kind}-3${id}`);
      const back = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /^\s*←/.test(x.textContent || '')); if (b) b.click(); return !!b; });
      if (!back) { bad(`soccer ${kind}`, W.tag, `no way back from screen ${id}`); break; }
      await page.waitForSelector('[data-squad-screen="home"]', { timeout: 5000 }).catch(() => bad(`soccer ${kind}`, W.tag, `back from ${id} did not reach the sheet's home`));
    }
  }
  await page.keyboard.press('Escape');
  await sleep(300);
  if (await page.$('[data-squad-screen]')) bad(`soccer ${kind}`, W.tag, 'Escape did not close the sheet');
  await settle(W, `soccer ${kind} sheet`);
  await W.ctx.close();
}

/* ── 2. NBA and NFL My Career: a save made by main, the Season Center ── */
async function us(browser, view, motion, slug, route) {
  const save = SAVES[slug];
  const W = await open(browser, view, motion, { [save.key]: save.value });
  const { page } = W;
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('[data-season-centre-entry]', { timeout: 30000 }).catch(() => null);
  const gone = await dismiss(page);
  if (gone) { note(`${slug} ${W.tag}: a dialog was up first, pressed "${gone}"`); await sleep(400); }
  const f = await settle(W, `${slug} hub`);
  const entry = await text(page, '[data-season-centre-entry]');
  note(`${slug} ${W.tag}: hub h1 ${JSON.stringify(f.h1[0])}; entry says "${entry}"`);
  if (entry === null) { await shot(W, `${slug}-noentry`); await W.ctx.close(); return; }
  await page.evaluate(() => document.querySelector('[data-season-centre-entry]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await shot(W, `${slug}-1hub`);
  for (const which of ['data-watch-last', 'data-week-by-week']) {
    const tagName = which === 'data-watch-last' ? 'again' : 'week';
    if (!(await page.$(`[${which}]`))) { note(`${slug} ${W.tag}: no [${which}] button`); continue; }
    await page.click(`[${which}]`);
    const up = await page.waitForSelector('[data-us-season-centre]', { timeout: 40000 }).catch(() => null);
    if (!up) { bad(`${slug} ${which}`, W.tag, 'the Season Center did not open in 40 s'); await shot(W, `${slug}-${tagName}-none`); continue; }
    await sleep(700);
    await shot(W, `${slug}-2${tagName}-a`);
    const first = (await text(page, '[data-us-season-centre]') || '').slice(0, 300);
    const buttons = await page.evaluate(() => [...document.querySelectorAll('[data-us-season-centre] button')].map(x => (x.textContent || '').trim()).filter(Boolean).slice(0, 10));
    note(`${slug} ${W.tag} ${which}: opened: "${first}" | buttons ${JSON.stringify(buttons)}`);
    await sleep(5000);
    await shot(W, `${slug}-2${tagName}-b`);
    const later = (await text(page, '[data-us-season-centre]') || '').slice(0, 300);
    note(`${slug} ${W.tag} ${which}: five seconds on: "${later}" | changed by itself: ${later !== first}`);
    const box = await page.evaluate(() => { const d = document.querySelector('[data-us-season-centre]'); const r = d.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right), vh: window.innerHeight, vw: window.innerWidth }; });
    if (box.right > box.vw + 1) bad(`${slug} ${which}`, W.tag, `the Season Center is wider than the screen: ${JSON.stringify(box)}`);
    await settle(W, `${slug} ${which}`);
    const out = await page.evaluate(() => { const b = document.querySelector('[data-centre-exit]'); if (b) b.click(); return !!b; });
    if (!out) await page.keyboard.press('Escape');
    await sleep(800);
    if (await page.$('[data-us-season-centre]')) { note(`${slug} ${W.tag} ${which}: still open after the exit press (exit button ${out ? 'found' : 'not found'})`); break; }
  }
  await W.ctx.close();
}

/* ── 3. College Grid: the board with the page, the search as he types ── */
async function grid(browser, view, motion) {
  const W = await open(browser, view, motion);
  const { page } = W;
  const t0 = Date.now();
  await page.goto(BASE + '/college-grid', { waitUntil: 'commit', timeout: 60000 });
  const nine = await page.waitForFunction(() => document.querySelectorAll('button[data-grid-cell-status]').length >= 9, null, { timeout: 30000 }).then(() => Date.now() - t0, () => null);
  await sleep(600);
  await settle(W, 'college grid');
  if (nine === null) { bad('college grid', W.tag, 'no nine cells in 30 s (the database is blocked, the board must come from the page)'); await shot(W, 'cg-noboard'); await W.ctx.close(); return; }
  await shot(W, 'cg-1board');
  const help = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /let.s play|got it|play/i.test(x.textContent || '')); if (b) b.click(); return b ? (b.textContent || '').trim() : null; });
  await sleep(400);
  await page.locator('button[data-grid-cell-status="empty"]').first().click();
  const input = page.locator('input[aria-label="Type a player name..."]');
  const seen = await input.waitFor({ timeout: 8000 }).then(() => true, () => false);
  if (!seen) { bad('college grid', W.tag, `no search box after a tap on a cell (help button pressed: ${JSON.stringify(help)})`); await shot(W, 'cg-nosearch'); await W.ctx.close(); return; }
  const t1 = Date.now();
  await input.fill('mann');
  const first = await page.waitForSelector('[role="option"]', { timeout: 8000 }).then(() => Date.now() - t1, () => null);
  const opts = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map(o => (o.textContent || '').trim()).slice(0, 8));
  note(`college grid ${W.tag}: nine cells ${nine} ms after the request; help ${JSON.stringify(help)}; typed "mann": first option after ${first} ms, options ${JSON.stringify(opts)}`);
  if (first === null) bad('college grid', W.tag, 'typing "mann" listed nobody in 8 s');
  await shot(W, 'cg-2typed');
  await settle(W, 'college grid search');
  note(`college grid ${W.tag}: requests to the database host aborted: ${W.aborted()}`);
  await W.ctx.close();
}

/* ── 4. the Soccer Career create screen (Round 1096's spans), fresh visitor ── */
async function create(browser, view, motion) {
  const W = await open(browser, view, motion);
  const { page } = W;
  await page.goto(BASE + '/soccer-career', { waitUntil: 'load', timeout: 60000 });
  const ok = await page.waitForSelector('#pname', { timeout: 30000 }).catch(() => null);
  if (!ok) { bad('create', W.tag, 'no create screen'); await shot(W, 'create-none'); await W.ctx.close(); return; }
  const help = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /let.s play|got it|play/i.test(x.textContent || '')); if (b) b.click(); return b ? (b.textContent || '').trim() : null; });
  await sleep(400);
  const before = await page.evaluate(() => [...document.querySelectorAll('[role="combobox"]')].map(c => (c.textContent || '').trim()));
  await page.fill('#pname', 'Review Runner');
  const picks = ['Brazil', 'Striker', '2010'];
  for (let i = 0; i < before.length && i < 3; i += 1) {
    await page.locator('[role="combobox"]').nth(i).click();
    await page.waitForSelector('[role="option"]', { timeout: 8000 }).catch(() => null);
    if (i === 0) await shot(W, 'create-1open');
    const hit = await page.evaluate(want => { const o = [...document.querySelectorAll('[role="option"]')]; const b = o.find(x => (x.textContent || '').includes(want)) || o[0]; if (b) b.scrollIntoView({ block: 'center' }); return b ? (b.textContent || '').trim() : null; }, picks[i]);
    if (hit) await page.locator('[role="option"]', { hasText: hit }).first().click().catch(() => page.keyboard.press('Enter'));
    await page.waitForSelector('[role="option"]', { state: 'detached', timeout: 4000 }).catch(() => {});
  }
  const after = await page.evaluate(() => [...document.querySelectorAll('[role="combobox"]')].map(c => (c.textContent || '').trim()));
  note(`create ${W.tag}: help ${JSON.stringify(help)}; boxes before ${JSON.stringify(before)}; after the picks ${JSON.stringify(after)}`);
  for (let i = 0; i < after.length; i += 1) if (before[i] && after[i].includes(before[i])) bad('create', W.tag, `box ${i} still holds its placeholder: "${after[i]}"`);
  await shot(W, 'create-2picked');
  await settle(W, 'create');
  await W.ctx.close();
}

/* ── 5. storage blocked, and plain pages ── */
async function plain(browser, view, motion, route, name, blocked, waitMs = 2500) {
  const W = await open(browser, view, motion, {}, blocked);
  const { page } = W;
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 }).catch(e => bad(name, W.tag, 'goto failed ' + String(e).slice(0, 80)));
  await sleep(waitMs);
  const f = await settle(W, name);
  const body = await page.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 900));
  note(`${name} ${W.tag}: h1 ${JSON.stringify(f.h1[0] || '')}; notice "${f.notice.replace(/\s+/g, ' ').trim().slice(0, 200)}"; page starts "${body.slice(0, name === 'whats-new' ? 900 : 140)}"`);
  if (!f.h1.length && body.length < 40) bad(name, W.tag, 'the page is empty');
  await shot(W, name);
  await W.ctx.close();
}

const browser = await chromium.launch();
const run = async (label, fn) => { try { await fn(); } catch (e) { bad(label, 'the walk itself threw:', String(e && e.stack || e).slice(0, 300)); } };
for (const view of VIEWS) {
  for (const motion of MOTIONS) {
    await run('soccer real', () => soccer(browser, view, motion, 'real', true));
    await run('nba', () => us(browser, view, motion, 'nba', '/nba-my-career'));
    if (motion === 'no-preference') {
      await run('soccer invented', () => soccer(browser, view, motion, 'invented', view.name === 'phone'));
      await run('soccer roles', () => soccer(browser, view, motion, 'roles', false));
      await run('nfl', () => us(browser, view, motion, 'nfl', '/nfl-my-career'));
      await run('grid', () => grid(browser, view, motion));
      await run('create', () => create(browser, view, motion));
      await run('whats-new', () => plain(browser, view, motion, '/whats-new', 'whats-new', false));
      for (const [route, name] of [['/club-manager', 'club-manager'], ['/deadline-day', 'deadline-day'], ['/transfer-path', 'transfer-path'], ['/face-off', 'face-off'], ['/rank-em', 'rank-em']]) await run(name, () => plain(browser, view, motion, route, name, false, 3500));
      for (const [route, name] of [['/', 'blocked-home'], ['/soccer-career', 'blocked-soccer-career'], ['/college-grid', 'blocked-college-grid'], ['/nba-my-career', 'blocked-nba']]) await run(name, () => plain(browser, view, motion, route, name, true, 3500));
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'rvwalk.txt'), lines.join('\n') + '\n');
console.log(`rvwalk: ${lines.length} lines, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
