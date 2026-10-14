/* Remote-only actual own-club screen outcomes, including legacy saves. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Current-roster proof requires remote offline CI');
const readLf = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'); /* Release BE: simHarnessAnchors, a CRLF checkout */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SELF = fileURLToPath(import.meta.url);
const PARENT = '082fc2774c8aa9f919c14efa33bfc3fbfc599597', TEST = 'src/test/clubDetailCurrentRoster.test.tsx';
const COMPONENT = 'src/components/club-manager/ClubDetailScreen.tsx', CORE = 'src/lib/clubManager.ts';
const CONTROL = process.env.CM_OWN_ROSTER_CONTROL || '', RED = process.env.CM_OWN_ROSTER_EXPECT_RED === '1';
const PHASE = process.env.CM_OWN_ROSTER_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'));
assert(['', 'original'].includes(CONTROL) && !(RED && CONTROL));
const OLD = '  const fromMySquad = isMyCustom || (clubName === career.clubName && (worldSeedOf(career) !== undefined || worldRosterView(career) !== null));';
const FIXED = '  const fromMySquad = isMyCustom || clubName === career.clubName;';
const NAMES = [
  'current roster missing: legacy saved release and signing show current names value and XI',
  'current roster missing: legacy historical save shows its actual owned squad',
  'current roster missing: an empty legacy squad never falls back to startup players',
  'current roster preservation: seeded save without a ledger shows its owned squad',
  'current roster preservation: seeded actual deals show the owned roster',
  'current roster preservation: a valid ledger without a seed still shows the owned squad',
  'current roster preservation: a founded club keeps its own generated squad and sale values',
  'current roster preservation: rival details keep the saved world roster',
];
const OLD_TEST = 'src/test/clubDetailOwnClub.test.tsx', BROWSER = 'scripts/playClubDetailCurrentRoster.mjs';
const files = [COMPONENT, CORE, 'src/lib/clubManagerWorldRoster.ts', 'src/lib/clubManagerEras.ts', OLD_TEST,
  TEST, 'scripts/simClubDetailCurrentRoster.mjs', '.github/workflows/club-detail-current-roster.yml', BROWSER];
