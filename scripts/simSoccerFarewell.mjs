import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, KEY, OUT, action, bundleFarewell, capturedPlayers, copy, drainFarewell, evidence, git, heldVeteran, seeded, sourceReceipt } from './qa/soccerFarewellKit.mjs';

const files = ['src/lib/soccerCareerFarewell.ts', 'src/lib/soccerCareerEngine.ts', 'src/pages/SoccerCareer.tsx', 'src/components/soccer-career/FarewellSeasonCard.tsx', 'scripts/simSoccerFarewell.mjs', 'scripts/qa/soccerFarewellKit.mjs'];
export function actualSuggestion(B) {
  const input = heldVeteran(B, 'ere', { overall: 70, peakOverall: 95 });
  for (let seed = 1; seed <= 40; seed++) {
    const result = seeded(seed, () => B.engine.advanceProSeason(copy(input), B.engine.FALLBACK_CLUBS));
    if (result.value.phase === 'retirement_suggestion') return { input, seed, ...result };
  }
  throw new Error('No actual retirement suggestion in bounded seeds');
}
export function findFinalSeason(B, input, phase = 'season_summary', tournament = false) {
  const announced = seeded(77, () => B.farewell.announceSoccerFarewell(copy(input))).value;
  for (let seed = 1; seed <= 400; seed++) {
    const result = seeded(seed, () => action(B, 'next', copy(announced)));
    const summary = result.value.phase === 'newspaper' && phase === 'season_summary' ? seeded(seed + 1000, () => action(B, 'newspaper', copy(result.value))) : null;
    const value = summary?.value ?? result.value;
    if (value.phase === phase && (!tournament || value.pendingTournament || value.pendingWorldCup)) return { seed, value, draws: result.draws, raw: result, summary, announced };
  }
  throw new Error('No actual final-season branch in bounded seeds: ' + phase);
}
function groups(B, prefix = 'healthy') {
  const results = [];
  const run = (name, test) => {
    const data = {};
    try { test(data); results.push({ name, ok: true }); }
    catch (error) { results.push({ name, ok: false, error: String(error.stack), assertion: error instanceof assert.AssertionError }); }
    evidence(prefix + '-' + name + '.json', data);
  };
  run('declaration-readonly', data => {
    const input = heldVeteran(B), before = JSON.stringify(input);
    const read = seeded(10, () => action(B, 'read', input));
    assert.deepEqual(read.draws, []);
    assert.equal(read.value.eligibility.eligible, true);
    const result = seeded(11, () => action(B, 'announce', input));
    Object.assign(data, { input, read, result });
    assert.equal(JSON.stringify(input), before, 'Declaration never mutates its original save');
    assert.deepEqual(result.draws, [], 'Playing declaration draws nothing and plays no season');
    assert.equal(result.value.seasons.length, input.seasons.length);
    assert.equal(result.value.age, input.age);
    assert.equal(result.value.phase, 'playing');
    const row = input.seasons[input.seasons.length - 1];
    assert.deepEqual(B.farewell.readSoccerFarewell(result.value), { version: 1, year: row.year + 1, sourceCount: input.seasons.length, sourceYear: row.year, sourceAge: row.age, announcedAge: input.age, club: input.currentClub, sourcePhase: 'playing' });
    assert.equal(B.farewell.farewellSeasonComplete(result.value), false);
    const repeated = seeded(12, () => action(B, 'announce', result.value));
    data.repeated = repeated;
    assert.deepEqual(repeated.value, result.value);
    assert.deepEqual(repeated.draws, []);
  });
  run('suggestion-one-birthday', data => {
    const prepared = actualSuggestion(B), input = copy(prepared.value);
    const result = seeded(60, () => action(B, 'announce', input));
    Object.assign(data, { prepared, input, result });
    assert.equal(result.value.age, input.age, 'Suggestion already started this year');
    assert.equal(result.value.seasons.length, input.seasons.length + 1);
    assert.equal(result.value.seasons[result.value.seasons.length - 1].year, input.seasons[input.seasons.length - 1].year + 1);
    assert(B.farewell.farewellSeasonComplete(result.value));
    assert(['newspaper', 'season_summary'].includes(result.value.phase), 'Actual final year first shows its paper or summary');
    const summary = result.value.phase === 'newspaper' ? seeded(61, () => action(B, 'newspaper', copy(result.value))) : result;
    data.summary = summary;
    assert.equal(summary.value.phase, 'season_summary');
    data.final = drainFarewell(B, result.value);
    assert.equal(data.final.value.age, input.age);
    assert.equal(data.final.value.seasons.length, input.seasons.length + 1);
  });
  run('normal-endpoint', data => {
    const input = heldVeteran(B), played = findFinalSeason(B, input);
    const final = drainFarewell(B, played.value);
    Object.assign(data, { input, played, final });
    assert.equal(played.value.retired, false);
    assert.equal(played.value.phase, 'season_summary');
    assert.equal(final.value.phase, 'retirement_ceremony');
    assert.equal(final.value.age, input.age + 1);
    assert.equal(final.value.seasons.length, input.seasons.length + 1);
    assert.equal(final.value.seasons[final.value.seasons.length - 1].year, B.farewell.readSoccerFarewell(played.announced).year);
  });
  run('interrupted-endpoints', data => {
    data.cases = [];
    for (const [id, extra, club] of [['ban', { matchFixBanned: 2 }, 'BANNED'], ['prison', { prisonSeasons: 1 }, 'PRISON']]) {
      const input = heldVeteran(B, 'ere', extra), announced = B.farewell.announceSoccerFarewell(copy(input));
      const played = seeded(90, () => action(B, 'next', copy(announced))), final = drainFarewell(B, played.value);
      data.cases.push({ id, input, announced, played, final });
      assert.equal(played.value.pendingSummary.club, club);
      assert.equal(played.value.pendingSummary.apps, 0);
      assert.equal(final.value.seasons.length, input.seasons.length + 1);
      assert.equal(final.value.age, input.age + 1);
    }
    const input = heldVeteran(B), announced = B.farewell.announceSoccerFarewell(copy(input));
    const legacy = { ...announced, age: input.age + 1, phase: 'rehab_choice', pendingRehab: { name: 'ACL tear', weeks: 40, year: input.seasons[input.seasons.length - 1].year + 1, specialistCost: 1 } };
    const rehab = seeded(91, () => action(B, 'rehab_choice', copy(legacy), 1)), final = drainFarewell(B, rehab.value);
    data.legacyRehab = { input, legacy, rehab, final, scope: 'Explicit legacy interrupted save, actual unchanged rehab choice adds its recorded year.' };
    assert.equal(rehab.value.phase, 'season_summary');
    assert.equal(rehab.value.pendingSummary.apps, 0);
    assert.equal(rehab.value.pendingSummary.injurySevere, true);
    assert.equal(final.value.seasons.length, input.seasons.length + 1);
  });
  run('queued-ceremony-order', data => {
    const input = heldVeteran(B);
    input.seasons = input.seasons.map(row => ({ ...row, year: row.year + 1 }));
    input.internationalCareer = true; input.intStats.isRetired = false;
    const played = findFinalSeason(B, input, 'season_summary', true);
    const summary = seeded(120, () => action(B, 'summary', copy(played.value)));
    Object.assign(data, { input, played, summary });
    assert(played.value.pendingBallonDor, 'Actual season queued an award ceremony');
    assert(played.value.pendingTournament || played.value.pendingWorldCup, 'Actual season queued its tournament');
    assert.equal(summary.value.phase, 'ballon_dor', 'Queued award is shown before retirement');
    assert.equal(summary.value.retired, false);
    const final = drainFarewell(B, played.value, 120);
    data.final = final;
    const phases = final.trace.map(row => row.phase);
    assert(phases.includes('world_cup'), 'Saved tournament shown before retirement');
    assert.equal(final.value.pendingBallonDor, null);
    assert.equal(final.value.pendingTournament, null);
    assert.equal(final.value.pendingWorldCup, null);
    assert.equal(final.value.seasons.length, input.seasons.length + 1);
  });
  run('invalid-context', data => {
    const input = heldVeteran(B), valid = B.farewell.announceSoccerFarewell(copy(input));
    data.cases = [];
    for (const [id, change] of [['wrong-year', c => { c.farewellSeason.sourceYear++; c.farewellSeason.year++; }], ['extra-field', c => { c.farewellSeason.guessed = true; }], ['wrong-age', c => { c.farewellSeason.announcedAge++; }], ['stale-count', c => { c.farewellSeason.sourceCount++; }]]) {
      const invalid = copy(valid); change(invalid);
      const before = JSON.stringify(invalid), read = seeded(200, () => action(B, 'read', invalid));
      data.cases.push({ id, input: invalid, read });
      assert.equal(read.value.plan, null, 'Invalid source cannot retire a career: ' + id);
      assert.equal(read.value.complete, false);
      assert.deepEqual(read.draws, []);
      assert.equal(JSON.stringify(invalid), before);
    }
  });
  run('hard-retirement-unchanged', data => {
    data.cases = [];
    for (const extra of [{ age: 32, overall: 49 }, { age: 44, overall: 82 }]) {
      const input = heldVeteran(B, 'ere', extra), before = JSON.stringify(input);
      const announced = seeded(310, () => action(B, 'announce', input));
      const retired = seeded(311, () => action(B, 'next', copy(input)));
      data.cases.push({ input, announced, retired });
      assert.deepEqual(announced.value, input, 'Farewell cannot bypass existing forced retirement');
      assert.equal(JSON.stringify(input), before);
      assert.deepEqual(announced.draws, []);
      assert.equal(retired.value.retired, true);
      assert.equal(retired.value.phase, 'retirement_ceremony');
    }
  });
  run('repeated-boundary', data => {
    const input = heldVeteran(B), played = findFinalSeason(B, input), final = drainFarewell(B, played.value);
    data.played = played; data.final = final; data.repeats = [];
    for (const state of [played.value, final.value]) for (const id of ['next', 'suggestion']) {
      const repeated = seeded(401, () => action(B, id, copy(state)));
      data.repeats.push({ id, input: state, repeated });
      assert.deepEqual(repeated.value, state, 'Recorded farewell endpoint cannot play another year');
      assert.deepEqual(repeated.draws, []);
    }
    const repeatedSummary = seeded(402, () => action(B, 'summary', copy(final.value)));
    data.repeatedSummary = repeatedSummary;
    assert.deepEqual(repeatedSummary.value, final.value);
    assert.deepEqual(repeatedSummary.draws, []);
  });
  run('interrupted-loan-return', data => {
    const input = heldVeteran(B, 'ere', { matchFixBanned: 2 });
    const parent = { parentClub: input.currentClub, parentTier: input.currentClubTier, parentLeague: input.currentLeague, parentCountry: input.currentClubCountry, parentColor: input.currentClubColor };
    const club = B.engine.FALLBACK_CLUBS.find(row => row.name === 'Arsenal'); assert(club);
    Object.assign(input, { currentClub: club.name, currentClubTier: club.tier, currentLeague: club.league, currentClubCountry: club.country, currentClubColor: club.color, loan: parent });
    const announced = B.farewell.announceSoccerFarewell(copy(input)), played = seeded(501, () => action(B, 'next', copy(announced))), final = drainFarewell(B, played.value);
    Object.assign(data, { input, announced, played, final });
    assert.equal(final.value.currentClub, parent.parentClub, 'Interrupted loan returns to its recorded parent before retirement');
    assert.equal(final.value.loan, null);
    assert.equal(final.value.phase, 'retirement_ceremony');
    assert.equal(final.value.seasons.length, input.seasons.length + 1);
  });
  return results;
}

