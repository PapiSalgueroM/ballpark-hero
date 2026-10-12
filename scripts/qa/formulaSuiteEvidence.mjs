import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync, gunzipSync, inflateRawSync } from 'node:zlib';

// This collector reads retained evidence. It never imports or invokes a game or runner.
const root = path.resolve(process.env.FORMULA_AGGREGATE_ROOT || '');
assert.deepEqual(process.argv.slice(2), ['--aggregate']);
assert(process.env.FORMULA_AGGREGATE_ROOT, 'FORMULA_AGGREGATE_ROOT is required');
const out = path.join(root, 'aggregate');
assert(!fs.existsSync(out), 'aggregate output must be absent');
fs.mkdirSync(out);
const hash = (body, algorithm = 'sha256') => createHash(algorithm).update(body).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const copy = value => JSON.parse(JSON.stringify(value));
const failures = [], attempts = [], bodyChecks = [];
const isInt = value => Number.isSafeInteger(value) && value >= 0;
const equal = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
function keys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), label + ' object');
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), label + ' exact fields');
}
function safe(file) {
  assert(typeof file === 'string' && file.length && !file.includes('\\') && !/[\x00-\x1f\x7f<>:"|?*]/.test(file), 'relative path');
  assert(!file.startsWith('/') && !file.endsWith('/'), 'file path');
  for (const part of file.split('/')) assert(part && part !== '.' && part !== '..' && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part), 'path segment');
  return file;
}
function resolve(owner, file) {
  const target = path.resolve(owner, ...safe(file).split('/'));
  assert(target.startsWith(path.resolve(owner) + path.sep), 'path escapes owner');
  return target;
}
function fileRef(ref, owner, label) {
  keys(ref, ['path', 'bytes', 'sha256'], label);
  assert(isInt(ref.bytes) && /^[0-9a-f]{64}$/.test(ref.sha256), label + ' body identity');
  const target = resolve(owner, ref.path), stat = fs.lstatSync(target);
  assert(stat.isFile() && !stat.isSymbolicLink(), label + ' regular body');
  const body = fs.readFileSync(target);
  assert.equal(body.length, ref.bytes, label + ' length');
  assert.equal(hash(body), ref.sha256, label + ' whole SHA');
  bodyChecks.push({ owner: path.relative(root, owner).replaceAll(path.sep, '/'), label, ...ref });
  return body;
}
const parsed = (ref, owner, label) => JSON.parse(fileRef(ref, owner, label).toString('utf8'));
function walk(owner) {
  const rows = [], seen = new Set();
  function visit(directory, prefix) {
    for (const name of fs.readdirSync(directory).sort()) {
      const logical = prefix + name, target = path.join(directory, name), stat = fs.lstatSync(target);
      assert(!stat.isSymbolicLink(), 'physical symlink ' + logical);
      assert(!seen.has(logical.toLowerCase()), 'case-fold duplicate ' + logical);
      seen.add(logical.toLowerCase());
      if (stat.isDirectory()) visit(target, logical + '/');
      else { assert(stat.isFile(), 'nonregular body ' + logical); safe(logical); const body = fs.readFileSync(target); rows.push({ path: logical, bytes: body.length, sha256: hash(body) }); }
    }
  }
  visit(owner, '');
  return rows;
}
function vector(actual, expected, label) {
  assert(Array.isArray(actual) && Array.isArray(expected), label + ' arrays');
  const sorted = values => [...values].sort((a, b) => a.path.localeCompare(b.path, 'en'));
  assert.deepEqual(sorted(actual), sorted(expected), label + ' complete physical set');
}
function write(file, value) {
  const target = resolve(out, file); fs.mkdirSync(path.dirname(target), { recursive: true });
  assert(!fs.existsSync(target), 'output overwrite ' + file); fs.writeFileSync(target, json(value));
  const body = fs.readFileSync(target); return { path: 'aggregate/' + file, bytes: body.length, sha256: hash(body) };
}
function attempt(label, action) {
  try { const value = action(); attempts.push({ label, status: 'pass' }); return value; }
  catch (error) { const finding = { label, name: error.name, message: error.message, stack: error.stack }; failures.push(finding); attempts.push({ label, status: 'fail', failure: finding }); return null; }
}
function gitBlob(body) { return hash(Buffer.concat([Buffer.from('blob ' + body.length + '\0'), body]), 'sha1'); }
function zipBodies(body, expectedHead) {
  let end = -1;
  for (let at = body.length - 22; at >= Math.max(0, body.length - 65557); at--) if (body.readUInt32LE(at) === 0x06054b50 && at + 22 + body.readUInt16LE(at + 20) === body.length) { end = at; break; }
  assert(end >= 0, 'source ZIP end record');
  assert.equal(body.readUInt16LE(end + 4), 0); assert.equal(body.readUInt16LE(end + 6), 0);
  assert.equal(body.readUInt16LE(end + 8), body.readUInt16LE(end + 10));
  assert.equal(body.subarray(end + 22).toString('utf8'), expectedHead, 'whole Git ZIP footer');
  const count = body.readUInt16LE(end + 10), start = body.readUInt32LE(end + 16), bytes = body.readUInt32LE(end + 12);
  assert(count < 65535 && start + bytes === end, 'single-disk source ZIP');
  const bodies = new Map(), names = new Set(), members = []; let cursor = start;
  for (let i = 0; i < count; i++) {
    assert.equal(body.readUInt32LE(cursor), 0x02014b50);
    const flags = body.readUInt16LE(cursor + 8), method = body.readUInt16LE(cursor + 10), packed = body.readUInt32LE(cursor + 20), raw = body.readUInt32LE(cursor + 24), nameBytes = body.readUInt16LE(cursor + 28), extra = body.readUInt16LE(cursor + 30), comment = body.readUInt16LE(cursor + 32), local = body.readUInt32LE(cursor + 42), externalAttributes = body.readUInt32LE(cursor + 38), mode = externalAttributes >>> 16;
    assert(!(flags & 1) && [0, 8].includes(method), 'ZIP encryption or compression');
    const name = body.subarray(cursor + 46, cursor + 46 + nameBytes).toString('utf8');
    const directory = name.endsWith('/'), logical = directory ? name.slice(0, -1) : name;
    safe(logical); assert(!names.has(logical.toLowerCase()), 'source ZIP duplicate'); names.add(logical.toLowerCase());
    assert([0, directory ? 0x4000 : 0x8000].includes(mode & 0xf000), 'source ZIP nonregular entry');
    assert.equal(body.readUInt32LE(local), 0x04034b50); assert.equal(body.readUInt16LE(local + 6), flags); assert.equal(body.readUInt16LE(local + 8), method);
    const localName = body.readUInt16LE(local + 26), localExtra = body.readUInt16LE(local + 28), offset = local + 30 + localName + localExtra;
    assert.equal(body.subarray(local + 30, local + 30 + localName).toString('utf8'), name);
    assert(offset + packed <= start, 'source ZIP member bounds');
    const decoded = method === 0 ? body.subarray(offset, offset + packed) : inflateRawSync(body.subarray(offset, offset + packed));
    assert.equal(decoded.length, raw, 'complete source ZIP member');
    if (directory) assert.equal(raw, 0); else bodies.set(name, { body: decoded, encodedMode: mode });
    members.push({ path: logical, type: directory ? 'directory' : 'regular', mode, gitMode: null, externalAttributes, bytes: raw, sha256: directory ? null : hash(decoded), blob: directory ? null : gitBlob(decoded) });
    cursor += 46 + nameBytes + extra + comment;
  }
  assert.equal(cursor, end); bodies.members = members; return bodies;
}
function sourceArchive(ref, owner, head, rows) {
  const bodies = zipBodies(fileRef(ref, owner, 'canonical archive'), head), seen = new Set();
  assert(Array.isArray(rows));
  for (const row of rows) {
    keys(row, ['file', 'mode', 'blob', 'bytes', 'sha256'], 'Git source row'); safe(row.file);
    assert(!seen.has(row.file) && ['100644','100755'].includes(row.mode) && /^[0-9a-f]{40}$/.test(row.blob), 'Git leaf identity'); seen.add(row.file);
    const actual = bodies.get(row.file); assert(actual, 'canonical archive omitted leaf ' + row.file);
    assert.equal(actual.body.length, row.bytes); assert.equal(hash(actual.body), row.sha256); assert.equal(gitBlob(actual.body), row.blob);
    assert([0,0x8000].includes(actual.encodedMode & 0xf000), 'Git regular mode type');
    if(actual.encodedMode) assert.equal((actual.encodedMode & 0o111)!==0, row.mode === '100755', 'encoded Git executable identity');
    bodies.members.find(member => member.path === row.file).gitMode = row.mode;
  }
  assert.equal(seen.size, bodies.size, 'no extra canonical archive members'); return bodies;
}
function census(value, lock) {
  keys(value, ['platform', 'arch', 'installed', 'omitted'], 'locked census');
  assert.equal(value.platform, 'linux'); assert.equal(value.arch, 'x64');
  assert.equal(value.installed.length, 521); assert.equal(value.omitted.length, 78);
  const names = new Set();
  const compatible = (rules, current) => !rules || ((!rules.includes('!' + current)) && (!rules.some(item => !item.startsWith('!')) || rules.includes(current)));
  for (const [kind, values] of [['installed', value.installed], ['omitted', value.omitted]]) for (const row of values) {
    keys(row,kind==='installed'?['directory','name','version']:['directory','name','version','optional','os','cpu'],'complete census row');
    safe(row.directory); assert(row.directory.startsWith('node_modules/') && !names.has(row.directory), 'locked directory uniqueness'); names.add(row.directory);
    const item = lock.packages[row.directory]; assert(item && item.version === row.version, 'locked version');
    const expectedName = item.name || row.directory.slice(row.directory.lastIndexOf('node_modules/') + 13);
    assert.equal(row.name, expectedName, 'locked package name including aliases');
    const allowed = compatible(item.os, value.platform) && compatible(item.cpu, value.arch);
    if (kind === 'installed') assert(allowed, 'installed supported platform');
    else { assert.equal(item.optional, true); assert(!allowed, 'strict OS/CPU-only optional omission'); assert.equal(row.optional, true); assert.deepEqual(row.os, item.os ?? null); assert.deepEqual(row.cpu, item.cpu ?? null); }
  }
  assert.deepEqual([...names].sort(), Object.keys(lock.packages).filter(key => key.startsWith('node_modules/')).sort(), 'all599 required lock entries');
}

const READERS = ['simAdsense','simBrand','simHeadTags','simHiddenPages','simHubs','simIndexNow','simIndexing','simInternalLinks','simNoRivalNames','simPrerender','simPrerenderBoot','simRetiredRoutes','simSchema','simSitemap','simSnapshotAssets'];
const F1 = ['simFormulaCareer','playFormulaCareer'];
const roleNames = ['f1', 'remaining', 'readers'];
const state = { shared: null, sharedMetadata: null, roles: {}, runners: [], sourceBodies: null, catalogue: null, formula: null };
function readNamed(owner, file) { const body = fs.readFileSync(resolve(owner, file)); return { body, ref: { path: file, bytes: body.length, sha256: hash(body) }, value: JSON.parse(body.toString('utf8')) }; }
function exactRows(rows, label) {
  assert(Array.isArray(rows), label + ' array'); const seen = new Set();
  for (const row of rows) { safe(row.file); assert(!seen.has(row.file), label + ' duplicate'); seen.add(row.file); assert(isInt(row.bytes) && /^[0-9a-f]{64}$/.test(row.sha256)); }
  return new Map(rows.map(row => [row.file, row]));
}
function sourceHeld(rows, canonical, generated) {
  const map = exactRows(rows, 'source vector'); assert.equal(map.size, canonical.length);
  const produced = new Map([...generated.public, ...generated.lastmod].map(row => [row.file, row]));
  for (const original of canonical) {
    const actual = map.get(original.file); assert(actual, 'source leaf omitted');
    keys(actual,['file','mode','blob','bytes','sha256'],'actual complete source row');
    assert.equal(actual.mode, original.mode); assert.equal(actual.blob, original.blob);
    const expected = produced.get(original.file) || original;
    assert.equal(actual.bytes, expected.bytes); assert.equal(actual.sha256, expected.sha256);
  }
}
function absoluteStream(file, role) {
  assert(typeof file === 'string' && typeof role.evidenceRoot === 'string', 'original absolute stream path');
  const prefix = role.evidenceRoot.endsWith('/') ? role.evidenceRoot : role.evidenceRoot + '/';
  assert(file.startsWith(prefix) && file.length > prefix.length, 'stream exact evidenceRoot prefix');
  return safe(file.slice(prefix.length));
}
function processBody(child, role, owner) {
  const streams = {};
  for (const stream of ['stdout', 'stderr']) {
    const logical = absoluteStream(child[stream], role), body = fs.readFileSync(resolve(owner, logical));
    assert.equal(body.length, child[stream + 'Bytes']);
    streams[stream] = { path: logical, bytes: body.length, sha256: hash(body), body };
  }
  const offsets = { stdout: 0, stderr: 0 }, chunks = [];
  assert(Array.isArray(child.chunks));
  for (const chunk of child.chunks) {
    keys(chunk, ['stream', 'start', 'bytes'], 'actual chunk');
    assert(['stdout', 'stderr'].includes(chunk.stream) && isInt(chunk.start) && isInt(chunk.bytes) && chunk.bytes > 0);
    assert.equal(chunk.start, offsets[chunk.stream]);
    assert(chunk.start + chunk.bytes <= streams[chunk.stream].bytes);
    chunks.push(streams[chunk.stream].body.subarray(chunk.start, chunk.start + chunk.bytes)); offsets[chunk.stream] += chunk.bytes;
  }
  assert.equal(offsets.stdout, streams.stdout.bytes); assert.equal(offsets.stderr, streams.stderr.bytes);
  const combinedBody = Buffer.concat(chunks), combined = combinedBody.toString('utf8'), lines = combined.split('\n');
  const blocks = lines.filter(line => /^\[SIM_OFFLINE_BLOCK\] (database|external) /.test(line));
  const meaningful = lines.filter(line => line.trim() && !/^\[SIM_OFFLINE_BLOCK\] (database|external) /.test(line));
  const verdict = child.exitCode !== 0 ? 'FAIL' : meaningful.length < 4 ? 'EMPTY' : blocks.length ? 'FAIL' : 'PASS';
  const omissionLines = (streams.stdout.body.toString('utf8') + '\n' + streams.stderr.body.toString('utf8')).split('\n').filter(line => /\bskip(?:ped|ping)?\b|\bnot (?:run|checked)\b|\blive.only\b/i.test(line));
  return { verdict, meaningfulLines: meaningful.length, offlineBlocks: blocks, omissionLines, combinedBytes: combinedBody.length, combinedSha256: hash(combinedBody), stdout: { path: streams.stdout.path, bytes: streams.stdout.bytes, sha256: streams.stdout.sha256 }, stderr: { path: streams.stderr.path, bytes: streams.stderr.bytes, sha256: streams.stderr.sha256 }, chunks: copy(child.chunks) };
}
function runnerRecord(role, owner, runner, requested) {
  keys(runner, ['role', 'id', 'logicalRoot', 'requested'], 'runner root');
  assert.deepEqual(runner.requested, requested); safe(runner.logicalRoot);
  const prefix = runner.logicalRoot + '/', d = readNamed(owner, prefix + 'discovery.json'), p = readNamed(owner, prefix + 'process.json'), s = readNamed(owner, prefix + 'scope.json');
  const log = fs.readFileSync(resolve(owner, prefix + 'runner.log')), catalogue = new Map(state.catalogue.map(row => [row.file, row]));
  const parent = readNamed(owner, prefix + 'parent.json');
  keys(parent.value, ['schema','status','command','nodeVersion','args','cwd','environment','sourceSha256','runnerSha256','startedAt','closedAt','stdout','stderr','stdoutBytes','stderrBytes','chunks','exitCode','signal','error'], 'actual parent process');
  assert.equal(parent.value.schema, 'formula-suite-parent-process-v1'); assert.equal(parent.value.status, 'complete');
  assert.equal(parent.value.nodeVersion, 'v24.21.0'); assert.equal(parent.value.cwd, role.checkoutCwd);
  assert.equal(parent.value.command, process.execPath, 'actual current Node executable');
  assert.equal(parent.value.exitCode, 0); assert.equal(parent.value.signal, null); assert.equal(parent.value.error, null);
  assert(Number.isFinite(parent.value.startedAt) && Number.isFinite(parent.value.closedAt) && parent.value.closedAt >= parent.value.startedAt);
  assert.equal(parent.value.environment.ONLY, requested.join(','));
  assert.equal(parent.value.environment.FORMULA_RUNNER_DIR, 'formula-career-artifacts/' + runner.logicalRoot);
  const environmentKeys = ['SIM_NETWORK','ENGINES','TZ','NODE_OPTIONS','BASE','SWEEP_BASE','PORT','ONLY','FORMULA_EVIDENCE_DIR','FORMULA_CAREER_OUT','FORMULA_CAREER_BROWSER_OUT','FORMULA_CAREER_INPUT','FORMULA_RUNNER_DIR'];
  keys(parent.value.environment, environmentKeys, 'actual parent environment');
  for (const [key, value] of Object.entries({ SIM_NETWORK:'offline', ENGINES:'chromium', TZ:'UTC', NODE_OPTIONS:'--require=' + role.checkoutCwd + '/scripts/lib/offlineTransport.cjs', BASE:null, SWEEP_BASE:null, PORT:null, FORMULA_EVIDENCE_DIR:null })) assert.equal(parent.value.environment[key], value);
  for (const [key, value] of Object.entries({ FORMULA_CAREER_OUT:'formula-career-artifacts/proof', FORMULA_CAREER_BROWSER_OUT:'formula-career-artifacts/browser', FORMULA_CAREER_INPUT:'formula-career-artifacts/proof' })) assert.equal(parent.value.environment[key], role.role === 'f1' ? value : null);
  assert.equal(parent.value.args.length, 2); assert.equal(parent.value.args[1], '--browser');
  const observerPath = absoluteStream(parent.value.args[0], role), observer = fs.readFileSync(resolve(owner, observerPath));
  assert.equal(observerPath, 'helpers/observe-runner.mjs');
  assert.equal(hash(observer), parent.value.sourceSha256);
  const sharedObserver = state.shared.seal.helperSources.find(row => row.path === observerPath); assert(sharedObserver, 'exact shared observer source path');
  assert.equal(hash(fileRef(sharedObserver, state.shared.owner, 'shared observer literal')), hash(observer));
  assert.equal(parent.value.runnerSha256, d.value.runnerSha256);
  const parentPhysical = processBody(parent.value, role, owner);
  assert.equal(parentPhysical.combinedBytes, log.length); assert.equal(parentPhysical.combinedSha256, hash(log), 'runner log exact actual chunk concatenation');
  assert.equal(d.value.network, 'offline'); assert.equal(d.value.browser, true);
  assert.deepEqual(d.value.selected, requested);
  assert.deepEqual([...d.value.expected].sort(), requested.map(id => id + '.mjs').sort());
  assert.equal(d.value.runnerSha256, hash(state.sourceBodies.get('scripts/runAllSims.mjs').body));
  assert.equal(d.value.discovery.length, state.catalogue.length);
  for (const row of d.value.discovery) { const original = catalogue.get(row.file); assert(original); assert.equal(row.bytes, original.bytes); assert.equal(row.sha256, original.sha256); }
  const classified = [...log.toString('utf8').matchAll(/^\s+(PASS|FAIL|EMPTY|SKIP)\s+([A-Za-z0-9]+\.mjs)\s+[0-9.]+s\s*$/gm)].map(match => ({ verdict: match[1], file: match[2] }));
  assert.deepEqual(classified, s.value.classifications);
  assert.equal(p.value.runnerExit, 0); assert.deepEqual(s.value.failures, []);
  assert.deepEqual([...p.value.children.map(row => row.file)].sort(), [...d.value.expected].sort());
  assert.deepEqual([...classified.map(row => row.file)].sort(), [...d.value.expected].sort());
  assert.deepEqual(s.value.expected, d.value.expected); assert.deepEqual(s.value.actual, p.value.children.map(row => row.file));
  const rows = [];
  for (const child of p.value.children) {
    const source = catalogue.get(child.file); assert(source, 'child catalogued');
    assert.equal(child.command, parent.value.command);
    assert.equal(child.sourceSha256, source.sha256); assert.deepEqual(child.args, [role.checkoutCwd + '/scripts/' + child.file]);
    assert.equal(child.cwd, role.checkoutCwd); assert.equal(child.environment.ONLY, null);
    assert.equal(child.environment.SIM_NETWORK, 'offline'); assert.equal(child.environment.ENGINES, 'chromium');
    assert.equal(child.environment.FORMULA_EVIDENCE_DIR, null);
    keys(child.environment, environmentKeys, 'actual child environment');
    for (const key of ['SIM_NETWORK','ENGINES','TZ','FORMULA_EVIDENCE_DIR','FORMULA_CAREER_OUT','FORMULA_CAREER_BROWSER_OUT','FORMULA_CAREER_INPUT','FORMULA_RUNNER_DIR']) assert.equal(child.environment[key], parent.value.environment[key]);
    assert.equal(child.environment.NODE_OPTIONS, parent.value.environment.NODE_OPTIONS + ' --require ' + JSON.stringify(role.checkoutCwd + '/scripts/lib/offlineTransport.cjs'));
    assert(equal([child.environment.BASE, child.environment.SWEEP_BASE, child.environment.PORT], [null,null,null]) || equal([child.environment.BASE, child.environment.SWEEP_BASE, child.environment.PORT], ['http://127.0.0.1:4173','http://127.0.0.1:4173','4173']), 'actual runner server environment');
    assert(Number.isFinite(child.startedAt) && Number.isFinite(child.closedAt) && child.closedAt >= child.startedAt, 'complete child times');
    assert(child.startedAt >= parent.value.startedAt && child.closedAt <= parent.value.closedAt, 'complete child inside real parent');
    assert.equal(child.exitCode, 0); assert.equal(child.signal, null);
    const physical = processBody(child, role, owner), verdict = classified.filter(row => row.file === child.file);
    assert.equal(verdict.length, 1); assert.equal(physical.verdict, verdict[0].verdict); assert.equal(physical.verdict, 'PASS');
    const omissions = s.value.internalOmissions.filter(row => row.file === child.file); assert.equal(omissions.length, 1);
    assert.deepEqual(omissions[0].lines, physical.omissionLines); assert.equal(omissions[0].stdoutSha256, physical.stdout.sha256); assert.equal(omissions[0].stderrSha256, physical.stderr.sha256);
    const exclusions=child.file==='simNoRivalNames.mjs'?['  skipped: node_modules, dist, dist-ssr, .git, .playwright-mcp, coverage, .cache, and docs/ on purpose (see the note above)','  lines ending in "rival-names-allow" are skipped, for the sims that carry']:[];
    if(exclusions.length){const source=state.sourceBodies.get('scripts/simNoRivalNames.mjs').body.toString('utf8');assert(source.includes('console.log(`  skipped: ${[...SKIP_DIRS].join(\', \')}, and docs/ on purpose (see the note above)`);'));assert(source.includes('console.log(`  lines ending in "${INLINE_ALLOW}" are skipped, for the sims that carry`);'));}
    physical.sourceScanExclusions=physical.omissionLines.filter(line=>exclusions.includes(line));physical.unqualifiedOmissions=physical.omissionLines.filter(line=>!exclusions.includes(line));
    assert.deepEqual(physical.unqualifiedOmissions,[],'all actual internal skipped tests and missing checks remain red');
    rows.push({ role: role.role, runner: runner.logicalRoot, child: copy(child), classification: copy(verdict[0]), physical });
  }
  return { root: copy(runner), parent: { ref: parent.ref, record: parent.value, physical: parentPhysical }, discovery: d.ref, process: p.ref, scope: s.ref, runnerLog: { path: prefix + 'runner.log', bytes: log.length, sha256: hash(log) }, rows };
}
function objectStore(owner, name) {
  const report = readNamed(owner, name + '/report.json'), manifest = readNamed(owner, name + '/objects.json'), rows = manifest.value, objects = new Map();
  assert(Array.isArray(rows), name + ' complete object manifest');
  const physical = walk(resolve(owner, name + '/objects')).map(row => ({ ...row, path: 'objects/' + row.path }));
  vector(physical, rows.map(row => ({ path: row.file, bytes: row.packedBytes, sha256: row.packedSha256 })), name + ' all object files');
  for (const row of rows) {
    keys(row, ['hash', 'file', 'bytes', 'packedBytes', 'packedSha256'], name + ' object row');
    assert(/^[0-9a-f]{64}$/.test(row.hash) && row.file === 'objects/' + row.hash + '.json.gz' && !objects.has(row.hash));
    const packed = fileRef({ path: name + '/' + row.file, bytes: row.packedBytes, sha256: row.packedSha256 }, owner, name + ' packed object');
    const raw = gunzipSync(packed); assert.equal(raw.length, row.bytes); assert.equal(hash(raw), row.hash);
    JSON.parse(raw.toString('utf8')); objects.set(row.hash, row);
  }
  const get = id => {
    assert(objects.has(id), name + ' referenced object missing ' + id); const row = objects.get(id);
    const packed = fileRef({ path: name + '/' + row.file, bytes: row.packedBytes, sha256: row.packedSha256 }, owner, name + ' referenced object');
    const raw = gunzipSync(packed); assert.equal(raw.length, row.bytes); assert.equal(hash(raw), id); return JSON.parse(raw.toString('utf8'));
  };
  return { report: report.value, reportRef: report.ref, manifestRef: manifest.ref, rows, get };
}
const FAULTS = {
  points: ['race/points', 'season-finish/progression'], session: ['qualify/qualifying'], seat: ['seat/progression'],
  'race-repeat': ['race-repeat/guards'], 'read-draw': ['stats/read-only'], age: ['seat/progression'], countback: ['countback/standings'],
  serial: ['invalid-serial/save'], 'serial-ceiling': ['invalid-unsafe-serial/save'], completion: ['invalid-completion/save'],
  'current-grid': ['invalid-current-grid/save'], 'historical-seats': ['invalid-historical-seats/save'], 'historical-contract': ['invalid-historical-contract/save'],
  'historical-id': ['invalid-historical-serial/save', 'invalid-historical-id/save'], 'terminal-contracts': ['invalid-terminal-contracts/save'],
  'season-completion': ['season-finish/progression'], 'negotiation-salary': ['negotiate/negotiation'], 'old-history': ['seat/history']
};
function formulaEvidence(owner) {
  const pure = objectStore(owner, 'proof'), browser = objectStore(owner, 'browser'), p = pure.report, b = browser.report;
  assert.equal(p.status, 'pass'); assert.deepEqual(p.failures, []); assert.equal(b.status, 'pass'); assert.deepEqual(b.errors, []);
  const ids = []; for (let seed = 1; seed <= 8; seed++) for (const approach of ['careful', 'steady', 'attack']) for (const training of ['pace', 'rotate']) ids.push(seed + '-' + approach + '-' + training);
  assert.deepEqual(p.population.map(row => row.id), ids); assert.deepEqual(p.careers.map(row => row.id), ids); assert(p.careers.every(row => row.measurements.starts === 480));
  for (const [key, value] of Object.entries({ careers: 48, races: 23040, probeCases: 39, sourceFaults: 18, bundles: 21, globalValues: 0, observationControls: 3 })) assert.equal(p.counts[key], value, key);
  assert.deepEqual(p.groups, ['field','qualifying','points','standings','history','guards','save','read-only','progression','stream','replay']);
  assert.equal(p.probes.length, 39); assert(p.probes.every(row => row.errors.length === 0));
  for (const row of p.careers) { pure.get(row.unobserved); pure.get(row.observed); }
  assert.deepEqual(p.controls.map(row => row.id), Object.keys(FAULTS));
  for (const control of p.controls) {
    assert.deepEqual(control.expected, FAULTS[control.id]);assert.deepEqual(control.actual, control.expected);
    const rows=pure.get(control.rows);assert.deepEqual(rows.map(row=>row.id),p.probes.map(row=>row.id));assert.deepEqual(rows.flatMap(row=>row.errors),control.actual);
    const changed=rows.filter((row,index)=>!equal({...row,errors:[]},{...p.probes[index],errors:[]})).map(row=>row.id);assert.deepEqual(changed,control.changedIds);assert(changed.length>0);
    assert(changed.every(id=>control.expected.some(failure=>failure.startsWith(id+'/'))),'complete unrelated source-control outputs held');
  }
  assert.deepEqual(p.observationControls.map(row => row.id), ['missing-output','input-mutation','missing-private']);
  for (const row of p.observationControls) { assert.deepEqual(row.actual, row.expected); assert.equal(row.original, row.undo); assert.notEqual(row.original, row.fault); for (const key of ['original','fault','undo']) pure.get(row[key]); }
  assert.equal(p.wholeUndo.compiledEqual, true); assert.deepEqual(pure.get(p.wholeUndo.rows),p.probes,'whole actual runtime undo rows');assert.equal(pure.get(p.wholeUndo.source),pure.get(p.source.engine),'whole actual source undo');
  assert.equal(p.ledgerCodec.wholeUndo, true); assert.deepEqual(p.ledgerCodec.expected, ['whole-state']); assert.deepEqual(p.ledgerCodec.actual, ['whole-state']);
  for (const key of ['original','fault','undo','decoded']) pure.get(p.ledgerCodec[key]);
  assert.deepEqual(p.bundleTapes.map(row=>row.id),p.bundles.map(row=>row.id));
  for (const row of p.bundleTapes) { assert(Array.isArray(pure.get(row.private)));assert.deepEqual(pure.get(row.global),[]);assert.deepEqual(pure.get(row.startup),{global:[],private:[]}); }
  const engine = state.sourceBodies.get('src/lib/formulaCareer.ts').body, rules = state.sourceBodies.get('src/data/formulaCareer2025.ts').body;
  assert.equal(p.source.rawEngineSha256, hash(engine)); assert.equal(p.source.rawRulesSha256, hash(rules));
  assert.equal(pure.get(p.source.engineRaw), engine.toString('utf8')); assert.equal(pure.get(p.source.rulesRaw), rules.toString('utf8'));
  const patches = pure.get(p.sourcePatches); assert.equal(patches.length, 20);
  assert.deepEqual(patches.map(row=>row.name),['private-observer',...Object.keys(FAULTS),'undo-observer']);
  for (const row of patches) {
    const before = pure.get(row.before), after = pure.get(row.after), undo = pure.get(row.undo);
    assert.equal(typeof before, 'string'); assert.equal(typeof after, 'string'); assert.equal(before.split(row.from).length - 1, 1); assert.equal(after.split(row.to).length - 1, 1);
    assert.equal(before.replace(row.from, row.to), after); assert.equal(after.replace(row.to, row.from), undo); assert.equal(undo, before);
  }
  assert.deepEqual(p.bundles.map(row=>row.id), ['unobserved','current',...Object.keys(FAULTS),'whole-undo']);
  const expectedSources = new Map([['unobserved',p.source.engine],['current',patches.find(row=>row.name==='private-observer').after],['whole-undo',patches.find(row=>row.name==='undo-observer').after],...Object.keys(FAULTS).map(id=>[id,patches.find(row=>row.name===id).after])]);
  for (const bundle of p.bundles) {
    const compiled = fs.readFileSync(resolve(owner, 'proof/bundles/' + bundle.id + '/compiled.cjs'));
    assert.equal(compiled.length, bundle.compiledBytes); assert.equal(hash(compiled), bundle.compiledSha256);
    const loaded = pure.get(bundle.loaded), meta = pure.get(bundle.metafile), actualEngine = Buffer.from(pure.get(bundle.source));
    assert.deepEqual(JSON.parse(fs.readFileSync(resolve(owner,'proof/bundles/'+bundle.id+'/metafile.json'),'utf8')),meta,'whole standalone metafile');
    assert.deepEqual(fs.readFileSync(resolve(owner,'proof/bundles/'+bundle.id+'/engine.ts')),actualEngine,'whole standalone served engine');
    const entry=fs.readFileSync(resolve(owner,'proof/bundles/'+bundle.id+'/entry.ts'));
    assert.equal(entry.toString('utf8'),"export * from '../src/lib/formulaCareer';\nexport * from '../src/data/formulaCareer2025';\n");
    const outputs=Object.entries(meta.outputs).filter(([file])=>file.endsWith('/compiled.cjs'));assert.equal(outputs.length,1);assert.equal(outputs[0][1].bytes,compiled.length);
    assert.equal(bundle.source, expectedSources.get(bundle.id)); assert.deepEqual(pure.get(bundle.startup), {global:[],private:[]});
    assert.equal(loaded.length, 13); assert.equal(Object.keys(meta.inputs).length, 13);
    for (const row of loaded) {
      const raw = Buffer.from(pure.get(row.raw)), actual = Buffer.from(pure.get(row.loaded));
      assert.equal(raw.length, row.rawBytes); assert.equal(hash(raw), row.rawSha256); assert.equal(actual.length, row.loadedBytes); assert.equal(hash(actual), row.loadedSha256);
      const key = row.namespace === 'file' ? row.path : row.namespace + ':' + row.path; assert(meta.inputs[key], 'complete metafile loaded input'); assert.equal(meta.inputs[key].bytes, actual.length);
      if (row.path.startsWith('src/')) { const canonical = state.sourceBodies.get(row.path); assert(canonical, 'loaded actual source exists'); assert.equal(hash(raw), hash(canonical.body)); }
      if(row.path==='.tmp-fx/formula-proof-entry.ts')assert.deepEqual(raw,entry,'whole actual entry load');
      assert.deepEqual(actual, row.path==='src/lib/formulaCareer.ts'?actualEngine:raw, 'complete actual source served to this bundle');
    }
  }
  assert.equal(p.bundles.find(row=>row.id==='current').compiledSha256,p.bundles.find(row=>row.id==='whole-undo').compiledSha256);
  assert.deepEqual(pure.get(p.globalTape),[]); assert.equal(pure.get(p.privateTape).length,p.counts.privateValues);
  assert.deepEqual(b.cases.map(row => [row.width, row.height]), [[320,568],[390,844],[1280,900]]); assert(b.cases.every(row => row.status === 'pass' && row.errors.length === 0));
  const controlIds = ['healthy-read','effective-complete-read-fault','empty-attribute-equivalence','effective-complete-action-fault','final-drain'];
  const browserBytes=ref=>fileRef({path:'browser/'+ref.file,bytes:ref.bytes,sha256:ref.sha256},owner,'whole browser byte reference');
  const sourcePaths=['scripts/playFormulaCareer.mjs','src/pages/FormulaCareer.tsx','src/hooks/useFormulaCareer.ts','src/lib/formulaCareer.ts','src/data/formulaCareer2025.ts','src/lib/completions.ts','scripts/lib/hostLikeServer.mjs'];
  assert.deepEqual(b.source.map(row=>row.path),sourcePaths);
  for(const row of b.source)assert.deepEqual(browserBytes(row),state.sourceBodies.get(row.path).body,'entire actual browser source');
  assert.deepEqual(browserBytes(b.input.report),fs.readFileSync(resolve(owner,'proof/report.json')),'entire actual pure report input');
  assert.deepEqual(browserBytes(b.input.manifest),fs.readFileSync(resolve(owner,'proof/objects.json')),'entire actual pure manifest input');
  for(const [id,row] of Object.entries(b.input.objects)){
    const original=pure.rows.find(value=>value.hash===id);assert(original);const {retained,...declared}=row;assert.deepEqual(declared,original);
    assert.deepEqual(browserBytes(retained),fs.readFileSync(resolve(owner,'proof/'+original.file)),'entire actual originating packed object');
  }
  for (const row of b.cases) {
    assert.deepEqual(row.controls.map(control => control.id), controlIds);assert.deepEqual(browser.get(row.pageErrors),[]);
    assert.equal(row.screenshots.length,8);assert.equal(row.reloads.length,8);assert(row.layouts.length>0);
    for(const shot of row.screenshots){assert.equal(shot.width,row.width);assert.equal(shot.height,row.height);const raw=browserBytes(shot);assert.equal(raw.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(raw.readUInt32BE(16),row.width);assert.equal(raw.readUInt32BE(20),row.height);}
    const assets=browser.get(row.assets),drain=browser.get(row.finalDrain);assert(assets.length>0);assert.deepEqual(drain.assets,assets);assert.deepEqual(drain.pageErrors,[]);
    for(const asset of assets){assert(!asset.error);safe(asset.built.path);assert(asset.built.path.startsWith('dist/'));const built=state.shared.archives.get(state.shared.seal.archives.dist.path).bodies.get(asset.built.path);assert(built);assert.equal(built.length,asset.built.bytes);assert.equal(hash(built),asset.built.sha256);assert.deepEqual(browserBytes(asset.body),built,'whole actual served response equals sealed build');}
    for(const control of row.controls.filter(value=>value.fault)){
      const expected=control.id==='effective-complete-read-fault'?['save-bytes','read-stream','body-restore','geometry','control']:control.id==='effective-complete-action-fault'?['save-output','callback-once','completion-once','personal-score']:['served-assets','page-errors'];
      assert.deepEqual(control.expected,expected);assert.deepEqual(control.actual,expected);assert.equal(control.healthy,control.undo);assert.notEqual(control.healthy,control.fault);for(const key of ['healthy','fault','undo'])browser.get(control[key]);
    }
  }
  const counted={journeys:b.cases.length,reloads:b.cases.reduce((sum,row)=>sum+row.reloads.length,0),screenshots:b.cases.reduce((sum,row)=>sum+row.screenshots.length,0),layouts:b.cases.reduce((sum,row)=>sum+row.layouts.length,0),steps:b.cases.reduce((sum,row)=>sum+row.steps.length,0),controls:b.cases.reduce((sum,row)=>sum+row.controls.length,0)};assert.deepEqual(b.counts,counted);
  assert.equal(b.input.report.sha256, pure.reportRef.sha256); assert.equal(b.input.manifest.sha256, pure.manifestRef.sha256);
  return { pureReport: pure.reportRef, pureManifest: pure.manifestRef, browserReport: browser.reportRef, browserManifest: browser.manifestRef, pureMetadata: p, browserMetadata: b, population: ids, counts: p.counts, browserCounts: b.counts, sourcePatches: p.sourcePatches, pureObjects: pure.rows.length, browserObjects: browser.rows.length };
}
function tarBodies(packed) {
  const body = gunzipSync(packed), members = [], bodies = new Map(), names = new Set();
  let cursor = 0, ended = false;
  const field = (header, start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
  const number = (header, start, length) => { const text = field(header, start, length).trim(); assert(/^[0-7]*$/.test(text), 'TAR octal field'); const value = parseInt(text || '0', 8); assert(isInt(value)); return value; };
  while (cursor + 512 <= body.length) {
    const header = body.subarray(cursor, cursor + 512); if (header.every(byte => byte === 0)) { assert(body.length - cursor >= 1024 && body.subarray(cursor).every(byte => byte === 0), 'complete TAR zero terminators and trailing body'); cursor = body.length; ended = true; break; }
    let checksum = 0; for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i]; assert.equal(checksum, number(header, 148, 8), 'TAR checksum');
    const size = number(header, 124, 12), mode = number(header, 100, 8), type = header[156], prefix = field(header, 345, 155);
    assert.equal(field(header,257,6),'ustar', 'actual producer ustar format');
    let name = (prefix ? prefix + '/' : '') + field(header, 0, 100);
    const data = body.subarray(cursor + 512, cursor + 512 + size); assert.equal(data.length, size, 'TAR whole member');
    cursor += 512 + Math.ceil(size / 512) * 512; assert(cursor <= body.length, 'TAR member padding');
    assert([0,48,53].includes(type), 'TAR symlink/hardlink/special member');
    if (name.startsWith('./')) name = name.slice(2); if (name.endsWith('/')) name = name.slice(0, -1);
    safe(name); assert(!names.has(name.toLowerCase()), 'TAR path duplicate'); names.add(name.toLowerCase());
    const directory = type === 53; if (directory) assert.equal(size, 0); else bodies.set(name, data);
    members.push({ path: name, type: directory ? 'directory' : 'regular', mode, gitMode: null, externalAttributes: null, bytes: size, sha256: directory ? null : hash(data), blob: null });
  }
  assert(ended, 'actual whole TAR terminator'); assert.equal(cursor, body.length, 'whole TAR consumed');
  return { members, bodies };
}
function stepOutcomes(steps, owner, required) {
  keys(steps, ['expected', 'actual', 'context'], 'actual steps'); assert.deepEqual(steps.expected, required);
  const context = parsed(steps.context, owner, 'complete actual steps context');
  assert.deepEqual(steps.actual.map(row => row.id), required);
  for (const row of steps.actual) {
    keys(row, ['id','outcome','conclusion'], 'step'); assert(context[row.id], 'required actual step absent');
    assert.equal(row.outcome, context[row.id].outcome); assert.equal(row.conclusion, context[row.id].conclusion);
    assert.equal(row.outcome, 'success'); assert.equal(row.conclusion, 'success');
  }
}
const shared = attempt('whole-shared-build', () => {
  const owner = path.join(root, 'shared'), retained = readNamed(owner, 'seal.json'), seal = retained.value;
  state.sharedMetadata={ref:retained.ref,value:seal};
  keys(seal, ['schema','status','head','tree','runId','attempt','files','catalogue','canonicalSource','baselineSource','derived','generated','packages','archives','helperSources','steps','checkoutCwd','evidenceRoot','jobLabel','members'], 'shared seal');
  assert.equal(seal.schema, 'formula-suite-build-seal-v1'); assert.equal(seal.status, 'pass'); assert.equal(seal.jobLabel, 'build');
  assert(/^[0-9a-f]{40}$/.test(seal.head) && /^[0-9a-f]{40}$/.test(seal.tree)); assert(isInt(seal.runId) && seal.runId > 0 && isInt(seal.attempt) && seal.attempt > 0);
  const currentHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),currentTree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
  assert.equal(currentHead,process.env.GITHUB_SHA,'actual current Actions checkout');
  assert.equal(seal.head,currentHead);assert.equal(seal.tree,currentTree);
  const currentRun=Number(process.env.GITHUB_RUN_ID),currentAttempt=Number(process.env.GITHUB_RUN_ATTEMPT);
  assert(isInt(currentRun)&&currentRun>0&&isInt(currentAttempt)&&currentAttempt>0,'actual current Actions identity');
  assert.equal(seal.runId,currentRun);assert.equal(seal.attempt,currentAttempt);
  assert(!fs.existsSync(path.join(owner, 'role.json')), 'shared contains no role metadata copy');
  vector(walk(owner).filter(row => row.path !== 'seal.json'), seal.files, 'whole shared physical set'); for (const row of seal.files) fileRef(row, owner, 'whole shared body');
  stepOutcomes(seal.steps, owner, ['source','setup','types','derived','methods','build','holds']);
  const canonical = parsed(seal.canonicalSource, owner, 'whole canonical source vector');
  const sourceBodies = sourceArchive(seal.archives.currentSource, owner, seal.head, canonical);
  const baseline = parsed(seal.baselineSource, owner, 'whole AA source vector');
  const baseBodies = sourceArchive(seal.archives.baseSource, owner, 'aa564f16019b9e821981d5c4e3e0262312c73b62', baseline);
  const allowed = new Set(['src/lib/formulaCareer.ts','src/data/formulaCareer2025.ts','src/hooks/useFormulaCareer.ts','src/pages/FormulaCareer.tsx','src/data/gameContent/formulaCareer.ts','src/App.tsx','src/data/gameRegistry.ts','src/data/gameContent/index.ts','src/data/gameContent/loader.ts','src/data/seoMeta.ts','src/pages/WhatsNew.tsx','index.html','src/data/searchKeywords.json','src/data/seoMetaParts/seoMetaPart08.ts','scripts/simFormulaCareer.mjs','scripts/playFormulaCareer.mjs','scripts/qa/formulaSuiteInputs.mjs','scripts/qa/formulaSuiteEvidence.mjs','.github/workflows/formula-career.yml','docs/ROUND1277-1279.md','docs/WORKBOARD.md','docs/PROJECT-STATE.md']);
  const changed = [...new Set([...sourceBodies.keys(),...baseBodies.keys()])].filter(file => !sourceBodies.has(file) || !baseBodies.has(file) || !sourceBodies.get(file).body.equals(baseBodies.get(file).body) || sourceBodies.get(file).encodedMode !== baseBodies.get(file).encodedMode).sort();
  for (const file of changed) assert(allowed.has(file),'undeclared entire source change '+file);
  const scope = readNamed(owner,'source-scope.json').value; assert.equal(scope.base,'aa564f16019b9e821981d5c4e3e0262312c73b62'); assert.deepEqual(scope.allowed,[...allowed]); assert.deepEqual([...scope.changed].sort(),changed);
  for (const [leaf,logical] of [['scripts/qa/formulaSuiteInputs.mjs','helpers/formulaSuiteInputs.mjs'],['scripts/qa/formulaSuiteEvidence.mjs','helpers/formulaSuiteEvidence.mjs']]) {
    const canonicalBody=sourceBodies.get(leaf); assert(canonicalBody,'complete canonical helper leaf');
    const retainedHelper=seal.helperSources.find(row=>row.path===logical); assert(retainedHelper,'complete retained helper literal');
    assert.deepEqual(fileRef(retainedHelper,owner,'whole canonical helper literal'),canonicalBody.body);
    if(leaf==='scripts/qa/formulaSuiteEvidence.mjs') assert.deepEqual(fs.readFileSync(fileURLToPath(import.meta.url)),canonicalBody.body,'entire actual executing collector equals canonical source');
  }
  const catalogue = parsed(seal.catalogue, owner, 'whole823 catalogue'); assert.equal(catalogue.length, 823);
  const seen = new Set(); for (const row of catalogue) { keys(row, ['file','id','repoPath','mode','blob','bytes','sha256'], 'catalogue source row'); assert(/^(?:sim|play|sweep)[A-Za-z0-9]+\.mjs$/.test(row.file)); assert.equal(row.id + '.mjs', row.file); assert.equal(row.repoPath, 'scripts/' + row.file); assert(!seen.has(row.file)); seen.add(row.file); const original = canonical.find(value => value.file === row.repoPath); assert(original); for (const key of ['mode','blob','bytes','sha256']) assert.equal(row[key], original[key]); }
  assert.deepEqual(catalogue.map(row => row.file), catalogue.map(row => row.file).sort(), 'exact discovery code-unit order');
  const discovered = canonical.filter(row => /^scripts\/(?:sim|play|sweep)[^/]+\.mjs$/.test(row.file)).map(row => row.file.slice(8)); assert.deepEqual([...seen].sort(), discovered.sort(), 'complete auto-discovery catalogue');
  keys(seal.packages, ['before','afterSetup','final'], 'shared packages'); const lock = JSON.parse(sourceBodies.get('package-lock.json').body.toString('utf8'));
  const packages = {}; for (const stage of ['before','afterSetup','final']) { packages[stage] = parsed(seal.packages[stage], owner, 'shared full census ' + stage); census(packages[stage], lock); assert.deepEqual(packages[stage], packages.before); }
  assert.equal(hash(baseBodies.get('package.json').body), hash(sourceBodies.get('package.json').body)); assert.equal(hash(baseBodies.get('package-lock.json').body), hash(sourceBodies.get('package-lock.json').body));
  const derived = parsed(seal.derived, owner, 'whole derived preparation'), generated = parsed(seal.generated, owner, 'whole generated vector');
  assert.equal(derived.before.length, 35); assert.deepEqual(derived.after, derived.before); for (const row of derived.after) { const actual = sourceBodies.get(row.file); assert(actual); assert.equal(actual.body.length, row.bytes); assert.equal(hash(actual.body), row.sha256); }
  keys(generated, ['public','lastmod','dist'], 'complete generated sets'); const generatedBodies = tarBodies(fileRef(seal.archives.generatedPublic, owner, 'generated public archive')), distBodies = tarBodies(fileRef(seal.archives.dist, owner, 'built dist archive'));
  for (const [decoded, rows] of [[generatedBodies, [...generated.public, ...generated.lastmod]], [distBodies, generated.dist]]) { const expected = exactRows(rows, 'archive vector'); assert.equal(decoded.bodies.size, expected.size); for (const [name, body] of decoded.bodies) { const row = expected.get(name); assert(row); assert.equal(body.length, row.bytes); assert.equal(hash(body), row.sha256); } }
  for (const original of canonical.filter(row => row.file.startsWith('public/') || row.file === 'scripts/data/lastmod.json')) assert(generatedBodies.bodies.has(original.file), 'canonical public member missing from complete generated output');
  const witnesses = parsed(seal.members, owner, 'full archive member witnesses'); assert.equal(witnesses.schema, 'formula-suite-archive-members-v1'); assert.equal(witnesses.archives.length, 4);
  const archives = new Map([[seal.archives.currentSource.path, { ref: seal.archives.currentSource, representation: 'git-zip-member', head: seal.head, members: sourceBodies.members, bodies: sourceBodies }], [seal.archives.baseSource.path, { ref: seal.archives.baseSource, representation: 'git-zip-member', head: 'aa564f16019b9e821981d5c4e3e0262312c73b62', members: baseBodies.members, bodies: baseBodies }], [seal.archives.generatedPublic.path, { ref: seal.archives.generatedPublic, representation: 'tar-member', head: null, ...generatedBodies }], [seal.archives.dist.path, { ref: seal.archives.dist, representation: 'tar-member', head: null, ...distBodies }]]);
  for (const row of witnesses.archives) { keys(row, ['archive','representation','gitHead','members'], 'archive witness'); const actual = archives.get(row.archive.path); assert(actual); assert.deepEqual(row.archive, actual.ref); assert.equal(row.representation, actual.representation); assert.equal(row.gitHead, actual.head); assert.deepEqual(row.members, actual.members); }
  state.catalogue = catalogue; state.sourceBodies = sourceBodies;
  const modeQualification={currentEncoded:sourceBodies.members.filter(row=>row.type==='regular'&&row.mode!==0).length,currentUnencoded:sourceBodies.members.filter(row=>row.type==='regular'&&row.mode===0).length,baseEncoded:baseBodies.members.filter(row=>row.type==='regular'&&row.mode!==0).length,baseUnencoded:baseBodies.members.filter(row=>row.type==='regular'&&row.mode===0).length,qualification:'Every raw ZIP attribute and exact canonical Git mode is retained. ZIP mode0 encodes no Unix permissions, so only nonzero modes independently encode executable permissions. Every entire member body and Git blob identity is checked for both formats.'};
  return { owner, seal, sealRef: retained.ref, canonical, derived: derived.after, generated, packages: packages.final, archives, changed, modeQualification };
});
state.shared = shared;
for (const name of roleNames) attempt('whole-role-' + name, () => {
  const owner = path.join(root, name), retained = readNamed(owner, 'role.json'), role = retained.value;
  const participant=state.roles[name]={role:retained.ref,metadata:role,bindings:{},runners:[],status:'incomplete'};
  assert(shared, 'shared complete closure missing');
  keys(role, ['schema','role','status','head','tree','runId','attempt','jobLabel','checkoutCwd','evidenceRoot','requested','runnerRoots','sharedSeal','inputBindings','packages','source','derived','generated','files','steps'], 'consumer role');
  assert.equal(role.schema, 'formula-suite-role-v1'); assert.equal(role.role, name); assert.equal(role.jobLabel, name); assert.equal(role.status, 'pass');
  for (const key of ['head','tree','runId','attempt']) assert.equal(role[key], shared.seal[key]); assert.deepEqual(role.sharedSeal, shared.sealRef);
  vector(walk(owner).filter(row => row.path !== 'role.json'), role.files, name + ' complete physical set'); for (const row of role.files) fileRef(row, owner, name + ' full physical body');
  stepOutcomes(role.steps, owner, ['setup','restore','run','holds']);
  const requested = name === 'f1' ? F1 : name === 'remaining' ? state.catalogue.map(row => row.id).filter(id => !F1.includes(id)) : READERS;
  assert.deepEqual(role.requested, requested); assert.equal(role.runnerRoots.length, name === 'readers' ? 15 : 1);
  const lock = JSON.parse(state.sourceBodies.get('package-lock.json').body.toString('utf8'));
  keys(role.packages, ['before','afterSetup','final'], 'consumer packages');
  for (const stage of ['before','afterSetup','final']) { const value = parsed(role.packages[stage], owner, name + ' full census ' + stage); census(value, lock); assert.deepEqual(value, shared.packages); }
  for (const kind of ['source','derived','generated','inputBindings']) keys(role[kind], ['before','after'], name + ' ' + kind + ' stages');
  const snapshots = participant.bindings;
  for (const stage of ['before','after']) {
    const source = parsed(role.source[stage], owner, name + ' complete source ' + stage), derived = parsed(role.derived[stage], owner, name + ' complete derived ' + stage), generated = parsed(role.generated[stage], owner, name + ' complete generated ' + stage);
    sourceHeld(source, shared.canonical, shared.generated); assert.deepEqual(derived, shared.derived); assert.deepEqual(generated, shared.generated);
    const binding = parsed(role.inputBindings[stage], owner, name + ' complete bindings ' + stage);
    keys(binding, ['schema','role','stage','head','tree','runId','attempt','checkoutCwd','evidenceRoot','sharedSeal','sharedFiles','aliases','qualification'], 'actual input bindings');
    assert.equal(binding.schema, 'formula-suite-input-bindings-v1'); assert.equal(binding.role, name); assert.equal(binding.stage, stage);
    for (const key of ['head','tree','runId','attempt','checkoutCwd','evidenceRoot']) assert.equal(binding[key], role[key]); assert.deepEqual(binding.sharedSeal, shared.sealRef);
    vector(binding.sharedFiles, [...shared.seal.files, shared.sealRef], 'all actually downloaded shared bodies');
    const expected = new Map(source.map(row => [row.file, row])); for (const row of [...derived, ...generated.public, ...generated.lastmod, ...generated.dist]) { if (expected.has(row.file)) { assert.equal(expected.get(row.file).bytes, row.bytes); assert.equal(expected.get(row.file).sha256, row.sha256); } else expected.set(row.file, row); }
    const seen = new Set();
    for (const alias of binding.aliases) {
      keys(alias, ['logicalPath','bytes','sha256','sharedPath','memberPath','representation'], 'whole input alias');
      assert(typeof alias.logicalPath==='string'&&alias.logicalPath.startsWith(role.checkoutCwd+'/'),'actual input exact checkout prefix');
      const logical=alias.logicalPath.slice(role.checkoutCwd.length+1);safe(logical);safe(alias.sharedPath);assert(!seen.has(logical));seen.add(logical);
      const target = expected.get(logical); assert(target, 'extra actual input alias'); assert.equal(alias.bytes, target.bytes); assert.equal(alias.sha256, target.sha256);
      let body;
      if (alias.representation === 'file') { assert.equal(alias.memberPath, null); const ref = shared.seal.files.find(row => row.path === alias.sharedPath); assert(ref); body = fileRef(ref, shared.owner, 'whole input file alias'); }
      else { assert(['git-zip-member','tar-member'].includes(alias.representation)); safe(alias.memberPath); const archive = shared.archives.get(alias.sharedPath); assert(archive && archive.representation === alias.representation); assert.equal(alias.memberPath, logical); const actual = archive.bodies.get(alias.memberPath); assert(actual); body = alias.representation === 'git-zip-member' ? actual.body : actual; }
      assert.equal(body.length, alias.bytes); assert.equal(hash(body), alias.sha256);
    }
    assert.deepEqual([...seen].sort(), [...expected.keys()].sort(), 'complete actual consumed input aliases'); snapshots[stage] = binding;
  }
  assert.deepEqual(snapshots.before.aliases, snapshots.after.aliases, 'whole actual input bytes held after role');
  const runners = participant.runners;
  for (let i = 0; i < role.runnerRoots.length; i++) {
    const record=attempt('complete-actual-runner-'+name+'-'+i,()=>{
      const runner = role.runnerRoots[i], selected = name === 'readers' ? [READERS[i]] : requested;
      assert.equal(runner.role, name === 'readers' ? 'reader' : 'suite'); assert.equal(runner.id, name === 'readers' ? READERS[i] : name);
      assert.equal(runner.logicalRoot, name === 'readers' ? 'runners/' + READERS[i] : 'cohort-runner');
      return runnerRecord(role, owner, runner, selected);
    });
    if(record){runners.push(record);state.runners.push(record);}
  }
  if (name === 'f1') state.formula = attempt('complete-current-formula-methods',()=>formulaEvidence(owner));
  assert.equal(runners.length,role.runnerRoots.length,'every complete actual runner'); participant.status='pass';
});

function findings(model) {
  const result = [], add = (id, bad) => { if (bad) result.push(id); };
  const expected = model.catalogue.map(row => row.file), actual = model.suite.map(row => row.child.file), unique = [...new Set(actual)];
  add('suite-missing', !equal(unique.sort(), [...expected].sort()));
  add('suite-duplicate', unique.length !== actual.length);
  const all = [...model.suite, ...model.readers];
  add('runner-classification', all.some(row => row.classification.verdict !== 'PASS' || row.classification.verdict !== row.physical.verdict || row.physical.unqualifiedOmissions.length>0));
  add('runner-exit', all.some(row => row.child.exitCode !== 0 || row.child.signal !== null));
  add('source-build-binding', Object.values(model.roles).some(row => ['head','tree','runId','attempt'].some(key => row.metadata[key] !== model.shared[key]) || !equal(row.metadata.sharedSeal, model.shared.sealRef) || ['before','after'].some(stage => !equal(row.bindings[stage].sharedSeal, model.shared.sealRef))));
  const pure = model.suite.find(row => row.child.file === 'simFormulaCareer.mjs'), browser = model.suite.find(row => row.child.file === 'playFormulaCareer.mjs');
  add('formula-order', !pure || !browser || pure.child.closedAt > browser.child.startedAt);
  add('formula-input-binding', model.formula.browserMetadata.input.report.sha256 !== model.formula.pureReport.sha256 || model.formula.browserMetadata.input.manifest.sha256 !== model.formula.pureManifest.sha256);
  add('formula-cap', model.bytes.proof >= 430000000 || model.bytes.browser >= 430000000);
  add('aggregate-cap', model.bytes.complete >= 500000000);
  return result;
}
const modelRef = (model, label) => {
  const raw = json(model), packed = gzipSync(raw, { level: 9 }), id = hash(raw), file = 'controls/objects/' + id + '.json.gz', target = resolve(out, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) assert.deepEqual(fs.readFileSync(target), packed, 'whole model content address'); else fs.writeFileSync(target, packed);
  const persisted = fs.readFileSync(target), decoded = gunzipSync(persisted); assert.deepEqual(decoded, raw);
  return { path: 'aggregate/' + file, bytes: packed.length, sha256: hash(persisted), rawBytes: raw.length, rawSha256: id, label };
};
let model = null;
attempt('complete-aggregate-model', () => {
  assert(state.shared && state.formula && roleNames.every(name => state.roles[name]?.status==='pass'), 'every participant complete');
  const suite = state.runners.flatMap(row => row.rows).filter(row => row.role !== 'readers'), readers = state.runners.flatMap(row => row.rows).filter(row => row.role === 'readers');
  assert.equal(suite.length, 823); assert.equal(readers.length, 15);
  assert.deepEqual([...suite.map(row => row.child.file)].sort(), state.catalogue.map(row => row.file).sort());
  assert.deepEqual(readers.map(row => row.child.file), READERS.map(id => id + '.mjs'));
  const bytesFor = folder => walk(path.join(root, folder)).reduce((total, row) => total + row.bytes, 0);
  model = { schema:'formula-suite-aggregate-model-v1', catalogue:state.catalogue, shared:{ sealRef:shared.sealRef, head:shared.seal.head, tree:shared.seal.tree, runId:shared.seal.runId, attempt:shared.seal.attempt, metadata:shared.seal }, roles:state.roles, suite, readers, formula:state.formula, bytes:{ proof:bytesFor('f1/proof'), browser:bytesFor('f1/browser'), complete:walk(root).reduce((total,row) => total + row.bytes, 0) }, qualification:'Complete current participant metadata and whole actual body references. Original raw streams, source archives, input witnesses and objects remain retained in their owning physical roots. Native outcome interpretation is separately required; this collector does not execute or reconstruct canceled game processes.' };
  assert.deepEqual(findings(model), [], 'all actual aggregate predicates pass');
});
const controls = [];
const CONTROL_MAPS = [
  ['missing-membership',['suite-missing']],
  ['duplicate-identity',['suite-duplicate']],
  ['classification-exit',['runner-classification','runner-exit']],
  ['binding',['source-build-binding','formula-order','formula-input-binding','formula-cap','aggregate-cap']]
];
function pathValue(value, parts) { return parts.reduce((object,key) => object[key], value); }
function setValue(value, parts, replacement) { const owner = parts.slice(0,-1).reduce((object,key) => object[key], value); owner[parts.at(-1)] = replacement; }
for (const [id, expected] of CONTROL_MAPS) attempt('effective-control-' + id, () => {
  assert(model, 'complete original model required'); const healthy = copy(model), fault = copy(healthy), mutations = [];
  const change = (parts, after) => { const before = copy(pathValue(fault, parts)); assert(!equal(before,after), id + ' actual copied mutation changes'); setValue(fault,parts,copy(after)); mutations.push({ path:parts, before, after:copy(after) }); };
  if (id === 'missing-membership') { const missing=fault.suite.findIndex(row=>row.role==='remaining');assert(missing>=0);change(['suite'],fault.suite.filter((row,index)=>index!==missing)); }
  if (id === 'duplicate-identity') change(['suite'], [...fault.suite, copy(fault.suite[0])]);
  if (id === 'classification-exit') { change(['suite',0,'classification','verdict'], 'FAIL'); change(['suite',0,'child','exitCode'], 1);change(['suite',0,'physical','unqualifiedOmissions'],['Copied internal skipped-test observation']); }
  if (id === 'binding') {
    const pureIndex = fault.suite.findIndex(row => row.child.file === 'simFormulaCareer.mjs'), browserIndex = fault.suite.findIndex(row => row.child.file === 'playFormulaCareer.mjs'); assert(pureIndex >= 0 && browserIndex >= 0);
    const replacement = value => (value.startsWith('0') ? '1' : '0') + value.slice(1);
    change(['roles','f1','metadata','sharedSeal','sha256'], replacement(fault.roles.f1.metadata.sharedSeal.sha256));
    change(['suite',browserIndex,'child','startedAt'], fault.suite[pureIndex].child.closedAt - 1);
    change(['formula','browserMetadata','input','report','sha256'], replacement(fault.formula.browserMetadata.input.report.sha256));
    change(['bytes','proof'], 430000000); change(['bytes','browser'], 430000000); change(['bytes','complete'], 500000000);
  }
  const row = { id, expected, status:'incomplete', effective:false, original:modelRef(healthy,id+' original'), fault:modelRef(fault,id+' changed full model'), mutations, isolated:[],actual:findings(fault), healthy:findings(healthy), undo:null, qualification:id==='binding'?'The copied byte-size fields test metadata predicate sensitivity only. Complete actual physical walks and final footers independently enforce both430M and500M caps.':'Copied complete current actual metadata model; no game/source/dependency execution.' };
  controls.push(row);
  for(const mutation of mutations){
    const single=copy(healthy);setValue(single,mutation.path,copy(mutation.after));let precise;
    if(id==='missing-membership'||id==='duplicate-identity')precise=expected;
    else if(id==='classification-exit')precise=[mutation.path.includes('exitCode')?'runner-exit':'runner-classification'];
    else precise=[mutation.path[0]==='roles'?'source-build-binding':mutation.path[0]==='suite'?'formula-order':mutation.path[0]==='formula'?'formula-input-binding':mutation.path[1]==='complete'?'aggregate-cap':'formula-cap'];
    const singleUndo=copy(single);setValue(singleUndo,mutation.path,copy(mutation.before));
    const actual=findings(single),isolated={mutation:copy(mutation.path),expected:precise,actual,status:'incomplete',effective:false,model:modelRef(single,id+' isolated actual mutation'),undo:modelRef(singleUndo,id+' isolated whole undo'),undoFindings:findings(singleUndo)};row.isolated.push(isolated);
    assert.notDeepEqual(json(single),json(healthy),'actual isolated copied mutation changes');assert.deepEqual(actual,precise,'independent precise mutation predicate');assert.deepEqual(json(singleUndo),json(healthy),'every unrelated full isolated record and whole undo held');assert.deepEqual(isolated.undoFindings,[]);isolated.status='pass';isolated.effective=true;
  }
  const undo = copy(fault); for (const mutation of [...mutations].reverse()) setValue(undo,mutation.path,copy(mutation.before));
  row.undo = modelRef(undo,id+' full undo'); row.undoFindings = findings(undo);
  assert.deepEqual(json(undo),json(healthy),'every unrelated full record and ordered bytes held');
  assert.deepEqual(row.healthy,[]); assert.deepEqual(row.actual,expected); assert.deepEqual(row.undoFindings,[]);
  assert.equal(row.original.rawSha256,row.undo.rawSha256); assert.notEqual(row.original.rawSha256,row.fault.rawSha256);
  for (const wanted of expected) assert(row.actual.includes(wanted), 'compound independent predicate '+wanted);
  row.status='pass'; row.effective=true;
});
attempt('complete-root-layout', () => {
  assert.deepEqual(fs.readdirSync(root).sort(), ['aggregate','f1','readers','remaining','shared']);
  assert.equal(controls.length,4); assert(controls.every(row=>row.status==='pass'&&row.effective));
});
const report = {
  schema:'formula-suite-aggregate-report-v1', status:failures.length?'fail':'pass', head:shared?.seal.head??null, tree:shared?.seal.tree??null, runId:shared?.seal.runId??null, attempt:shared?.seal.attempt??null,
  actualSuiteCases:model?.suite.length??null, separateReaders:model?.readers.length??null, shared:state.sharedMetadata,sourceChanges:shared?.changed??null,modeQualification:shared?.modeQualification??null,formula:state.formula, participants:state.roles, controls, attempts, failures,
  qualification:'Complete current single-build, exact2+821 actual suite membership and separate15 rebuilt readers only. Every FAIL/EMPTY/SKIP, wrong exit, absent process/closing record, transport block, body mismatch or size failure is unwaived. Upload/job completion metadata and independent full state, source and original PNG audits remain separate. No old canceled closure or duration improvement is credited.'
};
write('body-checks.json', bodyChecks); write('attempts.json', attempts); write('controls.json', controls); write('failures.json', failures);
const reportPath = resolve(out,'report.json'); fs.writeFileSync(reportPath,json(report));
const inventory = walk(root).filter(row=>!['aggregate/inventory.json','aggregate/physical-size.json'].includes(row.path));
write('inventory.json',inventory);
const sizePath=resolve(out,'physical-size.json'), cap=500000000;
let size={files:0,bytes:0,cap,proofBytes:model?.bytes.proof??null,browserBytes:model?.bytes.browser??null,status:'incomplete',qualification:'Complete current physical files count, including this footer and the full inventory. Excludes no duplicate retained bodies. Copied control size values never replace this actual walk.'};
for(let pass=0;pass<12;pass++){
  fs.writeFileSync(sizePath,json(size));const measured=walk(root),bytes=measured.reduce((total,row)=>total+row.bytes,0),status=bytes<cap&&size.proofBytes!==null&&size.proofBytes<430000000&&size.browserBytes!==null&&size.browserBytes<430000000?'pass':'fail';
  if(size.files===measured.length&&size.bytes===bytes&&size.status===status)break;
  size={...size,files:measured.length,bytes,status};assert(pass<11,'physical footer fixed point');
}
if(size.status!=='pass'){
  report.status='fail';report.failures.push({label:'actual-complete-physical-cap',name:'AssertionError',message:'Complete physical500M or proof/browser430M guard is incomplete or exceeded',size});attempts.push({label:'actual-complete-physical-cap',status:'fail'});fs.writeFileSync(reportPath,json(report));
  fs.writeFileSync(resolve(out,'failures.json'),json(failures));fs.writeFileSync(resolve(out,'attempts.json'),json(attempts));
  // Re-seal the complete changed report and size. The inventory excludes only its own body and this size footer.
  fs.writeFileSync(resolve(out,'inventory.json'),json(walk(root).filter(row=>!['aggregate/inventory.json','aggregate/physical-size.json'].includes(row.path))));
  for(let pass=0;pass<12;pass++){fs.writeFileSync(sizePath,json(size));const rows=walk(root),bytes=rows.reduce((total,row)=>total+row.bytes,0);if(size.files===rows.length&&size.bytes===bytes)break;size={...size,files:rows.length,bytes};assert(pass<11,'failed physical footer fixed point');}
}
console.log('Aggregate actual suite cases: '+(model?.suite.length??'incomplete'));
console.log('Aggregate separate rebuilt readers: '+(model?.readers.length??'incomplete'));
console.log('Aggregate effective copied controls: '+controls.filter(row=>row.effective).length+'/4');
console.log('Aggregate complete retained physical bytes: '+size.bytes);
assert.equal(report.status,'pass','complete aggregate evidence has unwaived findings');assert.equal(size.status,'pass','strict complete physical caps');
console.log('PASS Formula Career exact complete suite and separate rebuilt readers');
