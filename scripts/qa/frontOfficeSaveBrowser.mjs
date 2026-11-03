import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
assert(process.argv.includes('--out') && process.argv.includes('--fixtures'), '--out and --fixtures required');
const BASE = option('--base-url', 'http://127.0.0.1:4173'), ORIGIN = new URL(BASE).origin;
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname), 'Use the completed local App');
const OUT = path.resolve(option('--out')), FIXTURES = path.resolve(option('--fixtures')), DIST = path.resolve(option('--dist', 'dist'));
const KEY = 'front-office-save-v1', NOTICE = 'Franchise progress is not saved on this device.';
const OTHER = 'fo-browser-unrelated', MARKER = 'fo-browser-seeded';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
await fs.mkdir(OUT, { recursive: true });
async function inventory(dir) {
  const rows = [];
  async function walk(folder) { for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) await walk(file);
    else { assert(entry.isFile()); const bytes = await fs.readFile(file); rows.push({ file: path.relative(dir, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: hash(bytes) }); }
  } }
  await walk(dir); return rows.sort((a, b) => compare(a.file, b.file));
}
const files = git(['ls-files', '-z']).split('\0').filter(Boolean).sort(compare);
const sourceMap = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, hash(await fs.readFile(file))])));
const manifest = JSON.parse(await fs.readFile(path.join(FIXTURES, 'manifest.json'), 'utf8'));
assert.equal(manifest.schema, 1); assert.equal(manifest.saveKey, KEY); assert(manifest.sourceHeld && manifest.distHeld);
assert.deepEqual(manifest.sourceBefore, manifest.sourceAfter);
assert.equal(hash(await fs.readFile(path.join(FIXTURES, manifest.bundle))), manifest.bundleSHA);
const sourceBefore = await sourceMap(), distBefore = await inventory(DIST), fixturesBefore = await inventory(FIXTURES);
assert.deepEqual(sourceBefore, manifest.sourceAfter); assert.equal(hash(JSON.stringify(distBefore)), manifest.distDigest);
assert.deepEqual(distBefore, manifest.distBefore); assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '');
const fixture = {};
for (const item of manifest.fixtures) {
  const raw = await fs.readFile(path.join(FIXTURES, item.file), 'utf8'), expectedRaw = await fs.readFile(path.join(FIXTURES, item.expectedFile), 'utf8');
  assert.equal(hash(raw), item.sha256); assert.equal(hash(expectedRaw), item.expectedSHA256);
  assert(item.minimumGrowthCharacters > 0 && item.minimumGrowthBytes > 0);
  fixture[item.kind] = { ...item, raw, expected: JSON.parse(expectedRaw) };
}
assert(fixture.legacy && fixture.modern);
await fs.writeFile(path.join(OUT, 'source-association.json'), JSON.stringify({ source: sourceBefore, distDigest: manifest.distDigest, fixturesDigest: hash(JSON.stringify(fixturesBefore)), serializationProof: manifest.serializationProof }, null, 2) + '\n');
await fs.writeFile(path.join(OUT, 'source-before.json'), JSON.stringify(sourceBefore, null, 2) + '\n');
await fs.writeFile(path.join(OUT, 'dist-before.json'), JSON.stringify(distBefore, null, 2) + '\n');
await fs.writeFile(path.join(OUT, 'fixtures-before.json'), JSON.stringify(fixturesBefore, null, 2) + '\n');
const report = {
  status: 'incomplete', profiles: [], screenshots: [], sourceHeld: false, distHeld: false, fixturesHeld: false,
  scope: 'Four fresh actual compiled-App contexts with explicitly fictional real-engine saves. Native storage quota, native Cut/Retry and cold reload; no natural-career, provider-availability or actual-font claim.',
  inputOverrides: { storage: false, rng: false, clock: false },
  debugger: 'Short caught-exception observation around native Cut and failed Retry only. Every pause resumes in finally. No browser API or product method is replaced.',
  transport: 'Only same-origin GET/HEAD continue. Other HTTP requests, including first-party mutations, abort and are retained. Every console/requestfailure/pageerror event is retained for Root review.'
};
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function storageMap(page) {
  return page.evaluate(async () => {
    const capture = async storage => {
      const result = {};
      for (const key of Object.keys(storage).sort()) {
        const value = storage.getItem(key), encoded = new TextEncoder().encode(value);
        result[key] = { characters: value.length, bytes: encoded.length, sha256: [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))].map(byte => byte.toString(16).padStart(2, '0')).join('') };
      }
      return result;
    };
    return { local: await capture(localStorage), session: await capture(sessionStorage) };
  });
}
function withoutMain(map) { const result = structuredClone(map); delete result.local[KEY]; return result; }
const mainBytes = page => page.evaluate(key => localStorage.getItem(key), KEY);
const warning = page => page.getByRole('alert').filter({ hasText: NOTICE });
async function nativeClick(page, locator, label, scenario) {
  await locator.waitFor({ state: 'visible' }); assert.equal(await locator.count(), 1, label + ' unique control');
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox(); assert(box && box.width > 0 && box.height > 0);
  const viewport = page.viewportSize(); assert(box.x >= -1 && box.x + box.width <= viewport.width + 1);
  scenario.actions.push({ label, method: 'Playwright native locator click', text: (await locator.textContent())?.trim(), box, minimum44: box.width >= 44 && box.height >= 44 });
  await locator.click({ timeout: 15000 }); await idle(page);
}
async function openRoster(page, item, scenario) {
  await nativeClick(page, page.getByRole('button', { name: /\bRoster\b/ }), 'Roster', scenario);
  if (item.kind === 'modern') await nativeClick(page, page.locator('[data-roster-group="' + item.target.pos + '"]'), item.target.pos + ' group', scenario);
  await page.locator('[data-roster-row]').first().waitFor({ state: 'visible' });
}
async function globals(page) {
  return page.evaluate(() => Object.fromEntries([
    ['setItem', Storage.prototype.setItem], ['removeItem', Storage.prototype.removeItem], ['clear', Storage.prototype.clear],
    ['random', Math.random], ['now', Date.now]
  ].map(([name, fn]) => [name, Function.prototype.toString.call(fn)])));
}
async function fillNativeQuota(page, prefix) {
  return page.evaluate(prefix => {
    if (Object.keys(localStorage).some(key => key.startsWith(prefix))) throw new Error('Filler prefix already present');
    const keys = [], refusals = []; let serial = 0;
    for (let size = 65536; size >= 1; size = Math.floor(size / 2)) {
      while (serial < 512) {
        const key = prefix + serial;
        try { localStorage.setItem(key, 'x'.repeat(size)); keys.push(key); serial++; }
        catch (error) { refusals.push({ size, key, name: error.name, message: error.message }); break; }
      }
      if (serial >= 512) throw new Error('Native quota fill exceeded its finite write bound');
    }
    if (!keys.length) throw new Error('No owned filler was written');
    const last = keys[keys.length - 1]; let acceptedAppend = 0, appendRefusal = null;
    for (let i = 0; i < 512; i++) {
      try { localStorage.setItem(last, localStorage.getItem(last) + 'x'); acceptedAppend++; }
      catch (error) { appendRefusal = { key: last, name: error.name, message: error.message }; break; }
    }
    if (!appendRefusal || appendRefusal.name !== 'QuotaExceededError') throw new Error('Native one-character replacement did not reach quota');
    return { prefix, keys, refusals, acceptedAppend, appendRefusal, ownedCharacters: keys.reduce((sum, key) => sum + key.length + localStorage.getItem(key).length, 0) };
  }, prefix);
}
async function removeFiller(page, fill) {
  return page.evaluate(({ prefix, keys }) => {
    for (const key of keys) { if (!key.startsWith(prefix)) throw new Error('Refuse unrelated storage removal'); localStorage.removeItem(key); }
    const remaining = Object.keys(localStorage).filter(key => key.startsWith(prefix));
    if (remaining.length) throw new Error('Owned filler remains'); return { removed: keys.length, remaining };
  }, { prefix: fill.prefix, keys: fill.keys });
}
async function observeCaughtQuota(context, page, scenario) {
  const session = await context.newCDPSession(page), scripts = new Map(), tasks = new Set(), errors = [];
  let phase = 'cut';
  const parsed = event => scripts.set(event.scriptId, event.url);
  const paused = event => {
    const task = (async () => {
      try {
        const frames = event.callFrames.slice(0, 20).map(frame => ({ name: frame.functionName, url: frame.url || scripts.get(frame.location.scriptId) || '', line: frame.location.lineNumber, column: frame.location.columnNumber }));
        scenario.caught.push({ phase, reason: event.reason, className: event.data?.className ?? null, description: event.data?.description ?? '', frames });
      } finally {
        try { await session.send('Debugger.resume'); } catch (error) { errors.push(String(error)); }
      }
    })();
    tasks.add(task); task.finally(() => tasks.delete(task));
  };
  session.on('Debugger.scriptParsed', parsed); session.on('Debugger.paused', paused);
  await session.send('Debugger.enable'); await session.send('Debugger.setPauseOnExceptions', { state: 'all' });
  return {
    phase: value => { phase = value; },
    stop: async () => {
      try { await session.send('Debugger.setPauseOnExceptions', { state: 'none' }); await Promise.all([...tasks]); }
      finally { session.off('Debugger.paused', paused); session.off('Debugger.scriptParsed', parsed); await session.detach(); }
      assert.deepEqual(errors, [], 'Every actual debugger pause resumed');
      scenario.debuggerDisabled = true;
    }
  };
}
function quotaRows(scenario, phase) {
  return scenario.caught.filter(row => row.phase === phase && /QuotaExceededError/.test(row.description + ' ' + row.className)
    && row.description.includes(KEY) && row.frames.some(frame => {
      try { const url = new URL(frame.url); return url.origin === ORIGIN && /\/assets\/(?:FrontOffice|FrontOfficeBoard)[^/]*\.js$/i.test(url.pathname); } catch { return false; }
    }));
}
async function measureWarning(page) {
  return warning(page).locator('p').evaluate(element => {
    const box = element.getBoundingClientRect(), outer = element.parentElement.getBoundingClientRect(), style = getComputedStyle(element);
    const range = document.createRange(); range.selectNodeContents(element);
    const rects = [...range.getClientRects()].map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height }, outer: { x: outer.x, y: outer.y, width: outer.width, height: outer.height },
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      textOverflow: style.textOverflow, lineClamp: style.webkitLineClamp, viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth,
      rects
    };
  });
}
function requireReadable(m) {
  assert(m.box.height > 4 && m.box.width > 0);
  assert(m.scrollWidth <= m.clientWidth + 1 && m.scrollHeight <= m.clientHeight + 1);
  assert.notEqual(m.textOverflow, 'ellipsis'); assert(['none', '0', ''].includes(m.lineClamp));
  assert(m.box.x >= -1 && m.box.x + m.box.width <= m.viewportWidth + 1);
  assert(m.box.y >= -1 && m.box.y + m.box.height <= m.viewportHeight + 1);
  assert(m.documentWidth <= m.viewportWidth + 1);
  assert(m.rects.length > 0 && m.rects.every(rect => rect.x >= m.box.x - 1 && rect.x + rect.width <= m.box.x + m.box.width + 1 && rect.y >= m.box.y - 1 && rect.y + rect.height <= m.box.y + m.box.height + 1));
}
async function clippingControl(page, scenario) {
  const paragraph = warning(page).locator('p'), style = await paragraph.getAttribute('style'), held = await storageMap(page), before = await measureWarning(page);
  requireReadable(before);
  let fault;
  try {
    await paragraph.evaluate(element => { element.style.height = '4px'; element.style.maxHeight = '4px'; element.style.overflow = 'hidden'; });
    await idle(page); fault = await measureWarning(page); assert(fault.box.height <= 4.1 && fault.box.height < before.box.height);
    assert.throws(() => requireReadable(fault), { name: 'AssertionError' });
  } finally {
    await paragraph.evaluate((element, original) => original === null ? element.removeAttribute('style') : element.setAttribute('style', original), style);
    await idle(page);
  }
  assert.equal(await paragraph.getAttribute('style'), style); assert.deepEqual(await storageMap(page), held);
  const restored = await measureWarning(page); requireReadable(restored);
  scenario.clipControl = { before, fault, restored, effective: true, exactInlineStyleRestored: true, allStorageHeld: true };
}
async function photo(page, width, phase, scenario) {
  const filename = width + '-' + phase + '.png'; await page.screenshot({ path: path.join(OUT, filename), fullPage: false });
  const bytes = await fs.readFile(path.join(OUT, filename)); report.screenshots.push({ file: filename, kind: 'normal', width, phase, bytes: bytes.length, sha256: hash(bytes) });
  scenario.photos.push(filename);
}
const browser = await pw.chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 430, 1440]) {
    const item = fixture[width < 430 ? 'legacy' : 'modern'];
    const scenario = { width, height: width < 500 ? 844 : 1000, kind: item.kind, status: 'incomplete', actions: [], caught: [], photos: [], console: [], pageErrors: [], requestFailures: [], blockedRequests: [], continuedRequests: [], cleanupErrors: [] };
    report.profiles.push(scenario);
    const context = await browser.newContext({ viewport: { width, height: scenario.height }, hasTouch: width < 500, reducedMotion: 'reduce', serviceWorkers: 'block' });
    let page, observer = null, fill = null;
    try {
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), row = { method: request.method(), url: request.url(), resourceType: request.resourceType() };
        if (url.origin === ORIGIN && ['GET', 'HEAD'].includes(row.method)) { scenario.continuedRequests.push(row); await route.continue(); }
        else { scenario.blockedRequests.push(row); await route.abort('blockedbyclient'); }
      });
      await context.addInitScript(({ origin, key, raw, other, marker }) => {
        if (location.origin !== origin || sessionStorage.getItem(marker)) return;
        if (localStorage.getItem(key) !== null) throw new Error('Disposable context unexpectedly holds a career');
        localStorage.setItem(key, raw); localStorage.setItem(other, 'held'); sessionStorage.setItem(marker, '1');
      }, { origin: ORIGIN, key: KEY, raw: item.raw, other: OTHER, marker: MARKER });
      page = await context.newPage(); page.setDefaultTimeout(20000);
      page.on('console', event => scenario.console.push({ type: event.type(), text: event.text(), location: event.location() }));
      page.on('pageerror', error => scenario.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
      page.on('requestfailed', request => scenario.requestFailures.push({ method: request.method(), url: request.url(), failure: request.failure(), resourceType: request.resourceType() }));
      await page.goto(ORIGIN + '/front-office', { waitUntil: 'domcontentloaded' });
      scenario.consent = await answerConsent(page);
      await openRoster(page, item, scenario);
      assert.equal(await mainBytes(page), item.raw); assert.equal(await warning(page).count(), 0);
      const nativeBefore = await globals(page); for (const source of Object.values(nativeBefore)) assert(source.includes('[native code]'));
      const initialStorage = await storageMap(page), mainBefore = await mainBytes(page);
      scenario.initial = { roster: item.roster, saveCharacters: mainBefore.length, saveSHA256: hash(mainBefore), visibleRows: await page.locator('[data-roster-row]').count(), globals: nativeBefore, storage: initialStorage };
      if (item.kind === 'modern') assert((await page.locator('[data-over-limit]').textContent()).includes('1 over the limit'));
      fill = await fillNativeQuota(page, '__fo_quota_' + width + '_'); scenario.nativeFiller = fill;
      assert.equal(fill.appendRefusal.name, 'QuotaExceededError'); assert.equal(await mainBytes(page), mainBefore);
      observer = await observeCaughtQuota(context, page, scenario);
      const target = page.locator('[data-roster-row="' + item.target.id + '"]');
      await nativeClick(page, target.getByRole('button', { name: /^Cut,/ }), 'Arm Cut', scenario);
      assert.equal(await mainBytes(page), mainBefore);
      await nativeClick(page, target.getByRole('button', { name: 'Cut him', exact: true }), 'Confirm Cut', scenario);
      await warning(page).waitFor({ state: 'visible' }); assert.equal(await warning(page).count(), 1);
      assert.equal(await page.locator('[data-roster-row="' + item.target.id + '"]').count(), 0);
      assert(quotaRows(scenario, 'cut').length > 0, 'Actual Cut must throw main-key QuotaExceededError from the compiled Board');
      assert.equal(await mainBytes(page), mainBefore);
      scenario.refused = { oldBytesHeld: true, targetGoneFromLiveRoster: true, quotaEvents: quotaRows(scenario, 'cut'), warning: await warning(page).textContent() };
      await warning(page).scrollIntoViewIfNeeded(); await idle(page);
      requireReadable(await measureWarning(page)); await clippingControl(page, scenario);
      await photo(page, width, 'warning', scenario);
      observer.phase('failed-retry');
      await nativeClick(page, warning(page).getByRole('button', { name: 'Retry save', exact: true }), 'Refused Retry save', scenario);
      assert(quotaRows(scenario, 'failed-retry').length > 0, 'Actual failed Retry must throw native quota from the compiled Board');
      assert.equal(await mainBytes(page), mainBefore); assert.equal(await warning(page).count(), 1);
      scenario.failedRetry = { oldBytesHeld: true, warningHeld: true, quotaEvents: quotaRows(scenario, 'failed-retry') };
      await observer.stop(); observer = null;
      scenario.fillerRemoval = await removeFiller(page, fill); fill = null;
      assert.deepEqual(withoutMain(await storageMap(page)), withoutMain(initialStorage));
      assert.equal(await mainBytes(page), mainBefore);
      await nativeClick(page, warning(page).getByRole('button', { name: 'Retry save', exact: true }), 'Accepted Retry save', scenario);
      await page.waitForFunction(({ key, previous }) => localStorage.getItem(key) !== previous, { key: KEY, previous: mainBefore });
      const saved = await mainBytes(page), state = JSON.parse(saved);
      assert.equal(await warning(page).count(), 0);
      assert.deepEqual(state.league, item.expected.league, 'Entire real-engine post-Cut league is saved, no other club or pool changes');
      for (const key of ['myTeam', 'phase', 'titles', 'seasonsPlayed', 'draftClass', 'picksLeft']) assert.deepEqual(state[key], item.expected[key]);
      assert.deepEqual(withoutMain(await storageMap(page)), withoutMain(initialStorage));
      assert(saved.length >= item.expectedCharacters && saved.length > mainBefore.length, 'Actual accepted writer confirms the measured positive-growth lower bound');
      assert.deepEqual(await globals(page), nativeBefore);
      scenario.accepted = { savedSHA256: hash(saved), savedCharacters: saved.length, exactExpectedLeague: true, roster: state.league.teams.KC.players.length, cap: item.afterCap, otherStorageHeld: true, noticeGone: true, globalsHeld: true };
      await page.reload({ waitUntil: 'domcontentloaded' }); await answerConsent(page); await openRoster(page, item, scenario);
      assert.equal(await mainBytes(page), saved); assert.equal(await warning(page).count(), 0);
      assert.equal(await page.locator('[data-roster-row="' + item.target.id + '"]').count(), 0);
      if (item.kind === 'legacy') {
        assert.equal(await page.locator('[data-roster-row]').count(), 6);
        assert((await page.locator('[data-cut-block]').textContent()).includes('minimum of 6'));
      } else assert.equal(await page.locator('[data-over-limit]').count(), 0);
      assert.deepEqual(withoutMain(await storageMap(page)), withoutMain(initialStorage));
      assert.deepEqual(await globals(page), nativeBefore);
      scenario.reloaded = { exactSavedBytesHeld: true, targetStillAbsent: true, roster: state.league.teams.KC.players.length, otherStorageHeld: true, nativeGlobalsHeld: true, visibleRows: await page.locator('[data-roster-row]').count() };
      await photo(page, width, 'reloaded', scenario);
      assert.deepEqual(scenario.pageErrors, []);
      scenario.status = 'passed';
    } catch (error) {
      scenario.status = 'failed'; scenario.error = { name: error.name, message: error.message, stack: error.stack };
      if (page) {
        try { const filename = width + '-failure.png'; await page.screenshot({ path: path.join(OUT, filename), fullPage: true }); const bytes = await fs.readFile(path.join(OUT, filename)); report.screenshots.push({ file: filename, kind: 'diagnostic', width, bytes: bytes.length, sha256: hash(bytes) }); } catch (capture) { scenario.cleanupErrors.push(String(capture)); }
        try { scenario.failureState = { url: page.url(), mainSHA256: hash(await mainBytes(page) ?? ''), warning: await warning(page).allTextContents(), storage: await storageMap(page) }; } catch (capture) { scenario.cleanupErrors.push(String(capture)); }
      }
    } finally {
      if (observer) { try { await observer.stop(); } catch (error) { scenario.cleanupErrors.push(String(error)); } }
      if (fill && page) { try { scenario.fillerCleanup = await removeFiller(page, fill); } catch (error) { scenario.cleanupErrors.push(String(error)); } }
      try { await context.close(); } catch (error) { scenario.cleanupErrors.push(String(error)); }
      if (scenario.cleanupErrors.length) scenario.status = 'failed';
      await fs.writeFile(path.join(OUT, width + '-report.json'), JSON.stringify(scenario, null, 2) + '\n');
    }
  }
} finally {
  await browser.close();
  const sourceAfter = await sourceMap(), distAfter = await inventory(DIST), fixturesAfter = await inventory(FIXTURES);
  report.sourceHeld = JSON.stringify(sourceAfter) === JSON.stringify(sourceBefore);
  report.distHeld = JSON.stringify(distAfter) === JSON.stringify(distBefore); report.fixturesHeld = JSON.stringify(fixturesAfter) === JSON.stringify(fixturesBefore);
  report.sourceStatusHeld = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
  report.normalPhotos = report.screenshots.filter(row => row.kind === 'normal').length;
  report.status = report.profiles.length === 4 && report.profiles.every(row => row.status === 'passed') && report.normalPhotos === 8
    && report.sourceHeld && report.distHeld && report.fixturesHeld && report.sourceStatusHeld ? 'passed' : 'failed';
  await fs.writeFile(path.join(OUT, 'source-after.json'), JSON.stringify(sourceAfter, null, 2) + '\n');
  await fs.writeFile(path.join(OUT, 'dist-after.json'), JSON.stringify(distAfter, null, 2) + '\n');
  await fs.writeFile(path.join(OUT, 'fixtures-after.json'), JSON.stringify(fixturesAfter, null, 2) + '\n');
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
assert.equal(report.status, 'passed', 'All four actual native-quota App journeys and closures must pass');
console.log('FO App: four fresh widths, real main-key quota refusals, failed/accepted native Retry and reload, four effective text-clip checks, eight normal photos. Console and refused HTTP requests remain retained for review.');
