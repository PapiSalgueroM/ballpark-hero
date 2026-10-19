/* Round1429: actual Soccer Grid search discovery regression proof. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.SOCCER_GRID_SEARCH_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE));
const evidenceRoot = process.env.SOCCER_GRID_SEARCH_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-grid-search-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'));
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT)); fs.mkdirSync(OUT, { recursive: true });
const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const productFile = 'src/components/soccer-grid/SoccerGridSearch.tsx', testFile = 'src/test/soccerGridSearchDiscovery.test.tsx';
const ALIAS = '@/components/soccer-grid/SoccerGridSearch';
const TEST_SHA = '410176fc8d41f755a63b6d6bdc0c310e3056e8c50ad50bb5f7f8ff5599ccdb52';
const ORIGINAL_SHA = 'b466739d757ac2f3b15578e18e072d45baab87ed81d276c5ee12bf9ff624095d';
const ORIGINAL_ADMISSION = {"scope":"full-original-units-browser-native-pixels","head":"07255a1516b1c22ba8e8c2ee7024c48325d9c455","originalSourceSha256":"b466739d757ac2f3b15578e18e072d45baab87ed81d276c5ee12bf9ff624095d","testSha256":"410176fc8d41f755a63b6d6bdc0c310e3056e8c50ad50bb5f7f8ff5599ccdb52","commonSha256":"09282e0e27c6080824c66a5ce30b983ae933d19d102ad98acb7c2b10eee0f04e","featureSha256":"13caf4e2c40c84b4083d46727bf20b4d594dedb2dcf878d82462fcbd60700051","pixelSha256":"0b9d9347d57ad768eeec15e3c9a25f49e0904d4e6468e52379a1e72c85a4d0e1"};
const hash = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const source = Object.fromEntries(tracked.toString('utf8').split('\0').filter(Boolean).map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), TEST_SHA, 'The sixteen-case body is frozen');
const original = git(['show', BASE + ':' + productFile]).toString('utf8'); assert.equal(hash(original), ORIGINAL_SHA);
fs.writeFileSync(path.join(OUT, 'original-SoccerGridSearch.tsx'), original);
const fixed = fs.readFileSync(path.join(ROOT, productFile), 'utf8');
const heldFiles = [productFile, 'src/pages/SoccerGrid.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts',
  'src/lib/fetchCareerPlayers.ts', 'src/lib/fetchAllRows.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/lib/soccerGridDifficulty.ts',
  'src/types/soccerGrid.ts', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/smartSearch.ts',
  'src/components/soccer-grid/SoccerGridBoard.tsx', 'src/lib/gridRarity.ts', 'scripts/simSoccerGridLabels.mjs', 'scripts/simSoccerGridTiers.mjs', 'vitest.config.ts'];
const boundSource = heldFiles.map(file => {
  const before = git(['show', BASE + ':' + file]), actual = fs.readFileSync(path.join(ROOT, file));
  if (file !== productFile || MODE === 'baseline') assert(actual.equals(before), 'Whole original source held: ' + file);
  return { file, originalSha256: hash(before), actualSha256: hash(actual) };
});
const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three', 'Fixture Late Four'];
const titles = [...['fixture alex one', 'fixture oren two', '  fixture   plain three  '].map(query => 'shows the canonical name for ' + JSON.stringify(query)),
  'shows a matching pool arriving under an unchanged focused query', 'shows the actual parent career pool arriving after its focused query',
  'selects canonical accented spelling and retains visible-menu Escape recovery', 'keeps ordinary case-insensitive canonical selection',
  'keeps the eight-result cap and bounded arrow selection', 'keeps trimmed title-cased manual entry when no suggestion exists',
  'keeps disabled input and form submission inert', 'keeps further query editing as recovery after late pool delivery',
  'keeps actual parent unverified selection free of a counted guess', 'keeps the raw one-character query gate',
  'keeps all-whitespace queries empty and unable to submit', 'keeps Escape before held pool delivery closed', 'keeps completed150ms blur before held pool delivery closed'];
const declared = titles.map(title => 'Soccer Grid search discovery ' + title);
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
const testBody = fs.readFileSync(path.join(ROOT, testFile), 'utf8');
const equalityLines = new Map([13, 14].map(index => {
  const marker = index === 13 ? "    leaf(); query('   '); expect(visibleNames()).toEqual([]);" : "    expect(document.activeElement).toBe(input()); expect(input()).toHaveValue('Fixture Late'); expect(visibleNames()).toEqual([]);";
  const lines = testBody.split('\n').map((line, offset) => ({ line, number: offset + 1 })).filter(row => row.line.startsWith(marker));
  assert.equal(lines.length, 1, 'One actual frozen empty-menu assertion for case ' + index); return [index, lines[0].number];
}));
const summary = { version: 2, mode: MODE, status: 'failed', productQualified: false, fixedUnitProofPassed: false,
  scope: 'Actual Search and actual held parent/hook/Daily/loader with fictional IO. External copies only; no real data, backend, full-suite, physical browser or product-admission claim.',
  testSha256: TEST_SHA, originalAdmission: ORIGINAL_ADMISSION, boundSource, arms: [], controls: [], wholeInverse: null, modules: [] };
let TEMP;

function once(sourceBody, before, after) {
  assert.equal(sourceBody.split(before).length, 2, 'One exact executable source anchor');
  const changed = sourceBody.replace(before, after); assert.notEqual(changed, sourceBody, 'Each source mutation changes its body'); return changed;
}
function refuse(sourceBody, before, after) {
  const altered = before.replace(/\S/, '#'); assert.notEqual(altered, before);
  for (const candidate of [sourceBody.replace(before, ''), sourceBody.replace(before, altered), sourceBody + '\n' + before]) {
    assert.throws(() => once(candidate, before, after), /One exact executable source anchor/, 'Missing/altered/duplicate target refused');
  }
}
function moduleCopy(name, body) {
  const imports = [...body.matchAll(/^import .+ from (['"])([^'"]+)\1;$/gm)];
  assert.equal(imports.length, body.split('\n').filter(line => line.startsWith('import ')).length, 'Every actual import has the supported one-line shape');
  const relativeImports = []; let emitted = body;
  for (const match of imports.filter(row => row[2].startsWith('.'))) {
    const target = path.resolve(ROOT, path.dirname(productFile), match[2]);
    const matches = [target, target + '.ts', target + '.tsx', target + '.js'].filter(file => fs.existsSync(file) && fs.statSync(file).isFile());
    assert.equal(matches.length, 1, 'A relative import resolves to exactly one actual source file');
    const relative = path.relative(path.join(ROOT, 'src'), matches[0]); assert(!relative.startsWith('..') && !path.isAbsolute(relative));
    const alias = '@/' + relative.replace(/\.(?:tsx?|js)$/, '').split(path.sep).join('/');
    const replacement = match[0].replace(match[2], alias); emitted = once(emitted, match[0], replacement);
    relativeImports.push({ original: match[2], resolved: matches[0], rebound: alias });
  }
  assert(![...emitted.matchAll(/^import .+ from (['"])([^'"]+)\1;$/gm)].some(match => match[2].startsWith('.')), 'No unresolved relative import in the external module');
  const retained = name + '.tsx', emittedName = name + '-module.tsx';
  fs.writeFileSync(path.join(OUT, retained), body); fs.writeFileSync(path.join(OUT, emittedName), emitted);
  const file = path.join(TEMP, emittedName); fs.writeFileSync(file, emitted);
  summary.modules.push({ name, sourceFile: retained, sourceSha256: hash(body), emittedFile: emittedName, emittedSha256: hash(emitted), relativeImports });
  return { [ALIAS]: file };
}
function control(name, mutations) {
  let changed = fixed;
  for (const mutation of mutations) { refuse(changed, mutation.before, mutation.after); changed = once(changed, mutation.before, mutation.after); }
  let restored = changed;
  for (const mutation of [...mutations].reverse()) restored = once(restored, mutation.after, mutation.before);
  assert.equal(restored, fixed, 'Control inverse restores entire fixed Search');
  summary.controls.push({ name, fixedSha256: hash(fixed), changedSha256: hash(changed), recoveredSha256: hash(restored), mutations, refusals: ['missing', 'altered', 'duplicate'] });
  return { changed: moduleCopy(name, changed), restored: moduleCopy(name + '-restored', restored) };
}
function run(name, faults = [], swaps = {}, bare = false) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  const receipt = path.join(dir, 'transport.transport'), rawFile = path.join(dir, 'vitest.json');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt, SOCCER_GRID_SEARCH_TRACE_DIR: dir };
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...swaps });
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + rawFile],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  fs.writeFileSync(path.join(dir, 'exit-code.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, faults.length ? 1 : 0);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')), 'No unhandled output credit');
  const result = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.equal(result.success, faults.length === 0); assert.equal(result.testResults.length, 1); assert.equal(result.numTotalTests, 16);
  assert.equal(result.numPassedTests, 16 - faults.length); assert.equal(result.numFailedTests, faults.length); assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0); assert.equal(result.numRuntimeErrorTestSuites || 0, 0);
  if (result.numUnhandledErrors !== undefined) assert.equal(result.numUnhandledErrors, 0); if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  const cases = result.testResults.flatMap(file => file.assertionResults); assert.deepEqual(cases.map(row => row.fullName).sort(), [...declared].sort());
  const failures = cases.filter(row => row.status === 'failed'); assert.deepEqual(failures.map(row => row.fullName).sort(), faults.map(index => declared[index]).sort());
  for (const row of cases) {
    assert(['passed', 'failed'].includes(row.status)); if (row.status === 'passed') { assert.deepEqual(row.failureMessages, []); continue; }
    const index = declared.indexOf(row.fullName); assert.equal(row.failureMessages.length, 1);
    const message = row.failureMessages[0]; assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(message));
    if (index <= 4) {
      const purpose = index < 3 ? 'Normalized queries must show the matching canonical name' : index === 3 ? 'Matching names must appear when the focused pool arrives' : 'The actual page must show its delivered pool for the focused query';
      assert(message.startsWith('AssertionError: ' + purpose + ':'), 'Exact intended original comparison/arrival assertion');
    } else {
      assert([13, 14].includes(index)); assert(/^AssertionError: expected [\s\S]*? to deeply equal \[\]\r?\n/.test(message), 'Only the frozen empty-menu deep-equality assertion');
      assert(message.includes(testFile + ':' + equalityLines.get(index) + ':'), 'Exact frozen empty-menu assertion line, not setup or cleanup');
    }
  }
  const trace = JSON.parse(fs.readFileSync(path.join(dir, 'trace.json'), 'utf8')); assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name).sort(), [...titles].sort());
  const expectedQueries = ['fixture alex one', 'fixture oren two', '  fixture   plain three  ', 'Fixture Late', 'Fixture Late', '', '', '', '', names[2], 'Fixture Late F', null, 'F', '   ', 'Fixture Late', 'Fixture Late'];
  for (let index = 0; index < titles.length; index++) {
    const rows = trace.cases.filter(row => row.name === titles[index]); assert.equal(rows.length, 1); const row = rows[0];
    assert.equal(row.pendingBeforeCleanup, 0); assert.equal(row.pendingAfterCleanup, 0); assert.equal(row.query, expectedQueries[index]);
    const selected = index === 5 ? [names[0]] : index === 6 ? [names[2]] : index === 7 ? ['Fixture Cap 6'] : index === 8 ? ['Fixture Missing Entry'] : [];
    assert.deepEqual(row.selected, selected, 'Exact canonical/manual callback');
    let visible = index < 3 && !faults.includes(index) ? [names[index]] : [3, 4, 10].includes(index) && !faults.includes(index) ? [names[3]] : index === 9 ? [names[2]] : [];
    if (index === 13 && faults.includes(13)) visible = [...names]; if (index === 14 && faults.includes(14)) visible = [names[3]];
    assert.deepEqual(row.visibleNames, visible, 'Exact control-specific visible names, including narrow guard faults');
    if ([0, 1, 2, 3, 4, 10, 12, 13, 14].includes(index)) assert.equal(row.focused, true, 'The unchanged active input retains focus');
    if (index === 15) assert.equal(row.focused, false, 'Completed blur stays blurred');
    assert.deepEqual(row.tables.map(entry => entry.table), [4, 11].includes(index) ? ['soccer_grid_puzzles', 'career_players', 'career_seasons'] : []);
    assert.deepEqual(row.invoked, index === 11 ? [['soccer-grid-validate', { body: { playerName: names[2], rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' } }]] : []);
  }
  assert.equal(fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8') : '', '');
  summary.arms.push({ name, bare, passed: 16 - faults.length, failed: faults.length, pending: 0, faults, failures: failures.map(row => ({ name: row.fullName, messages: row.failureMessages })), traceSha256: hash(fs.readFileSync(path.join(dir, 'trace.json'))) });
  console.log(name + ':16 finished,' + faults.length + ' precise intended faults,0 held IO.'); return trace;
}

const oldSuggestions = "  const suggestions = query.length >= 2\n    ? players\n        .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))\n        .slice(0, 8)\n    : [];\n";
const newSuggestions = "  const normalizedQuery = normalizeName(query);\n  const suggestions = query.length >= 2 && normalizedQuery.length > 0\n    ? players\n        .filter(p => normalizeName(p.name).includes(normalizedQuery))\n        .slice(0, 8)\n    : [];\n";
const oldEffect = "  useEffect(() => {\n    setHighlightIndex(0);\n    setShowDropdown(suggestions.length > 0);\n  }, [query]);\n";
const newEffect = "  useEffect(() => {\n    setHighlightIndex(0);\n    setShowDropdown(query.length >= 2);\n  }, [query]);\n";
const oldKeys = "  const handleKeyDown = (e: React.KeyboardEvent) => {\n    if (!showDropdown || suggestions.length === 0) return;\n    if (e.key === 'ArrowDown') {\n      e.preventDefault();\n      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));\n    } else if (e.key === 'ArrowUp') {\n      e.preventDefault();\n      setHighlightIndex(i => Math.max(i - 1, 0));\n    } else if (e.key === 'Escape') {\n      setShowDropdown(false);\n    }\n  };\n";
const newKeys = "  const handleKeyDown = (e: React.KeyboardEvent) => {\n    if (e.key === 'Escape') {\n      setShowDropdown(false);\n      return;\n    }\n    if (!showDropdown || suggestions.length === 0) return;\n    if (e.key === 'ArrowDown') {\n      e.preventDefault();\n      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));\n    } else if (e.key === 'ArrowUp') {\n      e.preventDefault();\n      setHighlightIndex(i => Math.max(i - 1, 0));\n    }\n  };\n";
const hunks = [
  { name: 'shared normalization import', original: "import { toTitleCase } from '@/lib/smartSearch';\nimport { FlagImg } from '@/components/FlagImg';\n\n", fixed: "import { toTitleCase } from '@/lib/smartSearch';\nimport { foldSpecialLatin } from '@/lib/nameFold';\nimport { FlagImg } from '@/components/FlagImg';\n\nconst DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');\nconst FORMAT_CHARS = /\\p{Cf}/gu;\n\nfunction normalizeName(s: string | null | undefined): string {\n  return foldSpecialLatin(\n    (s ?? '')\n      .replace(FORMAT_CHARS, '')\n      .normalize('NFD')\n      .replace(DIACRITICS, '')\n      .toLowerCase()\n      .trim()\n      .replace(/\\s+/g, ' '),\n  );\n}\n\n" },
  { name: 'normalized comparison and nonempty guard', original: oldSuggestions, fixed: newSuggestions },
  { name: 'query open intent', original: oldEffect, fixed: newEffect },
  { name: 'Escape before empty results', original: oldKeys, fixed: newKeys },
  { name: 'focus open intent', original: '          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}\n', fixed: '          onFocus={() => query.length >= 2 && setShowDropdown(true)}\n' },
];

try {
  if (MODE === 'baseline') {
    assert.equal(fixed, original); const normal = run('normal', [0, 1, 2, 3, 4]), bare = run('bare', [0, 1, 2, 3, 4], {}, true); assert.deepEqual(normal, bare);
  } else {
    assert(ORIGINAL_ADMISSION, 'Fixed qualification refused until full actual original unit/browser/native/pixel admission');
    assert.equal(ORIGINAL_ADMISSION.scope, 'full-original-units-browser-native-pixels'); assert(/^[0-9a-f]{40}$/.test(ORIGINAL_ADMISSION.head));
    assert.equal(ORIGINAL_ADMISSION.originalSourceSha256, ORIGINAL_SHA); assert.equal(ORIGINAL_ADMISSION.testSha256, TEST_SHA);
    for (const field of ['commonSha256', 'featureSha256', 'pixelSha256']) assert(/^[0-9a-f]{64}$/.test(ORIGINAL_ADMISSION[field]), 'Actual admitted receipt ' + field);
    TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-grid-search-modules-'));
    assert(path.relative(ROOT, TEMP).split(path.sep).includes('..'));
    let expected = original; for (const hunk of hunks) { refuse(expected, hunk.original, hunk.fixed); expected = once(expected, hunk.original, hunk.fixed); } assert.equal(expected, fixed, 'Only the exact reviewed five UI hunks differ');
    let recovered = fixed; for (const hunk of [...hunks].reverse()) recovered = once(recovered, hunk.fixed, hunk.original);
    assert.equal(recovered, original, 'Whole fixed-to-original inverse'); assert.equal(hash(recovered), ORIGINAL_SHA);
    summary.wholeInverse = { originalSha256: hash(original), fixedSha256: hash(fixed), recoveredSha256: hash(recovered), hunks };
    const originalCopy = moduleCopy('whole-original', recovered);
    const normal = run('normal'), bare = run('bare', [], {}, true); assert.deepEqual(normal, bare, 'Normal and bare actual traces match');
    run('original', [0, 1, 2, 3, 4], originalCopy);
    const normalization = control('normalization-control', [{ before: '        .filter(p => normalizeName(p.name).includes(normalizedQuery))\n', after: '        .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))\n' }]); run('normalization-control', [0, 1, 2], normalization.changed);
    const arrival = control('arrival-control', [{ before: newEffect, after: oldEffect }]); run('arrival-control', [3, 4], arrival.changed);
    const nonempty = control('nonempty-control', [{ before: '  const suggestions = query.length >= 2 && normalizedQuery.length > 0\n', after: '  const suggestions = query.length >= 2 && true\n' }]); run('nonempty-control', [13], nonempty.changed);
    const earlyEscape = "    if (e.key === 'Escape') {\n      setShowDropdown(false);\n      return;\n    }\n    if (!showDropdown || suggestions.length === 0) return;\n";
    const lateEscape = "    if (!showDropdown || suggestions.length === 0) return;\n    if (e.key === 'Escape') {\n      setShowDropdown(false);\n      return;\n    }\n";
    const escape = control('escape-control', [{ before: earlyEscape, after: lateEscape }]); run('escape-control', [14], escape.changed);
    const restored = run('restored', [], escape.restored); assert.deepEqual(restored, normal, 'Inverse-restored actual trace equals normal');
    summary.fixedUnitProofPassed = true;
  }
  summary.status = 'passed';
} finally {
  if (TEMP) fs.rmSync(TEMP, { recursive: true, force: true }); assert(!TEMP || !fs.existsSync(TEMP), 'Temporary modules removed');
  assert(tracked.equals(git(['ls-files', '-z'])), 'Tracked membership held');
  for (const [file, sha256] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), sha256, 'Tracked source held: ' + file);
  assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), TEST_SHA); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Status held');
  summary.sourceHeld = true; summary.temporaryModulesRemoved = true;
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
console.log(JSON.stringify({ kind: 'SOCCER_GRID_SEARCH_RESULT', mode: MODE, evidenceRoot,
  modeEnvAbsent: !Object.hasOwn(process.env, 'SOCCER_GRID_SEARCH_MODE'), outEnvAbsent: !Object.hasOwn(process.env, 'SOCCER_GRID_SEARCH_OUT'),
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: summary.sourceHeld,
  temporaryModulesRemoved: summary.temporaryModulesRemoved, productQualified: false }));
