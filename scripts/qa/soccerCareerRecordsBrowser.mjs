import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
assert.ok(process.argv.includes('--out') && process.argv.includes('--fixtures'), '--out and --fixtures are required');
const BASE = option('--base-url', process.env.BASE || 'http://127.0.0.1:4173');
const OUT = path.resolve(option('--out')), FIXTURES = path.resolve(option('--fixtures')), ORIGIN = new URL(BASE).origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Use the completed local dist');
await fs.mkdir(OUT, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(await fs.readFile(path.join(FIXTURES, 'manifest.json'), 'utf8'));
assert.deepEqual(manifest.sourceBefore, manifest.sourceAfter);
for (const [file, digest] of Object.entries(manifest.sourceAfter)) assert.equal(hash(await fs.readFile(file)), digest, file + ' source association');
assert.equal(hash(await fs.readFile(path.join(FIXTURES, manifest.bundle))), manifest.bundleSha256);
const { codec, records } = await import(pathToFileURL(path.join(FIXTURES, manifest.bundle)).href);
const KEY = manifest.saveKey, BOOK = manifest.recordsKey, OTHER = 'sc-records-qa-other';
assert.equal(KEY, 'soccerCareerSave'); assert.equal(BOOK, 'soccerCareerRecords:v1');
const fixture = {};
for (const row of manifest.files) {
  fixture[row.key] = await fs.readFile(path.join(FIXTURES, row.file), 'utf8');
  assert.equal(hash(fixture[row.key]), row.sha256);
}
async function inventory(dir, relative = '') {
  const result = [];
  for (const item of (await fs.readdir(path.join(dir, relative), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const file = path.posix.join(relative, item.name);
    if (item.isDirectory()) result.push(...await inventory(dir, file));
    else { assert.ok(item.isFile()); const value = await fs.readFile(path.join(dir, file)); result.push({ file, bytes: value.length, sha256: hash(value) }); }
  }
  return result;
}
async function sourceMap() {
  const files = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
  const map = [];
  for (const file of files) map.push({ file, sha256: hash(await fs.readFile(file)) });
  return map;
}
const gitStatus = () => execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all']).toString();
const distBefore = await inventory(path.resolve('dist')), fixturesBefore = await inventory(FIXTURES);
const sourceBefore = await sourceMap(), statusBefore = gitStatus();
assert.equal(hash(JSON.stringify(distBefore)), manifest.distInventorySha256, 'Same completed dist used for fixture association');
assert.deepEqual(distBefore, JSON.parse(await fs.readFile(path.join(FIXTURES, 'dist-inventory.json'), 'utf8')));
await fs.writeFile(path.join(OUT, 'dist-before.json'), JSON.stringify(distBefore, null, 2) + '\n');
await fs.writeFile(path.join(OUT, 'source-before.json'), JSON.stringify(sourceBefore, null, 2) + '\n');
await fs.writeFile(path.join(OUT, 'fixtures-before.json'), JSON.stringify(fixturesBefore, null, 2) + '\n');
const report = { status: 'incomplete', source: manifest.sourceAfter, profiles: [], screenshots: [],
  scope: 'Actual compiled App, fictional engine/codec save inputs. No natural long-career, score-drop repair or live backend claim.',
  browserClockOrRngOverrides: false, fonts: 'Fresh guest, reduced motion and fallback fonts. External HTTP requests are aborted and enumerated; no actual-font or provider-availability claim.',
  consoleReview: 'Every console entry and request failure is retained for Root classification. Only pageerror is required empty here.',
  sourceGitStatusBefore: statusBefore, distDigestBefore: hash(JSON.stringify(distBefore)), fixtureDigestBefore: hash(JSON.stringify(fixturesBefore)) };
const pages = new Map();
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
const rawMain = page => page.evaluate(key => localStorage.getItem(key), KEY);
const rawBook = page => page.evaluate(key => localStorage.getItem(key), BOOK);
const probe = page => page.evaluate(() => ({ trace: window.__scRecordsQA.trace, quotaAttempts: window.__scRecordsQA.quotaAttempts }));
const externalWrites = row => row.blockedRequests.filter(r => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)).length;
const hashes = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, hash(value)]));
async function snapshot(page) {
  const values = await storage(page);
  return { storage: hashes(values), page: await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth,
    bodyClass: document.body.className, rootHidden: document.getElementById('root')?.getAttribute('aria-hidden') ?? null,
    bodyStyles: Object.fromEntries(['overflow','padding-right','margin-right','pointer-events','position','top','width'].map(key => [key, document.body.style.getPropertyValue(key)])),
    scrollLock: document.body.getAttribute('data-scroll-locked'),
    focus: document.activeElement ? { tag: document.activeElement.tagName, role: document.activeElement.getAttribute('role'), label: document.activeElement.getAttribute('aria-label'), text: document.activeElement.textContent?.trim().slice(0, 120) } : null,
  })) };
}
async function click(page, scenario, target, label) {
  await target.waitFor({ state: 'visible' }); await target.scrollIntoViewIfNeeded(); await idle(page);
  const before = await snapshot(page);
  const element = await target.evaluate(node => { const b = node.getBoundingClientRect(); return {
    tag: node.tagName, role: node.getAttribute('role'), label: node.getAttribute('aria-label'), text: node.textContent?.trim(),
    box: { x: b.x, y: b.y, width: b.width, height: b.height } }; });
  await target.click(); await idle(page);
  scenario.actions.push({ type: 'native-click', label, element, before, after: await snapshot(page) });
}
async function measure(target) {
  return target.evaluate(node => { const b = node.getBoundingClientRect(), css = getComputedStyle(node); return {
    text: node.textContent, x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height,
    clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight,
    textOverflow: css.textOverflow, lineClamp: css.webkitLineClamp, viewportWidth: innerWidth, viewportHeight: innerHeight,
  }; });
}
const widthFits = sample => sample.width > 0 && sample.height > 0 && sample.x >= -1 && sample.right <= sample.viewportWidth + 1;
const nameFits = sample => widthFits(sample) && sample.scrollWidth <= sample.clientWidth + 1
  && sample.scrollHeight <= sample.clientHeight + 1 && sample.textOverflow !== 'ellipsis'
  && (!sample.lineClamp || sample.lineClamp === 'none');
