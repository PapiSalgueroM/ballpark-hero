/* Remote-only finite display and actual Academy sale proof. No route/layout claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Run this verification only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.TYCOON_MONEY_DISPLAY_ARTIFACTS || path.join(ROOT, 'tycoon-money-display-artifacts/outcomes'));
const BASE = '8fe82a4dc1346f7d5b8072f387f3acb34bbaa3c8';
const ENGINE = 'src/lib/wonderkidFactory.ts', HOOK = 'src/hooks/useWonderkidFactory.ts', PAGE = 'src/pages/StadiumTycoon.tsx';
const NAMES = ['Independent unchanged purchase', 'Academy dollar boundaries', 'Page money tokens', 'Actual prospect and senior sales'];
const unix = value => value.replaceAll('\\', '/');
const sha = value => createHash('sha256').update(value).digest('hex');
function fileSha(file) { let digest; { const bytes = fs.readFileSync(file); digest = sha(bytes); } return digest; }
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function save(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); }
function git(...args) { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr); return r.stdout; }
const tracked = [...new Set(git('ls-files', 'src', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.app.json', 'vite.config.ts').trim().split('\n').concat('scripts/simTycoonMoneyDisplay.mjs'))];
const holds = () => Object.fromEntries(tracked.map(file => [file, fileSha(path.join(ROOT, file))]));
const before = holds();
for (const file of [ENGINE, HOOK, PAGE, 'src/lib/formatNumber.ts', 'src/lib/completions.ts', 'src/lib/tycoonRewards.ts', 'src/lib/stadiumTycoon.ts']) {
  const target = path.join(OUT, 'originals', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(ROOT, file), target);
}
save(path.join(OUT, 'source-before.json'), before);
save(path.join(OUT, 'identity.json'), { head: git('rev-parse', 'HEAD').trim(), tree: git('rev-parse', 'HEAD^{tree}').trim(), base: BASE });
const oldEngine = git('show', `${BASE}:${ENGINE}`).replace(/\r\n/g, '\n');
const oldHook = git('show', `${BASE}:${HOOK}`).replace(/\r\n/g, '\n');
const oldPage = git('show', `${BASE}:${PAGE}`).replace(/\r\n/g, '\n');
const oldPath = path.join(OUT, 'pinned', 'wonderkidFactory.ts');
save(oldPath, oldEngine); save(path.join(OUT, 'pinned', 'useWonderkidFactory.ts'), oldHook); save(path.join(OUT, 'pinned', 'StadiumTycoon.tsx'), oldPage);
const pageText = read(path.join(ROOT, PAGE));
const exportTail = '\n// QA-only exports from the complete actual page; the route is not mounted.\nexport { fmtMoney as qaFmtMoney, formatMoneyText as qaMoneyText };\n';
const pagePath = path.join(OUT, 'copies', 'StadiumTycoon.qa.tsx'); save(pagePath, pageText + exportTail);
const pageFrom = 'return text.replace(/\\$(-?\\d+(?:\\.\\d+)?)([KMBTQ]?)/g, (_text, amount: string, unit: string) => `$${formatNumber(amount)}${unit}`);';
const pageTo = 'return text;';
assert.equal(pageText.split(pageFrom).length, 2, 'Unique executable page formatting anchor');
const sourceEngine = read(path.join(ROOT, ENGINE)), sourceHook = read(path.join(ROOT, HOOK));
// These whole historical copies change only the reviewed display leaves.
assert.equal(sourceEngine.match(/export function fmtCash\(n: number\): string \{[\s\S]*?\n\}/g)?.length, 1);
for (const anchor of ["💵 ${kid.name} sold for $${price.toLocaleString('en-US')}", "💵 ${player.name} sold for $${price.toLocaleString('en-US')}"]) assert.equal(sourceHook.split(anchor).length, 2, 'Unique executable sale-text leaf');
assert.equal(sourceEngine.replace("import { formatNumber } from '@/lib/formatNumber';\n", '').replace(/export function fmtCash\(n: number\): string \{[\s\S]*?\n\}/, oldEngine.match(/export function fmtCash\(n: number\): string \{[\s\S]*?\n\}/)[0]), oldEngine);
assert.equal(sourceHook.replace("💵 ${kid.name} sold for $${price.toLocaleString('en-US')}", '💷 ${kid.name} sold for ${price.toLocaleString()}').replace("💵 ${player.name} sold for $${price.toLocaleString('en-US')}", '💷 ${player.name} sold for ${price.toLocaleString()}'), oldHook);

const testPath = path.join(OUT, 'money.test.tsx');
save(testPath, String.raw`
import { it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
const NOW = 1791374400000, HANDLE = 'MoneyProof-10';
let E, O, P, useFactory, recordCompletion, requests = [], errors = [], writes = [], draws = 0, initialization;
const clone = x => JSON.parse(JSON.stringify(x));
const storage = () => ({ local: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), session: Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)])) });
const environment = () => ({ storage: storage(), writes: clone(writes), draws, now: Date.now(), requests: clone(requests), errors: clone(errors) });
function check(id, actual, expected, extra = {}) { console.log('TYCOON_MONEY_RECORD|' + JSON.stringify({ id, actual, expected, ...extra })); expect(actual, id).toEqual(expected); }
const flush = async () => { await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); }); };
function restore(s) { localStorage.clear(); sessionStorage.clear(); for (const [k,v] of Object.entries(s.local)) localStorage.setItem(k,v); for (const [k,v] of Object.entries(s.session)) sessionStorage.setItem(k,v); writes = []; requests = []; errors = []; draws = 0; }
function fixture(senior = false) {
  const s = O.newFactory(NOW, 1701); s.cash = 9876; s.levels.agents = 10;
  let seed = 8021; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const p = O.makeProspectInBand(s, 92, 96, random); p.age = O.PROMOTE_AGE; p.rating = 85; s.prospects.push(p);
  if (senior) expect(O.promote(s, p.id), 'Actual legal promotion built the senior fixture').toBe(true);
  return s;
}
beforeAll(async () => {
  await act(async () => {}); // React development async-act setup precedes protected draw counts.
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  let importDraws = 0; vi.spyOn(Math, 'random').mockImplementation(() => { importDraws++; return .37; });
  vi.stubGlobal('fetch', async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url), body = await request.text();
    const row = { url: request.url, method: request.method, body }; requests.push(row);
    const service = (await import('@/integrations/supabase/client')).SUPABASE_URL;
    if (url.origin !== service || url.pathname !== '/rest/v1/game_completions' || url.search !== '' || request.method !== 'POST' || JSON.stringify(JSON.parse(body)) !== JSON.stringify({ game: 'wonderkid-factory', player_name: HANDLE })) {
      errors.push(row); throw new Error('Unexpected transport in finite Academy proof');
    }
    row.locallyFulfilled = true; return new Response('', { status: 201 });
  });
  vi.stubGlobal('WebSocket', class { constructor(url) { errors.push({ socket: String(url) }); throw new Error('Unexpected socket'); } });
  E = await import('@/lib/wonderkidFactory'); O = await import('qa-pinned-academy');
  P = await import('qa-tycoon-page'); ({ useWonderkidFactory: useFactory } = await import('@/hooks/useWonderkidFactory'));
  ({ recordCompletion } = await import('@/lib/completions'));
  await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
  initialization = { now: Date.now(), fixedDraw: .37, importDraws, requests: clone(requests), errors: clone(errors) };
  console.log('TYCOON_MONEY_SETUP|' + JSON.stringify(initialization));
  expect(initialization.errors, 'Module initialization transport errors').toEqual([]); expect(initialization.requests, 'Module initialization makes no requests').toEqual([]);
  vi.restoreAllMocks(); vi.useRealTimers();
});
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('dukb-guest-handle', HANDLE);
  localStorage.setItem('protected-other-career', '{"untouched":true}'); sessionStorage.setItem('protected-session', 'held');
  requests = []; errors = []; writes = []; draws = 0;
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW);
  vi.spyOn(Math, 'random').mockImplementation(() => { draws++; return .37; });
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(k,v) { writes.push({ scope: this === localStorage ? 'local' : 'session', op: 'set', key: k, value: String(v) }); return set.call(this,k,v); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function(k) { writes.push({ scope: this === localStorage ? 'local' : 'session', op: 'remove', key: k }); return remove.call(this,k); });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('Independent unchanged purchase', () => {
  const start = fixture(), a = clone(start), e = clone(start), env = environment();
  const actualResult = E.buyFacility(a, 'coaching'), expectedResult = O.buyFacility(e, 'coaching');
  expect(expectedResult).toBe(true); expect(e.cash).toBeLessThan(start.cash);
  check('purchase', { result: actualResult, state: a, serialized: E.serialize(a), environment: environment() }, { result: expectedResult, state: e, serialized: O.serialize(e), environment: env }, { before: start });
});
it('Academy dollar boundaries', () => {
  const cases = [[-1234.2,'$-1,235'],[0,'$0'],[999.9,'$999'],[1000,'$1,000'],[9999.9,'$9,999'],[10000,'$10.0K'],[999999,'$1,000.0K'],[1000000,'$1.00M'],[999999999,'$1,000.00M'],[1000000000,'$1.00B'],[999999999999,'$1,000.00B'],[1000000000000,'$1.00T'],[1234567890123456,'$1,234.57T']];
  const env = environment(); const actual = cases.map(([n]) => E.fmtCash(n));
  check('academy-boundaries', actual, cases.map(([,text]) => text), { inputs: cases.map(([n]) => n), pinned: cases.map(([n]) => O.fmtCash(n)) });
  check('academy-value-precision', actual.map(text => text.replaceAll(',','').slice(1)), cases.map(([n]) => O.fmtCash(n).replaceAll(',','').slice(1)));
  check('academy-read-only', environment(), env);
});
it('Page money tokens', () => {
  const cases = [['GOAL 2-1 at 90m: +$1234567','GOAL 2-1 at 90m: +$1,234,567'],['+$-1234.50 bonus, 58% share','+$-1,234.50 bonus, 58% share'],['$1234567.00Q and $9999','$1,234,567.00Q and $9,999'],['2-1 at 90m, 58%, 1092 gems','2-1 at 90m, 58%, 1092 gems'],['$9,999 already grouped','$9,999 already grouped']];
  const env = environment();
  check('page-text', cases.map(([text]) => P.qaMoneyText(text)), cases.map(([,expected]) => expected), { inputs: cases.map(([text]) => text) });
  check('page-header', [P.qaFmtMoney(-1234.2), P.qaFmtMoney(9999), P.qaFmtMoney(1e18)], ['$-1,235','$9,999','$1,000.00Q']);
  check('page-read-only', environment(), env);
});
it('Actual prospect and senior sales', async () => {
  const texts = [], expectedTexts = [];
  for (const senior of [false, true]) {
    const input = fixture(senior); localStorage.setItem(E.SAVE_KEY, O.serialize(input)); const initialStorage = storage();
    // The actual recorder separately supplies the legitimate non-economic storage effects.
    recordCompletion('/wonderkid-factory'); await flush();
    expect(requests).toHaveLength(1); expect(errors).toEqual([]);
    const completionStorage = storage(), completionOracle = environment(); restore(initialStorage);
    const loaded = O.deserialize(O.serialize(input), NOW, {}); O.applyOffline(loaded, NOW);
    const expected = clone(loaded), player = senior ? expected.firstTeam[0] : expected.prospects[0];
    const price = senior ? O.sellSenior(expected, player.id) : O.sellProspect(expected, player.id);
    expect(price).toBeGreaterThan(1000);
    const hook = renderHook(() => useFactory());
    check('loaded-' + senior, clone(hook.result.current.state), loaded, { staged: input, stageNote: 'Actual generated prospect, age 18, rating 85 and agent office level 10 explicitly staged; senior uses actual promote.' });
    const drawStart = draws;
    await act(async () => { if (senior) hook.result.current.doSellSenior(player.id); else hook.result.current.doSell(player.id); }); await flush();
    const immediate = localStorage.getItem(E.SAVE_KEY), bytes = O.serialize(expected);
    check('sale-' + senior, { state: clone(hook.result.current.state), immediate, draws: draws - drawStart, now: Date.now(), errors }, { state: expected, immediate: senior ? bytes : O.serialize(input), draws: 0, now: NOW, errors: [] }, { price, before: loaded, requests: clone(requests) });
    const beforeHideWrites = writes.filter(row => row.key === E.SAVE_KEY).length;
    act(() => window.dispatchEvent(new Event('pagehide')));
    const expectedStorage = clone(completionStorage); expectedStorage.local[E.SAVE_KEY] = bytes;
    check('saved-' + senior, { storage: storage(), saved: localStorage.getItem(E.SAVE_KEY), saveWrites: writes.filter(row => row.key === E.SAVE_KEY), requests, errors }, { storage: expectedStorage, saved: bytes, saveWrites: Array.from({length: senior ? 2 : 1}, () => ({ scope: 'local', op: 'set', key: E.SAVE_KEY, value: bytes })), requests: [{ url: requests[0]?.url, method: 'POST', body: JSON.stringify({ game: 'wonderkid-factory', player_name: HANDLE }), locallyFulfilled: true }], errors: [] }, { beforeHideWrites, allWrites: clone(writes), completionOracle });
    texts.push(hook.result.current.floaters.map(f => ({ text: f.text, kind: f.kind })));
    expectedTexts.push([{ text: '💵 ' + player.name + ' sold for $' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price), kind: 'sale' }]);
    hook.unmount();
    const reloadExpected = O.deserialize(bytes, NOW, {}); O.applyOffline(reloadExpected, NOW);
    const reloaded = renderHook(() => useFactory()); check('reload-' + senior, { state: clone(reloaded.result.current.state), storage: storage(), draws, now: Date.now(), requests }, { state: reloadExpected, storage: expectedStorage, draws: 0, now: NOW, requests: completionOracle.requests }, { savedBytes: bytes }); reloaded.unmount();
    restore(initialStorage);
  }
  check('sale-floaters', texts, expectedTexts);
});
`);

const controls = [
  { name: 'old-academy', target: NAMES[1], mismatch: 'academy-boundaries', file: ENGINE, content: oldEngine },
  { name: 'old-sale-text', target: NAMES[3], mismatch: 'sale-floaters', file: HOOK, content: oldHook },
  { name: 'ungrouped-page', target: NAMES[2], mismatch: 'page-text', file: PAGE, content: pageText.replace(pageFrom, pageTo) + exportTail },
];
function run(name, control = null) {
  const dir = path.join(OUT, name), aliases = { 'qa-pinned-academy': unix(oldPath), 'qa-tycoon-page': unix(pagePath) };
  if (control) {
    const copy = path.join(OUT, 'copies', control.name + path.extname(control.file)); save(copy, control.content);
    const original = control.file === PAGE ? pageText + exportTail : read(path.join(ROOT, control.file));
    assert.notEqual(control.content, original, 'The copied fault changed executable source');
    aliases[control.file === PAGE ? 'qa-tycoon-page' : '@/' + control.file.slice(4).replace(/\.tsx?$/, '')] = unix(copy);
    save(path.join(dir, 'mutation.json'), { file: control.file, originalSha256: before[control.file], normalizedOriginalSha256: sha(read(path.join(ROOT,control.file))), executableBaselineSha256: sha(original), copiedSha256: sha(control.content), copy, target: control.target, mismatch: control.mismatch, type: control.file === PAGE ? 'unique passthrough fault' : 'pinned original display copy', base: BASE });
  }
  const wanted = [...new Set([ENGINE, HOOK, PAGE, 'src/lib/formatNumber.ts', 'src/lib/completions.ts'].map(f => unix(path.join(ROOT, f))).concat(Object.values(aliases)))];
  const config = path.join(dir, 'vitest.config.mjs'), report = path.join(dir, 'report.json');
  for (const stale of [report,path.join(dir,'transforms.json')]) if(fs.existsSync(stale))fs.unlinkSync(stale);
  save(config, `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(), dir = ${JSON.stringify(unix(dir))}, wanted = ${JSON.stringify(wanted)};
export default defineConfig({root:${JSON.stringify(unix(ROOT))}, plugins:[react(), {name:'retain-money-modules',enforce:'post',transform(code,id){
 const file=id.split('?')[0].replaceAll('\\\\','/'); if(!wanted.includes(file))return null;
 const hash=x=>crypto.createHash('sha256').update(x).digest('hex'); let inputHash; {const bytes=fs.readFileSync(file);inputHash=hash(bytes);}
 const output='transforms/'+hash(file).slice(0,16)+'.js';fs.mkdirSync(path.join(dir,'transforms'),{recursive:true});fs.writeFileSync(path.join(dir,output),code);
 seen.set(file,{file,inputSha256:inputHash,output,outputSha256:hash(code)});fs.writeFileSync(path.join(dir,'transforms.json'),JSON.stringify([...seen.values()],null,2));return null;
}}],test:{environment:'jsdom',globals:true,setupFiles:[${JSON.stringify(unix(path.join(ROOT,'src/test/setup.ts')))}],include:[${JSON.stringify(unix(testPath))}],maxWorkers:1,fileParallelism:false,testTimeout:30000},resolve:{alias:{...JSON.parse(process.env.NO_DOUBLE_SWAP||'{}'),'@':${JSON.stringify(unix(path.join(ROOT,'src')))}}}});`);
  const args = ['node_modules/vitest/vitest.mjs','run','--config',config,'--reporter=json',`--outputFile.json=${report}`,'--reporter=default'];
  if (control) args.push('-t', `^(${NAMES[0]}|${control.target})$`);
  const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(aliases), NO_COLOR: '1', FORCE_COLOR: '0' } });
  save(path.join(dir,'stdout.log'),child.stdout||'');save(path.join(dir,'stderr.log'),child.stderr||'');save(path.join(dir,'process.json'),{args,aliases,status:child.status,signal:child.signal,error:child.error?.message||null});
  assert(!child.error && child.signal === null, `${name}: worker setup/timeout`);
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require/.test((child.stdout||'')+(child.stderr||'')),`${name}: runtime error`);
  const raw=JSON.parse(read(report)), tests=raw.testResults.flatMap(t=>t.assertionResults);
  assert.equal(raw.numUnhandledErrors??0,0);assert.equal(raw.numRuntimeErrorTestSuites??0,0);assert.equal(raw.unhandledErrors?.length??0,0);assert(raw.testResults.every(t=>!t.testExecError));assert.equal(tests.length,4);
  const marker='TYCOON_MONEY_RECORD|', records=(child.stdout||'').split(/\r?\n/).filter(line=>line.includes(marker)).map(line=>JSON.parse(line.slice(line.indexOf(marker)+marker.length)));save(path.join(dir,'records.json'),records);
  const setupMarker='TYCOON_MONEY_SETUP|', setup=(child.stdout||'').split(/\r?\n/).filter(line=>line.includes(setupMarker)).map(line=>JSON.parse(line.slice(line.indexOf(setupMarker)+setupMarker.length)));assert.equal(setup.length,1);save(path.join(dir,'initialization.json'),setup[0]);
  const baseline=records.find(r=>r.id==='purchase');assert(baseline);assert.deepEqual(baseline.actual,baseline.expected);assert.equal(tests.find(t=>t.title===NAMES[0]).status,'passed');
  const transforms=JSON.parse(read(path.join(dir,'transforms.json')));
  for(const row of transforms){assert.equal(fileSha(row.file),row.inputSha256);assert.equal(fileSha(path.join(dir,row.output)),row.outputSha256);}
  for(const file of [aliases['qa-pinned-academy'],aliases['qa-tycoon-page'],aliases['@/lib/wonderkidFactory']||unix(path.join(ROOT,ENGINE)),aliases['@/hooks/useWonderkidFactory']||unix(path.join(ROOT,HOOK))])assert(transforms.some(r=>r.file===file),`${name}: actual executable binding missing ${file}`);
  assert(!transforms.some(r=>r.file===unix(path.join(ROOT,PAGE))), 'Only the whole QA-exported page copy executes');
  if(control&&control.file!==PAGE)assert(!transforms.some(r=>r.file===unix(path.join(ROOT,control.file))),'Replaced original must not execute');
  const failed=tests.filter(t=>t.status==='failed'), passed=tests.filter(t=>t.status==='passed'), skipped=tests.filter(t=>t.status==='pending'||t.status==='skipped');
  if(control){assert.equal(child.status,1);assert.equal(failed.length,1);assert.equal(passed.length,1);assert.equal(skipped.length,2);assert.equal(failed[0].title,control.target);assert(/AssertionError/.test(failed[0].failureMessages.join('\n')));assert(failed[0].failureMessages.join('\n').includes(control.mismatch),'Exact mapped assertion message');assert.deepEqual(records.filter(r=>{try{assert.deepEqual(r.actual,r.expected);return false;}catch{return true;}}).map(r=>r.id),[control.mismatch],'Only the intended complete outcome differs');}
  else{assert.equal(child.status,0);assert.equal(passed.length,4);assert.equal(failed.length,0);for(const r of records)assert.deepEqual(r.actual,r.expected,r.id);}
  return {name,status:control?'assertion-failed':'passed',passed:passed.length,failed:failed.length,skipped:skipped.length,records:records.length,baseline,failure:failed[0]||null,transforms};
}
const summary={status:'running',scope:'Finite formatter functions and actual Academy hook sales; no full route or layout acceptance',normal:null,controls:[],sourceBefore:before};
try { summary.normal=run('normal');for(const control of controls){const result=run(control.name,control);assert.deepEqual(result.baseline,summary.normal.baseline,'Independent economic baseline remains exact');summary.controls.push(result);}summary.status='passed'; }
catch(error){summary.status='failed';summary.error=String(error.stack||error);throw error;}
finally{summary.sourceAfter=holds();let failure;try{assert.deepEqual(summary.sourceAfter,before);}catch(error){summary.status='failed';summary.sourceHoldError=String(error.stack||error);failure=error;}save(path.join(OUT,'source-after.json'),summary.sourceAfter);save(path.join(OUT,'summary.json'),summary);
  const rawHashes={};function inventory(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())inventory(file);else if(file!==path.join(OUT,'raw-hashes.json'))rawHashes[unix(path.relative(OUT,file))]=fileSha(file);}}inventory(OUT);save(path.join(OUT,'raw-hashes.json'),rawHashes);if(failure)throw failure;}
console.log(`Tycoon money: ${summary.normal.passed}/4 finite mounted/function cases passed.`);
console.log(`Actual hook sales retained full engine, save, reload and unscored session observations.`);
console.log(`Display controls: ${summary.controls.length}/3 mapped AssertionErrors with the unchanged purchase baseline.`);
console.log(`Original source holds: ${Object.keys(before).length}; full copies, executable transforms and raw process records retained at ${OUT}.`);
