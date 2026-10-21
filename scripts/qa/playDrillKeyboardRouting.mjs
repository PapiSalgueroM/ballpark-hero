import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODE = process.argv[2];
const OUT = process.env.DRILL_KEYBOARD_OUT;
assert(['baseline', 'fixed'].includes(MODE), 'Declare baseline or fixed');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'CI offline only');
assert((process.env.NODE_OPTIONS ?? '').includes('offlineTransport.cjs'), 'Inherited offline preload required');
assert(OUT && path.isAbsolute(OUT), 'Absolute DRILL_KEYBOARD_OUT required');
const DIST = path.join(OUT, 'fixture-dist'), BROWSER_OUT = path.join(OUT, 'browser');
assert(fs.statSync(DIST).isDirectory() && !fs.existsSync(BROWSER_OUT), 'Fresh browser output and actual fixture build required');
fs.mkdirSync(BROWSER_OUT);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => sha(fs.readFileSync(file));
const save = (file, value) => { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return receipt(file); };
const receipt = file => ({ file: path.relative(BROWSER_OUT, file).replaceAll(path.sep, '/'), bytes: fs.statSync(file).size, sha256: hashFile(file) });
const inventory = root => {
  const found = {};
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else { assert(entry.isFile(), 'Only actual regular files'); found[path.relative(root, full).replaceAll(path.sep, '/')] = { bytes: fs.statSync(full).size, sha256: hashFile(full) }; }
  } };
  walk(root); return found;
};
const sourceInventory = () => Object.fromEntries(execFileSync('git', ['ls-files', '-z'], { cwd: SOURCE }).toString().split('\0').filter(Boolean).sort().map(file => [file, { bytes: fs.statSync(path.join(SOURCE, file)).size, sha256: hashFile(path.join(SOURCE, file)) }]));
const original = '42591173de244f05f7e21166035ee6b7fe2d04ac78a8dc54c69bbd817038a99e';
const proofFile = path.join(OUT, 'proof.json'), proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
assert.equal(proof.mode, MODE); assert.equal(proof.original, original);
assert.equal(proof.status, MODE === 'baseline' ? 'diagnosed-original-only' : 'passed', 'Actual unit proof completed in this phase');
assert.equal(proof.temporaryControlsRemoved, true);
const candidate = proof.fixed;
assert(/^[a-f0-9]{64}$/.test(candidate ?? '') && candidate !== original, 'Exact one-span candidate bound by the actual unit proof');
assert.equal(proof.source, MODE === 'baseline' ? original : candidate);
assert.equal(hashFile(path.join(SOURCE, 'src/components/soccer-career/DrillBoard.tsx')), MODE === 'baseline' ? original : candidate, 'Exact actual drill source');
assert.equal(hashFile(path.join(SOURCE, 'src/components/soccer-career/TrainingPanel.tsx')), '725e95d14cee44b459fe5c19662ad8b1dc69364d69289b46527081a1c0ab2e61', 'Whole actual TrainingPanel held');
const sourceBefore = sourceInventory(), distBefore = inventory(DIST);
save(path.join(BROWSER_OUT, 'source-before.json'), sourceBefore);
save(path.join(BROWSER_OUT, 'dist-before.json'), distBefore);
const require = createRequire(import.meta.url), packageFile = require.resolve('playwright/package.json');
assert.equal(JSON.parse(fs.readFileSync(packageFile, 'utf8')).version, '1.64.0', 'Frozen Playwright');
const executable = process.env.CHROME_PATH || pw.chromium.executablePath();
assert(fs.statSync(executable).isFile(), 'Actual Chromium executable');
const tools = { node: process.version, nodeBody: hashFile(process.execPath), playwright: '1.64.0', packageBody: hashFile(packageFile), executable, executableBody: hashFile(executable) };
const kinds = [{ kind: 'wallshot', name: 'Wall Shot' }, { kind: 'tackle', name: 'Tackle' }, { kind: 'gloves', name: 'Glove Save' }];
const cases = [];
for (const kind of kinds) for (const phase of ['ready', 'playing']) for (const key of ['Enter', 'Space']) for (const target of ['close', 'back'])
  cases.push({ id: kind.kind + '-' + phase + '-' + key.toLowerCase() + '-' + target, ...kind, type: 'navigation', phase, key, target, fault: phase === 'ready' || key === 'Space' });
