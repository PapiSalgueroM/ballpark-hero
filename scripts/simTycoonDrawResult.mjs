/* Remote-only, finite actual-hook proof. Staged final match clocks, no route/layout claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Run this verification only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.TYCOON_DRAW_RESULT_ARTIFACTS || path.join(ROOT, 'tycoon-draw-result-artifacts/outcomes'));
const BASE = '8fe82a4dc1346f7d5b8072f387f3acb34bbaa3c8';
const HOOK = 'src/hooks/useStadiumTycoon.ts', ENGINE = 'src/lib/stadiumTycoon.ts', REWARDS = 'src/lib/tycoonRewards.ts';
const NAMES = ['Win and loss remain exact', 'Draw result is shown without economic change'];
const unix = value => value.replaceAll('\\', '/');
const sha = value => createHash('sha256').update(value).digest('hex');
function fileSha(file) { let digest; { const bytes = fs.readFileSync(file); digest = sha(bytes); } return digest; }
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function save(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); }
function git(...args) { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr); return r.stdout; }
const tracked = [...new Set(git('ls-files', 'src', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.app.json', 'vite.config.ts').trim().split('\n').concat('scripts/simTycoonDrawResult.mjs'))];
const holds = () => Object.fromEntries(tracked.map(file => [file, fileSha(path.join(ROOT, file))]));
const before = holds(), current = read(path.join(ROOT, HOOK)), old = git('show', `${BASE}:${HOOK}`).replace(/\r\n/g, '\n');
const addition = "      } else if (e.kind === 'draw') {\n        pushFloater('FULL TIME DRAW', 'tap', 34, 14);\n";
assert.equal(current.split(addition).length, 2, 'The new executable draw branch occurs once');
assert.equal(current.replace(addition, ''), old, 'Complete pinned original differs only by the draw branch');
const pinned = path.join(OUT, 'copies', 'originalHook.ts'), controlCopy = path.join(OUT, 'copies', 'missingDrawHook.ts');
save(pinned, old); save(controlCopy, old);
for (const file of [HOOK, ENGINE, REWARDS, 'src/hooks/useOwnedTimeouts.ts', 'src/lib/completions.ts']) {
  const target = path.join(OUT, 'originals', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(ROOT, file), target);
  if (file === ENGINE || file === REWARDS) assert.equal(read(path.join(ROOT, file)), git('show', `${BASE}:${file}`).replace(/\r\n/g, '\n'), 'Authoritative engine/rewards stay exact');
}
save(path.join(OUT, 'source-before.json'), before);
save(path.join(OUT, 'identity.json'), { head: git('rev-parse', 'HEAD').trim(), tree: git('rev-parse', 'HEAD^{tree}').trim(), base: BASE, originalHookSha256: sha(old), currentHookSha256: sha(current) });
const testPath = path.join(OUT, 'draw.test.tsx');
save(testPath, String.raw`
import { it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
const NOW = 1791374400000, STEP = 200, EDGE = .12;
let E, R, actualHook, oldHook, clock = 0, frameId = 0, frames = new Map(), writes = [], requests = [], errors = [], edgeCalls = [], random;
const clone = x => JSON.parse(JSON.stringify(x));
function rng(seed = 1) { let state = seed >>> 0; const values = []; return { next: () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const value = state / 4294967296; values.push(value); return value; }, snapshot: () => ({ state, values: [...values] }) }; }
const storage = () => ({ local: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), session: Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)])) });
function snapshot(hook) { return clone({ hook: Object.fromEntries(Object.entries(hook.result.current).filter(([,v]) => typeof v !== 'function')), storage: storage(), writes, requests, errors, edgeCalls, rng: random.snapshot(), now: Date.now(), performance: performance.now(), pendingFrames: frames.size }); }
function check(id, actual, expected, extra = {}) { console.log('TYCOON_DRAW_RECORD|' + JSON.stringify({ id, actual, expected, ...extra })); expect(actual, id).toEqual(expected); }
beforeAll(async () => {
  await act(async () => {}); // Initialize React development async-act before protected RNG accounting.
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  let importDraws = 0; vi.spyOn(Math, 'random').mockImplementation(() => { importDraws++; return .37; });
  vi.stubGlobal('fetch', async (input, init) => { const request = new Request(input, init); const row = { url: request.url, method: request.method }; requests.push(row); errors.push(row); throw new Error('Unexpected transport in finite draw proof'); });
  vi.stubGlobal('WebSocket', class { constructor(url) { errors.push({ socket: String(url) }); throw new Error('Unexpected socket'); } });
  E = await import('@/lib/stadiumTycoon'); R = await import('@/lib/tycoonRewards');
  ({ useStadiumTycoon: actualHook } = await import('@/hooks/useStadiumTycoon'));
  ({ useStadiumTycoon: oldHook } = await import('qa-original-stadium-hook'));
  await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
  const initialization = { now: Date.now(), fixedDraw: .37, importDraws, requests: clone(requests), errors: clone(errors) };
  console.log('TYCOON_DRAW_SETUP|' + JSON.stringify(initialization));
  expect(initialization.requests).toEqual([]); expect(initialization.errors).toEqual([]);
  vi.restoreAllMocks(); vi.useRealTimers();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW);
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(Math, 'random').mockImplementation(() => random.next());
  vi.stubGlobal('requestAnimationFrame', cb => { frames.set(++frameId, cb); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(k,v) { writes.push({ scope: this === localStorage ? 'local' : 'session', op: 'set', key: k, value: String(v) }); return set.call(this,k,v); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function(k) { writes.push({ scope: this === localStorage ? 'local' : 'session', op: 'remove', key: k }); return remove.call(this,k); });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
function fixture(result) {
  const staged = E.newTycoon(NOW); staged.minute = 89; staged.matchSec = 1.25;
  [staged.goalsFor, staged.goalsAgainst] = result === 'win' ? [2,0] : result === 'loss' ? [0,2] : [1,1];
  const bytes = E.serializeTycoon(staged, NOW), loaded = E.deserializeTycoon(bytes, NOW), ledger = R.newLedger(1093), roll = rng();
  const outcome = E.tick(clone(loaded), STEP / 1000, roll.next, EDGE);
  expect(outcome.events.filter(e => ['win','draw','loss'].includes(e.kind)).map(e => e.kind), 'Actual engine full-time outcome').toEqual([result]);
  expect(outcome.events.some(e => ['goal','conceded','title','seasonEnd'].includes(e.kind)), 'Finite first-match fixture has no new goal or season transition').toBe(false);
  return { annotation: 'Actual newTycoon, explicitly staged minute 89, 1.25 seconds and score; one 200ms RAF callback settles the actual engine.', staged, bytes, loaded, ledger, outcome, engineRng: roll.snapshot(), reward: R.creditFullTimes(ledger, [{ totalMatches: outcome.state.totalMatches, result, away: false }]), saved: E.serializeTycoon(outcome.state, NOW + STEP) };
}
function arm(useHook, f) {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem(E.TYCOON_SAVE_KEY, f.bytes); localStorage.setItem(R.REWARDS_KEY, JSON.stringify(f.ledger));
  localStorage.setItem('protected-other-career', '{"untouched":true}'); sessionStorage.setItem('protected-session', 'held');
  clock = 0; frameId = 0; frames.clear(); vi.setSystemTime(NOW); random = rng(); writes = []; requests = []; errors = []; edgeCalls = [];
  const getEdge = () => { edgeCalls.push({ now: Date.now(), performance: performance.now(), value: EDGE }); return EDGE; };
  const mounted = renderHook(() => useHook(getEdge)), before = snapshot(mounted);
  expect(frames.size).toBe(1);
  act(() => { const callbacks = [...frames.values()]; frames.clear(); clock += STEP; vi.advanceTimersByTime(STEP); callbacks.forEach(cb => cb(clock)); });
  const after = snapshot(mounted);
  act(() => window.dispatchEvent(new Event('pagehide'))); const hidden = snapshot(mounted);
  mounted.unmount(); const unmounted = { storage: storage(), writes: clone(writes), rng: random.snapshot(), pendingFrames: frames.size };
  const restored = renderHook(() => useHook(getEdge)), reload = snapshot(restored); restored.unmount();
  const final = { storage: storage(), writes: clone(writes), requests: clone(requests), errors: clone(errors), rng: random.snapshot(), edgeCalls: clone(edgeCalls), pendingFrames: frames.size };
  const continuation = Array.from({length: 4}, () => random.next());
  return { before, after, hidden, unmounted, reload, final, continuation };
}
function verifyArm(id, row, f) {
  const expectedStorage = clone(row.before.storage); expectedStorage.local[R.REWARDS_KEY] = JSON.stringify(f.reward);
  check(id + '-tick', { state: row.after.hook.state, storage: row.after.storage, engineDraws: row.after.rng.values.slice(0, f.engineRng.values.length), edgeCalls: row.after.edgeCalls, errors: row.after.errors, requests: row.after.requests, now: row.after.now, performance: row.after.performance }, { state: f.outcome.state, storage: expectedStorage, engineDraws: f.engineRng.values, edgeCalls: [{ now: NOW + STEP, performance: STEP, value: EDGE }], errors: [], requests: [], now: NOW + STEP, performance: STEP }, { fixture: f, raw: row });
  expectedStorage.local[E.TYCOON_SAVE_KEY] = f.saved;
  const rewardWrite = { scope: 'local', op: 'set', key: R.REWARDS_KEY, value: JSON.stringify(f.reward) };
  const saveWrite = { scope: 'local', op: 'set', key: E.TYCOON_SAVE_KEY, value: f.saved };
  check(id + '-saved', { storage: row.hidden.storage, writes: row.hidden.writes, rng: row.hidden.rng, state: row.hidden.hook.state }, { storage: expectedStorage, writes: [rewardWrite,saveWrite], rng: row.after.rng, state: f.outcome.state });
  check(id + '-reload', { state: row.reload.hook.state, storage: row.reload.storage, rng: row.reload.rng, writes: row.reload.writes, edgeCalls: row.reload.edgeCalls, floaters: row.reload.hook.floaters }, { state: E.deserializeTycoon(f.saved, NOW + STEP), storage: expectedStorage, rng: row.after.rng, writes: [rewardWrite,saveWrite,saveWrite], edgeCalls: row.after.edgeCalls, floaters: [] });
  check(id + '-cleanup', row.final, { storage: expectedStorage, writes: [rewardWrite,saveWrite,saveWrite,saveWrite], requests: [], errors: [], rng: row.after.rng, edgeCalls: row.after.edgeCalls, pendingFrames: 0 });
}
function withoutFloaters(row) { const copy = clone(row); for (const stage of ['before','after','hidden','reload']) delete copy[stage].hook.floaters; return copy; }
const payloads = floaters => floaters.map(({ id, ...rest }) => rest);
it('Win and loss remain exact', () => {
  for (const result of ['win','loss']) {
    const f = fixture(result), original = arm(oldHook, f), actual = arm(actualHook, f);
    verifyArm(result + '-original', original, f); verifyArm(result + '-current', actual, f);
    check(result + '-complete-baseline', actual, original);
    expect(actual.after.hook.floaters.some(x => result === 'win' ? x.kind === 'win' && x.text.startsWith('FULL TIME WIN +') : x.kind === 'bad' && x.text === 'full time. beaten')).toBe(true);
  }
});
it('Draw result is shown without economic change', () => {
  const f = fixture('draw'), original = arm(oldHook, f), actual = arm(actualHook, f);
  verifyArm('draw-original', original, f); verifyArm('draw-current', actual, f);
  check('draw-economic-parity', withoutFloaters(actual), withoutFloaters(original), { actualRawFloaters: actual.after.hook.floaters, originalRawFloaters: original.after.hook.floaters, allowedDifference: 'The new visit-only floater consumes one presentation ID. All remaining floater payloads must stay exact; raw IDs remain retained.' });
  const additions = actual.after.hook.floaters.filter(x => x.text === 'FULL TIME DRAW');
  check('draw-other-floaters', payloads(actual.after.hook.floaters.filter(x => x.text !== 'FULL TIME DRAW')), payloads(original.after.hook.floaters));
  check('draw-message', payloads(additions), [{ text: 'FULL TIME DRAW', kind: 'tap', x: 34, y: 14 }]);
});
`);

function run(name, control = false) {
  const dir = path.join(OUT, name), aliases = { 'qa-original-stadium-hook': unix(pinned) };
  if (control) aliases['@/hooks/useStadiumTycoon'] = unix(controlCopy);
  const targetHook = aliases['@/hooks/useStadiumTycoon'] || unix(path.join(ROOT, HOOK));
  if (control) save(path.join(dir, 'mutation.json'), { file: HOOK, originalSha256: before[HOOK], normalizedOriginalSha256: sha(current), copiedSha256: sha(old), copy: controlCopy, base: BASE, removed: addition, target: NAMES[1], mismatch: 'draw-message', type: 'Complete pinned original hook, unique exact removal and reversal' });
  const wanted = [unix(pinned), targetHook, unix(path.join(ROOT,HOOK)), unix(path.join(ROOT,ENGINE)), unix(path.join(ROOT,REWARDS))];
  const config = path.join(dir,'vitest.config.mjs'), report = path.join(dir,'report.json');
  for (const stale of [report,path.join(dir,'transforms.json')]) if(fs.existsSync(stale))fs.unlinkSync(stale);
  save(config, `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const seen=new Map(), dir=${JSON.stringify(unix(dir))}, wanted=${JSON.stringify(wanted)};
export default defineConfig({root:${JSON.stringify(unix(ROOT))},plugins:[react(),{name:'retain-draw-hook',enforce:'post',transform(code,id){
 const file=id.split('?')[0].replaceAll('\\\\','/');if(!wanted.includes(file))return null;const hash=x=>crypto.createHash('sha256').update(x).digest('hex');let inputHash;{const bytes=fs.readFileSync(file);inputHash=hash(bytes);}
 const output='transforms/'+hash(file).slice(0,16)+'.js';fs.mkdirSync(path.join(dir,'transforms'),{recursive:true});fs.writeFileSync(path.join(dir,output),code);seen.set(file,{file,inputSha256:inputHash,output,outputSha256:hash(code)});fs.writeFileSync(path.join(dir,'transforms.json'),JSON.stringify([...seen.values()],null,2));return null;
}}],test:{environment:'jsdom',globals:true,setupFiles:[${JSON.stringify(unix(path.join(ROOT,'src/test/setup.ts')))}],include:[${JSON.stringify(unix(testPath))}],maxWorkers:1,fileParallelism:false,testTimeout:30000},resolve:{alias:{...JSON.parse(process.env.NO_DOUBLE_SWAP||'{}'),'@':${JSON.stringify(unix(path.join(ROOT,'src')))}}}});`);
  const args=['node_modules/vitest/vitest.mjs','run','--config',config,'--reporter=json',`--outputFile.json=${report}`,'--reporter=default'];
  const child=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024,env:{...process.env,NO_DOUBLE_SWAP:JSON.stringify(aliases),NO_COLOR:'1',FORCE_COLOR:'0'}});
  save(path.join(dir,'stdout.log'),child.stdout||'');save(path.join(dir,'stderr.log'),child.stderr||'');save(path.join(dir,'process.json'),{args,aliases,status:child.status,signal:child.signal,error:child.error?.message||null});
  assert(!child.error&&child.signal===null,`${name}: worker setup/timeout`);assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require/.test((child.stdout||'')+(child.stderr||'')),`${name}: runtime error`);
  const raw=JSON.parse(read(report)),tests=raw.testResults.flatMap(t=>t.assertionResults);assert.equal(tests.length,2);assert.equal(raw.numUnhandledErrors??0,0);assert.equal(raw.numRuntimeErrorTestSuites??0,0);assert.equal(raw.unhandledErrors?.length??0,0);assert(raw.testResults.every(t=>!t.testExecError));
  const rowsFor=marker=>(child.stdout||'').split(/\r?\n/).filter(line=>line.includes(marker)).map(line=>JSON.parse(line.slice(line.indexOf(marker)+marker.length)));
  const records=rowsFor('TYCOON_DRAW_RECORD|'),setup=rowsFor('TYCOON_DRAW_SETUP|');save(path.join(dir,'records.json'),records);assert.equal(setup.length,1);save(path.join(dir,'initialization.json'),setup[0]);
  const baselines=records.filter(r=>r.id.endsWith('-complete-baseline'));assert.equal(baselines.length,2);for(const row of baselines)assert.deepEqual(row.actual,row.expected);assert.equal(tests.find(t=>t.title===NAMES[0]).status,'passed');
  const transforms=JSON.parse(read(path.join(dir,'transforms.json')));for(const row of transforms){assert.equal(fileSha(row.file),row.inputSha256);assert.equal(fileSha(path.join(dir,row.output)),row.outputSha256);}for(const file of [unix(pinned),targetHook,unix(path.join(ROOT,ENGINE)),unix(path.join(ROOT,REWARDS))])assert(transforms.some(r=>r.file===file),'Actual module binding: '+file);if(control)assert(!transforms.some(r=>r.file===unix(path.join(ROOT,HOOK))),'Copied old hook executes exclusively');
  const failed=tests.filter(t=>t.status==='failed'),passed=tests.filter(t=>t.status==='passed'),skipped=tests.filter(t=>t.status==='pending'||t.status==='skipped');assert.equal(skipped.length,0);
  const mismatches=records.filter(r=>{try{assert.deepEqual(r.actual,r.expected);return false;}catch{return true;}}).map(r=>r.id);
  if(control){assert.equal(child.status,1);assert.equal(passed.length,1);assert.equal(failed.length,1);assert.equal(failed[0].title,NAMES[1]);assert(/AssertionError/.test(failed[0].failureMessages.join('\n')));assert(failed[0].failureMessages.join('\n').includes('draw-message'));assert.deepEqual(mismatches,['draw-message']);}
  else{assert.equal(child.status,0);assert.equal(passed.length,2);assert.equal(failed.length,0);assert.deepEqual(mismatches,[]);}
  return {name,status:control?'assertion-failed':'passed',passed:passed.length,failed:failed.length,skipped:skipped.length,records:records.length,baselines,mismatches,failure:failed[0]||null,transforms};
}
const summary={status:'running',scope:'Two actual-hook cases, three explicitly staged full times and one pinned original control; no route, layout, timer-expiry or campaign claim',normal:null,controls:[],sourceBefore:before};
try{summary.normal=run('normal');const fault=run('old-missing-draw',true);assert.deepEqual(fault.baselines,summary.normal.baselines,'Complete healthy win/loss baseline stays exact');summary.controls.push(fault);summary.status='passed';}
catch(error){summary.status='failed';summary.error=String(error.stack||error);throw error;}
finally{summary.sourceAfter=holds();let failure;try{assert.deepEqual(summary.sourceAfter,before);}catch(error){summary.status='failed';summary.sourceHoldError=String(error.stack||error);failure=error;}save(path.join(OUT,'source-after.json'),summary.sourceAfter);save(path.join(OUT,'summary.json'),summary);const hashes={};function inventory(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())inventory(file);else if(file!==path.join(OUT,'raw-hashes.json'))hashes[unix(path.relative(OUT,file))]=fileSha(file);}}inventory(OUT);save(path.join(OUT,'raw-hashes.json'),hashes);if(failure)throw failure;}
console.log(`Tycoon draw: ${summary.normal.passed}/2 actual-hook cases passed.`);
console.log('Win, loss and draw retain complete engine, reward, save, reload and RNG observations.');
console.log(`${summary.controls.length}/1 complete old-hook copy rejected by the sole draw-message assertion, with healthy win/loss baseline.`);
console.log(`${Object.keys(before).length} original source holds; copies, transforms and raw process records retained at ${OUT}.`);
