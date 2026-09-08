/** Round 534: real NFL battle outcomes with owner-specific queued upgrades.
 * The reference fixture changes only the selected existing card's in-game OVR.
 * It is an equivalence oracle, not a new claim about real player ratings.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, it, vi } from 'vitest';
import { NFL_TEAMS, INITIAL_TERRITORIES } from '@/data/conquestData';
import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';
import { simulateDetailedBattle, type BattleSimulation } from '@/lib/conquestBattle';

const fixture = vi.hoisted(() => {
  const faults: string[] = [];
  const deny = (name: string): never => { faults.push(name); throw new Error(name); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  return { faults, deny, cards: {} as Record<string, string> };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() { return fixture.deny('backend'); } }) }));
vi.mock('@/lib/conquestRosterNfl', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/conquestRosterNfl')>();
  return { getNflRosterPlayer: (name: string, team: string) => {
    const player = actual.getNflRosterPlayer(name, team);
    return player && fixture.cards[team] === name ? { ...player, overall: 99 } : player;
  } };
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
function run(seed: number, attacker: string, defender: string, current = rosters(), upgrades?: Record<string, string>, legacy: [string | null, string | null] = [null, null]) {
  const random = Math.random; Math.random = seeded(seed);
  try { return simulateDetailedBattle(attacker, defender, INITIAL_TERRITORIES, current, ...legacy, undefined, upgrades); }
  finally { Math.random = random; }
}
function series(attacker: string, defender: string, current = rosters(), upgrades?: Record<string, string>, legacy: [string | null, string | null] = [null, null], count = 32) {
  return Array.from({ length: count }, (_, i) => run(i + 1, attacker, defender, current, upgrades, legacy));
}
function oracle(attacker: string, defender: string, current: Record<string, string[]>, cards: Record<string, string>, count = 32) {
  fixture.cards = cards;
  try { return series(attacker, defender, current, undefined, [null, null], count); }
  finally { fixture.cards = {}; }
}
function participantCheck(results: BattleSimulation[], attacker: string, defender: string, current: Record<string, string[]>) {
  for (const result of results) for (const [team, stats] of [[attacker, result.boxScore.attStats], [defender, result.boxScore.defStats]] as const) {
    for (const key of ['passingQb', 'rushingName', 'receivingName', 'defenseName'] as const) assert.ok(current[team].includes(stats[key]), 'PARTICIPANTS: upgrades preserve current roster names');
  }
}
function targets() {
  const current = rosters();
  const qb = current.CIN.find(name => getNflRosterPlayer(name, 'CIN')!.position === 'QB')!;
  const defender = current.BUF.find(name => ['DE', 'DT', 'LB'].includes(getNflRosterPlayer(name, 'BUF')!.position))!;
  assert.ok(getNflRosterPlayer(qb, 'CIN')!.overall < 99 && getNflRosterPlayer(defender, 'BUF')!.overall < 99, 'SETUP: both chosen real cards begin below 99');
  // Keep this real defender eligible on every defensive play in the fixture.
  current.BUF = current.BUF.filter(name => name === defender || !['DE', 'DT', 'LB', 'CB', 'S'].includes(getNflRosterPlayer(name, 'BUF')!.position));
  return { current, qb, defender, upgrades: { CIN: qb, BUF: defender } };
}
function peterson() {
  const current = rosters();
  for (const team of ['MIN', 'BUF']) current[team] = [...current[team].filter(name => getNflRosterPlayer(name, team)?.position !== 'RB'), 'Adrian Peterson'];
  assert.ok(getNflRosterPlayer('Adrian Peterson', 'MIN')!.overall === 99 && getNflRosterPlayer('Adrian Peterson', 'BUF')!.overall === 80,
    'SETUP: the existing name-only legend and pool cards have distinct owner ratings');
  return current;
}

it('preserves the 32 original-roster outcomes without queued upgrades', () => {
  const current = rosters();
  const original = NFL_TEAMS.map((team, i) => run(i + 1, team.id, NFL_TEAMS[(i + 1) % 32].id, current));
  assert.ok(digest(original) === '10bb2817b31e2fb8c187724bd6aca41ea55055de9962a8fc49a0a43c00787d3c', 'ORIGINAL: all 32 recorded no-upgrade battle outputs stay unchanged');
  console.log(`Original32 digest: ${digest(original)}`);
});

it('applies both teams upgrades to real plays and box scores in either home role', () => {
  const { current, qb, defender, upgrades } = targets();
  const count = 128;
  for (const [attacker, home] of [['CIN', 'BUF'], ['BUF', 'CIN']]) {
    const upgraded = series(attacker, home, current, upgrades, [null, null], count), expected = oracle(attacker, home, current, upgrades, count);
    assert.ok(digest(upgraded.map(game => game.plays)) === digest(expected.map(game => game.plays)), 'BOTH PLAYS: both owners match their 99-card reference in visible plays');
    assert.ok(digest(upgraded) === digest(expected), 'BOTH STATS: both owners match their 99-card reference in complete battle outputs');
    const base = series(attacker, home, current, undefined, [null, null], count), onlyQb = series(attacker, home, current, { CIN: qb }, [null, null], count), onlyDefender = series(attacker, home, current, { BUF: defender }, [null, null], count);
    assert.ok(digest(upgraded) !== digest(base) && digest(upgraded) !== digest(onlyQb) && digest(upgraded) !== digest(onlyDefender), 'BOTH EFFECTS: each real owner upgrade changes the measured outputs');
    participantCheck(upgraded, attacker, home, current);
    console.log(`${attacker} vs ${home}: ${count}/${count} exact dual-owner reference matches, targets ${qb} and ${defender}`);
  }
});

it('preserves legacy single-owner calls through the optional upgrade-map fallback', () => {
  const { current, upgrades } = targets();
  for (const [team, name] of Object.entries(upgrades)) {
    const legacy = series('CIN', 'BUF', current, undefined, [team, name]);
    const queued = series('CIN', 'BUF', current, { [team]: name });
    assert.ok(digest(legacy) === digest(queued) && digest(legacy) === digest(oracle('CIN', 'BUF', current, { [team]: name })),
      'LEGACY: an omitted map retains the existing single-owner upgrade effect');
  }
});

it('treats an explicit empty map as authoritative over the legacy pair', () => {
  const { current, qb } = targets();
  assert.ok(digest(series('CIN', 'BUF', current, {}, ['CIN', qb])) === digest(series('CIN', 'BUF', current)),
    'EMPTY MAP: an explicit empty queue does not resurrect the legacy upgrade');
});

it('ignores upgrades belonging to absent teams or absent roster players', () => {
  const current = rosters(), name = current.CIN.find(player => {
    const card = getNflRosterPlayer(player, 'CIN')!;
    return card.position === 'QB' && card.overall < 99;
  })!;
  assert.ok(name, 'SETUP: the unrelated owner points at a current sub99 quarterback');
  const base = series('CIN', 'BUF', current);
  assert.ok(digest(series('CIN', 'BUF', current, { KC: name, CIN: 'Patrick Mahomes' })) === digest(base),
    'ABSENT: third-team and non-roster entries cannot change the current battle');
});

it('applies a selected receivers upgrade to its own receiving plays and stats', () => {
  const current = rosters(), name = current.CIN.find(player => {
    const card = getNflRosterPlayer(player, 'CIN')!;
    return card.position === 'WR' && card.overall < 99;
  })!;
  assert.ok(getNflRosterPlayer(name, 'CIN')!.overall < 99, 'SETUP: the selected actual receiver starts below 99');
  current.CIN = current.CIN.filter(player => player === name || !['WR', 'TE'].includes(getNflRosterPlayer(player, 'CIN')!.position));
  const upgrades = { CIN: name }, upgraded = series('CIN', 'BUF', current, upgrades, [null, null], 128);
  assert.ok(digest(upgraded) === digest(oracle('CIN', 'BUF', current, upgrades, 128)) && digest(upgraded) !== digest(series('CIN', 'BUF', current, undefined, [null, null], 128)),
    'RECEIVER: the selected owner receiver matches the 99-card reference in actual battle outputs');
});

it('does not upgrade the opposing same-name pool player through the owner legend', () => {
  const current = peterson(), base = series('MIN', 'BUF', current, undefined, [null, null], 128), upgrades = { MIN: 'Adrian Peterson' };
  const queued = series('MIN', 'BUF', current, upgrades, [null, null], 128), legacy = series('MIN', 'BUF', current, undefined, ['MIN', 'Adrian Peterson'], 128);
  console.log(`Peterson owner isolation: ${queued.filter((game, i) => digest(game) === digest(base[i])).length}/128 queued and ${legacy.filter((game, i) => digest(game) === digest(base[i])).length}/128 legacy unchanged outputs with MIN 99 and BUF 80`);
  assert.ok(digest(queued) === digest(base) && digest(legacy) === digest(base),
    'OWNER NAME: upgrading MINs existing 99 legend leaves BUFs same-name 80 card unchanged');
  participantCheck(queued, 'MIN', 'BUF', current);
});

it('upgrades the same-name pool card only when its own team selects it', () => {
  const current = peterson(), upgrades = { BUF: 'Adrian Peterson' };
  const upgraded = series('MIN', 'BUF', current, upgrades, [null, null], 128), expected = oracle('MIN', 'BUF', current, upgrades, 128);
  assert.ok(digest(upgraded) === digest(expected) && digest(upgraded) !== digest(series('MIN', 'BUF', current, undefined, [null, null], 128)),
    'POOL OWNER: BUFs selected pool card receives its own 99 effect in actual battle outputs');
  participantCheck(upgraded, 'MIN', 'BUF', current);
});
