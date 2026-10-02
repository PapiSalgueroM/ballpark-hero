/* Round 872: prove default offline transport against owned local servers.
   RUNNER_TRANSPORT_CONTROL=host|probe|all changes disposable code only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = path.join(root, 'scripts/lib/offlineTransport.cjs');
const runnerPath = path.join(root, 'scripts/runAllSims.mjs');
const workerPath = path.join(root, 'scripts/lib/offlineTransportProbe.mjs');
const heldPaths = [helperPath, runnerPath, workerPath];
const heldBytes = heldPaths.map(file => fs.readFileSync(file));
const helperSource = fs.readFileSync(helperPath, 'utf8').replace(/\r\n/g, '\n');
const runnerSource = fs.readFileSync(runnerPath, 'utf8').replace(/\r\n/g, '\n');
const control = process.env.RUNNER_TRANSPORT_CONTROL || '';
assert.ok(['', 'host', 'agent', 'receipt', 'probe', 'all'].includes(control), 'Unknown transport control.');
const hostTargets = {
  node: ['literal loopback host rules', 'fetch external blocked', 'fetch Request external blocked', 'fetch remote redirect blocked', 'http external blocked', 'named ESM http external blocked', 'https external blocked', 'http options effective remote hostname blocked', 'http proxy absolute request path blocked', 'Node WebSocket external blocked', 'nested child inherited guard'],
  browser: ['browser remote fetch blocked', 'late page continue cannot bypass guard', 'late context continue cannot bypass guard', 'continue rewritten target cannot bypass guard', 'route fetch external blocked', 'route fetch rewritten target blocked', 'context API external blocked', 'context API remote redirect blocked', 'standalone API external blocked', 'standalone API remote redirect blocked', 'later WebSocket routes cannot bypass guard', 'unrouteAll reinstalls transport guard', 'unroute reinstalls transport guard', 'browser document remote redirect blocked', 'browser.newPage receives guard', 'persistent context receives guard'],
};
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'offline872-'));
let foreignConnections = 0;
let requests = [];
let active = 0;
let peak = 0;
let probeFailAfterFirst = false;
let probeCount = 0;
const server = http.createServer(async (request, response) => {
  requests.push({ host: request.headers.host, path: request.url });
  response.setHeader('access-control-allow-origin', '*');
  if (request.url === '/rest/v1/') {
    probeCount++;
    if (probeFailAfterFirst && probeCount > 1) { request.socket.destroy(); return; }
  }
  const port = server.address().port;
  if (request.url === '/remote-redirect') { response.writeHead(302, { location: `http://127.0.0.2:${port}/redirected` }); response.end(); return; }
  const redirects = { '/local-redirect': [302, '/ok'], '/page-redirect': [302, '/page'], '/post-redirect': [307, '/echo'], '/post-to-get': [303, '/echo'] };
  if (redirects[request.url]) { const [status, location] = redirects[request.url]; response.writeHead(status, { location }); response.end(); return; }
  if (request.url === '/page') {
    response.setHeader('content-type', 'text/html');
    response.end('<button onclick="count.textContent=Number(count.textContent)+1">Add</button><p id="count">0</p>');
    return;
  }
  if (request.url === '/echo') { let body = ''; for await (const chunk of request) body += chunk; response.end(`${request.method}:${body}${request.headers['x-local-check'] ? ':' + request.headers['x-local-check'] : ''}`); return; }
  if (request.url.startsWith('/concurrent')) { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 80)); active--; }
  response.end(request.headers.host.startsWith('127.0.0.2:') ? 'outside-response' : 'local-ok');
});
server.on('connection', socket => { if (socket.localAddress.replace(/^::ffff:/, '') === '127.0.0.2') foreignConnections++; });
server.on('upgrade', (request, socket) => {
  requests.push({ host: request.headers.host, path: request.url });
  const accept = createHash('sha1').update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.on('data', () => socket.end());
  socket.on('error', () => {});
});

function run(file, args, env = {}, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd: root, env: { ...process.env, ...env } });
    let out = '';
    child.stdout.on('data', data => out += data);
    child.stderr.on('data', data => out += data);
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Owned probe exceeded ${timeout}ms:\n${out}`)); }, timeout);
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); resolve({ code, out }); });
  });
}
function changeOnce(source, anchor, replacement) {
  assert.equal(source.split(anchor).length - 1, 1, 'Executable control anchor must occur once.');
  const changed = source.replace(anchor, replacement);
  assert.notEqual(changed, source, 'Control must change executable code.');
  return changed;
}
function childEnv(preload) {
  return { NODE_OPTIONS: `--require ${JSON.stringify(preload.replaceAll('\\', '/'))}`, SIM_OFFLINE_RECEIPT: path.join(folder, 'expected-blocks.log'), TRANSPORT_PROBE_PRELOAD: preload, HTTP_PROXY: 'http://127.0.0.2:1', HTTPS_PROXY: 'http://127.0.0.2:1', ALL_PROXY: 'http://127.0.0.2:1', NODE_USE_ENV_PROXY: '1' };
}

try {
  await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
  const local = `http://127.0.0.1:${server.address().port}`;
  const remote = `http://127.0.0.2:${server.address().port}`;
  const normal = !control || control === 'all';
  const transportResults = [];
  for (const kind of [...(normal ? ['normal'] : []), ...(['host', 'all'].includes(control) ? ['host'] : []), ...(['agent', 'all'].includes(control) ? ['agent'] : [])]) {
    const preload = path.join(folder, `offline-${kind}.cjs`);
    fs.writeFileSync(preload, kind === 'host'
      ? changeOnce(helperSource, "host === '127.0.0.1'", "host === '127.0.0.1' || host === '127.0.0.2'")
      : kind === 'agent' ? changeOnce(helperSource, 'if (customAgent || options.createConnection || options.socketPath)', 'if (false && customAgent || options.createConnection || options.socketPath)')
      : helperSource);
    const startConnections = foreignConnections;
    for (const mode of kind === 'agent' ? ['node'] : ['node', 'browser']) {
      const report = path.join(folder, `${kind}-${mode}.json`);
      const result = await run(workerPath, [mode, local, remote, report, path.join(folder, `profile-${kind}`)], childEnv(preload));
      assert.ok(fs.existsSync(report), `Actual ${mode} probe must finish with outcomes:\n${result.out}`);
      const outcomes = JSON.parse(fs.readFileSync(report, 'utf8'));
      if (kind === 'normal') {
        assert.equal(result.code, 0, `${result.out}\nOwned socket requests: ${JSON.stringify(requests.filter(row => /socket/.test(row.path)))}`);
        assert.deepEqual(outcomes.failures, [], result.out);
        assert.equal(outcomes.checks.length, mode === 'node' ? 24 : 27, 'Every intended transport case must run.');
      } else {
        assert.equal(result.code, 1, 'Allowing the denied local sentinel must fail actual assertions.');
        assert.equal(outcomes.checks.length + outcomes.failures.length, mode === 'node' ? 24 : 27, 'Controls must execute every case, with no skips.');
        const targets = kind === 'agent' ? ['custom Agent cannot redirect socket to sentinel', 'stock Agent options cannot override loopback destination'] : hostTargets[mode];
        assert.deepEqual(outcomes.failures.map(row => row.name).sort(), [...targets].sort(), 'Only the intended actual transport assertions may fail.');
        assert.ok(outcomes.checks.includes(mode === 'node' ? 'fetch local work' : 'actual local page interaction'), 'Independent useful local work must hold.');
      }
      transportResults.push({ kind, mode, ...outcomes });
      console.log(`Transport ${kind}/${mode}: ${outcomes.checks.length} held outcomes; ${outcomes.failures.length} intended failures.`);
      if (kind !== 'normal') console.log(`Transport ${kind}/${mode} rejected: ${outcomes.failures.map(row => row.name).join('; ')}.`);
    }
    if (kind === 'normal') assert.equal(foreignConnections - startConnections, 0, 'Blocked targets must make zero actual TCP connections to the owned sentinel.');
    else assert.ok(foreignConnections > startConnections, 'The control must cause real local sentinel transport, not merely a source difference.');
    console.log(`Transport ${kind}: actual denied-target TCP connections ${foreignConnections - startConnections}; all targets were owned local servers.`);
  }

  const mini = path.join(folder, 'runner');
  fs.mkdirSync(path.join(mini, 'scripts/lib'), { recursive: true });
  fs.mkdirSync(path.join(mini, 'src/integrations/supabase'), { recursive: true });
  fs.writeFileSync(path.join(mini, 'scripts/lib/offlineTransport.cjs'), helperSource);
  fs.writeFileSync(path.join(mini, 'src/integrations/supabase/client.ts'), `const SUPABASE_URL = '${local}'; const SUPABASE_PUBLISHABLE_KEY = 'local-fixture';`);
  const fixtureRunner = path.join(mini, 'scripts/runAllSims.mjs');
  fs.writeFileSync(fixtureRunner, runnerSource);
  const four = "console.log('one useful outcome');console.log('two useful outcomes');console.log('three useful outcomes');console.log('four useful outcomes');";
  const fixtures = {
    simPure: `await fetch('${local}/ok');${four}`,
    simDatabase: "try{await fetch('https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/')}catch{}console.log('DATABASE UNREACHABLE. NOTHING WAS CHECKED.');process.exitCode=1;",
    simMisleading: `try{await fetch('https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/')}catch{}${four}`,
    simOutside: `try{await fetch('${remote}/outside')}catch{}console.log('NOTHING WAS CHECKED');process.exitCode=1;`,
    simLiveSentinel: `await fetch('${remote}/explicit-live-sentinel');${four}`,
    simSwallowed: `import {spawnSync} from 'node:child_process';spawnSync(process.execPath,['--input-type=module','-e',"await fetch('https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/')"],{env:process.env,stdio:'pipe'});${four}`,
    simEmpty: "for(let i=0;i<4;i++){try{await fetch('https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/')}catch{}}",
    simFailure: "throw new Error('actual local assertion failed');",
    simNoData: `import fs from 'node:fs'; fs.appendFileSync('${path.join(mini, 'attempts.txt').replaceAll('\\', '/')}', 'run\\n');console.log('DATABASE UNREACHABLE. NOTHING WAS CHECKED.');process.exitCode=1;`,
  };
  for (const suffix of ['A', 'B', 'C']) fixtures[`simParallel${suffix}`] = `await fetch('${local}/concurrent${suffix}');${four}`;
  for (const [name, source] of Object.entries(fixtures)) fs.writeFileSync(path.join(mini, `scripts/${name}.mjs`), source);
  const runnerEnv = { NODE_OPTIONS: '', SIM_OFFLINE_RECEIPT: '', DB_PROBE: '', SIM_NETWORK: '', BROWSER: '', ONLY: 'simPure' };
  const runnerChecks = [];
  async function runnerCheck(name, env, verify) {
    const result = await run(fixtureRunner, [], { ...runnerEnv, ...env });
    await verify(result);
    runnerChecks.push(name);
  }
  if (normal) {
    probeCount = 0;
    await runnerCheck('scoped default sends no probe and preserves local work', {}, result => { assert.equal(result.code, 0, result.out); assert.match(result.out, /Network mode: offline/); assert.match(result.out, /PASS\s+simPure/); assert.equal(probeCount, 0); });
    await runnerCheck('DB_PROBE cannot opt into live transport; database no-data is SKIP', { ONLY: 'simDatabase', DB_PROBE: 'reachable' }, result => { assert.equal(result.code, 0, result.out); assert.match(result.out, /SKIP\s+simDatabase/); assert.match(result.out, /0 harnesses green, 1 skipped/); assert.equal((result.out.match(/retrying /g) || []).length, 0); assert.equal(probeCount, 0); });
    await runnerCheck('success after denied database access remains failure', { ONLY: 'simMisleading' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /FAIL\s+simMisleading/); });
    await runnerCheck('discarded nested output cannot hide denied database access', { ONLY: 'simSwallowed' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /FAIL\s+simSwallowed/); assert.match(result.out, /reported success after an offline transport block/); });
    await runnerCheck('non-database no-data remains failure', { ONLY: 'simOutside' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /FAIL\s+simOutside/); assert.doesNotMatch(result.out, /SKIP\s+simOutside/); });
    await runnerCheck('guard diagnostics cannot satisfy four-line evidence', { ONLY: 'simEmpty' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /EMPTY\s+simEmpty/); assert.match(result.out, /printed 0 lines/); });
    await runnerCheck('independent assertion failure remains failure', { ONLY: 'simFailure' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /FAIL\s+simFailure/); });
    await runnerCheck('unknown transport mode fails before child execution', { SIM_NETWORK: 'typo' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /SIM_NETWORK must be offline or live/); });
    const beforeLive = foreignConnections;
    await runnerCheck('ordinary default cannot send controlled live sentinel', { ONLY: 'simLiveSentinel' }, result => { assert.equal(result.code, 1, result.out); assert.match(result.out, /FAIL\s+simLiveSentinel/); assert.equal(foreignConnections, beforeLive); });
    await runnerCheck('explicit live opt-in enables only controlled sentinel in this test', { SIM_NETWORK: 'live', DB_PROBE: 'unreachable', ONLY: 'simLiveSentinel' }, result => { assert.equal(result.code, 0, result.out); assert.match(result.out, /PASS\s+simLiveSentinel/); assert.equal(foreignConnections - beforeLive, 1); });
    peak = 0;
    probeCount = 0;
    await runnerCheck('explicit live mode serializes owned local work and probes once', { SIM_NETWORK: 'live', ONLY: 'simParallelA,simParallelB,simParallelC' }, result => { assert.equal(result.code, 0, result.out); assert.match(result.out, /Network mode: live/); assert.equal(peak, 1); assert.equal(probeCount, 1); });
    probeCount = 0;
    probeFailAfterFirst = true;
    await runnerCheck('unavailable second live probe sends no harness retry', { SIM_NETWORK: 'live', ONLY: 'simNoData' }, result => { assert.equal(result.code, 0, result.out); assert.match(result.out, /SKIP\s+simNoData/); assert.match(result.out, /no second harness run was sent/); assert.equal(fs.readFileSync(path.join(mini, 'attempts.txt'), 'utf8'), 'run\n'); });
    probeFailAfterFirst = false;
    console.log(`Runner normal: ${runnerChecks.length}/12 actual child-process outcomes passed; no offline probe/retry and honest PASS/SKIP/FAIL/EMPTY, including discarded nested diagnostics.`);
  }
  if (['receipt', 'all'].includes(control)) {
    fs.writeFileSync(path.join(mini, 'scripts/lib/offlineTransport.cjs'), changeOnce(helperSource, 'if (process.env.SIM_OFFLINE_RECEIPT) fs.appendFileSync(process.env.SIM_OFFLINE_RECEIPT, line);', 'if (false && process.env.SIM_OFFLINE_RECEIPT) fs.appendFileSync(process.env.SIM_OFFLINE_RECEIPT, line);'));
    const result = await run(fixtureRunner, [], { ...runnerEnv, ONLY: 'simSwallowed' });
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /PASS\s+simSwallowed/);
    assert.throws(() => assert.equal(result.code, 1, 'discarded nested block must fail the runner'), /discarded nested block must fail the runner/);
    fs.writeFileSync(path.join(mini, 'scripts/lib/offlineTransport.cjs'), helperSource);
    console.log('Runner receipt control: removing one executable append rejected the discarded-nested-block failure assertion.');
    console.log('Runner receipt control: transport remained blocked; the wrong PASS occurred only when the independent receipt was removed.');
  }
  if (['probe', 'all'].includes(control)) {
    fs.writeFileSync(fixtureRunner, changeOnce(runnerSource, "if (OFFLINE) return { ok: false, why: 'offline mode blocks production; no database probe was sent' };", "if (false && OFFLINE) return { ok: false, why: 'offline mode blocks production; no database probe was sent' };"));
    probeCount = 0;
    const result = await run(fixtureRunner, [], runnerEnv);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /PASS\s+simPure/);
    assert.throws(() => assert.equal(probeCount, 0, 'scoped offline runner must not probe'), /scoped offline runner must not probe/);
    assert.equal(probeCount, 1, 'Removing the executable offline branch must send exactly one owned local probe.');
    console.log('Runner probe control: scoped no-probe assertion rejected one actual local request; useful pure child stayed green.');
    console.log('Runner probe control: copied child transport guard stayed intact and the pure child supplied all four substantive evidence lines.');
  }
  console.log('Transport receipt: no production, site or public DNS target was contacted; controls used a private127.0.0.2 sentinel only.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  assert.ok(path.resolve(folder).startsWith(path.resolve(parent) + path.sep), 'Cleanup must remain in the owned control folder.');
  fs.rmSync(folder, { recursive: true, force: true });
  heldPaths.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), heldBytes[index], `${file} must remain byte-identical through testing.`));
}
console.log('Transport cleanup: owned browsers, contexts, server and copies closed/removed; runner/helper/stimulus source bytes held.');