async function modalGeometry(page, scenario, label) {
  const panel = page.getByRole('dialog', { name: 'Past careers', exact: true });
  const frame = await measure(panel);
  assert.ok(widthFits(frame) && frame.y >= -1 && frame.bottom <= frame.viewportHeight + 1, 'Record book bounds');
  assert.ok(frame.scrollWidth <= frame.clientWidth + 1, 'Record book horizontal overflow');
  const targets = [];
  for (const button of await panel.getByRole('button').all()) {
    const box = await measure(button);
    assert.ok(box.width >= 43.5 && box.height >= 43.5, 'Every new viewer target is at least44px');
    targets.push(box);
  }
  assert.ok(targets.length >= 3);
  scenario.geometry.push({ label, frame, targets });
  return panel;
}
async function photo(page, scenario, name, target) {
  if (target) { await target.scrollIntoViewIfNeeded(); await idle(page); }
  const file = scenario.width + '-' + name + '.png';
  await page.screenshot({ path: path.join(OUT, file) });
  assert.ok((await fs.stat(path.join(OUT, file))).size > 1000);
  scenario.photos.push(file); report.screenshots.push({ file, scenario: scenario.name, width: scenario.width, control: name === 'control-clipped' });
}
async function topOfPanel(page, panel) {
  if (await panel.evaluate(node => node.scrollTop > 0)) {
    await panel.hover(); await page.mouse.wheel(0, -10000);
    await page.waitForFunction(() => document.querySelector('[data-past-careers]')?.scrollTop === 0);
  }
}
async function boot(context, profile, name, mode) {
  const scenario = { name, width: profile.width, actions: [], geometry: [], photos: [], consoleMessages: [], requestFailures: [], pageErrors: [], status: 'incomplete' };
  profile.scenarios.push(scenario);
  const page = await context.newPage(); pages.set(page, { profile, scenario }); page.setDefaultTimeout(30000);
  page.on('pageerror', error => scenario.pageErrors.push(String(error.stack || error)));
  page.on('console', message => scenario.consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }));
  page.on('requestfailed', request => { const url = new URL(request.url()); scenario.requestFailures.push({ method: request.method(), host: url.host, path: url.pathname, failure: request.failure() }); });
  await page.addInitScript(({ origin, key, book, other, main, future, mode, marker }) => {
    if (window.top !== window || location.origin !== origin) return;
    if (!sessionStorage.getItem(marker)) {
      localStorage.clear(); if (mode !== 'creation') localStorage.setItem(key, main);
      if (mode === 'future') localStorage.setItem(book, future);
      localStorage.setItem(other, 'held'); sessionStorage.setItem(marker, '1');
    }
    const originals = Object.fromEntries(['setItem','removeItem','clear'].map(name => [name, Object.getOwnPropertyDescriptor(Storage.prototype, name)]));
    const qa = { trace: [], quotaAttempts: 0, failRecords: mode === 'quota', originals, restore: null };
    for (const name of ['setItem','removeItem','clear']) {
      Object.defineProperty(Storage.prototype, name, { ...originals[name], value: function (...args) {
        if (this === localStorage) {
          qa.trace.push({ op: name, key: String(args[0] ?? ''), chars: args[1] === undefined ? null : String(args[1]).length });
          if (name === 'setItem' && String(args[0]) === book && qa.failRecords) {
            qa.quotaAttempts++; throw new DOMException('Controlled record-book quota refusal', 'QuotaExceededError');
          }
        }
        return Reflect.apply(originals[name].value, this, args);
      } });
    }
    qa.restore = () => { for (const name of ['setItem','removeItem','clear']) Object.defineProperty(Storage.prototype, name, originals[name]); };
    window.__scRecordsQA = qa;
  }, { origin: ORIGIN, key: KEY, book: BOOK, other: OTHER, main: fixture.completed, future: fixture.future, mode, marker: 'sc-records-qa-' + name });
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  scenario.consent = await answerConsent(page);
  const ready = mode === 'creation' ? page.locator('#pname') : page.locator('h1').filter({ hasText: manifest.expected.profile[0] });
  await ready.waitFor({ state: 'visible' }); await idle(page);
  scenario.dismissedStartupDialogs = [];
  for (let i = 0; i < 3 && await page.locator('[role="dialog"]:visible').count(); i++) {
    const dialog = page.locator('[role="dialog"]:visible').first();
    scenario.dismissedStartupDialogs.push(await dialog.innerText());
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  }
  assert.equal(await page.evaluate(key => localStorage.getItem(key), OTHER), 'held');
  return { page, scenario };
}
async function finish(page, scenario) {
  scenario.final = await snapshot(page); scenario.probe = await probe(page);
  await page.evaluate(() => window.__scRecordsQA.restore());
  scenario.storagePrototypeRestored = await page.evaluate(() => Object.entries(window.__scRecordsQA.originals).every(([key, descriptor]) => {
    const now = Object.getOwnPropertyDescriptor(Storage.prototype, key);
    return now.value === descriptor.value && now.configurable === descriptor.configurable && now.enumerable === descriptor.enumerable && now.writable === descriptor.writable;
  }));
  assert.equal(scenario.storagePrototypeRestored, true); assert.deepEqual(scenario.pageErrors, []);
  scenario.status = 'passed'; await page.close();
}
async function bookState(page) {
  const values = await storage(page), read = records.readCompletedRecords({ getItem: key => values[key] ?? null });
  assert.equal(read.status, 'known'); return read;
}
async function currentSaved(page) {
  const raw = await rawMain(page); assert.notEqual(raw, null);
  const state = codec.parseSoccerCareerSave(raw); assert.equal(codec.isSoccerCareerSave(state), true);
  assert.equal(state.playerName, manifest.expected.profile[0]); assert.equal(state.phase, 'retired');
  assert.deepEqual(state.legacy, manifest.expected.legacy);
  return raw;
}
async function expectedBook(page) {
  const read = await bookState(page); assert.equal(read.records.length, 1);
  const record = read.records[0], expected = manifest.expected;
  for (const key of ['key','profile','firstYear','lastYear','legacy','goals','trophies','ballonDors','caps']) assert.deepEqual(record[key], expected[key], key);
  return read;
}
async function openBook(page, scenario) {
  const opener = page.getByRole('button', { name: 'Past careers', exact: true });
  await opener.scrollIntoViewIfNeeded(); await idle(page);
  const before = await snapshot(page), values = await storage(page), mutations = (await probe(page)).trace.length;
  const writes = externalWrites(pages.get(page).profile);
  await click(page, scenario, opener, 'Past careers');
  await page.getByRole('heading', { name: 'Past careers', exact: true }).waitFor({ state: 'visible' });
  const panel = await modalGeometry(page, scenario, 'grid');
  return { panel, opener, before, values, mutations, writes };
}
async function closeBook(page, scenario, opened) {
  await click(page, scenario, opened.panel.getByRole('button', { name: 'Back', exact: true }), 'Back closes book');
  await opened.panel.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Past careers');
  const after = await snapshot(page);
  assert.deepEqual(await storage(page), opened.values, 'Viewing preserves every local storage value');
  assert.equal((await probe(page)).trace.length, opened.mutations, 'Viewing has no storage mutation calls');
  assert.equal(externalWrites(pages.get(page).profile), opened.writes, 'Viewing has no external mutation attempts');
  assert.ok(Math.abs(after.page.scrollY - opened.before.page.scrollY) <= 1, 'Back preserves prepared page scroll');
  assert.equal(after.page.scrollX, opened.before.page.scrollX);
  assert.deepEqual(after.page.bodyStyles, opened.before.page.bodyStyles);
  assert.equal(after.page.bodyClass, opened.before.page.bodyClass);
  assert.equal(after.page.scrollLock, opened.before.page.scrollLock);
  assert.equal(after.page.rootHidden, opened.before.page.rootHidden);
  scenario.viewPreservation = { storageHeld: true, noStorageCalls: true, noExternalWrites: true, openerFocused: true, bodyRestored: true, scrollHeld: true };
}
async function focusTrap(page, scenario, panel) {
  const count = await panel.getByRole('button').count(), focus = [];
  for (let i = 0; i < count + 2; i++) {
    await page.keyboard.press('Tab');
    const value = await panel.evaluate(node => ({ inside: node.contains(document.activeElement), text: document.activeElement?.textContent?.trim(), label: document.activeElement?.getAttribute('aria-label') }));
    assert.equal(value.inside, true); focus.push(value);
  }
  await page.keyboard.press('Shift+Tab');
  assert.equal(await panel.evaluate(node => node.contains(document.activeElement)), true);
  scenario.focusTrap = { nativeTabSteps: count + 3, focus };
}
async function clipControl(page, scenario, panel) {
  const name = panel.locator('[data-past-career-record] p').first();
  const before = await measure(name), originalStyle = await name.getAttribute('style'), saved = await storage(page);
  assert.equal(nameFits(before), true);
  let changed, rejected;
  try {
    await name.evaluate(node => { node.style.width = '4px'; node.style.maxWidth = '4px'; node.style.height = '4px'; node.style.maxHeight = '4px'; node.style.overflow = 'hidden'; });
    changed = await measure(name); rejected = !nameFits(changed);
    assert.ok(changed.width <= 4.1 && changed.height <= 4.1 && (Math.abs(changed.width - before.width) > 1 || Math.abs(changed.height - before.height) > 1));
    assert.equal(rejected, true, 'Same name detector rejects effective clipping');
    if (scenario.width === 320) await photo(page, scenario, 'control-clipped', panel);
  } finally {
    await name.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, originalStyle);
  }
  assert.equal(await name.getAttribute('style'), originalStyle);
  assert.equal(nameFits(await measure(name)), true); assert.deepEqual(await storage(page), saved);
  scenario.clipControl = { before, changed, detectorRejected: rejected, exactStyleRestored: true, allStorageHeld: true };
}
async function nativeRestart(page, scenario) {
  const kept = await expectedBook(page), raw = kept.raw;
  await click(page, scenario, page.getByRole('button', { name: /New Career$/ }).first(), 'New Career');
  const dialog = page.getByRole('dialog', { name: 'Start a new career?', exact: true });
  await click(page, scenario, dialog.getByRole('button', { name: 'Delete & Start Over', exact: true }), 'Delete & Start Over');
  await page.waitForFunction(key => localStorage.getItem(key) === null, KEY);
  await page.locator('#pname').waitFor({ state: 'visible' });
  assert.equal(await rawBook(page), raw); await expectedBook(page);
  scenario.restart = { sourceRemoved: true, retainedRawHeld: true, probe: await probe(page) };
}
async function creation(context, profile) {
  const { page, scenario } = await boot(context, profile, 'creation', 'creation');
  try {
    await page.locator('#pname').fill('Draft Record Lab');
    const form = page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('..');
    const picks = [['England', false], ['Central Mid (CM)', true], ['2020s (2020 start)', true]];
    for (let i = 0; i < picks.length; i++) {
      await click(page, scenario, form.getByRole('combobox').nth(i), 'Open creation choice ' + i);
      const target = picks[i][1] ? page.getByRole('option', { name: picks[i][0], exact: true })
        : page.getByRole('option').filter({ hasText: picks[i][0] });
      assert.equal(await target.count(), 1); await click(page, scenario, target, 'Choose ' + picks[i][0]);
    }
    await click(page, scenario, page.getByRole('button', { name: /Generate Starting Potential/ }), 'Generate Starting Potential');
    await page.getByRole('button', { name: /Roll again/ }).waitFor({ state: 'visible' });
    const stats = page.getByRole('heading', { name: 'Starting Stats', exact: true }).locator('..').locator('..');
    await stats.waitFor({ state: 'visible' }); await idle(page);
    const input = await page.locator('#pname').elementHandle();
    const draft = async () => ({ name: await page.locator('#pname').inputValue(), picks: await form.getByRole('combobox').allTextContents(),
      potential: await page.getByRole('heading', { name: 'Starting Potential', exact: true }).locator('..').innerText(), stats: await stats.innerText() });
    const before = await draft(); assert.ok(before.stats.includes('Starting Stats') && before.potential.includes('Roll 1.'));
    await photo(page, scenario, 'creation', stats);
    const opened = await openBook(page, scenario);
    await focusTrap(page, scenario, opened.panel);
    await closeBook(page, scenario, opened);
    assert.deepEqual(await draft(), before); assert.equal(await input.evaluate(node => node.isConnected), true);
    assert.equal(await rawMain(page), null);
    scenario.draft = { before, after: await draft(), sameCreationNode: true, realRollPreserved: true };
    await finish(page, scenario);
  } catch (error) { await failPage(page, scenario, error); throw error; }
}
async function completed(context, profile) {
  const { page, scenario } = await boot(context, profile, 'completed', 'completed');
  try {
    await page.locator('[data-soccer-record-status="kept"]').waitFor({ state: 'visible' });
    const acknowledged = await currentSaved(page); await expectedBook(page);
    const opened = await openBook(page, scenario);
    assert.equal(await opened.panel.locator('[data-past-career-record]').count(), 1);
    const name = opened.panel.locator('[data-past-career-record] p').first();
    assert.equal((await measure(name)).text, manifest.expected.profile[0]); assert.equal(nameFits(await measure(name)), true);
    await photo(page, scenario, 'grid', opened.panel); await clipControl(page, scenario, opened.panel);
    await focusTrap(page, scenario, opened.panel);
    await click(page, scenario, opened.panel.locator('[data-past-career-record]'), 'Open retained summary');
    await opened.panel.locator('[data-past-career-detail]').waitFor({ state: 'visible' });
    assert.equal(await opened.panel.getByRole('heading', { name: manifest.expected.profile[0], exact: true }).count(), 1);
    const detailPanel = opened.panel.locator('[data-past-career-detail]');
    const metrics = detailPanel.locator('div.grid');
    for (const [label, value] of [['Goals',17],['Trophies',1],["Ballon d'Or",0],['Caps',4]]) {
      const tile = metrics.getByText(label, { exact: true }).locator('..');
      assert.equal((await tile.locator('p').first().innerText()).trim(), String(value), label + ' actual saved metric');
    }
    const detail = await detailPanel.innerText();
    assert.ok(detail.includes(manifest.expected.legacy.tier)); assert.ok(detail.includes(String(manifest.expected.legacy.score) + '/100'));
    const breakdown = detailPanel.locator('div.space-y-1');
    for (const row of manifest.expected.legacy.breakdown) {
      const line = breakdown.getByText(row.label, { exact: true }).locator('..');
      assert.equal((await line.locator('span').last().innerText()).trim(), (row.points > 0 ? '+' : '') + row.points, 'Actual saved breakdown sign/value');
    }
    await topOfPanel(page, opened.panel); await modalGeometry(page, scenario, 'detail'); await photo(page, scenario, 'details', opened.panel);
    await click(page, scenario, opened.panel.getByRole('button', { name: 'How past careers work', exact: true }), 'Open record rules');
    await opened.panel.getByRole('heading', { name: 'How it works', exact: true }).waitFor({ state: 'visible' });
    assert.ok((await opened.panel.innerText()).includes('most recently added or changed'));
    await modalGeometry(page, scenario, 'help'); await photo(page, scenario, 'help', opened.panel);
    await click(page, scenario, opened.panel.getByRole('button', { name: 'Back', exact: true }), 'Back from rules');
    await opened.panel.locator('[data-past-career-detail]').waitFor({ state: 'visible' });
    await click(page, scenario, opened.panel.getByRole('button', { name: 'Back', exact: true }), 'Back from summary');
    await opened.panel.locator('[data-past-career-record]').waitFor({ state: 'visible' });
    await closeBook(page, scenario, opened);
    assert.equal(await rawMain(page), acknowledged);
    await nativeRestart(page, scenario);
    scenario.beforeReload = { source: await rawMain(page), book: hash(await rawBook(page)), probe: await probe(page) };
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#pname').waitFor({ state: 'visible' }); await idle(page);
    assert.equal(await rawMain(page), null); assert.equal(hash(await rawBook(page)), scenario.beforeReload.book); await expectedBook(page);
    const restored = await openBook(page, scenario);
    assert.equal(await restored.panel.getByText(manifest.expected.profile[0], { exact: true }).count(), 1);
    await closeBook(page, scenario, restored);
    scenario.acknowledgedSource = hash(acknowledged); scenario.savedSummary = manifest.expected; scenario.reloadRetained = true;
    await finish(page, scenario);
  } catch (error) { await failPage(page, scenario, error); throw error; }
}
async function quota(context, profile) {
  const { page, scenario } = await boot(context, profile, 'quota', 'quota');
  try {
    await page.locator('[data-soccer-record-status="blocked"]').waitFor({ state: 'visible' });
    const acknowledged = await currentSaved(page);
    assert.equal(await rawBook(page), null); assert.ok((await probe(page)).quotaAttempts > 0);
    await photo(page, scenario, 'quota-refused', page.locator('[data-soccer-record-status="blocked"]'));
    await click(page, scenario, page.getByRole('button', { name: /New Career$/ }).first(), 'New Career during record quota refusal');
    const dialog = page.getByRole('dialog', { name: 'Start a new career?', exact: true });
    await click(page, scenario, dialog.getByRole('button', { name: 'Delete & Start Over', exact: true }), 'Ordinary delete must refuse');
    assert.equal(await rawMain(page), acknowledged); assert.equal(await rawBook(page), null);
    await click(page, scenario, dialog.getByRole('button', { name: 'Cancel', exact: true }), 'Cancel keeps career');
    const retry = page.getByRole('button', { name: 'Retry record', exact: true }); await retry.waitFor({ state: 'visible' });
    scenario.refused = { sourceHeld: true, bookAbsent: true, actualQuotaAttempts: (await probe(page)).quotaAttempts, persistentRetryAfterCancel: true };
    await page.evaluate(() => { window.__scRecordsQA.failRecords = false; });
    await click(page, scenario, retry, 'Retry record after quota restored');
    await page.locator('[data-soccer-record-status="kept"]').waitFor({ state: 'visible' });
    assert.equal(await rawMain(page), acknowledged); await expectedBook(page);
    await photo(page, scenario, 'quota-recovered', page.locator('[data-soccer-record-status="kept"]'));
    await nativeRestart(page, scenario); scenario.recovered = true;
    await finish(page, scenario);
  } catch (error) { await failPage(page, scenario, error); throw error; }
}
async function future(context, profile) {
  const { page, scenario } = await boot(context, profile, 'future', 'future');
  try {
    await page.locator('[data-soccer-record-status="blocked"]').waitFor({ state: 'visible' });
    const acknowledged = await currentSaved(page); assert.equal(await rawBook(page), fixture.future);
    await click(page, scenario, page.getByRole('button', { name: /New Career$/ }).first(), 'New Career with future book');
    const dialog = page.getByRole('dialog', { name: 'Start a new career?', exact: true });
    await click(page, scenario, dialog.getByRole('button', { name: 'Delete & Start Over', exact: true }), 'Ordinary delete must preserve future data');
    assert.equal(await rawMain(page), acknowledged); assert.equal(await rawBook(page), fixture.future);
    await click(page, scenario, dialog.getByRole('button', { name: 'Cancel', exact: true }), 'Cancel future-store refusal');
    await click(page, scenario, page.getByRole('button', { name: 'Retry record', exact: true }), 'Retry future book remains refused');
    assert.equal(await rawMain(page), acknowledged); assert.equal(await rawBook(page), fixture.future);
    const opened = await openBook(page, scenario);
    await opened.panel.getByText('This record book could not be opened. Its saved data is unchanged.', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await opened.panel.locator('[data-past-career-record]').count(), 0);
    await photo(page, scenario, 'future-readonly', opened.panel); await closeBook(page, scenario, opened);
    assert.equal(await rawMain(page), acknowledged); assert.equal(await rawBook(page), fixture.future);
    scenario.futurePreserved = { currentSourceHeld: true, opaqueBookBytesHeld: true, ordinaryDeleteRefused: true, actualRetryStillRefused: true, explicitDiscardTested: false };
    await finish(page, scenario);
  } catch (error) { await failPage(page, scenario, error); throw error; }
}
async function failPage(page, scenario, error) {
  scenario.status = 'failed'; scenario.error = String(error.stack || error);
  try {
    scenario.failure = { snapshot: await snapshot(page), probe: await probe(page), dialogs: await page.locator('[role="dialog"]:visible').allTextContents() };
    const file = scenario.width + '-' + scenario.name + '-failed.png';
    await page.screenshot({ path: path.join(OUT, file) }); scenario.failureScreenshot = file;
  } catch (captureError) { scenario.failureCaptureError = String(captureError.stack || captureError); }
  try { await page.evaluate(() => window.__scRecordsQA?.restore()); } catch { /* original failure and any capture error stay retained */ }
  await page.close();
}
let browser;
try {
  browser = await pw.chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  for (const config of [{ width:320,height:740 },{ width:390,height:844 },{ width:430,height:932 },{ width:1440,height:1000 }]) {
    const profile = { ...config, status:'incomplete', scenarios:[], blockedRequests:[] }; report.profiles.push(profile);
    const context = await browser.newContext({ viewport:config, hasTouch:config.width<500, reducedMotion:'reduce', serviceWorkers:'block' });
    await context.route('**/*', async route => {
      const request=route.request(),url=new URL(request.url());
      if (url.origin===ORIGIN && ['http:','https:'].includes(url.protocol)) return route.continue();
      const entry={method:request.method(),host:url.host,path:url.pathname,resourceType:request.resourceType(),
        category:/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)?'font':url.hostname==='flagcdn.com'?'flag':url.hostname.endsWith('.supabase.co')?'backend':'other'};
      profile.blockedRequests.push(entry); await route.abort('blockedbyclient');
    });
    try {
      await creation(context,profile); await completed(context,profile);
      if(config.width===320){await quota(context,profile);await future(context,profile);}
      profile.status='passed';
    } catch(error) { profile.status='failed';profile.error=String(error.stack||error);process.exitCode=1; }
    finally {await context.close();}
  }
} catch(error) {report.error=String(error.stack||error);process.exitCode=1;}
finally {
  if(browser)await browser.close();
  const distAfter=await inventory(path.resolve('dist')),fixturesAfter=await inventory(FIXTURES),sourceAfter=await sourceMap();
  report.sourceGitStatusAfter=gitStatus();report.sourceHeld=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter)&&statusBefore===report.sourceGitStatusAfter;
  report.distHeld=JSON.stringify(distBefore)===JSON.stringify(distAfter);report.fixturesHeld=JSON.stringify(fixturesBefore)===JSON.stringify(fixturesAfter);
  report.distDigestAfter=hash(JSON.stringify(distAfter));report.fixtureDigestAfter=hash(JSON.stringify(fixturesAfter));
  const scenes=report.profiles.flatMap(profile=>profile.scenarios);
  report.actualCensus={profiles:report.profiles.length,creation:scenes.filter(s=>s.name==='creation'&&s.status==='passed').length,
    completed:scenes.filter(s=>s.name==='completed'&&s.status==='passed').length,quota:scenes.filter(s=>s.name==='quota'&&s.status==='passed').length,
    future:scenes.filter(s=>s.name==='future'&&s.status==='passed').length,clipControls:scenes.filter(s=>s.clipControl?.detectorRejected&&s.clipControl.exactStyleRestored).length,
    originalScreenshots:report.screenshots.filter(s=>!s.control).length,controlScreenshots:report.screenshots.filter(s=>s.control).length};
  report.status=report.profiles.length===4&&report.profiles.every(p=>p.status==='passed')&&report.sourceHeld&&report.distHeld&&report.fixturesHeld
    &&report.actualCensus.creation===4&&report.actualCensus.completed===4&&report.actualCensus.quota===1&&report.actualCensus.future===1
    &&report.actualCensus.clipControls===4&&report.actualCensus.originalScreenshots===19&&report.actualCensus.controlScreenshots===1?'passed':'failed';
  await fs.writeFile(path.join(OUT,'dist-after.json'),JSON.stringify(distAfter,null,2)+'\n');
  await fs.writeFile(path.join(OUT,'fixtures-after.json'),JSON.stringify(fixturesAfter,null,2)+'\n');
  await fs.writeFile(path.join(OUT,'source-after.json'),JSON.stringify(sourceAfter,null,2)+'\n');
  await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
assert.equal(report.status,'passed','Four-width actual App record-book qualification');
