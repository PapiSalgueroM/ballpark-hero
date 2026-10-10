/* Round 888: a poaching bonus requires an actual new chair. Offline real-engine proof. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = 'src/lib/usCoachCareer.ts', test = 'src/lib/usCoachPoaching.test.ts';
/* Round 1103: the four six season scouts each coaching career starts from are a recording, not a fresh run of
   the NBA player engine. They were played on a seeded stream the coach engine then carries on down, so every
   pinned [seed, year] below rode on every draw the PLAYER engine takes, and a round that moved the NBA stat
   line turned this proof about coaches red. The recording (scripts/recordUsCoachPoachingScouts.mjs, made on
   main before that round) holds each scout and the draws he used; the stream is wound on by that many, and
   every coaching season is still played here on the real engine. No pin and no assertion changed.
   scripts/simUsCoachCareer.mjs is where a scout made by today's player engine starts a coaching career. */
const scoutsFile = 'src/test/fixtures/usCoachPoachingScouts888.json';
const files = [engine, test, 'src/lib/usCareerToCoach.ts', 'src/lib/nbaMyCareer.ts', 'scripts/simUsCoachCareer.mjs', scoutsFile];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const source = held.find(([file]) => file === engine)[1].source;
const scouts = JSON.parse(held.find(([file]) => file === scoutsFile)[1].source).scouts;
const departure = '  const departure: CoachDeparture = exit.stay ? s.profile.departure : exit.departure;';
const oldDeparture = "  const departure: CoachDeparture = poachedTo !== null ? 'poached'\n    : exit.stay ? s.profile.departure\n    : exit.departure;";
const credit = "      s.profile = { ...s.profile, departure: 'poached' };";
const originalHash = 'e607f294869072f78f63433bfda86f018b845443a6cb580b58c3fd5f3d955879';
const mainTitle = 'keeps seed4 year2063 departure and standing unchanged when no larger vacancy exists';
const transfers = [
  [1, 2055, 'Washington Wizards', 'Miami Heat'], [1, 2061, 'Miami Heat', 'New Orleans Pelicans'],
  [2, 2045, 'Denver Nuggets', 'Houston Rockets'], [2, 2054, 'Atlanta Hawks', 'Utah Jazz'],
  [4, 2049, 'LA Clippers', 'Boston Celtics'], [4, 2059, 'Boston Celtics', 'Dallas Mavericks'],
];
const transferTitles = transfers.map(([seed, year, from, to]) => `retains genuine seed${seed} year${year} transfer from${from} to${to}`);
const baselines = ['holds the original ordinary staying season and its three draws', 'holds original firing, new market and unemployment without an instant rehire', 'keeps previously earned poaching credit during an ordinary same-chair season', 'round-trips current coaching saves and null old coaching data through the existing repair API', 'does not play or draw randomness when the original fired coach has no job'];
const controls = {
  phantom: [departure, oldDeparture, [mainTitle], ['4/2063']],
  credit: [credit, '      s.profile = { ...s.profile, departure: prev.profile.departure };', [0, 2, 3, 4].map(i => transferTitles[i]), [0, 2, 3, 4].map(i => `${transfers[i][0]}/${transfers[i][1]}`)],
  rng: [credit, '      rng();\n' + credit, transferTitles, transfers.map(([s, y]) => `${s}/${y}`)],
};
const control = process.env.US_COACH_POACHING_CONTROL || '';
assert.ok(!control || control in controls, 'Known poaching control');
for (const anchor of [departure, credit]) {
  assert.equal(source.split(anchor).length - 1, 1, 'One actual executable binding');
  assert.equal(holdSource(Buffer.from(source.replaceAll('\n', '\r\n'))).source.split(anchor).length - 1, 1, 'CRLF binding held');
}
const original = source.replace(departure, oldDeparture).replace(credit + '\n', '');
assert.equal(createHash('sha256').update(original).digest('hex'), originalHash, 'Reconstructed original matches the captured pre-repair engine exactly');
let subject = source;
if (control) { const [anchor, replacement] = controls[control]; subject = source.replace(anchor, replacement); assert.notEqual(subject, source); }
const resolveCopies = text => text.replace(/(from\s+['"])\.\//g, '$1@/lib/');
let folder; const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/us-coach888-'));
  const write = async (name, value) => { const file = path.join(folder, name); owned.push(file); await writeFile(file, value); return file; };
  const originalFile = await write('original.ts', resolveCopies(original));
  const subjectFile = await write('subject.ts', resolveCopies(subject));
  const entry = await write('entry.mjs', `export * as original from './original.ts'; export * as subject from './subject.ts';`);
  const bundle = path.join(folder, 'bundle.mjs'); owned.push(bundle);
  const built = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(root, 'src') }, logLevel: 'error', metafile: true });
  assert.ok(!Object.keys(built.metafile.inputs).some(file => file.includes('supabase')), 'Pure engine baseline has no database client');
  const { original: reference, subject: actual } = await import(pathToFileURL(bundle).href);
  const clone = value => JSON.parse(JSON.stringify(value));
  const rows = [];
  function seedRandom(seed) {
    let s = seed >>> 0; const tape = [];
    return { tape, draw: () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296; tape.push(value); return value; } };
  }
  for (let seed = 1; seed <= 4; seed++) {
    const r = seedRandom(seed), scout = scouts[seed];
    assert.ok(scout && scout.draws > 0 && scout.player.seasons.length === 6 && scout.player.name === 'Fictional supported coach scout', 'Recorded six season scout exists');
    for (let i = 0; i < scout.draws; i++) r.draw();
    const player = clone(scout.player);
    player.retired = true; let state = reference.startCoachCareer('nba', player, player.year, r.draw);
    for (let i = 0; i < 40 && state.year <= 2063; i++) {
      if (state.unemployed) { state = state.offers.length ? reference.acceptCoachOffer(state, 0) : reference.sitOutCoachSeason(state, r.draw).state; continue; }
      const before = clone(state), from = r.tape.length, out = reference.playCoachSeason(state, r.draw);
      rows.push({ seed, year: before.year, before, after: out.state, notes: out.notes, tape: r.tape.slice(from) }); state = out.state;
    }
  }
  const selected = [[4, 2063], ...transfers.map(([seed, year]) => [seed, year]), [1, 2032], [1, 2036], [1, 2056]].map(([seed, year]) => {
    const row = rows.find(t => t.seed === seed && t.year === year); assert.ok(row, 'Actual original transition exists'); return row;
  });
  const differentialFailures = [];
  for (const row of selected) {
    const expected = clone({ state: row.after, notes: row.notes });
    if (row.seed === 4 && row.year === 2063) {
      assert.equal(row.before.job.team, row.after.job.team); assert.equal(row.before.profile.departure, 'firedLosing'); assert.equal(row.after.profile.departure, 'poached');
      assert.equal(reference.coachOutlook(row.after).standing, 100);
      expected.state.profile.departure = row.before.profile.departure; assert.equal(reference.coachOutlook(expected.state).standing, 88);
    }
    let draws = 0; const input = clone(row.before);
    try {
      const out = actual.playCoachSeason(input, () => { if (draws >= row.tape.length) throw new Error('Unexpected additional RNG draw'); return row.tape[draws++]; });
      assert.deepEqual(input, row.before, 'Input remains unchanged'); assert.equal(draws, row.tape.length, 'Original RNG consumption held'); assert.deepEqual(out, expected, 'Exact original season, notes, job and save state except the verified phantom departure');
    } catch (error) { differentialFailures.push({ key: `${row.seed}/${row.year}`, error: String(error.message) }); }
  }
  assert.deepEqual(differentialFailures.map(row => row.key).sort(), control ? controls[control][3].slice().sort() : []);
  const fixtures = await write('fixtures.json', JSON.stringify(selected));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1', US_COACH_POACHING_FIXTURES: fixtures };
  delete env.NO_DOUBLE_SWAP;
  if (control) env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/usCoachCareer': subjectFile });
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused worker finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), cases = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(cases.length, 12); assert.equal(report.numPendingTests, 0); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.ok(cases.every(row => row.status === 'passed' || row.status === 'failed'));
  for (const title of baselines) assert.equal(cases.find(row => row.title === title)?.status, 'passed', 'Independent normal/firing/previous-credit/save/unemployment baselines held');
  const failed = cases.filter(row => row.status === 'failed');
  if (control) {
    const expected = controls[control][2]; assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 12 - expected.length);
    assert.deepEqual(failed.map(row => row.title).sort(), expected.slice().sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|Error: Unexpected additional RNG draw/);
    console.log(`Coach poaching ${control}: changed one actual executable binding in an isolated source copy.`);
    console.log(`Coach poaching ${control}: ${failed.length} exact intended failures and ${12 - failed.length} untargeted passes; all12 executed.`);
    console.log(`US_POACHING_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })), differentialFailures })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 12); assert.equal(report.numFailedTests, 0);
    console.log('Coach poaching:12/12 real-engine focused cases passed, zero pending/unhandled cases.');
    console.log('Coach poaching: supported seed4/year2063 keeps its prior departure and88 standing when no new chair exists.');
    console.log('Coach poaching: all six actual new-chair transfers retain exact original outputs, earned credit and RNG tapes.');
  }
  console.log(`Coach poaching: original engine SHA256 ${originalHash}; ten independently captured full transitions compared.`);
  console.log('Coach poaching: ordinary staying, firing/new market, previously earned credit, current save repair and unemployment baselines held.');
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Production engine, helpers, focused test and all existing simUsCoachCareer assertions held');
  }
}
console.log('Coach poaching: CRLF anchors/raw bytes held, owned copies cleaned; fictional pure-engine fixtures do not prove UI gameplay or sports history.');
