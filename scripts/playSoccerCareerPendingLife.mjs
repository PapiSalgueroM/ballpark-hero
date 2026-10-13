/* Actual saved Soccer Career life choices, remote CI only. Full engine picker
 * fixtures are supplied by the independent normal proof. A rejecting constant
 * input tests the original resolver, never a mocked choice, queue or reward.
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

assert(process.env.CI, 'Soccer pending-Life browser execution is remote CI only.');
assert(process.env.CAREER_PENDING_PHASE === 'fixed', 'This actual browser proof requires the qualified fixed phase.');
assert(process.env.CAREER_PENDING_OUT && path.isAbsolute(process.env.CAREER_PENDING_OUT), 'CAREER_PENDING_OUT must be an absolute artifact root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.CAREER_PENDING_OUT;
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
    'Initial profile context is prepared; full actual picker delivery is model proof, not a fully played UI career.',
    'Only choice0 is played for each of fifteen cards; all31 choice effects are separate unit proof.',
    'The resolver receives constant0.99 after pending reload. This is a disclosed input, not a seeded random stream.',
    'Every observed draw and stack is retained. Original Life caller ordinals belong to the separate model proof.',
    'Once means the played effect and queue stay consumed through literal reloads, not lifetime exclusion of recurring cards.',
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
const IDS = [205, 206, 207, 208, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 245];
const REPEATS = [207, 211, 218];
const fields = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const firstLabels = ['Laugh it off', 'Train with the strangers anyway', 'Confront him', 'Play dumb, enjoy the raise',
  'Give the people the flip', 'Trademark it', 'Class is permanent', 'Yes', 'Get in his face', 'No regrets',
  'The work is the reward', 'Write it', 'Return enlightened', 'Commit to the cape', 'Double down'];
const effects = {
  205: { followers: 0.4, morale: -3 }, 206: { followers: 0.6, skill: 'physical' }, 207: { morale: 5 },
  208: { value: 5, morale: -5, integrity: -2 }, 210: { followers: 1.5 }, 211: { sponsor: 0.3 },
  212: { integrity: 3, popularity: 5 }, 213: { followers: 0.5, popularity: -2 }, 214: { money: -0.2, skill: 'physical' },
  215: { morale: 8, money: -0.1 }, 216: { skill: 'passing', morale: 5 }, 217: { popularity: 4, morale: -3 },
  218: { pace: -1 }, 219: { followers: 0.8, popularity: -3 }, 245: { followers: 0.8, popularity: -5 },
};
const wheels = {
  210: { title: 'The Halftime Backflip', chance: 0.15, hit: 'Hamstring tweaked', miss: 'Backflip lands safely' },
  218: { title: 'The Monastery Offseason', chance: 0.6, hit: 'Sharper after the retreat', miss: 'Pace drops by 1' },
  219: { title: 'The Cape Era', chance: 0.5, hit: 'The cape is loved', miss: 'The cape divides opinion' },
};
const clamp = number => Math.max(0, Math.min(100, number));
const cents = number => Math.round(number * 100) / 100;
function literalIssues(before, after, step, acknowledged = false) {
  const issues = [];
  const e = effects[step.eventId];
  if (!e || step.choiceIndex !== 0) return ['unowned-choice'];
  if (step.choiceLabel !== firstLabels[IDS.indexOf(step.eventId)]) issues.push('literal-choice-identity');
  if (after.morale !== clamp(before.morale + (e.morale ?? 0))) issues.push('literal-morale');
  if (after.popularity !== clamp(before.popularity + (e.popularity ?? 0))) issues.push('literal-popularity');
  if (after.integrityBonus !== before.integrityBonus + (e.integrity ?? 0)) issues.push('literal-integrity');
  if (after.netWorth !== (e.money ? cents(before.netWorth + e.money) : before.netWorth)) issues.push('literal-money');
  if (after.socialMediaFollowers !== (e.followers ? cents(before.socialMediaFollowers + e.followers) : before.socialMediaFollowers)) issues.push('literal-followers');
  if (after.marketValue !== before.marketValue + (e.value ?? 0)) issues.push('literal-market-value');
  if (after.sponsorBonus !== (e.sponsor ? cents((before.sponsorBonus ?? 0) + e.sponsor) : before.sponsorBonus)) issues.push('literal-sponsor');
  const boost = { ...before.statBoostNextSeason };
  if (e.skill) boost[e.skill] = (boost[e.skill] ?? 0) + 1;
  if (JSON.stringify(after.statBoostNextSeason) !== JSON.stringify(boost)) issues.push('literal-queued-boost');
  for (const field of fields) {
    const expected = field === 'pace' && e.pace ? Math.max(20, Math.min(99, before.pace + e.pace)) : before[field];
    if (after[field] !== expected) issues.push(`literal-${field}`);
  }
  if (JSON.stringify(after.lifeFlags) !== JSON.stringify(before.lifeFlags) || after.agentId !== before.agentId) issues.push('literal-profile-held');
  if (JSON.stringify(after.eventLastFired) !== JSON.stringify(before.eventLastFired)) issues.push('literal-ledger-held');
  const wheel = wheels[step.eventId];
  if (wheel ? !after.chanceWheel || Object.keys(after.chanceWheel).length !== 7
    || Object.entries({ ...wheel, roll: 0.99, result: false, seen: acknowledged }).some(([key, value]) => after.chanceWheel[key] !== value)
    : JSON.stringify(after.chanceWheel) !== JSON.stringify(before.chanceWheel)) issues.push('literal-wheel');
  if (after.lastEventId !== step.eventId) issues.push('last-event-id');
  if (JSON.stringify(after.pendingEvents.map(event => event.id)) !== JSON.stringify(before.pendingEvents.slice(1).map(event => event.id))) issues.push('single-queue-consumption');
  if (after.events.length !== before.events.length + 1) issues.push('single-history-line');
  return issues;
}
function savedOutcomeIssues(before, raw, step, acknowledged = false) {
  const issues = [];
  if (raw === null) return ['saved-career-missing'];
  const actual = JSON.parse(raw);
  if (raw !== JSON.stringify(acknowledged ? step.postWheelExpected : step.expected)) issues.push('complete-saved-state');
  if (stateHash(actual) !== (acknowledged ? step.postWheelExpectedSha256 : step.expectedSha256)) issues.push('expected-state-hash');
  return [...issues, ...literalIssues(before, actual, step, acknowledged)];
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
  'src/components/soccer-career/CareerChanceWheel.tsx',
  'src/components/FlagImg.tsx', 'src/lib/flagUtils.ts', 'src/lib/soccerCurrency.ts',
  'src/test/soccerCareerPendingLife.test.ts',
  'scripts/simSoccerCareerPendingLife.mjs', 'scripts/playSoccerCareerPendingLife.mjs',
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
  await page.addInitScript(({ now }) => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, { now });
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
    await reload(walk, row, 'pending-choice-reload');
    check(await walk.raw() === initialRaw, `${row.id}: pending choice did not restore its full original bytes.`, row);
    row.stages.push({ stage: 'pending-restored', raw: await walk.raw() });
    for (let index = 0; index < fixture.steps.length; index++) {
      const step = fixture.steps[index];
      const beforeRaw = await walk.raw();
      const before = JSON.parse(beforeRaw);
      setup(before.pendingEvents[0]?.id === step.eventId && before.phase === 'random_events', `${row.id}: step ${index} is not the actual top event.`);
      const event = before.pendingEvents[0];
      const card = eventCard(walk.page, event);
      await card.waitFor();
      check(await card.getByRole('button').count() === event.choices.length, `${row.id}: actual event choice count differs from save.`, row);
      const rendered = [];
      for (const option of event.choices) {
        const optionButton = await choiceButton(walk, card, option.label, row);
        const consequence = (await optionButton.locator('div').last().innerText()).trim();
        check(consequence === option.consequence, `${row.id}: rendered ${option.label} effect differs from its saved card.`, row);
        rendered.push({ label: option.label, consequence });
      }
      const button = await choiceButton(walk, card, step.choiceLabel, row);
      check(event.choices[step.choiceIndex].label === step.choiceLabel, `${row.id}: fixture index differs from actual saved choice identity.`, row);
      const displayedConsequence = (await button.locator('div').last().innerText()).trim();
      check(displayedConsequence.length > 0, `${row.id}: the selected choice has no displayed consequence.`, row);
      check(displayedConsequence === event.choices[step.choiceIndex].consequence, `${row.id}: displayed consequences differ from the saved catalog choice.`, row);
      row.stages.push({ stage: 'offered', eventId: event.id, title: event.title, choices: rendered, displayedConsequence, raw: beforeRaw });
      if (variant === 'natural') await capture(walk, row, 'pending-choice-after-reload', card);
      if (variant === 'omit-choice') {
        row.detected = savedOutcomeIssues(before, await walk.raw(), step);
        check(row.detected.includes('complete-saved-state') && row.detected.includes('single-queue-consumption') && row.detected.includes('single-history-line'), `${row.id}: omitted choice was not rejected by actual outcome detectors.`, row);
        check(await walk.raw() === beforeRaw, `${row.id}: omitted choice altered save bytes.`, row);
        check(await button.count() === 1, `${row.id}: omitted choice did not keep its real action available.`, row);
        await capture(walk, row, 'detected-omission', card);
        return;
      }
      await walk.page.evaluate(() => {
        window.__pendingOriginalRandom = Math.random;
        window.__pendingResolverDraws = [];
        Math.random = () => { window.__pendingResolverDraws.push({ ordinal: window.__pendingResolverDraws.length + 1,
          value: 0.99, stack: new Error('Observed resolver input').stack }); return 0.99; };
      });
      await walk.activate(button);
      await walk.page.waitForFunction(({ key, id, count }) => {
        const saved = JSON.parse(localStorage.getItem(key));
        return saved?.lastEventId === id && saved.pendingEvents.length === count;
      }, { key: KEY, id: step.eventId, count: before.pendingEvents.length - 1 });
      const afterRaw = await walk.raw();
      const actual = JSON.parse(afterRaw);
      const observedDraws = await walk.page.evaluate(() => {
        Math.random = window.__pendingOriginalRandom;
        return window.__pendingResolverDraws;
      });
      check(JSON.stringify(observedDraws.map(draw => draw.value)) === JSON.stringify(step.resolve.draws)
        && observedDraws.length === step.resolve.drawCount && observedDraws.every((draw, i) => draw.ordinal === i + 1 && typeof draw.stack === 'string' && draw.stack.length > 0),
        `${row.id}: observed choice draw stream differs from the actual constant-input model.`, row);
      const findings = savedOutcomeIssues(before, afterRaw, step);
      row.stages.push({ stage: 'answered', eventId: step.eventId, choiceIndex: step.choiceIndex, choiceLabel: step.choiceLabel,
        input: step.resolve, observedDraws, rawBefore: beforeRaw, rawAfter: afterRaw, expectedSha256: step.expectedSha256, actualSha256: sha(afterRaw), findings });
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
      if (wheels[step.eventId]) {
        const dialog = walk.page.locator('[data-career-chance-wheel]');
        await dialog.waitFor();
        check((await dialog.getByRole('heading').innerText()).trim() === wheels[step.eventId].title, `${row.id}: actual wheel title differs.`, row);
        const wheelBefore = await walk.raw();
        await walk.page.evaluate(() => {
          window.__pendingWheelRandom = Math.random;
          window.__pendingWheelDraws = [];
          Math.random = () => { const value = window.__pendingWheelRandom();
            window.__pendingWheelDraws.push({ value, stack: new Error('Observed wheel input').stack }); return value; };
        });
        await walk.activate(dialog.locator('[data-wheel-skip]'));
        await walk.page.waitForFunction(expected => document.querySelector('[data-wheel-result]')?.textContent.trim() === expected, wheels[step.eventId].miss);
        const result = (await dialog.locator('[data-wheel-result]').innerText()).trim();
        check(result === wheels[step.eventId].miss && await walk.raw() === wheelBefore, `${row.id}: actual reveal changed or misreported the saved roll.`, row);
        await capture(walk, row, 'resolved-wheel-after-reload', dialog);
        await walk.activate(dialog.locator('[data-wheel-continue]'));
        await walk.page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.chanceWheel?.seen === true, KEY);
        const postRaw = await walk.raw();
        const wheelDraws = await walk.page.evaluate(() => { Math.random = window.__pendingWheelRandom; return window.__pendingWheelDraws; });
        const acknowledgedFindings = savedOutcomeIssues(before, postRaw, step, true);
        check(wheelDraws.length === 0, `${row.id}: showing or acknowledging the actual wheel drew again.`, row);
        check(acknowledgedFindings.length === 0, `${row.id}: wheel acknowledgement changed more than seen: ${acknowledgedFindings.join(', ')}`, row);
        row.stages.push({ stage: 'wheel-acknowledged', rawBefore: wheelBefore, rawAfter: postRaw, result, wheelDraws,
          expectedSha256: step.postWheelExpectedSha256, actualSha256: sha(postRaw), findings: acknowledgedFindings });
        await reload(walk, row, 'acknowledged-wheel-reload');
        check(await walk.raw() === postRaw && await dialog.count() === 0, `${row.id}: acknowledged wheel replayed or lost its literal save.`, row);
      }
    }
    const final = await walk.saved();
    const target = final.pendingEvents.length && final.phase === 'random_events' ? eventCard(walk.page, final.pendingEvents[0]) : walk.page.locator('#dukb-main');
    if (!wheels[fixture.steps[0].eventId]) await capture(walk, row, 'saved-continuation-after-reload', target);
    await target.waitFor();
    check(await target.getByRole('button').count() > 0, `${row.id}: no legal continuation action remains.`, row);
    const finalRaw = await walk.raw();
    await reload(walk, row, 'once-second-reload');
    check(await walk.raw() === finalRaw, `${row.id}: second reload repeated a choice effect.`, row);
    check(await walk.page.getByRole('heading', { name: fixture.initial.pendingEvents[0].title, exact: true }).count() === 0, `${row.id}: second reload re-offered the consumed choice.`, row);
    if (wheels[fixture.steps[0].eventId]) check(await walk.page.locator('[data-career-chance-wheel]').count() === 0, `${row.id}: second reload replayed an acknowledged wheel.`, row);
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
  setup(fixtures.schemaVersion === 1 && fixtures.saveKey === KEY && fixtures.scenarios?.length === 15, 'Exactly fifteen actual picker fixtures with schemaVersion 1 and the saved-career key are required.');
  now = Date.parse(fixtures.clock);
  setup(Number.isFinite(now), 'Fixture producer must retain its disclosed fixed clock.');
  report.clock = fixtures.clock;
  const bindings = { engineSha256: 'src/lib/soccerCareerEngine.ts', lifeSha256: 'src/lib/soccerCareerLife.ts', routineSha256: 'src/lib/soccerCareerRoutineEvents.ts',
    testSha256: 'src/test/soccerCareerPendingLife.test.ts', simSha256: 'scripts/simSoccerCareerPendingLife.mjs',
    momentsSha256: 'src/components/soccer-career/careerMoments.ts', sharedMomentsSha256: 'src/components/career-moments/useCareerMoment.ts',
    saveSha256: 'src/lib/soccerCareerSave.ts', chanceWheelSha256: 'src/lib/careerChanceWheel.ts' };
  setup(fixtures.source?.head === report.sourceHead, 'Fixture producer and actual browser checkout HEAD differ.');
  for (const [field, file] of Object.entries(bindings)) setup(fixtures.source[field] === fileHash(path.join(ROOT, file)), `Fixture ${field} does not bind actual source.`);
  setup(/^[a-f0-9]{40}$/.test(fixtures.source.parentAppRef), 'Fixture producer must disclose its held parent source.');
  setup(new Set(fixtures.scenarios.map(fixture => fixture.id)).size === 15, 'Fixture scenario IDs must be distinct.');
  setup(JSON.stringify(fixtures.scenarios.map(fixture => fixture.steps?.[0]?.eventId).sort((a, b) => a - b)) === JSON.stringify(IDS), 'Fixture scenarios must cover the exact fifteen random-gated Life offers.');
  for (const fixture of fixtures.scenarios) {
    setup(/^[a-z0-9-]+$/.test(fixture.id), 'Fixture IDs must be safe descriptive filenames.');
    setup(fixture.provenance?.kind === 'actual-picker-offer' && Array.isArray(fixture.provenance.preparedFields) && fixture.provenance.preparedFields.length > 0,
      `${fixture.id}: actual offer provenance and prepared-context disclosure are required.`);
    setup(fixture.initial.phase === 'random_events' && !fixture.initial.retired && fixture.initial.pendingEvents[0]?.id === fixture.steps[0].eventId, `${fixture.id}: initial actual event queue is not playable.`);
    setup(stateHash(fixture.initial) === fixture.initialSha256, `${fixture.id}: full initial state hash differs.`);
    setup(fixture.steps.length === 1 && fixture.initial.pendingEvents.length >= 2, `${fixture.id}: one choice and a retained real continuation card are required.`);
    const firstId = fixture.steps[0].eventId;
    setup(fixture.id === `pending-${firstId}` && JSON.stringify(fixture.initial) === JSON.stringify(fixture.provenance.actualPickerBatch),
      `${fixture.id}: initial must be the unchanged full actual picker batch, without queue preparation.`);
    setup(fixture.initial.pendingEvents.filter(event => event.id === firstId).length === 1
      && fixture.initial.eventLastFired?.[String(firstId)] === fixture.initial.seasons.at(-1).year, `${fixture.id}: actual picker did not deliver and stamp the saved offer once.`);
    const offered = fixture.initial.pendingEvents[0];
    setup(offered.choices[0].label === firstLabels[IDS.indexOf(firstId)] && offered.choices.length >= 2, `${fixture.id}: literal first choice or rendered options differ.`);
    const agent = { 205: 'cousin', 206: 'cousin', 207: 'shark', 208: 'super' }[firstId];
    const personality = { 210: 'showman', 211: 'showman', 212: 'iceman', 213: 'iceman', 214: 'hothead', 215: 'hothead',
      216: 'professor', 217: 'professor', 218: 'enigma', 219: 'enigma' }[firstId];
    setup(agent ? fixture.initial.agentId === agent : personality ? fixture.initial.personality === personality : fixture.initial.lifeFlags?.podcast === 1,
      `${fixture.id}: current legal offer profile differs.`);
    setup(!fixture.initial.chanceWheel || fixture.initial.chanceWheel.seen === true, `${fixture.id}: an unrelated unseen wheel would block the saved choice.`);
    let before = fixture.initial;
    for (const step of fixture.steps) {
      setup(step.choiceIndex === 0 && step.reloadAfter === true && step.resolve?.mode === 'constant' && step.resolve.value === 0.99
        && Number.isInteger(step.resolve.drawCount) && step.resolve.drawCount > 0 && step.resolve.draws.length === step.resolve.drawCount
        && step.resolve.draws.every(value => value === 0.99), `${fixture.id}: exact rejecting-input trace and first-choice reload are required.`);
      setup(before.pendingEvents[0]?.id === step.eventId && before.pendingEvents[0].choices[step.choiceIndex]?.label === step.choiceLabel, `${fixture.id}: expected states do not form the real queue sequence.`);
      setup(stateHash(step.expected) === step.expectedSha256 && literalIssues(before, step.expected, step).length === 0, `${fixture.id}: independent literal unit effects do not guard the expected full save.`);
      if (wheels[firstId]) {
        const onlySeen = JSON.parse(JSON.stringify(step.expected)); onlySeen.chanceWheel.seen = true;
        setup(stateHash(step.postWheelExpected) === step.postWheelExpectedSha256 && JSON.stringify(step.postWheelExpected) === JSON.stringify(onlySeen)
          && literalIssues(before, step.postWheelExpected, step, true).length === 0, `${fixture.id}: actual wheel acknowledgement must change only seen.`);
      } else setup(step.postWheelExpected === undefined, `${fixture.id}: no wheel state may be invented for this choice.`);
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
  for (const profile of [PROFILES[0], PROFILES[2]]) for (const id of REPEATS) await runCase(base, profile, fixtures.scenarios.find(fixture => fixture.steps[0].eventId === id));
  const controlFixture = fixtures.scenarios.find(fixture => fixture.steps[0].eventId === 208);
  await runCase(base, PROFILES[1], controlFixture, 'omit-choice');
  await runCase(base, PROFILES[1], controlFixture, 'delete-save');
  check(report.cases.length === 21 && report.controls.length === 2 && report.inventory.length === 44, 'Final counts differ from 21 natural cases, 2 effective controls and 44 original PNGs.');
  check(report.cases.every(row => row.stages.filter(stage => stage.stage === 'answered').length === 1
    && row.reloads.length === (wheels[Number(row.fixture.replace('pending-', ''))] ? 4 : 3) && row.shots.length === 2), 'Each natural journey needs one actual answer, literal pending/answered/once reloads and two originals.');
  check(new Set(report.cases.filter(row => row.width === 390).flatMap(row => row.stages.filter(stage => stage.stage === 'offered')
    .flatMap(stage => stage.choices.map(choice => `${stage.eventId}:${choice.label}`)))).size === 31, 'All31 existing choice labels/consequences must render across the fifteen390 routes.');
  check(new Set(report.inventory.map(image => image.file)).size === 44, 'Every original capture needs a distinct filename.');
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
    actualPickerOffers: report.cases.filter(row => row.provenance.kind === 'actual-picker-offer').length,
    acknowledgedWheels: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'wheel-acknowledged').length, 0),
    uniquePlayedChoices: new Set(report.cases.map(row => row.fixture)).size };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed';
  write();
  console.log(`Soccer pending-Life browser: ${report.status}; ${report.checks} checks, ${report.cases.length} natural cases, ${report.controls.length} controls, ${report.inventory.length} originals, ${report.failures} failures, ${report.setupFailures} setup failures.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
