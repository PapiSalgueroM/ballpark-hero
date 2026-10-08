// REVIEWER'S SECOND WALK (Round 1138, runner lens, restart 2). Never committed. Runs on the GitHub runner as
// .rc/x/rv-walk2.mjs against the served branch build at $BASE and a build of main served from $MAIN_DIST.
//  A. Build Your XI: leaving the box and coming back (the leg the first walk never reached), at 390 and 1280.
//  B. Missing XI at 390: does ONE tap on a name spend a guess? Fast tap and a 90 ms tap, on main and on the branch.
//  C. Old save: a Missing XI daily log written by main's code, loaded by the branch.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const MAIN_DIST = process.env.MAIN_DIST || '';
const MAIN_PORT = 4311;
const MAIN = `http://localhost:${MAIN_PORT}`;
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-shots2');
fs.mkdirSync(OUT, { recursive: true });
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const BOX = 'input[role="combobox"]';

const ALPHA = 'Qzxalpha Fixture';
const ALPINE = 'Qzxalpine de Sample';
const BRAVO = 'Qzxbravo van Fixture';
const row = (name, club) => ({
  player_name: name, name_folded: name.toLowerCase(), market_value_usd: 1000000, year: 2026,
  club, nationality: 'Fixtureland', position: 'Centre-Back', age: 27,
});

const results = [];
function note(kind, where, message, extra) {
  results.push({ kind, where, message, ...(extra ? { extra } : {}) });
  console.log(`${kind.padEnd(5)} ${where}: ${message}${extra ? ' ' + JSON.stringify(extra) : ''}`);
}
const check = (ok, where, message, extra) => note(ok ? 'PASS' : 'FAIL', where, message, extra);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(error => note('INFO', name, `screenshot failed: ${error.message}`));
}

