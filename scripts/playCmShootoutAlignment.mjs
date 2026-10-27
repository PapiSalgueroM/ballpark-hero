/* Remote-only pixels of the real MatchReportCard with the two captured MatchScreen reports. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Run this component proof only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.CM_ALIGNMENT_ARTIFACTS || path.join(ROOT, 'cm-shootout-alignment-artifacts'));
const folder = path.join(OUT, 'browser');
fs.mkdirSync(folder, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = ['src/lib/clubManager.ts', 'src/components/club-manager/ShootoutKicks.tsx', 'src/components/club-manager/MatchReportCard.tsx', 'scripts/simMatchScreen.mjs'];
const held = () => Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { coverage: 'Client-mounted real MatchReportCard in a p-4 component frame, production CSS and fonts. No ClubManager route, hook, navigation or persistence coverage.',
  cases: [], controls: [], sourceBefore: held(), forwardedExternalRequests: 0 };
const save = () => fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
const fixtures = JSON.parse(fs.readFileSync(path.join(OUT, 'fixed/fixtures.json'), 'utf8'));
assert.equal(fixtures.rows.length, 2);
const fixtureHash = hash(fs.readFileSync(path.join(OUT, 'fixed/fixtures.json')));
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(OUT, 'font-cache'));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(hash(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const client = [
  "import React from 'react';", "import { createRoot } from 'react-dom/client';",
  "import { MatchReportCard } from '@/components/club-manager/MatchReportCard';",
  "const props = await fetch('/__alignment/fixture.json').then(response => response.json());",
  'window.__alignmentProps = props;',
  "createRoot(document.getElementById('alignment-root')).render(React.createElement(MatchReportCard, { ...props, onContinue: () => {} }));",
].join('\n');
const built = await build({ stdin: { contents: client, resolveDir: ROOT, sourcefile: 'alignment-client.jsx', loader: 'jsx' },
  bundle: true, write: false, platform: 'browser', format: 'esm', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' }, logLevel: 'error' });
const bundle = Buffer.from(built.outputFiles[0].contents);
fs.writeFileSync(path.join(folder, 'client.js'), bundle);
report.clientBundleSha256 = hash(bundle); report.fixtureSha256 = fixtureHash;
const template = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
const head = template.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1];
assert(head, 'Built production head exists');
const styles = head.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
const html = '<!doctype html><html class="dark"><head>' + styles + '</head><body><main class="p-4"><div id="alignment-root"></div></main><script type="module" src="/__alignment/client.js"></script></body></html>';
fs.writeFileSync(path.join(folder, 'frame.html'), html);
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); });
});
const BASE = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned host-like server did not start: ' + serverLog)), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error('Owned server exited ' + code + ': ' + serverLog)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
function centred(value) {
  assert.equal(value.textAlign, 'center', 'Shootout text is centred');
  assert(value.rows.every(row => row.clubAlign === 'center' && Math.abs(row.groupDelta) <= 0.75), 'Club and taker groups are centred in their own columns');
}
function semantic(value) {
  return value.rows.map(row => ({ text: row.text, taker: row.taker, kick: row.kick, side: row.side, result: row.result, tags: row.tags }));
}
async function measure(block) {
  return block.evaluate(el => {
    const box = value => { const r = value.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, height: r.height }; };
    return { textAlign: getComputedStyle(el).textAlign, box: box(el), clientWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      rows: [...el.querySelectorAll('[data-cm-pen-kick]')].map(li => {
        const middle = li.children[1], club = middle.children[0], group = middle.children[1], result = li.children[2];
        const children = [...group.children].map(box), bounds = box(group);
        const left = Math.min(...children.map(rect => rect.x)), right = Math.max(...children.map(rect => rect.right));
        return { text: li.textContent, kick: li.getAttribute('data-cm-pen-kick'), side: li.getAttribute('data-cm-pen-side'),
          result: li.getAttribute('data-cm-pen-result'), taker: li.querySelector('[data-cm-pen-taker]').textContent,
          tags: [...li.querySelectorAll('span[title]')].filter(span => span.textContent === 'MADE UP').map(span => span.title),
          clubAlign: getComputedStyle(club).textAlign, groupDelta: (left + right - bounds.x - bounds.right) / 2,
          middle: box(middle), resultBox: box(result), takerFont: parseFloat(getComputedStyle(group).fontSize),
          truncatedName: li.querySelector('[data-cm-pen-taker]').scrollWidth > li.querySelector('[data-cm-pen-taker]').clientWidth };
      }) };
  });
}
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const profile of [{ width: 320, height: 780 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    for (const fixture of fixtures.rows) {
      const id = profile.width + '-' + fixture.id, row = { id, ...profile, errors: [], assetErrors: [], blocked: [], requests: [], requestFailures: [], snapshots: [] };
      report.cases.push(row);
      const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 600, hasTouch: profile.width < 600,
        colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        row.requests.push({ method: request.method(), url: url.href }); save();
        if (!['GET', 'HEAD'].includes(request.method())) { row.blocked.push({ method: request.method(), url: url.href }); return route.fulfill({ status: 405, body: '' }); }
        if (url.origin === BASE) {
          if (url.pathname === '/__alignment/fixture.json') return route.fulfill({ json: fixture.props });
          if (url.pathname === '/__alignment/client.js') return route.fulfill({ contentType: 'text/javascript', body: bundle });
          if (url.pathname === '/__alignment/report') return route.fulfill({ contentType: 'text/html', body: html });
          return route.continue();
        }
        if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
        row.blocked.push({ method: request.method(), url: url.href });
        return route.fulfill({ status: 204, body: '' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => row.errors.push(String(error)));
      page.on('requestfailed', request => { row.requestFailures.push({ url: request.url(), failure: request.failure() }); save(); });
      page.on('console', message => { if (message.type() === 'error') row.errors.push(message.text()); });
      page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.status() + ' ' + response.url()); });
      try {
        await page.goto(BASE + '/__alignment/report', { waitUntil: 'domcontentloaded' });
        const block = page.locator('[data-cm-shootout]'); await block.waitFor();
        assert.equal(await block.count(), 1);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(['Inter', 'Space Grotesk'].map(font => document.fonts.load('400 16px "' + font + '"')));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        row.fonts = await page.evaluate(() => ['Inter', 'Space Grotesk'].map(name => ({ name,
          checked: document.fonts.check('400 16px "' + name + '"'),
          loaded: [...document.fonts].some(face => face.family.replaceAll('"', '').includes(name) && face.status === 'loaded') })));
        assert(row.fonts.every(font => font.checked && font.loaded), 'Production fonts actually loaded');
        assert.deepEqual(await page.evaluate(() => window.__alignmentProps), fixture.props, 'Every real report field reaches the actual component unchanged');
        row.normal = await measure(block); centred(row.normal);
        assert(row.normal.scrollWidth <= profile.width + 1 && row.normal.box.x >= 0 && row.normal.box.right <= profile.width + 1, 'Component fits the viewport');
        const kicks = fixture.props.report.shootout.kicks; assert.equal(row.normal.rows.length, kicks.length);
        row.normal.rows.forEach((item, index) => {
          const kick = kicks[index];
          assert.equal(item.kick, String(index + 1)); assert.equal(item.side, kick.side); assert.equal(item.result, kick.result);
          assert.equal(item.taker, kick.taker); assert.equal(item.tags.length, kick.gen ? 1 : 0);
          assert(item.text.includes(kick.mine + '-' + kick.theirs), 'Recorded count remains visible in its row');
          assert(item.middle.right <= item.resultBox.x + 0.75 && item.takerFont >= 10, 'Names and results remain readable in separate columns');
        });
        await block.scrollIntoViewIfNeeded();
        const image = id + '-report.png'; await page.screenshot({ path: path.join(folder, image), animations: 'disabled' }); row.snapshots.push(image);
        const originals = await block.evaluate(el => {
          const groups = [...el.querySelectorAll('[data-cm-pen-taker]')].map(span => span.parentElement);
          const classes = { root: el.className, groups: groups.map(group => group.className) };
          if (!el.classList.contains('text-center') || groups.some(group => !group.classList.contains('justify-center'))) throw new Error('Original-class control anchor missing');
          el.classList.replace('text-center', 'text-left'); groups.forEach(group => group.classList.remove('justify-center')); return classes;
        });
        row.originalClasses = await measure(block);
        assert.equal(row.originalClasses.textAlign, 'left', 'Whole original root class actually applies');
        assert(row.originalClasses.rows.some((item, index) => Math.abs(item.groupDelta - row.normal.rows[index].groupDelta) > 1), 'Original taker class actually moves real content');
        assert.throws(() => centred(row.originalClasses), /centred/);
        assert.deepEqual(semantic(row.originalClasses), semantic(row.normal), 'Old-class control changes no names, results, counts or generated tags');
        if (profile.width === 320 && fixture.id === 'everton') {
          const image = 'original-class-control-320-everton.png'; await page.screenshot({ path: path.join(folder, image), animations: 'disabled' }); row.snapshots.push(image);
        }
        await block.evaluate((el, original) => {
          el.className = original.root;
          [...el.querySelectorAll('[data-cm-pen-taker]')].forEach((span, index) => { span.parentElement.className = original.groups[index]; });
        }, originals);
        row.restored = await measure(block); centred(row.restored);
        assert.deepEqual(semantic(row.restored), semantic(row.normal), 'Restored component retains all content');
        assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []); assert.deepEqual(row.blocked, [], 'No unexpected service or write was requested');
        report.controls.push(id); row.passed = true;
      } catch (error) {
        row.error = String(error.stack || error);
        await page.screenshot({ path: path.join(folder, id + '-failure.png'), fullPage: true }).catch(() => {});
      } finally { await context.close(); save(); }
    }
  }
  assert.equal(report.cases.length, 6); assert(report.cases.every(row => row.passed), 'All six actual report layouts pass');
  assert.equal(report.controls.length, 6);
} finally {
  await browser?.close(); server.kill();
  report.sourceAfter = held(); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); save();
}
assert(report.sourceHeld, 'Browser proof leaves every product and original harness byte held');
console.log('CM shootout alignment pixels: 2 actual reports, 3 viewports, 6 effective original-class controls, source held.');