if (!process.env.SOCCER_FAREWELL_IMPORT_ONLY) {
  fs.mkdirSync(OUT, { recursive: true });
  const before = sourceReceipt(files), current = await bundleFarewell(), original = await bundleFarewell({ original: true });
  const B = current.value, O = original.value;
  const report = { head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), base: BASE, baseTree: git('rev-parse', BASE + '^{tree}'), sourceBefore: before, loaded: { current: current.loaded, original: original.loaded }, neutral: [], groups: [], controls: [] };
  try {
    for (const captured of capturedPlayers()) for (const seed of [101, 102, 103]) for (const kind of ['absent', 'malformed', 'stale', 'legacy-flag']) {
      const input = copy(captured.state);
      if (kind === 'malformed') input.farewellSeason = { version: 1, year: 'unknown' };
      if (kind === 'stale') input.farewellSeason = { version: 1, year: 1901, sourceYear: 1900, sourceCount: 1, sourceAge: 30, announcedAge: 30, club: input.currentClub, sourcePhase: 'playing' };
      if (kind === 'legacy-flag') input.isFinalSeason = true;
      const first = seeded(seed, () => O.engine.advanceProSeason(copy(input), O.engine.FALLBACK_CLUBS));
      const second = seeded(seed, () => B.engine.advanceProSeason(copy(input), B.engine.FALLBACK_CLUBS));
      const file = evidence('neutral-' + captured.id + '-' + seed + '-' + kind + '.json', { input, original: first, current: second });
      assert.deepEqual(second, first, 'Entire original inactive career and random vector: ' + file);
      report.neutral.push({ file, kind, draws: first.draws.length });
    }
    function neutralPair(label, input, operation, seed, kind) {
      const first = seeded(seed, () => action(O, operation, copy(input)));
      const second = seeded(seed, () => action(B, operation, copy(input)));
      const file = evidence('neutral-' + label + '-' + operation + '-' + seed + '-' + kind + '.json', { input, operation, original: first, current: second });
      assert.deepEqual(second, first, 'Whole inactive adult state and random vector: ' + file);
      report.neutral.push({ file, kind, operation, draws: first.draws.length });
      return first.value;
    }
    function inactive(input, kind) {
      const value = copy(input);
      if (kind === 'malformed') value.farewellSeason = { version: 1, year: 'unknown' };
      if (kind === 'stale') value.farewellSeason = { version: 1, year: 1901, sourceYear: 1900, sourceCount: 1, sourceAge: 30, announcedAge: 30, club: value.currentClub, sourcePhase: 'playing' };
      if (kind === 'legacy-flag') value.isFinalSeason = true;
      return value;
    }
    const kinds = ['absent', 'malformed', 'stale', 'legacy-flag'];
    for (const captured of capturedPlayers()) for (const seed of [101, 102, 103]) for (const kind of kinds) neutralPair('adult-' + captured.id, inactive(heldVeteran(O, captured.id), kind), 'next', seed, kind);
    const oldSuggestion = actualSuggestion(O);
    for (const seed of [101, 102, 103]) for (const kind of kinds) neutralPair('already-aged-suggestion', inactive(oldSuggestion.value, kind), 'suggestion', seed, kind);
    const oldAdult = heldVeteran(O); oldAdult.isFinalSeason = true;
    let oldYear;
    for (let seed = 1; seed <= 50; seed++) {
      const trial = seeded(seed, () => action(O, 'next', copy(oldAdult)));
      if (['newspaper', 'season_summary'].includes(trial.value.phase)) { oldYear = trial.value; report.neutralContinuationPreparation = { input: oldAdult, seed, ...trial }; break; }
    }
    assert(oldYear, 'Genuine original final year supplies inactive continuation fixtures');
    for (let step = 0; step < 8; step++) {
      const operation = oldYear.phase === 'season_summary' ? 'summary' : oldYear.phase;
      if (!['newspaper', 'summary', 'ballon_dor', 'international_debut', 'world_cup', 'rivalry_event'].includes(operation)) break;
      for (const seed of [101, 102, 103]) for (const kind of kinds) neutralPair('adult-continuation-' + step, inactive(oldYear, kind), operation, seed, kind);
      oldYear = seeded(700 + step, () => action(O, operation, copy(oldYear))).value;
    }
    report.groups = groups(B);
    assert(report.groups.every(row => row.ok), JSON.stringify(report.groups.filter(row => !row.ok)));
    const faults = [
      { id: 'playing-plays-now', groups: ['declaration-readonly'], file: 'src/lib/soccerCareerEngine.ts', from: 'return prev.phase === "retirement_suggestion" ? declineRetirementSuggestion(announced, clubs) : announced;', to: 'return prev.phase === "retirement_suggestion" ? declineRetirementSuggestion(announced, clubs) : advanceProSeason(announced, clubs);' },
      { id: 'suggestion-extra-birthday', groups: ['suggestion-one-birthday'], file: 'src/lib/soccerCareerEngine.ts', from: 'return prev.phase === "retirement_suggestion" ? declineRetirementSuggestion(announced, clubs) : announced;', to: 'return prev.phase === "retirement_suggestion" ? advanceProSeason(announced, clubs) : announced;' },
      { id: 'wrong-source-year', groups: ['invalid-context'], file: 'src/lib/soccerCareerFarewell.ts', from: 'source.year !== value.sourceYear', to: 'false' },
      { id: 'early-retirement', groups: ['queued-ceremony-order'], file: 'src/lib/soccerCareerEngine.ts', from: 'function advanceToNextPhase(s: CareerState, clubs: ClubData[]): CareerState {\n  // Check for Ballon', to: 'function advanceToNextPhase(s: CareerState, clubs: ClubData[]): CareerState {\n  if (farewellSeasonComplete(s)) return manualRetire(s);\n  // Check for Ballon' },
      { id: 'replay-final-year', groups: ['repeated-boundary'], file: 'src/lib/soccerCareerEngine.ts', from: 'export function advanceProSeason(prev: CareerState, clubs: ClubData[]): CareerState {\n  if (readSoccerFarewell(prev) && (prev.retired || farewellSeasonComplete(prev))) return prev;', to: 'export function advanceProSeason(prev: CareerState, clubs: ClubData[]): CareerState {\n  if (false) return prev;' },
      { id: 'keep-loan-parent', groups: ['interrupted-loan-return'], file: 'src/lib/soccerCareerEngine.ts', from: 'if (readSoccerFarewell(s) && s.loan) {', to: 'if (false && s.loan) {' },
    ];
    for (const fault of faults) {
      const compiled = await bundleFarewell({ patches: [fault] }), actual = groups(compiled.value, 'fault-' + fault.id), failed = actual.filter(row => !row.ok);
      assert.deepEqual(failed.map(row => row.name), fault.groups, 'Exact copied source failure set');
      assert(failed.every(row => row.assertion), 'Setup/import errors never count as controls');
      assert.equal(actual.filter(row => row.ok).length, 9 - fault.groups.length);
      report.controls.push({ id: fault.id, faults: compiled.faults, loaded: compiled.loaded, expectedFailures: fault.groups, groups: actual });
      console.log('CONTROL FIRED ' + fault.id + ': ' + fault.groups.join(','));
    }
    const fixtures = [], normal = heldVeteran(B), normalSeed = findFinalSeason(B, normal).seed;
    fixtures.push({ id: 'normal', input: normal, seed: normalSeed });
    const suggestion = actualSuggestion(B);
    fixtures.push({ id: 'suggestion', input: suggestion.value, seed: 60, preparation: suggestion });
    for (const [id, extra] of [['ban', { matchFixBanned: 2 }], ['prison', { prisonSeasons: 1 }]]) fixtures.push({ id, input: heldVeteran(B, 'ere', extra), seed: 90 });
    const rehab = findFinalSeason(B, normal, 'rehab_choice');
    fixtures.push({ id: 'rehab', input: normal, seed: rehab.seed });
    const cupInput = heldVeteran(B); cupInput.seasons = cupInput.seasons.map(row => ({ ...row, year: row.year + 1 })); cupInput.internationalCareer = true; cupInput.intStats.isRetired = false;
    const cup = findFinalSeason(B, cupInput, 'season_summary', true);
    fixtures.push({ id: 'ceremonies', input: cupInput, seed: cup.seed });
    evidence('native-fixtures.json', fixtures.map(row => ({ ...row, key: KEY, scope: 'Existing captured full save with explicitly held simulated veteran context. Actual current engine chooses season results, injuries and queued ceremonies. Suggestion preparation, if present, is actual engine execution before browser entry.' })));
    report.fixtures = fixtures.map(row => ({ id: row.id, seed: row.seed }));
    console.log('Soccer farewell:9 healthy groups,' + report.neutral.length + ' full original state/RNG pairs,6 effective source controls,6 prepared native branches.');
  } finally {
    report.sourceAfter = sourceReceipt(files); assert.deepEqual(report.sourceAfter, before);
    evidence('outcomes.json', report);
  }
}
