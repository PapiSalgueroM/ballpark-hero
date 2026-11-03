import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEST = 'src/test/soccerSeasonCentreFocus.test.tsx';
const SUITE = 'Soccer Career Season Centre return focus';
const TITLES = [
  "SC_CENTRE_FOCUS_RESUME: restores the connected Resume opener after a positive-app saved season",
  "SC_CENTRE_FOCUS_ZERO_SHIELD: restores Season replays after a represented zero-app Shield result"
];
const MARKERS = ['SC_CENTRE_FOCUS_RESUME_MISSING', 'SC_CENTRE_FOCUS_ZERO_SHIELD_MISSING'];
const DEFINITIONS = [
  {
    "path": "src/pages/SoccerCareer.tsx",
    "alias": "@/pages/SoccerCareer",
    "label": "page",
    "edits": [
      {
        "before": "function NewspaperCard({ articles, seasonKey, onContinue, continueRef }: { articles: NewsArticle[]; seasonKey: number; onContinue: () => void; continueRef: React.RefObject<HTMLButtonElement> }) {",
        "after": "function NewspaperCard({ articles, seasonKey, onContinue }: { articles: NewsArticle[]; seasonKey: number; onContinue: () => void }) {"
      },
      {
        "before": "      <Button ref={continueRef} onClick={onContinue} className=\"w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black\">\n        Continue to Season Summary →",
        "after": "      <Button onClick={onContinue} className=\"w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black\">\n        Continue to Season Summary →"
      },
      {
        "before": "  const [replaysOpen, setReplaysOpen] = useState(false);\n  const centreOpener = useRef<HTMLElement | null>(null);\n  const newspaperContinueRef = useRef<HTMLButtonElement>(null);\n  const returnCentreFocus = useRef(false);",
        "after": "  const [replaysOpen, setReplaysOpen] = useState(false);"
      },
      {
        "before": "  const [Chip, setChip] = useState<ComponentType<{ career: CareerState; at: number; onOpen: (row: SeasonRecord, opener?: HTMLButtonElement) => void }> | null>(null);",
        "after": "  const [Chip, setChip] = useState<ComponentType<{ career: CareerState; at: number; onOpen: (row: SeasonRecord) => void }> | null>(null);"
      },
      {
        "before": "  const closeCentre = () => { returnCentreFocus.current = true; setCentreFor(null); setWatchRow(null); setReplaysOpen(false); peekResume(); };\n  useLayoutEffect(() => {\n    if (!returnCentreFocus.current || centreFor !== null || watchRow !== null || replaysOpen) return;\n    returnCentreFocus.current = false;\n    const target = centreOpener.current?.isConnected ? centreOpener.current : newspaperContinueRef.current;\n    centreOpener.current = null;\n    if (target?.isConnected) target.focus({ preventScroll: true });\n  }, [centreFor, watchRow, replaysOpen]);",
        "after": "  const closeCentre = () => { setCentreFor(null); setWatchRow(null); setReplaysOpen(false); peekResume(); };"
      },
      {
        "before": "            <NewspaperCard articles={visibleCareer.pendingNews} seasonKey={career.seasons.length} onContinue={onDismissNewspaper} continueRef={newspaperContinueRef} />",
        "after": "            <NewspaperCard articles={visibleCareer.pendingNews} seasonKey={career.seasons.length} onContinue={onDismissNewspaper} />"
      },
      {
        "before": "            <Button variant=\"outline\" onClick={event => { centreOpener.current = event.currentTarget; setWatchRow(career.pendingSummary); }} className=\"w-full h-10 text-sm font-semibold\" data-watch-week-by-week>",
        "after": "            <Button variant=\"outline\" onClick={() => setWatchRow(career.pendingSummary)} className=\"w-full h-10 text-sm font-semibold\" data-watch-week-by-week>"
      },
      {
        "before": "onClick={event => { centreOpener.current = event.currentTarget; setReplaysOpen(true); }} data-open-season-replays",
        "after": "onClick={() => setReplaysOpen(true)} data-open-season-replays"
      },
      {
        "before": "          {Chip && <Chip career={career} at={chipAt} onOpen={(row, opener) => { centreOpener.current = opener ?? null; setWatchRow(row); }} />}",
        "after": "          {Chip && <Chip career={career} at={chipAt} onOpen={setWatchRow} />}"
      },
      {
        "before": "              <Button onClick={event => { centreOpener.current = event.currentTarget; onWeekByWeek(); }} variant=\"outline\" aria-label=\"Week by week: watch your season match by match\" className=\"h-12 w-11 shrink-0 px-0 text-base font-bold sm:w-auto sm:px-3 sm:text-sm gap-1.5\" data-week-by-week>",
        "after": "              <Button onClick={onWeekByWeek} variant=\"outline\" aria-label=\"Week by week: watch your season match by match\" className=\"h-12 w-11 shrink-0 px-0 text-base font-bold sm:w-auto sm:px-3 sm:text-sm gap-1.5\" data-week-by-week>"
      }
    ]
  },
  {
    "path": "src/components/soccer-career/SeasonResumeChip.tsx",
    "alias": "@/components/soccer-career/SeasonResumeChip",
    "label": "chip",
    "edits": [
      {
        "before": "  onOpen: (row: SeasonRecord, opener?: HTMLButtonElement) => void;",
        "after": "  onOpen: (row: SeasonRecord) => void;"
      },
      {
        "before": "      <Button onClick={event => onOpen(row, event.currentTarget)} variant=\"outline\" className=\"w-full h-11 text-sm font-bold\" data-season-resume>",
        "after": "      <Button onClick={() => onOpen(row)} variant=\"outline\" className=\"w-full h-11 text-sm font-bold\" data-season-resume>"
      }
    ]
  }
];
const CLEAN = ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'SC_EXTRA_CUPS_ENGINE',
  'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL', 'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD',
  'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE', 'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK',
  'TYCOON_LOADS_STADIUM_LIB', 'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL'];
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const escaped = value => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const code = value => value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const firstLine = value => value.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();

