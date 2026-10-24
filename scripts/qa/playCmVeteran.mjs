import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.CM_VETERAN_OUT, SITE = process.env.CM_VETERAN_SITE_DIST;
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'CM_SETUP_OFFLINE_CI');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'CM_SETUP_EXACT_PRELOAD');
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'CM_SETUP_OUTSIDE_OUTPUT');
assert(SITE && path.isAbsolute(SITE), 'CM_SETUP_COMPLETED_SITE');
const DIST = path.join(OUT, 'fixture-dist'), BROWSER = path.join(OUT, 'browser');
assert(fs.statSync(SITE).isDirectory() && fs.statSync(DIST).isDirectory() && !fs.existsSync(BROWSER), 'CM_SETUP_FRESH_BROWSER');
const bindingFile = process.env.CM_VETERAN_BINDING_FILE;
assert(bindingFile && path.isAbsolute(bindingFile), 'CM_SETUP_BINDING');
const bindingBody = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBody);
assert.match(binding.sourceHead || '', /^[a-f0-9]{40}$/);
assert.equal(binding.sourceHead, process.env.GITHUB_SHA);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(), binding.sourceHead);
assert(Number.isSafeInteger(binding.trackedCount) && binding.trackedCount > 0);
const required = ['src/lib/clubManager.ts', 'src/lib/clubManagerCalendar.ts',
  'src/lib/clubManagerVeteranLedger.ts', 'src/lib/clubManagerVeteranRetirement.ts',
  'src/hooks/useClubManager.ts', 'src/components/club-manager/ClubManagerSeasonSummary.tsx',
  'src/components/club-manager/VeteranRetirementCard.tsx', 'src/components/game/ResultScreen.tsx', 'src/index.css',
  'scripts/qa/fixtures/cmVeteran.entry.tsx', 'scripts/qa/fixtures/cmVeteran.html',
  'scripts/qa/fixtures/cmVeteran.vite.mjs', 'scripts/qa/playCmVeteran.mjs',
  'scripts/qa/siteMenuNavigationSupport.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs',
  'src/lib/clubManagerUiInfo.ts',
  'src/components/club-manager/TacticsScreen.tsx',
  'src/components/club-manager/AcademyScreen.tsx',
  'src/components/club-manager/MatchPlansCard.tsx',
  'src/test/academyFilters.test.tsx',
  'scripts/simTacticsEngine.mjs',
  'scripts/qa/runClubManagerVeteranOldParity.mjs'];
for (const file of required) {
  assert.match(binding.pins?.[file] || '', /^[a-f0-9]{64}$/, 'CM_SETUP_PIN_' + file);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), binding.pins[file], 'CM_SETUP_BODY_' + file);
}
const CACHE = process.env.FREE_KICK_FONT_CACHE;
assert(CACHE && path.isAbsolute(CACHE), 'CM_SETUP_FONT_CACHE');
const fonts = loadFonts(CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const receipt = process.env.SIM_OFFLINE_RECEIPT;
assert(receipt && path.isAbsolute(receipt) && fs.existsSync(receipt) && fs.statSync(receipt).size === 0, 'CM_SETUP_EMPTY_TRANSPORT');
fs.mkdirSync(BROWSER);
const save = (name, value) => {
  const body = JSON.stringify(value, null, 2) + '\n', file = path.join(BROWSER, name);
  fs.writeFileSync(file, body, { flag: 'wx' });
  return { file: name, bytes: Buffer.byteLength(body), sha256: sha(body) };
};
const require = createRequire(import.meta.url), packagePath = require.resolve('playwright/package.json'), corePath = require.resolve('playwright-core/package.json');
const browserTools = () => ({ playwright: inventory(path.dirname(packagePath)), core: inventory(path.dirname(corePath)) });
function sources() {
  const names = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0');
  assert.equal(names.pop(), ''); assert.equal(new Set(names).size, names.length);
  assert(names.every(file => file && !/[\0\r\n\\]/.test(file) && !file.startsWith('/') && !file.split('/').some(v => v === '.' || v === '..')));
  return names.sort().map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
}
function dependencies(directory = path.join(ROOT, 'node_modules'), relative = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const file = relative ? relative + '/' + name : name, full = path.join(directory, file);
    if (file === '.vite') continue;
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      const real = fs.realpathSync(full);
      if (!real.startsWith(directory + path.sep)) assert(['playwright', 'playwright-core'].includes(file) && real === path.dirname(require.resolve(file + '/package.json')), 'CM_SETUP_TOOL_LINK');
      rows.push({ file, link: fs.readlinkSync(full) });
    } else if (stat.isDirectory()) rows.push(...dependencies(directory, file));
    else { assert(stat.isFile()); rows.push({ file, bytes: stat.size, sha256: sha(fs.readFileSync(full)) }); }
  }
  return rows;
}
const inventories = () => ({ source: sources(), dependencies: dependencies(), fixture: inventory(DIST), site: inventory(SITE), fonts: inventory(CACHE), browserTools: browserTools() });
const before = inventories();
assert.equal(before.source.length, binding.trackedCount);
const beforeReceipt = save('inputs.before.json', before);
const executable = process.env.CHROME_PATH || pw.chromium.executablePath();
const tools = { node: process.version, nodeSha256: sha(fs.readFileSync(process.execPath)), playwright: JSON.parse(fs.readFileSync(packagePath)).version,
  playwrightPackageSha256: sha(fs.readFileSync(packagePath)), executable, executableSha256: sha(fs.readFileSync(executable)) };
