import assert from 'node:assert/strict';
import { importBundled } from './lib/cmFixtureSources/gameBundle.mjs';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const { cm, fixtures, data, jobs, start, ledger } = await importBundled(`
  export * as cm from '@/lib/clubManager';
  export * as fixtures from '@/lib/clubManagerFixtures';
  export * as data from '@/data/j1League2026';
  export * as jobs from '@/lib/managerJobMarket';
  export * as start from '@/lib/clubManagerStart';
  export { J1_FIXTURES_2026 as ledger } from '@/data/clubManagerJ1Fixtures2026';
`);
const { id, label, clubs } = data.J1_LEAGUE_2026;
const fixtureKey = 'j1-2026-27-v1';
let seed = 16281;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
Date.now = () => Date.UTC(2026, 7, 1);

assert.equal(clubs.length, 20);
assert.deepEqual(cm.playableClubs(id).map(c => c.name).sort(), [...clubs].sort());
assert(!cm.REAL_LEAGUES.some(league => league.id === id));
assert(!jobs.allOfferClubs().some(club => club.league === label));
assert.equal(jobs.allOfferClubs(id).filter(club => club.league === label).length, 20);
assert.throws(() => cm.startCareer(clubs[0], 'era2010'), /CM_CLUB_ACCESS_HELD/);
const england = cm.startCareer('Arsenal');
if (process.env.J1_CONTROL === 'leak') {
  assert(!Object.hasOwn(england.world, id), 'the leak control needs an untouched English world');
  england.world[id] = { round: 0, table: [] };
}
assert(!cm.worldLeagueDefs(england).some(league => league.id === id), 'the English career acquired J1');
assert(!cm.clubAvailableInCareer(england, clubs[0]));
assert(!clubs.some(club => Object.hasOwn(england.clubStrengths, club)));

await fixtures.ensureRealLeagueFixtures(fixtureKey);
for (const club of clubs) {
  const career = cm.startCareer(club, 'now', undefined, undefined, undefined, null, { noWorldComps: true });
  assert.equal(career.realLeagueFixtures, fixtureKey, club);
  assert.equal(career.leagueClubs.length, 20, club);
  assert.equal(career.calendar.filter(entry => entry.type === 'league').length, 38, club);
  assert(career.squad.length >= 16 && career.squad.every(player => player.isYouth || player.generated), club);
  assert.equal(cm.careerPlace(career)?.home, 'Japan', club);
}

let career = cm.startCareer('Mito Hollyhock');
const coverage = fixtures.realLeagueFixtureCoverage(career, id, career.leagueClubs, label);
if (process.env.J1_CONTROL === 'venues') {
  assert(coverage.label.includes('designated home teams'), 'the venues control needs the verified home and away wording');
  coverage.label = coverage.label.replace('designated home teams', 'home/away venues');
}
assert.match(coverage.label, /opponent order and designated home teams\. Calendar dates, stadiums and results are simulated\./);
assert.deepEqual(coverage.sources, ledger.sources);
career.startOptions = { ...start.defaultStartOptions(), noSack: 1 };
const before = cm.nextFixture(career);
assert.equal(before.opponent, 'Kashiwa Reysol');
assert.equal(before.home, false);
const played = [];
for (let i = 0; i < 60; i++) {
  const result = cm.playNextEntry(career, { skipHalftime: true });
  career = result.state;
  if (result.kind === 'seasonOver') break;
  if (result.kind !== 'match') continue;
  assert.equal(result.report.competition, 'league');
  played.push([result.report.home, result.report.away]);
  if (played.length === 1) {
    assert.equal(cm.saveCareer(career), true);
    const restored = cm.loadCareer();
    assert.equal(restored?.realLeagueFixtures, fixtureKey);
    assert.equal(cm.nextFixture(restored).opponent, 'Gamba Osaka');
    assert.equal(cm.nextFixture(restored).home, true);
    career = restored;
  }
}
assert.equal(played.length, 38);
assert.deepEqual(played, ledger.rounds.map(round => round.find(pair => pair.includes('Mito Hollyhock'))));
assert(career.table.every(row => row.w + row.d + row.l === 38), 'every club must finish 38 matches');
const final = cm.finishSeason(career).state;
const next = cm.startNextSeason(final);
assert.equal(next.season, 2);
assert.equal(next.realLeagueFixtures, undefined);
assert.equal(cm.careerLeagueOf(next).id, id);
assert.equal(next.calendar.filter(entry => entry.type === 'league').length, 38);
const moved = cm.startNextSeason(final, 'Arsenal');
assert.equal(moved.clubName, 'Arsenal');
assert.equal(moved.world[id]?.table.length, 20);
assert.equal(cm.applyTargets(moved).filter(target => target.leagueId === id).length, 20);
assert(!cm.applyTargets(england).some(target => target.leagueId === id));

const a = { club: 'A', pts: 20, gf: 12, ga: 7 };
const b = { club: 'B', pts: 20, gf: 12, ga: 7 };
const c = { club: 'C', pts: 20, gf: 12, ga: 8 };
const rule = cm.leagueTiebreak(id);
assert.deepEqual(cm.sortedTable([a, b, c], { rule, pairs: { 'A|B': [0, 1], 'B|A': [1, 0] } }).map(row => row.club), ['B', 'A', 'C']);
console.log('Opening squads: 20 selectable clubs with generated squads and a 38-game calendar each.');
console.log('World and jobs: J1 opens in Japan and follows the manager to a new club. The English control keeps its own world.');
console.log('Fixture replay: Mito opened at Kashiwa and resumed at home against Gamba. All 38 played pairings match the ledger.');
console.log('simClubManagerJ1: the second season generated 38 fixtures and the tied-club mini-table sorted correctly.');
