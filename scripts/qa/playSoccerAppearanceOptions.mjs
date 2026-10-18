/* Actual production creation, save and reload. Atlas below uses the real component
   with supplied appearances and is explicitly separate from the route journeys. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = process.cwd(), BASE = 'http://127.0.0.1:4173';
const OUT = path.join(process.env.APPEARANCE_OPTIONS_OUT, 'browser');
assert(process.env.CI && process.env.SIM_NETWORK === 'offline');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')]);
assert(!fs.existsSync(OUT)); fs.mkdirSync(OUT, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const HAIR = [['texturedcrop', 'Textured Crop'], ['sidefringe', 'Side Fringe'], ['twists', 'Twists'],
  ['shortlocs', 'Short Locs'], ['halfup', 'Half Up'], ['afropuff', 'Afro Puff']];
const BEARDS = [['circlebeard', 'Circle Beard'], ['handlebar', 'Handlebar'], ['ducktail', 'Ducktail'], ['muttonchops', 'Mutton Chops']];
const sourceFiles = ['src/lib/soccerCareerAppearance.ts', 'src/components/soccer-career/AppearanceBuilder.tsx', 'src/components/soccer-career/PlayerAvatar.tsx',
  'src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts'];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { scope: 'Actual built Soccer Career route, Chromium touch and keyboard, original bundled clubs, local browser save; component atlases separately labelled',
  sourceBefore: sourceHashes(), cases: [], atlases: [], qualified: false };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file));
  assert.equal(hash(body), row.sha256); return [row.url, { body, contentType: row.contentType }];
}));
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) for (let index = 0; index < HAIR.length; index++) {
    const [hair, hairLabel] = HAIR[index], [beard, beardLabel] = BEARDS[index % BEARDS.length];
    const touch = width === 390, id = `${width}-${hair}-${beard}`;
    const row = { id, hair, beard, touch, errors: [], consoleErrors: [], failedAssets: [], requests: [], events: [], screenshots: [], passed: false };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: touch, hasTouch: touch,
      reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:/soccer-career', value: '1' },
        { name: 'unrelated-career', value: 'keep-this' },
      ] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method())); return route.continue(); }
      row.requests.push({ method: request.method(), url: url.href, kind: request.resourceType() });
      if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href), headers: { 'access-control-allow-origin': '*' } });
      assert.notEqual(request.resourceType(), 'font', 'Actual fonts are in the checked cache');
      const script = request.resourceType() === 'script', css = request.resourceType() === 'stylesheet';
      return route.fulfill({ status: 200, contentType: script ? 'application/javascript' : css ? 'text/css' : 'application/json', body: script || css ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    await context.addInitScript(() => {
      window.__appearanceClicks = [];
      window.addEventListener('click', event => {
        const element = event.target instanceof Element ? event.target.closest('button') : null;
        if (element) window.__appearanceClicks.push({ label: element.textContent, trusted: event.isTrusted });
      }, true);
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.failedAssets.push({ url: request.url(), error: request.failure() }); });
    const responseChecks = [];
    page.on('response', response => {
      if (!response.url().startsWith(BASE + '/')) return;
      responseChecks.push((async () => {
        assert.equal(response.status(), 200, response.url());
        const pathname = new URL(response.url()).pathname;
        const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
        assert.equal(hash(await response.body()), hash(fs.readFileSync(path.join(ROOT, 'dist', decodeURIComponent(relative)))), 'Response matches completed dist');
      })().catch(error => { row.failedAssets.push({ url: response.url(), error: error.stack || String(error) }); }));
    });
    const activate = async button => { await button.scrollIntoViewIfNeeded(); if (touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
    const screenshot = async stage => { const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file); };
    try {
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('Enter your player name...').fill('Look Tester');
      for (const [at, option] of [[0, /England/], [1, /Striker/], [2, /2020/]]) {
        await activate(page.getByRole('combobox').nth(at));
        await activate(page.getByRole('option', { name: option }).first());
      }
      const editor = page.getByRole('heading', { name: 'Create Your Look', exact: true }).locator('xpath=../..');
      await activate(editor.getByRole('button', { name: /Hair$/ }));
      await activate(editor.getByRole('button', { name: hairLabel, exact: true }));
      await activate(editor.getByRole('button', { name: /Beard$/ }));
      await activate(editor.getByRole('button', { name: beardLabel, exact: true }));
      await activate(editor.getByRole('button', { name: /Skin$/ }));
      await page.evaluate(() => document.fonts.ready);
      const layout = await editor.evaluate(el => ({ width: innerWidth, document: document.documentElement.scrollWidth,
        left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, scroll: el.scrollWidth, client: el.clientWidth }));
      assert(layout.document <= layout.width + 2 && layout.left >= -1 && layout.right <= layout.width + 1 && layout.scroll <= layout.client + 2);
      row.layout = layout; row.previewSvg = await editor.getByRole('img', { name: 'Player avatar' }).evaluate(el => el.outerHTML);
      assert.equal(await page.evaluate(() => localStorage.getItem('soccerCareerSave')), null, 'Manual look edits do not pre-create a career');
      await editor.scrollIntoViewIfNeeded(); await screenshot('chosen');
      await activate(page.getByRole('button', { name: /Generate Starting Potential/ }));
      await page.getByRole('button', { name: /Roll again/ }).waitFor();
      const begin = page.getByRole('button', { name: /Begin Career/ });
      await begin.waitFor(); await activate(begin);
      await page.waitForFunction(() => localStorage.getItem('soccerCareerSave') !== null);
      row.beforeReload = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      const started = JSON.parse(row.beforeReload);
      const expected = { skinTone: 'olive', hairstyle: hair, hairColor: 'black', facialHair: beard,
        celebration: 'knee_slide', boots: 'vortex_strike', accessory: 'none' };
      assert.deepEqual(started.appearance, expected, 'Actual Begin writes the chosen seven-field appearance');
      assert.equal(started.playerName, 'Look Tester'); assert.equal(started.position, 'ST'); assert.equal(started.phase, 'youth');
      assert(started.seasons.length > 0, 'The real engine created the career');
      row.events = await page.evaluate(() => window.__appearanceClicks);
      for (const label of [hairLabel, beardLabel, 'Begin Career']) assert(row.events.some(event => event.trusted && event.label.includes(label)), `Trusted native ${label} action`);
      await screenshot('started');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Look Tester', { exact: true }).first().waitFor();
      assert.equal(await page.getByPlaceholder('Enter your player name...').count(), 0, 'Reload restored an existing career');
      row.afterReload = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      const reloaded = JSON.parse(row.afterReload);
      assert.deepEqual(reloaded.appearance, expected); assert.equal(reloaded.playerName, started.playerName);
      assert.equal(reloaded.position, started.position); assert.equal(reloaded.currentClub, started.currentClub);
      assert.deepEqual(reloaded.seasons, started.seasons);
      assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-career')), 'keep-this');
      await screenshot('reloaded'); await Promise.all(responseChecks);
      assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.failedAssets, []);
      row.passed = true;
      console.log(`${id}: actual native choices, Begin, seven saved fields and reload passed`);
    } catch (error) { row.error = error.stack || String(error); await screenshot('failure').catch(() => {}); }
    finally { save(); await context.close(); }
  }

  const compiled = path.join(OUT, 'avatar.cjs');
  const built = await build({ absWorkingDir: ROOT, stdin: { resolveDir: ROOT, sourcefile: 'appearance-atlas.tsx',
    contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Avatar from './src/components/soccer-career/PlayerAvatar'; export const svg=(look,size)=>renderToStaticMarkup(React.createElement(Avatar,{appearance:look,size,clubColor:'#10B981'}));` },
    outfile: compiled, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'error' });
  fs.writeFileSync(path.join(OUT, 'atlas-metafile.json'), JSON.stringify(built.metafile, null, 2));
  const { svg } = require(compiled);
  const atlas = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1 });
  for (const [skinTone, hairColor, accessory] of [['porcelain', 'black', 'none'], ['ebony', 'platinum', 'none'], ['ebony', 'black', 'headband'], ['porcelain', 'platinum', 'goggles']]) {
    const cards = [...HAIR.map(([id, label]) => ({ id, label, hairstyle: id, facialHair: 'none' })),
      ...BEARDS.map(([id, label]) => ({ id, label, hairstyle: 'bald', facialHair: id }))];
    const html = `<html><head><meta charset="utf-8"><style>body{margin:24px;background:#0a0a0b;color:#eee;font:16px Arial}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;color:#bbb}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.card{border:1px solid #444;border-radius:12px;padding:14px;background:#191919}.portraits{display:flex;gap:8px;align-items:end;height:112px}h2{font-size:15px;margin:0 0 10px}.sizes{margin:12px 0 0;font-size:12px;color:#bbb}</style></head><body><h1>Soccer Career new looks: component atlas</h1><p>Actual PlayerAvatar component with supplied values. ${skinTone} skin, ${hairColor} hair, ${accessory}. Sizes 104, 52 and 32 pixels. Production route journeys are saved separately.</p><div class="grid">${cards.map(card => `<section class="card"><h2>${card.label}</h2><div class="portraits">${[104, 52, 32].map(size => svg({ skinTone, hairColor, accessory, hairstyle: card.hairstyle, facialHair: card.facialHair, celebration: 'knee_slide', boots: 'vortex_strike' }, size)).join('')}</div><p class="sizes">104px preview, 52px and 32px headers</p></section>`).join('')}</div></body></html>`;
    const name = `component-atlas-${skinTone}-${hairColor}-${accessory}`;
    fs.writeFileSync(path.join(OUT, name + '.html'), html);
    await atlas.setContent(html); await atlas.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    report.atlases.push({ name, scope: 'actual component with supplied values', skinTone, hairColor, accessory, styles: cards.map(card => card.id), sizes: [104, 52, 32] }); save();
  }
  await atlas.close();
} finally {
  await browser.close(); report.sourceAfter = sourceHashes(); save();
}
assert.equal(report.cases.length, 12); assert(report.cases.every(row => row.passed), 'All actual route journeys must pass');
assert.equal(report.atlases.length, 4); assert.deepEqual(report.sourceAfter, report.sourceBefore);
report.qualified = true; save();
console.log('12 actual production creator/save/reload journeys passed; four actual-component atlases saved for visual review.');
