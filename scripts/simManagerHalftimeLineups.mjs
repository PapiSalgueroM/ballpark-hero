/* Real halftime screen evidence. Execution, compilation and tests are remote CI only. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Halftime proof requires remote offline CI.');
const readLf = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'); /* Release BE: simHarnessAnchors, a CRLF checkout */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Release BE join (Round BEG): CM_HT_PARENT_REF names the tree without this packet on a newer core (the BE join passes the first parent of its m6 merge); 082fc277 on the packet branch. */
const PARENT = process.env.CM_HT_PARENT_REF || '082fc2774c8aa9f919c14efa33bfc3fbfc599597';
const TEST = 'src/test/managerHalftimeLineups.test.tsx', COMPONENT = 'src/components/club-manager/HalftimeScreen.tsx';
const CORE = 'src/lib/clubManager.ts', CONTROL = process.env.CM_HT_LINEUPS_CONTROL || '';
const RED = process.env.CM_HT_LINEUPS_EXPECT_RED === '1';
const PHASE = process.env.CM_HT_LINEUPS_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'));
assert(['', 'original'].includes(CONTROL) && !(RED && CONTROL));
const NAMES = [
  'halftime lineups missing: starting XIs are available at the interval',
  'halftime lineups missing: opposition has truthful provisional so-far grades',
  'halftime preservation: reading the actual interval holds all state and RNG',
  'halftime preservation: all three shape buttons keep their callbacks',
  'halftime preservation: team talk and second-half callbacks stay exact',
  'halftime preservation: a career without a live match stays empty',
];
const CAUSES = ['halftime starting XIs entry is missing', 'halftime opposition so-far grades are missing'];
const held = [COMPONENT, CORE, 'src/lib/clubManagerClock.ts', 'src/components/club-manager/TeamTalkRow.tsx',
  'src/hooks/useRevealScroll.ts', 'src/test/liveSimMotion.test.tsx'];
const files = [...held, TEST, 'scripts/simManagerHalftimeLineups.mjs', '.github/workflows/manager-halftime-lineups.yml',
  ...(RED ? [] : ['src/components/club-manager/HalftimeLineups.tsx', 'src/lib/clubManagerLiveLineups.ts', 'src/test/managerLiveLineups.test.ts'])];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = new Map(files.map(file => [file, readLf(path.join(ROOT, file))]));
