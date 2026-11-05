// Remote controlled saved-boundary proof through the unchanged built App.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';

assert(process.env.CI, 'Run this browser proof remotely in CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INPUT = path.resolve(ROOT, process.env.SOCCER_LEAGUE_RAW || 'league-artifacts/arms/fixed/raw/native-save-sign.json');
const OUT = path.resolve(ROOT, process.env.SOCCER_LEAGUE_BROWSER_OUT || 'soccer-transfer-league-artifacts/browser');
assert(!fs.existsSync(OUT), 'Use a fresh evidence directory');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:4173', KEY = 'soccerCareerSave';
const sha = value => createHash('sha256').update(value).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const put = (name, value) => {
  const file = name + '.json', bytes = Buffer.from(JSON.stringify(value, null, 2));
  fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  fs.writeFileSync(path.join(OUT, file), bytes);
  return { file, bytes: bytes.length, sha256: sha(bytes) };
};
const inputBytes = fs.readFileSync(INPUT), raw = JSON.parse(inputBytes);
const initial = raw.frames.original, unavailable = raw.frames.unavailableLeague;
assert(initial && unavailable, 'RAW constructor frames.original and frames.unavailableLeague are required');
const heldFiles = ['src/lib/soccerCareerTransferBrief.ts', 'src/lib/soccerCareerEngine.ts',
  'src/lib/soccerCareerProgramme.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/soccerOfferReview.ts',
  'src/components/soccer-career/AgentBrief.tsx', 'src/components/soccer-career/SoccerOfferReview.tsx',
  'src/pages/SoccerCareer.tsx', 'scripts/lib/hostLikeServer.mjs', 'scripts/qa/playSoccerTransferLeague.mjs'];
const sourceReceipt = () => heldFiles.map(file => {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  return { file, bytes: bytes.length, sha256: sha(bytes) };
});
const sourceBefore = sourceReceipt();
for (const row of sourceBefore) {
  const target = path.join(OUT, 'source', row.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, fs.readFileSync(path.join(ROOT, row.file)));
}
const compiled = await build({ entryPoints: [path.join(ROOT, 'src/lib/soccerCareerSave.ts')],
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const codec = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
assert(codec.isSoccerCareerSave(initial) && codec.isSoccerCareerSave(unavailable), 'Both RAW states pass the real save validator');
const broken = initial.programme?.receipts?.at(-1);
assert(broken?.promise === 'broken' && broken.club === initial.currentClub
  && broken.year === initial.seasons.at(-1).year, 'The RAW fixture already holds its settled broken appearance promise');
assert(unavailable.transferBrief?.preferredLeague && !unavailable.transferBrief.minimumApps,
  'Unavailable-league control must have no appearance floor');
assert(!initial.transferBrief, 'The initial RAW fixture starts without a brief');
const report = { status: 'running', scope: 'Controlled fictional saved player, actual built App and bundled eligible club pool. No natural-career claim, source substitution, browser RNG override or clock override.',
  input: { file: path.relative(ROOT, INPUT).replaceAll('\\', '/'), bytes: inputBytes.length, sha256: sha(inputBytes), case: raw.case },
  sourceBefore, codec: { source: 'src/lib/soccerCareerSave.ts', compiledSha256: sha(compiled.outputFiles[0].contents) },
  widths: [320, 390, 1280], journeys: [], frames: [], actions: [], shots: [], checks: 0,
  externalForwarded: 0, externalPolicy: 'Every nonloopback request is aborted. No fabricated API responses.' };
put('report', report);
let browser, host;
const check = (condition, label) => { assert(condition, label); report.checks++; };
try {
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4173'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Host startup timeout')), 15000);
    host.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    host.once('error', reject);
    host.once('exit', code => { clearTimeout(timer); reject(Error('Host exited ' + code)); });
  });
  browser = await pw.chromium.launch({ headless: true });
  for (const width of report.widths) await journey(width, initial, false);
  await journey(320, unavailable, true);
  check(report.shots.length === 6, 'Exactly six native screenshots retained');
  check(report.journeys.every(row => row.status === 'passed'), 'All three signing journeys and unavailable refusal passed');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = String(error.stack || error); throw error;
} finally {
  if (browser) await browser.close();
  if (host) host.kill();
  report.sourceAfter = sourceReceipt();
  report.inputAfter = { bytes: fs.statSync(INPUT).size, sha256: sha(fs.readFileSync(INPUT)) };
  try {
    assert.deepEqual(report.sourceAfter, sourceBefore, 'All held source bytes remain unchanged');
    assert.equal(report.inputAfter.sha256, report.input.sha256, 'RAW evidence remains unchanged');
  } catch (error) { report.status = 'failed'; report.sourceError = String(error); }
  put('report', report);
}
assert.equal(report.status, 'passed');
console.log('Soccer preferred league browser: ' + report.checks + ' checks, four journeys, six screenshots, zero external requests forwarded.');

async function journey(width, fixture, refusal) {
  const id = width + (refusal ? '-unavailable' : '-sign');
  const row = { id, width, mode: width === 1280 ? 'keyboard' : 'touch', status: 'running', errors: [], assetErrors: [], external: [], layouts: [] };
  report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 390 ? 844 : 900 },
    hasTouch: width < 1000, isMobile: width < 1000, serviceWorkers: 'block' });
  const page = await context.newPage();
  const activate = async locator => { await locator.scrollIntoViewIfNeeded(); if (width === 1280) { await locator.focus(); await locator.press('Enter'); } else await locator.tap(); };
  const rawSave = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const position = () => page.evaluate(() => ({ x: scrollX, y: scrollY, overflow: document.body.style.overflow,
    computedOverflow: getComputedStyle(document.body).overflow, locked: document.body.getAttribute('data-scroll-locked') }));
  const settle = async () => page.evaluate(async () => {
    await document.fonts.ready;
    const start = performance.now(); let last = '', stable = 0;
    do {
      await new Promise(requestAnimationFrame);
      const signature = JSON.stringify({ x: scrollX, y: scrollY, width: document.documentElement.scrollWidth,
        save: localStorage.getItem('soccerCareerSave'),
        boxes: [...document.querySelectorAll('[role="dialog"]')].map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }) });
      stable = signature === last ? stable + 1 : 1; last = signature;
      const busy = document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime));
      if (stable >= 4 && !busy) return;
    } while (performance.now() - start < 10000);
    throw Error('Page did not settle');
  });
  const observe = () => page.evaluate(key => {
    window.__sc11Writes = [];
    const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
    Storage.prototype.setItem = function(k, value) { const result = Reflect.apply(set, this, [k, value]); if (this === localStorage && String(k) === key) window.__sc11Writes.push({ method: 'setItem', raw: String(value) }); return result; };
    Storage.prototype.removeItem = function(k) { const result = Reflect.apply(remove, this, [k]); if (this === localStorage && String(k) === key) window.__sc11Writes.push({ method: 'removeItem', raw: null }); return result; };
    Storage.prototype.clear = function() { const result = Reflect.apply(clear, this, []); if (this === localStorage) window.__sc11Writes.push({ method: 'clear', raw: null }); return result; };
  }, KEY);
  const frame = async name => {
    await settle(); const stored = await rawSave();
    assert(stored, id + ': actual saved state exists');
    const state = codec.parseSoccerCareerSave(stored);
    assert(codec.isSoccerCareerSave(state), id + ': actual saved state remains valid');
    const value = { id, name, raw: stored, state, sha256: sha(stored), bytes: Buffer.byteLength(stored), document: await position() };
    report.frames.push({ id, name, ...put(id + '/' + name, value) });
    return value;
  };
  const action = async (name, run, { noWrite = false, wait } = {}) => {
    const before = await frame(name + '-before'), count = await page.evaluate(() => window.__sc11Writes.length);
    await run(); if (wait) await wait(); const after = await frame(name + '-after');
    const writes = await page.evaluate(n => window.__sc11Writes.slice(n), count);
    report.actions.push({ id, name, beforeSha256: before.sha256, afterSha256: after.sha256,
      beforeDocument: before.document, afterDocument: after.document, writes, ...put(id + '/' + name + '-action', { before, after, writes }) });
    if (noWrite) check(writes.length === 0 && after.raw === before.raw, id + ': ' + name + ' writes no saved career byte');
    return { before, after };
  };
  const layout = async (name, selector) => {
    const target = typeof selector === 'string' ? page.locator(selector) : selector; await target.scrollIntoViewIfNeeded(); await settle();
    const result = await target.evaluate(e => {
      const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { rect: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
        painted: !!hit && (hit === e || e.contains(hit)), innerWidth, clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth, fonts: document.fonts.status, y: scrollY };
    });
    row.layouts.push({ name, selector: typeof selector === 'string' ? selector : String(selector), ...result });
    check(result.rect.width >= 43.5 && result.rect.height >= 43.5 && result.painted
      && result.rect.x >= -0.5 && result.rect.right <= width + 0.5 && result.rect.y >= -0.5
      && result.rect.bottom <= page.viewportSize().height + 0.5 && result.innerWidth === width
      && result.scrollWidth <= width + 1 && result.fonts === 'loaded', id + ': ' + name + ' fits and is painted');
  };
  const shot = async name => {
    check(report.shots.length < 6, 'Screenshot limit');
    await settle(); const file = id + '-' + name + '.png';
    await page.screenshot({ path: path.join(OUT, file), fullPage: false });
    const bytes = fs.readFileSync(path.join(OUT, file)); report.shots.push({ id, name, file, bytes: bytes.length, sha256: sha(bytes) });
  };
  const open = async () => {
    const trigger = page.locator('[data-transfer-brief-open]'); await trigger.scrollIntoViewIfNeeded(); await settle();
    const before = await position();
    await action('open-brief-' + report.actions.length, () => activate(trigger), { noWrite: true });
    await page.locator('[data-transfer-brief]').waitFor();
    check((await position()).y === before.y, id + ': opening brief preserves document scroll');
    return { trigger, before };
  };
  const close = async (opened, how) => {
    await action('close-brief-' + how + '-' + report.actions.length, async () => {
      if (how === 'escape') {
        const choice = page.locator('[data-transfer-priority="minutes"]'); await choice.focus();
        check(await choice.evaluate(e => e === document.activeElement), id + ': dialog Escape starts on the existing priority button');
        await page.keyboard.press('Escape');
      } else await activate(page.locator('[data-transfer-brief-back]'));
    }, { noWrite: true });
    await page.locator('[data-transfer-brief]').waitFor({ state: 'hidden' });
    check(JSON.stringify(await position()) === JSON.stringify(opened.before), id + ': ' + how + ' restores exact document position and scroll lock');
    check(await opened.trigger.evaluate(e => e === document.activeElement), id + ': ' + how + ' returns focus to opener');
  };
  const chooseLeague = async (select, wanted) => {
    const options = await select.locator('option').evaluateAll(items => items.map(e => ({ value: e.value, label: e.textContent, disabled: e.disabled })));
    const index = options.findIndex(option => option.value === wanted); assert(index >= 0);
    await select.focus(); await select.press('Home');
    for (let n = 0; n < index; n++) await select.press('ArrowDown');
    await select.press('Enter');
    check(await select.inputValue() === wanted, id + ': native select keys choose exact league');
    return options;
  };
  try {
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      row.external.push({ url: request.url(), method: request.method(), disposition: 'aborted' });
      return route.abort('blockedbyclient');
    });
    await context.addInitScript(({ key, value }) => {
      if (!sessionStorage.getItem('sc11-seeded')) {
        localStorage.setItem(key, value); sessionStorage.setItem('sc11-seeded', '1');
      }
    }, { key: KEY, value: codec.serializeSoccerCareerSave(fixture) });
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE + '/assets/')) row.assetErrors.push({ url: request.url(), error: request.failure()?.errorText }); });
    page.on('response', response => { if (response.url().startsWith(BASE + '/assets/') && response.status() >= 400) row.assetErrors.push({ url: response.url(), status: response.status() }); });
    await page.goto(BASE + '/soccer-career', { waitUntil: 'networkidle' });
    await answerConsent(page, { press: activate });
    check(await storedConsent(page) === 'rejected', id + ': actual consent rejects optional services');
    await page.locator('[data-transfer-brief-open]').waitFor(); await settle(); await observe();
    const loaded = await frame('loaded');
    check(loaded.state.playerName === fixture.playerName && loaded.state.currentClub === fixture.currentClub, id + ': controlled RAW player is restored');
    const first = await open();
    await page.locator('[data-transfer-brief-help]').waitFor();
    const help = await page.locator('[data-transfer-brief-help]').innerText();
    check(help.includes('Example:') && /league/i.test(help), id + ': real first-use rules and worked example are visible');
    await layout('brief-back', '[data-transfer-brief-back]');
    await layout('brief-help', '[data-transfer-brief-help-open]');
    await action('finish-rules', () => activate(page.getByRole('button', { name: 'Choose a priority', exact: true })), { noWrite: true });
    const select = page.getByRole('combobox', { name: 'Preferred league', exact: true });
    await select.waitFor(); await layout('preferred-league', '[aria-label="Preferred league"]');
    if (refusal) {
      const held = loaded.state.transferBrief.preferredLeague;
      check(await select.inputValue() === held, id + ': saved unavailable league remains selected');
      const option = select.locator('option').filter({ hasText: '(unavailable)' });
      check(await option.count() === 1 && await option.getAttribute('value') === held, id + ': unavailable saved choice is labelled');
      await close(first, 'back');
      await action('unavailable-request', () => activate(page.locator('[data-request-transfer]')), { noWrite: true });
      const after = await frame('unavailable-refused');
      check(after.raw === loaded.raw && after.state.transferSituation.type !== 'request_result', id + ': unavailable league refuses without rolling a response');
    } else {
      await layout('priority-minutes', '[data-transfer-priority="minutes"]');
      await action('draft-priority', () => activate(page.locator('[data-transfer-priority="minutes"]')), { noWrite: true });
      const options = await select.locator('option').evaluateAll(items => items.map(e => ({ value: e.value, label: e.textContent, disabled: e.disabled })));
      const selected = options.find(option => option.value && !option.disabled && !option.label.includes('(unavailable)'));
      assert(selected, id + ': actual App offers an available bundled league');
      row.leagueOptions = options; row.selectedLeague = selected.value;
      await action('draft-league', () => chooseLeague(select, selected.value), { noWrite: true });
      await close(first, 'escape');
      const second = await open();
      check(await select.inputValue() === '', id + ': Escape discards unsaved league draft');
      await action('choose-priority', () => activate(page.locator('[data-transfer-priority="minutes"]')), { noWrite: true });
      await action('choose-league', () => chooseLeague(select, selected.value), { noWrite: true });
      await action('reopen-help', () => activate(page.locator('[data-transfer-brief-help-open]')), { noWrite: true });
      check(await page.locator('[data-transfer-brief-help]').count() === 1, id + ': help reopens before saving');
      await action('return-from-help', () => activate(page.locator('[data-transfer-brief-back]')), { noWrite: true });
      check(await select.inputValue() === selected.value, id + ': help keeps the league draft');
      await layout('save-brief', '[data-transfer-brief-save]');
      await shot('brief');
      const saved = await action('save-brief', () => activate(page.locator('[data-transfer-brief-save]')), {
        wait: () => page.waitForFunction(({ key, league }) => JSON.parse(localStorage.getItem(key)).transferBrief?.preferredLeague === league, { key: KEY, league: selected.value }) });
      const brief = saved.after.state.transferBrief;
      check(brief.priority === 'minutes' && brief.preferredLeague === selected.value && !brief.minimumApps, id + ': real save contains priority, league and Any appearance floor');
      check(JSON.stringify(saved.after.state) === JSON.stringify({ ...saved.before.state, transferBrief: brief }), id + ': saving changes only the brief');
      check(JSON.stringify(await position()) === JSON.stringify(second.before) && await second.trigger.evaluate(e => e === document.activeElement), id + ': Save restores exact document position, scroll lock and focus');
      await reload('saved', saved.after.raw);
      const again = await open();
      check(await select.inputValue() === selected.value, id + ': actual saved league survives reload and reopening');
      await close(again, 'back');
      const request = await action('request', () => activate(page.locator('[data-request-transfer]')), {
        wait: () => page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).transferSituation?.type === 'request_result', KEY) });
      const offer = request.after.state.transferSituation.offer;
      check(request.after.state.transferBrief.result.status === 'offered' && offer?.club.league === selected.value, id + ': actual bundled offer matches preferred league');
      check(JSON.stringify(request.after.state) === JSON.stringify({ ...request.before.state,
        transferSituation: request.after.state.transferSituation, transferBrief: request.after.state.transferBrief }), id + ': request changes only situation and receipt');
      await reload('request', request.after.raw);
      check(await page.locator('[data-request-transfer]').count() === 0, id + ': saved response cannot be requested again');
      const reviewTrigger = page.getByRole('button', { name: 'Review contract with ' + offer.club.name, exact: true });
      await reviewTrigger.scrollIntoViewIfNeeded(); await settle(); const reviewPosition = await position();
      await action('open-contract', () => activate(reviewTrigger), { noWrite: true });
      const review = page.locator('[data-soccer-offer-review]'); await review.waitFor();
      check((await position()).y === reviewPosition.y, id + ': contract review preserves document scroll');
      await action('contract-back', () => activate(review.getByRole('button', { name: 'Back', exact: true })), { noWrite: true });
      check(JSON.stringify(await position()) === JSON.stringify(reviewPosition) && await reviewTrigger.evaluate(e => e === document.activeElement), id + ': contract Back restores document and focus');
      await action('reopen-contract', () => activate(reviewTrigger), { noWrite: true });
      await action('contract-escape', () => page.keyboard.press('Escape'), { noWrite: true });
      check(JSON.stringify(await position()) === JSON.stringify(reviewPosition) && await reviewTrigger.evaluate(e => e === document.activeElement), id + ': contract Escape restores document and focus');
      await action('final-contract', () => activate(reviewTrigger), { noWrite: true });
      const wage = Number(await review.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage'));
      check(Number.isFinite(wage) && wage > 0 && Number(await review.locator('[data-offer-contract-years]').getAttribute('data-offer-contract-years')) === offer.contractYears, id + ': real review shows exact offer years and final wage');
      await layout('contract-sign', review.getByRole('button', { name: 'Sign contract', exact: true }));
      await shot('contract');
      const signed = await action('sign', () => activate(review.getByRole('button', { name: 'Sign contract', exact: true })), {
        wait: () => page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).phase === 'playing', KEY) });
      check(signed.after.state.currentClub === offer.club.name && signed.after.state.currentLeague === selected.value
        && signed.after.state.weeklyWage === wage && signed.after.state.contractYearsLeft === offer.contractYears
        && !signed.after.state.transferBrief && signed.after.state.transferSituation === null, id + ': signing consumes brief and uses exact reviewed destination and terms');
      await reload('signed', signed.after.raw);
    }
    check(row.errors.length === 0 && row.assetErrors.length === 0, id + ': no App error or owned asset failure');
    row.status = 'passed'; console.log('PASS ' + id);
  } catch (error) {
    row.status = 'failed'; row.error = String(error.stack || error);
    put(id + '/failure', { error: row.error, raw: await rawSave().catch(() => null), document: await position().catch(() => null), text: await page.locator('body').innerText().catch(() => '') });
    throw error;
  } finally { await context.close(); put('report', report); }

  async function reload(name, held) {
    const before = await frame(name + '-reload-before');
    check(before.raw === held, id + ': ' + name + ' held raw boundary');
    await page.reload({ waitUntil: 'networkidle' }); await settle(); await observe();
    const after = await frame(name + '-reload-after');
    check(after.raw === held, id + ': ' + name + ' reload preserves every saved byte');
  }
}
