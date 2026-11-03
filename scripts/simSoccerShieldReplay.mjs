import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BINDING = 'src/lib/season/soccer.ts', ENGINE = 'src/lib/soccerCareerEngine.ts';
const GROUPS = [
  {
    "file": "src/test/soccerCommunityShieldReplay.test.ts",
    "suite": "Soccer Career Shield annual league replay",
    "titles": [
      "SC_SHIELD_REPLAY_ANNUAL: keeps the exact annual key and complete league reconstruction",
      "SC_SHIELD_REPLAY_GRADE: uses the recorded annual grade when the opener changes the rounded mean",
      "SC_SHIELD_REPLAY_LEGACY: keeps a valid selected legacy cup readable without inventing league proof",
      "SC_SHIELD_REPLAY_UNSELECTED: preserves no-opener and unselected season keys and whole plans",
      "SC_SHIELD_REPLAY_PROOF: refuses malformed proof and keeps a selected zero-annual-app opener separate"
    ]
  },
  {
    "file": "src/test/soccerCommunityShieldAnnualRating.test.ts",
    "suite": "Soccer Career Community Shield annual rating capture",
    "titles": [
      "SC_SHIELD_ANNUAL_RATING_NORMAL: records the exact annual grade before the normal opening merge",
      "SC_SHIELD_ANNUAL_RATING_SEVERE: records the exact annual grade before the severe opening merge"
    ]
  },
  {
    "file": "src/test/soccerCommunityShieldLegacyReplay.test.tsx",
    "suite": "Community Shield legacy league replay boundary",
    "titles": [
      "SC_SHIELD_LEGACY_VISIBLE: keeps the old saved cup inspectable while refusing unproved league games"
    ]
  }
];
const BINDING_EDITS = [
  {
    "label": "shared strict annual reader",
    "before": "import type { WorldSeason } from '../soccerPhone';",
    "after": "import type { WorldSeason } from '../soccerPhone';\nimport { careerOpeningAnnualStats } from '../soccerCareerExtraCups';"
  },
  {
    "label": "exact old annual replay key",
    "before": "  return row.type === 'playing' && row.apps > 0\n    ? `${playerName}|${row.club}|${row.year}|${row.apps}|${row.goals}|${row.assists}|${row.rating}|centre`\n    : null;",
    "after": "  const annual = careerOpeningAnnualStats(row);\n  return row.type === 'playing' && annual && annual.apps > 0\n    ? `${playerName}|${row.club}|${row.year}|${annual.apps}|${annual.goals}|${annual.assists}|${annual.rating}|centre`\n    : null;"
  },
  {
    "label": "missing proof cannot derive league",
    "before": "  availability: (row, ctx) => {",
    "after": "  availability: (row, ctx) => {\n    const annual = careerOpeningAnnualStats(row);\n    if (!annual) return { played: 0, block: 0, severe: false };"
  },
  {
    "label": "annual appearance capacity",
    "before": "    const want = Math.min(row.leagueApps ?? row.apps, room, row.apps);\n    const played = Math.min(Math.max(want, fixedPlayed), room, row.apps);",
    "after": "    const want = Math.min(row.leagueApps ?? annual.apps, room, annual.apps);\n    const played = Math.min(Math.max(want, fixedPlayed), room, annual.apps);"
  },
  {
    "label": "annual league and generic cup totals",
    "before": "  totals: (row, ctx): StatTotal[] => [\n    { key: 'goals', kind: 'sum', total: row.goals, perGameCap: ctx.position === 'GK' ? 0 : 4, teamFor: true, ...(ctx.goldenBoot ? { noBucket: true } : {}) },\n    { key: 'assists', kind: 'sum', total: row.assists, perGameCap: 3, teamFor: true },\n    { key: 'rating', kind: 'mean', mean: row.rating, dp: 1, perGame: 0.1, min: 3, max: 10 },\n    ...(ctx.keepsSheets ? [{ key: 'cs', kind: 'count-of' as const, total: row.cleanSheets, when: 'shutout' as const }] : []),\n    { key: 'yellow', kind: 'sum', total: row.yellowCards, perGameCap: 1, distinct: 'card' },\n    { key: 'red', kind: 'sum', total: row.redCards, perGameCap: 1, distinct: 'card', suspends: true },\n  ],\n  apps: row => row.apps,",
    "after": "  totals: (row, ctx): StatTotal[] => {\n    const annual = careerOpeningAnnualStats(row);\n    return annual ? [\n      { key: 'goals', kind: 'sum', total: annual.goals, perGameCap: ctx.position === 'GK' ? 0 : 4, teamFor: true, ...(ctx.goldenBoot ? { noBucket: true } : {}) },\n      { key: 'assists', kind: 'sum', total: annual.assists, perGameCap: 3, teamFor: true },\n      { key: 'rating', kind: 'mean', mean: annual.rating, dp: 1, perGame: 0.1, min: 3, max: 10 },\n      ...(ctx.keepsSheets ? [{ key: 'cs', kind: 'count-of' as const, total: annual.cleanSheets, when: 'shutout' as const }] : []),\n      { key: 'yellow', kind: 'sum', total: row.yellowCards, perGameCap: 1, distinct: 'card' },\n      { key: 'red', kind: 'sum', total: row.redCards, perGameCap: 1, distinct: 'card', suspends: true },\n    ] : [];\n  },\n  apps: row => careerOpeningAnnualStats(row)?.apps ?? 0,"
  }
];
const CLEAN = ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'SC_EXTRA_CUPS_ENGINE',
  'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL', 'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD',
  'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE', 'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK',
  'TYCOON_LOADS_STADIUM_LIB', 'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL'];
const faults = [
  { id: 'old-replay-binding', file: 'binding', case: 'SC_SHIELD_REPLAY_ANNUAL', marker: 'SC_SHIELD_REPLAY_ANNUAL_KEY' },
  { id: 'omit-normal-grade', file: 'engine', case: 'SC_SHIELD_ANNUAL_RATING_NORMAL', marker: 'SC_SHIELD_ANNUAL_RATING_NORMAL_MISSING',
    before: '  if (shieldMatch?.player.apps === 1) shieldMatch.annualRating = season.apps > 0 ? season.rating : 0;\n', after: '' },
  { id: 'omit-severe-grade', file: 'engine', case: 'SC_SHIELD_ANNUAL_RATING_SEVERE', marker: 'SC_SHIELD_ANNUAL_RATING_SEVERE_MISSING',
    before: '      if (shieldMatch?.player.apps === 1) shieldMatch.annualRating = injuryRow.apps > 0 ? injuryRow.rating : 0;\n', after: '' },
];
const sha = value => createHash('sha256').update(value).digest('hex');
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const noComments = value => value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const unique = (text, value, label) => {
  const at = text.indexOf(value);
  assert.ok(at >= 0 && text.indexOf(value, at + value.length) < 0, 'Unique actual code: ' + label);
  assert.ok(noComments(text).includes(value), 'Anchor must occur in executed code: ' + label);
  return at;
};

