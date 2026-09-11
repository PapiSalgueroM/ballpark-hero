/** Round 535: earned legend identity against existing card metadata.
 * Declared current rosters make the acquired real running back the sole RB.
 * Reference arms use the existing pool or legend card, with no data edits.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, it, vi } from 'vitest';
import { NFL_TEAMS, INITIAL_TERRITORIES, type ConquestPlayer } from '@/data/conquestData';
import { FREE_AGENTS, TEAM_LEGENDS } from '@/data/conquestPowerups';
import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';
import { simulateDetailedBattle, type BattleSimulation } from '@/lib/conquestBattle';

const fixture = vi.hoisted(() => {
  const faults: string[] = [];
  const deny = (name: string): never => { faults.push(name); throw new Error(name); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  return { faults, deny, cards: {} as Record<string, ConquestPlayer[]> };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() { return fixture.deny('backend'); } }) }));
vi.mock('@/lib/conquestRosterNfl', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/conquestRosterNfl')>();
  return { getNflRosterPlayer: (name: string, team: string, legends?: ReadonlySet<string>) =>
    fixture.cards[team]?.find(card => card.name === name) || actual.getNflRosterPlayer(name, team, legends) };
});
beforeEach(() => { fixture.cards = {}; });
afterEach(() => { assert.ok(fixture.faults.length === 0, 'BOUNDARY: no transport storage or backend access'); });
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rosters = () => Object.fromEntries(NFL_TEAMS.map(team => [team.id, team.players!.map(player => player.name)]));
function seeded(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function run(seed: number, attacker: string, defender: string, current = rosters(), legends?: ReadonlySet<string>, upgrades?: Record<string, string>) {
  const random = Math.random; Math.random = seeded(seed);
  try { return simulateDetailedBattle(attacker, defender, INITIAL_TERRITORIES, current, null, null, undefined, upgrades, legends); }
  finally { Math.random = random; }
}
function series(attacker: string, defender: string, current: Record<string, string[]>, legends?: ReadonlySet<string>, upgrades?: Record<string, string>) {
  return Array.from({ length: 128 }, (_, i) => run(i + 1, attacker, defender, current, legends, upgrades));
}
function oracle(attacker: string, defender: string, current: Record<string, string[]>, cards: Record<string, ConquestPlayer[]>) {
  fixture.cards = cards;
  try { return series(attacker, defender, current); } finally { fixture.cards = {}; }
}
function card(name: string, activated: boolean): ConquestPlayer {
  const player = activated ? Object.values(TEAM_LEGENDS).find(p => p.name === name)! : FREE_AGENTS.find(p => p.name === name)!;
  return { ...player, keyStat: activated ? 'Legend' : '' };
}
function acquired(name: string, team: string) {
  const current = rosters();
  current[team] = [...current[team].filter(player => getNflRosterPlayer(player, team)?.position !== 'RB'), name];
  return current;
}
function participants(results: BattleSimulation[], attacker: string, defender: string, current: Record<string, string[]>) {
  for (const result of results) for (const [team, stats] of [[attacker, result.boxScore.attStats], [defender, result.boxScore.defStats]] as const) {
    for (const key of ['passingQb', 'rushingName', 'receivingName', 'defenseName'] as const) assert.ok(current[team].includes(stats[key]), 'PARTICIPANTS: every actual box-score player belongs to the current roster');
  }
}

it('preserves all 32 original-roster outcomes with omitted or explicit identity', () => {
  const names = Object.values(TEAM_LEGENDS).map(player => player.name);
  assert.equal(new Set(names).size, names.length, 'SETUP: franchise legends have unique names');
  assert.equal(NFL_TEAMS.flatMap(team => team.players || []).filter(player => names.includes(player.name)).length, 0, 'SETUP: no legend name is initially active');
  const original = NFL_TEAMS.map((team, i) => run(i + 1, team.id, NFL_TEAMS[(i + 1) % 32].id));
  const explicit = NFL_TEAMS.map((team, i) => run(i + 1, team.id, NFL_TEAMS[(i + 1) % 32].id, rosters(), new Set()));
  assert.ok(digest(original) === '10bb2817b31e2fb8c187724bd6aca41ea55055de9962a8fc49a0a43c00787d3c', 'ORIGINAL: all 32 recorded no-legend battle outcomes remain unchanged');
  assert.ok(digest(explicit) === digest(original), 'EXPLICIT ORIGINAL: the new empty identity input preserves all original-roster outcomes');
  console.log(`Original32: ${digest(original)}, explicit empty set matches 32/32`);
});

it('preserves the legacy recipient and remaining-legend lookup contract', () => {
  for (const [name, team] of [['Adrian Peterson', 'MIN'], ['Marshawn Lynch', 'SEA']]) {
    assert.ok(JSON.stringify(getNflRosterPlayer(name, team)) === JSON.stringify(card(name, true)), 'LEGACY OWN: omitted identity retains franchise legend priority');
    assert.ok(JSON.stringify(getNflRosterPlayer(name, 'BUF')) === JSON.stringify(card(name, false)), 'LEGACY POOL: omitted identity retains other-recipient pool priority');
  }
  assert.ok(getNflRosterPlayer('Cam Newton', 'BUF')?.keyStat === 'Legend', 'LEGACY REMAINING: omitted identity retains other known legends');
});

it('keeps ordinary pool cards ordinary and unearned legends unresolved', () => {
  for (const [name, team] of [['Adrian Peterson', 'MIN'], ['Marshawn Lynch', 'SEA']]) {
    assert.ok(JSON.stringify(getNflRosterPlayer(name, team, new Set())) === JSON.stringify(card(name, false)), 'ORDINARY CARD: an unearned own-franchise pool card keeps its existing pool metadata');
  }
  assert.ok(getNflRosterPlayer('Cam Newton', 'BUF', new Set()) === undefined, 'UNEARNED CARD: an explicit empty identity does not infer a remaining legend');
});

it('recognizes activated known legends at every owner without promoting other names', () => {
  for (const [name, team] of [['Adrian Peterson', 'MIN'], ['Marshawn Lynch', 'SEA']]) for (const owner of [team, 'BUF']) {
    assert.ok(JSON.stringify(getNflRosterPlayer(name, owner, new Set([name]))) === JSON.stringify(card(name, true)), 'ACTIVATED CARD: the earned legend retains complete 99 metadata at every owner');
  }
  const name = 'Joe Burrow';
  assert.ok(JSON.stringify(getNflRosterPlayer(name, 'CIN', new Set([name]))) === JSON.stringify(getNflRosterPlayer(name, 'CIN')), 'KNOWN ONLY: an ordinary player marker cannot invent a legend card');
  assert.ok(getNflRosterPlayer('Unknown Fixture Player', 'BUF', new Set(['Unknown Fixture Player'])) === undefined, 'UNKNOWN: an unknown marker cannot invent a card');
});

for (const [name, team] of [['Adrian Peterson', 'MIN'], ['Marshawn Lynch', 'SEA']]) {
  it(`uses the ordinary ${name} pool card in its own franchises actual battles`, () => {
    const current = acquired(name, team), actual = series(team, 'BUF', current, new Set());
    const expected = oracle(team, 'BUF', current, { [team]: [card(name, false)] });
    const legacy = series(team, 'BUF', current);
    assert.ok(digest(actual.map(result => result.plays)) === digest(expected.map(result => result.plays)), 'POOL PLAYS: all 128 real previews match the ordinary existing pool card');
    assert.ok(digest(actual) === digest(expected), 'POOL OUTPUTS: all 128 complete battles match the ordinary existing pool card');
    assert.ok(digest(actual) !== digest(legacy) && digest(actual.map(result => result.plays)) !== digest(legacy.map(result => result.plays)), 'POOL EFFECT: the former automatic legend changes actual plays and battle outputs');
    participants(actual, team, 'BUF', current);
    assert.ok(actual.every(result => result.boxScore.attStats.rushingName === name), 'POOL ROLE: the actual acquired player fills all 128 rushing roles');
    console.log(`${name} ordinary ${team}: 128/128 reference matches, seed1 rushing ${actual[0].boxScore.attStats.rushingYds} versus legacy ${legacy[0].boxScore.attStats.rushingYds}`);
  });
}

for (const [name, donor] of [['Adrian Peterson', 'MIN'], ['Marshawn Lynch', 'SEA']]) {
  it(`keeps transferred ${name} at 99 in both real battle roles`, () => {
    const current = acquired(name, 'BUF');
    for (const [attacker, defender] of [['BUF', donor], [donor, 'BUF']]) {
      const actual = series(attacker, defender, current, new Set([name]));
      const expected = oracle(attacker, defender, current, { BUF: [card(name, true)] });
      const ordinary = series(attacker, defender, current, new Set());
      assert.ok(digest(actual.map(result => result.plays)) === digest(expected.map(result => result.plays)), 'TRANSFER PLAYS: each real preview retains the acquired legend card at either battle side');
      assert.ok(digest(actual) === digest(expected), 'TRANSFER OUTPUTS: each complete battle retains the acquired legend card at either battle side');
      assert.ok(digest(actual) !== digest(ordinary) && digest(actual.map(result => result.plays)) !== digest(ordinary.map(result => result.plays)), 'TRANSFER EFFECT: activation changes real plays and box scores after acquisition');
      participants(actual, attacker, defender, current);
      const side = attacker === 'BUF' ? 'attStats' : 'defStats';
      assert.ok(actual.every(result => result.boxScore[side].rushingName === name), 'TRANSFER ROLE: the acquired legend fills all 128 owner rushing roles');
      console.log(`${name} on BUF in ${attacker}/${defender}: 128/128 legend reference matches`);
    }
  });
}

it('combines earned legend identity with an independent queued player upgrade', () => {
  const name = 'Adrian Peterson', current = acquired(name, 'CIN');
  const qb = getNflRosterPlayer(current.CIN.find(player => getNflRosterPlayer(player, 'CIN')?.position === 'QB')!, 'CIN')!;
  assert.ok(qb.overall < 99, 'SETUP: the existing owner quarterback starts below 99');
  const actual = series('CIN', 'MIN', current, new Set([name]), { CIN: qb.name });
  const expected = oracle('CIN', 'MIN', current, { CIN: [card(name, true), { ...qb, overall: 99 }] });
  assert.ok(digest(actual) === digest(expected), 'COMBINED: the actual battle applies both the permanent legend and its separate queued player upgrade');
  assert.ok(digest(actual) !== digest(series('CIN', 'MIN', current, new Set([name]))), 'COMBINED EFFECT: the separate queued upgrade still changes actual battle outcomes');
});
