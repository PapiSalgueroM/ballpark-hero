/* Round 937: active purchased recovery, exact injury selection and held severity, entirely offline. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sports = ['nfl', 'nba', 'mlb', 'nhl'];
const runtime = sports.map(sport => `src/lib/${sport}MyCareer.ts`);
const helper = 'src/lib/usCareerRecovery.ts', test = 'src/lib/usCareerRecovery.test.ts';
const files = [...runtime, helper, test, ...sports.map(sport => `src/lib/${sport}CareerCorruption.ts`), 'src/lib/usCareerAnnualBenefits.ts', 'src/lib/careerHeadroom.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const sources = new Map(held.map(([file, value]) => [file, value.source]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const preHashes = {
  nfl: 'b5457727d0e0270118ca2f34f03283ca2804f8a606ad8e1aff74a14bb5a59940',
  nba: '255e74c01bd54e8395090f266cb9a7b9d2e97674b41b335107f1df6745eca014',
  mlb: 'a1ef5d8debb0b8447543e22d3c36d96b14500d1059c3a5c69499b83701b47201',
  nhl: 'b7dcdc76a9068b0d408873c58fdd9656a6a67daaa562de2ca96c9e950f67b2a9',
};
const expressions = {
  nfl: "(1 - c.archetype.durability) * 0.5 + (100 - c.health) / 260 + (c.pos === 'RB' ? 0.07 : 0)",
  nba: '(1 - c.archetype.durability) * 0.5 + (100 - c.health) / 240',
  mlb: '(1 - c.archetype.durability) * 0.55 + (100 - c.health) / 250',
  nhl: '(1 - c.archetype.durability) * 0.5 + (100 - c.health) / 250',
};
const wrapper = sport => `const risk = careerRecoveryRisk('${sport}', c.purchased, ${expressions[sport]});`;
const titles = [
  'reduces injury selection across every supported position and depleted through full health',
  'shop quotes the actual simulation percentage while holding purchase price and upkeep',
  'JSON-restored and duplicate service receipts retain one real benefit without immunity',
  'matched injured and healthy branches keep exact severity season state and RNG draws',
  'actual liquidation cancels recovery for future seasons and JSON reload',
  'unowned unknown and other-sport receipts keep exact original season behavior',
];
const pureTitle = 'reduces chance by exactly one quarter for only the matching active service without mutating ownership';
const names = (indices, subset = sports) => subset.flatMap(sport => indices.map(index => `'${sport}' ${titles[index]}`));
const controls = {
  benefit: [helper, 'risk * 0.75', 'risk', [pureTitle, ...names([0, 2, 4])]],
  rate: [helper, 'risk * 0.75', 'risk * 0.5', [pureTitle, ...names([0, 2])]],
  id: [helper, "nfl: 'recovery_suite'", "nfl: 'unknown_receipt'", [pureTitle, ...names([0, 2, 4, 5], ['nfl'])]],
  duplicate: [helper, 'risk * 0.75', 'risk * Math.pow(0.75, (purchased ?? []).filter(id => id === RECOVERY_ITEMS[sport]).length)', [pureTitle, ...names([2])]],
  draw: [runtime[0], wrapper('nfl'), wrapper('nfl') + " if (c.purchased?.includes('recovery_suite')) rng();", names([0, 2, 3], ['nfl'])],
  copy: [runtime[0], "effect: '25% lower simulated injury risk'", "effect: '25% higher simulated injury risk'", names([1], ['nfl'])],
  ...Object.fromEntries(sports.map(sport => [sport + 'Wrap', [`src/lib/${sport}MyCareer.ts`, wrapper(sport), `const risk = ${expressions[sport]};`, names([0, 2, 4], [sport])]])),
};
const control = process.env.US_CAREER_RECOVERY_CONTROL || '';
assert.ok(!control || control === 'before' || control in controls, 'Known recovery control');
function replaceOnce(source, old, next) {
  assert.equal(source.split(old).length - 1, 1, 'One executable source binding');
  assert.equal(holdSource(Buffer.from(source.replaceAll('\n', '\r\n'))).source.split(old).length - 1, 1, 'Same CRLF source binding');
  const changed = source.replace(old, next); assert.notEqual(changed, source); return changed;
}
function neutralized(file) {
  const sport = path.basename(file).slice(0, 3); let source = sources.get(file);
  source = replaceOnce(source, "import { careerRecoveryRisk } from './usCareerRecovery';\n", '');
  source = replaceOnce(source, wrapper(sport), `const risk = ${expressions[sport]};`);
  source = replaceOnce(source, "effect: '25% lower simulated injury risk'", "effect: 'Injury risk down'");
  return replaceOnce(source, '. Injuries can still happen.', '');
}
const references = new Map(runtime.map(file => [file, neutralized(file)]));
const referenceHashes = Object.fromEntries([...references].map(([file, source]) => [path.basename(file).slice(0, 3), sha(source)]));
const referenceMatchesPre937 = sports.every(sport => referenceHashes[sport] === preHashes[sport]);
const referenceLabel = referenceMatchesPre937 ? 'physical pre937 source' : 'current 937-neutralized source';
const subjects = new Map(sources);
if (control === 'before') for (const [file, source] of references) subjects.set(file, source);
else if (control) {
  const [file, anchor, changed] = controls[control]; subjects.set(file, replaceOnce(subjects.get(file), anchor, changed));
}
const resolve = source => source.replace(/(from\s+['"])\.\//g, '$1@/lib/');
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-career937-proof-'));
let folder, summary; const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/career937-'));
  const write = async (name, contents) => { const file = path.join(folder, name); owned.push(file); await writeFile(file, contents); return file; };
  const referenceAliases = {}, subjectAliases = {};
  for (const file of [...runtime, helper]) {
    const key = '@/lib/' + path.basename(file, '.ts');
    subjectAliases[key] = await write('subject-' + path.basename(file), resolve(subjects.get(file)));
    if (references.has(file)) referenceAliases[key] = await write('reference-' + path.basename(file), resolve(references.get(file)));
  }
  const entry = await write('baseline.mjs', sports.map(sport => `export * as ${sport} from '@/lib/${sport}MyCareer';`).join('\n'));
  const bundles = {};
  for (const [name, aliases] of [['reference', referenceAliases], ['subject', subjectAliases]]) {
    const outfile = path.join(folder, name + '.mjs'); owned.push(outfile);
    const out = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, alias: { ...aliases, '@': path.join(root, 'src') }, logLevel: 'error', metafile: true });
    assert.ok(!Object.keys(out.metafile.inputs).some(file => /integrations\/supabase|fetchPlayers/.test(file)), 'Pure engine bundles contain no database client');
    bundles[name] = await import(pathToFileURL(outfile).href);
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const rng = seed => { let state = seed >>> 0, count = 0; return { count: () => count, draw: () => { count++; state = (state + 0x6d2b79f5) >>> 0; let t = Math.imul(state ^ (state >>> 15), state | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } }; };
  let baselineSeasons = 0, baselinePositions = 0;
  for (const sport of sports) {
    const before = bundles.reference[sport], after = bundles.subject[sport];
    const ctor = sport === 'nfl' ? 'startCareer' : `start${sport[0].toUpperCase() + sport.slice(1)}Career`;
    const archetypes = sport === 'nfl' ? 'ARCHETYPES' : `${sport.toUpperCase()}_ARCHETYPES`;
    const sim = sport === 'nfl' ? 'simSeason' : `sim${sport[0].toUpperCase() + sport.slice(1)}Season`;
    const progress = sport === 'nfl' ? 'progress' : sport + 'Progress';
    for (const position of Object.keys(before[archetypes])) for (const health of [0, 40, 70, 100]) for (const seed of [4, 17, 31]) {
      const ar = rng(seed), br = rng(seed);
      const a = before[ctor]('Fictional unchanged position', position, before[archetypes][position][0], ar.draw);
      const b = after[ctor]('Fictional unchanged position', position, after[archetypes][position][0], br.draw);
      a.health = b.health = health; a.purchased = b.purchased = ['unknown_future_receipt'];
      assert.deepEqual(after[sim](b, 80, br.draw), before[sim](a, 80, ar.draw));
      assert.deepEqual(clone(b), clone(a)); assert.equal(br.count(), ar.count()); baselinePositions++;
    }
    for (const seed of [17, 31]) {
      const position = { nfl: 'WR', nba: 'SG', mlb: 'SS', nhl: 'C' }[sport];
      const ar = rng(seed), br = rng(seed);
      const a = before[ctor]('Fictional unowned baseline', position, before[archetypes][position][0], ar.draw);
      const b = after[ctor]('Fictional unowned baseline', position, after[archetypes][position][0], br.draw);
      a.purchased = b.purchased = ['unknown_future_receipt'];
      for (let year = 0; year < 6; year++) {
        assert.deepEqual(after[sim](b, 80, br.draw), before[sim](a, 80, ar.draw));
        assert.deepEqual(after[progress](b, br.draw), before[progress](a, ar.draw));
        assert.deepEqual(clone(b), clone(a), 'Unsupported ownership retains complete season/save');
        assert.equal(br.count(), ar.count(), 'Original RNG draw count held'); baselineSeasons++;
      }
    }
  }
  const reportFile = path.join(receipts, 'vitest.json');
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1', NO_DOUBLE_SWAP: JSON.stringify(subjectAliases) };
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile.json=' + reportFile], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(receipts, 'child.log'), output);
  assert.ok(!run.error && !run.signal, 'Focused child finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 25); assert.equal(report.numPendingTests, 0); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'));
  const failed = rows.filter(row => row.status === 'failed');
  const expected = control === 'before' ? names([0, 1, 2, 4]) : control ? controls[control][3] : [];
  assert.deepEqual(failed.map(row => row.title).sort(), expected.slice().sort(), 'Only exact intended copied outcomes reject');
  assert.equal(run.status, expected.length ? 1 : 0); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 25 - expected.length);
  for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError(?: \[ERR_ASSERTION\])?:|Error: expect\(|expected .* to (?:be|equal|deeply)/);
  for (const title of names([3, 5])) if (!expected.includes(title)) assert.equal(rows.find(row => row.title === title)?.status, 'passed', 'Independent original branch/unknown baseline held');
  summary = { control: control || 'normal', executed: 25, passed: 25 - failed.length, rejected: failed.map(row => ({ title: row.title, messages: row.failureMessages })), baselineSeasons, baselinePositions, referenceHashes, referenceMatchesPre937, sourceHashes: Object.fromEntries(held.map(([file, { bytes }]) => [file, sha(bytes)])), pending: 0, unhandled: 0, cleanup: false };
  console.log(`Career recovery ${control || 'normal'}: all 25 actual-engine cases executed, ${25 - failed.length} held and ${failed.length} exact intended rejects.`);
  console.log('Career recovery: actual purchases, matching ownership, JSON restore, two seasons, duplicate receipts and canceled services checked.');
  console.log('Career recovery: original injury severity/state/draw branches, exact shop percentage and prices checked; failed controls do not claim completion of each dense grid.');
  console.log(`Career recovery: ${baselinePositions} all-position unowned seasons and ${baselineSeasons} continued full unowned seasons/save/RNG outputs match ${referenceLabel}.`);
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Runtime, tests and existing annual support raw bytes held');
  }
  if (summary) { summary.cleanup = true; await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify(summary, null, 2)); }
}
console.log(`Career recovery: CRLF bindings/raw bytes held, owned copies cleaned; receipts ${receipts}.`);
console.log('Career recovery: fictional offline engine fixtures, no native UI, full-career completion, medical effect or real sports-stat claim.');
