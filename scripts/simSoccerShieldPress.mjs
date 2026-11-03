import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SOURCE = 'src/lib/soccerCareerPress.ts', TEST = 'src/test/soccerShieldPress.test.ts';
const ORIGINAL_TEST = 'src/test/soccerPressRoomReadAsAbsent.test.tsx';
const SUITE = 'Shield contribution and strict annual Press promises';
const TITLES = [
  "SC_SHIELD_PRESS_ACTUAL a-ban-warning-31-2032: keeps the recorded annual promise readable",
  "SC_SHIELD_PRESS_ACTUAL a-ban-year-34-2027: keeps the recorded annual promise readable",
  "SC_SHIELD_PRESS_ACTUAL a-ban-year-35-2027: keeps the recorded annual promise readable",
  "SC_SHIELD_PRESS_ACTUAL a-ban-year-36-2028: keeps the recorded annual promise readable",
  "SC_SHIELD_PRESS_ACTUAL a-ban-year-36-2036: keeps the recorded annual promise readable",
  "SC_SHIELD_PRESS_GRADE: validates a changed final grade by the actual forward merge",
  "SC_SHIELD_PRESS_REJECT: refuses wrong annual claims and unknown or invalid opening records",
  "SC_SHIELD_PRESS_SOURCE: keeps new answer snapshots bound to the complete final row",
  "SC_SHIELD_PRESS_LEGACY: retains exact old and zero-contribution result validation"
];
const ORIGINAL_IDENTITIES = [
  "the journey of ruling C3 for the Press room: can natural play make the part unreadable every unreadable part on the fleet is the one known road, and the room is open again on the next playing screen",
  "pressRoom: a part that cannot be verified is read as absent the fixtures are honest: each undamaged part is readable and its season is answered",
  "pressRoom: a part that cannot be verified is read as absent THE ROAD natural play has, on the real engine: the Golden Boot Arithmetic deal rewrites a season that settled a promise",
  "pressRoom: a part that cannot be verified is read as absent a wrong shape: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent another version: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent null: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent a row whose season no longer matches: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent a settled promise whose settled row no longer matches (four goals added to it, as the one natural road does): it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent a wrong shape: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent another version: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent null: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent a row whose season no longer matches: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent a settled promise whose settled row no longer matches (four goals added to it, as the one natural road does): the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent a wrong shape: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent another version: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent null: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent a row whose season no longer matches: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent a settled promise whose settled row no longer matches (four goals added to it, as the one natural road does): a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent a pending promise in an unreadable part ends with no verdict, on the real engine too"
];
const ORIGINAL_EDITS = [
  {
    "before": "import type { CareerState, SeasonRecord } from './soccerCareerEngine';",
    "after": "import type { CareerState, SeasonRecord } from './soccerCareerEngine';\nimport { readCommunityShield, communityShieldSeasonStats } from './soccerCareerExtraCups';"
  },
  {
    "before": "        if (p.outcome !== outcomeFor(p, settled) || p.actual !== (recorded(settled[p.metric]) ?? undefined) || p.actualRating !== (rating(settled.rating) ? settled.rating : undefined)) return null;",
    "after": "        let annual = settled;\n        const shield = readCommunityShield(settled);\n        if (shield?.player.apps) {\n          const part = shield.player;\n          if (settled.apps <= part.apps || !rating(p.actualRating)) return null;\n          annual = { ...settled, apps: settled.apps - part.apps, goals: settled.goals - part.goals,\n            assists: settled.assists - part.assists, cleanSheets: settled.cleanSheets - part.cleanSheets, rating: p.actualRating };\n          if (communityShieldSeasonStats(annual, shield).rating !== settled.rating) return null;\n        }\n        if (p.outcome !== outcomeFor(p, annual) || p.actual !== (recorded(annual[p.metric]) ?? undefined) || p.actualRating !== (rating(annual.rating) ? annual.rating : undefined)) return null;"
  }
];
const CLEAN = ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'SC_EXTRA_CUPS_ENGINE',
  'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL', 'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD',
  'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE', 'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK',
  'TYCOON_LOADS_STADIUM_LIB', 'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL'];
