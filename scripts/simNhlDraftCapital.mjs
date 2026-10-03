/* Actual NHL draft capital, legacy recovery and copied executable controls. */
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
const board = 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', engine = 'src/lib/nhlFrontOffice.ts';
const fixture = 'src/test/NhlDraftCapital.outcomes.tsx';
const files = [board, engine, fixture, 'scripts/simNhlDraftCapital.mjs', 'src/lib/frontOfficeSave.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/foSchedule.ts', 'src/lib/entityIds.ts', 'src/data/nhlFoPlayers.ts', 'src/data/nhlOpeningRatings.ts', 'src/components/nhl-front-office/NhlContributors.module.css'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = new Map(await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))])));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const code = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const titles = [...held.get(fixture).source.matchAll(/^    \['([^']+)', async/gm)].map(match => match[1]);
assert.equal(titles.length, 16, 'Sixteen meaningful complete outcomes are bound');
const damaged = "      if (capital == null || (s.picksLeft ?? 0) > NHL_TEAMS.length * 2\n        || (s.phase === 'draft' && !Number.isInteger(s.picksLeft))\n        || (s.phase === 'draft' && s.league.round !== NHL_FO_ROUNDS && !legacyFinished)\n        || (s.draftBatchesLeft !== undefined && (!Number.isInteger(s.draftBatchesLeft) || s.draftBatchesLeft < 0 || s.draftBatchesLeft > 2\n          || (s.phase === 'draft' && s.picksLeft === 0 && s.draftBatchesLeft === 0)))) { setSaveError(true); return; }";
const controls = {
  count: [board, '    const count = nhlDraftCapital(lg.teams[team]);', '    const count = 2;', [1, 2, 3, 12]],
  human: [board, '    if (!nhlConsumeDraftPick(mine)) return;', '    void mine;', [1, 3, 4, 6, 9, 10, 12, 14]],
  eligible: [engine, '(nhlDraftCapital(league.teams[abbr]) ?? 0) > 0', 'true', [5, 12]],
  ai: [engine, 'nhlConsumeDraftPick(team);', 'void team;', [5], 2],
  quota: [board, 'persist({ draftClass: nextClass, picksLeft: nextPicks, draftBatchesLeft: beforeBatches - batchCount }, lg, myTeam);', 'persist({ draftClass: nextClass, picksLeft: nextPicks, draftBatchesLeft: 2 }, lg, myTeam);', [3, 4, 6, 9]],
  batches: [board, '    const batchCount = nextPicks === 0 ? beforeBatches : Math.min(1, beforeBatches);', '    const batchCount = 1;', [1, 3, 9, 12]],
  legacy: [board, '    if (draftBatchesLeft === null && mine.picks.length > picksLeft) mine.picks = mine.picks.slice(-picksLeft);', '    void mine;', [6]],
  duplicate: [board, ' || draftAction.current', '', [10], 3],
  zero: [board, '(picksLeft > 0 && league.teams[myTeam].picks.length > 0)', 'league.teams[myTeam].picks.length > 0', [7]],
  recovery: [board, '    setDraftClass(cls); persist({ draftClass: cls }, league, myTeam);', '    void cls;', [11]],
  pool: [board, 'nhlDraftClass(Math.random, Math.max(24, count + 10), leagueNames(lg));', 'nhlDraftClass(Math.random, 24, leagueNames(lg));', [12]],
  damaged: [board, damaged, '      void capital; void legacyFinished;', [13]],
  completed: [board, "      persist({ phase: 'hub', draftClass: null, picksLeft: 0, draftBatchesLeft: 0 }, league, myTeam);", '      void league;', [8]],
  spent: [board, '    if (draftBatchesLeft === null && picksLeft === 0) lg.teams[myTeam].picks = [];', '    void lg;', [7]],
  opening: [board, "  const openDraft = (lg: NhlLeague, team: string, patch: Partial<SaveShape> = {}) => {\n    if (draftAction.current) return;", "  const openDraft = (lg: NhlLeague, team: string, patch: Partial<SaveShape> = {}) => {", [10]],
  sparse: [engine, 'Array.from(team.picks).every(pick => pick === 1 || pick === 2)', 'team.picks.every(pick => pick === 1 || pick === 2)', [5]],
  available: [board, '    const availablePicks = Math.min(picksLeft, my.picks.length);', '    const availablePicks = picksLeft;', [14]],
  remaining: [board, '    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);', '    const nextPicks = picksLeft - 1;', [14]],
  finished: [board, '&& s.league.round === 1 && s.league.champions.some(c => c.season === s.league.season - 1);', '&& s.league.round === 1;', [13]],
  integer: [board, "        || (s.phase === 'draft' && !Number.isInteger(s.picksLeft))\n", '', [13]],
};
const mode = process.env.NHL_DRAFT_CONTROL || '';
assert.ok(!mode || mode === 'all' || mode === 'original' || Object.hasOwn(controls, mode), 'Known NHL draft control');
for (const [file, anchor, replacement, , count = 1] of Object.values(controls)) {
  const source = held.get(file).source;
  assert.equal(code(source).split(anchor).length - 1, count, 'Exact executable control binding');
  assert.notEqual(source.replaceAll(anchor, replacement), source, 'The actual executable control changes source');
  const bytes = Buffer.from(source.replaceAll('\n', '\r\n')), before = Buffer.from(bytes);
  assert.equal(code(holdSource(bytes).source).split(anchor).length - 1, count, 'The same executable binding holds on CRLF');
  assert.deepEqual(bytes, before, 'Synthetic raw CRLF bytes remain held');
}
const originals = new Map();
for (const file of [board, engine]) {
  const result = spawnSync('git', ['show', `cc2ea373:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!result.error && !result.signal); assert.equal(result.status, 0, 'Physical pre967 reference exists');
  originals.set(file, result.stdout.replaceAll('\r\n', '\n'));
}
const reference = { commit: 'cc2ea373', engineNormalizedSha256: hash(originals.get(engine)), boardNormalizedSha256: hash(originals.get(board)), strictOriginal: mode === 'all' || mode === 'original' };
if (reference.strictOriginal) {
  assert.equal(reference.engineNormalizedSha256, '20407781e20663a640269abd0ea96b3ffdeda0521e0c6590194abac46d96441f');
  assert.equal(reference.boardNormalizedSha256, '82adb26f852d646934d81b4d6695d62063914a7222d5b07904b8ad58d88e5f73');
}
const parent = path.resolve(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'nhl-draft967-'));
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-nhl967-proof-'));
const originalExpected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const outcomes = [];
try {
  for (const current of mode === 'all' ? ['', 'original', ...Object.keys(controls)] : [mode]) {
    let boardSource = current === 'original' ? originals.get(board) : held.get(board).source;
    let engineSource = current === 'original' ? originals.get(engine) : held.get(engine).source;
    if (controls[current]) {
      const [file, anchor, replacement] = controls[current];
      if (file === board) boardSource = boardSource.replaceAll(anchor, replacement);
      else engineSource = engineSource.replaceAll(anchor, replacement);
    }
    const libImports = source => source.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    await writeFile(path.join(folder, 'Engine.ts'), libImports(engineSource));
    await writeFile(path.join(folder, 'Original.ts'), libImports(originals.get(engine)));
    await writeFile(path.join(folder, 'Board.tsx'), boardSource.replace("from './NhlContributors.module.css'", "from '@/components/nhl-front-office/NhlContributors.module.css'"));
    await writeFile(path.join(folder, 'EngineTrace.ts'), `export * from './Engine';\nimport * as actual from './Engine';\nexport const trace = { ai: [], summers: [], drafts: [], clear() { this.ai.length = 0; this.summers.length = 0; this.drafts.length = 0; } };\nexport function nhlDraftClass(...args) { const result = actual.nhlDraftClass(...args); trace.drafts.push(result.length); return result; }\nexport function nhlAiDraftPicks(...args) { const result = actual.nhlAiDraftPicks(...args); trace.ai.push({ order: [...args[2]], picks: result.picks.map(p => p.prospect.name) }); return result; }\nexport function nhlOffseason(...args) { trace.summers.push(JSON.parse(JSON.stringify(args[0]))); return actual.nhlOffseason(...args); }\n`);
    await writeFile(path.join(folder, 'entry.ts'), `export { run } from '${path.join(root, fixture).replaceAll('\\', '/')}';\nexport * as reference from './Original';\nexport { trace } from './EngineTrace';\n`);
    const built = await build({ entryPoints: [path.join(folder, 'entry.ts')], outfile: path.join(folder, 'product.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent', metafile: true,
      alias: { '@/components/nhl-front-office/NhlFrontOfficeBoard': path.join(folder, 'Board.tsx'), '@/lib/nhlFrontOffice': path.join(folder, 'EngineTrace.ts'), '@': path.join(root, 'src') },
      plugins: [{ name: 'explicit-quiet-seams', setup(builder) {
        builder.onResolve({ filter: /useGameCompletion|(?:\/|^)completions(?:\.ts)?$|ShareButtons/ }, args => ({ path: args.path, namespace: 'quiet' }));
        builder.onLoad({ filter: /.*/, namespace: 'quiet' }, args => ({ contents: args.path.includes('useGameCompletion') ? 'export const useGameCompletion=()=>undefined;' : args.path.includes('ShareButtons') ? 'export default ()=>null;' : 'export const recordActivity=()=>undefined;', loader: 'js' }));
        builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'css' }));
        builder.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js' }));
      } }] });
    assert.ok(!Object.keys(built.metafile.inputs).some(file => /integrations\/supabase|fetchPlayers/.test(file)), 'No database transport code enters this actual Board fixture');
    await writeFile(path.join(receipts, `${current || 'normal'}-metafile.json`), JSON.stringify(built.metafile, null, 2));
    await writeFile(path.join(folder, 'runner.mjs'), `import fs from 'node:fs';\nimport { JSDOM } from 'jsdom';\nconst dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost',pretendToBeVisual:true});\nObject.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});\nfor(const key of ['window','document','HTMLElement','HTMLButtonElement','Element','Node','localStorage','Event','MouseEvent','MutationObserver']) globalThis[key]=dom.window[key];\nglobalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window); globalThis.IS_REACT_ACT_ENVIRONMENT=true;\nconst errors=[], oldError=console.error; console.error=(...args)=>{errors.push(args.map(String).join(' '));oldError(...args);}; dom.window.addEventListener('error',event=>errors.push(String(event.error||event.message)));\ntry {const E=await import('./product.mjs');const report=await E.run(E.reference,E.trace);report.errors=errors;fs.writeFileSync(process.env.NHL_DRAFT_REPORT,JSON.stringify(report,null,2));for(const row of report.rows)console.log(row.status+': '+row.title);process.exitCode=report.failed?1:0;}finally{console.error=oldError;dom.window.close();}\n`);
    const reportFile = path.join(receipts, `${current || 'normal'}.json`), transport = path.join(receipts, `${current || 'normal'}-transport.txt`);
    const child = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(folder, 'runner.mjs')], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, NODE_ENV: 'test', NHL_DRAFT_REPORT: reportFile, SIM_OFFLINE_RECEIPT: transport } });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`; await writeFile(path.join(receipts, `${current || 'normal'}.log`), output);
    await writeFile(path.join(receipts, `${current || 'normal'}-child.json`), JSON.stringify({ status: child.status, signal: child.signal, error: child.error?.message ?? null }, null, 2));
    assert.ok(!child.error && !child.signal, 'Bounded actual Board proof finishes');
    assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|Transform failed|not wrapped in act|Maximum update depth/);
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const expected = current === 'original' ? originalExpected : controls[current]?.[3] ?? [];
    const failed = report.rows.flatMap((row, index) => row.status === 'failed' ? [index] : []);
    await writeFile(path.join(receipts, `${current || 'normal'}-attempt.json`), JSON.stringify({ current: current || 'normal', expected, failed, status: child.status }, null, 2));
    assert.equal(report.total, 16); assert.equal(report.rows.length, 16); assert.deepEqual(report.rows.map(row => row.title), titles);
    assert.ok(report.rows.every(row => ['passed', 'failed'].includes(row.status)), 'Every case executes without skips');
    assert.deepEqual(report.errors, [], 'No component or console errors');
    assert.deepEqual(failed, expected, 'Exact intended outcome rejection set'); assert.equal(report.failed, expected.length); assert.equal(report.passed, 16 - expected.length);
    assert.equal(child.status, expected.length ? 1 : 0);
    for (const row of report.rows.filter(row => row.status === 'failed')) assert.equal(row.error.name, 'AssertionError', 'Controls reject only on meaningful outcome assertions');
    assert.equal(report.rows[0].status, 'passed', 'Restored save and unrelated payload baseline holds');
    assert.equal(report.rows[15].status, 'passed', 'Original normal league, rookie terms, RNG and affordability baselines hold');
    try { assert.equal((await readFile(transport, 'utf8')).trim(), '', 'No outside transport attempts'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'Source raw bytes stay held'); }
    const outcome = { mode: current || 'normal', total: 16, passed: report.passed, rejected: report.failed, exactTargets: expected };
    outcomes.push(outcome);
    await writeFile(path.join(receipts, `${current || 'normal'}-accepted.json`), JSON.stringify({ ...outcome, reference, sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])), rawSourcesHeld: true, outsideAttempts: 0 }, null, 2));
    console.log(`NHL draft ${current || 'normal'}: ${report.passed}/16 passed, ${report.failed} exact outcome rejections, all cases executed.`);
  }
  await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify({ outcomes, reference, sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])), limits: 'Actual engine, Board and DOM-dispatched controls with explicitly simulated recap/draft saves and actual accepted trade APIs. Trace wrappers delegate unchanged engines, CSS/recording/share are inert seams. No native input, layout, historical facts, full played season, backend or dated future-pick ledger claim.' }, null, 2));
  console.log('NHL draft: actual traded capital, human/AI consumption, legacy saves, recovery and ordinary engine/RNG outcomes measured.');
  console.log(`NHL draft receipt: ${receipts}`);
} finally {
  const target = path.resolve(folder); assert.equal(path.dirname(target), parent, 'Cleanup target stays directly inside owned control parent');
  assert.ok(path.basename(target).startsWith('nhl-draft967-'), 'Cleanup target has its known owned prefix');
  await rm(target, { recursive: true, force: true });
  for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'All raw source bytes remain held after cleanup'); }
}
console.log('NHL draft: CRLF-safe executable controls, bounded owned-copy cleanup and zero outside transport verified.');
