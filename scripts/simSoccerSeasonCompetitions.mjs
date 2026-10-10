/** Saved competition outcomes, plus source controls that must fail when run.
 * SIM_SEASON_COMPETITION_CONTROL=anchor|score|name|finallegs|neutralfinal removes a binding guard,
 * changes a recorded score, hides a cup name or changes final labels. The shared bundle
 * refuses a control if its exact needle is missing or never loaded.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_SEASON_COMPETITION_CONTROL || '';
const file = 'src/lib/soccerSeasonCompetitions.ts';
const controls = {
  anchor: { file, from: 'run.seasonYear !== row.year || run.club !== row.club || ', to: '' },
  score: { file, from: 'goalsFor: match.goalsFor, goalsAgainst: match.goalsAgainst', to: 'goalsFor: match.goalsFor + 1, goalsAgainst: match.goalsAgainst' },
  name: { file, from: "name: cup.cup ?? 'Domestic cup'", to: "name: 'Domestic cup'" },
  finallegs: { file, from: "const showLeg = match.round !== 'Final' || twoLegFinal;", to: "const showLeg = match.round !== 'Final';" },
  neutralfinal: { file, from: "const showLeg = match.round !== 'Final' || twoLegFinal;", to: 'const showLeg = true;' },
};
if (CONTROL && !controls[CONTROL]) throw new Error(`unknown SIM_SEASON_COMPETITION_CONTROL ${CONTROL}`);
const B = await bundleAwardsNight(ROOT, { patches: CONTROL ? [controls[CONTROL]] : [], extra: {
  competitions: file, fixtures: 'src/test/fixtures/soccerSeasonCompetitions1173.ts',
} });
const { cupSeason: row, competitionCareer: career, clubCampaign, firstStageCampaign, neutralFinalCampaign, twoLegFinalCampaign, twoLegFinalSeason } = B.fixtures;
const before = JSON.stringify({ row, career });
const competitions = B.competitions.savedSeasonCompetitions(career, row);
assert.equal(competitions[0].name, 'FA Cup', 'the named domestic cup stays named');
assert.deepEqual(competitions[0].matches.map(m => [m.opponent, m.goalsFor, m.goalsAgainst]), [
  [null, null, null], ['Chelsea', 2, 1], ['Liverpool', 1, 0], ['Newcastle', 1, 1],
], 'the saved cup opponents and scores are exact, and the unknown early rounds stay unknown');
assert.equal(competitions[0].matches[3].note, '5-4 on penalties');
assert.deepEqual(competitions[1].matches.map(m => [m.opponent, m.goalsFor, m.goalsAgainst]), [
  ['Barcelona', 2, 1], ['Barcelona', 0, 2],
], 'each European leg keeps its recorded score');
assert.equal(competitions[1].matches[1].note, '2-3 on aggregate');
console.log('ok   saved domestic and club cup names, opponents, leg scores and decisions');
assert.equal(B.competitions.savedClubCampaign(career, { ...row, year: 2026 }), null, 'a current campaign cannot leak into a historical season');
assert.equal(B.competitions.savedClubCampaign(career, { ...row, club: 'Chelsea' }), null, 'a different club cannot inherit this campaign');
assert.equal(B.competitions.savedClubCampaign({ lastUCLResult: { ...clubCampaign, seasonYear: undefined, club: undefined } }, row), null, 'an old unanchored campaign is not guessed');
assert.deepEqual(B.competitions.savedSeasonCompetitions({ lastUCLResult: firstStageCampaign }, row)[1].matches.map(m => [m.opponent, m.goalsFor, m.goalsAgainst]), [
  ['Juventus', 0, 1], ['Dortmund', 1, 1],
], 'a first-stage exit still shows its recorded games');
assert.equal(JSON.stringify({ row, career }), before, 'reading cup games must not write the save');
console.log('ok   historical bindings, unknown old campaigns, first-stage exits and read-only saves');

const finalsBefore = JSON.stringify({ twoLegFinalSeason, twoLegFinalCampaign, neutralFinalCampaign });
const finalRow = { ...twoLegFinalSeason, clubCupRun: twoLegFinalCampaign };
const twoLeg = B.competitions.savedSeasonCompetitions(career, finalRow)[0];
assert.deepEqual(twoLeg.matches.map(m => [m.round, m.opponent, m.goalsFor, m.goalsAgainst, m.home, m.playerGoals, m.note]), [
  ['Final, leg 1', 'Wydad', 2, 1, true, 1, undefined], ['Final, leg 2', 'Wydad', 1, 1, false, 0, '3-2 on aggregate'],
], 'a saved two-leg final keeps both leg numbers and grounds');
assert.equal(twoLeg.name, 'CAF Champions League');
assert.equal(twoLeg.result, 'Winners');
assert.deepEqual(B.competitions.savedSeasonCompetitions({ lastUCLResult: twoLegFinalCampaign }, twoLegFinalSeason)[0], twoLeg,
  'an anchored legacy final keeps the same saved leg detail as a season snapshot');
const neutralRow = { ...row, domesticCup: false, cupRun: undefined, clubCupRun: neutralFinalCampaign };
const neutral = B.competitions.savedSeasonCompetitions({ lastUCLResult: null }, neutralRow)[0];
assert.deepEqual(neutral.matches.map(m => [m.round, m.opponent, m.goalsFor, m.goalsAgainst, m.home, m.playerGoals]), [
  ['Final', 'Barcelona', 2, 0, undefined, 1],
], 'a neutral one-match final stays Final without a home or away label');
assert.equal(JSON.stringify({ twoLegFinalSeason, twoLegFinalCampaign, neutralFinalCampaign }), finalsBefore, 'reading saved final legs must not write the fixtures');
console.log('ok   saved two-leg final labels, grounds and aggregate, neutral one-match final and unchanged records');

const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere').state;
const club = B.soccer.FALLBACK_CLUBS.find(c => c.name === 'Arsenal');
assert.ok(club, 'the existing club pool supplies the engine fixture');
let snapshot = null;
const random = Math.random;
try {
  for (let seed = 0; seed < 32 && !snapshot; seed += 1) {
    Math.random = mulberry32(1173 + seed);
    const state = structuredClone(captured);
    Object.assign(state, { currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
      currentClubColor: club.color, currentLeague: club.league, overall: 85, phase: 'playing' });
    const played = B.soccer.advanceProSeason(state, B.soccer.FALLBACK_CLUBS);
    const season = played.seasons.at(-1);
    if (!season?.clubCupRun) continue;
    assert.equal(season.clubCupRun.seasonYear, season.year, 'the engine records the campaign year');
    assert.equal(season.clubCupRun.club, season.club, 'the engine records the campaign club');
    assert.deepEqual(season.clubCupRun, played.lastUCLResult, 'the season keeps the campaign as it was generated');
    assert.notEqual(season.clubCupRun, played.lastUCLResult, 'the season snapshot is an independent object');
    const bytes = JSON.stringify(season.clubCupRun);
    played.lastUCLResult.matches.push({ ...clubCampaign.matches[0], opponent: 'Changed test opponent' });
    assert.equal(JSON.stringify(season.clubCupRun), bytes, 'later changes to the current campaign cannot alter the saved season');
    console.log('ok   actual engine campaign binds its club and year, clones the saved matches and preserves them after later changes');
    snapshot = season;
  }
} finally { Math.random = random; }
assert.ok(snapshot, 'the engine probe must exercise actual campaign persistence');
console.log('simSoccerSeasonCompetitions: saved names, exact outcomes, no historical leakage and independent engine snapshots passed');
