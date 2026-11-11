import { expect, it } from 'vitest';
import { cutPlayer, rollDeadCap, type CutLedger } from '@/lib/frontOfficeCuts';
import { nbaSummerKeepingSheets } from '@/lib/gmContractsHostNba';
import { mulberry32 } from '@/lib/leagueCore';
import { initNbaLeague, NBA_ROSTER_MAX, nbaOffseason, nbaSalaryFor, nbaTipOff, type NbaGmPlayer } from '@/lib/nbaFrontOffice';

const USER = 'ATL';
const RIVAL = 'IND';

function tipOffFixture() {
  const league = initNbaLeague(mulberry32(16));
  nbaTipOff(league, mulberry32(17), USER);
  return league;
}

it('ages a contract expiry once and still ages and reprices the incumbent market', () => {
  const league = tipOffFixture();
  const club = league.teams[RIVAL];
  club.taxDue = 1;
  for (const p of club.players) Object.assign(p, { age: 27, ovr: 88, pot: 88, years: 3, out: 0 });
  const leaving = club.players[0];
  Object.assign(leaving, { age: 31, ovr: 82, pot: 82, years: 1 });
  const incumbent = league.freeAgents[0];
  Object.assign(incumbent, { age: 31, ovr: 81, pot: 81 });

  const heldLeague = structuredClone(league);
  heldLeague.teams[RIVAL].players[0].years = 2;
  nbaOffseason(heldLeague, mulberry32(18), USER);
  const held = heldLeague.teams[RIVAL].players.find(p => p.id === leaving.id)!;
  expect(held.age).toBe(32);

  nbaOffseason(league, mulberry32(18), USER);
  expect(league.teams[RIVAL].players.some(p => p.id === leaving.id)).toBe(false);
  expect(league.freeAgents.find(p => p.id === leaving.id)).toEqual({
    ...held, years: 1, salary: nbaSalaryFor(held.ovr, league.cap),
  });
  expect(league.freeAgents.find(p => p.id === incumbent.id)).toMatchObject({
    age: 32, ovr: 80, years: 1, salary: nbaSalaryFor(80, league.cap),
  });
  expect(league.season).toBe(2027);
});

function sheetFixture() {
  const league = tipOffFixture();
  const club = league.teams[RIVAL];
  const [from] = league.teams[USER].players.splice(0, 1);
  for (const p of club.players) Object.assign(p, { age: 27, ovr: 88, pot: 88, years: 3, out: 0 });
  const replacement = club.players[0];
  Object.assign(replacement, { age: 31, ovr: 82, pot: 82 });
  const draftPick = { ...club.players[1], id: 'fixture-pick', name: 'Fixture Pick', age: 22, ovr: 87, pot: 87 };
  const sheet = { ...from, age: 22, ovr: 70, pot: 70, years: 4, salary: 6.7, out: 0 };
  club.players.push(draftPick, sheet);
  expect(club.players).toHaveLength(NBA_ROSTER_MAX + 1);
  return { league, sheet, replacement };
}

it('keeps the already-aged terms when a CPU club automatically waives to 15', () => {
  const { league, sheet } = sheetFixture();
  nbaOffseason(league, mulberry32(18), USER);

  expect(league.teams[RIVAL].players).toHaveLength(NBA_ROSTER_MAX);
  expect(league.teams[RIVAL].players.some(p => p.id === sheet.id)).toBe(false);
  expect(league.freeAgents.find(p => p.id === sheet.id)).toMatchObject({
    age: 23, ovr: 70, years: 1, salary: nbaSalaryFor(70, league.cap),
  });
});

it('does not age a replacement waiver again when the GM desk honors an offer sheet', () => {
  const { league, sheet, replacement } = sheetFixture();
  const ordinary = structuredClone(league);
  let baseDraws = 0;
  let deskDraws = 0;
  const baseRng = mulberry32(18);
  const deskRng = mulberry32(18);
  nbaOffseason(ordinary, () => { baseDraws++; return baseRng(); }, USER);
  nbaSummerKeepingSheets(league, () => { deskDraws++; return deskRng(); }, USER, [{ id: sheet.id, club: RIVAL }]);

  const held = ordinary.teams[RIVAL].players.find(p => p.id === replacement.id)!;
  expect(held.age).toBe(32);
  expect(league.freeAgents.find(p => p.id === held.id)).toEqual({
    ...held, years: 1, salary: nbaSalaryFor(held.ovr, league.cap),
  });
  expect(league.teams[RIVAL].players).toHaveLength(NBA_ROSTER_MAX);
  expect(league.teams[RIVAL].players.find(p => p.id === sheet.id)).toMatchObject({
    age: 23, ovr: 70, years: 3, salary: 6.7,
  });
  expect(league.freeAgents.some(p => p.id === sheet.id)).toBe(false);
  expect(league.freeAgents.map(p => p.id)).toEqual([
    ...ordinary.freeAgents.filter(p => p.id !== sheet.id).map(p => p.id), held.id,
  ]);
  const ledger: CutLedger & { players: NbaGmPlayer[] } = { players: [{ ...held }] };
  expect(cutPlayer(ledger, [], held.id, 0)).toBe(true);
  rollDeadCap(ledger);
  expect(league.teams[RIVAL].deadCap).toEqual(ledger.deadCap);
  expect(deskDraws).toBe(baseDraws);
});
