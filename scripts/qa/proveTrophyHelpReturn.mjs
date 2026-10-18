import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// Remote component proof only. Native route evidence is qualified separately.
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const component = 'src/components/soccer-career/TrophyCabinet.tsx';
const companion = 'src/components/soccer-career/CupRunLines.tsx';
const self = 'scripts/qa/proveTrophyHelpReturn.mjs';
const suites = [
  { file: 'src/test/trophyCabinet.test.tsx', groups: [
    ['Soccer Career trophy cabinet records', [
      'matches all seven actual career counters without counting awards or national history twice',
      'returns the actual winning rows newest first and leaves the source seasons untouched',
      'does not grant a win just because a losing season has a cup run, an award or a national winner',
      'keeps old flags without fabricating names or numbers missing from a saved row',
    ]],
    ['Soccer Career trophy cabinet panel', [
      'opens the recorded year and club, shows full season stats, then returns to the same win list',
      'uses the recorded continental competition and keeps national numbers separate from club totals',
      'reads a non-European club cup under its own saved name',
      'shows a saved domestic cup route and final without substituting season goals for cup goals',
      'keeps the saved loan parent instead of the player current club',
      'keeps help reopenable, returns to the picked win, and never changes the career record',
      'locks the page, keeps keyboard focus inside, and restores the opener and body styles on close',
      'closes by Escape, Back and the backdrop but keeps content clicks inside the panel',
    ]],
  ], sha256: '1a0b3611c497071c62d0ebc14fd3c51c41421ffc14e8874e8109d956ffa417c3' },
  { file: 'src/test/trophyCabinetCampaign.test.tsx', groups: [['recorded club trophy campaigns', [
    'shows every first-stage game and knockout leg in saved order with exact scores and player goals',
    'keeps away-goals, aggregate, extra-time goals and penalties separate from the saved match score',
    'separates season totals, campaign goals and goals in individual games',
    'reads a season-owned campaign instead of a newer campaign from another club',
    'uses the latest campaign only when its saved club and year match the selected old row',
    ...['unanchored', 'year', 'club', 'invalid', 'invalid-stage'].map(reason => `keeps ${reason} campaigns missing instead of inventing or borrowing games`),
    'keeps an old trophy flag without guessing a competition name or final',
    'shows both saved non-European final legs and the retained simulation note',
    'leaves a single neutral final without a forged home or away label',
    'marks missing penalty numbers and keeps invalid optional extra-time counts out of the display',
    'restores the original picked win and list scroll through detail and reopenable help',
    'keeps the full career bytes and saved row references unchanged through all cabinet actions',
    'does not fill in a final when a named anchored campaign kept no games',
    'leaves domestic trophy details on their existing saved cup route',
  ]]], sha256: 'ed10a7683c528cd37d73301f5d4d1f61abc769069012612ab0d70069b6cec34a' },
];
const faults = [
  'keeps help reopenable, returns to the picked win, and never changes the career record',
  'restores the original picked win and list scroll through detail and reopenable help',
  'keeps the full career bytes and saved row references unchanged through all cabinet actions',
];
const mode = process.argv[2], root = process.cwd(), out = process.env.TROPHY_HELP_OUT;
assert(['baseline', 'fixed'].includes(mode), 'Explicit baseline or fixed mode');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary runtime inherits the offline preload');
assert.equal(process.versions.node.split('.')[0], '24');
assert(out && path.isAbsolute(out) && fs.existsSync(out), 'Existing absolute artifact root');
assert(path.relative(root, out).split(path.sep).includes('..'), 'Evidence remains outside checkout');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) assert(!process.env[key], `No inherited control: ${key}`);
const unit = path.join(out, 'unit'), controlDir = path.join(root, 'src/test/__trophyHelpReturnControls');
assert(!fs.existsSync(unit) && !fs.existsSync(controlDir), 'Fresh exclusive evidence and control paths');
fs.mkdirSync(unit);
const sha = body => createHash('sha256').update(body).digest('hex');
const clean = text => text.replace(/\x1b\[[0-9;]*m/g, '');
const git = args => execFileSync('git', args, { encoding: 'utf8' });
const write = (file, body) => fs.writeFileSync(path.join(unit, file), typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + '\n', { flag: 'wx' });
function once(body, from, to) {
  assert.equal(body.split(from).length - 1, 1, 'Unique executable source anchor');
  const changed = body.replace(from, to); assert.notEqual(changed, body, 'Effective declared source change'); return changed;
}
function sourceMap() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => {
    const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: sha(body) };
  });
}
const report = { version: 1, mode, status: 'failed', qualified: false, scope: 'existing-component-suites-only', productQualified: false, base, cases: 30, arms: [], temporaryControlsRemoved: false };
const copies = [];
let initial, cleanStatus;
try {
  cleanStatus = git(['status', '--porcelain', '--untracked-files=all']); assert.equal(cleanStatus, '', 'Clean committed request before proof');
  const allowed = new Set([component, ...suites.map(row => row.file), self, 'scripts/qa/playTrophyHelpReturn.mjs', '.github/workflows/trophy-help-return.yml']);
  const changes = git(['diff', '--name-only', base, 'HEAD', '--', '.', ':!docs']).trim().split('\n').filter(Boolean);
  assert(changes.every(file => allowed.has(file)), 'All other non-document source equals the original base');
  const original = git(['show', `${base}:${component}`]), cup = git(['show', `${base}:${companion}`]);
  assert.equal(sha(original), 'a043b98d4868e83af0554dc63f1ea6e75621cea15c298b16a22d366bbc0e35af');
  assert.equal(sha(cup), 'f3bc3390dcf37ba5f094a7197a625c28b9f2c345bc89fcdce59df1f8caccea02');
  assert([...cup.matchAll(/from\s+['"]([^'"]+)['"]/g)].every(match => match[1].startsWith('@/')), 'The unchanged companion resolves all imports from the original source root');
  const oldCaption = '>Back to wins</button>', newCaption = ">{picked ? 'Back to season' : 'Back to wins'}</button>";
  const fixed = once(original, oldCaption, newCaption);
  assert.equal(once(fixed, newCaption, oldCaption), original, 'Whole caption inverse equals the original component');
  const source = fs.readFileSync(component, 'utf8');
  assert.equal(source, mode === 'baseline' ? original : fixed, 'Only the declared caption may change');
  assert.equal(fs.readFileSync(companion, 'utf8'), cup, 'Cup rendering companion remains whole original');
  const anchors = [
    ["    expect(view.getByText(/Example: a season with one league title/)).toBeVisible();\n", "    expect(view.container.querySelector('[data-trophy-help]')).not.toBeNull();\n"],
    ["    expect(view.getByText(/Example: 27 season goals can include 3 in this cup/)).toBeVisible();\n", "    open(view.container);\n    fireEvent.click(view.getByRole('button', { name: 'Trophy cabinet help' }));\n"],
  ];
  const oldLookup = "    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));";
  const newLookup = oldLookup.replace('Back to wins', 'Back to season');
  const bindings = { version: 1, mode, base, head: git(['rev-parse', 'HEAD']).trim(), changes, original: sha(original), fixed: sha(fixed), actual: sha(source), companion: sha(cup), suites: [] };
  write('original-TrophyCabinet.tsx', original); write('expected-fixed-TrophyCabinet.tsx', fixed); write('actual-TrophyCabinet.tsx', source); write('CupRunLines.tsx', cup);
  for (const [index, suite] of suites.entries()) {
    const before = git(['show', `${base}:${suite.file}`]); assert.equal(sha(before), suite.sha256, 'Frozen original suite body');
    let expected = before;
    for (const anchor of anchors[index]) expected = once(expected, anchor + oldLookup, anchor + newLookup);
    let inverse = expected;
    for (const anchor of [...anchors[index]].reverse()) inverse = once(inverse, anchor + newLookup, anchor + oldLookup);
    assert.equal(inverse, before, 'Whole two-role-lookup inverse, all existing assertions held');
    const actual = fs.readFileSync(suite.file, 'utf8'); assert.equal(actual, mode === 'baseline' ? before : expected, 'Only the two selected-context names may change per suite');
    const titles = suite.groups.flatMap(([group, names]) => names.map(title => ({ title, fullName: `${group} ${title}`, ancestorTitles: [group] })));
    assert.equal(titles.length, index === 0 ? 12 : 18);
    bindings.suites.push({ file: suite.file, original: sha(before), expectedFixed: sha(expected), actual: sha(actual), cases: titles });
    write(`original-${path.basename(suite.file)}`, before); write(`actual-${path.basename(suite.file)}`, actual);
  }
  initial = sourceMap(); write('source-before.json', initial); write('source-bindings.json', bindings);
  function held(name) { const actual = sourceMap(); write(`${name}/source-after.json`, actual); assert.deepEqual(actual, initial, `${name} every tracked body and member held`); }
  function run(name, control = false) {
    const folder = path.join(unit, name); fs.mkdirSync(folder);
    const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(folder, 'units.transport') };
    if (control) { env.US_BOARD_CONTROL_ALIAS = '@/components/soccer-career/TrophyCabinet'; env.US_BOARD_CONTROL_FILE = path.join(controlDir, 'TrophyCabinet.tsx'); }
    const args = ['node_modules/vitest/vitest.mjs', 'run', ...suites.map(row => row.file), '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', `--outputFile=${path.join(folder, 'vitest.json')}`];
    const child = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 360000, maxBuffer: 64 * 1024 * 1024 });
    write(`${name}/stdout.log`, child.stdout ?? ''); write(`${name}/stderr.log`, child.stderr ?? '');
    write(`${name}/process.json`, { command: process.execPath, args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, control });
    held(name);
    const copied = fs.existsSync(controlDir) ? fs.readdirSync(controlDir).sort().map(file => ({ file, bytes: fs.statSync(path.join(controlDir, file)).size, sha256: sha(fs.readFileSync(path.join(controlDir, file))) })) : [];
    write(`${name}/copies-after.json`, copied);
    if (copies.length) assert.deepEqual(copied, copies.map(row => ({ file: row.file, bytes: Buffer.byteLength(row.body), sha256: sha(row.body) })).sort((a, b) => a.file.localeCompare(b.file)), 'Exclusive control membership and whole bodies held');
    assert.ifError(child.error); assert.equal(child.signal, null, 'Child completed without timeout or signal');
    const output = clean(`${child.stdout ?? ''}\n${child.stderr ?? ''}`);
    assert(!/Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|(?:^|\n)(?:TypeError|ReferenceError|SyntaxError):|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND/i.test(output), 'No setup or unhandled runtime errors');
    assert.equal(child.status, control ? 1 : 0, 'Actual expected process exit');
    const json = JSON.parse(fs.readFileSync(path.join(folder, 'vitest.json'), 'utf8'));
    assert.equal(json.testResults.length, 2); assert.equal(json.numTotalTests, 30); assert.equal(json.numPassedTests, control ? 27 : 30); assert.equal(json.numFailedTests, control ? 3 : 0);
    assert.equal(json.numPendingTests, 0); assert.equal(json.numTodoTests, 0); assert.equal(json.success, !control);
    if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0);
    if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, []);
    const actualFailed = [];
    for (const binding of bindings.suites) {
      const matches = json.testResults.filter(row => row.name.replaceAll('\\', '/').endsWith('/' + binding.file)); assert.equal(matches.length, 1, 'Exactly one actual result per suite');
      const result = matches[0]; assert.equal(result.message, '', 'No suite setup failure'); assert.equal(result.status, control ? 'failed' : 'passed');
      assert.deepEqual(result.assertionResults.map(row => row.title), binding.cases.map(row => row.title), 'Exact ordered actual titles, including all five parameter rows');
      for (const [index, row] of result.assertionResults.entries()) {
        const expected = binding.cases[index]; assert.equal(row.fullName, expected.fullName); assert.deepEqual(row.ancestorTitles, expected.ancestorTitles);
        const failed = control && faults.includes(row.title); assert.equal(row.status, failed ? 'failed' : 'passed');
        assert.deepEqual(row.failureMessages.length, failed ? 1 : 0);
        if (failed) {
          const failure = clean(row.failureMessages[0]);
          assert(failure.startsWith('TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Back to season"'), 'Only the precise missing visible return-caption lookup fails');
          actualFailed.push(row.title);
        }
      }
    }
    assert.deepEqual(actualFailed.sort(), control ? [...faults].sort() : []);
    assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, 'No recorded outbound transport');
    const arm = { name, tests: 30, passed: control ? 27 : 30, failed: control ? 3 : 0, failedTitles: actualFailed, vitestSha256: sha(fs.readFileSync(path.join(folder, 'vitest.json'))), source: sha(source), control: control ? sha(original) : null };
    report.arms.push(arm); console.log(`${name}: ${arm.passed} pass, ${arm.failed} exact caption lookup faults`);
  }
  if (mode === 'baseline') run('baseline');
  else {
    run('normal'); fs.mkdirSync(controlDir);
    for (const [file, body] of [['TrophyCabinet.tsx', original], ['CupRunLines.tsx', cup]]) { fs.writeFileSync(path.join(controlDir, file), body, { flag: 'wx' }); copies.push({ file, body }); }
    assert.equal(once(source, newCaption, oldCaption), original, 'Effective caption-only removal control is whole original');
    write('control-original-TrophyCabinet.tsx', original); run('original-caption-control', true); run('restored');
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) {
  report.error = error.stack ?? String(error); process.exitCode = 1;
} finally {
  try {
    if (fs.existsSync(controlDir)) {
      assert.deepEqual(fs.readdirSync(controlDir).sort(), copies.map(row => row.file).sort(), 'Only complete owned control members may be removed');
      for (const row of copies) assert.equal(fs.readFileSync(path.join(controlDir, row.file), 'utf8'), row.body, 'Owned whole control body held before cleanup');
      for (const row of copies) fs.unlinkSync(path.join(controlDir, row.file)); fs.rmdirSync(controlDir);
    }
    report.temporaryControlsRemoved = !fs.existsSync(controlDir); assert(report.temporaryControlsRemoved);
    if (initial) { const after = sourceMap(); write('source-after.json', after); assert.deepEqual(after, initial, 'Every final tracked body held'); }
    if (cleanStatus !== undefined) assert.equal(git(['status', '--porcelain', '--untracked-files=all']), cleanStatus, 'Tracked and untracked checkout state restored');
  } catch (error) { report.status = 'failed'; report.qualified = false; report.cleanupError = error.stack ?? String(error); process.exitCode = 1; }
  write('report.json', report);
}
assert(report.qualified, report.error ?? report.cleanupError ?? 'Unit qualification failed');
