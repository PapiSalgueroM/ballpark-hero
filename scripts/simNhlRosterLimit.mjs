/* Actual NHL overage recovery, deliberate waivers and copied controls. */
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
const fixture = 'src/test/NhlRosterLimit.outcomes.tsx';
const files = [board, fixture, 'scripts/simNhlRosterLimit.mjs', 'src/lib/nhlFrontOffice.ts', 'src/lib/frontOfficeSave.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/entityIds.ts', 'src/lib/foSchedule.ts', 'src/data/nhlFoPlayers.ts', 'src/data/nhlOpeningRatings.ts', 'src/components/nhl-front-office/NhlContributors.module.css'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = new Map(await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))])));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const titles = [...held.get(fixture).source.matchAll(/^\s*\['([^']+)',async/gm)].map(match => match[1]);
assert.equal(titles.length, 4, 'Four meaningful complete outcomes are bound');
const candidatePath = process.env.NHL_ROSTER_BOARD;
const candidate = candidatePath ? holdSource(await readFile(path.resolve(candidatePath))) : null;
const product = candidate?.source ?? held.get(board).source;
const controls = {
  handler: [' || my.players.length > NHL_ROSTER_MAX', '', [1]],
  disabled: ['disabled={overLimit > 0}', 'disabled={false}', [1]],
  warning: ['Your roster has {my.players.length} players, {overLimit} over', 'Your roster has {my.players.length + 1} players, {overLimit} over', [0, 2]],
  roster: ['onClick={() => openPanel(\'team\')}', 'onClick={() => undefined}', [0, 2]],
  waive: ['if (nhlRelease(lg.teams[myTeam], lg.freeAgents, pid, lg.ratingModelVersion))', 'if (false)', [2]],
};
const mode = process.env.NHL_ROSTER_CONTROL || '';
assert.ok(!mode || mode === 'all' || mode === 'original' || Object.prototype.hasOwnProperty.call(controls, mode), 'Known roster-limit control');
for (const [anchor, replacement] of Object.values(controls)) {
  assert.equal(code(product).split(anchor).length - 1, 1, 'One real executable guard or UI binding');
  assert.notEqual(product.replace(anchor, replacement), product, 'Control changes actual source');
  const bytes = Buffer.from(product.replaceAll('\n', '\r\n')), before = Buffer.from(bytes);
  assert.equal(code(holdSource(bytes).source).split(anchor).length - 1, 1, 'Same real anchor matches CRLF source');
  assert.deepEqual(bytes, before, 'Synthetic CRLF bytes remain held');
}
/* The parent sets this to the committed pre968 snapshot after its batch lands. */
const referenceCommit = process.env.NHL_ROSTER_REFERENCE_COMMIT || "75c57949290f8a2da87c522c39931817f7c51a25";
const referencePath = process.env.NHL_ROSTER_REFERENCE_FILE;
const capturedReference = referencePath ? holdSource(await readFile(path.resolve(referencePath))) : null;
let original;
if (capturedReference) original = capturedReference.source;
else {
  const result = spawnSync('git', ['show', `${referenceCommit}:${board}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.ok(!result.error && !result.signal); assert.equal(result.status, 0, 'Physical committed pre968 Board exists');
  original = result.stdout.replaceAll('\r\n', '\n');
}
const reference = { commit: referencePath ? null : referenceCommit, capturedPath: referencePath ? path.resolve(referencePath) : null, normalizedSha256: hash(original), productSha256: hash(product), currentWorkspaceRawSha256: hash(held.get(board).bytes), candidatePath: candidatePath ? path.resolve(candidatePath) : null, strictHistoricalMode: mode === 'original' || mode === 'all' };
if (reference.strictHistoricalMode) assert.equal(reference.normalizedSha256, 'fa932679f9ce71630c142de00789b36c9c3962a219f657ae0b0ad93ea9fefb5e', 'Explicit historical mode uses exact physically captured pre968 Board');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'nhl-roster968-'));
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-nhl968-proof-'));
const outcomes = [];
try {
  for (const current of mode === 'all' ? ['', 'original', ...Object.keys(controls)] : [mode]) {
    let source = current === 'original' ? original : product;
    if (controls[current]) source = source.replace(controls[current][0], controls[current][1]);
    await writeFile(path.join(folder, 'Board.tsx'), source.replace("from './NhlContributors.module.css'", "from '@/components/nhl-front-office/NhlContributors.module.css'"));
    await writeFile(path.join(folder, 'entry.ts'), `export { run } from '${path.join(root, fixture).replaceAll('\\', '/')}';\n`);
    const built = await build({ entryPoints: [path.join(folder, 'entry.ts')], outfile: path.join(folder, 'product.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent', metafile: true,
      alias: { '@/components/nhl-front-office/NhlFrontOfficeBoard': path.join(folder, 'Board.tsx'), '@': path.join(root, 'src') },
      plugins: [{ name: 'explicit-quiet-recording-seams', setup(builder) {
        builder.onResolve({ filter: /useGameCompletion|(?:\/|^)completions(?:\.ts)?$|ShareButtons/ }, args => ({ path: args.path, namespace: 'quiet' }));
        builder.onLoad({ filter: /.*/, namespace: 'quiet' }, args => ({ contents: args.path.includes('useGameCompletion') ? 'export const useGameCompletion=()=>undefined;' : args.path.includes('ShareButtons') ? 'export default ()=>null;' : 'export const recordActivity=()=>undefined;', loader: 'js' }));
        builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'css' }));
        builder.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js' }));
      } }] });
    assert.ok(!Object.keys(built.metafile.inputs).some(file => /integrations\/supabase|fetchPlayers/.test(file)), 'No database transport enters fixture');
    await writeFile(path.join(receipts, `${current || 'normal'}-metafile.json`), JSON.stringify(built.metafile, null, 2));
    await writeFile(path.join(folder, 'runner.mjs'), `import fs from 'node:fs';\nimport { JSDOM } from 'jsdom';\nconst dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost',pretendToBeVisual:true});\nObject.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});\nfor(const key of ['window','document','HTMLElement','HTMLButtonElement','Element','Node','localStorage','Event','MouseEvent','MutationObserver'])globalThis[key]=dom.window[key];\nglobalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.matchMedia=()=>({matches:true,media:'(prefers-reduced-motion: reduce)',addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});\nconst errors=[],oldError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));oldError(...args);};window.addEventListener('error',event=>errors.push(String(event.error||event.message)));\ntry{const E=await import('./product.mjs');const report=await E.run();report.errors=errors;fs.writeFileSync(process.env.NHL_ROSTER_REPORT,JSON.stringify(report,null,2));for(const row of report.rows)console.log(row.status+': '+row.title);process.exitCode=report.failed?1:0;}finally{console.error=oldError;dom.window.close();}\n`);
    const reportFile = path.join(receipts, `${current || 'normal'}.json`), transport = path.join(receipts, `${current || 'normal'}-transport.txt`);
    const child = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(folder, 'runner.mjs')], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, NODE_ENV: 'test', NHL_ROSTER_REPORT: reportFile, SIM_OFFLINE_RECEIPT: transport } });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`;
    await writeFile(path.join(receipts, `${current || 'normal'}.log`), output);
    await writeFile(path.join(receipts, `${current || 'normal'}-child.json`), JSON.stringify({ status: child.status, signal: child.signal, error: child.error?.message ?? null }, null, 2));
    assert.ok(!child.error && !child.signal, 'Bounded full component proof finishes');
    assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|Transform failed|not wrapped in act|Maximum update depth/);
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const targets = current === 'original' ? [0, 1, 2] : controls[current]?.[2] ?? [];
    const failed = report.rows.flatMap((row, index) => row.status === 'FAIL' ? [index] : []);
    await writeFile(path.join(receipts, `${current || 'normal'}-attempt.json`), JSON.stringify({ current: current || 'normal', targets, failed, status: child.status }, null, 2));
    assert.equal(report.total, 4); assert.equal(report.rows.length, 4); assert.deepEqual(report.rows.map(row => row.title), titles);
    assert.ok(report.rows.every(row => row.status === 'PASS' || row.status === 'FAIL'), 'All cases execute, zero skips');
    assert.deepEqual(report.errors, []); assert.deepEqual(failed, targets, 'Exact meaningful intended control outcomes');
    assert.equal(report.failed, targets.length); assert.equal(report.passed, 4 - targets.length); assert.equal(child.status, targets.length ? 1 : 0);
    for (const row of report.rows.filter(row => row.status === 'FAIL')) assert.equal(row.error.name, 'AssertionError', 'No product, loader or timeout fault credits a control');
    assert.equal(report.rows[3].status, 'PASS', 'Independent ordinary full engine outcome and RNG baseline always holds');
    try { assert.equal((await readFile(transport, 'utf8')).trim(), '', 'No outside requests'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'Every raw source byte holds'); }
    if (candidate) { const currentBytes = await readFile(path.resolve(candidatePath)); assert.deepEqual(currentBytes, candidate.bytes, 'Candidate raw bytes hold'); }
    if (capturedReference) { const currentBytes = await readFile(path.resolve(referencePath)); assert.deepEqual(currentBytes, capturedReference.bytes, 'Captured physical reference raw bytes hold'); }
    const row = { mode: current || 'normal', total: 4, passed: report.passed, rejected: report.failed, exactTargets: targets };
    outcomes.push(row);
    await writeFile(path.join(receipts, `${current || 'normal'}-accepted.json`), JSON.stringify({ ...row, reference, sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])), rawSourcesHeld: true, outsideAttempts: 0 }, null, 2));
    console.log(`NHL roster ${current || 'normal'}: ${report.passed}/4 passed, ${report.failed} exact outcome rejections, all four cases executed.`);
  }
  await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify({ outcomes, reference, sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])), limits: 'Actual Board/engine and DOM-dispatched controls using accepted trades, generated draft and real offseason as a local fixture. Exact waiver/dead-money/no-re-sign/reload and within-limit engine/RNG proof. The roster fixture uses automatic contributors; manual contributor preferences are preserved in source but not newly exercised. No native input, layout, medical or historical fact, full played season, complete CPU draft or economy approval claim.' }, null, 2));
  console.log(`NHL roster receipt: ${receipts}`);
} finally {
  assert.equal(path.dirname(path.resolve(folder)), parent); assert.ok(path.basename(folder).startsWith('nhl-roster968-'));
  await rm(folder, { recursive: true, force: true });
  for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'Final raw sources hold after owned cleanup'); }
  if (candidate) { const currentBytes = await readFile(path.resolve(candidatePath)); assert.deepEqual(currentBytes, candidate.bytes, 'Final candidate raw bytes hold'); }
  if (capturedReference) { const currentBytes = await readFile(path.resolve(referencePath)); assert.deepEqual(currentBytes, capturedReference.bytes, 'Final captured physical reference raw bytes hold'); }
}
console.log('NHL roster: exact controls, CRLF-safe matching, bounded cleanup and zero outside transport verified.');
