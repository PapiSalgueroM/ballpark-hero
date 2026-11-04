import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { waitForScrollIdle } from './nativeScrollReady.mjs';
import { CM_SOURCE_PINS, inventory } from './cmReplacementFixtures.mjs';

const clone = value => structuredClone(value);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const player = (state, id) => { const p = state.squad.find(row => row.id === id); assert(p); return p; };
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

function controls({ page, width, save, key, actions }) {
  const activate = async control => {
    assert.equal(await control.count(), 1, 'One intended native control');
    if (width < 768) await control.tap(); else await page.keyboard.press('Enter');
  };
  const prepare = async control => {
    assert.equal(await control.count(), 1); await control.waitFor({ state: 'visible' });
    await waitForScrollIdle(page); await control.scrollIntoViewIfNeeded();
    await control.click({ trial: true });
    if (width >= 768) {
      for (let n = 0; !(await control.evaluate(node => document.activeElement === node)); n++) {
        assert(n < 160, 'CM_REPLACEMENT_DESKTOP_TAB_TARGET'); await page.keyboard.press('Tab');
      }
    }
    await waitForScrollIdle(page);
  };
  const press = async control => { await prepare(control); await activate(control); };
  const native = async (label, control, settled) => {
    await prepare(control); await frames(page);
    const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    await activate(control); if (settled) await settled(); await frames(page);
    const after = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const action = { label, before, after, saved: await save(key) }; actions.push(action);
    assert.deepEqual(after, before, 'CM_REPLACEMENT_APP_NO_JUMP:' + label);
    return action;
  };
  return { press, native };
}

