/* Real built-game input and clock. No injected fight state or application test API. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.CAGE_CLASH_NATIVE_ARTIFACTS || path.join(ROOT, 'cage-clash-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true }); assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build before native combat');
const fontLinks = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(m => new URL(m[1]).href);
assert.equal(fontLinks.length, 1, 'Fonts use the actual template stylesheet');
const profiles = [
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false },
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true },
];
const report = { cases: [], controls: [], coverage: [], forwardedWrites: 0 };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
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
const root = page => page.locator('[data-cage-screen]');
async function hud(page) {
  return root(page).evaluate(el => {
    const f = side => { const node = el.querySelector(`[data-cage-fighter="${side}"]`); return node ? Object.fromEntries(['x', 'health', 'stamina', 'submission'].map(k => [k, Number(node.dataset[k])])) : null; };
    return { phase: el.dataset.cagePhase, tick: Number(el.dataset.cageTick), position: el.dataset.cagePosition, top: el.dataset.cageTop,
      paused: el.dataset.cagePaused === 'true', player: f('player'), cpu: f('cpu'), status: el.querySelector('[data-cage-status]')?.textContent, text: el.textContent };
  });
}
async function measure(page) {
  return page.evaluate(() => {
    const area = document.querySelector('[role="dialog"]') || document.querySelector('[data-cage-screen]');
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, text: el.textContent }; };
    const canvas = document.querySelector('[data-cage-screen] canvas');
    return { scrollY, scrollWidth: document.documentElement.scrollWidth, area: box(area), canvas: canvas ? box(canvas) : null,
      controls: [...area.querySelectorAll('button,select,input')].filter(el => el.getBoundingClientRect().height > 0).map(box) };
  });
}
function geometry(value, profile, stage) {
  assert(value.scrollWidth <= profile.width + 2, `${stage}: horizontal overflow`);
  assert(Math.abs(value.scrollY) <= 1, `${stage}: automatic page scroll`);
  const inside = r => r.x >= -2 && r.y >= -2 && r.right <= profile.width + 2 && r.bottom <= profile.height + 2;
  assert(inside(value.area), `${stage}: complete game region clipped ${JSON.stringify(value.area)}`);
  for (const box of value.controls) { assert(box.width >= 44 && box.height >= 44, `${stage}: action below44px ${JSON.stringify(box)}`); assert(inside(box), `${stage}: action clipped ${JSON.stringify(box)}`); }
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
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const id = `${profile.width}-${profile.input}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const row = { id, steps: [], screenshots: [], errors: [], assetErrors: [], blockedWrites: [], blockedDatabase: [], fonts: [], inputs: 0 };
    report.cases.push(row); const fontAssets = new Set();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.input === 'touch', isMobile: profile.input === 'touch',
      colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'dukb-theme', value: profile.theme }, { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:/cage-clash', value: '1' }, { name: 'cage-unrelated', value: 'untouched' }] }] } });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No local write transport'); return route.continue(); }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.blockedWrites.push({ method: request.method(), path: url.pathname });
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
    const inspect = async stage => {
      const value = await measure(page); geometry(value, profile, stage);
      const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      row.screenshots.push(file); row.steps.push({ stage, ...value, hud: await hud(page) }); return value;
    };
    try {
      await page.clock.install();
      await page.goto(`${BASE}/cage-clash`, { waitUntil: 'domcontentloaded' }); await root(page).waitFor();
      row.fonts = await page.evaluate(async () => { await document.fonts.ready; const faces = [...document.fonts].map(f => ({ family: f.family, status: f.status })); return faces; });
      assert(row.fonts.some(f => f.status === 'loaded'), 'Actual site fonts are loaded');
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), profile.theme === 'light');
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), profile.reduced);
      await inspect('setup'); assert.match(await root(page).innerText(), /Try this|Example/);
      if (report.controls.length === 0) {
        const target = button('Fight'), original = await target.getAttribute('style');
        const restore = () => target.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), original);
        await target.evaluate(el => { el.style.minHeight = '0'; el.style.height = '20px'; el.style.padding = '0'; });
        const small = await measure(page); assert(small.controls.some(r => r.height === 20)); assert.throws(() => geometry(small, profile, 'control-size'), /below44px/); await restore(); report.controls.push('action-size');
        await target.evaluate(el => { el.style.position = 'fixed'; el.style.top = '-90px'; }); const clipped = await measure(page);
        assert(clipped.controls.some(r => r.y === -90)); assert.throws(() => geometry(clipped, profile, 'control-clipping'), /action clipped/); await restore(); report.controls.push('action-clipping');
        const bodyStyle = await page.locator('body').getAttribute('style'); await page.locator('body').evaluate((el, width) => { el.style.minWidth = `${width + 80}px`; }, profile.width);
        const wide = await measure(page); assert(wide.scrollWidth > profile.width + 60); assert.throws(() => geometry(wide, profile, 'control-overflow'), /horizontal overflow/);
        await page.locator('body').evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), bodyStyle); report.controls.push('horizontal-overflow');
        await page.keyboard.press('Tab'); await target.focus(); await visibleFocus(target);
        await target.evaluate(el => { el.style.outline = 'none'; el.style.boxShadow = 'none'; }); await assert.rejects(() => visibleFocus(target), /visibly marked/); await restore(); report.controls.push('keyboard-focus');
        geometry(await measure(page), profile, 'controls-restored');
      }
      await choose(page.getByLabel('Your style', { exact: true }), 'grappler', profile);
      await choose(page.getByLabel('Opponent style', { exact: true }), 'striker', profile);
      await activate(button('Fight'), profile); await page.clock.runFor(112); await inspect('standing');
      const art = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, rendering: getComputedStyle(canvas).imageRendering,
        colors: new Set(Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).filter((_, i) => i % 4 !== 3)).size }));
      assert.equal(art.width, 320); assert.equal(art.height, 180); assert.equal(art.rendering, 'pixelated'); assert(art.colors > 8, 'Canvas contains actual rendered pixel art');
      await hold('left', 180, true); const released = await hud(page); await page.clock.runFor(220); const afterRelease = await hud(page);
      assert.equal(afterRelease.player.x, released.player.x, 'Release or touch cancel clears movement');
      await activate(button('How to play Cage Clash'), profile); await page.getByRole('dialog').waitFor(); await inspect('help');
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
        const other = await context.newPage(); await other.bringToFront(); await page.clock.runFor(250);
        assert((await hud(page)).paused, 'Losing actual browser focus pauses the fight'); await page.keyboard.up('ArrowLeft'); await other.close(); await page.bringToFront();
        await activate(button('Resume fight'), profile); const x = (await hud(page)).player.x; await page.clock.runFor(180);
        assert.equal((await hud(page)).player.x, x, 'Blur clears the held key before resume');
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
        let next;
        if (state.player.stamina < 26) { await page.clock.runFor(700); continue; }
        else if (state.position === 'standing') next = Math.abs(state.player.x - state.cpu.x) > 8.5 ? (state.player.x < state.cpu.x ? 'right' : 'left') : 'grapple';
        else if (state.position === 'clinch') next = 'grapple';
        else if (state.top === 'player') next = /Mount/.test(state.status) && !(await control('submit').isDisabled()) ? 'submit' : 'grapple';
        else next = /· Guard$/.test(state.status) ? 'grapple' : 'kick';
        await hold(next, 250);
      }
      assert.equal((await hud(page)).phase, 'finished', 'A whole real fight completes with actual controls');
      assert.match(row.result, /(?:KO|Submission|Decision).*\/100/); const terminal = await hud(page); await page.clock.runFor(1500); assert.deepEqual(await hud(page), terminal, 'Finished combat does not step or pay twice');
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
      assert.equal(await page.evaluate(() => localStorage.getItem('cage-unrelated')), 'untouched');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []); row.passed = true;
      console.log(`cageClash1063 ${id}: real controls, complete fight, release, help pause, pixels, geometry and isolated network passed.`);
    } catch (error) { row.error = String(error?.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`) }).catch(() => {}); }
    finally { await context.close(); report.coverage = [...coverage]; save(); }
  }
  assert.equal(report.cases.length, 4); assert.equal(report.controls.length, 4); assert(report.cases.every(row => row.passed), 'All four native profiles pass');
  for (const needed of ['standing', 'clinch', 'ground-player', 'ground-cpu', 'submission', 'escape', 'result']) assert(coverage.has(needed), `Actual UI reaches ${needed}`);
  assert.equal(report.forwardedWrites, 0);
  console.log(`cageClash1063: four complete native fights, seven actual combat states, input lifecycle and zero forwarded writes passed.`);
} finally { if (browser) await browser.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); save(); }
