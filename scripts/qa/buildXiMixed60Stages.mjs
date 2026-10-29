import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = fs.realpathSync(process.cwd()), OUT = fs.realpathSync(process.env.XI_MIXED_OUT);
const id = process.argv[2];
assert.equal(process.argv.length, 3);
assert.equal(process.env.SIM_NETWORK, 'offline');
const source = JSON.parse(fs.readFileSync('qa/build-xi-mixed60/SOURCE.json', 'utf8'));
assert.equal(source.bound, true, 'MIXED_POSITIVE_UNBOUND');
assert.equal(source.phase, 'all-pass');
const prerequisite = source.browser.baselinePrerequisite;
assert(prerequisite && Number.isInteger(prerequisite.run) && prerequisite.run > 0, 'MIXED_BASELINE_PREREQUISITE');
for (const key of ['rootAdmissionSHA256', 'custodianAdmissionSHA256']) assert.match(prerequisite[key] || '', /^[a-f0-9]{64}$/);
assert.match(prerequisite.head || '', /^[a-f0-9]{40}$/);
const unit = JSON.parse(fs.readFileSync(path.join(OUT, 'admission.json'), 'utf8'));
assert.equal(unit.phase, 'all-pass');
assert.equal(unit.source, process.env.GITHUB_SHA);
assert.equal(unit.actual.length, 5);
assert(unit.actual.every(x => x.status === 'passed'), 'MIXED_FIVE_BEFORE_BUILD');

const readers = ['simAdsense','simBrand','simHeadTags','simHiddenPages','simHubs','simIndexNow','simIndexing','simInternalLinks','simNoRivalNames','simPrerender','simPrerenderBoot','simRetiredRoutes','simSchema','simSitemap','simSnapshotAssets','simSiteSearch','simGuideHeadings','simLegalPages'];
const commands = {
  syntax: { command: process.execPath, args: ['--check', 'scripts/qa/playBuildXiMixed60.mjs'], deadlineMs: 60000 },
  build: { command: 'npm', args: ['run', 'build'], deadlineMs: 900000 },
  readers: { command: process.execPath, args: ['scripts/runAllSims.mjs', '--browser'], deadlineMs: 900000, env: { ONLY: readers.join(',') } },
  caps: { command: process.execPath, args: ['scripts/sweepWeight.mjs'], deadlineMs: 300000, env: { BASE: 'http://127.0.0.1:4173', SWEEP_OFFLINE: '1' } },
  browser: { command: process.execPath, args: ['scripts/qa/playBuildXiMixed60.mjs'], deadlineMs: 300000, env: { XI_MIXED_BASE: 'http://127.0.0.1:4173' } },
};
assert(Object.hasOwn(commands, id), 'MIXED_FINITE_STAGE');
if (id === 'readers') for (const name of readers) assert(fs.statSync('scripts/' + name + '.mjs').isFile());
const spec = commands[id], hash = b => createHash('sha256').update(b).digest('hex');
const dir = path.join(OUT, 'build'); fs.mkdirSync(dir, { recursive: true });
const put = (name, value) => fs.writeFileSync(path.join(dir, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const receipt = path.join(dir, id + '.transport'); fs.writeFileSync(receipt, '', { flag: 'wx' });
const so = fs.openSync(path.join(dir, id + '.stdout'), 'wx'), se = fs.openSync(path.join(dir, id + '.stderr'), 'wx');
const record = { id, command: spec.command, args: spec.args, cwd: ROOT, startedAt: new Date().toISOString(), pid: null, closed: false, status: null, signal: null, error: null, deadlineMs: spec.deadlineMs, deadlineExpired: false, signalAttempts: [] };
const child = cp.spawn(spec.command, spec.args, { cwd: ROOT, detached: true, stdio: ['ignore', so, se], env: { ...process.env, ...spec.env, SIM_NETWORK: 'offline', SIM_OFFLINE_RECEIPT: receipt, NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs') } });
record.pid = child.pid ?? null; put(id + '.start.json', record);
let timer, killTimer;
const signal = name => { const attempt = { signal: name, at: new Date().toISOString(), error: null }; try { process.kill(-child.pid, name); } catch (error) { attempt.error = { name: error.name, message: error.message }; } record.signalAttempts.push(attempt); };
if (child.pid) timer = setTimeout(() => { record.deadlineExpired = true; signal('SIGTERM'); killTimer = setTimeout(() => { if (!record.closed) signal('SIGKILL'); }, 15000); }, spec.deadlineMs);
child.on('error', error => { record.error = { name: error.name, message: error.message, code: error.code ?? null }; });
await new Promise(resolve => child.on('close', (status, signalled) => { record.status = status; record.signal = signalled; record.closed = true; record.closedAt = new Date().toISOString(); resolve(); }));
clearTimeout(timer); clearTimeout(killTimer); fs.closeSync(so); fs.closeSync(se);
for (const stream of ['stdout','stderr']) { const b = fs.readFileSync(path.join(dir, id + '.' + stream)); record[stream + 'Bytes'] = b.length; record[stream + 'Sha256'] = hash(b); }
record.transportBytes = fs.readFileSync(receipt).length; put(id + '.closed.json', record);
assert(Number.isInteger(record.pid) && record.pid > 0);
assert.equal(record.status, 0, 'MIXED_STAGE_EXIT');
assert.equal(record.signal, null); assert.equal(record.error, null); assert.equal(record.closed, true);
assert.equal(record.deadlineExpired, false, 'MIXED_STAGE_DEADLINE'); assert.deepEqual(record.signalAttempts, []);
assert.equal(record.transportBytes, 0, 'MIXED_STAGE_OFFLINE');
console.log('Mixed60 ' + id + ': native exit0, original output retained. Reader/cap rows and browser observations require actual admission.');