function classify(report, stdout, stderr, arm) {
  const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
  for (const value of Object.values(counters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
  const rawErrors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
  for (const value of Object.values(rawErrors)) if (value !== null) { assert.ok(Array.isArray(value)); assert.equal(value.length, 0); }
  const raw = stdout + '\n' + stderr;
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw)
    || Object.values(counters).some(value => typeof value === 'number' && value > 0) || Object.values(rawErrors).some(value => Array.isArray(value) && value.length > 0);
  assert.equal(detectedRuntimeError, false, 'Focus setup/runtime error is never an owned assertion');
  const selected = arm.chip ? [TITLES[0]] : TITLES;
  const failed = arm.fault ? selected.length : 0, passed = arm.fault ? 0 : selected.length, pending = TITLES.length - selected.length;
  for (const [key, value] of Object.entries({ numTotalTests: 2, numPassedTests: passed, numFailedTests: failed, numPendingTests: pending, numTodoTests: 0 })) assert.equal(report[key], value, key);
  assert.equal(report.success, !arm.fault); assert.equal(report.testResults.length, 1);
  const suite = report.testResults[0];
  assert.equal(path.relative(process.cwd(), suite.name).split(path.sep).join('/'), TEST);
  assert.equal(suite.message, ''); assert.equal(suite.status, arm.fault ? 'failed' : 'passed');
  assert.equal(suite.assertionResults.length, 2);
  assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), TITLES.map(title => SUITE + ' ' + title).sort());
  for (const row of suite.assertionResults) {
    assert.deepEqual(row.ancestorTitles, [SUITE]); assert.equal(row.fullName, SUITE + ' ' + row.title);
    assert.ok(TITLES.includes(row.title));
    if (!selected.includes(row.title)) {
      assert.ok(['pending', 'skipped'].includes(row.status)); assert.equal(row.failureMessages.length, 0);
    } else if (arm.fault) {
      const marker = MARKERS[TITLES.indexOf(row.title)];
      assert.equal(row.status, 'failed'); assert.equal(row.failureMessages.length, 1);
      assert.equal(firstLine(row.failureMessages[0])?.startsWith('AssertionError: ' + marker + ':'), true, 'SC_FOCUS_PRIMARY_OWNERSHIP: ' + arm.name + '/' + marker);
    } else { assert.equal(row.status, 'passed'); assert.equal(row.failureMessages.length, 0); }
  }
  return { passed, ownedFailures: failed, declaredUnselectedSkips: pending, executed: selected.length,
    counters, rawErrors, detectedRuntimeError,
    runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED',
    identities: suite.assertionResults.map(row => ({ fullName: row.fullName, status: row.status })) };
}

