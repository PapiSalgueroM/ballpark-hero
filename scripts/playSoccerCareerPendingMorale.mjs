/* Actual saved Soccer Career pending morale, remote CI only.
 * Actual picker order is held. Selected old captions come from the held parent.
 * Recorded resolver inputs do not replace a choice, queue or outcome.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Soccer pending-morale browser execution is remote CI only.');
assert(process.env.CAREER_MORALE_PHASE === 'fixed', 'This actual browser proof requires the qualified fixed phase.');
assert(process.env.CAREER_MORALE_OUT && path.isAbsolute(process.env.CAREER_MORALE_OUT), 'CAREER_MORALE_OUT must be an absolute artifact root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.CAREER_MORALE_OUT;
const OUT = path.join(ARTIFACTS, 'browser');
const FIXTURE = path.join(ARTIFACTS, 'browser-fixtures.json');
const REPORT = path.join(OUT, 'report.json');
const KEY = 'soccerCareerSave';
const require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = filename => sha(fs.readFileSync(filename));
const stateHash = state => sha(JSON.stringify(state));
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to overwrite an existing browser report.');
const report = {
  status: 'running', phase: 'fixed', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  checks: 0, failures: 0, setupFailures: 0, cases: [], controls: [], inventory: [], issues: [],
  sourceHeld: false, toolsHeld: false, installedHeld: false, fixturesHeld: false, distHeld: false, parentHeld: false,
  limits: ['Signed out, local saved outcomes only; no backend completion is credited.',
    'Initial profile and season facts are prepared. Actual picker delivery is model proof, not a fully played UI career.',
    'Selected old captions are overlaid from held parent factories; the complete actual picker batch and order are retained.',
    'Current previews have independent literal oracles. Rendering never rewrites saved old captions.',
    'The complete recorded draw vector is installed only at each actual click. It is a disclosed input, not a seeded stream.',
    'Every observed draw, ordinal and stack is retained; unlisted and unused draws fail.',
    'Once means the played effect and queue stay consumed through reload, not lifetime exclusion of recurring cards.',
    'External flag images and nonessential network are blocked. Their appearance is not visually qualified.',
    'Captures cover selected pending cards and saved continuations, not blanket visual acceptance.'],
};
const write = () => fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
const check = (condition, message, row) => {
  report.checks++;
  if (row) row.checks++;
  if (!condition) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!condition;
};
const setup = (condition, message) => {
  report.checks++;
  if (!condition) { report.setupFailures++; throw new Error(message); }
};
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const PARENT = '7a0ae6ba2523719e854a054fec72b27673557982';
const CHAINS = ['223-choice0-222-choice0', '223-choice0-222-choice1', '223-choice1-222-choice0', '223-choice1-222-choice1'];
const SCENARIOS = [...CHAINS, '221-choice0', '223-choice1'];
const fields = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const CURRENT = {
  '221:0': 'Followers +1M, Popularity +4, the people love a bad singer',
  '222:0': 'Legendary commitment: Morale +6, Physical -1 next season',
  '222:1': 'Morale -5, Followers +300k, the story becomes a documentary punchline',
  '223:0': 'Your playlist unites the squad: Morale +6',
  '223:1': 'Diplomacy: Morale +3, Integrity +1, whales on Wednesdays',
};
const LEGACY = {
  '221:0': 'Followers +1M, the people love a bad singer',
  '222:1': 'Morale -5, the story becomes a documentary punchline',
  '223:1': 'Diplomacy: Morale +3, whales on Wednesdays',
};
const choices = {
  '221:0': { label: 'Post the full version yourself', followers: 1, popularity: 4, line: '🎶 Posted your own karaoke disaster. Instant classic' },
  '222:0': { label: 'Rent a car, drive all night, make kickoff', morale: 6, physical: -1, line: '🚗 Drove nine hours overnight and still made kickoff' },
  '222:1': { label: 'Miss the match, tell the truth', morale: -5, followers: 0.3, line: '🛫 Missed a match by boarding the wrong plane. Iconic, unfortunately' },
  '223:0': { label: 'Seize the aux', morale: 6, line: '🎧 Won the aux cord war. The whale era is over' },
  '223:1': { label: 'Broker a schedule', morale: 3, integrity: 1, line: '📋 Negotiated the aux schedule. Whales on Wednesdays only' },
};
const keyOf = step => step.eventId + ':' + step.choiceIndex;
const clamp = number => Math.max(0, Math.min(100, number));
const cents = number => Math.round(number * 100) / 100;
function literalIssues(before, after, step) {
  const issues = [], effect = choices[keyOf(step)];
  if (!effect || step.choiceLabel !== effect.label) return ['unowned-choice'];
  if (after.morale !== clamp(before.morale + (effect.morale ?? 0))) issues.push('literal-morale');
  if (after.popularity !== clamp(before.popularity + (effect.popularity ?? 0))) issues.push('literal-popularity');
  if (after.integrityBonus !== before.integrityBonus + (effect.integrity ?? 0)) issues.push('literal-integrity');
  if (after.socialMediaFollowers !== (effect.followers ? cents(before.socialMediaFollowers + effect.followers) : before.socialMediaFollowers)) issues.push('literal-followers');
  for (const field of ['netWorth', 'marketValue', 'sponsorBonus', 'agentId', 'overall', ...fields])
    if (after[field] !== before[field]) issues.push('literal-held-' + field);
  const boost = { ...before.statBoostNextSeason };
  if (effect.physical) boost.physical = (boost.physical || 0) + effect.physical;
  if (JSON.stringify(after.statBoostNextSeason) !== JSON.stringify(boost)) issues.push('literal-queued-physical');
  for (const field of ['lifeFlags', 'chanceWheel', 'eventLastFired'])
    if (JSON.stringify(after[field]) !== JSON.stringify(before[field])) issues.push('literal-held-' + field);
  const season = before.seasons[before.seasons.length - 1];
  if (after.eventLastFired?.[String(step.eventId)] !== season.year) issues.push('literal-picker-stamp');
  if (after.lastEventId !== step.eventId) issues.push('last-event-id');
  if (after.phase !== 'random_events') issues.push('nonterminal-phase');
  if (JSON.stringify(after.pendingEvents) !== JSON.stringify(before.pendingEvents.slice(1))) issues.push('single-queue-consumption');
  if (JSON.stringify(after.events) !== JSON.stringify([...before.events, effect.line])) issues.push('single-history-line');
  return issues;
}
function savedOutcomeIssues(before, raw, step) {
  if (raw === null) return ['saved-career-missing'];
  const actual = JSON.parse(raw), issues = [];
  if (raw !== JSON.stringify(step.expected)) issues.push('complete-saved-state');
  if (stateHash(actual) !== step.expectedSha256) issues.push('expected-state-hash');
  return [...issues, ...literalIssues(before, actual, step)];
}
function listFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename, base) : [{ file: path.relative(base, filename).replaceAll('\\', '/'), bytes: fs.statSync(filename).size, sha256: fileHash(filename) }];
  }).sort((left, right) => left.file.localeCompare(right.file));
}
const SOURCE_FILES = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerRoutineEvents.ts',
  'src/lib/soccerCareerContracts.ts', 'src/lib/soccerCareerLifeConsequences.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/careerEventDeck.ts', 'src/lib/careerChanceWheel.ts',
  'src/pages/SoccerCareer.tsx', 'src/components/soccer-career/careerMoments.ts', 'src/components/career-moments/useCareerMoment.ts',
  'src/components/soccer-career/CareerChanceWheel.tsx', 'src/components/FlagImg.tsx', 'src/lib/flagUtils.ts', 'src/lib/soccerCurrency.ts',
  'src/test/soccerCareerPendingMorale.test.ts', 'src/test/soccerCareerStatRewards.test.ts',
  'scripts/simSoccerCareerPendingMorale.mjs', 'scripts/playSoccerCareerPendingMorale.mjs',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs',
  'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
let sourceBefore = [];
let distBefore = [];
let toolsBefore = [];
let installedBefore = [];
let fixtureHash;
let parentFiles = [];
let now;
let fontHash;
let server;
let browser;
let fonts = new Map();
let cache;

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
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base,
      localStorage: [{ name: KEY, value: JSON.stringify(fixture.initial) }, { name: 'cookie-consent', value: 'essential' },
        { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
  const aborted = new Set();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === base) {
      if (!['GET', 'HEAD'].includes(request.method())) { row.assetErrors.push(`Owned origin write refused: ${request.method()} ${request.url()}`); return route.abort('blockedbyclient'); }
      return route.continue();
    }
    if (request.method() === 'GET' && fonts.has(url.href)) {
      row.transport.push({ method: request.method(), url: request.url(), action: 'retained-font' });
      return route.fulfill({ status: 200, ...fonts.get(url.href) });
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.assetErrors.push(`Uncached declared font: ${request.url()}`);
    aborted.add(request.url());
    row.transport.push({ method: request.method(), url: request.url(), action: 'abort' });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    const text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else row.errors.push(`${url}: ${text}`);
  });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.assetErrors.push(`Owned request failed: ${request.url()} ${request.failure()?.errorText}`); });
  page.on('response', response => { if (new URL(response.url()).origin === base && response.status() >= 400) row.assetErrors.push(`Owned asset ${response.status()}: ${response.url()}`); });
  await page.addInitScript(({ now }) => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, { now });
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const saved = async () => JSON.parse(await raw());
  const ready = async () => {
    await page.getByRole('button', { name: 'How to play', exact: true }).or(page.locator('[data-career-chance-wheel]')).first().waitFor({ timeout: 45000 });
    await page.locator('[data-career-utilities]').waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
  };
  const activate = async button => {
    await button.scrollIntoViewIfNeeded();
    if (profile.width < 1000) await button.tap(); else { await button.focus(); await button.press('Enter'); }
  };
  await page.goto(`${base}/soccer-career`, { waitUntil: 'domcontentloaded' });
  await ready();
  return { context, page, raw, saved, ready, activate };
}
function eventCard(page, event) {
  const heading = page.getByRole('heading', { name: event.title, exact: true, level: 3, includeHidden: true });
  return heading.locator('..').locator('..');
}
async function choiceButton(walk, card, label, row) {
  const button = card.getByRole('button').filter({ has: walk.page.getByText(label, { exact: true }) });
  setup(await button.count() === 1, `${row.id}: exact event choice identity is not unique: ${label}`);
  const span = button.locator('span.font-bold.text-sm');
  setup(await span.count() === 1 && (await span.innerText()).trim() === label, `${row.id}: actual full choice span does not match ${label}`);
  return button;
}
async function capture(walk, row, name, target) {
  await walk.page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), undefined, { timeout: 15000 });
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
async function reload(walk, row, name) {
  const before = await walk.raw();
  await walk.page.reload({ waitUntil: 'domcontentloaded' });
  await walk.ready();
  const after = await walk.raw();
  row.reloads.push({ stage: name, before, after, equal: before === after, beforeSha256: sha(before ?? ''), afterSha256: sha(after ?? '') });
  check(before === after, `${row.id}: ${name} changed literal saved bytes.`, row);
}
async function runCase(base, profile, fixture, variant = 'natural') {
  const row = { id: profile.width + '-' + fixture.id + '-' + variant, fixture: fixture.id, width: profile.width, provenance: fixture.provenance,
    checks: 0, issues: [], errors: [], assetErrors: [], transport: [], diagnostics: [], shots: [], stages: [], reloads: [], layouts: [] };
  (variant === 'natural' ? report.cases : report.controls).push(row);
  let walk;
  try {
    walk = await open(base, profile, fixture, row);
    const initialRaw = await walk.raw();
    check(initialRaw === JSON.stringify(fixture.initial) && sha(initialRaw ?? '') === fixture.initialSha256, row.id + ': loader changed the complete original picked fixture.', row);
    row.stages.push({ stage: 'loaded', raw: initialRaw, sha256: sha(initialRaw ?? '') });
    await reload(walk, row, 'pending-first-choice-reload');
    check(await walk.raw() === initialRaw, row.id + ': pending reload changed original saved captions.', row);
    let finalBefore, finalStep, finalEvent, finalRaw;
    for (const [index, step] of fixture.steps.entries()) {
      const beforeRaw = await walk.raw(), before = JSON.parse(beforeRaw);
      setup(before.pendingEvents[0]?.id === step.eventId && before.phase === 'random_events' && before.pendingEvents.length >= 2,
        row.id + ': the actual top card is not playable with a real continuation.');
      if (index === 1) check(step.eventId === 222 && before.morale === (fixture.steps[0].choiceIndex === 0 ? 66 : 63)
        && before.morale > 60, row.id + ': the actual precursor did not cross the original fresh222 gate.', row);
      const event = before.pendingEvents[0], card = eventCard(walk.page, event);
      await card.waitFor();
      check(await card.getByRole('button').count() === event.choices.length, row.id + ': actual choices differ from the picked card.', row);
      const rendered = [];
      for (const [choiceIndex, option] of event.choices.entries()) {
        const optionButton = await choiceButton(walk, card, option.label, row);
        const consequence = (await optionButton.locator('div').last().innerText()).trim();
        const current = CURRENT[event.id + ':' + choiceIndex] ?? option.consequence;
        check(consequence === current, row.id + ': current preview differs for ' + option.label, row);
        rendered.push({ index: choiceIndex, label: option.label, savedConsequence: option.consequence, consequence, expectedCurrent: current });
      }
      const button = await choiceButton(walk, card, step.choiceLabel, row), pair = keyOf(step);
      const displayed = (await button.locator('div').last().innerText()).trim();
      check(event.choices[step.choiceIndex].label === choices[pair].label && displayed === CURRENT[pair],
        row.id + ': independent selected full label or current preview differs.', row);
      if (LEGACY[pair]) check(event.choices[step.choiceIndex].consequence === LEGACY[pair] && displayed !== LEGACY[pair],
        row.id + ': actual stale saved preview did not refresh to the independent current caption.', row);
      else check(event.choices[step.choiceIndex].consequence === CURRENT[pair],
        row.id + ': unchanged selected caption differs from its source contract.', row);
      check(await walk.raw() === beforeRaw, row.id + ': rendering changed literal saved bytes.', row);
      row.stages.push({ stage: 'offered', eventId: event.id, choiceIndex: step.choiceIndex, title: event.title, choices: rendered,
        savedConsequence: event.choices[step.choiceIndex].consequence, displayedConsequence: displayed, raw: beforeRaw });
      if (variant === 'natural') await capture(walk, row, index === 0 ? 'precursor-preview-after-pending-reload' : '222-preview-after-precursor-reload', card);
      if (variant === 'omit-choice' && index === 1) {
        row.detected = savedOutcomeIssues(before, await walk.raw(), step);
        const required = ['complete-saved-state', 'expected-state-hash', 'literal-morale', 'literal-queued-physical',
          'last-event-id', 'single-queue-consumption', 'single-history-line'];
        check(JSON.stringify(row.detected) === JSON.stringify(required), row.id + ': omitted only222 click did not trigger the exact independent detectors.', row);
        check(row.stages.filter(stage => stage.stage === 'answered').length === 1
          && JSON.stringify(before) === JSON.stringify(fixture.steps[0].expected) && before.lastEventId === 223
          && before.morale === 66 && await walk.raw() === beforeRaw && await button.count() === 1,
          row.id + ': omission control did not preserve the actual answered223 and playable222.', row);
        await capture(walk, row, 'detected-second-choice-omission', card);
        return;
      }
      await walk.page.evaluate(values => {
        window.__moraleOriginalRandom = Math.random; window.__moraleResolverDraws = [];
        Math.random = () => {
          const ordinal = window.__moraleResolverDraws.length + 1, value = values[ordinal - 1];
          window.__moraleResolverDraws.push({ ordinal, value: ordinal <= values.length ? value : null,
            stack: new Error('Observed recorded resolver input').stack, extra: ordinal > values.length });
          if (ordinal > values.length) throw new Error('Unlisted resolver draw ' + ordinal);
          return value;
        };
      }, step.resolve.draws);
      await walk.activate(button);
      await walk.page.waitForFunction(({ key, id, count }) => {
        const saved = JSON.parse(localStorage.getItem(key));
        return saved?.lastEventId === id && saved.pendingEvents.length === count;
      }, { key: KEY, id: step.eventId, count: before.pendingEvents.length - 1 });
      const afterRaw = await walk.raw();
      const observedDraws = await walk.page.evaluate(() => {
        Math.random = window.__moraleOriginalRandom; return window.__moraleResolverDraws;
      });
      check(JSON.stringify(observedDraws.map(draw => draw.value)) === JSON.stringify(step.resolve.draws)
        && observedDraws.length === step.resolve.drawCount
        && observedDraws.every((draw, ordinal) => !draw.extra && draw.ordinal === ordinal + 1 && typeof draw.stack === 'string' && draw.stack.length > 0),
        row.id + ': actual complete resolver vector differs or contains an unlisted draw.', row);
      const findings = savedOutcomeIssues(before, afterRaw, step);
      row.stages.push({ stage: 'answered', eventId: step.eventId, choiceIndex: step.choiceIndex, choiceLabel: step.choiceLabel,
        input: step.resolve, observedDraws, rawBefore: beforeRaw, rawAfter: afterRaw, expectedSha256: step.expectedSha256,
        actualSha256: sha(afterRaw), findings });
      check(findings.length === 0, row.id + ': full saved answer differs: ' + findings.join(', '), row);
      check(await eventCard(walk.page, event).getByRole('button', { includeHidden: true })
        .filter({ has: walk.page.locator('span.font-bold.text-sm') }).count() === 0, row.id + ': consumed card remains actionable.', row);
      check(await walk.page.locator('[data-career-chance-wheel]').count() === 0, row.id + ': these deterministic choices must not open a wheel.', row);
      if (index < fixture.steps.length - 1) {
        await reload(walk, row, 'precursor-answer-before-222');
        check(await walk.raw() === afterRaw && savedOutcomeIssues(before, await walk.raw(), step).length === 0,
          row.id + ': actual precursor effect or whole save changed before222.', row);
        check(await eventCard(walk.page, event).count() === 0, row.id + ': precursor was re-offered on the literal reload.', row);
        continue;
      }
      finalBefore = before; finalStep = step; finalEvent = event; finalRaw = afterRaw;
    }
    if (variant === 'delete-save') {
      const removed = await walk.page.evaluate(key => { const raw = localStorage.getItem(key); localStorage.removeItem(key); return { raw, after: localStorage.getItem(key) }; }, KEY);
      check(removed.raw === finalRaw && removed.after === null && JSON.parse(removed.raw).lastEventId === 222
        && row.stages.filter(stage => stage.stage === 'answered').length === 2,
        row.id + ': deletion control did not remove the actual two-step saved222 outcome.', row);
      await walk.page.reload({ waitUntil: 'domcontentloaded' });
      await walk.page.getByRole('button', { name: 'How to play', exact: true }).waitFor();
      const lostRaw = await walk.raw();
      row.detected = savedOutcomeIssues(finalBefore, lostRaw, finalStep);
      check(JSON.stringify(row.detected) === JSON.stringify(['saved-career-missing']), row.id + ': deleted outcome did not fail its exact restoration detector.', row);
      check(await eventCard(walk.page, finalEvent).count() === 0 && await walk.page.locator('[data-career-chance-wheel]').count() === 0,
        row.id + ': deleted pending state survived reload.', row);
      const creation = walk.page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('..');
      await creation.waitFor();
      row.stages.push({ stage: 'deleted-save-reload', removedRaw: removed.raw, rawAfter: lostRaw });
      await capture(walk, row, 'detected-deletion-after-second-choice', creation);
      return;
    }
    const next = JSON.parse(finalRaw).pendingEvents[0], target = eventCard(walk.page, next);
    await target.waitFor();
    check(await target.getByRole('button').count() > 0, row.id + ': no actual legal continuation remains.', row);
    if (fixture.steps.length === 2) await capture(walk, row, '222-saved-continuation', target);
    await reload(walk, row, 'final-answer-first-resolved-reload');
    check(await walk.raw() === finalRaw && savedOutcomeIssues(finalBefore, await walk.raw(), finalStep).length === 0,
      row.id + ': first resolved reload changed the complete outcome.', row);
    for (const step of fixture.steps) check(await eventCard(walk.page, fixture.initial.pendingEvents.find(event => event.id === step.eventId)).count() === 0,
      row.id + ': a consumed card returned after resolved reload.', row);
    row.stages.push({ stage: 'resolved-reload', raw: await walk.raw() });
    await reload(walk, row, 'final-answer-second-resolved-reload');
    check(await walk.raw() === finalRaw && savedOutcomeIssues(finalBefore, await walk.raw(), finalStep).length === 0,
      row.id + ': second resolved reload repeated or lost an effect.', row);
    for (const step of fixture.steps) check(await eventCard(walk.page, fixture.initial.pendingEvents.find(event => event.id === step.eventId)).count() === 0,
      row.id + ': a consumed card returned on the second resolved reload.', row);
    row.stages.push({ stage: 'once-second-reload', raw: await walk.raw() });
    await capture(walk, row, fixture.steps.length === 2 ? '222-postreload-continuation' : 'saved-continuation-after-two-reloads',
      eventCard(walk.page, JSON.parse(finalRaw).pendingEvents[0]));
  } catch (error) {
    report.failures++; row.issues.push(String(error?.stack ?? error)); report.issues.push(row.id + ': ' + String(error));
  } finally {
    if (walk) await walk.page.evaluate(() => { if (window.__moraleOriginalRandom) Math.random = window.__moraleOriginalRandom; }).catch(() => {});
    check(row.errors.length === 0, row.id + ': unexpected app errors: ' + row.errors.join(' | '), row);
    check(row.assetErrors.length === 0, row.id + ': owned asset or declared font errors: ' + row.assetErrors.join(' | '), row);
    check(row.diagnostics.every(diagnostic => row.transport.some(request => request.action === 'abort' && request.url === diagnostic.url)),
      row.id + ': resource diagnostic lacks an exact aborted URL.', row);
    check(row.transport.filter(request => request.method === 'POST').length === 0, row.id + ': selected nonterminal play attempted a backend POST.', row);
    if (walk) await walk.context.close();
    write();
  }
}
try {
  sourceBefore = SOURCE_FILES.map(file => ({ file, sha256: fileHash(path.join(ROOT, file)), bytes: fs.statSync(path.join(ROOT, file)).size }));
  report.sourceHashes = sourceBefore;
  setup(fs.existsSync(FIXTURE), 'Qualified normal model proof must emit browser-fixtures.json first.');
  fixtureHash = fileHash(FIXTURE);
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  report.fixtureReceipt = { file: path.relative(ARTIFACTS, FIXTURE), bytes: fs.statSync(FIXTURE).size, sha256: fixtureHash, source: fixtures.source };
  setup(fixtures.schemaVersion === 1 && fixtures.saveKey === KEY && fixtures.scenarios?.length === 6,
    'Exactly six source-bound pending-morale scenarios with the actual save key are required.');
  now = Date.parse(fixtures.clock);
  setup(Number.isFinite(now) && fixtures.clock === '2026-10-13T16:00:00Z', 'The producer must retain the disclosed fixed clock.');
  report.clock = fixtures.clock;
  const bindings = { engineSha256: 'src/lib/soccerCareerEngine.ts', lifeSha256: 'src/lib/soccerCareerLife.ts',
    routineSha256: 'src/lib/soccerCareerRoutineEvents.ts', contractsSha256: 'src/lib/soccerCareerContracts.ts',
    consequencesSha256: 'src/lib/soccerCareerLifeConsequences.ts', testSha256: 'src/test/soccerCareerPendingMorale.test.ts',
    simSha256: 'scripts/simSoccerCareerPendingMorale.mjs', saveSha256: 'src/lib/soccerCareerSave.ts' };
  setup(fixtures.source?.head === report.sourceHead && fixtures.source.parentAppRef === PARENT,
    'Producer HEAD or held parent7a differs from this browser proof.');
  for (const [field, file] of Object.entries(bindings)) setup(fixtures.source[field] === fileHash(path.join(ROOT, file)), field + ': fixture does not bind actual source.');
  for (const [field, file] of [['parentLifeSha256', 'src/lib/soccerCareerLife.ts'], ['parentCaptionsSha256', 'src/lib/soccerCareerLifeConsequences.ts']])
    setup(fixtures.source[field] === sha(execFileSync('git', ['show', PARENT + ':' + file], { cwd: ROOT })), field + ': actual held parent source differs.');
  for (const [field, digest, relative] of [
    ['parentLifeSourcePath', 'parentLifeSha256', 'fixed/soccerCareerLife.parent.ts'],
    ['parentCaptionsSourcePath', 'parentCaptionsSha256', 'fixed/soccerCareerLifeConsequences.parent.ts'],
    ['parentLifeCompiledPath', 'parentLifeCompiledSha256', 'fixed/parent-life.mjs']]) {
    setup(fixtures.source[field] === relative, field + ': retained normal source location differs.');
    const filename = path.join(ARTIFACTS, relative);
    setup(fileHash(filename) === fixtures.source[digest], relative + ': actual retained parent bytes differ.');
    parentFiles.push({ file: relative, filename, bytes: fs.statSync(filename).size, sha256: fileHash(filename) });
  }
  report.parentReceipts = parentFiles.map(({ filename, ...receipt }) => receipt);
  setup(new Set(fixtures.scenarios.map(fixture => fixture.id)).size === 6
    && JSON.stringify(fixtures.scenarios.map(fixture => fixture.id).sort()) === JSON.stringify([...SCENARIOS].sort()),
    'Fixture IDs must cover all four actual223-to222 branches and both additional current previews.');
  for (const fixture of fixtures.scenarios) {
    const chain = CHAINS.includes(fixture.id), provenance = fixture.provenance;
    setup(Array.isArray(fixture.steps) && fixture.steps.length === (chain ? 2 : 1), fixture.id + ': exact owned step count differs.');
    setup(provenance?.kind === 'actual-picker-legacy-caption-overlay' && Array.isArray(provenance.preparedFields)
      && provenance.preparedFields.length > 0, fixture.id + ': actual picker and prepared-context disclosure are required.');
    setup(fixture.initial.phase === 'random_events' && !fixture.initial.retired && fixture.initial.morale === 60
      && fixture.initial.personality === 'professor' && fixture.initial.agentId === 'self'
      && fixture.initial.pendingEvents.length > fixture.steps.length
      && fixture.steps.every((step, index) => fixture.initial.pendingEvents[index]?.id === step.eventId),
      fixture.id + ': actual delivered order, valid profile, initial morale or real continuation differs.');
    setup(stateHash(fixture.initial) === fixture.initialSha256
      && stateHash(provenance.actualPickerBatch) === provenance.actualPickerBatchSha256, fixture.id + ': complete initial or picker hash differs.');
    setup(provenance.playerName === fixture.initial.playerName && provenance.context.playerName === fixture.initial.playerName
      && provenance.context.morale === 60 && provenance.context.phase === 'social_media_action'
      && provenance.context.pendingEvents.length === 0 && provenance.context.socialMediaActionUsedThisSeason === true
      && Number.isInteger(provenance.trial) && provenance.trial >= 0 && provenance.trial < 16384
      && Number.isInteger(provenance.pickerSeed) && provenance.pickerDrawCount === provenance.pickerDraws.length
      && provenance.pickerDraws.length > 0 && provenance.pickerDraws.every(value => Number.isFinite(value) && value >= 0 && value < 1),
      fixture.id + ': actual picker context, identity, finite trial or draw receipt differs.');
    const overlaid = JSON.parse(JSON.stringify(provenance.actualPickerBatch));
    const expectedOverlays = fixture.steps.filter(step => LEGACY[keyOf(step)]);
    setup(Array.isArray(provenance.legacyCaptions) && provenance.legacyCaptions.length === expectedOverlays.length,
      fixture.id + ': only selected stale caption overlays may be supplied.');
    for (const step of expectedOverlays) {
      const index = fixture.steps.indexOf(step), pair = keyOf(step), expectedPath = 'pendingEvents[' + index + '].choices[' + step.choiceIndex + '].consequence';
      const matches = provenance.legacyCaptions.filter(overlay => overlay.eventId === step.eventId && overlay.choiceIndex === step.choiceIndex);
      setup(matches.length === 1, fixture.id + ': selected old caption overlay is not unique.');
      const overlay = matches[0];
      setup(overlay.path === expectedPath && overlay.savedConsequence === LEGACY[pair]
        && overlay.parentLifeSha256 === fixtures.source.parentLifeSha256
        && overlay.parentCaptionsSha256 === fixtures.source.parentCaptionsSha256
        && overlay.parentLifeCompiledSha256 === fixtures.source.parentLifeCompiledSha256,
        fixture.id + ': stale selected caption is not bound to held parent source and compiled bytes.');
      overlaid.pendingEvents[index].choices[step.choiceIndex].consequence = LEGACY[pair];
    }
    setup(JSON.stringify(overlaid) === JSON.stringify(fixture.initial), fixture.id + ': something beyond selected captions changed the whole actual picker batch.');
    if (chain) setup(fixture.steps[0].eventId === 223 && fixture.steps[1].eventId === 222
      && fixture.id === '223-choice' + fixture.steps[0].choiceIndex + '-222-choice' + fixture.steps[1].choiceIndex,
      fixture.id + ': chain identity differs from the exact two owned actions.');
    else setup(fixture.id === fixture.steps[0].eventId + '-choice' + fixture.steps[0].choiceIndex,
      fixture.id + ': single-action identity differs.');
    let before = fixture.initial;
    for (const [index, step] of fixture.steps.entries()) {
      const pair = keyOf(step);
      setup(choices[pair] && CURRENT[pair] && before.pendingEvents[0]?.id === step.eventId,
        fixture.id + ': unowned action or wrong actual top card was supplied.');
      setup(provenance.actualPickerBatch.pendingEvents[index].choices[step.choiceIndex].consequence === CURRENT[pair],
        fixture.id + ': actual current picker preview differs from the independent current text.');
      setup(before.pendingEvents.filter(event => event.id === step.eventId).length === 1
        && before.eventLastFired?.[String(step.eventId)] === before.seasons[before.seasons.length - 1].year,
        fixture.id + ': actual picker did not uniquely deliver and stamp this card.');
      const selected = before.pendingEvents[0].choices[step.choiceIndex];
      setup(selected.label === choices[pair].label && typeof selected.apply === 'undefined' && step.choiceLabel === choices[pair].label
        && step.currentConsequence === CURRENT[pair], fixture.id + ': serialized full choice or current preview identity differs.');
      setup(step.reloadAfter === true && step.resolve?.mode === 'vector' && step.resolve.drawCount === 2
        && Array.isArray(step.resolve.draws) && JSON.stringify(step.resolve.draws) === JSON.stringify([0.99, 0.99]),
        fixture.id + ': original two rejecting catalog draws and no outcome draw are required.');
      setup(!before.chanceWheel || before.chanceWheel.seen === true, fixture.id + ': unrelated unseen wheel would block the selected card.');
      setup(step.postWheelExpected === undefined && step.acknowledgementDraws === undefined,
        fixture.id + ': these choices must not invent a wheel or acknowledgement.');
      setup(stateHash(step.expected) === step.expectedSha256 && literalIssues(before, step.expected, step).length === 0,
        fixture.id + ': independent literal full-save effects do not guard the expected outcome.');
      if (index === 0 && chain) setup(step.expected.morale === (step.choiceIndex === 0 ? 66 : 63)
        && step.expected.pendingEvents[0]?.id === 222, fixture.id + ': actual precursor cannot preserve222 after crossing the fresh offer gate.');
      before = step.expected;
    }
  }
  const installedRows = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'installed.json'), 'utf8'));
  setup(installedRows.length === 521, 'Exactly 521 previously bound locked installed versions are required.');
  installedBefore = installedRows.map(row => {
    setup(row.path.startsWith('node_modules/') && !row.path.split('/').includes('..'), 'Installed dependency path escapes the checkout.');
    const filename = path.join(ROOT, row.path, 'package.json');
    setup(JSON.parse(fs.readFileSync(filename, 'utf8')).version === row.version, `${row.path}: installed locked version changed.`);
    return { ...row, sha256: fileHash(filename) };
  });
  report.installed = installedBefore;
  toolsBefore = ['esbuild', 'playwright', 'playwright-core'].map(name => { const filename = require.resolve(`${name}/package.json`); return { name, file: filename, version: JSON.parse(fs.readFileSync(filename, 'utf8')).version, sha256: fileHash(filename) }; });
  report.tools = toolsBefore;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache'));
  const manifestFile = path.join(cache, 'manifest.json');
  fontHash = fileHash(manifestFile);
  report.fonts = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  fonts = new Map(report.fonts.map(entry => {
    setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin) && /^[a-f0-9]{64}$/.test(entry.file), 'Font dependency must come from its retained declared manifest.');
    const filename = path.join(cache, entry.file);
    setup(fileHash(filename) === entry.sha256, `Retained font bytes differ: ${entry.url}`);
    return [entry.url, { body: fs.readFileSync(filename), contentType: entry.contentType }];
  }));
  distBefore = listFiles(path.join(ROOT, 'dist'));
  report.dist = distBefore;
  const base = await serve();
  browser = await pw.chromium.launch({ headless: true });
  for (const fixture of fixtures.scenarios) await runCase(base, PROFILES[1], fixture);
  for (const profile of [PROFILES[0], PROFILES[2]]) for (const id of CHAINS)
    await runCase(base, profile, fixtures.scenarios.find(fixture => fixture.id === id));
  const controlFixture = fixtures.scenarios.find(fixture => fixture.id === CHAINS[0]);
  await runCase(base, PROFILES[1], controlFixture, 'omit-choice');
  await runCase(base, PROFILES[1], controlFixture, 'delete-save');
  check(report.cases.length === 14 && report.controls.length === 2 && report.inventory.length === 54,
    'Final counts differ from fourteen natural journeys, two effective controls and fifty-four original PNGs.');
  check(report.cases.every(row => {
    const steps = fixtures.scenarios.find(fixture => fixture.id === row.fixture).steps.length;
    return row.stages.filter(stage => stage.stage === 'answered').length === steps
      && row.reloads.length === steps + 2 && row.shots.length === steps * 2;
  }), 'Every natural journey needs each actual answer, initial/intermediate/two resolved literal reloads and original captures.');
  check(report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'answered').length, 0) === 26,
    'Exactly twenty-six natural actual choices are required.');
  check(report.cases.reduce((sum, row) => sum + row.reloads.length, 0) === 54, 'Exactly fifty-four literal natural reloads are required.');
  const previews = new Set(report.cases.flatMap(row => row.stages.filter(stage => stage.stage === 'offered')
    .flatMap(stage => stage.choices.filter(choice => LEGACY[stage.eventId + ':' + choice.index]).map(choice => stage.eventId + ':' + choice.index))));
  check(previews.size === 3, 'All three independent current previews must render from actual old selected captions.');
  check(new Set(report.inventory.map(image => image.file)).size === 54, 'Every original capture needs a distinct filename.');
  for (const image of report.inventory) check(fileHash(path.join(OUT, image.file)) === image.sha256
    && fs.statSync(path.join(OUT, image.file)).size === image.bytes, 'Original capture changed: ' + image.file);
} catch (error) {
  report.issues.push(String(error?.stack ?? error));
  if (!report.setupFailures) report.failures++;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  report.sourceHeld = sourceBefore.length > 0 && sourceBefore.every(source => fileHash(path.join(ROOT, source.file)) === source.sha256);
  report.toolsHeld = toolsBefore.length === 3 && toolsBefore.every(tool => fileHash(tool.file) === tool.sha256);
  report.installedHeld = installedBefore.length === 521 && installedBefore.every(row => fileHash(path.join(ROOT, row.path, 'package.json')) === row.sha256);
  report.parentHeld = parentFiles.length === 3 && parentFiles.every(file => fileHash(file.filename) === file.sha256);
  report.fixturesHeld = !!fixtureHash && fileHash(FIXTURE) === fixtureHash;
  report.distHeld = distBefore.length > 0 && JSON.stringify(listFiles(path.join(ROOT, 'dist'))) === JSON.stringify(distBefore);
  report.fontsHeld = !!fontHash && fileHash(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(entry => fileHash(path.join(cache, entry.file)) === entry.sha256);
  for (const name of ['sourceHeld', 'toolsHeld', 'installedHeld', 'fixturesHeld', 'distHeld', 'fontsHeld', 'parentHeld']) check(report[name], name + ': proof inputs changed or were never qualified.');
  report.summary = { natural: report.cases.length, controls: report.controls.length, checks: report.checks, originals: report.inventory.length,
    answeredSteps: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'answered').length, 0),
    reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0),
    externalAborts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    retainedFonts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'retained-font').length, 0),
    expectedDiagnostics: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.diagnostics.length, 0),
    failures: report.failures, setupFailures: report.setupFailures, installedVersions: installedBefore.length,
    caseChecks: report.cases.reduce((sum, row) => sum + row.checks, 0),
    controlChecks: report.controls.reduce((sum, row) => sum + row.checks, 0),
    actualPickerOverlays: report.cases.filter(row => row.provenance.kind === 'actual-picker-legacy-caption-overlay').length,
    uniqueScenarios: new Set(report.cases.map(row => row.fixture)).size,
    uniquePlayedChoices: new Set(report.cases.flatMap(row => row.stages.filter(stage => stage.stage === 'answered').map(keyOf))).size };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed';
  write();
  console.log('Soccer pending-morale browser: ' + report.status + '; ' + report.checks + ' checks, ' + report.cases.length
    + ' natural cases, ' + report.controls.length + ' controls, ' + report.inventory.length + ' originals, '
    + report.failures + ' failures, ' + report.setupFailures + ' setup failures.');
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
