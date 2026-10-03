/* Native court presentation proof. The fixed before build and current build use
   identical UI inputs. All external requests are fulfilled locally. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'buzzer-court-artifacts/native');
const BEFORE = process.env.BUZZER_COURT_BASELINE_DIR;
assert(BEFORE && fs.existsSync(path.join(BEFORE, 'index.html')), 'The fixed before build is required');
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build current dist first');
fs.mkdirSync(OUT, { recursive: true });
const DATE = '2026-10-03', DAILY = 'buzzer-beater-daily-' + DATE;
const dailyBytes = JSON.stringify({ score: 173, made: 4, v: 1, date: DATE });
const keys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const report = { started: new Date().toISOString(), baseline: 'f5e5a7254f4387155c042a69bcc5ee9a15c6d2d7',
  scenario: 'Fixed random 0.25, date 2026-10-03, setup1, Power35 then exact retry then Power40, Arc60 and Fade square. Aiming and settled images are paired; paused frames are diagnostic.', cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function activate(control, touch) {
  const box = await control.boundingBox();
  assert(box && box.width >= 43 && box.height >= 43, 'Action retains its 44px target');
  if (touch) await control.tap(); else { await control.focus(); await control.press('Enter'); }
}
async function range(board, name, value) {
  const slider = board.getByRole('slider', { name, exact: true });
  const min = Number(await slider.getAttribute('min')), step = Number(await slider.getAttribute('step'));
  await slider.focus(); await slider.press('Home');
  for (let index = 0; index < Math.round((value - min) / step); index++) await slider.press('ArrowRight');
  assert.equal(Number(await slider.inputValue()), value, 'Real range input reaches ' + name);
}
async function logical(board) {
  return board.evaluate(el => {
    const svg = el.querySelector('svg[role="img"]');
    const ball = svg.querySelector('[data-court-ball]') || svg.querySelector(':scope > circle[fill="hsl(24 85% 55%)"]');
    const rim = svg.querySelector('[data-court-rim]') || svg.querySelector('line[stroke="hsl(18 85% 55%)"]');
    const attrs = (node, names) => node ? names.map(name => node.getAttribute(name)) : null;
    const current = el.querySelector('[data-lab-shot="current"]');
    return { viewBox: svg.getAttribute('viewBox'), setup: el.getAttribute('data-lab-setup'), courtLabel: svg.getAttribute('aria-label'),
      ball: attrs(ball, ['cx', 'cy', 'r']), rim: attrs(rim, ['x1', 'x2', 'y1', 'y2']),
      preview: svg.querySelector('path[stroke-dasharray="4 5"]')?.getAttribute('d') ?? null,
      path: el.querySelector('[data-lab-path="current"]')?.getAttribute('d') ?? null,
      landing: attrs(el.querySelector('[data-lab-landing="current"]'), ['cx', 'cy', 'r']),
      fields: [...(current?.querySelectorAll('dl') || [])].map(node => node.textContent),
      verdict: el.querySelector('[data-lab-result] [role="status"]')?.textContent ?? null };
  });
}
async function geometry(page, board, stage, current) {
  const value = await board.evaluate((el, viewport) => {
    const svg = el.querySelector('svg[role="img"]');
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return { viewport, layoutViewport: innerWidth, document: document.documentElement.scrollWidth, court: box(svg),
      athletes: [...svg.querySelectorAll('[data-court-athlete]')].map(node => ({ role: node.getAttribute('data-court-athlete'), box: box(node), opacity: getComputedStyle(node).opacity })),
      controls: [...el.querySelectorAll('button, input, summary')].map(node => ({ box: box(node), client: node.clientWidth, scroll: node.scrollWidth })).filter(row => row.box.width),
      cards: [...el.querySelectorAll('[data-lab-shot]')].map(node => ({ box: box(node), client: node.clientWidth, scroll: node.scrollWidth })) };
  }, page.viewportSize().width);
  assert(value.document <= value.viewport + 2, stage + ': no page overflow');
  for (const row of [...value.controls, ...value.cards]) {
    assert(row.box.x >= -1 && row.box.right <= value.viewport + 1 && row.scroll <= row.client + 2, stage + ': controls and result text stay inside their cards');
  }
  for (const row of value.controls) {
    const intersection = Math.min(row.box.bottom, value.court.bottom) - Math.max(row.box.y, value.court.y);
    assert(intersection <= 0.5, stage + ': court never covers a control');
  }
  if (current) {
    assert(value.athletes.some(row => row.role === 'shooter'), stage + ': articulated shooter renders');
    for (const row of value.athletes) assert(row.box.width > 8 && row.box.height > 20 && Number(row.opacity) > 0
      && row.box.x >= value.court.x - 0.5 && row.box.right <= value.court.right + 0.5
      && row.box.y >= value.court.y - 0.5 && row.box.bottom <= value.court.bottom + 0.5,
    stage + ': athlete art stays visible inside the court');
  }
  return { stage, ...value };
}
async function rimOcclusion(board) {
  return board.evaluate(el => {
    const svg = el.querySelector('svg[role="img"]');
    const rim = svg.querySelector('[data-court-rim]') || svg.querySelector('line[stroke="hsl(18 85% 55%)"]');
    const inset = svg.querySelector('circle[r="34"]');
    const screen = (node, x, y) => { const point = svg.createSVGPoint(); point.x = x; point.y = y; const mapped = point.matrixTransform(node.getScreenCTM()); return { x: mapped.x, y: mapped.y }; };
    const center = screen(inset, Number(inset.getAttribute('cx')), Number(inset.getAttribute('cy')));
    const matrix = inset.getScreenCTM(), radius = Number(inset.getAttribute('r')) * Math.hypot(matrix.a, matrix.b);
    const x1 = Number(rim.getAttribute('x1')), x2 = Number(rim.getAttribute('x2')), y = Number(rim.getAttribute('y1'));
    const points = [x1, (x1 + x2) / 2, x2].map(x => screen(rim, x, y));
    const insetPaintsLater = Boolean(rim.compareDocumentPosition(inset) & Node.DOCUMENT_POSITION_FOLLOWING);
    const covered = points.map(point => insetPaintsLater && Math.hypot(point.x - center.x, point.y - center.y) < radius);
    return { setup: el.getAttribute('data-lab-setup'), label: svg.getAttribute('aria-label'), center, radius, points, insetPaintsLater, covered, occluded: covered.some(Boolean) };
  });
}
async function art(board) {
  return board.evaluate(el => ({
    shooter: el.querySelector('[data-court-athlete="shooter"]')?.innerHTML,
    defender: el.querySelector('[data-court-athlete="defender"]')?.innerHTML,
    seams: el.querySelector('[data-ball-seams]')?.outerHTML,
    net: el.querySelector('[data-court-net]')?.outerHTML,
    animations: el.querySelector('svg[role="img"]').getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
  }));
}
async function geometryControl(page, board, kind) {
  const stage = kind + ' control', before = await geometry(page, board, stage, true);
  const target = kind === 'athlete' ? board.locator('[data-court-athlete="shooter"]') : board.locator('[data-lab-shot]').first();
  const attribute = kind === 'athlete' ? 'transform' : 'style', original = await target.getAttribute(attribute);
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  const expected = stage + (kind === 'athlete' ? ': athlete art stays visible inside the court' : ': no page overflow');
  let changed, rejection;
  try {
    await target.evaluate((el, type) => {
      if (type === 'athlete') el.setAttribute('transform', 'translate(-720 0)');
      else { const width = innerWidth * 2; el.style.width = `${width}px`; el.style.minWidth = `${width}px`; el.style.maxWidth = 'none'; }
    }, kind);
    changed = { attribute: await target.getAttribute(attribute), box: await target.boundingBox() };
    assert.notEqual(changed.attribute, original, stage + ': mutation changes the actual rendered element');
    if (kind === 'athlete') assert(changed.box.x < before.court.x - 1, stage + ': shooter actually leaves the court');
    else assert(changed.box.width > before.viewport, stage + ': result card actually exceeds viewport width');
    try { await geometry(page, board, stage, true); }
    catch (error) { assert(error instanceof assert.AssertionError && error.message === expected, stage + ': only the exact geometry assertion earns credit'); rejection = error.message; }
    assert(rejection, stage + ': broken geometry must fail');
  } finally {
    await target.evaluate((el, prior) => prior.value === null ? el.removeAttribute(prior.attribute) : el.setAttribute(prior.attribute, prior.value), { attribute, value: original });
    await page.evaluate(position => scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), scroll);
  }
  assert.equal(await target.getAttribute(attribute), original, stage + ': exact attribute restored');
  const restored = await geometry(page, board, stage, true);
  assert.deepEqual(restored, before, stage + ': exact positive geometry restored');
  return { kind, before, changed, rejection, restored };
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const variant of ['before', 'after']) {
    const port = await new Promise((resolve, reject) => {
      const probe = createServer(); probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => error ? reject(error) : resolve(chosen)); });
    });
    const base = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', variant === 'before' ? BEFORE : 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let serverLog = '';
    server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Owned server did not start in15 seconds')), 15000);
        server.once('error', error => { clearTimeout(timer); reject(error); });
        server.once('exit', code => { clearTimeout(timer); reject(new Error('Owned server exited ' + code)); });
        server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
      });
      const profiles = variant === 'before' ? [{ width: 390, height: 844, touch: true }] : [
        { width: 320, height: 780, touch: true, reduced: true }, { width: 390, height: 844, touch: true },
        { width: 430, height: 932, touch: true }, { width: 1440, height: 1000, touch: false },
        { width: 390, height: 844, touch: true, light: true },
      ];
      for (const profile of profiles) {
        const { width, height, touch, reduced = false, light = false } = profile, current = variant === 'after';
        const id = `${variant}-${width}-${light ? 'light' : 'dark'}${reduced ? '-reduced' : ''}`;
        const result = { id, variant, ...profile, screenshots: [], geometry: [], controls: [], logical: {}, pageErrors: [], consoleErrors: [], assetFailures: [], externalRequests: [], scoreWrites: [] };
        report.cases.push(result);
        const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
          reducedMotion: reduced ? 'reduce' : 'no-preference', locale: 'en-US', serviceWorkers: 'block',
          storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: DAILY, value: dailyBytes }, { name: 'dukb-theme', value: light ? 'light' : 'dark' }] }] } });
        await context.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin === base) return route.continue();
          result.externalRequests.push({ method: request.method(), path: url.pathname });
          if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|user_scores|record_auth_completion)$/.test(url.pathname)) result.scoreWrites.push(request.method() + ' ' + url.pathname);
          const type = request.resourceType();
          return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
        });
        const page = await context.newPage(); page.setDefaultTimeout(10000);
        await page.addInitScript(({ date, protectedKeys }) => {
          const OriginalDate = Date, now = new OriginalDate(date + 'T16:00:00Z').getTime();
          window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
          Math.random = () => 0.25;
          window.__courtWrites = [];
          for (const method of ['setItem', 'removeItem']) {
            const original = Storage.prototype[method];
            Storage.prototype[method] = function(key, ...args) {
              if (this === localStorage && (protectedKeys.includes(key) || key.startsWith('buzzer-beater'))) window.__courtWrites.push({ method, key });
              return original.call(this, key, ...args);
            };
          }
        }, { date: DATE, protectedKeys: keys });
        page.on('pageerror', error => result.pageErrors.push(String(error)));
        page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
        page.on('requestfailed', request => { if (request.url().startsWith(base)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText); });
        page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) result.assetFailures.push(response.url() + ': ' + response.status()); });
        const board = page.locator('[data-shot-lab]'), court = board.locator('svg[role="img"]');
        const button = name => board.getByRole('button', { name, exact: true });
        const screenshot = async stage => {
          await court.scrollIntoViewIfNeeded(); await frames(page); await page.waitForTimeout(450);
          const box = await court.boundingBox();
          assert(box && box.y >= -1 && box.y + box.height <= height + 1, stage + ': whole court visible at the fixed screenshot stop');
          const file = `${id}-${stage}.png`, crop = `${id}-${stage}-court.png`;
          await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
          await court.screenshot({ path: path.join(OUT, crop), animations: 'disabled' });
          result.screenshots.push(file, crop);
        };
        try {
          await page.goto(base + '/buzzer-beater', { waitUntil: 'domcontentloaded' });
          const entry = page.getByRole('button', { name: 'Shot lab', exact: true }); await entry.waitFor();
          await page.evaluate(() => document.fonts.ready);
          const held = await page.evaluate(list => list.map(key => [key, localStorage.getItem(key)]), keys);
          assert.equal(held.find(([key]) => key === DAILY)[1], dailyBytes, 'The original Daily fixture is intact before play');
          await page.evaluate(() => { window.__courtWrites = []; });
          await activate(entry, touch); await board.waitFor();
          await range(board, 'Power', 0.35); await range(board, 'How high to put the arc on the shot', 0.6); await range(board, 'How far to fade off the closeout', 0);
          await frames(page); await page.waitForTimeout(450);
          result.logical.aim = await logical(board);
          assert.deepEqual(result.logical.aim.ball?.map(Number), [26 + 0.1 * (314 / 9.6), 190 - 2.13 * 40, 0.1197 * (314 / 9.6)], 'Original physical release point and ball radius stay exact');
          assert.equal(result.logical.aim.viewBox, '0 0 360 210');
          const aimArt = current ? await art(board) : null;
          if (current) assert(aimArt.shooter && aimArt.seams && aimArt.net, 'The actual articulated shooter, ball seams and static net render');
          else assert.equal(await board.locator('[data-court-artwork]').count(), 0, 'The fixed before build predates the new artwork');
          result.geometry.push(await geometry(page, board, 'aim', current)); await screenshot('aim');
          if (current && width === 320) result.controls.push(await geometryControl(page, board, 'athlete'));
          await activate(button('Shoot'), touch);
          if (reduced) assert.equal(await board.getAttribute('data-arcade-phase'), 'shotEnd', 'Reduced motion skips flight immediately');
          else {
            await page.waitForTimeout(100);
            assert.equal(await board.getAttribute('data-arcade-phase'), 'flying');
            const moving = await logical(board);
            assert.notDeepEqual(moving.ball, result.logical.aim.ball, 'Actual engine ball advances during flight');
            if (current) assert.notEqual((await art(board)).shooter, aimArt.shooter, 'Athlete follows the real release progress');
            await activate(button('Pause'), touch); await frames(page);
            assert.equal(await board.getAttribute('data-arcade-paused'), 'true');
            const frozen = await court.innerHTML(); await page.waitForTimeout(300);
            assert.equal(await court.innerHTML(), frozen, 'Pause freezes ball, athlete, seams and every court element');
            assert.equal(await board.getAttribute('data-arcade-phase'), 'flying');
            result.paused = { logical: await logical(board), art: current ? await art(board) : null, frozen: true };
            result.geometry.push(await geometry(page, board, 'paused', current)); await screenshot('paused');
            await activate(button('Resume'), touch);
          }
          const finish = async (attempt, name) => {
            await board.locator('[data-lab-result]').waitFor(); await frames(page); await page.waitForTimeout(450);
            assert.equal(await board.locator('[data-lab-attempt]').getAttribute('data-lab-attempt'), String(attempt));
            const box = await button('Retry this shot').boundingBox();
            assert(box && box.y >= -1 && box.y + box.height <= height + 1, name + ': Retry remains visible without driver scrolling');
            assert(await button('Retry this shot').evaluate(el => document.activeElement === el), 'Result retains usable Retry focus');
            result.logical[name] = await logical(board);
            assert(result.logical[name].path?.startsWith('M '), 'A real scored path renders');
            if (current) {
              const settledArt = await art(board);
              assert.equal(settledArt.net, aimArt.net, 'Net never invents motion or contact for a miss');
              assert.equal(settledArt.animations, 0, 'Court artwork has no independent running animation');
              if (reduced) { await page.waitForTimeout(250); assert.deepEqual(await art(board), settledArt, 'Reduced-motion settled art stays still'); }
            }
            result.geometry.push(await geometry(page, board, name, current)); await screenshot(name);
          };
          await finish(1, 'first');
          if (current && width === 320) result.controls.push(await geometryControl(page, board, 'overflow'));
          await activate(button('Retry this shot'), touch);
          assert(await board.getByRole('slider', { name: 'Power', exact: true }).evaluate(el => document.activeElement === el), 'Retry keeps Power reachable');
          await activate(button('Shoot'), touch); await finish(2, 'retry');
          for (const field of ['path', 'landing', 'fields', 'verdict']) assert.deepEqual(result.logical.retry[field], result.logical.first[field], 'Identical release repeats actual ' + field);
          await activate(button('Retry this shot'), touch); await range(board, 'Power', 0.4);
          await activate(button('Shoot'), touch); await finish(3, 'adjusted');
          assert.notEqual(result.logical.adjusted.path, result.logical.first.path, 'The real Power adjustment changes trajectory');
          await activate(button('Change setup'), touch); await frames(page); await page.waitForTimeout(450);
          assert.equal(await board.getAttribute('data-lab-setup'), '2');
          result.logical.nextSetup = await logical(board);
          if (current) assert.equal(await board.locator('[data-court-athlete="defender"]').count(), 1, 'Next actual setup draws its contesting athlete');
          result.geometry.push(await geometry(page, board, 'next-setup', current)); await screenshot('next-setup');
          if ((width === 390 && !light) || width === 1440) {
            for (let setup = 2; setup < 10; setup++) {
              assert.equal(await board.getAttribute('data-lab-setup'), String(setup));
              await activate(button('Shoot'), touch); await board.locator('[data-lab-result]').waitFor();
              await activate(button('Change setup'), touch); await frames(page);
            }
            assert.equal(await board.getAttribute('data-lab-setup'), '10');
            result.longestSetup = await logical(board);
            result.geometry.push(await geometry(page, board, 'longest-setup', current));
            await screenshot('longest-setup'); result.rimOcclusion = await rimOcclusion(board);
          }
          assert.deepEqual(await page.evaluate(list => list.map(key => [key, localStorage.getItem(key)]), keys), held, 'Visual play preserves exact daily and completion bytes');
          result.storageWrites = await page.evaluate(() => window.__courtWrites);
          assert.deepEqual(result.storageWrites, [], 'Court play never transiently writes saved scores');
          assert.deepEqual(result.scoreWrites, [], 'No score or completion write is attempted');
          for (const field of ['pageErrors', 'consoleErrors', 'assetFailures']) assert.deepEqual(result[field], [], 'No ' + field);
          assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), light, 'Actual stored theme applied');
          result.passed = true;
          console.log(`${id}: preserved geometry and outcomes, readable court, pause/reduced motion and quiet daily passed.`);
        } catch (error) {
          result.passed = false; result.error = String(error.stack || error);
          await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), animations: 'disabled' }).catch(() => {});
          console.error(`${id}: ${result.error}`);
        } finally { await context.close(); saveReport(); }
      }
    } finally { server.kill(); fs.writeFileSync(path.join(OUT, `${variant}-server.log`), serverLog); }
  }
  assert.equal(report.cases.length, 6); assert(report.cases.every(result => result.passed), 'Every before/current native profile passes');
  const before = report.cases.find(result => result.variant === 'before');
  for (const after of report.cases.filter(result => result.variant === 'after')) assert.deepEqual(after.logical, before.logical, after.id + ': exact before-build ball/rim/path/outcomes preserved');
  report.exactBeforeAfter = true;
  assert.equal(report.cases.flatMap(result => result.controls).length, 2, 'Both native geometry controls reject and restore');
  for (const after of report.cases.filter(result => result.variant === 'after' && result.longestSetup)) {
    assert.deepEqual(after.longestSetup, before.longestSetup, 'Longest setup retains exact baseline shot geometry');
    assert(!after.rimOcclusion.occluded, after.id + ': the inset must not paint over the physical rim on the longest shot');
  }
  report.passed = true;
} catch (error) { report.passed = false; report.error = String(error.stack || error); throw error; }
finally {
  const controls = report.cases.flatMap(result => result.controls);
  report.geometryControls = { expected: 2, rejected: controls.filter(control => control.rejection).length, restored: controls.filter(control => control.restored).length };
  report.finished = new Date().toISOString(); saveReport(); await browser?.close();
}
