/* Round 604: real drill inputs keep their scores, saves and career awards while
   players move. Everything builds in memory or a unique temporary directory.
   DRILL_MOTION_CONTROL=frozen|glove|target|reduced|points|bank|launch|obstruction|weak|clipped must fail.
   Each control changes an executed production expression, with an exact anchor. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boardPath = path.join(root, 'src/components/soccer-career/DrillBoard.tsx');
const control = process.env.DRILL_MOTION_CONTROL || '';
const kinds = process.env.DRILL_MOTION_KIND ? [process.env.DRILL_MOTION_KIND] : ['wallshot', 'tackle', 'gloves'];
assert(kinds.every(kind => ['wallshot', 'tackle', 'gloves'].includes(kind)), 'Unknown DRILL_MOTION_KIND');
const mutations = {
  frozen: ['const drawFlight = reducedMotion && result ? 1 : flight;', 'const drawFlight = 1;'],
  glove: ['glove={{ x: gx, y: gy }}', 'glove={{ x: mX(GLOVE_ORIGIN.x), y: mY(GLOVE_ORIGIN.y) }}'],
  target: ['cx={ball.x * VIEW_W}', 'cx={ball.x * VIEW_W + 8}'],
  reduced: ['const drawFlight = reducedMotion && result ? 1 : flight;', 'const drawFlight = flight;'],
  points: ['setScore(s => s + r.points);', 'setScore(s => s + r.points + 1);'],
  bank: ['onBank(kind, record.count);', 'onBank(kind, record.count - 3);'],
  launch: ['if (p <= wallAt) {', 'if (false) {'],
  obstruction: ['if (result.hitWall) {', 'if (false) {'],
  weak: ['if (short) return {', 'if (false) return {'],
  clipped: ['if (left > -1.5) men.push(left);', 'if (left > -0.98) men.push(left);'],
};
assert(!control || mutations[control], 'Unknown DRILL_MOTION_CONTROL');
let source = fs.readFileSync(boardPath, 'utf8');
if (control) {
  const [before, after] = mutations[control];
  assert.equal(source.split(before).length - 1, 1, `${control}: exact unique anchor`);
  source = source.replace(before, after);
  assert.notEqual(source, fs.readFileSync(boardPath, 'utf8'), `${control}: mutation fired`);
}
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-drill-motion-'));
const bundle = await build({
  entryPoints: [path.join(root, 'src/test/fixtures/drillMotionRig.tsx')],
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  alias: { '@': path.join(root, 'src') }, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'drill-under-test', setup(builder) {
    builder.onLoad({ filter: /DrillBoard\.tsx$/ }, () => ({ contents: source, loader: 'tsx', resolveDir: path.dirname(boardPath) }));
  } }],
});
const css = (await postcss([tailwind({
  config: path.join(root, 'tailwind.config.ts'),
  content: [{ raw: source, extension: 'tsx' }, { raw: fs.readFileSync(path.join(root, 'src/components/ui/button.tsx'), 'utf8'), extension: 'tsx' }],
})]).process(fs.readFileSync(path.join(root, 'src/index.css'), 'utf8'), { from: path.join(root, 'src/index.css') })).css;
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Soccer Career drill motion</title><link rel="stylesheet" href="drill-preview.css"></head><body><main style="max-width:560px;margin:0 auto"><div id="root"></div></main><script src="drill-preview.js"></script></body></html>';
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, 'drill-preview.js'), bundle.outputFiles[0].text);
fs.writeFileSync(path.join(output, 'drill-preview.css'), css);
const assets = new Map([
  ['/', [html, 'text/html']], ['/drill-preview.js', [bundle.outputFiles[0].text, 'text/javascript']], ['/drill-preview.css', [css, 'text/css']],
]);
const server = http.createServer((req, res) => {
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  res.writeHead(asset ? 200 : 404, { 'Content-Type': asset?.[1] || 'text/plain' });
  res.end(asset?.[0] || 'Not found');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const report = [];
const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 0.002, `${label}: ${actual} != ${expected}`);
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const call = (method, ...args) => page.evaluate(({ method, args }) => window.drillRig[method](...args), { method, args });
  await call('mount', 'wallshot');
  const wallCases = await call('wallCases');
  fs.writeFileSync(path.join(output, 'wall-fixtures.json'), JSON.stringify(wallCases, null, 2));
  for (const [tag, fixture] of Object.entries(wallCases)) for (const mode of ['full', 'reduced', 'switch']) {
    await call('mount', 'wallshot', mode === 'reduced');
    for (let i = 0; i < fixture.index; i++) {
      await call('resolve', i); await call('advance', 900); await call('button', 'Next');
    }
    const played = await call('resolve', fixture.index, false, fixture.input);
    assert.deepEqual(played.expected, fixture.result, `${tag}: real input replays the exact committed engine result`);
    let state = await call('state');
    if (mode !== 'reduced') {
      close(state.ball.x, played.ball.x, `${tag}: launch stays at the drawn boot x`);
      close(state.ball.y, played.ball.y, `${tag}: launch stays at the drawn boot y`);
      await call('advance', 315);
      state = await call('state');
      const sample = played.expected.path[Math.round(played.expected.path.length * 0.45)];
      close(state.ball.x, 180 + sample.x * 120, `${tag}: crosses the engine's actual wall sample`);
      close(state.drawTime, played.input.press + 0.58 - 0.28 * played.input.power, `${tag}: wall collision time stays unchanged`);
      assert(state.ball.y >= 148 && state.ball.y <= 166, `${tag}: collision is at the drawn wall depth`);
      if (tag === 'wall') {
        const meetsWall = await page.evaluate(() => {
          const ball = document.querySelector('[data-drill-ball]').getBoundingClientRect();
          const x = ball.x + ball.width / 2, y = ball.y + ball.height / 2;
          return [...document.querySelectorAll('[data-drill-player="wall"]')].some(node => {
            const box = node.getBoundingClientRect();
            return x >= box.left - ball.width / 2 && x <= box.right + ball.width / 2 && y >= box.top && y <= box.bottom;
          });
        });
        assert(meetsWall, 'Blocked ball meets an actual drawn wall player');
      }
      if (mode === 'switch') await call('reduced', true);
    }
    await call('advance', mode === 'reduced' ? 699 : 384);
    assert.equal((await call('state')).phase, mode === 'reduced' ? 'roundEnd' : 'flying', `${tag}: motion preference preserves the existing settlement deadline`);
    await call('advance', 1);
    const final = await call('state');
    if (tag === 'wall') assert(final.ball.y > 166, 'Blocked ball rebounds in front of the wall, never into the net');
    else if (tag === 'weak') assert(final.ball.y > 150, 'Weak ball lands short of the goal');
    else {
      close(final.ball.x, 180 + played.expected.x * 120, `${tag}: engine final x is preserved`);
      close(final.ball.y, 150 - played.expected.y * 116, `${tag}: engine final y is preserved`);
    }
    if (tag === 'save') {
      const hands = await page.locator('[data-drill-keeper] ellipse').evaluateAll(nodes => nodes.slice(-2).map(node => {
        const point = new DOMPoint(Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))).matrixTransform(node.getCTM());
        return { x: point.x, y: point.y };
      }));
      const ball = await page.locator('[data-drill-ball]').evaluate(node => {
        const point = new DOMPoint(Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))).matrixTransform(node.getCTM());
        return { x: point.x, y: point.y };
      });
      close((hands[0].x + hands[1].x) / 2, ball.x, 'Saved ball touches actual drawn hands x');
      close((hands[0].y + hands[1].y) / 2, ball.y, 'Saved ball touches actual drawn hands y');
    }
    assert.equal(final.keeper.catching, String(played.expected.saved), `${tag}: catch agrees with engine`);
    await call('advance', 200);
    const settled = await call('state');
    assert.equal(settled.phase, 'roundEnd', `${tag}: ordinary settlement completes`);
    assert(settled.text.includes(played.expected.verdict), `${tag}: verdict matches the committed result`);
    const saved = Object.values(settled.records).map(raw => JSON.parse(raw)).find(value => value.rounds === fixture.index + 1);
    const plans = await call('plans');
    close(saved.score, plans.slice(0, fixture.index).reduce((sum, plan) => sum + plan.result.points, 0) + played.expected.points, `${tag}: real score is unchanged`);
    assert.equal(saved.count, plans.slice(0, fixture.index).filter(plan => plan.result.won).length + Number(played.expected.won), `${tag}: real success count is unchanged`);
    assert.equal(settled.bankCalls, 0, `${tag}: animation never banks a reward`);
    if (mode === 'full' && !control) for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${tag}/${width}: no horizontal overflow`);
      await page.screenshot({ path: path.join(output, `wall-${tag}-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    report.push({ tag, mode, index: fixture.index, ball: final.ball, points: played.expected.points });
  }
  console.log('DRILL_PROJECTION| Six engine outcomes x full/reduced/midflight switch: boot, wall depth/time, contact, endpoint and settlement passed');
  if (process.env.DRILL_MOTION_PROJECTION_ONLY !== '1') {
  for (const kind of kinds) {
    let baseline;
    for (const mode of ['full', 'reduced', 'hidden', 'switch']) {
      await call('mount', kind, mode === 'reduced');
      const plans = await call('plans');
      const expected = {
        score: plans.reduce((sum, plan) => sum + plan.result.points, 0),
        count: plans.filter(plan => plan.result.won ?? plan.result.saved).length,
      };
      assert(expected.count >= 5, `${kind}: fixture really earns career growth`);
      for (let i = 0; i < 10; i++) {
        const played = await call('resolve', i);
        if (kind === 'tackle') {
          close(played.ball.x, played.target.x * 360, 'The visible ball is the engine hit target x');
          close(played.ball.y, played.target.y * 210, 'The visible ball is the engine hit target y');
        }
        if (mode === 'switch') await call('reduced', true);
        if (i === 0 && (mode === 'full' || mode === 'switch')) {
          await call('advance', 112);
          const early = await call('state');
          await call('advance', 320);
          const late = await call('state');
          if (mode === 'full') assert(early.pose !== late.pose, `${kind}: actual player geometry moves`);
          else assert(early.pose === late.pose, `${kind}: switching reduced motion holds a static final pose`);
          if (kind === 'gloves') {
            const glove = await page.locator('[data-drill-glove]').evaluate(el => ({ x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')) }));
            close(late.keeper.x, glove.x, 'Keeper body follows the actual glove x');
            close(late.keeper.y, glove.y, 'Keeper body follows the actual glove y');
          }
        }
        await call('advance', 900, mode !== 'hidden');
        const settled = await call('state');
        assert.equal(settled.phase, 'roundEnd', `${kind}/${mode}: settles with or without animation frames`);
        if (kind !== 'tackle') assert.equal(settled.keeper.catching, String(played.expected.saved), `${kind}: catches follow the committed save outcome`);
        await call('button', i === 9 ? 'See the session' : 'Next');
        if (mode === 'switch') await call('reduced', false);
      }
      const label = await page.locator('button').evaluateAll(nodes => nodes.map(el => el.textContent.trim()).find(text => text.startsWith('Bank the session:')));
      assert(label, `${kind}/${mode}: real bank button offered`);
      await call('button', label);
      const final = await call('state');
      assert.equal(final.bankCalls, 1, 'Exactly one career award');
      const saved = Object.values(final.records).map(raw => JSON.parse(raw)).find(value => value.rounds === 10);
      assert.equal(saved.score, expected.score, `${kind}/${mode}: engine score is unchanged`);
      assert.equal(saved.count, expected.count, `${kind}/${mode}: engine count is unchanged`);
      assert.equal(saved.banked, true, 'Finished run is banked');
      const stat = kind === 'wallshot' ? 'shooting' : kind === 'tackle' ? 'defending' : 'reflexes';
      assert.equal(final.career.statBoostNextSeason[stat], expected.count >= 8 ? 2 : 1, 'Real career award matches the recorded session');
      const outcome = { saved, career: final.career, bankCalls: final.bankCalls };
      if (!baseline) baseline = outcome; else assert.deepEqual(outcome, baseline, `${kind}/${mode}: same saved outcome and career`);
      report.push({ kind, mode, score: saved.score, count: saved.count, boost: final.career.statBoostNextSeason[stat] });
      console.log(`DRILL_MOTION| ${kind} ${mode}: ${saved.score} points, ${saved.count}/10, +${final.career.statBoostNextSeason[stat]}, identical saved result`);
    }
  }
  // A wrong-way dive stays a miss, with the ball at its real target and no catch.
  for (const reduced of [false, true]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await call('mount', 'gloves', reduced);
    const missed = await call('resolve', 0, true);
    assert.equal(missed.expected.saved, false, 'The adverse input really misses');
    await call('advance', 900);
    const final = await call('state');
    assert.equal(final.keeper.catching, 'false', 'A missed shot never draws a catch');
    close(final.ball.x, 180 + missed.setup.target.x * (240 / 7.32), 'Missed ball keeps its actual target x');
    close(final.ball.y, 150 - missed.setup.target.y * (116 / 2.44), 'Missed ball keeps its actual target y');
    const saved = Object.values(final.records).map(raw => JSON.parse(raw)).find(value => value.rounds === 1);
    assert.equal(saved.score, missed.expected.points, 'Missed shot keeps its engine score');
    assert.equal(saved.count, 0, 'Missed shot earns no save');
    await page.screenshot({ path: path.join(output, `gloves-390-miss-${reduced ? 'reduced' : 'full'}.png`), fullPage: true });
  }
  // Real component frames at three phone widths, including the new contact pose.
  for (const width of [320, 390, 430]) for (const kind of ['wallshot', 'tackle', 'gloves']) {
    await page.setViewportSize({ width, height: 844 });
    await call('mount', kind);
    await call('resolve', 0);
    await call('advance', 432);
    const bleed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(bleed <= 1, `${kind}/${width}: no horizontal overflow`);
    await page.screenshot({ path: path.join(output, `${kind}-${width}-action.png`), fullPage: true });
    await call('reduced', true);
    await call('advance', 900);
    await page.screenshot({ path: path.join(output, `${kind}-${width}-reduced.png`), fullPage: true });
  }
  assert.deepEqual(errors, [], 'No browser errors');
  }
  if (process.env.DRILL_MOTION_VIDEO === '1') {
    const context = await browser.newContext({ viewport: { width: 390, height: 520 }, recordVideo: { dir: output, size: { width: 390, height: 520 } } });
    const film = await context.newPage();
    await film.goto(`http://127.0.0.1:${server.address().port}/`);
    for (const tag of ['goal', 'save', 'wall', 'post', 'weak', 'wide']) {
      const fixture = wallCases[tag];
      await film.evaluate(async fixture => {
        window.drillRig.mount('wallshot');
        for (let i = 0; i < fixture.index; i++) {
          await window.drillRig.resolve(i); window.drillRig.advance(900); window.drillRig.button('Next');
        }
        await window.drillRig.resolve(fixture.index, false, fixture.input);
      }, fixture);
      for (let frame = 0; frame < 24; frame++) {
        await film.evaluate(() => window.drillRig.advance(32));
        await film.waitForTimeout(32);
      }
      await film.waitForTimeout(800);
    }
    const video = film.video();
    await context.close();
    fs.copyFileSync(await video.path(), path.join(output, 'drill-action-preview.webm'));
  }
  assert.deepEqual(errors, [], 'No browser errors');
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ control, report, errors }, null, 2));
  console.log(`simDrillMotion: PASS. Evidence: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
