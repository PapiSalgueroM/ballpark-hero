/* Committed NHL waiver feedback over actual Board actions and engine state. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx';
const fixture = 'src/test/NhlWaiverReceipt.outcomes.tsx';
const files = [board, fixture, 'scripts/simNhlWaiverReceipt.mjs',
  'src/components/nhl-front-office/NhlWaiverReceipt.tsx', 'src/components/nhl-front-office/NhlWaiverReceipt.module.css',
  'src/lib/nhlFrontOffice.ts', 'src/lib/frontOfficeSave.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/entityIds.ts',
  'src/lib/foSchedule.ts', 'src/data/nhlFoPlayers.ts', 'src/data/nhlOpeningRatings.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = new Map(await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))])));
const hash = value => createHash('sha256').update(value).digest('hex');
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const titles = [...held.get(fixture).source.matchAll(/^\s*\['([^']+)', async/gm)].map(match => match[1]);
assert.equal(titles.length, 8, 'Eight complete actual-action outcomes are bound');
const candidatePath = process.env.NHL_WAIVER_BOARD;
const candidate = candidatePath ? holdSource(await readFile(path.resolve(candidatePath))) : null;
const product = candidate?.source ?? held.get(board).source;
const eventAnchor = "<NhlWaiverReceipt event={waiverReceipt} fallbackFocus={() => waiverBoard.current?.querySelector<HTMLButtonElement>('button:not(:disabled):not([data-nhl-waiver-dismiss])') ?? null} />";
const controls = {
  metadata: ['        mandate, trust, fired, pressTilt, seasonTradeLine,',
    '        mandate, trust, fired, pressTilt: 0, seasonTradeLine: null,', [1, 3, 4, 5, 6, 7]],
  event: [eventAnchor, eventAnchor.replace('event={waiverReceipt}', 'event={null}'), [1, 3, 4, 5, 6, 7]],
  guard: [' || waiverCommit.current === league', '', [3]],
  cap: ['capAfter: nhlCapRoom(team, lg.cap)', 'capAfter: capBefore', [1, 7]],
  remount: [eventAnchor, eventAnchor.replace('event={waiverReceipt}', 'key={tab ?? "hub"} event={waiverReceipt}'), [4]],
  refusal: ['if (nhlRelease(team, lg.freeAgents, pid, lg.ratingModelVersion)) {',
    'if ((nhlRelease(team, lg.freeAgents, pid, lg.ratingModelVersion), true)) {', [2, 7]],
};
const mode = process.env.NHL_WAIVER_CONTROL || '';
assert.ok(!mode || mode === 'all' || mode === 'original' || Object.prototype.hasOwnProperty.call(controls, mode), 'Known waiver control');
for (const [anchor, replacement] of Object.values(controls)) {
  assert.equal(code(product).split(anchor).length - 1, 1, 'One executable control anchor');
  assert.notEqual(product.replace(anchor, replacement), product, 'Control changes the actual binding');
  const bytes = Buffer.from(product.replaceAll('\n', '\r\n')), before = Buffer.from(bytes);
  assert.equal(code(holdSource(bytes).source).split(anchor).length - 1, 1, 'CRLF matches the same executable binding');
  assert.deepEqual(bytes, before, 'Synthetic CRLF source remains held');
}
const referencePath = process.env.NHL_WAIVER_REFERENCE_FILE;
const captured = referencePath ? holdSource(await readFile(path.resolve(referencePath))) : null;
const referenceCommit = process.env.NHL_WAIVER_REFERENCE_COMMIT || '98cc4cc6';
let original;
if (captured) original = captured.source;
else if (mode === 'all' || mode === 'original') {
  const result = spawnSync('git', ['show', `${referenceCommit}:${board}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.ok(!result.error && !result.signal); assert.equal(result.status, 0, 'Physical committed pre970 Board is available');
  original = result.stdout.replaceAll('\r\n', '\n');
}
const reference = { commit: original && !captured ? referenceCommit : null,
  capturedPath: captured ? path.resolve(referencePath) : null, normalizedSha256: original ? hash(original) : null,
  productSha256: hash(product), currentWorkspaceRawSha256: hash(held.get(board).bytes),
  candidatePath: candidatePath ? path.resolve(candidatePath) : null };
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'nhl-waiver970-'));
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-nhl970-proof-'));
const outcomes = [];
try {
  for (const current of mode === 'all' ? ['', 'original', ...Object.keys(controls)] : [mode]) {
    let source = current === 'original' ? original : product;
    if (controls[current]) source = source.replace(controls[current][0], controls[current][1]);
    source = source.replace("from './NhlContributors.module.css'", "from '@/components/nhl-front-office/NhlContributors.module.css'")
      .replace("from './NhlWaiverReceipt'", "from '@/components/nhl-front-office/NhlWaiverReceipt'");
    await writeFile(path.join(folder, 'Board.tsx'), source);
    await writeFile(path.join(folder, 'entry.ts'), `export { run } from '${path.join(root, fixture).replaceAll('\\', '/')}';\n`);
    const built = await build({ entryPoints: [path.join(folder, 'entry.ts')], outfile: path.join(folder, 'product.mjs'), bundle: true,
      platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent', metafile: true,
      alias: { '@/components/nhl-front-office/NhlFrontOfficeBoard': path.join(folder, 'Board.tsx'), '@': path.join(root, 'src') },
      plugins: [{ name: 'explicit-quiet-completion-boundaries', setup(builder) {
        builder.onResolve({ filter: /useGameCompletion|(?:\/|^)completions(?:\.ts)?$|ShareButtons/ }, args => ({ path: args.path, namespace: 'quiet' }));
        builder.onLoad({ filter: /.*/, namespace: 'quiet' }, args => ({ contents: args.path.includes('useGameCompletion') ? 'export const useGameCompletion=()=>undefined;'
          : args.path.includes('ShareButtons') ? 'export default ()=>null;' : 'export const recordActivity=()=>undefined;', loader: 'js' }));
        builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'css' }));
        builder.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js' }));
      } }] });
    assert.ok(!Object.keys(built.metafile.inputs).some(file => /integrations\/supabase|fetchPlayers/.test(file)), 'No database code enters this fixture');
    await writeFile(path.join(receipts, `${current || 'normal'}-metafile.json`), JSON.stringify(built.metafile, null, 2));
    await writeFile(path.join(folder, 'runner.mjs'), `import fs from 'node:fs';\nimport { JSDOM } from 'jsdom';\nconst dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost',pretendToBeVisual:true});\nObject.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});\nfor(const key of ['window','document','HTMLElement','HTMLButtonElement','Element','Node','Storage','localStorage','Event','MouseEvent','MutationObserver'])globalThis[key]=dom.window[key];\nglobalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.matchMedia=()=>({matches:true,media:'(prefers-reduced-motion: reduce)',addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});\nconst errors=[],oldError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));oldError(...args);};window.addEventListener('error',event=>errors.push(String(event.error||event.message)));\ntry{const E=await import('./product.mjs');const report=await E.run();report.errors=errors;fs.writeFileSync(process.env.NHL_WAIVER_REPORT,JSON.stringify(report,null,2));for(const row of report.rows)console.log(row.status+': '+row.title);process.exitCode=report.failed?1:0;}finally{console.error=oldError;dom.window.close();}\n`);
    const reportFile = path.join(receipts, `${current || 'normal'}.json`), transport = path.join(receipts, `${current || 'normal'}-transport.txt`);
    const child = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(folder, 'runner.mjs')], {
      cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, NODE_ENV: 'test', NHL_WAIVER_REPORT: reportFile, SIM_OFFLINE_RECEIPT: transport } });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`;
    await writeFile(path.join(receipts, `${current || 'normal'}.log`), output);
    await writeFile(path.join(receipts, `${current || 'normal'}-child.json`), JSON.stringify({ status: child.status, signal: child.signal, error: child.error?.message ?? null }, null, 2));
    assert.ok(!child.error && !child.signal, 'Bounded full outcome child finishes');
    assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|Transform failed|not wrapped in act|Maximum update depth/);
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const targets = current === 'original' ? [1, 3, 4, 5, 6, 7] : controls[current]?.[2] ?? [];
    const failed = report.rows.flatMap((row, index) => row.status === 'FAIL' ? [index] : []);
    await writeFile(path.join(receipts, `${current || 'normal'}-attempt.json`), JSON.stringify({ current: current || 'normal', targets, failed, status: child.status }, null, 2));
    assert.equal(report.total, 8); assert.equal(report.rows.length, 8); assert.deepEqual(report.rows.map(row => row.title), titles);
    assert.ok(report.rows.every(row => row.status === 'PASS' || row.status === 'FAIL'), 'All eight execute, no skips');
    assert.deepEqual(report.errors, []); assert.deepEqual(failed, targets, 'Exact intended meaningful control cases');
    assert.equal(report.failed, targets.length); assert.equal(report.passed, 8 - targets.length); assert.equal(child.status, targets.length ? 1 : 0);
    for (const row of report.rows.filter(row => row.status === 'FAIL')) assert.equal(row.error.name, 'AssertionError', 'No exception or loader failure credits a control');
    assert.equal(report.rows[0].status, 'PASS', 'Independent original full engine outcome and RNG hold every mode');
    if (current !== 'refusal') assert.equal(report.rows[2].status, 'PASS', 'Independent quiet actual cancellation and floor refusal hold');
    try { assert.equal((await readFile(transport, 'utf8')).trim(), '', 'No outside requests'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'Every raw source remains held'); }
    if (candidate) { const currentBytes = await readFile(path.resolve(candidatePath)); assert.deepEqual(currentBytes, candidate.bytes, 'Candidate raw source holds'); }
    if (captured) { const currentBytes = await readFile(path.resolve(referencePath)); assert.deepEqual(currentBytes, captured.bytes, 'Physical reference raw source holds'); }
    const row = { mode: current || 'normal', total: 8, passed: report.passed, rejected: report.failed, exactTargets: targets };
    outcomes.push(row);
    await writeFile(path.join(receipts, `${current || 'normal'}-accepted.json`), JSON.stringify({ ...row, reference,
      sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])), rawSourcesHeld: true, outsideAttempts: 0 }, null, 2));
    console.log(`NHL waiver ${current || 'normal'}: ${report.passed}/8 passed, ${report.failed} exact outcome rejections, all eight executed.`);
  }
  await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify({ outcomes, reference,
    sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])),
    limits: 'Actual Board and engine, DOM-dispatched actions plus explicitly identified rendered callback probes. Generated trade/draft/offseason overage fixture with automatic contributors, not a full native career. Final-round fixture plays actual playoffs, two draft choices and offseason but does not claim a full regular season. Exact save/RNG/reference and ephemeral cue ownership; CSS/layout/native behavior need separate component and browser gates.' }, null, 2));
  console.log(`NHL waiver receipt: ${receipts}`);
} finally {
  assert.equal(path.dirname(path.resolve(folder)), parent); assert.ok(path.basename(folder).startsWith('nhl-waiver970-'));
  await rm(folder, { recursive: true, force: true });
  for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'Final raw bytes held after owned cleanup'); }
  if (candidate) { const currentBytes = await readFile(path.resolve(candidatePath)); assert.deepEqual(currentBytes, candidate.bytes, 'Final candidate source holds'); }
  if (captured) { const currentBytes = await readFile(path.resolve(referencePath)); assert.deepEqual(currentBytes, captured.bytes, 'Final physical reference holds'); }
}
console.log('NHL waiver: exact copied targets, CRLF-safe controls, owned cleanup and offline transport verified.');
