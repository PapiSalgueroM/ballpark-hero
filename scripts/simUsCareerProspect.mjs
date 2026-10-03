/* Round 993: actual career boards carry a played, saved prospect journey
   into the constructor and first professional season. Every source control
   must fail four named outcomes while four legacy saves remain unchanged.
   US_CAREER_PROSPECT_CONTROL=before|save|restore|handoff|duplicate|choice|invalid|showcase|undrafted|archive|corrupt|back|rules|historical|outcome */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.US_CAREER_PROSPECT_CONTROL || '';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const ENGINE = 'src/lib/careerPreDraft.ts';
const QUIET = 'quiet legacy restore preserves the existing career unchanged';
const JOURNEY = 'plays every saved prospect stage into the earned career and first season';
const CHOICE = 'choices apply the displayed consequences and reject invalid options';
const SHOWCASE = 'rules reopen and showcase approaches pay their displayed stock moves';
const HISTORICAL = 'historical completed outcomes survive reload and remain the career archive';
const entry = '{ ...outcome, pot: state.pot, health: outcome.devSeasons.length ? 100 : state.health, prospect: state }';
const controls = {
  save: { file: BOARD, from: "localStorage.setItem(sport.saveKey, JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: next } satisfies SaveShape));", to: 'void sport.saveKey;', test: JOURNEY },
  restore: { file: BOARD, from: 'const pending = loadUsCareerProspect(sport, s.prospect);', to: 'const pending = null;', test: JOURNEY },
  handoff: { file: BOARD, from: entry, to: 'undefined', test: JOURNEY },
  duplicate: { file: BOARD, from: 'if (!prospect || prospectRef.current !== prospect || next === prospect.state) return;', to: 'if (!prospect) return;', test: 'accepts each same-frame journey action only once' },
  choice: { file: ENGINE, from: 's.stock += e.stock ?? 0;', to: 's.stock += 0;', test: CHOICE },
  invalid: { file: ENGINE, from: 'if (!card || !option || !Number.isInteger(optionIndex)) return prev;', to: 'if (!card || !option || !Number.isInteger(optionIndex)) return { ...prev };', test: CHOICE },
  showcase: { file: ENGINE, from: 'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[approach][grade]);\n    s.stock += move;', to: 'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[approach][grade]);\n    s.stock += 0;', test: SHOWCASE },
  undrafted: { file: BOARD, from: entry, to: entry.replace('...outcome,', '...outcome, pick: outcome.pick ?? 1,'), test: 'an actual undrafted outcome becomes a camp signing without top-pick rewards' },
  archive: { file: BOARD, from: 'const campNote = sport.campBattle(c, teamQuality, Math.random);', to: 'delete c.prospect;\n    const campNote = sport.campBattle(c, teamQuality, Math.random);', test: JOURNEY },
  corrupt: { file: 'src/lib/usCareerProspect.ts', from: 'const state = loadPreDraft(p.state, desc);', to: 'const state = p.state;', test: 'rejects corrupt nested journey saves without changing storage' },
  outcome: { file: ENGINE, from: "if (s.phase === 'done' && s.draft) {", to: 'if (false) {', test: 'rejects corrupt nested journey saves without changing storage' },
  back: { file: BOARD, from: "prospectRef.current = null; setProspect(null); setPhase('create');\n      localStorage.removeItem(sport.saveKey);", to: "prospectRef.current = null; setProspect(null); setPhase('create');", test: 'back before route selection preserves the player and clears only the unfinished save' },
  rules: { file: 'src/components/us-career/ProspectJourney.tsx', from: 'The button shows the exact change before you choose.', to: 'Pick whatever you want.', test: SHOWCASE },
};
assert(!CONTROL || CONTROL === 'before' || CONTROL === 'historical' || controls[CONTROL], `Unknown prospect control: ${CONTROL}`);
const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-prospect993-'));
const swaps = {}, owned = [];
let folder;
if (CONTROL) {
  fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
  folder = fs.mkdtempSync(path.join(ROOT, '.sim-control', 'prospect993-'));
  process.once('exit', () => {
    for (const copy of owned) fs.rmSync(copy, { force: true });
    fs.rmdirSync(folder);
  });
}
function writeControl(file, source) {
  fs.writeFileSync(path.join(evidence, path.basename(file)), source);
  // Relocating a source copy must preserve its local imports and CSS module.
  const runnable = source.replace(/((?:from\s*|import\s*)['"])(\.[^'"]+)(['"])/g, (_, open, spec, close) => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    assert(target.startsWith('src/'), `Control import leaves src: ${target}`);
    return `${open}@/${target.slice(4)}${close}`;
  });
  const copy = path.join(folder, path.basename(file));
  fs.writeFileSync(copy, runnable); owned.push(copy);
  swaps[`@/${file.slice(4).replace(/\.tsx?$/, '')}`] = copy.replaceAll('\\', '/');
}
if (CONTROL === 'before') {
  const source = execFileSync('git', ['show', `57a2de2f:${BOARD}`], { cwd: ROOT, encoding: 'utf8' });
  assert(source.includes('data-career-practice') && !source.includes('Play your road to the draft'), 'Physical before must retain 992 but predate the prospect entry');
  writeControl(BOARD, source);
} else if (CONTROL === 'historical') {
  const file = 'src/lib/usCareerProspect.ts';
  const source = execFileSync('git', ['show', `8f72dbc4:${file}`], { cwd: ROOT, encoding: 'utf8' });
  assert(source.includes('JSON.stringify(state.draft) !== JSON.stringify(expected)'), 'Historical control must restore the actual replay-dependent reader');
  assert.notEqual(source.replaceAll('\r\n', '\n'), fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n'));
  writeControl(file, source);
} else if (CONTROL) {
  const control = controls[CONTROL];
  const source = fs.readFileSync(path.join(ROOT, control.file), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(source.split(control.from).length - 1, 1, `${CONTROL} must change one executable anchor`);
  const changed = source.replace(control.from, control.to);
  assert.notEqual(changed, source, `${CONTROL} changed nothing`);
  writeControl(control.file, changed);
}
const require = createRequire(path.join(ROOT, 'package.json'));
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const report = path.join(evidence, 'report.json');
const args = [vitest, 'run', 'src/test/usCareerProspect.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', `--outputFile=${report}`];
const named = CONTROL === 'before' ? JOURNEY : CONTROL === 'historical' ? HISTORICAL : controls[CONTROL]?.test;
if (named) args.push('-t', `${named}|${QUIET}`);
const env = { ...process.env, NO_COLOR: '1' };
for (const key of ['FORCE_COLOR', 'NO_DOUBLE_SWAP', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE']) delete env[key];
if (CONTROL) env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
const run = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 12 * 1024 * 1024 });
const output = `${run.stdout || ''}\n${run.stderr || ''}`;
fs.writeFileSync(path.join(evidence, 'output.log'), output);
console.log(`Prospect evidence: ${evidence}`);
if (run.error || (!CONTROL && run.status !== 0)) console.error(output.slice(-16000));
assert(!run.error && !run.signal, 'Prospect runner must finish normally');
assert(fs.existsSync(report), 'Prospect runner produced no outcome report');
const results = JSON.parse(fs.readFileSync(report, 'utf8'));
for (const file of results.testResults) if (file.status === 'failed' && !file.assertionResults.length) console.error(file.message);
const tests = results.testResults.flatMap(file => file.assertionResults);
const failed = tests.filter(t => t.status === 'failed'), passed = tests.filter(t => t.status === 'passed');
const title = test => test.title.replace(/^'(NFL|NBA|MLB|NHL)' /, '$1 ');
const labels = ['NFL', 'NBA', 'MLB', 'NHL'];
assert.equal(results.numRuntimeErrorTestSuites ?? 0, 0, 'Runtime errors are not outcome evidence');
assert.equal(results.numUnhandledErrors ?? 0, 0, 'Unhandled errors are not outcome evidence');
if (!CONTROL) {
  for (const test of failed) console.error(`${test.fullName}\n${test.failureMessages.join('\n')}`.slice(0, 6000));
  assert.equal(run.status, 0, `Prospect failures: ${failed.map(t => t.fullName).join('; ')}`);
  assert.equal(failed.length, 0);
  assert.equal(passed.length, 36, 'All 36 actual-board prospect outcomes must run');
  for (const label of labels) {
    assert.equal(passed.filter(t => title(t).startsWith(`${label} `)).length, 9, `${label} outcomes missing`);
    console.log(`   ${label}: 9 actual-board outcomes passed, including saved phases, historical outcomes, earned draft handoff and the first pro season`);
  }
  console.log('simUsCareerProspect: 36 actual-board outcomes passed across all four sports');
} else {
  assert.equal(run.status, 1, `${CONTROL} must fail assertions, never stall or fail loading`);
  assert.equal(failed.length, 4, `${CONTROL} must fail exactly four named outcomes`);
  assert.equal(passed.length, 4, `${CONTROL} must retain four independent legacy restores`);
  for (const label of labels) {
    assert(failed.some(t => title(t) === `${label} ${named}`), `${CONTROL}: missing ${label} named failure`);
    assert(passed.some(t => title(t) === `${label} ${QUIET}`), `${CONTROL}: missing ${label} quiet baseline`);
  }
  assert(failed.every(t => t.failureMessages.some(m => /AssertionError|TestingLibraryElementError|expect\(/.test(m))
    && !t.failureMessages.some(m => /timed out|Failed to resolve|Cannot find module|ReferenceError|TypeError|unhandled/i.test(m))), 'Controls must produce assertions, never exceptions or deadlines');
  console.log(`simUsCareerProspect control ${CONTROL}: 4 named assertion failures and 4 independent legacy passes`);
}
