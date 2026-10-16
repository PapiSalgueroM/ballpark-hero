/* Served Manager refusal feedback. Preparation uses the real engine plus explicitly prepared generated squad
 * members to reach the full-squad boundary. It does not represent a naturally played career. Browser Math.random
 * is never replaced: zero draws are measured on the real node refusal action only, not on the browser process.
 * Baseline/original-placement qualify only reproduced presentation faults, never setup or save failures. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = path.resolve(process.env.MDF_OUT || 'manager-desk-feedback-artifacts');
const PHASE = process.env.MDF_PHASE;
assert(['baseline', 'fixed', 'original-placement'].includes(PHASE), 'Declare MDF_PHASE.');
const APP_BASE = process.env.CM_DESK_FEEDBACK_BASE || '7c4838670253f2ca95af2adf14c2397d66b4f7c9';
const KEY = 'dukb-club-manager-save';
const NOTE = 'Your squad is full at 30. Somebody has to leave first.';
const PROFILES = [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }];
const sha = value => createHash('sha256').update(value).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
fs.mkdirSync(OUT, { recursive: true });
const report = { phase: PHASE, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  status: 'running', browserRngMeasured: false, cases: [], setupFailures: [], presentationFailures: [], receipts: [] };
const receipt = file => { const bytes = fs.readFileSync(path.join(OUT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const flush = () => json('report.json', report);
flush();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-desk-feedback-'));
let browser;
try {
  const component = 'src/components/club-manager/TransferScreen.tsx';
  const applicationRef = PHASE === 'fixed' ? 'HEAD' : APP_BASE;
  const componentBytes = fs.readFileSync(component, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(componentBytes, execFileSync('git', ['show', `${applicationRef}:${component}`], { encoding: 'utf8', maxBuffer: 1 << 24 }).replaceAll('\r\n', '\n'), 'The actually built component must match the declared phase source.');
  report.sourceBinding = { applicationRef: execFileSync('git', ['rev-parse', applicationRef], { encoding: 'utf8' }).trim(), component, sha256: sha(componentBytes) };
  fs.writeFileSync(path.join(OUT, 'actual-TransferScreen.tsx'), componentBytes);
  const entry = path.join(work, 'entry.ts');
  fs.writeFileSync(entry, "export * from '@/lib/clubManager';\n");
  const outfile = path.join(work, 'engine.cjs');
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'cjs', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  const cm = createRequire(import.meta.url)(outfile);
  await cm.ensureAllEraRosters();
  const originalRandom = Math.random;
  const originalNow = Date.now;
  const preparationNow = Date.UTC(2026, 9, 16, 12);
  let seed = 916341;
  const preparationDraws = [];
  const preparedRandom = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; preparationDraws.push(value); return value; };
  Math.random = preparedRandom;
  Date.now = () => preparationNow;
  let stock, full, generated, market, target, before, fullSave, stockSave, reason, refused;
  let draws = 0;
  try {
    stock = cm.startCareer('Everton');
    assert(stock.squad.length < 30 && stock.transferWindow !== null, 'Prepared opening must have squad space and a real market.');
    full = structuredClone(stock);
    generated = cm.buildCustomSquad({ name: 'Desk Fixture Rovers', budgetTier: 'mid', leagueId: 'premier', replacedClub: 'Everton', quality: 72 });
    assert(generated.length >= 30 - full.squad.length);
    full.squad.push(...generated.slice(0, 30 - full.squad.length));
    assert.equal(full.squad.length, 30);
    assert.equal(new Set(full.squad.map(player => player.id)).size, 30);
    market = cm.buildMarket(full).sort((a, b) => b.rating - a.rating);
    assert(market.length >= 30, 'Actual market must contain a below-fold candidate.');
    target = market[24];
    before = JSON.stringify(full);
    Math.random = () => { draws += 1; return 0.5; };
    try { reason = cm.doorRefusal(full, target, 'talk'); refused = cm.startNegotiation(full, target); }
    finally { Math.random = preparedRandom; }
    assert.equal(reason, NOTE); assert.equal(refused, null); assert.equal(draws, 0); assert.equal(JSON.stringify(full), before);
    const serialize = career => { memory.clear(); assert.equal(cm.saveCareer(career), true); const loaded = cm.loadCareer(); assert(loaded); assert.equal(cm.saveCareer(loaded), true); return memory.get(KEY); };
    fullSave = serialize(full); stockSave = serialize(stock);
  } finally { Math.random = originalRandom; Date.now = originalNow; }
  json('preparation.json', { declaration: 'Prepared full squad using startCareer, generated buildCustomSquad members, saveCareer/loadCareer. No naturally played full-squad claim.',
    target, before: JSON.parse(before), refused, reason, draws, fullSave, stockSave, fullSaveSha256: sha(fullSave), stockSaveSha256: sha(stockSave),
    preparationRandom: { initialSeed: 916341, finalSeed: seed, draws: preparationDraws, drawCount: preparationDraws.length, sha256: sha(JSON.stringify(preparationDraws)), fixedNow: preparationNow }, generatedIds: generated.slice(0, 30 - stock.squad.length).map(player => player.id) });
  report.preparation = receipt('preparation.json');
  const fontDir = process.env.FREE_KICK_FONT_CACHE;
  assert(fontDir, 'Retained declared font cache required.');
  const fontRows = JSON.parse(fs.readFileSync(path.join(fontDir, 'manifest.json')));
  const fonts = new Map(fontRows.map(row => { const body = fs.readFileSync(path.join(fontDir, row.file)); assert.equal(sha(body), row.sha256); return [row.url, { body, contentType: row.contentType }]; }));
  browser = await pw.chromium.launch({ headless: true });
  async function open(profile, save, name) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.width < 500, hasTouch: profile.width < 500,
      serviceWorkers: 'block', reducedMotion: 'reduce', storageState: { cookies: [], origins: [{ origin: BASE,
        localStorage: [{ name: KEY, value: save }, ...(profile.cookie ? [] : [{ name: 'cookie-consent', value: 'essential' }])] }] } });
    const network = [], errors = [], consoleRows = [];
    await context.route('**/*', route => {
      const request = route.request(), url = request.url();
      if (new URL(url).origin === BASE) return route.continue();
      if (fonts.has(url)) return route.fulfill(fonts.get(url));
      network.push({ url, method: request.method(), resourceType: request.resourceType() });
      return route.abort();
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => consoleRows.push({ type: message.type(), text: message.text() }));
    for (let boot = 0; boot < 2; boot += 1) {
      await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
      const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
      await resume.waitFor({ state: 'visible' });
      assert.equal(await resume.count(), 1, 'Exactly one actual Resume Career door.'); await resume.click();
      await page.getByRole('tab', { name: 'Market', exact: true }).waitFor();
    }
    await page.getByRole('tab', { name: 'Market', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search player or club', exact: true }).waitFor();
    await page.evaluate(async () => { await document.fonts.ready; });
    return { page, context, network, errors, consoleRows, name };
  }
  async function markTarget(page) {
    const matches = await page.evaluate(candidate => {
      const buttons = [...document.querySelectorAll('button')].filter(button => /^Talk\s/.test(button.textContent.trim()) &&
        button.parentElement.parentElement.textContent.includes(candidate.name) && button.parentElement.parentElement.textContent.includes(candidate.club));
      if (buttons.length === 1) { buttons[0].setAttribute('data-mdf-target', '1'); buttons[0].parentElement.parentElement.setAttribute('data-mdf-row', '1'); }
      return buttons.length;
    }, target);
    assert.equal(matches, 1, 'Actual target identity must select exactly one rendered Talk action.');
    const button = page.locator('[data-mdf-target="1"]');
    assert.equal(await button.isEnabled(), true); await button.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await page.waitForTimeout(120);
  }
  async function snapshot(page) {
    return page.evaluate(() => {
      const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      const stores = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
      const row = document.querySelector('[data-mdf-row="1"]'), button = document.querySelector('[data-mdf-target="1"]');
      const scroll = []; for (let element = row; element; element = element.parentElement) scroll.push({ tag: element.tagName, top: element.scrollTop, left: element.scrollLeft });
      const notes = [...document.querySelectorAll('[data-testid="cm-desk-note"]')].map(element => {
        const box = rect(element), style = getComputedStyle(element), span = element.querySelector('span');
        const x = Math.min(innerWidth - 1, Math.max(0, box.x + box.width / 2));
        const y = Math.min(innerHeight - 1, Math.max(0, box.y + box.height / 2));
        const hit = document.elementFromPoint(x, y);
        return { text: span?.textContent, box, display: style.display, visibility: style.visibility, fontSize: parseFloat(getComputedStyle(span || element).fontSize),
          visible: style.display !== 'none' && style.visibility === 'visible' && box.width > 0 && box.height > 0 && box.x >= -0.5 && box.y >= -0.5 && box.right <= innerWidth + 0.5 && box.bottom <= innerHeight + 0.5 && (hit === element || element.contains(hit)) };
      });
      const cookie = document.querySelector('[role="region"][aria-label="Cookie choices"]');
      return { local: stores(localStorage), session: stores(sessionStorage), scroll, window: { x: scrollX, y: scrollY }, row: row && rect(row), button: button && rect(button), notes, cookie: cookie && rect(cookie),
        viewport: { width: innerWidth, height: innerHeight }, width: { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth } };
    });
  }
  const noteLocator = page => page.getByTestId('cm-desk-note');
  const sameStores = (a, b) => { assert.deepEqual(b.local, a.local, 'All saved local bytes held.'); assert.deepEqual(b.session, a.session, 'All session bytes held.'); };
  const presentation = (a, b) => ({ visible: b.notes.length === 1 && b.notes[0].text === NOTE && b.notes[0].visible && b.notes[0].fontSize >= 12,
    stationary: JSON.stringify(a.scroll) === JSON.stringify(b.scroll) && a.window.x === b.window.x && a.window.y === b.window.y && Math.abs(a.row.y - b.row.y) <= 0.5 && Math.abs(a.row.x - b.row.x) <= 0.5,
    widthHeld: b.width.scroll <= b.width.client + 1,
    cookieClear: !b.cookie || (b.notes.length === 1 && b.notes[0].box.bottom <= b.cookie.y + 0.5) });
  async function press(page) {
    const point = await page.locator('[data-mdf-target="1"]').boundingBox(); assert(point);
    const x = point.x + point.width / 2, y = point.y + point.height / 2;
    assert.equal(await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-mdf-target="1"]'), [x, y]), true, 'Real pointer can reach Talk without auto-scroll.');
    if (page.viewportSize().width < 500) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await noteLocator(page).waitFor({ state: 'attached' });
    await page.waitForTimeout(200);
    assert.equal(await noteLocator(page).count(), 1, 'One actual engine refusal must be rendered.');
    assert.equal(await noteLocator(page).locator('span').textContent(), NOTE);
  }
  async function capture(page, file) { await page.screenshot({ path: path.join(OUT, file), fullPage: false }); report.receipts.push(receipt(file)); }
  for (const profile of [...PROFILES, { ...PROFILES[1], cookie: true }]) {
    const id = `${profile.width}${profile.cookie ? '-cookie' : ''}`;
    const run = await open(profile, fullSave, id);
    const row = { id, width: profile.width, cookiePending: !!profile.cookie, observations: {}, presentation: {}, diagnostics: {} };
    try {
      await markTarget(run.page);
      row.observations.before = await snapshot(run.page);
      if (profile.cookie) assert(row.observations.before.cookie, 'Cookie-pending preparation must render the real cookie banner.');
      await press(run.page); row.observations.first = await snapshot(run.page);
      sameStores(row.observations.before, row.observations.first);
      row.presentation.first = presentation(row.observations.before, row.observations.first);
      await capture(run.page, `${id}-first.png`);
      await press(run.page); row.observations.repeat = await snapshot(run.page);
      sameStores(row.observations.first, row.observations.repeat);
      row.presentation.repeat = presentation(row.observations.first, row.observations.repeat);
      await capture(run.page, `${id}-repeat.png`);
      /* Calibrate the geometry oracle on the SAME real status, then restore its exact style. This is diagnostic
       * calibration, not the product control: the original-placement arm must use an actual rebuilt source inverse. */
      const style = await noteLocator(run.page).getAttribute('style');
      await noteLocator(run.page).evaluate(element => element.setAttribute('style', 'position:fixed!important;left:8px!important;bottom:8px!important;top:auto!important;width:calc(100vw - 16px)!important;z-index:2147483647!important;display:flex!important;visibility:visible!important'));
      row.observations.calibrationVisible = await snapshot(run.page); assert.equal(row.observations.calibrationVisible.notes[0].visible, true);
      await capture(run.page, `${id}-calibration-visible.png`);
      await noteLocator(run.page).evaluate(element => element.style.setProperty('visibility', 'hidden', 'important'));
      row.observations.calibrationHidden = await snapshot(run.page); assert.equal(row.observations.calibrationHidden.notes[0].visible, false);
      await capture(run.page, `${id}-calibration-hidden.png`);
      await noteLocator(run.page).evaluate((element, original) => { if (original === null) element.removeAttribute('style'); else element.setAttribute('style', original); }, style);
      assert.equal(await noteLocator(run.page).getAttribute('style'), style);
      sameStores(row.observations.first, await snapshot(run.page));
      const dismiss = noteLocator(run.page).getByRole('button', { name: 'Dismiss', exact: true });
      await dismiss.scrollIntoViewIfNeeded(); const beforeDismiss = await snapshot(run.page);
      await dismiss.click(); await noteLocator(run.page).waitFor({ state: 'detached' }); await run.page.waitForTimeout(120);
      row.observations.dismissed = await snapshot(run.page); sameStores(beforeDismiss, row.observations.dismissed);
      assert.equal(row.observations.dismissed.notes.length, 0);
      row.presentation.dismissedStationary = presentation(beforeDismiss, row.observations.dismissed).stationary;
      await capture(run.page, `${id}-dismissed.png`);
      await markTarget(run.page); await press(run.page);
      row.observations.modes = [];
      for (const name of [/^Latest$/, /^Sell(?: \d+)?$/, /^Buy$/]) {
        const mode = run.page.getByRole('button', { name }); await mode.waitFor({ state: 'visible' }); assert.equal(await mode.count(), 1); await mode.click();
        await run.page.waitForTimeout(120); const state = await snapshot(run.page);
        sameStores(row.observations.first, state); assert.equal(state.notes.length, 1); assert.equal(state.notes[0].text, NOTE);
        row.observations.modes.push({ name: String(name), state });
      }
      await run.page.getByRole('tab', { name: 'Squad', exact: true }).click();
      assert.equal(await noteLocator(run.page).count(), 0, 'The unmounted desk is not shown on Squad.');
      await run.page.getByRole('tab', { name: 'Market', exact: true }).click();
      await noteLocator(run.page).waitFor();
      row.observations.returned = await snapshot(run.page); sameStores(row.observations.first, row.observations.returned);
      assert.equal(row.observations.returned.notes[0].text, NOTE, 'Existing desk-note lifecycle is retained.');
      assert.deepEqual(run.errors, [], 'No uncaught page errors.');
      row.diagnostics = { network: run.network, console: run.consoleRows, pageErrors: run.errors };
      row.targetFault = !row.presentation.first.visible || !row.presentation.first.stationary || !row.presentation.dismissedStationary;
      if (PHASE === 'fixed' && (!Object.values(row.presentation.first).every(Boolean) || !Object.values(row.presentation.repeat).every(Boolean) || !row.presentation.dismissedStationary)) report.presentationFailures.push({ width: profile.width, measured: row.presentation });
    } catch (error) { row.error = String(error.stack || error); report.setupFailures.push({ width: profile.width, error: row.error }); }
    finally { json(`${id}.json`, row); report.cases.push({ id, width: profile.width, targetFault: row.targetFault, file: receipt(`${id}.json`) }); await run.context.close(); flush(); }
  }
  /* A real successful sibling action stays usable. Its intended save and RNG changes are not called preservation. */
  const success = await open(PROFILES[1], stockSave, 'successful-talk');
  try {
    await markTarget(success.page);
    const previous = await snapshot(success.page);
    await success.page.locator('[data-mdf-target="1"]').click();
    await success.page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).negotiation, KEY);
    const after = await snapshot(success.page), career = JSON.parse(after.local[KEY]);
    assert.equal(career.negotiation.player.name, target.name); assert.equal(career.negotiation.status, 'open');
    assert.equal(after.notes.length, 0); assert.deepEqual(success.errors, []);
    await capture(success.page, 'successful-talk.png');
    json('successful-talk.json', { previous, after, pageErrors: success.errors, console: success.consoleRows, declaration: 'Successful action intentionally changes its negotiation; browser RNG is unmeasured.' });
    report.successfulTalk = receipt('successful-talk.json');
  } finally { await success.context.close(); }
  assert.equal(report.cases.length, 5); assert.deepEqual(report.setupFailures, []);
  if (PHASE !== 'fixed') assert(report.cases.some(row => row.width < 500 && row.targetFault), 'Baseline must reproduce at least one actual mobile presentation fault.');
  report.status = report.presentationFailures.length ? 'failed' : PHASE === 'fixed' ? 'qualified-fixed' : 'qualified-original-fault';
} catch (error) { report.status = 'failed'; report.setupFailures.push({ error: String(error.stack || error) }); }
finally { if (browser) await browser.close(); flush(); fs.rmSync(work, { recursive: true, force: true }); }
console.log(`Manager desk ${PHASE}: ${report.status}; ${report.cases.length} journeys over four widths, ${report.setupFailures.length} setup/preservation errors.`);
if (report.status === 'failed') process.exitCode = 1;
