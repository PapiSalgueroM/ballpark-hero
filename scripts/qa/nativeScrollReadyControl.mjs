import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const root = process.cwd();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const marker = 'NATIVE_SCROLL_READY_PENDING_NAVIGATION';
if (process.argv[2] === '--worker') {
  const helper = path.resolve(process.argv[3]), out = path.resolve(process.argv[4]);
  assert.equal(hash(fs.readFileSync(helper)), process.argv[5], 'Actual helper copy is pinned');
  const { waitForScrollIdle } = await import(pathToFileURL(helper).href);
  assert.equal(typeof waitForScrollIdle, 'function');
  const { default: pw } = await import(pathToFileURL(path.join(root, 'scripts/lib/playwrightLoader.mjs')).href);
  const browser = await pw.chromium.launch({ headless: true });
  const errors = [], requests = [], consoleErrors = [];
  let result;
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await context.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
    await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}main{height:6000px}</style><main></main>');
    const scheduled = await page.evaluate(() => {
      const state = { frames: 0, started: false, events: [] };
      window.__scrollReadyControl = state;
      addEventListener('scroll', () => state.events.push({ time: performance.now(), x: scrollX, y: scrollY }), { passive: true });
      requestAnimationFrame(() => {
        state.frames++;
        requestAnimationFrame(() => {
          state.frames++; state.started = true;
          scrollTo({ left: 0, top: 600, behavior: 'smooth' });
        });
      });
      return { x: scrollX, y: scrollY, height: document.documentElement.scrollHeight };
    });
    assert.equal(scheduled.x, 0); assert.equal(scheduled.y, 0); assert(scheduled.height >= 6000);
    let helperError = null;
    try { await waitForScrollIdle(page); } catch (error) { helperError = String(error); }
    // This is the result under test. Later verification never substitutes for this snapshot.
    const sample = await page.evaluate(() => ({ x: scrollX, y: scrollY, time: performance.now() }));
    let proofError = null;
    try {
      await page.waitForFunction(() => window.__scrollReadyControl.started && scrollY === 600, null, { timeout: 3000 });
    } catch (error) { proofError = String(error); }
    const final = await page.evaluate(() => ({ x: scrollX, y: scrollY, ...window.__scrollReadyControl }));
    result = { scheduled, sample, final, helperError, proofError, errors, requests, consoleErrors,
      helperSHA256: hash(fs.readFileSync(helper)), scope: 'Synthetic blank scene, actual two-RAF native smooth scroll. The assertion uses only the snapshot taken immediately after the helper.' };
    fs.writeFileSync(path.join(out, 'observations.json'), JSON.stringify(result, null, 2) + '\n');
    assert.equal(helperError, null, 'SETUP helper completed without rejecting');
    assert.equal(proofError, null, 'SETUP actual queued native scroll reached its destination');
    assert.equal(final.frames, 2); assert.equal(final.started, true);
    assert.equal(final.x, 0); assert.equal(final.y, 600);
    assert(final.events.some(event => event.y > 0), 'SETUP actual native scroll changed the page');
    assert.deepEqual(errors, []); assert.deepEqual(requests, []); assert.deepEqual(consoleErrors, []);
    assert.equal(sample.x, 0);
    assert.equal(sample.y, 600, marker);
    await context.close();
  } finally {
    await browser.close();
    if (result) fs.writeFileSync(path.join(out, 'observations.json'), JSON.stringify(result, null, 2) + '\n');
  }
} else {
  const out = path.resolve(process.argv[2] || ''), helper = path.resolve(process.argv[3] || 'scripts/qa/nativeScrollReady.mjs');
  assert(process.argv[2] && out !== root && !out.startsWith(root + path.sep), 'Fresh evidence outside source');
  assert(!fs.existsSync(out), 'No older control evidence');
  const source = fs.readFileSync(helper);
  assert.equal(blob(source), '671f460aa088d42b44c435a03594cf26695d6e09');
  assert.equal(hash(source), '57f104c38128665904c4df8216f6f3c57a3674c27d4f61d633e970c68922fc37');
  const git = (...args) => execFileSync('git', args, { maxBuffer: 12 * 1024 * 1024 });
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
  assert.equal(process.env.SIM_NETWORK, 'offline');
  assert(process.env.NODE_OPTIONS?.includes(path.join(root, 'scripts/lib/offlineTransport.cjs')), 'Existing Node offline preload');
  fs.mkdirSync(out, { recursive: true });
  const noop = Buffer.from('export async function waitForScrollIdle(page) {\n  void page;\n}\n');
  assert(!noop.equals(source), 'Physical no-op copy changes source');
  const copies = [ ['healthy', source, 0], ['no-op', noop, 1], ['restored', Buffer.from(source), 0] ];
  const results = [];
  for (const [name, bytes, expectedExit] of copies) {
    const dir = path.join(out, name); fs.mkdirSync(dir);
    const copy = path.join(dir, 'nativeScrollReady.mjs'), receipt = path.join(dir, 'transport.log');
    fs.writeFileSync(copy, bytes); fs.writeFileSync(receipt, '');
    assert.equal(hash(fs.readFileSync(copy)), hash(bytes));
    const p = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--worker', copy, dir, hash(bytes)], {
      env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
    });
    const log = (p.stdout || '') + '\n' + (p.stderr || '');
    fs.writeFileSync(path.join(dir, 'worker.log'), log);
    fs.writeFileSync(path.join(dir, 'native-exit.json'), JSON.stringify({ status: p.status, signal: p.signal, error: p.error ? String(p.error) : null }) + '\n');
    assert(!p.error && p.signal === null, name + ' native completion');
    assert.equal(p.status, expectedExit, name + ' native exit');
    assert.equal(fs.statSync(receipt).size, 0, name + ' empty Node offline receipt');
    const value = JSON.parse(fs.readFileSync(path.join(dir, 'observations.json'), 'utf8'));
    assert.equal(value.helperSHA256, hash(bytes));
    assert.equal(value.helperError, null); assert.equal(value.proofError, null);
    assert.equal(value.final.frames, 2); assert.equal(value.final.y, 600);
    assert.deepEqual(value.errors, []); assert.deepEqual(value.requests, []); assert.deepEqual(value.consoleErrors, []);
    if (name === 'no-op') {
      assert(log.includes('AssertionError') && log.includes(marker), 'No-op must fail the actual observed-Y assertion');
      assert(!/TypeError|SyntaxError|ReferenceError|Cannot find module|SETUP/.test(log), 'No setup error as control credit');
      assert.notEqual(value.sample.y, 600, 'Physical no-op changed the observed result');
    } else assert.equal(value.sample.y, 600, name + ' real readiness destination');
    assert(fs.readFileSync(helper).equals(source), 'Original helper never changes');
    results.push({ name, nativeExit: p.status, helperGit: blob(bytes), helperSHA256: hash(bytes),
      observedY: value.sample.y, verifiedLaterY: value.final.y, freshProcessAndContext: true });
  }
  assert(fs.readFileSync(helper).equals(source));
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), ''); git('diff', '--exit-code', 'HEAD');
  const admission = { status: 'qualified', results, sourceHeld: true, noSkippedCredit: true,
    scope: 'Only the prior-navigation readiness precondition on a synthetic scene. No proof of the original public scroll failures being caused or fixed, and no release/browser-journey credit.' };
  fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(admission, null, 2) + '\n');
  console.log(JSON.stringify(admission));
}
