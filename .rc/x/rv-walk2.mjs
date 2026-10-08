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
const tapOrClick = (locator, width) => (width === 390 ? locator.tap() : locator.click());
const optionNamed = (page, name) => page.locator('[role="option"]', { hasText: new RegExp(name, 'i') }).first();

/** A. Build Your XI: leave the box, come back, leave with a search in flight, the keyboard way out, the flicker count. */
async function byxLeave(browser, width, motion, pageErrors) {
  const T = `byx2-${width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { context, page, stub } = await open(browser, BASE, width, motion, '/build-your-xi', pageErrors);
  const box = page.locator(BOX).first();
  const outside = page.getByText(/^Filling:/).first();
  try {
    await page.getByRole('button', { name: /^4-3-3/ }).first().click({ timeout: 40000 });
    await page.getByText('Select a position on the pitch').waitFor({ timeout: 40000 });
    await page.locator('button:not([disabled])', { hasText: /^CB$/ }).first().click();
    await box.waitFor({ timeout: 30000 });
    await box.fill('qzxalp');
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    let searched = stub.searches;
    const scroll0 = (await look(page)).scrollY;

    await tapOrClick(outside, width);
    await sleep(150);
    let s = await look(page);
    check(s.options.length === 0 && s.listboxText === null && s.boxValue === 'qzxalp', T, 'a tap outside closes the panel and keeps the text', { options: s.options, listbox: s.listboxText, value: s.boxValue });
    await shot(page, `${T}-13-left`);
    stub.hold();
    await tapOrClick(box, width);
    await sleep(350);
    s = await look(page);
    check(s.options.length === 0 && /Finding players/.test(s.listboxText || ''), T, 'coming back shows Finding players, not the names from before', { options: s.options, listbox: s.listboxText });
    await shot(page, `${T}-14-finding-on-return`);
    stub.release();
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    check(stub.searches > searched, T, 'coming back searched again', { extraRequests: stub.searches - searched });
    s = await look(page);
    check(s.scrollY === scroll0, T, 'the page did not scroll through leave and return', { before: scroll0, after: s.scrollY });
    await shot(page, `${T}-15-returned`);

    // Leaving with a search still in flight: the answer lands after the player left.
    stub.hold();
    await box.fill('qzxalpi');
    await sleep(350);
    await tapOrClick(outside, width);
    await sleep(100);
    stub.release();
    await sleep(500);
    s = await look(page);
    check(s.options.length === 0 && s.listboxText === null, T, 'an answer that lands after the player left opens nothing', { options: s.options, listbox: s.listboxText });
    stub.hold();
    searched = stub.searches;
    await tapOrClick(box, width);
    await sleep(350);
    s = await look(page);
    check(s.options.length === 0 && /Finding players/.test(s.listboxText || ''), T, 'back after leaving mid search: Finding players, no name fetched before leaving', { options: s.options, listbox: s.listboxText });
    stub.release();
    await optionNamed(page, 'Qzxalpine').waitFor({ timeout: 15000 });
    check(stub.searches > searched, T, 'and it searched again', { extraRequests: stub.searches - searched });

    // The flicker the builder asks the lead to accept: three more letters, one every 150 ms.
    await box.fill('qzxal');
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    await page.evaluate(() => {
      window.__frames = [];
      const tick = () => {
        const lb = document.querySelector('[role="listbox"]');
        window.__frames.push(lb ? { n: lb.querySelectorAll('[role="option"]').length, f: /Finding players/.test(lb.textContent || ''), h: Math.round(lb.getBoundingClientRect().height) } : null);
        window.__raf = requestAnimationFrame(tick);
      };
      window.__raf = requestAnimationFrame(tick);
    });
    await box.pressSequentially('pha', { delay: 150 });
    await optionNamed(page, 'Qzxalpha').waitFor({ timeout: 15000 });
    await sleep(200);
    const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__frames; });
    const withNames = frames.filter(f => f && f.n > 0).length;
    const finding = frames.filter(f => f && f.f).length;
    const heights = Array.from(new Set(frames.filter(Boolean).map(f => f.h)));
    let collapses = 0;
    for (let i = 1; i < frames.length; i++) if (frames[i] && frames[i - 1] && frames[i - 1].n > 0 && frames[i].n === 0) collapses += 1;
    note('INFO', T, 'typing three more letters at 150 ms a key under an open list', { frames: frames.length, framesWithNames: withNames, framesFinding: finding, collapses, panelHeights: heights });

    if (width === 1280) {
      // The keyboard way out: Tab until focus is outside the box.
      await box.fill('qzxalp');
      await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
      const trail = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        s = await look(page);
        trail.push(`${s.activeTag}${s.activeInBox ? ' in' : ' out'} opts=${s.options.length}`);
        if (!s.activeInBox) break;
      }
      s = await look(page);
      check(!s.activeInBox && s.options.length === 0 && s.listboxText === null, T, 'tabbing out of the box drops the list', { trail, filled: s.filled, value: s.boxValue });
      await shot(page, `${T}-16-tabbed-out`);
      stub.hold();
      searched = stub.searches;
      await box.focus();
      await sleep(350);
      s = await look(page);
      check(s.options.length === 0 && /Finding players/.test(s.listboxText || ''), T, 'focus back by keyboard: Finding players, then a fresh list', { options: s.options, listbox: s.listboxText });
      stub.release();
      await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
      check(stub.searches > searched, T, 'the keyboard return searched again', { extraRequests: stub.searches - searched });
      await box.press('Escape');
      await sleep(150);
      s = await look(page);
      check(s.options.length === 0 && s.listboxText === null && s.boxValue === 'qzxalp', T, 'Escape closes the panel and keeps the text', { listbox: s.listboxText, value: s.boxValue });
      await box.pressSequentially('h', { delay: 30 });
      await optionNamed(page, 'Qzxalpha').waitFor({ timeout: 15000 });
      await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 1, null, { timeout: 15000 });
      const asked = stub.validator;
      await box.press('Enter');
      await page.locator('span', { hasText: /^1\/11$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
      s = await look(page);
      check(s.filled === '1/11' && stub.validator === asked + 1, T, 'after Escape, one more letter and Enter picks the only name: one check, one slot', { filled: s.filled, requests: stub.validator - asked });
      await shot(page, `${T}-17-enter-picked`);
    }
  } catch (error) {
    note('FAIL', T, `the walk stopped: ${String(error.message || error).split('\n')[0]}`);
    await shot(page, `${T}-99-stopped`);
  } finally {
    note('INFO', T, 'requests', { searches: stub.searches, validator: stub.validator, blocked: stub.blocked });
    await context.close();
  }
}

/** B. Missing XI at 390: one tap on the only name. Does it only select, or does it also lock the guess in? */
async function mxiTap(browser, base, label, mode, pageErrors) {
  const T = `mxi-tap-${label}-${mode}`;
  const { context, page } = await open(browser, base, 390, 'no-preference', '/missing-xi', pageErrors);
  const box = page.locator(BOX).first();
  try {
    await box.waitFor({ timeout: 40000 });
    await box.fill('qzxalpha');
    const option = optionNamed(page, 'Qzxalpha');
    await option.waitFor({ timeout: 15000 });
    await sleep(400);
    const before = await look(page);
    const r = await option.boundingBox();
    const lock = await page.getByRole('button', { name: /Lock in guess/ }).first().boundingBox().catch(() => null);
    const x = Math.round(r.x + r.width / 2);
    const y = Math.round(r.y + r.height / 2);
    if (mode === 'fast') {
      await option.tap();
    } else {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await sleep(Number(mode));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await sleep(1200);
    const s = await look(page);
    const spent = before.guessLine !== s.guessLine || !!s.tried;
    note('INFO', T, 'one tap on the only name', {
      spent, guessBefore: before.guessLine, guessAfter: s.guessLine, tried: s.tried, value: s.boxValue,
      option: { y: Math.round(r.y), h: Math.round(r.height) }, lock: lock && { y: Math.round(lock.y), h: Math.round(lock.height) }, tapAt: { x, y },
    });
    await shot(page, T);
    return spent;
  } catch (error) {
    note('FAIL', T, `the walk stopped: ${String(error.message || error).split('\n')[0]}`);
    await shot(page, `${T}-99-stopped`);
    return null;
  } finally {
    await context.close();
  }
}

const dump = page => page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); out[key] = localStorage.getItem(key); }
  return out;
});
async function pickAndLock(page, text, name) {
  const box = page.locator(BOX).first();
  await box.fill(text);
  await optionNamed(page, name).waitFor({ timeout: 15000 });
  await optionNamed(page, name).click();
  await sleep(600);
  await box.press('Escape');
  await page.getByRole('button', { name: /Lock in guess/ }).first().click({ timeout: 15000 });
  await sleep(500);
}

/** C. Old save: the code of main plays one wrong guess in the Missing XI of the day; the branch loads that storage. */
async function oldSave(browser, pageErrors) {
  const T = 'oldsave';
  let saved = null;
  const a = await open(browser, MAIN, 1280, 'no-preference', '/missing-xi', pageErrors);
  try {
    await a.page.locator(BOX).first().waitFor({ timeout: 40000 });
    await pickAndLock(a.page, 'qzxalpha', 'Qzxalpha');
    const s = await look(a.page);
    check(/2 OF 3/i.test(s.guessLine || '') && /Qzxalpha Fixture/.test(s.tried || ''), T, 'main: one wrong guess is on the board', { guess: s.guessLine, tried: s.tried });
    saved = await dump(a.page);
    await shot(a.page, 'oldsave-1-main-wrote');
  } catch (error) {
    note('FAIL', T, `main leg stopped: ${String(error.message || error).split('\n')[0]}`);
    await shot(a.page, 'oldsave-99-main-stopped');
  } finally {
    await a.context.close();
  }
  if (!saved) return;
  fs.writeFileSync(path.join(OUT, 'oldsave-main.json'), JSON.stringify(saved, null, 1));
  const b = await open(browser, BASE, 1280, 'no-preference', '/missing-xi', pageErrors, saved);
  try {
    await b.page.locator(BOX).first().waitFor({ timeout: 40000 });
    let s = await look(b.page);
    check(/2 OF 3/i.test(s.guessLine || '') && /Qzxalpha Fixture/.test(s.tried || ''), T, 'branch: the save written by main loads as guess 2 of 3 with the tried name', { guess: s.guessLine, tried: s.tried });
    await shot(b.page, 'oldsave-2-branch-loaded');
    await pickAndLock(b.page, 'qzxbravo', 'Qzxbravo');
    s = await look(b.page);
    check(/3 OF 3/i.test(s.guessLine || '') && /Qzxbravo/.test(s.tried || ''), T, 'branch: a second wrong guess plays on from the old save', { guess: s.guessLine, tried: s.tried });
    await b.page.reload({ waitUntil: 'domcontentloaded' });
    await b.page.locator(BOX).first().waitFor({ timeout: 40000 });
    s = await look(b.page);
    check(/3 OF 3/i.test(s.guessLine || '') && /Qzxalpha Fixture/.test(s.tried || '') && /Qzxbravo/.test(s.tried || ''), T, 'branch: after a reload both tries are still there', { guess: s.guessLine, tried: s.tried });
    const after = await dump(b.page);
    fs.writeFileSync(path.join(OUT, 'oldsave-branch.json'), JSON.stringify(after, null, 1));
    const gone = Object.keys(saved).filter(key => !(key in after));
    const fresh = Object.keys(after).filter(key => !(key in saved));
    check(gone.length === 0, T, 'no key main wrote is missing after the branch played', { gone, newKeys: fresh });
    await shot(b.page, 'oldsave-3-branch-played');
  } catch (error) {
    note('FAIL', T, `branch leg stopped: ${String(error.message || error).split('\n')[0]}`);
    await shot(b.page, 'oldsave-99-branch-stopped');
  } finally {
    await b.context.close();
  }
}

let mainServer = null;
if (MAIN_DIST) {
  mainServer = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), MAIN_DIST, String(MAIN_PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${MAIN}/`); if (r.ok) break; } catch { /* not up yet */ }
    await sleep(250);
  }
}
const browser = await chromium.launch();
const pageErrors = [];
const only = (process.env.WALK_ONLY || '').split(',').filter(Boolean);
const want = name => only.length === 0 || only.includes(name);
try {
  if (want('byx')) {
    await byxLeave(browser, 390, 'no-preference', pageErrors);
    await byxLeave(browser, 1280, 'reduce', pageErrors);
  }
  if (want('tap')) {
    const taps = {};
    for (const [label, base] of [['main', MAIN], ['branch', BASE]]) {
      if (label === 'main' && !MAIN_DIST) continue;
      for (const mode of ['fast', '90', '250']) taps[`${label}-${mode}`] = await mxiTap(browser, base, label, mode, pageErrors);
    }
    note('INFO', 'mxi-tap', 'guess spent by ONE tap on the name (true means the tap also locked the guess in)', taps);
    for (const mode of ['fast', '90', '250']) {
      if (MAIN_DIST) check(!(taps[`branch-${mode}`] === true && taps[`main-${mode}`] === false), 'mxi-tap', `${mode}: the branch spends a guess on one tap only where main does too`, { main: taps[`main-${mode}`], branch: taps[`branch-${mode}`] });
    }
  }
  if (want('save') && MAIN_DIST) await oldSave(browser, pageErrors);
} finally {
  await browser.close();
  if (mainServer) mainServer.kill();
}
for (const error of pageErrors) note('FAIL', 'pageerror', error);
fs.writeFileSync(path.join(OUT, 'walk2.json'), JSON.stringify(results, null, 1));
const passed = results.filter(r => r.kind === 'PASS').length;
const failed = results.filter(r => r.kind === 'FAIL').length;
console.log(`rv-walk2: ${passed} PASS, ${failed} FAIL, ${pageErrors.length} page errors`);
process.exit(0);
