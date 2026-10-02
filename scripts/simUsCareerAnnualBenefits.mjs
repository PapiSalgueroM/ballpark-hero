/* Round 905: real purchases, annual support and actual liquidation, entirely offline. */
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
const runtime = sports.flatMap(sport => [`src/lib/${sport}MyCareer.ts`, `src/lib/${sport}CareerCorruption.ts`]);
const helper = 'src/lib/usCareerAnnualBenefits.ts', test = 'src/lib/usCareerAnnualBenefits.test.ts';
const files = [...runtime, helper, test, 'src/lib/careerHeadroom.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const sources = new Map(held.map(([file, value]) => [file, value.source]));
const hashes = {
  'nflMyCareer.ts': '38739b280ad161985c401323f1dedf2272540aa80e6206600b06954340cff5d8',
  'nbaMyCareer.ts': 'b1f5ff5e4f80dfa365dc313a872051bed1482526cc1a20261a8ca021a192670c',
  'mlbMyCareer.ts': '3aab46eccfe625d9e8f5ec5bb151a40a8d1d0fd91f4015da8dfa9df2236baf6b',
  'nhlMyCareer.ts': 'd984e1e945b3ba5b78778bae22ceeacd5a39bc4bb747bc218af831489c7fe2d5',
  'nflCareerCorruption.ts': 'c7238453e94e34ba93f2a3b3e43eda953fbf4225a1b52fe47c35e67fde8e811b',
  'nbaCareerCorruption.ts': '6caaca935562277f08878971628e6a845c6bc44dc5317a30f6f197aa2a4dccfe',
  'mlbCareerCorruption.ts': '82312c766627533288f40e55bbe5668b9c8e0633659428e5113c4481ae3620ba',
  'nhlCareerCorruption.ts': 'bc11a7e78cf07a893a3394970e6c714e5702d82efdae4d21f173bdb938f7d1ad',
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const titles = [
  'pays each advertised recurring item after a real bought season with the same RNG and upkeep',
  'keeps support through two seasons and JSON restore without repeating duplicate ownership or upkeep',
  'uses the completed season age for the last young coaching benefit and stops next year',
  'clamps actual support at potential and 100 and reports only the earned amounts',
  'liquidation removes recurring support and assets while holding earned training, gifts, payout and portfolio',
  'keeps permanent purchases blocked but lets canceled support be hired and charged again',
  'holds empty, unknown and completed-only ownership plus both other financial event choices',
];
const names = (indices, subset = sports) => subset.flatMap(sport => indices.map(index => `'${sport.toUpperCase()}' ${titles[index]}`));
const controls = {
  chef: [helper, "4 * has(nfl ? 'private_chef' : `chef_${sport}`)", "0 * has(nfl ? 'private_chef' : `chef_${sport}`)", names([0, 1, 5])],
  cap: [helper, 'c.ovr = raiseWithinPotential(c.ovr, c.pot, rating);', 'c.ovr += rating;', names([3])],
  age: [helper, 'const young = seasonAge <=', 'const young = c.age <=', names([2])],
  duplicate: [helper, 'const has = (id: string) => owned.has(id) ? 1 : 0;', 'const has = (id: string) => (c.purchased ?? []).filter(item => item === id).length;', names([1])],
  ownership: [helper, 'if ((item.yearly ?? 0) > 0) return false;', 'if ((item.yearly ?? 0) > 0) return true;', names([4, 5])],
  permanent: [helper, "return item.category === 'body' || item.category === 'family' || permanentReceipts.has(id);", 'return false;', names([4, 5])],
  unknown: [helper, 'if (!item) return true;', 'if (!item) return false;', names([4])],
  note: [helper, 'Yearly support: ${gains.join', 'Annual benefits: ${gains.join', names([0, 1, 2, 3, 5])],
  nflCall: ['src/lib/nflMyCareer.ts', "const support = applyUsCareerAnnualBenefits(c, 'nfl', c.age - 1);", 'const support = null;', names([0, 1, 2, 3, 5], ['nfl'])],
  payout: ['src/lib/nflCareerCorruption.ts', 'D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) + 4) * 10) / 10; liquidateUsCareerPurchases', 'D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) + 5) * 10) / 10; liquidateUsCareerPurchases', names([4], ['nfl'])],
};
const control = process.env.US_CAREER_ANNUAL_CONTROL || '';
const lockOriginal = process.env.US_CAREER_ANNUAL_LOCK_ORIGINAL === '1';
assert.ok(!control || control === 'before' || control in controls, 'Known yearly support control');
function replaceOnce(source, old, next) {
  assert.equal(source.split(old).length - 1, 1, 'One executable source binding');
  assert.equal(holdSource(Buffer.from(source.replaceAll('\n', '\r\n'))).source.split(old).length - 1, 1, 'Same CRLF source binding');
  const changed = source.replace(old, next); assert.notEqual(changed, source); return changed;
}
function original(file) {
  const sport = path.basename(file).slice(0, 3); let source = sources.get(file);
  if (file.endsWith('MyCareer.ts')) {
    source = replaceOnce(source, "import { applyUsCareerAnnualBenefits } from './usCareerAnnualBenefits';\n", '');
    source = replaceOnce(source, `  const support = applyUsCareerAnnualBenefits(c, '${sport}', c.age - 1);\n  if (support) notes.push(support);\n`, '');
    source = replaceOnce(source, `Rating +1 each offseason through age ${sport === 'nfl' || sport === 'mlb' ? 26 : 25}, up to your ceiling`, 'Rating +1 a year while young');
    if (sport === 'mlb') source = replaceOnce(source, 'Every meal built for a baseball season, 150k a year', 'Every meal built for 82 games, 150k a year');
    if (sport === 'mlb' || sport === 'nhl') {
      const label = sport === 'mlb' ? 'Private Cage And Gym' : 'Private Rink And Gym';
      source = replaceOnce(source, `name: '${label}', emoji: '${sport === 'mlb' ? '⚾' : '🏒'}'`, `name: '${label}', emoji: '🏀'`);
      source = replaceOnce(source, `Cuts your ${sport === 'mlb' ? 'plate appearances and pitching outings' : 'shifts and goalie sequences'} by 6am`, 'Cuts every possession you played by 6am');
    }
  } else {
    source = replaceOnce(source, "import { liquidateUsCareerPurchases } from './usCareerAnnualBenefits';\n", '');
    source = replaceOnce(source, `, ${sport.toUpperCase()}_SPEND_ITEMS } from './${sport}MyCareer';`, ` } from './${sport}MyCareer';`);
    source = replaceOnce(source, `liquidateUsCareerPurchases(cc, ${sport.toUpperCase()}_SPEND_ITEMS);`, sport === 'nfl' ? 'cc.yearlyCosts = 0;' : 'D(cc).yearlyCosts = 0;');
    source = replaceOnce(source, "label: 'Sell lifestyle assets and cancel services'", "label: 'Sell everything and start over'");
    source = replaceOnce(source, ' Your yearly lifestyle services are canceled. Past training and gifts stay earned.', '');
  }
  if (lockOriginal) assert.equal(sha(source), hashes[path.basename(file)], 'Physical pre905 source byte content held after CRLF normalization');
  return source;
}
const originals = new Map(runtime.map(file => [file, original(file)]));
const referenceHashes = Object.fromEntries([...originals].map(([file, source]) => [path.basename(file), sha(source)]));
const referenceMatchesPre905 = Object.entries(referenceHashes).every(([file, hash]) => hash === hashes[file]);
const referenceLabel = referenceMatchesPre905 ? 'physical pre905 source' : 'current 905-neutralized source';
const subjects = new Map(sources);
if (control === 'before') for (const [file, source] of originals) subjects.set(file, source);
else if (control) {
  const [file, anchor, changed] = controls[control]; subjects.set(file, replaceOnce(subjects.get(file), anchor, changed));
}
const resolve = source => source.replace(/(from\s+['"])\.\//g, '$1@/lib/');
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-career905-proof-'));
let folder; const owned = [];
let summary;
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/career905-'));
  const write = async (name, contents) => { const file = path.join(folder, name); owned.push(file); await writeFile(file, contents); return file; };
  const originalAliases = {}, subjectAliases = {};
  for (const file of [...runtime, helper]) {
    const key = '@/lib/' + path.basename(file, '.ts');
    subjectAliases[key] = await write('subject-' + path.basename(file), resolve(subjects.get(file)));
    if (originals.has(file)) originalAliases[key] = await write('original-' + path.basename(file), resolve(originals.get(file)));
  }
  const baselineEntry = await write('baseline.mjs', sports.map(sport => `export * as ${sport} from '@/lib/${sport}MyCareer';`).join('\n'));
  const bundles = {};
  for (const [name, aliases] of [['original', originalAliases], ['subject', subjectAliases]]) {
    const outfile = path.join(folder, name + '.mjs'); owned.push(outfile);
    const out = await build({ entryPoints: [baselineEntry], bundle: true, format: 'esm', platform: 'node', outfile, alias: { ...aliases, '@': path.join(root, 'src') }, logLevel: 'error', metafile: true });
    assert.ok(!Object.keys(out.metafile.inputs).some(file => /integrations\/supabase|fetchPlayers/.test(file)), 'Pure engine bundles contain no database client');
    bundles[name] = await import(pathToFileURL(outfile).href);
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const rng = seed => { let state = seed >>> 0, count = 0; return { count: () => count, draw: () => { count++; state = (state + 0x6d2b79f5) >>> 0; let t = Math.imul(state ^ (state >>> 15), state | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } }; };
  let baselineSeasons = 0;
  for (const sport of sports) for (const seed of [17, 31]) {
    const before = bundles.original[sport], after = bundles.subject[sport];
    const ctor = sport === 'nfl' ? 'startCareer' : `start${sport[0].toUpperCase() + sport.slice(1)}Career`;
    const archetypes = sport === 'nfl' ? 'ARCHETYPES' : `${sport.toUpperCase()}_ARCHETYPES`;
    const position = { nfl: 'WR', nba: 'SG', mlb: 'SS', nhl: 'C' }[sport];
    const sim = sport === 'nfl' ? 'simSeason' : `sim${sport[0].toUpperCase() + sport.slice(1)}Season`;
    const progress = sport === 'nfl' ? 'progress' : sport + 'Progress';
    const ar = rng(seed), br = rng(seed);
    const a = before[ctor]('Fictional unowned baseline', position, before[archetypes][position][0], ar.draw);
    const b = after[ctor]('Fictional unowned baseline', position, after[archetypes][position][0], br.draw);
    a.purchased = ['unknown_future_receipt']; b.purchased = ['unknown_future_receipt'];
    for (let year = 0; year < 6; year++) {
      assert.deepEqual(after[sim](b, 80, br.draw), before[sim](a, 80, ar.draw));
      assert.deepEqual(after[progress](b, br.draw), before[progress](a, ar.draw));
      assert.deepEqual(clone(b), clone(a), 'No supported ownership retains the complete original season/save');
      assert.equal(br.count(), ar.count(), 'Original RNG draw count held'); baselineSeasons++;
    }
  }
  const reportFile = path.join(receipts, 'vitest.json');
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1', NO_DOUBLE_SWAP: JSON.stringify(subjectAliases) };
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile.json=' + reportFile], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(receipts, 'child.log'), output);
  assert.ok(!run.error && !run.signal, 'Focused child finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 28); assert.equal(report.numPendingTests, 0); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'));
  const failed = rows.filter(row => row.status === 'failed');
  const expected = control === 'before' ? names([0, 1, 2, 3, 4, 5]) : control ? controls[control][3] : [];
  assert.deepEqual(failed.map(row => row.title).sort(), expected.slice().sort(), 'Only the exact intended outcomes reject the copied control');
  assert.equal(run.status, expected.length ? 1 : 0); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 28 - expected.length);
  for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|Error: expect\(|expected .* to (?:be|equal|deeply)/);
  for (const title of names([6])) assert.equal(rows.find(row => row.title === title)?.status, 'passed', 'Independent legacy/unknown/other-option baselines held');
  summary = { control: control || 'normal', executed: 28, passed: 28 - failed.length, rejected: failed.map(row => ({ title: row.title, messages: row.failureMessages })), baselineSeasons, originalHashes: hashes, referenceHashes, referenceMatchesPre905, lockOriginal, sourceHashes: Object.fromEntries(held.map(([file, { bytes }]) => [file, sha(bytes)])), pending: 0, unhandled: 0, cleanup: false };
  console.log(`Career yearly support ${control || 'normal'}: all 28 actual-engine cases executed, ${28 - failed.length} held and ${failed.length} exact intended rejects.`);
  console.log('Career yearly support: actual purchases, same-RNG seasons, two-season JSON recovery, young boundary, caps and exact yearly bills checked.');
  console.log('Career yearly support: actual liquidation, permanent one-time locks, rehired chef and unchanged other financial choices checked.');
  console.log(`Career yearly support: ${baselineSeasons} full unowned/unknown seasons/save outputs and RNG counts match the ${referenceLabel}.`);
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Runtime, test and existing headroom raw bytes held');
  }
  if (summary) { summary.cleanup = true; await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify(summary, null, 2)); }
}
console.log(`Career yearly support: CRLF bindings/raw bytes held, owned copies cleaned; receipts ${receipts}.`);
console.log('Career yearly support: fictional offline engine fixtures only, no native UI, full career completion or historical-data validation claim.');
