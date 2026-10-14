// Remote-only prepared shared pitch, with fictional figures and caller-supplied save lines.
// Actual SVG snapshots and compositor traces do not establish a real match or continuous painted motion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const PARENT = '8e70dcf0fcfe0d9554881d73cfcfa2fea9414faf';
const MOTION = 'src/components/pitch-motion/motion.tsx';
const ORIGINAL_SHA = '426d40b1cdc5339cf800691da121a139934f626aefe97aad953998fdee49ebcb';
const CANDIDATE_SHA = 'bbb179f32359a3780d30be574eb39a01ec755398ff457535467205a3c307d007';
const BINARY_ARMS_SHA = 'c63fbe6f19cf4101c0c9fd9d51990d87f9bfd787bcf9fe99082d608b9b9c422b';
const MODEL_FAULTS = ['save recovery missing: me save keeps the defending keeper pose',
  'save recovery missing: opp save keeps the defending keeper pose', 'save recovery geometry: keeper arms blend from caught to standing'];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
const FILES = [MOTION, 'src/components/pitch-motion/PitchMotion.tsx', 'src/components/pitch-motion/scene.ts',
  'src/components/pitch-motion/contract.ts', 'src/components/pitch-motion/PitchSurface.tsx', 'src/components/pitch-motion/pitchMotion.css',
  'src/lib/keyedRng.ts', 'src/test/pitchSaveRecovery.test.tsx', 'scripts/simPitchSaveRecovery.mjs',
  'scripts/playPitchSaveRecovery.mjs', '.github/workflows/pitch-save-recovery.yml', 'scripts/lib/playwrightLoader.mjs'];
const TICKS = [['Start save', 10], ['Terminal', 10 + 1.05 - .001], ['First recovery', 10 + 1.05 + .001],
  ['Quarter recovery', 10 + 1.05 + .076], ['Mid recovery', 10 + 1.05 + .151],
  ['Three quarter recovery', 10 + 1.05 + .226], ['Neutral', 10 + 1.05 + .301]];
const ROWS = [{ side: 'me', keeper: 'o0', dive: -68, terminal: { x: 43, y: 8 } },
  { side: 'opp', keeper: 'm0', dive: 68, terminal: { x: 57, y: 92 } }];
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = bytes => bytes.toString().replace(/\r\n/g, '\n');
const json = value => JSON.stringify(value);
const read = file => fs.readFileSync(file);
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file,
  typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2)); };
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline'); assert.equal(process.env.PITCH_SAVE_PHASE, 'fixed');
assert(process.env.PITCH_SAVE_OUT && path.isAbsolute(process.env.PITCH_SAVE_OUT), 'Absolute proof root required.');
const ARTIFACTS = process.env.PITCH_SAVE_OUT, OUT = path.join(ARTIFACTS, 'browser'); fs.mkdirSync(OUT, { recursive: true });
const report = { status: 'running', sourceHead: git(['rev-parse', 'HEAD']).trim(), parent: PARENT,
  scope: 'prepared-fictional-actual-shared-binder', checks: 0, setupFailures: 0, failures: [], cases: [], captures: [], sources: [],
  packages: [], installed: [], tools: [], fonts: [], compiled: [], graphs: [], model: [], dist: [], limits: [
    'Supplied fictional figures and two committed save lines, with seven explicit caller clocks. No real match is generated or played.',
    'The visible binder is actual PitchMotion. A disclosed read-only hook wrapper records commits without modifying returned frames.',
    'The unit proof separately covers the retained Manager completion convention. This browser covers the shared null-after-span binder.',
    'Individual settled SVG/PNG snapshots are painting evidence for those snapshots. Layout/rAF rows alone do not establish a painted transition.',
    'No game route, full match, natural speed, live site, outcome, backend award or real-life visual-quality claim is made.' ] };
const check = (ok, label) => { report.checks++; if (!ok) report.failures.push(label); };
const setup = (ok, label) => { check(ok, label); if (!ok) { report.setupFailures++; throw new Error(label); } };
function physical(file, record, collection = report.model) {
  const bytes = read(file); setup(bytes.length === record.bytes && sha(bytes) === record.sha256, 'Physical receipt: ' + file);
  collection.push({ file, bytes: bytes.length, sha256: sha(bytes) });
}
function walkFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = prefix + entry.name, file = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(file, name + '/') : [{ file: name, bytes: fs.statSync(file).size, sha256: sha(read(file)) }];
  });