for (const key of ['ArrowLeft', 'ArrowRight']) cases.push({ id: 'wallshot-power-' + key.toLowerCase(), ...kinds[0], type: 'range', phase: 'playing', key, fault: true });
for (const kind of kinds) for (const key of ['Enter', 'Space']) cases.push({ id: kind.kind + '-native-start-' + key.toLowerCase(), ...kind, type: 'native-start', phase: 'ready', key, fault: false });
for (const kind of kinds) for (const key of ['Enter', 'Space']) cases.push({ id: kind.kind + '-body-ready-' + key.toLowerCase(), ...kind, type: 'body-ready', phase: 'ready', key, fault: false });
for (const kind of kinds) cases.push({ id: kind.kind + '-body-playing-space', ...kind, type: 'body-playing', phase: 'playing', key: 'Space', fault: false });
assert.equal(cases.length, 41); assert.equal(cases.filter(row => row.fault).length, 20);
const report = {
  version: 1, mode: MODE, status: 'running', qualified: false, productQualified: false,
  scope: 'Standalone built actual TrainingPanel and DrillBoard component fixture; no production route, assistive technology or geometry qualification.',
  expectedFaults: MODE === 'baseline' ? 20 : 0, observedFaults: 0, healthy: 0,
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SOURCE }).toString().trim(),
  sourceBefore: receipt(path.join(BROWSER_OUT, 'source-before.json')), distBefore: receipt(path.join(BROWSER_OUT, 'dist-before.json')),
  tools, unitProof: { fileFromOut: 'proof.json', bytes: fs.statSync(proofFile).size, sha256: hashFile(proofFile) },
  cases: [], errors: [], limits: ['Declared manual Date/performance/RAF/timer clock; playing elapsed is exactly200ms.', 'Native Start and action Space healthy observations preserve game behavior while original/fixed defaultPrevented and trusted-click evidence legitimately differ.', 'Behavior projections explicitly retain phase, input, callbacks, stores, controls, RNG and clock; full DOM/focus/events/pending timers remain in raw observations.', 'No scoring, rewards, full game, actual route, physical device, AT, release or live claim.'],
};
const port = Number(process.env.DRILL_KEYBOARD_PORT || 4186);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const BASE = 'http://127.0.0.1:' + port;
const serverOut = fs.openSync(path.join(BROWSER_OUT, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(BROWSER_OUT, 'server.stderr'), 'wx');
let server, browser;
const expectedStores = { local: { 'fixture-drill-local': 'unchanged' }, session: { 'fixture-drill-session': 'unchanged' } };
const read = page => page.evaluate(() => window.__DRILL_KEYBOARD__.read());
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(null))));
const invariant = state => {
  assert.equal(state.inputJSON, state.careerJSON, 'Frozen full career held');
  assert.equal(state.frozenInput, true); assert.equal(state.parentMounts, 1); assert.equal(state.parentUnmounts, 0);
  assert.deepEqual(state.local, expectedStores.local); assert.deepEqual(state.session, expectedStores.session);
  assert.deepEqual(state.draws, []); assert.deepEqual(state.requests, []);
  assert.deepEqual(state.callbacks.complete, []); assert.deepEqual(state.callbacks.drill, []);
};
const tabTo = async (page, locator) => {
  assert.equal(await locator.count(), 1, 'Exact native focus target');
  for (let i = 0; i < 24; i++) {
    if (await locator.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Native Tab did not reach requested control');
};
const clickExact = (page, name) => page.getByRole('button', { name, exact: true }).click();
const behavior = state => Object.fromEntries(['kind', 'position', 'inputJSON', 'careerJSON', 'frozenInput', 'parentMounts', 'parentUnmounts', 'panelPresent', 'screen', 'phase', 'intro', 'power', 'aim', 'local', 'session', 'callbacks', 'draws', 'requests', 'clock', 'clockSteps'].map(key => [key, state[key]]));
const attachIO = async (context, row, dir, pending) => {
  await context.addInitScript(expectedOrigin => { if (location.origin !== expectedOrigin) return; localStorage.setItem('fixture-drill-local', 'unchanged'); sessionStorage.setItem('fixture-drill-session', 'unchanged'); }, BASE);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    row.requests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType() });
    if (url.origin !== BASE) { row.external.push({ url: request.url(), action: 'abort' }); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') row.errors.push('Console error: ' + message.text()); });
  page.on('requestfailed', request => row.failures.push({ url: request.url(), error: request.failure()?.errorText ?? null }));
  page.on('response', response => { pending.push((async () => {
    const url = new URL(response.url()); assert.equal(url.origin, BASE);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    assert(rel && !rel.split('/').includes('..') && distBefore[rel], 'Each response belongs to actual fixture build');
    assert.equal(response.status(), 200, 'Actual resource response status');
    const body = await response.body(), gzip = zlib.gzipSync(body, { level: 9 }), index = row.responses.length;
    assert.equal(sha(body), distBefore[rel].sha256, 'Actual response body equals physical fixture member');
    const bodyFile = path.join(dir, 'response-' + index + '.body'), gzipFile = path.join(dir, 'response-' + index + '.gz');
    fs.writeFileSync(bodyFile, body, { flag: 'wx' }); fs.writeFileSync(gzipFile, gzip, { flag: 'wx' });
    row.responses.push({ url: response.url(), file: rel, status: response.status(), rawBytes: body.length, gzipBytes: gzip.length, diskSha256: distBefore[rel].sha256, bodySha256: sha(body), bodyReceipt: receipt(bodyFile), gzipReceipt: receipt(gzipFile) });
  })().catch(error => { row.errors.push('Response retention: ' + String(error?.stack ?? error)); })); });
  return page;
};
const openReady = async (page, spec) => {
  await page.goto(BASE + '/drillKeyboard.html?kind=' + spec.kind, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__DRILL_KEYBOARD__ && window.__DRILL_KEYBOARD__.read().parentMounts === 1);
  await page.getByRole('button', { name: new RegExp(spec.name + '.*NEW') }).click();
  await clickExact(page, "Today's ten");
  await settle(page);
  const state = await read(page); invariant(state); assert.equal(state.phase, 'ready');
  assert.equal(state.active.tag, 'BODY', 'Removed native button leaves actual body focus');
  return state;
};
const playing = async page => {
  await clickExact(page, 'Start');
  await page.evaluate(() => window.__DRILL_KEYBOARD_CLOCK__.advance(200));
  await settle(page);
  const state = await read(page); invariant(state); assert.equal(state.phase, 'playing'); assert.equal(state.active.tag, 'BODY');
  return state;
};
const ioHeld = row => {
  assert.deepEqual(row.external, []); assert.deepEqual(row.failures, []); assert.deepEqual(row.errors, []);
  assert(row.responses.length > 0 && row.requests.length === row.responses.length, 'Every actual requested resource has a physical response body');
};
const actionSubcheck = async (spec, keyName, parent) => {
  const dir = path.join(parent, 'action-' + keyName.toLowerCase()); fs.mkdirSync(dir);
  const row = { kind: spec.kind, key: keyName, status: 'running', observations: [], requests: [], responses: [], failures: [], external: [], errors: [] };
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' }), pending = [];
  try {
    const page = await attachIO(context, row, dir, pending);
    row.observations.push({ label: 'ready', state: await openReady(page, spec) });
    row.observations.push({ label: 'playing', state: await playing(page) });
    const name = { wallshot: 'Shoot now', tackle: 'Go in at the marker', gloves: 'Dive now' }[spec.kind];
    await tabTo(page, page.getByRole('button', { name, exact: true }));
    const before = await read(page); invariant(before); row.observations.push({ label: 'before-key', state: before });
    await page.keyboard.press(keyName); await settle(page);
    const after = await read(page); invariant(after); row.observations.push({ label: 'after-key', state: after });
    const events = after.events.slice(before.events.length);
    const key = events.find(event => event.type === 'keydown' && event.key === (keyName === 'Space' ? ' ' : keyName));
    const clicks = events.filter(event => event.type === 'click');
    assert(key?.trusted && typeof key.defaultPrevented === 'boolean' && clicks.every(event => event.trusted), 'Actual native action key and click evidence');
    const intercepted = MODE === 'baseline' && keyName === 'Space';
    assert.equal(key.defaultPrevented, intercepted); assert.equal(clicks.length, intercepted ? 0 : 1);
    assert(after.panelPresent && after.phase === 'flying' && after.callbacks.close.length === 0, 'Native action resolves one real attempt');
    assert.equal(after.events.filter(event => event.type === 'keydown' && event.key === key.key).length - before.events.filter(event => event.type === 'keydown' && event.key === key.key).length, 1);
    row.nativeKey = key; row.targetClicks = clicks; row.behavior = { before: behavior(before), after: behavior(after) };
    await Promise.all(pending); ioHeld(row); row.status = 'passed';
  } catch (error) { row.status = 'failed'; row.errors.push(String(error?.stack ?? error)); }
  finally {
    try { await context.close(); await Promise.all(pending); ioHeld(row); } catch (error) { row.status = 'failed'; row.errors.push('Final action holds: ' + error); }
    row.rawReceipt = save(path.join(dir, 'raw.json'), row);
  }
  return { key: keyName, status: row.status, rawReceipt: row.rawReceipt, behavior: row.behavior ?? null };
};
try {
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: SOURCE, env: { ...process.env, SIM_OFFLINE_RECEIPT: path.join(BROWSER_OUT, 'server.transport') }, stdio: ['ignore', serverOut, serverErr] });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    assert(server.exitCode === null, 'Fixture server stayed alive');
    try { const response = await fetch(BASE + '/drillKeyboard.html'); if (response.status === 200 && sha(Buffer.from(await response.arrayBuffer())) === distBefore['drillKeyboard.html'].sha256) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert(ready, 'Actual fixture server readiness and body');
  browser = await pw.chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  report.chromium = browser.version();
  for (const spec of cases) {
    const dir = path.join(BROWSER_OUT, spec.id); fs.mkdirSync(dir);
    const row = { ...spec, status: 'running', observations: [], nativeKey: null, targetClicks: null, passed: false, faultObserved: false, requests: [], responses: [], failures: [], external: [], errors: [] };
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
    const pending = [];
    let page;
    try {
      page = await attachIO(context, row, dir, pending);
      let state = await openReady(page, spec);
      row.observations.push({ label: 'ready', state });
      if (spec.phase === 'playing') {
        state = await playing(page);
        row.observations.push({ label: 'playing', state });
      }
      let target;
      if (spec.type === 'navigation') target = page.getByRole('button', { name: spec.target === 'close' ? 'Close' : '‹ ' + spec.name, exact: true });
      if (spec.type === 'range') target = page.getByRole('slider', { name: 'How hard to hit it', exact: true });
      if (spec.type === 'native-start') target = page.getByRole('button', { name: 'Start', exact: true });
      if (target) await tabTo(page, target);
      const before = await read(page); invariant(before);
      if (!target) assert.equal(before.active.tag, 'BODY', 'Actual body receives the declared field shortcut');
      row.observations.push({ label: 'before-key', state: before });
      await page.keyboard.press(spec.key);
      await settle(page);
      const after = await read(page); invariant(after); row.observations.push({ label: 'after-key', state: after });
      const newEvents = after.events.slice(before.events.length);
      const key = newEvents.find(event => event.type === 'keydown' && event.key === (spec.key === 'Space' ? ' ' : spec.key));
      assert(key && key.trusted && typeof key.defaultPrevented === 'boolean', 'Actual trusted key and post-bubble defaultPrevented');
      row.nativeKey = key;
      const clicks = newEvents.filter(event => event.type === 'click');
      assert(clicks.every(event => event.trusted), 'Every observed activation is native');
      row.targetClicks = clicks;
      if (spec.type === 'navigation') {
        const closed = !after.panelPresent && after.callbacks.close.length === 1;
        const back = after.panelPresent && after.phase === null && after.intro && after.callbacks.close.length === 0;
        row.passed = (spec.target === 'close' ? closed : back) && !key.defaultPrevented && clicks.length === 1;
        row.faultObserved = after.panelPresent && after.callbacks.close.length === 0 && key.defaultPrevented && clicks.length === 0 && after.phase === (spec.phase === 'ready' ? 'playing' : 'flying');
      } else if (spec.type === 'range') {
        assert.equal(before.power, 0.65); assert(before.aim && before.aim.x === 180 && Math.abs(before.aim.y - 57.2) < 1e-9, 'Actual unchanged initial aim');
        const direction = spec.key === 'ArrowLeft' ? -1 : 1;
        row.passed = Math.abs(after.power - (0.65 + direction * 0.05)) < 1e-9 && JSON.stringify(after.aim) === JSON.stringify(before.aim) && !key.defaultPrevented;
        row.faultObserved = after.power === before.power && after.aim && Math.abs(after.aim.x - (before.aim.x + direction * 7.2)) < 1e-9 && after.aim.y === before.aim.y && key.defaultPrevented;
      } else {
        row.passed = after.panelPresent && after.phase === (spec.type === 'body-playing' ? 'flying' : 'playing') && after.callbacks.close.length === 0;
        if (spec.type.startsWith('body-')) row.passed &&= key.defaultPrevented && clicks.length === 0;
        else row.passed &&= MODE === 'baseline' ? key.defaultPrevented && clicks.length === 0 : !key.defaultPrevented && clicks.length === 1;
      }
      row.behavior = { before: behavior(before), after: behavior(after) };
      if (spec.type === 'body-playing') {
        row.actionSubchecks = [];
        for (const keyName of ['Enter', 'Space']) row.actionSubchecks.push(await actionSubcheck(spec, keyName, dir));
        assert(row.actionSubchecks.every(subcheck => subcheck.status === 'passed'), 'Both native action-button subchecks stay healthy');
      }
      await Promise.all(pending);
      ioHeld(row);
      if (MODE === 'baseline' && spec.fault) assert(row.faultObserved && !row.passed, 'DRILL_KEYBOARD_NATIVE_ROUTING_FAULT: ' + spec.id);
      else assert(row.passed && !row.faultObserved, 'DRILL_KEYBOARD_NATIVE_HEALTHY: ' + spec.id);
      row.status = 'passed';
    } catch (error) { row.status = 'failed'; row.errors.push(String(error?.stack ?? error)); }
    finally {
      try { await context.close(); } catch (error) { row.status = 'failed'; row.errors.push('Context cleanup: ' + error); }
      for (const result of await Promise.allSettled(pending)) if (result.status === 'rejected') { row.status = 'failed'; row.errors.push('Response retention: ' + result.reason); }
      try { ioHeld(row); } catch (error) { row.status = 'failed'; row.errors.push('Final resource holds: ' + error); }
      row.rawReceipt = save(path.join(dir, 'raw.json'), row);
      report.cases.push({ ...spec, status: row.status, passed: row.passed, faultObserved: row.faultObserved, rawReceipt: row.rawReceipt });
    }
  }
  report.observedFaults = report.cases.filter(row => row.faultObserved).length;
  report.healthy = report.cases.filter(row => row.passed).length;
  assert.equal(report.cases.length, 41); assert(report.cases.every(row => row.status === 'passed'));
  assert.equal(report.observedFaults, report.expectedFaults); assert.equal(report.healthy, MODE === 'baseline' ? 21 : 41);
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.errors.push(String(error?.stack ?? error)); }
finally {
  try { if (browser) await browser.close(); } catch (error) { report.status = 'failed'; report.qualified = false; report.errors.push('Browser cleanup: ' + error); }
  if (server) {
    server.kill('SIGTERM');
    await new Promise(resolve => { if (server.exitCode !== null || server.signalCode !== null) resolve(); else server.once('close', resolve); });
    report.server = { port, exitCode: server.exitCode, signal: server.signalCode, stdout: receipt(path.join(BROWSER_OUT, 'server.stdout')), stderr: receipt(path.join(BROWSER_OUT, 'server.stderr')) };
  }
  fs.closeSync(serverOut); fs.closeSync(serverErr);
  try {
    const sourceAfter = sourceInventory(), distAfter = inventory(DIST);
    report.sourceAfter = save(path.join(BROWSER_OUT, 'source-after.json'), sourceAfter);
    report.distAfter = save(path.join(BROWSER_OUT, 'dist-after.json'), distAfter);
    assert.deepEqual(sourceAfter, sourceBefore, 'Whole tracked source held'); assert.deepEqual(distAfter, distBefore, 'Whole physical fixture build held');
    assert.equal(hashFile(process.execPath), tools.nodeBody); assert.equal(hashFile(packageFile), tools.packageBody); assert.equal(hashFile(executable), tools.executableBody);
    report.sourceHeld = true; report.distHeld = true; report.toolsHeld = true;
  } catch (error) { report.status = 'failed'; report.qualified = false; report.errors.push('Final holds: ' + error); }
  if (report.status !== 'passed') report.qualified = false;
  save(path.join(BROWSER_OUT, 'report.json'), report);
}
console.log('Drill keyboard standalone fixture: ' + report.status + ', ' + report.observedFaults + ' observed original faults, ' + report.healthy + ' healthy, mode ' + MODE + '. No production-route or AT claim.');
if (!report.qualified) process.exitCode = 1;
