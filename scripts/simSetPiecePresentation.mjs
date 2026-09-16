/* Actual React/SVG replay against committed Free Kick results. Temporary builds
   stay outside src. SET_PIECE_PRESENTATION_CONTROL=boot|arms|wall|endpoint|short|reduced|net|anatomy
   must fail its rendered geometry or preference check. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-setpiece-presentation-'));
const scenePath = path.join(root, 'src/components/tycoon/SetPieceScene.tsx');
const control = process.env.SET_PIECE_PRESENTATION_CONTROL || '';
let source = fs.readFileSync(scenePath, 'utf8');
const controls = {
  boot: ['x: lerp(337, 360, ease(strike))', 'x: lerp(337, 372, ease(strike))'],
  arms: ['reach={reach} />', 'reach={reach} /><Player kind="keeper" x={0} y={0} scale={1} color="#f5b64f" keeper />'],
  wall: ['const x = blocks ? lerp(startX, wallContact.x, react) : startX;', 'const x = startX + 120;'],
  endpoint: ['return { x: 360 + x * 206 * t, y: height,', 'return { x: 360 + x * 188 * t, y: height,'],
  short: ['stopsShort ? Math.min(t, .62) : t;', 'stopsShort ? t : t;'],
  reduced: ['if (preference.matches) stop();', 'if (false) stop();'],
  net: ['(progress - .83) / .17', '(progress - .4) / .17'],
  anatomy: ['M${side * 10}-43 Q', 'M${side * 60}-43 Q'],
};
assert(!control || controls[control], 'Unknown presentation control');
if (control) {
  const [before, after] = controls[control];
  assert.equal(source.split(before).length - 1, 1, `${control}: unique executed anchor`);
  source = source.replace(before, after);
  assert.notEqual(source, fs.readFileSync(scenePath, 'utf8'), `${control}: mutation fired`);
}
await build({ entryPoints: [path.join(root, 'src/lib/freeKick.ts')], outfile: path.join(output, 'engine.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
const engine = await import(pathToFileURL(path.join(output, 'engine.mjs')));
const fixtures = {};
const wanted = ['penalty-goal', 'penalty-save', 'penalty-post', 'penalty-short', 'penalty-wide', 'free-goal', 'free-save', 'free-post', 'free-short', 'free-wide', 'wall-left', 'wall-right'];
search: for (let seed = 1; seed < 80; seed++) for (const kick of engine.buildRun(seed)) {
  for (const x of [-1.12, -.99, -.7, -.3, 0, .3, .7, .99, 1.12]) for (const y of [.02, .2, .65, .95, 1.08]) for (const power of [.3, .55, .85]) {
    const aim = { x, y, power, curve: 0 };
    const result = engine.takeShot(aim, kick, engine.lehmer(seed * 7919));
    const short = !result.onTarget && !result.hitWall && !result.hitPost && Math.abs(result.x) < 1 && result.y > 0 && result.y < 1;
    const tag = result.hitWall ? `wall-${kick.keeperLean > 0 ? 'left' : 'right'}` : `${kick.wallSize ? 'free' : 'penalty'}-${result.scored ? 'goal' : result.saved ? 'save' : result.hitPost ? 'post' : short ? 'short' : 'wide'}`;
    if (tag.endsWith('-wide') && power < .34 + (kick.distance - 11) * .012) continue;
    if (!fixtures[tag]) fixtures[tag] = { tag, seed, aim, kick, result, span: engine.wallSpan(kick) };
    if (wanted.every(key => fixtures[key])) break search;
  }
}
assert(wanted.every(key => fixtures[key]), `Missing real fixtures: ${wanted.filter(key => !fixtures[key])}`);
fs.writeFileSync(path.join(output, 'fixtures.json'), JSON.stringify(fixtures, null, 2));
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { SetPieceScene } from ${JSON.stringify(scenePath)};
const fixtures = ${JSON.stringify(fixtures)};
const freeze = value => { Object.freeze(value); Object.values(value).forEach(child => { if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child); }); };
freeze(fixtures);
let clock = 0, reduce = false, seq = 0;
const frames = new Map(), listeners = new Set();
const realNow = performance.now.bind(performance), realFrame = requestAnimationFrame.bind(window);
Object.defineProperty(performance, 'now', { value: () => clock });
window.requestAnimationFrame = run => { frames.set(++seq, run); return seq; };
window.cancelAnimationFrame = id => frames.delete(id);
window.matchMedia = media => ({ get matches() { return reduce; }, media, addEventListener: (_, run) => listeners.add(run), removeEventListener: (_, run) => listeners.delete(run) });
Math.random = () => { throw new Error('Presentation consumed RNG'); };
const root = createRoot(document.getElementById('root'));
const point = (node, x = 0, y = 0) => { const p = new DOMPoint(x, y).matrixTransform(node.getCTM()); return { x: p.x, y: p.y }; };
window.sceneRig = {
 mount(tag, motion = 'auto', reduced = false) { flushSync(() => root.render(null)); clock = 0; frames.clear(); listeners.clear(); reduce = reduced; flushSync(() => root.render(<SetPieceScene {...fixtures[tag]} motion={motion} />)); },
 advance(ms) { clock += ms; flushSync(() => { const due = [...frames.values()]; frames.clear(); due.forEach(run => run(clock)); }); },
 reduced() { reduce = true; flushSync(() => listeners.forEach(run => run())); },
 skip() { flushSync(() => document.querySelector('button').click()); },
 play() { return new Promise(done => { const started = realNow(); const tick = () => { const next = Math.min(2100, realNow() - started); window.sceneRig.advance(next - clock); if (next < 2100) realFrame(tick); else done(); }; realFrame(tick); }); },
 state() {
  const svg = document.querySelector('svg'), ballNode = document.querySelector('[data-ball]');
  const boot = document.querySelector('[data-setpiece-player="striker"] [data-setpiece-boot]');
  const localBoot = boot.getPointAtLength(boot.getTotalLength() / 2);
  const ballBox = ballNode.getBoundingClientRect();
  return { motion: document.querySelector('section').dataset.motion, text: document.querySelector('[role="status"]').textContent, ball: point(ballNode), boot: point(boot, localBoot.x, localBoot.y),
   arms: document.querySelectorAll('[data-setpiece-player="keeper"] [data-setpiece-arm]').length,
   armReach: [...document.querySelectorAll('[data-setpiece-player="keeper"] [data-setpiece-arm]')].map(node => { const a = node.getPointAtLength(0), b = node.getPointAtLength(node.getTotalLength()); return Math.hypot(a.x - b.x, a.y - b.y); }),
   hands: [...document.querySelectorAll('[data-setpiece-player="keeper"] [data-setpiece-hand]')].map(node => point(node, Number(node.getAttribute('cx')), Number(node.getAttribute('cy')))),
   wall: [...document.querySelectorAll('[data-setpiece-player="wall"]')].map(node => { const b = node.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }; }),
   ballBox: { x: ballBox.x, y: ballBox.y, width: ballBox.width, height: ballBox.height },
   goal: { origin: point(svg, 360, 243), right: point(svg, 566, 106) },
   storage: { ...localStorage }, frames: frames.size, net: document.querySelectorAll('[data-net-contact]').length };
 }
};`;
const bundle = await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: root }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', outfile: 'preview.js', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent', plugins: [{ name: 'scene-under-test', setup(builder) { builder.onLoad({ filter: /SetPieceScene\.tsx$/ }, () => ({ contents: source, loader: 'tsx', resolveDir: path.dirname(scenePath) })); } }] });
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).text;
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;background:#102b3d;font-family:Arial,sans-serif}main{max-width:720px;margin:auto}</style><link rel="stylesheet" href="preview.css"></head><body><main id="root"></main><script src="preview.js"></script></body></html>';
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, 'preview.js'), js);
fs.writeFileSync(path.join(output, 'preview.css'), css);
if (process.env.SET_PIECE_PRESENTATION_BUILD_ONLY === '1') {
  console.log(`Set-piece source and ${wanted.length} engine fixtures compiled: ${output}`);
  process.exit(0);
}
const assets = new Map([['/', [html, 'text/html']], ['/preview.js', [js, 'text/javascript']], ['/preview.css', [css, 'text/css']]]);
const server = http.createServer((req, res) => { const item = assets.get(new URL(req.url, 'http://localhost').pathname); res.writeHead(item ? 200 : 404, { 'Content-Type': item?.[1] || 'text/plain' }); res.end(item?.[0] || 'Not found'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const close = (a, b, label) => assert(Math.abs(a - b) < .002, `${label}: ${a} != ${b}`);
const report = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const call = (method, ...args) => page.evaluate(({ method, args }) => window.sceneRig[method](...args), { method, args });
  for (const width of control ? [390] : [320, 390, 1440]) for (const tag of wanted) {
    await page.setViewportSize({ width, height: 844 });
    await call('mount', tag);
    const fixture = fixtures[tag];
    assert((await call('state')).text.includes(fixture.result.verdict), `${tag}: committed verdict is immediate`);
    await call('advance', 399);
    let state = await call('state');
    close(state.ball.x, state.boot.x, `${tag}: exact boot contact x`);
    close(state.ball.y, state.boot.y, `${tag}: exact boot contact y`);
    assert.equal(state.arms, 2, 'The keeper has exactly two arms');
    let maxArmReach = Math.max(...state.armReach);
    await call('advance', 604.8);
    state = await call('state');
    assert.equal(state.net, 0, `${tag}: net stays still before goal contact`);
    if (fixture.result.hitWall) {
      const b = state.ballBox, x = b.x + b.width / 2, y = b.y + b.height / 2;
      assert(state.wall.some(w => x >= w.x - b.width / 2 && x <= w.right + b.width / 2 && y >= w.y - b.height / 2 && y <= w.bottom + b.height / 2), `${tag}: blocked ball overlaps a visible defender`);
    }
    let at = 1003.8;
    for (const next of [1138.2, 1272.6, 1407, 1541.4, 1675.8, 1890]) {
      await call('advance', next - at); at = next;
      maxArmReach = Math.max(maxArmReach, ...(await call('state')).armReach);
    }
    assert.equal((await call('state')).net, Number(fixture.result.scored), `${tag}: only a goal moves the net after contact`);
    await call('advance', 210);
    state = await call('state');
    maxArmReach = Math.max(maxArmReach, ...state.armReach);
    assert(maxArmReach <= 26.001, `${tag}: shoulder-to-hand reach stays within the drawn arm length (${maxArmReach})`);
    assert.equal(state.motion, 'static');
    assert.equal(state.arms, 2, 'The catch replaces the original arm pose');
    if (fixture.result.saved) {
      assert.equal(state.hands.length, 2);
      close((state.hands[0].x + state.hands[1].x) / 2, state.ball.x, 'Saved ball meets gloves x');
      close((state.hands[0].y + state.hands[1].y) / 2, state.ball.y, 'Saved ball meets gloves y');
    }
    if (tag.endsWith('-short') || fixture.result.hitWall) assert(state.ball.y > state.goal.origin.y, `${tag}: blocked or short ball never enters goal depth`);
    else {
      close(state.ball.x, state.goal.origin.x + fixture.result.x * (state.goal.right.x - state.goal.origin.x), `${tag}: exact committed endpoint x`);
      close(state.ball.y, state.goal.origin.y + fixture.result.y * (state.goal.right.y - state.goal.origin.y), `${tag}: exact committed endpoint y`);
    }
    assert.deepEqual(state.storage, {}, 'Presentation writes no saved state');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: fits viewport`);
    if (!control) await page.screenshot({ path: path.join(output, `${tag}-${width}.png`), fullPage: true });
    report.push({ tag, width, ball: state.ball, arms: state.arms, maxArmReach });
  }
  for (const mode of ['static', 'reduced', 'switch', 'skip']) {
    await call('mount', 'penalty-save', mode === 'static' ? 'static' : 'auto', mode === 'reduced');
    if (mode === 'switch' || mode === 'skip') { await call('advance', 850); await call(mode === 'switch' ? 'reduced' : 'skip'); }
    const state = await call('state');
    assert.equal(state.motion, 'static', `${mode}: immediate final frame`);
    assert.equal(state.frames, 0, `${mode}: no animation frame remains queued`);
  }
  assert.deepEqual(errors, [], 'No mutation, random draw or runtime error');
  if (process.env.SET_PIECE_PRESENTATION_VIDEO === '1') {
    const context = await browser.newContext({ viewport: { width: 390, height: 460 }, recordVideo: { dir: output, size: { width: 390, height: 460 } } });
    const film = await context.newPage();
    film.on('pageerror', error => errors.push(error.message));
    await film.goto(`http://127.0.0.1:${server.address().port}/`);
    for (const tag of ['free-goal', 'penalty-save', 'wall-left', 'penalty-post', 'free-short', 'penalty-wide']) {
      await film.evaluate(tag => window.sceneRig.mount(tag), tag);
      await film.evaluate(() => window.sceneRig.play());
      await film.waitForTimeout(350);
    }
    const video = film.video();
    await context.close();
    fs.copyFileSync(await video.path(), path.join(output, 'set-piece-presentation.webm'));
  }
  assert.deepEqual(errors, [], 'No recording runtime errors');
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ control, report, errors }, null, 2));
  console.log(`simSetPiecePresentation: PASS. ${report.length} rendered cases. Evidence: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