const progress = clock => { const t = Math.max(0, Math.min(1, (clock - TICKS[2][1]) / .3)); return t * t * (3 - 2 * t); };
function expectedSvg(pose) {
  const dive = pose?.dive ?? 0, catching = pose?.catching ?? 0, recovery = pose?.recovery;
  const y = recovery === undefined ? (dive ? -20 : -3) : -20 + 17 * recovery;
  const x = recovery === undefined ? (dive ? 5 : 11) : 5 + 6 * recovery;
  const arm = recovery === undefined ? (dive ? 5 : 10) : 5 + 5 * recovery;
  const reachX = -25 * Math.sin(dive * Math.PI / 180) * catching;
  const reachY = (3 + 25 * Math.cos(dive * Math.PI / 180)) * catching;
  return { transform: `translate(${reachX} ${reachY}) rotate(${dive} 0 5)`,
    armPath: `M-5-12 ${-arm} ${y}M5-12 ${arm} ${y}`, gloves: [{ x: -x, y }, { x, y }],
    actor: dive ? 'dive' : 'stand', gloveCount: catching ? 2 : 0 };
}
function expectedPose(row, arm, clock) {
  if (clock === TICKS[1][1]) return { dive: row.dive, catching: 1 };
  const p = progress(clock);
  return arm === 'normal' && p < 1 ? { dive: row.dive * (1 - p), catching: 1 - p, ...(p > 0 ? { recovery: p } : {}) } : undefined;
}
const wrapper = `import {useLayoutEffect} from 'react';
import {useLiveSimMotion as actual,LivePitchPlayer} from './motion.source.tsx';
export {LivePitchPlayer};
export function useLiveSimMotion(scene,event,clock,active,force){const frame=actual(scene,event,clock,active,force);
 useLayoutEffect(()=>window.__pitch.commit(frame,{clock,active,force,event,scene}));return frame;}`;
const entry = `import React,{useState} from 'react';
import{createRoot}from'react-dom/client';
import{PitchMotion}from'@/components/pitch-motion/PitchMotion';
const clone=x=>JSON.parse(JSON.stringify(x));
const figures=p=>[{key:p+'0',name:p+' keeper',line:'keeper',slot:{x:50,y:90}},
 {key:p+'5',name:p+' defender',line:'defence',slot:{x:38,y:72}},{key:p+'9',name:p+' striker',line:'attack',slot:{x:40,y:28}}];
const input={mine:figures('m'),theirs:figures('o'),feed:[{minute:10,side:window.__SIDE__,kind:'save',text:(window.__SIDE__==='me'?'m':'o')+' striker',flank:window.__SIDE__==='me'?'left':'right'}],span:{from:0,to:20},seed:1368,possession:.5};
const ticks=window.__TICKS__,inputBytes=JSON.stringify(input),tape=[],draws=[],moments=[],clockInputs=[];let latest=null,sequence=0;
const random=Math.random;Math.random=()=>{const value=random();draws.push({ordinal:draws.length+1,value,stack:new Error('Observed presentation draw').stack});return value;};
const projection=point=>{const style=document.createElement('i').style;style.left=point.x+'%';style.top=point.y+'%';return{x:parseFloat(style.left),y:parseFloat(style.top)};};
const read=()=>{const pitch=document.querySelector('[data-cm-live-pitch]'),ball=pitch?.querySelector('[data-cm-ball]');if(!pitch||!ball||!latest)return null;
 const box=pitch.getBoundingClientRect();const players=['opp','me'].flatMap(side=>[...pitch.querySelectorAll('[data-pm-figure="'+side+'"]')].map((node,i)=>{
  const player=(side==='opp'?latest.frame.theirs:latest.frame.mine)[i],svg=node.querySelector('svg'),g=svg.querySelector('g');
  const paths=[...g.querySelectorAll(':scope>path')].map(p=>p.getAttribute('d'));
  return{key:player?.key,side,x:parseFloat(node.style.left),y:parseFloat(node.style.top),svg:{transform:g.getAttribute('transform'),armPath:paths[3],gloves:[...g.querySelectorAll(':scope>circle')].map(p=>({x:Number(p.getAttribute('cx')),y:Number(p.getAttribute('cy'))})),actor:svg.dataset.cmActorPose,gloveCount:g.querySelectorAll('[data-cm-glove]').length},paths};}));
 return{ball:{x:parseFloat(ball.style.left),y:parseFloat(ball.style.top)},players,pitch:{x:box.x,y:box.y,width:box.width,height:box.height},phase:pitch.dataset.cmMotionPhase};};
const sample=kind=>{const row={kind,sequence:++sequence,now:performance.now(),clock:latest?.clock??null,frame:latest?.frame??null,dom:read(),expectedProjection:latest?projection(latest.frame.ball):null};tape.push(row);performance.mark('save-'+kind+'-'+row.sequence);return row;};
window.__pitch={commit:(frame,args)=>{latest={clock:args.clock,frame:clone(frame),event:clone(args.event),target:clone(args.scene),active:args.active,reduced:args.force};sample('layout');},
 get:()=>clone(latest),read,sample,tape,input,inputBytes,draws,moments,clockInputs,held:()=>JSON.stringify(input)===inputBytes,
 twoFrames:()=>new Promise(resolve=>requestAnimationFrame(()=>{sample('raf-before-paint');requestAnimationFrame(()=>resolve(sample('raf-after-prior-opportunity')));}))};
function App(){const[clock,setClock]=useState(9.9);return<main><h1>Prepared save recovery</h1><p>Fictional cast. One supplied save at minute10. The caller advances the clock; no football outcome changes.</p>
 <nav>{ticks.map(([label,at])=><button key={label} onClick={()=>{clockInputs.push({label,at});requestAnimationFrame(()=>setClock(at));}}>{label}</button>)}</nav>
 <p data-proof-clock={clock}>Caller clock: {clock.toFixed(3)}</p><PitchMotion {...input} colors={{mine:'#60a5fa',theirs:'#fb923c'}} clock={clock} playing={true} reducedMotion={false} className='proof-pitch' onMoment={(moment,event)=>moments.push({moment,event:clone(event),clock})}/></main>;}
createRoot(document.getElementById('root')).render(<App/>);`;