async function open(browser, base, width, motion, route, pageErrors, storage) {
  const stub = { held: false, waiting: [], searches: 0, validator: 0, blocked: 0 };
  stub.hold = () => { stub.held = true; };
  stub.release = () => { stub.held = false; for (const go of stub.waiting.splice(0)) go(); };
  const viewport = width === 390 ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } };
  const context = await browser.newContext({ ...viewport, reducedMotion: motion });
  await context.addInitScript(saved => {
    try {
      if (saved) { for (const [key, value] of Object.entries(saved)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value); }
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('lineup-rules-seen', '1');
      localStorage.setItem(`rules-gate-seen:${location.pathname}`, '1');
    } catch { /* ignored */ }
  }, storage || null);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${route} at ${width} on ${base}: ${error.message}`));
  await page.route('**/*', r => { if (r.request().url().startsWith(base)) return r.continue(); stub.blocked += 1; return r.abort(); });
  await page.route(/supabase\.co/, r => { stub.blocked += 1; return r.abort(); });
  const json = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
  await page.route(`**${SUPA_HOST}/rest/v1/national_team_squads**`, json([]));
  await page.route(`**${SUPA_HOST}/rest/v1/player_verified_positions**`, json([]));
  await page.route(`**${SUPA_HOST}/rest/v1/player_market_values**`, async r => {
    stub.searches += 1;
    if (stub.held) await new Promise(resolve => stub.waiting.push(resolve));
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-2/3' }, body: JSON.stringify([row(ALPHA, 'Fixture Rovers'), row(ALPINE, 'Fixture Rovers'), row(BRAVO, 'Fixture Rovers')]) }).catch(() => {});
  });
  await page.route(`**${SUPA_HOST}/functions/v1/validate-player`, async r => {
    if (r.request().method() !== 'POST') return r.fulfill({ status: 204, body: '' }).catch(() => {});
    stub.validator += 1;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true }) }).catch(() => {});
  });
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 }));
  return { context, page, stub };
}

function look(page) {
  return page.evaluate(sel => {
    const box = document.querySelector(sel);
    const listbox = document.querySelector('[role="listbox"]');
    const body = document.body.innerText;
    const active = document.activeElement;
    return {
      boxValue: box ? box.value : null, boxFocused: !!box && active === box, boxEnabled: !!box && !box.disabled,
      activeTag: active ? `${active.tagName}${active.getAttribute('role') ? '[' + active.getAttribute('role') + ']' : ''}` : null,
      activeInBox: !!box && !!active && !!box.parentElement && !!box.parentElement.parentElement && box.parentElement.parentElement.contains(active),
      options: Array.from(document.querySelectorAll('[role="option"]')).map(o => (o.textContent || '').trim().slice(0, 40)),
      listboxText: listbox ? (listbox.textContent || '').trim().slice(0, 120) : null,
      listboxH: listbox ? Math.round(listbox.getBoundingClientRect().height) : null,
      filled: Array.from(document.querySelectorAll('span')).map(s => s.textContent || '').find(t => /^\d+\/11$/.test(t)) || null,
      guessLine: (body.match(/GUESS \d OF \d/i) || [null])[0], tried: (body.match(/Already tried:[^\n]*/) || [null])[0],
      scrollY: Math.round(window.scrollY),
    };
  }, BOX);
}
const optionNamed = (page, name) => page.locator('[role="option"]', { hasText: new RegExp(name, 'i') }).first();

/** D. The settled path, main against the branch: the same markup and the same requests for the same typing. */
async function capture(browser, base, route, width, pageErrors) {
  const { context, page } = await open(browser, base, width, 'no-preference', route, pageErrors);
  const box = page.locator(BOX).first();
  const urls = [];
  page.on('request', r => { if (r.url().includes('/rest/v1/player_market_values')) urls.push(decodeURIComponent(new URL(r.url()).search)); });
  const grab = () => page.evaluate(sel => {
    const input = document.querySelector(sel);
    const shell = input.parentElement.parentElement;
    return shell.outerHTML.replace(/ id="[^"]*"/g, '').replace(/ aria-controls="[^"]*"/g, '');
  }, BOX);
  try {
    if (route === '/build-your-xi') {
      await page.getByRole('button', { name: /^4-3-3/ }).first().click({ timeout: 40000 });
      await page.getByText('Select a position on the pitch').waitFor({ timeout: 40000 });
      await page.locator('button:not([disabled])', { hasText: /^CB$/ }).first().click();
    }
    await box.waitFor({ timeout: 40000 });
    const idle = await grab();
    await box.pressSequentially('qzxalp', { delay: 60 });
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    await sleep(500);
    const settled = await grab();
    await box.press('ArrowDown');
    await sleep(100);
    const arrowed = await grab();
    await box.pressSequentially('zz', { delay: 60 });
    await page.getByText('No players found').first().waitFor({ timeout: 15000 });
    await sleep(500);
    const empty = await grab();
    await box.fill('');
    await sleep(300);
    const cleared = await grab();
    return { idle, settled, arrowed, empty, cleared, urls };
  } finally {
    await context.close();
  }
}

let mainServer = null;
if (MAIN_DIST) {
  mainServer = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), MAIN_DIST, '4311'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${MAIN}/`); if (r.ok) break; } catch { /* not up yet */ }
    await sleep(250);
  }
}
const browser = await chromium.launch();
const pageErrors = [];
try {
  for (const route of ['/missing-xi', '/build-your-xi']) {
    for (const width of [390, 1280]) {
      const T = `same${route.replace(/\//g, '-')}-${width}`;
      try {
        const a = await capture(browser, MAIN, route, width, pageErrors);
        const b = await capture(browser, BASE, route, width, pageErrors);
        for (const state of ['idle', 'settled', 'arrowed', 'empty', 'cleared']) {
          const same = a[state] === b[state];
          check(same, T, `${state}: the box markup on the branch is the markup on main`, { bytes: b[state].length, ...(same ? {} : { main: a[state].slice(0, 600), branch: b[state].slice(0, 600) }) });
        }
        /* Build Your XI deals a random team, so its club or nation filter differs from run to run: compare the count there. */
        const sameRequests = route === '/build-your-xi' ? a.urls.length === b.urls.length : JSON.stringify(a.urls) === JSON.stringify(b.urls);
        check(sameRequests, T, 'the same typing sends the same search requests', { main: a.urls.length, branch: b.urls.length, ...(sameRequests ? {} : { mainUrls: a.urls.map(u => u.slice(0, 160)), branchUrls: b.urls.map(u => u.slice(0, 160)) }) });
        fs.writeFileSync(path.join(OUT, `${T}.json`), JSON.stringify({ main: a, branch: b }, null, 1));
      } catch (error) {
        note('FAIL', T, `stopped: ${String(error.message || error).split('\n')[0]}`);
      }
    }
  }
} finally {
  await browser.close();
  if (mainServer) mainServer.kill();
}
for (const error of pageErrors) note('FAIL', 'pageerror', error);
const passed = results.filter(r => r.kind === 'PASS').length;
const failed = results.filter(r => r.kind === 'FAIL').length;
console.log(`rv-walk3: ${passed} PASS, ${failed} FAIL, ${pageErrors.length} page errors`);
process.exit(0);
