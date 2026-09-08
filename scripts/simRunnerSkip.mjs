/** Round 537: copied-runner skip protocol with synthetic local children only.
 * Exit 77 explicitly requests an unavailable-database skip. Ordinary failure
 * exits remain failures, even beside the old no-work phrase. Exit 0 retains
 * its existing sufficient-output PASS behavior; this is no network sandbox.
 * Exact source controls edit one checked anchor in an OS-temp runner copy.
 * Unexpected runner/load errors never earn passing-control credit.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = fs.readFileSync(path.join(ROOT, 'scripts/runAllSims.mjs'), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.SIM_RUNNER_SKIP_CONTROL || '';
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-runner-skip-'));
const failures = [], results = [];
let runner = original, success = false;
const marker = 'DATABASE UNREACHABLE. NOTHING WAS CHECKED.';
const child = (name, code, phrase = marker, fault = '') => ({ name, code, phrase, fault });
const cases = [
 { id: 'legacy1', children: [child('simAlpha', 1)], expected: ['FAIL'] },
 { id: 'legacy7', children: [child('simAlpha', 7)], expected: ['FAIL'] },
 { id: 'runtime', children: [child('simAlpha', 1, marker, 'runtime')], expected: ['FAIL'] },
 { id: 'partial', children: [child('simAlpha', 1, 'NOTHING WAS CHECKED FOR THOSE PROBES.', 'assertion')], expected: ['FAIL'] },
 { id: 'explicit77', children: [child('simAlpha', 77)], probe: 'intercepted', expected: ['SKIP'] },
 { id: 'reachable77', children: [child('simAlpha', 77)], probe: 'reachable', expected: ['FAIL'] },
 { id: 'unmarked77', children: [child('simAlpha', 77, 'Synthetic unavailable result without a skip marker')], expected: ['FAIL'] },
 { id: 'zero', children: [child('simAlpha', 0)], expected: ['PASS'] },
 { id: 'mixedgood', children: [child('simAlpha', 0, 'Synthetic checks passed'), child('simBeta', 77)], expected: ['PASS', 'SKIP'] },
 { id: 'mixedbad', children: [child('simAlpha', 0, 'Synthetic checks passed'), child('simBeta', 77), child('simGamma', 1, marker, 'assertion')], expected: ['PASS', 'SKIP', 'FAIL'] },
];
const controls = {
 code: ['legacy1', 'legacy7', 'runtime', 'partial', 'mixedbad'],
 retained: ['explicit77', 'mixedgood', 'mixedbad'],
 database: ['explicit77', 'reachable77', 'mixedgood', 'mixedbad'],
 phrase: ['unmarked77'],
 exit: ['legacy1', 'legacy7', 'runtime', 'partial', 'explicit77', 'reachable77', 'unmarked77', 'mixedgood', 'mixedbad'],
 count: ['explicit77', 'mixedgood'],
 runtime: [],
};
function replaceExact(from, to) {
  const matches = runner.split(from).length - 1;
  if (matches !== 1 || from === to) throw new Error(`${CONTROL}: expected one effective source anchor, found ${matches}`);
  runner = runner.replace(from, to);
  if (runner === original) throw new Error(`${CONTROL}: source control changed nothing`);
  console.log(`CONTROL ${CONTROL}: one exact runner source anchor changed in an OS-temp copy`);
}
function runFixture(spec) {
  const root = path.join(temp, spec.id), scripts = path.join(root, 'scripts'), receiptsPath = path.join(root, 'receipts.jsonl');
  fs.mkdirSync(scripts, { recursive: true });
  fs.mkdirSync(path.join(root, 'src/integrations/supabase'), { recursive: true });
  fs.writeFileSync(path.join(scripts, 'runAllSims.mjs'), runner);
  fs.writeFileSync(path.join(root, 'src/integrations/supabase/client.ts'), "export const SUPABASE_URL = 'https://runner-fixture.invalid';\nexport const SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-key';\n");
  const record = `import fs from 'node:fs';\nconst record = item => fs.appendFileSync(${JSON.stringify(receiptsPath)}, JSON.stringify(item) + '\\n');\n`;
  for (const fixture of spec.children) {
    fs.writeFileSync(path.join(scripts, `${fixture.name}.mjs`), `${record}
record({ type: 'child', name: ${JSON.stringify(fixture.name)} });
process.on('exit', code => record({ type: 'exit', name: ${JSON.stringify(fixture.name)}, code }));
console.log('Synthetic fixture started');
console.log('Synthetic fixture reached its outcome');
console.log('Synthetic fixture reports its status');
console.log(${JSON.stringify(fixture.phrase)});
${fixture.fault === 'runtime' ? "process.exitCode = 77; throw new Error('UNRELATED_SYNTHETIC_RUNTIME');" : fixture.fault === 'assertion' ? "console.error('FAIL: SYNTHETIC_REAL_ASSERTION'); process.exit(1);" : `process.exit(${fixture.code});`}
`);
  }
  const preload = path.join(root, 'preload.mjs');
  fs.writeFileSync(preload, `${record}
globalThis.fetch = async url => {
  record({ type: 'fetch', url: String(url) });
  if (String(url) !== 'https://runner-fixture.invalid/rest/v1/') throw new Error('Unexpected synthetic fetch target');
  return { ok: false, status: 403, text: async () => 'host not in allowlist, synthetic refusal' };
};
`);
  const env = { ...process.env, NODE_OPTIONS: '', ONLY: spec.children.map(item => item.name).join(','), NO_COLOR: '1' };
  for (const name of ['BROWSER', 'PORT', 'DB_PROBE']) delete env[name];
  if (spec.probe !== 'intercepted') env.DB_PROBE = spec.probe || 'unreachable';
  const run = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(scripts, 'runAllSims.mjs')], {
    cwd: root, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  fs.writeFileSync(path.join(root, 'output.log'), output);
  const receipts = fs.existsSync(receiptsPath) ? fs.readFileSync(receiptsPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  const starts = receipts.filter(item => item.type === 'child'), exits = receipts.filter(item => item.type === 'exit');
  const fetches = receipts.filter(item => item.type === 'fetch');
  // The fixture children themselves must really run and finish as specified.
  // A runner import crash, missing child or changed fixture outcome is not a control.
  if (run.error || run.signal || ![0, 1].includes(run.status)
    || starts.length !== spec.children.length || exits.length !== spec.children.length
    || spec.children.some(item => starts.filter(receipt => receipt.name === item.name).length !== 1
      || exits.filter(receipt => receipt.name === item.name && receipt.code === item.code).length !== 1)
    || fetches.length !== (spec.probe === 'intercepted' ? 1 : 0)
    || fetches.some(item => item.url !== 'https://runner-fixture.invalid/rest/v1/')) {
    throw new Error(`Unexpected fixture runtime/load/receipt result for ${spec.id}: ${run.error || run.signal || output}\n${JSON.stringify(receipts)}`);
  }
  const reported = [...output.matchAll(/^\s+(PASS|FAIL|EMPTY|SKIP)\s+(sim[A-Za-z]+\.mjs)\s+/gm)]
    .map(match => ({ verdict: match[1], file: match[2] }));
  const passes = spec.expected.filter(item => item === 'PASS').length;
  const skips = spec.expected.filter(item => item === 'SKIP').length;
  const failed = spec.expected.filter(item => item === 'FAIL').length;
  const tableMatches = reported.length === spec.children.length && spec.children.every((item, index) =>
    reported.filter(report => report.file === `${item.name}.mjs` && report.verdict === spec.expected[index]).length === 1);
  const skipNames = spec.children.filter((_, index) => spec.expected[index] === 'SKIP').map(item => item.name).join(', ');
  const skipLine = `${skips} harness${skips === 1 ? '' : 'es'} SKIPPED, not run and not counted: ${skipNames}.`;
  const summary = failed ? `${failed} harness${failed === 1 ? '' : 'es'} not green.`
    : `All ${passes} harnesses green${skips ? `, ${skips} skipped above` : ''}.`;
  const faultVisible = spec.children.every(item => !item.fault || output.includes(item.fault === 'runtime' ? 'UNRELATED_SYNTHETIC_RUNTIME' : 'SYNTHETIC_REAL_ASSERTION'));
  const okay = tableMatches && faultVisible && run.status === (failed ? 1 : 0)
    && (skips ? output.includes(skipLine) : !output.includes('SKIPPED, not run and not counted'))
    && output.trimEnd().endsWith(summary) && (!failed || !/All \d+ harnesses green/.test(output));
  if (!okay) failures.push(spec.id);
  results.push({ id: spec.id, exit: run.status, expected: spec.expected, reported, receipts, okay, output });
  console.log(`${okay ? 'PASS' : 'FAIL'} ${spec.id}: exit ${run.status}; children ${starts.length}; ${reported.map(item => `${item.file}:${item.verdict}`).join(', ')}`);
}
try {
  if (CONTROL && !Object.hasOwn(controls, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
  if (CONTROL === 'code') replaceExact("r.verdict === 'FAIL' && r.code === 77 && !db.ok && NOTHING_CHECKED.test(r.out)", "r.verdict === 'FAIL' && !db.ok && NOTHING_CHECKED.test(r.out)");
  if (CONTROL === 'retained') replaceExact('resolve({ file, verdict, why, ms, lines, out, code });', 'resolve({ file, verdict, why, ms, lines, out });');
  if (CONTROL === 'database') replaceExact("r.verdict === 'FAIL' && r.code === 77 && !db.ok && NOTHING_CHECKED.test(r.out)", "r.verdict === 'FAIL' && r.code === 77 && db.ok && NOTHING_CHECKED.test(r.out)");
  if (CONTROL === 'phrase') replaceExact("r.verdict === 'FAIL' && r.code === 77 && !db.ok && NOTHING_CHECKED.test(r.out)", "r.verdict === 'FAIL' && r.code === 77 && !db.ok");
  if (CONTROL === 'exit') replaceExact("let verdict = code === 0 ? 'PASS' : 'FAIL';", "let verdict = 'PASS';");
  if (CONTROL === 'count') replaceExact('nodeResults.length + (WANT_BROWSER ? browserGroup.length : 0) - skipped.length', 'nodeResults.length + (WANT_BROWSER ? browserGroup.length : 0)');
  if (CONTROL === 'runtime') replaceExact("const ROOT = path.resolve(HERE, '..');", "const ROOT = path.resolve(HERE, '..');\nthrow new Error('Synthetic unexpected runner runtime');");
  for (const spec of cases) runFixture(spec);
  if (CONTROL) {
    if (JSON.stringify([...failures].sort()) !== JSON.stringify([...controls[CONTROL]].sort()))
      throw new Error(`Wrong control failure map: expected ${controls[CONTROL].join(', ')}, got ${failures.join(', ') || 'none'}`);
    console.log(`PASS: ${failures.length} exact controlled behavioral failures; all other checks green`);
  } else {
    if (failures.length) throw new Error(`${failures.length} behavioral check(s) failed: ${failures.join(', ')}`);
    console.log(`PASS: ${results.length} copied-runner skip cases; only synthetic local children and intercepted fetch`);
  }
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-runner-skip-'))
    throw new Error('Refusing cleanup outside the unique runner-skip fixture directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary runner skip files cleaned');
}
if (!success) process.exitCode = 1;
