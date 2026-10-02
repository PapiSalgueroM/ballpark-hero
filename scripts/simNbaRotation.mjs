/* Round 887: actual rotation outcomes, original campaign fingerprints and executable controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = ['src/lib/nbaRotation.ts', 'src/lib/nbaFrontOffice.ts', 'src/lib/nbaSeasonStats.ts'];
const test = 'src/lib/nbaRotation.test.ts';
const files = [...modules, test, 'src/lib/foSeasonStats.ts', 'src/lib/foNames.ts', 'src/lib/entityIds.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/nbaLuxuryTax.ts', 'src/lib/foSchedule.ts', 'src/data/conquestDataNba.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = [
  "holds physical original automatic campaigns and RNG fingerprints as an independent baseline",
  "keeps automatic tie order, empty fallback and fixed minutes as an independent baseline",
  "changes starter and bench strength only after a deliberate owned slot swap",
  "puts a chosen bench prospect on the real box and keeps the original five starters",
  "covers only the injured preferred hole and restores it without rewriting preferences",
  "keeps uncovered manual starter holes from stealing bench minutes and starter status",
  "retains the original all-injured emergency box and points identity for manual and automatic teams",
  "refuses invalid, foreign, injured and identical choices without changing raw team state",
  "reads malformed or duplicate saved preferences safely and repairs them only explicitly",
  "repairs successful releases and signs while failed moves stay byte-identical",
  "reconciles both clubs after an accepted trade while refusals mutate neither",
  "reconciles both clubs after an accepted talks while refusals mutate neither",
  "reconciles restored identity repair while preserving the original repaired-ID count",
  "reconciles real offseason retirement and expiring contracts before the next tip-off",
  "keeps a manual prospect playing through season, postseason, summer and a resumed next season",
  "measures a paired complete-regular-season effect for weaker starters with identical draw counts"
];
const controls = {
  "strength": [
    "src/lib/nbaFrontOffice.ts",
    "  const slots = nbaRotationSlots(t);\n  const five = slots.slice(0, 5).filter((p): p is NbaGmPlayer => !!p);\n  const bench = slots.slice(5, 8).filter((p): p is NbaGmPlayer => !!p);",
    "  const healthy = [...t.players].filter(p => p.out === 0).sort((a, b) => b.ovr - a.ovr);\n  const five = healthy.slice(0, 5);\n  const bench = healthy.slice(5, 8);",
    [
      2,
      3,
      5,
      15
    ]
  ],
  "box": [
    "src/lib/nbaSeasonStats.ts",
    "  const slots = nbaRotationSlots(t);",
    "  const slots = [...t.players].filter(p => p.out === 0).sort((a, b) => b.ovr - a.ovr).slice(0, 8);",
    [
      3,
      5,
      14
    ]
  ],
  "cover": [
    "src/lib/nbaRotation.ts",
    "  const spare = healthy.filter(p => !reserved.has(p.id));",
    "  const spare = [...healthy];",
    [
      4,
      5
    ]
  ],
  "holes": [
    "src/lib/nbaRotation.ts",
    "    return p?.out === 0 ? p : spare.shift();\n  });",
    "    return p?.out === 0 ? p : spare.shift();\n  }).filter((p): p is NbaGmPlayer => !!p);",
    [
      5,
      6
    ]
  ],
  "healthy": [
    "src/lib/nbaRotation.ts",
    "p.id === playerId && p.out === 0",
    "p.id === playerId",
    [
      7
    ]
  ],
  "swap": [
    "src/lib/nbaRotation.ts",
    "  if (other >= 0) slots[other] = slots[index];",
    "  void other;",
    [
      2,
      4,
      5,
      6
    ]
  ],
  "auto": [
    "src/lib/nbaRotation.ts",
    "  delete t.rotation;",
    "  void t.rotation;",
    [
      2,
      8
    ]
  ],
  "shape": [
    "src/lib/nbaRotation.ts",
    " && new Set(value).size === value.length",
    "",
    [
      8
    ]
  ],
  "release": [
    "src/lib/nbaFrontOffice.ts",
    "  if (released) nbaReconcileRotation(t);",
    "  void released;",
    [
      9
    ]
  ],
  "sign": [
    "src/lib/nbaFrontOffice.ts",
    "  t.players.push(p);\n  nbaReconcileRotation(t);",
    "  t.players.push(p);",
    [
      9
    ]
  ],
  "trade": [
    "src/lib/nbaFrontOffice.ts",
    "  nbaReconcileRotation(my); nbaReconcileRotation(their);\n  return 'accepted';",
    "  return 'accepted';",
    [
      10
    ]
  ],
  "talks": [
    "src/lib/nbaFrontOffice.ts",
    "  nbaReconcileRotation(my); nbaReconcileRotation(their);\n  return 'done';",
    "  return 'done';",
    [
      11
    ]
  ],
  "restore": [
    "src/lib/nbaFrontOffice.ts",
    "  for (const t of Object.values(lg.teams)) nbaReconcileRotation(t);",
    "  void lg;",
    [
      12
    ]
  ],
  "offseason": [
    "src/lib/nbaFrontOffice.ts",
    "    nbaReconcileRotation(t);\n  }\n  league.freeAgents =",
    "  }\n  league.freeAgents =",
    [
      13
    ]
  ],
  "emergency": [
    "src/lib/nbaSeasonStats.ts",
    "slots.some(p => !!p)",
    "slots.length > 0",
    [
      6
    ]
  ],
  "rng": [
    "src/lib/nbaFrontOffice.ts",
    "export function initNbaLeague(rng: () => number = Math.random): NbaLeague {",
    "export function initNbaLeague(rng: () => number = Math.random): NbaLeague {\n  rng();",
    [
      0
    ]
  ]
};

const control = process.env.NBA_ROTATION_CONTROL || '';
assert.ok(!control || control in controls, 'Known NBA rotation control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  assert.equal(source.split(anchor).length - 1, 1, 'Control binds one executable expression');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const bytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Same expression binds after CRLF normalization');
  assert.deepEqual(crlfBytes, bytes, 'CRLF bytes held');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nba-rotation887-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  const aliases = {};
  for (const file of modules) {
    let source = held.find(([name]) => name === file)[1].source;
    if (control && controls[control][0] === file) {
      const [, anchor, replacement] = controls[control];
      const changed = source.replace(anchor, replacement);
      assert.notEqual(changed, source, 'Control changes executable code');
      source = changed;
    }
    source = source.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    const copy = path.join(folder, path.basename(file)); await writeFile(copy, source); owned.push(copy);
    aliases['@/' + file.slice(4).replace(/\.ts$/, '')] = copy;
  }
  env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'One-worker engine runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 16);
  assert.deepEqual(rows.map(row => row.title), titles, 'All original engine outcomes execute');
  assert.ok(rows.every(row => row.status === 'failed' || row.status === 'passed'), 'No skipped, pending or filtered cases');
  if (control) {
    const indices = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, indices.length); assert.equal(report.numPassedTests, 16 - indices.length);
    assert.deepEqual(failed.map(row => row.title).sort(), indices.map(i => titles[i]).sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:/);
    for (const index of [0, 1]) if (!indices.includes(index)) assert.equal(rows[index].status, 'passed', 'Independent physical-original or fixed-auto baseline held');
    console.log(`NBA rotation ${control}: ${indices.length} exact intended failures, ${16 - indices.length} independent passes; all16 execute.`);
    console.log(`NBA_ROTATION_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })) })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 16); assert.equal(report.numFailedTests, 0);
    console.log('NBA rotation:16/16 actual-engine cases passed; no cases skipped.');
    console.log('NBA rotation: six physical pre887 merged851 campaign fingerprints and exact RNG draw counts held through season, play-in/playoffs, draft, tax/awards, summer and next season, covering fresh80-game and missing-schedule legacy saves.');
    console.log('NBA rotation: chosen starters and bench affect actual strength, box participation and season lines; eighteen paired full regular seasons hold measured performance margins and draw counts.');
    console.log('NBA rotation: injuries cover only available holes, healed preferences return, uncovered holes retain bench slots, and original all-injured emergency boxes keep points identity.');
    console.log('NBA rotation: actual accepted roster moves/restore/offseason repair departed IDs; invalid and unchanged input leaves raw state intact; Auto restores the original selection.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original engine, test and source dataset bytes held');
  }
}
console.log('NBA rotation: executable CRLF controls bind, raw bytes held and owned copies cleaned. Engine simulations do not prove native UI, storage recovery or real-world roster accuracy.');
