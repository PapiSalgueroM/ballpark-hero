/* Round 886: actual career actions wait for confirmation, with executable copy controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/components/us-career/USCareerActionConfirm.tsx';
const test = 'src/test/usCareerActionConfirm.test.tsx';
const board = sport => `src/components/${sport.toLowerCase()}-my-career/${sport[0]}${sport.slice(1).toLowerCase()}MyCareerBoard.tsx`;
const sports = ['NFL', 'NBA', 'MLB', 'NHL'];
const boards = sports.map(board);
/* Round 900: the four boards are thin wrappers around one shared board plus a
   binding per sport. The wiring this harness mutates lives in the shared
   board now, so one edit there has to fail the same case in all four sports;
   a sport that stayed green would be a sport that is not on that board. */
const sharedBoard = 'src/components/us-career/UsCareerBoard.tsx';
const bindings = sports.map(sport => `src/lib/${sport.toLowerCase()}CareerSport.ts`);
const files = [component, test, sharedBoard, ...bindings, ...boards, 'src/hooks/useGameCompletion.ts', 'src/lib/restoredFinish.ts', ...sports.map(sport => `src/lib/${sport.toLowerCase()}MyCareer.ts`)];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const baselineTitle = sport => `'${sport}' preserves live restore and engine state as an independent baseline`;
const retirementTitle = sport => `'${sport}' keeps retirement pending until explicit acceptance and records its real legacy once`;
const restartTitle = sport => `'${sport}' keeps restart pending then deletes only its own career without another completion`;
const titles = {
  closed: 'keeps closed mounts callback quiet and unrelated payloads exact as an independent baseline',
  focus: action => `${action} starts on Cancel and returns both dismissal paths to its exact opener without scrolling`,
  duplicate: 'accepts two same-frame Confirm clicks once and rearms only after a new opening',
  unmount: 'unmounts an open prompt without accepting or erasing its caller save',
  keyboard: 'contains the explicit keyboard boundary events while Cancel spends nothing',
};
const actionTitles = sports.flatMap(sport => [retirementTitle(sport), restartTitle(sport)]);
const baselines = [...sports.map(baselineTitle), titles.closed];
const sharedTitles = [titles.focus('retire'), titles.focus('restart'), titles.duplicate, titles.unmount, titles.keyboard];
const cancelBlock = '          <AlertDialogCancel className="min-h-11 min-w-11">\n            {retiring ? \'Keep playing\' : \'Keep this career\'}\n          </AlertDialogCancel>';
const controls = {
  direct: [component, '<AlertDialogTrigger asChild ref={triggerRef}>', '<AlertDialogTrigger asChild ref={triggerRef} onClick={onConfirm}>', [...actionTitles, ...sharedTitles]],
  cancel: [component, '<AlertDialogCancel className="min-h-11 min-w-11">', '<AlertDialogCancel onClick={onConfirm} className="min-h-11 min-w-11">', [...actionTitles, titles.focus('retire'), titles.focus('restart')]],
  escape: [component, '        className="max-w-md"', '        className="max-w-md" onEscapeKeyDown={onConfirm}', [...actionTitles, titles.focus('retire'), titles.focus('restart')]],
  duplicate: [component, 'if (!open || acceptedRef.current) return;', 'if (!open) return;', [titles.duplicate]],
  rearm: [component, 'if (nextOpen) acceptedRef.current = false;', 'void nextOpen;', [titles.duplicate]],
  initial: [component, cancelBlock, cancelBlock.replace('<AlertDialogCancel ', '<button onClick={() => changeOpen(false)} ').replace('</AlertDialogCancel>', '</button>'), [titles.focus('retire'), titles.focus('restart'), titles.keyboard]],
  focus: [component, 'triggerRef.current.focus({ preventScroll: true });', 'triggerRef.current.focus();', [titles.focus('retire'), titles.focus('restart')]],
  unmount: [component, '          event.preventDefault();', '          event.preventDefault();\n          if (!triggerRef.current?.isConnected) onConfirm();', [titles.unmount]],
  retireWiring: [sharedBoard, '<USCareerActionConfirm action="retire" sport={sport.label} onConfirm={retireNow}>', '<USCareerActionConfirm action="retire" sport={sport.label} onConfirm={reset}>', sports.map(retirementTitle)],
  restartWiring: [sharedBoard, '<USCareerActionConfirm action="restart" sport={sport.label} onConfirm={reset}>', '<USCareerActionConfirm action="restart" sport={sport.label} onConfirm={retireNow}>', sports.map(restartTitle)],
  ownKey: [sharedBoard, 'localStorage.removeItem(sport.saveKey);', 'localStorage.clear();', sports.map(restartTitle)],
  legacy: [sharedBoard, 'useGameCompletion(sport.gameSlug, done, career ? sport.legacyOf(career).score : 0);', 'useGameCompletion(sport.gameSlug, done, career ? sport.legacyOf(career).score + 1 : 0);', sports.map(retirementTitle)],
};
const control = process.env.US_CAREER_ACTION_CONTROL || '';
assert.ok(!control || control in controls, 'Known career-confirmation control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  assert.equal(source.split(anchor).length - 1, 1, 'Control binds one actual executable expression');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const originalBytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Actual copied control binds once under CRLF');
  assert.deepEqual(crlfBytes, originalBytes, 'CRLF source bytes held');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/us-action886-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const [target, anchor, replacement] = controls[control], original = held.find(([file]) => file === target)[1].source;
    const changed = original.replace(anchor, replacement); assert.notEqual(changed, original, 'Control changes executable source');
    const copy = path.join(folder, path.basename(target)); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + target.slice(4).replace(/\.tsx$/, '')]: copy });
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 18);
  for (const baseline of baselines) assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Original engine/save/unrelated callback baseline held');
  assert.ok(rows.every(row => row.status === 'failed' || row.status === 'passed'), 'All eighteen cases execute');
  if (control) {
    const expected = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 18 - expected.length);
    assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError: Unable to find (?:an accessible element with the role|an element with the text:)/);
    console.log(`Career confirmation ${control}: one actual executable binding changed in an isolated source copy.`);
    console.log(`Career confirmation ${control}: ${expected.length} intended failures, ${18 - expected.length} independent passes, no skipped cases.`);
    console.log(`US_ACTION_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })) })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 18); assert.equal(report.numFailedTests, 0);
    console.log('Career confirmation:18/18 actual-board/shared-confirmation cases passed; no cases skipped.');
    console.log('Career confirmation: all four engine-made six-season saves stay byte-identical through prompt opening, Cancel and Escape.');
    console.log('Career confirmation: explicit retirement changes only the retired flag/phase, preserves the real legacy score once and reload cannot repay it.');
    console.log('Career confirmation: explicit restart deletes only its own key, leaves unrelated storage intact and reload returns to the actual draft screen without a completion.');
    console.log('Career confirmation: initial Cancel, exact opener preventScroll, explicit Tab boundaries, one same-frame acceptance/new-open rearming and unmount cleanup hold.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original board/component/test/completion/simulation engine bytes held');
  }
}
console.log('Career confirmation: CRLF controls bind, raw bytes held and owned copies cleaned. Simulated states/explicit events do not prove full-season gameplay or native Enter, viewport and keyboard defaults.');
