/* Actual Club Manager saved reply deadlines, remote CI only.
 * Source-built cards are prepared before an actual engine kickoff.
 * No automatic card delivery or completed UI match is credited.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Manager deadline browser execution requires remote offline CI.');
assert(process.env.MANAGER_DEADLINE_PHASE === 'fixed', 'This browser proof runs only after a qualified baseline and fixed product.');
assert(process.env.MANAGER_DEADLINE_OUT && path.isAbsolute(process.env.MANAGER_DEADLINE_OUT), 'MANAGER_DEADLINE_OUT must be an absolute artifact root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.MANAGER_DEADLINE_OUT, OUT = path.join(ARTIFACTS, 'browser');
const MODEL = path.join(OUT, 'models'), REPORT = path.join(OUT, 'report.json');
const KEY = 'dukb-club-manager-save', NOW = Date.parse('2026-10-13T16:00:00Z');
const PARENT = '1ed26406af9e95b87cd617d490dbf40a2f7d7452';
const DEADLINE = 'The next match has already kicked off, so the reply window closed. Nothing changed.';
const ADVICE = 'Answer before your next match. Anything left open closes with nothing changed.';
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const SPECS = [
  { scope: 'board', deckId: 'schoolVisit', option: 0, delta: 2, label: 'Go yourself (board patience +2)' },
  { scope: 'press', deckId: 'columnist', option: 0, delta: 3, label: 'Answer it calmly at the next presser (press mood +3)' },
  { scope: 'morale', deckId: 'quietWord', option: 0, delta: 6, label: 'Take him for a coffee (his morale +6)' },
  { scope: 'budget', deckId: 'promoShoot', option: 0, delta: 0.2, label: 'Do the shoot (£200k into the transfer budget)' },
  { scope: 'decline', deckId: 'schoolVisit', option: 1, delta: 0, label: 'Send a signed shirt instead (nothing changes)' },
];
const require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = file => sha(fs.readFileSync(file));
const stateHash = state => sha(JSON.stringify(state));
const copy = value => JSON.parse(JSON.stringify(value));
fs.mkdirSync(MODEL, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to replace an existing browser proof.');
const report = { status: 'running', phase: 'fixed', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  parentAppRef: PARENT, clock: new Date(NOW).toISOString(), checks: 0, failures: 0, setupFailures: 0, cases: [], controls: [], fixtures: [],
  inventory: [], issues: [], sourceHeld: false, modelHeld: false, installedHeld: false, toolsHeld: false, fontsHeld: false, distHeld: false,
  limits: ['Signed out, selected local saved replies only; no backend activity or completion is credited.',
    'Source-built decision presentation is prepared before the real engine kickoff, not naturally delivered by the offer gate.',
    'One simulated morale subject is prepared at 40; medical, physical, contract and football records remain initialized.',
    'Actual initialization, calendar steps, kickoff, save and reload are model actions; a complete UI career or match is not claimed.',
    'The paused live match is held exactly through reply and reload. Its real Resume match action is offered but not played here.',
    'Every reply has an independently literal complete-state oracle and consumes zero RNG draws.',
    'External requests are aborted except declared retained fonts; external flag appearance is not visually qualified.',
    'Original captures cover selected inbox cards and closure, not blanket visual or manual acceptance.'] };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
function check(condition, message, row) {
  report.checks++; if (row) row.checks++;
  if (!condition) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!condition;
}
function setup(condition, message) { report.checks++; if (!condition) { report.setupFailures++; throw new Error(message); } }
const retained = [];
const modelProgress = [];
function recordModel(stage, value) {
  modelProgress.push(copy({ stage, ...value }));
  fs.writeFileSync(path.join(MODEL, 'progress.json'), JSON.stringify(modelProgress, null, 2) + '\n');
}
function retain(relative, value) {
  const file = path.join(OUT, relative); assert(!fs.existsSync(file), 'Refuse to replace retained model ' + relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  retained.push({ file: relative, filename: file, bytes: fs.statSync(file).size, sha256: fileHash(file) });
}
function recorded(seed, action) {
  const previousRandom = Math.random, PreviousDate = Date, draws = []; let number = seed >>> 0;
  Math.random = () => { number = (number + 0x6d2b79f5) | 0; let value = Math.imul(number ^ (number >>> 15), 1 | number);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    const result = ((value ^ (value >>> 14)) >>> 0) / 4294967296; draws.push(result); return result; };
  globalThis.Date = class extends PreviousDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return { result: action(), draws }; } finally { Math.random = previousRandom; globalThis.Date = PreviousDate; }
}
let E, D, sources = [], installed = [], tools = [], dist = [], fonts = new Map(), fontHash, cache, server, browser;
const memory = new Map(), previousStorage = globalThis.localStorage, previousFetch = globalThis.fetch;
function canonical(state) {
  const held = JSON.stringify(state), records = [];
  let loaded = state, raw;
  for (let index = 0; index < 2; index++) {
    const input = JSON.stringify(loaded), run = recorded(13570000, () => {
      const saved = E.saveCareer(loaded); raw = memory.get(KEY); return { saved, loaded: E.loadCareer() };
    });
    records.push({ input: copy(loaded), raw, result: run.result, draws: run.draws });
    recordModel('actual-save-load', records[records.length - 1]);
    assert(run.result.saved && run.result.loaded, 'Actual complete manager save must write and reload.');
    assert.deepEqual(run.draws, [], 'Actual canonical save/load consumes no random inputs.');
    assert.equal(JSON.stringify(loaded), input, 'Save/load holds its complete input.');
    loaded = run.result.loaded;
  }
  assert.equal(JSON.stringify(state), held, 'Canonicalization holds its original input.');
  assert.equal(raw, JSON.stringify(loaded), 'Canonical full manager bytes match the actual writer and loader.');
  return { state: loaded, raw, records };
}
function expectedReply(before, card, spec, late) {
  const expected = copy(before); let line = DEADLINE;
  if (!late) {
    line = 'Noted. Nothing changed.';
    if (spec.scope === 'board') { expected.boardConfidence = Math.min(100, Math.max(1, before.boardConfidence + 2)); line = 'Done. Board patience +2.'; }
    if (spec.scope === 'press') { expected.press.mood = Math.min(100, Math.max(0, before.press.mood + 3)); line = 'Done. Press mood +3.'; }
    if (spec.scope === 'morale') { const target = expected.squad.find(player => player.id === card.playerId);
      target.morale = Math.min(99, Math.max(5, target.morale + 6)); line = 'Done. ' + target.name + "'s morale +6."; }
    if (spec.scope === 'budget') { expected.budget = Math.round((before.budget + 0.2) * 1000) / 1000; line = 'Done. £200k into the transfer budget.'; }
  }
  expected.decisions = expected.decisions.map(item => item.id === card.id ? { ...item, options: [], resolved: line } : item);
  return expected;
}
function outcomeIssues(before, raw, fixture) {
  if (raw === null) return ['saved-career-missing'];
  const actual = JSON.parse(raw), item = actual.decisions?.find(card => card.id === fixture.card.id), issues = [];
  if (raw !== fixture.expectedRaw) issues.push('complete-saved-state');
  if (stateHash(actual) !== fixture.expectedSha256) issues.push('expected-state-hash');
  if (item?.resolved !== fixture.line) issues.push('literal-resolved-card');
  if (item?.options?.length !== 0) issues.push('consumed-options');
  if (item?.outcome !== undefined) issues.push('unexpected-situation-outcome');
  if (JSON.stringify(actual.live) !== JSON.stringify(before.live)) issues.push('held-live-match');
  const withoutDesk = state => { const held = copy(state); delete held.decisions; return held; };
  if (fixture.late && JSON.stringify(withoutDesk(actual)) !== JSON.stringify(withoutDesk(before))) issues.push('late-gameplay-fields-held');
  return issues;
}
function listFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => { const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file, base) : [{ file: path.relative(base, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: fileHash(file) }];
  }).sort((a, b) => a.file.localeCompare(b.file));
}
async function models() {
  const fixtures = [];
  for (const spec of SPECS) {
    recordModel('initialization-input', { scope: spec.scope, club: 'Arsenal', seed: 13570001, clock: report.clock });
    const initialized = recorded(13570001, () => E.startCareer('Arsenal'));
    recordModel('actual-initialization', { scope: spec.scope, seed: 13570001, ...initialized });
    const start = canonical(initialized.result);
    const state = copy(start.state); let preparedPlayer;
    if (spec.scope === 'morale') {
      const target = state.squad.find(player => !player.isYouth && player.position === 'CM') ?? state.squad.find(player => !player.isYouth);
      assert(target, 'Actual initialized squad needs a valid simulated morale subject.');
      preparedPlayer = { id: target.id, before: copy(target), morale: 40 };
      state.squad = state.squad.map(player => player.id === target.id ? { ...player, morale: 40 } : player);
    }
    recordModel('prepared-context', { scope: spec.scope, state, preparedPlayer });
    const definitions = D.DECK.filter(card => card.id === spec.deckId);
    assert.equal(definitions.length, 1, 'The original situation definition must exist once.');
    const definition = definitions[0]; assert(definition.fits(state) && (!definition.who || definition.who(state)), 'Source-built prepared context must be eligible.');
    const built = recorded(13570002, () => D.buildSituation(state, definition));
    recordModel('prepared-source-card', { scope: spec.scope, before: state, ...built });
    assert.deepEqual(built.draws, [], 'Source card building uses no match inputs.');
    const offered = canonical({ ...state, decisions: [built.result] }), card = D.deskOf(offered.state)[0];
    const preparation = { scope: 'prepared-source-card-before-actual-kickoff', initialized, canonicalStart: start, preparedPlayer,
      built: built.result, buildDraws: built.draws, offered, clock: report.clock };
    retain('models/' + spec.scope + '-prepared.json', preparation);
    assert.equal(card.id, built.result.id); assert.equal(card.kind, 'situation'); assert.equal(card.resolved, undefined);
    if (preparedPlayer) assert.equal(card.playerId, preparedPlayer.id, 'The source-built morale card must select the disclosed prepared subject.');
    assert.equal(card.options[spec.option].label, spec.label, 'Independent original selected label must match.');
    assert.deepEqual(card.options[spec.option].effect, spec.scope === 'decline' ? { kind: 'none' } : { kind: 'move', meter: spec.scope, delta: spec.delta });
    let current = offered.state; const kickoff = [];
    for (let entry = 0; entry < 8; entry++) {
      const held = JSON.stringify(current), run = recorded(13570002 + entry, () => E.playNextEntry(current, { skipHalftime: false }));
      kickoff.push({ seed: 13570002 + entry, input: copy(current), result: copy(run.result), draws: run.draws });
      recordModel('actual-calendar-kickoff', { scope: spec.scope, ...kickoff[kickoff.length - 1] });
      assert.equal(JSON.stringify(current), held, 'Actual calendar/kickoff input stays held.'); current = run.result.state;
      if (run.result.kind === 'halftime') break;
      assert.equal(run.result.kind, 'window', 'Only actual calendar windows may precede the live fixture.');
    }
    retain('models/' + spec.scope + '-kickoff.json', { preparation, kickoff, actual: current });
    assert(kickoff.length <= 8 && kickoff[kickoff.length - 1].result.kind === 'halftime', 'Actual initialized career must reach halftime within8 calls.');
    assert(!current.sacked && current.week < current.calendar.length && current.live && current.live.week === current.week
      && current.live.onPitch.length > 0 && current.live.opponent, 'Actual live fixture must have the recorded opponent and on-pitch team.');
    assert.deepEqual(current.decisions, offered.state.decisions, 'Actual kickoff holds the previously prepared card.');
    const live = canonical(current);
    for (const late of [true, false]) {
      const before = late ? live : offered, literal = expectedReply(before.state, card, spec, late);
      recordModel('answer-input', { scope: spec.scope, late, before: before.state, literal });
      const held = JSON.stringify(before.state), answered = recorded(13570020, () => E.answerMessage(before.state, card.id, spec.option));
      recordModel('actual-model-answer', { scope: spec.scope, late, ...answered });
      const after = canonical(answered.result);
      const fixture = { id: spec.scope + '-' + (late ? 'late' : 'before'), spec, late, card: copy(card), before: copy(before.state),
        beforeRaw: before.raw, beforeSha256: sha(before.raw), expected: literal, expectedRaw: JSON.stringify(literal),
        expectedSha256: stateHash(literal), line: literal.decisions.find(item => item.id === card.id).resolved,
        provenance: { presentation: 'prepared-source-card-before-actual-kickoff', preparedPlayer, actualKickoff: late ? kickoff : [],
          initializationDraws: initialized.draws, preparationFile: 'models/' + spec.scope + '-prepared.json', kickoffFile: 'models/' + spec.scope + '-kickoff.json' },
        actualAnswer: { result: answered.result, draws: answered.draws, saved: after } };
      retain('models/' + fixture.id + '.json', fixture);
      assert.deepEqual(answered.draws, [], 'Actual reply consumes zero match RNG draws.');
      assert.equal(JSON.stringify(before.state), held, 'Actual answer input is held.');
      assert.deepEqual(copy(answered.result), literal, 'Actual complete reply must match independent literal state.');
      assert.equal(after.raw, fixture.expectedRaw, 'Actual answered save and canonical reload match every independent literal field.');
      assert.deepEqual(outcomeIssues(before.state, after.raw, fixture), [], 'Independent browser outcome detectors must accept the real model result.');
      fixtures.push(fixture);
    }
  }
  const progressFile = path.join(MODEL, 'progress.json');
  retained.push({ file: 'models/progress.json', filename: progressFile, bytes: fs.statSync(progressFile).size, sha256: fileHash(progressFile) });
  report.fixtures = fixtures;
  return fixtures;
}
async function serve() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port));
    });
  });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error(`Host startup failed: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Host exited ${code}: ${log}`)); });
    server.stdout.on('data', data => { log += data; if (String(data).includes('host-like server:')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => { log += data; });
  });
  return `http://127.0.0.1:${port}`;
}
async function open(base, profile, fixture, row) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base,
      localStorage: [{ name: KEY, value: fixture.beforeRaw }, { name: 'cookie-consent', value: 'essential' },
        { name: 'dukb-theme', value: 'dark' }] }] } });
  const page = await context.newPage(), aborted = new Set(); page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) {
      if (!['GET', 'HEAD'].includes(request.method())) { row.assetErrors.push('Owned write refused: ' + request.method() + ' ' + request.url()); return route.abort('blockedbyclient'); }
      return route.continue();
    }
    if (request.method() === 'GET' && fonts.has(url.href)) {
      row.transport.push({ method: request.method(), url: request.url(), action: 'retained-font' });
      return route.fulfill({ status: 200, ...fonts.get(url.href) });
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.assetErrors.push('Uncached declared font: ' + request.url());
    aborted.add(request.url());
    row.transport.push({ method: request.method(), url: request.url(), action: 'abort', body: request.postData() });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else row.errors.push(url + ': ' + text);
  });
  page.on('response', response => { if (new URL(response.url()).origin === base && response.status() >= 400) row.assetErrors.push('Owned asset ' + response.status() + ' ' + response.url()); });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.assetErrors.push('Owned request failed: ' + request.url() + ' ' + request.failure()?.errorText); });
  await page.addInitScript(now => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, NOW);
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const activate = async button => {
    await button.scrollIntoViewIfNeeded();
    if (profile.width === 320) await button.tap();
    else if (profile.width === 390) await button.click();
    else { await button.focus(); await button.press('Enter'); }
  };
  const enter = async () => {
    const resume = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
    await resume.waitFor({ timeout: 45000 }); await activate(resume);
    await page.locator('[data-testid="cm-show-slots"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  const inbox = async () => {
    const tile = page.getByRole('button').filter({ has: page.getByText('Inbox', { exact: true }) });
    setup(await tile.count() === 1, row.id + ': actual Inbox tile must be unique.');
    await activate(tile); await page.locator('section[aria-label="Decisions desk"]').waitFor();
  };
  const streak = () => page.evaluate(() => localStorage.getItem('dukb-streaks-v1'));
  await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded' }); await enter();
  return { page, context, raw, activate, enter, inbox, streak };
}
async function reload(walk, row, stage) {
  const before = await walk.raw();
  await walk.page.reload({ waitUntil: 'domcontentloaded' }); await walk.enter();
  const after = await walk.raw();
  row.reloads.push({ stage, before, after, equal: before === after, beforeSha256: sha(before ?? ''), afterSha256: sha(after ?? '') });
  check(before === after, row.id + ': ' + stage + ' changed literal saved bytes.', row);
}
async function continuation(walk, fixture, row, stage) {
  const before = await walk.raw(), action = walk.page.locator('[data-cm-way="live"]');
  if (fixture.late) {
    check(await action.count() === 1 && (await action.innerText()).trim() === 'Resume match' && await action.isEnabled(),
      row.id + ': actual paused match must still offer its legal Resume match action.', row);
  } else check(!JSON.parse(before).live, row.id + ': before-kickoff journey acquired an unplayed live state.', row);
  row.stages.push({ stage, raw: before, actualLiveAction: await action.count() ? (await action.innerText()).trim() : null });
  check(await walk.raw() === before, row.id + ': reading actual continuation changed the saved match.', row);
}
async function capture(walk, row, name, target) {
  await walk.page.waitForFunction(() => !document.querySelector('[data-sonner-toast]')
    && !document.querySelector('[data-inbox-feedback="committed"]'), undefined, { timeout: 15000 });
  await target.scrollIntoViewIfNeeded();
  const geometry = await target.evaluate(async element => {
    let previous = '', stable = 0, observation;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const finite = element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length;
      const visibleTop = Math.max(0, rect.y), visibleBottom = Math.min(innerHeight, rect.bottom);
      const hit = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2)), (visibleTop + visibleBottom) / 2);
      observation = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: [innerWidth, innerHeight],
        opacity: Number(style.opacity), finite, overflow: document.documentElement.scrollWidth > innerWidth + 1,
        painted: rect.width > 0 && visibleBottom > visibleTop && rect.right <= innerWidth + 1 && rect.x >= 0 && !!hit && element.contains(hit) };
      const signature = JSON.stringify(observation);
      stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && observation.opacity >= 0.99 && finite === 0 && observation.painted && !observation.overflow) return { ...observation, stable };
    }
    return { ...observation, stable };
  });
  check(geometry.stable >= 4 && geometry.opacity >= 0.99 && geometry.finite === 0 && geometry.painted && !geometry.overflow, `${row.id}: ${name} did not settle with visible width and no overflow.`, row);
  row.layouts.push({ stage: name, ...geometry });
  const filename = `${row.id}-${name}.png`;
  const pathname = path.join(OUT, filename);
  assert(!fs.existsSync(pathname), `Refuse to overwrite original ${filename}.`);
  await walk.page.screenshot({ path: pathname });
  const image = { file: filename, bytes: fs.statSync(pathname).size, sha256: fileHash(pathname), original: true };
  report.inventory.push(image); row.shots.push(filename);
}
async function runCase(base, profile, fixture, variant = 'played') {
  const row = { id: profile.width + '-' + fixture.id + '-' + variant, fixture: fixture.id, width: profile.width, late: fixture.late,
    checks: 0, issues: [], errors: [], assetErrors: [], transport: [], diagnostics: [], stages: [], shots: [], layouts: [], reloads: [] };
  (variant === 'played' ? report.cases : report.controls).push(row);
  let walk;
  try {
    walk = await open(base, profile, fixture, row);
    check(await walk.raw() === fixture.beforeRaw, row.id + ': actual loader changed the complete model fixture.', row);
    await continuation(walk, fixture, row, 'initial-legal-continuation');
    await reload(walk, row, 'pending-reply-reload');
    check(await walk.raw() === fixture.beforeRaw, row.id + ': pending reload changed the real saved card or live match.', row);
    await walk.inbox();
    const node = walk.page.locator('[data-desk-card="' + fixture.card.id + '"]'), section = walk.page.locator('section[aria-label="Decisions desk"]');
    await node.waitFor();
    check(await section.getByText(ADVICE, { exact: true }).count() === 1, row.id + ': advertised before-next-match deadline differs.', row);
    check(await node.getAttribute('data-desk-kind') === 'situation' && await node.getAttribute('data-inbox-state') === 'pending',
      row.id + ': actual selected card is not the prepared pending situation.', row);
    check((await node.innerText()).includes(fixture.card.text), row.id + ': actual saved source card text differs.', row);
    const buttons = node.getByRole('button');
    check(await buttons.count() === fixture.card.options.length, row.id + ': actual reply count differs from the source card.', row);
    for (const option of fixture.card.options) check(await node.getByRole('button', { name: option.label, exact: true }).count() === 1,
      row.id + ': full authentic reply label is not uniquely offered: ' + option.label, row);
    const button = node.getByRole('button', { name: fixture.spec.label, exact: true });
    const beforeRaw = await walk.raw(), before = JSON.parse(beforeRaw), streakBefore = await walk.streak();
    row.stages.push({ stage: 'offered', raw: beforeRaw, card: fixture.card, label: fixture.spec.label, streakBefore });
    check(beforeRaw === fixture.beforeRaw && sha(beforeRaw) === fixture.beforeSha256, row.id + ': rendering rewrote the original full saved context.', row);
    if (variant === 'played') await capture(walk, row, 'pending-saved-reply', node);
    if (variant === 'omit-answer') {
      row.detected = outcomeIssues(before, await walk.raw(), fixture);
      check(JSON.stringify(row.detected) === JSON.stringify(['complete-saved-state', 'expected-state-hash', 'literal-resolved-card', 'consumed-options']),
        row.id + ': omitted actual late reply did not trigger exactly the full-save and unclosed-card detectors.', row);
      check(await walk.raw() === beforeRaw && await button.count() === 1 && await walk.streak() === streakBefore,
        row.id + ': omission control did not preserve the actual saved live context and offered choices.', row);
      await capture(walk, row, 'detected-reply-omission', node); return;
    }
    await walk.page.evaluate(() => {
      window.__deadlineOriginalRandom = Math.random; window.__deadlineReplyDraws = [];
      Math.random = () => { const value = window.__deadlineOriginalRandom();
        window.__deadlineReplyDraws.push({ ordinal: window.__deadlineReplyDraws.length + 1, value, stack: new Error('Observed actual desk reply draw').stack });
        return value; };
    });
    await walk.activate(button);
    await walk.page.waitForFunction(({ key, id }) => !!JSON.parse(localStorage.getItem(key))?.decisions?.find(item => item.id === id)?.resolved,
      { key: KEY, id: fixture.card.id });
    const afterRaw = await walk.raw();
    const actualDraws = await walk.page.evaluate(() => { Math.random = window.__deadlineOriginalRandom; return window.__deadlineReplyDraws; });
    const findings = outcomeIssues(before, afterRaw, fixture);
    row.stages.push({ stage: 'answered', before: beforeRaw, after: afterRaw, expectedSha256: fixture.expectedSha256, actualSha256: sha(afterRaw),
      actualDraws, findings, label: fixture.spec.label, option: fixture.spec.option });
    check(actualDraws.length === 0, row.id + ': actual reply consumed random match inputs.', row);
    check(findings.length === 0, row.id + ': complete actual reply differs from the independent literal: ' + findings.join(', '), row);
    check(await node.getByRole('button').count() === 0 && await node.getAttribute('data-inbox-state') === 'resolved'
      && (await node.innerText()).includes(fixture.line), row.id + ': actual inbox failed to show the literal closed reply without buttons.', row);
    check(await walk.streak() === streakBefore, row.id + ': actual desk reply awarded local completion points.', row);
    await reload(walk, row, 'first-resolved-reply-reload');
    check(await walk.raw() === afterRaw && outcomeIssues(before, await walk.raw(), fixture).length === 0,
      row.id + ': literal answered reload lost or altered the exact expected deadline or benefit.', row);
    if (variant === 'delete-save') {
      await walk.page.addInitScript(key => {
        if (window !== window.top) return;
        const before = localStorage.getItem(key); localStorage.removeItem(key);
        window.__deadlineDeletedCareer = { before, after: localStorage.getItem(key) };
      }, KEY);
      await walk.page.reload({ waitUntil: 'domcontentloaded' });
      await walk.page.locator('[data-testid="cm-world-editor-tile"]').waitFor({ timeout: 45000 });
      await walk.page.evaluate(() => document.fonts.ready);
      const removed = await walk.page.evaluate(() => window.__deadlineDeletedCareer), lost = await walk.raw();
      row.detected = outcomeIssues(before, lost, fixture);
      check(removed?.before === afterRaw && removed.before === fixture.expectedRaw && removed.after === null && lost === null,
        row.id + ': actual answered/reloaded save was not deleted after the unchanged pagehide write.', row);
      check(JSON.stringify(row.detected) === JSON.stringify(['saved-career-missing'])
        && await walk.page.locator('[data-desk-card="' + fixture.card.id + '"]').count() === 0
        && await walk.page.getByRole('button', { name: 'Resume Career', exact: true }).count() === 0,
        row.id + ': deletion failed its exact missing-career restoration detector.', row);
      row.stages.push({ stage: 'deleted-actual-save-reload', removed, raw: lost, detected: row.detected });
      await capture(walk, row, 'detected-deleted-career', walk.page.locator('body')); return;
    }
    await continuation(walk, fixture, row, 'first-restored-legal-continuation');
    await reload(walk, row, 'second-resolved-reply-reload');
    check(await walk.raw() === afterRaw && outcomeIssues(before, await walk.raw(), fixture).length === 0,
      row.id + ': second literal reload repeated or lost a saved reply.', row);
    await continuation(walk, fixture, row, 'second-restored-legal-continuation');
    await walk.inbox();
    const restored = walk.page.locator('[data-desk-card="' + fixture.card.id + '"]');
    await restored.waitFor();
    check(await restored.getByRole('button').count() === 0 && (await restored.innerText()).includes(fixture.line),
      row.id + ': saved reply was re-offered or misreported after repeated reload.', row);
    await restored.focus(); await restored.press('Enter');
    check(await walk.raw() === afterRaw && await walk.streak() === streakBefore, row.id + ': Enter on resolved card repeated a benefit or completion.', row);
    row.stages.push({ stage: 'twice-restored-consumed', raw: await walk.raw(), line: fixture.line });
    await capture(walk, row, 'resolved-after-two-reloads', restored);
  } catch (error) {
    report.failures++; row.issues.push(String(error?.stack ?? error)); report.issues.push(row.id + ': ' + String(error));
  } finally {
    if (walk) await walk.page.evaluate(() => { if (window.__deadlineOriginalRandom) Math.random = window.__deadlineOriginalRandom; }).catch(() => {});
    check(row.errors.length === 0, row.id + ': unexpected app errors: ' + row.errors.join(' | '), row);
    check(row.assetErrors.length === 0, row.id + ': owned asset or declared font errors: ' + row.assetErrors.join(' | '), row);
    check(row.diagnostics.every(diagnostic => row.transport.some(request => request.action === 'abort' && request.url === diagnostic.url)),
      row.id + ': resource diagnostic lacks its exact owned abort URL.', row);
    check(row.transport.filter(request => request.method === 'POST').length === 0,
      row.id + ': selected reply/reload attempted backend activity or an award.', row);
    if (walk) await walk.context.close(); write();
  }
}
try {
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key), clear: () => memory.clear(), key: index => [...memory.keys()][index] ?? null,
    get length() { return memory.size; } };
  globalThis.fetch = async () => { throw new Error('External model fetch refused by the remote deadline proof.'); };
  const entry = path.join(MODEL, 'entry.mjs'), bundle = path.join(MODEL, 'engine.mjs');
  retain('models/entry.mjs', 'export * as E from ' + JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts').replaceAll('\\', '/')) + ';\n'
    + 'export * as D from ' + JSON.stringify(path.join(ROOT, 'src/lib/clubManagerDecisions.ts').replaceAll('\\', '/')) + ';\n');
  const explicit = ['src/lib/clubManager.ts', 'src/lib/clubManagerDecisions.ts', 'src/lib/clubManagerSlots.ts',
    'src/pages/ClubManager.tsx', 'src/hooks/useClubManager.ts', 'src/components/club-manager/InboxCard.tsx',
    'src/components/club-manager/InboxCard.module.css', 'src/components/club-manager/ManagerSlotsScreen.tsx',
    'src/lib/completions.ts', 'src/lib/streaks.ts', 'src/test/clubManagerDecisionDeadline.test.ts',
    'scripts/simClubManagerDecisionDeadline.mjs', 'scripts/playClubManagerDecisionDeadline.mjs',
    '.github/workflows/manager-decision-deadline.yml', 'scripts/lib/hostLikeServer.mjs',
    'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs', 'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
  const preCompile = explicit.map(file => ({ file, sha256: fileHash(path.join(ROOT, file)), bytes: fs.statSync(path.join(ROOT, file)).size }));
  for (const source of preCompile) retain('models/source/' + source.file, fs.readFileSync(path.join(ROOT, source.file), 'utf8'));
  const built = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: bundle,
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'error' });
  retained.push({ file: 'models/engine.mjs', filename: bundle, bytes: fs.statSync(bundle).size, sha256: fileHash(bundle) });
  retain('models/metafile.json', built.metafile);
  const imports = Object.keys(built.metafile.inputs).map(file => path.resolve(ROOT, file)).filter(file =>
    file.startsWith(ROOT + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && file !== entry);
  sources = [...new Set([...imports, ...explicit.map(file => path.join(ROOT, file))])].sort().map(file => ({
    file: path.relative(ROOT, file).replaceAll('\\', '/'), sha256: fileHash(file), bytes: fs.statSync(file).size }));
  for (const source of sources) {
    const physical = path.join(OUT, 'models/source', source.file);
    if (!fs.existsSync(physical)) retain('models/source/' + source.file, fs.readFileSync(path.join(ROOT, source.file), 'utf8'));
    setup(fileHash(physical) === source.sha256, 'Retained complete source differs: ' + source.file);
  }
  setup(preCompile.every(source => fileHash(path.join(ROOT, source.file)) === source.sha256), 'Original sources changed while compiling the actual model.');
  report.sourceHashes = sources;
  retain('models/source.json', { head: report.sourceHead, parentAppRef: PARENT, sources, compiled: retained.find(file => file.file === 'models/engine.mjs'),
    noSourceMutations: true, scope: 'Actual original E/D sources bundled directly, with no observer or replacement.' });
  ({ E, D } = await import(pathToFileURL(bundle).href));
  setup(E.SAVE_KEY === KEY && D.DECK.length === 13 && D.DESK_CAP === 6 && D.SITUATION_RATE === 0.3,
    'Actual manager key, thirteen-card stream, desk cap and original offer rate must remain held.');
  const fixtures = await models();
  setup(fixtures.length === 10 && new Set(fixtures.map(fixture => fixture.id)).size === 10,
    'Exactly five late and five before-kickoff full-state model fixtures are required.');
  report.modelReceipts = retained.map(({ filename, ...receipt }) => receipt);
  const installedRows = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'installed.json'), 'utf8'));
  setup(installedRows.length === 521 && new Set(installedRows.map(row => row.path)).size === 521, 'Exactly 521 unique bound installed locked versions are required.');
  installed = installedRows.map(row => {
    setup(row.path.startsWith('node_modules/') && !row.path.split('/').includes('..'), 'Installed dependency path escapes the checkout.');
    const file = path.join(ROOT, row.path, 'package.json');
    setup(JSON.parse(fs.readFileSync(file, 'utf8')).version === row.version, 'Installed locked version differs: ' + row.path);
    return { ...row, sha256: fileHash(file) };
  });
  report.installed = installed;
  tools = ['esbuild', 'playwright', 'playwright-core'].map(name => { const file = require.resolve(name + '/package.json');
    return { name, file, version: JSON.parse(fs.readFileSync(file, 'utf8')).version, sha256: fileHash(file) }; });
  report.tools = tools;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache'));
  fontHash = fileHash(path.join(cache, 'manifest.json'));
  report.fonts = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
  fonts = new Map(report.fonts.map(entry => {
    setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin)
      && /^[a-f0-9]{64}$/.test(entry.file), 'Only retained declared font dependencies may be fulfilled.');
    const file = path.join(cache, entry.file); setup(fileHash(file) === entry.sha256, 'Retained font differs: ' + entry.url);
    return [entry.url, { body: fs.readFileSync(file), contentType: entry.contentType }];
  }));
  dist = listFiles(path.join(ROOT, 'dist')); report.dist = dist;
  const base = await serve(); browser = await pw.chromium.launch({ headless: true });
  for (const profile of PROFILES) for (const spec of SPECS) await runCase(base, profile, fixtures.find(fixture => fixture.id === spec.scope + '-late'));
  for (const spec of SPECS) await runCase(base, PROFILES[1], fixtures.find(fixture => fixture.id === spec.scope + '-before'));
  const control = fixtures.find(fixture => fixture.id === 'board-late');
  await runCase(base, PROFILES[1], control, 'omit-answer');
  await runCase(base, PROFILES[1], control, 'delete-save');
  check(report.cases.length === 20 && report.controls.length === 2 && report.inventory.length === 42,
    'Final counts must be twenty played journeys, two effective controls and forty-two new originals.');
  check(report.cases.every(row => row.stages.filter(stage => stage.stage === 'answered').length === 1
    && row.reloads.length === 3 && row.reloads.every(reload => reload.equal) && row.shots.length === 2),
    'Every played journey needs one actual reply, three literal reloads and two settled originals.');
  check(report.cases.filter(row => row.late).length === 15 && report.cases.filter(row => !row.late).length === 5,
    'The fifteen live and five before-kickoff paths must all finish.');
  check(report.cases.reduce((sum, row) => sum + row.reloads.length, 0) === 60, 'Exactly sixty literal played reloads are required.');
  check(new Set(report.inventory.map(image => image.file)).size === 42, 'Every original capture needs a distinct filename.');
  for (const image of report.inventory) check(fileHash(path.join(OUT, image.file)) === image.sha256
    && fs.statSync(path.join(OUT, image.file)).size === image.bytes, 'Original capture changed: ' + image.file);
} catch (error) {
  report.issues.push(String(error?.stack ?? error)); if (!report.setupFailures) report.failures++;
} finally {
  if (browser) await browser.close(); if (server) server.kill();
  if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  globalThis.fetch = previousFetch;
  report.sourceHeld = sources.length > 0 && sources.every(source => fileHash(path.join(ROOT, source.file)) === source.sha256);
  report.modelHeld = retained.length > 0 && retained.every(file => fileHash(file.filename) === file.sha256);
  report.installedHeld = installed.length === 521 && installed.every(row => fileHash(path.join(ROOT, row.path, 'package.json')) === row.sha256);
  report.toolsHeld = tools.length === 3 && tools.every(tool => fileHash(tool.file) === tool.sha256);
  report.fontsHeld = !!fontHash && fileHash(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(entry => fileHash(path.join(cache, entry.file)) === entry.sha256);
  report.distHeld = dist.length > 0 && JSON.stringify(listFiles(path.join(ROOT, 'dist'))) === JSON.stringify(dist);
  for (const name of ['sourceHeld', 'modelHeld', 'installedHeld', 'toolsHeld', 'fontsHeld', 'distHeld']) check(report[name], name + ': complete proof inputs changed or were never qualified.');
  report.summary = { played: report.cases.length, late: report.cases.filter(row => row.late).length, beforeKickoff: report.cases.filter(row => !row.late).length,
    controls: report.controls.length, checks: report.checks, originals: report.inventory.length,
    answeredSteps: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'answered').length, 0),
    reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0),
    caseChecks: report.cases.reduce((sum, row) => sum + row.checks, 0), controlChecks: report.controls.reduce((sum, row) => sum + row.checks, 0),
    externalAborts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    retainedFonts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'retained-font').length, 0),
    expectedDiagnostics: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.diagnostics.length, 0),
    installedVersions: installed.length, zeroDrawReplies: report.cases.filter(row => row.stages.some(stage => stage.stage === 'answered' && stage.actualDraws.length === 0)).length,
    failures: report.failures, setupFailures: report.setupFailures };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed'; write();
  console.log('Manager deadline browser: ' + report.status + '; ' + report.checks + ' checks, ' + report.cases.length + ' played replies, '
    + report.controls.length + ' controls, ' + report.inventory.length + ' originals, ' + report.failures + ' failures, ' + report.setupFailures + ' setup failures.');
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
