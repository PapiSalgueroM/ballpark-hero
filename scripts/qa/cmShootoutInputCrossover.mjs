import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const option = name => { const i = process.argv.indexOf(name); assert(i >= 0 && process.argv[i + 1], name + ' required'); return path.resolve(process.argv[i + 1]); };
const root = process.cwd(), out = option('--out'), evidence = option('--evidence');
assert(process.env.RUNNER_TEMP && out.startsWith(path.resolve(process.env.RUNNER_TEMP) + path.sep));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const parent = 'b8752befa860442e3ac2ad7c4d569d5ef0723704';
assert.equal(git(['rev-parse', 'HEAD^']), parent);
assert.equal(git(['rev-parse', 'HEAD:src/lib/clubManager.ts']), '9d8dc92557bf2f4358b5be044359354eda841769');
assert.equal(git(['hash-object', 'scripts/simCmShootoutOrder.mjs']), '8d348809a1cb6556d6628fa6571e0c38b3005bf1');
const files = git(['ls-files', '-z']).split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const before = inventory();
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/source-before.json', JSON.stringify(before, null, 2) + '\n');
const original = fs.readFileSync(evidence + '/original-harness.mjs', 'utf8');
assert.equal(hash(original), '475420251c7b091b4f310374922c63d1835f9feb596bdde109236b3f98893b31');
const originalAdmission = read(evidence + '/trace-admission.json');
assert.equal(originalAdmission.traceEligible, true);
assert.deepEqual(originalAdmission.nativeExits, { vanilla: 1, observed: 1 });
const baseline = read(evidence + '/vanilla/normal-baseline.json');
assert.equal(baseline.rows.length, 150); assert.equal(baseline.namedBase.rows, 300);
assert.equal(baseline.firstDifference.seed, 782100);
const trace = read(evidence + '/trace/rng-traces.json');
const bundle = evidence + '/trace/executed-bundle.mjs';
assert.equal(hash(fs.readFileSync(bundle)), '1c714133dbf57f44e466db36384880b50c10cc205ef2c2b09cdd092ef3696d1e');
assert.equal(trace.bundleSHA256, hash(fs.readFileSync(bundle)));
const inputPins = {
  'current-compatible': '1b7f26d484ab9686553563ed18fe936494329a0b315921023923d1c47e896a20',
  'old-5b70': '84e5aee69543a789791db28e6881f7f5f2399ea75c308603b1911af233d11276',
};
for (const [name, digest] of Object.entries(inputPins)) {
  assert.equal(hash(fs.readFileSync(evidence + '/trace/' + name + '-input.json')), digest);
  assert.equal(trace.traces.find(row => row.label === name)?.inputSHA256, digest);
}
for (const row of trace.sources) assert.equal(hash(fs.readFileSync(evidence + '/trace/' + row.copy)), row.sha256);

