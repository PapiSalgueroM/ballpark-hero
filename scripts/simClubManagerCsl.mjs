import assert from 'node:assert/strict';
import { importBundled } from './lib/cmFixtureSources/gameBundle.mjs';

const { cm, calendar, start, jobs } = await importBundled(`
  export * as cm from '@/lib/clubManager';
  export * as calendar from '@/lib/clubManagerCalendar';
  export * as start from '@/lib/clubManagerStart';
  export * as jobs from '@/lib/managerJobMarket';
`);

const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key),
};
let seed = 16282;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
Date.now = () => Date.UTC(2026, 7, 1);

const control = process.env.CSL_CONTROL;
const id = 'csl';
const league = 'Chinese Super League';
const clubs = [
  'Shanghai Port', 'Shanghai Shenhua', 'Chengdu Rongcheng', 'Beijing Guoan',
  'Shandong Taishan', 'Tianjin Jinmen Tiger', 'Zhejiang FC', 'Yunnan Yukun',
  'Qingdao West Coast', 'Henan FC', 'Dalian Yingbo', 'Shenzhen Peng City',
  'Wuhan Three Towns', 'Qingdao Hainiu', 'Liaoning Tieren', 'Chongqing Tonglianglong',
];
const deductions = new Map([
  ['Shanghai Shenhua', 10], ['Tianjin Jinmen Tiger', 10], ['Qingdao Hainiu', 7],
  ['Shandong Taishan', 6], ['Henan FC', 6], ['Beijing Guoan', 5],
  ['Shanghai Port', 5], ['Zhejiang FC', 5], ['Wuhan Three Towns', 5],
]);

function checkPoints(table, openingSeason) {
  assert(table, 'expected a CSL table');
  assert.deepEqual(table.map(row => row.club).sort(), [...clubs].sort());
  for (const row of table) {
    const deduction = openingSeason ? deductions.get(row.club) ?? 0 : 0;
    assert.equal(row.pts, 3 * row.w + row.d - deduction, row.club);
  }
}

function acceptJob(career, club) {
  const open = {
    club, league: '', tier: 4, season: career.season, week: career.week,
    matchesLeft: 0, roll: 0, status: 'accepted', decidedWeek: career.week,
  };
  const joined = calendar.joinClubNow({
    ...career,
    jobHunt: { open, cooldowns: [], sentSeason: career.season, sent: 1, summerMove: null },
  });
  assert.equal(joined?.clubName, club, 'midseason appointment');
  return joined;
}

assert.deepEqual(cm.playableClubs(id).map(club => club.name).sort(), [...clubs].sort());
assert(!cm.REAL_LEAGUES.some(entry => entry.id === id));
assert(!jobs.allOfferClubs().some(club => club.league === league));
assert.equal(jobs.allOfferClubs(id).filter(club => club.league === league).length, clubs.length);
for (const club of ['Arsenal', 'Kashima Antlers', 'Jeonbuk Hyundai Motors']) {
  const career = cm.startCareer(club);
  if (control === 'leak' && club === 'Arsenal') {
    assert(!Object.hasOwn(career.world, id), 'leak control needs the original English world');
    career.world[id] = { round: 0, table: [] };
  }
  assert(!cm.worldLeagueDefs(career).some(entry => entry.id === id), club);
  assert(!cm.applyTargets(career).some(entry => entry.leagueId === id), club);
  assert(!clubs.some(club => Object.hasOwn(career.clubStrengths, club)), club);
}
assert.throws(() => cm.startCareer(clubs[0], 'era2010'), /CM_CLUB_ACCESS_HELD/);
for (const club of clubs) {
  const career = cm.startCareer(club);
  assert.equal(cm.careerLeagueOf(career).id, id);
  assert.equal(cm.careerPlace(career)?.home, 'China');
  assert(!cm.worldLeagueDefs(career).some(entry => entry.id === 'j1'));
  assert(career.squad.length >= 16 && career.squad.every(player => player.generated || player.isYouth));
  assert.equal(career.calendar.filter(entry => entry.type === 'league').length, 30);
  assert.equal(career.realLeagueFixtures, undefined);
  const demand = career.boardObjectives.find(objective => objective.id === 'league');
  assert.equal(demand?.target, 8, club + ' opens with a top-half board target');
  assert.equal(cm.boardWantLabel(club), demand.label, 'picker and live board show the same demand');
  checkPoints(career.table, true);
}
console.log('Opening careers: 16 generated squads, published 2026 deductions and a top-half board target. English, Japan and Korea career worlds omit China.');