let browser, server, scratch; const source = new Map(), fonts = new Map();
try {
  for (const file of FILES) { const bytes = read(path.join(ROOT, file)); source.set(file, lf(bytes));
    const beforePath = 'before/' + file; write(path.join(OUT, beforePath), bytes);
    report.sources.push({ file, beforePath, bytes: bytes.length, rawSha256: sha(bytes), sha256: sha(lf(bytes)) }); }
  for (const file of ['package.json', 'package-lock.json', 'bun.lock']) { const bytes = read(path.join(ROOT, file));
    write(path.join(OUT, 'packages', file), bytes); report.packages.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
  const installed = JSON.parse(read(path.join(ARTIFACTS, 'installed.json'))), lock = JSON.parse(read(path.join(ROOT, 'package-lock.json')));
  setup(installed.length > 0 && new Set(installed.map(row => row.file)).size === installed.length, 'Actual unique installed receipt required.');
  for (const row of installed) { const bytes = read(path.join(ROOT, row.file, 'package.json'));
    setup(sha(bytes) === row.sha256 && JSON.parse(bytes).version === row.version && row.version === lock.packages[row.file]?.version, 'Installed locked package: ' + row.file); }
  report.installed = installed;
  for (const name of ['react', 'react-dom', 'esbuild', 'playwright', 'playwright-core']) { const file = require.resolve(name + '/package.json'), bytes = read(file);
    write(path.join(OUT, 'tools', name + '.json'), bytes); report.tools.push({ name, file, version: JSON.parse(bytes).version, bytes: bytes.length, sha256: sha(bytes) }); }
  const modelDir = path.join(ARTIFACTS, 'normal'), modelPath = path.join(modelDir, 'source.json'), model = JSON.parse(read(modelPath));
  report.model.push({ file: modelPath, bytes: read(modelPath).length, sha256: sha(read(modelPath)) });
  setup(model.phase === 'fixed' && model.complete === true && model.arm === 'normal' && model.head === report.sourceHead && model.parent === PARENT
    && model.tests.total === 10 && model.tests.passed === 10 && model.tests.failed === 0 && json(model.tests.expected) === '[]'
    && model.child.status === 0 && model.child.signal === null && model.child.error === null,
    'Actual fixed model source/head must be complete.');
  report.modelReceipt = model;
  const originalModelPath = path.join(ARTIFACTS, 'original', 'source.json'), originalModel = JSON.parse(read(originalModelPath));
  report.model.push({ file: originalModelPath, bytes: read(originalModelPath).length, sha256: sha(read(originalModelPath)) });
  setup(originalModel.phase === 'fixed' && originalModel.complete === true && originalModel.arm === 'original' && originalModel.head === report.sourceHead && originalModel.parent === PARENT
    && originalModel.tests.total === 10 && originalModel.tests.failed === 3 && originalModel.tests.passed === 7
    && json(originalModel.tests.expected) === json(MODEL_FAULTS)
    && originalModel.child.status === 1 && originalModel.child.signal === null && originalModel.child.error === null
    && originalModel.control.kind === 'original' && originalModel.control.beforeSha256 === CANDIDATE_SHA
    && originalModel.control.afterSha256 === ORIGINAL_SHA, 'Actual prior whole-original model control must qualify3/7.');
  report.originalModelReceipt = originalModel;
  const binaryDir = path.join(ARTIFACTS, 'binaryarms'), binaryModelPath = path.join(binaryDir, 'source.json'), binaryModel = JSON.parse(read(binaryModelPath));
  report.model.push({ file: binaryModelPath, bytes: read(binaryModelPath).length, sha256: sha(read(binaryModelPath)) });
  setup(binaryModel.phase === 'fixed' && binaryModel.complete === true && binaryModel.arm === 'binaryarms'
    && binaryModel.head === report.sourceHead && binaryModel.parent === PARENT
    && binaryModel.tests.total === 10 && binaryModel.tests.failed === 1 && binaryModel.tests.passed === 9
    && json(binaryModel.tests.expected) === json([MODEL_FAULTS[2]])
    && binaryModel.child.status === 1 && binaryModel.child.signal === null && binaryModel.child.error === null
    && binaryModel.control.kind === 'binaryarms' && binaryModel.control.beforeSha256 === CANDIDATE_SHA
    && binaryModel.control.afterSha256 === BINARY_ARMS_SHA, 'Actual recovery-only binary-arm model control must qualify1/9.');
  report.binaryModelReceipt = binaryModel;
  for (const [dir, receipt] of [[path.join(ARTIFACTS, 'original'), originalModel], [binaryDir, binaryModel]]) {
    const controlFile = path.join(dir, receipt.control.path), controlBody = read(controlFile);
    physical(controlFile, { bytes: controlBody.length, sha256: receipt.control.afterSha256 });
    for (const graph of receipt.graphs) { for (const item of [...graph.inputs, ...graph.compiled]) physical(path.join(dir, item.path), item);
      setup(sha(read(path.join(dir, graph.name, 'motion.loaded.tsx'))) === graph.motionSha256, 'Actual compiled control motion: ' + receipt.arm + '/' + graph.name); }
    setup(receipt.graphs.find(graph => graph.name === 'candidate')?.motionSha256 === receipt.control.afterSha256
      && receipt.graphs.find(graph => graph.name === 'original')?.motionSha256 === ORIGINAL_SHA, 'Actual controlled and parent graphs: ' + receipt.arm);
  }
  for (const item of model.before) { const bytes = read(path.join(modelDir, item.path));
    setup(bytes.length === item.bytes && sha(bytes) === item.sha256 && sha(lf(read(path.join(ROOT, item.file)))) === item.sha256, 'Actual model before source: ' + item.file); }
  for (const item of model.parentBindings) setup(sha(lf(git(['show', PARENT + ':' + item.file]))) === item.parentSha256, 'Actual whole parent: ' + item.file);
  for (const graph of model.graphs) { for (const item of [...graph.inputs, ...graph.compiled]) physical(path.join(modelDir, item.path), item);
    setup(sha(read(path.join(modelDir, graph.name, 'motion.loaded.tsx'))) === graph.motionSha256, 'Actual compiled model motion: ' + graph.name); }
  const current = source.get(MOTION), parent = lf(git(['show', PARENT + ':' + MOTION]));
  setup(sha(parent) === ORIGINAL_SHA && sha(current) === CANDIDATE_SHA, 'Exact reviewed candidate and whole parent bodies required.');
  let inverse = current; for (const span of [...model.changes].reverse()) { setup(inverse.split(span.after).length - 1 === 1, 'Unique recorded inverse span.'); inverse = inverse.replace(span.after, span.before); }
  setup(inverse === parent, 'All declared recovery spans must restore the whole actual parent.');
  write(path.join(OUT, 'motion.parent.tsx'), parent); write(path.join(OUT, 'motion.inverse.tsx'), inverse);
  report.control = { kind: 'whole-original', beforeSha256: sha(current), afterSha256: sha(parent), parentSha256: sha(parent), effective: current !== parent, changes: model.changes };
  setup(process.env.FREE_KICK_FONT_CACHE && path.isAbsolute(process.env.FREE_KICK_FONT_CACHE), 'Absolute retained font cache required.');
  const cache = path.resolve(process.env.FREE_KICK_FONT_CACHE), manifest = read(path.join(cache, 'manifest.json')); report.fontManifestSha256 = sha(manifest);
  for (const row of JSON.parse(manifest)) { const body = read(path.join(cache, row.file)); setup(sha(body) === row.sha256, 'Actual cached font: ' + row.url);
    fonts.set(row.url, { body, contentType: row.contentType }); write(path.join(OUT, 'fonts', row.file), body); report.fonts.push(row); }
  setup(fonts.has(FONT_CSS), 'Actual declared font stylesheet must be retained.');
  report.dist = walkFiles(path.join(ROOT, 'dist')); setup(report.dist.length > 0, 'Actual application build receipt required, without route gameplay credit.');
  fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true }); scratch = fs.mkdtempSync(path.join(ROOT, 'tmp/pitch-save-browser-'));
  write(path.join(OUT, 'probe.entry.tsx'), entry); write(path.join(OUT, 'readonly-hook.tsx'), wrapper);
  for (const arm of ['normal', 'original']) {
    const dir = path.join(scratch, arm); fs.mkdirSync(dir); write(path.join(dir, 'entry.tsx'), entry); write(path.join(dir, 'readonly.tsx'), wrapper);
    write(path.join(dir, 'motion.source.tsx'), arm === 'normal' ? current : parent); write(path.join(dir, 'pitchMotion.css'), source.get('src/components/pitch-motion/pitchMotion.css'));
    const result = await build({ entryPoints: [path.join(dir, 'entry.tsx')], outfile: path.join(OUT, arm + '.js'), bundle: true,
      format: 'esm', platform: 'browser', jsx: 'automatic', metafile: true, logLevel: 'silent', plugins: [{ name: 'actual-shared-pitch', setup(builder) {
        builder.onResolve({ filter: /^@\// }, args => args.path === '@/components/pitch-motion/motion' ? { path: path.join(dir, 'readonly.tsx') }
          : builder.resolve('./' + args.path.slice(2), { resolveDir: path.join(ROOT, 'src'), kind: args.kind })); } }] });
    setup(Object.keys(result.metafile.inputs).every(file => !/clubManager|soccerCareerEngine|LiveSimScreen/.test(file)), 'No game engine in the actual browser graph.');
    write(path.join(OUT, arm + '.meta.json'), result.metafile); const inputs = [];
    for (const file of Object.keys(result.metafile.inputs)) { const absolute = path.resolve(ROOT, file), relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
      setup(!relative.startsWith('../') && !path.isAbsolute(relative), 'Browser input must stay under the current root.');
      const body = read(absolute), retained = arm + '/inputs/' + relative; write(path.join(OUT, retained), body); inputs.push({ file, path: retained, bytes: body.length, sha256: sha(body) }); }
    report.graphs.push({ arm, inputs }); for (const suffix of ['.js', '.css']) { const file = arm + suffix, body = read(path.join(OUT, file)); report.compiled.push({ file, bytes: body.length, sha256: sha(body) }); }
  }
  write(path.join(OUT, 'source.json'), report);
  server = http.createServer((req, res) => { const url = new URL(req.url, 'http://localhost'), arm = url.searchParams.get('arm'), side = url.searchParams.get('side');
    if (req.method !== 'GET') { res.writeHead(405); res.end('Read only'); return; }
    let body, type; if (url.pathname === '/' && ['normal', 'original'].includes(arm) && ROWS.some(row => row.side === side)) {
      type = 'text/html'; body = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="' + FONT_CSS.replaceAll('&', '&amp;') + '"><link rel="stylesheet" href="/' + arm + '.css"><style>body{margin:0;background:#071b13;color:#f8fafc;font:15px Inter,system-ui}main{padding:12px}h1{font:20px "Space Grotesk",system-ui}p{max-width:720px}nav{display:flex;gap:5px;flex-wrap:wrap}button{font:inherit;padding:7px;border:1px solid #94a3b8;border-radius:6px;background:#173b2b;color:white}.proof-pitch{width:min(84vw,420px);margin:auto}</style></head><body><div id="root"></div><script>window.__SIDE__=' + json(side) + ';window.__TICKS__=' + json(TICKS) + ';</script><script type="module" src="/' + arm + '.js"></script></body></html>';
    } else if (/^\/(normal|original)\.(js|css)$/.test(url.pathname)) { type = url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css'; body = read(path.join(OUT, url.pathname.slice(1))); }
    else { res.writeHead(404); res.end('Unknown resource'); return; } res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = 'http://127.0.0.1:' + server.address().port;
  browser = await pw.chromium.launch({ headless: true }); report.browserVersion = browser.version();
  for (const arm of ['normal', 'original']) for (const width of [390, 1280]) for (const row of ROWS) {
    const id = arm + '-' + width + '-' + row.side, dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
    const record = { id, arm, width, side: row.side, keeper: row.keeper, stages: [], requests: [], responses: [], aborts: [], diagnostics: [], errors: [], screenshots: [] }; report.cases.push(record);
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1,
      isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'no-preference', serviceWorkers: 'block' }); const page = await context.newPage();
    await context.route('**/*', route => { const request = route.request(), url = new URL(request.url()); record.requests.push({ url: url.href, method: request.method() });
      if (url.origin === base && request.method() === 'GET') return route.continue();
      if (request.method() === 'GET' && fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href), headers: { 'access-control-allow-origin': '*' } });
      record.aborts.push({ url: url.href, method: request.method() }); return route.abort('blockedbyclient'); });
    await context.routeWebSocket('**/*', socket => { record.errors.push('Unexpected WebSocket: ' + socket.url()); socket.close(); });
    page.on('pageerror', error => record.errors.push(error.message)); page.on('console', message => { if (message.type() !== 'error') return;
      const url = message.location().url, text = message.text(); if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && record.aborts.some(row => row.url === url)) record.diagnostics.push({ url, text });
      else record.errors.push(url + ': ' + text); });
    page.on('response', response => { record.responses.push({ url: response.url(), status: response.status() }); if (response.status() >= 400) record.errors.push('Bad owned/cache response: ' + response.url()); });
    page.on('requestfailed', request => { if (new URL(request.url()).origin === base) record.errors.push('Owned asset failure: ' + request.url()); });
    const session = await context.newCDPSession(page); await session.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.screenshot', transferMode: 'ReturnAsStream' });
    try {
      await page.goto(base + '/?arm=' + arm + '&side=' + row.side, { waitUntil: 'networkidle' }); await page.waitForSelector('[data-cm-live-pitch]'); await page.evaluate(() => document.fonts.ready);
      const activate = async ([label, at]) => { const button = page.getByRole('button', { name: label, exact: true }); if (width === 390) await button.tap(); else await button.click();
        await page.waitForFunction(clock => window.__pitch.get()?.clock === clock, at); await page.evaluate(() => window.__pitch.twoFrames()); };
      const capture = async stage => { const panel = page.locator('[data-cm-live-pitch]'); await panel.scrollIntoViewIfNeeded();
        const layout = await panel.evaluate(async element => { let previous = '', stable = 0, observed; for (let i = 0; i < 60; i++) { await new Promise(resolve => requestAnimationFrame(resolve));
          const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, Math.max(0, r.y) + (Math.min(innerHeight, r.bottom) - Math.max(0, r.y)) / 2);
          observed = { x: r.x, y: r.y, width: r.width, height: r.height, opacity: Number(getComputedStyle(element).opacity), painted: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && !!hit && element.contains(hit), overflow: document.documentElement.scrollWidth > innerWidth + 1, finite: element.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length };
          const sig = JSON.stringify(observed); stable = sig === previous ? stable + 1 : 1; previous = sig; if (stable >= 4 && observed.painted && observed.opacity >= .99 && !observed.overflow && observed.finite === 0) break; } return { ...observed, stable }; });
        check(layout.stable >= 4 && layout.painted && layout.opacity >= .99 && !layout.overflow && layout.finite === 0, id + ': settled original geometry ' + stage);
        const file = id + '-' + stage + '.png'; assert(!fs.existsSync(path.join(OUT, file)), 'Refuse capture overwrite.'); await page.screenshot({ path: path.join(OUT, file), fullPage: false, animations: 'allow' });
        const bytes = read(path.join(OUT, file)); report.captures.push({ id, arm, width, side: row.side, stage, file, bytes: bytes.length, sha256: sha(bytes), original: true, layout }); record.screenshots.push(file); };
      for (const tick of TICKS) { await activate(tick); const stage = await page.evaluate(() => ({ state: window.__pitch.get(), dom: window.__pitch.read(), moments: window.__pitch.moments }));
        record.stages.push({ label: tick[0], ...stage }); if (['Terminal', 'First recovery', 'Mid recovery', 'Neutral'].includes(tick[0])) await capture(tick[0].toLowerCase().replaceAll(' ', '-'));
        if (tick[0] === 'Mid recovery') { const held = await page.evaluate(() => ({ state: window.__pitch.get(), dom: window.__pitch.read(), moments: window.__pitch.moments })); await page.evaluate(() => window.__pitch.twoFrames());
          const after = await page.evaluate(() => ({ state: window.__pitch.get(), dom: window.__pitch.read(), moments: window.__pitch.moments })); record.held = { before: held, after }; check(json(held) === json(after), id + ': held caller clock freezes actual SVG and callbacks'); } }
      const final = await page.evaluate(() => ({ tape: window.__pitch.tape, draws: window.__pitch.draws, input: window.__pitch.input, inputBytes: window.__pitch.inputBytes,
        inputHeld: window.__pitch.held(), moments: window.__pitch.moments, clockInputs: window.__pitch.clockInputs })); record.final = final;
      write(path.join(dir, 'frames.json'), record); const done = new Promise(resolve => session.once('Tracing.tracingComplete', resolve)); await session.send('Tracing.end');
      const stream = (await done).stream; let raw = ''; for (;;) { const part = await session.send('IO.read', { handle: stream }); raw += part.base64Encoded ? Buffer.from(part.data, 'base64').toString('utf8') : part.data; if (part.eof) break; } await session.send('IO.close', { handle: stream });
      write(path.join(dir, 'compositor.trace.json'), raw); const trace = JSON.parse(raw); record.trace = { bytes: Buffer.byteLength(raw), sha256: sha(raw), paints: trace.traceEvents.filter(e => e.name === 'Paint').length, screenshots: trace.traceEvents.filter(e => e.name === 'Screenshot').length };
      const terminal = record.stages.find(stage => stage.label === 'Terminal'), first = final.tape.find(stage => stage.kind === 'layout' && stage.clock === TICKS[2][1]);
      const actor = stage => stage.dom.players.find(player => player.key === row.keeper).svg;
      check(terminal.state.frame.phase === 'caught' && json(terminal.state.frame.ball) === json(row.terminal) && json(terminal.state.frame.poses[row.keeper]) === json({ dive: row.dive, catching: 1 }), id + ': literal actual save terminal');
      const poseContinuous = json(first.frame.poses[row.keeper]) === json(terminal.state.frame.poses[row.keeper]);
      const svgContinuous = json(actor(first)) === json(actor(terminal)); record.detector = { poseContinuous, svgContinuous, expected: arm === 'normal' };
      check(poseContinuous === (arm === 'normal') && svgContinuous === (arm === 'normal'), id + ': effective first-pose and SVG continuity detector');
      for (const stage of record.stages.slice(1)) { const wantedPose = expectedPose(row, arm, stage.state.clock), actualPose = stage.state.frame.poses[row.keeper];
        check(json(actualPose) === json(wantedPose), id + ': independent keeper pose ' + stage.label);
        check(json(actor(stage)) === json(expectedSvg(wantedPose)), id + ': independent actual transform/glove/arm path ' + stage.label); }
      if (arm === 'normal') {
        const recovery = record.stages.filter(stage => ['First recovery', 'Quarter recovery', 'Mid recovery', 'Three quarter recovery', 'Neutral'].includes(stage.label));
        const dives = recovery.map(stage => Math.abs(stage.state.frame.poses[row.keeper]?.dive ?? 0));
        const gloveX = recovery.map(stage => actor(stage).gloves[1].x), gloveY = recovery.map(stage => actor(stage).gloves[1].y);
        record.monotone = { dives, gloveX, gloveY };
        check(dives.every((value, i) => !i || value < dives[i - 1]) && gloveX.every((value, i) => !i || value > gloveX[i - 1])
          && gloveY.every((value, i) => !i || value > gloveY[i - 1]), id + ': actual quarter/mid/three-quarter SVG approaches the neutral geometry');
      }
      check(final.tape.filter(stage => stage.dom).every(stage => json(stage.dom.ball) === json(stage.expectedProjection)), id + ': native surface renders exact browser-normalized hook ball coordinates');
      check(final.inputHeld && final.draws.length === 0 && json(final.clockInputs) === json(TICKS.map(([label, at]) => ({ label, at }))), id + ': actual input and finite caller clocks/RNG');
      check(json(final.moments.map(value => value.moment)) === json(['strike', 'caught']) && final.moments.every(value => json(value.event) === json(final.input.feed[0])), id + ': actual shared binder callbacks once');
      check(record.errors.length === 0 && record.requests.every(value => value.method === 'GET') && record.trace.paints > 0 && record.trace.screenshots > 0, id + ': actual transport/errors/compositor receipts');
      record.framesSha256 = sha(read(path.join(dir, 'frames.json')));
    } finally { await context.close(); }
  }
  for (const normal of report.cases.filter(row => row.arm === 'normal')) { const original = report.cases.find(row => row.arm === 'original' && row.width === normal.width && row.side === normal.side);
    for (let i = 0; i < normal.stages.length; i++) { const a = structuredClone(normal.stages[i].state.frame), b = structuredClone(original.stages[i].state.frame); delete a.poses[normal.keeper]; delete b.poses[normal.keeper];
      check(json(a) === json(b), normal.id + ': complete original frame outside the owned defending keeper pose ' + i);
      for (const player of normal.stages[i].dom.players) if (player.key !== normal.keeper) check(json(player) === json(original.stages[i].dom.players.find(value => value.key === player.key)), normal.id + ': every other actual figure held ' + i); }
    check(json(normal.final.moments) === json(original.final.moments), normal.id + ': whole actual callback vector held'); }
  check(report.cases.length === 8 && report.cases.filter(row => row.arm === 'normal' && row.detector?.poseContinuous && row.detector?.svgContinuous).length === 4
    && report.cases.filter(row => row.arm === 'original' && !row.detector?.poseContinuous && !row.detector?.svgContinuous).length === 4, 'Four normal and four effective whole-parent journeys.');
  check(report.captures.length === 32 && new Set(report.captures.map(row => row.file)).size === 32 && report.captures.every(row => row.original), 'Thirty-two distinct untouched originals.');
  report.sourceHeld = report.sources.every(row => sha(read(path.join(ROOT, row.file))) === row.rawSha256); report.packageHeld = report.packages.every(row => sha(read(path.join(ROOT, row.file))) === row.sha256);
  report.installedHeld = installed.every(row => sha(read(path.join(ROOT, row.file, 'package.json'))) === row.sha256); report.toolHeld = report.tools.every(row => sha(read(row.file)) === row.sha256);
  report.fontHeld = sha(read(path.join(cache, 'manifest.json'))) === report.fontManifestSha256 && report.fonts.every(row => sha(read(path.join(cache, row.file))) === row.sha256);
  report.distHeld = json(walkFiles(path.join(ROOT, 'dist'))) === json(report.dist); report.compiledHeld = report.compiled.every(row => sha(read(path.join(OUT, row.file))) === row.sha256);
  report.graphHeld = report.graphs.every(graph => graph.inputs.every(row => sha(read(path.resolve(ROOT, row.file))) === row.sha256 && sha(read(path.join(OUT, row.path))) === row.sha256));
  report.modelHeld = report.model.every(row => sha(read(row.file)) === row.sha256)
    && model.before.every(row => sha(lf(read(path.join(ROOT, row.file)))) === row.sha256);
  check(report.sourceHeld && report.packageHeld && report.installedHeld && report.toolHeld && report.fontHeld && report.distHeld && report.compiledHeld && report.graphHeld && report.modelHeld, 'All nine final physical holds.');
  report.summary = { normalJourneys: report.cases.filter(row => row.arm === 'normal').length, controlJourneys: report.cases.filter(row => row.arm === 'original').length,
    originals: report.captures.length, callerClockInputs: report.cases.reduce((n, row) => n + row.final.clockInputs.length, 0),
    actualMoments: report.cases.reduce((n, row) => n + row.final.moments.length, 0), actualDraws: report.cases.reduce((n, row) => n + row.final.draws.length, 0),
    aborts: report.cases.reduce((n, row) => n + row.aborts.length, 0), diagnostics: report.cases.reduce((n, row) => n + row.diagnostics.length, 0),
    installed: installed.length, failures: report.failures.length, setupFailures: report.setupFailures };
  report.status = report.failures.length ? 'failed' : 'passed'; write(path.join(OUT, 'report.json'), report); assert.equal(report.failures.length, 0, report.failures.join('\n'));
  console.log(`Actual shared save recovery: ${report.checks} checks, four normal/four effective whole-parent journeys,32 originals,zero outcomes generated.`);
  console.log('Complete nonpose parent frames and actual callback vectors held; original SVG snapshots and compositor traces retained separately.');
} catch (error) { report.failures.push(error.stack ?? String(error)); report.status = 'failed'; throw error;
} finally { write(path.join(OUT, 'report.json'), report); if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  if (scratch) { assert.equal(path.dirname(scratch), path.join(ROOT, 'tmp')); assert(path.basename(scratch).startsWith('pitch-save-browser-')); fs.rmSync(scratch, { recursive: true, force: true }); } }
