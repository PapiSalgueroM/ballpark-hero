/** Round 1180: sealed personal targets, exact no-choice saves and RNG, and one earned point.
 * SIM_CAREER_AMBITION_CONTROL=consume|reward|duplicate|binding|rating|ratingCompletion|phase|move|regular|interruption
 * plants an effective defect in a copied bundle. Every patch is guarded and never edits source.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = 'src/lib/soccerCareerAmbitions.ts', engine = 'src/lib/soccerCareerEngine.ts';
const source = fs.readFileSync(path.join(ROOT, engine), 'utf8');
const calls = /^[ \t]+settleCareerAmbition\(s, [^\r\n]+\);\r?$/gm;
assert.equal([...source.matchAll(calls)].length, 8, 'the old arm must remove all eight actual settlement hooks');
const oldSource = source.replace(calls, '');
assert.notEqual(oldSource, source, 'the no-choice baseline must restore the pre-ambition engine paths');
const moveHooks = /(if \(s.currentClub !== prev.currentClub\) \{\r?\n[ \t]*)delete s\.seasonAmbition;/g;
assert.equal([...source.matchAll(moveHooks)].length, 2, 'the move control binds both actual club-change cancellations');
const CONTROL = process.env.SIM_CAREER_AMBITION_CONTROL || '';
const controls = {
  consume: { file, from: 'delete career.seasonAmbition;', to: ';' },
  reward: { file, from: '(career.statBoostNextSeason[held.rewardStat] ?? 0) + 1', to: '(career.statBoostNextSeason[held.rewardStat] ?? 0) + 2' },
  duplicate: { file, from: 'row.ambition || !validAmbition(held)', to: '!validAmbition(held)' },
  binding: { file, from: 'held.year !== row.year', to: 'false' },
  rating: { file, from: "stat !== 'rating' || row.apps >= 10", to: 'true' },
  ratingCompletion: { file, from: "const shortRating = held.stat === 'rating' && row.apps < 10;", to: 'const shortRating = false;' },
  phase: { file, from: "prev.retired || prev.phase !== 'playing'", to: 'prev.retired' },
  move: { file: engine, from: source, to: source.replace(moveHooks, '$1;') },
  regular: { file: engine, from: '\n  settleCareerAmbition(s, season);', to: '' },
  interruption: { file: engine, from: source, to: source.replace(calls, line => line.includes('(s, season)') ? line : '') },
};
if (CONTROL === 'all') {
  const messages = {
    consume: 'a settled ambition is consumed once', reward: 'an achieved ambition earns exactly one queued attribute point',
    duplicate: 'an existing recorded result cannot reward again', binding: 'a target cannot settle against another year',
    rating: 'rating ambitions use the same ten-game floor as the record book',
    ratingCompletion: 'rating completion needs ten actual appearances before earning a point',
    phase: 'an ambition cannot be changed during the played season', move: 'moving clubs immediately cancels the held ambition',
    regular: 'the actual engine records the selected season ambition', interruption: 'the engine records interrupted ambitions on skipped years',
  };
  for (const name of ['', ...Object.keys(controls)]) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT,
      env: { ...process.env, SIM_CAREER_AMBITION_CONTROL: name }, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`;
    if (child.error || child.signal || (name ? child.status !== 1 || !output.includes('AssertionError') || !output.includes(messages[name]) : child.status !== 0)) {
      process.stdout.write(output);
      throw child.error || new Error(`ambition ${name || 'healthy'} did not reach its required outcome: ${child.status}, ${child.signal || ''}`);
    }
    console.log(name ? `ok   copied ${name} defect fired in its required outcome check` : output.trim());
  }
  console.log('simSoccerCareerAmbitions: healthy outcomes green, ten effective controls caught');
  process.exit(0);
}
if (CONTROL && !controls[CONTROL]) throw new Error(`unknown SIM_CAREER_AMBITION_CONTROL ${CONTROL}`);
for (const [name, patch] of Object.entries(controls)) assert.notEqual(patch.from, patch.to, `${name} control must change its guarded source anchor`);
assert.notEqual(controls.move.from, controls.move.to, 'the move control must remove real cancellation hooks');
assert.notEqual(controls.interruption.from, controls.interruption.to, 'the interruption control must remove real hooks');
const B = await bundleAwardsNight(ROOT, { patches: CONTROL ? [controls[CONTROL]] : [], extra: { ambitions: file } });
const old = await bundleAwardsNight(ROOT, { patches: [{ file: engine, from: source, to: oldSource }] });
const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(save => save.id === 'ere').state;
function career(extra = {}) {
  const club = B.soccer.FALLBACK_CLUBS.find(club => club.name === 'Arsenal');
  return { ...structuredClone(recorded), currentClub: club.name, currentClubCountry: club.country,
    currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
    phase: 'playing', retired: false, age: 24, position: 'ST', overall: 85, loan: null, pendingLoanOffers: null, ...extra };
}
function row(c, extra = {}) {
  return { ...c.seasons.at(-1), year: B.soccer.nextSeasonYear(c), club: c.currentClub, type: 'playing',
    apps: 30, goals: 14, assists: 8, cleanSheets: 11, rating: 7.2, injurySevere: false, ...extra };
}
function run(bundle, input, seed, action = 'advanceProSeason', argument = bundle.soccer.FALLBACK_CLUBS) {
  const prior = Math.random, rng = mulberry32(seed), draws = [];
  Math.random = () => { const value = rng(); draws.push(value); return value; };
  try { return { state: bundle.soccer[action](structuredClone(input), argument), draws }; }
  finally { Math.random = prior; }
}
const A = B.ambitions;
const c = career();
c.seasons = [row(c, { year: 2020 }), row(c, { year: 2021, apps: 1, rating: 10 }), row(c, { year: 2022, type: 'youth', goals: 100 })];
assert.deepEqual(A.ambitionOptions(c).map(option => [option.id, option.target]), [['goals', 15], ['assists', 9], ['rating', 7.3]], 'rating ambitions use the same ten-game floor as the record book');
const selected = A.pickCareerAmbition(c, 'goals'), held = selected.seasonAmbition;
const blocked = { ...selected, phase: 'newspaper' };
assert.equal(A.pickCareerAmbition(blocked, null), blocked, 'an ambition cannot be changed during the played season');
const season = row(selected, { goals: held.target });
selected.statBoostNextSeason = { passing: 2 };
A.settleCareerAmbition(selected, season);
assert.equal(selected.seasonAmbition, undefined, 'a settled ambition is consumed once');
assert.deepEqual(selected.statBoostNextSeason, { passing: 2, shooting: 1 }, 'an achieved ambition earns exactly one queued attribute point');
selected.seasonAmbition = held;
A.settleCareerAmbition(selected, season);
assert.equal(selected.statBoostNextSeason.shooting, 1, 'an existing recorded result cannot reward again');
const mismatched = { ...selected, seasonAmbition: held }, foreignYear = row(c, { year: held.year + 1 });
A.settleCareerAmbition(mismatched, foreignYear);
assert.equal(foreignYear.ambition, undefined, 'a target cannot settle against another year');
const moveStart = A.pickCareerAmbition(career(), 'goals');
const offer = { club: B.soccer.FALLBACK_CLUBS.find(club => club.name === 'Chelsea'), contractYears: 2, wage: moveStart.weeklyWage, transferFee: 0 };
assert.equal(B.soccer.acceptOffer(moveStart, offer).seasonAmbition, undefined, 'moving clubs immediately cancels the held ambition');
assert.equal(B.soccer.acceptLoan(moveStart, { ...offer, isLoan: true }).seasonAmbition, undefined, 'a loan immediately cancels the held ambition');
for (const [apps, difference, outcome] of [[1, 0, 'interrupted'], [9, 0, 'interrupted'], [10, 0, 'achieved'], [10, -0.1, 'missed']]) {
  const ratingCareer = A.pickCareerAmbition(career(), 'rating'), heldRating = ratingCareer.seasonAmbition;
  const ratingRow = row(ratingCareer, { apps, rating: heldRating.target + difference });
  const boosts = { ...ratingCareer.statBoostNextSeason };
  A.settleCareerAmbition(ratingCareer, ratingRow);
  assert.equal(ratingRow.ambition.outcome, outcome, 'rating completion needs ten actual appearances before earning a point');
  if (outcome === 'achieved') boosts.physical = (boosts.physical ?? 0) + 1;
  assert.deepEqual(ratingCareer.statBoostNextSeason, boosts);
}
console.log('ok   personal-best targets, ten-game rating eligibility, binding, consumption, transfer/loan cancellation and one earned point');

for (const [marker, extra] of [['BANNED', { matchFixBanned: 2 }], ['PRISON', { prisonSeasons: 1 }]]) {
  const start = A.pickCareerAmbition(career(extra), 'goals'), result = run(B, start, 118001).state;
  assert.equal(result.seasons.at(-1).club, marker);
  assert.equal(result.seasons.at(-1).ambition?.outcome, 'interrupted', 'the engine records interrupted ambitions on skipped years');
  assert.equal(result.seasonAmbition, undefined);
}

let noChoice = 0, opted = 0, achieved = 0, missed = 0, interrupted = 0;
for (const position of ['ST', 'CM', 'CB', 'GK']) {
  for (let seed = 0; seed < 4; seed++) {
    const start = career({ position });
    const before = JSON.stringify(start), expected = run(old, start, 118000 + seed);
    const neutral = run(B, start, 118000 + seed);
    assert.equal(JSON.stringify(neutral.state), JSON.stringify(expected.state), 'a career without a choice stays byte-identical to the old paths');
    assert.deepEqual(neutral.draws, expected.draws, 'a career without a choice retains every main random draw');
    assert.equal(JSON.stringify(start), before, 'the paired probe preserves its recorded input');
    noChoice++;
    const choice = A.pickCareerAmbition(structuredClone(start), position === 'GK' || position === 'CB' ? 'cleanSheets' : 'goals');
    const target = choice.seasonAmbition;
    const result = run(B, choice, 118000 + seed), actual = result.state.seasons.at(-1);
    assert.ok(actual.ambition, 'the actual engine records the selected season ambition');
    const outcome = actual.injurySevere || actual.apps === 0 ? 'interrupted' : actual[target.stat] >= target.target ? 'achieved' : 'missed';
    assert.deepEqual(actual.ambition, { label: target.label, target: target.target, actual: actual[target.stat], outcome,
      ...(outcome === 'achieved' ? { rewardStat: target.rewardStat } : {}) }, 'the actual saved result agrees with the chosen target and real club stats');
    const rewards = { ...neutral.state.statBoostNextSeason };
    if (outcome === 'achieved') rewards[target.rewardStat] = (rewards[target.rewardStat] ?? 0) + 1;
    assert.deepEqual(result.state.statBoostNextSeason, rewards, 'the engine queues exactly the recorded earned reward');
    assert.deepEqual(result.draws, neutral.draws, 'choosing a target adds no random draw or current-season result change');
    const cleaned = structuredClone(result.state);
    cleaned.seasons.forEach(season => { delete season.ambition; });
    if (cleaned.pendingSummary) delete cleaned.pendingSummary.ambition;
    cleaned.events = cleaned.events.filter(event => !event.startsWith('🎯 Ambition '));
    cleaned.statBoostNextSeason = neutral.state.statBoostNextSeason;
    assert.equal(JSON.stringify(cleaned), JSON.stringify(neutral.state), 'only the ambition result, event and earned future point change this season');
    assert.equal(result.state.seasonAmbition, undefined, 'the completed season cannot keep a live target');
    opted++; if (outcome === 'achieved') achieved++; else if (outcome === 'missed') missed++; else interrupted++;
  }
}
let severe = 0, ped = 0, conviction = 0;
for (let seed = 0; seed < 64 && (!severe || !ped || !conviction); seed++) {
  for (const kind of ['severe', 'ped', 'conviction']) {
    if ((kind === 'severe' && severe) || (kind === 'ped' && ped) || (kind === 'conviction' && conviction)) continue;
    const extra = kind === 'severe' ? { age: 18, startingOverall: 99 }
      : kind === 'ped' ? { pedActive: true, pedSeasonsRemaining: 2 } : { corruptionHeat: 100, dirtyMoney: 100 };
    const result = run(B, A.pickCareerAmbition(career(extra), 'goals'), 118100 + seed).state, actual = result.seasons.at(-1);
    const hit = kind === 'severe' ? actual.injurySevere : actual.club === (kind === 'ped' ? 'BANNED (PED)' : 'CONVICTED');
    if (!hit) continue;
    assert.equal(actual.ambition?.outcome, 'interrupted', 'all actual serious-injury, drug-ban and conviction paths settle interrupted');
    assert.equal(actual.ambition.rewardStat, undefined, 'an interrupted year never earns an attribute point');
    assert.equal(result.seasonAmbition, undefined);
    if (kind === 'severe') severe++; else if (kind === 'ped') ped++; else conviction++;
  }
}
assert.ok(severe && ped && conviction, 'the bounded actual engine probe must exercise all three interruption branches');
const legacy = A.pickCareerAmbition(career(), 'goals');
const trial = run(B, { ...legacy, phase: 'newspaper', pendingSummary: null, prisonSeasons: 1 }, 118020, 'dismissNewspaper').state;
assert.equal(trial.seasons.at(-1).club, 'CONVICTED');
assert.equal(trial.seasons.at(-1).ambition?.outcome, 'interrupted', 'a legacy conviction repair settles its actual missing year');
assert.equal(trial.seasonAmbition, undefined);
const rehab = run(B, { ...legacy, phase: 'rehab_choice', pendingRehab: { name: 'Test injury', weeks: 20,
  year: B.soccer.nextSeasonYear(legacy), specialistCost: null } }, 118020, 'applyRehabChoice', 2).state;
assert.equal(rehab.seasons.at(-1).injurySevere, true);
assert.equal(rehab.seasons.at(-1).ambition?.outcome, 'interrupted', 'a legacy rehab repair settles its actual missing year');
assert.equal(rehab.seasonAmbition, undefined);
assert.equal(noChoice, 16); assert.equal(opted, 16);
console.log(`ok   ${noChoice} exact old saves/RNG and ${opted} paired opt-in seasons, achieved ${achieved}, missed ${missed}, interrupted ${interrupted}`);
console.log('simSoccerCareerAmbitions: all 16 paired careers, exact target results, future rewards once and seven actual interruption paths passed');