async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_SHIELD_REPLAY_OUT ? path.resolve(process.env.SC_SHIELD_REPLAY_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-shield-replay-'));
  assert.notEqual(out, root); assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Fresh evidence directory');
  fs.mkdirSync(out, { recursive: true });
  const relative = value => path.relative(root, value).split(path.sep).join('/');
  const inputPaths = [BINDING, ENGINE, 'src/lib/soccerCareerExtraCups.ts', ...GROUPS.map(group => group.file),
    'src/lib/careerEras.ts', 'src/lib/keyedRng.ts', 'src/lib/soccerCareerLeagueWorld.ts', 'src/lib/soccerCareerLeague.ts',
    'src/lib/season/core.ts', 'src/test/fixtures/soccerSeasonCompetitions1173.ts', 'scripts/data/careerLeagueWorldSaves1100.json',
    'vitest.config.ts', 'src/test/setup.ts', 'package.json', 'package-lock.json', 'tsconfig.app.json',
    'scripts/lib/offlineTransport.cjs', relative(fileURLToPath(import.meta.url))];
  const held = new Map();
  for (const file of inputPaths) {
    const rawBytes = await fs.promises.readFile(path.join(root, file));
    held.set(file, Buffer.from(rawBytes));
  }
  function holds() {
    const values = [];
    for (const [file, expected] of held) {
      let actual;
      { const rawBytes = fs.readFileSync(path.join(root, file)); actual = Buffer.from(rawBytes); }
      assert.deepEqual(actual, expected, 'Actual input held: ' + file);
      values.push({ file, bytes: expected.length, sha256: sha(expected) });
    }
    return values;
  }
  json(path.join(out, 'source-before.json'), holds());
  const bindingText = fs.readFileSync(path.join(root, BINDING), 'utf8').replace(/\r\n/g, '\n');
  const engineText = fs.readFileSync(path.join(root, ENGINE), 'utf8').replace(/\r\n/g, '\n');
  function model(file, text, name) {
    const original = held.get(file), raw = original.toString('utf8');
    assert.deepEqual(Buffer.from(raw), original, 'UTF-8 roundtrip');
    assert.equal(text, raw.replace(/\r\n/g, '\n'), 'Actual normalized matching binds raw source');
    const ending = raw.includes('\r\n') ? '\r\n' : '\n', rest = raw.replace(/\r\n/g, '');
    assert.equal(rest.includes('\r'), false, 'No lone CR');
    if (ending === '\r\n') assert.equal(rest.includes('\n'), false, 'No mixed endings');
    const copy = path.join(path.dirname(path.join(root, file)), '__control_shield_replay_' + name + '_' + process.pid + '.ts');
    assert.equal(fs.existsSync(copy), false, 'Physical sibling copy must be absent');
    return { name, file, original, text, ending, copy, written: null,
      encode: normalized => Buffer.from(ending === '\r\n' ? normalized.replace(/\n/g, '\r\n') : normalized) };
  }
  const sources = { binding: model(BINDING, bindingText, 'binding'), engine: model(ENGINE, engineText, 'engine') };
  function copyBytes(source) {
    let actual;
    { const rawBytes = fs.readFileSync(source.copy); actual = Buffer.from(rawBytes); }
    return actual;
  }
  function put(source, body) {
    fs.writeFileSync(source.copy, body, { flag: source.written ? 'w' : 'wx' });
    source.written = Buffer.from(body);
    const actual = copyBytes(source);
    assert.deepEqual(actual, source.written, 'Physical copy readback');
  }
  function restoreCopies() {
    for (const source of Object.values(sources)) put(source, source.original);
  }
  const results = [], edits = [];
  let primary = null; const secondary = [];
  function run(name, fault = null, copies = false) {
    const env = { ...process.env, NODE_OPTIONS: '', SIM_NETWORK: 'offline' }; for (const key of CLEAN) delete env[key];
    if (copies) {
      env.US_BOARD_CONTROL_ALIAS = '@/lib/season/soccer'; env.US_BOARD_CONTROL_FILE = sources.binding.copy;
      env.SC_EXTRA_CUPS_ENGINE = pathToFileURL(sources.engine.copy).href;
    }
    env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport'); fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const reportFile = path.join(out, name + '.vitest.json');
    const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run', ...GROUPS.map(group => group.file), '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism',
      '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
    if (fault) args.push('--testNamePattern=' + fault.case + ':');
    json(path.join(out, name + '.argv.json'), [process.execPath, ...args]);
    const copyBefore = copies ? Object.fromEntries(Object.entries(sources).map(([id, source]) => [id, copyBytes(source)])) : null;
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 240000 });
    fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || ''); fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
    fs.writeFileSync(path.join(out, name + '.exit'), String(child.status) + '\n');
    json(path.join(out, name + '.process.json'), { status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message } : null });
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, fault ? 1 : 0);
    assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0, 'No child external transport');
    holds(); if (copies) for (const [id, source] of Object.entries(sources)) assert.deepEqual(copyBytes(source), copyBefore[id], 'Copy held during child');
    const reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
    const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(counters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
    const rawErrors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(rawErrors)) if (value !== null) { assert.ok(Array.isArray(value)); assert.equal(value.length, 0); }
    const raw = (child.stdout || '') + '\n' + (child.stderr || '');
    const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw)
      || Object.values(counters).some(value => typeof value === 'number' && value > 0) || Object.values(rawErrors).some(value => Array.isArray(value) && value.length > 0);
    assert.equal(detectedRuntimeError, false, 'Import/setup/runtime is never owned');
    assert.equal(report.success, !fault);
    for (const [key, value] of Object.entries({ numTotalTests: 8, numPassedTests: fault ? 0 : 8, numFailedTests: fault ? 1 : 0,
      numPendingTests: fault ? 7 : 0, numTodoTests: 0 })) assert.equal(report[key], value, key);
    assert.equal(report.testResults.length, 3);
    const identities = [];
    for (const group of GROUPS) {
      const found = report.testResults.filter(suite => relative(suite.name) === group.file); assert.equal(found.length, 1);
      const suite = found[0]; assert.equal(suite.message, ''); assert.equal(suite.assertionResults.length, group.titles.length);
      assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), group.titles.map(title => group.suite + ' ' + title).sort());
      for (const row of suite.assertionResults) {
        assert.deepEqual(row.ancestorTitles, [group.suite]); assert.equal(row.fullName, group.suite + ' ' + row.title);
        if (fault && row.title.startsWith(fault.case + ':')) {
          assert.equal(row.status, 'failed'); assert.equal(row.failureMessages.length, 1);
          const first = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();
          assert.equal(first?.startsWith('AssertionError: ' + fault.marker + ':'), true, 'Primary ownership: ' + fault.id);
        } else if (fault) { assert.ok(['pending', 'skipped'].includes(row.status)); assert.equal(row.failureMessages.length, 0); }
        else { assert.equal(row.status, 'passed'); assert.equal(row.failureMessages.length, 0); }
        identities.push({ file: group.file, fullName: row.fullName, status: row.status });
      }
    }
    assert.equal(sha(fs.readFileSync(reportFile)), sha(reportBytes), 'Raw report held');
    const result = { name, passed: fault ? 0 : 8, ownedFailures: fault ? 1 : 0, declaredUnselectedSkips: fault ? 7 : 0,
      executed: fault ? 1 : 8, rawExit: child.status, rawReportSha256: sha(reportBytes), counters, rawErrors, detectedRuntimeError,
      runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', identities };
    json(path.join(out, name + '.summary.json'), result); results.push(result);
  }
  try {
    run('current'); restoreCopies(); run('healthy-copies', null, true);
    for (const fault of faults) {
      const source = sources[fault.file]; let changedText = source.text, steps = [];
      if (fault.file === 'binding') {
        for (const edit of BINDING_EDITS.slice().reverse()) {
          const offset = unique(changedText, edit.after, edit.label);
          changedText = changedText.slice(0, offset) + edit.before + changedText.slice(offset + edit.after.length);
          steps.push({ offset, before: edit.after, after: edit.before, label: edit.label });
        }
        assert.equal(sha(Buffer.from(changedText)), 'fefc54713b21160cc76530c7e0288fe6f2786ac23d0f8e696219505bd4f82294', 'Exact original replay binding, not guessed physics');
      } else {
        const offset = unique(changedText, fault.before, fault.id);
        changedText = changedText.slice(0, offset) + fault.after + changedText.slice(offset + fault.before.length);
        steps.push({ offset, before: fault.before, after: fault.after, label: fault.id });
      }
      const changed = source.encode(changedText); assert.notEqual(sha(changed), sha(source.original), 'Physical control must change bytes');
      let inverseText = changedText;
      for (const step of steps.slice().reverse()) {
        assert.equal(inverseText.slice(step.offset, step.offset + step.after.length), step.after, 'Inverse at exact applied offset');
        inverseText = inverseText.slice(0, step.offset) + step.before + inverseText.slice(step.offset + step.after.length);
      }
      const inverse = source.encode(inverseText); assert.deepEqual(inverse, source.original, 'Whole raw source inverse');
      put(source, changed); fs.writeFileSync(path.join(out, fault.id + '.source.ts'), changed);
      run(fault.id, fault, true); restoreCopies();
      const receipt = { id: fault.id, source: source.file, primaryMarker: fault.marker, selectedCase: fault.case, steps,
        offsetUnits: 'UTF-16 normalized source', lineEnding: source.ending === '\r\n' ? 'CRLF' : 'LF',
        original: { bytes: source.original.length, sha256: sha(source.original) }, changed: { bytes: changed.length, sha256: sha(changed) },
        inverse: { bytes: inverse.length, sha256: sha(inverse) }, physicalRestoreSha256: sha(copyBytes(source)) };
      json(path.join(out, fault.id + '.edit.json'), receipt); edits.push(receipt);
    }
    run('restored-copies', null, true);
    const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures,
      declaredUnselectedSkips: sum.declaredUnselectedSkips + row.declaredUnselectedSkips, executed: sum.executed + row.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.equal(results.length, 6); assert.equal(edits.length, 3);
    assert.deepEqual(totals, { passed: 24, ownedFailures: 3, declaredUnselectedSkips: 21, executed: 27 });
    json(path.join(out, 'summary.json'), { schemaVersion: 1, scope: 'Eight annual replay/capture/legacy UI cases and three physical causal controls. No full suite, build, native browser or calibration credit.',
      children: 6, totals, physicalControls: 3, results });
  } catch (error) { primary = error; }
  finally {
    for (const source of Object.values(sources)) {
      try {
        if (fs.existsSync(source.copy)) { const actual = copyBytes(source); assert.deepEqual(actual, source.written, 'Only owned copy cleanup'); fs.unlinkSync(source.copy); }
      } catch (error) { secondary.push({ stage: 'copy-cleanup', file: source.file, name: error.name, message: error.message }); }
    }
    try { json(path.join(out, 'source-after.json'), holds()); } catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { json(path.join(out, 'receipt.json'), { complete: !primary && secondary.length === 0, completedChildren: results.length,
      removedSourceCopies: Object.values(sources).every(source => !fs.existsSync(source.copy)),
      primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary; assert.equal(secondary.length, 0, 'Cleanup and source custody');
  console.log('simSoccerShieldReplay: 6 children, 24 healthy, 3 primary-owned, 21 declared unselected, 27 executed');
}
await main();