assert.equal(tools.playwright, binding.playwrightVersion);
const specs = [328, 390, 1280].flatMap(width => [
  { id: width + '-light-full', width, height: width === 328 ? 515 : width === 390 ? 844 : 800, theme: 'light', reduced: false },
  { id: width + '-dark-reduced', width, height: width === 328 ? 515 : width === 390 ? 844 : 800, theme: 'dark', reduced: true },
]);
const port = Number(process.env.CM_VETERAN_PORT || 4197);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const BASE = 'http://127.0.0.1:' + port;
const files = new Map(before.fixture.map(row => ['/' + row.file, row]));
const report = { version: 1, status: 'running', complete: false, applicationQualified: false,
  sourceHead: binding.sourceHead, bindingSha256: sha(bindingBody), before: beforeReceipt, tools,
  plannedContexts: 6, plannedSnapshots: 44, plannedControls: 15, contexts: [], controls: [], errors: [],
  limits: ['Actual SeasonSummary, ResultScreen, VeteranRetirementCard, hook, writer and CSS fixture, not the full career page.',
    'Prepared completed-calendar fictional veteran uses the actual record builder and finishSeason; no full season is played.',
    'Native E-key quota interception and delegated Math.random observation are declared; no engine, component, hook or writer mock.',
    'An independent pure uncommitted apply candidate is computed before calling the actual hook; no artificial callback success.',
    'Actual ResultScreen completion recording remains default-off; SavePointsDoor is rendered but not opened.',
    'No mandatory painted pending frame, artificial writer delay or browser rollover claim. Age36 does not become42 here.',
    'Deliberate target scrolling is recorded before inputs. No all-controls-on-one-phone-fold claim.',
    'Normal40, frozen-old rollover parity, full sims, production route, bundle caps, balance and publication remain separate gates.'] };
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const read = page => page.evaluate(() => window.__CM_VETERAN_FIXTURE__.read());
const button = (page, name) => page.getByRole('button', { name, exact: true });
function collect() {
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => { const s = getComputedStyle(node); return s.display !== 'none' && s.visibility !== 'hidden' && node.getClientRects().length > 0; };
  const region = document.querySelector('section[aria-label="Veteran talks"]');
  const tile = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === 'Veteran talks');
  const owner = region ?? tile, anchor = owner?.parentElement;
  const describe = node => {
    const box = rect(node), clippedBy = [];
    for (let p = node.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX) && (box.x < b.x + p.clientLeft - 0.5 || box.right > b.x + p.clientLeft + p.clientWidth + 0.5))
        clippedBy.push({ tag: p.tagName, rect: rect(p), scrollLeft: p.scrollLeft });
    }
    return { label: node.getAttribute('aria-label') ?? node.textContent.trim(), rect: box, clippedBy, disabled: !!node.disabled };
  };
  const fragments = node => {
    if (!node) return [];
    const found = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      for (const r of range.getClientRects()) {
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        found.push({ x: r.x, y: r.y, right: r.right, bottom: r.bottom, painted: !!hit && (hit === node || node.contains(hit)) });
      }
    }
    return found;
  };
  const role = region ? [...region.querySelectorAll('p')].find(node => node.textContent.startsWith('Current role: ')) : null;
  const rule = region ? [...region.querySelectorAll('p')].find(node => node.textContent.startsWith('At your season review, ask'))?.parentElement : null;
  const terms = region?.querySelector('dl')?.parentElement;
  const status = region ? [...region.querySelectorAll('[role="status"]')].find(node => ['Agreed', 'Declined'].includes(node.textContent.trim()))?.textContent.trim() ?? null : null;
  return { viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY,
      documentWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight, maxScrollY: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight) },
    theme: { light: document.documentElement.classList.contains('light'), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'),
      faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    anchor: anchor ? rect(anchor) : null, open: !!region, status,
    targets: [...(region ? region.querySelectorAll('button,select') : tile ? [tile] : [])].filter(visible).map(describe),
    roleText: role?.textContent.trim() ?? null, rulesText: rule?.textContent.trim() ?? null,
    ruleFragments: fragments(rule), termFragments: fragments(terms),
    terms: region ? { fee: region.querySelector('[data-testid="veteran-renewal-fee"]')?.textContent.trim() ?? null,
      wage: region.querySelector('[data-testid="veteran-renewal-wage"]')?.textContent.trim() ?? null,
      years: region.querySelector('[data-testid="veteran-renewal-years"]')?.textContent.trim() ?? null } : null,
    alerts: [...document.querySelectorAll('[role="alert"]')].filter(visible).map(node => node.textContent.trim()),
    active: document.activeElement ? { tag: document.activeElement.tagName,
      label: document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent.trim() } : null };
}
function layout(sample) {
  assert(sample.viewport.documentWidth <= sample.viewport.width + 1, 'CM_VETERAN_NO_DOCUMENT_X_OVERFLOW');
  for (const target of sample.targets) {
    assert(target.rect.width >= 44 && target.rect.height >= 44, 'CM_VETERAN_FEATURE_TARGET_44');
    assert.deepEqual(target.clippedBy, [], 'CM_VETERAN_FEATURE_NO_X_CLIP');
  }
  checkFonts(sample.fonts);
}
function painted(target) {
  assert(target.rect.width >= 44 && target.rect.height >= 44, 'CM_VETERAN_USED_TARGET_44');
  assert(target.rect.x >= 0 && target.rect.y >= 0 && target.rect.right <= target.viewport.width && target.rect.bottom <= target.viewport.height, 'CM_VETERAN_USED_TARGET_IN_VIEW');
  assert(target.painted, 'CM_VETERAN_USED_TARGET_PAINTED');
  assert.deepEqual(target.clippedBy, [], 'CM_VETERAN_USED_TARGET_NO_ANCESTOR_CLIP');
}
function readable(lines, viewport) {
  assert(lines.length > 0, 'CM_VETERAN_ACTUAL_TEXT_FRAGMENTS');
  for (const line of lines) {
    assert(line.x >= -0.5 && line.y >= -0.5 && line.right <= viewport.width + 0.5 && line.bottom <= viewport.height + 0.5,
      'CM_VETERAN_SELECTED_TEXT_IN_VIEW');
    assert(line.painted, 'CM_VETERAN_SELECTED_TEXT_UNOBSCURED');
  }
}
function unchanged(record) {
  assert.equal(record.after.raw, record.before.raw, 'CM_VETERAN_NEUTRAL_RAW_HELD');
  assert.equal(record.after.identity, record.before.identity, 'CM_VETERAN_NEUTRAL_IDENTITY_HELD');
  assert.equal(record.after.draws, record.before.draws, 'CM_VETERAN_REVIEW_ZERO_RNG');
  assert.equal(record.after.actions.length, record.before.actions.length, 'CM_VETERAN_NEUTRAL_NO_ACTION');
  assert.equal(record.after.writes.length, record.before.writes.length, 'CM_VETERAN_NEUTRAL_NO_WRITE');
}
function publication(state) {
  const latest = state.transitions.filter(row => row.identity === state.identity).at(-1);
  assert(latest && latest.phase === 'seasonEnd', 'CM_VETERAN_ACTUAL_LAYOUT_PUBLICATION');
  assert.deepEqual(JSON.parse(latest.raw), JSON.parse(latest.careerJSON), 'CM_VETERAN_DISK_BEFORE_PUBLICATION');
  assert.deepEqual(JSON.parse(latest.raw), state.career, 'CM_VETERAN_DISK_BEFORE_PUBLICATION');
}
function truthfulStatus(state, sample) {
  if (sample.status === null) return;
  const decision = sample.status === 'Agreed' ? 'agreed' : 'declined';
  assert(state.savedReview?.decision === decision, 'CM_VETERAN_STATUS_REQUIRES_PUBLISHED_LEDGER');
  const disk = JSON.parse(state.raw).veteranReviews;
  assert(disk && Array.isArray(disk.reviews) && disk.reviews.some(row =>
    row.decision === decision && row.club === state.career.clubName && row.season === state.career.season
    && JSON.stringify(row.identity) === JSON.stringify(state.savedReview.identity)), 'CM_VETERAN_STATUS_REQUIRES_PUBLISHED_LEDGER');
  publication(state);
}
function phaseHeld(record) {
  assert.equal(record.after.phase, 'seasonEnd', 'CM_VETERAN_PHASE_HELD');
  assert.equal(record.after.phase, record.before.phase, 'CM_VETERAN_PHASE_HELD');
  assert.equal(record.after.summaryIdentity, record.before.summaryIdentity, 'CM_VETERAN_SUMMARY_HELD');
  assert.equal(record.after.summaryJSON, record.before.summaryJSON, 'CM_VETERAN_SUMMARY_HELD');
}
function saved(record, decision) {
  const { before: b, after: a } = record, action = a.actions.at(-1);
  assert(action?.settled && action.ok === true, 'CM_VETERAN_ACTUAL_WRITE_ACK');
  assert.equal(a.draws, b.draws, 'CM_VETERAN_REVIEW_ZERO_RNG');
  assert.equal(a.role, b.role, 'CM_VETERAN_CURRENT_ROLE_HELD');
  assert.equal(a.player.role, b.player.role, 'CM_VETERAN_CURRENT_ROLE_HELD');
  phaseHeld(record);
  assert.notEqual(a.raw, b.raw, 'CM_VETERAN_ACTUAL_RAW_CHANGED');
  assert.notEqual(a.identity, b.identity, 'CM_VETERAN_ACTUAL_SAVED_PUBLICATION');
  assert.equal(action.playerId, b.playerId);
  assert.equal(action.beforeIdentity, b.identity);
  assert.equal(action.beforeRaw, b.raw);
  assert.equal(action.beforeJSON, JSON.stringify(b.career));
  assert.equal(action.beforeDraws, b.draws);
  assert.equal(action.afterDraws, a.draws);
  assert(action.expectedJSON, 'CM_VETERAN_ACTUAL_PURE_CANDIDATE');
  assert.deepEqual(a.career, JSON.parse(action.expectedJSON), 'CM_VETERAN_EXACT_ACTUAL_CANDIDATE');
  assert.deepEqual(JSON.parse(a.raw), a.career, 'CM_VETERAN_NATIVE_RAW_CURRENT_CAREER');
  assert.equal(a.savedReview?.decision, decision, 'CM_VETERAN_ACTUAL_PUBLISHED_DECISION');
  assert.equal(record.sample.status, decision === 'agreed' ? 'Agreed' : 'Declined', 'CM_VETERAN_VISIBLE_SAVED_DECISION');
  truthfulStatus(a, record.sample);
}
function refused(record) {
  const { before: b, after: a } = record;
  assert(a.faults > b.faults, 'CM_VETERAN_NATIVE_QUOTA_FAULT_FIRED');
  assert.equal(a.identity, b.identity, 'CM_VETERAN_REFUSED_NO_PUBLICATION');
  assert.equal(a.raw, b.raw, 'CM_VETERAN_REFUSED_RAW_HELD');
  assert.deepEqual(a.career, b.career, 'CM_VETERAN_REFUSED_MEMORY_HELD');
  assert.equal(a.actions.at(-1)?.ok, false, 'CM_VETERAN_REFUSED_ACTION_FALSE');
  assert(a.actions.at(-1)?.expectedJSON, 'CM_VETERAN_REFUSED_HEALTHY_CANDIDATE');
  assert(a.writes.slice(b.writes.length).some(row => row.refused), 'CM_VETERAN_NATIVE_QUOTA_FAULT_FIRED');
  assert.equal(a.draws, b.draws, 'CM_VETERAN_REVIEW_ZERO_RNG');
  phaseHeld(record);
  truthfulStatus(a, record.sample);
  assert(record.sample.alerts.includes('That talk was not saved. Try again from the current season review.'),
    'CM_VETERAN_REFUSAL_VISIBLE_COPY');
}
function terms(record) {
  assert.equal(record.sample.roleText, 'Current role: ' + record.fixture.roleLabel, 'CM_VETERAN_ACTUAL_ROLE_VISIBLE');
  assert.deepEqual(record.sample.terms, record.fixture.renewalDisplay, 'CM_VETERAN_RENEWAL_TERMS_VISIBLE');
  readable(record.sample.termFragments, record.sample.viewport);
}
function backFocus(record) {
  assert.equal(record.afterSample.open, false, 'CM_VETERAN_BACK_RETURNS_FOLDED_TILE');
  assert.equal(record.afterSample.active?.label, 'Veteran talks', 'CM_VETERAN_BACK_FOCUS_RETURNED');
  for (const sample of [record.beforeSample, record.afterSample]) {
    const p = sample.anchor;
    assert(p && p.width > 0 && p.height > 0 && p.x < sample.viewport.width && p.right > 0
      && p.y < sample.viewport.height && p.bottom > 0, 'CM_VETERAN_BACK_VISIBLE_ANCHOR');
  }
  for (const key of ['x', 'y', 'width'])
    assert(Math.abs(record.afterSample.anchor[key] - record.beforeSample.anchor[key]) <= 0.5, 'CM_VETERAN_BACK_NO_VISIBLE_JUMP');
  assert(Math.abs(record.afterSample.viewport.scrollX - record.beforeSample.viewport.scrollX) <= 0.5, 'CM_VETERAN_BACK_HORIZONTAL_HELD');
  unchanged(record);
}
async function target(page, row, locator) {
  const beforeScroll = await page.evaluate(collect);
  await locator.scrollIntoViewIfNeeded();
  await idle(page);
  const actual = await locator.evaluate(node => {
    const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2), clippedBy = [];
    for (let p = node.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX) && (r.x < b.x + p.clientLeft - 0.5 || r.right > b.x + p.clientLeft + p.clientWidth + 0.5)
        || /auto|scroll|hidden|clip/.test(s.overflowY) && (r.y < b.y + p.clientTop - 0.5 || r.bottom > b.y + p.clientTop + p.clientHeight + 0.5))
        clippedBy.push({ tag: p.tagName, x: b.x, y: b.y, width: b.width, height: b.height, scrollTop: p.scrollTop, scrollLeft: p.scrollLeft });
    }
    return { rect: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
      viewport: { width: innerWidth, height: innerHeight }, painted: !!hit && (hit === node || node.contains(hit)), clippedBy };
  });
  row.beforeInputs.push({ beforeScroll, afterScroll: await page.evaluate(collect), target: actual });
  painted(actual); return actual;
}
async function click(page, row, locator) { await target(page, row, locator); await locator.click(); await idle(page); }
async function reveal(page, row, locator, label) {
  const before = await page.evaluate(collect); await locator.scrollIntoViewIfNeeded(); await idle(page);
  row.deliberateScrolls.push({ label, before, after: await page.evaluate(collect) });
}
async function settle(page, row) {
  await page.waitForFunction(() => { const value = window.__CM_VETERAN_FIXTURE__?.read(); return value && value.phase !== 'boot'; });
  if (await button(page, 'Resume actual saved career').count()) await click(page, row, button(page, 'Resume actual saved career'));
  await page.waitForFunction(() => window.__CM_VETERAN_FIXTURE__.read().phase === 'seasonEnd');
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
  // Wait for actual finite CSS arrivals. No animation, rAF or page clock is replaced.
  await page.waitForFunction(() => document.getAnimations().every(animation =>
    animation.playState !== 'running' || !Number.isFinite(Number(animation.effect?.getTiming().iterations ?? 1))), null, { timeout: 10000 });
  await idle(page);
}
async function selectVeteran(page, row) {
  const region = page.getByRole('region', { name: 'Veteran talks', exact: true });
  const select = region.getByRole('combobox');
  assert.equal(await select.count(), 1, 'CM_VETERAN_ONE_ACTUAL_COMBOBOX');
  await target(page, row, select); await select.focus();
  const wanted = (await read(page)).playerId;
  const choices = await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
  const index = choices.indexOf(wanted); assert(index > 0, 'CM_VETERAN_ACTUAL_SELECT_OPTION');
  await page.keyboard.press('Home');
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await idle(page);
  assert.equal(await select.inputValue(), wanted, 'CM_VETERAN_NATIVE_SELECT_COMMITTED');
  await select.press('Tab');
  assert.equal(await select.inputValue(), wanted, 'CM_VETERAN_NATIVE_SELECT_COMMITTED');
}
async function open(page, row) { await click(page, row, button(page, 'Veteran talks')); await selectVeteran(page, row); }
async function snapshot(page, row, stage) {
  await idle(page);
  const sample = await page.evaluate(collect), fixture = await read(page), name = row.id + '-' + stage;
  await page.screenshot({ path: path.join(BROWSER, name + '.png') });
  const raw = save(name + '.json', { stage, fixture, sample });
  row.snapshots.push({ stage, raw, png: name + '.png', sample });
  layout(sample); truthfulStatus(fixture, sample);
  return { fixture, sample };
}
async function ask(page, row, expectSaved) {
  const askButton = button(page, 'Ask for one more season');
  await target(page, row, askButton);
  const before = await read(page);
  await askButton.click();
  await page.waitForFunction(() => window.__CM_VETERAN_FIXTURE__.read().actions.at(-1)?.settled === true);
  if (expectSaved) await page.getByRole('region', { name: 'Veteran talks', exact: true })
    .getByText(expectSaved === 'agreed' ? 'Agreed' : 'Declined', { exact: true }).waitFor();
  else await page.getByText('That talk was not saved. Try again from the current season review.', { exact: true }).waitFor();
  await idle(page);
  return { before, after: await read(page), sample: await page.evaluate(collect) };
}
async function actionsJourney(page, row) {
  await page.goto(BASE + '/cmVeteran.html?case=renewal&theme=' + row.theme, { waitUntil: 'networkidle' });
  await settle(page, row);
  await target(page, row, button(page, 'Veteran talks'));
  assert.equal((await read(page)).player.age, 36, 'CM_VETERAN_DECLARED_36_YEAR_FOUNDATION');
  await snapshot(page, row, 'folded-review');
  const beforeBrowse = await read(page);
  await open(page, row);
  const region = page.getByRole('region', { name: 'Veteran talks', exact: true });
  const termsGroup = region.locator('[data-testid="veteran-renewal-fee"]').locator('..').locator('..').locator('..');
  await reveal(page, row, termsGroup, 'actual role and renewal terms');
  const termRecord = await snapshot(page, row, 'renewal-terms'); terms(termRecord); row.terms = termRecord;
  assert(termRecord.fixture.preview.kind === 'offer' && termRecord.fixture.preview.decision === 'agreed', 'CM_VETERAN_ACTUAL_AGREEMENT_OFFER');
  const help = button(page, 'Veteran talk rules');
  assert.equal(await help.getAttribute('aria-expanded'), 'true', 'CM_VETERAN_RULES_BEFORE_ASK');
  await click(page, row, help); await click(page, row, help);
  assert.equal(await help.getAttribute('aria-expanded'), 'true', 'CM_VETERAN_REOPENABLE_RULES');
  const ruleGroup = region.getByText('At your season review, ask an owned player aged 31 to 41 to stay for the next season. An agreement protects this summer rollover once in the career. Aging and rating decline still apply.', { exact: true }).locator('..');
  await reveal(page, row, ruleGroup, 'actual reopened instructions');
  const ruleRecord = await snapshot(page, row, 'rules-reopened');
  assert(ruleRecord.sample.rulesText.includes('Example: a fictional 36 year old with three contract years'), 'CM_VETERAN_ACTUAL_WORKED_EXAMPLE');
  readable(ruleRecord.sample.ruleFragments, ruleRecord.sample.viewport);
  const browse = { before: beforeBrowse, after: await read(page) }; unchanged(browse); row.neutral.push(browse);
  await click(page, row, button(page, 'Storage fault off'));
  const failure = await ask(page, row, null); refused(failure); row.faults.push(failure);
  await reveal(page, row, page.getByText('That talk was not saved. Try again from the current season review.', { exact: true }), 'actual quota refusal');
  await snapshot(page, row, 'quota-refused');
  await click(page, row, button(page, 'Storage fault on'));
  const paid = await ask(page, row, 'agreed'); saved(paid, 'agreed'); row.saved.push(paid);
  await snapshot(page, row, 'agreement-saved');
  const back = button(page, 'Back to season review');
  const beforeBackPreparation = await page.evaluate(collect);
  await back.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  row.deliberateScrolls.push({ label: 'Back target centre preparation', before: beforeBackPreparation, after: await page.evaluate(collect) });
  await target(page, row, back); await back.focus();
  const before = await read(page), beforeSample = await page.evaluate(collect);
  await page.keyboard.press('Enter'); await idle(page);
  const returned = { before, after: await read(page), beforeSample, afterSample: await page.evaluate(collect) };
  backFocus(returned); row.back = returned;
  await snapshot(page, row, 'back-focused');
  const savedRaw = returned.after.raw, savedCareer = returned.after.career;
  const reload = button(page, 'Reload saved fixture'); await target(page, row, reload);
  await Promise.all([page.waitForEvent('load'), reload.click()]);
  await settle(page, row);
  const loaded = await read(page);
  assert.equal(loaded.raw, savedRaw, 'CM_VETERAN_SAVED_RELOAD_RAW_EXACT');
  assert.deepEqual(loaded.career, savedCareer, 'CM_VETERAN_SAVED_RELOAD_CAREER_EXACT');
  await open(page, row);
  assert(await button(page, 'Ask for one more season').isDisabled(), 'CM_VETERAN_SAVED_RELOAD_NO_SECOND_TALK');
  assert.equal((await read(page)).actions.length, 0, 'CM_VETERAN_SAVED_RELOAD_NO_ACTION');
  await reveal(page, row, region.getByText('Agreed', { exact: true }), 'actual reloaded agreement');
  await snapshot(page, row, 'saved-reloaded');
}
async function extraJourneys(page, row) {
  await page.goto(BASE + '/cmVeteran.html?case=decline&theme=' + row.theme, { waitUntil: 'networkidle' });
  await settle(page, row); await open(page, row);
  const declined = await ask(page, row, 'declined'); saved(declined, 'declined');
  assert.equal(declined.after.career.budget, declined.before.career.budget, 'CM_VETERAN_DECLINE_NO_CHARGE');
  assert.deepEqual(declined.after.player, declined.before.player, 'CM_VETERAN_DECLINE_PLAYER_HELD');
  row.decline = declined; await snapshot(page, row, 'decline-saved');
  await page.goto(BASE + '/cmVeteran.html?case=future&theme=' + row.theme, { waitUntil: 'networkidle' });
  await settle(page, row);
  const before = await read(page); await open(page, row);
  assert(await button(page, 'Ask for one more season').isDisabled(), 'CM_VETERAN_FUTURE_TALK_DISABLED');
  const after = await read(page), held = { before, after }; unchanged(held);
  assert.equal(after.career.veteranReviews.v, 2, 'CM_VETERAN_FUTURE_RAW_NOT_REPAIRED');
  assert.equal(after.preview.kind, 'blocked', 'CM_VETERAN_FUTURE_ACTUAL_REFUSAL');
  row.future = held; await snapshot(page, row, 'future-held');
}
function checkFlagFailures(row) {
  const errorTexts = ['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector'];
  const consoleTexts = errorTexts.map(text => 'Failed to load resource: ' + text);
  const exactFlag = item => {
    const url = new URL(item.url);
    assert.equal(url.origin, 'https://flagcdn.com', 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert(!url.username && !url.password && !url.search && !url.hash, 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert(/^\/w(?:20|40|80|160|320)\/[a-z]{2}(?:-[a-z]+)?\.png$/.test(url.pathname), 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert.equal(item.method, 'GET', 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert.equal(item.type, 'image', 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
  };
  row.flagFallbacks.forEach(exactFlag);
  row.requestFailures.forEach(item => {
    exactFlag(item);
    assert(errorTexts.includes(item.errorText), 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
  });
  const requestKey = item => JSON.stringify([item.url, item.method, item.type]);
  assert.deepEqual(row.requestFailures.map(requestKey).sort(), row.flagFallbacks.map(requestKey).sort(), 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
  const errors = row.consoleMessages.filter(item => item.type === 'error');
  for (const item of errors) {
    assert(consoleTexts.includes(item.text), 'CM_UI_ONLY_EXPECTED_FLAG_CONSOLE');
    assert.equal(typeof item.location.url, 'string', 'CM_UI_ONLY_EXPECTED_FLAG_CONSOLE');
  }
  assert.deepEqual(errors.map(item => item.location.url).sort(), row.flagFallbacks.map(item => item.url).sort(), 'CM_UI_ONLY_EXPECTED_FLAG_CONSOLE');
}
let browser, server, timer;
const serverOut = fs.openSync(path.join(BROWSER, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(BROWSER, 'server.stderr'), 'wx');
fs.writeFileSync(path.join(BROWSER, 'server.transport'), '', { flag: 'wx' });
try {
  timer = setTimeout(() => { report.errors.push('CM_BROWSER_INTERNAL_8_MINUTE_TIMEOUT'); void browser?.close(); }, 8 * 60 * 1000);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { cwd: ROOT,
    env: { ...process.env, SIM_OFFLINE_RECEIPT: path.join(BROWSER, 'server.transport') }, stdio: ['ignore', serverOut, serverErr] });
  let ready = false;
  for (let i = 0; i < 40; i += 1) {
    try { const r = await fetch(BASE + '/cmVeteran.html'); if (r.status === 200 && sha(Buffer.from(await r.arrayBuffer())) === files.get('/cmVeteran.html').sha256) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'CM_SETUP_SERVER_BODY');
  browser = await pw.chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  report.chromium = browser.version();
  for (const spec of specs) {
    const row = { ...spec, complete: false, requests: [], flagFallbacks: [], requestFailures: [], consoleMessages: [],
      blocked: [], errors: [], snapshots: [], beforeInputs: [], deliberateScrolls: [], faults: [], saved: [], neutral: [],
      terms: null, back: null, decline: null, future: null };
    report.contexts.push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
      hasTouch: spec.width < 600, isMobile: spec.width < 600, colorScheme: spec.theme,
      reducedMotion: spec.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', locale: 'en-US' });
    const pending = new Set();
    await context.routeWebSocket('**/*', socket => {
      const work = (async () => {
        const url = socket.url();
        row.blocked.push({ kind: 'unknown-websocket', urlSha256: sha(url), urlBytes: Buffer.byteLength(url),
          action: 'local-close1008-no-server-connection' });
        await socket.close({ code: 1008, reason: 'Offline retirement fixture refuses WebSockets.' });
      })();
      const tracked = work.catch(error => row.errors.push(String(error)));
      pending.add(tracked); void tracked.then(() => pending.delete(tracked)); return tracked;
    });
    await context.route('**/*', route => {
      const work = (async () => {
        const request = route.request(), url = new URL(request.url());
        const seen = { url: request.url(), method: request.method(), type: request.resourceType() }; row.requests.push(seen);
        try {
          assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null); assert(!url.username && !url.password && !url.hash);
          if (fonts.has(request.url())) {
            const font = fonts.get(request.url()); seen.font = { file: font.file, bytes: font.body.length, sha256: sha(font.body) };
            await route.fulfill({ status: 200, body: font.body, contentType: font.contentType,
              headers: { 'access-control-allow-origin': '*' } }); return;
          }
          if (url.origin === 'https://flagcdn.com' && /^\/w(?:20|40|80|160|320)\/[a-z]{2}(?:-[a-z]+)?\.png$/.test(url.pathname)
            && !url.search && request.resourceType() === 'image') {
            row.flagFallbacks.push(seen); await route.abort('blockedbyclient'); return;
          }
          assert.equal(url.origin, BASE, 'CM_TRANSPORT_UNKNOWN_OR_BACKEND');
          const physical = files.get(url.pathname); assert(physical, 'CM_TRANSPORT_EXACT_FIXTURE_FILE');
          if (url.pathname === '/cmVeteran.html') {
            assert.deepEqual([...url.searchParams.keys()].sort(), ['case', 'theme']);
            assert(['renewal', 'decline', 'future'].includes(url.searchParams.get('case')));
            assert.equal(url.searchParams.get('theme'), spec.theme);
          } else assert.equal(url.search, '');
          const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
          try {
            assert.equal(response.status(), 200); assert.equal(response.url(), request.url());
            const body = await response.body(); assert.equal(body.length, physical.bytes); assert.equal(sha(body), physical.sha256);
            seen.body = { file: physical.file, bytes: body.length, sha256: sha(body) };
            await route.fulfill({ response, body });
          } finally { await response.dispose(); }
        } catch (error) { row.blocked.push({ ...seen, error: String(error) }); await route.abort('blockedbyclient'); }
      })();
      const tracked = work.catch(error => row.errors.push(String(error)));
      pending.add(tracked); void tracked.then(() => pending.delete(tracked)); return tracked;
    });
    let page;
    try {
      page = await context.newPage();
      page.on('pageerror', error => row.errors.push('pageerror: ' + error.message));
      page.on('requestfailed', request => row.requestFailures.push({ url: request.url(), method: request.method(),
        type: request.resourceType(), errorText: request.failure()?.errorText ?? null }));
      page.on('console', message => {
        const text = message.text(), type = message.type(), location = message.location();
        row.consoleMessages.push({ type, text, location });
        if (type === 'error' && !['Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
          'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector'].includes(text)) row.errors.push('console: ' + text);
      });
      await actionsJourney(page, row);
      if (spec.id === specs[0].id) await extraJourneys(page, row);
      const events = row.saved[0].after.events;
      assert(events.length > 0 && events.every(event => event.trusted), 'CM_VETERAN_NATIVE_TRUSTED_INPUT');
      assert(events.some(event => event.type === 'change') && events.some(event =>
        event.type === 'click' && event.label === 'Ask for one more season'), 'CM_VETERAN_NATIVE_SELECT_AND_ASK');
      assert.deepEqual(row.blocked, [], 'CM_VETERAN_NO_UNKNOWN_NETWORK');
      assert.deepEqual(row.errors, [], 'CM_VETERAN_NO_BROWSER_ERRORS');
      assert.equal(row.faults.length, 1); assert.equal(row.saved.length, 1);
      assert.equal(row.snapshots.length, spec.id === specs[0].id ? 9 : 7);
      row.complete = true;
    } catch (error) {
      const message = String(error.stack || error);
      row.errors.push(message);
      row.failure = { message, png: null, raw: null, sample: 'UNKNOWN', fixture: 'UNKNOWN', captureErrors: [] };
      if (page && !page.isClosed()) {
        try {
          const name = spec.id + '-failure.png';
          await page.screenshot({ path: path.join(BROWSER, name) }); row.failure.png = name;
        } catch (captureError) { row.failure.captureErrors.push('png: ' + String(captureError)); }
        try { row.failure.sample = await page.evaluate(collect); }
        catch (captureError) { row.failure.captureErrors.push('sample: ' + String(captureError)); }
        try { row.failure.fixture = await read(page); }
        catch (captureError) { row.failure.captureErrors.push('fixture: ' + String(captureError)); }
        try { row.failure.raw = save(spec.id + '-failure.json', row.failure); }
        catch (captureError) { row.failure.captureErrors.push('raw: ' + String(captureError)); }
      }
    }
    finally {
      await context.close(); await Promise.allSettled([...pending]);
      try { checkFlagFailures(row); } catch (error) { row.errors.push(String(error.stack || error)); }
      save(spec.id + '.json', row);
    }
    assert.deepEqual(row.blocked, [], 'CM_VETERAN_NO_UNKNOWN_NETWORK_AFTER_CLOSE');
    assert(row.complete && row.errors.length === 0, 'CM_VETERAN_CONTEXT_COMPLETE_' + spec.id);
  }
  const first = report.contexts[0];
  const recipes = [
    ['quota-published', first.faults[0], c => { c.after.identity += 1; }, refused, 'CM_VETERAN_REFUSED_NO_PUBLICATION'],
    ['quota-raw-overwritten', first.faults[0], c => { c.after.raw += ' '; }, refused, 'CM_VETERAN_REFUSED_RAW_HELD'],
    ['native-quota-not-fired', first.faults[0], c => { c.after.faults = c.before.faults; }, refused, 'CM_VETERAN_NATIVE_QUOTA_FAULT_FIRED'],
    ['review-rng-used', first.saved[0], c => { c.after.draws += 1; }, c => saved(c, 'agreed'), 'CM_VETERAN_REVIEW_ZERO_RNG'],
    ['current-role-changed', first.saved[0], c => { c.after.role = 'changed'; }, c => saved(c, 'agreed'), 'CM_VETERAN_CURRENT_ROLE_HELD'],
    ['disk-late-publication', first.saved[0].after, c => {
      c.transitions.filter(row => row.identity === c.identity).at(-1).raw = '{}';
    }, publication, 'CM_VETERAN_DISK_BEFORE_PUBLICATION'],
    ['used-target-obscured', first.beforeInputs[0].target, c => { c.painted = false; }, painted, 'CM_VETERAN_USED_TARGET_PAINTED'],
    ['used-target-short', first.beforeInputs[0].target, c => { c.rect.height = 43; }, painted, 'CM_VETERAN_USED_TARGET_44'],
    ['back-focus-lost', first.back, c => { c.afterSample.active.label = 'Wrong target'; }, backFocus, 'CM_VETERAN_BACK_FOCUS_RETURNED'],
    ['back-visible-jump', first.back, c => { c.afterSample.anchor.y += 2; }, backFocus, 'CM_VETERAN_BACK_NO_VISIBLE_JUMP'],
    ['false-success-on-quota', first.faults[0], c => { c.sample.status = 'Agreed'; }, refused, 'CM_VETERAN_STATUS_REQUIRES_PUBLISHED_LEDGER'],
    ['unexpected-failed-request', first, c => {
      c.requestFailures.push({ url: BASE + '/unexpected.js', method: 'GET', type: 'script', errorText: 'net::ERR_FAILED' });
    }, checkFlagFailures, 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS'],
    ['future-raw-repaired', first.future, c => { c.after.raw += ' '; }, unchanged, 'CM_VETERAN_NEUTRAL_RAW_HELD'],
    ['renewal-terms-invented', first.terms, c => { c.sample.terms.fee += ' changed'; }, terms, 'CM_VETERAN_RENEWAL_TERMS_VISIBLE'],
    ['review-phase-changed', first.saved[0], c => { c.after.phase = 'hub'; }, c => saved(c, 'agreed'), 'CM_VETERAN_PHASE_HELD'],
  ];
  for (const [id, actual, mutate, check, marker] of recipes) {
    assert(actual, 'CM_VETERAN_CONTROL_ACTUAL_RECORD_' + id);
    const copy = JSON.parse(JSON.stringify(actual)), original = JSON.stringify(copy); mutate(copy);
    assert.notEqual(JSON.stringify(copy), original, 'CM_VETERAN_CONTROL_CHANGED_' + id);
    assert.throws(() => check(copy), error => error instanceof assert.AssertionError && error.message.includes(marker),
      'CM_VETERAN_CONTROL_OWNED_' + id);
    report.controls.push({ id, changed: true, marker, passed: true, scope: 'copied actual browser records only' });
  }
  assert.equal(report.contexts.length, 6); assert(report.contexts.every(row => row.complete));
  assert.equal(report.contexts.flatMap(row => row.snapshots).length, 44, 'CM_VETERAN_FORTY_FOUR_ORIGINAL_SCREENSHOTS');
  assert.equal(report.controls.length, 15, 'CM_VETERAN_FIFTEEN_EFFECTIVE_RECORD_CONTROLS');
  report.status = 'CM_VETERAN_BROWSER_COMPLETE'; report.complete = true;
} catch (error) { report.errors.push(String(error.stack || error)); report.status = 'failed'; }
finally {
  clearTimeout(timer);
  try { if (browser) await browser.close(); } catch (error) { report.errors.push(String(error)); }
  if (server) {
    const running = () => server.exitCode === null && server.signalCode === null;
    let cleanupTimer;
    const exited = new Promise(resolve => {
      if (!running()) resolve({ code: server.exitCode, signal: server.signalCode });
      else server.once('exit', (code, signal) => resolve({ code, signal }));
    });
    const requested = running() ? server.kill('SIGTERM') : false;
    const outcome = await Promise.race([
      exited.then(actual => ({ deadlineReached: false, ...actual })),
      new Promise(resolve => { cleanupTimer = setTimeout(() => resolve({ deadlineReached: true }), 5000); }),
    ]);
    clearTimeout(cleanupTimer);
    const timedOut = outcome.deadlineReached && running();
    if (timedOut) { server.kill('SIGKILL'); report.errors.push('CM_SERVER_CLEANUP_TIMEOUT'); }
    report.serverShutdown = { requested, ...outcome, exitCode: server.exitCode, signalCode: server.signalCode, timedOut };
  }
  fs.closeSync(serverOut); fs.closeSync(serverErr);
  try {
    const after = inventories(); report.after = save('inputs.after.json', after);
    assert.deepEqual(after, before, 'CM_HOLDS_ALL_INPUTS');
    assert.equal(sha(fs.readFileSync(process.execPath)), tools.nodeSha256);
    assert.equal(sha(fs.readFileSync(packagePath)), tools.playwrightPackageSha256);
    assert.equal(sha(fs.readFileSync(executable)), tools.executableSha256);
    assert.equal(fs.statSync(receipt).size, 0, 'CM_HOLDS_EMPTY_DRIVER_TRANSPORT');
    const serverTransport = path.join(BROWSER, 'server.transport');
    assert(fs.existsSync(serverTransport) && fs.statSync(serverTransport).size === 0, 'CM_HOLDS_EMPTY_SERVER_TRANSPORT');
    report.holds = { unchanged: true };
  } catch (error) { report.errors.push(String(error.stack || error)); report.holds = { unchanged: false }; }
  report.complete = report.complete && report.errors.length === 0 && report.holds.unchanged;
  if (!report.complete) report.status = 'failed';
  save('report.json', report);
  fs.writeFileSync(path.join(BROWSER, 'evidence.sha256'), inventory(BROWSER).map(row => row.sha256 + '  ' + row.file).join('\n') + '\n', { flag: 'wx' });
}
console.log('Veteran review actual summary fixture: ' + report.status + ', ' + report.contexts.filter(row => row.complete).length + '/6 contexts, ' + report.controls.length + '/15 copied-record controls.');
if (!report.complete) process.exitCode = 1;