const OUT = process.env.CM_HT_LINEUPS_OUT ? path.resolve(process.env.CM_HT_LINEUPS_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'manager-halftime-lineups-'));
assert(OUT !== ROOT && OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep));
const retained = path.join(OUT, CONTROL || PHASE); fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace halftime evidence.');
for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(child.status, 0); return child.stdout;
}
const parent = git(['show', PARENT + ':' + COMPONENT]), head = git(['rev-parse', 'HEAD']).trim();
const bindings = held.map(file => ({ file, parentSha256: sha(git(['show', PARENT + ':' + file])), candidateSha256: sha(sources.get(file)) }));
fs.writeFileSync(path.join(retained, 'HalftimeScreen.parent.tsx'), parent);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/halftime-lineups-')); let outcome = {};
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({
    parentRef: PARENT, head, phase: PHASE, control: CONTROL, bindings, ...outcome,
    sources: [...sources].map(([file, source]) => ({ file, beforeSha256: sha(source), afterSha256: sha(readLf(path.join(ROOT, file))) })),
  }, null, 2) + '\n');
}
try {
  receipt();
  for (const row of bindings) if (RED || row.file !== COMPONENT) assert.equal(row.candidateSha256, row.parentSha256, row.file + ': held parent differs.');
  const spans = [
    ["import { TeamTalkRow } from '@/components/club-manager/TeamTalkRow';",
      "import { TeamTalkRow } from '@/components/club-manager/TeamTalkRow';\nimport { HalftimeLineups } from '@/components/club-manager/HalftimeLineups';"],
    ['  const [picking, setPicking] = useState<string | null>(null);',
      '  const [picking, setPicking] = useState<string | null>(null);\n  const [readingLineups, setReadingLineups] = useState(false);'],
    ['  if (!live) return null;\n',
      '  if (!live) return null;\n  if (readingLineups) return <HalftimeLineups career={career} onBack={() => setReadingLineups(false)} />;\n'],
    ['      {/* ---- shape ---- */}',
      '      <button type="button" onClick={() => setReadingLineups(true)} className="w-full rounded-xl border border-border bg-card p-3 text-left text-sm font-bold text-foreground">Starting XIs</button>\n\n      {/* ---- shape ---- */}'],
  ];
  let planned = parent; const changes = [];
  for (const [anchor, replacement] of spans) {
    assert.equal(planned.split(anchor).length - 1, 1, 'One exact halftime integration span is required.');
    const offset = planned.indexOf(anchor); planned = planned.slice(0, offset) + replacement + planned.slice(offset + anchor.length);
    changes.push({ anchor, replacement, offset });
  }
  let inverse = planned;
  for (const change of [...changes].reverse()) {
    assert.equal(inverse.slice(change.offset, change.offset + change.replacement.length), change.replacement);
    inverse = inverse.slice(0, change.offset) + change.anchor + inverse.slice(change.offset + change.replacement.length);
  }
  assert.equal(inverse, parent); fs.writeFileSync(path.join(retained, 'HalftimeScreen.fixed-plan.tsx'), planned);
  fs.writeFileSync(path.join(retained, 'HalftimeScreen.inverse.tsx'), inverse);
  receipt({ integration: { changes, parentSha256: sha(parent), plannedSha256: sha(planned), inverseSha256: sha(inverse) } });
  assert.equal(sources.get(COMPONENT), RED ? parent : planned, 'Whole halftime source must equal the exact phase plan.');
  const adopted = CONTROL ? parent : sources.get(COMPONENT);
  if (CONTROL) {
    assert.notEqual(adopted, sources.get(COMPONENT)); fs.writeFileSync(path.join(retained, 'HalftimeScreen.control.tsx'), adopted);
    receipt({ sourceControl: { kind: 'whole-original-halftime', beforeSha256: sha(sources.get(COMPONENT)),
      faultSha256: sha(adopted), parentSha256: sha(parent), wholeCurrentInverseSha256: sha(planned) } });
    assert.equal(adopted, parent); assert.equal(planned, sources.get(COMPONENT));
  }
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: path.join(ROOT, CORE), component: path.join(ROOT, COMPONENT) }, outdir: tmp,
    bundle: true, splitting: true, format: 'esm', platform: 'node', jsx: 'automatic', outExtension: { '.js': '.mjs' },
    alias: { '@': path.join(ROOT, 'src') }, external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'], logLevel: 'error',
    plugins: [{ name: 'actual-halftime-source', setup(build) {
      build.onLoad({ filter: /\.tsx$/ }, args => path.resolve(args.path) === path.join(ROOT, COMPONENT)
        ? { contents: adopted, loader: 'tsx', resolveDir: path.dirname(args.path) } : undefined);
    } }] });
  const compiled = fs.readdirSync(tmp).filter(file => file.endsWith('.mjs')).sort();
  assert(compiled.includes('engine.mjs') && compiled.includes('component.mjs'));
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const reportFile = path.join(tmp, 'unit.json'), child = spawnSync(process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile],
    { cwd: ROOT, env: { ...process.env, CM_HT_CORE: path.join(tmp, 'engine.mjs'), CM_HT_COMPONENT: path.join(tmp, 'component.mjs'),
      FORCE_COLOR: '0', NO_COLOR: '1' }, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (child.stdout || '') + (child.stderr || ''); fs.writeFileSync(path.join(retained, 'unit.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  receipt({ child: { status: child.status, signal: child.signal, error: child.error?.message || null } });
  const fixtures = output.split('\n').filter(line => line.startsWith('CM_HT_UI_RECEIPT:')).map(line => JSON.parse(line.slice('CM_HT_UI_RECEIPT:'.length)));
  fs.writeFileSync(path.join(retained, 'prepared-states.json'), JSON.stringify(fixtures, null, 2) + '\n');
  assert(!child.error && !child.signal && child.status !== null && fs.existsSync(reportFile), 'Actual halftime child must complete.');
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught Exception|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError|ReferenceError|TypeError/.test(output), 'No setup or unrelated failure credit.');
  const raw = JSON.parse(fs.readFileSync(reportFile, 'utf8')), cases = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.testResults.length, 1); assert(!raw.testResults[0].message); assert.equal(raw.numTotalTests, 6); assert.equal(raw.numPendingTests, 0);
  assert.deepEqual(cases.map(row => row.title).sort(), [...NAMES].sort()); assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const wanted = RED || CONTROL ? NAMES.slice(0, 2) : [], failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), [...wanted].sort());
  for (const row of failed) {
    const cause = CAUSES[NAMES.indexOf(row.title)];
    assert(row.failureMessages.length && row.failureMessages.every(message => message.startsWith('AssertionError: ' + cause + ': expected false to be true')),
      'Only the two exact actual missing-feature Booleans qualify.');
  }
  assert.equal(raw.numFailedTests, wanted.length); assert.equal(raw.numPassedTests, 6 - wanted.length); assert.equal(child.status, wanted.length ? 1 : 0);
  assert.deepEqual(fixtures.map(row => row.name), ['entry', 'opposition', 'readonly', 'shape', 'talk-and-second-half', 'not-live']);
  for (const row of fixtures) {
    assert(row.clock === '2026-10-14T00:00:00Z' && row.entries.length > 0 && row.entries.length <= 8 && row.state.live);
    assert(row.draws.length > 0 && row.draws.every((draw, index) => draw.ordinal === index + 1 && draw.value === 0.6
      && (draw.phase === 'startCareer' || /^playNextEntry:[1-8]$/.test(draw.phase))));
  }
  for (const [file, source] of sources) assert.equal(readLf(path.join(ROOT, file)), source);
  receipt({ status: 'complete', passed: raw.numPassedTests, failed: wanted.length, actualPreparedIntervals: fixtures.length });
  console.log('Actual halftime UI: six named cases, ' + raw.numPassedTests + ' preserves/passes, ' + wanted.length + ' exact owned Boolean faults, pending0.');
  console.log('Physical evidence: ' + sources.size + ' original source copies and ' + compiled.length + ' actual split-shared compiled modules.');
  console.log('Six complete actual started-match states and finite recorded0.6 inputs are retained. No fabricated first-half lines, seed search or natural-rate claim.');
  console.log('Core, final-whistle ratings, assists, economics, old callbacks and input states stay held. No browser, full career or live claim.');
  console.log('simManagerHalftimeLineups ' + (RED ? 'expected baseline red' : CONTROL || 'normal') + ': green.');
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
