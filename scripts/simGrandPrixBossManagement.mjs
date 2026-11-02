import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'src/pages/GrandPrixBoss.tsx', ORIGINAL = 'src/test/grandPrixBossPage.test.tsx';
const TEST = 'src/test/grandPrixBossManagementPage.test.tsx';
const OLD = 'scripts/qa/source-controls/GrandPrixBoss.before-management.tsx.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [PAGE, ORIGINAL, TEST, OLD, 'src/lib/grandPrixBoss.ts', 'src/hooks/useGrandPrixBoss.ts',
  'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts',
  'src/components/game/RulesGate.tsx', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
assert.equal(sha(held.get(ORIGINAL)), 'e8cc17bd6047a775557632e0984f59cfc385f922d9c80fee0638e6e94b98bb25', 'Held original nine page cases');
const base = path.resolve(process.env.GP_BOSS_MANAGEMENT_OUT || path.join(root, 'tmp'));
assert(base !== path.join(root, 'src') && !base.startsWith(path.join(root, 'src') + path.sep));
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-management-'));
const copyBase = path.join(root, 'tmp');
fs.mkdirSync(copyBase, { recursive: true });
const copyDir = fs.mkdtempSync(path.join(copyBase, 'dukb-grand-prix-management-copy-'));
assert.equal(path.dirname(copyDir), copyBase, 'Owned copied source stays inside the allowed workspace tmp folder');
const candidate = path.join(copyDir, 'GrandPrixBoss.tsx'), source = held.get(PAGE).toString('utf8');
fs.writeFileSync(path.join(out, 'copy-location.json'), JSON.stringify({ evidence: out, sourceCopy: candidate, allowedRoot: copyBase }, null, 2));
const originalIds = ['GP_PAGE_AVAILABLE:', 'GP_PAGE_START:', 'GP_PAGE_HUB:', 'GP_PAGE_UPGRADE:', 'GP_PAGE_ORDERS:',
  'GP_PAGE_STANDINGS:', 'GP_PAGE_BACK:', 'GP_PAGE_MOVED_EMPTY:', 'GP_PAGE_PROTECTED_SAVE:'];
const ids = ['GP_MANAGEMENT_SIGN:', 'GP_MANAGEMENT_RENEW:', 'GP_MANAGEMENT_NEXT_YEAR:', 'GP_MANAGEMENT_GUARDS:',
  'GP_MANAGEMENT_HISTORY:', 'GP_MANAGEMENT_REVIEW_CARDS:'];
const results = [];
function hold() { for (const [file, bytes] of held) assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(bytes), file + ': actual source held'); }
const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-page.tsx'), held.get(PAGE));
fs.writeFileSync(candidate, held.get(PAGE));
function run(name, selected = null, copied = false, marker = null) {
  const reportFile = path.join(out, name + '.vitest.json'), transport = path.join(out, name + '.transport');
  const env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'),
    SIM_OFFLINE_RECEIPT: transport, FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const key of ['GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  const copyBefore = copied ? fs.readFileSync(candidate) : null;
  if (copied) {
    assert.equal(path.dirname(candidate), copyDir);
    assert(copyBefore.length > 0, name + ': physical source copy exists before import');
    env.GP_BOSS_PAGE_FILE = candidate;
  }
  const targets = selected ? [TEST] : [ORIGINAL, TEST];
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...targets, '--maxWorkers=1', '--minWorkers=1',
    '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (selected) args.push('--testNamePattern=' + selected);
  fs.writeFileSync(transport, '');
  fs.writeFileSync(path.join(out, name + '.argv.json'), JSON.stringify({ command: process.execPath, args, pageCopy: copied ? candidate : null, pageCopyBytes: copyBefore?.length ?? null, pageCopySha256: copyBefore ? sha(copyBefore) : null }, null, 2));
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  fs.writeFileSync(path.join(out, name + '.exit.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message } : null }, null, 2));
  hold();
  if (copyBefore) assert.deepEqual(fs.readFileSync(candidate), copyBefore, name + ': exact physical copy bytes held during child');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, selected ? 1 : 0);
  assert.equal(fs.statSync(transport).size, 0, name + ': no attempted network');
  const r = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const expected = selected ? { passed: 0, ownedFailures: 1, declaredSkips: 5, totalExecuted: 1 } : { passed: 15, ownedFailures: 0, declaredSkips: 0, totalExecuted: 15 };
  assert.equal(r.success, !selected); assert.equal(r.numTotalTests, selected ? 6 : 15);
  assert.equal(r.numPassedTests, expected.passed); assert.equal(r.numFailedTests, expected.ownedFailures);
  assert.equal(r.numPendingTests, expected.declaredSkips); assert.equal(r.numTodoTests, 0);
  assert.equal(r.testResults.length, targets.length);
  const seenFiles = new Set(), cases = [];
  for (const file of r.testResults) {
    const names = targets.filter(target => file.name.replaceAll('\\', '/').endsWith('/' + target));
    assert.equal(names.length, 1); const target = names[0]; assert(!seenFiles.has(target)); seenFiles.add(target);
    const identities = target === ORIGINAL ? originalIds : ids, seen = new Set();
    assert.equal(file.assertionResults.length, identities.length);
    for (const row of file.assertionResults) {
      const matches = identities.filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
      const id = matches[0]; assert(!seen.has(id)); seen.add(id);
      const failed = selected === id, skipped = !!selected && !failed;
      assert.equal(row.status, failed ? 'failed' : skipped ? 'skipped' : 'passed');
      assert.equal(row.failureMessages.length, failed ? 1 : 0);
      if (failed) {
        assert.match(row.failureMessages[0], /AssertionError:/);
        assert(!/(?:^|\n)AssertionError:\s*GP_MANAGEMENT_[A-Z_]*FOUNDATION/.test(row.failureMessages[0]), name + ': fixture must not own the failure');
        if (marker) assert(row.failureMessages[0].includes(marker));
      }
      cases.push({ file: target, title: row.title, status: row.status, failureMessages: row.failureMessages });
    }
    assert.equal(seen.size, identities.length);
  }
  assert.equal(seenFiles.size, targets.length);
  const runtimeCounters = { numUnhandledErrors: r.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: r.numRuntimeErrorTestSuites ?? null };
  for (const count of Object.values(runtimeCounters)) if (count !== null) { assert.equal(typeof count, 'number'); assert.equal(count, 0); }
  for (const errors of [r.errors, r.unhandledErrors]) if (errors != null) { assert(Array.isArray(errors)); assert.equal(errors.length, 0); }
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test((child.stdout || '') + '\n' + (child.stderr || ''));
  assert.equal(detectedRuntimeError, false);
  const result = { name, rawExit: child.status, ...expected, transportBytes: 0, runtimeCounters,
    runtimeCounterCompleteness: Object.values(runtimeCounters).some(count => count === null) ? 'UNKNOWN' : 'REPORTED',
    detectedRuntimeError, rawErrors: r.errors ?? null, rawUnhandledErrors: r.unhandledErrors ?? null, cases };
  results.push(result); fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(result, null, 2));
  console.log(name + ': ' + result.passed + ' passes, ' + result.ownedFailures + ' owned assertions, ' + result.declaredSkips + ' declared skips.');
}
const executed = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const lifecycleSpans = [
  {
    "before": "import { seasonScore, type CarArea, type Compound, type GrandPrixAction, type GrandPrixCareer, type Pace } from '@/lib/grandPrixBoss';\n",
    "after": "import { seasonScore, type CarArea, type Compound, type GrandPrixAction, type GrandPrixCareer, type GrandPrixFocus, type Pace } from '@/lib/grandPrixBoss';\n"
  },
  {
    "before": "      <li>Check the next season plan before you continue. It adds sponsor money, pays automatic renewals for expiring seats and protects the next year's entry fees and wages. A renewal paid during review leaves the automatic renewal bill.</li>\n",
    "after": "      <li>Set development focus in Drivers before the first qualifying session or after the season. It costs nothing. Age and potential still shape growth when you start the next season.</li>\n      <li>A driver retires when they will be 40 or older next year and their term expires. Paid terms remain honored, including future starts and years left on a multi-year contract.</li>\n      <li>Check the next season plan before you continue. It adds sponsor money, lists automatic renewals and quoted retirement prospects, and protects the next year's entry fees and wages. Each replacement fee is paid when you start next season. A renewal paid during review leaves the automatic renewal bill.</li>\n      <li>At the new season, cars keep their starting levels plus 70% of improvements, rounded down. Other teams then add two to their weakest car area, up to 100.</li>\n"
  },
  {
    "before": "",
    "after": "    <div><h3 className=\"font-bold\">A retirement replacement example</h3><p>A driver's term ends and retirement is listed in the plan. Compare the quoted prospect's age, skills and potential, then check the replacement fee and next season's reserve. Starting next season pays that saved quote and puts the prospect in the seat. A paid future term keeps its driver.</p></div>\n"
  },
  {
    "before": "",
    "after": "  const canChangeFocus = career.phase === 'preRace' && career.round === 0 && career.results.length === 0\n    || career.phase === 'seasonReview' && career.results.length === career.calendar.length && career.round === career.calendar.length - 1;\n"
  },
  {
    "before": "",
    "after": "        <label className=\"block space-y-1 text-xs\"><span>Development focus</span><select aria-label={'Development focus for ' + driver.name} className={select} disabled={blocked || !canChangeFocus} value={driver.focus} onChange={event => {\n          const focus = event.target.value as GrandPrixFocus;\n          if (!blocked && canChangeFocus && focus !== driver.focus) dispatch({ type: 'setDriverFocus', driverId: driver.id, focus, expectedRevision: career.revision });\n        }}>{(['balanced', 'pace', 'consistency', 'tyreCare', 'wet'] as GrandPrixFocus[]).map(focus => <option key={focus} value={focus}>{focus === 'tyreCare' ? 'Tyre care' : label(focus)}</option>)}</select></label>\n        <p className=\"text-xs text-muted-foreground\">Potential {driver.potential}. Focus guides development at the next season. Change it before the first qualifying session or after the season.</p>\n"
  },
  {
    "before": "",
    "after": "        <Stat title=\"Retirement replacement fees\" testId=\"gp-next-replacement-fee\">{money(career.nextSeasonPlan.totalReplacementFee)}</Stat>\n"
  },
  {
    "before": "        <Stat title=\"Cash after sponsor and renewals\" testId=\"gp-next-cash-after\">{money(career.nextSeasonPlan.cashAfter)}</Stat>\n",
    "after": "        <Stat title=\"Cash after sponsor and fees\" testId=\"gp-next-cash-after\">{money(career.nextSeasonPlan.cashAfter)}</Stat>\n"
  },
  {
    "before": "      <p className=\"text-xs text-muted-foreground\">The plan pays the listed renewal fees and keeps next season's entries and wages reserved. Renewals already paid during review leave this bill.</p>\n",
    "after": "      {career.nextSeasonPlan.seatReplacements.length > 0 && <div data-testid=\"gp-seat-replacements\" className=\"space-y-3\">\n        <h4 className=\"font-bold\">Retirement replacements</h4>\n        <div className=\"grid gap-3 sm:grid-cols-2\">{career.nextSeasonPlan.seatReplacements.map(row => {\n          const departing = career.drivers.find(driver => driver.id === row.departingDriverId)!, rookie = row.rookie, contract = rookie.contract!;\n          return <article key={row.departingDriverId} data-testid={'gp-seat-replacement-' + row.departingDriverId} className=\"min-w-0 space-y-2 rounded-lg border border-border bg-background p-3 text-xs\">\n            <p className=\"break-words text-muted-foreground\">Replacing <span>{departing.name}</span></p>\n            <p className=\"break-words text-sm font-bold\">{rookie.name}</p>\n            <div className=\"grid grid-cols-2 gap-2\"><p>Age {rookie.age}</p><p>Potential {rookie.potential}</p><p>Pace {rookie.skills.pace}</p><p>Consistency {rookie.skills.consistency}</p><p>Tyre care {rookie.skills.tyreCare}</p><p>Wet {rookie.skills.wet}</p></div>\n            <p className=\"break-words\">Fee {money(row.signingFee)}</p><p className=\"break-words\">Wage {money(contract.wagePerRace)} per race</p>\n            <p>{contract.years} season from year {contract.startsSeason}</p>\n          </article>;\n        })}</div>\n      </div>}\n      <p className=\"text-xs text-muted-foreground\">The plan pays the listed renewal and replacement fees and keeps next season's entries and wages reserved. Renewals already paid during review leave this bill.</p>\n"
  }
];
const olderFixtureSpan = {
  "before": "    const legacy = read({ ...createCareer(291), season: 14, history: undefined, careerTotals: undefined, marketOffers: undefined, nextSeasonPlan: undefined });",
  "after": "    const olderRaw = { ...createCareer(291), season: 14, history: undefined, careerTotals: undefined, marketOffers: undefined, nextSeasonPlan: undefined };\n    for (const driver of olderRaw.drivers) delete (driver as unknown as Record<string, unknown>).focus;\n    for (const team of olderRaw.teams) delete (team as unknown as Record<string, unknown>).baselineCar;\n    const legacy = read(olderRaw);"
};
function compatibilityInverse(text, spans) {
  let inverse = text;
  const edits = [];
  for (const { before, after } of spans.slice().reverse()) {
    assert.equal(inverse.split(after).length - 1, 1, 'Unique current compatibility span');
    assert.equal(executed(inverse).split(after).length - 1, 1, 'Executed current compatibility span');
    const offset = inverse.indexOf(after);
    inverse = inverse.slice(0, offset) + before + inverse.slice(offset + after.length);
    edits.push({ offset, before, after });
  }
  let restored = inverse;
  for (const { offset, before, after } of edits.slice().reverse()) {
    assert.equal(restored.slice(offset, offset + before.length), before);
    restored = restored.slice(0, offset) + after + restored.slice(offset + before.length);
  }
  assert.equal(restored, text, 'Complete current compatibility restoration');
  return { inverseSha256: sha(Buffer.from(inverse)), restoredSha256: sha(Buffer.from(restored)), edits };
}
const pageCompatibility = compatibilityInverse(source, lifecycleSpans);
assert.equal(pageCompatibility.edits.length, 8);
assert.equal(pageCompatibility.inverseSha256, '1474ae6a5e7c5ca99cc56e43c53502af4a4639ec1345f78af51a1af5588c8fc1', 'Exact focus-fixed page before lifecycle UI');
const testCompatibility = compatibilityInverse(held.get(TEST).toString('utf8'), [olderFixtureSpan]);
assert.equal(testCompatibility.inverseSha256, '77a3d05742e9621ab6146bfbfe3f5b33f1853b99a12008b66134f0387c351922', 'Exact six-case test before labelled older-fixture compatibility');
fs.writeFileSync(path.join(out, 'compatibility-provenance.json'), JSON.stringify({
  scope: 'Only eight lifecycle UI spans above the qualified focus-fixed page and one labelled older-fixture test adaptation. No product or test mutation.',
  currentPageSha256: sha(held.get(PAGE)), currentTestSha256: sha(held.get(TEST)), pageCompatibility, testCompatibility,
  engineInputSha256: sha(held.get('src/lib/grandPrixBoss.ts')), hookInputSha256: sha(held.get('src/hooks/useGrandPrixBoss.ts')),
  engineHookScope: 'Observed actual inputs held by every child. The exact joined source pins belong to focused qualification; no old whole-engine or hook pin is substituted here.',
}, null, 2));
function control(name, selected, before, after, marker = null) {
  assert.notEqual(before, after); assert.equal(source.split(before).length - 1, 1, name + ': unique actual anchor');
  assert.equal(executed(source).split(before).length - 1, 1, name + ': executable anchor');
  const offset = source.indexOf(before), changed = source.slice(0, offset) + after + source.slice(offset + before.length);
  assert.notEqual(changed, source);
  const inverse = changed.slice(0, offset) + before + changed.slice(offset + after.length);
  assert.equal(inverse, source);
  fs.writeFileSync(candidate, changed); fs.writeFileSync(path.join(out, name + '-page.tsx'), changed);
  fs.writeFileSync(path.join(out, name + '.edit.json'), JSON.stringify({ offset, before, after, originalSha256: sha(held.get(PAGE)), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(inverse)) }, null, 2));
  try { run(name, selected, true, marker); }
  finally { fs.writeFileSync(candidate, held.get(PAGE)); hold(); assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(PAGE))); }
}
try {
  run('current');
  assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(PAGE)), 'Healthy physical source copy is exact before child');
  run('healthy-copy', null, true);
  const oldPage = held.get(OLD);
  assert.equal(oldPage.length, 20391);
  assert.equal(createHash('sha1').update('blob ' + oldPage.length + '\0').update(oldPage).digest('hex'), '96043202c31297b27343274508bc370110761407');
  assert.equal(sha(oldPage), '75299ffcee86f41575e1b3f7769eb3706c81d83868c42eec305925f6171a9c1f');
  assert.notEqual(sha(oldPage), sha(held.get(PAGE))); fs.writeFileSync(path.join(out, 'whole-original-page.tsx'), oldPage);
  for (const [name, selected, marker] of [
    ['original-entry', ids[0], 'GP_PAGE_MARKET_SIGN_MISSING'],
    ['original-historical-cards', ids[5], 'GP_PAGE_HISTORICAL_RACE_PARTICIPANTS_WRONG'],
  ]) {
    fs.writeFileSync(candidate, oldPage);
    try { run(name, selected, true, marker); }
    finally { fs.writeFileSync(candidate, held.get(PAGE)); hold(); }
  }
  control('sign-revision', ids[0],
    "dispatch({ type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId, expectedRevision: career.revision })",
    "dispatch({ type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId, expectedRevision: career.revision + 1 })");
  control('sign-price', ids[0], '{money(offer.totalFee)}</Stat>', '{money(offer.totalFee + 1)}</Stat>');
  control('missing-renewal', ids[1], '>Renew {driver.name}</button>', '>Changed renewal {driver.name}</button>', 'GP_PAGE_MARKET_RENEW_MISSING');
  control('renewed-plan-fee', ids[1], '{money(career.nextSeasonPlan.totalRenewalFee)}</Stat>', '{money(career.nextSeasonPlan.totalRenewalFee + 1)}</Stat>');
  control('plan-cash', ids[2], '{money(career.nextSeasonPlan.cashAfter)}</Stat>', '{money(career.nextSeasonPlan.cashAfter + 1)}</Stat>');
  control('sign-moved-guard', ids[3], 'disabled={blocked || !offer.affordable}', 'disabled={!offer.affordable}');
  control('next-year-affordability', ids[3], "disabled={blocked || career.phase === 'seasonReview' && !career.nextSeasonPlan?.affordable}", 'disabled={blocked}');
  control('archive-champion', ids[4], '{saved.driverChampion.name}</Stat>', '{career.drivers[0].name}</Stat>');
  control('legacy-coverage', ids[4], "' Earlier seasons are unknown.'", "' All earlier seasons are recorded.'");
  control('archive-track', ids[4], '{result.trackName}</summary>', "{'Fixture Missing Track'}</summary>");
  run('restored-copy', null, true);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures,
    declaredSkips: sum.declaredSkips + row.declaredSkips, totalExecuted: sum.totalExecuted + row.totalExecuted }),
    { passed: 0, ownedFailures: 0, declaredSkips: 0, totalExecuted: 0 });
  assert.equal(results.length, 15); assert.deepEqual(totals, { passed: 45, ownedFailures: 12, declaredSkips: 60, totalExecuted: 57 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({
    scope: 'Actual management page, canonical engine fixtures, original nine cases and six management cases. No route, storage-provider or full-game readiness claim.',
    childRuns: 15, totals, results,
  }, null, 2));
  console.log('simGrandPrixBossManagement: 45 healthy passes,12 owned assertions,60 declared skips;57 executed outcomes.');
} finally {
  hold(); assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(PAGE)), 'Physical page copy restored');
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(receipts(), null, 2));
  console.log('Grand Prix Boss management evidence: ' + out);
}