const ts = createRequire(path.join(root, 'package.json'))('typescript');
const tree = ts.createSourceFile('simCmShootoutOrder.mjs', original, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(tree.parseDiagnostics.length, 0);
const selected = [];
function declaration(name, kind) {
  const matches = tree.statements.filter(statement => kind === 'function'
    ? ts.isFunctionDeclaration(statement) && statement.name?.text === name
    : ts.isVariableStatement(statement) && statement.declarationList.declarations.some(row => ts.isIdentifier(row.name) && row.name.text === name));
  assert.equal(matches.length, 1, 'Actual executable declaration: ' + name);
  const text = matches[0].getText(tree);
  selected.push({ name, kind, start: matches[0].getStart(tree), end: matches[0].getEnd(), sha256: hash(text) });
  return text;
}
const variables = ['failures', 'section', 'failedSections', 'abort', 'fail', 'FIXED_NOW', 'sortedJSON', 'HAUL_NAMED', 'asOldHaulWords', 'row'];
const functions = ['mulberry32', 'withSeed', 'fnv', 'legacyDefaultReport', 'playCup', 'compareContent'];
const helperSource = "import { createHash } from 'node:crypto';\n" + variables.map(name => declaration(name, 'variable')).concat(functions.map(name => declaration(name, 'function'))).join('\n')
  + '\nsection = 4;\nexport { playCup, compareContent, row };\nexport const diagnostics = () => ({ failures, failedSections });\n';
fs.writeFileSync(out + '/original-helpers.mjs', helperSource);
fs.writeFileSync(out + '/extracted-declarations.json', JSON.stringify({ originalGit: '8d348809a1cb6556d6628fa6571e0c38b3005bf1', originalSHA256: hash(original), declarations: selected, helperSHA256: hash(helperSource), scope: 'Exact original executable statements selected by AST. No PRNG, match, formatting or comparison body is rewritten.' }, null, 2) + '\n');

const workerSource = "import fs from 'node:fs';\nimport path from 'node:path';\nimport crypto from 'node:crypto';\nimport {pathToFileURL} from 'node:url';\nconst [root,evidence,inputName,engineName,destination,helpers]=process.argv.slice(2);\nprocess.argv[1]=path.resolve(root,'scripts/simCmShootoutOrder.mjs');\nawait import(pathToFileURL(path.join(root,'scripts/lib/seedRandom.mjs')).href);\nconst digest=b=>crypto.createHash('sha256').update(b).digest('hex');\ntry {\n  const engines=await import(pathToFileURL(path.join(evidence,'trace/executed-bundle.mjs')).href);\n  const api=await import(pathToFileURL(helpers).href);\n  const engine=engineName==='current-compatible'?engines.historical:engines.baseline;\n  if(typeof engine?.playNextEntry!=='function')throw new Error('Retained engine export is missing');\n  const bytes=fs.readFileSync(path.join(evidence,'trace',inputName+'-input.json'));\n  const state=JSON.parse(bytes.toString('utf8'));\n  const before=JSON.stringify(state),inputContext={week:state.week,matchRules:Object.hasOwn(state,'matchRules')?state.matchRules:null};\n  const output=api.playCup(state,782100,engine);\n  const codeChecks=api.diagnostics();\n  fs.writeFileSync(destination,JSON.stringify({inputName,engineName,seed:782100,inputSHA256:digest(bytes),inputContext,inputObjectHeld:JSON.stringify(state)===before,output,codeChecks,context:'Fresh retained bundle per cell, exact original match/PRNG/helper statements, no career preparation or input normalization.'},null,2)+'\\n');\n  process.exitCode=codeChecks.failures?1:0;\n} catch(error) {\n  fs.writeFileSync(destination,JSON.stringify({inputName,engineName,error:{name:error.name,message:error.message,stack:error.stack}},null,2)+'\\n');\n  process.exitCode=2;\n}\n";
fs.writeFileSync(out + '/replay-worker.mjs', workerSource);
const report = {
  comparisonEligible: false, parent, carrierSource: parent, seed: 782100,
  originalNativeExits: originalAdmission.nativeExits, originalFailuresWaived: false,
  inputPins, bundleSHA256: trace.bundleSHA256, matrix: [], diagonals: [], comparisons: [],
  limits: 'Four fresh-module one-match cells. Both diagonal full reports/states and next-draw rows must reproduce the original trace before any cross-input inference. Original four failures remain failed. No input fields are normalized or repaired by this caller.',
};
let problem = null;
try {
  for (const inputName of Object.keys(inputPins)) for (const engineName of Object.keys(inputPins)) {
    const name = inputName + '--' + engineName, dest = out + '/' + name + '.json', receipt = out + '/' + name + '-transport.log';
    fs.writeFileSync(receipt, '');
    const env = { ...process.env, CI: '1', SIM_NETWORK: 'offline', TZ: 'UTC', NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: receipt };
    for (const key of ['SIM_SEED', 'CM_SHOOTOUT_CONTROL', 'CM_SHOOTOUT_WRITE_FIXTURE', 'ONLY', 'BROWSER']) delete env[key];
    const run = spawnSync('timeout', ['--kill-after=15s', '120s', process.execPath, out + '/replay-worker.mjs', root, evidence, inputName, engineName, dest, out + '/original-helpers.mjs'], { env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 135000 });
    fs.writeFileSync(out + '/' + name + '.stdout.log', run.stdout || '');
    fs.writeFileSync(out + '/' + name + '.stderr.log', run.stderr || '');
    fs.writeFileSync(out + '/' + name + '.exit', String(run.status) + '\n');
    const value = fs.existsSync(dest) ? read(dest) : null;
    report.matrix.push({ inputName, engineName, nativeExit: run.status, signal: run.signal, error: run.error ? String(run.error) : null, resultPresent: value !== null });
    const cell = report.matrix[report.matrix.length - 1];
    try {
      assert(!run.error && !run.signal); assert.equal(run.status, 0, 'One-match replay completed: ' + name);
      assert.equal(fs.statSync(receipt).size, 0); assert(value && !value.error);
      assert.equal(value.inputSHA256, inputPins[inputName]); assert.equal(value.codeChecks.failures, 0);
      assert.doesNotMatch((run.stdout || '') + (run.stderr || ''), /unhandledRejection|uncaughtException|Unhandled (?:Error|Rejection)/i);
      cell.eligible = true;
    } catch (error) { cell.eligible = false; cell.problem = { name: error.name, message: error.message }; }
  }
  assert.equal(report.matrix.length, 4); assert(report.matrix.every(cell => cell.eligible), 'All four actual replay cells completed without runtime or validation failures');
  const api = await import(pathToFileURL(out + '/original-helpers.mjs').href);
  const results = Object.fromEntries(report.matrix.map(cell => [cell.inputName + '--' + cell.engineName, read(out + '/' + cell.inputName + '--' + cell.engineName + '.json')]));
  for (const [name, role] of [['current-compatible', 'candidate'], ['old-5b70', 'baseline']]) {
    const value = results[name + '--' + name];
    assert.deepEqual(api.row(value.output), baseline.rows[0][role], 'Faithful diagonal row: ' + name);
    assert.deepEqual({ report: value.output.report, state: value.output.state }, baseline.firstDifference[role], 'Faithful diagonal full report and state: ' + name);
    report.diagonals.push({ name, row: api.row(value.output), fullOriginalReportAndStateEqual: true });
  }
  for (const inputName of Object.keys(inputPins)) {
    const current = results[inputName + '--current-compatible'], old = results[inputName + '--old-5b70'];
    const comparison = api.compareContent(current.output, old.output);
    report.comparisons.push({ inputName, identicalInputSHA256: current.inputSHA256, current: api.row(current.output), old: api.row(old.output), ...comparison });
  }
  const actual = results['current-compatible--current-compatible'].output;
  const changed = structuredClone(actual); changed.next = actual.next === 0 ? 0.5 : 0;
  assert.notEqual(changed.next, actual.next);
  assert.throws(() => assert.deepEqual(api.row(changed), baseline.rows[0].candidate), { name: 'AssertionError' });
  assert.equal(api.compareContent(actual, changed).paired, false);
  report.checkerControls = { changedActualNextDraw: true, diagonalIdentityRejected: true, exactOriginalComparatorRejected: true };
  assert.equal(api.diagnostics().failures, 0, 'The original default-record validation remains satisfied');
  report.comparisonEligible = true;
  report.meaning = 'The two paired values report exact parity or nonparity under an identical actual input. Parity is measured, not required for diagnostic completion. No cause or adapter is chosen here.';
} catch (error) {
  problem = error; report.error = { name: error.name, message: error.message, stack: error.stack };
} finally {
  const after = inventory();
  fs.writeFileSync(out + '/source-after.json', JSON.stringify(after, null, 2) + '\n');
  report.sourceHeld = JSON.stringify(after) === JSON.stringify(before);
  report.cleanAfter = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
  for (const [name, digest] of Object.entries(inputPins)) assert.equal(hash(fs.readFileSync(evidence + '/trace/' + name + '-input.json')), digest);
  assert.equal(hash(fs.readFileSync(bundle)), trace.bundleSHA256);
  fs.writeFileSync(out + '/crossover-admission.json', JSON.stringify(report, null, 2) + '\n');
}
if (problem || !report.sourceHeld || !report.cleanAfter) { console.error(problem || 'Source closure failed'); process.exitCode = 2; }
else { console.log('Four identical-input cells retained with faithful diagonals. Original four Shootout failures remain unwaived.'); process.exitCode = 1; }
