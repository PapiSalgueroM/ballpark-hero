/* Remote-only finite component proof. This does not mount the route or play a campaign. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.GITHUB_ACTIONS, 'Goal flight verification runs only in remote GitHub Actions');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART = path.join(ROOT, 'tycoon-goal-flight-artifacts');
const CACHE = path.resolve(process.env.TYCOON_GOAL_FLIGHT_ASSET_CACHE || path.join(ART, 'font-cache/manifest.json'));
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const ARM = arg('--arm') || 'normal';
assert(/^[a-z-]+$/.test(ARM));
const OUT = path.join(ART, 'native', ARM);
const PITCH = path.resolve(arg('--component') || path.join(ROOT, 'src/components/tycoon/TycoonPitch.tsx'));
const NOW = Date.parse('2026-10-07T12:00:00.000Z');
const BASE = 'http://127.0.0.1:1087';
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
const sheet = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"\s+rel="stylesheet"/g)].map(m => new URL(m[1]).href);
assert.equal(sheet.length, 1);
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const rows = [];
  const fetchAsset = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url); assert.equal(response.status, 200);
    const body = Buffer.from(await response.arrayBuffer()), file = hash(url);
    fs.writeFileSync(path.join(path.dirname(CACHE), file), body);
    rows.push({ url, file, sha256: hash(body), bytes: body.length, contentType: response.headers.get('content-type') });
    return body;
  };
  const css = (await fetchAsset(sheet[0])).toString('utf8');
  for (const url of new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(m => m[1]))) await fetchAsset(url);
  assert(rows.length > 1); fs.writeFileSync(CACHE, JSON.stringify(rows, null, 2));
  console.log(`Goal flight: prefetched ${rows.length} actual template font assets.`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
function hashes(dirs, files = []) {
  const out = {};
  const walk = rel => { for (const item of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
    const file = `${rel}/${item.name}`; if (item.isDirectory()) walk(file); else if (item.isFile()) out[file] = hash(fs.readFileSync(path.join(ROOT, file)));
  } };
  dirs.forEach(walk); files.forEach(file => { out[file] = hash(fs.readFileSync(path.join(ROOT, file))); }); return out;
}
const sources = () => hashes(['src'], ['index.html', 'package.json', 'package-lock.json', 'tailwind.config.ts', 'scripts/simTycoonGoalFlight.mjs', 'scripts/qa/tycoonGoalFlight1087.mjs', 'scripts/simTycoonPitch.mjs', 'src/test/tycoonPitch.test.tsx']);
const entries = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const assets = new Map(entries.map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(path.dirname(CACHE), entry.file));
  assert.equal(hash(body), entry.sha256); assert.equal(body.length, entry.bytes);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(assets.has(sheet[0]));
const assetHashes = () => Object.fromEntries(['manifest.json', ...entries.map(e => e.file)].map(file => [file, hash(fs.readFileSync(path.join(path.dirname(CACHE), file)))]));
const report = { arm: ARM, complete: false, scope: 'Actual compiled React pitch with unchanged-engine generated replays. Finite component stage, not a route or campaign.',
  limits: ['The field-to-net path illustrates an actual goal; the engine has no physical shot trajectory.', 'No game hook, career progression, purchase, ticket, sale or completion action is exercised.', 'Only the pitch, its scoreboard and QA navigation geometry are measured.'],
  sourceBefore: sources(), buildBefore: fs.existsSync(path.join(ROOT, 'dist')) ? hashes(['dist']) : {}, assetsBefore: assetHashes(),
  component: { path: path.relative(ROOT, PITCH).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(PITCH)) }, cases: [], failures: [], forwarded: [], sockets: [] };
const save = () => write('report.json', report);
function check(row, name, fn) {
  try { fn(); row.checks.push({ name, pass: true }); }
  catch (error) { const failure = { name, pass: false, type: error.name, message: error.message, actual: error.actual, expected: error.expected, stack: error.stack }; row.checks.push(failure); report.failures.push({ case: row.id, ...failure }); }
}
save();

const { build } = await import('esbuild');
const { default: postcss } = await import('postcss');
const { default: tailwind } = await import('tailwindcss');
const { chromium } = await import('../lib/playwrightLoader.mjs');
let browser;
try {
  const engineBundle = await build({ absWorkingDir: ROOT, stdin: { contents: "export * from './src/lib/stadiumTycoon';", resolveDir: ROOT }, bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
  fs.writeFileSync(path.join(OUT, 'engine.mjs'), engineBundle.outputFiles[0].contents); write('engine-metafile.json', engineBundle.metafile);
  const originalDate = Date, originalRandom = Math.random, originalFetch = globalThis.fetch;
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let randomDraws = 0; const nodeWrites = [], nodeTransport = [];
  globalThis.Date = class extends originalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  Math.random = () => { randomDraws++; return 0.5; };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: (...args) => nodeWrites.push(args), removeItem: (...args) => nodeWrites.push(args), clear: () => nodeWrites.push(['clear']) } });
  globalThis.fetch = async url => { nodeTransport.push(String(url)); throw new Error('Engine transport prohibited'); };
  let fixture;
  try {
    const beforeImport = { randomDraws, now: Date.now() }, E = await import(pathToFileURL(path.join(OUT, 'engine.mjs')).href);
    const afterImport = { randomDraws, now: Date.now() };
    const origin = E.newTycoon(NOW), operations = [], events = []; let state = clone(origin);
    for (const rolls of [[0, 0.999], [0, 0.999], [0.999, 0], [0, 0.999]]) {
      const before = clone(state); let used = 0;
      const result = E.tick(state, 1.4, () => { assert(used < rolls.length, 'Declared actual engine roll fixture exhausted'); return rolls[used++]; });
      assert.equal(used, rolls.length); assert.deepEqual(state, before, 'Engine leaves input state held');
      operations.push({ before, dt: 1.4, rolls, used, result: clone(result) }); events.push(...result.events); state = result.state;
    }
    const goals = events.filter(e => e.kind === 'goal' || e.kind === 'conceded');
    assert.deepEqual(goals.map(e => e.kind), ['goal', 'goal', 'conceded', 'goal']);
    const replays = goals.map((e, i) => ({ id: i + 1, side: e.kind === 'goal' ? 'for' : 'against', minute: e.minute }));
    fixture = { origin, operations, events, state, replays, now: NOW, key: E.TYCOON_SAVE_KEY, bytes: E.serializeTycoon(state, NOW), opponent: E.opponentName(state) };
    report.engine = { beforeImport, afterImport, afterFixture: { randomDraws, now: Date.now() }, writes: nodeWrites, transport: nodeTransport, bundleHash: hash(engineBundle.outputFiles[0].contents) };
    assert.deepEqual(nodeWrites, []); assert.deepEqual(nodeTransport, []);
  } finally { globalThis.Date = originalDate; Math.random = originalRandom; globalThis.fetch = originalFetch; if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage; }
  write('fixture.json', fixture);
  // This unchanged-engine browser replay is independent of the Node fixture evaluation.
  const entry = `import React, {useState,useCallback,useRef,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import Pitch from ${JSON.stringify(PITCH.replaceAll('\\', '/'))};
import * as E from '@/lib/stadiumTycoon';
const fixture=${JSON.stringify(fixture)};
const actual={origin:E.newTycoon(fixture.now),operations:[],events:[]};
actual.state=structuredClone(actual.origin);
for(const op of fixture.operations){let used=0;const before=structuredClone(actual.state);const result=E.tick(actual.state,op.dt,()=>op.rolls[used++]);actual.operations.push({before,dt:op.dt,rolls:op.rolls,used,result:structuredClone(result)});actual.events.push(...result.events);actual.state=result.state;}
actual.bytes=E.serializeTycoon(actual.state,fixture.now);
window.__flightEngine=actual;
window.__flightRuns=[];
const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
function capture(source){const run=window.__flightRun;if(!run||run.finished)return;const p=document.querySelector('[data-tycoon-pitch]'),b=document.querySelector('[data-ball]');if(!p||!b)return;const pr=p.getBoundingClientRect(),br=b.getBoundingClientRect();run.frames.push({source,t:performance.now(),id:b.getAttribute('data-replay-id'),side:b.getAttribute('data-ball-at'),minute:b.getAttribute('data-replay-minute'),landed:b.classList.contains('st-ball-landed'),pitch:rect(pr),ball:rect(br),x:(br.x+br.width/2-pr.x)/pr.width,y:(br.y+br.height/2-pr.y)/pr.height,animations:b.getAnimations().map(a=>({name:a.animationName,currentTime:a.currentTime,playState:a.playState,duration:a.effect.getTiming().duration})),score:p.textContent,scrollY});}
window.__flightCapture=capture;
new MutationObserver(()=>capture('mutation')).observe(document.getElementById('root'),{subtree:true,childList:true,attributes:true});
function frame(){capture('raf');if(window.__flightRun&&!window.__flightRun.finished)requestAnimationFrame(frame);}
function App(){const [queue,setQueue]=useState([]);const areaRef=useRef(null);const end=useCallback(id=>{window.__flightRun.ends.push({id,t:performance.now()});setQueue(q=>q.filter(r=>r.id!==id));},[]);
useLayoutEffect(()=>{capture('commit');if(window.__flightRun&&queue.length===0){window.__flightRun.finished=true;window.__flightRun.finishedAt=performance.now();}},[queue]);
const start=name=>{const replays=name==='same'?fixture.replays.slice(0,2):name==='opposite'?fixture.replays.slice(1,3):fixture.replays;const run={name,replays,startedAt:performance.now(),frames:[],ends:[],finished:false};window.__flightRun=run;window.__flightRuns.push(run);setQueue(replays);requestAnimationFrame(frame);};
return <main className="mx-auto max-w-4xl p-3 font-body"><h1 className="font-display text-lg">Goal replay verification</h1><p className="mb-3 text-xs">Actual engine goals. Finite component stage.</p><div className="mb-3 flex flex-wrap gap-2">{['same','opposite','compressed'].map(name=><button id={'start-'+name} key={name} className="min-h-11 min-w-11 rounded border px-3 text-xs" onClick={()=>start(name)}>{name}</button>)}</div><Pitch areaRef={areaRef} goalsFor={actual.state.goalsFor} goalsAgainst={actual.state.goalsAgainst} minute={actual.state.minute} totalMatches={actual.state.totalMatches} streak={actual.state.streak} opponent={fixture.opponent} replays={queue} onReplayEnd={end} tapFx={null} tapRun={0}/></main>;}
createRoot(document.getElementById('root')).render(<App/>);`;
  fs.writeFileSync(path.join(OUT, 'entry.tsx'), entry);
  const compiled = await build({ absWorkingDir: ROOT, stdin: { contents: entry, resolveDir: ROOT, loader: 'tsx', sourcefile: 'goal-flight-entry.tsx' }, bundle: true, write: false, format: 'esm', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
  fs.writeFileSync(path.join(OUT, 'bundle.js'), compiled.outputFiles[0].contents); write('browser-metafile.json', compiled.metafile);
  const bundleBody = Buffer.from(compiled.outputFiles[0].contents);
  assert.equal(hash(bundleBody), hash(compiled.outputFiles[0].contents), 'Fulfillment preserves the exact emitted bundle bytes');
  report.bundleBody = { type: 'Buffer', bytes: bundleBody.length, sha256: hash(bundleBody) };
  const inputs = Object.keys(compiled.metafile.inputs).map(file => path.resolve(ROOT, file));
  assert(inputs.includes(PITCH), 'Browser bundle binds the exact selected component');
  const originalPitch = path.join(ROOT, 'src/components/tycoon/TycoonPitch.tsx');
  if (PITCH !== originalPitch) assert(!inputs.includes(originalPitch), 'Copied component excludes the original component');
  report.browserInputs = Object.fromEntries(inputs.filter(file => fs.existsSync(file)).map(file => [path.relative(ROOT, file).replaceAll('\\', '/'), hash(fs.readFileSync(file))]));
  const configBundle = await build({ absWorkingDir: ROOT, entryPoints: ['tailwind.config.ts'], write: false, bundle: false, platform: 'node', format: 'cjs', logLevel: 'silent' });
  fs.writeFileSync(path.join(OUT, 'tailwind-config.cjs'), configBundle.outputFiles[0].contents);
  const module = { exports: {} }; vm.runInNewContext(configBundle.outputFiles[0].text, { module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')) });
  const css = await postcss([tailwind({ ...module.exports.default, content: [{ raw: fs.readFileSync(PITCH, 'utf8'), extension: 'tsx' }, { raw: entry, extension: 'tsx' }] })]).process(fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8'), { from: path.join(ROOT, 'src/index.css') });
  fs.writeFileSync(path.join(OUT, 'style.css'), css.css);
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="${sheet[0]}"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  browser = await chromium.launch({ headless: false });
  const profiles = ARM === 'normal' ? [320, 390, 430, 1440] : [390];
  for (const width of profiles) for (const reduced of [false, true]) {
    const row = { id: `${width}-${reduced ? 'reduced' : 'full'}`, width, height: width === 1440 ? 900 : 844, reduced, checks: [], runs: [], screenshots: [], network: [], responses: [], routeErrors: [], errors: [], consoleErrors: [] };
    report.cases.push(row); save();
    const storage = { [fixture.key]: fixture.bytes, soccerCareerSave: '{"held":1087}', 'dukb-local-completions': '[]' };
    const context = await browser.newContext({ viewport: { width, height: row.height }, hasTouch: width < 1000, isMobile: width < 1000, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: width === 320 ? 'dark' : 'light', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: Object.entries(storage).map(([name, value]) => ({ name, value })) }] } });
    await context.route('**/*', async route => {
      const request = route.request(), url = request.url(); row.network.push({ method: request.method(), url });
      try {
        const local = { [`${BASE}/`]: ['text/html', html], [`${BASE}/bundle.js`]: ['text/javascript', bundleBody], [`${BASE}/style.css`]: ['text/css', css.css] }[url];
        if (request.method() === 'GET' && local) {
          await route.fulfill({ status: 200, contentType: local[0], body: local[1] });
          row.responses.push({ url, status: 200, contentType: local[0], bodyType: Buffer.isBuffer(local[1]) ? 'Buffer' : typeof local[1], sha256: hash(local[1]), bytes: Buffer.byteLength(local[1]), phase: 'fulfilled' }); return;
        }
        if (request.method() === 'GET' && assets.has(url)) { const asset = assets.get(url); await route.fulfill({ status: 200, ...asset }); row.responses.push({ url, status: 200, sha256: hash(asset.body), bytes: asset.body.length, phase: 'fulfilled' }); return; }
        report.forwarded.push({ blocked: true, method: request.method(), url }); await route.abort();
      } catch (error) {
        row.routeErrors.push({ url, method: request.method(), name: error.name, message: error.message, stack: error.stack }); save();
        try { await route.abort('failed'); } catch (abortError) { row.routeErrors.push({ url, phase: 'abort-after-error', name: abortError.name, message: abortError.message }); save(); }
      }
    });
    await context.routeWebSocket('**/*', socket => { report.sockets.push(socket.url()); socket.close(); });
    await context.addInitScript(({ now, dark }) => {
      const OriginalDate = Date; window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      const audit = window.__flightAudit = { draws: 0, writes: [], input: [] };
      Math.random = () => { audit.draws++; return 0.5; };
      for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) { audit.writes.push({ storage: this === localStorage ? 'local' : 'session', method, args }); return original.apply(this, args); }; }
      for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup']) document.addEventListener(type, event => audit.input.push({ type, trusted: event.isTrusted, target: event.target?.id, key: event.key, t: performance.now() }), true);
      document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add(dark ? 'dark' : 'light'));
    }, { now: NOW, dark: width === 320 });
    const page = await context.newPage(); page.on('pageerror', e => row.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') row.consoleErrors.push(m.text()); });
    try {
      await page.goto(BASE, { waitUntil: 'load' }); await page.locator('[data-tycoon-pitch]').waitFor();
      check(row, 'baseline:bundle-delivery', () => {
        const delivered = row.responses.filter(r => r.url === `${BASE}/bundle.js`);
        assert.equal(delivered.length, 1); assert.equal(delivered[0].bodyType, 'Buffer'); assert.equal(delivered[0].bytes, bundleBody.length); assert.equal(delivered[0].sha256, hash(bundleBody));
      });
      row.fonts = await page.evaluate(async () => { await document.fonts.ready; const out = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) { const faces = await document.fonts.load(`${weight} 16px "${family}"`); out.push({ family, weight, faces: faces.map(f => ({ family: f.family, weight: f.weight, status: f.status })) }); } return out; });
      check(row, 'baseline:fonts', () => assert(row.fonts.every(r => r.faces.length && r.faces.every(f => f.status === 'loaded' && f.family.replaceAll('"', '') === r.family && f.weight === String(r.weight))), 'Eight actual font faces loaded'));
      row.actualEngine = await page.evaluate(() => window.__flightEngine);
      check(row, 'baseline:engine', () => assert.deepEqual(row.actualEngine, { origin: fixture.origin, operations: fixture.operations, events: fixture.events, state: fixture.state, bytes: fixture.bytes }, 'Independent browser and Node engines agree in full'));
      const snapshot = () => page.evaluate(() => ({ state: structuredClone(window.__flightEngine), storage: Object.fromEntries(Object.entries(localStorage)), draws: window.__flightAudit.draws, writes: structuredClone(window.__flightAudit.writes), now: Date.now() }));
      row.before = await snapshot();
      row.geometry = await page.evaluate(() => {
        const rect = n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, font: parseFloat(getComputedStyle(n).fontSize), hit: n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; };
        return { pitch: rect(document.querySelector('[data-tycoon-pitch]')), buttons: [...document.querySelectorAll('button')].map(rect), text: [...document.querySelectorAll('[data-tycoon-pitch] span')].filter(n => n.textContent.trim()).map(rect), documentWidth: document.documentElement.scrollWidth, scrollY };
      });
      check(row, 'baseline:geometry', () => { const g = row.geometry; assert(g.documentWidth <= width + 1); for (const r of [g.pitch, ...g.buttons]) assert(r.x >= -1 && r.right <= width + 1 && r.y >= -1 && r.bottom <= row.height + 1); assert(g.buttons.every(r => r.width >= 44 && r.height >= 44 && r.hit)); assert(g.text.every(r => r.font >= 12)); });
      for (const name of reduced ? ['compressed'] : ['same', 'opposite', 'compressed']) {
        const button = page.getByRole('button', { name, exact: true });
        if (width < 1000) await button.tap(); else { await button.focus(); await page.keyboard.press('Enter'); }
        const shot = async suffix => { const file = `${row.id}-${name}-${suffix}.png`; await page.screenshot({ path: path.join(OUT, file) }); row.screenshots.push(file); };
        await shot('started');
        if (!reduced) { await page.waitForTimeout(360); await shot('moving'); }
        await page.waitForFunction(() => window.__flightRun?.finished, undefined, { timeout: 12000 });
        const run = await page.evaluate(() => window.__flightRun); row.runs.push(run); write(`${row.id}-${name}-frames.json`, run); await shot('finished'); save();
        check(row, 'baseline:callback-order', () => assert.deepEqual(run.ends.map(e => e.id), run.replays.map(e => e.id), 'Real component ends each actual replay once in order'));
        if (reduced) check(row, 'reduced:no-flight', () => assert(run.frames.every(f => f.id === null && f.side === 'play' && f.animations.length === 0), 'Reduced motion never shows a goal flight'));
        else for (const replay of run.replays) {
          const frames = run.frames.filter(f => Number(f.id) === replay.id), landing = name === 'compressed' && run.replays.indexOf(replay) < run.replays.length - 2;
          check(row, 'baseline:event-identity', () => { assert(frames.length); assert(frames.every(f => f.side === replay.side && Number(f.minute) === replay.minute)); });
          if (!frames.length) continue;
          const dest = replay.side === 'for' ? 0.97 : 0.03, tolerance = 1 / frames[0].pitch.width;
          if (landing) check(row, 'landing:immediate', () => assert(frames.every(f => f.landed && Math.abs(f.x - dest) <= tolerance && f.animations.length === 0), 'Compressed replay lands immediately at its actual net'));
          else {
            check(row, 'flight:origin', () => assert(Math.abs(frames[0].x - 0.5) <= tolerance && Math.abs(frames[0].y - 0.5) <= 1 / frames[0].pitch.height, `Replay ${replay.id} starts a fresh field-center flight`));
            check(row, 'flight:travel', () => assert(frames.some(f => { const progress = (f.x - 0.5) / (dest - 0.5); return progress > 0.1 && progress < 0.9; }), `Replay ${replay.id} physically travels between field and net`));
            check(row, 'flight:destination', () => assert(Math.abs(frames.at(-1).x - dest) <= tolerance, `Replay ${replay.id} reaches the correct net`));
            check(row, 'flight:duration', () => assert(frames.some(f => f.animations.some(a => a.name === 'stShot' && a.duration === 700)), 'Actual browser flight has the unchanged 700ms duration'));
          }
          check(row, 'baseline:pitch-containment', () => assert(frames.every(f => f.ball.x >= f.pitch.x - 1 && f.ball.right <= f.pitch.right + 1 && f.ball.y >= f.pitch.y - 1 && f.ball.bottom <= f.pitch.bottom + 1), 'Every measured ball frame stays in the pitch'));
        }
        check(row, 'baseline:return-to-play', () => assert.equal(run.frames.at(-1)?.side, 'play'));
      }
      row.after = await snapshot(); row.input = await page.evaluate(() => window.__flightAudit.input);
      check(row, 'baseline:held-state-save-rng-clock', () => assert.deepEqual(row.after, row.before, 'Rendering and completing replays preserves full state, actual save bytes, RNG, writes and clock'));
      check(row, 'baseline:storage', () => { assert.deepEqual(row.after.storage, storage); assert.deepEqual(row.after.writes, []); });
      check(row, 'baseline:trusted-input', () => assert(row.input.some(e => e.type === 'click' && e.trusted && e.target?.startsWith('start-'))));
      check(row, 'baseline:errors', () => { assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.routeErrors, []); });
    } finally { await context.close(); save(); }
  }
  assert.deepEqual(report.forwarded, [], 'No unexpected request is forwarded or hidden'); assert.deepEqual(report.sockets, []);
  assert(report.cases.every(row => row.routeErrors.length === 0), 'Every route exception remains a fatal setup failure after context closure');
  report.complete = true;
} catch (error) { report.runtimeError = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  await browser?.close();
  report.sourceAfter = sources(); report.buildAfter = Object.keys(report.buildBefore).length ? hashes(['dist']) : {}; report.assetsAfter = assetHashes();
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.assetsAfter, report.assetsBefore); assert.equal(hash(fs.readFileSync(PITCH)), report.component.sha256); }
  catch (error) { report.sourceHoldError = { name: error.name, message: error.message }; report.complete = false; }
  save();
}
const passed = report.complete && !report.runtimeError && !report.sourceHoldError && report.failures.length === 0;
console.log(`Tycoon goal flight ${ARM}: ${report.cases.length} cases, ${report.failures.length} assertion failures, complete=${report.complete}.`);
process.exitCode = passed ? 0 : 1;
