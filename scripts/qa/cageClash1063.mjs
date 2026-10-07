/* Real built-game input and clock. No injected fight state or application test API. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.CAGE_CLASH_NATIVE_ARTIFACTS || path.join(ROOT, 'cage-clash-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true }); assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build before native combat');
const sourceBytes = ['src/lib/cageClash.ts', 'src/lib/cagePractice.ts', 'src/lib/cageCircuit.ts', 'src/hooks/useCageClash.ts',
  'src/components/cage-clash/CageClashBoard.tsx', 'src/components/cage-clash/CageClashCanvas.tsx', 'src/components/cage-clash/CagePracticeFeedback.tsx']
  .map(file => ({ file, bytes: fs.readFileSync(path.join(ROOT, file)) }));
const fontLinks = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(m => new URL(m[1]).href);
assert.equal(fontLinks.length, 1, 'Fonts use the actual template stylesheet');
const profiles = [
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true },
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false },
];
const report = { cases: [], controls: [], coverage: [], forwardedWrites: 0 };
const save = () => {
  report.sources = sourceBytes.map(({ file, bytes }) => { const after = fs.readFileSync(path.join(ROOT, file)); return {
    file, before: createHash('sha256').update(bytes).digest('hex'), after: createHash('sha256').update(after).digest('hex'), held: bytes.equals(after),
  }; });
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
};
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(error => error ? reject(error) : resolve(p)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Owned host-like server did not start')), 15000);
  server.once('error', error => { clearTimeout(timeout); reject(error); });
  server.stdout.on('data', chunk => { if (String(chunk).includes('host-like server:')) { clearTimeout(timeout); resolve(); } });
});
const keys = { left: 'ArrowLeft', right: 'ArrowRight', guard: 'Space', jab: 'j', power: 'k', kick: 'l', grapple: 'u', submit: 'i', escape: 'o' };
const fightStats = [['hits', 'Shots landed'], ['damageDealt', 'Damage dealt'], ['blocked', 'Blocks'], ['takedowns', 'Takedowns'], ['controlTicks', 'Top control']];
const practiceObjectives = { striking: 'Land 3 shots, then recover to 90 gas.', takedown: 'Clinch, then take your partner down.', submission: 'Build submission pressure to a finish.', escape: 'Regain guard, then return to your feet.' };
const root = page => page.locator('[data-cage-screen]');
async function useNativeFocus(page) {
  assert.equal(typeof page._connection?.toImpl, 'function', 'Native focus requires the in-process browser connection');
  const client = page._connection.toImpl(page)?.delegate?._mainFrameSession?._client;
  assert.equal(typeof client?.send, 'function', 'Native focus requires the original Chromium page session');
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: false });
}
async function hud(page) {
  return root(page).evaluate(el => {
    const f = side => { const node = el.querySelector(`[data-cage-fighter="${side}"]`); return node ? { ...Object.fromEntries(['x', 'health', 'stamina', 'submission', 'hits', 'damageDealt', 'blocked', 'takedowns', 'controlTicks', 'actionTicks'].map(k => [k, Number(node.dataset[k])])), action: node.dataset.action } : null; };
    const feedback = el.querySelector('[data-cage-practice-feedback]');
    return { phase: el.dataset.cagePhase, tick: Number(el.dataset.cageTick), tickMs: Number(el.dataset.cageTickMs), position: el.dataset.cagePosition, top: el.dataset.cageTop,
      feedback: feedback ? { drill: feedback.dataset.cagePracticeFeedback, complete: feedback.dataset.cageFeedbackComplete === 'true', message: feedback.dataset.cageMessage, recoveredGuard: feedback.dataset.cageRecoveredGuard === 'true',
        progress: feedback.querySelector('[data-cage-practice-progress]')?.textContent, status: feedback.querySelector('[data-cage-practice-status]')?.textContent, outcome: feedback.querySelector('[data-cage-practice-message]')?.textContent,
        announcements: [...feedback.querySelectorAll('[aria-live]')].map(node => ({ role: node.getAttribute('role'), live: node.getAttribute('aria-live'), atomic: node.getAttribute('aria-atomic') })) } : null,
      drill: el.dataset.cageDrill, practiceComplete: el.dataset.cagePracticeComplete === 'true',
      circuitStage: el.dataset.cageCircuitStage, circuitComplete: el.dataset.cageCircuitComplete === 'true',
      fightScore: Number(el.dataset.cageFightScore), winner: el.dataset.cageWinner, circuitScore: Number(el.dataset.cageCircuitScore),
      paused: el.dataset.cagePaused === 'true', player: f('player'), cpu: f('cpu'), status: el.querySelector('[data-cage-status]')?.textContent, text: el.textContent };
  });
}
async function measure(page) {
  return page.evaluate(() => {
    const area = document.querySelector('[role="dialog"]') || document.querySelector('[data-cage-screen]');
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, text: el.textContent }; };
    const canvas = document.querySelector('[data-cage-screen] canvas');
    const stats = document.querySelector('[data-cage-fight-stats]');
    const feedback = area.querySelector('[data-cage-practice-feedback]');
    return { scrollY, scrollWidth: document.documentElement.scrollWidth, area: box(area), canvas: canvas ? box(canvas) : null,
      feedback: feedback ? { ...box(feedback), followingControl: feedback.closest('[data-cage-screen]').querySelector('[data-cage-control]') ? box(feedback.closest('[data-cage-screen]').querySelector('[data-cage-control]')) : null,
        readings: ['progress', 'status', 'message'].map(kind => { const el = feedback.querySelector(`[data-cage-practice-${kind}]`); if (!el) return { kind, missing: true };
          const range = document.createRange(); range.selectNodeContents(el); return { kind, ...box(el), fontSize: parseFloat(getComputedStyle(el).fontSize),
            scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
            textRects: [...range.getClientRects()].map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom })) }; }) } : null,
      stats: stats ? { area: box(stats), arena: box(canvas.parentElement), rows: [...stats.querySelectorAll('tr')].map(el => ({ ...box(el), cells: [...el.children].map(cell => ({ ...box(cell), scrollWidth: cell.scrollWidth, clientWidth: cell.clientWidth, fontSize: parseFloat(getComputedStyle(cell).fontSize) })) })) } : null,
      fonts: ['Inter', 'Space Grotesk'].flatMap(family => [400, 500, 600, 700].map(weight => ({ family, weight, loaded: document.fonts.check(`${weight} 16px "${family}"`, 'Cage Clash') }))),
      hints: [...area.querySelectorAll('[data-cage-readiness]')].map(el => { const target = el.closest('button'); return { ...box(el), action: el.dataset.cageReadiness, fontSize: parseFloat(getComputedStyle(el).fontSize), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, target: box(target), label: box(target.firstElementChild), described: Boolean(el.id && target.getAttribute('aria-describedby')?.split(/\s+/).includes(el.id) && document.getElementById(el.id) === el) }; }),
      controls: [...area.querySelectorAll('button,select,input')].filter(el => el.getBoundingClientRect().height > 0).map(box) };
  });
}
function geometry(value, profile, stage) {
  assert(value.fonts.length === 8 && value.fonts.every(face => face.loaded), `${stage}: actual fonts remain loaded`);
  assert(value.scrollWidth <= profile.width + 2, `${stage}: horizontal overflow`);
  assert(Math.abs(value.scrollY) <= 1, `${stage}: automatic page scroll`);
  const inside = r => r.x >= -2 && r.y >= -2 && r.right <= profile.width + 2 && r.bottom <= profile.height + 2;
  assert(inside(value.area), `${stage}: complete game region clipped ${JSON.stringify(value.area)}`);
  for (const box of value.controls) { assert(box.width >= 44 && box.height >= 44, `${stage}: action below44px ${JSON.stringify(box)}`); assert(inside(box), `${stage}: action clipped ${JSON.stringify(box)}`); }
  if (value.hints.length) assert.equal(value.hints.length, 6, `${stage}: every action has one readiness hint`);
  for (const hint of value.hints) {
    assert(hint.fontSize >= 10 && hint.height > 0, `${stage}: readiness text below10px`);
    assert(hint.described, `${stage}: readiness description link is broken`);
    assert(inside(hint) && hint.scrollWidth <= hint.clientWidth + 1 && hint.x >= hint.target.x - .5 && hint.right <= hint.target.right + .5 && hint.y >= hint.label.bottom - .5 && hint.bottom <= hint.target.bottom + .5, `${stage}: readiness text clipped or overlapping`);
  }
  if (value.feedback) {
    const slot = value.feedback;
    assert(inside(slot) && Math.abs(slot.height - 72) <= .5, `${stage}: practice feedback slot clipped or changes height`);
    assert.equal(slot.readings.length, 3, `${stage}: feedback has progress, status and actual outcome`);
    for (const [index, reading] of slot.readings.entries()) {
      assert(!reading.missing && reading.fontSize >= 12 && reading.height > 0 && reading.textRects.length > 0, `${stage}: practice feedback below12px or missing`);
      const contained = r => r.x >= slot.x - .5 && r.right <= slot.right + .5 && r.y >= slot.y - .5 && r.bottom <= slot.bottom + .5;
      assert(contained(reading) && reading.scrollWidth <= reading.clientWidth + 1 && reading.scrollHeight <= reading.clientHeight + 1, `${stage}: practice feedback text clipped`);
      assert(reading.textRects.every(r => contained(r) && r.y >= reading.y - .5 && r.bottom <= reading.bottom + .5), `${stage}: practice feedback text leaves its row`);
      if (index) assert(slot.readings[index - 1].bottom <= reading.y + .5, `${stage}: practice feedback rows overlap`);
    }
    if (slot.followingControl) assert(slot.bottom <= slot.followingControl.y + .5, `${stage}: practice feedback overlaps controls`);
  }
  if (value.stats) {
    assert(value.canvas, `${stage}: recap keeps the actual arena`);
    const contained = r => inside(r) && r.x >= value.stats.arena.x - .5 && r.right <= value.stats.arena.right + .5 && r.y >= value.stats.arena.y - .5 && r.bottom <= value.stats.arena.bottom + .5;
    assert(contained(value.stats.area), `${stage}: stats recap clipped ${JSON.stringify(value.stats.area)}`);
    for (const [index, row] of value.stats.rows.entries()) {
      assert(contained(row), `${stage}: stats row clipped ${JSON.stringify(row)}`);
      if (index) assert(value.stats.rows[index - 1].bottom <= row.y + .5, `${stage}: stats rows overlap`);
      for (const [column, cell] of row.cells.entries()) {
        assert(contained(cell) && cell.scrollWidth <= cell.clientWidth + 1, `${stage}: stats cell clipped ${JSON.stringify(cell)}`);
        assert(cell.fontSize >= 10, `${stage}: stats text below10px`);
        if (column) assert(row.cells[column - 1].right <= cell.x + .5, `${stage}: stats cells overlap`);
      }
    }
  }
}
async function visibleFocus(locator) {
  const value = await locator.evaluate(el => { const style = getComputedStyle(el); return { active: el === document.activeElement, visible: el.matches(':focus-visible'), outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0, shadow: style.boxShadow !== 'none' }; });
  assert(value.active && value.visible && (value.outline || value.shadow), 'Keyboard focus is visibly marked'); return value;
}
async function activate(locator, profile) {
  if (profile.input === 'touch') await locator.tap();
  else if (profile.input === 'mouse') await locator.click();
  else { await locator.focus(); await visibleFocus(locator); await locator.press('Enter'); }
}
async function choose(locator, value, profile) {
  if (profile.input !== 'keyboard') return locator.selectOption(value);
  await locator.focus(); const indices = await locator.evaluate((el, target) => ({ from: el.selectedIndex, to: [...el.options].findIndex(o => o.value === target) }), value);
  assert(indices.to >= 0); for (let i = 0; i < Math.abs(indices.to - indices.from); i++) await locator.press(indices.to > indices.from ? 'ArrowDown' : 'ArrowUp');
  assert.equal(await locator.inputValue(), value);
}
const coverage = new Set();
try {
  await ready; browser = await chromium.launch({ headless: false });
  for (const profile of profiles) {
    const id = `${profile.width}-${profile.input}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const row = { id, steps: [], screenshots: [], errors: [], assetErrors: [], blockedWrites: [], blockedDatabase: [], fonts: [], inputs: 0, fightStats: [], strikeAnimations: [], groundAnimation: null, practiceFeedback: [] };
    report.cases.push(row); const fontAssets = new Set();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.input === 'touch', isMobile: profile.input === 'touch',
      colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'dukb-theme', value: profile.theme }, { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:/cage-clash', value: '1' }, { name: 'cage-unrelated', value: 'untouched' }] }] } });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No local write transport'); return route.continue(); }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        const write = { method: request.method(), path: url.pathname };
        if (url.pathname.endsWith('/game_completions')) {
          const body = request.postDataJSON(); write.scores = (Array.isArray(body) ? body : [body]).map(({ game, score }) => ({ game, score }));
        }
        row.blockedWrites.push(write);
      }
      if (/supabase|\/rest\/|\/functions\//.test(url.hostname + url.pathname)) row.blockedDatabase.push({ method: request.method(), path: url.pathname });
      const sheet = request.method() === 'GET' && fontLinks.includes(url.href);
      if (sheet || (request.method() === 'GET' && request.resourceType() === 'font' && fontAssets.has(url.href))) {
        try {
          const response = await route.fetch({ maxRedirects: 0 }); assert(response.ok(), 'Actual font response succeeds');
          if (sheet) { const body = await response.text(); const urls = [...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(['"]?)(https:\/\/[^)'"\s]+)\1\s*\)/g)].map(m => new URL(m[2]));
            assert(urls.length > 0); for (const asset of urls) { assert.equal(asset.origin, 'https://fonts.gstatic.com'); fontAssets.add(asset.href); }
            return route.fulfill({ response, body }); } return route.fulfill({ response });
        } catch (error) { row.assetErrors.push(String(error)); return route.abort(); }
      }
      if (request.resourceType() === 'font') { row.assetErrors.push(`Undeclared font ${url.href}`); return route.abort('blockedbyclient'); }
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') row.errors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(`${request.url()}: ${request.failure()?.errorText}`); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(`${response.status()} ${response.url()}`); });
    const cdp = await context.newCDPSession(page);
    const control = name => page.locator(`[data-cage-control="${name}"]`);
    const button = name => page.getByRole('button', { name, exact: true });
    async function hold(name, ms, cancel = false) {
      assert(!(await control(name).isDisabled()), `${name} is a contextual legal control`); row.inputs++;
      if (profile.input === 'keyboard') {
        await page.locator('canvas').focus(); await page.keyboard.down(keys[name]); await page.clock.runFor(ms); await page.keyboard.up(keys[name]);
      } else {
        const box = await control(name).boundingBox(); assert(box); const x = box.x + box.width / 2, y = box.y + box.height / 2;
        if (profile.input === 'touch') {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] }); await page.clock.runFor(ms);
          await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
        } else { await page.mouse.move(x, y); await page.mouse.down(); await page.clock.runFor(ms); await page.mouse.move(profile.width - 2, 2); await page.mouse.up(); }
      }
      await page.clock.runFor(112);
    }
    async function combatStep(state) {
      if (state.player.stamina < 26) { await page.clock.runFor(700); return; }
      const next = state.position === 'standing' ? Math.abs(state.player.x - state.cpu.x) > 8.5 ? (state.player.x < state.cpu.x ? 'right' : 'left') : 'grapple'
        : state.position === 'clinch' ? 'grapple'
        : state.top === 'player' ? /Mount/.test(state.status) && !(await control('submit').isDisabled()) ? 'submit' : 'grapple'
        : /· Guard$/.test(state.status) ? 'grapple' : 'kick';
      await hold(next, 250);
    }
    async function inspectFeedback(stage, state = null) {
      state ??= await hud(page);
      const target = page.locator('[data-cage-practice-feedback]');
      assert.equal(await target.count(), 1, `${stage}: actual practice has one feedback slot`);
      const feedback = state.feedback; assert(feedback, `${stage}: feedback and fighter facts share one actual DOM sample`);
      assert.equal(feedback.drill, state.drill); assert.equal(feedback.complete, state.practiceComplete);
      const recovered = state.drill === 'escape' && ((state.position === 'ground' && /· Guard$/.test(state.status)) || (state.position === 'standing' && state.practiceComplete));
      assert.equal(feedback.recoveredGuard, recovered, `${stage}: guard milestone comes from actually reaching full Guard`);
      let progress, instruction;
      if (state.drill === 'striking') {
        progress = `Shots ${Math.min(3, state.player.hits)}/3 · Gas ${Math.floor(state.player.stamina)}/100`;
        instruction = state.player.hits >= 3 ? 'Shots done. Release to reach 90 gas.' : 'Get close and land 3 shots.';
      } else if (state.drill === 'takedown') {
        progress = `Takedowns ${Math.min(1, state.player.takedowns)}/1 · ${state.position === 'ground' && state.top === 'player' ? 'You on top' : state.position === 'clinch' ? 'In clinch' : 'No top position'}`;
        instruction = state.position === 'clinch' ? 'Clinch set. Use Takedown.' : state.position === 'standing' ? 'Move close and use Clinch.' : 'Earn a takedown from the clinch.';
      } else if (state.drill === 'escape') {
        progress = `Guard ${recovered ? 1 : 0}/1 · Back on feet ${recovered && state.position === 'standing' ? 1 : 0}/1`;
        instruction = recovered ? 'Guard earned. Use Stand up.' : 'Use Regain guard until full Guard.';
      } else {
        const level = state.status.match(/· (Guard|Half guard|Mount)$/)?.[1]; assert(level, `${stage}: actual ground position is readable`);
        progress = `Your pressure ${Math.floor(state.player.submission)}% · ${level}`;
        instruction = state.phase === 'fight' && !state.practiceComplete && (await control('kick').getAttribute('aria-label')) === 'Lower posture' ? 'Use Lower posture, then hold Submit.' : 'Hold Submit. Passing improves pressure.';
      }
      if (state.practiceComplete) instruction = 'Drill complete. Retry or move on.';
      else if (state.phase === 'finished') instruction = 'Attempt ended. Retry this drill.';
      assert.equal(feedback.progress, progress, `${stage}: visible progress matches actual fighter facts`);
      assert.equal(feedback.status, instruction, `${stage}: next step follows the actual earned state`);
      assert.equal(feedback.outcome, feedback.message === practiceObjectives[state.drill] ? 'No attempt yet.' : `Last: ${feedback.message}`, `${stage}: only actual attempts show a last outcome`);
      assert.deepEqual(feedback.announcements, [{ role: 'status', live: 'polite', atomic: 'true' }], `${stage}: only changed instructions announce`);
      const value = await measure(page); geometry(value, profile, stage);
      row.practiceFeedback.push({ stage, hud: state, feedback, slot: value.feedback });
      if (!report.controls.includes('practice-feedback-font')) {
        const reading = target.locator('[data-cage-practice-progress]'), original = await reading.getAttribute('style');
        await reading.evaluate(el => { el.style.fontSize = '11px'; });
        assert.equal(await reading.evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 11);
        const fault = await measure(page);
        assert.throws(() => geometry(fault, profile, 'practice-feedback-font'), error => error.name === 'AssertionError' && /practice feedback below12px/.test(error.message));
        await reading.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), original);
        assert.equal(await reading.getAttribute('style'), original); geometry(await measure(page), profile, 'practice-feedback-font-restored');
        assert.equal(await reading.textContent(), feedback.progress, 'Restoring the isolated font fault leaves real progress intact');
        report.controls.push('practice-feedback-font'); report.practiceFeedbackControl = { before: value.feedback, fault: fault.feedback, restored: (await measure(page)).feedback, passed: true };
      }
      return feedback;
    }
    const inspect = async stage => {
      const value = await measure(page); geometry(value, profile, stage);
      if (stage === 'practice-submission' && profile.width === 320 && !report.controls.includes('readiness-wrap')) {
        const label = control('power').locator('span').first();
        const original = await label.evaluate(el => el.firstChild.textContent);
        assert.equal(original.trim(), 'Heavy strike');
        await label.evaluate(el => { el.firstChild.textContent = 'Heavy ground strike '; });
        assert.equal(await label.evaluate(el => el.firstChild.textContent), 'Heavy ground strike ');
        assert.notEqual(await label.evaluate(el => el.firstChild.textContent), original, 'The wrap control restores the actual previously clipped label');
        const wrapped = await measure(page); assert.throws(() => geometry(wrapped, profile, 'readiness-wrap'), /readiness text clipped or overlapping/);
        await label.evaluate((el, text) => { el.firstChild.textContent = text; }, original);
        assert.equal(await label.evaluate(el => el.firstChild.textContent), original);
        geometry(await measure(page), profile, 'readiness-wrap-restored'); report.controls.push('readiness-wrap');
      }
      const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      const state = await hud(page);
      if (state.drill !== 'none') await inspectFeedback(stage, state);
      else assert.equal(await page.locator('[data-cage-practice-feedback]').count(), 0, `${stage}: scored modes contain no drill feedback`);
      if (state.phase !== 'finished' || state.drill !== 'none') {
        assert.equal(await button('Fight stats').count(), 0, `${stage}: only a completed scored fight offers stats`);
        assert.equal(await page.locator('[data-cage-fight-stats]').count(), 0, `${stage}: no recap outside a completed scored fight`);
      }
      row.screenshots.push(file); row.steps.push({ stage, ...value, hud: state }); return value;
    };
    async function inspectStrikeAnimations() {
      const storage = () => page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
      const saved = await storage(), writes = row.blockedWrites.length;
      const readCrop = move => page.locator('canvas').evaluate((canvas, action) => {
        const actorX = Math.round(28 + Number(document.querySelector('[data-cage-fighter="player"]').dataset.x) * 2.64);
        const [x, y, width, height] = action === 'jab' ? [actorX + 6, 93, 31, 12] : [actorX + 8, 109, 30, 20];
        return { x, y, width, height, paintTick: Number(canvas.dataset.paintTick), action: canvas.dataset.playerAction, actionTicks: Number(canvas.dataset.playerActionTicks), pixels: [...canvas.getContext('2d').getImageData(x, y, width, height).data] };
      }, move);
      for (const action of ['jab', 'kick']) {
        await page.clock.runFor(1000); const before = await hud(page);
        assert.equal(before.drill, 'striking'); assert.equal(before.position, 'standing'); assert.equal(before.player.action, 'idle');
        assert(Math.abs(before.player.x - before.cpu.x) > 20, 'Native pose samples stay outside attack range with fixed fighters');
        const idle = await readCrop(action);
        const target = control(action), box = await target.boundingBox(); assert(box); assert(!(await target.isDisabled())); row.inputs++;
        const frames = [], pixels = []; let released = false;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 7 }] });
        try {
          for (const [phase, low, high] of [['windup', 5, 6], ['contact', 3, 4], ['recovery', 1, 2]]) {
            let crop;
            for (let frame = 0; frame < 24; frame++) {
              await page.clock.runFor(16); crop = await readCrop(action);
              if (crop.action === action && crop.actionTicks >= low && crop.actionTicks <= high) break;
            }
            assert(crop.action === action && crop.actionTicks >= low && crop.actionTicks <= high, `Rendered ${action} reaches its ${phase} action window`);
            assert(Number.isInteger(crop.paintTick) && crop.paintTick > before.tick, 'The actual painted strike advances beyond the resting fight');
            const state = await hud(page);
            if (!released) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); released = true; }
            assert.equal(state.player.x, before.player.x); assert.equal(state.cpu.x, before.cpu.x); assert.equal(state.position, 'standing');
            pixels.push(crop.pixels); const stage = `practice-${profile.reduced ? 'reduced' : 'motion'}-${action}-${phase}`;
            frames.push({ phase, paintTick: crop.paintTick, hudTick: state.tick, actionTicks: crop.actionTicks, crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height, sha256: createHash('sha256').update(Uint8Array.from(crop.pixels)).digest('hex') } });
            await inspect(stage);
          }
        } finally { if (!released) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); }
        const differences = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => pixels[a].reduce((count, channel, index) => count + Number(channel !== pixels[b][index]), 0));
        if (profile.reduced) { assert.notDeepEqual(pixels[0], idle.pixels, `${action}: the reduced action visibly changes the still idle pose`); assert(differences.every(count => count === 0), `${action}: reduced motion keeps one readable action pose through all three engine windows`); }
        else assert(differences.every(count => count > 0), `${action}: actual fixed-position glove or foot pixels distinguish windup, contact and recovery`);
        await page.clock.runFor(2000); const after = await hud(page);
        assert.equal(after.player.action, 'idle'); assert.equal(after.player.actionTicks, 0); assert.equal(after.player.x, before.player.x); assert.equal(after.cpu.x, before.cpu.x);
        assert.equal(after.player.hits, 0); assert.equal(after.cpu.health, 100); assert.equal(after.player.stamina, 100); assert.equal(after.practiceComplete, false);
        row.strikeAnimations.push({ action, reduced: profile.reduced, frames, differences });
      }
      assert.equal(row.blockedWrites.length, writes, 'Native animation practice sends no completion or write attempt');
      assert.deepEqual(await storage(), saved, 'Native animation practice changes no local or session save');
      console.log(`cageClash1063 ${id}: real Jab and Kick windup/contact/recovery ${profile.reduced ? 'stable reduced' : 'distinct rendered'} crops and zero practice writes passed.`);
    }
    async function inspectReadiness() {
      const storage = () => page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
      const saved = await storage(), writes = row.blockedWrites.length, initial = await hud(page);
      const hint = action => page.locator(`[data-cage-readiness="${action}"]`);
      const waitHint = async (action, expected, steps = 20) => {
        for (let step = 0; step < steps && await hint(action).innerText() !== expected; step++) await page.clock.runFor(100);
        assert.equal(await hint(action).innerText(), expected, `${action} renders the actual sampled ${expected} hint`);
        assert(!(await control(action).isDisabled()), `${expected} remains descriptive, not an input lock`);
      };
      row.readiness = { states: [] };
      const capture = async (stage, screenshot = true) => {
        const value = await measure(page); geometry(value, profile, stage);
        row.readiness.states.push({ stage, hud: await hud(page), hints: value.hints });
        if (screenshot) await inspect(`readiness-${stage}`);
      };
      assert.equal(initial.player.hits, 0); assert.equal(initial.player.x, 28); assert.equal(initial.cpu.x, 72);
      await waitHint('jab', 'Move closer'); await waitHint('kick', 'Move closer'); await capture('out-of-range');
      if (!report.controls.includes('readiness-font')) {
        const target = hint('jab'), style = await target.getAttribute('style');
        await target.evaluate(el => { el.style.fontSize = '9px'; });
        assert.equal(await target.evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 9);
        const small = await measure(page); assert.throws(() => geometry(small, profile, 'readiness-font'), /below10px/);
        await target.evaluate((el, original) => original === null ? el.removeAttribute('style') : el.setAttribute('style', original), style);
        report.controls.push('readiness-font');
        const described = await control('jab').getAttribute('aria-describedby'); assert(described);
        await control('jab').evaluate(el => el.removeAttribute('aria-describedby'));
        assert.equal(await control('jab').getAttribute('aria-describedby'), null);
        const broken = await measure(page); assert.throws(() => geometry(broken, profile, 'readiness-description'), /description link/);
        await control('jab').evaluate((el, original) => el.setAttribute('aria-describedby', original), described);
        geometry(await measure(page), profile, 'readiness-restored'); report.controls.push('readiness-description');
      }
      await hold('jab', 80); const miss = await hud(page);
      assert.equal(miss.cpu.health, initial.cpu.health); assert.equal(miss.player.hits, 0); assert(miss.player.stamina < initial.player.stamina, 'An accepted out-of-range jab still pays gas');
      await waitHint('jab', 'Recovering'); await capture('miss-recovering', false); await page.clock.runFor(800);
      for (let move = 0; move < 30 && Math.abs((await hud(page)).player.x - (await hud(page)).cpu.x) > 9; move++) await hold('right', 150);
      await waitHint('jab', 'Ready'); await capture('in-range');
      const close = await hud(page); assert(Math.abs(close.player.x - close.cpu.x) <= 10);
      await hold('jab', 80); await waitHint('jab', 'Recovering');
      const landed = await hud(page); assert.equal(landed.player.hits, 1); assert(landed.cpu.health < close.cpu.health, 'Ready jab lands through the unchanged touch control'); await capture('landed-recovering');
      for (let move = 0; move < 20 && Math.abs((await hud(page)).player.x - (await hud(page)).cpu.x) <= 22; move++) await hold('left', 150);
      await page.clock.runFor(800); await waitHint('kick', 'Move closer');
      const beforeDrain = await hud(page), box = await control('kick').boundingBox(); assert(box); row.inputs++;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 7 }] });
      try {
        await waitHint('kick', 'Recover gas', 180);
        const depleted = await hud(page); assert(depleted.player.stamina < 16); assert.equal(depleted.cpu.health, beforeDrain.cpu.health); assert.equal(depleted.player.hits, 1);
        assert.equal(depleted.player.x, beforeDrain.player.x); assert.equal(depleted.cpu.x, beforeDrain.cpu.x);
        await capture('low-gas');
      } finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      await waitHint('kick', 'Move closer', 50); await capture('gas-recovered', false);
      for (let move = 0; move < 20 && Math.abs((await hud(page)).player.x - (await hud(page)).cpu.x) > 19; move++) await hold('right', 150);
      await waitHint('kick', 'Ready'); await capture('kick-ready', false);
      const after = await hud(page); assert.equal(after.player.hits, 1); assert.equal(after.practiceComplete, false);
      assert.equal(row.blockedWrites.length, writes); assert.deepEqual(await storage(), saved, 'Readiness practice sends no completion or save');
      row.readiness.passed = true;
      console.log(`cageClash1063 ${id}: actual range, paid misses, recovery, gas depletion, readable linked hints and unchanged touch input passed.`);
    }
    async function inspectGroundAnimation() {
      const storage = () => page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
      const saved = await storage(), writes = row.blockedWrites.length;
      const readCrop = kind => page.locator('canvas').evaluate((canvas, cropKind) => {
        const fighterX = side => Number(document.querySelector(`[data-cage-fighter="${side}"]`).dataset.x);
        const middle = 28 + (fighterX('player') + fighterX('cpu')) * 1.32, actorX = Math.round(middle - 4);
        const [x, y, width, height] = cropKind === 'level' ? [Math.round(middle) - 32, 115, 64, 24] : cropKind === 'effort' ? [actorX + 10, 121, 17, 21] : [actorX + 4, 118, 21, 16];
        return { x, y, width, height, paintTick: Number(canvas.dataset.paintTick), action: canvas.dataset.playerAction, actionTicks: Number(canvas.dataset.playerActionTicks),
          position: canvas.dataset.position, top: canvas.dataset.top, groundLevel: Number(canvas.dataset.groundLevel), playerSubmission: Number(canvas.dataset.playerSubmission), cpuSubmission: Number(canvas.dataset.cpuSubmission),
          pixels: [...canvas.getContext('2d').getImageData(x, y, width, height).data] };
      }, kind);
      const grounded = crop => {
        assert.equal(crop.position, 'ground'); assert.equal(crop.top, 'player'); assert.equal(crop.cpuSubmission, 0);
        assert(Number.isInteger(crop.paintTick) && [0, 1, 2].includes(crop.groundLevel) && Number.isFinite(crop.playerSubmission), 'Ground pixels carry the exact painted fight state');
      };
      const capture = async (name, crop) => {
        grounded(crop); const { pixels, x, y, width, height, ...painted } = crop, state = await hud(page);
        assert.equal(state.player.x, initial.player.x); assert.equal(state.cpu.x, initial.cpu.x); assert.equal(state.practiceComplete, false);
        const stage = `practice-${profile.reduced ? 'reduced' : 'motion'}-ground-${name}`;
        await inspect(stage);
        return { stage, ...painted, hudTick: state.tick, crop: { x, y, width, height, sha256: createHash('sha256').update(Uint8Array.from(pixels)).digest('hex') } };
      };
      const differences = pixels => [[0, 1], [1, 2], [0, 2]].map(([a, b]) => pixels[a].reduce((count, channel, index) => count + Number(channel !== pixels[b][index]), 0));
      await page.clock.runFor(2000); const initial = await hud(page);
      assert.equal(initial.drill, 'submission'); assert.equal(initial.position, 'ground'); assert.equal(initial.top, 'player');
      const levels = [], levelPixels = [], effort = [], effortPixels = [], pressure = [], pressurePixels = [];
      const first = await readCrop('level'); grounded(first); assert.equal(first.groundLevel, 0); assert.equal(first.action, 'idle'); assert.equal(first.actionTicks, 0); assert.equal(first.playerSubmission, 0);
      levels.push(await capture('guard', first)); levelPixels.push(first.pixels);
      const target = control('grapple'), box = await target.boundingBox(); assert(box); assert(!(await target.isDisabled())); row.inputs++;
      let released = false;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 7 }] });
      try {
        for (const [phase, low, high] of [['windup', 5, 6], ['contact', 3, 4], ['recovery', 1, 2]]) {
          let crop;
          for (let frame = 0; frame < 24; frame++) {
            await page.clock.runFor(16); crop = await readCrop('effort');
            if (crop.action === 'grapple' && crop.actionTicks >= low && crop.actionTicks <= high) break;
          }
          grounded(crop); assert(crop.action === 'grapple' && crop.actionTicks >= low && crop.actionTicks <= high, `Actual grounded grapple reaches its ${phase} painted window`);
          assert(crop.paintTick > first.paintTick); assert.equal(crop.playerSubmission, 0);
          if (effort.length) assert.equal(crop.groundLevel, effort[0].groundLevel, 'Effort samples keep the same actual ground position');
          if (!released) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); released = true; }
          effort.push(await capture(`grapple-${phase}`, crop)); effortPixels.push(crop.pixels);
        }
      } finally { if (!released) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); }
      const effortDifferences = differences(effortPixels);
      assert(effortDifferences.every(count => profile.reduced ? count === 0 : count > 0), 'Same-position grapple pixels are stable in reduced motion and distinct in normal motion');
      await page.clock.runFor(2000); const restingEffort = await readCrop('effort');
      grounded(restingEffort); assert.equal(restingEffort.action, 'idle'); assert.equal(restingEffort.actionTicks, 0); assert.equal(restingEffort.groundLevel, effort[0].groundLevel);
      assert.notDeepEqual(effortPixels[1], restingEffort.pixels, 'Even reduced motion visibly shows the actual grapple effort');
      for (const level of [1, 2]) {
        let crop = await readCrop('level');
        for (let attempt = 0; attempt < 30 && crop.groundLevel < level; attempt++) { await hold('grapple', 100); await page.clock.runFor(2000); crop = await readCrop('level'); }
        grounded(crop); assert.equal(crop.groundLevel, level, 'Actual Pass guard input earns each successive ground position');
        assert.equal(crop.action, 'idle'); assert.equal(crop.actionTicks, 0); assert.equal(crop.playerSubmission, 0);
        levels.push(await capture(level === 1 ? 'half-guard' : 'mount', crop)); levelPixels.push(crop.pixels);
      }
      const levelDifferences = differences(levelPixels); assert(levelDifferences.every(count => count > 0), 'Guard, half guard and mount have distinct actual resting silhouettes in both motion modes');
      const submit = control('submit'), submitBox = await submit.boundingBox(); assert(submitBox); assert(!(await submit.isDisabled())); row.inputs++;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: submitBox.x + submitBox.width / 2, y: submitBox.y + submitBox.height / 2, id: 7 }] });
      try {
        for (const [band, low, high] of [['low', 0, 25], ['mid', 25, 65], ['high', 65, 100]]) {
          let crop;
          for (let frame = 0; frame < 64; frame++) {
            await page.clock.runFor(16); crop = await readCrop('pressure');
            if (crop.action === 'submit' && crop.playerSubmission > 0 && crop.playerSubmission >= low && crop.playerSubmission < high) break;
          }
          grounded(crop); assert.equal(crop.groundLevel, 2);
          assert(crop.action === 'submit' && crop.playerSubmission > 0 && crop.playerSubmission >= low && crop.playerSubmission < high, `Held native Submit reaches the actual ${band} pressure band`);
          pressure.push(await capture(`submission-${band}`, crop)); pressurePixels.push(crop.pixels);
        }
      } finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      const pressureDifferences = differences(pressurePixels); assert(pressureDifferences.every(count => count > 0), 'Real low, mid and high submission pressure renders three distinct grips in both motion modes');
      assert.equal(row.blockedWrites.length, writes, 'Ground animation practice sends no completion or write attempt'); assert.deepEqual(await storage(), saved, 'Ground animation practice changes no local or session save');
      row.groundAnimation = { reduced: profile.reduced, levels, effort, pressure, levelDifferences, effortDifferences, pressureDifferences, passed: true };
      console.log(`cageClash1063 ${id}: earned Guard, Half guard and Mount, three actual grapple frames, three real pressure grips and zero practice writes passed.`);
    }
    async function inspectFightStats(stage) {
      const before = await hud(page), writes = structuredClone(row.blockedWrites);
      const storage = () => page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
      const saved = await storage(), stats = page.locator('[data-cage-fight-stats]');
      assert.equal(before.phase, 'finished'); assert.equal(before.drill, 'none'); assert(before.tickMs > 0);
      for (const side of ['player', 'cpu']) for (const [key] of fightStats) assert(Number.isFinite(before[side][key]) && before[side][key] >= 0, `${stage}: real ${side} ${key} counter is exposed`);
      assert(['player', 'cpu'].some(side => fightStats.some(([key]) => before[side][key] > 0)), `${stage}: the earned fight changed real counters`);
      await activate(button('Fight stats'), profile); await stats.waitFor(); await page.clock.runFor(112);
      const recap = await stats.evaluate(el => ({ headers: [...el.querySelectorAll('thead th')].map(cell => cell.textContent.trim()), rows: [...el.querySelectorAll('[data-cage-stat]')].map(row => ({ key: row.dataset.cageStat, cells: [...row.children].map(cell => cell.textContent.trim()) })) }));
      assert.deepEqual(recap.headers.slice(-2), ['You', 'CPU']); assert.equal(recap.rows.length, 5);
      assert.deepEqual(recap.rows, fightStats.map(([key, label]) => ({ key, cells: [label, ...['player', 'cpu'].map(side => key === 'controlTicks' ? `${(before[side][key] * before.tickMs / 1000).toFixed(1)}s` : String(key === 'damageDealt' ? Math.round(before[side][key]) : before[side][key]))] })), `${stage}: visible recap matches both actual fighter counters`);
      for (const name of ['Fight stats', 'Rematch', 'Next opponent', 'New circuit']) assert.equal(await button(name).count(), 0, `${stage}: recap replaces result actions`);
      await inspect(`${stage}-stats`);
      const back = stats.getByRole('button', { name: 'Back', exact: true });
      if (profile.input === 'keyboard') await visibleFocus(back);
      if (!report.controls.includes('stats-clipping')) {
        const table = stats.locator('table'), original = await table.getAttribute('style'), prior = await table.boundingBox(); assert(prior);
        await table.evaluate((el, height) => { el.style.setProperty('transition', 'none', 'important'); el.style.transform = `translateY(${-2 * height}px)`; }, profile.height);
        await page.clock.runFor(112);
        const moved = await table.boundingBox(), clipped = await measure(page); assert(moved && moved.y + moved.height < 0 && moved.y < prior.y - prior.height, 'The recap control moves the real table outside its arena');
        assert.throws(() => geometry(clipped, profile, 'control-stats-clipping'), /stats row clipped/);
        await table.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), original);
        await page.clock.runFor(112);
        assert.equal(await table.getAttribute('style'), original); geometry(await measure(page), profile, 'stats-control-restored'); report.controls.push('stats-clipping');
      }
      const combat = ({ text, ...state }) => state;
      await page.clock.runFor(1000); assert.deepEqual(combat(await hud(page)), combat(before), `${stage}: reading stats never advances or changes the earned result`);
      await activate(back, profile); await page.clock.runFor(112); assert.equal(await stats.count(), 0);
      if (profile.input === 'keyboard') await visibleFocus(button('Fight stats'));
      assert.deepEqual(await hud(page), before, `${stage}: Back restores the same result`);
      assert.deepEqual(row.blockedWrites, writes, `${stage}: opening and closing stats changes no awards or write attempts`);
      assert.deepEqual(await storage(), saved, `${stage}: recap navigation changes no local or session saves`);
      row.fightStats.push({ stage, counters: { player: before.player, cpu: before.cpu }, recap });
      await inspect(`${stage}-back`);
    }
    try {
      await page.clock.install();
      await page.goto(`${BASE}/cage-clash`, { waitUntil: 'domcontentloaded' }); await root(page).waitFor();
      if (profile.input === 'keyboard') {
        await useNativeFocus(page);
        await page.bringToFront();
      }
      row.fonts = await page.evaluate(async () => {
        await document.fonts.ready; const faces = [];
        for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
          const loaded = await document.fonts.load(`${weight} 16px "${family}"`, 'Cage Clash');
          faces.push({ family, weight, count: loaded.length, loaded: loaded.length > 0 && loaded.every(face => face.status === 'loaded') });
        }
        return faces;
      });
      assert.equal(row.fonts.length, 8); assert(row.fonts.every(face => face.loaded), 'All eight actual site font faces load before native geometry');
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), profile.theme === 'light');
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), profile.reduced);
      await inspect('setup'); assert.match(await root(page).innerText(), /Try this|Example/);
      if (report.controls.length === 0) {
        const target = button('Fight'), original = await target.getAttribute('style');
        const restore = () => target.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), original);
        await target.evaluate(el => { el.style.minHeight = '0'; el.style.height = '20px'; el.style.padding = '0'; });
        const small = await measure(page); assert(small.controls.some(r => r.height === 20)); assert.throws(() => geometry(small, profile, 'control-size'), /below44px/); await restore(); report.controls.push('action-size');
        const beforeClip = await target.boundingBox(); assert(beforeClip);
        await target.evaluate(el => { el.style.position = 'fixed'; el.style.top = `${-2 * innerHeight}px`; });
        const moved = await target.boundingBox(), clipped = await measure(page);
        assert(moved && moved.y < beforeClip.y - beforeClip.height && moved.y + moved.height < 0, 'Clipping control moves the actual target fully outside the viewport');
        assert.throws(() => geometry(clipped, profile, 'control-clipping'), /action clipped/); await restore();
        assert.equal(await target.getAttribute('style'), original); geometry(await measure(page), profile, 'clipping-restored'); report.controls.push('action-clipping');
        const bodyStyle = await page.locator('body').getAttribute('style'); await page.locator('body').evaluate((el, width) => { el.style.minWidth = `${width + 80}px`; }, profile.width);
        const wide = await measure(page); assert(wide.scrollWidth > profile.width + 60); assert.throws(() => geometry(wide, profile, 'control-overflow'), /horizontal overflow/);
        await page.locator('body').evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), bodyStyle); report.controls.push('horizontal-overflow');
        await page.keyboard.press('Tab'); await target.focus(); await visibleFocus(target);
        await target.evaluate(el => { el.style.outline = 'none'; el.style.boxShadow = 'none'; }); await assert.rejects(() => visibleFocus(target), /visibly marked/); await restore(); report.controls.push('keyboard-focus');
        geometry(await measure(page), profile, 'controls-restored');
      }
      assert.equal(await page.getByLabel('Mode', { exact: true }).inputValue(), 'quick', 'A fresh visit still defaults to a quick fight');
      {
        const storage = () => page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
        const beforePractice = await storage(), writesBeforePractice = row.blockedWrites.length;
        const originalStyle = await page.getByLabel('Your style', { exact: true }).inputValue();
        row.practice = { drills: [] };
        await choose(page.getByLabel('Mode', { exact: true }), 'practice', profile);
        await choose(page.getByLabel('Practice drill', { exact: true }), 'striking', profile);
        await inspect('practice-setup'); await activate(button('Start drill'), profile); await page.clock.runFor(112);
        for (const drill of ['striking', 'takedown', 'submission', 'escape']) {
          const initial = await hud(page); assert.equal(initial.drill, drill); assert.equal(initial.practiceComplete, false);
          assert(await page.locator('canvas').evaluate(el => el === document.activeElement), 'Starting or advancing a drill focuses the arena');
          await inspect(`practice-${drill}`);
          if (drill === 'striking') {
            assert(Math.abs(initial.player.x - initial.cpu.x) > 20, 'Striking starts outside every attack range');
            await page.clock.runFor(46000);
            assert.equal((await hud(page)).phase, 'fight', 'Practice remains untimed beyond a normal round');
            assert.equal((await hud(page)).player.health, 100, 'The passive practice partner does not attack');
            assert.equal((await hud(page)).practiceComplete, false, 'Waiting does not complete the lesson');
            assert.equal((await inspectFeedback('practice-idle-before-attempt')).outcome, 'No attempt yet.', 'Untimed idle does not invent an attempted move');
            if (profile.width === 320) { await inspectStrikeAnimations(); await inspectReadiness(); }
            const healthBeforeMiss = (await hud(page)).cpu.health;
            await hold('jab', 250); assert.equal((await hud(page)).cpu.health, healthBeforeMiss, 'Out-of-range practice strikes really miss');
            await activate(button('How to play Cage Clash'), profile); await page.getByRole('dialog').waitFor(); await page.clock.runFor(300);
            const settled = await page.getByRole('dialog').evaluate(async el => {
              await Promise.all(el.getAnimations().map(animation => animation.finished));
              const style = getComputedStyle(el), matrix = new DOMMatrixReadOnly(style.transform);
              return [matrix.a, matrix.b, matrix.c, matrix.d, Number(style.opacity)];
            });
            assert.deepEqual(settled, [1, 0, 0, 1, 1]); await inspect('practice-help');
            const frozen = await hud(page); await page.clock.runFor(500); assert.deepEqual(await hud(page), frozen, 'Help freezes the real drill');
            const frozenFeedback = await inspectFeedback('practice-help-frozen', frozen);
            await activate(page.getByRole('dialog').getByRole('button', { name: /close/i }), profile); await page.clock.runFor(300);
            assert.deepEqual(await hud(page), frozen, 'Closing practice help still requires resume');
            assert.deepEqual(await inspectFeedback('practice-help-closed'), frozenFeedback, 'Help close preserves feedback until explicit resume');
            await activate(button('Resume drill'), profile); await page.clock.runFor(112);
            for (let move = 0; move < 40 && Math.abs((await hud(page)).player.x - (await hud(page)).cpu.x) > 8; move++) await hold('right', 150);
            assert(Math.abs((await hud(page)).player.x - (await hud(page)).cpu.x) <= 8, 'Real movement reaches striking range');
            for (let shot = row.readiness?.passed ? 1 : 0; shot < 3; shot++) {
              const health = (await hud(page)).cpu.health; await hold('jab', 250);
              assert((await hud(page)).cpu.health < health, `Practice shot ${shot + 1} lands`);
              if (shot < 2) assert.equal((await hud(page)).practiceComplete, false, 'Fewer than three landed shots cannot complete striking');
              await inspectFeedback(`practice-shot-${shot + 1}`);
              await page.clock.runFor(600);
            }
            for (let rest = 0; rest < 80 && !(await hud(page)).practiceComplete; rest++) await page.clock.runFor(250);
            assert((await hud(page)).player.stamina >= 90, 'Striking completes only after gas recovery');
          } else if (drill === 'takedown') {
            assert.equal(initial.position, 'standing'); await hold('grapple', 250); assert.equal((await hud(page)).position, 'clinch', 'First grapple earns a real clinch');
            await inspectFeedback('practice-earned-clinch');
            for (let attempt = 0; attempt < 30 && !(await hud(page)).practiceComplete; attempt++) {
              const before = await hud(page);
              if (before.player.stamina < 30) await page.clock.runFor(1500); else await hold('grapple', 1200);
              const after = await hud(page), feedback = await inspectFeedback(`practice-takedown-attempt-${attempt}`, after);
              if (before.player.stamina >= 30 && after.position === 'clinch' && after.player.stamina < before.player.stamina) assert.equal(feedback.message, 'Takedown defended.', 'An actual defended takedown remains visible');
            }
            assert.equal((await hud(page)).position, 'ground'); assert.equal((await hud(page)).top, 'player', 'A real takedown earns top position');
          } else if (drill === 'submission') {
            assert.equal(initial.position, 'ground'); assert.equal(initial.top, 'player'); assert.match(initial.status, /· Guard$/);
            if (profile.width === 320) await inspectGroundAnimation();
            await hold('submit', 250); assert((await hud(page)).player.submission > 0, 'Holding Submit builds real progress');
            assert.equal((await hud(page)).practiceComplete, false, 'Partial submission is not a completed lesson');
            await inspect('practice-submission-progress'); await hold('submit', 2500);
            assert.equal((await hud(page)).player.submission, 100, 'The actual submission reaches its finish');
          } else {
            assert.equal(initial.position, 'ground'); assert.equal(initial.top, 'cpu'); assert.match(initial.status, /· Mount$/);
            assert(await control('escape').isDisabled(), 'Mount must be escaped through recovered guard');
            for (let attempt = 0; attempt < 30 && !/· Guard$/.test((await hud(page)).status); attempt++) {
              const before = await hud(page); await hold('kick', 250); const after = await hud(page), feedback = await inspectFeedback(`practice-regain-attempt-${attempt}`, after);
              if (after.status === before.status && after.player.stamina < before.player.stamina) assert.equal(feedback.message, 'No space yet. Guard and try again.', 'An actual resisted guard recovery remains visible');
              await page.clock.runFor(1000);
            }
            assert.match((await hud(page)).status, /· Guard$/); assert.equal((await hud(page)).top, 'cpu'); await inspect('practice-guard-recovered');
            for (let attempt = 0; attempt < 30 && !(await hud(page)).practiceComplete; attempt++) {
              const before = await hud(page); await hold('escape', 250); const after = await hud(page), feedback = await inspectFeedback(`practice-stand-attempt-${attempt}`, after);
              if (after.position === 'ground' && after.player.stamina < before.player.stamina) assert.equal(feedback.message, 'Escape resisted. Guard and make space.', 'An actual resisted stand-up remains visible');
              await page.clock.runFor(1100);
            }
            assert.equal((await hud(page)).position, 'standing', 'Actual escape input returns to the feet');
          }
          assert.equal((await hud(page)).practiceComplete, true, `${drill} finishes through actual controls`);
          await inspect(`practice-${drill}-complete`); const completed = await hud(page); await page.clock.runFor(1200);
          assert.deepEqual(await hud(page), completed, 'A completed drill stops advancing'); row.practice.drills.push(drill);
          assert.equal(row.blockedWrites.length, writesBeforePractice, 'Practice completion sends no score or completion attempt');
          if (drill !== 'escape') { await activate(button('Next drill'), profile); await page.clock.runFor(112); }
        }
        await activate(button('Retry drill'), profile); await page.clock.runFor(112);
        assert.equal((await hud(page)).drill, 'escape'); assert.equal((await hud(page)).practiceComplete, false);
        assert.equal((await hud(page)).top, 'cpu'); assert.match((await hud(page)).status, /· Mount$/); assert.equal((await hud(page)).player.stamina, 100, 'Retry resets the actual drill');
        assert(await page.locator('canvas').evaluate(el => el === document.activeElement), 'Retry returns focus to the arena'); await inspectFeedback('practice-retry-reset');
        await activate(button('Pause'), profile); await inspect('practice-paused'); const paused = await hud(page);
        await page.clock.runFor(500); assert.deepEqual(await hud(page), paused); await activate(button('Leave drill'), profile); await page.clock.runFor(112);
        assert.equal((await hud(page)).phase, 'setup'); assert.equal(row.blockedWrites.length, writesBeforePractice, 'Leaving a drill sends no completion attempt');
        await choose(page.getByLabel('Practice drill', { exact: true }), 'escape', profile); await activate(button('Start drill'), profile); await page.clock.runFor(112);
        for (let attempt = 0; attempt < 30 && !/· Guard$/.test((await hud(page)).status); attempt++) { await hold('kick', 250); await page.clock.runFor(1000); }
        assert.match((await hud(page)).status, /· Guard$/);
        for (let attempt = 0; attempt < 30 && !(await hud(page)).practiceComplete; attempt++) { await hold('escape', 250); await page.clock.runFor(1100); }
        assert.equal((await hud(page)).practiceComplete, true); await activate(button('Start a fight'), profile); await page.clock.runFor(112);
        assert.equal((await hud(page)).phase, 'setup'); assert.equal(await page.getByLabel('Mode', { exact: true }).inputValue(), 'quick');
        assert.equal(await page.getByLabel('Your style', { exact: true }).inputValue(), originalStyle); assert.equal(await page.getByLabel('Opponent style', { exact: true }).inputValue(), 'balanced');
        assert.equal(row.blockedWrites.length, writesBeforePractice); assert.deepEqual(await storage(), beforePractice, 'Drills, retry and leaving do not write local or session saves');
        await inspect('quick-after-practice'); row.practice.passed = true;
        row.practice.isolation = { writesBefore: writesBeforePractice, writesAfter: row.blockedWrites.length, localAndSessionHeld: JSON.stringify(await storage()) === JSON.stringify(beforePractice) };
        console.log(`cageClash1063 ${id}: four real practice drills, help/pause, retry/leave, quick setup and zero practice writes passed.`);
      }
      if (profile.width === 390) {
        const beforeAnimationWrites = row.blockedWrites.length;
        const beforeAnimationStorage = await page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
        await choose(page.getByLabel('Mode', { exact: true }), 'practice', profile);
        await choose(page.getByLabel('Practice drill', { exact: true }), 'striking', profile);
        await activate(button('Start drill'), profile); await page.clock.runFor(112); await inspect('animation-practice');
        await inspectStrikeAnimations(); await inspectReadiness();
        await activate(button('Pause'), profile); const paused = await hud(page); await inspect('animation-practice-paused');
        await page.clock.runFor(500); assert.deepEqual(await hud(page), paused, 'The actual animation drill still obeys Pause');
        await activate(button('Leave drill'), profile); await page.clock.runFor(112);
        assert.equal((await hud(page)).phase, 'setup'); await choose(page.getByLabel('Practice drill', { exact: true }), 'submission', profile);
        await activate(button('Start drill'), profile); await page.clock.runFor(112); await inspectGroundAnimation();
        await hold('submit', 2500); assert.equal((await hud(page)).player.submission, 100); assert.equal((await hud(page)).practiceComplete, true, 'The real ground animation lesson finishes only through held Submit');
        await inspect('animation-submission-complete'); const completed = await hud(page); await page.clock.runFor(1200); assert.deepEqual(await hud(page), completed, 'The completed ground animation drill stays frozen');
        await activate(button('Retry drill'), profile); await page.clock.runFor(112); assert.equal((await hud(page)).practiceComplete, false); assert.match((await hud(page)).status, /· Guard$/);
        await activate(button('Pause'), profile); const groundPaused = await hud(page); await page.clock.runFor(500); assert.deepEqual(await hud(page), groundPaused, 'Ground animation practice obeys Pause after retry');
        await activate(button('Leave drill'), profile); await page.clock.runFor(112);
        assert.equal((await hud(page)).phase, 'setup'); await choose(page.getByLabel('Mode', { exact: true }), 'quick', profile);
        assert.equal(row.blockedWrites.length, beforeAnimationWrites, 'Leaving the native animation drill awards nothing');
        assert.deepEqual(await page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() })), beforeAnimationStorage, 'The isolated native animation drill creates no save');
      }
      await choose(page.getByLabel('Your style', { exact: true }), 'grappler', profile);
      await choose(page.getByLabel('Opponent style', { exact: true }), 'striker', profile);
      await activate(button('Fight'), profile); await page.clock.runFor(112); await inspect('standing');
      const art = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, rendering: getComputedStyle(canvas).imageRendering,
        colors: new Set(Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).filter((_, i) => i % 4 !== 3)).size }));
      assert.equal(art.width, 320); assert.equal(art.height, 180); assert.equal(art.rendering, 'pixelated'); assert(art.colors > 8, 'Canvas contains actual rendered pixel art');
      await hold('left', 180, true); const released = await hud(page); await page.clock.runFor(220); const afterRelease = await hud(page);
      assert.equal(afterRelease.player.x, released.player.x, 'Release or touch cancel clears movement');
      await activate(button('How to play Cage Clash'), profile); await page.getByRole('dialog').waitFor();
      await page.clock.runFor(300);
      row.helpTransform = await page.getByRole('dialog').evaluate(async el => {
        await Promise.all(el.getAnimations().map(animation => animation.finished));
        const style = getComputedStyle(el), matrix = new DOMMatrixReadOnly(style.transform);
        return { scaleX: matrix.a, scaleY: matrix.d, skewX: matrix.b, skewY: matrix.c, opacity: Number(style.opacity) };
      });
      assert.deepEqual(row.helpTransform, { scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, opacity: 1 }, 'The real help entrance animation finishes before geometry');
      await inspect('help');
      const helpTick = (await hud(page)).tick; await page.clock.runFor(1000); assert.equal((await hud(page)).tick, helpTick, 'Help freezes actual combat');
      await activate(page.getByRole('dialog').getByRole('button', { name: /close/i }), profile);
      await page.clock.runFor(300); assert.equal((await hud(page)).tick, helpTick, 'Closing help still waits for explicit resume');
      await activate(button('Resume fight'), profile); await page.clock.runFor(150); assert((await hud(page)).tick > helpTick);
      if (profile.input === 'keyboard') {
        assert(await page.locator('canvas').evaluate(el => el === document.activeElement), 'Resume returns keyboard focus to the arena');
        const glove = () => page.locator('canvas').evaluate(canvas => {
          const x = Number(document.querySelector('[data-cage-fighter="player"]').dataset.x);
          return [...canvas.getContext('2d').getImageData(Math.round(28 + x * 2.64) + 12, 88, 1, 1).data];
        });
        const idleGlove = await glove(), beforeGuard = await hud(page);
        await page.keyboard.down('Space'); await page.clock.runFor(180);
        assert(!(await hud(page)).paused, 'Space after Resume controls guard instead of the old button');
        assert((await hud(page)).player.stamina < beforeGuard.player.stamina, 'Held guard pays its real stamina cost');
        assert.notDeepEqual(idleGlove, [99, 139, 255, 255], 'Idle glove leaves the raised guard location empty');
        assert.deepEqual(await glove(), [99, 139, 255, 255], 'Actual guard input visibly raises the player glove');
        await inspect('keyboard-guard'); await page.keyboard.up('Space'); await page.clock.runFor(112);
        assert.notDeepEqual(await glove(), [99, 139, 255, 255], 'Release returns the actual pixel pose to idle');
        await page.keyboard.down('ArrowLeft'); await page.clock.runFor(150);
        assert(await page.evaluate(() => document.hasFocus()), 'The arena begins with actual browser focus');
        const other = await context.newPage();
        try {
          await useNativeFocus(other);
          await other.bringToFront();
          await other.waitForFunction(() => document.hasFocus(), null, { polling: 100, timeout: 3000 });
          await page.waitForFunction(() => !document.hasFocus(), null, { polling: 100, timeout: 3000 });
          row.focusLost = await page.evaluate(() => ({ focused: document.hasFocus(), hidden: document.hidden }));
          assert.equal(row.focusLost.focused, false); await page.clock.runFor(250);
          const frozen = await hud(page); assert(frozen.paused, 'Losing actual browser focus pauses the fight');
          await page.clock.runFor(250); assert.deepEqual(await hud(page), frozen, 'Unfocused combat stays frozen');
        } finally {
          await page.keyboard.up('ArrowLeft'); await other.close(); await page.bringToFront();
        }
        await page.waitForFunction(() => document.hasFocus(), null, { polling: 100, timeout: 3000 });
        assert(await page.evaluate(() => document.hasFocus()), 'Browser focus is restored before explicit resume');
        const returned = await hud(page); assert(returned.paused, 'Restoring browser focus does not resume the fight');
        await activate(button('Resume fight'), profile); const x = (await hud(page)).player.x; await page.clock.runFor(180);
        assert.equal((await hud(page)).player.x, x, 'Blur clears the held key before resume');
        assert((await hud(page)).tick > returned.tick, 'Explicit resume advances real combat after focus returns');
      }
      const writesBeforeQuit = row.blockedWrites.length;
      await activate(button('Pause'), profile); await inspect('paused'); await activate(button('Leave fight'), profile);
      await page.clock.runFor(500); assert.equal((await hud(page)).phase, 'setup'); assert.equal(row.blockedWrites.length, writesBeforeQuit, 'Leaving unfinished combat sends no completion attempt');
      await activate(button('Fight'), profile); await page.clock.runFor(112);
      const seen = new Set(['standing']);
      for (let turn = 0; turn < 620; turn++) {
        const state = await hud(page);
        if (state.phase === 'finished') { coverage.add('result'); row.result = state.text; await inspect('result'); break; }
        if (state.phase === 'break') { await inspect(`break-${row.steps.filter(s => s.stage.startsWith('break')).length}`); await activate(button('Next round'), profile); continue; }
        const position = state.position === 'ground' ? `ground-${state.top}` : state.position;
        coverage.add(position);
        if (!seen.has(position)) { seen.add(position); await inspect(position); }
        if (state.player.submission > 0 && !seen.has('submission')) { seen.add('submission'); coverage.add('submission'); await inspect('submission'); }
        await combatStep(state);
      }
      assert.equal((await hud(page)).phase, 'finished', 'A whole real fight completes with actual controls');
      assert.match(row.result, /(?:KO|Submission|Decision).*\/100/); const terminal = await hud(page); await page.clock.runFor(1500); assert.deepEqual(await hud(page), terminal, 'Finished combat does not step or pay twice');
      await inspectFightStats('quick-result');
      assert(seen.has('clinch') && [...seen].some(s => s.startsWith('ground-')), 'Real inputs reach both clinch and ground');
      if (profile.width === 390) {
        await activate(button('Rematch'), profile); await choose(page.getByLabel('Your style', { exact: true }), 'striker', profile); await choose(page.getByLabel('Opponent style', { exact: true }), 'grappler', profile); await activate(button('Fight'), profile);
        let bottom = false;
        for (let turn = 0; turn < 160 && !bottom; turn++) { const state = await hud(page); if (state.phase !== 'fight') break;
          if (state.position === 'ground' && state.top === 'cpu') { bottom = true; coverage.add('ground-cpu'); await inspect('underneath'); break; }
          if (state.position === 'standing' && Math.abs(state.player.x - state.cpu.x) > 8.5) await hold(state.player.x < state.cpu.x ? 'right' : 'left', 250);
          else await page.clock.runFor(350);
        }
        assert(bottom, 'Real CPU grappling reaches the bottom position');
        let escaped = false;
        for (let turn = 0; turn < 80 && !escaped; turn++) { const state = await hud(page); if (state.phase !== 'fight') break;
          if (state.position === 'standing') { escaped = true; break; }
          if (state.player.stamina < 30) await page.clock.runFor(600); else await hold('escape', 250); }
        assert(escaped, 'An actual held escape returns the player to standing'); coverage.add('escape'); await inspect('escaped');
        await page.reload({ waitUntil: 'domcontentloaded' }); await root(page).waitFor(); assert.equal((await hud(page)).phase, 'setup', 'Refresh starts a fresh short fight');
      }
      if (profile.input === 'keyboard' || profile.width === 320) {
        if (profile.input === 'keyboard') {
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false, 'Desktop circuit uses full motion');
        }
        row.circuit = { motion: profile.input === 'keyboard' ? 'full' : 'reduced', runs: [], won: false };
        const completions = () => row.blockedWrites.flatMap(write => write.scores ?? []).filter(score => score.game === 'cage-clash');
        const storage = () => page.evaluate(() => ({ local: Object.entries(localStorage).sort(), session: Object.entries(sessionStorage).sort() }));
        await activate(button('Rematch'), profile);
        await choose(page.getByLabel('Mode', { exact: true }), 'circuit', profile);
        await choose(page.getByLabel('Your style', { exact: true }), 'grappler', profile);
        await inspect('circuit-setup');
        assert.equal(await page.getByLabel('Opponent style', { exact: true }).count(), 0, 'The circuit owns its opponent order');
        const setupStorage = await storage(), quitWrites = row.blockedWrites.length;
        await activate(button('Start circuit'), profile); await page.clock.runFor(112); await inspect('circuit-active');
        assert.equal((await hud(page)).circuitStage, '0');
        await activate(button('Pause'), profile); await inspect('circuit-paused');
        await activate(button('Leave circuit'), profile); await page.clock.runFor(250);
        assert.equal((await hud(page)).phase, 'setup'); assert.equal((await hud(page)).circuitStage, 'none');
        assert.equal(row.blockedWrites.length, quitWrites, 'An abandoned circuit sends no completion attempt');
        assert.deepEqual(await storage(), setupStorage, 'An unfinished circuit adds no local or session save');

        async function circuitRun(attempt, passive = false) {
          const before = completions().length, beforeWrites = row.blockedWrites.length, beforeStorage = await storage();
          const scores = [], run = { attempt, passive, fights: [] }; row.circuit.runs.push(run);
          await activate(button('Start circuit'), profile);
          for (let stage = 0; stage < 3; stage++) {
            const prefix = `circuit-${attempt}-${stage + 1}`, initial = await hud(page), positions = new Set(['standing']);
            assert.equal(initial.circuitStage, String(stage)); assert.equal(initial.circuitComplete, false); assert.equal(initial.phase, 'fight');
            assert.equal(initial.player.health, 100); assert.equal(initial.cpu.health, 100);
            assert.equal(initial.player.stamina, 100); assert.equal(initial.cpu.stamina, 100, 'Each opponent starts with fresh health and gas');
            for (const side of ['player', 'cpu']) for (const [key] of fightStats) assert.equal(initial[side][key], 0, `${prefix}: the next opponent starts with fresh ${side} ${key}`);
            assert.match(await page.locator('[data-cage-fighter="cpu"]').textContent(), new RegExp(['balanced', 'striker', 'grappler'][stage]), 'Actual opponents follow the displayed circuit order');
            assert(await page.locator('canvas').evaluate(el => el === document.activeElement), 'Starting or advancing the circuit focuses the arena');
            await inspect(`${prefix}-start`);
            for (let turn = 0; turn < 620; turn++) {
              const state = await hud(page);
              if (state.phase === 'finished') break;
              if (state.phase === 'break') { await inspect(`${prefix}-break-${turn}`); await activate(button('Next round'), profile); continue; }
              const position = state.position === 'ground' ? `ground-${state.top}` : state.position;
              if (!positions.has(position)) { positions.add(position); await inspect(`${prefix}-${position}`); }
              if (passive) await page.clock.runFor(1500); else await combatStep(state);
            }
            const result = await hud(page); assert.equal(result.phase, 'finished', 'Actual circuit combat reaches an earned result');
            assert(['player', 'cpu', 'draw'].includes(result.winner)); assert(Number.isInteger(result.fightScore) && result.fightScore >= 0 && result.fightScore <= 100);
            scores.push(result.fightScore); run.fights.push({ stage, winner: result.winner, score: result.fightScore });
            const complete = result.winner !== 'player' || stage === 2;
            assert.equal(result.circuitComplete, complete, 'Only three wins, a loss or a draw ends a circuit');
            await inspect(`${prefix}-${complete ? 'final' : 'between'}`);
            const frozen = await hud(page); await page.clock.runFor(1200); assert.deepEqual(await hud(page), frozen, 'A circuit result waits for explicit input');
            await inspectFightStats(`${prefix}-${complete ? 'final' : 'between'}`);
            if (complete) {
              const expected = Math.round(scores.reduce((sum, score) => sum + score, 0) / 3);
              assert.equal(result.circuitScore, expected, 'Circuit score averages three slots with unplayed fights worth zero');
              assert.match(result.text, new RegExp(`\\b${expected}/100`), 'The final score is visible');
              assert.equal(completions().length, before + 1, 'Each terminal circuit records exactly one completion');
              assert.equal(completions()[before].score, expected, 'The sole intercepted completion uses the visible circuit score');
              assert.equal(await button('Next opponent').count(), 0, 'A terminal circuit cannot advance');
              await page.clock.runFor(1200); assert.equal(completions().length, before + 1, 'Waiting on a result cannot duplicate the award');
              run.score = expected; run.won = stage === 2 && result.winner === 'player';
              await activate(button('New circuit'), profile); await page.clock.runFor(112);
              assert.equal((await hud(page)).phase, 'setup'); assert.equal((await hud(page)).circuitStage, 'none');
              assert.equal(await page.getByLabel('Mode', { exact: true }).inputValue(), 'circuit');
              await inspect(`${prefix}-new`); return run;
            }
            assert.equal(completions().length, before, 'Intermediate wins record no completion');
            assert.equal(row.blockedWrites.length, beforeWrites, 'Intermediate wins make no write attempt');
            assert.deepEqual(await storage(), beforeStorage, 'Intermediate circuit progress adds no local or session save');
            await activate(button('Next opponent'), profile);
          }
          assert.fail('A circuit must terminate after its third earned result');
        }
        for (let attempt = 1; attempt <= 4 && !row.circuit.won; attempt++) row.circuit.won = (await circuitRun(attempt)).won;
        assert(row.circuit.won, 'Actual controls win all three circuit fights within four fresh attempts');
        const stopped = await circuitRun('passive', true);
        assert.equal(stopped.won, false, 'Leaving controls idle lets the real CPU stop the circuit');
        assert(stopped.fights.length < 3 && stopped.fights.at(-1).winner !== 'player', 'A real early loss or draw leaves unplayed score slots at zero');
        row.circuit.passed = true;
        console.log(`cageClash1063 ${id}: complete winning circuit, actual early stop, fresh opponents, averaged single award and circuit screen geometry passed.`);
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('cage-unrelated')), 'untouched');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []); row.passed = true;
      console.log(`cageClash1063 ${id}: real controls, complete fight, release, help pause, pixels, geometry and isolated network passed.`);
    } catch (error) { row.error = String(error?.stack || error); console.error(`${id}: ${row.error}`); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`) }).catch(() => {}); throw error; }
    finally { await context.close(); report.coverage = [...coverage]; save(); }
  }
  assert.equal(report.cases.length, 4); assert.equal(report.controls.length, 9); assert(report.cases.every(row => row.passed), 'All four native profiles pass');
  for (const name of ['action-size', 'action-clipping', 'horizontal-overflow', 'keyboard-focus', 'stats-clipping', 'readiness-font', 'readiness-description', 'readiness-wrap', 'practice-feedback-font']) assert(report.controls.includes(name), `${name}: every prior and new native control fires`);
  assert(report.cases.every(row => row.fightStats.some(stats => stats.stage === 'quick-result')), 'All four profiles inspect earned Quick fight stats');
  for (const row of report.cases.filter(row => row.circuit)) assert.equal(row.fightStats.filter(stats => stats.stage.startsWith('circuit-')).length, row.circuit.runs.reduce((sum, run) => sum + run.fights.length, 0), 'Every earned Circuit result gets its own current fight recap');
  assert.equal(report.cases.filter(row => (row.id.startsWith('1280-keyboard') || row.id.startsWith('320-touch')) && row.practice?.passed && row.practice.drills.length === 4).length, 2, 'Keyboard and 320px touch retain all four practice drills');
  assert.equal(report.cases.filter(row => row.practice?.passed && row.practice.drills.length === 4).length, 4, 'All four original profiles complete actual drills and feedback');
  for (const row of report.cases) {
    assert(row.practice.isolation.localAndSessionHeld && row.practice.isolation.writesBefore === row.practice.isolation.writesAfter, 'All practice feedback journeys keep storage and outbound writes unchanged');
    for (const drill of ['striking', 'takedown', 'submission', 'escape']) {
      assert(row.practiceFeedback.some(sample => sample.stage === `practice-${drill}` && !sample.feedback.complete), `${row.id}: ${drill} starts with unearned feedback`);
      assert(row.practiceFeedback.some(sample => sample.stage === `practice-${drill}-complete` && sample.feedback.complete), `${row.id}: ${drill} earns completion feedback`);
    }
    assert(row.practiceFeedback.some(sample => sample.stage === 'practice-earned-clinch' && sample.feedback.progress === 'Takedowns 0/1 · In clinch'), 'Clinch remains an intermediate milestone');
    assert(row.practiceFeedback.some(sample => sample.stage === 'practice-submission-progress' && !sample.feedback.complete && sample.hud.player.submission > 0), 'Partial actual submission pressure stays incomplete');
  }
  assert(report.practiceFeedbackControl?.passed, 'The isolated feedback fault restores a clean real baseline');
  assert.equal(report.sources.length, 7); assert(report.sources.every(source => source.held), 'All native engine, input, renderer and new feedback source bytes remain held');
  assert.equal(report.cases.filter(row => row.strikeAnimations.length === 2 && row.strikeAnimations.every(animation => animation.frames.length === 3)).length, 2, '320px reduced motion and 390px full motion each capture three real Jab and Kick action windows');
  assert.equal(report.cases.filter(row => row.readiness?.passed && row.readiness.states.length === 7).length, 2, 'Both phone profiles prove actual descriptive readiness without changing practice writes or saves');
  assert.equal(report.cases.filter(row => row.groundAnimation?.passed && ['levels', 'effort', 'pressure'].every(kind => row.groundAnimation[kind].length === 3)).length, 2, '320px reduced motion and 390px full motion each prove three earned ground positions, grapple frames and actual submission pressure grips');
  assert.equal(report.cases.filter(row => row.circuit?.passed && row.circuit.won).length, 2, '320px touch and full-motion desktop complete winning circuits and real early stops');
  for (const needed of ['standing', 'clinch', 'ground-player', 'ground-cpu', 'submission', 'escape', 'result']) assert(coverage.has(needed), `Actual UI reaches ${needed}`);
  assert.equal(report.forwardedWrites, 0);
  console.log(`cageClash1063: four complete native fights, every earned fight recap, twelve actual strike frames, six earned ground positions, six grapple frames, six pressure grips, two native readiness journeys, four complete practice feedback journeys, nine proven controls, seven actual combat states, input lifecycle and zero forwarded writes passed.`);
} finally { if (browser) await browser.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); save(); }
