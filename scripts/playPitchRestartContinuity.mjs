// Standalone prepared pitch presentation. No real match or engine outcome is generated here.
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
const PARENT = '082fc2774c8aa9f919c14efa33bfc3fbfc599597';
const MOTION = 'src/components/pitch-motion/motion.tsx';
const OLD = '  const base = reduced ? scene : between(travel.from, travel.to, smooth((clock - travel.at) / .3));';
const FIXED = '  const travelForFrame = scene !== travel.to ? { from: current.current, to: scene, at: clock } : travel;\n  const base = reduced ? scene : between(travelForFrame.from, travelForFrame.to, smooth((clock - travelForFrame.at) / .3));';
const sourceFiles = [MOTION, 'src/components/pitch-motion/scene.ts', 'src/components/pitch-motion/contract.ts', 'src/components/pitch-motion/PitchSurface.tsx', 'src/components/pitch-motion/pitchMotion.css', 'src/lib/keyedRng.ts', 'src/test/pitchRestartContinuity.test.tsx', 'scripts/simPitchRestartContinuity.mjs', 'scripts/playPitchRestartContinuity.mjs', '.github/workflows/pitch-restart-continuity.yml', 'scripts/lib/playwrightLoader.mjs'];
const rows = [
  { kind: 'goal', restart: 'kickoff', phase: 'net', terminal: { x: 43, y: 1 }, target: { x: 50, y: 50 } },
  { kind: 'shot', restart: 'goalkick', phase: 'wide', terminal: { x: 26, y: 1 }, target: { x: 44, y: 5.5 } },
  { kind: 'save', restart: 'keeper', phase: 'caught', terminal: { x: 43, y: 8 }, target: { x: 50, y: 10 } },
];
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.toString().replace(/\r\n/g, '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2)); };
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline'); assert.equal(process.env.PITCH_RESTART_PHASE, 'fixed');
assert.ok(process.env.PITCH_RESTART_OUT && path.isAbsolute(process.env.PITCH_RESTART_OUT), 'Absolute retained proof root required');
const OUT = path.join(process.env.PITCH_RESTART_OUT, 'browser'); fs.mkdirSync(OUT, { recursive: true });
const report = { head: git(['rev-parse', 'HEAD']), parent: PARENT, scope: 'prepared-fictional-shared-pitch', cases: [], captures: [], sources: [], packages: [], compiled: [], tools: [], transport: [], failures: [], success: false };
const check = (ok, name) => { if (!ok) report.failures.push(name); };
const source = new Map();
for (const file of sourceFiles) {
  const bytes = fs.readFileSync(path.join(ROOT, file)); const text = lf(bytes); source.set(file, text);
  const beforePath = path.join('before', file + '.before').replaceAll('\\', '/'); write(path.join(OUT, beforePath), bytes);
  report.sources.push({ file, rawSha256: sha(bytes), sha256: sha(text), beforePath });
}
for (const file of ['package.json', 'package-lock.json', 'bun.lock']) report.packages.push({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) });
for (const name of ['react', 'react-dom', 'esbuild', 'playwright']) { const file = require.resolve(name + '/package.json'); const bytes = fs.readFileSync(file); report.tools.push({ name, file, version: JSON.parse(bytes).version, sha256: sha(bytes) }); }
const installed = JSON.parse(fs.readFileSync(path.join(process.env.PITCH_RESTART_OUT, 'installed.json')));
for (const row of installed) { const bytes = fs.readFileSync(path.join(ROOT, row.file, 'package.json')); assert.equal(JSON.parse(bytes).version, row.version); assert.equal(sha(bytes), row.sha256); }
report.installedCount = installed.length;
const before = source.get(MOTION); assert.equal(before.split(FIXED).length - 1, 1);
const parent = lf(execFileSync('git', ['show', PARENT + ':' + MOTION], { cwd: ROOT }));
const oldRender = before.replace(FIXED, OLD); assert.notEqual(oldRender, before); assert.equal(oldRender, parent);
write(path.join(OUT, 'motion.parent.tsx'), parent); write(path.join(OUT, 'motion.control.tsx'), oldRender);
report.control = { file: MOTION, anchor: FIXED, replacement: OLD, offset: before.indexOf(FIXED), beforeSha256: sha(before), afterSha256: sha(oldRender), parentSha256: sha(parent), effective: true };
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true }); const scratch = fs.mkdtempSync(path.join(ROOT, 'tmp/pitch-browser-'));
const entry = `import React, {useState,useMemo,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {useLiveSimMotion,LivePitchPlayer} from '@/components/pitch-motion/motion';
import {pitchPlan,pitchScene,pitchSceneKey,pitchBeatAt} from '@/components/pitch-motion/scene';
import {ACTION_SPAN} from '@/components/pitch-motion/contract';
import {PitchSurface,pitchSpot} from '@/components/pitch-motion/PitchSurface';
const clone=x=>JSON.parse(JSON.stringify(x));
const figures=p=>[{key:p+'0',name:p+' keeper',line:'keeper',slot:{x:50,y:90}},{key:p+'5',name:p+' defender',line:'defence',slot:{x:38,y:72}},{key:p+'9',name:p+' striker',line:'attack',slot:{x:40,y:28}}];
const input={mine:figures('m'),theirs:figures('o'),feed:[{minute:10,side:'me',kind:window.__KIND__,text:'m striker',flank:'left'}],span:{from:0,to:20},seed:1366,possession:.5};
const inputBytes=JSON.stringify(input); const tape=[]; const draws=[]; const random=Math.random;
Math.random=()=>{const value=random();draws.push(value);return value;};
let latest=null,sequence=0;
const project=point=>{const style=document.createElement('i').style;style.left=point.x+'%';style.top=point.y+'%';return{x:parseFloat(style.left),y:parseFloat(style.top)};};
const read=()=>{const pitch=document.querySelector('[data-cm-live-pitch]'),ball=document.querySelector('[data-cm-ball]'); if(!pitch||!ball)return null;
 const box=pitch.getBoundingClientRect(),b=ball.getBoundingClientRect();
 return {ball:{x:parseFloat(ball.style.left),y:parseFloat(ball.style.top)},pixelBall:{x:b.x+b.width/2,y:b.y+b.height/2},pitch:{x:box.x,y:box.y,width:box.width,height:box.height},phase:pitch.dataset.cmMotionPhase,
 players:[...document.querySelectorAll('[data-probe-figure]')].map(p=>({key:p.dataset.probeFigure,x:parseFloat(p.style.left),y:parseFloat(p.style.top)}))};};
const sample=(kind)=>{const row={kind,sequence:++sequence,now:performance.now(),clock:latest?.clock??null,dom:read(),expectedProjection:latest?project(latest.frame.ball):null,frame:latest?.frame??null,beat:latest?.beat??null};tape.push(row);performance.mark('pitch-'+kind+'-'+row.sequence);return row;};
function App(){const[clock,setClock]=useState(9.9);const plan=useMemo(()=>pitchPlan(input),[]);const actions=useMemo(()=>plan.actions.map((a,i)=>({...a,key:'committed-'+i})),[plan]);
 const key=pitchSceneKey(plan,clock),scene=useMemo(()=>pitchScene(plan,clock),[key]);const event=actions.find(a=>a.at<=clock&&clock<a.at+ACTION_SPAN)??null;
 const frame=useLiveSimMotion(scene,event,clock,true,false);
 useLayoutEffect(()=>{latest={clock,frame:clone(frame),beat:pitchBeatAt(plan,clock).state,target:clone(scene.ball)};sample('layout');});
 return <main><h1>Prepared pitch restart probe</h1><p>Fictional cast. One supplied {window.__KIND__} line at minute 10. Match outcomes stay in that input.</p><nav>{[['Start action',10],['Terminal',10+ACTION_SPAN-.001],['Restart',10+ACTION_SPAN+.001],['Half return',10+ACTION_SPAN+.151],['Return settled',10+ACTION_SPAN+.311]].map(([label,at])=><button key={label} onClick={()=>requestAnimationFrame(()=>setClock(at))}>{label}</button>)}</nav>
 <p data-clock={clock}>Caller clock: {clock.toFixed(3)}</p><PitchSurface frame={frame} style={{width:'min(84vw,420px)',margin:'auto'}}>{[...frame.mine,...frame.theirs].map(p=><div key={p.key} data-probe-figure={p.key} className='pm-figure' style={pitchSpot(p)}><LivePitchPlayer color={p.key.startsWith('m')?'#60a5fa':'#fb923c'} keeper={p.keeper} pose={frame.poses[p.key]}/></div>)}</PitchSurface></main>;}
window.__pitch={tape,input,inputBytes,draws,read,get:()=>clone(latest),twoFrames:()=>new Promise(resolve=>requestAnimationFrame(()=>{sample('raf-before-paint');requestAnimationFrame(()=>resolve(sample('raf-after-prior-opportunity')));})),held:()=>JSON.stringify(input)===inputBytes};
createRoot(document.getElementById('root')).render(<App/>);`;
write(path.join(OUT, 'probe.entry.tsx'), entry); write(path.join(scratch, 'entry.tsx'), entry);
let browser, server;
try {
  for (const arm of ['normal', 'oldrender']) {
    const motionCopy = path.join(scratch, arm + '.tsx'); write(motionCopy, arm === 'normal' ? before : oldRender);
    write(path.join(scratch, 'pitchMotion.css'), source.get('src/components/pitch-motion/pitchMotion.css'));
    const result = await build({ entryPoints: [path.join(scratch, 'entry.tsx')], outfile: path.join(OUT, arm + '.js'), bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', metafile: true, logLevel: 'silent', plugins: [{ name: 'actual-pitch', setup(b) { b.onResolve({ filter: /^@\// }, a => a.path === '@/components/pitch-motion/motion' ? { path: motionCopy } : b.resolve('./' + a.path.slice(2), { resolveDir: path.join(ROOT, 'src'), kind: a.kind })); } }] });
    assert(Object.keys(result.metafile.inputs).every(file => !/clubManager|soccerCareerEngine|LiveSimScreen/.test(file)));
    write(path.join(OUT, arm + '.meta.json'), result.metafile);
    for (const suffix of ['.js', '.css']) report.compiled.push({ arm, path: arm + suffix, sha256: sha(fs.readFileSync(path.join(OUT, arm + suffix))) });
  }
  write(path.join(OUT, 'source.json'), report);
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'); const arm = url.searchParams.get('arm'), kind = url.searchParams.get('kind');
    let body, type;
    if (url.pathname === '/' && ['normal', 'oldrender'].includes(arm) && rows.some(r => r.kind === kind)) {
      type = 'text/html'; body = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/' + arm + '.css"><style>body{margin:0;background:#071b13;color:#f8fafc;font:16px system-ui}main{padding:14px}h1{font-size:20px}p{max-width:700px}nav{display:flex;gap:6px;flex-wrap:wrap}button{font:inherit;padding:8px;border:1px solid #94a3b8;border-radius:6px;background:#173b2b;color:white}</style></head><body><div id="root"></div><script>window.__KIND__=' + JSON.stringify(kind) + '</script><script type="module" src="/' + arm + '.js"></script></body></html>';
    } else if (/^\/(normal|oldrender)\.(js|css)$/.test(url.pathname)) { type = url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css'; body = fs.readFileSync(path.join(OUT, url.pathname.slice(1))); }
    else { res.writeHead(404); res.end('Unknown probe resource'); return; }
    report.transport.push({ method: req.method, path: url.pathname, arm, kind, status: 200 }); res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = 'http://127.0.0.1:' + server.address().port;
  browser = await pw.chromium.launch({ headless: true }); report.browserVersion = browser.version();
  for (const arm of ['normal', 'oldrender']) for (const width of [390, 1280]) for (const row of rows) {
    const id = arm + '-' + width + '-' + row.kind; const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'no-preference' });
    const page = await context.newPage(); const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
    await page.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin !== base) { errors.push('Unexpected external transport: ' + url.origin); return route.abort(); } requests.push({ url: url.href, method: route.request().method() }); return route.continue(); });
    const session = await context.newCDPSession(page);
    await session.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.screenshot', transferMode: 'ReturnAsStream' });
    try {
      await page.goto(base + '/?arm=' + arm + '&kind=' + row.kind, { waitUntil: 'networkidle' }); await page.waitForSelector('[data-cm-live-pitch]');
      await page.evaluate(() => window.__pitch.twoFrames());
      const clocks = { 'Start action': 10, Terminal: 10 + 1.05 - .001, Restart: 10 + 1.05 + .001, 'Half return': 10 + 1.05 + .151, 'Return settled': 10 + 1.05 + .311 };
      const activate = async label => { const button = page.getByRole('button', { name: label, exact: true }); if (width === 390) await button.tap(); else await button.click(); await page.waitForFunction(at => window.__pitch.get()?.clock === at, clocks[label]); await page.evaluate(() => window.__pitch.twoFrames()); };
      for (const label of ['Start action', 'Terminal']) await activate(label);
      const terminal = await page.evaluate(() => ({ state: window.__pitch.get(), dom: window.__pitch.read(), tapeLength: window.__pitch.tape.length }));
      const capture = async stage => { const name = id + '-' + stage + '.png'; await page.screenshot({ path: path.join(OUT, name), fullPage: false, animations: 'allow' }); const bytes = fs.readFileSync(path.join(OUT, name)); report.captures.push({ id, arm, width, stage, path: name, bytes: bytes.length, sha256: sha(bytes) }); };
      await capture('terminal');
      await activate('Restart');
      const restart = await page.evaluate(() => ({ state: window.__pitch.get(), dom: window.__pitch.read(), tape: window.__pitch.tape })); await capture('restart');
      for (const label of ['Half return', 'Return settled']) await activate(label);
      const finished = await page.evaluate(() => ({ state: window.__pitch.get(), dom: window.__pitch.read(), tape: window.__pitch.tape, input: window.__pitch.input, inputBytes: window.__pitch.inputBytes, inputHeld: window.__pitch.held(), draws: window.__pitch.draws }));
      write(path.join(dir, 'frames.json'), { terminal, restart, finished, requests, errors });
      const done = new Promise(resolve => session.once('Tracing.tracingComplete', resolve)); await session.send('Tracing.end'); const stream = (await done).stream;
      let rawTrace = ''; for (;;) { const part = await session.send('IO.read', { handle: stream }); rawTrace += part.base64Encoded ? Buffer.from(part.data, 'base64').toString('utf8') : part.data; if (part.eof) break; } await session.send('IO.close', { handle: stream });
      write(path.join(dir, 'compositor.trace.json'), rawTrace);
      const trace = JSON.parse(rawTrace); const screenshots = trace.traceEvents.filter(e => e.name === 'Screenshot'); const paints = trace.traceEvents.filter(e => e.name === 'Paint');
      const changed = finished.tape.filter(c => c.kind === 'layout' && c.clock > 11.05); const first = changed[0];
      const coordinateSet = frame => ({ ball: frame.ball, mine: frame.mine.map(p => ({ key: p.key, name: p.name, x: p.x, y: p.y })), theirs: frame.theirs.map(p => ({ key: p.key, name: p.name, x: p.x, y: p.y })) });
      const continuous = JSON.stringify(coordinateSet(first.frame)) === JSON.stringify(coordinateSet(terminal.state.frame));
      const same = (a, b) => a.x === b.x && a.y === b.y;
      check(terminal.state.frame.phase === row.phase && same(terminal.state.frame.ball, row.terminal) && same(terminal.dom.ball, row.terminal), id + ': actual literal terminal');
      check(first.beat === row.restart && first.frame.phase === 'pass' && same(restart.state.target, row.target), id + ': actual restart context');
      check(continuous === (arm === 'normal'), id + ': effective first committed continuity detector');
      check(same(restart.dom.ball, terminal.dom.ball), id + ': settled restart rendering opportunity holds the terminal ball');
      check(same(finished.state.frame.ball, row.target) && same(finished.dom.ball, row.target), id + ': actual final restart arrival');
      const halfway = finished.tape.find(c => c.kind === 'raf-after-prior-opportunity' && c.clock === 10 + 1.05 + .151);
      check(halfway && !same(halfway.dom.ball, row.terminal) && !same(halfway.dom.ball, row.target), id + ': actual intermediate return');
      check(finished.inputHeld && finished.draws.length === 0 && errors.length === 0 && requests.every(r => r.method === 'GET'), id + ': input RNG and transport holds');
      check(screenshots.length > 0 && paints.length > 0, id + ': actual compositor screenshot and paint events retained');
      check(finished.tape.filter(c => c.dom).every(c => same(c.dom.ball, c.expectedProjection)), id + ': actual surface renders browser-canonical hook coordinates');
      report.cases.push({ id, arm, width, kind: row.kind, continuous, layoutRows: finished.tape.filter(c => c.kind === 'layout').length, rafRows: finished.tape.filter(c => c.kind.startsWith('raf-')).length, paintEvents: paints.length, compositorScreenshots: screenshots.length, originalTraceSha256: sha(rawTrace), framesSha256: sha(fs.readFileSync(path.join(dir, 'frames.json'))), firstRestart: first, presentationNote: 'Layout rows are commits; rAF rows precede the next paint; raw compositor captures are independent. A painted old carrier jump is not classified from layout rows.' });
    } finally { await context.close(); }
  }
  const normal = report.cases.filter(c => c.arm === 'normal'), controls = report.cases.filter(c => c.arm === 'oldrender');
  check(normal.length === 6 && normal.every(c => c.continuous) && controls.length === 6 && controls.every(c => !c.continuous), 'six actual fixed journeys and six effective whole-parent controls');
  check(report.captures.length === 24 && new Set(report.captures.map(c => c.path)).size === 24, 'twenty-four distinct original captures');
  for (const row of report.sources) check(sha(fs.readFileSync(path.join(ROOT, row.file))) === row.rawSha256, row.file + ' final physical hold');
  for (const row of report.packages) check(sha(fs.readFileSync(path.join(ROOT, row.file))) === row.sha256, row.file + ' final package hold');
  for (const row of report.tools) check(sha(fs.readFileSync(row.file)) === row.sha256, row.name + ' final tool package hold');
  for (const row of installed) check(sha(fs.readFileSync(path.join(ROOT, row.file, 'package.json'))) === row.sha256, row.file + ' final locked hold');
  for (const row of report.compiled) check(sha(fs.readFileSync(path.join(OUT, row.path))) === row.sha256, row.path + ' final compiled hold');
  report.counts = { played: normal.length, controlJourneys: controls.length, uniqueControlFaults: [...new Set(controls.filter(c => !c.continuous).map(c => c.kind))], originals: report.captures.length };
  report.success = report.failures.length === 0; write(path.join(OUT, 'report.json'), report);
  assert.equal(report.failures.length, 0, report.failures.join('\n'));
  console.log('Actual standalone pitch: six fixed phone/desktop journeys, six whole-parent control journeys, three distinct effective continuity faults.');
  console.log('Retained browser evidence: 24 untouched originals, full layout/rAF coordinate tapes and actual compositor paint/screenshot traces.');
  console.log(`Held ${report.sources.length} sources, ${report.compiled.length} bundles, three packages and ${installed.length} locked versions; zero match RNG or external requests.`);
  console.log('playPitchRestartContinuity: green in the prepared shared-pitch scope; no real Manager journey or painted-old-jump claim.');
} finally {
  if (!report.success) write(path.join(OUT, 'report.json'), report);
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  assert.equal(path.dirname(scratch), path.join(ROOT, 'tmp')); assert(path.basename(scratch).startsWith('pitch-browser-')); fs.rmSync(scratch, { recursive: true, force: true });
}
