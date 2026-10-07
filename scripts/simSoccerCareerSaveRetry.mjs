/* Actual career writes, earned state, retries and independent restore with retained copied faults. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const page = 'src/pages/SoccerCareer.tsx', testFile = 'src/test/soccerCareerSaveRetry.test.tsx';
const cases = {
  initial: 'keeps the restored career and old bytes while showing a persistent save warning and one toast',
  repeat: 'keeps repeated refused retries visible without replaying progress or repeating the toast',
  training: 'retries the actually earned training result exactly once and restores it on the next mount',
  latest: 'retries the latest earned season after more than one failed career change without rerunning its engine',
  automatic: 'clears a failed save on the next successful automatic save and alerts again on a later refusal',
  reset: 'clears the old failure after explicit reset and saves the replacement career without old progress',
  retirement: 'persists the finished retirement on retry without recording its completion a second time',
  independent: 'retains an independent valid restore and earned engine baseline without mounting the page',
};
const controls = {
  warning: { from: '} catch { setSaveFailed(true); }', to: '} catch { setSaveFailed(false); }', test: cases.initial },
  memory: { from: '} catch { setSaveFailed(true); }', to: '} catch { setCareer(null); setSaveFailed(true); }', test: cases.initial },
  disk: { from: '} catch { setSaveFailed(true); }', to: '} catch { localStorage.removeItem(SAVE_KEY); setSaveFailed(true); }', test: cases.initial },
  toast: { from: 'if (saveFailed) toast.error(', to: 'if (false) toast.error(', test: cases.initial },
  repeatedToast: { from: '} catch { setSaveFailed(true); }', to: '} catch { toast.error("Save refused"); setSaveFailed(true); }', test: cases.repeat },
  stale: { from: 'localStorage.setItem(SAVE_KEY, JSON.stringify(career));', to: 'localStorage.setItem(SAVE_KEY, JSON.stringify(restoredSave.career));', test: cases.latest },
  staleCallback: { from: '  }, [career]);\n  useEffect(() => { saveCurrentCareer(); }, [saveCurrentCareer]);', to: '  }, []);\n  useEffect(() => { saveCurrentCareer(); }, [saveCurrentCareer]);', test: cases.training },
  automatic: { from: 'useEffect(() => { saveCurrentCareer(); }, [saveCurrentCareer]);', to: 'useEffect(() => {}, [saveCurrentCareer]);', test: cases.initial },
  retry: { from: 'onClick={saveCurrentCareer}>Retry save</Button>', to: 'onClick={() => {}}>Retry save</Button>', test: cases.training },
  retryRng: { from: 'onClick={saveCurrentCareer}>Retry save</Button>', to: 'onClick={() => { Math.random(); saveCurrentCareer(); }}>Retry save</Button>', test: cases.repeat },
  retryReplay: { from: 'onClick={saveCurrentCareer}>Retry save</Button>', to: 'onClick={() => { setCareer(advanceYouthYear(career!, clubs)); }}>Retry save</Button>', test: cases.latest },
  retryCompletion: { from: 'onClick={saveCurrentCareer}>Retry save</Button>', to: 'onClick={() => { recordCompletion("/soccer-career", legacyScore); saveCurrentCareer(); }}>Retry save</Button>', test: cases.retirement },
  clear: { from: 'localStorage.setItem(SAVE_KEY, JSON.stringify(career));\n      setSaveFailed(false);', to: 'localStorage.setItem(SAVE_KEY, JSON.stringify(career));\n      setSaveFailed(true);', test: cases.training },
  reset: { from: 'if (!career) { setSaveFailed(false); return; }', to: 'if (!career) { return; }', test: cases.reset },
  notice: { from: '<p className="flex-1">Your latest progress could not be saved. Keep this tab open, then try again.</p>', to: '<p className="flex-1">Saved.</p>', test: cases.initial },
  role: { from: 'role="alert" data-soccer-save-status="failed"', to: 'role="status" data-soccer-save-status="failed"', test: cases.initial },
};
const control = process.env.SOCCER_CAREER_SAVE_RETRY_CONTROL || '', count = Object.keys(cases).length;
assert(!control || control === 'all' || control in controls, 'Known career save retry fault');
const out = path.resolve(process.env.SOCCER_CAREER_SAVE_RETRY_ARTIFACTS || path.join(root, 'soccer-career-save-retry-artifacts/mounted'));
await mkdir(out, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, SOCCER_CAREER_SAVE_RETRY_CONTROL: name, SOCCER_CAREER_SAVE_RETRY_ARTIFACTS: out }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(out, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} career save retry ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simSoccerCareerSaveRetry')).join('\n') + '\n' : output.slice(-14000));
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(row => row.passed), 'All career save retry outcomes and effective faults pass');
  console.log(`simSoccerCareerSaveRetry all: ${count} actual outcomes and ${Object.keys(controls).length} effective faults passed.`);
  process.exit(0);
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const held = [page, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/components/soccer-career/TrainingPanel.tsx', 'src/hooks/usePracticeClock.ts', 'src/lib/careerDrills.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/test/soccerCareerSaveRecovery.test.tsx', 'scripts/simSoccerCareerSaveRecovery.mjs', testFile, 'scripts/simSoccerCareerSaveRetry.mjs'];
const before = {};
for (const file of held) { const bytes = await readFile(path.join(root, file)); before[file] = digest(bytes); }
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, `${control || 'normal'}-report.json`);
let folder, copy;
try {
  if (control) {
    const spec = controls[control], original = (await readFile(path.join(root, page), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(original.split(spec.from).length - 1, 1, 'Fault binds exactly one executable source anchor');
    const changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original, 'The copied fault changes actual source');
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/soccer-career-save-retry-'));
    copy = path.join(folder, 'SoccerCareer.tsx'); await writeFile(copy, changed);
    await writeFile(path.join(out, `${control}-SoccerCareer.tsx.txt`), changed);
    await writeFile(path.join(out, `${control}-mutation.json`), JSON.stringify({ control, file: page, from: spec.from, to: spec.to, anchorCount: 1, originalSha256: digest(original), changedSha256: digest(changed), test: spec.test }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/SoccerCareer': copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--testTimeout=120000', '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(out, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual career save retry runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime failures earn no fault credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, count - 2);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended?.status, 'failed');
    assert.match(intended.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, ''), /AssertionError:|Error: expect\((?:element|received)\)/, 'The mapped outcome fails an actual assertion');
    assert.equal(rows.find(row => row.title === cases.independent)?.status, 'passed');
    console.log(`simSoccerCareerSaveRetry ${control}: mapped save retry outcome rejected changed source; independent restore passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simSoccerCareerSaveRetry: ${count} actual outcomes passed.`);
  }
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = {};
  for (const file of held) { const bytes = await readFile(path.join(root, file)); after[file] = digest(bytes); }
  await writeFile(path.join(out, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, `All ${held.length} source files remain unchanged`);
}
