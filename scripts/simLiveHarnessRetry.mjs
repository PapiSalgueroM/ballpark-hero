/*
   Round 417 harness: live database fences retry transport failures only.

   The schema, value freshness and daily order fences are allowed one short
   retry window for a thrown transport error. An HTTP response is still an
   answer for the existing harness to interpret, including a refusal. This stays offline by
   injecting request functions into the real helper.

   NEGATIVE CONTROL: SIM_LIVE_RETRY_CONTROL=single-attempt writes a temporary
   one-attempt helper in OS temp, proves the exact retry loop changed, then
   requires the transient recovery check alone to fail. The normal run launches
   an internal expected-nonzero setup-failure child, so a setup error can never
   pass as the one expected control failure.

   Run: node scripts/simLiveHarnessRetry.mjs
*/
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_LIVE_RETRY_CONTROL || '';
const BREAK_CONTROL_IMPORT = process.env.SIM_LIVE_RETRY_BREAK_CONTROL_IMPORT === '1';
const SINGLE_ATTEMPT_CONTROL = CONTROL === 'single-attempt';
if (CONTROL && !SINGLE_ATTEMPT_CONTROL) {
  console.error(`SIM_LIVE_RETRY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const HELPER = path.join(ROOT, 'scripts', 'lib', 'fetchWithTransportRetry.mjs');
const CONTROL_HELPER = path.join(os.tmpdir(), `fetchWithTransportRetry.single-attempt-${process.pid}.mjs`);
let failures = 0;
let controlMutationSucceeded = false;
let transientSectionCompleted = false;
const fail = message => { failures += 1; console.error('  FAIL: ' + message); };

async function loadHelper() {
  let entry = HELPER;
  if (SINGLE_ATTEMPT_CONTROL) {
    const source = fs.readFileSync(HELPER, 'utf8');
    const before = 'for (let attempt = 1; attempt <= 3; attempt += 1) {';
    const after = 'for (let attempt = 1; attempt <= 1; attempt += 1) {';
    if (!source.includes(before)) throw new Error('control cannot run: the exact three-attempt loop is not in fetchWithTransportRetry.mjs');
    const mutated = source.replace(before, after);
    if (mutated === source || !mutated.includes(after)) throw new Error('control cannot run: the retry loop did not change to one attempt');
    fs.mkdirSync(path.dirname(CONTROL_HELPER), { recursive: true });
    fs.writeFileSync(CONTROL_HELPER, mutated);
    controlMutationSucceeded = true;
    entry = CONTROL_HELPER;
    console.log(`   NEGATIVE CONTROL ON: a temporary helper has one attempt${BREAK_CONTROL_IMPORT ? ' and its import is broken' : ''}`);
    if (BREAK_CONTROL_IMPORT) {
      console.log('   INTERNAL EXPECTED-NONZERO SETUP PROOF');
      entry += '.missing';
    }
  }
  const loaded = await import(pathToFileURL(entry).href + `?run=${process.pid}-${Date.now()}`);
  if (typeof loaded.fetchWithTransportRetry !== 'function') throw new Error('fetchWithTransportRetry.mjs does not export fetchWithTransportRetry');
  return loaded.fetchWithTransportRetry;
}

let retry;
try {
  retry = await loadHelper();
} catch (error) {
  if (SINGLE_ATTEMPT_CONTROL) fs.rmSync(CONTROL_HELPER, { force: true });
  console.error(`simLiveHarnessRetry setup failed: ${String(error).slice(0, 180)}`);
  process.exit(1);
}

try {
  console.log('1) one thrown transport failure then success returns the second response');
  {
    const expected = { status: 200, ok: true };
    let calls = 0;
    const result = await retry(async () => {
      calls += 1;
      if (calls === 1) throw new Error('transient socket reset');
      return expected;
    }, { delay: async () => {} });
    console.log(`   ${calls} calls, response ${result.response === expected ? 'returned' : 'missing'}`);
    if (result.response !== expected || result.error || calls !== 2) fail('one thrown transport failure did not recover with its second response');
    transientSectionCompleted = true;
  }

  if (!CONTROL) {
    console.log('2) three thrown failures return no response and the third error');
    {
      const errors = [new Error('first transport error'), new Error('second transport error'), new Error('third transport error')];
      let calls = 0;
      const delays = [];
      const result = await retry(async () => {
        const error = errors[calls];
        calls += 1;
        throw error;
      }, { delay: async milliseconds => { delays.push(milliseconds); } });
      console.log(`   ${calls} calls, response ${result.response ? 'returned' : 'none'}, last error ${result.error?.message || 'missing'}, delays ${delays.join(',')}`);
      if (calls !== 3 || result.response || result.error !== errors[2] || delays.length !== 2 || delays[0] !== 200 || delays[1] !== 400) fail('persistent transport failures did not return the third error after 200ms then 400ms delays');
    }

    console.log('3) an HTTP refusal response returns after one call');
    {
      const refusal = { status: 403, ok: false };
      let calls = 0;
      const result = await retry(async () => { calls += 1; return refusal; }, { delay: async () => {} });
      console.log(`   ${calls} call, HTTP ${result.response?.status ?? 'missing'}`);
      if (calls !== 1 || result.response !== refusal || result.error) fail('an HTTP refusal was retried or hidden instead of returned immediately');
    }

    console.log('4) an immediate success returns after one call');
    {
      const success = { status: 200, ok: true };
      let calls = 0;
      const result = await retry(async () => { calls += 1; return success; }, { delay: async () => {} });
      console.log(`   ${calls} call, response ${result.response === success ? 'returned' : 'missing'}`);
      if (calls !== 1 || result.response !== success || result.error) fail('an immediate success did not return after one call');
    }

    console.log('5) every live fetch site routes through the helper');
    {
      const expected = new Map([
        ['simSchemaNames.mjs', 2],
        ['simValueFreshness.mjs', 1],
        ['simDailyPoolOrder.mjs', 1],
      ]);
      for (const [file, calls] of expected) {
        const source = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        const importsHelper = /import\s+\{\s*fetchWithTransportRetry\s*\}\s+from\s+['"]\.\/lib\/fetchWithTransportRetry\.mjs['"]/.test(source);
        const helperCalls = (source.match(/fetchWithTransportRetry\(\s*\(\)\s*=>\s*fetch\s*\(/g) || []).length;
        const rawFetches = (source.match(/\bfetch\s*\(/g) || []).length;
        console.log(`   ${file}: ${helperCalls} helper calls for ${rawFetches} fetch sites`);
        if (!importsHelper || helperCalls !== calls || rawFetches !== calls) fail(`${file} does not import and call the helper for every fetch site`);
        const whitespaceFixture = 'fetchWithTransportRetry(() => fetch (url))';
        if ((whitespaceFixture.match(/fetchWithTransportRetry\(\s*\(\)\s*=>\s*fetch\s*\(/g) || []).length !== 1 || (whitespaceFixture.match(/\bfetch\s*\(/g) || []).length !== 1) {
          fail(`${file} source detector misses whitespace before a fetch call`);
        }
        if (file === 'simSchemaNames.mjs' && !/let\s+refusalFailed\s*=\s*false;[\s\S]*?CONTROL\s*===\s*['"]refusal['"][\s\S]*?if\s*\(\s*res\.ok\s*\)\s*continue;[\s\S]*?fail\([\s\S]*?refusalFailed\s*=\s*true[\s\S]*?if\s*\(\s*CONTROL\s*===\s*['"]refusal['"]\s*\)[\s\S]*?failures\s*===\s*1/.test(source)) {
          fail('simSchemaNames has no caller-level refusal control that fails a returned HTTP refusal');
        }
        if (file === 'simDailyPoolOrder.mjs') {
          const refusalFailsClosed = /let\s+accessDeniedFailed\s*=\s*false;/.test(source)
            && /CONTROL\s*===\s*['"]accessdenied['"][\s\S]*?status:\s*403/.test(source)
            && /if\s*\(\s*!r\.ok\s*\)[\s\S]*?r\.status\s*===\s*403[\s\S]*?accessDeniedFailed\s*=\s*true;[\s\S]*?fail\(/.test(source)
            && /if\s*\(\s*CONTROL\s*===\s*['"]accessdenied['"]\s*\)[\s\S]*?accessDeniedInjected\s*&&\s*accessDeniedFailed\s*&&\s*failures\s*===\s*1/.test(source);
          if (!refusalFailsClosed) fail('simDailyPoolOrder has no caller-level refusal control that fails a returned HTTP refusal');
        }
      }
    }

    console.log('6) a setup/import error cannot pass as a one-failure control');
    {
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, SIM_LIVE_RETRY_CONTROL: 'single-attempt', SIM_LIVE_RETRY_BREAK_CONTROL_IMPORT: '1' },
      });
      const output = `${child.stdout || ''}${child.stderr || ''}`;
      console.log(`   child exit ${child.status}, ${output.includes('INTERNAL EXPECTED-NONZERO SETUP PROOF') ? 'setup proof printed' : 'setup proof MISSING'}`);
      if (child.status !== 1 || !output.includes('INTERNAL EXPECTED-NONZERO SETUP PROOF') || !output.includes('simLiveHarnessRetry setup failed:') || /control: green/.test(output)) fail('a setup/import error could still pass as a one-failure control');
    }
  }
} finally {
  if (SINGLE_ATTEMPT_CONTROL) fs.rmSync(CONTROL_HELPER, { force: true });
}

console.log('');
if (CONTROL === 'single-attempt') {
  if (!controlMutationSucceeded || !transientSectionCompleted) { console.error('simLiveHarnessRetry control: RED. The mutation or section 1 did not complete.'); process.exit(1); }
  if (failures === 1) { console.log('simLiveHarnessRetry control: green. The one-attempt helper lost transient recovery and exactly section 1 caught it.'); process.exit(0); }
  console.error(`simLiveHarnessRetry control: RED. Expected exactly one transient recovery failure, got ${failures}.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simLiveHarnessRetry: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simLiveHarnessRetry: green. Transient throws retry, HTTP answers stay immediate, and all three live fences use the helper.');
