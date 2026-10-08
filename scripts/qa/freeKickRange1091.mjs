/* Remote finite consumer proof, not a full route, Tycoon match or campaign. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert(process.env.CI, 'Execute only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART = path.join(ROOT, 'free-kick-range-artifacts'), OUT = path.join(ART, 'native'), CACHE = path.join(ART, 'asset-cache');
const BASE = '8fe82a4dc1346f7d5b8072f387f3acb34bbaa3c8', NOW = Date.parse('2026-10-07T12:00:00Z');
const ENGINE = 'src/lib/freeKick.ts', SELF = 'scripts/qa/freeKickRange1091.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
function fileHash(file) { { const bytes = fs.readFileSync(file); return sha(bytes); } }
const source = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
const clone = value => JSON.parse(JSON.stringify(value));
const save = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
const template = source(path.join(ROOT, 'index.html'));
const fontLinks = [...template.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1);
if (process.argv.includes('--prefetch-assets-only')) {
  fs.mkdirSync(CACHE, { recursive: true }); const manifest = [];
  async function fetchAsset(url) {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); assert.equal(response.status, 200);
    const body = Buffer.from(await response.arrayBuffer()), file = sha(url); fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, sha256: sha(body), bytes: body.length, contentType: response.headers.get('content-type') }); return body.toString('utf8');
  }
  const css = await fetchAsset(fontLinks[0]);
  const fonts = [...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)/g)].map(match => match[1]))];
  assert(fonts.length); for (const url of fonts) await fetchAsset(url);
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Cached ${manifest.length} actual template font payloads.`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
function hashes(dirs, extras = []) {
  const result = {};
  function visit(dir) { for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${dir}/${entry.name}`; if (entry.isDirectory()) visit(file); else result[file] = fileHash(path.join(ROOT, file));
  } }
  dirs.forEach(visit); for (const file of extras) result[file] = fileHash(path.join(ROOT, file)); return result;
}
const sourceHashes = () => hashes(['src'], ['index.html', 'package.json', 'package-lock.json', SELF, 'scripts/simFreeKickRange.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs']);
const report = { complete: false, phase: 'prepare', base: BASE, cases: [], controls: [], visibilityControls: [], errors: [],
  scope: 'Four actual React consumer mounts, each exercised with trusted touch or keyboard input. Two exact pinned-old engine controls.',
  limits: ['Free Kick stops after the first two practice shots. No daily completion or campaign is exercised.',
    'Tycoon uses a source-created state with explicitly staged offer time and match count. Only the actual consumer callback is observed, not parent match/save settlement.',
    'Visibility checks cover only the selected setup label, pitch and result surface after declared driver navigation. No whole-route layout, animation trajectory or real-device claim.'],
  sourceBefore: sourceHashes(), buildBefore: hashes(['dist']), cacheBefore: hashes(['free-kick-range-artifacts/asset-cache']) };
const persist = () => save('report.json', report);
let browser, server, finished = false;
function holds() {
  report.sourceAfter = sourceHashes(); report.buildAfter = hashes(['dist']); report.cacheAfter = hashes(['free-kick-range-artifacts/asset-cache']);
  assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore);
}
process.once('SIGTERM', () => {
  if (finished) return; finished = true; report.complete = false; report.errors.push({ name: 'DeadlineError', phase: report.phase });
  try { holds(); } catch (error) { report.holdError = { name: error.name, message: error.message }; }
  server?.close(); persist(); process.exit(124);
});
persist();
function once(text, from, to) {
  assert.equal(text.split(from).length - 1, 1); const changed = text.replace(from, to);
  assert.notEqual(changed, text); assert.equal(changed.split(to).length - 1, 1); assert.equal(changed.replace(to, from), text); return changed;
}
function retainedBundle(result, name) {
  const outputs = {};
  for (const file of result.outputFiles) {
    fs.writeFileSync(file.path, file.contents); outputs[path.basename(file.path)] = { sha256: sha(file.contents), bytes: file.contents.length };
  }
  const inputs = Object.fromEntries(Object.keys(result.metafile.inputs).filter(file => file !== '<stdin>').map(file => [file, fileHash(path.resolve(ROOT, file))]));
  save(`${name}-metafile.json`, result.metafile); save(`${name}-binding.json`, { inputs, outputs }); return inputs;
}
function shot(engine, aim, setup, seed, skip = 0) {
  const rng = engine.lehmer(seed), draws = []; for (let i = 0; i < skip; i++) rng();
  const before = { aim: clone(aim), setup: clone(setup) };
  const result = engine.takeShot(aim, setup, () => { const value = rng(); draws.push(value); return value; });
  return { before, after: { aim, setup }, draws, result };
}
try {
  const copies = path.join(OUT, 'sources'); fs.mkdirSync(copies, { recursive: true });
  const old = execFileSync('git', ['show', `${BASE}:${ENGINE}`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n?/g, '\n');
  const current = source(path.join(ROOT, ENGINE));
  const oldRange = 'const distance = Math.round((11 + t * 14) * 10) / 10;';
  const newRange = 'const distance = i === 0 ? 11 : Math.max(17, Math.round((11 + t * 14) * 10) / 10);';
  const oldComment = " * things and the owner's instruction is one engine, many sports. Every number\n * below is the number Round 433 shipped, in the same order, so a seed plays\n * the same ten kicks it always did.";
  const newComment = " * things and the owner's instruction is one engine, many sports. Round 1091\n * moves the three short walled setups outside the penalty area. The penalty,\n * later distances, random draw order and shot rules stay unchanged.";
  assert.equal(current, once(once(old, oldRange, newRange), oldComment, newComment));
  const arcade = execFileSync('git', ['show', `${BASE}:src/lib/arcade.ts`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n?/g, '\n');
  assert.equal(source(path.join(ROOT, 'src/lib/arcade.ts')), arcade);
  fs.writeFileSync(path.join(copies, 'arcade.ts'), arcade);
  for (const [name, text] of [['old', old], ['current', current]]) fs.writeFileSync(path.join(copies, `${name}.ts`), text);
  save('source-relation.json', { base: BASE, oldNormalized: sha(old), currentNormalized: sha(current), currentRaw: fileHash(path.join(ROOT, ENGINE)),
    exactTwoAnchorRelation: true, oldRange, newRange, oldComment, newComment, arcadeNormalized: sha(arcade) });
  const oracleBuild = await build({ absWorkingDir: ROOT, stdin: { contents: `export * as O from ${JSON.stringify(path.join(copies, 'old.ts'))}; export * as T from './src/lib/stadiumTycoon'; export * as L from './src/lib/leagueCore';`, resolveDir: ROOT },
    outfile: path.join(OUT, 'oracle.mjs'), bundle: true, write: false, platform: 'node', format: 'esm', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
  retainedBundle(oracleBuild, 'oracle');
  const realRandom = Math.random, RealDate = Date; let importDraws = 0, O, fixtures, baseline;
  try {
    Math.random = () => { importDraws++; throw new Error('Pure fixture/oracle must not consume ambient randomness'); };
    globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
    const imported = await import(pathToFileURL(path.join(OUT, 'oracle.mjs')).href); O = imported.O; const { T, L } = imported;
    const fresh = T.newTycoon(NOW); fixtures = [];
    for (const index of [2, 3]) {
      let fixture;
      for (let match = 0; match < 1000 && !fixture; match++) {
        const state = { ...clone(fresh), totalMatches: match, minute: 20 + L.hash32(match) % 61, matchSec: 0 }, before = clone(state);
        const offer = T.setPieceOffer(state, true); assert.deepEqual(state, before);
        if (offer?.kickIndex === index) fixture = { fresh, state, offer, staging: 'Only totalMatches, scheduled minute and matchSec are staged. No played match or earned score is claimed.' };
      }
      assert(fixture); fixtures.push(fixture);
    }
    baseline = shot(O, { x: .65, y: .6, power: .65, curve: 0 }, { distance: 17, wallSize: 3, keeperSkill: .55, keeperLean: -.27, label: 'Explicit held 17 metre baseline' }, 77);
    assert.equal(importDraws, 0); save('fixtures.json', { fixtures, baseline, importDraws, now: Date.now() });
  } finally { Math.random = realRandom; globalThis.Date = RealDate; }
  const compiled = {};
  for (const arm of ['current', 'old']) {
    const implementation = path.join(copies, `${arm}.ts`), observer = path.join(copies, `${arm}-observer.ts`);
    fs.writeFileSync(observer, `import * as F from ${JSON.stringify(implementation)};
export * from ${JSON.stringify(implementation)};
const copy = value => JSON.parse(JSON.stringify(value));
export function buildRun(seed) { const value = F.buildRun(seed); window.__range1091.runs.push({seed,kicks:copy(value)}); return value; }
export function takeShot(aim,setup,rng) { const row = {before:{aim:copy(aim),setup:copy(setup)},draws:[],calls:0}; window.__range1091.shots.push(row);
row.calls++; const value = F.takeShot(aim,setup,()=>{const n=rng();row.draws.push(n);return n;}); row.result=copy(value); row.after={aim:copy(aim),setup:copy(setup)}; return value; }
`);
    const entry = `import React from 'react'; import {createRoot} from 'react-dom/client';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard'; import {WatchedSetPieceBoard} from '@/components/tycoon/SetPieceBoard';
import {AuthProvider,useAuth} from '@/contexts/AuthContext'; import * as F from ${JSON.stringify(implementation)};
const fixture=await(await fetch('/fixture.json')).json(); window.__range1091.fixture=fixture;
const rng=F.lehmer(77), draws=[], aim=${JSON.stringify(baseline.before.aim)}, setup=${JSON.stringify(baseline.before.setup)};
const before={aim:structuredClone(aim),setup:structuredClone(setup)}, result=F.takeShot(aim,setup,()=>{const n=rng();draws.push(n);return n;});
window.__range1091.baseline={before,after:{aim,setup},draws,result};
function Host(){ const {loading}=useAuth(); return <main style={{maxWidth:640,margin:'0 auto',padding:16}} data-auth-ready={!loading}>
{!loading && (fixture.kind==='practice'?<FreeKickBoard/>:<WatchedSetPieceBoard seed={fixture.offer.seed} kickIndex={fixture.offer.kickIndex} onResult={scored=>{window.__range1091.callbacks.push({name:'result',scored});return 'accepted';}} onBack={()=>window.__range1091.callbacks.push({name:'back'})}/>)}</main>; }
createRoot(document.getElementById('root')).render(<AuthProvider><Host/></AuthProvider>);`;
    fs.writeFileSync(path.join(OUT, `${arm}-mount.tsx`), entry);
    const built = await build({ absWorkingDir: ROOT, stdin: { contents: entry, resolveDir: ROOT, loader: 'tsx' }, outfile: path.join(OUT, `${arm}-mount.js`),
      bundle: true, write: false, platform: 'browser', format: 'esm', jsx: 'automatic', metafile: true, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
      plugins: [{ name: 'actual-engine-observation', setup(b) {
        b.onResolve({ filter: /^@\/lib\/freeKick$/ }, () => ({ path: observer }));
        b.onResolve({ filter: /^@\// }, args => b.resolve(path.join(ROOT, 'src', args.path.slice(2)), { resolveDir: ROOT, kind: args.kind }));
      } }] });
    const inputs = retainedBundle(built, arm), absoluteInputs = Object.keys(inputs).map(file => path.resolve(ROOT, file));
    assert(absoluteInputs.includes(observer) && absoluteInputs.includes(implementation));
    assert(!absoluteInputs.includes(path.join(ROOT, ENGINE)), 'No unobserved original engine bypass');
    assert(!absoluteInputs.includes(path.join(copies, `${arm === 'old' ? 'current' : 'old'}.ts`)), 'One selected engine implementation');
    for (const file of ['src/components/free-kick/FreeKickBoard.tsx', 'src/components/tycoon/SetPieceBoard.tsx', 'src/contexts/AuthContext.tsx']) assert(inputs[file], `Actual consumer binding ${file}`);
    compiled[arm] = new Map(built.outputFiles.map(file => [`/${path.basename(file.path)}`, { body: Buffer.from(file.contents), type: file.path.endsWith('.css') ? 'text/css' : 'text/javascript' }]));
  }
  const styles = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(file => file.endsWith('.css')).sort(); assert(styles.length);
  const assets = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(asset => {
    const body = fs.readFileSync(path.join(CACHE, asset.file)); assert.equal(sha(body), asset.sha256); assert.equal(body.length, asset.bytes); return [asset.url, { ...asset, body }];
  }));
  server = createServer((_req, response) => { response.writeHead(500); response.end('All declared requests must be fulfilled locally.'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import('../lib/playwrightLoader.mjs'); browser = await chromium.launch({ headless: true });
  for (const arm of ['current', 'old']) for (const width of arm === 'old' ? [390] : [390, 1280]) for (const kind of ['practice', 'tycoon']) {
    const fixture = { kind, ...clone(fixtures[width === 390 ? 0 : 1]) }, id = `${arm}-${kind}-${width}`, touch = width === 390;
    const row = { id, arm, kind, width, complete: false, states: [], requests: [], sockets: [], errors: [], inputs: [], screenshots: [] };
    (arm === 'old' ? report.controls : report.cases).push(row); report.phase = id; persist();
    const context = await browser.newContext({ viewport: { width, height: touch ? 844 : 720 }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, colorScheme: touch ? 'dark' : 'light', reducedMotion: 'no-preference', serviceWorkers: 'block' });
    const pending = new Set(), resources = new Map(compiled[arm]);
    for (const file of styles) resources.set(`/assets/${file}`, { body: fs.readFileSync(path.join(ROOT, 'dist/assets', file)), type: 'text/css' });
    resources.set('/fixture.json', { body: Buffer.from(JSON.stringify(fixture)), type: 'application/json' });
    resources.set('/', { body: Buffer.from(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">${fontLinks.map(url => `<link rel="stylesheet" href="${url}">`).join('')}${styles.map(file => `<link rel="stylesheet" href="/assets/${file}">`).join('')}<link rel="stylesheet" href="/${arm}-mount.css"></head><body><div id="root"></div><script type="module" src="/${arm}-mount.js"></script></body></html>`), type: 'text/html' });
    save(`${id}-resources.json`, Object.fromEntries([...resources].map(([url, value]) => [url, { sha256: sha(value.body), bytes: value.body.length, type: value.type }])));
    await context.routeWebSocket('**/*', socket => { row.sockets.push(socket.url()); return socket.close(); });
    await context.route('**/*', route => {
      const task = (async () => {
        const req = route.request(), url = new URL(req.url()), record = { url: url.href, method: req.method() }; row.requests.push(record); assert.equal(req.method(), 'GET');
        const cached = assets.get(url.href), payload = url.origin === base ? resources.get(url.pathname) : cached ? { body: cached.body, type: cached.contentType } : null;
        assert(payload, `Undeclared transport ${url.href}`); Object.assign(record, { sha256: sha(payload.body), bytes: payload.body.length });
        await route.fulfill({ status: 200, contentType: payload.type, body: payload.body });
        record.locallyFulfilled = true;
      })().catch(async error => { row.errors.push({ name: error.name, message: error.message }); try { await route.abort(); } catch {} }).finally(() => pending.delete(task));
      pending.add(task); return task;
    });
    await context.addInitScript(({ now, dark }) => {
      localStorage.setItem('range-save-sentinel', 'opaque held bytes'); sessionStorage.setItem('range-session-sentinel', 'held');
      const NativeDate = Date; window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      let seed = 1091, draws = 0; Math.random = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const state = window.__range1091 = { runs: [], shots: [], callbacks: [], writes: [], events: [], readRandom: () => ({ seed, draws }) };
      for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function (...args) {
        state.writes.push({ scope: this === localStorage ? 'local' : 'session', method, args }); return original.apply(this, args);
      }; }
      for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup']) addEventListener(type, event => {
        const target = event.target instanceof Element ? event.target.closest('button') || event.target : null;
        state.events.push({ type, trusted: event.isTrusted, key: event.key || null, pointerType: event.pointerType || null, target: target?.getAttribute('aria-label') || target?.textContent?.trim() || '' });
      }, true);
      const theme = () => document.documentElement.classList.toggle('dark', dark); if (document.documentElement) theme(); else addEventListener('DOMContentLoaded', theme, { once: true });
    }, { now: NOW, dark: touch });
    const page = await context.newPage(); page.setDefaultTimeout(12000); page.on('pageerror', error => row.errors.push({ name: error.name, message: error.message, stack: error.stack }));
    const snapshot = async label => {
      const value = await page.evaluate(() => {
        const q = window.__range1091, store = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
        return { local: store(localStorage), session: store(sessionStorage), writes: q.writes, callbacks: q.callbacks, runs: q.runs, shots: q.shots, baseline: q.baseline, fixture: q.fixture,
          random: q.readRandom(), now: Date.now(), events: q.events, phase: document.querySelector('[data-arcade-phase]')?.getAttribute('data-arcade-phase') || null, text: document.body.innerText, scroll: { x: scrollX, y: scrollY } };
      }); row.states.push({ label, ...value }); persist(); return value;
    };
    const activate = async name => {
      const target = page.getByRole('button', { name, exact: true }); await target.scrollIntoViewIfNeeded();
      const start = await page.evaluate(() => window.__range1091.events.length);
      const input = { name, method: touch ? 'tap' : 'Enter', rect: await target.boundingBox() }; row.inputs.push(input);
      if (touch) await target.tap(); else { await target.focus(); await page.keyboard.press('Enter'); }
      input.events = await page.evaluate(start => window.__range1091.events.slice(start), start); persist();
      assert.equal(input.events.filter(event => event.type === 'click').length, 1, 'One actual activation per input');
      assert(input.events.some(event => event.type === 'click' && event.trusted && event.target === name), 'Actual trusted named button activation');
    };
    const screenshot = async name => { const file = `${id}-${name}.png`; await page.screenshot({ path: path.join(OUT, file) }); row.screenshots.push(file); };
    const readSurface = async (target, textOnly = false) => target.evaluate((node, args) => {
      const rect = r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
      const clips = element => { const list = []; for (let at = element; at; at = at.parentElement) {
        const style = getComputedStyle(at), x = /^(hidden|clip|auto|scroll)$/.test(style.overflowX), y = /^(hidden|clip|auto|scroll)$/.test(style.overflowY);
        if (x || y) { const box = at.getBoundingClientRect(); list.push({ x, y, left: box.left + at.clientLeft, right: box.left + at.clientLeft + at.clientWidth,
          top: box.top + at.clientTop, bottom: box.top + at.clientTop + at.clientHeight, tag: at.tagName, class: at.className }); }
      } return list; };
      const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2), glyphs = [];
      if (args.textOnly) { const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let text;
        while ((text = walker.nextNode())) if (text.textContent.trim()) {
          const range = document.createRange(); range.selectNodeContents(text); const parent = text.parentElement;
          for (const value of range.getClientRects()) glyphs.push({ text: text.textContent, rect: rect(value), clips: clips(parent), font: parseFloat(getComputedStyle(parent).fontSize) });
        }
      }
      return { box: rect(box), clips: clips(node.parentElement), glyphs, hit: Boolean(hit && (hit === node || node.contains(hit))), viewport: args.viewport,
        scroll: { x: scrollX, y: scrollY }, html: node.outerHTML, fullComponentHtml: document.querySelector('main').outerHTML };
    }, { textOnly, viewport: page.viewportSize() });
    const checkSurface = geometry => {
      const clipped = (r, clips) => clips.some(c => c.x && (r.x < c.left - 1 || r.right > c.right + 1) || c.y && (r.y < c.top - 1 || r.bottom > c.bottom + 1));
      assert(geometry.glyphs.every(g => !clipped(g.rect, g.clips)), 'Selected surface glyphs are not clipped');
      const inside = r => r.width > 0 && r.height > 0 && r.x >= -1 && r.y >= -1 && r.right <= geometry.viewport.width + 1 && r.bottom <= geometry.viewport.height + 1;
      assert(inside(geometry.box) && !clipped(geometry.box, geometry.clips), 'Selected surface fits the physical viewport and actual clips');
      assert(geometry.glyphs.every(g => inside(g.rect) && g.font >= 12), 'Selected text is readable in the physical viewport');
      assert(geometry.hit, 'Selected surface is not covered');
    };
    const expose = async (target, name, textOnly = false) => {
      await target.evaluate(async node => { const finite = node.getAnimations({ subtree: true }).filter(animation => Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)));
        await Promise.all(finite.map(animation => animation.finished)); });
      row.inputs.push({ navigation: name, method: 'scrollIntoViewIfNeeded' }); await target.scrollIntoViewIfNeeded();
      const geometry = await readSurface(target, textOnly); (row.surfaces ||= []).push({ name, geometry }); persist(); checkSurface(geometry); await screenshot(name); return geometry;
    };
    try {
      await page.goto(base, { waitUntil: 'load' }); await page.locator('[data-auth-ready="true"]').waitFor();
      row.fonts = await page.evaluate(async () => {
        const values = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
          const faces = await document.fonts.load(`${weight} 12px "${family}"`); values.push({ family, weight, faces: faces.map(face => ({ family: face.family, status: face.status })) });
        } await document.fonts.ready; return values;
      }); persist(); for (const font of row.fonts) assert(font.faces.length && font.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === font.family));
      const before = await snapshot('ready'); assert.deepEqual(before.baseline, baseline, 'Unchanged explicit 17 metre baseline');
      if (kind === 'practice') {
        await activate('Steady practice'); await page.getByRole('dialog', { name: 'Steady practice', exact: true }).waitFor(); await snapshot('instructions');
        await activate('Start steady practice'); await page.getByRole('dialog').waitFor({ state: 'detached' });
        await page.locator('[data-arcade-phase="aiming"]').waitFor(); await snapshot('penalty-ready'); await activate('Kick');
        await page.locator('[data-arcade-phase="kickEnd"]').waitFor(); await snapshot('penalty-result'); await activate('Next kick');
        await page.locator('[data-arcade-phase="aiming"]').waitFor();
      } else { await activate('Kick rules'); }
      const setup = await snapshot('changed-setup');
      row.setupLabel = kind === 'practice' ? await page.locator('svg[role="img"]').getAttribute('aria-label') : await page.locator('[data-tycoon-set-piece] h2 + p').innerText();
      const selectedSetup = setup.runs[0].kicks[kind === 'practice' ? 1 : fixture.offer.kickIndex];
      const label = kind === 'practice' ? page.getByText(selectedSetup.label, { exact: true }) : page.locator('[data-tycoon-set-piece] h2 + p');
      await expose(label, 'setup-label', true);
      if (arm === 'current' && touch) {
        const control = { id: `${id}-clip`, complete: false, before: await readSurface(label, true), stateBefore: await snapshot('before-label-clip') }; report.visibilityControls.push(control); persist();
        const originalStyle = await label.getAttribute('style');
        try {
          await label.evaluate(node => { node.style.display = 'block'; node.style.width = '1px'; node.style.maxWidth = '1px'; node.style.overflow = 'hidden'; });
          control.fault = await readSurface(label, true); control.stateFault = await snapshot('fault-label-clip'); persist();
          assert.notDeepEqual(control.fault, control.before, 'The DOM clipping control changed actual geometry');
          try { checkSurface(control.fault); throw new Error('Clipping control was accepted'); }
          catch (error) { control.failure = { name: error.name, message: error.message, stack: error.stack }; persist();
            assert(error instanceof assert.AssertionError); assert(error.message.startsWith('Selected surface glyphs are not clipped')); }
          await screenshot('fault-label-clip');
        } finally {
          await label.evaluate((node, value) => { if (value === null) node.removeAttribute('style'); else node.setAttribute('style', value); }, originalStyle);
          control.restored = await readSurface(label, true); control.stateRestored = await snapshot('restored-label-clip'); persist();
          assert.deepEqual(control.restored, control.before, 'Exact measured geometry and full component HTML restored');
          const { label: _beforeLabel, ...beforeState } = control.stateBefore, { label: _afterLabel, ...afterState } = control.stateRestored;
          assert.deepEqual(afterState, beforeState, 'Complete component state and input log restored'); checkSurface(control.restored);
        }
        control.complete = true; persist();
      }
      await expose(kind === 'practice' ? page.locator('svg[role="img"]') : page.locator('[data-tycoon-set-piece] > svg'), 'setup-pitch');
      row.geometry = await page.evaluate(() => {
        const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, font: getComputedStyle(node).fontSize, text: node.textContent?.trim() }; };
        return { innerWidth, innerHeight, physical: { width: screen.width, height: screen.height }, scrollWidth: document.documentElement.scrollWidth,
          leaves: [...document.querySelectorAll('main button, main input, main p, main svg[role="img"]')].map(rect) };
      }); await activate(kind === 'practice' ? 'Kick' : 'Take shot');
      if (kind === 'practice') await page.locator('[data-arcade-phase="kickEnd"]').waitFor();
      else await page.locator('[aria-label="Kick replay"][data-motion="static"]').waitFor();
      await expose(kind === 'practice' ? page.locator('[data-arcade-feedback]') : page.getByRole('region', { name: 'Kick replay', exact: true }), 'result-surface');
      await expose(kind === 'practice' ? page.locator('[data-arcade-feedback] [role="status"]') : page.getByRole('status'), 'result-text', true);
      const after = await snapshot('settled');
      row.comparisons = [];
      const equal = (name, actual, expected) => { row.comparisons.push({ name, actual: clone(actual), expected: clone(expected) }); persist(); assert.deepEqual(actual, expected, name); };
      equal('Full storage and writes remain held', { local: after.local, session: after.session, writes: after.writes, now: after.now, fixture: after.fixture }, { local: before.local, session: before.session, writes: before.writes, now: before.now, fixture: before.fixture });
      equal('Consumer shot count', after.shots.length, kind === 'practice' ? 2 : 1); equal('One actual generated ladder', after.runs.length, 1);
      const run = after.runs[0], oldRun = O.buildRun(run.seed), selectedIndex = kind === 'practice' ? 1 : fixture.offer.kickIndex;
      const expectedRun = oldRun.map((kick, i) => arm === 'current' && i > 0 && kick.distance < 17 ? { ...kick, distance: 17, label: `17 m, ${kick.wallSize} in the wall` } : kick);
      equal('Full actual seeded ladder', run.kicks, expectedRun);
      for (const [index, observed] of after.shots.entries()) {
        const expected = shot(O, clone(observed.before.aim), clone(observed.before.setup), kind === 'practice' ? run.seed ^ 0x5eed1234 : fixture.offer.seed, kind === 'practice' ? index * 4 : 0);
        equal(`Shot ${index} delegates once with complete old-rule output and stream`, observed, { ...expected, calls: 1 });
        equal(`Shot ${index} unchanged actual chosen setup`, observed.before.setup, run.kicks[kind === 'practice' ? index : selectedIndex]);
        equal(`Shot ${index} actual unchanged default aim`, observed.before.aim, kind === 'practice' ? { x: 0, y: .5, power: .6, curve: 0 } : { x: .65, y: .6, power: .65, curve: 0 });
      }
      const selected = run.kicks[selectedIndex], result = after.shots.at(-1).result;
      equal('Actual consumer setup label', row.setupLabel, kind === 'practice' ? `Free kick from ${selected.distance} metres with ${selected.wallSize} in the wall` : selected.label);
      equal('Read-only consumer callback contract', after.callbacks, kind === 'practice' ? [] : [{ name: 'result', scored: result.scored }]);
      equal('Shot actions consume no ambient randomness', after.random, setup.random);
      const seedAfterStart = (Math.imul(before.random.seed, 1664525) + 1013904223) >>> 0;
      equal('Only practice seed creation consumes ambient randomness', after.random, kind === 'practice' ? { seed: seedAfterStart, draws: before.random.draws + 1 } : before.random);
      equal('Consumer uses its actual seed', run.seed, kind === 'practice' ? Math.floor(seedAfterStart / 4294967296 * 2147483645) + 1 : fixture.offer.seed);
      const activations = row.inputs.filter(input => input.name);
      equal('Trusted tested activations', activations.map(input => after.events.some(event => event.type === 'click' && event.trusted && event.target === input.name)), activations.map(() => true));
      if (kind === 'practice') {
        row.displayedPoints = await page.getByText(/^Points\s+\d+$/).innerText();
        equal('Actual practice points follow settled engine results', row.displayedPoints.replace(/\s+/g, ' '), `Points ${after.shots.reduce((sum, value) => sum + value.result.points, 0)}`);
      } else equal('Actual rendered verdict follows shot', await page.getByRole('status').innerText(), `${result.scored ? 'Goal' : result.saved ? 'Saved' : result.hitWall ? 'Blocked' : result.hitPost ? 'Off the post' : 'Missed'}\n${result.verdict}`);
      await Promise.all([...pending]); equal('No runtime or transport errors', row.errors, []); equal('No sockets', row.sockets, []);
      const legal = { ...oldRun[selectedIndex], distance: 17, label: `17 m, ${oldRun[selectedIndex].wallSize} in the wall` };
      try { equal('Consumer uses the legal first changed walled setup', selected, legal); assert.equal(arm, 'current', 'Pinned-old control must be rejected'); row.complete = true; }
      catch (error) {
        row.failure = { name: error.name, message: error.message, actual: error.actual, expected: error.expected, stack: error.stack }; persist();
        if (arm !== 'old') throw error;
        assert(error instanceof assert.AssertionError); assert(error.message.startsWith('Consumer uses the legal first changed walled setup'));
        assert.notDeepEqual(selected, legal); assert.deepEqual(before.baseline, baseline); row.effective = true; row.complete = true;
      }
    } catch (error) { row.errors.push({ name: error.name, message: error.message, stack: error.stack }); throw error; }
    finally {
      await Promise.all([...pending]); await context.close(); await Promise.all([...pending]);
      try { assert.deepEqual(row.errors, [], 'Final drained runtime and transport errors'); assert.deepEqual(row.sockets, [], 'Final drained sockets'); }
      catch (error) { row.complete = false; throw error; }
      finally { persist(); }
    }
  }
  assert.equal(report.cases.length, 4); assert(report.cases.every(row => row.complete));
  assert.equal(report.controls.length, 2); assert(report.controls.every(row => row.complete && row.effective));
  assert.equal(report.visibilityControls.length, 2); assert(report.visibilityControls.every(row => row.complete));
  report.complete = true;
} catch (error) { report.complete = false; report.errors.push({ name: error.name, message: error.message, stack: error.stack }); process.exitCode = 1; }
finally {
  try { holds(); } catch (error) { report.complete = false; report.holdError = { name: error.name, message: error.message }; process.exitCode = 1; }
  persist(); await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); finished = true;
}
console.log(`Finite consumer journeys: ${report.cases.filter(row => row.complete).length}/4.`);
console.log(`Effective pinned-old controls: ${report.controls.filter(row => row.effective).length}/2.`);
console.log(`Effective restored visibility controls: ${report.visibilityControls.filter(row => row.complete).length}/2.`);
console.log(`Source, build and asset holds: ${report.holdError ? 'FAILED' : 'retained'}.`);
console.log(`Free Kick consumer proof ${report.complete ? 'PASSED' : 'FAILED'}; artifacts retained at ${OUT}.`);