async function journey(args, completion) {
  const { page, width, base, fixture, engine, photo, goto, save } = args;
  const x = fixture.expected, key = x.key, actions = [];
  assert.equal(engine.SAVE_KEY, key); assert.equal(x.kind, completion ? 'completion' : 'choice');
  const read = async () => JSON.parse(await save(key));
  const { press, native } = controls({ page, width, save, key, actions });
  const resume = async () => {
    const bytes = await save(key), button = page.getByRole('button', { name: 'Resume Career', exact: true });
    const hub = page.locator('[data-cm-hub]');
    await button.or(hub).waitFor({ state: 'visible' });
    if (await button.isVisible()) await press(button);
    else assert.equal(await hub.isVisible(), true, 'CM_REPLACEMENT_APP_VISIBLE_LOADED_HUB');
    await hub.waitFor({ state: 'visible' });
    assert.equal(await save(key), bytes, 'CM_REPLACEMENT_APP_LANDING_PRESERVES_SAVE_BYTES');
  };
  const home = async () => {
    await press(page.getByRole('tab', { name: 'Home', exact: true }));
    const back = page.getByRole('button', { name: 'Club home', exact: true });
    if (await back.isVisible()) await press(back);
  };
  const training = async () => {
    await home(); await press(page.getByRole('button').filter({ has: page.getByText('Training', { exact: true }) }));
    await page.locator('[data-cm-retrain-card]').waitFor({ state: 'visible' });
  };
  const waitCourse = async wanted => page.waitForFunction(({ key, id, wanted }) => {
    const p = JSON.parse(localStorage.getItem(key)).squad.find(row => row.id === id);
    return JSON.stringify(p?.retraining) === JSON.stringify(wanted);
  }, { key, id: x.target.id, wanted });
  const assertRole = state => {
    assert.equal(player(state, x.target.id).position, 'LW');
    assert.deepEqual(state.xiIds, x.xiIds); assert.deepEqual(state.training, x.basePlan);
    assert.equal(engine.fitPenalty(player(state, x.target.id), engine.FORMATIONS[0].slots[x.slot]), 0);
  };
  try {
    await goto(base + '/club-manager'); await resume();
    assert.equal(await save(key), fixture.raw, 'CM_REPLACEMENT_APP_OPEN_CODEC_BYTES');
    const initial = await read(); assert.deepEqual(initial.squad, x.players); assertRole(initial);
    await training(); assert.equal(await save(key), fixture.raw, 'CM_REPLACEMENT_APP_READ_ONLY');
    if (!completion) {
      const picker = page.getByRole('combobox', { name: 'Player to retrain', exact: true });
      await picker.selectOption(x.target.id);
      const replace = page.getByRole('combobox', { name: 'Position to replace when training finishes', exact: true });
      await replace.waitFor({ state: 'visible' }); await waitForScrollIdle(page);
      await replace.selectOption('CM');
      const start = page.locator('[data-cm-retrain-to="ST"]');
      await start.getByText('Replaces CM', { exact: true }).waitFor({ state: 'visible' });
      assert.equal(await save(key), fixture.raw, 'CM_REPLACEMENT_APP_PREVIEW_READ_ONLY');
      await photo('replacement-choice-preview', '[data-cm-retrain-card]');
      const startedExpected = clone(initial); player(startedExpected, x.target.id).retraining = clone(x.course);
      await native('start', start, () => waitCourse(x.course));
      assert.deepEqual(await read(), startedExpected, 'CM_REPLACEMENT_APP_START_ONLY_COURSE'); assertRole(await read());
      const pausedCourse = { ...x.course, paused: true }, pausedExpected = clone(startedExpected);
      player(pausedExpected, x.target.id).retraining = pausedCourse;
      await native('pause', page.getByRole('button', { name: 'Pause retraining for ' + x.target.name, exact: true }), () => waitCourse(pausedCourse));
      assert.deepEqual(await read(), pausedExpected, 'CM_REPLACEMENT_APP_PAUSE_PRESERVES_REPLACE');
      await page.locator('[data-cm-retraining]').getByText('Replaces CM when training finishes. Current positions stay until then.', { exact: true }).waitFor({ state: 'visible' });
      await native('resume', page.getByRole('button', { name: 'Resume retraining for ' + x.target.name, exact: true }), () => waitCourse(x.course));
      assert.deepEqual(await read(), startedExpected, 'CM_REPLACEMENT_APP_RESUME_ONLY_FLAG');
      const startedBytes = await save(key);
      await page.reload({ waitUntil: 'domcontentloaded' }); await resume(); await training();
      assert.equal(await save(key), startedBytes, 'CM_REPLACEMENT_APP_TAGGED_RELOAD_BYTES');
      assert.deepEqual(player(await read(), x.target.id).retraining, x.course); assertRole(await read());
      await native('stop', page.locator('[data-cm-retrain-stop="' + x.target.id + '"]'), () => waitCourse(undefined));
      assert.deepEqual(await read(), initial, 'CM_REPLACEMENT_APP_STOP_WHOLE_FRAME');
      assert.equal(await save(key), fixture.raw, 'CM_REPLACEMENT_APP_STOP_ORIGINAL_BYTES');
      return { status: 'passed', width, kind: x.kind, target: x.target, actions,
        course: x.course, positionsHeld: ['RW', 'CM'], xiHeld: true, basePlanHeld: true, reloadBytesHeld: true,
        scope: x.scope, browserClockOverride: false, browserRngOverride: false };
    }
    const row = page.locator('[data-cm-retraining="' + x.target.id + '"]');
    await row.getByText('Replaces CM when training finishes. Current positions stay until then.', { exact: true }).waitFor({ state: 'visible' });
    assert.deepEqual(player(initial, x.target.id).retraining, x.course); assert.equal(x.course.weeksLeft, 1);
    await home(); await press(page.getByRole('button', { name: 'Open the Window', exact: true }));
    await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week + 1, { key, week: x.week });
    const paid = await read(); assert.equal(paid.week, x.week + 1); assertRole(paid);
    assert.equal(initial.facilities.dressingRoom, 8, 'CM_REPLACEMENT_APP_DRESSING_ROOM_PREMISE');
    assert(initial.squad.every(p => p.morale === 68), 'CM_REPLACEMENT_APP_INITIAL_MORALE_PREMISE');
    // Existing level 8 dressing room: round1(0.08 * (8 - 1)) = 0.6, below the 70 rest cap.
    const expectedPlayers = initial.squad.map(p => {
      const next = { ...p, morale: 68.6, trainingExposure: { v: 1, club: x.clubName, season: x.season, counts: [0, 0, 0, 0, 1, 0, 0, 0, 0] } };
      if (p.id === x.target.id) { next.secondaryPositions = ['RW', 'ST']; delete next.retraining; }
      return next;
    });
    assert.deepEqual(paid.squad, expectedPlayers, 'CM_REPLACEMENT_APP_REAL_PAID_COMPLETION_PLAYERS');
    assert.equal(player(paid, x.target.id).retraining, undefined);
    assert.deepEqual(player(paid, x.target.id).secondaryPositions, ['RW', 'ST']);
    const paidBytes = await save(key); await training();
    assert.equal(await page.locator('[data-cm-retraining="' + x.target.id + '"]').count(), 0);
    const record = page.locator('[data-cm-training-record="' + x.target.id + '"]');
    await record.waitFor({ state: 'visible' });
    assert.match(await record.textContent(), /^1 recorded week/);
    await photo('replacement-paid-completion', '[data-cm-training-record="' + x.target.id + '"]');
    await page.reload({ waitUntil: 'domcontentloaded' }); await resume(); await training();
    assert.equal(await save(key), paidBytes, 'CM_REPLACEMENT_APP_COMPLETED_RELOAD_BYTES');
    assert.deepEqual((await read()).squad, expectedPlayers); assertRole(await read());
    return { status: 'passed', width, kind: x.kind, target: x.target, actions, paidWeek: paid.week,
      beforeCourse: x.course, afterPositions: ['RW', 'ST'], paidPlayers: paid.squad,
      rwFitPenalty: 0, xiHeld: true, basePlanHeld: true, reloadBytesHeld: true,
      scope: x.scope, browserClockOverride: false, browserRngOverride: false };
  } catch (error) { error.cmActions = actions; throw error; }
}

export async function runCmReplacementChoice(args) { return journey(args, false); }
export async function runCmReplacementCompletion(args) { return journey(args, true); }

async function main() {
  const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0, name); return process.argv[i + 1]; };
  const out = path.resolve(arg('--out')), dir = path.resolve(arg('--fixtures')), dist = path.resolve(arg('--dist'));
  const base = arg('--base-url'), origin = new URL(base).origin, publicMode = process.argv.includes('--public');
  assert(publicMode ? origin === 'https://douknowball.com' : ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname));
  await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
  const manifestPath = path.join(dir, 'manifest.json'), manifestBytes = await fs.readFile(manifestPath), m = JSON.parse(manifestBytes);
  assert.equal(m.schema, 1); assert.deepEqual(m.sourceBefore, m.sourceAfter); assert.deepEqual(m.sourcePins, CM_SOURCE_PINS);
  const checkSource = async () => { for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sha(await fs.readFile(file)), digest, file); };
  await checkSource(); assert.deepEqual(await inventory(dist), m.distBefore); assert.equal(sha(JSON.stringify(m.distBefore)), m.distDigest);
  assert.equal(sha(await fs.readFile(path.join(dir, m.bundle))), m.bundleSHA);
  const engine = await import(pathToFileURL(path.join(dir, m.bundle)).href), fixtures = {};
  for (const [name, f] of Object.entries(m.fixtures)) { const raw = await fs.readFile(path.join(dir, f.file), 'utf8'); assert.equal(sha(raw), f.sha256); fixtures[name] = { ...f, raw }; }
  assert.deepEqual(Object.keys(fixtures).sort(), ['choice', 'completion']);
  const { default: pw } = await import('../lib/playwrightLoader.mjs');
  const { answerConsent } = await import('../lib/answerConsent.mjs');
  const refs = new Map(m.distBefore.filter(row => row.file.startsWith('assets/')).map(row => [row.file, row]));
  const known = new Set(['https://flagcdn.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flawuiqbvjobmkfkauhw.supabase.co']);
  const report = { status: 'incomplete', core: m.core, distDigest: m.distDigest, mode: publicMode ? 'public' : 'local', contexts: [], screenshots: [] };
  const browser = await pw.chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 1280]) for (const kind of ['choice', 'completion']) {
      const fixture = fixtures[kind], r = { id: 'manager-replacement-' + kind + '-' + width, width, kind, status: 'incomplete', requests: [], responses: [], aborts: [], requestFailures: [], console: [], pageErrors: [], assetBodies: [], assetErrors: [], drains: [] };
      report.contexts.push(r);
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' });
      await context.route('**/*', route => { const q = route.request(), u = new URL(q.url()); if (!['http:', 'https:'].includes(u.protocol) || u.origin === origin && ['GET', 'HEAD'].includes(q.method())) return route.continue(); r.aborts.push({ url: u.href, origin: u.origin, method: q.method() }); return route.abort('blockedbyclient'); });
      await context.routeWebSocket('**/*', async socket => { r.aborts.push({ url: socket.url(), origin: new URL(socket.url()).origin, method: 'WEBSOCKET' }); await socket.close({ code: 1008, reason: 'Source-owned CM QA' }); });
      await context.addInitScript(({ origin, key, raw }) => { if (location.origin !== origin || localStorage.getItem('cm-replacement-seeded')) return; localStorage.setItem(key, raw); localStorage.setItem('rules-gate-seen:/club-manager', '1'); localStorage.setItem('cm-replacement-unrelated', 'held'); localStorage.setItem('cm-replacement-seeded', '1'); }, { origin, key: fixture.key, raw: fixture.raw });
      const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
      const active = new Set(), reads = new Set(); let last = Date.now();
      const asset = url => { const u = new URL(url); return u.origin === origin && u.pathname.startsWith('/assets/'); };
      const finished = q => { if (active.delete(q)) last = Date.now(); };
      const drain = async phase => { const start = Date.now(); while (active.size || reads.size || Date.now() - last < 100) { assert(Date.now() - start < 20000, 'CM_ASSET_CAPTURE_UNSETTLED:' + phase); await new Promise(resolve => setTimeout(resolve, 25)); } assert.equal(r.assetErrors.length, 0); r.drains.push({ phase, ms: Date.now() - start, active: active.size, reads: reads.size }); };
      page.on('request', q => { r.requests.push({ url: q.url(), method: q.method() }); if (asset(q.url())) { active.add(q); last = Date.now(); } });
      page.on('requestfinished', finished); page.on('requestfailed', q => { r.requestFailures.push({ url: q.url(), failure: q.failure() }); finished(q); });
      page.on('response', response => {
        r.responses.push({ url: response.url(), status: response.status() });
        if (!asset(response.url())) return; last = Date.now();
        const promise = (async () => { try { const file = decodeURIComponent(new URL(response.url()).pathname.slice(1)), ref = refs.get(file); assert(ref, 'Unknown completed asset ' + file); assert.equal(response.status(), 200, file); const bytes = await response.body(); assert.equal(bytes.length, ref.bytes, file); assert.equal(sha(bytes), ref.sha256, file); r.assetBodies.push({ file, bytes: bytes.length, sha256: sha(bytes) }); } catch (error) { r.assetErrors.push({ url: response.url(), error: String(error.stack || error) }); } })();
        reads.add(promise); void promise.finally(() => { reads.delete(promise); last = Date.now(); });
      });
      page.on('console', event => r.console.push({ type: event.type(), text: event.text(), location: event.location() }));
      page.on('pageerror', error => r.pageErrors.push(String(error.stack || error)));
      const originalReload = page.reload.bind(page); page.reload = async (...args) => { await drain('before-reload'); return originalReload(...args); };
      try {
        const run = kind === 'choice' ? runCmReplacementChoice : runCmReplacementCompletion;
        r.observed = await run({ page, width, base, fixture, engine: engine.cm,
          save: key => page.evaluate(k => localStorage.getItem(k), key),
          goto: async value => { const u = new URL(value, base); assert.equal(u.origin, origin); await page.goto(u.href, { waitUntil: 'domcontentloaded' }); await answerConsent(page, { wait: 1000 }); },
          photo: async (label, selector) => { assert(!r.screenshot); const target = page.locator(selector); assert.equal(await target.count(), 1); await target.scrollIntoViewIfNeeded(); await frames(page); r.geometry = await target.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }; }); assert(r.geometry.width > 0 && r.geometry.x >= -1 && r.geometry.right <= width + 1); assert(r.geometry.documentWidth <= r.geometry.clientWidth + 1); r.checkpoint = label; r.screenshot = r.id + '.png'; await page.screenshot({ path: path.join(out, r.screenshot) }); report.screenshots.push(r.screenshot); },
        });
        assert.equal(await page.evaluate(() => localStorage.getItem('cm-replacement-unrelated')), 'held'); assert(r.screenshot); r.status = 'passed';
      } catch (error) { r.status = 'failed'; r.error = String(error.stack || error); r.actions = error.cmActions; try { await page.screenshot({ path: path.join(out, r.id + '-failure.png') }); } catch {} }
      finally {
        try { await drain('before-context-close'); } catch (error) { r.status = 'failed'; r.drainError = String(error.stack || error); }
        await context.close(); await Promise.all([...reads]);
        const blocked = event => { if (!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(event.text)) return false; try { const u = new URL(event.location.url); return (known.has(u.origin) || u.origin === origin) && r.aborts.some(a => new URL(a.url).href === u.href); } catch { return false; } };
        r.unexpectedConsole = r.console.filter(e => e.type === 'error' && !blocked(e));
        r.undeclaredAborts = r.aborts.filter(a => !known.has(a.origin.replace(/^ws/, 'http')) && a.origin !== origin);
        r.httpErrors = r.responses.filter(a => new URL(a.url).origin === origin && a.status >= 400);
        r.unexpectedFailures = r.requestFailures.filter(q => !r.aborts.some(a => a.url === q.url));
        if (r.pageErrors.length || r.unexpectedConsole.length || r.undeclaredAborts.length || r.httpErrors.length || r.assetErrors.length || r.unexpectedFailures.length || !r.assetBodies.length) r.status = 'failed';
        await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
      }
    }
  } finally { await browser.close(); }
  await checkSource(); assert.deepEqual(await inventory(dist), m.distBefore);
  assert.equal(sha(await fs.readFile(manifestPath)), sha(manifestBytes)); assert.equal(sha(await fs.readFile(path.join(dir, m.bundle))), m.bundleSHA);
  for (const f of Object.values(m.fixtures)) assert.equal(sha(await fs.readFile(path.join(dir, f.file))), f.sha256);
  report.sourceHeld = true; report.distHeld = true; report.fixtureManifestHeld = true; report.engineBundleHeld = true;
  report.status = report.contexts.length === 6 && report.contexts.every(r => r.status === 'passed') && report.screenshots.length === 6 && new Set(report.screenshots).size === 6 ? 'passed' : 'failed';
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); assert.equal(report.status, 'passed');
  console.log('cmReplacementBrowser: six native CM journeys and six photos passed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
