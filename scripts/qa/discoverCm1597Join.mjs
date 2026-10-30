import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
const CONTRACT = {"schema":1,"status":"BOUND_SOURCE_ONLY_UNRUN","product":"f5ecd0f9f31c9603a4f8ae095e8b06ac5686c47c","productTree":"3c71787c5bf5e84f8346a5248b8700840475c1a3","productParent":"d4558a9e7a5d2f7e8f05f329578aac6ccad9bdb0","productParentTree":"5113319e10b5254ae7a3721a4c086e934b2fa16e","productFiles":5461,"proofFiles":5464,"branch":"codex/cm-1597-literal-join-discovery-20261030","engine":{"path":"src/lib/clubManager.ts","sha256":"77833608422e167b62d9d8da6b8a3ad6c988effbdc699d768c0a99def6c1ffeb","bytes":1253430,"gitBlob":"ebe9f28efdb1d4fbba289f8a92a166d82f607c09"},"files":[{"file":"src/test/cmFreeAgentContinuity.test.ts","sha256":"63444df9baacfbf418dca0e479ab2e6a3bf0d8064b255e2b3ec2c296b1d5f133","gitBlob":"9dc0568ee56338b5c932c9fed0c4df20d1879ba1","cases":[{"ancestorTitles":["Club Manager free-agent continuity"],"title":"recovers a naturally expired player in the arrival season without a cheaper contract"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"restores a later free-agent signing with the same identity and durable development"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"uses renewal wage and fee floors when an expired player returns"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps a promoted academy identity after expiry and reload"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps manual release embargoes and ordinary signing limits"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps summer retirement terminal instead of listing the player as free"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"loads legacy thin free agents without guessing an ambiguous world identity"}]},{"file":"src/test/cmFreeAgentLegacyIdentity.test.ts","sha256":"334a78d061b0d20c1beee2cfea3e4e09a2603b2ac5aac41eebb2bf405c9d302d","gitBlob":"ad3658dafa3c3ec8ff79f1849f94c8793a01cea8","cases":[{"ancestorTitles":["Club Manager legacy free-agent identity"],"title":"keeps a verified youth pad fictional when a thin legacy pool row omits generated"}]},{"file":"src/test/cmFreeAgentRetention.test.ts","bytes":7819,"sha256":"d5de9e491e3bcb9ad29b5d38364c4eb0f8dc77f95f31b2ee5823a53b646db1a7","gitBlob":"0b2cab5ce6eae125a6bc73c794460796491d6177","cases":[{"title":"keeps a living naturally expired player available after the third summer and reload","ancestorTitles":["Club Manager long free-agent retention"]},{"title":"removes canonical retirees and preserves ordinary pool expiry and manual release guards","ancestorTitles":["Club Manager long free-agent retention"]}]}],"originalCorpus":{"path":"scripts/fixtures/cmFreeAgencyOldSaves.json","commit":"d6d0244472cf3fba61d1ad85e10cce1d75740968","sha256":"f6ad7d901d2775a01c21de91f3279b2ab33ea05b74af7b1e7d9c0f099ee85747","gitBlob":"ae715b108a141bf5be5920cdcfdba185cdeba243","bytes":287840},"proofAdditions":[".github/workflows/cm-1597-join-discovery.yml","scripts/qa/discoverCm1597Join.mjs","src/test/cmFreeAgentRetention.test.ts"],"futureOnlyMarkers":["CM_FA_JOIN_KEYED_SUMMER","CM_FA_JOIN_RECOVERY_KEY"],"excluded":"K UI, K harnesses, K floors, canonical seam fixes, loan-checkpoint repair and all other K findings remain unadopted"}; // FIXED_SOURCE_CONTRACT
const REPORTER_PINS = [
  ['node_modules/vitest/dist/reporters.js', '374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
  ['node_modules/vitest/dist/chunks/index.VByaPkjc.js', '59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
  ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js', '4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
  ['node_modules/@vitest/runner/dist/chunk-hooks.js', '5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a'],
];
const checkout = process.cwd(), out = process.env.CM_JOIN_OUT;
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const git = args => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 1 << 29 });
const key = row => JSON.stringify([row.file, row.ancestorTitles, row.title]);
const cases = CONTRACT.files.flatMap(file => file.cases.map(row => ({ ...row, file: file.file })));
const root = path.join(out ?? '', 'matched-source');
function pin(file, expected) {
  const body = fs.readFileSync(file);
  if (expected.bytes !== undefined) assert.equal(body.length, expected.bytes, 'CM_JOIN_PIN_BYTES');
  assert.equal(sha(body), expected.sha256, 'CM_JOIN_PIN_SHA256');
  assert.equal(blob(body), expected.gitBlob, 'CM_JOIN_PIN_GIT'); return body;
}
function tree(ref) {
  return git(['ls-tree', '-rz', '--full-tree', ref]).toString().split('\0').filter(Boolean).map(row => {
    const m = /^(\d+) (blob) ([a-f0-9]{40})\t(.+)$/.exec(row);
    assert(m, 'CM_JOIN_REGULAR_BLOBS_ONLY'); assert(['100644', '100755'].includes(m[1]), 'CM_JOIN_EXPECTED_MODES');
    return { mode: m[1], gitBlob: m[3], path: m[4] };
  }).sort((a, b) => a.path.localeCompare(b.path));
}
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir).sort().flatMap(name => {
    const rel = prefix + name, file = path.join(dir, name), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return [{ path: rel, link: fs.readlinkSync(file) }];
    if (stat.isDirectory()) return inventory(file, rel + '/');
    assert(stat.isFile(), 'CM_JOIN_FILE_MEMBERSHIP'); return [{ path: rel, bytes: stat.size, sha256: sha(fs.readFileSync(file)) }];
  });
}
function run(id, command, args, cwd = root, timeout = 600000, extraEnv = {}) {
  const dir = path.join(out, id); fs.mkdirSync(dir, { recursive: true });
  const stdout = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(dir, 'stderr.log'), 'wx');
  const start = new Date().toISOString(), time = process.hrtime.bigint(); let result;
  try { result = spawnSync(command, args, { cwd, env: { ...process.env, ...extraEnv, FORCE_COLOR: '0' }, timeout, killSignal: 'SIGKILL', stdio: ['ignore', stdout, stderr] }); }
  finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const receipt = { command, args, cwd, start, end: new Date().toISOString(), durationMs: Number(process.hrtime.bigint() - time) / 1e6, status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null };
  json(id + '/process.json', receipt); return receipt;
}
const requireZero = result => { assert.equal(result.status, 0, 'CM_JOIN_RAW_EXIT'); assert.equal(result.signal, null, 'CM_JOIN_RAW_EXIT'); assert.equal(result.error, null, 'CM_JOIN_RAW_EXIT'); };
function inspect(actual) {
  const { process: raw, report, runtime } = actual;
  requireZero(raw); assert.equal(runtime.arrayReceived, true, 'CM_JOIN_RUNTIME'); assert.equal(runtime.count, 0, 'CM_JOIN_RUNTIME');
  assert.deepEqual(runtime.errors, [], 'CM_JOIN_RUNTIME'); assert.deepEqual(runtime.fileErrors, [], 'CM_JOIN_RUNTIME');
  assert.equal(report.success, true, 'CM_JOIN_COUNTS'); const rows = [];
  assert.deepEqual(report.testResults.map(file => path.relative(root, file.name).split(path.sep).join('/')).sort(), CONTRACT.files.map(file => file.file).sort(), 'CM_JOIN_FILES');
  for (const file of report.testResults) {
    assert.equal(file.message, '', 'CM_JOIN_FILE_ERROR'); assert.equal(file.status, 'passed', 'CM_JOIN_CASE_STATUS');
    rows.push(...file.assertionResults.map(row => ({ ...row, file: path.relative(root, file.name).split(path.sep).join('/') })));
  }
  assert.equal(new Set(rows.map(key)).size, 10, 'CM_JOIN_IDENTITIES'); assert.deepEqual(rows.map(key).sort(), cases.map(key).sort(), 'CM_JOIN_IDENTITIES');
  for (const row of rows) { assert.equal(row.fullName, [...row.ancestorTitles, row.title].join(' '), 'CM_JOIN_IDENTITIES'); assert.equal(row.status, 'passed', 'CM_JOIN_CASE_STATUS'); assert.deepEqual(row.failureMessages, [], 'CM_JOIN_CASE_STATUS'); }
  for (const [field, count] of Object.entries({ numTotalTests: 10, numPassedTests: 10, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, numPendingTestSuites: 0, numFailedTestSuites: 0 })) assert.equal(report[field], count, 'CM_JOIN_COUNTS');
  assert(report.numPassedTestSuites > 0); assert.equal(report.numTotalTestSuites, report.numPassedTestSuites, 'CM_JOIN_COUNTS'); return { total: 10, passed: 10, failed: 0, skipped: 0, runtimeErrors: 0, exactIdentities: cases.map(key).sort() };
}
function reporter() {
  const req = createRequire(path.join(root, 'package.json')), resolved = req.resolve('vitest/reporters');
  assert.equal(fs.realpathSync(resolved), fs.realpathSync(path.join(root, 'node_modules/vitest/dist/reporters.js')), 'CM_JOIN_PHYSICAL_REPORTER');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).scripts.test, 'vitest run');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'node_modules/vitest/package.json'))).version, '3.2.7');
  fs.mkdirSync(path.join(out, 'reporter-source'));
  for (const [file, expected] of REPORTER_PINS) { const body = fs.readFileSync(path.join(root, file)); assert.equal(sha(body), expected, 'CM_JOIN_REPORTER_PIN'); fs.writeFileSync(path.join(out, 'reporter-source', path.basename(file)), body, { flag: 'wx' }); }
  const body = [
    'import { JsonReporter } from ' + JSON.stringify(pathToFileURL(resolved).href) + ';',
    "import fs from 'node:fs'; import assert from 'node:assert/strict';",
    'export default class extends JsonReporter { async onFinished(files, errors, coverage) {',
    "assert(Array.isArray(files) && Array.isArray(errors), 'CM_BASELINE_ACTUAL_ERROR_ARRAY');",
    'const clean = error => ({name:error?.name??null,message:error?.message??String(error),stack:error?.stack??null});',
    'const fileErrors=files.flatMap(file=>(file.result?.errors??[]).map(error=>({file:file.filepath,...clean(error)})));',
    "fs.writeFileSync(process.env.CM_BASELINE_RUNTIME_JSON, JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(clean),fileErrors},null,2)+'\\n',{flag:'wx'});",
    'await super.onFinished(files, errors, coverage); } }',
  ].join('\n') + '\n';
  const file = path.join(out, 'runtime-json-reporter.mjs'); fs.writeFileSync(file, body, { flag: 'wx' }); requireZero(run('reporter-syntax', process.execPath, ['--check', file]));
  json('REPORTER-BINDING.json', { file, sha256: sha(body), resolved, physical: fs.realpathSync(resolved), pins: REPORTER_PINS }); return file;
}
async function units() {
  const custom = reporter(), dir = path.join(out, 'core10'); fs.mkdirSync(dir);
  const actual = { process: run('core10', 'npm', ['test', '--', ...CONTRACT.files.map(file => file.file), '--no-cache', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=' + custom, '--outputFile.json=' + path.join(dir, 'actual.json')], root, 600000, { CM_BASELINE_RUNTIME_JSON: path.join(dir, 'runtime.json') }), report: JSON.parse(fs.readFileSync(path.join(dir, 'actual.json'))), runtime: JSON.parse(fs.readFileSync(path.join(dir, 'runtime.json'))) };
  json('core10/ACTUAL.json', actual); const admitted = inspect(actual), foundation = Buffer.from(JSON.stringify(actual)), controls = [];
  const working = path.join(out, 'classifier-working.json'); fs.writeFileSync(working, foundation, { flag: 'wx' });
  for (const [id, marker, mutate] of [
    ['raw', 'CM_JOIN_RAW_EXIT', value => { value.process.status = 1; }],
    ['identity', 'CM_JOIN_IDENTITIES', value => { value.report.testResults[0].assertionResults[0].title += ' changed'; }],
    ['runtime', 'CM_JOIN_RUNTIME', value => { value.runtime.count = 1; value.runtime.errors = [{ name: 'OwnedCopyControl', message: 'copied classifier input only' }]; }],
  ]) {
    const changed = JSON.parse(foundation); mutate(changed); fs.writeFileSync(working, JSON.stringify(changed)); assert.notEqual(sha(fs.readFileSync(working)), sha(foundation));
    let refused; try { inspect(JSON.parse(fs.readFileSync(working))); } catch (error) { refused = error; } finally { fs.writeFileSync(working, foundation); }
    assert(refused instanceof assert.AssertionError && refused.message.includes(marker), 'CM_JOIN_CLASSIFIER_CONTROL'); assert.deepEqual(fs.readFileSync(working), foundation); inspect(JSON.parse(fs.readFileSync(working)));
    controls.push({ id, marker, beforeSHA256: sha(foundation), changedSHA256: sha(Buffer.from(JSON.stringify(changed))), restoredSHA256: sha(fs.readFileSync(working)), refusal: { name: refused.name, message: refused.message }, productPassCredit: false });
    json('classifier-' + id + '-changed.json', changed);
  }
  json('CLASSIFIER-CONTROLS.json', controls); json('CORE10-ADMISSION.json', admitted); return admitted;
}
async function discover() {
  const entry = path.join(out, 'engine-entry.mjs'), bundle = path.join(out, 'engine-bundle.cjs'), meta = path.join(out, 'engine-metafile.json');
  fs.writeFileSync(entry, [
    'export * as cm from ' + JSON.stringify(path.join(root, 'src/lib/clubManager.ts')) + ';',
    'export * as ledger from ' + JSON.stringify(path.join(root, 'src/lib/clubManagerWorldRoster.ts')) + ';',
  ].join('\n') + '\n', { flag: 'wx' });
  requireZero(run('bundle', path.join(root, 'node_modules/.bin/esbuild'), [entry, '--bundle', '--format=cjs', '--platform=node', '--alias:@=' + path.join(root, 'src'), '--outfile=' + bundle, '--metafile=' + meta, '--log-level=warning'], root, 180000));
  const compiled = JSON.parse(fs.readFileSync(meta)), inputs = Object.keys(compiled.inputs).map(file => {
    const absolute = path.resolve(root, file), body = fs.readFileSync(absolute);
    assert(absolute === entry || absolute.startsWith(root + path.sep) || absolute.startsWith(path.join(checkout, 'node_modules') + path.sep), 'CM_JOIN_COMPILED_INPUT_ROOT');
    return { file, bytes: body.length, sha256: sha(body), gitBlob: blob(body) };
  });
  const sourceInput = inputs.find(input => path.resolve(root, input.file) === path.join(root, CONTRACT.engine.path));
  assert(sourceInput); assert.equal(sourceInput.gitBlob, CONTRACT.engine.gitBlob, 'CM_JOIN_ACTUAL_COMPILED_ENGINE');
  json('COMPILED-ASSOCIATION.json', { entry: { bytes: fs.statSync(entry).size, sha256: sha(fs.readFileSync(entry)) }, bundle: { bytes: fs.statSync(bundle).size, sha256: sha(fs.readFileSync(bundle)) }, metafileSHA256: sha(fs.readFileSync(meta)), inputs });
  const storage = new Map(), priorStorage = globalThis.localStorage, priorRandom = Math.random, RealDate = Date, fetches = [], priorFetch = globalThis.fetch;
  globalThis.localStorage = { getItem: key => storage.has(String(key)) ? storage.get(String(key)) : null, setItem: (key, value) => storage.set(String(key), String(value)), removeItem: key => storage.delete(String(key)), clear: () => storage.clear(), get length() { return storage.size; }, key: index => [...storage.keys()][index] ?? null };
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-10-30T12:00:00.000Z'])); } static now() { return RealDate.parse('2026-10-30T12:00:00.000Z'); } };
  globalThis.fetch = async (...args) => { fetches.push(String(args[0])); throw new Error('CM_JOIN_NETWORK_FORBIDDEN'); };
  const roll = (value, action) => { const previous = Math.random; Math.random = () => value; try { return action(); } finally { Math.random = previous; } };
  try {
    const { cm, ledger } = createRequire(import.meta.url)(bundle); await cm.ensureAllEraRosters();
    const year = career => (career.startYear ?? 2026) + career.season - 1;
    const records = career => { const view = ledger.worldRosterView(cm.refreshWorldRoster(career)); assert(view && Array.isArray(view.records), 'CM_JOIN_VALID_LEDGER'); return view.records; };
    const saved = (career, file) => {
      assert.equal(cm.saveCareer(career), true, 'CM_JOIN_PUBLIC_SAVE'); const raw = storage.get(cm.SAVE_KEY); assert.equal(typeof raw, 'string');
      fs.writeFileSync(path.join(out, file), raw, { flag: 'wx' }); const loaded = roll(.6, () => cm.loadCareer()); assert(loaded, 'CM_JOIN_PUBLIC_LOAD');
      return { loaded, receipt: { file, bytes: Buffer.byteLength(raw), sha256: sha(raw) } };
    };
    const attempts = []; let collision;
    for (let seed = 5100; seed < 5132 && !collision; seed++) {
      storage.clear();
      const initial = roll(.6, () => cm.startCareer('Everton', 'now', undefined, undefined, { yearsOn: 0, uclField: null, keepLeagueOverrides: false, worldSeed: seed }));
      const squad = [...initial.squad.filter(p => p.position === 'GK').slice(0, 2), ...initial.squad.filter(p => p.position !== 'GK').slice(0, 16)].map(p => ({ ...p, contractYears: 4 }));
      assert.equal(squad.length, 18, 'CM_JOIN_LEGAL_SQUAD');
      let state = { ...initial, squad, budget: 9999, wageCap: 9999, xiIds: cm.autoPickXI(squad, cm.FORMATIONS[initial.formationIndex]) };
      const man = { ...squad.find(p => p.position !== 'GK'), id: 'qa-join-A-' + seed, name: 'QA Join Identity', position: 'CM', age: 20, rating: 40, value: .2, potential: 86, secondaryPositions: ['RW'], generated: true, isYouth: false, contractYears: 1, wage: 80, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0, seasonGoals: 7, seasonAssists: 4, apps: 12 };
      delete man.worldRosterKey; delete man.worldRosterSince; delete man.onLoan;
      state = { ...state, squad: [...state.squad, man] };
      state = ledger.recordWorldRosterTransfer(state, { player: man, from: 'Arsenal', to: state.clubName, kind: 'permanent', since: 0 });
      const actual = state.squad.find(p => p.id === man.id), keyA = actual?.worldRosterKey;
      assert.equal(typeof keyA, 'string', 'CM_JOIN_PUBLIC_PERMANENT_TRANSFER');
      let current = roll(.6, () => cm.startNextSeason(state));
      const poolA = current.freeAgents?.filter(row => row.worldRosterKey === keyA) ?? [];
      assert.equal(poolA.length, 1, 'CM_JOIN_PUBLIC_NATURAL_EXPIRY'); assert.equal(poolA[0].reason, 'expired');
      assert(!current.squad.some(p => p.id === man.id), 'CM_JOIN_EXPIRED_LEFT_SQUAD'); assert.equal(current.freeAgencyV2, true);
      const a = records(current).find(row => row.key === keyA); assert(a && a.status === 'released' && a.owner === null);
      const other = { ...a.player, id: 'qa-join-B-' + seed, rating: 70, potential: 92, secondaryPositions: ['LW'] }; delete other.worldRosterKey;
      const keyB = ledger.worldRosterKey(current, 'Liverpool', other, current.season - 1); assert.equal(typeof keyB, 'string'); assert.notEqual(keyA, keyB);
      current = ledger.recordWorldRosterTransfer(current, { player: { ...other, worldRosterKey: keyB }, key: keyB, from: 'Liverpool', to: 'Chelsea', kind: 'permanent', since: current.season - 1 });
      const ownedB = records(current).find(row => row.key === keyB); assert(ownedB && ownedB.owner === 'Chelsea');
      current = ledger.recordWorldRosterTransfer(current, { player: ownedB.player, key: keyB, from: 'Chelsea', to: null, kind: 'release' });
      const tuple = records(current).filter(row => row.owner === null && row.status === 'released' && row.origin.name === poolA[0].name && row.origin.birthYear === year(current) - poolA[0].age && row.player.position === poolA[0].position);
      assert.equal(tuple.length, 2, 'CM_JOIN_VALID_DISTINCT_NAMESAKE_RECORDS'); assert.deepEqual(tuple.map(row => row.key).sort(), [keyA, keyB].sort());
      assert.equal((current.freeAgents ?? []).filter(row => row.name === man.name).length, 1, 'CM_JOIN_ONE_KEYED_POOL_ROW');
      assert.equal((current.freeAgents ?? []).find(row => row.name === man.name).worldRosterKey, keyA);
      const normalized = saved(current, 'collision-attempt-' + seed + '.career.json'); current = normalized.loaded;
      assert.equal(records(current).filter(row => [keyA, keyB].includes(row.key)).length, 2, 'CM_JOIN_RELOADED_TWO_RECORDS');
      const before = JSON.stringify(current), ahead = cm.refreshWorldRoster({ ...current, season: current.season + 1 });
      const expected = ledger.worldRosterView(ahead).records.find(row => row.key === keyA); assert(expected, 'CM_JOIN_PUBLIC_NEXT_YEAR_KEY');
      const observed = roll(.6, () => cm.summerFreeAgents(current)); assert.equal(JSON.stringify(current), before, 'CM_JOIN_PURE_SUMMER_INPUT');
      const row = observed.pool.find(value => value.worldRosterKey === keyA);
      const expectedFields = { age: expected.player.age, rating: expected.player.rating, value: expected.player.value };
      const observedFields = row ? { age: row.age, rating: row.rating, value: row.value } : null;
      const mismatch = expected.status !== 'retired' && row && JSON.stringify(expectedFields) !== JSON.stringify(observedFields);
      const record = { seed, currentSeason: current.season, currentYear: year(current), forecastYear: year(ahead), keyA, keyB, tupleCandidates: tuple.map(value => ({ key: value.key, origin: value.origin, player: value.player })), inputPoolRow: current.freeAgents.find(value => value.worldRosterKey === keyA), expected: { status: expected.status, fields: expectedFields, player: expected.player }, observed: { fields: observedFields, poolRow: row ?? null, retired: observed.retired }, mismatch: Boolean(mismatch), saved: normalized.receipt, fixtureKind: 'QA_FICTION_PUBLIC_TRANSFER_AND_REAL_EXPIRY_THEN_DISTINCT_PUBLIC_LEDGER_RELEASE' };
      attempts.push(record); json('collision-attempt-' + seed + '.json', record);
      if (mismatch) {
        fs.writeFileSync(path.join(out, 'collision-frozen.career.json'), before, { flag: 'wx' });
        storage.set(cm.SAVE_KEY, before); const replay = roll(.6, () => cm.loadCareer()); assert(replay, 'CM_JOIN_COLLISION_FIXTURE_RELOAD');
        assert.equal(records(replay).filter(value => [keyA, keyB].includes(value.key)).length, 2, 'CM_JOIN_COLLISION_FIXTURE_RECORDS');
        const replaySummer = roll(.6, () => cm.summerFreeAgents(replay)), replayRow = replaySummer.pool.find(value => value.worldRosterKey === keyA);
        assert.deepEqual(replayRow ?? null, row ?? null, 'CM_JOIN_COLLISION_REPLAY_PROFILE');
        const replayExpected = ledger.worldRosterView(cm.refreshWorldRoster({ ...replay, season: replay.season + 1 })).records.find(value => value.key === keyA);
        assert.deepEqual(replayExpected, expected, 'CM_JOIN_COLLISION_REPLAY_FORECAST');
        record.replay = { publicLoadAndSummer: true, sameObservedPoolRow: true, sameExpectedCanonicalForecast: true, fixture: 'collision-frozen.career.json', sha256: sha(before), bytes: Buffer.byteLength(before) };
        collision = record; json('COLLISION-REPLAY.json', record.replay);
      }
    }
    json('COLLISION-DISCOVERY.json', { seeds: { first: 5100, lastInclusive: 5131 }, attempts, witnessFound: Boolean(collision), timing: 'CURRENT-YEAR pool identity, separate public next-season forecast; no lookup helper or key carry repair' });
    const corpus = CONTRACT.originalCorpus, reference = git(['cat-file', 'blob', corpus.gitBlob]);
    assert.equal(git(['ls-tree', corpus.commit, '--', corpus.path]).toString().trim(), '100644 blob ' + corpus.gitBlob + '\t' + corpus.path, 'CM_JOIN_CORPUS_COMMIT_ASSOCIATION');
    assert.equal(reference.length, corpus.bytes); assert.equal(sha(reference), corpus.sha256); assert.equal(blob(reference), corpus.gitBlob);
    fs.writeFileSync(path.join(out, 'K-original-old-save-corpus.json'), reference, { flag: 'wx' });
    const data = JSON.parse(reference); assert.equal(data.encoding, 'gzip-hex'); assert.equal(data.saves.length, 3);
    const recoveries = []; let recovery;
    for (const [index, item] of data.saves.entries()) {
      assert.match(item.save, /^(?:[a-f0-9]{2})+$/i); const raw = gunzipSync(Buffer.from(item.save, 'hex')).toString('utf8');
      storage.clear(); storage.set(cm.SAVE_KEY, raw); const loaded = roll(.6, () => cm.loadCareer()); assert(loaded, 'CM_JOIN_ACTUAL_OLD_SAVE_LOAD');
      assert.equal(loaded.clubName, item.club); assert.equal(loaded.eraId, item.eraId); assert.equal(loaded.season, item.season);
      const pre = JSON.stringify(loaded), beforeNames = new Set((loaded.freeAgents ?? []).map(row => row.name));
      const eligible = records(loaded).filter(row => row.status === 'released' && row.owner === null && !loaded.squad.some(p => p.name === row.player.name) && !(loaded.loanedOut ?? []).some(p => p.player.name === row.player.name) && !beforeNames.has(row.player.name) && !(loaded.retiredNames ?? []).includes(row.player.name));
      const recovered = cm.recoverPooledReleases(loaded); assert.equal(JSON.stringify(loaded), pre, 'CM_JOIN_RECOVERY_INPUT_PURE'); assert.equal(recovered.freeAgencyV2, true);
      assert.deepEqual(cm.recoverPooledReleases(recovered), recovered, 'CM_JOIN_RECOVERY_ONE_TIME');
      const added = (recovered.freeAgents ?? []).filter(row => !beforeNames.has(row.name)).map(row => {
        const canonical = eligible.filter(value => value.player.name === row.name && value.player.position === row.position && value.player.age === row.age);
        return { row, eligibleKeys: canonical.map(value => value.key), expectedKey: canonical.length === 1 ? canonical[0].key : null, actualKey: row.worldRosterKey ?? null, uniqueCanonicalRecord: canonical.length === 1 };
      });
      for (const row of loaded.freeAgents ?? []) assert.deepEqual(recovered.freeAgents.find(value => value.name === row.name), row, 'CM_JOIN_EXISTING_POOL_PRESERVED');
      const fixture = saved(loaded, 'old-save-loaded-' + index + '.career.json');
      const replayRecovered = cm.recoverPooledReleases(fixture.loaded); assert.deepEqual(replayRecovered.freeAgents, recovered.freeAgents, 'CM_JOIN_RECOVERY_SAVED_FIXTURE_REPLAY');
      const afterSave = saved(recovered, 'old-save-recovered-' + index + '.career.json');
      const result = { index, club: item.club, era: item.eraId, inputRawSHA256: sha(raw), loaded: fixture.receipt, recovered: afterSave.receipt, eligibleCount: eligible.length, added, reloadedPool: afterSave.loaded.freeAgents, laterPublicRollover: 'UNRUN_THIS_DIAGNOSTIC_MEASURES_RECOVERY_BEFORE_AGING_ONLY' };
      recoveries.push(result); json('recovery-' + index + '.json', result);
      const witness = added.find(row => row.uniqueCanonicalRecord && row.actualKey !== row.expectedKey);
      if (!recovery && witness) recovery = { ...result, witness };
    }
    json('RECOVERY-DISCOVERY.json', { originalCorpus: corpus, fixtures: recoveries, witnessFound: Boolean(recovery), noReferenceThirteenPlayerFloor: true });
    assert.equal(fetches.length, 0, 'CM_JOIN_NO_EXTERNAL_DATA_FETCH'); json('NETWORK-CALLS.json', fetches);
    const profile = { schema: 1, status: collision && recovery ? 'ACTUAL_PRE_REPAIR_WITNESSES_FROZEN_PENDING_CORE10_AND_FINAL_HOLDS' : 'NO_COMPLETE_VALID_WITNESS_PAIR_NO_NEW_TEST_OR_PATCH_AUTHORIZED', product: CONTRACT.product, engine: CONTRACT.engine, collision: collision ?? null, recovery: recovery ?? null, futureOnly: CONTRACT.futureOnlyMarkers, noOwnedTestOrCanonicalRepairAuthored: true, noNamesakeWideSigningClaim: true, productReady: false };
    json('FROZEN-PROFILE.json', profile); assert(collision && recovery, 'CM_JOIN_VALID_WITNESS_PAIR_REQUIRED'); return profile;
  } finally { globalThis.localStorage = priorStorage; Math.random = priorRandom; globalThis.Date = RealDate; globalThis.fetch = priorFetch; }
}
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ''), 'CM_JOIN_REMOTE_ONLY');
assert.equal(process.env.GITHUB_REF, 'refs/heads/' + CONTRACT.branch, 'CM_JOIN_BRANCH');
assert(path.isAbsolute(out ?? '') && fs.realpathSync(out) === out && !out.startsWith(checkout + path.sep) && out !== checkout, 'CM_JOIN_EXTERNAL_OUTPUT');
assert.equal(cases.length, 10); assert.equal(CONTRACT.status, 'BOUND_SOURCE_ONLY_UNRUN');
let sourceRows, initial, dependencies, prepared = false, failure, admission, profile;
try {
  assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA, 'CM_JOIN_HEAD');
  assert.equal(git(['rev-list', '--parents', '-n1', 'HEAD']).toString().trim(), process.env.GITHUB_SHA + ' ' + CONTRACT.product, 'CM_JOIN_PROOF_SOLE_CHILD');
  assert.equal(git(['rev-list', '--parents', '-n1', CONTRACT.product]).toString().trim(), CONTRACT.product + ' ' + CONTRACT.productParent, 'CM_JOIN_PRODUCT_SOLE_PARENT');
  assert.equal(git(['rev-parse', CONTRACT.product + '^{tree}']).toString().trim(), CONTRACT.productTree);
  assert.equal(git(['rev-parse', CONTRACT.productParent + '^{tree}']).toString().trim(), CONTRACT.productParentTree);
  const prior = tree(CONTRACT.productParent), product = tree(CONTRACT.product); sourceRows = tree('HEAD');
  assert.equal(prior.length, CONTRACT.productFiles); assert.equal(product.length, CONTRACT.productFiles); assert.equal(sourceRows.length, CONTRACT.proofFiles);
  const changed = product.filter(row => JSON.stringify(row) !== JSON.stringify(prior.find(value => value.path === row.path)));
  assert.deepEqual(changed.map(row => row.path), [CONTRACT.engine.path], 'CM_JOIN_ONLY_ENGINE_JOIN');
  assert.equal(changed[0].gitBlob, CONTRACT.engine.gitBlob);
  assert.deepEqual(prior.map(row => row.path), product.map(row => row.path), 'CM_JOIN_ALL_OTHER_PRODUCT_PATHS_HELD');
  const additions = sourceRows.filter(row => !product.some(value => value.path === row.path));
  assert.deepEqual(additions.map(row => row.path).sort(), CONTRACT.proofAdditions.slice().sort(), 'CM_JOIN_ONLY_THREE_PROOF_ADDITIONS');
  assert(additions.every(row => row.mode === '100644'));
  assert.deepEqual(sourceRows.filter(row => !additions.includes(row)), product, 'CM_JOIN_PRODUCT_HELD');
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']).toString(), '', 'CM_JOIN_INITIAL_CLEAN_SOURCE');
  initial = { head: git(['rev-parse', 'HEAD']).toString(), refs: git(['show-ref']).toString(), indexSHA256: sha(fs.readFileSync(path.join(checkout, git(['rev-parse', '--git-path', 'index']).toString().trim()))) };
  json('SOURCE-TOPOLOGY.json', { contract: CONTRACT, proof: process.env.GITHUB_SHA, sourceRows, productRows: product, productOnlyChange: changed, proofOnlyAdditions: additions });
  fs.writeFileSync(path.join(out, 'source-before.tar'), git(['archive', '--format=tar', 'HEAD']), { flag: 'wx' });
  fs.mkdirSync(root); requireZero(run('extract', 'tar', ['-xf', path.join(out, 'source-before.tar'), '-C', root], checkout, 120000));
  fs.symlinkSync(path.join(checkout, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  pin(path.join(root, CONTRACT.engine.path), CONTRACT.engine);
  for (const file of CONTRACT.files) pin(path.join(root, file.file), file);
  dependencies = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-BEFORE.json', dependencies); prepared = true;
  requireZero(run('app-types', path.join(root, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json'], root, 300000));
  try { admission = await units(); } catch (error) { json('CORE10-REFUSAL.json', { name: error.name, message: error.message, stack: error.stack }); failure = error; }
  profile = await discover();
} catch (error) { failure ??= error; json('DIAGNOSTIC-ERROR.json', { name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (prepared) {
    try {
      for (const dir of [checkout, root]) {
        for (const row of sourceRows) {
          const file = path.join(dir, row.path), body = fs.readFileSync(file); assert.equal(blob(body), row.gitBlob, 'CM_JOIN_SOURCE_BODY_HELD:' + row.path);
          assert.equal(Boolean(fs.statSync(file).mode & 0o111), row.mode === '100755', 'CM_JOIN_SOURCE_MODE_HELD:' + row.path);
        }
      }
      const members = inventory(root).filter(row => row.path !== 'node_modules');
      assert(members.every(row => !('link' in row)), 'CM_JOIN_NO_UNEXPECTED_SOURCE_SYMLINK');
      assert.deepEqual(members.map(row => row.path).sort(), sourceRows.map(row => row.path).sort(), 'CM_JOIN_MATCHED_MEMBERSHIP_HELD');
      assert.equal(fs.realpathSync(path.join(root, 'node_modules')), fs.realpathSync(path.join(checkout, 'node_modules')), 'CM_JOIN_PHYSICAL_DEPS_HELD');
      const finalDeps = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-AFTER.json', finalDeps);
      const beforeMap = new Map(dependencies.map(row => [row.path, row])), added = finalDeps.filter(row => !beforeMap.has(row.path));
      assert(added.length <= 1, 'CM_JOIN_ONLY_RESULT_CACHE_ADDITION');
      assert.deepEqual(finalDeps.filter(row => beforeMap.has(row.path)), dependencies, 'CM_JOIN_ORIGINAL_DEPS_HELD');
      const cache = [];
      for (const row of added) {
        assert.equal(row.path, '.vite/vitest/' + createHash('sha1').update('').digest('hex') + '/results.json', 'CM_JOIN_EXACT_CACHE_PATH');
        const body = fs.readFileSync(path.join(checkout, 'node_modules', row.path)), data = JSON.parse(body);
        assert.deepEqual(Object.keys(data).sort(), ['results', 'version']); assert.equal(data.version, '3.2.7'); assert.equal(data.results.length, 3);
        assert.deepEqual(data.results.map(value => value[0]).sort(), CONTRACT.files.map(file => ':' + file.file).sort(), 'CM_JOIN_CACHE_IDENTITIES');
        for (const value of data.results) { assert.equal(value.length, 2); assert.deepEqual(Object.keys(value[1]).sort(), ['duration', 'failed']); assert.equal(value[1].failed, false); assert(Number.isFinite(value[1].duration) && value[1].duration >= 0); }
        fs.writeFileSync(path.join(out, 'default-vitest-results-cache.json'), body, { flag: 'wx' }); cache.push(row);
      }
      assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']).toString(), '', 'CM_JOIN_CHECKOUT_MEMBERSHIP_HELD');
      assert.equal(git(['rev-parse', 'HEAD']).toString(), initial.head, 'CM_JOIN_HEAD_HELD'); assert.equal(git(['show-ref']).toString(), initial.refs, 'CM_JOIN_REFS_HELD');
      assert.equal(sha(fs.readFileSync(path.join(checkout, git(['rev-parse', '--git-path', 'index']).toString().trim()))), initial.indexSHA256, 'CM_JOIN_INDEX_HELD');
      requireZero(run('archive-final', 'tar', ['-cf', path.join(out, 'matched-final.tar'), '--exclude=./node_modules', '-C', root, '.'], checkout, 120000));
      json('FINAL-HOLDS.json', { status: 'HELD', trackedBodiesAndModes: sourceRows.length, matchedMembership: true, sourceIndexAndRefs: true, originalDependencyBodiesAndMembership: dependencies.length, exactGeneratedResultCache: cache, immutableAppPaths: true, outsideOnlyOutputs: true });
    } catch (error) { failure ??= error; json('FINAL-HOLDS-ERROR.json', { name: error.name, message: error.message, stack: error.stack }); }
  } else json('FINAL-HOLDS-NOT-REACHED.json', { status: 'SETUP_INCOMPLETE_NO_QUALIFICATION' });
}
json('COMPLETION.json', { status: failure ? 'FAILED_DIAGNOSTIC_RETAIN_ACTUALS_NO_ADOPTION' : 'PRE_REPAIR_DIAGNOSTIC_ONLY_FIXTURES_AND_PROFILE_FROZEN', product: CONTRACT.product, engine: CONTRACT.engine.gitBlob, core10: admission ?? null, validWitnessPair: Boolean(profile?.collision && profile?.recovery), sourceHolds: fs.existsSync(path.join(out, 'FINAL-HOLDS.json')), newOwnedTests: 'UNAUTHORED', canonicalRepair: 'UNAUTHORED', kUiHarnessFloors: 'NOT_ADOPTED', build: 'UNRUN', browser: 'UNRUN', fullSuiteAndSims: 'UNRUN', caps: 'UNRUN', compatibilityWithMain: 'SEPARATE_UNPROVEN', featureReady: false, failure: failure ? { name: failure.name, message: failure.message } : null });
if (failure) { console.error(failure); process.exitCode = 1; } else console.log('CM1597_JOIN_DISCOVERY: actual core10 and saved pre-repair witness pair retained; no feature adoption or product qualification.');