const sha = body => createHash('sha256').update(body).digest('hex');
const git = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const faults = [
  { id: 'omit-forward-grade', pattern: 'SC_SHIELD_PRESS_REJECT:', marker: 'SC_SHIELD_PRESS_REJECT',
    before: '          if (communityShieldSeasonStats(annual, shield).rating !== settled.rating) return null;\n', after: '' },
  { id: 'trust-unverified-result', pattern: 'SC_SHIELD_PRESS_REJECT:', marker: 'SC_SHIELD_PRESS_REJECT',
    before: '        const shield = readCommunityShield(settled);',
    after: '        const shield = settled.extraCups?.[0] ?? null;' },
  { id: 'omit-positive-annual-apps', pattern: 'SC_SHIELD_PRESS_REJECT:', marker: 'SC_SHIELD_PRESS_REJECT',
    before: '          if (settled.apps <= part.apps || !rating(p.actualRating)) return null;',
    after: '          if (!rating(p.actualRating)) return null;' },
  { id: 'use-final-outcome', pattern: 'SC_SHIELD_PRESS_ACTUAL a-ban-year-36-2028:', marker: 'SC_SHIELD_PRESS_ACTUAL',
    before: 'p.outcome !== outcomeFor(p, annual)', after: 'p.outcome !== outcomeFor(p, settled)' },
  { id: 'project-answer-snapshot', pattern: 'SC_SHIELD_PRESS_SOURCE:', marker: 'SC_SHIELD_PRESS_SOURCE',
    before: 'row.apps === source.apps', after: '(row.apps - (readCommunityShield(row)?.player.apps ?? 0)) === source.apps' },
];
async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_SHIELD_PRESS_OUT ? path.resolve(process.env.SC_SHIELD_PRESS_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-shield-press-'));
  assert.notEqual(out, root); assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Evidence directory must be fresh');
  fs.mkdirSync(out, { recursive: true });
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const held = new Map();
  for (const file of [SOURCE, TEST, ORIGINAL_TEST, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerExtraCups.ts',
    'src/components/soccer-career/PressRoom.tsx', 'scripts/data/careerLeagueWorldSaves1100.json', 'src/test/setup.ts',
    'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.app.json', 'scripts/lib/offlineTransport.cjs',
    relative(fileURLToPath(import.meta.url))]) {
    const rawBytes = await fs.promises.readFile(path.join(root, file)); held.set(file, Buffer.from(rawBytes));
  }
  const holds = () => {
    const rows = [];
    for (const [file, bytes] of held) {
      const actual = fs.readFileSync(path.join(root, file)); assert.deepEqual(actual, bytes, 'Held actual input: ' + file);
      rows.push({ file, bytes: actual.length, sha256: sha(actual) });
    } return rows;
  };
  write(path.join(out, 'source-before.json'), holds());
  const original = held.get(SOURCE), rawText = original.toString('utf8');
  assert.deepEqual(Buffer.from(rawText), original, 'Actual source must round-trip as UTF-8');
  const ending = rawText.includes('\r\n') ? '\r\n' : '\n', withoutPairs = rawText.replace(/\r\n/g, '');
  assert.equal(withoutPairs.includes('\r'), false, 'Lone CR is refused');
  if (ending === '\r\n') assert.equal(withoutPairs.includes('\n'), false, 'Mixed source endings are refused');
  const text = fs.readFileSync(path.join(root, SOURCE), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(text, rawText.replace(/\r\n/g, '\n'), 'Actual normalized matching input binds raw source');
  const encode = value => Buffer.from(ending === '\r\n' ? value.replace(/\n/g, '\r\n') : value);
  let old = text;
  const oldEdits = [];
  for (const edit of [...ORIGINAL_EDITS].reverse()) {
    const offset = old.indexOf(edit.after); assert.ok(offset >= 0 && old.indexOf(edit.after, offset + 1) < 0, 'Unique old-source inverse anchor');
    old = old.slice(0, offset) + edit.before + old.slice(offset + edit.after.length);
    oldEdits.push({ offset, before: edit.after, after: edit.before });
  }
  assert.equal(sha(Buffer.from(old)), '196441a89d900140c05aeb9671f72e6b454cfd75eafd0264eb81083765b0fcff');
  assert.equal(git(Buffer.from(old)), '6a1b88e7797e79835dcfb9195051898dcb4444f5');
  let inverse = old;
  for (const edit of [...oldEdits].reverse()) {
    assert.equal(inverse.slice(edit.offset, edit.offset + edit.after.length), edit.after);
    inverse = inverse.slice(0, edit.offset) + edit.before + inverse.slice(edit.offset + edit.after.length);
  }
  assert.deepEqual(encode(inverse), original, 'Complete old-source inverse restores actual bytes');
  const copy = path.join(root, 'src/lib/__control_shield_press_promise_' + process.pid + '.ts');
  assert.equal(fs.existsSync(copy), false, 'Owned source copy must be absent');
  const results = [], controls = [];
  let written = null, primary = null; const secondary = [];
  function put(bytes) { fs.writeFileSync(copy, bytes, { flag: written ? 'w' : 'wx' }); written = Buffer.from(bytes); assert.deepEqual(fs.readFileSync(copy), written); }
  function run(name, kind, fault = null) {
    const useCopy = kind !== 'ordinary', isOld = kind === 'old', isFault = kind === 'fault';
    const total = kind === 'ordinary' ? 28 : 9, failures = isOld ? 8 : isFault ? 1 : 0;
    const passed = isOld ? 1 : isFault ? 0 : total, skipped = isFault ? 8 : 0;
    const env = { ...process.env, NODE_OPTIONS: '', SIM_NETWORK: 'offline' }; for (const key of CLEAN) delete env[key];
    if (useCopy) { env.US_BOARD_CONTROL_ALIAS = '@/lib/soccerCareerPress'; env.US_BOARD_CONTROL_FILE = copy; }
    env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport'); fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const reportFile = path.join(out, name + '.vitest.json'); assert.equal(fs.existsSync(reportFile), false);
    const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run', ...(kind === 'ordinary' ? [ORIGINAL_TEST, TEST] : [TEST]), '--maxWorkers=1', '--minWorkers=1',
      '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
    if (fault) args.push('--testNamePattern=' + fault.pattern);
    write(path.join(out, name + '.argv.json'), [process.execPath, ...args]);
    const copyBefore = useCopy ? fs.readFileSync(copy) : null;
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
    fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '', { flag: 'wx' });
    fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '', { flag: 'wx' });
    fs.writeFileSync(path.join(out, name + '.exit'), String(child.status) + '\n', { flag: 'wx' });
    write(path.join(out, name + '.process.json'), { status: child.status, signal: child.signal,
      error: child.error ? { name: child.error.name, message: child.error.message } : null });
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, failures ? 1 : 0);
    assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0); holds();
    if (useCopy) assert.deepEqual(fs.readFileSync(copy), copyBefore, 'Copied source held throughout child');
    const reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
    const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
    const rawErrors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(counters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
    for (const value of Object.values(rawErrors)) if (value !== null) { assert.ok(Array.isArray(value)); assert.equal(value.length, 0); }
    const raw = (child.stdout || '') + '\n' + (child.stderr || '');
    const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw);
    assert.equal(detectedRuntimeError, false, 'Setup/runtime errors never own a promise control');
    assert.equal(report.success, failures === 0);
    for (const [key, value] of Object.entries({ numTotalTests: total, numPassedTests: passed, numFailedTests: failures,
      numPendingTests: skipped, numTodoTests: 0 })) assert.equal(report[key], value, key);
    assert.equal(report.testResults.length, kind === 'ordinary' ? 2 : 1);
    const files = report.testResults.map(suite => relative(suite.name)).sort();
    assert.deepEqual(files, (kind === 'ordinary' ? [ORIGINAL_TEST, TEST] : [TEST]).sort());
    const identities = [];
    for (const suite of report.testResults) {
      const file = relative(suite.name), originalSuite = file === ORIGINAL_TEST;
      assert.equal(suite.message, ''); assert.equal(suite.status, originalSuite || !failures ? 'passed' : 'failed');
      const expected = originalSuite ? ORIGINAL_IDENTITIES : TITLES.map(title => SUITE + ' ' + title);
      assert.equal(suite.assertionResults.length, expected.length);
      assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), [...expected].sort());
      for (const row of suite.assertionResults) {
        if (!originalSuite) { assert.deepEqual(row.ancestorTitles, [SUITE]); assert.equal(row.fullName, SUITE + ' ' + row.title); }
        const oldFailure = isOld && !row.title.startsWith('SC_SHIELD_PRESS_LEGACY:');
        const selectedFault = isFault && row.title.startsWith(fault.pattern);
        if (oldFailure || selectedFault) {
          assert.equal(row.status, 'failed'); assert.equal(row.failureMessages.length, 1);
          const marker = isFault ? fault.marker : row.title.split(/[ :]/)[0];
          const first = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();
          assert.equal(first?.startsWith('AssertionError: ' + marker + ':'), true, 'Owned primary assertion: ' + name);
        } else if (isFault) { assert.ok(['pending', 'skipped'].includes(row.status)); assert.deepEqual(row.failureMessages, []); }
        else { assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []); }
        identities.push({ file, fullName: row.fullName, status: row.status });
      }
    }
    assert.equal(sha(fs.readFileSync(reportFile)), sha(reportBytes));
    const result = { name, kind, passed, ownedFailures: failures, declaredUnselectedSkips: skipped, executed: passed + failures,
      rawExit: child.status, rawReportSha256: sha(reportBytes), sourceCopySha256: copyBefore ? sha(copyBefore) : null,
      counters, rawErrors, detectedRuntimeError, runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', identities };
    write(path.join(out, name + '.summary.json'), result); results.push(result);
  }
  try {
    run('ordinary', 'ordinary'); put(original); run('healthy-copy', 'healthy');
    const oldBytes = encode(old); assert.notEqual(sha(oldBytes), sha(original)); put(oldBytes);
    fs.writeFileSync(path.join(out, 'old-source.ts'), oldBytes, { flag: 'wx' });
    run('old-source', 'old'); put(original);
    write(path.join(out, 'old-source.edit.json'), { kind: 'two-span exact old source', edits: oldEdits, originalSha256: sha(original),
      changedSha256: sha(oldBytes), canonicalOldSha256: sha(Buffer.from(old)), canonicalOldGit: git(Buffer.from(old)),
      inverseSha256: sha(encode(inverse)), physicalRestoreSha256: sha(fs.readFileSync(copy)), lineEnding: ending === '\r\n' ? 'CRLF' : 'LF' });
    controls.push('old-source');
    for (const fault of faults) {
      const offset = text.indexOf(fault.before); assert.ok(offset >= 0 && text.indexOf(fault.before, offset + 1) < 0, 'Unique source control: ' + fault.id);
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(code.split(fault.before).length, 2, 'Control anchor must be unique executed code');
      const changedText = text.slice(0, offset) + fault.after + text.slice(offset + fault.before.length), changed = encode(changedText);
      assert.notEqual(sha(changed), sha(original), 'Control changes actual source bytes');
      const restored = encode(changedText.slice(0, offset) + fault.before + changedText.slice(offset + fault.after.length));
      assert.deepEqual(restored, original, 'Complete actual source inverse');
      put(changed); fs.writeFileSync(path.join(out, fault.id + '.source.ts'), changed, { flag: 'wx' });
      run(fault.id, 'fault', fault); put(original);
      write(path.join(out, fault.id + '.edit.json'), { id: fault.id, primaryMarker: fault.marker, selectedPattern: fault.pattern,
        offset, offsetUnits: 'UTF-16 normalized source', before: fault.before, after: fault.after,
        lineEnding: ending === '\r\n' ? 'CRLF' : 'LF', original: { bytes: original.length, sha256: sha(original) },
        changed: { bytes: changed.length, sha256: sha(changed) }, inverse: { bytes: restored.length, sha256: sha(restored) },
        physicalRestoreSha256: sha(fs.readFileSync(copy)) }); controls.push(fault.id);
    }
    run('restored-copy', 'restored');
    assert.equal(results.length, 9); assert.equal(controls.length, 6);
    const totals = results.reduce((a, row) => ({ passed: a.passed + row.passed, ownedFailures: a.ownedFailures + row.ownedFailures,
      declaredUnselectedSkips: a.declaredUnselectedSkips + row.declaredUnselectedSkips, executed: a.executed + row.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.deepEqual(totals, { passed: 47, ownedFailures: 13, declaredUnselectedSkips: 40, executed: 60 });
    write(path.join(out, 'summary.json'), { scope: 'Original 19 Press cases plus nine annual-promise cases and six effective copied-source controls. No whole-suite, build/browser or natural injury rate claim.',
      children: 9, physicalControls: 6, totals, results });
  } catch (error) { primary = error; }
  finally {
    try { if (fs.existsSync(copy)) { assert.deepEqual(fs.readFileSync(copy), written, 'Remove only the held owned copy'); fs.unlinkSync(copy); } }
    catch (error) { secondary.push({ stage: 'copy-cleanup', name: error.name, message: error.message }); }
    try { write(path.join(out, 'source-after.json'), holds()); }
    catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { completed: !primary && secondary.length === 0, children: results.length,
      removedSourceCopy: !fs.existsSync(copy), primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary; assert.deepEqual(secondary, []);
  console.log('SC_SHIELD_PRESS: nine children, 47 healthy, 13 primary-owned, 40 declared unselected, 60 executed. Evidence: ' + out);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
