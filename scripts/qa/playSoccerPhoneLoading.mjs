import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';
const ROOT = process.cwd(), OUT = path.resolve(process.env.SC_PHONE_LOADING_OUT || 'phone-loading-artifacts');
const SOURCE = path.join(OUT, 'source'), WEB = path.join(OUT, 'web');
fs.mkdirSync(SOURCE, { recursive: true }); fs.mkdirSync(WEB, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
assert(process.env.SC_PHONE_LOADING_MANIFEST, 'Selected immutable product manifest is required');
const selected = JSON.parse(fs.readFileSync(process.env.SC_PHONE_LOADING_MANIFEST, 'utf8'));
const held = () => Object.fromEntries(selected.files.map(row => {
  const body = fs.readFileSync(path.join(ROOT, row.path)); assert.equal(sha(body), row.sha256, row.path + ': selected product pin');
  return [row.path, sha(body)];
}));
const report = { scope: 'Actual selected page plus one PhoneSurface observer export. Actual default lazy, loading fallback, wrapper and unchanged PhonePanel. Isolated boundary, no full route/hook/persistence/action-authority claim.', sourceBefore: held(), rows: [] };
const save = complete => fs.writeFileSync(path.join(OUT, 'outcomes.json'), JSON.stringify({ ...report, complete }, null, 2));
const pagePath = 'src/pages/SoccerCareer.tsx', original = fs.readFileSync(path.join(ROOT, pagePath), 'utf8');
assert.equal(original.split('function PhoneSurface(').length - 1, 1);
const suffix = '\nexport { PhoneSurface };\n', observer = path.join(SOURCE, 'observed-page.tsx');
const healthy = original + suffix;
const lazyFrom = 'const PhonePanel = lazy(() => import("@/components/soccer-career/PhonePanel"));';
const eagerTo = 'import PhonePanel from "@/components/soccer-career/PhonePanel";';
const focusFrom = 'if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });';
const focusTo = 'if (opener.current?.isConnected) void 0;';
const drawTo = 'const PhonePanel = lazy(() => import("@/components/soccer-career/PhonePanel").then(module => { Math.random(); return module; }));';
for (const anchor of [lazyFrom, focusFrom]) assert.equal(original.split(anchor).length - 1, 1);
report.sourceCopy = { pagePath, originalSha256: sha(original), observerSuffix: suffix, healthyObserverSha256: sha(healthy), copy: observer };
const phonePath = 'src/components/soccer-career/PhonePanel.tsx';
const phoneBody = fs.readFileSync(path.join(ROOT, phonePath));
assert.equal(sha(phoneBody), '71ca1bae1592517c486fe48fd3c5a3b26cd3efe749d3b0cf2a66177cb90ac6e6');
report.heldPhonePanel = { path: phonePath, sha256: sha(phoneBody) };
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(row => row.id === 'ere')?.state;
assert(fixture);
const entry = path.join(SOURCE, 'app.tsx');
fs.writeFileSync(entry, [
  "import React, {useEffect,useRef,useState} from 'react';",
  "import {createRoot} from 'react-dom/client';",
  'import {PhoneSurface} from ' + JSON.stringify(observer) + ';',
  "function App(){const [career]=useState(()=>structuredClone(window.__LOYALTY_FIXTURE__)),[shown,show]=useState(false),calls=useRef([]);useEffect(()=>{window.__LOADING_STATE__=()=>({career,calls:structuredClone(calls.current),draws:window.__PHONE_IMPORT_DRAWS__});},[career]);return <main className='mx-auto max-w-md space-y-3 p-3'><h1 className='text-xl font-bold'>Phone loading qualification</h1><div style={{height:320}} aria-hidden='true'/><button data-phone-opener className='min-h-11 min-w-11 rounded-lg border p-3' onClick={()=>show(true)}>Open actual phone</button>{shown&&<PhoneSurface career={career} onAnswer={(id,index)=>calls.current.push(['answer',id,index])} onMoney={action=>calls.current.push(['money',action])} onBuyItem={id=>calls.current.push(['buy',id])} onClose={()=>show(false)}/>}<div style={{height:900}} aria-hidden='true'/></main>;}",
  "createRoot(document.getElementById('root')).render(<App/>);",
].join('\n'));
report.entrySha256 = sha(fs.readFileSync(entry));
const fonts = new Map(JSON.parse(fs.readFileSync(process.env.SC_LOYALTY_FONT_MANIFEST, 'utf8')).map(row => {
  const body = Buffer.from(fs.readFileSync(path.join(path.dirname(process.env.SC_LOYALTY_FONT_MANIFEST), row.file)));
  assert.equal(sha(body), row.sha256); return [row.url, { body, contentType: row.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fontTags = [...template.matchAll(/<link\s+href="https:\/\/fonts\.googleapis\.com\/[^\"]+"\s+rel="stylesheet"[^>]*>/g)].map(row => row[0]).join('');
const files = new Map(), assets = path.join(ROOT, 'dist/assets');
const css = fs.readdirSync(assets).filter(file => file.endsWith('.css'));
assert(css.length > 0);
for (const file of css) files.set('/assets/' + file, { body: Buffer.from(fs.readFileSync(path.join(assets, file))), contentType: 'text/css' });
const server = createServer((request, response) => {
  const file = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!file) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', file.contentType); response.end(file.body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const snapshot = page => page.evaluate(() => window.__LOADING_STATE__());
const focus = page => page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent, scrollY }));
async function settleEntryAnimations(page, label) {
  const result = await page.evaluate(async () => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { status: 'refused', reason: 'No actual dialog mounted', before: null, after: null };
    const animationRoot = dialog.parentElement ?? dialog;
    const active = () => animationRoot.getAnimations({ subtree: true }).filter(animation => {
      const end = animation.effect?.getComputedTiming().endTime;
      return typeof end === 'number' && Number.isFinite(end) && (animation.playState === 'running' || animation.pending);
    });
    const inspect = () => {
      const rect = dialog.getBoundingClientRect(), style = getComputedStyle(dialog);
      return {
        connected: dialog.isConnected, animationOwner: { tag: animationRoot.tagName, className: animationRoot.className, transform: getComputedStyle(animationRoot).transform, opacity: getComputedStyle(animationRoot).opacity },
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
        transform: style.transform, width: style.width, height: style.height,
        animationName: style.animationName, animationDuration: style.animationDuration,
        animations: animationRoot.getAnimations({ subtree: true }).map(animation => {
          const timing = animation.effect?.getComputedTiming();
          return { name: animation.animationName ?? animation.transitionProperty ?? null,
            playState: animation.playState, pending: animation.pending, currentTime: animation.currentTime,
            endTime: typeof timing?.endTime === 'number' && Number.isFinite(timing.endTime) ? timing.endTime : String(timing?.endTime),
            progress: timing?.progress ?? null };
        }),
        targets: [...dialog.querySelectorAll('button')].map(element => {
          const box = element.getBoundingClientRect(), css = getComputedStyle(element);
          return { label: element.getAttribute('aria-label') || element.textContent,
            left: box.left, top: box.top, width: box.width, height: box.height,
            cssWidth: css.width, cssHeight: css.height, transform: css.transform };
        }),
        state: typeof window.__LOADING_STATE__ === 'function' ? window.__LOADING_STATE__() : null,
      };
    };
    const before = inspect(), started = performance.now();
    let timedOut = false, timer;
    const work = async () => {
      let previous, stableFrames = 0;
      while (!timedOut) {
        if (!dialog.isConnected || !animationRoot.isConnected || document.querySelector('[role="dialog"]') !== dialog) throw Error('Actual dialog changed while settling');
        const animations = active();
        if (animations.length) {
          await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)));
          previous = undefined; stableFrames = 0; continue;
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (active().length) { previous = undefined; stableFrames = 0; continue; }
        const observed = inspect(), signature = JSON.stringify({ rect: observed.rect, transform: observed.transform, targets: observed.targets });
        stableFrames = signature === previous ? stableFrames + 1 : 0; previous = signature;
        if (stableFrames >= 2) return observed;
      }
      throw Error('Entry animation deadline elapsed');
    };
    try {
      const after = await Promise.race([work(), new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          const error = Error('Finite entry animations did not settle within2000ms'); error.name = 'TimeoutError'; reject(error);
        }, 2000);
      })]);
      return { status: 'settled', before, after, elapsedMs: performance.now() - started };
    } catch (error) {
      return { status: 'rejected', before, after: inspect(), elapsedMs: performance.now() - started,
        reason: { name: error.name, message: error.message } };
    } finally { timedOut = true; clearTimeout(timer); }
  });
  fs.writeFileSync(path.join(OUT, label + '.entry-animations.json'), JSON.stringify(result, null, 2));
  assert.equal(result.status, 'settled', label + ': actual finite entry animations completed and geometry stabilized');
  assert.deepEqual(result.after.state, result.before.state, label + ': entry observation changes no career state');
  return result;
}
async function retain(row, page, label) {
  row.lastURL = page.url(); row.captureErrors ||= [];
  try { row.lastState = await snapshot(page); } catch (error) { row.captureErrors.push('state: ' + error.message); }
  try { row.lastFocus = await focus(page); } catch (error) { row.captureErrors.push('focus: ' + error.message); }
  try { const body = await page.content(); row.html = label + '.html'; row.htmlSha256 = sha(body); fs.writeFileSync(path.join(OUT, row.html), body); } catch (error) { row.captureErrors.push('html: ' + error.message); }
  save(false);
  try { row.image = label + '.png'; await page.screenshot({ path: path.join(OUT, row.image), fullPage: false }); } catch (error) { row.captureErrors.push('png: ' + error.message); }
  save(false);
}
async function compile(variant, body) {
  fs.writeFileSync(observer, body);
  const directory = path.join(WEB, variant);
  const compiled = await build({ entryPoints: { app: entry }, outdir: directory, bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')], alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{}' }, metafile: true, logLevel: 'silent' });
  fs.writeFileSync(path.join(OUT, variant + '.bundle-inputs.json'), JSON.stringify(compiled.metafile, null, 2));
  const outputs = Object.entries(compiled.metafile.outputs), phoneFile = path.join(ROOT, 'src/components/soccer-career/PhonePanel.tsx');
  const phoneOutputs = outputs.filter(([, output]) => Object.keys(output.inputs).some(input => path.resolve(ROOT, input) === phoneFile));
  assert.equal(phoneOutputs.length, 1, 'Actual emitted phone module has one owner output');
  let phoneHref;
  const outputHashes = [];
  for (const [file] of outputs) {
    const absolute = path.resolve(ROOT, file), relative = path.relative(directory, absolute).split(path.sep).join('/');
    assert(!relative.startsWith('../'));
    const href = '/' + variant + '/' + relative, bytes = Buffer.from(fs.readFileSync(absolute));
    files.set(href, { body: bytes, contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript' });
    outputHashes.push({ href, bytes: bytes.length, sha256: sha(bytes) });
    if (file === phoneOutputs[0][0]) phoneHref = href;
  }
  const html = '<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1">' + fontTags + css.map(file => '<link rel="stylesheet" href="/assets/' + file + '">').join('') + '</head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/' + variant + '/app.js"></script></body></html>';
  files.set('/' + variant + '/', { body: Buffer.from(html), contentType: 'text/html' });
  return { phoneHref, observerSha256: sha(fs.readFileSync(observer)), outputHashes };
}
async function exactFocus(page, row, name) {
  row[name] = { immediate: await focus(page) }; save(false);
  try { await page.waitForFunction(() => { const opener = document.querySelector('[data-phone-opener]'); return !!opener && document.activeElement === opener; }, null, { timeout: 2000 }); }
  finally { row[name].eventual = await focus(page); save(false); }
  assert(await page.locator('[data-phone-opener]').evaluate(element => document.activeElement === element));
  assert.equal(await page.evaluate(() => scrollY), row.windowTop);
}
async function readonly(page, row, name) {
  const state = await snapshot(page); row[name] = state; save(false);
  assert.deepEqual(state.career, row.initial.career); assert.deepEqual(state.calls, []);
}
async function loadedRound(page, row, label) {
  const opener = page.locator('[data-phone-opener]'); await opener.focus();
  const requests = row.phoneRequests.length;
  await opener.click(); const panel = page.getByRole('dialog', { name: 'Your phone', exact: true }); await panel.waitFor();
  await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="Your phone"]')?.contains(document.activeElement));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await panel.evaluate(element => element.contains(document.activeElement)), 'Loaded phone retains focus inside itself');
  row[label + 'CachedRequests'] = { before: requests, after: row.phoneRequests.length }; save(false);
  assert.equal(row.phoneRequests.length, requests, 'Cached reopen sends no second phone chunk request');
  row[label + 'EntryAnimations'] = await settleEntryAnimations(page, row.variant + '-' + label + '-open'); save(false);
  await readonly(page, row, label + 'Open'); await retain(row, page, row.variant + '-' + label + '-open');
  await panel.getByRole('button', { name: 'Put phone away', exact: true }).click(); await panel.waitFor({ state: 'hidden' });
  await exactFocus(page, row, label + 'Close'); await readonly(page, row, label + 'Closed');
}
async function runPhone(variant, width, mode = 'cancel', mutation) {
  const body = mutation ? healthy.replace(mutation.from, mutation.to) : healthy;
  if (mutation) assert.notEqual(sha(body), sha(healthy));
  const row = { variant, width, mode, status: 'STARTED', expectedOwnedFault: !!mutation, mutation, blocked: [], errors: [], requests: [], phoneRequests: [] };
  report.rows.push(row); save(false);
  let context, page, hold = false, release = () => {};
  try {
    Object.assign(row, await compile(variant, body)); assert.equal(row.observerSha256, sha(body));
    context = await browser.newContext({ viewport: { width, height: width === 320 ? 780 : 900 }, serviceWorkers: 'block' });
    const gate = new Promise(resolve => { release = resolve; });
    await context.route('**/*', async route => {
      const url = route.request().url(); row.requests.push(url);
      if (url.startsWith(base + '/')) {
        if (url === base + row.phoneHref) { row.phoneRequests.push({ url, held: hold }); if (hold) await gate; }
        return route.continue();
      }
      const cached = fonts.get(url); if (cached) return route.fulfill(cached);
      row.blocked.push(new URL(url).origin); return route.abort();
    });
    await context.addInitScript(value => { window.__LOYALTY_FIXTURE__ = value; window.__PHONE_IMPORT_DRAWS__ = 0; let seed = 782611; Math.random = () => { window.__PHONE_IMPORT_DRAWS__++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }, fixture);
    page = await context.newPage(); page.on('pageerror', error => row.errors.push(error.message));
    await page.goto(base + '/' + variant + '/'); await page.waitForFunction(() => typeof window.__LOADING_STATE__ === 'function');
    await page.evaluate(() => document.fonts.ready); await page.evaluate(() => scrollTo(0, 180));
    const opener = page.locator('[data-phone-opener]'); await opener.focus(); row.windowTop = await page.evaluate(() => scrollY);
    row.initial = await snapshot(page); row.initialPhoneRequests = row.phoneRequests.length; save(false);
    let absenceFailure;
    try { assert.equal(row.initialPhoneRequests, 0, 'Phone chunk absent before actual PhoneSurface mount'); } catch (error) { absenceFailure = error; }
    if (mutation?.name === 'eager-phone') {
      assert(absenceFailure && absenceFailure.name === 'AssertionError' && absenceFailure.message.includes('Phone chunk absent'));
      row.expectedRejection = { name: absenceFailure.name, message: absenceFailure.message };
      await loadedRound(page, row, 'independentLoaded'); row.independentLoadedPassed = true;
    } else {
      assert.equal(absenceFailure, undefined); hold = true;
      await opener.click(); const waiting = page.getByRole('dialog', { name: 'Opening your phone', exact: true }); await waiting.waitFor();
      await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="Opening your phone"]')?.contains(document.activeElement));
      row.pending = await snapshot(page); row.heldRequestCount = row.phoneRequests.filter(request => request.held).length; save(false);
      assert.equal(row.heldRequestCount, 1); assert.deepEqual(row.pending.career, row.initial.career); assert.deepEqual(row.pending.calls, []);
      const close = waiting.getByRole('button', { name: 'Close', exact: true });
      row.closeTarget = await close.evaluate(element => { const box = element.getBoundingClientRect(); return { width: box.width, height: box.height }; }); save(false);
      assert(row.closeTarget.width >= 43.5 && row.closeTarget.height >= 43.5);
      await page.keyboard.press('Tab'); assert(await close.evaluate(element => document.activeElement === element));
      await page.keyboard.press('Shift+Tab'); assert(await close.evaluate(element => document.activeElement === element));
      await retain(row, page, variant + '-pending');
      if (mode === 'cancel') {
        await close.click(); await waiting.waitFor({ state: 'hidden' });
        let focusFailure; try { await exactFocus(page, row, 'pendingClose'); } catch (error) { focusFailure = error; }
        if (mutation?.name === 'missing-wrapper-focus') {
          assert.equal(focusFailure?.name, 'TimeoutError'); row.expectedRejection = { name: focusFailure.name, message: focusFailure.message };
        } else assert.equal(focusFailure, undefined);
        await readonly(page, row, 'afterPendingClose');
        const beforeDraws = (await snapshot(page)).draws;
        const downloaded = page.waitForResponse(response => response.url() === base + row.phoneHref);
        release(); hold = false; const response = await downloaded; await response.finished();
        row.closedModuleEvaluated = await page.evaluate(href => import(href).then(() => true), row.phoneHref);
        assert.equal(row.closedModuleEvaluated, true);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        row.closedImport = { beforeDraws, afterDraws: (await snapshot(page)).draws, panelCount: await page.getByRole('dialog', { name: 'Your phone', exact: true }).count() }; save(false);
        let drawFailure; try { assert.equal(row.closedImport.afterDraws, beforeDraws, 'Importing the closed phone adds no global random draw'); } catch (error) { drawFailure = error; }
        if (mutation?.name === 'module-global-draw') {
          assert(drawFailure && drawFailure.name === 'AssertionError' && drawFailure.message.includes('no global random draw'));
          assert.equal(row.closedImport.afterDraws, beforeDraws + 1); row.expectedRejection = { name: drawFailure.name, message: drawFailure.message };
        } else assert.equal(drawFailure, undefined);
        assert.equal(row.closedImport.panelCount, 0, 'Resolved cancelled import does not open a late phone');
        if (mutation?.name !== 'missing-wrapper-focus') await exactFocus(page, row, 'afterCancelledImport');
        await loadedRound(page, row, 'cachedLoaded'); row.independentLoadedPassed = true;
      } else {
        release(); hold = false;
        const panel = page.getByRole('dialog', { name: 'Your phone', exact: true }); await panel.waitFor();
        await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="Your phone"]')?.contains(document.activeElement));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        row.loadedHandoffFocus = await focus(page); save(false);
        assert(await panel.evaluate(element => element.contains(document.activeElement)), 'Fallback handoff does not restore focus behind open phone');
        row.handoffEntryAnimations = await settleEntryAnimations(page, variant + '-loaded-handoff'); save(false);
        await readonly(page, row, 'afterHandoff'); await retain(row, page, variant + '-loaded-handoff');
        await panel.getByRole('button', { name: 'Put phone away', exact: true }).click(); await panel.waitFor({ state: 'hidden' });
        await exactFocus(page, row, 'loadedClose'); await readonly(page, row, 'afterLoadedClose');
        await loadedRound(page, row, 'cachedLoaded'); row.independentLoadedPassed = true;
      }
    }
    assert.deepEqual(row.blocked, []); assert.deepEqual(row.errors, []);
    if (mutation) assert(row.expectedRejection);
    row.status = mutation ? 'EXPECTED_REJECTION' : 'PASSED'; save(false);
  } catch (error) {
    row.status = 'FAILED'; row.failure = { name: error.name, message: error.message, stack: error.stack };
    if (page) await retain(row, page, variant + '-failure'); else row.captureErrors = ['Page was not created']; save(false); throw error;
  } finally { release(); await context?.close(); }
}
try {
  await runPhone('normal320-pending-close', 320); await runPhone('normal1280-loaded-handoff', 1280, 'handoff');
  await runPhone('owned-eager-phone', 320, 'cancel', { name: 'eager-phone', from: lazyFrom, to: eagerTo });
  await runPhone('restored-eager-phone', 320); assert.equal(sha(fs.readFileSync(observer)), sha(healthy));
  await runPhone('owned-missing-wrapper-focus', 320, 'cancel', { name: 'missing-wrapper-focus', from: focusFrom, to: focusTo });
  await runPhone('restored-wrapper-focus', 320); assert.equal(sha(fs.readFileSync(observer)), sha(healthy));
  await runPhone('owned-module-global-draw', 320, 'cancel', { name: 'module-global-draw', from: lazyFrom, to: drawTo });
  await runPhone('restored-module-global-draw', 320); assert.equal(sha(fs.readFileSync(observer)), sha(healthy));
  assert.equal(report.rows.length, 8); assert.equal(report.rows.filter(row => row.status === 'EXPECTED_REJECTION').length, 3); assert.equal(report.rows.filter(row => row.status === 'PASSED').length, 5);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, phonePath))), report.heldPhonePanel.sha256);
  report.sourceAfter = held(); assert.deepEqual(report.sourceAfter, report.sourceBefore); save(true);
  console.log('Actual PhoneSurface loading:2normal widths320/1280,3physical pagecopy faults and3samecopy restorations.');
  console.log('First held chunk pendingClose, no late panel,44pxClose andTab trap, cancelled import adds no globaldraw.');
  console.log('Actual fallback handoff keeps focus inside loaded phone; cached reopen/loadedclose restores originalopener andscroll.');
  console.log('All actual career data/actioncounts andselectedsources/PhonePanelbody held; no fullroute/hook/persistenceclaim.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }