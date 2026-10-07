/* Actual saved setup, mounted hook and kickoff outcomes. Every fault keeps an untouched engine baseline. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const helper = 'src/lib/clubManagerMatchPlans.ts', card = 'src/components/club-manager/MatchPlansCard.tsx';
const hook = 'src/hooks/useClubManager.ts', tactics = 'src/components/club-manager/TacticsScreen.tsx';
const testFile = 'src/test/managerMatchPlans.test.tsx';
const cases = {
  independent: 'retains an independent engine kickoff and saved tactics baseline without using match plans',
  capture: 'captures every tactics assignment without aliasing players or consuming a random draw',
  mounted: 'saves applies and reloads the actual mounted tactics atomically through the real hook',
  preview: 'previews current injuries suspensions departed players fitness and exact engine replacements',
  kickoff: 'takes the previewed XI and all saved duties into an actual kickoff with identical engine draws',
  slots: 'keeps three named slots independent and replaces or deletes only the selected saved setup',
  invalid: 'ignores damaged and old plan metadata without discarding the earned career',
  club: 'refuses another club or era and keeps valid plans across the same clubs next season',
  takers: 'drops departed or loaned taker assignments while keeping the saved request for honest previews',
  guards: 'blocks saved plan actions during a live match a sack or a stale manager slot',
  controls: 'shows the worked example and current assignments then restores focus when the plan tile closes',
  reveal: 'reveals the actual plan action row after opening and selecting a saved setup',
  refused: 'reports refused actual plan clicks without success notices or clearing a pending bench selection',
};
const controls = {
  captureXi: { file: helper, from: 'xiIds: formation.slots.map((_, i) => career.xiIds[i] ?? null),', to: 'xiIds: formation.slots.map(() => null),', test: cases.capture },
  captureDuty: { file: helper, from: 'xiDuties: formation.slots.map((_, i) => slotDuty(career, formation, i)),', to: 'xiDuties: formation.slots.map(() => null),', test: cases.capture },
  captureTakers: { file: helper, from: 'setPieces: currentSetPieces(career, career.setPieces),', to: 'setPieces: currentSetPieces(career, undefined),', test: cases.capture },
  captureShootout: { file: helper, from: 'shootoutOrder: [...new Set(shootoutOrderOf(career) ?? [])].slice(0, SHOOTOUT_MAX_ORDER),', to: 'shootoutOrder: [],', test: cases.capture },
  alias: { file: helper, from: 'xiIds: formation.slots.map((_, i) => career.xiIds[i] ?? null),', to: 'xiIds: career.xiIds,', test: cases.capture },
  random: { file: helper, from: 'const label = name.trim().replace', to: 'Math.random();\n  const label = name.trim().replace', test: cases.capture },
  hookSave: { file: hook, from: 'setCareer(prev => prev ? savePlan(prev, slot, name) : prev);', to: 'setCareer(prev => prev);', test: cases.mounted },
  hookApply: { file: hook, from: 'setCareer(prev => prev ? applyPlan(prev, slot) : prev);', to: 'setCareer(prev => prev);', test: cases.mounted },
  persistence: { file: hook, from: 'note(saveCareer(career));', to: 'note(true);', test: cases.mounted },
  applyFormation: { file: helper, from: '...career, formationIndex: plan.formationIndex, mentality: plan.mentality,', to: '...career, formationIndex: career.formationIndex, mentality: plan.mentality,', test: cases.mounted },
  applyMentality: { file: helper, from: '...career, formationIndex: plan.formationIndex, mentality: plan.mentality,', to: '...career, formationIndex: plan.formationIndex, mentality: career.mentality,', test: cases.mounted },
  replacements: { file: helper, from: 'player: kickoff?.p ?? null, duty:', to: 'player: picked, duty:', test: cases.preview },
  strength: { file: helper, from: 'currentStrength: matchStrengthNow(career), strength: matchStrengthNow(state),', to: 'currentStrength: matchStrengthNow(career), strength: matchStrengthNow(career),', test: cases.preview },
  fitness: { file: helper, from: 'sum + x.p.fitness, 0) / actual.length', to: 'sum + x.p.rating, 0) / actual.length', test: cases.preview },
  previewText: { file: card, from: '{preview.strength.toFixed(1)} with plan', to: '{preview.currentStrength.toFixed(1)} with plan', test: cases.preview },
  kickoffDuty: { file: helper, from: 'xiIds: [...plan.xiIds], xiDuties: [...plan.xiDuties],', to: 'xiIds: [...plan.xiIds], xiDuties: [],', test: cases.kickoff },
  kickoffXi: { file: helper, from: 'xiIds: [...plan.xiIds], xiDuties: [...plan.xiDuties],', to: 'xiIds: [...career.xiIds], xiDuties: [...plan.xiDuties],', test: cases.kickoff },
  overwrite: { file: helper, from: 'matchPlans: [...matchPlansOf(career).filter(p => p.slot !== slot), plan]', to: 'matchPlans: [plan]', test: cases.slots },
  delete: { file: hook, from: 'setCareer(prev => prev ? deletePlan(prev, slot) : prev);', to: 'setCareer(prev => prev);', test: cases.slots },
  limit: { file: helper, from: 'export const MATCH_PLAN_LIMIT = 3;', to: 'export const MATCH_PLAN_LIMIT = 4;', test: cases.slots },
  version: { file: helper, from: 'p.version !== 1 || !validSlot(p.slot)', to: '!validSlot(p.slot)', test: cases.invalid },
  club: { file: helper, from: 'p.clubName !== career.clubName || p.eraId !== (career.eraId ?? DEFAULT_ERA_ID)', to: 'p.eraId !== (career.eraId ?? DEFAULT_ERA_ID)', test: cases.club },
  era: { file: helper, from: 'p.clubName !== career.clubName || p.eraId !== (career.eraId ?? DEFAULT_ERA_ID)', to: 'p.clubName !== career.clubName', test: cases.club },
  takers: { file: helper, from: 'setPieces: currentSetPieces(career, plan.setPieces),', to: 'setPieces: { ...plan.setPieces },', test: cases.takers },
  removedShootout: { file: helper, from: 'shootoutOrder: plan.shootoutOrder.filter(id => career.squad.some(p => p.id === id)),', to: 'shootoutOrder: [...plan.shootoutOrder],', test: cases.takers },
  live: { file: helper, from: 'return !career.live && !career.sacked && !career.wilderness;', to: 'return !career.sacked && !career.wilderness;', test: cases.guards },
  phase: { file: hook, from: "const saveMatchPlan = useCallback((slot: number, name: string) => {\n    if (phase !== 'hub' || !holdsActiveSlot()) return false;", to: "const saveMatchPlan = useCallback((slot: number, name: string) => {\n    if (!holdsActiveSlot()) return false;", test: cases.guards },
  stale: { file: hook, from: "const saveMatchPlan = useCallback((slot: number, name: string) => {\n    if (phase !== 'hub' || !holdsActiveSlot()) return false;", to: "const saveMatchPlan = useCallback((slot: number, name: string) => {\n    if (phase !== 'hub') return false;", test: cases.guards },
  focus: { file: card, from: 'triggerRef.current?.focus({ preventScroll: true });', to: 'void 0;', test: cases.controls },
  selection: { file: tactics, from: 'setSelSlot(null); setBenchPick(null); setOpenSlot(null); setDutySlot(null);', to: 'setOpenSlot(null); setDutySlot(null);', test: cases.controls },
  rules: { file: card, from: 'For example, save your first XI, rotate on the pitch, then save a second plan.', to: 'Save a setup.', test: cases.controls },
  reveal: { file: card, from: '<div ref={actionRef} data-cm-plan-actions', to: '<div data-cm-plan-actions', test: cases.reveal },
  refusedNotice: { file: card, from: 'setNotice(accepted ? success : REFUSED_MATCH_PLAN);', to: 'setNotice(success);', test: cases.refused },
  refusedSelection: { file: tactics, from: 'if (!onApplyMatchPlan(slot)) return false;', to: 'onApplyMatchPlan(slot);', test: cases.refused },
};
const control = process.env.MANAGER_MATCH_PLANS_CONTROL || '', count = Object.keys(cases).length;
assert(!control || control === 'all' || control in controls, 'Known match-plan fault');
const out = path.resolve(process.env.MANAGER_MATCH_PLANS_ARTIFACTS || path.join(root, 'manager-match-plans-artifacts/mounted'));
await mkdir(out, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, MANAGER_MATCH_PLANS_CONTROL: name, MANAGER_MATCH_PLANS_ARTIFACTS: out }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(out, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} match plans ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simManagerMatchPlans')).join('\n') + '\n' : output.slice(-14000));
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(row => row.passed), 'All match-plan outcomes and effective faults pass');
  console.log(`simManagerMatchPlans all: ${count} actual outcomes and ${Object.keys(controls).length} effective faults passed.`);
  process.exit(0);
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const held = [helper, card, hook, tactics, 'src/pages/ClubManager.tsx', 'src/lib/clubManager.ts', 'src/lib/clubManagerInternationals.ts', 'src/lib/clubManagerSlots.ts', 'src/test/clubManagerSave.test.tsx', 'src/test/clubManagerShootoutTile.test.tsx', 'scripts/simTacticsEngine.mjs', testFile, 'scripts/simManagerMatchPlans.mjs'];
const before = {};
for (const file of held) { const bytes = await readFile(path.join(root, file)); before[file] = digest(bytes); }
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, `${control || 'normal'}-report.json`);
let folder, copy;
try {
  if (control) {
    const spec = controls[control], original = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(original.split(spec.from).length - 1, 1, `One executable anchor for ${control}`);
    const changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original);
    assert.notEqual(digest(changed), digest(original));
    folder = await mkdtemp(path.join(root, 'src', '.sim-match-plans-'));
    copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(out, `${control}-${path.basename(spec.file)}.txt`), changed);
    await writeFile(path.join(out, `${control}-mutation.json`), JSON.stringify({ control, file: spec.file, from: spec.from, to: spec.to, anchorCount: 1, originalSha256: digest(original), changedSha256: digest(changed), test: spec.test }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.file.replace(/^src\//, '@/').replace(/\.tsx?$/, '')]: copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(out, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual match-plan runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime failures earn no fault credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, count - 2);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended?.status, 'failed');
    assert.match(intended.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, ''), /AssertionError:|Error: expect\((?:element|received)\)/, 'The mapped outcome fails an actual assertion');
    assert.equal(rows.find(row => row.title === cases.independent)?.status, 'passed');
    console.log(`simManagerMatchPlans ${control}: mapped outcome rejected changed source; independent engine baseline passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simManagerMatchPlans: ${count} actual outcomes passed.`);
  }
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = {};
  for (const file of held) { const bytes = await readFile(path.join(root, file)); after[file] = digest(bytes); }
  await writeFile(path.join(out, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, `All ${held.length} source files remain unchanged`);
}
