import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Controlled simulation inputs. These are not real qualification or club-strength claims.
const ROOT = process.cwd();
const SOURCE = 'src/lib/soccerCareerExtraCups.ts';
const SOURCE_SHA = '6562fef7c5f067ffa9a4fdf335a918a0d20bda908f0156308f3b705d378f2406';
const PROFILES = [{ id: 'equal', strengths: [4, 4] }, { id: 'gap', strengths: [4, 2] }];
const sha = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const bytes = value => Buffer.from(JSON.stringify(value));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const relative = file => path.relative(ROOT, file).split(path.sep).join('/');
const describeBytes = body => ({ bytes: body.length, sha256: sha(body) });

async function main() {
  assert.ok(process.env.SC_SHIELD_PURE_OUT, 'SC_SHIELD_PURE_OUT must name a fresh directory under workspace/tmp');
  const out = path.resolve(process.env.SC_SHIELD_PURE_OUT);
  const allowed = path.resolve(ROOT, 'tmp') + path.sep;
  assert.ok(out.startsWith(allowed), 'Output must stay under workspace/tmp');
  assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Output must be empty');
  fs.mkdirSync(out, { recursive: true });
  const held = new Map();
  function hold(file) {
    const full = path.resolve(ROOT, file);
    assert.ok(full.startsWith(ROOT + path.sep), 'Held inputs must stay in the workspace');
    if (!held.has(full)) held.set(full, Buffer.from(fs.readFileSync(full)));
  }
  for (const file of [SOURCE, 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', fileURLToPath(import.meta.url)]) hold(file);
  assert.equal(sha(held.get(path.resolve(ROOT, SOURCE))), SOURCE_SHA, 'Probe must use the reviewed actual pure module');
  let primary = null;
  const secondary = [];
  let summary = null;
  const rows = [];
  let playInvocations = 0;
  let readerInvocations = 0;
  try {
    const outfile = path.join(out, 'actualExtraCups.mjs');
    const built = await build({ absWorkingDir: ROOT, entryPoints: [path.resolve(ROOT, SOURCE)], outfile,
      platform: 'node', format: 'esm', target: 'es2022', bundle: true, write: false, metafile: true,
      tsconfig: path.resolve(ROOT, 'tsconfig.app.json'), logLevel: 'silent' });
    assert.equal(built.outputFiles.length, 1, 'Pure probe must compile one executable output');
    for (const file of Object.keys(built.metafile.inputs)) {
      const full = path.resolve(ROOT, file), rel = relative(full);
      assert.ok(rel.startsWith('src/') && !rel.split('/').includes('..'), 'Only actual source inputs may enter the pure bundle');
      assert.notEqual(rel, 'src/lib/soccerCareerEngine.ts', 'Engine import must remain type-only in this pure probe');
      hold(full);
    }
    const bundle = Buffer.from(built.outputFiles[0].contents);
    fs.writeFileSync(outfile, bundle);
    write(path.join(out, 'metafile.json'), built.metafile);
    write(path.join(out, 'compiled-inputs.json'), { source: SOURCE, sourceSha256: SOURCE_SHA,
      executable: { file: path.basename(outfile), ...describeBytes(bundle) },
      inputs: [...held].map(([file, body]) => ({ file: relative(file), ...describeBytes(body) })) });
    const api = await import(pathToFileURL(outfile).href);
    for (const name of ['playCommunityShield', 'communityShieldSeasonStats', 'readCommunityShield']) {
      assert.equal(typeof api[name], 'function', 'Actual pure export is required: ' + name);
    }
    const annual = { apps: 30, goals: 10, assists: 5, cleanSheets: 0, rating: 7.2 };
    for (const profile of PROFILES) for (let seed = 0; seed < 64; seed++) {
      const qualification = {
        version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed,
        leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
        entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
        proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
      };
      const input = { qualification, eventYear: 2027, playerName: 'Shield pure probe', club: 'Arsenal',
        position: 'ST', overall: 80, selectionChance: 1, unavailableReason: null, teamStrengths: [...profile.strengths] };
      const inputBefore = JSON.stringify(input);
      playInvocations++;
      const result = api.playCommunityShield(input);
      assert.equal(JSON.stringify(input), inputBefore, 'SC_PURE_INPUT_HELD');
      assert.notEqual(result, null, 'Controlled valid play input must produce an actual result');
      const annualBefore = JSON.stringify(annual);
      const merged = api.communityShieldSeasonStats(annual, result);
      assert.equal(JSON.stringify(annual), annualBefore, 'SC_PURE_ANNUAL_HELD');
      const row = { type: 'playing', year: 2027, club: 'Arsenal', ...merged, extraCups: [result] };
      rows.push({ id: profile.id + ':' + seed, profile: profile.id, seed, input: clone(input),
        inputBefore, annual: clone(annual), result: clone(result), merged: clone(merged), row: clone(row) });
    }
    assert.equal(playInvocations, 128, 'Exactly 128 actual play calls, no outcome search or replay');
    write(path.join(out, 'records.json'), rows);

    function validate(values) {
      assert.equal(values.length, 128, 'SC_PURE_COHORT');
      for (let i = 0; i < values.length; i++) {
        const record = values[i], profile = PROFILES[Math.floor(i / 64)], seed = i % 64;
        assert.equal(record.id, profile.id + ':' + seed, 'SC_PURE_COHORT');
        assert.equal(record.profile, profile.id, 'SC_PURE_COHORT');
        assert.equal(record.seed, seed, 'SC_PURE_COHORT');
        assert.equal(record.input.qualification.seed, seed, 'SC_PURE_COHORT');
        assert.deepEqual(record.input.teamStrengths, profile.strengths, 'SC_PURE_COHORT');
        assert.equal(JSON.stringify(record.input), record.inputBefore, 'SC_PURE_COHORT');
        readerInvocations++;
        const read = api.readCommunityShield(record.row);
        assert.notEqual(read, null, 'SC_PURE_READER');
        assert.deepEqual(read, record.result, 'SC_PURE_READER');
        const p = record.result.player, a = record.annual;
        const expected = { apps: a.apps + p.apps, goals: a.goals + p.goals, assists: a.assists + p.assists,
          cleanSheets: a.cleanSheets + p.cleanSheets,
          rating: p.apps ? Math.round((a.rating * a.apps + p.rating) / (a.apps + 1) * 10) / 10 : a.rating };
        assert.deepEqual(record.merged, expected, 'SC_PURE_MERGE');
        for (const field of Object.keys(expected)) assert.equal(record.row[field], expected[field], 'SC_PURE_MERGE');
      }
    }
    validate(rows);
    const heldRowsSha = sha(bytes(rows));
    const controls = [];
    for (const control of [
      { id: 'cohort-seed', marker: 'SC_PURE_COHORT', change: copy => { copy[0].input.qualification.seed = 64; } },
      { id: 'reader-proof', marker: 'SC_PURE_READER', change: copy => { copy[0].row.extraCups[0].seed = 64; } },
      { id: 'merged-apps', marker: 'SC_PURE_MERGE', change: copy => { copy[0].merged.apps += 1; } },
    ]) {
      const changed = clone(rows); control.change(changed);
      const changedSha = sha(bytes(changed));
      assert.notEqual(changedSha, heldRowsSha, 'Copied observation control must change bytes');
      let refusal = null;
      try { validate(changed); } catch (error) { refusal = error; }
      assert.ok(refusal instanceof assert.AssertionError && refusal.message.includes(control.marker),
        'Copied observation control must own its named assertion: ' + control.id);
      const restored = clone(rows); validate(restored);
      assert.equal(sha(bytes(restored)), heldRowsSha, 'Observation restore must be exact');
      write(path.join(out, 'control-' + control.id + '.json'), { id: control.id, marker: control.marker,
        originalSha256: heldRowsSha, changedSha256: changedSha, restoredSha256: sha(bytes(restored)),
        refusal: { name: refusal.name, message: refusal.message } });
      controls.push({ id: control.id, marker: control.marker, changed: true, ownedRefusal: true, restored: true });
    }
    function histogram(values) {
      const counts = {};
      for (const value of values) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
      return counts;
    }
    function mean(values) { return values.reduce((a, b) => a + b, 0) / values.length; }
    const profiles = PROFILES.map(profile => {
      const subset = rows.filter(row => row.profile === profile.id), results = subset.map(row => row.result);
      return { id: profile.id, strengths: profile.strengths, matches: subset.length,
        winners: histogram(results.map(r => r.winner)), deciders: histogram(results.map(r => r.decidedBy)),
        scorePairs: histogram(results.map(r => r.score.join(':'))),
        shootoutPairs: histogram(results.filter(r => r.penalties).map(r => r.penalties.join(':'))),
        meanGoalsFor: mean(results.map(r => r.score[0])), meanGoalsAgainst: mean(results.map(r => r.score[1])),
        playerGoals: histogram(results.map(r => r.player.goals)), playerAssists: histogram(results.map(r => r.player.assists)),
        playerRatings: histogram(results.map(r => r.player.rating)), personalTitles: results.filter(r => r.player.title).length };
    });
    const pairs = Array.from({ length: 64 }, (_, seed) => ({ seed,
      equal: rows[seed].id, gap: rows[64 + seed].id,
      goalsForDelta: rows[64 + seed].result.score[0] - rows[seed].result.score[0],
      goalsAgainstDelta: rows[64 + seed].result.score[1] - rows[seed].result.score[1] }));
    write(path.join(out, 'paired-seeds.json'), pairs);
    summary = { schemaVersion: 1, scope: 'Descriptive pure synthetic inputs, not annual integration or balance readiness.',
      actualPlayInvocations: playInvocations, uniqueInputs: rows.length, seeds: { first: 0, last: 63, count: 64 },
      profiles, observationControls: controls,
      records: { file: 'records.json', ...describeBytes(fs.readFileSync(path.join(out, 'records.json'))) },
      pairedSeeds: { file: 'paired-seeds.json', ...describeBytes(fs.readFileSync(path.join(out, 'paired-seeds.json'))) },
      noOutcomeMargin: true, noGlobalRandomOrClockOverride: true };
  } catch (error) { primary = error; }
  finally {
    try {
      const sourceHolds = [];
      for (const [file, expected] of held) {
        const actual = fs.readFileSync(file);
        assert.deepEqual(actual, expected, 'Held input changed: ' + relative(file));
        sourceHolds.push({ file: relative(file), ...describeBytes(actual) });
      }
      write(path.join(out, 'source-holds.json'), sourceHolds);
    } catch (error) { secondary.push({ name: error.name, message: error.message }); }
    try {
      if (rows.length && !fs.existsSync(path.join(out, 'records.json'))) write(path.join(out, 'partial-records.json'), rows);
      if (summary) write(path.join(out, 'summary.json'), { ...summary, readerInvocations,
        completed: !primary && secondary.length === 0 });
    } catch (error) { secondary.push({ name: error.name, message: error.message }); }
    try {
      write(path.join(out, 'receipt.json'), { completed: !primary && secondary.length === 0,
        actualPlayInvocations: playInvocations, readerInvocations, records: rows.length,
        primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary });
    } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  }
  if (primary) throw primary;
  assert.equal(secondary.length, 0, 'Pure probe input/output hold failed');
  console.log('SC_SHIELD_PURE: 128 actual play inputs, 3 copied-observation controls and exact restores; descriptive output only.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });