import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const BASE = option('--base-url', process.env.BASE || 'http://127.0.0.1:4173');
assert.ok(process.argv.includes('--out') && process.argv.includes('--fixtures'), '--out and --fixtures are required');
const OUT = path.resolve(option('--out')), FIXTURES = path.resolve(option('--fixtures'));
const ORIGIN = new URL(BASE).origin;
assert.equal(BASE, 'https://douknowball.com', 'Use only the published public origin');
assert.match(process.env.PUBLIC_RELEASE_SHA || '', /^[a-f0-9]{40}$/, 'Bind the published release before the public audit');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
await fs.mkdir(OUT, { recursive: true });
const fixtures = JSON.parse(await fs.readFile(path.join(FIXTURES, 'manifest.json'), 'utf8'));
assert.deepEqual(fixtures.cases.map(row => row.key), ['normal', 'unsupported']);
assert.equal(fixtures.saveKey, 'dukb-club-manager-save');
assert.deepEqual(fixtures.sourceBefore, fixtures.sourceAfter);
for (const [file, digest] of Object.entries(fixtures.sourceAfter)) assert.equal(hash(await fs.readFile(file)), digest, 'Actual App source association: ' + file);
assert.equal(hash(await fs.readFile(path.join(FIXTURES, fixtures.bundle))), fixtures.bundleSha256);
const { cm, tactics } = await import(pathToFileURL(path.join(FIXTURES, fixtures.bundle)).href);
const KEY = fixtures.saveKey, NAME = 'My pressure philosophy 1';
const MIX = { press: 1, tempo: -1, width: 1, line: 1 };
assert.equal(NAME.length, 24);
async function distSnapshot() {
  const rows = [];
  async function walk(relative = '') {
    for (const entry of (await fs.readdir(path.join('dist', relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert.ok(entry.isFile()); const bytes = await fs.readFile(path.join('dist', file)); rows.push({ file, bytes: bytes.length, sha256: hash(bytes) }); }
    }
  }
  await walk(); assert.ok(rows.length > 100);
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}
const distBefore = await distSnapshot();
await fs.writeFile(path.join(OUT, 'dist-before.json'), JSON.stringify(distBefore, null, 2) + '\n');
const report = {
  status: 'incomplete', scope: 'Actual public App in disposable guest contexts with explicit fictional careers. No real user save, account or natural progression.',
  publicRelease: process.env.PUBLIC_RELEASE_SHA,
  referenceDistMeaning: 'Local source and dist holds protect the retained fixture oracle. They do not assert byte identity of downloaded public JavaScript.',
  fonts: 'Fresh guest, fallback fonts. External HTTP requests are aborted and retained. No actual-font pixel claim.',
  browserClockOrRngOverrides: false, contexts: [], screenshots: [], sourceBefore: fixtures.sourceAfter, distDigestBefore: hash(JSON.stringify(distBefore)),
  controlContract: 'The retained local focused qualification covered the geometry-carrier source fault. This public audit reruns actual stage-input witnesses without fresh engine-control credit.',
};
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
const raw = page => page.evaluate(key => localStorage.getItem(key), KEY);
const read = async page => JSON.parse(await raw(page));
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const customPoints = state => state.customShape?.points ?? cm.FORMATIONS[state.formationIndex].slots.map(({ x, y }) => ({ x, y }));
const picked = state => ({
  formationIndex: state.formationIndex, mentality: state.mentality, xiIds: state.xiIds,
  xiDuties: state.xiDuties ?? null, setPieces: state.setPieces ?? null, shootoutOrder: state.shootoutOrder ?? [],
  instructions: cm.instructionsOf(state), customShape: state.customShape ?? null,
});
async function waitSaved(page, before) {
  await page.waitForFunction(({ key, previous }) => localStorage.getItem(key) !== previous, { key: KEY, previous: before });
  await idle(page);
  return read(page);
}
async function geometry(page, selector) {
  return page.locator(selector).evaluateAll(nodes => ({
    viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
    rows: nodes.map(node => {
      const b = node.getBoundingClientRect(), css = getComputedStyle(node);
      return { text: node.innerText, x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, textOverflow: css.textOverflow, lineClamp: css.webkitLineClamp };
    }),
  }));
}
function fits(sample, visible = false) {
  return sample.documentWidth <= sample.clientWidth + 1 && sample.rows.length > 0 && sample.rows.every(row =>
    row.width > 0 && row.height > 0 && row.x >= -1 && row.right <= sample.viewport.width + 1
    && (!visible || row.y >= -1 && row.bottom <= sample.viewport.height + 1));
}
async function screenshot(page, row, name, target) {
  if (target) await page.locator(target).scrollIntoViewIfNeeded();
  await idle(page);
  row[name + 'Geometry'] = await geometry(page, target || '[data-cm-pitch]');
  assert.ok(fits(row[name + 'Geometry']), 'Actual target must fit the viewport width');
  const file = row.width + '-' + name + '.png';
  await page.screenshot({ path: path.join(OUT, file) });
  assert.ok((await fs.stat(path.join(OUT, file))).size > 1000);
  report.screenshots.push(file);
  row[name + 'Screenshot'] = file;
}
async function openTactics(page) {
  await page.getByRole('tab', { name: 'Tactics', exact: true }).click();
  await page.locator('[data-cm-pitch]').waitFor();
  assert.equal(await page.locator('[data-cm-slot]').count(), 11);
}
async function boot(context, row, key) {
  const fixture = fixtures.cases.find(value => value.key === key), bytes = await fs.readFile(path.join(FIXTURES, fixture.file), 'utf8');
  assert.equal(hash(bytes), fixture.sha256);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => row.pageErrors.push(String(error.stack || error)));
  page.on('console', message => row.consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }));
  page.on('requestfailed', request => row.requestFailures.push({ url: new URL(request.url()).origin + new URL(request.url()).pathname, failure: request.failure() }));
  await page.addInitScript(({ origin, key, bytes }) => {
    if (window.top !== window || location.origin !== origin || sessionStorage.getItem('cm-custom-qa-seeded')) return;
    localStorage.clear(); localStorage.setItem(key, bytes); localStorage.setItem('cm-custom-qa-unrelated', 'held');
    sessionStorage.setItem('cm-custom-qa-seeded', '1');
  }, { origin: ORIGIN, key: KEY, bytes });
  await page.goto(BASE + '/club-manager?qa-release=' + process.env.PUBLIC_RELEASE_SHA, { waitUntil: 'domcontentloaded' });
  row.consent = await answerConsent(page);
  for (let attempt = 0; attempt < 3 && await page.locator('[role="dialog"]:visible').count(); attempt++) {
    const dialog = page.locator('[role="dialog"]:visible').first();
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  }
  await page.getByRole('button', { name: 'Resume Career', exact: true }).click();
  await openTactics(page);
  const state = await read(page);
  assert.equal(state.clubName, fixture.clubName); assert.equal(state.week, fixture.week); assert.equal(state.season, fixture.season);
  assert.equal(await page.evaluate(() => localStorage.getItem('cm-custom-qa-unrelated')), 'held');
  return page;
}
async function shapePreset(page, index) {
  const before = await raw(page), name = cm.FORMATIONS[index].name;
  await page.locator('[data-cm-formation-btn=' + JSON.stringify(name) + ']').click();
  if (JSON.parse(before).formationIndex !== index) await waitSaved(page, before);
  assert.equal((await read(page)).formationIndex, index);
  assert.equal(await page.locator('[data-cm-pitch]').getAttribute('data-cm-formation'), name);
}
async function setMix(page, mix) {
  const trigger = page.locator('[data-cm-instr-open="tab"]');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  for (const axis of tactics.INSTRUCTION_KEYS) {
    const button = page.locator('[data-cm-instr-btn="tab:' + axis + ':' + mix[axis] + '"]');
    if (await button.getAttribute('aria-pressed') !== 'true') {
      const before = await raw(page); await button.click(); await waitSaved(page, before);
    }
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
  }
  assert.deepEqual(cm.instructionsOf(await read(page)), mix);
}
async function slotMap(page) {
  return page.locator('[data-cm-slot]').evaluateAll(nodes => nodes.map(node => ({ index: Number(node.dataset.cmSlot), id: node.dataset.cmPid, role: node.dataset.cmSlotLabel, fit: node.dataset.cmFit })));
}
async function pointerSample(page, index, a, b) {
  return page.evaluate(({ index, a, b }) => {
    const rect = node => {
      if (!node) return null;
      const value = node.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const brief = node => {
      const slot = node.closest('[data-cm-slot]');
      return { tag: node.tagName, slot: slot?.getAttribute('data-cm-slot') ?? null, id: node.id,
        role: node.getAttribute('role'), label: node.getAttribute('aria-label'), text: node.textContent?.trim().slice(0, 100),
        className: node.getAttribute('class'), rect: rect(node), markup: node.outerHTML.slice(0, 1800) };
    };
    const hits = point => point ? document.elementsFromPoint(point.x, point.y).slice(0, 8).map(brief) : [];
    const token = document.querySelector('[data-cm-slot="' + index + '"]');
    const style = token ? getComputedStyle(token) : null;
    const move = Array.from(document.querySelectorAll('button')).find(node => node.textContent?.trim() === 'Move players');
    return {
      viewport: { width: innerWidth, height: innerHeight }, scroll: { x: scrollX, y: scrollY },
      tokenRect: rect(token), pitchRect: rect(document.querySelector('[data-cm-pitch]')),
      tokenMarkup: token?.outerHTML ?? null, selectedSlot: document.querySelector('[data-cm-slot][data-cm-selected="1"]')?.getAttribute('data-cm-slot') ?? null,
      moveMode: move?.getAttribute('aria-pressed') ?? null,
      style: style ? { pointerEvents: style.pointerEvents, touchAction: style.touchAction, transform: style.transform,
        visibility: style.visibility, display: style.display, zIndex: style.zIndex, transition: style.transition } : null,
      startHits: hits(a), endHits: hits(b),
    };
  }, { index, a, b });
}
async function pointerMove(page, row, index, cancel = false) {
  const token = page.locator('[data-cm-slot="' + index + '"]');
  const attempt = { index, cancel, status: 'incomplete' };
  (row.pointerAttempts ??= []).push(attempt);
  let cdp, a, b, beforeRaw, before, point, beforeBox, scrollBefore;
  try {
    await token.scrollIntoViewIfNeeded(); await idle(page);
    beforeRaw = await raw(page); before = JSON.parse(beforeRaw); point = customPoints(before)[index];
    let box = await token.boundingBox(); assert.ok(box);
    const initialPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    attempt.preparation = { before: await pointerSample(page, index, initialPoint), nativeWheel: null };
    const ownsStart = await token.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    });
    if (!ownsStart) {
      const deltaY = Math.round(initialPoint.y - row.height / 2);
      assert.ok(Math.abs(deltaY) >= 1, 'An obscured pointer target needs a measurable native scroll');
      const targetScroll = await page.evaluate(delta => Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, scrollY + delta)), deltaY);
      await page.mouse.move(row.width / 2, row.height / 2);
      await page.mouse.wheel(0, deltaY);
      await page.waitForFunction(({ index, targetScroll }) => {
        const node = document.querySelector('[data-cm-slot="' + index + '"]');
        if (!node || Math.abs(scrollY - targetScroll) > 1) return false;
        const rect = node.getBoundingClientRect();
        return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }, { index, targetScroll }, { polling: 'raf' });
      attempt.preparation.nativeWheel = { deltaY, targetScroll };
      assert.equal(await raw(page), beforeRaw, 'Native target preparation must not change the save');
      box = await token.boundingBox(); assert.ok(box);
    }
    a = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    b = { x: a.x + (point.x >= 50 ? -12 : 12), y: a.y + (point.y >= 50 ? -12 : 12) };
    Object.assign(attempt, { a, b, beforeRawSha256: hash(beforeRaw), beforePoint: point, initialBox: box });
    attempt.before = await pointerSample(page, index, a, b);
    assert.equal(await token.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    }), true, 'The native pointer must start on its actual slot');
    assert.ok(a.x > 0 && a.x < row.width && a.y > 0 && a.y < row.height && b.x > 0 && b.x < row.width && b.y > 0 && b.y < row.height);
    beforeBox = await token.boundingBox(); scrollBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    await page.evaluate(() => {
      const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture'];
      const events = [];
      const listener = event => {
        if (events.length >= 64) return;
        const target = event.target instanceof Element ? event.target : null;
        const slot = target?.closest('[data-cm-slot]');
        events.push({ type: event.type, trusted: event.isTrusted, pointerType: event.pointerType, pointerId: event.pointerId,
          x: event.clientX, y: event.clientY, button: event.button, primary: event.isPrimary,
          targetTag: target?.tagName ?? null, targetLabel: target?.getAttribute('aria-label') ?? null,
          slot: slot?.getAttribute('data-cm-slot') ?? null, captured: slot?.hasPointerCapture(event.pointerId) ?? false });
      };
      window.__cmPointerProbe = { types, events, listener };
      for (const type of types) document.addEventListener(type, listener, { capture: true, passive: true });
    });
    if (row.input === 'touch' || cancel) {
      cdp = await page.context().newCDPSession(page);
      const touch = { ...a, id: 1, radiusX: 1, radiusY: 1, force: 1 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, ...b }] });
    } else { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 3 }); }
    await idle(page);
    const previewBox = await token.boundingBox();
    attempt.preview = await pointerSample(page, index, a, b);
    Object.assign(attempt, { beforeBox, previewBox, previewRawSha256: hash(await raw(page)) });
    attempt.eventsAtPreview = await page.evaluate(() => window.__cmPointerProbe.events);
    assert.equal(await raw(page), beforeRaw, 'A native drag preview cannot write the save');
    assert.ok(previewBox && Math.hypot(previewBox.x - beforeBox.x, previewBox.y - beforeBox.y) > 1, 'Native preview must actually move');
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
    if (cancel) {
      await idle(page); assert.equal(await raw(page), beforeRaw);
      await page.waitForFunction(({ index, x, y }) => {
        const node = document.querySelector('[data-cm-slot="' + index + '"]');
        if (!node) return false;
        const rect = node.getBoundingClientRect(); return Math.hypot(rect.x - x, rect.y - y) <= 1;
      }, { index, x: beforeBox.x, y: beforeBox.y }, { polling: 'raf' });
      const restored = await token.boundingBox();
      assert.ok(restored && Math.hypot(restored.x - beforeBox.x, restored.y - beforeBox.y) <= 1);
      const scrollAfter = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      assert.deepEqual(scrollAfter, scrollBefore, 'Cancelling the native preview must not scroll');
      attempt.status = 'passed';
      return { index, cancel: true, before: point, previewBox, restored, rawHeld: true, scrollBefore, scrollAfter };
    }
    const after = await waitSaved(page, beforeRaw);
    assert.notDeepEqual(customPoints(after)[index], point);
    assert.deepEqual(after.xiIds, before.xiIds); assert.deepEqual(after.xiDuties, before.xiDuties);
    const scrollAfter = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    assert.deepEqual(scrollAfter, scrollBefore, 'Releasing the native move must not scroll');
    attempt.status = 'passed';
    return { index, cancel: false, before: point, after: customPoints(after)[index], previewBox, scrollBefore, scrollAfter };
  } catch (error) {
    attempt.status = 'failed'; attempt.error = String(error.stack || error);
    try {
      attempt.failure = await pointerSample(page, index, a, b);
      attempt.failureRawSha256 = hash(await raw(page));
      attempt.failureScreenshot = row.width + '-pointer-' + index + (cancel ? '-cancel' : '-move') + '-failed.png';
      await page.screenshot({ path: path.join(OUT, attempt.failureScreenshot) });
    } catch (captureError) { attempt.captureError = String(captureError.stack || captureError); }
    throw error;
  } finally {
    try {
      attempt.events = await page.evaluate(() => {
        const probe = window.__cmPointerProbe;
        if (!probe) return [];
        for (const type of probe.types) document.removeEventListener(type, probe.listener, true);
        delete window.__cmPointerProbe; return probe.events;
      });
    } finally { if (cdp) await cdp.detach(); }
  }
}
async function keyMove(page, row, index) {
  await page.getByRole('combobox', { name: 'Position slot', exact: true }).selectOption(String(index));
  const token = page.locator('[data-cm-slot="' + index + '"]');
  await token.scrollIntoViewIfNeeded(); await token.focus();
  assert.equal(await token.evaluate(node => document.activeElement === node), true);
  const beforeRaw = await raw(page), before = JSON.parse(beforeRaw), point = customPoints(before)[index];
  const direction = point.x >= 50 ? 'ArrowLeft' : 'ArrowRight';
  const scrollBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await page.keyboard.press(direction);
  const after = await waitSaved(page, beforeRaw), scrollAfter = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  assert.equal(customPoints(after)[index].x, point.x + (direction === 'ArrowRight' ? 2 : -2));
  assert.equal(customPoints(after)[index].y, point.y);
  assert.deepEqual(after.xiIds, before.xiIds); assert.deepEqual(after.xiDuties, before.xiDuties);
  assert.deepEqual(scrollAfter, scrollBefore, 'Arrow movement must not scroll the page');
  assert.equal(await token.evaluate(node => document.activeElement === node), true);
  return { index, direction, before: point, after: customPoints(after)[index], scrollBefore, scrollAfter, focusHeld: true };
}
async function swap(page, from, to) {
  const beforeRaw = await raw(page), before = JSON.parse(beforeRaw);
  const aToken = page.locator('[data-cm-slot="' + from + '"]'), bToken = page.locator('[data-cm-slot="' + to + '"]');
  await aToken.scrollIntoViewIfNeeded(); await bToken.scrollIntoViewIfNeeded(); await idle(page);
  const a = await aToken.boundingBox(), b = await bToken.boundingBox(); assert.ok(a && b);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up();
  const after = await waitSaved(page, beforeRaw), expected = [...before.xiIds];
  [expected[from], expected[to]] = [expected[to], expected[from]];
  assert.deepEqual(after.xiIds, expected); assert.deepEqual(customPoints(after), customPoints(before));
  const actual = await slotMap(page), fit = cm.xiFitReport(after);
  assert.deepEqual(actual.map(value => value.fit || null), fit.grades);
  return { from, to, beforeIds: before.xiIds, afterIds: after.xiIds, pointsHeld: true, actualFits: fit.grades, warning: await page.locator('[data-cm-keeper-warning]').allTextContents() };
}
async function openPlans(page) {
  const trigger = page.locator('[data-cm-tile-btn="plans"]');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await page.locator('[data-cm-match-plans]').waitFor();
}
async function planSummary(page, row) {
  const name = page.locator('[data-cm-plan-title]'), summary = page.locator('[data-cm-plan-instructions]');
  assert.equal((await name.innerText()).trim(), NAME);
  assert.equal((await page.locator('[data-cm-plan-geometry]').innerText()).trim(), 'Custom positions');
  const expected = tactics.INSTRUCTION_KEYS.map(axis => tactics.INSTRUCTION_INFO[axis].label + ': ' + tactics.settingLabel(axis, MIX[axis])).join(' · ');
  assert.equal((await summary.innerText()).trim(), expected);
  row.planSummary = expected;
  for (const target of [name, summary]) {
    await target.scrollIntoViewIfNeeded();
    const measure = await target.evaluate(node => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, overflow: getComputedStyle(node).textOverflow }));
    assert.ok(measure.scrollWidth <= measure.clientWidth + 1 && measure.scrollHeight <= measure.clientHeight + 1 && measure.overflow !== 'ellipsis', 'Full name and real instruction summary must remain readable');
  }
}
async function quotaFault(page, row) {
  const before = await raw(page), allBefore = await storage(page);
  row.quota = { beforeSha256: hash(before), allStorageBeforeSha256: hash(JSON.stringify(allBefore)), attempts: [], status: 'incomplete' };
  await page.evaluate(key => {
    window.__cmQuota = { original: Storage.prototype.setItem, attempts: [] };
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key) {
        window.__cmQuota.attempts.push({ key: name, bytes: String(value).length });
        throw new DOMException('Explicit QA quota refusal', 'QuotaExceededError');
      }
      return window.__cmQuota.original.call(this, name, value);
    };
  }, KEY);
  try {
    await page.getByRole('button', { name: 'Move players', exact: true }).click();
    const token = page.locator('[data-cm-slot="0"]'); await token.scrollIntoViewIfNeeded(); await token.focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('alert').filter({ hasText: 'This position change was not saved.' }).waitFor();
    assert.equal(await raw(page), before);
    await openPlans(page);
    await page.locator('[data-cm-plan-name]').fill('Refused philosophy');
    await page.locator('[data-cm-plan-save]').click();
    await page.locator('[data-cm-plan-notice][role="alert"]').waitFor();
    assert.ok((await page.locator('[data-cm-plan-notice]').innerText()).includes('could not be changed'));
    assert.equal(await raw(page), before);
    assert.deepEqual(await storage(page), allBefore);
    row.quota.attempts = await page.evaluate(() => window.__cmQuota.attempts);
    assert.ok(row.quota.attempts.length >= 2 && row.quota.attempts.every(value => value.key === KEY));
    row.quota.storageHeld = true;
    await screenshot(page, row, 'save-refused', '[data-cm-plan-notice]');
  } finally {
    row.quota.restored = await page.evaluate(() => {
      const original = window.__cmQuota.original; Storage.prototype.setItem = original;
      const restored = Storage.prototype.setItem === original; delete window.__cmQuota; return restored;
    });
    assert.equal(row.quota.restored, true);
  }
  await page.locator('[data-cm-plan-name]').fill(NAME);
  await page.locator('[data-cm-plan-save]').click();
  await page.locator('[data-cm-plan-notice]').filter({ hasText: 'Saved ' + NAME + '.' }).waitFor();
  assert.equal((await read(page)).matchPlans.find(plan => plan.slot === 0).name, NAME);
  row.quota.status = 'passed';
}
async function unsupported(page, row) {
  const before = await raw(page), allBefore = await storage(page);
  assert.equal(JSON.parse(before).matchPlans.find(plan => plan.version === 99).opaque.keep, 'unknown tactics sentinel');
  await openPlans(page);
  assert.equal(await page.locator('[data-cm-plan-readonly="review"]').count(), 1);
  assert.ok((await page.locator('[data-cm-plan-readonly="review"]').innerText()).includes('Your saved data has been kept.'));
  assert.equal(await page.locator('[data-cm-plan-preview="0"]').count(), 1);
  for (const selector of ['[data-cm-plan-save]', '[data-cm-plan-delete]', '[data-cm-plan-apply]']) assert.equal(await page.locator(selector).isDisabled(), true);
  await page.locator('[data-cm-plan-details]').click();
  assert.equal(await page.locator('[data-cm-plan-row]').count(), 11);
  await page.locator('[data-cm-match-plans]').getByRole('button', { name: 'Back', exact: true }).click();
  assert.equal(await page.locator('[data-cm-tile-btn="plans"]').evaluate(node => document.activeElement === node), true);
  await openPlans(page);
  assert.equal(await raw(page), before); assert.deepEqual(await storage(page), allBefore);
  row.unsupported = { status: 'passed', rawSha256Before: hash(before), rawSha256After: hash(await raw(page)), allStorageHeld: true, knownPreviewRows: 11, disabled: ['Save', 'Delete', 'Apply'] };
  await screenshot(page, row, 'kept-data', '[data-cm-plan-readonly]');
}
async function liveWitness(page, row) {
  await page.locator('[data-cm-match-plans]').getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  const liveButton = page.locator('[data-cm-way="live"]');
  await liveButton.click();
  await page.locator('[data-cm-live-stage="first"]').waitFor({ state: 'attached' });
  const stageBox = page.locator('[data-cm-live-stagebox="1"]');
  await stageBox.waitFor({ state: 'visible' });
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key))?.live, KEY);
  row.live = { status: 'incomplete', witnesses: [] };
  const pause = stageBox.getByRole('button', { name: 'Pause', exact: true });
  if (await pause.count()) await pause.click();
  await idle(page);
  async function witness(stage) {
    const metadata = page.locator('[data-cm-live-stage="' + stage + '"]');
    await metadata.waitFor({ state: 'attached' });
    assert.equal(await stageBox.isVisible(), true);
    const minute = Number(await metadata.getAttribute('data-cm-live-minute')), state = await read(page), live = state.live;
    assert.ok(live && live.positionRules === 1);
    const shape = cm.liveShapeAt(live, minute + 1), formation = cm.FORMATIONS[shape.formationIndex];
    assert.ok(shape.customShape && formation);
    const ids = cm.myOnPitchAt(live, minute + 1);
    const dots = await stageBox.locator('[data-cm-dot][data-cm-stage-x][data-cm-stage-y]').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.cmDot, x: Number(node.dataset.cmStageX), y: Number(node.dataset.cmStageY) })));
    const ownIds = await stageBox.locator('[data-cm-dot]').evaluateAll((nodes, mine) => nodes.map(node => node.dataset.cmDot).filter(id => mine.includes(id)), ids);
    assert.ok(ownIds.length > 0);
    assert.equal(dots.length, ownIds.length, 'CM_CUSTOM_APP_LIVE_STAGE_GEOMETRY: every actual own player must carry supported stage geometry');
    assert.deepEqual(dots.map(dot => dot.id).sort(), [...ownIds].sort());
    const expected = dots.map(dot => {
      const index = ids.indexOf(dot.id); assert.ok(index >= 0);
      const point = cm.slotPosition(formation.slots[index], live.mentality ?? state.mentality, shape.customShape.points[index]);
      assert.ok(Math.abs(dot.x - point.x) <= 0.000001 && Math.abs(dot.y - point.y) <= 0.000001, 'CM_CUSTOM_APP_LIVE_STAGE_GEOMETRY');
      return { id: dot.id, index, role: formation.slots[index].label, point };
    });
    const legacyDifference = expected.filter(value => {
      const old = cm.slotPosition(formation.slots[value.index], live.mentality ?? state.mentality);
      return Math.hypot(value.point.x - old.x, value.point.y - old.y) > 0.5;
    }).length;
    assert.equal(legacyDifference, expected.length, 'Every moved live base must differ from the old preset projection');
    row.live.witnesses.push({ stage, minute, metadataRect: await metadata.boundingBox(), visibleStageRect: await stageBox.boundingBox(), dots, expected, legacyDifference, liveSnapshotShape: shape.customShape });
  }
  await witness('first'); await screenshot(page, row, 'live-custom', '[data-cm-live-stagebox="1"]');
  const speeds = stageBox.locator('[data-cm-live-controls] button').filter({ hasText: /^[1248]x$/ });
  const labels = await speeds.allTextContents();
  assert.ok(labels.length > 0); await speeds.nth(labels.length - 1).click();
  const resume = stageBox.getByRole('button', { name: 'Resume', exact: true }); if (await resume.count()) await resume.click();
  await stageBox.getByRole('button', { name: 'Skip', exact: true }).click();
  row.live.nativeFirstHalfSkip = true;
  const interval = page.locator('[data-cm-live-stage="interval"]');
  await interval.waitFor({ state: 'visible', timeout: 45000 });
  const half = await read(page);
  assert.ok(half.live && half.live.positionRules === 1);
  assert.deepEqual(cm.liveShapeAt(half.live, 46).customShape, half.customShape);
  row.live.halftimeSnapshot = cm.liveShapeAt(half.live, 46);
  await screenshot(page, row, 'halftime-custom', '[data-cm-live-stage="interval"]');
  await interval.getByRole('button', { name: 'Second half', exact: true }).click();
  await page.locator('[data-cm-live-stage="second"]').waitFor({ state: 'attached' });
  await stageBox.waitFor({ state: 'visible' });
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key))?.live?.h2Drawn, KEY);
  if (await pause.count()) await pause.click();
  await idle(page);
  await witness('second');
  row.live.status = 'passed';
}
let browser;
try {
  browser = await pw.chromium.launch({ headless: true });
  for (const config of [{ width: 320, height: 800, input: 'keyboard' }, { width: 390, height: 844, input: 'touch' }, { width: 430, height: 844, input: 'keyboard', reducedMotion: 'reduce' }, { width: 1440, height: 900, input: 'mouse' }]) {
    const row = { ...config, status: 'incomplete', continuedReadRequests: [], blockedRequests: [], requestFailures: [], consoleMessages: [], pageErrors: [], moves: [] };
    report.contexts.push(row);
    const context = await browser.newContext({ viewport: { width: row.width, height: row.height }, reducedMotion: row.reducedMotion || 'no-preference', hasTouch: row.input === 'touch', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      const entry = { url: url.origin + url.pathname, method, resourceType: request.resourceType() };
      if (url.origin === ORIGIN && ['http:', 'https:'].includes(url.protocol) && ['GET', 'HEAD'].includes(method)) {
        row.continuedReadRequests.push(entry);
        return route.continue();
      }
      row.blockedRequests.push({ ...entry, category: !['GET', 'HEAD'].includes(method) ? 'mutation' : /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) ? 'font' : url.hostname === 'flagcdn.com' ? 'flag' : url.hostname.endsWith('.supabase.co') ? 'backend' : 'other' });
      await route.abort('blockedbyclient');
    });
    let page;
    try {
      page = await boot(context, row, 'normal');
      const initial = await read(page), initialIndex = initial.formationIndex, otherIndex = initialIndex === 0 ? 1 : 0;
      await shapePreset(page, otherIndex); await shapePreset(page, initialIndex);
      row.presetQuickStart = { initialIndex, otherIndex, restored: true };
      const moveButton = page.getByRole('button', { name: 'Move players', exact: true });
      if (row.input === 'keyboard') { await moveButton.focus(); await page.keyboard.press('Enter'); }
      else await moveButton.click();
      assert.equal(await moveButton.getAttribute('aria-pressed'), 'true');
      const mapBefore = await slotMap(page), pointsBefore = customPoints(await read(page));
      for (let index = 0; index < 11; index++) row.moves.push(row.input === 'keyboard' ? await keyMove(page, row, index) : await pointerMove(page, row, index));
      const moved = await read(page), mapAfter = await slotMap(page);
      assert.deepEqual(mapAfter, mapBefore);
      assert.ok(customPoints(moved).every((point, index) => point.x !== pointsBefore[index].x || point.y !== pointsBefore[index].y));
      assert.equal(cm.FORMATIONS[moved.formationIndex].slots.filter(slot => slot.allowed.length === 1 && slot.allowed[0] === 'GK').length, 1);
      row.cancel = await pointerMove(page, row, 0, true);
      await page.getByRole('button', { name: 'Swap players', exact: true }).click();
      row.swap = await swap(page, 0, 10);
      assert.ok(row.swap.actualFits.includes('keeper') && row.swap.warning.length > 0, 'Real out-of-position keeper warning must remain');
      await swap(page, 0, 10);
      const beforeMentality = await raw(page);
      await page.locator('[data-cm-mentality-btn="attacking"]').click();
      if (JSON.parse(beforeMentality).mentality !== 'attacking') await waitSaved(page, beforeMentality);
      await setMix(page, MIX);
      await screenshot(page, row, 'edited-pitch', '[data-cm-pitch]');
      await openPlans(page);
      assert.equal(await page.locator('[data-cm-plan-slot]').count(), 3);
      await page.locator('[data-cm-plan-name]').fill(NAME);
      assert.equal(await page.locator('[data-cm-plan-name]').getAttribute('maxlength'), '24');
      const beforeSave = await raw(page); await page.locator('[data-cm-plan-save]').click();
      const saved = await waitSaved(page, beforeSave), plan = saved.matchPlans.find(value => value.slot === 0);
      assert.equal(plan.version, 2); assert.equal(plan.name, NAME);
      assert.deepEqual(plan.instructions, MIX); assert.deepEqual(plan.customShape, saved.customShape);
      row.savedSetup = picked(saved); row.planVersion = plan.version;
      await planSummary(page, row);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-cm-match-plans]').count(), 0);
      assert.equal(await page.locator('[data-cm-tile-btn="plans"]').evaluate(node => document.activeElement === node), true);
      const beforeReload = await raw(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Resume Career', exact: true }).click(); await openTactics(page);
      assert.deepEqual(picked(await read(page)), row.savedSetup);
      row.reload = { beforeSha256: hash(beforeReload), afterSha256: hash(await raw(page)), setupHeld: true };
      await shapePreset(page, otherIndex); await setMix(page, { press: -1, tempo: 1, width: -1, line: -1 });
      const changed = await read(page); assert.notDeepEqual(picked(changed), row.savedSetup);
      await openPlans(page); const beforeApply = await raw(page);
      await page.locator('[data-cm-plan-apply]').click(); const applied = await waitSaved(page, beforeApply);
      assert.deepEqual(picked(applied), row.savedSetup);
      row.reappliedSetup = picked(applied); await planSummary(page, row);
      await screenshot(page, row, 'reapplied-plan', '[data-cm-plan-preview]');
      if (row.width === 320) await quotaFault(page, row);
      if (row.width === 390) await liveWitness(page, row);
      await page.close(); page = null;
      if (row.width === 1440) { page = await boot(context, row, 'unsupported'); await unsupported(page, row); }
      assert.deepEqual(row.pageErrors, []);
      row.status = 'passed';
    } catch (error) {
      row.status = 'failed'; row.error = String(error.stack || error); process.exitCode = 1;
      if (page) {
        try {
          const pointerFailure = row.pointerAttempts?.findLast(attempt => attempt.status === 'failed');
          row.failureScreenshot = pointerFailure?.failureScreenshot ?? row.width + '-context-failed.png';
          if (!pointerFailure?.failureScreenshot) await page.screenshot({ path: path.join(OUT, row.failureScreenshot) });
          row.failurePitchMarkup = await page.locator('[data-cm-pitch]').evaluateAll(nodes => nodes.map(node => node.outerHTML));
          row.failureBodyText = await page.locator('body').innerText();
        } catch (captureError) { row.failureCaptureError = String(captureError.stack || captureError); }
      }
    }
    finally { if (page) await page.close(); await context.close(); }
  }
} catch (error) { report.error = String(error.stack || error); process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  const distAfter = await distSnapshot();
  report.distDigestAfter = hash(JSON.stringify(distAfter)); report.distHeld = JSON.stringify(distAfter) === JSON.stringify(distBefore);
  report.sourceAfter = Object.fromEntries(await Promise.all(Object.keys(fixtures.sourceAfter).map(async file => [file, hash(await fs.readFile(file))])));
  report.sourceHeld = JSON.stringify(report.sourceAfter) === JSON.stringify(report.sourceBefore);
  report.completeProfiles = report.contexts.filter(row => row.reappliedSetup && row.status === 'passed').length;
  report.movedSlots = report.contexts.flatMap(row => row.moves).length;
  report.cancellations = report.contexts.filter(row => row.cancel?.rawHeld).length;
  report.quotaFaults = report.contexts.filter(row => row.quota?.status === 'passed').length;
  report.keptDataJourneys = report.contexts.filter(row => row.unsupported?.status === 'passed').length;
  report.liveJourneys = report.contexts.filter(row => row.live?.status === 'passed' && row.live.witnesses.length === 2).length;
  report.status = report.distHeld && report.sourceHeld && report.contexts.length === 4 && report.contexts.every(row => row.status === 'passed')
    && report.completeProfiles === 4 && report.movedSlots === 44 && report.cancellations === 4 && report.quotaFaults === 1 && report.keptDataJourneys === 1 && report.liveJourneys === 1
    && report.screenshots.length === 12 && new Set(report.screenshots).size === 12 ? 'passed' : 'failed';
  await fs.writeFile(path.join(OUT, 'dist-after.json'), JSON.stringify(distAfter, null, 2) + '\n');
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.status, 'passed'); assert.equal(report.completeProfiles, 4); assert.equal(report.movedSlots, 44);
assert.equal(report.contexts.filter(row => row.quota?.status === 'passed').length, 1);
assert.equal(report.contexts.filter(row => row.unsupported?.status === 'passed').length, 1);
assert.equal(report.contexts.filter(row => row.live?.status === 'passed' && row.live.witnesses.length === 2).length, 1);
assert.equal(report.screenshots.length, 12); assert.equal(new Set(report.screenshots).size, 12);
console.log('cmCustomTacticsBrowser: green. 4 complete profiles, 44 native moves, 4 cancellations, 2 bounded faults, first/second live geometry, 12 screenshots.');
