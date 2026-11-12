/* Font delivery only: real built HTML/CSS/WOFF2, app scripts and external transport blocked. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';
import { readBuiltFonts, assertLoadedFonts } from '../lib/builtFonts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.BUILT_FONT_REPORT || path.join(ROOT, 'built-font-artifacts/report.json'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const report = { complete: false, scope: 'Font delivery and decoding only, not app gameplay', before: readBuiltFonts(ROOT), cases: [], controls: [] };
const save = () => fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, log = '';
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Font server did not start: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Font server exited ${code}`)); });
    server.stderr.on('data', value => { log += value; });
    server.stdout.on('data', value => { log += value; if (String(value).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ headless: true });
  for (const routePath of ['/', '/soccer-career/']) for (const width of [390, 1440]) {
    for (const blockFonts of [false, true]) {
      const row = { route: routePath, width, blockFonts, blockedFonts: [], loaded: [], external: [] }, bodyChecks = [];
      const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin !== BASE) { row.external.push(url.href); return route.abort(); }
          assert.equal(request.method(), 'GET');
          if (blockFonts && url.pathname.endsWith('.woff2')) { row.blockedFonts.push(url.pathname); return route.abort(); }
          if (request.resourceType() === 'script') return route.abort();
          return route.continue();
        });
        await context.routeWebSocket('**/*', socket => socket.close());
        const page = await context.newPage();
        page.on('response', response => {
          const url = new URL(response.url());
          if (!url.pathname.endsWith('.woff2')) return;
          bodyChecks.push((async () => {
            assert.equal(url.origin, BASE); assert.equal(response.status(), 200);
            const file = 'dist' + url.pathname, expected = report.before.files[file]; assert(expected);
            const bytes = await response.body();
            assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
            row.loaded.push(file);
          })());
        });
        await page.goto(BASE + routePath, { waitUntil: 'load' });
        const load = () => page.evaluate(async () => {
          await document.fonts.ready; const rows = [];
          for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
            const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Contract review');
            rows.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
          }
          return rows;
        });
        if (blockFonts) {
          await assert.rejects(load, /NetworkError|network error/i);
          assert(row.blockedFonts.length > 0, 'Negative control blocks actual font requests');
          report.controls.push(row);
        } else {
          row.fonts = await load(); assertLoadedFonts(row.fonts);
          await Promise.all(bodyChecks); assert(row.loaded.length >= 2, 'Both local families have verified response bytes');
          assert.deepEqual(row.external, [], 'Built font path needs no external transport'); report.cases.push(row);
        }
        save();
      } finally { await context.close(); }
    }
  }
  report.after = readBuiltFonts(ROOT); assert.deepEqual(report.after, report.before);
  report.complete = true;
  console.log('Built fonts: four real-page profiles pass eight font loads each; four blocked-font controls fail as expected; source and built bytes held.');
} catch (error) { report.error = String(error); throw error; }
finally { save(); await browser?.close(); server.kill(); }