let career = cm.startCareer('Shanghai Shenhua');
career.startOptions = { ...start.defaultStartOptions(), noSack: 1 };
const fixtureIds = new Set();
for (let round = 0; round < 30; round++) {
  const pairs = cm.careerRoundPairs(career, round);
  if (control === 'fixture' && round === 0) {
    assert.equal(new Set(pairs.flat()).size, 16, 'fixture control needs a complete matchday');
    pairs[0] = pairs[1];
  }
  assert.equal(pairs.length, 8);
  assert.deepEqual(pairs.flat().sort(), [...clubs].sort());
  for (const [home, away] of pairs) fixtureIds.add(`${home}|${away}`);
}
assert.equal(fixtureIds.size, 240);

if (control === 'deduction') {
  const row = career.table.find(row => row.club === 'Shanghai Shenhua');
  assert.equal(row.pts, -10, 'deduction control needs the true starting points');
  row.pts = 0;
}
checkPoints(career.table, true);
assert.deepEqual(cm.sortedLeagueTable(career).map(row => row.pts), [0, 0, 0, 0, 0, 0, 0, -5, -5, -5, -5, -6, -6, -7, -10, -10]);
assert.equal(cm.seasonLedgerInputOf(career).leaguePts, 0, 'opening deductions are not points earned while managing');
const played = [];
let midseason;
for (let tick = 0; tick < 60; tick++) {
  const result = cm.playNextEntry(career, { skipHalftime: true });
  career = result.state;
  if (result.kind === 'seasonOver') break;
  if (result.kind !== 'match') continue;
  assert.equal(result.report.competition, 'league');
  played.push([result.report.home, result.report.away]);
  checkPoints(career.table, true);
  if (played.length === 1) {
    const next = cm.nextFixture(career);
    assert.equal(cm.saveCareer(career), true);
    career = cm.loadCareer();
    assert.deepEqual(cm.nextFixture(career), next);
    checkPoints(career.table, true);
  }
  if (played.length === 4) midseason = structuredClone(career);
}
assert.equal(played.length, 30);
assert.deepEqual(played, Array.from({ length: 30 }, (_, round) =>
  cm.careerRoundPairs(career, round).find(pair => pair.includes(career.clubName))));
assert(career.table.every(row => row.w + row.d + row.l === 30));
console.log('Fixture replay: 240 unique home and away pairings, 30 played fixtures, exact saved fixture and point accounting.');

const outside = acceptJob(midseason, 'Arsenal');
if (control === 'handover') {
  const row = outside.world[id]?.table.find(row => row.club === 'Shanghai Shenhua');
  assert.equal(row?.pts, 3 * row.w + row.d - 10, 'handover control needs the original world deduction');
  row.pts += 10;
}
checkPoints(outside.world[id]?.table, true);
assert(outside.world[id].round > 0);
assert.equal(cm.applyTargets(outside).filter(entry => entry.leagueId === id).length, 16);
assert.equal(cm.saveCareer(outside), true);
const resumed = cm.loadCareer();
checkPoints(resumed.world[id]?.table, true);
const back = acceptJob(resumed, 'Shanghai Port');
checkPoints(back.table, true);
assert(back.table.every(row => row.w + row.d + row.l > 0));
const backRow = back.table.find(row => row.club === back.clubName);
assert.equal(back.handover?.pts, 3 * backRow.w + backRow.d, 'handover credits only points earned in games');
console.log('Job continuity: China deductions apply once in own and world tables through a midseason move out, save/resume and move back.');

const final = cm.finishSeason(career).state;
const next = cm.startNextSeason(final);
assert.equal(next.season, 2);
if (control === 'rollover') {
  const row = next.table.find(row => row.club === 'Shanghai Shenhua');
  assert.equal(row.pts, 0, 'rollover control needs the original zero opening points');
  row.pts = -10;
}
checkPoints(next.table, false);
assert.equal(next.realLeagueFixtures, undefined);
assert.equal(next.calendar.filter(entry => entry.type === 'league').length, 30);
const moved = cm.startNextSeason(final, 'Arsenal');
assert.equal(moved.clubName, 'Arsenal');
checkPoints(moved.world[id]?.table, false);
checkPoints(acceptJob(moved, 'Shanghai Port').table, false);
const a = { club: 'A', pts: 20, gf: 12, ga: 7 };
const b = { club: 'B', pts: 20, gf: 11, ga: 7 };
assert.deepEqual(cm.sortedTable([a, b], {
  rule: cm.leagueTiebreak(id), pairs: { 'A|B': [0, 1], 'B|A': [1, 0] },
}).map(row => row.club), ['B', 'A']);
console.log('Rollover: all opening points reset, including on job changes. A tied league is decided head to head first.');
