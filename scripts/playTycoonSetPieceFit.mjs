/**
 * Round 587: the actual built Stadium Tycoon route, with real saves and shots.
 * Requires BASE for a local host serving this worktree's dist. No remote request
 * leaves the isolated browser. The only fixture is a real serialized engine save.
 * TYCOON_SET_PIECE_FIT_CONTROL=wide|clock mutates one served page chunk, never src
 * or dist. A control must land once and fail its intended measured layout check.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const origin = new URL(BASE).origin;
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname), 'BASE must be a protected local built-site host');
const CONTROL = process.env.TYCOON_SET_PIECE_FIT_CONTROL || '';
assert(['', 'wide', 'clock'].includes(CONTROL), 'Unknown TYCOON_SET_PIECE_FIT_CONTROL');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-tycoon-set-piece-fit-'));
console.log(`Built-page evidence directory: ${TEMP}`);
const assets = path.join(ROOT, 'dist/assets');
assert(fs.existsSync(assets), 'No built dist/assets. Nothing was checked.');
const pageChunks = fs.readdirSync(assets).filter(name => name.endsWith('.js'))
  .filter(name => fs.readFileSync(path.join(assets, name), 'utf8').includes('data-set-piece-match'));
assert.equal(pageChunks.length, 1, 'Exactly one actual built page chunk must contain the live kick clock');
const pageChunk = pageChunks[0];
const pageSource = fs.readFileSync(path.join(assets, pageChunk), 'utf8');
const anchors = {
  wide: 'className:"max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl p-4"',
  clock: '"data-set-piece-match":!0,',
};
let mutation = null;
if (CONTROL) {
  const anchor = anchors[CONTROL];
  assert.equal(pageSource.split(anchor).length - 1, 1, 'Control must match one executable property in the actual page chunk');
  const after = CONTROL === 'wide' ? 'style:{minWidth:"900px"},' + anchor : anchor + 'style:{display:"none"},';
  mutation = pageSource.replace(anchor, after);
  assert.notEqual(mutation, pageSource, 'Control must change the served chunk');
}

const engineFile = path.join(TEMP, 'engine.mjs');
await build({ stdin: { contents: "export * as T from './src/lib/stadiumTycoon'; export * as F from './src/lib/freeKick';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: engineFile, logLevel: 'error' });
const { T, F } = await import(pathToFileURL(engineFile).href);
const EPOCH = 1789473600000;
const initial = T.newTycoon(EPOCH);
let offer;
for (let minute = 20; minute <= 80; minute++) {
  initial.minute = minute;
  offer = T.setPieceOffer(initial, true);
  if (offer) break;
}
assert(offer, 'Real engine must provide the deterministic fixture offer');
const kick = F.buildRun(offer.seed)[offer.kickIndex];
let aim;
for (const x of [-.8, .8, -.65, .65]) for (const y of [.7, .85, .5]) for (const power of [.65, .8, .5]) {
  const candidate = { x, y, power, curve: 0 };
  if (F.takeShot(candidate, kick, F.lehmer(offer.seed)).scored) aim ??= candidate;
}
assert(aim, 'Fixture needs a real legal scoring shot, not an injected result');
const seedSave = T.serializeTycoon(initial, EPOCH);
const browser = await chromium.launch();
const cases = [];
let servedMutations = 0;
const layouts = CONTROL ? [[320, 'no-preference']] : [320, 390, 1440].flatMap(width => ['no-preference', 'reduce'].map(motion => [width, motion]));

async function readSave(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), T.TYCOON_SAVE_KEY);
}
async function reach(locator) {
  await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  const geometry = await locator.evaluate(element => {
    const r = element.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const dialog = element.closest('[role="dialog"]')?.getBoundingClientRect();
    return { width: r.width, height: r.height, visible: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1,
      reachable: top === element || element.contains(top), inside: !dialog || r.top >= dialog.top - 1 && r.bottom <= dialog.bottom + 1 };
  });
  assert(geometry.width >= 44 && geometry.height >= 44, 'Shot, Back and range controls must each provide a 44px target: ' + JSON.stringify(geometry));
  assert(geometry.visible && geometry.reachable && geometry.inside, 'Control must be reachable inside the scrolling dialog: ' + JSON.stringify(geometry));
  return geometry;
}
async function inspect(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const clock = document.querySelector('[data-set-piece-match]');
    const r = dialog.getBoundingClientRect();
    const c = clock.getBoundingClientRect();
    const style = getComputedStyle(clock);
    return {
      width: innerWidth, dialog: { left: r.left, right: r.right, width: r.width, height: r.height, scrollHeight: dialog.scrollHeight, clientHeight: dialog.clientHeight },
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || r.left < -1 || r.right > innerWidth + 1 || dialog.scrollWidth > dialog.clientWidth + 1,
      clockVisible: c.width > 0 && c.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
        && c.left >= 0 && c.right <= innerWidth + 1 && c.top >= Math.max(0, r.top) - 1 && c.bottom <= Math.min(innerHeight, r.bottom) + 1,
      clock: clock.textContent,
    };
  });
}

try {
  for (const [width, motion] of layouts) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: motion, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    let blocked = 0;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) { blocked++; return route.abort(); }
      if (url.pathname === '/assets/' + pageChunk) {
        const response = await route.fetch();
        assert.equal(await response.text(), pageSource, 'Local host must serve this worktree\'s exact built page chunk');
        if (mutation) {
          servedMutations++;
          console.log(`CONTROL ${CONTROL}: actual built page chunk mutated once before browser evaluation`);
          return route.fulfill({ response, body: mutation });
        }
        return route.fulfill({ response });
      }
      return route.continue();
    });
    await page.clock.setFixedTime(EPOCH);
    await page.addInitScript(({ key, save }) => {
      localStorage.setItem('cookie-consent', 'essential');
      if (!localStorage.getItem(key)) localStorage.setItem(key, save);
      Math.random = () => .5;
    }, { key: T.TYCOON_SAVE_KEY, save: seedSave });
    await page.goto(BASE + '/stadium-tycoon', { waitUntil: 'networkidle' });
    const opener = page.locator('[data-set-piece-offer]');
    await opener.waitFor();
    await opener.scrollIntoViewIfNeeded();
    await opener.evaluate(element => {
      const top = window.scrollY + element.getBoundingClientRect().top;
      window.scrollTo({ top: Math.max(1, Math.floor(top - 80)), behavior: 'instant' });
    });
    const scrollBefore = await page.evaluate(() => window.scrollY);
    assert(scrollBefore > 0, 'Close-scroll proof must start from a nonzero document position');
    await opener.click();
    const board = page.locator('[data-tycoon-set-piece]');
    await board.waitFor();
    await page.waitForTimeout(250);
    const first = await inspect(page);
    const opened = await readSave(page);
    assert.equal(opened.setPieceAttemptedMatch, offer.match, 'Opening must durably consume the real match attempt');
    assert.equal(opened.setPieceUsedMatch, undefined, 'Opening cannot claim a goal');
    const findings = [];
    if (first.overflow) findings.push('wide');
    if (!first.clockVisible) findings.push('clock');
    await page.screenshot({ path: path.join(TEMP, `kick-${width}-${motion}${CONTROL ? '-' + CONTROL : ''}.png`), fullPage: false });
    if (CONTROL) {
      cases.push({ width, motion, first, findings, blocked });
      await context.close();
      break;
    }
    assert.deepEqual(findings, [], 'Actual built dialog must fit and show its live match clock');
    assert.match(first.clock, /^Match \d+' · 0 - 0$/, 'Clock must show actual match minute and score');
    await page.waitForFunction(before => document.querySelector('[data-set-piece-match]')?.textContent !== before, first.clock, { timeout: 6000 });
    const advanced = await inspect(page);
    assert(advanced.clockVisible && /^Match \d+' · 0 - 0$/.test(advanced.clock), 'The visible clock must advance while aiming');
    const controls = [];
    for (const [label, value] of [['Aim across', aim.x], ['Aim height', aim.y], ['Power', aim.power], ['Curve', aim.curve]]) {
      const input = board.getByLabel(new RegExp('^' + label));
      controls.push({ label, ...await reach(input) });
      await input.focus();
      const before = await input.inputValue();
      await input.press('ArrowLeft');
      assert.notEqual(await input.inputValue(), before, 'The real range must accept keyboard input');
      await input.evaluate((element, next) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(next));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      assert.equal(Number(await input.inputValue()), value, 'Aim control must retain the legal shot input');
    }
    controls.push({ label: 'Back', ...await reach(board.getByRole('button', { name: 'Back', exact: true })) });
    const take = board.getByRole('button', { name: 'Take shot', exact: true });
    controls.push({ label: 'Take shot', ...await reach(take) });
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const beforeShot = await readSave(page);
    await take.click();
    await page.locator('.set-piece-scene').waitFor();
    const motionAtResult = await page.locator('.set-piece-scene').getAttribute('data-motion');
    const afterShot = await readSave(page);
    assert.equal(afterShot.goalsFor, beforeShot.goalsFor + 1, 'The real chosen shot must add exactly one goal');
    assert.equal(afterShot.totalGoals, beforeShot.totalGoals + 1, 'The career total must record one goal');
    assert.equal(afterShot.setPieceUsedMatch, offer.match, 'The awarded match must be durably latched');
    assert(afterShot.money >= beforeShot.money + T.goalBonus(beforeShot), 'A goal must pay at least its normal bonus, plus any live income');
    assert.match(await page.locator('[data-set-piece-match]').textContent(), /^Match \d+' · 1 - 0$/, 'Live modal score must reflect the awarded goal');
    if (motion === 'reduce') {
      assert.equal(motionAtResult, 'static', 'Reduced motion must show the settled shot immediately');
      const ballBefore = await page.locator('.set-piece-scene [data-ball]').getAttribute('transform');
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.set-piece-scene [data-ball]').getAttribute('transform'), ballBefore, 'Reduced motion cannot keep the shot ball moving');
    } else {
      assert.equal(motionAtResult, 'playing', 'Normal preference must start the real replay');
      await page.waitForFunction(() => document.querySelector('.set-piece-scene')?.getAttribute('data-motion') === 'static');
    }
    await page.locator('[data-set-piece-match]').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const settled = await inspect(page);
    assert(!settled.overflow && settled.clockVisible, 'The actual result must also fit and preserve the clock');
    await page.screenshot({ path: path.join(TEMP, `goal-${width}-${motion}.png`), fullPage: false });
    const back = board.getByRole('button', { name: 'Back to match', exact: true });
    controls.push({ label: 'Back to match', ...await reach(back) });
    await back.click();
    await board.waitFor({ state: 'detached' });
    await page.waitForTimeout(250);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    assert(Math.abs(scrollAfter - scrollBefore) <= 1, `Closing the kick must restore document scroll: ${scrollBefore} -> ${scrollAfter}`);
    assert.equal(await page.locator('[data-set-piece-offer]').count(), 0, 'Closing cannot reopen the consumed opportunity');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const banked = await readSave(page);
    assert.equal(banked.goalsFor, 1, 'Replay and Back cannot pay the goal twice');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-room="stadium"]').waitFor();
    const restored = await readSave(page);
    assert.equal(restored.goalsFor, 1, 'The real goal must survive a fresh page load');
    assert.equal(restored.setPieceUsedMatch, offer.match, 'The consumed goal latch must survive reload');
    assert.equal(await page.locator('[data-set-piece-offer]').count(), 0, 'Reload cannot offer another kick in the same match');
    assert.deepEqual(errors, [], 'Built page must have no runtime errors');
    cases.push({ width, motion, first, advanced, settled, controls, scrollBefore, scrollAfter, goalBefore: beforeShot.goalsFor, goalAfter: restored.goalsFor, blocked, findings });
    console.log(`${width}px ${motion}: live clock and score, seven reachable 44px controls, real goal saved once and reloaded, stable close scroll`);
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(TEMP, 'report.json'), JSON.stringify({ base: BASE, pageChunk, control: CONTROL || null, offer, aim, servedMutations, cases }, null, 2));
console.log(`Evidence: ${TEMP}`);
if (CONTROL) {
  assert.equal(servedMutations, 1, 'Control must alter exactly one served page chunk');
  assert(cases[0].findings.includes(CONTROL), 'The control must fail its intended measured check');
  console.error(`CONTROL PROVED ${CONTROL}: actual built-page ${CONTROL === 'wide' ? 'horizontal overflow' : 'hidden live match clock'} detected`);
  process.exitCode = 1;
} else {
  assert.equal(cases.length, 6, 'Every width and motion preference must run');
  console.log('playTycoonSetPieceFit: green, six actual built-page cases and six durable goals.');
}
