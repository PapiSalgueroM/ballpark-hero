/* Round 510: execute the real kit-number audit with only fetch replaced.
 * A failed second page must retry that page, never grade a partial pool.
 * The failure fixtures are negative controls: each records its injected fault
 * and must fail closed before any kit-number checks or green summary appear.
 * Healthy fixtures still run the actual enrichment and its trusting control.
 * Run: node scripts/simFootleKitFetch.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CASE = process.env.FOOTLE_FETCH_CASE || '';
const cases = [
  'healthy', 'retry-http', 'retry-rejection', 'http', 'rejection',
  'fetch-hang', 'body-hang', 'body-rejection', 'empty', 'malformed',
  'missing-row', 'wrong-range', 'changed-total', 'missing-total', 'page-cap',
  'no-matching-players', 'trusting',
];

if (CASE) {
  assert.ok(cases.includes(CASE), `unknown fetch fixture ${CASE}`);
  const calls = [];
  let injected = 0;
  let aborted = 0;
  process.once('exit', () => console.log(`FETCH_FIXTURE ${JSON.stringify({ calls, injected, aborted })}`));

  // Synthetic transport fixtures, not a claim about these players' current clubs.
  const rows = [
    ...Array.from({ length: 999 }, (_, i) => ({ player_name: `A kit fetch fixture ${i}`, club: 'Arsenal' })),
    { player_name: 'Erling Haaland', club: 'Manchester City' },
    { player_name: 'Gabriel Jesus', club: 'Barcelona' },
  ];
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, '/rest/v1/player_market_values');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('Prefer'), 'count=exact');
    const from = Number(headers.get('Range').split('-')[0]);
    calls.push(from);
    const atSecondPage = from === 1000;
    const firstSecondPageAttempt = calls.filter(offset => offset === 1000).length === 1;
    const fault = atSecondPage && (!CASE.startsWith('retry-') || firstSecondPageAttempt);
    if (fault && ['http', 'retry-http'].includes(CASE)) {
      injected++;
      return new Response('unavailable', { status: 503 });
    }
    if (fault && ['rejection', 'retry-rejection'].includes(CASE)) {
      injected++;
      throw new Error('synthetic connection reset');
    }
    if (fault && ['fetch-hang', 'body-hang'].includes(CASE)) {
      injected++;
      init.signal?.addEventListener('abort', () => { aborted++; }, { once: true });
      if (CASE === 'fetch-hang') return new Promise(() => {});
      return new Response(new ReadableStream({ start() {} }), {
        status: 206, headers: { 'Content-Range': '1000-1000/1001' },
      });
    }
    if (fault && CASE === 'body-rejection') {
      injected++;
      return new Response(new ReadableStream({
        start(controller) { controller.error(new Error('synthetic body read failure')); },
      }), { status: 206, headers: { 'Content-Range': '1000-1000/1001' } });
    }

    let page = rows.slice(from, from + 1000);
    let range = `${from}-${from + page.length - 1}/${rows.length}`;
    if (CASE === 'empty') { injected++; page = []; range = '*/0'; }
    if (fault && CASE === 'malformed') { injected++; page = { error: 'not rows' }; }
    if (fault && CASE === 'missing-row') { injected++; page = []; }
    if (fault && CASE === 'wrong-range') { injected++; range = '0-0/1001'; }
    if (fault && CASE === 'changed-total') { injected++; range = '1000-1000/1002'; }
    if (CASE === 'missing-total') { injected++; range = range.replace(/\/\d+$/, '/*'); }
    if (CASE === 'page-cap') {
      injected++;
      page = Array.from({ length: 1000 }, (_, i) => ({ player_name: `A kit fetch fixture ${from + i}`, club: 'Arsenal' }));
      range = `${from}-${from + 999}/23000`;
    }
    if (CASE === 'no-matching-players') {
      injected++;
      page = [{ player_name: 'A kit fetch fixture', club: 'Arsenal' }];
      range = '0-0/1';
    }
    return new Response(JSON.stringify(page), { status: 206, headers: { 'Content-Range': range } });
  };
  await import('./simFootleKitNumbers.mjs');
} else {
  const run = name => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, FOOTLE_FETCH_CASE: name, FOOTLE_KIT_CONTROL: name === 'trusting' ? 'trusting' : '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const timeout = setTimeout(() => { child.kill(); }, 25000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', (status, signal) => {
      clearTimeout(timeout);
      resolve({ name, status, signal, output });
    });
  });
  let failures = 0;
  for (let batch = 0; batch < cases.length; batch += 4) {
    const results = await Promise.all(cases.slice(batch, batch + 4).map(run));
    for (const { name, status, signal, output } of results) {
      try {
        assert.equal(signal, null, 'the audit exceeded its bounded completion time');
        const report = output.match(/FETCH_FIXTURE (\{[^\n]+\})/);
        assert.ok(report, 'the child must finish and report the boundary calls');
        const { calls, injected, aborted } = JSON.parse(report[1]);
        const healthy = ['healthy', 'retry-http', 'retry-rejection', 'trusting'].includes(name);
        if (healthy) {
          assert.equal(status, 0, output);
          assert.match(output, /1001 players in the 2026 pool/);
          assert.match(output, /2 of the hand list are in the pool, 1 have changed league/);
          assert.match(output, /1\/1 still have one/);
          assert.match(output, /0 players carrying kit 0/);
          assert.deepEqual(calls, name.startsWith('retry-') ? [0, 1000, 1000] : [0, 1000]);
          if (name.startsWith('retry-')) assert.equal(injected, 1, 'the transient failure control must fire');
          if (name === 'trusting') {
            assert.match(output, /FAIL: Footle would grade against a stale squad number\. Gabriel Jesus/);
            assert.match(output, /NEGATIVE CONTROL trusting was on; 1 finding\(s\)/);
          } else assert.match(output, /simFootleKitNumbers: green/);
          assert.doesNotMatch(output, /NOTHING WAS CHECKED/);
        } else {
          assert.ok(injected > 0, 'the failure control must change a network response');
          assert.equal(status, 1, output);
          assert.match(output, /NOTHING WAS CHECKED/);
          assert.doesNotMatch(output, /simFootleKitNumbers: green|1\) nobody who has changed league/);
          if (name === 'page-cap') {
            assert.equal(calls.length, 22, 'the existing 22-page safety cap must fail closed');
            assert.equal(calls.at(-1), 21000);
          } else if (['empty', 'missing-total'].includes(name)) assert.deepEqual(calls, [0, 0]);
          else if (name === 'no-matching-players') assert.deepEqual(calls, [0]);
          else assert.deepEqual(calls, [0, 1000, 1000], 'a failed page is retried once at the same offset');
          if (name.endsWith('-hang')) assert.equal(aborted, 2, 'both stalled requests must be aborted');
        }
        console.log(`PASS ${name}: exit ${status}, offsets ${calls.join(',')}, faults ${injected}, aborted ${aborted}`);
      } catch (error) {
        failures++;
        // A controlled refusal must not make the suite classify this offline test as unavailable.
        console.error(`FAIL ${name}: ${error.message}\n${output}`.replaceAll('NOTHING WAS CHECKED', '[controlled refusal marker]'));
      }
    }
  }
  console.log(`simFootleKitFetch: ${cases.length - failures}/${cases.length} cases passed.`);
  process.exitCode = failures ? 1 : 0;
}
