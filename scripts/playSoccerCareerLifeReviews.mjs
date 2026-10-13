/* Actual built Soccer Career life reviews, remote CI only. The independent
 * normal proof supplies full engine careers and guarded expected saves.
 * Actual picker delivery and prepared queue presentation are reported separately.
 * Nothing here assigns player meters or changes any application source.
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

assert(process.env.CI, 'Soccer life-review browser execution is remote CI only.');
assert(process.env.CAREER_REVIEWS_PHASE === 'fixed', 'This actual browser proof requires the qualified fixed phase.');
assert(process.env.CAREER_REVIEWS_OUT && path.isAbsolute(process.env.CAREER_REVIEWS_OUT), 'CAREER_REVIEWS_OUT must be an absolute artifact root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.CAREER_REVIEWS_OUT;
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
  sourceHeld: false, toolsHeld: false, installedHeld: false, fixturesHeld: false, distHeld: false,
  limits: ['Signed out, local saved outcomes only; no backend completion is credited.',
    'Acquisition, season advance and picker provenance come from the separately qualified normal engine proof.',
    'Any reordered queue is explicitly prepared presentation, not credited as automatic picker order.',
    'Browser play starts at a saved review; acquisition and season advance are model outcomes, not a fully played UI career.',
    'Once means an answered card and its effects stay consumed through repeated literal reloads; later picker exclusion is unit proof.',
    'External flag images and nonessential network are blocked. Their appearance is not visually qualified.',
    'Captures cover selected cards and saved continuation, not blanket visual acceptance.'],
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
const fields = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const choices = ['Review your match-analysis assignment', 'Finish your youth-session plan', 'Leave the course'];
const gift = 'Hand it back unopened, call it a gift';
const effects = [{ skill: 'passing', integrity: 2, flag: 3 }, { skill: 'defending', integrity: 1, flag: 3 }, { morale: 2, flag: 4 }];
const clamp = number => Math.max(0, Math.min(100, number));
function literalIssues(before, after, step) {
  const issues = [];
  if (step.eventId === 630 && effects[step.choiceIndex]) {
    const effect = effects[step.choiceIndex];
    if (step.choiceLabel !== choices[step.choiceIndex]) issues.push('literal-choice-identity');
    if (after.morale !== clamp(before.morale + (effect.morale ?? 0))) issues.push('literal-morale');
    if (after.integrityBonus !== before.integrityBonus + (effect.integrity ?? 0)) issues.push('literal-integrity');
    if (after.lifeFlags?.coachingBadges !== effect.flag) issues.push('literal-course-stage');
    const boost = { ...before.statBoostNextSeason };
    if (effect.skill) boost[effect.skill] = (boost[effect.skill] ?? 0) + 1;
    if (JSON.stringify(after.statBoostNextSeason) !== JSON.stringify(boost)) issues.push('literal-queued-boost');
  } else if (step.eventId === 237 && step.choiceIndex === 1) {
    if (step.choiceLabel !== gift) issues.push('literal-choice-identity');
    if (after.lifeFlags?.teammateLoan !== 2) issues.push('literal-loan-stage');
    if (after.morale !== clamp(before.morale + 3)) issues.push('literal-morale');
    if (after.integrityBonus !== before.integrityBonus + 4) issues.push('literal-integrity');
    if (JSON.stringify(after.statBoostNextSeason) !== JSON.stringify(before.statBoostNextSeason)) issues.push('invented-gift-boost');
  } else issues.push('unowned-event');
  if (fields.some(field => after[field] !== before[field])) issues.push('immediate-base-stat-change');
  for (const field of ['netWorth', 'popularity', 'socialMediaFollowers']) {
    if (after[field] !== before[field]) issues.push(`invented-${field}`);
  }
  if (JSON.stringify(after.managerState) !== JSON.stringify(before.managerState)) issues.push('invented-manager-state');
  if (after.lastEventId !== step.eventId) issues.push('last-event-id');
  if (JSON.stringify(after.pendingEvents.map(event => event.id)) !== JSON.stringify(before.pendingEvents.slice(1).map(event => event.id))) issues.push('single-queue-consumption');
  if (after.events.length !== before.events.length + 1) issues.push('single-history-line');
  return issues;
}
function savedOutcomeIssues(before, raw, step) {
  const issues = [];
  if (raw === null) return ['saved-career-missing'];
  const actual = JSON.parse(raw);
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
  'src/lib/soccerCareerContracts.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/careerEventDeck.ts', 'src/lib/careerChanceWheel.ts',
  'src/pages/SoccerCareer.tsx', 'src/components/soccer-career/careerMoments.ts', 'src/components/career-moments/useCareerMoment.ts',
  'src/components/FlagImg.tsx', 'src/lib/flagUtils.ts', 'src/lib/soccerCurrency.ts',
  'src/test/soccerCareerLifeReviews.test.ts',
  'scripts/simSoccerCareerLifeReviews.mjs', 'scripts/playSoccerCareerLifeReviews.mjs',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs',
  'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
let sourceBefore = [];
let distBefore = [];
let toolsBefore = [];
let installedBefore = [];
let fixtureHash;
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
  await page.addInitScript(({ now, eventSeeds }) => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    const reseed = initial => {
      let number = initial >>> 0;
      Math.random = () => { number = (number + 0x6d2b79f5) | 0; let value = Math.imul(number ^ (number >>> 15), 1 | number); value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value; return ((value ^ (value >>> 14)) >>> 0) / 4294967296; };
    };
    window.__lifeReviewChoiceSeeds = [];
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (!button) return;
      const labels = [...button.querySelectorAll('span.font-bold.text-sm')].map(span => span.textContent.trim());
      const heading = button.parentElement?.parentElement?.querySelector('h3')?.textContent.trim();
      const step = eventSeeds.find(step => step.title === heading && labels.includes(step.choiceLabel));
      if (step) {
        reseed(step.seed);
        window.__lifeReviewChoiceSeeds.push({ title: heading, choiceLabel: step.choiceLabel, seed: step.seed });
      }
    }, true);
  }, { now, eventSeeds: fixture.steps.map((step, index) => ({ ...step, expected: undefined,
    title: (index === 0 ? fixture.initial : fixture.steps[index - 1].expected).pendingEvents[0].title })) });
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const saved = async () => JSON.parse(await raw());
  const ready = async () => {
    await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 });
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
  const heading = page.getByRole('heading', { name: event.title, exact: true });
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
  const row = { id: `${profile.width}-${fixture.id}-${variant}`, fixture: fixture.id, width: profile.width, provenance: fixture.provenance,
    checks: 0, issues: [], errors: [], assetErrors: [], transport: [], diagnostics: [], shots: [], stages: [], reloads: [], layouts: [] };
  (variant === 'natural' ? report.cases : report.controls).push(row);
  let walk;
  try {
    walk = await open(base, profile, fixture, row);
    const initialRaw = await walk.raw();
    check(initialRaw === JSON.stringify(fixture.initial), `${row.id}: actual route loader changed the canonical full fixture.`, row);
    check(sha(initialRaw ?? '') === fixture.initialSha256, `${row.id}: initial saved hash differs from qualified fixture.`, row);
    row.stages.push({ stage: 'loaded', raw: initialRaw, sha256: sha(initialRaw ?? '') });
    if (variant === 'natural') {
      await reload(walk, row, 'pending-review-reload');
      check(await walk.raw() === initialRaw, `${row.id}: pending review did not restore its full original bytes.`, row);
      row.stages.push({ stage: 'pending-restored', raw: await walk.raw() });
    }
    for (let index = 0; index < fixture.steps.length; index++) {
      const step = fixture.steps[index];
      const beforeRaw = await walk.raw();
      const before = JSON.parse(beforeRaw);
      setup(before.pendingEvents[0]?.id === step.eventId && before.phase === 'random_events', `${row.id}: step ${index} is not the actual top event.`);
      const event = before.pendingEvents[0];
      const card = eventCard(walk.page, event);
      await card.waitFor();
      check(await card.getByRole('button').count() === event.choices.length, `${row.id}: actual event choice count differs from save.`, row);
      const button = await choiceButton(walk, card, step.choiceLabel, row);
      check(event.choices[step.choiceIndex].label === step.choiceLabel, `${row.id}: fixture index differs from actual saved choice identity.`, row);
      const displayedConsequence = (await button.locator('div').last().innerText()).trim();
      check(displayedConsequence.length > 0, `${row.id}: the selected choice has no displayed consequence.`, row);
      check(displayedConsequence === event.choices[step.choiceIndex].consequence, `${row.id}: displayed consequences differ from the saved catalog choice.`, row);
      row.stages.push({ stage: 'offered', eventId: event.id, title: event.title, choices: event.choices.map(choice => ({ label: choice.label, consequence: choice.consequence })), displayedConsequence, raw: beforeRaw });
      if (variant === 'natural') await capture(walk, row, 'pending-review-after-reload', card);
      if (variant === 'omit-choice') {
        row.detected = savedOutcomeIssues(before, await walk.raw(), step);
        check(row.detected.includes('complete-saved-state') && row.detected.includes('single-queue-consumption') && row.detected.includes('single-history-line'), `${row.id}: omitted choice was not rejected by actual outcome detectors.`, row);
        check(await walk.raw() === beforeRaw, `${row.id}: omitted choice altered save bytes.`, row);
        check(await button.count() === 1, `${row.id}: omitted choice did not keep its real action available.`, row);
        await capture(walk, row, 'detected-omission', card);
        return;
      }
      const seedCount = await walk.page.evaluate(() => window.__lifeReviewChoiceSeeds.length);
      await walk.activate(button);
      await walk.page.waitForFunction(({ key, id, count }) => {
        const saved = JSON.parse(localStorage.getItem(key));
        return saved?.lastEventId === id && saved.pendingEvents.length === count;
      }, { key: KEY, id: step.eventId, count: before.pendingEvents.length - 1 });
      const afterRaw = await walk.raw();
      const actual = JSON.parse(afterRaw);
      const seedReceipts = await walk.page.evaluate(() => window.__lifeReviewChoiceSeeds);
      check(seedReceipts.length === seedCount + 1 && seedReceipts.at(-1)?.seed === step.seed && seedReceipts.at(-1)?.choiceLabel === step.choiceLabel,
        `${row.id}: the actual native choice did not receive its qualified seed.`, row);
      const findings = savedOutcomeIssues(before, afterRaw, step);
      row.stages.push({ stage: 'answered', eventId: step.eventId, choiceIndex: step.choiceIndex, choiceLabel: step.choiceLabel, seed: step.seed,
        seedReceipt: seedReceipts.at(-1), rawBefore: beforeRaw, rawAfter: afterRaw, expectedSha256: step.expectedSha256, actualSha256: sha(afterRaw), findings });
      check(findings.length === 0, `${row.id}: full saved answer differs: ${findings.join(', ')}`, row);
      check(await walk.page.getByRole('heading', { name: event.title, exact: true }).count() === 0, `${row.id}: consumed event still displays an actionable card.`, row);
      if (variant === 'delete-save') {
        const removed = await walk.page.evaluate(key => { const raw = localStorage.getItem(key); localStorage.removeItem(key); return { raw, after: localStorage.getItem(key) }; }, KEY);
        check(removed.raw === afterRaw && removed.after === null, `${row.id}: control did not delete the actual saved answer.`, row);
        await walk.page.reload({ waitUntil: 'domcontentloaded' });
        await walk.page.getByRole('button', { name: 'How to play', exact: true }).waitFor();
        const lostRaw = await walk.raw();
        row.detected = savedOutcomeIssues(before, lostRaw, step);
        check(JSON.stringify(row.detected) === JSON.stringify(['saved-career-missing']), `${row.id}: deleted save did not fail its exact owned restoration detector.`, row);
        check(await walk.page.getByRole('heading', { name: event.title, exact: true }).count() === 0, `${row.id}: deleted saved event survived on the actual route.`, row);
        const creation = walk.page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('..');
        await creation.waitFor();
        row.stages.push({ stage: 'deleted-save-reload', removedRaw: removed.raw, rawAfter: lostRaw });
        await capture(walk, row, 'detected-deletion', creation);
        return;
      }
      await reload(walk, row, `event-${step.eventId}-reload`);
      check(await walk.raw() === afterRaw, `${row.id}: restored answer has different bytes.`, row);
      check(await walk.page.getByRole('heading', { name: event.title, exact: true }).count() === 0, `${row.id}: reload re-offered the consumed event.`, row);
      check((await walk.saved()).lastEventId === step.eventId, `${row.id}: reload lost the consumed event receipt.`, row);
      const restoredFindings = savedOutcomeIssues(before, await walk.raw(), step);
      check(restoredFindings.length === 0, `${row.id}: restored effects differ: ${restoredFindings.join(', ')}`, row);
    }
    const final = await walk.saved();
    const target = final.pendingEvents.length && final.phase === 'random_events' ? eventCard(walk.page, final.pendingEvents[0]) : walk.page.locator('#dukb-main');
    await capture(walk, row, 'saved-continuation-after-reload', target);
    const finalRaw = await walk.raw();
    await reload(walk, row, 'once-second-reload');
    check(await walk.raw() === finalRaw, `${row.id}: second reload repeated a choice effect.`, row);
    check(await walk.page.getByRole('heading', { name: fixture.initial.pendingEvents[0].title, exact: true }).count() === 0, `${row.id}: second reload re-offered the answered review.`, row);
    row.stages.push({ stage: 'once-second-reload', raw: await walk.raw() });
  } catch (error) {
    report.failures++; row.issues.push(String(error?.stack ?? error)); report.issues.push(`${row.id}: ${String(error)}`);
  } finally {
    check(row.errors.length === 0, `${row.id}: unexpected app errors: ${row.errors.join(' | ')}`, row);
    check(row.assetErrors.length === 0, `${row.id}: owned asset or declared font errors: ${row.assetErrors.join(' | ')}`, row);
    check(row.diagnostics.every(diagnostic => row.transport.some(request => request.action === 'abort' && request.url === diagnostic.url)), `${row.id}: a resource diagnostic lacks an exact aborted URL.`, row);
    check(row.transport.filter(request => request.method === 'POST' && /\/game_completions(?:\?|$)/.test(request.url)).length === 0, `${row.id}: a nonretired event journey attempted a completion POST.`, row);
    if (walk) await walk.context.close();
    write();
  }
}

try {
  sourceBefore = SOURCE_FILES.map(file => ({ file, sha256: fileHash(path.join(ROOT, file)), bytes: fs.statSync(path.join(ROOT, file)).size }));
  report.sourceHashes = sourceBefore;
  setup(fs.existsSync(FIXTURE), 'Qualified normal proof must emit browser-fixtures.json first.');
  fixtureHash = fileHash(FIXTURE);
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  report.fixtureReceipt = { file: path.relative(ARTIFACTS, FIXTURE), bytes: fs.statSync(FIXTURE).size, sha256: fixtureHash, source: fixtures.source };
  setup(fixtures.schemaVersion === 1 && fixtures.saveKey === KEY && fixtures.scenarios?.length === 4, 'Exactly four qualified fixture scenarios with schemaVersion 1 and actual save key are required.');
  now = Date.parse(fixtures.clock);
  setup(Number.isFinite(now), 'Fixture producer must retain its disclosed fixed clock.');
  report.clock = fixtures.clock;
  const bindings = { engineSha256: 'src/lib/soccerCareerEngine.ts', lifeSha256: 'src/lib/soccerCareerLife.ts', routineSha256: 'src/lib/soccerCareerRoutineEvents.ts',
    testSha256: 'src/test/soccerCareerLifeReviews.test.ts', simSha256: 'scripts/simSoccerCareerLifeReviews.mjs',
    momentsSha256: 'src/components/soccer-career/careerMoments.ts', sharedMomentsSha256: 'src/components/career-moments/useCareerMoment.ts',
    saveSha256: 'src/lib/soccerCareerSave.ts' };
  setup(fixtures.source?.head === report.sourceHead, 'Fixture producer and actual browser checkout HEAD differ.');
  for (const [field, file] of Object.entries(bindings)) setup(fixtures.source[field] === fileHash(path.join(ROOT, file)), `Fixture ${field} does not bind actual source.`);
  setup(new Set(fixtures.scenarios.map(fixture => fixture.id)).size === 4, 'Fixture scenario IDs must be distinct.');
  setup(JSON.stringify(fixtures.scenarios.map(fixture => `${fixture.steps?.[0]?.eventId}:${fixture.steps?.[0]?.choiceIndex}`).sort()) === JSON.stringify(['237:1', '630:0', '630:1', '630:2']), 'Fixture scenarios must cover every course choice and the repayment gift.');
  for (const fixture of fixtures.scenarios) {
    setup(/^[a-z0-9-]+$/.test(fixture.id), 'Fixture IDs must be safe descriptive filenames.');
    setup(['prepared-presentation', 'actual-picker-followup'].includes(fixture.provenance?.kind), `${fixture.id}: missing honest presentation provenance.`);
    setup(fixture.initial.phase === 'random_events' && !fixture.initial.retired && fixture.initial.pendingEvents[0]?.id === fixture.steps[0].eventId, `${fixture.id}: initial actual event queue is not playable.`);
    setup(stateHash(fixture.initial) === fixture.initialSha256, `${fixture.id}: full initial state hash differs.`);
    setup(fixture.steps.length === 1 && fixture.initial.pendingEvents.length >= 2, `${fixture.id}: one review and a retained real continuation card are required.`);
    const firstId = fixture.steps[0].eventId;
    const { acquired, nextSeason, pickerBatch } = fixture.provenance;
    setup(!!acquired && !!nextSeason && !!pickerBatch, `${fixture.id}: full acquisition, next-season and picker states are required.`);
    const flag = firstId === 630 ? 'coachingBadges' : 'teammateLoan';
    const acquisitionId = firstId === 630 ? 270 : 236;
    const acquiredYear = acquired.seasons.at(-1).year;
    const nextRow = nextSeason.seasons.at(-1);
    setup(acquired.lifeFlags?.[flag] === 1 && acquired.eventLastFired?.[String(acquisitionId)] === acquiredYear,
      `${fixture.id}: actual acquisition flag or season stamp is missing.`);
    setup(nextRow.year === acquiredYear + 1 && nextRow.type === 'playing' && nextRow.apps > 0 && !nextRow.injurySevere
      && !nextSeason.retired && nextSeason.lifeFlags?.[flag] === 1, `${fixture.id}: no actual next playing season retaining the commitment.`);
    setup(pickerBatch.pendingEvents.filter(event => event.id === firstId).length === 1
      && pickerBatch.eventLastFired?.[String(firstId)] === nextRow.year, `${fixture.id}: actual picker did not deliver and stamp the promised review once.`);
    if (fixture.provenance.kind === 'actual-picker-followup') {
      setup(JSON.stringify(fixture.initial) === JSON.stringify(pickerBatch) && pickerBatch.pendingEvents[0]?.id === firstId,
        `${fixture.id}: natural presentation must be the unchanged actual picker batch.`);
    } else {
      setup(Array.isArray(fixture.provenance.preparedFields) && fixture.provenance.preparedFields.length > 0
        && JSON.stringify(fixture.initial) === JSON.stringify(fixture.provenance.presented), `${fixture.id}: prepared presentation needs its full separate state and disclosure.`);
      setup(JSON.stringify(fixture.initial.pendingEvents[0]) === JSON.stringify(pickerBatch.pendingEvents.find(event => event.id === firstId)),
        `${fixture.id}: preparation changed the actual review card.`);
    }
    const offered = fixture.initial.pendingEvents[0];
    setup(firstId === 630 ? offered.title === 'The course notebook' && JSON.stringify(offered.choices.map(choice => choice.label)) === JSON.stringify(choices)
      : offered.title === 'The Repayment' && offered.choices.length === 2 && offered.choices[1].label === gift, `${fixture.id}: literal title/choice contract differs.`);
    let before = fixture.initial;
    for (const step of fixture.steps) {
      setup(Number.isInteger(step.seed) && Number.isInteger(step.choiceIndex) && step.choiceIndex >= 0 && step.choiceIndex <= 2 && step.reloadAfter === true, `${fixture.id}: invalid actual choice/seed/reload.`);
      setup(before.pendingEvents[0]?.id === step.eventId && before.pendingEvents[0].choices[step.choiceIndex]?.label === step.choiceLabel, `${fixture.id}: expected states do not form the real queue sequence.`);
      setup(stateHash(step.expected) === step.expectedSha256 && literalIssues(before, step.expected, step).length === 0, `${fixture.id}: independent literal unit effects do not guard the expected full save.`);
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
  for (const profile of PROFILES) for (const fixture of fixtures.scenarios) await runCase(base, profile, fixture);
  const controlFixture = fixtures.scenarios.find(fixture => fixture.steps[0].eventId === 630 && fixture.steps[0].choiceIndex === 0);
  await runCase(base, PROFILES[1], controlFixture, 'omit-choice');
  await runCase(base, PROFILES[1], controlFixture, 'delete-save');
  check(report.cases.length === 12 && report.controls.length === 2 && report.inventory.length === 26, 'Final counts differ from 12 natural cases, 2 effective controls and 26 original PNGs.');
  check(report.cases.every(row => row.stages.filter(stage => stage.stage === 'answered').length === 1 && row.reloads.length === 3 && row.shots.length === 2), 'Each natural journey needs one answer, three literal reloads and two original captures.');
  check(new Set(report.inventory.map(image => image.file)).size === 26, 'Every original capture needs a distinct filename.');
  for (const image of report.inventory) check(fileHash(path.join(OUT, image.file)) === image.sha256 && fs.statSync(path.join(OUT, image.file)).size === image.bytes, `Original capture changed: ${image.file}`);
} catch (error) {
  report.issues.push(String(error?.stack ?? error));
  if (!report.setupFailures) report.failures++;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  report.sourceHeld = sourceBefore.length > 0 && sourceBefore.every(source => fileHash(path.join(ROOT, source.file)) === source.sha256);
  report.toolsHeld = toolsBefore.length === 3 && toolsBefore.every(tool => fileHash(tool.file) === tool.sha256);
  report.installedHeld = installedBefore.length === 521 && installedBefore.every(row => fileHash(path.join(ROOT, row.path, 'package.json')) === row.sha256);
  report.fixturesHeld = !!fixtureHash && fileHash(FIXTURE) === fixtureHash;
  report.distHeld = distBefore.length > 0 && JSON.stringify(listFiles(path.join(ROOT, 'dist'))) === JSON.stringify(distBefore);
  report.fontsHeld = !!fontHash && fileHash(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(entry => fileHash(path.join(cache, entry.file)) === entry.sha256);
  for (const name of ['sourceHeld', 'toolsHeld', 'installedHeld', 'fixturesHeld', 'distHeld', 'fontsHeld']) check(report[name], `${name}: proof inputs changed or were never qualified.`);
  report.summary = { natural: report.cases.length, controls: report.controls.length, checks: report.checks, originals: report.inventory.length,
    answeredSteps: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'answered').length, 0),
    reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0),
    externalAborts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    retainedFonts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'retained-font').length, 0),
    expectedDiagnostics: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.diagnostics.length, 0),
    failures: report.failures, setupFailures: report.setupFailures, installedVersions: installedBefore.length,
    caseChecks: report.cases.reduce((sum, row) => sum + row.checks, 0),
    controlChecks: report.controls.reduce((sum, row) => sum + row.checks, 0),
    automaticPickerPresentations: report.cases.filter(row => row.provenance.kind === 'actual-picker-followup').length,
    preparedPresentations: report.cases.filter(row => row.provenance.kind === 'prepared-presentation').length };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed';
  write();
  console.log(`Soccer life-review browser: ${report.status}; ${report.checks} checks, ${report.cases.length} natural cases, ${report.controls.length} controls, ${report.inventory.length} originals, ${report.failures} failures, ${report.setupFailures} setup failures.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