async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_CENTRE_FOCUS_OUT ? path.resolve(process.env.SC_CENTRE_FOCUS_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-centre-focus-'));
  assert.notEqual(out, root); assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Evidence directory must be fresh');
  fs.mkdirSync(out, { recursive: true });
  const own = path.relative(root, fileURLToPath(import.meta.url)).split(path.sep).join('/');
  const inputs = [...DEFINITIONS.map(item => item.path), TEST, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerExtraCups.ts',
    'src/components/soccer-career/SoccerSeasonCentre.tsx', 'src/components/season-centre/SeasonCentre.tsx', 'src/lib/season/resume.ts',
    'src/lib/season/soccer.ts', 'src/components/season-centre/resumeStore.ts', 'src/lib/soccerCareerSave.ts',
    'src/test/fixtures/soccerSeasonCompetitions1173.ts', 'src/lib/soccerSeasonCompetitions.ts',
    'src/test/setup.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.app.json', 'scripts/lib/offlineTransport.cjs', own];
  const held = new Map();
  for (const file of inputs) {
    const rawBytes = await fs.promises.readFile(path.join(root, file));
    held.set(file, Buffer.from(rawBytes));
  }
  const holds = () => {
    const receipt = [];
    for (const [file, expected] of held) {
      const actual = fs.readFileSync(path.join(root, file)); assert.deepEqual(actual, expected, 'Held actual focus input: ' + file);
      receipt.push({ file, bytes: actual.length, sha256: sha(actual) });
    }
    return receipt;
  };
  write(path.join(out, 'source-before.json'), holds());
  const sources = DEFINITIONS.map(def => {
    const original = held.get(def.path), rawText = original.toString('utf8');
    assert.deepEqual(Buffer.from(rawText), original, 'Focus source UTF-8 roundtrip');
    const ending = rawText.includes('\r\n') ? '\r\n' : '\n', withoutPairs = rawText.replace(/\r\n/g, '');
    assert.equal(withoutPairs.includes('\r'), false, 'Lone CR focus source refused');
    if (ending === '\r\n') assert.equal(withoutPairs.includes('\n'), false, 'Mixed focus source endings refused');
    const text = fs.readFileSync(path.join(root, def.path), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(text, rawText.replace(/\r\n/g, '\n'), 'Actual normalized focus read binds raw custody');
    const encode = value => Buffer.from(ending === '\r\n' ? value.replace(/\n/g, '\r\n') : value);
    const copy = path.join(root, path.dirname(def.path), '__control_season_focus_' + def.label + '_' + process.pid + '.tsx');
    assert.equal(fs.existsSync(copy), false, 'Owned focus copy must be absent');
    return { ...def, original, text, encode, ending, copy, written: null };
  });
  const [page, chip] = sources;
  const results = [], controls = [];
  let primary = null, classifierControl = null;
  const secondary = [];
  function put(source, body) {
    fs.writeFileSync(source.copy, body, source.written === null ? { flag: 'wx' } : undefined);
    source.written = Buffer.from(body);
    {
      const rawCopyBytes = fs.readFileSync(source.copy);
      assert.deepEqual(Buffer.from(rawCopyBytes), body);
    }
  }
  function omission(source) {
    let changedText = source.text; const steps = [];
    for (const edit of source.edits) {
      const at = changedText.indexOf(edit.before);
      assert.ok(at >= 0 && changedText.indexOf(edit.before, at + 1) < 0, 'Unique actual focus anchor: ' + source.label);
      const executable = code(changedText);
      assert.ok(executable.includes(edit.before), 'Focus anchor is executable code, not commentary');
      changedText = changedText.slice(0, at) + edit.after + changedText.slice(at + edit.before.length);
      steps.push({ offset: at, before: edit.before, after: edit.after });
    }
    const changed = source.encode(changedText); assert.notEqual(sha(changed), sha(source.original), 'Physical focus omission must change source');
    let inverseText = changedText;
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i]; assert.equal(inverseText.slice(step.offset, step.offset + step.after.length), step.after);
      inverseText = inverseText.slice(0, step.offset) + step.before + inverseText.slice(step.offset + step.after.length);
    }
    const inverse = source.encode(inverseText); assert.deepEqual(inverse, source.original, 'Full focus source inverse');
    const receipt = { id: source.label + '-focus-omitted', path: source.path, alias: source.alias, steps,
      offsetUnits: 'UTF-16 normalized source', lineEnding: source.ending === '\r\n' ? 'CRLF' : 'LF',
      original: { bytes: source.original.length, sha256: sha(source.original), normalizedSha256: sha(Buffer.from(source.text)) },
      changed: { bytes: changed.length, sha256: sha(changed), normalizedSha256: sha(Buffer.from(changedText)) },
      inverse: { bytes: inverse.length, sha256: sha(inverse) } };
    fs.writeFileSync(path.join(out, source.label + '.original.tsx'), source.original, { flag: 'wx' });
    fs.writeFileSync(path.join(out, source.label + '.omitted.tsx'), changed, { flag: 'wx' });
    write(path.join(out, source.label + '.edit.json'), receipt);
    return { changed, receipt };
  }
  function run(arm, source = null) {
    const env = { ...process.env, CI: '1', NODE_OPTIONS: '', SIM_NETWORK: 'offline' }; for (const key of CLEAN) delete env[key];
    if (source) { env.US_BOARD_CONTROL_ALIAS = source.alias; env.US_BOARD_CONTROL_FILE = source.copy; }
    env.SIM_OFFLINE_RECEIPT = path.join(out, arm.name + '.transport'); fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const reportFile = path.join(out, arm.name + '.vitest.json'); assert.equal(fs.existsSync(reportFile), false);
    const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
    if (arm.chip) args.push('--testNamePattern=^' + escaped(SUITE + ' ' + TITLES[0]) + '$');
    write(path.join(out, arm.name + '.argv.json'), [process.execPath, ...args]);
    write(path.join(out, arm.name + '.alias.json'), source ? { alias: source.alias, path: source.copy } : null);
    let copyBefore = null;
    if (source) {
      const rawCopyBytes = fs.readFileSync(source.copy);
      copyBefore = Buffer.from(rawCopyBytes);
    }
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 240000 });
    fs.writeFileSync(path.join(out, arm.name + '.stdout'), child.stdout || ''); fs.writeFileSync(path.join(out, arm.name + '.stderr'), child.stderr || '');
    fs.writeFileSync(path.join(out, arm.name + '.exit'), String(child.status) + '\n');
    write(path.join(out, arm.name + '.process.json'), { status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message } : null });
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, arm.fault ? 1 : 0);
    assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0, 'Focus child offline receipt must be empty');
    holds();
    if (source) {
      const rawCopyBytes = fs.readFileSync(source.copy);
      assert.deepEqual(Buffer.from(rawCopyBytes), copyBefore, 'Physical focus child source held');
    }
    const reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
    const detail = classify(report, child.stdout || '', child.stderr || '', arm);
    assert.equal(sha(fs.readFileSync(reportFile)), sha(reportBytes), 'Actual focus JSON held');
    const result = { ...arm, ...detail, rawExit: child.status, reportSha256: sha(reportBytes), copySha256: copyBefore ? sha(copyBefore) : null };
    write(path.join(out, arm.name + '.summary.json'), result); results.push(result);
    return { report, reportBytes, stdout: child.stdout || '', stderr: child.stderr || '' };
  }
  try {
    run({ name: 'current', fault: false, chip: false });
    put(page, page.original); run({ name: 'healthy-page-copy', fault: false, chip: false }, page);
    put(chip, chip.original); run({ name: 'healthy-chip-copy', fault: false, chip: true }, chip);
    for (const source of sources) {
      const changed = omission(source); put(source, changed.changed);
      const arm = { name: 'old-' + source.label, fault: true, chip: source === chip };
      const actual = run(arm, source);
      if (source === page) {
        const altered = JSON.parse(JSON.stringify(actual.report));
        const row = altered.testResults[0].assertionResults.find(item => item.title === TITLES[0]);
        const originalMessage = row.failureMessages[0], marker = MARKERS[0];
        const newline = originalMessage.indexOf('\n'); assert.ok(newline >= 0, 'Actual focus failure retains diagnostics');
        assert.ok(firstLine(originalMessage)?.startsWith('AssertionError: ' + marker + ':'), 'Actual old Page owns the original primary');
        row.failureMessages[0] = originalMessage.slice(0, newline).replace(marker, 'UNOWNED_FOCUS_HEADLINE')
          + '\nDiagnostic-only copy of the complete original failure follows:\n' + originalMessage;
        assert.ok(row.failureMessages[0].slice(row.failureMessages[0].indexOf('\n') + 1).includes(originalMessage), 'Complete original failure retained only as diagnostics');
        const copyBytes = Buffer.from(JSON.stringify(altered, null, 2) + '\n');
        assert.notEqual(sha(copyBytes), sha(actual.reportBytes), 'Primary trap must change copied report');
        assert.ok(row.failureMessages[0].includes(marker), 'Diagnostic-only marker remains');
        fs.writeFileSync(path.join(out, 'primary-trap.json'), copyBytes, { flag: 'wx' });
        assert.throws(() => classify(altered, actual.stdout, actual.stderr, arm), error => error?.name === 'AssertionError' && error.message.startsWith('SC_FOCUS_PRIMARY_OWNERSHIP:'), 'Primary-only classifier must refuse diagnostic marker');
        classify(JSON.parse(actual.reportBytes), actual.stdout, actual.stderr, arm);
        assert.equal(sha(fs.readFileSync(path.join(out, 'old-page.vitest.json'))), sha(actual.reportBytes));
        classifierControl = { changed: true, originalSha256: sha(actual.reportBytes), changedSha256: sha(copyBytes),
          ownedRefusal: 'SC_FOCUS_PRIMARY_OWNERSHIP', restoredSha256: sha(actual.reportBytes) };
        write(path.join(out, 'primary-trap.control.json'), classifierControl);
      }
      put(source, source.original);
      let restoredBody;
      {
        const rawCopyBytes = fs.readFileSync(source.copy);
        restoredBody = Buffer.from(rawCopyBytes);
      }
      fs.writeFileSync(path.join(out, source.label + '.restored.tsx'), restoredBody, { flag: 'wx' });
      let physicalRestoreSha256;
      {
        const rawCopyBytes = fs.readFileSync(source.copy);
        physicalRestoreSha256 = sha(Buffer.from(rawCopyBytes));
      }
      changed.receipt.physicalRestoreSha256 = physicalRestoreSha256;
      assert.equal(changed.receipt.physicalRestoreSha256, sha(source.original));
      write(path.join(out, source.label + '.edit.json'), changed.receipt); controls.push(changed.receipt);
    }
    run({ name: 'restored-page-copy', fault: false, chip: false }, page);
    run({ name: 'restored-chip-copy', fault: false, chip: true }, chip);
    assert.equal(results.length, 7); assert.equal(controls.length, 2); assert.ok(classifierControl?.changed);
    const totals = results.reduce((a, item) => ({ passed: a.passed + item.passed, ownedFailures: a.ownedFailures + item.ownedFailures,
      declaredUnselectedSkips: a.declaredUnselectedSkips + item.declaredUnselectedSkips, executed: a.executed + item.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.deepEqual(totals, { passed: 8, ownedFailures: 3, declaredUnselectedSkips: 3, executed: 11 });
    write(path.join(out, 'summary.json'), { scope: 'Two mounted return-focus cases, exact focus-only Page/Chip omissions and same-path restores. No full ordinary suite or native browser credit.',
      children: 7, rows: 14, results, totals, sourceControls: controls, classifierControl });
  } catch (error) { primary = error; }
  finally {
    for (const source of sources) {
      try {
        if (fs.existsSync(source.copy)) {
          let cleanupOwnedBytes;
          {
            const rawCopyBytes = fs.readFileSync(source.copy);
            cleanupOwnedBytes = Buffer.from(rawCopyBytes);
          }
          assert.deepEqual(cleanupOwnedBytes, source.written, 'Only owned unchanged focus copy may be restored/removed');
          put(source, source.original);
          let cleanupRestoredBytes;
          {
            const rawCopyBytes = fs.readFileSync(source.copy);
            cleanupRestoredBytes = Buffer.from(rawCopyBytes);
          }
          assert.deepEqual(cleanupRestoredBytes, source.original);
          fs.unlinkSync(source.copy);
        }
      } catch (error) { secondary.push({ stage: source.label + '-cleanup', name: error.name, message: error.message }); }
    }
    try { write(path.join(out, 'source-after.json'), holds()); }
    catch (error) { secondary.push({ stage: 'input-holds', name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { complete: !primary && secondary.length === 0, completedChildren: results.length,
      removedSourceCopies: sources.every(source => !fs.existsSync(source.copy)),
      primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary;
  assert.equal(secondary.length, 0, 'Focus cleanup or source hold failed');
  console.log('SC_CENTRE_FOCUS: 7 children, 8 healthy, 3 primary-owned, 3 declared unselected, 11 executed. Evidence: ' + out);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