const sha = value => createHash('sha256').update(value).digest('hex');
const sources = new Map(files.map(file => [file, readLf(path.join(ROOT, file))]));
const OUT = process.env.CM_OWN_ROSTER_OUT ? path.resolve(process.env.CM_OWN_ROSTER_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'club-detail-current-roster-'));
assert(OUT !== ROOT && OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep));
const retained = path.join(OUT, CONTROL || PHASE); fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace retained screen evidence');
for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
function git(args) { const run = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run.status, 0); return run.stdout; }
const head = git(['rev-parse', 'HEAD']).trim(), parent = git(['show', `${PARENT}:${COMPONENT}`]);
fs.writeFileSync(path.join(retained, 'ClubDetailScreen.parent.tsx'), parent);
const bindings = files.slice(0, 5).map(file => ({ file, parentSha256: sha(git(['show', `${PARENT}:${file}`])), candidateSha256: sha(sources.get(file)) }));
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true }); const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/current-roster-'));
let outcome = {};
function receipt(extra = {}) { outcome = { ...outcome, ...extra }; fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({
  head, parentRef: PARENT, phase: PHASE, control: CONTROL, bindings, ...outcome,
  sourceReceipts: [...sources].map(([file, source]) => ({ file, beforeSha256: sha(source), afterSha256: sha(readLf(path.join(ROOT, file))) })),
}, null, 2) + '\n'); }
try {
  receipt();
  /* Release BE join (Round BEG): the unchanged inputs are held against CORE_REF, PARENT on the packet branch; on a newer
     core (Release BD changed clubManager.ts) the join passes CM_OWN_ROSTER_CORE_REF=HEAD. The recorded parentSha256 stays
     PARENT's, which the walk reads. */
  const CORE_REF = process.env.CM_OWN_ROSTER_CORE_REF || PARENT;
  for (const row of bindings) if (RED || ![COMPONENT, 'src/test/clubDetailOwnClub.test.tsx'].includes(row.file))
    assert.equal(row.candidateSha256, CORE_REF === PARENT ? row.parentSha256 : sha(git(['show', `${CORE_REF}:${row.file}`])));
  assert.equal(parent.split(OLD).length - 1, 1, 'One original own-club gate must exist');
  const comment = `  /* Release AZ fix pass 4, the lead's ruling (the manager's own club is read
     from his squad, never the world roster): in a career that plays the living
     world, my own club opened from a bracket or the world tables is my squad,
     as a club I founded always was. Off the world roster it listed only the
     men of my club who are NOT in my squad (the men a deep club's bake holds
     beyond the 26 a squad starts with, then every replacement the projection
     made up). A career from before the release reads the projected world here
     exactly as it did (ruling Y1). src/test/clubDetailOwnClub.test.tsx holds
     it. */`;
  const componentSpans = [[OLD, FIXED], ['worldSeasonLabel, worldSeedOf, yearsOn,', 'worldSeasonLabel, yearsOn,'],
    ["import { worldRosterView } from '@/lib/clubManagerWorldRoster';\n", ''],
    [comment, '  /* The club you manage always reads the squad in this save. Rival clubs\n     keep their current world roster, including recorded transfers. */']];
  const oldTestComment = `/* Release AZ fix pass 4, the lead's ruling of 2026-10-12: the manager's own club is read from his squad, never
   the world roster. The club screen opened on my own club (from a cup bracket, the Champions League cards or the
   world tables) read it off the world roster minus my squad, so "your club" listed only the men of my club who
   are not in my squad: the men a deep club's bake holds beyond the 26 a squad starts with. In a career that plays
   the living world it now lists my squad, as a club I founded always did. A career from before the release (no
   world seed, so by ruling Y1 no ledger either) reads the projected world here exactly as it did. Every state
   below is the real engine's on a real club; nothing is made up. */`;
  const testSpans = [[oldTestComment, '/* Club details use the saved owned squad for every career, including legacy\n   saves. Rival clubs still use their current world roster. */'],
    ['a career from before the release reads its own club off the projected world exactly as it did', 'a career from before the release reads its own club from its current saved squad'],
    ['expect(screenText(old, \'Real Madrid\')).toContain(`Squad (${projected.length} on the books)`);', 'expect(screenText(old, \'Real Madrid\')).toContain(`Squad (${old.squad.length} on the books)`);']];
  function planned(file, before, spans) {
    let after = before; const rows = [];
    for (const [anchor, replacement] of spans) {
      assert.equal(after.split(anchor).length - 1, 1, file + ': one exact plan span must exist'); const offset = after.indexOf(anchor);
      after = after.slice(0, offset) + replacement + after.slice(offset + anchor.length); rows.push({ anchor, replacement, offset });
    }
    let inverse = after;
    for (const { anchor, replacement, offset } of [...rows].reverse()) {
      assert.equal(inverse.slice(offset, offset + replacement.length), replacement); inverse = inverse.slice(0, offset) + anchor + inverse.slice(offset + replacement.length);
    }
    assert.equal(inverse, before); const name = path.basename(file);
    fs.writeFileSync(path.join(retained, name + '.fixed-plan'), after); fs.writeFileSync(path.join(retained, name + '.inverse'), inverse);
    assert.equal(sources.get(file), RED ? before : after, file + ': actual whole source must equal the exact phase plan');
    return { file, spans: rows, parentSha256: sha(before), plannedSha256: sha(after), inverseSha256: sha(inverse) };
  }
  const componentBinding = planned(COMPONENT, parent, componentSpans), oldTestBinding = planned(OLD_TEST, git(['show', `${PARENT}:${OLD_TEST}`]), testSpans);
  receipt({ componentBinding, oldTestBinding });
  const adopted = CONTROL ? parent : sources.get(COMPONENT);
  if (CONTROL) { assert.notEqual(adopted, sources.get(COMPONENT));
    const inverse = adopted.slice(0, 0) + sources.get(COMPONENT) + adopted.slice(parent.length);
    assert.equal(inverse, sources.get(COMPONENT)); fs.writeFileSync(path.join(retained, 'ClubDetailScreen.control.tsx'), adopted);
    receipt({ sourceControl: { kind: 'whole-original-component', beforeSha256: sha(sources.get(COMPONENT)), faultSha256: sha(adopted),
      parentSha256: sha(parent), originalGate: OLD, fixedGate: FIXED, offset: 0, replacedBytes: Buffer.byteLength(sources.get(COMPONENT)),
      replacementBytes: Buffer.byteLength(parent), wholeCurrentInverseSha256: sha(inverse) } }); }
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: path.join(ROOT, CORE), component: path.join(ROOT, COMPONENT) }, outdir: tmp,
    bundle: true, splitting: true, format: 'esm', platform: 'node', jsx: 'automatic', outExtension: { '.js': '.mjs' }, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    plugins: [{ name: 'actual-current-roster-component', setup(build) {
      build.onLoad({ filter: /\.tsx$/ }, args => path.resolve(args.path) === path.join(ROOT, COMPONENT)
        ? { contents: adopted, loader: 'tsx', resolveDir: path.dirname(args.path) } : undefined); } }] });
  const compiled = fs.readdirSync(tmp).filter(file => file.endsWith('.mjs')).sort();
  assert(compiled.includes('engine.mjs') && compiled.includes('component.mjs'));
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const reportFile = path.join(tmp, 'unit.json'), env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1',
    CM_OWN_CORE: path.join(tmp, 'engine.mjs'), CM_OWN_COMPONENT: path.join(tmp, 'component.mjs') };
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  receipt({ child: { status: run.status, signal: run.signal, error: run.error?.message || null } });
  assert(!run.error && !run.signal && run.status !== null && fs.existsSync(reportFile), 'Actual child must complete');
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught Exception|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError|ReferenceError|TypeError/.test(output), 'No setup or unrelated failure credit');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')), cases = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.testResults.length, 1); assert(!report.testResults[0].message); assert.equal(report.numTotalTests, 8); assert.equal(report.numPendingTests, 0);
  assert.deepEqual(cases.map(row => row.title).sort(), [...NAMES].sort()); assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = cases.filter(row => row.status === 'failed'), wanted = RED || CONTROL ? NAMES.slice(0, 3) : [];
  assert.deepEqual(failed.map(row => row.title).sort(), [...wanted].sort());
  for (const row of failed) assert(row.failureMessages.length && row.failureMessages.every(message =>
    /^AssertionError: legacy own-club display lost the actual saved roster: expected false to be true/s.test(message)), 'Only exact owned Boolean faults qualify');
  assert.equal(report.numFailedTests, wanted.length); assert.equal(report.numPassedTests, 8 - wanted.length); assert.equal(run.status, wanted.length ? 1 : 0);
  const uiRows = output.split('\n').filter(line => line.startsWith('CM_OWN_UI_RECEIPT:')).map(line => JSON.parse(line.slice('CM_OWN_UI_RECEIPT:'.length)));
  fs.writeFileSync(path.join(retained, 'rendered-states.json'), JSON.stringify(uiRows, null, 2) + '\n'); assert.equal(uiRows.length, 8);
  for (const [file, source] of sources) assert.equal(readLf(path.join(ROOT, file)), source);
  receipt({ status: 'complete', actualRenderedStates: uiRows.length, passed: report.numPassedTests, failed: wanted.length });
  console.log(`Actual current-roster screen: all8 named cases, ${report.numPassedTests} passes, ${wanted.length} exact Boolean faults, pending0.`);
  console.log(`Physical evidence: ${sources.size} before files, ${compiled.length} split-shared actual compiled files, eight full state/DOM receipts.`);
  console.log('Actual release, catalog signing and save loader prepare the first legacy case. Empty squad is explicitly prepared; historical data is the held era bake.');
  console.log('Own screen only. Engine, economics, RNG, ledger, legacy market policy and source inputs stay held; no browser or live claim.');
  console.log(`simClubDetailCurrentRoster ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
