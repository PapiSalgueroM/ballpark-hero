import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const BASE = option('--base-url', process.env.BASE || 'http://127.0.0.1:4173');
const OUT = path.resolve(option('--out', process.env.QA_OUT && path.join(process.env.QA_OUT, 'browser')) || '');
const FIXTURES = path.resolve(option('--fixtures', process.env.QA_OUT && path.join(process.env.QA_OUT, 'fixtures')) || '');
assert.ok((process.argv.includes('--out') && process.argv.includes('--fixtures')) || process.env.QA_OUT, 'Output and fixture directories are required');
const ORIGIN = new URL(BASE).origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Use the retained local completed build');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
await fs.mkdir(OUT, { recursive: true });
const fixtures = JSON.parse(await fs.readFile(path.join(FIXTURES, 'manifest.json'), 'utf8'));
assert.equal(fixtures.saveKey, 'dukb-club-manager-save');
assert.deepEqual(fixtures.cases.map(row => row.key), ['only_keeper', 'promised']);
assert.deepEqual(fixtures.sourceAfter, fixtures.sourceBefore);
for (const [file, digest] of Object.entries(fixtures.sourceAfter)) assert.equal(hash(await fs.readFile(file)), digest, 'Fixture/App source association: ' + file);
async function distSnapshot() {
  const rows = [];
  async function walk(relative = '') {
    for (const entry of (await fs.readdir(path.join('dist', relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(file);
      else {
        assert.equal(entry.isFile(), true, 'Unexpected non-file in completed dist');
        const bytes = await fs.readFile(path.join('dist', file));
        rows.push({ file, bytes: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  await walk();
  assert.ok(rows.length > 100, 'The complete build must exist before browser QA');
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}
const distBefore = await distSnapshot();
await fs.writeFile(path.join(OUT, 'dist-before.json'), JSON.stringify(distBefore, null, 2) + '\n');
const report = {
  status: 'incomplete', scope: 'Real compiled App from two explicit fictional saved careers, not natural progression',
  fontRendering: 'Fresh guest, fallback fonts; actual external traffic is aborted and retained, no actual-font pixel claim',
  browserRngOrClockOverrides: false, fullSourceHolds: 'The workflow owns full source manifests at both browser boundaries',
  distDigestBefore: hash(JSON.stringify(distBefore)), contexts: [],
};
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
const storageHash = value => hash(JSON.stringify(value));
async function careerSummary(page) {
  return page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key));
    return {
      clubName: value.clubName, season: value.season, week: value.week, budget: value.budget,
      squadIds: value.squad.map(player => player.id),
      loanedOut: (value.loanedOut ?? []).map(loan => ({ id: loan.player.id, name: loan.player.name, club: loan.club, fee: loan.fee, season: loan.season, loanOutSeason: loan.player.loanOutSeason })),
      promisedId: value.negotiation?.agreedExtras?.swapId ?? null,
      negotiationPhase: value.negotiation?.phase ?? null,
      sentinel: localStorage.getItem('cm-loan-qa-unrelated'),
    };
  }, fixtures.saveKey);
}
async function loanAction(page, name) {
  const actions = page.locator('button[data-cm-loan-out]');
  const matches = await actions.evaluateAll((buttons, playerName) => buttons.flatMap((button, index) => {
    const row = button.parentElement?.parentElement;
    const named = row && Array.from(row.querySelectorAll('div, span')).some(element =>
      Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim() === playerName);
    return named ? [index] : [];
  }), name);
  assert.equal(matches.length, 1, 'Expected exactly one actual player action row: ' + name);
  return actions.nth(matches[0]);
}
function measureReason(element) {
  const box = element.getBoundingClientRect(), style = getComputedStyle(element);
  const range = document.createRange(); range.selectNodeContents(element);
  const lines = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0)
    .map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }));
  const clips = [];
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const bounds = parent.getBoundingClientRect(), css = getComputedStyle(parent);
    if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowX) || ['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowY)) {
      clips.push({ x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, overflowX: css.overflowX, overflowY: css.overflowY });
    }
  }
  return {
    text: element.textContent, innerText: element.innerText, id: element.id,
    box: { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom },
    clientWidth: element.clientWidth, clientHeight: element.clientHeight, scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
    display: style.display, visibility: style.visibility, opacity: style.opacity,
    textOverflow: style.textOverflow, lineClamp: style.webkitLineClamp, lines, clips,
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: document.documentElement.scrollWidth, documentClientWidth: document.documentElement.clientWidth,
  };
}
function readable(measure, expected) {
  const box = measure.box, tolerance = 1;
  return measure.text === expected && measure.innerText.trim() === expected && box.width > 4 && box.height > 4
    && measure.display !== 'none' && measure.visibility === 'visible' && Number(measure.opacity) > 0
    && measure.textOverflow !== 'ellipsis' && ['', 'none', '0'].includes(measure.lineClamp)
    && measure.scrollWidth <= measure.clientWidth + tolerance && measure.scrollHeight <= measure.clientHeight + tolerance
    && box.x >= -tolerance && box.right <= measure.viewport.width + tolerance && box.y >= -tolerance && box.bottom <= measure.viewport.height + tolerance
    && measure.documentWidth <= measure.documentClientWidth + tolerance && measure.lines.length > 0
    && measure.lines.every(line => line.x >= box.x - tolerance && line.right <= box.right + tolerance
      && line.y >= box.y - tolerance && line.bottom <= box.bottom + tolerance
      && measure.clips.every(clip =>
        (!['hidden', 'clip', 'auto', 'scroll'].includes(clip.overflowX) || line.x >= clip.x - tolerance && line.right <= clip.right + tolerance)
        && (!['hidden', 'clip', 'auto', 'scroll'].includes(clip.overflowY) || line.y >= clip.y - tolerance && line.bottom <= clip.bottom + tolerance)));
}
const settleFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function reasonDetails(page, fixture, record) {
  const action = await loanAction(page, fixture.blocked.name);
  assert.equal(await action.isDisabled(), true, 'Blocked player must retain a disabled action');
  assert.equal((await action.innerText()).trim(), fixture.blocked.label, 'Existing quoted label is held');
  assert.equal(await action.getAttribute('title'), fixture.blocked.reason);
  const id = await action.getAttribute('aria-describedby');
  assert.ok(id && !/\s/.test(id), 'The actual disabled control must name one reason');
  const reason = page.locator('[id=' + JSON.stringify(id) + ']');
  assert.equal(await reason.count(), 1, 'Reason ID must be globally unique');
  assert.equal(await page.locator('[aria-describedby]').evaluateAll((nodes, expected) =>
    nodes.filter(node => (node.getAttribute('aria-describedby') ?? '').split(/\s+/).includes(expected)).length, id), 1, 'Reason must describe only its own action');
  assert.equal(await action.evaluate((button, expected) => button.parentElement?.parentElement?.contains(document.getElementById(expected)), id), true);
  await reason.scrollIntoViewIfNeeded(); await settleFrames(page);
  assert.equal(await reason.isVisible(), true);
  const measurement = await reason.evaluate(measureReason);
  Object.assign(record, { id, measurement });
  assert.equal(readable(measurement, fixture.blocked.reason), true, 'Full visible reason and its text lines must fit without truncation');
  const rowBox = await action.locator('..').locator('..').boundingBox();
  assert.ok(rowBox && rowBox.x >= -1 && rowBox.x + rowBox.width <= measurement.viewport.width + 1, 'Actual player row must fit horizontally');
  const buttonBox = await action.boundingBox();
  assert.ok(buttonBox);
  Object.assign(record, { rowBox, buttonBox, below44px: buttonBox.height < 44 || buttonBox.width < 44, below30px: buttonBox.height < 30 || buttonBox.width < 30, targetSizeClaim: 'Measured existing control only; no 44px or 30px pass claim' });
  return { action, reason, record };
}
async function clippingControl(page, reason, expected, healthy, record) {
  const beforeStorage = await storage(page), inlineBefore = await reason.getAttribute('style');
  Object.assign(record, { fired: false, detectorRejected: false, inlineBefore, healthy, storageBefore: storageHash(beforeStorage) });
  try {
    await reason.evaluate(element => {
      element.style.setProperty('width', '4px', 'important');
      element.style.setProperty('max-width', '4px', 'important');
      element.style.setProperty('height', '4px', 'important');
      element.style.setProperty('max-height', '4px', 'important');
      element.style.setProperty('overflow', 'hidden', 'important');
      element.style.setProperty('white-space', 'nowrap', 'important');
      element.style.setProperty('text-overflow', 'ellipsis', 'important');
    });
    await settleFrames(page);
    record.fault = await reason.evaluate(measureReason);
    record.detectorRejected = !readable(record.fault, expected);
    assert.ok(record.fault.box.width <= 4.5 && record.fault.box.height <= 4.5, 'The copied CSS fault must actually reduce the reason to 4px');
    assert.ok(Math.abs(record.fault.box.width - healthy.box.width) > 1 && Math.abs(record.fault.box.height - healthy.box.height) > 1, 'The fault must change actual geometry');
    record.fired = true;
    assert.equal(record.detectorRejected, true, 'The same detector must reject the effective clipping fault');
  } finally {
    await reason.evaluate((element, previous) => {
      if (previous === null) element.removeAttribute('style'); else element.setAttribute('style', previous);
    }, inlineBefore);
    await reason.scrollIntoViewIfNeeded(); await settleFrames(page);
    record.restored = await reason.evaluate(measureReason);
    record.inlineAfter = await reason.getAttribute('style');
    const afterStorage = await storage(page);
    record.storageAfter = storageHash(afterStorage);
    record.storageHeld = JSON.stringify(afterStorage) === JSON.stringify(beforeStorage);
    assert.equal(record.inlineAfter, inlineBefore, 'Restore the exact previous inline attribute');
    assert.equal(readable(record.restored, expected), true, 'The restored real reason must pass');
    assert.deepEqual(afterStorage, beforeStorage, 'CSS fault and restoration must leave every localStorage value held');
  }
  return record;
}
let browser;
try {
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [320, 390, 430, 1440]) {
    const viewport = { width, height: width === 320 ? 800 : width === 1440 ? 900 : 844 };
    const result = { viewport, status: 'incomplete', scenarios: [], blockedRequests: [], requestFailures: [], consoleMessages: [], pageErrors: [] };
    report.contexts.push(result);
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === ORIGIN && ['http:', 'https:'].includes(url.protocol)) return route.continue();
      result.blockedRequests.push({ url: url.origin + url.pathname, method: request.method(), resourceType: request.resourceType() });
      await route.abort('blockedbyclient');
    });
    try {
      for (const fixture of fixtures.cases) {
        const scenario = { key: fixture.key, status: 'incomplete', inputFixtureSha256: fixture.sha256 };
        result.scenarios.push(scenario);
        const bytes = await fs.readFile(path.join(FIXTURES, fixture.file), 'utf8');
        assert.equal(hash(bytes), fixture.sha256, 'Actual consumed fictional save bytes must match the builder');
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        page.on('pageerror', error => result.pageErrors.push({ scenario: fixture.key, error: String(error.stack || error) }));
        page.on('console', message => result.consoleMessages.push({ scenario: fixture.key, type: message.type(), text: message.text(), location: message.location() }));
        page.on('requestfailed', request => result.requestFailures.push({ scenario: fixture.key, url: new URL(request.url()).origin + new URL(request.url()).pathname, failure: request.failure() }));
        // This is the only browser state setup: a fresh guest and an explicit real-codec fictional save.
        await page.addInitScript(({ origin, key, raw }) => {
          if (window.top !== window || location.origin !== origin) return;
          localStorage.clear();
          localStorage.setItem(key, raw);
          localStorage.setItem('cm-loan-qa-unrelated', 'held');
        }, { origin: ORIGIN, key: fixtures.saveKey, raw: bytes });
        try {
          await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
          scenario.consent = await answerConsent(page);
          for (let attempt = 0; attempt < 3 && await page.locator('[role="dialog"]:visible').count(); attempt++) {
            const dialog = page.locator('[role="dialog"]:visible').first();
            await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
          }
          assert.equal(await page.locator('[role="dialog"]:visible').count(), 0, 'Opening help must settle before the actual resume');
          await page.getByRole('button', { name: 'Resume Career', exact: true }).click();
          await page.getByRole('tab', { name: 'Market', exact: true }).click();
          await page.getByRole('button', { name: 'Sell', exact: true }).click();
          const before = await careerSummary(page);
          assert.equal(before.clubName, fixture.clubName); assert.equal(before.squadIds.length, fixture.squadSize);
          assert.equal(before.budget, fixture.budget); assert.equal(before.season, fixture.season); assert.equal(before.week, fixture.week);
          assert.ok(before.squadIds.includes(fixture.blocked.id) && before.squadIds.includes(fixture.eligible.id));
          if (fixture.key === 'promised') { assert.equal(before.promisedId, fixture.blocked.id); assert.equal(before.negotiationPhase, 'terms'); }
          scenario.before = before; scenario.reason = {};
          let details = await reasonDetails(page, fixture, scenario.reason);
          scenario.control = {};
          await clippingControl(page, details.reason, fixture.blocked.reason, details.record.measurement, scenario.control);
          if (fixture.key === 'only_keeper') {
            scenario.screenshot = width + '-only_keeper-initial.png';
            await page.screenshot({ path: path.join(OUT, scenario.screenshot) });
          }
          const eligible = await loanAction(page, fixture.eligible.name);
          assert.equal(await eligible.isEnabled(), true);
          assert.equal((await eligible.innerText()).trim(), fixture.eligible.label);
          assert.equal(await eligible.getAttribute('title'), 'Send him out on loan for the rest of the season');
          await eligible.scrollIntoViewIfNeeded(); await eligible.click();
          await page.waitForFunction(({ key, id }) => {
            const saved = JSON.parse(localStorage.getItem(key));
            return saved && !saved.squad.some(player => player.id === id) && (saved.loanedOut ?? []).some(loan => loan.player.id === id);
          }, { key: fixtures.saveKey, id: fixture.eligible.id });
          const after = await careerSummary(page), loan = after.loanedOut.find(entry => entry.id === fixture.eligible.id);
          scenario.after = after; scenario.actualLoan = loan;
          assert.equal(after.squadIds.length, fixture.expectedAfterEligible.squadSize);
          assert.equal(after.budget, fixture.expectedAfterEligible.budget); assert.equal(after.loanedOut.length, before.loanedOut.length + 1);
          assert.ok(loan && typeof loan.club === 'string' && loan.club.length > 0 && loan.club !== fixture.clubName);
          assert.equal(loan.fee, fixture.eligible.fee); assert.equal(loan.season, before.season); assert.equal(loan.loanOutSeason, before.season);
          assert.equal(Math.round((after.budget - before.budget) * 10) / 10, fixture.eligible.fee);
          assert.equal(after.season, before.season); assert.equal(after.week, before.week); assert.equal(after.sentinel, 'held');
          assert.ok(after.squadIds.includes(fixture.blocked.id));
          if (fixture.key === 'promised') { assert.equal(after.promisedId, fixture.blocked.id); assert.equal(after.negotiationPhase, 'terms'); }
          scenario.reasonAfterNativeLoan = {};
          details = await reasonDetails(page, fixture, scenario.reasonAfterNativeLoan);
          if (fixture.key === 'promised') {
            scenario.screenshot = width + '-promised-end.png';
            await page.screenshot({ path: path.join(OUT, scenario.screenshot) });
          }
          assert.ok((await fs.stat(path.join(OUT, scenario.screenshot))).size > 1000);
          scenario.status = 'passed';
        } catch (error) {
          scenario.status = 'failed'; scenario.error = String(error.stack || error); process.exitCode = 1;
        } finally { await page.close(); }
      }
      assert.deepEqual(result.pageErrors, []);
      result.status = result.scenarios.length === 2 && result.scenarios.every(scenario => scenario.status === 'passed') ? 'passed' : 'failed';
    } catch (error) {
      result.status = 'failed'; result.error = String(error.stack || error); process.exitCode = 1;
    } finally { await context.close(); }
  }
} catch (error) {
  report.error = String(error.stack || error); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  const distAfter = await distSnapshot();
  report.distDigestAfter = hash(JSON.stringify(distAfter)); report.distHeld = JSON.stringify(distAfter) === JSON.stringify(distBefore);
  await fs.writeFile(path.join(OUT, 'dist-after.json'), JSON.stringify(distAfter, null, 2) + '\n');
  report.status = report.distHeld && report.contexts.length === 4 && report.contexts.every(context => context.status === 'passed') ? 'passed' : 'failed';
  report.nativeLoans = report.contexts.flatMap(context => context.scenarios).filter(scenario => scenario.status === 'passed').length;
  report.effectiveClipControls = report.contexts.flatMap(context => context.scenarios).filter(scenario => scenario.control?.fired && scenario.control?.detectorRejected).length;
  report.screenshots = report.contexts.flatMap(context => context.scenarios).filter(scenario => scenario.screenshot).map(scenario => scenario.screenshot);
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.status, 'passed');
assert.equal(report.nativeLoans, 8); assert.equal(report.effectiveClipControls, 8); assert.equal(report.screenshots.length, 8); assert.equal(new Set(report.screenshots).size, 8);
console.log('cmLoanReasonsBrowser: green. 4 widths, 8 scenarios, 8 native loans, 8 effective clipping controls, 8 screenshots.');
