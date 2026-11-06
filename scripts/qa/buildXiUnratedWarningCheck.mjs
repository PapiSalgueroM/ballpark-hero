/* Remote-only physical controls for the actual Build Your XI page warning.
   Original and every fault retain the same 14 owned cases. No hook or data edits. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert(process.env.CI, 'Remote qualification only');
const PAGE = 'src/pages/LineupBuilder.tsx';
const HELP = 'src/components/lineup/LineupHowToPlay.tsx';
const TEST = 'src/test/buildXiUnratedWarning.test.tsx';
const PINS = {
  "src/pages/LineupBuilder.tsx": "dcd727d53ed3f31b38e0c3db1849af3ba09f03b6",
  "src/components/lineup/LineupHowToPlay.tsx": "822253fa89294287a26348935e6616b0c350870b",
  "src/data/gameContent/soccer2.ts": "b85cf0ba452a35c967937d1e200b1402fef528e7",
  "src/hooks/useLineupBuilder.ts": "d6ecb6bd9ca7e15d328957294c60126b1d02f1d8",
  "src/test/buildXiUnratedWarning.test.tsx": "7ce7e0a2d713dd8b5bf6169995520f284fad6417",
  "src/test/buildXiClubYear.test.tsx": "370c09cc786e5a568e79aafa05aaa93a72ca4bb6",
  "src/test/buildXiClubYearSetup.test.tsx": "617c17689c5131612b6a9c2627529c1912afe7d4"
};
const TITLES = {
  "value": "XI_RECORD_WARNING_VALUE names every unusable value before admission",
  "age": "XI_RECORD_WARNING_AGE names every unusable age before admission",
  "both": "XI_RECORD_WARNING_BOTH names both missing inputs and the unrated consequence",
  "cancel": "XI_RECORD_WARNING_CANCEL returns to the live input without admitting the record",
  "escape": "XI_RECORD_WARNING_ESCAPE discards the choice and restores search focus",
  "confirm": "XI_RECORD_WARNING_CONFIRM_ONCE forwards exact original metadata once",
  "complete": "XI_RECORD_WARNING_COMPLETE preserves immediate complete picks including finite age zero and negative age",
  "mixed": "XI_RECORD_WARNING_MIXED preserves immediate Mixed selection without numeric inputs",
  "slot": "XI_RECORD_WARNING_SLOT discards a candidate when the selected slot changes",
  "team": "XI_RECORD_WARNING_TEAM discards a candidate when the assigned club changes",
  "year": "XI_RECORD_WARNING_YEAR discards a candidate when the recorded year changes",
  "reset": "XI_RECORD_WARNING_RESET does not revive a candidate after reset and return to an equal origin",
  "input": "XI_RECORD_WARNING_INPUT does not confirm a choice after the input revision changes",
  "help": "XI_RECORD_WARNING_HELP reopens the warning choices and a fictional worked example"
};
const FAULTS = [
  {
    "name": "warning-bypass",
    "failed": [
      "value",
      "age",
      "both",
      "cancel",
      "escape",
      "confirm",
      "slot",
      "team",
      "year",
      "reset",
      "input"
    ],
    "edits": [
      [
        "    if (recordedYear !== null && (missingValue || missingAge)) {",
        "    if (false) {"
      ]
    ]
  },
  {
    "name": "overgate",
    "failed": [
      "complete",
      "mixed"
    ],
    "edits": [
      [
        "    if (recordedYear !== null && (missingValue || missingAge)) {",
        "    if (recordedYear !== null || missingValue || missingAge) {"
      ]
    ]
  },
  {
    "name": "null-only-numeric",
    "failed": [
      "value",
      "age"
    ],
    "edits": [
      [
        "    const missingValue = typeof value !== 'number' || !Number.isFinite(value) || value <= 0;\n    const missingAge = typeof age !== 'number' || !Number.isFinite(age);",
        "    const missingValue = value === undefined || value === null;\n    const missingAge = age === undefined || age === null;"
      ]
    ]
  },
  {
    "name": "rendered-pending",
    "failed": [
      "confirm"
    ],
    "edits": [
      [
        "    const pending = pendingRecordedPickRef.current;",
        "    const pending = pendingRecordedPick;"
      ]
    ]
  },
  {
    "name": "omit-context-invalidation",
    "failed": [
      "slot",
      "team",
      "year",
      "reset"
    ],
    "edits": [
      [
        "  useEffect(() => {\n    if (pendingRecordedPickRef.current?.origin !== undefined\n      && pendingRecordedPickRef.current.origin !== currentRecordedPickOrigin) clearRecordedPick();\n  }, [currentRecordedPickOrigin, clearRecordedPick]);",
        "  useEffect(() => {}, [currentRecordedPickOrigin, clearRecordedPick]);"
      ]
    ]
  },
  {
    "name": "omit-input-invalidation",
    "failed": [
      "input"
    ],
    "edits": [
      [
        "onChange={value => { clearRecordedPick(); inputRevision.current += 1; setBrowsingPlayers(false); setPlayerInput(value); }}",
        "onChange={value => { setBrowsingPlayers(false); setPlayerInput(value); }}"
      ]
    ]
  },
  {
    "name": "wrong-close-focus",
    "failed": [
      "cancel",
      "escape"
    ],
    "edits": [
      [
        "          <AlertDialogContent className=\"max-h-[85vh] overflow-y-auto\" onCloseAutoFocus={event => {\n            event.preventDefault();\n            inputOwner.current?.querySelector('input')?.focus({ preventScroll: true });\n          }}>",
        "          <AlertDialogContent className=\"max-h-[85vh] overflow-y-auto\" onCloseAutoFocus={event => {\n            event.preventDefault();\n            inputOwner.current?.querySelector('input')?.blur();\n          }}>"
      ]
    ]
  },
  {
    "name": "fabricated-metadata",
    "failed": [
      "confirm"
    ],
    "edits": [
      [
        "    void handleSelectPlayer(pending.entity);",
        "    void handleSelectPlayer({ ...pending.entity, meta: { ...pending.entity.meta, value: 1, age: 27 } });"
      ]
    ]
  }
];
const keys = Object.keys(TITLES);
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = value => {
  const body = Buffer.from(value);
  return createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + body.length + '\0'), body])).digest('hex');
};
const capturePins = () => Object.fromEntries(Object.keys(PINS).map(file => {
  const body = fs.readFileSync(file);
  return [file, { blob: blob(body), sha256: sha(body), bytes: body.length }];
}));
const requirePins = actual => {
  for (const [file, pin] of Object.entries(PINS)) assert.equal(actual[file].blob, pin, 'Exact held input: ' + file);
};
const before = capturePins();
requirePins(before);
const fixedPage = fs.readFileSync(PAGE, 'utf8');
const fixedHelp = fs.readFileSync(HELP, 'utf8');
const requiredPath = name => {
  const value = process.env[name];
  assert(value && path.isAbsolute(value), name + ' must name an absolute file');
  return value;
};
const originalPage = fs.readFileSync(requiredPath('XI_RECORD_WARNING_ORIGINAL_PAGE'), 'utf8');
const originalHelp = fs.readFileSync(requiredPath('XI_RECORD_WARNING_ORIGINAL_HELP'), 'utf8');
assert.equal(blob(originalPage), 'acb60c5c9f8a4d45a2b33b71b0beda0062570592', 'Exact original page');
assert.equal(blob(originalHelp), 'a4b77d3ac376273c837e5c5d80f2d1c30d3f78c7', 'Exact original help');
const OUT = requiredPath('XI_RECORD_WARNING_CONTROL_OUT');
assert(!fs.existsSync(OUT), 'Fresh output directory required');
fs.mkdirSync(OUT, { recursive: true });
const save = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
save('pins-before.json', before);
const receipt = {
  version: 1, scope: 'Actual page and shared picker/search conversion with controlled hook snapshots. No real sports data, hook admission, natural draft, RNG or full-result claim.',
  pins: PINS, originalPins: { page: blob(originalPage), help: blob(originalHelp) }, expectedCasesPerArm: 14,
  arms: [],
};
const stripAnsi = value => value.replace(/\u001b\[[0-9;]*m/g, '');
const sorted = values => [...values].sort();
const replaceOnce = (source, anchor, replacement, name) => {
  assert.equal(source.split(anchor).length - 1, 1, name + ': unique actual source anchor');
  assert.notEqual(anchor, replacement, name + ': distinct replacement');
  const changed = source.replace(anchor, replacement);
  assert.notEqual(blob(changed), blob(source), name + ': changed actual source');
  return changed;
};
function run(name, page, help, expectedKeys, edits = []) {
  assert.equal(new Set(expectedKeys).size, expectedKeys.length, name + ': unique expected failures');
  for (const key of expectedKeys) assert(key in TITLES, name + ': known expected title');
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(PAGE, page);
  fs.writeFileSync(HELP, help);
  const actualPage = fs.readFileSync(PAGE, 'utf8'), actualHelp = fs.readFileSync(HELP, 'utf8');
  assert.equal(actualPage, page, name + ': actual physical page bytes');
  assert.equal(actualHelp, help, name + ': actual physical help bytes');
  for (const [file, pin] of Object.entries(PINS)) {
    if (file !== PAGE && file !== HELP) assert.equal(blob(fs.readFileSync(file)), pin, name + ': held input ' + file);
  }
  const source = { page: { blob: blob(page), sha256: sha(page) }, help: { blob: blob(help), sha256: sha(help) } };
  if (name !== 'fixed' && name !== 'restored') assert(source.page.blob !== PINS[PAGE] || source.help.blob !== PINS[HELP], name + ': fault physically changed source');
  const output = path.join(dir, 'units.json'), rawPath = path.join(dir, 'raw.json');
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', XI_RECORD_WARNING_RAW: rawPath };
  delete env.NO_DOUBLE_SWAP;
  const child = spawnSync(process.execPath, [
    'node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=default', '--reporter=json', '--outputFile=' + output,
  ], { env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  assert.equal(blob(fs.readFileSync(PAGE)), source.page.blob, name + ': physical page held during child');
  assert.equal(blob(fs.readFileSync(HELP)), source.help.blob, name + ': physical help held during child');
  for (const [file, pin] of Object.entries(PINS)) {
    if (file !== PAGE && file !== HELP) assert.equal(blob(fs.readFileSync(file)), pin, name + ': held input after child ' + file);
  }
  assert(fs.existsSync(output), name + ': actual reporter JSON retained');
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  const cases = report.testResults.flatMap(suite => suite.assertionResults);
  const failed = cases.filter(row => row.status === 'failed');
  const arm = { name, source, edits, status: child.status, signal: child.signal, error: child.error?.message,
    expectedFailures: expectedKeys.map(key => TITLES[key]), cases };
  receipt.arms.push(arm);
  save('receipt.json', receipt);
  assert.equal(child.signal, null, name + ': no termination signal');
  assert.equal(child.error, undefined, name + ': no launcher error');
  assert.equal(report.numTotalTests, 14, name + ': exact reporter census');
  assert.equal(cases.length, 14, name + ': actual assertion rows');
  assert.deepEqual(sorted(cases.map(row => row.title)), sorted(Object.values(TITLES)), name + ': all exact case titles');
  assert(cases.every(row => row.status === 'passed' || row.status === 'failed'), name + ': no pending or skipped cases');
  assert.equal(report.numPassedTests, 14 - expectedKeys.length, name + ': actual passed census');
  assert.equal(report.numFailedTests, expectedKeys.length, name + ': actual failed census');
  assert.equal(report.numPendingTests ?? 0, 0, name + ': no pending tests');
  assert.equal(report.numTodoTests ?? 0, 0, name + ': no todo tests');
  assert.equal(report.numRuntimeErrorTestSuites ?? 0, 0, name + ': no runtime error suites');
  assert.deepEqual(sorted(failed.map(row => row.title)), sorted(expectedKeys.map(key => TITLES[key])), name + ': exact failed-title set');
  assert.equal(child.status, expectedKeys.length ? 1 : 0, name + ': actual child exit');
  const consoleText = stripAnsi((child.stdout || '') + (child.stderr || ''));
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|Cannot find module|Transform failed with|SyntaxError:|ReferenceError:|TypeError:/.test(consoleText), name + ': no runtime/setup banners');
  for (const row of cases) {
    if (row.status === 'passed') assert.equal(row.failureMessages.length, 0, name + ': passed row has no failure');
    else {
      assert.equal(row.failureMessages.length, 1, name + ': single business assertion');
      const message = stripAnsi(row.failureMessages[0]);
      assert(message.startsWith('AssertionError: ' + row.title.split(' ')[0]), name + ': exact owned AssertionError marker');
    }
  }
  assert(fs.existsSync(rawPath), name + ': full actual RAW retained');
  const rawBytes = fs.readFileSync(rawPath), raw = JSON.parse(rawBytes);
  assert.equal(raw.version, 1, name + ': RAW version');
  assert.deepEqual(raw.caseTitles, Object.values(TITLES), name + ': RAW exact declared census');
  assert.deepEqual(sorted(Object.keys(raw.cases)), sorted(keys), name + ': every case captured');
  for (const key of keys) {
    const item = raw.cases[key];
    assert.equal(item.title, TITLES[key], name + ': exact RAW title');
    assert(item.frames.length > 0, name + ': actual captured frames');
    for (const frame of item.frames) {
      for (const field of ['rows', 'origin', 'filled', 'filledCount', 'body', 'html', 'dialogs', 'inputs', 'focus', 'scroll', 'calls', 'transport', 'storage'])
        assert(Object.hasOwn(frame, field), name + ': full RAW frame field ' + field);
      assert.equal(frame.transport.other.length, 0, name + ': no undeclared transport');
      assert(frame.transport.search.every(query => query.table === 'player_market_values'), name + ': fictional market search only');
    }
  }
  assert.equal(raw.cases.value.frames.length, 14, name + ': all seven value edges captured before aggregate assertion');
  assert.equal(raw.cases.age.frames.length, 10, name + ': all five age edges captured before aggregate assertion');
  arm.raw = { sha256: sha(rawBytes), bytes: rawBytes.length, cases: keys.length,
    frames: Object.fromEntries(keys.map(key => [key, raw.cases[key].frames.length])) };
  save('receipt.json', receipt);
  console.log('XI_RECORD_WARNING_ARM ' + JSON.stringify({ name, passed: report.numPassedTests, failed: failed.length, failures: failed.map(row => row.title), raw: arm.raw }));
}
try {
  run('fixed', fixedPage, fixedHelp, []);
  run('original-page-help', originalPage, originalHelp, keys.filter(key => key !== 'complete' && key !== 'mixed'));
  for (const fault of FAULTS) {
    let changed = fixedPage;
    const edits = fault.edits.map(([anchor, replacement]) => {
      const previous = changed;
      changed = replaceOnce(changed, anchor, replacement, fault.name);
      return { anchor, replacement, beforeBlob: blob(previous), afterBlob: blob(changed) };
    });
    run(fault.name, changed, fixedHelp, fault.failed, edits);
  }
  run('restored', fixedPage, fixedHelp, []);
  assert.equal(receipt.arms.length, 11, 'All eleven arms ran');
  assert.equal(receipt.arms.reduce((total, arm) => total + arm.cases.length, 0), 154, 'All 154 actual rows');
  receipt.complete = true;
  save('receipt.json', receipt);
} catch (error) {
  fs.writeFileSync(path.join(OUT, 'controller-error.txt'), String(error.stack || error) + '\n');
  throw error;
} finally {
  fs.writeFileSync(PAGE, fixedPage);
  fs.writeFileSync(HELP, fixedHelp);
  const after = capturePins();
  save('pins-after.json', after);
  assert.deepEqual(after, before, 'Exact source/test/hook/guide restoration');
  requirePins(after);
  console.log('XI_RECORD_WARNING_SOURCE_RESTORED ' + JSON.stringify(after));
}
